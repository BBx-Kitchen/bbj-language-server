---
phase: "100"
slug: "parser-gaps-remaining-groups-long-tail-examples"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-21"
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

Filled by the planner — one row per task. Requirement → test anchors:

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| PARSE-04 | empty-bracket array form parses in every position and yields the whole-array node | unit (parse + validate + AST property) | quick run + `test/test-data/conformance/whole-array-empty-brackets.bbj` | ❌ W0 |
| PARSE-05 | `DREAD` into arrays; multi-pair type brackets; array-typed parameter | unit | quick run + `test/test-data/conformance/multi-bracket-array-types.bbj` | ❌ W0 |
| PARSE-06 | `; rem` after block boundaries; line-numbered class code | unit | quick run + `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj` | ❌ W0 |
| PARSE-08 | sweep words usable as variable, label, branch target; identifier probes stay clean | unit | quick run + `language-words-as-names.bbj` | ❌ W0 |
| PARSE-09 | cheap long-tail shapes parse; residue list complete | unit + manual triage | quick run + `statement-option-tails.bbj`; residue list in `100-CONFORMANCE.md` | ❌ W0 / manual |
| EXMP-01 | valid examples parse; `examples/invalid/` expectations hold; BBj-gated compile check | unit + BBj-gated | `npx vitest run test/examples-compile.test.ts` (name at planner's discretion) | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] The six conformance fixtures named above under `bbj-vscode/test/test-data/conformance/`
- [ ] The examples test file and `examples/invalid/` with its README and sidecar expectations
- [ ] No framework or harness change — `conformance-regressions.test.ts` picks up any `.bbj` dropped into its folder

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A ≤ 25, A2 ≤ 23, B movement classified | PARSE-09 | the corpus and harness are private and never run in CI | orchestrator runs `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` after a snapshot, diffs file sets, records counts and own-words shapes only |
| Shape-level residue list is complete | PARSE-09 | needs a per-file look at private sources | orchestrator classifies every remaining list-A entry; per-file mapping written in the corpus repo |
| Every valid example compiles with `bbjcpl` | EXMP-01 | needs a local BBj install | `RUN_BBJ_TESTS=1` run of the examples test on a machine with `/opt/bbx/bin/bbjcpl` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
