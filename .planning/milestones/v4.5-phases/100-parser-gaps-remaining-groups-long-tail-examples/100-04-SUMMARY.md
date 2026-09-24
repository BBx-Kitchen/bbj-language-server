---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
plan: 04
subsystem: parser
tags: [langium, grammar, bbj, chevrotain, line-break-validation, long-tail]

requires:
  - phase: 100-03
    provides: the oracle-sweep group's conformance record and the shared parser-keyword-statements.test.ts structure this plan extends with its own describe blocks
provides:
  - "SETDRIVE fileid{,ERR=lineref} -- a verb with no grammar rule at all -- now parses, inheriting ID category automatically with no token-builder change"
  - "PROCESS_EVENTS and FULLTEXT's trailing option tails (TIM=/ERR=, MODE=/ERR=) widened from a fixed order to an order-independent alternation over the existing shared fragments, spaced or unspaced"
  - "The line-break validator's 'before' check now tolerates a leading user line number on the same line as FIELD/METHOD/CLASSEND/INTERFACEEND/a class or interface header"
  - "The line-break validator's comment-tail check now accepts a bare 'rem' with nothing after it (no body, no trailing space), not just 'rem <body>'"
  - "InterfaceDecl's member loop widened with the same leading NUMBER? tolerance ClassDecl already had, fixing a genuine parser error on a same-line number before INTERFACEEND"
  - "CLEAR/BEGIN's plain-variable-list widening tried, found to regress adjacent unrelated statements, and reverted -- recorded as needing lexer work, with a permanent regression test pinning the reverted shape"
  - "100-CONFORMANCE.md's plan 04 measurement and the phase's shape-level residue table (four filled rows, two pending a per-file look)"
affects: [100-05, 100-06]

actuals:
  tokens: 8121
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Order-independent option tail as an explicit two-branch alternation over the SAME existing shared fragments (Mode Err? | Err Mode?), not a new fragment or the grammar's & unordered-group operator -- mirrors the file's own established option-fragment reuse convention"
    - "Gate-then-revert discipline extended to a grammar ambiguity risk that only a probe surfaces: widen, probe an adjacent unrelated statement for silent absorption, revert on any regression, record the mechanism the safe version would need instead of building it"

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/statement-option-tails.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - bbj-vscode/test/test-data/conformance/line-numbered-class.bbj
    - bbj-vscode/test/test-data/conformance/rem-after-block-boundaries.bbj
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md

