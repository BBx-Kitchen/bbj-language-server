---
phase: 94-em-login-run-action-consolidation
fixed_at: 2026-09-19T08:19:20Z
review_path: .planning/phases/94-em-login-run-action-consolidation/94-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 1
status: all_fixed
---

# Phase 94: Code Review Fix Report

**Fixed at:** 2026-09-19T08:19:20Z
**Source review:** .planning/phases/94-em-login-run-action-consolidation/94-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 2
- Fixed: 2
- Skipped: 1 (IN-01, out of scope for `critical_warning` fix_scope)

**Isolation:** All edits, verification, and commits were made in an isolated git worktree
(`gsd-reviewfix/94-768963`, branched from `main`), then fast-forward-merged back into `main`
by the cleanup tail after this report was written. Test verification (below) ran inside that
same worktree checkout, not the main checkout.

## Fixed Issues

### WR-02: Unguarded `NullPointerException` risk on `file.getParent()` in the shared web-run builder

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
**Commit:** dc240d10
**Applied fix:** `buildWebRunCommandLine`'s working-directory computation now captures
`file.getParent()` into a local, checks it for `null`, and if null calls the existing
`logError(project, ...)` helper and returns `null` — matching the exact
`logError(...); return null;` shape already used at the method's three sibling guards
(missing `web.bbj`, missing token after re-prompt, missing config path). Callers already
handle a `null` return correctly (`actionPerformed` checks `cmd == null` before proceeding),
so no caller changes were needed.

**Verification:** Re-read the modified method (Tier 1 — fix present, surrounding code
intact). Ran the full `bbj-intellij` Gradle test suite (Tier 2 equivalent for Java, since no
lightweight syntax-only checker applies) both narrowly (the `actions`/`lsp` guard test
classes that assert structural properties of this same method body, including
`BbjSecretArgvSourceGuardTest`, `EmTokenTrustWindowSourceGuardTest`, and
`BbjRunActionConfigPathSourceGuardTest`) and as the full module suite — all 114 test classes
passed with 0 failures/0 errors. This is a straightforward defensive null-check matching an
established sibling pattern in the same method, not a logic change requiring additional
human verification.

### WR-01: Tautological assertion in the new temp-file-cleanup source guard

**Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java`
**Commit:** 1032030b
**Applied fix:** Rewrote `theCreationPrecedesTheLaunchTry()` so `launchTryIndex` is located
independently of `creationIndex` — anchored to the subprocess run instead
(`body.lastIndexOf("try {", runProcessIndex)`, i.e. the nearest `try {` at or before
`runProcess(15000)`) rather than chained off `creationIndex` via
`body.indexOf("try {", creationIndex)`. The prior chained search made the final
`assertTrue(creationIndex < launchTryIndex, ...)` incapable of failing once the
precondition `launchTryIndex >= 0` passed, since `String.indexOf(str, fromIndex)` can only
return an index `>= fromIndex`. With the new anchor, a regression that moves the owner-only
creation inside the launch's existing `try` (collapsing the two `try` blocks) pushes
`creationIndex` past the anchor, and the ordering assertion now genuinely fails. The
adjacent test `theSubprocessRunSitsBetweenTheLaunchTryAndTheFinally`, which uses the same
chained-indexOf idiom but was not flagged by the review (its own assertions are not
tautological), was left untouched — no shared helper was introduced, so its semantics are
unchanged.

**Verification:** Re-read the modified test method (Tier 1). Ran the specific test class
(`EmLoginTempFileCleanupSourceGuardTest`) — all 5 tests passed (0 failures/0 errors) — and
the full `bbj-intellij` module suite afterward, also 0 failures/0 errors across all 114
test classes.

## Skipped Issues

### IN-01: Broad `catch (Exception ignored)` around `toRealPath()` masks legitimate I/O failures

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:112`
**Reason:** Out of scope. `fix_scope` for this run is `critical_warning`; IN-01 is an Info-tier
finding and was explicitly excluded from this run's scope per the task instructions. Not
attempted.
**Original issue:** `Path bbjPath = Path.of(bbjBin); try { bbjPath = bbjPath.toRealPath(); }
catch (Exception ignored) {}` catches `Exception` rather than the narrower `IOException`
that `toRealPath()` declares, silently swallowing unchecked exceptions (e.g.
`SecurityException`, `InvalidPathException`) with no diagnostic. Low risk since the
subsequent `Files.isExecutable(bbjPath)` check still fails closed, but makes debugging a
misconfigured BBj Home harder than necessary.

---

_Fixed: 2026-09-19T08:19:20Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
