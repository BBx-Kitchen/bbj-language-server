---
phase: 99-parser-gaps-the-largest-groups
verified: 2026-09-21T15:55:25Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 99: Parser Gaps — the Largest Groups Verification Report

**Phase Goal:** The four list-A groups that account for most of the rejected-but-valid files parse:
`FIELD` as a verb, `LEN=` as a channel option of `READ RECORD` and its sibling verbs, the word
`label` used as a name, and `IOLIST` — plus the phase-boundary conformance gate (roadmap Success
Criterion 5, amended by the 99-06 gap-closure plan).

**Verified:** 2026-09-21T15:55:25Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `FIELD` as a verb parses with zero lexer/parser errors, for every name/value shape, at program level and in a method body, any case, while the class-member `FieldDecl` and its no-type error stay untouched | ✓ VERIFIED | `bbj.langium:248-250` — `FieldStatement: 'FIELD' record=Expression ',' name=AdditiveExpr '=' value=Expression Err?`; `parser-keyword-statements.test.ts` "FIELD verb" describe block, 42 tests pass standalone (verified live: `npx vitest run test/parser-keyword-statements.test.ts -t "FIELD verb"` → 42 passed) |
| 2 | `LEN=` works as a channel option of `READ RECORD` and its five sibling combined verbs (spaced/fused, any case), the INPUT verifier's own `LEN=a,b` form still parses, and `LEN` is usable as a plain variable | ✓ VERIFIED | `bbj.langium:683-686` — `LastVerifyOption` split into `'LEN' '=' min ',' max \| min=Expression`; fixture `record-verbs-len-option.bbj`; "RECORD verbs LEN= channel option" describe block, incl. `bare len as a variable` case added by 1a6ff915 |
| 3 | The word `label` works as a name in every listed position (declaration alone/with statement, `GOTO`/`GOSUB`/`ON...GOTO` target, plain variable), any case; a label with any other name and the library's own symbolic-label declarations keep parsing; only `label` is widened (a class named `label` stays a parser error) | ✓ VERIFIED | `bbj.langium:444-445` (`LabelName returns string: ID \| 'label'`), `:913-920` (`FeatureName` gains `'label'`); `UserLabelRef` at `:502-503` typed by `LabelName`; fixture `label-word-as-name.bbj`; "the word `label` as a name" describe block incl. still-flagged class-name case and cross-reference resolution assertion |
| 4 | The `IOLIST` statement parses standalone and behind any label form, with a long/mixed item list, any case; a malformed item list is still an error; variables appearing only in an `IOLIST` draw no error-severity diagnostic | ✓ VERIFIED | `bbj.langium:433-435` — `IolistStatement: 'IOLIST' items+=Expression (',' items+=Expression)*`; fixture `iolist-statement.bbj`; "IOLIST statement" describe block incl. still-flagged trailing-comma case and channel-option resolution |
| 5 | The phase-boundary conformance gate: A ≤ 80, no remaining list-A first-word group of `FIELD`/`READ`/`IOLIST`/`LABEL`, A2 ≤ 27 (Phase 98's number), B recorded with per-file evidence, and each group has its synthetic regression fixture | ✓ VERIFIED | `99-CONFORMANCE.md` "Final gate table (plan 06 follow-up, closing)": A 52 (PASS ≤80), gate-2 FIELD/READ/IOLIST/LABEL all 0 (PASS), A2 23 (PASS ≤27), B 666 recorded with a named per-file classification (lost accidental catch), 0 files newly entered A or A2 against either the immediate or whole-plan before-snapshot; 5 fixtures present (confirmed live via `ls`) |
| 6 | The two deliberate non-goals hold: no blanket reserved-word rule; no new editor capability | ✓ VERIFIED | `git diff --stat eb1dd68d..HEAD -- bbj-vscode/src` (verified live) touches exactly 2 files: `bbj.langium` and `bbj-validator.ts`; `bbj-token-builder.ts`/`bbj-lexer.ts`/`check-variable-scoping.ts` byte-for-byte untouched (verified live, empty diff); all six LSP provider files (document-symbol, semantic-token, hover, completion, inlay-hint, code-action) untouched |
| 7 | The `checkCommentNewLines` false-alarm behind the A2 rise is fixed at its root (CST-leaf lookup + terminator-consuming-token exemption), not by weakening a check to hit a number | ✓ VERIFIED | `bbj-validator.ts:275-311`, `:43` (`TERMINATOR_CONSUMING_LEAF_TOKENS`); code review (99-REVIEW.md) independently traced the mechanism and confirmed the exemption set is complete; `line-break-validation.test.ts` new describe block, all green |
| 8 | The whole vitest suite reports zero failed tests on the final tree, and the phase's whole source diff carries no stray planning identifier | ✓ VERIFIED | Live run: `npx vitest run --maxWorkers=2` → "2140 passed, 43 skipped", 0 failed tests (1 failed *suite* = pre-existing `installed-extension-e2e.test.ts` environment issue, documented in `deferred-items.md` and MEMORY.md, unrelated to this phase); live `git diff eb1dd68d..HEAD -- bbj-vscode/src bbj-vscode/test \| grep -E "D-[0-9]+\|PARSE-0[0-9]\|99-0[0-9]\|gap closure\|plan 0[0-9]"` → no match |
| 9 | Requirements PARSE-01, PARSE-02, PARSE-03, PARSE-07 are each satisfied in code and test, even though intentionally left unticked in REQUIREMENTS.md pending this verification | ✓ VERIFIED | Requirement-to-evidence table in `99-CONFORMANCE.md`'s Closing attestation maps each ID to its fixture and describe block; REQUIREMENTS.md's own phase-99 row count (4: PARSE-01/-02/-03/-07) matches exactly what the six plans declared — no orphan |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj.langium` | `FieldStatement`, `LastVerifyOption` LEN split, `FeatureName`/`LabelName` 'label', `IolistStatement` | ✓ VERIFIED | All four constructs present and match plan/summary descriptions exactly (read live) |
| `bbj-vscode/src/language/bbj-validator.ts` | Reworked `checkCommentNewLines` + `TERMINATOR_CONSUMING_LEAF_TOKENS` | ✓ VERIFIED | Present, matches summary; independently reviewed in 99-REVIEW.md |
| `bbj-vscode/test/test-data/conformance/{field-verb,record-verbs-len-option,label-word-as-name,iolist-statement,comment-after-continuation}.bbj` | 5 new conformance fixtures | ✓ VERIFIED | All 5 present on disk (`ls` confirmed) |
| `bbj-vscode/test/parser-keyword-statements.test.ts` | 4 describe blocks, one per construct, each with a still-flagged case | ✓ VERIFIED | Confirmed via grep: "RECORD verbs LEN= channel option", "FIELD verb", "the word \`label\` as a name", "IOLIST statement" — each with its own still-flagged test |
| `bbj-vscode/test/line-break-validation.test.ts` | New describe block for the comment-separation fix | ✓ VERIFIED | Present, tests green |
| `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` | Full measurement record through the final gate table | ✓ VERIFIED | 15 sections, final gate table shows all rows PASS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `FieldStatement.err` | `Err`/`LabelDecl` | reused `Err` fragment, cross-reference resolution | ✓ WIRED | Grammar reuses existing `Err` fragment; resolution explicitly tested by the WR-01 follow-up commit `1a6ff915` (`labelRef.label.ref` asserted defined and matching) |
| `LabelDecl.name` / `UserLabelRef` | `LabelName` datatype rule | shared rule reference | ✓ WIRED | Both declared sites confirmed to reference `LabelName` (grammar read live) |
| `test-data/conformance/*.bbj` | `conformance-regressions.test.ts` | directory scan (`fs.readdirSync`, sorted) | ✓ WIRED | Confirmed live: test dynamically reads the whole folder, no per-file allowlist to go stale |
| Phase source diff | REQUIREMENTS.md phase-99 row | requirement IDs declared per plan | ✓ WIRED | All 4 IDs (PARSE-01/-02/-03/-07) declared across the 6 plans match REQUIREMENTS.md's own Phase 99 mapping exactly — no orphan |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `FIELD` verb + all keyword-as-identifier cases parse | `npx vitest run test/parser-keyword-statements.test.ts -t "FIELD verb"` | 42 passed | ✓ PASS |
| Full targeted phase-99 suite (parser, conformance, line-break, example-files) | `npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/line-break-validation.test.ts test/example-files.test.ts` | 206 passed / 4 skipped (1 suite hit the documented `beforeAll` hook-timeout contention) | ✓ PASS (contention, not failure — confirmed below) |
| `conformance-regressions.test.ts` re-run standalone (isolates the hook-timeout contention) | `npx vitest run test/conformance-regressions.test.ts` | 4 passed | ✓ PASS |
| `npm run build` | `cd bbj-vscode && npm run build` | tsc + esbuild, exit 0, no errors | ✓ PASS |
| Whole vitest suite, zero failed tests | `npx vitest run --maxWorkers=2` | 2140 passed, 43 skipped, 0 failed tests (1 failed suite = pre-existing `installed-extension-e2e.test.ts` env issue) | ✓ PASS |
| No stray planning identifiers in the phase's whole source diff | `git diff eb1dd68d..HEAD -- bbj-vscode/src bbj-vscode/test \| grep -E "D-[0-9]+\|PARSE-0[0-9]\|99-0[0-9]\|gap closure\|plan 0[0-9]"` | no match | ✓ PASS |
| Provider files / lexer / token-builder untouched | `git diff --stat eb1dd68d..HEAD -- bbj-vscode/src` | only `bbj.langium` + `bbj-validator.ts` changed | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; its equivalent
"probe" evidence is the private conformance harness (`node /home/coder/repos/bbj-corpus/conformance/run.mjs`),
whose recorded run output is captured in `99-CONFORMANCE.md`'s "Run: plan 06 follow-up" and "Final
gate table (plan 06 follow-up, closing)" sections per the phase's own working rules (the harness/corpus
are private and must not be re-run or read from by this verifier). Those recorded numbers were
spot-checked against the facts provided by the orchestrator (A 52, A2 23, B 666, all first-word
groups 0) and match exactly.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PARSE-01 | 99-02, 99-06 | `FIELD` as a verb parses | ✓ SATISFIED | `FieldStatement` rule + trailing `Err?`; "FIELD verb" describe block (42 tests); fixture `field-verb.bbj` |
| PARSE-02 | 99-01 | `LEN=` channel option + `LEN` as a variable | ✓ SATISFIED | `LastVerifyOption` unfuse; "RECORD verbs LEN= channel option" describe block; fixture `record-verbs-len-option.bbj` |
| PARSE-03 | 99-03 | The word `label` as a name | ✓ SATISFIED | `FeatureName`/`LabelName` widening; "the word \`label\` as a name" describe block; fixture `label-word-as-name.bbj` |
| PARSE-07 | 99-04 | `IOLIST` statement parses | ✓ SATISFIED | `IolistStatement` rule; "IOLIST statement" describe block; fixture `iolist-statement.bbj` |

No orphaned requirements — REQUIREMENTS.md's Phase 99 row set (PARSE-01, -02, -03, -07) is exactly
the union of `requirements:` fields declared across the six plans.

**Note on REQUIREMENTS.md checkboxes:** all four IDs are still shown as `Pending`/`[ ]` in
REQUIREMENTS.md by design — per the phase's own working rules and every plan's frontmatter comment,
ticking them is deliberately left to the orchestrator's phase-completion step, which runs after this
verdict. This is not a gap.

### Anti-Patterns Found

None. Scanned all 9 files touched in the phase's diff (`git diff --stat eb1dd68d..HEAD`) for
`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`placeholder`/stub-return patterns. The one pre-existing `TODO` in
`bbj.langium` (`ForStatement`) predates this phase (confirmed as pre-existing context in 99-REVIEW.md,
not a new line in this diff). No debt markers, no stub returns, no hardcoded empty data introduced by
this phase.

### Human Verification Required

None. This phase is grammar/validator-only (no UI, no new editor-visible capability — confirmed by the
diff-scoped non-goal checks above), and every truth is verifiable by static/grammar inspection plus
automated tests that were independently re-run live during this verification.

### Gaps Summary

No gaps. All four construct groups (`FIELD` verb, `LEN=` channel option, the word `label`, `IOLIST`)
parse cleanly per live grammar inspection and live test runs. The phase-boundary conformance gate,
which required a 99-06 gap-closure plan to fully close (A2 was at 30 vs the ≤27 gate, and one `FIELD`
verb residue remained, after the 99-05 closing run), now reads all-PASS in the "Final gate table (plan
06 follow-up, closing)" section, with 0 files newly entering A or A2 against either snapshot baseline
— the strict file-set condition the plan's own conditional-stop mechanism required. Two residues are
recorded as known, deliberately out-of-scope long-tail items rather than gaps: the documented `FIELD`
`{,[int]}` bracketed array-index form (no measured file needs it) and a pre-existing, unexhibited
lexer quirk merging a zero-space `:`-continuation comment into the preceding keyword (e.g. `THENREM`).
The one B regression (665→666) is a classified "lost accidental catch" — a pre-existing,
structurally-unreachable semantic defect this project's validator can never see by design — accepted
and recorded, not a fix owed by this phase.

---

_Verified: 2026-09-21T15:55:25Z_
_Verifier: Claude (gsd-verifier)_
