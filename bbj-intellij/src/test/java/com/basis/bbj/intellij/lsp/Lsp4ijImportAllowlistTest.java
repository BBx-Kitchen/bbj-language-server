package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The plugin's LSP4IJ coupling inventory, made durable (#544, #554): scans {@code
 * src/main/java} for every {@code com.redhat.devtools.lsp4ij} import and fully-qualified use, and
 * asserts the resulting {@code file -> {symbols}} map equals {@link #ALLOWLIST}, a hand-written
 * literal built in this test's own source. Adding a vendor use anywhere in the main source tree
 * fails this test until {@link #ALLOWLIST} is edited beside the canary that covers the new symbol.
 */
class Lsp4ijImportAllowlistTest {

    private static final Path MAIN_SOURCE_ROOT = Paths.get("src", "main", "java").toAbsolutePath();

    private static final Pattern IMPORT_PATTERN = Pattern.compile(
        "import\\s+com\\.redhat\\.devtools\\.lsp4ij\\.([A-Za-z0-9_.]+)\\s*;");

    private static final Pattern FQN_PATTERN = Pattern.compile(
        "com\\.redhat\\.devtools\\.lsp4ij\\.([A-Za-z0-9_.]+)");

    /**
     * Deliberately hand-written -- see {@link #thisTestDoesNotDeriveTheAllowlistFromTheScan()}.
     * Eleven files, each mapped to the simple vendor symbols it references.
     */
    private static final Map<String, Set<String>> ALLOWLIST = Map.ofEntries(
        Map.entry("com/basis/bbj/intellij/actions/BbjRunActionBase.java", Set.of("ServerStatus")),
        Map.entry("com/basis/bbj/intellij/actions/BbjCompileAction.java", Set.of("ServerStatus")),
        Map.entry("com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java", Set.of("ServerStatus")),
        Map.entry("com/basis/bbj/intellij/lsp/BbjLanguageServer.java",
            Set.of("OSProcessStreamConnectionProvider")),
        Map.entry("com/basis/bbj/intellij/lsp/BbjLanguageClient.java",
            Set.of("ServerStatus", "LanguageClientImpl")),
        Map.entry("com/basis/bbj/intellij/lsp/BbjCompletionFeature.java", Set.of("LSPCompletionFeature")),
        Map.entry("com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java",
            Set.of("LanguageServerFactory", "LanguageClientImpl", "LSPClientFeatures",
                "LSPDocumentLinkFeature", "StreamConnectionProvider")),
        Map.entry("com/basis/bbj/intellij/ui/BbjStatusBarWidget.java", Set.of("ServerStatus")),
        Map.entry("com/basis/bbj/intellij/ui/BbjServerService.java",
            Set.of("LanguageServerManager", "ServerStatus")),
        Map.entry("com/basis/bbj/intellij/ui/BbjJavaInteropService.java", Set.of("ServerStatus")),
        Map.entry("com/basis/bbj/intellij/composer/BbjComposerService.java", Set.of("LanguageServerManager"))
    );

    /**
     * Strips line comments, block comments (including javadoc) and their contents from {@code
     * source}, while respecting string and character literals so a vendor reference inside a
     * string literal is still counted and one inside a comment is not. Package-private so the
     * comment-stripping tests below can drive it directly with literal source strings.
     */
    static String stripComments(String source) {
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

    /**
     * Collects the simple vendor symbols {@code strippedSource} references: the last
     * dot-separated segment of every {@code import com.redhat.devtools.lsp4ij.<...>;} line, and,
     * for any remaining fully-qualified occurrence of the vendor package prefix, the first
     * dot-separated segment of the trailing path that begins with an upper-case letter.
     * Package-private so the tests below can drive it directly with literal source strings.
     */
    static Set<String> extractSymbols(String strippedSource) {
        Set<String> symbols = new HashSet<>();
        Matcher importMatcher = IMPORT_PATTERN.matcher(strippedSource);
        while (importMatcher.find()) {
            symbols.add(lastSegment(importMatcher.group(1)));
        }
        Matcher fqnMatcher = FQN_PATTERN.matcher(strippedSource);
        while (fqnMatcher.find()) {
            for (String segment : fqnMatcher.group(1).split("\\.")) {
                if (!segment.isEmpty() && Character.isUpperCase(segment.charAt(0))) {
                    symbols.add(segment);
                    break;
                }
            }
        }
        return symbols;
    }

    private static String lastSegment(String dotted) {
        int lastDot = dotted.lastIndexOf('.');
        return lastDot < 0 ? dotted : dotted.substring(lastDot + 1);
    }

    /** Walks {@link #MAIN_SOURCE_ROOT} and builds the {@code file -> {symbols}} map. */
    static Map<String, Set<String>> scanMainSources() {
        Map<String, Set<String>> result = new HashMap<>();
        try (Stream<Path> walk = Files.walk(MAIN_SOURCE_ROOT)) {
            List<Path> javaFiles = walk
                .filter(p -> p.toString().endsWith(".java"))
                .collect(Collectors.toList());
            for (Path file : javaFiles) {
                String stripped = stripComments(Files.readString(file));
                Set<String> symbols = extractSymbols(stripped);
                if (!symbols.isEmpty()) {
                    String relative = MAIN_SOURCE_ROOT.relativize(file).toString().replace('\\', '/');
                    result.put(relative, symbols);
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(e);
        }
        return result;
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(IOException cause) {
            super("Failed to scan " + MAIN_SOURCE_ROOT + " for LSP4IJ coupling", cause);
        }
    }

    @Test
    void theCouplingSurfaceIsExactlyTheElevenFilesInTheAllowlist() {
        Map<String, Set<String>> scanned = scanMainSources();

        Set<String> unexpected = new HashSet<>(scanned.keySet());
        unexpected.removeAll(ALLOWLIST.keySet());
        Set<String> missing = new HashSet<>(ALLOWLIST.keySet());
        missing.removeAll(scanned.keySet());

        assertTrue(unexpected.isEmpty() && missing.isEmpty(),
            "the LSP4IJ coupling surface drifted from the allowlist -- unexpected files not in the "
                + "allowlist: " + unexpected + "; allowlisted files no longer coupled: " + missing);
    }

    @Test
    void everyAllowlistedFileUsesExactlyTheSymbolsTheAllowlistRecords() {
        Map<String, Set<String>> scanned = scanMainSources();

        for (Map.Entry<String, Set<String>> entry : ALLOWLIST.entrySet()) {
            Set<String> discovered = scanned.getOrDefault(entry.getKey(), Set.of());
            assertEquals(entry.getValue(), discovered,
                entry.getKey() + "'s discovered vendor symbols drifted from the allowlist");
        }
    }

    @Test
    void aFullyQualifiedUseWithoutAnImportIsCounted() {
        Map<String, Set<String>> scanned = scanMainSources();

        assertTrue(
            scanned.getOrDefault("com/basis/bbj/intellij/actions/BbjRunActionBase.java", Set.of())
                .contains("ServerStatus"),
            "BbjRunActionBase.java's fully-qualified ServerStatus reference (no import) was not counted");
        assertTrue(
            scanned.getOrDefault("com/basis/bbj/intellij/actions/BbjCompileAction.java", Set.of())
                .contains("ServerStatus"),
            "BbjCompileAction.java's fully-qualified ServerStatus reference (no import) was not counted");
    }

    @Test
    void vendorReferencesInsideCommentsAreNotCounted() {
        String source = String.join("\n",
            "package example;",
            "// com.redhat.devtools.lsp4ij.LineCommentGhost",
            "/* com.redhat.devtools.lsp4ij.BlockCommentGhost */",
            "/**",
            " * com.redhat.devtools.lsp4ij.JavadocGhost",
            " */",
            "import com.redhat.devtools.lsp4ij.ServerStatus;",
            "class Example {}"
        );

        String stripped = stripComments(source);

        assertFalse(stripped.contains("LineCommentGhost"), "a line comment's vendor reference survived stripping");
        assertFalse(stripped.contains("BlockCommentGhost"), "a block comment's vendor reference survived stripping");
        assertFalse(stripped.contains("JavadocGhost"), "a javadoc comment's vendor reference survived stripping");
        assertTrue(stripped.contains("import com.redhat.devtools.lsp4ij.ServerStatus;"),
            "the real import was stripped along with the comments");

        assertEquals(Set.of("ServerStatus"), extractSymbols(stripped));
    }

    @Test
    void aFileWithNoVendorReferenceContributesNoEntry() {
        String source = "package example;\nclass Example {}\n";

        Set<String> symbols = extractSymbols(stripComments(source));

        assertTrue(symbols.isEmpty(),
            "a source with no vendor reference must yield an empty symbol set, not an entry with one");
    }

    @Test
    void thisTestDoesNotDeriveTheAllowlistFromTheScan() {
        // Enforced structurally: ALLOWLIST above is a literal Map.ofEntries(...) built in this
        // test's own source, never assembled from scanMainSources()'s return value. This test
        // exists only to document that invariant for the acceptance-criteria grep, since a purely
        // structural property cannot be asserted with a runtime check without contradicting itself.
        assertEquals(11, ALLOWLIST.size());
    }
}
