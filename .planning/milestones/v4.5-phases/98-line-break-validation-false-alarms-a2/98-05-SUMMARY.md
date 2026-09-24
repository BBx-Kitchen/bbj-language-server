---
phase: 98-line-break-validation-false-alarms-a2
plan: 05
subsystem: parser/validation
tags: [langium, chevrotain, bbj, grammar, def-fn, line-break-validation, vitest]

# Dependency graph
requires:
  - phase: 98-01
    provides: "conformance-regressions.test.ts harness and the test-data/conformance/ fixture convention"
  - phase: 98-02
    provides: "precedent for a grammar-level fix over a validator-side symptom patch"
provides:
  - "DefFunction's multi-line alternative no longer requires a closing FNEND, so an unclosed function body runs to end of file as one DefFunction node instead of misparsing into fallback expression statements"
  - "def-fn-unclosed-body.bbj conformance fixture and matching line-break-validation.test.ts coverage"
  - "a probed, documented limitation (not fixed here): an unclosed function immediately followed by CLASS/INTERFACE/another unclosed DEF swallows that construct's opening keywords, because fixing it needs a lexer-category change in bbj-token-builder.ts, which this wave reserves for a different plan"
affects: [98-06]

actuals:
  tokens: 1116
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Making a grammar rule's mandatory tail token optional (FNEND?) restores the parser's ability to commit to that rule directly, instead of Chevrotain's static lookahead silently falling back to a generic ExpressionStatement chain when the tail can never be satisfied -- the same root-cause class documented for RESTORE/EXIT/LOAD in 98-02, now confirmed for DefFunction."

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/def-fn-unclosed-body.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/line-break-validation.test.ts

key-decisions:
  - "DefFunction's final rule shape is `RPAREN_NL (body += (DefReturn | Statement))* FNEND?` -- a bare optional on the existing terminal, no new sibling alternative and no AST shape change (body stays a plain collection either way)."
  - "The single-line assignment alternative (RPAREN_NO_NL '=' value=Expression) and the body/parameter/name shapes are all untouched."
  - "Investigated but explicitly NOT applied: excluding CLASS/INTERFACE/DEF from the generic ID token category in bbj-token-builder.ts. This does stop an unclosed body from swallowing a following class/interface header, but it also breaks BBjAPI() resolution without Java interop -- lib/bbj-api.ts's synthetic `library / class public BBjAPI / classend` source only ever resolved via Chevrotain's parser-error recovery treating the stray 'class'/'public' tokens as identifiers (confirmed by reverting to the original grammar/token-builder and reproducing the fixture's actual recovered AST: two LibFunction entries named 'class' and 'BBjAPI', despite 3 parser errors). Removing the ID category makes recovery produce zero declarations instead, and 3 linking.test.ts BBjAPI tests failed as a direct result. The plan's own working rules also forbid editing bbj-token-builder.ts in this wave (reserved for a different plan), so the category change was reverted and only the grammar-only fix (bbj.langium) was kept."
  - "Probed and recorded as residue for the next plan's triage (per the plan's own Flagged Assumptions -- this edge was explicitly called 'unresolved, unclassified'): an unclosed DEF FN body immediately followed, with nothing separating them, by a CLASS header, an INTERFACE header, or another unclosed DEF header gets that following header's opening keyword(s) swallowed into the first function's body via the same keyword-as-identifier fallback the grammar already relies on elsewhere (CLASS/INTERFACE/DEF all keep CATEGORIES:[ID], same as before this plan). For CLASS/INTERFACE this produces a genuine parser error once the loop reaches CLASSEND/INTERFACEEND (those two are excluded from ID, so they can't be swallowed and the parse fails outright). For a second unclosed DEF, no parser error is raised, but the second function's header and body are misparsed as unresolved-reference expression statements inside the first function -- no second DefFunction node is created. Not present in the corpus shape this phase targets: the Orchestrator Addendum records that an unclosed function always runs to the true end of file in every corpus instance (10 of 11) or is followed only by earlier, already-closed functions (the 11th) -- never immediately by a fresh CLASS/INTERFACE/DEF header with no separating end-of-file boundary."

requirements-completed: [VALID-03, CONF-01]

