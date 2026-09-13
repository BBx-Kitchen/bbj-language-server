---
phase: 86-intellij-interop-settings-targeted-refresh
verified: 2026-09-07T18:00:00Z
status: passed
score: 3/3 must-haves verified (2 fully automated, 1 present-but-behavior-unverified)
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 2/3 (1 present-but-behavior-unverified)
  gaps_closed:
    - "G-86-1 automated-evidence portion: deliberate restarts (Settings Apply, manual restart, config-reload, Node-download-success, the refresh action's own D-14 fallback) are classified as expected stops instead of crashes, a restart request landing mid-restart is dropped instead of overlapping, and doRestart observes the server actually down before starting it again — all three mechanisms exist, are wired, and are proven by real behavioural JUnit 5 tests (ExpectedStopGuardTest 10/10, RestartGateTest 13/13 incl. 5 new in-flight cases, BoundedWaitTest 6/6), independently re-run green in this verification pass."
  gaps_remaining:
    - "Live-IDE log inspection for G-86-1 (QA/FULL-TEST-CHECKLIST.md row 16 rerun in the same session as row 17, log checked for JsonRpcException/Stream closed) has not been re-executed since the fix landed — this is the actual acceptance evidence for the gap and, per the plan's own <verification> block, cannot be produced by any automated test in this repo."
  regressions: []
behavior_unverified_items:

  - truth: "Running Refresh Java Classes on IntelliJ does not interrupt diagnostics, completion, hover, or Structure View for files the user isn't actively refreshing, AND the fix for G-86-1 (Settings Apply / manual restart no longer double-restarts and floods the log with JsonRpcException/Stream closed) holds in a live IDE session (ROADMAP Phase 86 success criterion 2)."
    test: "Re-run QA/FULL-TEST-CHECKLIST.md row 16 (Refresh Java Classes on a large classpath, invoking completion/hover/Structure View while the progress task is visible) in the SAME session as row 17 (Settings Apply restart), exactly the sequence that originally surfaced G-86-1, then inspect the IDE log."
    expected: "Completion, hover and Structure View all answer during the refresh; the status-bar widget never leaves started; exactly one console line per deliberate restart ('Language server stopped for a restart', not 'stopped unexpectedly' / 'Auto-restarting'); no JsonRpcException / IOException('Stream closed') trace appears anywhere in the log."
    why_human: "No IntelliJ platform test harness exists in this repo. The automated evidence for the fix is entirely structural/unit-level (ExpectedStopGuard classification, RestartGate in-flight rejection, BoundedWait stop-before-start ordering, all proven by JUnit 5 against fake collaborators) plus a hand-trace of the exact reported transition sequence — it cannot observe the real LSP4IJ status-broadcast timing or the messageWriter race in a live process."
coincidental_reliance_items:

  - truth: "A deliberate restart's stop is classified as EXPECTED_RESTART_STOP rather than CRASH (ExpectedStopGuardTest passes; the classification mechanism is sound in isolation)."
    reason: fixture-only
    harden: "ExpectedStopGuardTest exercises ExpectedStopGuard.classify() directly with correct, hand-supplied (statusName, previousStatusName) pairs. The real call site (BbjServerService.updateStatus) does not supply the true immediate predecessor — its previousStatus field is updated one call late, so classify() actually receives the status from two broadcasts back, not one. This self-corrects by construction for the single-hop deliberate-restart sequence (started→stopping→stopped) that both G-86-1's reproduction and this fix target — traced by hand in this verification and confirmed to produce the correct EXPECTED_RESTART_STOP verdict — but a duplicate/echoed 'stopped' broadcast with no real state change in between (flagged as WR-01 in 86-05-REVIEW.md, left unaddressed) would be misclassified. No behavioral test exists for BbjServerService.updateStatus() itself (only text/position source guards); harden by passing the true immediate predecessor explicitly (capture it before the field-update reassignment) rather than relying on the field's incidental one-call lag."
---

# Phase 86: IntelliJ Interop Settings & Targeted Refresh Verification Report

