package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryFlag;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.UserPrincipal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural assertions on {@link OwnerOnlyAcl}'s built entry list: these run
 * unconditionally on Linux, since they assert on a value object -- not on a
 * filesystem -- and prove the shape #536's Windows ACL branch relies on (one
 * ALLOW entry, the given principal, no inherit flags, the read-write-delete
 * permission floor).
 */
class OwnerOnlyAclTest {

    private static UserPrincipal principal;

    @BeforeAll
    static void resolvePrincipal() throws IOException {
        principal = FileSystems.getDefault().getUserPrincipalLookupService()
                .lookupPrincipalByName(System.getProperty("user.name"));
    }

    @Test
    void theBuiltAclHasExactlyOneEntry() {
        List<AclEntry> acl = OwnerOnlyAcl.ownerOnlyAcl(principal);
        assertEquals(1, acl.size(), "ownerOnlyAcl must return exactly one entry");
    }

    @Test
    void theSingleEntryIsAnAllowEntryForTheGivenPrincipal() {
        AclEntry entry = OwnerOnlyAcl.ownerOnlyAcl(principal).get(0);
        assertEquals(AclEntryType.ALLOW, entry.type(), "the single entry must be ALLOW, not DENY");
        assertSame(principal, entry.principal(), "the entry's principal must be the same object that was passed in");
    }

    @Test
    void theSingleEntryCarriesNoInheritFlags() {
        AclEntry entry = OwnerOnlyAcl.ownerOnlyAcl(principal).get(0);
        assertTrue(entry.flags().isEmpty(), "the entry must carry no flags at all");
        assertFalse(entry.flags().contains(AclEntryFlag.FILE_INHERIT),
                "the entry must not carry FILE_INHERIT -- the file has no children");
        assertFalse(entry.flags().contains(AclEntryFlag.DIRECTORY_INHERIT),
                "the entry must not carry DIRECTORY_INHERIT -- the file has no children");
    }

    @Test
    void theOwnerPermissionsCoverTheReadWriteTruncateAndDeleteFloor() {
        AclEntry entry = OwnerOnlyAcl.ownerOnlyAcl(principal).get(0);
        assertTrue(entry.permissions().containsAll(List.of(
                AclEntryPermission.READ_DATA,
                AclEntryPermission.WRITE_DATA,
                AclEntryPermission.APPEND_DATA,
                AclEntryPermission.READ_ATTRIBUTES,
                AclEntryPermission.WRITE_ATTRIBUTES,
                AclEntryPermission.DELETE,
                AclEntryPermission.SYNCHRONIZE,
                AclEntryPermission.READ_ACL,
                AclEntryPermission.READ_NAMED_ATTRS,
                AclEntryPermission.WRITE_NAMED_ATTRS
        )), "the read-write-delete permission floor must be present so em-login.bbj can truncate-and-write "
                + "and the caller's finally block can delete, and the floor must also cover the "
                + "extended-attribute bits an open request carries: " + entry.permissions());
    }

    @Test
    void theOwnerPermissionsCoverTheExtendedAttributeBitsFoldedIntoGenericReadAndGenericWrite() {
        AclEntry entry = OwnerOnlyAcl.ownerOnlyAcl(principal).get(0);
        assertAll("extended-attribute bits Windows folds into GENERIC_READ/GENERIC_WRITE (#536)",
                () -> assertTrue(entry.permissions().contains(AclEntryPermission.READ_NAMED_ATTRS),
                        "Windows folds READ_NAMED_ATTRS into GENERIC_READ, and an access check denies the "
                                + "whole open when any requested bit is ungranted -- omitting it is what made "
                                + "BBj report \"User not allowed\" against a file the plugin had just created"),
                () -> assertTrue(entry.permissions().contains(AclEntryPermission.WRITE_NAMED_ATTRS),
                        "Windows folds WRITE_NAMED_ATTRS into GENERIC_WRITE, and an access check denies the "
                                + "whole open when any requested bit is ungranted -- omitting it is what made "
                                + "BBj report \"User not allowed\" against a file the plugin had just created"));
    }

    @Test
    void theFileAttributeIsNamedAclAcl() {
        FileAttribute<List<AclEntry>> attribute = OwnerOnlyAcl.asFileAttribute(principal);
        assertEquals("acl:acl", attribute.name(),
                "the attribute name must be the literal acl:acl the Windows provider recognises");
        assertEquals(OwnerOnlyAcl.ownerOnlyAcl(principal), attribute.value(),
                "the attribute's value must equal the list ownerOnlyAcl returns");
    }

    @Test
    void theReturnedListIsUnmodifiable() {
        List<AclEntry> acl = OwnerOnlyAcl.ownerOnlyAcl(principal);
        assertThrows(UnsupportedOperationException.class, () -> acl.add(null),
                "the returned list must be unmodifiable");
    }
}
