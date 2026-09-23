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
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/live-parse-scheduling.test.ts test/live-parse-interleaving.test.ts test/java-interop-parse-lane.test.ts test/document-builder.test.ts test/bbj-parser-service.test.ts test/bbj-diagnostic-reconciliation.test.ts test/config-hot-reload-wiring.test.ts` (vitest treats the paths as filters, so a file a later plan creates is simply not matched until it exists) |
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

Filled in by the planner; executors update Status. Every command runs as
`cd /home/coder/repos/bbj-language-server/bbj-vscode && <command>`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 105-01-T1 | 01 | 1 | RESP-01, RESP-02 | T-105-01, T-105-03 | The parse carries the live edited text; an early publish reaches the client without writing the document or firing the Validated phase | unit, real services, Langium's real `WorkspaceLock` held (tracer) | `npx vitest run test/live-parse-scheduling.test.ts -t "workspace lock is held"` | ❌ created by this task | ⬜ pending |
| 105-01-T2 | 01 | 1 | RESP-01, RESP-02 | T-105-02, T-105-05 | Rebuild-path gates reused; one pending `ready` entry per uri; listeners never throw | unit (open event, ready deferral, trigger off, gates, merge, early bbjcpl, quiescence) | `npx vitest run test/live-parse-scheduling.test.ts` | ❌ created by T1 | ⬜ pending |
| 105-02-T1 | 02 | 1 | RESP-03 | T-105-06 | A stale complaint is downgraded only when its line text is identical in both texts | unit, pure (tracer) | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts -t "early verdict against a stale Langium list"` | ✅ extended | ⬜ pending |
| 105-02-T2 | 02 | 1 | RESP-03 | T-105-06 | Older verdicts never show their diagnostics against newer text | unit, pure (case table, empty / line-text / idempotency edges) | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts` | ✅ extended | ⬜ pending |
| 105-03-T1 | 03 | 1 | RESP-04 | T-105-08 | One extra socket, same host and port | unit, fake peer (tracer) | `npx vitest run test/java-interop-parse-lane.test.ts -t "own connection while class lookups"` | ❌ created by this task | ⬜ pending |
| 105-03-T2 | 03 | 1 | RESP-04 | T-105-08, T-105-10, T-105-11 | Fallback logs once, no dialog, no breaker or latch effect; a lost connection clears verdict state | unit, fake peer + real `BBjParserService` | `npx vitest run test/java-interop-parse-lane.test.ts` | ❌ created by T1 | ⬜ pending |
| 105-04-T1 | 04 | 2 | RESP-01, RESP-03 | T-105-13 | Early verdict then Langium catch-up: BBj's diagnostic exactly once | unit, real services (tracer) | `npx vitest run test/live-parse-interleaving.test.ts -t "verdict first, then Langium"` | ❌ created by this task | ⬜ pending |
| 105-04-T2 | 04 | 2 | RESP-03 | T-105-14 | bbjcpl merged onto the Langium list current when the compile resolves; 0.16.x equality unchanged | unit, real services | `npx vitest run test/live-parse-interleaving.test.ts test/document-builder.test.ts test/bbj-parser-service.test.ts` | ❌ / ✅ | ⬜ pending |
| 105-04-T3 | 04 | 2 | RESP-03 | T-105-13, T-105-14 | No lost, doubled or misplaced diagnostic in any published list, either order, across versions | unit, interleaving matrix | `npx vitest run test/live-parse-interleaving.test.ts` | ❌ created by T1 | ⬜ pending |
| 105-05-T1 | 05 | 3 | RESP-05 | T-105-16, T-105-17 | Register check and commit-body scan clean; runbook forbids corpus names | whole suite + gates + builds | `npm test -- --maxWorkers=2` | ✅ | ⬜ pending |
| 105-05-T2 | 05 | 3 | RESP-05, RESP-01 | T-105-19 | Timings copied from real traces only | manual checkpoint (corpus, both IDEs) | — (staging check: `105-MEASUREMENT.md` has its six sections) | n/a | ⬜ pending |
| 105-05-T3 | 05 | 3 | RESP-05 | T-105-16, T-105-18 | Fast-forward push only; PR body free of planning identifiers and closing keywords | git / gh checks | `gh pr view 691 --repo BBx-Kitchen/bbj-language-server --json state,headRefName,title` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0: each missing test file is created test-first by the tracer task that needs it.

- [ ] `bbj-vscode/test/live-parse-scheduling.test.ts` — new, real services with Langium's real text-document store and workspace lock (plan 01, T1). The hand-built `buildHarness()` stubs keep their `get`-only `TextDocuments`; the builder only subscribes when the provider exposes events (RESP-01/02)
- [ ] `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` — extended with the pure composition cases (plan 02) (RESP-03)
- [ ] `bbj-vscode/test/live-parse-interleaving.test.ts` — new, the D-12 part b interleaving matrix through the real validator and builder (plan 04) (RESP-03)
- [ ] `bbj-vscode/test/java-interop-parse-lane.test.ts` — new, dedicated connection and fallback over the fake peer, which gains per-connection scripting (plan 03) (RESP-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Before/after time from edit to first `BBj Parser` diagnostic, file opened during the initial build | RESP-05 | Needs the private `bbj-corpus`, real BBjServices and both real IDEs (D-11) | Runbook in `105-MEASUREMENT.md` (plan 05, T1); LSP trace timestamps (`bbj.trace.server: verbose` in VS Code, LSP4IJ trace in IntelliJ); the edit must precede the first `workspace/inlayHint/refresh`; numbers and environment notes only |
| A live `BBj Parser` diagnostic during the initial build, and no doubled or paired syntax errors after it | RESP-01, RESP-03 | Real IDEs on a large workspace | Plan 05, T2 answers 1-3 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