key-decisions:
  - "Every long-tail candidate got both a compiler verdict and a current-parser verdict before any edit, via a companion bbjcpl scratch-file probe and a parseHelper probe: SETDRIVE (no rule, fixed), PROCESS_EVENTS/FULLTEXT option order (grammar-order-fixed, compiler-order-independent, fixed), the unspaced input@() form (a genuine lexer collision with the ID terminal's own optional trailing @, recorded), bare-number branch targets (already established needing a new addressing mechanism, recorded without attempting), and a file-qualified static call (already parsing, no fixture line added since it did not cost only one line in a file already being written)."
  - "SetDriveStatement reuses the shared Err fragment verbatim and introduces no new option syntax; it inherits ID category from the generic uppercase-keyword loop automatically (SETDRIVE is not lowercase-declared, not in EXCLUDED, not a custom-pattern token), so bbj-token-builder.ts and bbj-lexer.ts needed no change -- confirmed by git status on both files after every commit."
  - "PROCESS_EVENTS/FULLTEXT widened to '(Tim Err? | Err Tim?)?' / '(Mode Err? | Err Mode?)?' -- an explicit two-branch alternation over the existing fragments, not the grammar's '&' unordered-group operator (unused anywhere else in this file) and not a new fragment. No new langium:generate ambiguity warning against plan 03's baseline."
  - "Orchestrator addition B (CLEAR x![]) was tried and reverted: widening BeginStatement's optional tail to also accept a bare comma-separated variable list let a BARE CLEAR/BEGIN silently swallow the very next, unrelated statement's first expression when only a line break (no comma) separated them -- confirmed by probe ('begin\\nx=1\\nprint x' lost x's declaration, produced two false 'could not resolve' errors). Safely disambiguating needs a same-line-only lexer token (the RESTORE_NO_NL/TABLE_DATA technique); recorded, not fixed, with a permanent regression test pinning both the reverted shape and the near-miss it would have caused."
  - "Orchestrator addition A (bare 'rem' with nothing after it) fixed by widening the comment-tail group in the shared lineEndRegex to make the separator+body sub-group itself optional -- an identifier merely starting with 'rem' (remx=1) still fails to match, confirmed both by construction (no way to reach the trailing $ anchor) and by a permanent test."
  - "Orchestrator addition C (a same-line leading line number before a class-boundary keyword) is fixed for FIELD/METHOD-header/CLASSEND/INTERFACEEND (a contained lineStartRegex widening) and for INTERFACEEND's own parser error (a small InterfaceDecl grammar widening mirroring ClassDecl's own shipped Plan 02 pattern) -- but a leading number sharing a line with the class/interface HEADER itself, or with METHODEND inside a method body, is a separate, more general, pre-existing gap: the leading number becomes its own NumberLiteral statement there (not a bare token inside a strict member-loop), and the SAME false diagnostic already affects an ordinary line-numbered statement with no class construct involved at all (confirmed by probe: '10 print 1' trips the identical pair of false diagnostics). Fixing that well needs a general exemption from the statement-separation check, not a contained mask edit -- recorded, not fixed, with a permanent regression test documenting the residual diagnostic."
  - "This triage found ONE new root cause beyond the plan's own candidate list: a number in scientific/exponent notation (1.0e-2) parses fine as a bare top-level PRINT item but fails hard as a function-call argument, because the NUMBER terminal has no exponent suffix in its pattern at all -- the bare top-level case is tolerated only by unrelated leniency, not genuine support. Confirmed by probe to be the shared cause behind three of the nine remaining list-A files (two PRINT entries and one ASSERT-named-variable entry the phase context's own research had separately flagged as 'researcher to establish'). Recorded as valid but disproportionate to fix now -- the NUMBER terminal is a wide-blast-radius lexer change well beyond this plan's remaining scope, not the small, local grammar change D-10 asks a cheap fix to be."

patterns-established:
  - "A same-session compiler-plus-parser probe pair for every long-tail candidate, decided against D-10's own rule (compiler-accepts AND small-local-change to fix; compiler-rejects is not a gap; needs-lexer-work is recorded) before any grammar edit lands"
  - "A widening tried and reverted mid-task, pinned by a permanent regression test naming both the reverted shape and the specific near-miss the probe caught, rather than silently dropping the attempt"

requirements-completed: []

coverage:
  - id: D1
    description: "Every long-tail candidate has a recorded compiler verdict, current-parser verdict, and fixed-or-recorded decision; SETDRIVE (no rule at all) travels end-to-end from fixture text through the regenerated parser to a green conformance assertion; bare-number branch targets are recorded without attempting a fix"
    requirement: PARSE-09
    verification:
      - kind: unit
        ref: "bbj-vscode/test/conformance-regressions.test.ts#Every fixture in test-data/conformance parses and validates clean"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#the long-tail triage: a verb with no rule at all, and two order-fixed option tails"
        status: pass
    human_judgment: false
  - id: D2
    description: "PROCESS_EVENTS and FULLTEXT parse with their option tail in either written order, with a single option, with no tail at all, and unspaced; each still rejects a dangling/malformed option; identifier-adjacency cases for every verb touched stay clean"
    requirement: PARSE-09
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#the long-tail triage: a verb with no rule at all, and two order-fixed option tails"
        status: pass
    human_judgment: false
  - id: D3
    description: "The orchestrator's three folded-in shapes: a bare comment word after a block boundary validates clean (required, closes the A2 rise plan 02 left open); a same-line leading line number before FIELD/METHOD/CLASSEND/INTERFACEEND validates clean and InterfaceDecl's matching parser error is fixed; CLEAR/BEGIN's plain-variable-list widening was tried, found unsafe, and reverted with a permanent guardrail test"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#a bare comment word with nothing after it, right after a block boundary"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#a same-line leading line number before a class-boundary keyword validates clean"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#CLEAR/BEGIN with a plain variable list is a recorded, not a fixed, gap"
        status: pass
    human_judgment: false
  - id: D4
    description: "The harness ran twice back to back against the finished tree with a snapshot taken first, reporting identical counts both times; the shape-level residue table is written with four filled rows and two rows pending a per-file look, no cause guessed for the pending rows, and the per-file mapping explicitly handed to the orchestrator"
    verification:
      - kind: other
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls (A 13->9, A2 27->22, both at/below the phase-final gates; B unchanged at 669; two consecutive runs reported identical counts)"
        status: pass
    human_judgment: false

