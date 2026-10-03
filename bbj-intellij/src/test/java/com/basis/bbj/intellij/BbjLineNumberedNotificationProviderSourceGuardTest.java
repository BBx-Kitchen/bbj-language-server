package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.UncheckedIOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the line-numbered banner: one Denumber link wired to the shared action
 * path, a verdict decided afresh from the document text under a read lock, an informational
 * status, and nothing that could dismiss, persist, special-case or cache anything.
 */
class BbjLineNumberedNotificationProviderSourceGuardTest {

    private static final Path PROVIDER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjLineNumberedNotificationProvider.java")
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
    void theBannerOffersExactlyOneActionAndItIsDenumber() {
        String text = readSource(PROVIDER_SOURCE);
        assertEquals(1, countOccurrences(text, "createActionLabel("),
                "the banner must carry exactly one action label");
        assertEquals(1, countOccurrences(text, "createActionLabel(\"Denumber\""),
                "the one action label must read Denumber");
    }

    @Test
    void theDenumberLinkRunsTheSamePathAsTheMenuAction() {
        String text = readSource(PROVIDER_SOURCE);
        assertEquals(1, countOccurrences(text, "BbjDenumberAction.denumber(project, file)"),
                "the link must call the action's shared entry point with the project and the file");
    }

    @Test
    void theVerdictComesFromTheDocumentTextThroughTheSharedPortUnderAReadLock() {
        String text = readSource(PROVIDER_SOURCE);
        assertEquals(1, countOccurrences(text, "LineNumbering.isLineNumberedSource("),
                "the verdict must come from the line-numbering port exactly once");
        assertEquals(1, countOccurrences(text, "getImmutableCharSequence()"),
                "the document text must be read exactly once, without copying it");
        assertEquals(1, countOccurrences(text, "ReadAction.compute("),
                "the document read must happen inside a read action");
    }

    @Test
    void theBannerIsInformationalNotAWarningOrAnError() {
        String text = readSource(PROVIDER_SOURCE);
        assertEquals(1, countOccurrences(text, "EditorNotificationPanel.Status.Info"),
                "the banner is an offer and must use the informational status");
        assertEquals(0, countOccurrences(text, "Status.Warning"), "no warning status");
        assertEquals(0, countOccurrences(text, "Status.Error"), "no error status");
    }

    @Test
    void theBannerHasNoDismissNoSettingNoReadOnlySpecialCaseAndNoCachedVerdict() {
        String stripped = stripComments(readSource(PROVIDER_SOURCE));
        for (String forbidden : new String[] {
                "setCloseAction", "Dismiss", "BbjSettings", "PropertiesComponent",
                "isWritable", "bbjt", "volatile", "AtomicBoolean"
        }) {
            assertEquals(0, countOccurrences(stripped, forbidden),
                    "the banner must not contain " + forbidden);
        }
    }

    @Test
    void theBannerTextIsTheExpectedSentence() {
        String text = readSource(PROVIDER_SOURCE);
        assertEquals(1, countOccurrences(text,
                "BANNER_TEXT = \"This is a line-numbered BBj program. Denumber it for editing.\";"),
                "the banner wording must be the agreed sentence");
    }

    @Test
    void theProviderIsRegisteredExactlyOnce() {
        String xml = readSource(PLUGIN_XML);
        assertEquals(1, countOccurrences(xml,
                "implementation=\"com.basis.bbj.intellij.BbjLineNumberedNotificationProvider\""),
                "plugin.xml must register the line-numbered banner provider exactly once");
    }
}
