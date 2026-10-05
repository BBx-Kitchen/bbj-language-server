---
phase: 128-intellij-denum
verified: 2026-10-04T06:15:00Z
status: passed
score: 3/3 roadmap truths verified (plus 7 plan truths, see table); 0 failed
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Smoke the final plugin zip once (it was rebuilt from the final tree after the hand check approval). Install it, open a line-numbered BBj file, choose Tools > Denumber BBj Program, then Undo; reopen/undo to bring the banner back and click its Denumber link; click Denumber twice quickly. Afterwards read idea.log."
    expected: "Menu action and banner both denumber as one undoable edit, banner disappears and returns after Undo, the second quick click is answered by the server's 'already running' message, no 'Denumber failed' balloon on a healthy server, and idea.log has no 'Unsupported notification method' line for bbj/denumDiagnostics or bbj/showDenumDiagnostics and no editor-notification-provider exception."
    why_human: "Commits 9a09f46d, bd607fa8 and 5bf76fb5 (review fixes WR-01..03) changed the request path and the banner refresh queue AFTER the user approved the hand check, and the step-14 idea.log lines were never pasted. Source guards and unit tests cover the changes, but no live IDE run covers the final tree."
---

# Phase 128: IntelliJ Denumber Verification Report

**Phase Goal:** An IntelliJ user can denumber a line-numbered BBj program through the shared language server, from a menu action or from a banner on the file. This does not depend on the formatting verdict.
**Verified:** 2026-10-04
**Status:** human_needed (all goal truths verified; one narrow post-approval regression smoke recommended)
**Re-verification:** No, initial verification (no previous VERIFICATION.md)
**Phase base:** 49544f09, HEAD 389c6c21

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | "Denumber BBj Program" is in the Tools menu and editor context menu for BBj files and denumbers the open buffer through `bbj/denum` as one undoable edit | VERIFIED | `plugin.xml` lines 127-133: action `bbj.denumber`, text "Denumber BBj Program", `add-to-group` `EditorPopupMenu` and `ToolsMenu`, both `anchor="after" relative-to-action="bbj.compile"`; no `keyboard-shortcut`, no Project View group. `BbjDenumberAction.update` shows it only for the BBj program file type (`BbjFileVisibility.isBbjProgramFileTypeName`, so `config.bbx` stays hidden) and enables it by `LineNumbering.isLineNumberedSource`. `actionPerformed` -> `denumber()` sends `server.denum(new DenumParams(uri))` from a `Task.Backgroundable`. `@JsonRequest("bbj/denum")` on `BbjComposerServer`. Server side (`bbj-denum-service.ts`) applies via `messenger.applyEdit` -> `workspace/applyEdit`; the client never saves (grep for `saveDocument(`/`saveAllDocuments(` in the action: none; pinned by `theClientNeverSavesTheFileOrReadsTheResult`). Single-undo is platform behaviour of LSP4IJ's applyEdit; it was observed by the user in the hand check (below), not by an automated test. |
| SC2 | Opening a line-numbered BBj program shows a banner offering Denumber; choosing it denumbers the buffer and the banner goes away; an unnumbered file shows no banner | VERIFIED | `BbjLineNumberedNotificationProvider` (extends the shared base, file-type guard) reads the document under `ReadAction`, returns `null` unless `LineNumbering.isLineNumberedSource`, else an Info panel with exactly one `Denumber` label calling `BbjDenumberAction.denumber(project, file)`. No cached verdict, so the banner is recomputed on each platform call. `BbjLineNumberedBannerRefresher` (registered `projectService`, created lazily by the provider) has one document listener, filters to BBj program files, and refreshes only that file's banner through `DirtyFileCoalescer` (300 ms); provider registered once as `editorNotificationProvider`. Appearing/disappearing/return-after-Undo is runtime behaviour: confirmed by the user's approved hand check, plus unit coverage of the debounce (`DirtyFileCoalescerTest`, 10 cases) and source guards. |
| SC3 | `ComposerRequestContractTest` lists `bbj/denum`, and the IntelliJ suite passes under `./gradlew test` | VERIFIED | Test lists `"bbj/denum"` (line 68) among 17 names and reads `denum-command.ts` (line 48, `DENUM_COMMAND_TS`); the reflective test compares it against the interface. I re-ran `./gradlew cleanTest test` in the foreground: BUILD SUCCESSFUL, XML reports written 06:09:27 (fresh), summed `tests=1263 failures=0 errors=0 skipped=0`. |

**Score:** 3/3 roadmap truths verified; 0 behavior-unverified (SC1/SC2 behavioural parts rest on the user-approved hand check, recorded as such).

