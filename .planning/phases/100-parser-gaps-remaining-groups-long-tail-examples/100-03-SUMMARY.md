---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
plan: 03
subsystem: parser
tags: [langium, grammar, bbj, chevrotain, lexer, token-categories, oracle-sweep]

requires:
  - phase: 100-02
    provides: the block-boundary and line-numbered-class group's conformance record and the shared parser-keyword-statements.test.ts structure this plan extends with its own describe block
provides:
  - "An oracle sweep against the real bbjcpl compiler, validated against a known-rejected word, covering every one of the 169 keyword literals in bbj.langium in a variable position (plain read, every type suffix, and a binary-operand form with no statement boundary to hide behind), a label declaration and a branch target including the last entry of a multi-target list"
  - "declare, auto, library, use and var widened into FeatureName and LabelName (the Phase 99 label/void mechanism); void widened into LabelName"
  - "start, next, methodret, print, write, delete, save, enter, read, input, extract and find fixed as ordinary variables via an explicit ID-category grant on their own custom-pattern lexer token (START_BREAK, NEXT_BREAK, METHODRET_END, PRINT_STANDALONE_NL, KEYWORD_STANDALONE)"
  - "next fixed even though not part of the systematic keyword-literal sweep -- discovered broken despite the roadmap's own already-working claim, by this plan's deeper sweep"
  - "classend/methodend/interfaceend's EXCLUDED-set removal tried and reverted, and PrintStatement's RECORD-flag ambiguity for the word record left unfixed -- both recorded as residue with full probe evidence, no lookahead gate or guard predicate built"
  - "language-words-as-names.bbj extended to the fourteen already-working roadmap words plus every word this plan fixed; parser-keyword-statements.test.ts gained the group's permanent describe block (positions, ordering, identifier-adjacency, comment-separation, still-flagged cases)"
  - "100-CONFORMANCE.md's plan 03 measurement and full oracle-sweep record"
affects: [100-04, 100-05, 100-06]

actuals:
  tokens: 8300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Explicit CATEGORIES/LONGER_ALT grant on a custom-pattern lexer token, mirroring the file's own RELEASE_NL/RELEASE_NO_NL/EXIT_NO_NL precedent, extended from one word (start) to five tokens covering twelve words -- the token's own bare-statement alternative still wins at the top of the statement list, since CATEGORIES only adds a second, identifier-position use"
    - "Gate-then-revert discipline for a higher-risk token-builder change: probe before, apply, probe after, run the full blast-radius suite, and revert on ANY regression rather than reach for a lookahead gate or guard predicate"

key-files:
  created:
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-03-SUMMARY.md
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/test/test-data/conformance/language-words-as-names.bbj
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md

key-decisions:
  - "The oracle sweep excluded four quoted strings from one comment line documenting the MNEMONIC terminal's own example arguments ('hide','lf','BOX','FONT') from the 169-word swept list -- they are prose inside a `//` comment, not grammar keyword literals; each occurs exactly once, on that comment line."
  - "The sweep's own validation used 'then' (compiled and confirmed rejected by bbjcpl) before trusting any bulk compiler-side result, per the stderr-concatenation pitfall documented in this phase's own research."
  - "The custom-pattern CATEGORIES-grant mechanism, proven safe for 'start' by prior research, was extended to five tokens (START_BREAK, NEXT_BREAK, METHODRET_END, PRINT_STANDALONE_NL, KEYWORD_STANDALONE) covering twelve words after each was independently probed before/after and run through the full blast-radius suite -- KEYWORD_STANDALONE alone fixes seven words (delete, save, enter, read, input, extract, find) sharing one token."
  - "'next' was fixed even though it never appeared in the systematic 169-word sweep (it is not a quoted grammar literal, only reachable through NEXT_BREAK/NEXT_ID) -- the roadmap's own claim that it already works at the Phase 99 close was checked directly and found false ('print next' silently produced a spurious extra statement, a deep-operand read produced a hard parser error), so it was fixed by the identical mechanism rather than left as a false claim."
  - "classend/methodend/interfaceend's EXCLUDED-set removal was tried and reverted: it let a malformed ClassDecl/MethodDecl/InterfaceDecl that fails to match for an unrelated reason (for example an invalid name) silently re-parse as a run of ordinary expression statements with zero errors, instead of the parser error it produces today -- confirmed by probe (`CLASS PUBLIC label\\nCLASSEND\\n` went from 1 parser error to 0) and by 13 blast-radius test failures across classes.test.ts and parser.test.ts. Recorded as residue; no lookahead gate or guard predicate was built to rescue it, per the plan's own prohibition."
  - "'record' was left unfixed: it is already ID-category via the generic uppercase loop, so none of the three named mechanisms applies -- the actual defect is PrintStatement's own optional record?='RECORD'? flag silently absorbing a following variable named 'record' (or the next physical line's first token) as that flag instead of as an ordinary print item. Fixing it needs a lookahead gate on the flag, explicitly out of scope for this plan; recorded as residue."

