---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 03
subsystem: language-server
tags: [langium, lsp, setopts, composer, codegen]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-01/88-02's setopts-code-scanner.ts (detectSetOptsShape, traceOptsChain, foldChainEffect, UNSAFE_REASON_TEXT) and the shared SETOPTS catalog engine this plan's mask codegen and decode requests build on without reimplementing bit/byte logic"
provides:
  - "setopts-catalog.ts's tri-state model — SetOptsTriState/SetOptsTriStateSelection, singleBitIorMask/singleBitAndMask (explicit full-width base, never a partial vector), composeSetOptsBlock (deterministic Set-then-Clear catalog-order codegen), triStateFromChainEffect"
  - "setopts-in-code-request.ts — bbj/composer/setopts/decodeInCode and .../composeTriState, registered after createBBjServices (documents-aware, unlike the pre-services composerHandlers registry)"
  - "traceOptsChain widened to carry the safe chain's origin Assignment node, so the request layer locates the edit-in-place line range without a second AST walk"
affects: [88-04 (LSP4IJ DTO/server-interface extension for these two requests), 88-05 (IntelliJ tri-state dialog consumes decodeInCode/composeTriState), 88-06 (VS Code tri-state UI consumes the same requests)]

# Actuals (#2632)
actuals:
  tokens: 11337
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Document-aware request family (uri+position params, not a single-line string) follows resolved-config-path-request.ts's Deps/createXHandlers(deps)/registerXRequests(connection,deps) shape, registered in main.ts AFTER createBBjServices — composerHandlers cannot host this family since it registers before the services exist and receives only plain JSON with no document access"
    - "A request-layer edit gate is derived directly from the scanner's own safety verdict (shape.safe / shape.kind), never re-decided in the request module — same discipline as the hover branch, so hover and edit-gating can never disagree"

key-files:
  created:
    - bbj-vscode/src/language/setopts-in-code-request.ts
    - bbj-vscode/test/setopts-in-code-request.test.ts
  modified:
    - bbj-vscode/src/setopts-catalog.ts
    - bbj-vscode/src/language/setopts-code-scanner.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/test/setopts-catalog.test.ts

key-decisions:
  - "Widened traceOptsChain's safe-chain result with an optional originNode: AstNode (the OPTS-sourced Assignment) per the plan's own instruction — the request layer needs the origin's document line for the edit-in-place startLine and this avoids a second backward AST walk. Existing tests use toMatchObject/property access on chain shapes, never an exact toEqual, so the added field breaks nothing."
  - "decodeInCode maps a bare IOR/AND call target (the 'mask-call' hover shape) to the same not-found result as 'no SETOPTS shape nearby' — the result DTO's mode union only declares 'absolute' | 'chain' | 'none', and a single call outside a SetOptsStatement is never an edit-in-place target for this composer (D-04 names only the two SetOptsStatement-rooted shapes); a mask-call remains hover-only, already served by 88-02's setoptsHoverMarkdown."
  - "The absolute shape's hexRange spans the ENTIRE literal token (including any $...$/quote delimiters), not just the inner hex digits, so a client always knows the exact span to replace regardless of which literal form (bare HEX_STRING vs. quoted STRING_LITERAL) was used; hexDigits carries the canonical delimiter-free uppercase digits separately."
  - "The chain edit range's indent is read from the first reassignment line's leading whitespace when one exists, and from the SETOPTS line's own leading whitespace when the chain has zero reassignments (startLine === endLine) — both cases resolve through one lineIndent(document, indentLine) helper using the existing END_OF_LINE_CHARACTER convention (lsp-position.ts) to read a full line's text safely."

patterns-established:
  - "A structurally-declared mirror interface (SetOptsChainEffectLike in setopts-catalog.ts) lets a zero-dependency pure module consume a shape from a Langium-dependent module (setopts-code-scanner.ts's SetOptsChainEffect) without an import — preserves the catalog's 'no host, no Langium dependency' property while staying type-compatible."

requirements-completed: []

