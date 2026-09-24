# Phase 102: Live Compiler Diagnostics With Backward Compatibility - Research

**Researched:** 2026-09-22
**Domain:** Language-server client for a JSON-RPC compiler-diagnostics endpoint, with mandatory backward-compatible fallback
**Confidence:** HIGH (all six Discretion questions answered from code read this session plus a live probe against the deployed endpoint; the only LOW-confidence items are exact wording choices already flagged as free in CONTEXT.md)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: No new setting.** The live parse hangs off the existing `bbj.compiler.trigger` switch (`bbj-document-validator.ts`'s `getCompilerTrigger()`): `off` disables the live parse together with `bbjcpl`; `debounced` and `on-save` both enable it whenever the probe says the endpoint exists. Neither `package.json` nor the IntelliJ settings UI or initialization options change.
- **D-02: Pacing reuses the existing 500 ms trailing-edge debounce** in `bbj-document-builder.ts` (`SAVE_DEBOUNCE_MS`, `debouncedCompile`) — the live parse is scheduled from the same place and the same quiet period as the `bbjcpl` run, one timer mechanism in one place. Anything that still overlaps is resolved by the server's latest-wins supersession (the superseded request's `RequestCancelled` is dropped silently, never shown).
- **D-03: The `bbjcpl` run is unchanged in this phase.** Both sources may overlap on a line until Phase 103 reconciles them; that overlap is accepted.
- **D-04: A document is parsed on open as well as on edit**: the first build after `didOpen` sends a parse, under the same gate as `bbjcpl` today (`shouldCompileWithBbjcpl`).
- **D-05: The first real parse on a connection is the probe.** No empty-text probe, no capability request: the first document parse is sent as a normal `parseProgram`; a `MethodNotFound` (-32601) latches "off", a result (or any application error -33001..-33005, which proves the method exists) latches "on". Same pattern as `ensureCompleteClassIndex`'s `getAllClassNames` latch.
- **D-06: The latch is per socket connection.** Reset whenever a new connection is established — after a reconnect following an outage, and after a cache clear (`clearCache()`).
- **D-07: Server log only.** One info line per connection stating the mode; no notification, no status-bar item, no popup, no client change in either IDE.
- **D-08: Failure log cadence: first failure per connection per failure kind at warn, repeats at debug until recovery.** A later success clears the latch so the next outage warns again. Failure kinds: application codes -33001..-33005, transport failures (breaker open, failed connect, connection closed), malformed result. A failure never produces a diagnostic and never changes the on/off latch (D-05).
- **D-09: A new, distinct diagnostic `source` (proposal: `BBj Parser`), no tier change.** Does not reuse `BBjCPL`, so Rule 0 does not fire on it; `applyDiagnosticHierarchy` treats it as an ordinary Error-severity diagnostic.
- **D-10: Severity is Error** for every live parser diagnostic. The message is BBj's own text, unchanged; the categories go into the diagnostic's `code` field (joined when an error carries several).
- **D-11: A position that does not fit the document is clamped, never dropped**: line to the last line, character to the line's end; a range that collapses spans the whole line. Conversion from BBj's one-based editor lines/characters to zero-based LSP ranges is the client's job.
- **D-12: `bbj.diagnostics.maxErrors` (default 20) caps the live parser's errors too**, in the parser's own order, per document.
- **D-13: Documentation: a prerequisites line plus a features paragraph, in both guides.** Both `getting-started.md`s keep "BBj 25.00 or higher" and add "live compiler diagnostics need BBj 26.03 or later"; both `index.md` Requirements sections get the same one-liner; both `features.md` get a short "Live compiler diagnostics" entry. No new configuration page section.
- **D-14: The service double is `JavaInteropTestService`**, made scriptable for `parseProgram`: by default answers like an old server (`MethodNotFound`), tests can script a result list or a `-3300x` application error. The PSRV-04 test runs the whole open-edit-validate path against the default (old-server) double and asserts: no live diagnostic, `bbjcpl` path still invoked, one "off" log line, no error.
- **D-15: Coordinate tests are hand-written DTO fixtures plus one gated live check.** Unit tests feed hand-written `ParseError` DTOs through the converter for each PSRV-05 case; one `RUN_BBJ_TESTS`-gated test sends the same four invented documents to the live endpoint and asserts the editor ranges.
- **D-16: Hand UAT and the live test run against the `bbj-ls` jar already deployed** in `/opt/bbx/.lib/bbjls/` as-is. The five critical `101-REVIEW.md` findings are fixed separately in `bbj-ls` before its MR merges; this phase's client must not depend on those fixes (always sends a non-null `canonicalName`).

### Claude's Discretion

- File and class names: proposal `bbj-parser-service.ts` / `BBjParserService` beside `bbj-cpl-service.ts`, registered in `bbj-module.ts`'s `compiler` service group; whether the request/latch lives on `JavaInteropService` or in the new service calling through it.
- Request payload: `text` = document's current text; `canonicalName` = `document.uri.fsPath`; `version` = the document's LSP version as a string; `prefixes` = the workspace manager's resolved PREFIX list; `workspaceRoots` = the workspace folder paths.
- Converter internals (one-based to zero-based, CRLF handling, whole-line fallback trim), how the latest document text is captured at debounce time, and whether the client cancels an in-flight request on a newer edit or simply drops a `RequestCancelled` result.
- Exact wording of the mode and failure log lines, the joined-category separator in `code`, and the exact source label text.
- Plan split and order. Obvious default: (1) the client and probe latch with the old-server double and the PSRV-04 fallback test; (2) the document-builder hook, coordinate converter, clamping, cap, and PSRV-05 fixtures; (3) the gated live test, docs, hand UAT in both IDEs, branch and PR.

### Deferred Ideas (OUT OF SCOPE)

- A status-bar indicator or notification for live-diagnostics mode (`bbj/liveDiagnostics`).
- A dedicated `bbj.compiler.liveDiagnostics` toggle independent of `bbj.compiler.trigger`.
- Making `on-save` actually differ from `debounced` in the server.
- Skipping the `bbjcpl` run while the endpoint is live — Phase 103's reconciliation decides.
- The five critical `101-REVIEW.md` findings in `bbj-ls` — a `bbj-ls` follow-up, not part of this phase.
- A configuration-page section documenting the log lines and troubleshooting steps.
- De-duplicating live errors against Langium's own diagnostics or the save-time `bbjcpl` run (Phase 103, PSRV-06/07).
- Standing Langium's lexer/parser/line-break checks down when the compiler accepts a document (Phase 103).
- Any diagnostic that depends on `USE`/`CALL` reference resolution — Phase 101's own parser API never invokes the prefix algorithm through this endpoint; do not build on it.
- The conformance harness's endpoint mode (Phase 104).
- A status-bar indicator, popup, or any new setting in either IDE.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PSRV-03 | With a BBjServices that offers the endpoint, the user sees the compiler's syntax errors while typing, without saving | §Architecture Patterns Pattern 1-3 (probe-and-latch, debounce hook, diagnostic publish); §Code Examples |
| PSRV-04 | Older BBj / no connection: both extensions keep every 0.16.x feature; probe once per connection, not a version string; automated test against a service double | §Architecture Patterns Pattern 1 (probe latch), §Validation Architecture (hermetic PSRV-04 test), §Code Examples (JavaInteropTestService override) |
| PSRV-05 | Diagnostics land on the correct editor line/range for colon continuation, user line numbers, CRLF, no trailing newline | §Live Probe Evidence (empirically observed coordinate behaviour), §Common Pitfalls (clamping is load-bearing, not defensive-only), §Validation Architecture (DTO fixture unit tests + gated live test) |
| PSRV-08 | An endpoint failure is never shown as a syntax error; visible in the server log only | §Architecture Patterns Pattern 4 (failure translation and log cadence), §Common Pitfalls (RequestCancelled is not a failure) |
| PSRV-09 | Server log states mode once per connection; docs say BBj 26.03+ needed | §Architecture Patterns Pattern 1 (mode log line), §Documentation Changes (exact quoted lines to edit) |

