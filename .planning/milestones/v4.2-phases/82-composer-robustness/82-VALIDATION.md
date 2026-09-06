---
phase: "82"
slug: "composer-robustness"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-05"
reconstructed: true
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from PLAN/SUMMARY artifacts by `/gsd-validate-phase 82` after execution (State B): no VALIDATION.md was seeded at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 via Gradle (IntelliJ plugin, `bbj-intellij`; plain JVM, no IntelliJ platform test fixture). This phase touched no `bbj-vscode/` file, so vitest is not part of its contract. |
| **Config file** | `bbj-intellij/build.gradle.kts` (JDK 17 daemon toolchain, phase 78) |
| **Quick run command** | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.*'` |
| **Full suite command** | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --rerun` |
| **Estimated runtime** | composer package ~10 s on a warm daemon; whole module ~2 min cold |

Prerequisites: `bbj-vscode/out/language/main.cjs` must exist for the Gradle packaging tasks (phase 78 fail-fast bundle check); the test task itself does not need it. No language server, BBj install or IDE is needed: every seam this phase added (`ComposerFlow`, `ComposerNotices`, `StaleEditGuard`, `DecodeEquality`) is plain Java with no IntelliJ import, and the wiring into the platform-bound classes (`ComposerLauncher`, the three dialogs, the three intentions) is pinned by whole-file source guards.

---

## Sampling Rate

- **After every task commit:** Run the plan's targeted test class(es)
- **After every plan wave:** Run the full-module command
- **Before `/gsd-verify-work`:** Full module must be green (0 failures, 0 errors)
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 82-01-01 | 01 | 1 | COMP-01 | — | Every stage of the composer launch chain (server, catalogs, decodeCall, hung request bounded by one 30 s deadline) surfaces its failure as exactly one notice; wrapper exceptions are unwrapped to the real cause before classification | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerFlowTest'` | ✅ | ✅ green (14) |
| 82-01-02 | 01 | 1 | COMP-01 | — | `ComposerNotices` decides wording, severity and remedy for NOT_READY / REQUEST_FAILED / STALE_DOCUMENT from the reason and throwable type, never from message prose | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerNoticesTest'` | ✅ | ✅ green (9) |
| 82-01-03 | 01 | 1 | COMP-01 | — | `ComposerLauncher.launch()` is a thin adapter over `ComposerFlow` with exactly one terminal `handle()`, no nested `thenAccept` pyramid, and the modal `Messages.showInfoMessage` path removed | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerLauncherChainSourceGuardTest'` | ✅ | ✅ green (10) |
| 82-02-01 | 02 | 1 | COMP-01 | — | `ComposerFlow.observe/once`: a failed, timed-out or null preview reaching MSGBOX `refresh()` shows "Preview unavailable — <reason>" and disables OK; a superseded outcome is discarded without consuming the session's single balloon | unit | same as 82-01-01 (tests 8–14) | ✅ | ✅ green (14) |
| 82-02-02 | 02 | 1 | COMP-01 | — | addWindow and addChildWindow dialogs route `refresh()` through the same observe/once seam with identical failure handling and OK gating | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest'` | ✅ | ✅ green (11) |
| 82-02-03 | 02 | 1 | COMP-01 | — | All three dialogs: no bare `thenAccept()`/`thenCompose()`, OK disabled before the first preview round-trip, UI updates via `ModalityState.any()`, constructor signatures and plugin.xml unchanged | source-guard | same as 82-02-02 | ✅ | ✅ green (11) |
| 82-03-01 | 03 | 1 | COMP-02 | — | MSGBOX apply re-decodes the captured line at the captured column and writes only on a full match; mutated line, inserted line above, or out-of-range line abort with exactly one STALE_DOCUMENT notice and no write; a failed/hung/null re-decode is a mismatch, never a vacuous match | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.StaleEditGuardTest'` | ✅ | ✅ green (11) |
| 82-03-02 | 03 | 1 | COMP-02 | — | Both window apply paths share the same guard and `applyHexEdit`; decode equality is field-wise across found/edit/initial/trailingArgs with `Arrays.equals` on ranges and null-safe on either side for all three decode shapes | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.StaleEditGuardTest' --tests 'com.basis.bbj.intellij.composer.DecodeEqualityTest'` | ✅ | ✅ green (11 + 7) |
| 82-03-03 | 03 | 1 | COMP-02 | — | No composer write escapes the guard; the modification stamp is re-checked as the first statement inside the write command; the create path (`insertAtCaret`) never acquires a guard; window operation order unchanged; both seams carry no IntelliJ import | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerApplyGuardSourceGuardTest'` | ✅ | ✅ green (10) |
| 82-04-01 | 04 | 2 (gap closure, G-82-6) | COMP-02 | — | Every `<intentionAction>` in plugin.xml ships an `intentionDescriptions/<Class>/` directory with a non-blank `description.html` carrying the tooltip-end marker plus a distinct before/after template pair (descriptor-driven, XXE-hardened XML parse) | integration (resource) | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.IntentionDescriptionResourcesTest'` | ✅ | ✅ green (5) |
| 82-04-02 | 04 | 2 (gap closure, G-82-6) | COMP-02 | — | All three composer intentions return `IntentionPreviewInfo.Html` from `generatePreview` so the platform's fallback description lookup is unreachable; invoke/isAvailable/startInWriteAction/getText/getFamilyName and plugin.xml unchanged | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerIntentionPreviewSourceGuardTest'` | ✅ | ✅ green (5) |
| 82-04-03 | 04 | 2 (gap closure, G-82-6) | COMP-02 | — | The description resources are present in the composed plugin jar as directory entries plus files; whole module green | packaging inspection | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew composedJar && unzip -l build/libs/*.jar \| grep intentionDescriptions/` (verification-only task, no commit) | ✅ | ✅ green (3 dirs + 9 files) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

