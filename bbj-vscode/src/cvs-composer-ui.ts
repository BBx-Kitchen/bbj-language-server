/**
 * VS Code UI for the CVS() composer (#649, DISC-03).
 *
 * Thin client layer: a command + a Code Action, both opening the visual webview. All mask/decode
 * logic lives in the editor-agnostic ./cvs-composer module. Two entry points:
 *   - Command "bbj.composeCvs" with no args -> compose a NEW CVS() call at the cursor.
 *   - Code Action on an existing CVS(...) call with a literal-sum mask -> decode its bits/chars
 *     and edit them in place.
 */
import * as vscode from 'vscode';
import { decodeCvsCall, describeCvsMask, encodeCvsMask } from './cvs-composer.js';
import { openCvsComposerPanel, type CvsPanelArg } from './cvs-composer-webview.js';

export function registerCvsComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeCvs', (arg?: CvsPanelArg) => openCvsComposerPanel(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new CvsCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

/**
 * Build the `CvsPanelArg` and Code Action label for the CVS() call at `character` on `lineText`,
 * or `undefined` when there is none, or the call is present but not safely editable (a missing,
 * non-literal or undocumented-bit mask — D-14). Shared by the Code Action provider and any future
 * cue dispatcher so both entry points decode the same call the same way.
 */
export function cvsPanelArgAt(
    uri: string, line: number, lineText: string, character: number,
): { arg: CvsPanelArg; label: string } | undefined {
    const decoded = decodeCvsCall(lineText, character);
    if (!decoded.found || !decoded.editable || !decoded.edit || !decoded.initial) return undefined;

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
