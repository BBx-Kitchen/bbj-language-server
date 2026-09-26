# Phase 106: On-Save Compiler Check in Both IDEs - Research

**Researched:** 2026-09-24
**Domain:** LSP text-document synchronization (didSave capability gating), Langium document-builder debounce scheduling, diagnostic reconciliation across text versions, JSON-RPC connection lifecycle (java-interop breaker/lane)
**Confidence:** HIGH for the mechanical/wiring findings (all read from source this session); MEDIUM for the diagnostic-reconciliation redesign needed for D-01/D-04 (no existing code does this yet — it is new design, not verified against an implementation)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Old compiler errors while typing under on-save (TRIG-04)**
- **D-01:** A compiler error from the last check stays until the next save replaces it, even when
  the user edits or fixes its line. It follows its line through inserts and deletes above it and
  is dropped only when its line is deleted. This applies to errors from either source (`BBj Parser`
  verdict or bbjcpl fallback). The Phase 105 "latest text version wins" stale guard (105 D-07, the
  `versionBeforeRequest` check in `debouncedCompile()`) must therefore not throw away an on-save
  verdict just because the text moved on after the save. Under `debounced` that guard is unchanged.
- **D-02:** Langium syntax complaints on text the last check never saw show as errors (lines typed
  or changed since the save), as 103 D-04/D-08 already do before a verdict. Under on-save, Langium
  is the only thing checking new code between saves.
- **D-03:** The 103 D-08 carry-over lasts until the next save. A Langium complaint the last verdict
  downgraded to warning, or replaced with BBj's error on an overlapping line, keeps that treatment
  while the user types, matched by message and line text as today. It is no longer limited to the
  ~500 ms gap it was built for.
- **D-04:** On an edited line that keeps the last save's BBj error, a new Langium complaint about
  the new text shows as well (both are visible). 103 D-09's give-way rule covers only complaints
  the verdict actually saw (matched by line text), not complaints on the same line position about
  text BBj never checked.

**What starts a check under on-save (TRIG-01/02/03)**
- **D-05:** Every save runs one check, even when the text is unchanged since the last check.
  Ctrl+S is the user's way to say "check now".
- **D-06:** Under on-save, only opening and saving the file itself start a check. A rebuild of an
  open document for any other reason (another file saved, a relink, a `config.bbx` change) reruns
  Langium only, and the last verdict stays. This departs from 105 D-03 for on-save only. Under
  `debounced` the rebuild-driven trigger is unchanged. Opening a file during the startup build
  still checks it early (105 D-02). The open gate (`shouldCompileWithBbjcpl`) still applies.
