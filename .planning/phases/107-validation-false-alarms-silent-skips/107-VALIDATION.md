---
phase: "107"
slug: "validation-false-alarms-silent-skips"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-24"
---

# Phase 107 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |
| **Estimated runtime** | ~5–20 seconds per file; whole suite several minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick command on the test file(s) that task touches
- **After every plan wave:** Run the full suite command (judge on `numFailedTests: 0`; `beforeAll` contention timeouts are not failures, use `--maxWorkers=2`)
- **Before `/gsd-verify-work`:** Full suite green plus the local conformance harness pass (D-03, D-12, D-13)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 107-VAL-01 | 107-01 | 1 | VAL-01 | T-107-01 | A misplaced ELSE/FI stays flagged while the nested one-liner is clean | unit | `npx vitest run test/line-break-single-line-if.test.ts && npx vitest run test/line-break-walk-termination.test.ts` (one file per run) | ✅ | ⬜ pending |
| 107-VAL-01-residue | 107-04 | 2 | VAL-01 | T-107-09 | Re-flagged corpus files clean; no corpus text enters the repository | harness (local) + unit | per-file probe `snapshots/phase-107-file-probe.mts`, then `npx vitest run test/line-break-single-line-if.test.ts` | ✅ | ⬜ pending |
| 107-VAL-02 | 107-02 | 1 | VAL-02 | T-107-04 | Malformed `## = 1` no longer disables use-before-assignment or scope computation | unit | `npx vitest run test/variable-scoping.test.ts` | ✅ | ⬜ pending |
| 107-VAL-03 | 107-03 | 1 | VAL-03 | T-107-06 | Unknown member Error fires only on fully resolved Java classes with a certain receiver type | unit + live-gated | `npx vitest run test/unknown-java-member.test.ts`; `RUN_BBJ_TESTS=1 npx vitest run test/functional/unknown-java-member-real-interop.test.ts` | ❌ W0 (created in 107-03 Task 1) | ⬜ pending |
| 107-VAL-03-corpus | 107-05 | 2 | VAL-03 | T-107-13 | Every unknown-member Error on real code is a genuinely unknown member | live probe (local) | `snapshots/phase-107-live-member-probe.mts` over the accepted corpus | ✅ | ⬜ pending |
| 107-HARNESS | 107-06 | 3 (last) | VAL-01, VAL-02, VAL-03 | T-107-15 | File-set comparison against the base; leak guard over the phase diff | harness (local) | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` (same mode as the 107-04 base run) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The planner fills in the Plan and Wave columns.*

---

## Wave 0 Requirements

- [ ] VAL-03 guard-case test file (or describe block) covering D-12: interop down, synthetic BBjAPI, BBj class receiver, static vs instance, inherited method, `.class`, template-string field, case-insensitive match, duplicate-warning suppression

*The existing vitest infrastructure covers VAL-01 and VAL-02.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Re-flagged Phase 98 files clean, A2 ≤ 22, no new B (file-set diff) | VAL-01 | Private corpus lives outside the repo; no corpus text may enter the repo (D-13) | Snapshot `details.json`, run the harness, diff file sets against the snapshot |
| No new Error on a member that exists | VAL-03 | Same private corpus | Review every new Error-severity diagnostic by line shape in the harness output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
