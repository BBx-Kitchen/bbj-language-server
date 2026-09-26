import { URI } from 'langium';
import { FileSystemNode, FileSystemProvider } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';

/**
 * A USE path that resolves outside every configured PREFIX root must never reach
 * `fsProvider.readFile` (issue #526), and the same escaping candidate must not resolve through
 * the scope or the USE-file validator either. Coverage is split into a document-builder spy
 * test (below) and a scope/validator test (Task 2).
 */

const LIB_DIR = '/virtual/lib';
const SECRET_DIR = '/virtual/secret';

const usedUri = URI.file(`${LIB_DIR}/Used.bbj`);
const absUri = URI.file(`${LIB_DIR}/Abs.bbj`);
const outsideUri = URI.file(`${SECRET_DIR}/Outside.bbj`);
const otherUri = URI.file(`${SECRET_DIR}/Other.bbj`);
const transitiveUri = URI.file(`${SECRET_DIR}/Transitive.bbj`);

const files = new Map<string, string>([
    [usedUri.fsPath, `class public UsedClass\n    use ::../secret/Transitive.bbj::TransitiveClass\nclassend`],
    [absUri.fsPath, `class public AbsClass\nclassend`],
    [outsideUri.fsPath, `class public Outside\nclassend`],
    [otherUri.fsPath, `class public Other\nclassend`],
    [transitiveUri.fsPath, `class public TransitiveClass\nclassend`],
]);

/** Spy FileSystemProvider: records every `uri.fsPath` a read was attempted against. */
class SpyFileSystemProvider implements FileSystemProvider {
    readonly readFileTargets: string[] = [];

    private node(uri: URI, isFile: boolean): FileSystemNode {
        return { isFile, isDirectory: !isFile, uri };
    }
    async stat(uri: URI): Promise<FileSystemNode> { return this.statSync(uri); }
    statSync(uri: URI): FileSystemNode {
        if (files.has(uri.fsPath)) return this.node(uri, true);
        throw new Error(`ENOENT: ${uri.fsPath}`);
    }
    async exists(uri: URI): Promise<boolean> { return files.has(uri.fsPath); }
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        this.readFileTargets.push(uri.fsPath);
        const content = files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    async readDirectory(uri: URI): Promise<FileSystemNode[]> { return this.readDirectorySync(uri); }
    readDirectorySync(): FileSystemNode[] { return []; }
}

describe('the document builder reads only contained PREFIX candidates (issue #526)', () => {
    const spyFs = new SpyFileSystemProvider();
    const services = createBBjServices({ fileSystemProvider: () => spyFs });

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes: [LIB_DIR], classpath: [] };
    });

    test('a relative escape, an absolute-outside path and a transitive escape are never opened; in-root imports still load', async () => {
        const parse = parseHelper<Model>(services.BBj);
        await parse(
            [
                'use ::Used.bbj::UsedClass',
                'use ::../secret/Outside.bbj::Outside',
                'use ::/virtual/secret/Other.bbj::Other',
                'use ::/virtual/lib/Abs.bbj::AbsClass',
                'x! = new UsedClass()',
            ].join('\n'),
            {
                documentUri: 'file:///virtual/project/main.bbj',
                validation: false,
            }
        );

        // Assert on the recorded read targets, not only on the resulting documents — a
        // regression that read the file but discarded the parsed document would otherwise
        // pass silently.
        const openedUnderVirtual = new Set(spyFs.readFileTargets.filter(p => p.startsWith('/virtual')));
        expect(openedUnderVirtual).toEqual(new Set([usedUri.fsPath, absUri.fsPath]));

        const docs = services.shared.workspace.LangiumDocuments;
        expect(docs.hasDocument(usedUri), 'Used.bbj should be loaded').toBe(true);
        expect(docs.hasDocument(absUri), 'Abs.bbj should be loaded').toBe(true);
        expect(docs.hasDocument(outsideUri), 'Outside.bbj must not be loaded').toBe(false);
        expect(docs.hasDocument(otherUri), 'Other.bbj must not be loaded').toBe(false);
        expect(docs.hasDocument(transitiveUri), 'Transitive.bbj (a transitive escape from Used.bbj) must not be loaded').toBe(false);
    });
});
