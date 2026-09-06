---
phase: 80-em-token-security
plan: 02
subsystem: security
tags: [acl, windows, posix, temp-files, intellij, java, nio, fail-closed]

# Dependency graph
requires:
  - phase: 78-build-foundation
    provides: JDK 17 daemon toolchain (BUILD-01) so ./gradlew test resolves correctly on this JDK 25 host
provides:
  - OwnerOnlyAcl — a pure builder producing one ALLOW AclEntry with no inherit flags, wrapped as the acl:acl file attribute
  - A three-outcome createOwnerOnlyFile (posix attribute / acl attribute at creation / fail-closed IOException) with no default-permission path
  - selectOwnerOnlyStrategy(Set<String>) — a package-private capability decision asserted over all three view sets
  - Seven appended source guards pinning the ACL wiring and the deletion of the default-permission fallback
affects: [80-em-token-security-03-backend-notice, 80-em-token-security-04-validation-trust-window]

# Actuals (#2632)
actuals:
  tokens: 7172
  tasks: 3
  commits: 7

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure value-object builder over java.nio.file.attribute (OwnerOnlyAcl) so a platform-specific file attribute is asserted on Linux without a Windows host and without touching a filesystem"
    - "Capability selection extracted into a package-private pure function (selectOwnerOnlyStrategy) precisely so its unreachable failure branch becomes testable with a synthetic view set"
    - "Negative-control red for a source guard: reintroduce the deleted construct, observe the guard fail, revert — proves non-vacuity when the production change already landed"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java

key-decisions:
  - "The default-permission fallback is deleted, not demoted: createOwnerOnlyFile now either returns an explicitly restricted file or throws, so a branch producing a broadly-readable secret file cannot be reached at all"
  - "posix wins on a dual-view filesystem, keeping the already-shipped and already-proven POSIX branch byte-identical while the Windows half is added beside it"
  - "The capability decision was extracted into a package-private pure function because this host always reports posix — the fail-closed branch is otherwise unreachable by any behavioural test on Linux or in ubuntu-latest CI"
  - "The IOException message names only java.io.tmpdir and the two missing view names — no token, username or credential value — and both callers already surface IOException text in existing failure dialogs"
  - "The Windows ACL path is proven by a pure builder test, a strategy-selection test and a source guard, NOT by any executed Windows run; the icacls check is carried as a human UAT item"

patterns-established:
  - "Pure-builder-plus-source-guard for a platform-specific attribute that CI cannot execute: behavioural tests prove the value shape, guards prove the value is wired into the call"
  - "Negative-control red observation when a guard is written after the production change it pins"

requirements-completed: [TOKEN-02]

coverage:
  - id: D1
    description: "The owner-only ACL is exactly one ALLOW entry for the given principal with no inherit flags, carrying the read/write/truncate/delete permission floor, exposed as an acl:acl file attribute over an unmodifiable list"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java#theBuiltAclHasExactlyOneEntry,theSingleEntryIsAnAllowEntryForTheGivenPrincipal,theSingleEntryCarriesNoInheritFlags,theOwnerPermissionsCoverTheReadWriteTruncateAndDeleteFloor,theFileAttributeIsNamedAclAcl,theReturnedListIsUnmodifiable"
        status: pass
    human_judgment: false
  - id: D2
    description: "Strategy selection returns posix for a POSIX filesystem, acl for an ACL-only filesystem, posix when both views are present, and raises a named IOException for a view set carrying neither (including the empty set)"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java#posixSupportSelectsThePosixStrategy,aclSupportWithoutPosixSelectsTheAclStrategy,posixWinsWhenBothViewsArePresent,neitherViewIsAFailureNamingTheTempDirectoryAndTheMissingCapability,anEmptyViewSetIsAlsoAFailure"
        status: pass
    human_judgment: false
  - id: D3
    description: "The already-shipped POSIX half is unchanged and still green — all 23 pre-existing BbjProcessSecretEnvTest tests pass unmodified, including the exact permission set and its survival across a truncating reopen"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java (29 tests, 23 pre-existing untouched)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Two concurrent EM launches each get their own distinct, existing owner-only file"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java#twoConcurrentCreateCallsReturnDistinctExistingPaths"
        status: pass
    human_judgment: false
  - id: D5
    description: "The ACL attribute is wired into the creation call, the capability is decided before any file exists, an unrestrictable file is deleted, and the default-permission fallback plus its rationale comment are gone rather than unreachable"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java#theBareTwoArgumentTempFileCreationIsGoneEntirely,theAclAttributeIsSuppliedAtCreationOnThePrimaryWindowsPath,thePosixBranchesExplicitAttributeIsStillTheOnlyOneOfItsKind,theCapabilityIsDecidedBeforeAnyFileExists,theSecondBestPathDeletesAFileItCouldNotRestrict,theAclBuilderNamesTheAttributeAndSetsNoInheritFlags,theSupersededPerUserTempDirectoryRationaleIsGone"
        status: pass
    human_judgment: false
  - id: D6
    description: "On a real Windows host the plaintext-JWT temp file carries exactly one ACE for the logged-in account — no BUILTIN\\Users, Everyone or Authenticated Users ACE and no inherited (I) entry — and BBj can still truncate-and-write it in place so the EM login completes"
    requirement: "TOKEN-02"
    verification: []
    human_judgment: true
    rationale: "No automated test in this repository executes the ACL branch. This host reports the posix attribute view, so createOwnerOnlyFile always takes the POSIX branch here, and CI is ubuntu-latest only with no Windows runner. The tests prove the attribute's value shape, the branch selection over synthetic view sets, and the source wiring; only a manual icacls check on a Windows host can confirm the DACL the Windows provider actually writes, and only a real login can confirm the permission floor still permits BBj's truncate-and-write."

