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
/** The composer-cue fixture (#650), covering every composer kind plus its non-editable/decoy
 * counterparts. Shared by every describe below that spawns its own server against it. */
const CUE_FIXTURE_PATH = path.resolve(TEST_DIR, '../../../examples/issue650-composer-cues.bbj');
/** The repository root, resolved from this file's own location -- never a hardcoded absolute
 * path. Used by the cold-ordering probe below, which opens the WHOLE repo as its workspace (the
 * same shape the tester's IntelliJ project used when the live probe measured a 56016ms hang). */
const REPO_ROOT = path.resolve(TEST_DIR, '../../../');

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

        test('composeTriState mask arguments are bare delimited hex literals over the installed bundle, never quoted (gap-closure round two)', async () => {
            // The shipped-artifact counterpart of the unit oracle in setopts-catalog.test.ts: same
            // defect class (a mask argument wrapped in a stray pair of double quotes turns a
            // 16-byte hex-decoded value into a 34-character plain string, raising a BBj !ERROR=17
            // at run time), asserted here against the bundle a user actually loads, over the wire.
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

            expect(composed.text).not.toContain('"');
            const reassignmentLines = composed.text.split('\n').filter(l => /IOR\(|AND\(/.test(l));
            expect(reassignmentLines.length).toBeGreaterThanOrEqual(2);
            for (const line of reassignmentLines) {
                // A dollar delimiter, hex digits, a dollar delimiter, directly between the comma
                // and the closing parenthesis -- a bare delimited hex literal, no quote character.
                expect(line).toMatch(/,\$[0-9a-fA-F]+\$\)/);
            }
        }, 60_000);
    });
});

/**
 * Shared-server diagnostics and codeAction latency on the reported snippet (#475) — measured in
 * the WARM ordering: `codeAction` is issued only after the first `publishDiagnostics` has already
 * arrived (or the diagnostics budget elapsed), so the document is already built past the point
 * `codeAction` needs. This is a useful data point on its own, but it is NOT the ordering
 * Alt+Enter actually produces — see the cold-ordering probe below, which issues `codeAction`
 * immediately after `didOpen` instead. This spawns its OWN server instance, separate from the
 * describe block above, and deliberately does NOT send `compiler.trigger: 'off'` — the validator
 * stays at its 'debounced' default, so the measurement reflects what a live IDE actually gets.
 */
