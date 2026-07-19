/**
 * "New BBj Program from Template" (#476).
 *
 * Thin client layer over the generated starter catalogue. The catalogue itself is authored in
 * /templates and generated into ./templates/generated-templates.ts by tools/gen-templates.mjs;
 * it is deliberately bundled rather than served by the language server, so the command still
 * works on a fresh or misconfigured BBj installation — which is exactly when a newcomer needs it.
 *
 * Entry points:
 *   - Command "bbj.newFromTemplate" with no args  -> pick a starter, then prompt for variables.
 *   - Same command with a template id             -> skip the picker (used by File > New File...).
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { STARTER_TEMPLATES, StarterTemplate } from './templates/generated-templates.js';

export function registerNewFromTemplate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.newFromTemplate', (templateId?: string) => newFromTemplate(templateId)),
    );
}

/** Substitutes ${Var} placeholders. BBj's own `$` is untouched: only `${...}` matches. */
export function render(text: string, values: Record<string, string>): string {
    return text.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (whole, name: string) =>
        Object.prototype.hasOwnProperty.call(values, name) ? values[name] : whole,
    );
}

async function newFromTemplate(templateId?: string): Promise<void> {
    const template = templateId
        ? STARTER_TEMPLATES.find(t => t.id === templateId)
        : await pickTemplate();
    if (!template) return;

    const values = await promptForVariables(template);
    if (!values) return;

    const targetDir = await resolveTargetDirectory();
    if (!targetDir) {
        vscode.window.showErrorMessage('Open a folder or a file before creating a BBj program from a template.');
        return;
    }

    const uri = vscode.Uri.joinPath(targetDir, render(template.fileName, values));
    if (await exists(uri)) {
        const overwrite = await vscode.window.showWarningMessage(
            `${path.basename(uri.fsPath)} already exists. Overwrite it?`,
            { modal: true }, 'Overwrite',
        );
        if (overwrite !== 'Overwrite') return;
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(render(template.body, values), 'utf8'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
}

async function pickTemplate(): Promise<StarterTemplate | undefined> {
    const picked = await vscode.window.showQuickPick(
        STARTER_TEMPLATES.map(template => ({ label: template.title, detail: template.description, template })),
        { title: 'New BBj Program', placeHolder: 'Select a starter program' },
    );
    return picked?.template;
}

async function promptForVariables(template: StarterTemplate): Promise<Record<string, string> | undefined> {
    const values: Record<string, string> = {};
    for (const variable of template.variables) {
        const value = await vscode.window.showInputBox({
            title: template.title,
            prompt: variable.prompt,
            value: variable.default,
            validateInput: input => (input.trim().length === 0 ? `${variable.prompt} cannot be empty.` : undefined),
        });
        if (value === undefined) return undefined; // cancelled
        values[variable.name] = value.trim();
    }
    return values;
}

/** Prefer the active file's folder, so the starter lands where the user is working. */
async function resolveTargetDirectory(): Promise<vscode.Uri | undefined> {
    const active = vscode.window.activeTextEditor?.document.uri;
    if (active && active.scheme === 'file') {
        return vscode.Uri.file(path.dirname(active.fsPath));
    }
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return undefined;
    if (folders.length === 1) return folders[0].uri;

    const picked = await vscode.window.showWorkspaceFolderPick({ placeHolder: 'Where should the program be created?' });
    return picked?.uri;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}
