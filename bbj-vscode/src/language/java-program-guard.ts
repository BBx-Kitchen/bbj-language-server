/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Owns every bound and check applied to a `formatProgram` or `denumProgram` answer before it
 * leaves the interop client. A peer answer is untrusted: its shape, its size, its edit
 * coordinates and its diagnostic text are all checked here against the request that was sent, and
 * a validated answer is returned as a freshly built object, never as the peer's own.
 *
 * Anything that fails a check becomes a refusal carrying one of a fixed set of reason tokens. A
 * reason never contains peer text, so it is safe to log.
 *
 * Kept free of Langium and editor imports so it is unit-testable with plain values.
 */
import type {
    DenumProgramParams, DenumProgramResult, DocumentFormatResult, FormatProgramParams, FormatProgramResult, ProgramDiagnostic, ProgramPosition,
    ProgramRange, ProgramSeverity, ProgramTextEdit, RangeFormatResult
} from './java-interop-program-types.js';
import { MAX_PEER_ERROR_LENGTH, truncateText } from './java-peer-guard.js';

/** A returned text may be at most this many times as long as the request text, plus the slack. */
export const PROGRAM_TEXT_RELATIVE_FACTOR = 4;

/** Added to the relative bound so a short request, which formatting can legitimately grow by a
 * large factor, is not refused. 64 KiB. */
export const PROGRAM_TEXT_SLACK = 65536;

/** A returned text is never accepted above this length, whatever the request length. 16 MiB. */
export const PROGRAM_TEXT_ABSOLUTE_CAP = 16777216;

/** At most this many diagnostics of one answer are kept. */
export const MAX_PROGRAM_DIAGNOSTICS = 500;

/** Each diagnostic message is truncated to this many characters. */
export const MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH = MAX_PEER_ERROR_LENGTH;

/** An original line number is a short digit string; a longer value is truncated to this length. */
export const MAX_ORIGINAL_LINE_NUMBER_LENGTH = 32;

/** The outcome of a check: the validated value, or a fixed refusal reason token. */
export type ProgramGuardResult<R> = { ok: true; value: R } | { ok: false; reason: string };

/** A plain object, as opposed to `null`, an array, or a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The longest text, in UTF-16 code units, a peer may return for a request carrying `requestText`:
 * the smaller of the relative bound and the absolute cap. The peer measures sizes in UTF-8 bytes
 * and the UTF-16 length of a string never exceeds its UTF-8 byte count, so counting code units on
 * both sides is never stricter than the bound is meant to be.
 */
export function allowedProgramTextLength(requestText: string): number {
    return Math.min(
        requestText.length * PROGRAM_TEXT_RELATIVE_FACTOR + PROGRAM_TEXT_SLACK,
        PROGRAM_TEXT_ABSOLUTE_CAP
    );
}

/** Whether `code` is a line break or tab, which becomes a space rather than disappearing. */
function isSpaceLike(code: number): boolean {
    return code === 0x0D || code === 0x0A || code === 0x09 || code === 0x85 || code === 0x2028 || code === 0x2029;
}

/**
 * Whether `code` is a control, bidi-control or invisible format character that must not survive
 * in plain text: C0 and C1 controls and DEL, the Arabic letter mark, the zero-width characters
 * and the left-to-right and right-to-left marks (U+200B to U+200F), the bidi embeddings and
 * overrides, the word joiner and the invisible operators (U+2060 to U+2064), the bidi isolates,
 * the deprecated format controls (U+206A to U+206F) and the byte order mark.
 */
function isStrippedControl(code: number): boolean {
    return code <= 0x1F
        || code === 0x7F
        || (code >= 0x80 && code <= 0x9F)
        || code === 0x061C
        || (code >= 0x200B && code <= 0x200F)
        || (code >= 0x202A && code <= 0x202E)
        || (code >= 0x2060 && code <= 0x2064)
        || (code >= 0x2066 && code <= 0x2069)
        || (code >= 0x206A && code <= 0x206F)
        || code === 0xFEFF;
}

/**
 * Makes peer text safe to show on one line as plain text. Line breaks, tab and the Unicode line
 * and paragraph separators become a space; every other C0 and C1 control, DEL, the bidi controls
 * and the invisible format characters (see {@link isStrippedControl}) are removed. The result is
 * then bounded to `limit` characters.
 */
export function sanitizePeerText(text: string, limit: number): string {
    let cleaned = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (isSpaceLike(code)) {
            cleaned += ' ';
        } else if (!isStrippedControl(code)) {
            cleaned += text[i];
        }
    }
    return truncateText(cleaned, limit);
}

/**
 * The length of every line of `text`, excluding its terminator. `\r\n`, `\n` and a lone `\r`
 * each end one line, as the peer reads them. An empty text has one empty line; a text ending in a
 * terminator ends with an empty line.
 */
export function programLineLengths(text: string): number[] {
    const lengths: number[] = [];
    let start = 0;
    let i = 0;
    while (i < text.length) {
        const code = text.charCodeAt(i);
        if (code === 0x0A) {
            lengths.push(i - start);
            start = i + 1;
        } else if (code === 0x0D) {
            lengths.push(i - start);
            if (text.charCodeAt(i + 1) === 0x0A) {
                i++;
            }
            start = i + 1;
        }
        i++;
    }
    lengths.push(text.length - start);
    return lengths;
}

