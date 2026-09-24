---
phase: 98-line-break-validation-false-alarms-a2
plan: 04
subsystem: parser/validation
tags: [langium, chevrotain, bbj, lexer, line-break-validation, vitest]

# Dependency graph
requires:
  - phase: 98-01
    provides: "conformance-regressions.test.ts harness and the test-data/conformance/ fixture convention"
  - phase: 98-02
    provides: "the RESTORE_NO_NL-style lexer pattern precedent and the shared line-break-validation.test.ts single-services structure"
provides:
  - "ifStatementLineBreaks and ifEndStatementLineBreaks backward walks widened to accept the single-line IF/FI shapes the compiler accepts (labelled single-line IF, nested double-FI)"
  - "ENDLINE_PRINT_COMMA lookahead tolerant of horizontal whitespace between the trailing comma and the line break/semicolon"
  - "line-break-single-line-if.test.ts — a new, file-disjoint test file with positive and still-flagged coverage"
  - "two new conformance fixtures: single-line-if-forms.bbj, print-trailing-comma.bbj"
  - "LEN=<number> residue cause recorded for Phase 100 (PARSE-08)"
affects: [98-05, 98-06]

actuals:
  tokens: 2226
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Backward-walk mask extension: add a same-line-shape check inside the existing while loop rather than introducing a new traversal mechanism — the loop's isSameLine(prev, node) guard (compared against the fixed target node, not the walking cursor) is what keeps arbitrarily-long same-line chains terminating, so widening a mask is a matter of adding another recognized stop condition, not changing the walk's shape."
    - "Whitespace-tolerant zero-width lookahead: widen a lexer token's trailing lookahead with a bounded character class (`[ \\t]*`) ahead of the existing alternation, keeping the matched token image unchanged, so no downstream CST offset shifts."

key-files:
  created:
    - bbj-vscode/test/line-break-single-line-if.test.ts
    - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj
    - bbj-vscode/test/test-data/conformance/print-trailing-comma.bbj
  modified:
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/src/language/bbj-token-builder.ts

key-decisions:
  - "ifStatementLineBreaks's backward walk clears 'needs a line break before' on a same-line label declaration and stops there — mirroring isStandaloneStatement's existing rule one function away — without ever clearing on a preceding end-of-IF statement, so the pre-existing 'FI shares a line with a following IF' negative stays flagged untouched."
  - "ifEndStatementLineBreaks's backward walk no longer stops (without clearing) the first time it meets a preceding end-of-IF statement on the same line; it now walks past it like any other same-line statement, so a nested single-line IF closed by two chained FI finds its own governing IF. No visited set or depth counter was needed — the existing isSameLine(prev, node) guard (compared against the fixed target, not the walking cursor) already keeps the walk monotonic and terminating, confirmed against the full line-break-walk-termination.test.ts suite unchanged."
  - "ENDLINE_PRINT_COMMA's root cause was the first candidate from 98-RESEARCH.md's Open Question 3: the lookahead required the comma to be immediately followed by `\\r?\\n` or `;`, with no tolerance for intervening horizontal whitespace, so a trailing comma followed by a space then a newline left the comma as an ordinary separator and the parser reached across the line break for another PRINT item. Fixed by widening the lookahead to `,(?=[ \\t]*(\\r?\\n|;))` — the matched token image stays the comma alone, so no grammar or downstream offset change was needed. The general PRINT/INPUT item grammar (bbj.langium) is untouched, confirmed by `git diff --stat` showing no change to that file."
  - "The LEN=<number> residue group (D-16/D-18) was probed and NOT fixed here, as instructed: `LEN=5` (no spaces) lexes as the fused 'LEN=' keyword literal from LastVerifyOption (`'LEN=' min=Expression ',' max=Expression`), which — like any other keyword literal not explicitly excluded — is CATEGORIES-assigned to the generic ID category in BBjTokenBuilder.buildTokens(). The parser then accepts that fused token wherever a plain identifier is expected, producing a SymbolRef whose name is literally the four characters 'LEN=' instead of the three-character identifier 'LEN', which strands the following '5' as its own unrelated top-level ExpressionStatement. This is a genuine wrong-AST bug (D-01 territory: a language word colliding with plain-identifier usage), not a line-break mask gap, and it is exactly the PARSE-08 territory D-04 assigns to Phase 100 — recorded as residue rather than fixed, per D-16/D-18. `LEN = 5` (with spaces around the `=`) is unaffected and already validates clean, since the fused literal only matches the exact unspaced text."
  - "The return-inside-a-single-line-IF form (`IF flag THEN RETURN 1 FI`) required no code change at all — it was already clean before this plan's changes. RETURN outside a DEF FN/method body parses via KeywordStatement's bare 'RETURN' alternative (not the DefReturn/MethodReturnStatement value-carrying forms), so 'RETURN' and the following '1' become two separate SingleStatements chained only by being on the same physical line, and the existing previousStatement/isSameLine machinery already walks back through both non-IfEndStatement intermediaries to find the governing IF. Kept as its own fixture/test case anyway, per the plan's action text, so any future regression of this already-correct behavior is caught."

