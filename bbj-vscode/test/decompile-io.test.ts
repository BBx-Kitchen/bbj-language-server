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
    });
});
