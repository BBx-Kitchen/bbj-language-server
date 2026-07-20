import { EmptyFileSystem, URI, LangiumDocument } from 'langium';
import { DocumentValidator } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { parseHelper } from 'langium/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WorkspaceFolder } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module';
import { createBBjServices } from '../src/language/bbj-module';
import { BBjWorkspaceManager, ConfigUseDocUri, collectConfigUseStatements } from '../src/language/bbj-ws-manager';
import { Model } from '../src/language/generated/ast';

/**
 * Issue #83: USE statements in config.bbx act as project-wide imports for every
 * BBj program (on by default; bbj.configUseStatements.enabled is the opt-out).
 * The workspace manager materializes them as a synthetic program at ConfigUseDocUri;
 * the scope provider merges its USE statements into every program's imports.
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
        // when config.bbx contains USE lines (and the feature is not opted out).
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

describe('Without the config USE document (opted out or no config USEs)', () => {
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

/**
 * End-to-end on the real file system: config.bbx read from a custom configPath,
 * USE with an ABSOLUTE path to a class file that lives OUTSIDE the workspace
 * (e.g. `use ::/Users/x/bbx/plugins/BBjGridExWidget/BBjGridExWidget.bbj::BBjGridExWidget`).
 * Exercises the whole chain: config parsing, synthetic document creation, external
 * document loading by the document builder, and scope injection.
 */
describe('config.bbx USE with absolute path, real file system (#83)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-config-use-'));
    const wsDir = path.join(tmp, 'workspace');
    const pluginDir = path.join(tmp, 'plugins', 'BBjGridExWidget');
    const widgetFile = path.join(pluginDir, 'BBjGridExWidget.bbj');

    const services = createBBjServices(NodeFileSystem);
    const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;

    beforeAll(async () => {
        fs.mkdirSync(wsDir, { recursive: true });
        fs.mkdirSync(pluginDir, { recursive: true });
        fs.mkdirSync(path.join(tmp, 'cfg'), { recursive: true });

        fs.writeFileSync(widgetFile,
            'class public BBjGridExWidget\n    method public void render()\n    methodend\nclassend\n');
        fs.writeFileSync(path.join(tmp, 'cfg', 'config.bbx'),
            `PREFIX "${pluginDir}/"\nuse ::${widgetFile}::BBjGridExWidget\n`);
        fs.writeFileSync(path.join(wsDir, 'main.bbj'),
            'x! = new BBjGridExWidget()\nx!.render()\n');

        wsManager.setConfigPath(path.join(tmp, 'cfg', 'config.bbx'));
        // no flag needed: project-wide USE statements from config.bbx are on by default

        // may take a while when a Java interop service is probed but unreachable
        await wsManager.initializeWorkspace([{ uri: URI.file(wsDir).toString(), name: 'ws' }]);
    }, 120_000);

    test('class from config.bbx USE resolves in a workspace program', async () => {
        const mainUri = URI.file(path.join(wsDir, 'main.bbj'));
        const doc = services.shared.workspace.LangiumDocuments.getDocument(mainUri);
        expect(doc, 'main.bbj should be loaded by workspace init').toBeTruthy();
        await services.shared.workspace.DocumentBuilder.build([doc!], { validation: true });
        expect(linkingErrors(doc!).map(d => d.message).join('\n')).toBe('');
    }, 60_000);
});
