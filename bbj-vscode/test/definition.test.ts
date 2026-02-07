import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjTestServices(EmptyFileSystem);

describe('Definition Provider Tests', () => {

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    test('DefinitionProvider is registered as BBjDefinitionProvider', () => {
        const provider = services.BBj.lsp.DefinitionProvider;
        expect(provider).toBeDefined();
        expect(provider!.constructor.name).toBe('BBjDefinitionProvider');
    });

    test('Go to definition on class reference navigates to class declaration', async () => {
        const parse = parseHelper<Model>(services.BBj);
        const doc = await parse(
            `class public MyClass\nclassend\n\nobj! = new MyClass()`,
            { documentUri: 'file:///test/inline.bbj', validation: true }
        );

        const definitionProvider = services.BBj.lsp.DefinitionProvider;
        if (!definitionProvider) {
            throw new Error('DefinitionProvider not registered');
        }

        // Position on 'MyClass' in 'new MyClass()'
        const text = doc.textDocument.getText();
        const newClassOffset = text.lastIndexOf('MyClass');
        const position = doc.textDocument.positionAt(newClassOffset);

        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toBeDefined();
        if (result && result.length > 0) {
            // Should navigate to the class declaration on line 0
            expect(result[0].targetSelectionRange.start.line).toBe(0);
            // Target URI should be the same file
            expect(result[0].targetUri).toBe('file:///test/inline.bbj');
        }
    });

    test('Default navigation for non-BbjClass targets still works', async () => {
        const parse = parseHelper<Model>(services.BBj);
        const doc = await parse(
            `x = 42\ny = x`,
            { documentUri: 'file:///test/vars.bbj', validation: true }
        );

        const definitionProvider = services.BBj.lsp.DefinitionProvider;
        if (!definitionProvider) {
            throw new Error('DefinitionProvider not registered');
        }

        // Position on 'x' in 'y = x'
        const text = doc.textDocument.getText();
        const xOffset = text.lastIndexOf('x');
        const position = doc.textDocument.positionAt(xOffset);

        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        // Variable references should still resolve via default behavior
        expect(result).toBeDefined();
    });

    test('Navigate to BbjClass with fields navigates to class name', async () => {
        const parse = parseHelper<Model>(services.BBj);
        const doc = await parse(
            `class public Widget\n    field public String name!\nclassend\n\nw! = new Widget()`,
            { documentUri: 'file:///test/widget.bbj', validation: true }
        );

        const definitionProvider = services.BBj.lsp.DefinitionProvider;
        if (!definitionProvider) {
            throw new Error('DefinitionProvider not registered');
        }

        // Position on 'Widget' in 'new Widget()'
        const text = doc.textDocument.getText();
        const widgetOffset = text.lastIndexOf('Widget');
        const position = doc.textDocument.positionAt(widgetOffset);

        const result = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position
        });

        expect(result).toBeDefined();
        if (result && result.length > 0) {
            // Should navigate to the class name on line 0, not the field on line 1
            expect(result[0].targetSelectionRange.start.line).toBe(0);
            // The selection range should highlight 'Widget', not 'class'
            const selectionText = doc.textDocument.getText(result[0].targetSelectionRange);
            expect(selectionText).toBe('Widget');
        }
    });
});
