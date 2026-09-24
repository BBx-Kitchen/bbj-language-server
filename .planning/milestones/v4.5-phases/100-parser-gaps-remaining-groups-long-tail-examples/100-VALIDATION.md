---
phase: "100"
slug: "parser-gaps-remaining-groups-long-tail-examples"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-21"
reconciled: "2026-09-21 (100-06 Task 1)"
---

# Phase 100 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts test/parser-keyword-statements.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` |
| **Estimated runtime** | quick ~10 seconds · full ~4 minutes |

**Judging rule.** The whole suite is judged on `numFailedTests: 0`. "Failed suites" with zero failed
tests are `beforeAll` hook timeouts under contention, plus the known environment failure of
`test/functional/installed-extension-e2e.test.ts` when the installed bundle is stale. vitest needs
cwd = `bbj-vscode`. The reporter name `basic` does not exist in this vitest — never use it.

---

## Sampling Rate

- **After every task commit:** the quick run command, plus the test file the task itself adds or touches
- **After every plan wave:** the full suite command
- **After each construct group lands, and once more after the last source change:** the private
  conformance harness (orchestrator-run; snapshot `details.json` first, diff file sets)
- **Before `/gsd-verify-work`:** full suite `numFailedTests: 0`, A ≤ 25, A2 ≤ 23
- **Max feedback latency:** 15 seconds (quick run)

---

## Per-Task Verification Map

Filled by the planner — one row per task. Requirement → test anchors. The fixture named for the
bracket group is `array-bracket-forms.bbj`: the type-side shapes share the array group's single
regression file, per the phase context's own decision, rather than getting a second file.

