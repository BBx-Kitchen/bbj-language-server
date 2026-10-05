---
phase: "125"
slug: "ls-formatting"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-01"
---

# Phase 125 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 (bbj-vscode); JUnit Jupiter (bbj-intellij) |
| **Config file** | `bbj-vscode/vitest.config.ts`; `bbj-intellij/build.gradle.kts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/bbj-format-settings.test.ts test/bbj-format-edit.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (judge on `numFailedTests: 0`), plus `npm run lint`, `npm run typecheck:test`, and `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` after `npm run build` |
| **Estimated runtime** | ~30 seconds quick; ~6 minutes full |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the touched module (plus `test/extension-activation.test.ts test/activation-command-coverage.test.ts` when `extension.ts` changes)
- **After every plan wave:** Run the full vitest suite, lint and typecheck:test
- **Before `/gsd-verify-work`:** Full suite green, `npm run build`, then `bbj-intellij ./gradlew test`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Filled by the planner per task; requirement → test map from 125-RESEARCH.md § Validation Architecture:

| Requirement | Test Type | Automated Command | File Exists | Status |
|-------------|-----------|-------------------|-------------|--------|
| FMT-01, FMT-02 | unit (scripted double) | `npx vitest run test/bbj-format-service.test.ts` | ✅ | ✅ green |
| FMT-03 | unit | `npx vitest run test/bbj-formatting-handler.test.ts test/bbj-format-service.test.ts test/bbj-formatter-capability.test.ts` | ✅ | ✅ green |
| FMT-04, FMT-05 | unit + live | `npx vitest run test/bbj-format-edit.test.ts test/bbj-format-service.test.ts`; `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` | ✅ | ✅ green |
| FMT-08, FMT-09, FMT-10, FMT-11 | unit with fake messenger | `npx vitest run test/bbj-format-service.test.ts` | ✅ | ✅ green |
| FMT-12 | unit | `npx vitest run test/bbj-formatting-handler.test.ts` | ✅ | ✅ green |
| SET-02 | unit + live | `npx vitest run test/bbj-format-settings.test.ts test/configuration-change-handler.test.ts` | ✅ | ✅ green |
| CUT-01 | unit | `npx vitest run test/extension-activation.test.ts test/activation-command-coverage.test.ts` | ✅ | ✅ green |
| IJF-01 | JUnit source guard | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` | ✅ | ✅ green |

Per task (all vitest commands run with cwd `bbj-vscode`):

| Plan-Task | Requirement | Automated Command | Status |
|-----------|-------------|-------------------|--------|
| 125-01-1 | SET-02 | `npx vitest run test/bbj-format-settings.test.ts && npm run typecheck:test` | ✅ green |
| 125-01-2 | FMT-04, FMT-05 | `npx vitest run test/bbj-format-edit.test.ts test/bbj-format-settings.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-02-1 | IJF-01 | `./gradlew cleanTest test --tests 'com.basis.bbj.intellij.lsp.*'` (cwd `bbj-intellij`) | ✅ green |
| 125-02-2 | IJF-01 | `./gradlew cleanTest test` (cwd `bbj-intellij`) | ✅ green |
| 125-03-1 | FMT-01, FMT-04, FMT-05, SET-02 | `npx vitest run test/bbj-format-service.test.ts test/java-interop-program-test-double.test.ts && npm run typecheck:test` | ✅ green |
| 125-03-2 | FMT-02, FMT-03, FMT-12 | `npx vitest run test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-03-3 | FMT-03 | `npx vitest run test/bbj-formatter.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/java-interop-program-test-double.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-04-1 | FMT-11 | `npx vitest run test/bbj-format-notices.test.ts test/bbj-format-service.test.ts && npm run typecheck:test` | ✅ green |
| 125-04-2 | FMT-10 | `npx vitest run test/bbj-format-notices.test.ts test/bbj-format-service.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-04-3 | FMT-08, FMT-09 | `npx vitest run test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/bbj-formatter.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-05-1 | SET-02 | `npx vitest run test/configuration-change-handler.test.ts test/bbj-format-settings-intake.test.ts test/config-hot-reload-wiring.test.ts test/config-path-resolution.test.ts test/interop-config.test.ts && npm run typecheck:test` | ✅ green |
| 125-05-2 | SET-02 | `npx vitest run test/bbj-format-settings-intake.test.ts test/extension-config-trust.test.ts test/configuration-change-handler.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-06-1 | CUT-01, FMT-01, FMT-02, FMT-03 | `npx vitest run test/bbj-formatter-capability.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/bbj-formatting-handler.test.ts test/bbj-formatter.test.ts test/setopts-in-code-request.test.ts test/config-hot-reload-wiring.test.ts && npm run typecheck:test && npm run lint && npm run build` | ✅ green |
| 125-06-2 | FMT-08 (client half) | `npx vitest run test/extension-activation.test.ts test/activation-command-coverage.test.ts test/activation-prompts-and-status-bars.test.ts test/config-reload-host.test.ts test/extension-config-trust.test.ts && npm run typecheck:test && npm run lint` | ✅ green |
| 125-06-3 | FMT-01, FMT-04, SET-02 (live); phase gates | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept`; `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 && npm run lint && npm run typecheck:test && npm run build`; `./gradlew cleanTest test` (cwd `bbj-intellij`) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test/bbj-format-settings.test.ts`, `test/bbj-format-edit.test.ts`, `test/bbj-format-service.test.ts`, `test/bbj-formatting-handler.test.ts`, `test/bbj-formatter-capability.test.ts`
- [x] `JavaInteropTestService` (`test/bbj-test-module.ts`) records `formatProgram` params and supports a deferred answer script
- [x] Recording fake messenger injected into the format service
- [x] `test/configuration-change-handler.test.ts` deps helper gains the formatter-settings setter
- [x] `test/extension-activation.test.ts` and `test/activation-command-coverage.test.ts` updated for the provider removal
- [x] `test/functional/program-live.test.ts` extended (15-key defaults accepted; cold-lane first-format latency)
- [x] IntelliJ: `Lsp4ijOverrideSiteSourceGuardTest`, `Lsp4ijImportAllowlistTest`, `Lsp4ijCouplingCanaryTest` updated

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One BBj formatter listed; Format Document / Selection / on-save keep cursor, folding, undo; second format leaves file unmodified | FMT-01..05, CUT-01 | needs a real VS Code editor | Install the VSIX built from the final tree, run against live BBj 26.03 |
| Invalid-settings and older-BBj messages | FMT-08, FMT-11 | needs editor UI and the `java-interop/` mirror | Set an invalid `bbj.formatter.indentWidth`; connect to the mirror |
| IntelliJ offers no LSP formatting | IJF-01 | needs a real IDE | Install the plugin zip; Reformat Code and Actions on Save do nothing for BBj |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-02

---

## Validation Audit 2026-10-02

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence: the 16 phase vitest suites, 277 tests, green; live `RUN_BBJ_TESTS=1 test/functional/program-live.test.ts`
10/10 against BBjServices on :5008; `bbj-intellij ./gradlew cleanTest test` exit 0 with no failing result files.
The three manual-only rows passed in 125-UAT.md (5/5).
