---
phase: "106"
slug: "on-save-compiler-check-in-both-ides"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-24"
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode); JUnit 5 via Gradle (bbj-intellij) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (judge on numFailedTests; known env-drift baseline: linking.test.ts interop + issue447) plus `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` for Java changes |
| **Estimated runtime** | ~180 seconds (vitest whole suite); ~10 seconds per targeted file |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run <changed-file>.test.ts` (or `./gradlew test` for bbj-intellij tasks)
- **After every plan wave:** Run the full vitest suite with `--maxWorkers=2`
- **Before `/gsd-verify-work`:** Full suite green (env-drift baseline excepted), plus hand UAT in both IDEs from freshly built VSIX and IntelliJ zip
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | TRIG-01 | — | N/A | unit | `npx vitest run test/live-parse-scheduling.test.ts` | ✅ | ⬜ pending |
| TBD | — | — | TRIG-02 | — | N/A | unit | `npx vitest run test/on-save-trigger.test.ts` | ❌ W0 | ⬜ pending |
| TBD | — | — | TRIG-03 | — | N/A | unit | `npx vitest run test/live-parse-scheduling.test.ts` | ✅ | ⬜ pending |
| TBD | — | — | TRIG-04 | — | N/A | unit | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts` | ✅ | ⬜ pending |
| TBD | — | — | TRIG-05 | — | N/A | unit (regression) | `npx vitest run test/live-parse-scheduling.test.ts test/live-parse-interleaving.test.ts test/bbj-document-validator.test.ts` | ✅ | ⬜ pending |
| TBD | — | — | TRIG-06 | — | N/A | JUnit 5 | `cd bbj-intellij && ./gradlew test` | ❌ W0 | ⬜ pending |
| TBD | — | — | TRIG-07 | — | N/A | manual | n/a | n/a | ⬜ pending |
| TBD | — | — | DIAG-01 | — | N/A | unit | `npx vitest run test/bbj-document-validator.test.ts` | ✅ | ⬜ pending |
| TBD | — | — | JINT-03 | — | N/A | unit | `npx vitest run test/java-interop-parse-lane.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are filled in by the planner / validate-phase once plans exist.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/on-save-trigger.test.ts` (or equivalent) — save-path arming, no debounce, one check per save
- [ ] JUnit 5 test for the new `compilerTrigger` init option in bbj-intellij
- [ ] Test (or documented manual UAT step) proving the server advertises `save` in `textDocumentSync`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs and VS Code setting description describe the three modes and recommend on-save | TRIG-07 | Content review | Read `bbj-vscode/package.json` enumDescriptions and both `documentation/docs/*/features.md` sections |
| didSave reaches the server from both IDEs; on-save behaviour end to end | TRIG-02, TRIG-06 | Needs real VS Code and IntelliJ clients | Build VSIX + IntelliJ zip, set on-save, type (no check), save (one check), confirm errors persist on correct lines |
| First live diagnostic still ~5-6 s on the large workspace | JINT-03 | Needs the real large workspace and BBj | Re-check a few Phase 105 "after" samples per 105-MEASUREMENT.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
