# Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Every composer opportunity (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS) becomes visibly
discoverable in both IDEs without opening a menu or placing the caret (DISC-01, #650); MSGBOX
offers its composer for expression-valued options, pre-filling from recognized constant sums and
falling back to compose-and-replace otherwise (DISC-02, #648, shipped first so the cue doesn't
silently fail to appear on the lines it fixes); and users can compose CVS() calls visually in both
IDEs, including editing an existing literal-mask call in place (DISC-03, #649).

Research's own Architecture Recommendation (FEATURES.md) treats the discoverability cue as the
load-bearing piece: one `textDocument/codeLens` handler on the shared language server, aggregating
the five composers' existing per-line detectors, rendered natively by VS Code's `CodeLensProvider`
and by IntelliJ/LSP4IJ's Code Vision bridge — not a per-IDE PSI/`LineMarkerProvider` reimplementation
(explicit anti-feature). Roadmap Success Criterion 1 requires a same-phase go/no-go spike confirming
IntelliJ's Code Vision renders against the plugin's actual `sinceBuild` range before other
cue-dependent work is considered done.

**Not this phase:** the `config.bbx` SETOPTS composer itself (Phase 87, done) or SETOPTS-in-code
hovers/tri-state composer (Phase 88, done) — this phase only adds their discoverability cue;
composer robustness items — malformed free-text rejection, MSGBOX QuickPick edit-window safety,
listener leaks, IntelliJ debounce/cache (DISC-07..11, Phase 90); general expression evaluation for
MSGBOX/CVS beyond the specific constant-sum-of-literals pattern (anti-feature per FEATURES.md —
BBj expressions can reference variables/method calls resolved only at runtime).

</domain>

<decisions>
## Implementation Decisions

### Cue rollout scope
- **D-01:** The new shared server-side `textDocument/codeLens` cue retires the existing
  client-side mechanisms it duplicates: VS Code's SETOPTS-only `CodeLensProvider`
  (`setopts-composer-ui.ts`) is replaced by the unified lens, built as one shared implementation in
  this phase (not staged — all 5 composers migrate together, avoiding a half-migrated state).
  — **Reversibility:** reversible — the old provider's logic (`parseSetOptsLine` applicability) is
  exactly what the new handler's SETOPTS detector reuses, so nothing is thrown away, only
  re-hosted server-side.
- **D-02:** This phase retrofits the cue onto the already-shipped SETOPTS `config.bbx` composer
  (Phase 87, DISC-04) too, not just the three composers whose other behavior changes in this phase
  (MSGBOX-expr, CVS, and — per DISC-01's own wording naming SETOPTS explicitly — the in-code SETOPTS
  composer from Phase 88). All 5 composers get the cue in this phase; none is deferred to a cleanup
  phase.
- **D-03:** The VS Code lightbulb/Quick Fix (`CodeActionProvider`, Ctrl+.) for MSGBOX/addWindow/
  addChildWindow/CVS stays exactly as-is alongside the new CodeLens — it is a different,
  caret-triggered affordance from the always-visible lens, so there is no duplication to retire on
  the VS Code side. Only the SETOPTS-specific client-side CodeLens provider is replaced (D-01).

### Cue visual design
- **D-04:** Cue label text is composer-type-specific ("Compose MSGBOX", "Compose SETOPTS",
  "Compose CVS()", etc.), matching the existing lightbulb action labels' convention of naming the
  specific composer rather than a generic "⚡ Composer" label.
- **D-05:** Text-only label, no per-composer icon — matches the existing lightbulb/CodeLens
  convention already in this codebase (plain text commands).
- **D-06:** The cue is unconditionally visible on every eligible line, never gated on caret/
  selection proximity — directly matches DISC-01's own wording ("without placing the caret").

### IntelliJ Code Vision spike — accepted fallback
- **D-07:** If the roadmap's Success Criterion 1 spike finds Code Vision does not render against
  the plugin's actual `sinceBuild` range, a `LineMarkerProvider` fallback is an acceptable
  *permanent* answer — provided it renders the exact same server-computed applicability data (never
  a parallel Java re-implementation of composer-applicability logic, which is what FEATURES.md's
  anti-feature entry actually warns against, not the rendering mechanism itself). A visually
  different look between the two IDEs (inline Code Vision entry vs. gutter icon) is an acceptable
  platform difference, not a blocker requiring re-scoping.
  — **Reversibility:** reversible — swapping the IntelliJ rendering mechanism later touches only
  the client-side renderer, not the shared server-side codeLens handler or its data.

### MSGBOX expression replace safety (DISC-02)
- **D-08:** When an options expression can't decode to a recognized constant sum, the composer
  dialog displays the user's original raw expression text (read-only) before they commit to
  replacing it, plus an explicit banner distinguishing compose-and-replace mode from the
  decode-and-prefill case (e.g. "Could not decode this expression — composing will replace it").
  This is the direct mitigation for compose-and-replace mode silently discarding hand-written logic
  (method calls, variable references) that the constant-sum recognizer can't evaluate.
  — **Reversibility:** reversible — UI-only addition to the existing dialog.
- **D-09:** No extra confirmation step (no second "Replace expression?" dialog) beyond the normal
  composer OK/Apply button — the banner and original-expression display (D-08) already surface the
  risk before the user reaches Apply; a second confirmation is friction on a deliberate action the
  user opened themselves.
- **D-10:** When the expression *is* successfully decoded to a recognized constant sum (the
  DISC-02 happy path), the composer treats it exactly like editing an existing integer-literal
  MSGBOX call — pre-filled checkboxes only, no extra raw-expression display — consistent with how
  SETOPTS/addWindow composers already represent an existing value once decoded. D-08's
  original-expression display is specific to the undecodable (compose-and-replace) case.

### CVS() composer layout & chars field (DISC-03)
- **D-11:** The CVS() composer uses a simple flat single-section checkbox layout (no byte-group
  headers, no `JBScrollPane`) rather than reusing SETOPTS's exact byte-grouped scrollable-panel
  skeleton — CVS()'s 9 bit options don't need SETOPTS's sectioning machinery. It still reuses
  `ComposerFlow`/`StaleEditGuard`/`PreviewDebouncer` underneath, matching every other composer's
  plumbing; only the panel layout is lighter-weight.
  — **Reversibility:** reversible — layout-only, no DTO/request impact if redesigned later.
- **D-12:** The version-gated `chars` parameter gets one shared text field (not per-bit), shown
  once, since it is a single positional argument shared by whichever of bits 1/2/16/32/128 are
  checked. It is greyed out with a tooltip when none of those bits are selected — following the
  same bbj-annotated grey-out convention Phase 87 D-08 established for SETOPTS's `bbj:
  'ignored'/'bbj-specific'` bits — rather than being hidden entirely.
- **D-13:** No client-side single-char-vs-multi-char version gating on the `chars` field — the
  composer has no existing notion of a configured target BBj version, and inventing one just for
  this field isn't worth the new state. The field accepts any string; an unsupported multi-char
  value on an older BBj release surfaces through the existing compile-time/runtime error path, not
  a new client-side check.
- **D-14:** Edit-in-place for an existing CVS() call recognizes a mask argument that is a
  **constant-sum of integer literals** (e.g. `5`, `1+4`, `1+2+128`) — mirroring DISC-02's MSGBOX
  constant-sum recognition exactly, not merely a bare single literal. This is **literals-only**: no
  named-constant or java-interop-backed static-field resolution, since CVS() bits have no
  documented named-constant catalog (unlike `BBjMsgBox.*` fields). The string/first argument is not
  decoded — it's preserved verbatim, same as SETOPTS's "absolute literal" tier only requires the
  numeric mask to be a literal. A mask involving a variable or method call falls back to
  decode-only/no edit action, matching how every other unrecognized shape in this composer family
  already behaves (SETOPTS-in-code's DISC-06 tiering, MSGBOX's own compose-only fallback).
  — **Reversibility:** reversible — widening or narrowing this recognition later is a detection-logic
  change only, not a DTO/wire-format change.

### Claude's Discretion
- Exact new `bbj/composer/cvs/*` request names (e.g. `decodeCall`, `preview`) — follow the existing
  `bbj/composer/{msgbox,setopts}/*` naming convention in `composer-commands.ts`.
- The exact `textDocument/codeLens` handler's internal structure (new module vs. extending
  `composer-commands.ts`) and how it aggregates the five composers' existing per-line detectors —
  researcher/planner's call, informed by Pitfall 11's requirement to hook into the existing
  document-build/validation cycle rather than a full-AST walk per request.
- `ConfigureCvsIntention.java` / CVS CodeAction class names and exact label wording, and the new
  CVS dialog's class name (e.g. `CvsComposerDialog.java`).
- Exact wording of the MSGBOX compose-and-replace banner (D-08) and where in the dialog the
  original-expression text renders.
- Whether the new shared CodeLens handler is a clean new registration or retires/replaces
  `composer-commands.ts`'s implicit per-composer `*decodeCall`/`*Line` detection entry points —
  likely the aggregator calls the same existing functions rather than duplicating them (D-01's
  intent), confirm during planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/ROADMAP.md` §"Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability"
  — the five success criteria, including the Success Criterion 1 go/no-go spike (Code Vision vs.
  LineMarkerProvider fallback) this phase's D-07 accepts the outcome of, and Success Criterion 5's
  no-reparse-per-keystroke performance bar.
- `.planning/REQUIREMENTS.md` §"Composer discoverability & coverage" — DISC-01 (#650), DISC-02
  (#648), DISC-03 (#649), and the already-closed DISC-04/05/06 (#633, #475) this phase's cue now
  also covers (D-02).
- GitHub issues #650 (discoverability cue), #648 (MSGBOX expression-valued options), #649 (CVS()
  composer) — the three requirement sources.

### Research (milestone-level) — read before writing any new code
- `.planning/research/FEATURES.md` §"Architecture Recommendation: composer discoverability via
  shared LSP CodeLens" — the load-bearing architectural call (shared `textDocument/codeLens`, not
  per-IDE gutter/PSI) this phase's D-01 through D-07 all build on; includes the exact complexity
  breakdown (new codeLens handler + capability wiring + retiring the old SETOPTS provider).
- `.planning/research/FEATURES.md` §"CVS() option model" — the authoritative bit table (1, 2, 4, 8,
  16, 32, 64, 128; BBj-specific 128 not in the generic PRO/5 doc), the fixed-ascending-application-
  order rule, the `chars` parameter's version gates (BBj 19.0+ single-char, 19.10+ multi-char), and
  why a flat checkbox list (not nested composition) matches CVS()'s own additive model — direct
  input to D-11 through D-14.
- `.planning/research/FEATURES.md` §"Anti-Features" — "Statically evaluating arbitrary MSGBOX/
  CVS() option expressions in general" (governs D-08/D-14's literals-only scoping) and "A native
  IntelliJ LineMarkerProvider… built independently of the language server" (governs D-07's
  reversibility note — the fallback must still be server-data-driven).
- `.planning/research/PITFALLS.md` §"Pitfall 11" — composer-cue and decode-hover positions must be
  computed as part of the existing document-build/validation pass (or cached and invalidated on its
  completion), never a full-AST walk per keystroke/request — binding on the new codeLens handler and
  directly maps to Roadmap Success Criterion 5.
- `.planning/research/PITFALLS.md` §"Pitfall 12" — reuse the existing `Scheduler`/`Alarm`/
  `KeystrokeDebouncer` seam for the new CVS composer dialog's debounce, not a new hand-rolled
  `Alarm` instance.
- `.planning/research/ARCHITECTURE.md` — the component table rows for `ConfigureCvsIntention.java`/
  `SetoptsComposerDialog.java`/`ComposerModels.Cvs*` DTOs and the feature-dependency graph showing
  #650 as upstream of #648/#649's "is this composer visible" concern.

### Prior-phase precedent (direct dependency — same composer family)
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-CONTEXT.md` — D-07/D-08/D-09
  (dialog layout, bbj-annotated grey-out convention D-12 reuses, debounced live preview),
  `ComposerFlow`/`StaleEditGuard`/`ComposerNotices` seams the CVS composer reuses as-is.
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-CONTEXT.md` — D-04's
  edit-in-place-only-for-statically-safe-shapes discipline (direct precedent for D-14's CVS
  literal-mask scoping), and its own Deferred section naming this phase's cue and CVS composer
  explicitly.

### Existing composer domain modules and hover infrastructure (read before writing any new code)
- `bbj-vscode/src/setopts-catalog.ts` — `SETOPTS_BITS`, `BYTE_GROUPS`, `since`/`bbj` annotation
  shape (D-12's direct template for a new `CVS_BITS` catalog, per FEATURES.md's own recommendation
  to reuse this annotation shape rather than invent a new one).
- `bbj-vscode/src/language/composer-commands.ts` — the `bbj/composer/*` namespace and
  `registerComposerRequests` registration pattern; the new CVS requests and the new shared
  `textDocument/codeLens` handler both join this module's conventions.
- `bbj-vscode/src/setopts-composer-ui.ts` — the `CodeLensProvider` (`:82-96`) being retired (D-01)
  and `argForActiveEditor`'s existing-line-first fallback, relevant background for the new handler.
- `bbj-vscode/src/msgbox-composer.ts` (`parseMsgboxCallOnLine`, `exprValue` regex) — the exact
  integer-literal-only matcher DISC-02 generalizes to recognize constant-sum expressions.
- `bbj-intellij/.../composer/ConfigureMsgboxIntention.java`, `MsgboxComposerDialog.java` — direct
  templates for the new CVS composer's IntelliJ trigger and dialog shape.
- `bbj-intellij/.../composer/ComposerRequestContractTest.java`,
  `ComposerModelsJsonBoundaryTest.java` — the new CVS requests/DTOs and the new codeLens capability
  join both test families (Pitfall 13).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setopts-catalog.ts`'s `since`/`bbj` annotation pattern — direct template for a new `CVS_BITS`
  catalog module (no new metadata shape needed).
- `ComposerFlow`, `StaleEditGuard`, `ComposerNotices`, `ComposerLauncher`, `PreviewDebouncer` on the
  IntelliJ side — reused as-is by the new CVS dialog, exactly as Phase 87/88 reused them.
- Each composer's existing per-line applicability detector (`parseSetOptsLine`,
  `parseMsgboxCallOnLine`, etc. in `composer-commands.ts`) — the new shared codeLens handler
  aggregates these rather than reimplementing applicability logic.

### Established Patterns
- Generic LSP surface (hover, codeLens) reaches both IDEs with zero IntelliJ-specific code; only
  custom `bbj/*` requests (the dialogs themselves) need per-IDE UI.
- Plain-JUnit fake-server tests + source guards + contract test + one recorded live-IDE UAT check
  is this project's established verification bar (Phase 86 D-18) — no manual-only verification
  accepted for the new CVS requests/DTOs or the new codeLens capability.
- bbj-annotated grey-out-with-tooltip (not hide) is the established de-emphasis convention for
  version-gated/no-op catalog entries (Phase 87 D-08) — D-12 follows it for the CVS `chars` field.

### Integration Points
- `bbj-vscode/src/language/main.ts` — `registerComposerRequests(connection)` gains the new CVS
  handlers; a new `codeLensProvider` server capability registration joins the same initialization.
- `bbj-vscode/src/language/composer-commands.ts` — new `bbj/composer/cvs/*` handlers alongside the
  existing msgbox/addwindow/addchildwindow/setopts families; new aggregating codeLens handler.
- New IntelliJ files: `CvsComposerDialog.java`, a CVS intention/action, `ComposerModels.Cvs*` DTOs;
  `BbjComposerServer`'s single interface gains the new CVS methods (mirrors #633/#475's pattern of
  adding to the one interface, never a new one).
- `QA/FULL-TEST-CHECKLIST.md` — gains hand-check rows for the cue (both IDEs, all 5 composers), the
  CVS composer, and MSGBOX expression handling.

</code_context>

<specifics>
## Specific Ideas

- The MSGBOX compose-and-replace banner's exact wording should make clear that applying will
  **replace** the original expression, not merely that it couldn't be decoded — "Could not decode
  this expression — composing will replace it" (D-08) is the working draft the user confirmed
  direction on, not necessarily final copy.
- CVS() edit-in-place's recognized shape is deliberately narrower than "any expression" and wider
  than "any bare literal": a sum of integer literals only (`5`, `1+4`, `1+2+128`), explicitly
  excluding named constants/Java static fields (D-14) since no such catalog exists for CVS() bits
  today.

</specifics>

<deferred>
## Deferred Ideas

- **Composer robustness** (malformed free-text rejection, MSGBOX QuickPick edit-window safety,
  listener leak fixes, IntelliJ debounce/cache for repeated dialog opens) — DISC-07..11, Phase 90;
  the new CVS dialog and the new codeLens handler should follow those patterns where they already
  exist (`PreviewDebouncer`) but the *fixes themselves* belong to Phase 90.
- **General constant expression evaluation beyond a literal sum** for either MSGBOX or CVS() option
  arguments — explicitly an anti-feature per FEATURES.md; any expression with a variable or method
  call always falls back to compose-only/decode-only, never attempted.
- **A configured target-BBj-version setting** that would let the CVS() `chars` field warn on a
  genuine single-char/multi-char version mismatch — D-13 explicitly declines to invent this state
  for this phase; revisit only if a broader "target BBj version" setting is ever added for other
  reasons.

### Reviewed Todos (not folded)
- Configured-but-unusable Node.js path suppresses the cached-download fallback — IntelliJ Node
  bootstrap, unrelated to composer discoverability.
- Live Windows check for the Node.js auto-install failure — maintainer-owned manual check,
  unrelated.
- gradle-wrapper-hygiene fixture stale Gradle version — already fixed 2026-09-06 per project
  memory; unrelated regardless.
- Update live-interop tests for the getAllClassNames backend — interop test drift, unrelated.
  (All four surfaced again by `todo.match-phase` on a bare "bbj"/"java"/"intellij" keyword match;
  the same set Phases 87 and 88 already reviewed and declined to fold for the same reason.)

</deferred>

---

*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Context gathered: 2026-09-12*
