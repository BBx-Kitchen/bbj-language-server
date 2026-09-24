# Phase 105: Live Diagnostics Responsiveness on Large Workspaces - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Live compiler diagnostics (Phase 102's `parseProgram` path, reconciled per Phase 103) appear
while typing on a large workspace, without waiting for the initial whole-workspace build to
finish, in VS Code and IntelliJ alike. Issue #692 names two serialization points, and this phase
removes both:

1. **Scheduling:** the live-parse debounce timer is armed only inside
   `BBjDocumentBuilder.buildDocuments()`, which runs behind Langium's FIFO `WorkspaceLock`, so
   the initial `build()` of every workspace file holds it back.
2. **Transport:** `parseProgram` shares the single interop `MessageConnection` with the bulk
   `getClassInfo` resolution that the initial build drives, so it queues behind the class
   lookups the server has already received.

Not in scope: reordering Langium's initial build (open documents first, defer the rest), any
change to the `bbj-ls` server, and any change to what the diagnostics say. That last point is
settled by Phase 103.

Requirements: none formally mapped yet (ROADMAP says "derive from #692 at planning time"). The
four draft success criteria in the ROADMAP Phase 105 block are the acceptance basis.

</domain>

<decisions>
## Implementation Decisions

### Fix breadth
- **D-01:** **Ship two of #692's three directions:** arm the live-parse cycle from document
  events rather than from inside `buildDocuments()`, and give `parseProgram` its own interop
  lane (D-09). **No** open-documents-first reorder of the initial build.
- **D-02:** **The cycle is armed by both document change (`didChangeContent`) and document
  open.** A file opened while the startup build is still running gets BBj's verdict early, not
  only after the user types. The open-document gate (`shouldCompileWithBbjcpl`: open in an
  editor, `file:` scheme, not synthetic/external) still applies, so the cycle never runs per
  workspace file.
- **D-03:** **The existing rebuild-driven trigger stays** (`buildDocuments` →
  `runBbjcplForDocuments` → `debouncedCompile`). The event path and the rebuild path arm the
  **same** per-document debounce timer (`cplDebounceTimers`, 500 ms). The timer merges them
  into one cycle. A relink or config-driven revalidation of an open document still asks BBj
  again. `trigger === 'off'` handling in `runBbjcplForDocuments` (clear all verdicts, strip
  compiler diagnostics) is unchanged, and the event path must respect `off` too.

### Verdict before Langium
- **D-04:** **When BBj's verdict for the current text arrives before Langium has validated
  that text, publish BBj's diagnostics straight away** alongside whatever Langium last
  published, and store the verdict. When Langium's validation of that text lands, the Phase 103
  reconciliation (103 D-04..D-10) runs against it then. Holding the verdict until Langium catches
  up was rejected, because Langium's own validation also waits behind the lock.
- **D-05:** **While BBj's early diagnostics are showing, Langium's older syntax complaints get
  the Phase 103 D-08 carry-over treatment.** A complaint the new verdict doesn't flag, matched by
  message and line text, is downgraded to Warning. One the new verdict flags on an overlapping
  line gives way. Anything else stays an error until Langium re-validates. The user never sees
  both BBj and Langium syntax errors on the same line.
- **D-06:** **The bbjcpl fallback runs in the same early cycle.** The cycle stays one unit: live
  parse first, then bbjcpl on failure, unavailability or latch-off (103 D-01/D-02/D-03), all
  armed from the event path. Pre-endpoint BBj installs therefore also get bbjcpl results during
  startup, for open documents only.
- **D-07:** **Concurrent writers of `document.diagnostics`: the latest text version wins.**
  Every publish is built from one consistent snapshot: Langium's latest pre-hierarchy list plus
  the verdict for the latest text, with the hierarchy applied once. A result for an older text
  version never overwrites a newer one. Each writer re-derives the full set rather than
  appending to or stripping from whatever is there. This is criterion 3: no lost, doubled or
  misattributed diagnostic. Serializing the writers through a per-document queue was rejected,
  because it could bring back the wait. Proven by interleaving tests (D-12).

### Interop contention
- **D-08:** *(Scouted, not a user choice.)* vscode-jsonrpc writes each request to the socket
  immediately, so the queue a parse waits in is on the server, behind class lookups already
  sent. A client-side priority queue alone would not help.
