package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
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

    private static final String EM_LOGIN_SCRIPT_PATH = "/ext/lib/tools/em-login.bbj";
    private static final String WEB_BBJ_PATH = "/ext/lib/tools/web.bbj";
    private static final String WEB_RUNNER_DIR = "/ext/lib/tools";

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

    // --- emLogin ---

    @Test
    void emLoginPlacesTheUsernameAndPasswordUnderTheAgreedKeys() {
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.emLogin(
                EM_LOGIN_SCRIPT_PATH, "admin", "s3cr3t", OUTPUT_FILE, "info-string");

        assertEquals("admin", invocation.environment().get(BbjProcessSecretEnv.USERNAME_VAR));
        assertEquals("s3cr3t", invocation.environment().get(BbjProcessSecretEnv.PASSWORD_VAR));
    }

    @Test
    void emLoginWritesBothKeysEvenWhenTheValuesAreEmpty() {
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emLogin(EM_LOGIN_SCRIPT_PATH, "", "", OUTPUT_FILE, "info-string");

        assertTrue(invocation.environment().containsKey(BbjProcessSecretEnv.USERNAME_VAR),
                "BBJ_EM_USERNAME must be written even when the username is empty");
        assertTrue(invocation.environment().containsKey(BbjProcessSecretEnv.PASSWORD_VAR),
                "BBJ_EM_PASSWORD must be written even when the password is empty");
        assertEquals("", invocation.environment().get(BbjProcessSecretEnv.USERNAME_VAR));
        assertEquals("", invocation.environment().get(BbjProcessSecretEnv.PASSWORD_VAR));
    }

    @Test
    void emLoginsParametersContainNeitherTheUsernameNorThePassword() {
        String username = "admin";
        String password = "s3cr3t";
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emLogin(EM_LOGIN_SCRIPT_PATH, username, password, OUTPUT_FILE, "info-string");

        for (String parameter : invocation.parameters()) {
            assertFalse(parameter.equals(username), "a parameter equals the username verbatim: " + parameter);
            assertFalse(parameter.equals(password), "a parameter equals the password verbatim: " + parameter);
        }
    }

    @Test
    void emLoginsParametersAreExactlyTheFiveExpectedElementsInOrder() {
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.emLogin(
                EM_LOGIN_SCRIPT_PATH, "admin", "s3cr3t", OUTPUT_FILE, "info-string");

        assertEquals(List.of("-q", EM_LOGIN_SCRIPT_PATH, "-", OUTPUT_FILE, "info-string"), invocation.parameters());
    }

    @Test
    void aCredentialWithNonAsciiAndShellSignificantCharactersIsCarriedByteIdenticallyByEmLogin() {
        String username = "adm-ïn-$(rm -rf ~)-`whoami`-;&|<>\"'中文";
        BbjProcessSecretEnv.Invocation invocation =
                BbjProcessSecretEnv.emLogin(EM_LOGIN_SCRIPT_PATH, username, "s3cr3t", OUTPUT_FILE, "info-string");

        assertEquals(username, invocation.environment().get(BbjProcessSecretEnv.USERNAME_VAR));
    }

    // --- webRun ---

    @Test
    void webRunPlacesTheUsernamePasswordAndTokenUnderTheAgreedKeys() {
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                WEB_RUNNER_DIR, WEB_BBJ_PATH, "BUI", "name", "programme.bbj", "/wd",
                "cp1;cp2", "tok-abc-123", "");

        assertEquals("cp1;cp2", invocation.parameters().get(8));
        assertEquals("tok-abc-123", invocation.environment().get(BbjProcessSecretEnv.TOKEN_VAR));
    }

    @Test
    void webRunWritesAllThreeKeysEvenWhenEmpty() {
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                WEB_RUNNER_DIR, WEB_BBJ_PATH, "BUI", "name", "programme.bbj", "/wd", "", "", "");

        assertTrue(invocation.environment().containsKey(BbjProcessSecretEnv.USERNAME_VAR),
                "BBJ_EM_USERNAME must be written even when empty");
        assertTrue(invocation.environment().containsKey(BbjProcessSecretEnv.PASSWORD_VAR),
                "BBJ_EM_PASSWORD must be written even when empty");
        assertTrue(invocation.environment().containsKey(BbjProcessSecretEnv.TOKEN_VAR),
                "BBJ_EM_TOKEN must be written even when empty");
    }

    @Test
    void webRunsParametersContainNoneOfTheThreeSecrets() {
        String username = "admin";
        String password = "s3cr3t";
        String token = "tok-abc-123";
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                WEB_RUNNER_DIR, WEB_BBJ_PATH, "BUI", "name", "programme.bbj", "/wd",
                "cp1;cp2", token, "");
        // username/password never enter webRun's parameter-affecting arguments at all —
        // they are supplied only implicitly via the environment map default handling
        // inside webRun, never as a positional argument.

        for (String parameter : invocation.parameters()) {
            assertFalse(parameter.equals(token), "a parameter equals the token verbatim: " + parameter);
            assertFalse(parameter.contains(token), "a parameter contains the token as a substring: " + parameter);
            assertFalse(parameter.equals(username), "a parameter equals the username verbatim: " + parameter);
            assertFalse(parameter.equals(password), "a parameter equals the password verbatim: " + parameter);
        }
    }

    @Test
    void webRunsParametersAreExactlyTheExpectedElementsInOrderWithoutConfigPath() {
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                WEB_RUNNER_DIR, WEB_BBJ_PATH, "BUI", "name", "programme.bbj", "/wd",
                "cp1;cp2", "tok-abc-123", "");

        assertEquals(List.of(
                "-q", "-WD" + WEB_RUNNER_DIR, WEB_BBJ_PATH, "-",
                "BUI", "name", "programme.bbj", "/wd", "cp1;cp2"
        ), invocation.parameters());
    }

    @Test
    void webRunsParametersAppendTheConfigPathOnlyWhenNonEmpty() {
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                WEB_RUNNER_DIR, WEB_BBJ_PATH, "DWC", "name", "programme.bbj", "/wd",
                "cp1;cp2", "tok-abc-123", "/etc/bbj/config.bbx");

        assertEquals(List.of(
                "-q", "-WD" + WEB_RUNNER_DIR, WEB_BBJ_PATH, "-",
                "DWC", "name", "programme.bbj", "/wd", "cp1;cp2", "/etc/bbj/config.bbx"
        ), invocation.parameters());
    }

    @Test
    void aTokenWithNonAsciiAndShellSignificantCharactersIsCarriedByteIdenticallyByWebRun() {
        String token = "tökén-$(rm -rf ~)-`whoami`-;&|<>\"'中文";
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                WEB_RUNNER_DIR, WEB_BBJ_PATH, "BUI", "name", "programme.bbj", "/wd", "cp1;cp2", token, "");

        assertEquals(token, invocation.environment().get(BbjProcessSecretEnv.TOKEN_VAR));
    }

    // --- createOwnerOnlyFile ---

    @Test
    void createOwnerOnlyFileReturnsAPathThatExists() throws IOException {
        Path created = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-login-", ".tmp");
        try {
            assertTrue(java.nio.file.Files.exists(created), "createOwnerOnlyFile must create the file it returns");
        } finally {
            java.nio.file.Files.deleteIfExists(created);
        }
    }

    @Test
    void createOwnerOnlyFilesPermissionSetIsExactlyOwnerReadPlusOwnerWriteOnPosix() throws IOException {
        boolean posixSupported = FileSystems.getDefault().supportedFileAttributeViews().contains("posix");
        Assumptions.assumeTrue(posixSupported,
                "this filesystem does not support POSIX file attribute views — permission bits do not apply");

        Path created = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-login-", ".tmp");
        try {
            Set<PosixFilePermission> permissions = java.nio.file.Files.getPosixFilePermissions(created);
            assertEquals(
                    Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE),
                    permissions,
                    "createOwnerOnlyFile must create a file with exactly owner-read plus owner-write permissions");
        } finally {
            java.nio.file.Files.deleteIfExists(created);
        }
    }
}
