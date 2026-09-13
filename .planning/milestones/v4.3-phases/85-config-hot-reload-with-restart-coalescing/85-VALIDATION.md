---
phase: "85"
slug: "config-hot-reload-with-restart-coalescing"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-07"
reconstructed: true
---

# Phase 85 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from PLAN/SUMMARY artifacts by `/gsd-validate-phase 85` after execution (State B): no VALIDATION.md was seeded at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Two modules. `bbj-vscode`: Vitest 4.x with fake timers and injectable probes (`ConfigWatcherDeps`, `RestartTarget`), mocked `vscode` module for the host-side tests, real `BBjDocumentBuilder` on `EmptyFileSystem` for the quiescence predicate. `bbj-intellij`: JUnit 5.10 via Gradle `useJUnitPlatform()` (plain JVM, LSP4J `MessageJsonHandler` for the JSON boundary, whole-file source guards for the platform-bound classes). |
| **Config file** | `bbj-vscode/vitest.config.ts`; `bbj-intellij/build.gradle.kts` (JDK 17 daemon toolchain) |
| **Quick run command** | `cd bbj-vscode && npx vitest run test/config-hot-reload.test.ts test/config-hot-reload-wiring.test.ts test/config-reload-host.test.ts --maxWorkers=2` and `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --rerun --offline --tests 'com.basis.bbj.intellij.config.*' --tests 'com.basis.bbj.intellij.lsp.*' --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest' --console=plain -q` |
| **Full suite command** | `cd bbj-vscode && npx vitest run --maxWorkers=2` (whole-suite baseline: 12 known environment-drift failures in `linking.test.ts` + `issue447`, see memory) and `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --rerun --offline --console=plain -q` |
| **Estimated runtime** | phase-85 vitest files ~2 s (73 tests); IntelliJ targeted classes ~10 s on a warm daemon (303 tests); whole IntelliJ module ~2 min cold |

Prerequisites: `bbj-vscode/out/language/main.cjs` must exist for the Gradle packaging tasks. No language server, BBj install, `fs.watch` on a real directory or IDE is needed for any phase-85 test: the watcher is driven through injected `watch`/`readFile`/timer probes, the restart gate through a structural `RestartTarget`, the VS Code handler through the mocked `vscode`, and the IntelliJ side through plain Java seams (`ConfigReloadPresentation`, `ConfigModels`) plus source guards. Gradle must be run with `--rerun`, otherwise it reports UP-TO-DATE without executing.

---

## Sampling Rate

- **After every task commit:** Run the plan's targeted test file(s) / class(es)
- **After every plan wave:** Run the quick run command (both modules)
- **Before `/gsd-verify-work`:** Both quick runs green; whole IntelliJ module green (0 failures, 0 errors)
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