- **D-09:** **`parseProgram` gets a dedicated `MessageConnection`** to the same configured
  interop host/port (whatever setting or IntelliJ port auto-detect supplies today), used only
  for `parseProgram`. This is a client-only change. The researcher must confirm that
  BBjServices / `bbj-ls` serves a second connection concurrently, against both the sibling repo
  `/home/coder/repos/bbj-ls` and the jar shipped in `/opt/bbx`. Throttling bulk resolution and a
  server-side executor in `bbj-ls` were rejected.
- **D-10:** **If the dedicated connection can't be opened but the main one works, `parseProgram`
  falls back to the shared connection.** This is logged once, with no new dialog or
  notification. Live diagnostics keep working, just queued again. The fallback is not
  classified as a parse failure and does not touch the probe latch.

### Measurement & proof
- **D-11:** **Before/after is measured on the private `bbj-corpus` opened as a workspace.**
  The metric is the time from an edit that introduces an invalid line, in a file opened while
  the initial build is running, to the first published diagnostic with source `BBj Parser`.
  Timings come from language-server log timestamps and are taken in both VS Code and IntelliJ.
  Only numbers and environment notes are recorded (BBj build, `bbj-ls` build, machine), never
  corpus file names or content (same rule as Phase 104).
- **D-12:** **Automated guards run in CI without BBj:**
  (a) a vitest test that holds the workspace write lock, standing in for a long initial build,
  fires a change or open event, and asserts the live parse is requested and its diagnostics
  published while the lock is still held;
  (b) interleaving tests for D-07, where Langium validation and a live-parse cycle for the same
  document finish in either order and across text versions, asserting no lost, doubled or
  misattributed diagnostic.
  Both use the scriptable `parseProgram` double in `test/bbj-test-module.ts`. No gated live
  flood test.
- **D-13:** **The result is recorded in `105-MEASUREMENT.md`** in the phase directory, and
  quoted in the PR body and in the comment that closes #692.

### Claude's Discretion
- How the event hook is wired: a listener on `TextDocuments.onDidChangeContent`/`onDidOpen`, a
  `DocumentUpdateHandler` override, or a builder `update()` override. The only constraint is that
  arming the timer must not wait on `workspaceLock`.
- How the second connection shares or splits the breaker, `connectionGeneration` and the probe
  latch. Constraint: a reset of either connection clears verdict state, as in Phase 102 D-06.
  The latch still reflects whether the endpoint exists.
- How "Langium's latest pre-hierarchy list" and its text version are tracked, so that D-04,
  D-05 and D-07 can tell whether Langium has caught up with the verdict's text.
