---
phase: 108-intellij-crash-detection
verified: 2026-09-25T15:35:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 108: IntelliJ Crash Detection Verification Report

**Phase Goal:** When the language server process dies or its connection drops, the IntelliJ
plugin notices it, logs it and reflects it in the server status. It never mistakes one of
LSP4IJ's normal stops for a crash, and the status log prints the real transitions.
**Verified:** 2026-09-25T15:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria 1-4)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Killing the language-server process or dropping its connection is logged as a crash and reflected in server status, evidenced by a real `idea.log` excerpt | ✓ VERIFIED | `BbjLanguageServer.onUnexpectedStop` → `BbjServerService.reportUnexpectedExit` → `applyCrashPolicy` (code, read directly). Real macOS excerpt in `108-UAT-ARTIFACTS.md` Scenario 1 (S1.1-S1.9): WARN `process exited unexpectedly (pid 20443, exit code 137); auto-restarting (1 of 1)` at 16:27:33.130, widget `BBj: Crashed` → `BBj: Ready`, no banner/balloon on first crash |
| 2 | LSP4IJ's deliberate stops and the plugin's own restarts are never classified as crashes and trigger no automatic restart | ✓ VERIFIED | Code: `ExpectedStopGuard.classifyExit(long, Long)` — pid-correlation is authoritative when both sides carry a pid (`0a1633c7`, corrected `b491c26f`); `doRestart()` arms unconditionally before every `manager.stop()` and disarms only when the stop completed in time (`if (stoppedInTime) { expectedStop.disarm(); }`, guard-pinned by `BbjServerServiceRestartSourceGuardTest`: exactly one disarm, gated inside `if (stoppedInTime)`). Real excerpt: Scenarios 3-7 show no `exited unexpectedly` for close-last-file, close-project, Settings Apply, manual restart and config reload (S3.4, S4.2, S5.11, S6.11, S7.11, all "observed absent") |
| 3 | Every server status transition log line shows the real previous status, never a value two transitions old | ✓ VERIFIED | Code: `updateStatus` logs `currentStatus + " -> " + status` before `this.currentStatus = status;` runs (the stale `previousStatus` field was removed in 108-01). UAT "Criterion 3 check" section confirms the from-state chain holds with no gap across the entire ~27-minute session, including both crash windows, the LSP4IJ double-start race and the 16:52:47 config-reload restart |
| 4 | One build carrying both changes (LIFE-01, LIFE-02) passes a hand UAT in a running IntelliJ on macOS | ✓ VERIFIED | Final UAT (all 7 scenarios) ran and passed on commit `d6bc0404` (pre-review-fix). Code-review fixes (`9ba84bc7`, `0a1633c7`/`b491c26f`, `1099c119`) then changed the exact mechanism criterion 2 depends on (pid-correlation, unconditional-arm, timely-disarm). Both distributables were rebuilt from `36a00773` and the maintainer ran a cursory but real re-check on that rebuilt zip — Settings Apply (no crash), manual Restart then a kill within 30 s (Crashed → auto-restart → Ready, no banner), a second kill (banner + balloon, banner Restart back to Ready) — and approved on 2026-09-25. Per the orchestrator's explicit direction this cursory UI-only re-check stands as the human verification for the final tree |

**Score:** 4/4 ROADMAP criteria verified, plus 3 supporting must-haves below — 7/7 total.

