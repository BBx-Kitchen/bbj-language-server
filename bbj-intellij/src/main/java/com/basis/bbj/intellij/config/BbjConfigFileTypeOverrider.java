package com.basis.bbj.intellij.config;

import com.basis.bbj.intellij.BbjConfigFileType;
import com.intellij.openapi.fileTypes.FileType;
import com.intellij.openapi.fileTypes.impl.FileTypeOverrider;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.Nullable;

/**
 * Applies the plugin's config file type to whichever file {@link BbjConfigPathService#isConfigFile}
 * says is the active config file (or a default-named one), whatever its extension. This runs
 * synchronously on indexing threads, so the whole decision lives in that one predicate -- no
 * filesystem probing, no blocking, no language-server call -- and is safe to call concurrently
 * with the cache being written by a pushed notification.
 */
public final class BbjConfigFileTypeOverrider implements FileTypeOverrider {

    @Override
    public @Nullable FileType getOverriddenFileType(VirtualFile file) {
        if (BbjConfigPathService.getInstance().isConfigFile(file)) {
            return BbjConfigFileType.INSTANCE;
        }
        return null;
    }
}
