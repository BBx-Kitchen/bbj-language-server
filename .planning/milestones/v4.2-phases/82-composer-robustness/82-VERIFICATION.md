---
phase: 82-composer-robustness
verified: 2026-09-05T21:34:41Z
status: passed
score: 9/9 must-have truths verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/8
  gaps_closed:
    - "G-82-6 (plan 82-04, commits 75f75002/9b9b1f34/b255592b/e5c5ec20/caaec116): the lightbulb popup's PluginException(\"Intention Description Dir URL is null\") is closed. Verified independently in this round by: (1) reading all nine new resource files under bbj-intellij/src/main/resources/intentionDescriptions/{ConfigureMsgboxIntention,ConfigureAddWindowIntention,ConfigureAddChildWindowIntention}/ and confirming each description.html carries the platform's `<!-- tooltip end -->` marker and each before/after template pair is non-blank and distinct; (2) reading all three Configure*Intention.java files and confirming `generatePreview` now returns `new IntentionPreviewInfo.Html(...)` built from a compile-time string literal (no EMPTY, no interpolated document/server/runtime value) while `getText`, `getFamilyName`, `isAvailable`, `invoke` and `startInWriteAction() == false` are byte-for-byte unchanged; (3) re-running `IntentionDescriptionResourcesTest` (5/5) and `ComposerIntentionPreviewSourceGuardTest` (5/5) fresh; (4) re-running the whole composer package (9 classes, 72 tests, 0 failures — up from round 2's 7 classes/72 tests, since this plan added 2 classes/10 tests without removing any); (5) re-running the whole IntelliJ module (44 classes, 408 tests, 0 failures, 0 errors — up from round 2's 42/398); (6) confirming `plugin.xml`, `build.gradle.kts` and `bbj-vscode/` are still untouched by `git diff --stat` across the full phase range (base 5fcb4350 to tip caaec116); (7) building the plugin fresh (`./gradlew buildPlugin` exit 0) and inspecting the composed jar (`bbj-intellij-0.1.0.jar`) directly: 13 matching `intentionDescriptions/` lines — the root entry, 3 per-intention directory entries and the 9 files — proving the platform's directory-URL lookup will resolve from the shipped artifact, not just from the source tree; (8) re-running the planning-identifier scan (`git diff 5fcb4350 caaec116 --unified=0 -- bbj-intellij/src/main/resources/intentionDescriptions bbj-intellij/src/main/java/.../composer bbj-intellij/src/test/java/.../composer | grep -E 'D-[0-9]|C-[0-9]|COMP-[0-9]|BUILD-[0-9]|G-[0-9]+-[0-9]|CR-[0-9]|WR-[0-9]|SEC-|82-0[0-9]'`) — 0 matches, exit 1."
  gaps_remaining: []
  regressions: []
