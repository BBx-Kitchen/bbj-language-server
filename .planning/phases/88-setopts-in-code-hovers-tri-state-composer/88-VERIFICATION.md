---
phase: 88-setopts-in-code-hovers-tri-state-composer
verified: 2026-09-07T23:40:00Z
status: human_needed
score: 15/15 must-haves verified (programmatically checkable subset)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Hover an absolute SETOPTS literal, a canonical OPTS->IOR/AND->SETOPTS chain, a single IOR(...) call and a single AND(...) call in both VS Code and IntelliJ (LSP4IJ hover popup)."
    expected: "Each hover names the option(s) set; the AND hover names the option(s) CLEARED, matching QA/FULL-TEST-CHECKLIST.md rows 15 and 19."
    why_human: "Requires a live editor session in both IDEs; automated tests already prove the markdown content through a real getHoverContent call, but the rendered popup appearance is not exercised by any test in this repo."
  - test: "Invoke the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a canonical chain, change one option to Set and one to Clear, and apply; then invoke it on a line with no SETOPTS shape (compose-new); then invoke it on a chain interrupted by IF/FI."
    expected: "Only the reassignment lines between the OPTS origin and the SETOPTS line change; a new block is inserted at the line start for compose-new; no edit is offered for the unsafe chain, with the reason shown instead. Matches QA rows 16 and 20."
    why_human: "The generated block's Set-then-Clear catalog-bit ordering as it reaches the actual document depends on the webview's client-side <script> (VS Code) and the Swing dialog's row-construction order (IntelliJ) — both are structurally correct by construction (verified by reading the source) but neither is exercised by an automated test against a live editor. 88-05-SUMMARY.md (T7) and 88-06-SUMMARY.md (D5) both flag this explicitly as pending manual UAT rather than claim it as machine-verified."
  - test: "Against a live BBjServices, compose a new SETOPTS-in-code block via the tri-state composer, insert it, and run the program as GUI/BUI/DWC, watching for a BBj !ERROR."
    expected: "The generated IOR/AND calls (built on an explicit 16-byte/32-hex-digit full-width mask base) run without raising !ERROR — confirms or refutes 88-RESEARCH.md Assumption A2's mask-width default against real BASIS runtime behavior. Matches QA row 21."
    why_human: "This is an explicit, plan-declared `human_judgment: true` falsification check (88-03-PLAN.md 'Flagged assumption carried into this plan') that requires a live BASIS/BBjServices runtime this verifier has no access to. No automated test in this repo can substitute for it."
---

# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer Verification Report

**Phase Goal:** Users working with SETOPTS/IOR/AND expressions directly in BBj code get accurate decode hovers everywhere, and can safely compose or edit the two statically-safe shapes.
**Verified:** 2026-09-07T23:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hovering a `SETOPTS` literal, or an `IOR`/`AND` line against an OPTS-derived variable, shows which options that line sets or clears, with AND masks shown as the logical cleared bits | ✓ VERIFIED | `setopts-code-scanner.ts` implements all three shapes (`absolute`, `chain`, `mask-call`); `describeIorAndMask`/`describeMaskVector` in `setopts-catalog.ts` invert the `'clear'` branch (pinned by a swap-detecting test); real `getHoverContent` calls in `test/hover.test.ts` (213/213 tests pass, re-run 2026-09-07 23:24) prove the wiring end-to-end, not just unit-level shape detection |
| 2 | A user can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form | ✓ VERIFIED | `composeSetOptsBlock`/`singleBitIorMask`/`singleBitAndMask` in `setopts-catalog.ts` (full-width base, catalog-order codegen); `bbj/composer/setopts/composeTriState` request (`setopts-in-code-request.ts`); VS Code `setopts-tristate-webview.ts` and IntelliJ `SetoptsTriStateComposerDialog.java` both call through the server, never compute the block client-side (grep-verified: `setoptsPreview` count 0 in the webview) |
| 3 | A user can edit in place an absolute `SETOPTS` literal or a canonical `var$=OPTS … SETOPTS var$` block; any other shape offers hover decode only, with no edit action presented | ✓ VERIFIED | `decodeInCode`'s `editable` field is assigned directly from the scanner's own `safe` verdict (grep-confirmed, never re-decided in the request layer); an `editable: false` result carries no `chain`/`initial` payload (pinned by `ComposerModelsJsonBoundaryTest` and `SetoptsInCodeSourceGuardTest`); `ComposerLauncher.openSetoptsInCode` and `setopts-in-code-ui.ts`'s command handler both construct no edit when `editable` is false |
| 4 | Typing near a decoded SETOPTS line produces no visible input lag or CPU spike — decode is request-scoped, not a per-keystroke full-document walk | ✓ VERIFIED | `bbj-hover.ts` gains no document-change listener (D-07 source guard test, independently demonstrated red-then-green per 88-01-SUMMARY.md); the SETOPTS branch runs only inside the existing per-request `getHoverContent`/`decodeInCode` paths; no new `Alarm`/`Timer` was added to the IntelliJ dialog (grep-verified 0), reusing the existing `PreviewDebouncer` |

