import { AstUtils, EmptyFileSystem, URI } from 'langium';
import { parseHelper } from 'langium/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module.js';
import { BBjServiceRegistry } from '../src/language/bbj-service-registry.js';
import {
    isBbjClass, isBBjTypeRef, isConstructorCall, isUse, isVariableDecl, Model
} from '../src/language/generated/ast.js';

/**
 * Regression harness for #527: two file-path-qualified class references on one line used to
 * collapse into a single greedy `BBjFilePath` token, silently losing a declaration, merging two
 * USE statements, or swallowing the IMPLEMENTS keyword into the EXTENDS path. None of these
 * shapes produced a lexer or parser error on the buggy grammar, so every assertion here checks
 * AST shape, not just the absence of errors.
 *
 * `lib1`/`lib2` below have no file extension, so they are registered through
 * {@link BBjServiceRegistry.registerUseTarget}, the same seam the document builder uses to serve
 * BBj services to an extensionless PREFIX program (#688).
 */
describe('Two file-path-qualified class references on one line (#527)', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    let parse: ReturnType<typeof parseHelper<Model>>;

    const lib1Uri = URI.parse('file:///issue527/lib1');
    const lib2Uri = URI.parse('file:///issue527/lib2');

    beforeAll(async () => {
        const registry = services.shared.ServiceRegistry;
        if (!(registry instanceof BBjServiceRegistry)) {
            throw new Error('Expected the shared ServiceRegistry to be a BBjServiceRegistry');
        }
        parse = parseHelper<Model>(services.BBj);

        registry.registerUseTarget(lib1Uri);
        const lib1 = await parse(`
            class public ClassA
            classend
        `, { documentUri: lib1Uri.toString() });
        expect(lib1.parseResult.lexerErrors).toEqual([]);
        expect(lib1.parseResult.parserErrors).toEqual([]);

        registry.registerUseTarget(lib2Uri);
        const lib2 = await parse(`
            class public ClassB
            classend
        `, { documentUri: lib2Uri.toString() });
        expect(lib2.parseResult.lexerErrors).toEqual([]);
        expect(lib2.parseResult.parserErrors).toEqual([]);
    });

    test('the #527 line parses as two declarations, each resolving into its own lib document', async () => {
        const document = await parse('declare ::lib1::ClassA a; declare ::lib2::ClassB b', {
            documentUri: 'file:///issue527/main.bbj',
            validation: true,
        });
        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);

        const decls = AstUtils.streamAllContents(document.parseResult.value)
            .filter(isVariableDecl)
            .toArray();
        expect(decls.map(d => d.name)).toEqual(['a', 'b']);

        const expected: Record<string, { refText: string; className: string; libUri: string }> = {
            a: { refText: '::lib1::ClassA', className: 'ClassA', libUri: lib1Uri.toString() },
            b: { refText: '::lib2::ClassB', className: 'ClassB', libUri: lib2Uri.toString() },
        };
        for (const decl of decls) {
            const exp = expected[decl.name];
            const type = decl.type;
            if (!isBBjTypeRef(type)) {
                throw new Error(`Expected ${decl.name}'s type to be a BBjTypeRef`);
            }
            expect(type.klass.$refText).toBe(exp.refText);
            expect(type.klass.ref?.name).toBe(exp.className);
            expect(AstUtils.getDocument(type.klass.ref!).uri.toString()).toBe(exp.libUri);
        }

        const messages = (document.diagnostics ?? []).map(d => Diagnostic.getMessageString(d)).join('\n');
        expect(messages).toBe('');
    });

    test('the regression file pins every two-path shape at token and AST level', async () => {
        const filePath = path.join(__dirname, 'test-data', 'issue527-declare-file-paths.bbj');
        const text = fs.readFileSync(filePath, 'utf-8');

        const lexResult = services.BBj.parser.Lexer.tokenize(text);
        const filePathImages = lexResult.tokens
            .filter(t => t.tokenType.name === 'BBjFilePath')
            .map(t => t.image);
        expect(filePathImages).toEqual([
            '::a.bbj::', '::b.bbj::',
            '::lib1::', '::lib2::',
            '::C:\\lib\\x.bbj::', '::C:\\lib\\x.bbj::', '::D:\\lib\\y.bbj::',
            '::a::', '::b::',
            '::a::', '::b::',
        ]);

        const document = await parse(text, {
            documentUri: 'file:///issue527/regression.bbj',
            validation: false,
        });
        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);

        const uses = AstUtils.streamAllContents(document.parseResult.value).filter(isUse).toArray();
        expect(uses.map(u => u.bbjFilePath)).toEqual(['::a.bbj::', '::b.bbj::']);

        const decls = AstUtils.streamAllContents(document.parseResult.value)
            .filter(isVariableDecl)
            .toArray();
        const declRefTexts: Record<string, string> = {};
        for (const decl of decls) {
            const type = decl.type;
            declRefTexts[decl.name] = isBBjTypeRef(type) ? type.klass.$refText : '';
        }
        expect(declRefTexts).toEqual({
            a: '::lib1::ClassA',
            b: '::lib2::ClassB',
            c: '::C:\\lib\\x.bbj::ClassA',
            d: '::C:\\lib\\x.bbj::ClassA',
            e: '::D:\\lib\\y.bbj::ClassB',
            x: '::a::A',
        });

        const calls = AstUtils.streamAllContents(document.parseResult.value)
            .filter(isConstructorCall)
            .toArray();
        const callRefTexts = calls
            .map(c => (isBBjTypeRef(c.klass) ? c.klass.klass.$refText : undefined))
            .filter((t): t is string => t !== undefined);
        expect(callRefTexts).toEqual(['::b::B']);

        const classes = AstUtils.streamAllContents(document.parseResult.value)
            .filter(isBbjClass)
            .toArray();
        const twoPaths = classes.find(c => c.name === 'TwoPaths');
        if (!twoPaths) {
            throw new Error('Expected a TwoPaths class in the regression file');
        }
        const extendsRefTexts = twoPaths.extends
            .map(q => (isBBjTypeRef(q) ? q.klass.$refText : undefined))
            .filter((t): t is string => t !== undefined);
        const implementsRefTexts = twoPaths.implements
            .map(q => (isBBjTypeRef(q) ? q.klass.$refText : undefined))
            .filter((t): t is string => t !== undefined);
        expect(extendsRefTexts).toEqual(['::a::A']);
        expect(implementsRefTexts).toEqual(['::b::B']);
    });
});
