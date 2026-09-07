package com.basis.bbj.intellij.config;

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
 * Cross-language contract for {@code bbj/configReloadRequired} (#486): the notification name,
 * its {@code bbj/} namespace, its three reason tokens and its two payload field names must agree
 * between {@code bbj-vscode/src/language/config-reload-notification.ts} (the source of truth)
 * and the IntelliJ side, so a rename or a reason-token drift on either side alone fails here
 * instead of silently breaking the notification at run time. A live IDE session cannot catch
 * this -- both sides compile and run independently of each other. Every source is read only as
 * plain text via {@link Files#readString}, never parsed as TypeScript and never reflected over,
 * matching {@code ComposerRequestContractTest}'s convention.
 */
class ConfigReloadNotificationContractTest {

    private static final Path CONFIG_RELOAD_NOTIFICATION_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "config-reload-notification.ts")
        .toAbsolutePath().normalize();

    private static final Path BBJ_LANGUAGE_CLIENT_JAVA = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageClient.java")
        .toAbsolutePath().normalize();

    private static final Path CONFIG_MODELS_JAVA = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "ConfigModels.java")
        .toAbsolutePath().normalize();

    private static final Path CONFIG_RELOAD_PRESENTATION_JAVA = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "ConfigReloadPresentation.java")
        .toAbsolutePath().normalize();

    private static final Path BBJ_COMPOSER_SERVER_JAVA = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "BbjComposerServer.java")
        .toAbsolutePath().normalize();

    private static final String NOTIFICATION_NAME = "bbj/configReloadRequired";

    private static final String[] REASON_TOKENS = {
        "prefix-changed", "config-missing", "config-path-changed"
    };

    private static final String[] FIELD_NAMES = {"path", "reason"};

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Source not found at " + path);
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

    /** True when {@code literal} appears single- or double-quoted in {@code text}. */
    private static boolean containsQuoted(String text, String literal) {
        return text.contains("'" + literal + "'") || text.contains("\"" + literal + "\"");
    }

    /** True when {@code word} appears as a whole word in {@code text} (TypeScript field names are unquoted). */
    private static boolean containsWord(String text, String word) {
        return Pattern.compile("\\b" + Pattern.quote(word) + "\\b").matcher(text).find();
    }

    @Test
    void theNotificationNameAppearsOnBothSides() {
        String ts = readSource(CONFIG_RELOAD_NOTIFICATION_TS);
        String java = readSource(BBJ_LANGUAGE_CLIENT_JAVA);

        assertTrue(containsQuoted(ts, NOTIFICATION_NAME),
            "notification name '" + NOTIFICATION_NAME + "' not found as a quoted literal in "
                + CONFIG_RELOAD_NOTIFICATION_TS);
        assertTrue(containsQuoted(java, NOTIFICATION_NAME),
            "notification name '" + NOTIFICATION_NAME + "' not found as the @JsonNotification "
                + "annotation value in " + BBJ_LANGUAGE_CLIENT_JAVA);
    }

    @Test
    void theNotificationNameIsNamespacedUnderBbj() {
        assertTrue(NOTIFICATION_NAME.startsWith("bbj/"),
            "notification name '" + NOTIFICATION_NAME + "' must be namespaced under bbj/");
    }

    @Test
    void everyReasonTokenAppearsOnBothSides() {
        String ts = readSource(CONFIG_RELOAD_NOTIFICATION_TS);
        String java = readSource(CONFIG_RELOAD_PRESENTATION_JAVA);

        for (String reason : REASON_TOKENS) {
            assertTrue(containsQuoted(ts, reason),
                "reason token '" + reason + "' not found as a quoted literal in "
                    + CONFIG_RELOAD_NOTIFICATION_TS);
            assertTrue(containsQuoted(java, reason),
                "reason token '" + reason + "' not found as a quoted literal in "
                    + CONFIG_RELOAD_PRESENTATION_JAVA
                    + " -- the Java label map and the server's reason vocabulary must not drift apart");
        }
    }

    @Test
    void bothDtoFieldNamesAppearOnBothSides() {
        String ts = readSource(CONFIG_RELOAD_NOTIFICATION_TS);
        String java = readSource(CONFIG_MODELS_JAVA);

        for (String field : FIELD_NAMES) {
            assertTrue(containsWord(ts, field),
                "field '" + field + "' not found as a TypeScript interface member in "
                    + CONFIG_RELOAD_NOTIFICATION_TS);
            assertTrue(java.contains("public String " + field + ";"),
                "field '" + field + "' not declared as 'public String " + field + ";' in "
                    + CONFIG_MODELS_JAVA);
        }
    }

    @Test
    void theNotificationNameIsAbsentFromTheComposerServerProxyInterface() {
        String java = readSource(BBJ_COMPOSER_SERVER_JAVA);

        assertFalse(containsQuoted(java, NOTIFICATION_NAME),
            "'" + NOTIFICATION_NAME + "' is a client-side notification, not a request on the "
                + "BbjComposerServer proxy interface -- adding it there would also break "
                + "ComposerRequestContractTest's reflective derivation of its DECLARED_REQUESTS set");
    }
}