describe.skipIf(!installPresent)('shared-server diagnostics and codeAction latency on the reported snippet, WARM ordering (#475)', () => {
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

    test('WARM ordering: diagnostics and codeAction both resolve within budget, codeAction issued only after diagnostics', async () => {
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

/**
 * The COLD-ordering codeAction probe (#475) — this is the measurement the earlier warm "205ms /
 * 15000ms" reading got wrong. `textDocument/codeAction` is issued IMMEDIATELY after `didOpen`,
 * with no wait on diagnostics and no warm-up hover, reproducing the exact ordering Alt+Enter
 * actually produces (IntelliJ's intention-search phase issues the request before the workspace
 * build has any reason to have settled). The workspace is opened at the repository root, the same
 * shape the tester's IntelliJ project used when a live probe against the pre-fix server measured
 * a 56016ms hang. A `null` or empty result is a PASS here — the question this probe answers is
 * whether the server replies at all within the cold budget, not what it replies with.
 */
describe.skipIf(!installPresent)('cold-ordering codeAction probe against the reinstalled bundle, workspace = repo root (#475)', () => {
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

    test('codeAction issued immediately after didOpen, before any diagnostics, settles within the cold budget', async () => {
        const fixtureText = fs.readFileSync(FIXTURE_PATH, 'utf-8');
        const fixtureUri = pathToFileURL(FIXTURE_PATH).toString();
        const repoRootUri = pathToFileURL(REPO_ROOT).toString();

        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        // Whether diagnostics arrived before the codeAction reply, recorded rather than assumed —
        // the listener is registered BEFORE didOpen so the ordering is actually observed.
        let codeActionSettled = false;
        let diagnosticsArrivedFirst = false;
        connection.onNotification('textDocument/publishDiagnostics', (params: { uri?: string }) => {
            if (params?.uri === fixtureUri && !codeActionSettled) {
                diagnosticsArrivedFirst = true;
            }
        });

        // rootUri/workspaceFolders = the repository root, matching the workspace the tester's
        // IntelliJ project used (opening the whole bbj-language-server repo), not the scoped
        // rootUri: null the other describe blocks in this file deliberately use.
        await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: repoRootUri,
            workspaceFolders: [{ uri: repoRootUri, name: 'bbj-language-server' }],
            capabilities: {},
        });
        await connection.sendNotification('initialized', {});

        await connection.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri: fixtureUri,
                languageId: 'bbj',
                version: 1,
                text: fixtureText,
            },
        });

        // IMMEDIATELY — no await on diagnostics, no warm-up hover — over the full range of the
        // line carrying the first reported reproduction, with LSP4IJ's own exact parameters: an
        // empty context.diagnostics and the Automatic trigger kind (numeric value 2).
        const targetPos = findPosition(fixtureText, 'a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$', 'a$');
        const targetLineText = fixtureText.split('\n')[targetPos.line];

        // Generous enough to be stable on a loaded machine, far below the pre-fix 56016ms hang —
        // the point is the difference between "a few seconds" and "under a minute or never".
        const coldBudgetMs = 20_000;
        const start = Date.now();
        const codeActionPromise = connection.sendRequest('textDocument/codeAction', {
            textDocument: { uri: fixtureUri },
            range: {
                start: { line: targetPos.line, character: 0 },
                end: { line: targetPos.line, character: targetLineText.length },
            },
            context: { diagnostics: [], triggerKind: 2 },
        }).then(() => {
            codeActionSettled = true;
        });

        await Promise.race([
            codeActionPromise,
            new Promise(resolve => setTimeout(resolve, coldBudgetMs)),
        ]);
        const elapsedMs = Date.now() - start;

        console.log(`cold codeAction probe (workspace=repo root): elapsed=${elapsedMs}ms (budget ${coldBudgetMs}ms), diagnosticsArrivedFirst=${diagnosticsArrivedFirst}`);

        expect(codeActionSettled, `textDocument/codeAction (cold ordering, workspace=repo root) did not settle within ${coldBudgetMs}ms. stderr: ${stderr.join('') || '(empty)'}`).toBe(true);
    }, 120_000);
});

/**
 * Composer cue discoverability on the installed bundle (#650): proves the shipped extension
 * advertises `codeLensProvider` and serves `Compose addWindow` cues over `textDocument/codeLens`
 * for the new fixture -- addWindow calls in code, a REM-commented call and a string-literal decoy
 * excluded, and `(1/2)`/`(2/2)` suffixing for the two calls that share one line. Spawns its own
 * server process (separate from the describe blocks above) so the captured `initialize` result
 * is this describe's own, not discarded like the shared-connection block's.
 */
