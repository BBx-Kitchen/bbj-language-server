---
phase: 91-language-server-responsiveness
plan: 05
subsystem: language-server
tags: [java-interop, circuit-breaker, document-rebuild, vitest]

# Dependency graph
requires: ["91-03"]
provides:
  - "java-class-reload.ts: JavaClassReloadServices interface and reloadClasspathAndRecheckDocuments(services), the classpath/implicit-imports reload plus one-time document re-check shared by Refresh Java Classes and interop recovery, importing nothing from main.ts"
  - "main.ts: onConnectionRecovered wiring deferred through javaRecoveryPending until the one-shot first-Validated build phase, and reloadJavaClassesAndRevalidate() rebuilt on top of the shared helper"
  - "test/java-class-reload.test.ts: 3 regression tests for #504 (helper call-order/skip-when-empty, and an end-to-end fake-peer recovery test)"
affects: []

actuals:
  tokens: 3924
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A reload-and-recheck helper is extracted into its own file with a narrow Pick<...>-based services interface, so a caller (main.ts) can compose it from live services while a test can pass plain vi.fn() stand-ins with no service-container setup"
    - "A recovery reported before the first workspace build completes is captured in a boolean flag and drained inside the existing one-shot first-Validated block, so a cold-start race can never turn into a second, competing rebuild trigger"

key-files:
  created:
    - bbj-vscode/src/language/java-class-reload.ts
    - bbj-vscode/test/java-class-reload.test.ts
  modified:
    - bbj-vscode/src/language/main.ts

key-decisions:
  - "reloadClasspathAndRecheckDocuments takes plain Pick<JavaInteropService, ...> and Pick<BBjWorkspaceManager, ...> shapes (not the concrete classes) so Task 1's unit tests can pass vi.fn()-backed stand-ins directly, with no service-container construction, while main.ts still passes the real services unchanged"
  - "recheckAfterInteropRecovery wraps the helper call and refreshInlayHints() in one try/catch logging via console.error only — mirroring the plan's explicit no-popup-on-recovery requirement (T-91-18) without adding any new notification channel"

requirements-completed: []  # RESP-02 is also declared by plan 91-06, which has no SUMMARY yet — not marked Complete here per phase instruction

coverage:
  - id: D1
    description: "A recovered interop connection reloads the classpath (when non-empty) and implicit imports, then re-checks every file document exactly once, all documents reset to Parsed, without clearCache"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-class-reload.test.ts#Java class reload after interop recovery (#504) > reloads the classpath, then implicit imports, then re-checks every file document once"
        status: pass
    human_judgment: false
  - id: D2
    description: "The classpath load is skipped when no classpath is configured, while implicit imports still reload and the document re-check still runs"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-class-reload.test.ts#Java class reload after interop recovery (#504) > skips the classpath load when no classpath is configured"
        status: pass
    human_judgment: false
  - id: D3
    description: "An interop recovery re-checks documents exactly once end to end: the recovery itself, a further successful lookup, and a later clearCache() plus lookup all leave the document rebuild count at one"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-class-reload.test.ts#Java class reload after interop recovery (#504) > end to end through the fake interop peer > an interop recovery re-checks documents exactly once"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-13
status: complete
---

# Phase 91 Plan 05: Interop Recovery Document Re-check Summary

**A new `java-class-reload.ts` helper reloads the classpath and implicit imports and re-checks every open document exactly once when the interop breaker reports recovery — no `clearCache()`, no popup — while Refresh Java Classes keeps its own cache-clearing sequence through the same code.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-13T01:00:00Z
- **Completed:** 2026-09-13T01:05:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 production created, 1 production modified, 1 test)

## Accomplishments