duration: 39min
completed: 2026-09-21
status: complete
---

# Phase 100 Plan 04: The Long-Tail Triage Summary

**SETDRIVE gained its first-ever grammar rule, PROCESS_EVENTS/FULLTEXT's option tails became order-independent, a same-line leading line number and a bare trailing comment now validate clean at every class boundary that can support it, and a CLEAR/BEGIN widening was tried, found unsafe, and reverted — closing list A to 9 files (well past the phase-final gate) and A2 to 22 (already at the phase's own gate), with a four-row shape-level residue table for what remains.**

## Performance

- **Duration:** 39 min
- **Started:** 2026-09-21T22:00:48Z (approx, end of plan 03/orchestrator hand-off)
- **Completed:** 2026-09-21T22:40:14Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `SETDRIVE fileid{,ERR=lineref}` — a verb with no grammar rule at all, previously silently splitting into two unrelated expression statements — now has a small statement rule reusing the shared `Err` fragment, registered in the single-statement alternation, and inheriting `ID` category automatically (no `bbj-token-builder.ts`/`bbj-lexer.ts` change).
- `PROCESS_EVENTS` and `FULLTEXT`'s trailing option tails widened from a grammar-fixed order to an order-independent alternation over the same existing `Mode`/`Err`/`Tim` fragments — the compiler already accepted either written order and no spaces around the separators; the grammar previously fixed one order only.
- The line-break validator's shared regexes fixed two false alarms at once: a leading user line number sharing a line with `FIELD`/`METHOD`/`CLASSEND`/`INTERFACEEND`/a class or interface header no longer draws a false "needs to start in a new line" diagnostic, and a bare `rem` with nothing after it (no body, no trailing space) after any block boundary no longer draws a false "needs to end with a line break" diagnostic — closing the exact A2 rise (`classend; rem`) plan 02 left open, required by this plan's own orchestrator addition.
- `InterfaceDecl`'s member loop gained the identical leading-`NUMBER?` tolerance `ClassDecl` already had (Plan 02), fixing a genuine parser error on a same-line number before `INTERFACEEND`.
- Tried and reverted widening `CLEAR`/`BEGIN` (the shared `BeginStatement` rule) to also accept a plain variable list: the compiler accepts `clear x`, `clear x$,y`, `clear x![]`, but a bare `CLEAR`/`BEGIN` immediately followed by an unrelated statement on the next line silently absorbed that statement's first expression instead of leaving it alone — confirmed by probe, reverted, recorded as needing a same-line-only lexer token, and pinned by a permanent regression test.
- This triage's own probing found a new root cause beyond the plan's assigned candidate list: a number in scientific/exponent notation (`1.0e-2`) parses fine standalone but fails hard as a function-call argument, because the `NUMBER` terminal has no exponent suffix at all — traced to 3 of the remaining 9 list-A files, including the "assert as a variable next to a number in exponent form" shape the phase's own research had flagged as unresolved.
- `100-CONFORMANCE.md`'s plan 04 section: A 13 → 9 (−4, well past the ≤25 phase-final gate), A2 27 → 22 (−5, at/below the Phase 99 close and its own ≤23 gate), B 669 (unchanged). 0 files moved the wrong way. The shape-level residue table has 4 filled rows (7 of 9 files) and 2 pending rows (2 files), handed to the orchestrator.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "a verb that had no rule now parses with its option tail" — one verb, then the triage of the rest** - `e11a90a6` (feat)
2. **Task 2: The remaining cheap shapes and the group's permanent tests** - `a16c356c` (feat)
3. **Task 3: Measure, write the shape-level residue skeleton, and hand the per-file mapping over** - `f1c73f9b` (docs)

