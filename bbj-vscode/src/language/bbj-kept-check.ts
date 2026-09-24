/**
 * Keeps the last compiler check's diagnostics for a document visible until the next check
 * replaces them, placed on the lines they belong to while the user edits between checks.
 *
 * Under the `on-save` compiler trigger, no new check runs until the next save, so a diagnostic
 * from the last check must be re-placed on its (possibly shifted) line on every keystroke instead
 * of simply disappearing the moment the text moves on, the way `composeWithVerdict()`
 * (`bbj-diagnostic-reconciliation.ts`) already treats a `debounced` verdict. This module gives the
 * text-document store a change-recording configuration so it remembers every incremental edit
 * between two versions, then maps a kept diagnostic's range through that recorded history the same
 * way an edit itself would move it.
 *
 * Pure functions plus module-level per-document stores, in the same style as
 * `bbj-diagnostic-reconciliation.ts`'s `verdictStateByUri`. Deliberately isolated from the
 * validator and the builder: this module imports only from `langium`, `vscode-languageserver`,
 * `vscode-languageserver-textdocument` and `./bbj-diagnostic-reconciliation.js`, so both of those
 * services can import it without creating a cycle.
 */

import { URI, UriUtils } from 'langium';
import { Diagnostic, Range, TextDocumentContentChangeEvent, TextDocumentsConfiguration } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    downgradeSyntaxComplaint,
    isDowngradedSyntaxWarning,
    isSyntaxComplaint,
    lineSpansOverlap,
    syntaxComplaintKey,
    textLineLookup
} from './bbj-diagnostic-reconciliation.js';

/**
 * One content change with a range -- the shape every recorded change has, whether it arrived from
 * the client as an incremental edit or was derived from a whole-document change by
 * {@link wholeDocumentChangeAsRange}. Never the whole-document variant of
 * `TextDocumentContentChangeEvent` (a bare `{ text }` with no `range`) -- every change this module
 * stores or maps through has already been converted to a range.
 */
export interface RangedContentChange {
    readonly range: Range;
    readonly text: string;
}

/** One `update()` call's worth of recorded changes for a document, between two text-document
 * versions -- `fromVersion` is the version before the update, `toVersion` the version after. */
export interface ContentChangeBatch {
    readonly fromVersion: number;
    readonly toVersion: number;
    readonly changes: readonly RangedContentChange[];
}

/** Counts the line breaks (`\n`) in `text` -- the number of new lines a change's own replacement
 * text introduces, used by {@link mapLineThroughChange} to compute how much a later line shifts. */
function countLineBreaks(text: string): number {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10 /* \n */) count++;
    }
    return count;
}

/**
 * Maps `line` (a zero-based line number from before `change` was applied) through one ranged
 * content change, to where that same line now sits, or `undefined` when the change deleted it.
 * `change.range` missing (a whole-document change event that was never converted to a range)
 * always returns `undefined` -- every caller in this module only ever passes a change that has
 * already gone through {@link wholeDocumentChangeAsRange}.
 *
 * With `start` (`sl`, `sc`) and `end` (`el`, `ec`) the change's range, and `n` the number of line
 * breaks in `change.text`:
 * - `line < sl` (before the change) -- stays `line`.
 * - `line > el` (after the change) -- moves by `n - (el - sl)`.
 * - `line === el`, `ec === 0`, and the change either spans multiple lines (`el > sl`) or starts at
 *   column 0 (`sc === 0`) -- the whole line survives untouched and moves by the same `n - (el - sl)`
 *   (this also covers pressing Enter at column 0 of `line` itself, where `sl === el === line`).
 * - `line === sl` otherwise (edited in place, split, or joined onto) -- stays `sl`, except a
 *   multi-line change starting at column 0 of `sl` (`el > sl && sc === 0`) removes the whole line,
 *   returning `undefined`.
 * - every other line inside the span, and `line === el` when the change ends past column 0 of a
 *   multi-line span -- the line was deleted, returns `undefined`.
 */
