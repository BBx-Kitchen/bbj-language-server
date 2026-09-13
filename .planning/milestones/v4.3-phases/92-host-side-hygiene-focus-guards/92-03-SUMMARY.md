---
phase: 92-host-side-hygiene-focus-guards
plan: "03"
subsystem: intellij-ui
tags: [intellij, status-bar-widget, file-type, junit, source-guard]

# Dependency graph
requires:
  - phase: 84-config-path-plus-watch
    provides: "BbjConfigPathService's static-helper-plus-thin-wrapper convention that BbjFileVisibility mirrors, and BbjConfigFileTypeOverrider/BbjConfigFileType which give the config file its own resolved FileType"
provides:
  - "BbjFileVisibility: a package-private static predicate deciding widget visibility from a selected file's resolved FileType name, never its extension"
  - "Both IntelliJ status-bar widgets follow bare editor-tab switches via a FileEditorManagerListener.FILE_EDITOR_MANAGER subscription on their existing messageBusConnection"
  - "A source-guard test pinning both widgets against a regression to extension-list visibility or a lost subscription"
affects: [92-06]

actuals:
  tokens: 4700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "static-helper-plus-thin-wrapper (BbjConfigPathService's convention) applied to a new shared UI-visibility predicate"
    - "source-guard test idiom (BbjConfigFileTypeOverriderSourceGuardTest's readSource/countOccurrences) applied to two sibling widget classes via @ParameterizedTest"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java

key-decisions:
  - "BbjFileVisibility.showsForSelection maps each selected VirtualFile to file.getFileType().getName() and delegates to the plain-String decision, so the platform's own FileTypeOverrider resolution (which already gives config.bbx/config.min/a custom-named config file the distinct BBx Config type) is the single source of truth -- no second extension-based classification exists anywhere in either widget."
  - "The comparison in isBbjProgramFileTypeName is exact-equals against the literal \"BBj\" (BBJ_FILE_TYPE_NAME), not case-folded -- matches BbjFileType.getName()'s actual return value and the plan's must_haves wording."

requirements-completed: []  # RESP-09 intentionally withheld: plan 92-06 also declares it and has no SUMMARY yet (shared-ID gate)

coverage:
  - id: D1
    description: "Both status-bar widgets subscribe FileEditorManagerListener.FILE_EDITOR_MANAGER on their existing messageBusConnection and call updateVisibility() from selectionChanged"
    requirement: "RESP-09"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java#widgetSubscribesFileEditorManagerExactlyOnceOnMessageBusConnection"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java#selectionChangedCallsUpdateVisibilityBeforeItsClosingBrace"
        status: pass
    human_judgment: false
  - id: D2
    description: "Widget visibility is decided by the selected files' resolved file type name (never by extension); config.bbx/config.min/a custom-named config file, PLAIN_TEXT/UNKNOWN (.bbl), JAVA and JSON all hide the widgets, and the BBj type shows them"
    requirement: "RESP-09"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java#sharedPredicateReadsFileTypeExactlyOnceAndNeverExtension"
        status: pass
    human_judgment: false
  - id: D3
    description: "One live IntelliJ UAT step (BBj tab -> non-BBj tab -> config.bbx -> BBj tab with no server-status change) confirming the widgets follow each switch immediately"
    requirement: "RESP-09"
    verification: []
    human_judgment: true
    rationale: "No IntelliJ sandbox exists in this devcontainer (consistent with prior-phase notes); this plan's own scope stages only the automated half (D-13's plain-JUnit + source-guard proof). The live check is explicitly deferred to plan 92-06 per this plan's success_criteria."

# Metrics
duration: ~4min
completed: 2026-09-13
status: complete
---

# Phase 92 Plan 03: IntelliJ Status-Bar Focus Guards Summary

**Both IntelliJ status-bar widgets now follow bare editor-tab switches through one shared, file-type-based visibility decision instead of two hard-coded extension lists.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-09-13T07:24:46Z
- **Completed:** 2026-09-13T07:28:45Z
- **Tasks:** 2
- **Files modified:** 5 (2 new source, 2 modified source, 1 new test replaced by 2 new test files across both tasks)

