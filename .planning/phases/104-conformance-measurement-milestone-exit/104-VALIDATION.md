---
phase: "104"
slug: "conformance-measurement-milestone-exit"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-23"
---

# Phase 104 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (`bbj-vscode`), JUnit 5 via Gradle (`bbj-intellij`); private `bbj-corpus` conformance harness (manual, never CI) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/example-files.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (interop up) and the interop-unreachable run; `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` |
| **Estimated runtime** | ~300 seconds (vitest), Gradle a few minutes; corpus endpoint run: long, timed by the Plan 1 sample |

---

## Sampling Rate

- **After every task commit:** Run the targeted test file (or the harness `--limit` sample for corpus-side tasks)
- **After every plan wave:** Run the full `bbj-vscode` suite (both interop modes)
- **Before `/gsd-verify-work`:** Full suite must be green (no new failures against the origin/main base, compared by test name)
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| filled by planner | 01 | 1 | CONF-02 | — | no corpus content in this repo | integration (private harness) | harness `--endpoint` sample run | ✅ | ⬜ pending |
| filled by planner | 02 | — | CONF-03 | — | N/A | whole-suite | vitest (both modes) + gradlew test | ✅ | ⬜ pending |
| filled by planner | 03 | — | CONF-03 | — | no corpus ids/paths/source text in 104-CONFORMANCE.md | integration (private harness) | closing run summary.json gate check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Corpus conformance run with endpoint active | CONF-02, CONF-03 | Corpus is private (internal + third-party code) and must never enter CI | Run `conformance/run.mjs --ls <repo> --endpoint 127.0.0.1:5008` locally against BBjServices 26.03+; read summary.json gate fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
