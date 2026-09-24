---
phase: "98"
slug: "line-break-validation-false-alarms-a2"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-20"
---

# Phase 98 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` |
| **Estimated runtime** | quick ~10-20 s per file; full suite a few minutes |

vitest must run with cwd = `bbj-vscode` (fixtures resolve relative to it). The whole suite is
judged on `numFailedTests: 0`; "failed suites" caused by `beforeAll` hook timeouts under
contention are not failures. After any grammar edit run `npm run langium:generate` (Node 22)
before the tests.

---

## Sampling Rate

- **After every task commit:** the construct's test file (`test/line-break-validation.test.ts`,
  `test/variable-scoping.test.ts`, `test/classes.test.ts`, or the new conformance-regression test)
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green, then the private conformance harness run
  (A2 ≤ 25, A and B not regressed; numbers only recorded)
- **Max feedback latency:** ~30 seconds for a quick run

---

## Per-Task Verification Map

One row per plan task. All commands run with cwd = `/home/coder/repos/bbj-language-server/bbj-vscode`
and `RUN_BBJ_TESTS=0`, prefixed `npx vitest run`.

| Plan / Task | Requirement | Behavior | Test Type | Automated Command (suffix after `npx vitest run`) | Status |
|---|---|---|---|---|---|
| 98-01 / T1 (tracer) | CONF-01, VALID-01 | the conformance harness exists and one `TABLE` line parses clean and validates at zero error-severity | unit | `test/conformance-regressions.test.ts` | ✅ green |
| 98-01 / T2 | VALID-01 | every `TABLE` variant (label, spacing, length, case, trailing `;rem`) is clean; a `TABLE` not starting a line is still flagged | unit | `test/conformance-regressions.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/example-files.test.ts` | ✅ green |
| 98-01 / T3 | CONF-01 | harness fails when the folder is empty, is order-independent, never double-asserts a flat fixture | unit | `test/conformance-regressions.test.ts test/example-files.test.ts` | ✅ green |
| 98-02 / T1 | VALID-02 | `RESTORE 0` and `LOAD "prog"` each parse into one statement of their own type; bare `RESTORE` unchanged | unit | `test/parser.test.ts test/lexer.test.ts test/example-files.test.ts test/conformance-regressions.test.ts` | ✅ green |
| 98-02 / T2 | VALID-02 | `EXIT err` parses; `IF x THEN EXIT ELSE ...` intact; a language-word label links as a branch target | unit | `test/lexer.test.ts test/parser.test.ts test/tokenized-bbj.test.ts test/line-break-walk-termination.test.ts test/line-break-validation.test.ts test/example-files.test.ts` | ✅ green |
| 98-02 / T3 | VALID-02, CONF-01 | three fixtures clean; one still-flagged case per touched rule and token | unit | `test/conformance-regressions.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/example-files.test.ts` | ✅ green |
| 98-03 / T1 | VALID-05 | both METHODRET messages are warning severity, other checks untouched | unit | `test/classes.test.ts test/class-validations-issues.test.ts test/method-return-java-type.test.ts test/declare-in-class.test.ts` | ✅ green |
| 98-03 / T2 | VALID-05 | DECLARE conflict: error in-method, warning at program level, silent for related and for unresolvable | unit | `test/variable-scoping.test.ts test/classes.test.ts test/declare-in-class.test.ts test/validation.test.ts test/unresolvable-type.test.ts` | ✅ green |
| 98-03 / T3 | VALID-05, CONF-01 | `declare-methodret.bbj` clean at error severity; still-an-error case deliberately absent | unit | `test/conformance-regressions.test.ts test/classes.test.ts test/variable-scoping.test.ts` | ✅ green |
| 98-04 / T1 | VALID-04 | labelled single-line IF, nested double-`FI`, and return-in-IF are clean; all four pre-existing negatives still flagged; walks terminate | unit | `test/line-break-walk-termination.test.ts test/line-break-walk-timeout.test.ts test/line-break-validation.test.ts test/validation.test.ts test/example-files.test.ts` | ✅ green |
| 98-04 / T2 | VALID-02 | trailing-comma `PRINT` followed by an `IF` block is clean in all four whitespace variants; `LEN` probed and recorded | unit | `test/lexer.test.ts test/parser.test.ts test/tokenized-bbj.test.ts test/line-break-walk-termination.test.ts test/line-break-validation.test.ts test/example-files.test.ts test/validation.test.ts` | ✅ green |
| 98-04 / T3 | VALID-04, CONF-01 | new file-disjoint test file with positive and still-flagged cases; two fixtures clean | unit | `test/line-break-single-line-if.test.ts test/conformance-regressions.test.ts test/line-break-walk-termination.test.ts test/line-break-walk-timeout.test.ts test/example-files.test.ts` | ✅ green |
| 98-05 / T1 | VALID-03 | an unclosed multi-line `DEF FN` is one function declaration with no diagnostic; a closed one still ends at `FNEND` | unit | `test/parser.test.ts test/lexer.test.ts test/example-files.test.ts test/variable-scoping.test.ts test/document-symbol.test.ts test/definition.test.ts test/conformance-regressions.test.ts` | ✅ green |
| 98-05 / T2 | VALID-03, CONF-01 | `def-fn-unclosed-body.bbj` clean; a statement after `FNEND` on the same line still flagged | unit | `test/conformance-regressions.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/example-files.test.ts` | ✅ green |
| 98-06 / T1 | all | whole suite green on failed-test count; generated parser current; all fixtures present; register check clean | suite | `--maxWorkers=2` | ✅ green |
| 98-06 / T2 | all (phase gate) | harness reports A2 ≤ 25 with A and B not regressed | manual (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | manual — see Manual-Only |
| 98-06 / T3 | all (phase gate) | every remaining A2 group dispositioned; criterion-4 attestation; API-coverage declaration | suite + docs | `--maxWorkers=2` | ✅ green |
| 98-07 (gap closure) | VALID-02 | a symbolic-label `RESTORE *label` target is clean, including a label named like a language word; verb-as-name guards intact | unit | `test/line-break-validation.test.ts` | ✅ green |
| 98-08 (gap closure) | VALID-04, VALID-05 | balance-counted ELSE/FI backward walks re-flag spent closers and keep nested chains clean; scalar-vs-scalar DECLARE conflict detected without a Java classpath | unit | `test/line-break-walk-termination.test.ts test/variable-scoping.test.ts` | ✅ green |
| 98-09 (gap closure) | CONF-01 | per-file root cause of the B movement (658 → 665) replayed against a baseline checkout | manual (private harness) | — | manual — see Manual-Only |
| 98-10 (gap closure) | CONF-01 (phase gate) | closing re-run and human decision on the two overrides | manual (private harness + human) | — | manual — see Manual-Only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Sampling continuity: no three consecutive tasks lack an automated verify — every task in all six
plans carries at least one runnable `<automated>` command with a stated failing direction.

---

## Wave 0 Requirements

Each gap is closed by a named task before anything depends on it — no `MISSING` sentinel remains
in any plan.

- [x] `bbj-vscode/test/test-data/conformance/` — new directory → **98-01 Task 1**
- [x] `bbj-vscode/test/conformance-regressions.test.ts` — stricter-assertion loop over that folder → **98-01 Task 1**, hardened in **98-01 Task 3**
- [x] `bbj-vscode/test/line-break-single-line-if.test.ts` — new, file-disjoint home for the single-line IF cases → **98-04 Task 3**
- [x] `bbj-vscode/test/variable-scoping.test.ts` — program-scope DECLARE conflict asserts warning; method-scope case stays error; both re-expressed with types that genuinely resolve under `EmptyFileSystem` → **98-03 Task 2**
- [x] `bbj-vscode/test/classes.test.ts` — missing-METHODRET asserts warning; void-returns-value gains a severity assertion (warning) → **98-03 Task 1**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Conformance run reports A2 ≤ 25, A and B not regressed | VALID-01..05 (phase gate) | Corpus and harness are private and never run in CI | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`; record counts and message-group names only |
| Per-file root cause of the B movement (98-09) | CONF-01 | Needs a scratch baseline worktree and the private harness worker | Replay each newly-uncaught file against the baseline checkout; recorded in `98-CONFORMANCE.md` |
| Closing re-run and the two overrides (B 658 → 665, A2 = 27 against ≤ 25) | CONF-01 (phase gate) | Human judgment, accepted 2026-09-21 | Recorded in `98-VERIFICATION.md` overrides; A2 later fell to 22 at milestone exit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 16 of 16 tasks carry at least one runnable command
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — each gap is assigned to a named task above
- [x] No watch-mode flags — every command is `npx vitest run`
- [x] Feedback latency < 30s for the per-task targeted runs
- [x] `nyquist_compliant: true` set in frontmatter — set by `/gsd-validate-phase` on 2026-09-23

**Approval:** approved 2026-09-23 (validate-phase audit).

---

## Validation Audit 2026-09-23

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Every task in plans 01-10 was matched to a test that exists on the current tree and re-run with
`RUN_BBJ_TESTS=0`. Results: `conformance-regressions` 4/4, `parser` 221 passed / 1 skipped,
`classes` 38/38, `declare-in-class` + `validation` 44/44, `class-validations-issues` +
`method-return-java-type` + `unresolvable-type` + `variable-scoping` 75/75, `document-symbol` +
`definition` 11/11, and the line-break, lexer, tokenized and example-files files all green.
Hook timeouts seen while other suites ran in parallel cleared when each file was re-run alone.

Known residual, not a coverage gap: review finding WR-A (a same-line inner `ELSE` over-counted by
the ELSE/FI balance walk) is tracked in the pending single-line-IF balance-rule todo; no test pins
it yet.
