package com.basis.bbj.intellij;

import com.intellij.openapi.application.PathManager;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.plugins.textmate.api.TextMateBundleProvider;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
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

    @NotNull
    @Override
    public List<PluginBundle> getBundles() {
        try {
            Path bundleDir = Files.createTempDirectory(
                Path.of(PathManager.getTempPath()), "textmate-bbj");

            for (String file : BUNDLE_FILES) {
                URL resource = getClass().getClassLoader()
                    .getResource(BUNDLE_RESOURCE_PATH + file);
                Objects.requireNonNull(resource,
                    "Missing TextMate bundle resource: " + BUNDLE_RESOURCE_PATH + file);
                try (InputStream stream = resource.openStream()) {
                    Path target = bundleDir.resolve(file);
                    Files.createDirectories(target.getParent());
                    Files.copy(stream, target);
                }
            }

            return List.of(new PluginBundle("BBj", bundleDir));
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract BBj TextMate bundle", e);
        }
    }
}
