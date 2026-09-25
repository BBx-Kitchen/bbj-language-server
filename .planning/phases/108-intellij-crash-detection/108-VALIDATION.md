---
phase: "108"
slug: "intellij-crash-detection"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 108-01-01 | LIFE-01, LIFE-02 | Probe wiring (hook, stop() log, feed move, real from-state) keeps existing guards and the allowlist green | source guard / allowlist | `./gradlew test --tests "com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest" --tests "com.basis.bbj.intellij.lsp.Lsp4ijOverrideSiteSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjLanguageServerSourceGuardTest"` | ✅ | ⬜ pending |
| 108-01-02 | LIFE-01 | Vendor members (`addUnexpectedServerStopHandler`, `stop`, `getPid`, `isAlive`, `getProcessHandler`, `isStopped`, `ProcessHandler.getExitCode`, `LSPProcessListener.processTerminated`, `LSPClientFeatures#handleServerStatusChanged`/`getProject`) still exist | reflective canary | `./gradlew test --tests "com.basis.bbj.intellij.lsp.Lsp4ijCouplingCanaryTest"` | ✅ (extend) | ⬜ pending |
| 108-01-02 | LIFE-01 | `addUnexpectedServerStopHandler` override forwards LSP4IJ's handler first and registers ours once; `stop()` calls super once; no reflection | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjLanguageServerSourceGuardTest"` | ✅ (extend) | ⬜ pending |
| 108-01-02 | LIFE-01, LIFE-02 | One status-feed site in `createClientFeatures()`; `BbjLanguageClient` console line only; log line prints the real from-state | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjStatusFeedSourceGuardTest"` | ❌ W0 (created in 108-01-02) | ⬜ pending |
| 108-01-03 | LIFE-01, LIFE-02 | Hook fires on `kill -9`, not on deliberate stops (probe) | manual | checkpoint: real macOS idea.log excerpt in `108-UAT-ARTIFACTS.md` | — | ⬜ pending |
| 108-02-01 | LIFE-01 | `ExpectedStopGuard.classifyExit` armed-token filter (one-shot, time-boxed, concurrent-safe) | unit | `./gradlew test --tests "com.basis.bbj.intellij.concurrency.ExpectedStopGuardTest"` | ✅ (revise) | ⬜ pending |
| 108-02-02 | LIFE-01 | Crash counter ignores `started`; crash restart skips `clearCrashState()`; one gate site; disarm after own stop; `updateStatus` never classifies | source guard | `./gradlew test --tests "com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest" --tests "com.basis.bbj.intellij.lsp.BbjLanguageServerSourceGuardTest"` | ✅ (extend) | ⬜ pending |
| 108-03-01 | LIFE-01 | Widget crashed state read from `isServerCrashed()` | source guard | `./gradlew test --tests "com.basis.bbj.intellij.ui.BbjStatusBarWidgetSourceGuardTest"` | ✅ (extend) | ⬜ pending |
| 108-03-02 | LIFE-01 | Banner only on give-up (`isAutoRestartAbandoned()`) | source guard | `./gradlew test --tests "com.basis.bbj.intellij.ui.BbjServerCrashNotificationProviderSourceGuardTest"` | ❌ W0 (created in 108-03-02) | ⬜ pending |
| 108-04-01..03 | LIFE-01, LIFE-02 | Seven hand-UAT scenarios on macOS, every expected line marked observed/derived/missing | manual + whole suite | `./gradlew test --rerun-tasks` plus checkpoint | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BbjLanguageServer` source guard pinning the `addUnexpectedServerStopHandler` override shape (108-01 Task 2, extends `BbjLanguageServerSourceGuardTest`)
- [ ] New `Lsp4ijCouplingCanaryTest` methods for connection-provider members this phase couples to (108-01 Task 2)
- [ ] Status-feed source guard for `createClientFeatures()`'s `handleServerStatusChanged` override (new `BbjStatusFeedSourceGuardTest`, 108-01 Task 2; not `a2680319` as-is)
- [ ] `BbjServerCrashNotificationProviderSourceGuardTest` for the give-up banner gate (108-03 Task 2)
- [ ] `108-UAT-ARTIFACTS.md` to receive D-13 probe output (108-01) and D-14/D-15 scenario excerpts (108-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook fires on `kill -9`, not on deliberate stops (probe) | LIFE-01 | No live IntelliJ runtime in tests; LSP4IJ runtime ordering is exactly what source-reading gets wrong (Phase 97) | D-13: install probe build on macOS, `kill -9` node pid, close last BBj file, Settings Apply; paste `grep "BBj language server" idea.log` |
| Full scenario set (7 scenarios) | LIFE-01, LIFE-02 | Same | D-14/D-15: final-tree IntelliJ zip; per-scenario idea.log excerpt, each expected line marked observed/derived |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
