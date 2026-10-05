// This class extends DefaultDocumentValidator

import { AstNode, DefaultDocumentValidator, DiagnosticData, DiagnosticInfo, DocumentValidator, getDiagnosticRange, LangiumDocument, toDiagnosticSeverity } from "langium";
import type { BBjServices } from "./bbj-module.js";
import type { TypeInferer } from "./bbj-type-inferer.js";
import { CancellationToken, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Range } from "vscode-languageserver";
import { isJavaClass, isMemberCall, isSymbolRef } from "./generated/ast.js";
import { isInstanceAccessAssignment } from "./bbj-scope.js";
import { END_OF_LINE_CHARACTER } from "./lsp-position.js";
import {
    classifyDocumentText,
    LINE_NUMBERED_DIAGNOSTIC_CODE,
    LINE_NUMBERED_DIAGNOSTIC_MESSAGE
} from "./bbj-document-kind.js";
import { isUniversalObjectReceiver, UNKNOWN_JAVA_MEMBER_CODE } from "./validations/check-unknown-java-member.js";
import {
    clearVerdictState,
    composeWithVerdict,
    getVerdictState,
    isDowngradedSyntaxWarning,
    isVerdictForVersion,
    rememberLangiumDiagnostics,
    setVerdictState
} from "./bbj-diagnostic-reconciliation.js";
import {
    clearContentChanges,
    clearKeptCheck,
    composeWithKeptCheck,
    contentChangesSince,
    getKeptCheck,
    type KeptCheckComposition
} from "./bbj-kept-check.js";

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
    /**
     * True when the unresolved reference is the member of a `MemberCall` whose receiver's
     * inferred type is a Java class. Such a Warning stays visible next to an unrelated Error
     * (see the Rule 2 exemption in {@link applyDiagnosticHierarchy}), because it names a real
     * problem on an uncertain-but-Java-typed receiver, not ordinary BBj-symbol noise.
     */
    javaMemberAccess?: boolean;
    /** The unresolved member's own name, set only alongside {@link javaMemberAccess}. */
    memberName?: string;
    /**
     * The receiver Java class's simple name (its last dot segment), set only alongside
     * {@link javaMemberAccess} and only when the receiver type is fully resolved.
     */
    ownerSimpleName?: string;
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
 * - Any Error-severity diagnostic present → suppress all warnings/hints, except a downgraded
 *   syntax warning or a flagged Java-member linking Warning (see Rule 2 below)
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
 * unchanged by this phase. The save-time compile fallback's own line-scoped dedup
 * (`reconcileWithFallbackCheck`, called from the builder's debounce callback) never runs its
 * result back through this function, so it never switches Rule 0 on either -- it only ever drops
 * or keeps individual complaints line by line, and never on its own downgrades one.
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
    // stayed silent about, and must stay visible even while an Error exists elsewhere — or a
    // flagged Java-member linking Warning, an unresolved member on an uncertain Java receiver,
    // which names a real problem the certain-receiver case already reports as an Error and must
    // not be hidden just because some unrelated Error exists elsewhere in the file.
    if (hasAnyError) {
        result = result.filter(
            d => d.severity === DiagnosticSeverity.Error || isDowngradedSyntaxWarning(d) || isJavaMemberLinkingWarning(d)
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
 *
 * Now used only for a save-time compile fallback whose checked text is not provably the text on
 * disk (the builder's `checkedTextIsOnDisk` said no) -- once it is, the builder reconciles with
 * `reconcileWithFallbackCheck` (`bbj-diagnostic-reconciliation.ts`) instead, which drops a
 * complaint outright rather than merely recoloring its source. Behaviour here is otherwise
 * unchanged from before that reconciliation existed.
 */
/**
 * Applies {@link composeWithKeptCheck} for a document validated under the `on-save` trigger, with
 * the diagnostic hierarchy run at the right point for `input.kept.kind`:
 *
 * - `'verdict'`: the hierarchy runs once, after composition -- the same order `composeWithVerdict`'s
 *   own debounced path already uses, so a kept BBj-parser error still suppresses linking errors and
 *   other warnings exactly as a fresh verdict would.
 * - `'fallback'`: the hierarchy runs first, on `input.langiumDiagnostics` alone, and never again
 *   afterwards -- a kept BBjCPL diagnostic must never reach Rule 0 (`applyDiagnosticHierarchy`'s
 *   own "BBjCPL errors present -> suppress Langium parse errors" rule) a second time, the same
 *   order today's fallback publish already uses at the builder's own call site.
 */
export function composeOnSaveDiagnostics(input: KeptCheckComposition): Diagnostic[] {
    if (input.kept.kind === 'verdict') {
        return applyDiagnosticHierarchy(composeWithKeptCheck(input), suppressCascadingEnabled, maxErrorsDisplayed);
    }
    return composeWithKeptCheck({
        ...input,
        langiumDiagnostics: applyDiagnosticHierarchy(input.langiumDiagnostics, suppressCascadingEnabled, maxErrorsDisplayed)
    });
}

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

function sameRange(a: Range, b: Range): boolean {
    return a.start.line === b.start.line && a.start.character === b.start.character
        && a.end.line === b.end.line && a.end.character === b.end.character;
}

/**
 * True only for a linking-error diagnostic flagged by {@link BBjDocumentValidator.processLinkingErrors}
 * as an unresolved member of a Java-typed receiver ({@link LinkingErrorData.javaMemberAccess}).
 * The model for this predicate is `isDowngradedSyntaxWarning`, the existing Rule 2 exemption it
 * sits beside.
 */
export function isJavaMemberLinkingWarning(d: Diagnostic): boolean {
    const data = d.data as LinkingErrorData | undefined;
    return data?.code === DocumentValidator.LinkingError && data.javaMemberAccess === true;
}

/**
 * The last dot segment of a Java class's own name, used as a diagnostic's owner label -- the
 * same idiom `java-interop.ts` already uses when it builds a class's own simple name. Returns
 * undefined for anything that is not a fully resolved JavaClass (a stub carries `error`) or
 * whose name is empty.
 */
export function javaMemberOwnerName(type: unknown): string | undefined {
    if (!isJavaClass(type) || type.error || !type.name) {
        return undefined;
    }
    return type.name.split('.').pop() || undefined;
}

/**
 * The message for a flagged Java-member linking Warning: names the member and its owner instead
 * of Langium's own "NamedElement" wording, keeping the existing `[in <file>:<line>]` suffix
 * `createLinkingError` (bbj-linker.ts) already appends to `originalMessage`, matched with the
 * same bracket pattern `extractCyclicReferenceRelatedInfo` uses one function away, anchored at
 * the end so it only ever matches that trailing suffix.
 */
export function javaMemberLinkingMessage(memberName: string, ownerSimpleName: string | undefined, originalMessage: string): string {
    const suffixMatch = originalMessage.match(/\[in [^\]]+\]$/);
    const suffix = suffixMatch ? ` ${suffixMatch[0]}` : '';
    const body = ownerSimpleName
        ? `'${memberName}' is not a known method or field of ${ownerSimpleName}`
        : `Cannot resolve '${memberName}'`;
    return `${body}${suffix}`;
}

/**
 * The unknown-Java-member check (`bbj-unknown-java-member`) targets the same member CST node
 * the linker's own diagnostic does, so an equal range identifies the same reference. Removing
 * the duplicate linking diagnostic here, before the list is remembered, keeps exactly one
 * diagnostic per unknown member on every later path (hierarchy, verdict composition, kept-check
 * composition) -- without this, a member the check already flagged as an Error would also still
 * carry its old linking Warning, showing the user two diagnostics for one problem.
 */
export function dropShadowedMemberLinkingDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
    const unknownMemberRanges = diagnostics
        .filter(d => (d.data as DiagnosticData | undefined)?.code === UNKNOWN_JAVA_MEMBER_CODE)
        .map(d => d.range);
    if (unknownMemberRanges.length === 0) {
        return diagnostics;
    }
    return diagnostics.filter(d => {
        if ((d.data as DiagnosticData | undefined)?.code !== DocumentValidator.LinkingError) {
            return true;
        }
        return !unknownMemberRanges.some(r => sameRange(r, d.range));
    });
}

export class BBjDocumentValidator extends DefaultDocumentValidator {

    /** Used by {@link processLinkingErrors} to type a MemberCall's receiver. */
    protected readonly typeInferer: TypeInferer;

    /**
     * A `LangiumDocument` survives editor close (see `bbj-diagnostic-reconciliation.ts`'s own
     * doc comment on why its verdict state is uri-keyed, not tied to the document object) --
     * without this subscription a reopened file would start out colored by a verdict from a
     * previous editor session instead of showing Langium's own errors until a fresh verdict
     * arrives.
     */
    constructor(services: BBjServices) {
        super(services);
        this.typeInferer = services.types.Inferer;
        services.shared.workspace.TextDocuments.onDidClose(event => {
            clearVerdictState(event.document.uri);
            clearKeptCheck(event.document.uri);
            clearContentChanges(event.document.uri);
        });
    }

    override async validateDocument(
        document: LangiumDocument,
        options?: ValidationOptions,
        cancelToken?: CancellationToken
    ): Promise<Diagnostic[]> {
        // A tokenized or line-numbered document is not checked at all: it cannot be parsed
        // meaningfully, and a wall of syntax errors helps nobody. Its remembered compiler state is
        // dropped so diagnostics from before the text changed cannot come back later.
        const kind = classifyDocumentText(document.textDocument.getText());
        if (kind !== 'normal') {
            clearVerdictState(document.uri);
            clearKeptCheck(document.uri);
            if (kind === 'tokenized') {
                return [];
            }
            return [{
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: END_OF_LINE_CHARACTER } },
                severity: DiagnosticSeverity.Information,
                source: this.getSource(),
                code: LINE_NUMBERED_DIAGNOSTIC_CODE,
                message: LINE_NUMBERED_DIAGNOSTIC_MESSAGE
            }];
        }
        const diagnostics = dropShadowedMemberLinkingDiagnostics(await super.validateDocument(document, options, cancelToken));
        // Remembered before the hierarchy runs: the debounce callback reconciles a verdict
        // against this pre-hierarchy list, not against the already-filtered result below, so a
        // diagnostic the hierarchy hid can still reappear once the verdict arrives. The text this
        // list was validated against is remembered alongside it -- a reference into the parse
        // result's own CST, never a copy -- so a later composition can tell whether the stored
        // verdict is already for newer text than this validation saw.
        const validatedText = document.parseResult.value.$cstNode?.root.fullText;
        rememberLangiumDiagnostics(document, diagnostics, validatedText);
        // Composition: re-derives this validation's published list from the freshly produced
        // Langium diagnostics and the stored verdict, if any -- the verdict's own diagnostics are
        // included only when the verdict is for the live text version (the early-verdict case,
        // reached whether Langium or the verdict landed first); any other verdict (older, newer,
        // or a carry-over-only state) only contributes its downgrade/replace decisions, so a
        // complaint the last verdict has already seen doesn't flash back to an Error on every
        // keystroke until the next verdict arrives. Skipped entirely (leaving `diagnostics`
        // untouched) when the compiler trigger is off or no verdict exists yet for this document
        // -- both cases must validate exactly as they did before this phase.
        // Under 'on-save', no fresh verdict ever arrives between saves, so this document's kept
        // check (if any) is composed instead of the debounced verdict machinery below -- see
        // composeOnSaveDiagnostics's own doc comment. No kept check yet (before the document's
        // first open/save check has completed) falls through to a plain hierarchy application,
        // exactly like the "no verdict" case below.
        if (getCompilerTrigger() === 'on-save') {
            const kept = getKeptCheck(document.uri);
            if (kept) {
                return composeOnSaveDiagnostics({
                    langiumDiagnostics: diagnostics,
                    validatedText,
                    liveText: document.textDocument.getText(),
                    kept,
                    changesSinceCheck: contentChangesSince(document.uri, kept.version, document.textDocument.version)
                });
            }
            return applyDiagnosticHierarchy(diagnostics, suppressCascadingEnabled, maxErrorsDisplayed);
        }

        // Under 'debounced', a kept check stored while the trigger was still 'on-save' keeps this
        // document's current compiler errors visible through the same composition -- a runtime
        // switch away from on-save must not drop them the instant validation next runs. Once this
        // file's own first debounced check stores a fresh kept check (storedUnderOnSave false),
        // this branch stops matching and every later validation falls through to the verdict path
        // below exactly as steady-state debounced always has.
        if (getCompilerTrigger() === 'debounced') {
            const kept = getKeptCheck(document.uri);
            if (kept?.storedUnderOnSave) {
                return composeOnSaveDiagnostics({
                    langiumDiagnostics: diagnostics,
                    validatedText,
                    liveText: document.textDocument.getText(),
                    kept,
                    changesSinceCheck: contentChangesSince(document.uri, kept.version, document.textDocument.version)
                });
            }
        }

        let composed = diagnostics;
        if (getCompilerTrigger() !== 'off') {
            const verdict = getVerdictState(document.uri);
            if (verdict) {
                const liveVersion = document.textDocument.version;
                const result = composeWithVerdict({
                    langiumDiagnostics: diagnostics,
                    validatedText,
                    liveText: document.textDocument.getText(),
                    liveVersion,
                    verdict
                });
                composed = result.diagnostics;
                // The stored verdict's `seen` set is refreshed only when it was actually current
                // for this validation (isVerdictForVersion) -- so the immediate next keystroke's
                // carry-over pass uses keys derived from Langium's fresh list, not from an early
                // verdict's stale one (decision 3).
                if (isVerdictForVersion(verdict, liveVersion) && result.seen) {
                    setVerdictState(document.uri, { ...verdict, seen: result.seen });
                }
            }
        }
        return applyDiagnosticHierarchy(composed, suppressCascadingEnabled, maxErrorsDisplayed);
    }

    protected override processLinkingErrors(document: LangiumDocument, diagnostics: Diagnostic[], _options: ValidationOptions): void {
        for (const reference of document.references) {
            const linkingError = reference.error;
            if (linkingError) {
                const container = linkingError.info.container;
                const instanceMemberAccess = (isSymbolRef(container) && container.instanceAccess)
                    || isInstanceAccessAssignment(container);
                const refText = linkingError.info.reference.$refText;

                // Flag an unresolved member of a Java-typed receiver. The inferer call is
                // wrapped in try/catch so a throw simply leaves the diagnostic unflagged -- it
                // must never abort validation.
                let javaMemberAccess = false;
                let memberName: string | undefined;
                let ownerSimpleName: string | undefined;
                let skipUniversalObjectReceiver = false;
                if (
                    linkingError.info.property === 'member' &&
                    isMemberCall(container) &&
                    refText.length > 0 &&
                    !linkingError.message.includes('Cyclic reference')
                ) {
                    try {
                        const receiverType = this.typeInferer.getType(container.receiver);
                        if (isJavaClass(receiverType)) {
                            if (isUniversalObjectReceiver(receiverType)) {
                                // A receiver typed exactly java.lang.Object can hold any runtime
                                // value, so no member reached through it is certain enough to be
                                // reported missing -- mirrors isUniversalObjectReceiver's own
                                // rationale in the unknown-member Error check, applied here to
                                // the linking-error diagnostic path too.
                                skipUniversalObjectReceiver = true;
                            } else {
                                javaMemberAccess = true;
                                memberName = refText;
                                ownerSimpleName = javaMemberOwnerName(receiverType);
                            }
                        }
                    } catch {
                        // Not flagged -- see comment above.
                    }
                }

                if (skipUniversalObjectReceiver) {
                    continue;
                }

                const info: DiagnosticInfo<AstNode, string> = {
                    node: container,
                    range: reference.$refNode?.range,
                    property: linkingError.info.property,
                    index: linkingError.info.index,
                    data: {
                        code: DocumentValidator.LinkingError,
                        containerType: container.$type,
                        property: linkingError.info.property,
                        refText,
                        instanceMemberAccess,
                        javaMemberAccess,
                        memberName,
                        ownerSimpleName
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

                // The flagged Java-member case gets a message naming the member and its owner
                // instead of Langium's own "NamedElement" wording; every other reference keeps
                // Langium's message unchanged.
                const message = javaMemberAccess
                    ? javaMemberLinkingMessage(refText, ownerSimpleName, linkingError.message)
                    : linkingError.message;

                diagnostics.push(this.toDiagnostic('error', message, info));
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
