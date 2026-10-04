---
phase: "130"
slug: "docs-migration"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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

| Requirement | Check | Automated |
|-------------|-------|-----------|
| MIG-01 | No `javaPath`/`BBjCFCli`/`BBjCodeFormatter`/"formatter jar" in `documentation/docs` | grep (expect empty) |
| MIG-01 | `bbjlst` appears only in Decompile contexts | grep review |
| MIG-01 | All `bbj.formatter.*` keys from package.json appear in vscode/configuration.md | node script (`missing: []`) |
| MIG-01 | The CRLF `:::warning`, the `:::info` box and lsp4ij #381 link appear in intellij/formatting.md | grep |
| MIG-01 | The docs site builds and links resolve | docs build ("Generated static files") |
| MIG-02 | The release-notes draft covers all required items | grep plus human read |
| MIG-02 | Snippets match 130-FORMAT-EVIDENCE.md | diff |
| MIG-02 | changeNotes has no "0.1.0 - Initial", `tools/formatter` or `com.redhat.devtools.lsp4ij:` | grep (expect empty) + vitest guard |
| MIG-03 | Smoke has 14 rows; full checklist has no javaPath | grep count |
| MIG-03 | Both IDEs cover format, selection, on-save, Denumber and BBjServices | grep review |
| all | No planning ids (D-NN, MIG-NN, NNN-NN) in shipped text | grep (expect empty) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `130-FORMAT-EVIDENCE.md`: before/after inputs, commands and raw outputs (old jar from `06c81df9^` on Java 25; new from live :5008 `formatProgram`)

Existing infrastructure covers everything else.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs read correctly and describe actual behaviour | MIG-01 | Prose accuracy | Read both formatting pages against the 130-RESEARCH.md Section A message table |
| QA rows are executable as written | MIG-03 | Needs real IDEs | Read the rows against Section A/D. Executing them happens at the release QA run |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
