/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * One-time move of the formatter setting `splitSingleLineIF` to its new spelling
 * `splitSingleLineIf`.
 *
 * Once `splitSingleLineIf` has a declared default, VS Code always supplies a value for it, so the
 * language server's "old spelling only when the new key is absent" fallback could never fire for a
 * user who still has the old key in a settings file. This module therefore moves the user's value
 * once, per scope, on activation: the value is written to the new key in the same scope and the old
 * key is then removed there.
 *
 * It has no `vscode` import, so it is driven with a plain fake configuration, and it never throws:
 * a configuration that cannot be read is a silent no-op, and a failed write is logged and left for
 * the next activation.
 */

import { LEGACY_SPLIT_SINGLE_LINE_IF_KEY, type FormatterSettingKey } from './language/bbj-format-settings.js';

/** The two scope values of a setting that the migration reads; every other scope is ignored. */
export interface SettingInspection {
    globalValue?: unknown;
    workspaceValue?: unknown;
}

/** What the migration needs from the configuration of the `bbj.formatter` section. */
export interface SettingsMigrationDeps<T> {
    /** Inspects one setting of the section; the key has no section prefix. */
    inspect(key: string): SettingInspection | undefined;
    /** Writes one setting of the section; an undefined value removes it. */
    update(key: string, value: unknown, target: T): PromiseLike<void>;
    userTarget: T;
    workspaceTarget: T;
    workspaceTrusted: boolean;
    log(line: string): void;
}

const NEW_KEY: FormatterSettingKey = 'splitSingleLineIf';
const OLD_NAME = `bbj.formatter.${LEGACY_SPLIT_SINGLE_LINE_IF_KEY}`;
const NEW_NAME = `bbj.formatter.${NEW_KEY}`;

function reasonOf(error: unknown): string {
    const text = error instanceof Error ? error.message : String(error);
    return text.replace(/[\r\n]+/g, ' ');
}

/**
 * Moves one scope's boolean value to the new key, then removes the old key there.
 * Returns true when both writes went through.
 */
async function migrateScope<T>(
    deps: SettingsMigrationDeps<T>,
    scope: 'user' | 'workspace',
    oldValue: unknown,
    newValue: unknown,
    target: T
): Promise<boolean> {
    if (typeof oldValue !== 'boolean' || newValue !== undefined) {
        return false;
    }
    try {
        await deps.update(NEW_KEY, oldValue, target);
        await deps.update(LEGACY_SPLIT_SINGLE_LINE_IF_KEY, undefined, target);
        return true;
    } catch (error) {
        safeLog(deps, `Could not finish moving ${OLD_NAME} to ${NEW_NAME} in the ${scope} settings: ${reasonOf(error)}`);
        return false;
    }
}

function safeLog<T>(deps: SettingsMigrationDeps<T>, line: string): void {
    try {
        deps.log(line);
    } catch {
        // A broken log sink must not turn a settings move into a failure.
    }
}

/**
 * Wraps an asynchronous run so that it is never started twice at once. Calling the returned function
 * starts the run when idle; a call that arrives while a run is in progress only records that another
 * run is wanted, and exactly one more run starts once the current one settles, however many calls
 * came in meanwhile. The returned function never throws, and a rejected run is dropped.
 */
export function createSingleFlightRunner(run: () => Promise<void>): () => void {
    let running = false;
    let rerun = false;
    return () => {
        if (running) {
            rerun = true;
            return;
        }
        running = true;
        void (async () => {
            try {
                do {
                    rerun = false;
                    try {
                        await run();
                    } catch {
                        // The run is best effort; a failure must not stop the follow-up run.
                    }
                } while (rerun);
            } finally {
                running = false;
            }
        })();
    };
}

/**
 * Moves a boolean `splitSingleLineIF` to `splitSingleLineIf` in the user settings and, when the
 * workspace is trusted, in the workspace settings. A scope is left alone when its old value is not
 * a boolean or when the new key is already set in it. The returned promise never rejects.
 */
export async function migrateSplitSingleLineIf<T>(deps: SettingsMigrationDeps<T>): Promise<void> {
    try {
        let oldInspection: SettingInspection | undefined;
        let newInspection: SettingInspection | undefined;
        try {
            oldInspection = deps.inspect(LEGACY_SPLIT_SINGLE_LINE_IF_KEY);
            newInspection = deps.inspect(NEW_KEY);
        } catch {
            return;
        }
        if (!oldInspection) {
            return;
        }

        const moved: string[] = [];
        if (await migrateScope(deps, 'user', oldInspection.globalValue, newInspection?.globalValue, deps.userTarget)) {
            moved.push('user');
        }
        if (deps.workspaceTrusted
            && await migrateScope(deps, 'workspace', oldInspection.workspaceValue, newInspection?.workspaceValue, deps.workspaceTarget)) {
            moved.push('workspace');
        }
        if (moved.length > 0) {
            safeLog(deps, `Moved ${OLD_NAME} to ${NEW_NAME} in the ${moved.join(' and ')} settings.`);
        }
    } catch {
        // Never reject: the migration is best effort and must not affect activation.
    }
}
