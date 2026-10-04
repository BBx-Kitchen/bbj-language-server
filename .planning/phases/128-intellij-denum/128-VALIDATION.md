---
phase: "128"
slug: "intellij-denum"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-03"
---

# Phase 128 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit Jupiter (`org.junit:junit-bom:6.1.3`, `useJUnitPlatform()`); no IntelliJ test fixtures, so IDE-bound code is covered by source guards plus hand UAT |
| **Config file** | `bbj-intellij/build.gradle.kts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests '<class pattern for the files the task touched>'` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| **Estimated runtime** | ~2-10 seconds targeted; full suite a few minutes (baseline 1165 tests, 0 failures) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `--tests` command for the classes the task touched
- **After every plan wave:** Run `./gradlew test` (full IntelliJ suite)
- **Before `/gsd-verify-work`:** Full suite must be green, then hand UAT against a live BBj 26.03 BBjServices
- **Max feedback latency:** 10 seconds (targeted)

---

## Per-Task Verification Map

Filled by the planner per task; requirement-to-test map from RESEARCH.md:

| Requirement | Behavior | Test Type | Test class | File Exists | Status |
|-------------|----------|-----------|------------|-------------|--------|
| IJF-05 | `bbj/denum` declared on `BbjComposerServer`, present in scanned TS sources (`denum-command.ts` added to the scan list) | contract | `ComposerRequestContractTest` | ✅ edited | ✅ green |
| IJF-05 | `DenumResult` parses a real envelope, ignoring `edits`/`diagnostics` | unit | `DenumModelsJsonBoundaryTest` | ✅ added | ✅ green |
| IJF-05 / IJF-06 | `LineNumbering` port matches the 9 TS cases + edge cases | unit | `LineNumberingTest` | ✅ added | ✅ green |
| IJF-06 | TS rule constants have not drifted from the Java port | contract | `LineNumberingContractTest` | ✅ added | ✅ green |
| IJF-05 | Action: BGT, BBj guard, visible/enabled split, no save, background request, no lsp4ij import; plugin.xml placement, no shortcut | source guard | `BbjDenumberActionSourceGuardTest` | ✅ added | ✅ green |
| IJF-05 | No new vendor coupling | existing guard | `Lsp4ijImportAllowlistTest` | ✅ unchanged | ✅ green |
| IJF-05 | Console block presenter: header + one line per entry, ERROR flagged, control chars flattened, null-tolerant, no links | unit | `DenumDiagnosticsPresenterTest` | ✅ added | ✅ green |
| IJF-05 | `BbjLanguageClient` handles `bbj/denumDiagnostics` and `bbj/showDenumDiagnostics` | unit/guard | `BbjLanguageClientDenumNotificationTest`, `BbjLanguageClientDenumSourceGuardTest` | ✅ added | ✅ green |
| IJF-05 | TS ↔ Java notification names/fields/severities | contract | `DenumNotificationContractTest` | ✅ added | ✅ green |
| IJF-06 | Banner provider on shared base, single [Denumber], no Dismiss, registered | source guard | `BbjLineNumberedNotificationProviderSourceGuardTest` + `BbjNotificationProviderBaseSourceGuardTest` | ✅ added / edited | ✅ green |
| IJF-06 | Debounced refresh: one refresh per distinct file per window | unit | `DirtyFileCoalescerTest` (concurrency package, `ManualScheduler`) | ✅ added | ✅ green |
| IJF-06 | Refresher: one listener, Disposable parent, BBj filter, disposal guards | source guard | `BbjLineNumberedBannerRefresherSourceGuardTest` | ✅ added | ✅ green |
| all | Whole IntelliJ suite green | full | `./gradlew test` | — | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `denum/LineNumberingTest.java`, `denum/LineNumberingContractTest.java`
- [x] `denum/DenumModelsJsonBoundaryTest.java`
- [x] `denum/DenumDiagnosticsPresenterTest.java`
- [x] `lsp/BbjLanguageClientDenumNotificationTest.java`, `lsp/BbjLanguageClientDenumSourceGuardTest.java`
- [x] `denum/DenumNotificationContractTest.java`
- [x] `actions/BbjDenumberActionSourceGuardTest.java`
- [x] `BbjLineNumberedNotificationProviderSourceGuardTest.java` + update `BbjNotificationProviderBaseSourceGuardTest.java`
- [x] `concurrency/DirtyFileCoalescerTest.java`, `denum/BbjLineNumberedBannerRefresherSourceGuardTest.java`
- [x] Edit `composer/ComposerRequestContractTest.java` (add `denum-command.ts` and `bbj/denum`)

Framework install: none.

---

## Manual-Only Verifications

Build the language server and the IntelliJ plugin zip first, and again from the final tree after code-review fixes. Live BBj 26.03 BBjServices.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Action enabled on numbered file, greyed on unnumbered, absent on non-BBj; placed after Compile in Tools + editor popup; no shortcut | IJF-05 | No IDE fixtures | Open each file type, check both menus |
| One undo step; buffer dirty; disk untouched until save | IJF-05 | LSP4IJ applyEdit runtime | Denumber, Edit > Undo once, check file on disk |
| Banner appears on numbered open, absent on unnumbered/config.bbx; [Denumber] works; disappears after edit; returns on undo | IJF-06 | EditorNotifications runtime | Open, click, undo |
| Server outcome balloons (success, nothing to do, tokenized, mixed, server down); sticky [Show] balloon after diagnostics | IJF-05 | LSP4IJ rendering | Trigger each case |
| Fresh IDE, tool window never opened: console block present on first open; [Show] reveals; ERROR colour; no hyperlinks | IJF-05 | Tool-window lifecycle | Restart IDE, run on a file yielding diagnostics |
| Path with space + non-ASCII; read-only file gets server message | IJF-05 | URI/runtime | Open such files, run Denumber |
| `idea.log` has no unsupported-notification line for the two DENUM notifications | IJF-05 | Real log evidence | grep idea.log |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-04 (all 14 mapped classes green in a full `./gradlew test`: 1263 tests, 0 failures; manual-only rows covered by the passing 128-UAT smoke test)

---

## Validation Audit 2026-10-04

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
