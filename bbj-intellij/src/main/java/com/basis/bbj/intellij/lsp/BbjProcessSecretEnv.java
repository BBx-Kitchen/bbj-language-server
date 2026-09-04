package com.basis.bbj.intellij.lsp;

import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserPrincipal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    /**
     * Builds the invocation for {@code em-login.bbj}: the username travels on
     * {@link #USERNAME_VAR} and the password on {@link #PASSWORD_VAR} in the returned
     * environment map; the returned parameter list carries only the quiet flag, the
     * script path, the {@code -} separator, the output file and the info string —
     * never the username or the password. Both keys are always written, even when a
     * value is empty, so an inherited parent-environment variable of the same name can
     * never be read in place of the intended value.
     */
    public static Invocation emLogin(
            String scriptPath, String username, String password, String outputFile, String infoString) {
        return new Invocation(
                List.of("-q", scriptPath, "-", outputFile, infoString),
                Map.of(USERNAME_VAR, username, PASSWORD_VAR, password)
        );
    }

    /**
     * Builds the invocation for {@code web.bbj}: the username, password and token
     * travel on {@link #USERNAME_VAR}, {@link #PASSWORD_VAR} and {@link #TOKEN_VAR} in
     * the returned environment map; the returned parameter list never carries any of
     * the three. All three keys are always written, even when a value is empty, so an
     * inherited parent-environment variable of the same name can never be read in
     * place of the intended value. The config path is appended as a positional
     * argument only when it is non-empty, matching {@code web.bbj}'s tolerance of an
     * absent final position.
     */
    public static Invocation webRun(
            String webRunnerDir, String webBbjPath, String client, String name, String programme,
            String workingDir, String classpath, String token, String configPath) {
        List<String> parameters = new ArrayList<>(List.of(
                "-q", "-WD" + webRunnerDir, webBbjPath, "-",
                client, name, programme, workingDir, classpath
        ));
        if (!configPath.isEmpty()) {
            parameters.add(configPath);
        }
        return new Invocation(parameters, Map.of(
                USERNAME_VAR, "", PASSWORD_VAR, "", TOKEN_VAR, token
        ));
    }

    /**
     * Creates a new empty temporary file, named {@code prefix<random>suffix} in the
     * platform default temporary-file directory, that is owner-only for its whole
     * life: no group or other principal can read or write it at any point between
     * creation and deletion. Three outcomes: on a filesystem whose default provider
     * reports POSIX attribute-view support, the file is created with exactly the
     * owner-read and owner-write permission bits set at creation time — there is no
     * window in which the file exists with a broader mode. On a filesystem reporting
     * ACL attribute-view support instead (for example, Windows), the file is created
     * with an explicit single-{@code ALLOW}-entry {@code acl:acl} attribute for the
     * current user, supplied at creation for the same no-window guarantee as the POSIX
     * branch; if the current user cannot be resolved by name, the file is created in
     * the per-user temporary directory and the ACL is applied immediately afterward,
     * with the file deleted if that restriction fails. When the default filesystem
     * supports neither attribute view, this fails closed with an {@link IOException}
     * rather than creating a file with default permissions.
     */
    public static Path createOwnerOnlyFile(String prefix, String suffix) throws IOException {
        String strategy = selectOwnerOnlyStrategy(FileSystems.getDefault().supportedFileAttributeViews());

        if (strategy.equals("posix")) {
            FileAttribute<Set<PosixFilePermission>> ownerOnly = PosixFilePermissions.asFileAttribute(
                    Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
            return Files.createTempFile(prefix, suffix, ownerOnly);
        }

        // acl: the only other outcome selectOwnerOnlyStrategy can return.
        UserPrincipal owner = resolveCurrentUserPrincipal();
        if (owner != null) {
            // Primary path: the attribute is supplied at creation, exactly as on
            // POSIX, so the file never exists with a broader DACL.
            return Files.createTempFile(prefix, suffix, OwnerOnlyAcl.asFileAttribute(owner));
        }
        // Second-best path: the lookup service could not resolve a principal by
        // name (domain accounts can fail this lookup). Create in the per-user
        // temp directory, then restrict immediately — unlike the primary path
        // above, there is a small window here between creation and restriction.
        // A file that was created but could not be restricted must not survive.
        Path created = Files.createTempFile(
                Path.of(System.getProperty("java.io.tmpdir")), prefix, suffix);
        try {
            Files.getFileAttributeView(created, AclFileAttributeView.class)
                    .setAcl(OwnerOnlyAcl.ownerOnlyAcl(Files.getOwner(created)));
        } catch (IOException e) {
            Files.deleteIfExists(created);
            throw e;
        }
        return created;
    }

    /**
     * Selects which owner-only strategy {@link #createOwnerOnlyFile} should use, given
     * the default filesystem's reported {@code supportedFileAttributeViews()}: {@code
     * posix} when the set contains {@code posix} (a dual-view filesystem keeps the
     * already-proven POSIX branch), otherwise {@code acl} when it contains {@code acl}.
     * There is no third outcome — when the set contains neither, this throws an {@link
     * IOException} naming the temporary directory and both missing capabilities rather
     * than letting the caller fall through to a default-permission file. Package-private
     * so tests in this package can exercise the failure branch with a synthetic view set;
     * on every real filesystem this process runs on, the set always reports at least one
     * of {@code posix} or {@code acl}, so that branch is otherwise unreachable by any
     * behavioural test.
     */
    static String selectOwnerOnlyStrategy(Set<String> supportedFileAttributeViews) throws IOException {
        if (supportedFileAttributeViews.contains("posix")) {
            return "posix";
        }
        if (supportedFileAttributeViews.contains("acl")) {
            return "acl";
        }
        throw new IOException(
                "Cannot create an owner-only temporary file in " + System.getProperty("java.io.tmpdir")
                        + ": the default filesystem supports neither the posix nor the acl file-attribute view");
    }

    /**
     * Resolves the current user as a {@link UserPrincipal} by name, treating any
     * failure — including a domain account the lookup service cannot resolve — as an
     * unresolved principal rather than propagating the exception.
     */
    private static UserPrincipal resolveCurrentUserPrincipal() {
        try {
            return FileSystems.getDefault().getUserPrincipalLookupService()
                    .lookupPrincipalByName(System.getProperty("user.name"));
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }
}
