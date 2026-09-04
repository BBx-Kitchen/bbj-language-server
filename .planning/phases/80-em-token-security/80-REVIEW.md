---
phase: 80-em-token-security
reviewed: 2026-09-04T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BackendNoticePolicy.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenValidationCache.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenFailClosedSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/TokenValidationCacheTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 80: Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 19 (source guard/unit tests included)
**Status:** issues_found

## Summary

The phase implements a coherent EM-token security package: a fail-closed three-valued JWT classifier (`JwtValidity`) gating both login-time storage and every run-time expiry check, an owner-only file attribute supplied at temp-file creation time for the token/credential-bearing scratch files (`OwnerOnlyAcl`, `BbjProcessSecretEnv.createOwnerOnlyFile`), a once-per-distinct-backend non-keychain notice (`TokenBackend`, `BackendNoticePolicy`, `BbjEMTokenStore.resolveBackend`), and a SHA-256-digest-keyed five-minute trust-window cache in front of the server-side validation subprocess (`TokenValidationCache`, `BbjRunActionBase.validateTokenTrusted`). All four seams are implemented as plain-Java classes exercised on the JUnit 5 classpath, cross-checked by "source-guard" tests that pin the wiring (call ordering, call counts, absence of the platform-unstable APIs outside their one sanctioned call site) as a textual property. Verified each of the locked 80-CONTEXT.md decisions (strict `exp <= now`, no leeway; collapsing every unclassifiable JWT shape into `MALFORMED`; fail-closed `IOException` when the default filesystem reports neither `posix` nor `acl`; once-per-distinct-backend notice with a keychain-clears-the-record rule; digest-keyed, 5-minute, store/delete-invalidated trust cache) against the implementation and found each correctly realized.

The gaps found are narrower than the design decisions themselves: the ACL "second-best" fallback path in `createOwnerOnlyFile` only guarantees its own "a file that was created but could not be restricted must not survive" invariant against `IOException`, not against the unchecked exceptions (`SecurityException`, `UnsupportedOperationException`, a `null`-view `NullPointerException`) the same JDK APIs can also raise; `BbjEMTokenStore.resolveBackend()` catches `Throwable` rather than `Exception`, which also silently absorbs JVM-level errors; and the token-validation/re-login orchestration in `BbjRunBuiAction` and `BbjRunDwcAction` is duplicated near-verbatim across both files rather than factored into the shared base class. None of these rise to a security bypass of the mechanisms this phase adds — the client-side classifier and the trust cache are both explicitly non-authoritative UX optimisations, with `validateTokenServerSide` and `em-login.bbj`/`web.bbj`'s own presentation of the token to EM remaining the real security boundary in every case.

## Warnings

### WR-01: `createOwnerOnlyFile`'s ACL second-best path only fails closed for `IOException`, not for the unchecked exceptions the same APIs can raise

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java:142-151`

**Issue:** When the current user cannot be resolved by name (the documented "second-best path" for domain accounts), the file is created first and then restricted:

```java
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
```

The class's own Javadoc states the invariant this block exists to guarantee: "A file that was created but could not be restricted must not survive." But the `catch` only covers `IOException`. `Files.getOwner(Path, LinkOption...)` can throw the unchecked `UnsupportedOperationException` if the file store's provider doesn't support `FileOwnerAttributeView` (a mismatch that, while unusual, isn't structurally impossible for a provider that supports `acl` but not the paired `owner` view), `AclFileAttributeView.setAcl` can throw the unchecked `SecurityException` when a security manager denies write access, and `Files.getFileAttributeView(created, AclFileAttributeView.class)` itself would return `null` (immediate `NullPointerException` on the following `.setAcl(...)` call) if the returned view type were ever unsupported for this path despite the filesystem-level capability check having passed. Any of these three unchecked-exception paths skips the `deleteIfExists` cleanup and propagates out of `createOwnerOnlyFile` before the `Path` is ever assigned to the caller's local variable — both call sites (`BbjEMLoginAction.performLogin`'s `tmpFile = BbjProcessSecretEnv.createOwnerOnlyFile(...)` and `BbjRunActionBase.validateTokenServerSide`'s equivalent) have no reference to the path in this failure mode and so can never clean it up either. The result is an orphaned, empty (no secret has been written to it yet at this point) temp file left behind with broader-than-owner-only permissions — a resource leak and a broken invariant, not a plaintext-token disclosure, since the failure happens before any process is launched to write to the file.

**Fix:** Widen the catch to also cover the unchecked failure modes, and null-check the view lookup explicitly so it fails through the same path rather than NPEing:

```java
AclFileAttributeView view = Files.getFileAttributeView(created, AclFileAttributeView.class);
try {
    if (view == null) {
        throw new IOException("acl attribute view unavailable for " + created);
    }
    view.setAcl(OwnerOnlyAcl.ownerOnlyAcl(Files.getOwner(created)));
} catch (IOException | RuntimeException e) {
    Files.deleteIfExists(created);
    throw e instanceof IOException ? (IOException) e : new IOException("Failed to restrict " + created, e);
}
```

### WR-02: `resolveBackend()` catches `Throwable`, silently absorbing JVM-level errors as `UNKNOWN`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:167-169`

**Issue:**

```java
} catch (Throwable t) {
    return TokenBackend.UNKNOWN;
}
```

