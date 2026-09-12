---
phase: 90-composer-robustness-intellij-composer-performance
verified: 2026-09-12T22:15:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "In IntelliJ, against a plugin zip rebuilt from the final tree: type a burst in the MSGBOX, addWindow and addChildWindow dialogs and watch OK and the generated statement; type '\"10\"' into a numeric field; open a composer twice in the same session, then Restart Language Server and open it a third time."
    expected: "The preview updates once after typing stops (not once per keystroke), with OK re-enabled only then; the malformed field shows a red label under it and OK stays disabled until fixed; the second open is noticeably faster than the first; the composer still opens normally (no error balloon) after a language-server restart."
    why_human: "Swing timing, modal dialog layout and a live LSP4IJ server restart all need a running IntelliJ, which this devcontainer cannot drive headlessly. Staged as an end-of-phase human check in plan 90-08's <verify> block (QA rows IntelliJ 28-30)."
  - test: "In VS Code, against the reinstalled VSIX: click the cue / use the context menu / palette on `x = MSGBOX(`; edit the line while the panel is open; and try to Insert malformed addWindow/addChildWindow field text."
    expected: "The cue and context menu open `Complete MSGBOX call` and Insert yields one complete call; an edit made while the panel is open causes Insert to refuse with 'The MSGBOX() call changed since the composer opened; nothing was applied.'; a malformed addWindow/addChildWindow field shows its message under the field with a red border and disables Insert."
    why_human: "The cue click, the context menu, the webview panel, and a live edit made beside the non-modal panel all need a running VS Code window. Staged as an end-of-phase human check in plan 90-08's <verify> block (QA rows VS Code 22-23)."
---

# Phase 90: Composer Robustness / IntelliJ Composer Performance Verification Report

