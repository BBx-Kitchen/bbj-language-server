# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning
**Mode:** `--auto` (fully autonomous) — every gray area below was auto-resolved to its
recommended option and logged; no interactive session occurred.

<domain>
## Phase Boundary

Users working with SETOPTS/IOR/AND expressions directly in **BBj source code** (not
`config.bbx`) get accurate decode hovers everywhere those expressions appear, and can safely
compose or edit the two statically-safe shapes: an absolute `SETOPTS <literal>` statement, and
the canonical `var$=OPTS(...)` … `SETOPTS var$` block with only `IOR`/`AND` reassignments in
between (DISC-05, DISC-06, #475). This phase extends the shared SETOPTS catalog and
`bbj/composer/setopts/*` request layer Phase 87 established for `config.bbx` to a second,
harder domain: runtime-relative, per-statement values inside `.bbj` code, where the "current
vector" is a data-flow fact, not a file's literal content.

Not this phase: the config.bbx composer itself (Phase 87, done); composer discoverability
cues — a persistent clickable marker on every applicable line (DISC-01, Phase 89); CVS()/
MSGBOX-expression composers (DISC-02/03, Phase 89); composer robustness items — malformed
free-text rejection, MSGBOX QuickPick edit-window safety, listener leaks, IntelliJ debounce/
cache (DISC-07..11, Phase 90). Also explicitly out of scope by the milestone's own research
(FEATURES.md anti-features): decode-and-edit for *any* SETOPTS-in-code shape beyond the two
statically-safe ones above — aliasing, intervening non-IOR/AND statements, or computed masks
make "current state" undecidable at edit time, so every other shape gets hover-only decode,
never an edit action.

</domain>

<decisions>
## Implementation Decisions

### Hover delivery is language-server-only — zero new IntelliJ Java code
- **D-01:** SETOPTS-in-code decode hovers ship entirely as language-server changes to the
  existing `BBjHoverProvider` (`bbj-hover.ts`). Both VS Code and IntelliJ receive them for
  free through the standard LSP `textDocument/hover` request — LSP4IJ renders generic LSP
  hover content natively, unlike the Phase 84-87 composer *dialogs*, which needed a bespoke
  Swing UI because `bbj/composer/*` is a non-standard, LSP4IJ-custom-request surface. No
  `bbj-intellij` Java file is touched for the hover half of this phase.
  — **Reversibility:** reversible — a future IDE-specific hover enhancement would only add
  code, not restructure this.

### Hover scope & content (DISC-05, verbatim)
- **D-02:** Hover triggers on three shapes and shows exactly what DISC-05 names: (a) an
  absolute `SETOPTS <literal-or-expr>` statement — decode the value directly; (b) the `opts=`
  expression of a `SetOptsStatement` whose value traces back through zero-or-more `IOR`/`AND`
  reassignments to an `OPTS(...)` call — decode the accumulated effective vector from that
  chain; (c) hovering directly over one `IOR(...)`/`AND(...)` call in such a chain shows what
  that single call sets or clears, with **AND masks shown as the logical cleared bits** (a
  clear bit in the AND mask means that option is cleared) — this exact framing is DISC-05's
  own wording and must not be inverted or left as a raw bitmask.

### Static traceability — a research question, not a discussion decision
- **Flag for `gsd-phase-researcher`:** How the language server recognizes that a variable's
  value traces back to `OPTS(...)` through *only* `IOR`/`AND` reassignments (vs. an
  intervening non-IOR/AND statement, a branch, or an alias that makes the chain undecidable)
  is a data-flow question against the existing local-variable tracking in
  `bbj-type-inferer.ts` / `bbj-scope-local.ts`, not a user-facing preference. FEATURES.md's
  own tiering already scopes edit-mode to the two statically-safe shapes; the researcher must
  confirm the exact traversal boundary (same-method/same-block scope, single assignment
  target, no intervening non-IOR/AND statement, no re-entry via a loop) before planning locks
  the detection algorithm. Get this wrong in the unsafe direction and DISC-06's "no edit
  action on any other shape" guarantee breaks silently.

### Tri-state composer trigger (BBj code has real PSI, unlike config.bbx)
- **D-03:** The tri-state composer opens via an `IntentionAction` (lightbulb, Alt+Enter) on
  IntelliJ, following `ConfigureMsgboxIntention`'s exact shape (`isAvailable`/`invoke`/
  `startInWriteAction() = false`/`generatePreview` returning `IntentionPreviewInfo.Html`) —
  unlike Phase 87's `config.bbx` trigger (D-01 there, PSI-free context-menu action, because
  `BbxConfigLanguage` has no parser), `.bbj` source files have a full PSI/AST already, so
  there is no reason to diverge from the established in-code composer trigger pattern
  (Msgbox/addWindow/addChildWindow intentions). On VS Code, it follows the sibling CodeAction/
  CodeLens pattern already used for those same three composers, not a new command-palette-only
  entry point.
  — **Reversibility:** reversible — an additional trigger (context menu, keybinding) can be
  layered on later without touching the request/DTO surface.

