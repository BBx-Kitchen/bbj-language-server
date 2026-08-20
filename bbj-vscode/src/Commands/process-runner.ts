/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Single argument-array process launcher used by every call site that used to build
 * a shell command string (GHSA-p5f3-9456-9pcx, CWE-78). Every caller hands this module
 * an `Argv` — an executable path plus an argument array from process-args.ts — and this
 * module passes it straight to Node's `execFile`, which never invokes a shell. No caller
 * may pass a shell-enabling option; none of the functions below accept one.
 */

import { execFile, type ExecFileOptions, type ExecFileException } from 'child_process';
import type { Argv } from './process-args.js';

export type ProcessError = ExecFileException & { stderr?: string };

export interface RunResult {
    stdout: string;
    stderr: string;
}

/**
 * Runs `argv` and resolves `{stdout, stderr}` on success. On failure, rejects with the
 * error object produced by `execFile`, with `stderr` attached to it — the same contract
 * the previous `execWithProgress` helper offered, so callers' error messages stay
 * byte-identical.
 */
export function runProcess(argv: Argv, options: ExecFileOptions = {}): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        execFile(argv.file, argv.args, options, (err, stdout, stderr) => {
            if (err) {
                (err as ProcessError).stderr = stderr?.toString();
                reject(err);
            } else {
                resolve({ stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? '' });
            }
        });
    });
}

/**
 * Fire-and-forget variant for launch sites that don't await completion (`Commands.run`,
 * `runWeb`): `callback(err, stdout, stderr)` mirrors the previous `exec(cmd, cb)` shape,
 * with `stderr` attached to a non-null `err`.
 */
export function runProcessCallback(
    argv: Argv,
    options: ExecFileOptions,
    callback: (err: ProcessError | null, stdout: string, stderr: string) => void
): void {
    execFile(argv.file, argv.args, options, (err, stdout, stderr) => {
        if (err) {
            (err as ProcessError).stderr = stderr?.toString();
        }
        callback(err as ProcessError | null, stdout?.toString() ?? '', stderr?.toString() ?? '');
    });
}

/**
 * Renders an invocation for the debug output channel, quoting each element and
 * replacing every element that exactly matches a non-empty entry of `secrets` with
 * `***`. An empty-string secret redacts nothing (there is nothing to compare against).
 */
export function formatArgvForLog(argv: Argv, secrets: string[] = []): string {
    const nonEmptySecrets = secrets.filter((s) => !!s);
    const renderPart = (part: string) => (nonEmptySecrets.includes(part) ? '***' : part);
    return [argv.file, ...argv.args].map(renderPart).map((p) => `"${p}"`).join(' ');
}
