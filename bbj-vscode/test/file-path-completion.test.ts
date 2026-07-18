import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { createBBjTestServices } from './bbj-test-module';
import { parseFilePathCompletionContext, parseRunCallFilePathContext } from '../src/language/bbj-completion-provider.js';
import { Model } from '../src/language/generated/ast.js';

describe('parseFilePathCompletionContext (issue #456)', () => {

    // Convenience: place the cursor at the `|` marker in the given line.
    function ctx(lineWithCaret: string) {
        const col = lineWithCaret.indexOf('|');
        return parseFilePathCompletionContext(lineWithCaret.replace('|', ''), col);
    }

    test('detects empty path right after the opening `::` of a use', () => {
        expect(ctx('use ::|')).toEqual({ typed: '', dir: '', prefix: '' });
    });

    test('splits a bare leaf prefix (no directory)', () => {
        expect(ctx('use ::uti|')).toEqual({ typed: 'uti', dir: '', prefix: 'uti' });
    });

    test('splits a directory portion from the leaf prefix', () => {
        expect(ctx('use ::util/fo|')).toEqual({ typed: 'util/fo', dir: 'util/', prefix: 'fo' });
    });

    test('a trailing slash yields an empty leaf prefix', () => {
        expect(ctx('use ::util/|')).toEqual({ typed: 'util/', dir: 'util/', prefix: '' });
    });

    test('supports nested directories', () => {
        expect(ctx('use ::a/b/c/le|')).toEqual({ typed: 'a/b/c/le', dir: 'a/b/c/', prefix: 'le' });
    });

    test('works for declare type references', () => {
        expect(ctx('declare ::util/fo|')).toEqual({ typed: 'util/fo', dir: 'util/', prefix: 'fo' });
    });

    test('is case-insensitive on the leading keyword', () => {
        expect(ctx('USE ::x|')).toEqual({ typed: 'x', dir: '', prefix: 'x' });
        expect(ctx('Declare ::x|')).toEqual({ typed: 'x', dir: '', prefix: 'x' });
    });

    test('allows leading indentation', () => {
        expect(ctx('    use ::x|')).toEqual({ typed: 'x', dir: '', prefix: 'x' });
    });

    test('handles backslash directory separators', () => {
        expect(ctx('use ::util\\fo|')).toEqual({ typed: 'util\\fo', dir: 'util\\', prefix: 'fo' });
    });

    test('returns undefined once the segment is closed (class-name portion)', () => {
        expect(ctx('use ::foo.bbj::Ba|')).toBeUndefined();
        expect(ctx('use ::foo.bbj::|')).toBeUndefined();
    });

    test('returns undefined before any opening `::`', () => {
        expect(ctx('use |')).toBeUndefined();
        expect(ctx('use foo|')).toBeUndefined();
    });

    test('returns undefined on non-use/declare lines', () => {
        expect(ctx('print ::x|')).toBeUndefined();
        expect(ctx('x = ::y|')).toBeUndefined();
    });

    test('does not treat a java-type use as a path position', () => {
        expect(ctx('use java.util.HashMap|')).toBeUndefined();
    });
});

describe('parseRunCallFilePathContext (issue #456)', () => {

    // Convenience: place the cursor at the `|` marker in the given line.
    function ctx(lineWithCaret: string) {
        const col = lineWithCaret.indexOf('|');
        return parseRunCallFilePathContext(lineWithCaret.replace('|', ''), col);
    }

    test('detects empty path right after the opening quote of a RUN', () => {
        expect(ctx('RUN "|')).toEqual({ typed: '', dir: '', prefix: '' });
    });

    test('splits a bare leaf prefix (no directory)', () => {
        expect(ctx('RUN "uti|')).toEqual({ typed: 'uti', dir: '', prefix: 'uti' });
    });

    test('splits a directory portion from the leaf prefix', () => {
        expect(ctx('RUN "util/foo|')).toEqual({ typed: 'util/foo', dir: 'util/', prefix: 'foo' });
    });

    test('matches CALL as well as RUN', () => {
        expect(ctx('CALL "prog|')).toEqual({ typed: 'prog', dir: '', prefix: 'prog' });
    });

    test('is case-insensitive on the leading verb', () => {
        expect(ctx('run "x|')).toEqual({ typed: 'x', dir: '', prefix: 'x' });
        expect(ctx('Call "x|')).toEqual({ typed: 'x', dir: '', prefix: 'x' });
    });

    test('allows leading indentation before the verb', () => {
        expect(ctx('    run "x|')).toEqual({ typed: 'x', dir: '', prefix: 'x' });
    });

    test('returns undefined when not inside a string', () => {
        // No opening quote at all.
        expect(ctx('RUN |')).toBeUndefined();
        // The string is already closed.
        expect(ctx('RUN "a.bbj" |')).toBeUndefined();
    });

    test('returns undefined for a later CALL argument string (comma before the open quote)', () => {
        expect(ctx('CALL "a.bbj", "|')).toBeUndefined();
    });

    test('returns undefined once the cursor is past a program::label separator', () => {
        expect(ctx('CALL "prog::la|')).toBeUndefined();
    });

    test('returns undefined on non-RUN/CALL lines', () => {
        expect(ctx('PRINT "x|')).toBeUndefined();
    });

    test('does not treat a run$/call$ variable assignment as the verb', () => {
        expect(ctx('run$="x|')).toBeUndefined();
        expect(ctx('call$ = "x|')).toBeUndefined();
    });
});

