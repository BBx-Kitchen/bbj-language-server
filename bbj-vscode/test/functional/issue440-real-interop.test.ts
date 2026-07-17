import { DocumentValidator, LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Model } from '../../src/language/generated/ast.js';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { JavadocProvider } from '../../src/language/java-javadoc.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';

/**
 * End-to-end verification for issue #440 against the LIVE java-interop service
 * (real `BBjHtmlView`, not the fake test classpath). Skipped unless a java-interop
 * service is reachable on :5008 (or RUN_BBJ_TESTS is set).
 *
 * Event constants such as `BBjHtmlView.ON_HTMLVIEW_DOWNLOAD` are `public static final int`
 * fields (inherited from `SysGuiEventConstants`). Accessing them via the class name must
 * resolve without a linking error, matching Java semantics for `ClassName.STATIC_FIELD`.
 */
describe('Issue #440 - event constants on Java class references (real interop)', async () => {
    const run = await shouldRunBBjTests();
    const HTML_VIEW_FQN = 'com.basis.bbj.proxies.sysgui.BBjHtmlView';

    const services = createBBjServices(NodeFileSystem);
    const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

    beforeAll(async () => {
        if (!run) return;
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        const interop = services.BBj.java.JavaInteropService;
        interop.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);

        // Warm up BBjHtmlView. The real extension pre-loads the classpath (loadClasspath →
        // loadImplicitImports) so the class is fully resolved AND linked to the classpath
        // document before any reference is validated. In this bare harness we resolve it on
        // demand; because it carries 536 fields, the first resolution can exceed the 30s
        // per-chain timeout and return a not-yet-linked class. The background resolveClass
        // keeps running and eventually links members to their document, so poll for that.
        await interop.resolveClassByName(HTML_VIEW_FQN);
        for (let i = 0; i < 90; i++) {
            const klass = await interop.getResolvedClass(HTML_VIEW_FQN);
            const field = klass?.fields?.find(f => f.name === 'ON_HTMLVIEW_DOWNLOAD');
            if (field?.$container) return;
            await new Promise(r => setTimeout(r, 1000));
        }
    }, 120000);

    function linkingErrors(document: LangiumDocument) {
        return document.diagnostics?.filter(err => err.data?.code === DocumentValidator.LinkingError) ?? [];
    }

    test.runIf(run)('BBjHtmlView.ON_HTMLVIEW_DOWNLOAD resolves as a static event constant', async () => {
        const document = await validate(`
            use ${HTML_VIEW_FQN}
            ON_DOWNLOAD = BBjHtmlView.ON_HTMLVIEW_DOWNLOAD
        `);
        const errs = linkingErrors(document).map(e => e.message);
        expect(errs.join('\n')).not.toContain('ON_HTMLVIEW_DOWNLOAD');
        expect(errs).toHaveLength(0);
    }, 60000);
});
