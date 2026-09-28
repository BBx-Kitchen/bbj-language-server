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
| 116-01-T1 | 01 | 1 | TEST-06 | T-116-01 | loopback-only bind | unit (socket) | `npx vitest run test/java-interop-socket.test.ts test/interop-harness.test.ts test/interop-harness-report.test.ts` | ❌ W0 | ⬜ pending |
| 116-01-T2 | 01 | 1 | TEST-06 | T-116-02 | teardown frees sockets | unit (socket) | `npx vitest run test/java-interop-socket.test.ts` | ❌ W0 | ⬜ pending |
| 116-01-T3 | 01 | 1 | TEST-06 | T-116-03 | — | unit (socket) | same + `npm run lint` + `npm run typecheck:test` | ❌ W0 | ⬜ pending |
| 116-02-T1 | 02 | 1 | TEST-08 | T-116-05 | main.ts isolation kept | unit (handler) | `npx vitest run test/java-class-refresh.test.ts test/java-class-reload.test.ts` + `npm run build` | ❌ W0 | ⬜ pending |
| 116-02-T2 | 02 | 1 | TEST-08 | T-116-04 | host/port still validated | unit (handler) | `npx vitest run test/configuration-change-handler.test.ts …` + build + coverage reading | ❌ W0 | ⬜ pending |
| 116-03-T1 | 03 | 1 | TEST-05 | — | N/A | unit (linking) | `npx vitest run test/linking.test.ts` (unset and RUN_BBJ_TESTS=1) | ✅ | ⬜ pending |
| 116-03-T2 | 03 | 1 | TEST-05 | T-116-07 | — | whole-suite | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 --reporter=json` → numFailedTests 0 | ✅ | ⬜ pending |
| 116-04-T1 | 04 | 2 | TEST-04 | — | N/A | unit (parser) | `npx vitest run test/parser.test.ts test/linking.test.ts` | ✅ | ⬜ pending |
| 116-04-T2 | 04 | 2 | TEST-04 | T-116-09 | primitive-only scope branch | unit + whole-suite | parser/linking/scope-cost files + whole hermetic suite + lint/typecheck/build | ✅ | ⬜ pending |
| 116-05-T1 | 05 | 3 | TEST-04 | — | human decision (blocking) | checkpoint | — | — | ⬜ pending |
| 116-05-T2 | 05 | 3 | TEST-04 | T-116-12 | Object-only suppression (if chosen) | unit + whole-suite | parser/linking/validation files + whole hermetic suite | ✅ | ⬜ pending |
| 116-06-T1 | 06 | 4 | TEST-05 | T-116-14 | probe never hangs | unit | `npx vitest run test/test-helper.test.ts` | ❌ W0 | ⬜ pending |
| 116-06-T2 | 06 | 4 | TEST-05 | T-116-16 | — | whole-suite (both states) | RUN_BBJ_TESTS=0 and =1 JSON runs → numFailedTests 0 | ✅ | ⬜ pending |

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
