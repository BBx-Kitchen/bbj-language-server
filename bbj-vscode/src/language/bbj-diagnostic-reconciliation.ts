/**
 * Reconciles Langium's own diagnostics against a verdict from the BBj parser endpoint.
 *
 * A verdict is the set of diagnostics BBj's own parser reports for a document's current text.
 * Once a verdict exists for a document, this module decides which of Langium's lexer, parser and
 * line-break complaints ("syntax complaints" below) still show as errors, which are downgraded to
 * warnings, and which give way entirely to BBj's own diagnostic on the same line. Every other
 * Langium diagnostic (semantic checks, linking errors, ordinary validator warnings) passes through
 * untouched — the compiler's parser has no opinion on those.
 *
 * This module is deliberately isolated from the validator, the builder, the parser service and the
 * validations folder: it imports only from `langium`, `vscode-languageserver` and `./lsp-position.js`,
 * so every one of those call sites can import it without creating a cycle.
 */

import { DocumentValidator, LangiumDocument, URI, UriUtils } from 'langium';
import { Diagnostic, DiagnosticSeverity, MarkupContent, Range } from 'vscode-languageserver';
import { END_OF_LINE_CHARACTER } from './lsp-position.js';

/**
 * The `data.code` the line-break validator tags its three diagnostics with, so this module can
 * recognize them as syntax complaints without matching on their message text. The line-break
 * validator itself is tagged to use this code in a later plan of this phase; it is already
 * recognized here.
 */
export const LINE_BREAK_DIAGNOSTIC_CODE = 'bbj-line-break';

/**
 * The `data.code` a syntax complaint carries once it has been downgraded from Error to Warning by
 * a verdict. Distinct from every code `getDiagnosticTier()` (in `bbj-document-validator.ts`)
 * classifies as the Parse tier: a downgraded complaint must fall through to a severity-based tier
 * so it stops suppressing linking diagnostics and stops counting against the parse-error cap.
 */
export const DOWNGRADED_SYNTAX_CODE = 'bbj-downgraded-syntax';

/** A function that returns one document line's full text, given its zero-based line number. */
export type LineTextLookup = (line: number) => string;

/**
 * Builds a {@link LineTextLookup} over a text document, clamping to exactly one line via
 * {@link END_OF_LINE_CHARACTER} — the same idiom `parseErrorToRange` (`bbj-parser-service.ts`) and
 * the line-break validator already use to read one line's text regardless of its real length.
 */
export function documentLineText(textDocument: { getText(range?: Range): string }): LineTextLookup {
    return (line: number) => textDocument.getText({
        start: { line, character: 0 },
        end: { line, character: END_OF_LINE_CHARACTER }
    });
}

/**
 * The key a syntax complaint is remembered and matched by between verdicts: its own message text
 * (never re-worded) joined with the text of the line it sits on, so an edit that shifts a
 * complaint's line number does not break the match, while an edit to the line's own text does.
 */
export function syntaxComplaintKey(message: string | MarkupContent, lineText: string): string {
    const text = typeof message === 'string' ? message : message.value;
    return `${text}\0${lineText}`;
}

/** Reads a diagnostic's `data.code`, whatever shape `data` happens to be, without throwing. */
function diagnosticCode(diagnostic: Diagnostic): unknown {
    return (diagnostic.data as { code?: unknown } | undefined)?.code;
}

/**
 * True for a Langium lexer error, parser error or line-break complaint — the three kinds of
 * diagnostic a BBj parser verdict has an opinion about — including one already downgraded by a
 * previous verdict. False for everything else: semantic checks, linking errors and ordinary
 * validator warnings are never syntax complaints, verdict or no verdict.
 */
export function isSyntaxComplaint(diagnostic: Diagnostic): boolean {
    const code = diagnosticCode(diagnostic);
    return code === DocumentValidator.ParsingError
        || code === DocumentValidator.LexingError
        || code === LINE_BREAK_DIAGNOSTIC_CODE
        || code === DOWNGRADED_SYNTAX_CODE;
}

/** True only for a syntax complaint that has already been downgraded by a verdict. */
export function isDowngradedSyntaxWarning(diagnostic: Diagnostic): boolean {
    return diagnosticCode(diagnostic) === DOWNGRADED_SYNTAX_CODE;
}

/**
 * Returns a new diagnostic, downgraded from Error to Warning with its `data.code` replaced by
 * {@link DOWNGRADED_SYNTAX_CODE}. Message, range and `source` are copied untouched — the point of
 * a downgrade is to keep Langium's own opinion visible, not to reword or reattribute it. Both the
 * severity and the code must change together: `getDiagnosticTier()` keys the Parse tier on
 * `data.code` alone, so a severity-only downgrade would still suppress linking diagnostics and
 * still count against the parse-error cap. Downgrading an already-downgraded diagnostic returns an
 * equal diagnostic (a new object with the same fields) — the function never throws on that input
 * and never doubles up state.
 */
