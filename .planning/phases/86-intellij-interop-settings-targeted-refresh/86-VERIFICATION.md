---
phase: 86-intellij-interop-settings-targeted-refresh
verified: 2026-09-07T00:00:00Z
status: human_needed
score: 3/3 must-haves verified (2 fully automated, 1 present-but-behavior-unverified)
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "Running Refresh Java Classes on IntelliJ does not interrupt diagnostics, completion, hover, or Structure View for files the user isn't actively refreshing (ROADMAP Phase 86 success criterion 2)."
    test: "Open a project with a large Java classpath, wait for the server to reach `started`, run Refresh Java Classes, and while the 'Refreshing Java classes…' progress task is visible invoke code completion, hover a variable and open Structure View."
    expected: "Completion answers, hover answers, Structure View populates; the status-bar widget never leaves `started`; no 'connection to the server got closed' message appears; exactly one console line reports completion and no balloon is raised."
    why_human: "There is no IntelliJ platform test harness in this repo and no live-IDE test exists. The automated evidence is entirely structural (a targeted `bbj/refreshJavaClasses` request replaces `requestRestart(0)`; a source guard proves no automatic restart path remains; the request runs off the dispatch thread) — it proves the mechanism cannot restart the server, but it cannot observe that completion/hover/Structure View actually keep answering while the request is in flight. This is exactly the recorded QA/FULL-TEST-CHECKLIST.md row 16 hand check (D-18), whose Pass/Fail checkbox is still unchecked."
human_verification:
  - test: "QA/FULL-TEST-CHECKLIST.md row 16 — 'Refresh Java Classes keeps language features online': trigger Refresh Java Classes on a workspace with a large classpath and invoke completion/hover/Structure View while the progress task is visible."
    expected: "Completion, hover and Structure View all answer during the refresh; the status-bar widget stays `started`; exactly one console success line; no balloon."
    why_human: "Live-IDE-only property; no automated harness exists in this repo (see behavior_unverified_items above)."
  - test: "QA/FULL-TEST-CHECKLIST.md row 17 — 'Java-interop port auto-detects, and an explicitly confirmed 5008 is kept': open the Settings dialog against a real BBjServices install, confirm the greyed field/hint track a live `BBj.properties` edit across a dialog reopen, then uncheck Auto-detect, apply 5008, reopen, and confirm 5008 survived even though the properties file names a different port."
    expected: "Auto-detect on tracks the live file across reopens; an explicitly applied 5008 survives a reopen with the checkbox still off even though detection would report a different port; re-checking restores the detected value; no dialog/warning/balloon at any point."
    why_human: "The underlying decision logic (`InteropPortSettings.effectivePort`/`migratedAutoDetect`/`portToPersist`) is fully covered by plain-JUnit tests including the explicit-5008 regression pair, and the wiring is fenced by two source guards — but the Swing dialog's actual disable/prefill/hint round trip against `BbjSettings.getInstance()` (a live IntelliJ Application service) has no platform test harness in this repo, so it is unexercised by any automated test."
---

# Phase 86: IntelliJ Interop Settings & Targeted Refresh Verification Report

