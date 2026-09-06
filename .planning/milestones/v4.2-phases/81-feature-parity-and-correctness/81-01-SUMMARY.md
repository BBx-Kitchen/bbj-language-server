---
phase: 81-feature-parity-and-correctness
plan: 01
subsystem: language-server
tags: [bbjcpl, lsp, compile, vitest, langium]

# Dependency graph
requires:
  - phase: 78-build-test-foundation
    provides: Gradle/JDK 17 toolchain and `bbj-vscode` build/test proofs this plan's `npm run build` and vitest runs depend on
provides:
  - "A `bbj/compile` LSP request registered on the language-server connection, options-aware and free of IntelliJ-side bbjcpl logic"
  - "A single vscode-free `COMPILER_OPTIONS` table (`bbj-vscode/src/language/compiler-options.ts`) shared by the language server and VS Code's `bbj.compile` command"
  - "`BBjCPLService.compileWithOptions`, a real-compile sibling to the existing validate-only `compile(filePath)`, never touching its abort-on-resave map"
  - "`BBjWorkspaceManager.compilerConfig`/`getCompilerConfig`/`setCompilerConfig`, seeded from a flat `compilerOutputDirectory` initializationOptions key — the channel 81-04 will populate from IntelliJ"
affects: [81-04-intellij-compiler-output-directory-setting, 81-05-intellij-compile-action]

# Actuals (#2632)
actuals:
  tokens: 18934
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reader-driven config access (`CompilerConfigReader = (fullKey) => unknown`) replacing a `vscode.WorkspaceConfiguration` parameter, so shared option/validation logic has zero `vscode` dependency"
    - "Thin `vscode`-typed adapter over a shared, framework-free module (`Commands/CompilerOptions.ts` over `language/compiler-options.ts`) — same pattern as `process-args.ts`'s argv builders"
    - "Structural (duck-typed) request-handler dependencies (`CompileRequestDeps`) to keep a custom LSP request unit-testable with plain stubs and free of circular imports back to `bbj-module.ts`"

key-files:
  created:
    - bbj-vscode/src/language/compiler-options.ts
    - bbj-vscode/src/language/compile-command.ts
    - bbj-vscode/test/compile-request.test.ts
    - bbj-vscode/test/compiler-options-single-table.test.ts
    - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/
    - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/
  modified:
    - bbj-vscode/src/language/bbj-cpl-service.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/Commands/CompilerOptions.ts

key-decisions:
  - "Success classified as `stderr.trim() === ''`, never from the process exit status (always 0) and never from an empty `diagnostics` array — a fatal bbjcpl error that `parseBbjcplOutput` cannot parse is still a failure, carrying the raw stderr text as `message` with `reason: 'bbjcpl-error'`."
  - "`compileWithOptions` never reads, writes or clears `BBjCPLService.inFlight` — the explicit compile and the background validate-only compile of the same file are fully independent; neither cancels the other (verified by two dedicated concurrency tests)."
  - "`compilerOutputDirectory` is seeded via the flat `initializationOptions` key exactly like `compilerTrigger`, per RESEARCH.md's corrected finding that IntelliJ's `createSettings()` object never reaches `config.compiler` — `setCompilerConfig` merges rather than replaces so a later settings push can never erase that seed."
  - "`CompilerOptions.ts` keeps its existing exported names/signatures and its `vscode` import, becoming a two-function adapter over the shared table rather than being deleted — VS Code's compile command and its whole existing test file are untouched."

requirements-completed: [PARITY-01]

