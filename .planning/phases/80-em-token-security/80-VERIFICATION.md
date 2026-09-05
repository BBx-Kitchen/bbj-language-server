---
phase: 80-em-token-security
verified: 2026-09-05T08:30:00Z
status: human_needed
score: 4/4 roadmap success criteria verified (55/55 plan-level must-have truths verified: 49 from 80-01..80-04 + 6 new from 80-05 gap closure)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/4 roadmap success criteria verified (49/49 plan-level must-have truths verified)
  gaps_closed:
    - "G-80-1 (blocker): OwnerOnlyAcl.OWNER_PERMISSIONS now grants READ_NAMED_ATTRS and WRITE_NAMED_ATTRS (ten permissions instead of eight), closing the code-side defect that made Windows deny BBj's open(ch,mode=\"O_CREATE,O_TRUNC\") of the plugin-created temp file with !ERROR=18. Owner-only shape (one ALLOW entry, one principal, no DENY, no inherit flags) confirmed unchanged."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "On a Windows host with the rebuilt plugin installed, trigger Tools > Login to Enterprise Manager and, while em-login.bbj is running, run `icacls %TEMP%\\bbj-em-login-*.tmp` (a throwaway JShell call to BbjProcessSecretEnv.createOwnerOnlyFile is an acceptable substitute for observing the DACL alone)."
    expected: "Exactly one ACE granting the logged-in account; no ACE for BUILTIN\\Users, Everyone, or NT AUTHORITY\\Authenticated Users; no (I) inherited entry. AND (the load-bearing half of this recheck, previously failed as G-80-1): login/validation completes without BBj reporting !ERROR=18 \"User not allowed\"."
    why_human: "CI is ubuntu-latest only and no Windows host is reachable from this environment, so the ACL branch of createOwnerOnlyFile — and specifically whether the ten-permission floor now satisfies BBj's native open() call — is never executed by any automated test. The code-level fix (READ_NAMED_ATTRS/WRITE_NAMED_ATTRS added, permission-floor guard tightened) is proven by OwnerOnlyAclTest (7/7), BbjProcessSecretEnvTest (29/29), and BbjSecretArgvSourceGuardTest (20/20) re-run fresh this session — all 0 failures — but a value-object/guard test cannot prove a real Windows CreateFile/ACL check succeeds. This is the same UAT test 1 from 80-UAT.md, re-run once the fix landed."
---

# Phase 80: EM Token Security Verification Report

**Phase Goal:** EM JWT handling fails closed on malformed tokens, stores temp files owner-only on both POSIX and Windows, warns when the token isn't backed by the native OS keychain, and avoids redundant re-validation within a short trust window.
**Verified:** 2026-09-05
**Status:** human_needed
**Re-verification:** Yes — after gap closure (G-80-1, plan 80-05)

## Context

This is the second verification pass for Phase 80. The first pass (2026-09-04, status `human_needed`) found all four roadmap success criteria code-verified but routed six items to human UAT since no test harness in this repo can exercise a live IntelliJ notification, a live Run subprocess, or a live Windows ACL. UAT (`80-UAT.md`, 2026-09-05) then ran all six: five passed (TOKEN-03 balloon behaviour x3, TOKEN-04 cache/logout behaviour x2), and one failed as gap **G-80-1** (blocker) — on Windows, BBj's `em-login.bbj` could not even open the plugin-created owner-only temp file (`!ERROR=18`), because `OwnerOnlyAcl.OWNER_PERMISSIONS` omitted the two extended-attribute permissions (`READ_NAMED_ATTRS`, `WRITE_NAMED_ATTRS`) that Windows folds into the `GENERIC_READ`/`GENERIC_WRITE` access mask a file open requests.

