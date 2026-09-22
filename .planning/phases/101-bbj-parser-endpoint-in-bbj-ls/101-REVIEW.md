---
phase: 101-bbj-parser-endpoint-in-bbj-ls
reviewed: 2026-09-22T09:43:44Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - /home/coder/repos/bbj-ls/pom.xml
  - /home/coder/repos/bbj-ls/README.md
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/BbjPrefixAlgorithm.java
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseError.java
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseProgramParams.java
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseProgramResult.java
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java
  - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java
  - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java
  - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java
  - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseGuardsTest.java
  - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java
findings:
  critical: 5
  warning: 3
  info: 1
  total: 9
status: issues_found
---

# Phase 101: Code Review Report

**Reviewed:** 2026-09-22T09:43:44Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the `bbj-ls` `parseProgram` endpoint (feat/689-parse-program-endpoint vs. develop@d64b164): the new DTOs (`ParseError`, `ParseProgramParams`, `ParseProgramResult`), the connection-scoped `BbjPrefixAlgorithm`, the new `ParserWorker` (latest-wins single-thread worker with a timeout marker and size caps), and the `InteropService`/`LanguageService` wiring that creates, reuses and tears down that worker per connection.

The size-cap and cancellation-supersession logic itself is solid and well covered by `ParseGuardsTest`/`ParseProgramIntegrationTest`. However, `parseProgram` has no defensive guard around malformed input or connection-teardown races, so several distinct failure modes bypass the documented `-33001..-33005` application-error contract entirely and surface as raw, uncaught exceptions instead (violating the documented guarantee that a failure is always a mapped `ResponseErrorException`, never an unstructured escape). There is also a genuine TOCTOU race in the per-parse timeout marker that can permanently wedge a connection into "always timeout," and a pre-existing but now more consequential bug in `LanguageService`'s accept loop that can take the entire listener down on a single bad connection close.

## Critical Issues

