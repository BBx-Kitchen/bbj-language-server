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
| (filled by planner) | — | — | HARN-01 | — | N/A | unit (fake server) | `npx vitest run test/interop-harness.test.ts -t "status derivation"` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | HARN-01 | — | N/A | unit (fake server) | `npx vitest run test/interop-harness.test.ts -t "non-array getClassInfos"` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | HARN-03 | — | escaped HTML output | unit | `npx vitest run test/interop-harness.test.ts -t "syntaxHighlightJson"` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | HARN-04 | — | N/A | unit | `npx vitest run test/interop-harness.test.ts -t "critical field gate"` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | HARN-06 | — | N/A | unit (fake server) | `npx vitest run test/interop-harness.test.ts -t "all 17 cases"` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | DEP-03 | — | pinned dependency | CLI | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode ls tsx` | ✅ | ⬜ pending |
| (filled by planner) | — | — | HARN-02 | — | N/A | integration (CI) | `npm run lint && npm run typecheck:test && npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/interop-harness.test.ts` — covers HARN-01, HARN-03, HARN-04, HARN-06
- [ ] In-process fake JSON-RPC server (net.createServer + vscode-jsonrpc) — self-contained per test, no `:5008`
- [ ] `tsx` pinned devDependency (DEP-03) — the only install

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Header comment names the critical fields and documents `--timeout` | HARN-05 | CONTEXT forbids a source-text guard test | Read the header of `run-tests.ts` at code review |
| Live before/after harness run matches except intended changes | HARN-01, HARN-06 | Needs java-interop on `:5008` | Run the harness before and after against `:5008`, diff the result JSON |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
