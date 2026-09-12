import { AstNode, AstNodeDescription, FileSystemNode, FileSystemProvider, LangiumDocument, Stream, URI } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { findFirst } from './test-helper.js';
import { BBjIndexManager } from '../src/language/bbj-index-manager.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { BbjClass, isUse, Model, Use } from '../src/language/generated/ast.js';

/**
 * Regression harness for #505: `::file::Class` scope lookups and PREFIX-document symbol
 * collection must not scale with total workspace size. See bbj-index-manager.ts
 * (path-keyed class index) and bbj-scope-local.ts (linker-mirrored member pruning).
 */

class InMemoryFileSystemProvider implements FileSystemProvider {
    constructor(private readonly files: Map<string, string>) { }
    private node(uri: URI, isFile: boolean): FileSystemNode {
        return { isFile, isDirectory: !isFile, uri };
    }
    async stat(uri: URI): Promise<FileSystemNode> { return this.statSync(uri); }
    statSync(uri: URI): FileSystemNode {
        return this.node(uri, this.files.has(uri.fsPath));
    }
    async exists(uri: URI): Promise<boolean> { return this.files.has(uri.fsPath); }
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        const content = this.files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    async readDirectory(): Promise<FileSystemNode[]> { return []; }
    readDirectorySync(): FileSystemNode[] { return []; }
}

type TestServices = ReturnType<typeof createBBjTestServices>;

interface WorkspaceHandle {
    services: TestServices;
    files: Map<string, string>;
    mainDoc: LangiumDocument<Model>;
}

interface WorkspaceOptions {
    prefixes?: string[];
    mainDir?: string;
    mainText?: string;
}

/** Builds a fresh in-memory workspace with `fileCount` library classes plus a main document. */
async function createWorkspace(fileCount: number, options: WorkspaceOptions = {}): Promise<WorkspaceHandle> {
    const files = new Map<string, string>();
    const services = createBBjTestServices({ fileSystemProvider: () => new InMemoryFileSystemProvider(files) });
    await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
        { prefixes: options.prefixes ?? [], classpath: [] };

    const mainDir = options.mainDir ?? '/virtual/project';
    const parse = parseHelper<Model>(services.BBj);

    for (let i = 0; i < fileCount; i++) {
        const uri = `file://${mainDir}/lib/C${i}.bbj`;
        const text = `class public C${i}\nclassend`;
        files.set(URI.parse(uri).fsPath, text);
        await parse(text, { documentUri: uri, validation: false });
    }

    const mainText = options.mainText ?? 'use ::lib/C0.bbj::C0';
    const mainUri = `file://${mainDir}/main.bbj`;
    files.set(URI.parse(mainUri).fsPath, mainText);
    const mainDoc = await parse(mainText, { documentUri: mainUri, validation: false });

    return { services, files, mainDoc };
}

function findUseNode(doc: LangiumDocument<Model>): Use {
    const use = findFirst(doc, isUse, true);
    if (!use) {
        throw new Error('No Use node found in document');
    }
    return use;
}

function lookupScope(services: TestServices, use: Use): AstNodeDescription[] {
    const scope = services.BBj.references.ScopeProvider.getScope({
        container: use,
        property: 'bbjClass',
        reference: use.bbjClass!,
    });
    return scope.getAllElements().toArray();
}

/** Parses and adds one more document to an already-built workspace, at an absolute path. */
async function parseExtraFile(handle: WorkspaceHandle, absolutePath: string, text: string): Promise<LangiumDocument<Model>> {
    const uri = `file://${absolutePath}`;
    handle.files.set(URI.parse(uri).fsPath, text);
    const parse = parseHelper<Model>(handle.services.BBj);
    return await parse(text, { documentUri: uri, validation: false });
}

/**
 * Invokes `BbjScopeProvider`'s private `getBBjClassesFromFile` directly (via cast), scoped
 * to `handle.mainDoc`'s directory/prefixes, without needing a linked `Use` reference node.
 */
function lookupClassesForPath(handle: WorkspaceHandle, bbjFilePath: string, simpleName = true): AstNodeDescription[] {
    const scopeProvider = handle.services.BBj.references.ScopeProvider as unknown as {
        getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean): { getAllElements(): Stream<AstNodeDescription> };
    };
    const container = handle.mainDoc.parseResult.value;
    return scopeProvider.getBBjClassesFromFile(container, bbjFilePath, simpleName).getAllElements().toArray();
}

/**
 * Runs `run` while counting every BbjClass description the shared IndexManager streams
 * or returns, whether through the (pre-#505) full-scan `allElements` or the (post-#505)
 * path-keyed `getBBjClassesForFiles`. Works before and after the production change: the
 * `getBBjClassesForFiles` spy is only installed if the method actually exists.
 */
function measureLookup(indexManager: BBjIndexManager, run: () => AstNodeDescription[]): { result: AstNodeDescription[]; examined: number } {
    let examined = 0;

    const originalAllElements = indexManager.allElements.bind(indexManager);
    const allElementsSpy = vi.spyOn(indexManager, 'allElements').mockImplementation((nodeType?: string, uris?: Set<string>) => {
        return originalAllElements(nodeType, uris).map(d => {
            if (d.type === BbjClass.$type) {
                examined++;
            }
            return d;
        });
    });

    type WithMaybeGetFiles = { getBBjClassesForFiles?: (fileUris: URI[]) => AstNodeDescription[] };
    const maybeGetFiles = (indexManager as unknown as WithMaybeGetFiles).getBBjClassesForFiles;
    let getFilesSpy: ReturnType<typeof vi.spyOn> | undefined;
    if (typeof maybeGetFiles === 'function') {
        const originalGetFiles = maybeGetFiles.bind(indexManager);
        getFilesSpy = vi.spyOn(indexManager as unknown as Required<WithMaybeGetFiles>, 'getBBjClassesForFiles')
            .mockImplementation((fileUris: URI[]) => {
                const result = originalGetFiles(fileUris);
                examined += result.length;
                return result;
            });
    }

    try {
        const result = run();
        return { result, examined };
    } finally {
        allElementsSpy.mockRestore();
        getFilesSpy?.mockRestore();
    }
}