</phase_requirements>

## Summary

This phase adds exactly one new client-side piece to an already well-factored language server: a
thin `parseProgram` pass-through on `JavaInteropService` (reusing its socket, circuit breaker and
connection lifecycle) plus a new `BBjParserService` that owns the once-per-connection probe latch,
the mode/failure log lines, and the one-based-to-zero-based coordinate conversion. The request is
scheduled from the exact same 500 ms debounce timer that already drives `bbjcpl` in
`bbj-document-builder.ts`, and the resulting diagnostics are merged into `document.diagnostics`
under a new `source` string that deliberately does not participate in `bbj-document-validator.ts`'s
existing BBjCPL-suppresses-parse-errors rule. Every mechanism this phase needs already has a close
precedent in the codebase — the `ensureCompleteClassIndex`/`METHOD_NOT_FOUND` latch, the
`debouncedCompile`/clear-then-merge pattern, the `LruMap`-style generation guards, and the
`END_OF_LINE_CHARACTER` clamp-by-sentinel idiom in `lsp-position.ts` — so this phase is assembly,
not invention.

The one piece that could not be answered by reading code alone — the actual shape of BBj's
one-based editor coordinates for the four PSRV-05 cases — was confirmed by a live probe against the
deployed endpoint on `127.0.0.1:5008` this session (see §Live Probe Evidence). The single most
load-bearing finding from that probe: BBj's own `endCharacter` for an ordinary mid-buffer syntax
error routinely **exceeds** the reported line's actual character count (a `+2` overshoot was
observed in 3 of 4 probed cases) — confirming that D-11's clamp-never-drop policy is not a rare
edge case but an ordinary path the converter will hit on real errors, and that the existing
`END_OF_LINE_CHARACTER` sentinel idiom (already used elsewhere in this codebase for exactly this
purpose) is the right tool, not a new line-length computation.

**Primary recommendation:** Add `BBjParserService` (`bbj-parser-service.ts`, registered in the
`compiler` service group next to `BBjCPLService`) that calls a new thin
`JavaInteropService.parseProgram()` method; hook it into `bbj-document-builder.ts`'s existing
`debouncedCompile` callback (same timer, same document, same clear-then-append pattern bbjcpl
already uses); tag its diagnostics with `source: 'BBj Parser'` so Rule 0 does not fire; clamp every
out-of-range coordinate with the existing `END_OF_LINE_CHARACTER` sentinel rather than computing
exact line lengths.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `parseProgram` probe, latch, request send | API/Backend (language server: `JavaInteropService` + `BBjParserService`) | External Service (`bbj-ls` on :5008) | The socket, breaker and connection lifecycle already live entirely server-side; no IDE-side code is added (D-01, canonical_refs) |
| Debounce scheduling | API/Backend (`bbj-document-builder.ts`) | — | Reuses the existing `SAVE_DEBOUNCE_MS` timer (D-02) — one mechanism, not duplicated per-tier |
| Coordinate conversion (one-based → zero-based, CRLF, clamping) | API/Backend (`BBjParserService`) | — | The MR contract explicitly makes this "the caller's job" (101-MR-DESCRIPTION.md); no IDE-side conversion exists or is needed |
| Diagnostic publish/merge | API/Backend (`bbj-document-validator.ts` / `bbj-document-builder.ts`) | — | `notifyDocumentPhase` pushes to both IDEs over the shared LSP `textDocument/publishDiagnostics` channel; no per-IDE logic |
| Diagnostic rendering | Browser/Client (VS Code) and IntelliJ (LSP4IJ) | — | Passive: both already render arbitrary-`source` `Diagnostic` objects; no change needed in either extension (canonical_refs: "No `bbj-intellij/` source change") |
| Mode/failure logging | API/Backend (`logger.ts`, server-side only) | — | D-07 locks this to server log only, explicitly no client surface |
| Documentation | N/A (static content) | — | `documentation/docs/{vscode,intellij}/*.md`, no code tier |

## Standard Stack

No new external packages. This phase is pure assembly of already-present dependencies:

| Library | Version (installed) | Purpose | Why no alternative needed |
|---------|---------|---------|--------------|
| `vscode-jsonrpc` | `8.2.1` (declared `^8.2.1`) [VERIFIED: bbj-vscode/package.json:699, and package-lock pins 8.2.1] | `RequestType`, `MessageConnection.sendRequest`, `ResponseError` — the exact pattern `getAllClassNamesRequest` already uses | Already the transport for every other interop request |
| `vscode-languageserver` (transitive, pinned via `overrides`) | resolves `vscode-languageserver-protocol@3.18.2` [VERIFIED: bbj-vscode/package.json "overrides" block, line ~719] | `LSPErrorCodes.RequestCancelled` (see below) | Already imported directly in `bbj-document-validator.ts` for `Diagnostic`/`DiagnosticSeverity`; not a new dependency edge |
| `vscode-languageserver-protocol` (transitive) | `3.18.2` | Source of `LSPErrorCodes` namespace | Confirmed present in `node_modules` this session (see below) |

**Installation:** none — no `npm install` needed for this phase.

**Version verification — the load-bearing new fact this phase depends on:** vscode-jsonrpc
`8.2.1`'s own `ErrorCodes` namespace (imported today from `vscode-jsonrpc/node.js` in
`java-interop.ts`) does **not** define lsp4j's `RequestCancelled` constant — that code lives in a
different namespace. Read directly this session:

```
[VERIFIED: bbj-vscode/node_modules/vscode-languageserver-protocol/lib/common/api.js:69]
LSPErrorCodes.RequestCancelled = -32800;
```
and the sibling values in the same file:
```
[VERIFIED: bbj-vscode/node_modules/vscode-languageserver-protocol/lib/common/api.js:45,53,64,69]
LSPErrorCodes.RequestFailed = -32803;
LSPErrorCodes.ServerCancelled = -32802;
LSPErrorCodes.ContentModified = -32801;
LSPErrorCodes.RequestCancelled = -32800;
```
`vscode-jsonrpc`'s own `ErrorCodes` namespace (`bbj-vscode/node_modules/vscode-jsonrpc/lib/common/messages.d.ts:27-76`), which `java-interop.ts` currently imports, only goes down to `-32000`..`-32700` (JSON-RPC reserved codes) and does not include `-32800`. **The client must import `LSPErrorCodes` from `vscode-languageserver` (already resolvable — `bbj-document-validator.ts` already imports plain `vscode-languageserver` for `Diagnostic` et al.) to check `error.code === LSPErrorCodes.RequestCancelled`, not a raw magic number and not `vscode-jsonrpc`'s `ErrorCodes`.**

## Package Legitimacy Audit

Not applicable — this phase installs no new packages. All request/response plumbing reuses
`vscode-jsonrpc` (already a direct dependency) and `vscode-languageserver`/`vscode-languageserver-protocol`
(already transitive dependencies reachable via the existing `overrides` pin, and already directly
imported elsewhere in this codebase — `bbj-document-validator.ts:4`).

## Architecture Patterns

### System Architecture Diagram

