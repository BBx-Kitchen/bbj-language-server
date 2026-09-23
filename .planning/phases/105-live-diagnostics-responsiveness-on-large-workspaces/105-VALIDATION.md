---
phase: "105"
slug: "live-diagnostics-responsiveness-on-large-workspaces"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-23"
---

# Phase 105 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/document-builder.test.ts test/bbj-parser-service.test.ts test/bbj-diagnostic-reconciliation.test.ts test/config-hot-reload-wiring.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` |
| **Estimated runtime** | ~30 seconds (quick), several minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run the full suite command; judge on `numFailedTests: 0`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Filled in by the planner and the executors. Proposed requirement map from RESEARCH.md:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | RESP-01/02 | — | N/A | unit (held workspace lock) | `npx vitest run test/document-builder.test.ts -t "workspace lock"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RESP-01 | — | N/A | unit (onDidOpen arms cycle) | `npx vitest run test/document-builder.test.ts -t "onDidOpen"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RESP-03 | — | N/A | unit (interleaving) | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts -t "interleav"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RESP-04 | — | N/A | unit (dedicated connection + fallback) | `npx vitest run test/java-interop-service.test.ts -t "dedicated"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/document-builder.test.ts`: extend `buildHarness()`'s fake `TextDocuments` with `onDidOpen`/`onDidChangeContent` emitters (RESP-01/02)
- [ ] `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` (or a new file): interleaving tests (RESP-03)
- [ ] `bbj-vscode/test/java-interop-service.test.ts`: dedicated connection + fallback tests (RESP-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Before/after time from edit to first `BBj Parser` diagnostic, file opened during the initial build | RESP-05 | Needs the private `bbj-corpus`, real BBjServices and both real IDEs (D-11) | Runbook in `105-MEASUREMENT.md`; LS log timestamps in VS Code and IntelliJ; numbers and environment notes only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
