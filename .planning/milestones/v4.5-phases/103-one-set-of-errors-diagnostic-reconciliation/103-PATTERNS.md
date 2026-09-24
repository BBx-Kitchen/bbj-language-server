# Phase 103: One Set of Errors — Diagnostic Reconciliation - Pattern Map

**Mapped:** 2026-09-22
**Files analyzed:** 6 (4 modified in-place, 2 test files extended, 1 new pure-function file recommended)
**Analogs found:** 6 / 6 (all in-repo, no new files needed as "no analog" — every touched file already has direct precedent within itself or a sibling)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-document-validator.ts` (extend: `getDiagnosticTier`, `applyDiagnosticHierarchy`, new carry-over read in `validateDocument`) | validator/utility (pure functions + class override) | transform (Diagnostic[] → Diagnostic[]) | itself — `mergeDiagnostics()` (same file, lines 143-162) is the model for the new reconciliation function's shape | exact (same file, same idiom) |
| `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` (**new**, recommended by RESEARCH.md, Claude's Discretion on filename) | utility | transform | `mergeDiagnostics()` in `bbj-document-validator.ts:143-162` | exact (explicit "model for the new reconciliation function" in RESEARCH.md) |
| `bbj-vscode/src/language/bbj-document-builder.ts` (extend: `debouncedCompile()` — D-01 skip-bbjcpl gate, D-02 fallback branch, verdict/carry-over wiring) | service/orchestrator | event-driven (debounce timer callback) | itself — the existing `debouncedCompile()` method (lines 240-302) is both the file to change and its own closest analog for the wiring style | exact (in-place extension) |
| `bbj-vscode/src/language/bbj-parser-service.ts` (extend: `requestLiveParse()` return-type widening) | service | request-response (JSON-RPC to `:5008`) | itself — `requestLiveParse()` (lines 213-246) and its `logFailure`/`latchOn`/`latchOff` neighbors are the pattern for how outcomes are classified and reported | exact (in-place extension) |
| `bbj-vscode/src/language/validations/line-break-validation.ts` (extend: add `data` to 3 `accept()` calls) | validator | transform (AST → Diagnostic via `ValidationAcceptor`) | `bbj-document-validator.ts`'s `processLinkingErrors()` (lines 175-208), which already tags via `data: { code: DocumentValidator.LinkingError, ... }` | exact (same tagging idiom, different validator file) |
| `bbj-vscode/test/document-builder.test.ts` (extend) | test | request-response / event-driven | itself — existing `describe('debouncedCompile clears stale live-parser diagnostics before the BBjCPL merge step', ...)` block (lines 183+) and `buildHarness()` (lines ~20-65) | exact |
| `bbj-vscode/test/bbj-parser-service.test.ts` (extend) | test | request-response | itself + `JavaInteropTestService.scriptParseProgram()` in `test/bbj-test-module.ts:54-136` | exact |
| `bbj-vscode/test/cpl-integration.test.ts` or new `bbj-diagnostic-reconciliation.test.ts` (new `describe` block, or new file) | test | transform | `describe('mergeDiagnostics', ...)` in `test/cpl-integration.test.ts:15-99` | exact |

## Pattern Assignments

### `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` (new) / or co-located in `bbj-document-validator.ts`

**Analog:** `mergeDiagnostics()` — `bbj-vscode/src/language/bbj-document-validator.ts:143-162`

**Imports pattern** (file top, lines 1-7 of `bbj-document-validator.ts`):
```typescript
import { AstNode, DefaultDocumentValidator, DiagnosticData, DiagnosticInfo, DocumentValidator, getDiagnosticRange, LangiumDocument, toDiagnosticSeverity } from "langium";
import { CancellationToken, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Range } from "vscode-languageserver";
import { isSymbolRef } from "./generated/ast.js";
import { isInstanceAccessAssignment } from "./bbj-scope.js";
import { END_OF_LINE_CHARACTER } from "./lsp-position.js";
```
If the new function lives in its own file, it needs at minimum: `Diagnostic, DiagnosticSeverity` from `vscode-languageserver`, `DocumentValidator` from `langium`, and — for D-08's per-line text extraction — `END_OF_LINE_CHARACTER` from `./lsp-position.js` (see Pattern 3 note below).

**Core pure-function pattern — model to copy the *shape* of** (`mergeDiagnostics`, lines 143-162):
```typescript
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
            // BBjCPL-only error: add directly
            result.push(cplDiag);
        }
    }

    return result;
}
```
**Do NOT reuse this function itself** (per RESEARCH.md Anti-Patterns): it matches by `range.start.line` equality (D-10 needs line-span *overlap*) and rewrites `source` to `'BBjCPL'` (D-07 forbids relabeling the source of a downgraded Langium diagnostic). Write a new function in this same pure, exported, array-in/array-out style, taking the BBj verdict diagnostics + current Langium diagnostics and returning a reconciled array, plus (separately) producing/consuming a `VerdictState` for D-08 carry-over.

**Tier classification pattern to extend** (`bbj-document-validator.ts:56-68`):
```typescript
const enum DiagnosticTier {
    Warning  = 0,
    Semantic = 1,
    Parse    = 2,
    BBjCPL   = 3,
}