### Supporting Must-Haves (plan frontmatter, cross-plan)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | The crash auto-restart keeps the counter across a successful restart, so a second crash within 30 s still gives up | ✓ VERIFIED | `applyCrashPolicy`'s first-crash branch calls `requestGatedRestart(CRASH_RESTART_DELAY_MS)` directly (not `requestRestart`, which clears state); guard-pinned (`BbjServerServiceRestartSourceGuardTest`). Live evidence: Scenario 2 (S2.1-S2.2) — crash 2 gives up even though the LSP4IJ double-start at 16:27:44 reached `started` in between |
| 6 | `crashCount`/`serverCrashed`/`autoRestartAbandoned` writes are EDT-only, including from `clearCrashState()` reached off the EDT | ✓ VERIFIED | `clearCrashState()` dispatches all three field writes through `invokeLater` (`9ba84bc7`, CR-01 fix); `requestRestart` chains `requestGatedRestart` through a second `invokeLater` to preserve "cleared before restart runs" ordering. Whole suite green (1133 tests) after this change |
| 7 | Register check: no planning identifiers (D-NN, LIFE-NN, 108-NN, CR/WR/IN-NN, "Pitfall N") leaked into phase-changed source/test/doc text | ✓ VERIFIED | `git diff 92ad80d7^..HEAD -- bbj-intellij documentation \| grep -nE '...'` — no output |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/java/.../lsp/BbjLanguageServer.java` | unexpected-stop hook, `stop()` INFO line, `noteStoppingPid` forwarding | ✓ VERIFIED | Read in full; hook forwards to `super` first then registers own handler once; `onUnexpectedStop` reports to `BbjServerService.reportUnexpectedExit`; `stop()` logs and calls `noteStoppingPid(pid)` before `super.stop()` |
| `bbj-intellij/src/main/java/.../ui/BbjServerService.java` | crash policy, restart split, EDT dispatch | ✓ VERIFIED | Read in full; matches 108-02/108-03/REVIEW-FIX descriptions exactly, including the `b491c26f` correction (`if (stoppedInTime) { expectedStop.disarm(); }`) |
| `bbj-intellij/src/main/java/.../concurrency/ExpectedStopGuard.java` | pid-correlation filter, plain Java | ✓ VERIFIED | Read in full; `classifyExit(long, Long)` — pid identity overrides the time window; no `com.intellij`/LSP4IJ imports |
| `bbj-intellij/src/main/java/.../ui/BbjStatusBarWidget.java` | `BBj: Crashed` state, window-derived tooltip | ✓ VERIFIED | `isServerCrashed()`/`isAutoRestartAbandoned()` read before the `ServerStatus` switch; tooltip built from `BbjServerService.CRASH_WINDOW_MS / 1000` (WR-02 fix) |
| `bbj-intellij/src/main/java/.../ui/BbjServerCrashNotificationProvider.java` | banner gated on give-up only | ✓ VERIFIED | `buildPanel` gates on `isAutoRestartAbandoned()`; banner text derived from `CRASH_WINDOW_MS` |
| `documentation/docs/intellij/features.md` | Crashed widget state, banner trigger wording | ✓ VERIFIED | `**Crashed**` bullet and reworded `**Server Crash**` bullet present, matching the 30-second constant |
| `.planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md` | probe + Final UAT + post-review rebuild sections | ✓ VERIFIED | All sections present: Probe build, Final UAT (7 scenarios, 81 rows all marked observed/derived/missing, verdict pass), Post-review rebuild and cursory UAT (maintainer approved) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BbjLanguageServer.onUnexpectedStop` | `BbjServerService.reportUnexpectedExit` | direct call, disposed-guarded, `RuntimeException`-caught | ✓ WIRED | Confirmed by direct read |
| `BbjServerService.reportUnexpectedExit` | `ExpectedStopGuard.classifyExit(now, pid)` | consulted on calling thread before the `invokeLater` hop | ✓ WIRED | Confirmed by direct read |
| `BbjLanguageServer.stop()` | `BbjServerService.noteStoppingPid` → `ExpectedStopGuard.notePid` | forwards the pid of the process actually being stopped | ✓ WIRED | Confirmed by direct read; `notePid` keeps only the first pid noted after arming (guards against re-targeting onto a later, crashed pid) |
| `BbjServerService.applyCrashPolicy` (republish) | `BbjStatusBarWidget` / `BbjServerCrashNotificationProvider` | `BbjServerStatusListener.TOPIC` → `invokeLater` render | ✓ WIRED | Confirmed by direct read of `applyCrashPolicy`'s trailing topic publish and both UI classes' flag reads |

