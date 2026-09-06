---
phase: 83-regression-test-hardening
plan: 02
subsystem: testing
tags: [junit5, intellij-plugin, edt-responsiveness, settings-dialog, node-availability]

# Dependency graph
requires:
  - phase: 79-edt-responsiveness
    provides: BbjSettingsLookups, KeystrokeDebouncer, BbjNodeVersionCache, and the debounced background-lookup wiring this plan adds a failure path and a decision seam behind
affects: [83-03, future-settings-dialog-changes, future-node-availability-changes]

# Actuals (#2632)
actuals:
  tokens: 14400
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Failure-carrying result records: a boolean failed component on an existing result record, produced by a try/catch inside a package-private injectable overload, so a throwing collaborator can never escape the debounced background task"
    - "Plain-Java decision seam (NodeAvailability) with no IntelliJ platform import, extracted mechanically from an inline branch that needed a live Application to execute"
    - "Method-body-window source guards (bodyOf helper: locate a declaration, brace-match to the closing brace) rather than whole-file text search, for every new guard this plan adds"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsFailurePathTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeAvailabilityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/DebouncedLookupFailureDeliveryTest.java
    - .planning/todos/pending/2026-09-06-configured-node-path-suppresses-cached-download-fallback.md
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java

key-decisions:
  - "The Settings-lookup catch lives at the lookup layer (BbjSettingsLookups), not in the debouncer, so the debouncer's contract and constructor arity stay unchanged; a future lookup function that still throws would still escape the scheduled task, which DebouncedLookupFailureDeliveryTest pins as the executable reason today's two lookups must not throw"
  - "NodeLookup/HomeLookup gained a fifth/fourth failed boolean component rather than a separate failure type, since both records are constructed only inside BbjSettingsLookups.java (confirmed by search) and every other file reads them only through accessors"
  - "A configured-but-unusable Node path never consults the cached download — that is today's behaviour, pinned rather than changed, and filed as a todo since changing it is a product decision"
  - "The plan's stated placeholder-literal count of exactly 3 was a miscount: main already carried 4 occurrences of \"(set BBj home first)\" before this plan (initial combo construction, document listener, the pre-existing invalid-home branch, and the getClasspathEntry() equality check) — this plan's new failure branch reuses the identical literal, making the true total 5. The guard test and this plan's acceptance check were both written against the accurate figure of 5; no new wording was introduced and no site was lost"

requirements-completed: [BUILD-04]

