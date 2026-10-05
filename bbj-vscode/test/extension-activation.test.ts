import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Regression for P62-D2-004: extension.ts's startLanguageClient() calls client.start()
 * without awaiting it or attaching a .catch(). If the language-server process fails to
 * spawn, that rejection was previously never observed anywhere — an unhandled promise
 * rejection in the extension host, with every command still registered as though the
 * server had started.
 *
 * extension.ts pulls in vscode-languageclient's LanguageClient plus several extension-only
 * UI/registration modules — all mocked below so this test isolates the client.start()
 * rejection path without spinning up a real VS Code extension host, the composer
 * webviews, or the actual language server process.
 */

const { registeredCommandIds, commandHandlers, openListeners, sentRequests, onNotificationMock } = vi.hoisted(() => ({
    registeredCommandIds: new Set<string>(),
    commandHandlers: new Map<string, (...args: unknown[]) => unknown>(),
    openListeners: [] as Array<(document: unknown) => void>,
    sentRequests: [] as string[],
    onNotificationMock: vi.fn((_method: string, _handler: (...args: unknown[]) => void) => ({ dispose: vi.fn() })),
}));

const startMock = vi.fn();

vi.mock('vscode', () => {
    const disposable = () => ({ dispose: vi.fn() });
    return {
        window: {
            showErrorMessage: vi.fn(),
            showWarningMessage: vi.fn(),
            showInformationMessage: vi.fn(),
            showInputBox: vi.fn(),
            showQuickPick: vi.fn(),
            showTextDocument: vi.fn(),
            createQuickPick: vi.fn(),
            createStatusBarItem: vi.fn(() => ({ text: '', tooltip: '', show: vi.fn(), hide: vi.fn(), dispose: vi.fn() })),
            createOutputChannel: vi.fn(() => ({
                appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(),
                info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn(),
            })),
            tabGroups: { all: [], onDidChangeTabs: vi.fn(() => disposable()) },
            onDidChangeActiveTextEditor: vi.fn(() => disposable()),
            activeTextEditor: undefined,
        },
        commands: {
            registerCommand: vi.fn((id: string, handler: (...args: unknown[]) => unknown) => {
                if (registeredCommandIds.has(id)) {
                    throw new Error(`command '${id}' already exists`);
                }
                registeredCommandIds.add(id);
                commandHandlers.set(id, handler);
                return { dispose: () => { registeredCommandIds.delete(id); commandHandlers.delete(id); } };
            }),
            executeCommand: vi.fn(),
        },
        languages: {
            registerDocumentFormattingEditProvider: vi.fn(() => disposable()),
            registerCodeActionsProvider: vi.fn(() => disposable()),
            registerCodeLensProvider: vi.fn(() => disposable()),
            onDidChangeDiagnostics: vi.fn(() => disposable()),
            getDiagnostics: vi.fn(() => []),
            setTextDocumentLanguage: vi.fn(),
            createDiagnosticCollection: vi.fn(() => ({
                set: vi.fn(), delete: vi.fn(), clear: vi.fn(), has: vi.fn(), dispose: vi.fn(),
            })),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => disposable()),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
                formatter: {},
            })),
            textDocuments: [],
            openTextDocument: vi.fn(),
            onDidOpenTextDocument: vi.fn((listener: (document: unknown) => void) => {
                openListeners.push(listener);
                return disposable();
            }),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
            onDidChangeConfiguration: vi.fn(() => disposable()),
            workspaceFolders: undefined,
            isTrusted: true,
            onDidGrantWorkspaceTrust: vi.fn(() => disposable()),
        },
        StatusBarAlignment: { Left: 1, Right: 2 },
        DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
        ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
        QuickPickItemKind: { Separator: -1 },
        CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
        Uri: class {
            // Stands in for the editor's own spelling, which encodes the colon of a drive letter.
            static parse(value: string) { return { toString: () => value.replace(/^file:\/\/\/([a-z]):/i, 'file:///$1%3A') }; }
        },
        Range: class {
            constructor(
                public startLine: number, public startCharacter: number,
                public endLine: number, public endCharacter: number
            ) { }
        },
        Diagnostic: class {
            source?: string;
            constructor(public range: unknown, public message: string, public severity?: number) { }
        },
    };
});

vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        outputChannel = { appendLine: vi.fn() };
        start = startMock;
        stop = vi.fn();
        onNotification = onNotificationMock;
        needsStop = () => true;
        // A plain function: it records the request in the order the start and the request happen.
        sendRequest(method: string): Promise<unknown> {
            sentRequests.push(method);
            return Promise.resolve(undefined);
        }
        constructor() { }
    }
    return {
        LanguageClient,
        TransportKind: { ipc: 1 },
        DidChangeConfigurationNotification: { type: { method: 'workspace/didChangeConfiguration' } },
    };
});

