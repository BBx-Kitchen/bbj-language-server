package com.basis.bbj.intellij.denum;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the project-level refresher behind the line-numbered banner: a single
 * document listener whose lifetime is the service, a BBj filter ahead of any scheduling, guards
 * against a closed project, per-file refreshes only, and lazy creation from the banner provider.
 */
class BbjLineNumberedBannerRefresherSourceGuardTest {

    private static final Path REFRESHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "denum",
            "BbjLineNumberedBannerRefresher.java")
            .toAbsolutePath();
    private static final Path PROVIDER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij",
            "BbjLineNumberedNotificationProvider.java")
            .toAbsolutePath();
    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml")
            .toAbsolutePath();

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read " + path, e);
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

    /** The brace-delimited body that follows the first occurrence of {@code declarationSubstring}. */
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

    /** Strips comments while keeping string and character literals intact. */
    private static String stripComments(String source) {
        StringBuilder result = new StringBuilder(source.length());
        int i = 0;
        int n = source.length();
        while (i < n) {
            char c = source.charAt(i);
            if (c == '/' && i + 1 < n && source.charAt(i + 1) == '/') {
                int end = source.indexOf('\n', i);
                if (end == -1) {
                    break;
                }
                i = end;
                continue;
            }
            if (c == '/' && i + 1 < n && source.charAt(i + 1) == '*') {
                int end = source.indexOf("*/", i + 2);
                i = (end == -1) ? n : end + 2;
                continue;
            }
            if (c == '"' || c == '\'') {
                char quote = c;
                result.append(c);
                i++;
                while (i < n) {
                    char sc = source.charAt(i);
                    result.append(sc);
                    i++;
                    if (sc == '\\' && i < n) {
                        result.append(source.charAt(i));
                        i++;
                        continue;
                    }
                    if (sc == quote) {
                        break;
                    }
                }
                continue;
            }
            result.append(c);
            i++;
        }
        return result.toString();
    }

    @Test
    void theRefresherIsADisposableServiceWithOneListenerAndOneAlarmParentedToItself() {
        String stripped = stripComments(readSource(REFRESHER_SOURCE));

        assertEquals(1, countOccurrences(stripped, "implements Disposable"),
                "the refresher must be a Disposable so the platform disposes it with the project");
        assertEquals(1, countOccurrences(stripped, "addDocumentListener("),
                "exactly one document listener per project");
        String constructor = bodyOf(stripped, "public BbjLineNumberedBannerRefresher(");
        int add = constructor.indexOf("addDocumentListener(");
        assertTrue(add >= 0, "the listener must be registered in the constructor");
        assertTrue(constructor.indexOf(", this)", add) > add,
                "the listener must be parented to the service so it is removed with it");
        assertEquals(1, countOccurrences(stripped, "new AlarmScheduler(this)"),
                "the alarm must be parented to the service");
        assertEquals(1, countOccurrences(stripped, "new DirtyFileCoalescer<"),
                "refreshes must go through the per-file coalescer");
        assertEquals(1, countOccurrences(stripped, "REFRESH_DELAY_MS = 300"),
                "the debounce window is 300 ms");
    }

    @Test
    void changesAreFilteredToBbjProgramFilesBeforeAnythingIsScheduled() {
        String body = bodyOf(stripComments(readSource(REFRESHER_SOURCE)), "private void onChange(");

        int filter = body.indexOf("isBbjProgramFileTypeName(");
        int mark = body.indexOf(".mark(");
        assertTrue(filter >= 0, "the change handler must filter on the BBj program file type");
        assertTrue(mark >= 0, "the change handler must schedule a refresh");
        assertTrue(filter < mark, "the file type filter must come before the file is marked dirty");
    }

    @Test
    void theRefreshChecksForAClosedProjectAndAnInvalidFileBeforeTouchingTheBanner() {
        String body = bodyOf(stripComments(readSource(REFRESHER_SOURCE)), "private void refresh(");

        int update = body.indexOf("updateNotifications(file)");
        assertTrue(update >= 0, "the refresh must update the notifications of the one file");
        int disposed = body.indexOf("project.isDisposed()");
        int valid = body.indexOf("isValid()");
        assertTrue(disposed >= 0 && disposed < update, "a closed project must be checked first");
        assertTrue(valid >= 0 && valid < update, "an invalid file must be checked first");
    }

    @Test
    void theRefresherNeverRefreshesEveryFileCancelsEveryTaskRegistersUnderAParentOrReadsText() {
        String stripped = stripComments(readSource(REFRESHER_SOURCE));

        for (String forbidden : new String[] {
                "updateAllNotifications", "cancelAll", "Disposer.register(",
                "getImmutableCharSequence", "LineNumbering"
        }) {
            assertEquals(0, countOccurrences(stripped, forbidden),
                    "the refresher must not contain " + forbidden);
        }
    }

    @Test
    void theRefresherIsRegisteredAsAProjectServiceExactlyOnce() {
        String xml = readSource(PLUGIN_XML);
        assertEquals(1, countOccurrences(xml,
                "serviceImplementation=\"com.basis.bbj.intellij.denum.BbjLineNumberedBannerRefresher\""),
                "plugin.xml must register the refresher as a project service exactly once");
    }

    @Test
    void theBannerProviderCreatesTheRefresherLazilyBeforeItReadsTheDocument() {
        String provider = readSource(PROVIDER_SOURCE);

        assertEquals(1, countOccurrences(provider, "BbjLineNumberedBannerRefresher.getInstance(project)"),
                "the provider must create the project's refresher exactly once per evaluation");
        int create = provider.indexOf("BbjLineNumberedBannerRefresher.getInstance(project)");
        int read = provider.indexOf("ReadAction.compute(");
        assertTrue(read >= 0 && create < read,
                "the refresher must exist before the document is read");
    }
}
