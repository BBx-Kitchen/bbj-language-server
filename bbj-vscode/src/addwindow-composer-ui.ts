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

/**
 * Build the `AddWindowPanelArg` and Code Action label for the addWindow call at `character` on
 * `lineText`, or `undefined` if there is none. Shared by the Code Action provider and the
 * composer-cue click command (`composer-lens-command.ts`) so both entry points decode the same
 * call the same way.
 */
export function addWindowPanelArgAt(
    uri: string, line: number, lineText: string, character: number,
): { arg: AddWindowPanelArg; label: string } | undefined {
    const info = findAddWindowCallAt(lineText, character);
    if (!info) return undefined;

    const flags = info.flagsValue ?? 0;
    const eventMask = info.eventMaskValue ?? null;
    const arg: AddWindowPanelArg = {
        target: {
            uri,
            line,
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
    return { arg, label };
}

class AddWindowCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const lineNo = range.start.line;
        const result = addWindowPanelArgAt(document.uri.toString(), lineNo, document.lineAt(lineNo).text, range.start.character);
        if (!result) return [];

        const action = new vscode.CodeAction(result.label, vscode.CodeActionKind.RefactorRewrite);
        action.command = { command: 'bbj.composeAddWindow', title: result.label, arguments: [result.arg] };
        return [action];
    }
}

/** Best-effort pick of the title argument for the preview: the last string-literal arg before the flags. */
function titleArg(args: string[]): string {
    const literal = [...args].reverse().find(a => /^"([^"]|"")*"$/.test(a));
    return literal ?? '"Window"';
}
