import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { isTokenizedFile, waitForDecompileOutput, deleteLeftoverLst, statSize } from '../src/decompile-io.js';

const MAGIC = Buffer.from([0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e]); // "<<bbj>>"

const COMMANDS_CJS = path.join(__dirname, '..', 'src', 'Commands', 'Commands.cjs');

describe('decompile-io', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decompile-io-test-'));
    });
    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    describe('isTokenizedFile', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

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

        test('false for a symlink pointing at a real tokenized file', async () => {
            const target = path.join(dir, 'prog');
            fs.writeFileSync(target, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            const link = path.join(dir, 'prog-link');
            fs.symlinkSync(target, link);
            expect(await isTokenizedFile(link)).toBe(false);
        });

        test('false for a directory', async () => {
            const d = path.join(dir, 'a-directory');
            fs.mkdirSync(d);
            expect(await isTokenizedFile(d)).toBe(false);
        });

        test.skipIf(process.platform === 'win32')(
            'false for a FIFO, returning promptly instead of blocking on open',
            async () => {
                const fifo = path.join(dir, 'a-fifo');
                execFileSync('mkfifo', [fifo]);
                expect(await isTokenizedFile(fifo)).toBe(false);
            },
            2000
        );

        test('opens with O_NOFOLLOW and O_NONBLOCK where the platform defines them', async () => {
            const f = path.join(dir, 'prog');
            fs.writeFileSync(f, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            const openSpy = vi.spyOn(fs.promises, 'open');

            expect(await isTokenizedFile(f)).toBe(true);

            expect(openSpy).toHaveBeenCalledTimes(1);
            const flags = openSpy.mock.calls[0][1] as number;
            if (typeof fs.constants.O_NOFOLLOW === 'number') {
                expect(flags & fs.constants.O_NOFOLLOW).not.toBe(0);
            }
            if (typeof fs.constants.O_NONBLOCK === 'number') {
                expect(flags & fs.constants.O_NONBLOCK).not.toBe(0);
            }
        });

        test('reports false and still closes the handle when the opened handle is not a regular file on fstat re-check', async () => {
            const f = path.join(dir, 'prog');
            fs.writeFileSync(f, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            const closeSpy = vi.fn().mockResolvedValue(undefined);
            const fakeHandle = {
                stat: vi.fn().mockResolvedValue({ isFile: () => false }),
                close: closeSpy,
                read: vi.fn(),
            };
            vi.spyOn(fs.promises, 'open').mockResolvedValueOnce(fakeHandle as unknown as fs.promises.FileHandle);

            expect(await isTokenizedFile(f)).toBe(false);
            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('statSize', () => {
        test('returns the byte size for a regular file', async () => {
            const f = path.join(dir, 'prog.bbj');
            const content = '0010 print "hi"\n';
            fs.writeFileSync(f, content);
            expect(await statSize(f)).toEqual({ size: Buffer.byteLength(content) });
        });

        test('returns undefined for a symlink to a regular file', async () => {
            const target = path.join(dir, 'prog.lst');
            fs.writeFileSync(target, '0010 print "hi"\n');
            const link = path.join(dir, 'prog-link.lst');
            fs.symlinkSync(target, link);
            expect(await statSize(link)).toBeUndefined();
        });

        test('returns undefined for a directory', async () => {
            const d = path.join(dir, 'a-directory');
            fs.mkdirSync(d);
            expect(await statSize(d)).toBeUndefined();
        });

        test.skipIf(process.platform === 'win32')(
            'returns undefined for a FIFO',
            async () => {
                const fifo = path.join(dir, 'a-fifo');
                execFileSync('mkfifo', [fifo]);
                expect(await statSize(fifo)).toBeUndefined();
            },
            2000
        );

        test('returns undefined for a missing path', async () => {
            expect(await statSize(path.join(dir, 'nope'))).toBeUndefined();
        });
    });

    describe('waitForDecompileOutput', () => {
        const fast = { pollMs: 5, timeoutMs: 2000 };

        test('does not resolve to a symlinked .lst pointing at a real listing, and rejects on timeout', async () => {
            const input = path.join(dir, 'prog.bbj');
            fs.writeFileSync(input, MAGIC);
            const realListing = path.join(dir, 'real.lst');
            fs.writeFileSync(realListing, '0010 print "hi"\n');
            const lst = input + '.lst';
            fs.symlinkSync(realListing, lst);

            await expect(waitForDecompileOutput(input, { pollMs: 5, timeoutMs: 150 }))
                .rejects.toThrow(/Timed out/);
        });

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
            // e.g. a plain-text, line-numbered file: bbjlst always emits .lst.
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

        test('a fresh listing with a coarse, earlier-looking mtime resolves promptly (no mtime gate)', async () => {
            const input = path.join(dir, 'prog.bbj');
            fs.writeFileSync(input, MAGIC);
            const lst = input + '.lst';
            fs.writeFileSync(lst, '0010 print "hi"\n');
            // Backdate the fresh listing's mtime to well before the call starts, simulating a
            // coarse-mtime filesystem where a just-written file can read as "in the past".
            const past = new Date(Date.now() - 10000);
            fs.utimesSync(lst, past, past);

            const start = Date.now();
            const result = await waitForDecompileOutput(input, { pollMs: 5, timeoutMs: 2000 });
            expect(result).toEqual({ sourcePath: lst, inPlace: false });
            expect(Date.now() - start).toBeLessThan(1000);
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
                // crashed prior decompile attempt against the same file. It is the delete step
                // below — not a timestamp — that guarantees this stale listing can never be
                // observed by the wait: once removed, no size, however coincidentally matching,
                // can be read from this path until the fresh run writes it.
                fs.writeFileSync(lst, staleContent);

                await deleteLeftoverLst(input);
                expect(fs.existsSync(lst)).toBe(false);

                const resultPromise = waitForDecompileOutput(input, { pollMs: 15, timeoutMs: 2000 });
                let freshWrittenAt = 0;
                setTimeout(() => {
                    fs.writeFileSync(lst, freshContent);
                    freshWrittenAt = Date.now();
                }, 45);

                const result = await resultPromise;
                const resolvedAt = Date.now();
                expect(resolvedAt).toBeGreaterThanOrEqual(freshWrittenAt);
                expect(result).toEqual({ sourcePath: lst, inPlace: false });
                expect(fs.readFileSync(lst, 'utf8')).toBe(freshContent);
            });
        });
    });

    describe('deleteLeftoverLst', () => {
        test('removes an existing <input>.lst', async () => {
            const input = path.join(dir, 'prog.bbj');
            const lst = input + '.lst';
            fs.writeFileSync(lst, 'stale');
            await deleteLeftoverLst(input);
            expect(fs.existsSync(lst)).toBe(false);
        });

        test('resolves without error when no leftover exists', async () => {
            const input = path.join(dir, 'prog.bbj');
            await expect(deleteLeftoverLst(input)).resolves.toBeUndefined();
        });

        test('fails closed when the leftover cannot be removed, naming the path and reason', async () => {
            const input = path.join(dir, 'prog.bbj');
            const lst = input + '.lst';
            // A directory at the .lst path is a real, mock-free way to make unlink fail with a
            // non-ENOENT error (EISDIR on Linux, EPERM on macOS/Windows).
            fs.mkdirSync(lst);

            await expect(deleteLeftoverLst(input)).rejects.toThrow(
                new RegExp(`Could not remove the leftover.*${lst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
            );
            expect(fs.existsSync(lst)).toBe(true);
            expect(fs.statSync(lst).isDirectory()).toBe(true);
        });

        test('for a .lst input, removes only <input>.lst.lst and never the input file itself', async () => {
            const input = path.join(dir, 'prog.lst');
            const inputContent = '0010 rem x\n';
            fs.writeFileSync(input, inputContent);
            const leftover = input + '.lst'; // prog.lst.lst
            fs.writeFileSync(leftover, 'stale listing');

            await deleteLeftoverLst(input);

            expect(fs.existsSync(leftover)).toBe(false);
            expect(fs.existsSync(input)).toBe(true);
            expect(fs.readFileSync(input, 'utf8')).toBe(inputContent);
        });
    });
});

describe('the bbjlst launch path never denumbers (source guard)', () => {
    test.each([
        ['Commands.cjs', COMMANDS_CJS],
        ['process-args.ts', path.join(__dirname, '..', 'src', 'Commands', 'process-args.ts')],
    ])('%s contains no mention of denumbering', (_name, file) => {
        expect(fs.readFileSync(file, 'utf-8')).not.toMatch(/denumber/i);
    });
});
