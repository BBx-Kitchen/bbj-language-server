---
phase: 87-shared-setopts-composer-layer-intellij-dialog
plan: 02
subsystem: composer
tags: [intellij, swing, dialogwrapper, junit5, concurrency, setopts]

# Dependency graph
requires:
  - phase: 87-shared-setopts-composer-layer-intellij-dialog
    plan: 01
    provides: "bbj/composer/setopts/preview and decodeCall on BbjComposerServer, the SETOPTS DTO family in ComposerModels.java (SetoptsCatalogs/SetoptsBit/SetoptsByteGroup/SetoptsSelection/SetoptsSelectionBit/SetoptsPreview/SetoptsPreviewParams/SetoptsUnknownBits/SetoptsEdit/SetoptsDecodeResult), and DecodeEquality.sameSetopts"
provides:
  - "PreviewDebouncer, a plain-Java trailing-edge coalescer over the Scheduler seam for a UI-thread refresh action"
  - "SetoptsComposerDialog, a native Swing DialogWrapper: one scrollable byte-grouped catalog form, live debounced preview, getHexDigits()/getLine() getters"
  - "SetoptsComposerDialog.java as the fourth entry in ComposerDialogRefreshSourceGuardTest.DIALOG_SOURCES"
affects: [87-03-intellij-composer-action]

# Actuals (#2632)
actuals:
  tokens: 6682
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PreviewDebouncer mirrors KeystrokeDebouncer's cancel-only-my-own-pending-task idiom but debounces a UI-thread action (staleness handled downstream by the caller's sequence number) rather than a text-keyed background lookup"
    - "SetoptsComposerDialog is a structural clone of MsgboxComposerDialog/AddWindowComposerDialog: same ComposerFlow.observe/once + seq/mySeq discipline, same setOKActionEnabled(false)-before-first-refresh() ordering, same errorLabel()/labeled() helpers"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/PreviewDebouncer.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/PreviewDebouncerTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java
  modified:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java

key-decisions:
  - "PreviewDebouncer's action dispatch is a plain Runnable (no text key, no staleness check of its own) — unlike KeystrokeDebouncer, staleness is the caller's job via ComposerFlow's mySeq == seq.get() pattern, so the debouncer itself only decides when to fire"
  - "Unknown-bit callout rendered as its own dedicated one-line label ('Preserved: byte N $XX$' per entry), per 87-CONTEXT's discretion note, rather than folded into the summary text — keeps the one signal that a user's file carries options this composer doesn't model from being buried"
  - "refresh()'s own input validation (raw-hex-tail regex, mask-char printable-ASCII-single-char check) is the dialog's entire OK gate, routed through the existing previewUnavailable(reason) rather than a second disable site — SetoptsPreview carries no server-side validity flag, unlike MsgboxPreview.valid"

patterns-established:
  - "Task 2 landed the dialog's structural scaffold (layout, checkbox rendering, prefill, getters) with refresh()/previewUnavailable()/apply() as compiling stubs; Task 3 completed the request/validation path and the guard enrolment in the same wave — keeps the module compiling and green between every commit rather than red mid-plan"

requirements-completed: [DISC-04]

