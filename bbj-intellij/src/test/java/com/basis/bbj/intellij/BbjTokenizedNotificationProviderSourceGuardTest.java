package com.basis.bbj.intellij;

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
 * Source-guard fence for the tokenized-program banner and the decompile code behind it: two
 * actions wired to the decompiler, a verdict taken from the file's bytes rather than the
 * document, one registration, and a bbjlst launch that is an argument list and never a shell.
 */
class BbjTokenizedNotificationProviderSourceGuardTest {

    private static final Path MAIN_JAVA = Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij");
    private static final Path PROVIDER_SOURCE =
            MAIN_JAVA.resolve("BbjTokenizedNotificationProvider.java").toAbsolutePath();
    private static final Path DECOMPILER_SOURCE =
            MAIN_JAVA.resolve("tokenized").resolve("BbjTokenizedDecompiler.java").toAbsolutePath();
    private static final Path COMMAND_SOURCE =
            MAIN_JAVA.resolve("tokenized").resolve("BbjLstCommand.java").toAbsolutePath();
    private static final Path DETECTION_SOURCE =
            MAIN_JAVA.resolve("tokenized").resolve("TokenizedBbj.java").toAbsolutePath();
    private static final Path PLUGIN_XML =
            Paths.get("src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();

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
    void theBannerExtendsTheSharedBaseAndDeclaresNoVisibilityCheckOfItsOwn() {
        String provider = stripComments(readSource(PROVIDER_SOURCE));
        assertEquals(1, countOccurrences(provider, "extends BbjNotificationProviderBase"));
        assertEquals(0, countOccurrences(provider, "collectNotificationData"));
    }

    @Test
    void theBannerIsInformationalWithTwoActionsWiredToTheDecompiler() {
        String provider = stripComments(readSource(PROVIDER_SOURCE));
        assertEquals(1, countOccurrences(provider, "EditorNotificationPanel.Status.Info"));
        assertEquals(2, countOccurrences(provider, "createActionLabel("));
        assertEquals(1, countOccurrences(provider, "\"Decompile & Replace\""));
        assertEquals(1, countOccurrences(provider, "\"Open Read-only\""));
        assertEquals(1, countOccurrences(provider, "BbjTokenizedDecompiler.decompileReplace(project, file)"));
        assertEquals(1, countOccurrences(provider, "BbjTokenizedDecompiler.openReadOnly(project, file)"));
    }

    @Test
    void theVerdictComesFromTheFilesBytesNeverTheDocument() {
        String provider = stripComments(readSource(PROVIDER_SOURCE));
        assertTrue(countOccurrences(provider, "TokenizedBbj.readsTokenized(") >= 1,
                "the banner must decide from the first bytes of the file");
        assertEquals(0, countOccurrences(provider, "FileDocumentManager"),
                "a binary program's document is garbled text and must not decide anything");
    }

    @Test
    void theBannerHasNoDismissNoSettingAndNoCachedVerdict() {
        String provider = stripComments(readSource(PROVIDER_SOURCE));
        for (String forbidden : new String[] {
                "setCloseAction", "Dismiss", "BbjSettings", "PropertiesComponent", "volatile", "AtomicBoolean"
        }) {
            assertEquals(0, countOccurrences(provider, forbidden), "the banner must not contain " + forbidden);
        }
    }

    @Test
    void theProviderIsRegisteredExactlyOnce() {
        String xml = readSource(PLUGIN_XML);
        assertEquals(1, countOccurrences(xml,
                "implementation=\"com.basis.bbj.intellij.BbjTokenizedNotificationProvider\""),
                "plugin.xml must register the tokenized banner provider exactly once");
    }

    @Test
    void bbjlstIsLaunchedAsAnArgumentListAndNeverThroughAShell() {
        String decompiler = stripComments(readSource(DECOMPILER_SOURCE));
        assertTrue(countOccurrences(decompiler, "new GeneralCommandLine(") >= 1);
        assertTrue(countOccurrences(decompiler, "Task.Backgroundable") >= 1,
                "decompiling must run off the event thread");
        for (String forbidden : new String[] {
                "\"sh\"", "\"/bin/sh\"", "\"cmd\"", "\"cmd.exe\"", "Runtime.getRuntime().exec"
        }) {
            assertEquals(0, countOccurrences(decompiler, forbidden), "the decompiler must not contain " + forbidden);
        }
    }

    @Test
    void thePrivateDirectoryPrefixIsDefinedOnceAndTheReplaceIsAtomic() {
        String all = stripComments(readSource(DECOMPILER_SOURCE))
                + stripComments(readSource(COMMAND_SOURCE))
                + stripComments(readSource(DETECTION_SOURCE));
        assertEquals(1, countOccurrences(all, "\"bbj-decompiled-\""),
                "the private directory prefix must be defined exactly once in the tokenized package");
        assertTrue(countOccurrences(stripComments(readSource(COMMAND_SOURCE)), "ATOMIC_MOVE") >= 1,
                "the replace must be an atomic move");
    }

    @Test
    void theDetectionNeverFollowsALinkWhenOpeningTheFile() {
        String detection = stripComments(readSource(DETECTION_SOURCE));
        assertTrue(countOccurrences(detection, "NOFOLLOW_LINKS") >= 2,
                "both the attribute check and the open must refuse to follow a link");
    }
}
