package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link BbjSettingsLookups#lookupConfig} and the pure helpers it is
 * built from: an empty field is a legitimate default (no warning), a relative path never reaches
 * the file-exists collaborator, tilde expansion runs before the absolute-path decision, and a
 * throwing collaborator yields a failed result rather than propagating. The win32 absolute-path
 * rule is asserted directly against {@link BbjSettingsLookups#isAbsolutePath} with an injected OS
 * name, since this CI runs Linux-only (a backstop verification).
 */
class BbjSettingsLookupsConfigPathTest {

    @Test
    void anEmptyPathIsNotAbsoluteNorExistingAndIsNotAFailure() {
        BbjSettingsLookups.ConfigLookup result = BbjSettingsLookups.lookupConfig("", p -> {
            throw new AssertionError("an empty path must consult no collaborator");
        });

        assertFalse(result.absolute());
        assertFalse(result.exists());
        assertFalse(result.failed());
    }

    @Test
    void aRelativePathIsNotAbsoluteAndConsultsNoFileCollaborator() {
        BbjSettingsLookups.ConfigLookup result = BbjSettingsLookups.lookupConfig("relative/config.bbx", p -> {
            throw new AssertionError("a relative path must consult no file-exists collaborator");
        });

        assertFalse(result.absolute());
        assertFalse(result.exists());
        assertFalse(result.failed());
    }

    @Test
    void anAbsolutePathThatDoesNotExistIsAbsoluteButNotExisting() {
        BbjSettingsLookups.ConfigLookup result = BbjSettingsLookups.lookupConfig("/tmp/does-not-exist-config.bbx", p -> false);

        assertTrue(result.absolute());
        assertFalse(result.exists());
        assertFalse(result.failed());
    }

    @Test
    void anAbsolutePathToAnExistingFileIsAbsoluteAndExisting() {
        BbjSettingsLookups.ConfigLookup result = BbjSettingsLookups.lookupConfig("/tmp/config.bbx", p -> true);

        assertTrue(result.absolute());
        assertTrue(result.exists());
        assertFalse(result.failed());
    }

    @Test
    void aThrowingFileCollaboratorYieldsAFailedResultRatherThanPropagating() {
        BbjSettingsLookups.ConfigLookup result = BbjSettingsLookups.lookupConfig("/tmp/config.bbx", p -> {
            throw new IllegalStateException("boom: collaborator blew up");
        });

        assertTrue(result.failed());
        assertFalse(result.absolute());
        assertFalse(result.exists());
    }

    @Test
    void aLeadingTildeExpandsAgainstTheRealHomeDirectoryBeforeTheAbsoluteDecision() {
        String home = System.getProperty("user.home");
        BbjSettingsLookups.ConfigLookup result = BbjSettingsLookups.lookupConfig("~/config.bbx", p -> {
            assertEquals(home + "/config.bbx", p, "the file-exists probe must see the expanded path");
            return false;
        });

        assertTrue(result.absolute(), "the real user.home is itself absolute, so the expanded path is too");
        assertFalse(result.exists());
    }

    // ---- expandHome ----

    @Test
    void expandHomeReplacesABareTildeWithTheWholeHomeDirectory() {
        assertEquals("/home/user", BbjSettingsLookups.expandHome("~", "/home/user"));
    }

    @Test
    void expandHomeReplacesOnlyTheLeadingTildeSegment() {
        assertEquals("/home/user/cfg/config.bbx", BbjSettingsLookups.expandHome("~/cfg/config.bbx", "/home/user"));
    }

    @Test
    void expandHomeLeavesATildeThatIsNotTheFirstCharacterUntouched() {
        assertEquals("/opt/~backup/config.bbx", BbjSettingsLookups.expandHome("/opt/~backup/config.bbx", "/home/user"));
    }

    // ---- isAbsolutePath (win32 backstop verification; this CI runs Linux-only) ----

    @Test
    void aDriveLetterPathIsAbsoluteOnWindows() {
        assertTrue(BbjSettingsLookups.isAbsolutePath("C:\\cfg\\config.bbx", "Windows 10"));
        assertTrue(BbjSettingsLookups.isAbsolutePath("C:/cfg/config.bbx", "Windows 10"));
    }

    @Test
    void aBareRelativePathIsRejectedOnWindows() {
        assertFalse(BbjSettingsLookups.isAbsolutePath("cfg\\config.bbx", "Windows 10"));
    }

    @Test
    void aPosixAbsolutePathIsAbsoluteEverywhereAndARelativeOneNeverIs() {
        assertTrue(BbjSettingsLookups.isAbsolutePath("/etc/bbj/config.bbx", "Linux"));
        assertFalse(BbjSettingsLookups.isAbsolutePath("cfg/config.bbx", "Linux"));
    }
}