**Score:** 4/4 ROADMAP success criteria verified by automated evidence.

### Plan-Level Must-Haves (representative sample, full detail in each plan's frontmatter)

| Must-have | Plan | Status | Evidence |
|---|---|---|---|
| Hover branch lives in `getHoverContent`, not `getAstNodeHoverContent` | 88-01 | ✓ VERIFIED | `grep -n` confirms `setoptsHoverTarget` call precedes `referenceCstNode` assignment and `getAstNodeHoverContent` declaration in `bbj-hover.ts` |
| Every unparseable/empty/over-length/non-hex value yields no hover | 88-01 | ✓ VERIFIED | Negative-case tests in `setopts-code-scanner.test.ts`/`hover.test.ts`, all passing |
| `resolveLibFunction` exported exactly once, imported (never re-implemented) by scanner | 88-01 | ✓ VERIFIED | `grep -c "export function resolveLibFunction"` = 1 in `check-function-calls.ts`; 0 in `setopts-code-scanner.ts`; guard test passes |
| Backward chain walk bounded by enclosing statement array; never crosses scopes | 88-02 | ✓ VERIFIED | `findAnchor`/`walkChain`/`flattenStatements` read directly; 300-statement-preamble regression test passes; outer-scope-origin test asserts `safe: false` |
| AND masks framed as cleared bits, never as raw/set bits (swap-detecting test) | 88-02 | ✓ VERIFIED | `describeIorAndMask(1, 0xF7, 'clear')` test asserts the exact inverted label |
| `decodeInCode`/`composeTriState` registered strictly after `createBBjServices` | 88-03 | ✓ VERIFIED | `main.ts` read directly: `registerSetOptsInCodeRequests` call follows `createBBjServices`; ordering guard test passes |
| Composed block round-trips through `traceOptsChain` as `safe: true` with the same effect | 88-03 | ✓ VERIFIED | Round-trip test in `setopts-in-code-request.test.ts` passes |
| Two new request names declared once on the single `BbjComposerServer` interface, pinned against TS source | 88-04 | ✓ VERIFIED | `ComposerRequestContractTest` (14-name `DECLARED_REQUESTS`) passes; `grep -c "interface BbjComposerServer"` = 1 |
| `SetoptsTriStateEntry.byte` wire key preserved via `@SerializedName`; every DTO round-trips through LSP4IJ's own `MessageJsonHandler` | 88-04 | ✓ VERIFIED | `ComposerModelsJsonBoundaryTest` (4 new round trips) passes |
| `sameSetoptsInCode` compares every field, fails closed on reordered tri-state entries | 88-04 | ✓ VERIFIED | `DecodeEqualityTest` (one mismatch case per field + reordering case) passes |
| Tri-state dialog reuses Phase 87's byte-grouped layout, `PreviewDebouncer`, CR-01 OK-gating | 88-05 | ✓ VERIFIED | `ComposerDialogRefreshSourceGuardTest` (5 sources, 12/12 tests) passes; no `new Alarm`/`Timer` (grep = 0) |
| `ComposerLauncher` routes absolute/chain/compose-new/not-editable to the correct dialog/notice | 88-05 | ✓ VERIFIED | `SetoptsInCodeSourceGuardTest` (4/4) passes |
| Lightbulb intention registered with its own `intentionDescriptions/` resources | 88-05 | ✓ VERIFIED | `plugin.xml` has exactly one `ConfigureSetoptsInCodeIntention` registration; `IntentionDescriptionResourcesTest`/`ComposerIntentionPreviewSourceGuardTest` pass |
| VS Code `RefactorRewrite` Code Action + `bbj.composeSetoptsInCode` command, no CodeLens | 88-06 | ✓ VERIFIED | `grep -c registerCodeLensProvider` = 0 in `setopts-in-code-ui.ts`, still 1 (unchanged) in `setopts-composer-ui.ts`; `test/setopts-in-code-ui.test.ts` (33 tests) passes |
| VS Code webview never computes the block client-side | 88-06 | ✓ VERIFIED | `grep -c setoptsPreview` = 0 in `setopts-tristate-webview.ts`; `grep -c composeTriState` = 1 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/language/setopts-code-scanner.ts` | Pure AST scanner, all 3 shapes | ✓ VERIFIED | Exists, 513 lines, exports match plan (`setoptsHoverTarget`, `detectSetOptsShape`, `setoptsHoverMarkdown`, `traceOptsChain`, `foldChainEffect`, `UNSAFE_REASON_TEXT`, etc.); 0 imports from `vscode`/`langium/lsp` |
| `bbj-vscode/src/language/setopts-in-code-request.ts` | Document-aware requests | ✓ VERIFIED | Exists; `editable` derivation confirmed direct from scanner verdict |
| `bbj-vscode/src/setopts-in-code-ui.ts` | Code Action + command | ✓ VERIFIED | Exists; no CodeLens registered |
| `bbj-vscode/src/setopts-tristate-webview.ts` | Tri-state webview | ✓ VERIFIED | Exists; CSP/nonce discipline retained (`grep -c nonce` ≥ 2) |
| `bbj-intellij/.../ComposerModels.java` | 8 new DTO classes | ✓ VERIFIED | Exists; field-by-field comparison recorded in 88-04-SUMMARY.md |
| `bbj-intellij/.../BbjComposerServer.java` | 2 new `@JsonRequest` methods | ✓ VERIFIED | Exists; single interface preserved |
| `bbj-intellij/.../SetoptsTriStateComposerDialog.java` | Tri-state Swing dialog | ✓ VERIFIED | Exists; `ButtonGroup`-backed 3-state rows |
| `bbj-intellij/.../ConfigureSetoptsInCodeIntention.java` | Lightbulb intention | ✓ VERIFIED | Exists; `intentionDescriptions/` resources present |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `BBjHoverProvider.getHoverContent` | `setoptsHoverTarget`/`detectSetOptsShape`/`setoptsHoverMarkdown` | direct call, before `super.getHoverContent` | ✓ WIRED | `grep -n` line-order confirms the branch precedes `getAstNodeHoverContent`'s declaration |
| `setopts-code-scanner.ts` | `setopts-catalog.ts` | `parseVector`, `describeVector`, `describeIorAndMask`, `describeMaskVector` | ✓ WIRED | Import statement present; no duplicate bit-arithmetic in the scanner |
| `setopts-code-scanner.ts` | `check-function-calls.ts` | `resolveLibFunction` | ✓ WIRED | Imported, single definition confirmed |
| `main.ts` | `registerSetOptsInCodeRequests` | called after `createBBjServices` | ✓ WIRED | Ordering guard test passes; source read confirms line order |
| `decodeInCode` | `setoptsHoverTarget`/`detectSetOptsShape` | same detection path as hover | ✓ WIRED | Confirmed in `setopts-in-code-request.ts` source |
| `ConfigureSetoptsInCodeIntention.invoke` | `ComposerLauncher.launch(..., Kind.SETOPTS_IN_CODE)` | `server.setoptsDecodeInCode` | ✓ WIRED | Confirmed via `SetoptsInCodeSourceGuardTest` |
| `setopts-in-code-ui.ts` command | `openSetOptsTriStateComposerPanel` / `openSetOptsComposerPanel` | mode-based routing | ✓ WIRED | Confirmed via routing tests in `setopts-in-code-ui.test.ts` |
| Both edit paths (both IDEs) | `StaleEditGuard.applyIfUnchanged` / re-decode | `DecodeEquality::sameSetoptsInCode` | ✓ WIRED | `grep -c sameSetoptsInCode` ≥ 2 in `ComposerLauncher.java`; source guard confirms |

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 88 VS Code targeted test files | `npx vitest run test/setopts-code-scanner.test.ts test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-request.test.ts test/setopts-in-code-ui.test.ts test/validation-function-calls.test.ts` | 6 files, 213 tests, 0 failed | ✓ PASS |
| VS Code build | `npm run build` (tsc -b + esbuild) | exit 0 | ✓ PASS |
| VS Code whole-suite regression check | `npx vitest run --maxWorkers=2` | 1450 passed, 12 failed, 5 skipped (1467 total) | ✓ PASS (see note) |
| IntelliJ composer test suite | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*'` | BUILD SUCCESSFUL | ✓ PASS |
| IntelliJ whole test suite | `./gradlew test --offline` | BUILD SUCCESSFUL (0 failures) | ✓ PASS |