Catching `Throwable` rather than `Exception` also swallows `Error` subtypes such as `OutOfMemoryError`, `StackOverflowError`, and `NoClassDefFoundError`/`LinkageError` (the latter being a genuinely plausible failure mode here, since this method deliberately touches the pinned platform's marked-internal `PasswordSafeSettings`/`ProviderType` API and a breaking platform upgrade is exactly the failure this comment anticipates: *"a breaking change to it has to fail here"*). Silently downgrading a `LinkageError` from that API to a warn-worthy-but-otherwise-invisible `UNKNOWN` classification means the one call site designed to surface a breaking platform change instead hides it completely — the user sees a generic "unrecognised password store" balloon instead of any signal that the plugin's assumption about the platform API has actually broken. `OutOfMemoryError`/`StackOverflowError` in particular generally indicate the JVM is in a state where continuing normal execution (rather than propagating) is itself unsafe.

**Fix:** Catch `Exception` (or `Exception | LinkageError` if a broken-platform-API signal is specifically wanted) rather than `Throwable`, so genuine JVM-level errors propagate instead of being absorbed:

```java
} catch (Exception e) {
    return TokenBackend.UNKNOWN;
}
```

### WR-03: Token-validation/re-login orchestration is duplicated near-verbatim between `BbjRunBuiAction` and `BbjRunDwcAction`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java:55-105`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java:55-105`

**Issue:** The ~50-line block covering "no token → prompt login", "client-side expiry check (fast path)", "server-side validation, only outside the trust window (#542)", and "token was invalidated → re-prompt login" is identical between the two files (down to the `showYesNoOnEdt` helper, duplicated verbatim at the bottom of each class), differing only in the two or three user-facing strings ("BUI"/"DWC"). This phase's own test suite already has to compensate for the duplication: `EmTokenTrustWindowSourceGuardTest` asserts the same four ordering/call-count properties (`isTokenExpired` before `validateTokenTrusted`, `validateTokenTrusted` before the re-prompt, exactly one `validateTokenTrusted(project, token)` call, no direct `validateTokenServerSide` call) against both `BbjRunBuiAction.java` and `BbjRunDwcAction.java` independently, which is exactly the maintenance cost duplicated logic imposes — a future fix to this flow (e.g. correcting WR-01/WR-02, or changing the re-prompt condition) has to be applied, and separately verified, in two places by hand.

**Fix:** Factor the shared block into a protected template method on `BbjRunActionBase`, e.g. `protected @Nullable String resolveValidToken(Project project, String noTokenPrompt, String invalidTokenPrompt, String noTokenError)`, called once from each subclass's `buildCommandLine` in place of the duplicated block.

## Info

### IN-01: The re-login token obtained inside the "invalidated" branch skips expiry/trust re-validation and never populates the trust cache

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java:88-105`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java:88-105`

**Issue:** When the token is deleted (client-side expiry or a failed `validateTokenTrusted`) and the user re-logs in via the "EM token expired or invalid. Login again?" prompt, the freshly-fetched `token = BbjEMTokenStore.getToken()` is used directly to build the command line — it does not go back through `isTokenExpired`/`validateTokenTrusted`. This is not a correctness problem (`BbjEMLoginAction.performLogin` already runs `JwtValidity.check(...) != VALID` before storing, so the freshly stored token is guaranteed non-`MALFORMED`/non-expired at the moment it lands in `PasswordSafe`), but it does mean `TokenValidationCache.recordValidated` is never called for this token, so the trust window this phase adds provides no benefit for the very next Run immediately following a re-login — that Run will always take the full server-side-validation subprocess path rather than a cache hit.

**Fix:** No functional fix required; if desired, call `TokenValidationCache.SESSION.recordValidated(token)` directly after a successful re-login (bypassing the subprocess, since the token was just minted by EM) to warm the cache the same way a `validateTokenTrusted` hit would.

### IN-02: `JwtValidity`'s regex-based `exp` extraction can match a nested/quoted `"exp"` substring rather than the top-level claim

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java:31,66-74`

**Issue:** `EXP_PATTERN` is matched against the raw decoded payload text via `matcher.find()`, which returns the first (leftmost) occurrence, not necessarily the top-level `exp` claim. A payload where some other claim's *string value* happens to contain the literal substring `"exp":<digits>` earlier in the JSON than the real top-level `exp` claim (e.g. an echoed/escaped nested JSON blob in a custom claim) would have that earlier occurrence classified instead of the real one. This is an explicitly accepted, documented tradeoff (no JSON library, no signature verification — `validateTokenServerSide` is the actual authority per the class Javadoc), and payloads originate from BASIS's own EM server rather than an untrusted third party, so this is not currently attacker-reachable; noting it here only because a hand-rolled JSON scan is inherently fragile to future payload shape changes (e.g. EM ever adding a claim that echoes request metadata).

**Fix:** No action required given the documented design tradeoff; if EM's token payload shape ever grows additional string-valued claims, consider anchoring the match to require it be a top-level key (e.g. preceded by `{` or `,` with only whitespace between) rather than a bare first-occurrence scan.

### IN-03: "Open Password Settings" notification action navigates by a hardcoded, unlocalized settings-page display name

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:117-123`

**Issue:** `ShowSettingsUtil.getInstance().showSettingsDialog(e.getProject(), "Passwords")` locates the target configurable purely by its display-name string. If the platform ever renames or relocalizes that settings page's display name (this is user-facing text, not an ID), the action would silently fail to navigate to the intended page — `showSettingsDialog(Project, String)` has no return value or exception to signal a lookup miss, so the failure would be invisible to both the user and any test.

**Fix:** No action required if this is an accepted, minor UX risk; if hardening is wanted, prefer the configurable-ID overload of `showSettingsDialog` (an ID is more stable across platform versions/locales than a display name) if one is available for the Passwords page on the pinned platform version.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
