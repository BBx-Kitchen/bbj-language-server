---
phase: 126-ls-denum
plan: 07
subsystem: vscode-client-denumber
tags: [vscode, diagnostics, problems-view, denumber, vitest]
requires:
  - phase: 126-ls-denum
    provides: "the bbj/denumDiagnostics and bbj/showDenumDiagnostics notifications and the output-channel block (plan 02)"
provides:
  - "A bbj-denum DiagnosticCollection fed from bbj/denumDiagnostics for an open BBj document, with line, severity, message and source mapped"
  - "Show on the Denumbered. N error(s). message opens the Problems view without taking focus"
  - "A clear rule: a content change or a close removes the entries, the next list replaces them"
  - "vscode-free denumPayloadUri, denumProblems and MAX_DENUM_PROBLEMS sharing one entry validator with the output block"
affects: [127-ls-denum-on-open, uat-recheck]

actuals:
  tokens: 8783
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A payload uri only selects an open document by string comparison; collections are keyed by that document's own uri, never a Uri parsed from the payload"
    - "The collection is created lazily on the first placing list so activation mocks in other test files stay valid"

key-files:
  created: []
  modified:
    - bbj-vscode/src/denum-diagnostics-output.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/language/denum-notifications.ts
    - bbj-vscode/test/denum-diagnostics-output.test.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/activation-command-coverage.test.ts

key-decisions:
  - "The 'BBj' output channel keeps the block as a log copy; the Problems entries are the primary landing place and are cleared on edit"
  - "Show runs workbench.actions.view.problems with preserveFocus so the view opens without taking focus and never toggles closed"
  - "Severity is mapped by a function evaluated at call time, not a module-level table, so importing extension.ts needs no DiagnosticSeverity in a test's vscode mock"

requirements-completed: [DEN-04]

coverage:
  - id: D1
    description: "A denumber list for an open BBj document appears in the Problems view as entries on the right lines with the mapped severity, the original line number in the message and source BBj Denumber"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#problems for an open document"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/denum-diagnostics-output.test.ts#denumProblems"
        status: pass
    human_judgment: false
  - id: D2
    description: "Show opens the Problems view with preserveFocus and no longer reveals the BBj channel, whatever the notification payload"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#the reveal notification with %s opens the Problems view and nothing else"
        status: pass
    human_judgment: false
  - id: D3
    description: "Entries never outlive the denumbered text: a content change or a close removes them, a save without a content change keeps them, the next list replaces them"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#clearing"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/activation-command-coverage.test.ts#activation sequence"
        status: pass
    human_judgment: false
  - id: D4
    description: "A uri that names no open BBj document, a non-BBj document, a command uri, a numeric uri and non-object payloads place nothing and create nothing; a placed entry carries only range, message, severity and source"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#places nothing, creates no collection and still writes the log copy"
        status: pass
    human_judgment: false
  - id: D5
    description: "In VS Code from a VSIX built from the final tree, denumbering a numbered file with a syntax error and clicking Show lists the error under the file in Problems while the editor keeps focus; typing one character removes it"
    requirement: DEN-04
    verification: []
    human_judgment: true
    rationale: "The Problems view, the focus behaviour and the click-through are drawn by the editor; hermetic tests stop at the mocked vscode API"

duration: 5min
completed: 2026-10-03
status: complete
---

# Phase 126 Plan 07: Denumber diagnostics in the Problems view Summary

**bbj/denumDiagnostics now lands as Problems entries from a dedicated bbj-denum collection on the open BBj document, Show opens the Problems view with preserveFocus, and a content change or close clears them.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-03T07:33:22Z
- **Completed:** 2026-10-03T07:38:22Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- The list handler keeps the output-channel log copy and, in its own try/catch, places one `vscode.Diagnostic` per valid entry on the matching open BBj document. Line 0 goes on the first line, a line past the end on the last, severity ERROR/WARNING/INFO maps to Error/Warning/Information, and the message carries the original line number or "no location".
- Show runs `workbench.actions.view.problems` with `{ preserveFocus: true }` and ignores its payload; the channel is no longer revealed.
- `onDidChangeTextDocument` (content changes only) and `onDidCloseTextDocument` delete the document's entries; the next list replaces them; a save's dirty-state flip keeps them.
- `denumPayloadUri` and `denumProblems` share one entry validator with the output block, so both skip exactly the same invalid entries. The client caps entries at 500 again because the payload crosses a process boundary.
- The host contract comment in `denum-notifications.ts` now allows problems on an already open document and still forbids commands, links and paths.

