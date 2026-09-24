---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
reviewed: 2026-09-23T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts
  - bbj-vscode/test/bbj-parser-service.test.ts
  - bbj-vscode/test/document-builder.test.ts
  - bbj-vscode/test/fake-interop-peer.ts
  - bbj-vscode/test/java-interop-parse-lane.test.ts
  - bbj-vscode/test/live-parse-interleaving.test.ts
  - bbj-vscode/test/live-parse-scheduling.test.ts
findings:
  critical: 2
  warning: 1
  info: 1
  total: 4
status: partially_fixed
fixed_at: 2026-09-23T15:44:00Z
fix_summary:
  fixed: [CR-01, CR-02]
  deferred: [WR-01, IN-01]
---

# Phase 105: Code Review Report

**Reviewed:** 2026-09-23
**Depth:** standard
**Files Reviewed:** 11
**Status:** partially_fixed — CR-01 and CR-02 fixed 2026-09-23; WR-01 and IN-01 remain open/deferred

## Summary

Reviewed the event-armed live-parse cycle (`bbj-document-builder.ts`), the pure
verdict-composition module (`bbj-diagnostic-reconciliation.ts`), the validator's composition hook
(`bbj-document-validator.ts`), and the dedicated `parseProgram` connection
(`java-interop.ts`), against the diff from `9601e71..HEAD` and the accompanying test suite.

The pure composition functions (`reconcileWithVerdict`, `reconcileEarlyVerdict`,
`applyVerdictCarryOver`, `composeWithVerdict`) are well specified, thoroughly unit-tested, and I
found no defects in them. The dedicated-connection lifecycle in `java-interop.ts` (open, retire,
fallback, generation bumps) matches its own doc comments and is well covered by
`java-interop-parse-lane.test.ts`.

Two BLOCKER-level issues were found in `bbj-document-builder.ts`, both concerning code paths the
new event-armed trigger reaches that the pre-existing rebuild-driven trigger never did:

1. The event-armed cycle bypasses the `isBuildableDocumentUri` gate that `update()` applies,
   so a `bbx-config` document (e.g. `config.bbx`, opened by the composer flow with a special
   `languageId`) can now be sent through `parseProgram`/`bbjcpl` — something this codebase
   explicitly documents as forbidden for that document class.
2. A stale, failed live-parse cycle for superseded text can unconditionally discard a newer,
   concurrent cycle's already-stored verdict and then publish a worse result over it, which is
   exactly the "no lost, doubled or misattributed diagnostic" guarantee (D-07) this phase set
   out to prove. The interleaving test suite exercises Langium-vs-verdict races thoroughly but
   never two overlapping debounce cycles for the same document, so this gap is untested.

## Critical Issues

### CR-01: The event-armed live-parse trigger reaches `bbx-config` documents that `update()` explicitly excludes

