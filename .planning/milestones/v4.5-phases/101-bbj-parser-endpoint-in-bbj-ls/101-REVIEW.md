---
phase: 101-bbj-parser-endpoint-in-bbj-ls
reviewed: 2026-09-22T14:30:00Z
depth: standard
re_review: true
previous_review: 2026-09-22T09:43:44Z
tree: bbj-ls develop cd5bf83
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
  critical: 4
  warning: 3
  info: 0
  total: 7
status: issues_found
---

# Phase 101: Code Review Report (Re-Review)

**Reviewed:** 2026-09-22T14:30:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Re-reviewed `bbj-ls` `develop` at `cd5bf83` against the previous report (`d23422a` base). Since the
prior review, two commits landed: `59b318f` ("stop the in-flight supersession test racing its own
fixture") and `cd5bf83` ("stop the parse overrun state from sticking on permanently"). Both touch
only `ParserWorker.java`, `ParseGuardsTest.java`, and `ParseProgramIntegrationTest.java`;
`InteropService.java` and `LanguageService.java` are byte-for-byte unchanged from the prior review.

`cd5bf83` correctly and completely fixes CR-04: the boolean `overrunning` flag set from a timer
callback is replaced with a single `volatile long parseStartedNanos`, and `isOverrunning` is now a
pure function of two clock readings compared at call time, with no second writer thread and no
TOCTOU window. The commit ships thorough tests, including a `nanoTime` wraparound case. `59b318f`
mitigates IN-01's flakiness risk: the in-flight supersession test now aborts (skips) instead of
potentially false-failing when the race isn't won, and widens the timing margin.

None of the other six findings from the previous review were touched. CR-01 (unvalidated
`canonicalName`/`params`), CR-02 (`ParserWorker` construction failure escapes raw), CR-03
(`shutdownParserWorker()`/`submit()` race — `RejectedExecutionException` escapes, non-volatile
`factory`/`prefixAlgorithm`), and CR-05 (`LanguageService` accept loop killed by one connection's
failed `close()`) all reproduce identically against the current tree. WR-01 (rigid JSON error
shape), WR-02 (connection lock held across a blocking shutdown wait), and WR-03 (prefix-algorithm
path confinement) are likewise unchanged. No new defects were found in the touched files beyond
what `cd5bf83`/`59b318f` already fixed.

## Prior findings status

| Prior ID | Title | Status | Evidence (current tree) |
|---|---|---|---|
| CR-01 | `parseProgram` unvalidated inputs (`null` `params`/`canonicalName`) throw raw `NullPointerException` | STILL OPEN | `InteropService.java:216-223` (no null guard before `checkSize`/`submit`); `ParserWorker.java:358-359` (`params.text` dereferenced unconditionally); `ParserWorker.java:233` (`pending.put(params.canonicalName, ...)` — `ConcurrentHashMap` throws NPE on a `null` key) |
| CR-02 | `ParserWorker` construction failure never surfaces `ERROR_SERVICE_UNAVAILABLE` | STILL OPEN | `InteropService.java:225-230` (`parserWorker()` still has no try/catch around `new ParserWorker(...)`); `ParserWorker.java:183-193, 200-216` (constructor calls `parserService()`, which throws `IllegalStateException` synchronously) |
| CR-03 | `shutdownParserWorker()` races with `submit()` — `RejectedExecutionException` escapes; `factory`/`prefixAlgorithm` non-volatile | STILL OPEN | `InteropService.java:222` (`parserWorker().submit(params)` — lock released before `submit()` runs); `ParserWorker.java:237` (`executor.submit(...)` uncaught); `ParserWorker.java:140-141` (`factory`/`prefixAlgorithm` fields still not `volatile`); `LanguageService.java:95` (`awaitDisconnect` dispatched onto the same shared `EXECUTOR` pool that also runs `parseProgram` dispatch) |
| CR-04 | `overrunning` flag stuck `true` forever via TOCTOU with `completeOnTimeout` | **FIXED** | `ParserWorker.java:157-181, 244-261` (commit `cd5bf83`): boolean + timer-callback replaced with `volatile long parseStartedNanos` and a pure `isOverrunning(started, now, timeout)` comparison read fresh on every `submit()` call — no second writer thread, no window where a late callback can set a stale flag. `ParseGuardsTest.java:110-171` adds direct unit coverage including a `nanoTime` wraparound case |
| CR-05 | `LanguageService` accept loop killed by one connection's failed `close()` | STILL OPEN | `LanguageService.java:96-102` (`connection.close()` in the per-connection setup `catch` still unwrapped, contrast with `awaitDisconnect`'s own try/catch around `connection.close()` at lines 134-138); `LanguageService.java:108-112` (outer catch rethrows any `Exception`, including the resulting `IOException`, which fails the whole `AbstractExecutionThreadService`) |
| WR-01 | `mapError`/`mapCategories` assume a rigid BBj JSON error shape | STILL OPEN | `ParserWorker.java:480-486` (`position.get("EditorStartingLine").getAsInt()` etc., no `has(...)`/`isJsonNull()` guard); `ParserWorker.java:500-504` (`typeObject.get(key).getAsString()` unguarded) |
| WR-02 | Connection lock held across `ParserWorker.shutdown()`'s blocking wait | STILL OPEN | `InteropService.java:237-241` (`shutdownParserWorker()` still `synchronized`, calling into `ParserWorker.shutdown()`'s up-to-2s `executor.awaitTermination`) |
| WR-03 | `BbjPrefixAlgorithm` resolves absolute/`..` paths with no confinement | STILL OPEN | `BbjPrefixAlgorithm.java:89-117` (`resolveOnDisk` — absolute names taken as-is at line 90-92, relative names via `new File(dir, fileName)` at line 111 with no canonical-path containment check) |
| IN-01 | `supersessionInFlightInterleaving...` relies on `Thread.sleep(50)` to force interleaving | **FIXED** (mitigated) | `ParseProgramIntegrationTest.java:298-330` (commit `59b318f`): the test now `abort()`s (JUnit `Assumptions`) rather than risking a false failure when the older parse finishes before the newer request lands; `IN_FLIGHT_LINES` raised from 5,000 to 100,000 to widen the margin. The underlying `Thread.sleep` timing dependency remains, but it can no longer produce a false failure — only a skip |

