/**
 * VS Code UI for the SETOPTS-in-code composer (#475, DISC-06, plan 88-06).
 *
 * Thin client layer over `bbj/composer/setopts/decodeInCode` — every decision about what shape
 * the cursor sits on, whether it is editable, and what range/mask/prefill an edit needs comes
 * from that request's response. This module never decodes a SETOPTS shape itself; it only routes
 * the server's verdict to the right panel (`setopts-composer-webview.ts`'s existing absolute-mode
 * panel, or `setopts-tristate-webview.ts`'s new chain/compose-new panel), or shows a message when
 * the server says an edit is not offered.
 *
 * Two entry points, both scoped to `.bbj` files:
 *   - A `RefactorRewrite` Code Action on a line containing `SETOPTS`, `IOR(` or `AND(`.
 *   - Command "bbj.composeSetoptsInCode" — from the Code Action (with a uri+position argument)
 *     or from the Command Palette / editor context menu (no argument, uses the active editor's
 *     cursor).
 *
 * No CodeLens provider is registered here: a persistent per-line marker is DISC-01's
 * discoverability cue, deferred to Phase 89. This module's Code Action + command are the
 * interim entry point, exactly as Phase 87's context-menu command was for config.bbx.
 */
import * as vscode from 'vscode';
import { openSetOptsComposerPanel, SetOptsPanelArg } from './setopts-composer-webview.js';
import {
    openSetOptsTriStateComposerPanel, SetOptsInCodeRequestSender, SetOptsTriStatePanelArg, SetOptsTriStateTarget,
} from './setopts-tristate-webview.js';
import {
    SETOPTS_DECODE_IN_CODE_METHOD, SetOptsInCodeDecodeParams, SetOptsInCodeDecodeResult,
} from './language/setopts-in-code-request.js';

const BBJ = { language: 'bbj' } as const;

/**
 * Cheap, position-independent-of-AST gate: does `lineText` contain `SETOPTS`, `IOR(` or `AND(`
 * (case-insensitively) at or before `character`? Pure — reads no `vscode` value — so it is
 * directly unit-testable. This is only the client-side Code Action gate; the *authoritative*
 * safe/unsafe/editable decision is always `decodeInCode`'s server-side response.
 *
 * Matches on a word boundary immediately before the keyword so ordinary identifiers that merely
 * contain one of these keywords as a substring — `expand(`, `command(`, `demand(`, `brand(`,
 * `island(`, `prior(`, `senior(`, `junior(`, etc. — are never mistaken for a SETOPTS-in-code
 * candidate.
 */
export function setoptsInCodeCandidateLine(lineText: string, character: number): boolean {
    const pattern = /\b(?:SETOPTS|IOR\(|AND\()/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lineText))) {
        if (match.index <= character) {
            return true;
        }
    }
    return false;
}

/** The argument the Code Action passes to the command — a document position to decode at. */
interface SetOptsInCodeCommandArg {
    uri: string;
    line: number;
    character: number;
}

export function registerSetOptsInCodeComposer(context: vscode.ExtensionContext, send: SetOptsInCodeRequestSender): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeSetoptsInCode', (arg?: SetOptsInCodeCommandArg) =>
            handleComposeSetoptsInCode(context, send, arg)),
        vscode.languages.registerCodeActionsProvider(
            BBJ,
            new SetOptsInCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}

class SetOptsInCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const line = range.start.line;
        const lineText = document.lineAt(line).text;
        if (!setoptsInCodeCandidateLine(lineText, range.start.character)) {
            return [];
        }
        const title = 'Compose SETOPTS block…';
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.RefactorRewrite);
        const arg: SetOptsInCodeCommandArg = { uri: document.uri.toString(), line, character: range.start.character };
        action.command = { command: 'bbj.composeSetoptsInCode', title, arguments: [arg] };
        return [action];
    }
}

/** Resolve a command-invocation position from the active `.bbj` editor's cursor, if any. */
function activeEditorPosition(): SetOptsInCodeCommandArg | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'bbj') {
        return undefined;
    }
    const pos = editor.selection.active;
    return { uri: editor.document.uri.toString(), line: pos.line, character: pos.character };
}

/**
 * The command handler. Resolves the target position (the Code Action's argument, or the active
 * `.bbj` editor's cursor), sends `decodeInCode`, and routes the response to the right panel — or
 * to a non-blocking message when the server offers no edit. Never throws into the extension
 * host: a failed/rejected request surfaces as a message instead.
 */
async function handleComposeSetoptsInCode(
    context: vscode.ExtensionContext,
    send: SetOptsInCodeRequestSender,
    arg?: SetOptsInCodeCommandArg,
): Promise<void> {
    const target = arg ?? activeEditorPosition();
    if (!target) {
        vscode.window.showInformationMessage('Open a .bbj file first, then run the SETOPTS composer.');
        return;
    }

    let result: SetOptsInCodeDecodeResult;
    try {
        const params: SetOptsInCodeDecodeParams = { uri: target.uri, line: target.line, character: target.character };
        result = await send(SETOPTS_DECODE_IN_CODE_METHOD, params) as SetOptsInCodeDecodeResult;
    } catch (error) {
        vscode.window.showInformationMessage(`SETOPTS composer failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }

    if (result.mode === 'absolute' && result.editable && result.absolute) {
        const panelArg: SetOptsPanelArg = {
            target: {
                uri: target.uri,
                line: result.absolute.line,
                hexRange: result.absolute.hexRange,
                originalHex: result.absolute.hexDigits,
            },
        };
        openSetOptsComposerPanel(context, panelArg);
        return;
    }

    if (result.mode === 'chain' && result.editable && result.chain) {
        const chainTarget: SetOptsTriStateTarget = {
            uri: target.uri,
            startLine: result.chain.startLine,
            endLine: result.chain.endLine,
            indent: result.chain.indent,
            variableName: result.chain.variableName,
        };
        const panelArg: SetOptsTriStatePanelArg = { target: chainTarget, initial: result.initial };
        openSetOptsTriStateComposerPanel(context, panelArg, send);
        return;
    }

    if (!result.found) {
        // No SETOPTS-in-code shape near the cursor — compose a brand new block instead.
        openSetOptsTriStateComposerPanel(context, {}, send);
        return;
    }

    // found: true but editable: false — the server declined to offer an edit (an unsafe chain,
    // per T-88-01); show its reason and open no panel.
    vscode.window.showInformationMessage(result.reason ?? 'This SETOPTS shape cannot be edited in place.');
}
