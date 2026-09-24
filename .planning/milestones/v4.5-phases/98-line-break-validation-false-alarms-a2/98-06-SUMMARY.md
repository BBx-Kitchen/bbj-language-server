---
phase: 98-line-break-validation-false-alarms-a2
plan: 06
subsystem: parser/validation
tags: [langium, chevrotain, bbj, validation, conformance, line-break-validation, vitest]

# Dependency graph
requires:
  - phase: 98-01
    provides: "conformance-regressions.test.ts harness and the test-data/conformance/ fixture convention"
  - phase: 98-02
    provides: "keyword-branch-target and RESTORE/EXIT/LOAD fixes measured by this plan's harness run"
  - phase: 98-03
    provides: "narrowed conflicting-DECLARE and METHODRET checks, attested clean by this plan's criterion-4 check"
  - phase: 98-04
    provides: "single-line IF/FI backward-walk fixes and the ifEndStatementLineBreaks walk-past pattern this plan mirrors into elseStatementLineBreaks"
  - phase: 98-05
    provides: "the FNEND-optional DEF FN fix that unmasked this plan's checkReturnValueInDef finding"
provides:
  - "98-CONFORMANCE.md: the phase-boundary conformance measurement, full A2 residue triage, and per-success-criterion closing evidence"
  - "COVERAGE.md: the phase's no-external-API declaration"
  - "checkReturnValueInDef (bbj-validator.ts) downgraded from error to warning for a bare early-exit RETURN inside a DEF FN"
  - "elseStatementLineBreaks (line-break-validation.ts) now walks past a same-line ELSE or end-of-IF statement, mirroring plan 04's ifEndStatementLineBreaks fix"
  - "def-fn-early-return.bbj conformance fixture; single-line-if-forms.bbj gains the nested-IF/FI-then-ELSE shape"
affects: []

