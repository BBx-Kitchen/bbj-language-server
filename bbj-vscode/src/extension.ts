/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    DidChangeConfigurationNotification, LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node';
import { BBjLibraryFileSystemProvider } from './language/lib/fs-provider.js';
import { registerOpenFilePrompts, type OpenFilePrompts } from './open-file-prompts.js';
import { createDenumberCommand } from './denumber-command.js';
import { DENUM_REQUEST_METHOD, type DenumResult } from './language/denum-command.js';
import { registerDiagnosticStatusBars } from './diagnostic-status-bars.js';
import { registerMsgboxComposer } from './msgbox-composer-ui.js';
import { registerAddWindowComposer } from './addwindow-composer-ui.js';
import { registerAddChildWindowComposer } from './addchildwindow-composer-ui.js';
import { registerSetOptsComposer } from './setopts-composer-ui.js';
import { registerSetOptsInCodeComposer } from './setopts-in-code-ui.js';
import { registerComposerLensCommand } from './composer-lens-command.js';
import { registerCvsComposer } from './cvs-composer-ui.js';
import {
    OPTION_GROUP_ORDER,
    getOptionsGrouped,
    validateOptions,
    type CompilerOption
} from './Commands/CompilerOptions.js';
import { getActiveConfigPath, isActiveConfigPath, setResolvedConfigPath, shouldWarnOnce } from './config-path-cache.js';
import { createConfigPathTrustMiddleware, effectiveConfigPath, registerTrustGrantRepush } from './config-path-trust.js';
import { canonicalizeConfigPath, samePath } from './language/config-path-resolver.js';
import { RESOLVED_CONFIG_PATH_METHOD, type ResolvedConfigPathResult } from './language/resolved-config-path-request.js';
import { CONFIG_RELOAD_METHOD, type ConfigReloadNotification } from './language/config-reload-notification.js';
import { OPEN_FORMATTER_SETTINGS_METHOD, FORMATTER_SETTINGS_QUERY } from './language/format-settings-notification.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD } from './language/denum-notifications.js';
import { denumPayloadUri, denumProblems, formatDenumDiagnosticsBlock } from './denum-diagnostics-output.js';
import { createRestartGate, CONFIG_RELOAD_RESTART_DELAY_MS, type RestartGate, type RestartPhase } from './restart-gate.js';
import { createSingleFlightRunner, migrateSplitSingleLineIf } from './settings-migration.js';
import { CONFIG_DOCUMENT_LANGUAGE_ID } from './composer-lens-contract.js';
import { NO_ACTIVE_BBJ_FILE_MESSAGE, resolveRunTarget, toActiveEditorSnapshot } from './Commands/target-resolution.js';
import { ensureValidToken, getEMCredentials as getStoredEMCredentials, registerEmLoginCommand } from './em-auth.js';

import Commands from './Commands/Commands.cjs';

let client: LanguageClient;
let secretStorage: vscode.SecretStorage;
let outputChannel: vscode.LogOutputChannel;
let restartGate: RestartGate | undefined;
let openFilePrompts: OpenFilePrompts | undefined;
let configReloadStatusBar: vscode.StatusBarItem;
let configReloadAutoHideTimer: ReturnType<typeof setTimeout> | undefined;

/** How long the "config reloaded" confirmation stays visible before auto-hiding (#486). */
const CONFIG_RELOAD_CONFIRMATION_HIDE_MS = 5000;

/**
 * A defensive write to the extension-owned output channel (#671): a write that throws must
 * never abort its caller, since the config-reload handler's write sits immediately before
 * restartGate?.request(...), and that request must always be reached even if a future write
 * fails for some other reason.
 */
function appendOutputLine(message: string): void {
    try {
        outputChannel.appendLine(message);
    } catch {
        // Swallow — a broken write is not a reason to skip the restart request that follows.
    }
}

