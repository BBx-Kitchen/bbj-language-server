import { EmptyFileSystem, LangiumDocument, URI } from 'langium';
import { parseHelper } from 'langium/test';
import { WorkspaceFolder } from 'vscode-languageserver';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';
import { setTypeResolutionWarnings } from '../src/language/bbj-validator.js';

/**
 * GitHub issue #663: hovering or Ctrl/Cmd-Clicking the program file literal of a RUN or CALL
 * statement should show/open the resolved program file, the same way the #173 unresolved-file
 * warning already resolves it.
 */

function positionInside(document: LangiumDocument, snippet: string) {
    const offset = document.textDocument.getText().indexOf(snippet);
    expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
    return document.textDocument.positionAt(offset + 1);
}

describe('RUN/CALL file target navigation (#663)', () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        // Simulate an open workspace rooted at /root.
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [{ uri: URI.file('/root').toString(), name: 'root' }];
        (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;

        // Target programs indexed into the workspace so `hasDocument` resolves them.
        await parse(`print "sub"`, { documentUri: URI.file('/root/lib/sub.bbj').toString(), validation: false });
        await parse(`print "helper"`, { documentUri: URI.file('/root/app/helper.bbj').toString(), validation: false });
        await parse(`print "abs"`, { documentUri: URI.file('/opt/progs/abs.bbj').toString(), validation: false });
        await parse(`print "drive"`, { documentUri: URI.file('C:/progs/drive.bbj').toString(), validation: false });
    });

    test('Ctrl/Cmd-Click on a RUN file literal returns a link to the resolved program', async () => {
        const doc = await parse(`RUN "lib/sub.bbj"`, {
            documentUri: URI.file('/root/app/nav-run.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"lib/sub.bbj"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toHaveLength(1);
        const link = result![0];
        expect(link.targetUri).toBe(URI.file('/root/lib/sub.bbj').toString());
        expect(link.targetRange).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } });
        expect(link.targetSelectionRange).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } });
        expect(doc.textDocument.getText(link.originSelectionRange!)).toBe('"lib/sub.bbj"');
    });

    test('CALL with a ::label suffix links to the program file, label stripped', async () => {
        const doc = await parse(`CALL "helper.bbj::setUp", A$`, {
            documentUri: URI.file('/root/app/nav-call.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"helper.bbj::setUp"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toHaveLength(1);
        expect(result![0].targetUri).toBe(URI.file('/root/app/helper.bbj').toString());
    });

    test('an absolute POSIX target resolves as itself, with no unresolved-file warning', async () => {
        const doc = await parse(`RUN "/opt/progs/abs.bbj"`, {
            documentUri: URI.file('/root/app/nav-abs.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"/opt/progs/abs.bbj"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toHaveLength(1);
        expect(result![0].targetUri).toBe(URI.file('/opt/progs/abs.bbj').toString());
        expect((doc.diagnostics ?? []).some(d => d.message.includes('could not be resolved in the project directory'))).toBe(false);
    });

    test('a Windows drive-letter target resolves as itself, with no unresolved-file warning', async () => {
        const doc = await parse(`RUN "C:\\progs\\drive.bbj"`, {
            documentUri: URI.file('/root/app/nav-drive.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"C:\\progs\\drive.bbj"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toHaveLength(1);
        expect(result![0].targetUri).toBe(URI.file('C:/progs/drive.bbj').toString());
        expect((doc.diagnostics ?? []).some(d => d.message.includes('could not be resolved in the project directory'))).toBe(false);
    });

    test('an unresolvable RUN target returns no link', async () => {
        const doc = await parse(`RUN "does-not-exist.bbj"`, {
            documentUri: URI.file('/root/app/nav-missing.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"does-not-exist.bbj"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result ?? []).toHaveLength(0);
    });

    test('a dynamic RUN target (concatenation) returns no link', async () => {
        const doc = await parse(`A$ = "x.bbj"\nRUN "./"+A$`, {
            documentUri: URI.file('/root/app/nav-dynamic.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"./"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result ?? []).toHaveLength(0);
    });

    test('a CALL argument literal (not the fileid) returns no link', async () => {
        const doc = await parse(`CALL "helper.bbj", "lib/sub.bbj"`, {
            documentUri: URI.file('/root/app/nav-call-arg.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"lib/sub.bbj"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result ?? []).toHaveLength(0);
    });
});

describe('RUN/CALL navigation without project context or warnings (#663)', () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        setTypeResolutionWarnings(false);
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        await parse(`print "helper"`, { documentUri: URI.file('/loose/helper.bbj').toString(), validation: false });
    });

    afterAll(() => {
        setTypeResolutionWarnings(true);
    });

    test('a RUN target still links with no workspace folder and no PREFIX, and warnings disabled', async () => {
        const doc = await parse(`RUN "helper.bbj"`, {
            documentUri: URI.file('/loose/main.bbj').toString(),
            validation: true,
        });

        const definitionProvider = services.BBj.lsp.DefinitionProvider!;
        const position = positionInside(doc, '"helper.bbj"');
        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toHaveLength(1);
        expect(result![0].targetUri).toBe(URI.file('/loose/helper.bbj').toString());
    });
});
