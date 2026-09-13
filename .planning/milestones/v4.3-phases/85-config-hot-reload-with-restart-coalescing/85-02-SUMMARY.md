---
phase: 85-config-hot-reload-with-restart-coalescing
plan: 02
subsystem: config
tags: [fs.watch, debounce, quiescence, hot-reload, language-server, lsp-notification]

requires:
  - phase: 85-config-hot-reload-with-restart-coalescing
    provides: "extractConsumedConfigContent/consumedConfigSnapshot, bbj/configReloadRequired notification, createConfigWatcher, BBjWorkspaceManager.getConsumedConfigSnapshot() — plan 01's detection layer"
provides:
  - "BBjDocumentBuilder.hasPendingCompile()/hasPendingWork() — the quiescence predicate a config reload consults before it is safe to push a restart request"
  - "config-watcher.ts's bounded quiescence wait (QUIESCENCE_POLL_MS=100, QUIESCENCE_TIMEOUT_MS=5000) gating every 'changed' verdict before it reaches notify()"
  - "main.ts wiring: configWatcher armed once after the first Validated build, re-armed at both bbj.configPath settings-change sites"
affects: [85-03, 85-04, 85-05, 87]

actuals:
  tokens: 8027
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Bounded poll-with-timeout instead of a sleep: a plain setTimer/clearTimer poll loop over an injected boolean predicate, capped at a fixed elapsed-time bound"
    - "Cancel-then-replace single-pending-wait shape: a new verdict arriving while a wait is outstanding clears the existing timer and replaces the payload rather than tracking multiple waits"
    - "Source-guard tests (whole-file text assertions with line-comment stripping) fencing call-site count and ordering in main.ts, extending the config-path-resolution.test.ts convention"

key-files:
  created:
    - bbj-vscode/test/config-hot-reload-wiring.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/config-watcher.ts
    - bbj-vscode/src/language/main.ts

key-decisions:
  - "hasPendingWork() reads the inherited protected currentState field directly (currentState < DocumentState.Validated) rather than adding a new bookkeeping flag — DefaultDocumentBuilder already resets it to Changed on every build/update and advances it to Validated only once validation finishes, confirmed by reading the installed Langium 4.x sources before writing any code (plan's settled_facts, research disabled for this phase)"
  - "The quiescence wait lives entirely inside config-watcher.ts's evaluate()/updateResolvedPath() call sites, not as a separate exported function main.ts must call — waitForQuiescenceThenNotify replaces the direct notify() call at exactly the two places a 'changed' verdict is produced, so no call site can bypass the gate"
  - "Elapsed time for the bound resets to zero whenever a new verdict replaces the pending payload (cancel-then-schedule) — correct because within one debounce window only the outer CONFIG_WATCH_DEBOUNCE_MS/immediate settings-check produces at most one live verdict at a time; a later verdict truly supersedes an earlier one rather than extending its wait"
  - "configWatcher is created once at main.ts module scope with only the two deps main.ts owns (hasPendingWork, notify) injected — every other ConfigWatcherDeps field keeps createConfigWatcher's real default, so arming behavior is identical to what plan 01's watcher already proved"
  - "Task 3 required no new production code: the quiescence wait (this plan's Task 1) and the relevance gate (85-01) already compose to guarantee at most one notification per consumed-content transition — the task's tests pinned that composition rather than driving new implementation"

requirements-completed: [CFG-03]

