// This class extends DefaultDocumentValidator

import { AstNode, DefaultDocumentValidator, DiagnosticData, DiagnosticInfo, DocumentValidator, getDiagnosticRange, isReference, LangiumDocument, toDiagnosticSeverity } from "langium";
import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Range } from "vscode-languageserver";
import type { LinkingErrorData } from "langium/lib/validation/document-validator.js";
import type { ValidationOptions } from "langium/lib/validation/document-validator.js";

export class BBjDocumentValidator extends DefaultDocumentValidator {

    protected override processLinkingErrors(document: LangiumDocument, diagnostics: Diagnostic[], _options: ValidationOptions): void {
        for (const reference of document.references) {
            const linkingError = reference.error;
            if (linkingError) {
                const info: DiagnosticInfo<AstNode, string> = {
                    node: linkingError.info.container,
                    range: reference.$refNode?.range,
                    property: linkingError.info.property,
                    index: linkingError.info.index,
                    data: {
                        code: DocumentValidator.LinkingError,
                        containerType: linkingError.info.container.$type,
                        property: linkingError.info.property,
                        refText: linkingError.info.reference.$refText
                    } satisfies LinkingErrorData
                };

                // For cyclic reference errors, extract source location from
                // the enhanced message and populate relatedInformation
                if (linkingError.message.includes('Cyclic reference')) {
                    const relatedInfo = this.extractCyclicReferenceRelatedInfo(linkingError.message, document);
                    if (relatedInfo.length > 0) {
                        info.relatedInformation = relatedInfo;
                    }
                }

                diagnostics.push(this.toDiagnostic('error', linkingError.message, info));
            }
        }
    }

    private extractCyclicReferenceRelatedInfo(
        message: string,
        currentDocument: LangiumDocument
    ): DiagnosticRelatedInformation[] {
        const relatedInfo: DiagnosticRelatedInformation[] = [];

        // Extract source location from "[in path:line]" in the error message
        const sourceMatch = message.match(/\[in ([^\]]+)\]/);
        if (sourceMatch) {
            const sourceRef = sourceMatch[1]; // e.g., "relative/path.bbj:42"
            const colonIdx = sourceRef.lastIndexOf(':');
            let filePath = sourceRef;
            let line = 0;

            if (colonIdx > 0) {
                const lineStr = sourceRef.substring(colonIdx + 1);
                const parsedLine = parseInt(lineStr, 10);
                if (!isNaN(parsedLine)) {
                    filePath = sourceRef.substring(0, colonIdx);
                    line = parsedLine - 1; // Convert to 0-based
                }
            }

            const range: Range = {
                start: { line: Math.max(0, line), character: 0 },
                end: { line: Math.max(0, line), character: Number.MAX_SAFE_INTEGER }
            };

            relatedInfo.push({
                location: {
                    uri: currentDocument.uri.toString(),
                    range: range
                },
                message: `Cyclic reference detected in this file`
            });
        }

        return relatedInfo;
    }

    protected override toDiagnostic<N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N, string>): Diagnostic {
        let diagnosticSeverity: DiagnosticSeverity;

        if ((info.data as DiagnosticData)?.code === DocumentValidator.LinkingError) {
            // Cyclic reference errors stay as Error severity; other linking errors downgrade to Warning
            diagnosticSeverity = message.includes('Cyclic reference')
                ? DiagnosticSeverity.Error
                : DiagnosticSeverity.Warning;
        } else {
            diagnosticSeverity = toDiagnosticSeverity(severity);
        }

        return {
            message,
            range: getDiagnosticRange(info),
            severity: diagnosticSeverity,
            code: info.code,
            codeDescription: info.codeDescription,
            tags: info.tags,
            relatedInformation: info.relatedInformation,
            data: info.data,
            source: this.getSource()
        };
    }

}
