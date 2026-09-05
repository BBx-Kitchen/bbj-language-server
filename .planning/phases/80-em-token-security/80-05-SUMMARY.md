---
phase: 80-em-token-security
plan: 05
subsystem: security
tags: [windows, acl, jwt, intellij, owner-only, gap-closure]

# Dependency graph
requires:
  - phase: 80-em-token-security (plan 80-02)
    provides: owner-only temp files via OwnerOnlyAcl / createOwnerOnlyFile choke point
provides:
  - OwnerOnlyAcl.OWNER_PERMISSIONS widened to ten permissions covering the full Windows GENERIC_READ|GENERIC_WRITE access mask
  - A named regression test pinning the two extended-attribute bits (READ_NAMED_ATTRS, WRITE_NAMED_ATTRS)
  - An initializer-scoped source guard (20th guard in BbjSecretArgvSourceGuardTest) preventing future narrowing of the permission floor
affects: []

# Actuals (#2632)
actuals:
  tokens: 1800
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Initializer-scoped source guard via extractBalancedCallArgument(text, \"Set.of(\") — scopes the assertion to the permission-set argument text itself, not the whole file, so Javadoc prose alone cannot satisfy the guard while the underlying set is narrowed"
    - "Negative-control red observation when a guard is written after the production change it pins: temporarily delete the two constants, observe the guard fail alone, restore via git checkout --, confirm byte-identical, then commit the guard against the real green state"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java

key-decisions:
  - "Widened the Windows owner ACE by exactly READ_NAMED_ATTRS and WRITE_NAMED_ATTRS (ten permissions total), not full control. Windows folds FILE_READ_EA/FILE_WRITE_EA into GENERIC_READ/GENERIC_WRITE, and an access check denies the whole open when any requested bit is ungranted; ten bits is the surgical fix, fourteen (full control) is the escalation reserved for a Windows recheck that still fails."
  - "The initializer-scoped guard uses the file's pre-existing extractBalancedCallArgument(text, \"Set.of(\") helper rather than a whole-file substring search, so a future edit that narrows the set back fails the build even if the surrounding Javadoc still mentions both permissions in prose."

requirements-completed: [TOKEN-02]

coverage:
  - id: D1
    description: "OwnerOnlyAcl.OWNER_PERMISSIONS contains READ_NAMED_ATTRS and WRITE_NAMED_ATTRS, asserted by a named regression test that was red against the pre-fix eight-permission set and is now green, alongside a widened floor assertion; all six pre-existing owner-only shape assertions (one ALLOW entry, one principal, no deny, no inherit flags, acl:acl attribute, unmodifiable list) are unchanged and green"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java#theOwnerPermissionsCoverTheExtendedAttributeBitsFoldedIntoGenericReadAndGenericWrite"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java#theOwnerPermissionsCoverTheReadWriteTruncateAndDeleteFloor"
        status: pass
    human_judgment: false
  - id: D2
    description: "A source guard pins both extended-attribute bits inside the Set.of( initializer's argument text specifically (not the whole file), proven red by negative control (both constants temporarily removed, guard fails alone, 19 other guards stay green) before being committed against the true green state"
    requirement: "TOKEN-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java#theOwnerPermissionFloorGrantsTheExtendedAttributeBits"
        status: pass
    human_judgment: false
  - id: D3
    description: "On a Windows host, em-login.bbj's open(ch,mode=\"O_CREATE,O_TRUNC\")outputFile! against the plugin-created temp file succeeds (no !ERROR=18), and icacls shows exactly one ACE for the logged-in account with no BUILTIN\\Users/Everyone/Authenticated Users entry and no (I) inherited flag"
    requirement: "TOKEN-02"
    verification: []
    human_judgment: true
    rationale: "No Windows runner exists in CI or is reachable from this environment; this host reports the posix attribute view, so the Windows ACL branch of createOwnerOnlyFile is never executed by any automated test here. The green unit/guard results above prove the value of the widened permission set and its presence in the initializer only — G-80-1 is closed on the code side but not attested until UAT test 1 is re-run on a Windows host with the rebuilt plugin."

# Metrics
duration: ~15min
completed: 2026-09-05
status: complete
---

# Phase 80 Plan 05: Windows Owner-ACE Extended-Attribute Gap Closure Summary

**Widened `OwnerOnlyAcl.OWNER_PERMISSIONS` from eight to ten permissions by adding `READ_NAMED_ATTRS` and `WRITE_NAMED_ATTRS` so the single owner ACE covers the full `GENERIC_READ|GENERIC_WRITE` access mask Windows folds a file open into, closing gap G-80-1 (#536) on the code side.**

## Performance

- **Duration:** ~15 min (all task work completed and committed by a prior executor session; this session performed verification re-run and close-out only)
- **Started:** 2026-09-05T07:32:07Z (phase begin, per STATE.md)
- **Completed:** 2026-09-05T07:41:55Z (last task commit)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `OwnerOnlyAcl.OWNER_PERMISSIONS` grew from eight to ten `AclEntryPermission` values, adding `READ_NAMED_ATTRS` and `WRITE_NAMED_ATTRS` to the single unmodifiable `Set.of(...)` initializer, with Javadoc explaining Windows' generic-rights folding as the reason and stating the set is a floor that must not be narrowed back
- `OwnerOnlyAclTest`'s floor assertion widened to include the two new permissions, plus a new named regression test `theOwnerPermissionsCoverTheExtendedAttributeBitsFoldedIntoGenericReadAndGenericWrite()` asserting both bits individually via `assertAll`; all six pre-existing owner-only shape assertions unchanged
- `BbjSecretArgvSourceGuardTest` gained a 20th guard, `theOwnerPermissionFloorGrantsTheExtendedAttributeBits()`, scoped via `extractBalancedCallArgument(text, "Set.of(")` to the permission-set initializer's own argument text so a future narrowing fails the build even if surrounding prose still mentions both permissions
- No edit to `BbjProcessSecretEnv.java` or `BbjRunActionBase.java` — both the `em-login.bbj` and `em-validate-token.bbj` temp-file paths route through the same `OwnerOnlyAcl`/`createOwnerOnlyFile` choke point and inherit the widened floor automatically
- Whole targeted suite (`OwnerOnlyAclTest` + `BbjProcessSecretEnvTest` + `BbjSecretArgvSourceGuardTest`): 56/56 tests, 0 failures, 0 errors, verified fresh with `--rerun` in this session

## Task Commits

1. **Task 1 RED: widen the floor assertion and add the named regression test** - `e6cf0a4` (test) — `OwnerOnlyAclTest.java` widened `containsAll` assertion plus new dedicated test, both red against the pre-fix eight-permission production set
2. **Task 1 GREEN: add the two permissions to the production set** - `6cb9a34` (feat) — `OwnerOnlyAcl.java` `OWNER_PERMISSIONS` widened to ten elements with rationale-bearing Javadoc; both new/widened tests green, other six unchanged
3. **Task 2: initializer-scoped source guard** - `f70f02c` (test) — `BbjSecretArgvSourceGuardTest.java` +26/-0, one new `@Test` method scoped to the `Set.of(` argument text; red observed by negative control, then restored and committed green

**Plan metadata:** (this commit, made by the continuation executor) `docs(80-05): complete Windows owner-ACE extended-attribute gap closure plan`

_Note: this plan is `tdd="true"` for Task 1 (`type="tracer"`) and Task 2 (`type="auto"`); both tasks carry a red observation ahead of their green commit._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java` - `OWNER_PERMISSIONS` widened from eight to ten permissions; Javadoc extended with the Windows generic-rights-folding rationale
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OwnerOnlyAclTest.java` - Floor assertion widened; new named regression test for the two extended-attribute bits
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java` - New 20th guard scoped to the `Set.of(` initializer argument text

## Decisions Made

- Widened the Windows owner ACE by exactly `READ_NAMED_ATTRS` and `WRITE_NAMED_ATTRS` (ten permissions total), not full control. Windows folds `FILE_READ_EA`/`FILE_WRITE_EA` into `GENERIC_READ`/`GENERIC_WRITE`, and an access check denies the whole open when any requested bit is ungranted; ten bits is the surgical fix, fourteen (full control) is the escalation reserved for a Windows recheck that still fails.
- The Javadoc names the two new permissions unqualified (`{@code READ_NAMED_ATTRS}`, `{@code WRITE_NAMED_ATTRS}`) rather than in `AclEntryPermission.`-qualified form, so the qualified-occurrence acceptance gate (which counts exactly ten) stays meaningful and uninflated by prose.
- Task 2's guard reuses the file's existing `extractBalancedCallArgument(text, "Set.of(")` helper rather than a whole-file substring search, keeping the assertion scoped to the initializer specifically.

## Deviations from Plan

**1. [Orchestrator recovery] The first executor stalled after all task commits, before SUMMARY.**
A previous executor session completed and committed all Task 1 and Task 2 work (commits `e6cf0a4`, `6cb9a34`, `f70f02c`) but stalled before writing `80-05-SUMMARY.md`. A continuation executor (this session) verified the committed state, re-ran the plan-level verification fresh, confirmed all acceptance criteria, and performed the SUMMARY/STATE/ROADMAP/REQUIREMENTS close-out. No code was re-implemented, re-edited, or re-committed.

## Issues Encountered

- The prior executor's stall before SUMMARY closeout is a known failure mode for this environment (background executors going silent after the last task commit); this continuation session picked up cleanly from the committed git state per the orchestrator's completed-state briefing.
- The whole-file register check (`grep -cE 'GHSA|SEC-[0-9]|D-[0-9]'`) reports 1 hit in `BbjSecretArgvSourceGuardTest.java`, at line 19: a pre-existing class-level Javadoc reference (`GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8`) from an earlier phase. Confirmed via `git diff 342fb11 HEAD` that this line is NOT part of this plan's diff (26 lines added, 0 deleted, none matching the register pattern) — the register check is clean on this plan's own diff; the single whole-file hit is pre-existing and out of scope for this plan.

## Red Observations

**Task 1 RED (recorded from the prior executor's Gradle output, before the production change landed):**
```
OwnerOnlyAclTest > theOwnerPermissionsCoverTheReadWriteTruncateAndDeleteFloor() FAILED
    AssertionFailedError at OwnerOnlyAclTest.java:66
    message: the read-write-delete permission floor must be present so em-login.bbj can truncate-and-write and the caller's finally block can delete, and the floor must also cover the extended-attribute bits an open request carries
OwnerOnlyAclTest > theOwnerPermissionsCoverTheExtendedAttributeBitsFoldedIntoGenericReadAndGenericWrite() FAILED
    AssertionFailedError at OwnerOnlyAclTest.java:86 (MultipleFailuresError, two assertions)
    message: Windows folds READ_NAMED_ATTRS into GENERIC_READ, and an access check denies the whole open when any requested bit is ungranted -- omitting it is what made BBj report "User not allowed" against a file the plugin had just created (#536)
    message: Windows folds WRITE_NAMED_ATTRS into GENERIC_WRITE, and an access check denies the whole open when any requested bit is ungranted -- omitting it is what made BBj report "User not allowed" against a file the plugin had just created (#536)
7 tests completed, 2 failed
```
After the production change (`6cb9a34`): 7 tests, 0 failures; the other five assertions (one entry, ALLOW, same principal, empty flag set, `acl:acl` attribute, unmodifiable list) unchanged and green.

**Task 2 negative-control observation (both constants temporarily removed from `OwnerOnlyAcl.java`, then restored byte-identical via `git checkout --`):**
```
BbjSecretArgvSourceGuardTest > theOwnerPermissionFloorGrantsTheExtendedAttributeBits() FAILED
    AssertionFailedError at BbjSecretArgvSourceGuardTest.java:376
20 tests completed, 1 failed
```
Exactly the one new guard failed; the 19 pre-existing guards stayed green. With the constants restored: 20 tests, 0 failures.

## Windows Verification Status

No automated test in this repository executes the Windows ACL branch of `createOwnerOnlyFile`. This host reports the `posix` file-attribute view and CI runs `ubuntu-latest` only, so `OwnerOnlyAcl`'s builder logic is exercised as a pure value-object test (`OwnerOnlyAclTest`), the strategy-selection logic is exercised against synthetic view sets (`BbjProcessSecretEnvTest`), and the permission floor's textual presence is exercised via source guards (`BbjSecretArgvSourceGuardTest`) — never by an actual Windows `CreateFile`/ACL check. This plan's green results (56/56 across the three classes, fresh `--rerun`) prove two things and no more: the value of the widened ten-permission set, and its presence inside the `Set.of(` initializer specifically (not merely somewhere in the file). **G-80-1 is closed on the code side but is not attested closed until the manual check below is re-run on a Windows host** with the rebuilt plugin installed.

## Human UAT Items

Carried forward verbatim from UAT test 1 in `80-UAT.md` (`coverage_id: 80-02 D-10d`, gap `G-80-1`):

**Windows temp file carries exactly one owner ACE (TOKEN-02, #536), and the write-through login completes.**
- **Steps:** On a Windows host with the rebuilt plugin installed, trigger Tools > Login to Enterprise Manager and, while `em-login.bbj` is running, run `icacls %TEMP%\bbj-em-login-*.tmp` (a throwaway JShell call to `BbjProcessSecretEnv.createOwnerOnlyFile` is an acceptable substitute for observing the DACL alone).
- **Expected:** Exactly one ACE granting the logged-in account; no ACE for `BUILTIN\Users`, `Everyone`, or `NT AUTHORITY\Authenticated Users`; no `(I)` inherited entry. **And**, now the load-bearing half of this recheck: the login/validation completes without BBj reporting `!ERROR=18 ... User not allowed`.
- **If it still fails:** capture the `icacls` output and the identity the BBj process actually runs as before changing any code — do not widen the ACL further on speculation. The documented escalation, only if a same-account open is proven still denied, is granting the owner full control (all `AclEntryPermission` values in one `ALLOW` entry, still owner-only); that step is explicitly out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None — this plan's threat register (T-80-12 through T-80-15, T-80-SC) fully enumerates the surface touched; no new network endpoint, auth path, or schema change was introduced.

## Known Stubs

None. No placeholder value, TODO, or unwired data path was introduced.

## Next Phase Readiness

- TOKEN-02 (#536) is complete on the code side: the owner ACE now covers the full `GENERIC_READ|GENERIC_WRITE` access mask, the owner-only shape (one ALLOW entry, one principal, no deny, no inherit flags) is unchanged and pinned by six shape assertions plus 20 source guards, and both `em-login.bbj`'s and `em-validate-token.bbj`'s temp-file paths inherit the fix through the shared `createOwnerOnlyFile` choke point with no additional edit. Issue closure additionally needs the Windows UAT item above.
- Phase 80 (EM Token Security)'s five plans (80-01 through 80-05) have now all landed on the code side, covering TOKEN-01 through TOKEN-04 plus this gap-closure plan for TOKEN-02. `./gradlew test` targeted suite is green at 56/56 for the three classes this plan touches.
- No further plan in this phase depends on this one. Remaining work is the human UAT re-run on a Windows host (this plan's item) plus the other pending items already tracked in `80-UAT.md`.

---
*Phase: 80-em-token-security*
*Completed: 2026-09-05*

## Self-Check: PASSED

All three modified files exist on disk at their expected paths, and all three task commits
(`e6cf0a4`, `6cb9a34`, `f70f02c`) resolve in `git log --oneline --grep="80-05"`. The plan-level
verification command was re-run fresh in this session (`--rerun`) and the XML result files
under `bbj-intellij/build/test-results/test/` confirm 7 + 29 + 20 = 56 tests, 0 failures,
0 errors across `OwnerOnlyAclTest`, `BbjProcessSecretEnvTest`, and `BbjSecretArgvSourceGuardTest`.
All acceptance-criteria greps from the plan were re-run against the current tree and match the
expected values exactly.