**Note on the 12 whole-suite VS Code failures:** all 12 are the pre-existing `getAllClassNames` interop-backend test drift (11 `linking.test.ts` cases + 1 `issue447-real-interop.test.ts` case) documented in STATE.md/MEMORY as environment drift unrelated to any phase, dated 2026-09-03 — confirmed directly by re-running the failing test and reading its own assertion (`interop.ensureCompleteClassIndex()` expected `false`, a live-interop capability-negotiation mismatch, nothing to do with SETOPTS). This matches the exact count (12) every phase-88 plan SUMMARY reported as its own pre-existing baseline. Not a regression introduced by this phase.

### Code Review Findings — Verified Fixed in Current Codebase

`88-REVIEW.md` (re-review, standard depth) found 0 critical / 3 warnings / 1 info after the first
review iteration's CR-01/WR-01/WR-02 fixes were already applied. `88-REVIEW-FIX.md` claims all 4
were fixed in iteration 2. Verified directly against the current tree (not just the fix report's
claims):

| Finding | Claimed fix | Verified in current code |
|---|---|---|
| WR-A (no trailing boundary for bare `SETOPTS`) | Regex `\bSETOPTS\b\|\bIOR\(\|\bAND\(`; Java `hasIdentifierCharAfter` | ✓ Confirmed present in `setopts-in-code-ui.ts` and `ComposerLauncher.java`; regression tests (`SETOPTSFOO`, `SETOPTSHELPER(`) present and passing |
| WR-B (`findAnchor` mis-scoping inside a `CompoundStatement`) | `findAnchor` climbs past `CompoundStatement`; `target` (not the anchor array position) passed to `walkChain` | ✓ Confirmed present in `setopts-code-scanner.ts:205-220,464-469`; dedicated regression test passing (54/54 tests in the scanner suite) |
| WR-C (divergent identifier-boundary definitions) | Java `isIdentifierChar` dropped BBj sigils to match TS `\w` | ✓ Confirmed present in `ComposerLauncher.java` (`isIdentifierChar` helper, no `$!%@` in the char set) |
| IN-01 (missing regression test for WR-A gap) | Added `SETOPTSFOO`/`SETOPTSHELPER(` negative cases | ✓ Confirmed present in `setopts-in-code-ui.test.ts` |

