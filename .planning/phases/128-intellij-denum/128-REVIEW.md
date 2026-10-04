---
phase: 128-intellij-denum
depth: standard
diff_base: 49544f09
files_reviewed: 30
status: issues_found
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
---

# Phase 128 Code Review

Scope: the 30 files changed in `49544f09..HEAD` outside `.planning/` (26 under `bbj-intellij/src`, 4 under `bbj-vscode/`). No blocker-class defect, no security issue, no data loss. The DENUM diagnostics path treats the server payload as untrusted.

## Warnings

### WR-01: CancellationException escapes the Denumber background task
**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjDenumberAction.java:96-114`
`CompletableFuture.get(timeout)` throws the unchecked `CancellationException` when the future is cancelled, which LSP4IJ does on a server stop or restart. The catch handles only `TimeoutException`, `InterruptedException` and `ExecutionException`, so the IDE reports a plugin error instead of the "Denumber failed" balloon. `BbjCompileAction` has the same gap; the pattern was copied.
**Fix:** catch `CancellationException` and route it to `failed(project, …)`.

### WR-02: The timeout is applied twice, but the message names one
**File:** `BbjDenumberAction.java:97-108`
Server resolution and the request each get a separate 60 s `get`, so the task can run up to 120 s while the message says "within 60 seconds". Neither future is cancelled on timeout, and the task has `canBeCancelled=false`.
**Fix:** use one deadline and pass the remaining time to the second `get`; cancel the request future on timeout.

### WR-03: A throwing refresh strands the remaining dirty keys
**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/DirtyFileCoalescer.java:44-51`
`drain` aborts on the first `refresh.accept` that throws. The remaining keys stay in `dirty` with no drain scheduled until the next `mark`, so those editors keep a stale banner.
**Fix:** catch and log a `RuntimeException` per key.

### WR-04: Repeated clicks send overlapping bbj/denum requests
**File:** `BbjDenumberAction.java:83-116`, `BbjLineNumberedNotificationProvider.java:53`
Each click queues another background task and request while the banner is still visible.
**Orchestrator note:** the plan's backstop truth assigns this deliberately to the language server's in-flight guard ("Denumbering is already running for this file."), and the client adds nothing of its own (decision carried from phase 127). This is a design choice, not a defect, unless that guard is shown not to cover it.

## Info

### IN-01: DenumDiagnostic.line Javadoc overstates Long tolerance
**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumModels.java:57-64`
Gson's `Long` adapter still rejects non-integral values such as `1.5` or `1e30`, which drops the whole notification. The server sends integers, so this is only a contract overclaim. **Fix:** soften the comment.

### IN-02: The refresher listens to every project's documents
**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/BbjLineNumberedBannerRefresher.java:44-55,70-75`
The `EditorFactory` multicaster is application-wide, so with two projects open, project A refreshes files from project B. Harmless wasted work. **Fix:** skip files not open in this project.

### IN-03: Third copy of the document-URI fallback
**File:** `BbjDenumberAction.java:89-94`
The same `toNioPath().toUri()` / `getUrl()` fallback exists in `BbjCompileAction` and `ComposerLauncher`. **Fix:** extract one shared helper.

## TypeScript changes

`bbj-notifications.ts` and `java-class-refresh.ts` are sound. Every remaining LS-side `connection.window.show*Message` call is either wrapped or awaited inside try/catch. The new tests use plain-function mocks, so they would catch an unhandled rejection. `LineNumbering.java` matches `isLineNumberedSource`, including `\s` semantics and the 20/3 thresholds. No planning identifiers appear in source or test text.
