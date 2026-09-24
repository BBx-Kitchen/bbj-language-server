import { URI } from 'langium';
import { FileSystemNode, FileSystemProvider } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { BBjServiceRegistry } from '../src/language/bbj-service-registry';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager';
import { Model } from '../src/language/generated/ast';

/**
 * Regression harness for #688: a USE statement whose PREFIX target has no file extension
 * (`use ::PGM/UTILS/SomeUtility::SomeUtility`) crashed the language server with
 * "The service registry contains no services for the extension ''".
 */

const LIB_DIR = '/virtual/lib';
const utilityUri = URI.file(`${LIB_DIR}/PGM/UTILS/SomeUtility`);
const helperUri = URI.file(`${LIB_DIR}/PGM/UTILS/Helper`);

// SomeUtility pulls in Helper, also extensionless, so the transitive load is covered too.
const files = new Map<string, string>([
    [utilityUri.fsPath, `use ::PGM/UTILS/Helper::Helper\nclass public SomeUtility\n    method public static BBjNumber answer()\n        methodret 42\n    methodend\nclassend`],
    [helperUri.fsPath, `class public Helper\nclassend`],
]);

class InMemoryFileSystemProvider implements FileSystemProvider {
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
        const content = files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    async readDirectory(): Promise<FileSystemNode[]> { return []; }
    readDirectorySync(): FileSystemNode[] { return []; }
}

const services = createBBjServices({ fileSystemProvider: () => new InMemoryFileSystemProvider() });

describe('USE target without a file extension (#688)', () => {
    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes: [LIB_DIR], classpath: [] };
    });

    test('loads and links an extensionless PREFIX program instead of crashing', async () => {
        const parse = parseHelper<Model>(services.BBj);
        const document = await parse(
            `use ::PGM/UTILS/SomeUtility::SomeUtility\nx = SomeUtility.answer()`,
            { documentUri: 'file:///virtual/project/main.bbj', validation: true }
        );

        const docs = services.shared.workspace.LangiumDocuments;
        expect(docs.hasDocument(utilityUri)).toBe(true);
        expect(docs.hasDocument(helperUri)).toBe(true);
        const unresolved = (document.diagnostics ?? []).filter(d => /could not be resolved|Could not resolve/i.test(d.message));
        expect(unresolved.map(d => d.message)).toEqual([]);
    });

    test('other extensionless files still have no BBj services', () => {
        const registry = services.shared.ServiceRegistry;
        expect(registry).toBeInstanceOf(BBjServiceRegistry);
        expect(registry.hasServices(URI.file('/virtual/project/LICENSE'))).toBe(false);
        expect(registry.hasServices(URI.file('/virtual/project/.gitignore'))).toBe(false);
    });
});