# Metrics
duration: 70 min
completed: 2026-09-04
status: complete
---

# Phase 80 Plan 02: Owner-Only Temp Files on Windows Summary

**Closed the Windows half of #536 by supplying an explicit single-`ALLOW`-entry `acl:acl` attribute at temp-file creation, and deleted the default-permission fallback outright so `createOwnerOnlyFile` now either returns an explicitly restricted file or fails closed.**

## Performance

- **Duration:** ~70 min across three sessions (two prior executors stalled; this one resumed at the Task 2 commit)
- **Started:** 2026-09-04T13:44:31Z (first plan commit)
- **Completed:** 2026-09-04T14:54:26Z
- **Tasks:** 3
- **Files modified:** 5 (2 new, 3 modified) — 475 insertions, 13 deletions

## Accomplishments

- `OwnerOnlyAcl` — a final, platform-import-free class over `java.nio.file.attribute` producing exactly one `ALLOW` `AclEntry` for a given `UserPrincipal` with no flags at all, plus an `asFileAttribute` wrapper whose `name()` is the literal `acl:acl`. Because `AclEntry` is a plain value type, all six behavioural assertions run unconditionally on this Linux host.
- `createOwnerOnlyFile` restructured into three outcomes with no fourth: the untouched POSIX branch, an ACL branch that supplies the attribute **at creation** (so, exactly as on POSIX, the file never exists with a broader DACL), and a fail-closed `IOException`. The second-best path — reserved for a principal `lookupPrincipalByName` cannot resolve, as domain accounts can be — creates in the per-user temp directory, restricts immediately via `AclFileAttributeView.setAcl`, and deletes the file if that restriction fails.
- `selectOwnerOnlyStrategy(Set<String>)` extracted as a package-private pure function. This is the whole reason the failure branch is testable: this host always reports `posix`, so a synthetic view set is the only way to reach the fail-closed path from a test.
- The default-permission fallback and the comment arguing the per-user temp directory was restrictive enough are **deleted**, not demoted — and a source guard now fails the build if either returns.
- `BbjProcessSecretEnvTest` grew from 23 to 29 tests; all 23 pre-existing tests are byte-identical and still green. `BbjSecretArgvSourceGuardTest` grew from 12 to 19 with a pure-addition diff (132 insertions, 0 deletions).

## Task Commits

Each task was committed atomically; this plan is `tdd="true"` throughout, so each task carries a red observation and a green commit.

1. **Task 1 RED: OwnerOnlyAcl builder** - `8c2e00c` (test) — `OwnerOnlyAclTest`; red was a compile failure (`OwnerOnlyAcl` did not exist), observed by the first session.
2. **Task 1 GREEN: ACL attribute at creation** - `b1f0dc3` (feat) — `OwnerOnlyAcl.java` plus the `acl` branch in `createOwnerOnlyFile`.
3. **Task 2 RED: strategy selection + concurrency** - `36a520c` (test) — 88 lines appended to `BbjProcessSecretEnvTest`; red because `selectOwnerOnlyStrategy` did not yet exist.
4. **Task 2 GREEN: fail closed on neither view** - `15c9eef` (feat) — the extracted selector and the rewritten `createOwnerOnlyFile`. Verified green in this session by a fresh `--rerun` (29/29, 0 failures) before committing, plus all four acceptance greps.
5. **Task 3: ACL wiring source guard** - `8dba554` (test) — seven assertions appended; red observed by negative control (see Deviations note below), then 19/19 green.
6. **Decision-id scrub** - `bd91c00` (docs) — reworded two planning decision ids out of `OwnerOnlyAclTest` comments (see Deviations).