## Accomplishments
- New `BbjFileVisibility` package-private static predicate: `isBbjProgramFileTypeName`, `showsForFileTypeNames`, and a thin `showsForSelection(VirtualFile[])` wrapper, all following `BbjConfigPathService`'s established static-helper-plus-thin-wrapper convention
- `BbjStatusBarWidget` and `BbjJavaInteropStatusBarWidget` each subscribe `FileEditorManagerListener.FILE_EDITOR_MANAGER` on their existing `messageBusConnection` and route `selectionChanged` straight to `updateVisibility()` (no `invokeLater` needed — the callback already runs on the EDT)
- Both widgets' hard-coded `ext.equals("bbj") || ext.equals("bbl") || ...` extension checks are gone, replaced by a one-line delegation to `BbjFileVisibility.showsForSelection(...)`
- `BbjFileVisibilityTest` (14 plain-JUnit cases, no live `FileType`/`VirtualFile` construction) and `BbjStatusBarWidgetSourceGuardTest` (parameterized across both widget sources plus a `BbjFileVisibility` source check) prove the decision and the wiring

## Task Commits

Each task was committed atomically:

1. **Task 1: The language-server widget shows for a BBj program tab and hides for config and non-BBj tabs on a bare selection change** - `175be8bc` (feat)
2. **Task 2: The java-interop widget follows tab switches the same way, and a source guard pins both widgets to the shared decision** - `52d8c0b5` (feat)

**Plan metadata:** (recorded after this SUMMARY commits)

_Note: both tasks carried `tdd="true"` — each commit above followed its own RED (compile failure / test failure) confirmed before the GREEN implementation that produced the commit._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` - shared static visibility decision over resolved file type names
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` - `FILE_EDITOR_MANAGER` subscription + delegation to the shared decision
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` - same wiring, mirrored
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java` - plain-JUnit coverage of the decision plus drift guards against `BbjFileType`/`BbjConfigFileType`/`plugin.xml`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` - source-guard fence over both widget sources

## Decisions Made
- Followed the plan's exact member shapes for `BbjFileVisibility` (`BBJ_FILE_TYPE_NAME`, `isBbjProgramFileTypeName`, `showsForFileTypeNames`, `showsForSelection`) with no deviation.
- Comparison stays exact-string-equals (never case-folded) per the plan's explicit `isBbjProgramFileTypeName("bbj")` (lowercase, exact name) test case.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RESP-09's automated half (D-11, D-12, and D-13's plain-JUnit + source-guard proof) is complete; `REQUIREMENTS.md` intentionally left unmarked for RESP-09 since sibling plan 92-06 also declares it and hasn't produced a SUMMARY yet — the shared-ID gate (`requirements.ready-ids`) withholds it automatically.
- Plan 92-06 stages the one remaining live IntelliJ UAT step (BBj tab → non-BBj tab → `config.bbx` → BBj tab, no server-status change) against a rebuilt IntelliJ zip.
- No blockers for subsequent plans in this phase.

---
*Phase: 92-host-side-hygiene-focus-guards*
*Completed: 2026-09-13*

## Self-Check: PASSED

- All 5 key files (`BbjFileVisibility.java`, `BbjFileVisibilityTest.java`, `BbjStatusBarWidgetSourceGuardTest.java`, `BbjStatusBarWidget.java`, `BbjJavaInteropStatusBarWidget.java`) and this SUMMARY.md confirmed present on disk.
- Both task commits (`175be8bc`, `52d8c0b5`) confirmed present in `git log`.
- Plan-level `<verification>` re-run: `BbjFileVisibilityTest`, `BbjStatusBarWidgetSourceGuardTest` and `Lsp4ijImportAllowlistTest` all pass via the grounded Gradle command; `grep -c 'getExtension('` prints 0 for both widget sources; `grep -c 'FileEditorManagerListener.FILE_EDITOR_MANAGER'` prints 1 for both; the register-id scan over `bbj-intellij/src` (base `3ec25f02`) prints nothing.
- All task-level `<acceptance_criteria>` re-verified passing (see command output above each commit).
