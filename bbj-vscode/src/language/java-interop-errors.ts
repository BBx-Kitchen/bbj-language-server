/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The single owner of how a failed bbj-ls request is classified. Every JSON-RPC error that comes
 * back from the java-interop peer (the application codes `-33001` to `-33009`, the standard
 * `-32601`, `-32602` and `-32800`, and every transport-level failure) is turned into one kind
 * token here, so the live-parse service and the format and DENUM client can never disagree about
 * what a code means.
 *
 * It also owns the warn-then-debug failure log cadence both consumers use: the first failure of a
 * kind on a connection generation is logged at warn, repeats at debug, until the caller re-arms it.
 *
 * Kept free of Langium and editor imports, and a leaf of the interop modules (it never imports the
 * connection, the front service or the parser service), so each of those can import it without a
 * cycle.
 */
import { ErrorCodes } from 'vscode-jsonrpc/node.js';
import { LSPErrorCodes } from 'vscode-languageserver';
import { logger } from './logger.js';
import { MAX_PEER_ERROR_LENGTH, truncateText } from './java-peer-guard.js';

/** The program could not be parsed. */
export const ERROR_PARSE_FAILED = -33001;
/** The request overran the peer's own deadline, or arrived while a previous one still overran. */
export const ERROR_TIMEOUT = -33002;
/** The request text is larger than the peer accepts. */
export const ERROR_TOO_LARGE = -33003;
/** The peer cannot serve the request right now (it may be closing the connection). */
export const ERROR_SERVICE_UNAVAILABLE = -33004;
/** The program is protected and may not be processed. */
export const ERROR_PROTECTED_PROGRAM = -33005;
/** The program carries line numbers and the request did not allow denumbering. */
export const ERROR_DENUM_NEEDED = -33006;
/** One or more formatter settings were rejected; `data` lists them. */
export const ERROR_INVALID_SETTINGS = -33007;
/** The program mixes numbered and unnumbered lines; `data` names the offending line. */
export const ERROR_MIXED_NUMBERING = -33008;
/** The formatter itself failed. */
export const ERROR_FORMAT_FAILED = -33009;

/** The kind token for a result that arrived but failed validation (never produced by the classifier). */
export const MALFORMED_RESULT_KIND = 'malformed-result';

/**
 * The most invalid-settings problems kept from one `-33007` answer. The peer caps its own
 * settings map at 64 entries, so this loses nothing a real peer sends.
 */
export const MAX_INVALID_SETTINGS_PROBLEMS = 64;

/** Every kind {@link classifyInteropError} can return. */
export type InteropErrorKind =
    | 'parser-exception' | 'timeout' | 'size-cap' | 'service-unavailable' | 'protected-program'
    | 'denum-needed' | 'invalid-settings' | 'mixed-numbering' | 'format-failed' | 'invalid-params'
    | 'method-not-found' | 'cancelled' | 'transport';

/** One rejected formatter setting from a `-33007` answer. */
export interface InvalidSettingsProblem {
    setting: string;
    message: string;
}

/** The typed payload of the two application errors whose `data` carries information. */
export type InteropErrorData =
    | { kind: 'invalid-settings'; problems: InvalidSettingsProblem[] }
    | { kind: 'mixed-numbering'; line: number | undefined };

/** The result of {@link classifyInteropError}. */
export interface ClassifiedInteropError {
    kind: InteropErrorKind;
    /** The error's numeric JSON-RPC code, or `undefined` when it has none (or a non-numeric one). */
    code: number | undefined;
    /** Exactly `error instanceof Error ? error.message : String(error)`. */
    message: string;
    /** Present only for `-33007` and `-33008`. */
    data?: InteropErrorData;
}

/** The kind for every code except the two handled before the table is consulted. */
const KIND_BY_CODE: ReadonlyMap<number, InteropErrorKind> = new Map<number, InteropErrorKind>([
    [ERROR_PARSE_FAILED, 'parser-exception'],
    [ERROR_TIMEOUT, 'timeout'],
    [ERROR_TOO_LARGE, 'size-cap'],
    [ERROR_SERVICE_UNAVAILABLE, 'service-unavailable'],
    [ERROR_PROTECTED_PROGRAM, 'protected-program'],
    [ERROR_DENUM_NEEDED, 'denum-needed'],
    [ERROR_INVALID_SETTINGS, 'invalid-settings'],
    [ERROR_MIXED_NUMBERING, 'mixed-numbering'],
    [ERROR_FORMAT_FAILED, 'format-failed'],
    [ErrorCodes.InvalidParams, 'invalid-params'],
]);

/** A plain object, as opposed to `null`, an array, or a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Builds the typed payload of a `-33007` answer from the peer's raw `data`. Only an array is
 * walked; an entry is kept only when it is a plain object whose `setting` and `message` are both
 * strings, and each kept entry is a fresh object holding just those two strings, each bounded to
 * {@link MAX_PEER_ERROR_LENGTH}. At most {@link MAX_INVALID_SETTINGS_PROBLEMS} entries are kept.
 * Anything that is not an array gives no problems.
 */
