---
phase: "98"
slug: "line-break-validation-false-alarms-a2"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
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

Filled by the planner — one row per task. Requirement → test mapping to start from:

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| CONF-01 | every file under `test/test-data/conformance/` parses clean and has zero error-severity validation diagnostics (linking excluded) | unit | `npx vitest run test/conformance-regressions.test.ts` | ❌ W0 |
| VALID-01 | `TABLE` statement variants get no line-break error | unit | `npx vitest run test/line-break-validation.test.ts test/conformance-regressions.test.ts` | ❌ W0 (`table-statement.bbj`) |
| VALID-02 | `RESTORE n`, keyword-named branch targets, `EXIT expr`, `LOAD`, `SAVE` get no line-break error | unit | same | ❌ W0 (three regression files) |
| VALID-03 | multi-line `DEF FN` without closing `FNEND` gets no line-break error | unit | same | ❌ W0 |
| VALID-04 | single-line `IF`/`FI` forms get no line-break error; existing negatives still flagged | unit | `npx vitest run test/line-break-validation.test.ts test/conformance-regressions.test.ts` | ❌ W0 (`single-line-if-forms.bbj`) |
| VALID-05 | DECLARE conflict narrowed; both METHODRET checks are warnings | unit | `npx vitest run test/variable-scoping.test.ts test/classes.test.ts test/conformance-regressions.test.ts` | ✅ tests exist, assertions flip; ❌ W0 regression file |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/test-data/conformance/` — new directory
- [ ] `bbj-vscode/test/conformance-regressions.test.ts` — stricter-assertion loop over that folder
- [ ] `bbj-vscode/test/variable-scoping.test.ts` — program-scope DECLARE conflict asserts warning; method-scope case stays error
- [ ] `bbj-vscode/test/classes.test.ts` — missing-METHODRET asserts warning; void-returns-value gains a severity assertion (warning)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Conformance run reports A2 ≤ 25, A and B not regressed | VALID-01..05 (phase gate) | Corpus and harness are private and never run in CI | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`; record counts and message-group names only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