function getDiagnosticTier(d: Diagnostic): DiagnosticTier {
    if (d.source === 'BBjCPL') return DiagnosticTier.BBjCPL;
    if (d.data?.code === DocumentValidator.ParsingError) return DiagnosticTier.Parse;
    if (d.severity === DiagnosticSeverity.Error) return DiagnosticTier.Semantic;
    return DiagnosticTier.Warning;
}
```
**Critical pitfall (from RESEARCH.md, confirmed by reading this function):** the downgrade step MUST change `data.code` to a new marker (e.g. `'bbj-downgraded-syntax'`), not just `severity`, or the diagnostic stays `DiagnosticTier.Parse` and keeps triggering Rule 1 (linking-error suppression) and Rule 3 (`maxErrors` cap) — see D-05 and the Rule 3 discretion note. `getDiagnosticTier` (or a sibling predicate) needs to recognize this new marker for the Rule 2 exemption (D-06).

**Module-scoped state pattern for carry-over (D-08)** — copy exactly, `bbj-document-validator.ts:29-50`:
```typescript
let suppressCascadingEnabled = true;
let maxErrorsDisplayed = 20;

export function setSuppressCascading(enabled: boolean): void {
    suppressCascadingEnabled = enabled;
}
export function setMaxErrors(max: number): void {
    maxErrorsDisplayed = max;
}
export function getMaxErrors(): number {
    return maxErrorsDisplayed;
}

let compilerTrigger: 'debounced' | 'on-save' | 'off' = 'debounced';

