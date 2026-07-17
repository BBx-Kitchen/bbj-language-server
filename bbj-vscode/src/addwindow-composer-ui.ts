/**
 * VS Code UI for the BBjSysGui::addWindow composer (#430).
 *
 * Thin client layer: a command + a Code Action, both opening the visual webview. All hex/flag
 * logic lives in the editor-agnostic ./addwindow-composer module. Two entry points:
 *   - Command "bbj.composeAddWindow" with no args -> compose a NEW addWindow statement at the cursor.
 *   - Code Action on an existing addWindow(...)   -> decode its flags/event_mask hex and edit the
 *                                                    tokens in place (or add flags where there are none).
 */
import * as vscode from 'vscode';
import {
    WINDOW_FLAGS, EVENT_MASK_BITS, unknownBits, describeFlags, findAddWindowCallAt,
} from './addwindow-composer.js';
import { openAddWindowComposerPanel, AddWindowPanelArg } from './addwindow-composer-webview.js';

export function registerAddWindowComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeAddWindow', (arg?: AddWindowPanelArg) => openAddWindowComposerPanel(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new AddWindowCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

class AddWindowCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const lineNo = range.start.line;
        const info = findAddWindowCallAt(document.lineAt(lineNo).text, range.start.character);
        if (!info) return [];

        const flags = info.flagsValue ?? 0;
        const eventMask = info.eventMaskValue ?? null;
        const arg: AddWindowPanelArg = {
            target: {
                uri: document.uri.toString(),
                line: lineNo,
                flagsRange: info.flagsRange,
                flagsInsertOffset: info.flagsInsertOffset,
                eventMaskRange: info.eventMaskRange,
                eventMaskInsertOffset: info.eventMaskInsertOffset,
                preservedFlagBits: unknownBits(flags, WINDOW_FLAGS),
                preservedEventBits: eventMask === null ? 0 : unknownBits(eventMask, EVENT_MASK_BITS),
            },
            initial: {
                flags, eventMask,
                // Geometry/title are fixed in the source in EDIT mode; pass the title for the preview.
                receiver: '', sysgui: 'sysgui!',
                x: '', y: '', width: '', height: '',
                title: titleArg(info.args),
            },
        };

        const label = info.flagsValue !== undefined
            ? `Configure window flags (${describeFlags(flags)})`
            : 'Add window flags…';
        const action = new vscode.CodeAction(label, vscode.CodeActionKind.RefactorRewrite);
        action.command = { command: 'bbj.composeAddWindow', title: label, arguments: [arg] };
        return [action];
    }
}

/** Best-effort pick of the title argument for the preview: the last string-literal arg before the flags. */
function titleArg(args: string[]): string {
    const literal = [...args].reverse().find(a => /^"([^"]|"")*"$/.test(a));
    return literal ?? '"Window"';
}