**Plan metadata:** (this commit) `docs(80-02): complete plan`

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java` - New pure builder: one `ALLOW` entry, no inherit flags, the `acl:acl` file attribute, an unmodifiable permission floor covering `READ_DATA`, `WRITE_DATA`, `APPEND_DATA`, `READ_ATTRIBUTES`, `WRITE_ATTRIBUTES`, `DELETE`, `SYNCHRONIZE`, `READ_ACL`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java` - `createOwnerOnlyFile` restructured to three outcomes; new package-private `selectOwnerOnlyStrategy` and a private `resolveCurrentUserPrincipal`; fallback and its rationale comment removed; method Javadoc rewritten
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java` - Six behavioural assertions on the built entry list and the file attribute
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java` - Six appended tests (strategy over all three view sets, empty-set failure, eight-thread concurrency); the 23 pre-existing tests untouched
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java` - Seven appended guards, one sibling path constant, and a balanced-brace `extractMethodBody` helper; the 12 pre-existing guards untouched

## Verification Results

Every run below is a fresh `--rerun` from this session (results timestamped 14:50–14:53), not a Gradle `UP-TO-DATE` reuse — the first attempt returned `UP-TO-DATE` and was discarded.

| Check | Result |
|---|---|
| `OwnerOnlyAclTest` | 6 tests, 0 failures |
| `BbjProcessSecretEnvTest` | 29 tests, 0 failures (23 pre-existing + 6 new) |
| `BbjSecretArgvSourceGuardTest` | 19 tests, 0 failures (12 pre-existing + 7 new) |
| Whole `./gradlew test` suite | **199 tests across 21 classes, 0 failures, 0 errors** |
| `selectOwnerOnlyStrategy(` occurrences in source | 2 (declaration + single call site) |
| `createTempFile(prefix, suffix)` occurrences | 0 |
| `PosixFilePermissions.asFileAttribute` occurrences | 1 (POSIX branch intact) |
| Advisory-id / decision-id register check over all five files | clean |

## Decisions Made

- **The fallback is deleted, not demoted.** A branch producing a default-permission file is not a variant of "owner-only at creation", so the absence of both capabilities is an error rather than a third strategy. The source guard makes this a permanent property: reintroducing the bare two-argument creation fails the build.
- **POSIX wins on a dual-view filesystem.** A filesystem reporting both views keeps the already-shipped, already-proven branch, so adding the Windows half cannot change behaviour anywhere the POSIX branch already ran.
- **Capability selection is a separate pure function purely for testability.** Extracting it is what turns an unreachable failure branch into two asserted cases; without the extraction the fail-closed guarantee would be untestable on any host we run on.
- **Error message content deliberately bounded.** It names `java.io.tmpdir` and the two missing view names only. Both callers already surface `IOException` text (`BbjEMLoginAction` as "Login failed: …", `BbjRunActionBase` as an invalid token), so failing closed degrades to a re-prompt, never to a silently unprotected secret.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Planning decision ids left in test source comments**
- **Found during:** Task 2's pre-commit register check
- **Issue:** `OwnerOnlyAclTest.java` (written in Task 1 by an earlier session) carried the literal `D-09` in two comments. The phase's own landing rule and this project's convention are that source comments carry GitHub issue numbers only — internal planning decision ids must not ship in the diff. The file was already committed at `8c2e00c`, so the leak would have reached the eventual PR.
- **Fix:** Reworded both comments to name the property instead of the decision ("the read-write-delete permission floor"). No behaviour change, no assertion change.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java`
- **Verification:** `OwnerOnlyAclTest` 6/6 green after the reword; a register grep for `GHSA`, `SEC-<n>` and `D-<n>` across all five files of this plan returns clean.
- **Committed in:** `bd91c00`

**Note on Task 3's red observation (method, not a deviation).** Task 3's guards pin properties that Tasks 1 and 2 had already established, so they passed the moment they were written — the plan anticipates this explicitly. To avoid recording a vacuous red, the red was observed by negative control: the deleted fallback and its rationale comment were temporarily reintroduced into `BbjProcessSecretEnv.java`, the guard class was run (19 tests, **2 failures** — exactly `theBareTwoArgumentTempFileCreationIsGoneEntirely` and `theSupersededPerUserTempDirectoryRationaleIsGone`), and the file was then restored with a targeted `git checkout -- <that one file>` and confirmed byte-identical to `15c9eef`. The other five guards stayed green under that control because the control left the ACL wiring they pin intact. An earlier, broader control (restoring the whole pre-Task-1 file) was discarded because it failed at `compileTestJava` — Task 2's committed tests call `selectOwnerOnlyStrategy` — which would have been a compile error rather than an assertion red.

---

**Total deviations:** 1 auto-fixed (1 missing-critical/convention)
**Impact on plan:** None on scope or behaviour — a two-comment reword. No production logic was changed outside the plan's own tasks.

## Issues Encountered

- The first `./gradlew test` invocation returned `Task :test UP-TO-DATE` and produced no result XML, so it proved nothing. Every verification in this SUMMARY comes from an explicit `--rerun` with counts read out of `build/test-results/test/TEST-*.xml`, not from the Gradle console line alone.

## Threat Flags

None — this plan introduces no new network endpoint, auth path, file-access pattern or schema change beyond the surface already enumerated in the plan's threat register (T-80-06 … T-80-11), all of which are mitigated or explicitly accepted there.

## Known Stubs

None. No placeholder value, TODO, or unwired data path was introduced.

## Windows verification status (read this before closing #536)

**The Windows ACL branch was never executed by any automated test in this plan, and this SUMMARY does not claim otherwise.** This host's default filesystem reports the `posix` attribute view, so `createOwnerOnlyFile` always takes the POSIX branch here, and CI is `ubuntu-latest` only — there is no Windows runner. What is machine-proven is: the attribute's value shape (`OwnerOnlyAclTest`), the branch selection over all three view sets including the failure case (`BbjProcessSecretEnvTest`), and that those values are wired into the creation call with the old fallback gone (`BbjSecretArgvSourceGuardTest`). The DACL the Windows provider actually writes is proven only by the manual check below.

## User Setup Required

None - no external service configuration required.

## Human UAT items (carry into `/gsd-verify-work`)

1. **Windows `icacls` check — required for #536 closure.** On a Windows host with the plugin installed: trigger Tools > Login to Enterprise Manager and, while `em-login.bbj` is running, run `icacls %TEMP%\bbj-em-login-*.tmp`. Expect exactly one ACE granting the logged-in account, no ACE for `BUILTIN\Users`, `Everyone` or `NT AUTHORITY\Authenticated Users`, and no `(I)` inherited entry. A throwaway JShell call to `BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-login-", ".tmp")` is an acceptable substitute if a full login is impractical.
2. **Windows write-through check.** Confirm the login completes — that is the practical proof the permission floor still lets BBj truncate and write the file in place, and that the caller's `finally` block can delete it afterwards. If BBj cannot write, granting the owner full control is the documented remedy (the permission set is a floor, not a ceiling).

## Next Phase Readiness

- TOKEN-02 (#536) is complete on the code side: both secret temp files are owner-only from creation on POSIX (verified by test) and on an ACL filesystem (explicit `acl:acl` attribute, verified by value and wiring tests), with a fail-closed error when neither capability exists. Issue closure additionally needs the manual `icacls` attestation above.
- No file in this plan is shared with 80-01, 80-03 or 80-04 — 80-03 (`BbjEMTokenStore`, `BackendNoticePolicy`) and 80-04 (`TokenValidationCache`, `BbjRunActionBase`) are unblocked and unaffected.
- Whole IntelliJ suite is green at 199 tests, up from 180 at the close of 80-01.

---
*Phase: 80-em-token-security*
*Completed: 2026-09-04*
</content>
</invoke>

## Self-Check: PASSED

All five source/test files listed under `key-files` exist on disk, and all seven commits
(`8c2e00c`, `b1f0dc3`, `36a520c`, `15c9eef`, `8dba554`, `bd91c00`) plus this metadata commit resolve in
`git log`. Every acceptance criterion from Tasks 1-3 and the plan-level `<verification>`
block was re-run in this session against a fresh `--rerun`: 6 / 29 / 19 per class and
199 tests, 0 failures across the whole IntelliJ suite.
