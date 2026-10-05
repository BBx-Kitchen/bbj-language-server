import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as processArgs from '../src/Commands/process-args.js';
import {
    isTokenizedFile,
    probeTokenizedFile,
    statSize,
    waitForListing,
    verifyListing,
    replaceWithListing,
} from '../src/decompile-io.js';

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

        test('true for a symlink pointing at a real tokenized file', async () => {
            const target = path.join(dir, 'prog');
            fs.writeFileSync(target, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            const link = path.join(dir, 'prog-link');
            fs.symlinkSync(target, link);
            expect(await isTokenizedFile(link)).toBe(true);
        });

        test('false for a directory', async () => {
            const d = path.join(dir, 'a-directory');
            fs.mkdirSync(d);
            expect(await isTokenizedFile(d)).toBe(false);
        });
    });

    describe('probeTokenizedFile', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        function writeTokenized(name: string): string {
            const f = path.join(dir, name);
            fs.writeFileSync(f, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            return f;
        }

        test('reports tokenized with the real path for a plain tokenized file', async () => {
            const f = writeTokenized('prog');
            expect(await probeTokenizedFile(f)).toEqual({ kind: 'tokenized', resolvedPath: fs.realpathSync(f) });
        });

        test('reports tokenized with the target as resolvedPath for a symlink to a tokenized file', async () => {
            const target = writeTokenized('prog');
            const link = path.join(dir, 'prog-link');
            fs.symlinkSync(target, link);
            expect(await probeTokenizedFile(link)).toEqual({ kind: 'tokenized', resolvedPath: fs.realpathSync(target) });
        });

        test('reports not-tokenized with the real path for plain text', async () => {
            const f = path.join(dir, 'prog.bbj');
            fs.writeFileSync(f, 'rem hi\nprint "x"\n');
            expect(await probeTokenizedFile(f)).toEqual({ kind: 'not-tokenized', resolvedPath: fs.realpathSync(f) });
        });

        test('reports not-tokenized for a file shorter than the magic', async () => {
            const f = path.join(dir, 'short');
            fs.writeFileSync(f, '<<bb');
            expect((await probeTokenizedFile(f)).kind).toBe('not-tokenized');
        });

        test('reports a directory as not-a-file', async () => {
            const d = path.join(dir, 'a-directory');
            fs.mkdirSync(d);
            expect(await probeTokenizedFile(d)).toEqual({ kind: 'not-a-file' });
        });

        test.skipIf(process.platform === 'win32')(
            'reports a FIFO as not-a-file, returning promptly instead of blocking on open',
            async () => {
                const fifo = path.join(dir, 'a-fifo');
                execFileSync('mkfifo', [fifo]);
                expect(await probeTokenizedFile(fifo)).toEqual({ kind: 'not-a-file' });
            },
            2000
        );

        test.skipIf(process.platform === 'win32')(
            'reports a symlink to a FIFO as not-a-file, returning promptly',
            async () => {
                const fifo = path.join(dir, 'a-fifo');
                execFileSync('mkfifo', [fifo]);
                const link = path.join(dir, 'a-fifo-link');
                fs.symlinkSync(fifo, link);
                expect(await probeTokenizedFile(link)).toEqual({ kind: 'not-a-file' });
            },
            2000
        );

        test('reports a missing path as missing', async () => {
            expect(await probeTokenizedFile(path.join(dir, 'nope'))).toEqual({ kind: 'missing' });
        });

        test('reports a dangling symlink as missing', async () => {
            const link = path.join(dir, 'dangling');
            fs.symlinkSync(path.join(dir, 'gone'), link);
            expect(await probeTokenizedFile(link)).toEqual({ kind: 'missing' });
        });

        test.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
            'reports a file that cannot be read as unreadable with EACCES',
            async () => {
                const f = writeTokenized('locked');
                fs.chmodSync(f, 0o000);
                const probe = await probeTokenizedFile(f);
                expect(probe.kind).toBe('unreadable');
                expect(probe).toMatchObject({ code: 'EACCES' });
            }
        );

        test('reports an open failure as unreadable with its code and a one-line message', async () => {
            const f = writeTokenized('busy');
            const failure = Object.assign(new Error('resource busy\nor locked'), { code: 'EBUSY' });
            vi.spyOn(fs.promises, 'open').mockRejectedValueOnce(failure);

            const probe = await probeTokenizedFile(f);

            expect(probe).toEqual({ kind: 'unreadable', code: 'EBUSY', message: 'resource busy or locked' });
        });

        test('reports a read failure as unreadable and still closes the handle', async () => {
            const f = writeTokenized('racy');
            const closeSpy = vi.fn().mockResolvedValue(undefined);
            const fakeHandle = {
                stat: vi.fn().mockResolvedValue({ isFile: () => true }),
                close: closeSpy,
                read: vi.fn().mockRejectedValue(Object.assign(new Error('read raced'), { code: 'EIO' })),
            };
            vi.spyOn(fs.promises, 'open').mockResolvedValueOnce(fakeHandle as unknown as fs.promises.FileHandle);

            expect(await probeTokenizedFile(f)).toMatchObject({ kind: 'unreadable', code: 'EIO' });
            expect(closeSpy).toHaveBeenCalledTimes(1);
        });

        test('opens with O_NOFOLLOW and O_NONBLOCK where the platform defines them', async () => {
            const f = writeTokenized('prog');
            const openSpy = vi.spyOn(fs.promises, 'open');

            expect((await probeTokenizedFile(f)).kind).toBe('tokenized');

            expect(openSpy).toHaveBeenCalledTimes(1);
            const flags = openSpy.mock.calls[0][1] as number;
            if (typeof fs.constants.O_NOFOLLOW === 'number') {
                expect(flags & fs.constants.O_NOFOLLOW).not.toBe(0);
            }
            if (typeof fs.constants.O_NONBLOCK === 'number') {
                expect(flags & fs.constants.O_NONBLOCK).not.toBe(0);
            }
        });

        test('opens the resolved target, not the link', async () => {
            const target = writeTokenized('prog');
            const link = path.join(dir, 'prog-link');
            fs.symlinkSync(target, link);
            const openSpy = vi.spyOn(fs.promises, 'open');

            await probeTokenizedFile(link);

            expect(openSpy.mock.calls[0][0]).toBe(fs.realpathSync(target));
        });

        test('reports not-a-file and still closes the handle when the opened handle is not a regular file on fstat re-check', async () => {
            const f = writeTokenized('prog');
            const closeSpy = vi.fn().mockResolvedValue(undefined);
            const fakeHandle = {
                stat: vi.fn().mockResolvedValue({ isFile: () => false }),
                close: closeSpy,
                read: vi.fn(),
            };
            vi.spyOn(fs.promises, 'open').mockResolvedValueOnce(fakeHandle as unknown as fs.promises.FileHandle);

            expect(await probeTokenizedFile(f)).toEqual({ kind: 'not-a-file' });
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

    describe('waitForListing', () => {
        const fast = { pollMs: 5, missingGraceMs: 2000, timeoutMs: 2000 };

        test('resolves for a listing whose size is stable', async () => {
            const listing = path.join(dir, 'prog.bbj');
            fs.writeFileSync(listing, 'print "hi"\n');
            await expect(waitForListing(listing, fast)).resolves.toBeUndefined();
        });

        test('resolves once a listing that appears late has stopped growing', async () => {
            const listing = path.join(dir, 'prog.bbj');
            setTimeout(() => fs.writeFileSync(listing, 'print "hi"\n'), 30);
            await expect(waitForListing(listing, fast)).resolves.toBeUndefined();
        });

        test('rejects naming the file when nothing appears within the missing-listing grace', async () => {
            const listing = path.join(dir, 'prog.bbj');
            await expect(waitForListing(listing, { pollMs: 5, missingGraceMs: 100, timeoutMs: 2000 }))
                .rejects.toThrow('bbjlst wrote no decompiled listing for "prog.bbj".');
        });

        test('treats a symlinked listing as absent', async () => {
            const real = path.join(dir, 'real.txt');
            fs.writeFileSync(real, 'print "hi"\n');
            const listing = path.join(dir, 'prog.bbj');
            fs.symlinkSync(real, listing);
            await expect(waitForListing(listing, { pollMs: 5, missingGraceMs: 100, timeoutMs: 2000 }))
                .rejects.toThrow(/wrote no decompiled listing/);
        });

        test('rejects when a listing keeps growing past the timeout', async () => {
            const listing = path.join(dir, 'prog.bbj');
            let bytes = 0;
            const grower = setInterval(() => { bytes += 4; fs.writeFileSync(listing, 'x'.repeat(bytes)); }, 3);
            try {
                await expect(waitForListing(listing, { pollMs: 8, missingGraceMs: 2000, timeoutMs: 150 }))
                    .rejects.toThrow('bbjlst did not finish writing the listing for "prog.bbj".');
            } finally {
                clearInterval(grower);
            }
        });
    });

    describe('verifyListing', () => {
        test('resolves for a plain-text listing', async () => {
            const listing = path.join(dir, 'prog.bbj');
            fs.writeFileSync(listing, 'print "hi"\n');
            await expect(verifyListing(listing)).resolves.toBeUndefined();
        });

        test('rejects an empty listing', async () => {
            const listing = path.join(dir, 'prog.bbj');
            fs.writeFileSync(listing, '');
            await expect(verifyListing(listing)).rejects.toThrow('bbjlst wrote an empty listing for "prog.bbj".');
        });

        test('rejects a listing that is still a tokenized program', async () => {
            const listing = path.join(dir, 'prog.bbj');
            fs.writeFileSync(listing, Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]));
            await expect(verifyListing(listing))
                .rejects.toThrow('bbjlst did not decompile "prog.bbj"; the listing is still a tokenized program.');
        });

        test('rejects a missing listing', async () => {
            await expect(verifyListing(path.join(dir, 'prog.bbj'))).rejects.toThrow(/wrote no decompiled listing/);
        });
    });

    describe('replaceWithListing', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        function stagedFiles(): string[] {
            return fs.readdirSync(dir).filter((name) => name.endsWith('.decompiled'));
        }

        test('replaces the target with the listing and leaves no staged file behind', async () => {
            const target = path.join(dir, 'prog.bbj');
            const listing = path.join(dir, 'listing.txt');
            fs.writeFileSync(target, MAGIC);
            fs.writeFileSync(listing, 'print "decompiled"\n');

            await replaceWithListing(target, listing);

            expect(fs.readFileSync(target, 'utf-8')).toBe('print "decompiled"\n');
            expect(fs.readFileSync(listing, 'utf-8')).toBe('print "decompiled"\n');
            expect(fs.readdirSync(dir).sort()).toEqual(['listing.txt', 'prog.bbj']);
        });

        test.skipIf(process.platform === 'win32')('keeps the permission bits of the target', async () => {
            const target = path.join(dir, 'prog.bbj');
            const listing = path.join(dir, 'listing.txt');
            fs.writeFileSync(target, MAGIC);
            fs.chmodSync(target, 0o640);
            fs.writeFileSync(listing, 'print "decompiled"\n');
            fs.chmodSync(listing, 0o600);

            await replaceWithListing(target, listing);

            expect(fs.statSync(target).mode & 0o7777).toBe(0o640);
        });

        test('when the final rename fails, the target is byte-identical and no staged file remains', async () => {
            const target = path.join(dir, 'prog.bbj');
            const listing = path.join(dir, 'listing.txt');
            const original = Buffer.concat([MAGIC, Buffer.from([0x84, 0, 0])]);
            fs.writeFileSync(target, original);
            fs.writeFileSync(listing, 'print "decompiled"\n');
            vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('rename boom'));

            await expect(replaceWithListing(target, listing)).rejects.toThrow('rename boom');

            expect(fs.readFileSync(target).equals(original)).toBe(true);
            expect(stagedFiles()).toEqual([]);
        });

        test('never overwrites an existing file at the staged name', async () => {
            const target = path.join(dir, 'prog.bbj');
            const listing = path.join(dir, 'listing.txt');
            fs.writeFileSync(target, MAGIC);
            fs.writeFileSync(listing, 'print "decompiled"\n');
            vi.spyOn(Date, 'now').mockReturnValue(1234567890);
            const planted = path.join(dir, `.prog.bbj.${process.pid}.1234567890.decompiled`);
            fs.writeFileSync(planted, 'planted');

            await expect(replaceWithListing(target, listing)).rejects.toThrow(/EEXIST/);

            expect(fs.readFileSync(planted, 'utf-8')).toBe('planted');
            expect(fs.readFileSync(target).equals(MAGIC)).toBe(true);
        });
    });
});

describe('the bbjlst launch path passes bbjlst nothing but its listing options', () => {
    test('process-args exports nothing that denumbers', () => {
        expect(Object.keys(processArgs).filter((name) => /denum/i.test(name))).toEqual([]);
    });

    test.each([
        ['a .bbj', '/w/a.bbj'],
        ['a .pub', '/w/a.pub'],
        ['an extensionless', '/w/a'],
        ['a .lst', '/w/a.lst'],
    ])('buildDecompileArgv for %s input yields only -l, -xlst, the -d element and the file name', (_label, fileName) => {
        const { args } = processArgs.buildDecompileArgv({ home: '/opt/bbj', platform: 'linux', fileName, outputDir: '/out' });
        const allowed = new Set(['-l', '-xlst', '-d/out', fileName]);
        expect(args.filter((arg) => !allowed.has(arg))).toEqual([]);
        expect(args.at(-1)).toBe(fileName);
        expect(args.filter((arg) => arg.startsWith('-d'))).toEqual(['-d/out']);
    });
});
