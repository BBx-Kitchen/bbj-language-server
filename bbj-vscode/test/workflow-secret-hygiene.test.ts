import { afterAll, describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression coverage for `check-workflow-secrets.mjs`: pins its CLI contract
 * (exit codes and stdout shape) against the real workflow tree, a pre-fix
 * fixture, an empty-target guard, env/run separation, and argument-shape
 * invariance across token values, so the check cannot silently go vacuous.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
const CHECKER_PATH = process.env.WORKFLOW_SECRET_CHECKER_PATH
    ?? path.join(REPO_ROOT, 'bbj-vscode', 'tools', 'check-workflow-secrets.mjs');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const PREVIEW_FILE = path.join(WORKFLOWS_DIR, 'preview.yml');
const RELEASE_FILE = path.join(WORKFLOWS_DIR, 'manual-release.yml');

const fixtureDirs: string[] = [];

function newFixtureDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    fixtureDirs.push(dir);
    return dir;
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

// Extracts the folded run: body text for the publish step in one file's
// `--print` output, replaces every `${{ ... }}` expression with a fixed
// placeholder (as GitHub's expression evaluator would substitute a value),
// and drops the leading program-name words, leaving only argument text.
function extractPublishArgText(printOutput: string, filePath: string): string {
    const linePattern = /^(.+):(\d+): (.*)$/;
    for (const line of printOutput.split('\n')) {
        const match = line.match(linePattern);
        if (match && match[1] === filePath && match[3].includes('PintellijPlatformPublishingToken')) {
            const withPlaceholders = match[3].replace(/\$\{\{[^}]*\}\}/g, '9.9.9');
            return withPlaceholders.replace(/^\.\/gradlew publishPlugin\s+/, '');
        }
    }
    throw new Error(`No publish step found in --print output for ${filePath}`);
}

// Evaluates the reconstructed argument text under bash, the way the shell
// would after GitHub substitutes expressions, and returns the resulting
// positional parameters one per array element.
function evaluateReconstructedArgs(argText: string, tokenValue: string): string[] {
    const script = `set -- ${argText}\nprintf '%s\\n' "$@"`;
    const stdout = execFileSync('bash', ['-c', script], {
        encoding: 'utf8',
        env: { ...process.env, JETBRAINS_MARKETPLACE_TOKEN: tokenValue }
    });
    const trimmed = stdout.endsWith('\n') ? stdout.slice(0, -1) : stdout;
    return trimmed.split('\n');
}

describe('workflow-secret-hygiene checker contract', () => {
    test('the real workflow tree scans clean', () => {
        const result = runChecker([WORKFLOWS_DIR]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings/);
    });

    test('a pre-fix inline-secret shape reds with two ascending-ordered findings', () => {
        const fixtureDir = newFixtureDir('workflow-secret-hygiene-legacy-');
        const fixtureFile = path.join(fixtureDir, 'legacy.yml');
        const lines = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Folded publish step',
            '        run: >-',
            '          ./gradlew publishPlugin',
            '          -Pversion=1.0',
            '          -PintellijPlatformPublishingToken=${{ secrets.JETBRAINS_MARKETPLACE_TOKEN }}',
            '      - name: Single-line publish step',
            '        run: ./gradlew publishPlugin -Pversion=1.0 -PintellijPlatformPublishingToken=${{ secrets.JETBRAINS_MARKETPLACE_TOKEN }}'
        ];
        fs.writeFileSync(fixtureFile, lines.join('\n') + '\n');

        const expectedLineNumbers = lines
            .map((line, idx) => ({ line, idx }))
            .filter(({ line }) => line.includes('secrets.JETBRAINS_MARKETPLACE_TOKEN'))
            .map(({ idx }) => idx + 1);
        expect(expectedLineNumbers).toHaveLength(2);

        const result = runChecker([fixtureDir]);
        expect(result.status).toBe(1);

        const findingLines = result.stdout.split('\n').filter((line) => line.startsWith(fixtureFile));
        expect(findingLines).toHaveLength(2);

        const actualLineNumbers = findingLines.map((line) => Number(line.match(/:(\d+):/)?.[1]));
        expect(actualLineNumbers).toEqual(expectedLineNumbers);
        expect(actualLineNumbers[0]).toBeLessThan(actualLineNumbers[1]);
        expect(result.stdout).toContain('2 finding(s).');
    });

    test('an empty target directory triggers exit code 2, never exit code 0', () => {
        const emptyDir = newFixtureDir('workflow-secret-hygiene-empty-');
        const result = runChecker([emptyDir]);
        expect(result.status).toBe(2);
        expect(result.status).not.toBe(0);
    });

    test('a secrets expression bound through env: is not a finding while the run: body stays clean', () => {
        const fixtureDir = newFixtureDir('workflow-secret-hygiene-bound-');
        const fixtureFile = path.join(fixtureDir, 'bound.yml');
        const content = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  job:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Bound publish step',
            '        env:',
            '          JETBRAINS_MARKETPLACE_TOKEN: ${{ secrets.JETBRAINS_MARKETPLACE_TOKEN }}',
            '        run: |',
            '          ./gradlew publishPlugin -Pversion=${{ needs.build.outputs.version }} -Pchannel=${{ github.event.inputs.channel }} -PintellijPlatformPublishingToken="$JETBRAINS_MARKETPLACE_TOKEN"'
        ].join('\n') + '\n';
        fs.writeFileSync(fixtureFile, content);

        const result = runChecker([fixtureDir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings/);
    });

    test('reconstructed publish arguments keep a constant count and exact token argument for empty, spaced, and glob values', () => {
        const printResult = runChecker(['--print', WORKFLOWS_DIR]);
        expect(printResult.status).toBe(0);

        const previewArgText = extractPublishArgText(printResult.stdout, PREVIEW_FILE);
        const releaseArgText = extractPublishArgText(printResult.stdout, RELEASE_FILE);

        const tokenValues = ['', 'value with a space', '*'];
        for (const tokenValue of tokenValues) {
            const previewArgs = evaluateReconstructedArgs(previewArgText, tokenValue);
            expect(previewArgs).toHaveLength(3);
            expect(previewArgs[2]).toBe(`-PintellijPlatformPublishingToken=${tokenValue}`);

            const releaseArgs = evaluateReconstructedArgs(releaseArgText, tokenValue);
            expect(releaseArgs).toHaveLength(2);
            expect(releaseArgs[1]).toBe(`-PintellijPlatformPublishingToken=${tokenValue}`);
        }
    });
});
