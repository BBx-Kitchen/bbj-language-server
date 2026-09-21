---
phase: "99"
slug: "parser-gaps-the-largest-groups"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-21"
---

# Phase 99 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (judge on `numFailedTests: 0`; hook-timeout "failed suites" under contention are not failures) |
| **Estimated runtime** | quick ~20 seconds, full suite ~4 minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick run command plus the test file the task touched
- **After every plan wave:** Run the full suite command
- **After each construct group lands, and after the last source change:** the private conformance harness (orchestrator-side, never CI), with a `details.json` snapshot before each run and a file-set diff after it
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds for the quick command

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 99-01-T1 | 99-01 | 1 | PARSE-02 | T-99-01-03 | generated parser regenerated, never hand-edited, asserted no older than the grammar | unit (parse + validate) | `cd …/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts`; fixture `test/test-data/conformance/record-verbs-len-option.bbj` | ❌ created by this task | ⬜ pending |
| 99-01-T2 | 99-01 | 1 | PARSE-02 | T-99-01-01 | no planning identifier and no corpus text in the source diff (register check) | unit (parse) | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/lexer.test.ts test/line-break-validation.test.ts test/line-break-walk-termination.test.ts test/example-files.test.ts` | ❌ created by this task | ⬜ pending |
| 99-01-T3 | 99-01 | 1 | PARSE-02 | T-99-01-01 | counts and word groups only; corpus-path grep over the record | manual-only (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ❌ record created by this task | ⬜ pending |
| 99-02-T1 | 99-02 | 2 | PARSE-01 | T-99-02-04 | the class-member declaration rule and its no-type error stay untouched | unit (parse + validate) | `… npx vitest run test/conformance-regressions.test.ts test/parser.test.ts test/classes.test.ts test/declare-in-class.test.ts` | ✅ (fixture in T2) | ⬜ pending |
| 99-02-T2 | 99-02 | 2 | PARSE-01 | T-99-02-01 | hand-written fixture, invented names, register check | unit (parse + validate) | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/lexer.test.ts test/line-break-validation.test.ts test/example-files.test.ts` | ❌ fixture created by this task | ⬜ pending |
| 99-02-T3 | 99-02 | 2 | PARSE-01 | T-99-02-01 | counts and word groups only; corpus-path grep | manual-only (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ⬜ pending |
| 99-03-T1 | 99-03 | 3 | PARSE-03 | T-99-03-02 | widening confined to one narrow name rule plus one feature-name alternative; library keyword untouched | unit (parse + link) | `… npx vitest run test/conformance-regressions.test.ts test/parser.test.ts test/definition.test.ts test/rename.test.ts test/builtin-functions-library.test.ts` | ✅ (fixture in T2) | ⬜ pending |
| 99-03-T2 | 99-03 | 3 | PARSE-03 | T-99-03-01 | hand-written fixture, invented names apart from the word under test; register check | unit (parse + link) | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/definition.test.ts test/line-break-validation.test.ts test/example-files.test.ts` | ❌ fixture created by this task | ⬜ pending |
| 99-03-T3 | 99-03 | 3 | PARSE-03 | T-99-03-01 | counts, word groups and own-words side effects only; corpus-path grep | manual-only (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ⬜ pending |
| 99-04-T1 | 99-04 | 4 | PARSE-07 | T-99-04-04 | the scoping check's file and severity stay untouched | unit (parse + validate + link) | `… npx vitest run test/conformance-regressions.test.ts test/parser.test.ts test/variable-scoping.test.ts test/definition.test.ts` | ✅ (fixture in T2) | ⬜ pending |
| 99-04-T2 | 99-04 | 4 | PARSE-07 | T-99-04-01 | hand-written fixture, invented names; register check | unit (parse + validate + link) | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/parser.test.ts test/variable-scoping.test.ts test/line-break-validation.test.ts test/example-files.test.ts` | ❌ fixture created by this task | ⬜ pending |
| 99-04-T3 | 99-04 | 4 | PARSE-07 | T-99-04-01 | counts and word groups only; corpus-path grep | manual-only (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ⬜ pending |
| 99-05-T1 | 99-05 | 5 | PARSE-01, PARSE-02, PARSE-03, PARSE-07 | T-99-05-03 | the measured tree is the committed tree (generated parser current, source status clean) | whole suite + register check | `cd …/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (judged on `numFailedTests: 0`) | ✅ | ⬜ pending |
| 99-05-T2 | 99-05 | 5 | PARSE-01, PARSE-02, PARSE-03, PARSE-07 | T-99-05-01, T-99-05-02 | gate table with reproducible arithmetic; no cause written without a per-file look | manual-only (private harness) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ | ⬜ pending |
| 99-05-T3 | 99-05 | 5 | PARSE-01, PARSE-02, PARSE-03, PARSE-07 | T-99-05-02 | a missed gate returns a blocking checkpoint instead of an adjusted rule | unit (parse + validate) | `… npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/example-files.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

`…` in the command column stands for `/home/coder/repos/bbj-language-server`; every command runs
with cwd = `bbj-vscode` and `RUN_BBJ_TESTS=0`, as the Test Infrastructure table above states.

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/parser-keyword-statements.test.ts` — new test file, created by 99-01-T2; the
      shared home for this phase's still-flagged negatives and keyword-as-identifier cases. Every
      later plan adds one `describe` block to it and reuses its single services instance and
      `beforeAll` (a second instance re-triggers the known hook-timeout flake).
- [ ] `bbj-vscode/test/test-data/conformance/record-verbs-len-option.bbj` — new fixture (99-01-T1)
- [ ] `bbj-vscode/test/test-data/conformance/field-verb.bbj` — new fixture (99-02-T2)
- [ ] `bbj-vscode/test/test-data/conformance/label-word-as-name.bbj` — new fixture (99-03-T2)
- [ ] `bbj-vscode/test/test-data/conformance/iolist-statement.bbj` — new fixture (99-04-T2)

No new fixture-discovery infrastructure: `test/conformance-regressions.test.ts` already picks up every
`.bbj` file in that folder and asserts zero parse errors and zero error-severity diagnostics (linking
excluded). "Still flagged" and keyword-as-identifier cases cannot live there — a fixture in the
conformance folder must be clean by definition — which is why the new parser test file above is the
one piece of Wave 0 test scaffolding this phase needs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| List A ≤ 80, no list-A file whose first failing word is `FIELD`, `READ`, `IOLIST` or `LABEL`, A2 ≤ 27, B movement explained per file | PARSE-01, -02, -03, -07 | The corpus is private and must not enter this repository or CI | Snapshot `details.json`, run `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`, diff file sets, record counts and message groups only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
