/**
 * The shared hermetic harness of the DENUM suites: the test services with the scripted interop
 * double, a fake language-client text-document feed, a fake language-client connection that the
 * notifications module talks to, logger spies and the DENUM service. Nothing here reaches a socket.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { Connection, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { vi } from 'vitest';
import type { DenumMessenger } from '../src/language/bbj-denum-service.js';
import { initNotifications } from '../src/language/bbj-notifications.js';
import type { ProgramDiagnostic } from '../src/language/java-interop-program-types.js';
import { logger } from '../src/language/logger.js';
import { createBBjTestServices, type JavaInteropTestService } from './bbj-test-module.js';
import { createFakeServerConnection } from './fake-server-connection.js';
import { listenOnFakeConnection, type FakeTextDocumentClient } from './fake-text-document-connection.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function spyOnLogger() {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map(level => ({
        level,
        spy: vi.spyOn(logger, level).mockImplementation(() => { /* silenced */ })
    }));
    return {
        spies,
        spyFor: (level: LogLevel) => spies.find(entry => entry.level === level)!.spy
    };
}

export function createDenumHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const fake = createFakeServerConnection();
    initNotifications(fake.connection);
    const loggers = spyOnLogger();
    const service = BBj.compiler.BBjDenumService;
    // Like a real client: an accepted edit reaches the document as one didChange with the next version.
    fake.workspace.applyEdit.mockImplementation(async (params: unknown) => {
        const { edit } = params as { edit: { documentChanges: Array<{ textDocument: { uri: string }; edits: TextEdit[] }> } };
        for (const change of edit.documentChanges) {
            applyEditsAsClient(client, textDocuments, change.textDocument.uri, change.edits);
        }
        return { applied: true };
    });
    const run = (uri: string, token: CancellationToken = CancellationToken.None) =>
        service.run({ uri, current: () => textDocuments.get(uri) }, token);
    return { shared, BBj, double, client, textDocuments, service, run, loggers, ...fake };
}

export type DenumHarness = ReturnType<typeof createDenumHarness>;

/** Sends the edits to the server's document mirror as one didChange carrying the next version, like an editor that applied them. */
export function applyEditsAsClient(
    client: FakeTextDocumentClient,
    textDocuments: NormalizedTextDocuments<TextDocument>,
    uri: string,
    edits: readonly TextEdit[]
): void {
    const version = textDocuments.get(uri)?.version ?? 0;
    client.change(uri, version + 1, edits.map(edit => ({ range: edit.range, text: edit.newText })));
}

/** A scripted answer: the denumbered text for `version`, with optional diagnostics. */
export function denumAnswer(text: string, version: number, diagnostics: ProgramDiagnostic[] = []) {
    return { result: { text, diagnostics, denumbered: true, version: String(version) } };
}

/** A recording stand-in for the messenger, installed on the harness's DENUM service. */
export function installRecordingMessenger(harness: DenumHarness) {
    const messenger = {
        info: vi.fn(),
        warn: vi.fn(),
        infoWithAction: vi.fn(),
        warnWithAction: vi.fn(),
        warnWithActions: vi.fn(),
        showDocument: vi.fn(),
        openFormatterSettings: vi.fn(),
        denumDiagnostics: vi.fn(),
        showDenumDiagnostics: vi.fn(),
        applyEdit: vi.fn(async (uri: string, _version: number, edits: TextEdit[], _label: string) => {
            applyEditsAsClient(harness.client, harness.textDocuments, uri, edits);
            return true;
        })
    } satisfies DenumMessenger;
    harness.service.setMessenger(messenger);
    return messenger;
}

export function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
}

/** The lines logged at `level` so far. */
export function loggedLines(loggers: DenumHarness['loggers'], level: LogLevel): string[] {
    return loggers.spyFor(level).mock.calls.map(args => String(typeof args[0] === 'function' ? args[0]() : args[0]));
}

/** Restores every mock and detaches the notifications module from the fake connection. */
export function resetDenumHarness(): void {
    vi.restoreAllMocks();
    initNotifications(null as unknown as Connection);
}
