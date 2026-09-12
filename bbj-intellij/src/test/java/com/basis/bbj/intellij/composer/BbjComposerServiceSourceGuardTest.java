package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #612 composer handle cache wiring: the project service is registered exactly once,
 * subscribes to the server status topic and invalidates the cache from that subscription with no
 * direct catalogs fetch, {@link ComposerFlow} reads server and catalogs from the cache and clears
 * it once from its own single terminal handler before notifying, {@link ComposerLauncher} goes
 * through the cache rather than the old per-call {@code server(project)} facade, and the two
 * actions that must stay untouched still call that unchanged static facade.
 */
class BbjComposerServiceSourceGuardTest {

    private static final Path SERVICE_SOURCE = mainSource("composer", "BbjComposerService.java");
    private static final Path FLOW_SOURCE = mainSource("composer", "ComposerFlow.java");
    private static final Path LAUNCHER_SOURCE = mainSource("composer", "ComposerLauncher.java");
    private static final Path COMPILE_ACTION_SOURCE = mainSource("actions", "BbjCompileAction.java");
    private static final Path REFRESH_ACTION_SOURCE = mainSource("actions", "BbjRefreshJavaClassesAction.java");
    private static final Path PLUGIN_XML =
            Paths.get("src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();

    private static Path mainSource(String pkg, String fileName) {
        return Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij", pkg, fileName)
                .toAbsolutePath();
    }

    private static String readSource(Path path) {
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
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden or counted literal
     * (for example this class's own javadoc) can never trip a count-based assertion. Applied ahead
     * of every count-based assertion in this class without exception.
     */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    @Test
    void pluginXmlRegistersTheComposerServiceExactlyOnce() {
        String text = readSource(PLUGIN_XML);
        assertEquals(1, countOccurrences(text, "composer.BbjComposerService"),
                "the composer handle cache's project service must be registered exactly once");
    }

    @Test
    void theServiceSubscribesOnceAndInvalidatesFromThatSubscriptionWithNoDirectCatalogsFetch() {
        String text = withoutCommentLines(readSource(SERVICE_SOURCE));

        assertEquals(1, countOccurrences(text, "getMessageBus().connect(this)"),
                "the service must connect to the message bus exactly once, in its own constructor");
        assertEquals(1, countOccurrences(text, "BbjServerService.BbjServerStatusListener.TOPIC"),
                "the service must subscribe to the server status topic exactly once");
        assertTrue(countOccurrences(text, "handles.invalidate()") >= 1,
                "the status subscription must clear the cache on any status change");
        assertEquals(1, countOccurrences(text, "new ComposerHandleCache("),
                "the service must own exactly one cache instance");
        assertEquals(1, countOccurrences(text, ".start("),
                "resolveServer(...) must still start the server exactly once");
        assertEquals(1, countOccurrences(text, ".getLanguageServer("),
                "resolveServer(...) must still resolve the language server proxy exactly once");
        assertEquals(0, countOccurrences(text, "composerCatalogs"),
                "the status subscription must never request catalogs -- catalogs are fetched lazily "
                        + "on the first composer open after each server start (D-17)");
    }

    @Test
    void theFlowSeamHasNoDirectCatalogsFetchAndInvalidatesOnceInsideItsOwnTerminalHandler() {
        String text = readSource(FLOW_SOURCE);

        assertEquals(0, countOccurrences(text, "composerCatalogs"),
                "the flow seam must read catalogs from the cache, never request them directly");
        assertEquals(1, countOccurrences(text, "handles.invalidate()"),
                "exactly one invalidate() call must exist, inside the single terminal handler");

        int launchStart = text.indexOf("public <D> CompletableFuture<Void> launch(");
        int launchEnd = text.indexOf("private static final class EmptyPreviewException");
        assertTrue(launchStart >= 0 && launchEnd > launchStart, "the launch() method must be found intact");
        String launchMethod = text.substring(launchStart, launchEnd);

        int handleIndex = launchMethod.indexOf("handle(");
        int invalidateIndex = launchMethod.indexOf("handles.invalidate()");
        int firstNotifierAccept = launchMethod.indexOf("notifier.accept(");
        assertTrue(handleIndex >= 0 && invalidateIndex > handleIndex,
                "handles.invalidate() must sit inside the terminal handle(...) callback");
        assertTrue(firstNotifierAccept > invalidateIndex,
                "handles.invalidate() must run before the first notifier.accept( call, clearing the "
                        + "cache before the balloon is shown so the Retry resolves from scratch");
    }

    @Test
    void theLauncherGoesThroughTheCacheRatherThanTheOldPerCallServerFacade() {
        String text = readSource(LAUNCHER_SOURCE);

        assertEquals(1, countOccurrences(text, "BbjComposerService.handles(project)"),
                "the launcher must resolve the cache exactly once per launchAt(...) call");
        assertEquals(0, countOccurrences(text, "BbjComposerService.server("),
                "the launcher must no longer call the per-call server(project) facade");
    }

    @Test
    void theTwoUnrelatedActionsStillUseTheUnchangedStaticFacade() {
        String compileActionText = readSource(COMPILE_ACTION_SOURCE);
        String refreshActionText = readSource(REFRESH_ACTION_SOURCE);

        assertEquals(1, countOccurrences(compileActionText, "BbjComposerService.server(project)"),
                "BbjCompileAction must keep calling the unchanged static facade with no edit");
        assertEquals(1, countOccurrences(refreshActionText, "BbjComposerService.server(project)"),
                "BbjRefreshJavaClassesAction must keep calling the unchanged static facade with no edit");
    }
}