function isSeverity(value: unknown): value is ProgramSeverity {
    return value === 'ERROR' || value === 'WARNING' || value === 'INFO';
}

/**
 * Validates and sanitises the `diagnostics` of an answer. Absent or `null` means none. A value
 * that is not an array refuses the answer; an entry that is malformed, has an unknown severity or
 * a line outside `0..lineCount` is dropped on its own without failing the answer. Line `0` means
 * "no location" and is kept as `0`. At most {@link MAX_PROGRAM_DIAGNOSTICS} entries are kept and
 * each is rebuilt field by field with plain, bounded text.
 */
export function sanitizeProgramDiagnostics(raw: unknown, lineCount: number): ProgramGuardResult<ProgramDiagnostic[]> {
    if (raw === undefined || raw === null) {
        return { ok: true, value: [] };
    }
    if (!Array.isArray(raw)) {
        return { ok: false, reason: 'diagnostics-not-array' };
    }
    const kept: ProgramDiagnostic[] = [];
    for (const entry of raw) {
        if (kept.length >= MAX_PROGRAM_DIAGNOSTICS) {
            break;
        }
        if (!isPlainObject(entry)) {
            continue;
        }
        const { line, severity, message, originalLineNumber } = entry;
        if (typeof line !== 'number' || !Number.isSafeInteger(line) || line < 0 || line > lineCount) {
            continue;
        }
        if (!isSeverity(severity) || typeof message !== 'string') {
            continue;
        }
        kept.push({
            line,
            originalLineNumber: typeof originalLineNumber === 'string'
                ? sanitizePeerText(originalLineNumber, MAX_ORIGINAL_LINE_NUMBER_LENGTH)
                : '',
            severity,
            message: sanitizePeerText(message, MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH)
        });
    }
    return { ok: true, value: kept };
}

/** The answer's own object, once it is known to be an object carrying the version that was sent. */
function checkEnvelope(requestVersion: string, raw: unknown): ProgramGuardResult<Record<string, unknown>> {
    if (!isPlainObject(raw)) {
        return { ok: false, reason: 'not-an-object' };
    }
    if (raw.version !== requestVersion) {
        return { ok: false, reason: 'version-mismatch' };
    }
    return { ok: true, value: raw };
}

/** `denumbered` as a boolean; absent or `null` reads as `false`. */
function readOptionalDenumbered(raw: Record<string, unknown>): ProgramGuardResult<boolean> {
    const value = raw.denumbered;
    if (value === undefined || value === null) {
        return { ok: true, value: false };
    }
    if (typeof value !== 'boolean') {
        return { ok: false, reason: 'denumbered-not-boolean' };
    }
    return { ok: true, value };
}

