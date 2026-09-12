---
phase: "90"
slug: "composer-robustness-intellij-composer-performance"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-12"
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

Seeded from 90-RESEARCH.md §Validation Architecture; task IDs are filled in by the planner.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DISC-07 | T-90 input validation | Malformed addWindow/addChildWindow field text never reaches `applyEdit`; server-side `valid` guard is authoritative | unit | `vitest run test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts` | ✅ files / ❌ W0 assertions | ⬜ pending |
| TBD | TBD | TBD | DISC-07 | T-90 input validation | IntelliJ addWindow/addChildWindow OK gated on `valid`; DTO fields survive Gson | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerModelsJsonBoundaryTest'` | ✅ / ❌ W0 cases | ⬜ pending |
| TBD | TBD | TBD | DISC-08 | T-90 stale edit | Picker aborts when the target call changed or moved during the wizard | unit | `vitest run test/msgbox-composer-ui.test.ts` | ✅ / ❌ W0 test | ⬜ pending |
| TBD | TBD | TBD | DISC-08 (folded todo) | T-90 stale edit | Unfinished `MSGBOX(` completes in place through the guarded write | unit + JUnit | `vitest run test/msgbox-composer.test.ts` · `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.DecodeEqualityTest'` | ✅ / ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DISC-09 | T-90 resource leak | Every composer panel's message listener is disposed with its panel | unit | new discovery-based panel lifecycle test | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DISC-10 | — | All six IntelliJ dialogs route every input through `scheduleRefresh()` | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest'` | ✅ / ❌ W0 list edit | ⬜ pending |
| TBD | TBD | TBD | DISC-11 | T-90 stale handle | Cache hit, invalidation on any status change, clear on failed request | JUnit | new composer server/catalog cache test | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DISC-11 | — | LSP4IJ import surface of `BbjComposerService.java` stays allowlisted | JUnit | `./gradlew test --offline --tests 'com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest'` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/msgbox-composer.test.ts` — MSGBOX `incomplete` decode outcome cases (mirror `cvs-composer.test.ts`)
- [ ] `bbj-vscode/test/msgbox-composer-ui.test.ts` — picker "document edited during the wizard" regression test and span-exact check cases
- [ ] `bbj-vscode/test/addwindow-composer.test.ts`, `bbj-vscode/test/addchildwindow-composer.test.ts` — per-field validation assertions
- [ ] new VS Code panel lifecycle test discovering every composer webview file
- [ ] new IntelliJ composer server/catalog cache test (plain JUnit)
- [ ] `ComposerDialogRefreshSourceGuardTest.java` — MSGBOX/addWindow/addChildWindow moved into the debounced-dialog subject list

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Typing quickly in a live IntelliJ MSGBOX/addWindow/addChildWindow dialog feels responsive and OK re-enables after settling | DISC-10 | Swing timing in a real IDE is not exercised by plain JUnit | Build and install the plugin zip, open each dialog, type a burst, confirm the preview updates once after typing stops |
| Second composer open in one IntelliJ session is visibly faster; still works after Restart Language Server | DISC-11 | Needs a live LSP4IJ server lifecycle | Open a composer twice, restart the server from the status bar, open again |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
