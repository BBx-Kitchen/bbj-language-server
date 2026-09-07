/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    createRestartGate,
    CONFIG_RELOAD_RESTART_DELAY_MS,
    type RestartTarget,
} from '../src/restart-gate.js';

/**
 * Coverage for the VS Code host's restart choke point (#486): a single coalescing gate
 * (`restart-gate.ts`) ported from IntelliJ's `RestartGate`, and the `bbj/configReloadRequired`
 * handler that is its first caller in `extension.ts`. No real client, no real timers, no real
 * status bar — every effect is a plain fake target or an injected fake timer, or the
 * whole-`vscode`-mock convention `test/config-file-association.test.ts` established.
 */

function createFakeTarget(overrides: Partial<RestartTarget> = {}): RestartTarget & {
    needsStop: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
} {
    return {
        needsStop: vi.fn(() => true),
        stop: vi.fn(() => Promise.resolve()),
        start: vi.fn(() => Promise.resolve()),
        ...overrides,
    };
}

describe('createRestartGate: cancel-then-schedule coalescing', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('CONFIG_RELOAD_RESTART_DELAY_MS is 500ms', () => {
        expect(CONFIG_RELOAD_RESTART_DELAY_MS).toBe(500);
    });

    test('two request(500) calls inside one window produce exactly one stop/start pair', async () => {
        const target = createFakeTarget();
        const gate = createRestartGate(target, vi.fn());

        gate.request(500);
        await vi.advanceTimersByTimeAsync(200);
        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);

        expect(target.stop).toHaveBeenCalledTimes(1);
        expect(target.start).toHaveBeenCalledTimes(1);
    });

    test('a request arriving after the previous window already fired opens a new window and produces a second pair', async () => {
        const target = createFakeTarget();
        const gate = createRestartGate(target, vi.fn());

        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);
        expect(target.stop).toHaveBeenCalledTimes(1);
        expect(target.start).toHaveBeenCalledTimes(1);

        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);
        expect(target.stop).toHaveBeenCalledTimes(2);
        expect(target.start).toHaveBeenCalledTimes(2);
    });

    test('a request on a target whose needsStop() is false calls start() without calling stop()', async () => {
        const target = createFakeTarget({ needsStop: vi.fn(() => false) });
        const gate = createRestartGate(target, vi.fn());

        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);

        expect(target.stop).not.toHaveBeenCalled();
        expect(target.start).toHaveBeenCalledTimes(1);
    });

    test('cancel() before the window elapses produces no stop and no start', async () => {
        const target = createFakeTarget();
        const gate = createRestartGate(target, vi.fn());

        gate.request(500);
        await vi.advanceTimersByTimeAsync(300);
        gate.cancel();
        await vi.advanceTimersByTimeAsync(1000);

        expect(target.stop).not.toHaveBeenCalled();
        expect(target.start).not.toHaveBeenCalled();
    });

    test('a rejected stop() is caught: reports the failed phase exactly once, throws nothing out of the timer callback', async () => {
        const error = new Error('stop failed');
        const target = createFakeTarget({ stop: vi.fn(() => Promise.reject(error)) });
        const onPhase = vi.fn();
        const gate = createRestartGate(target, onPhase);

        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);

        expect(onPhase.mock.calls.filter(c => c[0] === 'failed')).toHaveLength(1);
        expect(onPhase).toHaveBeenCalledWith('failed', error);
        expect(target.start).not.toHaveBeenCalled();
    });

    test('a rejected start() is caught: reports the failed phase exactly once, throws nothing out of the timer callback', async () => {
        const error = new Error('start failed');
        const target = createFakeTarget({ start: vi.fn(() => Promise.reject(error)) });
        const onPhase = vi.fn();
        const gate = createRestartGate(target, onPhase);

        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);

        expect(onPhase.mock.calls.filter(c => c[0] === 'failed')).toHaveLength(1);
        expect(onPhase).toHaveBeenCalledWith('failed', error);
    });

    test('the restarting phase is reported before stop/start, and restarted after start resolves', async () => {
        const target = createFakeTarget();
        const phases: string[] = [];
        const gate = createRestartGate(target, (phase) => phases.push(phase));

        gate.request(500);
        await vi.advanceTimersByTimeAsync(500);

        expect(phases).toEqual(['restarting', 'restarted']);
    });
});

// ---------------------------------------------------------------------------------------
// Handler wiring: bbj/configReloadRequired -> restartGate.request -> the existing client.
// Uses the whole-vscode-mock convention from test/config-file-association.test.ts.
// ---------------------------------------------------------------------------------------

