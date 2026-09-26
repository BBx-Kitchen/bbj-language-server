import { DocumentState, DocumentValidator, LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { Model } from '../../src/language/generated/ast.js';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { JavadocProvider } from '../../src/language/java-javadoc.js';
import { JavaSyntheticDocUri } from '../../src/language/java-interop.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';

/**
 * End-to-end verification against the LIVE java-interop service (real BBjAPI, not the fake test
 * classpath). Skipped unless a java-interop service is reachable on :5008 (or RUN_BBJ_TESTS is
 * set). Proves the literal `BBjAPI().anyInvalidMethod()` example from the criterion the check
 * exists for: an unknown method or field on the real BBjAPI class is one Error, and a real member
 * such as getSysGui stays clean.
 */
describe('Unknown Java member on the real BBjAPI class (real interop)', async () => {
    const run = await shouldRunBBjTests();

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

        // BBjAPI is loaded as part of the implicit imports the real extension preloads before any
        // reference is validated. In this bare harness that preload may not have completed (or
        // may still be a cold/in-flight resolution missing its member `$container` links), so
        // follow the same loading sequence bbj-ws-manager.ts uses and poll for it, exactly like
        // issue440-real-interop.test.ts warms up BBjHtmlView.
        if (!interop.getResolvedClass('BBjAPI')) {
            await interop.loadImplicitImports();
        }

        // bbj-linker.ts resolves a bare `BBjAPI()` call by looking BBjAPI up in the shared
        // IndexManager, not in the interop service's own resolved-class cache -- in the real
        // extension the classpath document is already indexed by the time any reference links,
        // because loadImplicitImports() runs before the workspace's initial document build. This
        // bare harness has no real workspace folder to build from, so that initial build indexed
        // the (still-empty) classpath document before loadImplicitImports() above populated it;
        // reindex it now the same way a fresh build would, purely from its already-parsed content
        // (no file read, so the missing workspace folder does not matter here).
        const classpathDoc = services.shared.workspace.LangiumDocuments.all
            .find(d => d.uri.toString() === JavaSyntheticDocUri);
        if (classpathDoc) {
            await services.shared.workspace.IndexManager.updateContent(classpathDoc);
            classpathDoc.state = DocumentState.IndexedContent;
        }

        for (let i = 0; i < 90; i++) {
            const klass = interop.getResolvedClass('BBjAPI');
            const method = klass?.methods?.find(m => m.name.toLowerCase() === 'getsysgui');
            if (klass && !klass.error && method?.$container) return;
            await new Promise(r => setTimeout(r, 1000));
        }
    }, 120000);

    function unknownMemberDiagnostics(document: LangiumDocument): Diagnostic[] {
        return (document.diagnostics ?? []).filter(d => d.data?.code === 'bbj-unknown-java-member');
    }

    function linkingDiagnostics(document: LangiumDocument): Diagnostic[] {
        return (document.diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
    }

    test.runIf(run)('BBjAPI().anyInvalidMethod() is one Error, not a linking warning', async () => {
        const document = await validate('BBjAPI().anyInvalidMethod()\n');
        const matches = unknownMemberDiagnostics(document);
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].message).toBe("Method 'anyInvalidMethod' is not defined on BBjAPI");
        expect(linkingDiagnostics(document).some(d => d.message.includes('anyInvalidMethod'))).toBe(false);
    }, 60000);

    test.runIf(run)('x! = BBjAPI().anyInvalidMethod() is one Error', async () => {
        const document = await validate('x! = BBjAPI().anyInvalidMethod()\n');
        const matches = unknownMemberDiagnostics(document);
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].message).toBe("Method 'anyInvalidMethod' is not defined on BBjAPI");
    }, 60000);

    test.runIf(run)('an assigned BBjAPI() variable still gets the Error on an unknown method', async () => {
        const document = await validate('api! = BBjAPI()\napi!.anyInvalidMethod()\n');
        const matches = unknownMemberDiagnostics(document);
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].message).toBe("Method 'anyInvalidMethod' is not defined on BBjAPI");
    }, 60000);

    test.runIf(run)('a real BBjAPI method stays clean', async () => {
        const document = await validate('bbjApiHandle! = BBjAPI()\nsysGuiHandle! = bbjApiHandle!.getSysGui()\n');
        expect((document.diagnostics ?? []).some(d => d.message.includes('getSysGui'))).toBe(false);
    }, 60000);

    test.runIf(run)('a java.lang.Object receiver never gets the new Error (an array is legitimately reachable through it)', async () => {
        // Found via the live-backend corpus review: a variable declared as the universal
        // java.lang.Object supertype can legitimately hold an array at runtime (Java's own
        // array-to-Object covariance), whose own .length pseudo-field Object's own member list
        // has no record of -- no member call on a bare Object receiver is ever certain to be
        // missing. The test double has no fake java.lang.Object class to reproduce this against,
        // so this guard can only be proven end to end here.
        const document = await validate('declare java.lang.Object o!\nx! = o!.length\n');
        expect(unknownMemberDiagnostics(document).some(d => d.message.includes('length'))).toBe(false);
    }, 60000);
});
