---
phase: 99-parser-gaps-the-largest-groups
plan: 06
subsystem: parser
tags: [langium, grammar, validator, conformance, measurement]

# Dependency graph
requires:
  - phase: 99-05
    provides: "the closing measurement's two open gates (gate row 2 PARTIAL: one FIELD-verb file; gate row 3 FAIL: A2 30 vs <=27), the corrected gate-2 orchestrator note tracing the FIELD residue to the verb's undocumented trailing error-branch option, and the user's 2026-09-21 decision to close both with a gap plan rather than accept them as residue"
provides:
  - "FieldStatement grammar rule with an optional trailing Err fragment (the documented error-branch option), closing the last FIELD-verb list-A file"
  - "checkCommentNewLines reworked to decide separation from the preceding CST leaf's token type instead of a raw-text scan against a mismatched offset space, closing 7 of 8 false-alarm files from the A2 rise, plus a second narrow exemption for a leaf token type that consumes its own trailing terminator, closing the remaining 4 (found by the orchestrator's per-file look on the first Task 3 run)"
  - "A closing conformance re-measurement showing every gate row PASS: A 52, gate-2 FIELD/READ/IOLIST/LABEL all 0, A2 23 (<=27), B 666 (recorded, unchanged since plan 05), with 0 files newly entering A or A2 against either the immediate before-snapshot or the whole-plan before-snapshot (99-05 close)"
affects: []

actuals:
  tokens: 9991
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Terminator-consuming leaf token exemption: a named, closed Set of lexer token-type names (TERMINATOR_CONSUMING_LEAF_TOKENS) whose own regex only matches when it consumes a trailing ';' or line break into its own token text, so the leaf immediately preceding a comment never carries the separator even though the source has one. Established for one member (KEYWORD_STANDALONE) after reading every branch of bbj-token-builder.ts's buildTerminalToken to confirm it is the only such token built from a bare statement keyword."

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/test/test-data/conformance/field-verb.bbj
    - bbj-vscode/test/test-data/conformance/comment-after-continuation.bbj
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - bbj-vscode/test/line-break-validation.test.ts
    - .planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md
    - .planning/phases/99-parser-gaps-the-largest-groups/99-VALIDATION.md

key-decisions:
  - "The first Task 3 run's conditional stop (4 files newly entering A2, even though every numeric gate value already passed) was honored exactly as designed: no source file was touched to convert the miss into a pass. The orchestrator's required per-file look found all 4 files shared one shape — a bare standalone-verb statement (ENTER and its KEYWORD_STANDALONE siblings), a ';', then a comment on the same physical line — and traced it to a second, distinct cause from the one Task 2 already fixed: KEYWORD_STANDALONE's own regex consumes its trailing ';' or line break into its own matched token text, so no leaf of its own ever carries the separator."
  - "Fixed with a second, narrow exemption in checkCommentNewLines rather than reopening the raw-text-scan approach Task 2 replaced: a named Set of terminator-consuming leaf token names, established by reading every branch of bbj-token-builder.ts's buildTerminalToken (16 custom tokens) and classifying each as consumes-terminator or lookahead-only. Only KEYWORD_STANDALONE consumes; every other terminator-adjacent custom token only looks ahead, so its own leaf (';' or a line break) is still there to see."
  - "The documented bracketed array-index form between FieldStatement's name part and its '=' (e.g. a name followed by '[n]') remains unimplemented, exactly as Task 1 decided: no measured file needs it and the gate did not ask for it. Left for the next phase's long tail."
  - "requirements-completed intentionally left empty and REQUIREMENTS.md left untouched, per this plan's own working rule ('the orchestrator closes the phase's requirement ids') and the follow-up instruction reiterating it — even though every gate now reads PASS and all four Phase 99 criteria are fully evidenced (see 99-CONFORMANCE.md's 'Final gate table (plan 06 follow-up, closing)')."

requirements-completed: []
# PARSE-01/02/03/07 intentionally left unticked in REQUIREMENTS.md, per this plan's own working
# rule and the follow-up instruction reiterating it. Every gate now reads PASS (see
# 99-CONFORMANCE.md's closing sections); the tick itself is deliberately left to the orchestrator.