### Compose-new vs. edit-in-place scope for BBj-code shapes
- **D-04:** Edit-in-place is offered **only** for the two statically-safe shapes DISC-06
  names — an absolute `SETOPTS <literal>` statement, and the canonical
  `var$=OPTS(...)` … `SETOPTS var$` block with only `IOR`/`AND` statements in between. Any
  other shape (a variable also used elsewhere in between, a re-derived alias, a branch) gets
  hover decode only — no edit action is presented, matching FEATURES.md's explicit
  anti-feature ("Decode-and-edit-in-place for every SETOPTS-in-code shape").
- **D-05:** Compose-new (no existing SETOPTS-in-code block near the cursor) inserts a brand
  new canonical block: `var$=OPTS(...)`, one `var$=IOR(var$, mask)` line per option the user's
  tri-state form sets to **Set**, one `var$=AND(var$, mask)` line per option set to **Clear**
  (options left **Leave** produce no line at all), then `SETOPTS var$` — directly matching
  DISC-06's "generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form"
  wording.

### Tri-state form UI reuses Phase 87's dialog shape
- **D-06:** The tri-state widget reuses Phase 87's byte-grouped catalog layout
  (`SetoptsComposerDialog`'s scrollable, byte-group-sectioned panel on IntelliJ; the existing
  webview panel structure on VS Code) but swaps each option's checkbox for a 3-state control
  (Set / Clear / Leave) instead of a new layout design. This keeps the two SETOPTS composers
  visually consistent and reuses the catalog-rendering code (`BYTE_GROUPS` iteration,
  bbj-annotated greying with tooltip, live debounced preview via `PreviewDebouncer`) rather
  than duplicating it for a second dialog.
  — **Reversibility:** reversible — layout code only, no DTO/request impact if redesigned
  later.