- `hasPendingWork()` / `hasPendingCompile()` semantics (#486 config-reload quiescence) now that
  cycles can run while a build holds the lock. Keep the restart-never-mid-validation guarantee.
- Plan split. The obvious default is:
  (1) event-armed cycle, snapshot-based publish, held-lock and interleaving tests;
  (2) dedicated parse connection with fallback;
  (3) corpus measurement in both IDEs, `105-MEASUREMENT.md`, UAT, then PR.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Problem statement
- GitHub issue **#692** (`gh issue view 692`): evidence with file:line references for both
  serialization points and the three proposed directions
- `.planning/ROADMAP.md`: the "Phase 105" block (goal, four draft success criteria)
- `.planning/REQUIREMENTS.md`: PSRV-03 caveat (the #692 note), and PSRV-04/-08 (backward
  compatibility and failure guarantees this phase must not break)
- `.planning/STATE.md`: "Active Constraints" (v4.5 rules: probe, not version string; no
  proprietary text; branch + PR with register check)

### Decisions this phase builds on
- `.planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-CONTEXT.md`:
  D-05/D-06 (per-connection latch, reset on reconnect), D-08 (failure kinds), D-09/D-10
  (`BBj Parser` source, severity)
- `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONTEXT.md`: D-01..D-03
  (bbjcpl skipped while latched on, per-cycle fallback), D-04..D-10 (reconciliation), D-08
  (carry-over between verdicts)
- `.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-MR-DESCRIPTION.md`: endpoint
  contract (error codes, `RequestCancelled`)

### The code this phase changes
- `bbj-vscode/src/language/bbj-document-builder.ts`: `buildDocuments()`,
  `runBbjcplForDocuments()`, `shouldCompileWithBbjcpl()`, `debouncedCompile()` (clear-then-show,
  `versionBeforeRequest` stale guard, single publish), `forgetVerdict()`, `hasPendingWork()`
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts`: `reconcileWithVerdict()`, verdict
  state (`get/set/clearVerdictState`, `clearAllVerdictStates`), `recallLangiumDiagnostics()`
- `bbj-vscode/src/language/bbj-parser-service.ts`: `requestLiveParse()`, latch keyed on
  `connectionGeneration`
- `bbj-vscode/src/language/java-interop.ts`: single `connection`, `connect()`/breaker,
  `connectionGeneration`, `parseProgram()`
- `bbj-vscode/src/language/bbj-document-validator.ts`: `validateDocument()`,
  `applyConfiguredDiagnosticHierarchy()`, `getCompilerTrigger()`
- `bbj-vscode/src/language/bbj-ws-manager.ts`: `initializeWorkspace()` (preamble before
  `super`)

### Langium internals (read, don't patch)
- `bbj-vscode/node_modules/langium/lib/lsp/document-update-handler.js`: `didChangeContent`
  under `workspaceLock.write`
- `bbj-vscode/node_modules/langium/lib/workspace/workspace-lock.js`: FIFO single-writer mutex
- `bbj-vscode/node_modules/langium/lib/workspace/workspace-manager.js`: `ready` resolves before
  the batch `build()`

### Server side (read-only for D-09)
- `/home/coder/repos/bbj-ls`: how the interop socket server accepts and threads connections

### Tests and environment
- `bbj-vscode/test/bbj-test-module.ts`: `JavaInteropTestService`, scriptable `parseProgram`
  double
- `bbj-vscode/test/test-helper.ts`: `RUN_BBJ_TESTS` gate
- `/opt/bbx`: BBj with the Phase 101 `bbj-ls` jar (and the pre-endpoint jar backup for a
  latch-off check)
- `CLAUDE.md`: "Shell and File-Access Rules", and vitest runs with cwd = `bbj-vscode`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `debouncedCompile()` already implements the whole cycle (live parse → reconcile or fallback →
  one publish), with a per-document timer map. The event path should reuse it, not duplicate it.
- `reconcileWithVerdict()` and the verdict-state module are pure and unit-tested. D-04/D-05 need
  them called again when Langium's validation catches up, not a new algorithm.
- `JavaInteropService.connect()`/`establishConnection()` with the breaker and shared
  `connectingPromise` are the template for the dedicated connection.

### Established Patterns
- Compiler services are resolved lazily via `serviceRegistry` in the builder (a shared service).
- Detached timer callbacks catch and log everything, so no unhandled rejections (P61-D2-017).
- `notifyDocumentPhase(document, Validated, CancellationToken.None)` is the single re-publish
  after a cycle.
- `'on-save'` compiler trigger has no distinct handling today and behaves like `'debounced'`.
  Leave that as-is.

### Integration Points
- Langium `TextDocuments` events / `DocumentUpdateHandler` (the new arm point)
- `BBjDocumentValidator.validateDocument()` (where Langium's pre-hierarchy list is remembered,
  and where D-04's "reconcile later" must hook)
- The config-reload quiescence watcher that polls `hasPendingWork()` (#486)

</code_context>

<specifics>
## Specific Ideas

- Proof is edit → first `BBj Parser` diagnostic on a file opened during the initial build, on
  the real corpus, in both IDEs, before and after.
- #692 notes that `workspaceManager.ready` does not protect against the stall, because the lock
  alone serializes. Don't "fix" it by awaiting something earlier.

</specifics>

<deferred>
## Deferred Ideas

- Open-documents-first initial build (#692's second direction): helps every startup-waiting
  feature. It's its own phase if wanted, and relates to #562.
- Server-side priority executor for `parseProgram` in `bbj-ls`: separate repo, not needed if
  D-09 holds.

### Reviewed Todos (not folded)
- `2026-09-20-linking-interop-failures-survive-class-warmup.md`: test-environment drift, not
  scheduling
- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`: IntelliJ
  lifecycle
- `2026-09-20-phase-97-code-review-follow-ups.md`: IntelliJ Node download
- `2026-09-20-status-transition-log-prints-a-stale-previous-status.md`: IntelliJ lifecycle
- `2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`: A2 validator residue (Phase
  104 territory)
- All five matched on keywords only. None of them touches live-parse scheduling.

</deferred>

---

*Phase: 105-live-diagnostics-responsiveness-on-large-workspaces*
*Context gathered: 2026-09-23*
