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
import {
    OPTION_GROUP_ORDER,
    getOptionsGrouped,
    validateOptions,
    type CompilerOption
} from './Commands/CompilerOptions.js';

import Commands from './Commands/Commands.cjs';

let client: LanguageClient;
let secretStorage: vscode.SecretStorage;

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

// Interface for QuickPick items with option metadata
interface CompilerOptionQuickPickItem extends vscode.QuickPickItem {
    option?: CompilerOption;
    isSeparator?: boolean;
}

/**
 * Get the full configuration key for a compiler option
 */
function getFullConfigKey(configKey: string): string {
    return `compiler.${configKey}`;
}

/**
 * Get the current value of an option from configuration
 */
function getCurrentValue(config: vscode.WorkspaceConfiguration, option: CompilerOption): boolean | string | number | null {
    const fullKey = getFullConfigKey(option.configKey);
    const value = config.get(fullKey);
    if (value === undefined) {
        return option.defaultValue;
    }
    return value as boolean | string | number | null;
}

/**
 * Format the current value for display in QuickPick description
 */
function formatCurrentValueDescription(option: CompilerOption, value: boolean | string | number | null): string {
    if (option.type === 'boolean') {
        return value === true ? '$(check) enabled' : '';
    } else {
        if (value !== null && value !== undefined && value !== '') {
            return `$(check) ${value}`;
        }
        return '';
    }
}

/**
 * Check if an option is currently selected/enabled
 */
function isOptionSelected(option: CompilerOption, value: boolean | string | number | null): boolean {
    if (option.type === 'boolean') {
        return value === true;
    }
    return value !== null && value !== undefined && value !== '';
}

/**
 * Prompt user for a string or number value for parameterized options
 */
async function promptForValue(option: CompilerOption, currentValue: string | number | null): Promise<string | number | null | undefined> {
    const inputValue = await vscode.window.showInputBox({
        title: option.label,
        prompt: option.description,
        value: currentValue !== null ? String(currentValue) : '',
        placeHolder: option.type === 'number' ? 'Enter a number' : 'Enter a value',
        validateInput: (input) => {
            if (input === '') {
                return null; // Empty is valid (will clear the setting)
            }
            if (option.type === 'number') {
                const num = parseInt(input, 10);
                if (isNaN(num)) {
                    return 'Please enter a valid number';
                }
            }
            return null;
        }
    });

    if (inputValue === undefined) {
        // User cancelled
        return undefined;
    }

    if (inputValue === '') {
        // User cleared the value
        return null;
    }

    if (option.type === 'number') {
        return parseInt(inputValue, 10);
    }

    return inputValue;
}

/**
 * Configure BBjCPL compiler options via QuickPick dialog
 */
