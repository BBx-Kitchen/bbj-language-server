import { ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createMessageConnection, IPCMessageReader, IPCMessageWriter, MessageConnection } from 'vscode-jsonrpc/node';
import {
    SETOPTS_COMPOSE_TRISTATE_METHOD, SETOPTS_DECODE_IN_CODE_METHOD, SetOptsComposeTriStateParams,
    SetOptsComposeTriStateResult, SetOptsInCodeDecodeParams, SetOptsInCodeDecodeResult,
} from '../../src/language/setopts-in-code-request.js';

/**
 * Spawns the VS Code extension bundle actually installed in `~/.ext-test/extensions` — not the
 * source tree — as a real `--node-ipc` LSP server process, and proves it serves the SETOPTS-in-
 * code hover and composer requests correctly (#475). Every other Phase 88 gate runs against
 * `src/`; this is the one gate that runs against the artifact a user actually loads, closing the
 * packaging/staleness gap that produced both open UAT gaps' VS Code halves.
 *
 * The install is resolved from `extensions.json`'s own record of which directory VS Code is
 * actually using — never a directory glob, never a hardcoded version — because more than one
 * version directory can exist on disk and only the one `extensions.json` names is loaded.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(TEST_DIR, '../../../examples/issue475-setopts-in-code.bbj');

interface ExtensionsJsonEntry {
    identifier?: { id?: string };
    relativeLocation?: string;
    location?: { fsPath?: string };
}

interface ResolvedInstall {
    dir: string;
    serverPath: string;
    packageJsonPath: string;
    extensionCjsPath: string;
}

/** Resolve the install VS Code actually loads from `extensions.json` — never a glob, never a
 * hardcoded version. Returns `undefined` when the ext-test rig isn't present at all. */
function resolveInstall(): ResolvedInstall | undefined {
    const extensionsDir = path.join(os.homedir(), '.ext-test', 'extensions');
    const extensionsJsonPath = path.join(extensionsDir, 'extensions.json');
    if (!fs.existsSync(extensionsJsonPath)) {
        return undefined;
    }
    let entries: ExtensionsJsonEntry[];
    try {
        entries = JSON.parse(fs.readFileSync(extensionsJsonPath, 'utf-8'));
    } catch {
        return undefined;
    }
    const entry = Array.isArray(entries)
        ? entries.find(e => e?.identifier?.id === 'basis-intl.bbj-lang')
        : undefined;
    if (!entry) {
        return undefined;
    }
    const dir = entry.location?.fsPath
        ?? (entry.relativeLocation ? path.join(extensionsDir, entry.relativeLocation) : undefined);
    if (!dir) {
        return undefined;
    }
    return {
        dir,
        serverPath: path.join(dir, 'out', 'language', 'main.cjs'),
        packageJsonPath: path.join(dir, 'package.json'),
        extensionCjsPath: path.join(dir, 'out', 'extension.cjs'),
    };
}

const install = resolveInstall();
const installPresent = !!install && fs.existsSync(install.serverPath);

/**
 * Find `{ line, character }` for the midpoint of `token`, on the physical line whose trimmed
 * text exactly equals `exactLine` — never a hardcoded line/character number. `lastIndexOf` (not
 * `indexOf`) locates `token`, so a target token that also appears earlier on the same line (e.g.
 * `A$` inside `a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$`, where the trailing `SETOPTS A$`
 * is the intended target) resolves to its LAST occurrence on that line, not its first.
 */
function findPosition(fullText: string, exactLine: string, token: string): { line: number; character: number } {
    const lines = fullText.split('\n');
    const lineIdx = lines.findIndex(l => l.trim() === exactLine);
    expect(lineIdx, `expected to find a line matching exactly "${exactLine}"`).toBeGreaterThanOrEqual(0);
    const line = lines[lineIdx];
    const tokenIdx = line.lastIndexOf(token);
    expect(tokenIdx, `expected to find token "${token}" within line "${line}"`).toBeGreaterThanOrEqual(0);
    return { line: lineIdx, character: tokenIdx + Math.floor(token.length / 2) };
}

