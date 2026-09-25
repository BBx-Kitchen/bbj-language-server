# Phase 108: IntelliJ Crash Detection - Research

**Researched:** 2026-09-25
**Domain:** IntelliJ Platform process-lifecycle integration via LSP4IJ 0.21.0 (`OSProcessStreamConnectionProvider`, `LanguageServerWrapper`, `LanguageServerManager`)
**Confidence:** HIGH (every load-bearing claim below is grounded in the pinned LSP4IJ 0.21.0 jar's bytecode, the vendor's upstream source at tag `0.21.0`, this repo's own source, or the real `idea.log` excerpt already captured in Phase 97's UAT artifacts)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)

- Detecting a hung-but-alive server or a stream EOF with a live process (a heartbeat). Out of scope
  under D-02.
- Suppressing LSP4IJ's duplicate crash notification. Only worth revisiting if LSP4IJ offers a
  supported switch.
- Windows kill-scenario UAT (`taskkill /F`). Criterion 4 names macOS only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIFE-01 | When the language-server process dies or its connection drops, the IntelliJ plugin recognizes it as a crash (logged and reflected in the server status), instead of it going unnoticed | §Architecture Patterns (the hook wiring, thread model, exit-code/pid access), §Code Examples (handler override skeleton), §Common Pitfalls (Phase 97's status-sequence trap, the `LanguageServerManager.start()` force-restart interaction) all ground D-01/D-02/D-08/D-09/D-12 |
| LIFE-02 | The server status transition log line shows the real previous status (not one two transitions old); lands together with LIFE-01 | §Common Pitfalls "The stale-from-state bug, traced" walks the exact off-by-one in `BbjServerService.updateStatus`; §Code Examples shows the one-line fix |
</phase_requirements>

## Summary

Phase 97 tried to derive a crash signal from the LSP4IJ status sequence and failed a real macOS
hand UAT: a `kill -9`'d process and a deliberate stop (closing the last file, applying settings)
both arrive at the client as the identical `started -> stopping -> stopped` sequence (captured
verbatim in `.planning/milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-UAT-ARTIFACTS.md`,
lines 376-396). This phase's design (D-01..D-15) abandons the status sequence as the crash
trigger and instead reads LSP4IJ's own **unexpected-stop hook** — `OSProcessStreamConnectionProvider
.addUnexpectedServerStopHandler(Runnable)` — which the vendor's process listener
(`LSPProcessListener.processTerminated`) invokes if and only if the provider's package-private
`stopped` flag is false, i.e. nobody called `provider.stop()` before the OS process died.

Reading the vendor's own `LanguageServerWrapper.java` (fetched at tag `0.21.0` from
`redhat-developer/lsp4ij` and cross-checked against the pinned jar's bytecode via `javap`)
confirms every part of this design end to end: a fresh provider instance is created on every
`LanguageServerWrapper.start()`, so a stale-handler leak between restarts cannot happen; **every**
deliberate stop path — explicit `stop()`, the idle-shutdown timer, `dispose()` on project close —
funnels through the same private `shutdownAll(...)` method, which unconditionally calls
`provider.stop()` (setting the `stopped` flag) even when the process is already dead; and the pid
and exit code are readable from our subclass through public/protected API only
(`OSProcessStreamConnectionProvider.getPid()`, the inherited protected `getProcessHandler()` then
`ProcessHandler.getExitCode()`) — no vendor-internal reflection needed, and the platform's own
bytecode shows the exit code field is written *before* `processTerminated` fires, so it is always
available inside the handler. D-09's assumption about `doRestart`'s `stop()+start()` clearing
`serverError`/`numberOfRestartAttempts` is also confirmed directly from source, and by an
existing coupling-canary assertion already in this repo (`Lsp4ijCouplingCanaryTest
.theStopAndStartOptionDefaultsTheRestartPathDependsOnAreUnchanged`, which pins
`StartOptions.DEFAULT.isForceRestart() == true` — the exact fact that makes the confirmation
work) — see §Architecture Patterns, Finding 3.

Two of the Phase 97 commits reapply cleanly (`git apply --check`, verified this session);
one does not, because Phase 106 inserted a `compilerTrigger` initialization option between the
splice points inside the same anonymous `LSPClientFeatures` body — see §Common Pitfalls,
"bb0a49f0 does not cherry-pick."

**Primary recommendation:** Wire the crash signal as a second `addUnexpectedServerStopHandler`
registration on `BbjLanguageServer` (never replacing LSP4IJ's own), move the status feed from
`BbjLanguageClient` to the `createClientFeatures()` `LSPClientFeatures` override (merged with
Phase 106's existing `initializeParams` override in the same anonymous class), fix the
from-state bug as a pure one-line change in `BbjServerService.updateStatus`, and follow D-13:
ship the hook + logging with **no behaviour change** first, get a real macOS `idea.log` excerpt
back, and only then build the crash-response/UI logic on the *observed* sequence.

## Architectural Responsibility Map

This phase has no web tiers; the "architecture" here is IntelliJ Platform process lifecycle
plumbing entirely inside one JVM plugin. The generic Browser/SSR/API/CDN/DB tiers below don't
apply as named, so this map instead separates the plugin's own code from the two things it talks
to.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detect the language-server process died unexpectedly | IntelliJ Plugin (`bbj-intellij`, this phase's `BbjLanguageServer`) | LSP4IJ vendor library (`OSProcessStreamConnectionProvider`) | The vendor library owns the OS process handle and the termination callback; the plugin only registers a handler on it (D-01). Nothing in the Node.js language server (`bbj-vscode`) participates — it is the thing that died, not an observer of its own death. |
| Distinguish a crash from a deliberate stop | IntelliJ Plugin (`ExpectedStopGuard`, reshaped per D-03) | — | Plain-Java, no vendor import; owns only the "was this stop armed by our own restart" decision, not status classification (that duty moves out per D-03). |
| Auto-restart / give-up policy, crash counter | IntelliJ Plugin (`BbjServerService`) | LSP4IJ vendor library (`LanguageServerManager`) | Policy lives in the plugin; the actual stop/start mechanics are vendor calls the plugin already wraps in `doRestart()`. |
| Status transition logging (LIFE-02) | IntelliJ Plugin (`BbjServerService.updateStatus`) | — | Pure logging bug, no vendor coupling beyond the already-consumed `ServerStatus` enum. |
| User-visible crashed state (status bar, banner, balloon) | IntelliJ Plugin (`BbjStatusBarWidget`, `BbjServerCrashNotificationProvider`) | — | Both already exist; this phase changes what feeds them (a crash flag distinct from `ServerStatus`, since `ServerStatus` is a vendor enum with no "crashed" member — see §Common Pitfalls). |

## Standard Stack

No new libraries are introduced by this phase. The relevant "stack" is the already-pinned
vendor coupling, verified this session against the actual jar in the Gradle cache rather than
against vendor prose:

| Component | Version | Verified via |
|---|---|---|
| LSP4IJ | 0.21.0 | `bbj-intellij/build.gradle.kts:34` `plugin("com.redhat.devtools.lsp4ij:0.21.0")` [VERIFIED: bbj-intellij/build.gradle.kts:34]; jar at `/home/coder/.gradle/caches/9.7.1/transforms/810689ad0380ec07b3b66a6b60a6f6e3/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/lsp4ij-0.21.0.jar`, `javap`'d directly this session |
| IntelliJ Platform (compile/test target) | 2024.2 (Community) | `bbj-intellij/build.gradle.kts:28` `intellijIdeaCommunity("2024.2")` [VERIFIED: bbj-intellij/build.gradle.kts:28]; platform jar `util-8.jar` from the matching Gradle transform cache, `javap`'d directly this session |
| Gradle wrapper | 9.7.1 | `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` `distributionUrl=...gradle-9.7.1-bin.zip` [VERIFIED: bbj-intellij/gradle/wrapper/gradle-wrapper.properties] |
| JDK toolchain | 17 (Temurin auto-provisioned) | `bbj-intellij/build.gradle.kts:15` `languageVersion = JavaLanguageVersion.of(17)` [VERIFIED: bbj-intellij/build.gradle.kts:15]; per CLAUDE.md, any host JDK works since Gradle auto-provisions 17 |
| JUnit | Jupiter via `junit-bom:6.1.3` | `bbj-intellij/build.gradle.kts:39-41` [VERIFIED: bbj-intellij/build.gradle.kts:39-41] |

There is no sources jar for LSP4IJ 0.21.0 in the local Gradle caches (`find ... -name
'lsp4ij*sources*'` returned nothing this session); all vendor-source claims below are grounded
in the upstream GitHub repository at the matching tag (`gh api repos/redhat-developer/lsp4ij/contents/...?ref=0.21.0`),
cross-checked against the pinned jar's bytecode with `javap` where it matters (the parts that
decide correctness: `isStopped()` semantics, handler-list iteration, field-write-before-callback
ordering).

## Package Legitimacy Audit

Not applicable. This phase adds no new Maven/Gradle dependency; it changes only files already
inside `bbj-intellij/src/main/java/com/basis/bbj/intellij/{lsp,ui,concurrency}` against the
already-pinned LSP4IJ 0.21.0 and IntelliJ Platform 2024.2 (see §Standard Stack). No package
legitimacy check applies.

## Architecture Patterns

### System Architecture Diagram

```
 kill -9 <pid>  (or: normal process exit)
        |
        v
 OS process dies
        |
        v
 [IntelliJ Platform] ProcessHandler / ProcessWaitFor
   - a dedicated wait-for thread (TaskExecutor.executeTask), NOT the EDT
   - sets myExitCode BEFORE firing the terminated event  [VERIFIED: javap ProcessHandler,
     lambda$notifyTerminated$2: putfield myExitCode precedes
     ProcessListener.processTerminated(...) in the same method]
        |
        v
 ProcessListener.processTerminated(ProcessEvent)
        |
        v
 [LSP4IJ] LSPProcessListener.processTerminated(event)
   if (!provider.isStopped()) {                       <- the D-01 gate
       for (handler : provider.getUnexpectedServerStopHandlers()) handler.run();
   }
   [VERIFIED: javap LSPProcessListener.processTerminated bytecode, this session]
        |
        |-- handler #1: LanguageServerWrapper's own lambda (registered first, inside
        |     LanguageServerWrapper.start()):
        |       serverError = new ServerWasStoppedException(...);
        |       stop(initializingContext);   // -> updateStatus(stopping), async shutdownAll(),
        |                                    //    which unconditionally calls provider.stop()
        |       showNotificationStartServerError();  // LSP4IJ's own error notification (D-12)
        |     [VERIFIED: LanguageServerWrapper.java:424-434, tag 0.21.0]
        |
        `-- handler #2 (this phase's addition, registered by our
              BbjLanguageServer.addUnexpectedServerStopHandler override alongside forwarding
              handler #1 to super): reports the crash to BbjServerService, using getPid() and
              getProcessHandler().getExitCode() (both accessible without vendor internals)

 Separately, on EVERY status change (both deliberate stops and the crash path above), LSP4IJ
 calls (in this order, inside LanguageServerWrapper.updateStatus):
    languageClient.handleServerStatusChanged(status)      // BbjLanguageClient -- console line only (D-04)
    getClientFeatures().handleServerStatusChanged(status)  // createClientFeatures() override -- feeds
                                                             // BbjServerService.updateStatus (D-04, moved from
                                                             // BbjLanguageClient)
 [VERIFIED: LanguageServerWrapper.java:639-656, tag 0.21.0]

 BbjServerService.updateStatus(status)
   - ExpectedStopGuard consulted only for the D-07/D-08 armed-token check, not as the crash trigger (D-03)
   - logs "BBj language server status: <currentStatus-before-advance> -> <status>" (LIFE-02 fix)
   - publishes BbjServerStatusListener.TOPIC on the EDT via invokeLater (existing pattern)
        |
        v
 BbjStatusBarWidget / BbjServerCrashNotificationProvider (crashed flag read separately
   from ServerStatus, since ServerStatus has no "crashed" member -- see Common Pitfalls)
```

