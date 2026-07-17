/**
 * VS Code UI for the MSGBOX composer spike (#426).
 *
 * Thin client layer: a QuickPick wizard + a Code Action. All flag arithmetic lives in the
 * editor-agnostic ./msgbox-composer module. Two entry points:
 *   - Command "bbj.composeMsgbox" with no args  -> compose a NEW MSGBOX statement at the cursor.
 *   - Same command invoked by the Code Action    -> decode an existing call's numeric expr,
 *                                                   let the user reconfigure, replace it in place.
 */
import * as vscode from 'vscode';
import {
    BUTTON_SETS, ICONS, DEFAULT_BUTTONS, FLAGS, CatalogItem,
    MsgboxState, DEFAULT_STATE, encode, decode, describe, composeStatement, findMsgboxCallAt, flagsFromState,
} from './msgbox-composer.js';
import { openMsgboxComposerPanel, MsgboxPanelArg } from './msgbox-composer-webview.js';

interface ComposeArg {
    /** Reconfigure an existing numeric `expr` in place (call already has options). */
    edit?: { line: number; exprRange: [number, number]; current: number };
    /** Add options to a bare `MSGBOX("...")` by inserting `, <expr>` at this position. */
    insert?: { line: number; character: number };
}

export function registerMsgboxComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeMsgbox', (arg?: ComposeArg) => runComposer(arg)),
        vscode.commands.registerCommand('bbj.composeMsgboxVisual', (arg?: MsgboxPanelArg) => openMsgboxComposerPanel(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new MsgboxCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

class MsgboxCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const lineNo = range.start.line;
        // Only the MSGBOX call the cursor is inside — so a line with several calls
        // (e.g. IF..THEN MSGBOX(..) ELSE MSGBOX(..)) offers the action for the right one.
        const info = findMsgboxCallAt(document.lineAt(lineNo).text, range.start.character);
        if (!info) {
            return [];
        }
        // The span of the whole MSGBOX(...) call and any args past the title we preserve verbatim.
        const target = {
            uri: document.uri.toString(),
            line: lineNo,
            callStart: info.callStart,
            callEnd: info.callEnd,
            trailingArgs: info.args.slice(3),
        };

        // Existing numeric options -> open the visual editor prefilled from the current call.
        if (info.exprRange && info.exprValue !== undefined) {
            const st = decode(info.exprValue);
            const arg: MsgboxPanelArg = {
                target,
                initial: {
                    message: info.args[0] ?? '""',
                    title: info.args[2] ?? '',
                    buttonSet: st.buttonSet, icon: st.icon, defaultButton: st.defaultButton,
                    flags: flagsFromState(st),
                },
            };
            return [visualAction(`Configure MSGBOX options (${describe(info.exprValue)})`, arg)];
        }
        // Bare MSGBOX("...") with no options yet -> open the visual editor to add them.
        if (info.optionInsertOffset !== undefined) {
            const arg: MsgboxPanelArg = {
                target: { ...target, trailingArgs: [] },
                initial: {
                    message: info.args[0] ?? '""',
                    title: '',
                    buttonSet: 0, icon: 0, defaultButton: 0, flags: [],
                },
            };
            return [visualAction('Add MSGBOX options…', arg)];
        }
        return [];
    }
}

function visualAction(title: string, arg: MsgboxPanelArg): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.RefactorRewrite);
    action.command = { command: 'bbj.composeMsgboxVisual', title, arguments: [arg] };
    return action;
}

async function runComposer(arg?: ComposeArg): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const initial = arg?.edit ? decode(arg.edit.current) : DEFAULT_STATE;

    const state = await runWizard(initial);
    if (!state) {
        return; // cancelled
    }
    const expr = encode(state);

    if (arg?.edit) {
        // Reconfigure: replace just the numeric expr token.
        const { line, exprRange } = arg.edit;
        const range = new vscode.Range(line, exprRange[0], line, exprRange[1]);
        await editor.edit(b => b.replace(range, String(expr)));
    } else if (arg?.insert) {
        // Add options to a bare MSGBOX("..."): insert `, <expr>` after the message.
        const pos = new vscode.Position(arg.insert.line, arg.insert.character);
        await editor.edit(b => b.insert(pos, `, ${expr}`));
    } else {
        // New statement: ask for message/title, insert at cursor.
        const message = await vscode.window.showInputBox({
            title: 'MSGBOX — message', prompt: 'BBj expression for the message',
            value: '"Message"', ignoreFocusOut: true,
        });
        if (message === undefined) return;
        const title = await vscode.window.showInputBox({
            title: 'MSGBOX — title (optional)', prompt: 'BBj expression for the title, or leave empty',
            value: '', ignoreFocusOut: true,
        });
        if (title === undefined) return;

        const statement = composeStatement({
            message: message || '""',
            expr,
            title: title || undefined,
            assignTo: 'ret!',
        });
        await editor.edit(b => b.insert(editor.selection.active, statement));
    }
    vscode.window.showInformationMessage(`MSGBOX options: ${describe(expr)}  (expr = ${expr})`);
}

/** Sequential pickers. Returns undefined if the user cancels any step. */
async function runWizard(initial: MsgboxState): Promise<MsgboxState | undefined> {
    const icon = await pickOne('MSGBOX — icon', ICONS, initial.icon);
    if (icon === undefined) return undefined;

    const buttonSet = await pickOne('MSGBOX — buttons', BUTTON_SETS, initial.buttonSet);
    if (buttonSet === undefined) return undefined;

    const defaultButton = await pickOne('MSGBOX — default button', DEFAULT_BUTTONS, initial.defaultButton);
    if (defaultButton === undefined) return undefined;

    const preselectedFlags = FLAGS.filter(f =>
        (f.value === 65536 && initial.noEnter)
        || (f.value === 32768 && initial.disableHtml)
        || (f.value === 131072 && initial.mdi));
    const flags = await pickMany('MSGBOX — extra options', FLAGS, preselectedFlags);
    if (flags === undefined) return undefined;
    const flagSet = new Set(flags.map(f => f.value));

    return {
        buttonSet, icon, defaultButton,
        noEnter: flagSet.has(65536),
        disableHtml: flagSet.has(32768),
        mdi: flagSet.has(131072),
    };
}

interface Pick extends vscode.QuickPickItem { value: number }

function pickOne(title: string, catalog: CatalogItem[], current: number): Thenable<number | undefined> {
    const items: Pick[] = catalog.map(c => ({
        label: c.label,
        description: c.value === current ? '$(check) current' : `= ${c.value}`,
        value: c.value,
    }));
    return vscode.window.showQuickPick(items, { title, placeHolder: 'Pick one', ignoreFocusOut: true })
        .then(sel => sel?.value);
}

function pickMany(title: string, catalog: CatalogItem[], preselected: CatalogItem[]): Thenable<CatalogItem[] | undefined> {
    return new Promise(resolve => {
        const qp = vscode.window.createQuickPick<Pick>();
        qp.title = title;
        qp.canSelectMany = true;
        qp.ignoreFocusOut = true;
        qp.placeholder = 'Toggle options (Enter when done)';
        qp.items = catalog.map(c => ({ label: c.label, description: `= ${c.value}`, value: c.value }));
        qp.selectedItems = qp.items.filter(i => preselected.some(p => p.value === i.value));
        let done = false;
        qp.onDidAccept(() => {
            done = true;
            const chosen = qp.selectedItems.map(i => ({ value: i.value, label: i.label }));
            qp.hide();
            resolve(chosen);
        });
        qp.onDidHide(() => { if (!done) resolve(undefined); qp.dispose(); });
        qp.show();
    });
}
