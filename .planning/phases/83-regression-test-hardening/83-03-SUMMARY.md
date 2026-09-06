---
phase: 83-regression-test-hardening
plan: 03
subsystem: testing
tags: [junit5, intellij-plugin, lsp4ij, reflection, bytecode-parsing, json-rpc]

# Dependency graph
requires:
  - phase: 79-edt-responsiveness
    provides: the scoped method-body-window source-guard convention (readGuardedSource/countOccurrences) this plan's override-site guards extend
  - phase: 81-feature-parity-and-correctness
    provides: the bbj/compile request surface, the LSP4IJ 0.21.0 Gradle pin, and CompileResultJsonBoundaryTest's MessageJsonHandler round-trip harness this plan generalises to the composer DTOs
provides:
  - "Lsp4ijClassFileMarkers: a constant-pool reader proving org.jetbrains.annotations.ApiStatus.Experimental is class-file-retention-only, so a runtime isAnnotationPresent lookup is provably vacuous for it"
  - "Lsp4ijCouplingCanaryTest: reflective signature canaries for every LSP4IJ member this plugin overrides or calls, the experimental-marker presence/absence assertions for all nine coupled vendor classes, and a behavioural test for BbjCompletionFeature.getIcon's full mapping"
  - "Lsp4ijImportAllowlistTest: a comment-stripping scan of src/main/java asserting the discovered LSP4IJ coupling map equals a hand-written eleven-file allowlist"
  - "Lsp4ijOverrideSiteSourceGuardTest: seven scoped method-body-window guards on this plugin's own LSP4IJ override sites"
  - "ComposerRequestContractTest: all eight custom request names asserted present as quoted literals in the language server's TypeScript sources, derived reflectively from BbjComposerServer"
  - "ComposerModelsJsonBoundaryTest: one MessageJsonHandler round trip per composer result DTO plus an oversized-int negative control, a usable-values check, and a missing-optional-field check"
  - "Lsp4ijVersionPinTest: asserts the Gradle LSP4IJ pin matches the vendor plugin descriptor on the test classpath by version, jar file name, and plugin id"
affects: [future-lsp4ij-version-bumps, future-composer-request-additions]

# Actuals (#2632)
actuals:
  tokens: 17700
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Constant-pool class-file parsing to observe a CLASS-retention annotation that Class.isAnnotationPresent cannot see"
    - "Comment-stripping source scanner (string/char-literal-aware) that derives a coupling inventory, compared against a hand-written literal allowlist rather than deriving the allowlist from the scan"
    - "Generalised MessageJsonHandler round-trip harness parameterised by request name, result type, and params type, reused across seven composer DTOs"
    - "jar: URL / java.class.path dual-route vendor-jar resolution for reading a dependency plugin's own plugin.xml off the test classpath"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijClassFileMarkers.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijVersionPinTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  modified: []

key-decisions:
  - "ServerStatus's constant count is asserted as 9, not the 4 the plugin branches on -- measured directly against the 0.21.0 jar, which added five install-lifecycle states (none, checking_installed, installing, installed, not_installed) beyond the four (stopped/starting/started/stopping) #554's original context assumed"
  - "The icon-behaviour test asserts, per kind, whether a Java-interop detail changes BbjCompletionFeature.getIcon's return -- measured true for Class/Method/Function but false for Interface, since its Java-interop branch maps to the identical AllIcons.Nodes.Interface field as its plain branch; the plan's literal 'a detail always selects a different icon' wording is corrected to match the code actually measured"
  - "The version-pin test resolves the vendor jar via the jar: URL route (measured live: LanguageServerFactory.class resolves to a jar: URL under build/idea-sandbox), with the java.class.path scan kept as a documented, never-executed-here fallback for a classes-directory layout"

requirements-completed: [BUILD-05]

