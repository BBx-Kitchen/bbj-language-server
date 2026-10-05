/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The two notifications a DENUM run pushes to a host: the list of DENUM's diagnostics after a
 * successful run (`bbj/denumDiagnostics`), and the request to reveal that list when the user picks
 * Show (`bbj/showDenumDiagnostics`). Mirrors `format-settings-notification.ts`: method-name
 * constants and plain-JSON payload types, no imports at all, so the server and any host's client
 * code can use it.
 *
 * A host shows the list as text, or as problems on the document. The uri only selects a document
 * the host already has open, and a line only places an entry inside that document, clamped to its
 * lines. No payload field ever becomes a command, a command argument, a link or a path to open, and
 * a host must ignore any payload of the reveal notification: that notification only means "show
 * the list you already hold".
 */

/**
 * The LSP custom-notification method name for the diagnostics list. This is the single owner of
 * this method string; every sender and every handler imports this constant.
 */
export const DENUM_DIAGNOSTICS_METHOD = 'bbj/denumDiagnostics';

/**
 * The LSP custom-notification method name asking a host to reveal the diagnostics list. This is the
 * single owner of this method string; every sender and every handler imports this constant.
 */
export const SHOW_DENUM_DIAGNOSTICS_METHOD = 'bbj/showDenumDiagnostics';

/** One diagnostic DENUM reported. */
export interface DenumDiagnosticDto {
    /**
     * One-based line in the denumbered text the buffer now holds. `0` means no location.
     */
    line: number;
    /** The number the line carried before denumbering; `''` when unknown. */
    originalLineNumber: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    /** Plain text, already stripped of control characters and bounded in length by the interop guard. */
    message: string;
}

/** Payload of a `bbj/denumDiagnostics` notification. */
export interface DenumDiagnosticsParams {
    /** The document that was denumbered. */
    uri: string;
    diagnostics: DenumDiagnosticDto[];
    /**
     * The document version the list was computed for, as the server's open-document store saw it.
     * Absent means the server could not confirm the version, so a host must not place the list on
     * the document and keeps the text copy only.
     */
    version?: number;
}
