---
phase: 78-build-test-foundation
plan: 03
subsystem: infra
tags: [gradle, fail-fast, intellij-plugin, junit, build-graph]

requires:
  - phase: 78-build-test-foundation
    provides: "Gradle daemon steered onto JDK 17 (78-01) and wrapper regenerated to 8.14.5 (78-02) — every JAVA_HOME=/opt/java/default ./gradlew invocation this plan proves against depends on both landing first"
provides:
  - "verifyLanguageServerBundle Gradle task: single execution-time guard that fails buildPlugin/prepareSandbox/runIde with a directed GradleException when ../bbj-vscode/out/language/main.cjs is missing or zero-length"
  - "Both main.cjs consumers (copyLanguageServer, prepareSandbox) wired to the single guard task via dependsOn — no duplicated check logic"
  - "JUnit source-guard regression test locking the guard's task name, dependsOn edge count, GradleException usage, remediation text, and execution-time ordering"
  - "One-line CLAUDE.md prerequisite note for the IntelliJ plugin build"
affects: [79, 80, 81, 82, 83]

actuals:
  tokens: 6000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Gradle execution-time-only guard task (doLast + outputs.upToDateWhen{false}), single task in front of two Copy-style consumers"
    - "gradle.taskGraph.hasTask() used inside doLast to scope a check's failure to the tasks whose purpose it actually protects, without touching the tasks that merely traverse the same dependency edge for unrelated reasons"
    - "Hand-built git blob (git hash-object -w + git update-index --cacheinfo) to stage one hunk of a file that also carries an unrelated uncommitted local hunk"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java
  modified:
    - bbj-intellij/build.gradle.kts
    - CLAUDE.md

key-decisions:
  - "D-09/D-10/D-11/D-12 followed as designed for the guard's shape and message content; the exact two dependsOn(verifyLanguageServerBundle) edges landed in copyLanguageServer's and prepareSandbox's registration blocks as specified."
  - "Discovered mid-execution (Rule 1 auto-fix, twice): the pre-existing build already made `test` transitively depend on copyLanguageServer's completion — first via processResources -> classes -> compileTestJava (fixed by moving copyLanguageServer's output outside sourceSets.main.output and having `jar` pull it in directly), then via intellij-platform-gradle-plugin's own test-sandbox composition (prepareTestSandbox -> composedJar -> instrumentedJar -> jar), which needs a fully-assembled plugin jar for ANY `test` run, bundle or no bundle. Both couplings pre-date this plan (confirmed against the pristine build.gradle.kts's own task graphs). Resolved by scoping the guard's throw to `gradle.taskGraph.hasTask(':buildPlugin' | ':prepareSandbox' | ':runIde')`, matching D-10's own text (\"only tasks that actually bundle the language server ... may fail\") precisely, while keeping both required dependsOn edges as literal, single-purpose wiring."
  - "CLAUDE.md carried a pre-existing uncommitted local 'Shell and File-Access Rules' hunk with no line overlap with the target IntelliJ build block; staged only the new one-sentence hunk via a hand-built git blob (git show HEAD:CLAUDE.md -> edit -> git hash-object -w -> git update-index --cacheinfo) so the maintainer's local hunk stayed untouched in the working tree and never entered the commit."

requirements-completed: [BUILD-03]

