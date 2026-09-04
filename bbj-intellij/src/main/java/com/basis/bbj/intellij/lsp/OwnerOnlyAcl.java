package com.basis.bbj.intellij.lsp;

import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.UserPrincipal;
import java.util.List;
import java.util.Set;

/**
 * Builds the ACL-based owner-only file attribute (see {@link #asFileAttribute} for its
 * name) that restricts a newly created file to its owner on a filesystem with an ACL
 * attribute view (Windows). #536: supplying this
 * attribute at file-creation time -- exactly as {@link BbjProcessSecretEnv}'s POSIX
 * branch already supplies owner-only permission bits at creation -- means the file
 * never exists with a broader access control list, so there is no window between
 * creation and restriction on this path. A pure value builder: its shape (one ALLOW
 * entry, one principal, no inherit flags) is unit-testable on any host, including a
 * Linux one with no {@code acl} attribute view, without touching a real filesystem.
 */
public final class OwnerOnlyAcl {

    private OwnerOnlyAcl() {
    }

    /**
     * The owner permission set granted by {@link #ownerOnlyAcl(UserPrincipal)}: enough
     * for {@code em-login.bbj} to truncate and rewrite the file in place ({@code
     * WRITE_DATA}, {@code APPEND_DATA}), for attribute updates ({@code READ_ATTRIBUTES},
     * {@code WRITE_ATTRIBUTES}), for the caller's {@code finally}-block delete
     * ({@code DELETE}), and for reading the ACL back ({@code READ_ACL},
     * {@code SYNCHRONIZE}) -- the permission floor.
     */
    static final Set<AclEntryPermission> OWNER_PERMISSIONS = Set.of(
            AclEntryPermission.READ_DATA,
            AclEntryPermission.WRITE_DATA,
            AclEntryPermission.APPEND_DATA,
            AclEntryPermission.READ_ATTRIBUTES,
            AclEntryPermission.WRITE_ATTRIBUTES,
            AclEntryPermission.DELETE,
            AclEntryPermission.SYNCHRONIZE,
            AclEntryPermission.READ_ACL
    );

    /**
     * Builds a single-entry ACL granting exactly {@code owner} the {@link
     * #OWNER_PERMISSIONS} floor: {@code ALLOW} only, no {@code DENY} entry, no second
     * entry, and no inherit flags. An entry carrying an inherit flag would propagate
     * the grant to children the file cannot have. Exactly one principal, {@code ALLOW}
     * only, and no inherit flags are what make the file owner-only.
     */
    public static List<AclEntry> ownerOnlyAcl(UserPrincipal owner) {
        AclEntry entry = AclEntry.newBuilder()
                .setType(AclEntryType.ALLOW)
                .setPrincipal(owner)
                .setPermissions(OWNER_PERMISSIONS)
                .build();
        return List.of(entry);
    }

    /**
     * Wraps {@link #ownerOnlyAcl(UserPrincipal)} as the file attribute named below --
     * the one {@link java.nio.file.Files#createTempFile} accepts on a filesystem whose
     * default provider supports the {@code acl} attribute view (Windows) -- supplying
     * the restriction at creation time rather than applying it afterward, so the file
     * never exists with a broader DACL.
     */
    public static FileAttribute<List<AclEntry>> asFileAttribute(UserPrincipal owner) {
        List<AclEntry> acl = ownerOnlyAcl(owner);
        return new FileAttribute<>() {
            @Override
            public String name() {
                return "acl:acl";
            }

            @Override
            public List<AclEntry> value() {
                return acl;
            }
        };
    }
}