vi.mock('../src/language/lib/fs-provider.js', () => ({
    BBjLibraryFileSystemProvider: { register: vi.fn() },
}));
vi.mock('../src/msgbox-composer-ui.js', () => ({ registerMsgboxComposer: vi.fn() }));
vi.mock('../src/addwindow-composer-ui.js', () => ({ registerAddWindowComposer: vi.fn() }));
vi.mock('../src/addchildwindow-composer-ui.js', () => ({ registerAddChildWindowComposer: vi.fn() }));
vi.mock('../src/composer-lens-command.js', () => ({ registerComposerLensCommand: vi.fn() }));
vi.mock('../src/cvs-composer-ui.js', () => ({ registerCvsComposer: vi.fn() }));
vi.mock('../src/setopts-composer-ui.js', () => ({ registerSetOptsComposer: vi.fn() }));
vi.mock('../src/Commands/Commands.cjs', () => ({
    default: {
        openConfigFile: vi.fn(),
        openPropertiesFile: vi.fn(),
        openEnterpriseManager: vi.fn(),
        run: vi.fn(),
        runBUI: vi.fn(),
        runDWC: vi.fn(),
        compile: vi.fn(),
        decompileReplace: vi.fn(),
        decompileReadonly: vi.fn(),
        setOutputChannel: vi.fn(),
    },
}));

import * as vscode from 'vscode';
import { activate } from '../src/extension.js';
import { OPEN_FORMATTER_SETTINGS_METHOD } from '../src/language/format-settings-notification.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD } from '../src/language/denum-notifications.js';

/** Fresh mock ExtensionContext — every activate() call must get its own, since disposal
 *  and re-registration are tracked through each context's own `subscriptions` array. */
function makeContext(): Parameters<typeof activate>[0] {
    return {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];
}

function disposeSubscriptions(context: Parameters<typeof activate>[0]): void {
    for (const sub of context.subscriptions as Array<{ dispose(): void }>) {
        sub.dispose();
    }
}

/** A text document as the extension sees it; the untitled scheme keeps the config-file association out of the way. */
function fakeDocument(languageId: string): vscode.TextDocument {
    return { languageId, uri: { scheme: 'untitled', fsPath: '' } } as unknown as vscode.TextDocument;
}

function openDocuments(): vscode.TextDocument[] {
    return vscode.workspace.textDocuments as unknown as vscode.TextDocument[];
}

beforeEach(() => {
    registeredCommandIds.clear();
    commandHandlers.clear();
    openListeners.length = 0;
    sentRequests.length = 0;
    openDocuments().length = 0;
    onNotificationMock.mockClear();
    startMock.mockReset();
    startMock.mockImplementation(() => Promise.resolve());
});

