/**
 * VS Code UI for the config.bbx SETOPTS composer (#474).
 *
 * Thin client layer over the editor-agnostic ./setopts-catalog module. Three entry points, all
 * scoped to the `bbx-config` language (config.bbx / config.min files):
 *   - CodeLens on every `SETOPTS <hex>` line -> open the composer on that line's vector.
 *   - RefactorRewrite Code Action on a SETOPTS line -> same.
 *   - Command "bbj.composeConfigSetopts" -> edit the file's existing SETOPTS line, or compose a
 *     NEW one at the cursor when the file has none.
 */
import * as vscode from 'vscode';
import { describeVector, parseSetOptsLine, SetOptsLineInfo } from './setopts-catalog.js';
import { openSetOptsComposerPanel, SetOptsPanelArg } from './setopts-composer-webview.js';

const BBX_CONFIG = { language: 'bbx-config' } as const;

export function registerSetOptsComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeConfigSetopts', (arg?: SetOptsPanelArg) => {
            const resolved = arg ?? argForActiveEditor();
            if (resolved) openSetOptsComposerPanel(context, resolved);
        }),
        vscode.languages.registerCodeActionsProvider(
            BBX_CONFIG,
            new SetOptsCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
        vscode.languages.registerCodeLensProvider(BBX_CONFIG, new SetOptsCodeLensProvider()),
    );
}

/** The panel arg for a recognized SETOPTS line — shared by the lens, the action and the command. */
function argForLine(document: vscode.TextDocument, line: number, info: SetOptsLineInfo): SetOptsPanelArg {
    return {
        target: {
            uri: document.uri.toString(),
            line,
            hexRange: info.hexRange,
            insertOffset: info.insertOffset,
            originalHex: info.hexDigits,
        },
    };
}

/** Lens/action label: the vector's human summary, ellipsized to fit a one-line UI. */
function lineLabel(info: SetOptsLineInfo): string {
    if (!info.vector) return 'Compose SETOPTS…';
    const summary = describeVector(info.vector);
    return `Configure SETOPTS (${summary.length > 72 ? summary.slice(0, 71) + '…' : summary})`;
}

/**
 * Command entry point without an arg: prefer the file's existing SETOPTS line (config.bbx is
 * evaluated once — a second line would silently override, not add), else compose a NEW line
 * to insert at the cursor.
 */
function argForActiveEditor(): SetOptsPanelArg | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'bbx-config') {
        vscode.window.showInformationMessage('Open a config.bbx file first, then run the SETOPTS composer.');
        return undefined;
    }
    for (let line = 0; line < editor.document.lineCount; line++) {
        const info = parseSetOptsLine(editor.document.lineAt(line).text);
        if (info) return argForLine(editor.document, line, info);
    }
    return {}; // NEW mode — insert at the cursor
}

class SetOptsCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const line = range.start.line;
        const info = parseSetOptsLine(document.lineAt(line).text);
        if (!info) return [];
        const label = lineLabel(info);
        const action = new vscode.CodeAction(label, vscode.CodeActionKind.RefactorRewrite);
        action.command = { command: 'bbj.composeConfigSetopts', title: label, arguments: [argForLine(document, line, info)] };
        return [action];
    }
}

class SetOptsCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const lenses: vscode.CodeLens[] = [];
        for (let line = 0; line < document.lineCount; line++) {
            const info = parseSetOptsLine(document.lineAt(line).text);
            if (!info) continue;
            const title = `$(settings-gear) ${lineLabel(info)}`;
            lenses.push(new vscode.CodeLens(
                new vscode.Range(line, 0, line, document.lineAt(line).text.length),
                { command: 'bbj.composeConfigSetopts', title, arguments: [argForLine(document, line, info)] },
            ));
        }
        return lenses;
    }
}