Gap-closure plan 80-05 (commits `e6cf0a4`, `6cb9a34`, `f70f02c`, `ee8b393`) added exactly those two permissions and a source guard to prevent future narrowing. This verification pass:
1. Re-checks the fixed code at all three levels (exists, substantive, wired) — full depth, per re-verification rules for previously-failed items.
2. Quick regression-checks the five previously-passed UAT items and the three other roadmap truths (TOKEN-01, 03, 04), whose supporting source files are confirmed unchanged since the last verification (`git diff --stat 342fb11..HEAD` for `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` and `.../lsp/BbjProcessSecretEnv.java` is empty).
3. Classifies the still-open Windows write-through recheck honestly as `human_needed`, not `passed` and not `gaps_found` — the code defect is fixed and unit-tested, but only a Windows host can prove BBj's actual `open()` now succeeds.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A malformed, non-3-part, exp-less, or undecodable JWT is treated as expired across all three previously fail-open branches, verified by a regression test covering each branch (#535) | ✓ VERIFIED | Unchanged since prior verification. `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` has zero diff since commit `342fb11` (the point of the last full verification). No source under this requirement was touched by the gap-closure plan. |
| 2 | EM login and validate temp files holding the plaintext JWT are owner-only on POSIX (confirmed by test) and on Windows via an explicit ACL rather than the current default-permission fallback (#536) | ✓ VERIFIED (code, POSIX, and ACL shape) / ⚠️ Windows write-through still human-verified | `OwnerOnlyAcl.java` read in full: `OWNER_PERMISSIONS` now a 10-element `Set.of(...)` including `AclEntryPermission.READ_NAMED_ATTRS` and `AclEntryPermission.WRITE_NAMED_ATTRS` (confirmed by `grep -c 'AclEntryPermission\.'` = 10, `grep -c 'AclEntryType\.ALLOW'` = 1, `grep -cE 'AclEntryType\.DENY\|FILE_INHERIT\|DIRECTORY_INHERIT'` = 0). Javadoc explains the Windows generic-rights-folding rationale. Fresh re-run this session: `OwnerOnlyAclTest` 7/7, `BbjProcessSecretEnvTest` 29/29 (POSIX branch untouched — `git diff --stat` for `BbjProcessSecretEnv.java` since `342fb11` is empty), `BbjSecretArgvSourceGuardTest` 20/20 (new 20th guard scoped to the `Set.of(` initializer argument, confirmed via direct read) — all 0 failures, 0 errors, read from `bbj-intellij/build/test-results/test/TEST-*.xml`. The Windows DACL + write-through behaviour itself is not exercised by any test on this ubuntu-latest/POSIX host — see Human Verification. |
| 3 | When PasswordSafe's resolved backend for the EM token is not the native OS keychain (KeePass file or memory-only), the plugin shows a one-time notification naming the backend, with the internal-API access isolated behind a single method covered by a regression test (#552) | ✓ VERIFIED (code + confirmed by human UAT) | Code unchanged since prior verification (no diff to `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` since `342fb11`). `80-UAT.md` tests 2, 3, 4 all `result: pass` — the KeePass balloon appeared exactly once, the downgrade-to-memory-only re-warned after a return to keychain, and the "Open Password Settings" action opened the Passwords page. These three items are now closed positively, not outstanding. |
| 4 | Two Run invocations using the same recently-validated token trigger exactly one server-side validation call; the cache is keyed on the token bytes and invalidated on store/delete (#542, depends on TOKEN-01 landing first) | ✓ VERIFIED (code + confirmed by human UAT) | Code unchanged since prior verification. `80-UAT.md` tests 5, 6 both `result: pass` — the second Run was noticeably faster with no second subprocess, and logout/re-login forced a fresh validation on the next Run. Both items are now closed positively, not outstanding. |

**Score:** 4/4 roadmap success criteria verified (truth 2 verified at the code/unit level with the Windows write-through recheck still open — see Human Verification below; this is the same disposition the phase's own gap-closure plan states and does not count as a gap since the code defect is fixed)

### Plan-Level Must-Haves (80-05 Gap Closure)

All 6 new must-have truths from `80-05-PLAN.md` (closing G-80-1) checked directly against source, not SUMMARY prose:

| # | Must-have truth | Status | Evidence |
|---|------------------|--------|----------|
| 1 | Single owner ACE grants the two extended-attribute bits so `em-login.bbj`'s `open(...)` is no longer denied outright | ✓ VERIFIED (code) | `OwnerOnlyAcl.java` lines 43-54: `Set.of(...)` now includes `READ_NAMED_ATTRS`, `WRITE_NAMED_ATTRS` alongside the original 8. |
| 2 | `OWNER_PERMISSIONS` contains both bits, asserted by a named regression test red against the pre-fix set | ✓ VERIFIED | `OwnerOnlyAclTest.theOwnerPermissionsCoverTheExtendedAttributeBitsFoldedIntoGenericReadAndGenericWrite()` present, asserts both via `assertAll`. SUMMARY records the actual red output (`AssertionFailedError` on both new/widened assertions) before the production change landed — confirmed plausible against the diff shape. |
| 3 | Owner-only guarantee unchanged: exactly one ALLOW entry, one principal, no DENY, no inherit flags, floor widens by exactly two bits (not full control) | ✓ VERIFIED | `grep -c 'AclEntryType\.ALLOW'` = 1, `grep -cE 'AclEntryType\.DENY\|FILE_INHERIT\|DIRECTORY_INHERIT'` = 0, `grep -c 'AclEntryPermission\.'` = 10 (not 14). The six pre-existing shape tests in `OwnerOnlyAclTest` unchanged and green. |
| 4 | Widened floor reaches `bbj-em-validate-*.tmp` with no edit to `BbjRunActionBase` | ✓ VERIFIED | `git diff --stat` for `BbjProcessSecretEnv.java` and `BbjRunActionBase.java` since `342fb11` is empty — both files untouched; both temp-file callers route through the same `createOwnerOnlyFile`/`OwnerOnlyAcl` choke point, so the fix is inherited automatically. |
| 5 | Source guard pins the two bits inside the `OWNER_PERMISSIONS` initializer, scoped to `Set.of(` argument | ✓ VERIFIED | `BbjSecretArgvSourceGuardTest.theOwnerPermissionFloorGrantsTheExtendedAttributeBits()` (line 369) calls `extractBalancedCallArgument(text, "Set.of(")` then asserts both constant names appear within that extracted argument text, not merely in the file. |
| 6 | Failing regression tests observed red before the production change lands; guard's red observed by negative control | ✓ VERIFIED (per SUMMARY narrative, code-plausible) | SUMMARY records both red observations with actual test names/failure lines/counts (7 tests/2 failed pre-fix; 20 tests/1 failed under negative control). The described sequencing (RED commit `e6cf0a4` before GREEN commit `6cb9a34`, guard commit `f70f02c` after) is consistent with the actual commit order and messages in `git log`. |

### Prohibitions (80-05, all `verification: automated`)

| Prohibition | Evidence |
|-------------|----------|
| MUST NOT grant full control, add a second ACL entry, add a DENY entry, or set any inherit flag | `grep -c 'AclEntryPermission\.'` = 10 (not 14), `AclEntryType.ALLOW` count = 1, `DENY`/`FILE_INHERIT`/`DIRECTORY_INHERIT` count = 0 |
| MUST NOT touch the POSIX branch, its 23 pre-existing tests, `em-login.bbj`/`em-validate-token.bbj`, or the 19 pre-existing source guards | `git diff --stat 342fb11..HEAD` for `BbjProcessSecretEnv.java` is empty; `BbjSecretArgvSourceGuardTest.java` diff is +26/-0 (pure addition, confirmed via `git diff --numstat`); `bbj-vscode/tools/em-login.bbj` untouched (not in the commit diffs) |
| MUST NOT delete or weaken an existing assertion | `OwnerOnlyAclTest.java`'s six pre-existing shape assertions read byte-identical in structure to the prior verification's description; the floor assertion was widened (added two elements), not relaxed |

All three prohibitions hold on direct code/diff evidence — confirmed automated, not judgment-tier.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/.../lsp/OwnerOnlyAcl.java` | 10-permission floor including `READ_NAMED_ATTRS`/`WRITE_NAMED_ATTRS`, rationale Javadoc | ✓ VERIFIED | Read in full; matches plan exactly |
| `bbj-intellij/.../lsp/OwnerOnlyAclTest.java` | Widened floor assertion + new named regression test | ✓ VERIFIED | Read in full; both present, both green |
| `bbj-intellij/.../lsp/BbjSecretArgvSourceGuardTest.java` | 20th guard scoped to `Set.of(` initializer | ✓ VERIFIED | Read in full; guard present at line 369, scoped via `extractBalancedCallArgument` |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `OwnerOnlyAcl.java` (`OWNER_PERMISSIONS`) | `BbjProcessSecretEnv.java` (`createOwnerOnlyFile`) | both the createTempFile-attribute path and the setAcl fallback path read the same set | ✓ WIRED (no edit needed to `BbjProcessSecretEnv.java`; confirmed empty diff) |
| `BbjRunActionBase.java` (`bbj-em-validate-*.tmp` creation) | `BbjProcessSecretEnv.createOwnerOnlyFile` | same choke point | ✓ WIRED (no edit needed; confirmed empty diff) |

### Behavioral Spot-Checks / Test Re-Runs

| Test class | Command | Result | Status |
|------------|---------|--------|--------|
| `OwnerOnlyAclTest` | `./gradlew test --tests …OwnerOnlyAclTest --rerun` | 7/7, 0 failures, 0 errors (XML-confirmed) | ✓ PASS |
| `BbjProcessSecretEnvTest` | `./gradlew test --tests …BbjProcessSecretEnvTest --rerun` | 29/29, 0 failures, 0 errors (XML-confirmed) | ✓ PASS |
| `BbjSecretArgvSourceGuardTest` | `./gradlew test --tests …BbjSecretArgvSourceGuardTest --rerun` | 20/20, 0 failures, 0 errors (XML-confirmed) | ✓ PASS |
| Whole suite (orchestrator-run, 2026-09-05T08:02Z) | `./gradlew test --rerun` | 25 classes, 236 tests, 0 failures, 0 errors | ✓ PASS (regression confirmation for TOKEN-01/03/04, whose source is unchanged) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| TOKEN-01 | 80-01 | Fail-closed JWT expiry classification (#535) | ✓ SATISFIED | Unchanged since prior verification; no diff since `342fb11` |
| TOKEN-02 | 80-02, 80-05 (gap closure) | Owner-only temp files on POSIX and Windows, fail-closed otherwise (#536) | ✓ SATISFIED (code); Windows write-through recheck human-verified | `OwnerOnlyAcl.java` widened, `OwnerOnlyAclTest` (7), `BbjProcessSecretEnvTest` (29), `BbjSecretArgvSourceGuardTest` (20) — all fresh, 0 failures |
| TOKEN-03 | 80-03 | Non-keychain backend notice, isolated internal API (#552) | ✓ SATISFIED — confirmed by human UAT (`80-UAT.md` tests 2-4, all passed) | Code unchanged; UAT closed the loop |
| TOKEN-04 | 80-04 | Digest-keyed trust window, invalidated on store/delete (#542) | ✓ SATISFIED — confirmed by human UAT (`80-UAT.md` tests 5-6, all passed) | Code unchanged; UAT closed the loop |

No orphaned requirements — `REQUIREMENTS.md` maps exactly TOKEN-01 through TOKEN-04 to Phase 80 (lines 89-92, all "Complete"), and each of the five plans' `requirements:` field claims exactly one, with 80-05 re-claiming TOKEN-02 as a gap-closure plan. 1:1 match confirmed.

### Anti-Patterns Found

None. All three gap-closure files (`OwnerOnlyAcl.java`, `OwnerOnlyAclTest.java`, `BbjSecretArgvSourceGuardTest.java`) scanned for `TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER`/`TBD` — zero matches (grep exit code 1). Register check (`GHSA`/`SEC-\d`/`D-\d`) on the two files this plan actually touched in `lsp/` — zero matches. The single whole-file hit in `BbjSecretArgvSourceGuardTest.java` (line 19, a pre-existing class-level `GHSA-33x9-cpwv-xcv2` reference from an earlier phase) is confirmed via `git diff --numstat` to be outside this plan's +26/-0 diff — not a violation of D-19 for this plan.

### Human Verification Required

See frontmatter `human_verification` (1 item) — the Windows `icacls` DACL + write-through login recheck for TOKEN-02/#536/G-80-1. This is the acceptance recheck the gap-closure plan itself designates as pending: the code defect (missing `READ_NAMED_ATTRS`/`WRITE_NAMED_ATTRS`) is fixed and proven at the value-object/strategy/guard level (56/56 tests, 0 failures), but no host in this environment can execute the Windows ACL branch of `createOwnerOnlyFile` or confirm that BBj's actual `open()` call now succeeds. This is not a new gap — it is the same platform-only limitation flagged throughout 80-02 and 80-05, now narrowed to the one recheck that matters (whether the fix actually resolves the reported `!ERROR=18`).

The five other UAT items from the first verification pass (KeePass balloon, downgrade re-warn, settings-page action, Run-speedup, logout-reset) are **not** re-listed here: `80-UAT.md` already recorded `result: pass` for all five, and no source under TOKEN-01/03/04 changed since that confirmation.

### Gaps Summary

No gaps found in this pass. Gap G-80-1 (blocker, from the prior UAT round) is closed on the code side: `OwnerOnlyAcl.OWNER_PERMISSIONS` now covers the full `GENERIC_READ|GENERIC_WRITE` access mask Windows requires, the owner-only shape is bit-for-bit unchanged (one ALLOW entry, one principal, no DENY, no inherit flags), the POSIX branch and 19 pre-existing guards are untouched, and all 56 targeted tests plus the 236-test whole-suite run pass with 0 failures. The single remaining item — confirming on an actual Windows host that BBj's `open()` now succeeds against the widened ACE — cannot be established by any test in this repository and is correctly routed to human verification rather than claimed as passed or marked as a gap.

---

*Verified: 2026-09-05*
*Verifier: Claude (gsd-verifier)*
