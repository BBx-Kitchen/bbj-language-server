---
phase: 85-config-hot-reload-with-restart-coalescing
plan: 01
subsystem: config
tags: [fs.watch, debounce, hot-reload, language-server, lsp-notification]

requires:
  - phase: 84-config-path-resolution-discoverability-foundation
    provides: "resolveConfigPath, samePath, canonicalizeConfigPath, ResolvedConfigPath — the canonical resolved-path form the watcher watches and compares"
provides:
  - "extractConsumedConfigContent / consumedConfigSnapshot — the single shared PREFIX-reading function initializeWorkspace and the hot-reload relevance gate both call"
  - "bbj/configReloadRequired notification (CONFIG_RELOAD_METHOD, ConfigReloadReason, ConfigReloadNotification)"
  - "createConfigWatcher — a directory-scoped, debounced, snapshot-gated fs.watch wrapper with start/updateResolvedPath/dispose"
  - "BBjWorkspaceManager.getConsumedConfigSnapshot()"
affects: [85-02, 85-03, 85-04, 85-05, 87]

actuals:
  tokens: 10658
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Injectable-probe pure functions (ConfigWatcherDeps) for hermetic fs.watch/timer testing, following config-path-resolver.ts's ConfigPathProbeDeps convention"
    - "Trailing-edge debounce via clear-then-set timer handle, following bbj-document-builder.ts's debouncedCompile"
    - "Per-key warn-once dedup Set for arm-failure logging, mirroring the once-per-path missing-file warning convention from Phase 84"

key-files:
  created:
    - bbj-vscode/src/language/config-reload-notification.ts
    - bbj-vscode/src/language/config-watcher.ts
    - bbj-vscode/test/config-hot-reload.test.ts
  modified:
    - bbj-vscode/src/language/config-path-resolver.ts
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts

key-decisions:
  - "extractConsumedConfigContent moved the PREFIX line-scan out of bbj-ws-manager.ts verbatim (same expression, same empty-string fallback) — a source-scan test asserts it appears in exactly one module across bbj-vscode/src/language/*.ts"
  - "consumedConfigSnapshot normalizes via trimEnd() alone: JS's WhiteSpace/LineTerminator definition already includes \\r, so trailing-CR-strip and trailing-whitespace-trim collapse into one call with no separate regex"
  - "notifyConfigReloadRequired is deliberately NOT deduplicated (unlike notifyResolvedConfigPath) — every call is a discrete reload event; the relevance gate in config-watcher.ts is the only place that decides whether to call it at all"
  - "updateResolvedPath's relevance check is immediate and undebounced (a settings change is a discrete user action, not a file-event burst), while the directory-watch path always debounces at CONFIG_WATCH_DEBOUNCE_MS = 1000ms"
  - "Arm-failure and watch-error warnings dedupe per canonical path via a Set, cleared on a later successful arm, so a broken path stays silent on repeat but a newly-broken different path always warns"

requirements-completed: [CFG-03]

coverage:
  - id: D1
    description: "A PREFIX edit produces exactly one bbj/configReloadRequired notification with reason prefix-changed; a SETOPTS-only edit produces zero"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload.test.ts#createConfigWatcher: debounce + relevance gate (end-to-end tracer)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Detection is server-side, directory-scoped, basename-filtered through samePath, and survives an atomic write-temp-then-rename save (delete+create collapses into one evaluation, transient absence never observed)"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload.test.ts#an atomic save modelled as delete-then-create inside one debounce window emits exactly one prefix-changed notification"
        status: pass
    human_judgment: false
  - id: D3
    description: "The relevance gate and initializeWorkspace read through one shared function; PREFIX resolution behavior for real-world config content is unchanged"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload.test.ts#initializeWorkspace and the relevance gate share one extraction function"
        status: pass
      - kind: unit
        ref: "test/lazy-prefix-loading.test.ts"
        status: pass
      - kind: unit
        ref: "test/use-project-root.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Missing file, re-armed settings path and an unreachable watched directory are all handled without a thrown error"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-hot-reload.test.ts#updateResolvedPath: settings-change re-arm and immediate relevance check"
        status: pass
      - kind: unit
        ref: "test/config-hot-reload.test.ts#arm failure handling and dispose"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-06
