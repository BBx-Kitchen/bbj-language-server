---
phase: 106-on-save-compiler-check-in-both-ides
plan: 03
subsystem: ide-settings
tags: [intellij, swing, initializationOptions, docusaurus, vscode-package-json]

# Dependency graph
requires:
  - phase: 106-on-save-compiler-check-in-both-ides
    provides: "The server's compilerTrigger initializationOptions allow-list ('debounced' | 'on-save' | 'off') that both clients already target (bbj-ws-manager.ts)"
provides:
  - "IntelliJ users can choose Debounced, On save or Off in a Compiler check dropdown, sent to the language server as the same flat compilerTrigger initializationOptions key VS Code already uses"
  - "The VS Code bbj.compiler.trigger setting description and both feature docs describe the three modes as implemented, replacing the old on-save placeholder text and the slow-completion workaround advice"
affects: [106-07]

# Actuals (#2632)
actuals:
  tokens: 7704
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IntelliJ setting -> flat initializationOptions key -> settings-apply restart, following the #571 compilerOutputDirectory precedent exactly (CompilerInitOptions holds the wire constants and normalization; BbjSettingsComponent stays free of BbjSettings references; BbjSettingsConfigurable wires isModified/apply/reset)"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerTriggerSourceGuardTest.java
    - bbj-vscode/package.json
    - documentation/docs/vscode/features.md
    - documentation/docs/intellij/features.md

key-decisions:
  - "Task 1 (tracer): production-quality wiring plus its own JUnit coverage in one task, then the auto-mode tracer feedback gate re-ran the targeted Gradle verify before Task 2 started."
  - "Task 2 (tdd=true): the two new source-guard assertions were added first, confirmed red (both failed for the expected reason -- neither the dropdown nor the configurable wiring existed yet), then the implementation was added and the whole suite re-run green."

requirements-completed: [TRIG-07]

coverage:
  - id: D1
    description: "IntelliJ sends its persisted compiler-trigger choice to the language server as the flat compilerTrigger initializationOptions key, normalized to one of the three server-accepted values, from startup and after every settings Apply"
    requirement: "TRIG-06"
    verification:
      - kind: unit
        ref: "CompilerInitOptionsTest#theTriggerKeyIsTheFlatNameTheServerReads, eachWireValueNormalisesToItself, nullEmptyBlankAndUnknownTriggerValuesNormaliseToDebounced"
        status: pass
      - kind: unit
        ref: "CompilerTriggerSourceGuardTest (all 6 tests: field, factory wiring, no BbjLanguageClient leak, no IntelliJ import, one Compiler check row placed and ordered, isModified/apply/reset wiring)"
        status: pass
    human_judgment: true
    rationale: "TRIG-06 is also declared by plan 106-07, which has not yet produced a SUMMARY; the shared-ID gate keeps it Pending in REQUIREMENTS.md until that plan finishes, and the dropdown's on-screen appearance in a running IDE is UAT, not unit-testable."
  - id: D2
    description: "IntelliJ users choose Debounced, On save or Off in a Compiler check dropdown with a large-workspace hint, placed directly under Compile output directory and before the Node.js Runtime separator; default stays Debounced"
    requirement: "TRIG-06"
    verification:
      - kind: unit
        ref: "CompilerTriggerSourceGuardTest#theComponentDeclaresOneCompilerCheckRowBetweenOutputDirectoryAndNodeJsRuntime"
        status: pass
    human_judgment: true
    rationale: "Same TRIG-06 shared-ID deferral as D1; the dropdown's visual placement and the hint text's readability are UAT, not unit-testable."
  - id: D3
    description: "The VS Code bbj.compiler.trigger description and enumDescriptions describe debounced/on-save/off as implemented, recommend on-save for large workspaces, and drop the old placeholder and slow-completion-workaround wording; enum and default are unchanged"
    requirement: "TRIG-07"
    verification:
      - kind: unit
        ref: "node -e package.json-check (bbj-vscode/package.json bbj.compiler.trigger: enum/default unchanged, enumDescriptions[1] mentions 'open or save' and 'large workspace', no 'behaves the same' or 'workaround' text anywhere in the block)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both feature docs describe the three modes as implemented, recommend on-save for large workspaces, mention auto-save once each, and the IntelliJ doc names the new Compiler check setting instead of saying the plugin lacks one"
    requirement: "TRIG-07"
    verification:
      - kind: unit
        ref: "docs-check shell command (no 'workaround'/'behaves the same' in vscode/features.md; no 'no IntelliJ equivalent'/'has no setting for when' in intellij/features.md; 'Compiler check' present in intellij doc; 'files.autoSave' present in vscode doc; 'large workspace' present in both; 'automatic saves'/'auto-save' present in intellij doc)"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-09-24
