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

interface SizeAndMtime {
    size: number;
    mtimeMs: number;
}

async function statSizeAndMtime(file: string): Promise<SizeAndMtime | undefined> {
    try {
        const stat = await fs.promises.stat(file);
        return { size: stat.size, mtimeMs: stat.mtimeMs };
    } catch {
        return undefined;
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
 * polls, AND the settled file was written at or after this call started — so a stale
 * `.lst` left on disk by an earlier (possibly crashed) run is never mistaken for fresh
 * output, even if it coincidentally matches the new run's final byte size. Rejects on
 * timeout.
 */
export async function waitForDecompileOutput(inputPath: string, opts: WaitOptions = {}): Promise<DecompileOutput> {
    const { timeoutMs = 20000, pollMs = 150, canRewriteInPlace = false } = opts;
    const lstPath = inputPath + '.lst';
    const callStartMs = Date.now();
    const deadline = callStartMs + timeoutMs;
    let lastLstSize = -2;
    while (Date.now() < deadline) {
        const lstStat = await statSizeAndMtime(lstPath);
        if (lstStat) {
            // `.lst` exists — wait until its size settles across two polls AND its mtime is at
            // or after this call started, so a stale `.lst` of matching size is never accepted.
            if (lstStat.size === lastLstSize && lstStat.mtimeMs >= callStartMs) {
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
