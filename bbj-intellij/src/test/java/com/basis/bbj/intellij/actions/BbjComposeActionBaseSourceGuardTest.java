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
 * Pins the #616 composer-action consolidation: {@code BbjComposeActionBase} carries the launch
 * call, the presence gate and the background update thread exactly once, each of the six
 * {@code BbjCompose*Action} subclasses delegates to it rather than re-declaring any of those
 * members, and the kind is never derived from the registered action id. This is the only
 * structural coverage for {@code BbjComposeMsgboxAction}, {@code BbjComposeAddWindowAction} and
 * {@code BbjComposeAddChildWindowAction}, which had no per-file guard before this plan. Follows the
 * base-aware guard pattern in {@code EmTokenTrustWindowSourceGuardTest} and the abstract-declaration
 * edge case in {@code OffEdtDispatchSourceGuardTest}: every private helper below is this guard's
 * own copy, never a shared test utility.
 */
class BbjComposeActionBaseSourceGuardTest {

    private static final Path BASE_SOURCE = guardedActionSource("BbjComposeActionBase.java");
    private static final Path MSGBOX_SOURCE = guardedActionSource("BbjComposeMsgboxAction.java");
    private static final Path ADD_WINDOW_SOURCE = guardedActionSource("BbjComposeAddWindowAction.java");
    private static final Path ADD_CHILD_WINDOW_SOURCE = guardedActionSource("BbjComposeAddChildWindowAction.java");
    private static final Path SETOPTS_SOURCE = guardedActionSource("BbjComposeSetoptsAction.java");
    private static final Path SETOPTS_IN_CODE_SOURCE = guardedActionSource("BbjComposeSetoptsInCodeAction.java");
    private static final Path CVS_SOURCE = guardedActionSource("BbjComposeCvsAction.java");
    private static final Path OPEN_COMPOSER_AT_SOURCE = guardedActionSource("BbjOpenComposerAtAction.java");

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    private static Path guardedActionSource(String fileName) {
        return Paths.get(
                "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", fileName)
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
     * Drops comment/javadoc lines so a rationale sentence naming a counted literal cannot skew a
     * number. Applied ahead of every count-based assertion in this class without exception.
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
    void baseIsAnAbstractClassExtendingAnActionExactlyOnce() {
        String text = withoutCommentLines(readSource(BASE_SOURCE));
        assertEquals(1, countOccurrences(text, "extends AnAction"),
                "BbjComposeActionBase.java must extend AnAction exactly once");
        assertTrue(text.contains("public abstract class BbjComposeActionBase"),
                "BbjComposeActionBase.java must be declared public abstract class BbjComposeActionBase");
    }

    @Test
    void actionPerformedBodyLaunchesThroughComposerLauncherExactlyOnceAndMutatesNoDocumentItself() {
        String body = withoutCommentLines(
                extractMethodBody(readSource(BASE_SOURCE), "public final void actionPerformed("));

        assertEquals(1, countOccurrences(body, "ComposerLauncher.launch(project, editor, kind())"),
                "the base's actionPerformed body must call ComposerLauncher.launch(project, editor, kind()) exactly once");
        assertEquals(0, countOccurrences(body, "replaceString("),
                "an action must perform no document mutation of its own -- that belongs to ComposerLauncher");
        assertEquals(0, countOccurrences(body, "insertString("),
                "an action must perform no document mutation of its own -- that belongs to ComposerLauncher");
    }

    @Test
    void updateBodyGatesThroughSetEnabledAndVisibleAndIsAvailableForExactlyOnceEach() {
        String body = withoutCommentLines(
                extractMethodBody(readSource(BASE_SOURCE), "public void update("));

        assertEquals(1, countOccurrences(body, "setEnabledAndVisible("),
                "the base's update body must call setEnabledAndVisible( exactly once");
        assertEquals(1, countOccurrences(body, "isAvailableFor("),
                "the base's update body must call isAvailableFor(...) exactly once");
    }

    @Test
    void theBaseNeverUsesTheDisabledButVisiblePresentationCall() {
        String text = withoutCommentLines(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(text, "setEnabled("),
                "every composer entry must stay presence-scoped -- setEnabled( (disabled-but-visible) "
                        + "must never appear on the base");
    }

    @Test
    void theKindIsNeverDerivedFromTheRegisteredActionId() {
        String text = withoutCommentLines(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(text, "ActionManager.getId("),
                "the base must never read its own registered action id -- a renamed or mistyped id "
                        + "must stay a compile error, not a silent click-time no-op");
        assertEquals(0, countOccurrences(text, "\"bbj.compose"),
                "the base must name no composer action-id string literal of its own -- every id "
                        + "lives only in plugin.xml");
    }

    @Test
    void theAbstractKindDeclarationCarriesNoBody() {
        String text = readSource(BASE_SOURCE);

        int kindIndex = text.indexOf("protected abstract ComposerLauncher.Kind kind(");
        assertTrue(kindIndex >= 0, "protected abstract ComposerLauncher.Kind kind( is not present");
        String kindLine = text.substring(text.lastIndexOf('\n', kindIndex) + 1, text.indexOf('\n', kindIndex));
        assertTrue(kindLine.trim().endsWith(";"),
                "the abstract kind() declaration has no body, so it cannot and must not carry an assertion");
    }

    @Test
    void everyUniformSubclassDelegatesToTheBaseExactlyOnce() {
        assertSubclassDelegation(MSGBOX_SOURCE, "ComposerLauncher.Kind.MSGBOX");
        assertSubclassDelegation(ADD_WINDOW_SOURCE, "ComposerLauncher.Kind.ADDWINDOW");
        assertSubclassDelegation(ADD_CHILD_WINDOW_SOURCE, "ComposerLauncher.Kind.ADDCHILDWINDOW");
        assertSubclassDelegation(CVS_SOURCE, "ComposerLauncher.Kind.CVS");
    }

    private static void assertSubclassDelegation(Path source, String ownKindConstant) {
        String text = withoutCommentLines(readSource(source));
        assertEquals(1, countOccurrences(text, "extends BbjComposeActionBase"),
                source + " must extend BbjComposeActionBase exactly once");
        assertEquals(1, countOccurrences(text, ownKindConstant),
                source + " must reference its own " + ownKindConstant + " exactly once");
    }

    @Test
    void theSetoptsSubclassDelegatesWithItsOwnKindNotTheInCodeKind() {
        String text = withoutCommentLines(readSource(SETOPTS_SOURCE));
        assertEquals(1, countOccurrences(text, "extends BbjComposeActionBase"),
                "BbjComposeSetoptsAction.java must extend BbjComposeActionBase exactly once");

        // "ComposerLauncher.Kind.SETOPTS" is a literal prefix of
        // "ComposerLauncher.Kind.SETOPTS_IN_CODE", so a plain substring count would double-count
        // if the file ever referenced the in-code kind too. Subtracting the longer literal's count
        // isolates references to the bare config.bbx kind alone.
        int setoptsCount = countOccurrences(text, "ComposerLauncher.Kind.SETOPTS");
        int setoptsInCodeCount = countOccurrences(text, "ComposerLauncher.Kind.SETOPTS_IN_CODE");
        assertEquals(1, setoptsCount - setoptsInCodeCount,
                "BbjComposeSetoptsAction.java must reference ComposerLauncher.Kind.SETOPTS exactly "
                        + "once, and never the in-code kind");
    }

    @Test
    void theSetoptsInCodeSubclassDelegatesWithItsOwnKind() {
        String text = withoutCommentLines(readSource(SETOPTS_IN_CODE_SOURCE));
        assertEquals(1, countOccurrences(text, "extends BbjComposeActionBase"),
                "BbjComposeSetoptsInCodeAction.java must extend BbjComposeActionBase exactly once");
        assertEquals(1, countOccurrences(text, "ComposerLauncher.Kind.SETOPTS_IN_CODE"),
                "BbjComposeSetoptsInCodeAction.java must reference its own "
                        + "ComposerLauncher.Kind.SETOPTS_IN_CODE exactly once");
    }

    @Test
    void bothSetoptsSubclassesDeclareTheirOwnAvailabilityOverrideExactlyOnceAndNoOtherSubclassDoes() {
        assertEquals(1, countOccurrences(withoutCommentLines(readSource(SETOPTS_SOURCE)), "isAvailableFor("),
                "BbjComposeSetoptsAction.java must declare isAvailableFor(...) exactly once");
        assertEquals(1, countOccurrences(withoutCommentLines(readSource(SETOPTS_IN_CODE_SOURCE)), "isAvailableFor("),
                "BbjComposeSetoptsInCodeAction.java must declare isAvailableFor(...) exactly once");

        assertEquals(0, countOccurrences(withoutCommentLines(readSource(MSGBOX_SOURCE)), "isAvailableFor("),
                "BbjComposeMsgboxAction.java must inherit the default gate, not override it");
        assertEquals(0, countOccurrences(withoutCommentLines(readSource(ADD_WINDOW_SOURCE)), "isAvailableFor("),
                "BbjComposeAddWindowAction.java must inherit the default gate, not override it");
        assertEquals(0, countOccurrences(withoutCommentLines(readSource(ADD_CHILD_WINDOW_SOURCE)), "isAvailableFor("),
                "BbjComposeAddChildWindowAction.java must inherit the default gate, not override it");
        assertEquals(0, countOccurrences(withoutCommentLines(readSource(CVS_SOURCE)), "isAvailableFor("),
                "BbjComposeCvsAction.java must inherit the default gate, not override it");
    }

    @Test
    void noSubclassReDeclaresActionPerformedUpdateOrTheUpdateThread() {
        for (Path source : new Path[] {
                MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_SOURCE, SETOPTS_IN_CODE_SOURCE, CVS_SOURCE
        }) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "actionPerformed("),
                    source + " must not re-declare actionPerformed -- that belongs to the base only");
            assertEquals(0, countOccurrences(text, "getActionUpdateThread("),
                    source + " must not re-declare getActionUpdateThread -- that belongs to the base only");
            assertEquals(0, countOccurrences(text, "setEnabledAndVisible("),
                    source + " must not call setEnabledAndVisible directly -- a second call site would "
                            + "let the base's gate and the subclass's gate disagree");
        }
    }

    @Test
    void noSubclassOrTheBaseDoesJavaSideParsingOfAnyKind() {
        Path[] allSources = {
                BASE_SOURCE, MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE,
                SETOPTS_SOURCE, SETOPTS_IN_CODE_SOURCE, CVS_SOURCE
        };
        for (Path source : allSources) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "Integer.parseInt("),
                    source + " must perform no hex/mask-parsing of its own -- the decode is always "
                            + "the language server's decision");
            assertEquals(0, countOccurrences(text, "Pattern.compile("),
                    source + " must never parse a mask or line in Java with a regex");
            assertEquals(0, countOccurrences(text, "parseSetOptsLine("),
                    source + " must never call the domain module's line parser directly");
            assertEquals(0, countOccurrences(text, "com.intellij.psi"),
                    source + " must stay PSI-free");
        }
    }

    @Test
    void theCueActionIsNotConvertedToTheNewBase() {
        String text = withoutCommentLines(readSource(OPEN_COMPOSER_AT_SOURCE));
        assertEquals(0, countOccurrences(text, "extends BbjComposeActionBase"),
                "BbjOpenComposerAtAction.java must never extend BbjComposeActionBase -- it stays on "
                        + "LSPCommandAction, dispatched by LSP4IJ by action id with a positional target");
    }

    @Test
    void buildScriptStillRequiresNoPlatformTestFramework() {
        String text = readSource(BUILD_GRADLE_KTS);
        assertEquals(0, countOccurrences(text, "TestFrameworkType"),
                "build.gradle.kts must not require a platform TestFrameworkType for these plain JUnit 5 guards");
        assertEquals(0, countOccurrences(text, "BasePlatformTestCase"),
                "build.gradle.kts must not reference BasePlatformTestCase for these plain JUnit 5 guards");
    }
}
