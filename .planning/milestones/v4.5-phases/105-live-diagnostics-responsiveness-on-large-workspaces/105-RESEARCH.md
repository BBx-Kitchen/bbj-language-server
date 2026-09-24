# Phase 105: Live Diagnostics Responsiveness on Large Workspaces - Research

**Researched:** 2026-09-23
**Domain:** Langium `WorkspaceLock`/`DocumentBuilder` scheduling; vscode-jsonrpc `MessageConnection` transport; `bbj-ls` per-connection concurrency
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Ship two of #692's three directions: arm the live-parse cycle from document events
  rather than from inside `buildDocuments()`, and give `parseProgram` its own interop lane (D-09).
  **No** open-documents-first reorder of the initial build.
- **D-02:** The cycle is armed by both document change (`didChangeContent`) and document open.
  A file opened while the startup build is still running gets BBj's verdict early, not only
  after the user types. The open-document gate (`shouldCompileWithBbjcpl`) still applies, so the
  cycle never runs per workspace file.
- **D-03:** The existing rebuild-driven trigger stays (`buildDocuments` → `runBbjcplForDocuments`
  → `debouncedCompile`). The event path and the rebuild path arm the **same** per-document
  debounce timer (`cplDebounceTimers`, 500 ms). The timer merges them into one cycle. A relink or
  config-driven revalidation of an open document still asks BBj again. `trigger === 'off'`
  handling in `runBbjcplForDocuments` is unchanged, and the event path must respect `off` too.
- **D-04:** When BBj's verdict for the current text arrives before Langium has validated that
  text, publish BBj's diagnostics straight away alongside whatever Langium last published, and
  store the verdict. When Langium's validation of that text lands, the Phase 103 reconciliation
  (103 D-04..D-10) runs against it then. Holding the verdict until Langium catches up was
  rejected, because Langium's own validation also waits behind the lock.
- **D-05:** While BBj's early diagnostics are showing, Langium's older syntax complaints get the
  Phase 103 D-08 carry-over treatment. A complaint the new verdict doesn't flag, matched by
  message and line text, is downgraded to Warning. One the new verdict flags on an overlapping
  line gives way. Anything else stays an error until Langium re-validates. The user never sees
  both BBj and Langium syntax errors on the same line.
- **D-06:** The bbjcpl fallback runs in the same early cycle. The cycle stays one unit: live parse
  first, then bbjcpl on failure, unavailability or latch-off (103 D-01/D-02/D-03), all armed from
  the event path. Pre-endpoint BBj installs therefore also get bbjcpl results during startup, for
  open documents only.
- **D-07:** Concurrent writers of `document.diagnostics`: the latest text version wins. Every
  publish is built from one consistent snapshot: Langium's latest pre-hierarchy list plus the
  verdict for the latest text, with the hierarchy applied once. A result for an older text version
  never overwrites a newer one. Each writer re-derives the full set rather than appending to or
  stripping from whatever is there. Serializing the writers through a per-document queue was
  rejected, because it could bring back the wait. Proven by interleaving tests (D-12).
- **D-08:** *(Scouted, not a user choice.)* vscode-jsonrpc writes each request to the socket
  immediately, so the queue a parse waits in is on the server, behind class lookups already sent.
  A client-side priority queue alone would not help.
- **D-09:** `parseProgram` gets a dedicated `MessageConnection` to the same configured interop
  host/port (whatever setting or IntelliJ port auto-detect supplies today), used only for
  `parseProgram`. This is a client-only change. The researcher must confirm that BBjServices /
  `bbj-ls` serves a second connection concurrently, against both the sibling repo `bbj-ls` and the
  jar shipped in `/opt/bbx`. Throttling bulk resolution and a server-side executor in `bbj-ls`
  were rejected.
- **D-10:** If the dedicated connection can't be opened but the main one works, `parseProgram`
  falls back to the shared connection. Logged once, no new dialog/notification. Live diagnostics
  keep working, just queued again. Not classified as a parse failure; does not touch the probe
  latch.
- **D-11:** Before/after is measured on the private `bbj-corpus` opened as a workspace. Metric:
  time from an edit introducing an invalid line, in a file opened while the initial build is
  running, to the first published diagnostic with source `BBj Parser`. Timings from
  language-server log timestamps, both VS Code and IntelliJ. Only numbers and environment notes
  recorded, never corpus file names/content.
- **D-12:** Automated guards run in CI without BBj: (a) a vitest test holding the workspace write
  lock, standing in for a long initial build, fires a change/open event, asserts the live parse is
  requested and its diagnostics published while the lock is still held; (b) interleaving tests for
  D-07, Langium validation and a live-parse cycle for the same document finishing in either order
  and across text versions, asserting no lost/doubled/misattributed diagnostic. Both use the
  scriptable `parseProgram` double in `test/bbj-test-module.ts`. No gated live flood test.
- **D-13:** The result is recorded in `105-MEASUREMENT.md` in the phase directory, quoted in the
  PR body and in the comment that closes #692.

### Claude's Discretion

- How the event hook is wired: a listener on `TextDocuments.onDidChangeContent`/`onDidOpen`, a
  `DocumentUpdateHandler` override, or a builder `update()` override. The only constraint is that
  arming the timer must not wait on `workspaceLock`.
- How the second connection shares or splits the breaker, `connectionGeneration` and the probe
  latch. Constraint: a reset of either connection clears verdict state, as in Phase 102 D-06. The
  latch still reflects whether the endpoint exists.
- How "Langium's latest pre-hierarchy list" and its text version are tracked, so that D-04, D-05
  and D-07 can tell whether Langium has caught up with the verdict's text.
