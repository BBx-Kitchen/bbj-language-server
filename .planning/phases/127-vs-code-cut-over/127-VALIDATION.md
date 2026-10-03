---
phase: "127"
slug: "vs-code-cut-over"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-03"
---

# Phase 127 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode), ESLint, `tsc --noEmit` via `npm run typecheck:test` |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <task test files> && npm run typecheck:test` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 && npm run lint && npm run typecheck:test && npm run build` |
| **Estimated runtime** | quick ~30 s; full ~5 min |

cwd must be `bbj-vscode`; never `--reporter=basic`; run tests in the foreground. Judge the full suite on `numFailedTests`.

---

## Sampling Rate

- **After every task commit:** the task's test files plus `npm run typecheck:test`
- **After every plan wave:** quick set for the wave plus `npm run lint` and `npm run build`
- **Before `/gsd-verify-work`:** full suite green, VSIX content check, hand check from a VSIX built from the final tree
- **Max feedback latency:** ~60 seconds per task

---

## Per-Task Verification Map

Filled in by the planner / validate-phase from the PLAN.md task list. Requirement → test mapping (from RESEARCH.md "Validation Architecture"):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| SET-01 | 15 keys typed, defaults == `FORMATTER_DEFAULTS`, enums == bbj-ls values | unit | `npx vitest run test/formatter-settings-schema.test.ts` | ❌ W0 | ⬜ pending |
| SET-01 | Applies without restart | unit | `npx vitest run test/configuration-change-handler.test.ts` | ✅ | ⬜ pending |
| SET-03 | Per-scope migration, idempotent, failure tolerant; deprecated key shape | unit | `npx vitest run test/settings-migration.test.ts test/formatter-settings-schema.test.ts` | ❌ W0 | ⬜ pending |
| SET-04 | `javaPath` absent | unit | `npx vitest run test/formatter-settings-schema.test.ts` | ❌ W0 | ⬜ pending |
| DEN-02 | Command guard, open→send order, id/menus/keybinding pinned | unit | `npx vitest run test/denumber-command.test.ts test/activation-command-coverage.test.ts` | ❌ W0 / ✅ | ⬜ pending |
| DEN-05 | Prompt text/button, routes via `bbj.denumber`, read-only branch | unit | `npx vitest run test/activation-prompts-and-status-bars.test.ts` | ✅ (edit) | ⬜ pending |
| DEN-06 | No denumber on bbjlst path; decompile argv `-l` (+ `-xlst` for `.lst`) | unit | `npx vitest run test/command-argv-injection.test.ts test/commands-cjs-execution.test.ts test/decompile-io.test.ts` | ✅ (edit) | ⬜ pending |
| CUT-02 | Files and references gone; launcher guard narrowed | unit | `npx vitest run test/formatter-removal.test.ts test/no-shell-command-construction.test.ts` | ❌ W0 / ✅ | ⬜ pending |
| CUT-02 | VSIX has no jar / `tools/formatter`, keeps the three scripts | gate | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vsce ls --no-dependencies` | n/a | ⬜ pending |
| CUT-03 | End to end from VSIX on live BBj 26.03 | manual + live companion | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/formatter-settings-schema.test.ts` — SET-01, SET-03 (shape), SET-04, DEN-05 (description)
- [ ] `test/settings-migration.test.ts` — SET-03
- [ ] `test/denumber-command.test.ts` — DEN-02
- [ ] `test/formatter-removal.test.ts` — CUT-02, DEN-06 absence asserts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Format Document / Selection / on-save, numbered-file offer, Denumber (command, Explorer on unopened file, open prompt), Denumber and Format, Decompile — from the installed VSIX | CUT-03 | Needs a GUI VS Code and live BBjServices | Build + install VSIX from the final tree, run the RESEARCH.md Q7 step list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