### Performance guardrail (binding, research-derived)
- **D-07:** Hover decode — and any per-statement SETOPTS-in-code detection this phase adds —
  hooks into the existing document-build/validation cycle (or a cache invalidated on that
  cycle's completion), never an independent full-AST walk per hover request or per keystroke.
  This is research Pitfall 11's explicit warning about #475's hover tier reintroducing the
  #505-class unbounded-scan cost, and it is also the roadmap's own Success Criterion 4 — a
  phase acceptance bar, not a nice-to-have.

### Claude's Discretion
- Exact new `bbj/composer/setopts/*`-adjacent request name(s) for the in-code decode/compose
  operations (e.g. `bbj/composer/setopts/decodeInCode`, `.../composeTriState`) — follow the
  existing `decodeCall`/`preview` naming convention from Phase 87.
- Whether hover decode reuses `setoptsPreview`/`describeVector` from `setopts-catalog.ts`
  directly, or needs a thin wrapper for the "AND masks as logical cleared bits" phrasing
  specific to in-code decode (D-02c) — likely the latter, since `describeVector` today only
  describes an absolute vector.
- Exact IntentionAction/CodeAction label wording and the new PSI/AST-detection helper's class
  name.
- Where the new `.bbj` AST-detection logic for "SETOPTS-in-code" shapes lives — a new module
  (e.g. `setopts-code-scanner.ts`) vs. extending `bbj-type-inferer.ts` — researcher/planner
  call, informed by the traceability question flagged above.
- Whether the tri-state form needs Phase 87 D-08's "unknown/reserved bits" callout for
  consistency — likely yes, confirm during planning.
- Whether the tri-state dialog is a genuinely new `SetoptsTriStateComposerDialog.java` or a
  mode flag on the existing `SetoptsComposerDialog` — planner's call, guided by D-06's "reuse
  the layout, not necessarily the class."

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/ROADMAP.md` §"Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer" — the four
  success criteria and the Phase 87 dependency.
- `.planning/REQUIREMENTS.md` — DISC-05 (#475, decode tier), DISC-06 (#475, composer tiers).
- GitHub issue #475 — the full tiered SETOPTS-in-code design this phase implements tiers 2-4
  of (tier 1, the shared catalog, shipped in Phase 87).

### Research (milestone-level)
- `.planning/research/FEATURES.md` — the #475 row (tiering: shared catalog → read-only decode
  hover → create-composer → edit-composer for the two statically-safe shapes only) and its
  two named anti-features ("Statically evaluating arbitrary... option expressions in general"
  is MSGBOX/CVS-specific but the sibling row "Decode-and-edit-in-place for every
  SETOPTS-in-code shape" governs D-04 directly).
- `.planning/research/PITFALLS.md` §"Pitfall 11" — decode hovers must hook into the existing
  document-build/validation debounce cycle, never a full-AST walk per keystroke/hover (D-07).
- `.planning/research/PITFALLS.md` §"Pitfall 12" — the established `Scheduler`/`Alarm`
  debounce seam (`PreviewDebouncer`, Phase 87) to reuse for the tri-state dialog's live
  preview, not a fourth hand-rolled `Alarm`.
- `.planning/research/PITFALLS.md` §"Pitfall 13" — new composer DTOs crossing the LSP4IJ
  boundary must join `ComposerModelsJsonBoundaryTest`'s generalized harness with in-range
  numeric sentinels; any new in-code decode/compose DTO joins this family too.
- `.planning/research/ARCHITECTURE.md` (around "SETOPTS-in-BBj-code hovers + tri-state
  composer (#475)") — confirms #475 depends on Phase 87's shared catalog and
  `bbj/composer/setopts/*` request pattern, and that #475 "adds NEW decode-hover and
  [composer] surfaces" on top of it.

### Prior-phase precedent (direct dependency)
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-CONTEXT.md` — D-01
  (PSI-free trigger for `config.bbx`, contrasted by this phase's D-03 for `.bbj` code which
  DOES have PSI), D-07/D-08/D-09 (dialog layout, bbj-annotation greying, debounced live
  preview — all reused by D-06), and its own Deferred section naming this phase explicitly.
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-01-SUMMARY.md` — the
  `bbj/composer/setopts/decodeCall`/`preview` requests, the SETOPTS DTO family
  (`ComposerModels.java`), and `DecodeEquality.sameSetopts` this phase's new requests/DTOs
  extend rather than duplicate.
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-02-SUMMARY.md` — the
  `PreviewDebouncer` seam and `SetoptsComposerDialog`'s exact structure D-06 reuses.
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-03-SUMMARY.md` — the
  `ComposerLauncher.Kind.SETOPTS` chain, `StaleEditGuard`/`DecodeEquality.sameSetopts` guarded
  apply, and the `insertAt(..., atLineStart)` helper D-05's compose-new block insertion may
  reuse or extend.

### Existing SETOPTS domain module and hover infrastructure (read before writing any new code)
- `bbj-vscode/src/setopts-catalog.ts` — `SETOPTS_BITS`, `BYTE_GROUPS`, `parseVector`/
  `encodeVector`, `setoptsPreview`, `describeVector` — the byte/bit engine this phase's
  in-code decode reuses; no new bit/byte logic needed, only new *call sites* that resolve a
  runtime-relative vector instead of reading it from file content.
- `bbj-vscode/src/language/bbj-hover.ts` — `BBjHoverProvider`, `getAstNodeHoverContent`,
  `findLeafNodeAtOffset` — the exact extension point for D-01/D-02.
- `bbj-vscode/src/language/bbj-type-inferer.ts`, `bbj-scope-local.ts` — existing local
  variable/data-flow tracking to build the traceability check on (flagged research question
  above).
- `bbj-vscode/src/language/bbj.langium` (`SetOptsStatement: 'SETOPTS' opts=Expression`, and
  `BinaryExpression` for `AND`/`OR` operators) — confirms `IOR`/`AND` appear as ordinary
  function calls / binary expressions in assignment statements, not dedicated grammar rules;
  no grammar change is expected for this phase.

### Established shared composer-layer and intention precedent
- `bbj-vscode/src/language/composer-commands.ts` — the `bbj/composer/*` namespace and
  registration pattern the new in-code decode/compose requests join.
- `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` — direct template for D-03's
  `IntentionAction` (availability check, `startInWriteAction() = false`, HTML preview).
- `bbj-intellij/.../composer/ComposerLauncher.java`, `ComposerFlow.java`, `ComposerNotices.java`,
  `StaleEditGuard.java`, `DecodeEquality.java` — reused as-is for the edit-in-place guard path
  (D-04's two safe shapes).
- `bbj-intellij/.../composer/SetoptsComposerDialog.java`, `PreviewDebouncer.java` — direct
  layout/debounce template for D-06.
- `bbj-intellij/src/test/java/.../composer/ComposerRequestContractTest.java`,
  `ComposerModelsJsonBoundaryTest.java` — the new in-code SETOPTS requests/DTOs join both.
- `QA/FULL-TEST-CHECKLIST.md` — gains hand-check rows for hover decode (both IDEs) and the
  tri-state composer (IntelliJ), per Phase 86 D-18's verification bar (plain-JUnit + source
  guards + contract test + at least one recorded live-IDE UAT check).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setopts-catalog.ts`'s pure functions (`setoptsPreview`, `describeVector`, `parseVector`/
  `encodeVector`) — the byte/bit engine is complete; this phase only needs new *inputs* to it
  (a resolved runtime vector from data-flow analysis, or a tri-state selection) rather than
  new domain logic.
- `bbj/composer/setopts/decodeCall`/`preview` DTOs and `DecodeEquality.sameSetopts` from
  Phase 87 — the wire shape (hex-string vector, never a numeric bitmask) and comparator this
  phase's new requests should match, not reinvent.
- `ComposerFlow`, `StaleEditGuard`, `ComposerNotices`, `ComposerLauncher`, `PreviewDebouncer`
  on the IntelliJ side — all reused as-is.
- `BBjHoverProvider` — the hover extension point already exists; this phase adds a detection
  branch, not a new provider.

### Established Patterns
- Generic LSP surface (hover, completion, diagnostics) reaches both IDEs with zero
  IntelliJ-specific code; only *custom* `bbj/*` requests (composer dialogs) need per-IDE UI —
  this phase's hover half falls entirely in the first category (D-01).
- In-code composer triggers use `IntentionAction` (lightbulb) on IntelliJ and CodeAction/
  CodeLens on VS Code — the config.bbx-specific PSI-free action pattern from Phase 87 does not
  apply here because `.bbj` files have real PSI.
- Every custom request name is asserted against the language-server source by
  `ComposerRequestContractTest`; every new composer DTO joins
  `ComposerModelsJsonBoundaryTest`'s generalized harness (Pitfall 13).
- Plain-JUnit fake-server tests + source guards + one recorded live-IDE UAT check is the
  verification bar (Phase 86 D-18) — no manual-only verification accepted.

### Integration Points
- `bbj-vscode/src/language/bbj-hover.ts` — add SETOPTS/IOR/AND-chain detection and decode
  text rendering (D-01/D-02).
- New or extended language-server module for the "OPTS-derived variable" traceability check
  (flagged research question) — likely reads `bbj-type-inferer.ts`/`bbj-scope-local.ts`.
- `bbj-vscode/src/language/composer-commands.ts` — new `bbj/composer/setopts/*` in-code
  decode/compose requests alongside the existing `config.bbx`-scoped ones.
- New IntelliJ files: a `ConfigureSetoptsIntention.java`-equivalent (D-03), and either a new
  tri-state dialog or an extended `SetoptsComposerDialog` (D-06); `ComposerLauncher` gains the
  in-code compose/edit chain.
- `ComposerRequestContractTest.java`, `ComposerModelsJsonBoundaryTest.java`, `ComposerFlowTest`
  fake server — extended for the new request family.
- `QA/FULL-TEST-CHECKLIST.md` — new rows for hover decode and the tri-state composer.

</code_context>

<specifics>
## Specific Ideas

- DISC-05's exact framing for AND masks — "shown as the logical cleared bits" — must survive
  into the actual hover text verbatim in spirit: a 0 bit in an AND mask means "this option is
  cleared," and the hover should say so in terms of the *option* being cleared, not print the
  raw mask.
- The compose-new block (D-05) must preserve unmodeled/unknown bits the same way Phase 87's
  `setoptsPreview` already guarantees for the absolute-vector case — inherited for free by
  reusing the same engine, but worth an explicit round-trip test given this is a *generated*
  multi-line block rather than a single-line edit.

</specifics>

<deferred>
## Deferred Ideas

- **Composer discoverability cue** (a persistent, clickable marker on every SETOPTS-in-code
  line, so a user doesn't need to invoke the lightbulb/CodeAction manually) — DISC-01,
  explicitly Phase 89; this phase's Intention/CodeAction trigger is the interim entry point,
  exactly as Phase 87's context-menu trigger was for `config.bbx`.
- **CVS() composer, MSGBOX-expression composer** — DISC-02/03, Phase 89; unrelated domain.
- **Composer robustness (malformed free-text rejection, MSGBOX QuickPick edit-window safety,
  listener leak fixes, IntelliJ debounce/cache for repeated dialog opens)** — DISC-07..11,
  Phase 90; this phase's new dialog and requests should follow those patterns where they
  already exist (`PreviewDebouncer` for D-06's debounce) but the *fixes* themselves belong to
  Phase 90.

### Reviewed Todos (not folded)
- Configured-but-unusable Node.js path suppresses the cached-download fallback — IntelliJ
  Node bootstrap, unrelated to SETOPTS.
- Live Windows check for the Node.js auto-install failure — maintainer-owned manual check,
  unrelated.
- Update live-interop tests for the getAllClassNames backend — interop test drift, unrelated.
- gradle-wrapper-hygiene fixture stale Gradle version — already fixed 2026-09-06 per project
  memory; unrelated regardless.
  (All four surfaced again by `todo.match-phase` on a bare "bbj" keyword match; same set
  Phase 87 already reviewed and declined to fold for the same reason.)

</deferred>

---

*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Context gathered: 2026-09-07*