```
Editor (VS Code / IntelliJ via LSP4IJ)
   │  didOpen / didChange
   ▼
Langium DocumentBuilder.update()
   │
   ▼
BBjDocumentBuilder.buildDocuments()  ─────────────────────────────┐
   │  (after super.buildDocuments(), inside                        │
   │   `if (!this.isImportingBBjDocuments)`)                       │
   ▼                                                                │
runBbjcplForDocuments(documents, cancelToken)                       │
   │  trigger = getCompilerTrigger()                                │
   │  if 'off' → clear both BBjCPL and BBj-Parser diagnostics, return
   │  else → for each eligible doc: debouncedCompile(document)      │
   ▼                                                                │
debouncedCompile(document)  [500ms trailing-edge timer, one per doc]│
   │  on fire:                                                      │
   │   1. clear old 'BBjCPL' diagnostics                            │
   │   2. cplService.compile(path)            (existing, unchanged) │
   │   3. clear old 'BBj Parser' diagnostics   (NEW)                │
   │   4. bbjParserService.requestLiveParse(document)  (NEW)        │
   │        │                                                       │
   │        ▼                                                       │
   │   BBjParserService                                             │
   │        │  if latch === 'off' → return immediately, no request  │
   │        │  else → javaInteropService.parseProgram(params, token)│
   │        ▼                                                       │
   │   JavaInteropService.parseProgram()  (NEW thin method)         │
   │        │  reuses connect()/breaker/socket — no new transport   │
   │        ▼                                                       │
   │   ── JSON-RPC over existing socket ──▶  bbj-ls :5008 (external)│
   │        │                                                       │
   │        ◀── ParseProgramResult | ResponseError ──               │
   │        │                                                       │
   │   BBjParserService:                                            │
   │     - MethodNotFound  → latch 'off' (D-05), log once (D-07)    │
   │     - result           → latch 'on' if first time, convert     │
   │                          DTO → Diagnostic[] (coordinate         │
   │                          conversion + clamping + maxErrors cap)│
   │     - -3300x / transport → log per D-08 cadence, no diagnostic │
   │     - RequestCancelled → drop silently, no log, no diagnostic  │
   │   5. merge Diagnostic[] into document.diagnostics              │
   │   6. notifyDocumentPhase(document, Validated, ...) ─────────────┘
   ▼
textDocument/publishDiagnostics  (shared LSP channel, both IDEs)
```

### Recommended Project Structure

```
bbj-vscode/src/language/
├── bbj-cpl-service.ts        # unchanged — sibling pattern to copy
├── bbj-parser-service.ts     # NEW: BBjParserService, probe latch, coordinate converter
├── java-interop.ts           # +1 thin method: parseProgram(), +3 DTO interfaces, +1 RequestType const
├── bbj-document-builder.ts   # debouncedCompile() extended to also call the live parse
├── bbj-document-validator.ts # unchanged (Rule 0 already keys on source === 'BBjCPL', D-09 avoids it)
├── bbj-module.ts             # +1 line: compiler.BBjParserService registration
└── lsp-position.ts           # unchanged — reused for END_OF_LINE_CHARACTER clamp sentinel

bbj-vscode/test/
├── bbj-test-module.ts        # JavaInteropTestService gains an overridable parseProgram()
├── bbj-parser-service.test.ts        # NEW: probe/latch unit tests + PSRV-04 fallback test
├── parser-coordinate-converter.test.ts # NEW: PSRV-05 hand-written DTO fixture tests
└── functional/
    └── parse-program-live.test.ts    # NEW: RUN_BBJ_TESTS-gated live coordinate check
```

### Pattern 1: Probe-and-latch, per connection (answers Discretion Q1 + Q5)

**What:** A thin pass-through method on `JavaInteropService`, overridable by the test double
one-for-one; the actual latch state and mode logging live in the new `BBjParserService`.

**Where the request lives — verified reasoning, not a guess.** `JavaInteropService.connect()`,
`ensureCompleteClassIndex()`/`METHOD_NOT_FOUND`, and `clearCache()` are all **directly on**
`JavaInteropService` (read this session: `java-interop.ts:233-270` for `connect()`,
`java-interop.ts:579-611` for the latch, `java-interop.ts:1088-1136` for `clearCache()`). The
existing test double, `JavaInteropTestService` (`bbj-test-module.ts:47-138`), works by **overriding
methods by name** on the concrete `JavaInteropService` subclass — e.g. it overrides
`ensureCompleteClassIndex()` itself (`bbj-test-module.ts:77-79`) to bypass the socket entirely,
`loadClasspath()`, `loadImplicitImports()`, `resolveClassByName()`, and `connect()` (which the double
makes always-reject, `bbj-test-module.ts:108-110`).

D-14 requires the double to be **scriptable for `parseProgram`** with a default old-server
(`MethodNotFound`) answer and an opt-in script for a result list or a `-3300x` error — this can only
work cleanly if there is a **single, name-matched method to override**. If the request instead lived
entirely inside a separate `BBjParserService` that reached into `JavaInteropService`'s private
`connect()`, the test double's `connect()` override (which unconditionally rejects, to keep the
double hermetic) would produce a transport-failure shape, not the specific `MethodNotFound`/result/
`-3300x` shapes D-14 needs scripted — and the test would exercise the wrong code path (transport
failure handling, not the probe-latch logic under test).

**Recommendation:** add one thin, public method directly on `JavaInteropService` —

```typescript
// java-interop.ts, alongside the other RequestType consts at the bottom of the file
const parseProgramRequest = new RequestType<ParseProgramParams, ParseProgramResult, void>('parseProgram');

export interface ParseProgramParams {
    text: string;
    canonicalName: string;
    version: string;
    prefixes: string[];
    workspaceRoots: string[];
}
export interface ParseError {
    categories: string[];
    message: string;
    editorStartLine: number;
    editorEndLine: number;
    startCharacter: number;
    endCharacter: number;
}
export interface ParseProgramResult {
    version: string;
    errors: ParseError[];
}

// inside class JavaInteropService, mirroring getRawClass's shape (connect + sendRequest, no
// swallow-and-fallback like sendRequestSafe — the caller needs to see MethodNotFound/-3300x/
// RequestCancelled distinctly, not a collapsed fallback value)
public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
    const connection = await this.connect();
    return connection.sendRequest(parseProgramRequest, params, token);
}
```

`JavaInteropTestService` then overrides this one method directly, exactly like its existing
overrides — no socket, no `connect()` involvement, fully scriptable:

```typescript
// bbj-test-module.ts — new override, D-14
private parseProgramScript: 'method-not-found' | { errors: ParseError[] } | { code: number; message: string } = 'method-not-found';

public scriptParseProgram(script: typeof this.parseProgramScript): void {
    this.parseProgramScript = script;
}

public override async parseProgram(params: ParseProgramParams): Promise<ParseProgramResult> {
    if (this.parseProgramScript === 'method-not-found') {
        throw new ResponseError(ErrorCodes.MethodNotFound, 'Unsupported request method: parseProgram');
    }
    if ('errors' in this.parseProgramScript) {
        return { version: params.version, errors: this.parseProgramScript.errors };
    }
    throw new ResponseError(this.parseProgramScript.code, this.parseProgramScript.message);
}
```

The once-per-connection **latch** and the **mode/failure logging** live in the new
`BBjParserService`, which holds a reference to `JavaInteropService` and calls its `parseProgram()`.
This keeps `JavaInteropService` growth to one thin pass-through (consistent with its existing shape
— every other request method on it is a thin `connect()` + `sendRequest`), while the
parser-specific concerns (latch, DTO→Diagnostic conversion, clamping, cap, log cadence) live beside
`BBjCPLService` as the `compiler` service group's second member — matching the proposed file name
and the "beside `bbj-cpl-service.ts`" placement CONTEXT.md itself suggests.

### Pattern 2: Per-connection reset — no single existing hook covers both cases (answers Discretion Q1's D-06 sub-question)

**Verified finding:** there is **no existing signal on `JavaInteropService` that fires "a new
connection was just established" for both of D-06's required reset points.**

- `onConnectionRecovered()` (`java-interop.ts:315-317`) fires **only** on a half-open→closed
  transition — i.e., only after an **outage**. Its own doc comment states: "**Never fired by
  `clearCache()`**." So this alone does not cover D-06's second required reset point (a cache
  clear).
- `clearCache()` (`java-interop.ts:1088-1136`) disposes the connection and bumps
  `breakerGeneration`, but does not itself notify any listener that a **new** connection is about
  to be created — it only guarantees the *next* `connect()` call opens a fresh socket
  (`establishConnection()` at `java-interop.ts:336-353` is what actually creates a new
  `MessageConnection` object and assigns `this.connection = connection`).