export async function configureCompileOptions(): Promise<void> {
    const config = vscode.workspace.getConfiguration('bbj');
    const groupedOptions = getOptionsGrouped();

    // Build QuickPick items with separators for groups
    const items: CompilerOptionQuickPickItem[] = [];

    for (const group of OPTION_GROUP_ORDER) {
        const groupOptions = groupedOptions.get(group);
        if (!groupOptions || groupOptions.length === 0) {
            continue;
        }

        // Add group separator
        items.push({
            label: group,
            kind: vscode.QuickPickItemKind.Separator,
            isSeparator: true
        });

        // Add options in this group
        for (const option of groupOptions) {
            // Skip protectPassword - it's handled with the protect option
            if (option.configKey === 'content.protectPassword') {
                continue;
            }

            const currentValue = getCurrentValue(config, option);
            const description = formatCurrentValueDescription(option, currentValue);

            items.push({
                label: `${option.flag} ${option.label}`,
                description: description,
                detail: option.description,
                picked: isOptionSelected(option, currentValue),
                option: option
            });
        }
    }

    // Show multi-select QuickPick
    const quickPick = vscode.window.createQuickPick<CompilerOptionQuickPickItem>();
    quickPick.items = items;
    quickPick.canSelectMany = true;
    quickPick.title = 'Configure BBjCPL Compiler Options';
    quickPick.placeholder = 'Select options to enable (press Enter when done)';

    // Pre-select currently enabled options
    const selectedItems = items.filter(item => item.picked && !item.isSeparator);
    quickPick.selectedItems = selectedItems;

    return new Promise<void>((resolve) => {
        quickPick.onDidAccept(async () => {
            const selectedOptions = quickPick.selectedItems.filter(item => item.option);
            quickPick.hide();

            // Ask for scope (Workspace or Global)
            const scopeChoice = await vscode.window.showQuickPick([
                {
                    label: 'Workspace',
                    description: vscode.workspace.workspaceFolders ? '(Recommended)' : '',
                    detail: 'Save settings for this project only',
                    target: vscode.ConfigurationTarget.Workspace
                },
                {
                    label: 'Global (User)',
                    description: !vscode.workspace.workspaceFolders ? '(Recommended)' : '',
                    detail: 'Save settings for all projects',
                    target: vscode.ConfigurationTarget.Global
                }
            ], {
                placeHolder: 'Where should these settings be saved?',
                title: 'Configuration Scope'
            });

            if (!scopeChoice) {
                // User cancelled scope selection
                resolve();
                return;
            }

            const configTarget = scopeChoice.target;

            // Process each option - enable selected ones, disable others
            const allOptions = items.filter(item => item.option);
            const selectedConfigKeys = new Set(selectedOptions.map(item => item.option!.configKey));

            // Map to track values that need InputBox prompts
            const valuesToPrompt: { option: CompilerOption; isSelected: boolean }[] = [];

            // First, identify which parameterized options need prompts
            for (const item of allOptions) {
                const option = item.option!;
                const isSelected = selectedConfigKeys.has(option.configKey);

                if (option.hasParameter && option.type !== 'boolean' && isSelected) {
                    valuesToPrompt.push({ option, isSelected });
                }
            }

            // Prompt for values of parameterized options
            for (const { option } of valuesToPrompt) {
                const currentValue = getCurrentValue(config, option);
                const newValue = await promptForValue(option, currentValue as string | number | null);

                if (newValue === undefined) {
                    // User cancelled - abort the whole operation
                    resolve();
                    return;
                }

                const fullKey = getFullConfigKey(option.configKey);
                await config.update(fullKey, newValue, configTarget);
            }

            // Update boolean options
            for (const item of allOptions) {
                const option = item.option!;

                // Skip parameterized options (already handled above)
                if (option.hasParameter && option.type !== 'boolean') {
                    continue;
                }

                const isSelected = selectedConfigKeys.has(option.configKey);
                const fullKey = getFullConfigKey(option.configKey);

                if (option.type === 'boolean') {
                    await config.update(fullKey, isSelected, configTarget);
                }
            }

            // Validate the final configuration
            const validation = validateOptions(config);

            if (!validation.isValid) {
                const errorMsg = validation.errors.join('\n');
                vscode.window.showErrorMessage(
                    `Compiler option conflicts detected:\n${errorMsg}`,
                    'Open Settings'
                ).then(selection => {
                    if (selection === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.compiler');
                    }
                });
            } else if (validation.warnings.length > 0) {
                const warningMsg = validation.warnings.join('\n');
                vscode.window.showWarningMessage(
                    `Compiler option warnings:\n${warningMsg}`,
                    'Open Settings'
                ).then(selection => {
                    if (selection === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.compiler');
                    }
                });
            } else {
                const enabledCount = selectedOptions.length;
                vscode.window.showInformationMessage(
                    `Compiler options saved (${enabledCount} option${enabledCount !== 1 ? 's' : ''} enabled)`
                );
            }

            resolve();
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve();
        });

        quickPick.show();
    });
}

/**
 * Get EM credentials from SecretStorage
 * Returns {username, password} object or undefined if not stored
 */