const clientStartMock = vi.fn(() => Promise.resolve());
const clientStopMock = vi.fn(() => Promise.resolve());
const clientNeedsStopMock = vi.fn(() => true);
const clientOnNotificationMock = vi.fn();
const clientAppendLineMock = vi.fn();

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
            createOutputChannel: vi.fn(() => ({ appendLine: vi.fn() })),
            tabGroups: { all: [], onDidChangeTabs: vi.fn(() => disposable()) },
            onDidChangeActiveTextEditor: vi.fn(() => disposable()),
            activeTextEditor: undefined,
        },
        commands: {
            registerCommand: vi.fn(),
            executeCommand: vi.fn(),
        },
        languages: {
            registerDocumentFormattingEditProvider: vi.fn(),
            registerCodeActionsProvider: vi.fn(),
            registerCodeLensProvider: vi.fn(),
            onDidChangeDiagnostics: vi.fn(() => disposable()),
            getDiagnostics: vi.fn(() => []),
            setTextDocumentLanguage: vi.fn(),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => disposable()),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
            })),
            textDocuments: [] as unknown[],
            onDidOpenTextDocument: vi.fn(() => disposable()),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
            onDidChangeConfiguration: vi.fn(() => disposable()),
            workspaceFolders: undefined,
        },
        StatusBarAlignment: { Left: 1, Right: 2 },
        DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
        ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
        QuickPickItemKind: { Separator: -1 },
        CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
        Uri: class { },
    };
});

vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        outputChannel = { appendLine: clientAppendLineMock };
        start = clientStartMock;
        stop = clientStopMock;
        needsStop = clientNeedsStopMock;
        onNotification = clientOnNotificationMock;
        constructor() { }
    }
    return { LanguageClient, TransportKind: { ipc: 1 } };
});

vi.mock('../src/language/lib/fs-provider.js', () => ({
    BBjLibraryFileSystemProvider: { register: vi.fn() },
}));
vi.mock('../src/msgbox-composer-ui.js', () => ({ registerMsgboxComposer: vi.fn() }));
vi.mock('../src/addwindow-composer-ui.js', () => ({ registerAddWindowComposer: vi.fn() }));
vi.mock('../src/addchildwindow-composer-ui.js', () => ({ registerAddChildWindowComposer: vi.fn() }));
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
        denumber: vi.fn(),
        decompileReplace: vi.fn(),
        decompileReadonly: vi.fn(),
        setOutputChannel: vi.fn(),
    },
}));

import * as vscode from 'vscode';
import { activate, deactivate } from '../src/extension.js';
import { CONFIG_RELOAD_METHOD, type ConfigReloadNotification } from '../src/language/config-reload-notification.js';
import { resetConfigPathCacheForTests, setResolvedConfigPath } from '../src/config-path-cache.js';

/** The status-bar item `activate()` created with `createStatusBarItem(Left, priority)`. */
function capturedStatusBarItem(priority: number): {
    text: string;
    tooltip: string;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
} {
    const mock = vscode.window.createStatusBarItem as ReturnType<typeof vi.fn>;
    const idx = mock.mock.calls.findIndex((c: unknown[]) => c[1] === priority);
    if (idx === -1) {
        throw new Error(`No createStatusBarItem call with priority ${priority}`);
    }
    return mock.mock.results[idx].value;
}

function activateForTest(): void {
    const context = {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];
    activate(context);
}

/** Find the handler `activate()` registered for `method` via `client.onNotification`. */
function capturedHandler(method: string): (params: ConfigReloadNotification) => void {
    const call = clientOnNotificationMock.mock.calls.find(c => c[0] === method);
    if (!call) {
        throw new Error(`No client.onNotification handler registered for ${method}`);
    }
    return call[1] as (params: ConfigReloadNotification) => void;
}

describe('bbj/configReloadRequired: the handler dispatches to the gate, never directly', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        clientStartMock.mockClear();
        clientStopMock.mockClear();
        clientNeedsStopMock.mockClear();
        clientNeedsStopMock.mockImplementation(() => true);
        clientOnNotificationMock.mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('receiving bbj/configReloadRequired results in exactly one request on the gate, and no direct stop/start call from the handler itself', async () => {
        activateForTest();
        // startLanguageClient() itself performs the one initial client.start() as part of
        // activation, before any reload is requested — the baseline this test's deltas are
        // measured against.
        const initialStartCalls = clientStartMock.mock.calls.length;
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });

        // The handler itself must not call stop/start synchronously — only the gate's
        // delayed timer callback may do that.
        expect(clientStopMock).not.toHaveBeenCalled();
        expect(clientStartMock).toHaveBeenCalledTimes(initialStartCalls);

        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        expect(clientStopMock).toHaveBeenCalledTimes(1);
        expect(clientStartMock).toHaveBeenCalledTimes(initialStartCalls + 1);
    });

    test('two reload notifications inside one coalescing window produce exactly one restart', async () => {
        activateForTest();
        const initialStartCalls = clientStartMock.mock.calls.length;
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(200);
        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        expect(clientStopMock).toHaveBeenCalledTimes(1);
        expect(clientStartMock).toHaveBeenCalledTimes(initialStartCalls + 1);
    });
});

