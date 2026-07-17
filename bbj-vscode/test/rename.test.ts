import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjTestServices(EmptyFileSystem);

describe('Rename Provider Tests (#77)', () => {

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    let counter = 0;

    async function renameAt(source: string, symbol: string, occurrence: number, newName: string) {
        const parse = parseHelper<Model>(services.BBj);
        const uri = `file:///test/rename${counter++}.bbj`;
        const doc = await parse(source, { documentUri: uri, validation: false });
        const provider = services.BBj.lsp.RenameProvider;
        expect(provider, 'RenameProvider should be registered').toBeDefined();
        const text = doc.textDocument.getText();
        // find the Nth occurrence of `symbol`
        let idx = -1;
        for (let i = 0; i < occurrence; i++) {
            idx = text.indexOf(symbol, idx + 1);
        }
        expect(idx, `occurrence ${occurrence} of "${symbol}" found`).toBeGreaterThanOrEqual(0);
        const position = doc.textDocument.positionAt(idx);
        const edit = await provider!.rename(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position,
            newName
        });
        const edits = edit?.changes?.[uri] ?? [];
        return edits;
    }

    test('Renaming a field updates its declaration and #-instance-access references', async () => {
        // Issue #77: field rename previously behaved wrongly. It must now update both the
        // FieldDecl and every `#field!` instance-access reference.
        const source = [
            'class public Test',
            '    field public BBjString drawer!',
            '    method public void setUp()',
            '        #drawer! = "x"',
            '        y! = #drawer!',
            '    methodend',
            'classend'
        ].join('\n');
        // position on the declaration occurrence of drawer!
        const edits = await renameAt(source, 'drawer!', 1, 'cabinet!');
        // declaration + two #drawer! references = 3 edit sites
        expect(edits.length).toBeGreaterThanOrEqual(3);
        expect(edits.every(e => e.newText === 'cabinet!')).toBe(true);
    });

    test('Renaming a method updates its declaration and call sites', async () => {
        const source = [
            'class public Test',
            '    method public void doWork()',
            '    methodend',
            '    method public void run()',
            '        #doWork()',
            '    methodend',
            'classend'
        ].join('\n');
        const edits = await renameAt(source, 'doWork', 1, 'process');
        // declaration + one #doWork() call = 2 edit sites
        expect(edits.length).toBeGreaterThanOrEqual(2);
        expect(edits.every(e => e.newText === 'process')).toBe(true);
    });
});