export function getCompilerTrigger(): 'debounced' | 'on-save' | 'off' {
    return compilerTrigger;
}
export function setCompilerTrigger(trigger: 'debounced' | 'on-save' | 'off'): void {
    compilerTrigger = trigger;
}
```
Apply this shape to the new `verdictStateByDocument` map: `const verdictStateByDocument = new Map<string, VerdictState>()` plus `getVerdictState(uri)`/`setVerdictState(uri, state)`/`clearVerdictState(uri)` exported functions, keyed by `document.uri.toString()` (matching this project's existing key style — see `cplDebounceTimers` below, keyed by `fsPath`).

---

### `bbj-vscode/src/language/bbj-document-builder.ts` — `debouncedCompile()`

**Analog:** itself, `debouncedCompile()`, lines 240-302 (the method being extended is its own closest analog for how a new branch should look)

**Imports pattern** (lines 1-17, already present, extend as needed):
```typescript
import { mergeDiagnostics, getCompilerTrigger } from './bbj-document-validator.js';
import { BBJ_PARSER_SOURCE } from './bbj-parser-service.js';
```
Add: the new reconciliation function's import, and (for D-02) whatever verdict/failure-signal the widened `requestLiveParse()` returns.

**Core skip/branch pattern to copy** — the existing `if (trigger === 'off') { ... } else { ... }` branch style in `runBbjcplForDocuments()` (lines 179-204) is the model for the new "latch on → skip bbjcpl" gate (D-01):
```typescript
private async runBbjcplForDocuments(
    documents: LangiumDocument<AstNode>[],
    cancelToken: CancellationToken
): Promise<void> {
    const trigger = getCompilerTrigger();

    if (trigger === 'off') {
        // clear stale diagnostics ...
        return;
    }
    // Lazy availability check on first trigger (per CONTEXT.md)
    this.trackBbjcplAvailability();
    if (this.bbjcplAvailable === false) return;

    for (const document of documents) {
        if (!this.shouldCompileWithBbjcpl(document)) continue;
        this.debouncedCompile(document);
    }
}
```

**Clear-then-show pattern to preserve** — `debouncedCompile()`'s timer callback (lines 245-299) already does "clear old BBjCPL + live-parser diagnostics, then repopulate, then one `notifyDocumentPhase` call":
```typescript
const timer = setTimeout(async () => {
    this.cplDebounceTimers.delete(key);
    try {
        document.diagnostics = (document.diagnostics ?? []).filter(
            d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE
        );
        const langServices = this.serviceRegistry.getServices(document.uri) as BBjServices;
        const cplService = langServices.compiler.BBjCPLService;
        // ... (D-01: this cplService.compile() call is now gated OFF when latch is on)
        const bbjParserService = langServices.compiler.BBjParserService;
        if (bbjParserService.isEnabled()) {
            const liveDiags = await bbjParserService.requestLiveParse(document);
            // ... (D-02: branch here — verdict → reconciliation; failure → bbjcpl fallback)
        }
        await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
    } catch (e) {
        logger.error(`BBjCPL debounced compile failed for ${key}: ${e}`);
    }
}, BBjDocumentBuilder.SAVE_DEBOUNCE_MS);
```
Follow this exact try/catch + single-notify-at-the-end shape when adding the D-01/D-02 branching; do not add a second `notifyDocumentPhase` call.

**Error handling pattern:** `logger.error()` inside a `catch` around the whole timer body (line 296-298) — copy verbatim for any new failure path inside this callback; never let the callback throw (it runs detached from `setTimeout` with no rejection handler).

---

### `bbj-vscode/src/language/bbj-parser-service.ts` — `requestLiveParse()`

**Analog:** itself, lines 213-246 (widen the return type of this exact method)

**Imports pattern** (lines 1-6, already present):
```typescript
import { LangiumDocument } from 'langium';
import { Diagnostic, DiagnosticSeverity, LSPErrorCodes, Range } from 'vscode-languageserver';
import { getMaxErrors } from './bbj-document-validator.js';
import { JavaInteropService, METHOD_NOT_FOUND, ParseError, ParseProgramParams } from './java-interop.js';
import { END_OF_LINE_CHARACTER } from './lsp-position.js';
import { logger } from './logger.js';
```

**Core outcome-classification pattern to widen, not replace** (lines 213-246):
```typescript
public async requestLiveParse(document: LangiumDocument): Promise<Diagnostic[]> {
    this.resetIfGenerationChanged();
    const generation = this.javaInteropService.connectionGeneration;
    const params: ParseProgramParams = { /* ... */ };
    try {
        const result = await this.javaInteropService.parseProgram(params);
        if (!Array.isArray(result?.errors)) {
            this.logFailure(MALFORMED_RESULT_KIND, 'result.errors was missing or not an array');
            return [];                                    // <- becomes a "failure" outcome
        }
        this.latchOn(generation);
        this.reportedFailureKinds.clear();
        return parseErrorsToDiagnostics(result.errors, document.textDocument.lineCount, getMaxErrors());
                                                            // <- becomes a "verdict" outcome (possibly empty diagnostics)
    } catch (e) {
        const code = (e as { code?: number } | undefined)?.code;
        if (code === LSPErrorCodes.RequestCancelled) {
            return [];                                    // <- becomes "cancelled" — NOT a failure (D-02/Pitfall 3)
        }
        if (code === METHOD_NOT_FOUND) {
            this.latchOff(generation);
            return [];                                    // <- latch flips off; treat like "no verdict this cycle"
        }
        const message = e instanceof Error ? e.message : String(e);
        this.logFailure(classifyFailureKind(code), message);
        return [];                                        // <- "failure" outcome
    }
}
```
**Required change (D-02):** widen the return type from `Promise<Diagnostic[]>` to a discriminated shape that lets `debouncedCompile()` tell "verdict" apart from "failure" apart from "cancelled/superseded" (RESEARCH.md's suggested minimal shape: `{ diagnostics: Diagnostic[]; verdict: boolean }`, or a 3-way discriminated union if cancelled must be distinguished from failure too — Open Question 1/2 in RESEARCH.md, left to plan-time decision). Keep every existing classification branch (`latchOn`/`latchOff`/`logFailure`/`RequestCancelled` special-case) exactly as-is; only the return statements' *shape* changes, not the control flow.

**Failure-logging pattern to copy for any new failure path** (lines 254-262):
```typescript
private logFailure(kind: string, message: string): void {
    const line = `Live compiler diagnostics: request failed (${kind}): ${message}`;
    if (this.reportedFailureKinds.has(kind)) {
        logger.debug(line);
    } else {
        this.reportedFailureKinds.add(kind);
        logger.warn(line);
    }
}
```

---

### `bbj-vscode/src/language/validations/line-break-validation.ts` — tagging the three `accept()` calls (D-04)

**Analog:** `bbj-document-validator.ts`'s `processLinkingErrors()` — the existing `data: { code: ..., ... }` tagging idiom (lines 182-194):
```typescript
const info: DiagnosticInfo<AstNode, string> = {
    node: container,
    range: reference.$refNode?.range,
    property: linkingError.info.property,
    index: linkingError.info.index,
    data: {
        code: DocumentValidator.LinkingError,
        containerType: container.$type,
        property: linkingError.info.property,
        refText: linkingError.info.reference.$refText,
        instanceMemberAccess
    } satisfies LinkingErrorData
};
```

**Current untagged calls to change** (`line-break-validation.ts:70-73, 81-84, 98-101`):
```typescript
accept('error', 'This statement needs to start in a new line: ' + textDocument.getText(cst.range), {
    node,
    range: cst.range
    // no `data` field — D-04's required change
});
accept('error', 'This statement needs to end with a line break: ' + textDocument.getText(cst.range), {
    node,
    range: cst.range
});
accept('error', `${missingMsg}: ${textDocument.getText(cst.range)}`, {
    node,
    range: cst.range
});
```
**Target shape:** add `data: { code: 'bbj-line-break-error' }` (one shared code is sufficient per CONTEXT.md/RESEARCH.md — "one shared code, or per-message codes — Claude's Discretion") to all three `accept()` info objects, following the `data: { code: ... }` idiom above. This makes line-break diagnostics identifiable by `data.code` rather than message-prefix matching, per the explicit CONTEXT.md scouting note.

**Import needed:** none new for the tagging itself — `ValidationAcceptor`'s `DiagnosticInfo.data?: unknown` field is already available via the existing `ValidationAcceptor` import at line 1.

---

### Test files

**Analog for the new pure-function test suite:** `test/cpl-integration.test.ts:1-99`
```typescript
import { describe, test, expect } from 'vitest';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { mergeDiagnostics } from '../src/language/bbj-document-validator.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';

