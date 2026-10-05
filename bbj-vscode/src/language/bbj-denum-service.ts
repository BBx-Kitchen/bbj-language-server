/**
 * Denumbers the open buffer of a BBj document through bbj-ls's `denumProgram`, applies the result
 * as one versioned edit and tells the user how it went. This is the one DENUM orchestration core:
 * every way of reaching DENUM goes through {@link BBjDenumService.run}, so the capture, the call,
 * the re-check, the edit, the apply and the message exist exactly once.
 *
 * The request carries the live buffer text, so nothing is read from disk and nothing is written to
 * it. The document version and text are captured before the call and the open buffer is looked at
 * again afterwards: an answer computed for another version is dropped, never applied. Every run
 * ends with exactly one message and DENUM messages are never deduplicated: a DENUM run is an
 * explicit user action and always gets its answer.
 */

import { CancellationToken, type TextEdit } from 'vscode-languageserver';
import type { BBjDenumRequest, DenumFailureReason, DenumResult } from './denum-command.js';
import type {
    DenumProgramResult, FormatSettingValue, ProgramFailureKind, ProgramOutcome, ProgramSettingProblem
} from './java-interop-program-types.js';
import type { JavaInteropService } from './java-interop.js';
import type { DenumDiagnosticDto, DenumDiagnosticsParams } from './denum-notifications.js';
import { minimalLineEdit } from './bbj-format-edit.js';
import type { OpenFormatterSettingsParams } from './format-settings-notification.js';
import {
    FORMAT_ENGINE_FAILED_MESSAGE, FORMAT_SERVICE_UNAVAILABLE_MESSAGE, FORMAT_TIMEOUT_MESSAGE, FORMAT_TOO_LARGE_MESSAGE,
    GO_TO_LINE_ACTION, OPEN_SETTINGS_ACTION, TOKENIZED_PROGRAM_PREFIX, mixedNumberingMessage
} from './bbj-format-service.js';
import {
    applyDocumentEdit, notifyDenumDiagnostics, notifyOpenFormatterSettings, notifyShowDenumDiagnostics, showFormatterDocument,
    showFormatterWarning, showFormatterWarningWithAction, showInformation, showInformationWithAction,
    showWarningWithActions
} from './bbj-notifications.js';
import { BBjLanguageMetaData } from './generated/module.js';
import { logger } from './logger.js';

/** Shown after a successful run. */
export const DENUM_SUCCESS_MESSAGE = 'Denumbered.';

/** Shown when the file has no line numbers. */
export const DENUM_NOTHING_TO_DO_MESSAGE = 'This file has no line numbers. Nothing to denumber.';

/** Shown when a Denumber and Format run finds no line numbers but still formatted the file. */
export const DENUM_NOT_NUMBERED_FORMATTED_MESSAGE = 'This file has no line numbers. It was formatted.';

/** Shown when DENUM failed or answered with something unusable. */
export const DENUM_FAILED_MESSAGE = 'Denumbering failed. The file was not changed. See the BBj output for details.';

/** Shown when the buffer is a tokenized program: it has to be decompiled before it can be denumbered. */
export const DENUM_TOKENIZED_MESSAGE =
    'This is a tokenized BBj program, not source text. Decompile it first, then denumber the source.';

/** Shown when the request names a document that is not an open BBj file. */
export const DENUM_NOT_OPEN_MESSAGE =
    'Open the BBj file in the editor first; denumbering works on the open editor text.';

/** Shown when the buffer changed or closed while DENUM was running. */
export const DENUM_STALE_MESSAGE =
    'The file changed while it was being denumbered. Nothing was changed; run Denumber again.';

/** Shown when the editor refused the denumbered text. */
export const DENUM_NOT_APPLIED_MESSAGE =
    'The editor did not accept the denumbered text. Nothing was changed; run Denumber again.';

/** Shown when a run for the same document is still going. */
export const DENUM_IN_PROGRESS_MESSAGE = 'Denumbering is already running for this file.';

/** Shown when the connected BBjServices does not offer DENUM. */
export const DENUM_REQUIRES_BBJ_26_03_MESSAGE =
    'Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it.';

/** Shown when BBjServices could not be reached. */
export const DENUM_NOT_REACHABLE_MESSAGE = 'BBjServices is not reachable. The file was not changed.';

/** Shown when DENUM ran into a deadline. */
export const DENUM_TIMEOUT_MESSAGE = 'Denumbering timed out. The file was not changed; try again.';

