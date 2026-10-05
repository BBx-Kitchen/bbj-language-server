package com.basis.bbj.intellij.tokenized;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Plain-Java core of decompiling a tokenized BBj program with {@code bbjlst}: the executable
 * lookup, the argument list, the private output directory, the judgement of the result and the
 * atomic replace. It touches no platform API, so the whole flow is testable against the real tool.
 *
 * <p>{@code bbjlst} always runs with {@code -d<private directory>}, which makes the listing land
 * in that directory under exactly the input's file name and never next to the input. Success is
 * judged by the listing alone, because {@code bbjlst} exits 0 even when it fails.
 */
public final class BbjLstCommand {

    /** Name prefix of the private directory each decompile run gets. */
    private static final String PRIVATE_DIR_PREFIX = "bbj-decompiled-";
    /** How long a listing that never appears is waited for after {@code bbjlst} has returned. */
    private static final long APPEAR_GRACE_MILLIS = 3_000;
    /** How long a listing that keeps growing is waited for before it is judged as it stands. */
    private static final long SETTLE_LIMIT_MILLIS = 20_000;
    private static final long POLL_MILLIS = 150;
    /** The most of {@code bbjlst}'s own output that is quoted in a failure message. */
    private static final int OUTPUT_QUOTE_LIMIT = 500;

    /** Runs a command line and reports how it ended. */
    public interface Runner {
        Output run(@NotNull List<String> argv, long timeoutMillis) throws IOException, InterruptedException;
    }

    /** How a {@link Runner} run ended. */
    public record Output(int exitCode, @NotNull String stdout, @NotNull String stderr, boolean timedOut) {
    }

    /** A failure whose message is the cause to show the user. */
    public static final class DecompileException extends Exception {
        public DecompileException(@NotNull String message) {
            super(message);
        }
    }

    private BbjLstCommand() {
    }

    /** {@code <home>/bin/bbjlst} (or {@code bbjlst.exe}) when that is a regular, executable file. */
    public static @Nullable Path resolveExecutable(@Nullable String bbjHome, boolean windows) {
        if (bbjHome == null || bbjHome.isBlank()) {
            return null;
        }
        try {
            Path executable = Paths.get(bbjHome, "bin", windows ? "bbjlst.exe" : "bbjlst");
            if (Files.isRegularFile(executable) && Files.isExecutable(executable)) {
                return executable.toAbsolutePath();
            }
        } catch (InvalidPathException e) {
            // a malformed BBj Home is the same as no bbjlst
        }
        return null;
    }

    /**
     * The argument list: the executable, {@code -l}, {@code -xlst} only for a {@code .lst} input,
     * one {@code -d<outputDir>} element and the input path last. No element is ever split.
     */
    public static @NotNull List<String> argv(@NotNull Path executable, @NotNull Path outputDir, @NotNull Path input) {
        List<String> argv = new ArrayList<>();
        argv.add(executable.toString());
        argv.add("-l");
        if (input.getFileName().toString().endsWith(".lst")) {
            argv.add("-xlst");
        }
        argv.add("-d" + outputDir);
        argv.add(input.toString());
        return argv;
    }

    /** Where {@code bbjlst} writes the listing for {@code input}: the input's own file name. */
    public static @NotNull Path listingFor(@NotNull Path outputDir, @NotNull Path input) {
        return outputDir.resolve(input.getFileName());
    }

    /**
     * The name of the read-only copy: the input's name without its last extension plus
     * {@code .bbj}, or {@code program.bbj} when nothing is left.
     */
    public static @NotNull String readOnlyName(@NotNull String fileName) {
        int dot = fileName.lastIndexOf('.');
        String base = dot < 0 ? fileName : fileName.substring(0, dot);
        return (base.isEmpty() ? "program" : base) + ".bbj";
    }

    /**
     * Decompiles {@code input} into a fresh private directory and returns that directory; the
     * listing is {@link #listingFor}. On any failure the directory is removed again before the
     * exception leaves, so a failed run never leaves anything behind.
     */
    public static @NotNull Path decompileToPrivateDir(
            @NotNull Path executable, @NotNull Path input, @NotNull Runner runner,
            long timeoutMillis, @Nullable Path tempParent) throws DecompileException, InterruptedException {
        Path dir;
        try {
            dir = tempParent == null
                    ? Files.createTempDirectory(PRIVATE_DIR_PREFIX)
                    : Files.createTempDirectory(tempParent, PRIVATE_DIR_PREFIX);
        } catch (IOException e) {
            throw new DecompileException("Could not create a private directory for the listing: "
                    + TokenizedBbj.describe(e));
        }

        boolean succeeded = false;
        try {
            Output output;
            try {
                output = runner.run(argv(executable, dir, input), timeoutMillis);
            } catch (IOException e) {
                throw new DecompileException("Could not run bbjlst: " + TokenizedBbj.describe(e));
            }
            if (output.timedOut()) {
                throw new DecompileException(
                        "bbjlst did not finish within " + Math.max(1, timeoutMillis / 1000) + " seconds.");
            }

            Path listing = listingFor(dir, input);
            waitForListing(listing);
            String problem = judgeListing(listing, input.getFileName().toString());
            if (problem != null) {
                throw new DecompileException(problem + quotedOutput(output));
            }
            succeeded = true;
            return dir;
        } finally {
            if (!succeeded) {
                deleteRecursively(dir);
            }
        }
    }

