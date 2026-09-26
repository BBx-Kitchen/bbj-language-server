package com.basis.bbj.intellij;

import com.intellij.ide.plugins.cl.PluginAwareClassLoader;
import com.intellij.openapi.extensions.PluginDescriptor;
import org.jetbrains.annotations.Nullable;

/**
 * The BBj plugin's own descriptor, read from the classloader that loaded this class.
 * <p>
 * Lookups by plugin id ({@code PluginManager.findEnabledPlugin}, {@code PluginManagerCore.getPlugin})
 * are internal API from IntelliJ 2026.2 on, while {@link PluginAwareClassLoader#getPluginDescriptor()}
 * is public in every supported version.
 */
public final class BbjPluginDescriptor {

    private BbjPluginDescriptor() {
    }

    /**
     * The descriptor, or {@code null} when this class was not loaded by a plugin classloader
     * (a development or test classloader).
     */
    public static @Nullable PluginDescriptor get() {
        return BbjPluginDescriptor.class.getClassLoader() instanceof PluginAwareClassLoader loader
                ? loader.getPluginDescriptor()
                : null;
    }
}