export function mapLineThroughChange(line: number, change: { range?: Range; text: string }): number | undefined {
    if (!change.range) return undefined;
    const { start, end } = change.range;
    const sl = start.line;
    const sc = start.character;
    const el = end.line;
    const ec = end.character;
    const delta = countLineBreaks(change.text) - (el - sl);

    if (line < sl) return line;
    if (line > el) return line + delta;
    if (line === el && ec === 0 && (el > sl || sc === 0)) {
        return line + delta;
    }
    if (line === sl) {
        if (el > sl && sc === 0) return undefined;
        return sl;
    }
    return undefined;
}

/** Folds `line` through every change of every batch in order, stopping (returning `undefined`) the
 * moment any change drops it. Pure -- calling this twice with the same `line` and `batches` gives
 * the same result, and neither is mutated. */
export function mapLineThroughBatches(line: number, batches: readonly ContentChangeBatch[]): number | undefined {
    let current: number | undefined = line;
    for (const batch of batches) {
        for (const change of batch.changes) {
            if (current === undefined) return undefined;
            current = mapLineThroughChange(current, change);
        }
    }
    return current;
}

/**
 * Maps a whole `Range` through `batches`: the start line is mapped with
 * {@link mapLineThroughBatches} (`undefined` when the start line itself was dropped -- the whole
 * range is then considered dropped, and this returns `undefined`); the end line is mapped the same
 * way, falling back to the mapped start line when it was dropped or would otherwise land before the
 * new start line. Characters are carried over unchanged -- only line numbers move.
 */
export function mapRangeThroughBatches(range: Range, batches: readonly ContentChangeBatch[]): Range | undefined {
    const newStartLine = mapLineThroughBatches(range.start.line, batches);
    if (newStartLine === undefined) return undefined;
    const mappedEndLine = mapLineThroughBatches(range.end.line, batches);
    const newEndLine = mappedEndLine === undefined || mappedEndLine < newStartLine ? newStartLine : mappedEndLine;
    return {
        start: { line: newStartLine, character: range.start.character },
        end: { line: newEndLine, character: range.end.character }
    };
}

/** Splits `text` into lines, each entry keeping its own trailing `\n` (the last entry has none,
 * possibly empty) -- so two split arrays can be compared line-by-line including their line
 * terminators, the way {@link wholeDocumentChangeAsRange} needs to find the identical leading and
 * trailing lines. */
function splitLinesKeepingBreaks(text: string): string[] {
    const lines: string[] = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10 /* \n */) {
            lines.push(text.slice(start, i + 1));
            start = i + 1;
        }
    }
    lines.push(text.slice(start));
    return lines;
}

/**
 * Converts a whole-document change (only `oldText` and `newText`, no client-supplied range) into
 * one ranged change covering only the lines that actually differ -- the common leading and
 * trailing lines (compared including their line terminators) are trimmed off both ends first, so a
 * change to one line in the middle of a large document produces a small range, not a
 * whole-document replacement. Identical texts produce a zero-width, zero-line-break change (every
 * line maps to itself through it, by construction of {@link mapLineThroughChange}'s rules).
 */
export function wholeDocumentChangeAsRange(oldText: string, newText: string): RangedContentChange {
    const oldLines = splitLinesKeepingBreaks(oldText);
    const newLines = splitLinesKeepingBreaks(newText);

    let prefix = 0;
    const minLen = Math.min(oldLines.length, newLines.length);
    while (prefix < minLen && oldLines[prefix] === newLines[prefix]) {
        prefix++;
    }

    let oldEnd = oldLines.length;
    let newEnd = newLines.length;
    while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }

    return {
        range: {
            start: { line: prefix, character: 0 },
            end: { line: oldEnd, character: 0 }
        },
        text: newLines.slice(prefix, newEnd).join('')
    };
}

/** The cap on recorded change batches kept per document -- past this many `update()` calls since
 * the log was last pruned, the oldest batches are dropped first, so a document left open for a very
 * long editing session cannot grow this log without bound. A kept diagnostic whose check version
 * falls before the oldest surviving batch can no longer be mapped ({@link contentChangesSince}
 * returns `undefined` for it) and is dropped rather than guessed at. */
