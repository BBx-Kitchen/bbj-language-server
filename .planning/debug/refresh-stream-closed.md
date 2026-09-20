---
status: diagnosed
trigger: "UAT gap G-86-1 (Phase 86, intellij-interop-settings-targeted-refresh): Refresh Java Classes runs without breaking the LSP connection — no 'connection to the server got closed' condition, and the log stays clean of stream-closed/JsonRpcException noise. Severity: blocker. QA/FULL-TEST-CHECKLIST.md row 16."
created: 2026-09-07T00:00:00Z
updated: 2026-09-07T00:00:00Z
audit_acknowledged:
  milestone: v4.3
  at: 2026-09-13
  status: diagnosed
---

## Current Focus

hypothesis: CONFIRMED — see Resolution.root_cause
test: source-level trace across BbjServerService.java, BbjLanguageClient.java, RestartGate.java and the shipped lsp4ij-0.21.0 jar's LanguageServerWrapper (fetched matching source from GitHub tag 0.21.0)
expecting: n/a — diagnose-only session, no fix applied
next_action: return ROOT CAUSE FOUND to caller (goal: find_root_cause_only)

## Symptoms

expected: "Refresh Java Classes keeps language features online" (QA row 16) — completion/hover/Structure View answer while the refresh runs, status widget stays `started`, exactly one console success line, no balloon, and the log stays free of connection-closed / stream-closed noise.
actual: The visible UAT behavior passed (completion, hover, Structure View all worked during the refresh), but the tester noticed a JsonRpcException/IOException("Stream closed") stack trace appear in the log, "probably" tied to Test 1.
errors: |
  java.util.concurrent.CompletionException: org.eclipse.lsp4j.jsonrpc.JsonRpcException: java.io.IOException: Stream closed
      at java.util.concurrent.CompletableFuture.wrapInCompletionException(CompletableFuture.java:323)
      ...
  Caused by: org.eclipse.lsp4j.jsonrpc.JsonRpcException: java.io.IOException: Stream closed
      at org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer.consume(StreamMessageConsumer.java:72)
      at com.redhat.devtools.lsp4ij.LanguageServerWrapper.lambda$start$7(LanguageServerWrapper.java:478)
      ...
  Caused by: java.io.IOException: Stream closed
      at java.lang.ProcessBuilder$NullOutputStream.write(ProcessBuilder.java:434)
      at java.io.BufferedOutputStream.flushBuffer(BufferedOutputStream.java:123)
      at java.io.BufferedOutputStream.flush(BufferedOutputStream.java:203)
      at org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer.consume(StreamMessageConsumer.java:69)
reproduction: "UAT session ran QA row 16 (Refresh Java Classes on a large classpath, invoking completion/hover/Structure View while the progress task was visible) immediately followed by QA row 17 (Settings dialog Auto-detect/Apply flow). The exact moment the trace appeared was not captured with a timestamp; user attributed it to 'probably Test 1'."
started: "First observed during Phase 86 end-of-phase UAT (2026-09-07), the first time the new Refresh Java Classes targeted-request action existed to test."

## Eliminated

- hypothesis: "BbjRefreshJavaClassesAction's bounded .get(timeout, TimeUnit) calls on the composer-server-proxy future or the refreshJavaClasses() future cancel or close the underlying stream/process on timeout."
  evidence: "Full read of BbjRefreshJavaClassesAction.java and JavaClassesRefreshFlow.java: Future.get(timeout) only throws TimeoutException on the calling thread — it does not call cancel()/close() on the underlying CompletableFuture or touch any process/stream object. JavaClassesRefreshFlow.run() only classifies the exception into an Outcome; no code path here reaches BbjLanguageServer, OSProcessStreamConnectionProvider, or any Process/OutputStream."
  timestamp: 2026-09-07T00:00:00Z

- hypothesis: "BbjComposerService.server(project) calling LanguageServerManager.getInstance(project).start(SERVER_ID) on every refresh invocation (even when the server is already running) causes a duplicate LanguageServerWrapper/process, and the stale one's teardown produces the Stream closed noise."
  evidence: "Fetched lsp4ij-0.21.0's actual LanguageServerWrapper.java (tag matching the build.gradle.kts-pinned plugin version, verified byte-identical class file present in the built idea-sandbox plugin lib) and read start(): it is `synchronized`, and at the top: `if (this.languageServer != null) { if (isActive()) return; ... }` — calling start() while the wrapper is already active is a documented no-op, no new process is spawned. This exact BbjComposerService.server() call pattern predates Phase 86 (used since #433 by BbjCompileAction and the composer dialogs) with no prior reports of this failure, consistent with it being a safe no-op."
  timestamp: 2026-09-07T00:00:00Z

