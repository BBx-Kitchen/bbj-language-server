---
phase: 81-feature-parity-and-correctness
plan: 04
subsystem: ide-integration
tags: [intellij, lsp4ij, settings, compiler, junit5]

# Dependency graph
requires:
  - phase: 81-feature-parity-and-correctness
    provides: "81-01's bbj/compile request and the flat compilerOutputDirectory initializationOptions key it reads on the server side"
provides:
  - "BbjSettings.State.compilerOutputDirectory, empty by default, persisted in BbjSettings.xml"
  - "A CompilerInitOptions plain-Java seam (COMPILER_OUTPUT_DIRECTORY_KEY, normalizeOutputDirectory) with no IntelliJ import, driving BbjLanguageServerFactory's flat initialization option"
  - "A BBj Compiler settings section with a directory-chooser row, wired through isModified/apply/reset exactly like configPath"
  - "A source guard (CompilerOutputDirectorySourceGuardTest) pinning all four wiring sites plus the deliberate non-change to BbjLanguageClient"
affects: [81-05-intellij-compile-action]

# Actuals (#2632)
actuals:
  tokens: 5300
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Java normalisation seam (CompilerInitOptions) with no IntelliJ import, shared by production wiring and JUnit 5 tests — trims but never splits or filesystem-checks a settings value"
    - "Flat initializationOptions key as the load-bearing settings-delivery channel, bypassing BbjLanguageClient.createSettings() entirely (a client settings object LSP4IJ 0.19.0 resolves to null for this plugin's flat shape)"
    - "Text-based source-guard test (readSource/countOccurrences/indexOf-ordering, copied from OffEdtDispatchSourceGuardTest) as the regression fence for call-site wiring no unit test can otherwise exercise"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java

key-decisions:
  - "BbjLanguageClient.java is left untouched on purpose — CONTEXT.md D-05's literal wording routes the value through createSettings(), but RESEARCH.md Pitfall 2 disassembled LSP4IJ 0.19.0 and proved that channel resolves to null for this plugin's flat client settings object. The source guard asserts the file stays unchanged so the deviation stays visible rather than silent."
  - "The new 'BBj Compiler' TitledSeparator section sits directly after 'BBj Environment', ahead of 'Node.js Runtime' — the compile output directory is conceptually part of BBj-the-compiler configuration, closest to BBj home and config.bbx path."
  - "No path validation of any kind (existence check, canonicalisation, separator rewriting) in either the settings dialog or the normalisation seam — bbjcpl's own invalid-output-directory failure surfaces through the language server's failure path instead (RESEARCH.md Open Question 2), and BbjSettingsComponentSourceGuardTest independently forbids filesystem construction in that component."

requirements-completed: [PARITY-01]

coverage:
  - id: D1
    description: "A compile output directory typed into the BBj settings dialog is persisted as BbjSettings.State.compilerOutputDirectory, empty by default"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java#bbjSettingsPersistsTheFieldExactlyOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "normalizeOutputDirectory trims but never splits or filesystem-checks; unset/blank input normalises to the empty string the server treats as 'not configured'"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java (8 tests: verbatim forwarding, null/empty/whitespace-only normalisation, interior-space preservation, Windows-style path passthrough, idempotence, no filesystem dependency)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The settings dialog offers exactly one new row, a directory chooser labelled 'Compile output directory:', with no path validation and no filesystem work"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java#bbjSettingsComponentOffersADirectoryChooserAlongsideBbjHome"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java (pre-existing guard, re-verified green)"
        status: pass
    human_judgment: false
  - id: D4
    description: "isModified, apply and reset carry the new field exactly as they carry configPath; the value is stored before the restart that re-delivers it"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java#bbjSettingsConfigurableCarriesTheFieldThroughIsModifiedApplyAndReset"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java#theValueIsStoredBeforeTheRestartThatReDeliversIt"
        status: pass
    human_judgment: false
  - id: D5
    description: "BbjLanguageServerFactory adds the flat compilerOutputDirectory initialization key before handing the options object over; getServerInterface() stays untouched"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java#theFactoryAddsThePropertyBeforeHandingOverTheInitializationOptions"
        status: pass
    human_judgment: false
  - id: D6
    description: "BbjLanguageClient.java is unchanged and a source guard asserts it stays that way"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java#theLanguageClientStaysUnchangedBecauseThatChannelNeverReachesTheServer"
        status: pass
    human_judgment: false
  - id: D7
    description: "Live-IDE dialog behavior: BBj Compiler section visible with working folder chooser and hint text; value persists across Apply/reopen; server restarts on Apply; Reset restores the previously saved value without clearing other fields"
    verification: []
    human_judgment: true
    rationale: "A Swing settings dialog cannot be exercised without the IntelliJ platform, which C-01 keeps out of the test module (Phase 79/80 practice). Deferred to /gsd-verify-work UAT in a live IDE, as recorded in the plan's <verification> Human check section."

duration: 10min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 04: IntelliJ Compiler Output Directory Setting Summary

**A "Compile output directory" field in the BBj settings dialog, persisted and forwarded to the language server through the flat `initializationOptions` channel that actually reaches it — not the `BbjLanguageClient.createSettings()` object CONTEXT.md's literal wording assumed.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-05T11:05:47Z (approx, from prior plan's commit)
- **Completed:** 2026-09-05T11:12:25Z
- **Tasks:** 3
- **Files modified:** 7 (4 modified, 3 created)

## Accomplishments

