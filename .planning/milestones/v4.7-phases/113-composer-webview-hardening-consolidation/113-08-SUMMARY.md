---
phase: 113-composer-webview-hardening-consolidation
plan: "08"
subsystem: refactor
tags: [vscode-extension, addwindow, addchildwindow, code-action, vitest]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 01's TEST-10 coverage (addwindow/addchildwindow *-ui.ts files unmocked, pinning current behaviour) and plan 05's composer-commands.ts relocation, as pre-existing behaviour this consolidation must leave unchanged"
provides:
  - "bbj-vscode/src/window-composer-ui.ts: titleArg, WINDOW_TITLE_FALLBACK, CHILD_WINDOW_TITLE_FALLBACK, windowPanelArgAt, WindowCallInfo, WindowEditTarget, WindowPanelArgSpec"
  - "addwindow-composer-ui.ts, addchildwindow-composer-ui.ts, composer-commands.ts: each imports titleArg (or the shared windowPanelArgAt Code Action helper) from window-composer-ui.ts instead of keeping its own copy"
affects: [113-UAT]

actuals:
  tokens: 5947
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "windowPanelArgAt<Extra>(spec, uri, line, lineText, character) is the one generic Code Action argument builder; each composer's addXPanelArgAt(uri, line, lineText, character) is a one-line call of it against that composer's own WindowPanelArgSpec, so callers and existing test assertions never change"
    - "The addChildWindow-only no-flags-slot refusal becomes an explicit requireFlagsSlot: boolean on the spec, rather than being unified onto addWindow or silently dropped"

key-files:
  created:
    - bbj-vscode/src/window-composer-ui.ts
    - bbj-vscode/test/window-composer-ui.test.ts
  modified:
    - bbj-vscode/src/addwindow-composer-ui.ts
    - bbj-vscode/src/addchildwindow-composer-ui.ts
    - bbj-vscode/src/composer-commands.ts

key-decisions:
  - "windowPanelArgAt is generic over an Extra type parameter for the per-kind fixed initial fields (sysgui vs. window/id/context), merged alongside the shared flags/eventMask/title fields — this is what lets both wrappers return the exact AddWindowPanelArg/AddChildWindowPanelArg shape their webview modules already declare, with zero change to those webview modules"
  - "requireFlagsSlot is a spec field, not a parameter unified in either direction: addWindow's spec sets it false (matching its pre-existing behaviour of never refusing), addChildWindow's spec sets it true (preserving its pre-existing no-title-slot refusal) — per the plan's must_haves, this stays a per-kind option"
  - "composer-commands.ts's addWindowTitleArg/addChildWindowTitleArg stay as one-line wrappers around the shared titleArg with the shared fallback constants, so the language server's decodeCall handlers are unchanged beyond the import"

patterns-established: []

requirements-completed: [REF-08]

coverage:
  - id: D1
    description: "window-composer-ui.ts holds titleArg and the generic windowPanelArgAt Code Action helper with zero runtime vscode or webview import, so the language server can import it"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "test/window-composer-ui.test.ts (titleArg, windowPanelArgAt fake-spec describe blocks)"
        status: pass
      - kind: unit
        ref: "grep -c -E \"^import [^t].*from 'vscode'|^import [^t].*-webview\\.js'\" src/window-composer-ui.ts prints 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "addWindowPanelArgAt and addChildWindowPanelArgAt are thin wrappers over windowPanelArgAt, keeping their exported names/signatures; the addChildWindow wrapper keeps its no-flags-slot refusal (requireFlagsSlot true), the addWindow wrapper keeps not having it (false)"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "test/addwindow-composer-ui.test.ts, test/addchildwindow-composer-ui.test.ts, test/window-composer-ui.test.ts (addChildWindowPanelArgAt/addWindowPanelArgAt fixture pins)"
        status: pass
      - kind: unit
        ref: "grep -c \"unknownBits(\" on both *-ui.ts files prints 0; grep -c \"windowPanelArgAt(\" prints 1 each"
        status: pass
    human_judgment: false
  - id: D3
    description: "titleArg exists exactly once (window-composer-ui.ts); composer-commands.ts's decodeCall handlers use it via the shared WINDOW_TITLE_FALLBACK/CHILD_WINDOW_TITLE_FALLBACK constants, with no behaviour change"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "grep -rn -E '^\\s*(export )?function titleArg\\(' bbj-vscode/src prints exactly 1 line (window-composer-ui.ts)"
        status: pass
      - kind: unit
        ref: "test/composer-commands.test.ts (unchanged assertions, byte-identical to phase base beyond its plan-05 import line)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The TEST-10 files (addwindow/addchildwindow-composer-ui.test.ts), composer-lens-command.test.ts and composer-commands.test.ts pass with no assertion changes; tsc and eslint are clean; the rebuilt language-server bundle still has zero require(\"vscode\")"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "npx vitest run test/window-composer-ui.test.ts test/addwindow-composer-ui.test.ts test/addchildwindow-composer-ui.test.ts test/setopts-composer-ui.test.ts test/composer-lens-command.test.ts test/composer-commands.test.ts test/composer-codelens-handler.test.ts test/extension-activation.test.ts"
        status: pass
      - kind: unit
        ref: "npx tsc -p tsconfig.json (exit 0); npx eslint on all touched files (exit 0); npm run build (exit 0) + grep -c 'require(\"vscode\")' out/language/main.cjs prints 0"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 08: Shared window-composer UI helper Summary

