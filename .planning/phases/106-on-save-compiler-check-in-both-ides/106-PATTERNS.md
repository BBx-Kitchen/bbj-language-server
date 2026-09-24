# Phase 106: On-Save Compiler Check in Both IDEs - Pattern Map

**Mapped:** 2026-09-24
**Files analyzed:** 15 (modified, no new files — this phase extends existing modules only)
**Analogs found:** 15 / 15 (all in-file — every "analog" is the existing code the same file must be extended from; no separate donor file needed anywhere)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-module.ts` (or a new sibling e.g. `bbj-document-update-handler.ts`) | service (DI override) | event-driven | Langium's `DefaultDocumentUpdateHandler` (`node_modules/langium/src/lsp/document-update-handler.ts`) | role-match (base class to override, not an in-repo peer) |
| `bbj-vscode/src/language/bbj-document-builder.ts` | service (build orchestration) | event-driven | itself — `armLiveParseFromEvent`/`armLiveParseForDocument`/`runBbjcplForDocuments`/`debouncedCompile` | exact (self-extension) |
| `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` | utility (pure diagnostic composition) | transform | itself — `composeWithVerdict`, `applyVerdictCarryOver`, `lineSpansOverlap`, `syntaxComplaintKey` | exact (self-extension) |
| `bbj-vscode/src/language/bbj-document-validator.ts` | service (validation wiring) | transform | itself — `mergeDiagnostics`, `applyDiagnosticHierarchy`, `getCompilerTrigger`/`setCompilerTrigger` | exact (self-extension) |
| `bbj-vscode/src/language/java-interop.ts` | service (JSON-RPC client) | request-response | itself — `parseProgram`, `connect`, `parseLaneConnection`, `openParseLane` | exact (self-extension) |
| `bbj-vscode/src/language/main.ts` | config/wiring | event-driven | itself — `onDidChangeConfiguration` trigger handling (lines ~180-250) | exact (self-extension) |
| `bbj-vscode/src/language/bbj-ws-manager.ts` | config (init options) | request-response | itself — `onInitialize` literal-allowlist parsing (lines ~108-111) | exact (self-extension) |
| `bbj-vscode/src/extension.ts` | client wiring (VS Code) | config | itself — `initializationOptions`/`synchronize` block (lines ~1075-1124) | exact (self-extension) |
| `bbj-vscode/package.json` | config | n/a | itself — `bbj.compiler.trigger` enumDescriptions block | exact (self-extension) |
| `bbj-intellij/.../BbjSettings.java` | model (persistent state) | CRUD | itself — `compilerOutputDirectory` field (line 36) | exact (same-file sibling field, #571 pattern) |
| `bbj-intellij/.../BbjSettingsComponent.java` | component (Swing form) | CRUD | itself — `compilerOutputDirectoryField` + its labeled row (lines 43, 103-109, 296, 521-526) | exact (same-file sibling field) |
| `bbj-intellij/.../BbjSettingsConfigurable.java` | controller (settings apply/reset) | CRUD | itself — `isModified`/`apply`/`reset` handling of `compilerOutputDirectory` (lines 57, 86, 168-169) | exact (same-file sibling wiring) |
| `bbj-intellij/.../lsp/CompilerInitOptions.java` | utility (init-options key + normalization) | transform | itself — `COMPILER_OUTPUT_DIRECTORY_KEY` (line 24) + `normalizeOutputDirectory` | exact (same-file sibling key) |
| `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` | service (LSP client factory) | request-response | itself — `initializeParams` building (line 60, `CompilerInitOptions.normalizeOutputDirectory(...)`) | exact (same-file sibling wiring) |
| `documentation/docs/vscode/features.md`, `documentation/docs/intellij/features.md` | docs | n/a | themselves — existing "compiler check" / trigger sections | exact (content rewrite in place) |

**Test files** (extend existing, no new analog needed beyond the file itself):

| Test File | Extends Coverage For | Pattern to Copy |
|---|---|---|
| `bbj-vscode/test/live-parse-scheduling.test.ts` | TRIG-01, TRIG-03 | existing open-event test at ~line 148; `createBBjTestServices`/`EmptyFileSystem` harness |
| `bbj-vscode/test/on-save-trigger.test.ts` (new) | TRIG-02, D-05..D-08 | copy harness setup from `live-parse-scheduling.test.ts`; scriptable `parseProgram` double from `bbj-test-module.ts:105-136` |
| `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` | TRIG-04 (D-01..D-04) | existing pure-function test style around `composeWithVerdict` |
| `bbj-vscode/test/bbj-document-validator.test.ts` | DIAG-01 | existing `mergeDiagnostics`/`applyDiagnosticHierarchy` test style |
| `bbj-vscode/test/java-interop-parse-lane.test.ts` | JINT-03 | existing lane-vs-shared test at lines 33-77; `fake-interop-peer.ts`'s `refusedSocketAttempts`/`hungConnectionIds` |
| new plain-JUnit-5 class in `bbj-intellij/src/test/.../lsp/` | TRIG-06 | `CompilerInitOptions.java`'s own doc comment: "has no IntelliJ platform dependency so it can be covered by plain JUnit 5 tests" (line 16-17) |

## Pattern Assignments

### `bbj-vscode/src/language/bbj-module.ts` / new `DocumentUpdateHandler` override (Pitfall 1 prerequisite)

**Analog:** Langium's `DefaultDocumentUpdateHandler` and the gate that reads it.

**The exact gate to satisfy** (`node_modules/langium/src/lsp/language-server.ts:142-148`):
```typescript
textDocumentSync: {
    change: TextDocumentSyncKind.Incremental,
    openClose: true,
    save: Boolean(documentUpdateHandler.didSaveDocument),
    willSave: Boolean(documentUpdateHandler.willSaveDocument),
    willSaveWaitUntil: Boolean(documentUpdateHandler.willSaveDocumentWaitUntil)
},
```
```typescript
// node_modules/langium/src/lsp/language-server.ts:319-333
if (handler.didSaveDocument) {
    documents.onDidSave(change => handler.didSaveDocument!(change));
}
```
**Core pattern:** register a `DocumentUpdateHandler` service override in `bbj-module.ts`'s DI module (same shape as other `services.lsp.*`/`services.validation.*` overrides already registered there) whose `didSaveDocument` method can be a no-op — its only job is to exist so `Boolean(...)` is `true`. The real on-save reaction stays in `BBjDocumentBuilder`, which already listens on `services.workspace.TextDocuments` directly (see next section), exactly mirroring how `onDidOpen`/`onDidChangeContent` are already wired there instead of through `DocumentUpdateHandler`.

**Verification note:** confirmed empty grep for `DocumentUpdateHandler`/`didSaveDocument` in `bbj-module.ts` this session — no existing override to conflict with.

---

### `bbj-vscode/src/language/bbj-document-builder.ts` (service, event-driven — TRIG-01/02/03/06 D-05..D-08)

**Analog:** itself, lines 104-150, 174-176, 223-290, 325-392, 481-601.

**Imports/constructor pattern** (lines 146-150):
```typescript
const textDocuments = services.workspace.TextDocuments;
if (hasTextDocumentEvents(textDocuments)) {
    textDocuments.onDidOpen(event => this.armLiveParseFromEvent(event.document));
    textDocuments.onDidChangeContent(event => this.armLiveParseFromEvent(event.document));
}
```
**Extension needed:** add `textDocuments.onDidSave(event => this.armLiveParseFromEvent(event.document, 'save'))` in the same `if (hasTextDocumentEvents(...))` block. Thread a `reason: 'open' | 'change' | 'save'` parameter through `armLiveParseFromEvent`/`armLiveParseForDocument` (currently untyped/undiscriminated — see Pitfall 3) so the on-save gate can suppress only `reason === 'change'`.

**Debounce-timer pattern to reuse for immediate save** (lines 104, 110, 174-176):
```typescript
private readonly cplDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
private static readonly SAVE_DEBOUNCE_MS = 500;
public hasPendingCompile(): boolean {
    return this.cplDebounceTimers.size > 0;
}
```
Parameterize the delay (`debouncedCompile(document, delayMs = SAVE_DEBOUNCE_MS)`, called with `0` for saves) rather than adding a second timer map — `hasPendingCompile()`/`hasPendingWork()` already trust only this one map.

**Rebuild-driven trigger gate (D-06)** — parallel to the existing off-branch:
```typescript
// existing shape, bbj-document-builder.ts ~223-290
// if (trigger === 'off') { ...clear/skip... }
// NEW: if (trigger === 'on-save') { skip debouncedCompile(document) entirely, Langium validation still runs }
```

**Anti-pattern to avoid** (explicit in RESEARCH.md): do not gate on-save-vs-debounced inside `debouncedCompile()`'s callback — keep the mode check in the three arming call sites (`armLiveParseForDocument`'s two event branches, `runBbjcplForDocuments`).

---

### `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` (utility, transform — TRIG-04 D-01..D-04)

**Analog:** itself, lines 139-144, 154-156, 404-419.

**The gap to close** (lines 404-419, current `composeWithVerdict`):
```typescript
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
        // verdict.diagnostics dropped here — the exact bug
    };
}
```
**Reusable idiom for the new kept-verdict function** — line-span overlap (lines 154-156):
```typescript
export function lineSpansOverlap(a: Range, b: Range): boolean {
    return a.start.line <= b.end.line && b.start.line <= a.end.line;
}
```
**Reusable idiom for line-shift matching** — 103 D-08's `syntaxComplaintKey()` (match by `(message, current-line-text)`, not line number) is the pattern to study and extend for a diagnostic that has no Langium-side message/line-text pairing.

**New design required** (per Pitfall 2 / Open Question 1): a new branch or sibling function, gated on `getCompilerTrigger() === 'on-save'`, that keeps re-emitting `verdict.diagnostics` at their tracked line — matched/re-anchored by line text, not line number — until that line is deleted, while `applyVerdictCarryOver`'s existing downgrade-carry-over logic continues to run unmodified for Langium's own complaints (D-03). Keep it pure/non-mutating, in this file's existing style — do not build a generic diff/patience-diff tracker (explicit Don't-Hand-Roll guidance).

---

### `bbj-vscode/src/language/bbj-document-validator.ts` (service, transform — DIAG-01)

**Analog:** itself, lines 106-130, 192-211.

**Function D-10 says to replace/extend, not `applyDiagnosticHierarchy`'s Rule 0** (lines 192-211):
```typescript
export function mergeDiagnostics(langiumDiags: Diagnostic[], cplDiags: Diagnostic[]): Diagnostic[] {
    const result: Diagnostic[] = [...langiumDiags];
    for (const cplDiag of cplDiags) {
        const cplLine = cplDiag.range.start.line;
        const matchIdx = result.findIndex(
            d => d.range.start.line === cplLine && d.source !== 'BBjCPL'
        );
        if (matchIdx >= 0) {
            result[matchIdx] = { ...result[matchIdx], source: 'BBjCPL' };   // <- D-10: replace with a drop instead
        } else {
            result.push(cplDiag);
        }
    }
    return result;
}
```
**Core pattern to port in:** reuse `lineSpansOverlap` from `bbj-diagnostic-reconciliation.ts` (see above) instead of the same-start-line check, and drop the overlapping Langium *syntax* complaint outright (lexer/parser/line-break-validator diagnostics only — D-09's exact "syntax complaint" scope from 103 D-04), showing bbjcpl's own diagnostic with `source: 'BBjCPL'` and its own text. Semantic/validator errors on that line stay untouched (103 D-09). Gate this dedup on "checked text equals editor text" (D-11) — always true right after save, so add a text-equality check at the `debouncedCompile()` bbjcpl-fallback call site (lines 576-585 of `bbj-document-builder.ts`), not inside `mergeDiagnostics` itself.

**Explicit non-target:** `applyDiagnosticHierarchy`'s Rule 0 (lines 106-130 doc comment) is a different, pre-existing mechanism — D-09 explicitly says this is NOT what gets switched on.

---

### `bbj-vscode/src/language/java-interop.ts` (service, request-response — JINT-03)

**Analog:** itself, lines 268-283, 307-310, 492-510, 543-553.

**The bug, exact site** (lines 492-510):
```typescript
public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
    const shared = await this.connect();          // throws while shared breaker is open/half-open
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
**Fix pattern:** reorder to try `parseLaneConnection()`/`openParseLane()` first (already never touches `breakerState`, per its own doc comment at lines 543-553), falling back to `this.connect()` only when the lane cannot be opened — a two-line reordering, no new plumbing. `parseLaneConnection()`'s generation bookkeeping (`parseLaneGeneration`, `parseLaneRetiredGeneration`) is unaffected.