coverage:
  - id: D1
    description: "A tri-state Set/Clear/Leave selection composes a canonical var$=OPTS / IOR / AND / SETOPTS var$ block, deterministic in catalog order, with an all-Leave selection producing exactly the origin and SETOPTS lines"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-catalog.test.ts#composeSetOptsBlock (all cases: mixed selection, Set-before-Clear ordering, reassignments-only scope, all-Leave block/reassignments, explicit-vs-missing leave, indent prefix, custom variable, determinism)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Generated IOR/AND masks are built from an explicit full-width all-zero/all-0xFF base so no unmodelled or reserved bit is ever disturbed by a generated line"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-catalog.test.ts#singleBitIorMask / singleBitAndMask (full-width masks) (all three tests, including the every-catalog-bit MAX_BYTES*2-width loop)"
        status: pass
    human_judgment: false
  - id: D3
    description: "bbj/composer/setopts/decodeInCode answers from the already-open document for the two statically-safe shapes (absolute literal, safe chain), gates editable directly off the scanner's safety verdict, and fails closed (found: false) for an unsafe chain's edit fields, a bare mask-call target, no shape, and a document the store does not hold"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-request.test.ts#bbj/composer/setopts/decodeInCode (all 8 named cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "bbj/composer/setopts/composeTriState is a thin pass-through to composeSetOptsBlock, and a block it composes round-trips through traceOptsChain as a safe chain with the same set/clear effect"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-request.test.ts#bbj/composer/setopts/composeTriState (both tests, including the round-trip through parseHelper + traceOptsChain)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both new requests are registered in main.ts strictly after createBBjServices (never joining the pre-services composerHandlers registry), with the ordering guard's red state independently demonstrated and reverted before commit"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-request.test.ts#setopts-in-code-request.ts wiring in main.ts (all 3 guards)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-07
status: complete
---

# Phase 88 Plan 03: Tri-State Composer Codegen & Document-Aware Requests Summary

**`bbj/composer/setopts/decodeInCode` and `.../composeTriState` expose the scanner as document-aware requests, with full-width `IOR`/`AND` mask codegen and a deterministic tri-state-to-block composer — DISC-06's compose-new/edit-in-place wire layer, gated entirely by 88-02's safe/unsafe chain oracle.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `setopts-catalog.ts` gained a tri-state model (`SetOptsTriState`/`SetOptsTriStateSelection`), full-width single-bit mask generators built from an explicit all-zero (`IOR`) or all-`0xFF` (`AND`) `MAX_BYTES`-wide base — never a partial vector that could leave an unmodelled bit disturbed — and `composeSetOptsBlock`, which iterates the catalog (not the selection array) so output is always deterministic Set-then-Clear catalog order, with the all-Leave edge pinned to exactly two lines (`block` scope) or zero lines (`reassignments` scope)
- `traceOptsChain` (88-02) was widened to carry the safe chain's origin `Assignment` node, letting the new request layer compute the edit-in-place line range without a second backward AST walk — existing chain-shape assertions all use `toMatchObject`/property access, so nothing broke
- `setopts-in-code-request.ts` exposes `bbj/composer/setopts/decodeInCode` (position → shape, edit gate, prefill tri-state selection) and `.../composeTriState` (selection → canonical block text), mirroring `resolved-config-path-request.ts`'s `Deps`/`createXHandlers`/`registerXRequests` shape rather than joining the pre-services `composerHandlers` registry
- `decodeInCode`'s `editable` flag is assigned directly from the scanner's own safety verdict (`true` for absolute, `shape.safe` for chain, `false`/not-found for a bare mask-call or no shape at all) — never re-decided in the request layer, so hover and edit-gating can never disagree (T-88-01)
- A round-trip test composes a mixed Set/Clear/Leave block via `composeTriState`, re-parses it as a `.bbj` document, and confirms `traceOptsChain` classifies it `safe: true` with the exact same folded effect the selection described
- `main.ts` registers both requests after `createBBjServices`, alongside `registerCompileRequest`/`registerResolvedConfigPathRequest`; a wiring guard test pins the ordering and independently proved its own red state (temporarily hoisting the call above `createBBjServices`, observing failure, reverting) before the commit landed

## Task Commits

Each task was committed atomically:

1. **Task 1: Tri-state model, full-width mask generators and canonical block codegen** - `1601a07d` (feat)
2. **Task 2: `bbj/composer/setopts/decodeInCode` and `bbj/composer/setopts/composeTriState`** - `7d3715f0` (feat)
3. **Task 3: Wire the in-code requests into the running server** - `3d0aebf3` (feat)

