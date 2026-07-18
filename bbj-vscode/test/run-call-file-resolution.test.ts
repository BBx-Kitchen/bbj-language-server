import { EmptyFileSystem, URI, LangiumDocument } from 'langium';
import { WorkspaceFolder } from 'vscode-languageserver';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager';
import { Model } from '../src/language/generated/ast';

/**
 * Issue #173: filenames in RUN and CALL that are given as static string literals should be flagged
 * when they cannot be resolved relative to the current file's directory, a workspace/project root,
 * or a PREFIX directory. Dynamic targets (concatenations/variables) must not be flagged.
 */

function fileNotResolvedWarnings(doc: LangiumDocument) {
    return (doc.diagnostics ?? []).filter(d => d.message.includes('could not be resolved in the project directory'));
}

describe('RUN/CALL file resolution (#173)', () => {
    const services = createBBjServices(EmptyFileSystem);
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
        expect(fileNotResolvedWarnings(doc).map(d => d.message).join('\n')).toBe('');
    });

    test('CALL target resolving against the current file directory produces no warning', async () => {
        const doc = await parse(`CALL "helper.bbj"`, {
            documentUri: URI.file('/root/app/main-samedir.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => d.message).join('\n')).toBe('');
    });

    test('unresolvable RUN target is flagged as a warning', async () => {
        const doc = await parse(`RUN "does-not-exist.bbj"`, {
            documentUri: URI.file('/root/app/main-missing.bbj').toString(),
            validation: true,
        });
        const warnings = fileNotResolvedWarnings(doc);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].message).toContain("'does-not-exist.bbj'");
    });

    test('the "program::label" entry point is stripped before resolution', async () => {
        const doc = await parse(`CALL "missing.bbj::setUp", A$`, {
            documentUri: URI.file('/root/app/main-label.bbj').toString(),
            validation: true,
        });
        const warnings = fileNotResolvedWarnings(doc);
        expect(warnings).toHaveLength(1);
        // The label part must not appear in the reported path.
        expect(warnings[0].message).toContain("'missing.bbj'");
        expect(warnings[0].message).not.toContain('::setUp');
    });

    test('dynamic RUN target (concatenation) is not flagged', async () => {
        const doc = await parse(`A$ = "does-not-exist.bbj"\nRUN "./"+A$`, {
            documentUri: URI.file('/root/app/main-dynamic.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => d.message).join('\n')).toBe('');
    });
});

describe('RUN/CALL file resolution is inert without project context', () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    });

    test('no warning when there is no workspace folder or PREFIX', async () => {
        const doc = await parse(`RUN "does-not-exist.bbj"`, {
            documentUri: URI.file('/loose/main.bbj').toString(),
            validation: true,
        });
        expect(fileNotResolvedWarnings(doc).map(d => d.message).join('\n')).toBe('');
    });
});