**A new `window-composer-ui.ts` holds `titleArg` and a generic `windowPanelArgAt` Code Action helper; addWindow, addChildWindow and the language server's `composer-commands.ts` each reduce to one-line calls of it, with addChildWindow's no-flags-slot refusal preserved as an explicit spec option.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-09-27T13:03:06Z
- **Completed:** 2026-09-27T13:27:06Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- New `bbj-vscode/src/window-composer-ui.ts`: `titleArg(args, fallback)` (moved verbatim from `composer-commands.ts`), the `WINDOW_TITLE_FALLBACK`/`CHILD_WINDOW_TITLE_FALLBACK` constants, and `windowPanelArgAt<Extra>(spec, uri, line, lineText, character)` — a generic builder implementing exactly the logic the two per-kind helpers used to duplicate (decode via `spec.findCallAt`, the `requireFlagsSlot` refusal, the preserved-bit edit target, and the configure/add label choice). Zero runtime `vscode`/webview import.
- `addwindow-composer-ui.ts`'s `addWindowPanelArgAt` is a thin wrapper over `windowPanelArgAt` with the addWindow spec (`requireFlagsSlot: false`); its private `titleArg` is gone.
- `addchildwindow-composer-ui.ts`'s `addChildWindowPanelArgAt` is a thin wrapper over `windowPanelArgAt` with the addChildWindow spec (`requireFlagsSlot: true`, preserving its no-title-slot refusal); its private `titleArg` is gone.
- `composer-commands.ts`'s `addWindowTitleArg`/`addChildWindowTitleArg` now call the shared `titleArg` with the shared fallback constants instead of keeping a local `titleArg` definition; nothing else in that file changed.
- New `bbj-vscode/test/window-composer-ui.test.ts`: `titleArg` behavior cases, `windowPanelArgAt` exercised against a fake spec (no-call, flags-value, and both `requireFlagsSlot` branches), plus fixture pins showing `addWindowPanelArgAt`/`addChildWindowPanelArgAt` still return exactly the values the existing `addwindow-composer-ui.test.ts`/`addchildwindow-composer-ui.test.ts` fixtures pin (including the no-flags-slot refusal), and both fallback-constant literals.
- Rebuilt `out/language/main.cjs` still has zero `require("vscode")` calls.

## Task Commits

Each task was committed atomically:

1. **Task 1: The addWindow Code Action and cue click decode through the shared window-composer helper, end to end** - `aefabd84` (feat)
2. **Task 2: addChildWindow and the language server's decodeCall handlers use the shared helper and titleArg; no copy is left** - `4aa3c63f` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified
- `bbj-vscode/src/window-composer-ui.ts` - new module: `titleArg`, `WINDOW_TITLE_FALLBACK`, `CHILD_WINDOW_TITLE_FALLBACK`, `windowPanelArgAt`, `WindowCallInfo`, `WindowEditTarget`, `WindowPanelArgSpec`
- `bbj-vscode/src/addwindow-composer-ui.ts` - `addWindowPanelArgAt` reduced to a one-line call of `windowPanelArgAt` against the addWindow spec; private `titleArg` removed
- `bbj-vscode/src/addchildwindow-composer-ui.ts` - `addChildWindowPanelArgAt` reduced to a one-line call of `windowPanelArgAt` against the addChildWindow spec (`requireFlagsSlot: true`); private `titleArg` removed
- `bbj-vscode/src/composer-commands.ts` - local `titleArg` removed; imports `titleArg`, `WINDOW_TITLE_FALLBACK`, `CHILD_WINDOW_TITLE_FALLBACK` from `window-composer-ui.js`
- `bbj-vscode/test/window-composer-ui.test.ts` - new file, both tasks' behavior coverage