- hypothesis: "The refresh action's success path itself calls BbjServerService.requestRestart(...), directly causing the stop/start cycle that races with in-flight messages."
  evidence: "grep across bbj-intellij/src/main for every requestRestart/scheduleRestart call site: BbjRefreshJavaClassesAction.java line 110 only calls requestRestart(0) inside the D-14 failure-balloon's 'Restart language server' NotificationAction — reachable only if the user clicks that action after a FAILED refresh. Test 1 in the UAT reported a successful refresh (completion/hover/Structure View all worked, exactly the pass criteria), so this path was never reached."
  timestamp: 2026-09-07T00:00:00Z

## Evidence

- timestamp: 2026-09-07T00:00:00Z
  checked: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java, refresh/JavaClassesRefreshFlow.java, refresh/RefreshInFlightGuard.java, composer/BbjComposerService.java"
  found: "The new Phase 86 refresh code path (Task.Backgroundable -> JavaClassesRefreshFlow.run -> BbjComposerService.server(project).get(timeout) -> server.refreshJavaClasses().get(timeout)) does no stream/process manipulation and, on success, only logs one console line (render()). No restart is triggered on success (D-13 honored)."
  implication: "The Stream-closed noise is not produced directly by the refresh feature's own request/response handling code."

- timestamp: 2026-09-07T00:00:00Z
  checked: "WebSearch for the exact stack signature (StreamMessageConsumer.consume / LanguageServerWrapper.lambda$start / ProcessBuilder$NullOutputStream / JsonRpcException Stream closed)"
  found: "This exact trace shape is a well-known, widely reported upstream LSP4IJ/LSP4J race, independent of any BBj-specific code: redhat-developer/intellij-quarkus #1028 ('Stream closed exception thrown when task is finished and language server is stopped'), #583, #1073; eclipse-lsp4j #633. The intellij-quarkus #1028 fix note: 'check that the language client is not disposed to avoid returning the result of the background task to the server which is stopped in that case' — i.e. the trigger is always a message written to the wire after the server has already been stopped."
  implication: "This is a documented upstream LSP4IJ defect class, not something newly introduced by Phase 86's application code. The question narrows to: what in THIS codebase makes a stop/restart race reachable during a routine UAT pass."

- timestamp: 2026-09-07T00:00:00Z
  checked: "Decompiled/fetched lsp4ij-0.21.0 LanguageServerWrapper.java (curl'd https://raw.githubusercontent.com/redhat-developer/lsp4ij/0.21.0/... — matches the exact 0.21.0 version pinned in bbj-intellij/build.gradle.kts and the .class file shipped in build/idea-sandbox/IC-2024.2/plugins/lsp4ij/lib/lsp4ij-0.21.0.jar), lines 400-540 (start()) and 1656-1790 (stop()/shutdownAll())"
  found: "Every outgoing message (client->server requests, responses, and even the mandatory shutdown()/exit() calls stop() itself issues) is funneled through a `wrapper` MessageConsumer (lines 469-492) that (a) only refuses to enqueue when `isDisposed()` is true — NOT when a stop/restart is merely in progress — and (b) dispatches the actual write asynchronously via `CompletableFuture.runAsync(() -> consumer.consume(message), messageWriter)` on a single-thread executor (`messageWriter`, line 184). `lambda$start$7` at line 478 is exactly this runAsync call. `stop()` (line 1667) calls shutdownAll() (shutdown+exit, synchronous JSON-RPC calls that themselves funnel through the same wrapper/messageWriter) and only AFTER that returns calls `provider.stop()`, which destroys the OS process and (per JDK's ProcessBuilder/ProcessImpl) leaves any Process.getOutputStream() write throwing IOException('Stream closed') via the NullOutputStream sentinel used once the pipe is torn down. Nothing in this pipeline drains/quiesces `messageWriter` or blocks new message producers once stop() begins — only the coarser `isDisposed()` (project/plugin disposal) guards enqueueing."
  implication: "ROOT MECHANISM CONFIRMED: any client-originated LSP message (a normal request, a $/cancelRequest, or the shutdown/exit sequence itself) that is still queued on `messageWriter` — or gets enqueued from another thread — at the moment `provider.stop()` destroys the process will throw exactly the observed JsonRpcException(IOException 'Stream closed') the next time the single-thread executor reaches it. This fires whenever the language server undergoes ANY stop/restart while other LSP traffic is in flight — it is not specific to the refreshJavaClasses request."