## Critical Issues

### CR-01: `parseProgram` unvalidated inputs throw uncaught `NullPointerException` (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:216-223`
**Issue:** Unchanged from the previous review. `parseProgram` only catches `ResponseErrorException` around `ParserWorker.checkSize(params)`:
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
If `params` itself is `null` (a malformed/adversarial JSON-RPC payload with a `null` `params` field), `ParserWorker.checkSize(params, maxBytes)` at `ParserWorker.java:358-359` dereferences `params.text` unconditionally and throws NPE before entering the `try` block's protected region — it isn't even inside the `try`. If `params.canonicalName` is `null` (a legal, Gson-produced value for an omitted field), `checkSize` passes but `ParserWorker.submit` at `ParserWorker.java:233` calls `pending.put(params.canonicalName, pendingParse)`, and `ConcurrentHashMap.put(null, …)` throws NPE unconditionally. Neither escape is a `ResponseErrorException`, so both bypass the documented `-33001..-33005` application-error contract entirely and surface as raw, uncaught exceptions from the `@JsonRequest` method.
**Fix:** Validate required fields before touching the worker, and translate any unexpected null into one of the documented codes:
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

### CR-02: `ParserWorker` construction failure never surfaces `ERROR_SERVICE_UNAVAILABLE` (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:183-193, 200-216`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:225-230`
**Issue:** Unchanged. `ParserWorker`'s constructor eagerly calls `parserService()`, which throws `IllegalStateException` when no `ParserServiceIF` is registered:
```java
ParserWorker(String remoteAddressLabel) {
    this.remoteAddressLabel = remoteAddressLabel;
    this.factory = parserService().getProgramFactory(prefixAlgorithm);   // can throw IllegalStateException
    ...
}
```
`InteropService.parserWorker()` still calls `new ParserWorker(...)` with no try/catch:
```java
private synchronized ParserWorker parserWorker() {
    if (parserWorker == null) {
        parserWorker = new ParserWorker(remoteAddressLabel());   // synchronous throw
    }
    return parserWorker;
}
```
`ERROR_SERVICE_UNAVAILABLE` (`ParserWorker.java:82-83`) is only ever produced inside `translateFailure`, which is unreachable from a constructor throw. On a connection where `ParserServiceIF` cannot be resolved, every `parseProgram` call throws `IllegalStateException` synchronously instead of returning the documented `-33004`.
**Fix:** Catch construction failures in `parserWorker()` and translate them the same way `translateFailure` does:
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

### CR-03: `shutdownParserWorker()` races with `submit()` — `RejectedExecutionException` escapes; `factory`/`prefixAlgorithm` visibility (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:225-241`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:140-141, 224-239, 324-340`
**Issue:** Unchanged. `parserWorker()` and `shutdownParserWorker()` are both `synchronized` on `InteropService`, but the lock is released as soon as `parserWorker()` returns — before `.submit(...)` runs:
```java
// InteropService.java:222
return parserWorker().submit(params);   // lock held only for parserWorker(), not for submit()
```
`LanguageService.awaitDisconnect` calls `interopService.shutdownParserWorker()` from the same shared `EXECUTOR` cached thread pool the moment the connection's lsp4j listening future completes — this can race an in-flight `parseProgram` dispatched on that same pool. Two concrete failure modes persist:
1. If `executor.submit(...)` in `ParserWorker.submit` (`ParserWorker.java:237`) runs after `executor.shutdown()` has already been called by `shutdown()`, it throws `RejectedExecutionException`, uncaught, escaping `parseProgram()` synchronously — never a documented `-3300x` code.
2. `factory` and `prefixAlgorithm` (`ParserWorker.java:140-141`) remain plain, non-`volatile` fields. A `runPending` task executing `parse()` concurrently with `shutdown()` nulling `factory` has no happens-before edge preventing it from observing `factory == null` mid-parse, producing an unexplained `NullPointerException` instead of a controlled `-33001` mapping.
**Fix:** As before — make `shutdown()` idempotent against a concurrent `submit()`/`parse()` (guard with the same monitor, or check `executor.isShutdown()` in `submit()` and fail fast with a documented code), catch `RejectedExecutionException` around `executor.submit(...)`, and mark `factory`/`prefixAlgorithm` `volatile` at minimum.

