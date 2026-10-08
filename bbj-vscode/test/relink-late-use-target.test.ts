import { AstUtils, DocumentState, URI } from 'langium';
import type { FileSystemNode, FileSystemProvider, LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, type WorkspaceFolder } from 'vscode-languageserver';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices } from './bbj-test-module.js';

/**
 * A program that was linked before the file named by its USE (or by an inline
 * `::path::Class` reference) was indexed must link cleanly once that file shows up,
 * and its stale linking diagnostics must be republished, without reloading the window.
 */

const ROOT = '/root';
const SOME_PATH = `${ROOT}/lib/SomeClass.bbj`;
const OTHER_PATH = `${ROOT}/lib/OtherClass.bbj`;
const PROG_PATH = `${ROOT}/app/prog.bbj`;
const DECLARE_PATH = `${ROOT}/app/declare.bbj`;
const UNRELATED_PATH = `${ROOT}/app/unrelated.bbj`;

const classText = (name: string) => [
    `class public ${name}`,
    '    method public static void sayHello()',
    '    methodend',
    'classend',
    ''
].join('\n');

const PROG_TEXT = [
    'use ::lib/SomeClass.bbj::SomeClass',
    'use ::lib/OtherClass.bbj::OtherClass',
    '',
    '',
    'SomeClass.sayHello()',
    'OtherClass.sayHello()',
    ''
].join('\n');

const DECLARE_TEXT = 'declare ::lib/OtherClass.bbj::OtherClass o!\n';
const UNRELATED_TEXT = 'use ::lib/Missing.bbj::Missing\n\ny! = new Missing()\n';

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

let files: Map<string, string>;
let services: ReturnType<typeof createBBjTestServices>;
let builder: BBjDocumentBuilder;
let textDocuments: NormalizedTextDocuments<TextDocument>;
let validated: string[];

