package com.basis.bbj.intellij.lsp;

/**
 * Records the SHA-256 digest of an installed Node.js executable beside it at install time, and
 * re-checks that record on the cache-hit path so a file merely sitting at the resolved cache
 * path is not trusted on the strength of its existence and executable bit alone. An absent,
 * unreadable or disagreeing record degrades to "not cached" rather than to an error or to trust,
 * so installations that predate this change keep working by re-downloading.
 */
public final class NodeInstallIntegrity {

    NodeInstallIntegrity() {
    }

    /**
     * The single production instance, holding the per-session memo. Production code always
     * calls through this instance; tests construct their own so no case can leak memo state
     * into another, and no reset hook exists here for that reason.
     */
    public static final NodeInstallIntegrity SESSION = new NodeInstallIntegrity();

    /**
     * The suffix appended to an executable's file name to name its digest record, always in the
     * same directory as the executable itself.
     */
    public static final String SIDECAR_SUFFIX = ".sha256";

    /**
     * The path of the digest record for {@code executable}: the executable's own file name with
     * {@link #SIDECAR_SUFFIX} appended, resolved as a sibling so it always lives beside the file
     * it describes.
     */
    public static java.nio.file.Path sidecarFor(java.nio.file.Path executable) {
        return executable.resolveSibling(executable.getFileName().toString() + SIDECAR_SUFFIX);
    }

    /**
     * A fingerprint of a file's identity at the moment its digest was last confirmed, cheap to
     * compare against a fresh {@code stat} so repeated calls need not re-read file contents.
     */
    private record Stamp(String path, long size, long lastModifiedMillis) {
    }

    /**
     * The most recent confirmed match, if any. Volatile because {@link #matchesRecordedDigest}
     * is documented as callable from any thread; a stale read costs at most one extra hash, never
     * a wrong answer, since a positive memo is only ever written after a successful comparison.
     */
    private volatile Stamp verified;

    /**
     * Computes the digest of {@code executable}, read through {@code bytes}, and writes it as a
     * single lower-case hexadecimal line to {@link #sidecarFor(java.nio.file.Path)}, overwriting
     * any prior record. Called after the executable has been copied into place and made
     * executable, so the recorded value describes the file in its final installed state. Also
     * primes the memo so the very next cache-hit call for this file does no rehash.
     */
    public void record(java.nio.file.Path executable, NodeArchiveVerifier.ByteSource bytes)
            throws java.io.IOException {
        String digest = NodeArchiveVerifier.sha256Hex(executable, bytes);
        java.nio.file.Path sidecar = sidecarFor(executable);
        java.nio.file.Files.writeString(sidecar, digest + System.lineSeparator());
        java.io.File file = executable.toFile();
        verified = new Stamp(executable.toAbsolutePath().toString(), file.length(), file.lastModified());
    }

    /**
     * Whether {@code executable} still matches the digest recorded for it by
     * {@link #record(java.nio.file.Path, NodeArchiveVerifier.ByteSource)}. Declares no checked
     * exception and never throws: an absent sidecar, an unreadable one, an empty or malformed
     * one, a directory where a file was expected, a missing executable, or any other
     * {@link java.io.IOException} or {@link RuntimeException} encountered while checking all
     * resolve to {@code false}. A {@code false} return means "treat as not cached" — the caller
     * falls back to a fresh download and verification — it never means "trust it anyway" and it
     * never means "fail". After the first successful comparison for a given absolute path, size
     * and last-modified time, repeated calls return {@code true} without touching file contents
     * again, so this method is safe and cheap to call from any thread.
     */
    public boolean matchesRecordedDigest(java.nio.file.Path executable, NodeArchiveVerifier.ByteSource bytes) {
        try {
            java.io.File file = executable.toFile();
            String absolutePath = executable.toAbsolutePath().toString();
            long size = file.length();
            long lastModified = file.lastModified();

            Stamp memo = verified;
            if (memo != null
                    && memo.path().equals(absolutePath)
                    && memo.size() == size
                    && memo.lastModifiedMillis() == lastModified) {
                return true;
            }

            java.nio.file.Path sidecar = sidecarFor(executable);
            String recorded = java.nio.file.Files.readString(sidecar).trim();
            if (!recorded.matches("[0-9a-fA-F]{64}")) {
                return false;
            }
            String normalizedRecorded = recorded.toLowerCase(java.util.Locale.ROOT);

            String actual = NodeArchiveVerifier.sha256Hex(executable, bytes);
            String normalizedActual = actual.toLowerCase(java.util.Locale.ROOT);

            boolean matches = java.security.MessageDigest.isEqual(
                    normalizedRecorded.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                    normalizedActual.getBytes(java.nio.charset.StandardCharsets.US_ASCII));

            if (matches) {
                verified = new Stamp(absolutePath, size, lastModified);
                return true;
            }
            return false;
        } catch (java.io.IOException | RuntimeException e) {
            return false;
        }
    }
}
