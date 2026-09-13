---
phase: "87"
slug: "shared-setopts-composer-layer-intellij-dialog"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-07"
validated: "2026-09-13"
---

# Phase 87 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (bbj-vscode)** | Vitest (existing pin) |
| **Framework (bbj-intellij)** | JUnit 5 via Gradle `test` task (existing pin) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing); `bbj-intellij/build.gradle.kts` `test {}` block (existing) |
| **Quick run command (TS)** | `cd bbj-vscode && npx vitest run test/composer-commands.test.ts test/config-hot-reload.test.ts test/setopts-catalog.test.ts` |
| **Quick run command (Java)** | `cd bbj-intellij && ./gradlew test --offline --tests "com.basis.bbj.intellij.composer.*"` |
| **Full suite command** | `npm test` (bbj-vscode); `cd bbj-intellij && ./gradlew test` (bbj-intellij) |
| **Estimated runtime** | ~120 seconds (Gradle full suite dominates) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run <file>` / `./gradlew test --tests "<class>"` for the file(s) touched
- **After every plan wave:** Run `npm test` (bbj-vscode) and `./gradlew test` (bbj-intellij)
- **Before `/gsd-verify-work`:** Full suite must be green on both sides
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 87-01-01 | 01 | 1 | DISC-04 (SC3) | T-87-02, T-87-03 | `setopts/decodeCall` decodes an existing line / bare keyword, refuses what it cannot round-trip; `byte` wire key survives LSP4IJ's real Gson; request name on the contract | unit + integration | `npx vitest run test/composer-commands.test.ts`; `./gradlew test --tests "*.ComposerModelsJsonBoundaryTest" --tests "*.ComposerRequestContractTest"` | ✅ | ✅ green |
| 87-01-02 | 01 | 1 | DISC-04 (SC3) | T-87-01 | `setopts/preview` starts from the original vector (never zero); `setopts` catalogs field carries 50 bits / 7 ordered byte groups | unit + integration | `npx vitest run test/composer-commands.test.ts`; `./gradlew test --tests "*.ComposerModelsJsonBoundaryTest"` | ✅ | ✅ green |
| 87-01-03 | 01 | 1 | DISC-04 | T-87-11 | `DecodeEquality.sameSetopts` mismatches on any field, arrays compared element-wise | unit | `./gradlew test --tests "*.DecodeEqualityTest" --tests "*.ComposerApplyGuardSourceGuardTest"` | ✅ | ✅ green |
| 87-02-01 | 02 | 2 | DISC-04 (SC4) | T-87-09 | `PreviewDebouncer` coalesces bursts via its own `cancel(pending)`, dispatches through the UI-thread hook | unit | `./gradlew test --tests "*.PreviewDebouncerTest"` | ✅ | ✅ green |
| 87-02-02 | 02 | 2 | DISC-04 (SC1) | — | Dialog layout: one scroll pane, byte groups in catalog order (no sort), bits filtered by byte, BBj-annotated bits greyed with a `bbjDetail` tooltip | source guard | `./gradlew test --tests "*.SetoptsComposerDialogSourceGuardTest"` | ✅ (added by validation audit) | ✅ green |
| 87-02-03 | 02 | 2 | DISC-04 (SC1, SC4) | T-87-06, T-87-07, T-87-08, T-87-10 | Raw-tail and mask validation run before any request and route through `previewUnavailable`; `SetoptsPreviewParams` always carries `originalHex`; observe/seq/once wiring and `scheduleRefresh()` OK-disable pinned | source guard | `./gradlew test --tests "*.SetoptsComposerDialogSourceGuardTest" --tests "*.ComposerDialogRefreshSourceGuardTest"` | ✅ | ✅ green |
| 87-03-01 | 03 | 3 | DISC-04 (SC4) | T-87-11, T-87-12, T-87-15 | `Kind.SETOPTS` composes through `ComposerFlow`; edit path guarded by `StaleEditGuard` + `sameSetopts`; compose-new inserts at line start | source guard | `./gradlew test --tests "*.ComposerLauncherChainSourceGuardTest" --tests "*.ComposerApplyGuardSourceGuardTest"` | ✅ | ✅ green |
| 87-03-02 | 03 | 3 | DISC-04 (SC1) | T-87-13 | `BbjComposeSetoptsAction` PSI-free, absent outside the resolved config file, no keystroke | source guard | `./gradlew test --tests "*.BbjComposeSetoptsActionSourceGuardTest"` | ✅ | ✅ green |
| 87-03-03 | 03 | 3 | DISC-04 (SC2) | T-87-14 | SETOPTS composer write → zero reload notifications; PREFIX edit in same file → exactly one | unit | `npx vitest run test/config-hot-reload.test.ts` | ✅ | ✅ green |
| review fix (OK disable) | 02 | — | DISC-04 (SC4) | T-87-08 | Every listener routes through `scheduleRefresh()`, which disables OK before triggering the debouncer | source guard + manual | `./gradlew test --tests "*.ComposerDialogRefreshSourceGuardTest"` (runtime timing: Manual-Only) | ✅ | ✅ green |
| review fix (raw-tail label) | 02 | — | DISC-04 (SC1) | T-87-06 | Invalid raw tail writes its message to the field-level `rawTailError` label before disabling OK | source guard | `./gradlew test --tests "*.SetoptsComposerDialogSourceGuardTest"` | ✅ (added by validation audit) | ✅ green |

---

## Wave 0 Requirements

- [x] `bbj-vscode/test/composer-commands.test.ts` — extended with `setopts/decodeCall`, `setopts/preview` and catalogs coverage
- [x] `bbj-intellij/src/test/java/.../DecodeEqualityTest.java` — SETOPTS cases added
- [x] `bbj-intellij/src/test/java/.../BbjComposeSetoptsActionSourceGuardTest.java` — created (7 tests)
- [x] Dialog-level strategy confirmed: no headless-Swing harness; coverage is `ComposerFlowTest` + `ComposerDialogRefreshSourceGuardTest` + `DecodeEqualityTest` + `SetoptsComposerDialogSourceGuardTest` (source guards) plus the Manual-Only rows below

---

## Manual-Only Verifications

| Behavior | Why Manual | Evidence |
|----------|------------|----------|
| Live-IDE end-to-end: context-menu visibility on existing and non-SETOPTS lines, live debounced preview, greyed options with tooltip, hex-only apply, whole-line compose-new, absent in `.bbj`, no server restart (QA/FULL-TEST-CHECKLIST.md IntelliJ row 18) | Needs a running IntelliJ + LSP4IJ session | 87-UAT.md test 1 — pass (2026-09-07) |
| Rapid toggle-then-Apply inside the 300ms debounce window never commits a stale selection | Swing event-dispatch / button-enablement timing; no headless-Swing harness in this build | 87-UAT.md test 2 — pass (2026-09-07); structure pinned by `ComposerDialogRefreshSourceGuardTest` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-13

---

## Validation Audit 2026-09-13

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

Gaps were dialog layout, the client-side validation gate plus lossless original, and raw-tail label routing. All three had been verified only by grep or code reading during execution. They are now pinned by `SetoptsComposerDialogSourceGuardTest` (7 tests, green). Re-run on 2026-09-13: Vitest 3 files / 109 tests green; Gradle `com.basis.bbj.intellij.composer.*`, `PreviewDebouncerTest`, `BbjComposeSetoptsActionSourceGuardTest` green.
