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
                // The reflected overloads' parameters are the synthetic arg0/arg1 — the
                // names below are the only source for the hints.
                //
                // openWindow entries carry declared types (#481) and are deliberately in
                // the REVERSE order of the reflected overloads in bbj-test-module.ts
                // ((int, String) is reflected first): only type matching pairs them right.
                { name: 'openWindow', docu: 'Creates a top level window.', params: [{ name: 'p_title', type: 'String' }, { name: 'p_flags', type: 'String' }] },
                { name: 'openWindow', docu: 'Creates a top level window.', params: [{ name: 'p_context', type: 'int' }, { name: 'p_title', type: 'String' }] },
                // showDialog entries have no types (old-format javadoc file): with two
                // same-arity candidates the assignment would be a guess, so neither is
                // used and the hints are suppressed.
                { name: 'showDialog', docu: 'Shows a dialog.', params: [{ name: 'p_context' }, { name: 'p_title' }] },
                { name: 'showDialog', docu: 'Shows a dialog.', params: [{ name: 'p_title' }, { name: 'p_flags' }] },
                // closeWindow is not overloaded: a single untyped entry matches by
                // name+arity alone, no guessing involved.
                { name: 'closeWindow', docu: 'Closes a window.', params: [{ name: 'p_id' }] }
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

    test('typed javadoc entries pair by declared types, independent of entry order', async () => {
        const hints = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.openWindow("test", $00000082$)
        `);
        expect(hints.map(h => h.label)).toEqual(['p_title:', 'p_flags:']);
    });

    test('typed javadoc entries: the numeric-first overload keeps its own names', async () => {
        const hints = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.openWindow(1, "test")
        `);
        expect(hints.map(h => h.label)).toEqual(['p_context:', 'p_title:']);
    });

    test('ambiguous untyped javadoc entries produce no hints instead of guessed names', async () => {
        const hints = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.showDialog("test", $00000082$)
        `);
        expect(hints).toHaveLength(0);
    });

    test('a single untyped javadoc entry is unambiguous and still provides names', async () => {
        const hints = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            sg!.closeWindow(1)
        `);
        expect(hints.map(h => h.label)).toEqual(['p_id:']);
    });
});