coverage:
  - id: D1
    description: "With main.cjs absent, ./gradlew buildPlugin exits non-zero and the What went wrong message names the absolute expected path, npm run build, and the CI download-artifact route"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "mv main.cjs aside; JAVA_HOME=/opt/java/default ./gradlew buildPlugin (exit 1, 'What went wrong' + absolute path + 'npm run build' + CI note all present)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A zero-length main.cjs is rejected by exactly the same check and the same message as an absent one"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "truncate main.cjs to 0 bytes; ./gradlew buildPlugin (exit 1, message byte-for-byte identical to the absent-file case)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No plugin distribution zip is produced by the failing run"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "verifyLanguageServerBundle fails before jar/prepareSandbox/buildPlugin execute; no new bbj-intellij-0.1.0.zip is written on the failing run"
        status: pass
    human_judgment: false
  - id: D4
    description: "With main.cjs absent, tasks, dependencies, test, help --task wrapper, and help --task updateDaemonJvm all still exit 0 — the check is execution-time only and never breaks a clean clone's wrapper or toolchain bootstrap"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "mv main.cjs aside; JAVA_HOME=/opt/java/default ./gradlew tasks && ./gradlew dependencies && ./gradlew test && ./gradlew help --task wrapper && ./gradlew help --task updateDaemonJvm (all exit 0)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Exactly one task performs the check, and both main.cjs consumers (copyLanguageServer, prepareSandbox) depend on it rather than carrying duplicated logic"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "grep -c 'dependsOn(verifyLanguageServerBundle)' build.gradle.kts == 2; single verifyLanguageServerBundle task registration"
        status: pass
    human_judgment: false
  - id: D6
    description: "With main.cjs restored, ./gradlew buildPlugin succeeds and the produced distribution zip contains an entry ending in lib/language-server/main.cjs"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "JAVA_HOME=/opt/java/default ./gradlew buildPlugin (BUILD SUCCESSFUL); unzip -l bbj-intellij-0.1.0.zip | grep lib/language-server/main.cjs"
        status: pass
    human_judgment: false
  - id: D7
    description: "A JUnit source-guard test fails if the check task, either dependency edge, or the directed message is removed from build.gradle.kts"
    requirement: "BUILD-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/.../BbjLanguageServerBundleSourceGuardTest.java (5 tests, all pass); scratch experiment confirmed bothConsumersDependOnTheSingleCheckTask() fails when a dependsOn edge is removed"
        status: pass
    human_judgment: false
  - id: D8
    description: "Only main.cjs is guarded; the build script never shells out to npm/Node to produce it; no plugin source under src/main/ changes; CLAUDE.md gains a one-line prerequisite note"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "grep for providers.exec|ProcessBuilder|commandLine in build.gradle.kts (none); git status --porcelain bbj-intellij/src/main (empty); grep 'main.cjs' CLAUDE.md IntelliJ block"
        status: pass
    human_judgment: false

duration: 52min
completed: 2026-09-04
status: complete
---

# Phase 78 Plan 03: Fail-Fast Language-Server Bundle Check Summary

**`./gradlew buildPlugin` on a clean clone now fails immediately with a directed `GradleException` naming the absolute expected path, the `npm run build` fix, and the CI artifact route when `bbj-vscode/out/language/main.cjs` is missing or empty — while `tasks`, `dependencies`, `test`, `wrapper`, and `updateDaemonJvm` all keep working unmodified, closing BUILD-03 / #517.**

## Performance

