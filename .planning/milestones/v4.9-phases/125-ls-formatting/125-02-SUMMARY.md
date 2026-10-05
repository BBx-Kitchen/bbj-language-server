---
phase: 125-ls-formatting
plan: 02
subsystem: intellij-plugin
tags: [intellij, lsp4ij, formatting, java, junit]

requires:
  - phase: 125-ls-formatting
    provides: none (independent of the server-side plan; must land before the server advertises formatting)
provides:
  - "BbjLanguageServerFactory.LSP_FORMATTING_ENABLED (private static final, false) and the gated anonymous LSPFormattingFeature installed through setFormattingFeature"
  - "BbjLspFormattingSwitchTest: behavioural proof that all four formatting checks answer false without touching the file"
  - "Fence tests pinning the switch: source guard, import allowlist entry, experimental-marker and signature canaries"
affects: [125-06 server formatting capability switch-on, IntelliJ formatting evaluation]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One false constant short-circuits every overridden LSP4IJ gate (constant && super.method) so the vendor superclass is never reached while the switch is off"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLspFormattingSwitchTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java

key-decisions:
  - "All four LSP4IJ formatting gates (isEnabled, isSupported, isFormattingSupported, isRangeFormattingSupported) are overridden, not just isSupported as on the document-link feature, because the formatting services gate on isEnabled and then call the two supported checks directly"
  - "The feature is an inline anonymous subclass, so no new main-source file joins the LSP4IJ allowlist; the allowlist stays at twelve files"
  - "No IntelliJ handler is added for bbj/openFormatterSettings: LSP4J 1.0.0 (bundled by LSP4IJ 0.21.0) logs one java.util.logging WARNING from GenericEndpoint.notify and returns, with no exception and no dialog, and the server only sends it after a click on a formatting prompt that IntelliJ cannot produce while the switch is off"

patterns-established:
  - "Vendor experimental-API switches get three fences: allowlist entry, source guard on the builder chain and constant, reflective canary on marker and signatures"

requirements-completed: [IJF-01]

