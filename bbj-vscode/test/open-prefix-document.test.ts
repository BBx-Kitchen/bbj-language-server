import { AstUtils, DocumentState, URI } from 'langium';
import type { FileSystemNode, FileSystemProvider, LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { parseHelper } from 'langium/test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Diagnostic } from 'vscode-languageserver';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjDocumentUpdateHandler } from '../src/language/bbj-document-update-handler.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { FieldDecl, MethodDecl, isFieldDecl, isMethodDecl, isSymbolRef, type Model, type SymbolRef } from '../src/language/generated/ast.js';
import { createBBjTestServices } from './bbj-test-module.js';

/**
 * A BBj document that is open in an editor gets full language support wherever it lives on disk,
 * including under a PREFIX directory. A PREFIX file that nobody opened is still only a library
 * file: loaded so USE statements resolve, never validated, linked by signature only.
 */

const LIB_DIR = '/virtual/lib';
const PROJECT_DIR = '/virtual/project';
const LIB_PATH = `${LIB_DIR}/Lib.bbj`;
const CONTROL_PATH = `${PROJECT_DIR}/Control.bbj`;
const CLOSED_PATH = `${LIB_DIR}/Closed.bbj`;
const OTHER_PATH = `${PROJECT_DIR}/Other.bbj`;

/** The deliberate error: validation reports a BEGIN EXCEPT operand that is not a symbol. */
const ERROR_LINE = 'BEGIN EXCEPT 0';
const ERROR_MESSAGE = "'0' must be symbol reference or array access with ALL";

const LIB_TEXT = [
    'class public Lib',
    '    field private BBjNumber secret',
    '    method public BBjNumber compute(BBjNumber arg)',
    '        declare BBjNumber localVar',
    '        localVar = arg + 1',
    '        #secret = localVar',
    '        methodret localVar',
    '    methodend',
    'classend',
    ERROR_LINE,
    ''
].join('\n');

class InMemoryFileSystemProvider implements FileSystemProvider {
    constructor(private readonly files: Map<string, string>) { }
    private node(uri: URI, isFile: boolean): FileSystemNode {
        return { isFile, isDirectory: !isFile, uri };
    }
    async stat(uri: URI): Promise<FileSystemNode> { return this.statSync(uri); }
    statSync(uri: URI): FileSystemNode {
        if (this.files.has(uri.fsPath)) return this.node(uri, true);
        throw new Error(`ENOENT: ${uri.fsPath}`);
    }
    async exists(uri: URI): Promise<boolean> { return this.files.has(uri.fsPath); }
    existsSync(uri: URI): boolean { return this.files.has(uri.fsPath); }
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        const content = this.files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    async readBinary(uri: URI): Promise<Uint8Array> { return this.readBinarySync(uri); }
    readBinarySync(uri: URI): Uint8Array { return new TextEncoder().encode(this.readFileSync(uri)); }
    async readDirectory(): Promise<FileSystemNode[]> { return []; }
    readDirectorySync(): FileSystemNode[] { return []; }
}

/** Structural view onto the builder's private members under test, reached via cast. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
    shouldCompileWithBbjcpl(document: LangiumDocument): boolean;
    sendDiagnosticsToClient(uri: URI, diagnostics: Diagnostic[]): void;
    publishCycleDiagnostics(document: LangiumDocument, diagnostics: Diagnostic[]): Promise<void>;
};

let files: Map<string, string>;
let services: ReturnType<typeof createBBjTestServices>;
let builder: BBjDocumentBuilder;
let privates: BuilderPrivates;
let textDocuments: NormalizedTextDocuments<TextDocument>;

beforeEach(async () => {
    files = new Map<string, string>([
        [LIB_PATH, LIB_TEXT],
        [CONTROL_PATH, LIB_TEXT],
        [CLOSED_PATH, LIB_TEXT.replace('class public Lib', 'class public Closed')],
        [OTHER_PATH, 'x = 1\n'],
    ]);
    services = createBBjTestServices({ fileSystemProvider: () => new InMemoryFileSystemProvider(files) });
    await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
        { prefixes: [LIB_DIR], classpath: [] };
    builder = services.shared.workspace.DocumentBuilder as BBjDocumentBuilder;
    privates = builder as unknown as BuilderPrivates;
    // There is no BBj install here; availability detection is not what these tests are about.
    privates.bbjcplAvailable = false;
    textDocuments = services.shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

const uriOf = (path: string): URI => URI.file(path);

/** Opens `path` in the editor the way Langium's store does, with `text` as the buffer. */
function open(path: string, text: string = files.get(path) ?? '', version = 1): void {
    textDocuments.set(TextDocument.create(uriOf(path).toString(), 'bbj', version, text));
}

/** Models Langium's reaction to didOpen / didChange: an update of that uri under the update build options. */
async function openAndBuild(path: string, text?: string): Promise<LangiumDocument> {
    open(path, text);
    await services.shared.workspace.DocumentBuilder.update([uriOf(path)], []);
    return services.shared.workspace.LangiumDocuments.getDocument(uriOf(path))!;
}

async function buildWithoutOpening(path: string): Promise<LangiumDocument> {
    await services.shared.workspace.DocumentBuilder.update([uriOf(path)], []);
    return services.shared.workspace.LangiumDocuments.getDocument(uriOf(path))!;
}

function diagnosticShape(document: LangiumDocument): Array<Pick<Diagnostic, 'message' | 'range' | 'severity'>> {
    return (document.diagnostics ?? []).map(d => ({ message: d.message, range: d.range, severity: d.severity }));
}

function refsNamed(document: LangiumDocument, name: string): SymbolRef[] {
    return AstUtils.streamAllContents(document.parseResult.value)
        .filter(isSymbolRef)
        .filter(ref => ref.symbol.$refText === name)
        .toArray();
}

function messages(diagnostics: Diagnostic[] | undefined): string[] {
    return (diagnostics ?? []).map(d => typeof d.message === 'string' ? d.message : d.message.value);
}

describe('an open document under a PREFIX directory', () => {
    test('is validated with the same diagnostics as the identical text outside the PREFIX', async () => {
        const control = await openAndBuild(CONTROL_PATH);
        expect(control.diagnostics?.length ?? 0).toBeGreaterThan(0);
        expect(messages(control.diagnostics)).toContain(ERROR_MESSAGE);

        const library = await openAndBuild(LIB_PATH);
        expect(library.state).toBe(DocumentState.Validated);
        expect(diagnosticShape(library)).toEqual(diagnosticShape(control));
    });

    test('resolves references inside method bodies like a workspace document', async () => {
        const control = await openAndBuild(CONTROL_PATH);
        const library = await openAndBuild(LIB_PATH);

        for (const document of [control, library]) {
            const localRefs = refsNamed(document, 'localVar');
            expect(localRefs.length).toBeGreaterThan(0);
            for (const ref of localRefs) {
                expect(ref.symbol.ref, `method-local variable in ${document.uri.fsPath}`).toBeDefined();
                const declaringMethod = AstUtils.getContainerOfType(ref.symbol.ref, isMethodDecl);
                expect(declaringMethod).toBeDefined();
                expect((declaringMethod as MethodDecl).name).toBe('compute');
            }

            const fieldRefs = refsNamed(document, 'secret');
            expect(fieldRefs.length).toBe(1);
            expect(isFieldDecl(fieldRefs[0].symbol.ref), 'private field via #').toBe(true);
            expect((fieldRefs[0].symbol.ref as FieldDecl).name).toBe('secret');
        }
    });

    test('is eligible for the live parser and the compiler check only while it is open', async () => {
        await buildWithoutOpening(LIB_PATH);
        const document = services.shared.workspace.LangiumDocuments.getDocument(uriOf(LIB_PATH))!;
        expect(privates.shouldCompileWithBbjcpl(document)).toBe(false);

        await openAndBuild(LIB_PATH);
        expect(privates.shouldCompileWithBbjcpl(document)).toBe(true);

        textDocuments.delete(uriOf(LIB_PATH).toString());
        expect(privates.shouldCompileWithBbjcpl(document)).toBe(false);
    });
});

describe('a PREFIX document that is not open', () => {
    test('is still not validated', async () => {
        const closed = await buildWithoutOpening(CLOSED_PATH);
        expect(closed.state).toBe(DocumentState.Validated);
        expect(closed.diagnostics ?? []).toEqual([]);
        expect(closed.textDocument.getText()).toContain(ERROR_LINE);
    });

    test('is validated once it is opened after being loaded only for USE resolution', async () => {
        const parse = parseHelper<Model>(services.BBj);
        const main = await parse(
            'use ::Lib.bbj::Lib\nx = new Lib()\n',
            { documentUri: 'file:///virtual/project/main.bbj', validation: true }
        );
        const documents = services.shared.workspace.LangiumDocuments;
        const library = documents.getDocument(uriOf(LIB_PATH));
        expect(library, 'library loaded by the USE import').toBeDefined();
        expect(library!.diagnostics ?? []).toEqual([]);
        expect(messages(main.diagnostics).filter(m => /could not be resolved/i.test(m))).toEqual([]);

        // The editor opens the very same, unchanged text.
        open(LIB_PATH);
        await services.shared.workspace.DocumentBuilder.update([uriOf(LIB_PATH)], []);

        expect(messages(library!.diagnostics)).toContain(ERROR_MESSAGE);
        expect(documents.getDocument(uriOf(LIB_PATH))).toBe(library);
        const libraryDocuments = documents.all.filter(doc => doc.uri.toString() === uriOf(LIB_PATH).toString()).toArray();
        expect(libraryDocuments).toHaveLength(1);
    });
});

describe('closing a document under a PREFIX directory', () => {
    const closeEditor = (path: string): void => {
        textDocuments.delete(uriOf(path).toString());
    };

    const updateHandler = (): BBjDocumentUpdateHandler =>
        services.shared.lsp.DocumentUpdateHandler as BBjDocumentUpdateHandler;

    /** Calls the handler the way Langium does when the client closes `path`, after the store dropped it. */
    const notifyClosed = (path: string): void => {
        updateHandler().didCloseDocument({
            document: TextDocument.create(uriOf(path).toString(), 'bbj', 1, files.get(path) ?? '')
        });
    };

    test('publishes empty diagnostics and clears the document diagnostics', async () => {
        const library = await openAndBuild(LIB_PATH);
        expect(messages(library.diagnostics)).toContain(ERROR_MESSAGE);
        const send = vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation(() => { });

        closeEditor(LIB_PATH);

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith(expect.objectContaining({ path: uriOf(LIB_PATH).path }), []);
        expect(library.diagnostics ?? []).toEqual([]);
    });

    test('cancels the pending compiler cycle that opening armed', async () => {
        privates.bbjcplAvailable = true;
        await buildWithoutOpening(LIB_PATH);
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        open(LIB_PATH);
        expect(builder.hasPendingCompile()).toBe(true);

        closeEditor(LIB_PATH);
        expect(builder.hasPendingCompile()).toBe(false);
    });

    test('does not let a cycle that was already in flight publish for the closed document', async () => {
        const library = await openAndBuild(LIB_PATH);
        const send = vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation(() => { });
        closeEditor(LIB_PATH);
        send.mockClear();

        const stale: Diagnostic = {
            message: 'stale compiler result',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            severity: 1
        };
        await privates.publishCycleDiagnostics(library, [stale]);

        expect(send).not.toHaveBeenCalled();
        expect(library.diagnostics ?? []).toEqual([]);
    });

    test('rebuilds the document from disk as an unvalidated library document', async () => {
        const diskText = files.get(LIB_PATH)!;
        const library = await openAndBuild(LIB_PATH, `${diskText}BEGIN EXCEPT 1\n`);
        expect(library.textDocument.getText()).toContain('BEGIN EXCEPT 1');
        const update = vi.spyOn(services.shared.workspace.DocumentBuilder, 'update');

        closeEditor(LIB_PATH);
        notifyClosed(LIB_PATH);

        await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
        await update.mock.results[0].value;
        const [changed, deleted] = update.mock.calls[0];
        expect(changed.map(u => u.toString())).toEqual([uriOf(LIB_PATH).toString()]);
        expect(deleted).toEqual([]);

        const documents = services.shared.workspace.LangiumDocuments;
        expect(documents.getDocument(uriOf(LIB_PATH))).toBe(library);
        expect(library.textDocument.getText()).toBe(diskText);
        expect(library.diagnostics ?? []).toEqual([]);
        expect(library.state).toBe(DocumentState.Validated);
        expect(documents.all.filter(doc => doc.uri.toString() === uriOf(LIB_PATH).toString()).toArray()).toHaveLength(1);
    });

    test('leaves a document outside the PREFIX alone', async () => {
        await openAndBuild(OTHER_PATH);
        const update = vi.spyOn(services.shared.workspace.DocumentBuilder, 'update');

        closeEditor(OTHER_PATH);
        notifyClosed(OTHER_PATH);
        // Let any chained work that would have called update run.
        await services.shared.workspace.WorkspaceManager.ready;
        await new Promise(resolve => setImmediate(resolve));

        expect(update).not.toHaveBeenCalled();
    });

    test('removes the document when the PREFIX file no longer exists, without an unhandled rejection', async () => {
        await openAndBuild(LIB_PATH);
        const update = vi.spyOn(services.shared.workspace.DocumentBuilder, 'update');
        const unhandled = vi.fn();
        process.on('unhandledRejection', unhandled);
        try {
            closeEditor(LIB_PATH);
            files.delete(LIB_PATH);
            notifyClosed(LIB_PATH);

            await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
            await update.mock.results[0].value;
            const [changed, deleted] = update.mock.calls[0];
            expect(changed).toEqual([]);
            expect(deleted.map(u => u.toString())).toEqual([uriOf(LIB_PATH).toString()]);
            expect(services.shared.workspace.LangiumDocuments.hasDocument(uriOf(LIB_PATH))).toBe(false);
            await new Promise(resolve => setImmediate(resolve));
            expect(unhandled).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', unhandled);
        }
    });

    test('logs and swallows a failing rebuild instead of rejecting', async () => {
        await openAndBuild(LIB_PATH);
        const boom = vi.spyOn(services.shared.workspace.DocumentBuilder, 'update').mockRejectedValue(new Error('rebuild boom'));
        const unhandled = vi.fn();
        process.on('unhandledRejection', unhandled);
        try {
            closeEditor(LIB_PATH);
            notifyClosed(LIB_PATH);

            await vi.waitFor(() => expect(boom).toHaveBeenCalledTimes(1));
            await new Promise(resolve => setImmediate(resolve));
            expect(unhandled).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', unhandled);
        }
    });
});

describe('a workspace file that USEs a PREFIX file', () => {
    const MAIN_URI = 'file:///virtual/project/main.bbj';
    const unresolved = (document: LangiumDocument): string[] =>
        messages(document.diagnostics).filter(m => /could not be resolved/i.test(m));

    test('resolves it while the PREFIX file is open, without loading it a second time', async () => {
        const library = await openAndBuild(LIB_PATH);
        expect(messages(library.diagnostics)).toContain(ERROR_MESSAGE);

        const parse = parseHelper<Model>(services.BBj);
        const main = await parse('use ::Lib.bbj::Lib\nx = new Lib()\n', { documentUri: MAIN_URI, validation: true });

        const documents = services.shared.workspace.LangiumDocuments;
        expect(unresolved(main)).toEqual([]);
        expect(documents.getDocument(uriOf(LIB_PATH))).toBe(library);
        expect(documents.all.filter(doc => doc.uri.toString() === uriOf(LIB_PATH).toString()).toArray()).toHaveLength(1);
        expect(messages(library.diagnostics)).toContain(ERROR_MESSAGE);
    });

    test('still resolves it after the PREFIX file was closed and rebuilt as a library file', async () => {
        const library = await openAndBuild(LIB_PATH);
        const mainText = 'use ::Lib.bbj::Lib\nx = new Lib()\n';
        files.set(uriOf('/virtual/project/main.bbj').fsPath, mainText);
        const parse = parseHelper<Model>(services.BBj);
        const main = await parse(mainText, { documentUri: MAIN_URI, validation: true });

        const update = vi.spyOn(services.shared.workspace.DocumentBuilder, 'update');
        textDocuments.delete(uriOf(LIB_PATH).toString());
        (services.shared.lsp.DocumentUpdateHandler as BBjDocumentUpdateHandler).didCloseDocument({
            document: TextDocument.create(uriOf(LIB_PATH).toString(), 'bbj', 1, LIB_TEXT)
        });
        await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
        await update.mock.results[0].value;
        expect(library.diagnostics ?? []).toEqual([]);

        await services.shared.workspace.DocumentBuilder.update([main.uri], []);

        const rebuiltMain = services.shared.workspace.LangiumDocuments.getDocument(main.uri)!;
        expect(unresolved(rebuiltMain)).toEqual([]);
    });
});