coverage:
  - id: D1
    description: "A Settings lookup that throws returns a failure-marked result instead of propagating, and that result clears the dialog's stuck pending state through the existing apply path"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsFailurePathTest.java (all 8 tests)"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java (all 5 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Neither ComponentValidator draws a conclusion from a failed lookup; the classpath placeholder wording is unchanged"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java#thePlaceholderLiteralCountAccountsForEveryPreExistingSiteAndTheOneNewFailureBranch"
        status: pass
    human_judgment: false
  - id: D3
    description: "A failure result travels the debouncer's delivery machinery exactly like a success result: exactly-once UI-hook delivery, staleness discard, no second delivery route, and a throwing lookup still escapes the scheduled task"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/DebouncedLookupFailureDeliveryTest.java (all 5 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both editor-banner branches (configured path, PATH-detected/cached-download) are decided by a plain-Java function that tests execute directly, with the banner panel itself untouched"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeAvailabilityTest.java (all 10 tests)"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java (all 6 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every Phase 79 EDT fix site (EDT-01..EDT-06) is mapped to a named test class and method, closing the phase's #569 residual evidence"
    requirement: "BUILD-04"
    verification:
      - kind: other
        ref: "coverage map in this SUMMARY's 'EDT-01..06 Coverage Map' section"
        status: pass
    human_judgment: false
  - id: D6
    description: "The whole IntelliJ module suite passes with zero failures at the final commit"
    requirement: "BUILD-04"
    verification:
      - kind: integration
        ref: "./gradlew test (462 tests, 0 failures, 0 ignored)"
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-09-06
status: complete
---

# Phase 83 Plan 02: Settings Failure Path and EDT Residual Coverage Summary

**A failing Settings-dialog lookup now clears its stuck pending state through a failure-carrying `NodeLookup`/`HomeLookup`, and the missing-Node editor banner's two branches are decided by a new plain-Java `NodeAvailability` seam that plain JUnit drives directly.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-06T08:09:00Z (approx.)
- **Completed:** 2026-09-06T08:36:00Z
- **Tasks:** 3
- **Files created/modified:** 10

## Accomplishments

- `BbjSettingsLookups.lookupNode`/`lookupHome` each gained a package-private, injectable-collaborator overload wrapped in a `try`/`catch (RuntimeException)`; a throwing collaborator on any of the four collaborator positions now returns a failure-marked `NodeLookup`/`HomeLookup` instead of escaping the debounced background task.
- `BbjSettingsComponent.applyNodeLookup`/`applyHomeLookup` each branch on `lookup.failed()` first: the Node label settles on "Could not check Node.js version" and the classpath combo returns to its normal disabled placeholder, clearing the "Checking Node.js version…" / stuck-pending state a throwing lookup used to leave behind indefinitely.
- Both `ComponentValidator` bodies short-circuit on a failed lookup, so a lookup that blew up never renders as "File not found" or "BBj.properties not found".
- `NodeAvailability` extracts the missing-Node editor banner's decision into a plain-Java seam (`Decision` enum, `FileProbe`, `decide(...)` over six injected collaborators, an exhaustive `bannerNeeded(Decision)` switch) with zero IntelliJ platform import, so both banner branches — the configured-path branch and the detect-then-cache branch — now execute under plain JUnit instead of requiring a live `Application`.
- `BbjMissingNodeNotificationProvider.collectNotificationData` delegates to the seam; the banner panel and its three action labels are unchanged, character for character.
- `DebouncedLookupFailureDeliveryTest` proves a failure-marked result travels `KeystrokeDebouncer`'s delivery machinery exactly like a success result — exactly-once UI-hook delivery, staleness discard, no second delivery route, coalescing to one apply, and a still-throwing lookup escaping the scheduled task (the executable reason the Settings lookups must not throw).
- A todo was filed for the configured-but-unusable-path/cached-download asymmetry `NodeAvailabilityTest` pins rather than changes — a plausible mechanism for a prior Windows UAT observation.

## Task Commits

Each task was committed atomically:

1. **Task 1: A failing Settings lookup, end to end — failure result, apply sink, validator, label** - `41b7287f` (feat)
2. **Task 2: Both editor-banner branches, executed — the Node availability decision seam** - `ea9f3b08` (feat)
3. **Task 3: Failure delivery through the debouncer, the EDT-01..06 coverage map, and one mutation per new class** - `e71084cb` (test)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java` — failure-carrying `NodeLookup`/`HomeLookup` records, injectable overloads with a catch
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` — failure branches in both apply sinks and both validators
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` — the banner decision seam (new)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` — delegates to the seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsFailurePathTest.java` — behavioral coverage of the lookup failure path (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java` — scoped structural guards for the failure path (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeAvailabilityTest.java` — behavioral coverage of both banner branches (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java` — extended with two new guards, four existing guards re-pointed at the delegated call
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/DebouncedLookupFailureDeliveryTest.java` — behavioral coverage of failure delivery through the debouncer (new)
- `.planning/todos/pending/2026-09-06-configured-node-path-suppresses-cached-download-fallback.md` — the configured-path asymmetry finding (new)

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: the plan's stated placeholder-literal count (exactly 3) was a miscount against `main`'s actual pre-existing state (4 sites, not 2), so the guard test and acceptance check were both corrected to the accurate total of 5 rather than forcing an artificial count by removing pre-existing, still-needed code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan's stated baseline] Placeholder literal count corrected from the plan's stated 3 to the actual 5**
- **Found during:** Task 1, writing `BbjSettingsFailureStateSourceGuardTest` and running the plan's literal `grep -c 'set BBj home first' BbjSettingsComponent.java` verify command
- **Issue:** The plan's action text and verify step assert the placeholder literal `"(set BBj home first)"` appears exactly 3 times across `BbjSettingsComponent.java` after this plan's change (document listener, invalid-home branch, new failure branch). Checking `main` at this plan's starting commit shows the literal already appeared 4 times before any edit — the plan's read_first omitted the initial `classpathCombo` construction and the `getClasspathEntry()` equality check. Adding the new failure branch (as instructed, reusing the identical wording) makes the true total 5, not 3. Satisfying "exactly 3" literally would require deleting the initial-construction site or the `getClasspathEntry()` check, both of which are still functionally necessary and neither of which the plan's action text asked to touch.
- **Fix:** Implemented the failure branch exactly as specified (reuses the existing literal, introduces no new wording, touches no pre-existing site). Wrote `thePlaceholderLiteralCountAccountsForEveryPreExistingSiteAndTheOneNewFailureBranch` to assert the accurate total of 5, with a comment enumerating all five sites, preserving the guard's actual intent (a sixth, unaccounted-for wording fails the build) rather than the plan's miscounted number.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` (implementation, not scope), `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java` (guard assertion)
- **Verification:** `grep -c 'set BBj home first' BbjSettingsComponent.java` prints 5 on the final tree; the guard test passes; the whole module suite is green.
- **Committed in:** `41b7287f` (Task 1's commit)

**2. [Rule 1 - Bug] Two newly-added lines briefly carried a decision-id reference**
- **Found during:** Source-hygiene grep run before staging each task's files
- **Issue:** A javadoc line I added to `BbjSettingsLookups.java`'s new overload, and the class javadoc of both new test classes (`BbjSettingsLookupsFailurePathTest`, `BbjSettingsFailureStateSourceGuardTest`), briefly cited `(D-13)` / `(D-13, priority fix 1 ...)`. `BbjMissingNodeNotificationSourceGuardTest`'s rewritten class javadoc similarly cited `(EDT-03, #543)`.
- **Fix:** Reworded all four references in plain prose, keeping the GitHub issue number (`#543`) where it was already present, per this plan's source-hygiene requirement.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsFailurePathTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java`
- **Verification:** Source-hygiene grep clean on every touched file (checked against each commit's actual diff, since pre-existing unchanged `(D-12)` javadoc lines elsewhere in the same files do not appear as added lines and are correctly left alone); whole module suite green.
- **Committed in:** `41b7287f`, `ea9f3b08`

---

**Total deviations:** 2 auto-fixed (1 plan-baseline miscount corrected to the accurate figure with no scope change, 1 source-hygiene cleanup on newly-added text)
**Impact:** Neither fix changed behavior or introduced new wording; both keep the plan's actual intent (drift detection, no planning identifiers in source) intact. No scope creep.

## Mutation Testing (D-16, C-02)

One red/green mutation cycle recorded for each new test class, mutation never committed (confirmed with `git status --short -- bbj-intellij` clean before each stage):

### 1. `BbjSettingsLookupsFailurePathTest`

- **Mutation applied:** In `BbjSettingsLookups.lookupNode`'s injectable overload, changed `catch (RuntimeException e)` to `catch (NullPointerException e)`, so the `IllegalStateException` the tests throw is no longer caught.
- **Result:** 2 of 8 tests failed:
  `aVersionResolverThatThrowsYieldsAFailedNodeLookupRatherThanPropagating() FAILED — java.lang.IllegalStateException`
  `aMinimumVersionCheckThatThrowsAlsoYieldsAFailedNodeLookup() FAILED — java.lang.IllegalStateException`
- **Reverted; re-run confirmed green** (8 tests, 0 failures).

### 2. `NodeAvailabilityTest`

- **Mutation applied:** In `NodeAvailability.bannerNeeded`, moved `CONFIGURED_PATH_UNUSABLE` out of the `true` case into the `false` case of the exhaustive switch.
- **Result:** 3 of 10 tests failed:
  `bannerNeededIsTrueForExactlyTwoOfTheFiveDecisions() FAILED`
  `aConfiguredPathThatDoesNotExistNeedsTheBanner() FAILED`
  `aConfiguredPathWithATooOldVersionNeedsTheBannerAndNeverConsultsTheCachedDownload() FAILED`
  (all `org.opentest4j.AssertionFailedError`)
- **Reverted; re-run confirmed green** (10 tests, 0 failures).

### 3. `BbjSettingsFailureStateSourceGuardTest`

- **Mutation applied:** In `BbjSettingsComponent.applyHomeLookup`, swapped the order of the `if (lookup.failed())` and `else if (!lookup.valid())` branches, so the failure check runs after the valid-home check.
- **Result:** `applyHomeLookupsFailureBranchPrecedesTheFirstValidReadAndThePendingFlagIsAlreadyClearedByThen() FAILED — org.opentest4j.AssertionFailedError`
- **Reverted; re-run confirmed green** (5 tests, 0 failures).

### 4. `DebouncedLookupFailureDeliveryTest`

- **Mutation applied:** In `KeystrokeDebouncer.onTextChanged`'s scheduled task, removed the `if (text.equals(currentText.get()))` staleness guard so the UI hop applies unconditionally.
- **Result:** 2 tests failed (this plan's new test AND the pre-existing sibling test, confirming the mutation is a meaningful, shared-contract regression, not a coincidence of one test's design):
  `DebouncedLookupFailureDeliveryTest.aFailureMarkedResultIsDiscardedWhenTheFieldTextChangedBeforeTheLookupRan() FAILED`
  `KeystrokeDebouncerTest.aStaleResultWhenCurrentTextChangedBeforeTheLookupRanIsNotApplied() FAILED`
  (both `org.opentest4j.AssertionFailedError`)
- **Reverted; re-run confirmed green** (5 + 7 tests across both classes, 0 failures).

## EDT-01..06 Coverage Map (#569 closure evidence, D-12, D-18)

One row per Phase 79 fix site. This table, alongside 83-01's Node-pipeline coverage map, is the material for the eventual closing comment on issue #569 — posting that comment is a follow-up this plan prepares but does not run.

| Requirement | Production site | Behaviour that must hold | Test class / method | Coverage status |
|---|---|---|---|---|
| EDT-01 | `BbjRunActionBase` / `BbjEMLoginAction` | Run As BUI/DWC and EM login assert off-EDT at runtime | `OffEdtDispatchSourceGuardTest` (all 4 tests) | Pre-existing |
| EDT-02 | `BbjSettingsComponent` / `BbjSettingsLookups` / `KeystrokeDebouncer` | Settings keystrokes never touch the filesystem or spawn a subprocess on the EDT; staleness discard | `KeystrokeDebouncerTest`, `BbjSettingsComponentSourceGuardTest` | Pre-existing |
| EDT-02 (residual) | `BbjSettingsLookups` / `BbjSettingsComponent` | A throwing lookup returns a failure result rather than leaving the dialog stuck; the failure result is staleness-checked and delivered exactly once through the debouncer | `BbjSettingsLookupsFailurePathTest` (8 tests), `BbjSettingsFailureStateSourceGuardTest` (5 tests), `DebouncedLookupFailureDeliveryTest` (5 tests) | **Added by this plan** |
| EDT-03 | `BbjMissingNodeNotificationProvider` / `BbjNodeVersionCache` | `node --version` resolves through the stat-keyed cache, one spawn per unchanged path | `BbjNodeVersionCacheTest`, `BbjMissingNodeNotificationSourceGuardTest` | Pre-existing |
| EDT-03 (residual) | `BbjMissingNodeNotificationProvider` | Both editor-banner branches (configured path, PATH-detected/cached-download) execute under plain JUnit rather than requiring a live IDE | `NodeAvailabilityTest` (10 tests), `BbjMissingNodeNotificationSourceGuardTest`'s two new guards | **Added by this plan** |
| EDT-04 | `BbjServerService` | First-crash restart delay is a scheduled delay, not an occupied thread | `RestartGateTest.theCrashDelayIsAScheduledDelayNotAnOccupiedThread` | Pre-existing |
| EDT-05 | `BbjServerService` / `RestartGate` | All restart triggers funnel through one coalescing gate; a manual trigger arriving during the pending first-crash delay merges into it rather than adding a second restart | `RestartGateTest.aManualTriggerArrivingDuringThePendingFirstCrashDelayMergesIntoIt`, `BbjServerServiceRestartSourceGuardTest` | Pre-existing (the restart-coalescing behaviour 83-CONTEXT.md flagged as a potential gap turned out to already be covered — the gap-driven method working as intended, not a reduction) |
| EDT-06 | `DownloadGuard` / `BbjNodeDownloader` | Download serialization; drained completions reach the UI executor exactly once, in order, isolated from a throwing sibling | `DownloadGuardTest`, `BbjNodeDownloaderSourceGuardTest.drainedCompletionsAreDispatchedThroughDownloadCompletionsExactlyOnce`, 83-01's `DownloadCompletionsTest` | Pre-existing / covered by 83-01 |

No row is left without a test citation.

## Issues Encountered

- **Register-check verify command uses `origin/main`, which is stale relative to local `main`** (same environment condition 83-01's SUMMARY recorded). Task 3's literal verify command (`git diff origin/main ...`) would surface dozens of pre-existing planning-identifier hits from already-landed phases that have nothing to do with this plan's diff. The register-check was instead run against this plan's own starting commit (`2946da59`, the tip immediately before Task 1's first commit) — clean, once the two hygiene fixes described above were made.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `NodeAvailability` is a new reusable seam; 83-03 owns disjoint files (LSP4IJ coupling canaries) and was unaffected by this plan's work.
- The configured-path/cached-download asymmetry and the live-Windows check from 83-01 remain the two open todos this phase's regression coverage surfaced but did not resolve, per the plan's own scope boundary (test-hardening, not product-behaviour changes).
- Whole IntelliJ module suite: 462 tests, 0 failures, 0 ignored at the final commit (up from 432 at the end of 83-01).

---
*Phase: 83-regression-test-hardening*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk; all three task commit hashes confirmed in `git log`.