human_verification:

  - test: "Server-stopped composer invocation shows one information balloon."
    expected: "Stop the language server, invoke a composer from the editor popup or lightbulb intention: exactly one information balloon in the \"BBj Language Server\" group reading \"The BBj language server is not ready yet. Open a BBj file and try again.\" — a balloon, not a modal."
    why_human: "NotificationGroupManager and balloon rendering need a running IDE; C-01 keeps the platform off the plain-JUnit-5 test classpath. UAT recorded this item as skipped/not-testable in this environment (the server auto-restarts before the proxy resolves to null) and verified the logic from code instead — still an open live-IDE confirmation."
  - test: "Server killed mid-invocation shows one error balloon plus a console line."
    expected: "One error balloon naming the composer and the failure detail, and the same text appears in the language-server console tool window."
    why_human: "Same as above — balloon and console rendering need a running IDE and a live language-server process. UAT recorded pass, but the check is a live-IDE assertion outside the automated suite."
  - test: "Refresh failure disables OK and rate-limits the balloon."
    expected: "Open a composer dialog, stop the LS, type in a field: the summary/flags-summary label reads \"Preview unavailable — <reason>\", OK becomes disabled (including immediately on dialog open, before the first preview round-trip resolves), and exactly one balloon appears however long typing continues; restarting the LS and typing again restores both the label and OK."
    why_human: "DialogWrapper.setOKActionEnabled and the notification platform need a running IDE. UAT recorded pass."
  - test: "All three composers name themselves correctly and rate-limit per dialog session."
    expected: "Repeat the refresh-failure check for MSGBOX, addWindow and addChildWindow — each balloon names its own composer; closing and reopening a dialog after a failure allows a second balloon."
    why_human: "Same as above — DialogWrapper and the notification platform need a running IDE. UAT recorded pass."
  - test: "Rapid typing never flickers to a stale preview."
    expected: "Type rapidly in a composer dialog with the language server running; the statement, summaries and schematic always track the newest keystroke, with no flicker back to an older preview."
    why_human: "Real Swing/UI timing under a live language server cannot be reproduced by a JUnit double. UAT recorded pass."
  - test: "Stale-edit abort in a live split-editor scenario (the phase's core ROADMAP SC2 behavior)."
    expected: "Open a composer on a MSGBOX call, edit that same line in another split editor while the dialog is open, press OK: a warning balloon appears saying nothing was changed, the document is byte-for-byte untouched, and the \"Reopen composer\" action opens the composer again against the current text. Repeat for addWindow/addChildWindow, and for a line inserted above the call (same abort, accepted as the consequence of not relocating a moved call)."
    why_human: "WriteCommandAction's real document integration, the modal dialog, and the balloon action need a running IDE. UAT test 6 recorded `result: issue` because a PluginException interrupted the run before the stale-edit behavior itself could be judged; that exception is the gap this re-verification round closes (G-82-6). The underlying invariant is behaviorally proven against a fake document by `StaleEditGuardTest#mutatesTheDocumentWhileTheDialogIsOpenAndAssertsNoEditIsApplied` and 10 sibling cases plus `ComposerApplyGuardSourceGuardTest`'s wiring guard, but the live end-to-end confirmation (real dialog, real document, real balloon) that UAT test 6 set out to make is still unconfirmed by a human and was explicitly deferred, not passed, by plan 82-04's own SUMMARY."
  - test: "Unchanged-document and stopped-server apply paths still work."
    expected: "Open a composer, change nothing, press OK: the edit applies exactly as before and a single Undo reverts it as one operation. Open a composer, stop the language server, then press OK: an error balloon reports the failed request and the document is untouched."
    why_human: "WriteCommandAction's real document integration and the notification platform need a running IDE. UAT recorded pass."
  - test: "Lightbulb popup preview no longer throws, and the Settings page renders the new resources."
    expected: "Alt+Enter on a MSGBOX(...), addWindow(...) and addChildWindow(...) call, arrow onto the composer entry so the popup computes a preview: a one-paragraph description appears and no IDE error report is raised. Each entry still opens its composer dialog, prefilled, exactly as before. Settings › Editor › Intentions › BBj shows the description text and a before/after example for each of the three entries."
    why_human: "IntentionPreviewPopupUpdateProcessor and the Settings UI need a running IDE; C-01 keeps the platform off the test classpath. This is the fix plan 82-04 shipped for G-82-6 — its packaging (jar contents) and its source wiring are both proven here, but the live popup-no-longer-throws confirmation itself is new to this round and has not yet been re-run by a human."
---

# Phase 82: Composer Robustness Verification Report

