import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Langium builds the `ResponseError` for a cancelled request from its own copy of
 * `vscode-jsonrpc`, while the server connection (`vscode-languageserver`) decides with
 * `instanceof ResponseError` whether a handler result is an error. When the two resolve to
 * different copies, the check fails and a cancelled request is answered with
 * `"result": {"code": -32800}` instead of `"error": {...}`. Strict clients (lsp4j, hence
 * IntelliJ) cannot parse that as e.g. a `workspace/symbol` result, drop the connection and
 * restart the server — once per keystroke in Search Everywhere.
 */

/** Node's lookup, by hand: `require.resolve` refuses packages whose `exports` hide `package.json`. */
function packageDir(name: string, from: string): string {
    for (let dir = from; ; dir = path.dirname(dir)) {
        const candidate = path.join(dir, 'node_modules', name);
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
            return fs.realpathSync(candidate);
        }
        if (dir === path.dirname(dir)) {
            throw new Error(`${name} is not resolvable from ${from}`);
        }
    }
}

describe('LSP protocol packages resolve to a single copy', () => {
    const langiumDir = packageDir('langium', process.cwd());
    const serverDir = packageDir('vscode-languageserver', langiumDir);

    test('langium and vscode-languageserver share one vscode-languageserver-protocol', () => {
        expect(packageDir('vscode-languageserver-protocol', serverDir))
            .toBe(packageDir('vscode-languageserver-protocol', langiumDir));
    });

    test('langium and vscode-languageserver share one vscode-jsonrpc (same ResponseError class)', () => {
        const fromLangium = packageDir('vscode-jsonrpc', packageDir('vscode-languageserver-protocol', langiumDir));
        const fromServer = packageDir('vscode-jsonrpc', packageDir('vscode-languageserver-protocol', serverDir));
        expect(fromServer).toBe(fromLangium);
    });
});
