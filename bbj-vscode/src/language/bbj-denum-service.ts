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

import type { CancellationToken, TextEdit } from 'vscode-languageserver';
import type { BBjDenumRequest, DenumFailureReason, DenumResult } from './denum-command.js';
import type { DenumProgramResult, ProgramOutcome } from './java-interop-program-types.js';
import type { JavaInteropService } from './java-interop.js';
import type { DenumDiagnosticDto, DenumDiagnosticsParams } from './denum-notifications.js';
import { minimalLineEdit } from './bbj-format-edit.js';
import { TOKENIZED_PROGRAM_PREFIX } from './bbj-format-service.js';
import {
    applyDocumentEdit, notifyDenumDiagnostics, notifyShowDenumDiagnostics, showFormatterDocument,
    showFormatterWarning, showFormatterWarningWithAction, showInformation, showInformationWithAction
} from './bbj-notifications.js';
import { BBjLanguageMetaData } from './generated/module.js';
import { logger } from './logger.js';

/** Shown after a successful run. */
export const DENUM_SUCCESS_MESSAGE = 'Denumbered.';

/** Shown when the file has no line numbers. */
export const DENUM_NOTHING_TO_DO_MESSAGE = 'This file has no line numbers. Nothing to denumber.';

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

/** The label of the edit in the editor's undo history. */
export const DENUMBER_EDIT_LABEL = 'Denumber';

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
    /** Asks the client to show the open document `uri` with the cursor at the zero-based `line`. */
    showDocument(uri: string, line: number): void;
    /** Sends the list of diagnostics of a finished run to the client. */
    denumDiagnostics(params: DenumDiagnosticsParams): void;
    /** Asks the client to reveal the list it already holds. */
    showDenumDiagnostics(): void;
    /** Applies `edits` to the open document `uri` at `version` as one undoable change; resolves to whether the client did. */
    applyEdit(uri: string, version: number, edits: TextEdit[], label: string): Promise<boolean>;
}

/**
 * Starts a prompt without waiting for it and runs `onAction` only if the user picked `actionTitle`.
 * Nothing that goes wrong here may reach the run that started the prompt.
 */
function runOnPick(prompt: Promise<string | undefined>, actionTitle: string, onAction: () => void): void {
    void prompt.then(picked => {
        if (picked === actionTitle) {
            try {
                onAction();
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
    infoWithAction: (text, actionTitle, onAction) => runOnPick(showInformationWithAction(text, actionTitle), actionTitle, onAction),
    warnWithAction: (text, actionTitle, onAction) => runOnPick(showFormatterWarningWithAction(text, actionTitle), actionTitle, onAction),
    showDocument: showFormatterDocument,
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
}

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

    constructor(services: BBjDenumServiceContext) {
        this.javaInterop = services.java.JavaInteropService;
    }

    /** Replaces where user messages go and how the edit is applied; the default uses the language client. */
    public setMessenger(messenger: DenumMessenger): void {
        this.messenger = messenger;
    }

    /**
     * Denumbers the request's open document. Resolves to the outcome and never rejects; every
     * ending, a failure included, has shown exactly one message unless the caller cancelled.
     */
    public async run(request: BBjDenumRequest, token: CancellationToken): Promise<DenumResult> {
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
            const sent = document.getText();
            if (sent.startsWith(TOKENIZED_PROGRAM_PREFIX)) {
                return this.fail('tokenized', DENUM_TOKENIZED_MESSAGE);
            }

            if (this.running.has(document.uri)) {
                return this.fail('in-progress', DENUM_IN_PROGRESS_MESSAGE);
            }
            claimed = document.uri;
            this.running.add(claimed);

            // No canonicalName: bbj-ls supersedes a pending request that carries the same name, and
            // two runs must never cancel each other.
            const outcome = await this.javaInterop.denumProgram({ text: sent, version: String(version) }, token);

            if (token.isCancellationRequested || outcome.kind === 'cancelled') {
                logger.debug('Denumber run was cancelled');
                return { status: 'failed', reason: 'cancelled' };
            }
            if (outcome.kind !== 'ok') {
                return this.presentFailure(outcome);
            }

            const live = request.current();
            if (live === undefined || live.version !== version) {
                return this.fail('stale', DENUM_STALE_MESSAGE);
            }
            if (!outcome.result.denumbered) {
                this.messenger.info(DENUM_NOTHING_TO_DO_MESSAGE);
                return { status: 'not-line-numbered', message: DENUM_NOTHING_TO_DO_MESSAGE, version };
            }

            const diagnostics = copyDiagnostics(outcome.result);
            const edits = minimalLineEdit(live, 0, sent.length, outcome.result.text);
            if (edits.length === 0) {
                this.messenger.info(DENUM_SUCCESS_MESSAGE);
                return { status: 'denumbered', message: DENUM_SUCCESS_MESSAGE, version, edits, diagnostics, applied: false };
            }
            const applied = await this.messenger.applyEdit(live.uri, version, edits, DENUMBER_EDIT_LABEL);
            if (!applied) {
                return this.fail('not-applied', DENUM_NOT_APPLIED_MESSAGE);
            }
            const message = this.presentSuccess(live.uri, diagnostics);
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
     */
    private presentSuccess(uri: string, diagnostics: DenumDiagnosticDto[]): string {
        if (diagnostics.length === 0) {
            this.messenger.info(DENUM_SUCCESS_MESSAGE);
            return DENUM_SUCCESS_MESSAGE;
        }
        this.messenger.denumDiagnostics({ uri, diagnostics });
        const text = denumSuccessMessage(DENUM_SUCCESS_MESSAGE, diagnostics);
        const reveal = () => this.messenger.showDenumDiagnostics();
        if (diagnostics.some(diagnostic => diagnostic.severity === 'ERROR')) {
            this.messenger.warnWithAction(text, SHOW_DENUM_DIAGNOSTICS_ACTION, reveal);
        } else {
            this.messenger.infoWithAction(text, SHOW_DENUM_DIAGNOSTICS_ACTION, reveal);
        }
        return text;
    }

    /** Maps an outcome that is neither a result nor a cancellation to its one Warning and reason. */
    private presentFailure(outcome: Exclude<ProgramOutcome<DenumProgramResult>, { kind: 'ok' | 'cancelled' }>): DenumResult {
        logger.debug(`Denumber run ended without a result (${outcome.kind})`);
        return this.fail('denum-failed', DENUM_FAILED_MESSAGE);
    }

    /** Shows the one Warning of a failed run and builds its result. */
    private fail(reason: DenumFailureReason, text: string): DenumResult {
        logger.debug(`Denumber run ended: ${reason}`);
        this.messenger.warn(text);
        return { status: 'failed', reason, message: text };
    }
}
