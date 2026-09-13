---
phase: 84-config-path-resolution-discoverability-foundation
plan: 06
subsystem: intellij-plugin
tags: [intellij, run-actions, settings-validation, config-path]

requires:
  - phase: 84-04
    provides: "BbjConfigPathService (activeConfigPath cache), ConfigPaths (normalizeSetting/samePath/configPathArg)"
provides:
  - "BbjRunActionBase.getConfigPathArg()/getConfigPath() reading BbjConfigPathService.activeConfigPath() instead of the raw setting, with no BBj-home-derived default"
  - "ConfigPaths.configPathArg() as the single tested sentinel refusal for run-argument construction"
  - "BbjRunBuiAction/BbjRunDwcAction blank-config-path guard that aborts with a named notification instead of registering an empty/sentinel path with EM"
  - "BbjSettingsLookups.ConfigLookup/lookupConfig(String) plus its injectable-predicate overload, expandHome and isAbsolutePath helpers"
  - "BbjSettingsComponent's non-blocking ComponentValidator on configPathField, sharing the component's single AlarmScheduler through a new KeystrokeDebouncer"
affects: [87]

actuals:
  tokens: 7225
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Consumers of a resolved value read it through exactly one accessor call, verified by a source-guard test that extracts each method's brace-balanced body and counts literal occurrences within it (mirrors the config-path-consumers.test.ts technique on the VS Code side, applied here to Java sources)"
    - "A pure decision helper takes an injectable OS-name/collaborator parameter so a platform-specific rule (win32 absolute-path forms) is testable on Linux CI as a backstop verification, matching ConfigPaths.samePath's existing injectable-OS-name overload from plan 84-04"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsConfigPathTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java

key-decisions:
  - "BbjRunGuiAction.java needed no code change: its existing null guard around getConfigPathArg() already covers the sentinel once Task 1 redirected that helper through ConfigPaths.configPathArg(), so the plan's own 'make no other change unless the call site needs one to compile' condition never triggered."
  - "The win32 absolute-path rule (a drive-letter or bare-root path is absolute, a bare relative path is not) is implemented as a pure, injectable-OS-name static helper (BbjSettingsLookups.isAbsolutePath) rather than relying on java.nio.file.Paths, whose behavior is tied to the JVM's actual filesystem provider and cannot be exercised for win32 on this Linux-only CI."
  - "Tilde expansion (expandHome) and the absolute-path decision (isAbsolutePath) live in BbjSettingsLookups rather than ConfigPaths, since Task 3's files list scopes changes to the settings-validation seam and ConfigPaths already has its own, differently-shaped tilde/absolute logic on the language-server side that this plan does not touch."

requirements-completed: [CFG-01]

coverage:
  - id: D1
    description: "ConfigPaths.configPathArg refuses the EM Config sentinel and a real path yields exactly one -c-prefixed value; getConfigPath()/getConfigPathArg() read the cached resolved path and never derive a BBj-home default"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/actions/BbjRunActionConfigPathTest.java (4 tests: real path, sentinel, null, empty)"
        status: pass
      - kind: unit
        ref: "test/actions/BbjRunActionConfigPathSourceGuardTest.java#baseClassAccessorsEachCallActiveConfigPathExactlyOnce, #noActionSourceJoinsABbjHomeConfigPathDefault"
        status: pass
    human_judgment: false
  - id: D2
    description: "The GUI run only adds -c when an argument was returned; the BUI and DWC runs abort with a named notification instead of registering an empty/sentinel config path with EM"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/actions/BbjRunActionConfigPathSourceGuardTest.java#buiAndDwcActionsGuardTheBlankConfigPathBeforeLaunching, #guiActionCallsTheArgumentHelperExactlyOnceInsideANullGuard"
        status: pass
    human_judgment: true
    rationale: "The source-guard tests prove the call and guard shape structurally; actually launching a BUI/DWC run against a live EM instance with no config path configured, and observing the notification balloon, is not exercised by this plan's automated suite."
  - id: D3
    description: "The config path field warns (never blocks) on a relative path or a missing file, stays silent on empty/failed/absolute-existing states, and performs the filesystem probe only through the shared debounced lookup seam"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/BbjSettingsLookupsConfigPathTest.java (11 tests: empty, relative, absolute-missing, absolute-existing, throwing collaborator, tilde expansion, expandHome, win32/posix isAbsolutePath)"
        status: pass
      - kind: unit
        ref: "test/lsp/BbjSettingsComponentSourceGuardTest.java#eachDocumentAdapterCallsItsOwnDebouncerExactlyOnce, #theConfigDebouncerSharesTheSingleAlarmSchedulerAndCreatesNoSecondOne"
        status: pass
    human_judgment: true
    rationale: "The unit and source-guard tests prove the ComponentValidator's decision logic and the no-second-scheduler wiring; that a user typing in the live Settings dialog actually sees the warning render inline without blocking Apply is only provable by hand in a running IntelliJ instance."

duration: 20min
completed: 2026-09-06
status: complete
---

# Phase 84 Plan 06: Config Path Resolution & Discoverability Foundation Summary

