import { describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { registerPanelMessageHandler } from '../src/webview-panel-lifecycle.js';

/**
 * Unit coverage for the shared panel-lifecycle helper (#530): a message handler's subscription
 * lives exactly as long as its panel, never as long as the extension context.
 *
 * The second describe below discovers every webview panel module from the source tree (never a
 * hard-coded list) and proves an open-then-dispose cycle releases the handler for each one, so a
 * future seventh composer is covered automatically.
 */

const {
    createWebviewPanelMock, showInformationMessageMock, showWarningMessageMock, applyEditMock,
    registerCommandMock, registerCodeActionsProviderMock, executeCommandMock,
    FakePosition, FakeRange, FakeWorkspaceEdit, FakeCodeAction,
} = vi.hoisted(() => {
    class FakePosition {
        constructor(public line: number, public character: number) { }
    }
    class FakeRange {
        constructor(public startLine: number, public startCharacter: number, public endLine: number, public endCharacter: number) { }
    }
    class FakeWorkspaceEdit {
        insert = vi.fn();
        replace = vi.fn();
    }
    class FakeCodeAction {
        command: unknown;
        constructor(public title: string, public kind: unknown) { }
    }
    return {
        createWebviewPanelMock: vi.fn(),
        showInformationMessageMock: vi.fn(),
        showWarningMessageMock: vi.fn(),
        applyEditMock: vi.fn().mockResolvedValue(true),
        registerCommandMock: vi.fn(),
        registerCodeActionsProviderMock: vi.fn(),
        executeCommandMock: vi.fn(),
        FakePosition, FakeRange, FakeWorkspaceEdit, FakeCodeAction,
    };
});

let activeTextEditor: unknown = {
    document: {
        uri: { toString: () => 'file:///a.bbj' },
        lineAt: (_line: number) => ({ text: '' }),
        lineCount: 1,
    },
    selection: { active: { line: 0, character: 0 } },
};

let textDocuments: unknown[] = [];

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
        showInformationMessage: showInformationMessageMock,
        showWarningMessage: showWarningMessageMock,
    },
    workspace: {
        applyEdit: applyEditMock,
        get textDocuments() { return textDocuments; },
    },
    commands: {
        registerCommand: registerCommandMock,
        executeCommand: executeCommandMock,
    },
    languages: {
        registerCodeActionsProvider: registerCodeActionsProviderMock,
    },
    ViewColumn: { Beside: 2 },
    CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
    CodeAction: FakeCodeAction,
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
}));

interface FakePanel {
    webview: { onDidReceiveMessage: ReturnType<typeof vi.fn> };
    onDidDispose: ReturnType<typeof vi.fn>;
}

function createFakePanel(): {
    panel: FakePanel;
    messageSubscriptionDispose: ReturnType<typeof vi.fn>;
    disposeSubscriptionDispose: ReturnType<typeof vi.fn>;
    getMessageListener: () => ((msg: unknown) => unknown) | undefined;
    getDisposeListener: () => (() => void) | undefined;
} {
    let messageListener: ((msg: unknown) => unknown) | undefined;
    let disposeListener: (() => void) | undefined;
    const messageSubscriptionDispose = vi.fn();
    const disposeSubscriptionDispose = vi.fn();
    const panel: FakePanel = {
        webview: {
            onDidReceiveMessage: vi.fn((cb: (msg: unknown) => unknown) => {
                messageListener = cb;
                return { dispose: messageSubscriptionDispose };
            }),
        },
        onDidDispose: vi.fn((cb: () => void) => {
            disposeListener = cb;
            return { dispose: disposeSubscriptionDispose };
        }),
    };
    return {
        panel,
        messageSubscriptionDispose,
        disposeSubscriptionDispose,
        getMessageListener: () => messageListener,
        getDisposeListener: () => disposeListener,
    };
}

