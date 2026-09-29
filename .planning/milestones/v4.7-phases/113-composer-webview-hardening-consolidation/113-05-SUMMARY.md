---
phase: 113-composer-webview-hardening-consolidation
plan: "05"
subsystem: refactor
tags: [vscode-extension, language-server, intellij, file-move]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 01's TEST-10 coverage and plan 03/04's IntelliJ + assign-to changes as the pre-move behaviour this plan must leave unchanged"
provides:
  - "bbj-vscode/src/composer-commands.ts: composerHandlers and registerComposerRequests at their new location (outside src/language/)"
affects: [113-06, 113-07, 113-08]

actuals:
  tokens: 3200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bbj-vscode/src/composer-commands.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/test/composer-commands.test.ts
    - bbj-vscode/test/setopts-in-code-request.test.ts
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java

key-decisions:
  - "git mv preserved the rename (98% similarity) so the move+import-path edits stayed one clean commit rather than a delete+recreate pair"
  - "Only the five internal relative imports ('../x.js' -> './x.js') and the header comment's two module-name mentions changed inside the moved file; the registry body (composerHandlers, registerComposerRequests) is byte-identical"

patterns-established: []

requirements-completed: [REF-03]

coverage:
  - id: D1
    description: "composer-commands.ts lives at bbj-vscode/src/composer-commands.ts (no longer under src/language/); main.ts imports it from '../composer-commands.js' and still calls registerComposerRequests before createBBjServices"
    requirement: REF-03
    verification:
      - kind: unit
        ref: "test/composer-commands.test.ts"
        status: pass
      - kind: unit
        ref: "test/setopts-in-code-request.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "The rebuilt out/language/main.cjs still carries the composer request names and has zero require(\"vscode\") — a runtime vscode import would crash the language server process (T-113-13)"
    requirement: REF-03
    verification:
      - kind: unit
        ref: "npm run build (exit 0) + grep 'bbj/composer/cvs/preview' and grep -c 'require(\"vscode\")' on out/language/main.cjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "IntelliJ's ComposerRequestContractTest reads the moved file's path and still passes; ComposerModels.java's class doc names the new path; no reference to the old src/language/composer-commands location remains outside .planning"
    requirement: REF-03
    verification:
      - kind: unit
        ref: "ComposerRequestContractTest, ComposerModelsJsonBoundaryTest (BUILD SUCCESSFUL)"
        status: pass
      - kind: unit
        ref: "git grep -n -E \"src/language/composer-commands|'language', 'composer-commands'|\\\"language\\\", \\\"composer-commands\\\"\" -- bbj-vscode bbj-intellij documentation (0 hits)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No composer suite regressed: the whole vitest suite at --maxWorkers=2 shows the same pre-existing 11-failure linking.test.ts interop baseline, and the IntelliJ composer.* test package builds successfully"
    requirement: REF-03
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*' (BUILD SUCCESSFUL)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 05: composer-commands.ts relocation Summary

**composer-commands.ts moved from `bbj-vscode/src/language/` to `bbj-vscode/src/composer-commands.ts`, with all five source-level references (main.ts's import, two test files, the IntelliJ contract test's path constant, and ComposerModels.java's class doc) updated to match — behaviour unchanged.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-27T11:54:00Z
- **Completed:** 2026-09-27T12:06:00Z
- **Tasks:** 2
- **Files modified:** 6 (1 renamed + 5 one-line path updates)

## Accomplishments
- `bbj-vscode/src/language/composer-commands.ts` moved to `bbj-vscode/src/composer-commands.ts` via `git mv` (REF-03, issue #582, D-13); its five internal imports (`msgbox-composer`, `addwindow-composer`, `addchildwindow-composer`, `setopts-catalog`, `cvs-composer`) changed from `'../x.js'` to `'./x.js'`, and the header comment's two module-name mentions were updated to match. `composerHandlers`/`registerComposerRequests` themselves are untouched.
- `bbj-vscode/src/language/main.ts` imports `registerComposerRequests` from `'../composer-commands.js'` and still calls it strictly before `createBBjServices(` — the pre-services registration ordering guarded by `test/setopts-in-code-request.test.ts` is unchanged.
- `bbj-vscode/test/composer-commands.test.ts`'s import and `bbj-vscode/test/setopts-in-code-request.test.ts`'s hard-coded source-path read both point at the new location; no other line in either file changed.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java`'s `COMPOSER_COMMANDS_TS` path constant and `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java`'s class doc now name the new path.
- Rebuilt `out/language/main.cjs` still contains the composer request names (e.g. `bbj/composer/cvs/preview`) and zero `require("vscode")` calls, confirming the language-server bundle's behaviour is unchanged (T-113-13).
- Re-ran the old-path grep after the move: `git grep -n -E "src/language/composer-commands|'language', 'composer-commands'|\"language\", \"composer-commands\""` across `bbj-vscode`, `bbj-intellij` and `documentation` finds nothing. A broader unscoped `git grep composer-commands` (outside `.planning`) shows only the expected filename-only mentions in `compile-command.ts`, `setopts-in-code-request.ts` and `setopts-tristate-webview.ts` (accurate after the move, left as-is per the plan's interfaces note) plus the updated call sites themselves — no consumer outside the six known sites references the old path.

## Task Commits

Each task was committed atomically:

1. **Task 1: The language server registers every composer request from the moved module, end to end through the bundle** - `195870af` (refactor)
2. **Task 2: IntelliJ's request-contract test and model doc point at the moved file** - `79501101` (docs)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `bbj-vscode/src/composer-commands.ts` - moved from `bbj-vscode/src/language/composer-commands.ts`; five imports changed from `../x.js` to `./x.js`
- `bbj-vscode/src/language/main.ts` - import specifier changed to `'../composer-commands.js'`
- `bbj-vscode/test/composer-commands.test.ts` - import specifier changed to `'../src/composer-commands'`
- `bbj-vscode/test/setopts-in-code-request.test.ts` - `path.join` arguments no longer include the `'language'` segment
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - `COMPOSER_COMMANDS_TS` path constant updated
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - class doc's file reference updated

## Decisions Made
- Used `git mv` for the file move so git tracked it as a 98%-similarity rename in one commit, rather than a separate delete+create.
- Changed nothing inside the moved file beyond the five relative import specifiers and the header comment's two module-name mentions, per the plan's explicit "change nothing else in it" instruction — `composerHandlers` and `registerComposerRequests` are byte-identical to the phase base.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `git add` with a mix of an already-renamed-away old path and new paths failed on the stale pathspec (git had already recorded the rename); staging the new/renamed paths individually resolved it — a shell-mechanics note, not a plan deviation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REF-03 is fully delivered by this plan alone (no sibling plan in Phase 113 also declares it) — `requirements.mark-complete` can mark it immediately.
- `composer-commands.ts`'s new location (`bbj-vscode/src/composer-commands.ts`) is ready for plans 06-08's consolidation work (CSP, call-scanner, window-composer UI helper) to build alongside without re-touching this file's registry body.
- Whole-suite regression gate at `--maxWorkers=2`: 11 failed / 2944 passed / 485 skipped (3440 total) — the 11 failures are exactly the pre-existing `linking.test.ts` interop baseline (documented in `.planning/STATE.md`/`.planning/DEBT.md`), with no composer-test or other regressions. `Test Files 10 failed | 146 passed` reflects the same known `beforeAll` hook-timeout-under-contention pattern (house rule: judge on `numFailedTests`, not the failing-suite identity delta) plus the `linking.test.ts` file itself.
- IntelliJ composer package (`./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*'`) reports `BUILD SUCCESSFUL`.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- `bbj-vscode/src/composer-commands.ts` found on disk; `bbj-vscode/src/language/composer-commands.ts` confirmed absent.
- Both task commit hashes (`195870af`, `79501101`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: `git diff --numstat 90031944` on the two test files each print `1\t1`; `grep -c "from '../composer-commands.js'"` on `main.ts` prints 1; `npm run build` and `npx tsc -p tsconfig.json` both exit 0; the bundle grep for `bbj/composer/cvs/preview` prints ≥1 and for `require("vscode")` prints 0; the Gradle contract-test diff prints `1\t1`; the register-check grep for planning identifiers across the full source diff prints 0.
- Plan-level `<verification>` re-run: `npx vitest run test/composer-commands.test.ts test/setopts-in-code-request.test.ts test/composer-codelens.test.ts test/composer-codelens-handler.test.ts test/addwindow-composer-ui.test.ts test/addchildwindow-composer-ui.test.ts test/setopts-composer-ui.test.ts --maxWorkers=2` passes 122/122; the criterion-4 byte-identity guard over the 12 listed composer test files exits 0; `./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*'` reports `BUILD SUCCESSFUL`; the whole-suite vitest gate at `--maxWorkers=2` reports 11 failed tests, matching the documented pre-existing `linking.test.ts` interop baseline with no composer-test or other regressions.
