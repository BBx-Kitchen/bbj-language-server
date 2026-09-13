/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as fs from 'fs';
import { TOKENIZED_BBJ_MAGIC } from './tokenized-bbj.js';

/** Magic bytes at the start of a tokenized (binary) BBj program: "<<bbj>>". */
const TOKENIZED_MAGIC = Buffer.from(TOKENIZED_BBJ_MAGIC);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** True if the file still starts with the tokenized-BBj magic (i.e. not yet decompiled). */
export async function isTokenizedFile(file: string): Promise<boolean> {
    let handle: fs.promises.FileHandle | undefined;
    try {
        handle = await fs.promises.open(file, 'r');
        const buffer = Buffer.alloc(TOKENIZED_MAGIC.length);
        const { bytesRead } = await handle.read(buffer, 0, TOKENIZED_MAGIC.length, 0);
        return bytesRead === TOKENIZED_MAGIC.length && buffer.equals(TOKENIZED_MAGIC);
    } catch {
        return false;
    } finally {
        await handle?.close().catch(() => { });
    }
}

interface FileSize {
    size: number;
}

async function statSize(file: string): Promise<FileSize | undefined> {
    try {
        const stat = await fs.promises.stat(file);
        return { size: stat.size };
    } catch {
        return undefined;
    }
}

/** Path of the `.lst` listing `bbjlst` writes for a given input. */
function lstPathFor(inputPath: string): string {
    return inputPath + '.lst';
}

/**
 * Removes a leftover `<input>.lst` from an earlier decompile run before this run's
 * bbjlst launches, so any listing that appears afterwards is provably this run's own
 * output (issue #500). A missing leftover (ENOENT) is the normal case and resolves
 * silently. Any other failure (permissions, a file lock) throws, so the caller must
 * not proceed to run bbjlst on top of an un-removable stale listing.
 */
export async function deleteLeftoverLst(inputPath: string): Promise<void> {
    const lstPath = lstPathFor(inputPath);
    try {
        await fs.promises.unlink(lstPath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw new Error(`Could not remove the leftover "${lstPath}" from an earlier decompile: ${(err as Error).message || err}`, { cause: err });
    }
}

export interface DecompileOutput {
    /** Path where the decompiled ASCII source ended up. */
    sourcePath: string;
    /** True if bbjlst rewrote the input file in place instead of emitting `<input>.lst`. */
    inPlace: boolean;
}

export interface WaitOptions {
    timeoutMs?: number;
    pollMs?: number;
    /**
     * Allow the "input is no longer tokenized → rewritten in place" detection.
     * Set this only when the input started out tokenized; otherwise (e.g.
     * denumbering line-numbered text) bbjlst always emits `<input>.lst` and the
     * heuristic would fire spuriously on the very first poll.
     */
    canRewriteInPlace?: boolean;
}

/**
 * bbjlst can return before its output is flushed, and — depending on version —
 * either writes `<input>.lst` or rewrites `<input>` in place. This polls until the
 * output is actually ready and reports where the decompiled source landed.
 *
 * When `<input>.lst` is used, it waits until the file's size settles across two
 * polls. Callers clear a leftover `<input>.lst` with `deleteLeftoverLst` before
 * launching bbjlst, so any listing this wait observes is provably this run's own
 * output — this function itself makes no freshness claim from a timestamp. Rejects
 * on timeout.
 */
export async function waitForDecompileOutput(inputPath: string, opts: WaitOptions = {}): Promise<DecompileOutput> {
    const { timeoutMs = 20000, pollMs = 150, canRewriteInPlace = false } = opts;
    const lstPath = lstPathFor(inputPath);
    const callStartMs = Date.now();
    const deadline = callStartMs + timeoutMs;
    let lastLstSize = -2;
    while (Date.now() < deadline) {
        const lstStat = await statSize(lstPath);
        if (lstStat) {
            // `.lst` exists — wait until its size settles across two polls. Freshness is
            // guaranteed by the caller's deleteLeftoverLst, not by a timestamp here.
            if (lstStat.size === lastLstSize) {
                return { sourcePath: lstPath, inPlace: false };
            }
            lastLstSize = lstStat.size;
        } else if (canRewriteInPlace && !(await isTokenizedFile(inputPath))) {
            // No `.lst`, and a once-tokenized input is no longer tokenized → rewritten in place.
            return { sourcePath: inputPath, inPlace: true };
        }
        await delay(pollMs);
    }
    throw new Error(`Timed out waiting for bbjlst to produce the decompiled output of "${inputPath}"`);
}
