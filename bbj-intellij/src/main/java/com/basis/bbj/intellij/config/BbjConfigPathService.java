package com.basis.bbj.intellij.config;

import com.basis.bbj.intellij.BbjSettings;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.Nullable;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Application-level warm cache for the resolved config path, and the two config-file predicates
 * a later SETOPTS composer and a file-type override will consume. Every method here answers from
 * the cache and the settings string only -- never by probing the filesystem or calling back into
 * the language server -- so none of it ever blocks an EDT or an indexing thread.
 */
public final class BbjConfigPathService {

    private static final String[] DEFAULT_CONFIG_FILENAMES = {"config.bbx", "config.min"};

    /**
     * Volatile because IntelliJ's file-type override runs on indexing threads concurrently with
     * the notification write; a stale or torn read here would mis-classify a file.
     */
    private volatile ConfigModels.ResolvedConfigPathResult resolvedConfigPath;

    private final Set<String> warnedPaths = Collections.synchronizedSet(new HashSet<>());

    public static BbjConfigPathService getInstance() {
        return ApplicationManager.getApplication().getService(BbjConfigPathService.class);
    }

    /** Stores the latest pushed payload. The last push wins by construction (a plain volatile write). */
    public void update(ConfigModels.ResolvedConfigPathResult result) {
        this.resolvedConfigPath = result;
    }

    /** The last pushed payload, or {@code null} if none has arrived yet. */
    @Nullable
    public ConfigModels.ResolvedConfigPathResult getResolvedConfigPath() {
        return resolvedConfigPath;
    }

    /**
     * The active config path: the cached pushed path when non-blank, else the explicit
     * {@code BbjSettings.State.configPath} setting normalized verbatim, else the empty string.
     */
    public String activeConfigPath() {
        ConfigModels.ResolvedConfigPathResult cached = this.resolvedConfigPath;
        String cachedPath = cached != null ? cached.path : null;
        return resolveActivePath(cachedPath, BbjSettings.getInstance().getState().configPath);
    }

    /**
     * Pure decision for {@link #activeConfigPath()}: the cached pushed path when non-blank, else
     * the explicit setting normalized verbatim, else the empty string. This pre-answer branch
     * uses the explicit setting VERBATIM -- it must never join a BBj home with {@code cfg} and
     * {@code config.bbx}, because that derivation belongs to the language server alone.
     * Package-visible and static so it is testable without a live IntelliJ Application.
     */
    static String resolveActivePath(@Nullable String cachedPath, @Nullable String explicitSetting) {
        if (cachedPath != null && !cachedPath.isBlank()) {
            return cachedPath;
        }
        return ConfigPaths.normalizeSetting(explicitSetting);
    }

    /**
     * True for the active config file, and for any file whose name case-insensitively equals one
     * of the default config filenames -- this is the predicate a later SETOPTS composer will
     * consume, so it is kept null-safe and free of any language-server call.
     */
    public boolean isConfigFile(@Nullable VirtualFile file) {
        if (file == null) {
            return false;
        }
        return isConfigFileName(activeConfigPath(), file.getPath(), file.getName());
    }

    /**
     * Pure decision for {@link #isConfigFile(VirtualFile)}. Static so it is testable without a
     * real {@code VirtualFile}.
     */
    static boolean isConfigFileName(String activePath, String filePath, @Nullable String fileName) {
        if (!activePath.isEmpty() && ConfigPaths.samePath(activePath, filePath)) {
            return true;
        }
        return isDefaultConfigFilename(fileName);
    }

    /** Whether {@code fileName} case-insensitively matches one of the default config filenames. */
    static boolean isDefaultConfigFilename(@Nullable String fileName) {
        if (fileName == null) {
            return false;
        }
        for (String defaultName : DEFAULT_CONFIG_FILENAMES) {
            if (defaultName.equalsIgnoreCase(fileName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * True only for the {@code samePath} match, so a caller can tell a default-named file that is
     * not live from the one the tooling actually reads.
     */
    public boolean isActiveConfigFile(@Nullable VirtualFile file) {
        if (file == null) {
            return false;
        }
        String active = activeConfigPath();
        return !active.isEmpty() && ConfigPaths.samePath(active, file.getPath());
    }

    /**
     * Returns {@code true} the first time it is called for a distinct {@code path} in this
     * session, {@code false} for every subsequent call with the same path -- backed by a
     * session-scoped set of already-warned paths.
     */
    public boolean shouldWarnOnce(String path) {
        return warnedPaths.add(path);
    }
}
