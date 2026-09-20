package com.basis.bbj.intellij.lsp;

/**
 * Verifies a downloaded Node.js distribution archive against a source-pinned SHA-256 digest
 * for its exact file name, before that archive is trusted enough to extract.
 */
public final class NodeArchiveVerifier {

    private NodeArchiveVerifier() {
    }

    /**
     * Why a verification attempt refused an archive.
     */
    public enum Reason {
        UNKNOWN_DISTRIBUTION,
        DIGEST_MISMATCH
    }

    /**
     * The trust anchor: maps an archive file name to its expected SHA-256 digest, or
     * {@code null} if the name is not recognised. Injectable so a test can supply a fixed
     * table without touching the production pins.
     */
    public interface DigestSource {
        String expectedSha256(String archiveFileName);
    }

    /**
     * A reader over an archive's bytes, injectable so a test can assert the reader was never
     * consulted when a name has no pinned entry.
     */
    public interface ByteSource {
        java.io.InputStream open(java.nio.file.Path file) throws java.io.IOException;
    }

    /**
     * The production {@link ByteSource}, backed by {@code java.nio.file.Files}.
     */
    public static final ByteSource REAL_FILES = new ByteSource() {
        @Override
        public java.io.InputStream open(java.nio.file.Path file) throws java.io.IOException {
            return java.nio.file.Files.newInputStream(file);
        }
    };

    /**
     * The pinned trust anchor for Node.js {@code v22.23.2}, transcribed from
     * {@code https://nodejs.org/dist/v22.23.2/SHASUMS256.txt} on 2026-09-20. These values ship
     * inside the signed plugin artifact rather than arriving over the same channel as the
     * archive they verify, so a later reader can re-derive them from the URL above rather than
     * trust them blindly.
     */
    private static final java.util.Map<String, String> PINNED_TABLE = java.util.Map.of(
            "node-v22.23.2-darwin-arm64.tar.gz", "61130f394c1630d211dd50aecc4353d379480f36d3ac913cd85dbba1aed585c6",
            "node-v22.23.2-darwin-x64.tar.gz", "58e99022c2ff89395576cc7fd4d98cea24bb68081475d5f88b801ee8729fb026",
            "node-v22.23.2-linux-arm64.tar.gz", "013b59cfd2819703a6f4a14ab891fc46fc2a4e3f5bcd92de3fb4929b43e35b30",
            "node-v22.23.2-linux-x64.tar.gz", "b294a556e639d64338823920e5866c21c02741742d2e1529ee1a225c1ec9252a",
            "node-v22.23.2-win-arm64.zip", "fec025a6da31757e3b6af84c5a1628e9d38442ca99a2161091d78f2fcfa35ef3",
            "node-v22.23.2-win-x64.zip", "1177b4137ba5adaa56354ae40f1080c7450e8ae09cecb47da459d1c52ac99f97"
    );

    /**
     * The production {@link DigestSource}, backed by {@link #PINNED_TABLE}.
     */
    public static final DigestSource PINNED_DIGESTS = new DigestSource() {
        @Override
        public String expectedSha256(String archiveFileName) {
            return PINNED_TABLE.get(archiveFileName);
        }
    };

    /**
     * The archive file names this class carries a pinned digest for. Used to couple the
     * declared Node.js version to the pinned table, so a version bump without new pins fails
     * the build rather than skipping the check.
     */
    public static java.util.Set<String> pinnedArchiveNames() {
        return PINNED_TABLE.keySet();
    }

    /**
     * The outcome of a verification attempt: either the archive's digest matched its pinned
     * entry, or it did not — and if it did not, why. Guarded accessors throw
     * {@link IllegalStateException} when read on the branch where they are meaningless, so a
     * caller cannot accidentally read a digest off a refused result by accident.
     */
    public static final class Result {

        private final boolean verified;
        private final String archiveFileName;
        private final Reason reason;
        private final String expectedDigest;
        private final String actualDigest;

        private Result(boolean verified, String archiveFileName, Reason reason,
                        String expectedDigest, String actualDigest) {
            this.verified = verified;
            this.archiveFileName = archiveFileName;
            this.reason = reason;
            this.expectedDigest = expectedDigest;
            this.actualDigest = actualDigest;
        }

        static Result verified(String archiveFileName, String digest) {
            return new Result(true, archiveFileName, null, digest, digest);
        }

        static Result refused(String archiveFileName, Reason reason, String expected, String actual) {
            return new Result(false, archiveFileName, reason, expected, actual);
        }

        public boolean isVerified() {
            return verified;
        }

        public Reason reason() {
            if (verified) {
                throw new IllegalStateException("reason() is only meaningful when refused");
            }
            return reason;
        }

        public String expectedDigest() {
            if (verified) {
                throw new IllegalStateException("expectedDigest() is only meaningful when refused");
            }
            return expectedDigest;
        }

        public String actualDigest() {
            return actualDigest;
        }

        public String failureMessage() {
            if (verified) {
                throw new IllegalStateException("failureMessage() is only meaningful when refused");
            }
            return "Archive \"" + archiveFileName + "\" failed verification: expected digest \""
                    + expectedDigest + "\", computed \"" + actualDigest + "\".";
        }
    }

    /**
     * Computes the SHA-256 digest of {@code file}, read through {@code bytes}, rendered as
     * lower-case hexadecimal. {@code NoSuchAlgorithmException} cannot occur for SHA-256 on any
     * conformant JDK; it is wrapped in {@link IllegalStateException} rather than widening this
     * method's signature.
     */
    public static String sha256Hex(java.nio.file.Path file, ByteSource bytes) throws java.io.IOException {
        java.security.MessageDigest digest;
        try {
            digest = java.security.MessageDigest.getInstance("SHA-256");
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required to be available on every conformant JDK", e);
        }
        try (java.io.InputStream in = bytes.open(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return java.util.HexFormat.of().formatHex(digest.digest());
    }

    /**
     * Verifies {@code archive} against the pinned digest for {@code archiveFileName}. The pin
     * is looked up first; a name with no pinned entry is refused with
     * {@link Reason#UNKNOWN_DISTRIBUTION} immediately, without opening the file at all, so an
     * unrecognised version, platform or architecture refuses rather than skipping the check.
     * Only then is the archive's digest computed and compared, insensitive to hex letter case
     * and to surrounding whitespace in the pinned value, using constant-shape comparison rather
     * than {@code String.equals}.
     */
    public static Result verify(String archiveFileName, java.nio.file.Path archive,
                                 DigestSource digests, ByteSource bytes) throws java.io.IOException {
        String pinned = digests.expectedSha256(archiveFileName);
        if (pinned == null) {
            return Result.refused(archiveFileName, Reason.UNKNOWN_DISTRIBUTION, null, null);
        }
        String normalizedExpected = pinned.trim().toLowerCase(java.util.Locale.ROOT);
        String actual = sha256Hex(archive, bytes);
        String normalizedActual = actual.trim().toLowerCase(java.util.Locale.ROOT);

        boolean matches = java.security.MessageDigest.isEqual(
                normalizedExpected.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                normalizedActual.getBytes(java.nio.charset.StandardCharsets.US_ASCII));

        if (!matches) {
            return Result.refused(archiveFileName, Reason.DIGEST_MISMATCH, normalizedExpected, normalizedActual);
        }
        return Result.verified(archiveFileName, normalizedActual);
    }
}
