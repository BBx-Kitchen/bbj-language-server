---
phase: 85-config-hot-reload-with-restart-coalescing
plan: 03
subsystem: config
tags: [vscode-extension, restart-coalescing, status-bar, lsp-notification]

requires:
  - phase: 85-config-hot-reload-with-restart-coalescing
    provides: "bbj/configReloadRequired notification (CONFIG_RELOAD_METHOD, ConfigReloadReason, ConfigReloadNotification) — the server-pushed signal this plan's handler consumes; the quiescence-gated push wiring from plan 02"
provides:
  - "restart-gate.ts: createRestartGate — a coalescing cancel-then-schedule VS Code restart choke point ported from IntelliJ's RestartGate, operating on the existing LanguageClient instance"
  - "extension.ts: the bbj/configReloadRequired handler, wired as the gate's first and only caller, plus a dedicated non-blocking status-bar signal and deactivate() cancellation"
  - "A source-guard regression fence pinning the gate as the only stop/start path in extension.ts"
affects: [85-04, 85-05, 87]

actuals:
  tokens: 8918
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Cross-language port of a cancel-then-schedule coalescing gate (IntelliJ RestartGate -> restart-gate.ts), holding one pending timer handle and clearing it before rescheduling"
    - "Passing the real LanguageClient instance directly as the gate's structural RestartTarget, rather than a wrapper closure, so a whole-file text-count source guard can fence 'exactly one client.start()/client.stop(' in extension.ts"
    - "Whole-file text-assertion source guard (comments and import lines stripped) porting BbjConfigPathServiceSourceGuardTest's idiom to vitest"

key-files:
  created:
    - bbj-vscode/src/restart-gate.ts
    - bbj-vscode/test/config-reload-host.test.ts
  modified:
    - bbj-vscode/src/extension.ts

key-decisions:
  - "The gate's RestartTarget is the LanguageClient instance itself (client), not a wrapper object with closures calling client.start()/client.stop() — LanguageClient's needsStop()/stop()/start() signatures already satisfy the structural interface, and passing it directly keeps 'client.start()'/'client.stop(' as literal single-occurrence text in extension.ts, which the Task 3 source guard depends on to fence the choke point"
  - "The reload handler's output-channel log line and its call into the gate were both implemented in Task 1 (per the plan's <action> text for that task) rather than deferred to Task 2 — Task 2's own acceptance criteria for the log line were satisfied by that pre-existing implementation with no further code change, only new test coverage"
  - "The source guard's occurrence counts strip import lines in addition to // and /* */ comments before counting — an imported identifier's declaration line is usage-neutral; only call-site occurrences are meant to be fenced (e.g. CONFIG_RELOAD_METHOD appears once as an import and once as a call-site argument, and only the call-site occurrence is the fence's concern)"
  - "Every timing-sensitive assertion in config-reload-host.test.ts uses vi.advanceTimersByTimeAsync rather than the synchronous advanceTimersByTime, since the gate's restart body is async (await target.stop()/target.start()) and a synchronous advance would leave those microtasks unflushed at assertion time"

requirements-completed: [CFG-03]

coverage:
  - id: D1
    description: "A single bbj/configReloadRequired payload travels handler -> gate -> exactly one coalesced stop/start pair on the existing client instance; two requests inside one 500ms window still produce exactly one pair"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-reload-host.test.ts#createRestartGate: cancel-then-schedule coalescing"
        status: pass
      - kind: unit
        ref: "test/config-reload-host.test.ts#bbj/configReloadRequired: the handler dispatches to the gate, never directly"
        status: pass
    human_judgment: false
  - id: D2
    description: "A target whose needsStop() is false calls start() without calling stop(); cancel() before the window elapses produces no stop and no start; a rejected stop()/start() is caught and reported as the failed phase exactly once, never as an unhandled rejection"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-reload-host.test.ts#createRestartGate: cancel-then-schedule coalescing"
        status: pass
    human_judgment: false
  - id: D3
    description: "The reload is signalled only by a dedicated status-bar item (spinning while restarting, a brief auto-hiding confirmation once restarted) plus one output-channel log line naming the path and machine-readable reason — no prompt, modal, or toast on any phase; a failed restart hides the item and reuses the existing start-failure error message"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-reload-host.test.ts#config-reload status bar: the non-blocking signal and failure path"
        status: pass
    human_judgment: false
  - id: D4
    description: "deactivate() cancels the gate's pending restart before calling the existing client.stop(), so a scheduled restart never fires against a client that is being shut down"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-reload-host.test.ts#config-reload status bar: the non-blocking signal and failure path > deactivate() cancels the gate before calling client.stop()"
        status: pass
    human_judgment: false
  - id: D5
    description: "A source-guard regression fence proves the gate is the only place extension.ts stops or starts the client: exactly one client.start()/client.stop( occurrence, the gate-cancel precedes client.stop( in deactivate(), exactly one createRestartGate( call, and the reload handler's body reaches the restart only through the gate's request( call"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "test/config-reload-host.test.ts#source guard: the choke point is the only restart path"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-07
