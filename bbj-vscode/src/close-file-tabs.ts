/******************************************************************************
 * Copyright 2026 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Closes the editor tabs that still hold a file whose content has just been replaced.
 *
 * A tokenized (binary) program opens in VS Code's binary placeholder editor. That tab is a
 * text-resource input (`TabInputText`) on the file's URI, shown by the binary editor because
 * the file is not text. VS Code keeps that verdict for as long as the tab stays open, so
 * opening the same file as text, after the program has been decompiled in place, is refused
 * ("Could NOT open editor"). Closing the tab first lets the document open as the source it now is.
 *
 * Everything here works on structural types, with no runtime `vscode` import, so the logic is
 * testable with plain objects.
 */
import * as fs from 'fs';
import * as path from 'path';

/** The part of a `vscode.Uri` a tab match needs. */
interface UriLike {
    readonly scheme?: string;
    readonly fsPath: string;
}

/** The part of a `vscode.Tab` the match and the close need. */
export interface TabLike {
    readonly input?: unknown;
    readonly isDirty?: boolean;
}

/** The part of a `vscode.TabGroup` the match and the close need. */
export interface TabGroupLike {
    readonly tabs: readonly TabLike[];
    readonly viewColumn?: number;
}

/** The part of `vscode.window.tabGroups` this module uses. */
export interface TabGroupsLike {
    readonly all: readonly TabGroupLike[];
    close(tabs: readonly TabLike[], preserveFocus?: boolean): PromiseLike<boolean>;
}

/** Whether two file-system paths name the same file; injectable so tests need no real files. */
export type SameFile = (a: string, b: string) => Promise<boolean>;

/** The file path of a tab whose input carries a `file:` URI, or undefined for any other tab. */
function filePathOfTab(tab: TabLike): string | undefined {
    const uri = (tab.input as { uri?: UriLike } | undefined)?.uri;
    if (!uri || typeof uri.fsPath !== 'string') {
        return undefined;
    }
    return uri.scheme === undefined || uri.scheme === 'file' ? uri.fsPath : undefined;
}

/**
 * Whether two paths are the same file. Equal normalised paths are; paths that differ only in
 * letter case are compared by device and inode, because the file system may or may not be case
 * insensitive (macOS and Windows usually are, Linux is not), and two names may not be assumed to
 * be one file just because they look alike.
 */
export const sameFile: SameFile = async (a, b) => {
    const left = path.normalize(a);
    const right = path.normalize(b);
    if (left === right) {
        return true;
    }
    if (left.toLowerCase() !== right.toLowerCase()) {
        return false;
    }
    try {
        const [first, second] = await Promise.all([fs.promises.stat(left), fs.promises.stat(right)]);
        return first.dev === second.dev && first.ino === second.ino;
    } catch {
        return false;
    }
};

/**
 * Closes every clean tab, in every tab group, whose input is one of `filePaths`, and returns the
 * view column of the group that held the first of them, if that group is still there. A tab with
 * unsaved changes is never closed: it is not the binary placeholder, and closing it would risk
 * the user's edits. Tabs on any other file, and inputs without a URI (diffs, webviews,
 * terminals), are left alone.
 *
 * @param tabGroups - `vscode.window.tabGroups`
 * @param filePaths - The path the user opened and, for a symbolic link, the real path behind it
 * @param same - How two paths are compared
 * @returns The view column to reopen the file in, or undefined when it has no tab to return to
 */
export async function closeTabsOnFiles(
    tabGroups: TabGroupsLike,
    filePaths: readonly (string | undefined)[],
    same: SameFile = sameFile
): Promise<number | undefined> {
    const targets = filePaths.filter((entry): entry is string => !!entry);
    const toClose: TabLike[] = [];
    let viewColumn: number | undefined;

    for (const group of tabGroups.all) {
        for (const tab of group.tabs) {
            const tabPath = filePathOfTab(tab);
            if (tabPath === undefined || tab.isDirty) {
                continue;
            }
            let matches = false;
            for (const target of targets) {
                if (await same(tabPath, target)) {
                    matches = true;
                    break;
                }
            }
            if (matches) {
                toClose.push(tab);
                viewColumn ??= group.viewColumn;
            }
        }
    }
    if (toClose.length === 0) {
        return undefined;
    }

    await tabGroups.close(toClose, true);

    // Closing the last tab of a group can remove the group; a column that is gone is not asked for.
    return tabGroups.all.some((group) => group.viewColumn === viewColumn) ? viewColumn : undefined;
}
