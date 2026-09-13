---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 02
subsystem: language-server
tags: [langium, hover, ast-analysis, setopts, data-flow]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-01's setopts-code-scanner.ts absolute-shape tracer, the declared chain/mask-call SetOptsCodeShape variants, and the exported resolveLibFunction this plan reuses for IOR/AND call-site resolution"
provides:
  - "traceOptsChain — a backward, branch-stopping AST walk over the directly enclosing flat statement array that answers safe/unsafe for an OPTS-derived IOR/AND chain, bounded by that array's length and never crossing into a nested MethodDecl/DefFunction/BbjClass"
  - "foldChainEffect — folds a chain's IOR/AND links into catalog-ordered set/clear lists with last-write-wins per bit"
  - "describeIorAndMask/describeMaskVector in setopts-catalog.ts — the AND-masks-as-cleared-bits query shape DISC-05 requires, reused by both the chain and single-call hover renderers"
  - "setoptsHoverTarget extended to resolve a MethodCall's own method-name token (shape c), excluding argument positions and the logical AND/OR operator"
  - "setoptsHoverMarkdown extended with the chain (safe/unsafe) and mask-call renderers, including a shared UNSAFE_REASON_TEXT map plan 88-03 can reuse for its own edit-gating messages"
affects: [88-03 (tri-state composer's edit-in-place gating depends on traceOptsChain's safe/unsafe verdict), 89 (composer discoverability cue)]

# Actuals (#2632)
actuals:
  tokens: 15350
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backward statement-list walk with CompoundStatement flattening: flatten the enclosing array once (inlining a CompoundStatement sibling's own children at its position) rather than special-casing compound siblings mid-scan — this is what makes the 'CompoundStatement transparent to its parent' rule (bbj-scope-local.ts's own convention) fall out naturally instead of needing a recursive scan"
    - "Resolved single-bit set/clear results are rendered through the same describeIorAndMask('set', ...) call regardless of whether the bit came from an IOR or an AND link — the 'clear' kind's bit-inversion only applies when interpreting a raw multi-bit mask argument, never a pre-resolved single-bit fact"
    - "A shared Record<Reason, string> keyed by a closed union (UNSAFE_REASON_TEXT) is the single source of user-facing wording for a safety classification, so a downstream consumer (88-03's edit gating) reuses the exact sentence instead of a second inline switch that could drift"

key-files:
  created: []
  modified:
    - bbj-vscode/src/setopts-catalog.ts
    - bbj-vscode/src/language/setopts-code-scanner.ts
    - bbj-vscode/test/setopts-catalog.test.ts
    - bbj-vscode/test/setopts-code-scanner.test.ts
    - bbj-vscode/test/hover.test.ts

key-decisions:
  - "traceOptsChain flattens the enclosing statement array once (CompoundStatement.statements typed SingleStatement, never nested), then walks it backward by reference-identity index lookup, rather than tracking compound-vs-outer position separately — simpler and matches the algorithm's own 'transparent to its parent' framing exactly"
  - "foldChainEffect skips any catalog byte beyond a link's own vector.bytes.length entirely (neither sets nor clears it) — consistent with describeMaskVector's established 'a short mask says nothing about bytes it doesn't cover' contract from Task 1, rather than treating a short AND mask as implicitly clearing everything beyond its length"
  - "The chain effect's Sets/Clears hover lines both resolve through describeIorAndMask(byte, mask, 'set') — using 'set' as the presence check for both effect.set and effect.clear entries, since those lists already hold individually-resolved bits, not raw multi-bit masks needing the clear-inversion"
  - "DISC-06 was NOT marked complete despite appearing in this plan's frontmatter requirements list — its actual deliverables (tri-state composer, compose-new, edit-in-place) are plan 88-03's scope; this plan only builds the safe/unsafe oracle 88-03's edit gating will consume. Only DISC-05 was passed to requirements mark-complete, per the phase's own ROADMAP.md success-criteria breakdown (criterion 1 = DISC-05, criteria 2-4 = DISC-06)"

patterns-established:
  - "A single flattening pass over a statement array (inlining CompoundStatement children at their position) is the correct primitive for any future backward/forward walk over BBj's flat statement-list containers — cheaper and more readable than ad-hoc recursion at each scan step"

requirements-completed: [DISC-05]