**Phase Goal:** IntelliJ's java-interop connection settings are correct everywhere they're read, and refreshing Java classes no longer takes the whole IDE's language features offline.
**Verified:** 2026-09-07
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | [Go/no-go] LSP4IJ's client API supports a targeted custom request without a full restart, and Refresh Java Classes is routed through it on the existing composer-server interface. | ✓ VERIFIED | `BbjComposerServer.refreshJavaClasses()` added alongside `bbj/compile`/`bbj/resolvedConfigPath` on the single interface LSP4IJ proxies (`BbjComposerServer.java:86-87`). `BbjRefreshJavaClassesAction.actionPerformed` calls it via `BbjComposerService.server(project)` from a `Task.Backgroundable`, never `requestRestart(0)` on any automatic path. `ComposerRequestContractTest` (10 declared requests incl. `bbj/refreshJavaClasses`, asserted against `bbj-vscode/src/language/main.ts`) passes. `BbjRefreshJavaClassesActionSourceGuardTest` (7 tests) structurally pins exactly one restart reference, located inside the user-clicked balloon action only. |
| 2 | Running Refresh Java Classes does not interrupt diagnostics, completion, hover, or Structure View for files not being refreshed. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code is present and wired: the targeted request replaces the restart, runs off-EDT (`assertIsNonDispatchThread()`, pinned to exactly one occurrence), and the guard/timeout/presenter classes are fully unit-tested (`JavaClassesRefreshFlowTest`, `JavaClassesRefreshPresenterTest`, `RefreshInFlightGuardTest` — all green). But the actual runtime claim ("features stay answering while a refresh runs") requires a live IDE session; no such harness exists in this repo. QA row 16 exists but its Pass/Fail box is unchecked — see Human Verification below. |
| 3 | Every reader of the java-interop port auto-detects the live port, and an explicitly confirmed 5008 is never silently overwritten. | ✓ VERIFIED | `BbjSettings.getEffectiveJavaInteropPort()` is the single accessor; `EffectiveInteropPortSourceGuardTest` (5 tests, all green) proves `BbjLanguageServerFactory`, `BbjJavaInteropService.checkConnection` and `BbjSettingsConfigurable.reset()` each call it exactly once with zero raw-field reads, the removed `detectJavaInteropPort` substring detector is gone, and no numeric `== 5008` equality gate remains. `InteropPortSettingsTest#anExplicitlyConfirmed5008SurvivesAPropertiesFileNamingADifferentPort` pins both directions of the regression pair (auto-on/6000→6000; auto-off/stored-5008/detected-6000→5008). `BbjSettingsComponentSourceGuardTest` (10 tests) proves the Swing component resolves no detection itself. |