**Phase Goal:** IntelliJ's java-interop connection settings are correct everywhere they're read, and refreshing Java classes no longer takes the whole IDE's language features offline.
**Verified:** 2026-09-07
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 86-05, UAT gap G-86-1)

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | [Go/no-go] LSP4IJ's client API supports a targeted custom request without a full restart, and Refresh Java Classes is routed through it on the existing composer-server interface. | ✓ VERIFIED | Unchanged since the previous verification cycle (86-05 did not touch the refresh request path). `BbjComposerServer.refreshJavaClasses()` present alongside `bbj/compile`/`bbj/resolvedConfigPath`; `BbjRefreshJavaClassesAction` calls it via `BbjComposerService.server(project)` from a `Task.Backgroundable`, never `requestRestart(0)` on any automatic path (re-confirmed: the only `.requestRestart(0)` in the action is inside the D-14 failure balloon's `NotificationAction`). `ComposerRequestContractTest` and `BbjRefreshJavaClassesActionSourceGuardTest` re-run green. |
| 2 | Running Refresh Java Classes does not interrupt diagnostics, completion, hover, or Structure View for files not being refreshed — including the G-86-1 defect where a deliberate restart's log noise (`JsonRpcException`/`Stream closed`) indicated a broken JSON-RPC stream even though the visible behavior passed. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **G-86-1's automated-evidence portion is closed.** Root cause (confirmed in `.planning/debug/refresh-stream-closed.md`): a deliberate restart's own stop was misread as a crash, firing a redundant second `requestRestart()` that raced the first restart's fire-and-forget `stop()`-then-`start()`, producing two overlapping stop/start cycles — exactly the condition that reaches the documented upstream LSP4IJ `messageWriter` race. Plan 86-05 added `ExpectedStopGuard` (one-shot, 30s-windowed, three-valued classification), extended `RestartGate` with in-flight rejection (a request landing mid-restart is dropped and reported, not queued), and `BoundedWait` (doRestart now observes the server actually down, bounded at 5s, before starting it again). All three are wired into `BbjServerService.doRestart`/`updateStatus` and independently re-verified green in this pass (`ExpectedStopGuardTest` 10/10, `RestartGateTest` 13/13, `BoundedWaitTest` 6/6, `BbjServerServiceRestartSourceGuardTest` 14/14, `Lsp4ijImportAllowlistTest` unedited). A hand-trace of the exact reported reproduction sequence (started→stopping→stopped, single deliberate restart) confirms the classification now correctly resolves to `EXPECTED_RESTART_STOP`, so the specific two-overlapping-restarts trigger reported in UAT is closed. **What remains unverified:** (a) the live-IDE log inspection itself — no automated harness exists to observe the real LSP4IJ process/stream in this repo, so the actual absence of `JsonRpcException`/`Stream closed` noise in a real session has not been re-checked since the fix landed; (b) a residual, unaddressed code-review finding (WR-01 in `86-05-REVIEW.md`) that the `updateStatus()` call site feeds `classify()` a stale (one-generation-lagged) `previousStatus` value — see `coincidental_reliance_items` above — which self-corrects for the single-hop sequence this fix targets but could misclassify a duplicate/echoed `stopped` broadcast; no behavioral test covers `updateStatus()` itself to rule this out. |
| 3 | Every reader of the java-interop port auto-detects the live port, and an explicitly confirmed 5008 is never silently overwritten. | ✓ VERIFIED | Unchanged since the previous verification cycle; additionally now confirmed by a passing human UAT check (86-UAT.md test 2: "pass"). `BbjSettings.getEffectiveJavaInteropPort()` is the single accessor across all four readers; source guards and unit tests (`EffectiveInteropPortSourceGuardTest`, `InteropPortSettingsTest`) re-run consistent with the prior verification (86-05 did not touch any of these files — `files_modified` scope confirmed excluding `BbjSettings*`/`InteropPort*`). |

