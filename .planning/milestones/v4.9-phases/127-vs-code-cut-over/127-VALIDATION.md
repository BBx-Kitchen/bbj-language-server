---
phase: "127"
slug: "vs-code-cut-over"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
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

Filled in by the planner from the PLAN.md task list (commands run with cwd `bbj-vscode`; each task's full `<verify>` also runs `npm run typecheck:test` and `npm run lint`):

| Task | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|----------|-----------|-------------------|-------------|--------|
| 127-01 T1 | DEN-02 | Command guard, open→show→send order, no retry, never saves, Explorer wiring, id/menus/keybinding pinned | unit + activation wiring | `npx vitest run test/denumber-command.test.ts test/activation-prompts-and-status-bars.test.ts test/activation-command-coverage.test.ts` | ✅ | ✅ green |
| 127-01 T2 | DEN-05 | Prompt text/button, routes via `bbj.denumber`, read-only branch, detection unchanged | unit | `npx vitest run test/activation-prompts-and-status-bars.test.ts` | ✅ | ✅ green |
| 127-02 T1 | CUT-02 | Formatter module gone, launcher set narrowed to two, README reworded | unit + build | `npx vitest run test/formatter-removal.test.ts test/no-shell-command-construction.test.ts && npm run build` | ✅ | ✅ green |
| 127-02 T2 | SET-04 | `javaPath` and its resolver gone | unit | `npx vitest run test/formatter-removal.test.ts test/bbj-format-settings.test.ts` | ✅ | ✅ green |
| 127-02 T3 | CUT-02 | Verifier and `tools/formatter` gone; packaged list has no jar | unit + gate | `npx vitest run test/formatter-removal.test.ts` and `npx vsce ls --no-dependencies` check | ✅ | ✅ green |
| 127-03 T1 | SET-01, SET-04, DEN-05 | 15 typed keys, defaults == `FORMATTER_DEFAULTS`, enums == bbj-ls values, deprecated key shape, applies without restart | unit | `npx vitest run test/formatter-settings-schema.test.ts test/configuration-change-handler.test.ts` | ✅ | ✅ green |
| 127-03 T2 | SET-03 | Per-scope migration, idempotent, failure tolerant, trusted workspace only, activation wiring | unit + activation wiring | `npx vitest run test/settings-migration.test.ts test/settings-migration-activation.test.ts` | ✅ | ✅ green |
| 127-04 T1 | DEN-06 | Decompile argv always `-l` (+ `-xlst` for `.lst`), decompile runs end to end | unit + execution | `npx vitest run test/command-argv-injection.test.ts test/commands-cjs-execution.test.ts` | ✅ | ✅ green |
| 127-04 T2 | DEN-06 | No denumber member/helper/option; source guard | unit + source guard | `npx vitest run test/commands-cjs-execution.test.ts test/target-resolution.test.ts test/decompile-io.test.ts` | ✅ | ✅ green |
| 127-04 T3 | DEN-06 | Decompile (Replace) and (Read-only) refuse plain text before any bbjlst launch; tokenized flow unchanged | execution | `npx vitest run test/commands-cjs-execution.test.ts` | ✅ | ✅ green |
| 127-05 T1/T2 | DEN-06 | Activation mocks match Commands.cjs | unit | the ten activation suites | ✅ | ✅ green |
| 127-06 T1 | CUT-02, CUT-03 | VSIX installed, no jar, live format/DENUM, IntelliJ zip | gate + live | `bbj-ext-install`, `unzip -l /tmp/bbj-lang.vsix` check, `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` | ✅ | ✅ green |
| 127-06 T2 | all | Whole suite, lint, typecheck, build, IntelliJ suite, hygiene, register check | gate | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` and the rest of the task's verify | ✅ | ✅ green |
| 127-06 T3 | CUT-03 | Hand check from the installed VSIX | manual | — | n/a | ✅ passed (127-06 hand check; step 15 under override, see below) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 plan: each new test file is written first inside the task that needs it (`tdd="true"` tasks).

- [x] `test/formatter-settings-schema.test.ts` — SET-01, SET-03 (shape), SET-04, DEN-05 (description) — 127-03 T1
- [x] `test/settings-migration.test.ts`, `test/settings-migration-activation.test.ts` — SET-03 — 127-03 T2
- [x] `test/denumber-command.test.ts` — DEN-02 — 127-01 T1
- [x] `test/formatter-removal.test.ts` — CUT-02, SET-04 absence asserts — 127-02 T1-T3 (the DEN-06 source guard lives in `test/decompile-io.test.ts`, 127-04 T2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Format Document / Selection / on-save, numbered-file offer, Denumber (command, Explorer on unopened file, open prompt), Denumber and Format, Decompile — from the installed VSIX | CUT-03 | Needs a GUI VS Code and live BBjServices | Build + install VSIX from the final tree, run the RESEARCH.md Q7 step list |
| In-place decompile (Decompile & Replace) of a tokenized program from the open prompt; a symlinked tokenized file (review WR-01) | DEN-06 | Needs a real tokenized program and bbjlst in a GUI VS Code; the defect predates the phase | Not green: hand check step 15 failed. Accepted by user override 2026-10-03 and tracked as ROADMAP backlog 999.1. The bbjlst argv itself is pinned by `command-argv-injection` and `commands-cjs-execution` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-05

---

## Validation Audit 2026-10-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence: the 22 suites in the map ran green: 471 tests. They are the 14 named task files plus the ten
Commands.cjs-mocking activation suites from 127-05, with `activation-command-coverage`,
`activation-prompts-and-status-bars` and `settings-migration-activation` shared between the two lists.
`npx vsce ls --no-dependencies` lists 32 files, with no `.jar`, `tools/formatter` or `BBjCFCli` entry.
The live `RUN_BBJ_TESTS=1 test/functional/program-live.test.ts` ran 17/17 against BBjServices on :5008.
CUT-03 was covered by the 127-06 hand check from the installed VSIX (127-VERIFICATION.md SC5). The one
manual item that is not green, in-place decompile (DEN-06, step 15), predates the phase and is covered by
the user's override and backlog 999.1, so it stays manual-only rather than counting as a test gap.