- `hasPendingWork()`/`hasPendingCompile()` semantics (#486 config-reload quiescence) now that
  cycles can run while a build holds the lock. Keep the restart-never-mid-validation guarantee.
- Plan split. The obvious default is: (1) event-armed cycle, snapshot-based publish, held-lock and
  interleaving tests; (2) dedicated parse connection with fallback; (3) corpus measurement in both
  IDEs, `105-MEASUREMENT.md`, UAT, then PR.

### Deferred Ideas (OUT OF SCOPE)

- Open-documents-first initial build (#692's second direction): its own phase if wanted, relates
  to #562.
- Server-side priority executor for `parseProgram` in `bbj-ls`: separate repo, not needed if D-09
  holds.
- Reviewed todos (2026-09-20/21 items on interop failures, crash detection, IntelliJ Node
  download, status log, A2 residue) — all keyword-matched only, none touches live-parse
  scheduling.
</user_constraints>

<phase_requirements>
## Phase Requirements

The ROADMAP names no formal requirement IDs for Phase 105 ("derive from #692 at planning time").
Following this project's per-capability-area prefix convention (`PARSE-`, `VALID-`, `PSRV-`,
`EXMP-`, `CONF-` — each a distinct capability, `REQUIREMENTS.md` "Traceability" table), this
research proposes a new prefix, **`RESP-`** (Responsiveness), scoped 1:1 to the phase's four
draft success criteria. `PSRV-` is deliberately not reused: those four requirements describe the
existence and correctness of the compiler-parser endpoint itself (phases 101-103, already
Complete); `RESP-` describes *when* that already-correct result reaches the user. The planner
should add these rows to `REQUIREMENTS.md`'s "Future" or "v1" section and the Traceability table
(mapped to Phase 105) rather than inventing IDs mid-plan.

| ID | Description | Research Support |
|----|-------------|------------------|
| RESP-01 | A live parser diagnostic (`source: 'BBj Parser'`) appears for a document opened or edited while the initial whole-workspace build is still running, in both VS Code and IntelliJ, without waiting for that build to finish | Architecture Patterns 1-2 (event-armed cycle bypassing `WorkspaceLock`); confirmed root cause in `workspace-lock.js`/`document-update-handler.js`/`workspace-manager.js` |
| RESP-02 | The live-parse debounce timer (`cplDebounceTimers`) is armed by a code path that does not await `services.workspace.WorkspaceLock`, `DocumentBuilder.update()`, or `DocumentBuilder.build()` | Architecture Pattern 1; Common Pitfall 1 (text-freshness hazard this path must also solve) |
| RESP-03 | When a live-parse verdict and a freshly produced Langium validation for the same document's *same* text version are both about to write `document.diagnostics`, the result is the union described by D-07 with no diagnostic lost, doubled, or misattributed to the wrong line/severity — proven by interleaving tests across arrival order and text version | Architecture Pattern 3 (snapshot/version tracking); Don't Hand-Roll 1; Common Pitfall 2 |
| RESP-04 | `parseProgram` requests travel a `MessageConnection` dedicated to that endpoint, separate from the connection used for `getClassInfo`/classpath bulk resolution, with a same-connection fallback per D-10 when the second connection cannot be opened | Architecture Pattern 4; Live Server Evidence section (bbj-ls accept-loop/per-connection isolation, `ParserCacheGuard`) |
| RESP-05 | The before/after wait-time improvement is measured on the `bbj-corpus` workspace in both IDEs and recorded in `105-MEASUREMENT.md`, quoted in the PR body and the issue-closing comment | Validation Architecture; D-11/D-13 (locked) |

RESP-01..03 map to ROADMAP success criteria 1 and 3; RESP-04 maps to success criterion 2 (and the
D-09 transport fix); RESP-05 maps to success criterion 4.
</phase_requirements>

## Summary

Issue #692 names two independent serialization points, and this phase removes both on the client
side only. Both are now root-caused with file:line evidence, not just described:

**Point 1 — scheduling.** `BBjWorkspaceManager.initializeWorkspace()`'s whole-workspace build runs
*inside* `services.workspace.WorkspaceManager`'s `initialized()` hook, which Langium wires as
`this.mutex.write(token => this.initializeWorkspace(...))` (`workspace-manager.js:29-32`) — the
initial build **is** the first write queued on the single-writer `DefaultWorkspaceLock`
(`workspace-lock.js`). Every later `didChangeContent`/`didOpenDocument` event goes through
`DefaultDocumentUpdateHandler.fireDocumentUpdate()`, which does
`workspaceManager.ready.then(() => workspaceLock.write(...))` (`document-update-handler.js:43-52`).
`ready` resolves early (right after documents are collected, before the build itself runs —
`workspace-manager.js:60-68`), so the change event's `write()` call is enqueued, but the lock's
queue is strictly FIFO (`workspace-lock.js:35-50`): it cannot run until the still-in-flight
initial-build write action settles. `runBbjcplForDocuments()`/`debouncedCompile()` — where the
500 ms live-parse timer is armed today — only ever runs from inside `buildDocuments()`
(`bbj-document-builder.ts:151-217`), which only ever runs inside a lock-held write action. This
confirms #692's own note: awaiting `workspaceManager.ready` earlier does not help, because the
lock alone is what serializes.

**Point 2 — transport.** `JavaInteropService` multiplexes every request — `getClassInfo` (bulk
class resolution during the initial build) and `parseProgram` (live diagnostics) alike — onto one
`MessageConnection`/one TCP socket (`java-interop.ts:141,466-469`). vscode-jsonrpc writes each
request to the socket as soon as it is sent and reads incoming messages strictly in wire order;
a `parseProgram` request sent after a burst of `getClassInfo` requests cannot be read off the wire
until every earlier message has been read, regardless of how fast the server handles each one.

**The fix, confirmed viable on both sides:**

1. Arm the debounce timer directly from `services.shared.workspace.TextDocuments.onDidChangeContent`
   /`onDidOpen` — the same `NormalizedTextDocuments` emitter Langium's own
   `DefaultDocumentUpdateHandler` listens on (`normalized-text-documents.js`,
   `language-server.js:223,226`) — instead of from inside `buildDocuments()`. This event fires
   independently of `WorkspaceLock` and can reuse `debouncedCompile()` unmodified for the actual
   parse/reconcile/publish logic (`notifyDocumentPhase(document, DocumentState.Validated, ...)`
   is itself lock-independent — see Pitfall 3).
2. Give `parseProgram` its own `MessageConnection` to the same host/port. `bbj-ls`'s accept loop
   (`LanguageService.java:114-138`) builds a **new, independent** `InteropService`/`ParserWorker`
   pair per accepted TCP connection — there is no shared lock or shared executor between
   connections for parsing; `getClassInfo` doesn't even touch `ParserWorker` (it resolves
   synchronously on the dispatch thread, `InteropService.java:233-237`). A same-day upstream fix
   (`bbj-ls@9987bee`, already baked into the `/opt/bbx` jar — see Live Server Evidence) closes the
   one real cross-connection hazard found: BBj's shared AST cache could otherwise hand a second
   connection's first parse another connection's stale source snapshot.

**Primary recommendation:** Add a listener directly on `TextDocuments.onDidChangeContent`/
`onDidOpen` inside `BBjDocumentBuilder`'s constructor (it already receives `TextDocuments` via its
`LangiumSharedCoreServices` constructor argument) that calls the existing `debouncedCompile()` —
but resolve the *live* text from `TextDocuments.get(uri)` inside that call path, not from
`LangiumDocument.textDocument`, which is lazily bound and can still be pointing at stale/original
on-disk content for a document that has never been through `buildDocuments()`'s step-0 parse (see
Pitfall 1 — this is the one correctness trap that isn't obvious from reading `bbj-document-builder.ts`
alone). Extend `JavaInteropService` with a second, `parseProgram`-only `MessageConnection` built
from the same host/port fields it already owns, reusing its existing breaker/`connect()` template.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Debounce-timer scheduling (when the live-parse cycle is armed) | API/Backend (language server, shared `DocumentBuilder`) | — | Purely a server-internal scheduling decision; no browser or SSR tier is involved — both IDEs are thin LSP clients |
| Live-text sourcing for a not-yet-rebuilt document | API/Backend (`TextDocuments`/`LangiumDocument` sync) | — | The live (possibly unsaved) text lives in the LSP server's own `TextDocuments` store, synced from the client's `didChange` notifications; never re-fetched from the client |
| `parseProgram` transport (dedicated connection) | API/Backend (language server ↔ `bbj-ls` socket) | — | A private wire between two backend processes (Node LSP server, JVM `bbj-ls`); neither IDE's UI tier participates |
| Per-connection parse isolation / AST cache guard | External Service (`bbj-ls`/BBjServices, closed-source parser engine) | — | Out of this repo's control; this phase only depends on it, does not implement it (Deferred: "Server-side priority executor... separate repo") |
| Diagnostic reconciliation/publish (snapshot-consistent writer) | API/Backend (shared `bbj-diagnostic-reconciliation.ts`/`bbj-document-validator.ts`) | — | Pure, already-isolated module (per its own doc comment); this phase adds a second caller, not a second implementation |
| Measurement/proof (before/after timing) | Tooling (log timestamps, both IDE hosts) | — | Observability concern, not a runtime capability; VS Code and IntelliJ are each their own harness for this |

