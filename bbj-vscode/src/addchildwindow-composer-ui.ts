/**
 * VS Code UI for the BBjWindow::addChildWindow composer (#473).
 *
 * Thin client layer: a command + a Code Action, both opening the visual webview. All hex/flag
 * logic lives in the editor-agnostic ./addchildwindow-composer module. Two entry points:
 *   - Command "bbj.composeAddChildWindow" with no args -> compose a NEW addChildWindow statement
 *     at the cursor.
 *   - Code Action on an existing addChildWindow(...) -> decode its flags/event_mask hex and edit
 *     the tokens in place (or add flags where there are none).
 */
import * as vscode from 'vscode';
import {
    CHILD_WINDOW_FLAGS, CHILD_EVENT_MASK_BITS, unknownBits, describeChildFlags, findAddChildWindowCallAt,
} from './addchildwindow-composer.js';
import { openAddChildWindowComposerPanel, AddChildWindowPanelArg } from './addchildwindow-composer-webview.js';

export function registerAddChildWindowComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeAddChildWindow', (arg?: AddChildWindowPanelArg) => openAddChildWindowComposerPanel(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new AddChildWindowCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

class AddChildWindowCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const lineNo = range.start.line;
        const info = findAddChildWindowCallAt(document.lineAt(lineNo).text, range.start.character);
        if (!info) return [];

        const flags = info.flagsValue ?? 0;
        const eventMask = info.eventMaskValue ?? null;
        const arg: AddChildWindowPanelArg = {
            target: {
                uri: document.uri.toString(),
                line: lineNo,
                flagsRange: info.flagsRange,
                flagsInsertOffset: info.flagsInsertOffset,
                eventMaskRange: info.eventMaskRange,
                eventMaskInsertOffset: info.eventMaskInsertOffset,
                preservedFlagBits: unknownBits(flags, CHILD_WINDOW_FLAGS),
                preservedEventBits: eventMask === null ? 0 : unknownBits(eventMask, CHILD_EVENT_MASK_BITS),
            },
            initial: {
                flags, eventMask,
                // Geometry/title are fixed in the source in EDIT mode; pass the title for the preview.
                receiver: '', window: 'window!', id: '', context: '',
                x: '', y: '', width: '', height: '',
                title: titleArg(info.args),
            },
        };

        // Only offer the action when there is something to rewrite: an existing flags literal, or a
        // spot to add one (the no-title overloads cannot take flags).
        if (info.flagsValue === undefined && info.flagsInsertOffset === undefined) return [];
        const label = info.flagsValue !== undefined
            ? `Configure child window flags (${describeChildFlags(flags)})`
            : 'Add child window flags…';
        const action = new vscode.CodeAction(label, vscode.CodeActionKind.RefactorRewrite);
        action.command = { command: 'bbj.composeAddChildWindow', title: label, arguments: [arg] };
        return [action];
    }
}

/** Best-effort pick of the title argument for the preview: the last string-literal arg. */
function titleArg(args: string[]): string {
    const literal = [...args].reverse().find(a => /^"([^"]|"")*"$/.test(a));
    return literal ?? '"Child"';
}