/** Shown when the file is over the size the service accepts. */
export const DENUM_TOO_LARGE_MESSAGE = 'This file is too large to denumber. The file was not changed.';

/** Shown when the program is protected. */
export const DENUM_PROTECTED_MESSAGE = 'This BBj program is protected and cannot be denumbered.';

/** Shown when BBj's parser could not read the text; the usual cause is a character BBj cannot represent. */
export const DENUM_PARSER_FAILED_MESSAGE =
    'Denumbering failed. The file was not changed. If it contains characters BBj cannot represent, remove them and try again.';

/** Shown when the denumbering service answered that it cannot serve right now. */
export const DENUM_SERVICE_UNAVAILABLE_MESSAGE =
    'The BBj denumbering service is not available right now. The file was not changed; try again later.';

/** Shown after a successful Denumber and Format run. */
export const DENUM_AND_FORMAT_SUCCESS_MESSAGE = 'Denumbered and formatted.';

/** The label of the edit in the editor's undo history. */
export const DENUMBER_EDIT_LABEL = 'Denumber';

/** The label of the Denumber and Format edit in the editor's undo history. */
export const DENUMBER_AND_FORMAT_EDIT_LABEL = 'Denumber and Format';

/** The button that denumbers the file. */
export const DENUMBER_ACTION = 'Denumber';

/** The button that denumbers and formats the file in one step. */
export const DENUMBER_AND_FORMAT_ACTION = 'Denumber and Format';

/** Shown when Format Document finds line numbers. */
export const DENUM_OFFER_MESSAGE =
    'This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in one step.';

/** Shown when Format Selection finds line numbers. */
export const DENUM_SELECTION_MESSAGE =
    'Formatting a selection needs a file without line numbers. Denumber the file first.';

/** The button on the confirmation of a run that reported diagnostics. */
export const SHOW_DENUM_DIAGNOSTICS_ACTION = 'Show';

/**
 * The confirmation with the tally of the diagnostics: `base` alone for an empty list, otherwise
 * `base` followed by the counts of errors, warnings and notes in that order, a kind with a zero
 * count left out ('Denumbered. 2 errors, 1 warning.'). The counts are exact tallies of `diagnostics`.
 */
export function denumSuccessMessage(base: string, diagnostics: readonly DenumDiagnosticDto[]): string {
    const tally = { ERROR: 0, WARNING: 0, INFO: 0 };
    for (const diagnostic of diagnostics) {
        tally[diagnostic.severity]++;
    }
    const parts: string[] = [];
    const count = (n: number, singular: string) => {
        if (n > 0) {
            parts.push(`${n} ${singular}${n === 1 ? '' : 's'}`);
        }
    };
    count(tally.ERROR, 'error');
    count(tally.WARNING, 'warning');
    count(tally.INFO, 'note');
    return parts.length === 0 ? base : `${base} ${parts.join(', ')}.`;
}

/**
 * Where the service sends what the user should see and how the edit reaches the editor. Every
 * method is fire and forget or never rejects: a run never fails because a message could not be sent.
 */
export interface DenumMessenger {
    /** Shows a plain Information message. */
    info(text: string): void;
    /** Shows a plain Warning. */
    warn(text: string): void;
    /** Shows an Information message with one button; `onAction` runs only if the user picks it. Never awaited. */
    infoWithAction(text: string, actionTitle: string, onAction: () => void): void;
    /** Shows a Warning with one button; `onAction` runs only if the user picks it. Never awaited. */
    warnWithAction(text: string, actionTitle: string, onAction: () => void): void;
    /** Shows a Warning with several buttons; `onPick` runs with the title of the one the user picks, if any. Never awaited. */
    warnWithActions(text: string, actionTitles: readonly string[], onPick: (title: string) => void): void;
    /** Asks the client to show the open document `uri` with the cursor at the zero-based `line`. */
    showDocument(uri: string, line: number): void;
    /** Asks the client to open its formatter settings. */
    openFormatterSettings(params: OpenFormatterSettingsParams): void;
    /** Sends the list of diagnostics of a finished run to the client. */
    denumDiagnostics(params: DenumDiagnosticsParams): void;
    /** Asks the client to reveal the list it already holds. */
    showDenumDiagnostics(): void;
    /** Applies `edits` to the open document `uri` at `version` as one undoable change; resolves to whether the client did. */
    applyEdit(uri: string, version: number, edits: TextEdit[], label: string): Promise<boolean>;
}