// ---------------------------------------------------------------------------------------
// The non-blocking status signal (D-13/D-14) and the failure path (D-15).
// ---------------------------------------------------------------------------------------

describe('config-reload status bar: the non-blocking signal and failure path', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetConfigPathCacheForTests();
        clientStartMock.mockClear();
        clientStartMock.mockImplementation(() => Promise.resolve());
        clientStopMock.mockClear();
        clientStopMock.mockImplementation(() => Promise.resolve());
        clientNeedsStopMock.mockClear();
        clientNeedsStopMock.mockImplementation(() => true);
        clientOnNotificationMock.mockClear();
        clientAppendLineMock.mockClear();
        (vscode.window.createStatusBarItem as ReturnType<typeof vi.fn>).mockClear();
        (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mockClear();
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockClear();
        (vscode.window.showWarningMessage as ReturnType<typeof vi.fn>).mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('the restarting phase leaves the captured status item shown with a spinning-sync text and a tooltip containing the active config path', async () => {
        let resolveStop: (() => void) | undefined;
        clientStopMock.mockImplementation(() => new Promise<void>(resolve => { resolveStop = resolve; }));
        setResolvedConfigPath({ path: '/srv/config.bbx', source: 'default', exists: true, problem: null });

        activateForTest();
        const item = capturedStatusBarItem(98);
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        // stop() is now pending, so the gate is holding at the 'restarting' phase.
        expect(item.show).toHaveBeenCalled();
        expect(item.text).toMatch(/sync~spin/);
        expect(item.tooltip).toContain('/srv/config.bbx');

        resolveStop?.();
        await vi.advanceTimersByTimeAsync(0);
    });

    test('the restarted phase followed by 5000ms of fake time leaves the item hidden exactly once', async () => {
        activateForTest();
        const item = capturedStatusBarItem(98);
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        expect(item.text).toMatch(/check/);
        expect(item.hide).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(5000);

        expect(item.hide).toHaveBeenCalledTimes(1);
    });

    test('the failed phase hides the item and calls showErrorMessage exactly once; no showInformationMessage or showWarningMessage call is made on any phase', async () => {
        const error = new Error('spawn ENOENT');
        clientStartMock.mockImplementationOnce(() => Promise.resolve()); // the initial startLanguageClient() start
        clientStartMock.mockImplementation(() => Promise.reject(error));

        activateForTest();
        const item = capturedStatusBarItem(98);
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        expect(item.hide).toHaveBeenCalledTimes(1);
        expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    test('a second reload arriving before the auto-hide fires leaves the item shown', async () => {
        activateForTest();
        const item = capturedStatusBarItem(98);
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);
        expect(item.hide).not.toHaveBeenCalled();

        // Well inside the 5000ms auto-hide window, a second reload arrives.
        await vi.advanceTimersByTimeAsync(2000);
        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        // The confirmation's original 5000ms auto-hide timer must have been cancelled —
        // advancing past when it would have fired must not hide the item.
        await vi.advanceTimersByTimeAsync(3000);
        expect(item.hide).not.toHaveBeenCalled();
    });

    test('the reload handler appends exactly one output-channel line containing both the path and the payload reason', () => {
        activateForTest();
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);
        clientAppendLineMock.mockClear();

        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });

        expect(clientAppendLineMock).toHaveBeenCalledTimes(1);
        const line = clientAppendLineMock.mock.calls[0][0] as string;
        expect(line).toContain('/srv/config.bbx');
        expect(line).toContain('prefix-changed');
    });

    test('deactivate() cancels the gate before calling client.stop()', async () => {
        let resolveStop: (() => void) | undefined;
        clientStopMock.mockImplementation(() => new Promise<void>(resolve => { resolveStop = resolve; }));
        activateForTest();
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        // Schedule a restart, then deactivate before its window elapses — the pending
        // restart must never fire against a client that is about to be disposed.
        handler({ path: '/srv/config.bbx', reason: 'prefix-changed' });
        deactivate();

        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS + 1000);

        // Only deactivate()'s own client.stop() ran — the gate's scheduled restart was
        // cancelled, so it never called stop()/start() a second time.
        expect(clientStopMock).toHaveBeenCalledTimes(1);
        resolveStop?.();
    });
});

