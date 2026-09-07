---
phase: 85-config-hot-reload-with-restart-coalescing
verified: 2026-09-07T03:00:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 85: Config Hot-Reload With Restart Coalescing Verification Report

**Phase Goal:** A change to the resolved config file (PREFIX, project-wide USE) takes effect
without a manual language-server restart, signaled non-intrusively, and without the composer's
own writes triggering a restart loop.
**Verified:** 2026-09-07
**Status:** passed
**Re-verification:** Yes — 2026-09-07 close-out re-run after a metadata-only summary edit (see bottom)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Saving a change to the resolved config file — from any editor, not only this plugin's own composer — triggers a debounced reload with a non-blocking status-bar signal, not a blocking prompt, in both IDEs. | VERIFIED | Server-side: `config-watcher.ts` `createConfigWatcher` opens a non-recursive `fs.watch` on the directory of the resolved path, filters via `samePath`, debounces 1000ms (`CONFIG_WATCH_DEBOUNCE_MS`), and emits `notifyConfigReloadRequired` only when `consumedConfigSnapshot` changes — file-agnostic to which editor wrote it. VS Code: `extension.ts` registers `client.onNotification(CONFIG_RELOAD_METHOD, ...)` → `restartGate.request(CONFIG_RELOAD_RESTART_DELAY_MS)`; a dedicated status-bar item (Left/98) shows spinning/confirmation states, no `showInformationMessage`/modal (confirmed by source-guard tests in `test/config-reload-host.test.ts`). IntelliJ: `BbjLanguageClient.configReloadRequired` → `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)`; existing `BbjStatusBarWidget` tooltip carries the reason, no new balloon (source-guarded by `BbjLanguageClientRestartSourceGuardTest`). All three test files pass: 67/67 vitest (`config-hot-reload.test.ts`, `config-hot-reload-wiring.test.ts`, `config-reload-host.test.ts` — re-run live during this verification) plus the orchestrator-confirmed Gradle `config.*`/`lsp.*` suites. |
| 2 | The reload fires for a config file located outside the workspace/project root, and survives an atomic write-temp-then-rename save. | VERIFIED | Detection watches the parent *directory* (not the file itself, not a workspace-relative pattern), so an out-of-workspace path is watched identically to an in-workspace one — no workspace-scoping code exists anywhere in `config-watcher.ts`. Atomic-save survival: the event listener admits both a `null` filename and a `rename`/`change` event naming the basename (ignoring `eventType` entirely, per 85-01's settled_facts on `fs.watch` semantics), and `85-01-SUMMARY.md`/`85-02-SUMMARY.md` document a delete-then-create pair inside one debounce window collapsing to exactly one `prefix-changed` notification (`test/config-hot-reload.test.ts`, Task 3's atomic-save case). |
| 3 | A SETOPTS composer write to the same config file does not itself cascade into a restart loop — the self-write suppression (the PREFIX relevance gate) absorbs it. | VERIFIED | The relevance gate is structural, not timestamp-based: `evaluate()` in `config-watcher.ts` compares `consumedConfigSnapshot(readFile(canonicalPath))` against the stored snapshot and returns without notifying when unchanged. `extractConsumedConfigContent`/`consumedConfigSnapshot` in `config-path-resolver.ts` read only the PREFIX line — a SETOPTS-only edit cannot change the compared value by construction. `bbj-ws-manager.ts`'s `initializeWorkspace` calls the same `extractConsumedConfigContent` function (verified: one source-module occurrence asserted by a source-scan test in `test/config-hot-reload.test.ts`), so there is no second parser to drift. D1 in `85-01-SUMMARY.md` cites the acceptance pair test directly: "a SETOPTS-only edit produces zero [notifications]; a PREFIX edit produces exactly one." |
| 4 | Saving a `.bbj` file and the config file in the same edit burst never lands a restart mid-validation. | VERIFIED | `BBjDocumentBuilder.hasPendingWork()` (`currentState < DocumentState.Validated \|\| hasPendingCompile()`) is injected into the watcher as the quiescence predicate; `config-watcher.ts`'s `waitForQuiescenceThenNotify`/`pollQuiescence` never call `notify` while `hasPendingWork()` is true, polling every 100ms up to a 5000ms bound (`QUIESCENCE_POLL_MS`, `QUIESCENCE_TIMEOUT_MS`), after which it pushes anyway (logged). `main.ts` injects this predicate from the real shared `DocumentBuilder` cast to `BBjDocumentBuilder`. Proven end-to-end in `test/config-hot-reload-wiring.test.ts`'s interleaved-burst describe block (three config events + a settings change while `hasPendingWork` stays true → exactly one notification after it flips, or exactly one at the 5s bound). |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/config-reload-notification.ts` | `CONFIG_RELOAD_METHOD`, `ConfigReloadReason`, `ConfigReloadNotification` | VERIFIED | Present, exports confirmed via grep; imported by `bbj-notifications.ts`, `config-watcher.ts`, `extension.ts`. |
| `bbj-vscode/src/language/config-watcher.ts` | `createConfigWatcher`, debounce + quiescence + relevance gate | VERIFIED | Full implementation read in full; matches plan's `<action>` spec closely (armWatch, evaluate, waitForQuiescenceThenNotify, updateResolvedPath, dispose all present and non-stub). |
| `bbj-vscode/src/restart-gate.ts` | `createRestartGate`, cancel-then-schedule coalescing | VERIFIED | Present; wired as the sole restart path in `extension.ts` per source-guard tests (`config-reload-host.test.ts`). |
| `bbj-vscode/test/config-hot-reload.test.ts`, `config-hot-reload-wiring.test.ts`, `config-reload-host.test.ts` | Hermetic coverage of detection, quiescence, host wiring | VERIFIED | Re-ran live: `npx vitest run` → 3 files, 67/67 passed. |
| `bbj-intellij/.../config/ConfigModels.java` (`ConfigReloadNotification` DTO) | field-matched Gson DTO | VERIFIED | grep confirms `ConfigReloadNotification` imported/used in `BbjLanguageClient.java`. |
| `bbj-intellij/.../config/ConfigReloadPresentation.java` | `reasonLabel`/`widgetTooltip`/`consoleLine`/`clearsReason` | VERIFIED | File present (2948 bytes), consistent with plan. |
| `bbj-intellij/.../lsp/BbjLanguageClient.java` `configReloadRequired` handler | `@JsonNotification("bbj/configReloadRequired")` → `requestRestart` | VERIFIED | grep confirms annotation, method name, and `service.requestRestart(BbjServerService.RESTART_DEBOUNCE_MS)` call. |
| `.planning/phases/85.../COVERAGE.md` | one-line no-external-API declaration | VERIFIED | Present, one line, 143 bytes, matches required form. |
| `QA/FULL-TEST-CHECKLIST.md` rows | 5 hot-reload behaviors as hand-executable rows | VERIFIED (existence) — content quality is human-verification territory, see below. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `config-watcher.ts` | `config-path-resolver.ts` | `samePath`, `extractConsumedConfigContent`, `consumedConfigSnapshot` reused, not reimplemented | WIRED | Confirmed by import line and by the single-occurrence source-scan test (85-01 Task 2). |
| `bbj-ws-manager.ts` `initializeWorkspace` | `extractConsumedConfigContent` | shared extraction function | WIRED | Line 148 calls `extractConsumedConfigContent(configContents)`; line 149/152/156 set `consumedConfigSnapshotValue` in all three branches (success, catch, no-path). |
| `main.ts` `workspaceInitialized` block | `configWatcher.start(...)` | armed once, after first Validated build | WIRED | Line 125, inside the `if (!workspaceInitialized)` block per grep. |
| `main.ts` both `setConfigPath` sites | `configWatcher.updateResolvedPath(...)` | re-arm hook | WIRED | Two occurrences confirmed (lines 192, 209). |
| `extension.ts` `client.onNotification(CONFIG_RELOAD_METHOD, ...)` | `restartGate.request(...)` | choke point | WIRED | Handler body (lines 942-947) logs and calls `restartGate?.request(...)` only — no direct stop/start. |
| `extension.ts` `deactivate()` | `restartGate.cancel()` before `client.stop()` | shutdown ordering | WIRED | Confirmed by reading lines 996-1004: cancel() precedes stop(). |
| `BbjLanguageClient.configReloadRequired` | `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` | coalesced restart entry point | WIRED | Confirmed by grep of `BbjLanguageClient.java`. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|--------------|--------|----------|
| CFG-03 (#486) | 85-01, 85-02, 85-03, 85-04, 85-05 | Config hot-reload with restart coalescing | SATISFIED | REQUIREMENTS.md marks CFG-03 `[x]` and maps it to Phase 85 status `Complete`. All 5 plans declare `requirements: [CFG-03]` and all four ROADMAP success criteria have direct, checkable code evidence (above). No orphaned requirements found for Phase 85 in REQUIREMENTS.md. |

No orphaned requirements: REQUIREMENTS.md's Phase 85 mapping contains only CFG-03, matching every plan's `requirements` frontmatter.

### Anti-Patterns Found

Scanned all primary touched files (`config-watcher.ts`, `config-reload-notification.ts`,
`restart-gate.ts`, `extension.ts`, `ConfigReloadPresentation.java`, `BbjLanguageClient.java`) for
`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and for plan/decision-id tokens
(`D-\d+`, `C-\d+`, `COMP`, `CR-\d+`) — zero matches. `85-03-SUMMARY.md` and `85-04-SUMMARY.md`
each self-report one comment-hygiene deviation (stray `D-xx` references caught and fixed
pre-commit); the post-fix state is what's on disk now and is clean.