### Plan-level truths (128-01 must_haves, merged; none reduce the roadmap scope)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P1 | Menu placement after Compile in both groups, no shortcut, no Project View entry | VERIFIED | `plugin.xml` 127-133; `pluginXmlPlacesTheActionAfterCompileInBothMenusWithoutAKeystrokeOrProjectViewEntry`. `bbj.compile` is itself `anchor="last"` in ToolsMenu and after `bbj.runDwc` in the popup, so "after compile" holds. |
| P2 | Unnumbered: visible but disabled; no editor / non-BBj / config.bbx: hidden | VERIFIED (greyed vs hidden in the editor popup is a platform rendering detail, flagged in the plan as cosmetic) | `BbjDenumberAction.update` lines 60-67. |
| P3 | One `bbj/denum` with the editor file's URI, background task, no client save | VERIFIED | Action lines 85-130; only two callers of `denum(` exist in main sources: the action and (via `denumber()`) the banner link. |
| P4 | Client words no outcome; only a transport failure shows one escaped "Denumber failed" balloon | VERIFIED | Result of `request.get(...)` discarded; `failed()` uses `StringUtil.escapeXmlEntities`; WR-01 adds the `CancellationException` branch. Pinned by `onlyATransportFailureShowsANotification`, `aCancelledRequestIsReportedAsATransportFailureNotLeftToEscape`. |
| P5 | `LineNumbering` matches the TS rule | VERIFIED | Compared line by line with `bbj-vscode/src/line-numbering.ts`: `^\s*\d+[ \t]+\S`, skip blank lines, 20-line cap, 3-line minimum, ASCII digits, JS whitespace set. `LineNumberingTest` (19 cases) + `LineNumberingContractTest` drift guard pass in the fresh run. |
| P6 | Real `bbj/denum` answer (applied edit, out-of-int-range position, diagnostics) parses via LSP4J Gson | VERIFIED | `DenumModels.DenumResult.edits` is an opaque `JsonElement`; `DenumModelsJsonBoundaryTest` passes. |
| P7 | Quick double click: server's in-flight guard answers the second, client adds nothing (backstop truth) | VERIFIED as design (server side) / human confirmation recommended | `bbj-denum-service.ts` lines 233, 309-313: `running` Set keyed by document uri returns `DENUM_IN_PROGRESS_MESSAGE` = "Denumbering is already running for this file." Client adds nothing (review WR-04 accepted as design). Behavioural proof of the live double click is not covered by an IntelliJ test; it is part of the human smoke item. |

### Prohibitions (judgment-tier, from 128-01 `prohibitions`, status unverified / flagged)

These are non-authoritative judge verdicts, flagged `unverified-prohibition - human review recommended`. None is absorbed into a silent pass.

| Prohibition | Judge verdict | Evidence |
|-------------|---------------|----------|
| Never save/write the file from the client | Not violated (non-authoritative) | no `save*` calls in `BbjDenumberAction`; source guard pins zero `saveDocument(`/`saveAllDocuments(`. |
| Never send `bbj/denum` without the user choosing the action or banner link | Not violated (non-authoritative) | only callers are `actionPerformed` and the banner label's click; the refresher only calls `EditorNotifications.updateNotifications`. |
| Client never words a DENUM outcome | Not violated (non-authoritative) | result discarded; only a transport-failure balloon exists on the client; DENUM diagnostics are printed by the console presenter from server payload, as plain text. |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `denum/DenumModels.java` | VERIFIED | `DenumResult` with opaque `edits`; also `DenumDiagnosticsParams`/`DenumDiagnostic` (128-02). |
| `composer/BbjComposerServer.java` | VERIFIED | `@JsonRequest("bbj/denum") CompletableFuture<DenumResult> denum(DenumParams)`. |
| `actions/BbjDenumberAction.java` | VERIFIED | substantive, wired (plugin.xml, banner), data flows to the server request. |
| `denum/LineNumbering.java` | VERIFIED | used by the action and the provider. |
| `plugin.xml` action, provider, project service | VERIFIED | all three registered once. |
| `BbjLineNumberedNotificationProvider`, `DirtyFileCoalescer`, `BbjLineNumberedBannerRefresher` | VERIFIED | wired as above; classes confirmed inside the built jar by 128-04. |
| `DenumDiagnosticsPresenter` + `BbjLanguageClient` handlers | VERIFIED | extra scope from 128-02 (diagnostics console), covered by 35 tests. |
| Tests listed in 128-01 `files_modified` | VERIFIED | all present, all in the fresh 1263-test run. |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| action -> `server.denum(new DenumParams(` | `BbjComposerServer` | WIRED (line 111) |
| `BbjComposerServer` `@JsonRequest("bbj/denum")` | `denum-command.ts` `DENUM_REQUEST_METHOD` | WIRED, pinned by `ComposerRequestContractTest` |
| `plugin.xml` `bbj.denumber` | action class, `relative-to-action="bbj.compile"` | WIRED |
| action `update` -> `LineNumbering.isLineNumberedSource(` | `LineNumbering` | WIRED (line 66) |
| banner label -> `BbjDenumberAction.denumber` | shared path | WIRED (provider line 53) |
| provider -> refresher service | lazy `getInstance(project)` | WIRED (line 39) |

### Data-Flow Trace (Level 4)

