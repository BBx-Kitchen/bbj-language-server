---
phase: 82-composer-robustness
verified: 2026-09-05T20:35:00Z
status: human_needed
score: 8/8 must-have truths verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/8
  gaps_closed:
    - "Planning identifiers (plan number '82-02', decision refs 'D-04'/'D-06'/'C-01', and the phrase 'literal COMP-01 acceptance criterion') removed from composer test source comments and assertion messages in commit d7e32cf9 ('fix(82-02): drop planning identifiers from composer test comments and messages'). Verified by re-running the scan pattern `\\b(8[0-9]-0[0-9]|D-[0-9]{2}|C-0[0-9]|COMP-0[12]|T-82[-A-Z0-9]*|SEC-[0-9]+)\\b` against every file in bbj-intellij/src/{main,test}/java/com/basis/bbj/intellij/composer/ — zero matches — and by re-running the composer test package fresh (69 tests, 0 failures, 0 errors)."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Server-stopped composer invocation shows one information balloon."
    expected: "Stop the language server, invoke a composer from the editor popup or lightbulb intention: exactly one information balloon in the \"BBj Language Server\" group reading \"The BBj language server is not ready yet. Open a BBj file and try again.\" — a balloon, not a modal."
    why_human: "NotificationGroupManager and balloon rendering need a running IDE; C-01 keeps the platform off the plain-JUnit-5 test classpath."
  - test: "Server killed mid-invocation shows one error balloon plus a console line."
    expected: "One error balloon naming the composer and the failure detail, and the same text appears in the language-server console tool window."
    why_human: "Same as above — balloon and console rendering need a running IDE and a live language-server process."
  - test: "Refresh failure disables OK and rate-limits the balloon."
    expected: "Open a composer dialog, stop the LS, type in a field: the summary/flags-summary label reads \"Preview unavailable — <reason>\", OK becomes disabled, and exactly one balloon appears however long typing continues; restarting the LS and typing again restores both the label and OK."
    why_human: "DialogWrapper.setOKActionEnabled and the notification platform need a running IDE."
  - test: "All three composers name themselves correctly and rate-limit per dialog session."
    expected: "Repeat the refresh-failure check for MSGBOX, addWindow and addChildWindow — each balloon names its own composer; closing and reopening a dialog after a failure allows a second balloon."
    why_human: "Same as above — DialogWrapper and the notification platform need a running IDE."
  - test: "Rapid typing never flickers to a stale preview."
    expected: "Type rapidly in a composer dialog with the language server running; the statement, summaries and schematic always track the newest keystroke, with no flicker back to an older preview."
    why_human: "Real Swing/UI timing under a live language server cannot be reproduced by a JUnit double."
  - test: "Stale-edit abort in a live split-editor scenario."
    expected: "Open a composer on a MSGBOX call, edit that same line in another split editor while the dialog is open, press OK: a warning balloon appears saying nothing was changed, the document is byte-for-byte untouched, and the \"Reopen composer\" action opens the composer again against the current text. Repeat for addWindow/addChildWindow, and for a line inserted above the call (same abort, accepted as the consequence of not relocating a moved call)."
    why_human: "WriteCommandAction's real document integration, the modal dialog, and the balloon action need a running IDE."
  - test: "Unchanged-document and stopped-server apply paths still work."
    expected: "Open a composer, change nothing, press OK: the edit applies exactly as before and a single Undo reverts it as one operation. Open a composer, stop the language server, then press OK: an error balloon reports the failed request and the document is untouched."
    why_human: "WriteCommandAction's real document integration and the notification platform need a running IDE."
---

# Phase 82: Composer Robustness Verification Report

