/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { URI } from 'vscode-uri';
import type { DenumDiagnosticsParams } from './language/denum-notifications.js';

/**
 * Renders the payload of a `bbj/denumDiagnostics` notification as output lines: a header naming
 * the file, then one line per diagnostic. The payload is rendered as text only; nothing in it is
 * ever interpreted as a command, a path to open or a location to jump to.
 *
 * This module imports nothing from `vscode`, so the rendering is tested without any host mock.
 */
export function formatDenumDiagnosticsBlock(params: unknown): string[] {
    const payload = params as DenumDiagnosticsParams;
    const lines = [`Denumber diagnostics for ${displayPath(payload.uri)}:`];
    for (const diagnostic of payload.diagnostics) {
        lines.push(`  line ${diagnostic.line} (original ${diagnostic.originalLineNumber}) ${diagnostic.severity}: ${diagnostic.message}`);
    }
    return lines;
}

function displayPath(uri: string): string {
    try {
        const parsed = URI.parse(uri, true);
        return parsed.scheme === 'file' ? parsed.fsPath : uri;
    } catch {
        return uri;
    }
}
