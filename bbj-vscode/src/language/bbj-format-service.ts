/**
 * Turns a format request for an open BBj document into minimal line edits through bbj-ls's
 * `formatProgram`. The service owns the formatter settings, never throws, and never asks bbj-ls to
 * denumber a program: formatting only formats.
 *
 * The request always carries the live buffer text, so nothing is read from disk. The document
 * version and text are captured before the call and the open buffer is looked at again afterwards:
 * an answer computed for an older version is dropped, never applied.
 */

import type { CancellationToken, Range, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import type {
    FormatProgramParams, FormatSettingValue, ProgramFailureKind, ProgramOutcome, FormatProgramResult, ProgramSettingProblem
} from './java-interop-program-types.js';
import type { JavaInteropService } from './java-interop.js';
import { minimalLineEdit, rangeFormatEdits } from './bbj-format-edit.js';
import { FormatterSettingsHolder } from './bbj-format-settings.js';
import type { OpenFormatterSettingsParams } from './format-settings-notification.js';
import {
    notifyOpenFormatterSettings, showFormatterDocument, showFormatterWarning, showFormatterWarningWithAction
} from './bbj-notifications.js';
import { logger } from './logger.js';
import { TOKENIZED_BBJ_MAGIC_TEXT } from '../tokenized-bbj.js';

/** A buffer starting with this text is a tokenized program, not source; bbj-ls cannot format it. */
export const TOKENIZED_PROGRAM_PREFIX = TOKENIZED_BBJ_MAGIC_TEXT;

/** The text shown once per connection when the connected BBjServices has no formatter. */
export const FORMAT_REQUIRES_BBJ_26_03_MESSAGE =
    'BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it.';

/** Shown when a format ran past its deadline. */
export const FORMAT_TIMEOUT_MESSAGE = 'BBj formatting timed out. The file was not changed; try again.';

/** Shown when the file is over the formatter's size limit. */
export const FORMAT_TOO_LARGE_MESSAGE = 'This file is too large for BBj formatting. The file was not changed.';

/** Shown when the program is protected. */
export const FORMAT_PROTECTED_MESSAGE = 'This BBj program is protected and cannot be formatted.';

/** Shown when the formatter engine failed or answered with something unusable. */
export const FORMAT_ENGINE_FAILED_MESSAGE =
    'The BBj formatter could not process this file. The file was not changed. See the BBj output for details.';

/** Shown when the formatting service reports itself unavailable. */
export const FORMAT_SERVICE_UNAVAILABLE_MESSAGE =
    'The BBj formatting service is not available right now. The file was not changed; try again later.';

/** The settings namespace the user sets formatter keys under. */
const FORMATTER_KEY_PREFIX = 'bbj.formatter.';

/** How many problems an invalid-settings warning lists before it counts the rest. */
export const MAX_LISTED_SETTING_PROBLEMS = 5;

/** The button on the invalid-settings warning. */
export const OPEN_SETTINGS_ACTION = 'Open Settings';

/** The button on the mixed-numbering warning when the line is known. */
export const GO_TO_LINE_ACTION = 'Go to Line';

/**
 * The warning for rejected formatter settings: each problem as `bbj.formatter.<key>: <message>`,
 * with the key spelled the way the user set it. At most {@link MAX_LISTED_SETTING_PROBLEMS} are
 * listed; the rest are counted. Built from the problems list only, and capped by count, never by
 * cutting a string.
 */
export function invalidSettingsMessage(problems: readonly ProgramSettingProblem[], userKeyFor: (setting: string) => string): string {
    if (problems.length === 0) {
        return 'Invalid BBj formatter settings. The file was not changed.';
    }
    const parts = problems.slice(0, MAX_LISTED_SETTING_PROBLEMS)
        .map(problem => `${FORMATTER_KEY_PREFIX}${userKeyFor(problem.setting)}: ${problem.message}`);
    const unlisted = problems.length - parts.length;
    if (unlisted > 0) {
        parts.push(`and ${unlisted} more`);
    }
    return `Invalid BBj formatter settings: ${parts.join('; ')}. The file was not changed.`;
}

/** The warning for a file that mixes numbered and unnumbered lines; names the line when it is known. */
export function mixedNumberingMessage(line: number | undefined): string {
    return line === undefined
        ? 'Mixed line numbering in this file. The file was not changed.'
        : `Mixed line numbering at line ${line}. The file was not changed.`;
}

/** How many distinct notices the service remembers; the oldest is forgotten first. */
export const FORMAT_NOTICE_LEDGER_LIMIT = 256;

/**
 * Where the service sends what the user should see. Every method is fire and forget: a format
 * response never waits for one of them, and the default implementation never lets a failure escape.
 */
export interface FormatMessenger {
    /** Shows a plain Warning. */
    warn(text: string): void;
    /** Shows a Warning with one action; `onAction` runs only if the user picks it, possibly much later. */
    warnWithAction(text: string, actionTitle: string, onAction: () => void): void;
    /** Asks the client to show `uri` with the cursor on the zero-based `line`. */
    showDocument(uri: string, line: number): void;
    /** Asks the client to open its formatter settings. */
    openFormatterSettings(params: OpenFormatterSettingsParams): void;
}

/** The messenger the server uses: the connection-free senders of the notifications module. */
const DEFAULT_MESSENGER: FormatMessenger = {
    warn: showFormatterWarning,
    warnWithAction(text, actionTitle, onAction) {
        void showFormatterWarningWithAction(text, actionTitle).then(picked => {
            if (picked === actionTitle) {
                try {
                    onAction();
                } catch {
                    // The action of a late click must never surface as an unhandled rejection.
                }
            }
        });
    },
    showDocument: showFormatterDocument,
    openFormatterSettings: notifyOpenFormatterSettings
};

/** One format request: the open buffer as it was when the request arrived, plus a way to look again. */
export interface BBjFormatRequest {
    /** The open buffer at request time. */
    readonly document: TextDocument;
    /** The selection to format; absent for a whole-document format. */
    readonly range?: Range;
    /** The live open buffer for the same uri, read after the call; `undefined` once it is closed. */
    current(): TextDocument | undefined;
}

/**
 * The slice of the services this service reads. Kept structural so `bbj-module.ts` can construct it
 * without a circular import of the full services type.
 */
export interface BBjFormatServiceContext {
    java: {
        JavaInteropService: JavaInteropService;
    };
    /** Read only when an offer is shown, never in the constructor: the two services must not depend on each other's creation order. */
    compiler?: {
        BBjDenumService?: DenumOffer;
    };
}

/**
 * Where a file with line numbers goes after a format request found it: the user is offered to
 * denumber it. The format request never waits for it and never runs it.
 */
export interface DenumOffer {
    /** Shows the offer for the document `request` names; fire and forget. */
    offer(request: { readonly uri: string; current(): TextDocument | undefined }, scope: 'document' | 'selection'): void;
}

export class BBjFormatService {

    private readonly javaInterop: JavaInteropService;
    private readonly context: BBjFormatServiceContext;
    private readonly settings = new FormatterSettingsHolder();
    private messenger: FormatMessenger = DEFAULT_MESSENGER;
    /** `${kind}|${scope}` of every notice shown, oldest first, bounded by {@link FORMAT_NOTICE_LEDGER_LIMIT}. */
    private readonly shownNotices = new Set<string>();

    constructor(services: BBjFormatServiceContext) {
        this.context = services;
        this.javaInterop = services.java.JavaInteropService;
    }

    /**
     * Takes the raw `bbj.formatter` value from the client. Only the revision is logged, never the
     * values.
     */
    public setSettings(raw: unknown): void {
        const before = this.settings.revision;
        this.settings.set(raw);
        if (this.settings.revision !== before) {
            logger.debug(`Formatter settings changed (revision ${this.settings.revision})`);
        }
    }

    /** Replaces where user messages go; the default sends them through the language client. */
    public setMessenger(messenger: FormatMessenger): void {
        this.messenger = messenger;
    }

    /** The 15 normalized settings every request carries. */
    public settingsSnapshot(): Record<string, FormatSettingValue> {
        return this.settings.snapshot();
    }

    /** Moves whenever the effective settings change. */
    public get settingsRevision(): number {
        return this.settings.revision;
    }

    /**
     * Formats the request's document and returns the edits to apply, which is `[]` for every case
     * where the buffer must stay as it is. Never rejects.
     */
    public async format(request: BBjFormatRequest, token: CancellationToken): Promise<TextEdit[]> {
        try {
            const version = request.document.version;
            const sent = request.document.getText();
            if (sent.startsWith(TOKENIZED_PROGRAM_PREFIX)) {
                logger.debug('Format skipped: the buffer is a tokenized program');
                return [];
            }
            const params = this.paramsFor(request, version, sent);

            const outcome = await this.javaInterop.formatProgram(params, token);

            if (token.isCancellationRequested) {
                logger.debug('Format request was cancelled by the client');
                return [];
            }
            const live = request.current();
            if (live === undefined || live.version !== version) {
                logger.debug('Format answer dropped: the document changed or closed while formatting');
                return [];
            }
            return this.editsFor(request, version, sent, outcome);
        } catch (error) {
            // No message for the user, but the first occurrence per connection reaches the log at warn.
            const name = error instanceof Error ? error.name : 'unknown';
            this.notice('unexpected-error', `generation:${this.javaInterop.connectionGeneration}`,
                `Format notice: unexpected-error (${name})`);
            return [];
        }
    }

    /**
     * The request parameters. A selection is sent as `range` under a name with a range suffix:
     * bbj-ls lets a newer request supersede a pending one with the same name, so a selection must
     * never share the whole-document name or it would cancel a format-on-save in flight. The
     * formatting options of the editor are ignored; only the normalized settings are sent, and the
     * denumber permission is never set.
     */
    private paramsFor(request: BBjFormatRequest, version: number, sent: string): FormatProgramParams {
        const path = URI.parse(request.document.uri).fsPath;
        const params: FormatProgramParams = {
            text: sent,
            version: String(version),
            canonicalName: path,
            settings: this.settings.snapshot()
        };
        if (request.range !== undefined) {
            const { start, end } = request.range;
            params.range = {
                start: { line: start.line, character: start.character },
                end: { line: end.line, character: end.character }
            };
            params.canonicalName = `${path}#range:${start.line}-${end.line}`;
        }
        return params;
    }

    private editsFor(request: BBjFormatRequest, version: number, sent: string, outcome: ProgramOutcome<FormatProgramResult>): TextEdit[] {
        switch (outcome.kind) {
            case 'ok':
                return outcome.result.scope === 'document'
                    ? minimalLineEdit(request.document, 0, sent.length, outcome.result.text)
                    : rangeFormatEdits(request.document, outcome.result.edits);
            case 'cancelled':
                logger.debug('Format request was cancelled');
                return [];
            default:
                this.report(outcome, request, version);
                return [];
        }
    }

    /**
     * Turns an outcome that left the buffer as it was into at most one message for the user. Log
     * lines carry the notice kind and fixed tokens only, never document text or peer text.
     *
     * A message about the content of one version of one document is scoped to that document and
     * version, so an edit re-arms it and saving an unchanged file never repeats it. A message about
     * the environment is scoped to the connection, so a reconnect re-arms it. Formatter engine
     * failures and timeouts count as the environment: they are shown once per connection, and a
     * later one is logged only. The one exception is the offer to denumber a file with line
     * numbers, which is not deduplicated at all and is raised on every request.
     */
    private report(outcome: Exclude<ProgramOutcome<FormatProgramResult>, { kind: 'ok' | 'cancelled' }>, request: BBjFormatRequest, version: number): void {
        const generation = `generation:${this.javaInterop.connectionGeneration}`;
        const documentScope = `${request.document.uri}@${version}`;
        switch (outcome.kind) {
            case 'unavailable':
                if (outcome.reason === 'method-not-found') {
                    this.environmentNotice('requires-bbj-26-03', generation, 'the connected BBjServices has no formatter',
                        FORMAT_REQUIRES_BBJ_26_03_MESSAGE);
                } else {
                    // The interop client has already reported that the service is not reachable.
                    logger.debug(`Format not applied: unavailable (${outcome.reason})`);
                }
                return;
            case 'timeout':
                this.environmentNotice('timeout', generation, `timeout (${outcome.origin})`, FORMAT_TIMEOUT_MESSAGE);
                return;
            case 'malformed-result':
                this.environmentNotice('malformed-result', generation, 'malformed-result', FORMAT_ENGINE_FAILED_MESSAGE);
                return;
            case 'invalid-settings':
                this.reportInvalidSettings(outcome.problems);
                return;
            case 'mixed-numbering':
                this.reportMixedNumbering(outcome.line, request, documentScope);
                return;
            case 'failed':
                if (outcome.failure === 'denum-needed') {
                    this.offerDenum(outcome.code, request);
                    return;
                }
                this.reportFailure(outcome.failure, outcome.code, generation, documentScope);
                return;
        }
    }

    /**
     * A file with line numbers: an offer to denumber it, never anything that changes the buffer.
     * A whole-document request gets the offer, a selection gets an explanation, and both are raised
     * on every request. They stay out of the notice ledger because someone who asks for formatting
     * must always get an answer, however often they ask on the same version. A formatting request
     * carries no trigger, so a save cannot be told apart from Format Document and gets the offer
     * too; VS Code replaces a showing notification that has the same text and buttons, so repeated
     * offers do not pile up. The offer is started and never awaited, so the format response does
     * not wait for the user, and nothing it throws can break the format request.
     */
    private offerDenum(code: number | undefined, request: BBjFormatRequest): void {
        const selection = request.range !== undefined;
        const kind = selection ? 'denum-needed-selection' : 'denum-needed';
        logger.debug(`Format notice: ${kind} (denum-needed${code === undefined ? '' : `, code ${code}`})`);
        try {
            const denum = this.context.compiler?.BBjDenumService;
            if (denum === undefined) {
                logger.debug(`Format notice: ${kind} not offered (no denumber service)`);
                return;
            }
            denum.offer({ uri: request.document.uri, current: () => request.current() }, selection ? 'selection' : 'document');
        } catch {
            // An offer that cannot be shown must never break a format request.
            logger.debug(`Format notice: ${kind} not offered (offer failed)`);
        }
    }

    /**
     * The text of the invalid-settings warning and the unique full key names it names, each spelled
     * the way the user set it. Shared with every other path that reports rejected formatter settings.
     */
    public describeInvalidSettings(problems: readonly ProgramSettingProblem[]): { text: string; keys: string[] } {
        const text = invalidSettingsMessage(problems, setting => this.settings.userKeyFor(setting));
        const keys: string[] = [];
        for (const problem of problems) {
            const key = `${FORMATTER_KEY_PREFIX}${this.settings.userKeyFor(problem.setting)}`;
            if (!keys.includes(key)) {
                keys.push(key);
            }
        }
        return { text, keys };
    }

    /**
     * One warning naming every rejected key, scoped to the settings revision: a change of the
     * settings re-arms it. The button sends the key names to the client, nothing else.
     */
    private reportInvalidSettings(problems: readonly ProgramSettingProblem[]): void {
        const { text, keys } = this.describeInvalidSettings(problems);
        this.notice('invalid-settings', `settings:${this.settings.revision}`,
            `Format notice: invalid-settings (${problems.length} problems)`,
            () => this.messenger.warnWithAction(text, OPEN_SETTINGS_ACTION, () => this.messenger.openFormatterSettings({ keys })));
    }

    /**
     * One warning for a file that mixes numbered and unnumbered lines. With a known line it offers
     * to jump there, in the document the request was about and never anywhere the peer names.
     */
    private reportMixedNumbering(line: number | undefined, request: BBjFormatRequest, documentScope: string): void {
        const text = mixedNumberingMessage(line);
        this.notice('mixed-numbering', documentScope, `Format notice: mixed-numbering (${line === undefined ? 'no line' : 'line known'})`, () => {
            if (line === undefined) {
                this.messenger.warn(text);
                return;
            }
            this.messenger.warnWithAction(text, GO_TO_LINE_ACTION, () => {
                const lineCount = (request.current() ?? request.document).lineCount;
                const clamped = Math.max(0, Math.min(line - 1, lineCount - 1));
                this.messenger.showDocument(request.document.uri, clamped);
            });
        });
    }

    private reportFailure(failure: ProgramFailureKind, code: number | undefined, generation: string, documentScope: string): void {
        const described = `${failure}${code === undefined ? '' : `, code ${code}`}`;
        switch (failure) {
            case 'transport':
                // The interop client has already reported that the service is not reachable.
                logger.debug('Format not applied: failed (transport)');
                return;
            case 'size-cap':
                this.contentNotice('too-large', documentScope, described, FORMAT_TOO_LARGE_MESSAGE);
                return;
            case 'protected-program':
                this.contentNotice('protected', documentScope, described, FORMAT_PROTECTED_MESSAGE);
                return;
            case 'denum-needed':
                // Raised as an offer by report(); nothing to say here.
                logger.debug('Format not applied: failed (denum-needed)');
                return;
            case 'format-failed':
            case 'parser-exception':
                this.environmentNotice('engine-failed', generation, described, FORMAT_ENGINE_FAILED_MESSAGE);
                return;
            case 'service-unavailable':
                this.environmentNotice('service-unavailable', generation, described, FORMAT_SERVICE_UNAVAILABLE_MESSAGE);
                return;
            case 'invalid-params':
                // Not something the user can act on; the log is the only place it shows.
                this.notice('invalid-params', generation, `Format notice: invalid-params (${described})`);
                return;
        }
    }

    private environmentNotice(kind: string, generation: string, described: string, text: string): void {
        this.notice(kind, generation, `Format notice: ${kind} (${described})`, () => this.messenger.warn(text));
    }

    private contentNotice(kind: string, documentScope: string, described: string, text: string): void {
        this.notice(kind, documentScope, `Format notice: ${kind} (${described})`, () => this.messenger.warn(text));
    }

    /**
     * Records a notice and shows it the first time only. The first occurrence of `kind` within
     * `scope` logs at warn and calls `show`; every repeat logs at debug. The ledger forgets its
     * oldest entry when it is full, so only a notice not seen for a long time can show again.
     */
    private notice(kind: string, scope: string, logLine: string, show?: () => void): void {
        const key = `${kind}|${scope}`;
        if (this.shownNotices.has(key)) {
            logger.debug(logLine);
            return;
        }
        if (this.shownNotices.size >= FORMAT_NOTICE_LEDGER_LIMIT) {
            const oldest = this.shownNotices.values().next().value;
            if (oldest !== undefined) {
                this.shownNotices.delete(oldest);
            }
        }
        this.shownNotices.add(key);
        logger.warn(logLine);
        try {
            show?.();
        } catch {
            // A message that cannot be shown must never break a format request.
        }
    }
}
