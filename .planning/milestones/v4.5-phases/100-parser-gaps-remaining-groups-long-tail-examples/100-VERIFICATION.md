---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
verified: 2026-09-22T04:54:54Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: no prior VERIFICATION.md existed for this phase
---

# Phase 100: Parser Gaps — Remaining Groups, Long Tail & Examples Verification Report

**Phase Goal:** The remaining named list-A groups parse, every file still on list A is either
fixed or recorded with the reason it stays, and the repository's own `examples/` no longer
disagrees with the compiler.
**Verified:** 2026-09-22T04:54:54Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The empty-bracket whole-array form `name[]` parses wherever an array element can stand (PRINT item, DREAD target, assignment target, CALL/XCALL/method/function argument), same meaning as `name[all]`; type-side bracket shapes (`declare int[][] two!`, `BBjArray dat[all]`) parse too | ✓ VERIFIED | `bbj.langium` array-element rule now accepts empty brackets; fixture `array-bracket-forms.bbj` exercises every named call site, both suffix and case variants; `npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts` — 342/342 pass (independently re-run). Grammar confirmed to route the empty form through the same `[all]` node (no new AST type). |
| 2 | `; rem` after `METHOD` header, `METHODEND`, `CLASSEND`, `FNEND`, single-line `DEF FN`, and line-numbered class code parse without error | ✓ VERIFIED | Fixtures `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj`; same test run passes; grammar diff shows the five boundary literals each gained an optional comment tail; `check-classes.ts`/`line-break-validation.ts` widened for the bare-`; rem`-with-no-body case found mid-phase (classend/endif false alarms cleared, confirmed in this run). |
| 3 | Words BBj allows as names (fourteen roadmap-named words, locked in; rest via oracle sweep against `bbjcpl`) work as variables, labels, `GOSUB`/`GOTO` targets, without a blanket reserved-word rule and without flagging compiler-rejected words | ✓ VERIFIED | Fixture `language-words-as-names.bbj` (169-file lines) covers all fourteen roadmap words plus every oracle-sweep fix (`declare`, `auto`, `use`, `var`, `void`, `start`, `methodret`, `print`, `write`, `delete`, `enter`, `extract`, `find`, `input`, `read`, `save`, `next`). Grammar diff confirms per-word literals added to `FeatureName`/`LabelName`, no generic fallback mechanism (`git diff --stat` shows exactly 4 source files touched, each a named, scoped grant). `record`, `classend`, `methodend`, `interfaceend` left unfixed with recorded reasons (tried-and-reverted, evidenced in 100-CONFORMANCE.md). |
| 4 | Conformance run reports A ≤ 25, and every shape still on list A is recorded (own-words shape, file count, reason) | ✓ VERIFIED | 100-CONFORMANCE.md closing run: A = 9 (gate ≤25, PASS), A2 = 22 (gate ≤23, PASS). All 9 list-A files have a filled shape row: 8 filled at plan 06's close, the 9th (a `METHOD`-declaration file, "Residue file F") isolated by a follow-up orchestrator note to "multi-line DEF FN without FNEND, one arrangement Phase 98 did not cover" — see caveat below. Human explicitly accepted this exact disposition on 2026-09-22 (100-06-SUMMARY.md "Checkpoint Resolution"), and REQUIREMENTS.md records PARSE-09 Complete with that residue noted. |
| 5 | Every `.bbj` file under `examples/` either compiles with `bbjcpl` or lives in `examples/invalid/` with asserted diagnostics (incl. explicit "none today") | ✓ VERIFIED | `examples-compile.test.ts` always-on layer: covered by the 342-test run above. BBj-gated layer independently re-run with `RUN_BBJ_TESTS=1`: 6/6 pass. Direct `bbjcpl -N` spot-check on 5 repaired examples (`mnemonics.bbj`, `files.bbj`, `issue181-release-syntax.bbj`, `issue246.bbj`, `using-java.bbj`) — all exit 0, no errors. `examples/invalid/dim-examples-substring-expressions.bbj` independently compiled with `bbjcpl -N` — 3 errors on stderr as expected (compiler exits 0 but reports errors on stderr, matching the project's documented oracle behavior). `examples/invalid/README.md` documents the sidecar format; 92 valid + 1 invalid file counts confirmed on disk. |

**Score:** 5/5 roadmap success criteria verified.

### Caveat on Criterion 4 (documentation coherence, not functional)

`100-CONFORMANCE.md`'s "completed residue list" table (around line 653) still literally reads
`**pending**` / `**pending** — the orchestrator's own probe did not isolate the cause in the time
allowed; no category is guessed` for the ninth list-A file ("Residue file F"), and the "Closing
attestation" / "Developer verification block" sections built from that table still say "Partially
holds" / "NOT complete". A later, separately-appended section ("### Residue file F — cause
isolated (orchestrator, after plan 06)", added after the human's accept decision) narrows the
cause to a known shape ("multi-line `DEF FN` without `FNEND`, followed by a `class` block — the
one arrangement Phase 98 did not cover") and asserts "All 9 list-A entries have an own-words
shape," but does not edit the table row or the two summary sections above it to match. The
resolving reason string ("known shape, uncovered arrangement") also does not literally match one
of D-12's four permitted reason categories, though it is closest to "valid but disproportionate to
fix now."

This is a real internal inconsistency in the tracked artifact, but it is not a functional gap: the
numeric gates (A=9, A2=22) both independently verified to pass; the underlying cause for the 9th
file is genuinely documented (just not synced back into the summary table); and a human explicitly
reviewed and accepted this exact state on 2026-09-22, after which `REQUIREMENTS.md` was updated to
mark PARSE-08/PARSE-09 Complete with the residue noted. Recorded here as a WARNING for a future
reader of `100-CONFORMANCE.md`, not as a blocking gap — no re-opened human decision is requested,
since one was already made on this specific point.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj.langium` | empty-bracket array rule, block-boundary comment tails, line-numbered class code, per-word name grants, option-tail widenings | ✓ VERIFIED | Diffed against phase base commit; matches every named change in 100-CONFORMANCE.md |
| `bbj-vscode/src/language/bbj-token-builder.ts` | `CATEGORIES`/`LONGER_ALT` grants for custom-pattern keyword tokens | ✓ VERIFIED | 68 lines added, diffed; `library` correctly excluded from the variable grant (guard test present) |
| `bbj-vscode/src/language/validations/check-classes.ts` | `array?` → `arrayDims` rename for multi-pair bracket support | ✓ VERIFIED | 6-line diff, confirmed zero remaining `.array` consumers (per code review) |
| `bbj-vscode/src/language/validations/line-break-validation.ts` | widened regex to tolerate bare `; rem` with no body after a block boundary | ✓ VERIFIED | 16-line diff |
| `bbj-vscode/test/test-data/conformance/array-bracket-forms.bbj` | regression fixture for PARSE-04/PARSE-05 | ✓ VERIFIED | 43 lines, exercises every named call site, suffix and case variant (read directly) |
| `bbj-vscode/test/test-data/conformance/rem-after-block-boundaries.bbj` | regression fixture for PARSE-06 | ✓ VERIFIED | 34 lines, present |
| `bbj-vscode/test/test-data/conformance/line-numbered-class.bbj` | regression fixture for PARSE-06 | ✓ VERIFIED | 52 lines, present |
| `bbj-vscode/test/test-data/conformance/language-words-as-names.bbj` | regression fixture for PARSE-08 | ✓ VERIFIED | 169 lines, covers fourteen roadmap words + all oracle-fixed words |
| `bbj-vscode/test/test-data/conformance/statement-option-tails.bbj` | regression fixture for PARSE-09 long tail | ✓ VERIFIED | 38 lines, present |
| `bbj-vscode/test/examples-compile.test.ts` | two-layer examples compile test (EXMP-01) | ✓ VERIFIED | always-on layer covered in the 342-test run; BBj-gated layer independently re-run, 6/6 pass |
| `examples/invalid/README.md` + sidecar | deliberately-invalid example documentation | ✓ VERIFIED | present, read in full, matches disk contents (1 file/1 sidecar pair) |
| `.planning/phases/.../100-CONFORMANCE.md` | measurement record, gate table, residue list | ✓ VERIFIED (with the documented coherence caveat above) | gate numbers independently reproduced by direct inspection of the diff and by running the tests; residue table row inconsistency noted |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj.langium` array-element rule | `check-variable-scoping.ts` / type inferer | shared `[all]` node, no new AST type | ✓ WIRED | Confirmed by code review pass and by `array-bracket-forms.bbj`'s AST-shape assertions in `parser-keyword-statements.test.ts` passing |
| `bbj-vscode/test/test-data/conformance/*.bbj` | `conformance-regressions.test.ts` | generic `fs.readdirSync` glob over the folder, no per-file test wiring needed | ✓ WIRED | Read the test file directly — confirmed generic; re-run of the suite exercises all five new fixtures |
| `examples/` and `examples/invalid/` | `examples-compile.test.ts` | `collectBbjFiles(examplesRoot, invalidRoot)` + sidecar pairing check | ✓ WIRED | Both layers independently re-run; BBj-gated layer proves the wiring reaches the real compiler, not a stub |
| `library` keyword | `Model: Library \| Program` entry rule / `BBjAPI()` linking | reverted from `FeatureName`, kept in `LabelName` only | ✓ WIRED | `linking.test.ts -t "BBjAPI"` — 3/3 pass (independently re-run); guard test `parser-keyword-statements.test.ts` "the library word stays reserved at statement start" present and passing |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase's own test files pass | `npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/examples-compile.test.ts --maxWorkers=2` | 342/342 passed | ✓ PASS |
| BBjAPI linking regression fix holds | `npx vitest run test/linking.test.ts -t "BBjAPI" --maxWorkers=2` | 3/3 passed | ✓ PASS |
| BBj-gated examples layer (real compiler) | `RUN_BBJ_TESTS=1 npx vitest run test/examples-compile.test.ts --maxWorkers=2` | 6/6 passed | ✓ PASS |
| Whole-suite regression check | `npx vitest run --maxWorkers=2` | 11 failed / 2315 passed / 88 skipped — all 11 failures confined to `test/linking.test.ts` Interop-related tests, matching this phase's own documented baseline (java-interop `:5008` backend drift; explicitly reconfirmed as the correct baseline of 11, not 14, by the `library` regression-gate fix commit `a828854c`) | ✓ PASS (no new regressions) |
| 5 repaired `examples/` files compile with the real compiler | `bbjcpl -N` on `mnemonics.bbj`, `files.bbj`, `issue181-release-syntax.bbj`, `issue246.bbj`, `using-java.bbj` | all exit 0, no stderr output | ✓ PASS |
| `examples/invalid/` file is genuinely rejected | `bbjcpl -N dim-examples-substring-expressions.bbj` | 3 errors on stderr (exit 0, per the compiler's own stdout/stderr convention) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PARSE-04 | 100-01 | Empty-bracket whole-array form parses at every named call site | ✓ SATISFIED | `array-bracket-forms.bbj` + passing test; REQUIREMENTS.md marks Complete |
| PARSE-05 | 100-01 | DREAD into arrays, type-side bracket shapes | ✓ SATISFIED | Same fixture, same test; REQUIREMENTS.md marks Complete |
| PARSE-06 | 100-02 | `; rem` after block boundaries, line-numbered class code | ✓ SATISFIED | `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj`; REQUIREMENTS.md marks Complete |
| PARSE-08 | 100-03 | Language words as names via oracle sweep | ✓ SATISFIED | `language-words-as-names.bbj`; oracle sweep record in 100-CONFORMANCE.md; REQUIREMENTS.md marks Complete with residue noted (`record`, `classend`, `methodend`, `interfaceend` stay keyword-only) |
| PARSE-09 | 100-04, 100-06 | Every remaining list-A shape fixed or recorded | ✓ SATISFIED (with documentation-coherence caveat above) | `statement-option-tails.bbj`; shape-level residue table in 100-CONFORMANCE.md; REQUIREMENTS.md marks Complete with residue noted, human-accepted 2026-09-22 |
| EXMP-01 | 100-05 | `examples/` compiles or is deliberately invalid, asserted | ✓ SATISFIED | `examples-compile.test.ts` both layers independently re-run and passing; REQUIREMENTS.md marks Complete |

No orphaned requirements found — `REQUIREMENTS.md`'s "Phase 100" rows map exactly to the six
requirement IDs declared by this phase's plans (PARSE-04, -05, -06, -08, -09, EXMP-01); `CONF-01`
is a cross-cutting rule mapped once to Phase 98, correctly not re-mapped here.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `100-CONFORMANCE.md` | ~653, ~712-720, ~801-804 | Residue table row and summary sections not synced with a later resolving note appended after them | ℹ️ INFO / documentation coherence | Does not affect shipped code or test behavior; the underlying fact (residue cause found) is documented, just not merged back into the earlier table/summary; already reviewed and accepted by a human on 2026-09-22 |
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any changed source or test file | — | — | Scanned `bbj.langium`, `bbj-token-builder.ts`, `check-classes.ts`, `line-break-validation.ts`, `examples-compile.test.ts`, `parser-keyword-statements.test.ts` |
| — | — | No leftover planning identifiers (`100-*`, `PARSE-*`, `D-NN`, `plan NN`) in any added line of the phase's full source/test diff | — | — | `git diff <base>..HEAD -- bbj-vscode/src bbj-vscode/test examples`, grepped for identifier patterns — no match (WR-1 from `100-REVIEW.md` was fixed in commit `ec487a70`, independently re-confirmed here) |
| — | — | Code review WR-2 (`examples-compile.test.ts`'s LinkingError exclusion scoped too broadly) left "accepted as is" by the orchestrator, with a documented rationale (no per-folder exclusion is possible without failing every Java-using example, since the single-document harness cannot resolve Java classes at all) | ℹ️ INFO | Reasonable, documented trade-off; not re-litigated here |

## Human Verification Required

None. All roadmap success criteria and requirements are independently verified against the
codebase (grammar diff, fixture contents, and live test/compiler runs), and the one open
documentation-coherence caveat (Criterion 4's residue-table row) was already presented to and
resolved by a human on 2026-09-22 (`100-06-SUMMARY.md`, "Checkpoint Resolution").

## Gaps Summary

No functional gaps found. The phase delivers on its goal: the empty-bracket array form, block-
boundary comments, line-numbered class code, and the oracle-swept language-words-as-names set all
parse per their fixtures and pass their tests (independently re-run, not just trusted from
SUMMARY.md); the conformance gate (A ≤ 25, A2 ≤ 23) passes with real margin (A=9, A2=22); every
`examples/` file compiles with the real `bbjcpl` compiler or is deliberately invalid with an
asserted sidecar (spot-checked directly against the compiler, not just the language server); no
regression was introduced beyond the pre-existing, documented `linking.test.ts` interop-environment
baseline (11 failures, independently confirmed); a real regression found and fixed at the
regression gate (`library` breaking `BBjAPI()` resolution) is verified holding via its guard test
and the BBjAPI linking tests. The one imperfection found — an un-synced residue-table row in
`100-CONFORMANCE.md` — is cosmetic, already surfaced to and accepted by a human, and does not
affect any shipped code, test, or requirement's actual satisfaction.

---

_Verified: 2026-09-22T04:54:54Z_
_Verifier: Claude (gsd-verifier)_
