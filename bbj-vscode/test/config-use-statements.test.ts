import { EmptyFileSystem, URI, LangiumDocument } from 'langium';
import { DocumentValidator } from 'langium';
import { parseHelper } from 'langium/test';
import { WorkspaceFolder } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module';
import { BBjWorkspaceManager, ConfigUseDocUri, collectConfigUseStatements } from '../src/language/bbj-ws-manager';
import { Model } from '../src/language/generated/ast';

/**
 * Issue #83: USE statements in config.bbx act as project-wide imports for every
 * BBj program (opt-in via bbj.configUseStatements.enabled). The workspace manager
 * materializes them as a synthetic program at ConfigUseDocUri; the scope provider
 * merges its USE statements into every program's imports.
 */

function linkingErrors(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
}

describe('collectConfigUseStatements', () => {
    test('extracts USE lines, ignoring other config.bbx entries', () => {
        const uses = collectConfigUseStatements([
            'PREFIX "/some/dir/" "/other/dir/"',
            'SETOPTS 00000000',
            'USE ::lib/MyClass.bbj::MyClass',
            'USE java.util.HashMap',
            'USERTRIGGERS abc',
        ].join('\n'));
        expect(uses).toEqual(['::lib/MyClass.bbj::MyClass', 'java.util.HashMap']);
    });

    test('is case-insensitive, trims CRLF/whitespace and deduplicates', () => {
        const uses = collectConfigUseStatements('  use java.util.HashMap  \r\nUSE java.util.HashMap\r\nUse ::a.bbj::A\r\n');
        expect(uses).toEqual(['java.util.HashMap', '::a.bbj::A']);
    });

    test('returns empty list for content without USE lines', () => {
        expect(collectConfigUseStatements('PREFIX "/some/dir/"\n')).toEqual([]);
        expect(collectConfigUseStatements('')).toEqual([]);
    });
});

describe('Project-wide USE statements from config.bbx (#83)', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        // Simulate an open workspace rooted at /root (initializeWorkspace([]) leaves folders
        // empty in this harness, so set it directly).
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [{ uri: URI.file('/root').toString(), name: 'root' }];
        (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;

        // Target class lives at <root>/lib/MyClass.bbj
        await parse(`class public MyClass\n    method public void doWork()\n    methodend\nclassend`, {
            documentUri: URI.file('/root/lib/MyClass.bbj').toString(),
            validation: false,
        });

        // Simulate the synthetic program BBjWorkspaceManager.loadAdditionalDocuments creates
        // when bbj.configUseStatements.enabled is set and config.bbx contains USE lines.
        await parse(`use ::lib/MyClass.bbj::MyClass\nuse java.util.HashMap`, {
            documentUri: ConfigUseDocUri,
            validation: false,
        });
    });

    test('BBj class from config USE links without a local USE statement', async () => {
        const consumer = await parse(`x! = new MyClass()\nx!.doWork()`, {
            documentUri: URI.file('/root/app/main.bbj').toString(),
            validation: true,
        });
        expect(consumer.parseResult.parserErrors).toHaveLength(0);
        expect(linkingErrors(consumer).map(d => d.message).join('\n')).toBe('');
    });

    test('Java class from config USE links without a local USE statement', async () => {
        const consumer = await parse(`h! = new HashMap()\nh!.put("key", "value")`, {
            documentUri: URI.file('/root/app/java-consumer.bbj').toString(),
            validation: true,
        });
        expect(consumer.parseResult.parserErrors).toHaveLength(0);
        expect(linkingErrors(consumer).map(d => d.message).join('\n')).toBe('');
    });
});

describe('Without the config USE document (flag off)', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [{ uri: URI.file('/root').toString(), name: 'root' }];
        (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;

        await parse(`class public MyClass\n    method public void doWork()\n    methodend\nclassend`, {
            documentUri: URI.file('/root/lib/MyClass.bbj').toString(),
            validation: false,
        });
    });

    test('class in another file does not resolve without a USE statement', async () => {
        const consumer = await parse(`x! = new MyClass()`, {
            documentUri: URI.file('/root/app/main.bbj').toString(),
            validation: true,
        });
        expect(linkingErrors(consumer).length).toBeGreaterThan(0);
    });
});