**Phase Goal:** Composer dialogs surface failures visibly and never apply an edit against document state that changed while the dialog was open.
**Verified:** 2026-09-05
**Status:** human_needed
**Re-verification:** Yes — after gap closure (commit `d7e32cf9` removed the planning-identifier leak into composer test source found by the initial pass)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every stage of the composer launch chain (server resolution, catalogs, decodeCall) surfaces a failure as exactly one user-visible notice; a null stage is `NOT_READY`, a thrown exception is `REQUEST_FAILED`, a 30s-bounded hang is also `REQUEST_FAILED` (ROADMAP SC1, COMP-01, #538). | ✓ VERIFIED | `ComposerFlow.launch()` composes `serverFuture -> composerCatalogs() -> decodeCall` with `thenCompose` and terminates with exactly one `handle()` (`ComposerFlow.java:60-89`). `ComposerFlowTest` (13 tests, 0 failures) exercises a failed catalogs request, a failed decode request, null server, null catalogs, a never-completing request bounded at 50ms/30s, the happy path, and a `CompletionException`-wrapped failure. `ComposerLauncherChainSourceGuardTest` (10 tests) pins that `ComposerLauncher.java` no longer contains `thenAccept(`/`thenCompose(` and that the modal `Messages.showInfoMessage` path is gone. |
| 2 | The nested three-level continuation pyramid in `ComposerLauncher.launch()` is gone; no future returned by an LSP4IJ proxy call is left unobserved in the launcher. | ✓ VERIFIED | Read `ComposerLauncher.java` in full: `launch()` (lines 59-85) makes exactly three `flow.launch(...)` calls, one per `Kind`, with no nested `thenAccept`/`thenCompose`. Grep confirms `thenAccept(`/`thenCompose(` count 0 in the file (comments filtered). |
| 3 | Every notice renders as a balloon in the existing "BBj Language Server" notification group (information/warning/error), never a modal dialog; a `REQUEST_FAILED` notice is also mirrored to the LS console. | ✓ VERIFIED | `ComposerNoticeRenderer.render()` (`ComposerNoticeRenderer.java:33-62`) builds a `Notification` from `NotificationGroupManager...getNotificationGroup("BBj Language Server")`, maps `Severity` to `NotificationType` 1:1, attaches a "Reopen composer" action only for `STALE_DOCUMENT`, and calls `BbjServerService.getInstance(project).logToConsole(...)` only for `ERROR` severity. `notifyNotReady`'s modal is deleted; grep confirms zero `Messages.showInfoMessage` occurrences and no `com.intellij.openapi.ui.Messages` import remain in `ComposerLauncher.java`. |
| 4 | When a composer dialog's `refresh()` preview fails, times out, or completes with `null` while its sequence is current, the dialog shows "Preview unavailable — `<reason>`" and disables OK; a superseded outcome of either kind is discarded identically; at most one balloon is raised per dialog session (COMP-01, D-05). | ✓ VERIFIED | All three dialogs route `refresh()` through `flow.observe(...)` with `ComposerFlow.REFRESH_TIMEOUT_MILLIS` (grepped: `flow.observe(` present once each in `MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java`). Each has exactly one `Preview unavailable — ` label write and one `setOKActionEnabled(false)`, sequence-checked via `mySeq == seq.get()` on both success and failure paths, and a `ComposerFlow.once(...)`-wrapped notifier. `ComposerFlowTest` Tests 8-13 (observe/once behaviour, including 8-thread concurrent one-shot) and `ComposerDialogRefreshSourceGuardTest` (9 tests, data-driven across all three dialogs) both pass. |
| 5 | If the document changes while a composer dialog is open, re-decoding the call at the captured offsets after the dialog closes detects the mismatch, aborts the edit, and notifies the user instead of rewriting whatever text now occupies the range (ROADMAP SC2, COMP-02, #567). | ✓ VERIFIED | `StaleEditGuard.applyIfUnchanged()` (`StaleEditGuard.java:76-108`) re-reads the current line text and modification stamp, re-runs the caller-supplied `<kind>DecodeCall`, and writes only when `sameDecode.test(capturedDecode, fresh)` is true; a mismatch, null fresh decode, missing/out-of-range line, or a re-decode failure/timeout all notify and skip the write. `ComposerLauncher.openMsgbox`/`applyHexEdit` route all three edit-in-place apply sites through the guard (`applyIfUnchanged(` occurs exactly twice, `replaceString(` exactly twice, each preceded by its guard call). `StaleEditGuardTest` (11 tests) exercises a mutated line, a line inserted above the call, an unchanged document, a captured line beyond the current count, a failing/never-completing re-decode, a stamp change between re-decode and write, a null fresh decode, and the window apply path's descending-offset operation order — all pass. |
| 6 | Match means the whole decode result is equal (found, edit payload, `initial`, `trailingArgs`), not just the edit ranges; array-valued ranges are compared element-wise; nulls are handled on both sides (D-08). | ✓ VERIFIED | `DecodeEquality.sameMsgbox/sameAddWindow/sameAddChildWindow` compare `found`, the edit payload, `initial`'s full field set, and `trailingArgs`, using `Objects.equals` and `Arrays.equals` (never `==`) for arrays. `DecodeEqualityTest` (7 tests) proves identical-value matching (not reference), a ranges-identical-but-`initial`-differs mismatch, per-field mutation breaking the match, null handling on either side, element-wise array comparison, and addChildWindow parity with addWindow. |
| 7 | The modification-stamp is re-checked as the first statement inside the write command, closing the async window between the re-decode completing and the write starting; the right-to-left operation order for the hex-edit paths is unchanged. | ✓ VERIFIED | `StaleEditGuard.applyIfUnchanged`'s write body's first statement compares `view.modificationStamp() != snapshotStamp` before running `applyEdit` (`StaleEditGuard.java:98-104`). `StaleEditGuardTest#aStampChangedBetweenTheReDecodeAndTheWriteAbortsInsideTheWriteCommand` and `#theWindowApplyPathEmitsItsOperationsFromHighestOffsetDownWhenTheDecodeMatches` both pass; `ComposerLauncher.java` still contains `Comparator.comparingInt((Op o) -> o.start).reversed()` unchanged. |
| 8 | The create path (`insertAtCaret`) stays outside both the notice/flow seam's launch chain and the stale-edit guard; server-side `bbj/composer/*` handlers and `composer-commands.ts` are untouched by the whole phase. | ✓ VERIFIED | `insertAtCaret` (`ComposerLauncher.java:253-262`) is unchanged: a plain `WriteCommandAction` inserting at the live caret offset, with no guard or flow-seam call. `git diff --stat` against `bbj-vscode/`, `plugin.xml` and `build.gradle.kts` is empty across the whole phase diff. `ComposerApplyGuardSourceGuardTest` pins `insertString(` occurring exactly once and not between any `applyIfUnchanged(`/`replaceString(` pair. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/.../composer/ComposerNotices.java` | Reason/Severity/Notice + 3 factories, no IntelliJ import | ✓ VERIFIED | Exists, matches spec exactly; `grep -c 'import com.intellij'` = 0 |
| `bbj-intellij/.../composer/ComposerFlow.java` | `launch()`, `observe()`, `once()`, `LAUNCH_TIMEOUT_MILLIS`, `REFRESH_TIMEOUT_MILLIS` | ✓ VERIFIED | All present; no IntelliJ import; single terminal `handle()` per method |
| `bbj-intellij/.../composer/ComposerNoticeRenderer.java` | Balloon + console renderer | ✓ VERIFIED | Renders in "BBj Language Server" group, all 3 severities, "Reopen composer" action, console mirror on ERROR |
| `bbj-intellij/.../composer/ComposerLauncher.java` | Thin adapter over flow seam; guarded apply sites | ✓ VERIFIED | `flow.launch(` x3, `applyIfUnchanged(` x2, `replaceString(` x2 each preceded by a guard call |
| `bbj-intellij/.../composer/MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java` | Observed refresh, unavailable label, OK gating, one-shot balloon | ✓ VERIFIED | All three grepped and confirmed identical wiring shape |
| `bbj-intellij/.../composer/StaleEditGuard.java` | `DocumentView`, `WriteGate`, `applyIfUnchanged` | ✓ VERIFIED | Matches spec; stamp re-check inside write command |
| `bbj-intellij/.../composer/DecodeEquality.java` | `sameMsgbox`/`sameAddWindow`/`sameAddChildWindow` | ✓ VERIFIED | Field-wise, null-safe, `Arrays.equals` for int[] |
| 7 new test classes under `bbj-intellij/src/test/.../composer/` | Behavioural + source-guard coverage | ✓ VERIFIED | All 7 files exist; 69 composer-package tests, 0 failures; test-method counts match plan exactly (13, 9, 10, 9, 11, 7, 10) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `ComposerLauncher.launch()` | `ComposerFlow.launch()` | `flow.launch(` | ✓ WIRED | 3 call sites, one per `Kind` |
| `ComposerFlow` terminal handler | `ComposerNotices` factories | `ComposerNotices.notReady/requestFailed(` | ✓ WIRED | Confirmed in `handle()` body |
| `ComposerLauncher`/dialogs | `ComposerNoticeRenderer.render(` | notifier lambda | ✓ WIRED | Present in launcher and all 3 apply-site guard constructions |
| `ComposerNoticeRenderer` | `BbjServerService.logToConsole(` | ERROR-severity mirror | ✓ WIRED | Confirmed at `ComposerNoticeRenderer.java:59` |
| 3 dialogs' `refresh()` | `ComposerFlow.observe(` | preview request | ✓ WIRED | Confirmed once per dialog |
| `ComposerLauncher` apply sites | `StaleEditGuard.applyIfUnchanged(` | guarded write | ✓ WIRED | 2 call sites (MSGBOX direct, hex-edit shared by both window kinds) |
| `StaleEditGuard` | `DecodeEquality::same*` | injected comparator | ✓ WIRED | 3 distinct comparator references, one per kind |

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Composer package test suite (re-run fresh by verifier, post-`d7e32cf9`, `--rerun`) | `./gradlew test --tests 'com.basis.bbj.intellij.composer.*' --rerun` | 7 classes, 69 tests, 0 failures, 0 errors | ✓ PASS |
| Whole IntelliJ module (re-run fresh by verifier, pre-`d7e32cf9` content) | `./gradlew test` | 42 test classes, 395 tests, 0 failures, 0 errors | ✓ PASS |
| Planning-identifier scan (re-run post-`d7e32cf9`) | `grep -rnE '\b(8[0-9]-0[0-9]\|D-[0-9]{2}\|C-0[0-9]\|COMP-0[12]\|T-82[-A-Z0-9]*\|SEC-[0-9]+)\b' bbj-intellij/src/{main,test}/java/com/basis/bbj/intellij/composer/` | 0 matches | ✓ PASS |
| No IntelliJ import in plain-Java seams | `grep -c '^import com.intellij'` on ComposerFlow/ComposerNotices/StaleEditGuard/DecodeEquality | 0 for all four | ✓ PASS |
| No platform test framework | `grep -c 'TestFrameworkType\|BasePlatformTestCase' build.gradle.kts` | 0 | ✓ PASS |
| Server/VS Code side untouched | `git diff --stat -- bbj-vscode/ plugin.xml build.gradle.kts` | empty | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| COMP-01 | 82-01, 82-02 | Every composer chain (launcher + refresh) has a terminal handler producing a user-visible notification | ✓ SATISFIED | Truths 1-4 above; `ComposerFlowTest`/`ComposerNoticesTest`/`ComposerLauncherChainSourceGuardTest`/`ComposerDialogRefreshSourceGuardTest` all green |
| COMP-02 | 82-03 | Re-decode at captured offsets after dialog close; abort and notify on mismatch | ✓ SATISFIED | Truths 5-7 above; `StaleEditGuardTest`/`DecodeEqualityTest`/`ComposerApplyGuardSourceGuardTest` all green |

No orphaned requirements: REQUIREMENTS.md maps exactly COMP-01 and COMP-02 to Phase 82, and both are claimed by the plans.

### Anti-Patterns Found

None remaining. The single finding from the initial verification pass — a source `//` comment in `ComposerLauncherChainSourceGuardTest.java` (lines 147-151) naming the plan number `82-02` and decision refs `D-04`/`D-06`, plus nine `(C-01)` tokens in assertion messages across three source-guard test classes and a `"literal COMP-01 acceptance criterion"` javadoc phrase in `ComposerFlowTest.java` — was fixed in commit `d7e32cf9` ("fix(82-02): drop planning identifiers from composer test comments and messages"). Re-verified directly:
- `git show d7e32cf9` confirms every one of those occurrences was reworded to drop the identifier while keeping the substantive explanation (issue numbers `#538`/`#567` are unaffected and still present).
- A fresh scan with the coordinator-specified pattern `\b(8[0-9]-0[0-9]|D-[0-9]{2}|C-0[0-9]|COMP-0[12]|T-82[-A-Z0-9]*|SEC-[0-9]+)\b` against every file in `bbj-intellij/src/{main,test}/java/com/basis/bbj/intellij/composer/` returns zero matches.
- The composer test package re-run fresh (`--rerun`) post-fix: 7 classes, 69 tests, 0 failures, 0 errors — no regression from the wording-only change.

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any composer file. No hardcoded-empty stub patterns found; every rendered value (notice title/body/severity, dialog label text, edit text) is computed from real inputs, not static literals.

### Human Verification Required

All 8 must-have truths are verified and the phase's automated regression suite is green with no outstanding gaps. The following 7 items are recorded across the three plans' SUMMARYs (D-12) as requiring a live IDE — `DialogWrapper`, the notification platform, and `WriteCommandAction`'s real editor integration are deliberately kept off the plain-JUnit-5 test classpath per C-01, so these can only be confirmed by a human against a plugin built from the merged branch:

1. **Server-stopped composer invocation shows one information balloon.** Stop the language server, invoke a composer from the editor popup or lightbulb intention. Expected: exactly one information balloon in the "BBj Language Server" group reading "The BBj language server is not ready yet. Open a BBj file and try again." — a balloon, not a modal. Why human: `NotificationGroupManager`/balloon rendering needs a running IDE.
2. **Server killed mid-invocation shows one error balloon + console line.** Kill the LS process after invoking a composer. Expected: one error balloon naming the composer and the failure detail, and the same text in the LS console tool window. Why human: same as above.
3. **Refresh failure disables OK and rate-limits the balloon.** Open a composer dialog, stop the LS, type in a field. Expected: "Preview unavailable — `<reason>`", OK disabled, exactly one balloon however long typing continues; restarting the LS and typing again restores both. Why human: `DialogWrapper.setOKActionEnabled` and the notification platform need the IDE.
4. **All three composers name themselves correctly and rate-limit per session.** Repeat item 3 for MSGBOX, addWindow, addChildWindow; close/reopen a dialog after a failure and confirm a second balloon is allowed. Why human: same as above.
5. **Rapid typing never flickers to a stale preview.** Type rapidly with the LS running; confirm statement/summaries/schematic always track the newest keystroke. Why human: real Swing timing under a live LS.
6. **Stale-edit abort in a live split-editor scenario.** Open a composer on a MSGBOX call, edit that line in another split editor while the dialog is open, press OK. Expected: warning balloon, document byte-for-byte untouched, "Reopen composer" action works. Repeat for addWindow/addChildWindow and for a line inserted above the call. Why human: `WriteCommandAction`'s real document integration and the balloon action need the IDE.
7. **Unchanged-document and stopped-server apply paths.** Open a composer, change nothing, press OK — edit applies exactly as before, single Undo reverts it. Open a composer, stop the LS, press OK — error balloon, document untouched. Why human: same as above.

## Gaps Summary

No gaps remain. Both roadmap success criteria are fully met and independently reproduced by this verifier: every composer chain (launcher and all three dialogs' `refresh()`) has a terminal handler that produces exactly one user-visible balloon on failure (COMP-01), and every edit-in-place apply path re-decodes the captured line, compares the whole decode result, and aborts with a notice on any mismatch — including the async window between re-decode and write (COMP-02). The whole IntelliJ module (395 tests) and the composer package specifically (69 tests) are green.

The one process/hygiene gap identified in the initial verification pass — planning identifiers (`82-02`, `D-04`, `D-06`, `C-01`, `COMP-01`) leaking into composer test source comments and assertion messages, contradicting the plans' own explicit "MUST NOT write a planning identifier into any source or test comment" prohibition — was closed in commit `d7e32cf9`, verified above by direct diff inspection, a fresh zero-match scan, and a fresh green test run.

Status is `human_needed` rather than `passed` because 7 D-12 items (balloon rendering, dialog OK-gating under a live IDE, and the stale-edit warning/Undo/reopen flow against a real editor) were deliberately deferred to a live-IDE UAT pass by all three plans' own design (C-01 keeps `DialogWrapper` and the notification platform off the automated test classpath) — not because any automated check failed.

---

*Verified: 2026-09-05*
*Verifier: Claude (gsd-verifier)*
