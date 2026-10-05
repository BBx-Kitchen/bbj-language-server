---
phase: "130"
slug: "docs-migration"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-04"
---

# Phase 130 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No new tests. Verification uses grep gates, the Docusaurus 3.10.2 build (`onBrokenLinks: 'throw'`), and the existing vitest guard `formatter-removal.test.ts` (13 tests). |
| **Config file** | `documentation/docusaurus.config.ts` |
| **Quick run command** | `npm --prefix /home/coder/repos/bbj-language-server/documentation run build` |
| **Full suite command** | the quick command, plus the grep gates in 130-RESEARCH.md §Validation Architecture, plus `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/formatter-removal.test.ts` |
| **Estimated runtime** | quick ~5-10 s; full ~30 s |

---

## Sampling Rate

- **After every task commit:** the task's grep gate. For any `documentation/` edit, also the docs build.
- **After every plan wave:** all grep gates plus the docs build.
- **Before `/gsd-verify-work`:** the full suite must be green.
- **Max feedback latency:** 30 seconds.

---

## Per-Task Verification Map

Filled in by the planner/executor from the plan tasks. Requirement → check families (commands are in 130-RESEARCH.md §Validation Architecture):

| Requirement | Check | Automated | Status |
|-------------|-------|-----------|--------|
| MIG-01 | No `javaPath`/`BBjCFCli`/`BBjCodeFormatter`/"formatter jar" in `documentation/docs` | grep (expect empty) | ✅ green (no hits) |
| MIG-01 | `bbjlst` appears only in Decompile contexts | grep review | ✅ green (3 hits, all Decompile in vscode/commands.md) |
| MIG-01 | All `bbj.formatter.*` keys from package.json appear in vscode/configuration.md | node script (`missing: []`) | ✅ green (16 keys, `missing: []`) |
| MIG-01 | The CRLF `:::warning`, the `:::info` box and lsp4ij #381 link appear in intellij/formatting.md | grep | ✅ green |
| MIG-01 | The docs site builds and links resolve | docs build ("Generated static files") | ✅ green (`Generated static files`) |
| MIG-02 | The release-notes draft covers all required items | grep plus human read | ✅ green (46 matching lines) + UAT test 2 pass |
| MIG-02 | Snippets match 130-FORMAT-EVIDENCE.md | diff | ✅ green (7 fences, 0 not verbatim) |
| MIG-02 | changeNotes has no "0.1.0 - Initial", `tools/formatter` or `com.redhat.devtools.lsp4ij:` | grep (expect empty) + vitest guard | ✅ green (no hits) + vitest guard 13/13 |
| MIG-03 | Smoke has 14 rows; full checklist has no javaPath | grep count | ✅ green (14 rows; no javaPath) |
| MIG-03 | Both IDEs cover format, selection, on-save, Denumber and BBjServices | grep review | ✅ green (18 topic hits) + UAT test 3 pass |
| all | No planning ids (D-NN, MIG-NN, NNN-NN) in shipped text | grep (expect empty) | ✅ green (no hits) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `130-FORMAT-EVIDENCE.md`: before/after inputs, commands and raw outputs (old jar from `06c81df9^` on Java 25; new from live :5008 `formatProgram`)

Existing infrastructure covers everything else.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs read correctly and describe actual behaviour | MIG-01 | Prose accuracy | Read both formatting pages against the 130-RESEARCH.md Section A message table. Confirmed 2026-10-04 by UAT tests 1 and 4 |
| QA rows are executable as written | MIG-03 | Needs real IDEs | Read the rows against Section A/D. Executing them happens at the release QA run. Executed 2026-10-04 in UAT test 3: pass |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-04

---

## Validation Audit 2026-10-04

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All grep gates from 130-RESEARCH.md §Validation Architecture were re-run on the final tree, and all were green. The docs build printed "Generated static files". `formatter-removal.test.ts` passed 13/13. The manual-only rows were covered by 130-UAT.md (4/4 pass).