- **Duration:** ~52 min
- **Started:** ~2026-09-04T06:14:00Z
- **Completed:** 2026-09-04T07:06:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Registered `verifyLanguageServerBundle`, a single execution-time Gradle task (`doLast`, `outputs.upToDateWhen { false }`) that throws `GradleException` when `../bbj-vscode/out/language/main.cjs` is missing or zero-length, naming the absolute expected path, the one-line fix (`cd bbj-vscode && npm ci && npm run build`), and the CI `download-artifact` route.
- Wired both named `main.cjs` consumers — the `copyLanguageServer` registration and the `prepareSandbox` customisation — to `dependsOn(verifyLanguageServerBundle)`, with no duplicated check logic (D-09).
- **Found and fixed, twice, a real bug discovered only by actually running the build (Rule 1 auto-fix):** the pre-existing `build.gradle.kts` already made `./gradlew test` transitively depend on `copyLanguageServer`'s completion (first via `processResources -> classes -> compileTestJava`, then — after fixing that — via `intellij-platform-gradle-plugin`'s own test-sandbox composition, `prepareTestSandbox -> composedJar -> instrumentedJar -> jar`). Both couplings pre-date this plan. Fixed by (1) moving `copyLanguageServer`'s output outside `sourceSets.main.output` so `jar` pulls it in directly instead of through `processResources`, and (2) scoping the guard's throw to `gradle.taskGraph.hasTask(':buildPlugin' | ':prepareSandbox' | ':runIde')` — matching D-10's own text ("only tasks that actually bundle the language server ... may fail") exactly.
- Proved the full failure/success cycle end to end: missing bundle → `buildPlugin` fails with the directed message, no archive produced; zero-length bundle → identical failure and identical message; restored bundle → `buildPlugin` succeeds and the dist zip's `bbj-intellij/lib/language-server/main.cjs` entry and the composed jar's `language-server/main.cjs` classpath-resource fallback are both present.
- Proved the check is execution-time only: with the bundle absent, `tasks`, `dependencies`, `test`, `help --task wrapper`, and `help --task updateDaemonJvm` all exit 0 on `JAVA_HOME=/opt/java/default`.
- Added `BbjLanguageServerBundleSourceGuardTest` (5 `@Test` methods), mirroring the existing `*SourceGuardTest` pattern, asserting the guard task's presence, the exact dependency-edge count, `GradleException` usage, the remediation text, and execution-time ordering. Test source set now holds **8 classes / 101 tests, 0 failures.** Confirmed by a scratch experiment that removing either `dependsOn` edge turns the new test red.
- Added one sentence to `CLAUDE.md`'s IntelliJ plugin build block naming the `main.cjs` prerequisite, staged via a hand-built git blob so the maintainer's unrelated uncommitted "Shell and File-Access Rules" hunk stayed untouched in the working tree.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — a missing bundle produces one directed build failure** (tracer) — `ac8feaf` (feat)
   - Deviation fix (Rule 1, found during tracer re-verify): `94e4bf3` (fix) — decoupled `copyLanguageServer`'s output from `test`'s task graph (via `processResources`)
2. **Task 2: Prove the check is execution-time only, and that a zero-length bundle is rejected**
   - Deviation fix (Rule 1, found during Proof A): `eb7e43e` (fix) — scoped the guard's throw to packaging tasks only, resolving the deeper `intellij-platform-gradle-plugin` test-sandbox coupling
3. **Task 3: Lock the check with a source-guard test and note the prerequisite in CLAUDE.md** — `fa5395b` (test)

**Plan metadata:** commit pending (this commit — SUMMARY + state updates)

## Verbatim Failure Messages (D-11, success criterion 3)

### Absent-file case

```
* What went wrong:
Execution failed for task ':verifyLanguageServerBundle'.
> Missing or empty shared language-server bundle.

  Expected file: /home/coder/repos/bbj-language-server/bbj-vscode/out/language/main.cjs

  Fix: build bbj-vscode first:
      cd bbj-vscode && npm ci && npm run build

  In CI, this file is supplied by the download-artifact step rather than
  built by Gradle — do not add an npm/Node invocation here.
```

### Zero-length case

```
* What went wrong:
Execution failed for task ':verifyLanguageServerBundle'.
> Missing or empty shared language-server bundle.

  Expected file: /home/coder/repos/bbj-language-server/bbj-vscode/out/language/main.cjs

  Fix: build bbj-vscode first:
      cd bbj-vscode && npm ci && npm run build

  In CI, this file is supplied by the download-artifact step rather than
  built by Gradle — do not add an npm/Node invocation here.
```

**These two blocks are byte-for-byte identical** — one check, one message, satisfying D-09's "same check, same message" requirement for both the absent and zero-length cases.

## Clean-Clone Exit Codes (D-10, with `main.cjs` absent)

| Command | Exit |
|---|---|
| `JAVA_HOME=/opt/java/default ./gradlew tasks` | 0 |
| `JAVA_HOME=/opt/java/default ./gradlew dependencies` | 0 |
| `JAVA_HOME=/opt/java/default ./gradlew test` | 0 |
| `JAVA_HOME=/opt/java/default ./gradlew help --task wrapper` | 0 |
| `JAVA_HOME=/opt/java/default ./gradlew help --task updateDaemonJvm` | 0 |