**Status: fixed.** `armLiveParseForDocument` (the single entry point both `armLiveParseFromEvent`
and `armWhenWorkspaceReady`'s deferred callback funnel through) now applies
`isBuildableDocumentUri` first, so a document opened with the composer's `bbx-config` language id
(regardless of its file extension) is never armed, whichever of the two callers reaches it. A
regression test in `bbj-vscode/test/live-parse-scheduling.test.ts` opens a `bbx-config`-language
document on a `.bbj`-style uri and asserts no live-parse request is ever sent and
`hasPendingCompile()` stays false; the test was confirmed to fail against the pre-fix code before
the fix was applied.

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:321-337` (`armLiveParseFromEvent`) and
`:369-382` (`armLiveParseForDocument`)

**Issue:** `isBuildableDocumentUri()` (same file, lines 41-50) exists specifically to stop a
`bbx-config`-language document from ever being "parsed, linked, indexed, validated or diagnosed
as BBj source" (its own doc comment). `update()` applies that filter before calling
`super.update()`, so the pre-existing rebuild-driven trigger (`buildDocuments` →
`runBbjcplForDocuments`) never sees such a document, because it is never in the `documents` batch
Langium hands to `buildDocuments()`.

The new event-armed trigger does not go through `update()` at all: `armLiveParseFromEvent` looks
the document straight up via `this.langiumDocuments.getDocument(uri)`, and
`armLiveParseForDocument` gates only on `shouldCompileWithBbjcpl()` (open in an editor, `file:`
scheme, not the Java synthetic doc, not external) — `isBuildableDocumentUri`'s
`CONFIG_DOCUMENT_LANGUAGE_ID` check is never applied.

Composer config files use the `.bbx` extension, and `.bbx` is one of the extensions the workspace
scan indexes as an ordinary BBj source file (`bbj-ws-manager.ts:235`), so a `LangiumDocument`
for `config.bbx` already exists in `langiumDocuments` by the time the user opens it. Opening it
assigns the client's special `languageId: 'bbx-config'` and fires `onDidOpen`/
`onDidChangeContent` — which this constructor now also listens on directly. The result: opening a
composer config document arms a live-parse debounce cycle for it, sends its full text over
`parseProgram`, and (below `DocumentState.Validated`) publishes whatever bogus BBj syntax
diagnostics come back straight to the client via `sendDiagnosticsToClient` — a regression for a
document class this codebase explicitly guarantees is never treated as BBj source.

**Fix:** Reuse the existing gate. Either check it inside `armLiveParseFromEvent` right after
resolving `uri`, or fold it into `armLiveParseForDocument`:

```ts
private armLiveParseFromEvent(textDocument: TextDocument): void {
    try {
        if (getCompilerTrigger() === 'off') return;
        const uri = URI.parse(textDocument.uri);
        if (!isBuildableDocumentUri(uri, this.textDocuments, this.serviceRegistry)) return;
        const document = this.langiumDocuments.getDocument(uri);
        ...
```

The same check should also be added to `armWhenWorkspaceReady`'s deferred callback, since it
re-enters `armLiveParseForDocument` on the same document once the workspace becomes ready.

### CR-02: A stale, failed debounce cycle can discard and overwrite a newer cycle's already-published verdict

**Status: fixed.** The fallback branch now checks `stillCurrent` the same way the verdict branch
already does, and returns without forgetting the document's verdict, running the save-time
compile, or publishing anything when the cycle's own request is no longer for the document's
current text.

One outcome deliberately keeps its old, unconditional behaviour: a `liveOutcome.kind ===
'unavailable'` result still clears every document's stored verdict regardless of this cycle's own
staleness. That signal is tied to the connection (the on/off latch just flipped for every document
on it), not to one cycle's text version — gating it on `stillCurrent` would let another, unrelated
document's stale verdict survive an endpoint that (per this very request) is now known to be gone.
Two regression tests in `bbj-vscode/test/live-parse-interleaving.test.ts` cover both paths: one
proves a stale `'failed'` cycle changes nothing once a newer cycle has already published its
verdict (no save-time compile runs, no second publish happens, the newer verdict is untouched);
the other proves a stale `'unavailable'` cycle still clears every document's stored verdict
(including an unrelated document's) while still never republishing over the newer cycle's own
diagnostics. Both tests were confirmed to fail against the pre-fix code before the fix was applied.

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:464-568` (`debouncedCompile`), the
fallback branch at `:533-553`

**Issue:** `cplDebounceTimers` merges same-document requests into one timer only while a timer is
still *pending*. Once a timer fires, its callback deletes the map entry (`:470`) before doing any
`await`, so a fresh edit arriving while that callback is still running (awaiting the live parse
and/or the save-time compile) schedules a brand-new, independent timer for the same document —
two `debouncedCompile()` cycles for the same document are now in flight concurrently. This is a
direct, reachable consequence of the event-armed trigger firing on every keystroke rather than
only from a rebuild.

Inside the callback, the "verdict" branch correctly guards against acting on stale results:

```ts
if (liveOutcome?.kind === 'verdict' && stillCurrent) {
    ... // sets the verdict, publishes
} else if (liveOutcome?.kind === 'verdict' || liveOutcome?.kind === 'cancelled') {
    return; // superseded verdict or a cancelled request — no state change, no publish
} else {
    // failed, unavailable, or the latch/trigger is off
    this.forgetVerdict(document);
    if (liveOutcome?.kind === 'unavailable') { clearAllVerdictStates(); }
    const cplDiags = await cplService.compile(key);
    const baseline = this.latestLangiumBaseline(document);
    const base = applyConfiguredDiagnosticHierarchy(baseline.diagnostics);
    next = cplDiags.length > 0 ? mergeDiagnostics(base, cplDiags) : base;
}
await this.publishCycleDiagnostics(document, next);
```

The `else` (fallback) branch never checks `stillCurrent`. So: cycle A is armed for text v1, its
live parse eventually resolves as `'failed'` (a real application error such as `-33001`, a
timeout, or a malformed result — not `'cancelled'`, which the server only returns for a request it
recognized as superseded). Meanwhile a second, later-armed cycle B for text v2 completed first,
called `setVerdictState(document.uri, ...)` for v2, and already published its reconciled result.
When cycle A's `else` branch runs, it unconditionally calls `this.forgetVerdict(document)` —
deleting B's fresh v2 verdict — then computes `next` from `latestLangiumBaseline(document)` (which
no longer has a verdict to reconcile against) plus a save-time bbjcpl compile, and publishes that
over whatever B already wrote to `document.diagnostics`. The result: a stale, failed cycle
silently erases a newer, successful cycle's verdict and its diagnostics, which is precisely the
"the latest text version wins... a result for an older text version never overwrites a newer one"
guarantee decision D-07 requires. The interleaving suite (`live-parse-interleaving.test.ts`) tests
many Langium-validation-vs-one-verdict orderings but never two overlapping debounce cycles for the
same document, so this path is untested.

**Fix:** Gate the fallback branch on `stillCurrent` the same way the verdict branch is gated —
treat a stale failure like a stale/cancelled verdict (no state change, no publish), since a newer
cycle for the newer text is already in flight or has already finished:

```ts
} else if (liveOutcome?.kind === 'verdict' || liveOutcome?.kind === 'cancelled' || !stillCurrent) {
    return;
} else {
    // failed, unavailable, or the latch/trigger is off, and still current
    ...
}
```

## Warnings

### WR-01: `parseProgram()` still lets the shared connection's breaker gate the dedicated lane

**File:** `bbj-vscode/src/language/java-interop.ts:492-497`

**Issue:**

```ts
public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
    const shared = await this.connect();
    const lane = await this.parseLaneConnection();
    ...
```

`parseProgram` always awaits the shared connection's `connect()` before trying the dedicated
lane, even though `openParseLane`/`parseLaneConnection` never touch `breakerState` and dial the
same host/port independently. When the breaker is `half-open` (the single post-outage probe
window), every *other* concurrent caller of `connect()` short-circuits with
`InteropTransportError` (`throwCircuitOpen()`) — including a `parseProgram` call that arrives
during that window, even though its own dedicated socket could very plausibly succeed against the
same, actually-reachable server. This is confirmed as today's behaviour by
`java-interop-parse-lane.test.ts`'s "with the peer down..." test (1 socket attempt, no dedicated
attempt), but that test only covers the peer being fully down, not the half-open/probe-contention
case, where the outcome is less obviously correct: a live parse can be held hostage by unrelated
class-lookup traffic racing it for the single half-open probe slot — one of the exact
serialization points issue #692 asked to remove.

**Fix:** Either run `connect()` and `parseLaneConnection()` concurrently
(`Promise.allSettled`/`Promise.all` with per-branch fallback), or let `parseLaneConnection()` open
independently of `connect()`'s outcome and only fall back to `shared` when the lane genuinely
failed — so a live parse is never blocked purely by the shared connection's breaker state.

## Info

### IN-01: The BBjCPL-availability gate is duplicated across three call sites

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:279-280`, `:378-379`

**Issue:** `this.trackBbjcplAvailability(); if (this.bbjcplAvailable === false) return;` is
repeated verbatim in `runBbjcplForDocuments` and `armLiveParseForDocument`. Both call sites now
feed the same `debouncedCompile()` cycle; keeping the gate in one place would remove the risk of
the two copies drifting apart the next time this logic changes.

**Fix:** Extract a small private helper, e.g. `private bbjcplUnavailable(): boolean { this.trackBbjcplAvailability(); return this.bbjcplAvailable === false; }`, and call it from both sites.

---

_Reviewed: 2026-09-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