describe('mergeDiagnostics', () => {
    test('...', () => {
        const merged = mergeDiagnostics(langium, cpl);
        // ...
    });
});
```
Copy this file's plain-Vitest, no-`EmptyFileSystem`, no-workspace-harness style for the new reconciliation function's unit tests (downgrade, replace-by-overlap, Rule 1/2 exemptions, carry-over matching) — either as new `describe` blocks appended here or in a new sibling file, per CONTEXT.md's own plan-split suggestion.

**Analog for builder-wiring tests:** `test/document-builder.test.ts` — `buildHarness()` (~lines 20-65) and the existing `describe('debouncedCompile clears stale live-parser diagnostics before the BBjCPL merge step', ...)` block (lines 183+):
```typescript
const requestLiveParseMock = vi.fn<(document: LangiumDocument) => Promise<Diagnostic[]>>().mockResolvedValue([]);
// ...
requestLiveParseMock.mockResolvedValueOnce([
    { message: 'stale live-parser message', range: line5Range, severity: 1, source: BBJ_PARSER_SOURCE },
]);
```
**Note:** this mock's signature (`Promise<Diagnostic[]>`) must be updated to match whatever widened return shape `requestLiveParse()` adopts (D-02) — this is a required, contained two-test-file change per RESEARCH.md ("Code Examples" section).

**Analog for the scriptable verdict/failure double:** `test/bbj-test-module.ts:54-136`, `JavaInteropTestService`:
```typescript
export type JavaInteropTestServiceParseProgramScript =
    | 'method-not-found'
    | 'transport-error'
    | 'malformed-result'
    | { errors: ParseError[] }
    | { code: number; message: string };

