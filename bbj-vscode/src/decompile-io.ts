/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import { TOKENIZED_BBJ_MAGIC } from './tokenized-bbj.js';

/** Magic bytes at the start of a tokenized (binary) BBj program: "<<bbj>>". */
const TOKENIZED_MAGIC = Buffer.from(TOKENIZED_BBJ_MAGIC);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * What {@link probeTokenizedFile} found at a path. `resolvedPath` is the real path after symlinks
 * were followed; it is what bbjlst reads and what an in-place replace must target.
 */
export type TokenizedProbe =
    | { kind: 'tokenized'; resolvedPath: string }
    | { kind: 'not-tokenized'; resolvedPath: string }
    | { kind: 'not-a-file' }
    | { kind: 'missing' }
    | { kind: 'unreadable'; code: string; message: string };

function collapseLineBreaks(text: string): string {
    return text.replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

function describeIoError(err: unknown): { code: string; message: string } {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    const message = err instanceof Error ? err.message : String(err);
    return { code: typeof code === 'string' ? code : 'UNKNOWN', message: collapseLineBreaks(message) };
}

/**
 * Decides whether `file` is a tokenized (binary) BBj program, by content, and says why when it
 * cannot tell. The one rule shared by the open prompt, both decompile commands and Denumber.
 *
 * A symlink is followed with `realpath` first, so a link to a tokenized program is decompiled at
 * its target. The resolved path is then held to the #585 hardening: it must be a regular file
 * (`lstat` runs before any open, so a FIFO, socket, device or directory never reaches `open` — a
 * FIFO would otherwise block the open call indefinitely), the open requests `O_NOFOLLOW` and
 * `O_NONBLOCK` where the platform defines them (POSIX only — both are undefined on Windows, where
 * the `lstat` check is the sole guard), and the opened handle is re-checked with `fstat()` to
 * close the swap window between the `lstat` and the `open`. Because `realpath` has already run,
 * `O_NOFOLLOW` on the resolved path guards against a swap to a symlink after the resolution.
 *
 * An I/O failure (EACCES, EBUSY, a read race) is `unreadable` with its real cause, never
 * `not-tokenized`.
 */
export async function probeTokenizedFile(file: string): Promise<TokenizedProbe> {
    let resolvedPath: string;
    try {
        resolvedPath = await fs.promises.realpath(file);
    } catch (err) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
            return { kind: 'missing' };
        }
        return { kind: 'unreadable', ...describeIoError(err) };
    }

    let handle: fs.promises.FileHandle | undefined;
    try {
        const entry = await fs.promises.lstat(resolvedPath);
        if (!entry.isFile()) {
            return { kind: 'not-a-file' };
        }
        let flags = fs.constants.O_RDONLY;
        if (typeof fs.constants.O_NOFOLLOW === 'number') {
            flags |= fs.constants.O_NOFOLLOW;
        }
        if (typeof fs.constants.O_NONBLOCK === 'number') {
            flags |= fs.constants.O_NONBLOCK;
        }
        handle = await fs.promises.open(resolvedPath, flags);
        const handleStat = await handle.stat();
        if (!handleStat.isFile()) {
            return { kind: 'not-a-file' };
        }
        const buffer = Buffer.alloc(TOKENIZED_MAGIC.length);
        const { bytesRead } = await handle.read(buffer, 0, TOKENIZED_MAGIC.length, 0);
        const tokenized = bytesRead === TOKENIZED_MAGIC.length && buffer.equals(TOKENIZED_MAGIC);
        return { kind: tokenized ? 'tokenized' : 'not-tokenized', resolvedPath };
    } catch (err) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code;
        if (code === 'ENOENT') {
            return { kind: 'missing' };
        }
        return { kind: 'unreadable', ...describeIoError(err) };
    } finally {
        await handle?.close().catch(() => { });
    }
}

/** True if the file still starts with the tokenized-BBj magic (i.e. not yet decompiled). */
export async function isTokenizedFile(file: string): Promise<boolean> {
    return (await probeTokenizedFile(file)).kind === 'tokenized';
}