coverage:
  - id: D1
    description: "Every LSP4IJ member this plugin overrides or calls (ServerStatus constants, LanguageServerManager members, LanguageClientImpl overrides + constructor, OSProcessStreamConnectionProvider.setCommandLine, LanguageServerFactory's four interface members, LSPCompletionFeature.getIcon, LSPClientFeatures' builder chain, LSPDocumentLinkFeature.isSupported) is pinned by a reflective canary naming its exact parameter and return types"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java (12 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The experimental marker is asserted from the class file, present on the three classes #554 measured and absent on the other six coupled vendor classes; the marker's class-file-only retention is itself proven so a reflective isAnnotationPresent lookup can never be mistaken for a real check"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java#theExperimentalMarkerIsRetainedInTheClassFileOnlyWhichIsWhyThisTestReadsBytecode"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java#theThreeFeatureClassesStillCarryTheExperimentalMarker"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java#theOtherCoupledVendorClassesCarryNoExperimentalMarker"
        status: pass
    human_judgment: false
  - id: D3
    description: "BbjCompletionFeature's icon mapping is exercised with real completion items for every kind it maps explicitly, with and without the Java-interop detail heuristic, since the headless probe proved AllIcons resolves without a running Application"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java#theIconMappingCoversEveryKindItMapsExplicitlyWithAndWithoutTheJavaInteropDetail"
        status: pass
    human_judgment: false
  - id: D4
    description: "The plugin's whole LSP4IJ coupling surface is a single asserted inventory: an eleven-file, symbol-level allowlist that fails when a new file or symbol is added anywhere in src/main/java, ignores comment-only mentions, and cannot be regenerated from the scan it polices"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java (6 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "This plugin's own override sites (factory builder chain, client status handler, completion feature override, composer service start-before-resolve ordering, the two actions' fully-qualified ServerStatus references) are guarded structurally, scoped to a method-body window except the two explicitly whole-file fully-qualified-reference counts"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java (7 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "All eight custom request names on BbjComposerServer are asserted present as quoted literals in the language server's TypeScript sources and derived reflectively rather than hard-coded twice"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java (4 tests)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every composer result DTO round-trips through the same MessageJsonHandler the plugin's real connection uses, including a nested-collection and a beyond-int-range long field per type where the DTO has them, plus an oversized-int negative control, a usable-values check, and a missing-optional-field check"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java (10 tests)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The LSP4IJ version the module compiles and tests against is asserted to match the plugin descriptor of the jar actually on the test classpath, by version, jar file name, and plugin id; no runtime version check was added to the plugin (the known limit is recorded below)"
    requirement: "BUILD-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijVersionPinTest.java (3 tests)"
        status: pass
    human_judgment: false
  - id: D9
    description: "This plan changes no production file and nothing under bbj-vscode/; the whole IntelliJ module suite passes with zero failures at the final commit"
    requirement: "BUILD-05"
    verification:
      - kind: other
        ref: "git status --short -- bbj-intellij/src/main bbj-vscode/src (empty)"
        status: pass
      - kind: integration
        ref: "./gradlew test (504 tests, 0 failures, 0 skipped)"
        status: pass
    human_judgment: false
  - id: D10
    description: "Every new test class in this plan (six classes) has one recorded mutation run: the canary/allowlist/guard/pin/contract/envelope was broken, the red output captured, and the change reverted before staging"
    requirement: "BUILD-05"
    verification:
      - kind: other
        ref: "this SUMMARY's 'Mutation Testing' section (six mutation/revert cycles, each with captured red output)"
        status: pass
    human_judgment: false

duration: 23min
completed: 2026-09-06
status: complete
---

# Phase 83 Plan 03: LSP4IJ Coupling Canaries and Composer Request Contract Summary

**Seven new plain-JUnit-5 test classes turn this plugin's LSP4IJ coupling and its eight custom request names into an asserted inventory: reflective signature canaries, a class-file experimental-marker reader, an eleven-file symbol-level allowlist fence, scoped override-site guards, a cross-language TypeScript contract test, MessageJsonHandler round trips for every composer DTO, and a version-pin test tying the whole set to the jar it was measured against.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-09-06T08:37:20Z (commit `f0570608`, end of 83-02)
- **Completed:** 2026-09-06T09:00:08Z
- **Tasks:** 3
- **Files created:** 7 (all new test files; no production file touched)

## Accomplishments

- `Lsp4ijClassFileMarkers` reads a class file's constant pool directly, proving `ApiStatus.Experimental`'s `@Retention(CLASS)` makes a runtime `isAnnotationPresent` lookup provably vacuous, and gives every marker assertion below a real, executable basis.
- `Lsp4ijCouplingCanaryTest` (12 tests) pins the exact signature of every LSP4IJ member this plugin overrides or calls -- `ServerStatus` constants, `LanguageServerManager`'s four members, both `LanguageClientImpl` overrides plus its constructor, `OSProcessStreamConnectionProvider.setCommandLine`, `LanguageServerFactory`'s four interface members, `LSPCompletionFeature.getIcon`, the `LSPClientFeatures` builder chain, and `LSPDocumentLinkFeature.isSupported` -- asserts the experimental marker present on the three classes #554 measured and absent on the other six, and behaviourally exercises `BbjCompletionFeature.getIcon` for every kind it maps, with and without the Java-interop detail heuristic, after a headless probe proved `AllIcons` resolves without a running `Application`.
- `Lsp4ijImportAllowlistTest` (6 tests) scans `src/main/java`, strips comments (string/char-literal-aware), and asserts the discovered `file -> {symbols}` map equals a hand-written eleven-file allowlist -- covering both import-based and fully-qualified-without-import coupling, proving comment-only mentions are never counted, and proving the allowlist itself is never derived from the scan.
- `Lsp4ijOverrideSiteSourceGuardTest` (7 tests) guards this plugin's own override sites -- the factory's builder chain and constructor calls, the client's `super.handleServerStatusChanged`+`invokeLater` dispatch, the completion feature's single override with all three `super.getIcon` delegation points, the composer service's start-before-resolve ordering, and the two actions' fully-qualified `ServerStatus` reference counts -- each scoped to a located method-body window except the two explicitly whole-file counts.
- `ComposerRequestContractTest` (4 tests) asserts all eight `@JsonRequest` names exist as quoted literals in `composer-commands.ts`/`compile-command.ts`, derived reflectively from `BbjComposerServer` rather than hard-coded twice, namespaced under `bbj/` and lower-case except the interface's own `decodeCall` camel case.
- `ComposerModelsJsonBoundaryTest` (10 tests) round-trips every composer result DTO through the exact `MessageJsonHandler` harness the plugin's real connection uses -- including the 32-bit-sign-bit `long` fields `ComposerModels`'s own javadoc calls out -- plus an oversized-`int` negative control, a usable-values check, and a missing-optional-field check.
- `Lsp4ijVersionPinTest` (3 tests) asserts the Gradle LSP4IJ pin matches the vendor plugin descriptor's version, that the resolved jar's file name carries the same version, and that the descriptor's plugin id is the one the module depends on.

## Task Commits

Each task was committed atomically:

1. **Task 1: One canary, end to end -- read the vendor jar, prove the marker's retention, pin the three experimental classes** - `69984150` (test)
2. **Task 2: The rest of the canaries, and the eleven-file allowlist fence** - `32025a15` (test)
3. **Task 3: The custom request surface -- cross-language contract, JSON boundary, version pin, mutations and the coverage map** - `b0e9233f` (test)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijClassFileMarkers.java` - constant-pool class-file reader (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` - reflective signature + marker canaries, icon behaviour (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` - eleven-file coupling allowlist fence (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` - scoped override-site guards (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijVersionPinTest.java` - Gradle-pin-vs-jar-descriptor assertion (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - cross-language request-name contract (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - composer DTO JSON round trips (new)

No production file and nothing under `bbj-vscode/` was modified.

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: two of the phase context's measured facts moved on re-measurement against the live 0.21.0 jar and this plugin's actual code, and both were resolved by writing the measured value into the test rather than forcing the plan's original wording, per the plan's own explicit instruction for this case:

1. **`ServerStatus` now has 9 constants, not 4.** The 0.21.0 jar added five install-lifecycle states (`none`, `checking_installed`, `installing`, `installed`, `not_installed`) beyond the four (`stopped`/`starting`/`started`/`stopping`) this plugin branches on and #554's original context measured. `theServerStatusConstantsThisPluginBranchesOnStillExist` asserts both: each of the four names individually via `Enum.valueOf` (so a rename fails), and the full count of 9 (so an eventual tenth constant is also noticed).
2. **The Java-interop icon heuristic does not change every mapped kind's icon.** `BbjCompletionFeature.getIcon`'s Java-interop branch maps `Interface -> AllIcons.Nodes.Interface`, the identical field its plain branch already uses for `Interface` -- so a Java-interop-shaped detail never actually changes the icon for that one kind, only for `Class`, `Method` and `Function`. `theIconMappingCoversEveryKindItMapsExplicitlyWithAndWithoutTheJavaInteropDetail` asserts this measured behaviour per kind (with a comment explaining why) rather than the plan's literal "always different" wording, which the real code does not satisfy for `Interface`.

The experimental-marker table itself needed **no correction**: re-measuring all nine vendor classes against the class files in the pinned 0.21.0 jar (both via the actual `Lsp4ijClassFileMarkers`-based test and an independent `javap`/`strings` cross-check before writing any test code) reproduced the phase context's table exactly -- present on `LSPCompletionFeature`, `LSPClientFeatures`, `LSPDocumentLinkFeature`; absent on the other six.

## Deviations from Plan

None - plan executed exactly as written. (The two measured-fact corrections above are not deviations from the plan's *behaviour* -- the plan explicitly instructs "if a row disagrees, write the measured value into the test and record the discrepancy in the SUMMARY. Do not force a row to match the table" for the marker table, and the icon-mapping section carries the same spirit; both are documented under Decisions Made rather than as Rule 1-4 deviations, since no bug was fixed, no scope was added, and no architectural question arose -- the test was simply written to match the code and jar actually measured.)

## Mutation Testing (D-16, C-02)

One mutation applied, run, confirmed red, and reverted for each of the six new test classes. `git status --short -- bbj-intellij` was clean of unexpected changes before every stage, and clean again after every revert; no mutation was ever staged or committed.

### 1. `Lsp4ijCouplingCanaryTest`

- **Mutation applied:** Changed `LSPCompletionFeature.class.getMethod("getIcon", CompletionItem.class)` to `getMethod("getIcon", String.class)` -- a wrong parameter type.
- **Result:** `exercisingGetIconTheLSPClientFeaturesBuilderChainAndLSPDocumentLinkFeatureIsSupported()` FAILED with `java.lang.NoSuchMethodException`.
- **Reverted; re-run confirmed green** (12 tests, 0 failures).

### 2. `Lsp4ijImportAllowlistTest`

- **Mutation applied:** Removed the `BbjComposerService.java` entry from the `ALLOWLIST` map.
- **Result:** 2 of 6 tests failed -- `theCouplingSurfaceIsExactlyTheElevenFilesInTheAllowlist()` (`AssertionFailedError`, naming the now-unexpected file) and `thisTestDoesNotDeriveTheAllowlistFromTheScan()` (its own size assertion, now 10 not 11).
- **Reverted; re-run confirmed green** (6 tests, 0 failures).

### 3. `Lsp4ijOverrideSiteSourceGuardTest`

- **Mutation applied:** In `BbjComposerService.server(...)`, temporarily reordered the body so `.getLanguageServer(` is called before `.start(` (production file, reverted before commit).
- **Result:** `composerServiceStartsTheServerBeforeResolvingTheLanguageServerProxy()` FAILED with `AssertionFailedError`.
- **Reverted; `git diff` on `BbjComposerService.java` empty; re-run confirmed green** (7 tests, 0 failures).

### 4. `Lsp4ijVersionPinTest`

- **Mutation applied:** Temporarily hard-coded `gradlePin = "0.20.0"` (a neighbouring version) in `theGradlePinMatchesTheVendorPluginDescriptorOnTheTestClasspath()`, bypassing the real `readGradlePin()` read.
- **Result:** `theGradlePinMatchesTheVendorPluginDescriptorOnTheTestClasspath()` FAILED with `AssertionFailedError` (expected `0.20.0`, was `0.21.0`).
- **Reverted; re-run confirmed green** (3 tests, 0 failures).

### 5. `ComposerRequestContractTest`

- **Mutation applied:** Dropped `"bbj/compile"` from the `DECLARED_REQUESTS` literal set.
- **Result:** `theDeclaredRequestNamesAreDerivedFromTheInterfaceNotHardCodedTwice()` FAILED with `AssertionFailedError` (the reflectively-derived set still had 8 entries, the literal only 7).
- **Reverted; re-run confirmed green** (4 tests, 0 failures).

### 6. `ComposerModelsJsonBoundaryTest`

- **Mutation applied:** Renamed the `"expr"` key to `"exprValue"` in one envelope (`aMsgboxPreviewResponseParsesThroughTheLsp4jGson`'s test data only).
- **Result:** `aMsgboxPreviewResponseParsesThroughTheLsp4jGson()` FAILED with `expected: <513> but was: <0>` (Gson silently left the un-matched field at its default).
- **Reverted; re-run confirmed green** (10 tests, 0 failures).

Whole module suite re-confirmed green after every revert; final run: 504 tests, 0 failures, 0 skipped.

## BUILD-05 Coverage Map (#544, #554 closure evidence, D-18)

### The eleven coupled files and their symbols

Every row below is additionally covered as a set by `Lsp4ijImportAllowlistTest.theCouplingSurfaceIsExactlyTheElevenFilesInTheAllowlist` (the file set) and `.everyAllowlistedFileUsesExactlyTheSymbolsTheAllowlistRecords` (the per-file symbol set); only the additional canary/guard coverage is listed per row.

| File | Symbol(s) | Canary / guard coverage |
|---|---|---|
| `actions/BbjRunActionBase.java` | `ServerStatus` | `Lsp4ijImportAllowlistTest.aFullyQualifiedUseWithoutAnImportIsCounted`; `Lsp4ijOverrideSiteSourceGuardTest.theTwoActionFilesReferenceServerStatusByFullyQualifiedNameExactlyTwiceEach`; `Lsp4ijCouplingCanaryTest.theServerStatusConstantsThisPluginBranchesOnStillExist` |
| `actions/BbjCompileAction.java` | `ServerStatus` | same three as above |
| `actions/BbjRefreshJavaClassesAction.java` | `ServerStatus` | `Lsp4ijCouplingCanaryTest.theServerStatusConstantsThisPluginBranchesOnStillExist` |
| `lsp/BbjLanguageServer.java` | `OSProcessStreamConnectionProvider` | `Lsp4ijCouplingCanaryTest.theConnectionProviderMembersThisPluginUsesStillExist`, `.theCompletionFeatureIsAssignableFromOurSubclass` |
| `lsp/BbjLanguageClient.java` | `ServerStatus`, `LanguageClientImpl` | `Lsp4ijCouplingCanaryTest.theClientMembersThisPluginOverridesStillExist`; `Lsp4ijOverrideSiteSourceGuardTest.handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater` |
| `lsp/BbjCompletionFeature.java` | `LSPCompletionFeature` | `Lsp4ijCouplingCanaryTest.exercisingGetIconTheLSPClientFeaturesBuilderChainAndLSPDocumentLinkFeatureIsSupported`, `.theIconMappingCoversEveryKindItMapsExplicitlyWithAndWithoutTheJavaInteropDetail`, `.theCompletionFeatureIsAssignableFromOurSubclass`; `Lsp4ijOverrideSiteSourceGuardTest.completionFeatureOverridesGetIconOnceAndEveryDelegationPointCallsSuper` |
| `lsp/BbjLanguageServerFactory.java` | `LanguageServerFactory`, `LanguageClientImpl`, `LSPClientFeatures`, `LSPDocumentLinkFeature`, `StreamConnectionProvider` | `Lsp4ijCouplingCanaryTest.theFactoryInterfaceMembersThisPluginImplementsStillExist`, `.exercisingGetIcon...`; `Lsp4ijOverrideSiteSourceGuardTest.getServerInterfaceReturnsBbjComposerServerClassExactlyOnce`, `.createClientFeaturesBuildsExactlyOneDocumentLinkFeatureThenOneCompletionFeatureWithOneInitializeParamsOverride`, `.createConnectionProviderConstructsBbjLanguageServerAndCreateLanguageClientConstructsBbjLanguageClient` |
| `ui/BbjStatusBarWidget.java` | `ServerStatus` | `Lsp4ijCouplingCanaryTest.theServerStatusConstantsThisPluginBranchesOnStillExist` |
| `ui/BbjServerService.java` | `LanguageServerManager`, `ServerStatus` | `Lsp4ijCouplingCanaryTest.theLanguageServerManagerMembersThisPluginCallsStillExist`, `.theServerStatusConstantsThisPluginBranchesOnStillExist` |
| `ui/BbjJavaInteropService.java` | `ServerStatus` | `Lsp4ijCouplingCanaryTest.theServerStatusConstantsThisPluginBranchesOnStillExist` |
| `composer/BbjComposerService.java` | `LanguageServerManager` | `Lsp4ijCouplingCanaryTest.theLanguageServerManagerMembersThisPluginCallsStillExist`; `Lsp4ijOverrideSiteSourceGuardTest.composerServiceStartsTheServerBeforeResolvingTheLanguageServerProxy` |

### The eight request names

| Request name | Contract test | Boundary test |
|---|---|---|
| `bbj/composer/catalogs` | `ComposerRequestContractTest` (all 4 tests) | `ComposerModelsJsonBoundaryTest.aComposerCatalogsResponseParsesThroughTheLsp4jGson` |
| `bbj/composer/msgbox/preview` | same | `.aMsgboxPreviewResponseParsesThroughTheLsp4jGson`, `.aMissingOptionalFieldParsesToNullRatherThanFailing` |
| `bbj/composer/addwindow/preview` | same | `.anAddWindowPreviewResponseParsesThroughTheLsp4jGson` |
| `bbj/composer/msgbox/decodeCall` | same | `.aMsgboxDecodeCallResponseParsesThroughTheLsp4jGson`, `.anOversizedIntegerFieldIsRejectedByTheSameParser`, `.everyParsedRangeFitsAJavaInt` |
| `bbj/composer/addwindow/decodeCall` | same | `.anAddWindowDecodeCallResponseParsesThroughTheLsp4jGson` |
| `bbj/composer/addchildwindow/preview` | same | `.anAddChildWindowPreviewResponseParsesThroughTheLsp4jGson` |
| `bbj/composer/addchildwindow/decodeCall` | same | `.anAddChildWindowDecodeCallResponseParsesThroughTheLsp4jGson` |
| `bbj/compile` | `ComposerRequestContractTest` (all 4 tests) | Already covered by `compile.CompileResultJsonBoundaryTest` (Phase 81); unchanged by this plan |

This table, and 83-01's Node-pipeline coverage map and 83-02's EDT-01..06 coverage map, are the material for the eventual closing comment on #544, #554 and #569 -- posting that comment is a follow-up these SUMMARYs prepare but do not run.

### Known limit: runtime LSP4IJ version skew (D-11)

`Lsp4ijVersionPinTest` asserts the **build classpath** only: the Gradle pin, the resolved jar's version and file name, and the descriptor's plugin id all agree at compile/test time. A plugin descriptor has no way to pin the **runtime** version of a dependency plugin the IDE resolves when a user installs this plugin -- `plugin.xml`'s `<depends>` element carries no version attribute at all. This is the same limit G-81-5 hit and 81-07 already defended against: the reflective `Diagnostic.getMessage` read in `CompileResultPresenter.messageTextOf` (introduced in Phase 81) remains the standing runtime defence for the one call site that previously broke on a runtime/build version skew. No runtime LSP4IJ version check was added to the plugin in this plan, matching the phase's D-11 decision.

## Icon-Behaviour Coverage (D-08)

The probe (`theIconMappingProbe`) passed on the first run: `AllIcons.Nodes.Method` resolved to a non-null `Icon` headless, and constructing `BbjCompletionFeature` and calling `getIcon` with a `Method`-kind, null-detail item returned a non-null icon with no exception. The fuller behavioural test was therefore added rather than dropped.

**Covered:** all 14 kinds `getIcon`'s plain switch maps to a concrete icon field (`Function`, `Method`, `Class`, `Interface`, `Variable`, `Field`, `Property`, `Keyword`, `Constant`, `Enum`, `EnumMember`, `Module`, `Snippet`, `Event`); the four kinds the Java-interop heuristic recognises (`Class`, `Interface`, `Method`, `Function`), each checked for whether a Java-interop-shaped detail (`"java.lang.String"`) changes the icon versus a null detail, and whether an unrelated detail selects the same icon as a null detail.

**Excluded (need a running `Application`, per the plan's flagged assumption #3):** the default branch (kinds `Text`, `Constructor`, `Unit`, `Value`, `Color`, `File`, `Reference`, `Folder`, `Struct`, `Operator`, `TypeParameter`, all of which delegate to the vendor superclass's `getIcon`), and the null-`kind` early return.

## Issues Encountered

None. All measured facts (the experimental-marker table, the `ServerStatus` constant set, the icon-mapping behaviour, the request-name literals, the composer DTO field names, and the LSP4IJ jar's `plugin.xml`) were verified directly against the live 0.21.0 jar and the actual production sources before any test assertion was written, so no test needed a second correction pass after its first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 83 is now complete: 83-01 (Node pipeline), 83-02 (Settings failure path + EDT residual), and 83-03 (this plan, LSP4IJ canaries) all landed with disjoint files, as D-19 planned.
- The whole IntelliJ module suite stands at 504 tests, 0 failures, 0 skipped (up from 462 at the end of 83-02).
- The BUILD-05 coverage map above, together with 83-01's and 83-02's coverage maps, is ready to post as the closing comment on issues #544, #554 and #569.
- The one open item this phase's regression coverage could not close from a Linux container is the live-Windows Node auto-install check (todo filed by 83-01); the runtime LSP4IJ skew (D-11) is a documented, deliberately-accepted limit rather than a gap.

---
*Phase: 83-regression-test-hardening*
*Completed: 2026-09-06*

## Self-Check: PASSED

All seven key files confirmed present on disk; all three task commit hashes (`69984150`, `32025a15`, `b0e9233f`) confirmed in `git log`.
