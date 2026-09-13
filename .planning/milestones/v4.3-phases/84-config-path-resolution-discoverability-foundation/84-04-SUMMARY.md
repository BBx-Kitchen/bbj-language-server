---
phase: 84-config-path-resolution-discoverability-foundation
plan: 04
subsystem: intellij-plugin
tags: [intellij, lsp4ij, lsp4j, config-path, gson, junit5]

requires:
  - phase: 84-01
    provides: "config-path-resolver.ts (normalizeConfigSetting, expandHome, canonicalizeConfigPath, samePath, resolveConfigPath) and the bbj/resolvedConfigPath request + identically-shaped pushed notification"
provides:
  - "ConfigModels.ResolvedConfigPathResult: the Gson DTO carrying the bbj/resolvedConfigPath payload across LSP4IJ"
  - "ConfigPaths: platform-free normalizeSetting/samePath/configPathArg helpers mirroring config-path-resolver.ts for the same inputs"
  - "BbjConfigPathService: application-level warm cache (volatile, last-push-wins) plus activeConfigPath()/isConfigFile(VirtualFile)/isActiveConfigFile(VirtualFile)/shouldWarnOnce(String)"
  - "BbjComposerServer.resolvedConfigPath() (@JsonRequest) and BbjLanguageClient.resolvedConfigPath(...) (@JsonNotification) on the single server-proxy interface / client class"
affects: [84-05, 87]

actuals:
  tokens: 9369
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Platform-free static-helper-plus-thin-wrapper: BbjConfigPathService exposes package-private static decision methods (resolveActivePath, isConfigFileName, isDefaultConfigFilename) that plain JUnit can call directly, with only the com.intellij-typed instance methods (activeConfigPath(), isConfigFile(VirtualFile)) needing a live Application/VirtualFile"
    - "Source-guard test as the fallback coverage tool for platform-bound wiring that plain JUnit cannot reach directly, following BbjSettingsComponentSourceGuardTest's read-the-source-as-text convention"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigPathsTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigPathServiceSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java

key-decisions:
  - "activeConfigPath()'s decision logic lives in a package-private static resolveActivePath(cachedPath, explicitSetting) so ConfigPathsTest can assert last-push-wins, the explicit-setting fallback, and the empty-when-neither case without a live IntelliJ Application; the public instance method is a one-line delegator that supplies BbjSettings.getInstance().getState().configPath."
  - "isConfigFile/isActiveConfigFile likewise delegate to a static isConfigFileName(activePath, filePath, fileName), so the default-filename match and active-file match are unit-testable with plain strings instead of a real VirtualFile."
  - "The notification handler distinguishes 'file missing or unreadable' (result.path non-null and !result.exists) from 'no config configured' (result.path null, source none) -- only the former triggers the once-per-path balloon, since the latter is a normal unconfigured state, not a failure to warn about."

requirements-completed: [CFG-01, CFG-02]