None found in the current source tree.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 85 vitest suite (detection, quiescence wiring, host restart gate) | `npx vitest run test/config-hot-reload.test.ts test/config-hot-reload-wiring.test.ts test/config-reload-host.test.ts` | 3 files, 67/67 passed | PASS |
| `hasPendingWork()`/`hasPendingCompile()` present and reading `currentState` | grep of `bbj-document-builder.ts` | both methods present, `currentState < DocumentState.Validated \|\| hasPendingCompile()` | PASS |
| Source-code wiring of `configWatcher`/`restartGate` at exactly the documented call sites | grep of `main.ts`/`extension.ts` | matches plan-specified call-site counts (1 `start`, 2 `updateResolvedPath`, 1 `createRestartGate`, cancel-before-stop in `deactivate`) | PASS |

Orchestrator-reported (not independently re-run in full due to context budget, but consistent
with the independently-verified spot checks above): `npm run build` exit 0; 125/125 tests across
the seven phase/host test files; targeted Gradle suites for `config.*`, `lsp.*`, `concurrency.*`
and `ComposerRequestContractTest` BUILD SUCCESSFUL; 87/87 Phase 84 regression tests pass.

### Human Verification Required

None required to pass this phase — QA checklist rows exist as hand-executable UAT material
(rows 12-15 across both IDE sections in `QA/FULL-TEST-CHECKLIST.md`), but per 85-05's own
coverage entries (`human_judgment: true`), those rows document a live-IDE UAT obligation
that is separate from (and does not block) this phase's automated-verification passing status.
If the project's workflow requires the phase-85 UAT pass before shipping, run the six new
checklist rows (VS Code rows 12-14, IntelliJ rows 13-15) against a live build.

