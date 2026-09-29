/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The two diagnostic status bars shown while the extension runs: a warning that parse-error
 * suppression is hiding cascading diagnostics on the active file, and a warning that BBjCPL
 * itself is unavailable. Both are driven by events the language server or VS Code push after
 * activation; `registerDiagnosticStatusBars` owns their lifetime end to end.
 */
import * as vscode from 'vscode';
import type { LanguageClient } from 'vscode-languageclient/node';

export function registerDiagnosticStatusBars(context: vscode.ExtensionContext, deps: { client: LanguageClient }): void {
    const { client } = deps;

    // Diagnostic suppression status bar indicator
    const suppressionStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 100
    );
    suppressionStatusBar.text = '$(warning) Diagnostics filtered';
    suppressionStatusBar.tooltip = 'Parse errors detected — cascading linking and validation noise is hidden. Fix parse errors to see full diagnostics.';
    context.subscriptions.push(suppressionStatusBar);

    // Show/hide based on whether the active document has errors
    const updateSuppressionStatus = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bbj') {
            suppressionStatusBar.hide();
            return;
        }
        const diags = vscode.languages.getDiagnostics(editor.document.uri);
        const hasError = diags.some(
            d => d.severity === vscode.DiagnosticSeverity.Error
        );
        // Simple heuristic: show when any error exists (suppression is likely active)
        if (hasError && vscode.workspace.getConfiguration("bbj").get("diagnostics.suppressCascading", true)) {
            suppressionStatusBar.show();
        } else {
            suppressionStatusBar.hide();
        }
    };

    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics(() => updateSuppressionStatus())
    );
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => updateSuppressionStatus())
    );

    // BBjCPL availability status bar indicator
    // Hidden by default — shown only when BBjCPL is detected as unavailable
    const bbjcplStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 99
    );
    bbjcplStatusBar.text = '$(warning) BBjCPL: unavailable';
    bbjcplStatusBar.tooltip = 'BBjCPL compiler not found. Check that BBj is installed and bbj.home is configured.';
    context.subscriptions.push(bbjcplStatusBar);

    // Listen for BBjCPL availability notifications from the language server
    context.subscriptions.push(
        client.onNotification('bbj/bbjcplAvailability', (params: { available: boolean }) => {
            if (params.available) {
                bbjcplStatusBar.hide();
            } else {
                bbjcplStatusBar.show();
            }
        })
    );
}