beforeEach(async () => {
    setCompilerTrigger('off');
    files = new Map<string, string>([[SOME_PATH, classText('SomeClass')]]);
    services = createBBjTestServices({ fileSystemProvider: () => new InMemoryFileSystemProvider(files) });
    await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    const folders: WorkspaceFolder[] = [{ uri: URI.file(ROOT).toString(), name: 'root' }];
    (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;
    (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
        { prefixes: [], classpath: [] };
    builder = services.shared.workspace.DocumentBuilder as BBjDocumentBuilder;
    // There is no BBj install here; availability detection is not what these tests are about.
    (builder as unknown as { bbjcplAvailable: boolean | undefined }).bbjcplAvailable = false;
    textDocuments = services.shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    // SomeClass.bbj is part of the workspace from the start.
    await builder.update([uriOf(SOME_PATH)], []);
    validated = [];
    builder.onDocumentPhase(DocumentState.Validated, document => {
        validated.push(document.uri.toString());
    });
});

afterEach(() => {
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

const uriOf = (path: string): URI => URI.file(path);

/** Opens `path` in the editor and builds it the way Langium reacts to didOpen. */
async function openAndBuild(path: string, text: string): Promise<LangiumDocument> {
    files.set(path, text);
    textDocuments.set(TextDocument.create(uriOf(path).toString(), 'bbj', 1, text));
    await builder.update([uriOf(path)], []);
    return services.shared.workspace.LangiumDocuments.getDocument(uriOf(path))!;
}

/** Brings a file in without opening it, the way a file watcher event does. */
async function appearOnDisk(path: string, text: string): Promise<void> {
    files.set(path, text);
    await builder.update([uriOf(path)], []);
}

function erroringRefTexts(document: LangiumDocument): string[] {
    return document.references.filter(ref => ref.error !== undefined).map(ref => ref.$refText);
}

function linkingDiagnostics(document: LangiumDocument): string[] {
    return (document.diagnostics ?? [])
        .map(d => ({ line: d.range.start.line, message: Diagnostic.getMessageString(d) }))
        .filter(d => /resolve reference|could not be resolved/i.test(d.message))
        .map(d => `${d.line}: ${d.message}`);
}

function wasValidated(path: string): boolean {
    return validated.includes(uriOf(path).toString());
}

describe('a USE target that is indexed after the program was linked', () => {
    test('the program links against the missing class before it exists', async () => {
        const prog = await openAndBuild(PROG_PATH, PROG_TEXT);
        const broken = erroringRefTexts(prog);
        expect(broken).toContain('OtherClass');
        expect(broken).not.toContain('SomeClass');
    });

    test('adding the target file relinks and revalidates the program', async () => {
        const prog = await openAndBuild(PROG_PATH, PROG_TEXT);
        expect(erroringRefTexts(prog).length).toBeGreaterThan(0);
        validated.length = 0;

        await appearOnDisk(OTHER_PATH, classText('OtherClass'));

        const after = services.shared.workspace.LangiumDocuments.getDocument(uriOf(PROG_PATH))!;
        expect(erroringRefTexts(after)).toEqual([]);
        expect(linkingDiagnostics(after)).toEqual([]);
        expect(wasValidated(PROG_PATH)).toBe(true);
    });
});

describe('a USE target that first exists without the class', () => {
    test('gaining the class relinks and revalidates the program', async () => {
        files.set(OTHER_PATH, 'REM nothing here yet\n');
        await builder.update([uriOf(OTHER_PATH)], []);
        const prog = await openAndBuild(PROG_PATH, PROG_TEXT);
        expect(erroringRefTexts(prog)).toContain('OtherClass');
        validated.length = 0;

        await appearOnDisk(OTHER_PATH, classText('OtherClass'));

        const after = services.shared.workspace.LangiumDocuments.getDocument(uriOf(PROG_PATH))!;
        expect(erroringRefTexts(after)).toEqual([]);
        expect(linkingDiagnostics(after)).toEqual([]);
        expect(wasValidated(PROG_PATH)).toBe(true);
    });
});

describe('an inline file-qualified class reference', () => {
    test('relinks and revalidates once the named file appears', async () => {
        const decl = await openAndBuild(DECLARE_PATH, DECLARE_TEXT);
        const broken = erroringRefTexts(decl);
        expect(broken.some(text => text.startsWith('::lib/OtherClass.bbj::'))).toBe(true);
        validated.length = 0;

        await appearOnDisk(OTHER_PATH, classText('OtherClass'));

        const after = services.shared.workspace.LangiumDocuments.getDocument(uriOf(DECLARE_PATH))!;
        expect(erroringRefTexts(after)).toEqual([]);
        expect(wasValidated(DECLARE_PATH)).toBe(true);
    });
});

describe('a document that names a different missing file', () => {
    test('is neither relinked nor revalidated when an unrelated file appears', async () => {
        const unrelated = await openAndBuild(UNRELATED_PATH, UNRELATED_TEXT);
        const before = erroringRefTexts(unrelated);
        expect(before.length).toBeGreaterThan(0);
        validated.length = 0;

        await appearOnDisk(OTHER_PATH, classText('OtherClass'));

        const after = services.shared.workspace.LangiumDocuments.getDocument(uriOf(UNRELATED_PATH))!;
        expect(erroringRefTexts(after)).toEqual(before);
        expect(wasValidated(UNRELATED_PATH)).toBe(false);
        // sanity: the walk above visited real references
        expect(AstUtils.streamAllContents(after.parseResult.value).count()).toBeGreaterThan(0);
    });
});

describe('editing the USE statements of an open program', () => {
    const progWithUse = (path: string) => PROG_TEXT.replace('::lib/OtherClass.bbj::', `::${path}::`);

    /** Applies an editor change to an already open document and rebuilds it, as on didChange. */
    async function editAndBuild(path: string, text: string, version: number): Promise<LangiumDocument> {
        textDocuments.set(TextDocument.create(uriOf(path).toString(), 'bbj', version, text));
        await builder.update([uriOf(path)], []);
        return services.shared.workspace.LangiumDocuments.getDocument(uriOf(path))!;
    }

    test('correcting the USE path links the bare class name without a reload', async () => {
        await appearOnDisk(OTHER_PATH, classText('OtherClass'));
        const prog = await openAndBuild(PROG_PATH, progWithUse('lib/OtherClas.bbj'));
        expect(erroringRefTexts(prog)).toContain('OtherClass');

        const after = await editAndBuild(PROG_PATH, progWithUse('lib/OtherClass.bbj'), 2);

        expect(erroringRefTexts(after)).toEqual([]);
        expect(linkingDiagnostics(after)).toEqual([]);
    });

    test('removing the USE statement unlinks the bare class name', async () => {
        await appearOnDisk(OTHER_PATH, classText('OtherClass'));
        const prog = await openAndBuild(PROG_PATH, PROG_TEXT);
        expect(erroringRefTexts(prog)).toEqual([]);

        const after = await editAndBuild(PROG_PATH, PROG_TEXT.replace('use ::lib/OtherClass.bbj::OtherClass\n', ''), 2);

        expect(erroringRefTexts(after)).toContain('OtherClass');
    });
});
