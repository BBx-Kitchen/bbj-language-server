import { DocumentValidator, URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';

/**
 * Regression for the stale USE statement cache (reported while testing #83, introduced
 * with the cache in 6e62815): `document.cachedUseStatements` was "refreshed" through
 * collectAllUseStatements, which returns the previous parse's cache — an empty list is
 * truthy — so a USE statement pasted into an already-open program was never picked up
 * by class resolution until the language server restarted (the USE's own file/class
 * reference resolved, but `new TheClass()` did not).
 *
 * Uses the real file system: the bug only manifests when the same LangiumDocument
 * object is re-parsed via DocumentBuilder.update, as in the editor.
 */
describe('USE statement cache is refreshed on document update', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-use-cache-'));
    const classFile = path.join(tmp, 'MyWidget.bbj');
    const mainFile = path.join(tmp, 'main.bbj');
    const mainUri = () => URI.file(mainFile);

    const services = createBBjServices(NodeFileSystem);

    function linkingErrors(diagnostics: { data?: { code?: string }, message: string }[] | undefined) {
        return (diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
    }

    beforeAll(async () => {
        fs.writeFileSync(classFile,
            'class public MyWidget\n    method public void render()\n    methodend\nclassend\n');
        // program initially has NO use statement
        fs.writeFileSync(mainFile, 'x! = new MyWidget()\nx!.render()\n');

        const documents = services.shared.workspace.LangiumDocuments;
        const classDoc = await documents.getOrCreateDocument(URI.file(classFile));
        const mainDoc = await documents.getOrCreateDocument(mainUri());
        await services.shared.workspace.DocumentBuilder.build([classDoc, mainDoc], { validation: true });
    });

    test('USE statement added by an edit takes effect without a restart', async () => {
        const documents = services.shared.workspace.LangiumDocuments;
        const builder = services.shared.workspace.DocumentBuilder;

        let mainDoc = documents.getDocument(mainUri())!;
        expect(linkingErrors(mainDoc.diagnostics).length, 'MyWidget must NOT resolve before the USE exists').toBeGreaterThan(0);

        // Simulate pasting the USE line into the open program (didChange -> update)
        fs.writeFileSync(mainFile, 'use ::MyWidget.bbj::MyWidget\nx! = new MyWidget()\nx!.render()\n');
        await builder.update([mainUri()], []);

        mainDoc = documents.getDocument(mainUri())!;
        await builder.build([mainDoc], { validation: true });
        expect(linkingErrors(mainDoc.diagnostics).map(d => d.message).join('\n')).toBe('');
    });

    test('USE statement removed by an edit takes effect too', async () => {
        const documents = services.shared.workspace.LangiumDocuments;
        const builder = services.shared.workspace.DocumentBuilder;

        fs.writeFileSync(mainFile, 'x! = new MyWidget()\nx!.render()\n');
        await builder.update([mainUri()], []);

        const mainDoc = documents.getDocument(mainUri())!;
        await builder.build([mainDoc], { validation: true });
        expect(linkingErrors(mainDoc.diagnostics).length, 'MyWidget must no longer resolve after the USE is removed').toBeGreaterThan(0);
    });
});