export async function getEMCredentials(): Promise<{username: string, password: string} | undefined> {
    // Try token first
    const token = await secretStorage?.get('bbj.em.token');
    if (token) return { username: '__token__', password: token };
    // Try stored credentials (fallback if BBj doesn't support tokens)
    const creds = await secretStorage?.get('bbj.em.credentials');
    if (creds) return JSON.parse(creds);
    return undefined;
}

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    BBjLibraryFileSystemProvider.register(context);
    secretStorage = context.secrets;
    client = startLanguageClient(context);
    vscode.commands.registerCommand("bbj.config", Commands.openConfigFile);
    vscode.commands.registerCommand("bbj.properties", Commands.openPropertiesFile);
    vscode.commands.registerCommand("bbj.em", Commands.openEnterpriseManager);

    // Register EM login command
    vscode.commands.registerCommand("bbj.loginEM", async () => {
        const config = vscode.workspace.getConfiguration("bbj");
        const bbjHome = config.get<string>("home");

        if (!bbjHome) {
            vscode.window.showErrorMessage("Please set bbj.home first", "Open Settings").then(sel => {
                if (sel === "Open Settings") {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.home');
                }
            });
            return;
        }

        // Prompt for credentials
        const username = await vscode.window.showInputBox({
            prompt: "EM Username",
            value: "admin",
            ignoreFocusOut: true
        });
        if (!username) return;

        const password = await vscode.window.showInputBox({
            prompt: "EM Password",
            password: true,
            ignoreFocusOut: true
        });
        if (password === undefined) return;

        // Launch em-login.bbj to validate credentials and get token
        const bbj = path.join(bbjHome, 'bin', `bbj${process.platform === 'win32' ? '.exe' : ''}`);
        const emLoginPath = context.asAbsolutePath(path.join('tools', 'em-login.bbj'));

        try {
            const result = await new Promise<string>((resolve, reject) => {
                const { exec } = require('child_process');
                exec(`"${bbj}" -q "${emLoginPath}" - "${username}" "${password}"`,
                    { timeout: 15000 },
                    (err: any, stdout: string, stderr: string) => {
                        if (err) {
                            reject(new Error(stderr || err.message));
                            return;
                        }
                        const output = stdout.trim();
                        if (output.startsWith('ERROR:')) {
                            reject(new Error(output.substring(6)));
                            return;
                        }
                        resolve(output);
                    }
                );
            });

            // Store token in SecretStorage
            await context.secrets.store('bbj.em.token', result);
            vscode.window.showInformationMessage('Successfully logged in to Enterprise Manager');
        } catch (error) {
            vscode.window.showErrorMessage(`EM login failed: ${error}`);
        }
    });
    vscode.commands.registerCommand("bbj.run", Commands.run);

    // BUI command with auto-prompt login
    vscode.commands.registerCommand("bbj.runBUI", async (params) => {
        let creds = await getEMCredentials();
        if (!creds) {
            const login = await vscode.window.showInformationMessage(
                'EM login required for BUI. Login now?', 'Login', 'Cancel'
            );
            if (login === 'Login') {
                await vscode.commands.executeCommand('bbj.loginEM');
                creds = await getEMCredentials();
            }
            if (!creds) return; // User cancelled login
        }
        Commands.runBUI(params, creds);
    });

    // DWC command with auto-prompt login
    vscode.commands.registerCommand("bbj.runDWC", async (params) => {
        let creds = await getEMCredentials();
        if (!creds) {
            const login = await vscode.window.showInformationMessage(
                'EM login required for DWC. Login now?', 'Login', 'Cancel'
            );
            if (login === 'Login') {
                await vscode.commands.executeCommand('bbj.loginEM');
                creds = await getEMCredentials();
            }
            if (!creds) return; // User cancelled login
        }
        Commands.runDWC(params, creds);
    });
    vscode.commands.registerCommand("bbj.decompile", Commands.decompile);
    vscode.commands.registerCommand("bbj.compile", Commands.compile);
    vscode.commands.registerCommand("bbj.denumber", Commands.denumber);
    vscode.commands.registerCommand("bbj.configureCompileOptions", configureCompileOptions);

    vscode.commands.registerCommand("bbj.refreshJavaClasses", async () => {
        if (!client) {
            vscode.window.showErrorMessage('BBj language server not running');
            return;
        }
        try {
            await client.sendRequest('bbj/refreshJavaClasses');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh Java classes: ${error}`);
        }
    });

    // Register command to show available classpath entries
    vscode.commands.registerCommand("bbj.showClasspathEntries", async () => {
        const config = vscode.workspace.getConfiguration("bbj");
        const bbjHome = config.get<string>("home");

        if (!bbjHome) {
            vscode.window.showErrorMessage(
                "Please set bbj.home first to see available classpath entries",
                "Open Settings"
            ).then(selection => {
                if (selection === "Open Settings") {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.home');
                }
            });
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
            fileEvents: fileSystemWatcher,
            configurationSection: 'bbj'
        },
        initializationOptions: {
            home: vscode.workspace.getConfiguration("bbj").get("home"),
            classpath: vscode.workspace.getConfiguration("bbj").get("classpath"),
            typeResolutionWarnings: vscode.workspace.getConfiguration("bbj").get("typeResolution.warnings", true),
            configPath: vscode.workspace.getConfiguration("bbj").get("configPath", null),
            interopHost: vscode.workspace.getConfiguration("bbj").get("interop.host", "localhost"),
            interopPort: vscode.workspace.getConfiguration("bbj").get("interop.port", 5008)
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
