# Phase 102: Live Compiler Diagnostics With Backward Compatibility - Pattern Map

**Mapped:** 2026-09-22
**Files analyzed:** 12 (5 new, 7 modified/doc)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-parser-service.ts` (NEW) | service | request-response | `bbj-vscode/src/language/bbj-cpl-service.ts` | role-match (sibling service in `compiler` group) |
| `bbj-vscode/src/language/java-interop.ts` (+`parseProgram()`, DTOs, `RequestType`, `connectionGeneration`) | service | request-response | same file, `ensureCompleteClassIndex()`/`getRawClass`-style methods (lines ~579-611) | exact (same file, same idiom) |
| `bbj-vscode/src/language/bbj-document-builder.ts` (`debouncedCompile` extended) | service/scheduler | event-driven | same file, `debouncedCompile()` (~237-280), `runBbjcplForDocuments()` | exact |
| `bbj-vscode/src/language/bbj-document-validator.ts` (+`getMaxErrors()` getter) | validator/config | transform | same file, `setMaxErrors()`/`getCompilerTrigger()` getter-setter pairs | exact |
| `bbj-vscode/src/language/bbj-module.ts` (+`compiler.BBjParserService` registration) | config/DI | — | same file, existing `compiler.BBjCPLService` registration | exact |
| `bbj-vscode/test/bbj-test-module.ts` (`JavaInteropTestService` +`parseProgram` override) | test double | request-response | same file, `ensureCompleteClassIndex`/`connect()`/`resolveClassByName` overrides (73-138) | exact |
| `bbj-vscode/test/bbj-parser-service.test.ts` (NEW, probe/latch + PSRV-04) | test | event-driven | `bbj-vscode/test/document-builder.test.ts` (debounce harness, 151-166) | role-match |
| `bbj-vscode/test/parser-coordinate-converter.test.ts` (NEW, PSRV-05 fixtures) | test | transform | same converter tests style; no direct existing analog — see "No Analog Found" | partial |
| `bbj-vscode/test/functional/parse-program-live.test.ts` (NEW, `RUN_BBJ_TESTS`-gated) | test | request-response | `bbj-vscode/test/functional/issue447-real-interop.test.ts` (17-46) | exact |
| `documentation/docs/vscode/getting-started.md`, `documentation/docs/vscode/index.md`, `documentation/docs/vscode/features.md` | docs | — | same files' existing "BBj 25.00 or higher" prerequisite lines | exact |
| `documentation/docs/intellij/getting-started.md`, `documentation/docs/intellij/index.md`, `documentation/docs/intellij/features.md` | docs | — | same files' existing "BBj 25.00 or higher" prerequisite lines | exact |

## Pattern Assignments

### `bbj-vscode/src/language/bbj-parser-service.ts` (NEW — service, request-response)

**Analog:** `bbj-vscode/src/language/bbj-cpl-service.ts` (structure/placement/logger usage) + the
probe-latch shape of `ensureCompleteClassIndex()` in `java-interop.ts`.

**Core probe-and-latch pattern to copy** (mirror of `java-interop.ts:579-600`, `ensureCompleteClassIndex`):
```typescript
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
`BBjParserService`'s latch replaces `completeIndexResolved` (a one-shot boolean) with a value keyed
by `javaInteropService.connectionGeneration` (see java-interop.ts pattern below) so D-06's
per-connection reset falls out for free; same `(e as {code?:number})?.code === METHOD_NOT_FOUND`
branch reusing the existing `METHOD_NOT_FOUND` constant (`java-interop.ts:1281`).

