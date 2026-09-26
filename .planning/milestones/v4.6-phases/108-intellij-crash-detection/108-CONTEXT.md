# Phase 108: IntelliJ Crash Detection - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

When the language server's Node.js process dies (killed, crashed, or its stdio connection
closed by the process exiting), the IntelliJ plugin detects it, logs it to `idea.log` and the
BBj console, and reflects it in the status-bar widget. LSP4IJ's own deliberate stops (last BBj
file closed, project close, idle shutdown) and the plugin's own restarts (Settings Apply, manual
restart, config reload, Refresh Java Classes fallback) are never classified as crashes and
trigger no automatic restart. Every status transition log line prints the real previous status.

Requirements: LIFE-01, LIFE-02 (they land together). Code: `bbj-intellij/` only. No new
features; each fix stays minimal. A live-but-hung process is not in scope.

</domain>

<decisions>
## Implementation Decisions

### Crash signal source
- **D-01:** The crash signal comes from **LSP4IJ's unexpected-stop hook**, not from the status
  sequence. `BbjLanguageServer` (our `OSProcessStreamConnectionProvider` subclass) overrides
  `addUnexpectedServerStopHandler(Runnable)` so that, besides passing LSP4IJ's handler to
  `super`, it registers its own handler that reports the crash to `BbjServerService`. LSP4IJ's
  `LSPProcessListener.processTerminated` runs these handlers only when the provider's
  `isStopped()` flag is false, i.e. the process ended without `stop()` having been called.
  (Observed in the 0.21.0 bytecode, **not yet observed at runtime**; see D-13.) Pin every vendor
  member this depends on with the coupling canary (`Lsp4ijCouplingCanaryTest`) and keep the
  LSP4IJ import allowlist current.
- **D-02:** "Connection dropped" means **the process exited**. Over stdio a dropped connection
  shows up as the process ending or closing its pipes, which the exit hook covers. A JSON-RPC
  stream EOF while the node process keeps running, and a hung process, are out of scope.
- **D-03:** **The exit signal decides whether something is a crash. `ExpectedStopGuard` only
  filters.** The status feed drives display and logging only. When the hook fires,
  `ExpectedStopGuard` is still consulted. If it was armed by our own `doRestart` within the
  window, the event is logged as an expected stop, not a crash (D-07). `classify()`'s
  status-transition logic must no longer be the crash trigger. Rework or narrow it, and change
  its tests together with the behaviour.
- **D-04:** **Reuse the Phase 97 status-feed move** and rewrite its guards. Re-apply
  `bb0a49f0` (feed `BbjServerService.updateStatus` from the `LSPClientFeatures#handleServerStatusChanged`
  override in `BbjLanguageServerFactory.createClientFeatures()`, so `stopped` is received;
  `BbjLanguageClient`'s override keeps only its console line) and `cb3ce7f8` (coupling canary
  for `LSPClientFeatures#handleServerStatusChanged` / `getProject`). Don't cherry-pick
  `a2680319`'s source guards as they are. Write new guards that pin the new design (one status-feed
  site, one crash-signal site). The `createClientFeatures()` anonymous subclass already carries
  Phase 106's `initializeParams` override, so merge with it and don't replace it.
- **D-05 (LIFE-02):** The transition log line prints the real from-state (`currentStatus` before
  it advances). Remove the stale two-behind `previousStatus` value. Its only other consumer was
  `classify()`, which D-03 takes out of crash detection. Pin the log line with a test (see
  the reverted `626b8fe3`/`d16e7e57` for the earlier one-line fix).

### Crash response policy
- **D-06:** **Keep the existing policy.** After the first crash, auto-restart once through
  `requestRestart(CRASH_RESTART_DELAY_MS)` (the `RestartGate`). After a second crash within
  `CRASH_WINDOW_MS` (30 s), stop auto-restarting, show the balloon (`notifyCrash`) and the editor
  banner.
- **D-07:** **Count crashes within the window, ignoring `started`.** Two crashes within
  30 s mean give up, even if the auto-restart reached `started` in between. Remove the
  reset-on-`started` of `crashCount`. User-initiated restarts (manual action, banner/balloon
  "Restart", Settings Apply, config reload, Refresh Java Classes, Node download success) still
  clear crash state. **Code fact the plan must handle:** `doRestart()` calls `clearCrashState()`
  first, and the crash auto-restart also goes through `doRestart()`, so as written it would
  zero `crashCount` and the window could never be reached. The crash-triggered restart must
  keep the counter. Only user-initiated restarts reset it.
- **D-08:** **Keep `ExpectedStopGuard.arm()` as a second safety net.** Our restarts stop through
  `LanguageServerManager.stop(...)`, which sets the provider's `isStopped` flag, so the hook
  shouldn't fire for them. The armed token covers a race where the process dies during our
  own stop.