**Recommendation:** add a small `connectionGeneration` counter to `JavaInteropService`, incremented
inside `establishConnection()` right after `this.connection = connection;` (`java-interop.ts:351`),
with a public getter. This single counter is bumped by **both** D-06 paths naturally — a
post-outage reconnect goes through `establishConnection()` once, and a `clearCache()`-forced
reconnect on the next `connect()` call also goes through `establishConnection()` once — because
both paths converge on the same private method that already exists. `BBjParserService` reads this
counter before each probe/request and resets its own latch when the counter differs from the value
it last saw, which is the direct, minimal implementation of D-06 ("reset whenever a new connection
is established") grounded in the one place a new connection object is actually created.

```typescript
// java-interop.ts — new field + one-line increment inside establishConnection()
private _connectionGeneration = 0;
public get connectionGeneration(): number { return this._connectionGeneration; }
// inside establishConnection(), right after: this.connection = connection;
this._connectionGeneration++;
```

### Pattern 3: Debounce hook — one timer, not two (answers Discretion Q2, Q5)

**Verified today's shape:** `debouncedCompile(document)` (`bbj-document-builder.ts:237-280`) is the
**single** per-document `setTimeout`; its callback already does clear-then-compile-then-merge-then-
notify for `bbjcpl`. D-02 requires the live parse to share this exact timer ("one timer mechanism in
one place"), not a second, independently-debounced call.

**Recommendation:** extend the existing callback body (not add a second `cplDebounceTimers`-style
map). Immediately after the existing bbjcpl clear-then-merge-then-notify block, add the parallel
clear-then-append-then-notify step for the live parser's own diagnostics, gated the same way
`runBbjcplForDocuments` already gates `bbjcpl` (`getCompilerTrigger() !== 'off'`) and the same
per-document eligibility check (`shouldCompileWithBbjcpl`, which — despite the name — is already the
shared "is this a real, open, non-external `.bbj` file" gate; D-04 explicitly says the live parse
uses "the same gate as `bbjcpl` today").

Because both the `bbjcpl` compile and the live parse now happen inside the same debounce callback,
D-04's "parsed on open as well as on edit" falls out for free: `runBbjcplForDocuments` already
iterates every document passed to `buildDocuments()`, which on `didOpen` includes the just-opened
document, exactly as it already does for `bbjcpl` — no special-casing needed.

**Merge shape — deliberately NOT `mergeDiagnostics()`.** `mergeDiagnostics()`
(`bbj-document-validator.ts:140-159`) is BBjCPL-specific: on a same-line match it **overwrites** the
existing diagnostic's `source` to `'BBjCPL'` — precisely the collapsing behaviour D-09 says the live
parser's diagnostics must NOT participate in (they need their own, distinct `source`, never
absorbed into an existing diagnostic). The live-parser merge must be a simpler
filter-then-concat:

```typescript
// inside debouncedCompile's timer callback, after the existing bbjcpl block
document.diagnostics = (document.diagnostics ?? []).filter(d => d.source !== BBJ_PARSER_SOURCE);
if (bbjParserService.isEnabled()) {
    const liveDiags = await bbjParserService.requestLiveParse(document, langServices);
    if (liveDiags.length > 0) {
        document.diagnostics = [...(document.diagnostics ?? []), ...liveDiags];
    }
}
await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
```

(A single `notifyDocumentPhase` call after both steps avoids a double publish per debounce fire.)

### Pattern 4: Failure translation and cap (answers D-08, D-12)

**`RequestCancelled` is explicitly NOT one of D-08's failure kinds.** D-08 enumerates: the five
`-3300x` application codes, transport failures (breaker open / failed connect / connection closed),
and a malformed result. `RequestCancelled` (`-32800`, see §Standard Stack) is the server's normal,
expected signal that *this* request was superseded by a newer one for the same document — per
101-MR-DESCRIPTION.md's "Versioning and supersession" section, this happens on every ordinary
overlap and is not a failure at all. Logging it at `warn` would defeat D-08's own "quiet by default"
goal and would fire routinely whenever a user types faster than a round trip. **Recommendation:**
`BBjParserService` special-cases `error.code === LSPErrorCodes.RequestCancelled` before the D-08
cadence logic runs, and returns silently (no diagnostic change, no log line at any level, matching
D-02's explicit "dropped silently, never shown").

**`maxErrors` has no existing getter — a genuine gap, not a design choice.** `setMaxErrors()`
(`bbj-document-validator.ts:35-37`) writes the module-scoped `maxErrorsDisplayed` variable but there
is **no corresponding exported getter** — `applyDiagnosticHierarchy`'s own Rule 3 cap
(`bbj-document-validator.ts:122-127`) only caps diagnostics whose `getDiagnosticTier(d) ===
DiagnosticTier.Parse` (Langium's own native parser errors, identified by
`d.data?.code === DocumentValidator.ParsingError`), not the new `'BBj Parser'`-sourced diagnostics.
D-12 requires the live parser's own errors to be capped too, "in the parser's own order, per
document." Two viable options, both grounded in the existing file:

1. Export a `getMaxErrors()` getter alongside `setMaxErrors()` in `bbj-document-validator.ts`, and
   have `BBjParserService` slice its own `ParseError[]` to that length **before** converting to
   `Diagnostic[]` (cheapest, keeps ordering trivially "the parser's own order" since it slices the
   DTO list, not the converted diagnostics).
2. Extend `getDiagnosticTier`/`applyDiagnosticHierarchy` to also recognize the new source and fold
   it into Rule 3's existing cap.

Option 1 is recommended: it is a two-line addition (mirror `getCompilerTrigger()`'s existing
getter/setter pair right above `maxErrorsDisplayed`), keeps the cap co-located with where the DTO
list is already in the parser's own order (before any merge), and does not touch
`applyDiagnosticHierarchy`'s existing, already-tested Rule 3 logic at all.

### Pattern 5: Clamping via the existing sentinel idiom (answers PSRV-05, D-11)

**`lsp-position.ts` already establishes exactly this idiom** (read this session, full file):

```typescript
[VERIFIED: bbj-vscode/src/language/lsp-position.ts:13,21]
export const LSP_MAX_UINTEGER = 2147483647;
export const END_OF_LINE_CHARACTER = LSP_MAX_UINTEGER;
```
with the doc comment: "Editors clamp an over-long end position to the actual line length, so the
rendered highlight is unaffected by using the `uinteger` maximum here instead of the real line
length." This is the established, already-in-production mechanism for D-11's "character to the
line's end" clamp — the converter does not need to compute the real line length via
`document.textDocument.getText()`; it can emit `END_OF_LINE_CHARACTER` as the character value and
rely on the same client-side clamping this codebase already depends on elsewhere (e.g.
`extractCyclicReferenceRelatedInfo` in `bbj-document-validator.ts:210-231` uses the identical
sentinel pattern for its own whole-line ranges).

For "line to the last line" (the other half of D-11): `document.textDocument.lineCount - 1` is the
zero-based index of the last valid line (`TextDocument` is the standard
`vscode-languageserver-textdocument` type, already used throughout this codebase via
`document.textDocument.offsetAt`/`positionAt`/`getText` — confirmed present in
`bbj-code-action-provider.ts`, `bbj-completion-provider.ts`, `bbj-hover.ts`,
`bbj-definition-provider.ts`, `setopts-in-code-request.ts`).

```typescript
// Sketch — bbj-parser-service.ts's coordinate converter
function toRange(error: ParseError, doc: LangiumDocument): Range {
    const lineCount = doc.textDocument.lineCount;
    const clampLine = (oneBasedLine: number) =>
        Math.min(Math.max(oneBasedLine - 1, 0), Math.max(lineCount - 1, 0));
    const startLine = clampLine(error.editorStartLine);
    const endLine = clampLine(error.editorEndLine);
    // A collapsed/invalid range spans the whole (clamped) line, per D-11.
    if (error.startCharacter <= 0 || error.endCharacter <= error.startCharacter) {
        return { start: { line: startLine, character: 0 }, end: { line: endLine, character: END_OF_LINE_CHARACTER } };
    }
    return {
        start: { line: startLine, character: Math.max(error.startCharacter - 1, 0) },
        end: { line: endLine, character: END_OF_LINE_CHARACTER } // see Common Pitfalls: do not trust endCharacter's exact value
    };
}
```

See §Common Pitfalls for why this sketch deliberately does not translate `error.endCharacter`
one-for-one.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clamping an out-of-range LSP character position | A line-length lookup + manual `Math.min` | `END_OF_LINE_CHARACTER` sentinel from `lsp-position.ts` | Already the established, tested idiom in this codebase (`extractCyclicReferenceRelatedInfo`) |
| Detecting an older `bbj-ls` | A version string comparison or a capability request | The existing `MethodNotFound`-latch pattern (`ensureCompleteClassIndex`) | D-05 explicitly forbids version comparison; the pattern is already proven and tested for `getAllClassNames` |
| Cancelling a superseded request | A `CancellationTokenSource` wired to the debounce timer | Do nothing — await and drop on `RequestCancelled` | The server's own latest-wins supersession (101-MR-DESCRIPTION.md) already guarantees a superseded caller gets `RequestCancelled`, never a stale result; D-02 explicitly says "dropped silently" |
| A second debounce timer for the live parse | A parallel `Map<string, Timeout>` in `BBjParserService` | The existing `cplDebounceTimers`/`debouncedCompile` callback, extended | D-02 mandates "one timer mechanism in one place" |
| Diagnostic merge for the new source | Reusing `mergeDiagnostics()` | A simple filter-then-concat | `mergeDiagnostics()`'s same-line collapse into `'BBjCPL'` is exactly what D-09 says must NOT happen to the new source |

**Key insight:** every mechanism this phase needs (connection lifecycle, latch pattern, debounce,
clamping) already has one working, tested implementation somewhere in this codebase. The work is
almost entirely "find the existing analog and extend it," not new design.

## Live Probe Evidence

**What was done:** with the user's explicit authorization to probe the live endpoint, a standalone
Node script (not part of the repository; written to the session scratchpad, never committed) opened
a real `vscode-jsonrpc` connection to `127.0.0.1:5008` and sent five `parseProgram` requests with
small, invented, deliberately invalid BBj text — one per PSRV-05 case plus a clean-program sanity
check — using the exact wire shape from `101-MR-DESCRIPTION.md` (`text`, `canonicalName`, `version`,
`prefixes: []`, `workspaceRoots: []`). This is a **positive falsification attempt against the real
target, with the failing/passing output pasted below** — not a hand-derived trace.

```
[VERIFIED: live probe against 127.0.0.1:5008, run this session, 2026-09-22]

=== colon-continuation ===  text: "rem comment line 1\nprint \"a\",\n:\"b\nrem line 4\n"
errors: [{ "categories": ["SyntaxError"], "message": "/tmp/probe-colon.bbj: (2): syntax error",
  "editorStartLine": 2, "editorEndLine": 2, "startCharacter": 1, "endCharacter": 12 }]

=== user-line-numbers ===  text: "10 rem first\n20 print \"unterminated\n30 rem third\n"
errors: [{ "categories": ["SyntaxError"], "message": "/tmp/probe-linenum.bbj: (2): syntax error",
  "editorStartLine": 2, "editorEndLine": 2, "startCharacter": 1, "endCharacter": 24 }]

=== crlf ===  text: "rem comment line 1\r\nprint \"a\",\r\n:\"b\r\nrem line 4\r\n"
errors: [{ "categories": ["SyntaxError"], "message": "/tmp/probe-crlf.bbj: (2): syntax error",
  "editorStartLine": 2, "editorEndLine": 2, "startCharacter": 1, "endCharacter": 12 }]

=== no-trailing-newline ===  text: "rem comment line 1\nprint \"unterminated" (no final \n)
errors: [{ "categories": ["SyntaxError"], "message": "/tmp/probe-notrailingnl.bbj: (2): syntax error",
  "editorStartLine": 2, "editorEndLine": 2, "startCharacter": 1, "endCharacter": 19 }]

=== clean-program ===  text: "rem clean program\nprint \"ok\"\n"
errors: []
```

**What this confirms, and what it does not:**

1. **1-based, physical-line counting confirmed.** `editorStartLine`/`editorEndLine` are 1-based and
   count physical source lines from the top of the buffer, in every case — including the
   user-line-number case, where the physical line beginning with the user's own `"20 "` prefix is
   still reported as editor line `2` (the 2nd physical line), *not* as BBj line `20`. The user's
   line-number text is ordinary content within the line, not consumed by the coordinate system.
2. **Colon continuation anchors to the FIRST physical line of the joined statement**, not the
   continuation line itself (`editorStartLine: 2`, not `3`, even though the syntax error is caused
   by the colon-joined `:"b` on physical line 3). The converter must map a reported error back to
   the anchor line of a colon-continuation group — this is directly relevant to how the phase's
   fixture files and the converter's expectations should be written.
3. **CRLF is transparent to the coordinate system.** The CRLF case produced byte-identical
   `editorStartLine`/`editorEndLine`/`startCharacter`/`endCharacter` values to the LF
   colon-continuation case with the same line content — `\r` is not counted as a separate character
   and does not shift positions. The client's own CRLF handling therefore only needs to matter when
   translating a *zero-based LSP line index* back into the actual editor buffer (LSP's own
   `Position.line`/`character` model is already line/character based, not offset-based, so this is
   low-risk) — not when interpreting BBj's numbers.
4. **A trailing newline is not required for correct last-line reporting.** The no-trailing-newline
   case correctly reported `editorStartLine: 2` for the actual final (unterminated) line of a
   2-line, no-final-newline document.
5. **`endCharacter` routinely exceeds the reported line's own character count — this is the
   single most important finding for PSRV-05 test design.** In 3 of the 4 error cases,
   `endCharacter` was measured 2 characters past the anchor line's own true length (e.g. the
   colon-continuation line `print "a",` is 10 characters; `endCharacter` was `12`). This was **not**
   observed in the no-trailing-newline case, where `endCharacter` (19) exactly matched the true
   line length. This is not a bug to route around — it directly validates D-11's clamp-never-drop
   policy as load-bearing for ordinary errors, not just pathological ones: **do not trust
   `endCharacter` to be `<=` the actual line length; always clamp with `END_OF_LINE_CHARACTER`
   rather than trusting the server's own end-of-range arithmetic.** (The `+2` pattern itself was not
   reverse-engineered to a general formula — it plausibly reflects how BBj's own error-recovery
   token spans a line terminator, but D-15's hand-written fixture tests should assert only that the
   **clamped, converted** range is sane, never assert an exact unclamped `endCharacter` pass-through.)