The request carries the real editor file URI (`toNioPath().toUri()`, fallback `getUrl()`); the server looks the open document up by normalised URI and applies the edit through `workspace/applyEdit`. The banner verdict comes from the live document text. No hardcoded or static data on either path. FLOWING.

### Behavioral Spot-Checks and Probes

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Whole IntelliJ suite | `cd bbj-intellij && ./gradlew cleanTest test` (foreground) | BUILD SUCCESSFUL; 1263 tests, 0 failures, 0 errors, 0 skipped; fresh XML timestamps | PASS |
| Contract test lists `bbj/denum` | included in the suite above (`ComposerRequestContractTest`) | passes | PASS |
| Probes | none declared by the phase plans | n/a | SKIPPED |
| Live IDE round trip | not runnable here (no IDE) | see Human Verification | SKIP |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| IJF-05 | 128-01 (declared), also claimed by 128-02/03/04 | "Denumber BBj Program" action in Tools and editor menus backed by `bbj/denum`, one undoable edit, `ComposerRequestContractTest` updated | SATISFIED | SC1, SC3, P1-P7 above; REQUIREMENTS.md already ticks it `[x]` / Complete. |
| IJF-06 | 128-04 (and exercised by 128-03) | editor banner on line-numbered programs offering Denumber | SATISFIED | SC2 above; REQUIREMENTS.md `[x]` / Complete. |

Both IDs from the phase are accounted for in REQUIREMENTS.md (lines 70-71, 138-139). Orphaned requirements mapped to Phase 128: none.

### Anti-Patterns Found

| Scope | Pattern | Severity | Impact |
|-------|---------|----------|--------|
| added lines in `bbj-intellij/src` and `bbj-vscode/src` since 49544f09 | TBD/FIXME/XXX/TODO/HACK | none found | clean |
| `BbjDenumberAction` | repeated clicks send overlapping requests (review WR-04) | Info | accepted design: the server's `running` guard answers the second request; plan truth P7 |
| `DenumModels` Javadoc (IN-01), refresher scope across projects (IN-02), third URI-fallback copy (IN-03) | review Info items, left unfixed by instruction | Info | no goal impact |

### Deviations and Evidence Gaps (recorded, not hidden)

1. **Scope deviation (user-approved):** commit `acb1912a` changed `bbj-vscode/src/language/bbj-notifications.ts`, `java-class-refresh.ts` and two test files, fixing a language-server crash (a cancelled `window/showMessageRequest` from closing a balloon terminated the server). This intentionally breaks 128-04's "only bbj-intellij/ and .planning/ changed" scope check. It is a bug fix found by the hand check; the diff is confined to those four files and is reviewed sound in 128-REVIEW.md. Not a goal failure. WR-01 also touched `BbjCompileAction.java` (and its guard test), outside the Denumber files but inside `bbj-intellij/`.
2. **Hand check (Plan 04 Task 3):** approved by the user on the rebuilt zip (1038423 bytes, steps 1-14). The step-14 `idea.log` lines were NOT provided, so the claim "no `Unsupported notification method` line" rests on the user's approval only; no log evidence is invented here. A `Denumber run failed: not-open` server log line seen in the first (crashing) session was never attributed to a step.
3. **Post-approval changes:** review fixes WR-01 (`CancellationException`), WR-02 (single 60 s deadline, cancel on timeout), WR-03 (coalescer keeps draining on a throwing refresh) landed after the approval; the zip was rebuilt afterwards but the fixes were not hand-checked in a live IDE. They are covered by source guards and two new behavioural coalescer tests, all green in my fresh run. WR-04 left as documented design.

### Human Verification Required

#### 1. Smoke the final plugin zip once

**Test:** Install the zip built from the final tree. Open a line-numbered BBj file; use Tools > Denumber BBj Program; Undo; click the banner's Denumber link; click Denumber twice quickly; then read `idea.log`.
**Expected:** One undoable edit per run, banner disappears after the edit and returns after Undo, the quick second click gets the server's "already running" message, no "Denumber failed" balloon on a healthy server, and `idea.log` shows no "Unsupported notification method" for `bbj/denumDiagnostics` / `bbj/showDenumDiagnostics` and no notification-provider exception.
**Why human:** The review fixes post-date the user's approval and the step-14 log evidence was never captured; only a live IDE shows the final tree's behaviour. This is a narrow regression smoke, not a re-run of the 15-step check. If the user judges their earlier approval sufficient, the phase can be accepted as passed with this recorded.

### Gaps Summary

No goal-blocking gaps. All three roadmap success criteria and both requirements (IJF-05, IJF-06) are satisfied in the code, the IntelliJ suite is green on a fresh foreground run (1263/0), and the shared-server contract is pinned. The status is `human_needed` only because the live-IDE behaviour of the final tree (after review fixes) and the step-14 log lines have no recorded evidence, not because anything is observed to be broken.

---

_Verified: 2026-10-04_
_Verifier: Claude (gsd-verifier)_