coverage:
  - id: D1
    description: "bbj/resolvedConfigPath is declared exactly once on BbjComposerServer, the single server-proxy interface, and its DTO round-trips through LSP4IJ's own MessageJsonHandler"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config/ConfigModelsJsonBoundaryTest.java#aResolvedConfigPathResponseParsesThroughTheLsp4jGsonWithEveryFieldPopulated"
        status: pass
      - kind: unit
        ref: "test/config/ConfigModelsJsonBoundaryTest.java#aResponseWithNullPathAndNullProblemParsesWithoutThrowing"
        status: pass
      - kind: unit
        ref: "test/composer/ComposerRequestContractTest.java#everyDeclaredRequestNameExistsAsAQuotedLiteralInTheLanguageServerSources"
        status: pass
      - kind: unit
        ref: "test/lsp/Lsp4ijOverrideSiteSourceGuardTest.java#getServerInterfaceReturnsBbjComposerServerClassExactlyOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "The pushed notification fills a volatile application-level cache where the last push always wins, and a stale/torn read is not possible from an indexing thread"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#lastPushWinsWhenTheCacheIsUpdatedTwice"
        status: pass
      - kind: unit
        ref: "test/config/BbjConfigPathServiceSourceGuardTest.java#theCachedResultFieldIsVolatile"
        status: pass
    human_judgment: false
  - id: D3
    description: "Before any push, activeConfigPath() falls back to the explicit BbjSettings.configPath setting normalized verbatim (blank/whitespace/EM-Config-sentinel collapse to unset), reports empty when nothing is configured, and never derives a BBj-home default itself"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#resolveActivePathFallsBackToTheExplicitSettingNormalizedVerbatimWhenNothingWasPushed"
        status: pass
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#resolveActivePathIsEmptyWithNoPushAndNoExplicitSetting"
        status: pass
      - kind: unit
        ref: "test/config/BbjConfigPathServiceSourceGuardTest.java#activeConfigPathDelegatesToTheStaticHelperRatherThanDerivingTheHomeDefaultItself"
        status: pass
    human_judgment: false
  - id: D4
    description: "isConfigFile/isActiveConfigFile distinguish the active config file from a default-named (config.bbx/config.min, any case) file that is not live, matching the language server's samePath case-folding on win32/darwin"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#isConfigFileNameMatchesTheActiveConfigFile"
        status: pass
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#isConfigFileNameMatchesDefaultFilenamesInAnyLetterCaseEvenWhenNotActive"
        status: pass
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#samePathFoldsCaseOnWindowsAndDarwinButNotElsewhere"
        status: pass
    human_judgment: false
  - id: D5
    description: "shouldWarnOnce dedupes the missing-file warning per distinct path per session, and the notification handler shows it only for a missing/unreadable resolved file (not for an unconfigured one), synchronously updating the cache outside any invokeLater block"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config/ConfigPathsTest.java#shouldWarnOnceReturnsTrueOncePerDistinctPathAndFalseForRepeats"
        status: pass
      - kind: unit
        ref: "test/config/BbjConfigPathServiceSourceGuardTest.java#shouldWarnOnceIsBackedByTheWarnedPathsSet"
        status: pass
    human_judgment: true
    rationale: "The balloon itself (wording, timing, that it actually appears once per session in a live IDE) is only provable by hand in a running IntelliJ instance; the unit/source-guard tests cover the dedup key and the invokeLater/project-disposed wiring, not the rendered UI."

duration: 12min
completed: 2026-09-06
status: complete
---

# Phase 84 Plan 04: Config Path Resolution & Discoverability Foundation Summary

**IntelliJ now has the same one answer VS Code already has: `bbj/resolvedConfigPath` on the single `BbjComposerServer` proxy interface, a `@JsonNotification` handler filling a volatile `BbjConfigPathService` cache, and the pure `isConfigFile`/`isActiveConfigFile` predicates a later SETOPTS composer and file-type override will consume.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-06T15:05:00Z (approx.)
- **Completed:** 2026-09-06T15:17:00Z
- **Tasks:** 3
- **Files modified:** 11 (6 created, 5 modified)

## Accomplishments

- `ConfigModels.ResolvedConfigPathResult` carries the four-field payload (`path`, `source`,
  `exists`, `problem`) across LSP4IJ, verified to round-trip through LSP4IJ's own
  `MessageJsonHandler` including a null-path/null-problem envelope.
- `ConfigPaths` mirrors the language server's `config-path-resolver.ts` for the same inputs:
  `normalizeSetting` collapses null/blank/whitespace/the EM Config sentinel to unset,
  `samePath` compares case-insensitively on win32/darwin via an injectable OS-name overload
  (case-folding is a backstop verification since this CI runs Linux-only), and
  `configPathArg` returns the `-c` argument or `null` as the second defensive sentinel layer.
- `BbjConfigPathService` holds the warm cache in a `volatile` field (last push wins),
  falls back to the explicit `BbjSettings.State.configPath` setting verbatim before any push
  arrives (never deriving the BBj-home default itself), and exposes `isConfigFile`/
  `isActiveConfigFile`/`shouldWarnOnce` — all backed by package-private static helpers so the
  pure decisions are unit-testable without a live IntelliJ `Application`.
- `BbjComposerServer` gained `@JsonRequest("bbj/resolvedConfigPath")` (no second proxy
  interface introduced); `BbjLanguageClient` gained `@JsonNotification("bbj/resolvedConfigPath")`,
  which updates the cache synchronously and, only when the resolved file is missing or
  unreadable, shows a once-per-path balloon inside `invokeLater` behind a project-disposed guard.
- `ComposerRequestContractTest` now covers the new request name against
  `resolved-config-path-request.ts` and its own reflective interface scan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure path helpers and the resolved-path DTO** - `9a6e5736` (feat)