- **D-07:** Auto-saves count as saves. `didSave` carries no reason, so VS Code's `files.autoSave:
  afterDelay` makes on-save behave close to debounced. The docs say so in one line. The server does
  not try to detect or skip auto-saves.
- **D-08:** Switching modes at runtime keeps each open file's current results. Switching to on-save
  keeps the current compiler errors until the file's next save. Switching to debounced lets the
  next edit start a check as usual. Switching to off clears them as today (`runBbjcplForDocuments`'
  off branch). There is no burst of checks when the mode changes.

**bbjcpl fallback dedup (DIAG-01)**
- **D-09:** When bbjcpl stands in for the live parse, a Langium syntax complaint gives way only
  when its line span overlaps a bbjcpl error's line span, the same overlap rule the live path uses
  (103 D-10). "Syntax complaint" means what it means in 103 D-04: lexer errors, parser errors and
  the line-break validator's diagnostics. Langium complaints on other lines stay errors, with no
  downgrade. 103 D-03 ("a fallback bbjcpl result is not a verdict") holds for everything else.
  Rule 0 as written in `applyDiagnosticHierarchy` (any BBjCPL error hides every parse error in the
  file) is NOT what gets switched on.
- **D-10:** On an overlapping line, bbjcpl's own diagnostic shows, with its own text and source
  `BBjCPL`, just as the live path shows BBj's text (103 D-09). This replaces `mergeDiagnostics`'
  current same-start-line relabel, which keeps Langium's message and only changes the source.
  Langium's semantic and validator errors on that line stay (103 D-09).
- **D-11:** The dedup applies only when the text bbjcpl checked equals the editor text. That is
  always true right after a save, so on-save is always covered. Under debounced with unsaved
  edits, bbjcpl (which reads the file on disk) is merged as today with no suppression, so a line
  number from a stale check can never hide a real error.

**IntelliJ setting and docs (TRIG-06/07)**
- **D-12:** IntelliJ delivers the trigger through `initializationOptions`, with the key the server
  already reads for VS Code (`compilerTrigger` in `bbj-ws-manager.ts`). A change takes effect
  through the debounced language-server restart that every settings Apply already schedules
  (`BbjSettingsConfigurable.apply()` → `BbjServerService.scheduleRestart()`). There is no live
  `didChangeConfiguration` path for IntelliJ, for the reason #571 found: LSP4IJ's settings
  resolution returns null for this plugin's flat settings.
- **D-13:** The IntelliJ UI is a "Compiler check:" dropdown (Debounced / On save / Off) under the
  existing "BBj Compiler" separator, next to "Compile output directory". A one-line hint below it
  recommends On save for large workspaces. Default: Debounced.
- **D-14:** The docs and the VS Code setting description replace the "set off if completion is
  slow" advice with a recommendation of on-save for large workspaces. `off` is described plainly
  (no compiler checks at all), not as a slowness workaround. The auto-save interplay (D-07) gets
  one line. The IntelliJ doc's "no IntelliJ equivalent" paragraph goes. The `on-save`
  enumDescription ("currently behaves the same as debounced") is rewritten to match the behaviour.

### Claude's Discretion
- How the server learns of saves: check whether both clients send `textDocument/didSave` today
  (VS Code via vscode-languageclient, IntelliJ via LSP4IJ) and whether the server advertises `save`
  in its text-document sync capability. Wire it wherever fits (a `TextDocuments.onDidSave` listener
  next to 105's event arming, or similar). The constraint from 105 still holds: arming a check must
  not wait on `workspaceLock`.
- How a "kept" verdict is stored and re-placed on shifted lines (D-01). Options include per-line
  text anchors like 103 D-08, or mapping through content changes. It must stay a pure,
  unit-testable function in the style of `bbj-diagnostic-reconciliation.ts`.
- How to tell "the checked text equals the editor text" for D-11 (compare the text read for compile
  with `textDocument.getText()`, or track the saved version).
- What happens to a check still in flight when the next save arrives: a newer save supersedes it,
  and the result for the older save must not overwrite the newer one.
- JINT-03 mechanics: let the dedicated lane (`openParseLane`) connect on its own, independent of
  the shared connection's breaker state, falling back to the shared connection only when the lane
  cannot be opened (105 D-10, logged once). Keep the constraint from 105: a reset of either
  connection clears verdict state, and the latch still reflects whether the endpoint exists.
- `hasPendingWork()` / `hasPendingCompile()` semantics under on-save (#486 config-reload
  quiescence).
- Plan split. The obvious default: (1) server on-save scheduling (save/open arming, no rebuild or
  typing triggers, kept verdict across edits) with vitest guards using the scriptable `parseProgram`
  double; (2) DIAG-01 dedup on the bbjcpl fallback path; (3) JINT-03 lane independence, with a test
  in `test/java-interop-parse-lane.test.ts` where the shared breaker is open or half-open and the
  lane still answers; (4) the IntelliJ setting and init option, the VS Code description, both
  feature docs; (5) hand UAT in both IDEs from freshly built VSIX and IntelliJ zip, and the
  criterion-5 timing re-check of a few Phase 105 "after" samples on the real large workspace
  (numbers and environment notes only, no corpus names, as in 105 D-11).

### Folded Todos
- "Live parse still waits on the shared interop connection (and its circuit breaker) before using
  its own" (`.planning/todos/pending/2026-09-23-live-parse-waits-on-shared-connection-breaker.md`,
  from 105-REVIEW.md WR-01). This todo is JINT-03 itself: `parseProgram()` awaits the shared
  `connect()` and its breaker before trying the dedicated lane. It was deferred from 105 because
  fixing it changes the transport the timings were measured through. Criterion 5's re-check covers
  that.

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within the phase's scope.

**Reviewed Todos (not folded):**
- "linking.test.ts Interop related tests fail even after a targeted class warm-up": this is env
  drift in tests, not phase scope.
- "A lost language-server connection is invisible to the plugin's crash detection" and "The server
  status log line prints a stale previous status": Phase 108 (LIFE-01/02).
- "Phase 97 code-review follow-ups": future requirements, not in the v4.6 roadmap.
- "Loosen single-line IF balance rule" and "checkUseBeforeAssignment throws on a reference without
  a symbol": Phase 107 (VAL-01/02).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRIG-01 | With `bbj.compiler.trigger` set to `on-save`, typing starts no live parse and no bbjcpl run; the language server's own validation keeps running | Pitfall 1 (prerequisite: server must receive `didSave` at all), Pattern 2/Pitfall 3 (discriminate open vs. typing), Pitfall 4 (rebuild-driven trigger must also be gated) |
| TRIG-02 | With `on-save`, saving runs exactly one compiler check of the saved text, without debounce — live parse first, bbjcpl when unavailable — in both IDEs | Pattern 3 (no-debounce save path, `hasPendingCompile()` semantics), Pitfall 1 (both clients must actually send `didSave`) |
| TRIG-03 | With `on-save`, opening a file runs one check, showing errors before the first save | Pattern 2/Pitfall 3 (the open-vs-typing discriminator) |
| TRIG-04 | With `on-save`, the last check's errors stay visible while typing until the next save; not dropped or misplaced by reconciliation | Pitfall 2 (the core gap: `composeWithVerdict()` does not do this today), Open Question 1 |
| TRIG-05 | `debounced` (default) and `off` behave exactly as before | Pattern 2-4 (every new branch is scoped to `on-save` only, existing paths untouched) |
| TRIG-06 | IntelliJ users can choose `debounced`/`on-save`/`off`, applied from startup and after a change | Pattern 1 in "Architecture Patterns" is server-side; the IntelliJ-side pattern is `BbjSettings.java`/`BbjSettingsComponent.java`/`BbjSettingsConfigurable.java`/`CompilerInitOptions.java`/`BbjLanguageServerFactory.java`, all read this session and confirmed to have NO `compilerTrigger` wiring today despite a doc comment implying it exists |
| TRIG-07 | VS Code setting description and both feature docs describe the three modes as implemented, recommending `on-save` for large workspaces | Exact current doc text captured (State of the Art, "Deprecated/outdated") with file:line locations for `package.json`, `vscode/features.md`, `intellij/features.md` |
| DIAG-01 | Redundant Langium parse error suppressed when bbjcpl stands in for the live parse | Pattern 4 (line-span-overlap dedup, exact fix site in `debouncedCompile()`'s bbjcpl branch and `mergeDiagnostics()`), Code Examples (`applyDiagnosticHierarchy`'s Rule 0 — confirmed NOT the mechanism to reuse) |
| JINT-03 | The live parse no longer waits on the shared interop connection or its circuit breaker | Pattern 5 (exact bug location and fix, `java-interop.ts:492-510`), Code Examples (fake-peer test harness already supports the needed scenario) |
</phase_requirements>

## Summary

This phase has two very different halves. TRIG-05..07, DIAG-01 and JINT-03 are narrow, well-bounded
changes to code that already exists and already has test scaffolding. TRIG-01..04 are not: they
require the language server to **receive `textDocument/didSave` at all** (it currently does not,
in either IDE — see Pitfall 1), and they require the diagnostic-reconciliation module to keep
showing a compiler error on an edited-but-not-yet-saved line, which the existing
`composeWithVerdict()` deliberately does *not* do once the live text's version has moved past the
verdict's own version (see Pitfall 2). Both of these are load-bearing findings this research
session confirmed by reading the actual source, not assumptions from the phase description.

The good news: every other piece the phase needs already exists as a working, tested pattern.
`getCompilerTrigger()`/`setCompilerTrigger()` already models the three-way enum end to end (VS
Code init options, IntelliJ's flat init-options channel is the documented pattern to extend,
`didChangeConfiguration`). `BBjDocumentBuilder`'s constructor already subscribes to
`TextDocuments.onDidOpen`/`onDidChangeContent` directly (bypassing the workspace lock) — adding a
third `onDidSave` subscription is the same shape. `java-interop.ts`'s dedicated parse lane
(`openParseLane`/`parseLaneConnection`) already exists and already falls back to the shared
connection; JINT-03 is a two-line reordering of `parseProgram()`, not new plumbing. The scriptable
`parseProgram` test double (`JavaInteropTestService`) and the fake-peer breaker/lane harness
(`fake-interop-peer.ts`) already support every scenario this phase's tests need, with zero
changes.

**Primary recommendation:** Split the plan exactly as CONTEXT.md's discretion note suggests, but
put the `didSave`-capability wiring (Pitfall 1) as the *first* task of plan 1 — every other TRIG
task is unreachable without it — and budget real design time for the kept-verdict/line-tracking
composition (Pitfall 2) as its own task, since no existing function in this codebase does
"redisplay a diagnostic on a line that has since shifted, across an arbitrary number of edits."

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Advertise `save` in `textDocumentSync` / receive `didSave` | Language Server (Node/Langium, `bbj-module.ts` DI) | VS Code Client, IntelliJ Client | The server's `DocumentUpdateHandler.didSaveDocument` presence is what both clients gate their own `didSave` sending on (Pitfall 1) — this is a server-side capability decision, but both clients must be re-verified once it flips on |
| Suppress typing-triggered checks under `on-save` | Language Server (`bbj-document-builder.ts`) | — | `armLiveParseFromEvent`/`runBbjcplForDocuments` are the only two call sites that ever start a cycle |
| Kept verdict surviving edits until next save (TRIG-04/D-01..D-04) | Language Server (`bbj-diagnostic-reconciliation.ts`) | Language Server (`bbj-document-validator.ts`, the `validateDocument()` call site) | Pure, unit-testable composition module by existing convention; the validator only wires it in |
| Save-triggered immediate (non-debounced) check | Language Server (`bbj-document-builder.ts`) | — | Same debounce-timer machinery, a new zero-delay path |
| Dedicated parse-lane independence from the shared breaker (JINT-03) | Language Server (`java-interop.ts`) | Java Interop Backend (`bbj-ls`, port 5008) — unchanged, already exists | Pure reordering of an existing method; no protocol change, so no `bbj-ls` work |
| bbjcpl fallback dedup (DIAG-01) | Language Server (`bbj-document-builder.ts` bbjcpl-fallback branch, `bbj-document-validator.ts` `mergeDiagnostics`) | — | Same line-span-overlap idiom the live-parse path already uses in `bbj-diagnostic-reconciliation.ts` |
| IntelliJ trigger setting (TRIG-06) | IntelliJ Client (`BbjSettings.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`, `BbjLanguageServerFactory.java`) | — | Exactly the `compilerOutputDirectory`/`CompilerInitOptions` pattern (#571), which already exists to copy |
| VS Code setting description + both feature docs (TRIG-07) | VS Code Client (`package.json`) / Docs | — | Content-only change, no runtime behavior |

## Standard Stack

No new external dependency is introduced by this phase. The relevant existing stack, versions
verified by reading `bbj-vscode/package.json` and `bbj-intellij/build.gradle.kts` this session:

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `langium` | `~4.3.1` | Document builder/validator base classes, `TextDocuments`/`NormalizedTextDocuments`, `DocumentUpdateHandler`, `startLanguageServer` | `[VERIFIED: bbj-vscode/package.json:701]` |
| `vscode-languageclient` | `^10.1.0` | VS Code's LSP client; its `DidSaveTextDocumentFeature` is what gates whether `didSave` is ever sent (Pitfall 1) | `[VERIFIED: bbj-vscode/package.json:705]` |
| `vitest` | `^4.1.10` | Test runner for every scenario this phase needs (fake timers, fake-peer sockets) | `[VERIFIED: bbj-vscode/package.json:719]` |
| `com.redhat.devtools.lsp4ij` (IntelliJ plugin) | `0.21.0` | IntelliJ's generic LSP client; per the DeepWiki reference for LSP4IJ's `DocumentContentSynchronizer`, it also gates `didSave` on the server's advertised `save` capability (Pitfall 1, IntelliJ side) | `[VERIFIED: bbj-intellij/build.gradle.kts:34]` version; `[CITED: deepwiki.com/redhat-developer/lsp4ij/4.3-file-synchronization-and-events]` behavior |

### Alternatives Considered

Not applicable — this phase changes existing code paths, it does not introduce a new library
class (e.g. no new debounce library, no new file-watcher). Hand-rolling the debounce/reconciliation
logic is the established pattern in this codebase already (see Don't Hand-Roll below for the one
exception: do not hand-roll a generic "diff-based line tracker" without first checking whether a
simpler per-line-text-anchor approach, matching 103 D-08's existing idiom, is sufficient).

**Installation:** none required.

## Package Legitimacy Audit

Not applicable. This phase installs no new npm, PyPI, or Gradle/Maven dependency. Every library
referenced above is already present in the repository's lockfiles.

## Architecture Patterns

### System Architecture Diagram

```
 VS Code                                   IntelliJ
 ┌────────────────────┐                    ┌──────────────────────┐
 │ vscode-languageclient│                   │ LSP4IJ 0.21.0         │
 │ DidSaveTextDocument  │                   │ DocumentContent       │
 │ Feature.initialize() │                   │ Synchronizer          │
 │  reads server's       │                  │  reads server's        │
 │  textDocumentSync.save │                 │  textDocumentSync.save │
 └─────────┬────────────┘                   └──────────┬────────────┘
           │ sends didSave ONLY if save===true                      │
           ▼                                                        ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │  Language Server (main.ts: startLanguageServer(shared))              │
 │                                                                      │
 │  buildInitializeResult(): textDocumentSync.save =                    │
 │     Boolean(services.lsp.DocumentUpdateHandler.didSaveDocument)      │
 │     ── currently FALSE: no override exists (Pitfall 1)               │
 │                                                                      │
 │  TextDocuments (NormalizedTextDocuments)                             │
 │   ├─ onDidOpen ──────┐                                               │
 │   ├─ onDidChangeContent ─┐  (BBjDocumentBuilder ctor, already wired) │
 │   └─ onDidSave ───────────┼─ NOT wired anywhere today (Pitfall 1)    │
 │                            ▼                                        │
 │              armLiveParseFromEvent(textDocument)                    │
 │               ├─ off ⇒ return                                       │
 │               ├─ debounced/on-save today: identical — both arm      │
 │               │   the same 500ms cplDebounceTimers entry via        │
 │               │   debouncedCompile()                                │
 │               └─ NEEDS: on-save must suppress the                   │
 │                   onDidChangeContent-sourced arm (typing) while     │
 │                   keeping the onDidOpen-sourced arm, and a new      │
 │                   onDidSave-sourced arm must run with NO debounce   │
 │                                                                      │
 │  buildDocuments() → runBbjcplForDocuments() (rebuild-driven trigger) │
 │   also calls debouncedCompile() for every eligible open document    │
 │   on EVERY rebuild (relink, config.bbx change, another file's save) │
 │   ── NEEDS: must no-op under on-save (105 D-03 exception, D-06)     │
 │                                                                      │
 │  debouncedCompile() → BBjParserService.requestLiveParse()            │
 │   → JavaInteropService.parseProgram()                                │
 │      TODAY: await this.connect() [shared, breaker-gated] THEN       │
 │             await this.parseLaneConnection()  ── JINT-03 bug:       │
 │             an open/half-open shared breaker throws before the      │
 │             dedicated lane is ever tried (java-interop.ts:492-496)  │
 │                                                                      │
 │  composeWithVerdict() (bbj-diagnostic-reconciliation.ts)             │
 │   isVerdictForVersion(verdict, liveVersion) === false                │
 │     (true for every keystroke after the verdict's own save)         │
 │     ⇒ applyVerdictCarryOver() only — the verdict's OWN diagnostics  │
 │       are dropped, not carried forward (Pitfall 2) — this is the    │
 │       exact gap TRIG-04/D-01..D-04 must close                       │
 └──────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
              Java Interop Backend (bbj-ls, :5008)
              parseProgram endpoint — unchanged by this phase
```

### Recommended Project Structure

No new files/folders. Extend in place:

```
bbj-vscode/src/language/
├── bbj-document-builder.ts       # arming logic split by trigger mode + save reason
├── bbj-diagnostic-reconciliation.ts  # new kept-verdict composition for on-save
├── bbj-document-validator.ts     # wires the new composition in when trigger === 'on-save'
├── java-interop.ts               # parseProgram() lane-first reorder (JINT-03)
└── bbj-module.ts                 # DocumentUpdateHandler override (Pitfall 1) — new small class
                                   #   likely lives in bbj-document-builder.ts or a new
                                   #   bbj-document-update-handler.ts sibling
bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── BbjSettings.java              # + compilerTrigger field
├── BbjSettingsComponent.java     # + "Compiler check:" ComboBox row
├── BbjSettingsConfigurable.java  # + isModified/apply/reset wiring
└── lsp/
    ├── CompilerInitOptions.java  # + COMPILER_TRIGGER_KEY (or a sibling class)
    └── BbjLanguageServerFactory.java  # + options.addProperty(..., state.compilerTrigger)
```

### Pattern 1: Server-side save-capability wiring (new — Pitfall 1)

**What:** Override `services.lsp.DocumentUpdateHandler` so it exposes a `didSaveDocument` method.
Langium's own `addDocumentUpdateHandler()` (called from inside `startLanguageServer()`) checks
`handler.didSaveDocument` and, only if present, subscribes `documents.onDidSave(...)` to it —
*and* `buildInitializeResult()` reads that same presence to decide whether `textDocumentSync.save`
is advertised as `true` at all.

**When to use:** Exactly once, to unblock every other TRIG-0x task — without this, `onDidSave`
never fires no matter what listens on it, because neither client ever sends the notification.

**Example (from Langium's own source, confirming the exact gate):**
```typescript
// Source: bbj-vscode/node_modules/langium/src/lsp/language-server.ts:142-148
textDocumentSync: {
    change: TextDocumentSyncKind.Incremental,
    openClose: true,
    save: Boolean(documentUpdateHandler.didSaveDocument),
    willSave: Boolean(documentUpdateHandler.willSaveDocument),
    willSaveWaitUntil: Boolean(documentUpdateHandler.willSaveDocumentWaitUntil)
},
```
```typescript
// Source: bbj-vscode/node_modules/langium/src/lsp/language-server.ts:319-333
export function addDocumentUpdateHandler(connection: Connection, services: LangiumSharedServices): void {
    const handler = services.lsp.DocumentUpdateHandler;
    const documents = services.workspace.TextDocuments;
    if (handler.didOpenDocument) {
        documents.onDidOpen(change => handler.didOpenDocument!(change));
    }
    if (handler.didChangeContent) {
        documents.onDidChangeContent(change => handler.didChangeContent!(change));
    }
    if (handler.didCloseDocument) {
        documents.onDidClose(change => handler.didCloseDocument!(change));
    }
    if (handler.didSaveDocument) {
        documents.onDidSave(change => handler.didSaveDocument!(change));
    }
    // ...
}
```
`main.ts:82` calls plain `startLanguageServer(shared)` with no `DocumentUpdateHandler` override
registered anywhere in `bbj-module.ts` `[VERIFIED: bbj-vscode/src/language/main.ts:82; grep for "DocumentUpdateHandler" and "didSaveDocument" in bbj-vscode/src/language/bbj-module.ts returned no matches]`. `DefaultDocumentUpdateHandler` (Langium's own base class) implements
`didOpenDocument`/`didChangeContent`/`didChangeWatchedFiles` but never `didSaveDocument`
`[VERIFIED: bbj-vscode/node_modules/langium/src/lsp/document-update-handler.ts:75-146]` — so today
`save` is advertised `false`, and neither client is ever asked to send `didSave` for a BBj file.

The fix does **not** have to route the actual on-save logic through `DocumentUpdateHandler`
itself — it only has to exist so the capability flips on. `BBjDocumentBuilder`'s own constructor
can still be the place that reacts to the save (Pattern 2), exactly as it already does for
`onDidOpen`/`onDidChangeContent`, since `services.workspace.TextDocuments.onDidSave` is a public
event on the same `TextDocuments` interface those two already use
`[VERIFIED: bbj-vscode/node_modules/langium/src/lsp/normalized-text-documents.ts:39-70]` (the
`onDidSave: Event<TextDocumentChangeEvent<T>>` member). A trivial `didSaveDocument` no-op on a
`DocumentUpdateHandler` override is enough to flip the capability; the real logic can live
entirely in `BBjDocumentBuilder`.

### Pattern 2: Event-driven arming, extended for save (existing pattern, extend don't replace)

**What:** `BBjDocumentBuilder`'s constructor already arms the live-parse cycle directly from
`TextDocuments` events, independent of `services.workspace.WorkspaceLock` — the exact reason a
change during the initial workspace build still reaches BBj's parser (105's whole point).

**Example (current code, to extend with a third listener and a discriminator):**
```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:146-150
const textDocuments = services.workspace.TextDocuments;
if (hasTextDocumentEvents(textDocuments)) {
    textDocuments.onDidOpen(event => this.armLiveParseFromEvent(event.document));
    textDocuments.onDidChangeContent(event => this.armLiveParseFromEvent(event.document));
}
```
`armLiveParseFromEvent` and `armLiveParseForDocument` currently have no way to tell "this call
came from an open" apart from "this call came from a keystroke" — both funnel into the same
`debouncedCompile(document)` call at the end of `armLiveParseForDocument`
`[VERIFIED: bbj-vscode/src/language/bbj-document-builder.ts:385-392]`. Under `on-save`, TRIG-01
requires the `onDidChangeContent`-sourced call to arm **nothing**, while TRIG-03 requires the
`onDidOpen`-sourced call to still arm normally (Langium's own `NormalizedTextDocuments.set()`/
`listen()` fires `onDidOpen` immediately followed by `onDidChangeContent` for the very same open
`[VERIFIED: bbj-vscode/node_modules/langium/src/lsp/normalized-text-documents.ts:186-190,
219-223]` — the constructor's own comment already documents this coupling, so the
`onDidChangeContent` suppression under on-save must not also suppress the paired-with-open call;
threading a `reason` parameter through `armLiveParseFromEvent`/`armLiveParseForDocument` is the
natural way to keep the two apart).

### Pattern 3: The debounce timer is the one mechanism `hasPendingWork()` trusts — reuse its shape for the immediate save path

**What:** `cplDebounceTimers` (a `Map<string, Timeout>` keyed by `document.uri.fsPath`) is what
`hasPendingCompile()` — and therefore `hasPendingWork()`, the config-reload quiescence gate (#486)
— actually inspects.

**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:104,110,174-176
private readonly cplDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
private static readonly SAVE_DEBOUNCE_MS = 500;
public hasPendingCompile(): boolean {
    return this.cplDebounceTimers.size > 0;
}
```
TRIG-02 requires "no debounce delay" on save — but `debouncedCompile()`'s only timer duration is
the fixed 500 ms constant, used unconditionally
`[VERIFIED: bbj-vscode/src/language/bbj-document-builder.ts:481-486,601]`. The plan needs either a
parameterized delay (`debouncedCompile(document, delayMs = SAVE_DEBOUNCE_MS)`, called with `0` for
saves) or a parallel "run now" path — but whichever is chosen, it should still register/clear an
entry in `cplDebounceTimers` (or an equivalent tracked set) so `hasPendingCompile()` continues to
see the save-triggered cycle as pending while it runs, matching the existing (if imperfect —
the timer entry is deleted at the very top of the callback, before the async request even starts,
`[VERIFIED: bbj-vscode/src/language/bbj-document-builder.ts:486-487]`) contract other callers
already rely on. This existing early-delete limitation is pre-existing scope, not a new gap
introduced by this phase.

### Pattern 4: Line-span-overlap dedup (existing idiom to reuse for DIAG-01)

**What:** `bbj-diagnostic-reconciliation.ts`'s live-parse path already downgrades or drops a
Langium syntax complaint only when its line span overlaps a verdict diagnostic's line span —
`D-09` asks for exactly this rule, applied to the bbjcpl-fallback branch instead of
`mergeDiagnostics`' current same-start-line relabel.

**Example (the rule to port, and the code it currently does NOT run through):**
```typescript
// Source: bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts:154-156
export function lineSpansOverlap(a: Range, b: Range): boolean {
    return a.start.line <= b.end.line && b.start.line <= a.end.line;
}
```
```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:192-211 — the function D-10 says to replace
export function mergeDiagnostics(langiumDiags: Diagnostic[], cplDiags: Diagnostic[]): Diagnostic[] {
    const result: Diagnostic[] = [...langiumDiags];
    for (const cplDiag of cplDiags) {
        const cplLine = cplDiag.range.start.line;
        const matchIdx = result.findIndex(
            d => d.range.start.line === cplLine && d.source !== 'BBjCPL'
        );
        if (matchIdx >= 0) {
            // Same line: keep Langium message, change source to 'BBjCPL'
            result[matchIdx] = { ...result[matchIdx], source: 'BBjCPL' };
        } else {
            result.push(cplDiag);
        }
    }
    return result;
}
```
```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:576-585 — the fix site: the bbjcpl
// fallback branch inside debouncedCompile()'s setTimeout callback
const cplDiags = await cplService.compile(key);
const baseline = this.latestLangiumBaseline(document);
const base = applyConfiguredDiagnosticHierarchy(baseline.diagnostics);
next = cplDiags.length > 0 ? mergeDiagnostics(base, cplDiags) : base;
```
D-11's "only when the text bbjcpl checked equals the editor text" needs a text-equality check at
this call site — `cplService.compile(key)` spawns `bbjcpl` against the file **on disk**
`[VERIFIED: bbj-vscode/src/language/bbj-cpl-service.ts:61-68 doc comment "Wired into
buildDocuments()... services.compiler.BBjCPLService.compile(filePath)"]`, so under `debounced`
with unsaved edits the on-disk text and `document.textDocument.getText()` can differ — exactly the
case D-11 says must stay unsuppressed.

### Pattern 5: `parseProgram()`'s lane-after-shared ordering (the JINT-03 bug, verified)

**What:** The dedicated parse lane exists and works (proven by
`test/java-interop-parse-lane.test.ts`'s own passing suite), but `parseProgram()` still awaits the
shared connection's `connect()` — and therefore its breaker — before ever trying the lane.

**Example (the exact bug, read this session):**
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:492-510
public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
    const shared = await this.connect();          // <-- throws InteropTransportError while the
                                                    //     shared breaker is open/half-open, before
                                                    //     parseLaneConnection() is ever reached
    const lane = await this.parseLaneConnection();
    if (!lane) {
        return shared.sendRequest(parseProgramRequest, params, token);
    }
    try {
        return await lane.sendRequest(parseProgramRequest, params, token);
    } catch (e) {
        if ((e as { code?: number } | undefined)?.code === METHOD_NOT_FOUND) {
            this.parseLaneRetiredGeneration = this._connectionGeneration;
            this.disposeParseLane();
        }
        throw e;
    }
}
```
`connect()`'s breaker-open path throws synchronously via `throwCircuitOpen()` before any lane logic
runs `[VERIFIED: bbj-vscode/src/language/java-interop.ts:268-283, 307-310]`. The fix (per D-10 of
this phase and the folded todo) is to try `parseLaneConnection()` first/independently, falling
back to the shared `connect()` only when the lane itself cannot be opened — `openParseLane()`
already never touches `breakerState` and never raises the connection-error notification
`[VERIFIED: bbj-vscode/src/language/java-interop.ts:543-553 doc comment]`, so it is already safe to
call without the shared connection being up. `parseLaneConnection()`'s own generation bookkeeping
(`parseLaneGeneration`, `parseLaneRetiredGeneration`) is unaffected by reordering — it does not
read anything `connect()` produces.

### Anti-Patterns to Avoid

- **Don't gate the on-save-vs-debounced distinction inside `debouncedCompile()`'s callback.** The
  distinction is about whether a cycle is *armed* at all (typing vs. save vs. rebuild), not about
  what the cycle does once armed — keep the mode check in the three arming call sites
  (`armLiveParseForDocument`'s two event branches, `runBbjcplForDocuments`), not in the shared
  timer callback.
- **Don't reuse `composeWithVerdict()` unmodified for the kept-verdict case.** As Pitfall 2
  documents, its "any other verdict" branch is specifically designed to drop the verdict's own
  diagnostics once text has moved on — that is correct for `debounced` (a fresh verdict is due in
  500 ms) and wrong for `on-save` (the verdict may need to survive for minutes). A new function
  (or a new parameter threaded through the existing one) is needed, not a call-site workaround.
- **Don't match a kept verdict's line only by line number.** 103 D-08's carry-over already
  established the pattern of matching by `(message, line text)`, not line number, because edits
  shift line numbers — `syntaxComplaintKey()` is the existing idiom to study, even though it is
  built for Langium's own complaints, not for a BBj-sourced diagnostic that has no Langium
  "message vs line text" pairing on the Langium side to match against.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting whether a client actually sends `didSave` | A custom probe/heuristic | Read the LSP spec's own gate: advertise `textDocumentSync.save` truthfully via `DocumentUpdateHandler.didSaveDocument`, then trust both clients to respect it (confirmed for `vscode-languageclient` by reading its `DidSaveTextDocumentFeature.initialize()` source, and cited for LSP4IJ) | Both client libraries already implement the LSP-spec-correct behavior; a workaround would be redundant and could mask a real capability bug |
| Debounce timer bookkeeping | A second parallel timer map for the immediate save path | Extend `cplDebounceTimers` (Pattern 3) | `hasPendingWork()`/`hasPendingCompile()` already trust exactly this one map; a second map would need its own quiescence wiring for #486 |
| Line-shift tracking for a kept verdict | A generic diff/patience-diff line tracker | A per-line-text-anchor approach in the style of 103 D-08's `syntaxComplaintKey()`, scoped to this module | The existing codebase already solved "track this diagnostic across edits" once, narrowly and testably; a general diff algorithm is overkill for one diagnostic list and adds a new dependency surface |

**Key insight:** every mechanism this phase needs a variant of already exists once in this
codebase, built narrowly for its original caller. The temptation is to reach for a more general
tool (a real text-diff library, a generic pub/sub for LSP capabilities); resist it — match the
existing narrow, pure, unit-tested style instead, and the code review pass will likely find nothing
structurally new to object to.

## Common Pitfalls

### Pitfall 1: The server does not currently advertise `save`, so neither client ever sends `didSave` today

**What goes wrong:** Every TRIG-0x task looks straightforward from the phase description ("wire a
`TextDocuments.onDidSave` listener next to 105's event arming, or similar" — CONTEXT.md's own
discretion note), but if you only add the listener, it will simply never fire in either IDE.

**Why it happens:** `buildInitializeResult()` computes `save: Boolean(documentUpdateHandler.didSaveDocument)`
`[VERIFIED: bbj-vscode/node_modules/langium/src/lsp/language-server.ts:145]`, and this project's
`DocumentUpdateHandler` is the unmodified `DefaultDocumentUpdateHandler`, which has no
`didSaveDocument` `[VERIFIED: bbj-vscode/node_modules/langium/src/lsp/document-update-handler.ts:75-146]`
— confirmed by an empty grep for `DocumentUpdateHandler`/`didSaveDocument` in `bbj-module.ts`. On
the client side, `vscode-languageclient`'s `DidSaveTextDocumentFeature.initialize()` only
registers to send `didSave` `if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.save)`
`[VERIFIED: bbj-vscode/node_modules/vscode-languageclient/lib/common/textSynchronization.js:530]`.
LSP4IJ's `DocumentContentSynchronizer` follows the identical spec-mandated gate per its own
documentation `[CITED: deepwiki.com/redhat-developer/lsp4ij/4.3-file-synchronization-and-events]`.
**Neither client is broken — both are correctly waiting for a capability this server has never
advertised.**

**How to avoid:** Add a `didSaveDocument` implementation somewhere in the `lsp.DocumentUpdateHandler`
service group (Pattern 1) as the very first task. Confirm the fix with a targeted
`initialize`/capabilities test (or manual check of the `InitializeResult` JSON) before writing any
other TRIG task — every other task is unverifiable without it.

**Warning signs:** A UAT session where saving a file in either IDE produces no server-side log line
at all (not even an error) is this exact symptom — the notification was never sent, so the server
never even got a chance to fail.

### Pitfall 2: `composeWithVerdict()` deliberately drops a verdict's own diagnostics once the live text has moved past it — the opposite of what TRIG-04/D-01 needs

**What goes wrong:** A naïve read of "reuse the existing verdict machinery for on-save" leads to
believing D-01 ("a compiler error from the last check stays until the next save replaces it, even
when the user edits...") is already satisfied by `composeWithVerdict()`'s carry-over branch. It is
not — that branch only carries forward *downgrade decisions about Langium's own complaints*, not
the verdict's own BBjCPL/BBj-Parser diagnostics.

**Why it happens:**
```typescript
// Source: bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts:404-419
export function composeWithVerdict(input: VerdictComposition): { diagnostics: Diagnostic[]; seen?: ReadonlySet<string> } {
    const { langiumDiagnostics, validatedText, liveText, liveVersion, verdict } = input;
    if (verdict === undefined) {
        return { diagnostics: langiumDiagnostics };
    }
    if (isVerdictForVersion(verdict, liveVersion)) {
        // ... includes verdict.diagnostics in the result ...
    }
    return {
        diagnostics: applyVerdictCarryOver(langiumDiagnostics, verdict, textLineLookup(validatedText ?? liveText))
        // ^ no verdict.diagnostics here at all — only downgrade/replace decisions on Langium's OWN
        //   complaints are carried forward. The verdict's own diagnostic entries are gone.
    };
}
```
`isVerdictForVersion` requires an *exact* version match `[VERIFIED: bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts:139-144]`
— under `on-save`, since typing never re-requests a verdict, `verdict.version` freezes at the save
and `liveVersion` increments on every keystroke, so this branch is only ever true for the instant
right after the save itself. From the very next keystroke onward, the composed diagnostics list no
longer contains BBj's own error, contradicting D-01 directly.

**How to avoid:** This needs new design, not a reuse. CONTEXT.md's own discretion note already
names the two candidate approaches — "per-line text anchors like 103 D-08, or mapping through
content changes" — either of which must be built as a genuinely new function (or a new branch in
`composeWithVerdict` gated on `getCompilerTrigger() === 'on-save'`) that keeps re-emitting the kept
diagnostic at its tracked line until that line is deleted (per D-01's own stated exception), while
still letting D-02's "Langium is the only thing checking new code between saves" and D-04's "both
the kept BBj error and a fresh Langium complaint about new text on the same line" coexist. Budget
this as its own plan task with its own unit-test file, in the same pure/non-mutating style as the
rest of `bbj-diagnostic-reconciliation.ts`.

**Warning signs:** A unit test that types a single character on a line with a kept BBj error and
finds the error gone from the composed list — that is this exact bug, not a bug in the test.

### Pitfall 3: `armLiveParseFromEvent` has no discriminator between "opened" and "typed" — a naïve on-save gate breaks TRIG-03 too

**What goes wrong:** The obvious first attempt — "if trigger is on-save, return early from
`armLiveParseFromEvent`/`armLiveParseForDocument`" — suppresses the open-triggered check as well,
breaking TRIG-03 ("opening a BBj file shows its compiler errors before the first save").

**Why it happens:** Both `onDidOpen` and `onDidChangeContent` funnel into the exact same private
method with no parameter distinguishing them `[VERIFIED: bbj-vscode/src/language/bbj-document-builder.ts:148-150,
325-341, 385-392]`, and `NormalizedTextDocuments` always fires both events back-to-back for a fresh
open `[VERIFIED: bbj-vscode/node_modules/langium/src/lsp/normalized-text-documents.ts:186-190]`.

**How to avoid:** Thread a `reason: 'open' | 'change'` (or similar) through the arming call chain
so the gate can say "suppress only when `reason === 'change'` and trigger is `on-save`" — leaving
the `onDidOpen`-sourced call (and the paired `onDidChangeContent` fired by the *same* open event,
which will need its own dedup so the open doesn't double-arm) intact.

**Warning signs:** A UAT pass where `on-save` correctly blocks typing-triggered checks, but a newly
opened file shows no compiler errors until the first save — the inverse of Pitfall 2's symptom,
same root cause (no reason discriminator).

### Pitfall 4: `runBbjcplForDocuments()`'s rebuild-driven trigger is a second, independent arming path that also needs the on-save gate

**What goes wrong:** Fixing only the event-driven arming (`armLiveParseFromEvent`) leaves the
rebuild-driven trigger (`buildDocuments()` → `runBbjcplForDocuments()`) still calling
`debouncedCompile()` for every eligible open document on every workspace rebuild — another file's
save, a relink, a `config.bbx` change — which D-06 explicitly says must NOT start a check under
`on-save`.

**Why it happens:** 105 D-03 established that the event path and the rebuild path intentionally
arm the *same* `cplDebounceTimers` entry so a burst from both merges into one cycle
`[VERIFIED: bbj-vscode/src/language/bbj-document-builder.ts:223-247, 286-290]` (`runBbjcplForDocuments`
calls `this.debouncedCompile(document)` unconditionally for every document that passes
`shouldCompileWithBbjcpl`, once trigger is not `off`). This phase's D-06 is an explicit,
scoped departure from that 105 decision, for `on-save` only.

**How to avoid:** Add a branch to `runBbjcplForDocuments()` parallel to its existing `if (trigger === 'off')`
early-return: when `trigger === 'on-save'`, skip the `debouncedCompile(document)` call entirely
(Langium's own validation still runs unaffected — this method is only about the BBjCPL/live-parse
side), while leaving the `debounced` path's loop exactly as it is today.

**Warning signs:** A unit test that saves file A, then edits and saves file B in a way that
triggers a relink of file A (e.g. via a shared USE dependency), and finds file A's kept verdict
has been silently replaced or cleared without file A itself being saved.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No stored data, service config,
OS-registered state, secrets, or build artifacts are renamed or relocated by this phase.

## Code Examples

### The scriptable `parseProgram` test double (already exists, zero changes needed)

```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:105-136
private parseProgramScript: JavaInteropTestServiceParseProgramScript = 'method-not-found';

public scriptParseProgram(script: JavaInteropTestServiceParseProgramScript): void {
    this.parseProgramScript = script;
}

public override async parseProgram(params: ParseProgramParams): Promise<ParseProgramResult> {
    const script = this.parseProgramScript;
    if (script === 'method-not-found') {
        throw new ResponseError(ErrorCodes.MethodNotFound, 'Unsupported request method: parseProgram');
    }
    if (script === 'transport-error') {
        throw new Error('connection reset');
    }
    if (script === 'malformed-result') {
        return { version: params.version, errors: undefined as unknown as ParseError[] };
    }
    if ('errors' in script) {
        return { version: params.version, errors: script.errors };
    }
    throw new ResponseError(script.code, script.message);
}
```
This double overrides `parseProgram` directly (bypassing `connect()`/lane logic entirely), so it
is unaffected by the JINT-03 reordering — TRIG task tests can keep using it unchanged. For JINT-03
itself, use `fake-interop-peer.ts`'s `FakePeerInteropService` instead (below), which exercises the
real `connect()`/breaker/lane code path.

### The fake-peer harness for JINT-03's breaker-vs-lane scenario

```typescript
// Source: bbj-vscode/test/fake-interop-peer.ts:56-80 (fields available to script a scenario)
public peerUp = false;                       // createSocket() success/failure
public connectDelayMs = 10000;                // delay before createSocket() settles
public readonly refusedSocketAttempts = new Set<number>();  // refuse ONE specific attempt number,
                                               // independent of peerUp — lets a test refuse only
                                               // the shared connection's attempt while the lane's
                                               // own attempt still succeeds
public readonly hungConnectionIds = new Set<number>();
```
```typescript
// Source: bbj-vscode/test/java-interop-parse-lane.test.ts:33-77 (existing lane-vs-shared test,
// the pattern to extend for "shared breaker open/half-open, lane still answers")
const { interop } = createFakePeerServices();
interop.peerUp = true;
interop.connectDelayMs = 0;
vi.useFakeTimers();
// ... open connection 1 (shared) with a successful getRawClass() call ...
interop.hungConnectionIds.add(1);              // hang the shared connection's further requests
const result = await interop.parseProgram({ /* ... */ });
expect(interop.socketAttempts).toBe(2);        // a second socket = the dedicated lane opened
const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
expect(parseRequests[0].connectionId).toBe(2); // parseProgram answered over the LANE, not shared
```
For JINT-03's exact regression (shared breaker open/half-open), refuse the *shared* connection's
socket attempt (via `refusedSocketAttempts`, forcing `connect()`'s breaker to `open`) while leaving
`peerUp = true` for the lane's own, later socket attempt — proving the lane still answers even
though `connect()` would throw.

### `applyDiagnosticHierarchy`'s existing Rule 0 — read carefully before touching (it is NOT what D-09 switches on)

```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:106-130 (doc comment, verbatim)
// - Parse errors present → suppress ALL linking errors (identified by data.code, NOT severity)
// - Any Error-severity diagnostic present → suppress all warnings/hints
// - Cap parse errors at maxErrors
//
// Note on Rule 0: `applyDiagnosticHierarchy` runs once, synchronously, inside
// `validateDocument()` — before the save-time compiler's `'BBjCPL'`-sourced diagnostics exist.
// Those are merged later, directly into `document.diagnostics`, by the document builder's
// debounce callback (`bbj-document-builder.ts`), a separate code path that never calls this
// function again. Rule 0 therefore only ever acts on a list that already carries a `'BBjCPL'`
// diagnostic if one was already present from an earlier cycle; on the build that first
// introduces one, Rule 0 does not run against it. This is confirmed, long-standing behaviour,
// unchanged by this phase.
```
D-09 is explicit: **"Rule 0 as written in `applyDiagnosticHierarchy` ... is NOT what gets switched
on."** The DIAG-01 dedup is a new, line-span-overlap-scoped mechanism at the `mergeDiagnostics()`
call site (Pattern 4), not a change to `applyDiagnosticHierarchy`'s Rule 0 at all.

## State of the Art

| Old Approach (today) | New Approach (this phase) | Where | Impact |
|-----------------------|----------------------------|-------|--------|
| `save: false` advertised; `didSave` never wired | `didSaveDocument` implemented on `DocumentUpdateHandler`; `save: true` advertised | `bbj-module.ts` / new small class | Unblocks every TRIG task in both IDEs |
| `armLiveParseFromEvent` treats open and typing identically | A `reason` discriminator distinguishes them, gated per trigger mode | `bbj-document-builder.ts` | TRIG-01 (typing silent) and TRIG-03 (open still checks) both satisfied |
| `runBbjcplForDocuments()` arms on every rebuild for every trigger except `off` | A new `on-save` branch skips arming on rebuild-only triggers | `bbj-document-builder.ts` | TRIG-01/D-06 |
| `debouncedCompile()` is always 500 ms | A save-triggered path runs with no delay | `bbj-document-builder.ts` | TRIG-02 |
| `composeWithVerdict()` drops the verdict's own diagnostics once text moves on | A new kept-verdict composition tracks and re-emits it until its line is deleted | `bbj-diagnostic-reconciliation.ts` | TRIG-04/D-01..D-04 |
| `mergeDiagnostics()` relabels same-start-line Langium diagnostics with BBjCPL's source, keeping Langium's message | A line-span-overlap dedup drops the redundant Langium syntax complaint outright, matching the live-parse path's own rule | `bbj-document-builder.ts`/`bbj-document-validator.ts` | DIAG-01 |
| `parseProgram()` awaits the shared connection/breaker before the dedicated lane | The lane is tried independently; shared connection only as fallback | `java-interop.ts` | JINT-03 |
| IntelliJ has no compiler-trigger setting or init option at all | A "Compiler check:" dropdown + `compilerTrigger` init-options key, mirroring `compilerOutputDirectory` (#571) | `bbj-intellij/` | TRIG-06 |
| `on-save` enumDescription says "currently behaves the same as 'debounced'"; `off` framed as a slowness workaround; IntelliJ doc says "no IntelliJ equivalent" | Docs describe the three modes as implemented and recommend `on-save` for large workspaces | `package.json`, both `features.md` | TRIG-07 |

**Deprecated/outdated:**
- The `off` "workaround for slow completion" framing in both docs (`vscode/features.md:72-73`,
  and the parallel language in `intellij/features.md`) is explicitly being replaced per D-14 — do
  not carry it forward into the rewritten description.
- The IntelliJ doc's "VS Code's `bbj.compiler.trigger` setting has no IntelliJ equivalent" paragraph
  `[VERIFIED: documentation/docs/intellij/features.md:66-67]` is removed entirely per D-14, once
  TRIG-06 lands.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | LSP4IJ's `DocumentContentSynchronizer` gates `didSave` sending on the server's advertised `textDocumentSync.save` capability, the same way `vscode-languageclient`'s `DidSaveTextDocumentFeature` does (confirmed by reading its actual source this session) | Pitfall 1, Pattern 1 | If LSP4IJ 0.21.0 behaves differently (e.g. always sends `didSave` regardless of capability, or requires a different registration), TRIG-02/03/04 could appear to work in VS Code during dev but silently fail in IntelliJ until the first hand-UAT pass — budget an early cross-IDE smoke check right after Pattern 1 lands, before building the rest of the TRIG logic on top of it |
| A2 | No existing code path in this repository already implements "re-display a diagnostic on a line that has shifted through edits until that line is deleted" — the search for a reusable pattern came up empty, so this is genuinely new design | Pitfall 2 | If a suitable pattern does exist elsewhere (e.g. in `bbj-cpl-parser.ts` or a validation file not read this session) and was missed, the plan may build a redundant mechanism instead of reusing one — worth one more targeted grep for "line" + "shift"/"anchor"/"track" across `src/language/validations/` before starting Pitfall 2's task |

## Open Questions

1. **Exactly how should a kept verdict's diagnostic re-anchor itself through arbitrary inserts and
   deletes above its line, for potentially many keystrokes between saves?**
   - What we know: 103 D-08 matches by `(message, current-line-text)` for a *single* downgrade
     decision that only needs to survive one keystroke's carry-over before the next verdict
     arrives 500 ms later. On-save has no such short horizon — the same kept diagnostic may need
     to survive dozens of edits across minutes.
   - What's unclear: whether a pure per-line-text-anchor match (re-scan the document for a line
     whose text still matches what BBj saw) is robust enough once the user has typed on/near that
     exact line (the anchor text itself may have changed, per D-04's "both are visible" case), or
     whether line-number-plus-offset tracking through the LSP `TextDocumentContentChangeEvent`
     deltas is needed instead.
   - Recommendation: prototype against 103's existing test file style
     (`bbj-diagnostic-reconciliation.test.ts`) with a handful of edit sequences (insert above,
     delete above, edit the line itself, delete the line itself) before committing to one
     mechanism in the plan — this is squarely a "Claude's Discretion" item per CONTEXT.md, but the
     plan should still pick one approach explicitly rather than leaving it open at execution time.

2. **Does the `didSaveDocument` capability flip need its own dedicated unit test, or is it only
   verifiable via the live `InitializeResult` in a hand UAT?**
   - What we know: `buildInitializeResult()` is Langium-internal; this repository's tests
     construct services via `createBBjTestServices`/`createFakePeerServices`, neither of which
     goes through the real LSP `initialize` handshake.
   - What's unclear: whether a lightweight test can call `services.lsp.LanguageServer.initialize(...)`
     directly against the test services and assert on the returned capabilities, or whether this
     is only checkable by starting the real server process and reading its stdout/response.
   - Recommendation: try the direct-call approach first (cheaper, hermetic); fall back to a
     comment in the plan noting it is UAT-only if the LSP service test double doesn't support it
     cleanly.

## Environment Availability

No new external dependency is introduced. The existing dependencies this phase's behavior touches
are unchanged and were already required by prior phases:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| BBjServices (`bbj-ls` on :5008) | Live parse verdict (`parseProgram`) | Not probed this session — dev-container BBj setup is documented in project memory as available in this environment | per `[MEMORY: devcontainer-bbj-setup.md]` | bbjcpl fallback (already implemented) |
| `bbjcpl` binary | Save-time fallback compile | Same as above | — | Server already handles "not found" gracefully (`bbjcplAvailable === false`) |
| LSP4IJ plugin | IntelliJ client behavior (Pitfall 1, IntelliJ side) | Bundled by the IntelliJ plugin build, not independently probed this session | `0.21.0` per `build.gradle.kts` | none — required for IntelliJ support at all, pre-existing |

**Missing dependencies with no fallback:** none newly introduced by this phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest `^4.1.10` `[VERIFIED: bbj-vscode/package.json:719]` |
| Config file | `bbj-vscode/vitest.config.ts` (existing, unchanged by this phase) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (per project memory: judge on `numFailedTests`, not "failed suites" — known interop env-drift baseline is `linking.test.ts` interop tests + `issue447`) |

For IntelliJ-side Java changes (BbjSettings/Component/Configurable, CompilerInitOptions), the
existing pattern is plain JUnit 5 tests with no IntelliJ platform dependency, run via
`cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` — `CompilerInitOptions.java`'s
own doc comment states it "has no IntelliJ platform dependency so it can be covered by plain JUnit
5 tests" `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java:16-17]`
— the same should hold for a new `compilerTrigger` init-options key.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRIG-01 | Typing under on-save starts no live parse/bbjcpl | unit | `npx vitest run test/live-parse-scheduling.test.ts` (extend) | ✅ extend existing file |
| TRIG-02 | Save runs exactly one check, no debounce | unit | new file, e.g. `test/on-save-trigger.test.ts` | ❌ Wave 0 |
| TRIG-03 | Open shows errors before first save | unit | `test/live-parse-scheduling.test.ts` (extend — an open-event test already exists at line 148, extend for on-save mode) | ✅ extend existing file |
| TRIG-04 | Kept verdict survives edits until next save; correct carry-over/coexistence per D-01..D-04 | unit | `test/bbj-diagnostic-reconciliation.test.ts` (extend, new composition function) | ✅ extend existing file |
| TRIG-05 | `debounced`/`off` unchanged | unit | existing suites (`live-parse-scheduling.test.ts`, `live-parse-interleaving.test.ts`, `bbj-document-validator.test.ts`) — regression only, no new test needed beyond confirming these stay green | ✅ |
| TRIG-06 | IntelliJ setting dropdown + init option | JUnit 5 (plain Java) | `cd bbj-intellij && ./gradlew test` — new test class alongside existing `CompilerInitOptions`-style tests | ❌ Wave 0 (new Java test class) |
| TRIG-07 | Docs + VS Code description describe the three modes accurately | manual (content review) | n/a — not automatable; verify by reading the rewritten `package.json` enumDescriptions and both `features.md` sections | n/a |
| DIAG-01 | bbjcpl-fallback redundant Langium error suppressed when overlap + text-matches-disk | unit | `test/bbj-document-validator.test.ts` or a new sibling (line-span-overlap dedup, mirrors `bbj-diagnostic-reconciliation.test.ts`'s existing coverage of the live-parse path) | ✅ extend existing file, possibly new sibling |
| JINT-03 | Live parse answers over its own lane while the shared breaker is open/half-open | unit | `npx vitest run test/java-interop-parse-lane.test.ts` (extend with the breaker-open scenario, Code Example above) | ✅ extend existing file |
| DocumentUpdateHandler `save` capability flip (Pitfall 1 — prerequisite, no REQ ID) | Server advertises `save: true`; `didSave` reaches `BBjDocumentBuilder` | unit (if feasible) or manual (per Open Question 2) | TBD in plan | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** targeted `npx vitest run <changed-file>.test.ts`
- **Per wave merge:** `npx vitest run --maxWorkers=2` (whole suite, judged on `numFailedTests`)
- **Phase gate:** Full suite green (known interop-env-drift baseline excepted) before
  `/gsd-verify-work`, plus the hand UAT explicitly scoped in CONTEXT.md's discretion note (both
  IDEs, freshly built VSIX and IntelliJ zip, and the criterion-5 timing re-check on the real large
  workspace)

### Wave 0 Gaps

- [ ] `test/on-save-trigger.test.ts` (or equivalent new file) — covers TRIG-02's no-debounce save
      path and D-05/D-06/D-07/D-08's save-arming semantics not covered by extending
      `live-parse-scheduling.test.ts` alone
- [ ] A JUnit 5 test class for the new `compilerTrigger` field in `CompilerInitOptions.java`-style
      code (TRIG-06), following the existing `compilerOutputDirectory` test pattern in
      `bbj-intellij`
- [ ] A test (unit if feasible, else a documented manual UAT step) proving `save: true` is now
      advertised in `InitializeResult` (Pitfall 1 prerequisite)

## Security Domain

`security_enforcement` is not set in `.planning/config.json`'s `workflow` block, so it is treated
as enabled per this agent's instructions.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase touches no auth surface |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Marginal | The new `compilerTrigger` IntelliJ init-options value is validated the same way the existing one already is server-side: `bbj-ws-manager.ts`'s `onInitialize` only accepts the literal strings `'debounced' | 'on-save' | 'off'` and silently ignores anything else `[VERIFIED: bbj-vscode/src/language/bbj-ws-manager.ts:108-111]` — no new validation code is needed, the existing gate already covers a malformed value from either client |
| V6 Cryptography | No | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A malicious/malformed `initializationOptions.compilerTrigger` value from a compromised or buggy client | Tampering (low severity — local-machine IPC, not network-facing) | Already mitigated: the existing literal-string allow-list check silently ignores anything else, leaving `compilerTrigger` at its prior value rather than crashing or executing the value |
| bbjcpl spawn arguments (unrelated to this phase's own changes, but adjacent since DIAG-01 touches the bbjcpl-fallback branch) | Injection | Out of scope for this phase — `bbj-cpl-service.ts`'s spawn arguments are unchanged by DIAG-01; DIAG-01 only changes how the *diagnostics that come back* are merged/deduped, not how the process is invoked |

No new network endpoint, no new secret, no new file-write path is introduced by this phase — the
save-triggered check reuses the exact same `parseProgram`/`bbjcpl` invocations that already exist
for the debounced path, just with different timing/arming.

## Project Constraints (from CLAUDE.md)

Extracted from `/home/coder/repos/bbj-language-server/CLAUDE.md`, treated with the same authority
as a locked decision:

- **Grammar changes require regeneration.** Not expected for this phase (no `bbj.langium` change
  planned), but if any task touches `src/language/bbj.langium`, it must run
  `npm run langium:generate` from `bbj-vscode/` and never edit `src/language/generated/` by hand.
- **BBjCPL integration must stay wired inside `buildDocuments()`, never `onBuildPhase`.** Both
  `runBbjcplForDocuments()` and the constructor's event listeners already follow this; any new
  save-arming code must too — CLAUDE.md and the code's own comments (`bbj-document-builder.ts:232-234`)
  both warn that `onBuildPhase` causes a CPU rebuild loop.
- **AST `$type` checks use the generated `ClassName` constant, never a string literal**, and
  runtime type checks use the generated `isXxx()` guards. Not directly exercised by this phase's
  AST-free changes (diagnostics, connection wiring, settings), but relevant if any new code touches
  `generated/ast.ts` types.
- **Testing pattern:** new/extended tests use `EmptyFileSystem` and `createBBjTestServices` (for
  Java-interop-touching tests) exactly as `test/bbj-test-module.ts` and the existing
  `live-parse-scheduling.test.ts`/`java-interop-parse-lane.test.ts` suites already do — this
  research confirmed both are the right base to extend, not new harnesses.
- **Shell and file-access rules** (from CLAUDE.md's own "Shell and File-Access Rules" section,
  already followed during this research session): use `Grep`/`Glob`/`Read` first; every shell
  command uses an absolute path from the repo root; never chain `cd` with `grep`/`find`/`cat`/`sed`;
  no blind recursive scans; `git add` only exact paths, never `-A`/`.`. These apply to the executor
  phase exactly as they applied to this research.
- **IDE integration:** both VS Code and IntelliJ consume the same compiled language-server binary
  (`out/language/main.cjs`) and the same TextMate/language-configuration files. This phase's
  server-side changes (Pitfall 1, Patterns 1-5) automatically apply to both IDEs once the binary is
  rebuilt — there is no separate IntelliJ-side reimplementation of the trigger *logic*, only of the
  *setting* (TRIG-06), consistent with `STATE.md`'s standing constraint "Anything both IDEs need
  stays a host-neutral language-server request — no reimplementation on the IntelliJ side."

## Sources

### Primary (HIGH confidence — read directly this session)

- `bbj-vscode/src/language/bbj-document-builder.ts` (full file) — arming, debounce, verdict
  plumbing, `hasPendingWork`/`hasPendingCompile`
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` (full file) — `composeWithVerdict`,
  `reconcileWithVerdict`, `reconcileEarlyVerdict`, `applyVerdictCarryOver`, `lineSpansOverlap`
