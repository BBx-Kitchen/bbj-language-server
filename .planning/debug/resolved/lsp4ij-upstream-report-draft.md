# DRAFT — upstream reports for redhat-developer/lsp4ij

Status: draft for maintainer review. Nothing has been filed. Observed with LSP4IJ 0.21.0, IntelliJ IDEA
2026.2.2 (IU-262.10315.125), Windows 10. Checked on 2026-09-20 against a shallow clone of LSP4IJ `main`
(9bdfb68, 2026-09-18): `LanguageServerWrapper.java` and `ExtendedStreamMessageProducer.java` are unchanged
since tag 0.21.0, so A and B still apply. Existing upstream issues reviewed on 2026-09-20 (maintainer-supplied): see below —
neither A nor B is a duplicate.

Confidence per report:

| # | Report | Evidence | Ready to file? |
|---|--------|----------|----------------|
| A | `stop()` runs its blocking 5 s shutdown inside a ReadAction thread | stack trace from idea.log | yes |
| B | while `serverError` is set, every `start()` kills the in-flight start and launches another process | 0.21.0 source + LSP trace message ids | yes, with the caveat below |
| C | `ServerStatus.stopped` never reaches the language client after an unexpected stop | — | WITHDRAWN: documented upstream behaviour, our plugin uses the wrong hook |

Related upstream issues:

| Issue | State | Relation |
|-------|-------|----------|
| #1442 "Synchronous execution under ReadAction" | closed 2026-04-08, fixed by PR #1460 | Same defect class as report A, fixed for `start()` only (`OSProcessHandler.waitFor` executed via `helpAsyncBlocker` under a ReadAction). Report A is the `stop()` counterpart — file as a NEW issue that references #1442/#1460, since #1442 is closed. |
| #378 "report error when open idea" | open since 2024-06-21, "cannot reproduce" | 2024-era trace of the same thread-hijack pattern (server start running inside `CompletableFutures.waitUntilDone` on a ForkJoinPool helper, then an NPE on `lspStreamProvider`). Old code; cite in A as background only, do not post there. |
| #1600 "CompletionException: CannotStartProcessException" | open since 2026-06-12, no linked PR | Same code region as report B (the `exceptionally` handler of the initialise chain, where `serverError` is set) but a different bug: the handler re-completes `initializeFuture` exceptionally and the error reaches the EDT. Not a duplicate. Worth cross-referencing in B: the fix proposed there (let the future complete with `null`) leaves `serverError` set, so B's re-entry — every `start()` stops and relaunches until `initialize` succeeds, up to 20 attempts — still applies and would then be the remaining symptom for a server that cannot start. |

How our malformed reply led to the stop (now established): lsp4j's `StreamMessageProducer` takes its
`fireError` path for a `result` it cannot deserialise (a local probe logged lsp4j's own
`SEVERE: Unexpected token BEGIN_OBJECT: expected BEGIN_ARRAY` and left the request pending, listener
alive). LSP4IJ deliberately replaces that producer with `ExtendedStreamMessageProducer`, whose `fireError`
THROWS so that "the processor is immediately stopped" and "LSP4IJ can detect the failure and automatically
restart the language server" (their #1238). So one undeserialisable response ends the listener,
`launcherFuture` completes exceptionally, the next `start()` sets `serverError`, stops and relaunches. That
is upstream's intended design, not a bug — do not report it. Report B is about what happens next.

---

## Report A — `LanguageServerWrapper.stop()` executes its blocking shutdown inside a ReadAction thread (ForkJoinPool.helpAsyncBlocker)