### CR-01: `parseProgram` throws uncaught `NullPointerException`/`ResponseErrorException`-only guard leaves several inputs unvalidated

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:216-223`
**Issue:** `parseProgram` only catches `ResponseErrorException` around `ParserWorker.checkSize(params)`:
```java
@JsonRequest
public CompletableFuture<ParseProgramResult> parseProgram(ParseProgramParams params) {
    try {
        ParserWorker.checkSize(params);
    } catch (ResponseErrorException e) {
        return CompletableFuture.failedFuture(e);
    }
    return parserWorker().submit(params);
}
```
Every other request field is defensively null-checked (`primeForRequest`, `checkSize`'s text/prefix handling), but `canonicalName` is not. If a client sends (or omits, which Gson leaves as Java `null`) `canonicalName`, `ParserWorker.submit` calls:
```java
// /home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:218
PendingParse displaced = pending.put(params.canonicalName, pendingParse);
```
`ConcurrentHashMap.put(null, …)` throws `NullPointerException` unconditionally — this is not a `ResponseErrorException`, so it is not caught here. It escapes `parseProgram` synchronously (not as a failed future), skipping the entire `ERROR_*` application-error contract that `ParserWorker`'s own Javadoc promises. The same is true if the whole `params` object itself is `null` — `ParserWorker.checkSize(params, maxBytes)` at `ParserWorker.java:326` dereferences `params.text` unconditionally and throws NPE before the `try` block's catch type can match it.
**Fix:** Validate required fields before touching the worker, and translate any unexpected null into one of the documented codes instead of letting it escape:
```java
@JsonRequest
public CompletableFuture<ParseProgramResult> parseProgram(ParseProgramParams params) {
    try {
        if (params == null || params.canonicalName == null) {
            throw ParserWorker.invalidRequestError("canonicalName is required");
        }
        ParserWorker.checkSize(params);
        return parserWorker().submit(params);
    } catch (ResponseErrorException e) {
        return CompletableFuture.failedFuture(e);
    }
}
```
(wrap the whole body, not just `checkSize`, and add a dedicated application error code — or reuse `ERROR_PARSE_FAILED` — for "missing canonicalName").

### CR-02: `ParserWorker` construction failure never surfaces `ERROR_SERVICE_UNAVAILABLE` — escapes as a raw exception instead

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:168-178`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:225-230`
**Issue:** `ParserWorker`'s Javadoc for `ERROR_SERVICE_UNAVAILABLE` says: "The parser service could not be obtained, or a BBj class was missing at runtime." But the only place this code is actually produced is inside `translateFailure`, which is only invoked for failures thrown from `parse()` (ParserWorker.java:246). The constructor itself calls `parserService()` eagerly:
```java
ParserWorker(String remoteAddressLabel) {
    this.remoteAddressLabel = remoteAddressLabel;
    this.factory = parserService().getProgramFactory(prefixAlgorithm);   // can throw IllegalStateException
    ...
}
```
and `parserService()` throws `IllegalStateException` when no `ParserServiceIF` is registered. This constructor call happens inside `InteropService.parserWorker()`:
```java
private synchronized ParserWorker parserWorker() {
    if (parserWorker == null) {
        parserWorker = new ParserWorker(remoteAddressLabel());   // synchronous throw
    }
    return parserWorker;
}
```
which is called directly (not wrapped in try/catch) from `parseProgram()`. So on a connection where BBj's `ParserServiceIF` cannot be resolved, the very first `parseProgram` call throws `IllegalStateException` synchronously out of the `@JsonRequest` method instead of returning the documented `-33004` error. Every later call on that connection repeats the same synchronous throw (since `parserWorker` field stays `null` and reconstruction is retried each time).
**Fix:** Catch construction failures in `parserWorker()` (or in `parseProgram()`) and translate them the same way `translateFailure` does, e.g.:
```java
private synchronized ParserWorker parserWorker() {
    if (parserWorker == null) {
        try {
            parserWorker = new ParserWorker(remoteAddressLabel());
        } catch (RuntimeException | LinkageError e) {
            throw ParserWorker.applicationError(ParserWorker.ERROR_SERVICE_UNAVAILABLE,
                    "BBj parser service unavailable: " + e.getMessage());
        }
    }
    return parserWorker;
}
```
(expose `applicationError` as package-visible, or add a small factory method on `ParserWorker`).

### CR-03: `shutdownParserWorker()` races with `parseProgram()`/`submit()` — `RejectedExecutionException` escapes, and `factory`/`prefixAlgorithm` are read without visibility guarantees after being nulled

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:225-241`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:137-138, 209-224, 291-307, 406-419`
**Issue:** `InteropService.parserWorker()` and `shutdownParserWorker()` are both `synchronized`, but that only protects the `InteropService.parserWorker` *field reference*. `parseProgram()` calls `parserWorker().submit(params)` — the `synchronized` lock is released as soon as `parserWorker()` returns, *before* `.submit(...)` runs:
```java
// InteropService.java:222
return parserWorker().submit(params);   // lock held only for parserWorker(), not for submit()
```
Meanwhile `LanguageService.awaitDisconnect` (added in this phase) calls `interopService.shutdownParserWorker()` from a different thread on the shared `EXECUTOR` cached thread pool the moment the connection's lsp4j listening future completes — which can race with an in-flight `parseProgram` call dispatched on that same shared pool. `ParserWorker.shutdown()`:
```java
void shutdown() {
    executor.shutdown();
    ...
    executor.shutdownNow();
    for (PendingParse pendingParse : pending.values()) { ... }
    pending.clear();
    factory = null;               // not volatile
    prefixAlgorithm = null;       // not volatile
}
```
Two concrete failure modes:
1. If `submit()`'s `executor.submit(...)` (ParserWorker.java:222) runs after `executor.shutdown()` has already been called, it throws `RejectedExecutionException`, uncaught, escaping `parseProgram()` synchronously exactly like CR-01/CR-02 — never one of the documented `-3300x` codes.
2. `factory` and `prefixAlgorithm` are plain (non-`volatile`) fields. If a `runPending` task is already executing `parse()` (ParserWorker.java:415, `factory.loadSourceProgram(source)`) concurrently with `shutdown()` nulling `factory`, there is no happens-before edge preventing the worker thread from observing `factory == null` mid-parse (or a torn/late-visible write), producing an unexplained `NullPointerException` instead of the intended `-33001` "parse failed" mapping via a controlled path.
**Fix:** Make `shutdown()` idempotent against a concurrent `submit()`/`parse()` by guarding both with the same monitor used for construction, or by checking `executor.isShutdown()` in `submit()` and failing fast with `ERROR_SERVICE_UNAVAILABLE`/`RequestCancelled` instead of letting `RejectedExecutionException` escape. At minimum, catch `RejectedExecutionException` around `executor.submit(...)` in `submit()`, and do not null out `factory`/`prefixAlgorithm` until `executor.awaitTermination` has confirmed no task is running (which the current code already tries to do for the executor, but not for these two fields' visibility — mark them `volatile` at least).

### CR-04: `overrunning` flag can get stuck `true` forever due to a TOCTOU race with `completeOnTimeout`

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:166, 239-252`
**Issue:**
```java
CompletableFuture<Void> timeoutMarker = new CompletableFuture<>();
timeoutMarker.completeOnTimeout(null, PARSE_TIMEOUT_MS, TimeUnit.MILLISECONDS);
timeoutMarker.thenRun(() -> overrunning = true);
...
} finally {
    overrunning = false;
    timeoutMarker.cancel(false);
}
```
When a parse's duration is close to `PARSE_TIMEOUT_MS`, the delay-scheduler thread that fulfils `completeOnTimeout` races the worker thread's `finally` block. If the timer's normal completion wins the CAS on `timeoutMarker` (i.e. happens before `cancel(false)` executes, but after the worker already executed `overrunning = false`), the `thenRun` callback runs *after* the reset and sets `overrunning = true`. Nothing subsequently clears it: every future `submit()` on this connection (ParserWorker.java:210-215) checks `overrunning` and fails immediately with `ERROR_TIMEOUT` before ever entering `runPending`'s `finally` block again — so the flag can never be reset back to `false`. The connection is permanently wedged into "always timeout" until the client disconnects and reconnects, even though the parser is healthy and no parse is actually running.
**Fix:** Tie the timeout signal to the specific in-flight task instead of a shared boolean, e.g. use a per-submission generation token and only honor the `thenRun` callback if it still matches:
```java
private final AtomicLong generation = new AtomicLong();
...
long myGen = generation.incrementAndGet();
timeoutMarker.thenRun(() -> { if (generation.get() == myGen) overrunning = true; });
...
} finally {
    generation.incrementAndGet();   // invalidate any in-flight timeout callback first
    overrunning = false;
    timeoutMarker.cancel(false);
}
```

