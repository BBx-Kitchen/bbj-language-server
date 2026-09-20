---
phase: 94-em-login-run-action-consolidation
fixed_at: 2026-09-19T13:23:58Z
review_path: .planning/phases/94-em-login-run-action-consolidation/94-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 3
status: all_fixed
---

# Phase 94: Code Review Fix Report

**Fixed at:** 2026-09-19T13:23:58Z
**Source review:** .planning/phases/94-em-login-run-action-consolidation/94-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (`fix_scope: critical_warning` — Critical + Warning tiers only): 1
- Fixed: 1
- Skipped: 3 (IN-01, IN-02, IN-03 — all Info-tier, out of scope for `critical_warning` fix_scope)

**Note:** This report supersedes an earlier `94-REVIEW-FIX.md` from a prior review round
(2026-09-19T08:19Z), whose WR-01/WR-02 findings do not correspond to the current review's
findings. That content has been fully replaced.

**Isolation:** Editing, verification, and commit were performed directly against `main` in
the primary working tree (no isolated worktree was set up for this run).

## Fixed Issues

### WR-01: A missing `em-validate-token.bbj` in the plugin bundle is indistinguishable from an invalid token, and can loop the user through login forever

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
**Commit:** `46dc128c`
**Applied fix:** `buildWebRunCommandLine` now checks `emValidatePath == null` explicitly right
after resolving `em-validate-token.bbj` via `BbjToolScriptResolver.SESSION.resolveToolScript(...)`,
calling `logError(project, "em-validate-token.bbj not found in plugin bundle")` and returning
`null` before the path can reach `EmTokenValidator.SESSION.validateTokenTrusted(...)`. This
mirrors the existing sibling guard for `webBbjPath` eleven lines above (missing `web.bbj`
already aborted with a dedicated error), closing the gap where a broken plugin bundle
previously presented to the user as an ordinary invalid/expired token, triggering an
unrecoverable delete-token / re-login / fail-again loop.

**Verification:** Re-read the modified method (Tier 1 — fix text present, surrounding logic
and control flow intact, matches the reviewer's suggested fix and the file's existing
`logError(...); return null;` idiom). Ran the full `bbj-intellij` Gradle test suite
(`./gradlew test`) as Tier 2 — `BUILD SUCCESSFUL`, all 114 JUnit test-result files report
0 failures / 0 errors, including the existing `BbjRunAction*` and `EmTokenTrustWindow*`
guard/behavior tests that exercise this method. This is a straightforward defensive
null-check added ahead of an existing call, matching an established sibling pattern in the
same method — not a logic change requiring additional human verification.

## Skipped Issues

### IN-01: `ProcessOutput` from the EM login launch is captured but never inspected

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:150-151`
**Reason:** Out of scope for `critical_warning` fix_scope. IN-01 is Info-tier; not attempted.
**Original issue:** `ProcessOutput output = handler.runProcess(15000);` is assigned but never
read afterward, so a timeout or non-zero exit is not distinguished from a script that
legitimately produced no output; the same gap exists in `EmTokenValidator.runValidationScript`.

### IN-02: Broad `catch (Exception ignored)` around `toRealPath()` still swallows all resolution failures

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:112`
**Reason:** Out of scope for `critical_warning` fix_scope. IN-02 is Info-tier; not attempted.
**Original issue:** `catch (Exception ignored)` is broader than the `IOException` that
`toRealPath()` actually declares, so an unrelated `SecurityException` or `RuntimeException`
would be silently absorbed, though the reviewer notes the subsequent
`Files.isExecutable(bbjPath)` check still fails closed and reports a clear error.

### IN-03: Source-guard test scaffolding is duplicated across four test files

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java:44-74`,
`EmLoginTempFileCleanupSourceGuardTest.java:56-86`, `EmTokenTrustWindowSourceGuardTest.java:37-94`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java:71-86,450-476,478-486`
**Reason:** Out of scope for `critical_warning` fix_scope. IN-03 is Info-tier; not attempted.
**Original issue:** Four source-guard test classes each independently redefine near-identical
private helpers (`readSource`, `countOccurrences`, `extractMethodBody`), which is copy-pasted
boilerplate that could drift if one copy is fixed for an edge case and the others are not.

---

_Fixed: 2026-09-19T13:23:58Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