**Test pattern** — `bbj-vscode/test/java-interop-parse-lane.test.ts:33-77`:
```typescript
const { interop } = createFakePeerServices();
interop.peerUp = true;
interop.connectDelayMs = 0;
vi.useFakeTimers();
// open connection 1 (shared) with a successful call
interop.hungConnectionIds.add(1);
const result = await interop.parseProgram({ /* ... */ });
expect(interop.socketAttempts).toBe(2);   // second socket = dedicated lane opened
```
For JINT-03's regression, use `refusedSocketAttempts` to force the *shared* connection's breaker open while `peerUp = true` lets the lane's own later socket attempt succeed.

---

### IntelliJ setting (TRIG-06, D-12/D-13) — mirror `compilerOutputDirectory` (#571) exactly

**Analog files and line anchors (all git-tracked, verified):**

`BbjSettings.java:36`:
```java
public String compilerOutputDirectory = "";  // Default: empty (no output directory configured; #571)
```
→ add sibling: `public String compilerTrigger = "debounced";` (D-13 default).

`BbjSettingsComponent.java:43, 103-109, 296, 521-526`:
```java
private final TextFieldWithBrowseButton compilerOutputDirectoryField;
...
compilerOutputDirectoryField = new TextFieldWithBrowseButton();
...
.addLabeledComponent(new JBLabel("Compile output directory:"), compilerOutputDirectoryField, 1, false)
...
public @NotNull String getCompilerOutputDirectory() { return compilerOutputDirectoryField.getText().trim(); }
public void setCompilerOutputDirectory(@NotNull String path) { compilerOutputDirectoryField.setText(path); }
```
→ add a `ComboBox<String>` field ("Debounced" / "On save" / "Off") with a matching `addLabeledComponent(new JBLabel("Compiler check:"), compilerTriggerCombo, ...)` row under the existing "BBj Compiler" separator, plus a one-line hint label recommending on-save for large workspaces (D-13), and matching `getCompilerTrigger()`/`setCompilerTrigger()` accessors.

