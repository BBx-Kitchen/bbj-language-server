---
phase: 95-java-interop-status-accuracy-widget-consolidation
reviewed: 2026-09-19T17:54:40Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropPollPolicy.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeEndpoint.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactoryBase.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropPollPolicyTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropProbeClientTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropStatusPresentationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropPollGateSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropServiceDisposalSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 95: Code Review Report

**Reviewed:** 2026-09-19T17:54:40Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the LSP4J-based interop probe (`InteropProbeClient`/`InteropProbeEndpoint`), the poll-gate
decision seam (`InteropPollPolicy`), the presentation seam (`InteropStatusPresentation`), the service
that wires them together (`BbjJavaInteropService`), the consolidated status-bar widget base
(`BbjStatusBarWidgetBase`) and its two thin subclasses/factories, the two port-literal cleanups, and
every test file in scope (including four source-guard fences).

`InteropProbeClient.probe()` correctly closes the socket and tears down its listener on every exit
path (success, timeout, JSON-RPC error, `IOException`, and `InterruptedException` with the interrupt
flag restored), and the grace-period ladder in `checkConnection()` correctly reads the pre-CHECKING
`previousStatus` snapshot rather than the field that now flips to CHECKING before every probe — both
match the intent described for this phase.

The one finding that must block: `checkConnection()`'s closing `InteropPollPolicy.decide(...)` call
hardcodes `serverStarted = true` instead of re-reading the live server status the way
`refreshSelectionGate()` does. Combined with `currentStatus` being written from both the EDT (the
server-stop handler) and the pooled poll thread with no synchronization, a probe that is in flight at
the moment the language server stops can both overwrite the just-set `DISCONNECTED` status with a
stale `CONNECTED`/`WRONG_PEER` verdict and silently resume the poll loop that `stopChecking()` was
supposed to have paused for good.

The remaining findings are quality/robustness items: unsynchronized cross-thread status fields,
unbounded DNS resolution ahead of the probe's own timeout budget, a status-bar widget that only
partially adopted the new shared presentation seam, and two minor redundancies.

## Critical Issues

### CR-01: In-flight probe can resurrect a stale status and silently outlive `stopChecking()`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:90-95,208-273`
**Issue:**

`checkConnection()` runs on the pooled-thread `Alarm` and can take up to `TCP_TIMEOUT_MS +
RESPONSE_TIMEOUT_MS` (1s + 2s = 3s) to return, per `InteropProbeClient.probe()`. While a probe is
in flight, the language server can stop:

```java
90    status -> {
91        if (status == ServerStatus.started) {
92            handleServerStarted();
93        } else if (status == ServerStatus.stopped || status == ServerStatus.stopping) {
94            stopChecking();
95            updateStatus(InteropStatus.DISCONNECTED);
```

`stopChecking()` (`checkAlarm.cancelAllRequests()`) can only cancel *pending* (not yet started)
Alarm requests — it cannot stop a `checkConnection()` invocation that has already been dequeued and
is blocked inside `InteropProbeClient.probe()`. That in-flight tick still runs to completion and, at
its tail, does two things unconditionally:

```java
266   updateStatus(newStatus);
...
272   applyDecision(InteropPollPolicy.decide(InteropPollPolicy.Trigger.TICK_COMPLETED,
273           bbjFileSelected, gateWasOpen, true));
```

1. `updateStatus(newStatus)` at line 266 writes `currentStatus` directly (not volatile, no lock) from
   the pooled thread. If this write lands *after* the EDT's `updateStatus(InteropStatus.DISCONNECTED)`
   at line 94-95, it silently overwrites the correct `DISCONNECTED` status with whatever the stale
   probe concluded (e.g. `CONNECTED`, if the java-interop socket is still independently reachable even
   though the language server was told to stop) — the status bar and the editor banner can then show
   "Java: Connected" while the language server itself is stopped.
