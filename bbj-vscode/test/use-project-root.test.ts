import { EmptyFileSystem, URI, LangiumDocument } from 'langium';
import { WorkspaceFolder } from 'vscode-languageserver';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { DocumentValidator } from 'langium';
import { createBBjServices } from '../src/language/bbj-module';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager';
import { Model } from '../src/language/generated/ast';

/**
 * Regression for #378: a relative `use ::subdir/file.bbj::Class` from a program in a
 * subfolder must resolve against the workspace/project root, not only the current file's
 * directory. Previously it only searched `<current-file-dir>/subdir/file.bbj` (and PREFIXes),
 * so a project-root-relative USE from a nested file failed to resolve.
 */

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

function linkingErrors(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
}
function fileNotResolvedErrors(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => d.message.includes('could not be resolved'));
}

describe('USE resolves relative to the project root (#378)', () => {
    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        // Simulate an open workspace rooted at /root (initializeWorkspace([]) leaves folders
        // empty in this harness, so set it directly).
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [{ uri: URI.file('/root').toString(), name: 'root' }];
        (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;

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
        expect(fileNotResolvedErrors(consumer).map(d => d.message).join('\n')).toBe('');
        // ...and the class/constructor/method must all link.
        expect(linkingErrors(consumer).map(d => d.message).join('\n')).toBe('');
    });
});
