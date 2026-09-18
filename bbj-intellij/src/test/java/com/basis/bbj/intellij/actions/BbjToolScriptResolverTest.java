package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link BbjToolScriptResolver}: a present script resolves to its
 * absolute path, a missing script returns null, a null plugin root returns null without
 * touching the filesystem, and a throwing seam returns null rather than propagating. Does not
 * exercise {@link BbjToolScriptResolver#SESSION} -- that needs a running IDE.
 */
class BbjToolScriptResolverTest {

    @Test
    void aPresentScriptResolvesToItsAbsolutePath(@TempDir Path pluginRoot) throws IOException {
        Path toolsDir = pluginRoot.resolve("lib").resolve("tools");
        Files.createDirectories(toolsDir);
        Path script = toolsDir.resolve("web.bbj");
        Files.writeString(script, "rem web.bbj");

        BbjToolScriptResolver resolver = new BbjToolScriptResolver(() -> pluginRoot);

        String resolved = resolver.resolveToolScript("web.bbj");

        assertEquals(script.toString(), resolved);
        assertEquals(toolsDir.toString(), Path.of(resolved).getParent().toString());
    }

    @Test
    void allThreeScriptNamesResolveUnderTheSameToolsDirectory(@TempDir Path pluginRoot) throws IOException {
        Path toolsDir = pluginRoot.resolve("lib").resolve("tools");
        Files.createDirectories(toolsDir);
        Files.writeString(toolsDir.resolve("web.bbj"), "rem");
        Files.writeString(toolsDir.resolve("em-login.bbj"), "rem");
        Files.writeString(toolsDir.resolve("em-validate-token.bbj"), "rem");

        BbjToolScriptResolver resolver = new BbjToolScriptResolver(() -> pluginRoot);

        for (String scriptName : new String[] {"web.bbj", "em-login.bbj", "em-validate-token.bbj"}) {
            String resolved = resolver.resolveToolScript(scriptName);
            assertTrue(resolved != null && resolved.startsWith(toolsDir.toString()),
                    scriptName + " should resolve under " + toolsDir);
        }
    }

    @Test
    void aMissingScriptReturnsNull(@TempDir Path pluginRoot) throws IOException {
        Path toolsDir = pluginRoot.resolve("lib").resolve("tools");
        Files.createDirectories(toolsDir);
        // No script file written.

        BbjToolScriptResolver resolver = new BbjToolScriptResolver(() -> pluginRoot);

        assertNull(resolver.resolveToolScript("web.bbj"));
    }

    @Test
    void aNullPluginRootReturnsNullWithoutTouchingTheFilesystem() {
        BbjToolScriptResolver resolver = new BbjToolScriptResolver(() -> null);

        assertNull(resolver.resolveToolScript("web.bbj"));
    }

    @Test
    void aThrowingSeamReturnsNullRatherThanPropagating() {
        BbjToolScriptResolver resolver = new BbjToolScriptResolver(() -> {
            throw new RuntimeException("boom");
        });

        assertNull(resolver.resolveToolScript("web.bbj"));
    }
}
