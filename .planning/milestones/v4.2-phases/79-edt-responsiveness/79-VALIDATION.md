---
phase: "79"
slug: "edt-responsiveness"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-04"
reconstructed: true
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from PLAN/SUMMARY artifacts by `/gsd-validate-phase 79` after execution (State B): no VALIDATION.md was seeded at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (plain JVM, no IntelliJ platform test fixture) via Gradle |
| **Config file** | `bbj-intellij/build.gradle.kts` (JDK 17 toolchain, phase 78) |
| **Quick run command** | `cd bbj-intellij && ./gradlew test --tests '<FQCN>'` |
| **Full suite command** | `cd bbj-intellij && ./gradlew test` |
| **Estimated runtime** | ~2 minutes cold (Gradle configuration dominates; test execution itself is seconds) |

Prerequisite: `bbj-vscode/out/language/main.cjs` must exist (phase 78 fail-fast bundle check) or every Gradle task aborts before compiling.

---

## Sampling Rate

- **After every task commit:** Run the plan's targeted test classes with `--tests`
- **After every plan wave:** Run `./gradlew test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 79-01-01 | 01 | 1 | EDT-05 | — | N/A | unit | `./gradlew test --tests 'com.basis.bbj.intellij.concurrency.RestartGateTest'` | ✅ | ✅ green |
| 79-01-02 | 01 | 1 | EDT-05 | — | N/A | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest'` | ✅ | ✅ green |
| 79-01-03 | 01 | 1 | EDT-04 | — | N/A | unit + source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.concurrency.RestartGateTest' --tests 'com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest'` | ✅ | ✅ green |
| 79-02-01 | 02 | 2 | EDT-03 | — | N/A | unit + source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.BbjNodeVersionCacheTest' --tests 'com.basis.bbj.intellij.lsp.BbjMissingNodeNotificationSourceGuardTest'` | ✅ | ✅ green |
| 79-02-02 | 02 | 2 | EDT-02 | — | N/A | unit | `./gradlew test --tests 'com.basis.bbj.intellij.concurrency.KeystrokeDebouncerTest'` | ✅ | ✅ green |
| 79-02-03 | 02 | 2 | EDT-02 | — | N/A | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.BbjSettingsComponentSourceGuardTest'` | ✅ | ✅ green |
| 79-03-01 | 03 | 2 | EDT-06 | — | N/A | unit | `./gradlew test --tests 'com.basis.bbj.intellij.DownloadGuardTest'` | ✅ | ✅ green |
| 79-03-02 | 03 | 2 | EDT-06 | — | N/A | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.BbjNodeDownloaderSourceGuardTest'` | ✅ | ✅ green |
| 79-03-03 | 03 | 2 | EDT-01 | — | N/A | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.OffEdtDispatchSourceGuardTest'` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement coverage (all six phase requirements have at least one green automated test):

| Requirement | Covering tests | Gap type |
|-------------|----------------|----------|
| EDT-01 | `OffEdtDispatchSourceGuardTest` (5) | COVERED |
| EDT-02 | `KeystrokeDebouncerTest` (7), `BbjSettingsComponentSourceGuardTest` (6) | COVERED |
| EDT-03 | `BbjNodeVersionCacheTest` (7), `BbjMissingNodeNotificationSourceGuardTest` (4) | COVERED |
| EDT-04 | `RestartGateTest` (tests 6-7), `BbjServerServiceRestartSourceGuardTest` (Thread.sleep == 0) | COVERED |
| EDT-05 | `RestartGateTest` (8 incl. review-fix concurrency test), `BbjServerServiceRestartSourceGuardTest` (9 incl. settings-apply site) | COVERED |
| EDT-06 | `DownloadGuardTest` (7), `BbjNodeDownloaderSourceGuardTest` (13) | COVERED |

Full-suite run at audit time (post code-review fixes, main @ 1e59bcf): 161 tests, 0 failures, 0 errors, 0 skipped.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 78 supplied the JDK 17 toolchain, pinned Gradle wrapper, and LS-bundle fail-fast; every test class above was added by its owning task in this phase.

---

## Manual-Only Verifications

These behaviors are automated at the seam level but their live-IDE effect can only be observed in a running IntelliJ (this repo has no `BasePlatformTestCase` harness, per REQUIREMENTS.md Out of Scope). All three were confirmed by a human in `79-UAT.md` (10/10 pass, 2026-09-04) against the plugin built from main @ bb11133.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Persisted classpath entry survives Settings reset() while the home-path lookup is in flight | EDT-02 | `pendingClasspathSelection` preservation is asserted by source guard + construction only | Open Settings with a home and classpath selected; close/reopen while lookup pending; combo never drops to placeholder; apply() never persists an empty entry |
| Run As BUI/DWC and EM login still succeed with `assertIsNonDispatchThread()` in place | EDT-01 | `isDispatchThread()` semantics only exist inside a real IDE platform | Invoke Run As BUI, Run As DWC, and EM login in the IDE; no new failure, dialog, or logged assertion |
| Apply immediately after typing a new BBj home persists a classpath from the new home | EDT-02 (review fix WR-03) | `flushPendingHomeLookup()` in `BbjSettingsConfigurable.apply()` has no unit harness | Type a new home, click Apply within ~300 ms; reopen Settings; classpath belongs to the new home; no perceptible hang |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-04

---

## Validation Audit 2026-09-04

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
