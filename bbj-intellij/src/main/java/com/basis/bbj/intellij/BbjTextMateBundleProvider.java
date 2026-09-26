package com.basis.bbj.intellij;

import com.intellij.openapi.application.PathManager;
import com.intellij.openapi.extensions.PluginDescriptor;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.jetbrains.plugins.textmate.api.TextMateBundleProvider;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;

public class BbjTextMateBundleProvider implements TextMateBundleProvider {
    private static final String BUNDLE_RESOURCE_PATH = "textmate/bbj-bundle/";
    private static final List<String> BUNDLE_FILES = List.of(
        "package.json",
        "bbj-language-configuration.json",
        "bbx-language-configuration.json",
        "syntaxes/bbj.tmLanguage.json",
        "syntaxes/bbx.tmLanguage.json"
    );

    /** The prefix earlier launches used for {@code Files.createTempDirectory}, swept below. */
    private static final String ABANDONED_TEMP_DIR_PREFIX = "textmate-bbj";

    @NotNull
    @Override
    public List<PluginBundle> getBundles() {
        Path bundleDir = Paths.get(PathManager.getPluginsPath(), "bbj-intellij-data", "textmate");
        String pluginVersion = resolvePluginVersion();

        try {
            if (!TextMateBundleCache.isPopulatedFor(bundleDir, pluginVersion, BUNDLE_FILES)) {
                TextMateBundleCache.populate(bundleDir, pluginVersion, BUNDLE_FILES,
                        this::openBundleResource);
            }
            // Only after the stable directory above is confirmed populated: never delete the
            // old per-launch temp copies before the new one is known good. Guarded so a sweep
            // failure can never prevent this method returning its PluginBundle.
            sweepAbandonedTempDirectoriesQuietly();
            return List.of(new PluginBundle("BBj", bundleDir));
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract BBj TextMate bundle", e);
        }
    }

    private static void sweepAbandonedTempDirectoriesQuietly() {
        try {
            TextMateBundleCache.sweepAbandoned(
                    Path.of(PathManager.getTempPath()), ABANDONED_TEMP_DIR_PREFIX);
        } catch (RuntimeException e) {
            // Best-effort cleanup: a sweep failure must never prevent bundle registration.
        }
    }

    private InputStream openBundleResource(String relativePath) throws IOException {
        URL resource = getClass().getClassLoader()
            .getResource(BUNDLE_RESOURCE_PATH + relativePath);
        Objects.requireNonNull(resource,
            "Missing TextMate bundle resource: " + BUNDLE_RESOURCE_PATH + relativePath);
        return resource.openStream();
    }

    /**
     * The running plugin's version, or {@code null} when the descriptor cannot be resolved (a
     * development/test classloader). {@link TextMateBundleCache} treats a {@code null} version as
     * "never a cache hit," so this degrades safely to a fresh copy rather than a false hit.
     */
    private static @Nullable String resolvePluginVersion() {
        PluginDescriptor plugin = BbjPluginDescriptor.get();
        return plugin != null ? plugin.getVersion() : null;
    }
}
