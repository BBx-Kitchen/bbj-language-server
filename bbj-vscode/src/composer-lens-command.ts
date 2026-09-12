/**
 * VS Code implementation of `bbj.openComposerAt` (#650): the command a composer cue's `Command`
 * invokes when clicked. Resolves the target document only from already-open
 * `vscode.workspace.textDocuments` — never a filesystem load — re-decodes the call from the
 * document's CURRENT text at click time, and never edits the document itself; the composer panel
 * it opens is the only place an edit can happen, and only after the user acts inside it.
 */
import * as vscode from 'vscode';
import {
    COMPOSER_LENS_TITLES, COMPOSER_LENS_COMMAND, LENS_TARGET_GONE_TEXT, type ComposerLensTarget,
} from './composer-lens-contract.js';
import { addWindowPanelArgAt } from './addwindow-composer-ui.js';
import { openAddWindowComposerPanel } from './addwindow-composer-webview.js';

/** Register the `bbj.openComposerAt` command a composer cue's click invokes. */
export function registerComposerLensCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMPOSER_LENS_COMMAND, (target: ComposerLensTarget) => openComposerAt(context, target)),
    );
}

/**
 * Dispatch a cue click to its composer. Only `'addwindow'` opens a panel today; every other kind
 * shows an information message naming its title, since this build does not yet wire that
 * composer to a cue click.
 */
export async function openComposerAt(context: vscode.ExtensionContext, target: ComposerLensTarget): Promise<void> {
    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === target.uri);
    if (!document) {
        vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
        return;
    }
    if (target.line < 0 || target.line >= document.lineCount) {
        vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
        return;
    }

    if (target.kind === 'addwindow') {
        const lineText = document.lineAt(target.line).text;
        const result = addWindowPanelArgAt(target.uri, target.line, lineText, target.character);
        if (!result) {
            vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
            return;
        }
        openAddWindowComposerPanel(context, result.arg);
        return;
    }

    vscode.window.showInformationMessage(
        `${COMPOSER_LENS_TITLES[target.kind]} is not yet available from a cue click in this build.`,
    );
}