describe.skipIf(!installPresent)('installed extension e2e: SETOPTS-in-code (#475)', () => {
    let child: ChildProcess;
    let connection: MessageConnection;
    let fixtureText: string;
    let fixtureUri: string;
    const stderr: string[] = [];

    beforeAll(async () => {
        fixtureText = fs.readFileSync(FIXTURE_PATH, 'utf-8');
        fixtureUri = pathToFileURL(FIXTURE_PATH).toString();

        // Same invocation the extension itself uses (see test/language-server-lifecycle.test.ts).
        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        // rootUri/workspaceFolders stay null deliberately: no workspace scan occurs, the probe
        // stays scoped to exactly the one fixture file, and java-interop on :5008 stays off the
        // critical path.
        await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: null,
            workspaceFolders: null,
            capabilities: {},
        });
        await connection.sendNotification('initialized', {});

        // Tasks 1 and 2 measure the hover/decode path without BBjCPL variance; Task 3
        // deliberately spawns its own server and does NOT send this.
        await connection.sendNotification('workspace/didChangeConfiguration', {
            settings: { bbj: { compiler: { trigger: 'off' } } },
        });

        await connection.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri: fixtureUri,
                languageId: 'bbj',
                version: 1,
                text: fixtureText,
            },
        });

        // `didOpen` is a notification: the server schedules the document build asynchronously
        // and returns no acknowledgement, so a hover request that arrives before that build
        // completes gets `undefined` (bbj-hover.ts bails out when `document.parseResult` isn't
        // populated yet) rather than waiting for it. Poll a known-good position until the
        // document is provably built, so every real assertion below runs against a warm
        // document instead of racing the server's first build.
        const warmupPos = findPosition(fixtureText, 'SETOPTS B$', 'B$');
        const deadline = Date.now() + 30_000;
        let warm: { contents?: { value?: string } } | null = null;
        while (Date.now() < deadline) {
            warm = await connection.sendRequest('textDocument/hover', {
                textDocument: { uri: fixtureUri },
                position: { line: warmupPos.line, character: warmupPos.character },
            }) as { contents?: { value?: string } } | null;
            if (warm?.contents?.value) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        expect(warm?.contents?.value, 'document never finished building within the warm-up budget').toBeDefined();
    }, 120_000);

    afterAll(() => {
        connection?.dispose();
        if (child && child.exitCode === null && child.pid !== undefined) {
            try {
                child.kill('SIGKILL');
            } catch {
                // already gone
            }
        }
    });

    async function hoverMarkdown(position: { line: number; character: number }): Promise<string | undefined> {
        const result = await connection.sendRequest('textDocument/hover', {
            textDocument: { uri: fixtureUri },
            position,
        }) as { contents?: { value?: string } } | null;
        return result?.contents?.value;
    }

    describe('SETOPTS-in-code hover decode on the freshly installed bundle', () => {
        test('a. absolute literal hover decodes the byte vector', async () => {
            const pos = findPosition(
                fixtureText,
                'SETOPTS $00C20240000000000000000000000000$',
                '$00C20240000000000000000000000000$',
            );
            const value = await hoverMarkdown(pos);
            expect(value, `expected a hover result, got: ${JSON.stringify(value)}. stderr: ${stderr.join('') || '(empty)'}`).toBeDefined();
            expect(value).toMatch(/Byte \d+: /);
            expect(value).not.toContain('(default settings)');
        }, 60_000);

        test('b. IOR mask-call hover names the options it sets', async () => {
            const pos = findPosition(
                fixtureText,
                'a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$',
                'IOR',
            );
            const value = await hoverMarkdown(pos);
            expect(value, `expected a hover result, got: ${JSON.stringify(value)}`).toBeDefined();
            expect(value).toContain('Sets these options:');
        }, 60_000);

        test('c. AND mask-call hover names the options it CLEARS, never as a set/raw mask', async () => {
            const pos = findPosition(
                fixtureText,
                'LET A$(2,1)=AND(A$(2,1),$7F$)',
                'AND',
            );
            const value = await hoverMarkdown(pos);
            expect(value, `expected a hover result, got: ${JSON.stringify(value)}`).toBeDefined();
            expect(value).toContain('Clears these options:');
            expect(value).not.toContain('Sets these options:');
        }, 60_000);

        test('d. SETOPTS A$ closing the byte-range IOR reproduction names the unsafe byte-range reason', async () => {
            const pos = findPosition(
                fixtureText,
                'a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$',
                'A$',
            );
            const value = await hoverMarkdown(pos);
            expect(value, `expected a hover result, got: ${JSON.stringify(value)}`).toBeDefined();
            expect(value).toContain('cannot be determined statically');
            expect(value).toContain('byte range');
        }, 60_000);

        test('e. SETOPTS B$ closing the canonical safe chain still decodes Sets/Clears over the wire', async () => {
            const pos = findPosition(fixtureText, 'SETOPTS B$', 'B$');
            const value = await hoverMarkdown(pos);
            expect(value, `expected a hover result, got: ${JSON.stringify(value)}`).toBeDefined();
            expect(value).toContain('Sets:');
            expect(value).toContain('Clears:');
        }, 60_000);
    });

    /**
     * Tri-state composer client entry points and server requests (#475, DISC-06). Two
     * independent halves, because G-88-2 had two independent failure modes: the client-manifest
     * checks invert the exact evidence that proved the installed bundle had zero occurrences of
     * the composer's command id; the server-request checks prove decodeInCode/composeTriState
     * answer correctly over the same live connection the hover tests above already hold, with
     * the fixture already open.
     */
    describe('tri-state composer client registration and server requests', () => {
        test('client manifest: contributes.commands registers bbj.composeSetoptsInCode', () => {
            const pkg = JSON.parse(fs.readFileSync(install!.packageJsonPath, 'utf-8'));
            const commands: Array<{ command?: string }> = pkg.contributes?.commands ?? [];
            expect(commands.some(c => c.command === 'bbj.composeSetoptsInCode')).toBe(true);
        });

        test('client manifest: the editor/context menu registers bbj.composeSetoptsInCode', () => {
            const pkg = JSON.parse(fs.readFileSync(install!.packageJsonPath, 'utf-8'));
            const menuEntries: Array<{ command?: string }> = pkg.contributes?.menus?.['editor/context'] ?? [];
            expect(menuEntries.some(m => m.command === 'bbj.composeSetoptsInCode')).toBe(true);
        });

        test('client manifest: activationEvents includes onCommand:bbj.composeSetoptsInCode', () => {
            const pkg = JSON.parse(fs.readFileSync(install!.packageJsonPath, 'utf-8'));
            const events: string[] = pkg.activationEvents ?? [];
            expect(events).toContain('onCommand:bbj.composeSetoptsInCode');
        });

        test('client bundle: the compiled out/extension.cjs carries the command id literal', () => {
            // Only string literals are safe to assert against a bundled/minified client — class
            // and function identifiers (e.g. SetOptsInCodeActionProvider, setoptsInCodeCandidateLine)
            // can be mangled by esbuild, so their absence in the bundle would be meaningless.
            // 'bbj.composeSetoptsInCode' is the literal command id passed to
            // vscode.commands.registerCommand, so it survives bundling/minification verbatim.
            const bundle = fs.readFileSync(install!.extensionCjsPath, 'utf-8');
            expect(bundle).toContain('bbj.composeSetoptsInCode');
        });

        test('decodeInCode opens the edit gate on the canonical safe chain (mode: chain, editable: true)', async () => {
            const pos = findPosition(fixtureText, 'SETOPTS B$', 'B$');
            const result = await connection.sendRequest(SETOPTS_DECODE_IN_CODE_METHOD, {
                uri: fixtureUri, line: pos.line, character: pos.character,
            } satisfies SetOptsInCodeDecodeParams) as SetOptsInCodeDecodeResult;
            expect(result.found).toBe(true);
            expect(result.editable).toBe(true);
            expect(result.mode).toBe('chain');
            expect(result.chain).toBeDefined();
            expect(result.chain!.variableName).toBe('b$');
            expect(result.chain!.startLine).toBeLessThan(result.chain!.endLine);
            expect(result.initial).toBeDefined();
            expect(result.initial!.entries.length).toBeGreaterThan(0);
        }, 60_000);

        test('decodeInCode keeps the edit gate shut on the reported byte-range chain, with a named reason', async () => {
            const pos = findPosition(fixtureText, 'a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$', 'A$');
            const result = await connection.sendRequest(SETOPTS_DECODE_IN_CODE_METHOD, {
                uri: fixtureUri, line: pos.line, character: pos.character,
            } satisfies SetOptsInCodeDecodeParams) as SetOptsInCodeDecodeResult;
            expect(result.found).toBe(true);
            expect(result.editable).toBe(false);
            expect(result.mode).toBe('chain');
            expect(result.reason).toContain('byte range');
            expect(result.chain).toBeUndefined();
            expect(result.initial).toBeUndefined();
        }, 60_000);

        test('decodeInCode on a REM comment line finds no SETOPTS-in-code shape', async () => {
            const lines = fixtureText.split('\n');
            const remLineIdx = lines.findIndex(l => l.trim().startsWith('REM Group 4'));
            expect(remLineIdx, 'expected to find the group 4 REM comment line').toBeGreaterThanOrEqual(0);
            const result = await connection.sendRequest(SETOPTS_DECODE_IN_CODE_METHOD, {
                uri: fixtureUri, line: remLineIdx, character: 5,
            } satisfies SetOptsInCodeDecodeParams) as SetOptsInCodeDecodeResult;
            expect(result.found).toBe(false);
        }, 60_000);

        test('composeTriState renders the canonical var$=OPTS / IOR / AND / SETOPTS var$ block shape', async () => {
            // Derive the two option keys from the live catalog response (decodeInCode's own
            // `initial` selection enumerates every catalog bit) rather than hardcoding a
            // byte/mask pair, so a catalog rename cannot silently make this assertion vacuous.
            const pos = findPosition(fixtureText, 'SETOPTS B$', 'B$');
            const decode = await connection.sendRequest(SETOPTS_DECODE_IN_CODE_METHOD, {
                uri: fixtureUri, line: pos.line, character: pos.character,
            } satisfies SetOptsInCodeDecodeParams) as SetOptsInCodeDecodeResult;
            expect(decode.initial).toBeDefined();
            const entries = decode.initial!.entries;
            expect(entries.length).toBeGreaterThanOrEqual(2);
            const [first, second] = entries;

            const composed = await connection.sendRequest(SETOPTS_COMPOSE_TRISTATE_METHOD, {
                selection: {
                    entries: [
                        { byte: first.byte, mask: first.mask, state: 'set' },
                        { byte: second.byte, mask: second.mask, state: 'clear' },
                    ],
                },
            } satisfies SetOptsComposeTriStateParams) as SetOptsComposeTriStateResult;
            expect(composed.text).toMatch(/=OPTS/);
            expect(composed.text).toMatch(/IOR\(/);
            expect(composed.text).toMatch(/AND\(/);
            expect(composed.text).toMatch(/SETOPTS /);
        }, 60_000);
    });
});