2. **Task 2: Application-level cache with the config-file predicates** - `ba322c14` (feat)
3. **Task 3: The request on the one proxy interface, and the pushed notification handler** - `b320af12` (feat)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigModels.java` - `ResolvedConfigPathResult` DTO
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java` - `normalizeSetting`, `samePath` (+ injectable-OS overload), `configPathArg`, `EM_CONFIG_SENTINEL`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java` - the warm cache, `activeConfigPath()`, `isConfigFile`/`isActiveConfigFile`, `shouldWarnOnce`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java` - DTO boundary coverage
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigPathsTest.java` - `ConfigPaths` coverage plus `BbjConfigPathService`'s static-helper coverage
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigPathServiceSourceGuardTest.java` - source-guard fence for the platform-bound wiring plain JUnit cannot reach directly
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` - `resolvedConfigPath()` request method
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` - `resolvedConfigPath(...)` notification handler
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - `BbjConfigPathService` `applicationService` registration
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - new request name, `resolved-config-path-request.ts` source, camelCase allowance
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` - `FakeComposerServer`'s new override for the extended interface

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] FakeComposerServer no longer compiled after extending BbjComposerServer**
- **Found during:** Task 3 (running the required verify: `ComposerRequestContractTest` + `Lsp4ij*`)
- **Issue:** `ComposerFlowTest.java`'s `FakeComposerServer` implements `BbjComposerServer` directly; adding `resolvedConfigPath()` to the interface left it non-abstract-but-missing-an-override, failing `compileTestJava`.
- **Fix:** Added a throwing `resolvedConfigPath()` override, matching the file's existing pattern for every `bbj/composer/*`/`bbj/compile` method the flow seam under test never calls.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java`
- **Verification:** `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest' --tests 'com.basis.bbj.intellij.lsp.Lsp4ij*'` compiles and passes.
- **Committed in:** `b320af12` (Task 3 commit)

**2. [Rule 3 - Blocking] `everyRequestNameIsNamespacedAndLowerCase` rejected the new camelCase name**
- **Found during:** Task 3 (same verify run)
- **Issue:** `bbj/resolvedConfigPath`'s `resolvedConfigPath` segment is camelCase, and `ComposerRequestContractTest`'s `allowedCamelCaseSegments` set only permitted `decodeCall`, so the test failed.
- **Fix:** Added `"resolvedConfigPath"` to `allowedCamelCaseSegments`, matching the test's own stated exception rule (camel-case allowed only where the interface's own method name introduces it).
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java`
- **Verification:** Same verify run above, green.
- **Committed in:** `b320af12` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes were required to keep the plan's own verification commands green after extending the shared interface; neither changes the plan's specified behavior or scope. A third artifact beyond the plan's `files_modified` list, `BbjConfigPathServiceSourceGuardTest.java`, was added per Task 2's own instruction to cover platform-bound behavior with a source-guard test rather than leaving it unasserted.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`ConfigPaths`, `BbjConfigPathService` and the `bbj/resolvedConfigPath` request/notification pair
are available for plan 84-05's file-type override (which will read `isConfigFile`/
`isActiveConfigFile` during indexing) and for Phase 87's SETOPTS composer. No live-IntelliJ
verification of the balloon warning or the file-type predicate against a real `VirtualFile` has
been performed yet — the pure decision logic and the wiring are covered by unit and source-guard
tests only, per D5's `human_judgment: true`.

---
*Phase: 84-config-path-resolution-discoverability-foundation*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (ConfigModels.java, ConfigPaths.java,
BbjConfigPathService.java, ConfigModelsJsonBoundaryTest.java, ConfigPathsTest.java,
BbjConfigPathServiceSourceGuardTest.java, BbjComposerServer.java, BbjLanguageClient.java,
plugin.xml, ComposerRequestContractTest.java, ComposerFlowTest.java, this SUMMARY). All three
task commits (`9a6e5736`, `ba322c14`, `b320af12`) confirmed present in `git log`. Plan-level
`<verification>` re-run clean: `./gradlew build --offline` (BUILD SUCCESSFUL, whole suite),
`ComposerRequestContractTest` passes with `bbj/resolvedConfigPath` present on both sides, and
`grep -n "cfg"` in `BbjConfigPathService.java` shows only a prose Javadoc warning against
BBj-home-derived construction, not an actual concatenation.
