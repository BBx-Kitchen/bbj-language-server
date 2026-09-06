package com.basis.bbj.intellij.config;

import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Mechanical proof of the plugin.xml wiring a config file needs: its own highlighter factory
 * (never the stock TextMate one), an editor-highlighter provider for the config file type, no
 * {@code extensions} claim on the config {@code fileType} entry, and exactly one LSP4IJ language
 * mapping -- naming BBj -- so a config file never reaches the language server.
 */
class BbjConfigFileTypeRegistrationTest {

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();
    private static final Path HIGHLIGHTER_FACTORY_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbxConfigSyntaxHighlighterFactory.java")
            .toAbsolutePath();

    private static final String CONFIG_FILE_TYPE_NAME = "BBx Config";
    private static final String CONFIG_LANGUAGE_ID = "BBx Config";
    private static final String BBJ_LANGUAGE_ID = "BBj";
    private static final String FACTORY_IMPLEMENTATION_CLASS =
            "com.basis.bbj.intellij.BbxConfigSyntaxHighlighterFactory";

    private static Document readPluginXml() {
        if (!Files.exists(PLUGIN_XML)) {
            fail("plugin.xml not found at " + PLUGIN_XML);
        }
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(PLUGIN_XML.toFile());
        } catch (Exception e) {
            throw new RuntimeException("Failed to read " + PLUGIN_XML, e);
        }
    }

    private static String readHighlighterFactorySource() {
        if (!Files.exists(HIGHLIGHTER_FACTORY_SOURCE)) {
            fail("Highlighter factory source not found at " + HIGHLIGHTER_FACTORY_SOURCE);
        }
        try {
            return Files.readString(HIGHLIGHTER_FACTORY_SOURCE);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(HIGHLIGHTER_FACTORY_SOURCE, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    private static List<Element> elementsByTagName(Document document, String tagName) {
        NodeList nodes = document.getElementsByTagName(tagName);
        List<Element> elements = new ArrayList<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            Node node = nodes.item(i);
            if (node instanceof Element) {
                elements.add((Element) node);
            }
        }
        return elements;
    }

    @Test
    void editorHighlighterProviderIsRegisteredForTheConfigFileType() {
        Document document = readPluginXml();
        List<Element> providers = elementsByTagName(document, "editorHighlighterProvider");
        boolean found = providers.stream()
                .anyMatch(e -> CONFIG_FILE_TYPE_NAME.equals(e.getAttribute("filetype")));
        assertTrue(found, "no editorHighlighterProvider found with filetype=\"" + CONFIG_FILE_TYPE_NAME + "\"");
    }

    @Test
    void syntaxHighlighterFactoryIsRegisteredForTheConfigLanguageAndNamesThePluginsOwnFactory() {
        Document document = readPluginXml();
        List<Element> factories = elementsByTagName(document, "lang.syntaxHighlighterFactory");
        Element match = factories.stream()
                .filter(e -> CONFIG_LANGUAGE_ID.equals(e.getAttribute("language")))
                .findFirst()
                .orElse(null);
        assertTrue(match != null, "no lang.syntaxHighlighterFactory found with language=\"" + CONFIG_LANGUAGE_ID + "\"");
        assertEquals(FACTORY_IMPLEMENTATION_CLASS, match.getAttribute("implementationClass"),
                "the config Language's syntax-highlighter factory must be the plugin's own class, not the stock TextMate factory");
    }

    @Test
    void configFileTypeEntryHasNoExtensionsAttribute() {
        Document document = readPluginXml();
        List<Element> fileTypes = elementsByTagName(document, "fileType");
        Element configEntry = fileTypes.stream()
                .filter(e -> CONFIG_FILE_TYPE_NAME.equals(e.getAttribute("name")))
                .findFirst()
                .orElse(null);
        assertTrue(configEntry != null, "no fileType entry found with name=\"" + CONFIG_FILE_TYPE_NAME + "\"");
        assertFalse(configEntry.hasAttribute("extensions"),
                "the config fileType entry must not claim extensions -- the runtime override resolves the bbx overlap");
    }

    @Test
    void exactlyOneLanguageMappingExistsAndItNamesBbj() {
        Document document = readPluginXml();
        List<Element> mappings = elementsByTagName(document, "languageMapping");
        assertEquals(1, mappings.size(), "exactly one LSP4IJ languageMapping element must exist");
        assertEquals(BBJ_LANGUAGE_ID, mappings.get(0).getAttribute("language"),
                "the single languageMapping must name the BBj language, never the config language");
    }

    @Test
    void highlighterFactoryResolvesByAConstantNameNotTheOpenedFilesName() {
        String source = readHighlighterFactorySource();
        assertTrue(source.contains("getLanguageDescriptorByFileName("),
                "factory must call getLanguageDescriptorByFileName");
        assertFalse(source.contains("getLanguageDescriptorByFileName(virtualFile.getName())")
                        && source.contains("virtualFile.getName()"),
                "factory must not resolve the grammar by the opened file's name");
        assertFalse(containsCallOnPassedVirtualFile(source),
                "no getName() call on the passed VirtualFile parameter may remain in the factory");
    }

    /**
     * A crude but effective source-level check: the file must not contain a
     * {@code .getName()} call chained directly off a parameter named {@code virtualFile} or
     * {@code file} -- the two conventional parameter names for the passed {@code VirtualFile}.
     */
    private static boolean containsCallOnPassedVirtualFile(String source) {
        return source.contains("virtualFile.getName()") || source.contains("file.getName()");
    }
}
