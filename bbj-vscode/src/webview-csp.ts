/**
 * The single place every composer webview panel builds its Content-Security-Policy (issue #533):
 * `default-src 'none'`, an inline-style allowance scoped to the panel's own `cspSource`, and a
 * `script-src` that trusts only a freshly generated nonce — no inline script on the panel runs
 * without it. Type-only `vscode` import so the CSP can be built and unit tested with a plain
 * object in place of a real webview.
 */
import type * as vscode from 'vscode';
import { getNonce } from './webview-nonce.js';

/** The composer webview CSP and the nonce its inline `<script>` tag must also carry. */
export function buildComposerCsp(webview: Pick<vscode.Webview, 'cspSource'>): { nonce: string; csp: string } {
    const nonce = getNonce();
    const csp = [
        `default-src 'none'`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src 'nonce-${nonce}'`,
    ].join('; ');
    return { nonce, csp };
}
