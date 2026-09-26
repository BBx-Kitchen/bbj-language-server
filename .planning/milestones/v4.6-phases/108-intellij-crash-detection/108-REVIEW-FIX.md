---
phase: 108-intellij-crash-detection
fixed_at: 2026-09-25T15:20:31Z
review_path: .planning/phases/108-intellij-crash-detection/108-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 108: Code Review Fix Report

**Fixed at:** 2026-09-25T15:20:31Z
**Source review:** .planning/phases/108-intellij-crash-detection/108-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, CR-02, WR-01, WR-02)
- Fixed: 4
- Skipped: 0

All four findings were fixed in the isolated worktree
`gsd-reviewfix/108-4009816` (fast-forwarded onto `gsd/v4.6-user-facing-bug-burndown`
by the cleanup tail) as three commits, since CR-02 and WR-01 are two aspects of
the exact same `doRestart()` code region and could not be meaningfully split
without leaving one half in a broken/incomplete state.

## Fixed Issues

### CR-01: Crash-state fields are written off the EDT, racing the EDT-only crash counter

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`
**Commit:** `9ba84bc7`
**Applied fix:** `clearCrashState()` now dispatches its writes to `serverCrashed`,
`crashCount` and `autoRestartAbandoned` through the existing `invokeLater` hop
(previously only the `EditorNotifications` refresh was deferred), so every write
to those fields genuinely happens on the EDT as their own Javadoc already
claimed. Because `clearCrashState()` is no longer synchronous, `requestRestart(long)`
now also dispatches `requestGatedRestart(delayMs)` through `invokeLater` —
queued from the same calling thread immediately after the clear, it runs
strictly after it on the EDT's FIFO event queue, preserving the "cleared before
the restart runs" guarantee without requiring `requestRestart` itself to run on
the EDT (it is reachable from the LSP dispatch thread via
`BbjLanguageClient.configReloadRequired`).

### CR-02: `doRestart()` disarms the guard on the bounded-wait timeout even though the old process may not have died yet

**Files modified:**
`bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java`
**Commit:** `0a1633c7`
**Applied fix:** Per the maintainer's guidance, implemented pid correlation
instead of extending the armed window or leaving the guard armed on a bare
timeout. `ExpectedStopGuard` gained `arm(long, Long)`, `notePid(Long)` and
`classifyExit(long, Long)` overloads: when both the armed token and an incoming
report carry a pid, pid identity is authoritative and overrides the time window
entirely — a report bearing the armed pid is `EXPECTED_RESTART_STOP` no matter
how late it arrives, and a report bearing any other pid is always `CRASH`, even
inside the window. `BbjLanguageServer#stop()` is the only place that actually
knows the OS pid of the process being stopped (via `getPid()`), so it now hands
that pid to a new `BbjServerService#noteStoppingPid(Long)`, which forwards it to
the guard's `notePid`. `doRestart()`'s `finally` block no longer calls
`expectedStop.disarm()` unconditionally — pid mismatch, not the token's
armed/disarmed state, is what protects a genuine crash of the newly started
server from being swallowed. Requires human verification: this is a concurrency
correctness fix (pid-correlation logic); the full IntelliJ suite (1132 tests, 0
failures) exercises the classifier's edge cases directly, but the live
delayed-old-process-exit race itself is not reproducible in a unit test and
should be spot-checked in a real IDE session per the phase's UAT scenarios.