status: complete
---

# Phase 85 Plan 01: Config Hot-Reload Detection Summary

**The language server now detects a resolved-config-file PREFIX change via a directory-scoped, debounced `fs.watch`, gated so a SETOPTS-only composer write can never trigger a reload — the exact structural suppression Phase 87's composer inherits with no API call.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-06T23:20:47Z (approx., from STATE.md session marker)
- **Completed:** 2026-09-06T23:36:52Z
- **Tasks:** 3 completed (Task 1 tracer, Task 2 auto, Task 3 auto — all `tdd="true"`)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Extracted the PREFIX line-scan out of `bbj-ws-manager.ts` into `extractConsumedConfigContent`/`consumedConfigSnapshot` in `config-path-resolver.ts` — `initializeWorkspace` and the hot-reload relevance gate now call the exact same function, with a source-scan test proving the line-scan expression exists in exactly one module.
- Added the `bbj/configReloadRequired` notification (`config-reload-notification.ts`, `notifyConfigReloadRequired` in `bbj-notifications.ts`) with a machine-readable `ConfigReloadReason` (`prefix-changed` | `config-missing` | `config-path-changed`) hosts must dispatch on.
- Built `config-watcher.ts`: a non-recursive directory `fs.watch` filtered to the config file's basename via `samePath`, a 1000ms trailing-edge debounce (double the BBjCPL 500ms debounce), and a relevance gate that only notifies when the consumed PREFIX content actually changed — proven end-to-end under fake timers with no real fs/timer touched.
- Completed missing-file handling (empty-to-empty is silent, non-empty-to-empty notifies `config-missing`), atomic-save coalescing (a delete+create pair inside one debounce window is judged once, after the window closes, never mid-transition), `updateResolvedPath`'s immediate undebounced re-check for settings changes, and per-path deduped arm-failure/watch-error warnings.

## Task Commits

Each task followed RED (`test(...)`) then GREEN (`feat(...)`):

1. **Task 1: End-to-end "a PREFIX edit produces exactly one reload notification" (tracer)**
   - `2f5ea509` test(85-01): add failing test for config-reload detection tracer
   - `0c103218` feat(85-01): config-reload notification, shared PREFIX extraction, and directory watcher
   - Tracer feedback gate: re-ran `npx vitest run test/config-hot-reload.test.ts` and `npx tsc -b tsconfig.json` after GREEN — both passed (auto-mode re-verify per the tracer gate). Logged: tracer verified end-to-end — expanding.
2. **Task 2: The read and the gate share one function**
   - `2990bd48` test(85-01): add failing test for shared PREFIX extraction in initializeWorkspace
   - `bce67074` feat(85-01): initializeWorkspace reads PREFIX through the shared extraction function
3. **Task 3: Missing-file, re-arm and directory-absent paths**
   - `4c5189ee` test(85-01): add failing test for updateResolvedPath and arm-failure dedup
   - `86b8dcb8` feat(85-01): complete updateResolvedPath and arm-failure dedup

_All three tasks carried `tdd="true"`; each produced a `test(...)` commit that failed for the expected reason (missing module/method, or the old dual-occurrence line-scan) before its `feat(...)` commit made it pass. No `refactor(...)` commit was needed — no post-GREEN cleanup was warranted in any task._