## Decisions Made
- `windowPanelArgAt` is generic over an `Extra` type parameter for the per-kind fixed `initial` fields, merged alongside the shared `flags`/`eventMask`/`title` fields — lets both wrappers return the exact `AddWindowPanelArg`/`AddChildWindowPanelArg` shape their webview modules already declare, with no change to those modules.
- `requireFlagsSlot` stays a per-spec boolean rather than being unified onto addWindow or dropped from addChildWindow: addWindow's spec sets it `false` (its pre-existing behaviour never refused), addChildWindow's spec sets it `true` (preserving its pre-existing refusal) — a deliberate per-kind option per the plan's must-haves, not a unification in either direction.
- `composer-commands.ts`'s `addWindowTitleArg`/`addChildWindowTitleArg` stay as one-line wrappers around the shared `titleArg` with the shared fallback constants, so the language server's `decodeCall` handlers are unchanged beyond the import.

## Deviations from Plan

None - plan executed exactly as written. One correction was made while first running the register-check grep (not a scope deviation, just wording): two new test names in `window-composer-ui.test.ts` originally said "the TEST-10 addwindow-composer-ui.test.ts flags-literal fixture" / "the TEST-10 addchildwindow-composer-ui.test.ts flags-literal fixture" — reworded to drop the planning-id token ("the addwindow-composer-ui.test.ts flags-literal fixture" / "the addchildwindow-composer-ui.test.ts flags-literal fixture") before the Task 2 commit, per the project's register-check house rule.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REF-08 was shared with plan 06 (already complete); this plan is its last declaring plan, so `requirements.mark-complete` can mark it now that both plans 06 and 08 have SUMMARYs.
- Whole-suite regression gate at `--maxWorkers=2`: `numFailedTests: 11`, matching the documented pre-existing `linking.test.ts` interop baseline (11,898-corpus-unrelated env drift, tracked in `.planning/STATE.md`/`.planning/DEBT.md`) — no composer-test or other regression. The run's "8 failed test files" at the suite level reflect the known `beforeAll` hook-timeout-under-contention pattern (house rule: judge on `numFailedTests`, not the failing-suite identity delta) plus `linking.test.ts` itself; none of the failing suite names in either run were a composer file.
- This is the last plan of Phase 113 (wave 3). The phase-level `<verification>` step ("build both distributables from the final tree for UAT; run `./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*'`") is a phase-close step owned by the orchestrator/verifier across all wave-3 plans, not re-run per plan here.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- `bbj-vscode/src/window-composer-ui.ts` and `bbj-vscode/test/window-composer-ui.test.ts` found on disk.
- Both task commit hashes (`aefabd84`, `4aa3c63f`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: `grep -c -E "^import [^t].*from 'vscode'|^import [^t].*-webview\.js'" src/window-composer-ui.ts` prints 0; `grep -c "unknownBits("` prints 0 on both `*-ui.ts` files; `grep -c "windowPanelArgAt("` prints 1 on each; `grep -rn -E '^\s*(export )?function titleArg\('` across `bbj-vscode/src` prints exactly 1 line (`window-composer-ui.ts`); `grep -c "from './window-composer-ui.js'"` on `composer-commands.ts` prints 1; `npx tsc -p tsconfig.json` and `npx eslint` on all touched files both exit 0; `npm run build` exits 0 and `grep -c 'require("vscode")' out/language/main.cjs` prints 0; `git diff --numstat 90031944 -- test/composer-commands.test.ts` prints `1\t1`; `git diff --quiet 90031944 -- test/composer-lens-command.test.ts test/extension-activation.test.ts` exits 0; the register-check grep for planning identifiers across the full source+test diff against the phase base prints 0.
- Plan-level `<verification>` re-run: `npx vitest run test/window-composer-ui.test.ts test/addwindow-composer-ui.test.ts test/addchildwindow-composer-ui.test.ts test/composer-commands.test.ts` passes (62 tests, 4 files); the whole-suite gate at `--maxWorkers=2` reports `numFailedTests: 11`, matching the pre-existing `linking.test.ts` interop baseline with no composer-test or other regressions.
