---
phase: 86-intellij-interop-settings-targeted-refresh
plan: 02
subsystem: intellij-plugin
tags: [java-properties, stat-cache, plain-junit, settings]

requires:
  - phase: 79-edt-responsiveness-and-caching
    provides: "BbjNodeVersionCache's stat-keyed ConcurrentHashMap.compute() race-safety idiom and BbjSettingsLookups' failed-result convention, the direct templates for this plan's cache and parser"
provides:
  - "BbjInteropPortDetector, a correct java-interop port parser reading com.basis.languageServer.addr through java.util.Properties, replacing the never-matching java.interop.port=/bridge.port= substring detector"
  - "BbjInteropPortCache, a stat-keyed memo so repeated port lookups perform no disk work in the steady state"
  - "InteropPortSettings, the single effectivePort/migratedAutoDetect/portToPersist/portSettingModified rule set every settings reader will share"
  - "InteropPortPresentation, the four exact inline hint strings for the Port field"
affects: [86-03-intellij-interop-settings-wiring]

actuals:
  tokens: 9600
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "PortLookup record collapses a read failure and a genuinely absent key into one detected=false result, following BbjSettingsLookups' failed-boolean convention but without a separate failed field, since both produce the same user-visible outcome for this setting"
    - "BbjInteropPortCache mirrors BbjNodeVersionCache field-for-field: two injectable collaborator interfaces, a SESSION production instance, a package-private constructor for test injection, and package-private clear()/size() probes"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortDetector.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortCache.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortPresentation.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortDetectorTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortCacheTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortSettingsTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortPresentationTest.java
  modified: []

key-decisions:
  - "PortLookup deliberately has no separate failed boolean (unlike NodeLookup/HomeLookup/ConfigLookup) — a read failure and a genuinely absent key both mean 'nothing detected, use 5008 and say so', so collapsing them into one detected boolean avoids a distinction no caller needs."
  - "The cache key is the properties file's absolute path string (not the raw bbjHomePath argument), so two differently-spelled but equivalent home paths that resolve to the same file still share one cache entry."

patterns-established:
  - "Same pure-function seam as InteropPortSettings/InteropPortPresentation: no I/O, no com.intellij import, every branch reachable from plain JUnit — plan 86-03 wires these into BbjSettings/BbjSettingsConfigurable/BbjSettingsComponent without adding any new untestable logic there."

requirements-completed: [CFG-05]

coverage:
  - id: D1
    description: "A real BBj install's escaped com.basis.languageServer.addr line resolves to a validated port through java.util.Properties, replacing the dead substring detector"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "BbjInteropPortDetectorTest#aRealEscapedAddrLineResolvesToTheDetectedPort"
        status: pass
      - kind: unit
        ref: "BbjInteropPortDetectorTest (19 tests: malformed matrix, missing home/file/key, ordering, still-escaped value)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Detection results are cached keyed on the properties file's stat, so a repeated lookup with an unchanged file performs no disk read, and concurrent lookups racing one miss read exactly once"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "BbjInteropPortCacheTest (7 tests, incl. the 8-thread race case and a real-file SESSION round trip)"
        status: pass
    human_judgment: false
  - id: D3
    description: "One accessor answers the effective port for every reader, and an explicitly confirmed 5008 is never overwritten by a detected 6000; one function decides the upgrade migration"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "InteropPortSettingsTest#anExplicitlyConfirmed5008SurvivesAPropertiesFileNamingADifferentPort"
        status: pass
      - kind: unit
        ref: "InteropPortSettingsTest (13 tests, incl. the full migration matrix and portToPersist/portSettingModified)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each of the four detection states has one exact inline hint string composed from the detector's own constants"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "InteropPortPresentationTest (6 tests, incl. pairwise-distinctness and no-null-or-empty)"
        status: pass
    human_judgment: false
---

# Phase 86 Plan 2: IntelliJ Interop Port Detection Layer Summary

**A correct `com.basis.languageServer.addr` parser and stat-keyed cache replace the dead `java.interop.port=`/`bridge.port=` substring detector, plus the effective-port rule, the upgrade-migration precedence rule, and the inline settings hint text — all platform-free, all covered by plain JUnit, ready for plan 86-03 to wire in.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-07T14:41:00Z
- **Completed:** 2026-09-07T15:01:00Z
- **Tasks:** 3
- **Files modified:** 8 (8 created, 0 modified)