requirements-completed: [VALID-04, VALID-02, CONF-01]

coverage:
  - id: D1
    description: "A labelled single-line IF whose branch is chained by a semicolon and jumps back to its own label (`mylabel: IF x THEN a = 1; GOTO mylabel`) produces zero line-break diagnostics"
    requirement: VALID-04
    verification:
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#Line break validation: single-line IF/FI forms the compiler accepts > labelled single-line IF with a semicolon-chained branch statement produces no line-break diagnostics"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "A nested single-line IF closed by two chained end-of-IF statements on one line (`if a then if b then c = 1 fi fi`) produces zero line-break diagnostics, and every pre-existing negative in line-break-walk-termination.test.ts (the FI/following-IF, ELSE-with-no-governing-IF, FI-with-no-governing-IF and NEXT-then-IF cases) stays flagged unchanged"
    requirement: VALID-04
    verification:
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#Line break validation: single-line IF/FI forms the compiler accepts > nested single-line IF closed by two chained end-of-IF statements produces no line-break diagnostics"
        status: pass
      - kind: unit
        ref: "test/line-break-walk-termination.test.ts (all 23 tests unchanged and passing)"
        status: pass
      - kind: unit
        ref: "test/line-break-walk-timeout.test.ts#backward walks cannot hang the process (#232)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The IF...THEN RETURN...FI form and a labelled single-line IF closed by an end-of-IF statement each produce zero line-break diagnostics (already-correct behavior, protected against regression)"
    requirement: VALID-04
    verification:
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#Line break validation: single-line IF/FI forms the compiler accepts (return and labelled-FI cases)"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D4
    description: "A PRINT item list ending in a trailing comma, followed by trailing whitespace (none, one space, two spaces, or a tab) and then a line starting a multi-line IF...THEN block, produces zero line-break diagnostics, without any change to the PRINT/INPUT item grammar"
    requirement: VALID-02
    verification:
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#Line break validation: single-line IF/FI forms the compiler accepts (four trailing-comma PRINT cases)"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D5
    description: "Two new conformance regression fixtures (single-line-if-forms.bbj, print-trailing-comma.bbj) protect these construct groups under the CONF-01 stricter assertion, and each touched mask/token keeps at least one still-flagged negative case in the new file"
    requirement: CONF-01
    verification:
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#Line break validation: single-line IF/FI forms that stay flagged (3 tests)"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-21
status: complete
---

# Phase 98 Plan 04: Single-Line IF/FI Backward-Walk Fixes and Trailing-Comma PRINT Summary

**Two same-line backward-walk masks in `line-break-validation.ts` (label-prefixed single-line IF, chained double-FI) and a whitespace-tolerant `ENDLINE_PRINT_COMMA` lexer lookahead eliminate the remaining single-line-IF and trailing-comma-PRINT false alarms, with the `LEN=<number>` group probed and handed to Phase 100 as residue rather than fixed.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-21T02:44:00Z (approx.)
- **Completed:** 2026-09-21T02:58:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `ifStatementLineBreaks`'s backward walk now clears the "needs a line break before" flag when it finds a same-line label declaration immediately preceding the IF, mirroring `isStandaloneStatement`'s existing rule for the same shape — eliminating the false alarm on `mylabel: IF x THEN a = 1; GOTO mylabel`.
- `ifEndStatementLineBreaks`'s backward walk now walks past a preceding end-of-IF statement on the same line instead of stopping there without clearing anything — eliminating the false alarm on a nested single-line IF closed by two chained FI (`if a then if b then c = 1 fi fi`).
- `ENDLINE_PRINT_COMMA`'s lexer lookahead now tolerates horizontal whitespace between the trailing comma and the line break or semicolon that ends a PRINT item list — eliminating the false alarm on a trailing-comma PRINT followed by trailing whitespace and then a multi-line `IF...THEN` block, in all four whitespace variants (none, one space, two spaces, tab).
- The `LEN=<number>` residue group was probed and its exact wrong-AST cause (a fused keyword-literal/plain-identifier collision) recorded and handed to Phase 100 (PARSE-08), per D-16/D-18 — not fixed here.
- New file-disjoint `line-break-single-line-if.test.ts` (11 tests: 8 positive, 3 still-flagged) and two new conformance fixtures protect all of the above; every pre-existing negative in `line-break-walk-termination.test.ts` (23 tests) stays flagged unchanged, and the out-of-process timeout guard still passes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Teach both backward walks the same-line shapes the compiler accepts** - `8a9d54fb` (feat)
2. **Task 2: Find and fix the cause of the trailing-comma PRINT symptom, and probe the LEN group** - `3fd4ce9f` (fix)
3. **Task 3: New test file, conformance fixtures, and the register check** - `16624d89` (test)

