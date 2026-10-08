import { EmptyFileSystem, URI, LangiumDocument } from 'langium';
import { Diagnostic, WorkspaceFolder } from 'vscode-languageserver';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';

/**
 * Issue #173: filenames in RUN and CALL that are given as static string literals should be flagged
 * when they cannot be resolved the way BBj resolves them: against the working directory (the
 * workspace/project root that contains the file) and then each PREFIX directory. A name that is
 * only present next to the calling file is therefore flagged, while the root-relative path is
 * not. Dynamic targets (concatenations/variables) must not be flagged.
 */

function fileNotResolvedWarnings(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => Diagnostic.getMessageString(d).includes('could not be resolved in the project directory'));
}

describe('RUN/CALL file resolution (#173)', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
        // Simulate an open workspace rooted at /root.
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const folders: WorkspaceFolder[] = [{ uri: URI.file('/root').toString(), name: 'root' }];
        (wsManager as unknown as { folders: WorkspaceFolder[] }).folders = folders;

        // Target programs indexed into the workspace so `hasDocument` resolves them.
        await parse(`print "sub"`, { documentUri: URI.file('/root/lib/sub.bbj').toString(), validation: false });
        await parse(`print "helper"`, { documentUri: URI.file('/root/app/helper.bbj').toString(), validation: false });
    });

    test('RUN target resolving against the project root produces no warning', async () => {
        const doc = await parse(`RUN "lib/sub.bbj"`, {
            documentUri: URI.file('/root/app/main-root.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => Diagnostic.getMessageString(d)).join('\n')).toBe('');
    });

    test('CALL target that only exists next to the calling file is flagged', async () => {
        const doc = await parse(`CALL "helper.bbj"`, {
            documentUri: URI.file('/root/app/main-samedir.bbj').toString(),
            validation: true,
        });
        const warnings = fileNotResolvedWarnings(doc);
        expect(warnings).toHaveLength(1);
        expect(Diagnostic.getMessageString(warnings[0])).toContain("'helper.bbj'");
    });

    test('CALL target given relative to the project root produces no warning', async () => {
        const doc = await parse(`CALL "app/helper.bbj"`, {
            documentUri: URI.file('/root/app/main-rootrel.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => Diagnostic.getMessageString(d)).join('\n')).toBe('');
    });

    test('unresolvable RUN target is flagged as a warning', async () => {
        const doc = await parse(`RUN "does-not-exist.bbj"`, {
            documentUri: URI.file('/root/app/main-missing.bbj').toString(),
            validation: true,
        });
        const warnings = fileNotResolvedWarnings(doc);
        expect(warnings).toHaveLength(1);
        expect(Diagnostic.getMessageString(warnings[0])).toContain("'does-not-exist.bbj'");
    });

    test('the "program::label" entry point is stripped before resolution', async () => {
        const doc = await parse(`CALL "missing.bbj::setUp", A$`, {
            documentUri: URI.file('/root/app/main-label.bbj').toString(),
            validation: true,
        });
        const warnings = fileNotResolvedWarnings(doc);
        expect(warnings).toHaveLength(1);
        // The label part must not appear in the reported path.
        expect(Diagnostic.getMessageString(warnings[0])).toContain("'missing.bbj'");
        expect(Diagnostic.getMessageString(warnings[0])).not.toContain('::setUp');
    });

    test('dynamic RUN target (concatenation) is not flagged', async () => {
        const doc = await parse(`A$ = "does-not-exist.bbj"\nRUN "./"+A$`, {
            documentUri: URI.file('/root/app/main-dynamic.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => Diagnostic.getMessageString(d)).join('\n')).toBe('');
    });
});

describe('RUN/CALL file resolution is inert without project context', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    });

    test('no warning when there is no workspace folder or PREFIX', async () => {
        const doc = await parse(`RUN "does-not-exist.bbj"`, {
            documentUri: URI.file('/loose/main.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => Diagnostic.getMessageString(d)).join('\n')).toBe('');
    });
});