### CR-05: `LanguageService` accept loop can be killed entirely by one connection's failed `close()` (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:96-102`
**Issue:** Unchanged. In the per-connection setup `catch`:
```java
} catch (Throwable t) {
    LOG.log(Level.SEVERE, "... problem accepting a connection from " + connection.getRemoteAddress(), t);
    // Close the failed connection
    connection.close();
    // Loop to accept another connection
}
```
`connection.close()` is still not wrapped in its own try/catch, unlike the `awaitDisconnect` teardown path added in this phase (`LanguageService.java:134-138`), which correctly swallows `IOException` on close. If `close()` throws `IOException`, it propagates through this catch block and out of the `while (isRunning())` loop to the outer `catch (Throwable t)` (`LanguageService.java:108-112`), whose `Throwables.throwIfInstanceOf(t, Exception.class)` rethrows the checked `IOException`. For `AbstractExecutionThreadService`, a `run()` that throws transitions the whole service to `FAILED` — no more connections are ever accepted again, for any client, until the process is restarted. This phase raised the blast radius further, since the accept loop now also owns per-connection `ParserWorker` teardown via `awaitDisconnect`.
**Fix:**
```java
try {
    connection.close();
} catch (IOException closeFailure) {
    LOG.log(Level.WARNING, "Failed to close a failed connection", closeFailure);
}
```

## Warnings

### WR-01: `ParserWorker.mapError`/`mapCategories` assume a rigid BBj JSON error shape (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:480-486, 495-506`
**Issue:** Unchanged. `error.message` is defensively checked for `has(...)`/`isJsonNull()`, but the position fields are not:
```java
JsonObject position = errorObject.getAsJsonObject("ErrorPositionInfo");
if (position != null) {
    error.editorStartLine = position.get("EditorStartingLine").getAsInt();   // NPE if key missing
    ...
}
```
and `mapCategories` calls `typeObject.get(key).getAsString()` without checking for `JsonNull`. Both are eventually caught by `runPending`'s generic `catch (Throwable t)` and mapped to `ERROR_PARSE_FAILED`, so they don't crash the connection, but a minor shape drift in one BBj-reported error turns the whole parse response into a generic failure that obscures the real cause.
**Fix:** Apply the same `has(...)`/`isJsonNull()` guards used for `ErrorMessage` to the four position fields and to each category entry, defaulting to `0`/omitting the category rather than throwing.

### WR-02: Connection lock held across `ParserWorker.shutdown()`'s blocking wait (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:225-241`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:324-331`
**Issue:** Unchanged. `shutdownParserWorker()` is `synchronized` and calls `parserWorker.shutdown()`, which blocks up to `SHUTDOWN_AWAIT_MS` (2000ms) in `executor.awaitTermination(...)`. Any concurrent `parseProgram()` call on the same connection needs the same monitor (via `parserWorker()`) and blocks for up to 2 seconds during teardown rather than failing fast.
**Fix:** Capture the `ParserWorker` reference under the lock, set the field to `null` under the lock, then call `.shutdown()` outside the lock.

### WR-03: `BbjPrefixAlgorithm` resolves absolute paths and unsanitized `..` segments with no confinement (carried over)

**File:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/BbjPrefixAlgorithm.java:89-117`
**Issue:** Unchanged. `resolveOnDisk` takes any absolute `fileName` "as-is" and, for relative names, does `new File(dir, fileName)` without stripping `..` segments — a BBj source's own `USE`/`CALL` could name an absolute path anywhere the BBjServices process can read, or escape a workspace root/prefix directory via `../../..`. This is documented as intentional in the class Javadoc, and a caller can already supply an arbitrary directory directly via `workspaceRoots`/`prefixes`, so it is not a new privilege escalation over what the endpoint already grants — but there is still no allowlist or confinement check, worth confirming against the intended trust boundary.
**Fix:** If the intended threat model is "only files under `workspaceRoots`/`prefixes`/the active document's directory," add a canonical-path containment check before returning a relative-name match, and document explicitly that absolute-path resolution is intentionally unconfined.

---

_Reviewed: 2026-09-22T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Re-review of: 2026-09-22T09:43:44Z / bbj-ls d23422a; current tree: bbj-ls develop cd5bf83_