/**
 * Starts a prompt without waiting for it and runs `onPick` with the title the user picked, only if
 * it is one of `actionTitles`. Nothing that goes wrong here may reach the run that started the prompt.
 */
function runOnPick(prompt: Promise<string | undefined>, actionTitles: readonly string[], onPick: (title: string) => void): void {
    void prompt.then(picked => {
        if (picked !== undefined && actionTitles.includes(picked)) {
            try {
                onPick(picked);
            } catch {
                // An action that cannot run must never break anything.
            }
        }
    }, () => { /* a failed prompt is harmless */ });
}

/** The messenger the server uses: the connection-free senders of the notifications module. */
const DEFAULT_MESSENGER: DenumMessenger = {
    info: showInformation,
    warn: showFormatterWarning,
    infoWithAction: (text, actionTitle, onAction) => runOnPick(showInformationWithAction(text, actionTitle), [actionTitle], onAction),
    warnWithAction: (text, actionTitle, onAction) => runOnPick(showFormatterWarningWithAction(text, actionTitle), [actionTitle], onAction),
    warnWithActions: (text, actionTitles, onPick) => runOnPick(showWarningWithActions(text, actionTitles), actionTitles, onPick),
    showDocument: showFormatterDocument,
    openFormatterSettings: notifyOpenFormatterSettings,
    denumDiagnostics: notifyDenumDiagnostics,
    showDenumDiagnostics: notifyShowDenumDiagnostics,
    applyEdit: (uri, version, edits, label) => applyDocumentEdit({ uri, version, edits, label })
};

/**
 * The slice of the services this service reads. Kept structural so `bbj-module.ts` can construct it
 * without a circular import of the full services type.
 */
export interface BBjDenumServiceContext {
    java: {
        JavaInteropService: JavaInteropService;
    };
    /** Read when a Denumber and Format run starts or fails, never in the constructor: the two services must not depend on each other's creation order. */
    compiler: {
        BBjFormatService: {
            settingsSnapshot(): Record<string, FormatSettingValue>;
            describeInvalidSettings(problems: readonly ProgramSettingProblem[]): { text: string; keys: string[] };
        };
    };
}

/** What a run does: denumber only, or denumber and format in one call. */
type DenumOperation = 'denum' | 'denum-and-format';

/**
 * A fresh copy of the validated diagnostics built field by field, so the result carries exactly
 * the four host-neutral keys, in the order bbj-ls reported them, and nothing else the peer sent.
 */
function copyDiagnostics(result: DenumProgramResult): DenumDiagnosticDto[] {
    return result.diagnostics.map(diagnostic => ({
        line: diagnostic.line,
        originalLineNumber: diagnostic.originalLineNumber,
        severity: diagnostic.severity,
        message: diagnostic.message
    }));
}

export class BBjDenumService {

    private readonly javaInterop: JavaInteropService;
    private messenger: DenumMessenger = DEFAULT_MESSENGER;
    /** The uris of the documents with a run in flight: one run applies to one version of one document at a time. */
    private readonly running = new Set<string>();

    private readonly context: BBjDenumServiceContext;

    constructor(services: BBjDenumServiceContext) {
        this.context = services;
        this.javaInterop = services.java.JavaInteropService;
    }

    /** Replaces where user messages go and how the edit is applied; the default uses the language client. */
    public setMessenger(messenger: DenumMessenger): void {
        this.messenger = messenger;
    }

    /**
     * Offers to denumber the document `request` names, after a format request found line numbers.
     * A whole-document offer has two buttons, a selection explanation only Denumber. Fire and forget:
     * nothing waits for the user, and a click reads the buffer as it is then, so it works however
     * late it comes.
     */
    public offer(request: BBjDenumRequest, scope: 'document' | 'selection'): void {
        try {
            const denumber = () => { void this.run(request, CancellationToken.None).catch(() => { /* run never rejects */ }); };
            if (scope === 'selection') {
                this.messenger.warnWithAction(DENUM_SELECTION_MESSAGE, DENUMBER_ACTION, denumber);
                return;
            }
            this.messenger.warnWithActions(DENUM_OFFER_MESSAGE, [DENUMBER_ACTION, DENUMBER_AND_FORMAT_ACTION], picked => {
                if (picked === DENUMBER_ACTION) {
                    denumber();
                } else if (picked === DENUMBER_AND_FORMAT_ACTION) {
                    void this.runDenumAndFormat(request, CancellationToken.None).catch(() => { /* never rejects */ });
                }
            });
        } catch (error) {
            logger.debug(`Denumber offer failed unexpectedly (${error instanceof Error ? error.name : 'unknown'})`);
        }
    }

