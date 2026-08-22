package com.basis.bbj.intellij.lsp;

import java.util.List;
import java.util.Map;

/**
 * Builds the parameter list and environment map for BBj processes that carry Enterprise
 * Manager credentials and tokens. Passing a secret through this class's factory methods
 * never places it in the returned parameter list; it is carried instead in the returned
 * environment map, so it does not appear in the child process's argument vector — apply
 * the environment via {@code GeneralCommandLine.withEnvironment(...)}, which merges these
 * entries over the inherited parent environment.
 */
public final class BbjProcessSecretEnv {

    private BbjProcessSecretEnv() {
    }

    public static final String USERNAME_VAR = "BBJ_EM_USERNAME";
    public static final String PASSWORD_VAR = "BBJ_EM_PASSWORD";
    public static final String TOKEN_VAR = "BBJ_EM_TOKEN";

    /**
     * An invocation: the parameter list to pass to the process, and the environment map
     * to apply alongside it. Both collections are stored as unmodifiable copies, so a
     * caller cannot mutate either after construction. Secrets carried in
     * {@code environment} never appear in {@code parameters}.
     */
    public record Invocation(List<String> parameters, Map<String, String> environment) {
        public Invocation {
            parameters = List.copyOf(parameters);
            environment = Map.copyOf(environment);
        }
    }

    /**
     * Builds the invocation for {@code em-validate-token.bbj}: the token travels on
     * {@link #TOKEN_VAR} in the returned environment map; the returned parameter list
     * carries only the quiet flag, the script path, the {@code -} separator and the
     * output file — never the token. {@code TOKEN_VAR} is always written, even when
     * {@code token} is empty, so an inherited parent-environment variable of the same
     * name can never be read in place of the intended value.
     */
    public static Invocation emValidateToken(String scriptPath, String token, String outputFile) {
        return new Invocation(
                List.of("-q", scriptPath, "-", outputFile),
                Map.of(TOKEN_VAR, token)
        );
    }
}
