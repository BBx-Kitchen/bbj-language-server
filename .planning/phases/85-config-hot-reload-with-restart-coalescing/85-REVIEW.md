---
phase: 85-config-hot-reload-with-restart-coalescing
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - QA/FULL-TEST-CHECKLIST.md
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigReloadNotificationContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigReloadPresentationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientRestartSourceGuardTest.java
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-notifications.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/config-path-resolver.ts
  - bbj-vscode/src/language/config-reload-notification.ts
  - bbj-vscode/src/language/config-watcher.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/restart-gate.ts
  - bbj-vscode/test/config-hot-reload-wiring.test.ts
  - bbj-vscode/test/config-hot-reload.test.ts
  - bbj-vscode/test/config-reload-host.test.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 85: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard (with targeted cross-file tracing into `node_modules/langium`'s `DefaultDocumentBuilder` and the IntelliJ `concurrency/` package, as directed by the review brief)
**Files Reviewed:** 20 (git diff also inspected against `92e51081e0aba0bf036abdc10e8488085c97fda0` to scope exactly what this phase added)
**Status:** issues_found

## Summary

This phase wires a server-owned `fs.watch` config-directory watcher (`config-watcher.ts`) with a
debounce + relevance gate + bounded quiescence wait, a `bbj/configReloadRequired` notification, a
VS Code restart choke point (`restart-gate.ts`), and the IntelliJ `@JsonNotification` handler that
funnels into `BbjServerService.requestRestart(500)`. The unit-test coverage for the coalescing and
debounce logic itself (`config-watcher.ts`, `restart-gate.ts`) is thorough and the scenarios tested
(bursts, atomic saves, settings-change races, arm-failure retries) genuinely exercise the tricky
edge cases. The Gson DTO field names and the reason-token vocabulary are cross-checked by
`ConfigModelsJsonBoundaryTest`/`ConfigReloadNotificationContractTest` and match exactly on both
sides. The IntelliJ restart path is correctly off-EDT (`Alarm.ThreadToUse.POOLED_THREAD` +
`synchronized RestartGate.request`), so the LSP-dispatch-thread handler in `BbjLanguageClient` is
not a threading hazard.

The issues below are all in the *quiescence guarantee* itself — the thing the phase exists to
provide — rather than in the debounce/coalescing mechanics, which are solid. Tracing
`hasPendingWork()` against Langium's actual `DefaultDocumentBuilder.runCancelable()` (in
`node_modules/langium/lib/workspace/document-builder.js`) shows that `currentState` reaches
`DocumentState.Validated` — and therefore `hasPendingWork()` reports "not busy" — *before* this
phase's own overridden `buildDocuments()` finishes its post-processing tail. There is also a
narrower gap in the VS Code restart gate's cancellation, and a start-up race in the watcher's
initial baseline. None of these rise to data loss or a crash; they are robustness gaps against the
documented invariants of the phase's own design.

## Warnings

