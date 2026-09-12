/**
 * VS Code implementation of `bbj.openComposerAt` (#650): the command a composer cue's `Command`
 * invokes when clicked. Resolves the target document only from already-open
 * `vscode.workspace.textDocuments` — never a filesystem load — re-decodes the call from the
 * document's CURRENT text at click time, and never edits the document itself; the composer panel
 * it opens (or, for `setopts-in-code`, the `bbj.composeSetoptsInCode` command it delegates to) is
 * the only place an edit can happen, and only after the user acts inside it.
 */
import * as vscode from 'vscode';
import {
    COMPOSER_LENS_TITLES, COMPOSER_LENS_COMMAND, LENS_TARGET_GONE_TEXT, type ComposerLensTarget,
} from './composer-lens-contract.js';
import { addWindowPanelArgAt } from './addwindow-composer-ui.js';
import { openAddWindowComposerPanel } from './addwindow-composer-webview.js';
import { addChildWindowPanelArgAt } from './addchildwindow-composer-ui.js';
import { openAddChildWindowComposerPanel } from './addchildwindow-composer-webview.js';
import { decodeMsgboxCall } from './msgbox-composer.js';
import { msgboxPanelArgFromDecode } from './msgbox-composer-ui.js';
import { openMsgboxComposerPanel } from './msgbox-composer-webview.js';
import { cvsPanelArgAt } from './cvs-composer-ui.js';
import { openCvsComposerPanel } from './cvs-composer-webview.js';
import { setoptsConfigPanelArgAt } from './setopts-composer-ui.js';
import { openSetOptsComposerPanel } from './setopts-composer-webview.js';

/** Register the `bbj.openComposerAt` command a composer cue's click invokes. */
export function registerComposerLensCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMPOSER_LENS_COMMAND, (target: ComposerLensTarget) => openComposerAt(context, target)),
    );
}

/**
 * Dispatch a cue click to its composer, re-decoding the call from the document's CURRENT text at
 * click time so a stale cue degrades to {@link LENS_TARGET_GONE_TEXT} rather than editing the
 * wrong text. `setopts-in-code` delegates to `bbj.composeSetoptsInCode`, which re-decodes
 * server-side and routes to the right panel or reason message itself. `setopts-config` re-decodes
 * the config-file line via `setoptsConfigPanelArgAt` — the same argument shape the SETOPTS Code
 * Action builds — and opens the existing SETOPTS composer panel.
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
    const lineText = document.lineAt(target.line).text;

    switch (target.kind) {
        case 'addwindow': {
            const result = addWindowPanelArgAt(target.uri, target.line, lineText, target.character);
            if (!result) {
                vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
                return;
            }
            openAddWindowComposerPanel(context, result.arg);
            return;
        }
        case 'msgbox': {
            const decoded = decodeMsgboxCall(lineText, target.character);
            const result = msgboxPanelArgFromDecode(target.uri, target.line, lineText, decoded);
            if (!result) {
                vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
                return;
            }
            openMsgboxComposerPanel(context, result.arg);
            return;
        }
        case 'addchildwindow': {
            const result = addChildWindowPanelArgAt(target.uri, target.line, lineText, target.character);
            if (!result) {
                vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
                return;
            }
            openAddChildWindowComposerPanel(context, result.arg);
            return;
        }
        case 'cvs': {
            const result = cvsPanelArgAt(target.uri, target.line, lineText, target.character);
            if (!result) {
                vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
                return;
            }
            openCvsComposerPanel(context, result.arg);
            return;
        }
        case 'setopts-in-code': {
            await vscode.commands.executeCommand('bbj.composeSetoptsInCode', {
                uri: target.uri, line: target.line, character: target.character,
            });
            return;
        }
        case 'setopts-config': {
            const arg = setoptsConfigPanelArgAt(target.uri, target.line, lineText);
            if (!arg) {
                vscode.window.showInformationMessage(LENS_TARGET_GONE_TEXT);
                return;
            }
            openSetOptsComposerPanel(context, arg);
            return;
        }
        default:
            vscode.window.showInformationMessage(
                `${COMPOSER_LENS_TITLES[target.kind]} is not yet available from a cue click in this build.`,
            );
    }
}