`BbjSettingsConfigurable.java:57, 86, 168-169`:
```java
|| !Objects.equals(myComponent.getCompilerOutputDirectory(), state.compilerOutputDirectory)
...
state.compilerOutputDirectory = myComponent.getCompilerOutputDirectory();
...
myComponent.setCompilerOutputDirectory(
    state.compilerOutputDirectory != null ? state.compilerOutputDirectory : "");
```
→ same three-site wiring (`isModified`/`apply`/`reset`) for `compilerTrigger`. Apply schedules the existing debounced restart (`BbjServerService.scheduleRestart()`) — no new restart mechanism needed (D-12).

`lsp/CompilerInitOptions.java:24` (`COMPILER_OUTPUT_DIRECTORY_KEY`):
```java
public static final String COMPILER_OUTPUT_DIRECTORY_KEY = "compilerOutputDirectory";
```
→ add `public static final String COMPILER_TRIGGER_KEY = "compilerTrigger";` — **must be this exact string**, matching the key `bbj-ws-manager.ts`'s `onInitialize` already reads for VS Code (D-12: "the key the server already reads for VS Code").

`lsp/BbjLanguageServerFactory.java:60`:
```java
CompilerInitOptions.normalizeOutputDirectory(state.compilerOutputDirectory));
```
→ add a sibling `options.addProperty(CompilerInitOptions.COMPILER_TRIGGER_KEY, state.compilerTrigger)` call in the same `initializeParams` construction.