The three code-review fixes landed after the plans (`cd9f306b` one launch-chain deadline instead of per-stage timeouts, `0acf1748` OK disabled before the first preview round-trip, `d9f44ece` stamp re-check anchored on the real write-command call site) are covered by the same classes: `ComposerFlowTest` grew to 14 cases and `ComposerDialogRefreshSourceGuardTest` to 11.

Requirement coverage (whole IntelliJ module re-run 2026-09-05 with `--rerun`: 44 classes, 408 tests, 0 failures, 0 errors, 0 skipped):

| Requirement | Covering tests | Gap type |
|-------------|----------------|----------|
| COMP-01 (#538) | `ComposerFlowTest` (14), `ComposerNoticesTest` (9), `ComposerLauncherChainSourceGuardTest` (10), `ComposerDialogRefreshSourceGuardTest` (11) | COVERED (balloon rendering and live-server behaviour by seam tests + source guards; see Manual-Only) |
| COMP-02 (#567; #433/#426/#430/#473 for the intention descriptions) | `StaleEditGuardTest` (11), `DecodeEqualityTest` (7), `ComposerApplyGuardSourceGuardTest` (10), `IntentionDescriptionResourcesTest` (5), `ComposerIntentionPreviewSourceGuardTest` (5) | COVERED (live split-editor abort and Settings page rendering by seam tests + source guards + jar inspection; see Manual-Only) |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs were needed: every task wrote its failing test first (RED observed in each SUMMARY, mostly as compile failures against not-yet-existing seams) against the JUnit 5 runner phase 78 provisioned. No new fixture, dependency or platform test framework was added.

---

## Manual-Only Verifications

All items below were confirmed in a live IDE during `/gsd-verify-work 82` round 2 on 2026-09-05 (82-UAT.md: 8 passed, 0 issues). They remain manual because the notification platform, `DialogWrapper`, `WriteCommandAction` and the intention popup all need the IntelliJ runtime, which the plain-JVM test module deliberately excludes.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Server killed mid-invocation: one error balloon naming the composer and the failure detail, mirrored to the language-server console; nothing silent | COMP-01 | Live LSP4IJ process + notification platform | Invoke a composer, kill the server process while the request is in flight (UAT test 4) |
| Server stopped while a dialog is open: "Preview unavailable — <reason>", OK disabled (already on open), exactly one balloon per dialog session however long typing continues; restart restores preview and OK | COMP-01 | `setOKActionEnabled` and balloons need the IDE | Open a composer, stop the server, keep typing; restart, type again (UAT test 5) |
| Each of the three composers names itself in its balloon; a reopened dialog is a new session allowed a second balloon | COMP-01 | Dialog-lifecycle property only observable in the IDE | Repeat the previous item per composer; close/reopen and provoke a second failure (UAT test 6) |
| Rapid typing never flickers back to an older preview; OK reflects the newest state | COMP-01 | Real Swing timing under a live server | Type rapidly in a composer's fields and watch statement, summaries, schematic (UAT test 7) |
| Server-stopped invocation shows one information balloon "The BBj language server is not ready yet…" | COMP-01 | Notification platform; additionally not reproducible because `BbjComposerService.server` auto-restarts a stopped server | Only testable if the server can be held down (UAT test 3, accepted from code) |
| Stale-edit abort: editing the captured line (or inserting a line above it) in a split editor while the dialog is open, then OK, shows the warning balloon, leaves the document byte-for-byte untouched, and "Reopen composer" reopens on the current document, for all three composers | COMP-02 | `WriteCommandAction` document integration + balloon action | Open composer on an existing call, edit the line in another split, press OK (UAT test 2) |
| Unchanged document applies exactly as before with a single Undo; OK against a stopped server shows an error balloon and no write | COMP-02 | Same | UAT test 8 |
| Lightbulb preview pane for all three intentions computes with no `Intention Description Dir URL is null` exception; Settings › Editor › Intentions shows description and before/after example for each BBj entry | COMP-02 | Intention popup and Settings page run inside the platform | Alt+Enter on each call kind, arrow onto the composer entry; then open the Intentions settings page (UAT test 1) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags (Gradle one-shot only)
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-05 (reconstructed; all 12 task commands re-run green via the whole-module `--rerun` after UAT round 2 completed 8/8)

## Validation Audit 2026-09-05
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
