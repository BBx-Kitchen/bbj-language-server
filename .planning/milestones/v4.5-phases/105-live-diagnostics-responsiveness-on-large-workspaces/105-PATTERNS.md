# Phase 105: Live Diagnostics Responsiveness on Large Workspaces - Pattern Map

**Mapped:** 2026-09-23
**Files analyzed:** 5 (all modified, no new files — RESEARCH.md's Recommended Project Structure confirms no new files)
**Analogs found:** 5 / 5 (all self-referential — every changed file is its own best analog: the new code extends an existing class/module using that module's own established idioms)

## File Classification

| Changed File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-document-builder.ts` | service (Langium `DocumentBuilder` override) | event-driven (LSP document events → debounced compile) | itself — `debouncedCompile()`/`runBbjcplForDocuments()` (existing event-driven-ish cycle) | exact (same file, same class, extend not replace) |
| `bbj-vscode/src/language/bbj-parser-service.ts` | service (interop request wrapper) | request-response (JSON-RPC over socket) | itself — `requestLiveParse()`, `isEnabled()`/latch | exact |
| `bbj-vscode/src/language/java-interop.ts` | service (transport/connection manager) | request-response + streaming (persistent socket, JSON-RPC) | itself — `connect()`/`establishConnection()`/breaker (template for 2nd connection) | exact |
| `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` | utility (pure reconciliation/state module) | transform (list-in, list-out; `WeakMap`/`Map` state) | itself — `rememberLangiumDiagnostics`/`recallLangiumDiagnostics`, `verdictStateByUri` | exact |
| `bbj-vscode/src/language/bbj-document-validator.ts` | validator (Langium validator hook) | request-response (validate → publish) | itself — `validateDocument()` | exact |
| `bbj-vscode/test/document-builder.test.ts` | test | unit (harness-based) | itself — `buildHarness()`'s fake `TextDocuments`/`ServiceRegistry` | exact |
| `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` | test | unit | (not read this session; same package, same conventions as `bbj-diagnostic-reconciliation.ts`'s exported pure functions) | role-match |
| `bbj-vscode/test/java-interop-service.test.ts` | test | unit | `document-builder.test.ts`'s harness style (mock socket/connection likely already present in this file; not read this session) | role-match |

No file in this phase has zero analog — every touched module already contains the pattern its own extension must follow. RESP-05's `105-MEASUREMENT.md` is a documentation deliverable, not source; no pattern search applies to it (mirrors `102-`/`103-`-era MEASUREMENT/runbook docs per D-11/D-13).

## Pattern Assignments

### `bbj-vscode/src/language/bbj-document-builder.ts` (service, event-driven) — NEW listener wiring (D-01/D-02/D-03)

**Analog:** itself, constructor + `debouncedCompile()` + `runBbjcplForDocuments()`

**Constructor pattern to extend** (lines 75-79):
```typescript
constructor(services: LangiumSharedCoreServices) {
    super(services);
    this.wsManager = () => services.workspace.WorkspaceManager;
    this.fileSystemProvider = services.workspace.FileSystemProvider
}
```
RESEARCH.md's Pattern 1 shows the exact addition shape (store `services.workspace.TextDocuments`, subscribe `onDidOpen`/`onDidChangeContent` directly in the constructor — do NOT route through `super.update()`/`workspaceLock`).

**Gate to reuse unchanged** (lines 228-243, `shouldCompileWithBbjcpl`): the new event listener must call this exact predicate before arming anything — do not duplicate its four checks (open-in-editor, `file:` scheme, not-synthetic, not-external).

**Debounce/publish cycle to call, not reimplement** (lines 287-393, `debouncedCompile()`): D-03 requires the event path and the rebuild path to arm the *same* `cplDebounceTimers` map via this *same* method. The new listener's entire job is calling this with a document reference whose `textDocument` resolves to live text (Pitfall 1 in RESEARCH.md — read from `TextDocuments.get(uri)`, not `LangiumDocument.textDocument`, until genuinely rebound).

**`trigger === 'off'` handling to mirror** (lines 190-207 inside `runBbjcplForDocuments`): the event path must respect `off` the same way — check `getCompilerTrigger()` before arming, matching this branch's `clearAllVerdictStates()` + diagnostic-strip shape.

**Error handling / detached-timer safety to mirror** (lines 383-389): every debounce timer callback wraps its body in try/catch and logs via `logger.error`, "so an uncaught throw here would surface as an unhandled promise rejection... instead of being caught in-context (P61-D2-017)". Any new timer/listener callback must follow this same discipline.

**Stale-guard idiom for D-07** (lines 321, 327):
```typescript
const versionBeforeRequest = document.textDocument.version;
// ... await request ...
if (liveOutcome?.kind === 'verdict' && document.textDocument.version === versionBeforeRequest) { /* reconcile */ }
```
Extend this same idiom (version-tagged snapshot, Pattern 3 in RESEARCH.md) rather than introducing a serializing queue.

**`hasPendingWork()`/`hasPendingCompile()` to verify, not extend by default** (lines 102-126): per RESEARCH.md Pitfall 4, if the new listener reuses `debouncedCompile()`'s `cplDebounceTimers` bookkeeping, these predicates already report correctly with no new field — write a test first, only add state if it fails.

---

### `bbj-vscode/src/language/bbj-parser-service.ts` (service, request-response) — text/version sourcing for early calls (D-04)

**Analog:** itself, `requestLiveParse()` (lines 241-275) and the latch (`isEnabled()`/`resetIfGenerationChanged()`, lines 203-230)

**Core request pattern to keep unchanged**:
```typescript
public async requestLiveParse(document: LangiumDocument): Promise<LiveParseOutcome> {
    this.resetIfGenerationChanged();
    const generation = this.javaInteropService.connectionGeneration;
    const params: ParseProgramParams = {
        text: document.textDocument.getText(),
        canonicalName: document.uri.fsPath,
        version: String(document.textDocument.version),
        prefixes: this.resolvePrefixes(),
        workspaceRoots: this.resolveWorkspaceRoots()
    };
    try {
        const result = await this.javaInteropService.parseProgram(params);
        // ... MethodNotFound -> latchOff; RequestCancelled -> 'cancelled'; else -> 'failed'/'verdict'
    } catch (e) { /* ... */ }
}
```
This method's signature/shape does not need to change for D-01/D-02 — only its *caller* changes (armed earlier). Pitfall 1 in RESEARCH.md is the one real risk here: `document.textDocument.getText()` must be the live text, so whatever the new listener passes in must already be rebound.

**Latch/probe pattern to mirror for the second connection (D-09's "does a second connection have the endpoint")**: `resetIfGenerationChanged()` (lines 218-230) and `latchOn`/`latchOff` (lines 293-311) are the exact template RESEARCH.md's Don't-Hand-Roll table names for probing a fresh connection — reuse this class/shape, keyed on whichever connection's own `connectionGeneration`, rather than inventing a new capability-probe mechanism.

---

### `bbj-vscode/src/language/java-interop.ts` (service, transport) — dedicated `parseProgram` connection (D-09/D-10)

**Analog:** itself, `connect()`/`establishConnection()`/breaker fields (lines 246-410) and `parseProgram()` (lines 456-469)

**Connect/breaker template to duplicate for the second connection**:
```typescript
protected async connect(): Promise<MessageConnection> {
    if (this.connection) return this.connection;
    if (this.breakerState === 'open') { /* cooldown check, half-open probe */ }
    if (this.connectingPromise) return this.connectingPromise;
    // ... establishConnection(), onConnectAttemptSettled tracking ...
}

private async establishConnection(): Promise<MessageConnection> {
    const socket = await this.createSocket();
    const connection = this.wrapSocket(socket);
    connection.onClose(() => { if (this.connection === connection) this.connection = undefined; });
    connection.onError(() => { if (this.connection === connection) this.connection = undefined; });
    connection.listen();
    this.connection = connection;
    this._connectionGeneration++;
    return connection;
}
```
RESEARCH.md's Alternatives-Considered table explicitly recommends reusing this class's existing private `interopHost`/`interopPort` fields (set once via `setConnectionConfig`, line 384-388) rather than a new `ParserConnectionService` class.

**`parseProgram` call site to change** (lines 456-469): today it rides the single shared `connection` via `this.connect()`. D-09 needs a second private field (e.g. `parseConnection`) with its own lazily-opened socket, and D-10's fallback: if the dedicated connection can't open, fall back to `this.connect()` (the shared one), logged once — mirroring the single-popup-per-outage discipline already used at lines 305-316 (`notifyJavaConnectionError` fires once on the closed→open transition, not on every failure).

**Reset-on-clear pattern to extend for D-06's constraint** ("a reset of either connection clears verdict state"): `clearCache()` (lines 1117-1170) already bumps `breakerGeneration`/`_connectionGeneration` and disposes `this.connection`. The dedicated connection needs the same treatment inside this same method — dispose it, bump whatever generation field it shares or owns (Claude's Discretion item 2), so `BBjParserService.resetIfGenerationChanged()` picks up the change.

**Method-not-found / error classification to reuse unchanged**: `METHOD_NOT_FOUND` (line 1322) and `isInteropTransportFailure()` (lines 74-85) apply identically to results/errors arriving over the second connection — no new error taxonomy needed.

---

### `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` (utility, transform) — version-tagged snapshot (D-04/D-07)

**Analog:** itself, `rememberLangiumDiagnostics`/`recallLangiumDiagnostics` (lines 239-249) and `clearVerdictState`/`clearAllVerdictStates` (lines 222-230)

**Current storage shape to extend**:
```typescript
const rememberedDiagnosticsByDocument = new WeakMap<LangiumDocument, Diagnostic[]>();

export function rememberLangiumDiagnostics(document: LangiumDocument, diagnostics: Diagnostic[]): void {
    rememberedDiagnosticsByDocument.set(document, diagnostics);
}
export function recallLangiumDiagnostics(document: LangiumDocument): Diagnostic[] | undefined {
    return rememberedDiagnosticsByDocument.get(document);
}
```
RESEARCH.md's Open Question 1 recommends extending this `WeakMap`'s value to `{ diagnostics, version }` (not a parallel map) — it is already correctly scoped to the `LangiumDocument` object's own lifecycle. This is the one call site (`bbj-document-validator.ts:235`) plus every reader (`bbj-document-builder.ts:332`, `:624`) that must be touched together.

**Uri-keyed lifecycle pattern to keep separate**: `verdictStateByUri`-style maps (implied by `clearVerdictState(uri)`) are deliberately keyed by uri, not by `LangiumDocument` object identity, because verdict state must forget on document *close* — the module's own doc comment (lines 232-237) explains exactly why the two storage shapes (uri-keyed vs. object-keyed `WeakMap`) must stay distinct. Do not collapse them.

---

### `bbj-vscode/src/language/bbj-document-validator.ts` (validator, request-response) — remember version alongside pre-hierarchy list

**Analog:** itself, `validateDocument()` (referenced at RESEARCH.md's canonical_refs, lines 226-250 in that file) which already calls `rememberLangiumDiagnostics(document, ...)` unconditionally before validation completes.

Because this file was not read verbatim this session (budget), the concrete call site is cited by line range from RESEARCH.md's own verified reading: `bbj-document-validator.ts:235` is `rememberLangiumDiagnostics`'s one call site. Any `{ diagnostics, version }` extension to the `WeakMap` value (see above) must update this call to pass `document.textDocument.version` alongside the list — mirroring the exact same `versionBeforeRequest` capture idiom already used in `bbj-document-builder.ts:321`.

---

### Test files — `bbj-vscode/test/document-builder.test.ts`

**Analog:** itself, `buildHarness()` (lines 35-79) and `fakeDocument()` (lines 81-88)

**Harness pattern to extend for D-12(a) (held-lock test)**:
```typescript
const openDocumentUris = new Set<string>();
const fakeTextDocuments = {
    get: (uri: URI) => (openDocumentUris.has(uri.toString()) ? {} : undefined),
    // NEW for 105: onDidOpen, onDidChangeContent — Emitter-shaped (per RESEARCH.md Code Examples)
};
```
`requestLiveParseMock`/`isEnabledMock` (lines 41-42) are already scriptable `vi.fn()`s standing in for `BBjParserService` — D-12's interleaving tests (D-07) can drive these mocks to return verdicts in either order relative to a scripted `validateDocument()`/`recallLangiumDiagnostics` call, without a real workspace build.

**Document fake to extend for text-freshness assertions (Pitfall 1's regression test)**:
```typescript
function fakeDocument(path: string, diagnostics: Diagnostic[] = [], text = ''): LangiumDocument {
    const uri = URI.file(path);
    return {
        uri, diagnostics,
        textDocument: TextDocument.create(uri.toString(), 'bbj', 1, text),
    } as unknown as LangiumDocument;
}
```
A version-bump test (open with valid text, then simulate an edit before the initial "build" settles) reuses `TextDocument.create(..., version, text)` with an incremented `version` argument — no new fixture machinery needed.

## Shared Patterns

### Detached-callback error safety (P61-D2-017)
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts:383-389`
**Apply to:** Any new `setTimeout`/event-listener callback added for D-02/D-03 (the event-armed cycle) and any new connection-open/retry logic added for D-09/D-10.
```typescript
try {
    // ... async work ...
} catch (e) {
    logger.error(`... failed for ${key}: ${e}`);
}
```
Never let a detached async callback throw uncaught.

### Version-stamped stale-guard (D-07's core mechanism)
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts:321,327`
**Apply to:** Every new writer of `document.diagnostics` (the event-armed cycle, and `validateDocument()`'s carry-over step per D-05).
```typescript
const versionBeforeRequest = document.textDocument.version;
// ... await request ...
if (result && document.textDocument.version === versionBeforeRequest) { /* apply */ }
```

### Once-per-generation latch (probe/breaker reuse for D-09)
**Source:** `bbj-vscode/src/language/bbj-parser-service.ts:218-230,293-311`; `bbj-vscode/src/language/java-interop.ts:212-215,295-316`
**Apply to:** The second `MessageConnection`'s capability probe and its D-10 fallback logging (log once per outage/generation, not once per request).

### Single-publish-per-cycle discipline
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts:378-382` — `notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None)` called exactly once at the end of the debounce callback, using `CancellationToken.None` (not the original build's token, which may be stale after the debounce).
**Apply to:** Any new code path that publishes diagnostics from an event-armed cycle — never publish partial/intermediate state mid-cycle.

## No Analog Found

None — every file this phase touches already contains the exact pattern (or its closest structural sibling) its own extension must follow; RESEARCH.md's "no new files" project structure and its Don't-Hand-Roll table both independently confirm this. `105-MEASUREMENT.md` (D-13) is a documentation deliverable outside the scope of source-pattern mapping.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/{bbj-document-builder,bbj-parser-service,java-interop,bbj-diagnostic-reconciliation,bbj-document-validator}.ts`, `bbj-vscode/test/document-builder.test.ts`
**Files scanned/read in full this session:** `bbj-document-builder.ts`, `java-interop.ts`, `bbj-parser-service.ts:150-320`, `bbj-diagnostic-reconciliation.ts:220-280`, `document-builder.test.ts:1-100` (plus RESEARCH.md's own verified line citations for `bbj-document-validator.ts` and `documents.js`/Langium internals, not re-read here to avoid duplicate reads)
**Pattern extraction date:** 2026-09-23
