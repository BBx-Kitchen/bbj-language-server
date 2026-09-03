import { afterAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    verifyFormatterArtifacts,
    FORMATTER_ARTIFACT_PINS,
    FORMATTER_TOOLS_DIR,
    formatterArtifactNames,
} from '../src/formatter-verifier.js';

/**
 * Tamper guard: exercises the real verifier against real vendored
 * bytes for every refusal reason, plus the injection seam and the pin table's own shape. This test needed neither the
 * `vscode` mock nor the `child_process` mock document-formatter.test.ts relies on, because
 * formatter-verifier.ts depends on neither.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
const REAL_ARTIFACT_PATH = path.join(REPO_ROOT, 'bbj-vscode', 'tools', 'formatter', 'BBjCFCli.jar');
const REAL_ARTIFACT_BYTES = fs.readFileSync(REAL_ARTIFACT_PATH);
const REAL_ARTIFACT_RELATIVE_PATH = FORMATTER_ARTIFACT_PINS[0].relativePath;

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

describe('formatter-verifier-tamper: gate against real vendored bytes', () => {
    test('a fixture directory holding the real, unmodified artefact verifies ok', () => {
        const fixtureDir = newFixtureDir('formatter-verifier-verified-');
        fs.writeFileSync(path.join(fixtureDir, REAL_ARTIFACT_RELATIVE_PATH), REAL_ARTIFACT_BYTES);

        const result = verifyFormatterArtifacts(fixtureDir);

        expect(result.ok).toBe(true);
    });

    test('the live repository tree verifies ok through the same function the runtime calls', () => {
        // Proves the committed pin matches the artefact actually on disk, through
        // FORMATTER_TOOLS_DIR — the exact constant document-formatter.ts's runtime gate uses.
        const result = verifyFormatterArtifacts(FORMATTER_TOOLS_DIR);

        expect(result.ok).toBe(true);
    });

    test('a single flipped byte refuses with DIGEST_MISMATCH and does not verify', () => {
        const fixtureDir = newFixtureDir('formatter-verifier-tampered-');
        const tamperedBytes = Buffer.from(REAL_ARTIFACT_BYTES);
        // Flip exactly one byte (XOR the final byte), keeping the length identical.
        tamperedBytes[tamperedBytes.length - 1] ^= 0x01;
        fs.writeFileSync(path.join(fixtureDir, REAL_ARTIFACT_RELATIVE_PATH), tamperedBytes);

        const result = verifyFormatterArtifacts(fixtureDir);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe('DIGEST_MISMATCH');
            expect(result.relativePath).toBe(REAL_ARTIFACT_RELATIVE_PATH);
            expect(result.actualSha256).not.toBe(result.expectedSha256);
        }
    });

    test('an empty fixture directory (missing artefact) refuses with MISSING_OR_UNREADABLE and names the expected path', () => {
        const fixtureDir = newFixtureDir('formatter-verifier-absent-');

        const result = verifyFormatterArtifacts(fixtureDir);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe('MISSING_OR_UNREADABLE');
            expect(result.absolutePath).toContain(REAL_ARTIFACT_RELATIVE_PATH);
        }
    });

    test('a present-but-zero-length artefact is readable, so it hashes and refuses with DIGEST_MISMATCH, not MISSING_OR_UNREADABLE', () => {
        // Deliberate rule, not an accident: a truncated artefact is indistinguishable from a
        // substituted one to this function, and readability (not size) selects the reason —
        // the stronger DIGEST_MISMATCH signal is the safer default for a zero-byte file.
        const fixtureDir = newFixtureDir('formatter-verifier-empty-');
        fs.writeFileSync(path.join(fixtureDir, REAL_ARTIFACT_RELATIVE_PATH), Buffer.alloc(0));

        const result = verifyFormatterArtifacts(fixtureDir);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe('DIGEST_MISMATCH');
        }
    });

    test('an injected reader that throws never falls open — the result is a refusal, not a thrown error', () => {
        const throwingReader = () => {
            throw new Error('synthetic read failure');
        };

        expect(() => verifyFormatterArtifacts(FORMATTER_TOOLS_DIR, throwingReader)).not.toThrow();
        const result = verifyFormatterArtifacts(FORMATTER_TOOLS_DIR, throwingReader);
        expect(result.ok).toBe(false);
    });

    test('an injected reader returning bytes that hash to the pinned value verifies ok, proving the seam is real', () => {
        const injectedReader = () => Buffer.from(REAL_ARTIFACT_BYTES);

        const result = verifyFormatterArtifacts('/nonexistent/directory/that/is/never/read', injectedReader);

        expect(result.ok).toBe(true);
    });

    test('FORMATTER_ARTIFACT_PINS has exactly the number of entries this plan pins, in the order formatterArtifactNames() reports, each with a 64-character lowercase hex digest', () => {
        // 77-01 pins one artefact (BBjCFCli.jar); a later plan in this phase adds the remaining
        // two on top of this same structure. This count assertion is written so that plan
        // updates one number rather than restructuring this test.
        expect(FORMATTER_ARTIFACT_PINS).toHaveLength(1);
        expect(formatterArtifactNames()).toEqual(FORMATTER_ARTIFACT_PINS.map((pin) => pin.relativePath));

        for (const pin of FORMATTER_ARTIFACT_PINS) {
            expect(pin.sha256).toMatch(/^[0-9a-f]{64}$/);
        }
    });
});