export const MAX_RECORDED_CHANGE_BATCHES = 2000;

/** Per-document (normalized-uri-keyed) change log, in the style of this codebase's other
 * per-document module-level stores (`verdictStateByUri` in `bbj-diagnostic-reconciliation.ts`). */
const contentChangesByUri = new Map<string, ContentChangeBatch[]>();

/** Appends one batch to `uri`'s change log, then trims the log down to
 * {@link MAX_RECORDED_CHANGE_BATCHES} entries, oldest first. */
export function recordContentChanges(
    uri: URI | string,
    fromVersion: number,
    toVersion: number,
    changes: readonly RangedContentChange[]
): void {
    const key = UriUtils.normalize(uri);
    const batches = contentChangesByUri.get(key) ?? [];
    batches.push({ fromVersion, toVersion, changes: [...changes] });
    if (batches.length > MAX_RECORDED_CHANGE_BATCHES) {
        batches.splice(0, batches.length - MAX_RECORDED_CHANGE_BATCHES);
    }
    contentChangesByUri.set(key, batches);
}

/**
 * Returns the batches chaining `uri`'s change log from `fromVersion` to `toVersion`, in order --
 * `[]` when the two versions are equal (nothing to map through), or `undefined` when the log does
 * not hold a complete, unbroken chain from `fromVersion` to `toVersion` (a gap, a version older
 * than the oldest surviving batch after pruning or the cap, or `toVersion` never reached).
 */
export function contentChangesSince(
    uri: URI | string,
    fromVersion: number,
    toVersion: number
): readonly ContentChangeBatch[] | undefined {
    if (fromVersion === toVersion) return [];
    const batches = contentChangesByUri.get(UriUtils.normalize(uri)) ?? [];
    const result: ContentChangeBatch[] = [];
    let cursor = fromVersion;
    let started = false;
    for (const batch of batches) {
        if (!started) {
            if (batch.fromVersion !== cursor) continue;
            started = true;
        } else if (batch.fromVersion !== cursor) {
            return undefined;
        }
        result.push(batch);
        cursor = batch.toVersion;
        if (cursor === toVersion) return result;
    }
    return undefined;
}

/** Drops every batch of `uri`'s change log that ends at or before `version` -- called once a check
 * has been stored for that version, since nothing before it can ever be needed to map a diagnostic
 * from that check onward. */
export function pruneContentChangesThrough(uri: URI | string, version: number): void {
    const key = UriUtils.normalize(uri);
    const batches = contentChangesByUri.get(key);
    if (!batches) return;
    const kept = batches.filter(batch => batch.toVersion > version);
    if (kept.length === 0) {
        contentChangesByUri.delete(key);
    } else {
        contentChangesByUri.set(key, kept);
    }
}

/** Forgets `uri`'s whole change log -- called on document close and whenever a recording error
 * makes the log untrustworthy. */
export function clearContentChanges(uri: URI | string): void {
    contentChangesByUri.delete(UriUtils.normalize(uri));
}

/** Forgets every document's change log. Mainly a test seam. */
export function clearAllContentChanges(): void {
    contentChangesByUri.clear();
}

/**
 * Builds a `TextDocumentsConfiguration<TextDocument>` whose `create` is plain `TextDocument.create`
 * and whose `update` records the change (or changes) it applies, before returning the same updated
 * document `TextDocument.update` would have returned on its own -- this configuration changes
 * nothing about what a document's live text or version become, only what gets remembered about how
 * it got there.
 *
 * Reads the document's version and (only when at least one change is a whole-document change, via
 * {@link TextDocumentContentChangeEvent.isFull}) its text before delegating to `TextDocument.update`,
 * then records one batch: the given ranged changes as-is, or a single change from
 * {@link wholeDocumentChangeAsRange} when any change was whole-document. Recording itself never
 * throws into the caller -- an internal error clears that uri's log instead (its kept diagnostics
 * then become unmappable and are dropped on the next composition, never misplaced); a failure in
 * `TextDocument.update` itself is not caught here and propagates exactly as it always has.
 */
