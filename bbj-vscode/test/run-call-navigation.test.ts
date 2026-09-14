import { EmptyFileSystem, LangiumDocument, URI } from 'langium';
import { parseHelper } from 'langium/test';
import { WorkspaceFolder } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';

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
});
