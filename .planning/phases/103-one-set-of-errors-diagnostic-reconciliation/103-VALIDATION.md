---
phase: "103"
slug: "one-set-of-errors-diagnostic-reconciliation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 103-01-T1 | 01 | 1 | PSRV-06 / PSRV-07 | — | N/A | integration | `npx vitest run test/bbj-parser-service.test.ts -t "accepted verdict"` | ✅ | ✅ green |
| 103-01-T2 | 01 | 1 | PSRV-06 | — | N/A | unit | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts` | ✅ | ✅ green |
| 103-01-T3 | 01 | 1 | PSRV-06 / PSRV-07 | — | N/A | unit | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts test/cpl-integration.test.ts test/line-break-validation.test.ts` | ✅ | ✅ green |
| 103-02-T1 | 02 | 2 | PSRV-07 | — | N/A | integration | `npx vitest run test/bbj-parser-service.test.ts -t "falls back to the save-time compile"` | ✅ | ✅ green |
| 103-02-T2 | 02 | 2 | PSRV-07 | — | N/A | integration | `npx vitest run test/bbj-parser-service.test.ts -t "exactly the 0.16.x diagnostics"` | ✅ | ✅ green |
| 103-03-T1 | 03 | 3 | PSRV-06 | — | N/A | unit | `npx vitest run test/bbj-document-validator.test.ts` | ✅ | ✅ green |
| 103-03-T2 | 03 | 3 | PSRV-06 | — | N/A | unit | `npx vitest run test/bbj-document-validator.test.ts test/line-break-validation.test.ts test/line-break-single-line-if.test.ts` | ✅ | ✅ green |
| 103-04-T1 | 04 | 4 | PSRV-06 / PSRV-07 | — | N/A | live | `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` | ✅ | ✅ green (7/7) |
| 103-04-T2 | 04 | 4 | PSRV-07 | — | N/A | manual | private bbj-corpus harness → `103-CONFORMANCE.md` | ✅ | manual-only |
| 103-05-T1 | 05 | 5 | PSRV-06 / PSRV-07 | — | N/A | suite | `npm test -- --maxWorkers=2` | ✅ | ✅ green |
| 103-05-T2 | 05 | 5 | PSRV-06 / PSRV-07 | — | N/A | build | `npm run build` + `./gradlew buildPlugin` | ✅ | ✅ green |
| 103-05-T3 | 05 | 5 | — | — | N/A | ship | `gh pr view 691` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Reconciliation unit tests (new test file or new describe blocks beside the `mergeDiagnostics` tests) — downgrade, replace-by-overlap, Rule 1/2 exemptions, carry-over
- [x] Latch-off regression test proving 0.16.x behaviour against the default old-server double

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Duplicates gone, accepted file shows warnings only, no bbjcpl run — in VS Code and IntelliJ | PSRV-06, PSRV-07 | Needs the live BBjServices endpoint and both IDEs | Build + install VSIX and IntelliJ zip; open a file with a Langium-only false alarm and a real syntax error; observe |
| Pre-endpoint jar: behaviour identical to 0.16.x | PSRV-06, PSRV-07 | Needs swapping the deployed bbj-ls jar | Swap in the backed-up pre-endpoint jar, restart BBjServices, repeat |
| Conformance working measurement (criterion 4) | PSRV-07 | Private bbj-corpus harness, not in CI | Run the harness with the endpoint active; record list B |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-23

---

## Validation Audit 2026-09-23

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Re-run on the final tree (after the code-review fixes): the ten phase test files pass 278/278 with `--maxWorkers=2` (the default worker count hit `initializeWorkspace` hook timeouts in four suites — contention, zero failed tests); `parse-program-live.test.ts` passes 7/7 against the live endpoint. Both hand checks passed in UAT (`103-UAT.md`).
