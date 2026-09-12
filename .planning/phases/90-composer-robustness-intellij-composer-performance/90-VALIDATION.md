---
phase: "90"
slug: "composer-robustness-intellij-composer-performance"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-12"
validated: "2026-09-12"
---

# Phase 90 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (VS Code extension + language server); plain JUnit 5 (IntelliJ plugin, no platform test framework) |
| **Config file** | `bbj-vscode/vitest.config.ts`; `bbj-intellij/build.gradle.kts` `test {}` block |
| **Quick run command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/<file> --root /home/coder/repos/bbj-language-server/bbj-vscode` · `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests '<class>'` |
| **Full suite command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` and `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline` |
| **Estimated runtime** | ~180 seconds (VS Code full suite) + ~120 seconds (IntelliJ full suite) |

---

## Sampling Rate

- **After every task commit:** Run the task's single-file vitest / single-class gradle command
- **After every plan wave:** Run both full suite commands (judge VS Code on `numFailedTests: 0`; use `--maxWorkers=2` if hook timeouts appear)
- **Before `/gsd-verify-work`:** Both full suites green; both distributables (VSIX + IntelliJ zip) rebuilt from the final tree
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

Task IDs from the eight plans; statuses from the 2026-09-12 audit run against HEAD (post code-review fixes).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 90-02-T1, 90-02-T2 | 90-02 | 1 | DISC-07 | T-90 input validation | Malformed addWindow/addChildWindow field text never reaches `applyEdit`; server-side `valid` guard is authoritative | unit | `vitest run test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts test/window-composer-validation-ui.test.ts` | ✅ | ✅ green |
| 90-06-T1, 90-06-T2 | 90-06 | 2 | DISC-07 | T-90 input validation | IntelliJ addWindow/addChildWindow OK gated on `valid`; DTO fields survive Gson | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerModelsJsonBoundaryTest'` (30/30) | ✅ | ✅ green |
| 90-01-T2 | 90-01 | 1 | DISC-08 | T-90 stale edit | Picker aborts when the target call changed or moved during the wizard | unit | `vitest run test/msgbox-composer-ui.test.ts` | ✅ | ✅ green |
| 90-01-T1, 90-01-T3, 90-07-T1, 90-07-T2 | 90-01, 90-07 | 1, 3 | DISC-08 (folded todo) | T-90 stale edit | Unfinished `MSGBOX(` completes in place through the guarded write | unit + JUnit | `vitest run test/msgbox-composer.test.ts test/composer-commands.test.ts test/composer-lens-command.test.ts` · `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.DecodeEqualityTest'` (28/28) | ✅ | ✅ green |
| 90-05-T1, 90-05-T2, 90-05-T3 | 90-05 | 2 | DISC-09 | T-90 resource leak | Every composer panel's message listener is disposed with its panel | unit | `vitest run test/webview-panel-lifecycle.test.ts` (source-discovered, ≥6 panel modules) | ✅ | ✅ green |
| 90-04-T1, 90-04-T2 | 90-04 | 1 | DISC-10 | — | All six IntelliJ dialogs route every input through `scheduleRefresh()`, which advances `seq` before the debouncer | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest' --tests 'com.basis.bbj.intellij.concurrency.PreviewDebouncerTest'` (15/15, 7/7) | ✅ | ✅ green |
| 90-03-T1, 90-03-T2 | 90-03 | 1 | DISC-11 | T-90 stale handle | Cache hit, invalidation on any status change, clear on failed request | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerHandleCacheTest' --tests 'com.basis.bbj.intellij.composer.ComposerFlowTest'` (10/10, 17/17) | ✅ | ✅ green |
| 90-03-T1 | 90-03 | 1 | DISC-11 | — | LSP4IJ import surface of `BbjComposerService.java` stays allowlisted | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest'` (6/6) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Not mapped to a requirement row: 90-07-T3 (MSGBOX intention preview and description text) and 90-08-T1/T2 (installed-bundle proof, QA rows and end-of-phase human checks). No requirement's coverage depends on them.

---

## Wave 0 Requirements

- [x] `bbj-vscode/test/msgbox-composer.test.ts` — MSGBOX `incomplete` decode outcome cases (mirror `cvs-composer.test.ts`)
- [x] `bbj-vscode/test/msgbox-composer-ui.test.ts` — picker "document edited during the wizard" regression test and span-exact check cases
- [x] `bbj-vscode/test/addwindow-composer.test.ts`, `bbj-vscode/test/addchildwindow-composer.test.ts` — per-field validation assertions
- [x] new VS Code panel lifecycle test discovering every composer webview file (`test/webview-panel-lifecycle.test.ts`)
- [x] new IntelliJ composer server/catalog cache test (plain JUnit) (`ComposerHandleCacheTest`)
- [x] `ComposerDialogRefreshSourceGuardTest.java` — MSGBOX/addWindow/addChildWindow moved into the debounced-dialog subject list

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Typing quickly in a live IntelliJ MSGBOX/addWindow/addChildWindow dialog feels responsive and OK re-enables after settling | DISC-10 | Swing timing in a real IDE is not exercised by plain JUnit | Build and install the plugin zip, open each dialog, type a burst, confirm the preview updates once after typing stops — **passed in 90-UAT.md test 1 (2026-09-12)** |
| Second composer open in one IntelliJ session is visibly faster; still works after Restart Language Server | DISC-11 | Needs a live LSP4IJ server lifecycle | Open a composer twice, restart the server from the status bar, open again — **passed in 90-UAT.md test 1 (2026-09-12)** |
| VS Code MSGBOX cue/context-menu completion, stale-edit refusal beside the open panel, window composer field errors in the live webview | DISC-07, DISC-08 | Needs a running VS Code window and a live edit beside a non-modal panel | Reinstall the VSIX and follow QA rows VS Code 22-23 — **passed in 90-UAT.md test 2 (2026-09-12)** |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-12

---

## Validation Audit 2026-09-12

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence: targeted vitest run of the eight Phase 90 files, 203/203 passed; targeted IntelliJ JUnit run of the seven composer classes, 113/113 passed (result XML timestamped 2026-09-12T22:04Z). Both runs were against HEAD, which includes the code-review fixes.
