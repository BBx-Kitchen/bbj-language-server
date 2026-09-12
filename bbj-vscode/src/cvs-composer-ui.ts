/**
 * VS Code UI for the CVS() composer (#649).
 *
 * Thin client layer: a command + a Code Action, both opening the visual webview. All mask/decode
 * logic lives in the editor-agnostic ./cvs-composer module. Two entry points:
 *   - Command "bbj.composeCvs" is position-aware (#649 gap closure): a `CvsPanelArg` argument
 *     (the lightbulb's) opens unchanged; otherwise it decodes the cursor — an editable call opens
 *     edit mode, an incomplete call opens complete-the-call mode, a hard-stop reason shows a
 *     message, and only a cursor with no CVS call under it composes a NEW call at the cursor.
 *   - Code Action on a CVS(...) call whose mask is editable, or that has no mask yet, offers the
 *     matching compose action; a non-literal or undocumented-bit mask gets no action.
 */
import * as vscode from 'vscode';
import { decodeCvsCall, describeCvsMask, encodeCvsMask } from './cvs-composer.js';
import { openCvsComposerPanel, type CvsPanelArg } from './cvs-composer-webview.js';

export function registerCvsComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeCvs', (arg?: unknown) => runComposeCvsCommand(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new CvsCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

/** True for a `CvsPanelArg` — the lightbulb's own argument shape (a `target` and/or `initial` key). */
function isCvsPanelArg(arg: unknown): arg is CvsPanelArg {
    return typeof arg === 'object' && arg !== null && ('target' in arg || 'initial' in arg);
}

/**
 * `bbj.composeCvs` without a panel argument decodes the caret position first, so the Command
 * Palette and the editor context menu never nest a whole new call inside a partial or existing
 * one: an editable call opens edit mode, an incomplete call opens complete-the-call mode, a
 * not-editable call shows the server's reason and opens no panel, and only a cursor with no CVS
 * call under it falls through to compose-new at the cursor (unchanged).
 * A `CvsPanelArg` argument — what the lightbulb and the composer cue both pass — opens exactly
 * that argument without consulting the active editor at all.
 */
export function runComposeCvsCommand(context: vscode.ExtensionContext, arg?: unknown): void {
    if (isCvsPanelArg(arg)) {
        openCvsComposerPanel(context, arg);
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const position = editor.selection.active;
        const lineText = editor.document.lineAt(position.line).text;
        const result = cvsPanelArgAt(editor.document.uri.toString(), position.line, lineText, position.character);
        if (result) {
            openCvsComposerPanel(context, result.arg);
            return;
        }
        const decoded = decodeCvsCall(lineText, position.character);
        if (decoded.found && decoded.reason) {
            vscode.window.showInformationMessage(decoded.reason);
            return;
        }
    }

    openCvsComposerPanel(context);
}

/**
 * Build the `CvsPanelArg` and Code Action label for the CVS() call at `character` on `lineText`.
 * Returns `undefined` when there is no call, or the call has a mask that is not safely editable
 * (a non-literal or undocumented-bit mask, which gets no lightbulb action). An editable
 * literal-sum call opens the "Configure CVS() options" edit-in-place panel; an unfinished or
 * mask-less call (`incomplete`) opens the "Complete CVS() call…" panel instead, which composes a
 * whole call and replaces the call's span. Shared by the Code Action provider and any future cue
 * dispatcher so every entry point decodes the same call the same way.
 */
export function cvsPanelArgAt(
    uri: string, line: number, lineText: string, character: number,
): { arg: CvsPanelArg; label: string } | undefined {
    const decoded = decodeCvsCall(lineText, character);

    if (decoded.found && decoded.editable && decoded.edit && decoded.initial) {
        const callText = lineText.slice(decoded.edit.callStart, decoded.edit.callEnd);
        const arg: CvsPanelArg = {
            target: {
                uri,
                line,
                callStart: decoded.edit.callStart,
                callEnd: decoded.edit.callEnd,
                callText,
                trailingArgs: decoded.trailingArgs ?? [],
            },
            initial: decoded.initial,
        };
        const label = `Configure CVS() options (${describeCvsMask(encodeCvsMask(decoded.initial.bits))})`;
        return { arg, label };
    }

    if (decoded.found && decoded.incomplete && decoded.edit && decoded.initial) {
        const callText = lineText.slice(decoded.edit.callStart, decoded.edit.callEnd);
        const arg: CvsPanelArg = {
            target: {
                uri,
                line,
                callStart: decoded.edit.callStart,
                callEnd: decoded.edit.callEnd,
                callText,
                trailingArgs: decoded.trailingArgs ?? [],
                incomplete: true,
            },
            initial: decoded.initial,
        };
        return { arg, label: 'Complete CVS() call…' };
    }

    return undefined;
}

class CvsCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const lineNo = range.start.line;
        const result = cvsPanelArgAt(document.uri.toString(), lineNo, document.lineAt(lineNo).text, range.start.character);
        if (!result) return [];

        const action = new vscode.CodeAction(result.label, vscode.CodeActionKind.RefactorRewrite);
        action.command = { command: 'bbj.composeCvs', title: result.label, arguments: [result.arg] };
        return [action];
    }
}
