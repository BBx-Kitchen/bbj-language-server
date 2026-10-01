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
    DocumentFormatResult, FormatProgramParams, FormatProgramResult, ProgramDiagnostic, ProgramSeverity
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

/** Whether `code` is a control or bidi-control character that must not survive in plain text. */
function isStrippedControl(code: number): boolean {
    return code <= 0x1F
        || code === 0x7F
        || (code >= 0x80 && code <= 0x9F)
        || (code >= 0x202A && code <= 0x202E)
        || (code >= 0x2066 && code <= 0x2069);
}

/**
 * Makes peer text safe to show on one line as plain text. Line breaks, tab and the Unicode line
 * and paragraph separators become a space; every other C0 and C1 control, DEL and the bidi
 * controls are removed. The result is then bounded to `limit` characters.
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

/**
 * Validates a `formatProgram` answer against the request that produced it. The answer must echo
 * the version that was sent. A whole-document request needs a string `text` and no `edits`. The
 * returned value is built fresh; the peer's object never leaves this function.
 */
export function validateFormatResult(request: FormatProgramParams, raw: unknown): ProgramGuardResult<FormatProgramResult> {
    const envelope = checkEnvelope(request.version, raw);
    if (!envelope.ok) {
        return envelope;
    }
    if (request.range === undefined) {
        return validateDocumentFormatResult(request, envelope.value);
    }
    return { ok: false, reason: 'range-unsupported' };
}