/**
 * The reload's only user-facing signal (#486): a status-bar item that spins while the
 * restart runs, briefly confirms, then auto-hides — never a prompt, modal or toast. A
 * failed restart clears the signal and reuses the existing start-failure error message
 * rather than sticking in the reloading state.
 */
function onConfigRestartPhase(phase: RestartPhase, error?: unknown): void {
    if (configReloadAutoHideTimer) {
        clearTimeout(configReloadAutoHideTimer);
        configReloadAutoHideTimer = undefined;
    }
    switch (phase) {
        case 'restarting': {
            const activePath = getActiveConfigPath();
            configReloadStatusBar.text = '$(sync~spin) Reloading BBj config...';
            configReloadStatusBar.tooltip = activePath
                ? `Reloading the BBj language server — config file: ${activePath}`
                : 'Reloading the BBj language server for the updated config file';
            configReloadStatusBar.show();
            break;
        }
        case 'restarted': {
            configReloadStatusBar.text = '$(check) BBj config reloaded';
            configReloadAutoHideTimer = setTimeout(() => {
                configReloadAutoHideTimer = undefined;
                configReloadStatusBar.hide();
            }, CONFIG_RELOAD_CONFIRMATION_HIDE_MS);
            break;
        }
        case 'failed': {
            configReloadStatusBar.hide();
            const detail = error instanceof Error ? error.message : String(error);
            console.error('BBj language server failed to restart:', error);
            vscode.window.showErrorMessage(`BBj language server did not start: ${detail}`);
            break;
        }
    }
}

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
 * Reads the stored EM token through this activation's secret storage. Kept on
 * the extension entry point (delegating to em-auth.ts's own implementation) so
 * callers and tests can keep importing it from here with no arguments.
 */
export function getEMCredentials(): Promise<{ username: string, password: string } | undefined> {
    return getStoredEMCredentials(secretStorage);
}

const CONFIG_LANGUAGE_ID = CONFIG_DOCUMENT_LANGUAGE_ID;

// Tracks the config path most recently associated as bbx-config. A setting change
// releases exactly this document rather than re-deriving "the previous path" from the
// cache, which only moves once the server's next resolvedConfigPath push arrives.
let lastKnownActiveConfigPath: string | undefined;

/**
 * Switch `doc` to the config-file language when it is the active config path. Idempotent —
 * a document already carrying the language is left alone, and the setting outranks
 * extension-based association, so a configured `myconfig.bbj` is switched exactly like a
 * configured `myproject.cfg` (#485).
 */
function applyConfigAssociation(doc: vscode.TextDocument): void {
    if (doc.uri.scheme !== 'file') return;
    if (doc.languageId === CONFIG_LANGUAGE_ID) return;
    if (isActiveConfigPath(doc.uri.fsPath)) {
        vscode.languages.setTextDocumentLanguage(doc, CONFIG_LANGUAGE_ID);
    }
}

/** Release any open document at `fsPath` that still carries the config-file language. */
function releaseConfigAssociation(fsPath: string): void {
    for (const doc of vscode.workspace.textDocuments) {
        if (doc.uri.scheme === 'file' && doc.languageId === CONFIG_LANGUAGE_ID
            && samePath(canonicalizeConfigPath(doc.uri.fsPath), fsPath)) {
            // VS Code re-applies its own default classification when no explicit language id
            // is supplied. The public API types this parameter as `string` only, so this is a
            // deliberate cast, not a type gap.
            vscode.languages.setTextDocumentLanguage(doc, undefined as unknown as string);
        }
    }
}

/** Apply the config association to every currently open document, then remember what's active. */
function sweepOpenDocumentsForConfigAssociation(): void {
    for (const doc of vscode.workspace.textDocuments) {
        applyConfigAssociation(doc);
    }
    lastKnownActiveConfigPath = getActiveConfigPath();
}

/**
 * Moves a user's old `bbj.formatter.splitSingleLineIF` value to `splitSingleLineIf` in the same
 * settings scope, once on activation and again whenever the old key changes (a Settings Sync pull
 * or a hand edit can bring it in after activation). Runs are fire-and-forget and one at a time: it
 * shows no popup, never rejects, and so cannot hold up or break activation. Each run reads a fresh
 * configuration, since a configuration object is a snapshot. The only disposable it adds is the
 * change listener. The configuration push the language client sends on registration and on every
 * change carries the moved value to the server either way.
 */
function startFormatterSettingsMigration(context: vscode.ExtensionContext): void {
    try {
        const run = createSingleFlightRunner(() => {
            const formatterConfig = vscode.workspace.getConfiguration('bbj.formatter');
            return migrateSplitSingleLineIf({
                inspect: key => formatterConfig.inspect(key),
                update: (key, value, target) => formatterConfig.update(key, value, target),
                userTarget: vscode.ConfigurationTarget.Global,
                workspaceTarget: vscode.ConfigurationTarget.Workspace,
                workspaceTrusted: vscode.workspace.isTrusted,
                log: appendOutputLine
            });
        });
        run();
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('bbj.formatter.splitSingleLineIF')) {
                run();
            }
        }));
    } catch {
        // An unavailable configuration API means there is nothing to migrate.
    }
}

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    BBjLibraryFileSystemProvider.register(context);
    registerMsgboxComposer(context); // spike: visual MSGBOX composer (#426)
    registerAddWindowComposer(context); // spike: visual addWindow flags/event-mask composer (#430)
    registerAddChildWindowComposer(context); // visual addChildWindow flags/event-mask composer (#473)
    registerComposerLensCommand(context); // click-through for server-side composer cues (#650)
    registerCvsComposer(context); // visual CVS() composer (#649)
    registerSetOptsComposer(context); // visual SETOPTS composer for config.bbx (#474)
    registerSetOptsInCodeComposer(context, (method, params) => client.sendRequest(method, params)); // in-code SETOPTS composer (#475, DISC-06)
    secretStorage = context.secrets;

    // The extension owns this channel end-to-end (#671): creating it here — before the
    // language client exists — and passing it into clientOptions.outputChannel below makes
    // vscode-languageclient treat it as caller-owned, so client.stop() (the config-reload
    // restart path) never disposes it out from under Commands.cjs. VS Code disposes it
    // exactly once, through context.subscriptions.
    // `{ log: true }` is required, not cosmetic: vscode-languageclient reads `.logLevel`
    // immediately and later calls `.trace(...)` / `.onDidChangeLogLevel(...)` on whatever
    // channel `clientOptions.outputChannel` supplies, which a plain OutputChannel lacks.
    outputChannel = vscode.window.createOutputChannel('BBj', { log: true });
    context.subscriptions.push(outputChannel);

    client = startLanguageClient(context, outputChannel);

    // The choke point every VS Code restart must go through (#486): reuses this exact
    // client instance (stop then start) so its already-registered notification handlers
    // survive. No second LanguageClient is ever constructed for a restart.
    restartGate = createRestartGate(client, onConfigRestartPhase);
    (Commands as unknown as { setOutputChannel(channel: vscode.OutputChannel): void }).setOutputChannel(outputChannel);
    startFormatterSettingsMigration(context);

    registerConfigFileCommands(context);
    registerEmLoginCommand(context, { outputChannel });
    registerRunCommands(context, { outputChannel });
    registerCompileCommands(context);
    registerJavaClasspathCommands(context, { client });
    registerFormatterSettingsLink(context, { client });
    registerDenumDiagnosticsOutput(context, { client, outputChannel });
    openFilePrompts = registerOpenFilePrompts(context);
    registerDiagnosticStatusBars(context, { client });
    registerConfigReloadStatus(context, { client, restartGate });
    registerConfigAssociation(context, { client });
}