coverage:
  - id: D1
    description: "A multi-line DEF FN whose body is never closed by FNEND parses as one DefFunction node with zero diagnostics, in three shapes: no closing marker at all, a trailing space after the header's closing parenthesis, and a blank line between the header and the first body statement"
    requirement: VALID-03
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: multi-line DEF FN with no closing FNEND (first three positive cases)"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "An earlier, properly closed function followed by one unclosed final function parses with zero diagnostics"
    requirement: VALID-03
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: multi-line DEF FN with no closing FNEND (closed-then-unclosed case)"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "A properly closed DEF FN still ends exactly at its closing marker: a statement written on the next line is its own top-level statement, not part of the function body"
    requirement: VALID-03
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#a properly closed function still ends at its closing marker"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real statement cannot be crammed onto the closing marker's own physical line via a semicolon -- still rejected (as a parse failure, not silently accepted)"
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#a statement crammed onto the closing marker's own line via a semicolon is still rejected"
        status: pass
    human_judgment: false
  - id: D5
    description: "def-fn-unclosed-body.bbj conformance fixture (a closed function, a top-level statement after it, then an unclosed final function) parses clean and validates with zero error-severity diagnostics"
    requirement: CONF-01
    verification:
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-21
status: complete
---

# Phase 98 Plan 05: Optional FNEND for Unclosed Multi-Line DEF FN Bodies Summary

**Making DefFunction's closing FNEND optional stops the "needs to end with a line break: DEF" false alarm on multi-line functions that run to end of file, without breaking closed functions or letting a following declaration bleed into a genuinely unclosed one.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-21T03:02:00Z (approx.)
- **Completed:** 2026-09-21T03:36:30Z (approx.)
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `DefFunction`'s multi-line alternative now reads `RPAREN_NL (body += (DefReturn | Statement))* FNEND?` -- the previously-mandatory closing marker is optional, so Chevrotain commits to the `DefFunction` rule directly instead of silently falling back to a chain of `ExpressionStatement`s when the marker never arrives. An unclosed function (no closing marker at all, a trailing space after the header's parenthesis, or a blank line before the first body statement) now parses as exactly one `DefFunction` node with zero diagnostics.
- A properly closed function is unaffected: its body still stops exactly at its own closing marker, and a statement written after it remains its own top-level statement (confirmed both by a probe and by a persisted test asserting the exact `$type` sequence `['DefFunction', 'LetStatement']`).
- Investigated a real edge case the plan itself flagged as unresolved (an unclosed function immediately followed by a `CLASS`, `INTERFACE`, or another unclosed `DEF` header with nothing separating them): confirmed by probe that the following header's opening keyword(s) get swallowed into the first function's body, because those keywords still carry the generic identifier category the grammar already relies on elsewhere. A grammar-only fix does not exist for this without also touching token categorization; the one token-level fix that does close this gap was tried, reverted, and is fully documented below because it broke `BBjAPI()` resolution and because this wave's working rules forbid editing that file here. Recorded as residue for the next plan's triage, matching the corpus reality that an unclosed function always runs to true end-of-file in this phase's target shape.
- New conformance fixture (`def-fn-unclosed-body.bbj`: one closed function, a top-level statement after it, then one unclosed final function) and four new `line-break-validation.test.ts` cases (three positive shapes plus the closed-then-unclosed mix), plus a positive regression test for "closed function still ends at its marker" and a still-flagged negative proving a statement cannot be crammed onto the marker's own physical line.

## Task Commits

Each task was committed atomically:

1. **Task 1: A multi-line DEF FN no longer requires its FNEND** - `abff9fc4` (feat)
2. **Task 2: Conformance fixture, still-flagged cases, and the register check** - `09b36def` (test)

_No plan-metadata commit yet -- this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - `DefFunction`'s multi-line alternative's closing `FNEND` terminal changed from mandatory to optional (`FNEND?`); no other part of the rule (parameters, name, body, the single-line assignment alternative) changed.
- `bbj-vscode/test/test-data/conformance/def-fn-unclosed-body.bbj` - New fixture: a closed multi-line function with a value return, a top-level statement after its closing marker, then an unclosed multi-line function (two ordinary statements plus a value return) running to end of file. Uses both an upper-case and a lower-case form of the function-definition keyword.
- `bbj-vscode/test/line-break-validation.test.ts` - New `describe('Line break validation: multi-line DEF FN with no closing FNEND', ...)` block: four positive `test.each` cases, one regression test pinning the closed-function `$type` sequence, and one still-flagged negative for the same-line-as-the-marker shape.

