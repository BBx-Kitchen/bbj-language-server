---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 14
subsystem: language-server
tags: [setopts, langium, cst-anchoring, edit-in-place, decodeInCode, traceOptsChain]
requires:
  - phase: 88 (plans 88-01 through 88-13)
    provides: the SETOPTS-in-code hover/decode scanner (traceOptsChain, detectSetOptsShape), the
      decodeInCode/composeTriState LSP handlers, and both IDE hosts' guarded writers
provides: a statement-anchored, fail-closed chain edit-in-place region computation in
  decodeInCode, plus the scanner's linkStatementNodes field it depends on
affects: [88-setopts-in-code-hovers-tri-state-composer]
actuals:
  tokens: 7313
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "CST-range-anchored region computation instead of line-number arithmetic derived from
      neighboring statements"
    - "fail-closed representability gate layered on top of an already-safe decode verdict,
      named separately from the decode verdict's own reason vocabulary"
key-files:
  created: []
  modified:
    - bbj-vscode/src/language/setopts-code-scanner.ts
    - bbj-vscode/src/language/setopts-in-code-request.ts
    - bbj-vscode/test/setopts-in-code-request.test.ts
key-decisions:
  - "traceOptsChain/walkChain now also collect linkStatementsNewestFirst (the enclosing statement
    of each chain link), exposed on the safe-chain result as linkStatementNodes -- a sibling field
    on the chain shape, not a member of SetOptsChainLink, so setopts-code-scanner.test.ts's
    document-identity-sensitive toEqual comparisons on links stay unaffected"
  - "The new SetOptsNotEditableReason ('shared-line') lives in setopts-in-code-request.ts, not in
    SetOptsUnsafeReason/UNSAFE_REASON_TEXT -- it is never a decode verdict, and
    setopts-code-scanner.test.ts's exhaustiveness test ties UNSAFE_REASON_TEXT's key count to the
    reasons traceOptsChain itself emits, so a member traceOptsChain never emits would be both
    wrong and untestable there"
  - "Region ownership is proven by residue subtraction: the region's document text minus each link
    statement's own [offset, offset+length) span must be whitespace/';' only -- this is what
    catches an unrelated statement, a comma-joined sibling assignment, or an interleaved REM
    comment sharing a reassignment's line, without needing a second AST walk"
  - "Each link's enclosing statement must be a single-assignment LetStatement -- a comma-joined
    LET A$=IOR(A$,$08$),B$=\"x\" is a single statement the scanner legitimately calls safe, but its
    whole text cannot be replaced without destroying the sibling assignment"
requirements-completed: [DISC-05, DISC-06]
coverage:
  - id: D1
    description: "A safe chain whose reassignment shares a physical line with SETOPTS via ';'
      returns found:true, mode:'chain', editable:false, a non-empty reason, and no chain/initial
      payload -- never an empty [1,1) replace range with editable:true"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts#a safe chain whose reassignment
          shares a physical line with SETOPTS closes the edit gate (decode verdict unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The degenerate all-on-one-line chain (origin and SETOPTS share a line, zero
      reassignments) never returns a chain whose startLine exceeds its endLine"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts#a degenerate chain with origin and
          SETOPTS on one physical line closes the edit gate, never an inverted range"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every editable:true chain region's half-open [startLine, endLine) contains
      nothing but the chain's own reassignment statements, whitespace and ';' separators --
      origin, SETOPTS, unrelated statements and REM comments always fall outside it"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts (unrelated-statement,
          comma-joined, LET-prefixed, comment-before/-between, blank-line test group)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The canonical multi-line chain still returns editable:true with startLine equal
      to the first reassignment's own line and endLine equal to the last reassignment's own last
      line plus one"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts#a safe OPTS->IOR/AND->SETOPTS chain
          returns found/editable/mode \"chain\" with the reassignment range, indent and prefill
          selection"
        status: pass
    human_judgment: false
  - id: D5
    description: "Hover decode for every safe: true chain (including the line-sharing shapes this
      plan's edit gate now closes) still renders its accumulated Sets/Clears -- closing the edit
      gate never downgrades the hover"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts (decode-verdict assertions inside
          the shared-line and comma-joined tests) and bbj-vscode/test/setopts-code-scanner.test.ts
          (unmodified, still passing)"
        status: pass
    human_judgment: false
duration: 30min
completed: 2026-09-11
status: complete
---

