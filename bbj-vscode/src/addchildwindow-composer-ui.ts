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
    CHILD_WINDOW_FLAGS, CHILD_EVENT_MASK_BITS, describeChildFlags, findAddChildWindowCallAt,
} from './addchildwindow-composer.js';
import { openAddChildWindowComposerPanel, AddChildWindowPanelArg } from './addchildwindow-composer-webview.js';
import { windowPanelArgAt, CHILD_WINDOW_TITLE_FALLBACK, type WindowPanelArgSpec } from './window-composer-ui.js';

/** Fixed addChildWindow-only initial fields, merged alongside flags/eventMask/title by windowPanelArgAt. */
interface AddChildWindowFixedInitial {
    receiver: string;
    window: string;
    id: string;
    context: string;
    x: string;
    y: string;
    width: string;
    height: string;
}

const ADD_CHILD_WINDOW_SPEC: WindowPanelArgSpec<AddChildWindowFixedInitial> = {
    findCallAt: findAddChildWindowCallAt,
    flagCatalog: CHILD_WINDOW_FLAGS,
    eventCatalog: CHILD_EVENT_MASK_BITS,
    describeFlags: describeChildFlags,
    titleFallback: CHILD_WINDOW_TITLE_FALLBACK,
    fixedInitial: { receiver: '', window: 'window!', id: '', context: '', x: '', y: '', width: '', height: '' },
    configureLabel: 'Configure child window flags',
    addLabel: 'Add child window flags…',
    // addChildWindow's no-title overloads cannot take flags: a call with neither a flags value
    // nor a flags-insert slot yields no Code Action. This refusal is specific to addChildWindow;
    // addWindow's spec leaves requireFlagsSlot false.
    requireFlagsSlot: true,
};

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

/**
 * Build the `AddChildWindowPanelArg` and Code Action label for the addChildWindow call at
 * `character` on `lineText`, or `undefined` if there is nothing to rewrite: no call at all, or a
 * call with neither an existing flags literal nor a spot to add one (the no-title overloads
 * cannot take flags). Shared by the Code Action provider and the composer-cue click command
 * (`composer-lens-command.ts`) so both entry points decode the same call the same way — mirrors
 * `addWindowPanelArgAt` (`addwindow-composer-ui.ts`).
 */
export function addChildWindowPanelArgAt(
    uri: string, line: number, lineText: string, character: number,
): { arg: AddChildWindowPanelArg; label: string } | undefined {
    return windowPanelArgAt(ADD_CHILD_WINDOW_SPEC, uri, line, lineText, character);
}

class AddChildWindowCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const lineNo = range.start.line;
        const result = addChildWindowPanelArgAt(document.uri.toString(), lineNo, document.lineAt(lineNo).text, range.start.character);
        if (!result) return [];

        const action = new vscode.CodeAction(result.label, vscode.CodeActionKind.RefactorRewrite);
        action.command = { command: 'bbj.composeAddChildWindow', title: result.label, arguments: [result.arg] };
        return [action];
    }
}