No browser/client-tier or CDN/static-tier capability is touched by this phase — everything named
in the four success criteria lives inside the language server's own scheduling and transport, or
in the separate `bbj-ls` process it talks to.

## Standard Stack

This phase adds no new runtime dependency. It re-wires existing, already-vetted machinery:

| Component | Version (installed) | Role in this phase |
|-----------|---------------------|---------------------|
| `langium` | Installed in `bbj-vscode/node_modules/langium` (workspace dep; version not re-verified here since no upgrade is proposed) `[VERIFIED: bbj-vscode/node_modules/langium/lib/workspace/document-builder.js, workspace-lock.js, workspace-manager.js, lib/lsp/document-update-handler.js, lib/lsp/normalized-text-documents.js, lib/lsp/language-server.js — all read this session]` | Supplies `TextDocuments`/`NormalizedTextDocuments` (the new arm point), `WorkspaceLock`/`DocumentBuilder` (the thing being bypassed), and `notifyDocumentPhase`'s diagnostics-publish glue (reused unchanged) |
| `vscode-jsonrpc` | Already a dependency of `java-interop.ts` (`createMessageConnection`, `SocketMessageReader/Writer`) `[VERIFIED: bbj-vscode/src/language/java-interop.ts:9-12]` | Supplies the second `MessageConnection` for D-09 — same API `JavaInteropService.establishConnection()` already uses |
| `vitest` | 4.1.10 `[VERIFIED: bbj-vscode/package.json:706,714,691; node_modules/vitest/package.json]` | D-12's held-lock and interleaving tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `TextDocuments.onDidChangeContent`/`onDidOpen` listener | Override `DocumentUpdateHandler.didChangeContent`/`didOpenDocument` | Both are lock-independent arm points (discretion item). A `DocumentUpdateHandler` override still calls into `fireDocumentUpdate` for the *rebuild* path unless carefully split; a direct listener is additive and cannot accidentally regress the existing rebuild-driven trigger (D-03) |
| A second `MessageConnection` on `JavaInteropService` | A wholly separate `ParserConnectionService` class | A separate class needs its own host/port wiring (`bbj-ws-manager.ts:74` currently calls `this.javaInterop.setConnectionConfig(...)` once); reusing `JavaInteropService`'s existing private `interopHost`/`interopPort` fields and breaker template avoids duplicating that plumbing |

**Installation:** none — no `npm install` needed for this phase.

## Package Legitimacy Audit

