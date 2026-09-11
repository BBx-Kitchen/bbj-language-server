package com.basis.bbj.intellij.actions;

import java.util.Set;

/**
 * Plain-Java decision seam behind {@link BbjComposeSetoptsInCodeAction}'s editor-popup-menu
 * availability (#475). Holds no IntelliJ platform import, so plain JUnit can
 * exercise the decision directly -- a mechanical extraction of "is this a BBj source file, and
 * not the resolved config file" into a single pure function.
 *
 * The entry belongs on a BBj source file -- the same four extensions {@code plugin.xml} registers
 * for {@code com.basis.bbj.intellij.BbjFileType} (bbj/bbjt/src/bbx) -- and does NOT belong on the
 * resolved config file, which already has its own SETOPTS composer entry ({@code
 * bbj.composeSetopts}) targeting a different request family ({@code decodeCall}/{@code
 * composeCall}, not {@code decodeInCode}/{@code composeTriState}) -- offering both on one file
 * would be the quickest way to make a user edit the wrong syntax into the wrong file. The entry
 * is absent there, not greyed out.
 */
public final class SetoptsInCodeActionAvailability {

    private static final Set<String> BBJ_SOURCE_EXTENSIONS = Set.of("bbj", "bbjt", "src", "bbx");

    private SetoptsInCodeActionAvailability() {
    }

    /**
     * @param extension    the file's extension exactly as {@code VirtualFile.getExtension()}
     *                     returns it, or {@code null} for an extensionless or absent file
     * @param isConfigFile whether this file is the resolved BBj config file (per {@code
     *                     BbjConfigPathService.isConfigFile})
     * @return whether the SETOPTS-in-code composer entry belongs in this file's editor popup menu
     */
    public static boolean isAvailable(String extension, boolean isConfigFile) {
        return !isConfigFile && extension != null && BBJ_SOURCE_EXTENSIONS.contains(extension);
    }
}