interface FileSize {
    size: number;
}

/**
 * Size of `file`, or `undefined` if it does not exist or is not a regular file (issue #585).
 * Uses `lstat` so a symlink, directory, FIFO, socket or device is treated as absent rather than
 * followed or read.
 */
export async function statSize(file: string): Promise<FileSize | undefined> {
    try {
        const stat = await fs.promises.lstat(file);
        if (!stat.isFile()) {
            return undefined;
        }
        return { size: stat.size };
    } catch {
        return undefined;
    }
}

export interface ListingWaitOptions {
    /** How long a listing may stay absent before bbjlst is judged to have written none. */
    missingGraceMs?: number;
    /** How long a listing that has appeared may take to stop growing. */
    timeoutMs?: number;
    pollMs?: number;
}

/**
 * Waits for the listing bbjlst was asked to write to `listingPath`. bbjlst exits 0 even when
 * it fails and can return before its output is flushed, so the only evidence of success is the
 * file itself: it must appear and its size must be equal on two consecutive polls. The
 * process has already exited when this runs, so a listing that is still absent after
 * `missingGraceMs` will never appear. `statSize` uses `lstat`, so a symlink planted at the
 * listing path counts as absent.
 */
export async function waitForListing(listingPath: string, opts: ListingWaitOptions = {}): Promise<void> {
    const { missingGraceMs = 3000, timeoutMs = 20000, pollMs = 150 } = opts;
    const name = path.basename(listingPath);
    const startMs = Date.now();
    let lastSize = -1;
    let appeared = false;
    for (;;) {
        const stat = await statSize(listingPath);
        const elapsedMs = Date.now() - startMs;
        if (stat) {
            appeared = true;
            if (stat.size === lastSize) {
                return;
            }
            lastSize = stat.size;
        } else if (!appeared && elapsedMs >= missingGraceMs) {
            throw new Error(`bbjlst wrote no decompiled listing for "${name}".`);
        }
        if (elapsedMs >= timeoutMs) {
            throw new Error(`bbjlst did not finish writing the listing for "${name}".`);
        }
        await delay(pollMs);
    }
}

/**
 * Rejects unless the listing at `listingPath` is a non-empty, decompiled program: an empty file
 * and a file that still starts with the tokenized-BBj magic are both a failed decompile.
 */
export async function verifyListing(listingPath: string): Promise<void> {
    const name = path.basename(listingPath);
    const stat = await statSize(listingPath);
    if (!stat) {
        throw new Error(`bbjlst wrote no decompiled listing for "${name}".`);
    }
    if (stat.size === 0) {
        throw new Error(`bbjlst wrote an empty listing for "${name}".`);
    }
    if (await isTokenizedFile(listingPath)) {
        throw new Error(`bbjlst did not decompile "${name}"; the listing is still a tokenized program.`);
    }
}

/**
 * Replaces `targetPath` with the content of `listingPath` atomically. The listing is copied to a
 * staged file in the target's own directory (so the final `rename` never crosses a file system),
 * given the target's permission bits, and renamed over the target; the target is never written
 * in place, so a crash cannot leave a half-written program. The staged file is created with
 * `COPYFILE_EXCL` and removed again when any step fails.
 */
export async function replaceWithListing(targetPath: string, listingPath: string): Promise<void> {
    const staged = path.join(
        path.dirname(targetPath),
        `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.decompiled`
    );
    // Only a staged file this call created is ever removed: when the exclusive copy itself
    // fails (the name is taken), whatever sits at that path is not ours to delete.
    let created = false;
    try {
        await fs.promises.copyFile(listingPath, staged, fs.constants.COPYFILE_EXCL);
        created = true;
        const mode = (await fs.promises.stat(targetPath)).mode & 0o7777;
        await fs.promises.chmod(staged, mode);
        await fs.promises.rename(staged, targetPath);
    } catch (err) {
        if (created) {
            await fs.promises.unlink(staged).catch(() => { });
        }
        throw err;
    }
}
