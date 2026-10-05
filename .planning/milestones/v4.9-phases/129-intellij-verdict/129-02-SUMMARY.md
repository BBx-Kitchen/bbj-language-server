---
phase: 129-intellij-verdict
plan: 02
subsystem: intellij
tags: [intellij, initializationOptions, formatter, settings-seam, contract-test, lsp4ij]

requires:
  - phase: 129-intellij-verdict
    provides: the corrected interop keys in the same initializationOptions build (plan 01)
provides:
  - FormatterInitOptions, a plain-Java seam that turns persisted state into the 15-key formatter object
  - 15 flat formatter* fields on BbjSettings.State with the server defaults
  - initializationOptions.formatter attached once by the factory, before the options are handed over
  - normalization so a hand-edited BbjSettings.xml can never send a null, blank, wrong-case, unknown or out-of-range value
affects: [129-03, 129-04, 129-07, 129-08]

actuals:
  tokens: 10100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Plain-Java init-options seam with exact-match allow-list normalizers, modelled on CompilerInitOptions"
    - "Cross-language text contract against a TypeScript key list, its defaults block and package.json enums"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/FormatterInitOptions.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java

key-decisions:
  - "State field names are the prefix formatter plus the key with its first letter capitalised (formatterIndentWidth ...), so a hand-seeded BbjSettings.xml is predictable"
  - "Out-of-range indentWidth resets to the default 2 instead of clamping, and a choice matches exactly (after trim) or falls back to its first allowed value"
  - "Normalization lives in the seam (fromState and toJson both route through normalize), not in the settings page, so the evaluation path and a later settings page share one guarantee"

requirements-completed: []

duration: 12min
completed: 2026-10-04
status: complete
---

# Phase 129 Plan 02: Formatter initializationOptions seam Summary

**A default IntelliJ settings state now sends the server's 15 formatter keys with the server's defaults in initializationOptions.formatter, and hand-edited values are normalized so nothing bbj-ls would reject (-33007) can leave IntelliJ.**

## Accomplishments

- `FormatterInitOptions` (234 lines, no `com.intellij` import): `FORMATTER_KEY`, the 15 `KEYS` in the server's order, `INDENT_WIDTH_DEFAULT/MIN/MAX`, six choice lists (default first), `record Values`, `DEFAULTS`, `fromState`, `toJson`, `normalizeIndentWidth`, `normalizeChoice`, `normalize`.
- `BbjSettings.State` gained 15 flat `formatter*` fields with the server defaults (`formatterIndentWidth = 2`).
- The factory adds one statement, `options.add(FormatterInitOptions.FORMATTER_KEY, FormatterInitOptions.toJson(FormatterInitOptions.fromState(state)))`, after the compiler keys and before `params.setInitializationOptions(options)`. The factory diff is 3 added lines, none removed.
- No settings UI was added.

## Task Commits

1. **Task 1: default state reaches the server as a 15-key formatter object** - `7e7e1c87` (feat)
2. **Task 2: hand-edited values can never send a null, unknown or out-of-range setting** - `041bab31` (feat)

## Revert set

The code commits of this plan, newest first. Each touches only this plan's six files (checked with `git show --name-only --format=`). A disabled verdict reverts exactly these two with `git revert 041bab31 7e7e1c87`; nothing else from this plan has to be undone. The SUMMARY and planning-state commits are not part of the set.

1. `041bab31` - FormatterInitOptions.java, FormatterInitOptionsTest.java
2. `7e7e1c87` - FormatterInitOptions.java, BbjSettings.java, BbjLanguageServerFactory.java, FormatterInitOptionsContractTest.java, FormatterInitOptionsSourceGuardTest.java

Files removed or restored by the revert: `FormatterInitOptions.java` and the three `FormatterInitOptions*Test.java` classes are deleted; `BbjSettings.java` and `BbjLanguageServerFactory.java` return to their state at `56321f6a` (the interop key fix from plan 01 is in an earlier commit and stays).

## TDD record

RED (Task 2, before the normalizers existed, test class compiled against the Task 1 seam): `7 tests completed, 3 failed`:

- `indentWidthKeepsTheBoundsAndResetsOutOfRangeValuesToTwo` (FormatterInitOptionsTest.java:132)
- `noValueIsEverJsonNull` (FormatterInitOptionsTest.java:157)
- `nullBlankAndUnknownChoicesFallBackToTheDefault`

GREEN after adding `normalizeIndentWidth`, `normalizeChoice` and `normalize` and routing `fromState` and `toJson` through `normalize`. Two direct tests (`theNormalizersApplyTheSameRulesDirectly`, `normalizingTwiceGivesTheSameResult`) were added with the GREEN change because they call the new methods and could not compile earlier; `FormatterInitOptionsTest` therefore has nine tests, one more than the plan's eight.

## Whole IntelliJ suite

`./gradlew cleanTest test --offline --console=plain`, summed from `build/test-results/test/TEST-*.xml`:

`tests=1286 failures=0 errors=0` (1267 after plan 01, plus 6 contract, 4 source-guard and 9 unit tests).

Task 1 targeted run (new contract and guard tests together with `CompilerOutputDirectorySourceGuardTest`, `EffectiveInteropPortSourceGuardTest`, `InteropInitOptionsContractTest`, `Lsp4ijOverrideSiteSourceGuardTest`, `BbjSettingsLoadStateTest`) was green before the first commit; the two shell checks passed (one `FormatterInitOptions.FORMATTER_KEY` in the factory, 15 `public ... formatter[A-Z]` fields in the State).

## Deviations from Plan

None - plan executed exactly as written, apart from the one extra unit test noted under the TDD record.

Two commit-trailer notes: the plan text names an Opus trailer; the commits carry the executing model's own `Co-Authored-By: Claude Sonnet 5.5` trailer, as the repository rule prescribes.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-129-04 and T-129-05 are mitigated by `normalizeChoice`, `normalizeIndentWidth` and the normalization inside `toJson`; the tests for null, blank, wrong-case, unknown and out-of-range input pin them. T-129-07 is addressed by the revert set above.

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: `FormatterInitOptions.java`, `FormatterInitOptionsTest.java`, `FormatterInitOptionsContractTest.java`, `FormatterInitOptionsSourceGuardTest.java` under `bbj-intellij/src/`
- FOUND commits `7e7e1c87` and `041bab31` on `gsd/v4.9-bbj-ls-denum-format`
- Revert-set commits each touch only this plan's six files
- Source and test comments of the four new files contain no planning identifiers
