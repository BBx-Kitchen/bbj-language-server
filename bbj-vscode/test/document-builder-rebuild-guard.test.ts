import { BuildOptions, EmptyFileSystem, LangiumDocument, URI } from 'langium';
import { parseHelper } from 'langium/test';
import { CancellationToken } from 'vscode-jsonrpc';
import { WorkspaceFolder } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';

/**
 * Coverage for the cascading-rebuild half of b25dad4 (#232, #492).
 *
 * Langium's default `shouldRelink` returns true for any document carrying a reference
 * error. Combined with transitive USE resolution that produced the loop phase 26
 * identified: buildDocuments -> addImportedBBjDocuments -> update -> shouldRelink
 * (every document with unresolved references) -> buildDocuments -> ... In a workspace
 * with several projects, enough documents have unresolved references for that to
 * become a permanent rebuild storm.
 *
 * Two guards were added and neither was pinned by a test: the `shouldRelink` override
 * that defers to `indexManager.isAffected` outside the import flow, and the
 * `isImportingBBjDocuments` flag that stops `buildDocuments` from re-entering import
 * resolution.
 */

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

/** The members under test are protected/private by design; reach them explicitly. */
interface BuilderInternals {
    shouldRelink(document: LangiumDocument, changedUris: Set<string>): boolean;
    buildDocuments(documents: LangiumDocument[], options: BuildOptions, cancelToken: CancellationToken): Promise<void>;
    addImportedBBjDocuments(documents: LangiumDocument[], options: BuildOptions, cancelToken: CancellationToken): Promise<void>;
    runBbjcplForDocuments(documents: LangiumDocument[], cancelToken: CancellationToken): Promise<void>;
    isImportingBBjDocuments: boolean;
}

const PROVIDER_URI = URI.file('/root/lib/MyClass.bbj');
const CONSUMER_URI = URI.file('/root/app/main.bbj');
const BROKEN_URI = URI.file('/root/app/broken.bbj');
const UNRELATED_URI = URI.file('/root/app/unrelated.bbj');

let builder: BBjDocumentBuilder;
let internals: BuilderInternals;
let consumer: LangiumDocument;
let broken: LangiumDocument;

describe('rebuild guards (#232)', () => {
    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [{ uri: URI.file('/root').toString(), name: 'root' }];
        (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;

        builder = services.shared.workspace.DocumentBuilder as BBjDocumentBuilder;
        expect(builder).toBeInstanceOf(BBjDocumentBuilder);
        internals = builder as unknown as BuilderInternals;

        await parse('class public MyClass\n    method public void doWork()\n    methodend\nclassend', {
            documentUri: PROVIDER_URI.toString(),
            validation: false
        });
        // Resolves against the provider, so the index records a real dependency.
        consumer = await parse('use ::lib/MyClass.bbj::MyClass\n\nx! = new MyClass()\nx!.doWork()', {
            documentUri: CONSUMER_URI.toString(),
            validation: true
        });
        // Unresolvable reference, and no dependency on anything that changes below.
        broken = await parse('use ::lib/Missing.bbj::Missing\n\ny! = new Missing()', {
            documentUri: BROKEN_URI.toString(),
            validation: true
        });
    });

    test('the fixture documents are in the states the guards care about', () => {
        expect(consumer.references.some(ref => ref.error !== undefined)).toBe(false);
        // Without this the shouldRelink assertions below would pass for the wrong reason.
        expect(broken.references.some(ref => ref.error !== undefined)).toBe(true);
    });

    test('a document with unresolved references is not relinked when nothing it depends on changed', () => {
        // The cascade fix. Langium's default returns true here purely because the document
        // has a reference error, which is what dragged unrelated documents into every rebuild.
        expect(internals.shouldRelink(broken, new Set([UNRELATED_URI.toString()]))).toBe(false);
    });

    test('a document is relinked when a document it actually depends on changed', () => {
        // The other direction: the override must not suppress legitimate relinking.
        expect(internals.shouldRelink(consumer, new Set([PROVIDER_URI.toString()]))).toBe(true);
    });

    test('during import resolution, documents with unresolved references are relinked again', () => {
        // Newly loaded USE targets can resolve what was previously broken, so inside the
        // import flow the default behaviour is deliberately restored.
        internals.isImportingBBjDocuments = true;
        try {
            expect(internals.shouldRelink(broken, new Set([UNRELATED_URI.toString()]))).toBe(true);
        } finally {
            internals.isImportingBBjDocuments = false;
        }
    });

    test('buildDocuments does not re-enter import resolution while importing', async () => {
        // Counting stubs: the assertion is about which branch buildDocuments takes, and the
        // real import/compile paths would need PREFIX settings and a bbjcpl binary.
        const originalImport = internals.addImportedBBjDocuments;
        const originalCpl = internals.runBbjcplForDocuments;
        let importCalls = 0;
        internals.addImportedBBjDocuments = async () => { importCalls++; };
        internals.runBbjcplForDocuments = async () => { };

        try {
            await internals.buildDocuments([], {}, CancellationToken.None);
            expect(importCalls, 'normal build should resolve imports once').toBe(1);

            internals.isImportingBBjDocuments = true;
            await internals.buildDocuments([], {}, CancellationToken.None);
            expect(importCalls, 'nested build must not resolve imports again').toBe(1);
        } finally {
            internals.isImportingBBjDocuments = false;
            internals.addImportedBBjDocuments = originalImport;
            internals.runBbjcplForDocuments = originalCpl;
        }
    });
});