- **D-09:** On an unexpected stop, LSP4IJ sets `serverError = ServerWasStoppedException("The
  server was stopped unexpectedly.")`, calls its own `stop(ctx)` and shows its own error
  notification. It does **not** restart immediately; its retry happens lazily on the next
  `start()` (see #1673). **Assume `doRestart`'s `stop(willDisable=false)` + `start()` clears
  `serverError` and the retry counter. Research must confirm this.** If it doesn't, the planner picks the
  least invasive fix that doesn't reach into vendor internals.

### What the user sees
- **D-10:** **The status-bar widget shows a distinct "crashed" state** (label, error icon,
  tooltip) as soon as any crash is detected, including the first one, which is auto-restarted.
  It clears on a successful `started`. This state is separate from the banner flag (D-11), so the
  widget and the banner are driven by separate facts.
- **D-11:** **The first, auto-restarted crash is quiet:** a WARN in `idea.log` and a console
  line only. The editor banner (`BbjServerCrashNotificationProvider`, today gated on
  `isServerCrashed()`) and the balloon appear **only when auto-restart gives up** (2nd crash in
  the window).
- **D-12:** **Accept LSP4IJ's own "stopped unexpectedly" notification** alongside ours. Don't
  suppress it through vendor internals, and list it in the UAT expectations. The idea.log crash
  line is a **WARN carrying the pid and, if the provider can get it without vendor internals,
  the exit code**, for example `BBj language server process exited unexpectedly (pid 12345,
  exit code 137); auto-restarting (1 of 1)`. Log a separate WARN when auto-restart gives up. The
  existing `BBj language server status: X -> Y` INFO line stays (with D-05's real from-state).

### Verification and evidence
- **D-13:** **Probe the runtime behaviour first, then implement.** The first plan ships only the hook
  wiring plus INFO logging (the hook fired, `stop()` was called, and the status feed with real
  from-states), with no change in behaviour. The user installs that build in IntelliJ on macOS,
  runs `kill -9` on the node process, closes the last BBj file and applies settings, then pastes
  the `idea.log` excerpt. Later plans build on the **observed** sequence. If the probe
  contradicts D-01 (the hook doesn't fire on kill, or fires on a normal stop), stop and go back to
  the design before writing more code. This avoids repeating Phase 97.
- **D-14:** **Hand UAT scenarios (macOS)**, run from a freshly built IntelliJ zip (and VSIX)
  built from the final tree after code-review fixes:
  1. `kill -9 <pid>` once → crash WARN, widget shows crashed, auto-restart, back to started,
     no banner.
  2. A second `kill -9` within 30 s → give-up WARN, balloon + banner, no auto-restart.
  3. Close the last BBj file → no crash line, no restart.
  4. Close the project with a BBj file open → no crash line.
  5. Settings Apply → logged as expected, not a crash.
  6. Manual restart action → logged as expected, not a crash.
  7. Refresh Java Classes fallback / config reload → logged as expected, not a crash.
  Get the pid from `pgrep -f main.cjs` or from the new log line. SIGTERM isn't required.
- **D-15:** **Platform and evidence:** macOS only (criterion 4). For each scenario the user
  pastes `grep "BBj language server" idea.log` into `108-UAT-ARTIFACTS.md`, and every expected
  line is marked **observed** or **derived**. No hand-derived trace is accepted as evidence
  (v4.4 standing decision).

### Claude's Discretion
- The exact widget label, icon and tooltip wording for the crashed state (D-10).
- How `ExpectedStopGuard`'s API is reshaped once status classification no longer triggers crashes
  (D-03). Keep it plain Java with no `com.intellij` or LSP4IJ imports, as its javadoc requires.
- How the crash-triggered restart avoids `clearCrashState()` (D-07). For example, a parameter or a
  separate internal entry point, but every restart still goes through `RestartGate`.
- Idle-shutdown coverage: LSP4IJ's idle stop goes through `stop()`, so it's expected to be
  covered by D-01. Unit/guard tests are enough unless the probe (D-13) shows otherwise.

### Folded Todos
- **"A lost language-server connection is invisible to the plugin's crash detection"**
  (`.planning/todos/pending/2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`,
  major). This is LIFE-01. Its 2026-09-20 note (status alone cannot separate a crash from a normal stop)
  is what D-01/D-03 answer.
- **"The server status log line prints a stale previous status"**
  (`.planning/todos/pending/2026-09-20-status-transition-log-prints-a-stale-previous-status.md`,
  minor). This is LIFE-02 and is answered by D-05. Its warning ("do not change the classifier input
  without a test that pins the intended behaviour") still applies.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 108: IntelliJ Crash Detection": goal, the four success
  criteria, planning notes (Phase 97 commits, crash-counter question, LSP4IJ #1672/#1673).
- `.planning/REQUIREMENTS.md`: LIFE-01, LIFE-02.

### Phase 97 attempt (why the status sequence cannot be the signal)
- `.planning/milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-UAT-ARTIFACTS.md`
  Round 1: the real 19-line `idea.log` excerpt showing a killed process arrives as
  `started -> stopping -> stopped`.
- Commits `bb0a49f0` (feed move), `cb3ce7f8` (canary), `a2680319` (guards), reverted in
  `8fe7cb72` + `a22b78ad`; `626b8fe3` / `d16e7e57` (LIFE-02 one-liner + pin, reverted).
- `.planning/todos/pending/2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`
- `.planning/todos/pending/2026-09-20-status-transition-log-prints-a-stale-previous-status.md`

### LSP4IJ behaviour and prior diagnosis
- `.planning/debug/resolved/lsp4ij-upstream-report-draft.md`: LSP4IJ lifecycle notes; the
  client-side callback sees only `stopping`/`started`.
- `.planning/debug/resolved/restart-duplicate-node-launches.md`: restart and duplicate-launch
  diagnosis; RestartGate background.
- `.planning/debug/resolved/bbj-language-server-does-not-s.md`: start/stop diagnosis
  (`willDisable` background for `doRestart`).
- Upstream: https://github.com/redhat-developer/lsp4ij/issues/1672 and /1673
  (`gh api repos/redhat-developer/lsp4ij/issues/<n>`).
- LSP4IJ 0.21.0 jar (`bbj-intellij/build.gradle.kts` pins `com.redhat.devtools.lsp4ij:0.21.0`):
  `server.OSProcessStreamConnectionProvider` (`addUnexpectedServerStopHandler`, `stop`,
  `isStopped`, `getPid`, protected `getProcessHandler`), `server.LSPProcessListener.processTerminated`,
  `LanguageServerWrapper.lambda$start$5` (the wrapper's own unexpected-stop handler).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java`: the
  `OSProcessStreamConnectionProvider` subclass where the hook override goes (D-01). It already has
  a `LOG`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`:
  `updateStatus` (crash branch, counter, `previousStatus` bug), `requestRestart`/`doRestart`
  (arms `ExpectedStopGuard`, calls `clearCrashState()` first), `notifyCrash` balloon,
  `isServerCrashed()`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java`:
  one-shot, time-boxed token (plain Java). Tests in `ExpectedStopGuardTest.java`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java`: every
  restart must go through it.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`:
  `createClientFeatures()` anonymous `LSPClientFeatures` (Phase 106's `initializeParams`
  override lives here), where the status-feed override goes (D-04).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java`: the current
  `handleServerStatusChanged` feed site (it only ever sees `stopping`/`started`).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java`: switches on
  the four `ServerStatus` values. The crashed state goes here (D-10).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java`:
  the editor banner, currently gated on `isServerCrashed()`. Regate it on give-up (D-11).

### Established Patterns
- Vendor coupling is fenced: `Lsp4ijImportAllowlistTest` (allowlist of files importing LSP4IJ)
  and `Lsp4ijCouplingCanaryTest` (reflective pin of the vendor members we depend on).
- Source guards pin structural invariants (`BbjServerServiceRestartSourceGuardTest`). New guards
  must be comment-aware and must not carry planning IDs (Nyquist auditor lesson).
- Plain-Java logic classes with `String` status names, so JUnit covers every branch without the
  platform (`ExpectedStopGuard`, `ConfigReloadPresentation`).
- Status listeners are notified through `BbjServerStatusListener.TOPIC` on the EDT via
  `invokeLater` with `project.isDisposed()` guards.

### Integration Points
- Unexpected-stop handler (runs on a process-listener thread) → `BbjServerService` crash entry
  → counter/guard → `requestRestart` or give-up → widget/banner/balloon on the EDT.
- `LSPClientFeatures#handleServerStatusChanged` → `BbjServerService.updateStatus` (all statuses,
  real from-state logging).

</code_context>

<specifics>
## Specific Ideas

- The probe build (D-13) is its own plan with a user checkpoint: install, kill, close the
  last file, paste `idea.log`. Its excerpt goes into `108-UAT-ARTIFACTS.md` as observed evidence.
- The UAT expectations must list LSP4IJ's own "stopped unexpectedly" notification (D-12) so it
  isn't mistaken for a regression.
- Every "expected:" line in the UAT script is backed by a code path someone has read, and marked
  observed or derived (Phase 97 lesson).

</specifics>

<deferred>
## Deferred Ideas

- Detecting a hung-but-alive server or a stream EOF with a live process (a heartbeat). Out of scope
  under D-02.
- Suppressing LSP4IJ's duplicate crash notification. Only worth revisiting if LSP4IJ offers a
  supported switch.
- Windows kill-scenario UAT (`taskkill /F`). Criterion 4 names macOS only.

### Reviewed Todos (not folded)
- `2026-09-20-phase-97-code-review-follow-ups.md`: Node.js download progress and weak source
  guards. A different area (Node download), not LIFE-01/02.
- `2026-09-20-linking-interop-failures-survive-class-warmup.md`: a server-side test-harness
  issue, unrelated to IntelliJ.

</deferred>

---

*Phase: 108-intellij-crash-detection*
*Context gathered: 2026-09-25*
