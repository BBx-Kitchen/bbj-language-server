import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GHSA-p5f3-9456-9pcx (CWE-78): this guard is what keeps the fix from silently
 * regressing. `Commands.cjs` is a CommonJS file resolved by Node's native
 * loader, so `vi.mock('vscode')` never reaches its `require` and it cannot be
 * loaded under Vitest — this source scan is the only automated check covering
 * the wiring inside it. Both this file and `extension.ts` are asserted to
 * contain zero shell-string process launches and zero `child_process` imports.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');
const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');

/** Strip `//` line comments (a reasonable approximation; good enough for a source guard). */
function stripLineComments(source: string): string {
    return source.replace(/\/\/.*$/gm, '');
}

function readStripped(filePath: string): string {
    return stripLineComments(fs.readFileSync(filePath, 'utf-8'));
}

// Matches a shell-string exec call: `exec(` not preceded by a `.`/word char (so
// `execFile(`, `execWithProgress(`, `runProcessCallback(` etc. are not matched)
// and not part of a longer identifier.
const SHELL_EXEC_CALL = /(^|[^.\w])exec\s*\(/;

describe('no-shell-command-construction guard', () => {
    test('Commands.cjs contains zero shell-string process launches', () => {
        const source = readStripped(COMMANDS_CJS);
        const matches = source.match(new RegExp(SHELL_EXEC_CALL, 'g')) ?? [];
        expect(matches).toHaveLength(0);
    });

    test('extension.ts contains zero shell-string process launches', () => {
        const source = readStripped(EXTENSION_TS);
        const matches = source.match(new RegExp(SHELL_EXEC_CALL, 'g')) ?? [];
        expect(matches).toHaveLength(0);
    });

    test('Commands.cjs does not import child_process directly', () => {
        const source = readStripped(COMMANDS_CJS);
        expect(source).not.toMatch(/require\(\s*['"]child_process['"]\s*\)/);
    });

    test('extension.ts does not import child_process directly', () => {
        const source = readStripped(EXTENSION_TS);
        expect(source).not.toMatch(/from\s+['"]child_process['"]/);
        expect(source).not.toMatch(/require\(\s*['"]child_process['"]\s*\)/);
    });
});
