---
phase: 86-intellij-interop-settings-targeted-refresh
fixed_at: 2026-09-07T15:28:39Z
iteration: 1
fix_scope: critical_warning
review_path: .planning/phases/86-intellij-interop-settings-targeted-refresh/86-REVIEW.md
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 86: Code Review Fix Report

**Fixed at:** 2026-09-07T15:28:39Z
**Source review:** `.planning/phases/86-intellij-interop-settings-targeted-refresh/86-REVIEW.md`
**Iteration:** 1
**Fix scope:** critical_warning (CR-01, WR-01, WR-02; IN-01 out of scope)

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

**Note on isolation:** `workflow.use_worktrees` is `false` for this project, so all edits and
commits below were made directly on `main` in the primary checkout (no isolated worktree was
created), per the documented opt-out.

## Fixed Issues

| ID | Title | Status | Commit |
|----|-------|--------|--------|
| CR-01 | Auto-detect silently turns itself back off on the next IDE restart | fixed: requires human verification | `daf975e3` |
| WR-01 | Refresh Java Classes' bounded wait can take up to ~2x its documented timeout | fixed: requires human verification | `fa4605f3` |
| WR-02 | `Configurable.reset()` performs synchronous filesystem I/O on the EDT | fixed (documented-justification option, partially addressed) | `2eb14219` |

### CR-01: Auto-detect silently turns itself back off on the next IDE restart after a legitimate "re-enable" flow

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLoadStateTest.java` (new)
**Commit:** `daf975e3`
**Applied fix:** Added a persisted `javaInteropSettingsMigrated` boolean (default `false`, so the
IntelliJ serializer omits it for every install that predates this fix, exactly matching how the
pre-existing `javaInteropPortAutoDetect` default is omitted) to `BbjSettings.State`. `loadState`
now only invokes `InteropPortSettings.migratedAutoDetect(...)` when
`!state.javaInteropSettingsMigrated`, and sets the flag `true` immediately afterward inside that
same guarded block — so the inference still runs, unconditionally re-derived, exactly once per
installation the way the original javadoc always claimed, and never again after that. The pure
decision function `InteropPortSettings.migratedAutoDetect` itself was left untouched (its own unit
tests in `InteropPortSettingsTest` still pin the five-combination truth table as documented
first-upgrade inference).

Added `BbjSettingsLoadStateTest` (new file — no existing test exercised `BbjSettings.loadState`
directly) with four cases: (1) a never-migrated install with a signal-carrying port still infers
`autoDetect=false` and marks itself migrated; (2) a never-migrated install with no port signal
keeps `autoDetect=true`; (3) the regression case from the review — `autoDetect=true`, `port=6001`,
`migrated=true` — survives `loadState` with `autoDetect` still `true`; (4) calling `loadState`
twice never re-derives the flag a second time. `EffectiveInteropPortSourceGuardTest` (asserting
`InteropPortSettings.migratedAutoDetect(` appears exactly once in `BbjSettings.java`) and the
existing `InteropPortSettingsTest` both still pass unmodified.

Marked **requires human verification**: this is a persistence/state-machine logic fix (gating a
migration on a new flag) — compile and unit-test verification confirm the code is syntactically
correct and the new/existing tests pass, but the tests cannot fully substitute for confirming
actual `BbjSettings.xml` round-trip behavior in a live IDE session across a real restart.

### WR-01: Refresh Java Classes' bounded wait can take up to ~2x its documented timeout

**Files modified:**
`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/BbjRefreshJavaClassesActionSourceGuardTest.java`
**Commit:** `fa4605f3`
**Applied fix:** Computed a single `deadlineNanos` up front inside the `BoundedRefreshCall`
lambda (`System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds)`) and added a private
`remainingSeconds(long deadlineNanos)` helper that returns the seconds left until that deadline,
floored at zero via `Math.max(0, ...)`. Both `.get(...)` calls — the proxy lookup and
`refreshJavaClasses()` — now consume `remainingSeconds(deadlineNanos)` instead of the full
`seconds` budget each. A stage that starts after the deadline has already passed gets a
zero-length wait and fails fast with `TimeoutException`, which `JavaClassesRefreshFlow.run`
already classifies as `Outcome.TIMED_OUT` — matching the guidance to "fail fast as TIMED_OUT"
rather than let remaining time go negative. `JavaClassesRefreshFlow` itself (the pure, plain-JUnit
tested outcome classifier) was left unchanged; no natural seam existed there to exercise the
two-stage timing split, since the flow class is deliberately unaware of the action's two internal
stages.

Added a source-guard test (`theTwoBoundedWaitsShareOneDeadlineRatherThanEachGettingTheFullBudget`)
to `BbjRefreshJavaClassesActionSourceGuardTest` — the existing convention for pinning structural
properties of this exact file that a live IDE session cannot observe — asserting exactly one
`long deadlineNanos =` declaration and exactly two `remainingSeconds(deadlineNanos)` call sites, so
a future edit cannot silently reintroduce two independently-budgeted `seconds, TimeUnit.SECONDS`
waits.

Marked **requires human verification**: this is a timing/concurrency logic fix. Unit and
source-guard tests confirm the code compiles and the structural invariant holds, but the actual
end-to-end timing behavior (a slow-but-eventually-successful proxy lookup followed by a slow
request) is not exercised by a deterministic test in this codebase and should be manually
sanity-checked against a live or simulated slow composer server if that scenario matters in
practice.

### WR-02: `Configurable.reset()` performs synchronous filesystem I/O on the EDT

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java`
**Commit:** `2eb14219`
**Applied fix:** Chose the **documented-justification** option rather than relocating the lookup.
`BbjSettingsComponent`'s debounced lookup scheduler (`Scheduler lookupScheduler`, an
`AlarmScheduler`) is a private field with no public seam for an external caller like
`BbjSettingsConfigurable` to reach into, and `reset()` is expected by the platform to have
populated the dialog's fields before it becomes visible — pushing this one lookup to a background
thread would mean displaying a placeholder port value and then asynchronously replacing it a
moment later, introducing a new race between that callback firing and the user editing the field
or clicking Cancel before it resolves, in a file already pinned by several strict source-guard
tests. Given the review's own characterization of this as "a single cached stat per dialog open,
not a scan, so the cost is low," this was judged not "reasonably contained" enough to justify that
risk. Added an inline comment at the `BbjInteropPortCache.SESSION.lookup(...)` call site explaining
why the stat-keyed cache's cost profile (one `File.isFile()`/`lastModified()`/`length()` stat per
dialog open, `Properties#load` only on a changed stat) makes running it inline on the EDT
acceptable, and why the async alternative was rejected. `EffectiveInteropPortSourceGuardTest`
(which counts exactly one `BbjInteropPortCache.SESSION.lookup(` in this file) and
`BbjSettingsComponentSourceGuardTest` both still pass unmodified.