- `bbj-vscode/src/language/bbj-document-validator.ts` (full file) — `applyDiagnosticHierarchy`,
  `mergeDiagnostics`, `getCompilerTrigger`/`setCompilerTrigger`, `validateDocument`
- `bbj-vscode/src/language/java-interop.ts` (lines 1-1287, including `parseProgram`,
  `parseLaneConnection`, `openParseLane`, `connect`/breaker) — JINT-03's exact fix site
- `bbj-vscode/src/language/bbj-parser-service.ts` (full file) — `requestLiveParse`, latch state
- `bbj-vscode/src/language/main.ts` (lines 180-250) — `onDidChangeConfiguration`, trigger wiring
- `bbj-vscode/src/language/bbj-ws-manager.ts` (grep + targeted read) — init-options handling
- `bbj-vscode/src/extension.ts` (lines 1075-1124) — client `initializationOptions`/`synchronize`
- `bbj-vscode/package.json` (compiler.trigger config block, dependency versions)
- `bbj-vscode/node_modules/langium/src/lsp/language-server.ts` — `buildInitializeResult`,
  `addDocumentUpdateHandler` (the exact `save` capability gate)
- `bbj-vscode/node_modules/langium/src/lsp/document-update-handler.ts` — `DocumentUpdateHandler`
  interface, `DefaultDocumentUpdateHandler`