    /**
     * Denumbers the request's open document. Resolves to the outcome and never rejects; every
     * ending, a failure included, has shown exactly one message unless the caller cancelled.
     */
    public run(request: BBjDenumRequest, token: CancellationToken): Promise<DenumResult> {
        return this.execute('denum', request, token);
    }

    /**
     * Denumbers and formats the request's open document with one `formatProgram` call that carries
     * the denumber permission, and applies the answer as one edit. Resolves to the outcome and never
     * rejects; every ending has shown exactly one message unless the caller cancelled.
     */
    public runDenumAndFormat(request: BBjDenumRequest, token: CancellationToken): Promise<DenumResult> {
        return this.execute('denum-and-format', request, token);
    }

    /** The one core both runs go through: every guard, the call, the re-check, the edit and the messages exist once. */
    private async execute(operation: DenumOperation, request: BBjDenumRequest, token: CancellationToken): Promise<DenumResult> {
        let claimed: string | undefined;
        try {
            if (request.uri === undefined) {
                return this.fail('invalid-params', DENUM_NOT_OPEN_MESSAGE);
            }
            const document = request.current();
            if (document === undefined || document.languageId !== BBjLanguageMetaData.languageId) {
                return this.fail('not-open', DENUM_NOT_OPEN_MESSAGE);
            }
            // The store updates documents in place: keep primitives, never the document as a snapshot.
            const version = document.version;
            const uri = document.uri;
            const lineCount = document.lineCount;
            const sent = document.getText();
            if (sent.startsWith(TOKENIZED_PROGRAM_PREFIX)) {
                return this.fail('tokenized', DENUM_TOKENIZED_MESSAGE);
            }

            if (this.running.has(document.uri)) {
                return this.fail('in-progress', DENUM_IN_PROGRESS_MESSAGE);
            }
            claimed = document.uri;
            this.running.add(claimed);

            const outcome = await this.callPeer(operation, sent, version, token);

            if (token.isCancellationRequested || outcome.kind === 'cancelled') {
                logger.debug('Denumber run was cancelled');
                return { status: 'failed', reason: 'cancelled' };
            }
            if (outcome.kind !== 'ok') {
                return this.presentFailure(outcome, request, uri, lineCount, operation);
            }

            const live = request.current();
            if (live === undefined || live.version !== version) {
                return this.fail('stale', DENUM_STALE_MESSAGE);
            }
            const base = operation === 'denum' ? DENUM_SUCCESS_MESSAGE : DENUM_AND_FORMAT_SUCCESS_MESSAGE;
            const label = operation === 'denum' ? DENUMBER_EDIT_LABEL : DENUMBER_AND_FORMAT_EDIT_LABEL;
            const edits = minimalLineEdit(live, 0, sent.length, outcome.result.text);

            if (!outcome.result.denumbered) {
                // A plain DENUM has nothing to change; a combined run still carries the formatted text.
                if (operation === 'denum' || edits.length === 0) {
                    this.messenger.info(DENUM_NOTHING_TO_DO_MESSAGE);
                    return { status: 'not-line-numbered', message: DENUM_NOTHING_TO_DO_MESSAGE, version };
                }
                if (!await this.messenger.applyEdit(live.uri, version, edits, label)) {
                    return this.fail('not-applied', DENUM_NOT_APPLIED_MESSAGE);
                }
                this.messenger.info(DENUM_NOT_NUMBERED_FORMATTED_MESSAGE);
                return { status: 'not-line-numbered', message: DENUM_NOT_NUMBERED_FORMATTED_MESSAGE, version, edits, applied: true };
            }

            const diagnostics = copyDiagnostics(outcome.result);
            if (edits.length === 0) {
                // Nothing to apply, but the diagnostics are still the answer the user asked for.
                const message = this.presentSuccess(live.uri, diagnostics, base, live.version);
                return { status: 'denumbered', message, version, edits, diagnostics, applied: false };
            }
            const applied = await this.messenger.applyEdit(live.uri, version, edits, label);
            if (!applied) {
                return this.fail('not-applied', DENUM_NOT_APPLIED_MESSAGE);
            }
            const message = this.presentSuccess(live.uri, diagnostics, base, undefined);
            return { status: 'denumbered', message, version, edits, diagnostics, applied: true };
        } catch (error) {
            // Log lines carry fixed tokens only, never document or peer text.
            logger.debug(`Denumber run failed unexpectedly (${error instanceof Error ? error.name : 'unknown'})`);
            return this.fail('denum-failed', DENUM_FAILED_MESSAGE);
        } finally {
            if (claimed !== undefined) {
                this.running.delete(claimed);
            }
        }
    }

