/**
 * The two ways a client's formatter settings reach the format service, proven end to end into the
 * request the interop double records: the live `workspace/didChangeConfiguration` push, and the
 * `initializationOptions` the client sends at startup. Only the normalized 15 keys may leave.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { DidChangeConfigurationParams, DocumentFormattingParams, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { describe, expect, test, vi } from 'vitest';
import { registerBoundedFormattingHandler } from '../src/language/bbj-formatting-handler.js';
import { FORMATTER_SETTING_KEYS } from '../src/language/bbj-format-settings.js';
import type { ResolvedConfigPath } from '../src/language/config-path-resolver.js';
import {
    createConfigurationChangeHandler,
    type ConfigurationChangeDeps,
} from '../src/language/configuration-change-handler.js';
import { createBBjTestServices, type JavaInteropTestService } from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

const URI_TEXT = 'file:///ws/demo.bbj';
const UNRESOLVED_PATH: ResolvedConfigPath = { path: '', source: 'default', exists: false, problem: null };
const SOURCE = 'if a then print 1\n  x=1\n';

type DocumentHandler = (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const connection = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
    registerBoundedFormattingHandler(connection, shared, BBj);
    const formatDocument = connection.onDocumentFormatting.mock.calls[0][0] as DocumentHandler;
    return { shared, BBj, double, client, formatDocument };
}

/** A configuration-change handler whose formatter dependency is the real format service. */
function createConfigurationHandler(BBj: ReturnType<typeof createBBjTestServices>['BBj']) {
    const deps: ConfigurationChangeDeps = {
        updateConfiguration: vi.fn(),
        getConfiguration: vi.fn(),
        isWorkspaceInitialized: () => false,
        wsManager: {
            setConfigPath: vi.fn(),
            getResolvedConfigPath: vi.fn(() => UNRESOLVED_PATH),
            setCompilerConfig: vi.fn(),
        },
        javaInterop: { setConnectionConfig: vi.fn() },
        configWatcher: { updateResolvedPath: vi.fn() },
        notifyResolvedConfigPath: vi.fn(),
        reloadJavaClassesAndRevalidate: vi.fn(async () => { /* not reached before initialization */ }),
        refreshInlayHints: vi.fn(),
        setLogLevel: vi.fn(),
        setSuppressCascading: vi.fn(),
        setMaxErrors: vi.fn(),
        setCompilerTrigger: vi.fn(),
        setParameterHintMode: vi.fn(),
        setFormatterSettings: settings => BBj.compiler.BBjFormatService.setSettings(settings),
    };
    return createConfigurationChangeHandler(deps);
}

function push(bbj: Record<string, unknown>): DidChangeConfigurationParams {
    return { settings: { bbj } } as unknown as DidChangeConfigurationParams;
}

async function formatOnce(harness: ReturnType<typeof createHarness>) {
    await harness.formatDocument({ textDocument: { uri: URI_TEXT }, options: { tabSize: 4, insertSpaces: true } }, CancellationToken.None);
    return harness.double.formatProgramCalls[harness.double.formatProgramCalls.length - 1];
}

describe('formatter settings pushed through workspace/didChangeConfiguration', () => {

    test('a push reaches the next format request as exactly the 15 normalized keys', async () => {
        const harness = createHarness();
        const handler = createConfigurationHandler(harness.BBj);
        harness.client.open(URI_TEXT, 1, SOURCE);

        await handler(push({ formatter: { indentWidth: 4, javaPath: '/usr/bin/java', splitSingleLineIF: true, foo: 1 } }));
        const call = await formatOnce(harness);

        const keys = Object.keys(call.settings ?? {});
        expect(keys).toHaveLength(15);
        expect([...keys].sort()).toEqual([...FORMATTER_SETTING_KEYS].sort());
        expect(call.settings?.indentWidth).toBe(4);
        expect(call.settings?.splitSingleLineIf).toBe(true);
        expect(keys).not.toContain('javaPath');
        expect(keys).not.toContain('splitSingleLineIF');
        expect(keys).not.toContain('foo');
    });

    test('a later push without a formatter section leaves the settings and their revision unchanged', async () => {
        const harness = createHarness();
        const handler = createConfigurationHandler(harness.BBj);
        harness.client.open(URI_TEXT, 1, SOURCE);
        await handler(push({ formatter: { indentWidth: 4 } }));
        const revision = harness.BBj.compiler.BBjFormatService.settingsRevision;
        const first = await formatOnce(harness);

        await handler(push({ debug: true }));
        const second = await formatOnce(harness);

        expect(harness.BBj.compiler.BBjFormatService.settingsRevision).toBe(revision);
        expect(second.settings).toEqual(first.settings);
        expect(second.settings?.indentWidth).toBe(4);
    });
});

describe('formatter settings sent in initializationOptions', () => {

    function initialize(harness: ReturnType<typeof createHarness>, initializationOptions: unknown) {
        return harness.shared.lsp.LanguageServer.initialize({
            processId: null,
            rootUri: null,
            capabilities: {},
            workspaceFolders: null,
            initializationOptions,
        });
    }

    test('the formatter object is applied when the server initializes and only the 15 keys survive', async () => {
        const harness = createHarness();

        await initialize(harness, { formatter: { indentWidth: 3, ifClosingKeyword: 'ENDIF', javaPath: '/j' } });

        const snapshot = harness.BBj.compiler.BBjFormatService.settingsSnapshot();
        expect(Object.keys(snapshot)).toHaveLength(15);
        expect(snapshot.indentWidth).toBe(3);
        expect(snapshot.ifClosingKeyword).toBe('ENDIF');
        expect('javaPath' in snapshot).toBe(false);
    });

    test('the first format after initialize already uses the startup values', async () => {
        const harness = createHarness();
        harness.client.open(URI_TEXT, 1, SOURCE);

        await initialize(harness, { formatter: { indentWidth: 3 } });
        const call = await formatOnce(harness);

        expect(call.settings?.indentWidth).toBe(3);
    });

    test('initialization options without a formatter key leave the 15 defaults with indentWidth 2', async () => {
        const harness = createHarness();

        await initialize(harness, { home: '/opt/bbj' });

        const snapshot = harness.BBj.compiler.BBjFormatService.settingsSnapshot();
        expect(Object.keys(snapshot)).toHaveLength(15);
        expect(snapshot.indentWidth).toBe(2);
    });

    test('a client that sends no initialization options at all gets the defaults', async () => {
        const harness = createHarness();

        await initialize(harness, undefined);

        expect(harness.BBj.compiler.BBjFormatService.settingsSnapshot().indentWidth).toBe(2);
    });
});
