---
phase: 94-em-login-run-action-consolidation
plan: 01
subsystem: intellij
tags: [intellij, run-actions, em-login, plugin-path-resolution, java, junit5]

requires:
  - phase: 93-composer-robustness-consolidation
    provides: D-11/D-12 source-guard re-pointing conventions (not needed here — no guard broke)
provides:
  - "One BbjToolScriptResolver resolving all three bundled tool scripts (web.bbj, em-login.bbj, em-validate-token.bbj)"
  - "The seam EM-03's EmTokenValidator (plan 02) consumes for its em-validate-token.bbj path"
affects: [94-02-em-token-validator-relocation, 94-03-em-login-and-run-action-cleanup]

actuals:
  tokens: 3392
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "BbjToolScriptResolver follows the BbjInteropPortCache/BbjNodeVersionCache seam convention exactly: public final class, nested @FunctionalInterface (PluginPathResolver), public static final SESSION wired by method reference, package-private constructor for test injection"
    - "Deliberately stateless/uncached seam class (no ConcurrentHashMap, no memoization) — documented as a conscious deviation from the cache classes this shape is borrowed from, since a per-launch Files.exists check needs no memoization and there is nothing for concurrent callers to race on"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjToolScriptResolver.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

key-decisions:
  - "Task 1 (tracer) wired only the web.bbj call site end-to-end and ran the full targeted verify before Task 2 expanded to the remaining two call sites — per the plan's tracer/auto task split."
  - "BbjEMLoginAction's now-unused PluginManager/PluginId imports were removed as part of retiring getEMLoginBbjPath(), keeping the findEnabledPlugin literal confined to exactly two src/main files (BbjToolScriptResolver.java and the deliberately-excluded BbjLanguageServer.java)."

requirements-completed: [EM-05]

coverage:
  - id: D1
    description: "One BbjToolScriptResolver resolves all three bundled tool scripts (web.bbj, em-login.bbj, em-validate-token.bbj); three near-identical private lookups deleted from BbjRunActionBase and BbjEMLoginAction"
    requirement: "EM-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java#aPresentScriptResolvesToItsAbsolutePath"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java#allThreeScriptNamesResolveUnderTheSameToolsDirectory"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java#aMissingScriptReturnsNull"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java#aNullPluginRootReturnsNullWithoutTouchingTheFilesystem"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java#aThrowingSeamReturnsNullRatherThanPropagating"
        status: pass
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test (whole suite)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No pre-existing guard regressed (BbjSecretArgvSourceGuardTest, OffEdtDispatchSourceGuardTest, Lsp4ijImportAllowlistTest, BbjRunActionConfigPathSourceGuardTest, EmTokenTrustWindowSourceGuardTest all still pass unmodified — this plan re-points no guard)"
    requirement: "EM-05"
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --tests \"*.BbjSecretArgvSourceGuardTest\" --tests \"*.OffEdtDispatchSourceGuardTest\" --tests \"*.Lsp4ijImportAllowlistTest\" --tests \"*.BbjRunActionConfigPathSourceGuardTest\" --tests \"*.EmTokenTrustWindowSourceGuardTest\""
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-18
status: complete
---

# Phase 94 Plan 01: BbjToolScriptResolver Consolidation Summary

