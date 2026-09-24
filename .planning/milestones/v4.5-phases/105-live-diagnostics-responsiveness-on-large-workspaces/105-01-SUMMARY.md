---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
plan: 01
subsystem: language-server
tags: [langium, workspace-lock, live-diagnostics, debounce, lsp]

requires: []
provides:
  - "An event-armed live-parse cycle in BBjDocumentBuilder, independent of Langium's WorkspaceLock"
  - "A compute-first, publish-once debounce cycle shared by the event path and the rebuild-driven trigger"
  - "A state-aware publish (write+notify at/above Validated, direct client send below it)"
affects: [105-02, 105-03, 105-04, 105-05]

actuals:
  tokens: 12700
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Direct listener on the shared TextDocuments emitter (onDidOpen/onDidChangeContent), additive to Langium's own DocumentUpdateHandler, never routed through DocumentBuilder.update()/WorkspaceLock"
    - "Compute-first, publish-once debounce cycle: every branch builds a local result and calls one publish function at the end, never writes document.diagnostics mid-cycle"
    - "At-most-one-pending-entry-per-uri deferral pattern (pendingReadyUris) for re-arming once an async readiness signal resolves"

key-files:
  created:
    - bbj-vscode/test/live-parse-scheduling.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/test/document-builder.test.ts
    - bbj-vscode/test/bbj-parser-service.test.ts

key-decisions:
  - "hasTextDocumentEvents(provider) type guard checks onDidOpen/onDidChangeContent are both functions at runtime, since the core TextDocumentProvider type only declares get — lets the constructor skip the subscription for the many hand-built {get}-only test harnesses instead of throwing"
  - "bindLiveTextDocument uses Object.defineProperty(document, 'textDocument', { value: textDocument }) with no re-parse, mirroring Langium's own DefaultLangiumDocumentFactory.update() shape exactly, so a later real build rebinds it without error"
  - "publishCycleDiagnostics branches on document.state >= DocumentState.Validated: at/above, write document.diagnostics and fire the Validated phase as before; below it, send straight to the client via a new protected sendDiagnosticsToClient(uri, diagnostics), never writing the document or firing the phase"
  - "forgetVerdict(document) now returns boolean (whether a verdict existed) and no longer writes document.diagnostics itself — every cycle computes its one publish snapshot at the very end instead"
  - "pendingReadyUris: Set<string> dedupes a burst of events for the same not-yet-loaded uri into exactly one chain onto WorkspaceManager.ready"

patterns-established:
  - "Compute-first, publish-once: nothing is written to document.diagnostics until a cycle has decided its whole result, so a cycle that decides nothing (cancelled, stale version) also publishes nothing"

requirements-completed: [RESP-01, RESP-02]

coverage:
  - id: D1
    description: "A change event arms the live-parse debounce timer directly, independent of the workspace lock, and BBj's diagnostic reaches the client while the lock is still held"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#a change event while the workspace lock is held publishes a live parser diagnostic before the lock is released"
        status: pass
    human_judgment: false
  - id: D2
    description: "An open event arms the same cycle, including for a uri the workspace has not loaded yet, deferred to a workspace-ready signal rather than dropped or delayed by the lock"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#an open event for a loaded, open file: document arms one cycle"
        status: pass
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#an open event for a uri with no LangiumDocument yet defers until the workspace reports ready"
        status: pass
    human_judgment: false
  - id: D3
    description: "The event path shares the rebuild path's debounce timer and gates (trigger off, non-file scheme, PREFIX-external documents) and merges cleanly with a rebuild-driven trigger inside the debounce window"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#with the compiler trigger off, a change event requests nothing and leaves hasPendingCompile() false"
        status: pass
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#a change event for a non-file: uri, and for a document under a configured PREFIX directory, arms nothing"
        status: pass
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#a change event followed within 500 ms by a rebuild-driven trigger produces exactly one parse request"
        status: pass
    human_judgment: false
  - id: D4
    description: "An early cycle (document below the Validated state) whose live parse fails or is unavailable falls back to the save-time compile and sends the merged result straight to the client, never writing the document or firing the Validated phase"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#an early cycle whose live parse is scripted transport-error/method-not-found falls back to the save-time compile and sends the merged result to the client"
        status: pass
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#a cycle for a document whose state is Validated writes document.diagnostics and fires the Validated phase once"
        status: pass
    human_judgment: false
  - id: D5
    description: "The quiescence predicate (hasPendingCompile/hasPendingWork) reports pending work for the whole lifetime of an event-armed cycle, reusing the existing debounce timer map, with no new state field"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#between the event and the timer firing, hasPendingCompile() and hasPendingWork() are true; after the cycle they are false"
        status: pass
    human_judgment: false
  - id: D6
    description: "No document-event code path waits on, enqueues into, or calls anything that takes Langium's workspace lock — proven with Langium's real WorkspaceLock held"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/live-parse-scheduling.test.ts#a change event while the workspace lock is held publishes a live parser diagnostic before the lock is released"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-09-23