    /**
     * Replaces {@code target} with {@code listing} atomically: the listing is copied to a staged
     * file in the target's own directory, takes over the target's permissions and is moved over
     * it. The staged file is removed again when anything fails.
     */
    public static void replaceInPlace(@NotNull Path target, @NotNull Path listing) throws IOException {
        Path directory = target.toAbsolutePath().getParent();
        Path staged = Files.createTempFile(directory, "." + target.getFileName() + ".", ".decompiled");
        try {
            Files.copy(listing, staged, StandardCopyOption.REPLACE_EXISTING);
            copyPermissions(target, staged);
            // No fallback to a plain move: the original is either left whole or replaced whole.
            Files.move(staged, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException | RuntimeException e) {
            try {
                Files.deleteIfExists(staged);
            } catch (IOException suppressed) {
                e.addSuppressed(suppressed);
            }
            throw e;
        }
    }

    /** Best-effort removal of {@code dir} and everything below it; a missing directory is fine. */
    public static void deleteRecursively(@Nullable Path dir) {
        if (dir == null || !Files.exists(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    // best effort: a leftover temp entry must not mask the real outcome
                }
            });
        } catch (IOException e) {
            // best effort
        }
    }

    private static void copyPermissions(Path from, Path to) throws IOException {
        Set<PosixFilePermission> permissions;
        try {
            permissions = Files.getPosixFilePermissions(from);
        } catch (UnsupportedOperationException e) {
            return;
        }
        Files.setPosixFilePermissions(to, permissions);
    }

    /** Waits until the listing exists and has stopped growing, or gives up after the grace period. */
    private static void waitForListing(Path listing) throws InterruptedException {
        long started = System.nanoTime();
        long lastSize = -1;
        while (true) {
            long elapsedMillis = (System.nanoTime() - started) / 1_000_000;
            if (!Files.isRegularFile(listing)) {
                if (elapsedMillis >= APPEAR_GRACE_MILLIS) {
                    return;
                }
            } else {
                long size = sizeOf(listing);
                if (size == lastSize || elapsedMillis >= SETTLE_LIMIT_MILLIS) {
                    return;
                }
                lastSize = size;
            }
            Thread.sleep(POLL_MILLIS);
        }
    }

    private static long sizeOf(Path path) {
        try {
            return Files.size(path);
        } catch (IOException e) {
            return -1;
        }
    }

    /** The reason the listing is not usable source, or {@code null} when it is. */
    private static @Nullable String judgeListing(Path listing, String name) {
        if (!Files.isRegularFile(listing)) {
            return "bbjlst wrote no decompiled listing for \"" + name + "\".";
        }
        if (sizeOf(listing) == 0) {
            return "bbjlst wrote an empty listing for \"" + name + "\".";
        }
        byte[] head;
        try (InputStream in = Files.newInputStream(listing)) {
            head = in.readNBytes(TokenizedBbj.MAGIC.length);
        } catch (IOException e) {
            return "Could not read the listing bbjlst wrote for \"" + name + "\": " + TokenizedBbj.describe(e);
        }
        if (TokenizedBbj.isTokenizedHeader(head)) {
            return "bbjlst did not decompile \"" + name + "\"; the listing is still a tokenized program.";
        }
        return null;
    }

    /** bbjlst's own words, trimmed and bounded, as a suffix for a failure message. */
    private static String quotedOutput(Output output) {
        List<String> parts = new ArrayList<>();
        for (String text : new String[] {output.stdout(), output.stderr()}) {
            String trimmed = text.trim();
            if (!trimmed.isEmpty()) {
                parts.add(trimmed);
            }
        }
        if (parts.isEmpty()) {
            return "";
        }
        String joined = String.join("; ", parts).replaceAll("\\s*[\\r\\n]+\\s*", " / ");
        if (joined.length() > OUTPUT_QUOTE_LIMIT) {
            joined = joined.substring(0, OUTPUT_QUOTE_LIMIT) + "…";
        }
        return " bbjlst said: " + joined;
    }
}
