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
| *(filled by the planner)* | | | PARSE-01 | — | N/A | unit (parse + validate) | quick run command; fixture `test/test-data/conformance/field-verb.bbj` | ❌ W0 | ⬜ pending |
| | | | PARSE-02 | — | N/A | unit (parse + validate) | quick run command; fixture `test/test-data/conformance/record-verbs-len-option.bbj` | ❌ W0 | ⬜ pending |
| | | | PARSE-03 | — | N/A | unit (parse + validate) | quick run command; fixture `test/test-data/conformance/label-word-as-name.bbj` | ❌ W0 | ⬜ pending |
| | | | PARSE-07 | — | N/A | unit (parse + validate) | quick run command; fixture `test/test-data/conformance/iolist-statement.bbj` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/test-data/conformance/field-verb.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/record-verbs-len-option.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/label-word-as-name.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/iolist-statement.bbj` — new fixture

No new test infrastructure: `test/conformance-regressions.test.ts` already picks up every `.bbj`
file in that folder and asserts zero parse errors and zero error-severity diagnostics (linking
excluded). "Still flagged" and keyword-as-identifier cases go into a parser test file, since a
fixture in the conformance folder must be clean by definition.

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
