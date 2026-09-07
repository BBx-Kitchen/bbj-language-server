---
phase: "86"
slug: "intellij-interop-settings-targeted-refresh"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-07"
---

# Phase 86 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (Gradle) |
| **Config file** | `bbj-intellij/build.gradle.kts` |
| **Quick run command** | `cd bbj-intellij && ./gradlew test --offline --tests '<TestClass>'` |
| **Full suite command** | `cd bbj-intellij && ./gradlew build --offline` |
| **Estimated runtime** | ~2-4 minutes (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` targeted-test command
- **After every plan wave:** Run `cd bbj-intellij && ./gradlew build --offline`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~240 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 86-01-T1 (tracer) | 01 | 1 | CFG-04 | unit | `./gradlew test --tests 'JavaClassesRefreshFlowTest' --tests 'ComposerRequestContractTest' --tests 'ComposerFlowTest'` | ✅ green |
| 86-01-T2 | 01 | 1 | CFG-04 | unit | `./gradlew test --tests 'JavaClassesRefreshPresenterTest' --tests 'JavaClassesRefreshFlowTest'` | ✅ green |
| 86-01-T3 | 01 | 1 | CFG-04 | unit + build | `./gradlew test --tests 'com.basis.bbj.intellij.refresh.*'` then `./gradlew build` | ✅ green |
| 86-02-T1 (tracer) | 02 | 1 | CFG-05 | unit | `./gradlew test --tests 'BbjInteropPortDetectorTest' --tests 'BbjInteropPortCacheTest'` | ✅ green |
| 86-02-T2 | 02 | 1 | CFG-05 | unit | `./gradlew test --tests 'InteropPortSettingsTest'` | ✅ green |
| 86-02-T3 | 02 | 1 | CFG-05 | unit + build | `./gradlew test --tests 'InteropPort*' --tests 'BbjInteropPort*'` then `./gradlew build` | ✅ green |
| 86-03-T1 | 03 | 2 | CFG-05 | unit | `./gradlew test --tests 'InteropPortSettingsTest' --tests 'BbjInteropPortDetectorTest' --tests 'BbjInteropPortCacheTest'` | ✅ green |
| 86-03-T2 | 03 | 2 | CFG-05 | unit | `./gradlew test --tests 'BbjSettingsComponentSourceGuardTest' --tests 'InteropPort*' --tests 'BbjInteropPort*'` | ✅ green |
| 86-03-T3 | 03 | 2 | CFG-05 | unit + build | `./gradlew test --tests 'EffectiveInteropPortSourceGuardTest' --tests 'BbjSettingsComponentSourceGuardTest'` then `./gradlew build` | ✅ green |
| 86-04-T1 | 04 | 1 | CFG-04, CFG-05 | doc/coverage checks | `awk` COVERAGE.md check; `grep` QA/FULL-TEST-CHECKLIST.md rows 16/17, 14/15 | ✅ green |
| 86-04-T2 | 04 | 1 | CFG-04, CFG-05 | doc + repo state | docs configuration.md grep checks; completed-todo file/porcelain checks | ✅ green |
| 86-05-T1 (tracer) | 05 (gap closure) | 1 | CFG-04 | unit | `./gradlew test --tests 'ExpectedStopGuardTest' --tests 'BbjServerServiceRestartSourceGuardTest' --tests 'Lsp4ijImportAllowlistTest'` | ✅ green |
| 86-05-T2 | 05 (gap closure) | 1 | CFG-04 | unit | `./gradlew test --tests 'RestartGateTest' --tests 'BbjServerServiceRestartSourceGuardTest'` | ✅ green |
| 86-05-T3 | 05 (gap closure) | 1 | CFG-04 | unit | `./gradlew test --tests 'BoundedWaitTest' --tests 'RestartGateTest' --tests 'ExpectedStopGuardTest' --tests 'BbjServerServiceRestartSourceGuardTest'` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

All 14 tasks across the phase's 5 plans (86-01 through 86-05, the last a UAT gap-closure plan for G-86-1) carry an `<automated>` verify block. Every `*-SUMMARY.md` `coverage:` block records `status: pass` for each automatable decision (D1-D6 per plan, as applicable); the entries above are consolidated per-task rather than per-decision.

---

## Wave 0 Requirements

*Existing infrastructure (Gradle + JUnit 5) covers all phase requirements. No Wave 0 stubs were needed — the 86-01 tracer task established the `com.basis.bbj.intellij.refresh` test package and 86-02's tracer task established interop-port test coverage from a cold start.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Refresh Java Classes keeps completion/hover/Structure View answering during refresh; status widget stays `started`; exactly one console line; no balloon (QA row 16) | CFG-04 | Requires a live BBjServices install + real IntelliJ IDE session; cannot be driven headlessly | See `86-UAT.md` Test 1 / `QA/FULL-TEST-CHECKLIST.md` row 16 |
| Java-interop port auto-detects and tracks a live `BBj.properties` edit; an explicitly confirmed port survives across dialog reopen even when the properties file names a different port (QA row 17) | CFG-05 | Requires a live BBjServices install + manual `BBj.properties` edits + Settings dialog interaction | See `86-UAT.md` Test 2 / `QA/FULL-TEST-CHECKLIST.md` row 17 |
| G-86-1 live recheck: rows 16+17 rerun together in the same session — completion/hover/Structure View answer during refresh, status stays `started`, deliberate restarts log the restart message (not crash/auto-restart text), no `JsonRpcException`/`Stream closed` trace in the IDE log | CFG-04 | Reproduces the exact live-IDE concurrency sequence that originally surfaced G-86-1; cannot be observed outside a real IDE + BBjServices session | See `86-UAT.md` Test 3 |
| Triage decision on WR-01/WR-02 (86-05-REVIEW.md residual risks) | CFG-04 | A judgment call on accepted risk vs. follow-up fix, not a runtime behavior | See `86-UAT.md` Test 4 |

All four manual-only items above were exercised and closed during `/gsd-verify-work 86` (see `86-UAT.md`): Test 1 initially surfaced G-86-1, which 86-05 (gap-closure) fixed; Tests 2-4 passed.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none needed)
- [x] No watch-mode flags
- [x] Feedback latency < 240s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-07
