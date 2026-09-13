package com.basis.bbj.intellij.ui;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Plain-JUnit coverage of {@link BbjFileVisibility}'s decision: visibility follows the resolved
 * file type name, never the extension. Every input here is a plain {@code String} -- no {@code
 * FileType}, {@code VirtualFile} or live {@code Application} is constructed (see #610).
 */
class BbjFileVisibilityTest {

    private static final Path BBJ_FILE_TYPE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjFileType.java")
            .toAbsolutePath();
    private static final Path BBJ_CONFIG_FILE_TYPE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjConfigFileType.java")
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
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    @Test
    void bbjFileTypeNameIsRecognizedAsAProgram() {
        assertTrue(BbjFileVisibility.isBbjProgramFileTypeName("BBj"),
                "the BBj file type name (bbj/bbjt/src/bbx programs) must be recognized");
    }

    @Test
    void configFileTypeNameIsNotAProgram() {
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName("BBx Config"),
                "config.bbx, config.min and a custom-named config file all resolve to this type name -- never a program");
    }

    @Test
    void nonBbjPlatformFallbackNamesAreNotAProgram() {
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName("PLAIN_TEXT"),
                ".bbl resolves to a platform fallback type, not BBj");
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName("UNKNOWN"),
                "an unrecognized file has no BBj file type");
    }

    @Test
    void unrelatedFileTypeNamesAreNotAProgram() {
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName("JAVA"));
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName("JSON"));
    }

    @Test
    void comparisonIsExactNameNotCaseInsensitive() {
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName("bbj"),
                "the decision compares the exact resolved file type name, not a case-folded variant");
    }

    @Test
    void emptyAndNullNamesAreNotAProgram() {
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName(""));
        assertFalse(BbjFileVisibility.isBbjProgramFileTypeName(null));
    }

    @Test
    void noSelectedFileTypeNamesHidesTheWidgets() {
        assertFalse(BbjFileVisibility.showsForFileTypeNames(List.of()),
                "an empty selection (no editor open) must hide the widgets");
    }

    @Test
    void anyBbjFileTypeNameAmongSeveralSelectedFilesShowsTheWidgets() {
        assertTrue(BbjFileVisibility.showsForFileTypeNames(List.of("PLAIN_TEXT", "BBj")),
                "a split editor with one BBj file among several selected files must show the widgets");
    }

    @Test
    void onlyConfigFileTypeNameHidesTheWidgets() {
        assertFalse(BbjFileVisibility.showsForFileTypeNames(List.of("BBx Config")));
    }

    @Test
    void configPlusUnrelatedFileTypeNamesHideTheWidgets() {
        assertFalse(BbjFileVisibility.showsForFileTypeNames(List.of("BBx Config", "JAVA")));
    }

    @Test
    void driftGuardBbjFileTypeNameConstantMatchesTheLiveFileType() {
        assertEquals("BBj", BbjFileVisibility.BBJ_FILE_TYPE_NAME,
                "the shared decision's constant must track BbjFileType.getName()'s literal");
    }

    @Test
    void driftGuardBbjFileTypeSourceStillReturnsBBj() {
        String text = readSource(BBJ_FILE_TYPE_SOURCE);
        assertTrue(text.contains("return \"BBj\";"),
                "BbjFileType.getName() must still return the literal this decision compares against");
    }

    @Test
    void driftGuardConfigFileTypeSourceStillReturnsBBxConfig() {
        String text = readSource(BBJ_CONFIG_FILE_TYPE_SOURCE);
        assertTrue(text.contains("return \"BBx Config\";"),
                "BbjConfigFileType.getName() must still return the config file type name this decision excludes");
    }

    @Test
    void driftGuardPluginXmlBbjFileTypeExtensionsIncludeBbxExcludeBbl() {
        String text = readSource(PLUGIN_XML);
        assertTrue(text.contains("extensions=\"bbj;bbjt;src;bbx\""),
                "the BBj fileType entry must include bbx (program) and never include bbl");
    }
}
