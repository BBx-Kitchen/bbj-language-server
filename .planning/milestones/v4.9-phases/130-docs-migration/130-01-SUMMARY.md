---
phase: 130-docs-migration
plan: 01
subsystem: docs
tags: [docusaurus, vscode, formatting, denumber, settings-reference]

requires:
  - phase: 125-ls-formatting
    provides: format outcomes and message texts shown by the language server
  - phase: 126-ls-denum
    provides: bbj/denum behaviour (buffer edit, left unsaved) and its messages
  - phase: 127-vs-code-cut-over
    provides: 15 bbj.formatter settings, removed Java path setting, Denumber prompt button
provides:
  - documentation/docs/vscode/formatting.md (new page, sidebar position 7)
  - 15-key Formatter Settings table with Description cells that 130-04 reuses word for word
  - VS Code guide pages free of the removed jar formatter, its Java path setting and bbjlst denumbering
affects: [130-04 IntelliJ guide, 130-02 release notes, 130-03 QA checklists, 130-05 phase gate]

actuals:
  tokens: 4700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Message tables quote server text verbatim inside backticks, with meaning and what to do"
    - "One admonition per formatting page (the :::info requirement box)"

key-files:
  created:
    - documentation/docs/vscode/formatting.md
  modified:
    - documentation/docs/vscode/index.md
    - documentation/docs/vscode/getting-started.md
    - documentation/docs/vscode/features.md
    - documentation/docs/vscode/commands.md
    - documentation/docs/vscode/configuration.md

key-decisions:
  - "Formatting messages table has ten rows and the Denumber table twenty-one rows, each quoted from the source texts the research recorded"
  - "Settings table descriptions avoid VS Code key names so the IntelliJ guide can reuse them unchanged"

patterns-established:
  - "Settings reference as one table with the deprecated alias as a final row instead of per-key blocks"

requirements-completed: [MIG-01]

duration: 4min
completed: 2026-10-04
status: complete

coverage:
  - id: D1
    description: "VS Code Formatting page exists, is in the sidebar and the Quick Links table, and covers Format Document, Format Selection, format on save, Denumber, the BBjServices requirement, message tables and the changes section"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "npm --prefix documentation run build; build/docs/vscode/formatting.html exists; vscode.html links the page"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every message cell quotes the server or client text verbatim"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "grep -F over 10 formatting strings and 26 denumber strings on formatting.md"
        status: pass
    human_judgment: true
    rationale: "A grep proves the quoted fragments are present, not that the meaning and what-to-do cells read correctly against the source; end-of-phase manual read per the plan"
  - id: D3
    description: "configuration.md lists all 15 formatter keys plus the deprecated alias, and the settings example matches package.json defaults"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "node check: 16 keys present, 15 example values equal package.json defaults, 16 table rows"
        status: pass
    human_judgment: false
  - id: D4
    description: "No guide page names the removed Java path setting, the old CLI or a formatter jar; bbjlst appears only under Decompile Commands; the old denumber-and-replace wording is gone"
    requirement: MIG-01
    verification:
      - kind: command
        ref: "grep -rn -i -E 'javaPath|BBjCFCli|BBjCodeFormatter|formatter jar' documentation/docs; awk bbjlst-outside-Decompile check"
        status: pass
    human_judgment: false
---

# Phase 130 Plan 01: VS Code Formatting Docs Summary

**New VS Code Formatting page (Format Document, Format Selection, format on save, Denumber as an unsaved buffer edit, verbatim message tables), a 15-key formatter settings table, and the rest of the guide cleared of the removed jar formatter and Java path setting.**

## Performance

- **Duration:** about 4 min by commit clock (17:07 to 17:11 UTC; start time was not recorded at launch)
- **Completed:** 2026-10-04T17:11:19Z
- **Tasks:** 3 (task 1 was the tracer)
- **Files modified:** 6 (1 created, 5 edited)

## Accomplishments

- `formatting.md` is linked from the sidebar (`sidebar_position: 7`) and the Quick Links table; it opens with the single `:::info` box (BBj 26.03 or later, running BBjServices, no offline formatting).
- Denumber is documented as what it now is: an edit of the open editor text through BBjServices, left unsaved, one Undo restores it, referenced line numbers become labels (`GOSUB L100` example), diagnostics in the Problems view. The open-file prompt names the buttons `Denumber` and `Open Read-only`.
- `configuration.md` Formatter Settings is one 16-row table (15 keys plus the deprecated alias with its once-per-scope migration), the settings example lists the 15 keys with package.json defaults, the Java path section and the machine-scope note are gone.
- `commands.md` Denumber entry, Requirements item 3 and a new troubleshooting entry follow the `bbj/denum` behaviour; the Decompile entries are unchanged.

## Task Commits

1. **Task 1: Formatting page wired into the VS Code guide (tracer)** - `e522dbc3` (docs)
2. **Task 2: Denumber documented as the buffer edit it now is** - `848680c5` (docs)
3. **Task 3: All 15 formatter settings in the settings reference** - `8ae25da4` (docs)