Not applicable — this phase installs no new external package. Every component used
(`langium`, `vscode-jsonrpc`, `vitest`) is an existing, already-vetted dependency exercised through
APIs the codebase already calls elsewhere (`java-interop.ts`'s `createMessageConnection`, the
existing `bbj-parser-service.test.ts`/`bbj-document-builder`-family test suite's `vitest` usage).

## Architecture Patterns

### System Architecture Diagram

```
 Editor (VS Code / IntelliJ)
      │ didOpen / didChange (LSP)
      ▼
 TextDocuments (NormalizedTextDocuments) ──────────────┐
      │ fires onDidOpen / onDidChangeContent           │ (same emitter, two independent listeners)
      ▼                                                ▼
 DefaultDocumentUpdateHandler                   [NEW] BBjDocumentBuilder's own listener
      │ workspaceManager.ready.then(...)               │ reads live text from TextDocuments.get(uri)
      ▼                                                │ directly — NOT from LangiumDocument.textDocument
 WorkspaceLock.write(...)  ◄── FIFO queue ──┐           │ (see Pitfall 1)
      │                                     │           ▼
      │   ┌─────────────────────────────────┘     debouncedCompile(document, liveText)
      │   │ (initial build's write action,               │  500ms trailing-edge debounce,
      │   │  already queued/running — this               │  same cplDebounceTimers map as
      │   │  is what stalls the OLD path)                │  the rebuild-driven trigger (D-03)
      ▼   │                                               ▼
 DocumentBuilder.build()/update()             BBjParserService.requestLiveParse()
      │                                               │
      ▼                                               ▼
 buildDocuments()                          [NEW] dedicated MessageConnection ──┐
      │  (unchanged rebuild-driven               (parseProgram only)          │
      │   trigger, D-03 stays)                                                │
      ▼                                                                       │
 runBbjcplForDocuments() → debouncedCompile()   JavaInteropService (main)     │
      │  (same cplDebounceTimers map)              │ getClassInfo (bulk       │
      ▼                                            │ class resolution,       │
 [shared] reconcileWithVerdict() /                 │ separate socket)        │
 applyDiagnosticHierarchy()                        ▼                         ▼
      │                                    ┌──────────────────────────────────────┐
      ▼                                    │  bbj-ls accept loop (LanguageService) │
 document.diagnostics = ...                │  — one InteropService+ParserWorker   │
      │                                    │    pair PER accepted connection —    │
      ▼                                    │    no shared lock/executor between   │
 notifyDocumentPhase(Validated)             │    connections for parsing          │
      │  (lock-independent — Pitfall 3)     └──────────────────────────────────────┘
      ▼
 connection.sendDiagnostics(...)  →  Editor
```

Fallback (D-10): if the dedicated connection cannot be opened, `parseProgram` calls fall back to
the same shared `MessageConnection` `getClassInfo` uses — logged once, no latch change.

### Recommended Project Structure

No new files are required; every change lands in existing modules:

```
bbj-vscode/src/language/
├── bbj-document-builder.ts      # [NEW] TextDocuments.onDidChangeContent/onDidOpen listener,
│                                 #      wired in the constructor; reuses debouncedCompile()
├── bbj-parser-service.ts        # [CHANGED] requestLiveParse() takes/derives live text+version
│                                 #      independent of document.textDocument when called early
├── java-interop.ts              # [NEW] second MessageConnection + connect method, parseProgram-
│                                 #      only, sharing interopHost/interopPort/breaker template
├── bbj-diagnostic-reconciliation.ts  # [CHANGED, maybe] version-tagged snapshot for D-07/D-04
└── bbj-document-validator.ts    # [CHANGED, maybe] remember text version alongside pre-hierarchy
                                    #      diagnostics, for "has Langium caught up with this verdict's
                                    #      text" (Claude's Discretion item 3)
```

### Pattern 1: Event-armed cycle bypassing `WorkspaceLock`

**What:** Subscribe directly to `services.shared.workspace.TextDocuments.onDidChangeContent` and
`.onDidOpen` (both are plain `Emitter`s — `normalized-text-documents.js:21-31,56-57`) from
`BBjDocumentBuilder`'s constructor, which already receives `LangiumSharedCoreServices` and could
store `services.workspace.TextDocuments` alongside the `textDocuments` field it inherits from
`DefaultDocumentBuilder`. Langium's own `DefaultDocumentUpdateHandler` is *itself* just another
listener on this same emitter (`language-server.js:223,226`); a second, independent listener does
not interfere with it and does not need to go through `fireDocumentUpdate`/`WorkspaceLock` at all.

**When to use:** Exactly this phase's D-02 requirement — arming a cycle that must not wait behind
the initial build's `WorkspaceLock.write()`.

**Example (illustrative, not verbatim — see Pitfall 1 for the text-sourcing nuance this must
also handle):**
```typescript
// Source: this repository, bbj-document-builder.ts constructor (existing) +
// langium/lib/lsp/normalized-text-documents.js (read this session) for the emitter shape
constructor(services: LangiumSharedCoreServices) {
    super(services);
    this.wsManager = () => services.workspace.WorkspaceManager;
    this.fileSystemProvider = services.workspace.FileSystemProvider;
    // NEW: arm the live-parse cycle from document events directly — this listener fires
    // independently of services.workspace.WorkspaceLock.
    const textDocuments = services.workspace.TextDocuments;
    textDocuments.onDidOpen(event => this.armLiveParseCycle(event.document.uri));
    textDocuments.onDidChangeContent(event => this.armLiveParseCycle(event.document.uri));
}
```

### Pattern 2: `WorkspaceLock.write()`'s FIFO ordering — why `workspaceManager.ready` doesn't help

**What:** `ready` (a `Deferred`) resolves inside `performStartup()`, *before*
`documentBuilder.build(documents, ...)` is even called (`workspace-manager.js:34-40,60-67`,
confirmed by reading both `initializeWorkspace` and `performStartup` this session). So a
`didChangeContent` event that arrives while the initial build is running always finds `ready`
already resolved, and its `workspaceLock.write(...)` call is accepted into the queue immediately
— but `DefaultWorkspaceLock.enqueue()` only *starts* the next queued write once `this.done` flips
back to `true`, which happens only when the *previous* write action's promise settles
(`workspace-lock.js:24-34,51-69`). The previous write action, for the very first change during
startup, is the initial build itself. This is the literal mechanism behind #692's own note that
awaiting `ready` earlier "does not protect against the stall, because the lock alone serializes."

**When to use:** This is *why* Pattern 1 is necessary — it explains why no amount of reordering
inside the existing `buildDocuments()`/`update()`/`build()` call chain can fix RESP-01/02; the
arm point has to sit entirely outside that chain.

**Anti-pattern:** Awaiting `workspaceManager.ready` and then calling `documentBuilder.update(...)`
(which itself calls `workspaceLock.write(...)`) from the new listener. This still queues behind
the in-flight initial build — no improvement over today's behavior. The new listener must call
`debouncedCompile()`-equivalent logic *directly*, never through `DocumentBuilder.update()`.

### Pattern 3: Version-tagged snapshot writer (D-04/D-07)

**What:** Both writers — Langium's own `validateDocument()` (`bbj-document-validator.ts:226-250`)
and the debounce callback's verdict reconciliation (`bbj-document-builder.ts:287-393`) — already
follow a "recompute the full list, then assign" discipline (`document.diagnostics =
applyConfiguredDiagnosticHierarchy(diagnostics)`), never appending/stripping in place. What's
missing for D-07 is a shared, version-stamped record of "the last Langium pre-hierarchy list *and
the text version it was computed against*" so a late-arriving writer can tell whether its own
input is stale before it overwrites. Today's `recallLangiumDiagnostics`/`rememberLangiumDiagnostics`
(`bbj-diagnostic-reconciliation.ts:239-249`) stores the list but not a version tag — extending the
stored value to `{ diagnostics, version }` (or storing `document.textDocument.version` in a
parallel `WeakMap`) is the natural minimal extension, matching the existing `versionBeforeRequest`
guard `debouncedCompile()` already uses (`bbj-document-builder.ts:321,327`) for its own stale-check.

**When to use:** Wherever D-07's "latest text version wins" rule is enforced — both in
`debouncedCompile()`'s existing `document.textDocument.version === versionBeforeRequest` guard
(already present, reusable) and in a new guard inside `validateDocument()`'s carry-over/remember
step (needs to compare against whatever version the *last verdict* was for, so a verdict racing
ahead per D-04 isn't clobbered by an in-flight Langium validation for an *older* text version
finishing later).

### Pattern 4: `bbj-ls` per-connection isolation (D-09)

**What:** `LanguageService.run()`'s accept loop (`LanguageService.java:68-101`) calls
`serveConnection()` → `startServing()` for every accepted socket, and `startServing()` builds a
**brand-new** `InteropService` (`new InteropService(remoteAddress)`) and lsp4j `Launcher` per
connection (`LanguageService.java:127-138`) — there is no cross-connection object or lock at this
layer. Inside `InteropService`, `getClassInfo` resolves synchronously on the dispatch thread via
`loadClassInfo(...)` and never touches `ParserWorker` (`InteropService.java:233-237`); `parseProgram`
lazily builds one `ParserWorker` per connection (`InteropService.java:268-287`), and every parse on
that connection serializes onto **that connection's own** single-thread `ExecutorService`
(`ParserWorker.java:157,226-233`) because the underlying `ProgramFactoryIF` is not thread-safe —
this is a per-connection design constraint, not a cross-connection one. Two connections therefore
get two fully independent `ParserWorker`s, threads, and factories — `getClassInfo` traffic on the
main connection literally cannot block `parseProgram` traffic on a dedicated second connection at
this layer.

**When to use:** This is the direct evidence backing D-09. See "Live Server Evidence" below for
the one real hazard this pattern exposed (a shared BBj-internal AST cache) and its fix.

**Example — the fallback shape to mirror for D-10:**
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:246-283 (read this session) — the existing
// connect()/establishConnection()/breaker template a second, parseProgram-only connection reuses.
protected async connect(): Promise<MessageConnection> { /* ...existing breaker/backoff logic... */ }
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting "is this diagnostic write stale" | A custom per-document mutex/queue serializing Langium's validator and the debounce callback | A version-stamped snapshot compare (Pattern 3), matching the existing `versionBeforeRequest` idiom | D-07 explicitly rejects a serializing queue ("could bring back the wait"); the codebase already has a working non-blocking stale-check pattern one hop away |
| A priority/fast-lane queue for `parseProgram` on the client | A client-side request-priority queue on top of the single `MessageConnection` | A second, dedicated `MessageConnection` (D-09) | D-08 (scouted) already established a client-side queue can't help — vscode-jsonrpc writes to the socket immediately, so the queue that matters is server-side/transport-order, not anything the client can reprioritize post-hoc |
| Detecting whether the live-parse endpoint exists on a fresh second connection | A new capability probe / version check for the second connection | The exact same `MethodNotFound`-latches-off pattern `BBjParserService` already implements for the main connection (`bbj-parser-service.ts:174-322`), keyed on whichever connection's own `connectionGeneration` | Phase 102 already solved "does this server have the endpoint" once; a second connection is the same server, same question, same latch shape — just a second instance of state, not new logic |

**Key insight:** every piece of this phase's plumbing (stale-write detection, connection-capability
probing, breaker/backoff) already exists once in this codebase for a closely analogous problem.
The work is almost entirely *placement* (moving the arm point outside the lock) and *duplication*
(a second connection, a second/extended snapshot), not new algorithms.

## Live Server Evidence

Both required sources were read this session, and a version-skew finding emerged that materially
affects planning:

