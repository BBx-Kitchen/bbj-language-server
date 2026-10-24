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
     * The pinned trust anchor for Node.js {@code v22.23.4}, transcribed from
     * {@code https://nodejs.org/dist/v22.23.4/SHASUMS256.txt} on 2026-10-23. These values ship
     * inside the signed plugin artifact rather than arriving over the same channel as the
     * archive they verify, so a later reader can re-derive them from the URL above rather than
     * trust them blindly.
     */
    private static final java.util.Map<String, String> PINNED_TABLE = java.util.Map.of(
            "node-v22.23.4-darwin-arm64.tar.gz", "c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428",
            "node-v22.23.4-darwin-x64.tar.gz", "efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819",
            "node-v22.23.4-linux-arm64.tar.gz", "f7a1e486dbc8b286847815b477d4fb5e9fb963ed4489c3e1588853d685f589f9",
            "node-v22.23.4-linux-x64.tar.gz", "b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406",
            "node-v22.23.4-win-arm64.zip", "a8b8cd79cbbb3062435f449591d98dd63730bbbf30ce2d7cc3a6376c236cb111",
            "node-v22.23.4-win-x64.zip", "cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20"
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