## Files Created/Modified
- `bbj-vscode/src/setopts-catalog.ts` - New tri-state model, `singleBitIorMask`/`singleBitAndMask`, `composeSetOptsBlock`, `SetOptsChainEffectLike`, `triStateFromChainEffect` — still 0 import statements (grep-verified), no new dependency
- `bbj-vscode/src/language/setopts-code-scanner.ts` - `SetOptsCodeShape`'s chain variant, `StatementVerdict`, `ChainWalkResult` and `traceOptsChain` widened with an optional `originNode: AstNode`, populated only for a safe chain
- `bbj-vscode/src/language/setopts-in-code-request.ts` - New: method constants, params/result interfaces (`SetOptsInCodeDecodeParams/Result`, `SetOptsInCodeAbsoluteEdit`, `SetOptsInCodeChainEdit`, `SetOptsComposeTriStateParams/Result`), `SetOptsInCodeDeps`, `createDecodeInCodeHandler`/`createComposeTriStateHandler`/`createSetOptsInCodeHandlers`, `registerSetOptsInCodeRequests`
- `bbj-vscode/src/language/main.ts` - Imports and calls `registerSetOptsInCodeRequests(connection, { documents: shared.workspace.LangiumDocuments })` immediately after `registerResolvedConfigPathRequest`, with a comment explaining why this family cannot join `registerComposerRequests`
- `bbj-vscode/test/setopts-catalog.test.ts` - New `describe` blocks for the mask generators, `composeSetOptsBlock` (every behavior bullet) and `triStateFromChainEffect`
- `bbj-vscode/test/setopts-in-code-request.test.ts` - New: `decodeInCode` (8 cases), `composeTriState` (pass-through + round-trip), method-name convention check, and the three `main.ts` wiring guards

## Decisions Made
- Widened `traceOptsChain`'s return type with `originNode` rather than re-walking the AST a second time in the request layer, per the plan's own explicit instruction; recorded here as required.
- A bare `IOR`/`AND` call target (`mask-call` hover shape) is treated as "not found" by `decodeInCode` — the result DTO's `mode` union has no fourth value for it, and D-04 names only the two `SetOptsStatement`-rooted shapes as edit-in-place targets; a mask-call stays hover-only (already served by 88-02).
- The absolute shape's `hexRange` spans the entire literal token (delimiters included), so a client always knows the exact span to replace regardless of literal form; `hexDigits` carries the canonical delimiter-free digits separately.
- The chain edit range's `indent` is read via one `lineIndent(document, indentLine)` helper (built on the existing `END_OF_LINE_CHARACTER` line-read convention from `lsp-position.ts`), selecting the first reassignment line when one exists and the `SETOPTS` line itself when the chain has zero reassignments.
- Per this plan's own note and 88-02's established precedent, **DISC-06 was NOT marked complete** — its full user-facing wording (tri-state composer, compose-new, edit-in-place) is not satisfied until the IntelliJ dialog (88-05) and VS Code UI (88-06) also land. `requirements-completed` is empty; `requirements mark-complete` was not invoked.

## Deviations from Plan

None — plan executed exactly as written, including the explicitly plan-authorized `traceOptsChain` return-type widening (documented above, not a Rule 1-4 deviation) and the demonstrated-then-reverted red state for the Task 3 ordering guard.

## Issues Encountered
One authoring mistake caught immediately by the test runner: the new file's opening JSDoc comment originally contained the literal substring `bbj/composer/*/decodeCall`, whose embedded `*/` prematurely closed the block comment and broke the TypeScript parse. Fixed by rewording to `bbj/composer/.../decodeCall` before the first task commit — never reached a committed state.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 88-04 can extend the IntelliJ `BbjComposerServer` JSON-RPC interface and DTO family with `setoptsDecodeInCode`/`setoptsComposeTriState`, matching the wire shapes `SetOptsInCodeDecodeParams/Result` and `SetOptsComposeTriStateParams/Result` already define
- Plans 88-05/88-06 can drive `decodeInCode`/`composeTriState` directly for the tri-state dialog/UI; `initial` (a full `SetOptsTriStateSelection`) is ready to prefill a 3-state control per catalog bit
- Whole-suite vitest run after this plan: 1394 passed, 28 skipped, 0 failed (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) — no regressions introduced
- `npm run build` (tsc -b + esbuild) exits 0
- No other blockers

## Self-Check: PASSED

All 6 created/modified files verified present on disk; all 3 task commit hashes
(`1601a07d`, `7d3715f0`, `3d0aebf3`) verified present in `git log --oneline --all`.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-07*
