/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node.js';
import { BBjLibraryFileSystemProvider } from './language/lib/fs-provider.js';
import { DocumentFormatter } from './document-formatter.js';

import Commands from './Commands/Commands.cjs';

let client: LanguageClient;

// Function to read BBj.properties and extract classpath entry names
function getBBjClasspathEntries(bbjHome: string | undefined): string[] {
    if (!bbjHome) {
        return [];
    }
    
    const propertiesPath = path.join(bbjHome, 'cfg', 'BBj.properties');
    
    try {
        if (!fs.existsSync(propertiesPath)) {
            return [];
        }
        
        const content = fs.readFileSync(propertiesPath, 'utf-8');
        const lines = content.split('\n');
        const classpathEntries: string[] = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('basis.classpath.')) {
                // Extract the part after 'basis.classpath.' and before '='
                const match = trimmedLine.match(/^basis\.classpath\.([^=]+)=/);
                if (match && match[1]) {
                    classpathEntries.push(match[1]);
                }
            }
        }
        
        return classpathEntries.sort();
    } catch (error) {
        console.error('Error reading BBj.properties:', error);
        return [];
    }
}

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
    
    // Register command to show available classpath entries
    vscode.commands.registerCommand("bbj.showClasspathEntries", async () => {
        const config = vscode.workspace.getConfiguration("bbj");
        const bbjHome = config.get<string>("home");
        
        if (!bbjHome) {
            vscode.window.showErrorMessage("Please set bbj.home first to see available classpath entries");
            return;
        }
        
        const entries = getBBjClasspathEntries(bbjHome);
        
        if (entries.length === 0) {
            vscode.window.showWarningMessage("No classpath entries found in BBj.properties");
            return;
        }
        
        const currentClasspath = config.get<string>("classpath") || "";
        
        // Create a quick pick to show entries and allow selection
        const selected = await vscode.window.showQuickPick(entries.map(entry => ({
            label: entry,
            description: entry === currentClasspath ? "(current)" : "",
            detail: entry === "bbj_default" ? "Default BBj classpath" : undefined
        })), {
            placeHolder: "Select a classpath entry to use it",
            title: "Available BBj Classpath Entries"
        });
        
        if (selected) {
            await config.update("classpath", selected.label, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`BBj classpath set to: ${selected.label}`);
        }
    });

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
        initializationOptions: {
            home: vscode.workspace.getConfiguration("bbj").home,
            classpath: vscode.workspace.getConfiguration("bbj").classpath
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
