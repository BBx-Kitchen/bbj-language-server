/**
 * VS Code UI for the config.bbx SETOPTS composer (#474).
 *
 * Thin client layer over the editor-agnostic ./setopts-catalog module. Two entry points, both
 * scoped to the `bbx-config` language (config.bbx / config.min files):
 *   - RefactorRewrite Code Action on a SETOPTS line -> open the composer on that line's vector.
 *   - Command "bbj.composeConfigSetopts" -> edit the file's existing SETOPTS line, or compose a
 *     NEW one at the cursor when the file has none.
 *
 * The always-visible SETOPTS cue for config files is now served by the language server's shared
 * composer cue (#650): the language client's `documentSelector` includes the config-document
 * language id, and the server answers `textDocument/codeLens` for it directly from raw text
 * (`composer-codelens.ts`'s `configComposerLenses`). This module's own client-side
 * `vscode.languages.registerCodeLensProvider` registration is retired so a SETOPTS line never
 * shows two cues; this module keeps only the command and the Code Action.
 */
import * as vscode from 'vscode';
import { getActiveConfigPath, isActiveConfigPath } from './config-path-cache.js';
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
    );
}

/**
 * The panel arg for a recognized SETOPTS line at `line`, decoded from `lineText` — shared by the
 * server-side composer cue's click dispatch (`composer-lens-command.ts`), the Code Action and the
 * active-editor command entry point, so all three build byte-identical arguments.
 */
export function setoptsConfigPanelArgAt(uri: string, line: number, lineText: string): SetOptsPanelArg | undefined {
    const info = parseSetOptsLine(lineText);
    if (!info) return undefined;
    return {
        target: {
            uri,
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
 *
 * When the open document IS a config file but not the one the tooling actually reads (the
 * home default opened by habit while a custom path is configured — the direction issue #485
 * was filed over), a non-blocking hint names the active file before still proceeding to open
 * the composer on the file the user has open.
 */
export function argForActiveEditor(): SetOptsPanelArg | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'bbx-config') {
        vscode.window.showInformationMessage('Open a config.bbx file first, then run the SETOPTS composer.');
        return undefined;
    }
    const activeConfigPath = getActiveConfigPath();
    if (activeConfigPath && !isActiveConfigPath(editor.document.uri.fsPath)) {
        vscode.window.showInformationMessage(
            `This isn't the active config file — BBj tooling reads: ${activeConfigPath}`
        );
    }
    for (let line = 0; line < editor.document.lineCount; line++) {
        const arg = setoptsConfigPanelArgAt(editor.document.uri.toString(), line, editor.document.lineAt(line).text);
        if (arg) return arg;
    }
    return {}; // NEW mode — insert at the cursor
}

class SetOptsCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const line = range.start.line;
        const lineText = document.lineAt(line).text;
        const info = parseSetOptsLine(lineText);
        if (!info) return [];
        const label = lineLabel(info);
        const action = new vscode.CodeAction(label, vscode.CodeActionKind.RefactorRewrite);
        action.command = {
            command: 'bbj.composeConfigSetopts',
            title: label,
            arguments: [setoptsConfigPanelArgAt(document.uri.toString(), line, lineText)],
        };
        return [action];
    }
}
