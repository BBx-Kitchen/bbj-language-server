/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The "Denumber BBj Program" command (`bbj.denumber`).
 *
 * No `vscode` import here, intentionally: every editor and client function arrives through
 * {@link DenumberCommandDeps}, so the module is unit-testable with plain stubs.
 *
 * The language server presents every DENUM outcome and applies the edit itself, leaving the buffer
 * unsaved for the user to review. The command therefore only resolves a target, makes sure the
 * document is open and shown, and sends the request; it words nothing of its own and ignores the
 * result. It never retries: a document opened through `openDocument` has already been announced to
 * the server on the same connection, so a retry would only repeat the server's own "not open"
 * message. Nothing in this module saves, writes or launches anything.
 */

import * as path from 'path';
import { NO_ACTIVE_BBJ_FILE_MESSAGE, resolveRunTarget, type ActiveEditorSnapshot } from './Commands/target-resolution.js';
import type { DenumParams, DenumResult } from './language/denum-command.js';

/** The slice of an opened text document the command needs: its URI. */
export interface DenumberDocument {
    readonly uri: { toString(): string };
}

/** Everything the command needs from the editor host and the language client. */
export interface DenumberCommandDeps<D extends DenumberDocument> {
    /** The active editor reduced to its file name and language id, or undefined when there is none. */
    activeEditor(): ActiveEditorSnapshot | undefined;
    /**
     * Whether the file at this path is a tokenized (binary) BBj program, which has no line numbers
     * to remove. A rejection counts as "not tokenized".
     */
    isTokenized(fsPath: string): Promise<boolean>;
    /** Opens (or returns the already open) document for a file system path. */
    openDocument(fsPath: string): PromiseLike<D>;
    /** Whether an editor currently shows the document with this URI string. */
    isVisible(uri: string): boolean;
    /** Shows the document in an editor. */
    show(document: D): PromiseLike<unknown>;
    /** Marks a document so the line-numbered open prompt stays quiet for it. */
    skipOpenPrompt(uri: string): void;
    /** Sends the `bbj/denum` request through the shared language client. */
    sendDenum(params: DenumParams): PromiseLike<DenumResult>;
    /** Shows a warning message. */
    warn(message: string): void;
    /** Shows an error message. */
    error(message: string): void;
}

/** The one message the client words itself: the request was rejected or the file could not be opened. */
export function denumberFailedMessage(error: unknown): string {
    return `Denumber failed: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * The warning shown instead of VS Code's raw "binary file" error when the target is a tokenized
 * program. It points at the command that applies; the user runs it themselves.
 */
export function tokenizedProgramMessage(fsPath: string): string {
    return `"${path.basename(fsPath)}" is a tokenized (binary) BBj program. Use "Decompile Tokenized BBj Program" first.`;
}

/** Reads `fsPath` from a command argument, accepting only a non-empty string on an object. */
function fsPathOf(argument: unknown): string | undefined {
    if (typeof argument !== 'object' || argument === null) {
        return undefined;
    }
    const fsPath = (argument as { fsPath?: unknown }).fsPath;
    return typeof fsPath === 'string' && fsPath.length > 0 ? fsPath : undefined;
}

/**
 * Builds the command handler. The argument is whatever the host passes: a `Uri` from the Explorer,
 * the editor title or the prompt button, or nothing from a keybinding or the Command Palette. Any
 * further arguments (the Explorer's selection array) are ignored.
 */
export function createDenumberCommand<D extends DenumberDocument>(
    deps: DenumberCommandDeps<D>
): (argument?: unknown) => Promise<void> {
    return async (argument?: unknown): Promise<void> => {
        const target = resolveRunTarget(fsPathOf(argument), deps.activeEditor());
        if (!target) {
            deps.warn(NO_ACTIVE_BBJ_FILE_MESSAGE);
            return;
        }
        let tokenized = false;
        try {
            tokenized = await deps.isTokenized(target);
        } catch {
            // A probe that cannot answer is not a reason to refuse: the normal flow reports its own errors.
        }
        if (tokenized) {
            deps.warn(tokenizedProgramMessage(target));
            return;
        }
        try {
            const document = await deps.openDocument(target);
            const uri = document.uri.toString();
            deps.skipOpenPrompt(uri);
            if (!deps.isVisible(uri)) {
                await deps.show(document);
            }
            await deps.sendDenum({ uri });
        } catch (error) {
            deps.error(denumberFailedMessage(error));
        }
    };
}