**Score:** 2/3 truths fully verified by automated evidence; 1 present-and-wired but behavior-unverified (routed to human verification, not counted as verified per the verifier's behavior-dependent-truth rule).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-intellij/.../composer/BbjComposerServer.java` | `refreshJavaClasses()` `@JsonRequest` method | ✓ VERIFIED | Present, javadoc names `main.ts` and #632, matches `compile()`/`resolvedConfigPath()` convention. |
| `bbj-intellij/.../refresh/JavaClassesRefreshFlow.java` | Outcome classification, 60s timeout | ✓ VERIFIED | `REFRESH_TIMEOUT_SECONDS=60`, 5-constant `Outcome` enum, no `com.intellij`/LSP4IJ import. |
| `bbj-intellij/.../refresh/JavaClassesRefreshPresenter.java` | Reason-keyed presentation | ✓ VERIFIED | Exhaustive switch, no default arm; success is balloon-false/console-only; 4 failure outcomes each balloon/error/restart-offer true. |
| `bbj-intellij/.../refresh/RefreshInFlightGuard.java` | Per-project single-flight guard | ✓ VERIFIED | `ConcurrentHashMap.putIfAbsent`-based; `SESSION` + package-private constructor for tests. |
| `bbj-intellij/.../actions/BbjRefreshJavaClassesAction.java` | Rewritten action | ✓ VERIFIED | Guard-then-task-then-render flow; exactly one restart call, inside the balloon's `NotificationAction`, confirmed both by direct read and by `BbjRefreshJavaClassesActionSourceGuardTest`. |
| `bbj-intellij/.../BbjInteropPortDetector.java` | `com.basis.languageServer.addr` parser via `java.util.Properties` | ✓ VERIFIED | `ADDR_KEY`, `DEFAULT_PORT=5008`, `PortLookup` record, `parseAddrValue`, `readFrom`, `lookup` all present; 19 tests including the live escaped fixture (`localhost\:5008\:true`). |
| `bbj-intellij/.../BbjInteropPortCache.java` | Stat-keyed memo | ✓ VERIFIED | `ConcurrentHashMap.compute` idiom mirroring `BbjNodeVersionCache`; 7 tests incl. an 8-thread race and a real-file `SESSION` round trip. |
| `bbj-intellij/.../InteropPortSettings.java` | `effectivePort`/`migratedAutoDetect`/`portToPersist`/`portSettingModified` | ✓ VERIFIED | All four pure functions present; 13 tests incl. the D-06 regression pair and the 5-combination migration matrix. |
| `bbj-intellij/.../InteropPortPresentation.java` | Inline hint text | ✓ VERIFIED | `hint(boolean, PortLookup)`, composed from the detector's constants; 6 tests, pairwise-distinct branches. |
| `bbj-intellij/.../BbjSettings.java` | `javaInteropPortAutoDetect` flag, `getEffectiveJavaInteropPort()`, migration | ✓ VERIFIED | All three present exactly as specified; `detectJavaInteropPort` deleted. |
| `bbj-intellij/.../BbjSettingsComponent.java` | Auto-detect checkbox + hint row | ✓ VERIFIED | Checkbox/hint/`setJavaInteropPortDetection` present; zero `BbjSettings`/`BbjInteropPortCache`/`InteropPortSettings` references in the component (confirmed by source guard + direct read). |
| `bbj-intellij/.../lsp/EffectiveInteropPortSourceGuardTest.java` | Fence for the 4 readers | ✓ VERIFIED | 5 tests, all pass; confirmed by direct re-read of assertions and a fresh green test run. |
| `.planning/phases/86.../COVERAGE.md` | No-external-API declaration | ✓ VERIFIED | One line, `No external API integration: …`, under 200 chars. |
| `QA/FULL-TEST-CHECKLIST.md` rows 16-17 | Hand-check rows | ✓ VERIFIED (present) / boxes unchecked | Both rows appended after row 15 without disturbing rows 14-15; Pass/Fail checkboxes empty — UAT not yet run. |
| `documentation/docs/intellij/configuration.md` §Port | Rewritten Port docs | ✓ VERIFIED | Auto-detect checkbox, `com.basis.languageServer.addr`, hint, disabled-service case, explicit-5008 rule, 1-65535 range, shared effective value, restart-on-Apply all present; old "auto-detects when BBj Home is set" bullet removed; Host subsection notes host is never auto-detected. |
| Folded EM sentinel todo | Closed, no code | ✓ VERIFIED | Moved to `.planning/todos/completed/`, `## Resolution` + `completed:` front-matter present, Problem section untouched, no production files touched by 86-04. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `BbjRefreshJavaClassesAction` | `BbjComposerServer` | `BbjComposerService.server(project)` → `refreshJavaClasses()` bounded at 60s | ✓ WIRED | Confirmed by direct read (lines 58-64) and green `JavaClassesRefreshFlowTest`. |
| `BbjComposerServer` | `bbj-vscode/src/language/main.ts` | `bbj/refreshJavaClasses` request name pinned on both sides | ✓ WIRED | `ComposerRequestContractTest` passes; `git diff --numstat` on `main.ts`/`extension.ts` across the phase range is empty, confirming D-16 (server handler untouched). |
| `BbjRefreshJavaClassesAction` | `JavaClassesRefreshPresenter` | outcome enum → `Presentation` | ✓ WIRED | `render()` computes `Presentation` before `invokeLater`, dispatches console/balloon off the `error`/`balloon` flags. |
| `BbjLanguageServerFactory.initializeParams` | `BbjSettings.getEffectiveJavaInteropPort()` | `javaInteropPort` init option | ✓ WIRED | Line 52; source-guard-confirmed exactly-once, zero raw-field reads. |
| `BbjJavaInteropService.checkConnection` | `BbjSettings.getEffectiveJavaInteropPort()` | re-read every 5s tick | ✓ WIRED | Line 122; source-guard-confirmed. |
| `BbjSettingsConfigurable.reset()` | `BbjInteropPortCache.SESSION.lookup` | one cached stat per dialog open, handed to the component as a value | ✓ WIRED | Confirmed by direct read (lines 146-152) and `EffectiveInteropPortSourceGuardTest`; matches the orchestrator's note that the automated key-link checker's "target not referenced" was a false negative — the call is present and exercised. |
| `BbjSettings.getEffectiveJavaInteropPort` | `BbjInteropPortCache.SESSION.lookup` | auto-detect branch only | ✓ WIRED | Confirmed by direct read (lines 83-89) and the second orchestrator-noted false-negative resolved the same way. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Refresh/interop-port unit + source-guard suites are green | `cd bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.refresh.*' --tests 'com.basis.bbj.intellij.lsp.EffectiveInteropPortSourceGuardTest' --tests 'com.basis.bbj.intellij.InteropPort*' --tests 'com.basis.bbj.intellij.BbjInteropPort*'` | `BUILD SUCCESSFUL` | ✓ PASS |
| Whole IntelliJ module suite (orchestrator-run, cited) | `./gradlew test --offline` | 669 tests, 0 failures, 0 errors | ✓ PASS (cited, not independently re-run in full — targeted re-run above corroborates the relevant subset) |
| Live-IDE feature-continuity property (SC 2) | manual IDE session | not run | ? SKIP → routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CFG-04 (#632) | 86-01, 86-04 | Refresh Java Classes completes without taking diagnostics/completion/hover/Structure View offline | ✓ SATISFIED (mechanism); live-IDE claim pending human check | Targeted request + source guards fully proven; runtime continuity is QA row 16, unchecked. |
| CFG-05 (#608) | 86-02, 86-03 | Every reader auto-detects the port; explicit 5008 never overwritten | ✓ SATISFIED | Fully proven by unit tests + two source guards; QA row 17 is a corroborating live-install hand check, unchecked but not the sole evidence. |

Both requirements are present in REQUIREMENTS.md mapped to Phase 86 with status "Complete"; no orphaned requirements found for this phase.

### Anti-Patterns Found

None. Searched all files modified in this phase (via SUMMARY.md key-files) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/empty-return stubs — none found. Planning-identifier scan (`D-\d+`, `C-\d+`, `COMP`, `CR-\d+`, `86-0[1-4]`) across the full phase diff (`581348a1..HEAD`) for Java source and for `QA/FULL-TEST-CHECKLIST.md` / `documentation/docs/intellij/configuration.md` returned zero matches — no planning identifiers leaked into source, tests, or public docs. GitHub issue numbers (#632, #608, #544, #571, #433) appear throughout, which is permitted.

### Human Verification Required

1. **QA/FULL-TEST-CHECKLIST.md row 16 — Refresh Java Classes keeps language features online**
   **Test:** Open a project with a large Java classpath, wait for the server to reach `started`, run Refresh Java Classes, and invoke completion/hover/Structure View while the progress task is visible.
   **Expected:** All three answer during the refresh; status widget stays `started`; exactly one console success line; no balloon.
   **Why human:** No IntelliJ platform test harness exists in this repo; this is the phase's only evidence for ROADMAP success criterion 2, explicitly deferred to UAT by plan 86-01's D-18/flagged_assumptions.

2. **QA/FULL-TEST-CHECKLIST.md row 17 — Java-interop port auto-detects, and an explicitly confirmed 5008 is kept**
   **Test:** Against a real BBjServices install, confirm the greyed field/hint track a live `BBj.properties` edit across a dialog reopen; uncheck Auto-detect, apply 5008, reopen, confirm 5008 survived; re-check and confirm the detected value returns.
   **Expected:** Behavior matches D-01 through D-05 as documented.
   **Why human:** `BbjSettings.getInstance()` resolves a live Application service with no platform test harness; the decision logic underneath is fully unit-tested but the Swing round trip itself is not.

### Gaps Summary

No blocking gaps. All artifacts exist, are substantive, and are wired; all source guards and unit-test suites re-run green; no planning identifiers leaked into source or public docs; both requirements are accounted for with no orphans. The phase goal's mechanism (targeted request instead of restart; single accessor for the port) is fully and directly verified in the codebase. The one open item is the roadmap's second success criterion, whose truth is inherently a live-IDE runtime property that this repository has no automated way to observe — the phase itself recognized this (D-18) and produced exact, falsifiable QA checklist rows (16, 17) rather than skipping verification; those rows are written but not yet executed (checkboxes empty). This routes the phase to `human_needed` rather than `passed`, per the verifier's behavior-dependent-truth rule — not a code deficiency.

---

*Verified: 2026-09-07*
*Verifier: Claude (gsd-verifier)*
