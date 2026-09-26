import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { documentationHeader } from '../src/language/bbj-hover.js';
import { escapeMarkdown, MAX_JAVADOC_LENGTH } from '../src/language/java-peer-guard.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { DocumentationInfo, Model } from '../src/language/generated/ast.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * Java documentation from the interop peer and the javadoc files must render literally in
 * hover and completion documentation (issue #524).
 */

/**
 * Reports whether `md` contains an interpretable Markdown link or image opener: an opening
 * bracket not preceded by a backslash, later followed by a closing bracket and an opening
 * parenthesis, neither preceded by a backslash. Proven below to be false on escaped output and
 * true on raw link/image syntax, so a false result elsewhere in this file is trustworthy.
 */
function hasInterpretableLinkOrImage(md: string): boolean {
    return /(?<!\\)\[[^\]]*(?<!\\)\]\(/.test(md);
}

describe('hasInterpretableLinkOrImage helper is itself proven', () => {
    test('is false for escaped link/image syntax', () => {
        expect(hasInterpretableLinkOrImage('\\[x\\]\\(y\\)')).toBe(false);
        expect(hasInterpretableLinkOrImage('\\!\\[x\\]\\(y\\)')).toBe(false);
    });

    test('is true for raw link/image syntax', () => {
        expect(hasInterpretableLinkOrImage('[x](y)')).toBe(true);
        expect(hasInterpretableLinkOrImage('![x](y)')).toBe(true);
    });
});

describe('escapeMarkdown', () => {
    test('empty string stays empty', () => {
        expect(escapeMarkdown('')).toBe('');
    });

    test('plain text with non-ASCII letters and the truncation marker is unchanged', () => {
        const text = 'Über café, 日本語, truncated…';
        expect(escapeMarkdown(text)).toBe(text);
    });

    test('each of backslash, backtick, [, ], (, ) and ! gets exactly one preceding backslash', () => {
        expect(escapeMarkdown('\\')).toBe('\\\\');
        expect(escapeMarkdown('`')).toBe('\\`');
        expect(escapeMarkdown('[')).toBe('\\[');
        expect(escapeMarkdown(']')).toBe('\\]');
        expect(escapeMarkdown('(')).toBe('\\(');
        expect(escapeMarkdown(')')).toBe('\\)');
        expect(escapeMarkdown('!')).toBe('\\!');
    });

    test('a backslash followed by [ becomes two escaped characters, so the pair cannot undo the escape', () => {
        // The backslash escapes to two backslashes, then the bracket escapes to backslash+bracket:
        // three backslashes followed by the bracket in total.
        expect(escapeMarkdown('\\[')).toBe('\\\\' + '\\[');
    });

    test('the less-than sign and HTML tags pass through unchanged', () => {
        expect(escapeMarkdown('<p>text</p>')).toBe('<p>text</p>');
        expect(escapeMarkdown('<a href="https://example.com">link</a>')).toBe('<a href="https://example.com">link</a>');
    });

    test('image syntax is escaped so !, [, ], ( and ) each carry a preceding backslash', () => {
        const raw = '![x](https://evil.example/t.png)';
        const expected = '\\!' + '\\[' + 'x' + '\\]' + '\\(' + 'https://evil.example/t.png' + '\\)';
        const escaped = escapeMarkdown(raw);
        expect(escaped).toBe(expected);
        expect(hasInterpretableLinkOrImage(raw)).toBe(true);
        expect(hasInterpretableLinkOrImage(escaped)).toBe(false);
    });
});

describe('Java hover documentation is escaped at the render boundary (issue #524)', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    function positionOf(document: LangiumDocument, snippet: string) {
        const offset = document.textDocument.getText().indexOf(snippet);
        expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
        return document.textDocument.positionAt(offset);
    }

    test('a link or image in a Java method javadoc shows literally in hover, and the stored docu stays unescaped', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        expect(hashMap).toBeDefined();
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();

        const rawJavadoc = 'See ![x](https://evil.example/t.png), [click](https://evil.example), '
            + 'an HTML tag <img src="https://evil.example/t.png"> and a `backtick span`.';
        const rawSignature = 'Object HashMap.put([evil](https://evil.example))';
        put!.docu = {
            $type: 'DocumentationInfo',
            $container: put!,
            javadoc: rawJavadoc,
            signature: rawSignature
        } as DocumentationInfo;

        const document = await parse('declare java.util.HashMap h!\nh!.put()\n', { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'h!.put()');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 'h!.'.length }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(value.startsWith('__')).toBe(true);
        expect(hasInterpretableLinkOrImage(value)).toBe(false);
        expect(value).not.toContain('](');
        expect(value).not.toContain('![');
        // The HTML tag is untouched: the less-than sign is deliberately not escaped, so
        // javadoc HTML stays readable.
        expect(value).toContain('<img src="https://evil.example/t.png">');

        // The stored docu is unchanged after hover renders it.
        expect(put!.docu!.javadoc).toBe(rawJavadoc);
        expect(put!.docu!.signature).toBe(rawSignature);
    });
});

