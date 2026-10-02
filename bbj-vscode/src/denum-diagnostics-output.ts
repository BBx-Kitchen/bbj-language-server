/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { URI } from 'vscode-uri';

const UNKNOWN_FILE = 'an unknown file';
const SEVERITIES: readonly unknown[] = ['ERROR', 'WARNING', 'INFO'];

/**
 * Renders the payload of a `bbj/denumDiagnostics` notification as output lines: a header naming
 * the file, then one line per diagnostic, in the order the payload lists them. The payload is
 * rendered as text only; nothing in it is ever interpreted as a command, a path to open or a
 * location to jump to.
 *
 * This is a trust boundary: the payload comes from the language server process, so every field is
 * validated here and the function never throws, whatever it is given. An entry that is not
 * well-formed is skipped, a CR or LF inside a field becomes a space so one entry is always one
 * output line, and no message is cut. A block always starts with its own header, so two runs on the
 * same file never merge.
 *
 * This module imports nothing from `vscode`, so the rendering is tested without any host mock.
 */
export function formatDenumDiagnosticsBlock(params: unknown): string[] {
    const payload = isRecord(params) ? params : {};
    const uri = typeof payload.uri === 'string' ? payload.uri : undefined;
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

function renderEntry(diagnostic: unknown): string | undefined {
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
    const location = line === 0 ? 'no location' : `line ${line}`;
    const original = typeof originalLineNumber === 'string' && originalLineNumber !== ''
        ? ` (original ${flatten(originalLineNumber)})`
        : '';
    return `  ${location}${original} ${severity as string}: ${flatten(message)}`;
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

function flatten(text: string): string {
    return text.replace(/[\r\n]/g, ' ');
}
