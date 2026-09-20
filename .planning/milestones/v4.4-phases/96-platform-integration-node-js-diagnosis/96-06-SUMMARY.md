---
phase: 96-platform-integration-node-js-diagnosis
plan: 06
subsystem: ide-plugin
tags: [intellij, node-js, lsp4ij, notification-provider, resolver-engine]

requires:
  - phase: 96-platform-integration-node-js-diagnosis
    provides: "96-04's BbjNotificationProviderBase (thin-subclass shape, shared panel factory) and 96-05's NodeExecutableResolver seven-argument overload plus NodePresentation seam"
provides:
  - "BbjMissingNodeNotificationProvider routed through NodeExecutableResolver.resolve(...) and NodePresentation -- the banner and the language server startup path now share one decision engine"
  - "NodeAvailability and its ten pinned tests removed from the tree -- exactly one Node.js decision engine remains"
  - "BbjMissingNodeNotificationSourceGuardTest rewritten to pin the resolver-based call shape"
affects: []

actuals:
  tokens: 3200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Banner provider consumes the same seven-argument resolver overload and platform-free presentation seam the startup path already used (96-05) -- one engine, two callers, zero drift surface"
    - "Action-id-driven button construction: the provider maps NodePresentation's ordered action ids onto createActionLabel calls in a loop, rather than hardcoding which buttons appear"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropPollPolicy.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjHexLiteral.java

key-decisions:
  - "NodeAvailability retired outright (not kept as a thin wrapper), per 96-CONTEXT.md's assumptions block and 96-RESEARCH.md's recommendation -- a wrapper that still branches independently is exactly the drift surface D-05 exists to close."
  - "BbjMissingNodeNotificationSourceGuardTest rewritten in place under its original name and path, keeping its readGuardedSource/countOccurrences/bodyOf helpers, rather than replaced -- the file name still describes exactly what it guards and a rename would lose its git history back to #543."
  - "Discovered during Task 2's whole-tree grep: three unrelated files (InteropProbeClient, InteropPollPolicy, BbjHexLiteral) held javadoc @link/{@code} mentions of NodeAvailability as an example of the plain-Java-seam convention. Repointed all three to NodeExecutableResolver rather than leaving dangling documentation references to a deleted class -- in scope of Task 2's own 'nothing else references it' confirmation, not a separate deviation."

requirements-completed: [PLAT-04, PLAT-05]

coverage:
  - id: D1
    description: "The editor banner and the language server startup path reach their verdict through the same NodeExecutableResolver.resolve(...) call, with the same configured/detected/cached fallback and the same six-step validation -- the banner can no longer claim Node.js is missing on a machine whose server started fine"
    requirement: "PLAT-04"
    verification:
      - kind: other
        ref: "BbjMissingNodeNotificationSourceGuardTest#collectNotificationDataDelegatesToTheAvailabilitySeamExactlyOnceWithTheArgumentsInOrder"
        status: pass
      - kind: unit
        ref: "NodeExecutableResolverVersionGatingTest (whole class, 11 cases)"
        status: pass
    human_judgment: true
    rationale: "Coverage of the resolver call shape is structurally pinned by source guard and by the shared engine's own unit tests; the end-to-end IDE-visible agreement between banner and startup (does a broken configured path with a valid cached download show no banner and start the server) requires a running IDE and is one of this plan's declared UAT items."
  - id: D2
    description: "The banner's sentence and its action set both vary by reason; the cache-inaccessible case no longer offers Download Node.js, closing #588's doomed-retry scenario"
    requirement: "PLAT-05"
    verification:
      - kind: other
        ref: "BbjMissingNodeNotificationSourceGuardTest#theBannerTextAndActionSetBothComeFromTheSharedPresentationSeam"
        status: pass
      - kind: unit
        ref: "NodePresentationTest (whole class, 4 cases)"
        status: pass
    human_judgment: true
    rationale: "This is a declared INTENDED OBSERVABLE CHANGE -- unit and source-guard coverage prove the engine and wiring decision; the actual banner appearance (no Download Node.js button when the cache directory is unwritable) must be confirmed at phase-end UAT."
  - id: D3
    description: "The superseded NodeAvailability seam and its ten pinned tests are gone from the tree; no file under bbj-intellij/src references the deleted class as a live symbol"
    verification:
      - kind: other
        ref: "git status -- NodeAvailability.java and NodeAvailabilityTest.java staged as deletions"
        status: pass
      - kind: other
        ref: "grep -rn NodeAvailability bbj-intellij/src --include=*.java (only the guard test's own negative-assertion literal and its prose remain)"
        status: pass
    human_judgment: false
  - id: D4
    description: "BbjMissingNodeNotificationProvider stays a thin subclass of BbjNotificationProviderBase -- no locally re-introduced file-type guard or panel construction"
    verification:
      - kind: other
        ref: "grep -c collectNotificationData / implements EditorNotificationProvider on the provider file: both 0"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 06: Banner-to-Engine Unification Summary

