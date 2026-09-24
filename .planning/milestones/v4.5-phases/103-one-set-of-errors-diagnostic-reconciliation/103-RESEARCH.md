# Phase 103: One Set of Errors — Diagnostic Reconciliation - Research

**Researched:** 2026-09-22
**Domain:** Langium diagnostic hierarchy reconciliation against an external compiler verdict (in-repo TypeScript, no new external dependency)
**Confidence:** HIGH (every claim below is grounded in a file this session opened with `Read`/`Bash grep`+`Read`, cited with path:line; no web search was needed — this is a closed, in-repo problem)

## Summary

Phase 103 adds no new library and touches no new architectural layer. It is a pure
refactor/extension of three already-existing, already-tested TypeScript modules —
`bbj-document-validator.ts` (the Rule 0-3 hierarchy and `mergeDiagnostics`),
`bbj-document-builder.ts` (`debouncedCompile()`, the 500ms timer that runs `bbjcpl` and the live
parser today), and `bbj-parser-service.ts` (`requestLiveParse()`, which currently collapses
"accepted" and "every failure kind" into the same `[]` return value). The line-break validator
(`validations/line-break-validation.ts`) needs one small, mechanical change: its three `accept()`
calls carry no `data` field today, so its diagnostics are indistinguishable from any other
Langium validator warning except by exact message text.

The single most load-bearing finding of this research is that **`applyDiagnosticHierarchy`'s
Rule 0 is dead code today, in both the latch-on and latch-off paths, and always has been** —
confirmed by reading every call site in the source tree, not inferred. `applyDiagnosticHierarchy`
is invoked exactly once, inside `validateDocument()`, which runs synchronously as part of
Langium's own build/validate cycle (i.e., per keystroke, immediately). `BBjCPL`-sourced
diagnostics are added roughly 500ms later, in `debouncedCompile()`'s `setTimeout` callback, by
directly mutating `document.diagnostics` via `mergeDiagnostics()` — a completely separate code
path that never calls `applyDiagnosticHierarchy` again. By the time a `'BBjCPL'`-sourced
diagnostic exists in `document.diagnostics`, `applyDiagnosticHierarchy` has already run and
returned for that build cycle and will not run again until the next keystroke, at which point the
BBjCPL diagnostics from the previous cycle are still sitting in `document.diagnostics` un-vetted
by the hierarchy function. The CONTEXT.md scouting note ("Rule 0 ... may be dead") is correct, and
this applies to 0.16.x's own long-standing behaviour, not something Phase 102 introduced — the
plan must document this as a confirmed finding, not attempt to "fix" Rule 0 (CONTEXT.md
explicitly forbids changing latch-off behaviour).

The second load-bearing finding: **`getDiagnosticTier()` classifies a diagnostic into the `Parse`
tier by `data?.code === DocumentValidator.ParsingError`, independent of severity.** If Phase 103's
D-04 downgrade only changes a diagnostic's `severity` from Error to Warning and leaves `data.code`
untouched, the diagnostic still reports as `DiagnosticTier.Parse` to `getDiagnosticTier()`. That
would (a) keep `hasParseErrors` true inside `applyDiagnosticHierarchy`, so Rule 1 would go on
suppressing every linking error even though D-05 requires linking errors to reappear once a
downgraded-but-present warning is the only "parse" signal left, and (b) keep the downgraded
warning inside Rule 3's `maxErrors` cap accounting, contradicting the Claude's Discretion note
("Rule 3 ... counts downgraded warnings (they are no longer errors)"). The downgrade step must
therefore change **both** `severity` and `data.code` (to a new, distinct marker), not severity
alone — otherwise D-05 and the Rule 3 discretion point silently regress. This is a concrete
implementation requirement for the planner, not a style preference.

The third finding answers D-02's `requestLiveParse()` return-type question directly: today the
method's signature is `Promise<Diagnostic[]>`, and every non-accepted outcome (any of the five
application-error codes, a transport failure, a malformed result, and — separately — a
superseded `RequestCancelled`, which Phase 102 D-08 explicitly does not count as a failure kind)
returns `[]`, identically to a genuine zero-error accepted verdict. The minimal API change that
satisfies D-02 without breaking any existing caller is to widen the return type to carry a
verdict flag alongside the diagnostics (e.g. `{ diagnostics: Diagnostic[]; verdict: boolean }`),
because every call site that consumes the result already destructures it, and the two existing
test suites that call `requestLiveParse()`/mock it (`document-builder.test.ts`,
`bbj-parser-service.test.ts`) would need updating regardless of which shape is chosen.

**Primary recommendation:** keep the reconciliation logic as a new, small, pure, exported
function in the style of `mergeDiagnostics` (not a change to `applyDiagnosticHierarchy`'s
internals), invoked once from `debouncedCompile()`'s live-parse branch when a verdict actually
arrives, plus a second lightweight "carry-over" pass invoked from `BBjDocumentValidator.validateDocument()`
for the immediate/per-keystroke case (D-08). Store per-document verdict state in a
module-scoped `Map<string, VerdictState>` (mirroring the existing `compilerTrigger` /
`maxErrorsDisplayed` module-scoped pattern already in `bbj-document-validator.ts`), keyed by
`document.uri.toString()` (or `fsPath`, matching the existing `cplDebounceTimers` key style), and
clear it explicitly from three places: `TextDocuments.onDidClose` (a pattern Langium itself
already uses for exactly this purpose in `AbstractSemanticTokenProvider`), the existing
`trigger === 'off'` clearing branch in `runBbjcplForDocuments()`, and `BBjParserService`'s own
generation-reset path (`resetIfGenerationChanged()`) so a reconnect/cache-clear invalidates carry-over
state the same way it invalidates the on/off latch.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**The save-time bbjcpl run**
- D-01: While the latch is on, the `bbjcpl -N` run is skipped. With the latch off, bbjcpl runs
  and merges exactly as in 0.16.x (`mergeDiagnostics`, Rule 0), untouched. This reverses Phase 102
  D-03.