**Server-side allowlist this must satisfy** (`bbj-ws-manager.ts:108-111`, already exists, no change needed):
only literal strings `'debounced' | 'on-save' | 'off'` are accepted; anything else is silently ignored — this is the existing input-validation gate for the new init-option value (ASVS V5, already mitigated).

---

## Shared Patterns

### Event-driven arming without the workspace lock
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts:146-150` (constructor)
**Apply to:** the new `onDidSave` listener — must stay a direct `TextDocuments` subscription, never routed through `WorkspaceLock`, per the 105 constraint restated in CONTEXT.md's discretion note ("arming a check must not wait on `workspaceLock`").

### Pure, unit-tested diagnostic composition
**Source:** `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` (whole-file style: every exported function takes plain data in, returns plain data out, no I/O)
**Apply to:** the new kept-verdict composition function (TRIG-04) and the DIAG-01 dedup helper — both must follow this same no-mutation, fully-testable shape, tested via `bbj-diagnostic-reconciliation.test.ts` / `bbj-document-validator.test.ts`.

### `#571`'s init-options + Configurable pattern
**Source:** `bbj-intellij/.../BbjSettings.java` + `BbjSettingsComponent.java` + `BbjSettingsConfigurable.java` + `CompilerInitOptions.java` + `BbjLanguageServerFactory.java` (all five files, `compilerOutputDirectory` field end to end)
**Apply to:** every TRIG-06 file — this is a complete, already-shipped precedent for "add one IntelliJ setting that becomes one `initializationOptions` key the server already understands."

