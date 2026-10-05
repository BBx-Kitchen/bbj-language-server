package com.basis.bbj.intellij.denum;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Cross-language contract for the two DENUM notifications and the {@code bbj/denum} answer: the
 * method names, payload field names, severity tokens and the block's header text must agree
 * between the TypeScript sources of truth ({@code denum-notifications.ts}, {@code
 * denum-command.ts}, {@code denum-diagnostics-output.ts}) and the IntelliJ side, so a rename on one
 * side alone fails here instead of silently breaking the feature at run time. Both sides compile
 * and run independently, so no live session would notice. Every source is read as plain text only.
 * The notifications are client-side: neither name may appear on the server proxy interface.
 */
class DenumNotificationContractTest {

    private static final Path NOTIFICATIONS_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "denum-notifications.ts").toAbsolutePath().normalize();
    private static final Path COMMAND_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "denum-command.ts").toAbsolutePath().normalize();
    private static final Path OUTPUT_TS = Paths.get(
        "..", "bbj-vscode", "src", "denum-diagnostics-output.ts").toAbsolutePath().normalize();

    private static final Path CLIENT_JAVA = javaSource("lsp", "BbjLanguageClient.java");
    private static final Path MODELS_JAVA = javaSource("denum", "DenumModels.java");
    private static final Path PRESENTER_JAVA = javaSource("denum", "DenumDiagnosticsPresenter.java");
    private static final Path COMPOSER_SERVER_JAVA = javaSource("composer", "BbjComposerServer.java");

    private static final String[] METHOD_NAMES = {"bbj/denumDiagnostics", "bbj/showDenumDiagnostics"};
    private static final String[] NOTIFICATION_FIELDS = {
        "uri", "version", "diagnostics", "line", "originalLineNumber", "severity", "message"};
    private static final String[] RESULT_FIELDS = {"status", "reason", "message", "edits", "applied"};
    private static final String[] SEVERITIES = {"ERROR", "WARNING", "INFO"};
    private static final String[] HEADER_TEXTS = {"Denumber diagnostics for ", "an unknown file"};

    private static Path javaSource(String pkg, String fileName) {
        return Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij", pkg, fileName)
            .toAbsolutePath().normalize();
    }

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Source not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read " + path, e);
        }
    }

    /** True when {@code literal} appears single- or double-quoted in {@code text}. */
    private static boolean containsQuoted(String text, String literal) {
        return text.contains("'" + literal + "'") || text.contains("\"" + literal + "\"");
    }

    /** True when {@code word} appears as a whole word in {@code text} (TypeScript members are unquoted). */
    private static boolean containsWord(String text, String word) {
        return Pattern.compile("\\b" + Pattern.quote(word) + "\\b").matcher(text).find();
    }

    /** True when {@code java} declares a public field with that name. */
    private static boolean declaresPublicField(String java, String name) {
        return Pattern.compile("public [A-Za-z0-9_<>.]+ " + Pattern.quote(name) + ";").matcher(java).find();
    }

    @Test
    void bothMethodNamesAppearOnBothSidesAndAreNamespacedUnderBbj() {
        String ts = readSource(NOTIFICATIONS_TS);
        String client = readSource(CLIENT_JAVA);

        for (String name : METHOD_NAMES) {
            assertTrue(name.startsWith("bbj/"), "'" + name + "' must be namespaced under bbj/");
            assertTrue(containsQuoted(ts, name),
                "'" + name + "' not found as a quoted literal in " + NOTIFICATIONS_TS);
            assertTrue(client.contains("@JsonNotification(\"" + name + "\")"),
                "'" + name + "' not found as an @JsonNotification value in " + CLIENT_JAVA);
        }
    }

    @Test
    void neitherNotificationIsDeclaredOnTheComposerServerProxyInterface() {
        String server = readSource(COMPOSER_SERVER_JAVA);

        for (String name : METHOD_NAMES) {
            assertFalse(containsQuoted(server, name),
                "'" + name + "' is a client-side notification, not a request on the "
                    + "BbjComposerServer proxy interface");
        }
    }

    @Test
    void everyNotificationFieldIsAnInterfaceMemberInTheTypeScriptAndAPublicJavaField() {
        String ts = readSource(NOTIFICATIONS_TS);
        String models = readSource(MODELS_JAVA);

        for (String field : NOTIFICATION_FIELDS) {
            assertTrue(containsWord(ts, field),
                "field '" + field + "' not found as a TypeScript member in " + NOTIFICATIONS_TS);
            assertTrue(declaresPublicField(models, field),
                "field '" + field + "' not declared as a public field in " + MODELS_JAVA);
        }
    }

    @Test
    void everyAnswerFieldIsAMemberOfTheTypeScriptResultAndAPublicJavaField() {
        String ts = readSource(COMMAND_TS);
        String models = readSource(MODELS_JAVA);

        for (String field : RESULT_FIELDS) {
            assertTrue(containsWord(ts, field),
                "field '" + field + "' not found as a TypeScript member in " + COMMAND_TS);
            assertTrue(declaresPublicField(models, field),
                "field '" + field + "' not declared as a public field in " + MODELS_JAVA);
        }
    }

    @Test
    void theThreeSeveritiesAgreeOnBothSides() {
        String ts = readSource(NOTIFICATIONS_TS);
        String presenter = readSource(PRESENTER_JAVA);

        for (String severity : SEVERITIES) {
            assertTrue(containsQuoted(ts, severity),
                "severity '" + severity + "' not found as a quoted literal in " + NOTIFICATIONS_TS);
            assertTrue(containsQuoted(presenter, severity),
                "severity '" + severity + "' not found as a quoted literal in " + PRESENTER_JAVA);
        }
    }

    @Test
    void theBlockHeaderTextMatchesTheVsCodeBlock() {
        String ts = readSource(OUTPUT_TS);
        String presenter = readSource(PRESENTER_JAVA);

        for (String text : HEADER_TEXTS) {
            assertTrue(ts.contains(text), "header text '" + text + "' not found in " + OUTPUT_TS);
            assertTrue(presenter.contains(text), "header text '" + text + "' not found in " + PRESENTER_JAVA);
        }
    }
}
