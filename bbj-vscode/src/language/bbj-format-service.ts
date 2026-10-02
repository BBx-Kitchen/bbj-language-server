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
    FormatProgramParams, FormatSettingValue, ProgramFailureKind, ProgramOutcome, FormatProgramResult
} from './java-interop-program-types.js';
import type { JavaInteropService } from './java-interop.js';
import { minimalLineEdit, rangeFormatEdits } from './bbj-format-edit.js';
import { FormatterSettingsHolder } from './bbj-format-settings.js';
import type { OpenFormatterSettingsParams } from './format-settings-notification.js';
import {
    notifyOpenFormatterSettings, showFormatterDocument, showFormatterWarning, showFormatterWarningWithAction
} from './bbj-notifications.js';
import { logger } from './logger.js';

/** A buffer starting with this text is a tokenized program, not source; bbj-ls cannot format it. */
export const TOKENIZED_PROGRAM_PREFIX = '<<bbj>>';

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

/** Shown when the file has line numbers: formatting never removes them. */
export const FORMAT_DENUM_NEEDED_MESSAGE =
    'This file has line numbers. Run Denumber BBj Program first, then format.';

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
}

export class BBjFormatService {

    private readonly javaInterop: JavaInteropService;
    private readonly settings = new FormatterSettingsHolder();
    private messenger: FormatMessenger = DEFAULT_MESSENGER;
    /** `${kind}|${scope}` of every notice shown, oldest first, bounded by {@link FORMAT_NOTICE_LEDGER_LIMIT}. */
    private readonly shownNotices = new Set<string>();

    constructor(services: BBjFormatServiceContext) {
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
            logger.debug(`Format request failed unexpectedly (${error instanceof Error ? error.name : 'unknown'})`);
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
     * the environment is scoped to the connection, so a reconnect re-arms it.
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
                this.environmentNotice('engine-failed', generation, 'malformed-result', FORMAT_ENGINE_FAILED_MESSAGE);
                return;
            case 'failed':
                this.reportFailure(outcome.failure, outcome.code, generation, documentScope);
                return;
            default:
                logger.debug(`Format not applied: ${outcome.kind}`);
                return;
        }
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
                this.contentNotice('denum-needed', documentScope, described, FORMAT_DENUM_NEEDED_MESSAGE);
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