describe.skipIf(!installPresent)('composer cues on the installed bundle (#650)', () => {
    let child: ChildProcess;
    let connection: MessageConnection;
    let fixtureText: string;
    let fixtureUri: string;
    let initializeResult: { capabilities?: { codeLensProvider?: unknown } };
    const stderr: string[] = [];

    beforeAll(async () => {
        fixtureText = fs.readFileSync(CUE_FIXTURE_PATH, 'utf-8');
        fixtureUri = pathToFileURL(CUE_FIXTURE_PATH).toString();

        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        initializeResult = await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: null,
            workspaceFolders: null,
            capabilities: {},
        }) as { capabilities?: { codeLensProvider?: unknown } };
        await connection.sendNotification('initialized', {});

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

    test('initialize advertises codeLensProvider', () => {
        expect(initializeResult.capabilities?.codeLensProvider, `stderr: ${stderr.join('') || '(empty)'}`).toBeDefined();
    });

    test('client bundle: the compiled out/extension.cjs carries the bbj.openComposerAt command literal', () => {
        // Only string literals are safe to assert against a bundled/minified client -- see the
        // identical rationale on the SETOPTS-in-code command-literal test above.
        const bundle = fs.readFileSync(install!.extensionCjsPath, 'utf-8');
        expect(bundle).toContain('bbj.openComposerAt');
    });

    test('textDocument/codeLens returns Compose addWindow cues on each addWindow code line, (1/2)/(2/2) on the shared line, none on the REM or string-literal lines', async () => {
        type CueLens = {
            range: { start: { line: number; character: number } };
            command?: { command?: string; title?: string; arguments?: Array<{ kind?: string }> };
        };
        // Poll until the codeLens list is non-empty, since the workspace scan continues in the
        // background and the first request can race the document's cold build.
        const deadline = Date.now() + 30_000;
        let lenses: CueLens[] | null = null;
        while (Date.now() < deadline) {
            lenses = await connection.sendRequest('textDocument/codeLens', {
                textDocument: { uri: fixtureUri },
            }) as CueLens[] | null;
            if (lenses && lenses.length > 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        expect(lenses, `codeLens never returned any lenses within budget. stderr: ${stderr.join('') || '(empty)'}`).toBeTruthy();
        expect(lenses!.length).toBeGreaterThan(0);

        for (const lens of lenses!) {
            expect(lens.command?.command).toBe('bbj.openComposerAt');
        }
        // The fixture now carries every composer kind (#650 extension); scope this test's own
        // assertions to the addwindow-kind lenses only -- other kinds are covered by the
        // "every composer kind carries its cue" describe below.
        const addWindowLenses = lenses!.filter(l => l.command?.arguments?.[0]?.kind === 'addwindow');
        expect(addWindowLenses.length).toBeGreaterThan(0);

        const win1Line = findPosition(
            fixtureText,
            'win1! = sysgui!.addWindow(10, 10, 400, 300, "First", $00010003$)',
            'addWindow',
        ).line;
        const win2Line = findPosition(
            fixtureText,
            'win2! = sysgui!.addWindow(50, 50, 300, 200, "Second", $00000001$)',
            'addWindow',
        ).line;
        const sharedLine = findPosition(
            fixtureText,
            'win3! = sysgui!.addWindow(0, 0, 100, 100, "A") : win4! = sysgui!.addWindow(0, 0, 100, 100, "B")',
            'addWindow',
        ).line;
        const lines = fixtureText.split('\n');
        const remLineIdx = lines.findIndex(l => l.trim().startsWith('rem win5!'));
        const stringLineIdx = lines.findIndex(l => l.includes('msg$ ='));
        expect(remLineIdx, 'expected to find the REM-commented addWindow line').toBeGreaterThanOrEqual(0);
        expect(stringLineIdx, 'expected to find the string-literal decoy line').toBeGreaterThanOrEqual(0);

        expect(addWindowLenses.some(l => l.range.start.line === win1Line)).toBe(true);
        expect(addWindowLenses.some(l => l.range.start.line === win2Line)).toBe(true);
        expect(addWindowLenses.some(l => l.range.start.line === remLineIdx)).toBe(false);
        expect(addWindowLenses.some(l => l.range.start.line === stringLineIdx)).toBe(false);

        const sharedLineLenses = addWindowLenses
            .filter(l => l.range.start.line === sharedLine)
            .sort((a, b) => a.range.start.character - b.range.start.character);
        expect(sharedLineLenses).toHaveLength(2);
        expect(sharedLineLenses[0].command?.title).toBe('Compose addWindow (1/2)');
        expect(sharedLineLenses[1].command?.title).toBe('Compose addWindow (2/2)');
    }, 60_000);
});

/**
 * Every composer kind's cue on the installed bundle (#650), against the fully extended fixture:
 * MSGBOX (literal, constant-sum, expression), addWindow, addChildWindow, an editable CVS() call,
 * an editable in-code SETOPTS chain -- and NO cue for their non-editable/decoy counterparts (a
 * non-literal CVS() mask, an interrupted SETOPTS chain, the REM line, the string decoy). Spawns
 * its own server, separate from every other describe in this file.
 */
describe.skipIf(!installPresent)('every composer kind carries its cue', () => {
    type CueLens = {
        range: { start: { line: number; character: number } };
        command?: { command?: string; title?: string; arguments?: Array<{ kind?: string }> };
    };

    let child: ChildProcess;
    let connection: MessageConnection;
    let fixtureText: string;
    let lenses: CueLens[];
    const stderr: string[] = [];

    beforeAll(async () => {
        fixtureText = fs.readFileSync(CUE_FIXTURE_PATH, 'utf-8');
        const fixtureUri = pathToFileURL(CUE_FIXTURE_PATH).toString();

        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: null,
            workspaceFolders: null,
            capabilities: {},
        });
        await connection.sendNotification('initialized', {});

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

        // Poll until the codeLens list is non-empty -- the same cold-build race every other
        // describe in this file guards against.
        const deadline = Date.now() + 30_000;
        let result: CueLens[] | null = null;
        while (Date.now() < deadline) {
            result = await connection.sendRequest('textDocument/codeLens', {
                textDocument: { uri: fixtureUri },
            }) as CueLens[] | null;
            if (result && result.length > 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        expect(result, `codeLens never returned any lenses within budget. stderr: ${stderr.join('') || '(empty)'}`).toBeTruthy();
        lenses = result!;
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

    function linesFor(kind: string): number[] {
        return lenses
            .filter(l => l.command?.arguments?.[0]?.kind === kind)
            .map(l => l.range.start.line)
            .sort((a, b) => a - b);
    }

    test('msgbox cues appear on all three MSGBOX lines (literal, constant-sum and expression)', () => {
        const expected = [
            findPosition(fixtureText, 'r = MSGBOX("Save?", 36, "Confirm")', 'MSGBOX').line,
            findPosition(
                fixtureText,
                'r = MSGBOX("Save?", BBjMsgBox.MSGBOX_BUTTONS_YES_NO+BBjMsgBox.MSGBOX_ICON_QUESTION, "Confirm")',
                'MSGBOX',
            ).line,
            findPosition(fixtureText, 'r = MSGBOX("Save?", flags%, "Confirm")', 'MSGBOX').line,
        ].sort((a, b) => a - b);
        expect(linesFor('msgbox')).toEqual(expected);
    });

    test('addwindow cues appear on both standalone lines and both calls sharing one line', () => {
        const win1Line = findPosition(
            fixtureText, 'win1! = sysgui!.addWindow(10, 10, 400, 300, "First", $00010003$)', 'addWindow',
        ).line;
        const win2Line = findPosition(
            fixtureText, 'win2! = sysgui!.addWindow(50, 50, 300, 200, "Second", $00000001$)', 'addWindow',
        ).line;
        const sharedLine = findPosition(
            fixtureText,
            'win3! = sysgui!.addWindow(0, 0, 100, 100, "A") : win4! = sysgui!.addWindow(0, 0, 100, 100, "B")',
            'addWindow',
        ).line;
        expect(linesFor('addwindow')).toEqual([win1Line, win2Line, sharedLine, sharedLine].sort((a, b) => a - b));
    });

    test('addchildwindow cue appears on its call line', () => {
        const line = findPosition(
            fixtureText, 'window!.addChildWindow(101, "Child", 10, 10, 200, 150, $00000000$)', 'addChildWindow',
        ).line;
        expect(linesFor('addchildwindow')).toEqual([line]);
    });

    test('cvs cue appears only on the editable literal-sum line, never the non-literal mode% line', () => {
        const editableLine = findPosition(fixtureText, 'trimmed$ = CVS(name$, 1+4)', 'CVS').line;
        expect(linesFor('cvs')).toEqual([editableLine]);
    });

    test('setopts-in-code cue appears only on the absolute literal and the safe chain\'s SETOPTS line', () => {
        const absoluteLine = findPosition(fixtureText, 'SETOPTS $04$', 'SETOPTS').line;
        const safeChainLine = findPosition(fixtureText, 'SETOPTS b$', 'SETOPTS').line;
        expect(linesFor('setopts-in-code')).toEqual([absoluteLine, safeChainLine].sort((a, b) => a - b));
    });

    test('no composer cue lands on the mode% CVS line, the interrupted chain\'s SETOPTS line, the REM line or the string decoy', () => {
        const modeLine = findPosition(fixtureText, 'trimmed$ = CVS(name$, mode%)', 'CVS').line;
        const interruptedChainLine = findPosition(fixtureText, 'SETOPTS e$', 'SETOPTS').line;
        const lines = fixtureText.split('\n');
        const remLineIdx = lines.findIndex(l => l.trim().startsWith('rem win5!'));
        const stringLineIdx = lines.findIndex(l => l.includes('msg$ ='));
        expect(remLineIdx, 'expected to find the REM-commented addWindow line').toBeGreaterThanOrEqual(0);
        expect(stringLineIdx, 'expected to find the string-literal decoy line').toBeGreaterThanOrEqual(0);

        for (const badLine of [modeLine, interruptedChainLine, remLineIdx, stringLineIdx]) {
            expect(lenses.some(l => l.range.start.line === badLine)).toBe(false);
        }
    });
});

/**
 * A `bbx-config` document reaches the installed bundle only for its composer cue (#650, DISC-01):
 * exactly one `setopts-config` cue per SETOPTS line, a hover that settles well inside the codeLens
 * budget instead of hanging, and never a non-empty `publishDiagnostics` payload -- proof the
 * config document is never parsed, linked or diagnosed as BBj source over the wire.
 */
describe.skipIf(!installPresent)('config documents are text-only', () => {
    const CONFIG_TEXT = 'PREFIX "/tmp/"\nSETOPTS 00000080\n';

    let child: ChildProcess;
    let connection: MessageConnection;
    let configUri: string;
    const diagnosticsByUri = new Map<string, unknown[]>();
    const stderr: string[] = [];

    beforeAll(async () => {
        const configPath = path.join(os.tmpdir(), 'issue650-config.bbx');
        configUri = pathToFileURL(configPath).toString();

        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        // Registered BEFORE didOpen so no notification can be missed.
        connection.onNotification('textDocument/publishDiagnostics', (params: { uri?: string; diagnostics?: unknown[] }) => {
            if (params?.uri) {
                diagnosticsByUri.set(params.uri, params.diagnostics ?? []);
            }
        });

        await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: null,
            workspaceFolders: null,
            capabilities: {},
        });
        await connection.sendNotification('initialized', {});

        await connection.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri: configUri,
                languageId: 'bbx-config',
                version: 1,
                text: CONFIG_TEXT,
            },
        });
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

    test('textDocument/codeLens returns exactly one Compose SETOPTS cue, on line 1', async () => {
        type CueLens = {
            range: { start: { line: number } };
            command?: { command?: string; arguments?: Array<{ kind?: string }> };
        };
        const deadline = Date.now() + 15_000;
        let lenses: CueLens[] | null = null;
        while (Date.now() < deadline) {
            lenses = await connection.sendRequest('textDocument/codeLens', {
                textDocument: { uri: configUri },
            }) as CueLens[] | null;
            if (lenses && lenses.length > 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        expect(lenses, `codeLens never returned any lenses within budget. stderr: ${stderr.join('') || '(empty)'}`).toBeTruthy();
        expect(lenses).toHaveLength(1);
        expect(lenses![0].range.start.line).toBe(1);
        expect(lenses![0].command?.command).toBe('bbj.openComposerAt');
        expect(lenses![0].command?.arguments?.[0]?.kind).toBe('setopts-config');
    }, 30_000);

    test('a hover on the config document settles (resolved or rejected) well within the codeLens budget, never hangs', async () => {
        const hoverOutcome = connection.sendRequest('textDocument/hover', {
            textDocument: { uri: configUri },
            position: { line: 1, character: 0 },
        }).then(() => 'settled' as const, () => 'settled' as const);
        const timedOut = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 6000));
        const outcome = await Promise.race([hoverOutcome, timedOut]);
        expect(outcome, `hover on the config document did not settle within the budget. stderr: ${stderr.join('') || '(empty)'}`).toBe('settled');
    }, 10_000);

    test('publishDiagnostics for the config document, if any arrived, never carries a non-empty diagnostics array', async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const diags = diagnosticsByUri.get(configUri);
        if (diags !== undefined) {
            expect(diags).toHaveLength(0);
        }
    }, 10_000);
});