- **Sibling repo `/home/coder/repos/bbj-ls`** (read-only), local `develop` checkout at `0a88cba`
  before this session's `git fetch origin`. `LanguageService.java` and `InteropService.java`/
  `ParserWorker.java` confirm the per-connection isolation described in Pattern 4
  `[VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:114-157, InteropService.java:233-311, ParserWorker.java:38-233 — read this session]`.

- **`/opt/bbx/.lib/bbjls/bbj-ls.jar`** (read-only, inspected via `unzip -l` and `javap -p -c`):
  contains a class, `bbj.interop.ParserCacheGuard`, with a static method
  `disableSharedCache(ProgramFactoryIF)`, and `ParserWorker.bbjProgramFactory(...)`'s bytecode
  calls it immediately after `setTypeChecking(false)`
  `[VERIFIED: javap -p -c on /tmp extraction of /opt/bbx/.lib/bbjls/bbj-ls.jar, bytecode offsets 11-22 of bbjProgramFactory, this session]`.
  This class/call does **not** exist in the locally-checked-out `bbj-ls@0a88cba`.

- **Root cause, found by fetching `origin` (network available in this environment):**
  `origin/develop` is ahead of the local checkout by several commits, ending in
  `9987bee "fix(#689): isolate parser cache and enforce running parse deadlines"`, authored
  2026-09-22 (the day before this research session) by the same person as this project's git
  identity. Its own commit message states the defect directly: *"Bypass the shared BBj AST cache
  through a compatibility guard so new connections cannot receive diagnostics for another source
  snapshot."* The pre-fix doc comment on `ParserWorker` said as much: *"BBj's shared AST cache is
  keyed on canonical name alone and relies on this instance's own history of source UUIDs to
  notice a name changed; a factory rebuilt per request starts that history empty and can hand
  back another connection's stale parse."* `[VERIFIED: git -C /home/coder/repos/bbj-ls show 9987bee — read this session, both the ParserCacheGuard.java addition and the ParserWorker.java diff]`.

  **This is exactly D-09's risk, already found and already fixed, one commit before this
  session.** Without `ParserCacheGuard`, a dedicated second connection's first `parseProgram` call
  for a canonical name the main connection (or a previous connection generation) had already
  touched could return a stale/wrong-source parse from BBj's shared cache — silently, with no
  error code. The fix disables that shared cache per-factory via reflection on BBj's internal
  type-resolver object (`ParserCacheGuard.java`, `disableSharedCache`), so every connection's
  first parse of any canonical name is genuinely fresh.

  **Version-skew caveat:** `9987bee` exists **only** on `origin/develop`
  `[VERIFIED: git -C /home/coder/repos/bbj-ls merge-base --is-ancestor 9987bee origin/release/26.03 → not an ancestor, this session]`
  — it has not yet been merged into `origin/release/26.03`. The `/opt/bbx` sandbox jar already
  contains it (confirmed by bytecode), so this environment's own D-11/D-12 work and measurement
  are safe. A customer's real BBj 26.03 install, if built from `release/26.03` before this fix is
  backported, would **not** have `ParserCacheGuard` and could hit the stale-cache hazard the first
  time the dedicated connection parses a canonical name another connection (or a prior connection
  generation, e.g. after a Phase 102 D-05/D-06 reconnect) already touched. This is an upstream
  `bbj-ls` release-branch gap, not something this phase's client-side plan can close — flag it for
  the user (who authored the fix) to backport/cherry-pick to `release/26.03` before or alongside
  shipping D-09, and record it as a residual risk in the plan rather than silently assuming
  parity between `develop` and the shipping branch.

- **What `getClassInfo` does NOT touch:** `InteropService.getClassInfo()` resolves via
  `loadClassInfo(params.className)` and returns `CompletableFuture.completedFuture(classInfo)`
  synchronously on the dispatch thread — it never calls `parserWorker()`/`ParserWorker`
  `[VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:233-237 — read this session]`.
  Bulk class resolution and `parseProgram` are architecturally disjoint server-side even on the
  *same* connection; the D-08 queueing problem is purely about transport-level (socket read/write)
  ordering on one connection, not a server-side execution conflict between the two request kinds.

## Common Pitfalls

### Pitfall 1: `LangiumDocument.textDocument` is a lazily-bound, possibly-stale getter

**What goes wrong:** Calling `bbjParserService.requestLiveParse(document)` (which reads
`document.textDocument.getText()`/`.version`, `bbj-parser-service.ts:245-247`) for a document that
has never been through `buildDocuments()`'s step-0 parse sends **stale (original on-disk, or
empty) text** instead of the live edited text, because `LangiumDocument.textDocument` for a
workspace-created document is a lazy getter that snapshots and **caches** the file's content the
*first* time it is read (`documents.js:130,141-155,189-195`), and is only ever rebound to the
live, LSP-synced `TextDocument` object inside `DefaultLangiumDocumentFactory.update()`
(`documents.js:156-180`) — which itself only ever runs as step 0 of `buildDocuments()`, i.e.
**inside** a `WorkspaceLock`-held write action `[VERIFIED: bbj-vscode/node_modules/langium/lib/workspace/documents.js:130-195, document-builder.js:254-257 — read this session]`.

**Why it happens:** This phase's whole point is arming the cycle *before* any `buildDocuments()`
call has run for the affected document (that's exactly the scenario during a stalled initial
build). At that moment, the `LangiumDocument` object exists (created during `performStartup()`'s
`loadWorkspaceDocuments`, before `ready` resolves — `workspace-manager.js:57,69-74`) but its
`.textDocument` has either never been accessed (will lazily snapshot the *original file content*
on first read) or was accessed once by some unrelated earlier code path (permanently cached at
whatever it was then). Neither is the live, currently-edited text the user just typed.

**How to avoid:** The new event listener must source the text it sends to `parseProgram` — and the
version it uses for `debouncedCompile()`'s `versionBeforeRequest` stale-guard — from
`services.workspace.TextDocuments.get(uri)` (the *same* live `TextDocument` object the
`onDidChangeContent`/`onDidOpen` event itself carries as `event.document`), never from
`langiumDocument.textDocument` until that has genuinely been rebound. Concretely: either (a) pass
the live `TextDocument` explicitly into a refactored `requestLiveParse`/`debouncedCompile` that no
longer assumes `document.textDocument` is fresh, or (b) call
`langiumDocumentFactory.update(document, cancelToken)` synchronously from the event handler before
invoking the existing debounce logic — cheap for a single document (a normal per-keystroke Langium
re-parse, not the workspace-wide bottleneck) and has the side benefit of leaving `document.state`
correctly advanced. Option (a) is more surgical and avoids a redundant re-parse when Langium's own
`buildDocuments()` will parse the same text moments later anyway.

**Warning signs:** A verdict/diagnostic appearing for the *previous* (pre-edit, or even pre-open)
version of a file's text — e.g. a live diagnostic pointing at a line that was already fixed, or no
diagnostic appearing at all for a brand-new syntax error, right after opening a large workspace
and typing into a file that hasn't been "seen" by a full build yet. A targeted regression test:
open a file with valid syntax, immediately (before the initial build settles) type an invalid
token, and assert the diagnostic reflects the *edited* text, not the original file's.

### Pitfall 2: Reusing `recallLangiumDiagnostics`'s "should not happen" fallback as if it still can't happen

