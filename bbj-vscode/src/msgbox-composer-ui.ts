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
    MsgboxState, DEFAULT_STATE, encode, decode, describe, composeStatement, parseMsgboxCallOnLine,
} from './msgbox-composer.js';

interface EditExprArg {
    /** Present when invoked from the Code Action to edit an existing call in place. */
    edit: { line: number; exprRange: [number, number]; current: number };
}

export function registerMsgboxComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeMsgbox', (arg?: EditExprArg) => runComposer(arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new MsgboxCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

class MsgboxCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const line = document.lineAt(range.start.line).text;
        const info = parseMsgboxCallOnLine(line);
        // Offer the reconfigure action only when we can round-trip the numeric expr.
        if (!info || !info.exprRange || info.exprValue === undefined) {
            return [];
        }
        const action = new vscode.CodeAction(
            `Configure MSGBOX options (${describe(info.exprValue)})`,
            vscode.CodeActionKind.RefactorRewrite,
        );
        action.command = {
            command: 'bbj.composeMsgbox',
            title: 'Configure MSGBOX options',
            arguments: [{ edit: { line: range.start.line, exprRange: info.exprRange, current: info.exprValue } } satisfies EditExprArg],
        };
        return [action];
    }
}

async function runComposer(arg?: EditExprArg): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const initial = arg ? decode(arg.edit.current) : DEFAULT_STATE;

    const state = await runWizard(initial);
    if (!state) {
        return; // cancelled
    }
    const expr = encode(state);

    if (arg) {
        // Reconfigure: replace just the numeric expr token.
        const { line, exprRange } = arg.edit;
        const range = new vscode.Range(line, exprRange[0], line, exprRange[1]);
        await editor.edit(b => b.replace(range, String(expr)));
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