_Phase base commit (taken before this plan's first commit): `ef766f60` (the tree as committed through plan 03's STATE.md/ROADMAP.md update)._

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` — Added `SetDriveStatement`; widened `ProcessEvent`/`FulltextStatement`'s option tails to order-independent alternations; widened `InterfaceDecl`'s member loop with the leading `NUMBER?` tolerance; tried and reverted a `BeginStatement` variable-list widening (reverted, with the attempt-and-revert reasoning left as a comment)
- `bbj-vscode/src/language/validations/line-break-validation.ts` — `lineStartRegex` tolerates a leading user line number; `lineEndRegex` accepts a bare `rem` with nothing after it
- `bbj-vscode/test/test-data/conformance/statement-option-tails.bbj` — New fixture: SETDRIVE, PROCESS_EVENTS, FULLTEXT and CLEAR/BEGIN(EXCEPT) shapes
- `bbj-vscode/test/test-data/conformance/rem-after-block-boundaries.bbj` — Extended with bare-comment-word cases
- `bbj-vscode/test/test-data/conformance/line-numbered-class.bbj` — Extended with a same-line-number class and interface
- `bbj-vscode/test/parser-keyword-statements.test.ts` — Four new describe blocks: the long-tail triage group, same-line line numbers, bare comment words, and the reverted CLEAR/BEGIN widening's guardrail tests
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` — New "Run: plan 04" measurement section and the "Residue: shapes still on list A" table

## Decisions Made

See `key-decisions` in the frontmatter for the full, precise record. In prose: every candidate got a compiler-plus-parser probe before any edit; the two option-tail widenings and the new statement rule reused existing shared fragments with no new option syntax; the CLEAR/BEGIN widening was tried, found to silently corrupt an adjacent unrelated statement, and reverted rather than shipped with a known regression risk; the line-break-validation fixes were scoped to what the evidence actually showed was contained (five same-line-number shapes, the bare-comment-word shape) and NOT extended to the two shapes that turned out to be a separate, more general, pre-existing gap (a class/interface header or a method-body METHODEND sharing a line with its own leading number); and the exponent-notation discovery was recorded rather than attempted, since fixing the `NUMBER` terminal is a wide-blast-radius lexer change outside this plan's scope.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1-3 auto-fix was needed beyond what the plan's own tasks already called for.

### Plan-Anticipated Contingencies (not Rule 1-4 deviations — explicitly provided for by the plan's own instructions)

**1. CLEAR/BEGIN's plain-variable-list widening tried and reverted**

- **Found during:** Implementing orchestrator addition B
- **Issue:** Widening `BeginStatement` to accept a bare comma-separated variable list (in addition to the existing bare and `EXCEPT` forms) let a bare `CLEAR`/`BEGIN` statement immediately followed by an unrelated statement on the next line (only a line break between them, no comma) silently swallow that next statement's first expression as its own variable list — confirmed by probe (`begin\nx=1\nprint x` lost `x`'s declaration and produced two false "could not resolve" errors).
- **Resolution:** Reverted the widening; `BeginStatement` is back to its original bare-or-`EXCEPT` shape. Recorded in `100-CONFORMANCE.md`'s residue table's neighboring discussion and pinned by a permanent regression test (`CLEAR/BEGIN with a plain variable list is a recorded, not a fixed, gap`) proving both the reverted shape and the specific near-miss the probe caught.
- **Files modified:** `bbj-vscode/src/language/bbj.langium` (added then reverted within the same task, landed as a no-op net change plus an explanatory comment)
- **Committed in:** `a16c356c` (Task 2 commit — the revert is part of the same commit as the attempt, since it never landed on its own)

