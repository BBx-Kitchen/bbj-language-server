---
phase: 108-intellij-crash-detection
plan: 01
subsystem: ide-lifecycle
tags: [intellij, lsp4ij, lifecycle, crash-detection, java]

requires:
  - phase: 97-release-0-16-0-milestone-close
    provides: the real idea.log evidence that a killed process and a deliberate stop both arrive as `started -> stopping -> stopped`, which is why this plan probes the unexpected-stop hook instead of the status sequence
provides:
  - a probe build with no behaviour change: LSP4IJ's unexpected-stop hook registered beside its own, a stop() log line, the status feed moved to the client-features hook, and the status log line naming the real previous status
  - a real macOS idea.log excerpt (kill -9 x4, four file closes, three Settings Applies) proving the hook fires only on an unexpected process end and never on a deliberate stop
  - three findings that narrow the design of plans 02 and 03 (see Key Findings below)
affects: [108-02-crash-signal-and-response-policy, 108-03-status-bar-and-notification]

actuals:
  tokens: 15400
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "vendor-hook forwarding: super.addUnexpectedServerStopHandler(handler) called first (unchanged), own handler registered second, guarded by a one-shot boolean field"
    - "comment-aware source guards (stripComments + bodyOf) reused per-guard rather than shared, matching the project's established per-guard-private-helper convention"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjStatusFeedSourceGuardTest.java
    - .planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java

key-decisions:
  - "The maintainer's real macOS idea.log excerpt confirms D-01: the unexpected-stop hook fires after every kill -9 (exit code 137) and never during a deliberate stop (three file closes, three Settings Applies) -- the probe did not contradict the design"
  - "The stop-requested log line and the unexpected-stop hook line race in the same millisecond on every kill, with stop-requested always logged first -- plan 02 cannot use log order between these two lines to tell a crash apart from a deliberate stop; it must rely on which line appears at all"
  - "LSP4IJ's own recovery after a kill sometimes launches a server twice, stopping the first instance while it is still alive (process alive: true) before the one that stays running, with no hook line either time -- plan 02's crash counting must not mistake this double-launch for two separate stop events"
  - "Closing the last BBj file and reopening it inside a roughly 30 s grace period returns the same process from stopping directly back to started, with no stop-requested line and no process restart -- stopping is not a terminal state on this path, which plan 02 must account for in its status-driven logic"

requirements-completed: []  # LIFE-01/LIFE-02 stay open per this plan's own instruction -- the phase verifier closes them once plans 02-04 land the behaviour this probe only observed

coverage:
  - id: D1
    description: "Probe build wires the unexpected-stop hook and stop() logging with no behaviour change"
    verification:
      - kind: unit
        ref: "Lsp4ijCouplingCanaryTest#theUnexpectedStopMembersThisPluginHooksStillExist"
        status: pass
      - kind: unit
        ref: "BbjLanguageServerSourceGuardTest#addUnexpectedServerStopHandlerForwardsToSuperOnceThenRegistersOwnHandlerOnceGuardedByTheFlag"
        status: pass
      - kind: unit
        ref: "BbjLanguageServerSourceGuardTest#stopLogsBeforeDelegatingToSuperExactlyOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "Status feed moved from BbjLanguageClient to the client-features hook, logging the real previous status"
    verification:
      - kind: unit
        ref: "BbjStatusFeedSourceGuardTest#serviceLogLineNamesTheRealPreviousStatusAndTheStaleFieldIsGone"
        status: pass
      - kind: unit
        ref: "BbjStatusFeedSourceGuardTest#clientStatusHandlerLogsToConsoleOnlyAndNeverCallsUpdateStatus"
        status: pass
      - kind: unit
        ref: "Lsp4ijCouplingCanaryTest#theClientFeaturesStatusMembersThisPluginOverridesStillExist"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both distributables built from this tree, provably carrying the probe wiring"
    verification:
      - kind: other
        ref: "unzip -p bbj-intellij-0.1.0.zip lib/language-server/main.cjs | cmp - bbj-vscode/out/language/main.cjs (exit 0)"
        status: pass
      - kind: other
        ref: "javap -p plugin.jar com.basis.bbj.intellij.lsp.BbjLanguageServer (addUnexpectedServerStopHandler, stop, onUnexpectedStop present)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real macOS idea.log excerpt for kill -9, three file closes, three Settings Applies, recorded in 108-UAT-ARTIFACTS.md"
    verification: []
    human_judgment: true
    rationale: "Only a human with a macOS IntelliJ install can produce this evidence; it was captured via a checkpoint:human-verify and pasted verbatim by the maintainer, per the v4.4 standing decision against hand-derived traces"

duration: 6min active (plus a maintainer checkpoint wait of about 3h49m for the macOS probe run)
completed: 2026-09-25
status: complete
---

# Phase 108 Plan 01: Probe Build Summary

**Wired LSP4IJ's unexpected-stop hook and a real-from-state status log with zero behaviour change, then confirmed on a real macOS idea.log that the hook fires only on `kill -9` and never on a deliberate stop.**

## Performance

- **Duration:** ~6 min of active executor work across two commits (Task 1, Task 2), plus a
  `checkpoint:human-verify` wait of about 3h49m for the maintainer's macOS probe run
- **Started:** 2026-09-25T08:54:50Z (first task commit)
- **Completed:** 2026-09-25T12:49:20Z (excerpt recorded)
- **Tasks:** 3 (1 tracer, 1 auto, 1 checkpoint:human-verify)
- **Files modified:** 9 (7 modified, 2 created)