describe('scope lookup cost does not grow with workspace size (#505)', () => {
    let small: WorkspaceHandle;
    let large: WorkspaceHandle;

    beforeAll(async () => {
        small = await createWorkspace(10);
        large = await createWorkspace(250);
    }, 120000);

    test('a ::file::Class lookup examines the same number of index elements regardless of workspace size', () => {
        const smallIndexManager = small.services.shared.workspace.IndexManager as BBjIndexManager;
        const largeIndexManager = large.services.shared.workspace.IndexManager as BBjIndexManager;
        const smallUse = findUseNode(small.mainDoc);
        const largeUse = findUseNode(large.mainDoc);

        const smallMeasured = measureLookup(smallIndexManager, () => lookupScope(small.services, smallUse));
        const largeMeasured = measureLookup(largeIndexManager, () => lookupScope(large.services, largeUse));

        expect(smallMeasured.result.map(d => d.name)).toEqual(['C0']);
        expect(largeMeasured.result.map(d => d.name)).toEqual(['C0']);
        expect(largeMeasured.examined).toEqual(smallMeasured.examined);
        expect(largeMeasured.examined).toBeLessThan(10);
    });

    test('lookup wall time stays within a generous ratio as the workspace grows', () => {
        const smallUse = findUseNode(small.mainDoc);
        const largeUse = findUseNode(large.mainDoc);
        const ROUNDS = 3;
        const ITERATIONS = 2000;

        const timeRounds = (services: TestServices, use: Use) => {
            const timings: number[] = [];
            for (let r = 0; r < ROUNDS; r++) {
                const start = performance.now();
                for (let i = 0; i < ITERATIONS; i++) {
                    lookupScope(services, use);
                }
                timings.push(performance.now() - start);
            }
            return Math.min(...timings);
        };

        const smallMs = timeRounds(small.services, smallUse);
        const largeMs = timeRounds(large.services, largeUse);

        expect(largeMs).toBeLessThanOrEqual(Math.max(smallMs * 8, smallMs + 150));
    }, 60000);
});

describe('path-keyed class index stays correct (#505)', () => {
    test('a changed file is visible to the next lookup', async () => {
        const handle = await createWorkspace(3);
        const c1Uri = URI.parse('file:///virtual/project/lib/C1.bbj');
        const renamedDoc = handle.services.shared.workspace.LangiumDocumentFactory
            .fromString<Model>('class public C1Renamed\nclassend', c1Uri);
        await handle.services.shared.workspace.IndexManager.updateContent(renamedDoc);

        const result = lookupClassesForPath(handle, 'lib/C1.bbj');
        expect(result.map(d => d.name)).toEqual(['C1Renamed']);
    });

    test('a removed file drops out and an added file appears', async () => {
        const handle = await createWorkspace(3);
        const c1Uri = URI.parse('file:///virtual/project/lib/C1.bbj');

        handle.services.shared.workspace.IndexManager.remove(c1Uri);
        expect(lookupClassesForPath(handle, 'lib/C1.bbj')).toEqual([]);

        await parseExtraFile(handle, '/virtual/project/lib/Added.bbj', 'class public Added\nclassend');
        const added = lookupClassesForPath(handle, 'lib/Added.bbj');
        expect(added.map(d => d.name)).toEqual(['Added']);
    });

    test('candidates naming the same file count it once', async () => {
        const handle = await createWorkspace(2, { prefixes: ['/virtual/project'] });

        const result = lookupClassesForPath(handle, 'lib/C0.bbj');
        expect(result.map(d => d.name)).toEqual(['C0']);
    });

    test('a missing file or a class-less file yields nothing', async () => {
        const handle = await createWorkspace(1);
        expect(lookupClassesForPath(handle, 'lib/Missing.bbj')).toEqual([]);

        await parseExtraFile(handle, '/virtual/project/lib/Empty.bbj', 'x = 1');
        expect(lookupClassesForPath(handle, 'lib/Empty.bbj')).toEqual([]);
    });

    test('case differences in the path still match', async () => {
        const handle = await createWorkspace(1);
        const result = lookupClassesForPath(handle, 'LIB/C0.BBJ');
        expect(result.map(d => d.name)).toEqual(['C0']);
    });

    test('same-named classes from two candidate files keep the index order', async () => {
        const handle = await createWorkspace(0, { prefixes: ['/virtual/prefix'] });

        // Parsed in this order: the prefix document first, then the project document.
        // Candidate order (current directory, then workspace roots, then prefixes) would
        // put the project document first — the index must use insertion order instead.
        const prefixDup = await parseExtraFile(handle, '/virtual/prefix/Dup.bbj', 'class public Dup\nclassend');
        const projectDup = await parseExtraFile(handle, '/virtual/project/Dup.bbj', 'class public Dup\nclassend');

        const result = lookupClassesForPath(handle, 'Dup.bbj');
        expect(result.map(d => d.documentUri.toString())).toEqual([
            prefixDup.uri.toString(),
            projectDup.uri.toString(),
        ]);
    });

    test('::path::Name lookups still rename descriptions', async () => {
        const handle = await createWorkspace(1);
        const result = lookupClassesForPath(handle, 'lib/C0.bbj', false);
        expect(result.map(d => d.name)).toEqual(['::lib/C0.bbj::C0']);
    });
});