/** Registers bbj.config, bbj.properties and bbj.em. */
function registerConfigFileCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand("bbj.config", Commands.openConfigFile));
    context.subscriptions.push(vscode.commands.registerCommand("bbj.properties", Commands.openPropertiesFile));
    context.subscriptions.push(vscode.commands.registerCommand("bbj.em", Commands.openEnterpriseManager));
}

/** Registers bbj.run and the BUI/DWC commands, both auto-prompting login and validating the token. */
function registerRunCommands(context: vscode.ExtensionContext, deps: { outputChannel: vscode.LogOutputChannel }): void {
    const { outputChannel } = deps;
    context.subscriptions.push(vscode.commands.registerCommand("bbj.run", Commands.run));

    // BUI command with auto-prompt login and token validation
    context.subscriptions.push(vscode.commands.registerCommand("bbj.runBUI", async (params) => {
        const target = resolveRunTarget(params?.fsPath, toActiveEditorSnapshot(vscode.window.activeTextEditor));
        if (!target) {
            vscode.window.showWarningMessage(NO_ACTIVE_BBJ_FILE_MESSAGE);
            return;
        }
        const creds = await ensureValidToken(context, { outputChannel });
        if (!creds) return; // User cancelled login
        Commands.runBUI({ fsPath: target }, creds);
    }));

    // DWC command with auto-prompt login and token validation
    context.subscriptions.push(vscode.commands.registerCommand("bbj.runDWC", async (params) => {
        const target = resolveRunTarget(params?.fsPath, toActiveEditorSnapshot(vscode.window.activeTextEditor));
        if (!target) {
            vscode.window.showWarningMessage(NO_ACTIVE_BBJ_FILE_MESSAGE);
            return;
        }
        const creds = await ensureValidToken(context, { outputChannel });
        if (!creds) return; // User cancelled login
        Commands.runDWC({ fsPath: target }, creds);
    }));
}

