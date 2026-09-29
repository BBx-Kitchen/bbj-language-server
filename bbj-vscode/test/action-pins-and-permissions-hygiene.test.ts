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
 * push/release token-scope rule, the composite-action pin-only rule, one-
 * level directory descent, and `--print`, against temporary fixtures, so
 * none of those checks can silently go vacuous. The real-workflow-tree case
 * is added once every workflow is pinned.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
const CHECKER_PATH = process.env.ACTION_PINS_CHECKER_PATH
    ?? path.join(REPO_ROOT, 'bbj-vscode', 'tools', 'check-action-pins-and-permissions.mjs');

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

    test('a workflow with no top-level permissions block is a finding at line 1', () => {
        const dir = newFixtureDir('action-pins-missing-block-');
        const file = writeFixtureFile(dir, 'missing-block.yml', [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain(`${file}:1: workflow has no top-level permissions block`);
    });

    test('a top-level permissions block granting contents: write or write-all is a finding; contents: read with a job-level contents: write is not', () => {
        const dirWrite = newFixtureDir('action-pins-top-write-');
        const fileWrite = writeFixtureFile(dirWrite, 'top-write.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: write',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
        ]);
        const resultWrite = runChecker([dirWrite]);
        expect(resultWrite.status).toBe(1);
        expect(resultWrite.stdout).toContain(
            `${fileWrite}:3: top-level permissions grant 'contents: write'; grant write scopes per job`
        );

        const dirWriteAll = newFixtureDir('action-pins-top-write-all-');
        const fileWriteAll = writeFixtureFile(dirWriteAll, 'top-write-all.yml', [
            'name: Fixture',
            'on: push',
            'permissions: write-all',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
        ]);
        const resultWriteAll = runChecker([dirWriteAll]);
        expect(resultWriteAll.status).toBe(1);
        expect(resultWriteAll.stdout).toContain(
            `${fileWriteAll}:3: top-level permissions grant 'write-all'; grant write scopes per job`
        );

        const dirScoped = newFixtureDir('action-pins-top-read-job-write-');
        writeFixtureFile(dirScoped, 'scoped.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    permissions:',
            '      contents: write',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
        ]);
        const resultScoped = runChecker([dirScoped]);
        expect(resultScoped.status).toBe(0);
        expect(resultScoped.stdout).toMatch(/0 findings\.\s*$/);
    });

    test('a job that pushes or creates a release is flagged unless its effective token scope is contents: write', () => {
        const dirRead = newFixtureDir('action-pins-push-read-');
        const fileRead = writeFixtureFile(dirRead, 'push-read.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  pusher:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - run: |',
            '          git push origin main',
        ]);
        const resultRead = runChecker([dirRead]);
        expect(resultRead.status).toBe(1);
        expect(resultRead.stdout).toContain(
            `${fileRead}:6: job 'pusher' pushes or creates a release but its token has contents: read`
        );

        const dirWrite = newFixtureDir('action-pins-push-write-');
        writeFixtureFile(dirWrite, 'push-write.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  pusher:',
            '    runs-on: ubuntu-latest',
            '    permissions:',
            '      contents: write',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - run: |',
            '          git push origin main',
        ]);
        const resultWrite = runChecker([dirWrite]);
        expect(resultWrite.status).toBe(0);
        expect(resultWrite.stdout).toMatch(/0 findings\.\s*$/);

        const dirNone = newFixtureDir('action-pins-push-none-');
        const fileNone = writeFixtureFile(dirNone, 'push-none.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  pusher:',
            '    runs-on: ubuntu-latest',
            '    permissions:',
            '      pull-requests: write',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - run: |',
            '          gh release create v1.0.0',
        ]);
        const resultNone = runChecker([dirNone]);
        expect(resultNone.status).toBe(1);
        expect(resultNone.stdout).toContain(
            `${fileNone}:6: job 'pusher' pushes or creates a release but its token has contents: none`
        );

        const dirDefault = newFixtureDir('action-pins-push-default-');
        const fileDefault = writeFixtureFile(dirDefault, 'push-default.yml', [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  pusher:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - run: |',
            '          git push origin main',
        ]);
        const resultDefault = runChecker([dirDefault]);
        expect(resultDefault.status).toBe(1);
        expect(resultDefault.stdout).toContain(`${fileDefault}:1: workflow has no top-level permissions block`);
        expect(resultDefault.stdout).toContain(
            `${fileDefault}:4: job 'pusher' pushes or creates a release but its token has contents: default`
        );
        expect(resultDefault.stdout).toContain('2 finding(s).');
    });

    test('a comment line directly under jobs: does not suppress job attribution', () => {
        const dir = newFixtureDir('action-pins-jobs-comment-');
        const file = writeFixtureFile(dir, 'jobs-comment.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  # a job comment',
            '  pusher:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - run: |',
            '          git push origin main',
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain(
            `${file}:7: job 'pusher' pushes or creates a release but its token has contents: read`
        );
    });

    test('an inline comment on a job-level permissions entry does not drop that key', () => {
        const dir = newFixtureDir('action-pins-permissions-inline-comment-');
        writeFixtureFile(dir, 'inline-comment.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  pusher:',
            '    runs-on: ubuntu-latest',
            '    permissions:',
            '      contents: write # needed to push the release tag',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '      - run: |',
            '          git push origin main',
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings\.\s*$/);
    });

    test('a composite action is checked for pin compliance only', () => {
        const dirGood = newFixtureDir('action-pins-composite-good-');
        writeFixtureFile(dirGood, 'action.yml', [
            "name: 'Setup Node (fixture)'",
            "description: 'test fixture'",
            'runs:',
            "  using: 'composite'",
            '  steps:',
            `    - uses: actions/setup-node@${PINNED_SHA} # v4.4.0`,
            '      with:',
            '        node-version: 22',
        ]);
        const resultGood = runChecker([dirGood]);
        expect(resultGood.status).toBe(0);
        expect(resultGood.stdout).toMatch(/0 findings\.\s*$/);

        const dirBad = newFixtureDir('action-pins-composite-bad-');
        const fileBad = writeFixtureFile(dirBad, 'action.yml', [
            "name: 'Setup Node (fixture)'",
            "description: 'test fixture'",
            'runs:',
            "  using: 'composite'",
            '  steps:',
            '    - uses: actions/setup-node@v4',
        ]);
        const resultBad = runChecker([dirBad]);
        expect(resultBad.status).toBe(1);
        expect(resultBad.stdout).toContain(
            `${fileBad}:6: uses reference 'actions/setup-node@v4' is not pinned to a full commit SHA`
        );
        expect(resultBad.stdout).not.toContain('permissions block');
    });

    test('a directory target descends one level into subdirectories holding action.yml', () => {
        const dir = newFixtureDir('action-pins-descent-');
        const subdir = path.join(dir, 'node-setup');
        fs.mkdirSync(subdir);
        const actionFile = writeFixtureFile(subdir, 'action.yml', [
            "name: 'Setup Node (fixture)'",
            "description: 'test fixture'",
            'runs:',
            "  using: 'composite'",
            '  steps:',
            '    - uses: actions/setup-node@v4',
        ]);

        const result = runChecker([dir]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain(
            `${actionFile}:6: uses reference 'actions/setup-node@v4' is not pinned to a full commit SHA`
        );
    });

    test('a file with neither jobs: nor runs: refuses the scan; so does a scan with files but zero uses references', () => {
        const dirUnrecognised = newFixtureDir('action-pins-unrecognised-');
        const fileUnrecognised = writeFixtureFile(dirUnrecognised, 'not-a-workflow.yml', [
            'name: Not a workflow',
            'on: push',
        ]);
        const resultUnrecognised = runChecker([dirUnrecognised]);
        expect(resultUnrecognised.status).toBe(2);
        expect(resultUnrecognised.stdout).toContain(
            `Refusing to report success on an unrecognised file: ${fileUnrecognised}`
        );

        const dirNoUses = newFixtureDir('action-pins-no-uses-');
        writeFixtureFile(dirNoUses, 'no-uses.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - run: echo hi',
        ]);
        const resultNoUses = runChecker([dirNoUses]);
        expect(resultNoUses.status).toBe(2);
        expect(resultNoUses.stdout).toMatch(/^Refusing to report success on an empty scan/);
    });

    test('--print reports workflow and job permissions and every uses reference', () => {
        const dir = newFixtureDir('action-pins-print-');
        const file = writeFixtureFile(dir, 'print.yml', [
            'name: Fixture',
            'on: push',
            'permissions:',
            '  contents: read',
            'jobs:',
            '  withblock:',
            '    runs-on: ubuntu-latest',
            '    permissions:',
            '      contents: write',
            '      pull-requests: write',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
            '  noblock:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/setup-node@${PINNED_SHA}`,
        ]);

        const result = runChecker(['--print', dir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain(`${file}: workflow permissions: contents=read`);
        expect(result.stdout).toContain(`${file}: job withblock permissions: contents=write,pull-requests=write`);
        expect(result.stdout).toContain(`${file}: job noblock permissions: inherited`);
        expect(result.stdout).toContain(`${file}:12: uses actions/checkout@${PINNED_SHA} # v4.4.0`);
        expect(result.stdout).toContain(`${file}:16: uses actions/setup-node@${PINNED_SHA} (no comment)`);

        const dirMissing = newFixtureDir('action-pins-print-missing-');
        const fileMissing = writeFixtureFile(dirMissing, 'missing.yml', [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
        ]);
        const resultMissing = runChecker(['--print', dirMissing]);
        expect(resultMissing.status).toBe(0);
        expect(resultMissing.stdout).toContain(`${fileMissing}: workflow permissions: (missing)`);
        expect(resultMissing.stdout).toContain(`${fileMissing}: job job permissions: inherited`);

        const dirEmptyMap = newFixtureDir('action-pins-print-empty-map-');
        const fileEmptyMap = writeFixtureFile(dirEmptyMap, 'empty-map.yml', [
            'name: Fixture',
            'on: push',
            'permissions: {}',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    permissions: {}',
            '    steps:',
            `      - uses: actions/checkout@${PINNED_SHA} # v4.4.0`,
        ]);
        const resultEmptyMap = runChecker(['--print', dirEmptyMap]);
        expect(resultEmptyMap.status).toBe(0);
        expect(resultEmptyMap.stdout).toContain(`${fileEmptyMap}: workflow permissions: none`);
        expect(resultEmptyMap.stdout).toContain(`${fileEmptyMap}: job job permissions: none`);

        const dirPrintEmpty = newFixtureDir('action-pins-print-empty-');
        const resultPrintEmpty = runChecker(['--print', dirPrintEmpty]);
        expect(resultPrintEmpty.status).toBe(2);
    });

    test('the real workflow tree and composite actions scan clean', () => {
        const result = runChecker([]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/workflow\(s\), 0 findings\.\s*$/m);

        const printResult = runChecker(['--print']);
        expect(printResult.status).toBe(0);
        const nodeSetupActionPath = path.join(REPO_ROOT, '.github', 'actions', 'node-setup', 'action.yml');
        expect(printResult.stdout).toContain(nodeSetupActionPath);
    });
});