6. **A clean program returns an empty `errors` array**, matching the MR's "always present; empty on
   a clean parse, never null."

**What was NOT tested live:** multi-error documents, a `USE`/`CALL` reference error (deliberately
out of scope per the Phase 101 override), and the exact interaction between deep nested
colon-continuation chains and `editorEndLine` differing from `editorStartLine`. D-15's hand-written
DTO fixtures should cover these synthetically since the live endpoint is a shared dev resource, not
something to probe exhaustively per plan.

## Common Pitfalls

### Pitfall 1: Treating `endCharacter` as trustworthy without clamping
**What goes wrong:** A converter that does `character: error.endCharacter - 1` without clamping will
routinely produce a `Range` end position past the actual line length.
**Why it happens:** BBj's own error-recovery/token-span arithmetic does not guarantee the reported
end character stays within the physical line's true bounds (confirmed live, see above).
**How to avoid:** Always emit `END_OF_LINE_CHARACTER` for the end position rather than translating
`endCharacter` literally; let the editor's own established clamping behavior (already relied on
elsewhere in this codebase) do the work.
**Warning signs:** A PSRV-05 test that asserts an exact `endCharacter` pass-through value will be
brittle and can pass against one BBj build and fail against the next; assert the *clamped* range
instead.

### Pitfall 2: Logging `RequestCancelled` as a D-08 failure
**What goes wrong:** If `RequestCancelled` is folded into the generic transport-failure branch, the
server log gets a warn line on every ordinary fast-typing overlap — defeating D-08's "quiet by
default" and D-07's "one info line per connection" intent, and could visually resemble a real outage.
**Why it happens:** `RequestCancelled` and a genuine transport failure both arrive as a rejected
promise/`ResponseError`; without an explicit `error.code === LSPErrorCodes.RequestCancelled` check
first, generic catch-all handling conflates them.
**How to avoid:** Check for `LSPErrorCodes.RequestCancelled` (imported from `vscode-languageserver`,
not `vscode-jsonrpc`'s own `ErrorCodes` — see §Standard Stack) before applying D-08's cadence logic,
and return silently.

### Pitfall 3: Reusing `mergeDiagnostics()`/`applyDiagnosticHierarchy`'s Rule 0 unintentionally
**What goes wrong:** If the live parser's diagnostics are pushed through `mergeDiagnostics()` (the
BBjCPL-specific merge helper) instead of a plain filter-then-concat, a same-line live-parser error
would silently have its `source` overwritten to `'BBjCPL'`, which would make it invisible to Phase
103's future source-based reconciliation and would incorrectly trigger Rule 0 (BBjCPL suppresses
Langium parse errors) as a side effect never intended by D-09.
**Why it happens:** `mergeDiagnostics()` is the only existing "add a second compiler's diagnostics"
helper in the file, so it is the path of least resistance to reach for.
**How to avoid:** Use the filter-then-concat pattern shown in Pattern 3 instead; never call
`mergeDiagnostics()` with live-parser diagnostics as the second argument.