## Accomplishments
- `BbjLanguageServer` overrides `addUnexpectedServerStopHandler` (forwards LSP4IJ's own handler
  unchanged, then registers its own once) and `stop()`, logging pid/exit-code/thread on an
  unexpected process end and pid/liveness on every stop request
- `BbjLanguageServerFactory`'s client-features anonymous class now overrides
  `handleServerStatusChanged`, moving the status feed off `BbjLanguageClient` (which LSP4IJ nulls
  before publishing `stopped`) onto the hook LSP4IJ always calls
- `BbjServerService.updateStatus` logs and classifies against the real previous status
  (`currentStatus` before it advances); the stale two-behind `previousStatus` field is gone
- Coupling canaries and comment-aware source guards pin every vendor member and structural
  invariant this wiring depends on; both distributables were built from this tree and proven to
  carry the probe (byte-identical `main.cjs`, `javap`-confirmed overrides)
- A real macOS `idea.log` excerpt for `kill -9` x4, four file closes and three Settings Applies is
  recorded in `108-UAT-ARTIFACTS.md` with the "Observed?" column filled in

## Task Commits

Each task was committed atomically:

1. **Task 1: Probe path end to end (tracer)** - `fc6d711b` (feat)
2. **Task 2: Pin the probe wiring, build both distributables** - `eba3f5c6` (test)
3. **Task 3: Probe run in IntelliJ on macOS (checkpoint:human-verify)** - `bd3c514e` (docs, excerpt + Observed column)

No separate plan-metadata commit: `bd3c514e` closes out the plan's own artifact directly, and this
SUMMARY plus STATE.md/ROADMAP.md are committed together as the metadata step below.

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` - unexpected-stop
  hook override, `onUnexpectedStop()`, `stop()` override, all logging only
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` -
  `handleServerStatusChanged` override in `createClientFeatures()`'s anonymous class, beside
  Phase 106's `initializeParams` override
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` - dropped the
  `updateStatus` call, kept the console line, reworded the class javadoc
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` - log line and
  classifier input now read `currentStatus`; the stale `previousStatus` field is removed
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` - added
  `ServerStatus` to the factory's allowlist entry
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` - two new
  canaries pinning the unexpected-stop and client-features vendor members
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java` -
  three new structural guards on the hook override, `stop()`, and reflection-free reach
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjStatusFeedSourceGuardTest.java` (new) -
  pins one status-feed site and the real-from-state log line
- `.planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md` (new) - build identity,
  runbook, derived P1-P8 table with Observed column filled, the maintainer's real excerpt

## Decisions Made

None beyond the plan's own locked decisions (D-01 through D-15) -- this plan executed the probe
exactly as planned. The maintainer's real excerpt confirms D-01 and surfaces three findings that
narrow plans 02 and 03's design (see Key Findings below); no plan deviation was needed to record
them.

## Key Findings for Plans 02 and 03

1. **P3 ordering is not usable as a signal.** In all four kills, the `connection stop requested
   (…, process alive: false)` line is logged *before* the unexpected-stop hook line, in the same
   millisecond. LSP4IJ calls `stop()` on a process that is already dead as part of its own recovery,
   so "did stop() precede the exit" cannot separate a crash from a deliberate stop. What does work:
   the hook line appears only after a kill, and `process alive: false` at the stop-requested line
   appears only after a kill (every deliberate stop in the excerpt logs `process alive: true`).
2. **LSP4IJ's own recovery sometimes double-launches.** After two of the four kills (14:32:31,
   14:34:14), LSP4IJ launched a server twice on its own, stopping the first instance while it was
   still alive (pids 88831 and 89481, `process alive: true`) before the instance that stayed
   running -- with no hook line for either. Plan 02's crash counting must not mistake this
   double-launch's own internal stop for a second crash event.
3. **`stopping` is not terminal.** Closing the last BBj file and reopening it inside roughly a 30 s
   grace period returns the same process directly from `stopping` back to `started`, with no
   stop-requested line and no restart. Only the fourth, unreopened close was followed (exactly
   30.0 s later) by an actual stop request and `stopping -> stopped`. Plan 02's status-driven logic
   must treat `stopping` as reversible on this path, not as a guaranteed precursor to `stopped`.

## Deviations from Plan

None - plan executed exactly as written. The probe did not contradict D-01: the closing line's
falsification condition (a missing hook line after a kill, or a hook line inside a P6/P7 window)
did not occur anywhere in the excerpt.

## Issues Encountered

None. The `bbj-vscode` build ran under Node 24 (no Node 22 available in this environment) rather
than the project's usual Node 22 preference; this is safe here because the probe build only runs
`npm run build` (tsc + esbuild), never `langium:generate`, which is the step Node 24 is known to
break.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 (crash signal and response policy) can now build on the *observed* sequence rather than
source-reading alone, per D-13. The three key findings above are load-bearing for its design:
crash detection must key off "hook line present" rather than log order, must tolerate LSP4IJ's own
double-launch recovery without double-counting, and must not treat `stopping` as a guaranteed
step toward `stopped`. LIFE-01 and LIFE-02 remain open in REQUIREMENTS.md, to be closed by the
phase verifier once plans 02-04 land the behaviour this plan only observed.

---
*Phase: 108-intellij-crash-detection*
*Completed: 2026-09-25*
