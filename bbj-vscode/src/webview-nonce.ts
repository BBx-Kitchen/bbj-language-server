/**
 * Shared CSP nonce generator for every composer webview panel. Each webview's
 * `Content-Security-Policy` relies on `script-src 'nonce-${nonce}'` to allow only its own inline
 * `<script>` tag to run, so the nonce needs to be unguessable per panel instance. Generated with
 * Node's `crypto` module (available in the extension host) rather than `Math.random()`, which is
 * not cryptographically secure.
 */
import { randomBytes } from 'crypto';

/** A fresh, unguessable nonce for a webview's CSP `script-src`. */
export function getNonce(): string {
    return randomBytes(16).toString('base64');
}
