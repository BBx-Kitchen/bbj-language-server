import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isTokenizedFile, waitForDecompileOutput } from '../src/decompile-io.js';

const MAGIC = Buffer.from([0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e]); // "<<bbj>>"

describe('decompile-io', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decompile-io-test-'));
    });
    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    describe('isTokenizedFile', () => {
        test('true for a file starting with the "<<bbj>>" magic', async () => {
            const f = path.join(dir, 'prog');
            fs.writeFileSync(f, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            expect(await isTokenizedFile(f)).toBe(true);
        });
        test('false for plain text', async () => {
            const f = path.join(dir, 'prog.bbj');
            fs.writeFileSync(f, 'rem hi\nprint "x"\n');
            expect(await isTokenizedFile(f)).toBe(false);
        });
        test('false for a missing file', async () => {
            expect(await isTokenizedFile(path.join(dir, 'nope'))).toBe(false);
        });
    });

    describe('waitForDecompileOutput', () => {
        const fast = { pollMs: 5, timeoutMs: 2000 };

        test('resolves to the .lst path once it appears and its size settles', async () => {
            const input = path.join(dir, 'prog.bbj');
            fs.writeFileSync(input, MAGIC);
            const lst = input + '.lst';
            // Write the listing shortly after the wait starts, simulating async bbjlst output.
            setTimeout(() => fs.writeFileSync(lst, '0010 print "hi"\n'), 30);

            const result = await waitForDecompileOutput(input, fast);
            expect(result).toEqual({ sourcePath: lst, inPlace: false });
        });

        test('detects in-place rewrite when a once-tokenized input becomes ASCII', async () => {
            const input = path.join(dir, 'prog.bbj');
            fs.writeFileSync(input, MAGIC); // starts tokenized
            // No .lst ever appears; instead the input itself is rewritten to source.
            setTimeout(() => fs.writeFileSync(input, 'print "hi"\n'), 30);

            const result = await waitForDecompileOutput(input, { ...fast, canRewriteInPlace: true });
            expect(result).toEqual({ sourcePath: input, inPlace: true });
        });

        test('does NOT treat a non-tokenized input as in-place (waits for .lst)', async () => {
            // e.g. denumbering line-numbered text: bbjlst always emits .lst.
            const input = path.join(dir, 'numbered.bbj');
            fs.writeFileSync(input, '0010 print "hi"\n'); // never tokenized
            const lst = input + '.lst';
            setTimeout(() => fs.writeFileSync(lst, 'print "hi"\n'), 30);

            // canRewriteInPlace defaults to false → must resolve to .lst, not in-place.
            const result = await waitForDecompileOutput(input, fast);
            expect(result).toEqual({ sourcePath: lst, inPlace: false });
        });

        test('rejects on timeout when no output ever appears', async () => {
            const input = path.join(dir, 'prog.bbj');
            fs.writeFileSync(input, MAGIC);
            await expect(waitForDecompileOutput(input, { pollMs: 5, timeoutMs: 120 }))
                .rejects.toThrow(/Timed out/);
        });

        test('a not-yet-stable .lst is not resolved until its size settles', async () => {
            const input = path.join(dir, 'prog.bbj');
            fs.writeFileSync(input, MAGIC);
            const lst = input + '.lst';
            // Grow the listing on every poll for a while, then stop — resolution must
            // only happen after the size stops changing.
            let bytes = 0;
            const grower = setInterval(() => { bytes += 4; fs.writeFileSync(lst, 'x'.repeat(bytes)); }, 5);
            setTimeout(() => clearInterval(grower), 60);

            const result = await waitForDecompileOutput(input, { pollMs: 8, timeoutMs: 2000 });
            expect(result.sourcePath).toBe(lst);
            // Final observed size must equal what's on disk (i.e. it settled, not a partial read).
            expect(fs.statSync(lst).size).toBe(bytes);
        });

        describe('P62-D2-011: a stale .lst of matching size is never mistaken for fresh output', () => {
            // Committed under bbj-vscode/test/ (not a system temp directory), created and removed
            // per test — a stale-.lst race needs a fixture that already exists before the wait
            // starts, which the shared per-test `dir` (created fresh in the outer beforeEach)
            // cannot represent.
            const staleFixtureDir = path.join(__dirname, 'test-data', 'decompile-io-p62-d2-011');

            beforeEach(() => {
                fs.mkdirSync(staleFixtureDir, { recursive: true });
            });
            afterEach(() => {
                fs.rmSync(staleFixtureDir, { recursive: true, force: true });
            });

            test('resolves with the fresh content, not a pre-existing .lst of coincidentally matching size', async () => {
                const input = path.join(staleFixtureDir, 'prog.bbj');
                fs.writeFileSync(input, MAGIC);
                const lst = input + '.lst';
                const staleContent = 'print "stale"\n';
                const freshContent = 'print "fresh"\n';
                expect(freshContent.length).toBe(staleContent.length); // the coincidental-size premise

                // A stale .lst already on disk before the wait starts, e.g. left over from a
                // crashed prior decompile attempt against the same file. A real gap before the
                // call starts is required so the stale write's mtime is unambiguously earlier
                // than the call-start timestamp the fix captures — writing it in the same tick
                // as the call would let filesystem mtime rounding coincidentally satisfy the
                // mtime gate on the very first poll.
                fs.writeFileSync(lst, staleContent);
                await new Promise((resolve) => setTimeout(resolve, 100));

                const resultPromise = waitForDecompileOutput(input, { pollMs: 15, timeoutMs: 2000 });
                // The fresh run's output lands well after two 15ms-spaced polls have already
                // observed the stale file's settled size.
                setTimeout(() => fs.writeFileSync(lst, freshContent), 45);

                const result = await resultPromise;
                expect(result).toEqual({ sourcePath: lst, inPlace: false });
                expect(fs.readFileSync(lst, 'utf8')).toBe(freshContent);
            });
        });
    });
});
