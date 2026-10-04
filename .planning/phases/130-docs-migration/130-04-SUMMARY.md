---
phase: 130-docs-migration
plan: 04
subsystem: docs
tags: [docusaurus, intellij, formatting, denumber, settings-reference]

requires:
  - phase: 130-docs-migration
    provides: VS Code Formatter Settings Description cells and message wording (plan 01)
  - phase: 129-intellij-verdict
    provides: verdict supported, the CRLF known issue text (lsp4ij #381)
  - phase: 128-intellij-denum
    provides: Denumber action, line-numbered banner, console diagnostics
provides:
  - documentation/docs/intellij/formatting.md (new page, sidebar position 7)
  - Denumber BBj Program entry in the IntelliJ commands page
  - Formatter pointer section in the IntelliJ configuration page
affects: [130-05 phase gate]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "IntelliJ settings table reuses the VS Code Description cells word for word (script-checked)"
    - "Two admonitions per formatting page: the info box before the first heading, the CRLF warning right after the Line ending row"

key-files:
  created:
    - documentation/docs/intellij/formatting.md
  modified:
    - documentation/docs/intellij/index.md
    - documentation/docs/intellij/getting-started.md
    - documentation/docs/intellij/configuration.md
    - documentation/docs/intellij/commands.md
    - documentation/docs/intellij/features.md

key-decisions:
  - "Denumber messages table carries the 19 server rows of the VS Code table (without its two client rows) and a separate small table for the IntelliJ-only Denumber failed balloon bodies"
  - "Mixed-numbering row explains that the IntelliJ action only enables on files whose first 20 non-blank lines are all numbered, so the message is reached through the Reformat Code offer's Denumber button for earlier mixing"

patterns-established:
  - "Control column of the IntelliJ settings table uses the label without its colon, values show on or off for checkboxes"

requirements-completed: [MIG-01]

duration: 14min
completed: 2026-10-04
status: complete

coverage:
  - id: D1
    description: "IntelliJ Formatting page is in the sidebar and Quick Links table and documents Reformat Code, selection and Actions on Save as supported"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "npm --prefix documentation run build; build/docs/intellij/formatting.html exists; intellij.html links the page"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 15 Formatter controls with values, defaults, restart note and the CRLF warning right after the Line ending row"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "node description-reuse script: 15 descriptions; not reused: []; awk check of warning position"
        status: pass
    human_judgment: false
  - id: D3
    description: "Denumber action, banner, console diagnostics and both message tables quote the server and client texts verbatim"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "grep -F over 22 Denumber strings on intellij/formatting.md"
        status: pass
    human_judgment: true
    rationale: "A grep proves the quoted fragments are present, not that the meaning and what-to-do cells read correctly against the source; end-of-phase manual read per the plan"
  - id: D4
    description: "Commands, features, index, getting-started and configuration pages mention Denumber and formatting consistently; no old formatter, removed setting or bbjlst text on IntelliJ pages"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "section-scoped awk/grep checks and grep -rn -i -E 'javaPath|BBjCFCli|BBjCodeFormatter|formatter jar|bbjlst' documentation/docs/intellij"
        status: pass
    human_judgment: false
---

# Phase 130 Plan 04: IntelliJ Formatting Docs Summary

**New IntelliJ Formatting page (Reformat Code, selection, Actions on Save step by step, Denumber action with banner and console diagnostics, 15 Formatter controls with the CRLF warning, verbatim message tables) wired into the IntelliJ guide's index, requirements, configuration, commands and features pages.**

## Performance

- **Duration:** about 14 min (start time was not recorded at launch; taken from the session clock)
- **Completed:** 2026-10-04
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 edited)

## Accomplishments

- `intellij/formatting.md` opens with the single `:::info` box (BBj 26.03 or later, running BBjServices), says formatting is supported for the whole file, a selection and on save, and gives Format on Save as the numbered Settings > Tools > Actions on Save > Reformat code steps with one sentence that there is no BBj-specific switch and one on the double save.
- The Formatter settings table lists the 15 controls by their IntelliJ labels with values and defaults; every Description cell is identical to its VS Code twin (script-checked), the restart note's first two sentences are verbatim, and the `:::warning` with the verdict's text and the lsp4ij #381 link sits two lines after the Line ending row.
- Denumber is documented as the editor-text edit it is: Tools menu and context menu, enabled only on line-numbered files and greyed out otherwise, the banner and its `Denumber` link, the `GOSUB L100` example, console diagnostics with the `Show` button, and `Denumber and Format`.
- Formatting and Denumber message tables quote the server texts verbatim; the IntelliJ-only `Denumber failed` balloon bodies have their own table.
- Index Quick Links row, `formatting and Denumber` in the Requirements and Prerequisites sections, a `## Formatter` pointer in configuration, a `## Denumber Command` entry (`bbj.denumber`), context-menu bullet, requirements item and troubleshooting entry in commands, and a Code Formatting teaser, quick-reference row and banner bullet in features.

## Task Commits

1. **Task 1: IntelliJ Formatting page with Reformat Code, Actions on Save and the Formatter controls** - `a1908fbd` (docs)
2. **Task 2: Denumber action, banner and console diagnostics across the IntelliJ guide** - `77518b71` (docs)

**Plan metadata:** committed separately after this file (docs: complete plan).

## Final heading list of intellij/formatting.md

```
# Formatting and Denumber
## Reformat Code
## Reformat a selection
## Format on Save
## Denumber
## Formatter settings
## Messages
### Formatting messages
### Denumber messages
## Changes from the old formatter
```

## Decisions Made

- The Mixed line numbering row says why the message is rare from the action itself (enablement needs the first 20 non-blank lines numbered) and how it is still reached; the research records both facts, the wording linking them is mine.
- Added a one-line "Any other error shows its own message as the body" under the transport-failure table, because the research notes the body can also be the exception's own message.

## Deviations from Plan

### Auto-fixed Issues

**1. [Attribution] Commit trailer**
- The plan text asks for a `Co-Authored-By: Claude Opus 5.5` trailer; this executor ran as Claude Sonnet 5.5 and the session attribution instruction names that model, so commits carry `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

**2. [Rule 3 - Shell rule] One chained `cd` before a git/grep call**
- A status check used `cd <repo> && git ...`; it ran without a prompt and changed nothing. All later git calls use `git -C`.

---

**Total deviations:** 0 content deviations, 1 attribution note, 1 shell-rule slip.
**Impact on plan:** none; no scope change.

## Issues Encountered

- The plan-wide scans for planning ids (D-NN, MIG-NN, 130-NN, CR-, WR-) and for closing keywords before an issue number found nothing in the diff.
- Start time was not captured at launch, so the duration is approximate.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. The pages add no endpoints, paths or credentials; examples use the five-line numbered sample only.

## Next Phase Readiness

- 130-05 can run the phase-wide gate. MIG-01 is not ticked in REQUIREMENTS.md by this plan; 130-05 marks MIG-01..03.
- End-of-phase manual read of the IntelliJ page against the research sections A and B and the verdict is still open (human check D3).

## Self-Check: PASSED

- FOUND: documentation/docs/intellij/formatting.md
- FOUND commits: a1908fbd, 77518b71
- Docs build prints `Generated static files` with no `[WARNING]` or `[ERROR]` after both tasks; description-reuse script prints `15 descriptions; not reused: []`; exactly two admonitions on the page; banned-term grep over documentation/docs/intellij is empty.