status: complete
---

# Phase 105 Plan 01: Live-Parse Scheduling Summary

**A direct `TextDocuments.onDidOpen`/`onDidChangeContent` listener arms BBj's existing debounce cycle without going through Langium's `WorkspaceLock`, and a compute-first, publish-once rewrite of that cycle sends diagnostics straight to the client for a document the startup build hasn't validated yet.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-23T11:49:00Z (approx.)
- **Completed:** 2026-09-23T12:19:49Z
- **Tasks:** 2 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `BBjDocumentBuilder`'s constructor now subscribes directly to the shared `TextDocuments` emitter's `onDidOpen`/`onDidChangeContent` events — the same emitter Langium's own `DefaultDocumentUpdateHandler` listens on — and arms the existing per-document debounce cycle from there, entirely outside `services.workspace.WorkspaceLock`. A held-lock tracer test proves a change event's parse request and its diagnostic publish both happen while a real `WorkspaceLock` write action is still in flight.
- `debouncedCompile()`'s timer callback is restructured from "clear-then-show" (write a stripped list at cycle start, then overwrite it once) to compute-first, publish-once: every branch (verdict, cancelled/stale, fallback) builds a local `next` diagnostics list and the cycle ends with exactly one call to the new `publishCycleDiagnostics()`. A cancelled or stale-version cycle now publishes nothing at all, instead of restoring a snapshot taken at cycle start.
- `publishCycleDiagnostics()` branches on the document's real state: at or above `Validated`, it writes `document.diagnostics` and fires the Validated document phase exactly as before this phase; below it (a document the startup build hasn't reached yet), it sends the diagnostics straight to the client over the LSP connection via a new `sendDiagnosticsToClient()`, without writing the document or releasing any `waitUntil(Validated, uri)` waiter.
- A document opened while the workspace hasn't loaded it yet — no `LangiumDocument` present for its uri — defers to `WorkspaceManager.ready` instead of being dropped: at most one pending entry per uri, so a burst of events before `ready` resolves still produces exactly one re-check and one parse request.
- The live, possibly-unsaved `TextDocument` from the firing event is bound onto the `LangiumDocument` without re-parsing (`bindLiveTextDocument`), using the exact property shape Langium's own `DefaultLangiumDocumentFactory.update()` uses, so the parser sees the edited text (not a stale on-disk snapshot) and a later real build rebinds the same property without error.

## Task Commits

Each task was committed atomically; Task 2 (tdd) has a RED test commit before its GREEN implementation commit:

1. **Task 1: End-to-end "a change event while the workspace lock is held publishes BBj's diagnostic"** - `12ed1e96` (feat)
2. **Task 2 RED: failing tests for open events and the ready deferral** - `adcb86da` (test)
2. **Task 2 GREEN: open events, the ready deferral, cross-cutting gate coverage** - `36520261` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-document-builder.ts` — `hasTextDocumentEvents()`, `withoutCompilerDiagnostics()`, `armLiveParseFromEvent()`, `armLiveParseForDocument()`, `bindLiveTextDocument()`, `armWhenWorkspaceReady()`, `publishCycleDiagnostics()`, `sendDiagnosticsToClient()`; `debouncedCompile()` restructured; `forgetVerdict()` now returns `boolean` and no longer writes diagnostics
- `bbj-vscode/test/live-parse-scheduling.test.ts` — new file: the held-lock tracer test plus 11 more tests covering open events, the ready deferral, the trigger/scheme/PREFIX gates, the merge with the rebuild-driven trigger, the early bbjcpl fallback, the quiescence predicate, a Validated-state document, and `sendDiagnosticsToClient`'s own connection-present/absent branches
- `bbj-vscode/test/document-builder.test.ts`, `bbj-vscode/test/bbj-parser-service.test.ts` — `fakeDocument()` now sets `state: DocumentState.Validated`, since these fixtures model a document after a Langium build has already validated it once

## Decisions Made

- `hasTextDocumentEvents(provider)` checks `onDidOpen`/`onDidChangeContent` are both functions at runtime — the core `TextDocumentProvider` type only declares `get`, and several hand-built test harnesses construct `BBjDocumentBuilder` with such a stub; the guard lets the constructor skip the subscription for those instead of throwing.
- `bindLiveTextDocument` uses `Object.defineProperty(document, 'textDocument', { value: textDocument })` with no re-parse — the exact shape Langium's own `update()` uses — so a document the startup build hasn't reached yet still gets a fresh binding without disturbing a lock-held build's own parse state, and a later real build rebinds the same property cleanly.
- `publishCycleDiagnostics` is the single publish point every cycle ends at, branching on `document.state >= DocumentState.Validated` rather than any new flag — reusing the document's own real state to decide whether the client publish or the write+notify path is safe.
- `forgetVerdict` now returns whether a verdict existed instead of writing `document.diagnostics` itself, since every cycle now computes its one publish snapshot at the very end.
- `pendingReadyUris` (a plain `Set<string>`) is the only new field added for the ready deferral — deliberately no richer per-uri bookkeeping, since at most one pending entry per uri is all the dedup requires.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `notifyDocumentPhase`'s real `interruptAndCheck` needed an extra real-macrotask flush under fake timers, in the one new test that exercises it for real**
- **Found during:** Task 2 (the "a cycle for a document whose state is Validated..." test)
- **Issue:** Langium's `interruptAndCheck` compares its `CancellationToken.None` (imported from `vscode-languageserver-protocol`) by object identity against whatever token is passed. This file's own `CancellationToken.None` (imported from `vscode-jsonrpc`, unchanged since before this phase) is a structurally-equal but distinct object, so the identity check fails and `interruptAndCheck` takes its `delayNextTick()` branch — a real `setImmediate`, which `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` does not cover. Every other test in the file reaches `sendDiagnosticsToClient` instead (never calls the real `notifyDocumentPhase`), and every pre-existing test in this codebase that needs a real `notifyDocumentPhase` call under fake timers already works around this by mocking the method away entirely — this is the first test to exercise the real one under fake timers.
- **Fix:** Added a small `flushRealMacrotask()` test helper (`new Promise(resolve => setImmediate(resolve))`) and called it once, after `vi.advanceTimersByTimeAsync(600)`, in the one test that needs to observe the real Validated-phase notification. Test-only change; no production code touched.
- **Files modified:** `bbj-vscode/test/live-parse-scheduling.test.ts`
- **Verification:** The test passes deterministically across repeated runs; the other 11 tests in the file (which never reach the real `notifyDocumentPhase`) are unaffected.
- **Committed in:** `adcb86da` (Task 2 RED commit, since the helper was needed to write a correct assertion, not a later fix)

---

**Total deviations:** 1 auto-fixed (1 blocking, test-infrastructure only)
**Impact on plan:** No production-code impact. The underlying `CancellationToken` import-source mismatch is pre-existing (unchanged since before this phase) and out of scope for this plan — it affects every call site of `notifyDocumentPhase(..., CancellationToken.None)` in this file, not something introduced here.

## Issues Encountered

- Two suites failed in a full local `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` pass, both pre-existing and unrelated to this plan's diff: `test/validation-function-calls.test.ts` hit the documented `beforeAll` hook-timeout contention flake (passes standalone, `numFailedTests: 0` for that suite) and `test/functional/installed-extension-e2e.test.ts` failed inside its `SETOPTS-in-code` describe block against the VS Code extension bundle installed at `~/.ext-test/extensions` — a fixed, previously-built artifact this plan's source changes cannot have touched. Whole-suite result: `2435 passed | 98 skipped`, `numFailedTests: 0`, matching this project's standing whole-suite gate substitution.

## Truth and Prohibition Verification

Of the plan's three `prohibitions` (all marked `status: unverified, verification: flagged` at planning time):

- **"No document-event code path waits on, enqueues into or calls anything that takes Langium's workspace lock"** — now verified: the tracer test holds a real `WorkspaceLock` write action and asserts the parse request and the client publish both complete while it is still held.
- **"A publish for a document Langium has not validated yet never fires the Validated document phase"** — now verified: the tracer test asserts the Validated-phase spy is never called for a below-Validated document, and the Task 2 Validated-state test asserts the converse (it does fire, exactly once, for an at/above-Validated document).
- **"The event-armed cycle never runs for a document that is not open in an editor, so opening a large workspace never starts one parse request or one bbjcpl process per workspace file"** — still flagged per the plan's own design: this needs a live-IDE measurement (plan 05), not something a unit test can fully establish; the gates that make this true (open-in-editor via `this.textDocuments?.get`, `file:` scheme, not synthetic, not external) are unit-tested individually in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The event-armed cycle and the state-aware publish are in place and merge cleanly with the existing rebuild-driven trigger; `bbj-diagnostic-reconciliation.ts` and `java-interop.ts` are untouched, so plans 02-04 (reconciliation version tracking, the dedicated parse connection, the Langium-catches-up reconciliation) build on an unchanged surface from those files' perspective.
- No blockers. Plan 02 is next per the roadmap's own default plan split.

---
*Phase: 105-live-diagnostics-responsiveness-on-large-workspaces*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj-document-builder.ts` exists on disk
- `bbj-vscode/test/live-parse-scheduling.test.ts` exists on disk
- Commits `12ed1e96`, `adcb86da`, `36520261` all found in `git log --oneline --all`
- All 12 tests in `test/live-parse-scheduling.test.ts` pass; the five pre-existing regression suites (`bbj-parser-service.test.ts`, `document-builder.test.ts`, `bbj-document-builder-config.test.ts`, `document-builder-rebuild-guard.test.ts`, `config-hot-reload-wiring.test.ts`) pass unchanged; `npx tsc -b tsconfig.json` exits 0; the register check over the plan's added lines exits 0 (no planning identifiers)
