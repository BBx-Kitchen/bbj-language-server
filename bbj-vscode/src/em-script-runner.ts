/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createOwnerOnlyFile, type Argv } from './Commands/process-args.js';
import { runProcess } from './Commands/process-runner.js';

/**
 * The one shared runner for the EM helper scripts (em-validate-token.bbj,
 * em-login.bbj): every result travels back on an owner-only file created
 * exclusively before the launch, so a pre-placed file or symlink at the
 * guessable temp-directory path fails the creation call rather than receiving
 * a silent write (GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8). Each script
 * truncates that file in place rather than deleting and recreating it, so the
 * owner-only mode holds for the whole life of the file, including while it
 * carries a returned JWT. The launch itself goes through the shared,
 * layout-checked, shell-free process launcher (never a raw child-process
 * call), and the run step always removes the output file afterwards,
 * whatever the launch did.
 */

/**
 * Creates the owner-only output file a script will write its result into, at
 * a fresh path under the OS temp directory named from `tmpFilePrefix` and the
 * current millisecond timestamp. Catches nothing: a creation failure (for
 * example an existing file at the same guessable path) reaches the caller as
 * the same error object the underlying owner-only creation call throws.
 */
export function createScriptOutputFile(tmpFilePrefix: string): string {
    return createOwnerOnlyFile(path.join(os.tmpdir(), `${tmpFilePrefix}-${Date.now()}.tmp`));
}

/**
 * Launches `argv` through the shared process launcher with `timeoutMs`,
 * reads back and trims whatever the script wrote to `outputFile`, and always
 * removes `outputFile` afterwards, whether the launch succeeded or not.
 * Catches nothing else: a launch failure or a read failure reaches the
 * caller as the same object, after cleanup has run.
 */
export async function runScriptToOwnerOnlyFile(argv: Argv, outputFile: string, timeoutMs: number): Promise<string> {
    try {
        // The secret env map must be spread over process.env, not passed alone —
        // execFile replaces the child's environment wholesale when options.env is
        // set, and omitting process.env here would strip PATH/BBJ_HOME from the
        // child.
        await runProcess(argv, { timeout: timeoutMs, env: { ...process.env, ...argv.env } });
        return fs.readFileSync(outputFile, 'utf-8').trim();
    } finally {
        // Cleanup is best effort: a missing or already-removed file must not
        // mask the real result or error produced above.
        try { fs.unlinkSync(outputFile); } catch { /* best effort */ }
    }
}
