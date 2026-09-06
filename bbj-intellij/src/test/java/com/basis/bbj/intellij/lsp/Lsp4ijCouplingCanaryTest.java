package com.basis.bbj.intellij.lsp;

import com.intellij.icons.AllIcons;
import com.intellij.psi.PsiFile;
import com.redhat.devtools.lsp4ij.LanguageServerFactory;
import com.redhat.devtools.lsp4ij.LanguageServerManager;
import com.redhat.devtools.lsp4ij.ServerStatus;
import com.redhat.devtools.lsp4ij.client.LanguageClientImpl;
import com.redhat.devtools.lsp4ij.client.features.LSPClientFeatures;
import com.redhat.devtools.lsp4ij.client.features.LSPCompletionFeature;
import com.redhat.devtools.lsp4ij.client.features.LSPDocumentLinkFeature;
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider;
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionItemKind;
import org.eclipse.lsp4j.InitializeParams;
import org.jetbrains.annotations.ApiStatus;
import org.junit.jupiter.api.Test;

import javax.swing.Icon;
import java.lang.annotation.Retention;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static com.basis.bbj.intellij.lsp.Lsp4ijClassFileMarkers.EXPERIMENTAL_DESCRIPTOR;
import static com.basis.bbj.intellij.lsp.Lsp4ijClassFileMarkers.referencesAnnotation;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Reflective signature canaries and class-file marker assertions for every LSP4IJ member this
 * plugin overrides or calls (#544, closing #554 as a subset). Every lookup names its
 * exact parameter and return types, so a breaking signature change fails a test here instead of
 * failing only at run time in a live IDE. Measured against the LSP4IJ 0.21.0 jar pinned in
 * {@code build.gradle.kts}; bumping that pin should re-run this whole class against the new jar.
 */
class Lsp4ijCouplingCanaryTest {

    @Test
    void theExperimentalMarkerIsRetainedInTheClassFileOnlyWhichIsWhyThisTestReadsBytecode() {
        Retention retention = ApiStatus.Experimental.class.getAnnotation(Retention.class);
        assertNotNull(retention, "ApiStatus.Experimental must itself carry a @Retention meta-annotation");
        assertEquals(java.lang.annotation.RetentionPolicy.CLASS, retention.value(),
            "ApiStatus.Experimental has class-file-only retention, which is why the rest of this "
                + "class reads bytecode instead of calling isAnnotationPresent");

        // The trap, made executable: a runtime annotation lookup answers false whether or not the
        // marker is present on a class with CLASS retention. LSPCompletionFeature genuinely does
        // carry the marker (see theThreeFeatureClassesStillCarryTheExperimentalMarker below), yet
        // this reflective check reports it absent -- proving why the rest of this class must read
        // the class file instead of trusting isAnnotationPresent.
        assertFalse(LSPCompletionFeature.class.isAnnotationPresent(ApiStatus.Experimental.class),
            "a runtime annotation lookup for a CLASS-retention marker always answers false, even "
                + "though the class file itself references the descriptor");
    }

    @Test
    void theThreeFeatureClassesStillCarryTheExperimentalMarker() {
        // The literal #554 acceptance target: these three classes were experimental when #554 was
        // filed. A false here means the vendor graduated the API to stable, and every canary in
        // this class needs a deliberate re-audit against the new, non-experimental contract.
        assertTrue(referencesAnnotation(LSPCompletionFeature.class, EXPERIMENTAL_DESCRIPTOR),
            "LSPCompletionFeature no longer references the experimental marker -- re-audit #554");
        assertTrue(referencesAnnotation(LSPClientFeatures.class, EXPERIMENTAL_DESCRIPTOR),
            "LSPClientFeatures no longer references the experimental marker -- re-audit #554");
        assertTrue(referencesAnnotation(LSPDocumentLinkFeature.class, EXPERIMENTAL_DESCRIPTOR),
            "LSPDocumentLinkFeature no longer references the experimental marker -- re-audit #554");
    }

    @Test
    void theOtherCoupledVendorClassesCarryNoExperimentalMarker() {
        // Asserting the absences too, not just the presences: a newly-marked class here also
        // means a deliberate re-audit, since this plugin relies on these members staying stable.
        assertFalse(referencesAnnotation(LanguageClientImpl.class, EXPERIMENTAL_DESCRIPTOR),
            "LanguageClientImpl is now marked experimental -- re-audit this coupling");
        assertFalse(referencesAnnotation(LanguageServerFactory.class, EXPERIMENTAL_DESCRIPTOR),
            "LanguageServerFactory is now marked experimental -- re-audit this coupling");
        assertFalse(referencesAnnotation(LanguageServerManager.class, EXPERIMENTAL_DESCRIPTOR),
            "LanguageServerManager is now marked experimental -- re-audit this coupling");
        assertFalse(referencesAnnotation(ServerStatus.class, EXPERIMENTAL_DESCRIPTOR),
            "ServerStatus is now marked experimental -- re-audit this coupling");
        assertFalse(referencesAnnotation(StreamConnectionProvider.class, EXPERIMENTAL_DESCRIPTOR),
            "StreamConnectionProvider is now marked experimental -- re-audit this coupling");
        assertFalse(referencesAnnotation(OSProcessStreamConnectionProvider.class, EXPERIMENTAL_DESCRIPTOR),
            "OSProcessStreamConnectionProvider is now marked experimental -- re-audit this coupling");
    }

    @Test
    void exercisingGetIconTheLSPClientFeaturesBuilderChainAndLSPDocumentLinkFeatureIsSupported() throws NoSuchMethodException {
        Method getIcon = LSPCompletionFeature.class.getMethod("getIcon", CompletionItem.class);
        assertEquals(Icon.class, getIcon.getReturnType());
        assertTrue(Modifier.isPublic(getIcon.getModifiers()));

        Method initializeParams = LSPClientFeatures.class.getMethod("initializeParams", InitializeParams.class);
        assertEquals(void.class, initializeParams.getReturnType());

        Method setDocumentLinkFeature = LSPClientFeatures.class.getMethod(
            "setDocumentLinkFeature", LSPDocumentLinkFeature.class);
        assertEquals(LSPClientFeatures.class, setDocumentLinkFeature.getReturnType());

        Method setCompletionFeature = LSPClientFeatures.class.getMethod(
            "setCompletionFeature", LSPCompletionFeature.class);
        assertEquals(LSPClientFeatures.class, setCompletionFeature.getReturnType());

        Method isSupported = LSPDocumentLinkFeature.class.getMethod("isSupported", PsiFile.class);
        assertEquals(boolean.class, isSupported.getReturnType());
        assertTrue(Modifier.isPublic(isSupported.getModifiers()));
    }

    @Test
    void theCompletionFeatureIsAssignableFromOurSubclass() {
        assertTrue(LSPCompletionFeature.class.isAssignableFrom(BbjCompletionFeature.class));
        assertTrue(LanguageClientImpl.class.isAssignableFrom(BbjLanguageClient.class));
        assertTrue(OSProcessStreamConnectionProvider.class.isAssignableFrom(BbjLanguageServer.class));
        assertTrue(LanguageServerFactory.class.isAssignableFrom(BbjLanguageServerFactory.class));
    }

    /**
     * A probe, not a behavioural assertion: touches one concrete platform icon field and, if that
     * succeeds, constructs {@link BbjCompletionFeature} and calls {@code getIcon} once. Whether
     * this passes or throws headless decides whether the fuller icon-behaviour test is writable at
     * all (the outcome either way is recorded in the plan's SUMMARY).
     */
    @Test
    void theIconMappingProbe() {
        assertDoesNotThrow(() -> {
            Icon probeIcon = AllIcons.Nodes.Method;
            assertNotNull(probeIcon, "AllIcons.Nodes.Method resolved to null");

            BbjCompletionFeature feature = new BbjCompletionFeature();
            CompletionItem item = new CompletionItem();
            item.setKind(CompletionItemKind.Method);
            item.setDetail(null);
            Icon icon = feature.getIcon(item);
            assertNotNull(icon, "getIcon returned null for a mapped kind");
        });
    }

    /**
     * The probe above passed headless, so this behavioural test is writable. Covers every kind
     * {@link BbjCompletionFeature#getIcon} maps to a concrete icon
     * field, with and without the Java-interop detail heuristic. Deliberately excludes the default
     * branch (delegates to the vendor superclass) and the null-kind early return -- both need a
     * running {@code Application} to resolve, which is exactly the branch this probe could not
     * reach headless.
     */
    @Test
    void theIconMappingCoversEveryKindItMapsExplicitlyWithAndWithoutTheJavaInteropDetail() {
        BbjCompletionFeature feature = new BbjCompletionFeature();

        // Every kind the plain (non-Java-interop) switch maps to a concrete icon field.
        CompletionItemKind[] mappedKinds = {
            CompletionItemKind.Function, CompletionItemKind.Method, CompletionItemKind.Class,
            CompletionItemKind.Interface, CompletionItemKind.Variable, CompletionItemKind.Field,
            CompletionItemKind.Property, CompletionItemKind.Keyword, CompletionItemKind.Constant,
            CompletionItemKind.Enum, CompletionItemKind.EnumMember, CompletionItemKind.Module,
            CompletionItemKind.Snippet, CompletionItemKind.Event,
        };
        for (CompletionItemKind kind : mappedKinds) {
            CompletionItem item = new CompletionItem();
            item.setKind(kind);
            Icon icon = feature.getIcon(item);
            assertNotNull(icon, "getIcon returned null for mapped kind " + kind);
        }

        // The four kinds isJavaInteropCompletion recognises. Measured directly against
        // BbjCompletionFeature.getIcon rather than assumed: a Java-interop detail is expected to
        // select a different icon than a null detail for Class, Method and Function, but NOT for
        // Interface -- its Java-interop branch maps to the identical AllIcons.Nodes.Interface field
        // as its plain branch, so a detail never changes Interface's icon. This is recorded as a
        // discrepancy from the plan's literal wording in the plan's SUMMARY.
        Map<CompletionItemKind, Boolean> detailChangesIcon = Map.of(
            CompletionItemKind.Class, true,
            CompletionItemKind.Interface, false,
            CompletionItemKind.Method, true,
            CompletionItemKind.Function, true
        );
        for (Map.Entry<CompletionItemKind, Boolean> entry : detailChangesIcon.entrySet()) {
            CompletionItemKind kind = entry.getKey();
            boolean expectDifferent = entry.getValue();

            CompletionItem withoutDetail = new CompletionItem();
            withoutDetail.setKind(kind);
            withoutDetail.setDetail(null);
            Icon iconWithoutDetail = feature.getIcon(withoutDetail);

            CompletionItem withJavaDetail = new CompletionItem();
            withJavaDetail.setKind(kind);
            withJavaDetail.setDetail("java.lang.String");
            Icon iconWithJavaDetail = feature.getIcon(withJavaDetail);

            CompletionItem withUnrelatedDetail = new CompletionItem();
            withUnrelatedDetail.setKind(kind);
            withUnrelatedDetail.setDetail("a plain BBj detail with none of the heuristic substrings");
            Icon iconWithUnrelatedDetail = feature.getIcon(withUnrelatedDetail);

            if (expectDifferent) {
                assertNotSame(iconWithoutDetail, iconWithJavaDetail,
                    "expected a Java-interop detail to change the icon for kind " + kind);
            } else {
                assertSame(iconWithoutDetail, iconWithJavaDetail,
                    "expected kind " + kind + "'s Java-interop branch to map to the same icon field "
                        + "as its plain branch");
            }
            assertSame(iconWithoutDetail, iconWithUnrelatedDetail,
                "a detail matching none of the heuristic's substrings must select the same icon as "
                    + "a null detail for kind " + kind);
        }
    }

    @Test
    void theServerStatusConstantsThisPluginBranchesOnStillExist() {
        // Look each up by name so a rename fails; the plugin branches on exactly these four.
        for (String name : new String[] {"stopped", "starting", "started", "stopping"}) {
            assertDoesNotThrow(() -> ServerStatus.valueOf(name),
                "ServerStatus no longer declares the constant '" + name + "' this plugin branches on");
        }
        // Measured against the 0.21.0 jar: nine constants exist today, not the four this plugin
        // branches on -- five install-lifecycle states (none, checking_installed, installing,
        // installed, not_installed) were added upstream since #554 was filed. Asserting the full
        // count, not just the four this plugin uses, means a tenth constant is also noticed.
        assertEquals(9, ServerStatus.values().length,
            "ServerStatus's constant count changed since it was last measured -- re-audit whether "
                + "this plugin needs to branch on the new value(s)");
    }

    @Test
    void theLanguageServerManagerMembersThisPluginCallsStillExist() throws NoSuchMethodException {
        Method getInstance = LanguageServerManager.class.getMethod("getInstance",
            com.intellij.openapi.project.Project.class);
        assertEquals(LanguageServerManager.class, getInstance.getReturnType());

        Method start = LanguageServerManager.class.getMethod("start", String.class);
        assertEquals(void.class, start.getReturnType());

        Method stop = LanguageServerManager.class.getMethod("stop", String.class);
        assertEquals(void.class, stop.getReturnType());

        Method getLanguageServer = LanguageServerManager.class.getMethod("getLanguageServer", String.class);
        assertEquals(CompletableFuture.class, getLanguageServer.getReturnType());
    }

    @Test
    void theClientMembersThisPluginOverridesStillExist() throws NoSuchMethodException {
        // createSettings and handleServerStatusChanged are declared on the superclass, and this
        // plugin overrides both, so a superclass-level lookup is the one this canary must pin.
        Method createSettings = LanguageClientImpl.class.getDeclaredMethod("createSettings");
        assertEquals(Object.class, createSettings.getReturnType());

        Method handleServerStatusChanged = LanguageClientImpl.class.getMethod(
            "handleServerStatusChanged", ServerStatus.class);
        assertEquals(void.class, handleServerStatusChanged.getReturnType());

        assertDoesNotThrow(() -> LanguageClientImpl.class.getConstructor(
            com.intellij.openapi.project.Project.class));
    }

    @Test
    void theConnectionProviderMembersThisPluginUsesStillExist() throws NoSuchMethodException {
        Method setCommandLine = OSProcessStreamConnectionProvider.class.getMethod(
            "setCommandLine", com.intellij.execution.configurations.GeneralCommandLine.class);
        assertEquals(void.class, setCommandLine.getReturnType());

        assertTrue(StreamConnectionProvider.class.isAssignableFrom(OSProcessStreamConnectionProvider.class));
    }

    @Test
    void theFactoryInterfaceMembersThisPluginImplementsStillExist() throws NoSuchMethodException {
        Method createConnectionProvider = LanguageServerFactory.class.getMethod(
            "createConnectionProvider", com.intellij.openapi.project.Project.class);
        assertEquals(StreamConnectionProvider.class, createConnectionProvider.getReturnType());

        Method createLanguageClient = LanguageServerFactory.class.getMethod(
            "createLanguageClient", com.intellij.openapi.project.Project.class);
        assertEquals(LanguageClientImpl.class, createLanguageClient.getReturnType());

        Method getServerInterface = LanguageServerFactory.class.getMethod("getServerInterface");
        assertEquals(Class.class, getServerInterface.getReturnType());

        Method createClientFeatures = LanguageServerFactory.class.getMethod("createClientFeatures");
        assertEquals(LSPClientFeatures.class, createClientFeatures.getReturnType());
    }
}
