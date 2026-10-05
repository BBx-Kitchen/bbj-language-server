/**
 * The Langium formatting slot for BBj. Registering a formatter in the language services is what
 * makes the server advertise document and range formatting, so this class carries that capability.
 * Requests normally reach the bounded handlers in `bbj-formatting-handler.ts`; this adapter
 * answers through the same format service, with the same language gate, for any caller that
 * reaches the slot directly.
 *
 * On-type formatting is never offered.
 */
import type { LangiumDocument } from 'langium';
import type { Formatter } from 'langium/lsp';
import {
    CancellationToken, type DocumentFormattingParams, type DocumentOnTypeFormattingOptions,
    type DocumentOnTypeFormattingParams, type DocumentRangeFormattingParams, type Range, type TextEdit
} from 'vscode-languageserver';
import type { BBjServices } from './bbj-module.js';
import { BBjLanguageMetaData } from './generated/module.js';

export class BBjFormatter implements Formatter {

    constructor(protected readonly services: BBjServices) { }

    formatDocument(document: LangiumDocument, _params: DocumentFormattingParams, cancelToken?: CancellationToken): Promise<TextEdit[]> {
        return this.formatOpenText(document, undefined, cancelToken);
    }

    formatDocumentRange(document: LangiumDocument, params: DocumentRangeFormattingParams, cancelToken?: CancellationToken): Promise<TextEdit[]> {
        return this.formatOpenText(document, params.range, cancelToken);
    }

    formatDocumentOnType(_document: LangiumDocument, _params: DocumentOnTypeFormattingParams): TextEdit[] {
        return [];
    }

    get formatOnTypeOptions(): DocumentOnTypeFormattingOptions | undefined {
        return undefined;
    }

    private async formatOpenText(document: LangiumDocument, range: Range | undefined, cancelToken?: CancellationToken): Promise<TextEdit[]> {
        if (document.textDocument.languageId !== BBjLanguageMetaData.languageId) {
            return [];
        }
        // Resolved here, not in the constructor, so building this slot does not depend on the order
        // in which the services are created.
        const service = this.services.compiler.BBjFormatService;
        return service.format({
            document: document.textDocument,
            ...(range === undefined ? {} : { range }),
            current: () => this.services.shared.workspace.TextDocuments?.get(document.uri)
        }, cancelToken ?? CancellationToken.None);
    }
}