    /**
     * The end of an applied run. A run that reported diagnostics sends the list first, then shows
     * one message with the counts and a Show button: a Warning when any entry is an error, an
     * Information message otherwise. A clean run shows the plain confirmation.
     *
     * `version` is the document version the list describes; the key is left out of the payload
     * when it is unknown, so a client sees no version at all rather than a guess.
     */
    private presentSuccess(uri: string, diagnostics: DenumDiagnosticDto[], base: string, version: number | undefined): string {
        if (diagnostics.length === 0) {
            this.messenger.info(base);
            return base;
        }
        const params: DenumDiagnosticsParams = version === undefined ? { uri, diagnostics } : { uri, diagnostics, version };
        this.messenger.denumDiagnostics(params);
        const text = denumSuccessMessage(base, diagnostics);
        const reveal = () => this.messenger.showDenumDiagnostics();
        if (diagnostics.some(diagnostic => diagnostic.severity === 'ERROR')) {
            this.messenger.warnWithAction(text, SHOW_DENUM_DIAGNOSTICS_ACTION, reveal);
        } else {
            this.messenger.infoWithAction(text, SHOW_DENUM_DIAGNOSTICS_ACTION, reveal);
        }
        return text;
    }

    /**
     * Asks bbj-ls to do the work and returns its answer in the shape of a DENUM answer. A combined
     * run is one whole-document `formatProgram` call with the denumber permission and the format
     * settings; a range answer to it is unusable.
     *
     * No canonicalName in either call: bbj-ls supersedes a pending request that carries the same
     * name, and two runs must never cancel each other.
     */
    private async callPeer(
        operation: DenumOperation, text: string, version: number, token: CancellationToken
    ): Promise<ProgramOutcome<DenumProgramResult>> {
        if (operation === 'denum') {
            return this.javaInterop.denumProgram({ text, version: String(version) }, token);
        }
        const outcome = await this.javaInterop.formatProgram({
            text,
            version: String(version),
            settings: this.context.compiler.BBjFormatService.settingsSnapshot(),
            allowDenum: true
        }, token);
        if (outcome.kind !== 'ok') {
            return outcome;
        }
        if (outcome.result.scope !== 'document') {
            return { kind: 'malformed-result', reason: 'range answer to a whole-document request' };
        }
        const { text: answer, diagnostics, denumbered, version: echoed } = outcome.result;
        return { kind: 'ok', result: { text: answer, diagnostics, denumbered, version: echoed } };
    }

    /**
     * Maps an outcome that is neither a result nor a cancellation to its one Warning and reason.
     * Every text is fixed: nothing the peer wrote and nothing from the document reaches the user.
     * A combined run answers the failures that come from formatting with the formatting texts.
     */
    private presentFailure(
        outcome: Exclude<ProgramOutcome<DenumProgramResult>, { kind: 'ok' | 'cancelled' }>,
        request: BBjDenumRequest,
        uri: string,
        lineCountAtStart: number,
        operation: DenumOperation
    ): DenumResult {
        if (operation === 'denum-and-format') {
            const formatting = this.presentFormattingFailure(outcome);
            if (formatting !== undefined) {
                return formatting;
            }
        }
        switch (outcome.kind) {
            case 'unavailable':
                return outcome.reason === 'method-not-found'
                    ? this.fail('requires-bbj-26-03', DENUM_REQUIRES_BBJ_26_03_MESSAGE, 'method-not-found')
                    : this.fail('not-reachable', DENUM_NOT_REACHABLE_MESSAGE, 'unavailable');
            case 'timeout':
                return this.fail('timeout', DENUM_TIMEOUT_MESSAGE, `timeout, ${outcome.origin}`);
            case 'mixed-numbering':
                return this.presentMixedNumbering(outcome.line, request, uri, lineCountAtStart);
            case 'failed':
                return this.presentFailed(outcome.failure, outcome.code);
            case 'malformed-result':
                return this.fail('denum-failed', DENUM_FAILED_MESSAGE, 'malformed-result');
            case 'invalid-settings':
                return this.fail('denum-failed', DENUM_FAILED_MESSAGE, 'invalid-settings');
        }
    }