All fix commits (`17505b74`, `bc238b2d`, `3aea0872`, `35301592`) are present in `git log` on the
current branch tip, and all associated tests pass in the fresh test runs above.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| DISC-05 | 88-01, 88-02 | Hover decode for SETOPTS literal / IOR/AND-against-OPTS-derived-variable, AND masks as cleared bits | ✓ SATISFIED | All 3 shapes implemented and hover-tested; REQUIREMENTS.md marks it Complete |
| DISC-06 | 88-02 (oracle only), 88-03, 88-04, 88-05, 88-06 | Tri-state compose-new + edit-in-place for the two statically-safe shapes, both IDEs | ✓ SATISFIED | Both IDE halves shipped (88-05 IntelliJ, 88-06 VS Code); REQUIREMENTS.md marks it Complete; `requirements mark-complete` was deliberately withheld until both IDEs landed (per 88-02/88-03/88-04/88-06 SUMMARYs), then applied in 88-05 |

No orphaned requirements: `grep "Phase 88" REQUIREMENTS.md` returns exactly DISC-05 and DISC-06,
matching both plan frontmatters exactly.

### Anti-Patterns Found

No blocker-level anti-patterns (TBD/FIXME/XXX debt markers, stub returns, empty handlers) found in
any of the ~29 files this phase modified. `TODO`/`HACK`/`placeholder` scans returned no hits in the
new production source files. Planning-identifier references (`D-01`..`D-08`, `CR-01`, `WR-01`,
`plan 88-0N`) appear in doc comments across the diff — this is a known, established pattern for
this repository (the immediately preceding Phase 87 diff carries the identical style, e.g. `D-01`
through `D-15`, `CR-01`, `CR-02`, `WR-02`, `WR-04`), used here for design-decision traceability in
comments rather than any embargoed/secret content; treated as informational, not a gap, consistent
with how Phase 87 was accepted.