**`BbjMissingNodeNotificationProvider` now resolves through `NodeExecutableResolver.resolve(...)` and renders `NodePresentation`'s reason-specific sentence and action set; the superseded `NodeAvailability` seam and its ten pinned tests are deleted, leaving exactly one Node.js decision engine in the plugin.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-20T02:31:00Z (continuing from 96-05's session)
- **Completed:** 2026-09-20T02:51:00Z
- **Tasks:** 2
- **Files modified:** 6 (1 rewritten test, 2 deleted, 3 incidental javadoc fixes)

## Accomplishments

- `BbjMissingNodeNotificationProvider.buildPanel` now calls `NodeExecutableResolver.resolve(...)` with the exact same seven arguments, in the same order, that `BbjLanguageServer.resolveNodePath` already used: configured path, detected path, cached path, the cache-accessibility fact, the real filesystem probe, the shared version cache, and the minimum-version check. The banner and the language server startup path are now provably the same decision, not two seams that can drift.
- The banner's sentence comes from `NodePresentation.bannerText(resolution)` (null means no banner), and its action set comes from `NodePresentation.bannerActions(resolution)`, mapped onto `createActionLabel` calls in the returned id order. The three action labels and their handlers (download, configure path, install manually) are byte-identical to before.
- Deleted `NodeAvailability.java` and `NodeAvailabilityTest.java` (ten tests) after confirming by whole-tree grep that the banner provider was their only production caller. Nine of the ten tests asserted the behaviour of a class that no longer exists; the tenth, `aConfiguredPathWithATooOldVersionNeedsTheBannerAndNeverConsultsTheCachedDownload`, pinned exactly the asymmetry this phase reverses -- its inverted replacement, `aConfiguredCandidateBelowTheMinimumVersionFallsThroughToAValidCachedCandidate`, already exists in 96-05's `NodeExecutableResolverVersionGatingTest`.
- Rewrote `BbjMissingNodeNotificationSourceGuardTest` in place (same file, same class, same helpers) to pin the new shape: exactly one `NodeExecutableResolver.resolve(` delegation inside `buildPanel`'s body with its seven arguments in documented order (verified by successive `indexOf` comparisons), exactly one call each to `NodePresentation.bannerText(` and `NodePresentation.bannerActions(` with the no-banner early return ordered before the panel-building fallthrough, the shared version cache still the sole version resolver, and a zero-occurrences assertion against the retired seam's name anywhere in the provider's source.
- The whole-tree grep for Task 2 surfaced three unrelated files (`InteropProbeClient`, `InteropPollPolicy`, `BbjHexLiteral`) whose javadoc cited `NodeAvailability` as an example of the plain-Java-seam convention. Repointed all three to `NodeExecutableResolver` so no file in the tree documents a class that no longer exists.

## Task Commits

