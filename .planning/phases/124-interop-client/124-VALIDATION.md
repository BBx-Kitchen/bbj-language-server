---
phase: "124"
slug: "interop-client"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-01"
---

# Phase 124 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `124-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (judge on `numFailedTests`; `--maxWorkers=2` under contention) |
| **Live command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` |
| **Estimated runtime** | quick ~5-15 s; full suite several minutes |

---

## Sampling Rate

- **After every task commit:** the task's own new test file, plus `npm run typecheck:test` after any type change
- **After every plan wave:** existing interop guards (`bbj-parser-service`, `java-interop-parse-lane`, `live-parse-interleaving`, `java-interop-breaker`, `java-interop-connection`, `java-interop-timeouts`, `java-interop-peer-guard`) + all new files; `npm run lint`
- **Before `/gsd-verify-work`:** `npm test`, `npm run typecheck:test`, `npm run lint`, `npm run build`, then the live run with numbers recorded
- **Max feedback latency:** ~15 s per task

---

## Per-Task Verification Map

Filled by the planner/executor; requirement → test mapping:

| Task | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|----------|-----------|-------------------|-------------|--------|
| 124-01-T1 | INT-04 | parser-service classifier migration behaviour-identical | regression | `npx vitest run test/bbj-parser-service.test.ts test/java-interop-parse-lane.test.ts test/live-parse-interleaving.test.ts` | ✅ | ✅ green |
| 124-01-T2 | INT-04 | classifier table, typed `-33007`/`-33008` data, cadence | unit | `npx vitest run test/java-interop-errors.test.ts` | ✅ | ✅ green |
| 124-02-T1..T3 | INT-01, INT-05 | wire types; malformed shapes → refusal tokens; range geometry; size caps; diagnostics sanitising | unit | `npx vitest run test/java-program-guard.test.ts` | ✅ | ✅ green |
| 124-03-T1..T2 | INT-01, INT-02 | typed whole/range format + DENUM through the client on a separate connection; hung lane never delays parse | unit | `npx vitest run test/java-interop-program-lane.test.ts` | ✅ | ✅ green |
| 124-03-T3 | INT-02 | no fallback, cool-down, lane loss keeps `connectionGeneration` and parse verdicts, clearCache disposes | unit | program-lane file | ✅ | ✅ green |
| 124-04-T1 | INT-03 | per-method `-32601` latches, reset on generation bump / clearCache / lane loss, stale answer ignored | unit | program-lane file | ✅ | ✅ green |
| 124-04-T2 | INT-04 | every code → its outcome; error burst leaves breaker/generation/live parse untouched; warn-once cadence; no request text | unit | program-lane file | ✅ | ✅ green |
| 124-04-T3 | INT-04 | 15 s backstop cancels and settles `timeout`; caller cancel / `-32800` → `cancelled`; `-33002` → peer timeout | unit | program-lane file | ✅ | ✅ green |
| 124-05-T1..T2 | INT-01, INT-03, INT-04 | wire framing, optional fields omitted, `data` intact, per-method availability, real `$/cancelRequest` | loopback | `npx vitest run test/java-interop-program-wire.test.ts` | ✅ | ✅ green |
| 124-05-T3 | INT-05 | scriptable test double through the real guard/classifier; phase gates | unit + gates | `npx vitest run test/java-interop-program-test-double.test.ts`; lint, typecheck:test, build, `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | ✅ | ✅ green |
| 124-06-T1..T2 | INT-01, INT-02 | live format/DENUM + latency measurement + `$/cancelRequest` finding | live (gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test/java-interop-errors.test.ts`, `test/java-program-guard.test.ts`, `test/java-interop-program-lane.test.ts`, `test/java-interop-program-wire.test.ts`, `test/functional/program-live.test.ts`
- [x] Extend `test/fake-interop-peer.ts`, `test/bbj-test-module.ts`, `test/loopback-jsonrpc-peer.ts`
- No framework install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live latency numbers recorded in SUMMARY/VERIFICATION | INT-02 (SC2) | needs live BBjServices on :5008 | run the live command, copy measured numbers |
| No planning ids in source/test comments | — | diff review | grep the phase diff for `D-[0-9]`, `INT-0`, `Plan [0-9]` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-05

---

## Validation Audit 2026-10-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence: the 8 hermetic suites in the map (`bbj-parser-service`, `java-interop-parse-lane`,
`live-parse-interleaving`, `java-interop-errors`, `java-program-guard`, `java-interop-program-lane`,
`java-interop-program-wire`, `java-interop-program-test-double`) ran green: 300 tests. The live
`RUN_BBJ_TESTS=1 test/functional/program-live.test.ts` ran 17/17 against BBjServices on :5008. Each
mapped behaviour has a named test: per-method `-32601` latching and generation/epoch separation (lane),
`$/cancelRequest` (wire), typed `-33007`/`-33008` data (errors, lane, wire, test double), range geometry
and stale answers (guard, lane), and the circuit breaker left untouched (lane). Manual-only rows are
satisfied: the live latency numbers are in 124-VERIFICATION.md truth 2 and 124-06-SUMMARY.md, and the
phase sources and tests carry no planning ids.