### Pitfall 4: Forgetting the double-fire risk on `hasPendingWork()`
**What goes wrong:** `hasPendingWork()` (`bbj-document-builder.ts:110-114`) is the quiescence
predicate a config-reload watcher polls before pushing a restart notification (#486); it currently
checks `hasPendingCompile()` (whether `cplDebounceTimers.size > 0`). Since Pattern 3 recommends
folding the live parse into the *same* timer map, this predicate needs no code change — but a
plan that instead adds a **second**, independent timer map for the live parse (contrary to D-02)
would silently break this quiescence guarantee unless that second map is also added to
`hasPendingWork()`.
**Why it happens:** Easy to miss because `hasPendingWork()`'s doc comment enumerates three specific
conditions and a new, uncounted timer map would not trip any of them.
**How to avoid:** Follow D-02/Pattern 3 literally — one timer map, not two — and this pitfall
disappears by construction.

### Pitfall 5: `example-files.test.ts` will reject PSRV-05 fixture files if misplaced
**What goes wrong:** Every `.bbj` file under `test/test-data/` is automatically parsed by
`example-files.test.ts` and must produce zero lexer/parser errors (confirmed in CLAUDE.md and this
session's canonical_refs). The PSRV-05 fixtures are deliberately invalid BBj.
**How to avoid:** Place fixture text as inline string literals inside the new test files
(`parser-coordinate-converter.test.ts`, `functional/parse-program-live.test.ts`), not as `.bbj` files
under `test/test-data/` — exactly as `<code_context>` in 102-CONTEXT.md already flags.

## Code Examples

### Existing latch pattern to mirror (`ensureCompleteClassIndex`)

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:579-600 (read this session, verbatim)
public async ensureCompleteClassIndex(token?: CancellationToken): Promise<boolean> {
    if (this.completeIndexResolved) {
        this.probeIfDue();
        return this.completeClassIndex !== null;
    }
    try {
        const connection = await this.connect();
        const fqns = await connection.sendRequest(getAllClassNamesRequest, {}, token);
        this.buildCompleteClassIndex(fqns);
        logger.info(() => `Loaded complete Java class index (${this.completeClassIndex!.size} distinct simple names)`);
        return true;
    } catch (e) {
        if ((e as { code?: number } | undefined)?.code === METHOD_NOT_FOUND) {
            this.completeIndexResolved = true;
            logger.debug('Interop service has no getAllClassNames; using on-demand class suggestions.');
        } else {
            logger.debug(() => 'getAllClassNames failed (will retry): ' + (e instanceof Error ? e.message : String(e)));
        }
        return false;
    }
}
```
The new `BBjParserService` latch follows the identical shape: `completeIndexResolved` becomes a
per-`connectionGeneration` latch (Pattern 2), and the `MethodNotFound`/other-error branching is the
same `(e as {code?:number})?.code === METHOD_NOT_FOUND` idiom, reusing the same `METHOD_NOT_FOUND`
constant already declared at the bottom of `java-interop.ts:1281`.

### Existing debounce-driving test pattern to mirror for the PSRV-04 test

```typescript
// Source: bbj-vscode/test/document-builder.test.ts:151-166 (read this session, verbatim)
test('debouncedCompile coalesces rapid successive calls into one compile after the debounce window', async () => {
    vi.useFakeTimers();
    const { builder, compileMock } = buildHarness();
    compileMock.mockResolvedValue([]);

    const doc = fakeDocument('/proj/rapid.bbj');
    const privates = builder as unknown as BuilderPrivates;
    privates.debouncedCompile(doc);
    privates.debouncedCompile(doc);
    privates.debouncedCompile(doc);

    await vi.advanceTimersByTimeAsync(600);

    expect(compileMock).toHaveBeenCalledOnce();
});
```
This confirms `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(600)` reliably drives the exact
500 ms debounce this phase reuses — answering CONTEXT.md's Discretion Q5 ("whether the debounce
timer can be driven with fake timers"): **yes, this is an established, working pattern in this
codebase**, not a new technique to prove out.

### Existing live-gated test pattern to mirror for D-15's gated coordinate check

```typescript
// Source: bbj-vscode/test/functional/issue447-real-interop.test.ts:17-46 (read this session, verbatim structure)
describe('... (real interop)', async () => {
    const run = await shouldRunBBjTests();
    const services = createBBjServices(NodeFileSystem);
    const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

    beforeAll(async () => {
        if (!run) return;
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);
    }, 120000);

    test.runIf(run)('...', async () => {
        // ... exercise the live service, using parseHelper — NEVER DocumentBuilder.build (memory:
        // build triggers CPL/interop on :5008 and fails on GitHub / is flaky locally)
    }, 60000);
});
```
The new `functional/parse-program-live.test.ts` follows this exact shape: `shouldRunBBjTests()` +
`describe(..., async () => {...})` + `test.runIf(run)`, `setConnectionConfig('127.0.0.1', 5008)`,
and — critically — calling `services.BBj.java.JavaInteropService.parseProgram(...)` (or the new
`BBjParserService`) directly rather than driving a full document build, since this phase's live
check is about coordinate conversion, not full validation pipeline behaviour.

### Existing JavaInteropTestService override shape to extend for D-14

```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:73-123 (read this session, verbatim structure)
// --- Hermetic: the test double must never open a real socket to the interop service. ---
protected override connect(): Promise<MessageConnection> {
    return Promise.reject(new Error('Java interop is disabled in the test double'));
}
public override async loadClasspath(): Promise<boolean> { return false; }
public override async resolveClassByName(className: string): Promise<JavaClass> {
    return this.getResolvedClass(className) ?? this.stubClass(className);
}
```
The new `parseProgram` override (Pattern 1's sketch above) follows this file's own established
convention of overriding methods by exact name on the concrete subclass, never touching `connect()`
for the new capability (since `connect()`'s existing override already unconditionally rejects, and
must keep doing so for every other request path).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Save-time-only diagnostics (`bbjcpl` on save/debounce) | Live, no-save-needed diagnostics via `parseProgram` while the endpoint is present | This phase (BBj 26.03+) | PSRV-03; the save-time path is kept unchanged (D-03) as a fallback and remains the only path pre-26.03 |
| Version-string capability detection (considered and rejected in Phase 101/102 design) | Probe-by-calling, latch on `MethodNotFound` | Locked by D-05/PSRV-04 | No BBj-version parsing anywhere in the client; matches `ensureCompleteClassIndex`'s already-shipped precedent |

No deprecated/outdated approach is being replaced in-place; this is additive.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact `+2` `endCharacter` overshoot pattern observed in 3/4 live-probe cases reflects BBj's own error-recovery token span rather than a bug that could change between BBj builds | §Live Probe Evidence | Low — the recommended converter never depends on the exact overshoot value; it always clamps with `END_OF_LINE_CHARACTER` regardless of magnitude, so this assumption affects test-design intuition only, not converter correctness |
| A2 | `document.uri.fsPath` is the right `canonicalName` value to send (matching what the prefix algorithm and `shouldCompileWithBbjcpl`'s own file-path key already use) | §Architecture Patterns Pattern 1 | Low — this is stated as a CONTEXT.md discretion default, not independently re-derived from `bbj-ls` source in this session; if the endpoint's `canonicalName` matching (documented as "exact string equality — not case-folded, not Unicode-normalized" in 101-MR-DESCRIPTION.md) needs a different path form (e.g. normalized casing on Windows), reference resolution would silently mismatch — low risk since referenced-program resolution is already out of scope per the Phase 101 override |
| A3 | `Diagnostic.code` accepting `integer | string` (confirmed from `vscode-languageserver-types`) is rendered usefully by both VS Code and IntelliJ/LSP4IJ without further client-side work | §Architecture Patterns Pattern 4 | Low — this is passive rendering, already exercised for every other diagnostic's `code` field; no phase-specific risk |

## Open Questions

1. **Exact `BBjParserService` constructor wiring / circular-import risk between `bbj-module.ts`, `bbj-parser-service.ts`, and `java-interop.ts`.**
   - What we know: `BBjCPLService`'s constructor takes a minimal structural interface
     (`BBjCPLServiceContext`) specifically to avoid a `bbj-module.ts ↔ bbj-cpl-service.ts` circular
     import (documented in `bbj-cpl-service.ts:9-16`).
   - What's unclear: whether `BBjParserService` needs the full `BBjServices` type (to reach
     `services.java.JavaInteropService`) or should use the same minimal-structural-interface trick.
   - Recommendation: mirror `BBjCPLService`'s existing minimal-interface pattern exactly — it is a
     proven solution to the identical problem in the identical service group.

2. **Whether `BBjParserService` needs its own `RequestType` import or should reuse the one declared in `java-interop.ts`.**
   - What we know: the `RequestType` const and DTO interfaces are best declared once in
     `java-interop.ts` (see Pattern 1) since that is where `JavaInteropService.parseProgram()` calls
     `connection.sendRequest(parseProgramRequest, ...)`.
   - What's unclear: nothing structurally — `BBjParserService` only needs the DTO interfaces (`ParseProgramParams`, `ParseProgramResult`, `ParseError`), which should be exported from `java-interop.ts` alongside the other DTO interfaces already at the bottom of that file (`ClassInfoParams`, `PackageInfoParams`, `ClassPathInfoParams`).
   - Recommendation: no open risk; noted for the planner's task-boundary precision only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| BBjServices on `127.0.0.1:5008` with the Phase 101 `bbj-ls` jar | Live probe, D-15's gated test, hand UAT (endpoint-present half) | ✓ (confirmed via live probe this session) | Phase 101 jar deployed 2026-09-22, `bbj-ls` at branch `feat/689-parse-program-endpoint` | — |
| Backed-up pre-endpoint `bbj-ls` jar (26.02) | Hand UAT "older BBj" half, D-16 | ✓ per 101-CONTEXT.md D-17 (backed up outside `/opt/bbx/.lib/bbjls/`) — not independently re-verified this session | 26.02, build 2026-09-01 | — |
| Node 22 (langium generate) vs Node 24 (`node` default on this box) | `npm run langium:generate` if the grammar needs touching (it does not, for this phase) | Node 24 confirmed as default (`node --version` → v24.20.0) this session; memory records Node 24 breaks `langium:generate` | — | Use `nvm`/an explicit Node 22 invocation only if a grammar change becomes necessary (not expected — this phase adds no grammar rules) |
| `RUN_BBJ_TESTS` gate / port 5008 reachability check | D-15's gated live test, `test:bbj` | ✓ (port open, confirmed via the live probe connecting successfully) | — | Test is `test.runIf(run)`-skipped automatically when unreachable, per existing `shouldRunBBjTests()` |

**Missing dependencies with no fallback:** none identified.

**Missing dependencies with fallback:** none beyond the Node-version note above, which does not block this phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.10` [VERIFIED: bbj-vscode/package.json devDependencies] |
| Config file | none dedicated — `npx vitest run <file>` from `bbj-vscode/` per CLAUDE.md |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/bbj-parser-service.test.ts test/parser-coordinate-converter.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (whole-suite gate: judge on `numFailedTests: 0`, per the standing v4.1 decision — memory: hook timeouts with `numFailedTests: 0` are `initializeWorkspace` `beforeAll` contention, not failures) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PSRV-03 | Live diagnostics appear while typing when the endpoint is present | integration (hermetic, scripted double) | `npx vitest run test/bbj-parser-service.test.ts -t "publishes a live diagnostic"` | ❌ Wave 0 |
| PSRV-04 | Old-server / no-connection fallback: no live diagnostic, `bbjcpl` unaffected, one "off" log line, no error | integration (hermetic, scripted double, default `MethodNotFound`) | `npx vitest run test/bbj-parser-service.test.ts -t "PSRV-04"` | ❌ Wave 0 |
| PSRV-05 | Correct editor range for colon continuation, user line numbers, CRLF, no trailing newline | unit (hand-written `ParseError` DTO fixtures) | `npx vitest run test/parser-coordinate-converter.test.ts` | ❌ Wave 0 |
| PSRV-05 (confirmatory) | Same four cases against the real endpoint | integration, `RUN_BBJ_TESTS`-gated | `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` | ❌ Wave 0 |
| PSRV-08 | A `-3300x`/transport/malformed failure never becomes a diagnostic | unit/integration (scripted double, each failure kind) | `npx vitest run test/bbj-parser-service.test.ts -t "never a diagnostic"` | ❌ Wave 0 |
| PSRV-09 | One mode log line per connection; docs state BBj 26.03+ | unit (log spy) + manual doc review | `npx vitest run test/bbj-parser-service.test.ts -t "logs the mode exactly once"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run test/bbj-parser-service.test.ts test/parser-coordinate-converter.test.ts`
- **Per wave merge:** `npm test` (whole suite, `RUN_BBJ_TESTS` unset — the default local-detection mode)
- **Phase gate:** Full suite green (`numFailedTests: 0`, known baseline: 11 `linking.test.ts` interop tests + `issue447` per the documented local-drift baseline) before `/gsd-verify-work`; additionally run `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` once against the live endpoint before closing the phase.

### Wave 0 Gaps
- [ ] `test/bbj-parser-service.test.ts` — covers PSRV-03, PSRV-04, PSRV-08, PSRV-09 (probe/latch, connection-generation reset, failure-cadence logging, hermetic double scripting)
- [ ] `test/parser-coordinate-converter.test.ts` — covers PSRV-05 (hand-written DTO fixtures, D-11 clamping cases)
- [ ] `test/functional/parse-program-live.test.ts` — covers PSRV-05's live confirmatory check, `RUN_BBJ_TESTS`-gated
- [ ] `bbj-vscode/test/bbj-test-module.ts` — extend `JavaInteropTestService` with the scriptable `parseProgram()` override (D-14); this is shared fixture infrastructure, not a standalone test file, but is a genuine Wave 0 prerequisite for every test above
- Framework install: none — Vitest is already installed and configured

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | The endpoint joins the existing unauthenticated localhost-only interop socket; no new auth boundary is introduced by this phase (client-side only) |
| V3 Session Management | No | Not applicable — stateless per-request client calls |
| V4 Access Control | No | No new access-control surface; the client only reads/sends text already resident in the editor |
| V5 Input Validation | Partial | The client constructs `ParseProgramParams` from trusted, already-open-in-editor document text and workspace-derived paths; no external/untrusted input is newly accepted by this phase. The one input-validation-relevant surface is trusting the **server's** response shape (`ParseError[]`) — see Pitfall 1 (do not trust `endCharacter` blindly) and note below |
| V6 Cryptography | No | No cryptographic material handled |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/out-of-range response fields causing an invalid LSP `Position` to be emitted to the client, which — per `lsp-position.ts`'s own documented rationale — can make an LSP4IJ Java client's JSON deserializer **reject the entire publish-diagnostics message**, silently hiding *all* diagnostics for that document (not just the malformed one) | Tampering / Denial of Service (of diagnostics, not the process) | Always clamp with `END_OF_LINE_CHARACTER`/`LSP_MAX_UINTEGER` rather than passing a server-supplied value through uncapped; never emit a negative line/character. This is exactly why `lsp-position.ts`'s bound exists (documented reason: a JVM `int` overflow on the LSP4IJ side) and is directly relevant here since this phase is the first to consume a *new*, externally-computed coordinate source (BBj's own parser) rather than Langium's internally-consistent one |
| A malformed/unexpected JSON-RPC error shape from `parseProgram` (e.g., missing `code`) being mishandled and thrown uncaught, crashing the debounce callback | Denial of Service (of this feature only, not the LS process — errors inside `debouncedCompile`'s timer callback are already caught and logged per `bbj-document-builder.ts`'s existing `catch (e) { logger.error(...) }` pattern, confirmed present in `debouncedCompile`) | Reuse the existing try/catch wrapper already present in `debouncedCompile`'s timer body; do not add a second unguarded async call outside it |