status: complete
---

# Phase 106 Plan 03: IntelliJ Compiler-Trigger Setting and Doc Text Summary

**IntelliJ ships a "Compiler check" dropdown (Debounced/On save/Off) sent to the language server as the same flat `compilerTrigger` init option VS Code already uses, and the VS Code setting description plus both feature docs now describe the three modes as implemented instead of the old on-save placeholder and slow-completion workaround text.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-24T11:29:36Z
- **Completed:** 2026-09-24T11:38:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- `CompilerInitOptions` gained `COMPILER_TRIGGER_KEY`, the three wire constants, `TRIGGER_DISPLAY_NAMES`, `normalizeTrigger`, `triggerDisplayName` and `triggerFromDisplayName`, following the #571 `compilerOutputDirectory` pattern exactly, with its class comment corrected (it previously and wrongly claimed `compilerTrigger` already traveled this way).
- `BbjSettings.State.compilerTrigger` persists the choice, defaulting to `"debounced"`.
- `BbjLanguageServerFactory` sends the normalized trigger as `initializationOptions.compilerTrigger` on every server start, alongside the existing `compilerOutputDirectory` property.
- `BbjSettingsComponent` adds a "Compiler check:" dropdown (built from `CompilerInitOptions.TRIGGER_DISPLAY_NAMES`) with a large-workspace hint, placed directly after "Compile output directory:" and before the Node.js Runtime separator; the component never references `BbjSettings.` directly.
- `BbjSettingsConfigurable` wires `isModified`/`apply`/`reset` for the new field; `apply` stores the choice before the existing debounced `scheduleRestart()` call that re-sends fresh initialization options.
- `bbj.compiler.trigger`'s description and its three `enumDescriptions` in `package.json` now describe the modes as implemented (on-save checks only on open/save and keeps errors until the next save; off runs no compiler checks at all), recommend on-save for large workspaces, and no longer mention the old "currently behaves the same as debounced" or "workaround for slow completion" text.
- Both `documentation/docs/vscode/features.md` and `documentation/docs/intellij/features.md` describe the three modes identically in substance, each carry one line saying automatic saves count as saves, and the IntelliJ doc now names the Compiler check setting instead of saying the plugin has no equivalent.

## Task Commits

Each task was committed atomically:

1. **Task 1: The IntelliJ trigger setting reaches the language server through initialization options** - `8ffc14bf` (feat)
2. **Task 2: IntelliJ users choose the trigger in a "Compiler check:" dropdown** - `da798b9c` (test), `08582b0e` (feat)
3. **Task 3: The VS Code setting text and both feature docs describe the three modes as implemented** - `0eed6d89` (docs)

**Deviation fix:** `d67a7c64` (fix) — removed a planning decision id from a source comment (see Deviations below).