coverage:
  - id: D1
    description: "bbj/compile request handler: an output-directory-configured compile runs the real bbjcpl binary through the shared option table and returns { success: true, diagnostics: [] }"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compile-request.test.ts#aCompileWithAnOutputDirectorySucceedsAndReturnsNoDiagnostics"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts#theArgumentListCarriesTheOutputDirectoryFlagAndTheFileAndNoValidateOnlyFlag"
        status: pass
    human_judgment: false
  - id: D2
    description: "compilerOutputDirectory arrives via the flat initializationOptions key and survives a later settings push that carries no output directory"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compile-request.test.ts#theCompilerOutputDirectoryArrivesFromTheFlatInitializationOptionsKey"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-05 guard: neither an output directory nor validate-only refuses before any bbjcpl spawn"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compile-request.test.ts#noOutputDirectoryAndNoValidateOnlyIsRefusedWithoutSpawningTheCompiler"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts#validateOnlyAloneSatisfiesTheOutputLocationRule"
        status: pass
    human_judgment: false
  - id: D4
    description: "Unparsed fatal stderr is a failure carrying the raw text; parsed compiler errors come back as diagnostics, not raw text"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compile-request.test.ts#stderrThatParsesIntoNothingIsAFailureCarryingTheRawText"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts#parsedCompilerErrorsComeBackAsDiagnosticsNotAsRawText"
        status: pass
    human_judgment: false
  - id: D5
    description: "Refusal reasons for an unconfigured bbj.home, a non-file URI, and conflicting options, each with its own machine-readable reason"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compile-request.test.ts#anUnconfiguredBbjHomeIsRefusedWithItsOwnReason"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts#aNonFileUriIsRefusedBeforeAnythingElse"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts#conflictingOptionsAreRefusedWithTheValidatorsMessage"
        status: pass
    human_judgment: false
  - id: D6
    description: "An explicit compile and a background validate-only compile of the same file never cancel each other; two overlapping explicit compiles both settle"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compile-request.test.ts#anExplicitCompileIsNotCancelledByABackgroundValidateOnlyCompileOfTheSameFile"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts#twoOverlappingExplicitCompilesOfTheSameFileBothSettle"
        status: pass
    human_judgment: false
  - id: D7
    description: "COMPILER_OPTIONS exists exactly once in the repository; both entry points read the same table and agree on build/validate output; VS Code's compile command and its existing test file are unchanged"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "test/compiler-options-single-table.test.ts#theVsCodeEntryPointAndTheServerEntryPointReadTheSameTable"
        status: pass
      - kind: unit
        ref: "test/compiler-options-single-table.test.ts#bothEntryPointsProduceIdenticalArgumentsForTheSameSettings"
        status: pass
      - kind: unit
        ref: "test/compiler-options-single-table.test.ts#bothEntryPointsAgreeOnAConflictingConfiguration"
        status: pass
      - kind: unit
        ref: "test/compiler-options.test.ts (50 pre-existing tests, unedited)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 01: bbj/compile Language-Server Request Summary

**A real, options-aware `bbj/compile` LSP request that runs bbjcpl through one shared, vscode-free option table — the third leg IntelliJ's compile action (81-05) and VS Code's `bbj.compile` command both now have available to them.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-05T10:12:24Z (approx, from STATE.md session marker)
- **Completed:** 2026-09-05T10:27:00Z
- **Tasks:** 3
- **Files modified:** 10 (4 modified, 6 created — counting the two fixture directories as one entry each)

## Accomplishments

- Re-homed the 20-entry BBjCPL compiler-option table into a `vscode`-free module (`compiler-options.ts`) driven by a plain `CompilerConfigReader` function, with `buildCompileOptionsFrom`/`validateOptionsFrom`, `readerFromCompilerConfig` (walks a nested compiler-config object) and the D-05 `lacksExplicitOutputLocation` guard predicate.
- Added `BBjCPLService.compileWithOptions(filePath, compilerArgs)`, a sibling to the existing validate-only `compile(filePath)` that spawns bbjcpl without `-N`, classifies success as `stderr.trim() === ''` (never the exit code, which bbjcpl always sets to 0, and never an empty diagnostics array), and never touches the abort-on-resave `inFlight` map.
- Added `compile-command.ts`'s `bbj/compile` request handler: refuses a non-`file` URI, refuses when neither an output directory nor validate-only is configured (before any spawn), refuses on conflicting options, and otherwise runs the real compile and translates the result into a `CompileResult` with a nine-value machine-readable `reason` vocabulary. Diagnostics are returned, never published — editor squiggles stay with the existing background path.
- Wired `compilerOutputDirectory` into `BBjWorkspaceManager` via the flat `initializationOptions` channel (mirroring the existing `compilerTrigger` field) rather than through `config.compiler`, per RESEARCH.md's correction that IntelliJ's `createSettings()` object never reaches that path. `setCompilerConfig` merges rather than replaces so a later settings push can't erase the seed.
- Rewrote `Commands/CompilerOptions.ts` as a two-function adapter over the shared table so `COMPILER_OPTIONS` exists exactly once in the repository, while VS Code's `bbj.compile` command and `test/compiler-options.test.ts` (50 tests) are provably unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end bbj/compile — one file, one output directory, one real bbjcpl run** - `8c44409` (feat)
2. **Task 2: Refusals, unparsed stderr and concurrency independence** - `d3ff419` (test)
3. **Task 3: One option table — VS Code delegates instead of owning a second copy** - `31dba62` (refactor)

_Note: Tasks were implemented and verified as complete, tested units rather than through a strict per-commit RED-then-GREEN sequence — see "TDD Gate Compliance" below._

## Files Created/Modified

