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

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| LIFE-01 | `BbjLanguageServer.addUnexpectedServerStopHandler` override forwards LSP4IJ's handler and registers ours | source guard | `./gradlew test --tests "*BbjLanguageServer*SourceGuard*"` | ❌ W0 | ⬜ pending |
| LIFE-01 | Vendor members (`addUnexpectedServerStopHandler`, `stop`, `getPid`, `getProcessHandler`, `LSPClientFeatures#handleServerStatusChanged`) still exist | reflective canary | `./gradlew test --tests "*Lsp4ijCouplingCanaryTest*"` | ✅ (extend) | ⬜ pending |
| LIFE-01 | `ExpectedStopGuard` reshaped to armed-token filter (D-03/D-08) | unit | `./gradlew test --tests "*ExpectedStopGuardTest*"` | ✅ (revise) | ⬜ pending |
| LIFE-01 | Crash window ignores `started`; crash restart skips `clearCrashState()` (D-07) | source guard / unit | `./gradlew test --tests "*BbjServerServiceRestartSourceGuardTest*"` | ✅ (extend) | ⬜ pending |
| LIFE-01 | Status feed in `createClientFeatures()`; `BbjLanguageClient` keeps console line only (D-04) | source guard | new `*StatusFeed*SourceGuard*` | ❌ W0 | ⬜ pending |
| LIFE-01 | Widget crashed state (D-10); banner only on give-up (D-11) | source guard | `./gradlew test --tests "*BbjStatusBarWidgetSourceGuardTest*"` | ✅ (extend) | ⬜ pending |
| LIFE-02 | Transition log line prints real from-state (`currentStatus`) | source guard | `./gradlew test --tests "*BbjServerServiceRestartSourceGuardTest*"` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BbjLanguageServer` source guard pinning the `addUnexpectedServerStopHandler` override shape
- [ ] New `Lsp4ijCouplingCanaryTest` methods for connection-provider members this phase couples to
- [ ] Status-feed source guard for `createClientFeatures()`'s `handleServerStatusChanged` override (new content; not `a2680319` as-is)
- [ ] `108-UAT-ARTIFACTS.md` to receive D-13 probe output and D-14/D-15 scenario excerpts

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