### Gaps Summary

No gaps found. All four ROADMAP success criteria have direct code evidence: detection is
server-owned and directory-scoped (criterion 1-2), the relevance gate structurally prevents a
SETOPTS-only write from producing a notification (criterion 3), and the quiescence wait
provably defers the notification until the document builder reports no pending work or the 5s
bound elapses (criterion 4). Both host sides (VS Code `restart-gate.ts` + status bar; IntelliJ
`BbjServerService.requestRestart` + widget tooltip) reuse existing coalescing infrastructure
rather than introducing a second restart path, each fenced by a source-guard regression test.
CFG-03 (#486) is marked Complete in REQUIREMENTS.md and traces cleanly to this phase's five
plans with no orphaned requirement IDs.

---

*Verified: 2026-09-07*
*Verifier: Claude (gsd-verifier)*

## Re-verification 2026-09-07 (verify-work close-out)

**Trigger:** `85-01-SUMMARY.md` was edited after this report (commit `fdbddd1e`): two `coverage:` verification refs lacked a `status:` field and were tagged `status: pass`. No production or test code changed, so the evidence above is unchanged.

**Re-run during `/gsd-verify-work 85`:** `config-hot-reload.test.ts` + `config-hot-reload-wiring.test.ts` + `config-reload-host.test.ts` 73/73 (includes the three 85-REVIEW-FIX pinning tests, WR-01..WR-03); IntelliJ `config.*` + `lsp.*` + `ComposerRequestContractTest` 303 tests, 0 failures. UAT: 7/7 hand checkpoints passed in live VS Code and IntelliJ (85-UAT.md). Status remains **passed**.