- Added `CompilerInitOptions`, a plain-Java seam with no IntelliJ import: `COMPILER_OUTPUT_DIRECTORY_KEY = "compilerOutputDirectory"` (the flat key `bbj-ws-manager.ts` already reads) and `normalizeOutputDirectory(String)`, which trims null/blank input to the empty string and otherwise forwards the value verbatim — no filesystem check, no canonicalisation, no separator rewriting.
- Added `BbjSettings.State.compilerOutputDirectory`, empty by default, with no auto-detection (an empty value is a meaningful "not configured").
- Added a "BBj Compiler" section to `BbjSettingsComponent` with a `TextFieldWithBrowseButton` directory chooser (built exactly like the BBj home field) and a hint that "Compile BBj File" needs it, plus the `getCompilerOutputDirectory()`/`setCompilerOutputDirectory(String)` accessor pair. No listener, no debounced lookup, no filesystem construction — `BbjSettingsComponentSourceGuardTest`'s pre-existing assertions still hold.
- Wired the new field through `BbjSettingsConfigurable`'s `isModified`, `apply` (stored before the existing restart scheduling), and `reset`, exactly following `configPath`'s pattern.
- Added one `options.addProperty(...)` line in `BbjLanguageServerFactory.createClientFeatures().initializeParams()` — the load-bearing channel — with a comment naming #571 and explaining why `BbjLanguageClient` is deliberately left alone.
- Added `CompilerOutputDirectorySourceGuardTest`, pinning all four wiring sites plus the non-change to `BbjLanguageClient`, so a future regression (the setting silently stops reaching the server, or someone re-routes it through the dead `createSettings()` channel) fails the build instead of failing silently in production.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — a directory typed in Settings arrives as a flat initialization option** - `f27bbe0` (feat)
2. **Task 2: Normalisation edges — unset, padded, and a path with spaces** - `c1547b4` (test)
3. **Task 3: Pin all four wiring sites and the deliberate non-change, then prove the module green** - `5a07ea0` (test)

_Note: Task 1 is `type="tracer"`; its production code and its 3 initial tests landed in one `feat` commit rather than a separate failing-test commit preceding it — see "Process Note" below._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java` - plain-Java normalisation seam and the flat initialization-options key constant
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - `compilerOutputDirectory` persisted field, empty by default
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - "BBj Compiler" dialog section with the directory-chooser field and its accessor pair
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - `isModified`/`apply`/`reset` carry the new field
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - flat `compilerOutputDirectory` initialization key added to `initializeParams`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java` - 8 behavioural tests for the normalisation seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java` - 7 source-guard tests pinning all wiring sites and the `BbjLanguageClient` non-change

## Decisions Made

See `key-decisions` in frontmatter. All three decisions were locked by CONTEXT.md D-05 and RESEARCH.md's Pitfall 2 correction — no new decisions were made beyond dialog-section placement, which was Claude's discretion per CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1-3 auto-fixes were needed. The plan's action items matched the codebase exactly as CONTEXT.md and RESEARCH.md described it (minor line-number drift in `<read_first>` references from later phase edits did not change any of the wiring described).

### Process Note (not a Rule 1-4 deviation)

**One caveat discovered while wiring the dialog row: `TextFieldWithBrowseButton.getTextField()` returns a plain `javax.swing.JTextField`, not `JBTextField`.** Setting the empty-text hint required a cast to `JBTextField` (verified via `javap` disassembly of the shipped IntelliJ Platform SDK jar that the field's no-arg constructor actually instantiates an `ExtendableTextField extends JBTextField`, so the cast is safe). This is implementation detail, not a deviation from the plan's action items — the plan asked for "empty text to a hint" without specifying the API shape.

**Task 1's test and implementation landed in one `feat` commit rather than a strict failing-test-then-implementation sequence**, matching 81-01's precedent: the plan's frontmatter `type` is `execute`, not `tdd`, so `tdd.md`'s strict plan-level RED/GREEN gate-sequence enforcement does not apply. All 8 `CompilerInitOptionsTest` tests and all 7 `CompilerOutputDirectorySourceGuardTest` tests pass; no acceptance criterion or `<verify>` command was skipped.

---

**Total deviations:** 0 auto-fixed. **Impact:** None — plan executed as specified; the notes above document implementation detail and commit-granularity only.

## Issues Encountered

None specific to this plan. The whole IntelliJ module (`./gradlew test`) ran green at 292 tests, 0 failures — no interaction with the pre-existing `BbjSettingsComponentSourceGuardTest` or any other guard.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The compile output directory setting now flows end-to-end from the IntelliJ dialog to the language server's `compilerOutputDirectory` initialization option, which 81-01 already reads and 81-01's `bbj/compile` D-05 guard already consumes.
- `PARITY-01` is a shared requirement across 81-01/81-04/81-05 (the shared-ID gate in `requirements.ready-ids`); it stays unmarked in REQUIREMENTS.md until all three plans have summaries. This plan's SUMMARY is now in place; 81-05 remains outstanding.
- 81-05 (the IntelliJ compile action) can now proceed: it has both the `bbj/compile` request (81-01) and a settings-dialog path for the user to configure an output directory (this plan) available to it.
- Live-IDE dialog verification (D7 above) is deferred to `/gsd-verify-work` UAT, per Phase 79/80 practice — no automated test can exercise the Swing dialog without the IntelliJ platform test harness this repo deliberately does not carry (C-01).

## Self-Check: PASSED

All seven created/modified files verified present on disk with `[ -f ]`; all three task commit hashes (`f27bbe0`, `c1547b4`, `5a07ea0`) verified present in `git log --oneline --all`. All acceptance criteria for all three tasks re-verified via grep and `./gradlew test` re-runs; the plan-level `<verification>` commands (targeted `CompilerInitOptionsTest`, targeted `CompilerOutputDirectorySourceGuardTest`, the pre-existing `BbjSettingsComponentSourceGuardTest`, and the whole-module `./gradlew test`) all passed with 0 failures.

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*
