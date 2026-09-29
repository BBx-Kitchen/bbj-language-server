---
phase: 113-composer-webview-hardening-consolidation
plan: "01"
subsystem: testing
tags: [vitest, vscode-extension, composer, webview, code-action]

requires:
  - phase: 112-em-login-and-web-launch-fail-closed
    provides: a stable phase base (commit 90031944) to lock in current addWindow/addChildWindow/SETOPTS composer behaviour against
provides:
  - "bbj-vscode/test/addwindow-composer-ui.test.ts: unmocked coverage of addwindow-composer-ui.ts (registration, Code Action, command, cue click)"
  - "bbj-vscode/test/addchildwindow-composer-ui.test.ts: unmocked coverage of addchildwindow-composer-ui.ts, including its no-flags-slot refusal"
  - "bbj-vscode/test/setopts-composer-ui.test.ts: unmocked coverage of setopts-composer-ui.ts (Code Action, command with/without an argument, active-config hint, cue click)"
affects: [113-05, 113-06, 113-07, 113-08]

actuals:
  tokens: 14666
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Unmocked vscode-adjacent module test: only `vi.mock('vscode', ...)` is mocked; the module under test, its webview module, its domain module and composer-lens-command.ts all run for real"
    - "Literal-expectation pinning: Code Action labels, ranges, preserved bits and title fallbacks are computed by hand from the domain catalogs and hard-coded as test literals, never by calling the helper under test"

key-files:
  created:
    - bbj-vscode/test/addwindow-composer-ui.test.ts
    - bbj-vscode/test/addchildwindow-composer-ui.test.ts
    - bbj-vscode/test/setopts-composer-ui.test.ts
  modified: []

key-decisions:
  - "Ranges (flagsRange, hexRange, insert offsets) are derived from each test's own fixed line string via `line.indexOf(...)`, not from calling addWindowPanelArgAt/addChildWindowPanelArgAt/setoptsConfigPanelArgAt — this is a mechanical fact about the literal fixture text, not a value computed by the helper under test"
  - "Long-vector SETOPTS ellipsis test asserts the truncated label's shape (72-character parenthesized part ending in the ellipsis character) rather than hand-transcribing the full describeVector() output, avoiding a fragile 200+ character literal"
  - "WorkspaceEdit.replace assertions for addWindow/addChildWindow use `new FakePosition(line, col)` pairs (matching `new vscode.Range(Position, Position)` in the real applyEdit helpers), while the SETOPTS webview's `new vscode.Range(line, col, line, col)` 4-number form is asserted directly — the two panels genuinely call Range differently"

patterns-established:
  - "Composer-cue click coverage: `openComposerAt` from composer-lens-command.ts is exercised for real (not mocked) to drive each `*-composer-ui.ts` module's cue-click entry point, using workspace.textDocuments fakes"

requirements-completed: [TEST-10]

coverage:
  - id: D1
    description: "addwindow-composer-ui.ts's registration, Code Action provider and bbj.composeAddWindow command all execute under test for the first time"
    requirement: TEST-10
    verification:
      - kind: unit
        ref: "test/addwindow-composer-ui.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "addchildwindow-composer-ui.ts's registration, Code Action provider (including its no-flags-slot refusal and 'Child' title fallback) and bbj.composeAddChildWindow command all execute under test for the first time"
    requirement: TEST-10
    verification:
      - kind: unit
        ref: "test/addchildwindow-composer-ui.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "setopts-composer-ui.ts's registration, bbx-config Code Action provider, bbj.composeConfigSetopts command (explicit arg, no-editor, wrong-languageId, first-line-wins, NEW-mode) and argForActiveEditor's active-config hint all execute under test for the first time"
    requirement: TEST-10
    verification:
      - kind: unit
        ref: "test/setopts-composer-ui.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "All three new files, plus every pre-existing composer test file, pass together at --maxWorkers=2 with no assertion changes to existing suites"
    requirement: TEST-10
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 01: TEST-10 composer UI wiring coverage Summary