describe('registerPanelMessageHandler', () => {
    test('calls webview.onDidReceiveMessage exactly once with the handler as its only argument', () => {
        const { panel } = createFakePanel();
        const handler = vi.fn();

        registerPanelMessageHandler(panel as unknown as import('vscode').WebviewPanel, handler);

        expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
        expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledWith(handler);
    });

    test('returns the subscription onDidReceiveMessage produced', () => {
        const { panel, messageSubscriptionDispose } = createFakePanel();

        const returned = registerPanelMessageHandler(panel as unknown as import('vscode').WebviewPanel, vi.fn());

        expect(returned).toEqual({ dispose: messageSubscriptionDispose });
    });

    test('a message delivered to the captured listener reaches the handler', () => {
        const { panel, getMessageListener } = createFakePanel();
        const handler = vi.fn();

        registerPanelMessageHandler(panel as unknown as import('vscode').WebviewPanel, handler);
        getMessageListener()!({ type: 'ready' });

        expect(handler).toHaveBeenCalledWith({ type: 'ready' });
    });

    test('registers onDidDispose exactly once, and firing it disposes the message subscription exactly once', () => {
        const { panel, messageSubscriptionDispose, getDisposeListener } = createFakePanel();

        registerPanelMessageHandler(panel as unknown as import('vscode').WebviewPanel, vi.fn());

        expect(panel.onDidDispose).toHaveBeenCalledTimes(1);
        expect(messageSubscriptionDispose).not.toHaveBeenCalled();

        getDisposeListener()!();

        expect(messageSubscriptionDispose).toHaveBeenCalledTimes(1);
    });

    test('a handler that throws still throws when invoked, and the subscription is still disposed on panel dispose', () => {
        const { panel, messageSubscriptionDispose, getMessageListener, getDisposeListener } = createFakePanel();
        const handler = vi.fn(() => { throw new Error('boom'); });

        registerPanelMessageHandler(panel as unknown as import('vscode').WebviewPanel, handler);

        expect(() => getMessageListener()!({ type: 'x' })).toThrow('boom');

        getDisposeListener()!();
        expect(messageSubscriptionDispose).toHaveBeenCalledTimes(1);
    });
});

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

/** Strips both line comments and block comments — good enough for a source guard. */
function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
}

function readStripped(filePath: string): string {
    return stripComments(fs.readFileSync(filePath, 'utf-8'));
}

/** Every `.ts` file under `src/`, skipping `language/generated` (Langium-generated code). */
function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (path.relative(SRC_DIR, fullPath) === path.join('language', 'generated')) {
                continue;
            }
            results.push(...collectTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            results.push(fullPath);
        }
    }
    return results;
}

/** Matches a call creating a VS Code webview panel — how a panel module is discovered by text. */
const CREATE_WEBVIEW_PANEL_CALL = /\bcreateWebviewPanel\s*\(/;

function discoverPanelModules(): string[] {
    return collectTsFiles(SRC_DIR).filter((filePath) => CREATE_WEBVIEW_PANEL_CALL.test(readStripped(filePath)));
}

describe('every webview panel module releases its message handler with its panel (#530)', () => {
    const panelModules = discoverPanelModules();
    const relPathsAndFiles = panelModules.map(
        (p) => [path.relative(SRC_DIR, p).split(path.sep).join('/'), p] as const,
    );

    test('discovers at least six panel modules from the source tree, not a hard-coded list', () => {
        expect(panelModules.length).toBeGreaterThanOrEqual(6);
    });

    test.each(relPathsAndFiles)(
        '%s calls registerPanelMessageHandler, never onDidReceiveMessage itself, and never mentions context.subscriptions',
        (_relPath, fullPath) => {
            const stripped = readStripped(fullPath);
            expect(stripped).toMatch(/\bregisterPanelMessageHandler\s*\(/);
            expect(stripped).not.toMatch(/\.onDidReceiveMessage\s*\(/);
            expect(stripped).not.toMatch(/context\.subscriptions/);
        },
    );

    test.each(relPathsAndFiles)(
        '%s exports at least one open…Panel function, and an open-then-dispose cycle releases every one of them',
        async (_relPath, fullPath) => {
            const mod = await import(pathToFileURL(fullPath).href) as Record<string, unknown>;
            const openFns = Object.entries(mod).filter(
                ([name, value]) => /^open\w*Panel$/.test(name) && typeof value === 'function',
            );
            expect(openFns.length).toBeGreaterThanOrEqual(1);

            for (const [, fn] of openFns) {
                const fakeContext = { subscriptions: [] as unknown[] };
                let disposeListener: (() => void) | undefined;
                const messageSubscriptionDispose = vi.fn();
                const fakePanel = {
                    webview: {
                        html: '',
                        postMessage: vi.fn(),
                        onDidReceiveMessage: vi.fn((cb: (msg: unknown) => unknown) => {
                            void cb;
                            return { dispose: messageSubscriptionDispose };
                        }),
                    },
                    dispose: vi.fn(),
                    onDidDispose: vi.fn((cb: () => void) => {
                        disposeListener = cb;
                        return { dispose: vi.fn() };
                    }),
                };
                createWebviewPanelMock.mockReturnValueOnce(fakePanel);

                (fn as (...args: unknown[]) => void)(fakeContext, {}, vi.fn());

                expect(createWebviewPanelMock).toHaveBeenCalled();
                expect(fakeContext.subscriptions.length).toBe(0);
                expect(fakePanel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
                expect(fakePanel.onDidDispose).toHaveBeenCalledTimes(1);
                expect(messageSubscriptionDispose).not.toHaveBeenCalled();

                disposeListener!();

                expect(messageSubscriptionDispose).toHaveBeenCalledTimes(1);
                expect(fakeContext.subscriptions.length).toBe(0);
            }
        },
    );
});