**IntelliJ's three run actions and Settings dialog now consume the one resolved config path: `getConfigPath()`/`getConfigPathArg()` read the plan-84-04 cache instead of a raw setting or a BBj-home-derived default, the BUI/DWC runs refuse to register an empty or sentinel path with EM, and a non-blocking `ComponentValidator` on the config path field warns about a relative or missing path without ever stopping Apply.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-06T15:59:00Z (approx.)
- **Completed:** 2026-09-06T16:19:00Z
- **Tasks:** 3
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- `BbjRunActionBase.getConfigPathArg()`/`getConfigPath()` now delegate to
  `BbjConfigPathService.getInstance().activeConfigPath()`; the old branch that joined a BBj home
  with `cfg`/`config.bbx` is gone, and `ConfigPaths.configPathArg()` is the single tested helper
  that turns the EM Config sentinel into `null` instead of a literal `-c--` argument — the exact
  defect the folded todo described, since the plain GUI run has no downstream script to absorb it.
- `BbjRunBuiAction` and `BbjRunDwcAction` each gained a blank-check guard immediately after
  `getConfigPath()`: when no config path is available, the action logs a named error through the
  existing notification path and returns without launching, so the EM registration can never be
  handed an empty or sentinel value (issue #382). `BbjRunGuiAction` needed no change — its
  existing null guard around `getConfigPathArg()` already covers the sentinel now that Task 1
  redirected that helper through `ConfigPaths.configPathArg`.
- `BbjSettingsLookups` gained a `ConfigLookup` record and `lookupConfig(String)` (plus an
  injectable-predicate overload for testing) that expands a single leading `~` before deciding
  whether the result is absolute — matching the language server's rule for the same input — and
  turns a throwing file-exists collaborator into a `failed` result rather than propagating.
- `BbjSettingsComponent` installs a `ComponentValidator` on `configPathField`, backed by a new
  `configDebouncer` constructed over the same single `lookupScheduler` the node and home
  debouncers already share (no second `AlarmScheduler`, no bare `Alarm`). The validator reads only
  the cached `lastConfigLookup` and returns a warning `ValidationInfo` for a relative or missing
  path, `null` for empty/failed/absolute-existing — Apply stays unconditional since
  `BbjSettingsConfigurable.apply()` was left untouched.
- Three source-guard tests (`BbjRunActionConfigPathSourceGuardTest`,
  `BbjSettingsComponentSourceGuardTest`'s two new cases) pin the exact call and guard shape across
  the four run-action sources and the Settings component, so a future edit cannot silently
  reintroduce a second accessor call, a second scheduler, or a missing blank-check guard.

## Task Commits

Each task was committed atomically:

1. **Task 1: Run actions read the resolved path and refuse the sentinel** - `04a07fe9` (feat)
2. **Task 2: A run with no config path says so instead of guessing** - `b312b87e` (feat)
3. **Task 3: Inline, non-blocking validation of the config path field** - `0f7c6dc9` (feat)

## Files Created/Modified

- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathTest.java` -
  behavioral coverage of `ConfigPaths.configPathArg` (real path, sentinel, null, empty)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathSourceGuardTest.java` -
  source-guard fence over all four run-action sources
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsConfigPathTest.java` -
  behavioral coverage of `lookupConfig`, `expandHome`, and `isAbsolutePath`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` -
  `getConfigPathArg()`/`getConfigPath()` redirected to the cached resolved path
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` - blank-path
  guard before building the web-run command line
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` - blank-path
  guard before building the web-run command line
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java` - `ConfigLookup`,
  `lookupConfig`, `expandHome`, `isAbsolutePath`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - `configDebouncer`,
  `lastConfigLookup`, the `configPathField` `ComponentValidator` and its `DocumentAdapter`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java` -
  two new cases for the config debouncer's call shape and scheduler sharing

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

None - plan executed exactly as written. `BbjRunGuiAction.java` was listed in the plan's
`files_modified` frontmatter but needed no edit, per the plan's own instruction to make "no other
change unless the call site needs one to compile" — it did not.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

CFG-01 (this phase's requirement) is now closed on both hosts: VS Code's consumers (84-03) and
IntelliJ's run actions and Settings validator (this plan) all read the one resolved config path,
with the EM Config sentinel neutralized at both the shared resolver (84-01/84-04) and every
consumer as a defensive second layer. No live-IntelliJ verification of the BUI/DWC abort
notification or the Settings dialog's inline warning rendering has been performed yet — the unit
and source-guard tests cover the decision logic and wiring; the rendered UI is a human-judgment
item per D2/D3's `human_judgment: true`, left for end-of-phase UAT alongside the human-judgment
items already open from 84-02, 84-04, and 84-05.

---
*Phase: 84-config-path-resolution-discoverability-foundation*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (BbjRunActionConfigPathTest.java,
BbjRunActionConfigPathSourceGuardTest.java, BbjSettingsLookupsConfigPathTest.java,
BbjRunActionBase.java, BbjRunBuiAction.java, BbjRunDwcAction.java, BbjSettingsLookups.java,
BbjSettingsComponent.java, BbjSettingsComponentSourceGuardTest.java, this SUMMARY). All three
task commits (`04a07fe9`, `b312b87e`, `0f7c6dc9`) confirmed present in `git log`. Plan-level
`<verification>` re-run clean: `./gradlew build --offline` (BUILD SUCCESSFUL, whole suite),
`BbjSettingsComponentSourceGuardTest` passes with its pre-existing assertions unchanged plus the
two new cases, and a targeted grep of `BbjRunActionBase.java` for a BBj-home/cfg config-path join
returns zero matches.