No new trust boundary is crossed by this phase — 101-MR-DESCRIPTION.md's own "Trust boundary"
section already establishes that `parseProgram` joins an existing unauthenticated localhost socket
with no new privilege implications, and this phase adds no new listener, no new port, and no new
credential handling on the client side.

## Documentation Changes

Exact current text, read this session, that the planner should edit (D-13):

**`documentation/docs/vscode/getting-started.md`** (and the identical structure in
`documentation/docs/intellij/getting-started.md`, only "Visual Studio Code"/"IntelliJ IDEA"
differ):
```
[VERIFIED: documentation/docs/vscode/getting-started.md:10-15]
## Prerequisites

Before installing the extension, ensure you have:

- **Visual Studio Code** version 1.67.0 or higher
- **BBj** version 25.00 or higher installed
```
Add one line beneath the existing BBj bullet stating live compiler diagnostics need BBj 26.03+
(D-13's exact wording is Claude's discretion).

**`documentation/docs/vscode/index.md`** / **`documentation/docs/intellij/index.md`**:
```
[VERIFIED: documentation/docs/vscode/index.md:30-36]
## Requirements

- **VS Code** 1.67.0 or higher
- **BBj** 25.00 or higher
- **BBjServices** running locally
- **Java 17** or higher
```
```
[VERIFIED: documentation/docs/intellij/index.md:30-37]
## Requirements

- **IntelliJ IDEA** 2024.2 or higher (Community or Ultimate)
- **BBj** 25.00 or higher
- **BBjServices** running locally
- **Java 17** or higher
- **Node.js 22** or higher (auto-detected from PATH, or auto-downloaded by plugin)
```
Add the same one-liner to both.