_Note: Task 2 carried `tdd="true"` and produced a separate RED (`test`) and GREEN (`feat`) commit, per the plan's TDD instruction to write the tests first and confirm them failing before landing the implementation._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java` - `COMPILER_TRIGGER_KEY`, wire constants, `TRIGGER_DISPLAY_NAMES`, `normalizeTrigger`, `triggerDisplayName`, `triggerFromDisplayName`; corrected class comment
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - `compilerTrigger` persisted field, default `"debounced"`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - adds `compilerTrigger` to `initializationOptions`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - `compilerTriggerCombo` + hint label, form row, `getCompilerTrigger()`/`setCompilerTrigger()`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - `isModified`/`apply`/`reset` wiring for `compilerTrigger`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java` - 7 new tests covering key name, normalization, idempotency and display-name round trips
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerTriggerSourceGuardTest.java` - new source-guard test (6 tests): field, factory wiring order, no `BbjLanguageClient` leak, no IntelliJ import, dropdown row placement, configurable wiring order
- `bbj-vscode/package.json` - `bbj.compiler.trigger` description and enumDescriptions rewritten (enum/default unchanged)
- `documentation/docs/vscode/features.md` - Live Compiler Diagnostics section rewritten to match implemented behavior
- `documentation/docs/intellij/features.md` - Live Compiler Diagnostics section names the new Compiler check setting

## Decisions Made
- Followed the plan's tracer/TDD discipline as written: Task 1 as a full production-quality tracer with its own verify, Task 2 test-first with a confirmed-red intermediate commit.
- No architectural decisions were needed; every wiring site mirrored the existing `compilerOutputDirectory` (#571) precedent named in the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a planning decision id leaked into a source comment**
- **Found during:** Post-task register check (required by this plan's project rules before writing this SUMMARY)
- **Issue:** The Compiler check dropdown's inline comment in `BbjSettingsComponent.java` cited a decision id from this project's internal planning register (`D-13`), which the register check forbids in source, test and doc files.
- **Fix:** Removed the id from the comment; the comment reads the same without it (`// --- Compiler check dropdown ---`).
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`
- **Verification:** Re-ran the register check (`git diff ... | grep '^+' | grep -nE '...'`) — clean (exit 1, no matches). Re-ran the whole IntelliJ JUnit suite with `--rerun-tasks` — still green.
- **Committed in:** `d67a7c64`

---

**Total deviations:** 1 auto-fixed (1 bug/register-check violation)
**Impact on plan:** Cosmetic only — a single source comment. No behavior, test, or acceptance-criteria change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `TRIG-07` is fully implemented and verified in this plan.
- `TRIG-06` is functionally implemented here (the dropdown, its wiring, and the initialization-options delivery all pass their tests) but stays `Pending` in REQUIREMENTS.md because plan `106-07` also declares it and has not yet produced a SUMMARY — the shared-ID gate (`requirements.ready-ids`) reports it blocked for that reason, not because anything here is incomplete.
- The IntelliJ JUnit suite passed with `--rerun-tasks` after every task and after the deviation fix (18 actionable tasks, `BUILD SUCCESSFUL` each time).
- Hand UAT of the dropdown in a running IDE (visual placement, hint text, Apply-triggered restart carrying the choice) is deferred to the phase's end-of-phase UAT pass named in `106-CONTEXT.md`'s plan-split note, alongside the VSIX/IntelliJ-zip rebuild from the final tree.

---
*Phase: 106-on-save-compiler-check-in-both-ides*
*Completed: 2026-09-24*

## Self-Check: PASSED

- All 10 modified files confirmed present on disk with the expected content.
- All 5 task/deviation commits (`8ffc14bf`, `da798b9c`, `08582b0e`, `0eed6d89`, `d67a7c64`) confirmed in `git log`.
- Plan `<verification>` re-run clean: `cd bbj-intellij && ./gradlew test --rerun-tasks --console=plain` — `BUILD SUCCESSFUL`, 18 actionable tasks; the package.json and docs checks printed `trigger-setting-ok` and `docs-ok`.
- Every task's `<acceptance_criteria>` re-verified via the grep/test commands documented inline during execution — all passed.
- Register check over `383a0888..HEAD` for `bbj-vscode/src bbj-vscode/test bbj-vscode/package.json bbj-intellij/src documentation/docs` — clean after the deviation fix.
