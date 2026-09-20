package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Scoped structural guards on this plugin's own LSP4IJ override sites -- the source-guard half
 * that sits beside {@link Lsp4ijCouplingCanaryTest}'s reflective signature canaries. Every
 * assertion runs inside a located method-body window rather than searching the whole file, except
 * the fully-qualified-reference counts, which are explicitly whole-file because that is exactly
 * the property the allowlist fence's fully-qualified branch depends on.
 */
class Lsp4ijOverrideSiteSourceGuardTest {

    private static final Path FACTORY_SOURCE = mainSource("lsp", "BbjLanguageServerFactory.java");
    private static final Path CLIENT_SOURCE = mainSource("lsp", "BbjLanguageClient.java");
    private static final Path COMPLETION_FEATURE_SOURCE = mainSource("lsp", "BbjCompletionFeature.java");
    private static final Path COMPOSER_SERVICE_SOURCE = mainSource("composer", "BbjComposerService.java");
    private static final Path RUN_ACTION_BASE_SOURCE = mainSource("actions", "BbjRunActionBase.java");
    private static final Path COMPILE_ACTION_SOURCE = mainSource("actions", "BbjCompileAction.java");

    private static Path mainSource(String pkg, String fileName) {
        return Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij", pkg, fileName)
            .toAbsolutePath();
    }