**Coordinate converter — copy the sentinel-clamp idiom, do not compute line lengths** (`lsp-position.ts:13,21`):
```typescript
export const LSP_MAX_UINTEGER = 2147483647;
export const END_OF_LINE_CHARACTER = LSP_MAX_UINTEGER;
```
Sketch converter (from RESEARCH.md, grounded in `bbj-document-validator.ts:210-231`'s
`extractCyclicReferenceRelatedInfo`, which uses the identical sentinel pattern for whole-line ranges):
```typescript
function toRange(error: ParseError, doc: LangiumDocument): Range {
    const lineCount = doc.textDocument.lineCount;
    const clampLine = (oneBasedLine: number) =>
        Math.min(Math.max(oneBasedLine - 1, 0), Math.max(lineCount - 1, 0));
    const startLine = clampLine(error.editorStartLine);
    const endLine = clampLine(error.editorEndLine);
    if (error.startCharacter <= 0 || error.endCharacter <= error.startCharacter) {
        return { start: { line: startLine, character: 0 }, end: { line: endLine, character: END_OF_LINE_CHARACTER } };
    }
    return {
        start: { line: startLine, character: Math.max(error.startCharacter - 1, 0) },
        end: { line: endLine, character: END_OF_LINE_CHARACTER } // never trust endCharacter's exact value — see live-probe evidence in RESEARCH.md
    };
}
```

**Failure translation pattern (D-08) — check `RequestCancelled` first, never log it:**
```typescript
// Import LSPErrorCodes from 'vscode-languageserver', NOT vscode-jsonrpc's ErrorCodes
// (vscode-jsonrpc's own ErrorCodes namespace stops at -32700; RequestCancelled is -32800,
// defined only in vscode-languageserver-protocol's LSPErrorCodes — see RESEARCH.md Standard Stack)
if ((error as { code?: number })?.code === LSPErrorCodes.RequestCancelled) {
    return []; // dropped silently, no log at any level, no diagnostic change — D-02/D-08
}
// else: -3300x application codes / transport failures / malformed result -> D-08 cadence:
// first-per-connection-per-kind at warn, repeats at debug until a later success clears it.
```

**maxErrors cap (D-12) — slice the DTO list, not the converted diagnostics, before conversion:**
Add a `getMaxErrors()` getter to `bbj-document-validator.ts` mirroring the existing
`setMaxErrors()`/`getCompilerTrigger()` getter-setter pair, then in `BBjParserService`:
```typescript
const capped = errors.slice(0, getMaxErrors());
```

---

### `bbj-vscode/src/language/java-interop.ts` (MODIFIED — service, request-response)

**Analog:** same file — `getAllClassNamesRequest`'s `RequestType` declaration pattern and
`ensureCompleteClassIndex`'s connect+sendRequest shape.

**Thin pass-through method to add** (mirrors every other request method's connect()+sendRequest shape,
deliberately not `sendRequestSafe` since callers need to distinguish
`MethodNotFound`/`-3300x`/`RequestCancelled`, not a collapsed fallback):
```typescript
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

public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
    const connection = await this.connect();
    return connection.sendRequest(parseProgramRequest, params, token);
}
```

**Per-connection generation counter (D-06)** — add beside `establishConnection()`:
```typescript
private _connectionGeneration = 0;
public get connectionGeneration(): number { return this._connectionGeneration; }
// inside establishConnection(), right after: this.connection = connection;
this._connectionGeneration++;
```
Verified: `establishConnection()` (java-interop.ts ~336-353) is the single place a new
`MessageConnection` is created; both the post-outage reconnect path and the `clearCache()`-forced
reconnect path converge here, so incrementing here alone satisfies D-06's "reset on both paths."

---

### `bbj-vscode/src/language/bbj-document-builder.ts` (MODIFIED — scheduler, event-driven)

**Analog:** same file, `debouncedCompile()` callback (~237-280) — extend in place, do not add a
second timer map (D-02, Pitfall 4 re: `hasPendingWork()`).

