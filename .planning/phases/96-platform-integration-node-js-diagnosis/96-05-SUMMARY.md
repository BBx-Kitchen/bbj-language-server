---
phase: 96-platform-integration-node-js-diagnosis
plan: 05
subsystem: ide-plugin
tags: [intellij, node-js, lsp4ij, validation-engine, plain-java-seam]

requires:
  - phase: 96-platform-integration-node-js-diagnosis
    provides: "96-04's notification provider base (BbjNotificationProviderBase), not consumed here but confirms the base's home before the sibling plan wires this engine into it"
provides:
  - "NodeExecutableResolver as the single Node.js decision engine, with a sixth (minimum-version) validation step and a distinguishable cache-inaccessible rejection"
  - "NodePresentation, a platform-free seam turning a Resolution into a reason-specific banner sentence and a reason-specific action-id set"
affects: [96-06]

actuals:
  tokens: 6300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Additive overload over signature-breaking change: NodeExecutableResolver's pinned 4-arg resolve() becomes a documented no-version-gating delegator to a new 7-arg overload, so 24 pre-existing tests need zero edits"
    - "Platform-free presentation seam (InteropStatusPresentation/ConfigReloadPresentation convention): NodePresentation has no com.intellij import, plain statics, null means no banner"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverVersionGatingTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodePresentationTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java

key-decisions:
  - "The version-aware overload carries seven arguments, not the six 96-RESEARCH.md's Pattern 2 sketched: the extra argument is the cache-directory-accessible boolean, needed because validate()'s blank-candidate skip cannot know an IOException occurred -- only the caller (BbjLanguageServer, via BbjNodeDownloader.isNodeDataDirectoryAccessible()) knows that. No second Reason/Source vocabulary was introduced."
  - "The cache-inaccessible branch is handled in resolve() itself, not inside validate() -- validate()'s blank-candidate silence stays correct for 'not configured' and is unchanged; the CACHED branch checks cacheDirectoryAccessible before ever calling validate()."
  - "BbjSettingsLookups' Settings-field validator was deliberately left calling BbjNodeVersionCache.SESSION::getVersion and BbjNodeDetector::meetsMinimumVersion directly, not routed through the resolver -- same-behavior refactor with no user-visible effect, out of scope for this plan per 96-RESEARCH.md Open Question 3."

requirements-completed: []  # PLAT-04 and PLAT-05 stay PENDING -- plan 96-06 also declares both and has not run; see Next Phase Readiness.

coverage:
  - id: D1
    description: "A too-old configured Node.js is rejected by the resolver (sixth validation step) and the startup path enforces the same rule -- the language server no longer silently launches on an unsupported runtime"
    requirement: "PLAT-04"
    verification:
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#aConfiguredCandidatePassingTheFirstFiveStepsButFailingTheVersionCheckIsRejected"
        status: pass
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#aConfiguredCandidateMeetingTheMinimumVersionStillResolvesFromSettings"
        status: pass
    human_judgment: true
    rationale: "This is one of the phase's declared INTENDED OBSERVABLE CHANGES (D-06) -- a too-old configured Node.js now fails to start the language server where it used to start silently. Unit coverage proves the engine's decision; the end-user-visible startup behavior must be confirmed at phase-end UAT per the plan's own instruction."
  - id: D2
    description: "A configured-but-too-old Node.js falls through to a valid cached download exactly like a configured-but-missing one already does -- no new fall-through branch was added"
    requirement: "PLAT-05"
    verification:
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#aConfiguredCandidateBelowTheMinimumVersionFallsThroughToAValidCachedCandidate"
        status: pass
    human_judgment: false
  - id: D3
    description: "The cache directory being inaccessible is distinguishable from the cache being merely empty, structurally through one new Reason constant (no second result vocabulary)"
    requirement: "PLAT-04"
    verification:
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#anInaccessibleCacheWithNoOtherCandidateUsableRecordsExactlyOneCachedRejection"
        status: pass
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#anAccessibleButEmptyCacheRecordsNoCachedRejectionAtAll"
        status: pass
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#anInaccessibleCacheDoesNotPreventAValidConfiguredCandidateFromResolving"
        status: pass
    human_judgment: false
  - id: D4
    description: "The version resolver is consulted at most once per distinct candidate per resolve call, and never for a candidate that already failed an earlier structural step -- the sixth step really is sixth"
    verification:
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#theVersionResolverIsNeverConsultedForACandidateThatAlreadyFailedAnEarlierStep"
        status: pass
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#theVersionResolverIsConsultedAtMostOnceForADistinctCandidateWithinOneResolveCall"
        status: pass
    human_judgment: false
  - id: D5
    description: "The pre-existing four-argument resolve() overload performs no version gating and NodeExecutableResolverTest's 24 cases pass with zero edits"
    verification:
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest#theLegacyFourArgumentOverloadNeverRejectsOnVersionEvenForAVersionThatWouldFail"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverTest.java"
        status: pass
    human_judgment: false
  - id: D6
    description: "NodePresentation turns a Resolution into a reason-specific sentence and reason-specific action set; the cache-inaccessible case drops the doomed download action while every other case keeps all three action ids in stable order"
    requirement: "PLAT-04"
    verification:
      - kind: unit
        ref: "NodePresentationTest#theInaccessibleCacheCaseYieldsANonEmptyActionListExcludingDownload"
        status: pass
      - kind: unit
        ref: "NodePresentationTest#theNothingConfiguredNothingFoundCaseStillOffersAllThreeIds"
        status: pass
      - kind: unit
        ref: "NodePresentationTest#noTwoDistinctReasonsCollapseToTheSameSentence"
        status: pass
      - kind: unit
        ref: "NodePresentationTest#aResolvedResolutionYieldsANullSentenceAndAnEmptyActionList"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 05: Node.js Decision Engine Summary