### CR-05: `LanguageService` accept loop can be killed entirely by one connection's failed `close()` (pre-existing, but now higher-impact)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:96-102`
**Issue:** In the per-connection setup `catch`:
```java
} catch (Throwable t) {
    LOG.log(Level.SEVERE, "... problem accepting a connection from " + connection.getRemoteAddress(), t);
    // Close the failed connection
    connection.close();
    // Loop to accept another connection
}
```
`connection.close()` is not itself wrapped in a try/catch (contrast with the new `awaitDisconnect` teardown path added in this phase, ParserWorker.java-adjacent `LanguageService.java:134-138`, which correctly swallows `IOException` on close). If `close()` throws `IOException`, it propagates out of this catch block, out of the `while (isRunning())` loop, and is caught by the outer `catch (Throwable t)` at `LanguageService.java:108-112`:
```java
} catch (Throwable t) {
    LOG.log(Level.SEVERE, "... problem running", t);
    Throwables.throwIfUnchecked(t);
    Throwables.throwIfInstanceOf(t, Exception.class);   // IOException is-an Exception -> rethrown
}
```
`Throwables.throwIfInstanceOf(t, Exception.class)` rethrows the checked `IOException`, which exits `run()` with an exception. For `AbstractExecutionThreadService`, a `run()` that throws transitions the whole service to `FAILED` and stops — no more connections are ever accepted again, for any client, until the process is restarted. This line predates this phase, but this phase raised its blast radius: the accept loop now also owns per-connection `ParserWorker` lifecycles via `awaitDisconnect`, so an outage here silently drops every active parse session as well.
**Fix:** Wrap `connection.close()` in its own try/catch, consistent with `awaitDisconnect`'s pattern:
```java
try {
    connection.close();
} catch (IOException closeFailure) {
    LOG.log(Level.WARNING, "Failed to close a failed connection", closeFailure);
}
```