### WR-01: `hasPendingWork()` has a blind spot during `addImportedBBjDocuments`/`revalidateUseFilePathDiagnostics` and the off-trigger diagnostic-clear loop

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:59-61` (the predicate), `:86-105` (the overridden `buildDocuments`), `:120-133` (off-trigger clear loop), `:296-383` (`addImportedBBjDocuments`), `:391-451` (`revalidateUseFilePathDiagnostics`)

**Issue:** The doc comment on `hasPendingWork()` (lines 48-61) asserts: *"`DefaultDocumentBuilder` resets `currentState` to `DocumentState.Changed` at the top of every build/update call and only advances it to `DocumentState.Validated` once the validation phase finishes, so `currentState < DocumentState.Validated` is exactly that condition [an in-flight Langium build]."*

Tracing Langium's actual implementation (`node_modules/langium/lib/workspace/document-builder.js`, `runCancelable()`) confirms `this.currentState = targetState` is set at the *end* of the phase-pipeline loop that the base `buildDocuments()` runs — i.e. exactly when `super.buildDocuments(documents, options, cancelToken)` (line 87 here) resolves. But the overridden `buildDocuments()` keeps doing meaningful async work *after* that line resolves and before the whole method returns:

```ts
protected override async buildDocuments(...): Promise<void> {
    await super.buildDocuments(documents, options, cancelToken);   // currentState -> Validated here
    if (!this.isImportingBBjDocuments) {
        await this.runBbjcplForDocuments(documents, cancelToken);   // schedules CPL timers (only covers debounced/on-save)
        await this.addImportedBBjDocuments(documents, options, cancelToken);   // recursive PREFIX file loads, depth up to 10
        await this.revalidateUseFilePathDiagnostics(documents, cancelToken);   // async document.diagnostics rewrite + notify
    }
}
```

None of `addImportedBBjDocuments`, `revalidateUseFilePathDiagnostics`, or the `trigger === 'off'` diagnostic-clearing loop inside `runBbjcplForDocuments` (lines 120-133, which itself `await`s `notifyDocumentPhase` per document) touch `currentState` or `cplDebounceTimers`. So for the entire duration of this tail — which can include several recursive rounds of async `fsProvider.readFile` calls across every configured PREFIX directory — `hasPendingWork()` returns `false`, i.e. the config watcher's quiescence poll (`config-watcher.ts`'s `pollQuiescence`) can see "not busy" and push the `bbj/configReloadRequired` notification while a build is still actively loading/relinking/re-validating documents. This is precisely the scenario `QUIESCENCE_POLL_MS`/`hasPendingWork` exists to prevent (see the `config-watcher.ts` module doc and `main.ts`'s injection of this exact predicate).

The consequence is bounded (a process restart is always safe and a rebuild simply reruns after restart), but it defeats the phase's own stated invariant for a real, non-contrived code path — any workspace with transitive `USE` imports resolved via `PREFIX` directories will hit this window on every build that adds new external documents.

**Fix:** Track "post-processing in flight" explicitly, e.g. a counter/flag set at the top of the overridden `buildDocuments()` and cleared in a `finally` at the bottom, and OR it into `hasPendingWork()`:

```ts
private postProcessingDepth = 0;

protected override async buildDocuments(...): Promise<void> {
    this.postProcessingDepth++;
    try {
        await super.buildDocuments(documents, options, cancelToken);
        if (!this.isImportingBBjDocuments) {
            await this.runBbjcplForDocuments(documents, cancelToken);
            await this.addImportedBBjDocuments(documents, options, cancelToken);
            await this.revalidateUseFilePathDiagnostics(documents, cancelToken);
        }
    } finally {
        this.postProcessingDepth--;
    }
}

public hasPendingWork(): boolean {
    return this.currentState < DocumentState.Validated
        || this.postProcessingDepth > 0
        || this.hasPendingCompile();
}
```

---

### WR-02: `RestartGate.cancel()` (VS Code) cannot abort an in-flight restart — only a *scheduled* one

**File:** `bbj-vscode/src/restart-gate.ts:74-79` (`clearPending`/`cancel`), `:81-92` (`runRestart`); `bbj-vscode/src/extension.ts:997-1005` (`deactivate`)

**Issue:** `cancel()` only clears `pendingHandle` — the timer that has not yet fired. If `deactivate()` runs while a previously-scheduled restart's timer has *already* fired and `runRestart()` is currently `await`ing `target.stop()`/`target.start()`, `restartGate?.cancel()` in `deactivate()` is a no-op (nothing is pending), and the in-flight `runRestart()` promise is free to call `client.start()` after `deactivate()`'s own `client.stop()` call has already resolved. This directly contradicts the module's own doc comment: *"a scheduled restart must never fire against a client that is being (or has been) shut down."* The comment's guarantee only actually holds for the window before the gate's timer fires — not for the window while the restart's stop/start pair is executing.

**Fix:** Track the in-flight restart's promise and have `cancel()`/`deactivate()` await it (or set a "shutting down" flag that `runRestart()` checks before calling `target.start()`):

```ts
let inFlightRestart: Promise<void> | undefined;

