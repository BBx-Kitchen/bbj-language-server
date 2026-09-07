---
status: complete
phase: 86-intellij-interop-settings-targeted-refresh
source: [86-VERIFICATION.md]
started: 2026-09-07T16:40:00Z
updated: 2026-09-07T19:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Refresh Java Classes keeps language features online (QA/FULL-TEST-CHECKLIST.md row 16)
expected: Completion, hover and Structure View all answer while the refresh progress task is visible; the status-bar widget stays `started`; exactly one console success line; no balloon.
result: issue
reported: "pass. Just noticed (probably from Test 1): java.util.concurrent.CompletionException: org.eclipse.lsp4j.jsonrpc.JsonRpcException: java.io.IOException: Stream closed\n    at java.base/java.util.concurrent.CompletableFuture.wrapInCompletionException(CompletableFuture.java:323)\n    at java.base/java.util.concurrent.CompletableFuture.encodeThrowable(CompletableFuture.java:359)\n    at java.base/java.util.concurrent.CompletableFuture.completeThrowable(CompletableFuture.java:364)\n    at java.base/java.util.concurrent.CompletableFuture$AsyncRun.run(CompletableFuture.java:1828)\n    at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1090)\n    at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:614)\n    at java.base/java.lang.Thread.run(Thread.java:1474)\nCaused by: org.eclipse.lsp4j.jsonrpc.JsonRpcException: java.io.IOException: Stream closed\n    at org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer.consume(StreamMessageConsumer.java:72)\n    at com.redhat.devtools.lsp4ij.LanguageServerWrapper.lambda$start$7(LanguageServerWrapper.java:478)\n    at java.base/java.util.concurrent.CompletableFuture$AsyncRun.run(CompletableFuture.java:1825)\n    ... 3 more\nCaused by: java.io.IOException: Stream closed\n    at java.base/java.lang.ProcessBuilder$NullOutputStream.write(ProcessBuilder.java:434)\n    at java.base/java.io.OutputStream.write(OutputStream.java:167)\n    at java.base/java.io.BufferedOutputStream.flushBuffer(BufferedOutputStream.java:123)\n    at java.base/java.io.BufferedOutputStream.flush(BufferedOutputStream.java:203)\n    at org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer.consume(StreamMessageConsumer.java:69)\n    ... 5 more"
severity: blocker

### 2. Java-interop port auto-detects, and an explicitly confirmed 5008 is kept (QA/FULL-TEST-CHECKLIST.md row 17)
expected: Against a real BBjServices install, open Settings → BBj. With Auto-detect on, the greyed Port field and the hint line track a live `BBj.properties` edit of `com.basis.languageServer.addr` across a dialog reopen. Uncheck Auto-detect, enter 5008, Apply, reopen: 5008 survives with the checkbox still off even though the properties file names a different port. Re-check Auto-detect: the detected value returns. No dialog, validator warning or balloon at any point.
result: pass

### 3. QA/FULL-TEST-CHECKLIST.md row 16 + row 17, rerun together — G-86-1 live recheck
expected: |
  Open a project with a large Java classpath, wait for `started`, run Refresh Java Classes while
  invoking completion/hover/Structure View, then immediately run the Settings-Apply restart flow
  (row 17) in the SAME session — exactly the sequence that originally surfaced G-86-1. Inspect the
  IDE log afterward. Completion/hover/Structure View all answer during the refresh; status widget
  stays `started`; deliberate restarts log "Language server stopped for a restart" (not "stopped
  unexpectedly"/"Auto-restarting"); no `JsonRpcException`/`Stream closed` trace appears anywhere in
  the log.
result: pass

### 4. Triage decision on WR-01/WR-02 (86-05-REVIEW.md)
expected: |
  N/A — a judgment call, not a runtime test. Either a follow-up fix (pass the true
  immediate-predecessor status into `classify()`, and wrap the bounded-wait sequence with a logged
  catch) or an explicit accepted-risk decision recorded before shipping.
  - WR-01: `updateStatus()` passes a `previousStatus` value that lags the true immediate
    predecessor by one broadcast (self-corrects for the single-hop sequence G-86-1's fix targets;
    a duplicate/echoed `stopped` broadcast would not self-correct).
  - WR-02: `doRestart()` has no exception handling around the new bounded wait; a thrown exception
    would leave the server stopped with no console explanation.
result: pass
reported: "Accepted as-is (no follow-up fix requested)."

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-86-1
  truth: "Refresh Java Classes runs without breaking the LSP connection — no 'connection to the server got closed' condition, and the log stays clean of stream-closed/JsonRpcException noise."
  status: resolved
  resolved_by: 86-05-PLAN.md
  resolved_at: 2026-09-07
  reason: "User reported: pass (visible completion/hover/Structure View behavior all worked) but noticed a JsonRpcException/IOException 'Stream closed' stack trace in the log, probably triggered by Test 1 (Refresh Java Classes)."
  severity: blocker
  test: 1
  root_cause: "Upstream lsp4ij race (LanguageServerWrapper's messageWriter executor is gated only by isDisposed(), not 'stop in progress' — a queued outgoing message written after stop() destroys the process throws IOException Stream closed) is reached because BbjServerService.updateStatus() misclassifies every deliberate restart as a crash and fires a redundant requestRestart(), and RestartGate has no in-flight guard against that redundant request overlapping the restart already executing in doRestart() (which never awaits manager.stop()'s future before calling manager.start()). Both defects predate Phase 86; likely triggered by QA row 17's Settings-Apply restart landing close to row 16's heavy concurrent LSP traffic."
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java"
      issue: "updateStatus() crash-detection false positive on deliberate restarts (~lines 131-165); doRestart() fire-and-forget stop/start without awaiting stop's future (~lines 243-248)"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java"
      issue: "No in-flight guard against a restart request landing while a restart is already executing"
  missing:
    - "An 'expected stop' flag on BbjServerService that doRestart() sets before manager.stop() and clears after manager.start() returns, so updateStatus()'s crash heuristic skips the false-positive requestRestart() for deliberate restarts"
    - "doRestart() awaiting manager.stop()'s returned future before calling manager.start(), so the two phases cannot overlap"
  debug_session: ".planning/debug/refresh-stream-closed.md"
