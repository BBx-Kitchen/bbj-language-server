// This class extends DefaultDocumentValidator

import { AstNode, DefaultDocumentValidator, DiagnosticData, DiagnosticInfo, DocumentValidator, getDiagnosticRange, LangiumDocument, toDiagnosticSeverity } from "langium";
import { CancellationToken, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Range } from "vscode-languageserver";

interface LinkingErrorData extends DiagnosticData {
    containerType: string;
    property: string;
    refText: string;
}

interface ValidationOptions {
    categories?: string[];
    stopAfterLexingErrors?: boolean;
    stopAfterParsingErrors?: boolean;
    stopAfterLinkingErrors?: boolean;
}

// Diagnostic suppression configuration
let suppressCascadingEnabled = true;
let maxErrorsDisplayed = 20;

export function setSuppressCascading(enabled: boolean): void {
    suppressCascadingEnabled = enabled;
}
export function setMaxErrors(max: number): void {
    maxErrorsDisplayed = max;
}

/**
 * Diagnostic source tiers — ordered by priority.
 * Higher-priority tiers suppress lower ones.
 * Phase 53 will add BBjCPL = 3 as the highest tier.
 */
const enum DiagnosticTier {
    Warning  = 0,   // warnings/hints — suppressed when any error present
    Semantic = 1,   // semantic/validation errors (Error severity, non-parse)
    Parse    = 2,   // parser errors — also suppress linking errors
    // BBjCPL = 3,  // Phase 53: compiler errors — suppress everything below
}

function getDiagnosticTier(d: Diagnostic): DiagnosticTier {
    // Phase 53 adds: if (d.source === 'bbj-cpl') return DiagnosticTier.BBjCPL;
    if (d.data?.code === DocumentValidator.ParsingError) return DiagnosticTier.Parse;
    if (d.severity === DiagnosticSeverity.Error) return DiagnosticTier.Semantic;
    return DiagnosticTier.Warning;
}

/**
 * Apply the BBj diagnostic hierarchy rules:
 *
 * - Parse errors present → suppress ALL linking errors (identified by data.code, NOT severity)
 * - Any Error-severity diagnostic present → suppress all warnings/hints
 * - Cap parse errors at maxErrors
 *
 * IMPORTANT: Rule 1 matches linking errors by data.code (DocumentValidator.LinkingError),
 * NOT by severity. The existing toDiagnostic() override downgrades non-cyclic linking
 * errors to Warning severity, but they must still be identified and suppressed by their
 * data.code when parse errors exist. Without Rule 1, linking errors would only be
 * suppressed when ANY error exists (Rule 2), which is wrong — linking errors should
 * survive when only semantic errors (no parse errors) are present.
 */
function applyDiagnosticHierarchy(
    diagnostics: Diagnostic[],
    suppressEnabled: boolean,
    maxErrors: number
): Diagnostic[] {
    if (!suppressEnabled) return diagnostics;

    const hasParseErrors = diagnostics.some(
        d => getDiagnosticTier(d) === DiagnosticTier.Parse
    );
    const hasAnyError = diagnostics.some(
        d => d.severity === DiagnosticSeverity.Error
    );

    let result = diagnostics;

    // Rule 1: parse errors present → suppress ALL linking errors
    // Must match on data.code, not severity (linking errors are downgraded to Warning by toDiagnostic)
    if (hasParseErrors) {
        result = result.filter(
            d => d.data?.code !== DocumentValidator.LinkingError
        );
    }

    // Rule 2: any Error-severity diagnostic → suppress all warnings/hints
    if (hasAnyError) {
        result = result.filter(
            d => d.severity === DiagnosticSeverity.Error
        );
    }

    // Rule 3: cap displayed parse errors at maxErrors (semantic errors never capped)
    const parseErrors = result.filter(d => getDiagnosticTier(d) === DiagnosticTier.Parse);
    if (parseErrors.length > maxErrors) {
        const nonParseErrors = result.filter(d => getDiagnosticTier(d) !== DiagnosticTier.Parse);
        result = [...parseErrors.slice(0, maxErrors), ...nonParseErrors];
    }

    return result;
}

export class BBjDocumentValidator extends DefaultDocumentValidator {

    override async validateDocument(
        document: LangiumDocument,
        options?: ValidationOptions,
        cancelToken?: CancellationToken
    ): Promise<Diagnostic[]> {
        const diagnostics = await super.validateDocument(document, options, cancelToken);
        return applyDiagnosticHierarchy(diagnostics, suppressCascadingEnabled, maxErrorsDisplayed);
    }

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
            let line = 0;

            if (colonIdx > 0) {
                const lineStr = sourceRef.substring(colonIdx + 1);
                const parsedLine = parseInt(lineStr, 10);
                if (!isNaN(parsedLine)) {
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