coverage:
  - id: D5
    description: "PreviewDebouncer collapses a burst of triggers into one dispatched action, cancelling only its own pending task (never cancelAll()), dispatched through the injected UI-thread hook rather than run inline by the scheduler"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-intellij PreviewDebouncerTest (6 tests: single trigger, coalesced burst with cancelInvocations()==2, cancelAllInvocations()==0 plus sibling-debouncer independence, dispatch-through-ui-thread-not-inline, fresh-task-after-completed-run, recorded-pending-delay)"
        status: pass
    human_judgment: false
  - id: D6
    description: "SetoptsComposerDialog renders every catalog bit under its byte-group heading in one scrollable panel in catalog order, greys bbj-annotated bits with a tooltip, and routes every input through the shared debouncer instead of refresh() directly"
    requirement: DISC-04
    verification:
      - kind: source-guard
        ref: "manual grep verification recorded in this plan's execution: exactly one `new JBScrollPane(` construction; byte-groups/bits iterated with no sort/hard-coded list; `UIUtil.getInactiveTextColor()` present and keyed on bit.bbj; `previewDebouncer.trigger()`/`previewDebouncer::trigger` at every checkbox and text-field listener site"
        status: pass
    human_judgment: false
  - id: D7
    description: "The dialog observes both the success and failure side of every preview request through ComposerFlow.observe with a sequence check on both paths, raises at most one balloon per session via ComposerFlow.once, and is fenced by the same #538 wiring guard as the other three composer dialogs"
    requirement: DISC-04
    verification:
      - kind: integration
        ref: "bbj-intellij ComposerDialogRefreshSourceGuardTest (all 10 tests, DIALOG_SOURCES extended to 4 entries with SetoptsComposerDialog.java fourth)"
        status: pass
      - kind: manual
        ref: "grep-verified exact counts in SetoptsComposerDialog.java: 1x flow.observe(, 1x seq.incrementAndGet(), 2x mySeq == seq.get(), 1x ComposerFlow.once(, 2x setOKActionEnabled(false), 1x 'Preview unavailable — '"
        status: pass
    human_judgment: false
  - id: D8
    description: "refresh() validates the raw-hex tail and both mask-replacement characters before taking a sequence number, and every SetoptsPreviewParams construction passes the constructor-captured originalHex (never null in edit mode) so unmodeled bytes/unknown bits survive"
    requirement: DISC-04
    verification:
      - kind: manual
        ref: "code inspection: SetoptsPreviewParams(originalHex, selection) is the sole construction site; refresh() returns via previewUnavailable(reason) before seq.incrementAndGet() on an invalid raw tail ([0-9A-Fa-f]{0,14} regex) or an invalid mask character (length>1 or outside 0x20-0x7E)"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-07
status: complete
---

# Phase 87 Plan 02: Shared SETOPTS Composer Layer & IntelliJ Dialog Summary