- D-02: Per-cycle fallback: if the live parse *fails* in a debounce cycle (any failure kind from
  Phase 102 D-08: -33001..-33005, transport failure, malformed result) while the latch stays on,
  that cycle runs `bbjcpl` instead, as in 0.16.x. It adds no dialog; the Phase 102 failure logging
  is unchanged. (Scouted: `BBjParserService.requestLiveParse()` currently returns `[]` for both
  "accepted" and "failed". The planner must give the caller a way to tell a verdict from a
  failure.)
- D-03: A fallback bbjcpl result is not a verdict. A fallback cycle behaves exactly like an older
  BBj: bbjcpl is merged as today and Langium's errors stay errors. Only a live endpoint verdict for
  the current text downgrades or replaces anything (D-04..D-08).

**Reach of the compiler's authority**
- D-04: Before BBj's verdict arrives, Langium's lexer, parser and line-break complaints show as
  errors, as today. When the verdict arrives: on lines BBj flags, BBj's error replaces Langium's
  syntax complaint (D-09, D-10); on lines BBj does not flag, Langium's syntax complaint stays
  visible but is downgraded to Warning. "Syntax complaint" means Langium lexer errors, parser
  errors (`DocumentValidator.ParsingError`) and the line-break validator's diagnostics
  (`validations/line-break-validation.ts`: "needs to start in a new line", "needs to end with a
  line break" and its missing-terminator message). Scouted: line-break diagnostics carry no
  distinguishing `code` today, only the message text. The planner should tag them with a code
  rather than match on message prefixes. Reversibility: reversible.
- D-05: Linking and semantic diagnostics all stay visible, even when Langium's own parse failed
  and its syntax errors were downgraded or replaced. Once a verdict exists, the hidden or
  downgraded Langium parse errors no longer trigger Rule 1's linking-error suppression.
- D-06: Rule 2 (any Error hides all warnings) never hides the downgraded syntax warnings. Rule 2
  keeps hiding other warnings (linking, validator warnings) while an error exists, as today.
- D-07: Downgraded warnings keep their exact message text and Langium's own `source`, distinct
  from `BBj Parser` and `BBjCPL`, so both IDEs show where they came from, and tests and the Phase
  104 harness can tell them apart. There is no prefix or rewording.

**Before and between verdicts**
- D-08: No flicker while typing. Each keystroke re-validates straight away, but the next verdict
  comes about 500ms after typing stops. A Langium syntax complaint that the *previous* verdict
  downgraded stays a warning until the next verdict. It is matched by its message and its line's
  text, so line shifts from edits don't break the match. Only Langium complaints the last verdict
  hasn't seen show as errors in the meantime. With no verdict yet for a document (first open,
  latch off, fallback cycle), everything is as today.

**Which message wins on a line**
- D-09: On a line BBj flags, only Langium's syntax complaints give way. BBj's diagnostic (its own
  text, source `BBj Parser`, Error, categories in `code`, as in Phase 102 D-09/D-10) remains.
  Langium's semantic and validator errors on the same line stay; they say something different.
- D-10: "Same line" means overlapping line spans, after Phase 102's PSRV-05 coordinate conversion:
  a Langium complaint gives way when any editor line of its range overlaps the editor lines of
  BBj's range. This covers colon-continued statements, where BBj reports on one line and Langium
  on another line of the same statement. It deliberately differs from `mergeDiagnostics`'
  start-line equality, which stays as-is for the latch-off bbjcpl path.

### Claude's Discretion
- Where the reconciliation lives: extend `applyDiagnosticHierarchy`/`validateDocument`, a new pure
  function applied in the debounce callback, or both (the D-08 carry-over must also run on the
  immediate per-keystroke validation). Keep it a pure, unit-testable function in the style of
  `mergeDiagnostics`.
- Where the per-document "last verdict" state lives and when it is cleared (document close, latch
  flipping to off, trigger `off`, connection reset per Phase 102 D-06).
- How Rule 3 (`maxErrors` cap) counts downgraded warnings (they are no longer errors). Rule 0 is
  unchanged for the latch-off path. Scouted: Rule 0 runs inside `validateDocument` before any
  `BBjCPL` diagnostics are merged, so it may never fire today. The researcher should confirm and
  note it, without changing latch-off behaviour.
- The Langium `source` label for downgraded warnings (whatever `getSource()` yields today is
  fine).
- Plan split. The obvious default: (1) the pure reconciliation function and its unit tests
  (downgrade, replace-by-overlap, Rule 1/2 exemptions, carry-over matching); (2) wiring into the
  builder: skip bbjcpl when the latch is on, verdict-vs-failure signal, per-cycle fallback, verdict
  state, plus a latch-off regression test proving 0.16.x behaviour against the old-server double;
  (3) the gated live check, the working conformance run, hand UAT in both IDEs with the endpoint
  present and with the pre-endpoint jar, then the branch and PR.

### Deferred Ideas (OUT OF SCOPE)
- A setting to hide the downgraded Langium syntax warnings entirely (strict "compiler only" mode).
  Not requested; possible later if the warnings prove noisy.
