import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GHSA-p5f3-9456-9pcx (CWE-78): this guard is what keeps the fix from silently
 * regressing. `Commands.cjs`'s command bodies now run for real in
 * commands-cjs-execution.test.ts, through commands-cjs-harness.ts's
 * `node:module` loader (issue #565); this source scan stays as defence in
 * depth, covering the wiring even if a future call site is never exercised by
 * an execution test. Both this file and `extension.ts` are asserted to
 * contain zero shell-string process launches and zero `child_process` imports.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');
const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');
const EM_AUTH_TS = path.join(REPO_ROOT, 'src/em-auth.ts');
const EM_SCRIPT_RUNNER_TS = path.join(REPO_ROOT, 'src/em-script-runner.ts');
const OPEN_FILE_PROMPTS_TS = path.join(REPO_ROOT, 'src/open-file-prompts.ts');
const DIAGNOSTIC_STATUS_BARS_TS = path.join(REPO_ROOT, 'src/diagnostic-status-bars.ts');
// extension.ts plus the host modules split out of activate(): the EM
// login/validation code this guard used to scan inline in extension.ts now
// lives here too.
const HOST_TS_FILES = [EXTENSION_TS, EM_AUTH_TS, EM_SCRIPT_RUNNER_TS, OPEN_FILE_PROMPTS_TS, DIAGNOSTIC_STATUS_BARS_TS];

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
        const source = HOST_TS_FILES.map(readStripped).join('\n');
        const matches = source.match(new RegExp(SHELL_EXEC_CALL, 'g')) ?? [];
        expect(matches).toHaveLength(0);
    });

    test('Commands.cjs does not import child_process directly', () => {
        const source = readStripped(COMMANDS_CJS);
        expect(source).not.toMatch(/require\(\s*['"]child_process['"]\s*\)/);
    });

    test('extension.ts does not import child_process directly', () => {
        const source = HOST_TS_FILES.map(readStripped).join('\n');
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
 * the expected set for. Only the process runner behind the run/compile commands
 * and the compiler-diagnostics service may import it.
 */
describe('no-shell-command-construction guard — which modules may launch a process', () => {
    test('the set of files under src/ importing child_process is exactly the two known launchers', () => {
        const importers = filesImportingChildProcess(SRC_DIR);
        expect(importers).toEqual(['Commands/process-runner.ts', 'language/bbj-cpl-service.ts']);
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
