/**
 * Reconciles Langium's own diagnostics against a verdict from the BBj parser endpoint, or against
 * a save-time compile that stands in for it when the live parser is unavailable.
 *
 * A verdict is the set of diagnostics BBj's own parser reports for a document's current text.
 * Once a verdict exists for a document, this module decides which of Langium's lexer, parser and
 * line-break complaints ("syntax complaints" below) still show as errors, which are downgraded to
 * warnings, and which give way entirely to BBj's own diagnostic on the same line. Every other
 * Langium diagnostic (semantic checks, linking errors, ordinary validator warnings) passes through
 * untouched — the compiler's parser has no opinion on those.
 *
 * A second, narrower reconciliation ({@link reconcileWithFallbackCheck}) covers the save-time
 * compile fallback branch: a syntax complaint only ever gives way to the fallback's own diagnostic
 * on an overlapping line, never downgraded on its own — a fallback result reflects the file on
 * disk, not a verdict for the live editor text, so it never gets to speak for a line it stays
 * silent on.
 *
 * This module is deliberately isolated from the validator, the builder, the parser service and the
 * validations folder: it imports only from `langium`, `vscode-languageserver` and `./lsp-position.js`,
 * so every one of those call sites can import it without creating a cycle.
 */

import { DocumentValidator, LangiumDocument, TextDocument, URI, UriUtils } from 'langium';
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
 * Builds a {@link LineTextLookup} over a plain text string (a remembered validated text or the
 * live editor text, neither of which is a `TextDocument` object on its own) by wrapping it in a
 * throwaway `TextDocument` and reusing {@link documentLineText} — the same line-reading idiom for
 * a string as for a live document, so a line comparison between the two never depends on which
 * one happens to already be a `TextDocument`.
 */
