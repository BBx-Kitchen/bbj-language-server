/**
 * VS Code UI for the MSGBOX composer spike (#426).
 *
 * Thin client layer: a QuickPick wizard + a visual webview panel + a Code Action. Both commands
 * are position-aware:
 *   - "bbj.composeMsgbox" with an `edit`/`insert` argument (from the Code Action) reconfigures an
 *     existing numeric `expr` in place or adds options to a bare call. With no argument, it first
 *     decodes the cursor position — the QuickPick can neither complete an unfinished call nor
 *     rewrite a whole call in place, so any found call under the cursor hands off to the visual
 *     panel instead of nesting a new statement inside it; only a cursor with no MSGBOX
 *     call composes a NEW statement via the QuickPick wizard.
 *   - "bbj.composeMsgboxVisual" with a `MsgboxPanelArg` (the lightbulb's or a cue's) opens exactly
 *     that argument. With no argument, it decodes the cursor the same way; only a cursor with no
 *     MSGBOX call composes new at the cursor.
 * The `edit`/`insert` arguments are re-resolved against the live document immediately before
 * showing the wizard and again immediately before writing, and fail closed on any mismatch
 * — a document edit while the QuickPick wizard is open can never land on the wrong text (#532).
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
        vscode.commands.registerCommand('bbj.composeMsgbox', (arg?: ComposeArg) => runComposer(context, arg)),
        vscode.commands.registerCommand('bbj.composeMsgboxVisual', (arg?: unknown) => runComposeMsgboxVisualCommand(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new MsgboxCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

/** True for a `MsgboxPanelArg` — the lightbulb's and a cue's own argument shape (a `target` and/or `initial` key). */
function isMsgboxPanelArg(arg: unknown): arg is MsgboxPanelArg {
    return typeof arg === 'object' && arg !== null && ('target' in arg || 'initial' in arg);
}

/**
 * `bbj.composeMsgboxVisual` without a panel argument decodes the caret position first, so the
 * Command Palette and the editor context menu never nest a whole new call inside a partial or
 * existing one: any found call under the cursor opens the matching panel, and only a cursor with
 * no MSGBOX call falls through to compose-new at the cursor (unchanged). A `MsgboxPanelArg`
 * argument — what the lightbulb and the composer cue both pass — opens exactly that argument
 * without consulting the active editor at all.
 */
export function runComposeMsgboxVisualCommand(context: vscode.ExtensionContext, arg?: unknown): void {
    if (isMsgboxPanelArg(arg)) {
        openMsgboxComposerPanel(context, arg);
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const result = msgboxPanelArgAtCursor(editor);
        if (result) {
            openMsgboxComposerPanel(context, result.arg);
            return;
        }
    }

    openMsgboxComposerPanel(context);
}

/** Decode the MSGBOX call under `editor`'s cursor into the same `{ arg, label }` shape the lightbulb uses. */
export function msgboxPanelArgAtCursor(editor: vscode.TextEditor): { arg: MsgboxPanelArg; label: string } | undefined {
    const position = editor.selection.active;
    const lineText = editor.document.lineAt(position.line).text;
    const decoded = decodeMsgboxCall(lineText, position.character);
    return msgboxPanelArgFromDecode(editor.document.uri.toString(), position.line, lineText, decoded);
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
 * never a search elsewhere. `edit` requires a call whose `exprRange` and `exprValue` still
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

async function runComposer(context: vscode.ExtensionContext, arg?: ComposeArg): Promise<void> {
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
    } else {
        // The QuickPick can neither complete an unfinished call nor rewrite a whole call in
        // place — any found call under the cursor hands off to the visual panel instead of
        // nesting a new statement inside it. Only a cursor with no MSGBOX call falls
        // through to compose-new below, unchanged.
        const result = msgboxPanelArgAtCursor(editor);
        if (result) {
            openMsgboxComposerPanel(context, result.arg);
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
        // Re-resolve immediately before writing: the document may have changed while
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
