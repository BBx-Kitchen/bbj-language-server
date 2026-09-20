# DRAFT — upstream reports for redhat-developer/lsp4ij

Status: draft for maintainer review. Nothing has been filed. Observed with LSP4IJ 0.21.0, IntelliJ IDEA
2026.2.2 (IU-262.10315.125), Windows 10. Before filing, check each report against LSP4IJ `main` and
search existing issues — neither was done conclusively (the GitHub code/issue search returned nothing
useful from this environment).

Confidence per report:

| # | Report | Evidence | Ready to file? |
|---|--------|----------|----------------|
| A | `stop()` runs its blocking 5 s shutdown inside a ReadAction thread | stack trace from idea.log | yes |
| B | while `serverError` is set, every `start()` kills the in-flight start and launches another process | 0.21.0 source + LSP trace message ids | yes, with the caveat below |
| C | `ServerStatus.stopped` never reaches the language client after an unexpected stop | source reading only | no — verify first |

What is deliberately NOT claimed: how our malformed server reply led LSP4IJ to stop the server in the
first place. That link was never captured. A local lsp4j probe (client launcher fed
`{"id":1,"result":{"code":-32800}}` for a pending `workspace/symbol`) showed lsp4j logs
`SEVERE: Unexpected token BEGIN_OBJECT: expected BEGIN_ARRAY` , keeps listening, and leaves the request
future pending forever — it does NOT drop the connection. So the earlier note "a response lsp4j cannot
deserialise drops the connection silently" is wrong and must not go into a report. The hanging request is
an eclipse-lsp4j matter (and was caused by our own protocol violation, since fixed), not an LSP4IJ bug.

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

**Expected:** the shutdown/kill sequence runs on an IntelliJ pooled thread, like `start()` does.

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

**Caveat to state honestly in the issue:** the initial unexpected stop was provoked by a bug in our own
language server (it answered cancelled requests with `"result": {"code": -32800}` instead of an `error`
member; fixed on our side). We did not capture which LSP4IJ path reacted to that reply by stopping the
server. The report is about what happens after ANY unexpected stop, which is visible in the source
independently of our trigger.

---

## Report C — NOT ready: `ServerStatus.stopped` does not reach the language client after an unexpected stop

Claim from the debug session: `stop(InitializingContext)` calls `languageClient.dispose()` before it
publishes `ServerStatus.stopped`, and publishes `stopped` only when
`currentInitializingContext == null || currentInitializingContext.equals(initializingContext)`, i.e. not at
all when a newer start already installed a context. A plugin that tracks status through its
`LanguageClientImpl` therefore never sees a crash. In our Windows session seven stop/start cycles produced
zero `stopped` transitions.

Before filing: confirm how status changes are delivered to `LanguageClientImpl.handleServerStatusChanged`
in 0.21.0 and on `main`, and whether `LanguageServerLifecycleListener` is the intended API for this (in
which case this is a documentation request, not a bug, and the fix belongs in our plugin — see the todo
"A lost language-server connection is invisible to the plugin's crash detection").