2. The closing `applyDecision(...)` call at line 272-273 passes a hardcoded `true` for
   `serverStarted`, not a fresh read of `BbjServerService.getInstance(project).getCurrentStatus()`
   the way `refreshSelectionGate()` does two methods above it. If the gate is open,
   `InteropPollPolicy.decide(TICK_COMPLETED, true, ..., true)` returns `REARM`, which calls
   `scheduleNextCheck()` and silently resumes the 5s poll loop — even though `stopChecking()` already
   ran and there will be no further `stopped`/`stopping` event to cancel it again. The service keeps
   polling a language server that is no longer running until the next `started` event happens to
   reset it, defeating the documented "poll only runs while the server is started" contract and the
   whole point of `stopChecking()`.

The comment above this call ("`serverStarted` is true by construction... `stopChecking()` cancels
every pending request the instant the server stops") is true only for requests still *pending* in the
Alarm queue — it does not account for a tick already executing when the stop event fires, which is
exactly the race window this method's own 1-3s probe latency creates.

**Fix:** Re-read live server status at the tail of `checkConnection()`, the same way
`refreshSelectionGate()` does, and skip the status write entirely if the server is no longer started:

```java
boolean serverStarted =
        BbjServerService.getInstance(project).getCurrentStatus() == ServerStatus.started;
if (serverStarted) {
    updateStatus(newStatus);
}
applyDecision(InteropPollPolicy.decide(InteropPollPolicy.Trigger.TICK_COMPLETED,
        bbjFileSelected, gateWasOpen, serverStarted));
```

This closes both halves of the race: a stopped server can no longer have its `DISCONNECTED` status
overwritten by a straggling probe, and `REARM` can no longer fire once the server has actually
stopped. (See WR-01 below for the related `currentStatus` synchronization gap this finding also
exposes.)

## Warnings

### WR-01: `currentStatus` / `firstCheckCompleted` are written cross-thread without `volatile` or locking

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:67-69,279-284,307-318`
**Issue:** `currentStatus`, `disconnectedSince`, and `firstCheckCompleted` are plain fields, written
from the pooled-thread `checkConnection()`/`updateStatus()` path and also written directly from the
EDT server-status-listener callback (`updateStatus(InteropStatus.DISCONNECTED)` at line 94-95). They
are read from `getCurrentStatus()`/`isFirstCheckCompleted()`, which are called from
`BbjJavaInteropNotificationProvider.collectNotificationData()` and
`BbjJavaInteropStatusBarWidget.currentStatus()` — call sites that are not guaranteed to be the EDT in
current IntelliJ platform versions (`EditorNotificationProvider.collectNotificationData` can run on a
background thread) and are not causally ordered with the pooled-thread writer via any `happens-before`
edge. This is a genuine JMM visibility/write-race gap, and CR-01 shows it is not merely theoretical.
**Fix:** Mark `currentStatus` and `firstCheckCompleted` `volatile` (matching the existing
`bbjFileSelected`/`gateWasOpen` pattern in this same class), or route every write through a single
thread (e.g. always via `ApplicationManager.getApplication().invokeLater(...)`, as `broadcastStatus`
already does for the message-bus publish).

### WR-02: Interop host resolution has no timeout, so a misconfigured host can stall the poll well past the documented 1s+2s budget

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java:47-54`
**Issue:** `socket.connect(new InetSocketAddress(host, port), connectTimeoutMs)` performs the DNS
lookup for `host` *inside* `InetSocketAddress`'s constructor, before `connectTimeoutMs` starts
applying — that timeout only bounds the subsequent TCP handshake, not the name resolution. The class
comment ("1s+2s stays inside CHECK_INTERVAL_MS", also asserted in
`BbjJavaInteropService.java:73`) is only true for `localhost`/numeric hosts. `javaInteropHost` is a
user-editable `BbjSettings.State` field (default `"localhost"`, but a typo'd or unreachable hostname
is one settings edit away); if DNS resolution hangs (a common symptom of a stale/unreachable DNS
server), a single poll tick can block far longer than 5s, delaying every subsequent check behind it.
**Fix:** Resolve the address off-thread with its own bounded timeout (e.g. via
`CompletableFuture.supplyAsync(() -> new InetSocketAddress(host, port)).get(connectTimeoutMs,
MILLISECONDS)`), or document/enforce that `javaInteropHost` must be an IP literal.

### WR-03: `InteropProbeClient` does not wait for its per-call executor to actually terminate

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java:56,77-83`
**Issue:** Every `probe()` call allocates a fresh `Executors.newCachedThreadPool()` (non-daemon
threads) to back the LSP4J `Launcher`. On the way out, `listening.cancel(true)` and
`executor.shutdownNow()` both return immediately without blocking; `Thread.interrupt()` does not
unblock a thread parked in a blocking `java.io.Socket` stream read (LSP4J's `StreamMessageProducer`
uses blocking I/O, not NIO channels), so the listener thread only actually exits once
`closeQuietly(socket)` forces an `IOException` on its blocked read. That ordering is correct today,
but there is no `awaitTermination(...)` call and no daemon-thread factory, so if a future LSP4J
version or platform quirk ever delays that unblock, the thread from this tick's executor can outlive
the `probe()` call that spawned it — and a new executor/thread is created every ~5s indefinitely
while polling is active.
**Fix:** Either call `executor.awaitTermination(...)` with a small bound after `closeQuietly()`
(logging if it times out), or use a single shared, reusable `ExecutorService` for the class instead of
allocating one per call.

### WR-04: `BbjJavaInteropStatusBarWidget.textFor()` only partially adopts the new shared presentation seam

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java:52-65`
**Issue:** `InteropStatusPresentation.statusText()` exists precisely to be "the widget's... status
label" — but `textFor()` only delegates to it for the new `WRONG_PEER` case; `CONNECTED`,
`DISCONNECTED`, and `CHECKING` keep independently hardcoded string literals that duplicate
`InteropStatusPresentation.statusText()`'s own `if` chain:

```java
52    protected String textFor(BbjJavaInteropService.InteropStatus status) {
53        switch (status) {
54            case CONNECTED:
55                return "Java: Connected";              // duplicates InteropStatusPresentation.statusText
...
60            case WRONG_PEER:
61                return InteropStatusPresentation.statusText(status.name());  // delegates
```

The strings are byte-identical today (confirmed by
`InteropStatusPresentationTest.statusTextIsByteIdenticalForThePreExistingThreeLabels`), so there is no
behavioral bug yet, but the two copies can now drift silently — a future edit to
`InteropStatusPresentation.statusText()` would not update the widget, and vice versa.
**Fix:** Delegate the whole switch to `InteropStatusPresentation.statusText(status.name())`, matching
what `tooltipFor()` already does one method below.

## Info

### IN-01: Redundant CONNECTED/CHECKING guard in the notification provider

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java:42-51`
**Issue:** The explicit `if (currentStatus == CONNECTED || currentStatus == CHECKING) { return null;
}` check is now fully subsumed by `InteropStatusPresentation.bannerText()`, which already returns
`null` for every status other than `DISCONNECTED`/`WRONG_PEER` (including `CONNECTED` and
`CHECKING`). The two checks say the same thing twice.
**Fix:** Drop the explicit status comparison and rely solely on the `bannerText == null` check that
follows it.

### IN-02: Likely-unreachable `ResponseErrorException` catch clause

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java:72`
**Issue:** `remote.getTopLevelPackages().get(responseTimeoutMs, TimeUnit.MILLISECONDS)` is a
`CompletableFuture.get(timeout, unit)` call; the only checked/declared exceptions it can throw are
`TimeoutException`, `ExecutionException`, and `InterruptedException`. A JSON-RPC error response from
the peer completes the future exceptionally with a `ResponseErrorException`, but `Future.get()` always
wraps *any* exceptional completion in `ExecutionException` — so the bare `ResponseErrorException` arm
of the multi-catch is dead code in this call shape (harmless here, since both arms return the same
`WRONG_PEER` verdict, but worth removing or leaving a comment explaining why it's there defensively).
**Fix:** Either drop `ResponseErrorException` from the catch list (it is already covered via
`ExecutionException`'s cause chain) or add a short comment noting it is a defensive/future-proofing
catch rather than a currently-reachable one.

---

_Reviewed: 2026-09-19T17:54:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