describe("Hover's javadoc-file fallback is bounded and escaped, Java headers are escaped, and BBj-authored documentation is untouched", () => {
    const services = createBBjTestServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function positionOf(document: LangiumDocument, snippet: string) {
        const offset = document.textDocument.getText().indexOf(snippet);
        expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
        return document.textDocument.positionAt(offset);
    }

    test('an oversized javadoc-file fallback is bounded before it is rendered, and still ends up escaped', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        expect(hashMap).toBeDefined();
        expect(hashMap!.docu).toBeUndefined();

        const oversizedDocu = '/**' + 'a'.repeat(40000) + ' [x](https://evil.example)' + '*/';
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({ name: 'HashMap', docu: oversizedDocu });

        const document = await parse('declare java.util.HashMap h!\n', { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'HashMap');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(value).toContain('…');
        const header = documentationHeader(hashMap!) ?? '';
        expect(value.length).toBeLessThanOrEqual(MAX_JAVADOC_LENGTH + header.length + 10);
    });

    test('a short javadoc-file fallback containing link syntax renders escaped', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({
            name: 'HashMap',
            docu: '/** See [x](https://evil.example) */'
        });

        const document = await parse('declare java.util.HashMap h!\n', { validation: true });
        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'HashMap');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(hasInterpretableLinkOrImage(value)).toBe(false);
        expect(hashMap!.docu).toBeUndefined();
    });

    test('a Java header built from an unusable field type renders escaped, with no interpretable link', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const stringClass = javaInterop.getResolvedClass('java.lang.String');
        expect(stringClass).toBeDefined();
        const someInstanceField = stringClass!.fields.find(f => f.name === 'someInstanceField');
        expect(someInstanceField).toBeDefined();
        const originalType = someInstanceField!.type;
        someInstanceField!.type = 'java.util.List[x](https://evil.example)';

        try {
            const document = await parse('declare java.lang.String s!\nPRINT s!.someInstanceField\n', { validation: true });
            expect(document.parseResult.lexerErrors).toHaveLength(0);
            expect(document.parseResult.parserErrors).toHaveLength(0);

            const hoverProvider = services.BBj.lsp.HoverProvider!;
            const position = positionOf(document, 's!.someInstanceField');
            const hover = await hoverProvider.getHoverContent(document, {
                textDocument: { uri: document.uri.toString() },
                position: { line: position.line, character: position.character + 's!.'.length }
            });

            expect(hover).toBeDefined();
            const value = (hover!.contents as { value: string }).value;
            expect(value.startsWith('__')).toBe(true);
            expect(hasInterpretableLinkOrImage(value)).toBe(false);
        } finally {
            someInstanceField!.type = originalType;
        }
    });

    test('a documented BBj class member keeps its REM /** */ link unescaped', async () => {
        const document = await parse(`
class public Doc
    REM /**
    REM  * See [docs](https://documentation.basis.cloud) for details
    REM  */
    field public BBjString title
classend

declare Doc d!
PRINT d!.title
        `, { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'd!.title');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 'd!.'.length }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(value).toContain('[docs](https://documentation.basis.cloud)');
    });
});