patterns-established:
  - "Deep-operand probe form (`x = 1 - word`, no trailing statement boundary) as the standard second sweep pass for every custom-pattern lexer token, catching the class of defect a bare zero-parser-errors check on a trailing 'print word' cannot see"

requirements-completed: []

coverage:
  - id: D1
    description: "The oracle sweep is computed from the compiler's stdout+stderr concatenation, validated against a known-rejected word, covers four positions per word including a binary-operand form and a multi-target branch list, and the parser side asserts statement counts as well as error counts"
    requirement: PARSE-08
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#language words as names (oracle sweep against the compiler)"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/conformance-regressions.test.ts#Every fixture in test-data/conformance parses and validates clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every word the compiler accepts and the parser rejected is fixed by the mechanism its own declaration calls for (lowercase-declared FeatureName/LabelName widening, or an explicit CATEGORIES grant on its own custom-pattern token), with no generic keyword-falls-back-to-identifier mechanism and no blanket reserved-word rule"
    requirement: PARSE-08
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#language words as names (oracle sweep against the compiler)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The two higher-risk mechanisms (EXCLUDED-set removal for classend/methodend/interfaceend, and PrintStatement's RECORD flag for record) were tried, found to regress the blast-radius suite or require a lookahead gate, and reverted/left unfixed with full probe evidence recorded rather than rescued with a new mechanism; class/method/field/parameter names stay unwidened"
    verification:
      - kind: other
        ref: "git diff -- bbj-vscode/src/language/bbj.langium confirms ValidName is unchanged; the private conformance harness ran once against the finished tree with a snapshot taken first (A 16->13, at/below the plan 02 run and the phase-final <=25 gate; A2 28->27; B unchanged)"
        status: pass
    human_judgment: false
duration: 55min
completed: 2026-09-21
status: complete
---

# Phase 100 Plan 03: The Oracle Word Sweep and Per-Word Name Fixes Summary