# Phase 88 Plan 14: Chain Edit-In-Place CST-Anchored Region (Round-Four Gap Closure) Summary

**`decodeInCode`'s chain edit region is now anchored on the reassignment statements' own CST ranges instead of origin/SETOPTS line arithmetic, and fails closed with a named `shared-line` reason on every shape whose region cannot be expressed as a whole-line replace the chain owns outright.**

## Performance

- Duration: ~30 min
- Started / Completed: 2026-09-11
- Tasks: 3 (all completed)
- Files modified: 3

## Accomplishments

- Traced and fixed the exact defect the phase's round-four gap-closure review flagged: for a safe
  chain (per `traceOptsChain`'s own `safe: true` verdict) whose reassignment shares a physical
  line with the `SETOPTS` statement via `;`, the old `originLine + 1` through `setoptsLine`
  arithmetic produced an **empty** `[1,1)` replace range while still reporting `editable: true` —
  both writers (VS Code's `setopts-tristate-webview.ts`, IntelliJ's `ComposerLauncher.java`) would
  insert the newly composed lines into that empty gap and leave the original reassignment in
  place, silently corrupting the program's effective options vector. The degenerate
  all-on-one-line variant produced an **inverted** range instead (`startLine > endLine`).
- Widened `setopts-code-scanner.ts`'s `traceOptsChain`/`walkChain` to also collect each chain
  link's enclosing statement (`linkStatementNodes`, positionally paired with `links`), with zero
  change to the scanner's own safe/unsafe decode verdict — `setopts-code-scanner.test.ts` is
  unmodified and still passes in full, proving the decode side is untouched.
- Replaced `setopts-in-code-request.ts`'s chain-branch region computation with one anchored on the
  link statements' own CST ranges: `startLine` is the minimum reassignment statement's own start
  line, `endLine` is the maximum reassignment statement's own last line plus one (or both equal to
  the `SETOPTS` line for a zero-reassignment chain). The region is accepted only when every link
  statement is a single-assignment `LetStatement`, the origin ends strictly before the region, the
  region ends at or before the `SETOPTS` line, and the region's residue (its text minus the link
  statements' own spans) is whitespace/`;` only. Any failure returns a new
  `SetOptsNotEditableReason` (`'shared-line'`) with no `chain`/`initial` payload — the same
  disposition the existing unsafe-chain branch already used, so both clients' existing `editable`
  gate hides the edit action with zero client-side changes.
- Added a structural `startLine > endLine` backstop (returns not-found) as a defensive guard
  against any future regression reintroducing an inverted range.