describe('extension activation (P62-D2-004)', () => {
    test('a client.start() rejection is observed and surfaced, not left unhandled', async () => {
        startMock.mockImplementation(() => Promise.reject(new Error('spawn ENOENT')));
        openDocuments().push(fakeDocument('bbj'));

        const context = {
            subscriptions: [],
            secrets: {},
            asAbsolutePath: (p: string) => p,
            extension: { packageJSON: { version: '0.0.0-test' } },
        } as unknown as Parameters<typeof activate>[0];

        activate(context);

        // Let the microtask queue drain so the .catch() handler attached to client.start() runs.
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        const calls = (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mock.calls;
        const message = calls.map(c => String(c[0])).join('\n');
        expect(message).toMatch(/did not start/i);
    });

    test('a successful client.start() activates without surfacing an error', async () => {
        startMock.mockImplementation(() => Promise.resolve());
        openDocuments().push(fakeDocument('bbj'));

        const context = {
            subscriptions: [],
            secrets: {},
            asAbsolutePath: (p: string) => p,
            extension: { packageJSON: { version: '0.0.0-test' } },
        } as unknown as Parameters<typeof activate>[0];

        (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mockClear();

        activate(context);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(startMock).toHaveBeenCalledTimes(1);
    });
});

describe('language client starts on the first BBj document, not on activation', () => {
    test('activation in a window without a BBj document starts no client, yet every notification handler is held for it', () => {
        openDocuments().push(fakeDocument('plaintext'));
        const context = makeContext();

        activate(context);

        expect(startMock).not.toHaveBeenCalled();
        expect(onNotificationMock.mock.calls.length).toBeGreaterThan(0);
        disposeSubscriptions(context);
    });

    test('a document of another language opening later does not start the client', () => {
        const context = makeContext();
        activate(context);

        openListeners.forEach(listener => listener(fakeDocument('typescript')));
        openListeners.forEach(listener => listener(fakeDocument('json')));

        expect(startMock).not.toHaveBeenCalled();
        disposeSubscriptions(context);
    });

    test('a BBj document that is already open at activation starts the client once', () => {
        openDocuments().push(fakeDocument('bbj'), fakeDocument('bbj'));
        const context = makeContext();

        activate(context);

        expect(startMock).toHaveBeenCalledTimes(1);
        disposeSubscriptions(context);
    });

    test('a BBj document opening after activation starts the client once, however many follow', () => {
        const context = makeContext();
        activate(context);
        expect(startMock).not.toHaveBeenCalled();

        openListeners.forEach(listener => listener(fakeDocument('bbj')));
        openListeners.forEach(listener => listener(fakeDocument('bbx-config')));
        openListeners.forEach(listener => listener(fakeDocument('bbj')));

        expect(startMock).toHaveBeenCalledTimes(1);
        disposeSubscriptions(context);
    });

    test('Refresh Java Classes starts the client first and only then sends its request', async () => {
        let startedAt = -1;
        startMock.mockImplementation(() => {
            startedAt = sentRequests.length;
            return Promise.resolve();
        });
        const context = makeContext();
        activate(context);
        expect(startMock).not.toHaveBeenCalled();

        await commandHandlers.get('bbj.refreshJavaClasses')!();

        expect(startMock).toHaveBeenCalledTimes(1);
        expect(startedAt).toBe(0);
        expect(sentRequests).toEqual(['bbj/refreshJavaClasses']);
        disposeSubscriptions(context);
    });

    test('Refresh Java Classes after a document already started the client does not start it again', async () => {
        openDocuments().push(fakeDocument('bbj'));
        const context = makeContext();
        activate(context);

        await commandHandlers.get('bbj.refreshJavaClasses')!();

        expect(startMock).toHaveBeenCalledTimes(1);
        disposeSubscriptions(context);
    });

    test('Refresh Java Classes reports a failed start once and never sends a request', async () => {
        startMock.mockImplementation(() => Promise.reject(new Error('spawn ENOENT')));
        (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mockClear();
        const context = makeContext();
        activate(context);

        await commandHandlers.get('bbj.refreshJavaClasses')!();

        expect(startMock).toHaveBeenCalledTimes(1);
        expect(sentRequests).toEqual([]);
        const messages = (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mock.calls.map(c => String(c[0]));
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatch(/did not start.*spawn ENOENT/i);
        disposeSubscriptions(context);
    });

    test('Refresh Java Classes after a failed start tries again and sends once the server is up', async () => {
        startMock.mockImplementationOnce(() => Promise.reject(new Error('spawn ENOENT')));
        const context = makeContext();
        activate(context);

        await commandHandlers.get('bbj.refreshJavaClasses')!();
        expect(sentRequests).toEqual([]);

        await commandHandlers.get('bbj.refreshJavaClasses')!();

        expect(startMock).toHaveBeenCalledTimes(2);
        expect(sentRequests).toEqual(['bbj/refreshJavaClasses']);
        disposeSubscriptions(context);
    });

    test('a document opening after a failed start tries to start the client again', async () => {
        startMock.mockImplementationOnce(() => Promise.reject(new Error('spawn ENOENT')));
        openDocuments().push(fakeDocument('bbj'));
        const context = makeContext();
        activate(context);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(startMock).toHaveBeenCalledTimes(1);

        openListeners.forEach(listener => listener(fakeDocument('bbj')));

        expect(startMock).toHaveBeenCalledTimes(2);
        disposeSubscriptions(context);
    });

    test('a failed start triggered by a document produces no unhandled rejection', async () => {
        startMock.mockImplementation(() => Promise.reject(new Error('spawn ENOENT')));
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
        process.on('unhandledRejection', onUnhandled);
        const context = makeContext();
        try {
            activate(context);
            openListeners.forEach(listener => listener(fakeDocument('bbj')));
            // Several event-loop turns, so a rejection nobody handles has surfaced by now.
            await new Promise(resolve => setTimeout(resolve, 20));
        } finally {
            process.off('unhandledRejection', onUnhandled);
        }

        expect(unhandled).toEqual([]);
        expect(startMock).toHaveBeenCalledTimes(1);
        disposeSubscriptions(context);
    });
});

describe('extension re-activation (#531)', () => {
    test('activating twice without disposing the first throws on a duplicate command id', () => {
        activate(makeContext());

        expect(() => activate(makeContext())).toThrow(/already exists/);
    });

    test('a second activation after disposing the first registers every command again without throwing', () => {
        const first = makeContext();
        activate(first);
        disposeSubscriptions(first);
        expect(registeredCommandIds.size).toBe(0);

        const second = makeContext();
        expect(() => activate(second)).not.toThrow();
        expect(registeredCommandIds.size).toBeGreaterThan(0);

        disposeSubscriptions(second);
        expect(registeredCommandIds.size).toBe(0);
    });

    test('no client-side formatting provider is registered, and every notification handler is disposed with the activation, alongside every command', () => {
        (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mockClear();
        (vscode.languages.registerDocumentFormattingEditProvider as ReturnType<typeof vi.fn>).mockClear();
        onNotificationMock.mockClear();

        const context = makeContext();
        activate(context);

        const commandResults = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.results.map(r => r.value);
        expect(commandResults.length).toBeGreaterThan(0);
        for (const result of commandResults) {
            expect(context.subscriptions).toContain(result);
        }

        // The language server's formatting capability is the only BBj formatter; the extension
        // never registers a second one.
        expect(vscode.languages.registerDocumentFormattingEditProvider).not.toHaveBeenCalled();

        expect(onNotificationMock.mock.calls.length).toBeGreaterThanOrEqual(3);
        const notificationNames = onNotificationMock.mock.calls.map(c => c[0]);
        expect(notificationNames).toContain('bbj/bbjcplAvailability');
        expect(notificationNames).toContain(DENUM_DIAGNOSTICS_METHOD);
        expect(notificationNames).toContain(SHOW_DENUM_DIAGNOSTICS_METHOD);
        for (const result of onNotificationMock.mock.results.map(r => r.value)) {
            expect(context.subscriptions).toContain(result);
        }

        disposeSubscriptions(context);
    });
});

describe('formatter settings link', () => {
    function activateAndFindHandler(): { context: Parameters<typeof activate>[0]; handler: (params?: unknown) => void; registrations: number } {
        onNotificationMock.mockClear();
        const context = makeContext();
        activate(context);

        const matching = onNotificationMock.mock.calls
            .map((call, index) => ({ method: call[0], handler: call[1], result: onNotificationMock.mock.results[index].value }))
            .filter(entry => entry.method === OPEN_FORMATTER_SETTINGS_METHOD);
        expect(context.subscriptions).toContain(matching[0]?.result);
        return { context, handler: matching[0]?.handler as (params?: unknown) => void, registrations: matching.length };
    }

    test('exactly one handler is registered for the open-settings notification, and it is disposed with the activation', () => {
        const { context, registrations } = activateAndFindHandler();

        expect(registrations).toBe(1);

        disposeSubscriptions(context);
    });

    test.each([
        ['a normal payload', { keys: ['bbj.formatter.indentWidth'] }],
        ['a hostile payload', { keys: ['"; rm -rf /', 'workbench.action.reloadWindow'] }],
        ['no payload', undefined],
    ])('%s opens the settings view filtered to the formatter settings and nothing else', (_name, payload) => {
        const { context, handler } = activateAndFindHandler();
        const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
        executeCommand.mockClear();

        handler(payload);

        expect(executeCommand.mock.calls).toEqual([['workbench.action.openSettings', 'bbj.formatter']]);

        disposeSubscriptions(context);
    });
});

describe('denumber diagnostics output', () => {
    interface ChannelMock {
        appendLine: ReturnType<typeof vi.fn>;
        show: ReturnType<typeof vi.fn>;
        info: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
        debug: ReturnType<typeof vi.fn>;
        trace: ReturnType<typeof vi.fn>;
    }

    function activateAndFindHandlers(): {
        context: Parameters<typeof activate>[0];
        channel: ChannelMock;
        list: (params?: unknown) => void;
        reveal: (params?: unknown) => void;
        listRegistrations: number;
        revealRegistrations: number;
    } {
        onNotificationMock.mockClear();
        const createOutputChannel = vscode.window.createOutputChannel as ReturnType<typeof vi.fn>;
        createOutputChannel.mockClear();
        const context = makeContext();
        activate(context);

        const find = (method: string) => onNotificationMock.mock.calls
            .map((call, index) => ({ method: call[0], handler: call[1], result: onNotificationMock.mock.results[index].value }))
            .filter(entry => entry.method === method);
        const lists = find(DENUM_DIAGNOSTICS_METHOD);
        const reveals = find(SHOW_DENUM_DIAGNOSTICS_METHOD);
        expect(context.subscriptions).toContain(lists[0]?.result);
        expect(context.subscriptions).toContain(reveals[0]?.result);
        return {
            context,
            channel: createOutputChannel.mock.results[0].value as ChannelMock,
            list: lists[0]?.handler as (params?: unknown) => void,
            reveal: reveals[0]?.handler as (params?: unknown) => void,
            listRegistrations: lists.length,
            revealRegistrations: reveals.length,
        };
    }

    const payload = {
        uri: 'file:///ws/a.bbj',
        version: 1,
        diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' }],
    };

    test('each notification has exactly one handler, disposed with the activation', () => {
        const { context, listRegistrations, revealRegistrations } = activateAndFindHandlers();

        expect(listRegistrations).toBe(1);
        expect(revealRegistrations).toBe(1);

        disposeSubscriptions(context);
    });

    test('the list notification appends the block to the BBj channel as raw lines and does nothing else', () => {
        const { context, channel, list } = activateAndFindHandlers();
        const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
        executeCommand.mockClear();

        list(payload);

        expect(channel.appendLine.mock.calls).toEqual([
            ['Denumber diagnostics for /ws/a.bbj:'],
            ['  line 1 (original 0010) ERROR: syntax error'],
        ]);
        for (const method of [channel.info, channel.warn, channel.error, channel.debug, channel.trace, channel.show]) {
            expect(method).not.toHaveBeenCalled();
        }
        expect(executeCommand).not.toHaveBeenCalled();
        expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);

        disposeSubscriptions(context);
    });

    test('two runs append two blocks, each starting with its own header', () => {
        const { context, channel, list } = activateAndFindHandlers();

        list(payload);
        list(payload);

        const lines = channel.appendLine.mock.calls.map(call => call[0]);
        expect(lines).toEqual([
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: syntax error',
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: syntax error',
        ]);

        disposeSubscriptions(context);
    });

    test('a hostile list payload only appends text and never opens, runs or jumps anywhere', () => {
        const { context, channel, list } = activateAndFindHandlers();
        const spies = [
            vscode.commands.executeCommand,
            vscode.window.showTextDocument,
            vscode.workspace.openTextDocument,
        ] as Array<ReturnType<typeof vi.fn>>;
        spies.forEach(spy => spy.mockClear());

        list({
            uri: 'command:workbench.action.reloadWindow',
            diagnostics: [{ line: 1, originalLineNumber: '', severity: 'ERROR', message: 'command:workbench.action.quit' }],
        });

        expect(channel.appendLine.mock.calls).toEqual([
            ['Denumber diagnostics for command:workbench.action.reloadWindow:'],
            ['  line 1 ERROR: command:workbench.action.quit'],
        ]);
        spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

        disposeSubscriptions(context);
    });

    test.each([
        ['null', null],
        ['a number', 42],
        ['a string', 'text'],
        ['an object without diagnostics', { uri: 7 }],
    ])('a malformed list payload (%s) does not throw and still writes a header', (_name, payload) => {
        const { context, channel, list } = activateAndFindHandlers();

        expect(() => list(payload)).not.toThrow();

        expect(channel.appendLine).toHaveBeenCalledTimes(1);
        expect(channel.appendLine.mock.calls[0][0]).toBe('Denumber diagnostics for an unknown file:');

        disposeSubscriptions(context);
    });

    test.each([
        ['a file uri payload', { uri: 'file:///etc/passwd' }],
        ['no payload', undefined],
        ['a string payload', 'x'],
    ])('the reveal notification with %s and no problem placed shows the BBj channel and nothing else', (_name, payload) => {
        const { context, channel, reveal } = activateAndFindHandlers();
        const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
        const spies = [
            vscode.window.showTextDocument,
            vscode.workspace.openTextDocument,
        ] as Array<ReturnType<typeof vi.fn>>;
        executeCommand.mockClear();
        spies.forEach(spy => spy.mockClear());

        reveal(payload);

        expect(channel.show.mock.calls).toEqual([[true]]);
        expect(executeCommand).not.toHaveBeenCalled();
        expect(channel.appendLine).not.toHaveBeenCalled();
        spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

        disposeSubscriptions(context);
    });

    describe('problems for an open document', () => {
        const createCollection = vscode.languages.createDiagnosticCollection as ReturnType<typeof vi.fn>;

        interface CollectionMock {
            set: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
            dispose: ReturnType<typeof vi.fn>;
        }

        const openDocuments: unknown[] = [];

        /** Puts a fake open document into the editor's document list for the length of one test. */
        function open(uri: string, lines: string[], languageId = 'bbj', version = 1): { uri: { toString(): string }; lineCount: number; version: number } {
            const document = {
                uri: { toString: () => uri },
                languageId,
                version,
                lineCount: lines.length,
                lineAt: (n: number) => ({ text: lines[n] }),
            };
            (vscode.workspace.textDocuments as unknown[]).push(document);
            openDocuments.push(document);
            return document;
        }

        beforeEach(() => {
            createCollection.mockClear();
        });

        afterEach(() => {
            const documents = vscode.workspace.textDocuments as unknown[];
            for (const document of openDocuments.splice(0)) {
                documents.splice(documents.indexOf(document), 1);
            }
        });

        function collections(): CollectionMock[] {
            return createCollection.mock.results.map(result => result.value as CollectionMock);
        }

        test('a list for an open BBj document becomes one problem on the first line, keyed by the document own uri', () => {
            const { context, channel, list } = activateAndFindHandlers();
            const document = open('file:///ws/a.bbj', ['L10: if then', 'x', 'y']);

            list(payload);

            expect(createCollection.mock.calls).toEqual([['bbj-denum']]);
            const [collection] = collections();
            expect(collection.set).toHaveBeenCalledTimes(1);
            const [target, diagnostics] = collection.set.mock.calls[0] as [unknown, Array<Record<string, unknown>>];
            expect(target).toBe(document.uri);
            expect(diagnostics).toHaveLength(1);
            expect(diagnostics[0].range).toMatchObject({ startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 12 });
            expect(diagnostics[0].message).toBe('syntax error (original line 0010)');
            expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Error);
            expect(diagnostics[0].source).toBe('BBj Denumber');
            expect(context.subscriptions).toContain(collection);
            expect(channel.appendLine.mock.calls).toEqual([
                ['Denumber diagnostics for /ws/a.bbj:'],
                ['  line 1 (original 0010) ERROR: syntax error'],
            ]);

            disposeSubscriptions(context);
        });

        test('a list whose version equals the open document version is placed', () => {
            const { context, list } = activateAndFindHandlers();
            const document = open('file:///ws/a.bbj', ['L10: if then', 'x', 'y'], 'bbj', 7);

            list({ ...payload, version: 7 });

            const [collection] = collections();
            expect(collection.set).toHaveBeenCalledTimes(1);
            expect(collection.set.mock.calls[0][0]).toBe(document.uri);

            disposeSubscriptions(context);
        });

        test.each<[string, Record<string, unknown>]>([
            ['a missing version', { uri: 'file:///ws/a.bbj', diagnostics: payload.diagnostics }],
            ['a version that differs from the document', { ...payload, version: 2 }],
            ['a version older than the document', { ...payload, version: 0 }],
            ['a negative version', { ...payload, version: -1 }],
            ['a fractional version', { ...payload, version: 1.5 }],
            ['a version that is text', { ...payload, version: '1' }],
            ['a null version', { ...payload, version: null }],
        ])('%s writes the log copy and places nothing', (_name, unversioned) => {
            const { context, channel, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three']);

            expect(() => list(unversioned)).not.toThrow();

            expect(createCollection).not.toHaveBeenCalled();
            expect(channel.appendLine.mock.calls).toEqual([
                ['Denumber diagnostics for /ws/a.bbj:'],
                ['  line 1 (original 0010) ERROR: syntax error'],
            ]);
            expect(channel.debug).not.toHaveBeenCalled();

            disposeSubscriptions(context);
        });

        test('a document typed into after the edit, so past the version of the list, gets nothing placed', () => {
            const { context, list } = activateAndFindHandlers();
            const document = open('file:///ws/a.bbj', ['one', 'two', 'three'], 'bbj', 2);

            document.version = 3;
            list({ ...payload, version: 2 });

            expect(createCollection).not.toHaveBeenCalled();

            disposeSubscriptions(context);
        });

        test('the collection is created once and reused by the next list', () => {
            const { context, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three']);

            list(payload);
            list(payload);

            expect(createCollection).toHaveBeenCalledTimes(1);
            expect(collections()[0].set).toHaveBeenCalledTimes(2);

            disposeSubscriptions(context);
        });

        test('each placed problem sits on its own line with its own severity, and every line is clamped to the document', () => {
            const { context, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['first', 'second', 'third']);

            list({
                uri: 'file:///ws/a.bbj',
                version: 1,
                diagnostics: [
                    { line: 0, originalLineNumber: '', severity: 'INFO', message: 'note' },
                    { line: 2, originalLineNumber: '0020', severity: 'WARNING', message: 'careful' },
                    { line: 99, originalLineNumber: '', severity: 'ERROR', message: 'past the end' },
                ],
            });

            const diagnostics = collections()[0].set.mock.calls[0][1] as Array<Record<string, unknown>>;
            expect(diagnostics.map(d => (d.range as { startLine: number }).startLine)).toEqual([0, 1, 2]);
            expect(diagnostics.map(d => d.severity)).toEqual([
                vscode.DiagnosticSeverity.Information,
                vscode.DiagnosticSeverity.Warning,
                vscode.DiagnosticSeverity.Error,
            ]);
            expect(diagnostics[0].message).toContain('(no location');
            expect(diagnostics[2].range).toMatchObject({ endCharacter: 'third'.length });

            disposeSubscriptions(context);
        });

        test('a second list replaces the first with only its own entries', () => {
            const { context, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three']);

            list(payload);
            list({
                uri: 'file:///ws/a.bbj',
                version: 1,
                diagnostics: [{ line: 3, originalLineNumber: '', severity: 'WARNING', message: 'second run' }],
            });

            const { set } = collections()[0];
            expect(set).toHaveBeenCalledTimes(2);
            const second = set.mock.calls[1][1] as Array<Record<string, unknown>>;
            expect(second.map(d => d.message)).toEqual(['second run']);

            disposeSubscriptions(context);
        });

        test('a list whose entries are all invalid removes the document problems and places none', () => {
            const { context, list } = activateAndFindHandlers();
            const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);

            list({ uri: 'file:///ws/a.bbj', version: 1, diagnostics: [{ line: -1, severity: 'ERROR', message: 'bad' }, null] });

            const [collection] = collections();
            expect(collection.set).not.toHaveBeenCalled();
            expect(collection.delete.mock.calls).toEqual([[document.uri]]);

            disposeSubscriptions(context);
        });

        test.each([
            ['a uri that is not open', { uri: 'file:///ws/other.bbj', diagnostics: payload.diagnostics }],
            ['a command uri', { uri: 'command:workbench.action.reloadWindow', diagnostics: payload.diagnostics }],
            ['a numeric uri', { uri: 7, diagnostics: payload.diagnostics }],
            ['a null payload', null],
            ['a numeric payload', 42],
            ['a text payload', 'text'],
        ])('%s places nothing, creates no collection and still writes the log copy', (_name, hostile) => {
            const { context, channel, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three']);
            const spies = [
                vscode.commands.executeCommand,
                vscode.window.showTextDocument,
                vscode.workspace.openTextDocument,
            ] as Array<ReturnType<typeof vi.fn>>;
            spies.forEach(spy => spy.mockClear());

            expect(() => list(hostile)).not.toThrow();

            expect(createCollection).not.toHaveBeenCalled();
            expect(channel.appendLine).toHaveBeenCalled();
            spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

            disposeSubscriptions(context);
        });

        test('a payload uri spelled differently from the editor but parsing to the same uri still selects the document', () => {
            const { context, list } = activateAndFindHandlers();
            const document = open('file:///c%3A/ws/a.bbj', ['one', 'two', 'three']);

            list({ ...payload, uri: 'file:///c:/ws/a.bbj' });

            const [collection] = collections();
            expect(collection.set.mock.calls[0][0]).toBe(document.uri);

            disposeSubscriptions(context);
        });

        test('a placement that throws still writes the log copy, leaves a fixed debug trace and throws nothing', () => {
            const { context, channel, list } = activateAndFindHandlers();
            const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);
            (document as unknown as { lineAt: () => never }).lineAt = () => { throw new Error('SECRET_MARKER_PLACEMENT'); };

            expect(() => list(payload)).not.toThrow();

            expect(channel.appendLine).toHaveBeenCalledTimes(2);
            expect(channel.debug.mock.calls).toEqual([['denumber problems not placed']]);

            disposeSubscriptions(context);
        });

        test('an open document that is not a BBj document gets nothing', () => {
            const { context, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three'], 'plaintext');

            list(payload);

            expect(createCollection).not.toHaveBeenCalled();

            disposeSubscriptions(context);
        });

        test('a placed problem carries only range, message, severity and source', () => {
            const { context, list } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three']);

            list({
                uri: 'file:///ws/a.bbj',
                version: 1,
                diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'command:workbench.action.quit' }],
            });

            const [diagnostic] = collections()[0].set.mock.calls[0][1] as Array<object>;
            expect(Object.keys(diagnostic).sort()).toEqual(['message', 'range', 'severity', 'source']);

            disposeSubscriptions(context);
        });

        test.each([
            ['a file uri payload', { uri: 'file:///etc/passwd' }],
            ['no payload', undefined],
            ['a string payload', 'x'],
        ])('the reveal notification with %s opens the Problems view and nothing else while problems are placed', (_name, revealPayload) => {
            const { context, channel, list, reveal } = activateAndFindHandlers();
            open('file:///ws/a.bbj', ['one', 'two', 'three']);
            list(payload);
            const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
            const spies = [
                vscode.window.showTextDocument,
                vscode.workspace.openTextDocument,
            ] as Array<ReturnType<typeof vi.fn>>;
            executeCommand.mockClear();
            spies.forEach(spy => spy.mockClear());
            channel.appendLine.mockClear();

            reveal(revealPayload);

            expect(executeCommand.mock.calls).toEqual([['workbench.actions.view.problems', { preserveFocus: true }]]);
            expect(channel.show).not.toHaveBeenCalled();
            expect(channel.appendLine).not.toHaveBeenCalled();
            spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

            disposeSubscriptions(context);
        });

        describe('clearing', () => {
            const changeListener = vscode.workspace.onDidChangeTextDocument as ReturnType<typeof vi.fn>;
            const closeListener = vscode.workspace.onDidCloseTextDocument as ReturnType<typeof vi.fn>;

            function activateWithListeners() {
                changeListener.mockClear();
                closeListener.mockClear();
                const activated = activateAndFindHandlers();
                return {
                    ...activated,
                    change: changeListener.mock.calls[0][0] as (event: unknown) => void,
                    close: closeListener.mock.calls[0][0] as (document: unknown) => void,
                };
            }

            test('each document listener is registered once per activation and disposed with it', () => {
                const { context } = activateWithListeners();

                expect(changeListener).toHaveBeenCalledTimes(1);
                expect(closeListener).toHaveBeenCalledTimes(1);
                expect(context.subscriptions).toContain(changeListener.mock.results[0].value);
                expect(context.subscriptions).toContain(closeListener.mock.results[0].value);

                disposeSubscriptions(context);
            });

            test('a content change removes the problems of the changed document', () => {
                const { context, list, change } = activateWithListeners();
                const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);
                list(payload);
                const [collection] = collections();

                change({ document, contentChanges: [{ text: 'x' }] });

                expect(collection.delete.mock.calls).toEqual([[document.uri]]);

                disposeSubscriptions(context);
            });

            test('an event without a content change keeps the problems', () => {
                const { context, list, change } = activateWithListeners();
                const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);
                list(payload);
                const [collection] = collections();

                change({ document, contentChanges: [] });

                expect(collection.delete).not.toHaveBeenCalled();

                disposeSubscriptions(context);
            });

            test('closing the document removes its problems', () => {
                const { context, list, close } = activateWithListeners();
                const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);
                list(payload);
                const [collection] = collections();

                close(document);

                expect(collection.delete.mock.calls).toEqual([[document.uri]]);

                disposeSubscriptions(context);
            });

            test.each([
                ['a content change', (change: (e: unknown) => void, _close: (d: unknown) => void, document: unknown) =>
                    change({ document, contentChanges: [{ text: 'x' }] })],
                ['closing the document', (_change: (e: unknown) => void, close: (d: unknown) => void, document: unknown) =>
                    close(document)],
            ])('Show after %s reveals the BBj channel that still holds the list', (_name, clear) => {
                const { context, channel, list, reveal, change, close } = activateWithListeners();
                const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);
                list(payload);
                clear(change, close, document);
                const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
                executeCommand.mockClear();

                reveal();

                expect(channel.show.mock.calls).toEqual([[true]]);
                expect(executeCommand).not.toHaveBeenCalled();

                disposeSubscriptions(context);
            });

            test('Show still opens the Problems view while another document keeps its problems', () => {
                const { context, channel, list, reveal, change } = activateWithListeners();
                const first = open('file:///ws/a.bbj', ['one', 'two', 'three']);
                open('file:///ws/b.bbj', ['one', 'two', 'three']);
                list(payload);
                list({ ...payload, uri: 'file:///ws/b.bbj' });
                change({ document: first, contentChanges: [{ text: 'x' }] });
                const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
                executeCommand.mockClear();

                reveal();

                expect(executeCommand.mock.calls).toEqual([['workbench.actions.view.problems', { preserveFocus: true }]]);
                expect(channel.show).not.toHaveBeenCalled();

                disposeSubscriptions(context);
            });

            test('a change or a close before any list creates no collection and throws nothing', () => {
                const { context, change, close } = activateWithListeners();
                const document = open('file:///ws/a.bbj', ['one', 'two', 'three']);

                expect(() => change({ document, contentChanges: [{ text: 'x' }] })).not.toThrow();
                expect(() => close(document)).not.toThrow();

                expect(createCollection).not.toHaveBeenCalled();

                disposeSubscriptions(context);
            });
        });
    });
});