actuals:
  tokens: 6658
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A validator check that disagrees with the compiler is downgraded to a warning, not silenced (matches plan 03's D-06/D-07 pattern), when a grammar fix from an earlier plan in this phase unmasks a pre-existing check that never used to see real input."
    - "A backward-walk line-break mask fix from one plan (ifEndStatementLineBreaks in plan 04) has a sibling mask (elseStatementLineBreaks) that needs the identical fix, since both masks independently stop-without-clearing at the same construct shape (a preceding same-line end-of-IF or ELSE statement)."

key-files:
  created:
    - .planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md
    - .planning/phases/98-line-break-validation-false-alarms-a2/COVERAGE.md
    - bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj
  modified:
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/test/validation.test.ts
    - bbj-vscode/test/line-break-single-line-if.test.ts
    - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj

key-decisions:
  - "The harness's initial run against the tree through plan 05 measured A2 at 41 (not 267, and not yet at the ≤ 25 gate), A at 167 (improved from 168), and B at 665 of 1,210 (regressed from 658) — recorded honestly in 98-CONFORMANCE.md's Task 2 section before any plan-06 fix was made."
  - "Two of the 22 remaining A2 message groups were trivially related to a change this phase already made and were fixed: checkReturnValueInDef downgraded to a warning (7 files, unmasked by plan 05's FNEND-optional fix) and elseStatementLineBreaks taught to walk past a same-line ELSE/end-of-IF statement (12 files, the same root-cause class as plan 04's ifEndStatementLineBreaks fix, applied to the sibling mask plan 04 did not touch). A2 fell from 41 to 22 across both fixes, confirmed by re-running the harness after each."
  - "B's regression (658 -> 665 of 1,210) is NOT fixed in this plan and is recorded as accepted, unfixed residue, not silently passed: it is a side effect of plan 02 removing a false line-break alarm that happened to catch a small number of genuinely invalid (undefined-branch-target) files under the wrong message; the harness excludes linking errors from this measurement by design, so building a real check for it would be a new, architecturally significant validation outside this plan's narrow allowance and squarely the job the milestone already assigns to the bbj-ls compiler-parser endpoint (Phases 101-103)."
  - "The remaining 22 A2 files (18 message groups) were each dispositioned in 98-CONFORMANCE.md: the LEN=-fused-keyword group (3 files) plus two closely related sites (LET LEN=..., lower-case len=) and a `;rem`-after-ENDIF group and a handful of long-tail parser gaps (CLEAR x[all], scientific-notation numeric literals) are handed to Phase 100; the rest (a value-carrying RETURN, a field-initializer type check, a switch-placement check, a DECLARE-placement check, a member-visibility check, a KEYED-file-option check, a REM-in-single-line-IF comment-placement check, and one narrower `RETURN void FI` shape) are recorded as accepted residue, unrelated to this phase's five named construct groups."
  - "VALID-01 through VALID-05 and CONF-01 are marked Complete in REQUIREMENTS.md: each requirement's own wording (which excludes the LEN= construct D-18 reassigned to Phase 100) is fully supported by the final measurement. Roadmap success criterion 5 (the composite A2 <= 25 / A and B not regressed gate) is only partially met — recorded plainly in 98-CONFORMANCE.md section 6, not glossed over."

requirements-completed: [VALID-01, VALID-02, VALID-03, VALID-04, VALID-05, CONF-01]

coverage:
  - id: D1
    description: "Whole-suite gate on the final tree: numFailedTests 0, all nine promised conformance fixtures present, generated parser current, register check clean over the phase's whole source diff"
    verification:
      - kind: unit
        ref: "cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 (numFailedTests: 0, confirmed by re-running each hook-timeout suite alone)"
        status: pass
      - kind: other
        ref: "git diff -U0 5fb113cb..HEAD -- bbj-vscode | grep '^+' | grep -qE 'VALID-0|CONF-0|D-[0-9][0-9]|98-[0-9][0-9]' (no match, whole-phase diff)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Private conformance harness run at the phase boundary: A2 down to 22 (<= 25 gate met, from 267), A improved to 167 (from 168, not regressed), B regressed to 665 of 1,210 (from 658, NOT met)"
    requirement: CONF-01
    verification:
      - kind: other
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server (private harness, run three times: initial 41, after fix A 34, after fix B 22)"
        status: pass
    human_judgment: true
    rationale: "The A2/A gates are met by the numbers, but B's regression means roadmap success criterion 5 is only partially satisfied — a human/orchestrator decision on whether to accept this documented residue is appropriate, not an automated pass."
  - id: D3
    description: "Every remaining A2 group triaged into a disposition (fixed / accepted residue / handed to Phase 100) with a one-line cause, and criterion-4 attested clean"
    requirement: CONF-01
    verification:
      - kind: other
        ref: ".planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md sections 3, 4, 5, 7, 8"
        status: pass
    human_judgment: false
  - id: D4
    description: "COVERAGE.md declares no external API integration, under 200 characters"
    verification:
      - kind: unit
        ref: "head -1 COVERAGE.md | grep -q 'No external API integration:'; wc -c < COVERAGE.md == 85"
        status: pass
    human_judgment: false

duration: 50min
completed: 2026-09-21
status: complete
---

# Phase 98 Plan 06: Phase-Boundary Conformance Measurement and Residue Triage Summary

**The private conformance harness measured A2 at 267 -> 22 (well under the 25 gate) and A at 168 -> 167 (improved) after two trivially-related fixes this plan made, but B regressed 658 -> 665 of 1,210 — recorded honestly as unfixed, accepted residue rather than silently passed.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-21T03:55:00Z (approx.)
- **Completed:** 2026-09-21T04:45:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments
- Confirmed the final tree's generated parser is current, all nine promised conformance fixtures are present, and the register check over the phase's whole source diff (base commit `5fb113cb` through this plan) produces no match — the tree is coherent before measuring anything.
- Ran the private harness three times: the initial run against the tree through plan 05 (A2=41, A=167, B=665), a re-run after downgrading `checkReturnValueInDef` to a warning (A2=34), and a final re-run after teaching `elseStatementLineBreaks` to walk past a same-line ELSE or end-of-IF statement (A2=22) — landing the A2 gate (<=25) with room to spare.
- Diagnosed and fixed two A2 groups that turned out to be trivially related to changes this phase already made: a bare early-exit `RETURN` inside a DEF FN body (unmasked by plan 05's `FNEND?` fix) and a same-line `ELSE` closing a nested single-line IF/FI chain (the same root-cause class as plan 04's `ifEndStatementLineBreaks` fix, applied to the sibling `elseStatementLineBreaks` mask plan 04 did not touch).
- Triaged every one of the 22 remaining A2 files across 18 message groups into a disposition (handed to Phase 100 or accepted residue) with a one-line cause, in `98-CONFORMANCE.md`.
- Documented B's regression (658 -> 665 of 1,210) plainly as accepted, unfixed residue — a side effect of plan 02 removing a false line-break alarm that was accidentally catching a handful of genuinely invalid files under the wrong message, now correctly excluded from this measurement since the harness ignores linking errors by design. Recorded that roadmap success criterion 5 is only partially met, and did not mark it as fully satisfied.
- Marked VALID-01 through VALID-05 and CONF-01 Complete in `REQUIREMENTS.md` — the measurement supports each requirement's own wording (which, per D-18, excludes the `LEN=` construct handed to Phase 100).

## Task Commits

Each task was committed atomically:

1. **Task 1: Whole-suite gate on the final tree** - no commit (no source change was needed: `bbj-vscode/src/language/generated/ast.ts` was already newer than `bbj.langium`; the whole-suite gate, fixture-list check, and register check all passed against the tree exactly as plan 05 left it).
2. **Task 2: Run the private conformance harness and record the numbers** - `0988ce39` (docs)
3. **Task 3: Triage the residue and close the phase's gate declarations** - `f38d3a82` (fix)

_No plan-metadata commit yet — this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md` - Created in Task 2 with the initial measurement (Numbers, what-the-run-measured, remaining A2 groups with causes, criterion-4 attestation); extended in Task 3 with the two fixes' details, the final numbers, the full disposition table, and the per-success-criterion closing evidence.
- `.planning/phases/98-line-break-validation-false-alarms-a2/COVERAGE.md` - New single-line "No external API integration" declaration (85 characters).
- `bbj-vscode/src/language/bbj-validator.ts` - `checkReturnValueInDef`'s one `accept('error', ...)` call changed to `accept('warning', ...)`.
- `bbj-vscode/src/language/validations/line-break-validation.ts` - `elseStatementLineBreaks` no longer stops (without clearing) at a preceding same-line ELSE or end-of-IF statement; it now walks past, mirroring `ifEndStatementLineBreaks`.
- `bbj-vscode/test/validation.test.ts` - The existing "DEF RETURN needs a return value" test now asserts a warning (`expectWarning`) instead of an error; imports `expectWarning` from `langium/test`.
- `bbj-vscode/test/line-break-single-line-if.test.ts` - New positive case: "a nested single-line IF/FI followed on the same line by the outer ELSE".
- `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` - Gains the nested-IF/FI-then-ELSE shape in upper, lower and mixed case.
- `bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj` - New fixture: an in-loop early-exit RETURN and a single-line-IF-guarded early-exit RETURN, both in upper and lower case.

## Decisions Made
See `key-decisions` in the frontmatter above for the full rationale on: the initial (pre-fix) measurement, the two trivially-related fixes and their exact file-level changes, why B's regression is recorded as accepted residue rather than fixed, the full residue disposition, and the REQUIREMENTS.md completion decision.

## Deviations from Plan

### Auto-fixed Issues (Rule 1 — bugs, both explicitly sanctioned by the plan's own D-16 "trivially related" allowance)

**1. [Rule 1 - Bug] `checkReturnValueInDef` flagged a compiler-accepted early-exit RETURN as an error**
- **Found during:** Task 2, reading the initial harness run's A2 breakdown
- **Issue:** A bare `RETURN` used to exit a multi-line DEF FN body before its final value-carrying `RETURN`/`FNEND` is compiler-accepted (all 7 corpus files exercising it are themselves valid programs), but `checkReturnValueInDef` in `bbj-validator.ts` unconditionally flagged any bare `RETURN` inside a DEF FN body as an error. This check pre-dates this phase but never used to see these bodies at all — before plan 05's `FNEND?` grammar fix, an unclosed DEF FN body fell back to top-level expression statements instead of populating a real `DefFunction.body`, so the check never ran against this shape.
- **Fix:** Downgraded the one `accept('error', ...)` call to `accept('warning', ...)`, matching plan 03's established pattern (D-06/D-07) for a check that disagrees with the compiler.
- **Files modified:** `bbj-vscode/src/language/bbj-validator.ts`, `bbj-vscode/test/validation.test.ts` (assertion updated), `bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj` (new fixture)
- **Verification:** Targeted suite (`validation.test.ts`, `conformance-regressions.test.ts`, `classes.test.ts`, `example-files.test.ts`) passed; whole suite `numFailedTests: 0`; harness re-run confirmed A2 41 -> 34.
- **Committed in:** `f38d3a82` (Task 3 commit)

**2. [Rule 1 - Bug] `elseStatementLineBreaks` stopped its backward walk too early, unlike its sibling mask**
- **Found during:** Task 3, triaging the 34-file breakdown after fix 1
- **Issue:** A same-line `ELSE` that closes a nested single-line IF/FI chain (e.g. `if a then if b then c = 1 fi else d = 1 fi`) was flagged, because `elseStatementLineBreaks`'s backward walk stopped (without clearing the line-break requirement) the moment it found a preceding same-line `ElseStatement` or `IfEndStatement`, instead of continuing to look further back for the ELSE's own governing IF. Plan 04 fixed the exact same root-cause class in the sibling `ifEndStatementLineBreaks` mask but did not touch `elseStatementLineBreaks`, since ELSE forms were not named in plan 04's own construct groups.
- **Fix:** Removed the special-case branch; the walk now falls through to the loop's generic "keep walking" step for a same-line ELSE or end-of-IF statement, exactly like the already-fixed `ifEndStatementLineBreaks`.
- **Files modified:** `bbj-vscode/src/language/validations/line-break-validation.ts`, `bbj-vscode/test/line-break-single-line-if.test.ts` (new positive case), `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` (new fixture lines)
- **Verification:** Targeted suite passed (all 12 cases in `line-break-single-line-if.test.ts`, including the pre-existing "ELSE with no governing IF on the line is still flagged" negative in `line-break-walk-termination.test.ts`, unchanged); whole suite `numFailedTests: 0`; harness re-run confirmed A2 34 -> 22 (12 files: the fix also resolved 6 files previously reported under a blank-message "needs to start in a new line" group and 2 under uppercase `ELSE` — all three groups were the same underlying files reporting different symptoms of the same defect).
- **Committed in:** `f38d3a82` (Task 3 commit)

### Not Fixed — Recorded as Accepted Residue

**B regressed from 658 to 665 of 1,210 (not a bug introduced by this plan; a side effect of plan 02's fix).** Removing the false line-break alarm on `GOSUB`/`GOTO` to a keyword-named label also removed a diagnostic that was accidentally catching a small number of compiler-rejected files (an undefined branch target) under the wrong message. The harness explicitly excludes linking errors from both A2 and B measurements ("the run uses a fake Java classpath"), so once the false line-break error is gone, the genuine defect is no longer caught by anything at error severity. Building a real check for undefined branch targets is an architecturally significant new validation, outside this plan's narrow "trivially related fix" allowance and outside this phase's line-break/DECLARE/METHODRET scope — it is the job the milestone already assigns to the `bbj-ls` compiler-parser endpoint (Phases 101-103). Recorded plainly in `98-CONFORMANCE.md` section 6; roadmap success criterion 5 is documented as only partially met.

Eighteen further A2 message groups (see `98-CONFORMANCE.md` section 7) were each dispositioned as accepted residue or handed to Phase 100 without a code change, per D-16's "do not drive toward zero" instruction — the gate is A2 <= 25, met at 22.

## Known Stubs

None.

## Threat Flags

None — no new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced. Both fixes are severity changes to existing, already-registered validator checks.

## Issues Encountered
- The harness's initial run (Task 2) showed A2 at 41, not yet under the 25 gate, and B regressed from 658 to 665 — both required investigation and honest recording before any fix, per the orchestrator's explicit instruction not to mark the gate met prematurely.
- Diagnosing the ELSE-mask fix's full impact required a second harness re-run: the fix's effect (removing 12 files, not the originally-hypothesized 6) was only confirmed empirically by comparing the pre- and post-fix message-group breakdowns, since the harness's private corpus source text cannot be read directly under this repository's shell rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 98 is measured and closed at the plan level: A2 = 22 (<= 25), A = 167 (improved), CONF-01's fixture convention is populated with nine files. B = 665 of 1,210 (regressed from 658) is an open, documented item — not a blocker for Phase 99 (whose own criterion 5 only requires A2 to stay at or below Phase 98's number, which it does), but worth the orchestrator's attention when deciding whether Phase 98 is fully closeable or needs an explicit acceptance of the B regression.
- The `LEN=` fused-keyword-literal defect (5 files across three sites: `LEN=`, `LET LEN=...`, `len=`) and a handful of long-tail parser gaps (CLEAR `x[all]`, scientific-notation numeric literals, a `;rem`-after-ENDIF shape) are recorded in `98-CONFORMANCE.md` section 7 for Phase 100's long-tail triage.
- No blockers for Phase 99 (parser gaps, list A) — this plan changed no grammar file, so Phase 99's own harness baseline is unaffected by anything in this plan beyond the two validator-severity changes.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: .planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md
- FOUND: .planning/phases/98-line-break-validation-false-alarms-a2/COVERAGE.md
- FOUND: bbj-vscode/src/language/bbj-validator.ts
- FOUND: bbj-vscode/src/language/validations/line-break-validation.ts
- FOUND: bbj-vscode/test/validation.test.ts
- FOUND: bbj-vscode/test/line-break-single-line-if.test.ts
- FOUND: bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj
- FOUND commit: 0988ce39 (docs(98-06): record the phase-boundary conformance run)
- FOUND commit: f38d3a82 (fix(98-06): triage A2 residue and close the phase's gate declarations)
- Re-ran plan `<verification>` block 1 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (final run after both fixes: 1980 passed, 55 pending/skipped) — failed suites were pre-existing `beforeAll` hook timeouts under contention, confirmed by re-running each alone with zero failures.
- Re-ran plan `<verification>` block 2 (private harness): final numbers A=167, A2=22, B=665 of 1,210, confirmed reproducible.
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows nothing under `bbj-vscode/src/language/generated/` and no stray scratch probe file (only the pre-existing untracked `.planning/milestone.lock`).
- Re-ran the whole-phase register check (`git diff -U0 5fb113cb..HEAD -- bbj-vscode | grep '^+' | grep -qE 'VALID-0|CONF-0|D-[0-9][0-9]|98-[0-9][0-9]'`): no match.
