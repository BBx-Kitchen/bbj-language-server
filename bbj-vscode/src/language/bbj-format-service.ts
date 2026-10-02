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
import type { FormatProgramParams, FormatSettingValue, ProgramOutcome, FormatProgramResult } from './java-interop-program-types.js';
import type { JavaInteropService } from './java-interop.js';
import { minimalLineEdit, rangeFormatEdits } from './bbj-format-edit.js';
import { FormatterSettingsHolder } from './bbj-format-settings.js';
import { logger } from './logger.js';

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
            const params: FormatProgramParams = {
                text: sent,
                version: String(version),
                canonicalName: URI.parse(request.document.uri).fsPath,
                settings: this.settings.snapshot()
            };

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
            return this.editsFor(request.document, sent, outcome);
        } catch (error) {
            logger.debug(`Format request failed unexpectedly (${error instanceof Error ? error.name : 'unknown'})`);
            return [];
        }
    }

    private editsFor(document: TextDocument, sent: string, outcome: ProgramOutcome<FormatProgramResult>): TextEdit[] {
        switch (outcome.kind) {
            case 'ok':
                return outcome.result.scope === 'document'
                    ? minimalLineEdit(document, 0, sent.length, outcome.result.text)
                    : rangeFormatEdits(document, outcome.result.edits);
            case 'cancelled':
                logger.debug('Format request was cancelled');
                return [];
            default:
                this.report(outcome);
                return [];
        }
    }

    /** One debug line naming the outcome kind and its fixed token; never peer text or document text. */
    private report(outcome: Exclude<ProgramOutcome<FormatProgramResult>, { kind: 'ok' | 'cancelled' }>): void {
        let detail: string;
        switch (outcome.kind) {
            case 'timeout': detail = outcome.origin; break;
            case 'unavailable': detail = outcome.reason; break;
            case 'failed': detail = outcome.failure; break;
            case 'malformed-result': detail = outcome.reason; break;
            default: detail = '-'; break;
        }
        logger.debug(`Format not applied: ${outcome.kind} (${detail})`);
    }
}