1. **Task 1: The banner tells the truth -- one engine, reason-specific sentence, reason-specific actions** - `55df3f8b` (feat)
2. **Task 2: Retire the second engine and rewrite the guard that pinned it** - `d1000d1b` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` - Decision call replaced: `NodeAvailability.decide`/`bannerNeeded` → `NodeExecutableResolver.resolve(...)` + `NodePresentation.bannerText/bannerActions`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java` - Rewritten to pin the resolver-based call shape and the presentation seam, replacing the six-argument `NodeAvailability.decide(` pin
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` - **Deleted** (superseded seam)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeAvailabilityTest.java` - **Deleted** (ten tests, one pinning the now-reversed behaviour)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java` - Javadoc `NodeAvailability` reference repointed to `NodeExecutableResolver`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropPollPolicy.java` - Javadoc `NodeAvailability` reference repointed to `NodeExecutableResolver`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjHexLiteral.java` - Javadoc example list entry repointed from `NodeAvailability` to `NodeExecutableResolver`

## Decisions Made

- **`NodeAvailability` retired outright**, not kept as a thin banner-facing wrapper -- the discretion item 96-CONTEXT.md left open. A wrapper that still branched independently on its own vocabulary would be the exact drift surface D-05 exists to close; the resolver's own `Source`/`Reason` vocabulary is now the single vocabulary in the tree.
- **`BbjMissingNodeNotificationSourceGuardTest` rewritten in place**, not replaced with a new file -- the other discretion item. Same file name, same class, same three private helpers (`readGuardedSource`, `countOccurrences`, `bodyOf`), preserving its git history back to #543 while every assertion inside it now pins the resolver-based shape.
- **Three incidental javadoc fixes folded into Task 2**, not treated as a separate deviation: the task's own instruction to "confirm ... that nothing else references it" via a whole-tree grep surfaced them, and leaving a javadoc `{@link}` pointing at a deleted class would itself violate "no file under `bbj-intellij/src` references the deleted class."
- **Action mapping stayed an if/else-if chain over the returned ids**, not a `switch` or a `Map<String, Runnable>` -- three cases, one loop, no added indirection; matches the sibling `BbjJavaInteropNotificationProvider`'s single-action-label style.

## Deviations from Plan

None — plan executed exactly as written. The three javadoc repoints (see Decisions Made) were performed as part of Task 2's own explicitly required whole-tree confirmation step, not as unplanned scope.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## UAT Declarations — Intended Observable Changes

Per this plan's `<intended_observable_change>` and 96-CONTEXT.md's D-05/D-07/D-08, three user-visible changes are deliberate and must be declared, not dismissed, at phase-end UAT:

1. **The banner's sentence now varies by reason.** A too-old configured Node.js, an inaccessible cache directory, and "nothing found at all" each produce a distinct sentence, instead of the single fixed "Node.js 18+ is required" string shown for every unusable case before this plan.
2. **The banner's action set now varies by reason -- the cache-inaccessible case no longer offers "Download Node.js".** This closes #588's own named failure scenario: a user retrying a download that is doomed to fail again at the same directory-creation step.
3. **A configured-but-unusable Node.js path now consults the cached download before the banner is shown.** The banner inherits the resolver's configured → detected → cached fall-through, so a broken configured path with a valid cached download now starts the server silently and shows no banner at all -- where before this plan, the banner appeared regardless.

These join Phase 96's earlier two intended observable changes already banked by prior plans: the server-crash banner now appearing on `.bbx` files, no longer appearing on `.bbl` files, and appearing during indexing (96-04); and a too-old configured Node.js now failing language-server startup instead of silently launching (96-05).

## Concurrency (edge case, must_haves.truths)

Both the banner (background thread, per-file) and the startup path (pooled thread, once per server launch) route through `BbjNodeVersionCache.SESSION::getVersion` for the version step, whose `ConcurrentHashMap.compute` read-check-spawn-store runs as one atomic operation keyed by file stat. An unchanged path is therefore resolved by at most one `node --version` spawn shared between both callers, proven by 96-05's `NodeExecutableResolverVersionGatingTest#theVersionResolverIsConsultedAtMostOnceForADistinctCandidateWithinOneResolveCall` and the cache's own pre-existing concurrency tests -- unchanged by this plan, since neither caller was given a private resolver.

## Next Phase Readiness

- ROADMAP criterion 4 is fully met in code: the banner's diagnosis matches the startup path's, the two cache states (inaccessible vs. empty) are distinguishable, and the configured-but-unusable path consults the cached download with the decision written down in `NodeExecutableResolver`.
- Exactly one Node.js decision engine exists in the tree; `NodeAvailability` and its ten tests are gone.
- No blockers for **96-07**. PLAT-04 and PLAT-05 are the last two requirements this plan declares alongside 96-05 -- both are now Complete (this was the second and final declaring plan for each).
- **PLAT-06** (Windows attestation) remains Pending, attested by hand at phase end per D-13/D-14/D-15 -- untouched by this plan.
- All five of the phase's declared intended observable changes (color scheme page removed, crash banner `.bbx`/`.bbl`/indexing, too-old-Node startup rejection, and this plan's banner sentence/action-set/fallback trio) are now ready for consolidated end-of-phase UAT.

## Self-Check: PASSED

- Both commit hashes (`55df3f8b`, `d1000d1b`) found in `git log --oneline --all`.
- `BbjMissingNodeNotificationProvider.java` and the rewritten `BbjMissingNodeNotificationSourceGuardTest.java` exist on disk at their stated paths.
- `NodeAvailability.java` and `NodeAvailabilityTest.java` confirmed absent from disk (`[ -f ... ]` false for both) and staged as deletions in both commits.
- `grep -rn "NodeAvailability" bbj-intellij/src --include=*.java` returns only the rewritten guard test's own negative-assertion literal and one prose line describing what it replaced -- no live symbol reference remains anywhere in the tree.
- `./gradlew compileJava --rerun-tasks`, the plan's four `<verify><automated>` commands, and `./gradlew test --rerun-tasks` (whole IntelliJ suite: 1070 tests, 0 failures, 0 errors) all green.
- No `D-NN`, plan-number, `C-`, `CR-`, `COMP-`, or `PLAT-` token found in this plan's staged `.java` diff (verified by grep before each commit).

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*