async function runRestart(): Promise<void> {
    onPhase('restarting');
    try {
        if (target.needsStop()) await target.stop();
        if (shuttingDown) return; // deactivate() ran while we were stopping
        await target.start();
        onPhase('restarted');
    } catch (error) {
        onPhase('failed', error);
    }
}
```
and have `deactivate()` set `shuttingDown = true` (or await `inFlightRestart`) before calling `client.stop()`.

---

### WR-03: The watcher's initial baseline can go stale between `initializeWorkspace()` and `configWatcher.start()`, with no re-check at arm time

**File:** `bbj-vscode/src/language/bbj-ws-manager.ts:144-158` (snapshot captured), `bbj-vscode/src/language/main.ts:118-127` (`configWatcher.start()` called only once the first `Validated` build phase fires), `bbj-vscode/src/language/config-watcher.ts:288-300` (`start()` trusts the passed-in snapshot with no fresh read/compare)

**Issue:** `consumedConfigSnapshotValue` is captured once, synchronously inside `initializeWorkspace()`, which runs at workspace-open time. `configWatcher.start()` — the call that arms `fs.watch` and adopts that snapshot as the running baseline — does not fire until the *first* `DocumentState.Validated` build phase completes, which for a large workspace (many files, transitive `USE`/PREFIX resolution per WR-01) can be many seconds later. `fs.watch` only reports events that occur after the watch is armed, and `createConfigWatcher.start()` never performs its own fresh `readFile`+compare at arm time (unlike `updateResolvedPath()`, which does re-check immediately). So a config-file edit landing inside that window is invisible until *some other* fs event later touches the same file — if the user edits the config exactly once during startup and never again, the change is silently never detected for the rest of the session.

**Fix:** Have `start()` perform the same immediate relevance check `updateResolvedPath()` already does — read the file, compute `consumedConfigSnapshot`, compare against the passed-in baseline, and notify if it already diverged before the watch was armed.

## Info

### IN-01: `pollQuiescence()`'s catch-all silently drops the pending notification with no retry

**File:** `bbj-vscode/src/language/config-watcher.ts:187-213`

If `hasPendingWork()` (the injected predicate) throws for any reason, the `catch` block clears `pendingQuiescencePayload`/`pendingQuiescenceTimer` and only logs a warning — the queued `bbj/configReloadRequired` notification for that transition is never sent and nothing re-arms it. In practice `hasPendingWork()` (a `currentState` comparison + `Map.size` check, per WR-01's fix candidate) is unlikely to throw, so this is low-probability, but worth a code comment noting the notification is lost, not deferred, on this path — the current comment ("Log and let the build continue" is absent here; only `logWarn` is called) doesn't make that consequence explicit.

### IN-02: `BbjServerService.updateStatus()`'s crash-triggered `requestRestart(CRASH_RESTART_DELAY_MS)` doesn't call `setRestartReason(null)`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:149-152`

If a config-driven restart (`pendingRestartReason` set to e.g. `"prefix-changed"`) is still in flight when the server crashes and `updateStatus()`'s auto-restart-on-first-crash path fires `requestRestart(CRASH_RESTART_DELAY_MS)`, the crash path never clears/resets `pendingRestartReason`. The coalesced restart that actually runs is crash-driven, but the status-bar tooltip (`BbjStatusBarWidget`) would still attribute it to the stale config-change reason until the restart reaches `started` (which does clear it via `ConfigReloadPresentation.clearsReason`). Cosmetic only — worth a one-line fix (`setRestartReason(null)` alongside the crash-path `requestRestart` call) if the tooltip's accuracy during a crash matters to the UX design.

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