Command legend: **V1** `npx vitest run test/config-hot-reload.test.ts`; **V2** `npx vitest run test/config-hot-reload-wiring.test.ts`; **V3** `npx vitest run test/config-reload-host.test.ts`; **VC** companion regression files named in the PLAN verify blocks (`ws-manager`, `lazy-prefix-loading`, `use-project-root`, `notifications`, `config-path-resolution`, `document-builder`, `document-builder-rebuild-guard`); **G** the targeted Gradle command from the Quick run row; **Q** the awk/grep assertions from the 85-05 PLAN verify blocks against `QA/FULL-TEST-CHECKLIST.md` and `COVERAGE.md`. All vitest commands run from `bbj-vscode/` with `--maxWorkers=2`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 85-01-01 | 01 | 1 | CFG-03 (D-05, D-06, D-07, D-08) | — | `createConfigWatcher` opens a non-recursive directory watch, filters events to the config basename via `samePath`, debounces 1000 ms trailing-edge, and notifies `bbj/configReloadRequired` only when the consumed PREFIX snapshot changed — a SETOPTS-only write yields zero notifications; atomic delete+create inside one window is judged once | unit (fake timers, injected watch/readFile) | V1 `createConfigWatcher: debounce + relevance gate (end-to-end tracer)`, `config-reload-notification module shape`, `consumedConfigSnapshot` | ✅ | ✅ green |
| 85-01-02 | 01 | 1 | CFG-03 (D-06) | — | `initializeWorkspace` and the relevance gate read PREFIX through the single `extractConsumedConfigContent`; the line-scan expression exists in exactly one module | unit + source-scan | V1 `initializeWorkspace and the relevance gate share one extraction function`, `the config-directive line-scan expression lives in exactly one module`, `extractConsumedConfigContent matches the pre-extraction expression byte-for-byte`; VC `lazy-prefix-loading`, `use-project-root`, `ws-manager` | ✅ | ✅ green |
| 85-01-03 | 01 | 1 | CFG-03 (D-07, D-08) | — | Missing file → `config-missing` once (empty→empty silent); `updateResolvedPath` re-arms on the new directory with an immediate undebounced check; arm failure and watch error warn once per canonical path and never throw; `dispose()` clears pending timers | unit | V1 `updateResolvedPath: settings-change re-arm and immediate relevance check`, `arm failure handling and dispose` | ✅ | ✅ green |
| 85-02-01 | 02 | 2 | CFG-03 (D-09) | — | A "changed" verdict is never pushed while `hasPendingWork()` is true; polled at 100 ms, bounded at 5000 ms, pushes anyway at the bound; one outstanding wait, cancel-then-replace | unit (fake timers) | V2 `config-watcher quiescence wait: a reload is never pushed while the builder is busy`, `BBjDocumentBuilder.hasPendingWork / hasPendingCompile — the quiescence predicate`; VC `document-builder`, `document-builder-rebuild-guard` | ✅ | ✅ green |
| 85-02-02 | 02 | 2 | CFG-03 (D-05, D-14) | — | `configWatcher.start()` called exactly once inside the `workspaceInitialized` gate after `notifyResolvedConfigPath`; `updateResolvedPath` at exactly the two `setConfigPath` sites; no third call site | source-guard (main.ts) | V2 `main.ts wires the config watcher: armed once, re-armed at exactly two sites`; VC `config-path-resolution`, `notifications` | ✅ | ✅ green |
| 85-02-03 | 02 | 2 | CFG-03 (D-08, D-09, #486) | — | Interleaved `.bbj`-save + config-save burst while the builder is busy collapses to exactly one notification, never mid-validation; identical-content settings change re-arms silently; null path closes the watch | unit (fake timers) | V2 `settings-change relevance and the interleaved-burst guarantee (#486)` | ✅ | ✅ green |
| 85-03-01 | 03 | 2 | CFG-03 (D-10) | — | `createRestartGate` coalesces requests inside one 500 ms window into exactly one stop/start pair on the existing `LanguageClient`; `needsStop()` false skips stop; rejected stop/start reported once, never unhandled; the handler dispatches only through `gate.request()` | unit (fake timers, structural target) | V3 `createRestartGate: cancel-then-schedule coalescing`, `bbj/configReloadRequired: the handler dispatches to the gate, never directly` | ✅ | ✅ green |
| 85-03-02 | 03 | 2 | CFG-03 (D-10, D-12) | — | Dedicated status-bar item (Left/98): spinning while restarting with the active path in the tooltip, check-mark confirmation auto-hiding after 5 s (re-armed on a second reload), failure hides the item and reuses the existing start-failure error; no prompt/modal/toast; one output-channel line naming path + reason; `deactivate()` cancels the gate before `client.stop()` | unit (mocked vscode) | V3 `config-reload status bar: the non-blocking signal and failure path` (incl. `deactivate() cancels the gate before calling client.stop()`) | ✅ | ✅ green |
| 85-03-03 | 03 | 2 | CFG-03 (D-10) | — | Exactly one `client.start()`/`client.stop(` in `extension.ts`, gate-cancel precedes `client.stop(` in `deactivate()`, exactly one `createRestartGate(`, handler body reaches the restart only via `request(`; `restart-gate.ts` has one `.stop(`/`.start(` on the target and zero `vscode` imports | source-guard | V3 `source guard: the choke point is the only restart path` | ✅ | ✅ green |
| 85-04-01 | 04 | 2 | CFG-03 (D-11) | — | `ConfigModels.ConfigReloadNotification` round-trips through LSP4IJ's `MessageJsonHandler` (all fields, null path, unknown reason without throwing); `BbjLanguageClient.configReloadRequired` requests a restart only via `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` | JSON boundary + source-guard | G `config.ConfigModelsJsonBoundaryTest` (configReloadRequired cases), `lsp.BbjLanguageClientRestartSourceGuardTest#theHandlerRequestsRestartExactlyOnceThroughTheServiceWithTheSharedDebounceConstant`, `#theHandlerNeverTouchesTheLsp4ijServerManagerDirectly` | ✅ | ✅ green |
| 85-04-02 | 04 | 2 | CFG-03 (D-11, D-12) | — | `ConfigReloadPresentation.reasonLabel/widgetTooltip/consoleLine/clearsReason`: reason reaches the existing widget tooltip and one console line, no balloon, clears on `started` and on abandoned auto-restart | unit + source-guard | G `config.ConfigReloadPresentationTest` (6), `BbjLanguageClientRestartSourceGuardTest#theConfigReloadHandlerRaisesNoNotificationBalloon`, `#theConfigReloadHandlerLogsExactlyOneConsoleLine` | ✅ | ✅ green |
| 85-04-03 | 04 | 2 | CFG-03 (D-11) | — | Cross-language contract: notification name, `bbj/` namespace, all three reason tokens, both DTO field names, absence from `BbjComposerServer`'s proxy interface; `ComposerRequestContractTest` unchanged and green | contract | G `config.ConfigReloadNotificationContractTest` (5), `composer.ComposerRequestContractTest` (4) | ✅ | ✅ green |
| 85-05-01 | 05 | 1 | CFG-03 (D-13) | — | `COVERAGE.md` one-line "No external API integration" declaration under 200 chars; QA "Config PREFIX change reloads the server automatically" row present for both IDEs (VS Code row 12, IntelliJ row 13) naming the status signal and ruling out prompt/toast/balloon | docs (awk/grep) + manual | Q; `gsd_run check api-coverage.verify-pre` → `block:false` | ✅ | ✅ green; live UAT #2, #5 |
| 85-05-02 | 05 | 1 | CFG-03 (D-13) | — | Four hand-only rows (VS Code 13–14, IntelliJ 14–15) with unambiguous expected results; no prior row renumbered, reworded or removed (`git diff --numstat` 0 deletions) | docs (grep) + manual | Q | ✅ | ✅ green; live UAT #3, #4, #6, #7 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Code-review fixes landed after the plans (85-REVIEW-FIX.md) and their pinning tests: WR-01 `hasPendingWork()` blind spot during the post-`super.buildDocuments()` tail (`cce31b39`) → V2 quiescence-predicate case with a suspended `addImportedBBjDocuments`; WR-02 `RestartGate.cancel()` could not abort an in-flight restart (`baa7867d`) → V3 coalescing case "cancel after stop() started, start() never called"; WR-03 baseline stale between `initializeWorkspace()` and `start()` (`4116c017`, `5c90331e`) → V1 `start(): arm-time relevance check` (4 tests). Info findings IN-01/IN-02 were out of fix scope.

Requirement coverage (re-run 2026-09-07 during `/gsd-verify-work 85`: V1+V2+V3 73/73; IntelliJ `config.*` + `lsp.*` + `ComposerRequestContractTest` 303 tests, 0 failures, 0 errors, 0 skipped):

| Requirement | Covering tests | Gap type |
|-------------|----------------|----------|
| CFG-03 (#486) — a change to the resolved config file takes effect without a manual language-server restart, signalled non-intrusively in both IDEs, and the composer's own SETOPTS writes never trigger a restart loop | VS Code/server: `config-hot-reload` (28 + 4 review-fix), `config-hot-reload-wiring` (25 + 1), `config-reload-host` (15 + 1); companions `document-builder*`, `ws-manager`, `lazy-prefix-loading`, `use-project-root`, `notifications`, `config-path-resolution`. IntelliJ: `ConfigModelsJsonBoundaryTest`, `ConfigReloadPresentationTest` (6), `ConfigReloadNotificationContractTest` (5), `BbjLanguageClientRestartSourceGuardTest`, `ComposerRequestContractTest` (4) | COVERED at the probe/mock/source-guard boundary (real `fs.watch` delivery, atomic-save editors, the rendered status-bar item / widget tooltip and a live restart are manual; see Manual-Only) |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs were needed: every tdd task wrote its failing test first against the existing Vitest and JUnit 5 runners (RED observed in each SUMMARY as missing module/method or compile failures). No new fixture, dependency or platform test framework was added.

---

## Manual-Only Verifications

All items below were confirmed in live IDEs during `/gsd-verify-work 85` on 2026-09-07 (85-UAT.md: 7 hand checkpoints passed, 0 issues). They remain manual because real `fs.watch` event delivery per OS/editor, VS Code status-bar rendering, IntelliJ's widget/tool-window rendering, LSP4IJ's actual server restart and PREFIX-dependent class resolution all need a running IDE and BBj install, which both test modules deliberately exclude.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Both IDEs start clean on the fresh build; server boots, resolved config path logged, completion/hover work | CFG-03 | Cold-start smoke against a real BBj install | UAT #1 |
| VS Code: external-editor PREFIX change → spinning status-bar item, auto-hiding confirmation, one output line with `prefix-changed`, no prompt/modal/toast, new-prefix class resolves | CFG-03 | Real `fs.watch` + status-bar rendering + live restart | QA VS Code row 12 (UAT #2) |
| VS Code: atomic-save editor (write-temp-then-rename) yields exactly one reload | CFG-03 | OS-level rename event sequence is editor/OS specific | QA VS Code row 13 (UAT #3) |
| VS Code: SETOPTS composer apply+save and a SETOPTS-only external edit produce no reload (restart-loop regression) | CFG-03 | Live composer webview + real file events | QA VS Code row 14 (UAT #4) |
| IntelliJ: external-editor PREFIX change → widget starting/started transitions, tooltip names the reason, one console line, no balloon, new-prefix class resolves | CFG-03 | Widget/tool-window rendering + LSP4IJ restart | QA IntelliJ row 13 (UAT #5) |
| IntelliJ: config file outside the content root reloads identically | CFG-03 | Content-root placement needs a real project | QA IntelliJ row 14 (UAT #6) |
| IntelliJ: `.bbj` save + config save burst → one restart after diagnostics settle, no "connection closed", no second restart | CFG-03 | Timed live burst against a running server | QA IntelliJ row 15 (UAT #7) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags (one-shot vitest and Gradle only)
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-07 (reconstructed; all task commands re-run green after UAT completed 7/7 hand checkpoints)

## Validation Audit 2026-09-07
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

No gaps: every task's behavior is pinned by a passing automated test, and the five hand-only behaviors are QA checklist rows executed in UAT. No auditor subagent was spawned.