- `bbj-vscode/node_modules/langium/src/lsp/normalized-text-documents.ts` — `TextDocuments`
  interface (`onDidSave`), `NormalizedTextDocuments.listen`/`set`
- `bbj-vscode/node_modules/vscode-languageclient/lib/common/textSynchronization.js` —
  `DidSaveTextDocumentFeature.initialize`'s capability gate
- `bbj-vscode/src/language/bbj-cpl-service.ts` (lines 1-80) — `BBjCPLService.compile` reads the
  on-disk file
- `bbj-vscode/test/bbj-test-module.ts` — `JavaInteropTestService`'s scriptable `parseProgram`
- `bbj-vscode/test/java-interop-parse-lane.test.ts` and `test/fake-interop-peer.ts` — lane/breaker
  test harness
- `bbj-vscode/test/live-parse-scheduling.test.ts`, `test/live-parse-interleaving.test.ts`,
  `test/bbj-document-validator.test.ts` (test names via grep) — existing coverage to extend
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` (targeted reads:
  field declarations, combo-box construction, form layout)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java` (full file)
- `bbj-intellij/build.gradle.kts` — LSP4IJ version
- `documentation/docs/vscode/features.md` and `documentation/docs/intellij/features.md` (targeted
  grep + context reads) — exact current doc text to rewrite per D-14
