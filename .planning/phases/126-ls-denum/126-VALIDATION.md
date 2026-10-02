---
phase: "126"
slug: "ls-denum"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-02"
---

# Phase 126 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode), ESLint, `tsc --noEmit` via `npm run typecheck:test`; Gradle `test` for bbj-intellij |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/denum-command.test.ts test/bbj-denum-service.test.ts test/denum-diagnostics-output.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/notifications.test.ts && npm run typecheck:test` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 && npm run lint && npm run typecheck:test && npm run build` (judge on `numFailedTests`); live: `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept`; IntelliJ: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| **Estimated runtime** | ~60 s quick, ~6 min full |

---

## Sampling Rate

- **After every task commit:** the task's test file(s) plus `npm run typecheck:test`
- **After every plan wave:** the quick run command plus `npm run lint`
- **Before `/gsd-verify-work`:** full suite green on `numFailedTests`, live file, `bbj-intellij ./gradlew test`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

Filled by the planner per task; requirement → test mapping from RESEARCH.md:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DEN-01 | `bbj/denum` handler: params, open BBj doc only, status/edit/diagnostics, never throws | unit | `npx vitest run test/denum-command.test.ts` | ❌ W0 | ⬜ pending |
| DEN-01 | Versioned `applyEdit`, no edit when unnumbered, stale version never applied | unit | `npx vitest run test/bbj-denum-service.test.ts` | ❌ W0 | ⬜ pending |
| DEN-01 | Live numbered/unnumbered/mixed/tokenized through :5008 | live (gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` | extend | ⬜ pending |
| DEN-03 | One message per outcome, severities, never deduplicated, tokenized never sent | unit | `npx vitest run test/bbj-denum-service.test.ts` | ❌ W0 | ⬜ pending |
| DEN-04 | List notification only after success with diagnostics > 0; Show → reveal notification | unit | `npx vitest run test/bbj-denum-service.test.ts test/denum-diagnostics-output.test.ts` | ❌ W0 | ⬜ pending |
| DEN-04 | Extension handlers registered/disposed, Show reveals 'BBj' channel | unit | `npx vitest run test/extension-activation.test.ts test/activation-command-coverage.test.ts` | update | ⬜ pending |
| FMT-06 | `-33006` → `[]` + one deduped offer (2 actions doc, 1 action range) | unit | `npx vitest run test/bbj-format-notices.test.ts test/bbj-format-service.test.ts` | update | ⬜ pending |
| FMT-07 | "Denumber and Format" = one `formatProgram` with `allowDenum: true`, one edit | unit | `npx vitest run test/bbj-denum-service.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/denum-command.test.ts`, `test/bbj-denum-service.test.ts`, `test/denum-diagnostics-output.test.ts` (new)
- [ ] `JavaInteropTestService.denumProgram` records calls (`denumProgramCalls`) and accepts the token
- [ ] Shared fake server connection (`workspace.applyEdit`, window messages, `sendNotification`) extracted from `bbj-format-notices.test.ts`
- [ ] Activation test pins updated for two new notification handlers

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Offer, Denumber, Denumber and Format, undo, dirty buffer, messages, Show list in a real VS Code | FMT-06, FMT-07, DEN-01, DEN-03, DEN-04 | Needs live BBj 26.03 BBjServices and the built VSIX | Build VSIX from final tree; numbered, mixed, unnumbered, tokenized, protected files; format doc/selection/on-save; click each action; Ctrl+Z |
| IntelliJ stays quiet with the unhandled notification | DEN-04 | LSP4IJ runtime behaviour | Build IntelliJ zip; open BBj files; confirm no error balloon in idea.log |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