### Behavioral Spot-Checks / Test Evidence

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Whole IntelliJ suite (fresh, `--rerun-tasks`) | `cd bbj-intellij && ./gradlew test --rerun-tasks --console=plain` | BUILD SUCCESSFUL; 1133 tests aggregated from `build/test-results/test/*.xml`, 0 failures, 0 errors | ✓ PASS |
| `ExpectedStopGuard` pid-correlation classifier (behavioral, not just structural) | unit tests `classifyExitWithAMatchingPidPastTheWindowIsStillAnExpectedRestartStop`, `classifyExitWithAMismatchedPidInsideTheWindowIsStillACrash`, `notePidKeepsTheFirstNotedPidSoALaterStopCannotRetargetTheToken`, `disarmDropsTheArmedPidToo` | present and passing (part of the 1133) | ✓ PASS |
| Register check (planning-ID leak) | `git diff 92ad80d7^..HEAD -- bbj-intellij documentation \| grep -nE '...'` | no output | ✓ PASS |
| Debt-marker scan on phase-changed files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER..."` over the 8 main source/doc files | no matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| LIFE-01 | 108-01, 108-02, 108-03, 108-04 | Plugin recognizes a dead process/dropped connection as a crash instead of it going unnoticed | ✓ SATISFIED | Truths 1, 2, 5, 6 above; ROADMAP criteria 1, 2, 4 |
| LIFE-02 | 108-01, 108-04 | Status transition log line shows the real previous status | ✓ SATISFIED | Truth 3 above; ROADMAP criterion 3 |

Note: `.planning/REQUIREMENTS.md` still shows LIFE-01/LIFE-02 as unchecked `[ ]`. Per this
phase's own plans ("the phase verifier closes them"), the checkbox flip is intentionally left to
the orchestrator/ship step, not made by this verifier (instructed not to edit REQUIREMENTS.md).
Evidence above supports flipping both to `[x]`.

No orphaned requirements: REQUIREMENTS.md maps only LIFE-01 and LIFE-02 to Phase 108, and both
are declared in plan frontmatter (108-01/108-02 declare LIFE-01/LIFE-02 jointly per plan, 108-03
declares LIFE-01, 108-04 declares both).

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, no empty stub implementations, in any of
the phase's 16 changed source/test/doc files.

### Code Review Follow-Through

`108-REVIEW.md` found 2 critical + 2 warning issues (CR-01, CR-02, WR-01, WR-02), all in the
crash-detection/restart-race mechanism. `108-REVIEW-FIX.md` records all four fixed; the
orchestrator's own post-fix correction note (CR-02's first pass left the guard armed after every
clean restart — a regression) was itself caught and corrected in `b491c26f`. Direct source
reading in this verification confirms the *corrected* final state (conditional disarm on
`stoppedInTime`, pid-scoped `notePid` that only sticks on the first call after arming) — not just
the fix report's narrative.

### Human Verification

None required beyond what has already been completed. The maintainer's cursory post-fix UI
re-check (Settings Apply, manual-restart-then-kill, second-kill-within-30s) exercised exactly the
mechanism the code review fixes changed (unconditional arm, timely-disarm, pid correlation via the
manual-restart-then-crash path) and was explicitly approved. Per the verification brief this
stands as the human-verification evidence for the final tree; it is not treated as a gap or routed
to a new human-verification item.

### Gaps Summary

None. All ROADMAP success criteria 1-4 are met with either direct code evidence, real macOS
`idea.log` excerpts, or the maintainer's explicit post-fix approval. The one recorded UAT
deviation (S7.8, an over-specific expected log line) was explicitly ruled non-failing by the
maintainer at UAT time and is not re-litigated here. The whole IntelliJ suite is green (1133
tests, fresh `--rerun-tasks` run), and the register check confirms no planning-identifier leakage
into shipped source, test or doc text.

---

_Verified: 2026-09-25T15:35:00Z_
_Verifier: Claude (gsd-verifier)_