export function createChangeRecordingTextDocumentsConfiguration(): TextDocumentsConfiguration<TextDocument> {
    return {
        create: TextDocument.create,
        update(document: TextDocument, changes: TextDocumentContentChangeEvent[], version: number): TextDocument {
            const fromVersion = document.version;
            const wasFullChange = changes.some(change => TextDocumentContentChangeEvent.isFull(change));
            const oldText = wasFullChange ? document.getText() : undefined;
            const updated = TextDocument.update(document, changes, version);
            try {
                const recordedChanges: readonly RangedContentChange[] = wasFullChange
                    ? [wholeDocumentChangeAsRange(oldText as string, updated.getText())]
                    : (changes as unknown as RangedContentChange[]);
                recordContentChanges(updated.uri, fromVersion, version, recordedChanges);
            } catch {
                clearContentChanges(document.uri);
            }
            return updated;
        }
    };
}

/**
 * A compiler check's diagnostics, kept so they can be re-placed on their (possibly shifted) lines
 * until the next check replaces them. `kind` distinguishes a live-parser verdict (which
 * can speak for a line by downgrading Langium's own complaint on it, per `composeWithVerdict`'s own
 * rules) from a save-time compile fallback (which never downgrades -- it is a check of the file on
 * disk, not a verdict for the live editor text). `version` is the text-document version the check
 * ran against; `seen` is the set of syntax-complaint keys ({@link syntaxComplaintKey}) the check
 * already accounted for, exactly the shape `VerdictState.seen` already has. `storedUnderOnSave` is
 * whether the compiler trigger was `'on-save'` at the moment this check was stored -- every store
 * site sets it from the trigger it reads at store time, not from whatever the trigger happens to
 * be later. A document's `validateDocument` pass consults the kept-check composition whenever the
 * trigger is `'on-save'` (regardless of this flag), and also whenever the trigger is `'debounced'`
 * and this flag is `true`: a runtime switch from `on-save` to `debounced` must keep showing a
 * file's current compiler errors until that file's own first debounced check stores a fresh kept
 * check with this flag `false`, after which steady-state debounced never consults a kept check
 * again.
 */
export interface KeptCheck {
    readonly kind: 'verdict' | 'fallback';
    readonly version: number;
    readonly diagnostics: readonly Diagnostic[];
    readonly seen: ReadonlySet<string>;
    readonly storedUnderOnSave: boolean;
}

/** Per-document (normalized-uri-keyed) kept check, in the same style as {@link contentChangesByUri}
 * and `verdictStateByUri` (`bbj-diagnostic-reconciliation.ts`). */
const keptCheckByUri = new Map<string, KeptCheck>();

/** Reads the last kept check for a document, or `undefined` if none exists yet. */
export function getKeptCheck(uri: URI | string): KeptCheck | undefined {
    return keptCheckByUri.get(UriUtils.normalize(uri));
}

/** Records a kept check for a document, replacing any previous one for the same uri. */
export function setKeptCheck(uri: URI | string, check: KeptCheck): void {
    keptCheckByUri.set(UriUtils.normalize(uri), check);
}

/** Forgets a document's kept check -- called on document close. */
export function clearKeptCheck(uri: URI | string): void {
    keptCheckByUri.delete(UriUtils.normalize(uri));
}

/** Forgets every document's kept check. Mainly a test seam. */
export function clearAllKeptChecks(): void {
    keptCheckByUri.clear();
}

/**
 * The inputs {@link composeWithKeptCheck} derives one on-save-published diagnostics list from:
 * Langium's latest pre-hierarchy list, the text it was validated against (if remembered), the live
 * text, the kept check, and the change-log batches between the kept check's own version and the
 * live version ({@link contentChangesSince}'s result for that pair, `undefined` when the log
 * cannot chain them).
 */
