package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.lsp.BbjProcessSecretEnv;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.CapturingProcessHandler;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Validates an EM JWT token against the BBj interpreter, living beside {@link BbjEMTokenStore}
 * and {@link TokenValidationCache} rather than on the run-action base -- keeping the whole
 * token-validation lifecycle in one neighbourhood instead of splitting it across a run-action
 * class and a credential-lifecycle class (#617). Follows the
 * {@link com.basis.bbj.intellij.BbjInteropPortCache} seam convention: a {@code public final}
 * class, a nested {@link FunctionalInterface} collaborator standing in for the subprocess spawn,
 * a {@code public static final SESSION} wired to the real collaborator, and a package-private
 * constructor for fake injection from tests.
 *
 * <p>Reads no settings and performs no plugin lookup of its own: the BBj executable path and the
 * validation script path both arrive as parameters from the caller, which is what lets this
 * class run on the plain JUnit 5 classpath with a fake runner. The server-side check runs first,
 * and the trusted read-through wraps it with the shared trust-window cache.
 */
public final class EmTokenValidator {

    /**
     * Spawns the BBj interpreter against the validation script and returns the trimmed text it
     * wrote to its output file. Declared to allow a checked exception so the real implementation
     * can propagate an {@link java.io.IOException} or process-execution failure up to the
     * caller's catch-all.
     */
    @FunctionalInterface
    interface ValidationRunner {
        String run(String bbjPath, String scriptPath, String token) throws Exception;
    }

    /** The single production instance, resolving over the real subprocess collaborator. */
    public static final EmTokenValidator SESSION = new EmTokenValidator(EmTokenValidator::runValidationScript);

    private final ValidationRunner runner;

    /** Package-private so tests can inject a counting fake runner. */
    EmTokenValidator(ValidationRunner runner) {
        this.runner = runner;
    }

    /**
     * Validate a token server-side against EM by running em-validate-token.bbj.
     * Returns true if token is valid, false otherwise.
     *
     * @param bbjPath the BBj executable path, or null if it could not be resolved
     * @param scriptPath the em-validate-token.bbj script path, or null if it could not be resolved
     * @param token the JWT token to validate
     * @return true if valid, false otherwise
     */
    public boolean validateTokenServerSide(@Nullable String bbjPath, @Nullable String scriptPath, @NotNull String token) {
        if (bbjPath == null || scriptPath == null) {
            return false;
        }
        try {
            String result = runner.run(bbjPath, scriptPath, token);
            return "VALID".equals(result);
        } catch (Exception e) {
            // On any error, consider token invalid
            return false;
        }
    }

    /**
     * Validate a token against EM, consulting the trust-window cache first (#542). Within
     * {@link TokenValidationCache#TRUST_WINDOW_MS} of a prior successful validation for the
     * same token, this returns true without spawning the server-side subprocess at all;
     * otherwise it delegates to {@link #validateTokenServerSide} and records success into the
     * cache. Callers must still run the client-side expiry check first -- this method makes no
     * expiry decision of its own.
     *
     * @param bbjPath the BBj executable path, or null if it could not be resolved
     * @param scriptPath the em-validate-token.bbj script path, or null if it could not be resolved
     * @param token the JWT token to validate
     * @return true if trusted or freshly validated, false otherwise
     */
    public boolean validateTokenTrusted(@Nullable String bbjPath, @Nullable String scriptPath, @NotNull String token) {
        return TokenValidationCache.SESSION.validateThrough(token, () -> validateTokenServerSide(bbjPath, scriptPath, token));
    }

    private static String runValidationScript(String bbjPath, String scriptPath, String token) throws Exception {
        // Create temp file for BBj output, owner-only for its whole life
        Path tmpFile = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-validate-", ".tmp");
        try {
            // Build command: bbj -q em-validate-token.bbj - <tmpFile>; the token
            // travels on the environment (BbjProcessSecretEnv), never as a parameter.
            BbjProcessSecretEnv.Invocation invocation =
                    BbjProcessSecretEnv.emValidateToken(scriptPath, token, tmpFile.toString());
            GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
            cmd.addParameters(invocation.parameters());
            cmd.withEnvironment(invocation.environment());

            // Execute with 10s timeout
            CapturingProcessHandler handler = new CapturingProcessHandler(cmd);
            handler.runProcess(10000);

            // Read result from temp file
            return Files.readString(tmpFile).trim();
        } finally {
            try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
        }
    }
}
