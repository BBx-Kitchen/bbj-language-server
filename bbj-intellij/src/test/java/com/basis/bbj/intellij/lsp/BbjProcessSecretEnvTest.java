package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BbjProcessSecretEnvTest {

    private static final String SCRIPT_PATH = "/ext/lib/tools/em-validate-token.bbj";
    private static final String OUTPUT_FILE = "/tmp/bbj-em-validate-123.tmp";

    @Test
    void emValidateTokenPlacesTheTokenInTheEnvironmentUnderTheAgreedKey() {
        String token = "tok-abc-123";
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, token, OUTPUT_FILE);

        assertEquals(token, invocation.environment().get(BbjProcessSecretEnv.TOKEN_VAR));
    }

    @Test
    void emValidateTokensParametersContainNoElementEqualToOrContainingTheToken() {
        String token = "tok-abc-123";
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, token, OUTPUT_FILE);

        for (String parameter : invocation.parameters()) {
            assertFalse(parameter.equals(token), "a parameter equals the token verbatim: " + parameter);
            assertFalse(parameter.contains(token), "a parameter contains the token as a substring: " + parameter);
        }
    }

    @Test
    void emValidateTokenReturnsExactlyTheFourExpectedParametersInOrder() {
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, "tok-abc-123", OUTPUT_FILE);

        assertEquals(List.of("-q", SCRIPT_PATH, "-", OUTPUT_FILE), invocation.parameters());
    }

    @Test
    void emValidateTokenWritesTheTokenKeyEvenWhenTheTokenIsEmpty() {
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, "", OUTPUT_FILE);

        assertTrue(invocation.environment().containsKey(BbjProcessSecretEnv.TOKEN_VAR),
                "BBJ_EM_TOKEN must be written even when the token is empty");
        assertEquals("", invocation.environment().get(BbjProcessSecretEnv.TOKEN_VAR));
    }

    @Test
    void aTokenWithNonAsciiAndShellSignificantCharactersIsCarriedByteIdenticallyInTheEnvironment() {
        String token = "tökén-$(rm -rf ~)-`whoami`-;&|<>\"'中文";
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, token, OUTPUT_FILE);

        assertEquals(token, invocation.environment().get(BbjProcessSecretEnv.TOKEN_VAR));
    }

    @Test
    void invocationParametersAreUnmodifiable() {
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, "tok-abc-123", OUTPUT_FILE);

        assertThrows(UnsupportedOperationException.class, () -> invocation.parameters().add("extra"));
    }

    @Test
    void invocationEnvironmentIsUnmodifiable() {
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, "tok-abc-123", OUTPUT_FILE);

        assertThrows(UnsupportedOperationException.class,
                () -> invocation.environment().put("EXTRA", "value"));
    }

    @Test
    void theThreeKeyConstantsAreThreeDistinctStrings() {
        Set<String> keys = new HashSet<>(Set.of(
                BbjProcessSecretEnv.USERNAME_VAR,
                BbjProcessSecretEnv.PASSWORD_VAR,
                BbjProcessSecretEnv.TOKEN_VAR));
        assertEquals(3, keys.size(), "USERNAME_VAR, PASSWORD_VAR and TOKEN_VAR must be three distinct strings");
    }
}