- timestamp: 2026-09-07T00:00:00Z
  checked: "bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java updateStatus() (lines 124-197) and doRestart() (lines 243-248); bbj-intellij/.../concurrency/RestartGate.java; bbj-intellij/.../lsp/BbjLanguageClient.java handleServerStatusChanged (lines 42-54)"
  found: "(1) doRestart() calls `manager.stop(\"bbjLanguageServer\")` then IMMEDIATELY `manager.start(\"bbjLanguageServer\")` without awaiting stop()'s returned CompletableFuture — LSP4IJ's stop() runs its process teardown asynchronously (CompletableFuture.runAsync at line 1699 of LanguageServerWrapper), so doRestart() does not know teardown finished before requesting a new start. (2) BbjLanguageClient.handleServerStatusChanged forwards every LSP4IJ ServerStatus transition into BbjServerService.updateStatus(status) — confirmed wired, not bypassed. (3) updateStatus()'s crash-detection fires whenever `status==stopped && (previousStatus==started||previousStatus==starting)` — this condition is met on EVERY deliberate restart (doRestart's own `manager.stop()` transitions started -> stopping -> stopped, and previousStatus captured at the 'stopping' step is `started`), not only genuine unexpected crashes; there is no 'expected stop, do not treat as crash' flag. When crashCount reaches 1, updateStatus() itself calls `requestRestart(CRASH_RESTART_DELAY_MS)` — a second, independently-triggered restart. (4) RestartGate.request() (concurrency/RestartGate.java) is documented and implemented as coalescing only requests that arrive while a restart is still PENDING (before its delay elapses) — 'No in-flight flag ... a trigger that arrives after the window already fired opens a new window and produces a second restart' (its own javadoc). So a crash-triggered requestRestart() that lands after the original doRestart() has already started executing produces a genuinely SECOND, OVERLAPPING doRestart() call, i.e. two concurrent manager.stop()/manager.start() cycles on the same LanguageServerWrapper."
  implication: "Every deliberate restart (Settings Apply from QA row 17's scheduleRestart(), the manual restart action, the refresh action's own D-14 failure fallback, or the Node-download-success restart) self-triggers a spurious extra restart cycle via the crash-detection false positive, and RestartGate does not prevent that second cycle from overlapping the first once the first has already begun executing. Two overlapping stop/start cycles racing LSP4IJ's async process teardown is exactly the condition that reaches the upstream 'Stream closed' race documented above."

- timestamp: 2026-09-07T00:00:00Z
  checked: "git log --follow -p for BbjServerService.java's crash-detection condition and doRestart()'s stop-then-start shape"
  found: "The crash-detection condition (`previousStatus == ServerStatus.started || previousStatus == ServerStatus.starting`) is present verbatim as far back as the very first commit that introduced the IntelliJ plugin's LSP integration (35c916b3, 'IntelliJ plugin through v1.2'). doRestart()'s stop()-then-start() shape was introduced in Phase 79 (c8dde051/09416d05/6b279cd8, 'guarded restart entry point via coalescing RestartGate'). Neither was touched or introduced by any Phase 86 plan/commit (86-01 through 86-04 never modify BbjServerService's updateStatus() or doRestart(); they only add BbjRefreshJavaClassesAction's requestRestart(0) call in the D-14 failure path)."
  implication: "The double-restart mechanism is a PRE-EXISTING latent defect (Phase 1.x / Phase 79), not a regression introduced by Phase 86. Phase 86's refresh feature did not create this race — but QA row 16's UAT script (heavy concurrent LSP traffic — completion, hover, Structure View — deliberately fired while a long-running request is in flight) immediately followed by QA row 17's Settings-Apply restart in the SAME session is exactly the kind of scenario that reaches the pre-existing race, which is why it surfaced now."

## Resolution

root_cause: |
  Not a defect in the new bbj/refreshJavaClasses request/response code itself (that path never
  restarts on success, D-13). The observed JsonRpcException(IOException 'Stream closed') is the
  well-documented upstream LSP4IJ race where outgoing LSP messages queued on the wrapper's
  single-thread `messageWriter` executor (gated only by isDisposed(), not by "stop in progress")
  are written to the language-server process's stdin AFTER LanguageServerWrapper.stop() has
  already destroyed that process, at which point Process.getOutputStream() has become a
  ProcessBuilder$NullOutputStream that always throws IOException("Stream closed") on write
  (confirmed against the shipped lsp4ij-0.21.0 sources; independently confirmed as a known class
  of bug in redhat-developer/intellij-quarkus #1028/#583/#1073 and eclipse-lsp4j #633).

  This project reaches that race easily because of two PRE-EXISTING (not Phase-86-introduced)
  BbjServerService defects that combine to produce genuinely overlapping restart cycles on every
  deliberate restart:
    1. updateStatus()'s crash-auto-restart heuristic cannot distinguish a deliberate stop
       (Settings Apply, manual restart, the refresh action's own D-14 failure fallback, Node
       download success) from a genuine unexpected crash — every stopped transition whose
       previousStatus was started/starting is treated as crashCount==1 and fires its own
       requestRestart(CRASH_RESTART_DELAY_MS).
    2. RestartGate has no in-flight guard (by explicit design/javadoc) — a request that arrives
       after the pending window has already fired schedules a second, independent restart even
       while the first doRestart() (itself a fire-and-forget manager.stop() immediately followed
       by manager.start(), never awaiting stop()'s returned future) is still executing.
  The result is two overlapping manager.stop()/manager.start() cycles on the same
  LanguageServerWrapper, which is exactly the condition that exposes the upstream messageWriter
  race: LSP traffic queued by one cycle (or leftover completion/hover/documentSymbol requests
  QA row 16's script deliberately fires while the refresh is in flight) gets flushed against a
  process the other cycle already destroyed.
fix: ""
verification: ""
files_changed: []
