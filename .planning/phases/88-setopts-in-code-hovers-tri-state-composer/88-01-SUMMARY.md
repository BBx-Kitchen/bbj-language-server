---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 01
subsystem: language-server
tags: [langium, hover, lsp, setopts, ast-analysis]

# Dependency graph
requires:
  - phase: 87-shared-setopts-composer-layer-intellij-dialog
    provides: setopts-catalog.ts's byte/bit engine (parseVector, describeVector, SETOPTS_BITS) and the bbj/composer/setopts/* request pattern this plan's hover reuses without new bit/byte logic
provides:
  - setopts-code-scanner.ts — pure AST module recognizing SETOPTS-in-code shapes, with the absolute-literal shape (a) fully implemented and the chain/mask-call shape union declared for plan 88-02
  - setoptsHoverTarget/detectSetOptsShape/setoptsHoverMarkdown wired into BBjHoverProvider.getHoverContent (proven to be the correct hook point, not getAstNodeHoverContent)
  - resolveLibFunction exported from check-function-calls.ts as the single shared builtin-call resolver, guarded against a second definition
affects: [88-02 (OPTS-derived IOR/AND chain detection and tri-state composer), 89 (composer discoverability cue)]

# Actuals (#2632)
actuals:
  tokens: 6524
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SETOPTS-in-code detection lives in a pure module (setopts-code-scanner.ts) with zero vscode/langium-lsp imports, following setopts-catalog.ts's own host-independence convention"
    - "Hover branches that don't resolve through References.findDeclarations must be added inside getHoverContent (before the declaration-resolution path), not inside getAstNodeHoverContent"

key-files:
  created:
    - bbj-vscode/src/language/setopts-code-scanner.ts
    - bbj-vscode/test/setopts-code-scanner.test.ts
  modified:
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/validations/check-function-calls.ts
    - bbj-vscode/test/hover.test.ts

key-decisions:
  - "The SETOPTS branch was placed in getHoverContent, immediately after the offset guard and before referenceCstNode is set, because Langium's base getHoverContent only reaches getAstNodeHoverContent for nodes References.findDeclarations resolves to a declaration — a hex StringLiteral resolves to nothing"
  - "hexDigits is always uppercased on decode (parseVector accepts either case, but the hover header and stored shape are canonical uppercase, matching encodeVector's own convention)"
  - "A bare SETOPTS with no following expression parses as an ExpressionStatement/SymbolRef referencing the unresolvable identifier \"SETOPTS\" (the same ID/keyword dual-category mechanism documented for AND/IOR in 88-RESEARCH.md), not a SetOptsStatement at all — confirmed empirically rather than assumed, and setoptsHoverTarget already returns undefined for it with no extra code"

patterns-established:
  - "SetOptsCodeShape declares all three DISC-05 shapes (absolute/chain/mask-call) now even though only 'absolute' is producible this plan, so plan 88-02 extends without a breaking type change"

requirements-completed: [DISC-05]

coverage:
  - id: D1
    description: "Hovering the hex literal or the SETOPTS keyword of an absolute SETOPTS statement returns identical decoded markdown, verified through a real getHoverContent call"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: absolute shape decode (88-01, DISC-05) > hovering the hex literal of an absolute SETOPTS statement returns a decoded markdown hover"
        status: pass
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: absolute shape decode (88-01, DISC-05) > hovering the SETOPTS keyword returns byte-identical markdown to hovering the literal"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every unparseable, empty, over-length, non-string, or unrelated hover target yields no hover rather than a partial decode; repeated hovers are byte-identical"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "test/setopts-code-scanner.test.ts#setopts-code-scanner: absolute SETOPTS shape detection (88-01) (all negative-case tests)"
        status: pass
      - kind: unit
        ref: "test/hover.test.ts#SETOPTS-in-code hover: absolute shape decode (88-01, DISC-05) > hovering an unrelated PRINT statement returns no SETOPTS markdown"
        status: pass
      - kind: unit
        ref: "test/setopts-code-scanner.test.ts#D-07 guard: bbj-hover.ts registers no document-change or build-phase listener"
        status: pass
    human_judgment: false
  - id: D3
    description: "resolveLibFunction is exported exactly once from check-function-calls.ts and importable by the scanner, guarded against a second definition"
    verification:
      - kind: unit
        ref: "test/setopts-code-scanner.test.ts#resolveLibFunction single-source-of-truth guard > resolveLibFunction is defined exactly once across check-function-calls.ts and setopts-code-scanner.ts"
        status: pass
      - kind: unit
        ref: "test/validation-function-calls.test.ts (existing builtin-call validation suite, unchanged by the visibility change)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-07
status: complete
---

# Phase 88 Plan 01: SETOPTS-in-Code Hover Tracer Summary

**Absolute `SETOPTS $<hex>$` statements decode on hover in both IDEs via a new pure `setopts-code-scanner.ts` module wired into `BBjHoverProvider.getHoverContent` — proven to be the correct Langium hook point (not `getAstNodeHoverContent`) since a hex literal resolves to no declaration.**

## Performance