**`NodeExecutableResolver` gains a version-gating sixth validation step and a distinguishable cache-inaccessible rejection; `NodePresentation` turns either into a reason-specific banner sentence and action set — the engine half of unifying the plugin's two Node.js decision seams.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-20T02:11:00Z
- **Completed:** 2026-09-20T02:31:00Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `NodeExecutableResolver` gained a sixth validation step (minimum Node.js version, resolved through the stat-keyed `BbjNodeVersionCache`) via a new additive 7-argument `resolve()` overload; the pinned 4-argument `resolve()` is now a documented no-version-gating delegator, and `NodeExecutableResolverTest`'s 24 existing cases needed zero edits (proven by `git diff --exit-code`).
- A configured-but-too-old Node.js now falls through to a valid detected or cached candidate through the exact same three-branch structure that already handled a configured-but-missing path — no new fall-through logic was written, only the new rejection reason feeding the pre-existing mechanism.
- `BbjLanguageServer.resolveNodePath` now calls the version-aware overload, so the startup path enforces the same minimum-version rule the banner has always shown (previously it did not check version at all).
- Added `BbjNodeDownloader.isNodeDataDirectoryAccessible()` so "nothing downloaded yet" and "the cache directory itself could not be accessed" are distinguishable to every caller; `getCachedNodePath()`'s signature and swallowed `IOException` are untouched.
- Created `NodePresentation`, a platform-free (`com.intellij`-free) seam that picks the most informative rejection and returns both a banner sentence and an ordered action-id list, dropping the download action id only for the cache-inaccessible case.

## Task Commits

1. **Task 1: A too-old configured Node.js stops starting the language server -- version gate end to end** - `c98b039c` (feat)
2. **Task 2: An inaccessible cache directory stops looking like an empty one** - `cdf6aa63` (fix)
3. **Task 3: The diagnosis seam -- sentence and action set both vary by reason** - `4ed78c7f` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java` - Added `Reason.BELOW_MINIMUM_VERSION` and `Reason.CACHE_UNAVAILABLE`; added the 7-arg version-aware `resolve()` overload and its sixth validation step; the 4-arg overload now delegates with permissive defaults
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` - Calls the new overload, passing `BbjNodeVersionCache.SESSION::getVersion`, `BbjNodeDetector::meetsMinimumVersion`, and `BbjNodeDownloader.isNodeDataDirectoryAccessible()`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` - Added `isNodeDataDirectoryAccessible()`; `getCachedNodePath()` unchanged
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java` (new) - Platform-free banner text/action-set seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverVersionGatingTest.java` (new) - 11 cases covering the version step, the fall-through, and the cache-accessibility distinction
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodePresentationTest.java` (new) - 4 cases covering both `bannerText`/`bannerActions` methods across every reason

## Decisions Made

