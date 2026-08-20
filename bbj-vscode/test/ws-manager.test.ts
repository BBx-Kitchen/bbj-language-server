import type { FileSystemNode, FileSystemProvider } from 'langium';
import { URI } from 'langium';
import { WorkspaceFolder } from 'vscode-languageserver';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { logger } from '../src/language/logger.js';

/**
 * Regression harness for RU-61-05's workspace-lifecycle findings against
 * `BBjWorkspaceManager.initializeWorkspace()`. Uses `createBBjTestServices` (not
 * `createBBjServices`) so `JavaInteropService.loadClasspath`/`loadImplicitImports` are
 * the fast, hermetic test doubles from `bbj-test-module.ts` rather than reaching for the
 * real java-interop socket on :5008 (per P61-D5-013's own cost-profile trace, that path
 * carries a real multi-second connect timeout — undesirable in a unit test).
 */

/** Minimal in-memory FileSystemProvider: a flat file map, one-level (non-recursive) readDirectory. */
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
    existsSync(uri: URI): boolean { return this.files.has(uri.fsPath); }
    async readBinary(): Promise<Uint8Array> { throw new Error('not implemented'); }
    readBinarySync(): Uint8Array { throw new Error('not implemented'); }
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        const content = this.files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    async readDirectory(uri: URI): Promise<FileSystemNode[]> { return this.readDirectorySync(uri); }
    readDirectorySync(uri: URI): FileSystemNode[] {
        const dirPath = uri.fsPath.endsWith('/') ? uri.fsPath : `${uri.fsPath}/`;
        return [...this.files.keys()]
            .filter(p => p.startsWith(dirPath) && !p.slice(dirPath.length).includes('/'))
            .map(p => this.node(URI.file(p), true));
    }
}

/** A FileSystemProvider whose readDirectory always throws, simulating a setup-time failure. */
class ThrowingFileSystemProvider implements FileSystemProvider {
    async stat(): Promise<FileSystemNode> { throw new Error('not implemented'); }
    statSync(): FileSystemNode { throw new Error('not implemented'); }
    async exists(): Promise<boolean> { return false; }
    existsSync(): boolean { return false; }
    async readBinary(): Promise<Uint8Array> { throw new Error('not implemented'); }
    readBinarySync(): Uint8Array { throw new Error('not implemented'); }
    async readFile(): Promise<string> { throw new Error('not implemented'); }
    readFileSync(): string { throw new Error('not implemented'); }
    async readDirectory(): Promise<FileSystemNode[]> {
        throw new Error('simulated project.properties read failure');
    }
    readDirectorySync(): FileSystemNode[] {
        throw new Error('simulated project.properties read failure');
    }
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('multi-folder workspace merges prefixes and classpath from every folder (P61-D2-015, #33)', () => {
    test('prefixes and classpath from both folders are present, not only the first', async () => {
        const files = new Map<string, string>([
            ['/root-a/project.properties', 'classpath=/cp-a.jar\nPREFIX="/prefix-a/"\n'],
            ['/root-b/project.properties', 'classpath=/cp-b.jar\nPREFIX="/prefix-b/"\n'],
        ]);
        const services = createBBjTestServices({ fileSystemProvider: () => new InMemoryFileSystemProvider(files) });
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [
            { uri: URI.file('/root-a').toString(), name: 'root-a' },
            { uri: URI.file('/root-b').toString(), name: 'root-b' },
        ];

        await wsManager.initializeWorkspace(folders);

        const settings = wsManager.getSettings();
        expect(settings?.prefixes).toContain('/prefix-a/');
        expect(settings?.prefixes).toContain('/prefix-b/');
        expect(settings?.classpath).toContain('/cp-a.jar');
        expect(settings?.classpath).toContain('/cp-b.jar');
    });

    test('single-folder workspace still resolves exactly that folder\'s settings (no regression)', async () => {
        const files = new Map<string, string>([
            ['/root-single/project.properties', 'classpath=/cp-single.jar\nPREFIX="/prefix-single/"\n'],
        ]);
        const services = createBBjTestServices({ fileSystemProvider: () => new InMemoryFileSystemProvider(files) });
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [
            { uri: URI.file('/root-single').toString(), name: 'root-single' },
        ];

        await wsManager.initializeWorkspace(folders);

        const settings = wsManager.getSettings();
        expect(settings?.prefixes).toEqual(['/prefix-single/']);
        expect(settings?.classpath).toEqual(['/cp-single.jar']);
    });
});

describe('a workspace setup failure is surfaced, not silently swallowed (P61-D2-016)', () => {
    test('a throw inside initializeWorkspace reaches logger.error', async () => {
        const services = createBBjTestServices({ fileSystemProvider: () => new ThrowingFileSystemProvider() });
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        const folders: WorkspaceFolder[] = [
            { uri: URI.file('/root-fail').toString(), name: 'root-fail' },
        ];
        await wsManager.initializeWorkspace(folders);

        expect(errorSpy).toHaveBeenCalled();
    });
});