**Status: partially addressed.** The underlying anti-pattern the finding names (EDT filesystem
I/O in `reset()`) is still present in the source; only the justification for leaving it in place
is now documented in-code. No relocation to a background thread was attempted.

## Skipped Issues

None in scope — all three findings (CR-01, WR-01, WR-02) were addressed. IN-01 was excluded from
`fix_scope: critical_warning` and left untouched by design (see below).

### IN-01: `getJavaInteropPort()`'s fallback duplicates the `DEFAULT_PORT` literal instead of referencing the constant

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:461,466`
**Reason:** skipped-out-of-scope — `fix_scope` for this run is `critical_warning`, which excludes
Info-severity findings. Not attempted.

## Verification

Ran the full IntelliJ unit test suite in the main checkout (`bbj-intellij/`, JDK 17
auto-provisioned by the Gradle toolchain):

```
cd bbj-intellij && ./gradlew test --tests 'com.basis.bbj.intellij.*' --console=plain
```

Result: **BUILD SUCCESSFUL** — 674 tests run, 0 failures, 0 errors (aggregated from
`build/test-results/**/*.xml`). This included both new/modified test files
(`BbjSettingsLoadStateTest`, `BbjRefreshJavaClassesActionSourceGuardTest`) and every pre-existing
suite listed in `86-REVIEW.md`'s `files_reviewed_list`, run from the same tree the commits above
landed in — the numbers are directly reproducible from `main` as committed.

Each of the three fixes was also compiled (`./gradlew compileJava compileTestJava`) and verified
against its own targeted test subset before being committed, per the per-finding rollback
protocol; no rollback was needed for any finding.

---

_Fixed: 2026-09-07T15:28:39Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
