/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node';
import { BBjLibraryFileSystemProvider } from './language/lib/fs-provider';

const DocumentFormatter = require("./Formatters/DocumentFormatter.js");
const Commands = require("./Commands/Commands.js");

let client: LanguageClient;

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

}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language', 'main'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: [
        '--nolazy',
        `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`
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
        }
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
