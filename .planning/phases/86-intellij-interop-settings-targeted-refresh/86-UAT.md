---
status: complete
phase: 86-intellij-interop-settings-targeted-refresh
source: [86-VERIFICATION.md]
started: 2026-09-07T16:40:00Z
updated: 2026-09-07T17:20:00Z
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

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-86-1
  truth: "Refresh Java Classes runs without breaking the LSP connection — no 'connection to the server got closed' condition, and the log stays clean of stream-closed/JsonRpcException noise."
  status: failed
  reason: "User reported: pass (visible completion/hover/Structure View behavior all worked) but noticed a JsonRpcException/IOException 'Stream closed' stack trace in the log, probably triggered by Test 1 (Refresh Java Classes)."
  severity: blocker
  test: 1
  artifacts: []
  missing: []
  debug_session: ""