**`SetoptsComposerDialog`, a native Swing byte-grouped catalog form with a debounced live preview built on a new `PreviewDebouncer` coalescing seam, enrolled as the fourth dialog under the #538 refresh-wiring source guard.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-07T18:20:00Z (approx.)
- **Completed:** 2026-09-07T18:30:08Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `PreviewDebouncer` — a plain-Java trailing-edge coalescer over the existing `Scheduler` seam, reusing `KeystrokeDebouncer.UiThread` rather than declaring a second identical functional interface; six `ManualScheduler`-driven tests prove coalescing goes through `cancel(pending)` (never `cancelAll()`), a sibling debouncer sharing the same scheduler is unaffected, and the action always arrives through the injected UI-thread dispatcher rather than running inline
- `SetoptsComposerDialog` — a `DialogWrapper` structurally cloned from `MsgboxComposerDialog`: a single `JBScrollPane` (D-07) built by iterating `catalogs.byteGroups` in arrival order with checkboxes filtered from `catalogs.bits` by matching `byteNo`; bits annotated `bit.bbj` (`ignored`/`bbj-specific`) render greyed via `UIUtil.getInactiveTextColor()` with a tooltip from `bbjDetail`/`detail` (D-08); every checkbox and text-field listener routes through `previewDebouncer.trigger()`, never `refresh()` directly (D-09)
- `refresh()` validates the raw-hex tail (`[0-9A-Fa-f]{0,14}`) and both mask-replacement characters (single printable ASCII) before taking a sequence number, rejecting through the existing `previewUnavailable(reason)`; `SetoptsPreviewParams` always carries the constructor-captured `originalHex` so bytes 10-16 and unknown bits in the user's existing line survive untouched
- `apply()` writes `hexDigits`/`line` (the two getters plan 03's launcher will read), the byte-count-plus-summary label, the preserved-unknown-bits callout (`Preserved: byte N $XX$`, blank when empty), and toggles the two mask fields from `maskInputsEnabled`
- `SetoptsComposerDialog.java` joins `ComposerDialogRefreshSourceGuardTest.DIALOG_SOURCES` as the fourth #538-wiring-guarded composer dialog; the class javadoc now says four dialogs and names SETOPTS alongside MSGBOX, addWindow and addChildWindow

## Task Commits

Each task was committed atomically:

1. **Task 1: `PreviewDebouncer` — one settle point, one round trip** - `2c05a669` (feat)
2. **Task 2: `SetoptsComposerDialog` — scrollable catalog form with de-emphasised no-op bits** - `b2a4e691` (feat)
3. **Task 3: Debounced preview round trip, validation gate, and enrolment in the refresh source guard** - `3259cf42` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-intellij/.../concurrency/PreviewDebouncer.java` - new coalescing seam, constructor `(Scheduler, long delayMs, KeystrokeDebouncer.UiThread, Runnable action)`, one public `trigger()`
- `bbj-intellij/.../concurrency/PreviewDebouncerTest.java` - 6 `ManualScheduler`-driven tests in the `concurrency` package (package-private `ManualScheduler` visibility)
- `bbj-intellij/.../composer/SetoptsComposerDialog.java` - the new dialog: layout, checkbox de-emphasis, prefill, debounced refresh/validation/apply, `getHexDigits()`/`getLine()`
- `bbj-intellij/.../composer/ComposerDialogRefreshSourceGuardTest.java` - `SETOPTS_SOURCE` added to `DIALOG_SOURCES` (now 4 entries), javadoc updated from three dialogs to four

## Decisions Made
- `PreviewDebouncer` carries no text key and performs no staleness check of its own — unlike `KeystrokeDebouncer`, the caller's `ComposerFlow`/`mySeq == seq.get()` discipline handles staleness downstream, so the debouncer's only job is deciding *when* to fire `action` next.
- The preserved-unknown-bits callout is a dedicated one-line label rather than folded into the summary text, per 87-CONTEXT's discretion note — a user's file carrying options this composer doesn't model is a signal worth its own line, not buried in prose.
- `refresh()`'s own input validation is the dialog's entire OK gate: `SetoptsPreview` (unlike `MsgboxPreview`) carries no server-side `valid` flag, so an invalid raw-hex-tail or mask character is rejected client-side, before any request is issued, through the same `previewUnavailable(reason)` site a failed request also uses.
- Task 2 left `refresh()`/`previewUnavailable()`/`apply()` as compiling stubs and Task 3 completed them in the same wave as the guard enrolment — the module never went red between commits (per the executor's own ordering requirement).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. `getHexDigits()`/`getLine()` initialize to `""` (matching `MsgboxComposerDialog.getStatement()`'s identical `private volatile String statement = "";` convention) but are written only by the successful-preview path before OK is ever enabled — this is the documented startup state of every existing composer dialog's getter, not an unwired stub. Both getters exist purely as the API surface plan 03's launcher will call after the dialog closes; no plan-03 code exists yet to consume them, which is expected — that consumption is plan 03's own scope.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. No new dependency was added to `build.gradle.kts`.

## Next Phase Readiness

Plan 03 (`BbjComposeSetoptsAction.java`, `ComposerLauncher.Kind.SETOPTS`) can now build directly on:
- `SetoptsComposerDialog`'s constructor `(Project, BbjComposerServer, SetoptsCatalogs, SetoptsSelection initial, String originalHex, boolean editMode)` — ready for `ComposerLauncher`'s launch-chain composition (Pattern 3 in 87-RESEARCH.md)
- `getHexDigits()`/`getLine()` — the two values the launcher's apply path (edit-in-place via `StaleEditGuard.applyIfUnchanged`, or compose-new via `insertAtCaret`) will read after the dialog closes
- `DecodeEquality.sameSetopts` (delivered by plan 01) — ready to hand to `StaleEditGuard.applyIfUnchanged` for the edit-in-place re-decode check

No blockers. The whole IntelliJ JUnit suite (713 tests) is green after this plan; the four composer source guards (`ComposerDialogRefreshSourceGuardTest`, `ComposerApplyGuardSourceGuardTest`, `ComposerLauncherChainSourceGuardTest`, `ComposerIntentionPreviewSourceGuardTest`) all still pass.

---
*Phase: 87-shared-setopts-composer-layer-intellij-dialog*
*Completed: 2026-09-07*

## Self-Check: PASSED

- All 3 created/modified files confirmed present on disk (`PreviewDebouncer.java`, `PreviewDebouncerTest.java`, `SetoptsComposerDialog.java`) plus the modified `ComposerDialogRefreshSourceGuardTest.java`.
- All 3 task commit hashes (`2c05a669`, `b2a4e691`, `3259cf42`) confirmed present in `git log --oneline --all`.
- `./gradlew test --offline` (whole `bbj-intellij` suite, 713 tests) green; targeted `composer`/`concurrency` package runs and all four composer source guards green.