### Literal-allowlist validation for init-options values
**Source:** `bbj-vscode/src/language/bbj-ws-manager.ts:108-111`
**Apply to:** no new code needed — the existing `'debounced' | 'on-save' | 'off'` allowlist already covers a malformed `compilerTrigger` value from either client.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Kept-verdict line-tracking function (new, inside `bbj-diagnostic-reconciliation.ts`) | utility | transform | No existing code in this repository re-displays a diagnostic on a line that has shifted through an arbitrary number of edits until that line is deleted (Pitfall 2 / Assumption A2 / Open Question 1 in RESEARCH.md) — genuinely new design, closest available idiom is 103 D-08's `syntaxComplaintKey()` (single-keystroke horizon only) |
| `save: true` capability-flip verification | test | request-response | No existing test in this repo exercises the real LSP `initialize` handshake against `InitializeResult`; RESEARCH.md's Open Question 2 flags this may end up UAT-only |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/test/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/`, `documentation/docs/` — all scoped per CONTEXT.md's "Code this phase changes" list, cross-checked against RESEARCH.md's Sources (Primary) list, which already read every one of these files in full this session.
**Files scanned:** 15 target files + 2 new-file gaps (`test/on-save-trigger.test.ts`, a new IntelliJ JUnit 5 test class) + Langium's own `node_modules` source (read-only reference, not an analog to copy verbatim since it's vendored, not project code).
**Pattern extraction date:** 2026-09-24
**Note on analog style:** this phase is almost entirely "extend the same file in a new direction," not "copy pattern from sibling file" — every excerpt above with an exact file:line citation was verified read directly (not re-derived) during the RESEARCH.md session this file draws from, and git-tracked status was re-verified for all 15 target files this session (`git ls-files`).