describe('file-path completion integration (issue #456)', () => {

    const services = createBBjTestServices(EmptyFileSystem);
    const bbjServices = services.BBj;
    const fsProvider = bbjServices.shared.workspace.FileSystemProvider;
    const provider = bbjServices.lsp.CompletionProvider!;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Directory layout used by the mock file system, keyed by absolute fsPath.
    const layout: Record<string, Array<{ name: string, dir: boolean }>> = {
        '/workspace/proj': [
            { name: 'util', dir: true },
            { name: 'foo.bbj', dir: false },
            { name: 'bar.bbj', dir: false },
            { name: 'readme.txt', dir: false }
        ],
        '/workspace/proj/util': [
            { name: 'helper.bbj', dir: false },
            { name: 'sub', dir: true }
        ]
    };

    function mockFs() {
        vi.spyOn(fsProvider, 'readDirectory').mockImplementation(async (uri: URI) => {
            const entries = layout[uri.fsPath];
            if (!entries) {
                throw new Error('ENOENT');
            }
            return entries.map(e => ({
                isFile: !e.dir,
                isDirectory: e.dir,
                uri: URI.file(uri.fsPath + '/' + e.name)
            }));
        });
    }

    let docCounter = 0;
    async function complete(text: string): Promise<{ label: string, kind?: number }[]> {
        const offset = text.indexOf('<|>');
        const clean = text.replace('<|>', '');
        // Unique filename per call (same directory) so documents don't collide in the store.
        const doc = await parseHelper<Model>(bbjServices)(
            clean, { documentUri: `file:///workspace/proj/main-${docCounter++}.bbj` });
        const params: CompletionParams = {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(offset),
            context: { triggerKind: CompletionTriggerKind.Invoked }
        };
        const list = await provider.getCompletion(doc, params);
        return (list?.items ?? []).map(i => ({ label: i.label, kind: i.kind }));
    }

    test('offers subdirectories and .bbj files, hides non-bbj files', async () => {
        mockFs();
        const items = await complete('use ::<|>');
        const labels = items.map(i => i.label);
        expect(labels).toContain('util/');
        expect(labels).toContain('foo.bbj');
        expect(labels).toContain('bar.bbj');
        expect(labels).not.toContain('readme.txt');
        // Directories carry the Folder kind (19), files the File kind (17).
        expect(items.find(i => i.label === 'util/')!.kind).toBe(19);
        expect(items.find(i => i.label === 'foo.bbj')!.kind).toBe(17);
    });

    test('filters by the typed leaf prefix (case-insensitive)', async () => {
        mockFs();
        const labels = (await complete('use ::FO<|>')).map(i => i.label);
        expect(labels).toContain('foo.bbj');
        expect(labels).not.toContain('bar.bbj');
        expect(labels).not.toContain('util/');
    });

    test('drills into a typed directory portion', async () => {
        mockFs();
        const labels = (await complete('use ::util/<|>')).map(i => i.label);
        expect(labels).toContain('helper.bbj');
        expect(labels).toContain('sub/');
        // Entries of the parent directory must not leak in.
        expect(labels).not.toContain('foo.bbj');
    });

    test('works for declare type references too', async () => {
        mockFs();
        const labels = (await complete('declare ::<|> x!')).map(i => i.label);
        expect(labels).toContain('foo.bbj');
        expect(labels).toContain('util/');
    });

    test('offers .bbj files and subdirectories inside a RUN string literal', async () => {
        mockFs();
        const items = await complete('run "<|>');
        const labels = items.map(i => i.label);
        expect(labels).toContain('util/');
        expect(labels).toContain('foo.bbj');
        expect(labels).toContain('bar.bbj');
        expect(labels).not.toContain('readme.txt');
        expect(items.find(i => i.label === 'util/')!.kind).toBe(19);
        expect(items.find(i => i.label === 'foo.bbj')!.kind).toBe(17);
    });

    test('offers the same enumeration inside a CALL string literal', async () => {
        mockFs();
        const labels = (await complete('call "<|>')).map(i => i.label);
        expect(labels).toContain('foo.bbj');
        expect(labels).toContain('util/');
    });

    test('does not fire for a second CALL argument string', async () => {
        const spy = vi.spyOn(fsProvider, 'readDirectory');
        await complete('call "a.bbj", "<|>');
        expect(spy).not.toHaveBeenCalled();
    });

    test('resolves relative to configured PREFIX paths', async () => {
        vi.spyOn(bbjServices.shared.workspace.FileSystemProvider, 'readDirectory')
            .mockImplementation(async (uri: URI) => {
                if (uri.fsPath === '/prefix/lib') {
                    return [{ isFile: true, isDirectory: false, uri: URI.file('/prefix/lib/pfx.bbj') }];
                }
                throw new Error('ENOENT');
            });
        // WorkspaceManager is the BBjWorkspaceManager; getSettings returns the prefixes.
        const wsManager = bbjServices.shared.workspace.WorkspaceManager as unknown as {
            getSettings(): { prefixes: string[], classpath: string[] } | undefined
        };
        vi.spyOn(wsManager, 'getSettings').mockReturnValue({ prefixes: ['/prefix/lib'], classpath: [] });

        const labels = (await complete('use ::<|>')).map(i => i.label);
        expect(labels).toContain('pfx.bbj');
    });

    test('does not offer files after the closing `::` (class-name portion)', async () => {
        const spy = vi.spyOn(fsProvider, 'readDirectory');
        // The default provider handles class completion here; our path completion must not fire.
        await complete('use ::foo.bbj::Ba<|>');
        expect(spy).not.toHaveBeenCalled();
    });

    test('a file-system error yields an empty list, never a throw', async () => {
        vi.spyOn(fsProvider, 'readDirectory').mockRejectedValue(new Error('boom'));
        const items = await complete('use ::<|>');
        expect(items).toEqual([]);
    });
});
