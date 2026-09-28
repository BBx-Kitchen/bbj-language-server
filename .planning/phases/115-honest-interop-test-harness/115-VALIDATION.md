---
phase: "115"
slug: "honest-interop-test-harness"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-28"
---

# Phase 115 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` (`include: ['test/**/*.test.ts']`, no change needed) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/interop-harness.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm run lint && npm run typecheck:test && npm test` |
| **Estimated runtime** | ~10 seconds quick, ~180 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green, plus the live before/after harness diff against `:5008` (manual)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 115-01-T2 | 01 | 1 | DEP-03 | T-115-SC | pinned dependency, no run-time download | CLI smoke | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run interop-harness -- --host 127.0.0.1 --port 1 --timeout 2000` exits 2; `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode ls tsx --depth=0 --json` shows 4.23.15 | ✅ (created by the task) | ⬜ pending |
| 115-02-T1, T2 | 02 | 2 | HARN-01, HARN-06 | T-115-03, T-115-04 | status only from assertions | type probe + CLI smoke + source greps | harness type probe (`npx tsc -p coverage/phase-115/tsconfig.harness-probe.json`, cwd bbj-vscode) and the CLI smoke above | ✅ | ⬜ pending |
| 115-03-T1..T3 | 03 | 3 | HARN-01, HARN-03, HARN-04, HARN-05 | T-115-06, T-115-07 | escaped HTML output | type probe + CLI smoke + source greps | same as 115-02 (behaviour tests follow the module split per D-21) | ✅ | ⬜ pending |
| 115-04-T1 | 04 | 4 | HARN-01 | — | N/A | unit (fake peer) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/interop-harness.test.ts -t "status derivation"` | ❌ created by 115-04 | ⬜ pending |
| 115-04-T2 | 04 | 4 | HARN-01, HARN-06 | T-115-11 | N/A | unit (fake peer) | `… npx vitest run test/interop-harness.test.ts -t "all 17 cases"` and `-t "non-array getClassInfos"` | ❌ created by 115-04 | ⬜ pending |
| 115-04-T3 | 04 | 4 | HARN-04 | T-115-11 | N/A | unit | `… npx vitest run test/interop-harness.test.ts -t "critical field gate"` | ❌ created by 115-04 | ⬜ pending |
| 115-05-T1 | 05 | 5 | HARN-02, HARN-06 | T-115-15 | console, report and exit code agree | CLI end to end (fake peer, child process via `--import tsx`) | `… npx vitest run test/interop-harness-report.test.ts -t "CLI against a fake peer"` | ❌ created by 115-05 | ⬜ pending |
| 115-05-T2 | 05 | 5 | HARN-03 | T-115-13 | escaped HTML output | unit | `… npx vitest run test/interop-harness-report.test.ts -t "syntaxHighlightJson"` | ❌ created by 115-05 | ⬜ pending |
| 115-06-T1 | 06 | 6 | HARN-02 | T-115-16 | N/A | integration (the CI scripts) | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint && npm --prefix … run typecheck:test && npm --prefix … test -- test/interop-harness.test.ts test/interop-harness-report.test.ts test/eslint-disable-directives.test.ts` | ✅ | ⬜ pending |
| 115-06-T2 | 06 | 6 | HARN-01, HARN-06 | T-115-18 | N/A | live (precondition: :5008 up) + whole suite | node check over `coverage/phase-115/live-base.txt`, `live-end.txt` (17 lines each) and `suite-end.json` (numFailedTests 0) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/interop-harness.test.ts` + `bbj-vscode/test/interop-harness-fake-peer.ts` (plan 115-04): covers HARN-01, HARN-04, HARN-06
- [ ] `bbj-vscode/test/interop-harness-report.test.ts` (plan 115-05): covers HARN-03 and the CLI end to end
- [ ] In-process fake JSON-RPC server (net.createServer + vscode-jsonrpc), self-contained per test, no `:5008`
- [ ] `tsx` pinned devDependency (DEP-03, plan 115-01), the only install

Per D-21 (scaffold, then fixes, then module split and tests, then lint and type-check scope), the test
files arrive in plans 115-04 and 115-05, not in a wave 0. Plans 115-02 and 115-03 are sampled by the
harness type probe (a gitignored scratch tsconfig at src strictness), the CLI smoke through the
pinned tsx (exit 2 on a refused port) and source greps. Every task still has an automated verify.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Header comment names the critical fields and documents `--timeout` | HARN-05 | CONTEXT forbids a source-text guard test | Read the header of `run-tests.ts` at code review |
| Live before/after harness run matches except intended changes | HARN-01, HARN-06 | Needs java-interop on `:5008` | Plan 115-06 Task 2 runs the d6d03647 harness and the final harness back to back, diffs the per-case console statuses, and explains each difference; a human reviews the table at Task 3 |
| Report colours JSON keys and string values in a browser | HARN-03 | Visual | Open `bbj-vscode/coverage/phase-115/report-end.html` at plan 115-06 Task 3 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
