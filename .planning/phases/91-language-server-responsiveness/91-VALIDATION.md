---
phase: "91"
slug: "language-server-responsiveness"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-12"
---

# Phase 91 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing, unchanged) |
| **Quick run command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-service.test.ts test/java-interop-timeouts.test.ts test/java-interop-breaker.test.ts test/completion-test.test.ts test/scope-cost-regression.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` |
| **Full suite command** | `RUN_BBJ_TESTS=0 npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test -- --maxWorkers=2` |
| **Estimated runtime** | ~30 seconds quick, ~5 minutes full |

---

## Sampling Rate

- **After every task commit:** Run the task's own new/extended test file (see map below)
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green (`numFailedTests: 0`; "failed suites" with zero failed tests are `beforeAll` hook-timeout contention, not failures)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 91-TBD | TBD | TBD | RESP-01 | — | N/A | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/scope-cost-regression.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-TBD | TBD | TBD | RESP-02 | — | Outage bounded to ~one connect timeout; one notification per outage | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-breaker.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-TBD | TBD | TBD | RESP-03 | — | In-flight registry empty after success/timeout/cancel (no unbounded growth) | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-service.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |
| 91-TBD | TBD | TBD | RESP-04 | — | One request's cancellation never affects another's result | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/completion-test.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are filled in by the planner/validator once plans exist.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/scope-cost-regression.test.ts` — RESP-01 small-vs-large synthetic workspace, work counters + loose timing (reuse `test/lazy-prefix-loading.test.ts`'s `InMemoryFileSystemProvider` + `parseHelper({validation:false})` harness)
- [ ] `bbj-vscode/test/java-interop-breaker.test.ts` — RESP-02 breaker state machine, fake peer + `vi.useFakeTimers()` (follow `test/java-interop-timeouts.test.ts`)
- [ ] Extend `bbj-vscode/test/java-interop-service.test.ts` — RESP-03 forced eviction during cyclic Phase-2 resolution
- [ ] Extend `bbj-vscode/test/completion-test.test.ts` — RESP-04 two-document concurrent cancellation (including the `autoImportPrefixCache` memo)
- [ ] Test seams: injectable LRU limit on `JavaInteropService`; accessor for the in-flight registry's size

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live outage and recovery against a real BBjServices | RESP-02 | Real peer restart semantics (fresh per-connection classpath) and the IDE popup can only be observed live | Rebuild both distributables; open a BBj file using Java classes; stop BBjServices → one error popup, no multi-second stall; start BBjServices → stale unresolved-class diagnostics clear on their own, with no edit and no Refresh Java Classes (CONTEXT D-14) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