| Plan / Task | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-------------|----------|-----------|-------------------|-------------|--------|
| 100-01 T1 (tracer) | PARSE-04 | empty brackets parse at all eleven call sites and yield the whole-array node (marker true, empty index list) | unit (parse + AST property) | `cd …/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts` + `test/test-data/conformance/array-bracket-forms.bbj` | ✅ (fixture created, plan 01) | ✅ |
| 100-01 T2 | PARSE-04, PARSE-05 | multi-pair type brackets on four declaration sites; post-name whole-array marker on a parameter; pair-count reads in `check-classes.ts`; still-flagged bracket forms; identifier cases | unit (parse + validate + AST property) | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/lexer.test.ts test/classes.test.ts test/class-validations-issues.test.ts test/validation.test.ts test/declare-in-class.test.ts test/method-return-java-type.test.ts test/line-break-validation.test.ts test/example-files.test.ts` | ✅ (test file exists) | ✅ |
| 100-01 T3 | PARSE-04, PARSE-05 | group measured; conformance record opened with baselines | manual (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ (`100-CONFORMANCE.md` opened, plan 01) | ✅ |
| 100-02 T1 (tracer) | PARSE-06 | a semicolon-introduced comment after all five block boundaries, end-of-file and mid-stream, with no error-severity diagnostic | unit (parse + validate) | `… npx vitest run test/conformance-regressions.test.ts` + `test/test-data/conformance/rem-after-block-boundaries.bbj` | ✅ (fixture created, plan 02) | ✅ |
| 100-02 T2 | PARSE-06 | line-numbered class code parses; the three already-working line-number shapes unchanged; still-flagged and identifier cases | unit | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/lexer.test.ts test/classes.test.ts test/line-numbering.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/line-break-single-line-if.test.ts test/example-files.test.ts` | ✅ (`line-numbered-class.bbj` created, plan 02) | ✅ |
| 100-02 T3 | PARSE-06 | group measured; any validator false alarm the parser fix unmasked named by message group | manual (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ✅ |
| 100-03 T1 (tracer) | PARSE-08 | oracle sweep built, validated against a known-rejected word, three lists produced; one word green in four positions | unit + oracle (compiler) | `… npx vitest run test/conformance-regressions.test.ts` + `test/test-data/conformance/language-words-as-names.bbj` | ✅ (fixture created, plan 03) | ✅ |
| 100-03 T2 | PARSE-08 | every fix-list word working in its claimed positions by its own mechanism; branch-target order; identifier and comment probes; still-flagged cases | unit | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/lexer.test.ts test/classes.test.ts test/linking.test.ts test/definition.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/example-files.test.ts` | ✅ | ✅ |
| 100-03 T3 | PARSE-08 | group measured; sweep result and the not-flagged rejected-word list recorded | manual (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ✅ |
| 100-04 T1 (tracer) | PARSE-09 | every long-tail candidate has a compiler verdict, a parser verdict and a fixed-or-recorded decision; the verb with no rule parses | unit + oracle (compiler) | `… npx vitest run test/conformance-regressions.test.ts` + `test/test-data/conformance/statement-option-tails.bbj` | ✅ (fixture created, plan 04) | ✅ |
| 100-04 T2 | PARSE-09 | option tails in either order, single-option, no-tail and unspaced forms; still-flagged and identifier cases | unit | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/lexer.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/example-files.test.ts` | ✅ | ✅ |
| 100-04 T3 | PARSE-09 | group measured; shape-level residue skeleton written with counts and reason categories; per-file mapping handed over | manual (private harness + orchestrator per-file look) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ✅ |
| 100-05 T1 (tracer) | EXMP-01 | recursive compile sweep; two-layer test; `examples/invalid/` with README and sidecar format; one repair and one move green | unit + BBj-gated | `… RUN_BBJ_TESTS=0 npx vitest run test/examples-compile.test.ts` and `… RUN_BBJ_TESTS=1 npx vitest run test/examples-compile.test.ts` | ✅ (test file, folder, README created, plan 05) | ✅ |
| 100-05 T2 | EXMP-01 | every remaining failing example repaired, split or moved with sidecar and README line; the cross-file quoted line updated in the same task; the false-premise file moved with a filed todo | unit | `… npx vitest run test/examples-compile.test.ts test/imports.test.ts test/linking.test.ts test/textmate-bbx-highlighting.test.ts test/utils.test.ts test/example-files.test.ts` | ✅ (after T1) | ✅ (per plan 05's own deviation record: repaired rather than moved+todo'd for 3 files — see 100-05-SUMMARY.md) |
| 100-05 T3 | EXMP-01 | fresh whole-set sweep; both layers over a non-empty list; the three single-file references resolve | unit + BBj-gated + whole suite | `… RUN_BBJ_TESTS=1 npx vitest run test/examples-compile.test.ts` and `… RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | ✅ (after T1) | ✅ |
| 100-06 T1 | all six | final tree coherent: generated parser current, source clean, suite green on failed tests, register check clean, verification map reconciled | whole suite | `cd …/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | ✅ | ✅ (0 failed tests beyond the two documented environment exceptions below — hook-timeout suites and 3 pre-existing `linking.test.ts` BBjAPI failures, live java-interop backend drift since 2026-09-03, unrelated to this phase's diff and independently reproduced by 100-04 and 100-05's own whole-suite runs) |
| 100-06 T2 | PARSE-09 (+ all) | closing run; gate table with each value against its threshold; A2 and B movement by file-set difference; residue list completed | manual (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ✅ |
| 100-06 T3 | all six | per-criterion verdict with named evidence; requirement-to-evidence chain; deliberate non-goals; conditional stop on a missed gate | unit + human review at end of phase | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/examples-compile.test.ts test/example-files.test.ts` plus the `<human-check>` harvested into the phase UAT | ✅ | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Gate thresholds used by 100-06.** List A at or below 25 (25 passes, 26 fails); A2 at or below the
Phase 99 close of 23 (23 passes, 24 fails); B recorded with per-file evidence, not gated. Every gate
number is an integer file count from the harness details file.

---

## Wave 0 Requirements

- [x] Five conformance fixtures under `bbj-vscode/test/test-data/conformance/`:
      `array-bracket-forms.bbj` (100-01), `rem-after-block-boundaries.bbj` and
      `line-numbered-class.bbj` (100-02), `language-words-as-names.bbj` (100-03),
      `statement-option-tails.bbj` (100-04) — confirmed present alongside the fourteen inherited
      fixtures (19 total in the folder) by 100-06 Task 1
- [x] `bbj-vscode/test/examples-compile.test.ts` and `examples/invalid/` with its README and one
      sidecar per deliberately-invalid program (100-05 T1) — confirmed present by 100-06 Task 1
- [x] `.planning/phases/100-…/100-CONFORMANCE.md`, opened by 100-01 T3 — carries plans 01-05's
      sections; 100-06 appends the closing sections
- [x] No framework or harness change — `conformance-regressions.test.ts` picks up any `.bbj` dropped
      into its folder, and `bbj-vscode/test/parser-keyword-statements.test.ts` already exists and
      gains one describe block per construct group

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A ≤ 25, A2 ≤ 23, B movement classified | PARSE-09 | the corpus and harness are private and never run in CI | orchestrator runs `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` after a snapshot, diffs file sets, records counts and own-words shapes only |
| Shape-level residue list is complete | PARSE-09 | needs a per-file look at private sources | orchestrator classifies every remaining list-A entry; per-file mapping written in the corpus repo |
| Every valid example compiles with `bbjcpl` | EXMP-01 | needs a local BBj install | `RUN_BBJ_TESTS=1` run of the examples test on a machine with `/opt/bbx/bin/bbjcpl` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** reconciled by 100-06 Task 1 (2026-09-21) — every row of the Per-Task Verification Map
carries a status and a real task reference; all Wave 0 artifacts confirmed present on disk. The whole
vitest suite reports `numFailedTests: 0` beyond two documented environment exceptions: (1) hook-timeout
`beforeAll` failures under contention on 5 files plus the known stale-bundle
`installed-extension-e2e.test.ts` failure (this project's own standing judging rule, both zero-failed-test
"failed suites"), and (2) 3 `linking.test.ts` BBjAPI-resolution test failures — live java-interop on
`:5008` triggers `shouldRunBBjTests()`'s bare-TCP-connect gate independent of `RUN_BBJ_TESTS`, and the
backend's `getAllClassNames` exposure has drifted since 2026-09-03 (this project's own standing memory
and `STATE.md`'s documented "Test-harness false positive" blocker). Neither exception touches a file
this phase's diff modifies; both are independently reproduced, unrelated, and already classified
out-of-scope by 100-04's and 100-05's own whole-suite runs earlier in this same phase.

---

## Validation Audit 2026-09-23

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

The map reconciled by 100-06 holds on the current tree. Every requirement (PARSE-04, -05, -06, -08,
-09, EXMP-01) has a test on disk that targets its behaviour. Re-run results:
`parser-keyword-statements` 332/332, `conformance-regressions` + `examples-compile` 8 passed /
2 skipped with `RUN_BBJ_TESTS=0`, `examples-compile` 6/6 with `RUN_BBJ_TESTS=1` against a real
`bbjcpl`, and the `linking` BBjAPI regression guard 3/3. The BBjAPI linking failures recorded above
did not reproduce in this run. A hook timeout seen while other suites ran in parallel cleared when
the file was re-run alone.