    private static String readGuardedSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    /**
     * Locates a method by a declaration substring, then returns the text from its opening brace
     * to its matching closing brace via brace counting. Fails the test, naming the searched
     * declaration, when the declaration or a balanced closing brace cannot be found.
     */
    private static String bodyOf(String text, String declarationSubstring) {
        int declIndex = text.indexOf(declarationSubstring);
        assertTrue(declIndex >= 0, "declaration not found: " + declarationSubstring);
        int openBrace = text.indexOf('{', declIndex);
        assertTrue(openBrace >= 0, "no opening brace found after declaration: " + declarationSubstring);
        int depth = 0;
        for (int i = openBrace; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(openBrace, i + 1);
                }
            }
        }
        fail("no matching closing brace found for declaration: " + declarationSubstring);
        throw new AssertionError("unreachable");
    }

    @Test
    void getServerInterfaceReturnsBbjComposerServerClassExactlyOnce() {
        String text = readGuardedSource(FACTORY_SOURCE);
        String body = bodyOf(text, "public @NotNull Class<? extends LanguageServer> getServerInterface()");
        assertEquals(1, countOccurrences(body, "BbjComposerServer.class"),
            "getServerInterface() must return BbjComposerServer.class exactly once");
    }

    @Test
    void createClientFeaturesBuildsExactlyOneDocumentLinkFeatureThenOneCompletionFeatureWithOneInitializeParamsOverride() {
        String text = readGuardedSource(FACTORY_SOURCE);
        String body = bodyOf(text, "public @NotNull LSPClientFeatures createClientFeatures()");

        assertEquals(1, countOccurrences(body, "setDocumentLinkFeature("),
            "createClientFeatures() must call setDocumentLinkFeature( exactly once");
        assertEquals(1, countOccurrences(body, "setCompletionFeature("),
            "createClientFeatures() must call setCompletionFeature( exactly once");
        assertTrue(body.indexOf("setDocumentLinkFeature(") < body.indexOf("setCompletionFeature("),
            "setDocumentLinkFeature( must be called before setCompletionFeature( in the builder chain");
        assertEquals(1, countOccurrences(body, "public void initializeParams("),
            "createClientFeatures()'s anonymous LSPClientFeatures must override initializeParams(...) exactly once");
    }

    @Test
    void createConnectionProviderConstructsBbjLanguageServerAndCreateLanguageClientConstructsBbjLanguageClient() {
        String text = readGuardedSource(FACTORY_SOURCE);

        String connectionProviderBody = bodyOf(text,
            "public @NotNull StreamConnectionProvider createConnectionProvider(@NotNull Project project)");
        assertEquals(1, countOccurrences(connectionProviderBody, "new BbjLanguageServer("),
            "createConnectionProvider() must construct BbjLanguageServer exactly once");

        String languageClientBody = bodyOf(text,
            "public @NotNull LanguageClientImpl createLanguageClient(@NotNull Project project)");
        assertEquals(1, countOccurrences(languageClientBody, "new BbjLanguageClient("),
            "createLanguageClient() must construct BbjLanguageClient exactly once");
    }

    @Test
    void handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater() {
        String text = readGuardedSource(CLIENT_SOURCE);
        String body = bodyOf(text, "public void handleServerStatusChanged(ServerStatus serverStatus)");

        assertEquals(1, countOccurrences(body, "super.handleServerStatusChanged("),
            "handleServerStatusChanged(...) must call super.handleServerStatusChanged( exactly once");
        assertEquals(1, countOccurrences(body, "invokeLater("),
            "handleServerStatusChanged(...) must dispatch its own work through invokeLater( exactly once");
    }

    @Test
    void clientFeaturesHandleServerStatusChangedIsTheSingleStatusFeedSite() {
        String text = readGuardedSource(FACTORY_SOURCE);
        String body = bodyOf(text, "public void handleServerStatusChanged(@NotNull ServerStatus status)");

        assertEquals(1, countOccurrences(body, "super.handleServerStatusChanged("),
            "the client-features override must call super.handleServerStatusChanged( exactly once");
        assertEquals(1, countOccurrences(body, "invokeLater("),
            "the client-features override must dispatch its whole body through invokeLater( exactly "
                + "once, keeping BbjServerService's non-volatile fields on the EDT (Option B)");
        assertEquals(1, countOccurrences(body, "updateStatus("),
            "the client-features override must be the single authoritative status-feed site, "
                + "calling updateStatus( exactly once");
        assertTrue(countOccurrences(body, "isDisposed()") >= 2,
            "the client-features override must guard both the outer resolution and the invokeLater "
                + "lambda's own body with isDisposed()");
    }

    @Test
    void theLanguageClientOverrideNoLongerFeedsTheServerService() {
        String text = readGuardedSource(CLIENT_SOURCE);
        String body = bodyOf(text, "public void handleServerStatusChanged(ServerStatus serverStatus)");

        assertEquals(0, countOccurrences(body, "updateStatus("),
            "the language-client override must no longer feed BbjServerService -- a second status "
                + "feed site would double-process every attached transition");
        assertEquals(1, countOccurrences(body, "logToConsole("),
            "the language-client override must keep its console log line");
    }

    @Test
    void completionFeatureOverridesGetIconOnceAndEveryDelegationPointCallsSuper() {
        String text = readGuardedSource(COMPLETION_FEATURE_SOURCE);
        assertEquals(1, countOccurrences(text, "@Override\n    public @Nullable Icon getIcon("),
            "BbjCompletionFeature must override getIcon(...) exactly once");

        String body = bodyOf(text, "public @Nullable Icon getIcon(@NotNull CompletionItem item)");
        // Three delegation points inside the method window: the null-kind early return plus each
        // of the two switch statements' default branches -- all three call super.getIcon(item).
        assertEquals(3, countOccurrences(body, "super.getIcon(item)"),
            "the null-kind early return and both switch statements' default branches must all "
                + "delegate to super.getIcon(item)");
    }

    @Test
    void composerServiceStartsTheServerBeforeResolvingTheLanguageServerProxy() {
        String text = readGuardedSource(COMPOSER_SERVICE_SOURCE);
        String body = bodyOf(text,
            "private static @NotNull CompletableFuture<BbjComposerServer> resolveServer(@NotNull Project project)");

        int startIndex = body.indexOf(".start(");
        int getLanguageServerIndex = body.indexOf(".getLanguageServer(");
        assertTrue(startIndex >= 0, ".start( not found in resolveServer(...)'s body");
        assertTrue(getLanguageServerIndex >= 0, ".getLanguageServer( not found in resolveServer(...)'s body");
        assertTrue(startIndex < getLanguageServerIndex,
            "resolveServer(...) must call the manager's start( before getLanguageServer(");
    }

    @Test
    void theTwoActionFilesReferenceServerStatusByFullyQualifiedNameExactlyTwiceEach() {
        // Whole-file counts, not a method-body window: this is exactly the property
        // Lsp4ijImportAllowlistTest's fully-qualified branch depends on, so both occurrences
        // (the type reference and the constant comparison) are counted across the whole file.
        String runActionText = readGuardedSource(RUN_ACTION_BASE_SOURCE);
        String compileActionText = readGuardedSource(COMPILE_ACTION_SOURCE);

        assertEquals(2, countOccurrences(runActionText, "com.redhat.devtools.lsp4ij.ServerStatus"),
            "BbjRunActionBase.java must reference ServerStatus by its fully qualified name exactly twice");
        assertEquals(2, countOccurrences(compileActionText, "com.redhat.devtools.lsp4ij.ServerStatus"),
            "BbjCompileAction.java must reference ServerStatus by its fully qualified name exactly twice");
    }
}