coverage:
  - id: D1
    description: "FieldStatement accepts the documented trailing error-branch option (record, name, value, then ',ERR=<line reference>'), at every letter case, at program level and in a method body, with an inner error branch inside the value's own call working unmodified; the class-member FieldDecl, the no-value verb error and every keyword-as-identifier case for FIELD and ERR are unchanged"
    requirement: PARSE-01
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#FIELD verb (trailing error-branch cases)"
        status: pass
      - kind: integration
        ref: "test/conformance-regressions.test.ts — field-verb.bbj"
        status: pass
    human_judgment: false
  - id: D2
    description: "checkCommentNewLines no longer flags a comment at a position where a statement legally begins: after a ';' or line-break separator (including across a ':'-continuation join), after a then/else-branch keyword, or right after a leaf whose own token consumed its trailing terminator into its own text (KEYWORD_STANDALONE) — while a comment glued after an ordinary statement with no separator, and the same keyword spelling used as an ordinary identifier glued to a comment, both still get flagged"
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: a comment at a position where a statement legally begins"
        status: pass
      - kind: integration
        ref: "test/conformance-regressions.test.ts — comment-after-continuation.bbj"
        status: pass
    human_judgment: false
  - id: D3
    description: "The closing conformance re-measurement shows every gate row PASS (A 52 <=80; FIELD/READ/IOLIST/LABEL all 0; A2 23 <=27; B 666 recorded, not risen) with the required file-set condition also met: 0 files newly entered A or A2 against either the immediate before-snapshot or the whole-plan before-snapshot (the 99-05 close)"
    requirement: PARSE-02
    verification:
      - kind: manual_procedural
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <this repo>, 2026-09-21, commit 8fe67560, sourceModified: false"
        status: pass
    human_judgment: false
  - id: D4
    description: "The older 'Closing run' / 'Gate table' / 'Closing attestation' record (99-05) and this plan's own first Task 3 run are corrected in place with pointers to the newer evidence, so no two sections of 99-CONFORMANCE.md disagree; 99-VALIDATION.md gains a Per-Task Verification Map row for the follow-up fix and its Task 3 row is updated to reflect resolution"
    requirement: PARSE-03
    verification:
      - kind: manual_procedural
        ref: "99-CONFORMANCE.md 'Final gate table' and 'Final gate table (plan 06 follow-up, closing)' sections; 99-VALIDATION.md Per-Task Verification Map rows 99-06-T2b and 99-06-T3"
        status: pass
    human_judgment: false

duration: 48min
completed: 2026-09-21
status: complete
---

# Phase 99 Plan 06: FIELD's Trailing Error Branch and the Comment-Separation False Alarm Summary

**FieldStatement gains the documented trailing `ERR=` option and `checkCommentNewLines` is reworked twice — once to decide from the CST instead of a raw-text scan, once more to recognize a lexer token that swallows its own terminator — closing every remaining Phase 99 gate: A 52, A2 23, B 666, with 0 files newly entering A or A2 anywhere in the plan.**

## Performance

