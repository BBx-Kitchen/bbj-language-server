/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/openFormatterSettings`: a pushed notification asking a host to open its formatter settings.
 * The server sends it when the user picks "Open Settings" on an invalid-settings warning. Mirrors
 * `config-reload-notification.ts`: a method-name constant, a plain-JSON payload type, no Langium or
 * editor imports, so it can be used from the server and from a host's client code alike.
 *
 * The payload carries setting names only. A host must never turn the payload into a command
 * argument, a path or a document location: the names come from the formatting service and are shown
 * to the user, nothing more. Open the settings view with a fixed query ({@link FORMATTER_SETTINGS_QUERY})
 * and ignore the keys.
 */

/**
 * The LSP custom-notification method name. This is the single owner of this method string; every
 * sender and every handler imports this constant.
 */
export const OPEN_FORMATTER_SETTINGS_METHOD = 'bbj/openFormatterSettings';

/** Payload of a `bbj/openFormatterSettings` notification. */
export interface OpenFormatterSettingsParams {
    /** The full setting names that were rejected, each as `bbj.formatter.<key>`, without repeats. */
    keys: string[];
}

/** The filter a host's settings view is opened with: every formatter setting. */
export const FORMATTER_SETTINGS_QUERY = 'bbj.formatter';