**Title:** `stop()` uses `CompletableFuture.runAsync` on the common pool, so the 5 s `shutdown` wait runs inside a thread that is blocked under a ReadAction (same class as #1442, which fixed this for `start()`)

**Body:**

`LanguageServerWrapper.start()` was moved off `ForkJoinPool.commonPool()` to an IntelliJ pooled thread,
with this comment in the source:

> Use IntelliJ pooled thread instead of ForkJoinPool.commonPool() to avoid ForkJoinPool.helpAsyncBlocker()
> executing blocking operations (like OSProcessHandler.waitFor()) in the current thread when called from
> ReadAction. See #1442

`stop(InitializingContext)` still does `CompletableFuture.runAsync(() -> { shutdownAll(...); ... })` with
no executor. When a thread is waiting in `CancellationSupport.awaitWithCheckCanceled` under a ReadAction
(here: the Search Everywhere symbol contributor), `helpAsyncBlocker` picks that task up and runs
`shutdownLanguageServerInstance` — including its `shutdown.get(5, SECONDS)` — on the waiting thread:

```
WARN - com.redhat.devtools.lsp4ij.LanguageServerWrapper - Timeout error while shutdown the language server 'bbjLanguageServer'
java.util.concurrent.TimeoutException
	at java.base/java.util.concurrent.CompletableFuture.timedGet(CompletableFuture.java:1981)
	at java.base/java.util.concurrent.CompletableFuture.get(CompletableFuture.java:2116)
	at com.redhat.devtools.lsp4ij.LanguageServerWrapper.shutdownLanguageServerInstance(LanguageServerWrapper.java:1767)
	at com.redhat.devtools.lsp4ij.LanguageServerWrapper.shutdownAll(LanguageServerWrapper.java:1739)
	at com.redhat.devtools.lsp4ij.LanguageServerWrapper.lambda$stop$32(LanguageServerWrapper.java:1700)
	at java.base/java.util.concurrent.CompletableFuture$AsyncRun.run(CompletableFuture.java:1825)
	at java.base/java.util.concurrent.ForkJoinPool$WorkQueue.helpAsyncBlocker(ForkJoinPool.java:1570)
	at java.base/java.util.concurrent.ForkJoinPool.helpAsyncBlocker(ForkJoinPool.java:2674)
	at java.base/java.util.concurrent.CompletableFuture.timedGet(CompletableFuture.java:1954)
	at java.base/java.util.concurrent.CompletableFuture.get(CompletableFuture.java:2116)
	at com.redhat.devtools.lsp4ij.internal.CancellationSupport.awaitWithCheckCanceled(CancellationSupport.java:312)
	at com.redhat.devtools.lsp4ij.internal.CancellationSupport.awaitWithCheckCanceled(CancellationSupport.java:304)
	at com.redhat.devtools.lsp4ij.features.workspaceSymbol.AbstractLSPWorkspaceSymbolContributor.processNames(AbstractLSPWorkspaceSymbolContributor.java:50)
	at com.redhat.devtools.lsp4ij.features.workspaceSymbol.LSPWorkspaceGotoSymbolContributor.processNames(LSPWorkspaceGotoSymbolContributor.java:18)
	at com.intellij.ide.util.gotoByName.ContributorsBasedGotoByModel.doProcessContributorNames(ContributorsBasedGotoByModel.java:145)
	...
	at com.intellij.openapi.application.ReadAction.computeBlocking(ReadAction.java:85)
```

A second instance of the same trace was entered from
`LSPDocumentSymbolStructureViewModel … LSPBreadcrumbsProvider.getParent`.

**Expected:** the shutdown/kill sequence runs on an IntelliJ pooled thread, like `start()` does since
#1442 / PR #1460. (#378 looks like an older sighting of the same pattern.)

**Suggested fix:** pass an executor to that `runAsync` (e.g. `AppExecutorUtil.getAppExecutorService()`), or
use `executeOnPooledThread` as in `start()`.

---

## Report B — while `serverError` is set, each `start()` tears down the still-initialising previous start and launches another process

**Title:** After an unexpected stop, concurrent `getInitializedServer()` calls each stop the in-flight start and spawn a new server process (one per Search Everywhere keystroke)

**Body:**

In `LanguageServerWrapper.start()` (0.21.0):

```java
if (serverError != null) {
    // Here the language server has been not possible
    // we stop it and attempts a new restart if needed
    stop();
    ...
    numberOfRestartAttempts++;
}
...
if (this.initializeFuture == null) { /* create provider, provider.start(), initialize */ }
```

`serverError` is reset only at the very end of the initialise chain
(`.thenCompose(ctx -> initServer(rootURI, ctx)).thenApply(ctx -> { serverError = null; ... })`). Between an
unexpected stop and the completion of the next `initialize`, every call to `start()` — and
`getInitializedServer()` calls `start()` unconditionally — therefore (1) calls `stop()`, which cancels
`initializeFuture` and nulls the current context, and (2) falls through to create a new connection provider
and a new process. Features that call `LanguageServiceAccessor.getLanguageServers(before, after)` per user
action drive this repeatedly; the workspace-symbol contributor does so once per keystroke in Search
Everywhere.

Observed (LSP trace, one Search Everywhere session, server id `bbjLanguageServer`):

```
10:29:49  Sending request 'shutdown - (11)'          <- old connection
10:29:49  Sending request 'initialize - (1)'         <- process #2
10:29:49  Sending request 'shutdown - (2)'           <- sent to process #2, ~300 ms after its initialize
10:29:49  Sending request 'initialize - (1)'         <- process #3
10:29:49  Received response '<unknown> - (2)'        <- process #2's replies, client already disposed
10:29:50  Received response '<unknown> - (1)'
```

and the connection provider factory was invoked 3 times within 270 ms in one burst, 2 times within 300 ms
in another, 7 times over ~35 s in a third. Each abandoned instance is only killed after the 5 s shutdown
timeout (see report A), so 2–3 server processes coexist briefly, and each counts against
`MAX_NUMBER_OF_RESTART_ATTEMPTS` (20), after which the definition is disabled.

**Expected:** while a (re)start is already in flight, further `start()` calls wait on the existing
`initializeFuture` instead of stopping it; the `serverError` branch should run once per error, not once per
caller.

**Related:** #1600 concerns the same initialise-chain error handler (different symptom).

**Context to state honestly in the issue:** the initial error was provoked by a bug in our own language
server (it answered cancelled requests with `"result": {"code": -32800}` instead of an `error` member;
fixed on our side). `ExtendedStreamMessageProducer.fireError` turned that into a listener stop and an
automatic restart, as designed (#1238). The report is about the restart itself being re-entered by every
caller until `initialize` completes, which applies after ANY such error.

---

## Report C — WITHDRAWN (not an upstream bug)

`LanguageClientImpl.handleServerStatusChanged` documents that, because the language client does not exist
during some statuses, it receives ONLY `stopping` and `started`, and says: "If you need to track all status,
you can do that by implementing `LSPClientFeatures#handleServerStatusChanged(ServerStatus)`".
`LanguageServerWrapper.updateStatus` indeed calls the lifecycle manager, then the client if non-null, then
`getClientFeatures().handleServerStatusChanged(...)`. Our `BbjLanguageClient` overrides the client-side
callback, which is why it never sees `stopped`. The fix belongs in our plugin — see the todo "A lost
language-server connection is invisible to the plugin's crash detection".
