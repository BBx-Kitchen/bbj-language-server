---
phase: 96-platform-integration-node-js-diagnosis
verified: 2026-09-20T16:45:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - "G-96-2 (UAT gap, not a verification gap): too-old configured Node.js now offers Download Node.js next to Configure Path and Install Manually, from one shared NodePresentation.actionLabel/NodeActions.perform mapping consumed by both the start-failure notification and the editor banner; the Settings dialog names the clear-the-field recovery next to its 'Version too old' statement and as the Node.js field's empty-text hint."
    - "Human verification item 1 (too-old configured Node.js startup rejection on real Windows) — closed by the maintainer's real-Windows re-UAT of Task 4's full checklist (popup buttons / editor banner in the too-old-configured state / settings label + empty-field hint), reply 'pass, works as expected now', tied to sha256 89ba44723d319771bc6436aee8b0a0218fca04b93c2093c5f6249f3258df2659 (commit dbdb6528)."
    - "Human verification item 2 (unwritable Node.js cache directory drops the Download action) — closed by 96-UAT.md Test 4 (pass)."
    - "Human verification item 3 (crash banner during indexing) — closed by 96-UAT.md Test 5 (pass)."
    - "Human verification item 4 (all four banners together, including Phase 95's wrong-peer wording) — closed by 96-UAT.md Test 6 (pass)."
  gaps_remaining: []
  regressions: []
deferred: []
behavior_unverified_items: []
---

# Phase 96: Platform Integration and Node.js Diagnosis Verification Report

**Phase Goal:** The plugin's platform-integration surfaces stop wasting resources and stop misleading —
a reused TextMate bundle directory, no inert settings page, one notification-provider base — and a
developer without a usable Node.js is shown the real diagnosis, with the auto-install path finally
attested on real Windows.

**Verified:** 2026-09-20T16:45:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (previous report: `human_needed`, 5/5 truths met, 4
outstanding human-verification items; this pass closes all four and the intervening UAT gap G-96-2).

## Goal Achievement

### Re-verification Summary

The previous verification (2026-09-20T15:30:00Z) found all five ROADMAP success criteria genuinely met
in the codebase but held status at `human_needed` because four items 96-07-SUMMARY.md had explicitly
deferred to hand-testing were still outstanding: (1) too-old configured Node.js startup rejection on
real Windows, (2) unwritable cache directory drops the Download action, (3) crash banner during
indexing, (4) all four banners together.

Since that report, a full Windows UAT round (`96-UAT.md`) ran all 28 tests. Tests 3-6 (which supply the
evidence for outstanding items 2, 3 and 4) passed directly. Test 2 (item 1) surfaced a real defect,
UAT gap `G-96-2`: a too-old configured Node.js offered only "Configure Node.js Path", not the download,
and the Settings dialog gave no hint that clearing the field would let auto-detect/download take over.
Gap-closure plan `96-08` fixed both causes, a code-review pass (`96-REVIEW-gap-08.md`) found and the
plan fixed one asymmetric-guard warning (WR-01), and the maintainer re-ran the Windows checklist against
the fixed build, replying "pass, works as expected now" — closing both G-96-2 and outstanding item 1.

