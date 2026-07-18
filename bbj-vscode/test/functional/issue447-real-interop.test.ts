import { DocumentValidator, LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { CodeAction, CodeActionParams } from 'vscode-languageserver';
import { Model } from '../../src/language/generated/ast.js';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { JavadocProvider } from '../../src/language/java-javadoc.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';

/**
 * End-to-end verification for issue #447 against the LIVE java-interop service on :5008.
 * `java.util.HashMap` is not an implicit import, so the missing-`use` quick-fix depends on
 * the targeted candidate probe (resolveClassCandidatesBySimpleName) actually resolving
 * `java.util.HashMap` from the real classpath. Skipped unless interop is reachable.
 */
describe('Issue #447 - suggest missing use statements (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createBBjServices(NodeFileSystem);
    const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

    beforeAll(async () => {
        if (!run) return;
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);
    }, 120000);

    function linkingErrors(document: LangiumDocument) {
        return document.diagnostics?.filter(err => err.data?.code === DocumentValidator.LinkingError) ?? [];
    }

    test.runIf(run)('probe resolves HashMap to java.util.HashMap from the real classpath', async () => {
        const candidates = await services.BBj.java.JavaInteropService.resolveClassCandidatesBySimpleName('HashMap');
        expect(candidates).toContain('java.util.HashMap');
    }, 60000);

    test.runIf(run)("offers 'use java.util.HashMap' for an unresolved HashMap reference", async () => {
        const doc = await validate('hm! = new HashMap()\n');
        const linking = linkingErrors(doc);
        expect(linking.some(d => d.message.includes('HashMap'))).toBe(true);

        const params: CodeActionParams = {
            textDocument: { uri: doc.textDocument.uri },
            range: linking[0].range,
            context: { diagnostics: linking }
        };
        const actions = (await services.BBj.lsp.CodeActionProvider!.getCodeActions(doc, params) ?? []) as CodeAction[];
        expect(actions.map(a => a.title)).toContain("Add 'use java.util.HashMap'");
    }, 60000);
});
