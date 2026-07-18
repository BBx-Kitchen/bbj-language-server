import { CancellationToken, URI } from 'langium';
import { FileSystemNode, FileSystemProvider } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager';
import { Model } from '../src/language/generated/ast';

/**
 * Regression harness for #32: the language server must NOT eagerly scan/load every
 * file under a PREFIX directory. It should lazily load only the files that are
 * actually referenced by a `use ::file.bbj::Class` statement (and their transitive
 * USE dependencies). A regression to full-directory scanning would load unreferenced
 * files too, which this test detects.
 */

const LIB_DIR = '/virtual/lib';
const usedUri = URI.file(`${LIB_DIR}/Used.bbj`);
const unusedUri = URI.file(`${LIB_DIR}/Unused.bbj`);
const transitiveUri = URI.file(`${LIB_DIR}/Transitive.bbj`);

// Minimal in-memory FS holding three PREFIX files. `Used.bbj` pulls in `Transitive.bbj`
// via USE; `Unused.bbj` is referenced by nobody. readDirectory lists all three, so an
// eager-scan regression would have everything it needs to (wrongly) load Unused.bbj.
const files = new Map<string, string>([
    [usedUri.fsPath, `class public UsedClass\n    use ::Transitive.bbj::TransitiveClass\nclassend`],
    [unusedUri.fsPath, `class public UnusedClass\nclassend`],
    [transitiveUri.fsPath, `class public TransitiveClass\nclassend`],
]);

class InMemoryFileSystemProvider implements FileSystemProvider {
    private node(uri: URI, isFile: boolean): FileSystemNode {
        return { isFile, isDirectory: !isFile, uri };
    }
    async stat(uri: URI): Promise<FileSystemNode> { return this.statSync(uri); }
    statSync(uri: URI): FileSystemNode {
        if (files.has(uri.fsPath)) return this.node(uri, true);
        if (uri.fsPath === LIB_DIR) return this.node(uri, false);
        throw new Error(`ENOENT: ${uri.fsPath}`);
    }
    async exists(uri: URI): Promise<boolean> { return files.has(uri.fsPath) || uri.fsPath === LIB_DIR; }
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        const content = files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    async readDirectory(uri: URI): Promise<FileSystemNode[]> { return this.readDirectorySync(uri); }
    readDirectorySync(uri: URI): FileSystemNode[] {
        if (uri.fsPath !== LIB_DIR) return [];
        return [...files.keys()].map(p => this.node(URI.file(p), true));
    }
}

const services = createBBjServices({ fileSystemProvider: () => new InMemoryFileSystemProvider() });

describe('Lazy PREFIX loading (#32)', () => {
    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        // Point PREFIX resolution at our in-memory lib dir (initializeWorkspace has no
        // config.bbx/project.properties to read here, so we set it directly).
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes: [LIB_DIR], classpath: [] };
    });

    test('only USE-referenced PREFIX files (and their transitive deps) are loaded', async () => {
        const parse = parseHelper<Model>(services.BBj);
        // Main workspace program references Used.bbj only.
        await parse(`use ::Used.bbj::UsedClass\nx! = new UsedClass()`, {
            documentUri: 'file:///virtual/project/main.bbj',
            validation: false,
        });

        const docs = services.shared.workspace.LangiumDocuments;
        // Referenced file is loaded on demand...
        expect(docs.hasDocument(usedUri), 'Used.bbj should be lazily loaded').toBe(true);
        // ...its transitive USE dependency is followed...
        expect(docs.hasDocument(transitiveUri), 'Transitive.bbj (used by Used.bbj) should be loaded').toBe(true);
        // ...but the unreferenced file in the same PREFIX dir must NOT be loaded.
        expect(docs.hasDocument(unusedUri), 'Unused.bbj must NOT be eagerly loaded').toBe(false);
    });
});