/** Registers the compile/denumber/decompile commands and the compiler-options QuickPick. */
function registerCompileCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand("bbj.compile", Commands.compile));
    context.subscriptions.push(vscode.commands.registerCommand("bbj.denumber", createDenumberCommand({
        activeEditor: () => toActiveEditorSnapshot(vscode.window.activeTextEditor),
        openDocument: (fsPath) => vscode.workspace.openTextDocument(vscode.Uri.file(fsPath)),
        isVisible: (uri) => vscode.window.visibleTextEditors.some(editor => editor.document.uri.toString() === uri),
        show: (document) => vscode.window.showTextDocument(document, { preview: false }),
        skipOpenPrompt: (uri) => openFilePrompts?.skipLineNumberedPrompt(uri),
        sendDenum: (params) => client.sendRequest<DenumResult>(DENUM_REQUEST_METHOD, params),
        warn: (message) => { void vscode.window.showWarningMessage(message); },
        error: (message) => { void vscode.window.showErrorMessage(message); },
    })));
    context.subscriptions.push(vscode.commands.registerCommand("bbj.decompile", Commands.decompileReplace));
    context.subscriptions.push(vscode.commands.registerCommand("bbj.decompileReadonly", Commands.decompileReadonly));
    context.subscriptions.push(vscode.commands.registerCommand("bbj.configureCompileOptions", configureCompileOptions));
}

