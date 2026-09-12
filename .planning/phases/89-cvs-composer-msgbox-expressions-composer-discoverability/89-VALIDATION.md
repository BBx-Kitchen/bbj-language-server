---
phase: "89"
slug: "cvs-composer-msgbox-expressions-composer-discoverability"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-12"
validated: "2026-09-12"
---

# Phase 89 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (bbj-vscode)** | Vitest (existing pin) |
| **Framework (bbj-intellij)** | JUnit 5 via Gradle `test` task (existing pin, `junit-bom:5.10.2`) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing, unmodified); `bbj-intellij/build.gradle.kts` `tasks.withType<Test>()` (existing) |
| **Quick run command (TS)** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` (cwd must be `bbj-vscode` — several suites read fixtures relative to cwd) |
| **Quick run command (Java)** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests '<class or package glob>'` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (bbj-vscode); `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --rerun` (bbj-intellij) |
| **Estimated runtime** | ~6 min vitest full suite at `--maxWorkers=2`; ~5 s Gradle `:test` (795 tests) |

---

## Sampling Rate

- **After every task commit:** the task's targeted `vitest run <file>` / `./gradlew test --tests "<class>"` (every automated task names one — see map)
- **After every plan wave:** bbj-vscode build + full vitest suite + `./gradlew test --offline --rerun` (run by the orchestrator after each of the 7 waves)
- **Before `/gsd-verify-work`:** full suites green on both sides (judged on `numFailedTests: 0` excluding the known local drift: `linking.test.ts` interop ×11 + `issue447` capability ×1)
- **Max feedback latency:** ~6 minutes (full vitest suite); targeted runs < 60 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 89-01-01 | 01 | 1 | DISC-01 | — | Server serves an addWindow composer cue from text/CST | unit | `vitest run test/composer-codelens.test.ts` | ✅ | ✅ green |
| 89-01-02 | 01 | 1 | DISC-01 (SC 5) | — | Bounded, Parsed-gated handler; no re-parse per request | unit (structural) | `vitest run test/composer-codelens-handler.test.ts test/composer-codelens.test.ts test/bbj-code-action-handler.test.ts` | ✅ | ✅ green |
| 89-01-03 | 01 | 1 | DISC-01 | — | `bbj.openComposerAt` opens the composer from its cue | unit | `vitest run test/composer-lens-command.test.ts test/extension-activation.test.ts test/setopts-in-code-ui.test.ts` + lint | ✅ | ✅ green |
| 89-02-01 | 02 | 1 | DISC-02 | — | Constant-sum options decode like a literal; unrecognized → compose-and-replace | unit | `vitest run test/msgbox-composer.test.ts test/composer-commands.test.ts` | ✅ | ✅ green |
| 89-02-02 | 02 | 1 | DISC-02 | — | VS Code lightbulb/panel show replace banner + original expression before Apply | unit | `vitest run test/msgbox-composer-ui.test.ts test/msgbox-composer.test.ts` + lint | ✅ | ✅ green |
| 89-03-01 | 03 | 1 | DISC-03 | — | CVS catalog/compose; `CVS(str, mask, chars?, ERR?!)` passes arity check (ts + bbl) | unit | `vitest run test/validation-function-calls.test.ts test/cvs-composer.test.ts test/builtin-functions-library.test.ts` | ✅ | ✅ green |
| 89-03-02 | 03 | 1 | DISC-03 | — | Call location, literal-sum edit-in-place decode, preview | unit | `vitest run test/cvs-composer.test.ts` + lint | ✅ | ✅ green |
| 89-04-01 | 04 | 2 | DISC-01 | — | Cue kind → launcher kind mapping; explicit-position launch | unit (Java) | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*'` | ✅ | ✅ green |
| 89-04-02 | 04 | 2 | DISC-01 | — | LSP4IJ command lands on an EDT action; vendor coupling pinned | unit (Java) | `./gradlew test --offline --tests '…lsp.Lsp4ijImportAllowlistTest' --tests '…lsp.Lsp4ijCouplingCanaryTest'` | ✅ | ✅ green |
| 89-04-03 | 04 | 2 | DISC-01 | — | Cue command contract pinned across the wire | unit (Java) | `./gradlew test --offline --tests '…composer.ComposerModelsJsonBoundaryTest' --tests '…actions.BbjOpenComposerAtActionSourceGuardTest' --tests '…composer.ComposerLensCommandContractTest'` | ✅ | ✅ green |
| 89-05-01 | 05 | 2 | DISC-03 | — | CVS panel: flat bits, disabled-not-hidden `chars`, valid-gated stale-checked write | unit | `vitest run test/cvs-composer-ui.test.ts test/cvs-composer.test.ts` | ✅ | ✅ green |
| 89-05-02 | 05 | 2 | DISC-03 | — | Command + lightbulb contributed in the manifest | unit | `vitest run test/cvs-composer-ui.test.ts test/extension-activation.test.ts` + lint | ✅ | ✅ green |
| 89-06-01 | 06 | 3 | DISC-01 | — | Installed bundle serves the addWindow cue; both distributables built | e2e (installed bundle) | `vitest run test/functional/installed-extension-e2e.test.ts` + build/install + zip inspection | ✅ | ✅ green |
| 89-06-02 | 06 | 3 | DISC-01 (SC 1) | T-89-20 | Code Vision renders and clicks through in a real IntelliJ build | manual (human-verify) | — (see Manual-Only) | n/a | ✅ GO (IU-262.10315.125) |
| 89-06-03 | 06 | 3 | DISC-01 | T-89-19 | Config routing decided by a human, never auto-selected | manual (decision) | — (recorded `Config routing decision: route`) | n/a | ✅ decided |
| 89-07-01 | 07 | 3 | DISC-03 | — | `bbj/composer/cvs/*` requests on the wire | unit + contract (Java) | `vitest run test/composer-commands.test.ts` + `./gradlew test --offline --tests '…composer.ComposerRequestContractTest'` | ✅ | ✅ green |
| 89-07-02 | 07 | 3 | DISC-02, DISC-03 | — | MSGBOX replace + CVS decode round-trip Gson and compare equal | unit (Java) | `./gradlew test --offline --tests '…composer.DecodeEqualityTest' --tests '…composer.ComposerModelsJsonBoundaryTest' --tests '…composer.ComposerRequestContractTest'` | ✅ | ✅ green |
| 89-08-01 | 08 | 4 | DISC-03 | — | IntelliJ CVS dialog: compose-new, guarded edit, not-editable reason | unit (Java source guards) | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*' --tests 'com.basis.bbj.intellij.concurrency.*'` | ✅ | ✅ green |
| 89-08-02 | 08 | 4 | DISC-02 | — | MSGBOX dialog replace banner + read-only original expression | unit (Java source guards) | `./gradlew test --offline --tests '…composer.ComposerReplaceBannerSourceGuardTest' --tests '…composer.ComposerDialogRefreshSourceGuardTest' --tests '…composer.ComposerApplyGuardSourceGuardTest'` | ✅ | ✅ green |
| 89-09-01 | 09 | 4 | DISC-01 | — | Server cues for MSGBOX, addChildWindow, editable CVS, editable in-code SETOPTS | unit | `vitest run test/composer-codelens.test.ts test/setopts-in-code-request.test.ts` | ✅ | ✅ green |
| 89-09-02 | 09 | 4 | DISC-01 | — | VS Code opens each composer from its cue | unit | `vitest run test/composer-lens-command.test.ts test/setopts-in-code-ui.test.ts test/extension-activation.test.ts` + lint | ✅ | ✅ green |
| 89-10-01 | 10 | 5 | DISC-03 | — | Alt+Enter CVS intention with description resources | unit (Java) | `./gradlew test --offline --tests '…composer.IntentionDescriptionResourcesTest'` | ✅ | ✅ green |
| 89-10-02 | 10 | 5 | DISC-03 | — | Editor context-menu CVS action; five intentions registered once | unit (Java) | `./gradlew test --offline --tests '…composer.ComposerIntentionPreviewSourceGuardTest' --tests '…actions.BbjComposeCvsActionSourceGuardTest' --tests '…composer.IntentionDescriptionResourcesTest'` | ✅ | ✅ green |
| 89-11-01 | 11 | 5 | DISC-01 | — | `bbx-config` documents text-only on the server (never built); config cue from raw text | unit | `vitest run test/bbj-document-builder-config.test.ts test/composer-codelens-handler.test.ts test/composer-codelens.test.ts` | ✅ | ✅ green |
| 89-11-02 | 11 | 5 | DISC-01 | — | VS Code sends config documents; client SETOPTS lens retired; one cue per line | unit | `vitest run test/composer-cue-single-source.test.ts test/composer-lens-command.test.ts test/config-file-association.test.ts test/config-reload-host.test.ts test/extension-activation.test.ts` + lint | ✅ | ✅ green |
| 89-12-01 | 12 | 6 | DISC-01 | — | IntelliJ `cvs` cue click opens the CVS composer | unit (Java) | `./gradlew test --offline --tests '…composer.ComposerLensKindsTest' --tests '…composer.ComposerLensCommandContractTest' --tests '…actions.BbjOpenComposerAtActionSourceGuardTest'` | ✅ | ✅ green |
| 89-12-02 | 12 | 6 | DISC-01 | — | `BBx Config` mapped only as `bbx-config`; never reaches the server as BBj source | unit (Java) | `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.*'` | ✅ | ✅ green |
| 89-13-01 | 13 | 7 | DISC-01, DISC-02, DISC-03 | — | Installed bundle: every cue kind, config text-only handling (hover settles, never hangs), new decode payloads; both distributables rebuilt | e2e (installed bundle) | `vitest run test/functional/installed-extension-e2e.test.ts` + build/install + zip inspection | ✅ | ✅ green |
| 89-13-02 | 13 | 7 | DISC-01, DISC-02, DISC-03 | — | QA checklist rows 17-21 (VS Code) / 23-27 (IntelliJ) | docs (grep) | `grep -n "Compose CVS()" QA/FULL-TEST-CHECKLIST.md` and `grep -n "composing will replace it" …` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `bbj-vscode/test/cvs-composer.test.ts` — DISC-03 catalog, encode/decode, edit-in-place recognition
- [x] `bbj-vscode/test/composer-codelens.test.ts` + `composer-codelens-handler.test.ts` — DISC-01 aggregation across all 5 composer kinds + no-re-parse structural check
- [x] `bbj-vscode/test/msgbox-composer.test.ts` / `msgbox-composer-ui.test.ts` — DISC-02 constant-sum decode + compose-and-replace
- [x] `bbj-vscode/test/validation-function-calls.test.ts` — CVS `chars` arity fix in `functions.ts` + `functions.bbl`
- [x] IntelliJ CVS dialog/action source guards — `BbjComposeCvsActionSourceGuardTest`, `ComposerReplaceBannerSourceGuardTest`, composer package guards
- [x] `ComposerModelsJsonBoundaryTest.java` / `ComposerRequestContractTest.java` / `DecodeEqualityTest.java` — CVS DTOs, `MsgboxReplace`, `hasOptions`
- [x] Code Vision / cue click registration guards — `BbjOpenComposerAtActionSourceGuardTest`, `Lsp4ijImportAllowlistTest`, `Lsp4ijCouplingCanaryTest`
- [x] Config routing — `bbj-document-builder-config.test.ts`, `composer-cue-single-source.test.ts`, `BbjConfigFileTypeRegistrationTest` (refined)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IntelliJ Code Vision cue renders visibly and clicks through | DISC-01 (Success Criterion 1) | No IntelliJ sandbox in the devcontainer | **Done 2026-09-12:** GO on IntelliJ IDEA 2026.2.2 (IU-262.10315.125), LSP4IJ 0.21.0 — recorded in 89-06-SUMMARY.md |
| Full hand-run of the new QA rows in both IDEs (all cue kinds, config.bbx cue, CVS() compose/edit, MSGBOX expressions) | DISC-01, DISC-02, DISC-03 | End-to-end UI interaction in two IDEs | `QA/FULL-TEST-CHECKLIST.md` rows 17-21 (VS Code) and 23-27 (IntelliJ), against the phase-end build of both distributables |
| No perceptible typing lag on a large file with cues enabled | DISC-01 (Success Criterion 5, perceptual half) | Perceived latency is not assertable headlessly (the structural no-re-parse half is automated in `composer-codelens-handler.test.ts`) | Type continuously in a large `.bbj` file with many composer lines in both IDEs; confirm no lag versus cues disabled |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the two 89-06 checkpoints are human gates by design)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (`vitest run`, `gradlew test`)
- [x] Feedback latency < 60 s for targeted runs; full suite ~6 min at wave boundaries
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-12

---

## Validation Audit 2026-09-12

Reconciled the provisional map (drafted at plan time) against the 13 executed plans' `<automated>` blocks and the orchestrator's Wave 7 gate (1704 vitest tests: 12 failures, all known local drift; Gradle `:test` 795 tests, 0 failures). Every automated task's named test file or class exists and ran green. One out-of-plan fix (config-document hover fast-fail, `bbj-hover-handler.ts`) is covered by the installed-bundle e2e test "a hover on the config document settles … never hangs".

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
