// This class extends DefaultDocumentValidator

import { AstNode, DefaultDocumentValidator, DiagnosticData, DiagnosticInfo, DocumentValidator, getDiagnosticRange, LangiumDocument, toDiagnosticSeverity } from "langium";
import type { LangiumServices } from "langium/lsp";
import { CancellationToken, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Range } from "vscode-languageserver";
import { isSymbolRef } from "./generated/ast.js";
import { isInstanceAccessAssignment } from "./bbj-scope.js";
import { END_OF_LINE_CHARACTER } from "./lsp-position.js";
import {
    applyVerdictCarryOver,
    clearVerdictState,
    documentLineText,
    getVerdictState,
    isDowngradedSyntaxWarning,
    rememberLangiumDiagnostics
} from "./bbj-diagnostic-reconciliation.js";

interface LinkingErrorData extends DiagnosticData {
    containerType: string;
    property: string;
    refText: string;
    /**
     * True when the unresolved reference is an explicit instance-member access (`#member`).
     * Such a reference can only denote an instance member of the enclosing class, so a dangling
     * one is a definite bug and stays at Error severity rather than being downgraded to a warning.
     */
    instanceMemberAccess?: boolean;
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
export function getMaxErrors(): number {
    return maxErrorsDisplayed;
}

// BBjCPL trigger mode configuration
let compilerTrigger: 'debounced' | 'on-save' | 'off' = 'debounced';

export function getCompilerTrigger(): 'debounced' | 'on-save' | 'off' {
    return compilerTrigger;
}
export function setCompilerTrigger(trigger: 'debounced' | 'on-save' | 'off'): void {
    compilerTrigger = trigger;
}

/**
 * Diagnostic source tiers — ordered by priority.
 * Higher-priority tiers suppress lower ones.
 */
const enum DiagnosticTier {
    Warning  = 0,   // warnings/hints — suppressed when any error present
    Semantic = 1,   // semantic/validation errors (Error severity, non-parse)
    Parse    = 2,   // parser errors — also suppress linking errors
    BBjCPL   = 3,   // BBjCPL compiler errors — suppress Langium parse errors
}

function getDiagnosticTier(d: Diagnostic): DiagnosticTier {
    if (d.source === 'BBjCPL') return DiagnosticTier.BBjCPL;
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
 * survive when only semantic errors (no parse errors) are present. Rule 1 needs no special
 * case for a downgraded syntax warning: once a syntax complaint is downgraded, its `data.code`
 * is no longer the parsing-error code, so `getDiagnosticTier()` no longer places it in the
 * Parse tier and it can no longer make `hasParseErrors` true on its own.
 *
 * Note on Rule 0: `applyDiagnosticHierarchy` runs once, synchronously, inside
 * `validateDocument()` — before the save-time compiler's `'BBjCPL'`-sourced diagnostics exist.
 * Those are merged later, directly into `document.diagnostics`, by the document builder's
 * debounce callback (`bbj-document-builder.ts`), a separate code path that never calls this
 * function again. Rule 0 therefore only ever acts on a list that already carries a `'BBjCPL'`
 * diagnostic if one was already present from an earlier cycle; on the build that first
 * introduces one, Rule 0 does not run against it. This is confirmed, long-standing behaviour,
 * unchanged by this phase.
 */
export function applyDiagnosticHierarchy(
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
    const hasBbjcplErrors = diagnostics.some(
        d => getDiagnosticTier(d) === DiagnosticTier.BBjCPL
    );

    let result = diagnostics;

    // Rule 0: BBjCPL errors present → suppress Langium parse errors (they're redundant)
    if (hasBbjcplErrors) {
        result = result.filter(
            d => getDiagnosticTier(d) !== DiagnosticTier.Parse
        );
    }

    // Rule 1: parse errors present → suppress ALL linking errors
    // Must match on data.code, not severity (linking errors are downgraded to Warning by toDiagnostic)
    if (hasParseErrors) {
        result = result.filter(
            d => d.data?.code !== DocumentValidator.LinkingError
        );
    }

    // Rule 2: any Error-severity diagnostic → suppress all warnings/hints, except a downgraded
    // syntax warning — that is Langium's own opinion on a line the compiler-parser verdict
    // stayed silent about, and must stay visible even while an Error exists elsewhere.
    if (hasAnyError) {
        result = result.filter(
            d => d.severity === DiagnosticSeverity.Error || isDowngradedSyntaxWarning(d)
        );
    }

    // Rule 3: cap displayed parse errors at maxErrors (semantic errors never capped)
    const parseErrors = result.filter(d => getDiagnosticTier(d) === DiagnosticTier.Parse);
    if (parseErrors.length > maxErrors) {
        const nonParseErrors = result.filter(d => getDiagnosticTier(d) !== DiagnosticTier.Parse);
        result = [...parseErrors.slice(0, maxErrors), ...nonParseErrors];
    }

    // Rule 3b: downgraded syntax warnings are no longer errors, so they never count against the
    // parse-error cap above — but they still need their own cap at the same value, so a verdict
    // with many downgraded complaints can never make the visible list longer than the capped
    // error list used to be. Kept in their original relative order among themselves and among
    // every other diagnostic; only excess downgraded warnings past the cap are dropped.
    const downgradedWarningCount = result.reduce((count, d) => count + (isDowngradedSyntaxWarning(d) ? 1 : 0), 0);
    if (downgradedWarningCount > maxErrors) {
        let kept = 0;
        result = result.filter(d => {
            if (!isDowngradedSyntaxWarning(d)) return true;
            kept++;
            return kept <= maxErrors;
        });
    }

    return result;
}

/**
 * Applies {@link applyDiagnosticHierarchy} using the module's current settings
 * (`suppressCascadingEnabled`, `maxErrorsDisplayed`) — the shape the document builder's debounce
 * callback calls after reconciling a verdict, so a verdict's result goes through the same
 * suppression rules as every other build.
 */
export function applyConfiguredDiagnosticHierarchy(diagnostics: Diagnostic[]): Diagnostic[] {
    return applyDiagnosticHierarchy(diagnostics, suppressCascadingEnabled, maxErrorsDisplayed);
}

/**
 * Merge BBjCPL diagnostics into Langium diagnostics.
 *
 * Rules (from CONTEXT.md):
 * - Same line: prefer Langium message, set source to 'BBjCPL' (compiler confirmed)
 * - BBjCPL-only errors (no Langium match on same line): add with 'BBjCPL' source
 * - Langium-only diagnostics: kept unchanged
 */
export function mergeDiagnostics(langiumDiags: Diagnostic[], cplDiags: Diagnostic[]): Diagnostic[] {
    const result: Diagnostic[] = [...langiumDiags];

    for (const cplDiag of cplDiags) {
        const cplLine = cplDiag.range.start.line;
        const matchIdx = result.findIndex(
            d => d.range.start.line === cplLine && d.source !== 'BBjCPL'
        );

        if (matchIdx >= 0) {
            // Same line: keep Langium message, change source to 'BBjCPL'
            result[matchIdx] = { ...result[matchIdx], source: 'BBjCPL' };
        } else {
            // BBjCPL-only error: add directly
            result.push(cplDiag);
        }
    }

    return result;
}

export class BBjDocumentValidator extends DefaultDocumentValidator {

    /**
     * A `LangiumDocument` survives editor close (see `bbj-diagnostic-reconciliation.ts`'s own
     * doc comment on why its verdict state is uri-keyed, not tied to the document object) --
     * without this subscription a reopened file would start out colored by a verdict from a
     * previous editor session instead of showing Langium's own errors until a fresh verdict
     * arrives.
     */
    constructor(services: LangiumServices) {
        super(services);
        services.shared.workspace.TextDocuments.onDidClose(event => clearVerdictState(event.document.uri));
    }

    override async validateDocument(
        document: LangiumDocument,
        options?: ValidationOptions,
        cancelToken?: CancellationToken
    ): Promise<Diagnostic[]> {
        const diagnostics = await super.validateDocument(document, options, cancelToken);
        // Remembered before the hierarchy runs: the debounce callback reconciles a verdict
        // against this pre-hierarchy list, not against the already-filtered result below, so a
        // diagnostic the hierarchy hid can still reappear once the verdict arrives.
        rememberLangiumDiagnostics(document, diagnostics);
        // Carry-over: re-apply the last verdict's downgrade/replace decisions to this freshly
        // produced list before the hierarchy runs, so a complaint the last verdict has already
        // seen doesn't flash back to an Error on every keystroke until the next verdict arrives.
        // Skipped entirely (leaving `diagnostics` untouched) when the compiler trigger is off or
        // no verdict exists yet for this document -- both cases must validate exactly as they
        // did before this phase.
        let carriedOver = diagnostics;
        if (getCompilerTrigger() !== 'off') {
            const state = getVerdictState(document.uri);
            if (state) {
                carriedOver = applyVerdictCarryOver(diagnostics, state, documentLineText(document.textDocument));
            }
        }
        return applyDiagnosticHierarchy(carriedOver, suppressCascadingEnabled, maxErrorsDisplayed);
    }

    protected override processLinkingErrors(document: LangiumDocument, diagnostics: Diagnostic[], _options: ValidationOptions): void {
        for (const reference of document.references) {
            const linkingError = reference.error;
            if (linkingError) {
                const container = linkingError.info.container;
                const instanceMemberAccess = (isSymbolRef(container) && container.instanceAccess)
                    || isInstanceAccessAssignment(container);
                const info: DiagnosticInfo<AstNode, string> = {
                    node: container,
                    range: reference.$refNode?.range,
                    property: linkingError.info.property,
                    index: linkingError.info.index,
                    data: {
                        code: DocumentValidator.LinkingError,
                        containerType: container.$type,
                        property: linkingError.info.property,
                        refText: linkingError.info.reference.$refText,
                        instanceMemberAccess
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
                end: { line: Math.max(0, line), character: END_OF_LINE_CHARACTER }
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
            // Cyclic references and dangling instance-member (`#member`) references stay at Error
            // severity; other linking errors downgrade to Warning.
            const linkingData = info.data as LinkingErrorData;
            diagnosticSeverity = (message.includes('Cyclic reference') || linkingData.instanceMemberAccess)
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
