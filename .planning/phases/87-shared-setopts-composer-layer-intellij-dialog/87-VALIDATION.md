---
phase: "87"
slug: "shared-setopts-composer-layer-intellij-dialog"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-07"
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
| **Quick run command (TS)** | `npx vitest run test/setopts-catalog.test.ts` |
| **Quick run command (Java)** | `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.composer.*"` |
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
| 87-01-01 | 01 | 1 | DISC-04 | T-87-01 | Composer handlers are pass-throughs to `setopts-catalog.ts`; no input reaches the write path unvalidated | unit | `npx vitest run test/composer-commands.test.ts` | ❌ W0 — no dedicated test file exists yet | ⬜ pending |
| 87-01-02 | 01 | 1 | DISC-04 | — | New SETOPTS request names appear in the reflective + literal contract sets | integration | `cd bbj-intellij && ./gradlew test --tests "*.ComposerRequestContractTest"` | ✅ exists | ⬜ pending |
| 87-01-03 | 01 | 1 | DISC-04 (SC3) | T-87-01 | New SETOPTS DTOs round-trip through LSP4IJ's real `MessageJsonHandler`, incl. an oversized-int negative control | unit | `cd bbj-intellij && ./gradlew test --tests "*.ComposerModelsJsonBoundaryTest"` | ✅ exists | ⬜ pending |
| 87-02-01 | 02 | 2 | DISC-04 (SC4) | — | Launch chain composes through `ComposerFlow`; a hung/failed request surfaces exactly one reason-keyed balloon | unit | `cd bbj-intellij && ./gradlew test --tests "*.ComposerFlowTest"` | ✅ exists (extend `FakeComposerServer`) | ⬜ pending |
| 87-02-02 | 02 | 2 | DISC-04 (SC2) | — | Applying an edit does not trigger a reload notification (regression) | unit | `npx vitest run test/config-hot-reload.test.ts` | ✅ exists | ⬜ pending |
| 87-02-03 | 02 | 2 | DISC-04 (SC1) | T-87-03 | Dialog previews/composes/applies edits identically to VS Code for edit and compose-new modes; OK gated on `r.valid` | unit + source guard | new `BbjComposeSetoptsActionSourceGuardTest` (mirrors `BbjRefreshJavaClassesActionSourceGuardTest`) | ❌ W0 | ⬜ pending |

*Task IDs above are provisional — the planner assigns final plan/task numbering; this map is the requirement→test contract Wave 0 must satisfy, not a fixed schedule.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/composer-commands.test.ts` — stubs for the new `bbj/composer/setopts/*` handler pass-through, or an explicit recorded decision that domain-module coverage (`setopts-catalog.test.ts`, already existing/untouched) plus the IntelliJ-side contract/boundary tests are sufficient (no TS handler test exists for the precedent msgbox/addWindow/addChildWindow handlers either)
- [ ] `bbj-intellij/src/test/java/.../DecodeEqualityTest.java` — add a SETOPTS case to the existing comparator test
- [ ] `bbj-intellij/src/test/java/.../BbjComposeSetoptsActionSourceGuardTest.java` — new file, mirrors `BbjRefreshJavaClassesActionSourceGuardTest`'s structural-pin pattern (config-file scoping, no restart path)
- [ ] Confirm dialog-level test strategy: no dedicated `*ComposerDialogTest.java` exists for `MsgboxComposerDialog` either — coverage is `ComposerFlowTest` + `StaleEditGuardTest` + `DecodeEqualityTest` + source guards. Same precedent applies unless the plan explicitly deviates.

---

## Manual-Only Verifications

*None identified — all phase behaviors have automated verification per the test map above (dialog UI is covered indirectly through `ComposerFlow`/`StaleEditGuard` unit seams, consistent with the existing msgbox/addWindow precedent; no manual QA checklist row is required beyond what the existing SETOPTS VS Code rows already cover).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
