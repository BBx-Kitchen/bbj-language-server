import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LSP_MAX_UINTEGER, END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';

/**
 * Source guard for the LSP `uinteger` bound (#571): every `character:` property built
 * anywhere in the language server's sources must stay within the range a JVM client's
 * int-typed `org.eclipse.lsp4j.Position.character` can hold. Scoped to `character:`
 * properties on purpose — an unrelated future use of `Number.MAX_SAFE_INTEGER` elsewhere in
 * the language server does not trip this guard.
 */

const LANGUAGE_DIR = path.join(__dirname, '..', 'src', 'language');

/** Matches a `character:` property and captures the value up to the next comma or closing brace. */
const CHARACTER_PROPERTY = /character\s*:\s*([^,}]+)/g;

interface CharacterLiteral {
    file: string;
    line: number;
    value: string;
}

function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name === 'generated') continue;
            results.push(...collectTsFiles(path.join(dir, entry.name)));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            results.push(path.join(dir, entry.name));
        }
    }
    return results;
}

/** True when a trimmed line is entirely a comment line (not a trailing/inline comment). */
function isCommentLine(trimmed: string): boolean {
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}

function findCharacterLiterals(dir: string): CharacterLiteral[] {
    const found: CharacterLiteral[] = [];
    for (const filePath of collectTsFiles(dir)) {
        const relPath = path.relative(dir, filePath).split(path.sep).join('/');
        const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
        lines.forEach((line, index) => {
            if (isCommentLine(line.trim())) return;
            for (const match of line.matchAll(CHARACTER_PROPERTY)) {
                found.push({ file: relPath, line: index + 1, value: match[1].trim() });
            }
        });
    }
    return found;
}

describe('lsp-position bounds', () => {

    test('the uinteger maximum is 2^31 - 1', () => {
        expect(LSP_MAX_UINTEGER).toBe(2147483647);
        expect(Number.isInteger(LSP_MAX_UINTEGER)).toBe(true);
        expect(JSON.parse(JSON.stringify(LSP_MAX_UINTEGER))).toBe(2147483647);
    });

    test('the end-of-line sentinel is within the uinteger range', () => {
        expect(Number.isInteger(END_OF_LINE_CHARACTER)).toBe(true);
        expect(END_OF_LINE_CHARACTER).toBeGreaterThanOrEqual(0);
        expect(END_OF_LINE_CHARACTER).toBeLessThanOrEqual(2147483647);
    });

    test('no language-server source builds a position character beyond the uinteger maximum', () => {
        const literals = findCharacterLiterals(LANGUAGE_DIR);
        const offenders: string[] = [];

        for (const literal of literals) {
            if (/^-?\d+$/.test(literal.value)) {
                const numeric = parseInt(literal.value, 10);
                if (!Number.isInteger(numeric) || numeric > 2147483647) {
                    offenders.push(`${literal.file}:${literal.line} — character: ${literal.value}`);
                }
            } else if (literal.value === 'Number.MAX_SAFE_INTEGER') {
                offenders.push(`${literal.file}:${literal.line} — character: ${literal.value}`);
            }
            // Non-literal, non-sentinel values (type annotations, identifiers, expressions
            // such as `params.position.character`) pass untouched.
        }

        expect(offenders, `character: literal(s) exceeding the LSP uinteger maximum:\n${offenders.join('\n')}`).toEqual([]);
    });

});