coverage:
  - id: D1
    description: "Hovering SETOPTS on a safe OPTS->IOR/AND chain lists the accumulated set and cleared options against the runtime vector, in catalog order, with an explicit '(none)' for an empty side"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: chain and mask-call shape decode (88-02, DISC-05) > hovering SETOPTS on a safe OPTS->IOR chain lists the set options and states the cleared side explicitly"
        status: pass
      - kind: unit
        ref: "test/setopts-code-scanner.test.ts#setoptsHoverMarkdown: chain and mask-call shapes (88-02, DISC-05) > safe chain markdown states the runtime-vector framing and lists Sets/Clears in catalog order, with an explicit (none) for the empty side"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every named unsafe chain shape (control-flow, reassigned, alias, unparseable-mask, no-origin, and an outer-scope origin) reports safe:false with a specific reason and never a false safe:true; the hover states undecidability, names the reason, and never fabricates a vector or claims editability"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "test/setopts-code-scanner.test.ts#setopts-code-scanner: OPTS→IOR/AND chain walk (88-02, DISC-05/DISC-06) (all named-unsafe-case tests, the outer-scope test, and the bounded-walk 'no-origin' test)"
        status: pass
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: chain and mask-call shape decode (88-02, DISC-05) > hovering SETOPTS on an unsafe chain says the value cannot be determined statically, names the reason, and never fabricates a vector or claims editability"
        status: pass
    human_judgment: false
  - id: D3
    description: "Hovering a single IOR/AND call names the option(s) it sets/clears; an AND mask is always framed as the options it clears, pinned by a swap-detecting test, and only the call's own method-name token triggers this — not an argument, and not the unrelated logical AND/OR operator"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "test/setopts-catalog.test.ts#describeIorAndMask / describeMaskVector (AND masks as the options they clear) (the swap-detecting 0xF7 'clear' test)"
        status: pass
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: chain and mask-call shape decode (88-02, DISC-05) > hovering the AND token of a chain-link call names the option it CLEARS, with wording that says it is cleared"
        status: pass
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: chain and mask-call shape decode (88-02, DISC-05) > hovering the first argument inside IOR(opts$,\"$08$\") returns no SETOPTS markdown"
        status: pass
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: chain and mask-call shape decode (88-02, DISC-05) > hovering the AND of a logical \"IF x=1 AND y=2\" line returns no SETOPTS markdown"
        status: pass
    human_judgment: false
  - id: D4
    description: "The backward walk cost is bounded by the enclosing statement array's length, not document size, and never recurses into a nested MethodDecl/DefFunction/BbjClass"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "test/setopts-code-scanner.test.ts#bounded-walk regression (large preamble) (both cases: identical result with/without a 300-statement preamble, and terminates with 'no-origin' when the origin is pulled into an outer scope)"
        status: pass
    human_judgment: false
duration: 40min
completed: 2026-09-07
status: complete
---

# Phase 88 Plan 02: Backward OPTS Chain Walk & Remaining Hover Shapes Summary

**Backward `OPTS`→`IOR`/`AND`→`SETOPTS` chain walk with a conservative safe/unsafe boundary, plus AND-masks-as-cleared-bits hover rendering for both the chain and single-call shapes — completing DISC-05's three decode shapes through the real `getHoverContent` path.**

## Performance

- **Duration:** 40 min
- **Tasks:** 3
- **Files modified:** 5 (0 created, 5 modified)

## Accomplishments
- `describeIorAndMask`/`describeMaskVector` in `setopts-catalog.ts` give the SETOPTS domain engine a query shape for "what does this `IOR`/`AND` mask set/clear", with `'clear'` inverted to report the catalog bits ABSENT from the mask (DISC-05's own wording) — pinned by a test that fails if the branches are swapped
- `traceOptsChain` walks the target's directly enclosing flat statement array backward, flattening `CompoundStatement` siblings in place, and stops at the first control-flow marker, non-`IOR`/`AND` reassignment, aliased first argument, unparseable mask, or exhausted array — every one of the five `SetOptsUnsafeReason` values, plus an outer-scope-origin case, is pinned by an executing test that would fail on a false "safe"
- `foldChainEffect` accumulates a chain's links into catalog-ordered set/clear lists with last-write-wins per bit, proven by a two-link IOR-then-AND test on the same bit
- `setoptsHoverTarget` now resolves a single `IOR`/`AND` call from its own method-name token, structurally excluding argument positions (a `ParameterCall`'s `SymbolRef` never satisfies the `call.method === node` check) and the unrelated logical `AND`/`OR` operator (which has no `SymbolRef` at all)
- `setoptsHoverMarkdown` renders the safe chain (runtime-vector framing, catalog-ordered Sets/Clears with explicit `(none)`), the unsafe chain (a shared `UNSAFE_REASON_TEXT` sentence per reason, asserted to never share the safe chain's `"Sets: "` introduction), and the single-call shape (AND framed as cleared, never as set)
- A synthetic 300-statement-preamble regression proves the walk's cost is bounded by the enclosing array's length, not document size, and terminates correctly whether the preamble sits entirely before the chain or between an `IOR` link and its `SETOPTS`, in the latter case correctly reporting `no-origin` once the origin is pulled into an outer (never-crossed) scope

## Task Commits

Each task was committed atomically:

1. **Task 1: `describeIorAndMask`/`describeMaskVector` — AND masks as the options they clear** - `647ca6bf` (feat)
2. **Task 2: Backward `OPTS`→`IOR`/`AND` chain walk with its conservative safe/unsafe boundary** - `04095c1d` (feat)
3. **Task 3: Hover markdown for the chain and single-call shapes** - `769ed47d` (feat)

## Files Created/Modified
- `bbj-vscode/src/setopts-catalog.ts` - New `describeIorAndMask`/`describeMaskVector` exports, placed after `describeVector`
- `bbj-vscode/src/language/setopts-code-scanner.ts` - `traceOptsChain`, `foldChainEffect`, the backward-walk helpers (`findAnchor`, `containerStatements`, `flattenStatements`, `matchStatement`, `walkChain`), `parseHexLiteral`/`symbolRefName`/`iorOrAndName`/`trackedVariableName` shared helpers, `setoptsHoverTarget`'s shape-(c) extension, `UNSAFE_REASON_TEXT`, and the `chainHoverMarkdown`/`maskCallHoverMarkdown` renderers; `detectSetOptsShape` now routes all three shapes
- `bbj-vscode/test/setopts-catalog.test.ts` - New `describe` block for `describeIorAndMask`/`describeMaskVector`, including the swap-detecting inversion test
- `bbj-vscode/test/setopts-code-scanner.test.ts` - New chain-walk describe block (every named unsafe reason, zero-reassignment/comma-chained/case-insensitive/compound-transparency edge cases, bounded-walk regression), a shape-(c) target-resolution describe block, and a pure-markdown-rendering describe block
- `bbj-vscode/test/hover.test.ts` - New end-to-end describe block covering all six DISC-05 hover behavior bullets through real `getHoverContent` calls

## Decisions Made
- `traceOptsChain` flattens the enclosing statement array once rather than special-casing `CompoundStatement` siblings mid-scan — the algorithm's "transparent to its parent" rule falls out for free once the array is flattened before walking
- `foldChainEffect` skips catalog bytes beyond a link's own mask length entirely (neither set nor clear), matching `describeMaskVector`'s established "a short mask says nothing about bytes it doesn't cover" contract from Task 1
- Both `effect.set` and `effect.clear` render through `describeIorAndMask(byte, mask, 'set')` — the `'clear'` kind's bit-inversion is for interpreting a raw multi-bit mask argument, not a list of already-resolved single bits
- **`DISC-06` was intentionally NOT marked complete**, despite appearing in this plan's PLAN.md frontmatter `requirements` field. Reading DISC-06's literal wording (tri-state composer, compose-new codegen, edit-in-place) against ROADMAP.md's own Phase 88 success-criteria breakdown (criterion 1 = DISC-05, criteria 2-4 = DISC-06) confirms none of DISC-06's deliverables land until plan 88-03. This plan only builds the safe/unsafe oracle 88-03's edit gating depends on. Only `DISC-05` was passed to `requirements mark-complete` — the same diligence the orchestrator applied when it reverted 88-01's premature DISC-05 check, applied here in the other direction to avoid a premature DISC-06 check.

## Deviations from Plan

None — plan executed exactly as written. One pre-existing acceptance-criteria mismatch is worth flagging rather than silently "fixing": Task 3's acceptance criteria states `grep -c "getAstNodeHoverContent" bbj-hover.ts` should be exactly 1, but the count was already 2 before this plan started (88-01 added a comment referencing the name alongside the real declaration). Since `bbj-hover.ts` needed no code changes for Task 3 (confirmed by reading the file, per the task's own instruction), this count is unchanged by this plan and is a stale assumption in the plan's acceptance criteria rather than a regression to fix.

## Issues Encountered
None. One test-construction subtlety worth recording: `GotoStatement`'s `target` is a `LabelRef` resolved via `ValidName` (an `ID`), not a numeric literal — an initial `GOTO 100` test fixture failed to parse as a `GotoStatement` at all (it lexes as a different construct) and was corrected to `GOTO LBL` before the control-flow-marker test suite passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 88-03 can build the tri-state composer's edit-in-place gating directly on `traceOptsChain`'s `safe`/`unsafeReason` verdict and reuse `UNSAFE_REASON_TEXT`'s exact wording for its own messages, per this plan's own design intent
- `foldChainEffect` and the mask-generation helpers 88-03 needs (full-width `IOR`/`AND` mask codegen) are a natural extension of `setopts-catalog.ts`'s existing byte/bit primitives — no restructuring needed
- Whole-suite vitest run after this plan: 1377 passed, 5 skipped, 12 failed (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) — all 12 failures are the pre-existing `getAllClassNames` interop-backend test drift documented in STATE.md's Blockers/Concerns (env drift since 2026-09-03, todo filed, unrelated to this plan); zero regressions introduced
- DISC-06 remains open — closes when plan 88-03 (tri-state model, compose-new codegen, edit-in-place) lands
- No other blockers

## Self-Check: PASSED

All 5 modified files verified present on disk; all 3 task commit hashes (`647ca6bf`,
`04095c1d`, `769ed47d`) verified present in `git log --oneline --all`.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-07*