### Finding 1 — `isStopped()` is the whole D-01 gate, and it's a one-shot flag per provider instance

`OSProcessStreamConnectionProvider` (javap'd directly from the pinned jar):

```
private boolean stopped;

public void stop();
    Code:
         0: aload_0
         1: getfield      #167    // Field stopped:Z
         4: ifeq 8
         7: return                          // already stopped: no-op
         8: aload_0
         9: iconst_1
        10: putfield #167                   // stopped = true, BEFORE touching the process
        13: ...
        20: ... invokevirtual isProcessTerminated:()Z
        27: ifne 37                          // if already terminated, skip the kill call
        30: ... invokestatic ExecutionManagerImpl.stopProcess:(...)V
        37: return

boolean isStopped();                        // package-private -- accessible to LSP4IJ's own
    Code: 0: aload_0 1: getfield #167 4: ireturn   // LSPProcessListener, NOT to our subclass directly
```

`stop()` sets `stopped = true` **first**, then (only if the process handler exists and isn't
already terminated) asks the platform to kill it. `LSPProcessListener.processTerminated` reads
`isStopped()` exactly once, before iterating handlers — so once any deliberate stop path has
called `provider.stop()`, the flag is permanently `true` for that provider instance and the
handler list never runs, regardless of how the process actually terminates afterward.
`isStopped()` itself is package-private (no modifier) in `com.redhat.devtools.lsp4ij.server`, a
different package from `com.basis.bbj.intellij.lsp` — our subclass **cannot** call it directly,
but doesn't need to: LSP4IJ's own listener is the only caller. [VERIFIED: javap
`com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider`, this session]

A fresh `OSProcessStreamConnectionProvider` (our `BbjLanguageServer`) is constructed on every
`LanguageServerWrapper.start()` call (`serverDefinition.createConnectionProvider(initialProject)`,
`LanguageServerWrapper.java:418`), so `stopped` always starts `false` for a new attempt — no
possibility of a stale `true` flag from a previous run suppressing a later, real crash.
[VERIFIED: LanguageServerWrapper.java:406-434, tag 0.21.0]

### Finding 2 — every deliberate stop path reaches `provider.stop()`, confirmed at the one true chokepoint

Rather than trace every call site individually, the vendor source funnels them all through one
method. `LanguageServerWrapper.stop()` (public, no args) → `stop(boolean alreadyStopping)` →
`stop(InitializingContext)` → `shutdownAll(languageServer, provider, launcherFuture)`:

```java
// LanguageServerWrapper.java:1730-1761 (tag 0.21.0)
private void shutdownAll(LanguageServer languageServerInstance, StreamConnectionProvider provider, Future<?> serverFuture) {
    if (languageServerInstance != null && provider != null && provider.isAlive()) {
        // ... shutdown()/exit() JSON-RPC calls, best-effort ...
    }
    CancellationSupport.cancel(serverFuture);
    if (provider != null) {
        provider.stop();     // <-- unconditional, regardless of isAlive()
    }
}
```

[VERIFIED: LanguageServerWrapper.java:1730-1761, tag 0.21.0 — the `if (provider != null) {
provider.stop(); }` block is unconditional and sits after, not inside, the `isAlive()` guard]

Every path that ends in a deliberate stop calls `LanguageServerWrapper.stop()` (directly or via
`restart()`, `dispose()`, or the idle-shutdown timer), and `stop()` always resolves to this same
`shutdownAll`:

- **Explicit stop** (`LanguageServerManager.stop(id, StopOptions)` → `ls.stop()` when
  `!willDisable`, or `ls.stopAndDisable()` when `willDisable`, both eventually call the wrapper's
  `stop()`) [VERIFIED: LanguageServerManager.java:165-183, tag 0.21.0]
- **Idle shutdown** — `startStopTimer()` calls `updateStatus(ServerStatus.stopping)` then, after
  `serverDefinition.getLastDocumentDisconnectedTimeout()` seconds, calls `stop()` directly
  [VERIFIED: LanguageServerWrapper.java:658-668, tag 0.21.0] — confirming the D-01 discretion note
  that idle shutdown is covered without special-casing.
- **Project close / `dispose()`** — `dispose(boolean)` calls `stopAndRefreshEditorFeature(...)`
  which calls `stop()` [VERIFIED: LanguageServerWrapper.java:1792-1808, tag 0.21.0]. When the
  project `isDisposed()`, `stop(InitializingContext)` runs `shutdownAll` **synchronously** rather
  than via `CompletableFuture.runAsync` [VERIFIED: LanguageServerWrapper.java:1692-1695, tag
  0.21.0], but the same unconditional `provider.stop()` call is reached either way.
- **`restart()`** calls `stop()` before re-entering `getInitializedServer()` → `start()`
  [VERIFIED: LanguageServerWrapper.java:307-329, tag 0.21.0].

No path was found (in the parts of `LanguageServerWrapper.java` this phase's callers exercise)
where the OS process is killed without `provider.stop()` having been called first. This directly
confirms the D-01 premise. Nothing here is runtime-observed yet — that is exactly what D-13's
probe plan is for.

### Finding 3 — D-09 confirmed: `doRestart`'s `stop()` + `start()` does clear `serverError` and the retry counter, via `restart()`, not directly

This took two source reads to pin down, because `LanguageServerManager.stop(id,
StopOptions.setWillDisable(false))` calls the wrapper's plain `stop()` — which does **not**
touch `serverError` or `numberOfRestartAttempts` — and the reset actually happens on the
**following** `start(id)` call, indirectly:

```java
// LanguageServerManager.java:113-133, tag 0.21.0
public void start(@NotNull LanguageServerDefinition serverDefinition, @NotNull StartOptions options) {
    ...
    for (var ls : LanguageServiceAccessor.getInstance(project).getStartedServers()) {
        if (serverDefinition.equals(ls.getServerDefinition())) {
            if (options.isForceRestart() || ls.getServerStatus() != ServerStatus.started) {
                ls.restart();     // <-- not ls.start()
            }
            started = true;
        }
    }
    ...
}
```

`LanguageServerManager.start(String)` uses `StartOptions.DEFAULT`
[VERIFIED: LanguageServerManager.java:79-81, tag 0.21.0], and this repo's own
`Lsp4ijCouplingCanaryTest.theStopAndStartOptionDefaultsTheRestartPathDependsOnAreUnchanged`
already asserts, against the pinned jar, that `StartOptions.DEFAULT.isForceRestart() == true`
[VERIFIED: `Lsp4ijCouplingCanaryTest.java:318-322` — `assertTrue(LanguageServerManager
.StartOptions.DEFAULT.isForceRestart(), ...)`]. So on an already-registered wrapper — the normal
case for `doRestart()` — `manager.start(SERVER_ID)` **always** calls `ls.restart()`, regardless
of the wrapper's current status. And `LanguageServerWrapper.restart()`:

```java
// LanguageServerWrapper.java:307-313, tag 0.21.0
public synchronized void restart() {
    numberOfRestartAttempts = 0;
    serverError = null;
    setEnabled(true);
    if (serverStatus != ServerStatus.installed && serverStatus != ServerStatus.installing) {
        stop();
    }
    getInitializedServer()...  // -> start()
}
```

[VERIFIED: LanguageServerWrapper.java:307-329, tag 0.21.0] — this is the exact reset D-09 asks
research to confirm. **D-09's assumption holds**, but the mechanism is: `doRestart`'s explicit
`stop()` puts the wrapper into a non-`started` state, and the *subsequent* `manager.start(SERVER_ID)`
resolves — because of `StartOptions.DEFAULT.isForceRestart()` — to `ls.restart()`, which is what
actually clears `serverError`/`numberOfRestartAttempts`, not the plain `stop()` call itself. No
code change to the existing `doRestart()` stop/wait/start shape is needed for this guarantee;
this is worth pinning with a coupling-canary comment or a short note in the crash-flow test, but
not a new mechanism.

### Finding 4 — pid and exit code are both reachable from `BbjLanguageServer` without vendor internals

```
public java.lang.Long getPid();          // public, OSProcessStreamConnectionProvider
    ... getProcess().pid() ...           // already used pattern; safe to call from our subclass

protected com.intellij.execution.process.OSProcessHandler getProcessHandler();  // protected,
    // accessible from BbjLanguageServer despite being in a different package (protected access
    // extends to subclasses regardless of package)

public java.lang.Integer getExitCode();  // public, on IntelliJ Platform's ProcessHandler
    // (javap'd from util-8.jar, ideaIC-2024.2, the exact platform version this plugin compiles
    // against) [VERIFIED: javap com.intellij.execution.process.ProcessHandler]
```

Crucially, the platform bytecode shows the exit code is **written before** the termination event
is dispatched, in the same method (`ProcessHandler.lambda$notifyTerminated$2`):

```
68: ... iload_2 ... invokestatic Integer.valueOf ...
73: putfield #124        // myExitCode = Integer.valueOf(exitCode)
76: ... getfield myEventMulticaster ...
89: invokeinterface ProcessListener.processTerminated(...)V   // <-- fires AFTER the write at 73
```

[VERIFIED: javap `com.intellij.execution.process.ProcessHandler`, method
`lambda$notifyTerminated$2`, this session] — so `getProcessHandler().getExitCode()` inside our
unexpected-stop handler (which only ever runs from within this same call chain, since it's
invoked from `LSPProcessListener.processTerminated`) is guaranteed non-null. This directly
enables the D-12 log line format (`pid 12345, exit code 137`) with no vendor-internal access.

### Finding 5 — thread model: the hook runs off the EDT

`ProcessHandler`'s wait-for machinery uses a dedicated executor
(`TaskExecutor.executeTask(Runnable)`, invoked from `ProcessWaitFor`'s constructor to spawn a
blocking wait thread) [VERIFIED: javap `com.intellij.execution.process.ProcessWaitFor`, this
session] — not the EDT and not a `ReadAction`. `LSPProcessListener.processTerminated`, and
therefore both unexpected-stop handlers (LSP4IJ's own and this phase's), run on that same
background thread. This matches the codebase's existing pattern of wrapping cross-thread UI
work in `ApplicationManager.getApplication().invokeLater(...)` (see `BbjServerService
.updateStatus`'s existing `invokeLater` calls, lines 194, 209 of `BbjServerService.java`
[VERIFIED: BbjServerService.java:194, 209]) — the new crash-report handler must follow the same
discipline rather than touching UI state directly. This finding is OBSERVED-IN-CODE (the
bytecode chain proves the mechanism); it has not been confirmed by inspecting a live thread name
at runtime, which is what D-13's probe (reading INFO log timestamps/thread names, if logged)
could additionally surface but does not require.

### Finding 6 — `bb0a49f0` does not cherry-pick cleanly; two of its three files do

Ran `git apply --check` against the current worktree (no files modified) for each file `bb0a49f0`
touched:

| File | `git apply --check` | Why |
|---|---|---|
| `BbjLanguageClient.java` (drop `service.updateStatus(serverStatus);`) | **exit 0 — applies cleanly** | Unchanged since Phase 97 |
| `Lsp4ijImportAllowlistTest.java` (add `"ServerStatus"` to the `BbjLanguageServerFactory.java` entry) | **exit 0 — applies cleanly** | Unchanged since Phase 97 |
| `BbjLanguageServerFactory.java` (add the `handleServerStatusChanged` override) | **exit 1 — patch does not apply** (`error: patch failed: ...:60`) | Phase 106 inserted a `compilerTrigger` `options.addProperty(...)` block between the diff's context lines and `params.setInitializationOptions(options);`, inside the same anonymous `LSPClientFeatures` body |

[VERIFIED: `git apply --check` run this session against HEAD, non-destructively, on all three
extracted per-file diffs from `git show bb0a49f0 -- <path>`]

`cb3ce7f8` (the `Lsp4ijCouplingCanaryTest` addition pinning `LSPClientFeatures
.handleServerStatusChanged`/`getProject`) also applies cleanly (`git apply --check` exit 0,
verified this session) since it only touches a test file untouched since Phase 97.

**Consequence for planning:** the `handleServerStatusChanged` override must be hand-merged into
the current `createClientFeatures()` anonymous class body (after the existing `initializeParams`
override, which now ends after the `compilerTrigger` line — see `BbjLanguageServerFactory.java:43-64`
[VERIFIED: BbjLanguageServerFactory.java:43-64]), not applied as a patch or cherry-pick. The
other two files (`BbjLanguageClient.java`, `Lsp4ijImportAllowlistTest.java`) can be edited with
the same net effect as `bb0a49f0`/`cb3ce7f8` directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting the language-server process died | A custom `Process.onExit()`/`waitFor()` poller, or parsing stdout/stderr for a crash signature | LSP4IJ's `OSProcessStreamConnectionProvider.addUnexpectedServerStopHandler` (D-01) | LSP4IJ already owns the process handle and already distinguishes "handler.run() only when nobody called stop() first" — duplicating that logic would double-detect every deliberate stop unless it re-derives the exact same `isStopped()` semantics, and a second poller racing the vendor's own `ProcessListener` risks reading a `null`/stale `Process` handle after the vendor's own listener has already torn things down. |
| Deciding whether a stop was "ours" | A timestamp/generation-number scheme built from scratch | `ExpectedStopGuard.arm()`/`disarm()`, reshaped per D-03 (already exists, already plain-Java, already unit-tested for the one-shot/time-boxed/concurrent-safe properties) | Re-deriving one-shot-token-with-expiry semantics correctly (see `ExpectedStopGuardTest`'s eleven cases covering boundary/expiry/disarm/concurrency) is exactly the kind of "looks simple, isn't" logic this class was already built and hardened for in Phase 97; only its *inputs* need reworking (D-03), not its mechanism. |
| Reading the process exit code | Reflection into an internal LSP4IJ or IntelliJ Platform field | `getProcessHandler().getExitCode()` (protected/public IntelliJ Platform API, reachable through the LSP4IJ-provided protected `getProcessHandler()`) | Finding 4 above shows this is fully public/protected API with a bytecode-verified non-null guarantee at call time — no internals needed. |

**Key insight:** Every piece this phase needs — the unexpected-stop hook, the pid/exit-code
accessors, and the arm/disarm token — already exists either in LSP4IJ or in this repo's own
`ExpectedStopGuard`/`RestartGate`. The actual work is *wiring* (which hook feeds which method)
and *one bug fix* (the stale from-state), not new lifecycle-detection machinery.

## Common Pitfalls

### Pitfall 1: The stale-from-state bug, traced (LIFE-02)

`BbjServerService.updateStatus` computes the classification and the log line against
`previousStatus`, but only assigns `previousStatus = currentStatus` **after** using it:

```java
// BbjServerService.java:139-217 (current HEAD)
public void updateStatus(@NotNull ServerStatus status) {
    ...
    ExpectedStopGuard.StopKind stopKind =
        expectedStop.classify(status.name(), previousStatus.name(), System.currentTimeMillis());
    LOG.info("BBj language server status: " + previousStatus + " -> " + status
        + " (classified as " + stopKind + ")");
    ...
    previousStatus = currentStatus;   // <-- assigned AFTER the log line above already used
                                       //     the OLD previousStatus, not currentStatus
    this.currentStatus = status;
    ...
}
```

[VERIFIED: BbjServerService.java:139-150, 206-207 — quoted verbatim above] Walking four
consecutive transitions from the initial `currentStatus=previousStatus=stopped` shows the log
line is always **one transition further stale** than it looks: update 2 (`starting -> started`)
logs `previousStatus=stopped` (should read `starting`); update 3 (`started -> stopping`) logs
`previousStatus=starting` (should read `started`) — i.e. exactly the roadmap's example, `started
-> started` instead of `stopping -> stopped`. D-05's fix is a one-line change: log
`currentStatus + " -> " + status` (read `this.currentStatus`, the value still held at that point
in the method, **before** the `this.currentStatus = status;` assignment on the next line) instead
of `previousStatus`, and remove the now-dead `previousStatus` field/assignment (its only other
consumer, `classify()`, is being reworked per D-03 to no longer take a from-state string at all —
see Pitfall 2).

### Pitfall 2: `classify()`'s current signature is exactly what D-03 says must stop being the crash trigger — and an existing test pins the old behaviour

`ExpectedStopGuard.classify(String statusName, String previousStatusName, long nowMs)` treats a
`"stopped"` status preceded by `"started"`/`"starting"` as a live-to-stopped transition and
returns `CRASH` when nothing is armed [VERIFIED: ExpectedStopGuard.java:63-81, quoted]. Phase 97's
real UAT (`97-UAT-ARTIFACTS.md:392-396`) already showed why this is wrong: a deliberate stop
passes through `stopping` before `stopped` too, so `classify("stopped", "stopping", ...)` returns
`NOT_A_STOP` (per `ExpectedStopGuardTest.transitionsThatAreNotLiveToStoppedAreNotAStop`,
line 30, `assertEquals(NOT_A_STOP, guard.classify("stopped", "stopping", 0));` [VERIFIED:
ExpectedStopGuardTest.java:27-36]) — the classifier never even sees the stale two-behind
`"started"` in the current buggy call, which is *why* the crash branch never fired in the Round 1
UAT. D-03 requires reworking `classify()`'s role entirely: the exit hook decides CRASH vs. not;
`ExpectedStopGuard` should be consulted only for its armed-token question (was this stop
expected because `doRestart` armed it), not for a status-transition shape. **An existing test
will need explicit, deliberate rewriting, not just new cases added alongside it:**
`BbjServerServiceRestartSourceGuardTest
.theClassificationCallPrecedesTheFirstCrashBranchAndTheCrashVerdictIsPinnedOnce`
[VERIFIED: BbjServerServiceRestartSourceGuardTest.java:228-239] currently asserts
`expectedStop.classify(` appears in `BbjServerService.java` and that `StopKind.CRASH` appears
exactly once — both assertions will likely still hold in spirit (a `classify`-like call, a
`CRASH`-like verdict used once) but the source guard's exact literals may need updating once the
call's argument shape changes. Per D-03's own text, "change its tests together with the
behaviour" — this is not incidental breakage, it's the planned outcome.

### Pitfall 3: `ServerStatus` is a closed vendor enum — the "crashed" widget state (D-10) cannot be a `ServerStatus` value

`BbjStatusBarWidget extends BbjStatusBarWidgetBase<ServerStatus>` and its `iconFor`/`textFor`/
`tooltipFor` switch on exactly `started`/`starting`/`stopping`/`stopped` with a `default` falling
through to an "Error" rendering [VERIFIED: BbjStatusBarWidget.java:41-70, quoted]. `ServerStatus`
has nine `final` enum constants total (`none`, `checking_installed`, `installing`, `installed`,
`not_installed`, `starting`, `started`, `stopping`, `stopped`) [VERIFIED: javap
`com.redhat.devtools.lsp4ij.ServerStatus`, this session; also independently pinned by this
repo's own `Lsp4ijCouplingCanaryTest.theServerStatusConstantsThisPluginBranchesOnStillExist`,
`assertEquals(9, ServerStatus.values().length, ...)`, `Lsp4ijCouplingCanaryTest.java:268-270`] —
there is no tenth "crashed" value to add, and this plugin cannot add one to a vendor `enum`. The
crashed indicator must come from a **separate boolean** (`BbjServerService.isServerCrashed()`
already exists) consulted alongside the `ServerStatus` the widget receives, inside
`BbjStatusBarWidget`'s own `iconFor`/`textFor`/`tooltipFor` overrides (not the shared
`BbjStatusBarWidgetBase`, which deliberately knows neither vendor status type — see its own
class Javadoc [VERIFIED: BbjStatusBarWidgetBase.java:22-34]). Note also that the crash flag
currently changes **without** publishing a new `BbjServerStatusListener.TOPIC` event by itself
(`updateStatus`'s crash branch calls `EditorNotifications.updateAllNotifications()` for the
editor banner, but the status-bar widget only redraws when `updateStatus(S)` is invoked from the
topic subscription) [VERIFIED: BbjServerService.java:152-217, spanning the crash branch and the
final `invokeLater`/`syncPublisher` block] — since the crash flag is set inside the same
`updateStatus(ServerStatus status)` call that already ends with a topic publish, the widget will
naturally repaint with the current status *and* can read the just-updated crash flag at that
same moment, so no additional publish path is needed, but this is a detail worth the planner
verifying isn't lost when D-03 reshapes the method.

### Pitfall 4: two handlers, one list, same synchronous call — the design's own ordering isn't specified in D-01, verify it doesn't matter

Since our `BbjLanguageServer.addUnexpectedServerStopHandler` override both forwards LSP4IJ's
handler to `super` **and** registers our own (both via `super.addUnexpectedServerStopHandler`),
both land in the same `unexpectedServerStopHandlers` list and both run, synchronously, in
registration order, from `LSPProcessListener.processTerminated`'s single loop [VERIFIED: javap
`LSPProcessListener.processTerminated`, iterates the full list without re-checking `isStopped()`
between handlers]. If LSP4IJ's own handler (which calls `stop(initializingContext)` — itself
partly synchronous, partly asynchronous via `CompletableFuture.runAsync`) is forwarded first,
this phase's own handler runs immediately after it returns, while the wrapper's status is very
likely still `stopping` (not yet `stopped`, since the async completion path hasn't necessarily
finished). This is fine for D-01/D-02 (the crash signal doesn't depend on status at all) but
means the crash-report handler **must not** assume `BbjServerService.getCurrentStatus()` is
already `stopped` when it runs — it should act purely on the fact that the hook fired, not on
current status.

### Pitfall 5: `LanguageServerManager.start()` always force-restarts an existing wrapper — relevant to any future retry-storm concern, not to this phase's own restart path

Upstream issues #1672 and #1673 (both filed by this repo's maintainer against LSP4IJ 0.21.0,
confirmed via `gh api repos/redhat-developer/lsp4ij/issues/1672` and `/1673` this session)
document that repeated `getInitializedServer()`/`start()` calls while `serverError` is still set
can spawn overlapping processes, and that `shutdownAll`'s blocking 5 s wait can run on a
`ReadAction`-blocked thread via `ForkJoinPool.helpAsyncBlocker`. Neither issue is triggered by
this phase's design (`doRestart()` only calls `manager.start(SERVER_ID)` once per restart,
serialized through `RestartGate`), but they're useful context if a future crash-storm scenario
(many crashes in quick succession) is ever investigated — not in scope here (D-06/D-07 already
cap it at two crashes/30 s).

## Code Examples

### The D-01 hook override (skeleton, not literal final code — thread-safety and exact BbjServerService method name are the planner's/executor's to finalize per D-03/D-07's discretion notes)

```java
// bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
@Override
public void addUnexpectedServerStopHandler(Runnable handler) {
    super.addUnexpectedServerStopHandler(handler);           // LSP4IJ's own handler, unchanged
    super.addUnexpectedServerStopHandler(() -> {
        Long pid = getPid();                                  // public, inherited
        Integer exitCode = null;
        var processHandler = getProcessHandler();             // protected, inherited
        if (processHandler != null) {
            exitCode = processHandler.getExitCode();           // public IntelliJ Platform API
        }
        // report to BbjServerService; this runs off the EDT (Finding 5) so any UI-touching
        // work inside must go through ApplicationManager.getApplication().invokeLater(...),
        // matching the existing pattern in BbjServerService.updateStatus.
    });
}
```

### The LIFE-02 fix (the whole change)

```java
// BbjServerService.java, inside updateStatus(ServerStatus status) -- current buggy line:
LOG.info("BBj language server status: " + previousStatus + " -> " + status
    + " (classified as " + stopKind + ")");
// fix: read the value still held in this.currentStatus at this point in the method
// (i.e. before the `this.currentStatus = status;` line further down), not previousStatus:
LOG.info("BBj language server status: " + currentStatus + " -> " + status + ...);
```

### The D-04 status-feed move (merged into the existing `initializeParams` override, per Finding 6)

```java
// BbjLanguageServerFactory.java createClientFeatures() -- add AFTER the existing
// initializeParams override (BbjLanguageServerFactory.java:43-64), inside the same
// anonymous LSPClientFeatures body:
@Override
public void handleServerStatusChanged(@NotNull ServerStatus status) {
    super.handleServerStatusChanged(status);
    Project project = getProject();
    if (project.isDisposed()) {
        return;
    }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) {
            return;
        }
        BbjServerService.getInstance(project).updateStatus(status);
    });
}
```

```java
// BbjLanguageClient.java handleServerStatusChanged -- drop the updateStatus() call, keep only
// the console line (matches bb0a49f0's BbjLanguageClient.java diff, which applies cleanly):
@Override
public void handleServerStatusChanged(ServerStatus serverStatus) {
    super.handleServerStatusChanged(serverStatus);
    ...
    ApplicationManager.getApplication().invokeLater(() -> {
        ...
        service.logToConsole("Server status: " + serverStatus, ...);
        // service.updateStatus(serverStatus);  <-- removed
    });
}
```

## State of the Art

| Old Approach (Phase 97, reverted) | New Approach (this phase) | When Changed | Impact |
|---|---|---|---|
| Crash signal derived from the `ServerStatus` transition sequence (`ExpectedStopGuard.classify` treating a `started`/`starting -> stopped` transition as CRASH by default) | Crash signal derived from LSP4IJ's `addUnexpectedServerStopHandler` hook; `ExpectedStopGuard` reduced to an armed-token filter only (D-03) | This phase (108) | The Phase 97 approach provably cannot distinguish a crash from a deliberate stop, because both produce the identical `started -> stopping -> stopped` sequence (real `idea.log` evidence, `97-UAT-ARTIFACTS.md:376-396`). The new approach uses a signal LSP4IJ itself only fires on an unexpected stop. |
| Status feed sourced from `BbjLanguageClient.handleServerStatusChanged` | Status feed sourced from the `createClientFeatures()` `LSPClientFeatures` override; `BbjLanguageClient` keeps only its console line | Phase 97 (`bb0a49f0`), reapplied this phase | LSP4IJ nulls the `languageClient` reference before publishing `stopped` after certain disconnects [per `bb0a49f0`'s own commit message, and `LanguageServerWrapper.updateStatus`'s unconditional `getClientFeatures().handleServerStatusChanged(serverStatus)` call vs. its `if (languageClient != null)`-guarded call to the language client, `LanguageServerWrapper.java:639-656`, tag 0.21.0], so `LSPClientFeatures` is the reliable feed site. |
| Status log line printed a two-behind `previousStatus` | Status log line prints the true immediately-preceding status | This phase (108) | Pure bug fix; see Pitfall 1. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The unexpected-stop handler runs on IntelliJ's process wait-for thread pool, not the EDT, based on `ProcessWaitFor`'s `TaskExecutor.executeTask` bytecode, without directly observing a live thread name/stack at runtime | Finding 5 | Low — the design already assumes off-EDT execution and wraps UI-touching work in `invokeLater`, so even if the exact thread differs, the defensive pattern still holds. D-13's probe build could add a thread-name log line to fully close this if desired, but it is not required by any locked decision. |
| A2 | `Lsp4ijCouplingCanaryTest.theClassificationCallPrecedesTheFirstCrashBranchAndTheCrashVerdictIsPinnedOnce`'s exact literal assertions (`expectedStop.classify(`, `StopKind.CRASH` count) will need editing once D-03's rework changes `classify()`'s call shape, but the precise new call shape is a planning/implementation decision, not something this research can predict | Pitfall 2 | Low — D-03's own text already instructs "change its tests together with the behaviour," so this is an expected planning task, not a surprise; flagged here only so the plan explicitly budgets a task for it rather than treating the test as a silent pass-through. |

**If this table is empty:** N/A — two assumptions above; both are low-risk process/sequencing
observations, not factual claims about crash-detection correctness (those are all VERIFIED
against source/bytecode/real-log evidence).

## Open Questions

1. **Does the hook actually fire on a real macOS `kill -9`, and in what order relative to the
   status-log lines, when run in a real installed IntelliJ session?**
   - What we know: every source-level and bytecode-level trace this session confirms the design
     *should* work exactly as D-01 describes (Findings 1-5), and this pattern is one Phase 97
     already proved *wrong* on a design that was equally plausible from source-reading alone
     (the status-sequence approach) until a real `idea.log` refuted it.
   - What's unclear: whether some IntelliJ-2026.2-specific behavior (the actual IDE version used
     in the Phase 97 UAT, per `97-UAT-ARTIFACTS.md:361`) or macOS-specific process semantics
     produce a different sequence than the 2024.2-platform-jar bytecode analysis suggests. Note:
     `bbj-intellij` compiles against platform **2024.2** (`build.gradle.kts:28`) but the user's
     installed IDE in prior UAT was **2026.2** — a two-year platform-version gap between
     compile-time and the runtime environment the probe will actually run in.
   - Recommendation: this is exactly why D-13 exists — ship hook + logging only, get the real
     `idea.log`, and only then build behavior on it. Do not skip or compress D-13 into a single
     combined plan with the response/UI logic.

2. **Exact wording/format the planner chooses for the D-12 WARN log line and the D-10 widget
   crashed-state label/icon/tooltip.**
   - What we know: D-10 and D-12 explicitly leave the exact wording to discretion; D-12 gives one
     example format.
   - What's unclear: nothing blocking — purely a presentation decision.
   - Recommendation: planner's discretion, consistent with existing log-line conventions already
     in `BbjServerService`/`BbjLanguageServer` (see `BbjLanguageServer.java`'s existing `LOG.info`
     style for Node.js resolution, lines 59-93, as a tone reference).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Gradle wrapper (`bbj-intellij/gradlew`) | Building/testing the plugin | ✓ | 9.7.1 (wrapper-pinned) | — |
| JDK (Gradle toolchain) | Compiling `bbj-intellij` | ✓ | Host has Temurin 25.0.4.1; Gradle auto-provisions JDK 17 per `languageVersion = JavaLanguageVersion.of(17)` | — (per CLAUDE.md, "any host JDK works, since JDK 17 is provisioned automatically") |
| `bbj-vscode/out/language/main.cjs` | `./gradlew build`/`buildPlugin` in `bbj-intellij` (bundles the LS) — CLAUDE.md's documented prerequisite | ✓ | Present, built 2026-09-25 00:36 (this session's environment) | If missing: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build` first |
| Node.js (only for rebuilding `bbj-vscode`, not for `bbj-intellij` itself) | Only if `main.cjs` needs a rebuild | ✓ | v24.20.0 present | Project memory notes Node 24 breaks `langium generate` specifically (use Node 22) — not relevant to this phase unless the bundle needs regenerating, which this phase's code changes (bbj-intellij only) do not require |
| macOS host for hand UAT (D-14/D-15) | The phase's own required checkpoint plan | Not verifiable from this environment (Linux container) | — | None — D-15 requires macOS specifically; this is a `checkpoint:human-verify` dependency, not a build dependency |
| LSP4IJ jar + sources | Research/verification this session | ✓ jar; ✗ no sources jar found | 0.21.0 jar present in Gradle cache; upstream source fetched via `gh api ...?ref=0.21.0` instead | None needed — `gh api` access to the tagged source substituted successfully |

**Missing dependencies with no fallback:**
- A macOS machine for the D-14/D-15 hand UAT. This is already modeled in CONTEXT.md as a
  required checkpoint (D-13's probe plan, D-14's UAT plan), not a build blocker.

**Missing dependencies with fallback:**
- None beyond the LSP4IJ sources jar noted above (upstream GitHub source substituted).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit Jupiter (via `junit-bom:6.1.3`), plain JUnit — no live IntelliJ platform test fixture is used anywhere in `bbj-intellij` (per repo standing decision: "No live IntelliJ UI test coverage exists in CI") |
| Config file | `bbj-intellij/build.gradle.kts:44-46` (`tasks.withType<Test>().configureEach { useJUnitPlatform() }`) [VERIFIED: bbj-intellij/build.gradle.kts:44-46] |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.concurrency.ExpectedStopGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.Lsp4ijCouplingCanaryTest" --tests "com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest"` (targeted; `cd` is allowed directly before `./gradlew` per CLAUDE.md) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` (the `--rerun-tasks`/`cleanTest test` requirement is a v4.4 standing decision — a plain `test` can report UP-TO-DATE and mask a stale green) |
| Baseline count | 1,109 tests, 0 failures as of Phase 106's close (`106-07-SUMMARY.md:61`, `./gradlew test --rerun-tasks`: `BUILD SUCCESSFUL, 1109 tests, 0 failures`) [VERIFIED: `.planning/phases/106-on-save-compiler-check-in-both-ides/106-07-SUMMARY.md:61`] |

### Testing pattern for this phase specifically

`BbjServerService` and `BbjLanguageServer` cannot be unit-tested directly — both need a live
`Project`/`OSProcessHandler`, which this repo deliberately does not stand up in tests (see
standing decision above). The existing pattern this phase must follow is the one already used
by every prior IntelliJ-side restart/lifecycle change in this repo:

1. **Plain-Java logic** (`ExpectedStopGuard`'s reshaped API) gets full behavioral JUnit coverage,
   with no `com.intellij`/LSP4IJ import (existing pattern, `ExpectedStopGuardTest`'s 11 cases).
2. **Wiring/structural invariants** (which method calls which, in what order, exactly how many
   times) get whole-file source-guard tests reading `Files.readString(...)` on the guarded source
   and asserting substring counts/positions — the pattern every one of `BbjServerServiceRestartSourceGuardTest`,
   `BbjLanguageClientRestartSourceGuardTest`, `BbjStatusBarWidgetSourceGuardTest` already follows.
3. **Vendor coupling** gets reflective canary coverage (`Lsp4ijCouplingCanaryTest`, method-by-method
   `getMethod`/`getDeclaredMethod` lookups against the pinned jar) plus the import allowlist
   (`Lsp4ijImportAllowlistTest`'s hand-written 12-file map).
4. **Runtime behavior** (does the hook actually fire, in what order relative to status lines) is
   *not* unit-testable at all — it is exactly what D-13's probe-build checkpoint and D-14/D-15's
   hand UAT exist to cover, consistent with the repo's standing "no live IntelliJ UI test coverage
   in CI" decision.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIFE-01 | `addUnexpectedServerStopHandler` override forwards LSP4IJ's handler and registers ours | source guard (new) | `./gradlew test --tests "*BbjLanguageServer*SourceGuard*"` | ❌ Wave 0 — no `BbjLanguageServer`-specific source guard exists yet (the class currently has none) |
| LIFE-01 | Vendor members (`addUnexpectedServerStopHandler`, `stop`, `getPid`, `getProcessHandler`) still exist with expected signatures | reflective canary (extend existing) | `./gradlew test --tests "*Lsp4ijCouplingCanaryTest*"` | ✅ file exists (`Lsp4ijCouplingCanaryTest.java`); needs new `@Test` methods for the connection-provider members this phase adds coupling to (today's `theConnectionProviderMembersThisPluginUsesStillExist` only pins `setCommandLine`) |
| LIFE-01 | `ExpectedStopGuard` reshaped to armed-token-only semantics | unit test (extend existing) | `./gradlew test --tests "*ExpectedStopGuardTest*"` | ✅ file exists; needs new/revised cases matching D-03's reworked API |
| LIFE-01 | Crash counter ignores `started` within the window (D-07), crash-triggered restart skips `clearCrashState()` | source guard (extend existing) | `./gradlew test --tests "*BbjServerServiceRestartSourceGuardTest*"` | ✅ file exists; needs new cases; `theClassificationCallPrecedesTheFirstCrashBranchAndTheCrashVerdictIsPinnedOnce` (line 228) needs deliberate rewriting per Pitfall 2 |
| LIFE-01 | Status feed moved to `createClientFeatures()`, `BbjLanguageClient` keeps only the console line | source guard (new, replacing the reverted `a2680319`'s approach per D-04's explicit "don't cherry-pick as-is") | new test file, e.g. `BbjLanguageServerFactoryStatusFeedSourceGuardTest` | ❌ Wave 0 |
| LIFE-01 | Runtime: hook fires on `kill -9`, not on deliberate stops | manual (D-13 probe, then D-14 hand UAT) | none automatable | N/A — `checkpoint:human-verify`, matches repo's standing no-live-UI-test-coverage decision |
| LIFE-02 | Log line prints the real immediately-preceding status | source guard or a small parsing unit test on the log-format string (extend `BbjServerServiceRestartSourceGuardTest` or similar) | `./gradlew test --tests "*BbjServerServiceRestartSourceGuardTest*"` | ✅ file exists; needs a new case pinning `currentStatus` (not `previousStatus`) as the logged from-state, in the spirit of the reverted `d16e7e57`'s `theClassifierIsFedTheOneBehindFromState` |

### Sampling Rate

- **Per task commit:** targeted test command above for the file(s) touched.
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks`.
- **Phase gate:** full suite green (`BUILD SUCCESSFUL`, 0 failures) before `/gsd-verify-work`, plus
  D-13's probe-build checkpoint observed and D-14/D-15's full hand UAT with pasted `idea.log`
  excerpts — this phase's success criteria explicitly require real-log evidence, not just green
  tests (D-15, v4.4 standing decision).

### Wave 0 Gaps

- [ ] A `BbjLanguageServer`-focused source guard or reflective canary extension pinning the new
  `addUnexpectedServerStopHandler` override shape (no such file exists today for
  `BbjLanguageServer.java` specifically).
- [ ] New coupling-canary methods on `Lsp4ijCouplingCanaryTest` for
  `addUnexpectedServerStopHandler`, `stop()` (public, callable), and the fact that `isStopped()`
  is package-private (documenting, not calling, so a future LSP4IJ version that makes it
  `public` or removes it entirely is noticed) — none of today's canary methods touch these three
  members.
- [ ] A source guard for the moved status-feed site (`createClientFeatures()`'s new
  `handleServerStatusChanged` override) — `a2680319`'s old guard is explicitly not to be reused
  as-is (D-04), so this is new test content, not a re-application.
- [ ] `108-UAT-ARTIFACTS.md` (does not exist yet) to receive the D-13 probe output and D-14/D-15's
  scenario-by-scenario `idea.log` excerpts.

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json` for this project (no explicit
`false` found), so this section is included per the default. Little of the OWASP ASVS applies to
in-process lifecycle logging with no external attacker-reachable surface, but the one relevant
category is checked below.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Nothing here touches auth |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | No | The only "input" is the OS process's own exit code (an `int`/`Integer`) and pid (a `long`/`Long`), both platform-typed, no parsing of untrusted text |
| V6 Cryptography | No | N/A |
| V7 Error Handling / Logging | Yes | The new WARN log line (D-12) includes pid and exit code — both process-management metadata, not user data or secrets. No BBj source text, credentials, or file contents are logged by this phase's design. Consistent with the existing `LOG.info`/`LOG.warn` conventions already in `BbjLanguageServer.java`/`BbjServerService.java`, which already log paths and Node.js resolution details at INFO without issue. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sensitive data in `idea.log` | Information Disclosure | Not applicable here — pid/exit code only, no new sensitive fields introduced. Existing `LOG.info` calls in this codebase already log local file paths and command lines (`BbjLanguageServer.java:59-60`), an already-accepted precedent this phase does not extend. |
| Crash loop / restart storm | Denial of Service (self-inflicted) | Already mitigated by the existing 2-crash/30s cap (D-06/D-07) and `RestartGate`'s in-flight rejection (`RestartGate.java:58-65`, already reviewed and documented). No new DoS surface from this phase. |

## Project Constraints (from CLAUDE.md)

- All `bbj-intellij` build/test commands run from `bbj-intellij/`: `./gradlew build`, `./gradlew test`
  (with `--rerun-tasks` per the v4.4 standing decision to avoid a stale UP-TO-DATE green).
- `./gradlew build`/`buildPlugin` fails fast if `bbj-vscode/out/language/main.cjs` is missing —
  already present in this environment (verified this session).
- Services are wired via `bbj-module.ts`-style DI only in `bbj-vscode`; not relevant to this
  `bbj-intellij`-only phase.
- **Shell rules (mandatory, this repo's CLAUDE.md):** use `Grep`/`Glob`/`Read` first; every shell
  path absolute and complete; never chain `cd` with `grep`/`find`/`cat`/`sed`/`head`/`tail`; `cd`
  only directly before a build tool (`./gradlew`); no blind recursive scans; `git add <exact
  path>` only. This research session followed these rules throughout (all `git`/`grep`/`javap`
  invocations used absolute paths or `git -C`/`git show <sha> --`).
- Never edit `src/language/generated/` — not applicable to this phase (bbj-intellij only, no
  Langium grammar changes).

## Sources

### Primary (HIGH confidence)

- LSP4IJ 0.21.0 jar, `javap`'d directly this session: `OSProcessStreamConnectionProvider`,
  `LSPProcessListener`, `ServerStatus`, `LSPClientFeatures` (method signatures) — path:
  `/home/coder/.gradle/caches/9.7.1/transforms/810689ad0380ec07b3b66a6b60a6f6e3/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/lsp4ij-0.21.0.jar`
- IntelliJ Platform 2024.2 `util-8.jar`, `javap`'d directly this session: `ProcessHandler`,
  `BaseProcessHandler`, `ProcessWaitFor` — path:
  `/home/coder/.gradle/caches/8.14.5/transforms/96fbc2a7a00a5977fca5d6120a41e351/transformed/ideaIC-2024.2/lib/util-8.jar`
- Upstream LSP4IJ source at tag `0.21.0` (`gh api repos/redhat-developer/lsp4ij/contents/<path>?ref=0.21.0`):
  `LanguageServerWrapper.java` (1846 lines fetched, read in full at the relevant sections),
  `LanguageServerManager.java` (360 lines fetched, read in full)
- This repo's own source, read directly this session: `BbjLanguageServer.java`,
  `BbjServerService.java`, `ExpectedStopGuard.java`, `BbjLanguageServerFactory.java`,
  `BbjLanguageClient.java`, `BbjStatusBarWidget.java`, `BbjStatusBarWidgetBase.java`,
  `BbjServerCrashNotificationProvider.java`, `RestartGate.java`
- This repo's own tests, read directly this session: `ExpectedStopGuardTest.java`,
  `BbjServerServiceRestartSourceGuardTest.java`, `BbjLanguageClientRestartSourceGuardTest.java`,
  `BbjStatusBarWidgetSourceGuardTest.java`, `Lsp4ijCouplingCanaryTest.java` (partial, the
  status/manager/client/connection-provider sections), `Lsp4ijImportAllowlistTest.java`
- `.planning/milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-UAT-ARTIFACTS.md` — the
  real `idea.log` excerpt (19 status lines) proving a killed process and a deliberate stop both
  arrive as `started -> stopping -> stopped`
- `git show`/`git apply --check` run directly this session against `bb0a49f0`, `cb3ce7f8`,
  `a2680319`, `626b8fe3`, `d16e7e57`

### Secondary (MEDIUM confidence)

- `gh api repos/redhat-developer/lsp4ij/issues/1672` and `/1673` — upstream issue bodies (filed
  by this repo's own maintainer against 0.21.0), used only for background context (Pitfall 5),
  not as a basis for any locked decision in this phase.

### Tertiary (LOW confidence)

- None — every claim above was traced to jar bytecode, tagged upstream source, this repo's own
  source/tests, or a real captured `idea.log`.

## Metadata

**Confidence breakdown:**
- Crash-hook mechanics (D-01, D-02, D-08, D-09, D-12): HIGH — confirmed at both the bytecode
  level (pinned jar) and the upstream tagged-source level, cross-checked against each other
- Status-feed move (D-04) and Phase 97 commit re-applicability: HIGH — `git apply --check` run
  directly this session, not inferred
- From-state log bug (D-05, LIFE-02): HIGH — traced line-by-line against the actual current
  `BbjServerService.java` source
- Widget crashed-state mechanics (D-10): HIGH for the *constraint* (ServerStatus is closed, 9
  values, bytecode-confirmed); MEDIUM for the *implementation shape* (exact override site is a
  planning decision, not yet written)
- Thread model (off-EDT execution) : MEDIUM — bytecode-traced mechanism (HIGH), but no live
  runtime thread-name observation (hence Assumption A1)
- Runtime UAT sequence itself (does the hook actually fire as designed): explicitly **not yet
  known** — this is precisely what D-13 exists to establish; do not treat source/bytecode
  analysis as a substitute for the probe

**Research date:** 2026-09-25
**Valid until:** Until LSP4IJ or the IntelliJ Platform pin changes in `bbj-intellij/build.gradle.kts`
(no fixed expiry — this is vendor-version-pinned analysis, not time-sensitive prose)
