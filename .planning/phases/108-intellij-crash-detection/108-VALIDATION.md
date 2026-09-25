---
phase: "108"
slug: "intellij-crash-detection"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-25"
---

# Phase 108 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit Jupiter (plain JUnit; no live IntelliJ platform fixture) |
| **Config file** | `bbj-intellij/build.gradle.kts` (`useJUnitPlatform()`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.concurrency.ExpectedStopGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.Lsp4ijCouplingCanaryTest" --tests "com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest"` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` |
| **Estimated runtime** | ~120 seconds (full suite, baseline 1,109 tests) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `--tests` command for the files touched
- **After every plan wave:** Run `./gradlew test --rerun-tasks` (never plain `test` — UP-TO-DATE masks stale green)
- **Before `/gsd-verify-work`:** Full suite green AND D-13 probe observed AND D-14/D-15 hand UAT evidence in `108-UAT-ARTIFACTS.md`
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

Filled by the planner/executor per task; requirement → test map from RESEARCH.md §Validation Architecture:

| Task | Requirement | Behavior | Test Type | Automated Command (from `bbj-intellij/`) | File Exists | Status |
|------|-------------|----------|-----------|-------------------|-------------|--------|
| 108-01-01 | LIFE-01, LIFE-02 | Probe wiring (hook, stop() log, feed move, real from-state) keeps existing guards and the allowlist green | source guard / allowlist | `./gradlew test --tests "com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest" --tests "com.basis.bbj.intellij.lsp.Lsp4ijOverrideSiteSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjLanguageServerSourceGuardTest"` | ✅ | ✅ green |
| 108-01-02 | LIFE-01 | Vendor members (`addUnexpectedServerStopHandler`, `stop`, `getPid`, `isAlive`, `getProcessHandler`, `isStopped`, `ProcessHandler.getExitCode`, `LSPProcessListener.processTerminated`, `LSPClientFeatures#handleServerStatusChanged`/`getProject`) still exist | reflective canary | `./gradlew test --tests "com.basis.bbj.intellij.lsp.Lsp4ijCouplingCanaryTest"` | ✅ | ✅ green |
| 108-01-02 | LIFE-01 | `addUnexpectedServerStopHandler` override forwards LSP4IJ's handler first and registers ours once; `stop()` calls super once; no reflection | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjLanguageServerSourceGuardTest"` | ✅ | ✅ green |
| 108-01-02 | LIFE-01, LIFE-02 | One status-feed site in `createClientFeatures()`; `BbjLanguageClient` console line only; log line prints the real from-state | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjStatusFeedSourceGuardTest"` | ✅ | ✅ green |
| 108-01-03 | LIFE-01, LIFE-02 | Hook fires on `kill -9`, not on deliberate stops (probe) | manual | checkpoint: real macOS idea.log excerpt in `108-UAT-ARTIFACTS.md` | — | ✅ observed (UAT-ARTIFACTS) |
| 108-02-01 | LIFE-01 | `ExpectedStopGuard.classifyExit` armed-token filter (one-shot, time-boxed, concurrent-safe) | unit | `./gradlew test --tests "com.basis.bbj.intellij.concurrency.ExpectedStopGuardTest"` | ✅ | ✅ green |
| 108-02-02 | LIFE-01 | Crash counter ignores `started`; crash restart skips `clearCrashState()`; one gate site; disarm after own stop; `updateStatus` never classifies | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjLanguageServerSourceGuardTest"` | ✅ | ✅ green |
| 108-03-01 | LIFE-01 | Widget crashed state read from `isServerCrashed()` | source guard | `./gradlew test --tests "com.basis.bbj.intellij.ui.BbjStatusBarWidgetSourceGuardTest"` | ✅ | ✅ green |
| 108-03-02 | LIFE-01 | Banner only on give-up (`isAutoRestartAbandoned()`) | source guard | `./gradlew test --tests "com.basis.bbj.intellij.ui.BbjServerCrashNotificationProviderSourceGuardTest"` | ✅ | ✅ green |
| 108-04-01..03 | LIFE-01, LIFE-02 | Seven hand-UAT scenarios on macOS, every expected line marked observed/derived/missing | manual + whole suite | `./gradlew test --rerun-tasks` plus checkpoint | — | ✅ observed (UAT-ARTIFACTS) |
| review-fix | LIFE-01 | `clearCrashState()` writes all three crash-state fields only inside its `invokeLater` argument | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest"` (`clearCrashStateWritesAllFieldsOnlyInsideTheInvokeLaterLambda`) | ✅ | ✅ green |
| review-fix | LIFE-01 | `requestRestart(long)` clears crash state, then queues `requestGatedRestart` through `invokeLater` (no direct call) | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest"` (`requestRestartDispatchesRequestGatedRestartThroughInvokeLater`) | ✅ | ✅ green |
| review-fix | LIFE-01 | Tooltip and banner "crashed again within N seconds" text derived from `CRASH_WINDOW_MS / 1000`, no hardcoded 30-second literal | source guard | `./gradlew test --tests "com.basis.bbj.intellij.ui.BbjStatusBarWidgetSourceGuardTest" --tests "com.basis.bbj.intellij.ui.BbjServerCrashNotificationProviderSourceGuardTest"` | ✅ | ✅ green |
| review-fix | LIFE-01 | Pid-correlated expected-stop filter; `notePid` keeps the first pid; disarm only after a timely stop | unit + source guard | `./gradlew test --tests "com.basis.bbj.intellij.concurrency.ExpectedStopGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `BbjLanguageServer` source guard pinning the `addUnexpectedServerStopHandler` override shape (108-01 Task 2, extends `BbjLanguageServerSourceGuardTest`)
- [x] New `Lsp4ijCouplingCanaryTest` methods for connection-provider members this phase couples to (108-01 Task 2)
- [x] Status-feed source guard for `createClientFeatures()`'s `handleServerStatusChanged` override (new `BbjStatusFeedSourceGuardTest`, 108-01 Task 2; not `a2680319` as-is)
- [x] `BbjServerCrashNotificationProviderSourceGuardTest` for the give-up banner gate (108-03 Task 2)
- [x] `108-UAT-ARTIFACTS.md` to receive D-13 probe output (108-01) and D-14/D-15 scenario excerpts (108-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook fires on `kill -9`, not on deliberate stops (probe) | LIFE-01 | No live IntelliJ runtime in tests; LSP4IJ runtime ordering is exactly what source-reading gets wrong (Phase 97) | D-13: install probe build on macOS, `kill -9` node pid, close last BBj file, Settings Apply; paste `grep "BBj language server" idea.log` |
| Full scenario set (7 scenarios) | LIFE-01, LIFE-02 | Same | D-14/D-15: final-tree IntelliJ zip; per-scenario idea.log excerpt, each expected line marked observed/derived |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-25 (validate-phase audit)

---

## Validation Audit 2026-09-25

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

- All 99 tests in the nine planned guard/unit files were green before the audit; manual rows are backed by the observed macOS excerpts in `108-UAT-ARTIFACTS.md`.
- The two gaps came from code-review fixes that landed after planning: the EDT-only crash-state writes and the gated restart queued through `invokeLater`, and the crash-window UI text derived from `CRASH_WINDOW_MS`.
- The auditor's first-draft tests were tightened before commit. The span matcher now skips string literals, "outside the hop" covers the whole method body, and the literal check rejects any string stating a 30-second window.
- Mutation check: each of the four new tests failed against a deliberately regressed source (write moved out of the hop, direct `requestGatedRestart` call, hardcoded "30 seconds" in the tooltip and in the banner); sources restored afterwards.
- Full suite: `./gradlew test --rerun-tasks` → 1137 tests, 0 failures, 0 errors.