- `bbj-vscode/src/language/compiler-options.ts` - vscode-free `COMPILER_OPTIONS` table, reader-driven builders/validators, `readerFromCompilerConfig`, `lacksExplicitOutputLocation`
- `bbj-vscode/src/language/compile-command.ts` - `bbj/compile` request handler, `CompileParams`/`CompileResult`/`CompileFailureReason`, `registerCompileRequest`
- `bbj-vscode/src/language/bbj-cpl-service.ts` - added `compileWithOptions` and the exported `CompileRun` interface, beside the untouched `compile(filePath)`
- `bbj-vscode/src/language/bbj-ws-manager.ts` - `compilerConfig` field, `getCompilerConfig`/`setCompilerConfig`, `compilerOutputDirectory` seed in `onInitialize`
- `bbj-vscode/src/language/main.ts` - registers `bbj/compile`; forwards VS Code's `config.compiler` push to `setCompilerConfig`
- `bbj-vscode/src/Commands/CompilerOptions.ts` - rewritten as a thin adapter over `compiler-options.ts`
- `bbj-vscode/test/compile-request.test.ts` - 12 tests covering success, refusals, unparsed-stderr failure, parsed diagnostics, and compile concurrency independence
- `bbj-vscode/test/compiler-options-single-table.test.ts` - 3 tests proving the shared table and identical build/validate behaviour
- `bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/` - silent-success bbjcpl substitute logging its argv
- `bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/` - bbjcpl substitute reproducing the two-line "invalid output directory" fatal on stderr while exiting 0

## Decisions Made

See `key-decisions` in frontmatter. No decisions departed from CONTEXT.md/RESEARCH.md's locked choices; all four followed D-01/D-02/D-05/D-10 and RESEARCH.md's Pitfall 2/3 corrections directly.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1-3 auto-fixes were needed; the plan's action items matched the codebase exactly as RESEARCH.md and 81-PATTERNS.md described it.

### Process Note (not a Rule 1-4 deviation)

**Tests and implementation were written together per task, not as a strict per-commit RED-then-GREEN sequence.** Each task carries `tdd="true"`, and the plan's `<behavior>` sections were followed as the test specification, but the commit history records one commit per task (a `feat` commit for Task 1 including its 3 tests, a `test` commit for Task 2's 9 additional tests, and a `refactor` commit for Task 3) rather than a separate failing-test commit preceding each implementation commit. All 24 tests referenced by this plan (12 in `compile-request.test.ts`, 3 in `compiler-options-single-table.test.ts`, plus the 50 pre-existing `compiler-options.test.ts` tests) pass; the plan's frontmatter `type` is `execute`, not `tdd`, so the strict RED/GREEN gate-sequence enforcement in `tdd.md` does not apply at the plan level. Flagged here for transparency, not because any acceptance criterion or `<verify>` command was skipped.

---

**Total deviations:** 0 auto-fixed. **Impact:** None — plan executed as specified; the note above documents commit-granularity only.

## Issues Encountered

**Whole-suite `npm test -- --maxWorkers=2` shows 14 pre-existing failures, unrelated to this plan.** All 14 are in `test/linking.test.ts`'s "Interop related tests" describe block and `test/functional/issue447-real-interop.test.ts`'s capability-detection test — the documented environment drift since 2026-09-03 where the live `:5008` java-interop backend now exposes `getAllClassNames` (STATE.md Blockers/Concerns, MEMORY.md "Interop backend getAllClassNames test drift"). None of the 14 failures reference `compile-request.test.ts`, `compiler-options-single-table.test.ts`, `compiler-options.ts`, `compile-command.ts`, `bbj-cpl-service.ts`, `bbj-ws-manager.ts`, `main.ts` or `CompilerOptions.ts`. 1115 tests passed, 46 skipped. This is a known, already-tracked gap (todo filed 2026-09-03) — not a regression introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `bbj/compile` request, `compileWithOptions`, the shared option table, and the `compilerOutputDirectory` initializationOptions channel are all in place and tested — 81-04 (IntelliJ setting + `initializeParams` wiring) and 81-05 (IntelliJ compile action calling `bbj/compile`) can now proceed.
- `PARITY-01` is a shared requirement across 81-01/81-04/81-05 (the shared-ID gate in `requirements.ready-ids`); it stays unmarked in REQUIREMENTS.md until all three plans have summaries, even though this plan's language-server-side half is fully verified.
- No blockers for 81-02/81-03 (independent IntelliJ lexer/commenter work) or the remaining plans in this phase.

## Self-Check: PASSED

All created files verified present on disk; all four task/summary commit hashes (8c44409, d3ff419, 31dba62, 6134228) verified present in `git log`.

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*
