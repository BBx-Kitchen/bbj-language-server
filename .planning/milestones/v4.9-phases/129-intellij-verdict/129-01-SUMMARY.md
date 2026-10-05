---
phase: 129-intellij-verdict
plan: 01
subsystem: intellij
tags: [intellij, initializationOptions, interop, contract-test, lsp4ij]

requires:
  - phase: 128-intellij-denum
    provides: the IntelliJ factory and the text-contract test style
provides:
  - IntelliJ initializationOptions carry interopHost and interopPort, the names the server reads
  - InteropInitOptionsContractTest pinning the factory, bbj-ws-manager.ts and extension.ts
  - the interop key mismatch todo closed with its resolution
affects: [129-02, 129-06, 129-07]

actuals:
  tokens: 2500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Cross-language text contract: read the factory, the server reader and the VS Code writer as plain text, comment-stripped on the Java side"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/InteropInitOptionsContractTest.java
    - .planning/todos/completed/2026-09-26-intellij-interop-initoptions-key-mismatch.md
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java

key-decisions:
  - "Rename on the IntelliJ side only: the server and VS Code already used interopHost/interopPort and nothing read the old names, so no server-side compatibility shim"
  - "BbjSettings.State keeps its persisted javaInteropHost/javaInteropPort field names; only the two wire literals changed"

requirements-completed: [IJF-02]

duration: 6min
completed: 2026-10-04
status: complete
---

# Phase 129 Plan 01: Interop initializationOptions keys Summary

**IntelliJ now sends its interop host and effective port as interopHost/interopPort, the names bbj-ws-manager.ts reads, pinned by a four-test text contract across the factory, the server and VS Code.**

## Performance

- **Duration:** about 6 min
- **Tasks:** 2 of 2
- **Files:** 3 changed or created in source/test, 1 todo moved and extended

## Accomplishments

- The factory's `initializeParams` writes `"interopHost"` and `"interopPort"` instead of the two `javaInterop`-prefixed names the server never read. The diff is exactly two string literals; values, the `localhost` fallback and the single `getEffectiveJavaInteropPort()` call are unchanged.
- `InteropInitOptionsContractTest` (four tests: `theFactoryWritesTheInteropKeysTheServerReads`, `theFactoryWritesNoJavaInteropPrefixedWireKey`, `theServerReadsTheSameTwoKeys`, `vsCodeSendsTheSameTwoKeys`) fails if the factory, the server reader or VS Code renames a key alone.
- The todo moved from `pending/` to `completed/` as a rename, with `resolves_phase: 129` and a `## Resolution` section.

## Task Commits

1. **Task 1: IntelliJ writes interopHost/interopPort, pinned against the server reader and VS Code writer** - `c5836956` (fix)
2. **Task 2: The todo is closed with its resolution, and the whole IntelliJ suite stays green** - `74c33e72` (docs)

## TDD record

RED run before the rename: 4 tests, 2 failed, the two named `theFactoryWritesTheInteropKeysTheServerReads` (assertion at line 90) and `theFactoryWritesNoJavaInteropPrefixedWireKey` (assertion at line 102). The two server/VS Code tests passed already, as expected. GREEN after the two literal edits: all four pass together with `EffectiveInteropPortSourceGuardTest`, `Lsp4ijOverrideSiteSourceGuardTest` and `CompilerOutputDirectorySourceGuardTest`.

## Whole IntelliJ suite

`./gradlew cleanTest test --offline --console=plain` summed from `build/test-results/test/TEST-*.xml`:

`tests=1267 failures=0 errors=0` (baseline 1263 plus the four new contract tests).

## Behaviour change

IntelliJ's configured interop host and its effective, auto-detected port now reach the server at initialize. Before, the server never saw them (it read `interopHost`/`interopPort` and IntelliJ sent differently named keys), so it always used `localhost:5008`. A user whose BBj.properties port differs from 5008 now connects to the detected port, as IntelliJ's own interop probe already did. The host and port are the user's own configured or detected values, and the server still validates them in `setConnectionConfig` (`interop-config.ts`), which is unchanged. Initialization options are the only settings channel for IntelliJ (LSP4IJ settings push and pull are not wired for BBj), so there is no later configuration push to reconcile.

## Deviations from Plan

None - plan executed exactly as written. The task-level `<verify>` and `<acceptance_criteria>` commands all passed: one quoted `"interopHost"` and one `"interopPort"` in the factory, no change under `bbj-vscode/` or in `BbjSettings.java`, two changed lines (both `addProperty` literals) in the factory, and the todo move staged as a rename.

## Known Stubs

None.

## Threat Flags

None. The trust boundary in the plan's threat model (hand-edited `BbjSettings.xml` to server interop config) is unchanged in kind; the server-side validation stays in place.

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/InteropInitOptionsContractTest.java`
- FOUND: `.planning/todos/completed/2026-09-26-intellij-interop-initoptions-key-mismatch.md`; the pending copy is gone
- FOUND commits `c5836956` and `74c33e72` on `gsd/v4.9-bbj-ls-denum-format`
- Plan-level verification: contract test plus the three factory guards green; whole suite 1267 tests, 0 failures, 0 errors
