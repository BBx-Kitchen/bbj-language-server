---
phase: 92-host-side-hygiene-focus-guards
plan: "01"
subsystem: vs-code-extension
tags: [vscode, command-dispatch, focus-guard, target-resolution]

requires:
  - phase: 91-language-server-responsiveness
    provides: lean-milestone posture and standing test conventions (vitest cwd = bbj-vscode, whole-suite gate numFailedTests:0)
provides:
  - "target-resolution.ts: a vscode-free pure module resolving the target file for the seven BBj run/compile/decompile commands, argument-first, with a language/extension check on the active-editor fallback"
  - "Commands.cjs's run, runWeb, compile, decompile, decompileReplace, decompileReadonly all route through runTargetOrWarn/decompileTargetOrWarn instead of an editor-first ternary or a silently-returning legacy resolver"
  - "extension.ts's bbj.runBUI/bbj.runDWC handlers resolve and warn before ensureValidToken, so a missing target never triggers an EM credential prompt"
affects: [92-06]

actuals:
  tokens: 5675
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "vscode-free pure-module-plus-thin-wrapper: business logic lives in a module with zero vscode import, unit-tested directly; the CommonJS caller (Commands.cjs, which cannot load under Vitest) is reduced to a source-guard-verified one-line call"

key-files:
  created:
    - bbj-vscode/src/Commands/target-resolution.ts
    - bbj-vscode/test/target-resolution.test.ts
  modified:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/src/extension.ts

key-decisions:
  - "Argument-first resolution (D-05): every command's passed fsPath wins over the active editor, unconditionally and with no language check on the argument itself."
  - "Active-editor fallback mirrors the live half of the run/compile/denumber menus' when clause exactly (D-06): languageId === 'bbj' && extname !== '.bbjt'; the dead resourceLangId == bbx term from package.json is not mirrored. Decompile's fallback is looser (languageId === 'bbj' only, .bbjt included) since it has no menu entry and accepts tokenized binaries."
  - "One shared warning string for all seven commands (D-07): 'No active BBj file. Open or select a BBj file and try again.'"
  - "Run's AutoSaveUponRun now saves only when the active editor is the resolved run target (active.document.fileName === fileName), not merely whenever an editor happens to be focused — this was an unguarded gap in the pre-existing editor-first code that D-05's argument-first resolution would otherwise have reopened."

requirements-completed: [RESP-07]

coverage:
  - id: D1
    description: "Run, Run BUI, Run DWC, Compile, Denumber and both Decompile commands, invoked with no argument and no active editor, show the shared warning and do not throw"
    requirement: RESP-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - pure module"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - Commands.cjs wiring (source guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A passed file argument wins over the active editor for all seven commands"
    requirement: RESP-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - pure module > a passed argument wins over a different, valid BBj active editor"
        status: pass
    human_judgment: false
  - id: D3
    description: "The active-editor fallback for run/compile/denumber accepts only language id bbj with extension not .bbjt; a non-BBj document (plaintext, jsonc, bbx-config) or wrong-case language id is rejected"
    requirement: RESP-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - pure module > run/compile/denumber active-editor fallback"
        status: pass
    human_judgment: false
  - id: D4
    description: "The two Decompile commands accept an active editor with language id bbj including .bbjt, and otherwise show the shared warning instead of returning silently"
    requirement: RESP-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - pure module > decompile active-editor fallback"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - Commands.cjs wiring (source guard)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Run BUI and Run DWC resolve the target and show the shared warning before any EM credential prompt, so a focus change during the prompt cannot retarget the run"
    requirement: RESP-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/target-resolution.test.ts#target-resolution - extension.ts wiring (source guard)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Live VS Code UAT: Alt+G/palette Compile with no editor focused and with a .txt focused shows the warning; Explorer right-click Run on a file other than the focused one runs that file"
    verification: []
    human_judgment: true
    rationale: "CONTEXT.md scopes these as suggested (not locked) live UAT checks requiring a real VS Code window and a live BBj installation, neither available in this environment; the underlying logic is fully unit-tested above."

duration: ~15min
completed: 2026-09-13
status: complete
---

# Phase 92 Plan 01: Host-Side No-Editor Guard (RESP-07) Summary

**Extracted a vscode-free `target-resolution.ts` module and routed all seven BBj run/compile/decompile commands through it, so invoking any of them with no argument and no BBj editor focused shows "No active BBj file. Open or select a BBj file and try again." instead of throwing on `params.fsPath`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-13T07:11Z
- **Completed:** 2026-09-13T07:19Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- New `bbj-vscode/src/Commands/target-resolution.ts`: pure, `vscode`-free exports `NO_ACTIVE_BBJ_FILE_MESSAGE`, `toActiveEditorSnapshot`, `isRunnableBbjDocument`, `resolveRunTarget`, `resolveDecompileTarget`, mirroring the run/compile/denumber menus' `when` clause exactly.
- `Commands.cjs` gained `runTargetOrWarn`/`decompileTargetOrWarn` module-private wrappers; `run`, `runWeb`, `compile`, `decompile` now call `runTargetOrWarn` before `getBBjHome()`, and `decompileReplace`/`decompileReadonly` call `decompileTargetOrWarn`. The old editor-first ternary (`active ? active.document.fileName : params.fsPath`) and the silently-returning `resolveTargetFileName` helper are both gone.
- `extension.ts`'s `bbj.runBUI`/`bbj.runDWC` handlers resolve the target and warn before calling `ensureValidToken`, so a missing target never opens an EM login prompt; the resolved target is passed on as `{ fsPath: target }`, immune to a focus change during the prompt.
- `run`'s `AutoSaveUponRun` now saves the active editor only when it is the resolved run target (`active.document.fileName === fileName`), closing a gap the old unconditional `active` check left open.
- 34 new/extended tests in `test/target-resolution.test.ts`: 23 pure-module cases plus 11 source guards over `Commands.cjs` and `extension.ts`.