### WR-01: Arming the guard is gated on a possibly-stale `getServerStatus()` read

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`
(same commit as CR-02, `0a1633c7`, since both findings sit in the identical
`doRestart()` hunk and cannot be split without an intermediate broken state)
**Commit:** `0a1633c7`
**Applied fix:** Removed the `statusBeforeStop == started/starting/stopping`
conditional around `expectedStop.arm(...)` — `doRestart()` now arms
unconditionally before every `manager.stop(...)` call, as the review's fix
suggested. The token remains one-shot and self-disarming (via pid mismatch, per
CR-02's fix), so there is no cost to arming when it turns out not to be needed,
and a stale status read can no longer leave a genuine expected stop unguarded.

### WR-02: The 30-second crash window is duplicated as independent, un-linked literals

**Files modified:**
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java`
**Commit:** `1099c119` (plus the `ExpectedStopGuard.DEFAULT_WINDOW_MS`
cross-reference comment, which landed in the CR-02/WR-01 commit `0a1633c7`
since it sits in the same contiguous hunk as the pid-correlation rework)
**Applied fix:** Widened `BbjServerService.CRASH_WINDOW_MS` from `private` to
package-visible (it already shares the `ui` package with both UI classes), and
changed the editor-banner text and the status-bar tooltip to build their
"crashed again within N seconds" string from `CRASH_WINDOW_MS / 1000` instead
of a hardcoded `"30 seconds"` literal. Added a Javadoc comment on
`ExpectedStopGuard.DEFAULT_WINDOW_MS` cross-referencing `CRASH_WINDOW_MS`,
documenting that the two constants gate different decisions but their shared
value is a deliberate choice. Left `documentation/docs/intellij/features.md`
unchanged per the maintainer's instruction — its "30 seconds" prose already
matches the constant.

## Skipped Issues

None — all four in-scope findings were fixed.

## Verification

- **Where the gates ran:** the isolated worktree
  `bbj-language-server/.claude/worktrees/rf-108-4009816-1790348849` (on branch
  `gsd-reviewfix/108-4009816`, fast-forwarded onto
  `gsd/v4.6-user-facing-bug-burndown` by the cleanup tail), not the main
  checkout — the worktree has no separately-installed `node_modules`, but the
  IntelliJ plugin's Gradle build does not depend on the VS Code extension's
  `node_modules` tree, so this did not block any gate. The numbers below are
  reproducible by checking out `gsd-reviewfix/108-4009816` (or, after the
  fast-forward, the same commits on `gsd/v4.6-user-facing-bug-burndown`) and
  re-running the same command from `bbj-intellij/`.
- `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --console=plain`
  → **BUILD SUCCESSFUL**, **1132 tests, 0 failures, 0 errors, 0 skipped**
  (aggregated from every `build/test-results/test/TEST-*.xml`), run twice: once
  with all four fixes applied in a single working-tree pass, and again after
  restructuring into the three atomic commits below, to confirm the split
  reproduced the identical combined diff and an identical passing result.
- Register-check (`git diff bdacbcd2..HEAD -- bbj-intellij documentation | grep
  -nE '\b(CR|WR|IN)-[0-9]{2}\b|\bD-[0-9]{2}\b|\bLIFE-0[0-9]\b|\b108-[0-9]{2}\b|Pitfall
  [0-9]'`) → empty output, no planning identifiers leaked into source, test or
  doc text.

## Commits

| Finding(s) | Commit | Files |
|---|---|---|
| CR-01 | `9ba84bc7` | `BbjServerService.java` |
| CR-02, WR-01 | `0a1633c7` | `ExpectedStopGuard.java`, `BbjServerService.java`, `BbjLanguageServer.java`, `ExpectedStopGuardTest.java`, `BbjServerServiceRestartSourceGuardTest.java` |
| WR-02 | `1099c119` | `BbjServerService.java`, `BbjStatusBarWidget.java`, `BbjServerCrashNotificationProvider.java` |

---

_Fixed: 2026-09-25T15:20:31Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## Orchestrator correction (after the fixer returned)

The CR-02 fix as first committed (`0a1633c7`) removed the disarm from `doRestart` entirely, so
the guard stayed armed after every clean restart. LSP4IJ calls `BbjLanguageServer#stop()` for a
crashed server before the crash is reported, and `notePid` then re-targeted that stale token
onto the crashed pid — the next kill after any Settings Apply, manual restart or config reload
would have been classified as an expected restart stop. Corrected in `b491c26f`: `doRestart`
disarms when its stop completed in time (only a timed-out stop keeps the token and its pid), and
`notePid` keeps only the first pid noted after arming. New guard test
`notePidKeepsTheFirstNotedPidSoALaterStopCannotRetargetTheToken`; the restart source guard now
requires exactly one disarm, inside `if (stoppedInTime)`. IntelliJ suite: BUILD SUCCESSFUL,
1133 tests, 0 failures, 0 errors.
