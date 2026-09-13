# Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability - Research

**Researched:** 2026-09-12
**Domain:** Langium LSP server extension (shared `textDocument/codeLens`), VS Code webview composer, IntelliJ/LSP4IJ dialog + Code Vision bridge — extending an existing, well-established composer family (MSGBOX/addWindow/addChildWindow/SETOPTS) in this repo
**Confidence:** HIGH (every claim below is either read directly from this repo's own source this session, or carried forward from the milestone-level FEATURES.md/PITFALLS.md/ARCHITECTURE.md research, which is itself HIGH-confidence per its own sourcing)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The new shared server-side `textDocument/codeLens` cue retires the existing
  client-side mechanisms it duplicates: VS Code's SETOPTS-only `CodeLensProvider`
  (`setopts-composer-ui.ts`) is replaced by the unified lens, built as one shared implementation in
  this phase (not staged — all 5 composers migrate together, avoiding a half-migrated state).
  Reversible — the old provider's `parseSetOptsLine` applicability logic is exactly what the new
  handler's SETOPTS detector reuses.
- **D-02:** This phase retrofits the cue onto the already-shipped SETOPTS `config.bbx` composer
  (Phase 87, DISC-04) too, not just the three composers whose other behavior changes in this phase
  (MSGBOX-expr, CVS, in-code SETOPTS from Phase 88). All 5 composers get the cue in this phase; none
  is deferred to a cleanup phase.
- **D-03:** The VS Code lightbulb/Quick Fix (`CodeActionProvider`, Ctrl+.) for MSGBOX/addWindow/
  addChildWindow/CVS stays exactly as-is alongside the new CodeLens — a different, caret-triggered
  affordance from the always-visible lens. Only the SETOPTS-specific client-side CodeLens provider
  is replaced (D-01).
- **D-04:** Cue label text is composer-type-specific ("Compose MSGBOX", "Compose SETOPTS",
  "Compose CVS()", etc.), matching the existing lightbulb action labels' naming convention.
- **D-05:** Text-only label, no per-composer icon — matches the existing lightbulb/CodeLens
  convention already in this codebase.
- **D-06:** The cue is unconditionally visible on every eligible line, never gated on caret/
  selection proximity — matches DISC-01's wording ("without placing the caret").
- **D-07:** If the roadmap's Success Criterion 1 spike finds Code Vision does not render against
  the plugin's actual `sinceBuild` range, a `LineMarkerProvider` fallback is an acceptable
  *permanent* answer — provided it renders the exact same server-computed applicability data (never
  a parallel Java re-implementation). A visually different look between the two IDEs is an
  acceptable platform difference, not a blocker. Reversible — swapping the rendering mechanism
  later touches only the client-side renderer.
- **D-08:** When an options expression can't decode to a recognized constant sum, the composer
  dialog displays the user's original raw expression text (read-only) before commit, plus an
  explicit banner distinguishing compose-and-replace mode from decode-and-prefill (e.g. "Could not
  decode this expression — composing will replace it"). Reversible — UI-only addition.
- **D-09:** No extra confirmation step (no second "Replace expression?" dialog) beyond the normal
  composer OK/Apply button — D-08's banner and original-expression display already surface the
  risk.
- **D-10:** When the expression *is* successfully decoded to a recognized constant sum, the
  composer treats it exactly like editing an existing integer-literal MSGBOX call — pre-filled
  checkboxes only, no extra raw-expression display.
- **D-11:** The CVS() composer uses a simple flat single-section checkbox layout (no byte-group
  headers, no `JBScrollPane`) rather than SETOPTS's byte-grouped scrollable-panel skeleton. It
  still reuses `ComposerFlow`/`StaleEditGuard`/`PreviewDebouncer` underneath. Reversible —
  layout-only, no DTO/request impact.
- **D-12:** The version-gated `chars` parameter gets one shared text field (not per-bit), shown
  once. It is greyed out with a tooltip when none of bits 1/2/16/32/128 are selected — following
  the same bbj-annotated grey-out convention Phase 87 D-08 established for SETOPTS — rather than
  hidden entirely.
- **D-13:** No client-side single-char-vs-multi-char version gating on the `chars` field — the
  composer has no existing notion of a configured target BBj version. The field accepts any
  string; an unsupported multi-char value surfaces through the existing compile-time/runtime error
  path, not a new client-side check.
- **D-14:** Edit-in-place for an existing CVS() call recognizes a mask argument that is a
  **constant-sum of integer literals** (e.g. `5`, `1+4`, `1+2+128`) — mirroring DISC-02's MSGBOX
  constant-sum recognition, not merely a bare single literal. Literals-only: no named-constant or
  java-interop-backed static-field resolution (no such catalog exists for CVS() bits). The
  string/first argument is preserved verbatim, never decoded. A mask involving a variable or method
  call falls back to decode-only/no edit action. Reversible — detection-logic change only, not a
  DTO/wire-format change.

### Claude's Discretion

- Exact new `bbj/composer/cvs/*` request names (e.g. `decodeCall`, `preview`) — follow the existing
  `bbj/composer/{msgbox,setopts}/*` naming convention in `composer-commands.ts`.
- The exact `textDocument/codeLens` handler's internal structure (new module vs. extending
  `composer-commands.ts`) and how it aggregates the five composers' existing per-line detectors,
  informed by Pitfall 11's requirement to hook into the existing document-build/validation cycle
  rather than a full-AST walk per request.
- `ConfigureCvsIntention.java` / CVS CodeAction class names and exact label wording, and the new
  CVS dialog's class name (e.g. `CvsComposerDialog.java`).
- Exact wording of the MSGBOX compose-and-replace banner (D-08) and where in the dialog the
  original-expression text renders.
- Whether the new shared CodeLens handler is a clean new registration or retires/replaces
  `composer-commands.ts`'s implicit per-composer detection entry points — likely the aggregator
  calls the same existing functions rather than duplicating them (D-01's intent), confirm during
  planning.

### Deferred Ideas (OUT OF SCOPE)

- **Composer robustness** (malformed free-text rejection, MSGBOX QuickPick edit-window safety,
  listener leak fixes, IntelliJ debounce/cache for repeated dialog opens) — DISC-07..11, Phase 90;
  the new CVS dialog and codeLens handler should follow those patterns where they already exist
  (`PreviewDebouncer`) but the *fixes themselves* belong to Phase 90.
- **General constant expression evaluation beyond a literal sum** for either MSGBOX or CVS() option
  arguments — explicitly an anti-feature; any expression with a variable or method call always
  falls back to compose-only/decode-only, never attempted.
- **A configured target-BBj-version setting** that would let the CVS() `chars` field warn on a
  genuine single-char/multi-char version mismatch — D-13 explicitly declines to invent this state
  for this phase.
- Four reviewed-but-not-folded todos (Node.js path/cached-download fallback, live Windows Node
  check, gradle-wrapper-hygiene fixture, live-interop `getAllClassNames` test drift) — unrelated to
  composer discoverability, already reviewed and declined by Phases 87/88.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 (#650) | User sees a persistent, clickable cue on every line where a composer applies (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS) in both VS Code and IntelliJ, without placing the caret or opening a context menu | "Architecture Patterns → Pattern 1/2" (Langium `CodeLensProvider` service + reuse of existing `*parseLine` detectors); "Common Pitfalls #2" (no per-keystroke reparse) and "#4" (Code Vision spike discipline); "Validation Architecture" test map |
| DISC-02 (#648) | User is offered the MSGBOX composer when the options argument is an expression; a sum of constant Java static fields or integer literals pre-fills the composer, any other expression opens it in compose-and-replace mode | "Summary" and "Architecture Patterns → Pattern 3" (reverse constant lookup needs no java-interop call — closed catalog); "Code Examples" (`NOT_EDITABLE_REASON_TEXT` banner-text precedent for D-08); "Security Domain" (compose-and-replace mitigation) |
| DISC-03 (#649) | User can compose a CVS() call visually in both IDEs from the documented bit operations (1, 2, 4, 8, 16, 32, 64, 128; applied in ascending order) with the version-gated `chars` parameter, and can edit an existing literal-mask CVS() call in place | "Recommended Project Structure" (cvs-composer.ts/-ui.ts/-webview.ts + CvsComposerDialog.java); "Common Pitfalls #1" (functions.ts/.bbl arity gap — hard prerequisite for the `chars` field); "Don't Hand-Roll" (CVS mirrors the addWindow/SETOPTS composer shape) |

</phase_requirements>

## Summary

This phase has no new external dependencies and no new subsystem — it is a fifth composer
(CVS()) built with the exact same three-part shape (`*-composer.ts` domain module → `bbj/composer/*`
LSP handlers → per-IDE dialog/webview) already used by MSGBOX/addWindow/addChildWindow/SETOPTS, plus
one genuinely new server capability (`textDocument/codeLens`) that all five composers plug into.
Langium natively supports a `CodeLensProvider` LSP service (`provideCodeLens(document, params,
cancelToken)`), the same extension-point shape as the already-registered `InlayHintProvider`/
`HoverProvider` in `bbj-module.ts` — this is the correct place to add the new handler, not a raw
`connection.onCodeLens` call. On the IntelliJ side, LSP4IJ 0.21.0 (the version this plugin is
Gradle-pinned to) maps LSP `CodeLens` responses to IntelliJ's native Code Vision entries via
`LSPCodeLensFeature.createCodeVisionEntry`, registered through `LanguageServerFactory
#createClientFeatures().setCodeLensFeature(...)` — the same fluent-registration pattern this
plugin's `BbjLanguageServerFactory` already uses for `setDocumentLinkFeature`/`setCompletionFeature`.
CodeLens is enabled by default in LSP4IJ (gated on server capability advertisement), so the
roadmap's Success Criterion 1 go/no-go spike is a low-risk feasibility check, not a genuine
architecture fork — but it is still required before other cue-dependent work is treated as done,
per D-07's explicit acceptance of a `LineMarkerProvider` fallback if the spike fails.

Two verified findings materially change scope beyond what CONTEXT.md and the milestone research
already describe. First, MSGBOX's own `BUTTON_SETS`/`ICONS`/`DEFAULT_BUTTONS`/`FLAGS` catalogs in
`msgbox-composer.ts` already carry every `BBjMsgBox.*` constant's numeric value (used today only to
render the *forward* `constant` name from a value); DISC-02's "sum of constant Java static fields"
recognition needs **no java-interop call at all** — it is a closed, in-repo reverse-lookup table
build, not a live class resolution. Second, the built-in `CVS()` signature in
`bbj-vscode/src/language/lib/functions.ts` (and its manually-synced mirror `functions.bbl`) declares
only two positional parameters (`str`, `conversion_flags`) with no `chars` parameter, and `CVS` is
not in `check-function-calls.ts`'s `VARIADIC` exemption set — so a composer that emits the
version-gated `chars` argument (D-12) will trigger the existing arity validator's "too many
arguments" warning on every line it composes, unless the built-in catalog is widened in the same
phase. Both catalogs must be updated together per this project's existing (memorized) "lib
`.bbl`/`.ts` manual sync" convention.

**Primary recommendation:** build `cvs-composer.ts`/`cvs-composer-ui.ts`/`cvs-composer-webview.ts`
as a direct structural clone of the `addwindow-composer.*` trio (mask-based, editable-literal shape,
closer to CVS than SETOPTS's byte-grouped model), add one `CodeLensProvider` Langium service that
aggregates the five composers' existing `*parseLine`/`*decodeCall` detectors, extend
`BbjLanguageServerFactory#createClientFeatures()` with `.setCodeLensFeature(...)`, and widen
`functions.ts`/`functions.bbl`'s `CVS` signature to declare `chars` as a third optional positional
parameter before shipping any composer output that uses it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Composer-applicability detection (does this line have a CVS/MSGBOX/etc. call?) | API / Backend (shared language server) | — | Already centralized in `composer-commands.ts`'s `*parseLine`/`*decodeCall` handlers; single source of truth per that file's own header comment |
| Discoverability cue rendering (CodeLens / Code Vision) | Browser / Client (VS Code `CodeLensProvider`) + Frontend-equivalent (IntelliJ LSP4IJ Code Vision bridge) | API / Backend (LS computes the lens entries) | LSP `textDocument/codeLens` is computed server-side; each client renders it with its own native UI — no client re-derives applicability |
| MSGBOX expression decode (constant-sum recognition) | API / Backend (`msgbox-composer.ts`) | — | Pure, deterministic, no I/O — belongs beside the existing `decode`/`encode` functions, not duplicated per client |
| CVS() catalog + mask encode/decode | API / Backend (new `cvs-composer.ts`) | — | Mirrors `setopts-catalog.ts`/`addwindow-composer.ts`; must stay `vscode`-free for reuse by both hosts |
| CVS composer dialog (chars field, checkbox list) | Browser / Client (VS Code webview) + IntelliJ Swing dialog | — | UI-only; both call the same LS preview/decode requests, never re-implement mask arithmetic |
| Built-in `CVS()` signature/arity (functions.ts/.bbl) | API / Backend (Langium grammar-adjacent library catalog) | — | Governs whether the composer's own emitted `chars` argument passes validation; must be updated in this tier, not worked around client-side |

## Standard Stack

No new external packages. This phase extends existing in-repo modules using already-present
dependencies (Langium's LSP module, `vscode-languageserver`, LSP4IJ 0.21.0, lsp4j, Gson) — no
`npm install` / Gradle dependency change is needed.

### Core (existing, reused)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | pinned in `bbj-vscode/package.json` (already installed) | `CodeLensProvider` LSP service interface (`lsp/code-lens-provider.d.ts`) | Native extension point, same shape as the already-wired `InlayHintProvider` |
| `com.redhat.devtools.lsp4ij` | `0.21.0` [VERIFIED: bbj-intellij/build.gradle.kts:34] `plugin("com.redhat.devtools.lsp4ij:0.21.0")` | `LSPClientFeatures.setCodeLensFeature(...)` → IntelliJ Code Vision bridge | Already the plugin's sole LSP client library; Gradle-pinned since Phase 81 (raised from 0.19.0) |
| `org.eclipse.lsp4j` (vendored by LSP4IJ) | matches the 0.21.0 pin | `CodeLens`/`Command` wire types | Existing pattern — read reflectively where prior version-skew bugs occurred (Pitfall 13) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared LSP `textDocument/codeLens` | Native IntelliJ `LineMarkerProvider` per composer | Ruled out as an anti-feature (no PSI in this plugin; would duplicate applicability logic in Java) unless the D-07 spike proves Code Vision itself doesn't render, in which case the *fallback* must still render server-computed data, not reimplement detection |

**Installation:** none — no new packages.

**Version verification:** `com.redhat.devtools.lsp4ij:0.21.0` confirmed present in
`bbj-intellij/build.gradle.kts:34` [VERIFIED: bbj-intellij/build.gradle.kts:28-38] (this session, via
`Read`, quoted below in Code Examples). No `npm view`/`pip index` verification needed since no new
package is introduced.

## Package Legitimacy Audit

**Not applicable.** This phase adds no new npm, PyPI, or Maven/Gradle dependency. All new code
(`cvs-composer.ts`, the CodeLens handler, `CvsComposerDialog.java`) is authored in-repo, using
libraries already present and already audited in prior phases (LSP4IJ 0.21.0's legitimacy is not
re-litigated here — it is the project's existing, load-bearing LSP client).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────── VS Code host ───────────────────────────┐
│  editor keystroke/open/save                                        │
│        │                                                            │
│        ▼                                                            │
│  vscode.languages.registerCodeLensProvider (NEW, one provider       │
│  aggregating all 5 composer kinds, mirrors existing per-composer    │
│  CodeActionProvider/CodeLensProvider registration pattern)          │
│        │  in-process call (same Node process, no LSP hop)           │
│        ▼                                                            │
│  msgbox-composer.ts / cvs-composer.ts (NEW) / addwindow-composer.ts │
│  / addchildwindow-composer.ts / setopts-catalog.ts                  │
│  — each exports *parseLine(line) -> applicability info              │
└───────────────────────────┬──────────────────────────────────────────┘
                             │ LSP stdio (IntelliJ only — VS Code calls in-process)
                             ▼
┌─────────────────────── Language Server (main.cjs) ──────────────────┐
│  bbj-module.ts lsp: { ..., CodeLensProvider: (services) =>          │
│    new BBjComposerCodeLensProvider(services) }   (NEW)              │
│        │ provideCodeLens(document, params) scans document lines,    │
│        │ calls the SAME *parseLine/*decodeCall functions VS Code    │
│        │ calls in-process and IntelliJ calls over bbj/composer/*    │
│        ▼                                                            │
│  composer-commands.ts: bbj/composer/{msgbox,addwindow,              │
│    addchildwindow,setopts,cvs (NEW)}/* — thin pass-throughs         │
│        │                                                             │
│        ▼                                                             │
│  msgbox-composer.ts: NEW constant-sum decode (reverse lookup over   │
│    BUTTON_SETS ∪ ICONS ∪ DEFAULT_BUTTONS ∪ FLAGS, no interop call)  │
│  cvs-composer.ts (NEW): CVS_BITS catalog, mask encode/decode,        │
│    literal-sum edit-in-place recognition (D-14)                     │
└───────────────────────────┬──────────────────────────────────────────┘
                             │ LSP stdio (LSP4IJ dynamic proxy)
                             ▼
┌────────────────────── IntelliJ host (LSP4IJ) ───────────────────────┐
│  BbjLanguageServerFactory.createClientFeatures()                     │
│    .setCodeLensFeature(new LSPCodeLensFeature() {...})  (NEW)       │
│        │ maps LSP CodeLens -> IntelliJ Code Vision entry            │
│        │ (fallback: LineMarkerProvider rendering the SAME server    │
│        │  data, if the D-07 spike finds Code Vision doesn't render) │
│        ▼                                                             │
│  BbjComposerServer.java: + cvs*()  methods (NEW, same interface)     │
│        │                                                              │
│        ▼                                                              │
│  CvsComposerDialog.java (NEW) -> ComposerFlow -> StaleEditGuard       │
│    (existing seams, reused as-is)                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
bbj-vscode/src/
├── cvs-composer.ts              # NEW — CVS_BITS catalog, mask encode/decode, parseLine/decodeCall
├── cvs-composer-ui.ts           # NEW — VS Code CodeActionProvider (lightbulb) + command registration
├── cvs-composer-webview.ts      # NEW — VS Code webview panel (flat checkbox list, chars field)
├── composer-codelens.ts         # NEW (or extend composer-commands.ts) — the shared aggregator
├── msgbox-composer.ts           # MODIFIED — constant-sum decode/reverse lookup (#648)
├── language/
│   ├── composer-commands.ts     # MODIFIED — new bbj/composer/cvs/* entries in composerHandlers
│   ├── bbj-module.ts            # MODIFIED — lsp.CodeLensProvider registration
│   └── lib/
│       ├── functions.ts         # MODIFIED — CVS() signature gains chars?:string
│       └── functions.bbl        # MODIFIED — mirror the same signature change (manual sync)

bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── composer/
│   ├── CvsComposerDialog.java           # NEW — flat single-section layout (D-11)
│   ├── ConfigureCvsIntention.java       # NEW — Alt+Enter lightbulb, mirrors ConfigureMsgboxIntention
│   ├── ComposerModels.java              # MODIFIED — Cvs* DTOs
│   └── BbjComposerServer.java           # MODIFIED — cvs*() @JsonRequest methods
└── lsp/
    └── BbjLanguageServerFactory.java    # MODIFIED — .setCodeLensFeature(...)
```

### Pattern 1: Langium `CodeLensProvider` service registration
**What:** Register a new LSP feature via Langium's DI `lsp` service group, exactly like the
existing `InlayHintProvider`/`HoverProvider`/`CodeActionProvider` entries.
**When to use:** For the phase's one new server capability (`textDocument/codeLens`).
**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-module.ts:98-106 (existing pattern, read this session)
lsp: {
    ...
    DefinitionProvider: (services) => new BBjDefinitionProvider(services),
    HoverProvider: (services) => new BBjHoverProvider(services),
    SignatureHelp: () => new BBjSignatureHelpProvider(),
    InlayHintProvider: (services) => new BBjInlayHintProvider(services),
    CodeActionProvider: (services) => new BBjCodeActionProvider(services),
    // NEW: CodeLensProvider: (services) => new BBjComposerCodeLensProvider(services),
},
```
The provider interface itself (from Langium, not authored by this project):
```typescript
// Source: bbj-vscode/node_modules/langium/lib/lsp/code-lens-provider.d.ts:10-11 (read this session)
export interface CodeLensProvider {
    provideCodeLens(document: LangiumDocument, params: CodeLensParams, cancelToken?: CancellationToken): MaybePromise<CodeLens[] | undefined>;
}
```

### Pattern 2: Per-line applicability detector, reused by CodeLens/CodeAction/decodeCall alike
**What:** Every existing composer already exposes a pure `parseXOnLine(line: string): XCallInfo |
undefined` function with no `vscode`/LSP dependency.
**When to use:** The new CVS composer and the new CodeLens aggregator both call these — the
aggregator's entire job is "for each line, ask each of the five `parseXOnLine` functions if it
applies," reusing detection, never re-deriving it.
**Example:**
```typescript
// Source: bbj-vscode/src/msgbox-composer.ts:536-538 (existing pattern, read this session)
export function parseMsgboxCallOnLine(line: string): MsgboxCallInfo | undefined {
    return findMsgboxCalls(line)[0];
}
```

### Pattern 3: Reverse constant lookup needs no java-interop call
**What:** DISC-02's "sum of constant Java static fields" for MSGBOX resolves entirely from the
existing forward catalogs.
**Why it matters:** `BUTTON_SETS`/`ICONS`/`DEFAULT_BUTTONS`/`FLAGS` in `msgbox-composer.ts` already
pair every `BBjMsgBox.*` constant name with its numeric value (used today by `msgboxConstantsExpr`
to go value → name). Building `value → name` is trivial; the new work is `name → value` (parsing
`BBjMsgBox.X+BBjMsgBox.Y` text and summing recognized names), which is a **pure string/lookup
operation against the same four already-imported catalogs** — no `java-interop.ts`/socket call, no
new async path.
```typescript
// Source: bbj-vscode/src/msgbox-composer.ts:12-52 (existing catalogs, read this session)
export const BUTTON_SETS: CatalogItem[] = [
    { value: 0, label: 'OK', constant: 'MSGBOX_BUTTONS_OK' },
    { value: 1, label: 'OK, Cancel', constant: 'MSGBOX_BUTTONS_OK_CANCEL' },
    // ... ICONS, DEFAULT_BUTTONS, FLAGS follow the identical { value, constant } shape
];
```
A reverse map (`Map<string /* 'BBjMsgBox.MSGBOX_BUTTONS_OK_CANCEL' */, number>`) built once from
these four arrays, plus a parser that splits `BBjMsgBox.X+BBjMsgBox.Y+256+1` on top-level `+` and
sums recognized-constant lookups and bare integer literals (falling back to compose-and-replace on
the first unrecognized token, per D-08), is the entire DISC-02 decode path.

### Anti-Patterns to Avoid
- **Re-deriving composer applicability inside the CodeLens handler:** the aggregator must call the
  existing `*parseLine` functions, never re-implement "is this line a MSGBOX/CVS/etc. call" logic —
  this is `composer-commands.ts`'s own stated single-source-of-truth principle (Anti-Pattern already
  fixed once, per ARCHITECTURE.md).
- **A general constant-expression evaluator for MSGBOX/CVS options:** explicitly out of scope
  (anti-feature, FEATURES.md) — recognize only `+`-joined integer literals and known `BBjMsgBox.*`
  constant names; anything else (variables, method calls) falls back to compose-and-replace/
  decode-only, never a "best guess" evaluation.
- **A native IntelliJ `LineMarkerProvider` built independently of the language server** as the
  *primary* mechanism — only acceptable as the D-07 fallback, and only if it still renders the
  server's own computed applicability data, never a parallel Java re-implementation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is there a composer opportunity on this line, in both IDEs" | A second, IntelliJ-specific applicability scanner | One `textDocument/codeLens` handler on the shared LS, reusing the five existing `*parseLine`/`*decodeCall` functions | `composer-commands.ts`'s own header states this is the single-source-of-truth design already established by every prior composer |
| MSGBOX/CVS composer debounce on IntelliJ dialogs | A bespoke `Alarm` per new dialog | `Scheduler`/`AlarmScheduler` (Phase 79 seam) | Pitfall 12 — this is a Phase 90 (DISC-10) concern but a *new* CVS dialog must not introduce a sixth ad-hoc `Alarm` while that seam exists |
| CVS()/BBjMsgBox constant value resolution | A java-interop round trip to read static field values | The existing forward catalogs (`BUTTON_SETS` et al.) reversed in-process | Both catalogs are exhaustive, closed sets already known to this codebase — no runtime resolution needed or possible for CVS (no such catalog exists for CVS bits, D-14) |
| CVS composer launch chain (IntelliJ) | A fresh ad hoc `CompletableFuture` `thenAccept` pyramid | `ComposerFlow.launch`/`.observe` | Anti-Pattern already fixed once (pre-Phase-82 silent exception swallowing); every new composer must compose through this seam |
| CVS composer stale-edit protection (IntelliJ) | A new one-off re-decode-and-compare routine | `StaleEditGuard` | Exact re-decode/field-compare/modification-stamp shape already exists and is reused by every edit-in-place composer since #567 |

**Key insight:** this composer family has already paid down its "how do we add a sixth capability
to a shared, cross-IDE surface" cost four times (MSGBOX, addWindow, addChildWindow, SETOPTS). CVS()
is procedurally identical to that fourth time (SETOPTS via #633) — new catalog module, new
`bbj/composer/cvs/*` handlers, new dialog wired through the same seams. The only genuinely new
piece in this phase is the CodeLens surface itself, which has one clean, documented Langium
extension point.

## Common Pitfalls

### Pitfall 1: Composing a `chars` argument for CVS() triggers a false "too many arguments" warning
**What goes wrong:** The built-in `CVS()` signature declared in `functions.ts`/`functions.bbl` has
only two positional parameters. Any composed call using the version-gated third positional `chars`
argument (D-12) immediately produces a spurious `check-function-calls.ts` diagnostic on that exact
line — a composer defect that ships diagnostics on its own output.
**Why it happens:** `functions.ts`'s doc-comment table (lines 167–190) mirrors the **generic
PRO/5** CVS() page (bits only through 64, no `chars` parameter at all), not the **BBj-specific**
page FEATURES.md already sourced (bit 128, `chars` parameter, BBj 19.0+/19.10+ version gates) — the
catalog was written before this phase's own research surfaced the BBj-specific page.
**How to avoid:** Add `chars?:string` as a third optional positional parameter to both
`functions.ts:192` and `functions.bbl`'s mirrored line (memorized project convention: "lib
`.bbl`/`.ts` manual sync — functions.ts loads, functions.bbl is a hand-synced mirror, no generator;
edit both"). Do this **before or alongside** wiring the composer's `chars` field output, not as a
follow-up — otherwise every composed multi-arg CVS() call ships a warning from day one.
**Warning signs:** A composed `CVS(a$, 5, "*")` call shows a yellow squiggle reading `Function
'CVS()' accepts at most 2 arguments, but received 3.`
**Verification (exact text, read this session):**
```
// functions.ts:192 and functions.bbl:191 (identical)
CVS(str:string, conversion_flags:int, ERR?!:lineref): string
```
```typescript
// check-function-calls.ts:23, 51-53, 65-68
const VARIADIC = new Set(['MAX', 'MIN', 'ERR']);
...
const positionalParams = fn.parameters.filter(p => !p.refByName);
const requiredCount = positionalParams.filter(p => !p.optional).length;
const maxCount = positionalParams.length;
...
} else if (!VARIADIC.has(fn.name.toUpperCase()) && positionalArgs.length > maxCount) {
    accept('warning',
        `Function '${fn.name}()' accepts at most ${maxCount} argument${maxCount === 1 ? '' : 's'}, but received ${positionalArgs.length}.`,
        { node: call });
}
```
**Phase to address:** This phase (DISC-03) — a hard prerequisite for shipping the `chars` field
(D-12), not an optional cleanup.

---

### Pitfall 2: New composer discoverability cue (#650) reparses the whole file per keystroke
*(carried forward from milestone PITFALLS.md Pitfall 11 — HIGH confidence, directly maps to Roadmap
Success Criterion 5.)*
**What goes wrong:** A naive `provideCodeLens` implementation that walks the full AST per request
(or is wired to fire on every raw keystroke rather than the editor's settled-document signal)
reintroduces the per-file unbounded-scan cost pattern #505 fixes elsewhere in this milestone.
**How to avoid:** The existing `*parseLine` functions already operate on raw per-line **text**, not
AST — `provideCodeLens(document, params)` should iterate `document.textDocument.getText()` split by
line and call each detector per line, which is O(file size) with no AST walk at all (cheaper than
Pitfall 11's own worst case). LSP clients (VS Code's `CodeLensProvider`, LSP4IJ's Code Vision
bridge) already throttle `codeLens` requests to document-settled events, not raw keystrokes — do
not add a second, redundant per-keystroke trigger on either client.
**Warning signs:** visible input lag or a CPU spike while typing in a large `.bbj` file after the
cue ships.
**Phase to address:** This phase (DISC-01) — verify with a timing assertion tied to the
document-build cycle, not raw keystroke count (see Validation Architecture below).

---

### Pitfall 3: A new `bbj/composer/cvs/*` DTO surface repeats the LSP4IJ/lsp4j version-skew bugs already fixed once (G-81-4/G-81-5)
*(carried forward from milestone PITFALLS.md Pitfall 13.)*
**What goes wrong:** New composer DTOs crossing the LSP4IJ boundary (`CvsPreview`, `CvsDecodeResult`)
are tested only against the Gradle-pinned 0.21.0 build-time lsp4j jar; a runtime version skew (the
same class of bug that broke `Diagnostic.getMessage()` in Phase 81) would ship invisibly.
**How to avoid:** Extend `ComposerModelsJsonBoundaryTest`'s existing generalized harness ("across
all seven composer DTOs" per Phase 83 Plan 03) to the new CVS DTOs rather than writing a fresh,
narrower test. Keep any numeric sentinel within lsp4j's actual `int` range.
**Phase to address:** This phase — extend the existing boundary test, don't add a parallel one.

---

### Pitfall 4: The IntelliJ Code Vision spike is treated as a formality and skipped
**What goes wrong:** D-07/Roadmap Success Criterion 1 requires the spike to run and be confirmed
*before* other cue-dependent work (the CVS dialog wiring, the MSGBOX/CVS composer's own cue
entries) is considered done. Since LSP4IJ's CodeLens-to-Code-Vision bridge is a documented,
existing feature (`LSPCodeLensFeature.createCodeVisionEntry`, enabled by default), it is tempting to
treat this as "obviously works" and skip the actual same-phase spike.
**Why it happens:** The mechanism is real and well-documented, but the roadmap's own success
criterion is explicit that it must be **confirmed to compile and render visibly against the
plugin's actual `sinceBuild` range** (`242`, i.e. IntelliJ 2024.2+, [VERIFIED:
bbj-intellij/build.gradle.kts:82-84] `sinceBuild = "242"` / `untilBuild = provider { null }`) — a
documented API and an actually-rendering IDE build are not the same evidence.
**How to avoid:** Run the spike literally first: register a minimal `.setCodeLensFeature(...)` on
`BbjLanguageServerFactory`, have the server return one hard-coded `CodeLens` for a known line, build
the plugin, and confirm the inline Code Vision entry renders in a real IntelliJ instance (or the
devcontainer's available sandbox) before writing `CvsComposerDialog.java` or any composer's real
cue payload.
**Phase to address:** This phase, first — gates the rest of DISC-01's cue work per D-07.

## Code Examples

### Existing catalog shape to clone for `CVS_BITS`
```typescript
// Source: bbj-vscode/src/setopts-catalog.ts:19-32 (read this session — direct template for CVS_BITS)
export interface SetOptsBit {
    byte: number;
    mask: number;
    label: string;
    detail?: string;
    bbj?: 'ignored' | 'bbj-specific';
    bbjDetail?: string;
    since?: string;
}
```

### Existing composer-command registration shape (new CVS handlers join this object)
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:76-256 (read this session)
export const composerHandlers = {
    'bbj/composer/catalogs': () => ({ /* ... */ }),
    // ---- SETOPTS (#633) --------------------------------------------------------------------------
    'bbj/composer/setopts/decodeCall': (p: { line: string }) => { /* ... */ },
    'bbj/composer/setopts/preview': (p: { original?: string; selection: SetOptsSelection }) =>
        setoptsPreview(p.original ? parseVector(p.original) : undefined, p.selection),
} as const;

export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```
New `bbj/composer/cvs/*` entries need no change to `registerComposerRequests`'s loop — only new
entries in the `composerHandlers` object (same pattern ARCHITECTURE.md already documents for
SETOPTS's own addition).

### Existing "not-editable reason" single-source-of-truth pattern (template for D-08's banner text and D-14's CVS fallback reasons)
```typescript
// Source: bbj-vscode/src/language/setopts-in-code-request.ts:146-151 (read this session)
export type SetOptsNotEditableReason = 'shared-line';

export const NOT_EDITABLE_REASON_TEXT: Record<SetOptsNotEditableReason, string> = {
    'shared-line': "one of this chain's statements shares its physical line with other code, "
        // ...
};
```

### IntelliJ server-interface extension pattern (new CVS methods join this interface, never a new one)
```java
// Source: bbj-intellij/.../composer/BbjComposerServer.java:38, 102-109 (read this session)
public interface BbjComposerServer extends LanguageServer {
    @JsonRequest("bbj/composer/setopts/decodeCall")
    CompletableFuture<SetoptsDecodeResult> setoptsDecodeCall(SetoptsDecodeCallParams params);

    @JsonRequest("bbj/composer/setopts/preview")
    CompletableFuture<SetoptsPreview> setoptsPreview(SetoptsPreviewParams params);
}
```

### IntelliJ LSP4IJ client-features registration point (where `.setCodeLensFeature(...)` is added)
```java
// Source: bbj-intellij/.../lsp/BbjLanguageServerFactory.java:40-71 (read this session)
@Override
public @NotNull LSPClientFeatures createClientFeatures() {
    return new LSPClientFeatures() {
        @Override
        public void initializeParams(@NotNull InitializeParams params) { /* ... */ }
    }
    .setDocumentLinkFeature(new LSPDocumentLinkFeature() {
        @Override
        public boolean isSupported(@NotNull PsiFile file) { return false; }
    })
    .setCompletionFeature(new BbjCompletionFeature());
    // NEW: .setCodeLensFeature(new LSPCodeLensFeature() { ... })
}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | LSP4IJ's default `LSPCodeLensFeature` behavior (`isEnabled()` true by default, `createCodeVisionEntry` maps 1:1 to a Code Vision entry with no further per-IDE-build gating) is accurate for 0.21.0 specifically | Summary, Common Pitfalls #4 | The D-07 spike is designed precisely to catch this if wrong; if the spike fails, D-07's accepted `LineMarkerProvider` fallback absorbs the risk with no re-scoping needed |
| A2 | No other realistic BBj source pattern needs "sum of constant Java static fields" beyond the closed `BBjMsgBox.*` set already in `msgbox-composer.ts`'s catalogs (i.e., DISC-02 never needs a live java-interop resolution for some other class's static fields) | Pattern 3 | If wrong, DISC-02's "constant Java static fields" wording would need an actual interop-backed evaluator for those other classes — currently scoped as a closed, in-repo lookup only |
| A3 | The BBj-specific CVS() bit table (128, `chars` version gates BBj 19.0+/19.10+) sourced in milestone FEATURES.md remains current relative to the live BASIS docs as of this phase | Common Pitfalls #1, CVS() catalog design | If BASIS has since revised the doc, the composer's catalog/version-gate text would need a re-check against the live page before Task-level values are locked |