export interface KeptCheckComposition {
    readonly langiumDiagnostics: Diagnostic[];
    /** The text `langiumDiagnostics` was validated against, or `undefined` to assume it is
     * `liveText` (mirrors `VerdictComposition.validatedText`). */
    readonly validatedText?: string;
    readonly liveText: string;
    readonly kept: KeptCheck;
    readonly changesSinceCheck: readonly ContentChangeBatch[] | undefined;
}

/**
 * Derives the published diagnostics list for one on-save validation pass between two saves. Pure:
 * neither `langiumDiagnostics` nor any diagnostic in it or in `kept.diagnostics` is mutated, and
 * equal inputs give deep-equal outputs.
 *
 * First places every kept diagnostic at its current line via {@link mapRangeThroughBatches} against
 * `changesSinceCheck` (none placed at all when `changesSinceCheck` is `undefined`; a diagnostic
 * whose line was itself dropped is omitted, never placed on a guessed line).
 *
 * Then walks `langiumDiagnostics`: every non-syntax diagnostic, and every syntax complaint already
 * downgraded, passes through unchanged. For each remaining syntax complaint, its start line's text
 * is compared between `validatedText` (if given) and `liveText` -- unmatched (the line was edited
 * since Langium validated it) keeps it unchanged, as an Error, with no further check: a stale
 * complaint's position must never be trusted for a downgrade or drop it never earned. When matched,
 * its {@link syntaxComplaintKey} (using the live line text) is looked up in `kept.seen`: not present
 * (a complaint the check never saw, on a line typed or changed since) keeps it unchanged, as an
 * Error, beside whatever the check placed on that line; present and it overlaps a placed
 * diagnostic ({@link lineSpansOverlap}) drops it; present, no overlap, and `kept.kind` is
 * `'verdict'` downgrades it ({@link downgradeSyntaxComplaint}); present, no overlap, and
 * `kept.kind` is `'fallback'` keeps it unchanged -- a save-time compile fallback never downgrades,
 * only ever drops outright or leaves untouched (mirrors `reconcileWithFallbackCheck`'s own rule).
 *
 * The result is the surviving/downgraded/unchanged Langium diagnostics, in their original relative
 * order, followed by the placed kept diagnostics, in their own order.
 */
export function composeWithKeptCheck(input: KeptCheckComposition): Diagnostic[] {
    const { langiumDiagnostics, validatedText, liveText, kept, changesSinceCheck } = input;

    const placed: Diagnostic[] = [];
    if (changesSinceCheck !== undefined) {
        for (const diagnostic of kept.diagnostics) {
            const mappedRange = mapRangeThroughBatches(diagnostic.range, changesSinceCheck);
            if (mappedRange !== undefined) {
                placed.push({ ...diagnostic, range: mappedRange });
            }
        }
    }

    const liveLineText = textLineLookup(liveText);
    const validatedLineText = validatedText !== undefined ? textLineLookup(validatedText) : undefined;

    const processed: Diagnostic[] = [];
    for (const diagnostic of langiumDiagnostics) {
        if (!isSyntaxComplaint(diagnostic) || isDowngradedSyntaxWarning(diagnostic)) {
            processed.push(diagnostic);
            continue;
        }
        const line = diagnostic.range.start.line;
        const liveText_ = liveLineText(line);
        const matched = validatedLineText === undefined || validatedLineText(line) === liveText_;
        if (!matched) {
            processed.push(diagnostic);
            continue;
        }
        const key = syntaxComplaintKey(diagnostic.message, liveText_);
        if (!kept.seen.has(key)) {
            processed.push(diagnostic);
            continue;
        }
        const overlapsPlaced = placed.some(p => lineSpansOverlap(diagnostic.range, p.range));
        if (overlapsPlaced) {
            continue;
        }
        processed.push(kept.kind === 'verdict' ? downgradeSyntaxComplaint(diagnostic) : diagnostic);
    }

    return [...processed, ...placed];
}
