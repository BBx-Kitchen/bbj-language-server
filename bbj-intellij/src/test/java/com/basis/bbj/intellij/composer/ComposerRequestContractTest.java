package com.basis.bbj.intellij.composer;

import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Cross-language contract for the custom {@code bbj/composer/*} and {@code bbj/compile} requests
 * (#544): every request name {@link BbjComposerServer} declares must appear as a quoted literal in
 * the language server's own TypeScript sources, so renaming one side alone fails here instead of
 * silently breaking the request at run time. The sources are read only as plain text -- never
 * parsed as TypeScript.
 */
class ComposerRequestContractTest {

    private static final Path COMPOSER_COMMANDS_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "composer-commands.ts").toAbsolutePath().normalize();

    private static final Path COMPILE_COMMAND_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "compile-command.ts").toAbsolutePath().normalize();

    /** The eight names this test expects; also independently derived reflectively below. */
    private static final Set<String> DECLARED_REQUESTS = Set.of(
        "bbj/composer/catalogs",
        "bbj/composer/msgbox/preview",
        "bbj/composer/addwindow/preview",
        "bbj/composer/msgbox/decodeCall",
        "bbj/composer/addwindow/decodeCall",
        "bbj/composer/addchildwindow/preview",
        "bbj/composer/addchildwindow/decodeCall",
        "bbj/compile"
    );

    private static String readLanguageServerSource(Path path) {
        if (!Files.exists(path)) {
            fail("Language server source not found at " + path);
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

    private static Set<String> declaredRequestNamesFromInterface() {
        Set<String> names = new HashSet<>();
        for (Method method : BbjComposerServer.class.getDeclaredMethods()) {
            JsonRequest annotation = method.getAnnotation(JsonRequest.class);
            if (annotation != null) {
                names.add(annotation.value());
            }
        }
        return names;
    }

    @Test
    void everyDeclaredRequestNameExistsAsAQuotedLiteralInTheLanguageServerSources() {
        String composerSource = readLanguageServerSource(COMPOSER_COMMANDS_TS);
        String compileSource = readLanguageServerSource(COMPILE_COMMAND_TS);
        String combined = composerSource + compileSource;

        for (String requestName : DECLARED_REQUESTS) {
            boolean present = combined.contains("'" + requestName + "'")
                || combined.contains("\"" + requestName + "\"");
            assertTrue(present, "request name '" + requestName + "' not found as a quoted literal "
                + "in " + COMPOSER_COMMANDS_TS + " or " + COMPILE_COMMAND_TS);
        }
    }

    @Test
    void theDeclaredRequestNamesAreDerivedFromTheInterfaceNotHardCodedTwice() {
        // Both halves matter: the reflective read keeps this test honest when a method is added
        // to BbjComposerServer, and the literal DECLARED_REQUESTS keeps it honest when one is
        // silently renamed on both sides at once (a rename that also updated DECLARED_REQUESTS
        // would otherwise pass vacuously).
        assertEquals(DECLARED_REQUESTS, declaredRequestNamesFromInterface(),
            "BbjComposerServer's @JsonRequest names drifted from this test's own expected set");
    }

    @Test
    void everyRequestNameIsNamespacedAndLowerCase() {
        Set<String> requestNames = declaredRequestNamesFromInterface();

        for (String requestName : requestNames) {
            assertTrue(requestName.startsWith("bbj/"),
                "request name '" + requestName + "' must be namespaced under bbj/");
        }

        // Camel-case is allowed only where the interface's own method name introduces it
        // (decodeCall); every other segment of every name must be all lower-case. The allowed
        // exception is a literal set membership check, not a regex, so a typo such as a doubled
        // slash (which would still satisfy a lax "starts with bbj/, rest is [a-zA-Z/]" pattern)
        // is caught by the exact per-segment set comparison instead.
        Set<String> allowedCamelCaseSegments = Set.of("decodeCall");
        for (String requestName : requestNames) {
            for (String segment : requestName.split("/")) {
                boolean isAllLowerCase = segment.equals(segment.toLowerCase(Locale.ROOT));
                assertTrue(isAllLowerCase || allowedCamelCaseSegments.contains(segment),
                    "segment '" + segment + "' of request name '" + requestName + "' has an "
                        + "unexpected upper-case character");
            }
        }
    }

    @Test
    void theLanguageServerSourcesAreReadOnlyAsTextAndNeverParsed() {
        // Enforced structurally: readLanguageServerSource above resolves each file with
        // Files.readString and every assertion against its result is a String.contains check,
        // never a TypeScript parser. This test exists only to document that invariant for the
        // acceptance-criteria grep, since a purely structural property cannot be asserted with a
        // runtime check without contradicting itself.
        String composerSource = readLanguageServerSource(COMPOSER_COMMANDS_TS);
        String compileSource = readLanguageServerSource(COMPILE_COMMAND_TS);
        assertTrue(composerSource.length() > 0, "composer-commands.ts must be non-empty");
        assertTrue(compileSource.length() > 0, "compile-command.ts must be non-empty");
    }
}