/** Registers the Java classpath refresh command and the classpath-entries picker. */
function registerJavaClasspathCommands(context: vscode.ExtensionContext, deps: { client: LanguageClient }): void {
    const { client } = deps;
    context.subscriptions.push(vscode.commands.registerCommand("bbj.refreshJavaClasses", async () => {
        if (!client) {
            vscode.window.showErrorMessage('BBj language server not running');
            return;
        }
        try {
            await client.sendRequest('bbj/refreshJavaClasses');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh Java classes: ${error}`);
        }
    }));

    // Register command to show available classpath entries
    context.subscriptions.push(vscode.commands.registerCommand("bbj.showClasspathEntries", async () => {
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
    }));
}

/**
 * Registers the handler for the server's open-settings notification. The server has already decided
 * the formatter settings are invalid and the user chose Open Settings; this handler only opens the
 * Settings UI filtered to the formatter settings. It never reads the payload, so a setting name
 * supplied by the peer can never become a command argument.
 */
function registerFormatterSettingsLink(context: vscode.ExtensionContext, deps: { client: LanguageClient }): void {
    const { client } = deps;
    context.subscriptions.push(
        client.onNotification(OPEN_FORMATTER_SETTINGS_METHOD, () => {
            void vscode.commands.executeCommand('workbench.action.openSettings', FORMATTER_SETTINGS_QUERY);
        })
    );
}

function denumSeverity(severity: 'ERROR' | 'WARNING' | 'INFO'): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'ERROR': return vscode.DiagnosticSeverity.Error;
        case 'WARNING': return vscode.DiagnosticSeverity.Warning;
        case 'INFO': return vscode.DiagnosticSeverity.Information;
    }
}

/**
 * Registers the handlers for the server's two denumber notifications. The server sends the list of
 * DENUM's diagnostics after a successful run that reported any, and the reveal request when the
 * user picks Show.
 *
 * The list is placed twice. It becomes problems on the denumbered document, in a collection of its
 * own that is created when the first list names a BBj document the editor has open, and it is
 * written into the 'BBj' channel as plain lines, one block per run, as a log copy that outlives the
 * problems. The reveal request opens the Problems view while any problem is placed, and the
 * channel holding the log copy once none is; it ignores its payload.
 *
 * Nothing in a payload becomes a command, a link or a path to open: the uri only selects an open
 * document by comparing strings, and the problems are keyed by that document's own uri.
 */
function registerDenumDiagnosticsOutput(
    context: vscode.ExtensionContext,
    deps: { client: LanguageClient, outputChannel: vscode.LogOutputChannel }
): void {
    const { client, outputChannel } = deps;
    let collection: vscode.DiagnosticCollection | undefined;
    // The documents that hold problems right now, by uri string. Show reads it to know whether the
    // Problems view has anything to show.
    const placed = new Set<string>();

    function clearProblems(document: vscode.TextDocument): void {
        collection?.delete(document.uri);
        placed.delete(document.uri.toString());
    }

    function placeProblems(params: unknown): void {
        const uri = denumPayloadUri(params);
        if (uri === undefined) {
            return;
        }
        // Parsed only to be compared as text, never opened, so a spelling the editor would
        // normalise differently (a drive-letter case, an encoding) still selects its document.
        const wanted = vscode.Uri.parse(uri).toString();
        const document = vscode.workspace.textDocuments.find(
            candidate => candidate.languageId === 'bbj' && candidate.uri.toString() === wanted
        );
        if (document === undefined) {
            return;
        }
        const problems = denumProblems(params, document.lineCount);
        if (collection === undefined) {
            collection = vscode.languages.createDiagnosticCollection('bbj-denum');
            context.subscriptions.push(collection);
        }
        if (problems.length === 0) {
            clearProblems(document);
            return;
        }
        placed.add(document.uri.toString());
        collection.set(document.uri, problems.map(problem => {
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(problem.line, 0, problem.line, document.lineAt(problem.line).text.length),
                problem.message,
                denumSeverity(problem.severity)
            );
            diagnostic.source = 'BBj Denumber';
            return diagnostic;
        }));
    }

    context.subscriptions.push(
        client.onNotification(DENUM_DIAGNOSTICS_METHOD, (params: unknown) => {
            // Raw appendLine, not the log-level methods: those add a timestamp and the Output
            // panel's level filter could hide an ERROR entry.
            for (const line of formatDenumDiagnosticsBlock(params)) {
                try {
                    outputChannel.appendLine(line);
                } catch {
                    // A broken write must not stop the rest of the list.
                }
            }
            try {
                placeProblems(params);
            } catch {
                // The log copy above already holds the list; a failed placement must not surface.
                // A fixed token only, never the payload or the error text.
                outputChannel.debug('denumber problems not placed');
            }
        }),
        client.onNotification(SHOW_DENUM_DIAGNOSTICS_METHOD, () => {
            if (placed.size === 0) {
                // The problems are gone (the user edited or closed the document), so the Problems
                // view would be empty; the channel still holds the log copy of the list.
                outputChannel.show(true);
                return;
            }
            // preserveFocus opens the view without taking focus from the editor, and never
            // toggles an already focused Problems view closed.
            void vscode.commands.executeCommand('workbench.actions.view.problems', { preserveFocus: true });
        })
    );

    // The problems describe the text the list was computed for, so they go when that text goes:
    // a content change or a close deletes them, and the next list replaces them. An event without
    // a content change (the dirty-state flip of a save) keeps them, because the text is the same.
    // The denumber edit itself never clears its own problems: the server sends the list only after
    // the edit is applied.
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.contentChanges.length > 0) {
                clearProblems(event.document);
            }
        }),
        vscode.workspace.onDidCloseTextDocument(document => {
            clearProblems(document);
        })
    );
}

/** Registers the config-reload status bar (#486) and the notification handler that drives it through the restart gate. */
function registerConfigReloadStatus(context: vscode.ExtensionContext, deps: { client: LanguageClient, restartGate: RestartGate | undefined }): void {
    const { client, restartGate } = deps;
    // Config-reload status bar indicator (#486) — hidden by default, driven
    // entirely by onConfigRestartPhase via the restart gate above.
    configReloadStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 98
    );
    context.subscriptions.push(configReloadStatusBar);

    // The server already decided a restart is required (#486) — this handler never judges
    // relevance itself, it only logs and hands the request to the choke point above.
    context.subscriptions.push(
        client.onNotification(CONFIG_RELOAD_METHOD, (params: ConfigReloadNotification) => {
            appendOutputLine(
                `BBj config changed (${params.reason}): ${params.path ?? '(no path)'} — reloading language server.`
            );
            restartGate?.request(CONFIG_RELOAD_RESTART_DELAY_MS);
        })
    );
}

/** Registers the resolved-config-path handler and the config-file association listeners. */
function registerConfigAssociation(context: vscode.ExtensionContext, deps: { client: LanguageClient }): void {
    const { client } = deps;
    // Hold the server-pushed resolved config path as the host's warm cache (#485). Never
    // throws and never blocks activation — a bad payload just means no cache update.
    context.subscriptions.push(
        client.onNotification(RESOLVED_CONFIG_PATH_METHOD, (params: ResolvedConfigPathResult) => {
            const previousActive = lastKnownActiveConfigPath;
            setResolvedConfigPath(params);
            if (params.path && !params.exists && shouldWarnOnce(params.path)) {
                vscode.window.showWarningMessage(
                    `BBj config file not found or unreadable: ${params.path}. No prefixes were loaded.`
                );
            }
            // This push always arrives after the local bbj.configPath settings-change listener has
            // already fired and re-swept using the stale (pre-update) cache, so that listener's
            // release is a no-op — this handler must release the previously-active path itself
            // whenever the resolution actually changed, rather than relying on the settings listener
            // to have done it (#485).
            const newActive = getActiveConfigPath();
            if (previousActive && (!newActive || !samePath(previousActive, newActive))) {
                releaseConfigAssociation(previousActive);
            }
            // The first server answer may associate files that were already open before it arrived.
            sweepOpenDocumentsForConfigAssociation();
        })
    );

    // Apply bbx-config to the configured file on every classification trigger. A single
    // trigger (e.g. only at activation) silently regresses to the reopen/revert failure
    // this covers — the association must survive close/reopen and a config-path change (#485).
    // Deliberately no onDidChangeTextDocument listener here: open/rename and the two
    // config-path-changing paths (the server push above and the settings listener below)
    // already cover every case a config file's association needs to (re)evaluate, and wiring
    // this to every keystroke would run isActiveConfigPath's synchronous filesystem checks on
    // a hot, high-frequency event path before the server's first push has warmed the cache.
    sweepOpenDocumentsForConfigAssociation();
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => applyConfigAssociation(doc))
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration('bbj.configPath')) return;
            if (lastKnownActiveConfigPath) {
                releaseConfigAssociation(lastKnownActiveConfigPath);
            }
            sweepOpenDocumentsForConfigAssociation();
        })
    );
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    // Cancel any pending restart before disposing the client — a scheduled restart must
    // never fire against a client that is being (or has been) shut down (#486).
    restartGate?.cancel();
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext, outputChannel: vscode.LogOutputChannel): LanguageClient {
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

    // Referenced by sendBbjSettings below, assigned once the client is constructed further
    // down; the closure is only ever invoked after that assignment (on a later push or a
    // trust-grant re-push), never synchronously during client construction itself.
    let client: LanguageClient;
    const sendBbjSettings = (settings: Record<string, unknown>): Promise<void> =>
        client.sendNotification(DidChangeConfigurationNotification.type, { settings });

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Supplying our own channel here makes vscode-languageclient treat it as
        // caller-owned (#671): its `_disposeOutputChannel` stays false, so `client.stop()` —
        // the config-reload restart path — never disposes it and a restart can never leave
        // a dead channel object behind.
        outputChannel,
        // A config document reaches the server only for its composer cue (#650) — it is never
        // parsed, linked, indexed, validated or diagnosed as BBj source; `BBjDocumentBuilder`'s
        // own filter drops it before Langium's build.
        documentSelector: [
            { scheme: 'file', language: 'bbj' },
            { scheme: 'file', language: CONFIG_DOCUMENT_LANGUAGE_ID },
        ],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher,
            configurationSection: 'bbj'
        },
        // The push and pull settings handoffs must stay trust-gated too (issue #511):
        // vscode-languageclient's own `next()` for `didChangeConfiguration` re-reads the raw
        // workspace value and cannot be handed a substituted one, so this middleware builds
        // and sends the payload itself instead of calling `next` for an actual section list.
        middleware: {
            workspace: createConfigPathTrustMiddleware(sendBbjSettings)
        },
        initializationOptions: {
            version: context.extension.packageJSON.version,
            home: vscode.workspace.getConfiguration("bbj").get("home"),
            classpath: vscode.workspace.getConfiguration("bbj").get("classpath"),
            typeResolutionWarnings: vscode.workspace.getConfiguration("bbj").get("typeResolution.warnings", true),
            configPath: effectiveConfigPath(),
            interopHost: vscode.workspace.getConfiguration("bbj").get("interop.host"),
            interopPort: vscode.workspace.getConfiguration("bbj").get("interop.port"),
            suppressCascading: vscode.workspace.getConfiguration("bbj").get("diagnostics.suppressCascading", true),
            maxErrors: vscode.workspace.getConfiguration("bbj").get("diagnostics.maxErrors", 20),
            compilerTrigger: vscode.workspace.getConfiguration("bbj").get("compiler.trigger", "debounced"),
            inlayHintsParameterNames: vscode.workspace.getConfiguration("bbj").get("inlayHints.parameterNames.enabled", "literals"),
            formatter: vscode.workspace.getConfiguration("bbj").get("formatter")
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'bbj',
        'BBj',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server. Surface (not silently swallow) a
    // start failure -- otherwise every command stays registered as though the server had
    // started, and the rejection becomes an unhandled promise rejection in the extension host.
    client.start().catch(error => {
        const detail = error instanceof Error ? error.message : String(error);
        console.error('BBj language server failed to start:', error);
        vscode.window.showErrorMessage(`BBj language server did not start: ${detail}`);
    });

    // Granting Workspace Trust makes the workspace-scoped bbj.configPath take effect without a
    // reload: re-send the gated settings through the same builder the push path uses (issue #511).
    context.subscriptions.push(
        registerTrustGrantRepush(sendBbjSettings, error => {
            const detail = error instanceof Error ? error.message : String(error);
            appendOutputLine(`Re-sending settings after the workspace trust grant failed: ${detail}`);
        })
    );
    return client;
}