**Merge pattern — deliberately NOT `mergeDiagnostics()`** (that helper collapses same-line
diagnostics into `source: 'BBjCPL'`, which D-09 forbids for the new source). Use filter-then-concat:
```typescript
// inside debouncedCompile's timer callback, after the existing bbjcpl clear-then-merge block
document.diagnostics = (document.diagnostics ?? []).filter(d => d.source !== BBJ_PARSER_SOURCE);
if (bbjParserService.isEnabled()) {
    const liveDiags = await bbjParserService.requestLiveParse(document, langServices);
    if (liveDiags.length > 0) {
        document.diagnostics = [...(document.diagnostics ?? []), ...liveDiags];
    }
}
await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
```
Gate with the same `getCompilerTrigger() !== 'off'` and `shouldCompileWithBbjcpl` eligibility
check already used for `bbjcpl` (D-04's "same gate as bbjcpl today").

---

### `bbj-vscode/src/language/bbj-document-validator.ts` (MODIFIED — small getter addition)

**Analog:** same file's existing `getCompilerTrigger()`/`setCompilerTrigger()` getter-setter pair.
Add a parallel `getMaxErrors()` alongside the existing `setMaxErrors()` (writes module-scoped
`maxErrorsDisplayed` today with no exported getter — a genuine pre-existing gap per RESEARCH.md
Pattern 4). No change to `applyDiagnosticHierarchy`'s Rule 0/Rule 3 — the new `'BBj Parser'` source
must stay outside Rule 0 (D-09) by construction (it is a distinct source string, never `'BBjCPL'`).

---

### `bbj-vscode/src/language/bbj-module.ts` (MODIFIED — DI registration)

**Analog:** same file's existing `compiler.BBjCPLService` registration in the `compiler` service
group. Add one line registering `compiler.BBjParserService` beside it — same group, same
construction pattern (constructor takes the shared services / `JavaInteropService` reference).

---

### `bbj-vscode/test/bbj-test-module.ts` (MODIFIED — test double)

**Analog:** same file, `JavaInteropTestService`'s existing override shape (73-123) — overrides by
exact method name on the concrete `JavaInteropService` subclass; `connect()` unconditionally
rejects (hermetic, no real socket) and must NOT be touched for this feature (Pattern 1's
verified reasoning: routing through `connect()` would produce the wrong failure shape for D-14's
scripted scenarios).

```typescript
// existing hermetic shape to preserve:
protected override connect(): Promise<MessageConnection> {
    return Promise.reject(new Error('Java interop is disabled in the test double'));
}
public override async loadClasspath(): Promise<boolean> { return false; }
```

**New scriptable override to add** (default = old-server behavior, per D-14):
```typescript
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

---

### `bbj-vscode/test/bbj-parser-service.test.ts` (NEW — test, event-driven)

**Analog:** `bbj-vscode/test/document-builder.test.ts:151-166` for driving the debounce timer with
fake timers:
```typescript
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
Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(600)` to drive the shared 500ms debounce
for the PSRV-04 test (whole open-edit-validate path against the default old-server double: assert
no live diagnostic, `bbjcpl` path still invoked, one "off" log line, no error).

---

### `bbj-vscode/test/functional/parse-program-live.test.ts` (NEW — test, request-response, `RUN_BBJ_TESTS`-gated)

**Analog:** `bbj-vscode/test/functional/issue447-real-interop.test.ts:17-46`:
```typescript
describe('... (real interop)', async () => {
    const run = await shouldRunBBjTests();
    const services = createBBjServices(NodeFileSystem);

    beforeAll(async () => {
        if (!run) return;
        services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);
    }, 120000);

    test.runIf(run)('...', async () => {
        // exercise the live service directly — call parseProgram()/requestLiveParse() directly,
        // never DocumentBuilder.build() (memory: build triggers CPL/interop on :5008, flaky/fails on CI)
    }, 60000);
});
```
Use `shouldRunBBjTests()` from `bbj-vscode/test/test-helper.ts` for the gate; call
`services.BBj.java.JavaInteropService.parseProgram(...)` (or the new `BBjParserService`) directly
for the four PSRV-05 invented fixture documents, asserting converted editor ranges — not a full
document build.

---

### `bbj-vscode/test/parser-coordinate-converter.test.ts` (NEW — test, transform)

No strong existing analog for a pure DTO-to-Range converter unit test in this codebase (see "No
Analog Found"). Structure as plain Vitest `describe`/`test` blocks feeding hand-written `ParseError`
DTOs (per the wire shape in `java-interop.ts`) through the converter for each PSRV-05 case (colon
continuation anchor-to-first-line, user line numbers, CRLF, no trailing newline, D-11 out-of-range
clamping) — see RESEARCH.md's Live Probe Evidence for concrete DTO values observed against the real
endpoint (e.g. `editorStartLine: 2, startCharacter: 1, endCharacter: 12` for the colon-continuation
case). **Do not** place fixture text under `test/test-data/` — `example-files.test.ts` auto-parses
every `.bbj` file there and requires zero lexer/parser errors; these fixtures are deliberately
invalid. Keep fixture strings as inline literals in the test file (Pitfall 5).

---

### Documentation files (MODIFIED — docs, both `vscode/` and `intellij/`)

**Analog:** each pair's own existing "BBj 25.00 or higher" prerequisite/requirements line.
Add, per D-13:
- `getting-started.md` §Prerequisites: keep "BBj 25.00 or higher", add that live compiler
  diagnostics need BBj 26.03 or later.
- `index.md` §Requirements: same one-liner.
- `features.md`: short new "Live compiler diagnostics" entry — what it does, that it follows
  `bbj.compiler.trigger`, and that an older BBj keeps the save-time compiler check.

No new configuration-page section (explicitly out of scope per D-13/deferred).

## Shared Patterns

### Probe-by-calling, never version comparison (D-05)
**Source:** `bbj-vscode/src/language/java-interop.ts:579-600` (`ensureCompleteClassIndex`)
**Apply to:** `BBjParserService`'s latch logic — `MethodNotFound` (-32601) latches off, any
result or -3300x application error latches on. No `bbj-ls` version string is ever parsed.

### Connection lifecycle / circuit breaker reuse
**Source:** `bbj-vscode/src/language/java-interop.ts` — `connect()`, `establishConnection()`,
`clearCache()`, `onConnectionRecovered()`
**Apply to:** `parseProgram()` rides the same `MessageConnection`, breaker and single-popup-per-outage
behavior — no new transport is built.

### Sentinel-based range clamping
**Source:** `bbj-vscode/src/language/lsp-position.ts:13,21` (`END_OF_LINE_CHARACTER`), reused in
`bbj-document-validator.ts:210-231` (`extractCyclicReferenceRelatedInfo`)
**Apply to:** `bbj-parser-service.ts`'s coordinate converter — never compute exact line lengths for
an out-of-range end character; emit the sentinel and rely on established client-side clamping.

### Filter-then-concat diagnostic merge (not `mergeDiagnostics()`)
**Source:** pattern contrast with `bbj-document-validator.ts:140-159` (`mergeDiagnostics`, BBjCPL-specific)
**Apply to:** `bbj-document-builder.ts`'s extended `debouncedCompile` callback — the new `'BBj Parser'`
source must never be collapsed into `'BBjCPL'` or trigger Rule 0.

### Logger usage / no client-side notification
**Source:** `bbj-vscode/src/language/logger.ts` usage throughout `java-interop.ts`/`bbj-cpl-service.ts`
**Apply to:** all mode/failure log lines (D-07/D-08) — server log only, no `main.ts`/notification import
(the `bbj-notifications.ts` isolation boundary must not be crossed by a new service).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `bbj-vscode/test/parser-coordinate-converter.test.ts` | test | transform | No existing pure-function DTO-to-Range converter unit test exists in this codebase; use RESEARCH.md's Live Probe Evidence values and standard Vitest structure instead of a codebase analog |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/test/`, `bbj-vscode/test/functional/`, `documentation/docs/{vscode,intellij}/`
**Files scanned:** 12 target files against ~9 analog candidates (all confirmed git-tracked via `git ls-files`)
**Pattern extraction date:** 2026-09-22
**Source:** all excerpts carried over verbatim from 102-RESEARCH.md's "Code Examples"/"Architecture Patterns" sections, which were read from the live repository this research session (line citations preserved above)
