package com.basis.bbj.intellij.lsp;

import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Decides which of three candidate Node.js executable values, if any, should be used
 * to launch the language server.
 */
public final class NodeExecutableResolver {

    private NodeExecutableResolver() {
    }

    /**
     * Which of the three candidate producers supplied a resolved path.
     */
    public enum Source {
        SETTINGS,
        DETECTED,
        CACHED
    }

    /**
     * The first validation step a rejected candidate failed.
     */
    public enum Reason {
        MALFORMED,
        NOT_ABSOLUTE,
        MISSING,
        NOT_A_FILE,
        NOT_EXECUTABLE
    }

    /**
     * A candidate that did not pass validation, and why.
     */
    public record Rejected(Source source, Reason reason, String candidate) {
    }

    /**
     * A filesystem predicate over a candidate path, injectable for testing.
     */
    public interface PathProbe {
        boolean exists(String path);

        boolean isRegularFile(String path);

        boolean isExecutable(String path);
    }

    /**
     * The production {@link PathProbe}, backed by {@code java.nio.file.Files}.
     */
    public static final PathProbe REAL_FILESYSTEM = new PathProbe() {
        @Override
        public boolean exists(String path) {
            try {
                return java.nio.file.Files.exists(java.nio.file.Paths.get(path));
            } catch (RuntimeException e) {
                return false;
            }
        }

        @Override
        public boolean isRegularFile(String path) {
            try {
                return java.nio.file.Files.isRegularFile(java.nio.file.Paths.get(path));
            } catch (RuntimeException e) {
                return false;
            }
        }

        @Override
        public boolean isExecutable(String path) {
            try {
                return java.nio.file.Files.isExecutable(java.nio.file.Paths.get(path));
            } catch (RuntimeException e) {
                return false;
            }
        }
    };

    /**
     * The outcome of a resolution attempt: either a resolved path and its source, or a
     * list of the rejections recorded along the way and an actionable message.
     */
    public static final class Resolution {

        private final boolean resolved;
        private final String path;
        private final Source source;
        private final List<Rejected> rejections;

        private Resolution(boolean resolved, String path, Source source, List<Rejected> rejections) {
            this.resolved = resolved;
            this.path = path;
            this.source = source;
            this.rejections = Collections.unmodifiableList(new ArrayList<>(rejections));
        }

        static Resolution resolved(String path, Source source) {
            return new Resolution(true, path, source, Collections.emptyList());
        }

        static Resolution unresolved(List<Rejected> rejections) {
            return new Resolution(false, null, null, rejections);
        }

        public boolean isResolved() {
            return resolved;
        }

        public String path() {
            if (!resolved) {
                throw new IllegalStateException("path() is only meaningful when resolved");
            }
            return path;
        }

        public Source source() {
            if (!resolved) {
                throw new IllegalStateException("source() is only meaningful when resolved");
            }
            return source;
        }

        public List<Rejected> rejections() {
            return rejections;
        }

        public String failureMessage() {
            if (resolved) {
                throw new IllegalStateException("failureMessage() is only meaningful when unresolved");
            }
            StringBuilder message = new StringBuilder("No usable Node.js executable was found.");
            for (Rejected rejected : rejections) {
                message.append(System.lineSeparator()).append(render(rejected));
            }
            message.append(System.lineSeparator())
                    .append("Configure a Node.js executable at Settings | Languages & Frameworks | BBj.");
            return message.toString();
        }
    }

    /**
     * The whole decision: the configured, detected and cached candidates are tried in that
     * order. Each non-blank candidate runs the same five-step validation core, and the first
     * one to pass is returned; a rejected candidate does not stop resolution, it falls through
     * to the next branch and its rejection is retained.
     */
    public static Resolution resolve(String configuredPath, String detectedPath, String cachedPath,
                                      PathProbe probe) {
        List<Rejected> rejections = new ArrayList<>();

        String accepted = validate(Source.SETTINGS, configuredPath, probe, rejections);
        if (accepted != null) {
            return Resolution.resolved(accepted, Source.SETTINGS);
        }
        accepted = validate(Source.DETECTED, detectedPath, probe, rejections);
        if (accepted != null) {
            return Resolution.resolved(accepted, Source.DETECTED);
        }
        accepted = validate(Source.CACHED, cachedPath, probe, rejections);
        if (accepted != null) {
            return Resolution.resolved(accepted, Source.CACHED);
        }
        return Resolution.unresolved(rejections);
    }

    /**
     * Runs the five-step validation core against one candidate: it parses as a path, it is
     * absolute, it exists, it is a regular file, it is executable. A blank candidate is absent
     * and is skipped without recording anything; the first unsatisfied step on a non-blank
     * candidate is recorded as a {@link Rejected}. Returns the candidate unchanged when every
     * step passes, else {@code null}.
     */
    private static String validate(Source source, String candidate, PathProbe probe,
                                     List<Rejected> rejections) {
        if (candidate == null || candidate.isBlank()) {
            return null;
        }
        Path parsed;
        try {
            parsed = java.nio.file.Paths.get(candidate);
        } catch (InvalidPathException e) {
            rejections.add(new Rejected(source, Reason.MALFORMED, candidate));
            return null;
        }
        if (!parsed.isAbsolute()) {
            rejections.add(new Rejected(source, Reason.NOT_ABSOLUTE, candidate));
            return null;
        }
        if (!probe.exists(candidate)) {
            rejections.add(new Rejected(source, Reason.MISSING, candidate));
            return null;
        }
        if (!probe.isRegularFile(candidate)) {
            rejections.add(new Rejected(source, Reason.NOT_A_FILE, candidate));
            return null;
        }
        if (!probe.isExecutable(candidate)) {
            rejections.add(new Rejected(source, Reason.NOT_EXECUTABLE, candidate));
            return null;
        }
        return candidate;
    }

    private static String render(Rejected rejected) {
        String label = switch (rejected.source()) {
            case SETTINGS -> "Settings";
            case DETECTED -> "Detected";
            case CACHED -> "Cached";
        };
        String reason = describe(rejected.reason());
        String candidate = "\"" + escape(rejected.candidate()) + "\"";
        if (rejected.source() == Source.SETTINGS) {
            return label + " value " + candidate + " " + reason
                    + ". Configure a valid path at Settings | Languages & Frameworks | BBj.";
        }
        return label + " value " + candidate + " " + reason + ".";
    }

    private static String describe(Reason reason) {
        return switch (reason) {
            case MALFORMED -> "could not be parsed as a path";
            case NOT_ABSOLUTE -> "is not an absolute path";
            case MISSING -> "does not exist";
            case NOT_A_FILE -> "is not a regular file";
            case NOT_EXECUTABLE -> "is not executable";
        };
    }

    private static String escape(String value) {
        StringBuilder escaped = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c < 0x20) {
                escaped.append(String.format("\\x%02x", (int) c));
            } else {
                escaped.append(c);
            }
        }
        return escaped.toString();
    }
}