**One `BbjToolScriptResolver` (BbjInteropPortCache seam shape) now resolves `web.bbj`, `em-login.bbj` and `em-validate-token.bbj`, retiring three near-identical private plugin-path lookups across `BbjRunActionBase` and `BbjEMLoginAction`.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-18T22:14:00Z (approx.)
- **Completed:** 2026-09-18T22:33:56Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- New `BbjToolScriptResolver` class (nested `@FunctionalInterface PluginPathResolver`, `SESSION` field, package-private constructor) reproduces the exact resolve-or-null contract of the three retired methods, with zero `import com.intellij.` statements so plain JUnit 5 can exercise it.
- `BbjToolScriptResolverTest` covers all four behavior cases: present script → path, missing script → null, null plugin root → null (filesystem never touched), throwing seam → null.
- `BbjRunActionBase.getWebBbjPath()` and `getEmValidateBbjPath()` deleted; `buildWebRunCommandLine` and `validateTokenServerSide` now call `BbjToolScriptResolver.SESSION.resolveToolScript(...)`.
- `BbjEMLoginAction.getEMLoginBbjPath()` deleted; `performLogin` now calls the same resolver for `em-login.bbj`. Now-unused `PluginManager`/`PluginId` imports removed.
- `findEnabledPlugin` now appears in exactly two `src/main` files: `BbjToolScriptResolver.java` and the deliberately-excluded `BbjLanguageServer.java` (D-07) — proving three of the four lookups are gone.
- Whole `bbj-intellij` JUnit suite green: 988 tests, 0 failures, 0 errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: One resolver, one seam, wired end-to-end through the web.bbj path** - `5535b0db` (feat, tracer)
2. **Task 2: Convert the remaining two call sites and retire their lookups** - `5162571b` (feat)

_Task 1 was `type="tracer"`: after committing, its `<verify>` was re-run end-to-end (auto mode active per `workflow._auto_chain_active`), passed, and Task 2 proceeded to expansion — no checkpoint needed._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjToolScriptResolver.java` - the shared resolver, seam-shaped per `BbjInteropPortCache`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java` - plain JUnit 5 coverage of all four behavior cases
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - `getWebBbjPath()` and `getEmValidateBbjPath()` deleted; two call sites converted
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` - `getEMLoginBbjPath()` deleted; one call site converted; unused imports removed

## Decisions Made

- Followed the `BbjInteropPortCache` seam convention verbatim per the plan's `<interfaces>` block — no fourth shape invented.
- Kept the resolver deliberately stateless and uncached, per the plan's EM-05 concurrency truth: two concurrent callers resolve independently and nothing is left behind on interruption.
- Removed `BbjEMLoginAction`'s now-dangling `PluginManager`/`PluginId` imports as an in-scope cleanup of the method being deleted, not a separate deviation — this is what makes the `findEnabledPlugin` two-file acceptance criterion hold exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`BbjToolScriptResolver.SESSION.resolveToolScript("em-validate-token.bbj")` is ready for plan 02's `EmTokenValidator` to consume for its script path, per D-09's ordering rationale. `BbjLanguageServer.resolveServerPath()` remains untouched (D-07). No guard needed re-pointing in this plan; plan 02's move of `validateTokenServerSide`/`validateTokenTrusted` off `BbjRunActionBase` will re-point `BbjSecretArgvSourceGuardTest` and `EmTokenTrustWindowSourceGuardTest` as documented in `94-CONTEXT.md` D-08.

---
*Phase: 94-em-login-run-action-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

- `[ -f bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjToolScriptResolver.java ]` → FOUND
- `[ -f bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java ]` → FOUND
- `git log --oneline --all --grep="94-01"` → 2 commits found (`5535b0db`, `5162571b`)
- Task 1 acceptance criteria: all 6 PASS (zero `import com.intellij.`; exactly one `@FunctionalInterface`/`SESSION`/constructor; zero `getWebBbjPath` in base; exactly one `resolveToolScript(` call plus `webRunnerDir`/`setWorkDirectory(` retained; test asserts non-null/null for all 4 cases; test never references `BbjToolScriptResolver.SESSION` as a literal)
- Task 2 acceptance criteria: all 5 PASS (zero `getEmValidateBbjPath`/`lib/tools` in base; zero `getEMLoginBbjPath`/`lib/tools` in `BbjEMLoginAction`; `toRealPath()`/`Files.isExecutable(` still present; `findEnabledPlugin` in exactly 2 `src/main` files; exactly one `executeOnPooledThread(() -> performLogin(project))` and one `assertIsNonDispatchThread()`)
- Plan-level `<verification>`: whole suite green (988 tests, 0 failures, 0 errors); all four re-run guard tests pass; `findEnabledPlugin` literal count confirmed at 2
- Register check: `git diff` for both commits scanned for `EM-0[0-9]`, `D-0[0-9]`, `C-[0-9]+`, `CR-[0-9]+` — no matches