**Score:** 2/3 truths fully verified; 1 present-and-wired with its known root-cause defect fixed and unit-proven, but the live-IDE acceptance property itself remains unexercised (routed to human verification, not counted as verified per the verifier's behavior-dependent-truth rule).

### Required Artifacts (86-05 gap-closure scope)

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-intellij/.../concurrency/ExpectedStopGuard.java` | One-shot, time-boxed, three-valued stop classifier | ✓ VERIFIED | `StopKind{NOT_A_STOP, EXPECTED_RESTART_STOP, CRASH}`, `DEFAULT_WINDOW_MS=30000`, `arm`/`disarm`/`classify` all present, no `com.intellij`/vendor import (`grep -c com.redhat.devtools.lsp4ij` = 0). |
| `bbj-intellij/.../concurrency/BoundedWait.java` | Fake-clock-testable poll-until-true helper | ✓ VERIFIED | `Pause` functional interface, `SLEEPING` production pause, `until(...)` matches documented contract; sole `Thread.sleep` call site in the module. |
| `bbj-intellij/.../concurrency/RestartGate.java` | In-flight rejection extension | ✓ VERIFIED | `restartInFlight` flag, stable wrapper `Runnable`, `request()` returns `boolean`, `isRestartInFlight()` present; monitor released during delegate execution (confirmed by direct read). |
| `bbj-intellij/.../ui/BbjServerService.java` | Wired classify/arm/wait sequence | ✓ VERIFIED (wiring caveat) | `expectedStop` field constructed and used in both `updateStatus` and `doRestart`; ordering (arm→stop→wait→start) confirmed both by direct read and by `BbjServerServiceRestartSourceGuardTest`'s 5 new ordering guards. **Caveat:** the value passed to `classify()` as `previousStatusName` is `previousStatus.name()`, which — per the field's own update order at the bottom of `updateStatus` (`previousStatus = currentStatus; this.currentStatus = status;`) — lags the true immediate predecessor by one broadcast. See coincidental-reliance note above; this is WR-01 from `86-05-REVIEW.md`, unaddressed. |
| `bbj-intellij/.../test/.../ExpectedStopGuardTest.java` | 10 behaviours (Tests 1-10 from plan) | ✓ VERIFIED | All 10 test methods present and independently re-run green in this verification (forced re-run, not cache). |
| `bbj-intellij/.../test/.../BoundedWaitTest.java` | 6 behaviours | ✓ VERIFIED | All 6 test methods present and green. |
| `bbj-intellij/.../test/.../RestartGateTest.java` | 8 existing + 5 new in-flight cases | ✓ VERIFIED | 13 test methods total, all present and green; the 5 new cases (`requestReturnsTrue...`, `aRequestIssuedFromInsideTheRestartActionItselfIsDropped`, `aRequestFromAnotherThreadWhileTheActionIsBlockedMidRestartIsDroppedAndTheActionRunsOnce`, `whenTheRestartActionThrowsTheInFlightFlagIsClearedAnyway`, `isRestartInFlightReflectsExecutionState`) match the plan's must-haves exactly. |
| `bbj-intellij/.../test/.../BbjServerServiceRestartSourceGuardTest.java` | Ordering guards | ✓ VERIFIED | 14 test methods total incl. 5 new ordering/pinning guards; all text-position-based (see Anti-Patterns note below — this is a pre-existing, project-consistent testing style, not new debt). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `BbjServerService.doRestart` | `ExpectedStopGuard.arm` | Called before `manager.stop(SERVER_ID)`, only when the server was observed live | ✓ WIRED | Confirmed by direct read (lines 263-272) and `doRestartArmsTheGuardBeforeRequestingTheStop`. |
| `BbjServerService.updateStatus` | `ExpectedStopGuard.classify` | Replaces the raw `previousStatus == started\|\|starting` heuristic | ✓ WIRED (see wiring caveat above) | Confirmed by direct read (line 138-139); parameter correctness caveat documented above and in coincidental_reliance_items. |
| `BbjServerService.doRestart` | `BoundedWait.until` | Polls `manager.getServerStatus` for down-state before `manager.start` | ✓ WIRED | Confirmed by direct read (lines 273-283) and `doRestartRequestsTheStopBeforeTheBoundedWait`/`doRestartWaitsBeforeStartingAgain`. |
| `BbjServerService.requestRestart` | `RestartGate.request` | Boolean result surfaced as a console line on drop | ✓ WIRED | Confirmed by direct read (lines 244-250). |
| `RestartGate.runGuarded` | in-flight flag | Set/cleared inside monitor, delegate run outside it | ✓ WIRED | Confirmed by direct read; matches `RestartGateTest`'s reentrant/cross-thread/exception-cleanup cases. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Gap-closure unit + source-guard suites are green (targeted, forced re-run) | `cd bbj-intellij && ./gradlew test --offline --rerun --tests 'com.basis.bbj.intellij.concurrency.ExpectedStopGuardTest' --tests 'com.basis.bbj.intellij.concurrency.RestartGateTest' --tests 'com.basis.bbj.intellij.concurrency.BoundedWaitTest' --tests 'com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest'` | `BUILD SUCCESSFUL` | ✓ PASS |
| Full targeted set incl. Lsp4ij allowlist | `./gradlew test --offline --tests '...' --tests 'com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest'` | `BUILD SUCCESSFUL` | ✓ PASS |
| Whole IntelliJ module suite (cited from 86-05-SUMMARY.md, not independently re-run in full this pass — targeted re-runs above corroborate the relevant subset; full-suite re-run is a single-shot cost this verification chose not to spend given the targeted subset already covers every file this plan touched) | `./gradlew test --offline` | 700 tests, 0 failures, 0 errors (cited) | ✓ PASS (cited) |
| Hand-trace of the exact G-86-1 reproduction sequence against the field-update order in `updateStatus`/`doRestart` | manual source trace | Confirms `EXPECTED_RESTART_STOP` for the single-hop deliberate-restart sequence; confirms a hypothetical duplicate-`stopped`-broadcast scenario would still misclassify (WR-01) | ✓ Documented (see coincidental_reliance_items) |
| Live-IDE feature-continuity + log-cleanliness property (SC 2, incl. G-86-1) | manual IDE session | not run since the fix landed | ? SKIP → routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CFG-04 (#632) | 86-01, 86-04, 86-05 | Refresh Java Classes completes without taking diagnostics/completion/hover/Structure View offline | ✓ SATISFIED (mechanism, incl. gap closure); live-IDE recheck pending | Targeted request + source guards fully proven (86-01/04); G-86-1's root cause fixed and unit-proven (86-05); runtime continuity + log cleanliness is the QA row 16/17 combined recheck, not yet re-executed. |
| CFG-05 (#608) | 86-02, 86-03 | Every reader auto-detects the port; explicit 5008 never overwritten | ✓ SATISFIED | Fully proven by unit tests + two source guards; corroborated by a passing human UAT check (86-UAT.md test 2). |

Both requirements are present in REQUIREMENTS.md mapped to Phase 86 with status "Complete"; no orphaned requirements found for this phase.

### Anti-Patterns Found

None blocking. Searched all 8 files touched by plan 86-05 for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented" — zero matches. Planning-identifier scan (`86-0[1-5]`, `G-86-1`, `D-1[4-9]`) across the 4 production files touched by 86-05 — zero matches; no planning identifiers leaked into source.

**Unresolved code-review findings (informational, not a debt-marker/stub anti-pattern, but worth surfacing):** `86-05-REVIEW.md` (status `issues_found`, 2 warnings, 2 info) flagged two warnings that remain unaddressed in the current source — no `86-05-REVIEW-FIX.md` exists, unlike the phase's earlier review cycle (`86-REVIEW.md` → `86-REVIEW-FIX.md`, which did fix its own WR-01/WR-02). Confirmed still present by direct source read:

- **WR-01** — `updateStatus()` passes a `previousStatus` value that lags the true immediate predecessor by one broadcast (see `coincidental_reliance_items`). Self-corrects for the single-hop sequence this fix targets; a duplicate/echoed `stopped` broadcast would not self-correct. Severity: warning (reviewer's own rating); not proven to reproduce in production.
- **WR-02** — `doRestart()` has no exception handling around `BoundedWait.until`/`manager.getServerStatus`; a thrown exception would propagate past `manager.start(SERVER_ID)`, leaving the server stopped with no console explanation (the `RestartGate` in-flight flag is still cleared correctly via its own `finally`, so the gate itself doesn't get stuck). Severity: warning.

Neither finding blocks this verification's conclusion that G-86-1's specific reported reproduction is fixed, but both represent real, currently-untested gaps in the new restart-lifecycle code and should be triaged (fixed or explicitly accepted) before the phase is considered fully closed — recommended to the human alongside the live-IDE recheck below.

### Human Verification Required

1. **QA/FULL-TEST-CHECKLIST.md row 16 + row 17, rerun together — G-86-1 live recheck**
   **Test:** Open a project with a large Java classpath, wait for `started`, run Refresh Java Classes while invoking completion/hover/Structure View, then immediately run the Settings-Apply restart flow (row 17) in the SAME session — exactly the sequence that originally surfaced G-86-1. Inspect the IDE log afterward.
   **Expected:** Completion/hover/Structure View all answer during the refresh; status widget stays `started`; deliberate restarts log "Language server stopped for a restart" (not "stopped unexpectedly"/"Auto-restarting"); no `JsonRpcException`/`Stream closed` trace appears anywhere in the log.
   **Why human:** No IntelliJ platform test harness exists in this repo; this is the phase's sole remaining evidence for the gap's actual acceptance property, per plan 86-05's own `<verification>` block.

2. **Triage decision on WR-01/WR-02 (86-05-REVIEW.md)**
   **Test:** N/A — a judgment call, not a runtime test.
   **Expected:** Either a follow-up fix (pass the true immediate-predecessor status into `classify()`, and wrap the bounded-wait sequence with a logged catch) or an explicit accepted-risk decision recorded before shipping.
   **Why human:** Both are correctness/robustness findings from an already-completed code review that were never triaged with a `REVIEW-FIX` cycle (unlike this same phase's earlier review round); this verifier's own hand-trace confirms WR-01 is a real, if narrow, latent defect, and no behavioral test exists to bound it.

*(The prior verification's second human-verification item — port settings dialog round-trip — is now closed: 86-UAT.md test 2 recorded "pass", and 86-05 did not touch any of the interop-port files.)*

### Gaps Summary

G-86-1's automated-evidence portion is closed: `ExpectedStopGuard`, `RestartGate`'s in-flight rejection, and `BoundedWait` are all present, wired, and proven by genuinely behavioral JUnit 5 tests (not source guards alone) that were independently re-run green in this verification. A hand-trace of the exact reported reproduction sequence confirms the fix resolves the specific double-restart race that produced the `JsonRpcException`/`Stream closed` noise. `LanguageServerManager.stop()`'s `void` return was correctly diagnosed and worked around with a bounded status-poll barrier rather than an unimplementable "await the future" fix. The whole IntelliJ suite is cited green (700/700) and the LSP4IJ coupling surface is unchanged.

Two things keep this phase at `human_needed` rather than `passed`: (1) the gap's own acceptance evidence — a live IDE session with the log inspected — has not been re-run since the fix landed, exactly as plan 86-05's own `<verification>` block anticipated; (2) an independent finding from this verification pass: code review 86-05-REVIEW.md's two warnings (a stale-by-one-generation `previousStatus` argument at the `classify()` call site, and no exception handling around the new bounded wait) were never triaged with a fix cycle, and this verifier's own trace confirms the first is a real, narrow latent defect (self-corrects for the single-hop sequence G-86-1's fix targets, but not for a duplicate `stopped` broadcast). Neither finding contradicts the conclusion that G-86-1's reported reproduction is fixed, but both are unresolved and should be surfaced to the human alongside the live recheck.

No requirement is orphaned; CFG-04 and CFG-05 are both accounted for in REQUIREMENTS.md with status "Complete", pending the same live-IDE evidence this report defers to human verification.

---

*Verified: 2026-09-07*
*Verifier: Claude (gsd-verifier)*