status: complete
---

# Phase 85 Plan 03: VS Code Restart Choke Point and Config-Reload Status Signal Summary

**VS Code now has a single coalescing restart choke point (`restart-gate.ts`, ported from IntelliJ's `RestartGate`) that the `bbj/configReloadRequired` handler drives exclusively, backed by a dedicated auto-hiding status-bar signal and a source-guard fence proving no other code path can stop or start the client.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-07T02:22:00Z (approx.)
- **Completed:** 2026-09-07T02:29:00Z (approx.)
- **Tasks:** 3 completed (Task 1 tracer/tdd, Task 2 auto/tdd, Task 3 auto/tdd)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Ported IntelliJ's `RestartGate` cancel-then-schedule coalescing contract to VS Code as `restart-gate.ts`'s `createRestartGate` — a plain, `vscode`-free TypeScript module that reuses the *existing* `LanguageClient` instance (stop then start) so its already-registered notification handlers survive, guarded against calling `stop()` on a non-running client and against any rejection escaping as an unhandled promise.
- Wired `bbj/configReloadRequired` in `extension.ts` as the gate's first and only caller: the handler performs no relevance judgement of its own, logs one output-channel line naming the resolved path and the machine-readable reason, and hands off to `restartGate.request(500)`.
- Added a dedicated, non-blocking status-bar item (Left/98, adjacent to the existing BBjCPL indicator): a spinning "reloading" state with the active config path (from the warm `config-path-cache.ts` cache) in the tooltip, a brief check-mark confirmation that auto-hides after 5 seconds (cancelled and re-shown if a second reload arrives first), and a failure path that hides the item and reuses the existing start-failure `showErrorMessage` — no prompt, modal, or toast on any phase.
- Extended `deactivate()` to cancel the gate's pending restart before the existing `client.stop()`, so a scheduled restart can never fire against a client that is being shut down.
- Pinned all of the above with a whole-file text-assertion source guard (porting `BbjConfigPathServiceSourceGuardTest`'s idiom to vitest): exactly one `client.start()`/`client.stop(` occurrence in `extension.ts`, the gate-cancel preceding `client.stop(` inside `deactivate()`, exactly one `createRestartGate(` call, the reload handler's body reaching the restart only through `request(`, and `restart-gate.ts` itself containing exactly one `.stop(`/`.start(` call on the target with zero `vscode` imports.

## Task Commits

Each task followed RED (`test(...)`) then GREEN (`feat(...)`), except Task 3 whose test-only action needed no new production code:

1. **Task 1: End-to-end "one reload notification produces exactly one coalesced client restart" (tracer)**
   - `9bfce01e` test(85-03): add failing test for restart gate and reload handler wiring
   - `b4369893` feat(85-03): restart choke point and configReloadRequired handler
   - Tracer feedback gate: re-ran `npx vitest run test/config-reload-host.test.ts` and `npx tsc -b tsconfig.json` after GREEN — both passed (auto-mode re-verify per the tracer gate). Logged: tracer verified end-to-end — expanding.
2. **Task 2: The non-blocking status signal and the failure path**
   - `43ba2b83` test(85-03): add failing test for config-reload status bar and failure path
   - `a4072884` feat(85-03): non-blocking config-reload status bar and failure path
3. **Task 3: Source guard — the choke point is the only restart path**
   - `285a4ee4` test(85-03): pin the restart choke point as the only stop/start path (test-only — Tasks 1-2 already composed to satisfy every assertion)

A sixth commit, `40628136` fix(85-03): remove decision-id tokens from source and test comments, corrected a code-comment hygiene violation caught during my own pre-close review (see Deviations below).

## Files Created/Modified
- `bbj-vscode/src/restart-gate.ts` — `RestartTarget`, `RestartPhase`, `RestartGateDeps`, `RestartGate`, `createRestartGate`, `CONFIG_RELOAD_RESTART_DELAY_MS`
- `bbj-vscode/src/extension.ts` — module-level `restartGate`, `configReloadStatusBar`, `configReloadAutoHideTimer`; `onConfigRestartPhase`; the `bbj/configReloadRequired` handler; the third status-bar item at Left/98; `deactivate()` now cancels the gate before `client.stop()`
- `bbj-vscode/test/config-reload-host.test.ts` — new test file, 22 tests across 4 describe blocks (gate coalescing, handler wiring, status-bar signal, source guard)

## Decisions Made
- The gate's `RestartTarget` is the `LanguageClient` instance itself, passed directly rather than through a wrapper closure — `LanguageClient`'s `needsStop()/stop()/start()` signatures already satisfy the structural interface (a `stop(timeout?: number)` method is assignable to a zero-arg `stop(): Promise<void>` in TypeScript), and passing the instance directly keeps `client.start()`/`client.stop(` as single, literal occurrences in `extension.ts` — the exact invariant Task 3's source guard fences.
- The reload handler's output-channel log line and its dispatch to the gate were both implemented in Task 1 per that task's own `<action>` text; Task 2 added only new test coverage for that pre-existing behavior, no additional production code.
- The source guard's occurrence-counting helper strips `import` lines (in addition to `//` and `/* */` comments) before counting: an imported identifier's declaration is usage-neutral to a call-site fence, so `CONFIG_RELOAD_METHOD` (imported once, used once as `client.onNotification(CONFIG_RELOAD_METHOD, ...)`) counts as exactly one occurrence for the guard's purposes.
- Every timing-sensitive assertion uses `vi.advanceTimersByTimeAsync` rather than the synchronous `advanceTimersByTime`, since the gate's restart body is `async` (`await target.stop()`/`await target.start()`); the synchronous variant would leave those microtasks unflushed at assertion time, hiding real state behind a still-pending promise.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Convention violation] Removed decision-id (`D-xx`) tokens from source and test comments**
- **Found during:** Post-implementation self-review, before writing this SUMMARY (not caught by any automated gate — `npm run lint` does not check for this).
- **Issue:** Several doc comments in `extension.ts` and a section header in `config-reload-host.test.ts` cited `D-10`, `D-13`, `D-14`, `D-15` — decision identifiers from `85-CONTEXT.md`. The project CLAUDE.md and this plan's own prohibitions list explicitly forbid plan/decision-id tokens (`D-xx`, `C-xx`, `COMP`, `CR-xx`) in source or test comments; GitHub issue numbers (`#486`) are the only identifiers permitted.
- **Fix:** Reworded each comment to plain prose or the `#486` issue number, preserving the same explanatory content.
- **Files modified:** `bbj-vscode/src/extension.ts`, `bbj-vscode/test/config-reload-host.test.ts`
- **Verification:** Re-ran `grep -nE "D-[0-9]|C-[0-9]+|COMP|CR-[0-9]+"` across all three touched files — zero matches. Re-ran the full plan-level `<verification>` suite (vitest + build + lint) — all still pass.
- **Commit:** `40628136`

---

**Total deviations:** 1 auto-fixed (Rule 1 — comment-hygiene convention violation caught by self-review, not by an automated gate).
**Impact on plan:** Cosmetic-only; no behavior, test, or verification outcome changed. No scope creep.

## Issues Encountered

None beyond the deviation above. One test-authoring correction during Task 1's own drafting (not a deviation from the plan — an error in a test I wrote, caught and fixed before the GREEN commit): the handler-wiring tests initially asserted `clientStartMock` was never called before the coalescing window elapsed, without accounting for `startLanguageClient()`'s own initial `client.start()` call during `activate()`. Fixed by measuring deltas against a captured baseline call count rather than asserting zero calls.

## User Setup Required

None — no external service configuration required. This plan adds no package-manager dependency; it is VS Code host-side wiring consuming a notification the language server already pushes (plans 01-02).

## Next Phase Readiness

Ready for `85-04` (the IntelliJ side of restart coalescing, reusing the existing `RestartGate`/`requestRestart(long)` machinery) and `85-05` (QA checklist rows / phase wrap-up). VS Code's half of CFG-03 is now complete: detection (85-01), quiescence-gated wiring (85-02), and the restart choke point plus status signal (this plan). Nothing in this plan blocks that work — `restart-gate.ts` is a small, fully injectable module with no VS Code coupling, and the source guard means any future VS Code restart trigger must be written against this same choke point.

No blockers or concerns.

## Self-Check: PASSED

- All key-files.created verified present on disk (`restart-gate.ts`, `config-reload-host.test.ts`, this SUMMARY.md).
- All 6 commit hashes (`9bfce01e`, `b4369893`, `43ba2b83`, `a4072884`, `285a4ee4`, `40628136`) confirmed present via `git log --oneline --all`.
- Full plan `<verification>` re-run: `npx vitest run test/config-reload-host.test.ts test/config-file-association.test.ts test/extension-activation.test.ts test/language-server-lifecycle.test.ts` — 50/51 passed, 1 pre-existing skip, 0 failed. `npm run build` and `npm run lint` both exit 0.
- Re-scanned the full diff for forbidden plan/decision-id tokens (`D-xx`, `C-xx`, `COMP`, `CR-xx`) — zero matches after the fix commit.

---
*Phase: 85-config-hot-reload-with-restart-coalescing*
*Completed: 2026-09-07*