export class JavaInteropTestService extends JavaInteropService {
    public scriptParseProgram(script: JavaInteropTestServiceParseProgramScript): void { /* ... */ }
    public simulateReconnect(): void { this._connectionGeneration++; }
}
```
Drive every D-02 fallback test and every D-08 carry-over/reconnect-reset test through this existing double (`scriptParseProgram(...)`, `simulateReconnect()`) — no new test infrastructure needed, per RESEARCH.md.

## Shared Patterns

### Module-scoped cross-service state (getter/setter pair over a plain variable or Map)
**Source:** `bbj-vscode/src/language/bbj-document-validator.ts:29-50` (`suppressCascadingEnabled`/`maxErrorsDisplayed`/`compilerTrigger`)
**Apply to:** the new D-08 "last verdict" carry-over state, which must be readable from `bbj-document-validator.ts`'s synchronous `validateDocument()` and writable from `bbj-document-builder.ts`'s async `debouncedCompile()` — the same cross-service-without-DI-seam problem this pattern already solves for `compilerTrigger`/`maxErrorsDisplayed` (both already imported cross-file: `getMaxErrors`/`getCompilerTrigger` are imported into `bbj-document-builder.ts` and `bbj-parser-service.ts`).

### Diagnostic `data.code` tagging (never message-text matching)
**Source:** `bbj-vscode/src/language/bbj-document-validator.ts:187-193` (`processLinkingErrors`, `data: { code: DocumentValidator.LinkingError, ... }`)
**Apply to:** `line-break-validation.ts`'s three `accept()` calls (D-04) and the new downgraded-syntax-warning marker (Pitfall 2) — both must use `data.code`, not message-prefix string matching, consistent with how `DocumentValidator.LinkingError`/`DocumentValidator.ParsingError` are already the identification mechanism throughout `getDiagnosticTier()`.

### Clear-then-show, single-notify per debounce cycle
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts:249-291` (`debouncedCompile()`'s timer body)
**Apply to:** any new branch inside `debouncedCompile()` (D-01 skip, D-02 fallback, reconciliation call) — must preserve exactly one `filter()`-then-repopulate-then-`notifyDocumentPhase()` sequence; do not add a second notify call.

### `END_OF_LINE_CHARACTER` sentinel for one-line text extraction
**Source:** `bbj-vscode/src/language/lsp-position.ts:21` (constant), used at `bbj-parser-service.ts:42-53` (`parseErrorToRange`) and `line-break-validation.ts:341-352` (`hasLinebreakAfter`)
**Apply to:** D-08's carry-over matcher, which needs one line's text (message + line-text pairing) to survive line shifts from edits — call `document.textDocument.getText({ start: { line, character: 0 }, end: { line, character: END_OF_LINE_CHARACTER } })`, the same idiom already used twice in this codebase for exactly this "clamp to one line" need.

### Connection-generation invalidation
**Source:** `bbj-vscode/src/language/bbj-parser-service.ts:184-202` (`isEnabled()`/`resetIfGenerationChanged()`, reading `javaInteropService.connectionGeneration`)
**Apply to:** clearing D-08 carry-over state on reconnect/cache-clear (Claude's Discretion note in CONTEXT.md: "connection reset per Phase 102 D-06") — reuse `javaInteropService.connectionGeneration` (`java-interop.ts:212-215`) the same way `BBjParserService` already does for its own on/off latch; do not add a new event/listener.

## No Analog Found

None. Every file this phase touches already contains, in the same file, the closest and most authoritative analog for its own extension (`mergeDiagnostics` next to the new reconciliation function; `debouncedCompile` extending itself; `requestLiveParse` widening itself; `processLinkingErrors`'s tagging idiom for `line-break-validation.ts`'s sibling file). No cross-project or external-library pattern search was needed.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/` (`bbj-document-validator.ts`, `bbj-document-builder.ts`, `bbj-parser-service.ts`, `validations/line-break-validation.ts`, `java-interop.ts`, `lsp-position.ts`), `bbj-vscode/test/` (`cpl-integration.test.ts`, `document-builder.test.ts`, `bbj-test-module.ts`)
**Files scanned:** 6 source files fully read this session (plus 2 test files grep'd for structure); all citations verified against the actual file contents read in this pattern-mapping session, not inferred from RESEARCH.md alone
**Pattern extraction date:** 2026-09-22