coverage:
  - id: D1
    description: "A reload notification is never emitted while a Langium build is in flight or a BBjCPL debounce timer is pending; the wait is bounded at 5000ms and pushes anyway once the bound elapses"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload-wiring.test.ts#config-watcher quiescence wait: a reload is never pushed while the builder is busy"
        status: pass
    human_judgment: false
  - id: D2
    description: "Quiescence is a testable predicate on the document builder (hasPendingWork/hasPendingCompile), not a sleep inside the watcher"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload-wiring.test.ts#BBjDocumentBuilder.hasPendingWork / hasPendingCompile — the quiescence predicate"
        status: pass
    human_judgment: false
  - id: D3
    description: "The watcher is armed exactly once, after the first Validated build phase, and re-armed at exactly the two configuration-change sites in main.ts — fenced by a source guard so a third call site cannot silently appear"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload-wiring.test.ts#main.ts wires the config watcher: armed once, re-armed at exactly two sites"
        status: pass
    human_judgment: false
  - id: D4
    description: "A .bbj save burst overlapping a config save (interleaved raw file events plus a settings change, all while the builder is busy) never lands a restart mid-validation and collapses to exactly one notification"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload-wiring.test.ts#settings-change relevance and the interleaved-burst guarantee (#486)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A settings change to an identical-content config produces no restart request, while still re-arming the watch on the new directory"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload-wiring.test.ts#a settings change to an identical-content config emits zero notifications, and the fake watch factory records a watch on the new directory"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-07
status: complete
---

# Phase 85 Plan 02: Config Hot-Reload Quiescence Wiring Summary

**The `bbj/configReloadRequired` watcher from 85-01 is now wired into `main.ts` behind a bounded quiescence gate — `BBjDocumentBuilder.hasPendingWork()` polled at 100ms up to a 5000ms cap — so a `.bbj` save and a config save in the same burst always coalesce into exactly one restart request, never mid-validation.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-07T00:00:00Z (approx.)
- **Completed:** 2026-09-07T00:25:00Z (approx.)
- **Tasks:** 3 completed (Task 1 tracer/tdd, Task 2 auto, Task 3 auto/tdd)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Added `hasPendingCompile()`/`hasPendingWork()` to `BBjDocumentBuilder` — a public quiescence predicate reading the inherited `currentState` field directly (no new bookkeeping flag), true while a Langium build is in flight/never-completed or a BBjCPL debounce timer is pending.
- Extended `config-watcher.ts` with a bounded quiescence wait (`QUIESCENCE_POLL_MS = 100`, `QUIESCENCE_TIMEOUT_MS = 5000`): every "changed" verdict now routes through `waitForQuiescenceThenNotify`, which notifies immediately when the builder is quiescent, otherwise polls `hasPendingWork()` on a schedule and pushes anyway once the bound elapses (logged at info level). Exactly one wait is ever outstanding — a new verdict cancels and replaces the pending payload rather than starting a second wait.
- Wired `main.ts`: one `createConfigWatcher` instance at module scope injecting `hasPendingWork` (from the shared `DocumentBuilder` cast to `BBjDocumentBuilder`) and `notify` (`notifyConfigReloadRequired`); `configWatcher.start(...)` called exactly once, inside the existing `workspaceInitialized` gate right after the existing `notifyResolvedConfigPath` call; `configWatcher.updateResolvedPath(...)` called at both existing `setConfigPath` sites in `onDidChangeConfiguration`.
- Proved the full interleaved-burst guarantee end to end: three debounced config-file events plus a settings change inside one held-busy window collapse to exactly one notification (the last verdict to reach the pending wait survives); the same burst with the predicate never flipping still emits exactly one notification at the 5000ms bound, not one per event; a settings change to identical content re-arms silently; a settings change resolving to `null` closes the watch and emits at most one notification.

## Task Commits

1. **Task 1: End-to-end "a reload waits for build quiescence" (tracer)**
   - `d23459fb` test(85-02): add failing test for config-reload quiescence wiring
   - `54dc4a69` feat(85-02): bounded quiescence wait gates the config-reload notification
   - Tracer feedback gate: re-ran `npx vitest run test/config-hot-reload-wiring.test.ts` and `npx tsc -b tsconfig.json` after GREEN — both passed (auto-mode re-verify). Logged: tracer verified end-to-end — expanding.
2. **Task 2: Arm the watcher after the first Validated build and re-arm at both settings sites**
   - `d4f4625e` feat(85-02): arm the config watcher after the first Validated build
