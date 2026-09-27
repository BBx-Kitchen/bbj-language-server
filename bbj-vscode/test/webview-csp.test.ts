import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Coverage for the shared composer webview CSP helper (#533): one function builds the
 * byte-identical three-directive Content-Security-Policy every composer panel used to build
 * inline, plus the nonce its inline `<script>` tag must reuse.
 */

const { createWebviewPanelMock } = vi.hoisted(() => ({
    createWebviewPanelMock: vi.fn(),
}));

let activeTextEditor: {
    document: { uri: { toString(): string } };
    selection: { active: { line: number; character: number } };
} | undefined;

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
        showInformationMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
    },
    workspace: {
        textDocuments: [],
        applyEdit: vi.fn().mockResolvedValue(true),
    },
    ViewColumn: { Beside: 2 },
}));

import { buildComposerCsp } from '../src/webview-csp.js';
import { openMsgboxComposerPanel } from '../src/msgbox-composer-webview.js';

const NONCE_SHAPE = /^[A-Za-z0-9+/=]{24}$/;

describe('buildComposerCsp', () => {
    test('returns a 24-character base64 nonce and the three-directive CSP built from it', () => {
        const { nonce, csp } = buildComposerCsp({ cspSource: 'vscode-webview://abc' });

        expect(nonce).toMatch(NONCE_SHAPE);
        expect(csp).toBe(
            "default-src 'none'; style-src vscode-webview://abc 'unsafe-inline'; script-src 'nonce-" + nonce + "'",
        );
    });

    test('two calls return different nonces', () => {
        const first = buildComposerCsp({ cspSource: 'vscode-webview://abc' });
        const second = buildComposerCsp({ cspSource: 'vscode-webview://abc' });

        expect(first.nonce).not.toBe(second.nonce);
    });

    test('an empty cspSource is not special-cased', () => {
        const { nonce, csp } = buildComposerCsp({ cspSource: '' });

        expect(csp).toBe(
            "default-src 'none'; style-src  'unsafe-inline'; script-src 'nonce-" + nonce + "'",
        );
    });
});

interface FakePanel {
    webview: { html: string; cspSource: string; postMessage: ReturnType<typeof vi.fn>; onDidReceiveMessage: ReturnType<typeof vi.fn> };
    dispose: ReturnType<typeof vi.fn>;
    onDidDispose: ReturnType<typeof vi.fn>;
}

function createFakePanel(): FakePanel {
    return {
        webview: {
            html: '',
            cspSource: 'vscode-webview://test-source',
            postMessage: vi.fn(),
            onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
        },
        dispose: vi.fn(),
        onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    };
}

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openMsgboxComposerPanel>[0];

beforeEach(() => {
    vi.clearAllMocks();
    activeTextEditor = {
        document: { uri: { toString: () => 'file:///a.bbj' } },
        selection: { active: { line: 0, character: 0 } },
    };
});

describe('MSGBOX panel CSP end to end', () => {
    test('the panel HTML carries the exact three-directive CSP with a matching script nonce', () => {
        const panel = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext);

        const html = panel.webview.html;
        const metaMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
        const scriptMatch = html.match(/<script nonce="([^"]+)">/);

        expect(metaMatch).not.toBeNull();
        expect(scriptMatch).not.toBeNull();

        const csp = metaMatch![1];
        const scriptNonce = scriptMatch![1];

        expect(csp).toBe(
            "default-src 'none'; style-src vscode-webview://test-source 'unsafe-inline'; script-src 'nonce-" + scriptNonce + "'",
        );
        expect(scriptNonce).toMatch(NONCE_SHAPE);
    });
});