- **Duration:** 48 min (Tasks 1-3, plus the follow-up continuation that closed the conditional stop the first Task 3 run returned)
- **Started:** 2026-09-21T14:39:54Z
- **Completed:** 2026-09-21T15:27:29Z
- **Tasks:** 3 (plus one follow-up fix task, 99-06-T2b, dispatched by the orchestrator after the first Task 3 run's conditional stop)
- **Files modified:** 8 (grammar, validator, two fixtures, two test files, two measurement records)

## Accomplishments

- **Task 1 — the verb's trailing error-branch option.** `FieldStatement` gained one optional trailing
  reference to the existing `Err` fragment — the same fragment the method-call rule already carries
  inside its own parentheses, reused rather than duplicated. A probe confirmed the shape was a parser
  error before the edit and clean after, at every letter case, at program level and in a method body,
  with the value's own inner error branch (inside a nested call) working unmodified — the inner form
  needed no change at all, because the fragment already existed at that decision point. The two
  must-stay-errors (a verb with no value; the class-member `FieldDecl` with no type) were unaffected.
  The documented bracketed array-index form between the name part and `=` was deliberately not
  implemented — no measured file needs it, and the gate did not ask for it — and is recorded here for
  the next phase's long tail. Generator ambiguity-warning lines were identical before and after
  regeneration under Node 22.
- **Task 2 — the comment-separation false alarm, first cause.** `checkCommentNewLines` walked
  backwards over the CST root's original `fullText` using an offset computed against the lexer's
  *rewritten* text (the line splitter that joins `:`-continuation lines) — the two strings diverge
  exactly where a continuation line was joined, which is exactly where 8 of the A2 rise's files sat.
  Reworked to decide separation from the type of the CST leaf immediately preceding the comment
  instead: exempt when there is no preceding leaf, it is the statement separator, it ends on an
  earlier line, or it is a then/else-branch keyword. This cleared 7 of the 8 files (all three probed
  shapes: a comment alone after a separator-ended continuation, a comment alone after a THEN-ended
  continuation, and a comment directly after THEN on the same physical line — the last of these
  fully cleared via the then/else-keyword exemption, not left flagged). The glued-comment case (no
  separator at all) stayed flagged, confirmed in both the before and after probe. An unrelated,
  pre-existing lexer quirk was found and left untouched as out of scope: a comment glued to a
  continuation line with zero whitespace after the `:` marker merges into the previous keyword as one
  identifier token (e.g. `THENREM`) — not a shape any A2 file exhibited.
- **Task 3, first run — closing re-measure and the conditional stop.** Whole vitest suite
  `numFailedTests: 0`; generated parser current; register check clean. Harness run on commit
  `cf29c9d4`: **A 52** (PASS, ≤80, −1 vs the plan 05 close), gate-2 **PASS** (FIELD/READ/IOLIST/LABEL
  all 0, closing the last FIELD-verb residue), **A2 27** (numeric PASS, exactly at the ≤27 gate), **B
  666** (unchanged). But the file-set diff showed **4 files newly entered A2** even though the total
  improved (30 → 27, 7 left against 4 entering) — the plan's own conditional stop is stricter than the
  numeric gates alone and does not accept a net improvement as a substitute for "no file newly
  entering A2". Per the plan's own working rules, the plan did not seal: it returned a blocking-human
  checkpoint with counts and the message-group tag only (`Comments need to be separated by line breaks
  or ';'.`, all 4 files), no cause or attribution — per-file inspection is the orchestrator's job.
- **Orchestrator per-file look, and the follow-up fix (99-06-T2b).** All 4 newly-entered files shared
  one shape, in the orchestrator's own words: the argument-less `ENTER` verb, then `;`, then a comment
  on the same line (twice behind a leading label). Traced to a second, distinct cause from Task 2's
  fix: `bbj-token-builder.ts`'s `KEYWORD_STANDALONE` terminal — built for the bare
  `DELETE|SAVE|ENTER|READ|INPUT|EXTRACT|FIND` statement forms — only matches when a trailing `;` or
  line break directly follows, and its match *consumes* that terminator into its own token text, so no
  leaf of its own ever carries the separator even though the source has one. Confirmed by reading every
  branch of `buildTerminalToken` (16 custom tokens total): every other terminator-adjacent custom
  token only *looks ahead* at the terminator without consuming it, so `KEYWORD_STANDALONE` is the only
  one needing this exemption. Fixed with a small named `Set` of terminator-consuming leaf token names
  (one member today) checked alongside the existing exemptions in `checkCommentNewLines` — RED
  confirmed first (5 new test cases failed against the unmodified check, reverted via patch and
  reapplied), GREEN after the fix. New tests cover the base shape, a leading label, no-space and
  multi-space-before-semicolon spellings, a sibling verb word from the same token family, and an
  honest negative: the same keyword spelling used as an ordinary identifier (where the
  terminator-consuming token never matches at all) glued to a comment stays flagged. The
  `enter; rem …` shape was also appended to `comment-after-continuation.bbj` with synthetic, invented
  label names.
- **Task 3, redone — closing re-measure, all gates PASS.** Snapshot taken immediately before the run;
  measured commit `8fe67560`, `sourceModified: false`, 78 seconds. **A 52** (unchanged, PASS). **A2
  23** (down from 27, PASS). **B 666** (unchanged, recorded). File-set diff against this follow-up's
  own before-snapshot: exactly the 4 files that had newly entered A2 left it, 0 files entered anywhere.
  File-set diff against the whole plan's own before-snapshot (the 99-05 close, A 53/A2 30/B 666): 1
  file left A (the FIELD residue), 7 left A2 (the 8 false-alarm files minus the 1 still-flagged
  glued-comment shape), **0 files entered either list across the whole plan**. Every condition the
  first Task 3 run's conditional stop required is now met — every gate row PASS, A2 ≤27, B ≤666, no
  file newly entering A or A2 — so the plan seals here rather than returning a second checkpoint. The
  Final gate table and the "Task 3 conditional stop" section in `99-CONFORMANCE.md` are corrected in
  place with the superseded numbers kept visible (struck through), pointing at the new evidence rather
  than repeating it; `99-VALIDATION.md` gains a row for 99-06-T2b and its Task 3 row is updated to
  reflect resolution.

## Task Commits

1. **Task 1: The verb's trailing error-branch option** — `05808dc0` (fix)
2. **Task 2: The comment-separation false alarm, first cause** — `cf29c9d4` (fix)
3. **Task 3 (first run): Closing re-measure and the conditional stop** — `06a4e41e` (docs)
4. **Follow-up (99-06-T2b): Accept a comment right after a terminator-swallowing verb** — `8fe67560` (fix)
5. **Task 3 (redone): Closing re-measure of the follow-up fix, all gates PASS** — `d5116873` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` — `FieldStatement` gains an optional trailing `Err?` reference
- `bbj-vscode/src/language/bbj-validator.ts` — `checkCommentNewLines` reworked to decide from the CST
  leaf's token type (Task 2), then extended with a named `TERMINATOR_CONSUMING_LEAF_TOKENS` exemption
  (99-06-T2b)
- `bbj-vscode/test/test-data/conformance/field-verb.bbj` — extended with trailing error-branch cases
- `bbj-vscode/test/test-data/conformance/comment-after-continuation.bbj` — extended with the three
  continuation-line shapes (Task 2) plus the `enter; rem` terminator-swallowing shape (99-06-T2b)
- `bbj-vscode/test/parser-keyword-statements.test.ts` — extended "FIELD verb" describe block
- `bbj-vscode/test/line-break-validation.test.ts` — new describe block (Task 2), extended with the
  terminator-swallowing-token cases and the identifier-collision negative (99-06-T2b)
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — "Run: plan 06 (gap closure
  re-measure)" and "Final gate table" sections (first Task 3 run), then "Run: plan 06 follow-up" and
  "Final gate table (plan 06 follow-up, closing)" sections, with the older sections corrected in place
- `.planning/phases/99-parser-gaps-the-largest-groups/99-VALIDATION.md` — three new Per-Task
  Verification Map rows (99-06-T1, T2, T3) plus one for the follow-up (99-06-T2b), and T3's status
  updated to reflect resolution

## Decisions Made

See `key-decisions` in the frontmatter: the conditional stop honored on its own numeric-pass-but-
file-set-fail run, the second narrow exemption chosen over reopening the raw-text approach, the
array-index form left unimplemented, and `REQUIREMENTS.md` left untouched per the plan's own working
rule and the follow-up's explicit reiteration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, found via the plan's own conditional stop] The first `checkCommentNewLines`
rework (Task 2) left a second, distinct false-alarm cause unfixed**
- **Found during:** The first Task 3 run's conditional stop, resolved by the orchestrator's required
  per-file look
- **Issue:** Task 2's CST-leaf rework correctly fixed the raw-text/rewritten-text offset mismatch, but
  did not account for a custom lexer token (`KEYWORD_STANDALONE`) whose own regex consumes its
  trailing `;` or line break into its own matched text — so a comment immediately after a bare
  standalone-verb statement (e.g. `enter; rem …`) had no separator leaf in front of it and was still
  flagged, on 4 files.
- **Fix:** Read every branch of `bbj-token-builder.ts`'s `buildTerminalToken` to confirm
  `KEYWORD_STANDALONE` is the only terminator-*consuming* custom token (every other terminator-adjacent
  token only looks ahead); added a narrow, named exemption in `checkCommentNewLines` for a leaf of that
  token type. RED confirmed first via a git-apply-and-revert of the fix against the new tests, GREEN
  after reapplying.
- **Files modified:** `bbj-vscode/src/language/bbj-validator.ts`,
  `bbj-vscode/test/line-break-validation.test.ts`, `bbj-vscode/test/test-data/conformance/comment-after-continuation.bbj`
- **Verification:** `npx vitest run test/line-break-validation.test.ts test/conformance-regressions.test.ts test/example-files.test.ts`
  green; whole-suite `numFailedTests: 0`; register check clean
- **Committed in:** `8fe67560`

**2. [Process — conditional stop honored, then resolved by a second Task 3 run, not overridden] The
first Task 3 run returned a blocking-human checkpoint rather than sealing**
- **Found during:** Task 3, first run
- **Issue:** Every numeric gate value already read at or better than its threshold, but the file-set
  condition (no file newly entering A2) was not met — 4 files entered even though the total improved.
- **Fix:** No source file was touched to convert the miss into a pass. The checkpoint was returned
  exactly as the plan's own step 7 specifies; the orchestrator's per-file look (a step this plan's
  working rules explicitly reserve to the orchestrator) identified the cause, and a follow-up fix task
  closed it. Task 3 was then redone in full — precondition, snapshot, harness run, gate table,
  reconciliation — rather than patching the first run's numbers.
- **Files modified:** none by the checkpoint itself; see deviation 1 for the fix
- **Verification:** the redone Task 3 run shows every gate PASS and 0 files newly entering A or A2
  against both the immediate and the whole-plan before-snapshots
- **Committed in:** `d5116873`

---

**Total deviations:** 2 (one Rule-1 bug fix found via the plan's own designed stop mechanism, one
process note documenting that the stop was honored rather than bypassed).
**Impact on plan:** No scope creep, no source touched to force a number. The conditional stop worked
exactly as designed on its first run — surfacing a real second-cause regression rather than a
tolerable residue — and the plan closes cleanly once that regression was fixed and re-measured.

## Issues Encountered

None beyond the two items recorded above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 99's conformance gates are now fully closed: A 52 (≤80), gate-2 FIELD/READ/IOLIST/LABEL all 0,
  A2 23 (≤27), B 666 (recorded, unchanged since the plan 05 close's +1 over the Phase 98 baseline of
  665, carried forward as a previously-classified lost accidental catch). 0 files newly entered A or
  A2 anywhere across this plan's own before-snapshot or the whole-plan before-snapshot.
- `PARSE-01`, `PARSE-02`, `PARSE-03` and `PARSE-07` are fully evidenced (see
  `99-CONFORMANCE.md`'s closing sections and this SUMMARY's `coverage` block) but intentionally left
  unticked in `REQUIREMENTS.md` — per this plan's own working rule and the follow-up instruction
  reiterating it, ticking them is the orchestrator's job.
- The documented `FIELD` array-index form (a bracketed index between the name part and `=`) remains
  unimplemented — a candidate for the next phase's long tail, not blocking this phase's close.
- The unrelated lexer quirk noted in Task 2 (a comment glued with zero whitespace after a `:`
  continuation marker merging into the previous keyword, e.g. `THENREM`) remains unfixed — out of
  scope for this plan, not exhibited by any measured file.
- No corpus file name, path or source line was written to any tracked file by this plan (confirmed by
  the grep verification in the redone Task 3).

---
*Phase: 99-parser-gaps-the-largest-groups*
*Completed: 2026-09-21*

## Self-Check: PASSED

All five commit hashes (`05808dc0`, `cf29c9d4`, `06a4e41e`, `8fe67560`, `d5116873`) confirmed present
in `git log`. `bbj-vscode/src/language/bbj.langium`, `bbj-vscode/src/language/bbj-validator.ts`, both
fixtures, both test files, `99-CONFORMANCE.md` and `99-VALIDATION.md` confirmed present on disk with
their described sections. `git status --porcelain -- bbj-vscode/src/language/generated/` empty; no
scratch probe file remains under `bbj-vscode/test/`.