3. **Task 3: Settings-change relevance and the interleaved-burst guarantee**
   - `f6162550` test(85-02): prove the interleaved-burst and settings-change guarantee

_Task 1 carried `tdd="true"` and produced a genuine RED (`hasPendingWork is not a function`, and the watcher notifying immediately instead of waiting) before its GREEN commit. Task 3 also carried `tdd="true"`, but its action was test-only — the quiescence wait (Task 1) and the relevance gate (85-01) already composed to satisfy every behavior it lists, so its single commit is the pinning test, not a RED/GREEN pair. No `refactor(...)` commit was needed in any task._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-builder.ts` — new public members `hasPendingCompile()`, `hasPendingWork()`
- `bbj-vscode/src/language/config-watcher.ts` — new exports `QUIESCENCE_POLL_MS`, `QUIESCENCE_TIMEOUT_MS`; new optional dep `hasPendingWork`; `waitForQuiescenceThenNotify`/`pollQuiescence` gating the two existing "changed" call sites; `dispose()` now also clears a pending quiescence timer
- `bbj-vscode/src/language/main.ts` — new module-level `configWatcher` instance; one `configWatcher.start(...)` call inside the `workspaceInitialized` gate; two `configWatcher.updateResolvedPath(...)` calls at the existing `setConfigPath` sites
- `bbj-vscode/test/config-hot-reload-wiring.test.ts` — new test file, 25 tests across 5 describe blocks

## Decisions Made
- `hasPendingWork()` reads Langium's own `currentState` field (confirmed `protected`, resettable to `Changed` on every `build`/`update`, advanced to `Validated` only at the end of validation) instead of adding a parallel flag — verified against the installed Langium 4.x sources per the plan's `settled_facts` before writing any code.
- The quiescence gate lives entirely inside `config-watcher.ts`'s two existing "changed" call sites (`evaluate()` and `updateResolvedPath()`'s two branches) rather than as a separate function callers must remember to invoke — no call site can bypass the wait.
- Elapsed wait time resets to zero when a verdict replaces the pending payload — correct because at most one live verdict exists per debounce window; a later verdict truly supersedes an earlier one, it does not extend an existing wait.
- `main.ts` injects only the two deps it owns (`hasPendingWork`, `notify`); every other `ConfigWatcherDeps` field (the real `fs.watch`, real `readFile`, real timers) keeps `createConfigWatcher`'s default, so production arming behavior is identical to what 85-01's hermetic tests already proved.

## Deviations from Plan

None — plan executed exactly as written. Task 1 (`type="tracer"`) ran its tracer feedback gate after GREEN (re-running `<verify>` under auto-mode) and passed, so Tasks 2 and 3 (expansion) proceeded without a checkpoint.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. This plan adds no package-manager dependency; it wires server-internal detection machinery that is already server-owned per Phase 84/85-01.

## Next Phase Readiness

Ready for `85-03` (the VS Code restart choke point, D-10) and `85-04` (the IntelliJ side, D-11) to consume `bbj/configReloadRequired` — the notification is now pushed only after the server itself confirms it is safe to restart, with the arm/re-arm lifecycle fully wired and source-guarded. Nothing in this plan blocks that work.

No blockers or concerns.

## Self-Check: PASSED

- All key-files.created verified present on disk (`test/config-hot-reload-wiring.test.ts`, this SUMMARY.md).
- All 4 task commit hashes (`d23459fb`, `54dc4a69`, `d4f4625e`, `f6162550`) confirmed present via `git log --oneline`.
- Full plan `<verification>` re-run: `npx vitest run test/config-hot-reload-wiring.test.ts test/config-hot-reload.test.ts test/config-path-resolution.test.ts test/document-builder.test.ts test/document-builder-rebuild-guard.test.ts` — 83/83 passed. `npm run build` and `npm run lint` both exit 0.

---
*Phase: 85-config-hot-reload-with-restart-coalescing*
*Completed: 2026-09-07*
