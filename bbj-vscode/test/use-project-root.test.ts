import { EmptyFileSystem, URI, LangiumDocument } from 'langium';
import { Diagnostic, WorkspaceFolder } from 'vscode-languageserver';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { DocumentValidator } from 'langium';
import { createBBjTestServices } from './bbj-test-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';
import {
    programPathBaseDirectories,
    programPathCandidates,
    programWorkingDirectory
} from '../src/language/program-path-resolution.js';

/**
 * A relative `use ::path::Class` is resolved the way BBj resolves it at runtime: against the
 * working directory first (the workspace root that contains the program), then each PREFIX
 * directory. The program's own directory is not a candidate, except as the working directory of
 * a document that lies under no workspace root. Regression coverage for #378 (a project-root
 * relative USE from a nested file resolves) and for the stricter rule that a same-directory
 * path is no longer accepted from a nested file.
 */

const services = createBBjTestServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

function linkingErrors(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
}
function fileNotResolvedErrors(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => Diagnostic.getMessageString(d).includes('could not be resolved'));
}
function messages(diagnostics: Diagnostic[]): string {
    return diagnostics.map(d => Diagnostic.getMessageString(d)).join('\n');
}

function setWorkspaceFolders(testServices: typeof services, roots: string[]) {
    const wsManager = testServices.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    const folders: WorkspaceFolder[] = roots.map(root => ({ uri: URI.file(root).toString(), name: root }));
    // initializeWorkspace([]) leaves folders empty in this harness, so set them directly.
    (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;
}

const fsPaths = (uris: URI[]) => uris.map(u => u.fsPath);

describe('program path resolution helpers', () => {
    const root = URI.file('/root');

    test('working directory is the workspace root that contains the document', () => {
        expect(programWorkingDirectory(URI.file('/root/subdir/prog.bbj'), [root]).fsPath).toBe('/root');
    });

    test('nested roots: the deepest containing root wins', () => {
        const roots = [URI.file('/root'), URI.file('/root/sub')];
        expect(programWorkingDirectory(URI.file('/root/sub/x.bbj'), roots).fsPath).toBe('/root/sub');
        expect(programWorkingDirectory(URI.file('/root/other/x.bbj'), roots).fsPath).toBe('/root');
    });

    test('containment is by path segment, not string prefix', () => {
        expect(programWorkingDirectory(URI.file('/root2/x.bbj'), [root]).fsPath).toBe('/root2');
    });

    test('a document under no root, or with no roots, gets its own directory', () => {
        expect(programWorkingDirectory(URI.file('/elsewhere/dir/x.bbj'), [root]).fsPath).toBe('/elsewhere/dir');
        expect(programWorkingDirectory(URI.file('/loose/x.bbj'), []).fsPath).toBe('/loose');
    });

    test('a non-file document URI gets its own directory', () => {
        const doc = URI.parse('memory:///virtual/x.bbj');
        expect(programWorkingDirectory(doc, [root]).path).toBe('/virtual');
    });

    test('candidates: working directory first, then PREFIX, never the program directory', () => {
        const candidates = programPathCandidates('Lib.bbj', URI.file('/root/subdir/prog.bbj'), [root], ['/pfx']);
        expect(fsPaths(candidates)).toEqual(['/root/Lib.bbj', '/pfx/Lib.bbj']);
    });

    test('candidates: a PREFIX candidate that escapes its root is dropped', () => {
        const candidates = programPathCandidates('../x.bbj', URI.file('/root/subdir/prog.bbj'), [root], ['/pfx']);
        expect(fsPaths(candidates)).toEqual(['/x.bbj']);
    });

    test('base directories: working directory then PREFIX, blank prefixes skipped', () => {
        const bases = programPathBaseDirectories(URI.file('/root/subdir/prog.bbj'), [root], ['/pfx', '', '  ']);
        expect(fsPaths(bases)).toEqual(['/root', '/pfx']);
    });
});

describe('USE resolves against the working directory (#378)', () => {
    const sampleServices = createBBjTestServices(EmptyFileSystem);
    const sampleParse = parseHelper<Model>(sampleServices.BBj);
    const target = (name: string) =>
        `class public ${name}\n    method public void sayHello()\n    methodend\nclassend`;

    beforeAll(async () => {
        await sampleServices.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        setWorkspaceFolders(sampleServices, ['/root']);
        await sampleParse(target('SomeClass'), { documentUri: URI.file('/root/SomeClass.bbj').toString(), validation: false });
        await sampleParse(target('OtherClass'), { documentUri: URI.file('/root/subdir/OtherClass.bbj').toString(), validation: false });
        await sampleParse(target('Lib'), { documentUri: URI.file('/elsewhere/Lib.bbj').toString(), validation: false });
    });

    test('a root-relative USE from a subdirectory resolves class, constructor and method', async () => {
        const doc = await sampleParse(
            `use ::SomeClass.bbj::SomeClass\n\nx! = new SomeClass()\nx!.sayHello()`,
            { documentUri: URI.file('/root/subdir/prog-root.bbj').toString(), validation: true }
        );
        expect(doc.parseResult.parserErrors).toHaveLength(0);
        expect(messages(fileNotResolvedErrors(doc))).toBe('');
        expect(messages(linkingErrors(doc))).toBe('');
    });

    test('a same-directory USE from a subdirectory is flagged after the full build', async () => {
        const doc = await sampleParse(
            `use ::OtherClass.bbj::OtherClass\n\nx! = new OtherClass()\nx!.sayHello()`,
            { documentUri: URI.file('/root/subdir/prog-samedir.bbj').toString(), validation: true }
        );
        const flagged = fileNotResolvedErrors(doc).filter(d => d.severity === 1);
        expect(flagged).toHaveLength(1);
        expect(Diagnostic.getMessageString(flagged[0])).toMatch(/^File 'OtherClass\.bbj' could not be resolved/);
    });

    test('the same class addressed by its root-relative path is clean', async () => {
        const doc = await sampleParse(
            `use ::subdir/OtherClass.bbj::OtherClass\n\nx! = new OtherClass()\nx!.sayHello()`,
            { documentUri: URI.file('/root/subdir/prog-rootrel.bbj').toString(), validation: true }
        );
        expect(messages(fileNotResolvedErrors(doc))).toBe('');
        expect(messages(linkingErrors(doc))).toBe('');
    });

    test('a document outside every root falls back to its own directory', async () => {
        const doc = await sampleParse(
            `use ::Lib.bbj::Lib\n\nx! = new Lib()\nx!.sayHello()`,
            { documentUri: URI.file('/elsewhere/main.bbj').toString(), validation: true }
        );
        expect(messages(fileNotResolvedErrors(doc))).toBe('');
        expect(messages(linkingErrors(doc))).toBe('');
    });
});

describe('USE with no workspace folders falls back to the file directory', () => {
    const looseServices = createBBjTestServices(EmptyFileSystem);
    const looseParse = parseHelper<Model>(looseServices.BBj);

    beforeAll(async () => {
        await looseServices.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        await looseParse(
            `class public Helper\n    method public void sayHello()\n    methodend\nclassend`,
            { documentUri: URI.file('/loose/Helper.bbj').toString(), validation: false }
        );
    });

    test('a sibling file resolves', async () => {
        const doc = await looseParse(
            `use ::Helper.bbj::Helper\n\nx! = new Helper()\nx!.sayHello()`,
            { documentUri: URI.file('/loose/main.bbj').toString(), validation: true }
        );
        expect(messages(fileNotResolvedErrors(doc))).toBe('');
        expect(messages(linkingErrors(doc))).toBe('');
    });
});

describe('USE resolves relative to the project root (#378)', () => {
    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        setWorkspaceFolders(services, ['/root']);

        // Target class lives at <root>/lib/MyClass.bbj
        await parse(`class public MyClass\n    method public void doWork()\n    methodend\nclassend`, {
            documentUri: URI.file('/root/lib/MyClass.bbj').toString(),
            validation: false,
        });
    });

    test('project-root-relative USE from a nested file resolves the class', async () => {
        // Consumer sits in a *different* subfolder; the USE path is relative to the project root.
        const consumer = await parse(`use ::lib/MyClass.bbj::MyClass\n\nx! = new MyClass()\nx!.doWork()`, {
            documentUri: URI.file('/root/app/main.bbj').toString(),
            validation: true,
        });
        expect(consumer.parseResult.parserErrors).toHaveLength(0);
        // The USE file-path diagnostic must not fire...
        expect(messages(fileNotResolvedErrors(consumer))).toBe('');
        // ...and the class/constructor/method must all link.
        expect(messages(linkingErrors(consumer))).toBe('');
    });
});
