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
| **Quick run command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-service.test.ts test/java-interop-timeouts.test.ts test/java-interop-breaker.test.ts test/completion-test.test.ts test/scope-cost-regression.test.ts test/java-class-reload.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` |
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
| 91-01-01 | 01 | 1 | RESP-01 | T-91-01 | `::file::Class` lookup work flat from 10 to 250 files | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/scope-cost-regression.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-01-02 | 01 | 1 | RESP-01 | T-91-02 | Path index never stale; duplicate, empty, case and order cases | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/scope-cost-regression.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-01-03 | 01 | 1 | RESP-01 | T-91-01 | PREFIX symbol collection pruned; loose timing ratio | unit/regression | `RUN_BBJ_TESTS=0 npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/scope-cost-regression.test.ts test/linking.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-02-01 | 02 | 1 | RESP-04 | T-91-04 | Two concurrent requests each read their own token | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/completion-test.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |
| 91-02-02 | 02 | 1 | RESP-04 | T-91-05 | A cancelled request never rejects the shared prefix lookup | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/completion-test.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |
| 91-03-01 | 03 | 1 | RESP-02 | T-91-07 | 20 classes against a dead peer settle in ~one connect timeout; one popup; nothing cached | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-breaker.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-03-02 | 03 | 1 | RESP-02 | T-91-10, T-91-11 | Half-open probe, capped backoff, recovery without clearCache, clearCache reset | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-breaker.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-03-03 | 03 | 1 | RESP-02 | T-91-08, T-91-09, T-91-12 | Slow peer does not trip; transport stubs uncached; candidate lookups carry the probe; implicit imports re-runnable | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-breaker.test.ts test/java-interop-timeouts.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-04-01 | 04 | 2 | RESP-03 | T-91-14 | Class evicted during its own cyclic resolution resolves to itself, no refetch | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-service.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |
| 91-04-02 | 04 | 2 | RESP-03 | T-91-13, T-91-15 | In-flight registry empty after chain timeout and cancellation; clearCache does not resurrect | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-interop-service.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |
| 91-05-01 | 05 | 2 | RESP-02 | T-91-16 | Recovery reloads classpath and implicit imports before re-checking file documents | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-class-reload.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-05-02 | 05 | 2 | RESP-02 | T-91-17 | Document re-check runs once per recovery | unit/regression | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/java-class-reload.test.ts test/java-interop-breaker.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 | ⬜ pending |
| 91-06-01 | 06 | 3 | RESP-01..04 | T-91-19 | Rebuilt VSIX and plugin zip carry the new server | artifact | `unzip -p /tmp/bbj-lang.vsix extension/out/language/main.cjs \| grep -c "Java interop service unavailable (circuit open)"` | n/a | ⬜ pending |
| 91-06-02 | 06 | 3 | RESP-01..04 | T-91-20 | Whole suite 0 failed tests; live outage check staged | suite + manual | `RUN_BBJ_TESTS=0 npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test -- --maxWorkers=2` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are filled in by the planner/validator once plans exist.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/scope-cost-regression.test.ts` — RESP-01 small-vs-large synthetic workspace, work counters + loose timing (reuse `test/lazy-prefix-loading.test.ts`'s `InMemoryFileSystemProvider` + `parseHelper({validation:false})` harness)
- [ ] `bbj-vscode/test/java-interop-breaker.test.ts` — RESP-02 breaker state machine, fake peer + `vi.useFakeTimers()` (follow `test/java-interop-timeouts.test.ts`)
- [ ] Extend `bbj-vscode/test/java-interop-service.test.ts` — RESP-03 forced eviction during cyclic Phase-2 resolution
- [ ] Extend `bbj-vscode/test/completion-test.test.ts` — RESP-04 two-document concurrent cancellation (including the `autoImportPrefixCache` memo)
- [ ] `bbj-vscode/test/fake-interop-peer.ts` — scriptable peer behind the real `connect()` path (`createSocket` + `wrapSocket` overrides), shared by the breaker and reload tests (plan 91-03)
- [ ] `bbj-vscode/test/java-class-reload.test.ts` — RESP-02 recovery: classpath and implicit-imports reload before a once-per-recovery document re-check (plan 91-05)
- [ ] Test seams: injectable LRU limit on `JavaInteropService` (`resolvedClassesCacheLimit()`); accessor for the in-flight registry's size (`inFlightResolutionCount()`)

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
