---
phase: 78-build-test-foundation
fixed_at: 2026-09-04T07:52:17Z
review_path: .planning/phases/78-build-test-foundation/78-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 78: Code Review Fix Report

**Fixed at:** 2026-09-04T07:52:17Z
**Source review:** .planning/phases/78-build-test-foundation/78-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (fix_scope: critical_warning — CR-01, WR-01, WR-02; IN-01/IN-02 out of scope)
- Fixed: 3
- Skipped: 0

**Verification environment:** `workflow.use_worktrees=false` — all edits, gradle runs, and commits ran directly in the main checkout (`/home/coder/repos/bbj-language-server`, branch `main`), not an isolated worktree. All gate runs below (and their timings/task-graph output) are reproducible from this same tree.

## Fixed Issues

### CR-01: Fail-fast guard does not cover `./gradlew build`/`assemble`/`jar`

**Files modified:** `bbj-intellij/build.gradle.kts`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java`
**Commit:** `cca5343`
**Applied fix:** Widened `verifyLanguageServerBundle`'s `packagingRequested` condition in `build.gradle.kts` to also check `gradle.taskGraph.hasTask(":assemble")` and `gradle.taskGraph.hasTask(":build")`, alongside the existing `:buildPlugin`/`:prepareSandbox`/`:runIde` checks. `:jar` was deliberately left out per the reviewer's note — `./gradlew test` alone already reaches `:jar` via `prepareTestSandbox -> composedJar -> instrumentedJar -> jar`, so adding `:jar` to the guard would break standalone `test` on a clean clone. Added a new JUnit test (`packagingConditionCoversBuildAndAssembleAsWellAsBuildPlugin`) to `BbjLanguageServerBundleSourceGuardTest` asserting the widened condition, so a future regression turns the test suite red.

**Empirical verification performed** (per phase-context constraints, from `/home/coder/repos/bbj-language-server/bbj-intellij` with `JAVA_HOME=/opt/java/default`, the host default JDK — never a JDK 17 override):
1. `./gradlew build --dry-run` — confirmed `:build`'s task graph includes `:verifyLanguageServerBundle` -> `:copyLanguageServer` -> `:jar` -> `:assemble` -> `:build` in sequence; no configuration-time regression.
2. Moved `bbj-vscode/out/language/main.cjs` aside (to scratch, outside the repo tree) and ran `./gradlew build`: **BUILD FAILED** at `:verifyLanguageServerBundle` with the directed "Missing or empty shared language-server bundle... Fix: build bbj-vscode first" message — confirming the gap is closed.
3. With the bundle still absent, ran `./gradlew --offline test`: **BUILD SUCCESSFUL** (18 actionable tasks, all passing) — confirming D-10 (`test` must keep working without the bundle on a clean clone) is not regressed.
4. Restored `bbj-vscode/out/language/main.cjs` from scratch and confirmed it is back with its original size (2,261,442 bytes) and original SHA-256 (`193f927b0a83a6b56ed28e7806f71032504cf0e5bb14dcb652cff833f3f5ba30`) — the gitignored artifact other phases need was not lost.
5. Ran `./gradlew --offline test` again with the bundle restored: **BUILD SUCCESSFUL**, all 6 tests in `BbjLanguageServerBundleSourceGuardTest` passed (0 failures), confirmed via `build/test-results/test/TEST-com.basis.bbj.intellij.lsp.BbjLanguageServerBundleSourceGuardTest.xml`.
6. Ran `./gradlew build` with the bundle present: **BUILD SUCCESSFUL** — normal packaging is unaffected.

### WR-01: CLAUDE.md's fail-fast note names `buildPlugin`, but the example command right above it is `build`

**Files modified:** `CLAUDE.md`
**Commit:** `ae5d4c2`
**Applied fix:** Updated CLAUDE.md's IntelliJ build section note from "`./gradlew buildPlugin` fails fast if `bbj-vscode/out/language/main.cjs` is missing" to "`./gradlew build` (or `buildPlugin`) fails fast if `bbj-vscode/out/language/main.cjs` is missing" — now accurate given CR-01's widened guard, and aligned with the `./gradlew build` command shown directly above it in the same section.

### WR-02: `checkRunsAtExecutionTimeNotConfigurationTime` binds "doLast" to the wrong task if another `doLast` is added earlier in the file

**Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java`
**Commit:** `b7fb717`
**Applied fix:** Rewrote `checkRunsAtExecutionTimeNotConfigurationTime` to slice `text` from `verifyLanguageServerBundle`'s registration to the next top-level `by tasks.registering` declaration (or end of file), then search for `doLast` only within that scoped substring — rather than the first `doLast` anywhere in the whole file. The assertion is now bound to `verifyLanguageServerBundle`'s own block regardless of whether an earlier-registered task later gains its own `doLast`.

**Verification:** `./gradlew --offline test` run after each incremental change (three separate runs across CR-01, WR-02, and the final combined state) — all green, 18/18 actionable tasks succeeded each time, and the guard test's full 6-test suite (0 failures) confirmed via the JUnit XML report.

## Skipped Issues

None — all in-scope findings (CR-01, WR-01, WR-02) were fixed. IN-01 and IN-02 were out of scope for this run (`fix_scope: critical_warning`) and were not attempted.

---

_Fixed: 2026-09-04T07:52:17Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