## Warnings

### WR-01: `ParserWorker.mapError`/`mapCategories` assume a rigid BBj JSON error shape; a missing/`null` field throws instead of degrading gracefully

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:447-454, 462-474`
**Issue:** `error.message` is defensively checked for `has(...)`/`isJsonNull()` (line 443-445), but the position fields are not:
```java
JsonObject position = errorObject.getAsJsonObject("ErrorPositionInfo");
if (position != null) {
    error.editorStartLine = position.get("EditorStartingLine").getAsInt();   // NPE if key missing
    ...
}
```
and `mapCategories` calls `typeObject.get(key).getAsString()` without checking for `JsonNull` (which throws `UnsupportedOperationException` on `getAsString()`). Both cases are eventually caught by `runPending`'s generic `catch (Throwable t)` and mapped to `ERROR_PARSE_FAILED`, so they don't crash the connection, but they turn one BBj-reported error's minor shape drift into a total failure of the whole parse response, with a generic message that obscures the real cause.
**Fix:** Apply the same `has(...)`/`isJsonNull()` guards used for `ErrorMessage` to the four position fields and to each category entry, defaulting to `0`/omitting the category rather than throwing.

### WR-02: Connection lock held across `ParserWorker.shutdown()`'s blocking wait, stalling concurrent `parseProgram` calls for up to 2s

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:225-241`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:291-298`
**Issue:** `shutdownParserWorker()` is `synchronized` on the `InteropService` instance and calls `parserWorker.shutdown()`, which blocks up to `SHUTDOWN_AWAIT_MS` (2000ms) in `executor.awaitTermination(...)`. Any concurrent `parseProgram()` call on the same connection needs the same monitor (via `parserWorker()`) and will block for up to 2 seconds during teardown rather than failing fast or proceeding. This is a minor latency/robustness smell rather than a correctness bug, but it's avoidable.
**Fix:** Move the blocking wait outside the synchronized section (e.g. capture the `ParserWorker` reference under the lock, set the field to `null` under the lock, then call `.shutdown()` outside the lock).

### WR-03: `BbjPrefixAlgorithm` resolves absolute paths and unsanitized relative `..` segments with no confinement to the caller-supplied search roots

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/BbjPrefixAlgorithm.java:89-116`
**Issue:** `resolveOnDisk` takes any absolute `fileName` "as-is" (line 90-92) and, for relative names, does `new File(dir, fileName)` (line 111) without stripping `..` segments — so a BBj source's own `USE`/reference could name an absolute path anywhere the BBjServices process can read, or escape a workspace root/prefix directory via `../../..`. The class Javadoc documents this as intentional ("an absolute path is taken as-is"), and a caller could already supply an arbitrary directory directly via `workspaceRoots`/`prefixes`, so this isn't a new privilege escalation over what the endpoint already grants a connected client — but there is no allowlist or confinement check anywhere in this class, which is worth confirming against the intended trust boundary given this endpoint reads arbitrary files based on untrusted request text.
**Fix:** If the intended threat model is "only files under `workspaceRoots`/`prefixes`/the active document's directory," add a canonical-path containment check (`resolved.getCanonicalPath().startsWith(dir.getCanonicalPath() + File.separator)`) before returning a relative-name match, and document explicitly (or confirm via the linked contract doc) that absolute-path resolution is intentionally unconfined.

## Info

### IN-01: `supersessionInFlightInterleavingCancelsTheOlderRequest` relies on `Thread.sleep(50)` to force interleaving

**File:** `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java:287`
**Issue:** The test comment acknowledges the timing is best-effort and asserts only the outcome, which is good practice, but a fixed 50ms sleep against a live BBjServices instance is still a source of occasional flakiness under load (CI contention, GC pauses) if the first parse doesn't yet start within that window.
**Fix:** Not blocking; consider a small retry/backoff or a hook that confirms the first request has actually started before sending the second, if flakiness is observed in CI.

---

_Reviewed: 2026-09-22T09:43:44Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