- `java-class-reload.ts` exports `JavaClassReloadServices` (a `Pick`-based slice of `JavaInteropService`/`BBjWorkspaceManager` plus `LangiumDocuments`/`DocumentBuilder`) and `reloadClasspathAndRecheckDocuments(services)`, which is `main.ts`'s former refresh steps 2-4 verbatim (classpath reload when non-empty, implicit-imports reload, reset every `file`-scheme document to `Parsed`, then one `DocumentBuilder.update` call) minus the inlay-hint refresh. It imports nothing from `main.ts`.
- `main.ts`'s `reloadJavaClassesAndRevalidate()` is now `clearCache()` → `await reloadClasspathAndRecheckDocuments(javaClassReloadServices)` → `refreshInlayHints()` → the `Java classes refreshed` message — same observable sequence, now sharing its middle three steps with recovery.
- `BBj.java.JavaInteropService.onConnectionRecovered(...)` is registered once in `main.ts`. Before the first workspace build completes it only sets `javaRecoveryPending = true`; the existing one-shot first-Validated block drains that flag and fires `recheckAfterInteropRecovery()` right after its own initialization work, so a recovery reported during cold start cannot become a competing rebuild. After the first build, the handler calls `recheckAfterInteropRecovery()` directly.
- `recheckAfterInteropRecovery()` awaits the helper, refreshes inlay hints, and never shows a message; a failure is logged with `console.error` only (T-91-18).
- Three new tests in `test/java-class-reload.test.ts`: two unit tests against `vi.fn()` stand-ins (call order `loadClasspath` → `loadImplicitImports` → `update`, all re-checked documents at `DocumentState.Parsed`, `clearCache` never called; and the classpath-skip variant), plus one end-to-end test through `createFakePeerServices()` and fake timers that drives a real outage/recovery cycle and confirms `DocumentBuilder.update` fires exactly once for the recovery, stays at one after a further successful lookup, and stays at one after `clearCache()` plus another lookup.

## Task Commits

1. **Task 1: A recovered interop connection reloads the classpath and implicit imports, then re-checks every file document once, without clearCache** - `e69df7e9` (feat)
2. **Task 2: The document re-check runs exactly once per recovery, end to end through the fake peer** - `f7397da0` (test)

**Plan metadata:** (this commit)

## Pre-change Failing Counts (RED before Task 1's implementation)

Before `java-class-reload.ts` existed, running `test/java-class-reload.test.ts` (with only its two Task-1 tests written) failed the whole suite at import time: `Error: Cannot find module '../src/language/java-class-reload.js' imported from .../test/java-class-reload.test.ts`, 0 tests collected. Restoring the helper module (written to match the plan's artifact spec) turned both tests green with no further changes.

## Files Created/Modified

- `bbj-vscode/src/language/java-class-reload.ts` — new. `JavaClassReloadServices` interface and `reloadClasspathAndRecheckDocuments(services)`.
- `bbj-vscode/src/language/main.ts` — `javaClassReloadServices` built once from the existing `BBj`/`shared` services; `reloadJavaClassesAndRevalidate()` rebuilt on the helper; `javaRecoveryPending` flag; `recheckAfterInteropRecovery()`; `onConnectionRecovered(...)` registration; the first-Validated block drains the pending flag.
- `bbj-vscode/test/java-class-reload.test.ts` — new. `describe('Java class reload after interop recovery (#504)')` with the two Task-1 unit tests and Task 2's nested `describe('end to end through the fake interop peer')` with the recovery-count test.

## Decisions Made

See key-decisions in frontmatter.

## Deviations from Plan

None — plan executed exactly as written. Task 1's helper file was written once, temporarily moved aside to capture the RED state (module-not-found) against the already-written tests, then restored — an authoring-order adjustment to honor the plan's "write the test first" instruction after drafting the helper's shape for reference, not a defect. Both Task 1 tests and the Task 2 end-to-end test pass, matching the plan's acceptance criteria in one pass with no production bugs found.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Whole-suite `npm test` (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) is green: 1824 passed, 29 skipped (pre-existing local interop-drift/other skips), 0 failed, 103 test files passed, 2 skipped.
- `npm run build` and `npm run lint` both exit 0.
- Register check (`git diff 174985f7` scanned for `9[0-9]-[0-9]{2}`, `D-[0-9]{2}`, `T-9[0-9]-[0-9]+`, `G-9[0-9]-[0-9]+`, `Pitfall N`, `(C|CR|WR|IN)-[0-9]{2}`) prints nothing across all three changed files.
- No file under `bbj-intellij/` was touched (language-server-internal only).
- RESP-02 is NOT marked Complete in REQUIREMENTS.md — plan 91-06 also declares it and has no SUMMARY yet.
- No blockers for plan 91-06.

---
*Phase: 91-language-server-responsiveness*
*Completed: 2026-09-13*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-class-reload.ts
- FOUND: bbj-vscode/test/java-class-reload.test.ts
- FOUND: .planning/phases/91-language-server-responsiveness/91-05-SUMMARY.md
- FOUND commit: e69df7e9
- FOUND commit: f7397da0