**Note:** A3 was `[CITED: BASIS documentation]` in the milestone-level FEATURES.md (not re-fetched
this session); it is carried forward as an assumption for this phase's own planning purposes rather
than re-verified, since CONTEXT.md's canonical-refs section directs re-use of that finding directly.

## Open Questions

1. **Exact `bbj/composer/cvs/*` request names**
   - What we know: CONTEXT.md explicitly leaves this to the planner's discretion, directing
     `composer-commands.ts`'s existing `{msgbox,setopts}/*` naming convention (`decodeCall`,
     `preview`, `compose`).
   - What's unclear: whether CVS needs a `describe`/`encode`/`decode` split like MSGBOX, or can
     collapse to just `decodeCall`/`preview` like SETOPTS (CVS has no separate "encode selection to
     number" use case outside the preview call).
   - Recommendation: follow SETOPTS's leaner two-request shape (`decodeCall` + `preview`) — CVS's
     model (flat bit list + one `chars` field) has no MSGBOX-style multi-catalog composition needing
     a separate `encode`/`decode` pair.

2. **Whether the CodeLens aggregator lives in a new file or extends `composer-commands.ts`**
   - What we know: CONTEXT.md leaves this to the planner; Pitfall 11's requirement (hook into the
     existing per-line detectors, not a fresh AST walk) constrains the *implementation*, not the
     file location.
   - What's unclear: `composer-commands.ts` is reached via `connection.onRequest` (raw LSP custom
     requests), while `CodeLensProvider` is a Langium DI service with access to the parsed
     `LangiumDocument` — these are two different registration mechanisms in this codebase today.
   - Recommendation: a new `composer-codelens.ts` module exporting a `BBjComposerCodeLensProvider`
     class (implementing Langium's `CodeLensProvider`) that *imports* the same `*parseLine`
     functions `composer-commands.ts` already imports, rather than trying to force the aggregator
     through `composer-commands.ts`'s request-handler shape.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| LSP4IJ (Gradle build-time) | IntelliJ Code Vision bridge | ✓ | 0.21.0 [VERIFIED: bbj-intellij/build.gradle.kts:34] | — |
| IntelliJ Platform (Gradle build-time) | Building/testing the plugin | ✓ | intellijIdeaCommunity("2024.2") [VERIFIED: bbj-intellij/build.gradle.kts:28] | — |
| A live IntelliJ sandbox to run the D-07 spike | Roadmap Success Criterion 1 | Unconfirmed in this devcontainer (per project memory: "no IntelliJ sandbox exists in this devcontainer" — Phase 88's live retest was blocked on exactly this) | — | Stage the spike's automated half (compiles, registers, unit-testable render-mapping logic) in this devcontainer; defer the visible-render confirmation to a human-verification checkpoint, matching Phase 88's own precedent |
| java-interop socket (:5008) | NOT required for DISC-02's constant-sum decode (Pattern 3) | n/a | n/a | n/a — confirms no new interop dependency this phase |

**Missing dependencies with no fallback:** none — the one environment gap (no local IntelliJ
sandbox) already has an established project fallback (human-verification checkpoint, per Phase 88's
precedent).

**Missing dependencies with fallback:** live IntelliJ Code Vision rendering confirmation — stage as
a `checkpoint:human-verify` task, per the project's existing pattern for anything needing a live
IDE render this devcontainer cannot produce.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (TS) | Vitest [VERIFIED: bbj-vscode/package.json script `"test"` invokes vitest; existing `*.test.ts` files under `bbj-vscode/test/`] |
| Framework (Java) | JUnit 5 [VERIFIED: bbj-intellij/build.gradle.kts:40-42 `testImplementation(platform("org.junit:junit-bom:5.10.2"))`, `useJUnitPlatform()`] |
| Config file (TS) | `bbj-vscode/vitest.config.ts` (existing, unmodified this phase) |
| Config file (Java) | `bbj-intellij/build.gradle.kts` `tasks.withType<Test>()` |
| Quick run command (TS) | `npx vitest run test/cvs-composer.test.ts` (new file) |
| Quick run command (Java) | `cd bbj-intellij && ./gradlew test --tests "*Cvs*"` |
| Full suite command (TS) | `npm test` (from `bbj-vscode/`) |
| Full suite command (Java) | `cd bbj-intellij && ./gradlew test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | CodeLens fires for all 5 composer kinds on a mixed-content document | unit | `npx vitest run test/composer-codelens.test.ts` | ❌ Wave 0 |
| DISC-01 | CodeLens computation does not scale with document size beyond a per-line scan (no AST walk) | unit (timing/structural assertion, e.g. call-count instrumentation on the detector functions) | `npx vitest run test/composer-codelens.test.ts` | ❌ Wave 0 |
| DISC-01 | IntelliJ Code Vision spike compiles and registers `.setCodeLensFeature(...)` | unit (source-guard: confirm registration call exists) + human-verify (visible render) | `cd bbj-intellij && ./gradlew test --tests "*CodeLensSourceGuard*"` | ❌ Wave 0 |
| DISC-02 | Reverse constant-sum decode recognizes `BBjMsgBox.X+BBjMsgBox.Y`, `1+256`, mixed forms | unit | `npx vitest run test/msgbox-composer.test.ts` (extend existing file) | ✅ existing file, ❌ new cases |
| DISC-02 | Unrecognized expression (variable/method call) falls back to compose-and-replace with D-08's banner text | unit | `npx vitest run test/msgbox-composer.test.ts` | ❌ Wave 0 cases |
| DISC-03 | CVS_BITS catalog encode/decode round-trips; ascending-order application note surfaces in summary text | unit | `npx vitest run test/cvs-composer.test.ts` | ❌ Wave 0 |
| DISC-03 | `chars` field greys out with no bits 1/2/16/32/128 selected; no client-side version gating (D-13) | unit | `npx vitest run test/cvs-composer-webview.test.ts` (or equivalent) | ❌ Wave 0 |
| DISC-03 | Composed `CVS(a$, mask, chars)` call produces zero `check-function-calls.ts` arity warnings once `functions.ts`/`.bbl` are widened | integration (existing `bbj-document-validator`/example-files-style test) | `npx vitest run test/validation.test.ts` (extend) | ✅ existing file, ❌ new case |
| DISC-03 | Edit-in-place recognizes a constant-sum-of-literals mask (`5`, `1+4`, `1+2+128`) and preserves the string arg verbatim (D-14) | unit | `npx vitest run test/cvs-composer.test.ts` | ❌ Wave 0 |
| DISC-01/02/03 | New DTOs (`Cvs*`, MSGBOX decode changes) round-trip the LSP4IJ JSON boundary | unit (Java) | `cd bbj-intellij && ./gradlew test --tests "ComposerModelsJsonBoundaryTest"` | ✅ existing file, extend |
| DISC-01/02/03 | New `bbj/composer/cvs/*` methods are pinned on the single server interface | unit (Java) | `cd bbj-intellij && ./gradlew test --tests "ComposerRequestContractTest"` | ✅ existing file, extend |

### Sampling Rate
- **Per task commit:** the relevant single `vitest run <file>` / `./gradlew test --tests "*Name*"`
- **Per wave merge:** `npm test` (bbj-vscode) + `./gradlew test` (bbj-intellij)
- **Phase gate:** Full suite green (both TS and Java) before `/gsd-verify-work`; plus the D-07 spike's
  human-verification checkpoint recorded before other cue-dependent work is marked done, per Roadmap
  Success Criterion 1.

### Wave 0 Gaps
- [ ] `bbj-vscode/test/cvs-composer.test.ts` — covers DISC-03 (catalog, encode/decode, edit-in-place recognition)
- [ ] `bbj-vscode/test/composer-codelens.test.ts` — covers DISC-01 (aggregation across all 5 composer kinds, no-AST-walk structural check)
- [ ] Extend `bbj-vscode/test/msgbox-composer.test.ts` — covers DISC-02 (constant-sum decode + compose-and-replace fallback)
- [ ] Extend `bbj-vscode/test/validation.test.ts` (or equivalent) — covers the `functions.ts`/`.bbl` CVS `chars` arity fix (Common Pitfalls #1)
- [ ] `bbj-intellij/src/test/.../composer/CvsComposerDialogSourceGuardTest.java`-equivalent — mirrors the existing per-dialog source-guard test family
- [ ] Extend `ComposerModelsJsonBoundaryTest.java` and `ComposerRequestContractTest.java` — cover the new CVS DTOs/interface methods
- [ ] A CodeLens/Code-Vision registration source-guard test (Java) confirming `.setCodeLensFeature(...)` is wired — the automatable half of the D-07 spike

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth surface touched |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a — local-editor tooling only |
| V5 Input Validation | yes | Reuse `validateStringField`/`r.valid` gate pattern for any new CVS composer text field (the `chars` free-text input); reuse `parseVector`-style strict regex validation for the mask literal recognizer (D-14) — never `eval`/arithmetic-parse arbitrary expression text |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Composer writes a malformed value verbatim into the user's document (self-inflicted corruption, not attacker-controlled) | Tampering (of the user's own file, by a bug) | Port the `validateStringField`/`r.valid` gate from `msgbox-composer-webview.ts` to the new CVS composer's insert/apply path from day one (mirrors the existing `msgboxPreview().valid` pattern; PITFALLS.md Security Mistakes table already names this class of defect for #633/#475, applies identically to CVS) |
| Compose-and-replace mode (D-08/D-09) silently discards hand-written logic the constant-sum recognizer can't evaluate | Tampering (loss of user intent, not malicious) | D-08's explicit original-expression display + banner is the load-bearing mitigation — implement it as specified, do not skip because "no confirmation dialog" (D-09) sounds like it removed the safeguard; D-09 removes a *second* confirmation, not D-08's banner |
| New `bbj/composer/cvs/*` DTOs crossing the LSP4IJ boundary hit a runtime version-skew bug invisible to the build-time test suite (repeats G-81-4/G-81-5) | Tampering/Denial of Service (crashes the composer dialog, not attacker-controlled) | Extend `ComposerModelsJsonBoundaryTest`'s existing generalized harness rather than a new narrow test (Common Pitfalls #3) |

## Sources

### Primary (HIGH confidence — read directly this session)
- `.planning/phases/89-cvs-composer-msgbox-expressions-composer-discoverability/89-CONTEXT.md` — user decisions
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — requirement text, project history, standing decisions
- `.planning/research/FEATURES.md`, `.planning/research/PITFALLS.md`, `.planning/research/ARCHITECTURE.md` — milestone-level research (2026-09-06), explicitly directed as required reading by CONTEXT.md's canonical_refs
- `bbj-vscode/src/setopts-catalog.ts` (whole file)
- `bbj-vscode/src/language/composer-commands.ts` (whole file)
- `bbj-vscode/src/setopts-composer-ui.ts` (whole file)
- `bbj-vscode/src/msgbox-composer.ts` (whole file)
- `bbj-vscode/src/language/lib/functions.ts:155-199`, `functions.bbl` CVS entry
- `bbj-vscode/src/language/validations/check-function-calls.ts:1-110`
- `bbj-vscode/src/language/bbj-module.ts` (lsp service group registration, lines ~98-106)
- `bbj-vscode/node_modules/langium/lib/lsp/code-lens-provider.d.ts`, `lsp-services.d.ts`, `language-server.d.ts`
- `bbj-vscode/src/language/setopts-in-code-request.ts:22, 88, 141-151, 259-290`
- `bbj-vscode/package.json` (commands/menus/activationEvents sections)
- `bbj-intellij/build.gradle.kts` (whole file)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (whole file)
- `bbj-intellij/.../composer/BbjComposerServer.java` (whole file)
- `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` (whole file)
- `bbj-intellij/.../composer/ComposerModels.java:1-90`
- `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (whole file)
- Test-file inventory: `bbj-vscode/test/{addchildwindow,addwindow,msgbox}-composer.test.ts`, `composer-commands.test.ts`, `setopts-*.test.ts`; `bbj-intellij/src/test/.../composer/{ComposerFlowTest,ComposerModelsJsonBoundaryTest,ComposerRequestContractTest,ComposerNoticesTest}.java` and related source-guard tests

### Secondary (MEDIUM confidence)
- `redhat-developer/lsp4ij` `docs/LSPApi.md` (fetched this session) — `LSPCodeLensFeature`,
  `createCodeVisionEntry`, `.setCodeLensFeature(...)` registration pattern, default-enabled behavior.
  No explicit "since version X.Y" statement was found in the fetched doc content, hence MEDIUM
  rather than HIGH for the exact version this behavior first appeared — it is confirmed present as
  of the current `main` branch docs, and this plugin is pinned to 0.21.0, a recent release, making
  drift unlikely but not eliminated.

### Tertiary (LOW confidence / carried forward, not re-verified this session)
- BASIS CVS()/SETOPTS documentation URLs cited in milestone FEATURES.md (bit table, `chars`
  version gates) — carried forward per CONTEXT.md's canonical-refs direction, not re-fetched this
  session (see Assumptions Log A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing Langium/LSP4IJ extension points confirmed by direct source read
- Architecture (CodeLens integration point, composer 3-file shape): HIGH — read directly off Langium's own `.d.ts` and this repo's existing four-composer precedent
- CVS()/MSGBOX bit and constant semantics: MEDIUM — carried forward from milestone-level FEATURES.md's BASIS-doc citations (not re-fetched this session); the functions.ts arity gap is HIGH (verified by direct read)
- Pitfalls: HIGH — grounded in this repo's own source (functions.ts/check-function-calls.ts arity gap is a newly-verified, phase-specific pitfall beyond the milestone-level PITFALLS.md carry-forward)

**Research date:** 2026-09-12
**Valid until:** 30 days (stable, no external API drift risk beyond the LSP4IJ pin, which is
Gradle-locked and would only change via a deliberate version bump)
