package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for {@link BbjComposeCvsAction} (#649), re-pointed for the base-plus-subclass
 * shape (#616): the launch call, the presence gate and the background update thread now live on
 * {@link BbjComposeActionBase}, so this guard asserts them there and adds a delegation pin proving
 * the subclass actually extends the base and supplies its own {@code Kind.CVS}. Modelled on the
 * base-aware guard pattern in {@code EmTokenTrustWindowSourceGuardTest} and the abstract-declaration
 * edge case in {@code OffEdtDispatchSourceGuardTest}.
 */
class BbjComposeCvsActionSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjComposeCvsAction.java")
            .toAbsolutePath();

    private static final Path BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjComposeActionBase.java")
            .toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml")
            .toAbsolutePath();

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

    /**
     * Strips line comments and block comments (including javadoc) from {@code text} before any
     * assertion counts occurrences, so a rationale sentence naming a pinned/forbidden token can
     * never satisfy nor break a count-based assertion.
     */
    private static String stripComments(String text) {
        String noBlockComments = text.replaceAll("(?s)/\\*.*?\\*/", "");
        return noBlockComments.replaceAll("//[^\n]*", "");
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

    /** Extracts a brace-balanced method body starting from the first '{' after {@code signatureFragment}. */
    private static String extractMethodBody(String text, String signatureFragment) {
        int sigIndex = text.indexOf(signatureFragment);
        assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
        int braceStart = text.indexOf('{', sigIndex);
        assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
        int depth = 0;
        for (int i = braceStart; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(braceStart, i + 1);
                }
            }
        }
        fail("unbalanced braces for: " + signatureFragment);
        return "";
    }

    @Test
    void theBaseLaunchesThroughComposerLauncherWithTheSubclassKindExactlyOnce() {
        String body = stripComments(
                extractMethodBody(readSource(BASE_SOURCE), "public final void actionPerformed("));

        assertEquals(1, countOccurrences(body, "ComposerLauncher.launch(project, editor, kind())"),
                "the base's actionPerformed body must launch ComposerLauncher.launch(project, editor, kind()) exactly once");
    }

    @Test
    void theBaseIsScopedByPresenceNotByADisabledButVisibleState() {
        String text = stripComments(readSource(BASE_SOURCE));

        assertEquals(1, countOccurrences(text, "setEnabledAndVisible("),
                "the base must call setEnabledAndVisible( exactly once -- the entry must be absent "
                        + "entirely when unavailable, not merely disabled");
        assertEquals(0, countOccurrences(text, "setEnabled("),
                "the disabled-but-visible presentation call must never be used -- an unavailable "
                        + "action must vanish from the Editor Popup Menu, not grey out");
    }

    @Test
    void theActionAndBaseDoNoJavaSideCvsMaskParsing() {
        String subclassText = stripComments(readSource(GUARDED_SOURCE));
        String baseText = stripComments(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(subclassText, "Pattern.compile("),
                "the subclass must never parse a CVS() mask in Java -- the decode decision belongs "
                        + "to the server's cvsDecodeCall request");
        assertEquals(0, countOccurrences(subclassText, "Integer.parseInt("),
                "the subclass must perform no mask-parsing of its own");
        assertEquals(0, countOccurrences(baseText, "Pattern.compile("),
                "the base must never parse a CVS() mask in Java either");
        assertEquals(0, countOccurrences(baseText, "Integer.parseInt("),
                "the base must perform no mask-parsing of its own");
    }

    @Test
    void theBaseUsesTheActionUpdateThreadBackgroundConstant() {
        String text = stripComments(readSource(BASE_SOURCE));

        assertTrue(text.contains("ActionUpdateThread.BGT"),
                "the base must declare the background update thread, matching every other "
                        + "composer entry point");
    }

    @Test
    void theActionDelegatesToTheBaseWithItsOwnKind() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(1, countOccurrences(text, "extends BbjComposeActionBase"),
                "BbjComposeCvsAction.java must extend BbjComposeActionBase exactly once");
        assertEquals(1, countOccurrences(text, "ComposerLauncher.Kind.CVS"),
                "BbjComposeCvsAction.java must reference ComposerLauncher.Kind.CVS exactly once");
    }

    @Test
    void pluginXmlRegistersTheActionWithMatchingIdAndNoDefaultKeystroke() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("id=\"bbj.composeCvs\""),
                "plugin.xml must declare the bbj.composeCvs action id -- the same identifier the "
                        + "VS Code command already uses, so both hosts name the feature identically");
        assertTrue(text.contains("class=\"com.basis.bbj.intellij.actions.BbjComposeCvsAction\""),
                "plugin.xml must point the action id at BbjComposeCvsAction");

        int idIndex = text.indexOf("id=\"bbj.composeCvs\"");
        assertTrue(idIndex >= 0, "action declaration not found -- guard would pass vacuously on a mis-resolved file");
        int actionOpenTagStart = text.lastIndexOf("<action", idIndex);
        assertTrue(actionOpenTagStart >= 0, "opening <action tag not found before the declared id");
        int actionCloseTag = text.indexOf("</action>", idIndex);
        assertTrue(actionCloseTag > idIndex, "closing </action> tag not found after the declared id");

        // Scoped strictly to this action's own element -- a whole-descriptor scan would trip on a
        // sibling action's legitimate keyboard-shortcut declaration.
        String ownElement = text.substring(actionOpenTagStart, actionCloseTag);
        assertTrue(ownElement.contains("group-id=\"EditorPopupMenu\""),
                "the action must be registered in the Editor Popup Menu");
        assertEquals(0, countOccurrences(ownElement, "keyboard-shortcut"),
                "bbj.composeCvs must bind no default keystroke");
    }
}
