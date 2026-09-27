import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { CompletionTriggerKind } from 'vscode-languageserver';
import { documentationHeader } from '../src/language/bbj-hover.js';
import { escapeJavadocMarkdown, escapeMarkdown, MAX_JAVADOC_LENGTH, MAX_JAVA_IDENTIFIER_LENGTH, TRUNCATION_MARKER, toFenceSafeLine, truncateText } from '../src/language/java-peer-guard.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { DocumentationInfo, Model } from '../src/language/generated/ast.js';
import { JavadocProvider, type MethodDoc } from '../src/language/java-javadoc.js';
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

/**
 * The real end of BBjGrid.isPaging's documentation in the installed BASIS javadoc, where every
 * documented member ends with such a link.
 */
const IS_PAGING_DOCS_LINK = '[Docs](https://documentation.basis.cloud/BASISHelp/WebHelp/gridmethods/bbjgrid/scrolling/bbjgrid_ispaging.htm)';
const REAL_IS_PAGING_TAIL = '</img>) and if the paging amount can be changed.\r\r' + IS_PAGING_DOCS_LINK;

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

describe('escapeJavadocMarkdown', () => {
    test('the real BBjGrid.isPaging javadoc tail keeps its trailing Docs link verbatim and escapes the text before it', () => {
        const expected = '</img>\\) and if the paging amount can be changed.\r\r' + IS_PAGING_DOCS_LINK;
        expect(escapeJavadocMarkdown(REAL_IS_PAGING_TAIL)).toBe(expected);
    });

    test.each([
        ['other host', 'Text.\r\r[Docs](https://evil.example/a.htm)'],
        ['http', 'Text.\r\r[Docs](http://documentation.basis.cloud/a.htm)'],
        ['other label', 'Text.\r\r[Click here](https://documentation.basis.cloud/a.htm)'],
        ['lowercase label', 'Text.\r\r[docs](https://documentation.basis.cloud/a.htm)'],
        ['image', 'Text.\r\r![Docs](https://documentation.basis.cloud/a.htm)'],
        ['host suffix', 'Text.\r\r[Docs](https://documentation.basis.cloud.evil.com/a.htm)'],
        ['userinfo after host', 'Text.\r\r[Docs](https://documentation.basis.cloud@evil.com/a.htm)'],
        ['userinfo before host', 'Text.\r\r[Docs](https://user@documentation.basis.cloud/a.htm)'],
        ['embedded paren', 'Text.\r\r[Docs](https://documentation.basis.cloud/a)b.htm)'],
        ['whitespace in URL', 'Text.\r\r[Docs](https://documentation.basis.cloud/a b.htm)'],
        ['link title', 'Text.\r\r[Docs](https://documentation.basis.cloud/a.htm "title")'],
        ['not at the end', 'Text.\r\r[Docs](https://documentation.basis.cloud/a.htm) and more text.'],
        ['glued to the preceding word', 'see[Docs](https://documentation.basis.cloud/a.htm)']
    ])('a lookalike link stays fully escaped: %s', (_description, value) => {
        const result = escapeJavadocMarkdown(value);
        expect(result).toBe(escapeMarkdown(value));
        expect(hasInterpretableLinkOrImage(result)).toBe(false);
    });

    test('with two Docs links, only the trailing one stays a link', () => {
        const prefix = 'Text.\r\r[Docs](https://documentation.basis.cloud/first.htm)\r\r';
        const value = prefix + '[Docs](https://documentation.basis.cloud/second.htm)';
        const expected = escapeMarkdown(prefix) + '[Docs](https://documentation.basis.cloud/second.htm)';
        expect(escapeJavadocMarkdown(value)).toBe(expected);
    });

    test('text without the trailing Docs link is escaped exactly like escapeMarkdown', () => {
        expect(escapeJavadocMarkdown('')).toBe('');
        const value = 'Plain (text) with [x](https://evil.example)';
        expect(escapeJavadocMarkdown(value)).toBe(escapeMarkdown(value));
    });

    test('whitespace after the trailing Docs link is kept and the link stays a link', () => {
        const value = 'Text.\r\r' + IS_PAGING_DOCS_LINK + '\r\n';
        const expected = escapeMarkdown('Text.\r\r') + IS_PAGING_DOCS_LINK + '\r\n';
        expect(escapeJavadocMarkdown(value)).toBe(expected);
    });

    test('a trailing Docs link cut by truncation stays fully escaped', () => {
        const truncated = truncateText('a'.repeat(MAX_JAVADOC_LENGTH - 40) + '\r\r' + IS_PAGING_DOCS_LINK, MAX_JAVADOC_LENGTH);
        expect(truncated.endsWith(TRUNCATION_MARKER)).toBe(true);
        expect(truncated).toContain('[Docs](https://documentation.basis.');
        const result = escapeJavadocMarkdown(truncated);
        expect(result).toBe(escapeMarkdown(truncated));
        expect(hasInterpretableLinkOrImage(result)).toBe(false);
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

    test('the trailing BASIS Docs link in a Java method javadoc stays a clickable link in hover, while other link syntax stays escaped', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        expect(hashMap).toBeDefined();
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();
        const originalDocu = put!.docu;

        const rawJavadoc = 'See [click](https://evil.example). ' + REAL_IS_PAGING_TAIL;
        put!.docu = {
            $type: 'DocumentationInfo',
            $container: put!,
            javadoc: rawJavadoc,
            signature: 'Object HashMap.put()'
        } as DocumentationInfo;

        try {
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
            expect(value.endsWith(IS_PAGING_DOCS_LINK)).toBe(true);
            expect(value).toContain('\\[click\\]\\(https://evil.example\\)');
            expect(value).toContain('</img>\\)');
            expect(hasInterpretableLinkOrImage(value.slice(0, value.length - IS_PAGING_DOCS_LINK.length))).toBe(false);

            expect(put!.docu!.javadoc).toBe(rawJavadoc);
        } finally {
            put!.docu = originalDocu;
        }
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

    test('the javadoc-file method fallback bounds an oversized method name and parameter name in the hover signature', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        expect(hashMap).toBeDefined();
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();
        expect(put!.docu).toBeUndefined();

        const methodDoc: MethodDoc = {
            name: 'm'.repeat(5000),
            docu: '/** Short text. */',
            params: [{ name: 'q'.repeat(5000) }]
        };
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue(methodDoc);

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
        expect(value).toContain('HashMap.' + 'm'.repeat(20));
        expect(value).not.toContain('m'.repeat(1024));
        expect(value).not.toContain('q'.repeat(1024));
        expect(value).toContain(TRUNCATION_MARKER);
        expect(value.length).toBeLessThan(3 * MAX_JAVA_IDENTIFIER_LENGTH);
        expect(value).toContain('Short text.');
    });

    test('a javadoc-file method entry whose names are not strings falls back to the method\'s own name, and hover still renders', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        expect(hashMap).toBeDefined();
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();
        expect(put!.docu).toBeUndefined();

        const methodDoc = { name: 42, docu: '/** Short. */', params: [{ name: 7 }] } as unknown as MethodDoc;
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue(methodDoc);

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
        expect(value).toContain('HashMap.put');
        expect(value).not.toContain('HashMap.42');
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

    test('the trailing BASIS Docs link in a javadoc-file fallback stays a clickable link in hover', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        expect(hashMap).toBeDefined();
        expect(hashMap!.docu).toBeUndefined();

        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({ name: 'HashMap', docu: REAL_IS_PAGING_TAIL });

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
        expect(value.endsWith(IS_PAGING_DOCS_LINK)).toBe(true);
        expect(value).toContain('</img>\\)');
        expect(hashMap!.docu).toBeUndefined();
    });
});

describe('toFenceSafeLine', () => {
    test('an ordinary signature is unchanged', () => {
        expect(toFenceSafeLine('Object HashMap.put(Object k)')).toBe('Object HashMap.put(Object k)');
    });

    test('a backtick is removed', () => {
        expect(toFenceSafeLine('a`b')).toBe('ab');
    });

    test('every line-break form becomes one space', () => {
        expect(toFenceSafeLine('a\nb')).toBe('a b');
        expect(toFenceSafeLine('a\r\nb')).toBe('a b');
        expect(toFenceSafeLine('a\rb')).toBe('a b');
        expect(toFenceSafeLine('a\u2028b')).toBe('a b');
        expect(toFenceSafeLine('a\u2029b')).toBe('a b');
    });

    test('three backticks become the empty string', () => {
        expect(toFenceSafeLine('```')).toBe('');
    });
});

describe('Java completion documentation is escaped and fence-safe (issue #524)', () => {
    const services = createBBjTestServices(EmptyFileSystem);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Mirrors completion-test.test.ts's own dotComplete driver: the cursor sits right after
    // the trailing '.' in `prefix`.
    async function dotComplete(prefix: string, uri: string) {
        const parse = parseHelper<Model>(services.BBj);
        const doc = await parse(prefix, { documentUri: uri });
        const provider = services.BBj.lsp.CompletionProvider!;
        const offset = prefix.length;
        const completions = await provider.getCompletion(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
        });
        return completions?.items ?? [];
    }

    test("a Java method's completion documentation is escaped and its fenced signature cannot break out", async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();
        const originalDocu = put!.docu;

        const rawJavadoc = 'See ![x](https://evil.example/t.png) and [click](https://evil.example).';
        const rawSignature = 'Object HashMap.put()' + '\n' + '```' + '\n' + '[evil](https://evil.example)';
        put!.docu = {
            $type: 'DocumentationInfo',
            $container: put!,
            javadoc: rawJavadoc,
            signature: rawSignature
        } as DocumentationInfo;

        try {
            const items = await dotComplete('declare java.util.HashMap h!\nh!.', 'file:///completion-escape-1.bbj');
            const putItem = items.find(i => i.label.startsWith('put'));
            expect(putItem).toBeDefined();
            const doc = putItem!.documentation as { kind: string, value: string };
            expect(doc?.value).toBeDefined();
            // Exactly two runs of three backticks: the opening and closing java fence.
            const fenceRuns = doc.value.match(/```/g) ?? [];
            expect(fenceRuns.length).toBe(2);
            // The fenced java block is not itself Markdown-interpreted by a renderer, so a raw
            // link inside it (from an unescaped signature) is not a security concern — only the
            // fence needs to stay intact. The javadoc part after it must have no interpretable
            // link or image.
            const fencedMatch = doc.value.match(/```java\n([^`]*)\n```\n\n([\s\S]*)/);
            expect(fencedMatch).not.toBeNull();
            const [, fencedLine, javadocPart] = fencedMatch!;
            expect(fencedLine).not.toContain('\n');
            expect(hasInterpretableLinkOrImage(javadocPart)).toBe(false);
        } finally {
            put!.docu = originalDocu;
        }
    });

    test('with docu unset, the documentationHeader fallback is escaped too', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();
        const originalDocu = put!.docu;
        const originalReturnType = put!.returnType;
        put!.docu = undefined;
        put!.returnType = 'java.lang.Object[x](https://evil.example)';

        try {
            const items = await dotComplete('declare java.util.HashMap h!\nh!.', 'file:///completion-escape-2.bbj');
            const putItem = items.find(i => i.label.startsWith('put'));
            expect(putItem).toBeDefined();
            const doc = putItem!.documentation as { kind: string, value: string } | undefined;
            expect(doc?.value).toBeDefined();
            expect(hasInterpretableLinkOrImage(doc!.value)).toBe(false);
        } finally {
            put!.docu = originalDocu;
            put!.returnType = originalReturnType;
        }
    });

    test('the trailing BASIS Docs link in Java completion documentation stays a clickable link, while other link syntax stays escaped', async () => {
        const javaInterop = services.BBj.java.JavaInteropService;
        const hashMap = javaInterop.getResolvedClass('java.util.HashMap');
        const put = hashMap!.methods.find(m => m.name === 'put');
        expect(put).toBeDefined();
        const originalDocu = put!.docu;

        const rawJavadoc = 'See [click](https://evil.example). ' + REAL_IS_PAGING_TAIL;
        put!.docu = {
            $type: 'DocumentationInfo',
            $container: put!,
            javadoc: rawJavadoc,
            signature: 'Object HashMap.put()'
        } as DocumentationInfo;

        try {
            const items = await dotComplete('declare java.util.HashMap h!\nh!.', 'file:///completion-escape-docs-link.bbj');
            const putItem = items.find(i => i.label.startsWith('put'));
            expect(putItem).toBeDefined();
            const doc = putItem!.documentation as { kind: string, value: string };
            expect(doc?.value).toBeDefined();
            expect(doc.value.endsWith(IS_PAGING_DOCS_LINK)).toBe(true);
            expect(doc.value).toContain('\\[click\\]\\(https://evil.example\\)');
            expect(hasInterpretableLinkOrImage(doc.value.slice(0, doc.value.length - IS_PAGING_DOCS_LINK.length))).toBe(false);
            const fenceRuns = doc.value.match(/```/g) ?? [];
            expect(fenceRuns.length).toBe(2);
        } finally {
            put!.docu = originalDocu;
        }
    });

    test('a BBj class method keeps its REM /** */ link unescaped in completion documentation', async () => {
        const items = await dotComplete(`
class public Doc
    REM /**
    REM  * See [docs](https://documentation.basis.cloud) for details
    REM  */
    method public void doWork()
    methodend
classend

declare Doc d!
d!.`, 'file:///completion-escape-3.bbj');
        const workItem = items.find(i => i.label.startsWith('doWork'));
        expect(workItem).toBeDefined();
        const doc = workItem!.documentation as { kind: string, value: string } | string | undefined;
        const value = typeof doc === 'string' ? doc : doc?.value ?? '';
        expect(value).toContain('[docs](https://documentation.basis.cloud)');
    });
});