- Making `on-save` actually differ from `debounced` (carried over from Phase 102's deferred list).
- Moving live-parse scheduling out of `buildDocuments()`: Phase 105 (#692).
- The five critical `101-REVIEW.md` `bbj-ls` findings, and Phase 105's concurrent-write
  interleaving (deferred by 102-VERIFICATION.md, not this phase's job).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PSRV-06 | Compiler diagnostics and the language server's own diagnostics do not duplicate each other on a line, and the save-time `bbjcpl` run does not repeat what the endpoint already reported | See "Architecture Patterns" (new reconciliation function, D-09/D-10 overlap rule) and "Common Pitfalls" (Rule 0 dead code, tier re-tagging) — `bbj-document-validator.ts:84-133`, `bbj-document-builder.ts:240-302` |
| PSRV-07 | When the compiler's parser accepts a document, the user sees no lexer, parser or line-break error from the language server for it | See "Architecture Patterns" (downgrade-to-Warning step, D-04 tagging in `line-break-validation.ts`) and "Code Examples" |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Immediate per-keystroke syntax diagnostics (Langium lexer/parser/line-break) | Langium Validation Pipeline (`bbj-document-validator.ts`, `validateDocument()`) | — | Runs synchronously inside every `buildDocuments()` call; no network round trip, confirmed at `bbj-document-validator.ts:166-173` |
| Diagnostic hierarchy rules (Rule 0-3) / tier suppression | Langium Validation Pipeline | — | Pure function `applyDiagnosticHierarchy` (`bbj-document-validator.ts:84-133`), single call site at line 172 |
| Debounced compiler verdict (BBjCPL / live parseProgram) | BBjDocumentBuilder debounce (`bbj-document-builder.ts`, `debouncedCompile()`) | bbj-ls Compiler Service (external, via `:5008`) | Builder owns the 500ms timer, the skip-bbjcpl-when-latch-on decision (D-01), and the merge-then-notify step; the verdict itself is computed externally |
| Compiler authority decision (verdict accepted/rejected vs. failure) | bbj-ls Compiler Service (external, relayed by `BBjParserService`) | BBjDocumentBuilder (consumer) | BBj's own parser is the source of truth; `requestLiveParse()` only relays and classifies (`bbj-parser-service.ts:213-246`) |
| Per-document "last verdict" carry-over state (D-08) | New module-scoped state, read from `bbj-document-validator.ts`'s `validateDocument()`, written from `bbj-document-builder.ts`'s `debouncedCompile()` | `BBjParserService` (invalidates on generation change) | Must be synchronously readable at keystroke time and writable ~500ms later — no DI seam connects those two call sites today except shared module scope, matching the existing `compilerTrigger`/`maxErrorsDisplayed` pattern |
| Diagnostic presentation (source label, severity, ranges) | IDE Client (VS Code / IntelliJ) via LSP `publishDiagnostics` | — | No IDE-specific code; both consume the same `document.diagnostics` array, per the project's "host-neutral language-server request" constraint (STATE.md) |

## Standard Stack

No new external dependency is introduced by this phase. Every type and utility used
(`Diagnostic`, `DiagnosticSeverity`, `Range` from `vscode-languageserver`; `LangiumDocument`,
`DocumentValidator` from `langium`) is already imported in the files this phase touches.

**Installation:** none.

## Package Legitimacy Audit

Not applicable — this phase installs no new packages. `package.json` is unchanged.

## Architecture Patterns

### System Architecture Diagram

```
Keystroke (didChange)
   │
   ▼
Langium buildDocuments() ──► validateDocument() [synchronous, same tick]
   │                             │
   │                             ├─ processLexingErrors()/processParsingErrors()  ─┐
   │                             │     (base DefaultDocumentValidator,             │  each tagged
   │                             │      document-validator.js:54-114)              │  data.code =
   │                             ├─ processLinkingErrors() (BBjDocumentValidator   │  Lexing/Parsing/
   │                             │     override, bbj-document-validator.ts:175)    │  LinkingError
   │                             ├─ validateAst() → checkLineBreaks()              │
   │                             │     (line-break-validation.ts:56, NO data today)┘
   │                             │
   │                             ├─► [NEW] read carry-over verdict state for this document
   │                             │     (D-08): re-apply the *previous* verdict's downgrade/
   │                             │     replace decisions to freshly produced diagnostics,
   │                             │     matched by message + line text (not line number)
   │                             │
   │                             └─► applyDiagnosticHierarchy() (Rule 0-3, unchanged shape)
   │                                     └─► document.diagnostics = [result]
   │                             (Rule 0 never fires here — see Common Pitfalls)
   ▼
buildDocuments() tail: runBbjcplForDocuments()
   │
   ├─ trigger === 'off'  → clear BBjCPL + BBJ_PARSER_SOURCE diagnostics, re-notify
   ├─ trigger debounced/on-save → debouncedCompile(document) scheduled (500ms trailing edge)
   │
   ▼ (≈500ms later, separate macrotask — bbj-document-builder.ts:245-299)
debouncedCompile() timer fires
   │
   ├─ clear stale 'BBjCPL' + BBJ_PARSER_SOURCE diagnostics (existing, lines 249-257)
   │
   ├─ if latch OFF (BBjParserService.isEnabled() === false):
   │      run cplService.compile() → mergeDiagnostics() [0.16.x path, D-01/D-03]
   │      (Rule 0 dead here too — mergeDiagnostics bypasses applyDiagnosticHierarchy)
   │
   └─ if latch ON:
          skip cplService.compile() (D-01)
          run bbjParserService.requestLiveParse(document)
             │
             ├─ verdict (accepted/rejected, possibly []) →
             │     [NEW] reconciliation function:
             │       - for each BBj-flagged line: remove overlapping Langium
             │         syntax diagnostics (D-09/D-10), keep BBj's diagnostic
             │       - for every OTHER Langium syntax diagnostic still present:
             │         downgrade severity→Warning, re-tag data.code (D-04, D-06)
             │       - append BBj's own diagnostics (BBJ_PARSER_SOURCE, unchanged
             │         from Phase 102's parseErrorsToDiagnostics)
             │     [NEW] store this verdict's downgrade/replace decisions as the
             │       document's new carry-over state, keyed by message+line-text (D-08)
             │
             └─ failure (any Phase 102 D-08 kind, NOT RequestCancelled) →
                   [NEW] per-cycle fallback: run cplService.compile() → mergeDiagnostics()
                   exactly like the latch-off path (D-02/D-03) — NOT a verdict, carry-over
                   state is left untouched
   │
   └─ notifyDocumentPhase(document, Validated) — one publish, as today
```

### Recommended Project Structure

No new files are structurally required; the CONTEXT.md canonical-refs list is already the
complete file set:

```
bbj-vscode/src/language/
├── bbj-document-validator.ts   # Rule 0-3 (unchanged shape) + [NEW] carry-over read/apply,
│                                #   new DiagnosticTier handling for downgraded warnings
├── bbj-document-builder.ts     # debouncedCompile(): D-01 skip-bbjcpl gate, D-02 fallback branch,
│                                #   [NEW] call into the reconciliation function
├── bbj-parser-service.ts       # requestLiveParse(): [NEW] verdict-vs-failure return shape
├── validations/
│   └── line-break-validation.ts # [NEW] data: { code: ... } on all three accept() calls
└── bbj-cpl-service.ts           # unchanged — the fallback path still calls this
```

A new file (e.g. `bbj-diagnostic-reconciliation.ts`) is a reasonable option for the pure
reconciliation function + carry-over state, kept separate from `bbj-document-validator.ts` to
avoid growing that file further — but co-locating it in `bbj-document-validator.ts` beside
`mergeDiagnostics` (same file, same export style) is equally consistent with the existing
pattern. Either is Claude's Discretion per CONTEXT.md; this research does not prescribe one.

### Pattern 1: Module-scoped per-document state (existing precedent)

**What:** `bbj-document-validator.ts` already holds mutable state at module scope, not as a class
field, with getter/setter exports:

```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:29-50 (read this session)
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

**When to use:** Exactly the D-08 carry-over problem: `validateDocument()` (called from
`bbj-document-validator.ts`, synchronously per keystroke) and `debouncedCompile()` (called from
`bbj-document-builder.ts`, ~500ms later) are two different singleton services with no existing DI
seam directly connecting them for per-document state, yet both need read/write access to the same
"last verdict for document X" data. This project already solves an analogous cross-service
coupling problem (both `bbj-document-builder.ts` and `bbj-parser-service.ts` import `getMaxErrors`
/ `getCompilerTrigger` from `bbj-document-validator.ts`) with a plain exported `Map`/getter-setter
pair rather than plumbing new constructor parameters through `bbj-module.ts`.

**Example (recommended shape for the new state):**
```typescript
// New, following the existing pattern at bbj-document-validator.ts:29-50
export interface VerdictState {
    /** message + line-text pairs the last verdict downgraded (D-08 carry-over matching). */
    downgraded: Array<{ message: string; lineText: string }>;
}

const verdictStateByDocument = new Map<string, VerdictState>();

export function getVerdictState(uri: string): VerdictState | undefined {
    return verdictStateByDocument.get(uri);
}
export function setVerdictState(uri: string, state: VerdictState): void {
    verdictStateByDocument.set(uri, state);
}
export function clearVerdictState(uri: string): void {
    verdictStateByDocument.delete(uri);
}
```

### Pattern 2: Clearing per-document state on close (existing Langium precedent)

**What:** Langium's own `AbstractSemanticTokenProvider` (a framework class this project extends
indirectly, not something to copy verbatim, but a directly applicable precedent for the exact
lifecycle problem D-08's discretion note raises) subscribes to `TextDocuments.onDidClose` in its
constructor to delete a per-document `Map` entry:

```typescript
// Source: bbj-vscode/node_modules/langium/lib/lsp/semantic-token-provider.js:154-166 (read this session)
export class AbstractSemanticTokenProvider {
    constructor(services) {
        this.tokensBuilders = new Map();
        // Delete the token builder once the text document has been closed
        services.shared.workspace.TextDocuments.onDidClose(e => {
            this.tokensBuilders.delete(e.document.uri);
        });
        ...
    }
}
```

**When to use:** This project's own `bbj-document-builder.ts` never deletes documents from
`langiumDocuments` on close (confirmed by reading `document-update-handler.js`: `didClose` fires
no `documentBuilder.update()` call at all — only `didChangeContent`/`didChangeWatchedFiles` do).
A `LangiumDocument` object therefore **survives close** as long as the file stays in the workspace
(it can be revalidated later via a USE reference or a workspace-wide rebuild without being
reopened). This means a `Map<uri, VerdictState>` will **not** self-clean via garbage collection on
close, and stale carry-over state for a closed-then-reopened document could otherwise leak across
sessions unless explicitly cleared. `BBjDocumentValidator`'s constructor already receives
`services` with `services.shared` available (confirmed: the base `DefaultDocumentValidator`
constructor itself reads `services.shared.profilers.LangiumProfiler`, so `services.shared.workspace.TextDocuments`
is reachable the same way), making this exact pattern directly applicable — register the same kind
of `onDidClose` listener from `BBjDocumentValidator`'s constructor (which does not exist yet;
today it has no explicit constructor and relies on the inherited one).

### Pattern 3: Reading a single line's text for carry-over matching

**What:** D-08 requires matching a diagnostic across edits "by its message and its line's text, so
line shifts from edits don't break the match." The existing `END_OF_LINE_CHARACTER` sentinel
(`lsp-position.ts:21`, value `2147483647`) combined with `TextDocument.getText(range)` already
produces a clamped single-line slice — verified in the `vscode-languageserver-textdocument`
package's `offsetAt()`:

```javascript
// Source: bbj-vscode/node_modules/vscode-languageserver-textdocument/lib/esm/main.js:103-118 (read this session)
offsetAt(position) {
    const lineOffsets = this.getLineOffsets();
    ...
    const lineOffset = lineOffsets[position.line];
    if (position.character <= 0) { return lineOffset; }
    const nextLineOffset = (position.line + 1 < lineOffsets.length) ? lineOffsets[position.line + 1] : this._content.length;
    const offset = Math.min(lineOffset + position.character, nextLineOffset);   // <-- clamps to the line
    return this.ensureBeforeEOL(offset, lineOffset);
}
```

**When to use:** the carry-over matcher can safely call
`document.textDocument.getText({ start: { line, character: 0 }, end: { line, character: END_OF_LINE_CHARACTER } })`
to get exactly one line's text regardless of how long `END_OF_LINE_CHARACTER` is, the same idiom
`parseErrorToRange` already relies on for its own end-of-line sentinel (`bbj-parser-service.ts:49-52`,
whose own doc comment explicitly cites this clamp behaviour).

### Pattern 4: The scriptable `parseProgram` test double (D-02/D-14 verdict-vs-failure testing)

**What:** `JavaInteropTestService` in `test/bbj-test-module.ts` already scripts every outcome
shape `requestLiveParse()` needs to be tested against — accepted-with-errors, accepted-clean
(empty `errors` array), every application-error code, a transport failure, and a malformed
result:

```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:54-136 (read this session)
export type JavaInteropTestServiceParseProgramScript =
    | 'method-not-found'
    | 'transport-error'
    | 'malformed-result'
    | { errors: ParseError[] }
    | { code: number; message: string };

export class JavaInteropTestService extends JavaInteropService {
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
    /** Test seam: simulate a post-outage reconnect or cache-clear-forced reconnect. */
    public simulateReconnect(): void {
        this._connectionGeneration++;
    }
}
```

**When to use:** every D-02/D-14 fallback test (verdict vs. failure driving the bbjcpl skip
decision) and every carry-over/reconnect-reset test (D-08's discretion on connection reset)
should drive this double via `scriptParseProgram(...)` and `simulateReconnect()`, exactly as
`bbj-parser-service.test.ts` already does for the Phase 102 suite — no new test infrastructure is
needed.

### Anti-Patterns to Avoid

- **Reusing `mergeDiagnostics()` for the live-verdict reconciliation:** `mergeDiagnostics()`
  matches by `range.start.line` equality and always rewrites the matched diagnostic's `source` to
  `'BBjCPL'`. Phase 103 needs *line-span overlap* (D-10) and must NOT relabel a downgraded Langium
  diagnostic's `source` away from Langium's own (D-07). Deliberately write a new function; do not
  parametrize `mergeDiagnostics` to also do this.
- **Downgrading severity without re-tagging `data.code`:** see "Common Pitfalls" below — this
  silently breaks D-05 and the Rule 3 discretion point because `getDiagnosticTier()` keys off
  `data.code`, not severity.
- **Matching line-break diagnostics by message-text prefix instead of a `data.code` tag:** the
  CONTEXT.md scouting note is explicit that message-prefix matching is the wrong approach; the
  `ValidationAcceptor`'s `DiagnosticInfo.data` field (`data?: unknown`, confirmed in
  `node_modules/langium/lib/validation/validation-registry.d.ts:34`) is exactly the mechanism
  already used for `DocumentValidator.LinkingError` in this same codebase
  (`bbj-document-validator.ts:187-193`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extracting one line's text for carry-over matching | A custom line-splitting/offset routine | `document.textDocument.getText({...END_OF_LINE_CHARACTER...})` | Already the exact idiom used by `parseErrorToRange` (`bbj-parser-service.ts:42-53`) and by `hasLinebreakBefore`/`hasLinebreakAfter` (`line-break-validation.ts:328-352`); `TextDocument.offsetAt` already clamps the sentinel per-line |
| Distinguishing a verdict from a failure in `requestLiveParse()` | A side-channel flag, a second polling method, or inferring "empty array + no thrown error = verdict" (ambiguous, since accepted-with-zero-errors also returns `[]` today) | Widen the return type (`{ diagnostics, verdict }` or equivalent) | The method already fully classifies every outcome internally (`bbj-parser-service.ts:223-245`); it just discards the classification before returning |
| Detecting "per-connection reset" for carry-over state | A new event/listener on the socket | `javaInteropService.connectionGeneration`, already read by `BBjParserService.resetIfGenerationChanged()` (`bbj-parser-service.ts:193-202`) | Phase 102 D-06 built this exact generation counter for the identical problem (the on/off latch); the same field is directly reusable |

**Key insight:** every mechanism Phase 103 needs (line-text extraction, connection-generation
invalidation, data-tagged diagnostics, module-scoped cross-service state, a scriptable test
double) already exists in this codebase for an adjacent problem. This phase is assembly, not new
infrastructure.

## Common Pitfalls

### Pitfall 1: Rule 0 is dead code — do not "fix" it in the latch-off path

**What goes wrong:** A planner reading `applyDiagnosticHierarchy`'s doc comment ("BBjCPL errors
present → suppress ALL linking errors... Rule 0") could reasonably assume it is load-bearing for
the 0.16.x/latch-off flow and try to make it actually fire as part of "faithfully preserving
0.16.x behaviour" (D-01/D-03).

**Why it happens:** `mergeDiagnostics()` — the function that adds `'BBjCPL'`-sourced diagnostics
to `document.diagnostics` — is called from `debouncedCompile()`'s `setTimeout` callback
(`bbj-document-builder.ts:264-271`), entirely outside `validateDocument()`. `applyDiagnosticHierarchy`
is called from exactly one place in the whole source tree — `bbj-document-validator.ts:172`,
inside `validateDocument()` — which already returned by the time BBjCPL diagnostics exist.

**How to avoid:** Confirm-and-document only, per CONTEXT.md's explicit instruction ("without
changing latch-off behaviour"). Do not add a second call to `applyDiagnosticHierarchy` after
`mergeDiagnostics()` in the latch-off/fallback path — that would be an unrequested behaviour
change to 0.16.x's diagnostic output, which criterion 3 forbids.

**Warning signs:** a plan task that says "make Rule 0 fire" or "re-run `applyDiagnosticHierarchy`
after the bbjcpl merge" without an explicit CONTEXT.md decision authorizing that latch-off change.

### Pitfall 2: Downgrading severity alone does not remove a diagnostic from the `Parse` tier

**What goes wrong:** D-04's downgrade (Error → Warning) is implemented by only changing
`severity`, leaving `data.code` as `DocumentValidator.ParsingError` (or leaving `data` on a
line-break diagnostic pointing at whatever new tag was added for D-04's own tagging need). D-05
("the hidden or downgraded Langium parse errors no longer trigger Rule 1's linking-error
suppression") then silently fails, because:

```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:63-68 (read this session)
function getDiagnosticTier(d: Diagnostic): DiagnosticTier {
    if (d.source === 'BBjCPL') return DiagnosticTier.BBjCPL;
    if (d.data?.code === DocumentValidator.ParsingError) return DiagnosticTier.Parse;
    if (d.severity === DiagnosticSeverity.Error) return DiagnosticTier.Semantic;
    return DiagnosticTier.Warning;
}
```

`getDiagnosticTier` checks `data?.code` **before** severity. A diagnostic with `data.code ===
'parsing-error'` is `Parse` tier regardless of whether its `severity` is Error or Warning. Rule 1
(`hasParseErrors = diagnostics.some(d => getDiagnosticTier(d) === Parse)`) and Rule 3 (parse-tier
diagnostics counted against `maxErrors`) both key off this tier, not severity.

**Why it happens:** the tier function predates this phase and was designed when "Parse tier" and
"is an Error" were always the same thing; Phase 103 is the first change that needs a diagnostic
that is syntax-flavoured but NOT the current-severity Parse tier.

**How to avoid:** when downgrading, change `data` to a value that does NOT equal
`DocumentValidator.ParsingError`/`DocumentValidator.LexingError`/a bare-line-break marker — e.g. a
new distinct code (`'bbj-downgraded-syntax'`) — so `getDiagnosticTier` falls through to the
severity check and classifies it as `Warning` tier. Simultaneously, `getDiagnosticTier` (or a
parallel check) needs a way to recognize "this is a downgraded syntax warning" for the Rule 2
exemption (D-06) — the same new `data.code` value can serve both purposes.

**Warning signs:** a unit test asserting D-05 (linking errors reappear after downgrade) fails
while a unit test asserting D-04 (severity is Warning) passes — that combination is exactly this
bug.

### Pitfall 3: `RequestCancelled` is not a "failure" for D-02's fallback purposes

**What goes wrong:** Treating every non-verdict `requestLiveParse()` outcome (including
`RequestCancelled`) as triggering the D-02 bbjcpl fallback would run `bbjcpl` on a normal fast-typing
cycle where the server simply superseded a stale request — not an actual endpoint problem.

**Why it happens:** Phase 102's own `requestLiveParse()` already special-cases
`LSPErrorCodes.RequestCancelled`, checking it **before** classifying failure kinds and returning
`[]` with no log line at any level (`bbj-parser-service.ts:233-237`). Phase 102 D-08's failure-kind
list (-33001..-33005, transport, malformed-result) does not include `RequestCancelled` — the
102-CONTEXT.md text is explicit: "It is the server's normal answer to a superseded request on
ordinary fast typing, not a failure."

**How to avoid:** the widened `requestLiveParse()` return type needs (at minimum) to distinguish
three outcomes for the caller: verdict, failure (→ run bbjcpl fallback), and
cancelled/superseded (→ neither a verdict nor a failure; this debounce cycle produces no new
diagnostic state and should not disturb carry-over state or trigger the fallback). This is flagged
as an Open Question below since CONTEXT.md does not fully specify the cancelled-during-a-debounce-cycle
case (it is a narrower race than the ordinary keystroke-supersedes-keystroke case Phase 102 already
handles, since the debounce's own request being cancelled implies another request raced it).

**Warning signs:** a fallback test that scripts `{ code: LSPErrorCodes.RequestCancelled, message: '...' }`
and asserts `bbjcpl` was invoked — that assertion encodes the wrong behaviour per Phase 102 D-08.

### Pitfall 4: `LangiumDocument` objects outlive `didClose` — carry-over state needs explicit clearing

**What goes wrong:** Assuming a closed-then-reopened document gets a fresh `LangiumDocument`
object (so a `WeakMap<LangiumDocument, VerdictState>` would "just work" via garbage collection).

**Why it happens:** `DefaultDocumentUpdateHandler` (`node_modules/langium/lib/lsp/document-update-handler.js`,
read this session) wires only `didChangeContent` → `fireDocumentUpdate([uri], [])` and
`didChangeWatchedFiles`; there is no `didClose` handler in this file at all, and `bbj-document-builder.ts`
adds none either. The document stays indexed and revalidatable (e.g. via another file's `USE`
reference) after close, for as long as the file exists in the workspace.

**How to avoid:** use a keyed `Map<string, VerdictState>` (key = uri string, matching the existing
`cplDebounceTimers` key style at `bbj-document-builder.ts:56`) and clear the entry explicitly via
`TextDocuments.onDidClose` (Pattern 2 above), not rely on object identity/GC.

**Warning signs:** stale downgraded-warning carry-over reappearing after a document is closed and
reopened without any new edit — the carry-over state from before close never got cleared.

## Code Examples

### The exact `DocumentValidator` code constants Phase 103 must tag against

```typescript
// Source: bbj-vscode/node_modules/langium/lib/validation/document-validator.js:279-287 (read this session)
export var DocumentValidator;
(function (DocumentValidator) {
    DocumentValidator.LexingError = 'lexing-error';
    DocumentValidator.LexingWarning = 'lexing-warning';
    DocumentValidator.LexingInfo = 'lexing-info';
    DocumentValidator.LexingHint = 'lexing-hint';
    DocumentValidator.ParsingError = 'parsing-error';
    DocumentValidator.LinkingError = 'linking-error';
})(DocumentValidator || (DocumentValidator = {}));
```

Lexing errors get `data: toDiagnosticData(severity)` → `diagnosticData(DocumentValidator.LexingError)`
for an error-severity lexer diagnostic (`document-validator.js:54-76`); parser errors get
`data: diagnosticData(DocumentValidator.ParsingError)` (`document-validator.js:104-111`). Both are
produced by the **base** `DefaultDocumentValidator` methods, which `BBjDocumentValidator` does
**not** override (only `processLinkingErrors` and `toDiagnostic` are overridden — confirmed by
reading the whole of `bbj-document-validator.ts` this session, lines 164-275).

### The line-break validator's current, untagged `accept()` calls

```typescript
// Source: bbj-vscode/src/language/validations/line-break-validation.ts:70-73, 81-84, 98-101 (read this session)
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

`ValidationAcceptor`'s `DiagnosticInfo` type carries `data?: unknown`
(`node_modules/langium/lib/validation/validation-registry.d.ts:34`), and `toDiagnostic()` (both
the base and `BBjDocumentValidator`'s override) passes `data: info.data` straight through onto the
final `Diagnostic` (`document-validator.js:216`; `bbj-document-validator.ts:270`). Adding
`data: { code: 'bbj-line-break-error' }` (one shared code, or per-message codes — Claude's
Discretion) to all three `accept()` call sites is a minimal, mechanical, already-supported change.

### `requestLiveParse()`'s current failure/verdict collapse

```typescript
// Source: bbj-vscode/src/language/bbj-parser-service.ts:213-246 (read this session)
public async requestLiveParse(document: LangiumDocument): Promise<Diagnostic[]> {
    this.resetIfGenerationChanged();
    const generation = this.javaInteropService.connectionGeneration;
    const params: ParseProgramParams = { /* ... */ };
    try {
        const result = await this.javaInteropService.parseProgram(params);
        if (!Array.isArray(result?.errors)) {
            this.logFailure(MALFORMED_RESULT_KIND, 'result.errors was missing or not an array');
            return [];                                    // <-- failure, empty array
        }
        this.latchOn(generation);
        this.reportedFailureKinds.clear();
        return parseErrorsToDiagnostics(result.errors, document.textDocument.lineCount, getMaxErrors());
                                                            // <-- verdict, possibly ALSO an empty array (0 errors)
    } catch (e) {
        const code = (e as { code?: number } | undefined)?.code;
        if (code === LSPErrorCodes.RequestCancelled) {
            return [];                                    // <-- cancelled, NOT a failure (Phase 102 D-08)
        }
        if (code === METHOD_NOT_FOUND) {
            this.latchOff(generation);
            return [];                                    // <-- latch flips off, not a per-cycle failure signal
        }
        const message = e instanceof Error ? e.message : String(e);
        this.logFailure(classifyFailureKind(code), message);
        return [];                                        // <-- failure, empty array
    }
}
```

Four distinct outcomes (`malformed-result` failure, genuine zero-error verdict, cancelled, every
other failure kind) all currently return the identical `[]`. `document-builder.test.ts`'s existing
`requestLiveParseMock` (a `vi.fn<(document: LangiumDocument) => Promise<Diagnostic[]>>()`) and
`bbj-parser-service.test.ts`'s live harness both call/mock this exact signature, so widening the
return type is a contained, two-test-file change plus the one production call site in
`debouncedCompile()` (`bbj-document-builder.ts:281`).

### `connectionGeneration` — the reset signal Phase 102 already built for this exact problem

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:212-215, 365, ~1151 (read this session)
public get connectionGeneration(): number {
    return this._connectionGeneration;
}
// bumped in establishConnection() (a fresh MessageConnection, e.g. post-outage reconnect):
//     this.connection = connection;
//     this._connectionGeneration++;
// bumped again in clearCache() (the refresh-Java-classes command / cache clear):
//     this._connectionGeneration++;
```

`BBjParserService.resetIfGenerationChanged()` already reads this field to invalidate its own
on/off latch (`bbj-parser-service.ts:193-202`); the same field, read the same way, is the natural
signal to also clear D-08's per-document carry-over state (Claude's Discretion: "connection reset
per Phase 102 D-06").

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (version pinned in `bbj-vscode/package.json`'s devDependencies; run as `vitest run`) |
| Config file | `bbj-vscode/vitest.config.ts` (unmodified by this phase) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (or `npm test`, per CLAUDE.md) |

CLAUDE.md/memory note (do not violate): run from `bbj-vscode/`, never with a relative `npm --prefix`
path from repo root (fixture ENOENT); never use `--reporter=basic` (not a valid vitest 4.1.10
flag — a prior planner mistake, per project memory `planner-vitest-reporter-basic.md`); judge
whole-suite health on `numFailedTests: 0`, not "failed suites" count (contention-caused
`initializeWorkspace` `beforeAll` timeouts are pre-existing noise, per project memory).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PSRV-06 | A line both sources flag shows one diagnostic; bbjcpl adds nothing the endpoint already reported | unit (pure reconciliation function) | `npx vitest run test/<new-reconciliation-file>.test.ts` | ❌ Wave 0/1 — new file, following `test/cpl-integration.test.ts`'s `mergeDiagnostics` pattern |
| PSRV-06 | The save-time `bbjcpl` run is skipped while the latch is on | unit (builder wiring) | `npx vitest run test/document-builder.test.ts` | ✅ extend existing `buildHarness()` |
| PSRV-06 | Per-cycle fallback runs `bbjcpl` on a live-parse failure, not a verdict | unit (builder wiring, scripted double) | `npx vitest run test/bbj-parser-service.test.ts` | ✅ extend existing harness with `scriptParseProgram({code: -33001, ...})` etc. |
| PSRV-07 | An accepted document shows no lexer/parser/line-break Error from the language server | unit (reconciliation function: downgrade path) | `npx vitest run test/<new-reconciliation-file>.test.ts` | ❌ Wave 0/1 |
| PSRV-07 | D-08: carry-over of the previous verdict's downgrades between verdicts | unit (validator wiring, message+line-text matching) | `npx vitest run test/<new-reconciliation-file>.test.ts` (or a `bbj-document-validator.test.ts`, which does not exist yet) | ❌ Wave 0/1 |
| PSRV-06/07 | With the endpoint unavailable, the v3.7/0.16.x diagnostic behaviour returns unchanged | integration (latch-off regression, old-server double) | `npx vitest run test/document-builder.test.ts` (or a dedicated latch-off regression file) | ❌ Wave 0/2 — explicitly requested by CONTEXT.md's plan-split note |
| criterion 4 | Conformance run, endpoint active, list B trending down | manual/external | `conformance/run.mjs --ls <this repo>` (private `bbj-corpus` repo, not in CI) | n/a — Phase 104's formal gate; this phase's "working measurement" only |

### Sampling Rate
- **Per task commit:** the targeted new/changed test file(s) via `npx vitest run test/<file>.test.ts`
- **Per wave merge:** `cd bbj-vscode && npx vitest run` (full suite)
- **Phase gate:** full suite green (`numFailedTests: 0`) before `/gsd-verify-work`; the conformance
  run (criterion 4) is a separate, manual, phase-boundary measurement outside `npm test`

### Wave 0 Gaps
- No `bbj-document-validator.test.ts` exists today — `applyDiagnosticHierarchy` is entirely
  untested directly (confirmed: `grep` across `test/*.ts` for `applyDiagnosticHierarchy`,
  `DiagnosticTier`, `hasBbjcplErrors` matched nothing). The pure reconciliation function this phase
  adds should get its own describe block(s), whether in a new file or appended to
  `test/cpl-integration.test.ts` beside the existing `mergeDiagnostics` tests (same import,
  `bbj-document-validator.js`).
- A latch-off regression test proving 0.16.x behaviour is explicitly called for in CONTEXT.md's
  own plan-split suggestion (plan 2) and does not exist yet.

*(No framework install needed — Vitest, the double, and the harness patterns are all already in
place.)*

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (absent key =
enabled per project convention; STATE.md confirms "Security enforcement is on" project-wide).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase touches no auth path |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | indirectly | `ParseError.message`/`categories` (BBj's own text) are already treated as opaque, never interpolated into an executed string or HTML — this phase only reads/copies existing `Diagnostic` fields (message, range, data), introducing no new untrusted-input parsing surface. The untrusted boundary (parsing BBj's wire response) was already established and audited in Phase 101/102; this phase does not touch `java-interop.ts`'s deserialization. |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Log line leaking document text | Information Disclosure | Already mitigated and unchanged: `BBjParserService.logFailure()`'s doc comment states "never the request's document text, at any level" (`bbj-parser-service.ts:250-253`, unchanged by this phase) |
| A malformed/adversarial `ParseError.message` string reflected verbatim into a `Diagnostic` shown in two IDEs | Tampering (of displayed content, low severity — LSP diagnostics are already plain text, not rendered as markup in either client) | No new mitigation needed; this phase copies `message`/`data`/`range` fields byte-for-byte from already-existing `Diagnostic` objects (both Langium's own and `BBJ_PARSER_SOURCE`'s), it does not construct new strings from untrusted input |

No new threat surface is introduced: this phase reshuffles/filters an in-memory array of already-validated
`Diagnostic` objects; it opens no new socket, parses no new wire format, and adds no new
user-controlled input path.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Open Question below (whether a `RequestCancelled` outcome during a debounce cycle should leave carry-over state untouched vs. treated some other way) is not resolved by any existing CONTEXT.md decision — it is a genuine gap, flagged rather than assumed away. Not an `[ASSUMED]` factual claim; see Open Questions. | Common Pitfalls / Open Questions | Low — a wrong default (treating cancelled as a no-op) matches Phase 102's own precedent and is the safe conservative choice; the planner should still confirm with the user or make it an explicit, reversible discretion note in the plan |
| A2 | A new file `bbj-diagnostic-reconciliation.ts` vs. co-locating the new function in `bbj-document-validator.ts` — this research presents both as viable and does not assert one is correct; CONTEXT.md explicitly leaves file/class naming to Claude's Discretion | Architecture Patterns / Recommended Project Structure | None — both options are structurally sound; this is a style choice, not a correctness risk |

No claim in this document that affects correctness (the Rule 0 dead-code finding, the tier
re-tagging requirement, the `RequestCancelled`-is-not-a-failure finding, the `didClose`
non-deletion finding) is `[ASSUMED]` — each was confirmed this session by reading the exact source
line(s) cited beside it, not inferred from training data or a web search. This phase needed no web
search: it is a closed problem entirely inside a codebase already present on disk.

## Open Questions

1. **Does a `RequestCancelled` outcome on the debounce cycle's own `parseProgram` request count as
   "no verdict, no failure, do nothing this cycle" or should it fall back to bbjcpl like a genuine
   failure?**
   - What we know: Phase 102 D-08 explicitly excludes `RequestCancelled` from its "failure kinds"
     enumeration and treats it as the server's normal answer to an ordinary superseded request,
     with no diagnostic change and no log line at any level. `requestLiveParse()` already special-cases
     it identically to a verdict-shaped `[]` return today.
   - What's unclear: Phase 103's D-02 fallback trigger is worded as "if the live parse *fails*",
     and CONTEXT.md's own parenthetical scopes "failure kind" to exactly the Phase 102 D-08 list
     (which excludes `RequestCancelled`) — so by that reading, a cancelled debounce-cycle request
     should NOT trigger the bbjcpl fallback and should leave carry-over state untouched. This
     research believes that reading is correct (Pitfall 3) but flags it because CONTEXT.md does not
     say so in as many words for the *debounce cycle's own* request specifically (as opposed to the
     keystroke-supersedes-keystroke case Phase 102 already covers).
   - Recommendation: treat cancelled identically to "no new verdict this cycle" (skip both the
     reconciliation step and the fallback), matching Phase 102's existing precedent; make this an
     explicit line in the plan's task description so a reviewer can confirm it against CONTEXT.md
     rather than re-deriving it.

2. **Exact shape of `requestLiveParse()`'s widened return type.**
   - What we know: it must carry a verdict/failure distinction alongside the diagnostics array
     (D-02), and the two existing test files that reference the method will need updating either
     way.
   - What's unclear: CONTEXT.md leaves the exact shape to the planner/implementer ("minimal API
     change"); this research suggests `{ diagnostics: Diagnostic[]; verdict: boolean }` as one
     reasonable minimal option but does not mandate it.
   - Recommendation: the plan should pick one concrete shape (or equivalent, e.g. a thrown sentinel
     class vs. a discriminated union) and note it as a task-level decision, not leave it to
     execution-time improvisation, since both `bbj-document-builder.ts`'s call site and two test
     files depend on the exact shape.
