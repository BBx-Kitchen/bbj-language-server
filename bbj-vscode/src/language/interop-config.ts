/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The single owner of "what host and port does the Java interop service connect to"
 * validation and defaults (issues #509, #510, #581). Both server entry points
 * (`bbj-ws-manager.ts`'s initialization options, `main.ts`'s configuration-change handler)
 * and `JavaInteropService.setConnectionConfig` itself call into this module instead of
 * carrying their own fallback literal or their own shape check.
 *
 * Kept free of Langium and editor imports so it is unit-testable with plain values and
 * reusable from both server entry points and tests.
 */

/** The only definition of the default interop host in this repository. */
export const DEFAULT_INTEROP_HOST = 'localhost';

/** The only definition of the default interop port in this repository. */
export const DEFAULT_INTEROP_PORT = 5008;

/** The setting name used in warnings about a rejected host value. */
export const INTEROP_HOST_SETTING = 'bbj.interop.host';

/** The setting name used in warnings about a rejected port value. */
export const INTEROP_PORT_SETTING = 'bbj.interop.port';

/** One rejected setting value: what was rejected, and under which setting name. */
export interface InteropRejection {
    setting: string;
    value: unknown;
}

/** The result of validating a raw host/port pair: the values to use, and what was rejected. */
export interface ValidatedInteropConfig {
    host: string;
    port: number;
    rejected: InteropRejection[];
}

const MAX_RENDERED_VALUE_LENGTH = 100;
const ELLIPSIS = '...';

/**
 * Validate a raw, untyped host value. Valid when it is a string whose trimmed form is
 * non-empty; the trimmed form is the value actually used. `undefined`/`null` (setting
 * absent) is treated as absent, not invalid — the caller falls back silently. Any other
 * value (a number, an object, an empty/whitespace-only string) is invalid and reported.
 */
function validateHost(host: unknown): { value: string; rejection: InteropRejection | undefined; absent: boolean } {
    if (host === undefined || host === null) {
        return { value: DEFAULT_INTEROP_HOST, rejection: undefined, absent: true };
    }
    if (typeof host === 'string') {
        const trimmed = host.trim();
        if (trimmed !== '') {
            return { value: trimmed, rejection: undefined, absent: false };
        }
    }
    return {
        value: DEFAULT_INTEROP_HOST,
        rejection: { setting: INTEROP_HOST_SETTING, value: host },
        absent: false,
    };
}

/**
 * Validate a raw, untyped port value. Valid only as a JavaScript integer number from 1 to
 * 65535 — a numeric string such as `"5008"` is invalid and falls back. `undefined`/`null`
 * (setting absent) is treated as absent, not invalid — the caller falls back silently.
 */
function validatePort(port: unknown): { value: number; rejection: InteropRejection | undefined; absent: boolean } {
    if (port === undefined || port === null) {
        return { value: DEFAULT_INTEROP_PORT, rejection: undefined, absent: true };
    }
    if (typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535) {
        return { value: port, rejection: undefined, absent: false };
    }
    return {
        value: DEFAULT_INTEROP_PORT,
        rejection: { setting: INTEROP_PORT_SETTING, value: port },
        absent: false,
    };
}

/**
 * Validate a raw host/port pair. Each field falls back independently to the shared default:
 * an invalid port with a valid host keeps the configured host and uses the default port, and
 * vice versa. An absent value (`undefined`/`null`) falls back silently; any other invalid
 * value falls back and is listed in `rejected` (host before port when both are invalid).
 */
export function validateInteropConfig(host: unknown, port: unknown): ValidatedInteropConfig {
    const hostResult = validateHost(host);
    const portResult = validatePort(port);
    const rejected: InteropRejection[] = [];
    if (hostResult.rejection) {
        rejected.push(hostResult.rejection);
    }
    if (portResult.rejection) {
        rejected.push(portResult.rejection);
    }
    return { host: hostResult.value, port: portResult.value, rejected };
}

/** Render a rejected value for a log line: strings are `JSON.stringify`d so control characters
 * and newlines cannot forge a second log line; everything else uses `String()`. Both forms are
 * capped so a huge rejected value cannot bloat the output channel. */
function renderRejectedValue(value: unknown): string {
    let rendered: string;
    try {
        rendered = typeof value === 'string' ? JSON.stringify(value) : String(value);
    } catch {
        rendered = '<unrenderable value>';
    }
    if (rendered.length > MAX_RENDERED_VALUE_LENGTH) {
        rendered = rendered.slice(0, MAX_RENDERED_VALUE_LENGTH) + ELLIPSIS;
    }
    return rendered;
}

/**
 * Format one rejection as a single warning line naming the setting, the rejected value, and
 * the default that was used instead. The module itself logs nothing; callers decide the log
 * level and sink.
 */
export function formatInteropRejection(rejection: InteropRejection): string {
    const fallback = rejection.setting === INTEROP_HOST_SETTING ? DEFAULT_INTEROP_HOST : DEFAULT_INTEROP_PORT;
    return `Ignoring invalid ${rejection.setting} value ${renderRejectedValue(rejection.value)}; using default ${fallback}`;
}