/**
 * The new MSGBOX and CVS() decode payloads (#648, #649), proven over the wire against the
 * installed bundle rather than the source tree's unit tests alone.
 */
describe.skipIf(!installPresent)('new decode payloads on the installed bundle', () => {
    let child: ChildProcess;
    let connection: MessageConnection;
    let fixtureText: string;
    const stderr: string[] = [];

    beforeAll(async () => {
        fixtureText = fs.readFileSync(CUE_FIXTURE_PATH, 'utf-8');
        const fixtureUri = pathToFileURL(CUE_FIXTURE_PATH).toString();

        child = spawn(process.execPath, [install!.serverPath, '--node-ipc', `--clientProcessId=${process.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        child.stderr?.on('data', chunk => stderr.push(String(chunk)));

        connection = createMessageConnection(new IPCMessageReader(child), new IPCMessageWriter(child));
        connection.listen();

        await connection.sendRequest('initialize', {
            processId: process.pid,
            rootUri: null,
            workspaceFolders: null,
            capabilities: {},
        });
        await connection.sendNotification('initialized', {});

        await connection.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri: fixtureUri,
                languageId: 'bbj',
                version: 1,
                text: fixtureText,
            },
        });
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

    test('bbj/composer/msgbox/decodeCall on the flags% line returns compose-and-replace carrying the original expression', async () => {
        const lineText = fixtureText.split('\n')[
            findPosition(fixtureText, 'r = MSGBOX("Save?", flags%, "Confirm")', 'MSGBOX').line
        ];
        const result = await connection.sendRequest('bbj/composer/msgbox/decodeCall', { line: lineText }) as {
            found?: boolean;
            replace?: { originalOptions?: string };
        };
        expect(result.found, `stderr: ${stderr.join('') || '(empty)'}`).toBe(true);
        expect(result.replace?.originalOptions).toBe('flags%');
    }, 30_000);

    test('bbj/composer/cvs/decodeCall on the literal-sum line returns editable with the verbatim string argument', async () => {
        const lineText = fixtureText.split('\n')[
            findPosition(fixtureText, 'trimmed$ = CVS(name$, 1+4)', 'CVS').line
        ];
        const result = await connection.sendRequest('bbj/composer/cvs/decodeCall', { line: lineText }) as {
            found?: boolean;
            editable?: boolean;
            initial?: { str?: string; bits?: number[] };
        };
        expect(result.found, `stderr: ${stderr.join('') || '(empty)'}`).toBe(true);
        expect(result.editable).toBe(true);
        expect(result.initial?.str).toBe('name$');
        expect(result.initial?.bits).toEqual([1, 4]);
    }, 30_000);
});

test.skipIf(installPresent)('installed-extension e2e needs `bbj-ext-install` first', () => {
    // Visible skip rather than silent absence: a CI run (or any environment without the
    // ext-test rig) would otherwise appear to cover this without ever resolving an install.
    expect(installPresent).toBe(false);
});