## Accomplishments
- `BbjInteropPortDetector` parses `com.basis.languageServer.addr` (`host:port:enabled`) through `java.util.Properties`, resolving a live escaped fixture line (`localhost\:5008\:true`) end to end; no input — null, empty, blank, host-only, four-segment, non-numeric, out-of-range, still-escaped — can make it throw or report a wrong port
- `BbjInteropPortCache` memoizes the read keyed on the properties file's mtime+length stat, mirroring `BbjNodeVersionCache`'s `ConcurrentHashMap.compute()` race-safety idiom; an 8-thread race for one cache miss reads the file exactly once
- `InteropPortSettings` gives every future reader one `effectivePort` answer, with the D-06 regression pair (auto-off/port=5008/detected=6000 → 5008) pinned in its own named test, plus `migratedAutoDetect`'s five-combination upgrade inference and the `portToPersist`/`portSettingModified` helpers the Settings dialog will use
- `InteropPortPresentation.hint` gives each of the four detection states one exact string composed from the detector's own `ADDR_KEY`/`DEFAULT_PORT` constants, proven pairwise distinct

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "a real BBj.properties line becomes a detected port" (tracer)** - `1e273a07` (feat)
2. **Task 2: The one effective-port rule and the upgrade-migration precedence — RED** - `cbdd70e2` (test)
2. **Task 2: The one effective-port rule and the upgrade-migration precedence — GREEN** - `41c8efdf` (feat)
3. **Task 3: The inline settings hint for every detection state — RED** - `659e2063` (test)
3. **Task 3: The inline settings hint for every detection state — GREEN** - `ae26dfc7` (feat)

**Plan metadata:** commit to follow (docs)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortDetector.java` - `ADDR_KEY`, `DEFAULT_PORT`, `PortLookup`, `NOT_DETECTED`, `parseAddrValue`, `propertiesPathFor`, `readFrom`, `lookup`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortCache.java` - `SESSION`, injectable stat/reader collaborators, `lookup(String)`, package-private `clear()`/`size()`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortSettings.java` - `isValidPort`, `sanitizePort`, `effectivePort`, `migratedAutoDetect`, `portToPersist`, `portSettingModified`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortPresentation.java` - `hint(boolean, PortLookup)`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortDetectorTest.java` - 19 tests: live fixture, malformed matrix, file-read failures, ordering
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortCacheTest.java` - 7 tests: unchanged/changed stat, null stat, independent homes, 8-thread race, real-file SESSION round trip
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortSettingsTest.java` - 13 tests: effective-port cases, the D-06 regression pair, the 5-combination migration matrix, persist/modified helpers
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortPresentationTest.java` - 6 tests: one per hint branch plus distinctness and no-null-or-empty

## Decisions Made
- `PortLookup` collapses a read failure and a genuinely absent key into one `detected` boolean rather than carrying a separate `failed` flag like `BbjSettingsLookups`' records — both cases produce the same user-visible outcome (5008 plus the same hint), so a second flag would be information no caller acts on.
- The cache keys on the resolved properties file's absolute path string, not the raw `bbjHomePath` argument, so the memo is keyed on what actually gets read.

## Deviations from Plan

None - plan executed exactly as written, including the full TDD RED-then-GREEN cycle for both `tdd="true"` tasks (Task 2 and Task 3), each with an intentionally wrong stub committed first and the tests confirmed to fail for the right reason before the real implementation was committed.

## TDD Gate Compliance

- Task 2 (`tdd="true"`): Full RED-GREEN cycle present. `cbdd70e2` (`test(86-02): add failing test for effective-port and migration rules`) shipped `InteropPortSettings` as an intentionally wrong stub with 12 of 13 `InteropPortSettingsTest` cases failing, then `41c8efdf` (`feat(86-02): implement effective-port and migration precedence rules`) implemented the real functions, all 13 cases green. No REFACTOR commit (none needed).
- Task 3 (`tdd="true"`): Full RED-GREEN cycle present. `659e2063` (`test(86-02): add failing test for the inline settings hint`) shipped `InteropPortPresentation` as an intentionally wrong stub with 5 of 6 `InteropPortPresentationTest` cases failing, then `ae26dfc7` (`feat(86-02): implement the inline settings hint for every detection state`) implemented the real branches, all 6 cases green. No REFACTOR commit (none needed).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `BbjInteropPortDetector`, `BbjInteropPortCache`, `InteropPortSettings` and `InteropPortPresentation` are complete, platform-free, and fully tested; plan 86-03 wires them into `BbjSettings` (the persisted auto-detect flag and the effective-port accessor), `BbjSettingsConfigurable` (`reset()`/`apply()`/`isModified()`), `BbjSettingsComponent` (the checkbox and hint row), `BbjLanguageServerFactory.initializeParams`, and `BbjJavaInteropService.checkConnection`.
- This plan touched no existing settings file — `BbjSettings.java`, `BbjSettingsConfigurable.java` and `BbjSettingsComponent.java` are all still exactly as Phase 85 left them (confirmed by an empty `git diff --numstat`), leaving the dead `detectJavaInteropPort` substring detector and the `reset()` `== 5008` gate for plan 86-03 to remove.
- CFG-05 (#608) is not yet closed — this plan delivers the correct detection and decision layer only; the wiring, the persisted flag, and the Settings dialog checkbox remain for plan 86-03.

---
*Phase: 86-intellij-interop-settings-targeted-refresh*
*Completed: 2026-09-07*

## Self-Check: PASSED

All 8 created files verified present on disk; all 5 commits (`1e273a07`, `cbdd70e2`, `41c8efdf`, `659e2063`, `ae26dfc7`) verified present in `git log` — Task 1 is a single tracer commit, Tasks 2 and 3 each have a RED+GREEN pair.