**Every BBj grammar keyword actually compiled against `bbjcpl` in four positions instead of guessed — twelve words (plus `next`, discovered broken despite the roadmap's own claim) fixed as ordinary names by three separate lexer/grammar mechanisms, and two higher-risk mechanisms tried, found to regress or require a prohibited lookahead gate, and reverted with full evidence instead of rescued.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-21T20:57:00Z (approx, first read of the plan)
- **Completed:** 2026-09-21T21:52:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Extracted 169 distinct keyword literals from `bbj.langium` (excluding four quoted strings that are prose inside the `MNEMONIC` terminal's own doc comment, not grammar keywords) and compiled every one against the real `bbjcpl` compiler in a variable position (plain read, every type suffix, and a binary-operand form) and a label/branch-target position — validated against a known-rejected word (`then`) before trusting the bulk result, since the compiler exits zero and writes its errors to stderr only.
- Cross-referenced the compiler sweep against an identical in-process parser sweep (asserting top-level statement counts, not just error counts, to catch a word silently swallowed into a spurious extra statement): 29 word×position mismatches on the fix list across 21 distinct words, 66 mismatches on the record-only list (compiler rejects, parser already accepts — not flagged), 241 already correct.
- Fixed `declare`, `auto`, `library`, `use`, `var` by widening `FeatureName`/`LabelName` (the exact Phase 99 `label`/`void` mechanism); `void` gained the same `LabelName` widening it was still missing.
- Fixed `start`, `methodret`, `print`, `write`, `delete`, `save`, `enter`, `read`, `input`, `extract`, `find` by granting an explicit `CATEGORIES`/`LONGER_ALT` to their own custom-pattern lexer token (`START_BREAK`, `METHODRET_END`, `PRINT_STANDALONE_NL`, `KEYWORD_STANDALONE`), mirroring the file's existing `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL` grants — each gated by a before/after probe and the full blast-radius test run before being kept.
- Discovered and fixed `next` by the identical mechanism (`NEXT_BREAK`) even though it was never part of the systematic 169-word sweep (it is not a quoted grammar literal) — the roadmap's own "already works at the Phase 99 close" claim for this word was checked directly and found false.
- Tried and reverted removing `classend`/`methodend`/`interfaceend` from `BBjTokenBuilder.EXCLUDED`: it let a malformed class/method/interface silently re-parse as loose expression statements with zero errors instead of the parser error it produces today (13 blast-radius test failures, confirmed by a direct probe). Recorded as residue, not fixed — no lookahead gate or guard predicate was built to rescue it.
- Left `record` unfixed: already ID-category via the generic loop, so none of the three named mechanisms applies; the real defect is a `PrintStatement` grammar ambiguity (its own optional `RECORD` flag) that needs a lookahead gate, explicitly out of scope. Recorded as residue.
- Extended `language-words-as-names.bbj` to the fourteen already-working roadmap words plus every word this plan fixed, and added a new permanent describe block to `parser-keyword-statements.test.ts`: every fixed word in all four positions and three letter cases, the multi-target branch-ordering case, identifier-adjacency and comment-separation probes for every word touched, and two still-flagged cases.
- `100-CONFORMANCE.md`'s plan 03 section: A 16 → 13 (−3, at/below the plan 02 run and the phase-final ≤25 gate), A2 28 → 27 (−1, improved though still above the Phase 99 close of 23), B 669 (unchanged). 0 files moved the wrong way this run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Run the oracle sweep, then take one word end-to-end** - `a9aeb49d` (feat)
2. **Task 2: The rest of the fix list, by mechanism, with the risky one gated** - `95c9c79c` (feat)
3. **Task 3: Measure the group and record the rejected-word set** - `56809e06` (docs)

_Phase base commit (taken before this plan's first commit): `65b93f87` (the orchestrator's per-file look, appended after plan 02)._

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - `FeatureName` gained `declare`/`auto`/`library`/`use`/`var`; `LabelName` gained the same five plus `void`, each with its own comment
- `bbj-vscode/src/language/bbj-token-builder.ts` - `START_BREAK`, `NEXT_BREAK`, `METHODRET_END`, `PRINT_STANDALONE_NL` and `KEYWORD_STANDALONE` each gained an explicit `CATEGORIES`/`LONGER_ALT` grant; `EXCLUDED`'s doc comment records the tried-and-reverted removal
- `bbj-vscode/test/test-data/conformance/language-words-as-names.bbj` - Extended to the fourteen roadmap words plus every word this plan fixed, in variable and label/branch-target position, upper/lower/mixed case
- `bbj-vscode/test/parser-keyword-statements.test.ts` - New describe block `language words as names (oracle sweep against the compiler)`: positions, ordering, identifier-adjacency, comment-separation and still-flagged cases
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` - New "Run: plan 03" measurement section and a full "Oracle sweep" record (swept-literal count, all three list sizes, the fix list word by word with mechanism and outcome, the record-only word list)

## Decisions Made

See `key-decisions` in the frontmatter for the full, precise record (the comment-noise exclusion, the sweep's own validation, the custom-pattern mechanism extended to five tokens, the `next` discovery, and both reverted/unfixed mechanisms with their evidence). In prose:

- The three established mechanisms from prior research (lowercase-declared widening, `EXCLUDED`-set membership, custom-pattern `CATEGORIES` grant) accounted for every word on the fix list except `record`, which needed a fourth, out-of-scope mechanism (a lookahead gate on `PrintStatement`'s own flag) and was left unfixed by design.
- The custom-pattern mechanism, proven for `start` alone by prior research, generalized cleanly to four more tokens covering eleven more words once each was independently gated — no cross-word interference, since each token's own bare-statement alternative is matched by TOKEN TYPE (unaffected by the category grant) while the grant only adds a second, identifier-position use.
- The `EXCLUDED`-set removal is the one mechanism this session confirmed is genuinely load-bearing: it exists specifically to keep a malformed class/method/interface a hard parser error rather than letting it silently degrade once its own terminator also becomes an ordinary identifier.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `next`, discovered broken despite the roadmap's own "already works" claim**

- **Found during:** Task 1's dedicated check of the fourteen roadmap-named words (an explicit acceptance criterion: "confirm every one of those fourteen is still in [the both-accept list], and stop and report if one is not")
- **Issue:** `next` is not a quoted grammar literal — it exists only through the custom `NEXT_BREAK`/`NEXT_ID` lexer tokens — so it was never part of the systematic 169-word sweep. A direct check found it silently broken: `print next` produced a spurious extra `NextStatement` (zero parser errors, but a wrong AST — the exact "custom-pattern token swallows its trailing terminator" blind spot this phase's own research names), and a binary-operand read (`x = 1 - next`) produced a hard parser error. The real `bbjcpl` compiler accepts `next` as an ordinary variable in both forms.
- **Fix:** Granted `NEXT_BREAK` the same `CATEGORIES`/`LONGER_ALT` treatment as `START_BREAK`, mirroring the exact mechanism research recommended for `start`. `NextStatement`'s own bare alternative is still matched by the `NEXT_BREAK` token TYPE, unaffected by the category grant.
- **Files modified:** `bbj-vscode/src/language/bbj-token-builder.ts`
- **Verification:** Before/after probe (variable position, label/branch position, identifier-adjacency, comment-separation), the full blast-radius suite green, and confirmed in `100-CONFORMANCE.md`'s oracle-sweep record.
- **Committed in:** `95c9c79c` (Task 2 commit)

**2. [Rule 3-adjacent — anticipated contingency, not a blocking issue] Removed four comment-only words from the swept literal list**

- **Found during:** Task 1's keyword extraction
- **Issue:** A naive `grep` for single-quoted literals in `bbj.langium` also matches four example arguments (`'hide'`, `'lf'`, `'BOX'`, `'FONT'`) written inside the `MNEMONIC` terminal's own doc comment — prose, not grammar keywords.
- **Fix:** Excluded that comment line before extraction, confirmed each of the four occurs exactly once, on that comment line, nowhere else.
- **Files modified:** none (scratch extraction step only)
- **Verification:** N/A — a sweep-methodology correction, not a code change.
- **Committed in:** N/A (not a code change)

### Plan-Anticipated Contingencies (not Rule 1-4 deviations — explicitly provided for by the plan's own gate-and-revert instructions)

**3. `classend`/`methodend`/`interfaceend`'s `EXCLUDED`-set removal tried and reverted**

- **Found during:** Task 2's gated attempt at the "risky one" the plan explicitly names
- **Issue:** Removing the three names from `BBjTokenBuilder.EXCLUDED` let a malformed `ClassDecl`/`MethodDecl`/`InterfaceDecl` that fails to match for an unrelated reason (for example an invalid name) silently re-parse its own now-ID-category terminator, plus every other already-ID-category keyword on the same broken line, as a run of ordinary expression statements with zero parser errors — turning a real syntax problem into a silent misparse. Confirmed by a direct probe (`CLASS PUBLIC label\nCLASSEND\n` went from 1 parser error to 0) and by 13 blast-radius test failures across `classes.test.ts` and `parser.test.ts`.
- **Resolution:** Reverted the removal; `EXCLUDED` still contains all three, with a doc comment recording the tried-and-reverted evidence. No lookahead gate, guard predicate or other new mechanism was built to rescue it, per the plan's own explicit prohibition.
- **Files modified:** `bbj-vscode/src/language/bbj-token-builder.ts`
- **Recorded in:** `100-CONFORMANCE.md`'s oracle-sweep section (fix list row for each of the three words)
- **Committed in:** `95c9c79c` (Task 2 commit — the revert is part of the same commit as the attempt, since it never landed on its own)

**4. `record` left unfixed — a fourth mechanism, out of scope**

- **Found during:** Task 2's per-word mechanism assignment
- **Issue:** `record` is already ID-category via the generic uppercase loop (none of the three named mechanisms — lowercase-declared, `EXCLUDED`-set, custom-pattern grant — applies). The actual defect is `PrintStatement`'s own optional `record?='RECORD'?` flag silently absorbing a following variable literally named `record` (or the next physical line's first token) as that flag instead of as an ordinary print item.
- **Resolution:** Left unfixed. Fixing it needs a lookahead gate on the flag, which the plan explicitly prohibits ("do not build a lookahead gate, a guard predicate or any other new mechanism"). Recorded as residue with full reasoning in `100-CONFORMANCE.md`.
- **Files modified:** none
- **Recorded in:** `100-CONFORMANCE.md`'s oracle-sweep section

---

**Total deviations:** 1 auto-fixed bug (Rule 1, `next`), 1 sweep-methodology correction (not a code change), 2 plan-anticipated contingencies (tried-and-reverted / left-unfixed, both explicitly provided for by the plan's own gate instructions).
**Impact on plan:** No scope creep beyond what the plan's own acceptance criteria required (the fourteen roadmap words confirmed working, every fix-list word fixed or recorded with a named reason). All auto-fixes necessary for correctness; both contingencies followed the plan's own explicit "revert and record, do not build a new mechanism" instruction to the letter.

## Issues Encountered

None beyond the two contingencies already covered under Deviations. `vitest`'s known `beforeAll` hook-timeout flake under contention (documented project memory) recurred repeatedly during blast-radius runs; every flaky file was re-run in isolation and passed, confirmed not a real regression each time.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `language-words-as-names.bbj` and this plan's `parser-keyword-statements.test.ts` describe block are in place; plans 04-06 do not extend this group further (the oracle sweep is this plan's own closed scope).
- `100-CONFORMANCE.md` carries plan 01, 02 and 03's sections; plan 04 appends its own, and plan 06 closes it with the final gate table.
- **0 files moved the wrong way this run** — nothing handed to the orchestrator this time.
- Residue for the long-tail triage (plan 04): `classend`/`methodend`/`interfaceend` as names (the `EXCLUDED`-set removal's load-bearing risk, confirmed not merely theoretical), and `record` as a name (a `PrintStatement` grammar ambiguity needing a lookahead gate) — both fully evidenced in `100-CONFORMANCE.md`'s oracle-sweep section, not corpus-file-specific.
- `PARSE-08` is NOT marked complete in `REQUIREMENTS.md` — three more plans in this phase remain open (project-specific working rule #6).

---
*Phase: 100-parser-gaps-remaining-groups-long-tail-examples*
*Completed: 2026-09-21*

## Self-Check: PASSED

All five key files confirmed present on disk (`bbj-vscode/src/language/bbj.langium`, `bbj-vscode/src/language/bbj-token-builder.ts`, `bbj-vscode/test/test-data/conformance/language-words-as-names.bbj`, `bbj-vscode/test/parser-keyword-statements.test.ts`, `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md`). All three task commit hashes (`a9aeb49d`, `95c9c79c`, `56809e06`) confirmed present in `git log --oneline --all`.
