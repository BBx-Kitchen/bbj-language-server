/**
 * Turns a formatter answer into the smallest whole-line replacement, so formatting an already
 * formatted file changes nothing and a small change does not rewrite the whole buffer.
 *
 * Every edit position comes from the document (`positionAt`), so it always lies inside the
 * document and counts UTF-16 units the way the protocol expects. The comparison is a linear
 * prefix and suffix trim over lines, not a diff, so its cost stays proportional to the file size.
 */

import type { TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { ProgramTextEdit } from './java-interop-program-types.js';

const LINE_BREAK = /\r\n|\r|\n/g;

/**
 * Splits `text` into lines that each keep their own terminator, so two lines compare equal only
 * when their endings match too and a changed terminator is a real edit. The last entry is the
 * text after the final terminator, which is empty when the text ends with a line break.
 */
function splitKeepingBreaks(text: string): string[] {
    const lines: string[] = [];
    let start = 0;
    for (const match of text.matchAll(LINE_BREAK)) {
        const end = match.index + match[0].length;
        lines.push(text.slice(start, end));
        start = end;
    }
    lines.push(text.slice(start));
    return lines;
}

function lengthOf(lines: readonly string[], count: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += lines[i].length;
    }
    return total;
}

/**
 * The smallest whole-line replacement that turns `document.getText().slice(start, end)` into
 * `newText`, or `[]` when the two are equal. `start` and `end` are offsets into the document and
 * are clamped to it; use `0` and the text length for a whole-document format.
 */
export function minimalLineEdit(document: TextDocument, start: number, end: number, newText: string): TextEdit[] {
    const text = document.getText();
    const from = Math.min(Math.max(start, 0), text.length);
    const to = Math.max(Math.min(end, text.length), from);
    const oldText = text.slice(from, to);
    if (oldText === newText) {
        return [];
    }
    const oldLines = splitKeepingBreaks(oldText);
    const newLines = splitKeepingBreaks(newText);

    let prefix = 0;
    const shared = Math.min(oldLines.length, newLines.length);
    while (prefix < shared && oldLines[prefix] === newLines[prefix]) {
        prefix++;
    }
    let oldEnd = oldLines.length;
    let newEnd = newLines.length;
    while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }

    return [{
        range: {
            start: document.positionAt(from + lengthOf(oldLines, prefix)),
            end: document.positionAt(from + lengthOf(oldLines, oldEnd))
        },
        newText: newLines.slice(prefix, newEnd).join('')
    }];
}

/**
 * The edits for a range answer: each edit the formatter returned, trimmed to the lines that really
 * differ. The formatter's own range is the outer bound and is accepted as returned; it is never
 * clipped to what the user selected.
 */
export function rangeFormatEdits(document: TextDocument, edits: readonly ProgramTextEdit[]): TextEdit[] {
    const result: TextEdit[] = [];
    for (const edit of edits) {
        const start = document.offsetAt(edit.range.start);
        const end = document.offsetAt(edit.range.end);
        result.push(...minimalLineEdit(document, start, end, edit.newText));
    }
    return result;
}