/**
 * Shared-server diagnostics and codeAction latency on the reported snippet (#475). The g-88-2
 * debug session eliminated a hang inside the IntelliJ intention's own code and a standing LSP4IJ
 * platform defect, leaving exactly one live alternative: a slow or blocked BBjCPL
 * compile-diagnostics round trip specific to this snippet, which Phase 82's diagnostics-free UAT
 * never exercised. IntelliJ's Alt+Enter action-collection phase drives textDocument/codeAction
 * and waits on diagnostics — both served by the same shared language server this probe drives.
 * This spawns its OWN server instance, separate from the describe block above, and deliberately
 * does NOT send `compiler.trigger: 'off'` — the validator stays at its 'debounced' default, so
 * the measurement reflects what a live IDE actually gets.
 */
describe.skipIf(!installPresent)('shared-server diagnostics and codeAction latency on the reported snippet (#475)', () => {
    let child: ChildProcess;
    let connection: MessageConnection;
    const stderr: string[] = [];

    afterAll(() => {
        connection?.dispose();
        if (child && child.exitCode === null && child.pid !== undefined) {
            try {
                child.kill('SIGKILL');
            } catch {
                // already gone
            }
        }
    });

    test('diagnostics and codeAction both resolve within budget, measured against the reported snippet', async () => {
        const fixtureText = fs.readFileSync(FIXTURE_PATH, 'utf-8');
        const fixtureUri = pathToFileURL(FIXTURE_PATH).toString();

        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        // Registered BEFORE didOpen so no notification can be missed.
        const diagnosticsBudgetMs = 30_000;
        const diagnosticsStart = Date.now();
        let diagnosticsElapsedMs: number | undefined;
        const gotDiagnostics = new Promise<void>(resolve => {
            connection.onNotification('textDocument/publishDiagnostics', (params: { uri?: string }) => {
                if (params?.uri === fixtureUri && diagnosticsElapsedMs === undefined) {
                    diagnosticsElapsedMs = Date.now() - diagnosticsStart;
                    resolve();
                }
            });
        });

        await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: null,
            workspaceFolders: null,
            capabilities: {},
        });
        await connection.sendNotification('initialized', {});
        // Deliberately NOT sending workspace/didChangeConfiguration here — the validator stays at
        // its 'debounced' default so this measurement reflects what a live IDE actually gets.

        await connection.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri: fixtureUri,
                languageId: 'bbj',
                version: 1,
                text: fixtureText,
            },
        });

        await Promise.race([
            gotDiagnostics,
            new Promise(resolve => setTimeout(resolve, diagnosticsBudgetMs)),
        ]);
        if (diagnosticsElapsedMs === undefined) {
            diagnosticsElapsedMs = Date.now() - diagnosticsStart;
        }
        expect(diagnosticsElapsedMs, `first publishDiagnostics for the fixture never arrived within ${diagnosticsBudgetMs}ms. stderr: ${stderr.join('') || '(empty)'}`).toBeLessThan(diagnosticsBudgetMs);

        // Immediately after, over the full range of the line carrying the first reported
        // reproduction, with an empty context.diagnostics and context.only omitted. A result of
        // `null` or `[]` is a PASS for this probe — the point is that it returns at all.
        const targetPos = findPosition(fixtureText, 'a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$', 'a$');
        const targetLineText = fixtureText.split('\n')[targetPos.line];

        const codeActionBudgetMs = 15_000;
        const codeActionStart = Date.now();
        let codeActionElapsedMs: number | undefined;
        let codeActionSettled = false;
        const codeActionPromise = connection.sendRequest('textDocument/codeAction', {
            textDocument: { uri: fixtureUri },
            range: {
                start: { line: targetPos.line, character: 0 },
                end: { line: targetPos.line, character: targetLineText.length },
            },
            context: { diagnostics: [] },
        }).then(() => {
            codeActionElapsedMs = Date.now() - codeActionStart;
            codeActionSettled = true;
        });

        await Promise.race([
            codeActionPromise,
            new Promise(resolve => setTimeout(resolve, codeActionBudgetMs)),
        ]);
        if (codeActionElapsedMs === undefined) {
            codeActionElapsedMs = Date.now() - codeActionStart;
        }
        expect(codeActionSettled, `textDocument/codeAction on the reported snippet did not resolve within ${codeActionBudgetMs}ms. stderr: ${stderr.join('') || '(empty)'}`).toBe(true);
        expect(codeActionElapsedMs, `textDocument/codeAction on the reported snippet took ${codeActionElapsedMs}ms`).toBeLessThan(codeActionBudgetMs);

        console.log(`shared-server latency probe: diagnostics=${diagnosticsElapsedMs}ms (budget ${diagnosticsBudgetMs}ms), codeAction=${codeActionElapsedMs}ms (budget ${codeActionBudgetMs}ms)`);
    }, 120_000);
});

test.skipIf(installPresent)('installed-extension e2e needs `bbj-ext-install` first', () => {
    // Visible skip rather than silent absence: a CI run (or any environment without the
    // ext-test rig) would otherwise appear to cover this without ever resolving an install.
    expect(installPresent).toBe(false);
});