**Phase Goal:** Composer dialogs surface failures visibly and never apply an edit against document state that changed while the dialog was open.
**Verified:** 2026-09-05T21:34:41Z
**Status:** human_needed
**Re-verification:** Yes — this is the round after gap-closure plan 82-04 closed UAT gap G-82-6 (the lightbulb intention-preview `PluginException`). This report starts from the goal and independently re-derives every truth from the current codebase (base `5fcb4350` → tip `caaec116`); it does not carry forward the prior report's evidence without re-checking it.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every stage of the composer launch chain (server resolution, catalogs, decodeCall) surfaces a failure as exactly one user-visible notice; a null stage is `NOT_READY`, a thrown exception is `REQUEST_FAILED`, a bounded hang is also `REQUEST_FAILED` (ROADMAP SC1, COMP-01, #538). | ✓ VERIFIED | `ComposerFlow.launch()` composes `serverFuture -> composerCatalogs() -> decodeCall` with `thenCompose` bounded by one whole-chain `orTimeout`, terminated by exactly one `handle()`. `ComposerFlowTest` (14 tests) pins the null-server/null-catalogs/throwable/timeout/happy-path/wrapped-exception cases. `ComposerLauncherChainSourceGuardTest` (10 tests) pins zero `thenAccept(`/`thenCompose(` in `ComposerLauncher.java` and that the modal `Messages.showInfoMessage` path is gone. Untouched by plan 82-04. |
| 2 | The nested three-level continuation pyramid in `ComposerLauncher.launch()` is gone; no future returned by an LSP4IJ proxy call is left unobserved in the launcher. | ✓ VERIFIED | Read `ComposerLauncher.java` in full: `launch()` makes exactly three `flow.launch(...)` calls, one per `Kind`, no nested `thenAccept`/`thenCompose`. `grep -c 'thenAccept\|thenCompose'` (comments filtered) = 0. Untouched by plan 82-04. |
| 3 | Every notice renders as a balloon in the existing "BBj Language Server" notification group (information/warning/error), never a modal dialog; a `REQUEST_FAILED` notice is also mirrored to the LS console. | ✓ VERIFIED | `ComposerNoticeRenderer.render()` builds a `Notification` from `NotificationGroupManager...getNotificationGroup("BBj Language Server")`, maps `Severity` 1:1 to `NotificationType`, attaches "Reopen composer" only for `STALE_DOCUMENT`, and calls `BbjServerService.logToConsole(...)` only for `ERROR`. Zero `Messages.showInfoMessage` / `com.intellij.openapi.ui.Messages` import remain. Untouched by plan 82-04. |
| 4 | When a composer dialog's `refresh()` preview fails, times out, or completes with `null` while its sequence is current, the dialog shows "Preview unavailable — `<reason>`" and disables OK (including up front, before the first preview round-trip); a superseded outcome of either kind is discarded identically; at most one balloon is raised per dialog session (COMP-01, D-05). | ✓ VERIFIED | All three dialogs route `refresh()` through `flow.observe(...)`; each has one `Preview unavailable — ` write, `setOKActionEnabled(false)` twice (constructor up-front plus failure path), sequence-checked via `mySeq == seq.get()` on both paths, and a `ComposerFlow.once(...)`-wrapped notifier. `ComposerFlowTest` + `ComposerDialogRefreshSourceGuardTest` (11 tests) pin this. Untouched by plan 82-04. |
| 5 | If the document changes while a composer dialog is open, re-decoding the call at the captured offsets after the dialog closes detects the mismatch, aborts the edit, and notifies the user instead of rewriting whatever text now occupies the range (ROADMAP SC2, COMP-02, #567). | ✓ VERIFIED | `StaleEditGuard.applyIfUnchanged()` re-reads the current line text and modification stamp, re-runs the caller-supplied `<kind>DecodeCall`, and writes only when `sameDecode.test(capturedDecode, fresh)` is true; a mismatch, null fresh decode, missing/out-of-range line, or a re-decode failure/timeout all notify and skip the write. `StaleEditGuardTest#mutatesTheDocumentWhileTheDialogIsOpenAndAssertsNoEditIsApplied` (and 10 sibling cases) directly exercises this state-transition invariant against a fake document double, not just presence/wiring. `ComposerLauncher.openMsgbox`/`applyHexEdit` route all three edit-in-place apply sites through the guard (`applyIfUnchanged(` x2, `replaceString(` x2, each preceded by its guard call). Untouched by plan 82-04. |
| 6 | Match means the whole decode result is equal (found, edit payload, `initial`, `trailingArgs`), not just the edit ranges; array-valued ranges are compared element-wise; nulls are handled on both sides (D-08). | ✓ VERIFIED | `DecodeEquality.sameMsgbox/sameAddWindow/sameAddChildWindow` compare `found`, the edit payload, `initial`'s full field set and `trailingArgs`, using `Objects.equals`/`Arrays.equals` (never `==`). `DecodeEqualityTest` (7 tests) pins this, including per-field mutation tables. Untouched by plan 82-04. |
| 7 | The modification stamp is re-checked as the first statement inside the write command, closing the async window between the re-decode completing and the write starting; the right-to-left operation order for the hex-edit paths is unchanged. | ✓ VERIFIED | `StaleEditGuard.applyIfUnchanged`'s write body's first statement compares `view.modificationStamp()` against the pre-re-decode snapshot before running `applyEdit`. `ComposerApplyGuardSourceGuardTest#theModificationStampReCheckHappensInsideTheWriteCommand` anchors on the real `write.runWriteCommand(...)` call site (the last occurrence, not the `WriteGate` interface declaration) and asserts the stamp check precedes `applyEdit.run()`. `ComposerLauncher.java` still contains `Comparator.comparingInt((Op o) -> o.start).reversed()`. Untouched by plan 82-04. |
| 8 | The create path (`insertAtCaret`) stays outside both the notice/flow seam's launch chain and the stale-edit guard; server-side `bbj/composer/*` handlers and `composer-commands.ts` are untouched by the whole phase. | ✓ VERIFIED | `insertAtCaret` is a plain `WriteCommandAction` at the live caret offset, with no guard or flow-seam call. `git diff --stat` for `bbj-vscode/`, `plugin.xml` and `build.gradle.kts` is empty across the *entire* phase range `5fcb4350..caaec116`, including all four plans' commits. `ComposerApplyGuardSourceGuardTest` pins `insertString(` occurring exactly once, outside any `applyIfUnchanged(`/`replaceString(` pair. |
| 9 | Every intention registered as an `<intentionAction>` in `plugin.xml` ships a description resource that resolves under the plugin classloader, so the lightbulb popup's preview computation no longer raises `PluginException: Intention Description Dir URL is null` (G-82-6, #426/#430/#433/#473). | ✓ VERIFIED | Nine resource files exist under `bbj-intellij/src/main/resources/intentionDescriptions/{ConfigureMsgboxIntention,ConfigureAddWindowIntention,ConfigureAddChildWindowIntention}/` — each `description.html` non-blank and carrying `<!-- tooltip end -->`, each `before.bbj.template`/`after.bbj.template` pair non-blank and distinct (read directly; also pinned by `IntentionDescriptionResourcesTest`, 5/5, descriptor-driven from `plugin.xml` rather than a hard-coded list). All three `generatePreview` methods now return `new IntentionPreviewInfo.Html(...)` built from a compile-time literal (no `EMPTY`, no interpolated runtime value); `getText`/`getFamilyName`/`isAvailable`/`invoke`/`startInWriteAction()==false` are byte-for-byte unchanged (pinned by `ComposerIntentionPreviewSourceGuardTest`, 5/5). The composed plugin jar (`bbj-intellij-0.1.0.jar`, freshly built this round) physically carries the three directory entries plus the nine files — the platform resolves a *directory* URL, so file-only packaging would still throw; this was independently confirmed by unzipping the jar this round, not merely trusted from the SUMMARY. `plugin.xml`, `build.gradle.kts` and every other composer class are untouched by this fix. |

**Score:** 9/9 truths verified (0 present, behavior-unverified). Truth 9 is new in this round (the gap-closure deliverable); truths 1-8 were re-confirmed unchanged.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/.../composer/ComposerNotices.java`, `ComposerFlow.java`, `ComposerNoticeRenderer.java`, `ComposerLauncher.java` | COMP-01 seams and adapter | ✓ VERIFIED | Unchanged by plan 82-04; re-confirmed present and unmodified in this round's diff scope. |
| `bbj-intellij/.../composer/MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java` | Observed refresh, unavailable label, OK gating, one-shot balloon | ✓ VERIFIED | Unchanged by plan 82-04. |
| `bbj-intellij/.../composer/StaleEditGuard.java`, `DecodeEquality.java` | Stale-edit guard and decode comparator | ✓ VERIFIED | Unchanged by plan 82-04. |
| `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/{description.html,before.bbj.template,after.bbj.template}` | Description resource tree | ✓ VERIFIED | All 3 files exist, read directly; `description.html` contains `<!-- tooltip end -->`; templates non-blank and distinct |
| `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/{description.html,before.bbj.template,after.bbj.template}` | Description resource tree | ✓ VERIFIED | Same checks, all pass |
| `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/{description.html,before.bbj.template,after.bbj.template}` | Description resource tree | ✓ VERIFIED | Same checks, all pass |
| `bbj-intellij/.../composer/ConfigureMsgboxIntention.java`, `ConfigureAddWindowIntention.java`, `ConfigureAddChildWindowIntention.java` | `generatePreview` returns `IntentionPreviewInfo.Html`; every other member unchanged | ✓ VERIFIED | Read all three files directly: `new IntentionPreviewInfo.Html(` present exactly once each, no `IntentionPreviewInfo.EMPTY`, `getText`/`getFamilyName`/`isAvailable`/`invoke`/`startInWriteAction` unchanged. `git diff --stat` for this plan's production commits touches only these three files. |
| `bbj-intellij/src/test/.../composer/IntentionDescriptionResourcesTest.java` | plugin.xml-driven regression guard | ✓ VERIFIED | Read in full: parses `plugin.xml` with a hardened `DocumentBuilderFactory` (DOCTYPE disabled, external entities off, XInclude off), derives its subject list from `<intentionAction>` elements (no hard-coded class-name array — confirmed by inspection), asserts directory/description.html/before/after existence and non-blankness. 5/5 tests pass in a fresh run this round. |
| `bbj-intellij/src/test/.../composer/ComposerIntentionPreviewSourceGuardTest.java` | Source guard for the preview wiring | ✓ VERIFIED | Read in full: pins zero `IntentionPreviewInfo.EMPTY`, exactly one `new IntentionPreviewInfo.Html(` per intention, `startInWriteAction`/`return false;`, `invoke`/`isAvailable` delegation counts, and `plugin.xml`'s three registrations untouched. 5/5 tests pass in a fresh run this round. |
| Nine composer test classes under `bbj-intellij/src/test/.../composer/` | Behavioural + source-guard coverage | ✓ VERIFIED | All 9 files exist (7 carried from 82-01/82-02/82-03 plus this round's 2 new classes); fresh `--rerun` this round: 72 tests, 0 failures, 0 errors across the 9 classes (per-class XML counts: ComposerFlowTest 14, ComposerNoticesTest 9, ComposerLauncherChainSourceGuardTest 10, ComposerDialogRefreshSourceGuardTest 11, StaleEditGuardTest 11, DecodeEqualityTest 7, ComposerApplyGuardSourceGuardTest 10, IntentionDescriptionResourcesTest 5, ComposerIntentionPreviewSourceGuardTest 5). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `bbj-intellij/.../ConfigureMsgboxIntention.java` etc. | `plugin.xml` `<intentionAction><className>` | resource directory named after the class simple name | ✓ WIRED | `intentionDescriptions/Configure{Msgbox,AddWindow,AddChildWindow}Intention/description.html` all resolve; `IntentionDescriptionResourcesTest` derives the directory name from `plugin.xml` itself, so the wiring is descriptor-driven rather than assumed |
| `IntentionDescriptionResourcesTest` | `plugin.xml` | `getElementsByTagName("intentionAction")` | ✓ WIRED | Confirmed by reading the parsing code; 3 registrations found, matching the file's actual 3 `<intentionAction>` blocks |
| `ConfigureMsgboxIntention.generatePreview` (and the other two) | `com.intellij.codeInsight.intention.preview.IntentionPreviewInfo` | `new IntentionPreviewInfo.Html(` | ✓ WIRED | Confirmed by reading all three files; the platform's `IntentionPreviewComputable` fallback path (which previously threw) is now unreachable from `generatePreview` because a non-empty preview is always returned |
| Composed plugin jar | `intentionDescriptions/<SimpleClassName>/` | packaged directory + file entries | ✓ WIRED (packaging-level, re-confirmed this round) | `unzip -l bbj-intellij-0.1.0.jar \| grep intentionDescriptions/` → 13 lines: root entry, 3 directory entries, 9 files — the platform needs the directory URL specifically, and it is present |
| (all COMP-01/COMP-02 links from prior rounds) | — | — | ✓ WIRED | Re-confirmed unchanged; see truths 1-8 evidence above |

### Data-Flow Trace (Level 4)

Not applicable in the stub-detection sense (no rendered dynamic list/table in this phase), but the equivalent check for a static-content risk was run: `generatePreview`'s HTML strings are compile-time literals with no project/editor/document/server value interpolated (confirmed by reading the three intention files and by `ComposerIntentionPreviewSourceGuardTest`'s prohibition on `IntentionPreviewInfo.EMPTY`), and the `description.html`/template resources are static repository files, not templated at build time.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Composer package test suite (verifier's own fresh run, post plan-04 commits) | `./gradlew test --tests 'com.basis.bbj.intellij.composer.*' --rerun` | 9 classes, 72 tests, 0 failures, 0 errors | ✓ PASS |
| Whole IntelliJ module (aggregated from this run's fresh test-results XML) | XML aggregation over `build/test-results/test/TEST-*.xml` | 44 classes, 408 tests, 0 failures, 0 errors | ✓ PASS (matches the orchestrator's own whole-suite run this round exactly) |
| Plugin builds and packages the new resources | `./gradlew buildPlugin` | exit 0 | ✓ PASS |
| Composed jar carries the description resources as directory entries + files | `unzip -l bbj-intellij-0.1.0.jar \| grep 'intentionDescriptions/'` | 13 matching lines (root + 3 dirs + 9 files) | ✓ PASS |
| Planning-identifier scan (this round's own regex, run over the whole phase diff) | `git diff 5fcb4350 caaec116 --unified=0 -- bbj-intellij/src/main/resources/intentionDescriptions bbj-intellij/src/main/java/.../composer bbj-intellij/src/test/java/.../composer \| grep -E 'D-[0-9]\|C-[0-9]\|COMP-[0-9]\|BUILD-[0-9]\|G-[0-9]+-[0-9]\|CR-[0-9]\|WR-[0-9]\|SEC-\|82-0[0-9]'` | 0 matches, exit 1 | ✓ PASS |
| `plugin.xml`/`build.gradle.kts`/`bbj-vscode/` untouched across the whole phase | `git diff --stat 5fcb4350 caaec116 -- <paths>` | empty | ✓ PASS |
| Only the three intention files changed in plan 04's production code | `git diff --stat 75f75002~1 caaec116 -- bbj-intellij/src/main/java/.../composer/` | 3 files changed (the three `Configure*Intention.java`) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| COMP-01 | 82-01, 82-02 | Every composer chain (launcher + refresh) has a terminal handler producing a user-visible notification | ✓ SATISFIED | Truths 1-4 above |
| COMP-02 | 82-03, 82-04 (gap closure) | Re-decode at captured offsets after dialog close; abort and notify on mismatch; and (82-04) the lightbulb popup that surfaces this behavior no longer crashes before the user can see it | ✓ SATISFIED | Truths 5-7 (the guard) and truth 9 (the gap closure that removed the exception blocking UAT's confirmation of the guard) |

No orphaned requirements: `REQUIREMENTS.md` maps exactly COMP-01 and COMP-02 to Phase 82 (`grep -n "Phase 82" REQUIREMENTS.md`), both are `[x]`-checked and both are claimed across the four plans' `requirements:` frontmatter (COMP-01 in 82-01/82-02, COMP-02 in 82-03/82-04).

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any file touched by plan 82-04 (checked by reading all 14 files it created/modified). No hardcoded-empty stub patterns: the `generatePreview` HTML strings are deliberately static literals by design (a compile-time preview string, not a data-flow value), which is the correct pattern here, not a stub — pinned against regression by `ComposerIntentionPreviewSourceGuardTest`.

Carried forward from the prior round, still true and not reintroduced: the round-1 planning-identifier leak was fixed and stays fixed; round 2's code-review finding IDs (`CR-01`/`WR-01`/`WR-02`/`WR-03`) remain in a few test comments as a functionally-inert, previously-flagged informational note (not a gap, not reintroduced or worsened by plan 82-04, which introduces no new finding-ID references).

### Human Verification Required

Truths 1-9 are all verified from the codebase and the automated suite is green (408/408, 0 failures, whole module; 72/72 composer package). Status is `human_needed`, not `passed`, because the phase's own design (C-01: keep `DialogWrapper`, `WriteCommandAction`'s real editor integration and the notification platform off the plain-JUnit-5 test classpath) defers a fixed set of live-IDE confirmations to a human, and this gap-closure round adds one more rather than removing any:

1. **Server-stopped composer invocation shows one information balloon.** UAT recorded this as `skipped` (not reproducible in that environment — the language server auto-restarted before the proxy resolved to null), verified from code instead. Still open as a live confirmation.
2. **Server killed mid-invocation shows one error balloon + console line.** UAT: pass.
3. **Refresh failure disables OK and rate-limits the balloon** (including the up-front disable added by the round-2 code-review fix). UAT: pass.
4. **All three composers name themselves correctly and rate-limit per session.** UAT: pass.
5. **Rapid typing never flickers to a stale preview.** UAT: pass.
6. **Stale-edit abort in a live split-editor scenario — the phase's core ROADMAP SC2 behavior.** UAT test 6 recorded `result: issue` because the `PluginException` this round's gap closure fixes interrupted the run before the stale-edit behavior itself could be judged. The underlying guard logic is behaviorally proven against a fake document (`StaleEditGuardTest`, 11 cases) and its wiring is source-guarded (`ComposerApplyGuardSourceGuardTest`, 10 cases), but **the live end-to-end confirmation UAT test 6 was designed to make has still never successfully completed** — it needs a clean re-run now that the popup no longer throws. This is the single most important outstanding item: it is the direct human confirmation of ROADMAP SC2, and every plan 82-04 SUMMARY explicitly flags it as carried-over and unconfirmed rather than closed.
7. **Unchanged-document and stopped-server apply paths still work.** UAT: pass.
8. **New this round — lightbulb popup no longer throws, and Settings › Editor › Intentions renders the shipped resources.** This is plan 82-04's own deliverable. Its packaging (jar contents) and source wiring are proven here by direct inspection, but a human has not yet re-run the Alt+Enter / arrow-onto-composer-entry / Settings-page check that G-82-6 was filed against.

## Gaps Summary

No automated gaps remain. G-82-6 (the lightbulb intention-preview `PluginException`) is closed: verified independently in this round by reading every new resource file and the three modified intention classes, re-running both new test classes fresh, re-running the whole composer package and the whole IntelliJ module fresh, building the plugin fresh and inspecting the composed jar's contents directly (not trusted from the SUMMARY's own jar-inspection claim), and re-running the planning-identifier scan over the full phase diff. All four plans' requirement claims (COMP-01 fully in 82-01/82-02, COMP-02 in 82-03 with its UAT-blocking packaging defect closed by 82-04) are accounted for against `REQUIREMENTS.md` with no orphans.

The phase stays `human_needed` rather than `passed` for the same structural reason as the prior round — C-01 deliberately keeps the platform off the automated test classpath — plus one addition: UAT test 6, the live confirmation of the phase's second success criterion (COMP-02 / the stale-edit abort), has never actually completed successfully. It was blocked by G-82-6 in the round this report re-verifies past, and now needs a clean re-run. Closing G-82-6 removed the blocker; it did not, and could not by itself, supply the human confirmation UAT test 6 exists to produce. A maintainer should re-run UAT test 6 (and, opportunistically, the new lightbulb-popup check) before treating Phase 82 as fully human-confirmed.

---

*Verified: 2026-09-05T21:34:41Z*
*Verifier: Claude (gsd-verifier)*