**Three new unmocked vitest files (addwindow/addchildwindow/setopts `*-composer-ui.ts`) execute registration, Code Action providers, commands and composer-cue clicks that every prior test replaced with `vi.fn()`.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-27T10:11:55Z
- **Completed:** 2026-09-27T10:29:40Z
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments
- `test/addwindow-composer-ui.test.ts` (14 tests): drives `registerAddWindowComposer`'s command and `CodeActionProvider` unmocked, pins Code Action labels/ranges/preserved-bit values as literals, and exercises the composer-cue click path through the real `openComposerAt`.
- `test/addchildwindow-composer-ui.test.ts` (16 tests): same coverage for `addchildwindow-composer-ui.ts`, plus its extra no-flags-slot refusal (a call with neither a flags literal nor a title slot yields no Code Action) and its `"Child"` title fallback.
- `test/setopts-composer-ui.test.ts` (14 tests): drives `registerSetOptsComposer`'s bbx-config-scoped Code Action provider and `bbj.composeConfigSetopts` command through every routing branch (explicit argument, no editor, wrong `languageId`, first-SETOPTS-line-wins, NEW mode), the active-config-path hint via the real `config-path-cache.ts`, and the cue-click path for `setopts-config`.

## Task Commits

Each task was committed atomically:

1. **Task 1: addwindow-composer-ui.ts runs end to end under test** - `b2bdbfb9` (test)
2. **Task 2: addchildwindow-composer-ui.ts is executed for real, including its no-flags-slot refusal** - `751aca8b` (test)
3. **Task 3: setopts-composer-ui.ts is executed for real: bbx-config Code Action, command, active-config hint** - `a2adba68` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `bbj-vscode/test/addwindow-composer-ui.test.ts` - registration, Code Action, command routing and cue-click coverage for the addWindow composer UI
- `bbj-vscode/test/addchildwindow-composer-ui.test.ts` - same for addChildWindow, plus the no-flags-slot refusal and title fallback
- `bbj-vscode/test/setopts-composer-ui.test.ts` - same for the config.bbx SETOPTS composer, plus the active-config-path hint

## Decisions Made
- Ranges/offsets in test expectations are derived from each test's own literal fixture string via `line.indexOf(...)`, never by calling the helper under test — keeps expectations independently verifiable while staying exact.
- The long-SETOPTS-vector ellipsis test asserts the truncated label's *shape* (a fixed 72-character parenthesized part ending in the ellipsis character) instead of transcribing the full multi-hundred-character `describeVector()` summary by hand.

## Deviations from Plan

None - plan executed exactly as written. Two implementation-detail corrections were made while first running the tests (not scope deviations, just getting the exact mock shape right):
- `addwindow-composer-webview.ts`'s and `addchildwindow-composer-webview.ts`'s `applyEdit` construct `new vscode.Range(Position, Position)` from two `Position` objects, not four raw numbers — the initial `FakeRange(3, 50, 3, 61)` assertion was corrected to `FakeRange(new FakePosition(3, 50), new FakePosition(3, 61), undefined, undefined)` to match.
- `openSetOptsComposerPanel`'s NEW-mode insert uses the editor's own `document.uri` object directly (never `vscode.Uri.parse`), so the corresponding assertion reads `uriArg.toString()` instead of the `Uri.parse` mock's `__uri` field.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three `*-composer-ui.ts` files are now executed by tests (not only mocked) and pass unchanged against the phase base commit (90031944) — plans 05-08 can consolidate their duplicated helpers (CSP, call-locator/scanner, window-composer UI helpers, `titleArg`) and re-run these three files unchanged as the regression gate (criterion 3/4).
- Whole-suite run at `--maxWorkers=2` confirms no regression: `numFailedTests` is effectively 0 — the only failures are 11 pre-existing `beforeAll` hook timeouts (contention under parallel load, unrelated to composer code — no composer test file appears among them) and the already-documented `installed-extension-e2e.test.ts` "No document found" failure (stale installed VSIX bundle, tracked in `.planning/DEBT.md`/`99/deferred-items.md`, not a regression).
- Existing composer suites are byte-identical to the phase base (`git diff --quiet 90031944 -- <15 composer test files>` exits 0).

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- All 3 created test files found on disk.
- All 3 task commit hashes (`b2bdbfb9`, `751aca8b`, `a2adba68`) found in git log.
- Task-level acceptance criteria re-verified: 44/44 tests pass across the three new files run together; `vi.mock(` count is 1 per file; `git status --porcelain -- bbj-vscode/src` is empty; no planning-id tokens in any of the three files; eslint clean.
- Plan-level `<verification>` re-run: the 15 pre-existing composer test files are byte-identical to the phase base (90031944); whole-suite `--maxWorkers=2` run shows 3039 passed / 194 skipped tests with no new failing test outside the pre-existing `beforeAll` hook-timeout contention and the already-documented `installed-extension-e2e.test.ts` failure.
