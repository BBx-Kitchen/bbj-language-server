/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { URI } from 'vscode-uri';

const UNKNOWN_FILE = 'an unknown file';
const SEVERITIES: readonly unknown[] = ['ERROR', 'WARNING', 'INFO'];

/**
 * The most entries of one list that become problems; the server bounds its list the same way, and
 * the payload crosses a process boundary. The log copy of the list is not cut by this bound. When
 * entries are left out, one last problem says how many.
 */
export const MAX_DENUM_PROBLEMS = 500;

/** One entry of the list, validated and ready to be placed as a problem on a document. */
export interface DenumProblem {
    /** Zero-based line in the document, already clamped to it. */
    line: number;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    /** Flattened message plus the parenthesised suffix. */
    message: string;
}

interface ValidEntry {
    line: number;
    originalLineNumber: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
}

/**
 * Renders the payload of a `bbj/denumDiagnostics` notification as output lines: a header naming
 * the file, then one line per diagnostic, in the order the payload lists them. The payload is
 * rendered as text only; nothing in it is ever interpreted as a command, a path to open or a
 * location to jump to.
 *
 * The same payload also feeds the problems placed on an open document (`denumProblems`). There the
 * uri only selects a document the editor already has open, and a line only places an entry inside
 * that document; it still never becomes a command, a link or a path to open.
 *
 * This is a trust boundary: the payload comes from the language server process, so every field is
 * validated here and the function never throws, whatever it is given. An entry that is not
 * well-formed is skipped, a control character or a line or paragraph separator inside a field
 * becomes a space so one entry is always one output line, and no message is cut. A block always starts with its own header, so two runs on the
 * same file never merge.
 *
 * This module imports nothing from `vscode`, so the rendering is tested without any host mock.
 */
export function formatDenumDiagnosticsBlock(params: unknown): string[] {
    const payload = isRecord(params) ? params : {};
    const uri = denumPayloadUri(params);
    const lines = [`Denumber diagnostics for ${uri === undefined ? UNKNOWN_FILE : flatten(displayPath(uri))}:`];

    const diagnostics = payload.diagnostics;
    if (!Array.isArray(diagnostics)) {
        return lines;
    }
    for (const diagnostic of diagnostics) {
        const rendered = renderEntry(diagnostic);
        if (rendered !== undefined) {
            lines.push(rendered);
        }
    }
    return lines;
}

/** The payload's uri when it is a string; otherwise undefined. Never throws. */
export function denumPayloadUri(params: unknown): string | undefined {
    return isRecord(params) && typeof params.uri === 'string' ? params.uri : undefined;
}

/**
 * The document version the payload says the list was computed for, when it is a safe integer that
 * is not negative; otherwise undefined. Never throws. A host places problems only when this equals
 * the version of the open document.
 */
export function denumPayloadVersion(params: unknown): number | undefined {
    if (!isRecord(params)) {
        return undefined;
    }
    const { version } = params;
    return typeof version === 'number' && Number.isSafeInteger(version) && version >= 0 ? version : undefined;
}

/**
 * One problem per valid entry, in payload order, at most `MAX_DENUM_PROBLEMS` of them. A located
 * entry lands on its zero-based line, clamped to the document's `lineCount`; an entry without a
 * location lands on the first line. The message is flattened and followed by the original line
 * number or the missing location in parentheses. When valid entries are left out by the bound, one
 * more information problem on the first line says how many and points at the output channel, which
 * holds the whole list. Never throws; anything that is not a list gives `[]`.
 */
export function denumProblems(params: unknown, lineCount: number): DenumProblem[] {
    const diagnostics = isRecord(params) ? params.diagnostics : undefined;
    if (!Array.isArray(diagnostics)) {
        return [];
    }
    const lastLine = Math.max(Number.isFinite(lineCount) ? Math.trunc(lineCount) : 1, 1) - 1;
    const problems: DenumProblem[] = [];
    let omitted = 0;
    for (const diagnostic of diagnostics) {
        const entry = validEntry(diagnostic);
        if (entry === undefined) {
            continue;
        }
        if (problems.length >= MAX_DENUM_PROBLEMS) {
            omitted++;
            continue;
        }
        const parts: string[] = [];
        if (entry.line === 0) {
            parts.push('no location');
        }
        if (entry.originalLineNumber !== '') {
            parts.push(`original line ${flatten(entry.originalLineNumber)}`);
        }
        problems.push({
            line: entry.line === 0 ? 0 : Math.min(entry.line - 1, lastLine),
            severity: entry.severity,
            message: parts.length === 0 ? flatten(entry.message) : `${flatten(entry.message)} (${parts.join(', ')})`
        });
    }
    if (omitted > 0) {
        problems.push({
            line: 0,
            severity: 'INFO',
            message: `${omitted} more ${omitted === 1 ? 'diagnostic' : 'diagnostics'} not shown here, see the BBj output`
        });
    }
    return problems;
}

/** The entry when every field is well-formed; otherwise undefined. A non-string or empty original number is `''`. */
function validEntry(diagnostic: unknown): ValidEntry | undefined {
    if (!isRecord(diagnostic)) {
        return undefined;
    }
    const { line, originalLineNumber, severity, message } = diagnostic;
    if (typeof line !== 'number' || !Number.isSafeInteger(line) || line < 0) {
        return undefined;
    }
    if (!SEVERITIES.includes(severity) || typeof message !== 'string') {
        return undefined;
    }
    return {
        line,
        originalLineNumber: typeof originalLineNumber === 'string' ? originalLineNumber : '',
        severity: severity as ValidEntry['severity'],
        message
    };
}

function renderEntry(diagnostic: unknown): string | undefined {
    const entry = validEntry(diagnostic);
    if (entry === undefined) {
        return undefined;
    }
    const location = entry.line === 0 ? 'no location' : `line ${entry.line}`;
    const original = entry.originalLineNumber !== ''
        ? ` (original ${flatten(entry.originalLineNumber)})`
        : '';
    return `  ${location}${original} ${entry.severity}: ${flatten(entry.message)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The file-system path of a `file` uri; any other uri, or one that does not parse, as given. */
function displayPath(uri: string): string {
    try {
        const parsed = URI.parse(uri, true);
        return parsed.scheme === 'file' ? parsed.fsPath : uri;
    } catch {
        return uri;
    }
}

/** Every control character (C0, DEL, C1) and the Unicode line and paragraph separators, one space each. */
function flatten(text: string): string {
    return text.replace(/[\p{Cc}\u2028\u2029]/gu, ' ');
}
