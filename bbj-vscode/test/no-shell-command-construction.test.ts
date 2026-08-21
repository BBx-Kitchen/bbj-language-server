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

const SRC_DIR = path.join(REPO_ROOT, 'src');

/** Matches either module form of importing child_process, ESM or CJS. */
const CHILD_PROCESS_IMPORT = /from\s+['"]node:child_process['"]|from\s+['"]child_process['"]|require\(\s*['"]node:child_process['"]\s*\)|require\(\s*['"]child_process['"]\s*\)/;

function collectTsAndCjsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectTsAndCjsFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.cjs'))) {
            results.push(fullPath);
        }
    }
    return results;
}

function filesImportingChildProcess(dir: string): string[] {
    return collectTsAndCjsFiles(dir)
        .filter((filePath) => CHILD_PROCESS_IMPORT.test(readStripped(filePath)))
        .map((filePath) => path.relative(dir, filePath).split(path.sep).join('/'))
        .sort();
}

/**
 * Pins which modules under src/ may launch a process at all: a fourth importer
 * of child_process is a new execution site to review, not test data to widen
 * the expected set for. document-formatter.ts is on the list because it runs
 * `java` from PATH, not a path derived from a configured setting.
 */
describe('no-shell-command-construction guard — which modules may launch a process', () => {
    test('the set of files under src/ importing child_process is exactly the three known launchers', () => {
        const importers = filesImportingChildProcess(SRC_DIR);
        expect(importers).toEqual(['Commands/process-runner.ts', 'document-formatter.ts', 'language/bbj-cpl-service.ts']);
    });

    test('Commands/process-runner.ts still imports confineBbjExecutable', () => {
        const source = readStripped(path.join(SRC_DIR, 'Commands', 'process-runner.ts'));
        expect(source).toMatch(/import\s*\{\s*confineBbjExecutable\s*\}\s*from\s*['"]\.\.\/bbj-home-layout\.js['"]/);
    });

    test('language/bbj-cpl-service.ts still imports resolveBbjBinary', () => {
        const source = readStripped(path.join(SRC_DIR, 'language', 'bbj-cpl-service.ts'));
        expect(source).toMatch(/import\s*\{\s*resolveBbjBinary\s*\}\s*from\s*['"]\.\.\/bbj-home-layout\.js['"]/);
    });
});