- Pinned the full line-sharing/line-owning matrix at the edit-range layer: an unrelated statement
  sharing a reassignment's line, all three statements on one line, a comma-joined reassignment
  (scanner still calls it safe — the refusal is the edit gate's), a `LET`-prefixed single
  reassignment (proves statement-anchoring, not assignment-anchoring), a comment before the first
  reassignment (preserved, outside the region) vs. a comment between two reassignments (closes the
  gate rather than silently deleting it), and a blank line between reassignments (stays editable).
- `npm run build`, `npm run lint`, the seven-file Phase 88 targeted suite (235 passed, 1 skipped),
  and the whole suite (`--maxWorkers=2`: 1513 passed, 12 failed — all in `test/linking.test.ts`
  and `test/issue447-real-interop.test.ts`, the documented pre-existing java-interop baseline) all
  pass with no regression.
- Marked DISC-05 and DISC-06 complete in REQUIREMENTS.md (this plan's frontmatter requirements),
  since this round-four gap closure was the last outstanding correctness item blocking their
  closure.

## Task Commits

1. Task 1 (RED): `f7c1d204` — `test(88-14): add failing tests for chain edit-gate shared-line fail-closed verdict`
2. Task 1 (GREEN): `f2e3ed77` — `feat(88-14): anchor chain edit region on reassignment statements, fail-closed on shared lines`
3. Task 2: `3fb6be1b` — `test(88-14): pin the full line-sharing chain matrix at the edit-range layer`

Task 3 (build/lint/whole-suite verification) introduced no additional source changes — the three
files above are the plan's complete change set, already committed by Tasks 1-2.

## Files Created/Modified

- `bbj-vscode/src/language/setopts-code-scanner.ts` — `SetOptsCodeShape`'s `chain` variant and
  `ChainWalkResult` gain `linkStatementNodes`/`linkStatementsNewestFirst`; `walkChain` collects the
  enclosing statement alongside each link; `traceOptsChain` reverses and forwards it on the
  safe-chain result only. Decode verdict logic (`matchStatement`, `matchAssignment`,
  `SetOptsUnsafeReason`, `UNSAFE_REASON_TEXT`, `foldChainEffect`, `chainHoverMarkdown`) is
  byte-identical.
- `bbj-vscode/src/language/setopts-in-code-request.ts` — new `SetOptsNotEditableReason`/
  `NOT_EDITABLE_REASON_TEXT`; new `lastLineOf`/`regionOwnedExclusively` helpers; the chain branch's
  region computation replaced with the statement-anchored, fail-closed logic described above;
  header and `SetOptsInCodeChainEdit` field doc comments restated in statement-anchored terms.
- `bbj-vscode/test/setopts-in-code-request.test.ts` — 10 new tests covering the shared-line chain,
  the degenerate all-on-one-line chain, the full line-sharing/line-owning matrix (unrelated
  statement, all-one-line, comma-joined, `LET`-prefixed, comment before/between reassignments,
  blank line), and the scanner's `linkStatementNodes` contract.

## Decisions Made

- `linkStatementNodes` is a sibling field on the `chain` shape, not a member of
  `SetOptsChainLink` — `setopts-code-scanner.test.ts`'s bounded-walk regression compares `links`
  arrays with `toEqual`, and an AST node on a link would make that comparison
  document-identity-sensitive.
- The new not-editable reason lives in `setopts-in-code-request.ts`, never in
  `SetOptsUnsafeReason`/`UNSAFE_REASON_TEXT` — it is never a decode verdict, and the scanner's own
  exhaustiveness test ties that table's key count to the reasons `traceOptsChain` itself emits.
- Region ownership is proven by residue subtraction (region text minus each link statement's own
  CST span must be whitespace/`;` only) rather than a second AST walk over the region — this
  naturally catches an unrelated sibling statement, a comma-joined sibling assignment, or an
  interleaved `REM` comment sharing a reassignment's line.
- Each link's enclosing statement must be a single-assignment `LetStatement`; a comma-joined
  `LET A$=IOR(A$,$08$),B$="x"` is a single statement the scanner legitimately calls safe, but its
  whole text cannot be replaced without destroying `B$="x"`.

## Deviations from Plan

None — plan executed exactly as written. No client/writer file was touched
(`setopts-tristate-webview.ts`, `setopts-in-code-ui.ts`, `bbj-intellij/`), matching the plan's
scope boundary; both writers already refuse to construct an edit when `editable` is false.

## Issues Encountered

- The whole-suite vitest run flaked twice with an `initializeWorkspace` `beforeAll` hook timeout
  under default worker parallelism (a different suite each time — `test/hover.test.ts` then
  `test/setopts-code-scanner.test.ts`), consistent with the project's documented
  worker-contention pattern. Re-running with `--maxWorkers=2` (as Task 3's own verify commands
  specify) was stable and green across three separate targeted-suite runs.

## Known Stubs

None.

## Threat Flags

None — this plan touches no authentication, session, access-control, cryptography, serialization
or network boundary; the applicable threat (T-88-14-01, tampering via a wrong whole-line replace
region) is exactly what this plan's fail-closed representability gate mitigates, per the plan's
own `<threat_model>`.

## Next Phase Readiness

All 14 plans of Phase 88 are now executed. Phase-level readiness is NOT yet complete: per
`.planning/STATE.md`'s `stopped_at` (recorded at 88-13), two live-IDE gaps
(G-88-2 IntelliJ Alt+Enter/context-menu reachability, G-88-3 live mask-width falsification against
a real BBjServices run) remain `status:failed` pending human retest — no automated task in this
devcontainer can close them, and this plan's own `<verification>` explicitly stages both as
out-of-round human verification. The next step is the staged human retest in `88-LIVE-RETEST.md`
round two, followed by phase-level UAT/closeout.

## Self-Check: PASSED

- FOUND: `bbj-vscode/src/language/setopts-code-scanner.ts`
- FOUND: `bbj-vscode/src/language/setopts-in-code-request.ts`
- FOUND: `bbj-vscode/test/setopts-in-code-request.test.ts`
- FOUND commit `f7c1d204` (test RED)
- FOUND commit `f2e3ed77` (feat GREEN)
- FOUND commit `3fb6be1b` (test matrix)
