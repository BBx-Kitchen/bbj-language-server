---
phase: 86-intellij-interop-settings-targeted-refresh
plan: 03
subsystem: intellij-plugin
tags: [settings, java-properties, source-guard, swing]

requires:
  - phase: 86-02
    provides: "BbjInteropPortDetector, BbjInteropPortCache, InteropPortSettings and InteropPortPresentation — the platform-free detection and decision layer this plan wires into the plugin"
provides:
  - "BbjSettings.getEffectiveJavaInteropPort(), the single effective-port accessor every reader shares, plus the persisted javaInteropPortAutoDetect flag and its one-time loadState migration"
  - "BbjLanguageServerFactory and BbjJavaInteropService reading the port through the accessor instead of the raw state field"
  - "BbjSettingsComponent's Auto-detect checkbox and inline hint row, with setJavaInteropPortDetection as the only channel detection reaches it through"
  - "BbjSettingsConfigurable's reset()/apply()/isModified() rewired onto the accessor and the InteropPortSettings decision functions"
  - "EffectiveInteropPortSourceGuardTest and an extended BbjSettingsComponentSourceGuardTest fencing every wiring site against regression"
affects: []

actuals:
  tokens: 6800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Detection handoff as a value, not a lookup: BbjSettingsConfigurable.reset() resolves one PortLookup through the cache and hands it to the component via setJavaInteropPortDetection, so the Swing component performs no filesystem work of its own"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java

key-decisions:
  - "apply() captures the currently persisted port into a local before writing any other state field, because InteropPortSettings.portToPersist takes that value as an argument — writing the port or the flag first would feed the function the value it is about to produce."
  - "reset() resolves exactly one BbjInteropPortCache.SESSION.lookup per dialog open and hands the component both the lookup and the precomputed auto-detect port via setJavaInteropPortDetection, before calling setJavaInteropPortAutoDetect last so the row's enabled state and hint are computed from the final flag."

patterns-established:
  - "Whole-file source-guard fencing for a decision that cannot be unit-tested because it resolves an IntelliJ application service (BbjSettings.getInstance()) — the decision content lives in plain-JUnit-testable InteropPortSettings/InteropPortPresentation (86-02), and the wiring that connects it to the four readers is pinned here by text assertions instead."

requirements-completed: [CFG-05]