- **The overload carries seven arguments, not Pattern 2's sketched six.** 96-RESEARCH.md's Pattern 2 covered only D-06's version collaborators (`versionOf`, `meetsMinimum`) alongside the three candidates and probe. The seventh argument, `cacheDirectoryAccessible` (a `boolean`), was added because D-07's cache-inaccessible distinction cannot be detected inside `validate()`'s generic blank-candidate skip — that skip is correct for "not configured" and only the caller (which caught the `IOException`) can know the difference. 96-RESEARCH.md's Pitfall 1 explicitly sanctioned "a new parameter or overload" for exactly this reason. No second `Reason`/`Source` vocabulary was introduced — the fact rides as a plain boolean parameter, and `resolve()`'s CACHED branch checks it before ever calling `validate()`.
- **`describe(Reason)`'s two new cases:** `BELOW_MINIMUM_VERSION` → "is older than the minimum supported Node.js version"; `CACHE_UNAVAILABLE` → "could not be checked because the plugin's Node.js cache directory could not be accessed". Both fit the existing `render()` template's "{Label} value \"{candidate}\" {reason}." shape; the `CACHE_UNAVAILABLE` rejection's candidate is an empty string since there is no real path when the directory itself could not be checked.
- **`NodePresentation`'s action-id constants** (the sibling banner plan, 96-06, must map these): `ACTION_DOWNLOAD = "download-nodejs"`, `ACTION_CONFIGURE_PATH = "configure-nodejs-path"`, `ACTION_INSTALL_MANUALLY = "install-nodejs-manually"`. Ordering in `bannerActions()` is always `[download, configure, install-manually]` (minus download for the cache-inaccessible case), matching the current banner's action order exactly.
- **`NodePresentation`'s three reason-specific sentences:**
  - Cache inaccessible: "The plugin's Node.js cache directory could not be accessed."
  - Configured path below minimum version: "The configured Node.js is older than the minimum supported version -- Node.js 18+ is required."
  - Nothing configured, nothing found (default, unchanged wording): "Node.js 18+ is required to run the BBj language server"
  - Any other configured-path rejection: "The configured Node.js path {reason}." (e.g. "...does not exist.")
- **`BbjSettingsLookups`' Settings-field validator was deliberately NOT routed through the resolver.** It already calls the same two collaborators (`BbjNodeVersionCache.SESSION::getVersion`, `BbjNodeDetector::meetsMinimumVersion`) the resolver's new step uses, so rerouting it would be a same-behavior refactor with no user-visible effect — out of scope per 96-RESEARCH.md's Open Question 3 and the plan's own assumptions block.
- **`NodeAvailability.java` and `NodeAvailabilityTest.java` were left completely untouched**, per this plan's explicit scope boundary — 96-06 owns their removal, since it is the last plan whose banner rewrite retires that caller.

## Deviations from Plan

None — plan executed exactly as written. The plan's own assumptions block (the seven-argument overload, and not rerouting `BbjSettingsLookups`) were followed as specified, not deviations from it.

## Confirmed: `NodeExecutableResolverTest.java` never edited

Verified after every task via `git diff --exit-code -- bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverTest.java` (exit 0 each time) and again by the final `git diff --stat` across all three commits, which shows only the six files in this plan's `files_modified` list.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## UAT Declaration — Intended Observable Change

**Per this plan's `<intended_observable_change>` and 96-CONTEXT.md's D-06:** a configured Node.js below the minimum supported version is now REJECTED at startup and the language server falls through to a detected or cached candidate — where before this plan, it silently launched on the unsupported runtime. This is a deliberate, intended change, not a regression. It must be declared at phase-end UAT alongside the phase's other four intended observable changes (D-01, D-07/D-08, D-09, D-10). The `NodeExecutableResolverVersionGatingTest` suite proves the engine-level decision; the end-to-end IDE-visible behavior (does the language server actually fail to start, and does the banner reflect it) is confirmed once the sibling plan 96-06 wires the banner onto this engine.

## Next Phase Readiness

- The engine (`NodeExecutableResolver`) and its presentation seam (`NodePresentation`) are ready for plan 96-06, which is the last caller `NodeAvailability` has and must retire it and its ten pinned tests as part of switching `BbjMissingNodeNotificationProvider` onto this engine.
- **PLAT-04 and PLAT-05 are intentionally left PENDING in REQUIREMENTS.md.** Both requirements are declared by this plan AND by 96-06; per this repo's shared-ID convention (a requirement stays Pending until every declaring plan has a SUMMARY), they will flip to Complete only after 96-06 finishes and the banner actually shows the unified diagnosis to the user.
- No blockers for 96-06. `BbjMissingNodeNotificationProvider.java` is untouched and still calls `NodeAvailability.decide` — 96-06's own Task 1 is the call-site swap onto `NodeExecutableResolver.resolve(...)` plus `NodePresentation`.

## Self-Check: PASSED

- All three commit hashes (`c98b039c`, `cdf6aa63`, `4ed78c7f`) found in `git log --oneline --all`.
- All six files in `files_modified`/created exist on disk at their stated paths.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverTest.java` is byte-identical to its pre-plan state (`git diff --exit-code`, exit 0).
- `grep -c "com.intellij" .../NodePresentation.java` prints `0`.
- Whole IntelliJ suite green under `./gradlew test --rerun-tasks` (123 test classes executed fresh, 0 failures, 0 errors).
- No `D-NN`, plan-number, `C-`, `CR-`, or `PLAT-` token found in any `.java` file touched by this plan (verified by grep before every commit).

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*
