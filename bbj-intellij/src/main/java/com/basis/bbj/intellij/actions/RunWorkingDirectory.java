package com.basis.bbj.intellij.actions;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.nio.file.InvalidPathException;
import java.nio.file.Path;

/**
 * The working directory the run actions start BBj with. BBj resolves a relative program path
 * ({@code use ::path::}, RUN/CALL) against the working directory first and then PREFIX, and the
 * language server applies the same rule, so the working directory is the project base directory
 * rather than the program's own folder. A file outside the project runs from its own directory.
 *
 * <p>No {@code com.intellij} import, so this class is testable in plain JUnit exactly like
 * {@link com.basis.bbj.intellij.config.ConfigPaths}.
 */
public final class RunWorkingDirectory {

    private RunWorkingDirectory() {}

    /**
     * @param projectBasePath the project base directory, or null when the project has none
     * @param filePath the absolute path of the program being run
     * @param fileParentPath the program's own directory, or null when it has none
     * @return {@code projectBasePath} when the file lies inside it (compared on path segments, so
     *     {@code /proj2} is not inside {@code /proj}); otherwise {@code fileParentPath}
     */
    @Nullable
    public static String forFile(@Nullable String projectBasePath, @NotNull String filePath, @Nullable String fileParentPath) {
        if (projectBasePath == null || projectBasePath.isBlank()) {
            return fileParentPath;
        }
        try {
            Path base = Path.of(projectBasePath).toAbsolutePath().normalize();
            Path file = Path.of(filePath).toAbsolutePath().normalize();
            return file.startsWith(base) ? projectBasePath : fileParentPath;
        } catch (InvalidPathException e) {
            return fileParentPath;
        }
    }
}