_No plan-metadata commit yet — this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `bbj-vscode/src/language/validations/line-break-validation.ts` - `ifStatementLineBreaks` gained a same-line label-declaration stop condition; `ifEndStatementLineBreaks` no longer stops (without clearing) at a preceding end-of-IF statement.
- `bbj-vscode/src/language/bbj-token-builder.ts` - `ENDLINE_PRINT_COMMA`'s pattern widened from `/,(?=(\r?\n|;))/` to `/,(?=[ \t]*(\r?\n|;))/`.
- `bbj-vscode/test/line-break-single-line-if.test.ts` - New file: two `describe` blocks, 8 positive cases (`test.each`) plus 3 still-flagged negatives.
- `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` - New fixture: labelled single-line IF + semicolon chain (3 case variants), nested double-FI (3 case variants), IF...THEN RETURN...FI (3 case variants), each in upper/lower/mixed case.
- `bbj-vscode/test/test-data/conformance/print-trailing-comma.bbj` - New fixture: trailing-comma PRINT with trailing whitespace, with none, and chained after a semicolon, each followed by a multi-line IF block.

## Decisions Made
See `key-decisions` in the frontmatter above for the full rationale on each of: the label-prefix walk fix, the chained-double-FI walk fix, the `ENDLINE_PRINT_COMMA` widening (confirmed as the first of 98-RESEARCH.md's two candidate causes — the token's own lookahead, not the line-break validator's `lineEndRegex`), the LEN= residue finding, and why the RETURN form needed no code change.

## Deviations from Plan

None - plan executed exactly as written. Both Task 1 fixes and the Task 2 lexer fix matched their starting hypotheses from 98-RESEARCH.md without narrowing. One out-of-scope, pre-existing quirk was discovered during probing (see below) and correctly left alone as it falls outside this plan's construct groups.

## Issues Encountered
- While probing whitespace variants of the trailing-comma PRINT shape (Task 2's action text explicitly calls for a semicolon variant too), a `print ...,;if x then\nb=1\nfi` shape (comma immediately followed by `;`, no intervening whitespace) surfaced a diagnostic — "needs to start in a new line: if x then". Isolated with a no-PRINT control case (`x = 1;if a then\nb = 1\nfi`) and confirmed this is a **pre-existing, unrelated quirk** in `ifStatementLineBreaks`'s `isCompoundStatement(container)` branch: when an IF is the *last* statement of a `;`-chain and the chain's own next top-level sibling is not on the same physical line, `lineBreaks.before` stays at its default `true`. This reproduces identically with no PRINT statement, no comma, and before any change made in this plan, so it is out of scope for VALID-04/VALID-02/CONF-01 as scoped here — not fixed, not part of any acceptance criterion, and outside this plan's construct groups (single-line IF/FI masks, trailing-comma PRINT). Not filed as a residue item since it concerns a fourth, unrelated construct (semicolon-then-multi-line-IF chains) not named anywhere in this phase's scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The single-line IF/FI groups (labelled + semicolon chain, nested double-FI, RETURN form, labelled + FI) and the trailing-comma PRINT group all validate clean with regression protection in place; no residue to hand off for these.
- `LEN=<number>` residue is fully diagnosed (fused-keyword-literal collision with plain-identifier usage) and ready for Phase 100's PARSE-08 work — the exact cause is in `key-decisions` above, no further probing needed.
- One unrelated, pre-existing quirk was found and documented (see Issues Encountered) but is out of this phase's scope; not filed as a blocker.
- No blockers for the next plan (98-05, the grammar plan running in the same wave — this plan stayed file-disjoint from it as required).

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/validations/line-break-validation.ts
- FOUND: bbj-vscode/src/language/bbj-token-builder.ts
- FOUND: bbj-vscode/test/line-break-single-line-if.test.ts
- FOUND: bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj
- FOUND: bbj-vscode/test/test-data/conformance/print-trailing-comma.bbj
- FOUND commit: 8a9d54fb (feat(98-04): teach both backward walks the same-line shapes the compiler accepts)
- FOUND commit: 3fd4ce9f (fix(98-04): tolerate trailing whitespace in the end-of-line PRINT comma token)
- FOUND commit: 16624d89 (test(98-04): cover single-line IF/FI forms and trailing-comma PRINT)
- Re-ran plan `<verification>` block 1 (targeted set, run individually per-file due to documented beforeAll contention): all files pass, 0 failures.
- Re-ran plan `<verification>` block 2 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (1938 passed, 90 skipped) — 3 failed suites (`hover.test.ts`, `setopts-code-scanner.test.ts` beforeAll hook timeouts under contention, `installed-extension-e2e.test.ts` pre-existing "No document found" e2e flake) per the whole-suite gate substitution standing decision.
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows no stray scratch probe file (only the pre-existing untracked `.planning/milestone.lock`).
