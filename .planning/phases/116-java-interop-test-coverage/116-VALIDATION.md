---
phase: "116"
slug: "java-interop-test-coverage"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-28"
---

# Phase 116 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 |
| **Config file** | bbj-vscode/vitest.config.ts |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (and `RUN_BBJ_TESTS=1` at the phase gate) |
| **Estimated runtime** | ~300 seconds (whole suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed file>` (cwd bbj-vscode)
- **After every plan wave:** Run `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (cwd bbj-vscode)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds per targeted file

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner/executor per task) | — | — | TEST-04/05/06/08 | — | N/A (test-only phase) | unit | see RESEARCH.md Validation Architecture | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Fake-socket suite for `java-interop.ts` — TEST-06 (refused connection, timeout, lock serialization)
- [ ] Handler tests for Java class refresh and configuration change — TEST-08
- [ ] Test for the hardened `shouldRunBBjTests()` JSON-RPC round trip — TEST-05
- Framework install: none — vitest, vscode-jsonrpc, langium already present

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Whole suite green with BBjServices up on :5008 | TEST-05 | Needs a live BBjServices peer | `RUN_BBJ_TESTS=1 npx vitest run --maxWorkers=2` from bbj-vscode, judge on numFailedTests; re-run any failure in isolation |
| Handler execution coverage reading | TEST-08 | Coverage not gated | `npx vitest run --coverage` from bbj-vscode, read the new handler modules' line coverage |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s per targeted file
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