**What goes wrong:** `debouncedCompile()`'s comment on the `remembered === undefined` branch says
"Should not happen: `BBjDocumentValidator.validateDocument()` remembers a pre-hierarchy list
unconditionally before this callback can ever run" (`bbj-document-builder.ts:333-341`). Under D-04,
this is no longer an invariant — a verdict racing ahead of Langium's *first-ever* validation of a
document (the literal scenario RESP-01 targets) means `recallLangiumDiagnostics` legitimately
returns `undefined` because `validateDocument()` has never run for that document yet.

**Why it happens:** The comment was written when every path into `debouncedCompile()` went through
`buildDocuments()`, which always validates before scheduling BBjCPL. D-04 adds a new caller that
does not have that guarantee.

**How to avoid:** Update the comment/log-level for this branch to reflect that an
`undefined`-remembered-list is now an expected, common case during the D-04 window (not a bug
signal), and confirm the existing fallback — `document.diagnostics ?? []` — degrades correctly:
with nothing remembered, treating "no Langium diagnostics yet" as an empty list is exactly the
desired D-04 behavior (BBj's verdict shows up alone, nothing to reconcile against). Downgrade the
`logger.debug` call already there, or gate it so it doesn't fire on this now-expected path — but
do not remove the fallback itself, since it is still correct for the *actually* unexpected case
(a decoupling bug in `shouldValidate`/`shouldCompileWithBbjcpl`).

**Warning signs:** A debug log line ("No remembered pre-hierarchy diagnostics...") appearing on
every single cold-start verdict in a large workspace, drowning out the rare genuine occurrence
this log line was designed to catch.

### Pitfall 3: Assuming `notifyDocumentPhase(document, DocumentState.Validated, ...)` requires the document to actually be in that state

**What this is NOT a pitfall for, confirmed positively:** `notifyDocumentPhase` only invokes
registered `Validated`-phase listeners; it does not read or gate on `document.state` at all
(`document-builder.js:425-441`). The one listener that matters here,
`addDiagnosticsHandler`'s (`language-server.js:268-286`), simply does
`connection.sendDiagnostics({ uri, diagnostics: document.diagnostics })` if
`document.diagnostics` is set — no state check. This confirms the existing debounce callback's
`await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None)`
(`bbj-document-builder.ts:382`) is safe to call from the new event-armed path even when the
document's real `.state` is still `Changed`/`Parsed` (i.e., long before any `buildDocuments()` has
touched it) — no need to fabricate a fake "Validated" state or route through the builder at all
just to get the publish to fire. Documented here as a pitfall-to-avoid-worrying-about: don't spend
plan time trying to make `document.state` consistent before publishing; it is not required.

### Pitfall 4: `hasPendingWork()` looks like it needs new state, but likely doesn't

**What could go wrong if handled naively:** Assuming the event-armed cycle needs its own tracking
flag added to `hasPendingWork()` (`bbj-document-builder.ts:122-126`), duplicating
`hasPendingCompile()`'s existing `cplDebounceTimers.size > 0` check.