function invalidSettingsData(raw: unknown): InteropErrorData {
    const problems: InvalidSettingsProblem[] = [];
    if (Array.isArray(raw)) {
        for (const entry of raw) {
            if (problems.length >= MAX_INVALID_SETTINGS_PROBLEMS) {
                break;
            }
            if (!isPlainObject(entry)) {
                continue;
            }
            const setting = entry.setting;
            const message = entry.message;
            if (typeof setting === 'string' && typeof message === 'string') {
                problems.push({
                    setting: truncateText(setting, MAX_PEER_ERROR_LENGTH),
                    message: truncateText(message, MAX_PEER_ERROR_LENGTH)
                });
            }
        }
    }
    return { kind: 'invalid-settings', problems };
}

/**
 * Builds the typed payload of a `-33008` answer from the peer's raw `data`: the offending line
 * when the payload is a plain object whose `line` is a safe integer of at least 1, otherwise
 * `undefined`.
 */
function mixedNumberingData(raw: unknown): InteropErrorData {
    const line = isPlainObject(raw) ? raw.line : undefined;
    return {
        kind: 'mixed-numbering',
        line: typeof line === 'number' && Number.isSafeInteger(line) && line >= 1 ? line : undefined
    };
}

/**
 * Classifies one failure from a bbj-ls request into a kind token. The code is read duck-typed from
 * the error's own `code` property, and only when that property is a number: a plain object
 * rejection and a `ResponseError` with the same code classify identically, and a string or missing
 * code can never forge a known kind. A request the peer superseded or the caller cancelled
 * (`-32800`) is checked first; an unsupported method (`-32601`) is `method-not-found`; anything
 * without a known code (a plain `Error`, a connection error, a dropped in-flight request, the
 * breaker's short circuit, an unknown number, a non-error value) is `transport`. Never throws.
 *
 * The two application errors whose `data` carries information also return it typed. `-33007` gives
 * the list of rejected settings and `-33008` the offending line. The peer's `data` is never trusted
 * for shape or size, so each payload is built fresh from individually checked fields: an entry that
 * is not well formed is dropped, at most {@link MAX_INVALID_SETTINGS_PROBLEMS} entries are kept,
 * each string is bounded to {@link MAX_PEER_ERROR_LENGTH}, and nothing is ever spread or returned
 * from the peer's own object. Malformed `data` still yields the kind, with an empty payload. Control
 * characters are stripped later, where a payload becomes user-facing text.
 * @param error the value a request rejected with
 */
export function classifyInteropError(error: unknown): ClassifiedInteropError {
    const rawCode = (error as { code?: unknown } | null | undefined)?.code;
    const code = typeof rawCode === 'number' ? rawCode : undefined;
    const message = error instanceof Error ? error.message : String(error);
    let kind: InteropErrorKind;
    if (code === LSPErrorCodes.RequestCancelled) {
        kind = 'cancelled';
    } else if (code === ErrorCodes.MethodNotFound) {
        kind = 'method-not-found';
    } else {
        kind = (code !== undefined ? KIND_BY_CODE.get(code) : undefined) ?? 'transport';
    }
    const classified: ClassifiedInteropError = { kind, code, message };
    const rawData = (error as { data?: unknown } | null | undefined)?.data;
    if (code === ERROR_INVALID_SETTINGS) {
        classified.data = invalidSettingsData(rawData);
    } else if (code === ERROR_MIXED_NUMBERING) {
        classified.data = mixedNumberingData(rawData);
    }
    return classified;
}

/**
 * The warn-then-debug cadence for failure log lines: the first failure of a kind is logged at
 * warn, every repeat of that kind at debug, until {@link clear} (a success) or a change of
 * connection generation ({@link syncGeneration}) re-arms warn for every kind. The caller builds the
 * whole line, so nothing but what the caller passes can ever reach the log.
 */
export class FailureLogCadence {

    private readonly reportedKinds = new Set<string>();
    private lastSeenGeneration: number | string = -1;

    /** Re-arms warn for every kind when `generation` differs from the last one seen. */
    public syncGeneration(generation: number | string): void {
        if (generation !== this.lastSeenGeneration) {
            this.reportedKinds.clear();
            this.lastSeenGeneration = generation;
        }
    }

    /** Re-arms warn for every kind. */
    public clear(): void {
        this.reportedKinds.clear();
    }

    /** Logs `line` at warn if `kind` has not been reported since the last re-arm, else at debug. */
    public report(kind: string, line: string): void {
        if (this.reportedKinds.has(kind)) {
            logger.debug(line);
        } else {
            this.reportedKinds.add(kind);
            logger.warn(line);
        }
    }
}