export function textLineLookup(text: string): LineTextLookup {
    return documentLineText(TextDocument.create('', '', 0, text));
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
 * (`applyVerdictCarryOver`) instead of showing a syntax complaint as an Error again until the
 * next verdict arrives.
 */
export interface VerdictState {
    /** Every syntax complaint key ({@link syntaxComplaintKey}) the last verdict downgraded or
     * replaced. A complaint the last verdict has not seen is not in this set. */
    readonly seen: ReadonlySet<string>;
    /** The live editor version this verdict was computed for, and BBj's own diagnostics for it —
     * absent on a state that only carries earlier decisions forward (never computed one of its
     * own, e.g. a carry-over-only state produced by {@link applyVerdictCarryOver}'s caller). */
    readonly version?: number;
    /** BBj's own diagnostics for {@link version}'s text. Absent exactly when `version` is. */
    readonly diagnostics?: Diagnostic[];
}

/**
 * True only when `verdict` exists, was computed for a specific text version (both `version` and
 * `diagnostics` are present), and that version is exactly `version` — "current" in
 * {@link composeWithVerdict}'s sense. A verdict missing either field (a carry-over-only state), or
 * one computed for a different version, is not "for" `version` even though it may still exist.
 */
export function isVerdictForVersion(verdict: VerdictState | undefined, version: number): boolean {
    return verdict !== undefined
        && verdict.version !== undefined
        && verdict.diagnostics !== undefined
        && verdict.version === version;
}

/**
 * True when the editor line spans of `a` and `b` share at least one whole line — inclusive of the
 * boundary, so two spans that only touch at a single shared line still count. Character positions
 * are ignored on purpose: a colon-continued statement can have BBj reporting on one line of the
 * statement and Langium on another line of the same statement, and both still need to be
 * recognized as the same complaint. Used both by the live-parser verdict reconciliation below and,
 * once the checked text is confirmed to be on disk, by the save-time compile fallback's own
 * reconciliation ({@link reconcileWithFallbackCheck}) — `mergeDiagnostics` (`bbj-document-validator.ts`)
 * and its start-line equality stay in use only for a fallback check of text that is not on disk.
 */
export function lineSpansOverlap(a: Range, b: Range): boolean {
    return a.start.line <= b.end.line && b.start.line <= a.end.line;
}

/**
 * Reconciles Langium's diagnostics against one verdict's diagnostics. Pure: neither input array
 * nor any diagnostic in it is mutated, and equal inputs give equal outputs. `langiumDiagnostics`
 * must not itself contain verdict diagnostics — this function only ever produces the union of the
 * two lists, never de-duplicates within one of them.
 *
 * Every non-syntax diagnostic in `langiumDiagnostics` — semantic checks, linking errors, ordinary
 * validator warnings — passes through unchanged and is never compared against the verdict: BBj's
 * parser has no opinion on those, even on a line it also flags. Every syntax complaint (a Langium
 * lexer error, parser error or line-break complaint) is looked up in `verdictDiagnostics` by
 * {@link lineSpansOverlap}:
 * - it overlaps at least one verdict diagnostic → dropped (BBj's own diagnostic speaks for that
 *   line instead) and its key is still recorded in the returned state's `seen` set, because
 *   between verdicts a replaced complaint is carried over exactly like a downgraded one — BBj's
 *   own diagnostic disappears again on the very next keystroke, and only `seen` remembers that
 *   this complaint was already accounted for;
 * - it overlaps none → downgraded ({@link downgradeSyntaxComplaint}), keeping its message, range
 *   and `source` (never rewritten), and its key is recorded in `seen` the same way.
 *
 * The result is the surviving/downgraded Langium diagnostics, in their original relative order,
 * followed by `verdictDiagnostics`, in the verdict's own order — nothing is re-sorted.
 */
export function reconcileWithVerdict(
    langiumDiagnostics: Diagnostic[],
    verdictDiagnostics: Diagnostic[],
    lineText: LineTextLookup
): { diagnostics: Diagnostic[]; state: VerdictState } {
    const seen = new Set<string>();
    const processed: Diagnostic[] = [];
    for (const diagnostic of langiumDiagnostics) {
        if (!isSyntaxComplaint(diagnostic)) {
            processed.push(diagnostic);
            continue;
        }
        const key = syntaxComplaintKey(diagnostic.message, lineText(diagnostic.range.start.line));
        seen.add(key);
        const overlapsVerdict = verdictDiagnostics.some(verdictDiagnostic => lineSpansOverlap(diagnostic.range, verdictDiagnostic.range));
        if (!overlapsVerdict) {
            processed.push(downgradeSyntaxComplaint(diagnostic));
        }
        // else: dropped — BBj's own diagnostic on this line replaces it (still recorded in `seen`).
    }
    return {
        diagnostics: [...processed, ...verdictDiagnostics],
        state: { seen }
    };
}

/**
 * Reconciles Langium's diagnostics, validated on an older text, against a verdict computed for a
 * newer, live text — the case {@link reconcileWithVerdict} does not cover, because that function
 * assumes `langiumDiagnostics` and the verdict were both produced against the same text.
 *
 * Pure, non-mutating, same output shape as {@link reconcileWithVerdict}. Every non-syntax
 * diagnostic passes through unchanged, exactly as in `reconcileWithVerdict`. For each syntax
 * complaint, its start line's text is compared between the validated text (`validatedLineText`)
 * and the live text (`liveLineText`) — "matched" means byte-identical:
 * - its span overlaps a verdict diagnostic's span ({@link lineSpansOverlap}) → dropped (BBj's own
 *   diagnostic speaks for that line instead); its key ({@link syntaxComplaintKey}, using the
 *   *live* line text so the next keystroke's carry-over matches it exactly) joins the returned
 *   state's `seen` set only when the line also matched — an unmatched line's complaint was never
 *   actually re-confirmed by anything, so remembering it as "seen" would let a real edit on that
 *   line go unflagged later;
 * - it does not overlap and the line matched → downgraded ({@link downgradeSyntaxComplaint}),
 *   keeping its message, range and `source`, and its key joins `seen`;
 * - it does not overlap and the line did not match (the line was edited since Langium validated
 *   it) → kept unchanged, as an Error, with no key recorded — trusting a stale complaint's
 *   position on a line whose text has since changed would risk downgrading or dropping a still-real
 *   error.
 *
 * The result is the surviving/downgraded/unchanged Langium diagnostics, in their original relative
 * order, followed by `verdictDiagnostics`, in the verdict's own order.
 */
export function reconcileEarlyVerdict(
    langiumDiagnostics: Diagnostic[],
    verdictDiagnostics: Diagnostic[],
    validatedLineText: LineTextLookup,
    liveLineText: LineTextLookup
): { diagnostics: Diagnostic[]; state: VerdictState } {
    const seen = new Set<string>();
    const processed: Diagnostic[] = [];
    for (const diagnostic of langiumDiagnostics) {
        if (!isSyntaxComplaint(diagnostic)) {
            processed.push(diagnostic);
            continue;
        }
        const line = diagnostic.range.start.line;
        const matched = validatedLineText(line) === liveLineText(line);
        const overlapsVerdict = verdictDiagnostics.some(verdictDiagnostic => lineSpansOverlap(diagnostic.range, verdictDiagnostic.range));
        if (overlapsVerdict) {
            if (matched) {
                seen.add(syntaxComplaintKey(diagnostic.message, liveLineText(line)));
            }
            // dropped either way — BBj's own diagnostic on this line replaces it.
        } else if (matched) {
            seen.add(syntaxComplaintKey(diagnostic.message, liveLineText(line)));
            processed.push(downgradeSyntaxComplaint(diagnostic));
        } else {
            processed.push(diagnostic);
        }
    }
    return {
        diagnostics: [...processed, ...verdictDiagnostics],
        state: { seen }
    };
}

/**
 * Reconciles Langium's diagnostics against a save-time compile that stands in for the live parser
 * — the fallback branch's own, narrower reconciliation, used only once the caller has already
 * confirmed the checked text is the text the compile actually ran against (whatever it read from
 * disk, or the last saved version). Pure, non-mutating, same output shape as
 * {@link reconcileWithVerdict}, but never downgrades: a fallback result is a check of the file on
 * disk, not a verdict for the live editor text, so unlike a verdict it never gets to speak for a
 * line it stays silent on — every complaint that does not give way to the fallback's own
 * diagnostic is kept exactly as it was, at its original severity, never turned into a warning.
 *
 * Every non-syntax diagnostic in `langiumDiagnostics` passes through unchanged and is never
 * compared against `cplDiagnostics`, exactly as in `reconcileWithVerdict`. For each syntax
 * complaint, its start line's text is compared between `validatedLineText` (the text Langium
 * validated it against) and `checkedLineText` (the text the fallback check actually covered) —
 * "matched" means byte-identical, mirroring {@link reconcileEarlyVerdict}'s own guard against a
 * stale line number:
 * - matched, and its span overlaps a fallback diagnostic's span ({@link lineSpansOverlap}) →
 *   dropped (the fallback's own diagnostic speaks for that line instead); its key
 *   ({@link syntaxComplaintKey}, using `checkedLineText` so a later carry-over pass matches it
 *   exactly) joins the returned `seen` set;
 * - every other case (unmatched, or matched with no overlap) → kept exactly as it was, with no key
 *   recorded — trusting a stale complaint's position on a line the fallback check never actually
 *   covered, or handing it a downgrade the fallback result never earned, would risk hiding or
 *   misrepresenting a still-real error.
 *
 * The result is the surviving Langium diagnostics, in their original relative order, followed by
 * `cplDiagnostics`, in their own order — nothing is re-sorted, and `cplDiagnostics` keep their own
 * message and source untouched.
 */
export function reconcileWithFallbackCheck(
    langiumDiagnostics: Diagnostic[],
    cplDiagnostics: Diagnostic[],
    validatedLineText: LineTextLookup,
    checkedLineText: LineTextLookup
): { diagnostics: Diagnostic[]; seen: ReadonlySet<string> } {
    const seen = new Set<string>();
    const processed: Diagnostic[] = [];
    for (const diagnostic of langiumDiagnostics) {
        if (!isSyntaxComplaint(diagnostic)) {
            processed.push(diagnostic);
            continue;
        }
        const line = diagnostic.range.start.line;
        const matched = validatedLineText(line) === checkedLineText(line);
        const overlapsCheck = matched
            && cplDiagnostics.some(cplDiagnostic => lineSpansOverlap(diagnostic.range, cplDiagnostic.range));
        if (overlapsCheck) {
            seen.add(syntaxComplaintKey(diagnostic.message, checkedLineText(line)));
            // dropped — the fallback's own diagnostic on this line replaces it.
        } else {
            processed.push(diagnostic);
        }
    }
    return {
        diagnostics: [...processed, ...cplDiagnostics],
        seen
    };
}

/**
 * Re-applies the last verdict's decisions to a freshly produced Langium diagnostics list — the
 * per-keystroke carry-over between two verdicts. Each keystroke re-validates immediately, but the
 * next verdict only arrives after the debounce settles; without this, a complaint the last verdict
 * downgraded or replaced would flash back to an Error on every keystroke until then.
 *
 * Pure and non-mutating. A syntax complaint that is not already downgraded and whose
 * {@link syntaxComplaintKey} (its message and its line's current text) is in `state.seen` is
 * replaced by its downgraded copy — matched by message and line text rather than line number, so
 * an edit that only shifts the complaint's line still matches, while an edit to the line's own
 * text does not. Every other diagnostic — already-downgraded complaints, non-syntax diagnostics,
 * and any complaint not in `seen` — passes through unchanged.
 */
export function applyVerdictCarryOver(
    langiumDiagnostics: Diagnostic[],
    state: VerdictState,
    lineText: LineTextLookup
): Diagnostic[] {
    return langiumDiagnostics.map(diagnostic => {
        if (!isSyntaxComplaint(diagnostic) || isDowngradedSyntaxWarning(diagnostic)) {
            return diagnostic;
        }
        const key = syntaxComplaintKey(diagnostic.message, lineText(diagnostic.range.start.line));
        return state.seen.has(key) ? downgradeSyntaxComplaint(diagnostic) : diagnostic;
    });
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
 * A remembered Langium diagnostics list together with the text it was validated against, when
 * known. `validatedText` is the CST root's full text — a reference to a string the parse result
 * already holds, never a copy — so remembering it costs nothing beyond the reference itself.
 * `validatedText` is absent exactly when the caller did not supply one; {@link composeWithVerdict}
 * then treats that as "assume it is the live text" (an open document's own `textDocument` is
 * Langium's live, in-place-updated object, so its version can already be ahead of what was parsed
 * by the time validation finishes — comparing text rather than a version number sidesteps that).
 */
export interface LangiumDiagnosticsSnapshot {
    readonly diagnostics: Diagnostic[];
    readonly validatedText?: string;
}

/**
 * The Langium diagnostics list as it stood right after Langium's own validation, before the
 * diagnostic hierarchy (Rule 0-3) ran and possibly hid some of them — remembered per document over
 * a `WeakMap` so it is freed together with the `LangiumDocument` object itself. A `LangiumDocument`
 * survives editor close as long as its file stays in the workspace, so this is not the place to
 * key verdict state that must forget on close; that state is the uri-keyed map above instead.
 */
const rememberedDiagnosticsByDocument = new WeakMap<LangiumDocument, LangiumDiagnosticsSnapshot>();

/**
 * Remembers a document's pre-hierarchy Langium diagnostics for later reconciliation, together with
 * the text they were validated against. `validatedText` is optional — every existing caller that
 * remembers a list without it keeps compiling and keeps its original, byte-for-byte meaning
 * (`recallLangiumSnapshot` reads that state's `validatedText` back as `undefined`).
 */
export function rememberLangiumDiagnostics(document: LangiumDocument, diagnostics: Diagnostic[], validatedText?: string): void {
    rememberedDiagnosticsByDocument.set(document, { diagnostics, validatedText });
}

/** Recalls a document's pre-hierarchy Langium diagnostics, or `undefined` if none were remembered. */
export function recallLangiumDiagnostics(document: LangiumDocument): Diagnostic[] | undefined {
    return rememberedDiagnosticsByDocument.get(document)?.diagnostics;
}

/** Recalls a document's whole remembered snapshot (diagnostics plus validated text), or
 * `undefined` if none were remembered. */
export function recallLangiumSnapshot(document: LangiumDocument): LangiumDiagnosticsSnapshot | undefined {
    return rememberedDiagnosticsByDocument.get(document);
}

/**
 * The inputs {@link composeWithVerdict} derives one published diagnostics list from: Langium's
 * latest pre-hierarchy list, the text it was validated against (if remembered), the live text and
 * version, and the stored verdict (if any). Every field the composition needs, and nothing else —
 * the caller applies the diagnostic hierarchy (Rule 0-3) to the result exactly once, since that
 * logic lives in the validator module this module must not import.
 */
export interface VerdictComposition {
    readonly langiumDiagnostics: Diagnostic[];
    /** The text `langiumDiagnostics` was validated against, or `undefined` to assume it is
     * `liveText` (see {@link LangiumDiagnosticsSnapshot}). */
    readonly validatedText?: string;
    readonly liveText: string;
    readonly liveVersion: number;
    readonly verdict?: VerdictState;
}

/**
 * Derives the one diagnostics list every writer of `document.diagnostics` publishes, from one
 * consistent snapshot: Langium's latest list, the text it was validated against, the live text
 * and version, and the stored verdict. Never appends to or strips from an earlier published list
 * — every call re-derives the whole result from scratch, so a result for an older text version
 * can never overwrite one for a newer version simply by running later.
 *
 * Case selection:
 * - no `verdict` → `langiumDiagnostics` unchanged, no `seen` (nothing to reconcile against).
 * - `verdict` is {@link isVerdictForVersion} current for `liveVersion` (computed for exactly this
 *   text): `validatedText` absent or equal to `liveText` → {@link reconcileWithVerdict} (Langium
 *   and the verdict were validated against the same text); otherwise → {@link reconcileEarlyVerdict}
 *   (Langium is still validating an older text while the verdict is already for the live one).
 *   Both return `{ diagnostics, seen: state.seen }`.
 * - any other `verdict` (for an older or newer version, or missing `version`/`diagnostics` — a
 *   carry-over-only state) → {@link applyVerdictCarryOver} against `validatedText ?? liveText`,
 *   with no `seen` in the result: an older text's verdict diagnostics are never shown against
 *   newer text, only its carry-over decisions.
 *
 * Pure and idempotent: neither `langiumDiagnostics` nor any diagnostic in it or in `verdict` is
 * mutated, and calling this twice with deep-equal inputs gives deep-equal outputs.
 */
export function composeWithVerdict(input: VerdictComposition): { diagnostics: Diagnostic[]; seen?: ReadonlySet<string> } {
    const { langiumDiagnostics, validatedText, liveText, liveVersion, verdict } = input;
    if (verdict === undefined) {
        return { diagnostics: langiumDiagnostics };
    }
    if (isVerdictForVersion(verdict, liveVersion)) {
        const verdictDiagnostics = verdict.diagnostics as Diagnostic[];
        const { diagnostics, state } = validatedText === undefined || validatedText === liveText
            ? reconcileWithVerdict(langiumDiagnostics, verdictDiagnostics, textLineLookup(liveText))
            : reconcileEarlyVerdict(langiumDiagnostics, verdictDiagnostics, textLineLookup(validatedText), textLineLookup(liveText));
        return { diagnostics, seen: state.seen };
    }
    return {
        diagnostics: applyVerdictCarryOver(langiumDiagnostics, verdict, textLineLookup(validatedText ?? liveText))
    };
}
