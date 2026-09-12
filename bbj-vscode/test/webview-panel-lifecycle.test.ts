import { describe, expect, test, vi } from 'vitest';
import { registerPanelMessageHandler } from '../src/webview-panel-lifecycle.js';

/**
 * Unit coverage for the shared panel-lifecycle helper (#530): a message handler's subscription
 * lives exactly as long as its panel, never as long as the extension context.
 */

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
