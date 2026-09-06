package com.basis.bbj.intellij.lsp;

import com.redhat.devtools.lsp4ij.LanguageServerFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Asserts the LSP4IJ Gradle pin ({@code build.gradle.kts}) matches the vendor plugin descriptor of
 * the jar actually resolved on the test classpath -- by version, by jar file name, and by plugin
 * id -- so bumping the pin re-runs every canary in this package against the new jar. A plugin
 * descriptor cannot pin the *runtime* version of a dependency plugin the IDE resolves later; that
 * known limit is recorded in the plan's SUMMARY, with the reflective diagnostic-message read
 * introduced for {@code CompileResultPresenter} named as the standing runtime defence.
 */
class Lsp4ijVersionPinTest {

    private static final Path BUILD_SCRIPT = Paths.get("build.gradle.kts").toAbsolutePath();
    private static final String GRADLE_PIN_MARKER = "com.redhat.devtools.lsp4ij:";
    private static final String VENDOR_PLUGIN_ID = "com.redhat.devtools.lsp4ij";

    private static String readGradlePin() {
        if (!Files.exists(BUILD_SCRIPT)) {
            fail("build.gradle.kts not found at " + BUILD_SCRIPT);
        }
        String text;
        try {
            text = Files.readString(BUILD_SCRIPT);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(BUILD_SCRIPT, e);
        }
        int markerIndex = text.indexOf(GRADLE_PIN_MARKER);
        assertTrue(markerIndex >= 0, GRADLE_PIN_MARKER + " not found in " + BUILD_SCRIPT);
        int versionStart = markerIndex + GRADLE_PIN_MARKER.length();
        int versionEnd = text.indexOf('"', versionStart);
        assertTrue(versionEnd > versionStart, "no closing quote found after the LSP4IJ pin marker in " + BUILD_SCRIPT);
        return text.substring(versionStart, versionEnd);
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    /**
     * Resolves the jar backing {@link LanguageServerFactory} on the test classpath. When the
     * class resource resolves through a {@code jar:} URL, the jar itself is opened directly. When
     * it does not (a classes-directory layout), falls back to scanning {@code java.class.path}
     * for a jar file name containing "lsp4ij". Fails naming both attempts when neither resolves --
     * never skips, since a skip here would leave the pin entirely unchecked.
     */
    private static Path resolveVendorJar() {
        URL classUrl = LanguageServerFactory.class.getResource("LanguageServerFactory.class");
        if (classUrl == null) {
            fail("LanguageServerFactory.class resource not found on the classpath");
        }
        if ("jar".equals(classUrl.getProtocol())) {
            String urlPath = classUrl.getPath();
            int separatorIndex = urlPath.indexOf("!/");
            String jarPart = separatorIndex >= 0 ? urlPath.substring(0, separatorIndex) : urlPath;
            try {
                return Paths.get(new URI(jarPart));
            } catch (URISyntaxException e) {
                fail("Could not parse the jar: URL's file part '" + jarPart + "' as a URI: " + e.getMessage());
            }
        }
        String classPath = System.getProperty("java.class.path", "");
        for (String entry : classPath.split(File.pathSeparator)) {
            if (entry.toLowerCase(java.util.Locale.ROOT).contains("lsp4ij") && entry.endsWith(".jar")) {
                return Paths.get(entry);
            }
        }
        fail("Could not resolve the LSP4IJ vendor jar: the class resource was not a jar: URL ("
            + classUrl + "), and no lsp4ij jar was found on java.class.path");
        throw new AssertionError("unreachable");
    }

    private static Document readPluginDescriptor(Path jarPath) {
        try (JarFile jarFile = new JarFile(jarPath.toFile())) {
            JarEntry entry = jarFile.getJarEntry("META-INF/plugin.xml");
            if (entry == null) {
                fail("META-INF/plugin.xml not found inside " + jarPath);
            }
            try (InputStream in = jarFile.getInputStream(entry)) {
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
                factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
                factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
                factory.setXIncludeAware(false);
                factory.setExpandEntityReferences(false);
                DocumentBuilder builder = factory.newDocumentBuilder();
                return builder.parse(in);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to read plugin.xml from " + jarPath, e);
        }
    }

    private static String directChildText(Document document, String tagName) {
        Element root = document.getDocumentElement();
        NodeList children = root.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node instanceof Element && tagName.equals(node.getNodeName())) {
                return node.getTextContent() == null ? null : node.getTextContent().trim();
            }
        }
        fail("plugin.xml's root element has no direct child <" + tagName + ">");
        return null;
    }

    @Test
    void theGradlePinMatchesTheVendorPluginDescriptorOnTheTestClasspath() {
        String gradlePin = readGradlePin();
        Document descriptor = readPluginDescriptor(resolveVendorJar());
        String descriptorVersion = directChildText(descriptor, "version");

        assertEquals(gradlePin, descriptorVersion,
            "the LSP4IJ Gradle pin no longer matches the plugin descriptor's <version> on the test classpath");
    }

    @Test
    void theVendorJarOnTheClasspathIsTheOneTheModulePinned() {
        String gradlePin = readGradlePin();
        Path jarPath = resolveVendorJar();

        assertTrue(jarPath.getFileName().toString().contains(gradlePin),
            "the resolved vendor jar's file name '" + jarPath.getFileName() + "' does not contain "
                + "the pinned version '" + gradlePin + "'");
    }

    @Test
    void theVendorPluginIdIsTheOneTheModuleDependsOn() {
        Document descriptor = readPluginDescriptor(resolveVendorJar());
        String id = directChildText(descriptor, "id");

        assertEquals(VENDOR_PLUGIN_ID, id, "a jar swap changed the plugin id, even if the version happened to agree");
    }
}
