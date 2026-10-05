/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Prompts offered when a tab or the active editor turns out to hold a tokenized (binary)
 * or line-numbered BBj program — decompile it in place or denumber it, or open it read-only.
 * `registerOpenFilePrompts` owns both listeners and their per-activation "already prompted"
 * state; nothing here is module-level.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import Commands from './Commands/Commands.cjs';
import { probeTokenizedFile } from './decompile-io.js';
import { isLineNumberedSource } from './line-numbering.js';

/** Extract a file URI from any tab whose input carries one (text, custom, notebook…). */
function uriFromTab(tab: vscode.Tab): vscode.Uri | undefined {
    const input = tab.input as { uri?: vscode.Uri } | undefined;
    return input?.uri instanceof vscode.Uri ? input.uri : undefined;
}

/**
 * When a tokenized (binary) BBj program is opened, offer to decompile it to
 * editable source (replacing the file) or open a read-only decompiled copy (#65).
 * Detection is content-based (magic bytes), so it works regardless of the file's
 * extension — tokenized programs are often named `.pub`, `.src`, or extensionless.
 */
async function maybePromptTokenized(
    uri: vscode.Uri | undefined,
    promptedTokenizedFiles: Set<string>,
    deps: OpenFilePromptDeps
): Promise<void> {
    if (!uri || uri.scheme !== 'file') return;
    if (!vscode.workspace.getConfiguration('bbj').get<boolean>('decompile.promptOnOpen', true)) return;

    const key = uri.toString();
    if (promptedTokenizedFiles.has(key)) return;
    // Reserve synchronously: the same file can surface from both the tab-change
    // event and the activation scan, and we must not prompt (or decompile) twice.
    promptedTokenizedFiles.add(key);

    const probe = await probeTokenizedFile(uri.fsPath);
    if (probe.kind !== 'tokenized') {
        // Not tokenized after all, or not checkable — allow a later check (e.g. if the file
        // changes). An unreadable file is only logged: opening a file must not raise a popup.
        promptedTokenizedFiles.delete(key);
        if (probe.kind === 'unreadable') {
            deps.log(`Could not check whether "${path.basename(uri.fsPath)}" is a tokenized BBj program: ${probe.message}`);
        }
        return;
    }

    const decompileAction = 'Decompile & Replace';
    const readOnlyAction = 'Open Read-only';
    const choice = await vscode.window.showInformationMessage(
        `"${path.basename(uri.fsPath)}" is a tokenized (binary) BBj program. Decompile it to editable source, or open a read-only copy?`,
        decompileAction, readOnlyAction
    );
    if (choice === decompileAction) {
        Commands.decompileReplace(uri);
    } else if (choice === readOnlyAction) {
        Commands.decompileReadonly(uri);
    }
}

/**
 * When a line-numbered BBj program is opened, ask whether to denumber it for editing or open it
 * read-only (issue #64).
 */
async function maybePromptLineNumbered(editor: vscode.TextEditor | undefined, promptedLineNumberedDocs: Set<string>): Promise<void> {
    if (!editor) return;
    const doc = editor.document;
    if (doc.languageId !== 'bbj' || doc.uri.scheme !== 'file') return;
    if (!vscode.workspace.getConfiguration('bbj').get<boolean>('denumber.promptOnOpen', true)) return;

    const key = doc.uri.toString();
    if (promptedLineNumberedDocs.has(key)) return;
    if (!isLineNumberedSource(doc.getText())) return;
    promptedLineNumberedDocs.add(key);

    const denumberAction = 'Denumber';
    const readOnlyAction = 'Open Read-only';
    const choice = await vscode.window.showInformationMessage(
        `"${path.basename(doc.fileName)}" is a line-numbered BBj program. Denumber it for editing, or open it read-only?`,
        denumberAction, readOnlyAction
    );
    if (choice === denumberAction) {
        // Runs the Denumber BBj Program command: the language server denumbers the open buffer
        // and leaves it unsaved for the user to review.
        vscode.commands.executeCommand('bbj.denumber', doc.uri);
    } else if (choice === readOnlyAction) {
        // Make sure our editor is the active one before flipping it read-only in-session,
        // in case the user navigated away while the prompt was open.
        await vscode.window.showTextDocument(doc, { preview: false });
        await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
    }
}

/** What the open-file prompts need from the extension. */
export interface OpenFilePromptDeps {
    /** Writes one line to the BBj output channel. */
    log(line: string): void;
}

/** What the rest of the extension may do to the prompts wired by {@link registerOpenFilePrompts}. */
export interface OpenFilePrompts {
    /**
     * Marks a document as already handled for this activation, so the line-numbered prompt does not
     * appear for a document the Denumber command is about to show.
     */
    skipLineNumberedPrompt(uri: string): void;
}

/**
 * Wires both open-file prompts (tokenized and line-numbered) for this activation: the tab-change
 * listener plus a scan of already-open tabs for the tokenized prompt, and the active-editor
 * listener plus a check of the already-active editor for the line-numbered prompt.
 */
export function registerOpenFilePrompts(
    context: vscode.ExtensionContext,
    deps: OpenFilePromptDeps = { log: () => { } }
): OpenFilePrompts {
    // Tracks files we've already prompted about this session so re-focusing the tab
    // (or reopening it) doesn't nag the user again.
    const promptedTokenizedFiles = new Set<string>();
    // Tracks documents we've already prompted about this session, so switching
    // back to a line-numbered editor doesn't nag the user again.
    const promptedLineNumberedDocs = new Set<string>();

    // Offer to decompile (or open read-only) when a tokenized/binary BBj program is
    // opened. Tokenized files are binary, so they may open in a non-text editor —
    // the Tabs API sees them regardless, and detection reads the file's magic bytes.
    context.subscriptions.push(
        vscode.window.tabGroups.onDidChangeTabs((event) => {
            for (const tab of event.opened) {
                void maybePromptTokenized(uriFromTab(tab), promptedTokenizedFiles, deps);
            }
        })
    );
    // Inspect tabs already open when the extension activates.
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            void maybePromptTokenized(uriFromTab(tab), promptedTokenizedFiles, deps);
        }
    }

    // Offer to denumber (or open read-only) when a line-numbered BBj program is opened.
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => { void maybePromptLineNumbered(editor, promptedLineNumberedDocs); })
    );
    // Handle the editor that is already active when the extension activates.
    void maybePromptLineNumbered(vscode.window.activeTextEditor, promptedLineNumberedDocs);

    return {
        skipLineNumberedPrompt(uri: string): void {
            promptedLineNumberedDocs.add(uri);
        },
    };
}