## Decisions Made
See `key-decisions` in the frontmatter above for the full rationale on: the final grammar shape, the investigated-and-reverted token-category fix (and exactly why it regressed `BBjAPI()`), and the probed-but-unfixed class/interface/nested-def residue handed to plan 06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A first attempt at closing the class/interface/nested-DEF gap broke BBjAPI() resolution**
- **Found during:** Task 1, while probing the plan's own flagged edge case (an unclosed function followed by a class declaration)
- **Issue:** Excluding `CLASS`, `INTERFACE` and `DEF` from `BBjTokenBuilder`'s generic ID category (mirroring the existing `METHODEND`/`CLASSEND`/`INTERFACEEND` exclusion) did stop an unclosed `DefFunction` body from swallowing a following class/interface/nested-def header. But the whole-suite run then showed 3 new failures in `linking.test.ts`: `BBjAPI()` no longer resolved without Java interop. Root cause, confirmed by reverting to the original grammar and token builder and re-probing: `lib/bbj-api.ts`'s synthetic `library` source (`library` / `class public BBjAPI` / `classend`) never parsed as valid `Library` syntax in the first place -- it only ever produced a usable `BBjAPI` scope entry because Chevrotain's error-recovery, given `CLASS`/`public` as ID-category tokens, recovered two bogus `LibFunction` entries (named `class` and `BBjAPI`) despite 3 parser errors. Removing the ID category made recovery produce zero declarations instead, so the `BBjAPI` name never entered scope.
- **Fix:** Reverted the token-builder change entirely (back to the original `EXCLUDED` set). Kept only the grammar-only fix (`FNEND?`) in `bbj.langium`. This is also required independently: the plan's own "Working rules for the executor" explicitly forbid editing `bbj-vscode/src/language/bbj-token-builder.ts` in this wave (reserved for a different plan).
- **Files modified:** `bbj-vscode/src/language/bbj-token-builder.ts` (edited, then reverted to its original state -- final diff against the wave's starting commit is empty for this file)
- **Verification:** Re-ran `test/linking.test.ts` standalone (23 passed, 19 skipped, 0 failed) and the full whole-suite gate (`numFailedTests: 0`) after reverting.
- **Committed in:** not committed -- the change was made and reverted entirely within this session before any commit; only the grammar-only fix reached a commit (`abff9fc4`).

---

**Total deviations:** 1 auto-fixed-then-reverted (1 bug, caught before it reached a commit)
**Impact on plan:** No regression shipped. The class/interface/nested-def edge case remains open and is documented above and in `key-decisions` for plan 06's residue triage, exactly as the plan's own Flagged Assumptions anticipated might be necessary.

## Issues Encountered
- Chevrotain ambiguity warning count was compared before and after the grammar change by regenerating with each version of `bbj.langium` in turn (Node 22, `npm run langium:generate`): 0 ambiguity-related lines in the generator's own output both before and after. No new ambiguity warning was introduced.
- The literal word "FNEND" appearing three times in an early draft of the fixture's leading `REM` prose inflated `grep -ci 'fnend'` to 4 (the acceptance criterion counts matching lines, and `grep -c` counts one per line regardless of how many times the pattern appears within it, but each `REM` line naming the marker in prose was itself a matching line). Reworded the comment to describe the closing marker without repeating its literal name, bringing the count to the required 1 (the single real `FNEND` token in code).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The three positive shapes (no marker, trailing space, blank line) and the closed-then-unclosed mix all validate clean with regression protection in place.
- The class/interface/nested-unclosed-DEF edge case is fully diagnosed and ready for plan 06's residue triage: the cause (CLASS/INTERFACE/DEF keeping the generic ID category), the two concrete symptoms (a hard parser error for class/interface, a silent misparse with no second DefFunction node for nested DEF), and why a token-category fix collides with `BBjAPI()`'s recovery-based resolution are all recorded in `key-decisions` above. Confirmed not present in this phase's corpus target shape.
- No blockers for the next plan.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/bbj.langium
- FOUND: bbj-vscode/test/test-data/conformance/def-fn-unclosed-body.bbj
- FOUND: bbj-vscode/test/line-break-validation.test.ts
- FOUND commit: abff9fc4 (feat(98-05): make a multi-line DEF FN's closing FNEND optional)
- FOUND commit: 09b36def (test(98-05): cover unclosed DEF FN bodies and keep FNEND's own line rejected)
- Re-ran plan `<verification>` block 1 (targeted set, run individually per-file due to documented beforeAll contention): all files pass, 0 failures.
- Re-ran plan `<verification>` block 2 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (1759 passed, 275 skipped/pending) -- 7 failed suites are pre-existing `beforeAll` hook timeouts under contention plus the known e2e "No document found" flake, per the whole-suite gate substitution standing decision.
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows no stray scratch probe file and nothing under `bbj-vscode/src/language/generated/` (only the pre-existing untracked `.planning/milestone.lock`).