// ---------------------------------------------------------------------------------------
// Source guard: the choke point is the only restart path (#486). Porting
// BbjConfigPathServiceSourceGuardTest's whole-file text-assertion idiom to vitest — the
// choke point becomes the contract every future VS Code restart trigger is written against,
// and a text count is the only fence that fails when a new trigger bypasses it. Deliberately
// introducing a second stop/start pair in extension.ts, or a direct client.stop()/start()
// call from anywhere other than startLanguageClient()/deactivate(), would fail this block.
// ---------------------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';

describe('source guard: the choke point is the only restart path', () => {
    /** Strip `/* *\/` block comments (may span lines), then `//` line comments. */
    function stripComments(text: string): string {
        const noBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
        return noBlockComments
            .split('\n')
            .map(line => {
                const idx = line.indexOf('//');
                return idx >= 0 ? line.slice(0, idx) : line;
            })
            .join('\n');
    }

    /** Import declarations are usage-neutral — this fence pins call sites, not imports. */
    function stripImportLines(text: string): string {
        return text
            .split('\n')
            .filter(line => !/^\s*import\b/.test(line))
            .join('\n');
    }

    function readGuardedSource(fileName: string): string {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'src', fileName), 'utf-8');
        return stripImportLines(stripComments(raw));
    }

    function countOccurrences(text: string, substring: string): number {
        return text.split(substring).length - 1;
    }

    /** Extract the balanced `(...)` call whose opening paren is at `parenStart`. */
    function extractBalancedCall(text: string, parenStart: number): string {
        let depth = 0;
        let i = parenStart;
        for (; i < text.length; i++) {
            if (text[i] === '(') depth++;
            else if (text[i] === ')') {
                depth--;
                if (depth === 0) {
                    i++;
                    break;
                }
            }
        }
        return text.slice(parenStart, i);
    }

    test('extension.ts contains exactly one client.start() and exactly one client.stop( occurrence', () => {
        const source = readGuardedSource('extension.ts');
        expect(countOccurrences(source, 'client.start()')).toBe(1);
        expect(countOccurrences(source, 'client.stop(')).toBe(1);
    });

    test("extension.ts's client.stop( appears after its gate-cancel call, inside deactivate()", () => {
        const source = readGuardedSource('extension.ts');
        const fnStart = source.indexOf('export function deactivate(');
        expect(fnStart).toBeGreaterThan(-1);
        const fnEnd = source.indexOf('\n}', fnStart);
        expect(fnEnd).toBeGreaterThan(fnStart);
        const body = source.slice(fnStart, fnEnd);

        const cancelIdx = body.indexOf('restartGate?.cancel(');
        const stopIdx = body.indexOf('client.stop(');
        expect(cancelIdx).toBeGreaterThan(-1);
        expect(stopIdx).toBeGreaterThan(-1);
        expect(cancelIdx).toBeLessThan(stopIdx);
    });

    test('extension.ts contains exactly one createRestartGate( call, so a second, uncoalesced gate cannot appear', () => {
        const source = readGuardedSource('extension.ts');
        expect(countOccurrences(source, 'createRestartGate(')).toBe(1);
    });

    test("the reload handler's body reaches the restart only through the gate's request( call", () => {
        const source = readGuardedSource('extension.ts');
        const marker = 'client.onNotification(CONFIG_RELOAD_METHOD';
        expect(countOccurrences(source, marker)).toBe(1);

        const markerIdx = source.indexOf(marker);
        const parenStart = markerIdx + 'client.onNotification'.length;
        const handlerBody = extractBalancedCall(source, parenStart);
        expect(handlerBody).toMatch(/restartGate\??\.request\(/);
        // The handler must never stop/start the client directly — only the gate may.
        expect(handlerBody).not.toMatch(/client\.stop\(|client\.start\(/);
    });

    test('restart-gate.ts contains exactly one .stop( and exactly one .start( call on the target', () => {
        const source = readGuardedSource('restart-gate.ts');
        expect(countOccurrences(source, 'target.stop(')).toBe(1);
        expect(countOccurrences(source, 'target.start(')).toBe(1);
    });

    test('restart-gate.ts has zero \'vscode\' imports, keeping the choke point unit-testable', () => {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'src', 'restart-gate.ts'), 'utf-8');
        expect(raw).not.toMatch(/from ['"]vscode['"]/);
    });
});