- `.planning/phases/106-on-save-compiler-check-in-both-ides/106-CONTEXT.md`,
  `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json` — phase scope,
  decisions, project constraints
- `.planning/milestones/v4.5-phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-CONTEXT.md`
  (targeted read of D-01..D-03) — confirms the exact prior-phase arming architecture this phase
  departs from

### Secondary (MEDIUM confidence)

- `[CITED: deepwiki.com/redhat-developer/lsp4ij/4.3-file-synchronization-and-events]` — LSP4IJ's
  `DocumentContentSynchronizer` respects server `save`/`openClose` capabilities before sending
  notifications (WebSearch result summarizing LSP4IJ's own documented behavior; not read directly
  from LSP4IJ's own source, since the plugin jar is not vendored in this repository)

### Tertiary (LOW confidence)

None — every claim in this document is either read directly from source this session or cited to
a specific external reference; no claim rests on unverified training knowledge alone (see
Assumptions Log for the two claims that are closest to that boundary and why).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency, all versions read from lockfiles/build files this session
- Architecture (Pitfalls 1, 3, 4; Patterns 1-5): HIGH — every claim backed by a specific file/line
  read this session, several cross-checked against Langium's own source
- Architecture (Pitfall 2 / kept-verdict design): MEDIUM — the *gap* is verified HIGH confidence
  (the code that does NOT do what's needed was read directly), but the *solution* is genuinely new
  design with no existing implementation to cite, hence Open Question 1
- Pitfalls (client-side didSave gating): HIGH for VS Code (source read directly), MEDIUM for
  IntelliJ/LSP4IJ (cited, not read from LSP4IJ's own source — flagged as Assumption A1)
- Validation architecture: HIGH — test framework, existing file names and describe/test blocks all
  confirmed by reading the actual test files

**Research date:** 2026-09-24
**Valid until:** 30 days (stable codebase area; no fast-moving external dependency drives this
phase) — re-verify Assumption A1 (LSP4IJ behavior) empirically during the first hand-UAT pass
regardless of this window, since it was never directly confirmed against LSP4IJ's own source.
