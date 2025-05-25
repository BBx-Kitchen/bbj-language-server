/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node.js';
import { BBjLibraryFileSystemProvider } from './language/lib/fs-provider.js';
import { DocumentFormatter } from './document-formatter.js';
import { BBjInlineCompletionProvider } from './bbj-inline-completion-provider.js';

import Commands from './Commands/Commands.cjs';

let client: LanguageClient;
let aiOutputChannel: vscode.OutputChannel;
let inlineCompletionProvider: BBjInlineCompletionProvider | undefined;

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    BBjLibraryFileSystemProvider.register(context);
    client = startLanguageClient(context);
    vscode.commands.registerCommand("bbj.config", Commands.openConfigFile);
    vscode.commands.registerCommand("bbj.properties", Commands.openPropertiesFile);
    vscode.commands.registerCommand("bbj.em", Commands.openEnterpriseManager);
    vscode.commands.registerCommand("bbj.run", Commands.run);
    vscode.commands.registerCommand("bbj.runBUI", Commands.runBUI);
    vscode.commands.registerCommand("bbj.runDWC", Commands.runDWC);

    vscode.languages.registerDocumentFormattingEditProvider(
        "bbj",
        DocumentFormatter
    );

    // Set up AI completions if enabled
    const aiConfig = vscode.workspace.getConfiguration('bbj.ai');
    if (aiConfig.get<boolean>('enabled', true)) {
        // Create output channel for AI debugging
        aiOutputChannel = vscode.window.createOutputChannel('BBj AI Completions');
        context.subscriptions.push(aiOutputChannel);
        
        // Create and register inline completion provider
        inlineCompletionProvider = new BBjInlineCompletionProvider(aiOutputChannel);
        const disposable = vscode.languages.registerInlineCompletionItemProvider(
            { language: 'bbj' },
            inlineCompletionProvider
        );
        context.subscriptions.push(disposable);
        
        aiOutputChannel.appendLine('BBj AI completions activated');
    }

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('bbj.ai.enabled')) {
                const enabled = vscode.workspace.getConfiguration('bbj.ai').get<boolean>('enabled', true);
                if (enabled && !inlineCompletionProvider) {
                    // Enable AI completions
                    if (!aiOutputChannel) {
                        aiOutputChannel = vscode.window.createOutputChannel('BBj AI Completions');
                        context.subscriptions.push(aiOutputChannel);
                    }
                    inlineCompletionProvider = new BBjInlineCompletionProvider(aiOutputChannel);
                    const disposable = vscode.languages.registerInlineCompletionItemProvider(
                        { language: 'bbj' },
                        inlineCompletionProvider
                    );
                    context.subscriptions.push(disposable);
                    aiOutputChannel.appendLine('BBj AI completions enabled');
                } else if (!enabled && inlineCompletionProvider) {
                    // Disable AI completions
                    inlineCompletionProvider.dispose();
                    inlineCompletionProvider = undefined;
                    if (aiOutputChannel) {
                        aiOutputChannel.appendLine('BBj AI completions disabled');
                    }
                }
            }
        })
    );

}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (inlineCompletionProvider) {
        inlineCompletionProvider.dispose();
    }
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language', 'main.cjs'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: [
        '--nolazy',
        `--inspect${process.env.DEBUG_BREAK === 'true' ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`
    ] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.bbj');
    context.subscriptions.push(fileSystemWatcher);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'bbj' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher
        },
        initializationOptions:  vscode.workspace.getConfiguration("bbj").home

    };

    // Create the language client and start the client.
    const client = new LanguageClient(
        'bbj',
        'BBj',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
    return client;
}