coverage:
  - id: D1
    description: "One accessor answers the effective java-interop port for every reader — the language-server initialization options, the java-interop health probe, and the Settings dialog's reset — and the dead substring detector plus the numeric equality gate are gone"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "EffectiveInteropPortSourceGuardTest (5 tests: accessor call counts in the factory/service, decision-function call counts in BbjSettings/BbjSettingsConfigurable, removed-detector and equality-gate absence)"
        status: pass
      - kind: unit
        ref: "InteropPortSettingsTest, BbjInteropPortDetectorTest, BbjInteropPortCacheTest (from 86-02, re-run unchanged and green against the new wiring)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The persisted auto-detect flag defaults to on, migrates once at state load, and a saved non-default port keeps the checkbox off with the value intact"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "InteropPortSettingsTest#anExplicitlyConfirmed5008SurvivesAPropertiesFileNamingADifferentPort and the migration matrix (86-02), exercised through BbjSettings.loadState's single migratedAutoDetect call pinned by EffectiveInteropPortSourceGuardTest"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Settings dialog shows an Auto-detect checkbox with the port greyed out and a hint naming its source; unchecking pre-fills and enables the field, re-checking discards the edit, and Apply never writes a detected value into the explicit port"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "BbjSettingsComponentSourceGuardTest (10 tests, 3 new: no BbjSettings/BbjInteropPortCache/InteropPortSettings reference, InteropPortPresentation.hint( called exactly once, setJavaInteropPortDetection declared exactly once)"
        status: pass
    human_judgment: true
    rationale: "BbjSettings.getInstance() resolves a live IntelliJ Application, which this repo has no platform test harness for, so the checkbox's actual disable/prefill/hint behavior in a running dialog is not exercised by an automated test — it is a QA/FULL-TEST-CHECKLIST.md hand check (86-04 row 17) deferred to end-of-phase UAT."
  - id: D4
    description: "The dialog performs exactly one cached stat per open and the component resolves nothing itself, both fenced by source guards"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "EffectiveInteropPortSourceGuardTest#bbjSettingsConfigurableRoutesThroughEachHelperExactlyOnceAndTheEqualityGateIsGone (one BbjInteropPortCache.SESSION.lookup( call in reset())"
        status: pass
      - kind: unit
        ref: "BbjSettingsComponentSourceGuardTest#theComponentResolvesNoInteropPortDetectionItself"
        status: pass
    human_judgment: false
---

# Phase 86 Plan 3: IntelliJ Interop Settings Wiring Summary

**One `BbjSettings.getEffectiveJavaInteropPort()` accessor now answers the java-interop port for the language-server initialization options, the health probe, and the Settings dialog, backed by a persisted Auto-detect checkbox, a one-time upgrade migration, and two source guards that fail the build on any regression.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-07T15:05:00Z
- **Completed:** 2026-09-07T15:20:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `BbjSettings` gains a persisted `javaInteropPortAutoDetect` flag (default `true`), a single `getEffectiveJavaInteropPort()` accessor every reader shares, and a `loadState` migration applying `InteropPortSettings.migratedAutoDetect` before any reader can observe the flag; the dead substring-matching `detectJavaInteropPort` is deleted
- `BbjLanguageServerFactory`'s initialization options and `BbjJavaInteropService`'s five-second health-probe tick both read the accessor instead of the raw state field, so a live `BBj.properties` change is picked up on the next server start / next tick with no watcher
- `BbjSettingsComponent` gains an `Auto-detect` checkbox and an inline hint row; `setJavaInteropPortDetection` is the only channel through which detection (a lookup plus a precomputed port) reaches the component — it performs no lookup, no stat and no service access of its own
- `BbjSettingsConfigurable`'s `reset()` resolves exactly one cached `PortLookup` per dialog open and hands it to the component; `apply()` routes the port through `InteropPortSettings.portToPersist` (never writing a detected value into the persisted explicit port) and persists the flag; `isModified()` routes through `InteropPortSettings.portSettingModified`
- `EffectiveInteropPortSourceGuardTest` (new, 5 tests) and an extended `BbjSettingsComponentSourceGuardTest` (10 tests, 3 new) structurally pin every wiring site: one accessor call per non-UI reader, one decision-function call per helper, zero references to the removed detector or the numeric equality gate, and zero direct settings/cache/decision references from the Swing component

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "a detected port reaches the language server and the health probe" (tracer)** - `de6a7eea` (feat)
2. **Task 2: The Auto-detect checkbox, the inline hint and the persistence rules** - `5108386d` (feat)
3. **Task 3: Source guards for the promoted accessor and the component's no-lookup rule** - `6cc9fe48` (test)

**Plan metadata:** commit to follow (docs)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - `javaInteropPortAutoDetect` field, `getEffectiveJavaInteropPort()`, migration in `loadState`, `detectJavaInteropPort` removed
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - `reset()`/`apply()`/`isModified()` rewired onto the accessor and `InteropPortSettings`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Auto-detect checkbox, hint label, `setJavaInteropPortDetection`, two new `FormBuilder` rows
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - `javaInteropPort` initialization option now carries the accessor's value
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` - `checkConnection` reads the port from the accessor on every tick
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java` - new test class fencing all four readers (5 tests)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java` - new `stripComments` helper and 3 new tests for the component's no-lookup rule

## Decisions Made
- `apply()` captures the currently persisted port into a local before writing any other state field, since `InteropPortSettings.portToPersist` takes that value as an argument.
- `reset()` resolves exactly one `BbjInteropPortCache.SESSION.lookup` per dialog open and calls `setJavaInteropPortDetection` before `setJavaInteropPortAutoDetect`, so the row's enabled state and hint are computed from the final flag.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CFG-05 (#608) is closed: every reader of the java-interop port shares one accessor, the dead detector and the equality gate are gone, and an explicitly confirmed 5008 is never overwritten by detection.
- QA/FULL-TEST-CHECKLIST.md row 17 (written by 86-04) is now directly executable against a built plugin — the Auto-detect checkbox, the hint text and the explicit-5008 survival rule all exist in code as of this plan.
- This was the last plan in Phase 86; both phase requirements (CFG-04 from 86-01, CFG-05 from this plan and 86-02) are now complete, and the phase is ready for end-of-phase UAT/verification.

---
*Phase: 86-intellij-interop-settings-targeted-refresh*
*Completed: 2026-09-07*

## Self-Check: PASSED

All 7 files verified present on disk (1 created, 6 modified). All 3 commits (`de6a7eea`, `5108386d`, `6cc9fe48`) verified present in `git log`. `./gradlew compileJava --offline`, the targeted test runs for each task, and `./gradlew build --offline` all exited 0. `git diff --numstat` confirms all five production files named in the plan's `<verification>` block changed.
