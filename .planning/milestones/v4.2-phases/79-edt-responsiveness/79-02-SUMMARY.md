---
phase: 79-edt-responsiveness
plan: 02
subsystem: infra
tags: [intellij, alarm, concurrency, junit5, edt, node, settings]

# Dependency graph
requires:
  - phase: 79-edt-responsiveness (plan 01)
    provides: Plain-Java `Scheduler`/`AlarmScheduler` seam under `com.basis.bbj.intellij.concurrency`, reused unchanged for the keystroke debouncer
provides:
  - Stat-keyed `BbjNodeVersionCache` fronting `node --version`, consumed by the missing-Node editor notification
  - `ThreadProbe` + `KeystrokeDebouncer<T>` seam: per-field debounce with staleness discard and EDT refusal
  - `BbjSettingsLookups` holding every Settings-dialog file/subprocess call, called only off the EDT
  - `BbjSettingsComponent` rewired so both keystroke listeners and both `ComponentValidator`s do no filesystem/subprocess work
affects: [79-03-edt-responsiveness, 83-regression-test-hardening]

# Actuals (#2632)
actuals:
  tokens: 11000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-through memo keyed on path + file stat (lastModified + length), not a hash — re-spawns only on an actual binary change, following NodeInstallIntegrity.SESSION's injectable-singleton shape"
    - "KeystrokeDebouncer<T> over the 79-01 Scheduler seam: cancels only its own pending task (never cancelAll()), so two fields sharing one Alarm stay independent"
    - "Settings-dialog file/subprocess work isolated in a single BbjSettingsLookups holder, called only from the debounced background task; ComponentValidators became pure readers of the last published lookup"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ThreadProbe.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeVersionCacheTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncerTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java

key-decisions:
  - "Rephrased a KeystrokeDebouncer javadoc sentence that originally referenced Scheduler#cancelAll() — the literal substring cancelAll( in a comment would have failed Task 2's own acceptance-criteria grep for 'does not contain cancelAll('. No behavior change, comment wording only."

patterns-established:
  - "Injectable VersionSpawner/FileStat seam on BbjNodeVersionCache, following NodeInstallIntegrity.SESSION's static-singleton-with-injectable-collaborator shape, for tests that count subprocess spawns without a real node binary"

requirements-completed: [EDT-02, EDT-03]

coverage:
  - id: D1
    description: "BbjNodeVersionCache memoizes node --version per path, keyed on a stat (lastModified+length); two consecutive resolutions of an unchanged path spawn once, a stat change re-spawns, a null spawn result is cached, and the map holds at most one entry per path across repeated stat changes"
    requirement: "EDT-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeVersionCacheTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java"
        status: pass
    human_judgment: false
  - id: D2
    description: "A rapid keystroke burst produces zero background lookups until the debouncer's scheduler fires, then exactly one, carrying the last keystroke's text; coalescing goes through cancel(pending), never cancelAll(), so two fields sharing one Alarm never cancel each other; a stale result (text changed before the lookup ran) is discarded, never applied; a pending task refuses to run at all if it is ever invoked on the EDT"
    requirement: "EDT-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncerTest.java"
        status: pass
    human_judgment: false
  - id: D3
    description: "BbjSettingsComponent's two DocumentAdapters and two ComponentValidators perform zero BbjNodeDetector/BbjHomeDetector/BbjSettings.getBBjClasspathEntries/new File calls; all such work moved into BbjSettingsLookups, reached only through the debounced background lookup; the persisted classpath entry survives the new asynchrony across a settings-dialog reset()"
    requirement: "EDT-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java"
        status: pass
    human_judgment: true
    rationale: "The pendingClasspathSelection preservation across a real Settings-dialog open/reset()/apply() cycle is asserted by source-guard text checks and by construction (BbjSettingsConfigurable.java untouched per acceptance criteria), not by a live-IDE integration test — this repo has no BasePlatformTestCase harness (REQUIREMENTS.md Out of Scope). A human should visually confirm in a running IDE that reopening Settings with a previously-selected classpath entry does not show it reset to empty while the home-path lookup is still pending."

duration: ~15min (task execution)
completed: 2026-09-04
status: complete
---

# Phase 79 Plan 02: Node Version Cache + Debounced Settings Dialog Summary

**Stat-keyed memo in front of `node --version` plus a per-field `KeystrokeDebouncer` seam that moves every Settings-dialog filesystem/subprocess call off the EDT, into a single `BbjSettingsLookups` holder.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-04 (session start)
- **Completed:** 2026-09-04T10:17:09Z
- **Tasks:** 3 completed
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments

- `BbjNodeVersionCache`: a plain-Java read-through memo (`SESSION` static instance, injectable `VersionSpawner`/`FileStat` collaborators) in front of `BbjNodeDetector.getNodeVersion`, keyed on path + a `lastModified:length` stat — never a subprocess for the stat itself, never a hash (D-10). `BbjMissingNodeNotificationProvider` resolves both its version branches (configured path, PATH-detected) through the cache instead of calling the detector directly (D-11); `detectNodePath()`/`meetsMinimumVersion()` are untouched.
- `ThreadProbe` (plain `isDispatchThread()` seam, D-03) and `KeystrokeDebouncer<T>` (per-field debounce over the 79-01 `Scheduler` seam): cancels only its own pending task via `scheduler.cancel(pending)`, never `cancelAll()`, so two fields sharing one Alarm stay independent; a pending task throws if it ever runs on the EDT, then discards its result on the UI thread when the field's live text no longer matches the text it was scheduled for (D-12).
- `BbjSettingsLookups`: `lookupNode`/`lookupHome` static methods holding every Settings-dialog file/subprocess call (Node stat+version, BBj-home validity, classpath enumeration), called only from the debounced background task, never from a `DocumentAdapter` or `ComponentValidator`.
- `BbjSettingsComponent` rewired: both `DocumentAdapter`s now only set pending UI state (`"Checking Node.js version…"` label, disabled classpath combo with its placeholder model) and call their debouncer's `onTextChanged`; both `ComponentValidator`s became pure readers of the last published lookup (`lastNodeLookup`/`lastHomeLookup`), returning nothing to say until the lookup's path matches the field's current text. `getClasspathEntry()`/`setClasspathEntry()` preserve the persisted value across the new asynchrony via `pendingClasspathSelection`, so `BbjSettingsConfigurable.reset()`'s home-then-classpath sequencing can't be wiped by a not-yet-landed background lookup. `BbjSettingsConfigurable.java` itself is untouched.
- Four new test classes (24 tests total) plus the whole-suite gate: `./gradlew test` green at 141 tests, 0 failures (117 baseline + 24 new).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end cached Node version — the editor notification through a stat-keyed memo** - `c0577cd` (feat)
2. **Task 2: Debounced background lookup seam with staleness discard and EDT refusal** - `857096f` (feat)
3. **Task 3: Settings dialog does no filesystem or subprocess work on the EDT** - `55648f9` (feat)

**Plan metadata:** (this commit)

_Note: this is a tracer+tdd plan; each task's commit bundles its failing-test-first coverage together with the production change, consistent with how 79-01's tasks were committed._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java` - stat-keyed memo in front of `BbjNodeDetector.getNodeVersion`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java` - all Settings-dialog file/subprocess work, called only off the EDT
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ThreadProbe.java` - EDT-refusal seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java` - per-field debounce with staleness discard, over the 79-01 `Scheduler` seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` - both version branches resolve through the cache
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - debounced listeners, pure-reader validators, pending classpath-selection preservation
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeVersionCacheTest.java` - 7 behavioural tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncerTest.java` - 7 behavioural tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java` - 4 source-guard assertions
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java` - 6 source-guard assertions

## Decisions Made

- Rephrased one `KeystrokeDebouncer` javadoc sentence that originally referenced `Scheduler#cancelAll()` by name — the literal substring `cancelAll(` inside that comment would have tripped Task 2's own acceptance-criteria grep for "does not contain `cancelAll(`" against the whole file. No behavior change; comment wording only, caught before committing.

## Deviations from Plan

None - plan executed exactly as written. The one wording fix above was caught and corrected before any commit, so it never landed as a deviation from a committed state — noted here for completeness rather than as a "Deviations" entry.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EDT-02 and EDT-03 are satisfied; phase 79's remaining requirement (EDT-06, `DownloadGuard`) is owned by plan 79-03, which touches no file this plan touched (per D-16 file-ownership split).
- `BbjNodeVersionCache` now has two consumers (Settings dialog via `BbjSettingsLookups`, notification provider directly); plan 83's Node download/cache regression coverage may add a third.
- The `Scheduler`/`AlarmScheduler` seam from 79-01 was consumed unchanged — no second scheduling abstraction was introduced, matching REQUIREMENTS.md's Out of Scope constraint.

## Self-Check: PASSED

- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ThreadProbe.java
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeVersionCacheTest.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncerTest.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java
- FOUND commit c0577cd (feat(79-02): stat-keyed Node version cache fronting the editor notification)
- FOUND commit 857096f (feat(79-02): debounced background lookup seam with staleness discard and EDT refusal)
- FOUND commit 55648f9 (feat(79-02): Settings dialog does no filesystem or subprocess work on the EDT)
- CONFIRMED: `./gradlew test` (whole suite) → BUILD SUCCESSFUL, 141 tests, 0 failures

---
*Phase: 79-edt-responsiveness*
*Completed: 2026-09-04*
