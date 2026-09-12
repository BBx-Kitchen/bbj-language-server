/**
 * VS Code UI for the MSGBOX composer spike (#426).
 *
 * Thin client layer: a QuickPick wizard + a Code Action. All flag arithmetic lives in the
 * editor-agnostic ./msgbox-composer module. Two entry points:
 *   - Command "bbj.composeMsgbox" with no args  -> compose a NEW MSGBOX statement at the cursor.
 *   - Same command invoked by the Code Action    -> decode an existing call's numeric expr,
 *                                                   let the user reconfigure, replace it in place.
 * The `edit`/`insert` arguments are re-resolved against the live document immediately before
 * showing the wizard and again immediately before writing, and fail closed on any mismatch
 * (D-01/D-02, #532) — a document edit while the QuickPick wizard is open can never land on the
 * wrong text.
 */
import * as vscode from 'vscode';
import {
    BUTTON_SETS, ICONS, DEFAULT_BUTTONS, FLAGS, CatalogItem,
    MsgboxState, DEFAULT_STATE, encode, decode, describe, composeStatement, stateFromSelection,
    validateStringField, decodeMsgboxCall, findMsgboxCallAt, MsgboxDecodeCallResult,
} from './msgbox-composer.js';
import {
    openMsgboxComposerPanel, msgboxCallStillMatches, MSGBOX_STALE_CALL_TEXT,
    MsgboxPanelArg, MsgboxEditTarget,
} from './msgbox-composer-webview.js';

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
        const lineText = document.lineAt(lineNo).text;
        const decoded = decodeMsgboxCall(lineText, range.start.character);
        const result = msgboxPanelArgFromDecode(document.uri.toString(), lineNo, lineText, decoded);
        if (!result) {
            return [];
        }
        return [visualAction(result.label, result.arg)];
    }
}

/**
 * Build the visual-composer command argument + lightbulb label from a `decodeMsgboxCall` result
 * (#648). Shared by the lightbulb (`MsgboxCodeActionProvider`) and any future cue dispatcher, so
 * both decide identically. `undefined` when there is nothing to offer (`found: false`).
 */
export function msgboxPanelArgFromDecode(
    uri: string, line: number, lineText: string, decoded: MsgboxDecodeCallResult,
): { arg: MsgboxPanelArg; label: string } | undefined {
    if (!decoded.found || !decoded.edit || !decoded.initial) {
        return undefined;
    }
    const callText = lineText.slice(decoded.edit.callStart, decoded.edit.callEnd);
    const target = {
        uri, line, callStart: decoded.edit.callStart, callEnd: decoded.edit.callEnd,
        callText,
        trailingArgs: decoded.trailingArgs ?? [],
    };
    if (decoded.incomplete) {
        return { arg: { target: { ...target, incomplete: true }, initial: decoded.initial }, label: 'Complete MSGBOX call…' };
    }
    const arg: MsgboxPanelArg = { target, initial: decoded.initial };
    if (decoded.replace) {
        arg.replace = decoded.replace;
        return { arg, label: 'Compose MSGBOX options (replaces expression)…' };
    }
    if (decoded.hasOptions) {
        const summary = describe(encode(stateFromSelection(decoded.initial)));
        return { arg, label: `Configure MSGBOX options (${summary})` };
    }
    return { arg, label: 'Add MSGBOX options…' };
}

function visualAction(title: string, arg: MsgboxPanelArg): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.RefactorRewrite);
    action.command = { command: 'bbj.composeMsgboxVisual', title, arguments: [arg] };
    return action;
}

/**
 * Re-resolve the picker's `edit`/`insert` argument against `lineText` — the argument's own line,
 * never a search elsewhere (D-02). `edit` requires a call whose `exprRange` and `exprValue` still
 * match the captured token exactly; `insert` requires a call whose `optionInsertOffset` still
 * matches the captured position exactly. Returns `undefined` on any mismatch, or when `arg` has
 * neither branch.
 */
export function captureComposeArgTarget(
    uri: string, line: number, lineText: string, arg: ComposeArg,
): MsgboxEditTarget | undefined {
    if (arg.edit) {
        const { exprRange, current } = arg.edit;
        const call = findMsgboxCallAt(lineText, exprRange[0]);
        if (!call || !call.exprRange || call.exprRange[0] !== exprRange[0] || call.exprRange[1] !== exprRange[1] || call.exprValue !== current) {
            return undefined;
        }
        return { uri, line, callStart: call.callStart, callEnd: call.callEnd, callText: lineText.slice(call.callStart, call.callEnd), trailingArgs: [] };
    }
    if (arg.insert) {
        const call = findMsgboxCallAt(lineText, arg.insert.character);
        if (!call || call.optionInsertOffset !== arg.insert.character) {
            return undefined;
        }
        return { uri, line, callStart: call.callStart, callEnd: call.callEnd, callText: lineText.slice(call.callStart, call.callEnd), trailingArgs: [] };
    }
    return undefined;
}

async function runComposer(arg?: ComposeArg): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    let target: MsgboxEditTarget | undefined;
    if (arg?.edit || arg?.insert) {
        const { line } = (arg.edit ?? arg.insert)!;
        if (line < 0 || line >= editor.document.lineCount) {
            vscode.window.showWarningMessage(MSGBOX_STALE_CALL_TEXT);
            return;
        }
        target = captureComposeArgTarget(editor.document.uri.toString(), line, editor.document.lineAt(line).text, arg);
        if (!target) {
            vscode.window.showWarningMessage(MSGBOX_STALE_CALL_TEXT);
            return;
        }
    }

    const initial = arg?.edit ? decode(arg.edit.current) : DEFAULT_STATE;

    const state = await runWizard(initial);
    if (!state) {
        return; // cancelled
    }
    const expr = encode(state);

    if (target) {
        // Re-resolve immediately before writing (D-01/D-03): the document may have changed while
        // the wizard was open. Any mismatch aborts with no edit applied.
        if (target.line < 0 || target.line >= editor.document.lineCount || !msgboxCallStillMatches(editor.document.lineAt(target.line).text, target)) {
            vscode.window.showWarningMessage(MSGBOX_STALE_CALL_TEXT);
            return;
        }
        if (arg?.edit) {
            // Reconfigure: replace just the numeric expr token.
            const { line, exprRange } = arg.edit;
            const range = new vscode.Range(line, exprRange[0], line, exprRange[1]);
            await editor.edit(b => b.replace(range, String(expr)));
        } else if (arg?.insert) {
            // Add options to a bare MSGBOX("..."): insert `, <expr>` after the message.
            const pos = new vscode.Position(arg.insert.line, arg.insert.character);
            await editor.edit(b => b.insert(pos, `, ${expr}`));
        }
    } else {
        // New statement: ask for message/title, insert at cursor.
        const message = await vscode.window.showInputBox({
            title: 'MSGBOX — message', prompt: 'BBj expression for the message',
            value: '"Message"', ignoreFocusOut: true,
            validateInput: v => validateStringField(v, { required: true }).message,
        });
        if (message === undefined) return;
        const title = await vscode.window.showInputBox({
            title: 'MSGBOX — title (optional)', prompt: 'BBj expression for the title, or leave empty',
            value: '', ignoreFocusOut: true,
            validateInput: v => validateStringField(v, { required: false }).message,
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