**Phase Goal:** The four existing VS Code composers reject invalid input before applying it and never leak resources across repeated use; the three IntelliJ composer dialogs debounce input and reuse cached handles instead of re-resolving them on every open.
**Verified:** 2026-09-12T22:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Malformed free-text in addWindow/addChildWindow is rejected before insert, gated on the same shared `valid` field MSGBOX already returns | ✓ VERIFIED | `bbj-vscode/src/addwindow-composer.ts:269` exports `validateNumericField`; `AddWindowPreview`/`AddChildWindowPreview` carry per-field error strings + `valid`, computed with the same `validateBbjExpression`/`validateStringField` MSGBOX uses. Both webviews render inline errors and disable Insert; extension-side `if (!r.valid) break;` guard present in `addwindow-composer-webview.ts:130` and `addchildwindow-composer-webview.ts:135` (also `msgbox-composer-webview.ts:154`, `cvs-composer-webview.ts:128`, confirming the shared pattern). IntelliJ mirrors this: `AddWindowComposerDialog.java:323` and `AddChildWindowComposerDialog.java:337` both call `setOKActionEnabled(p.valid)` (zero `setOKActionEnabled(true)` remaining). 203/203 targeted vitest tests pass; IntelliJ composer package green (846/846 whole-suite, confirmed via on-disk JUnit XML, see below). |
| 2 | Editing the document during the MSGBOX QuickPick wizard never corrupts unrelated text — target re-resolved immediately before the edit, edit aborts on mismatch | ✓ VERIFIED | `bbj-vscode/src/msgbox-composer-ui.ts`: `captureComposeArgTarget` (line 148) captures the target before the wizard opens; the picker re-checks `msgboxCallStillMatches` immediately before `editor.edit` (line 210) and aborts with `MSGBOX_STALE_CALL_TEXT` on any mismatch. `msgboxCallStillMatches` (`msgbox-composer-webview.ts:81`) is span-exact (slice compare + `findMsgboxCalls` re-locate). IntelliJ: `DecodeEquality.sameMsgbox` compares `incomplete` (`DecodeEquality.java:66,298`) so a grown/changed unfinished call also aborts the guarded write. #532 regression suite (7 named cases) passes. |
| 3 | Opening/closing any composer repeatedly leaves no leaked message-handler listeners | ✓ VERIFIED | `bbj-vscode/src/webview-panel-lifecycle.ts` exports `registerPanelMessageHandler`, ties the subscription to `panel.onDidDispose`. All six panel modules (msgbox, addwindow, addchildwindow, cvs, setopts, setopts-tristate) call it exactly once each; a source grep confirms zero remaining direct `panel.webview.onDidReceiveMessage(...)` calls outside `webview-panel-lifecycle.ts`. Source-discovered lifecycle test finds ≥6 panel modules and exercises open-then-dispose on each. |
| 4 | Typing quickly in an IntelliJ composer dialog produces one preview round trip per settle point via the existing Scheduler/Alarm seam, not a new ad hoc Alarm | ✓ VERIFIED | `MsgboxComposerDialog`, `AddWindowComposerDialog`, `AddChildWindowComposerDialog` each declare exactly one `new AlarmScheduler(getDisposable())` and route every listener through `scheduleRefresh()`; zero `new Alarm(` in any composer dialog. `ComposerDialogRefreshSourceGuardTest` pins all six dialogs to one shared seam and one delay (300ms), and forbids any listener calling `refresh()` directly. Post-code-review, `scheduleRefresh()` also calls `seq.incrementAndGet()` before `previewDebouncer.trigger()` in all six debounced dialogs (confirmed by direct grep), closing the CR-01 stale-preview race the reviewer found. `PreviewDebouncerTest`'s millisecond-boundary test passes. |
| 5 | Reopening a composer in the same IntelliJ session pays no repeated server-resolution/catalog round trip; cache invalidated on language-server restart | ✓ VERIFIED | `ComposerHandleCache.java` (plain-Java, `synchronized server()`/`catalogs()`/`invalidate()`, no IntelliJ/time-source import). `BbjComposerService implements Disposable`, subscribes `BbjServerStatusListener.TOPIC → handles.invalidate()` (confirmed by grep). `ComposerFlow.launch` reads from the cache and calls `handles.invalidate()` in its one terminal failure handler. `plugin.xml` registers the service once. `ComposerHandleCacheTest` and `ComposerFlowTest` (reuse/invalidate/stale-completion/null-not-kept cases) pass. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| DISC-07 (#623) | 90-02, 90-06, 90-08 | addWindow/addChildWindow field validation, both IDEs | ✓ SATISFIED | Source verified above; REQUIREMENTS.md marks Complete |
| DISC-08 (#532) | 90-01, 90-07, 90-08 | MSGBOX wizard re-resolves target; unfinished-call completion | ✓ SATISFIED | Source verified above; REQUIREMENTS.md marks Complete |
| DISC-09 (#530) | 90-05, 90-08 | VS Code panel listener leak fix | ✓ SATISFIED | Source verified above; REQUIREMENTS.md marks Complete |
| DISC-10 (#611) | 90-04, 90-08 | IntelliJ dialog debounce | ✓ SATISFIED | Source verified above; REQUIREMENTS.md marks Complete |
| DISC-11 (#612) | 90-03, 90-08 | IntelliJ handle/catalog cache | ✓ SATISFIED | Source verified above; REQUIREMENTS.md marks Complete |

No orphaned requirements: `.planning/REQUIREMENTS.md`'s Phase 90 rows list exactly DISC-07 through DISC-11, matching every plan's `requirements:` frontmatter declaration.

### Code Review Findings (90-REVIEW.md / 90-REVIEW-FIX.md)

- **CR-01 (Critical, fixed in `d4a4666a`):** debounced dialogs could re-enable OK from a stale, pre-edit preview because `scheduleRefresh()` didn't advance the `seq` staleness counter. Verified fixed: `seq.incrementAndGet()` now present in `scheduleRefresh()` of all six debounced dialogs (Msgbox, AddWindow, AddChildWindow, Setopts, SetoptsTriState, Cvs) — confirmed by direct grep, not just SUMMARY narration. `ComposerDialogRefreshSourceGuardTest` extended with `eachDebouncedDialogsScheduleRefreshAdvancesTheSequenceNumberBeforeTriggeringTheDebouncer`; on-disk JUnit XML confirms this test exists and passed (`tests="15" failures="0"` for `ComposerDialogRefreshSourceGuardTest`).
- **IN-01 (Info, fixed in `de49f489`):** `DISC-08` planning-register id removed from `ComposerLauncher.java` and `ComposerModelsJsonBoundaryTest.java`. Verified: `grep -rn "DISC-08" bbj-intellij/src bbj-vscode/src` returns nothing.

### Anti-Patterns Found

None. Debt-marker scan (`TBD|FIXME|XXX`) over every file the phase touched returned zero matches. Register-id scan (`git diff` of the whole phase span against the plan numbers/decision ids/threat ids pattern) returned zero matches, confirming the comment-discipline fixes documented in several plan SUMMARYs actually landed and stayed clean end-to-end.

### Automated Verification Performed

- `npx vitest run` (targeted): `test/msgbox-composer.test.ts`, `test/msgbox-composer-ui.test.ts`, `test/addwindow-composer.test.ts`, `test/addchildwindow-composer.test.ts`, `test/window-composer-validation-ui.test.ts`, `test/webview-panel-lifecycle.test.ts`, `test/composer-commands.test.ts`, `test/composer-lens-command.test.ts` — 8 files, 203 tests, 0 failures.
- IntelliJ JUnit result XML on disk (post code-review-fix build, timestamped after the fix commits): 846 tests, 0 failures, 0 errors, including the new `ComposerDialogRefreshSourceGuardTest` (15/15, containing the new sequence-advance test). This matches the orchestrator's own re-run in progress and 90-REVIEW-FIX.md's recorded 846/846 result.
- Source-level wiring checks (grep) for every must-have artifact and key link listed in the eight plans' frontmatter: all confirmed present and consistent with the plans' claims (see per-truth evidence above).

### Human Verification Required

Both of the phase's own staged end-of-phase human checks (from plan 90-08's `<verify>` block) remain outstanding — they require a running IntelliJ and a running VS Code window, which this devcontainer cannot drive headlessly, and per plan 90-08 they must be run against distributables rebuilt from the final (post-code-review-fix) tree:

1. **IntelliJ live behavior** — MSGBOX/addWindow/addChildWindow dialog debounce feel, field-error rendering, and composer reopen across a language-server restart (QA rows IntelliJ 28-30).
2. **VS Code live behavior** — MSGBOX cue/context-menu completion, wizard target-safety on a live edit, and addWindow/addChildWindow field validation in the actual webview (QA rows VS Code 22-23).

These are exactly the checks plan 90-08 documented as staged for UAT — they were never claimed as automated-complete by any SUMMARY, so this is not a gap the phase failed to close; it is the expected handoff to a human tester with the rebuilt artifacts.

### Gaps Summary

No gaps. Every ROADMAP success criterion has direct, current, on-disk source evidence (not just SUMMARY narration), the post-review-fix state is confirmed by grep and by the on-disk JUnit XML (846/846), and the two remaining items are the phase's own explicitly-staged human checks, not missed work.

---

_Verified: 2026-09-12T22:15:00Z_
_Verifier: Claude (gsd-verifier)_