function validateDocumentFormatResult(
    request: FormatProgramParams, raw: Record<string, unknown>
): ProgramGuardResult<DocumentFormatResult> {
    if (raw.edits !== undefined && raw.edits !== null) {
        return { ok: false, reason: 'edits-on-document-request' };
    }
    const text = raw.text;
    if (typeof text !== 'string') {
        return { ok: false, reason: 'text-not-string' };
    }
    if (text.length > allowedProgramTextLength(request.text)) {
        return { ok: false, reason: 'text-too-large' };
    }
    const denumbered = readOptionalDenumbered(raw);
    if (!denumbered.ok) {
        return denumbered;
    }
    const diagnostics = sanitizeProgramDiagnostics(raw.diagnostics, programLineLengths(text).length);
    if (!diagnostics.ok) {
        return diagnostics;
    }
    return {
        ok: true,
        value: {
            scope: 'document',
            text,
            diagnostics: diagnostics.value,
            denumbered: denumbered.value,
            version: request.version
        }
    };
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function comparePositions(a: ProgramPosition, b: ProgramPosition): number {
    return a.line !== b.line ? a.line - b.line : a.character - b.character;
}

/** Whether `position` lies inside a document whose lines have the given lengths. */
function isInsideDocument(position: ProgramPosition, lineLengths: number[]): boolean {
    return position.line < lineLengths.length && position.character <= lineLengths[position.line];
}

/**
 * The inclusive span of lines a range covers. A range that ends at character 0 of a later line
 * does not cover that line, as the peer reads it.
 */
function coveredLines(range: ProgramRange): { first: number; last: number } {
    const endsBeforeLine = range.end.character === 0 && range.end.line > range.start.line;
    return { first: range.start.line, last: endsBeforeLine ? range.end.line - 1 : range.end.line };
}

/** Whether the edit's lines touch the requested lines. The peer widens a request to whole logical
 * statements, so the edit may be larger than the request; containment is never required. */
function overlapsRequestedLines(requested: ProgramRange, edited: ProgramRange): boolean {
    const wanted = coveredLines(requested);
    const changed = coveredLines(edited);
    return changed.first <= wanted.last && wanted.first <= changed.last;
}

/** Builds a fresh position from a raw one whose line and character are non-negative integers. */
function readPosition(raw: Record<string, unknown>): ProgramPosition | undefined {
    const { line, character } = raw;
    if (!isNonNegativeInteger(line) || !isNonNegativeInteger(character)) {
        return undefined;
    }
    return { line, character };
}

/** Validates the single edit of a range answer against the document that was sent. */
function validateRangeEdit(request: FormatProgramParams, requested: ProgramRange, rawEdit: unknown): ProgramGuardResult<ProgramTextEdit> {
    if (!isPlainObject(rawEdit) || !isPlainObject(rawEdit.range)) {
        return { ok: false, reason: 'edit-malformed' };
    }
    const { start: rawStart, end: rawEnd } = rawEdit.range;
    if (!isPlainObject(rawStart) || !isPlainObject(rawEnd)) {
        return { ok: false, reason: 'edit-malformed' };
    }
    const start = readPosition(rawStart);
    const end = readPosition(rawEnd);
    if (start === undefined || end === undefined) {
        return { ok: false, reason: 'edit-position-invalid' };
    }
    if (comparePositions(start, end) > 0) {
        return { ok: false, reason: 'edit-inverted' };
    }
    const lineLengths = programLineLengths(request.text);
    if (!isInsideDocument(start, lineLengths) || !isInsideDocument(end, lineLengths)) {
        return { ok: false, reason: 'edit-outside-document' };
    }
    const newText = rawEdit.newText;
    if (typeof newText !== 'string') {
        return { ok: false, reason: 'new-text-not-string' };
    }
    if (newText.length > allowedProgramTextLength(request.text)) {
        return { ok: false, reason: 'new-text-too-large' };
    }
    const range: ProgramRange = { start, end };
    if (!overlapsRequestedLines(requested, range)) {
        return { ok: false, reason: 'edit-not-overlapping' };
    }
    return { ok: true, value: { range, newText } };
}

function validateRangeFormatResult(
    request: FormatProgramParams, requested: ProgramRange, raw: Record<string, unknown>
): ProgramGuardResult<RangeFormatResult> {
    if (raw.text !== undefined && raw.text !== null) {
        return { ok: false, reason: 'text-on-range-request' };
    }
    const rawEdits = raw.edits;
    if (!Array.isArray(rawEdits)) {
        return { ok: false, reason: 'edits-not-array' };
    }
    if (rawEdits.length > 1) {
        return { ok: false, reason: 'too-many-edits' };
    }
    const edits: ProgramTextEdit[] = [];
    for (const rawEdit of rawEdits) {
        const checked = validateRangeEdit(request, requested, rawEdit);
        if (!checked.ok) {
            return checked;
        }
        edits.push(checked.value);
    }
    const denumbered = readOptionalDenumbered(raw);
    if (!denumbered.ok) {
        return denumbered;
    }
    const diagnostics = sanitizeProgramDiagnostics(raw.diagnostics, programLineLengths(request.text).length);
    if (!diagnostics.ok) {
        return diagnostics;
    }
    return {
        ok: true,
        value: {
            scope: 'range',
            edits,
            diagnostics: diagnostics.value,
            denumbered: denumbered.value,
            version: request.version
        }
    };
}

/**
 * Validates a `denumProgram` answer against the request that produced it. The answer must echo
 * the version that was sent, carry a string `text` within the allowed length and a boolean
 * `denumbered` (a DENUM answer always states it, so an absent flag is refused). The returned value
 * is built fresh; the peer's object never leaves this function.
 */
export function validateDenumResult(request: DenumProgramParams, raw: unknown): ProgramGuardResult<DenumProgramResult> {
    const envelope = checkEnvelope(request.version, raw);
    if (!envelope.ok) {
        return envelope;
    }
    const { text, denumbered } = envelope.value;
    if (typeof text !== 'string') {
        return { ok: false, reason: 'text-not-string' };
    }
    if (text.length > allowedProgramTextLength(request.text)) {
        return { ok: false, reason: 'text-too-large' };
    }
    if (typeof denumbered !== 'boolean') {
        return { ok: false, reason: 'denumbered-not-boolean' };
    }
    const diagnostics = sanitizeProgramDiagnostics(envelope.value.diagnostics, programLineLengths(text).length);
    if (!diagnostics.ok) {
        return diagnostics;
    }
    return {
        ok: true,
        value: { text, diagnostics: diagnostics.value, denumbered, version: request.version }
    };
}

/**
 * Validates a `formatProgram` answer against the request that produced it. The answer must echo
 * the version that was sent. A whole-document request needs a string `text` and no `edits`; a
 * range request needs no `text` and an `edits` array of at most one edit that lies inside the
 * document that was sent and overlaps the requested lines. The returned value is built fresh; the
 * peer's object never leaves this function.
 */
export function validateFormatResult(request: FormatProgramParams, raw: unknown): ProgramGuardResult<FormatProgramResult> {
    const envelope = checkEnvelope(request.version, raw);
    if (!envelope.ok) {
        return envelope;
    }
    if (request.range === undefined) {
        return validateDocumentFormatResult(request, envelope.value);
    }
    return validateRangeFormatResult(request, request.range, envelope.value);
}
