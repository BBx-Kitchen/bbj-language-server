---
phase: 130-docs-migration
plan: 03
subsystem: testing
tags: [qa, checklists, formatting, denumber, vscode, intellij]

requires:
  - phase: 129-intellij-verdict
    provides: IntelliJ verdict supported, CRLF known issue (lsp4ij #381), Actions on Save behaviour
provides:
  - smoke rows 11-14 for formatting and Denumber in both IDEs
  - VS Code full-checklist row 25 replaced, rows 29-38 appended
  - IntelliJ full-checklist rows 34-43 appended, including the CRLF known-issue row
affects: [130-05, release QA run]

actuals:
  tokens: 5200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["QA rows quote server message texts verbatim; samples are embedded in the row text"]

key-files:
  created: []
  modified:
    - QA/SMOKE-TEST-CHECKLIST.md
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "Planning ids written next to row names in the plan text (enablement and only-IntelliJ-extra tags) were left out of the rows, since QA files carry no planning ids"
  - "Commit trailer uses this session's Claude Sonnet 5.5 line instead of the Opus 5.5 line quoted in the plan"

patterns-established:
  - "New QA rows are appended after a section's last row; only a replaced row keeps its number"

requirements-completed: [MIG-03]

coverage:
  - id: D1
    description: "Smoke checklist rows 11-14: Format Document / Reformat Code with Undo and Denumber leaving an unsaved buffer, in VS Code and IntelliJ"
    requirement: MIG-03
    verification:
      - kind: other
        ref: "plan verify: row-count and sequence awk over QA/SMOKE-TEST-CHECKLIST.md (14 rows, 6 pipes each)"
        status: pass
    human_judgment: true
    rationale: "Whether the expected cells match product behaviour is only established by executing the rows in the release QA run"
  - id: D2
    description: "Full checklist VS Code row 25 replaced and rows 29-38 appended with verbatim message texts"
    requirement: MIG-03
    verification:
      - kind: other
        ref: "plan verify: section sequence 1-38, required message strings present, no removed Java path setting, no planning ids"
        status: pass
    human_judgment: true
    rationale: "Expected texts are quoted from the research; execution against a live BBjServices is the release QA run"
  - id: D3
    description: "Full checklist IntelliJ rows 34-43 appended, including Denumber greyed out on unnumbered and early-mixed files and the CRLF known-issue row"
    requirement: MIG-03
    verification:
      - kind: other
        ref: "plan verify: section sequence 1-43, required message strings present, no closing keyword before an issue number"
        status: pass
    human_judgment: true
    rationale: "IntelliJ enablement and the CRLF no-message behaviour are observed in the IDE, not asserted by a test"

duration: 8min
completed: 2026-10-04
status: complete
---

# Phase 130 Plan 03: QA checklist rows for formatting and Denumber Summary

**Smoke rows 11-14 and mirrored full-checklist rows for format, selection, format on save, Denumber, prompt/banner, creatable error cases and the IntelliJ CRLF known issue, with expected texts quoted verbatim from the server code**

## Performance

- **Duration:** about 8 min
- **Completed:** 2026-10-04
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

New row numbers per section:

- **Smoke checklist** (now 14 rows): 11 Format Document (VS Code), 12 Denumber (VS Code), 13 Reformat Code (IntelliJ), 14 Denumber (IntelliJ).
- **Full checklist, VS Code - LSP Features** (now 1-38): row 25 replaced in place ("Formatter settings apply without a reload; the old split key moves", with the verbatim `Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.` log line); new rows 29 Format Document, 30 Format Selection, 31 Format on save, 32 Denumber command and labels, 33 Open-file Denumber prompt, 34 BBjServices stopped, 35 Invalid formatter setting, 36 Formatting a line-numbered file, 37 Denumber on a mixed file, 38 Denumber on an unnumbered file.
- **Full checklist, IntelliJ IDEA - LSP Features** (now 1-43): new rows 34 Reformat Code, 35 Reformat a selection, 36 Format on save (Actions on Save), 37 Denumber action and labels, 38 Line-numbered banner, 39 BBjServices stopped, 40 Formatting a line-numbered file, 41 Denumber on a mixed file (action greyed out), 42 Denumber on an unnumbered file (action greyed out), 43 Line ending CRLF (known issue, lsp4ij #381).

No existing row number moved, the removed Java path setting is gone from both files, and no row exists for BBj older than 26.03, a timeout or a too-large file.

## Task Commits

1. **Task 1: VS Code formatting and Denumber rows in both checklists** - `83b7f273` (docs)
2. **Task 2: IntelliJ formatting and Denumber rows matching the supported verdict** - `1fa58129` (docs)

**Plan metadata:** committed with this summary (docs: complete plan)

## Files Created/Modified

- `QA/SMOKE-TEST-CHECKLIST.md` - smoke rows 11-14
- `QA/FULL-TEST-CHECKLIST.md` - VS Code row 25 replaced, rows 29-38; IntelliJ rows 34-43

## Decisions Made

- The plan text tagged two row names with planning ids (an enablement tag and an only-IntelliJ-extra tag); these were left out of the rows because QA files carry no planning ids.
- The commit trailer is this session's `Co-Authored-By: Claude Sonnet 5.5` line, not the Opus 5.5 line quoted in the plan context.

## Deviations from Plan

None - plan executed exactly as written (apart from the two wording choices above, which follow the repo rules).

## Issues Encountered

None. Both tasks' automated verify commands exited 0 on the first run.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

MIG-03 deliverable is in place; plan 130-05 ticks the requirement. The rows are unexecuted until the release QA run, including the two expectations the research marked as assumed (the shared-connection error toast on a format-only action is deliberately not required, and one Undo after Denumber and Format is expected to restore the numbers).

## Self-Check: PASSED

- `QA/SMOKE-TEST-CHECKLIST.md` and `QA/FULL-TEST-CHECKLIST.md` exist; commits `83b7f273` and `1fa58129` found in git log.
- Plan verification re-run: smoke 1-14, VS Code 1-38, IntelliJ 1-43 in sequence; every row has 6 unescaped pipes; every required verbatim string present per section; no Java path setting, planning id or closing keyword in either file.

---
*Phase: 130-docs-migration*
*Completed: 2026-10-04*
