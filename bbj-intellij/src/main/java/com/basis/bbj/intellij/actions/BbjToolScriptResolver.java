package com.basis.bbj.intellij.actions;

import org.jetbrains.annotations.Nullable;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Resolves the absolute path of one of the three bundled BBj tool scripts ({@code web.bbj},
 * {@code em-login.bbj}, {@code em-validate-token.bbj}) inside the installed plugin, following
 * the {@link com.basis.bbj.intellij.BbjInteropPortCache} seam convention: a {@code public final}
 * class, a nested {@link FunctionalInterface} collaborator, a {@code public static final SESSION}
 * wired to the real collaborator, and a package-private constructor for fake injection from
 * tests. Deliberately holds no mutable state and caches nothing -- unlike the cache classes this
 * shape is borrowed from, there is nothing here that benefits from memoization, and nothing for
 * two concurrent callers to race on.
 *
 * <p>Returns the absolute path string when the script exists under the plugin's bundled tools
 * directory, and {@code null} when the plugin descriptor is not found, the file does not exist,
 * or any exception is raised -- reproducing exactly the contract of the three private lookups
 * this class replaces.
 */
public final class BbjToolScriptResolver {

    /** Resolves the installed plugin's root directory, or {@code null} when not found. */
    @FunctionalInterface
    interface PluginPathResolver {
        @Nullable Path pluginRoot();
    }

    /**
     * The single production instance, resolving over the real collaborator: the plugin
     * descriptor lookup for {@code com.basis.bbj} via {@link com.intellij.ide.plugins.PluginManagerCore}.
     */
    public static final BbjToolScriptResolver SESSION =
            new BbjToolScriptResolver(BbjToolScriptResolver::defaultPluginRoot);

    @Nullable
    private static Path defaultPluginRoot() {
        try {
            com.intellij.ide.plugins.IdeaPluginDescriptor plugin =
                    com.intellij.ide.plugins.PluginManagerCore.getPlugin(
                            com.intellij.openapi.extensions.PluginId.getId("com.basis.bbj"));
            if (plugin == null) {
                return null;
            }
            return plugin.getPluginPath();
        } catch (Exception e) {
            return null;
        }
    }

    private final PluginPathResolver pluginPathResolver;

    /** Package-private so tests can inject a fake plugin root. */
    BbjToolScriptResolver(PluginPathResolver pluginPathResolver) {
        this.pluginPathResolver = pluginPathResolver;
    }

    /**
     * Resolves one of the bundled tool scripts (e.g. {@code "web.bbj"}, {@code "em-login.bbj"},
     * {@code "em-validate-token.bbj"}) beneath the plugin's {@code lib/tools} directory -- the
     * exact relative path {@code prepareSandbox} copies the three scripts into
     * (build.gradle.kts's {@code into(...)} target).
     *
     * @param scriptName the bundled script's filename
     * @return the script's absolute path string, or {@code null} when the plugin is not found,
     *     the file does not exist, or any exception is raised
     */
    @Nullable
    public String resolveToolScript(String scriptName) {
        try {
            Path root = pluginPathResolver.pluginRoot();
            if (root == null) {
                return null;
            }
            Path scriptPath = root.resolve("lib/tools/" + scriptName);
            if (!Files.exists(scriptPath)) {
                return null;
            }
            return scriptPath.toString();
        } catch (Exception e) {
            return null;
        }
    }
}