export function downgradeSyntaxComplaint(diagnostic: Diagnostic): Diagnostic {
    const existingData = diagnostic.data as Record<string, unknown> | undefined;
    return {
        ...diagnostic,
        severity: DiagnosticSeverity.Warning,
        data: { ...existingData, code: DOWNGRADED_SYNTAX_CODE }
    };
}

/**
 * The record of what the last verdict for a document decided, kept so the immediate,
 * per-keystroke validation pass between two verdicts can carry the same decisions forward
 * (`applyVerdictCarryOver`, added in a later plan of this phase) instead of showing a syntax
 * complaint as an Error again until the next verdict arrives.
 */
export interface VerdictState {
    /** Every syntax complaint key ({@link syntaxComplaintKey}) the last verdict downgraded or
     * replaced. A complaint the last verdict has not seen is not in this set. */
    readonly seen: ReadonlySet<string>;
}

/**
 * Reconciles Langium's diagnostics against one verdict's diagnostics. Pure: neither input array
 * nor any diagnostic in it is mutated, and equal inputs give equal outputs.
 *
 * Every non-syntax diagnostic in `langiumDiagnostics` passes through unchanged. Every syntax
 * complaint is downgraded ({@link downgradeSyntaxComplaint}) and its key recorded in the returned
 * state's `seen` set. The result is the processed Langium list, in its original relative order,
 * followed by `verdictDiagnostics`, in the verdict's own order — nothing is re-sorted.
 *
 * This first cut treats every syntax complaint the same way regardless of whether a verdict
 * diagnostic covers its line; replacing a complaint that overlaps a verdict diagnostic's line
 * (rather than downgrading it) is added by a later task in this same module.
 */
export function reconcileWithVerdict(
    langiumDiagnostics: Diagnostic[],
    verdictDiagnostics: Diagnostic[],
    lineText: LineTextLookup
): { diagnostics: Diagnostic[]; state: VerdictState } {
    const seen = new Set<string>();
    const processed = langiumDiagnostics.map(diagnostic => {
        if (!isSyntaxComplaint(diagnostic)) {
            return diagnostic;
        }
        const key = syntaxComplaintKey(diagnostic.message, lineText(diagnostic.range.start.line));
        seen.add(key);
        return downgradeSyntaxComplaint(diagnostic);
    });
    return {
        diagnostics: [...processed, ...verdictDiagnostics],
        state: { seen }
    };
}

/**
 * Per-document verdict state, module-scoped over one `Map`, in the style of this codebase's other
 * cross-service settings (`compilerTrigger`/`maxErrorsDisplayed` in `bbj-document-validator.ts`).
 * The debounce callback that produces a verdict (`bbj-document-builder.ts`) and the synchronous,
 * per-keystroke validation pass that reads it back (`bbj-document-validator.ts`) are two different
 * services with no other shared seam for per-document state.
 */
const verdictStateByUri = new Map<string, VerdictState>();

/** Reads the last verdict's state for a document, or `undefined` if none exists yet. */
export function getVerdictState(uri: URI | string): VerdictState | undefined {
    return verdictStateByUri.get(UriUtils.normalize(uri));
}

/** Records a verdict's state for a document, replacing any previous state for the same uri. */
export function setVerdictState(uri: URI | string, state: VerdictState): void {
    verdictStateByUri.set(UriUtils.normalize(uri), state);
}

/** Forgets a document's verdict state — called on document close, latch-off and connection reset. */
export function clearVerdictState(uri: URI | string): void {
    verdictStateByUri.delete(UriUtils.normalize(uri));
}

/** Forgets every document's verdict state. Mainly a test seam. */
export function clearAllVerdictStates(): void {
    verdictStateByUri.clear();
}

/**
 * The Langium diagnostics list as it stood right after Langium's own validation, before the
 * diagnostic hierarchy (Rule 0-3) ran and possibly hid some of them — remembered per document over
 * a `WeakMap` so it is freed together with the `LangiumDocument` object itself. A `LangiumDocument`
 * survives editor close as long as its file stays in the workspace, so this is not the place to
 * key verdict state that must forget on close; that state is the uri-keyed map above instead.
 */
const rememberedDiagnosticsByDocument = new WeakMap<LangiumDocument, Diagnostic[]>();

/** Remembers a document's pre-hierarchy Langium diagnostics for later reconciliation. */
export function rememberLangiumDiagnostics(document: LangiumDocument, diagnostics: Diagnostic[]): void {
    rememberedDiagnosticsByDocument.set(document, diagnostics);
}

/** Recalls a document's pre-hierarchy Langium diagnostics, or `undefined` if none were remembered. */
export function recallLangiumDiagnostics(document: LangiumDocument): Diagnostic[] | undefined {
    return rememberedDiagnosticsByDocument.get(document);
}
