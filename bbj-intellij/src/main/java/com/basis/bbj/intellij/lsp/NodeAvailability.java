package com.basis.bbj.intellij.lsp;

import java.nio.file.Path;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * Plain-Java decision seam behind the missing-Node editor banner. This class holds no IntelliJ
 * platform import, so plain JUnit can drive both banner branches directly; it is a mechanical
 * extraction of the editor banner's decision — the same conditions, in the same order, that
 * {@code BbjMissingNodeNotificationProvider} used to evaluate inline.
 */
public final class NodeAvailability {

    private NodeAvailability() {
    }

    /**
     * The five outcomes a Node.js availability check can reach: which candidate (if any) turned
     * out usable, or that none did.
     */
    public enum Decision {
        CONFIGURED_PATH_USABLE,
        CONFIGURED_PATH_UNUSABLE,
        DETECTED_PATH_USABLE,
        CACHED_DOWNLOAD_USABLE,
        NO_RUNTIME_FOUND
    }

    /**
     * A filesystem existence predicate over a candidate path, injectable for testing. Mirrors the
     * shape of {@link NodeExecutableResolver.PathProbe}.
     */
    public interface FileProbe {
        boolean exists(String path);
    }

    /** The production {@link FileProbe}, backed by {@code java.io.File}. */
    public static final FileProbe REAL_FILES = path -> new java.io.File(path).exists();

    /**
     * The whole banner decision, preserving today's order exactly. When {@code configuredPath} is
     * non-empty, only the configured candidate is consulted — the detector and the cached download
     * are never reached on this branch. When {@code configuredPath} is empty, the detected path is
     * tried first and the cached download second; the version resolver is short-circuited so it is
     * never handed a null path.
     */
    public static Decision decide(String configuredPath, FileProbe files,
            Function<String, String> versionOf, Predicate<String> meetsMinimum,
            Supplier<String> detectedPath, Supplier<Path> cachedNodePath) {
        if (!configuredPath.isEmpty()) {
            if (files.exists(configuredPath) && meetsMinimum.test(versionOf.apply(configuredPath))) {
                return Decision.CONFIGURED_PATH_USABLE;
            }
            return Decision.CONFIGURED_PATH_UNUSABLE;
        }

        String detected = detectedPath.get();
        if (detected != null && meetsMinimum.test(versionOf.apply(detected))) {
            return Decision.DETECTED_PATH_USABLE;
        }
        if (cachedNodePath.get() != null) {
            return Decision.CACHED_DOWNLOAD_USABLE;
        }
        return Decision.NO_RUNTIME_FOUND;
    }

    /**
     * Whether the editor banner must be shown for a given decision. Written as an exhaustive
     * switch so a future sixth {@link Decision} constant fails to compile here rather than
     * silently defaulting to "no banner".
     */
    public static boolean bannerNeeded(Decision decision) {
        return switch (decision) {
            case CONFIGURED_PATH_UNUSABLE, NO_RUNTIME_FOUND -> true;
            case CONFIGURED_PATH_USABLE, DETECTED_PATH_USABLE, CACHED_DOWNLOAD_USABLE -> false;
        };
    }
}
