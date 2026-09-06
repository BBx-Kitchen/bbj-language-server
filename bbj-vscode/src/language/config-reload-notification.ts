/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/configReloadRequired`: a pushed notification telling a host that the config content the
 * server actually consumes (see `extractConsumedConfigContent`/`consumedConfigSnapshot` in
 * `config-path-resolver.ts`) has changed and a language-server restart is required to pick it
 * up. Mirrors `resolved-config-path-request.ts`'s module shape: a method-name constant, a
 * plain-JSON payload type, no Langium or editor imports. The IntelliJ side mirrors this with a
 * Gson DTO, covered by the same JSON-boundary/request-contract test families the
 * `bbj/resolvedConfigPath` payload joined.
 *
 * Kept free of Langium and editor imports so it is unit-testable with plain stubs and reusable
 * from both `config-watcher.ts` and `bbj-notifications.ts`.
 */

/**
 * The LSP custom-notification method name. This is the single owner of this method string —
 * no other module inlines it; every sender imports this constant.
 */
export const CONFIG_RELOAD_METHOD = 'bbj/configReloadRequired';

/**
 * Why a reload was requested. Hosts MUST dispatch on this machine-readable value, never on
 * message prose.
 *
 * - `prefix-changed`: the consumed PREFIX content differs from the last-seen snapshot.
 * - `config-missing`: the config file could not be read (deleted or unreadable) where the
 *   previous snapshot was non-empty.
 * - `config-path-changed`: the resolved config path itself changed (a settings update) and the
 *   new file's consumed content differs from the running snapshot.
 */
export type ConfigReloadReason = 'prefix-changed' | 'config-missing' | 'config-path-changed';

/**
 * Every {@link ConfigReloadReason} value, so a cross-language contract test can enumerate them
 * without hand-duplicating the list.
 */
export const CONFIG_RELOAD_REASONS: readonly ConfigReloadReason[] = [
    'prefix-changed',
    'config-missing',
    'config-path-changed',
];

/** Payload of a `bbj/configReloadRequired` notification. */
export interface ConfigReloadNotification {
    /** The canonical resolved config path (Phase 84 D-04 form), or `null` if none is resolved. */
    path: string | null;
    /** Why the reload is required. Machine-readable — dispatch on this, never on message prose. */
    reason: ConfigReloadReason;
}
