import { DocumentValidator, LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { CodeAction, CodeActionParams } from 'vscode-languageserver';
import { Model } from '../../src/language/generated/ast.js';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { JavadocProvider } from '../../src/language/java-javadoc.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';
import { createFakePeerServices } from '../fake-interop-peer.js';

/**
 * Verification for issue #447 (suggest missing `use` statements) across three layers of
 * confidence in the getAllClassNames class-index capability:
 *   1. A definitive test against the LIVE java-interop service on :5008: the client's
 *      capability is judged against the request actually observed on the wire, rather than
 *      an invariant that holds regardless of what the backend answers.
 *   2. A forced-fallback test against the live backend: a test-only connection wrapper makes
 *      getAllClassNames answer MethodNotFound while every other request still reaches the
 *      real socket, exercising the real fallback latch and the curated-package probe against
 *      the real classpath.
 *   3. An ungated, hermetic forced-fallback case built on the scriptable fake peer
 *      (fake-interop-peer.ts), which always answers getAllClassNames with MethodNotFound, so
 *      the fallback latch and probe are pinned deterministically in every environment,
 *      including CI with nothing listening on :5008.
 * The existing code-action test (layer 1) is unaffected in substance.
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

    test.runIf(run)('capability detection: the index probe and the cached flag agree, and suggestions work either way', async () => {
        const interop = services.BBj.java.JavaInteropService;
        // The deployed backend may or may not expose the augmented getAllClassNames endpoint --
        // that is an environment fact, not a product invariant. Either way, the probe's answer
        // and the cached capability flag must agree, and suggestions must resolve regardless.
        const hasCompleteIndex = await interop.ensureCompleteClassIndex();
        expect(typeof hasCompleteIndex).toBe('boolean');
        expect(interop.hasCompleteClassIndex()).toBe(hasCompleteIndex);
        const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
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

/**
 * Layer 3: hermetic forced fallback. Runs everywhere, including CI with nothing on :5008 --
 * the scriptable fake peer always answers getAllClassNames with a MethodNotFound error
 * (fake-interop-peer.ts), so this pins the real fallback latch and the curated-package probe
 * deterministically, independent of whether a real backend is reachable.
 */
describe('Issue #447 - forced fallback with no backend (hermetic)', () => {
    test('a getAllClassNames MethodNotFound latches once and the candidate probe still resolves java.util.HashMap', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;

        const first = await interop.ensureCompleteClassIndex();
        expect(first).toBe(false);
        const second = await interop.ensureCompleteClassIndex();
        expect(second).toBe(false);
        expect(interop.hasCompleteClassIndex()).toBe(false);
        expect(interop.sentRequests.filter(r => r.method === 'getAllClassNames')).toHaveLength(1);

        const beforeProbe = interop.sentRequests.length;
        const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
        const classInfoNames = interop.sentRequests.slice(beforeProbe)
            .filter(r => r.method === 'getClassInfo')
            .map(r => (r.params as { className: string }).className);
        expect(classInfoNames).toContain('java.util.HashMap');
        expect(classInfoNames).toContain('java.io.HashMap');
        expect(candidates).toContain('java.util.HashMap');
        expect(interop.sentRequests.filter(r => r.method === 'getAllClassNames')).toHaveLength(1);
    });

    test('a seeded index answers without probing', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        interop.seedCompleteClassIndex(['java.util.HashMap']);

        const beforeProbe = interop.sentRequests.length;
        const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
        expect(candidates).toEqual(['java.util.HashMap']);
        expect(interop.sentRequests.slice(beforeProbe).some(r => r.method === 'getClassInfo')).toBe(false);
    });
});
