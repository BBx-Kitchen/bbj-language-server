/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The wire types and request constants for the bbj-ls `formatProgram` and `denumProgram`
 * methods, and the typed outcome every call to them ends in. Field names and meanings follow the
 * bbj-ls README ("Types"); optional fields are omitted from a request, never sent as `null`.
 *
 * Imports nothing but the JSON-RPC request type, so it is safe to share between the interop
 * client, the response guard and test doubles.
 */
import { RequestType } from 'vscode-jsonrpc/node.js';

/** A zero-based position; `character` counts UTF-16 code units, as in the language server protocol. */
export interface ProgramPosition {
    line: number;
    character: number;
}

/** A range between two positions; `end` is exclusive. */
export interface ProgramRange {
    start: ProgramPosition;
    end: ProgramPosition;
}

/** One replacement of a range of the document that was sent. */
export interface ProgramTextEdit {
    range: ProgramRange;
    newText: string;
}

export type ProgramSeverity = 'ERROR' | 'WARNING' | 'INFO';

/** One diagnostic BBj reported while formatting or denumbering. */
export interface ProgramDiagnostic {
    /**
     * One-based line in the result's own text. `0` means BBj gave no location; it is kept as `0`
     * and never coerced to line 1.
     */
    line: number;
    /** The line number the program carried before denumbering; `''` when unknown. */
    originalLineNumber: string;
    severity: ProgramSeverity;
    /** Plain text, already stripped of control characters and bounded in length. */
    message: string;
}

/** A formatter setting value; a value is never `null`. */
export type FormatSettingValue = string | number | boolean;

/** Parameters of the `formatProgram` request. */
export interface FormatProgramParams {
    /** The live editor text, passed in by the caller; the client never reads a file. */
    text: string;
    /** Always sent; the echo in the answer is verified before the answer is accepted. */
    version: string;
    /** The document's path, forwarded exactly as the caller gave it. Omitted when not known. */
    canonicalName?: string;
    /** Formatter settings by key. A value is never `null`; leave a setting out to use the default. */
    settings?: Record<string, FormatSettingValue>;
    /** Whether a numbered program may be denumbered as part of formatting. Omitted when not wanted. */
    allowDenum?: boolean;
    /** The range to format; omitted for the whole document. */
    range?: ProgramRange;
}

/** A validated whole-document format answer. */
export interface DocumentFormatResult {
    scope: 'document';
    text: string;
    diagnostics: ProgramDiagnostic[];
    denumbered: boolean;
    version: string;
}

/** A validated range format answer: no edit, or exactly one. */
export interface RangeFormatResult {
    scope: 'range';
    edits: ProgramTextEdit[];
    diagnostics: ProgramDiagnostic[];
    denumbered: boolean;
    version: string;
}

export type FormatProgramResult = DocumentFormatResult | RangeFormatResult;

/** Parameters of the `denumProgram` request. */
export interface DenumProgramParams {
    /** The live editor text, passed in by the caller; the client never reads a file. */
    text: string;
    /** Always sent; the echo in the answer is verified. */
    version: string;
    canonicalName?: string;
}

/** A validated `denumProgram` answer. */
export interface DenumProgramResult {
    text: string;
    diagnostics: ProgramDiagnostic[];
    denumbered: boolean;
    version: string;
}

export type ProgramMethod = 'formatProgram' | 'denumProgram';

/** One formatter setting the peer rejected, with the peer's reason. */
export interface ProgramSettingProblem {
    setting: string;
    message: string;
}

/** What kind of failure a `failed` outcome stands for. */
export type ProgramFailureKind =
    | 'parser-exception' | 'size-cap' | 'service-unavailable' | 'protected-program'
    | 'denum-needed' | 'format-failed' | 'invalid-params' | 'transport';

/**
 * What a format or DENUM call ends in. One line per variant:
 * - `ok`: the answer passed validation; `result` is a freshly built object.
 * - `cancelled`: the caller cancelled, or the peer answered that the request was superseded.
 * - `timeout`: the client deadline passed (`client`), or the peer reported its own (`peer`).
 * - `unavailable`: the method is not offered by the peer (`method-not-found`), or the dedicated
 *   connection could not be opened (`not-reachable`).
 * - `invalid-settings`: the peer rejected one or more formatter settings, listed per key.
 * - `mixed-numbering`: the program mixes numbered and unnumbered lines; `line` is the offender.
 * - `failed`: any other peer or transport failure. A peer answer that the service cannot serve
 *   right now is `failed` with `service-unavailable`, deliberately not `unavailable`: it can be
 *   transient.
 * - `malformed-result`: the peer answered, but the answer failed validation; `reason` is one of
 *   a fixed set of tokens and never contains peer text.
 */
export type ProgramOutcome<R> =
    | { kind: 'ok'; result: R }
    | { kind: 'cancelled' }
    | { kind: 'timeout'; origin: 'client' | 'peer' }
    | { kind: 'unavailable'; reason: 'method-not-found' | 'not-reachable' }
    | { kind: 'invalid-settings'; problems: ProgramSettingProblem[] }
    | { kind: 'mixed-numbering'; line: number | undefined }
    | { kind: 'failed'; failure: ProgramFailureKind; code: number | undefined; message: string }
    | { kind: 'malformed-result'; reason: string };

/**
 * Request type for whole-document and range formatting. The result generic is `unknown` on
 * purpose: the raw wire value is validated before it becomes a typed {@link FormatProgramResult}.
 */
export const formatProgramRequest = new RequestType<FormatProgramParams, unknown, null>('formatProgram');

/** Request type for denumbering; the result generic is `unknown` for the same reason as above. */
export const denumProgramRequest = new RequestType<DenumProgramParams, unknown, null>('denumProgram');