## Task Commits

1. **Task 1: list in Problems view, Show opens it without taking focus** - `3ba80edd` (feat)
2. **Task 2: entries cleared with the text they describe, hostile payloads, activation sequence and host contract** - `ffb7feeb` (feat)

**Plan metadata:** committed with this summary (docs)

## Files Created/Modified

- `bbj-vscode/src/denum-diagnostics-output.ts` - shared validator, `denumPayloadUri`, `denumProblems`, `MAX_DENUM_PROBLEMS`, still free of any vscode import
- `bbj-vscode/src/extension.ts` - lazy `bbj-denum` collection, placement, Problems reveal, change and close listeners
- `bbj-vscode/src/language/denum-notifications.ts` - header comment only; method names and DTOs unchanged
- `bbj-vscode/test/denum-diagnostics-output.test.ts` - pure mapper tests
- `bbj-vscode/test/extension-activation.test.ts` - vscode mock gains `createDiagnosticCollection`, `Range`, `Diagnostic`; handler tests for placement, reveal, clearing and hostile payloads
- `bbj-vscode/test/activation-command-coverage.test.ts` - two new listeners in the pinned sequence, subscription count 34 to 36

## Decisions Made

- The log copy stays in the 'BBj' channel so a record survives after an edit clears the Problems entries.
- Severity mapping is a function rather than a module-level table: a table would read `vscode.DiagnosticSeverity` at import time and break the other test files' vscode mocks.

## Deviations from Plan

### Process notes

- **Task 2 TDD ordering:** the plan marks Task 2 `tdd="true"`. The listener and the tests were written in the same working session and committed together as one `feat` commit; there is no separate failing-test commit. Most of the Task 2 behaviours (hostile payloads, replacement, all-invalid list) were already satisfied by Task 1's handler, so those tests passed on first run. The listener tests exercise code that did not exist before this task.
- **Commit trailer:** the plan text names an Opus trailer; commits carry the trailer of the model that executed them, as plan 06's commits do.
- **REQUIREMENTS.md and ROADMAP.md:** the plan's executor rules say not to edit them, while the orchestrator's objective asks for the ROADMAP progress update. ROADMAP.md was updated through `roadmap update-plan-progress`; REQUIREMENTS.md was left untouched.

Otherwise none - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.

## Issues Encountered

None. The whole suite reports 4305 passed, 0 failed tests; the only failed suite is `test/functional/installed-extension-e2e.test.ts` (the known environment suite, which spawns the installed extension bundle).

## Verification Run

- `npx vitest run` on the eight activating test files: 209 passed
- `npm run typecheck:test`, `npm run lint`, `npm run build`: clean
- `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`: 4305 passed, 0 failed tests, 1 failed suite (installed-extension-e2e, known)
- All task acceptance greps pass; no planning ids in the touched source or tests; `bbj-intellij/` untouched

## Known Stubs

None.

## Threat Flags

None. The new surface (a diagnostic collection keyed by an already open document's own uri) is covered by the plan's threat register.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Last plan of phase 126; the gap closure plans are done. Ready for the UAT re-check: VS Code from a VSIX built from the final tree, denumber a numbered file with a syntax error, click Show, confirm the Problems view lists the error under the file while the editor keeps focus, then type one character and confirm the entry disappears.

## Self-Check: PASSED

- Commits `3ba80edd` and `ffb7feeb` exist on the branch.
- All six modified files exist; no created files.
- All acceptance greps and the plan-level verification commands re-run clean.

---
*Phase: 126-ls-denum*
*Completed: 2026-10-03*