    /**
     * The failures of a combined run that come from formatting, with the formatting texts; any
     * other outcome is `undefined` and goes through the DENUM texts. Invalid settings are the one
     * text built from the peer's per-setting reasons, bounded and capped by the shared builder.
     */
    private presentFormattingFailure(
        outcome: Exclude<ProgramOutcome<DenumProgramResult>, { kind: 'ok' | 'cancelled' }>
    ): DenumResult | undefined {
        switch (outcome.kind) {
            case 'invalid-settings': {
                const { text, keys } = this.context.compiler.BBjFormatService.describeInvalidSettings(outcome.problems);
                return this.fail('invalid-settings', text, `invalid-settings, ${outcome.problems.length} problems`, () =>
                    this.messenger.warnWithAction(text, OPEN_SETTINGS_ACTION, () => this.messenger.openFormatterSettings({ keys })));
            }
            case 'timeout':
                return this.fail('timeout', FORMAT_TIMEOUT_MESSAGE, `timeout, ${outcome.origin}`);
            case 'malformed-result':
                return this.fail('denum-failed', FORMAT_ENGINE_FAILED_MESSAGE, 'malformed-result');
            case 'failed': {
                const detail = `${outcome.failure}${outcome.code === undefined ? '' : `, code ${outcome.code}`}`;
                switch (outcome.failure) {
                    case 'size-cap':
                        return this.fail('too-large', FORMAT_TOO_LARGE_MESSAGE, detail);
                    case 'format-failed':
                        return this.fail('denum-failed', FORMAT_ENGINE_FAILED_MESSAGE, detail);
                    case 'service-unavailable':
                        return this.fail('service-unavailable', FORMAT_SERVICE_UNAVAILABLE_MESSAGE, detail);
                    default:
                        return undefined;
                }
            }
            default:
                return undefined;
        }
    }

    private presentFailed(failure: ProgramFailureKind, code: number | undefined): DenumResult {
        const detail = `${failure}${code === undefined ? '' : `, code ${code}`}`;
        switch (failure) {
            case 'transport':
                return this.fail('not-reachable', DENUM_NOT_REACHABLE_MESSAGE, detail);
            case 'size-cap':
                return this.fail('too-large', DENUM_TOO_LARGE_MESSAGE, detail);
            case 'protected-program':
                return this.fail('protected-program', DENUM_PROTECTED_MESSAGE, detail);
            case 'parser-exception':
                return this.fail('denum-failed', DENUM_PARSER_FAILED_MESSAGE, detail);
            case 'service-unavailable':
                return this.fail('service-unavailable', DENUM_SERVICE_UNAVAILABLE_MESSAGE, detail);
            case 'denum-needed':
            case 'format-failed':
            case 'invalid-params':
                return this.fail('denum-failed', DENUM_FAILED_MESSAGE, detail);
        }
    }

    /**
     * The Warning for a file that mixes numbered and unnumbered lines. With a known line it offers
     * to jump there, in the document the run started with and never anywhere the peer names; the
     * line is clamped to the document as it is when the user clicks. `line` is one-based.
     */
    private presentMixedNumbering(line: number | undefined, request: BBjDenumRequest, uri: string, lineCountAtStart: number): DenumResult {
        if (line === undefined || !Number.isFinite(line)) {
            return this.fail('mixed-numbering', mixedNumberingMessage(undefined), 'no line');
        }
        const clampTo = (lineCount: number): number => Math.max(0, Math.min(line - 1, lineCount - 1));
        const text = mixedNumberingMessage(line);
        const result = this.fail('mixed-numbering', text, 'line known', () => {
            this.messenger.warnWithAction(text, GO_TO_LINE_ACTION, () => {
                this.messenger.showDocument(uri, clampTo(request.current()?.lineCount ?? lineCountAtStart));
            });
        });
        return { ...result, line: clampTo(request.current()?.lineCount ?? lineCountAtStart) };
    }

    /**
     * Shows the one Warning of a failed run and builds its result. `show` replaces the plain
     * Warning when the message carries a button. The log line holds the reason and fixed tokens
     * only, never document text or the peer's own wording.
     */
    private fail(reason: DenumFailureReason, text: string, detail?: string, show?: () => void): DenumResult {
        logger.warn(`Denumber run failed: ${reason}${detail === undefined ? '' : ` (${detail})`}`);
        if (show === undefined) {
            this.messenger.warn(text);
        } else {
            show();
        }
        return { status: 'failed', reason, message: text };
    }
}
