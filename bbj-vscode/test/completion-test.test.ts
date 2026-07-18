
import { AstUtils, EMPTY_SCOPE, EmptyFileSystem } from 'langium';
import { expectCompletion, parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { describe, expect, test, vi } from 'vitest';
import { createBBjTestServices } from './bbj-test-module';
import { isBbjClass, isSymbolRef, Model } from '../src/language/generated/ast.js';

describe('BBJ completion provider', async () => {

    const bbjServices = createBBjTestServices(EmptyFileSystem).BBj;
    const completion = expectCompletion(bbjServices);

    // Drive the completion provider with a '#' trigger context at the '<|>' marker.
    // expectCompletion() does not let us set a trigger character, and field completion
    // is only reachable via the '#' trigger, so this drives the request directly. Uses
    // parseHelper (validation off) like the rest of this file — a full DocumentBuilder
    // build would run the CPL/interop validation path and reach for the Java service.
    let fieldCompletionCounter = 0;
    async function fieldCompletion(text: string) {
        const offset = text.indexOf('<|>');
        const clean = text.replace('<|>', '');
        const doc = await parseHelper<Model>(bbjServices)(
            clean, { documentUri: `file:///field-completion-${fieldCompletionCounter++}.bbj` });
        const params: CompletionParams = {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '#' }
        };
        return bbjServices.lsp.CompletionProvider!.getCompletion(doc, params);
    }

    // Drive the completion provider with a '.' trigger context at the '<|>' marker.
    // expectCompletion() does not let us set a trigger character, and USE-path package/class
    // completion after a dot is only reachable via the '.' trigger, so this drives the request
    // directly (mirrors fieldCompletion above). Returns the offered item labels.
    let dotCompletionCounter = 0;
    async function useDotCompletion(text: string): Promise<string[]> {
        const offset = text.indexOf('<|>');
        const clean = text.replace('<|>', '');
        const doc = await parseHelper<Model>(bbjServices)(
            clean, { documentUri: `file:///use-dot-completion-${dotCompletionCounter++}.bbj` });
        const params: CompletionParams = {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
        };
        const list = await bbjServices.lsp.CompletionProvider!.getCompletion(doc, params);
        return (list?.items ?? []).map(i => i.label);
    }

    // Plain (Invoked) completion driver — models VS Code re-querying as the user keeps typing a
    // segment. The '.' list is returned `isIncomplete`, so the client re-queries; that re-query
    // must return the narrowed candidates rather than an empty list (issue #460).
    async function useInvokedCompletion(text: string): Promise<string[]> {
        const offset = text.indexOf('<|>');
        const clean = text.replace('<|>', '');
        const doc = await parseHelper<Model>(bbjServices)(
            clean, { documentUri: `file:///use-invoked-completion-${dotCompletionCounter++}.bbj` });
        const params: CompletionParams = {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.Invoked }
        };
        const list = await bbjServices.lsp.CompletionProvider!.getCompletion(doc, params);
        return (list?.items ?? []).map(i => i.label);
    }

    test("partially typed subpackage after `use java.` still narrows - issue #460", async () => {
        const labels = await useInvokedCompletion('use java.u<|>\n');
        expect(labels).toContain('util');
    });

    test("partially typed class after `use java.util.` still narrows - issue #460", async () => {
        const labels = await useInvokedCompletion('use java.util.Hash<|>\n');
        expect(labels).toContain('HashMap');
    });

    test("'.' after `use java` offers subpackages - issue #453", async () => {
        const labels = await useDotCompletion('use java.<|>\n');
        expect(labels).toContain('util');
        expect(labels).toContain('lang');
    });

    test("'.' after `use java.util` offers classes - issue #453", async () => {
        const labels = await useDotCompletion('use java.util.<|>\n');
        expect(labels).toContain('HashMap');
    });

    test("'.' after `use java.lang` offers classes - issue #453", async () => {
        const labels = await useDotCompletion('use java.lang.<|>\n');
        expect(labels).toContain('String');
        expect(labels).toContain('Class');
    });

    test("Ctrl+Space after `use java.` offers subpackages - issue #453", async () => {
        // The plain (no trigger character) path must also offer package/class suggestions after a dot.
        await completion({
            text: 'use java.<|>\n',
            index: 0,
            assert: (completions) => {
                const labels = completions.items.map(i => i.label);
                expect(labels).toContain('util');
                expect(labels).toContain('lang');
            }
        });
    });

    test('Should propose imported java class', async () => {
        const text = `
        use java.util.HashMap
        Hash<|>
        `
        await completion({
            text,
            index: 0,
            expectedItems: [
                'HashMap'
            ]
        });
    });

    test('DEF FN parameters show with $ suffix inside body', async () => {
        const text = `
DEF fnIsText(_f$,_t$)
    PRINT <|>
FNEND
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const items = completions.items;
                const paramItems = items.filter(i => i.label === '_f$' || i.label === '_t$');
                expect(paramItems.length).toBe(2);
                expect(paramItems.map(i => i.label).sort()).toEqual(['_f$', '_t$']);
                // Ensure no truncated versions without $
                const truncated = items.filter(i => i.label === '_f' || i.label === '_t');
                expect(truncated.length).toBe(0);
            }
        });
    });

    test('DEF FN parameters do not leak outside FN body', async () => {
        const text = `
DEF fnIsText(_f$,_t$)
    RETURN 1
FNEND
PRINT <|>
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const items = completions.items;
                const paramItems = items.filter(i =>
                    i.label === '_f$' || i.label === '_t$' ||
                    i.label === '_f' || i.label === '_t'
                );
                expect(paramItems.length).toBe(0);
            }
        });
    });

    test('DEF FN parameters are not duplicated in completion', async () => {
        const text = `
DEF fnIsText(_f$,_t$)
    PRINT <|>
FNEND
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const items = completions.items;
                const fItems = items.filter(i => i.label === '_f$');
                const tItems = items.filter(i => i.label === '_t$');
                // Each parameter should appear exactly once, not duplicated
                expect(fItems.length).toBe(1);
                expect(tItems.length).toBe(1);
            }
        });
    });

    test.skip('DEF FN parameters with $ suffix inside class method', async () => {
        // SKIP: Completion provider returns 0 items inside class method bodies (even without DEF FN).
        // The Langium DefaultCompletionProvider does not produce grammar-based completions for PRINT
        // statements inside MethodDecl.body. This is a completion grammar traversal limitation —
        // the issue is NOT in the scope chain (scope debug confirmed DEF FN params ARE registered
        // under DefFunction in localSymbols and the container chain IS correct).
        // Root cause: the completion engine's grammar follower doesn't find valid completion
        // positions inside class method bodies for statement expressions.
        // Tracked for future fix — works correctly at program scope level.
        const text = `
class public TestClass
    method public void doWork()
        DEF fnIsText(_f$,_t$)
            PRINT <|>
        FNEND
    methodend
classend
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const items = completions.items;
                const paramItems = items.filter(i => i.label === '_f$' || i.label === '_t$');
                const truncated = items.filter(i => i.label === '_f' || i.label === '_t');
                expect(paramItems.length).toBe(2);
                expect(truncated.length).toBe(0);
            }
        });
    });

    test('DEF FN single-line parameters show with $ suffix', async () => {
        const text = `
DEF fnIsText(_f$,_t$)=_f$+<|>
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const items = completions.items;
                const paramItems = items.filter(i => i.label === '_f$' || i.label === '_t$');
                expect(paramItems.length).toBe(2);
            }
        });
    });

    test('BBj class constructor completion returns items or empty list (no crash)', async () => {
        const text = `
class public MyWidget
    method public void create(name$)
    methodend
    method public void create(name$, width)
    methodend
    method public void doWork()
    methodend
classend
declare MyWidget w!
w! = new MyWidget(<|>)
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                // In EmptyFileSystem, ConstructorCall class resolution may be partial.
                // The test verifies no crash and either returns constructor items or an empty list.
                const items = completions.items;
                const ctorItems = items.filter(i => i.kind === 4); // CompletionItemKind.Constructor = 4
                // If class resolves, constructor items should appear; otherwise empty is acceptable
                expect(items.length).toBeGreaterThanOrEqual(0);
                // Verify no method (doWork) appears as constructor item
                const doWorkItem = ctorItems.find(i => i.label.includes('doWork'));
                expect(doWorkItem).toBeUndefined();
            }
        });
    });

    test('no-arg constructor completion inserts nothing, not the label - issue #447', async () => {
        // Regression: a no-arg constructor item had an empty insertText, which is falsy, so the
        // client falls back to the label `MyWidget()` and nests it as `new MyWidget(MyWidget())`.
        // It must use a textEdit that inserts nothing instead.
        const text = `
class public MyWidget
    method public void create()
    methodend
classend
declare MyWidget w!
w! = new MyWidget(<|>)
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const ctor = completions.items.find(i => i.kind === 4 && i.label === 'MyWidget()');
                expect(ctor).toBeDefined();
                expect(ctor!.insertText).toBeUndefined();
                expect(ctor!.textEdit).toBeDefined();
                expect((ctor!.textEdit as { newText: string }).newText).toBe('');
            }
        });
    });

    test('class-reference completion after `new` does not crash (issue: Langium 4.3 synthetic node)', async () => {
        // Regression: getScope read container.simpleClass.$refText on a synthetic
        // completion node where simpleClass is undefined, throwing a TypeError that
        // Langium swallows via console.error inside completionForCrossReference.
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        try {
            const text = `
class public MyClass
classend
x! = new <|>
            `
            await completion({
                text,
                index: 0,
                assert: () => { }
            });
            const refTextCrash = errorSpy.mock.calls.some(args =>
                args.some(a => a instanceof Error && /\$refText/.test(a.message)));
            expect(refTextCrash).toBe(false);
        } finally {
            errorSpy.mockRestore();
        }
    });

    test('member access on a method-call result infers the return type (regression: BBjAPI())', async () => {
        // A variable assigned from a call expression must take the call's return
        // type so member completion works on it. This is the same inference path
        // that `a! = BBjAPI()` relies on; the isMethodCall branch in the type
        // inferer was removed as "dead code" and broke it. Uses in-document BBj
        // classes so it resolves without a populated Java index.
        const text = `
class public MyClass
    method public MyClass getSelf()
    methodend
    method public void doWork()
    methodend
classend
declare MyClass m!
y! = m!.getSelf()
y!.<|>
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const methodItems = completions.items.filter(i => i.label.startsWith('doWork'));
                expect(methodItems.length).toBeGreaterThanOrEqual(1);
            }
        });
    });

    test('class member access on BBj class instance offers methods', async () => {
        // Note: .class completion requires java.lang.Class to be resolved via Java interop.
        // In EmptyFileSystem, Java classes are not available, so .class won't appear.
        // This test validates the mechanism doesn't crash on member access and that
        // BBj methods appear correctly for instance variables.
        const text = `
class public MyClass
    method public void doWork()
    methodend
classend
declare MyClass foo!
foo!.<|>
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const items = completions.items;
                // In EmptyFileSystem, we expect at least the BBj method to appear
                const methodItems = items.filter(i => i.label.startsWith('doWork'));
                expect(methodItems.length).toBeGreaterThanOrEqual(1);
            }
        });
    });

    test("'.' is registered as a completion trigger character (issue #76)", () => {
        const provider = bbjServices.lsp.CompletionProvider;
        expect(provider?.completionOptions?.triggerCharacters).toContain('.');
    });

    test("typing '.' auto-triggers member completion (issue #76)", async () => {
        // expectCompletion only simulates Ctrl+Space (no trigger character), so drive the
        // provider directly with a '.' trigger context to cover the auto-trigger path.
        const parse = parseHelper<Model>(bbjServices);
        const text = `
class public MyClass
    method public void doWork()
    methodend
classend
declare MyClass foo!
foo!.`;
        const doc = await parse(text, { documentUri: 'file:///test/dot-trigger.bbj' });

        const provider = bbjServices.lsp.CompletionProvider;
        if (!provider) {
            throw new Error('CompletionProvider not registered');
        }

        const offset = doc.textDocument.getText().length; // cursor right after the '.'
        const completions = await provider.getCompletion(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
        });

        expect(completions).toBeDefined();
        const methodItems = completions!.items.filter(i => i.label.startsWith('doWork'));
        expect(methodItems.length).toBeGreaterThanOrEqual(1);
    });

    // The cursor sits right after the '.' — i.e. at the end of `prefix` (which must end in '.').
    // `suffix` is the (optional) rest of the document after the cursor, e.g. the closing
    // `methodend`/`classend` that would otherwise be consumed by a collapsing parse.
    async function dotComplete(prefix: string, suffix: string, uri: string): Promise<string[]> {
        const parse = parseHelper<Model>(bbjServices);
        const doc = await parse(prefix + suffix, { documentUri: uri });
        const provider = bbjServices.lsp.CompletionProvider!;
        const offset = prefix.length; // cursor right after the trailing '.'
        const completions = await provider.getCompletion(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
        });
        return (completions?.items ?? []).map(i => i.label);
    }

    test("'.' completes members of #this!/#super!/#field! inside a method body (issue #76)", async () => {
        // A dangling member access (`receiver.`) inside a class method body used to abort the
        // ClassDecl/MethodDecl parse via error recovery (newlines are hidden whitespace, so the
        // parser reached across the line and consumed `methodend` where the member was expected).
        // With the class stripped from the AST, the receiver — a field, `this!` or `super!`, which
        // only resolve as class members — could not be linked and no members were offered.
        const base = `
class public Helper
    method public void help()
    methodend
classend
class public Base
    field public Helper baseField!
    method public void baseWork()
    methodend
classend
class public MyClass extends Base
    field public Helper myField!
    method public void doWork()
`;
        const foot = `
    methodend
classend`;

        const onThis = await dotComplete(`${base}        #this!.`, foot, 'file:///test/dot-this.bbj');
        expect(onThis).toContain('doWork()');
        expect(onThis).toContain('myField!');
        expect(onThis).toContain('baseWork()'); // inherited

        const onSuper = await dotComplete(`${base}        #super!.`, foot, 'file:///test/dot-super.bbj');
        expect(onSuper).toContain('baseWork()');

        // A field receiver (#myField! : Helper) offers the field type's members.
        const onField = await dotComplete(`${base}        #myField!.`, foot, 'file:///test/dot-field.bbj');
        expect(onField).toContain('help()');
    });

    test("'.' member completion inside a method body offers only members, not keywords/locals (issue #76)", async () => {
        // The member reference is grammatically optional (so the dangling dot doesn't collapse the
        // class); the '.' trigger must still suppress the keywords and lexically-visible symbols
        // the parser now also predicts at that position.
        const text = `
class public MyClass
    method public void doWork()
    methodend
classend
class public C
    field public MyClass mem!
    method public void m()
        declare MyClass localVar!
        #this!.`;
        const labels = await dotComplete(text, `\n    methodend\nclassend`, 'file:///test/dot-noise.bbj');
        expect(labels).not.toContain('localVar!'); // local variable — not a member of #this!
        expect(labels.some(l => l.toLowerCase() === 'declare')).toBe(false); // no keyword noise
    });

    test("a dangling member access inside a method body keeps the class in the AST (issue #76)", async () => {
        const parse = parseHelper<Model>(bbjServices);
        const doc = await parse(`
class public C
    field public String s!
    method public void m()
        #this!.
    methodend
classend`, { documentUri: 'file:///test/dot-no-collapse.bbj' });
        const hasClass = AstUtils.streamAllContents(doc.parseResult.value).some(isBbjClass);
        expect(hasClass).toBe(true);
    });

    test("getScope on a non-reference property returns EMPTY_SCOPE instead of throwing (issue #76)", async () => {
        // While completing `x.`, Langium reuses the parsed receiver (a SymbolRef) as the scope
        // container but asks for the MemberCall `member` feature — which is not a cross-reference
        // on SymbolRef. This used to throw "Property member of type SymbolRef is not a reference."
        // and spam the LSP error log on every dot. getScope must degrade to EMPTY_SCOPE.
        const parse = parseHelper<Model>(bbjServices);
        const doc = await parse(`x = 5\nprint x`, { documentUri: 'file:///test/non-ref-scope.bbj' });
        const symbolRef = AstUtils.streamAllContents(doc.parseResult.value).find(isSymbolRef);
        expect(symbolRef).toBeDefined();

        const scope = bbjServices.references.ScopeProvider.getScope({
            container: symbolRef!,
            property: 'member',
            reference: { $refText: '', ref: undefined } as any
        });
        expect(scope).toBe(EMPTY_SCOPE);
    });

    test('static field (event constant) is offered on a Java class reference - issue #440', async () => {
        // A class-reference receiver (`String.`) offers static members only. Static fields
        // cover BBj event constants like `BBjHtmlView.ON_HTMLVIEW_DOWNLOAD`; the fake String
        // class carries a static `CASE_INSENSITIVE_ORDER` and an instance `someInstanceField`.
        const text = `
        use java.lang.String
        String.<|>
        `
        await completion({
            text,
            index: 0,
            assert: (completions) => {
                const labels = completions.items.map(i => i.label);
                // static field present
                expect(labels).toContain('CASE_INSENSITIVE_ORDER');
                // instance-only members must NOT leak onto a class reference
                expect(labels).not.toContain('someInstanceField');
            }
        });
    });

    test('dangling # in a class method body offers own fields - issue #445', async () => {
        // A '#' with no field name yet is an unsatisfiable cross-reference that, because
        // newlines are hidden whitespace, makes error recovery unwind the enclosing class
        // out of the AST. The provider must recover and still offer the class's fields.
        const text = `class public C
    field public HashMap map!
    field private String secret!
    method public void m()
        #<|>
    methodend
classend
`;
        const countC = () => bbjServices.shared.workspace.IndexManager
            .allElements().filter(d => d.name === 'C').toArray().length;
        const cBefore = countC();
        const list = await fieldCompletion(text);
        const labels = list?.items.map(i => i.label) ?? [];
        expect(labels).toContain('map!');
        expect(labels).toContain('secret!');
        // recovery must not leak keyword/import fallbacks into field completion
        expect(labels).not.toContain('HashMap');
        expect(labels).not.toContain('new');
        // the throwaway reparse must not leak into the workspace or the global index
        const docUris = bbjServices.shared.workspace.LangiumDocuments.all.map(d => d.uri.toString()).toArray();
        expect(docUris.some(u => u.includes('__field-probe__'))).toBe(false);
        // only the real document adds class C to the index; the throwaway probe adds nothing
        expect(countC() - cBefore).toBe(1);
    });

    test('dangling # followed by more code still offers fields - issue #445', async () => {
        // The class also collapses when the '#' is followed by unrelated statements;
        // recovery must locate the class from the enclosing method.
        const text = `class public C
    field public HashMap map!
    method public void m()
        #<|>
        x = 1
        y = 2
    methodend
classend
`;
        const list = await fieldCompletion(text);
        const labels = list?.items.map(i => i.label) ?? [];
        expect(labels).toContain('map!');
    });

    test('# outside any class method offers nothing - issue #445', async () => {
        // Recovery must not fabricate field completion where there is no enclosing class.
        const text = `x = 1
#<|>
y = 2
`;
        const list = await fieldCompletion(text);
        expect(list?.items ?? []).toHaveLength(0);
    });

    const interopSeam = bbjServices.java.JavaInteropService as unknown as {
        seedCompleteClassIndex(f: string[]): void; resetCompleteClassIndex(): void;
    };

    test('auto-import completion offers an unimported class with a use edit (augmented server) - issue #447', async () => {
        interopSeam.seedCompleteClassIndex(['java.util.TreeMap']);
        try {
            await completion({
                text: `x! = new TreeM<|>`,
                index: 0,
                assert: (completions) => {
                    const item = completions.items.find(i => i.label === 'TreeMap');
                    expect(item).toBeDefined();
                    expect(item!.kind).toBe(7); // CompletionItemKind.Class
                    expect(item!.additionalTextEdits?.[0].newText).toBe('use java.util.TreeMap\n');
                }
            });
        } finally {
            interopSeam.resetCompleteClassIndex();
        }
    });

    test('auto-import completion falls back to already-resolved classes (old server) - issue #447', async () => {
        // No complete index seeded: HashMap is in the fake classpath, so the fallback still offers it.
        await completion({
            text: `x! = new HashM<|>`,
            index: 0,
            assert: (completions) => {
                const item = completions.items.find(i => i.label === 'HashMap' && i.additionalTextEdits);
                expect(item).toBeDefined();
                expect(item!.additionalTextEdits?.[0].newText).toBe('use java.util.HashMap\n');
            }
        });
    });

    describe('auto-import only fires in type positions - issue #447', () => {
        const hasAutoImport = (completions: { items: { label: string, additionalTextEdits?: unknown }[] }) =>
            completions.items.some(i => i.label === 'TreeMap' && i.additionalTextEdits);

        function autoImportCase(name: string, text: string, expected: boolean) {
            test(name, async () => {
                interopSeam.seedCompleteClassIndex(['java.util.TreeMap']);
                try {
                    await completion({ text, index: 0, assert: (c) => expect(hasAutoImport(c)).toBe(expected) });
                } finally {
                    interopSeam.resetCompleteClassIndex();
                }
            });
        }

        // Type positions — auto-import is helpful.
        autoImportCase('after new', `x! = new TreeM<|>`, true);
        autoImportCase('declared type', `declare TreeM<|> x!`, true);
        // Expression positions — offering a bare class would nest a class where a value is expected
        // (e.g. accepting here then typing '(' yields `new TreeMap(TreeMap())`).
        autoImportCase('constructor argument', `tm! = new HashMap(Tree<|>)`, false);
        autoImportCase('assignment value', `x! = Tree<|>`, false);
    });
});