coverage:
  - id: D1
    description: "IntelliJ offers no LSP formatting for BBj files: the installed formatting feature answers false from all four checks without calling LSP4IJ or reading the file"
    requirement: IJF-01
    verification:
      - kind: unit
        ref: "bbj-intellij BbjLspFormattingSwitchTest#everyFormattingCheckAnswersFalseWithoutTouchingTheFile"
        status: pass
      - kind: unit
        ref: "bbj-intellij BbjLspFormattingSwitchTest#theInstalledFormattingFeatureIsOurSubclassAndIsStable"
        status: pass
    human_judgment: true
    rationale: "The runtime proof that Reformat Code and Actions on Save do nothing for BBj files is a hand check on the built plugin zip; the JUnit suite proves the feature's answers, not the IDE's behaviour"
  - id: D2
    description: "The fence tests pin the switch: one setFormattingFeature after setCompletionFeature, constant declared once as false, four gated overrides, allowlist entry with twelve files, experimental marker, and reflective member signatures"
    requirement: IJF-01
    verification:
      - kind: unit
        ref: "bbj-intellij Lsp4ijOverrideSiteSourceGuardTest#theLspFormattingSwitchIsOneConstantSetToFalseThatGatesAllFourFormattingChecks"
        status: pass
      - kind: unit
        ref: "bbj-intellij Lsp4ijCouplingCanaryTest#theFormattingFeatureMembersTheSwitchReliesOnStillExist"
        status: pass
      - kind: unit
        ref: "bbj-intellij Lsp4ijImportAllowlistTest#everyAllowlistedFileUsesExactlyTheSymbolsTheAllowlistRecords"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whole IntelliJ suite passes with cleanTest test"
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew cleanTest test (130 suites, 1165 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-01
status: complete
---

# Phase 125 Plan 02: IntelliJ LSP Formatting Switch Summary

**One false constant, LSP_FORMATTING_ENABLED, short-circuits all four LSP4IJ formatting gates on the factory's anonymous LSPFormattingFeature, so IntelliJ sends no formatting request for BBj files even once the server advertises formatting; the switch is pinned by a behavioural test and three LSP4IJ fence tests.**

## Performance

- **Duration:** about 10 min
- **Completed:** 2026-10-01T18:01:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `BbjLanguageServerFactory` declares `private static final boolean LSP_FORMATTING_ENABLED = false;` and installs an inline `LSPFormattingFeature` through `setFormattingFeature(...)` after `setCompletionFeature(...)`. Each of `isEnabled`, `isSupported`, `isFormattingSupported` and `isRangeFormattingSupported` returns `LSP_FORMATTING_ENABLED && super.<same method>(file)`. Setting the constant to true restores LSP4IJ's own behaviour.
- `BbjLspFormattingSwitchTest` hands all four checks a `PsiFile` proxy whose every method throws `AssertionError`; all four answer false without error, and the installed feature is the gated subclass, stable across calls.
- The source guard now pins exactly one `setFormattingFeature(` after `setCompletionFeature(` and the constant declared once as false gating four overrides. The allowlist records `LSPFormattingFeature` on the factory entry (still twelve files). The canary pins the experimental marker on `LSPFormattingFeature` and the reflective signatures of `setFormattingFeature`, `getFormattingFeature` and the four checks (public, non-final, boolean).

## Task Commits

1. **Task 1: The IntelliJ client refuses LSP formatting for BBj files behind one constant** - `a634e0a3` (feat)
2. **Task 2: The LSP4IJ fence tests pin the formatting switch, and the whole IntelliJ suite stays green** - `f72574bb` (test)

**Plan metadata:** recorded in the docs commit that follows this summary.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - the switch constant and gated formatting feature
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLspFormattingSwitchTest.java` - behavioural proof with a throwing PsiFile
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` - `LSPFormattingFeature` on the factory entry
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` - builder-chain and switch source guards (one test renamed, one added)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` - experimental-marker and signature canaries

## Decisions Made

- Overrode all four gates rather than only `isSupported`: the formatting services check `isEnabled` first and then call `isFormattingSupported` / `isRangeFormattingSupported` directly, so copying the document-link override would leave Reformat Code live.
- Kept the feature an anonymous inner class so no new main-source file joins the LSP4IJ allowlist.

### Answer: does LSP4IJ tolerate an unhandled `bbj/openFormatterSettings` notification?

Yes. LSP4IJ 0.21.0 bundles LSP4J 1.0.0 (`lsp4jVersion=1.0.0`). With no handler and no delegate, `GenericEndpoint.notify` logs "Unsupported notification method: <name>" through `java.util.logging` (INFO for `$/` methods, WARNING otherwise) and returns: no exception, no dialog. The server sends this notification only after a click on a formatting prompt, which IntelliJ cannot produce while the switch is off, so no IntelliJ handler was added. This finding comes from the plan's interfaces block (the planner's check of the cached jar); I did not re-inspect the jar.

## Deviations from Plan

None - plan executed exactly as written.

Commit trailer note: the plan text asked for `Co-Authored-By: Claude Opus 5.5`; the run instructions and attribution reminder specify `Claude Sonnet 5.5`, which is what both commits carry.

## Issues Encountered

None. One shell-rule slip: a verification command chained `cd` in front of `cat`/`grep` on the test-results directory; it ran without a prompt and read only generated XML.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The switch is in place before plan 125-06 turns the server's formatting capability on, so no commit lets IntelliJ pick up unevaluated formatting.
- Open item (flagged assumption on IJF-01): the runtime proof that Reformat Code and Actions on Save do nothing for BBj files is the hand check on the plugin zip built from the final phase tree, not the JUnit suite.

## Known Stubs

None.

## Threat Flags

None. The plan's register is covered: T-125-06 (behavioural test plus source guard), T-125-08 (canary on marker and signatures), T-125-07 accepted.

## Self-Check: PASSED

- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLspFormattingSwitchTest.java
- FOUND commits a634e0a3 and f72574bb on gsd/v4.9-bbj-ls-denum-format
- All task acceptance greps passed; planning-id scan of the touched source and tests printed nothing
- Plan verification: `./gradlew cleanTest test` passed (130 suites, 1165 tests, 0 failures)

---
*Phase: 125-ls-formatting*
*Completed: 2026-10-01*