This re-verification (a) re-confirms G-96-2's fix in the current source, (b) confirms the WR-01 fix
landed, (c) confirms no production code changed after the attested build, and (d) confirms all four
previously-outstanding human-verification items now have UAT evidence, so no human-verification item
remains open.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A second IDE launch reuses the cached TextMate bundle directory instead of allocating a fresh temp directory and re-copying its five files; abandoned directories are cleaned up. | ✓ VERIFIED (regression) | No file under `TextMateBundleCache.java`/`BbjTextMateBundleProvider.java` touched by any commit since the last verification (`git diff 2f553a75..HEAD --stat` touches only the Node.js action/settings surface). `96-UAT.md` Test 1: pass on real Windows. |
| 2 | Customizing a colour under Settings › Editor › Color Scheme › BBj visibly changes highlighting — or the page is gone entirely. | ✓ VERIFIED (regression) | `BbjColorSettingsPage.java` still absent from disk; `plugin.xml` unchanged. `96-UAT.md` Tests 7/25: pass. |
| 3 | The three editor notification providers share one base carrying the file-type guard and panel construction; each banner still appears/disappears in exactly the conditions it did before. | ✓ VERIFIED (recorded deviation, regression) | `BbjNotificationProviderBase.java` and its subclasses unchanged in this window. `96-UAT.md` Tests 15/16/26: pass. |
| 4 | A developer whose Node.js is unusable is shown the diagnosis that matches reality; "not yet downloaded" and "cache directory inaccessible" are distinguishable to every caller; a configured-but-unusable path either consults the cached download or deliberately does not, with the decision recorded. | ✓ VERIFIED | **UAT gap G-96-2 closed.** Confirmed directly in current source: `BbjLanguageServer.notifyUnresolvedNodePath` (lines 106-124) now takes a `NodeExecutableResolver.Resolution`, loops over `NodePresentation.bannerActions(resolution)`, and labels/runs each action through `NodePresentation.actionLabel(actionId)` / `NodeActions.perform(project, actionId)` — no hardcoded single "Configure Node.js Path" action remains. `BbjMissingNodeNotificationProvider.buildPanel` (lines 49-58) reads from the identical mapping. `NodeActions.java` is the one id-to-behaviour mapping (download/configure/install-manually, `IllegalArgumentException` on an unknown id); `NodePresentation.actionLabel` (lines 91-98) is the one id-to-label mapping. `BbjSettingsComponent.java` line 368-369: the below-minimum-version label now reads `"Version too old (minimum: 22), detected: " + lookup.version() + " — clear this field to auto-detect or download Node.js 22+"`; line 118-119: the empty Node.js field shows `"Leave empty to auto-detect or download Node.js 22+"` as placeholder text. Targeted re-run in this verification session (`BbjMissingNodeNotificationSourceGuardTest`, `BbjLanguageServerSourceGuardTest`, `NodePresentationTest`, `BbjSettingsFailureStateSourceGuardTest`, `BbjSettingsComponentSourceGuardTest`, `DownloadGuardTest`, `BbjNodeDownloaderSourceGuardTest`, `Lsp4ijImportAllowlistTest`): BUILD SUCCESSFUL, test task executed (not UP-TO-DATE). Code-review warning WR-01 (banner loop had no source guard against reverting to hardcoded literals) fixed in commit `a80901e8`, confirmed present: `BbjMissingNodeNotificationSourceGuardTest.java` now has `bannerLoopDerivesLabelAndBehaviourFromTheSharedSeamExactlyOnceEach` and `noActionLabelLiteralOrInlineBehaviourSurvivesInTheCommentStrippedWholeFile` (lines 242, 253). `git diff dbdb6528..HEAD --stat -- bbj-intellij/src/main` is empty — no production code changed after the attested build; `a80901e8` touches only the one test file (121 lines added). WR-02 (start-failure body text still frames the fix as "Configure...", left unchanged beside the new buttons) is an accepted, deliberately-recorded deviation per 96-08's `must_haves.assumptions` — a wording inconsistency, not a functional defect; reported as a note below, not a failed truth. |
| 5 | On a real Windows machine with no Node.js configured, the "Download Node.js" action produces a working `node.exe` beside its `.sha256` sidecar and the language server starts afterward. | ✓ VERIFIED (regression) | Unchanged since the last verification: root cause found and fixed in `796a3f6f`, re-attested PASS on real Windows 2026-09-20T14:30:00Z. `96-UAT.md` Test 24: pass (prior-attestation). No commit since then touches the restart/download pipeline. |

**Score:** 5/5 truths verified. All previously-outstanding human-verification items now have UAT
evidence (see below) — none remain open.

### Human-Verification Items From the Previous Report — Now Closed

| # | Item | Closed by | Evidence |
|---|------|-----------|----------|
| 1 | Too-old configured Node.js startup rejection on real Windows | 96-08 Task 4 re-UAT | Maintainer's real-Windows reply "pass, works as expected now" against Task 4's three-part checklist (popup buttons in the too-old-configured state / editor banner in that same state / settings label + empty-field hint), tied to `bbj-intellij-0.1.0.zip` sha256 `89ba44723d319771bc6436aee8b0a0218fca04b93c2093c5f6249f3258df2659`, source commit `dbdb6528`. Recorded verbatim in `96-08-SUMMARY.md`. It is a blanket pass, not itemised per-step — treated as the human attestation for the whole checklist, not inflated into per-item detail it does not contain. |
| 2 | Unwritable Node.js cache directory drops the Download action | `96-UAT.md` Test 4 | `result: pass` — "The banner reads 'The plugin's Node.js cache directory could not be accessed.' and offers the configure-path and install-manually actions but NO 'Download Node.js' button" confirmed on Windows. |
| 3 | Crash banner during indexing | `96-UAT.md` Test 5 | `result: pass` — crash banner visible while the indexing progress bar is still running. |
| 4 | All four banners together, including Phase 95's wrong-peer wording | `96-UAT.md` Test 6 | `result: pass` — all four banners appear/disappear independently in one session, java-interop wrong-peer wording confirmed. |

Per the re-verification instruction, none of these is carried forward as an open human-verification item;
each is cited to the UAT test (or 96-08 checkpoint) that closed it.

