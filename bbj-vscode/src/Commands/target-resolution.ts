/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Pure target resolution for the seven BBj run/compile/decompile commands
 * (issue #512): Run, Run BUI, Run DWC, Compile, Denumber, Decompile (Replace)
 * and Decompile (Read-only).
 *
 * Every command resolves its target argument-first, then an active-editor
 * fallback, then — when neither is available — the caller shows one shared
 * warning instead of dereferencing an undefined `params.fsPath`.
 *
 * The active-editor fallback accepts only what the command's own menu `when`
 * clause would accept: `(resourceLangId == bbj && resourceExtname != .bbjt) ||
 * resourceLangId == bbx` in `package.json`. No language with id `bbx` is ever
 * declared there (`.bbx` files carry language id `bbj`), so only the live half
 * of that clause is mirrored here. The two Decompile commands have no menu
 * entry and accept tokenized binaries, so their fallback only requires the
 * `bbj` language id, including `.bbjt`.
 *
 * No `vscode` import here, intentionally: every function takes plain
 * primitives, so this module is unit-testable with zero mocks.
 */

import * as path from 'path';

/** Shown when no argument was passed and no active editor qualifies as a BBj file. */
export const NO_ACTIVE_BBJ_FILE_MESSAGE = 'No active BBj file. Open or select a BBj file and try again.';

export interface ActiveEditorSnapshot {
    fileName: string;
    languageId: string;
}

/**
 * Narrows a live `vscode.window.activeTextEditor`-shaped value down to the
 * plain fields this module needs, or `undefined` when there is no active editor.
 */
export function toActiveEditorSnapshot(
    editor: { document: { fileName: string; languageId: string } } | undefined
): ActiveEditorSnapshot | undefined {
    if (!editor) {
        return undefined;
    }
    return { fileName: editor.document.fileName, languageId: editor.document.languageId };
}

/**
 * Whether `doc` is a document the run/compile/denumber menus' `when` clause
 * would accept as the active editor: language id `bbj`, extension not `.bbjt`.
 */
export function isRunnableBbjDocument(doc: ActiveEditorSnapshot): boolean {
    return doc.languageId === 'bbj' && path.extname(doc.fileName) !== '.bbjt';
}

/**
 * Resolves the target for Run, Run BUI, Run DWC, Compile and Denumber: the
 * passed argument's `fsPath` wins, used as-is with no language check; otherwise
 * the active editor when it passes {@link isRunnableBbjDocument}; otherwise
 * `undefined`, meaning the caller should show {@link NO_ACTIVE_BBJ_FILE_MESSAGE}.
 */
export function resolveRunTarget(
    argFsPath: string | undefined,
    active: ActiveEditorSnapshot | undefined
): string | undefined {
    if (argFsPath) {
        return argFsPath;
    }
    if (active && isRunnableBbjDocument(active)) {
        return active.fileName;
    }
    return undefined;
}

/**
 * Resolves the target for Decompile (Replace) and Decompile (Read-only): the
 * same argument-first order as {@link resolveRunTarget}, but the active-editor
 * fallback only requires language id `bbj` — a `.bbjt` document is accepted.
 */
export function resolveDecompileTarget(
    argFsPath: string | undefined,
    active: ActiveEditorSnapshot | undefined
): string | undefined {
    if (argFsPath) {
        return argFsPath;
    }
    if (active && active.languageId === 'bbj') {
        return active.fileName;
    }
    return undefined;
}