**2. A same-line leading line number before a class/interface HEADER, or before METHODEND inside a method body, is a separate, wider, pre-existing gap — not folded into the "contained" fix**

- **Found during:** Implementing orchestrator addition C
- **Issue:** The orchestrator's own instruction allowed fixing addition C "if it is a contained change to those masks." Five of the seven named shapes (field, method-header, classend, interfaceend, and INTERFACEEND's own parser error) are fixed by a contained `lineStartRegex`/grammar change. The remaining two (a number sharing a line with the class/interface header itself, and a number sharing a line with METHODEND inside a method body) are a genuinely different, more general defect: the leading number becomes its own separate `NumberLiteral` statement there, and the exact same false-diagnostic pair already affects an ORDINARY line-numbered statement with no class construct at all (`10 print 1`, confirmed by probe) — this predates the phase and is not scoped to class boundaries.
- **Resolution:** Left unfixed by design, per the orchestrator's own "if it is not contained, record it with evidence and leave it" instruction. Recorded in this plan's `key-decisions` and pinned by two permanent regression tests documenting the residual diagnostic on the leading-number statement itself.
- **Files modified:** none beyond the contained cases already fixed.
- **Committed in:** `a16c356c` (Task 2 commit, as test evidence)

---

**Total deviations:** 2 plan-anticipated contingencies (tried-and-reverted / found-not-contained-and-left), both explicitly provided for by the plan's and orchestrator's own instructions. No Rule 1-4 auto-fixes beyond the plan's own scope.
**Impact on plan:** No scope creep. Both contingencies followed the plan's own explicit "revert and record" / "fix if contained, else record" instructions to the letter, and both are pinned by permanent regression tests so a future re-attempt at either shape trips the same evidence.

## Issues Encountered

`vitest`'s known `beforeAll` hook-timeout flake under contention (documented project memory) recurred twice during blast-radius runs; every flaky file was re-run in isolation (and the full blast-radius set was re-run with `--maxWorkers=2`) and passed, confirmed not a real regression each time. The whole-suite run (`--maxWorkers=2`, `RUN_BBJ_TESTS=0`) reported 3 pre-existing failures in `linking.test.ts` ("Could not resolve reference to NamedElement named 'BBjAPI'"), unrelated to anything this plan touched — java-interop/BBjAPI resolution environment drift, matching the class of pre-existing failure this project's own memory already documents for that file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `statement-option-tails.bbj`, `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj` and this plan's four `parser-keyword-statements.test.ts` describe blocks are in place for plan 05 (examples cleanup) to build on if needed; plan 05 does not touch grammar or this test file per the phase's own artifact table.
- `100-CONFORMANCE.md` carries plans 01-04's sections; plan 06 closes it with the final gate table and re-measures after any code-review fixes.
- **0 files moved the wrong way this run** — nothing handed to the orchestrator for a per-file look on the set-movement side.
- **2 residue rows are pending a per-file look** (1 file each: an empty-source-line entry flagged with an unexpected `:`, and a `METHOD` declaration whose isolated signature shape already parses cleanly, meaning the real cause is elsewhere in that file) — handed to the orchestrator, per this plan's and phase's own working rule; no cause guessed for either.
- `PARSE-09` is NOT marked complete in `REQUIREMENTS.md` — it is also declared by `100-06`, the phase's closing plan, which has not run yet (project-specific working rule #6).

---
*Phase: 100-parser-gaps-remaining-groups-long-tail-examples*
*Completed: 2026-09-21*

## Self-Check: PASSED

All key files confirmed present on disk (`bbj-vscode/src/language/bbj.langium`, `bbj-vscode/src/language/validations/line-break-validation.ts`, `bbj-vscode/test/test-data/conformance/statement-option-tails.bbj`, `bbj-vscode/test/test-data/conformance/line-numbered-class.bbj`, `bbj-vscode/test/test-data/conformance/rem-after-block-boundaries.bbj`, `bbj-vscode/test/parser-keyword-statements.test.ts`, `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md`). All three task commit hashes (`e11a90a6`, `a16c356c`, `f1c73f9b`) confirmed present in `git log --oneline --all`.
