/**
 * Shared subscription helper for every composer webview panel (#530): the message handler lives
 * exactly as long as its panel, and nothing is parked on the extension context, so repeated open
 * and close of a composer panel never accumulates dead listeners.
 *
 * Type-only `vscode` import: this module has no runtime dependency on the `vscode` API and can be
 * unit tested with a plain object fake panel.
 */
import type * as vscode from 'vscode';

/**
 * Subscribes `handler` to `panel`'s messages and ties that subscription's lifetime to the panel's
 * own disposal — never to the extension context. Returns the message subscription so a caller
 * that wants to dispose it early still can, though the normal path is `panel.dispose()`.
 */
export function registerPanelMessageHandler<T>(
    panel: vscode.WebviewPanel,
    handler: (message: T) => unknown,
): vscode.Disposable {
    const subscription = panel.webview.onDidReceiveMessage(handler);
    panel.onDidDispose(() => subscription.dispose());
    return subscription;
}
