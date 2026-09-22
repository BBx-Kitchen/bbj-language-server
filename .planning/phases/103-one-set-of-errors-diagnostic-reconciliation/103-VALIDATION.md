---
phase: "103"
slug: "one-set-of-errors-diagnostic-reconciliation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-22"
---

# Phase 103 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (4.1.x) |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` |
| **Estimated runtime** | ~5 s targeted, ~180 s full suite |

Never use `--reporter=basic`. Judge the full suite on `numFailedTests: 0`; the known local interop baseline failures (linking.test.ts interop, issue447) are environment drift.

---

## Sampling Rate

- **After every task commit:** Run the targeted test file(s) touched by the task
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green (numFailedTests: 0 apart from the documented baseline)
- **Max feedback latency:** 30 seconds (targeted)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| filled by planner | | | PSRV-06 / PSRV-07 | — | N/A | unit | see plans | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Reconciliation unit tests (new test file or new describe blocks beside the `mergeDiagnostics` tests) — downgrade, replace-by-overlap, Rule 1/2 exemptions, carry-over
- [ ] Latch-off regression test proving 0.16.x behaviour against the default old-server double

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Duplicates gone, accepted file shows warnings only, no bbjcpl run — in VS Code and IntelliJ | PSRV-06, PSRV-07 | Needs the live BBjServices endpoint and both IDEs | Build + install VSIX and IntelliJ zip; open a file with a Langium-only false alarm and a real syntax error; observe |
| Pre-endpoint jar: behaviour identical to 0.16.x | PSRV-06, PSRV-07 | Needs swapping the deployed bbj-ls jar | Swap in the backed-up pre-endpoint jar, restart BBjServices, repeat |
| Conformance working measurement (criterion 4) | PSRV-07 | Private bbj-corpus harness, not in CI | Run the harness with the endpoint active; record list B |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
