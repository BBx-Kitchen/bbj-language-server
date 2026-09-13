import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    NO_ACTIVE_BBJ_FILE_MESSAGE,
    toActiveEditorSnapshot,
    isRunnableBbjDocument,
    resolveRunTarget,
    resolveDecompileTarget,
    type ActiveEditorSnapshot
} from '../src/Commands/target-resolution.js';

/**
 * Covers the pure target-resolution module for the seven BBj run/compile/decompile
 * commands (issue #512), plus source guards over `Commands.cjs` and `extension.ts`
 * proving each command is wired to it. `Commands.cjs` is a CommonJS file resolved by
 * Node's native loader, so `vi.mock('vscode')` never reaches its `require` and it
 * cannot be loaded under Vitest — the same constraint documented in
 * `no-shell-command-construction.test.ts` and `config-path-consumers.test.ts` for this
 * exact file. These are therefore source guards over the extracted function bodies.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');
const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');

function readCommandsSource(): string {
    return fs.readFileSync(COMMANDS_CJS, 'utf-8');
}

function readExtensionSource(): string {
    return fs.readFileSync(EXTENSION_TS, 'utf-8');
}

/** Extracts the brace-balanced block starting at the first `{` found after `marker`. */
function extractBraceBlock(source: string, marker: string): string {
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) {
        throw new Error(`Marker not found: ${marker}`);
    }
    const braceStart = source.indexOf('{', markerIndex);
    let depth = 0;
    for (let i = braceStart; i < source.length; i++) {
        if (source[i] === '{') {
            depth++;
        } else if (source[i] === '}') {
            depth--;
            if (depth === 0) {
                return source.slice(braceStart, i + 1);
            }
        }
    }
    throw new Error(`Unbalanced braces for marker: ${marker}`);
}

describe('target-resolution - pure module', () => {
    test('NO_ACTIVE_BBJ_FILE_MESSAGE has the shared warning text', () => {
        expect(NO_ACTIVE_BBJ_FILE_MESSAGE).toBe('No active BBj file. Open or select a BBj file and try again.');
    });

    test('resolveRunTarget and resolveDecompileTarget return undefined with no argument and no active editor', () => {
        expect(resolveRunTarget(undefined, undefined)).toBeUndefined();
        expect(resolveDecompileTarget(undefined, undefined)).toBeUndefined();
    });

    test('an empty-string fsPath with no editor returns undefined', () => {
        expect(resolveRunTarget('', undefined)).toBeUndefined();
        expect(resolveDecompileTarget('', undefined)).toBeUndefined();
    });

    test('a passed argument wins over a different, valid BBj active editor, and is returned unchanged even for a .txt or .bbjt path', () => {
        const active: ActiveEditorSnapshot = { fileName: '/w/active.bbj', languageId: 'bbj' };
        expect(resolveRunTarget('/w/other.txt', active)).toBe('/w/other.txt');
        expect(resolveRunTarget('/w/other.bbjt', active)).toBe('/w/other.bbjt');
        expect(resolveDecompileTarget('/w/other.txt', active)).toBe('/w/other.txt');
    });

    describe('toActiveEditorSnapshot', () => {
        test('returns undefined for undefined', () => {
            expect(toActiveEditorSnapshot(undefined)).toBeUndefined();
        });

        test('returns a plain { fileName, languageId } snapshot for an editor-shaped object', () => {
            const snapshot = toActiveEditorSnapshot({ document: { fileName: '/w/a.bbj', languageId: 'bbj' } });
            expect(snapshot).toEqual({ fileName: '/w/a.bbj', languageId: 'bbj' });
        });
    });

    describe('run/compile/denumber active-editor fallback (resolveRunTarget, isRunnableBbjDocument)', () => {
        test.each([
            ['/w/a.bbj', 'bbj'],
            ['/w/a.bbx', 'bbj'],
            ['/w/a.src', 'bbj'],
            ['/w/a.bbl', 'bbj']
        ])('accepts %s with language id %s', (fileName, languageId) => {
            const active: ActiveEditorSnapshot = { fileName, languageId };
            expect(resolveRunTarget(undefined, active)).toBe(fileName);
            expect(isRunnableBbjDocument(active)).toBe(true);
        });

        test.each([
            ['/w/a.bbjt', 'bbj'],
            ['/w/settings.json', 'jsonc'],
            ['/w/a.txt', 'plaintext'],
            ['/w/config.bbx', 'bbx-config'],
            ['/w/a.bbj', 'BBJ']
        ])('rejects %s with language id %s', (fileName, languageId) => {
            const active: ActiveEditorSnapshot = { fileName, languageId };
            expect(resolveRunTarget(undefined, active)).toBeUndefined();
            expect(isRunnableBbjDocument(active)).toBe(false);
        });
    });

    describe('decompile active-editor fallback (resolveDecompileTarget)', () => {
        test('accepts a bbj document named .bbjt', () => {
            const active: ActiveEditorSnapshot = { fileName: '/w/a.bbjt', languageId: 'bbj' };
            expect(resolveDecompileTarget(undefined, active)).toBe('/w/a.bbjt');
        });

        test.each([
            ['/w/settings.json', 'jsonc'],
            ['/w/a.txt', 'plaintext'],
            ['/w/config.bbx', 'bbx-config']
        ])('rejects %s with language id %s', (fileName, languageId) => {
            const active: ActiveEditorSnapshot = { fileName, languageId };
            expect(resolveDecompileTarget(undefined, active)).toBeUndefined();
        });
    });
});

describe('target-resolution - Commands.cjs wiring (source guard)', () => {
    test('Commands.cjs imports the target-resolution module', () => {
        expect(readCommandsSource()).toMatch(/require\(\s*['"]\.\/target-resolution['"]\s*\)/);
    });

    test('runTargetOrWarn resolves via resolveRunTarget and warns with the shared message when unresolved', () => {
        const body = extractBraceBlock(readCommandsSource(), 'const runTargetOrWarn = ');
        expect(body).toMatch(/resolveRunTarget\(/);
        expect(body).toMatch(/showWarningMessage\(NO_ACTIVE_BBJ_FILE_MESSAGE\)/);
    });

    test('the compile function resolves its target via runTargetOrWarn before calling getBBjHome', () => {
        const body = extractBraceBlock(readCommandsSource(), 'compile: function');
        const resolveIndex = body.indexOf('runTargetOrWarn(params)');
        const homeIndex = body.indexOf('getBBjHome()');
        expect(resolveIndex).toBeGreaterThan(-1);
        expect(homeIndex).toBeGreaterThan(-1);
        expect(resolveIndex).toBeLessThan(homeIndex);
    });
});
