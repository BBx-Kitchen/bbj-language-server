package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Behavioural coverage for {@link RunWorkingDirectory#forFile}, the single working-directory
 * choice shared by the GUI, BUI and DWC run actions.
 */
class RunWorkingDirectoryTest {

    @Test
    void aFileDirectlyInTheProjectRunsFromTheProjectBase() {
        assertEquals("/proj", RunWorkingDirectory.forFile("/proj", "/proj/a.bbj", "/proj"));
    }

    @Test
    void aFileInASubfolderStillRunsFromTheProjectBase() {
        assertEquals("/proj", RunWorkingDirectory.forFile("/proj", "/proj/sub/a.bbj", "/proj/sub"));
    }

    @Test
    void aFileOutsideTheProjectRunsFromItsOwnDirectory() {
        assertEquals("/other", RunWorkingDirectory.forFile("/proj", "/other/a.bbj", "/other"));
    }

    @Test
    void aSiblingDirectorySharingTheProjectNamePrefixIsOutside() {
        assertEquals("/proj2", RunWorkingDirectory.forFile("/proj", "/proj2/a.bbj", "/proj2"));
    }

    @Test
    void noProjectBaseFallsBackToTheFileDirectory() {
        assertEquals("/x", RunWorkingDirectory.forFile(null, "/x/a.bbj", "/x"));
    }

    @Test
    void aBlankProjectBaseFallsBackToTheFileDirectory() {
        assertEquals("/x", RunWorkingDirectory.forFile("  ", "/x/a.bbj", "/x"));
    }

    @Test
    void noProjectBaseAndNoParentYieldsNull() {
        assertNull(RunWorkingDirectory.forFile(null, "/a.bbj", null));
    }
}