### Required Artifacts (96-08 delta)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/NodeActions.java` | Single id-to-behaviour mapping for the three Node.js recovery actions, consumed by both surfaces | ✓ VERIFIED | Exists, 40 lines, `perform(Project, String)` dispatches via `switch` on the three `NodePresentation.ACTION_*` constants, throws `IllegalArgumentException` on an unknown id. (Deviation from plan prose: one method not two, `switch` not if-chain, no `Bbj` prefix — recorded and reasoned in 96-08-SUMMARY.md; substance matches the must-have.) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` | Start-failure notification whose actions are generated from the resolver's rejection reason | ✓ VERIFIED | `notifyUnresolvedNodePath` (line 106) takes a `Resolution`, loops `NodePresentation.bannerActions(resolution)` (line 114), calls `NodePresentation.actionLabel(actionId)` and `NodeActions.perform(project, actionId)` (lines 115, 119) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` | Below-minimum label carrying the recovery sentence, and the Node.js field's empty-text hint | ✓ VERIFIED | Line 368-369 (label), line 118-119 (empty-text hint); both end in the shared phrase `"auto-detect or download Node.js 22+"` |
| `bbj-intellij/src/test/java/.../BbjLanguageServerSourceGuardTest.java` | Structural pin that both surfaces derive actions from the seam and shared mapping | ✓ VERIFIED | Extended (not new-filed, per recorded deviation); passed in this session's targeted run |
| `bbj-intellij/src/test/java/.../BbjMissingNodeNotificationSourceGuardTest.java` | Banner-side guard symmetric with the notification-side guard (WR-01 fix) | ✓ VERIFIED | `a80901e8` added `bannerLoopDerivesLabelAndBehaviourFromTheSharedSeamExactlyOnceEach` and `noActionLabelLiteralOrInlineBehaviourSurvivesInTheCommentStrippedWholeFile`; passed in this session's targeted run |