## Files Created/Modified
- `bbj-vscode/src/language/config-reload-notification.ts` — `CONFIG_RELOAD_METHOD`, `ConfigReloadReason`, `CONFIG_RELOAD_REASONS`, `ConfigReloadNotification`
- `bbj-vscode/src/language/config-watcher.ts` — `CONFIG_WATCH_DEBOUNCE_MS`, `WatchHandle`, `ConfigWatcherDeps`, `ConfigWatcher`, `createConfigWatcher`
- `bbj-vscode/src/language/config-path-resolver.ts` — new exports `extractConsumedConfigContent`, `consumedConfigSnapshot`
- `bbj-vscode/src/language/bbj-notifications.ts` — new export `notifyConfigReloadRequired`
- `bbj-vscode/src/language/bbj-ws-manager.ts` — new member `getConsumedConfigSnapshot()`; PREFIX read now calls the shared extraction function
- `bbj-vscode/test/config-hot-reload.test.ts` — new test file, 28 tests across 7 describe blocks

## Decisions Made
- `consumedConfigSnapshot` normalizes with `.trimEnd()` alone rather than a separate CR-strip step: JavaScript's whitespace definition already includes `\r`, so one call does both jobs (verified with a CRLF-file test case).
- `notifyConfigReloadRequired` is deliberately undeduplicated, unlike `notifyResolvedConfigPath` — the relevance gate itself is the single point deciding whether a reload is warranted; deduplicating the sender on top would be a second, redundant suppression layer.
- `updateResolvedPath`'s relevance check runs immediately with no debounce (a settings change is a discrete user action), while the directory-watch path always debounces — two different trigger sources, two different timing disciplines, matching D-08's rationale.
- Arm-failure and watch-error warnings dedupe on canonical path via one shared `Set`, cleared on a later successful arm — a broken path logs once, a newly-different broken path always logs again, and a path that later recovers becomes eligible to warn again if it breaks a second time.

## Deviations from Plan

None — plan executed exactly as written. Task 1 (`type="tracer"`) ran its tracer feedback gate after GREEN (re-running `<verify>` under auto-mode) and passed, so Tasks 2 and 3 (expansion) proceeded without a checkpoint.

## Issues Encountered

One test-authoring mistake, caught and fixed during Task 1's own verification loop (not a deviation from the plan — an error in the test I wrote, corrected before the GREEN commit): a test case asserting `extractConsumedConfigContent('PREFIXED /a/b/\n')` initially expected the wrong substring (miscounted the 7-character `substring(7)` offset against the longer directive-prefixed word). Fixed the expected value to match the byte-identical formula asserted alongside it; the underlying `extractConsumedConfigContent` implementation was correct throughout.

## User Setup Required

None — no external service configuration required. This plan adds no package-manager dependency and touches no runtime settings; it is server-internal detection machinery with no host-facing wiring yet (that begins in `85-02`).

## Next Phase Readiness

Ready for `85-02` — wiring the watcher into `main.ts` (arm after first validated build, re-arm at both `setConfigPath` call sites), the D-09 quiescence predicate on `BBjDocumentBuilder`, and the VS Code/IntelliJ restart choke points. Nothing in this plan blocks that work: `createConfigWatcher` is a pure, fully-injectable factory with no wiring assumptions, and `getConsumedConfigSnapshot()` gives `main.ts` the exact snapshot value to hand to `watcher.start()` at arm time.

No blockers or concerns.

## Self-Check: PASSED

- All key-files.created verified present on disk (`config-reload-notification.ts`, `config-watcher.ts`, `test/config-hot-reload.test.ts`, this SUMMARY.md).
- All 7 task/plan commit hashes (`2f5ea509`, `0c103218`, `2990bd48`, `bce67074`, `4c5189ee`, `86b8dcb8`, `4914aa57`) confirmed present via `git log --oneline --all`.
- Full plan `<verification>` re-run: `npx vitest run test/config-hot-reload.test.ts test/ws-manager.test.ts test/lazy-prefix-loading.test.ts test/use-project-root.test.ts test/notifications.test.ts test/config-path-resolution.test.ts` — 65/65 passed. `npm run build` and `npm run lint` both exit 0.

---
*Phase: 85-config-hot-reload-with-restart-coalescing*
*Completed: 2026-09-06*