## Task Commits

1. **Task 1: Compile with nothing focused shows the shared warning, end to end through the new pure resolver** - `5539952d` (feat)
2. **Task 2: Run, Run BUI, Run DWC, Denumber and both Decompile commands use the same resolution, and web runs warn before any credential prompt** - `5699d86b` (feat)

**Plan metadata:** committed together with this SUMMARY.

_Note: both tasks were TDD (`tdd="true"`); each commit above is the GREEN state after its own RED→GREEN cycle within the same task — the RED assertions were added to `test/target-resolution.test.ts` and confirmed failing before the corresponding production change, then folded into the same task commit per the plan's tracer/auto task shape (no separate `test(...)` commit was specified by the plan)._

## Files Created/Modified
- `bbj-vscode/src/Commands/target-resolution.ts` - vscode-free target resolution: `resolveRunTarget`, `resolveDecompileTarget`, `isRunnableBbjDocument`, `toActiveEditorSnapshot`, `NO_ACTIVE_BBJ_FILE_MESSAGE`
- `bbj-vscode/test/target-resolution.test.ts` - unit tests for the pure module plus source guards over `Commands.cjs` and `extension.ts` wiring
- `bbj-vscode/src/Commands/Commands.cjs` - `run`, `runWeb`, `compile`, `decompile`, `decompileReplace`, `decompileReadonly` all route through the new resolver; `resolveTargetFileName` removed
- `bbj-vscode/src/extension.ts` - `bbj.runBUI`/`bbj.runDWC` resolve and warn before `ensureValidToken`

## Decisions Made
- D-05/D-06/D-07 implemented exactly as locked in `92-CONTEXT.md`: argument-first resolution, an active-editor fallback mirroring only the live half of the menus' `when` clause (the `resourceLangId == bbx` term is dead and not mirrored), and one shared warning string across all seven commands.
- Run's auto-save condition was tightened to compare the active editor against the resolved run target rather than just checking an editor is focused — necessary once the resolver could return an argument-supplied path different from whatever editor happens to be active.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `extractBraceBlock`'s standard marker/brace-search technique mis-parses `decompile`'s default parameter**
- **Found during:** Task 2 (writing the source guard for `const decompile = `)
- **Issue:** The shared `extractBraceBlock(source, marker)` helper (copied from `config-path-consumers.test.ts`, per the plan's own `<read_first>`) finds the first `{` after the marker text. For `const decompile = (params, options = {}) => {`, that first `{` belongs to the `options = {}` default-parameter value, not the arrow function's body — the helper returns an empty `{}` block instead of the real function body, making the assertion vacuous rather than a true source guard.
- **Fix:** Added a dedicated test for this one case that slices the source text directly between the full `const decompile = (params, options = {}) => {` literal and the next top-level `const decompileInPlace` declaration, instead of routing through `extractBraceBlock`. All other markers used in this plan (`compile: function`, `run: function`, `const runWeb = `, `decompileReplace: function`, `decompileReadonly: function`, `const runTargetOrWarn = `, `const decompileTargetOrWarn = `) have no default-parameter braces between the marker and the real body, so `extractBraceBlock` remains correct for them.
- **Files modified:** bbj-vscode/test/target-resolution.test.ts
- **Verification:** the dedicated test fails (RED) before `decompile`'s body was updated and passes (GREEN) after, confirmed by running `vitest run test/target-resolution.test.ts` both before and after the Commands.cjs edit.
- **Committed in:** 5699d86b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — test-mechanics only, no production-code impact)
**Impact on plan:** No scope creep; the fix is confined to how one source guard extracts its target text, not to any behavior under test.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RESP-07 (#512) is closed: all seven commands (Run, Run BUI, Run DWC, Compile, Denumber, Decompile Replace, Decompile Read-only) resolve argument-first with a language-aware active-editor fallback and a single shared warning, unit-tested end to end.
- Plan 92-06 (declared as affected by this plan) can now build on the target-resolution module if it needs the same argument-first pattern.
- Live VS Code/BBj UAT for the no-editor guard (Alt+G/palette Compile with nothing focused, Explorer right-click Run on a non-focused file) is deferred to end-of-phase human verification per `92-CONTEXT.md`'s "UAT scope beyond D-13" — the underlying logic is fully covered by automated tests in this plan.

---
*Phase: 92-host-side-hygiene-focus-guards*
*Completed: 2026-09-13*

## Self-Check: PASSED

- `bbj-vscode/src/Commands/target-resolution.ts` — FOUND
- `bbj-vscode/test/target-resolution.test.ts` — FOUND
- `.planning/phases/92-host-side-hygiene-focus-guards/92-01-SUMMARY.md` — FOUND
- Commit `5539952d` — FOUND in `git log --all`
- Commit `5699d86b` — FOUND in `git log --all`