### Key Link Verification (96-08 delta)

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BbjLanguageServer.java` | `NodePresentation.java` | the `Resolution` reaches the notification site so `bannerActions` can vary by rejection reason | ✓ WIRED | `resolveNodePath` passes `resolution` (not just a message) to `notifyUnresolvedNodePath` (line 93) |
| `BbjMissingNodeNotificationProvider.java` | `NodeActions.java` | the banner reads labels/behaviours from the shared mapping instead of owning them | ✓ WIRED | Lines 52-55: loop over `NodePresentation.bannerActions(resolution)` calling `NodePresentation.actionLabel(actionId)` and `NodeActions.perform(project, actionId)`; unused `BrowserUtil`/`ShowSettingsUtil`/`EditorNotifications` imports removed from this file |
| `BbjSettingsComponent.java` | user's recovery path | the below-minimum branch's own `setText` names clearing the field as the fix | ✓ WIRED | Line 368-369, single `setText` statement |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| G-96-2 fix present and targeted tests green | `cd bbj-intellij && ./gradlew test --tests "*.BbjMissingNodeNotificationSourceGuardTest" --tests "*.BbjLanguageServerSourceGuardTest" --tests "*.NodePresentationTest" --tests "*.BbjSettingsFailureStateSourceGuardTest" --tests "*.BbjSettingsComponentSourceGuardTest" --tests "*.DownloadGuardTest" --tests "*.BbjNodeDownloaderSourceGuardTest" --tests "*.Lsp4ijImportAllowlistTest"` | `Task :test` executed (not UP-TO-DATE); BUILD SUCCESSFUL | ✓ PASS |
| No production code changed after the attested Windows build | `git diff dbdb6528..HEAD --stat -- bbj-intellij/src/main` | empty output | ✓ PASS |
| WR-01 fix present in source, not just claimed | `grep -n "bannerLoopDerivesLabelAndBehaviourFromTheSharedSeamExactlyOnceEach\|noActionLabelLiteralOrInlineBehaviourSurvivesInTheCommentStrippedWholeFile" BbjMissingNodeNotificationSourceGuardTest.java` | Lines 242, 253 present | ✓ PASS |
| Debt-marker scan on every file touched by the gap-closure delta (`2f553a75..HEAD`, 9 files) | `grep -nE "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` on all 9 files | 0 matches in all 9 files | ✓ PASS |
| No new planning identifier in the 96-08 delta's production files | `grep -nE "D-[0-9]|C-[0-9]|G-[0-9]|CR-[0-9]|PLAT-0[1-6]"` on the 5 production files | 0 matches, except pre-existing `D-12` in `BbjSettingsComponent.java` lines 33/225 (predates this plan, out of scope per 96-08-SUMMARY.md, confirmed untouched by this diff) | ✓ PASS |
| Whole IntelliJ suite (orchestrator, this session, prior to this agent's dispatch) | `./gradlew test --rerun-tasks` | BUILD SUCCESSFUL, 1094 tests, 0 failures, 0 errors | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| PLAT-01 (#613) | 96-02 | TextMate bundle reuse + cleanup | ✓ SATISFIED | No regression; `96-UAT.md` Test 1 pass |
| PLAT-02 (#621) | 96-01 | Inert Color Scheme page removed | ✓ SATISFIED | No regression; `96-UAT.md` Tests 7/25 pass |
| PLAT-03 (#622) | 96-04 | Four providers share one base | ✓ SATISFIED (recorded deviation) | No regression; `96-UAT.md` Tests 15/16/26 pass |
| PLAT-04 (#588) | 96-05/96-06/96-08 | Distinguishable Node diagnoses | ✓ SATISFIED | G-96-2 closed; source confirmed in this session |
| PLAT-05 (todo) | 96-05/96-06/96-08 | Configured-but-unusable path consults cache, decision recorded | ✓ SATISFIED | G-96-2 closed; shared mapping structurally pinned |
| PLAT-06 (todo) | 96-03/96-07 | Windows attestation | ✓ SATISFIED | Re-attested PASS; `96-UAT.md` Test 24 |

REQUIREMENTS.md traceability table shows all six PLAT-01..PLAT-06 as `Complete` for Phase 96 (lines
111-116), matching every requirement declared across the phase's 8 plans. No orphaned requirements.

### Anti-Patterns Found

None. Scanned every file touched by the gap-closure delta (`git diff 2f553a75..HEAD`, 9 files: 5
production, 4 test) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` — zero matches. No blocker-level
findings.

**Note (not a blocker):** `96-REVIEW-gap-08.md` WR-02 remains open by deliberate decision — the
start-failure notification's body text still ends with "Configure a Node.js executable at Settings |
Languages & Frameworks | BBj" even when the balloon now also offers Download/Install-Manually buttons
next to it. This is recorded under 96-08's `must_haves.assumptions` as an accepted scope cut (the gap's
"missing" list asked for actions, not prose, and `NodeExecutableResolverTest` pins the current wording
across 24 cases) rather than an oversight. It does not contradict any of this phase's must-haves — the
maintainer's Windows re-UAT explicitly exercised the three-button balloon and replied pass — but is
flagged here as a known, tracked wording inconsistency for a future pass.

**Note (not a blocker, pre-existing):** `BbjSettingsComponent.java` lines 33 and 225 carry a pre-existing
`D-12` planning-identifier reference in javadoc/comments, predating this plan and confirmed untouched by
the 96-08 diff. Out of scope for this phase's prohibitions (which bind the plan's own diff), flagged only
for completeness per `96-REVIEW-gap-08.md` IN-02.

### Human Verification Required

None. All items from the previous verification's human-verification list are now closed — see
"Human-Verification Items From the Previous Report — Now Closed" above, each cited to the UAT test or
checkpoint that closed it.

### Gaps Summary

No gaps remain. All six of Phase 96's requirements (PLAT-01 through PLAT-06) are genuinely and
observably complete in the codebase, the previous report's one open item (G-96-2, a UAT gap surfaced
during hand-testing, not a verification-time gap) is closed with the fix confirmed directly in current
source, and all four previously-outstanding human-verification items now have UAT evidence:

- `NodeActions.perform` and `NodePresentation.actionLabel` form the single shared id-to-behaviour /
  id-to-label mapping; both the start-failure notification (`BbjLanguageServer.notifyUnresolvedNodePath`)
  and the editor banner (`BbjMissingNodeNotificationProvider.buildPanel`) consume it, with no
  hand-enumerated second action set at either site.
- The Settings dialog names the clear-the-field recovery both next to its "Version too old" statement
  and as the Node.js field's empty-text hint.
- Code review's WR-01 (asymmetric guard coverage between the notification and banner surfaces) is fixed
  in commit `a80901e8`, a test-only commit confirmed to be the only change after the attested build.
- The maintainer's real-Windows re-UAT of the full Task 4 checklist — popup buttons, editor banner in
  the too-old-configured state, and the settings label/hint — replied "pass, works as expected now",
  closing G-96-2 and the previously-open "too-old configured Node.js" human-verification item together.
- `96-UAT.md`'s remaining Tests 3-6 (banner/startup agreement, unwritable cache, crash-during-indexing,
  all-four-banners) independently passed on the same Windows round, closing the other three
  previously-open human-verification items.
- `git diff dbdb6528..HEAD --stat -- bbj-intellij/src/main` is empty, confirming no untested production
  change slipped in after the attested build.
- `.planning/WINDOWS.md` entry id 3 (Phase 96) remains `fixed`; no new entry was opened for G-96-2
  because the Windows re-UAT passed, per 96-08's own `<output>` instruction.

Status is `passed`: every ROADMAP success criterion holds in the codebase, every requirement traces to
Complete, no artifact or key link is missing/stub/unwired, no blocker anti-pattern was found, and no
human-verification item remains open.

---

_Verified: 2026-09-20T16:45:00Z_
_Verifier: Claude (gsd-verifier)_
