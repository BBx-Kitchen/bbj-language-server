import { ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createMessageConnection, IPCMessageReader, IPCMessageWriter, MessageConnection } from 'vscode-jsonrpc/node';

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

describe.skipIf(!installPresent)('installed extension e2e: SETOPTS-in-code hover on the freshly installed bundle (#475)', () => {
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

test.skipIf(installPresent)('installed-extension e2e needs `bbj-ext-install` first', () => {
    // Visible skip rather than silent absence: a CI run (or any environment without the
    // ext-test rig) would otherwise appear to cover this without ever resolving an install.
    expect(installPresent).toBe(false);
});