**Why it probably isn't needed:** If the new listener calls the *same* `debouncedCompile()`
(reusing its `cplDebounceTimers.set(key, timer)` bookkeeping — D-03 explicitly requires this: "The
event path and the rebuild path arm the same per-document debounce timer"), then
`hasPendingCompile()` already reports `true` for the whole lifetime of an event-armed cycle,
exactly like it does today for a rebuild-armed one. `hasPendingWork()`'s first clause
(`this.currentState < DocumentState.Validated`) is also unaffected — it already stays `true` for
the *entire* initial-build stall today, independent of this phase's change, since `currentState`
is a single builder-wide field the stalled `buildDocuments()` hasn't yet advanced.

**How to avoid over-building:** Verify with a test (extending `config-hot-reload-wiring.test.ts`'s
existing `hasPendingWork`/`hasPendingCompile` suite) that an event-armed cycle alone — with no
`buildDocuments()` call in flight — still makes `hasPendingCompile()` (and therefore
`hasPendingWork()`) report `true` while its timer is pending, *before* writing any new field. Only
add new state if that test fails.

### Pitfall 5: `example-files.test.ts` / synthetic regression files do not apply to scheduling changes

Unlike phases 98-101 (grammar/validator changes), this phase touches no `.bbj` grammar or
validation logic — `example-files.test.ts`'s zero-lexer/parser-error contract over
`test/test-data/` is unaffected and needs no new fixture files for this phase.

## Code Examples

### Existing debounce/publish cycle to reuse unchanged

```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:287-393 (read this session)
// debouncedCompile() already implements: live parse -> reconcile-or-fallback -> one publish,
// keyed per-document in `cplDebounceTimers`. The new event listener's only job is to *call* this
// (or a lightly-refactored variant taking explicit text/version — see Pitfall 1), not reimplement it.
private debouncedCompile(document: LangiumDocument): void {
    const key = document.uri.fsPath;
    const existing = this.cplDebounceTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => { /* ...live parse, reconcile, notifyDocumentPhase... */ }, BBjDocumentBuilder.SAVE_DEBOUNCE_MS);
    this.cplDebounceTimers.set(key, timer);
}
```

### Existing stale-guard idiom to mirror for D-07

```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:321,327 (read this session)
const versionBeforeRequest = document.textDocument.version;
let liveOutcome: LiveParseOutcome | undefined;
if (bbjParserService.isEnabled()) {
    liveOutcome = await bbjParserService.requestLiveParse(document);
}
if (liveOutcome?.kind === 'verdict' && document.textDocument.version === versionBeforeRequest) {
    // ...only reconcile if nothing changed the text while the request was in flight...
}
```

### Existing per-connection latch to mirror for a second connection's probe (D-09)

```typescript
// Source: bbj-vscode/src/language/bbj-parser-service.ts:174-230 (read this session)
// BBjParserService already latches on/off per javaInteropService.connectionGeneration and resets
// on a generation change, including clearing verdict state on a decided-to-undecided transition.
// A second connection reuses this exact class/shape — see Claude's Discretion item 2 for how the
// two connections' generations/latches should relate (constraint: a reset of EITHER clears
// verdict state, per Phase 102 D-06).
public isEnabled(): boolean {
    this.resetIfGenerationChanged();
    return this.mode !== 'off';
}
```

### Existing test-harness shape to extend for D-12(a)/(b)

```typescript
// Source: bbj-vscode/test/document-builder.test.ts:34-71 (read this session)
// buildHarness() constructs BBjDocumentBuilder directly with a mocked TextDocuments ({ get }).
// D-12(a)/(b) need this fake extended with onDidOpen/onDidChangeContent (Emitter-shaped) methods
// so the new listener under test can be exercised without a real LSP client, and combined with a
// real (or minimally faked) WorkspaceLock held open via an unresolved write() to stand in for a
// long initial build.
const fakeTextDocuments = {
    get: (uri: URI) => (openDocumentUris.has(uri.toString()) ? {} : undefined),
    // NEW for 105: onDidOpen, onDidChangeContent — Emitter-shaped, so the constructor's new
    // listener wiring can be exercised directly.
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Live-parse debounce armed only from inside `buildDocuments()` | Armed additionally from `TextDocuments.onDidChangeContent`/`onDidOpen`, independent of `WorkspaceLock` | This phase | Removes the initial-build stall for live diagnostics (RESP-01/02) |
| `parseProgram` shares one `MessageConnection` with bulk `getClassInfo` traffic | Dedicated `MessageConnection` for `parseProgram`, same host/port, with same-connection fallback | This phase | Removes the transport-level head-of-line blocking (RESP-04) |
| `bbj-ls`'s `ParserWorker` relied on per-factory UUID history to avoid a cross-connection stale-cache read | `ParserCacheGuard.disableSharedCache()` bypasses BBj's shared AST cache per-factory | `bbj-ls@9987bee`, 2026-09-22 (one day before this research session) | Makes D-09's dedicated second connection safe against a real, previously-existing hazard — see Live Server Evidence |

**Deprecated/outdated:** none within this repo's own code; the `bbj-ls` fix above supersedes the
pre-2026-09-22 assumption (still present in the locally-checked-out `develop@0a88cba`'s doc
comments) that a fresh `ParserWorker` factory on a new connection was safe by construction.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | IntelliJ's "port auto-detect" flows through the same `JavaInteropService.setConnectionConfig(host, port)` call as VS Code's configured setting, so a second connection needs no IntelliJ-specific wiring | Summary, D-09 discussion | If IntelliJ has its own separate path to configure the interop port, the dedicated connection might default to the wrong port on IntelliJ specifically; no `interopPort`/`interopHost` reference was found under `bbj-intellij/src` in this session's search, so this is inferred from the existing single-channel design in `bbj-ws-manager.ts`, not directly confirmed on the IntelliJ side |
| A2 | The deployed `/opt/bbx` jar's build provenance (built from `bbj-ls@develop` past `9987bee`, not from a tagged release) means its behavior is representative of what a near-future BBj 26.03 release *will* ship once `9987bee` is backported, not necessarily of what already-released 26.03 builds ship today | Live Server Evidence | If a customer's already-installed BBj 26.03 predates the backport, D-09's dedicated connection could hit the stale-cache hazard on its first parse of a canonical name another connection already touched; this is called out explicitly as a residual risk, not swept under a passing local measurement |
| A3 | `bbj-ls`'s lsp4j `Launcher`, built with `.setExecutorService(EXECUTOR)` (a shared cached thread pool across all connections), dispatches each connection's incoming request handling without head-of-line blocking across connections at the JVM thread-pool level | Live Server Evidence, Pattern 4 | If `Executors.newCachedThreadPool()` were somehow saturated/bounded in a given deployment, a burst of `getClassInfo` work could still transiently delay dispatch of a `parseProgram` request even on its own connection's read stream having already delivered the bytes; not verified by a live concurrency probe in this session (no BBj instance was driven under load) |

## Open Questions (RESOLVED)

1. **Where exactly should the "Langium's latest pre-hierarchy list + its text version" be tracked
   (Claude's Discretion item 3)?**
   - What we know: `rememberLangiumDiagnostics`/`recallLangiumDiagnostics` already store the list
     per-document in a `WeakMap` (`bbj-diagnostic-reconciliation.ts:239-249`); `debouncedCompile()`
     already captures `document.textDocument.version` locally for its own stale-guard.
   - What's unclear: whether to extend the existing `WeakMap`'s value to `{ diagnostics, version }`
     (touches `rememberLangiumDiagnostics`'s one call site in `bbj-document-validator.ts:235` and
     every reader) or add a parallel `Map<string /* uri */, number /* version */>` keyed like
     `verdictStateByUri` already is.
   - Recommendation: extend the `WeakMap`'s value shape — it is already keyed by the exact
     `LangiumDocument` object identity (correctly scoped to one open/close lifecycle per the
     existing doc comment), and a parallel map would duplicate that lifecycle management for no
     benefit.

2. **Does the second `MessageConnection` need its own breaker state, or should it share
   `JavaInteropService`'s existing breaker fields?**
   - What we know: D-10's fallback requires the dedicated connection's *failure to open* to fall
     back to the shared connection, logged once, without touching the parse-failure latch or the
     breaker semantics that already exist for the main connection.
   - What's unclear: whether a failed dedicated-connection attempt should independently back off
     (its own breaker) or simply retry-then-fallback every time, given D-10 doesn't ask for a
     backoff schedule on the second connection specifically.
   - Recommendation: give the second connection its own minimal state (attempted-this-generation
     flag + last-failure reason for the one log line), not a full second breaker/backoff clone —
     D-10's "falls back... this is logged once" reads as simpler than the main connection's
     multi-state breaker, and over-building it risks its own bugs for a path that, by design,
     degrades to "no worse than today."

3. **Should the dedicated connection be opened eagerly (at startup) or lazily (on first
   `parseProgram` call)?**
   - What we know: the main connection is opened lazily via `connect()`'s "if already connected,
     return it" guard; nothing in this repo eagerly opens a connection at server startup today.
   - What's unclear: whether opening the dedicated connection eagerly (in parallel with the main
     one, during `initializeWorkspace`) would shave the *first* live-parse's latency, versus
     lazily on the first `debouncedCompile()` call needing it.
   - Recommendation: match the existing lazy pattern (`connect()`'s existing shape) for consistency
     and to avoid adding a new startup-sequencing concern to `bbj-ws-manager.ts`; the D-11
     measurement will show whether first-parse latency on a cold dedicated connection is material
     enough to revisit.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| BBjServices with `bbj-ls`'s `parseProgram` endpoint (Phase 101+) | D-09 dedicated connection, D-11 measurement | ✓ | `/opt/bbx` jar, built past `bbj-ls@9987bee` (2026-09-22) — newer than local `develop@0a88cba` checkout `[VERIFIED: unzip -l + javap -p -c this session]` | D-10: same-connection fallback if the second connection can't be opened |
| `bbj-ls` sibling repo (read-only source access) | D-09 research | ✓ | local `develop@0a88cba`; `origin/develop` fetched to `9987bee` this session | — |
| `bbj-corpus` (private) opened as a workspace | D-11 measurement | Not verified in this session (no attempt made to open it — out of scope for research; planner/executor confirms at measurement time) | — | None named in CONTEXT.md; D-11 is a locked requirement, not discretionary |
| vitest 4.1.10 | D-12 automated guards | ✓ | `bbj-vscode/package.json:706,714` `[VERIFIED]` | — |

**Missing dependencies with no fallback:** none identified — the one dependency this phase's
correctness rests on (the `bbj-ls` cache-isolation fix) is already present in this environment's
`/opt/bbx` jar; its absence on a customer's `release/26.03` build is a shipping-coordination risk
(Assumption A2), not a blocker for planning or executing this phase in this environment.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 `[VERIFIED: bbj-vscode/package.json]` |
| Config file | `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/document-builder.test.ts test/bbj-parser-service.test.ts test/bbj-diagnostic-reconciliation.test.ts test/config-hot-reload-wiring.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (or `npm test`); use `--maxWorkers=2` if hook timeouts appear (per MEMORY.md's contention note) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESP-01/02 | A held `WorkspaceLock` write (standing in for a long initial build) does not block the event-armed cycle from firing and publishing | unit (D-12a) | `npx vitest run test/document-builder.test.ts -t "workspace lock"` | ❌ Wave 0 — new test, extending `buildHarness()` per Code Examples |
| RESP-03 | Langium validation and a live-parse verdict for the same document, finishing in either order and across text versions, never lose/double/misattribute a diagnostic | unit (D-12b) | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts -t "interleav"` | ❌ Wave 0 — new interleaving test suite |
| RESP-04 | `parseProgram` uses a connection independent of `getClassInfo` traffic; falls back on failure | unit | `npx vitest run test/java-interop-service.test.ts -t "dedicated"` (or a new `bbj-parser-connection.test.ts`) | ❌ Wave 0 — new test |
| RESP-01 (open-during-build) | `onDidOpen` on a document whose `shouldCompileWithBbjcpl` gate passes arms the cycle even before any `buildDocuments()` call for it | unit | `npx vitest run test/document-builder.test.ts -t "onDidOpen"` | ❌ Wave 0 — new test |
| RESP-05 | Corpus measurement recorded | manual-only (justified: requires the private `bbj-corpus`, real BBjServices, and both real IDEs — D-11 explicitly specifies a hand runbook with log-timestamp evidence, matching the Phase 102 precedent of a documented runbook rather than a simulated observation) | — | `105-MEASUREMENT.md` (Wave 0/3 deliverable, not a test file) |

### Sampling Rate

- **Per task commit:** the quick run command above (the four directly-touched test files)
- **Per wave merge:** full suite (`npx vitest run`), judged on `numFailedTests: 0` per the
  project's standing whole-suite gate substitution (STATE.md)
- **Phase gate:** full suite green before `/gsd-verify-work`, plus the D-11 hand-verification
  runbook in both IDEs (mirroring the Phase 102 precedent of a documented runbook when the
  executor cannot see a running IDE)

### Wave 0 Gaps

- [ ] `test/document-builder.test.ts` — extend `buildHarness()`'s fake `TextDocuments` with
  `onDidOpen`/`onDidChangeContent` (Emitter-shaped test doubles), covering RESP-01/02
- [ ] `test/bbj-diagnostic-reconciliation.test.ts` (or a new file) — interleaving tests for D-07,
  covering RESP-03
- [ ] A new or extended test file for the dedicated `MessageConnection` + D-10 fallback, covering
  RESP-04 — `java-interop-service.test.ts` already exists and is the natural home
- [ ] `105-MEASUREMENT.md` — not a test file, but a required Wave-3-ish deliverable per D-13;
  flag it in the plan's final wave alongside the PR

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase touches no authentication surface |
| V3 Session Management | No | No session/cookie handling involved |
| V4 Access Control | No | No new access-controlled resource introduced |
| V5 Input Validation | No — unchanged | `parseProgram`'s request shape and validation (`ParserWorker.checkRequired`/`checkSize`) is unchanged by this phase; the dedicated connection sends the same `ParseProgramParams` DTO |
| V6 Cryptography | No | No new secret, token, or credential is introduced; the second connection uses the same plaintext localhost TCP socket the existing interop connection already uses (unchanged trust boundary — both are `127.0.0.1`-scoped per `java-interop.ts:168` and `bbj-ls`'s `DEFAULT_LISTEN`) |
| V13 (API/Malicious Input) | Marginal | The new second connection is another TCP client of the same local `bbj-ls` socket; it inherits whatever trust boundary the existing connection already has (loopback-only by default, per `LanguageService.java:39`) — no new attack surface is opened, but a second open socket is a second file descriptor the server must track through disconnect/reconnect (relevant to D-06/D-10's "reset clears verdict state" requirement, which is a correctness concern, not a security one) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A dropped/reset dedicated connection silently leaves stale verdict state visible in the editor | Tampering (of diagnostic integrity, not a security exploit) | D-06's constraint — "a reset of either connection clears verdict state, as in Phase 102 D-06" — already locked; implement via the same `resetIfGenerationChanged()`/`clearAllVerdictStates()` pattern `BBjParserService` already uses |
| A malicious/misbehaving `bbj-ls` peer sending oversized or malformed `parseProgram` results down the dedicated connection | Denial of Service | Unchanged from the existing connection: `parseErrorsToDiagnostics`'s `maxErrors` cap and `parseErrorToRange`'s clamping (`bbj-parser-service.ts:43-81`) already bound what a malformed/adversarial result can do to the editor; this phase reuses that unmodified logic for the second connection's results too |
| Two open sockets to the same loopback service increase the local resource footprint an unprivileged local process could exhaust | Denial of Service (local, low severity — `bbj-ls` is loopback-bound by default) | No new mitigation needed beyond what already exists; `bbj-ls` binds to `127.0.0.1` by default (`LanguageService.java:39`), matching the existing single-connection trust model — doubling the connection count from one client process does not meaningfully change the threat model |

No new ASVS category is triggered by this phase; it is a scheduling/transport refactor of an
already-reviewed feature (Phase 102/103 threat coverage applies unchanged to the reconciliation
logic this phase reuses).

## Sources

### Primary (HIGH confidence)
- `bbj-vscode/node_modules/langium/lib/workspace/workspace-lock.js`, `workspace-manager.js`,
  `document-builder.js`, `documents.js` — read in full this session
- `bbj-vscode/node_modules/langium/lib/lsp/document-update-handler.js`,
  `normalized-text-documents.js`, `language-server.js` — read this session
- `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-diagnostic-reconciliation.ts`,
  `bbj-parser-service.ts`, `java-interop.ts`, `bbj-document-validator.ts`, `bbj-ws-manager.ts` —
  read in full this session
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java`,
  `InteropService.java`, `ParserWorker.java` — read this session (read-only, sibling repo)
- `git -C /home/coder/repos/bbj-ls show 9987bee` — read this session (the `ParserCacheGuard` fix)
- `/opt/bbx/.lib/bbjls/bbj-ls.jar` — inspected via `unzip -l` and `javap -p -c` this session
  (read-only)
- `bbj-vscode/test/document-builder.test.ts`, `config-hot-reload-wiring.test.ts`,
  `bbj-test-module.ts`, `cpl-integration.test.ts` — read this session for existing test patterns

### Secondary (MEDIUM confidence)
- `.planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-RESEARCH.md`
  and `103-one-set-of-errors-diagnostic-reconciliation/103-RESEARCH.md` — referenced for this
  repo's established RESEARCH.md structure and prior-phase decisions this phase builds on

### Tertiary (LOW confidence)
- Assumption A1 (IntelliJ port-configuration channel) — no direct IntelliJ-side source was found
  confirming the single-channel assumption; flagged in the Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack / architecture (client-side scheduling fix): HIGH — root cause and fix mechanism
  both confirmed by reading the exact Langium source lines responsible
- D-09 server-side safety: HIGH — confirmed via sibling-repo source, a fetched upstream commit,
  and bytecode inspection of the actually-deployed jar; the one residual risk (release-branch
  version skew) is explicitly flagged, not hidden
- Text-freshness hazard (Pitfall 1): HIGH — confirmed by reading `documents.js`'s exact
  getter/rebind mechanics; this is the least "obvious from the task description" finding and the
  one most likely to cause a subtle bug if the planner doesn't carry it into the plan
- Pitfalls 3/4 (things that are NOT problems): HIGH — confirmed by reading the exact glue code
  that could have made them problems and finding it doesn't gate on the states in question
- IntelliJ-side specifics (A1): LOW — not directly verified this session

**Research date:** 2026-09-23
**Valid until:** ~30 days (stable internal architecture; the one time-sensitive fact —
`bbj-ls@9987bee`'s presence on `release/26.03` — should be re-checked at plan-execution time,
since it is explicitly a moving target as of this research)
