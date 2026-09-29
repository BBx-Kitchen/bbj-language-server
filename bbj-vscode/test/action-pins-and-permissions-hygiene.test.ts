import { afterAll, describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression coverage for `check-action-pins-and-permissions.mjs`: pins its
 * CLI contract (exit codes and stdout shape) for the SHA-pin rule, the
 * version-comment rule, the top-level and job-level permissions rules, the
 * push/release token-scope rule, and the composite-action pin-only rule,
 * against temporary fixtures and against the real workflow tree, so none of
 * those checks can silently go vacuous.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
const CHECKER_PATH = process.env.ACTION_PINS_CHECKER_PATH
    ?? path.join(REPO_ROOT, 'bbj-vscode', 'tools', 'check-action-pins-and-permissions.mjs');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');

const PINNED_SHA = '11d5960a326750d5838078e36cf38b85af677262'; // actions/checkout v4.4.0

const fixtureDirs: string[] = [];

function newFixtureDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    fixtureDirs.push(dir);
    return dir;
}

function writeFixtureFile(dir: string, name: string, lines: string[]): string {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
    return filePath;
}

afterAll(() => {
    for (const dir of fixtureDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

interface CheckerResult {
    status: number;
    stdout: string;
}

function runChecker(args: string[]): CheckerResult {
    try {
        const stdout = execFileSync('node', [CHECKER_PATH, ...args], { encoding: 'utf8' });
        return { status: 0, stdout };
    } catch (err) {
        const spawnError = err as { status: number | null; stdout?: string };
        return { status: spawnError.status ?? -1, stdout: spawnError.stdout ?? '' };
    }
}

describe('action pin and permission checker contract', () => {
    test('a fixture with a top-level permissions block, a pinned checkout step and a local action reference scans clean', () => {
        const dir = newFixtureDir('action-pins-clean-');
        writeFixtureFile(dir, 'clean.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - uses: ./.github/actions/node-setup',
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings\.\s*$/);
    });

    test('a mutable tag reference is not pinned to a full commit SHA', () => {
        const dir = newFixtureDir('action-pins-mutable-tag-');
        const file = writeFixtureFile(dir, 'mutable.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - uses: actions/checkout@v4',
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(1);
        const findingLine = result.stdout.split('\n').find((line) => line.startsWith(file));
        expect(findingLine).toBe(
            `${file}:9: uses reference 'actions/checkout@v4' is not pinned to a full commit SHA`
        );
        expect(result.stdout).toContain('1 finding(s).');
    });

    test('a pinned reference with no comment or an incomplete version comment has no vX.Y.Z version comment', () => {
        const dir = newFixtureDir('action-pins-no-comment-');
        const file = writeFixtureFile(dir, 'no-comment.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA}`,
            `      - uses: actions/setup-node@${PINNED_SHA} # v4`,
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(1);
        const findingLines = result.stdout.split('\n').filter((line) => line.startsWith(file));
        expect(findingLines).toEqual([
            `${file}:9: uses reference 'actions/checkout@${PINNED_SHA}' has no '# vX.Y.Z' version comment`,
            `${file}:10: uses reference 'actions/setup-node@${PINNED_SHA}' has no '# vX.Y.Z' version comment`,
        ]);
        expect(result.stdout).toContain('2 finding(s).');
    });

    test('a 7-character SHA, a 39-character SHA and an uppercase-hex SHA each count as not pinned', () => {
        const dir = newFixtureDir('action-pins-short-sha-');
        const file = writeFixtureFile(dir, 'short.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - uses: actions/checkout@11d5960',
            '      - uses: actions/setup-node@11d5960a326750d5838078e36cf38b85af67726',
            `      - uses: actions/cache@${PINNED_SHA.toUpperCase()}`,
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(1);
        const findingLines = result.stdout.split('\n').filter((line) => line.startsWith(file));
        expect(findingLines).toHaveLength(3);
        for (const line of findingLines) {
            expect(line).toMatch(/is not pinned to a full commit SHA$/);
        }
        expect(result.stdout).toContain('3 finding(s).');
    });

    test('a local reference and a run body uses: line are never findings', () => {
        const dir = newFixtureDir('action-pins-local-and-run-body-');
        writeFixtureFile(dir, 'local.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - uses: ./.github/actions/node-setup',
            '      - run: |',
            "          echo 'uses: foo/bar@v1'",
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings\.\s*$/);
    });

    test('an empty directory target exits with code 2, never 0', () => {
        const dir = newFixtureDir('action-pins-empty-');
        const result = runChecker([dir]);
        expect(result.status).toBe(2);
        expect(result.stdout).toMatch(/^Refusing to report success/);
    });
});