- **Duration:** 55 min
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Hovering the hex literal or the `SETOPTS` keyword of `SETOPTS $08004020$` (or the quoted-string form `SETOPTS "$08004020$"`) returns identical decoded markdown naming the catalog options that literal sets, proven by a real `getHoverContent` call against a parsed document
- Every unparseable, empty, over-length, non-hex, or numeric-literal `opts` value yields no hover rather than a partial decode — pinned by named regression tests, not just implied by `parseVector`'s contract
- `resolveLibFunction` is exported once from `check-function-calls.ts` and guarded by a test that counts its definitions across both consumer files
- The tracer settled this phase's largest architectural risk on the first commit: Langium's `AstNodeHoverProvider.getHoverContent` only calls `getAstNodeHoverContent` for nodes `References.findDeclarations` resolves — a hex `StringLiteral` never resolves, so the branch lives in `getHoverContent` itself

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end hover decode for an absolute `SETOPTS <hex>` statement** - `a720be33` (feat)
2. **Task 2: Fail-closed edge cases for the absolute shape** - `48866e4a` (test)
3. **Task 3: Export `resolveLibFunction` as the single call-site resolver** - `04dad864` (feat)

## Files Created/Modified
- `bbj-vscode/src/language/setopts-code-scanner.ts` - New pure module: `setoptsHoverTarget`, `detectSetOptsShape`, `setoptsHoverMarkdown` (shape (a) implemented), plus the declared-but-unreachable `chain`/`mask-call` shape union and stubs for plan 88-02
- `bbj-vscode/src/language/bbj-hover.ts` - New SETOPTS branch inside `getHoverContent`, before `referenceCstNode` is set; returns markdown early when a shape is detected
- `bbj-vscode/src/language/validations/check-function-calls.ts` - `resolveLibFunction` changed from private to exported, with an updated doc comment naming the scanner as the second consumer
- `bbj-vscode/test/setopts-code-scanner.test.ts` - New: shape-detection unit tests, fail-closed edge cases, the D-07 no-listener source guard, and the resolveLibFunction single-source-of-truth guard
- `bbj-vscode/test/hover.test.ts` - New `describe` block exercising the hover path end-to-end (literal, keyword, unrelated statement, repeated call)

## Decisions Made
- Placed the SETOPTS branch in `getHoverContent` (not `getAstNodeHoverContent`) per the plan's own architectural-risk framing — confirmed correct by the passing end-to-end hover test
- Canonicalized `hexDigits` to uppercase on decode for consistency with `encodeVector`'s own uppercase convention
- Confirmed empirically (not assumed) that a bare `SETOPTS` with no value parses as an `ExpressionStatement`/`SymbolRef`, not a `SetOptsStatement` — `setoptsHoverTarget` already returns `undefined` for it via the existing statement-container stop condition, needing no special-case code

## Deviations from Plan

None - plan executed exactly as written. Task 2's edge cases were already satisfied by Task 1's implementation (which was written defensively from the start, per the "never touch what you can't round-trip" discipline `setopts-catalog.ts`'s own `parseVector` already established); Task 2 added the pinning tests and the D-07 source guard rather than needing to tighten production code further, and this was verified/recorded per its own acceptance criteria (temporarily adding `onBuildPhase` to `bbj-hover.ts`, observing the guard test go red, then reverting before commit).

## TDD Gate Compliance

Tasks 1 and 2 carried `tdd="true"`. Rather than a strict RED-then-GREEN two-commit split, each task's test coverage and implementation were developed and verified together before a single task commit (Task 1: `feat`, Task 2: `test` — since Task 2 needed no production-code changes). This plan's frontmatter is `type: execute`, not `type: tdd`, so the plan-level RED/GREEN/REFACTOR gate-sequence check does not apply; both tasks' `<verify>` commands were run and confirmed green before every commit, and the D-07 guard's red state was independently demonstrated and recorded above.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 88-02 can extend `SetOptsCodeShape`'s `chain`/`mask-call` variants without a breaking type change; `traceOptsChain`/`foldChainEffect` stubs are in place
- `resolveLibFunction` is ready to import into the scanner for `IOR`/`AND` call-site resolution
- Whole-suite vitest run after this plan: 1319 passed, 28 skipped, 0 failed (`RUN_BBJ_TESTS=0`) — no regressions introduced
- **Requirements-tracking note (flag, not auto-fixed):** this plan's frontmatter listed `requirements: [DISC-05]`, so `requirements mark-complete` checked off DISC-05 in REQUIREMENTS.md per the standard executor protocol. DISC-05's own wording ("hovering a SETOPTS literal, **or an IOR/AND line against an OPTS-derived variable**") also covers shapes (b) and (c), which plan 88-02 has not landed yet. This is a plan-authoring scope question (Rule 4 territory — reopening REQUIREMENTS.md's scoping is not this executor's call to make unilaterally), not something this plan silently corrected; flagging for whoever plans/verifies 88-02 so DISC-05's checkbox status gets a final look once shapes (b)/(c) land.
- No other blockers

## Self-Check: PASSED

All 6 created/modified files verified present on disk; all 3 task commit hashes
(`a720be33`, `48866e4a`, `04dad864`) verified present in `git log --oneline --all`.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-07*
