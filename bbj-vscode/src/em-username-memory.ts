/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The non-secret EM username remembered between logins (issue #546 follow-up:
 * web.bbj no longer fills in a default username, so the login prompt remembers
 * the last one that worked instead). The username is not secret, but a
 * password or token must never be written through this seam.
 *
 * This module has no imports and no `vscode` dependency, so it can be tested
 * directly with an in-memory store double.
 */

/** The key `EmUsernameStore` is read from and written to. */
export const EM_LAST_USERNAME_KEY = 'bbj.em.lastUsername';

/** The username offered when nothing has been remembered yet. */
export const DEFAULT_EM_USERNAME = 'admin';

/** The subset of `vscode.Memento` (`context.globalState`) this seam needs. */
export interface EmUsernameStore {
    get(key: string): unknown;
    update(key: string, value: string): PromiseLike<void>;
}

/**
 * The username to pre-fill the EM login prompt with: the stored value, as
 * stored, when it is a non-blank string, else `DEFAULT_EM_USERNAME`.
 */
export function initialEmUsername(store: EmUsernameStore): string {
    const stored = store.get(EM_LAST_USERNAME_KEY);
    if (typeof stored === 'string' && stored.trim() !== '') {
        return stored;
    }
    return DEFAULT_EM_USERNAME;
}

/**
 * Remembers `username` for next time. A no-op unless `username` is a
 * non-blank string -- called only after a successful login, and only with
 * the username, never a password or token.
 */
export async function rememberEmUsername(store: EmUsernameStore, username: string): Promise<void> {
    if (typeof username !== 'string' || username.trim() === '') {
        return;
    }
    await store.update(EM_LAST_USERNAME_KEY, username);
}