### Human Verification Required

The two plans (`88-05`, `88-06`) themselves flag specific claims as `human_judgment: true` — code
that is present and structurally wired but not exercised by an automated test against a live
editor/runtime. Per this task's explicit instruction, these are routed to human verification
rather than failed or fabricated as passing:

1. **Hover decode in both live IDEs** (QA rows 15, 19) — Test: hover an absolute literal, a safe chain, an `IOR(...)` and an `AND(...)` call in a real `.bbj` editor in VS Code and IntelliJ. Expected: markdown names the right options, AND framed as cleared. Why human: automated tests prove the markdown text via `getHoverContent`, not the rendered popup in a live host.
2. **Tri-state composer end-to-end in both live IDEs** (QA rows 16, 20) — Test: invoke the composer, change Set/Clear selections, apply on a safe chain, compose-new on a blank line, and confirm no edit on an unsafe chain. Expected: only the reassignment region changes; compose-new inserts at line start; unsafe chain shows the reason with no dialog. Why human: the deterministic catalog-bit ordering that reaches the actual applied document depends on the webview's `<script>` and the Swing dialog's row-construction order, both structurally correct by construction but not exercised end-to-end by any automated test (88-05-SUMMARY.md T7 and 88-06-SUMMARY.md D5 both explicitly flag this as pending UAT, not machine-verified).
3. **Live-BBjServices mask-width falsification** (QA row 21) — Test: compose and insert a new block via the tri-state composer against a live BBjServices, run the program, watch for `!ERROR`. Expected: no `!ERROR`, confirming or refuting the 16-byte full-width mask-padding assumption (88-RESEARCH.md Assumption A2). Why human: this is an explicit plan-declared falsification check against real BASIS runtime behavior this verifier has no access to.

### Gaps Summary

No blocking gaps. All must-haves that can be verified by reading code, running the phase's test
suites, and running the whole-suite regression check are VERIFIED. Three items are explicitly
`human_judgment: true` per the plans themselves and are routed to human verification (QA checklist
rows 15/16/19/20/21, all present and correctly worded in `QA/FULL-TEST-CHECKLIST.md`, awaiting hand
execution) rather than failed or claimed as passing on presence alone.

---

_Verified: 2026-09-07T23:40:00Z_
_Verifier: Claude (gsd-verifier)_
