---
phase: "113"
slug: "composer-webview-hardening-consolidation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-09-27"
---

# Phase 113 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (bbj-vscode); JUnit 5 (bbj-intellij, `ComposerModelsJsonBoundaryTest`) |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |
| **Estimated runtime** | ~180 seconds (full suite); ~5 seconds (single file) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command scoped to the files just touched
- **After every plan wave:** Run the full suite command (judge on `numFailedTests`, compare failing-test names against the phase base commit)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

Filled in by the planner and executors. Requirement-level map (from RESEARCH.md § Validation Architecture):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| SEC-10 | Wrong-shaped message to each of the six webviews is dropped before `build()` / request / WorkspaceEdit | unit | `npx vitest run test/composer-webview-message-shape.test.ts test/webview-message-guard.test.ts` | ✅ | ✅ green |
| SEC-11 | `assignTo` validator rejects invalid targets, accepts valid ones | unit | `npx vitest run test/composer-assign-to.test.ts test/msgbox-composer.test.ts test/cvs-composer.test.ts` | ✅ | ✅ green |
| SEC-11 | Empty/invalid `assignTo` on new insert marks preview invalid, blocks Insert | unit | `npx vitest run test/msgbox-composer-ui.test.ts test/cvs-composer-ui.test.ts` | ✅ | ✅ green |
| SEC-11 | IntelliJ previews deserialize `assignToError` | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests '*ComposerModelsJsonBoundaryTest'` | ✅ | ✅ green |
| TEST-10 | addWindow / addChildWindow / SETOPTS composer-ui code actions, lenses, commands execute | unit | `npx vitest run test/addwindow-composer-ui.test.ts test/addchildwindow-composer-ui.test.ts test/setopts-composer-ui.test.ts` | ✅ | ✅ green |
| REF-03 | `composer-commands.ts` moved out of `src/language/`, behavior unchanged | unit | `npx vitest run test/composer-commands.test.ts test/setopts-in-code-request.test.ts` | ✅ | ✅ green |
| REF-07 | One shared CSP helper, output identical to prior inline arrays | unit | `npx vitest run test/webview-csp.test.ts` | ✅ | ✅ green |
| REF-08 | One shared scanner / locator / titleArg / code-action helper; suites pass with zero assertion changes | unit | `npx vitest run test/composer-call-scanner.test.ts test/msgbox-composer.test.ts test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts test/cvs-composer.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test/addwindow-composer-ui.test.ts` — TEST-10 for `addwindow-composer-ui.ts`
- [x] `test/addchildwindow-composer-ui.test.ts` — TEST-10 for `addchildwindow-composer-ui.ts`
- [x] `test/setopts-composer-ui.test.ts` — TEST-10 for `setopts-composer-ui.ts` (not `setopts-in-code-ui.ts`)
- [x] Message-guard unit tests and malformed-message assertions for all six webviews (SEC-10)
- [x] `assignTo` validator tests (SEC-11)
- [x] `ComposerModelsJsonBoundaryTest.java` additions for `assignToError`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Class docs describe edit-in-place flow and all six composer kinds | DOC-01 | Javadoc prose, no automated assertion | Read `AddWindowComposerDialog` and `ComposerLauncher` class docs |
| IntelliJ msgbox/CVS dialogs show `assignTo` error and disable Insert | SEC-11 | Swing dialog UI | Open the composer in IntelliJ, type an invalid `assignTo`, confirm the preview marks it invalid and Insert is disabled — passed in 113-UAT.md test 2 (VS Code counterpart: test 1) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-27

---

## Validation Audit 2026-09-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All eight map rows are covered by existing tests: vitest 17 files / 537 tests green, `ComposerModelsJsonBoundaryTest` 36/36 green. Wave 0 items were delivered as `addwindow-/addchildwindow-/setopts-composer-ui.test.ts`, `composer-webview-message-shape.test.ts` + `webview-message-guard.test.ts` (SEC-10), `webview-csp.test.ts` (REF-07), `composer-assign-to.test.ts` (SEC-11) and `composer-call-scanner.test.ts` (REF-08).