## Restored-Build Evidence

- `JAVA_HOME=/opt/java/default ./gradlew buildPlugin` → `BUILD SUCCESSFUL`
- `unzip -l bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip | grep lib/language-server/main.cjs`:
  ```
    2261442  2026-09-04 06:37   bbj-intellij/lib/language-server/main.cjs
  ```
- Composed jar's classpath-resource fallback (`language-server/main.cjs`) also present:
  ```
          0  2026-09-04 06:37   language-server/
    2261442  2026-09-04 06:37   language-server/main.cjs
  ```

## JUnit Test/Class Counts

- **8 top-level test classes** (was 7 before this plan), **101 tests total** (was 96), 0 failures, 0 errors, 0 skipped.
- New class: `BbjLanguageServerBundleSourceGuardTest` — 5 tests, all pass.
- Scratch experiment: removed one `dependsOn(verifyLanguageServerBundle)` edge, re-ran the new class alone — `bothConsumersDependOnTheSingleCheckTask()` failed as expected (`AssertionFailedError`, expected 2 occurrences, found 1). Restored the file byte-for-byte identical afterward (`diff` confirmed) and re-ran the full suite green.

## Files Created/Modified

- `bbj-intellij/build.gradle.kts` — added `verifyLanguageServerBundle` task (execution-time `doLast`, `GradleException`, scoped via `gradle.taskGraph.hasTask`); wired `dependsOn(verifyLanguageServerBundle)` into `copyLanguageServer` and `prepareSandbox`; moved `copyLanguageServer`'s output to `build/language-server-bundle` (outside `sourceSets.main.output`); added a `jar` task customisation pulling that directory in as `language-server/`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java` — new; 5 `@Test` methods locking the guard's shape
- `CLAUDE.md` — one sentence added to the IntelliJ plugin build block (D-14); pre-existing uncommitted local "Shell and File-Access Rules" hunk left untouched

## Decisions Made

- Followed D-09/D-11/D-12 exactly for the guard's shape, message content, and scope (only `main.cjs`, never TextMate/tools).
- Discovered and fixed (Rule 1, twice) a pre-existing structural coupling between `test` and `copyLanguageServer` that the original plan's D-10 assumption did not anticipate: the standard Java plugin's `sourceSets.main.output` chain, and — after fixing that — `intellij-platform-gradle-plugin`'s own test-sandbox composition. Both couplings existed in the codebase before this plan (confirmed by dry-running the pristine `build.gradle.kts`'s `test` task graph, which already listed `copyLanguageServer`, `jar`, `instrumentedJar`, and `composedJar`). Resolved with `gradle.taskGraph.hasTask(':buildPlugin' | ':prepareSandbox' | ':runIde')`, which is the literal implementation of D-10's own carve-out text.
- Used a hand-built git blob (`git hash-object -w` + `git update-index --cacheinfo`) to stage only the CLAUDE.md sentence, keeping the maintainer's unrelated local hunk out of the commit — per the run's explicit staging instructions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] copyLanguageServer's dependsOn edge broke `test` via processResources/classes**
- **Found during:** Task 1 tracer feedback gate re-verification (before starting Task 2)
- **Issue:** `copyLanguageServer` fed `processResources`'s output directory (`build/resources/main/language-server`), and the standard Java plugin makes `classes`/`compileTestJava`/`test` transitively depend on `processResources`. Attaching `dependsOn(verifyLanguageServerBundle)` to `copyLanguageServer` therefore made `./gradlew test` fail with the bundle absent — directly violating the must-have truth that `test` must keep working on a clean clone.
- **Fix:** Moved `copyLanguageServer`'s `into()` target to `build/language-server-bundle` (outside `sourceSets.main.output`), and added a `jar` task customisation that pulls that directory in explicitly via its own `CopySpec`, preserving the classpath-resource fallback inside the jar without routing through `processResources`.
- **Files modified:** `bbj-intellij/build.gradle.kts`
- **Verification:** `./gradlew testClasses --dry-run` no longer lists `verifyLanguageServerBundle`/`copyLanguageServer`; `./gradlew buildPlugin --dry-run` still lists both; full missing-bundle and restored-bundle proofs re-run and passed.
- **Commit:** `94e4bf3`

