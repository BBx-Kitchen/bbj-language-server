import { EmptyFileSystem, EmptyFileSystemProvider, FileSystemNode, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { URI } from 'vscode-uri';
import { beforeAll, describe, expect, test } from 'vitest';
import { InlayHint, Range } from 'vscode-languageserver';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import { Model } from '../src/language/generated/ast.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * Inlay hints when javadoc provides the parameter names (#478). The javadoc entries
 * carry no parameter types, so the two-argument addWindow overloads — (p_context,
 * p_title) and (p_title, p_flags) — can only be paired with the reflected methods
 * positionally. Every overload used to receive the FIRST doc entry's names, so
 * addWindow("test", $00000082$) was hinted as p_context/p_title.
 */

const javadocJson = {
    name: 'com.test',
    classes: [
        {
            name: 'SysGui',
            fields: [],
            methods: [
                // Same order as the reflected openWindow overloads in bbj-test-module.ts,
                // whose parameters are the synthetic arg0/arg1 — the names below are the
                // only source for the hints.
                { name: 'openWindow', docu: 'Creates a top level window.', params: [{ name: 'p_context' }, { name: 'p_title' }] },
                { name: 'openWindow', docu: 'Creates a top level window.', params: [{ name: 'p_title' }, { name: 'p_flags' }] }
            ]
        }
    ]
};

class JavadocFileSystem extends EmptyFileSystemProvider {
    override async readFile(): Promise<string> {
        return JSON.stringify(javadocJson);
    }
    override async readDirectory(): Promise<FileSystemNode[]> {
        return [{ isFile: true, isDirectory: false, uri: URI.parse('file:///javadoc/com.test.json') }];
    }
}

describe('Inlay hints with javadoc-backed parameter names', () => {

    let parse: (content: string) => Promise<LangiumDocument<Model>>;
    let getHints: (content: string) => Promise<InlayHint[]>;

    beforeAll(async () => {
        // Must run before createBBjTestServices, which would otherwise initialize
        // the JavadocProvider singleton with no javadoc sources.
        await JavadocProvider.getInstance().initialize([URI.parse('file:///javadoc')], new JavadocFileSystem());
        const services = createBBjTestServices(EmptyFileSystem);
        await initializeWorkspace(services.shared);
        parse = parseHelper<Model>(services.BBj);
        getHints = async (content: string) => {
            const document = await parse(content);
            expect(document.parseResult.lexerErrors).toHaveLength(0);
            expect(document.parseResult.parserErrors).toHaveLength(0);
            const provider = services.BBj.lsp.InlayHintProvider!;
            return await provider.getInlayHints(document, {
                textDocument: { uri: document.uri.toString() },
                range: Range.create(0, 0, document.textDocument.lineCount, 0)
            }) ?? [];
        };
    });

    test('same-arity overloads keep their own javadoc parameter names', async () => {
        const hints = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.openWindow("test", $00000082$)
        `);
        expect(hints.map(h => h.label)).toEqual(['p_title:', 'p_flags:']);
    });

    test('the numeric-first overload also keeps its javadoc parameter names', async () => {
        const hints = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.openWindow(1, "test")
        `);
        expect(hints.map(h => h.label)).toEqual(['p_context:', 'p_title:']);
    });
});