**`documentation/docs/vscode/features.md`** — existing `## Validation and Diagnostics` section to
extend (do not replace):
```
[VERIFIED: documentation/docs/vscode/features.md:39-48]
## Validation and Diagnostics

Real-time error detection:

- **Syntax Errors**: Invalid BBj syntax
- **Undefined References**: Missing variables, labels, or classes
- **Access Violations**: Incorrect access to class members
- **Type Mismatches**: Incompatible type operations

Errors appear as you type with detailed messages and quick fixes where available.
```
**`documentation/docs/intellij/features.md`** has the identical heading at a different line number
(`## Validation and Diagnostics` at line 43, confirmed via this session's heading scan) plus a
separate `## Java Interop` → `### Requirements` section (line 137/147) that already documents the
BBjServices dependency — the new "Live compiler diagnostics" paragraph (D-13) should sit near
`## Validation and Diagnostics` in both files, not inside `## Java Interop`, since D-13 specifies "a
short 'Live compiler diagnostics' entry" as its own addition, not a rewrite of the existing bullet
list.

## Sources

### Primary (HIGH confidence)
- `bbj-vscode/src/language/java-interop.ts` — full file read this session (connect/breaker/latch/clearCache/sendRequestSafe)
- `bbj-vscode/src/language/bbj-document-builder.ts` — full file read this session (buildDocuments/debouncedCompile/shouldCompileWithBbjcpl/hasPendingWork)
- `bbj-vscode/src/language/bbj-document-validator.ts` — full file read this session (diagnostic tiers, mergeDiagnostics, applyDiagnosticHierarchy, maxErrors)
- `bbj-vscode/src/language/bbj-cpl-service.ts`, `bbj-module.ts`, `bbj-ws-manager.ts`, `lsp-position.ts`, `logger.ts`, `bbj-notifications.ts` — full files read this session
- `bbj-vscode/test/bbj-test-module.ts`, `test/test-helper.ts`, `test/document-builder.test.ts`, `test/java-interop-service.test.ts`, `test/functional/issue447-real-interop.test.ts` — read this session for test-pattern precedent
- `bbj-vscode/node_modules/vscode-jsonrpc/lib/common/messages.d.ts`, `vscode-languageserver-protocol/lib/common/api.d.ts` and `.js` — read this session for the `RequestCancelled`/`LSPErrorCodes` numeric-value finding
- `bbj-vscode/node_modules/vscode-languageserver-types/lib/esm/main.d.ts` — read this session for `Diagnostic.code` type
- `documentation/docs/{vscode,intellij}/{getting-started,index,features}.md` — read this session, exact current text quoted above
- Live probe against `127.0.0.1:5008` (`parseProgram`), run this session — see §Live Probe Evidence for full output
- `101-MR-DESCRIPTION.md`, `101-CONTEXT.md`, `101-VERIFICATION.md`, `101-REVIEW.md`, `102-CONTEXT.md`, `REQUIREMENTS.md`, `STATE.md`, `CLAUDE.md` — read this session in full

### Secondary (MEDIUM confidence)
None used beyond what is captured as Primary — no external web documentation was needed for this
phase; the entire domain is this repository's own established patterns plus the endpoint contract
document.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; exact installed versions confirmed from `package.json` and `node_modules`
- Architecture: HIGH — every pattern grounded in code read this session, with file:line citations
- Pitfalls: HIGH — derived from the live probe's actual output plus direct code reading, not speculation
- PSRV-05 coordinate convention: HIGH for the qualitative behaviour (1-based, physical-line, CRLF-transparent, clamp-needed); MEDIUM for the exact numeric overshoot pattern (see Assumption A1) — D-15's own hand-written-fixture-plus-gated-live-test design already accounts for this by not requiring the planner to hard-code exact numbers

**Research date:** 2026-09-22
**Valid until:** 30 days (stable, in-repo-only domain; the one time-sensitive fact — the live endpoint's exact coordinate arithmetic — is independently re-verified by this phase's own D-15 gated test on every run, so staleness risk here is self-correcting)