**2. [Rule 1 - Bug] test still failed via intellij-platform-gradle-plugin's test-sandbox composition**
- **Found during:** Task 2 Proof A (clean-clone exit-code check)
- **Issue:** Even after fix #1, `./gradlew test` still exited 1 with the bundle absent. Root cause: `intellij-platform-gradle-plugin`'s `test` task depends on `prepareTestSandbox`, which needs the fully-composed plugin jar (`composedJar -> instrumentedJar -> jar`) to populate a functional test sandbox — a coupling baked into the plugin itself, confirmed present in the pristine `build.gradle.kts` (before this plan existed) via `git show HEAD~2:... | test --dry-run`.
- **Fix:** Scoped `verifyLanguageServerBundle`'s throw to fire only when `gradle.taskGraph.hasTask(':buildPlugin')`, `hasTask(':prepareSandbox')`, or `hasTask(':runIde')` is true for the current build invocation — matching D-10's explicit text that only these tasks (plus `processResources`, which no longer reaches the guard after fix #1) may fail.
- **Files modified:** `bbj-intellij/build.gradle.kts`
- **Verification:** Re-ran all five clean-clone commands (`tasks`, `dependencies`, `test`, `help --task wrapper`, `help --task updateDaemonJvm`) — all exit 0; re-ran the missing-bundle and restored-bundle `buildPlugin` proofs — unchanged, correct behavior preserved.
- **Commit:** `eb7e43e`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs discovered only through actually running the build, not visible from reading the code beforehand)
**Impact on plan:** Both fixes were necessary to satisfy an explicit must-have truth (`test` must keep working on a clean clone). Neither changes the guard's design intent, the two required `dependsOn` edges, or the shipped plugin's contents — both were confirmed unchanged (dist zip and composed jar both still carry `main.cjs` when present). No scope creep: both fixes are confined to `bbj-intellij/build.gradle.kts`.

## Issues Encountered

A stale `build/resources/main/language-server/main.cjs` leftover from earlier session runs (written before fix #1 moved the output directory) caused a transient "duplicate entry" failure in `jar` immediately after fix #1 landed. Removed the stale build-output directory (not a repository file) and re-ran; resolved cleanly. No repository change needed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- BUILD-03 (#517) is closed: a clean clone without `bbj-vscode/out/language/main.cjs` gets one directed error naming the missing file and the fix, instead of a hollow plugin archive; the guard is locked by a JUnit source-guard test.
- All three plans of Phase 78 (Build & Test Foundation) are now complete: 78-01 (daemon JVM / JDK 17 toolchain), 78-02 (Gradle wrapper 8.14.5), 78-03 (fail-fast bundle check). Every subsequent `./gradlew` invocation in phases 79-83 can run directly with `JAVA_HOME=/opt/java/default`.
- `bbj-vscode/out/language/main.cjs` was moved aside and restored multiple times during this plan's proofs; confirmed present and correctly sized (2,261,442 bytes) at completion.

---
*Phase: 78-build-test-foundation*
*Completed: 2026-09-04*

## Self-Check: PASSED

- `bbj-intellij/build.gradle.kts` (verifyLanguageServerBundle task, 2 dependsOn edges) — FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java` — FOUND
- `CLAUDE.md` (main.cjs prerequisite note) — FOUND
- Commit `ac8feaf` (Task 1) — FOUND
- Commit `94e4bf3` (Task 1 deviation fix) — FOUND
- Commit `eb7e43e` (Task 2 deviation fix) — FOUND
- Commit `fa5395b` (Task 3) — FOUND
- `bbj-vscode/out/language/main.cjs` restored, 2,261,442 bytes — FOUND