**Plan metadata:** committed separately after this file (docs: complete plan).

Tracer gate: auto mode is active, the docs build and all Task 1 checks were re-run end to end after the commit's content was final and passed (`Tracer verified end-to-end - expanding`).

## Final heading list of formatting.md (for 130-04)

```
# Formatting and Denumber
## Format Document
## Format Selection
## Format on Save
## Denumber
## Settings
## Messages
### Formatting messages
### Denumber messages
## Changes from the old formatter
```

## Description cells of the settings table (for 130-04, word for word)

| Setting | Description |
|---------|-------------|
| indentWidth | Number of indent characters per block level, from 0 to 16. |
| indentCharacter | Character used for indentation: spaces or tab characters. |
| indentLabelBlocks | Indent the statements between a subroutine label and its closing RETURN by one level. |
| keywordsToUppercase | Write BBj keywords in upper case. This wins over the IF keyword case setting. |
| ifClosingKeyword | Keyword that closes a block IF. `KEEP` leaves every existing FI or ENDIF as written, and a closer the formatter adds uses FI. `FI` closes every block IF with FI. `ENDIF` closes every block IF with ENDIF. |
| ifKeywordCase | Case of ELSE, FI and ENDIF. `KEEP` leaves existing keywords as written, and added ones copy the case of their IF. `MATCH_IF` copies the case of the opening IF. `LOWER_CASE` and `UPPER_CASE` force that case. Upper-casing all keywords always wins. |
| splitSingleLineIf | Split a single-line IF statement across several lines. |
| removeLineContinuation | Remove line-continuation characters. |
| splitInlineComments | Move in-line comments onto their own line. |
| splitInlineLabelComment | Move a label's in-line comment onto its own line. |
| collapseMultiLine | Collapse consecutive blank lines into one. |
| blankLineAfterReturn | Put exactly one blank line after a subroutine's closing RETURN. |
| parameterLayout | Spacing around the commas between method parameters. `KEEP_INITIAL_LAYOUT` keeps the spacing as written. `NO_BLANK` puts no blank around the commas. `BEFORE_COMMA` puts one blank before each comma, `AFTER_COMMA` one blank after each comma, and `BEFORE_AND_AFTER_COMMA` one blank before and after each comma. |
| operatorSpacing | Spacing around binary operators. `KEEP` keeps the spacing as written. `SPACED` puts exactly one blank on each side; unary signs, exponents, strings and comments stay as written. |
| eolCharacter | Line ending of the formatted file. `KEEP` uses the file's most frequent line ending. `LF` and `CRLF` force that line ending. |

IntelliJ note for 130-04: the `eolCharacter` Description says `LF` and `CRLF` force that line ending, which is true of the setting itself. The IntelliJ page must pair it with the CRLF warning (formatting stops with no message, lsp4ij #381) and the advice to leave it at `KEEP`.

## Decisions Made

- Quoted whole messages (not first sentences) wherever the text is a single short message, so a user can match it exactly.
- For the mixed-numbering row, the text says the message names the line without a number and `Go to Line` jumps to it; the research only records that the message carries a line number and the button.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded an over-specific claim about the Go to Line button**
- **Found during:** Task 2 (Denumber messages table)
- **Issue:** First draft said the button jumps to "the first line without a number"; the research only supports "the line the message names".
- **Fix:** Reworded before committing.
- **Files modified:** documentation/docs/vscode/formatting.md
- **Committed in:** 848680c5

**2. [Attribution] Commit trailer**
- The plan text asks for a `Co-Authored-By: Claude Opus 5.5` trailer; this executor ran as Claude Sonnet 5.5 and the session attribution instruction names that model, so commits carry `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

**Total deviations:** 1 auto-fixed (1 bug in draft prose), 1 attribution note.
**Impact on plan:** none; no scope change.

## Issues Encountered

- The plan-wide "no closing keyword" scan of my diff hit the word "closes" in the `ifClosingKeyword` description ("`FI` closes every block IF with FI"). It is ordinary prose, not a closing keyword before an issue number.
- `start time` was not captured at launch, so the duration is taken from the commit clock.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. The pages add no endpoints, paths or credentials; examples use the five-line numbered sample only.

## Next Phase Readiness

- 130-04 can reuse the Description cells above and the message wording on `vscode/formatting.md`.
- MIG-01 is not ticked in REQUIREMENTS.md; 130-05 marks MIG-01..03 after the phase gate.

## Self-Check: PASSED

- FOUND: documentation/docs/vscode/formatting.md
- FOUND commits: e522dbc3, 848680c5, 8ae25da4
- Docs build prints `Generated static files` with no `[WARNING]` or `[ERROR]`; the 16-key and 15-default node checks pass; the banned-term grep over documentation/docs is empty; bbjlst appears only under Decompile Commands.
