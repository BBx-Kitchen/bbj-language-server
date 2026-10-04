---
phase: 130-docs-migration
verified: 2026-10-04T17:40:00Z
status: human_needed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
gaps: []
deferred: []
human_verification:
  - test: "Confirm the IntelliJ editor context menu has no Reformat Code entry (code review WR-01)"
    expected: "documentation/docs/intellij/formatting.md line 16 says 'or use Reformat Code in the editor context menu'. plugin.xml registers no such entry, and the stock IntelliJ editor popup is believed not to carry it. If it is absent, delete that clause (the Code > Reformat Code path is correct and is the one the QA rows use)."
    why_human: "Whether the platform's own editor popup lists Reformat Code is IntelliJ behaviour that nothing in this repository defines, so it cannot be settled from source."
  - test: "Paste 130-RELEASE-NOTES.md into the GitHub release body at release time"
    expected: "The release page carries the large-first-diff warning, the output-difference table, the snippets and the settings/requirements changes. Both formatting guides send readers to GitHub Releases for the full list."
    why_human: "By decision D-01 the migration note is a paste-later draft; manual-release.yml still builds the body from --generate-notes plus the Installation block and was deliberately not changed. The note reaches users only when someone pastes it."
  - test: "Run the new QA rows in real IDEs at the release QA run (smoke rows 11-14, VS Code full rows 25 and 29-38, IntelliJ full rows 34-43)"
    expected: "Every row's Expected cell matches what the IDE does. Watch four spots: the VS Code line-numbered open prompt that also appears in rows 31, 33 and 36 and smoke row 12; row 31 step 3 and row 36 step 1 name no file (use a .bbj name); IntelliJ row 40 step 1 names no file; rows 34 (VS Code) and 39 (IntelliJ) leave examples/bbj-classes.bbj reformatted."
    why_human: "Executing QA rows needs live VS Code and IntelliJ with BBjServices 26.03. That is the release QA run, not this phase."
  - test: "Check the IntelliJ Actions on Save statements against a real IDE (code review IN-04)"
    expected: "Both the whole-file and the changed-lines choice format BBj files, and a save writes the typed text first and then the formatted text. If either is wrong, soften intellij/formatting.md lines 30 and 33 to what QA row 36 checks."
    why_human: "Platform behaviour that nothing in the repository exercises. The double save is the user's own observation in the verdict (C3a, C3b), but the changed-lines choice has no measured evidence."
---

# Phase 130: Docs & Migration Verification Report

**Phase Goal:** Users can learn from the published docs how formatting and DENUM work in both IDEs, including the IntelliJ verdict and what changes compared with the old formatter. Testers can check all of it from the QA checklists.
**Verified:** 2026-10-04
**Status:** human_needed
**Re-verification:** No, initial verification

All three roadmap success criteria hold in the codebase. No blockers and no gaps. The `human_needed` status comes from four items that cannot be settled from source (listed above), none of which is a missing implementation. I did not accept SUMMARY claims; each result below comes from reading the shipped files and the source they describe.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: both guides describe formatting, Format Selection, DENUM, the 15 settings, the BBj 26.03 requirement and the IntelliJ verdict; no guide still describes the formatter jar, `bbj.formatter.javaPath` or bbjlst denumbering | VERIFIED | `vscode/formatting.md` and `intellij/formatting.md` exist (`sidebar_position: 7`). Each has a top `:::info` box (26.03 plus running BBjServices), Format Document / Reformat Code, selection, format on save, a Denumber section with the label example, a Formatting and a Denumber message table, and a "Changes from the old formatter" section. IntelliJ page opens with "Formatting BBj files is supported in IntelliJ: for the whole file, for a selection, and on save", matching verdict `supported`. Grep of all of `documentation/docs`, `concepts`, `src` and the README for `javaPath`, `BBjCFCli`, `BBjCodeFormatter`, formatter jar, `tools/formatter`, `Shift+Alt+F`, "Denumber & Replace": no hits. `bbjlst` appears only at `vscode/commands.md` lines 106, 112, 118 (the Decompile section). The 26.03 requirement is in `index.md` and `getting-started.md` of both guides ("formatting and Denumber"). One doubtful menu clause (WR-01) is routed to human verification. |
| 2 | SC2: a migration note lists the output differences from the old formatter (labels, blank lines, IF closers, line endings, the fixed `--single-line-if` crash #507) and warns about the large diff on the first format | VERIFIED | `130-RELEASE-NOTES.md` opens (first `##`, lines 1-6) with the large-first-diff warning and commit-first advice. The visibility-ordered table covers labels (High), blank lines (High), IF closers (High, with `ifClosingKeyword`/`ifKeywordCase`), line endings (Medium, `eolCharacter`), and the crash ("tracked under #507", line 31). A node script confirmed all 7 `bbj` fences in the notes are verbatim substrings of `130-FORMAT-EVIDENCE.md` (0 not verbatim). The evidence file holds six real old-jar vs `formatProgram` runs with commands and raw outputs. It also corrects the research framing: the old jar kept existing `endif`/`ENDIF`/`fi` (E6), so the notes do not claim otherwise (D-18). Denumber, requirements, settings and IntelliJ known-issue sections are present. No closing keyword precedes any issue number in the notes or in any commit body since the phase base. Guides link to GitHub Releases from the "Changes from the old formatter" section. Publication is a release-time step (human item 2). |
| 3 | SC3: the QA smoke and full checklists cover format, Format Selection, format-on-save, DENUM and the error messages in both IDEs, with IntelliJ rows matching the verdict | VERIFIED | Smoke rows 1-14 (11-14 new: Format Document and Denumber for each IDE). Full checklist: VS Code row 25 replaced (no `javaPath` left anywhere in the file), new VS Code rows 29-38 and IntelliJ rows 34-43, mirrored: format, selection, format on save (`editor.formatOnSave` / Actions on Save), Denumber and labels, open-file prompt / banner, BBjServices stopped, line-numbered file, mixed file, unnumbered file; VS Code adds the invalid-setting row. IntelliJ adds the CRLF known-issue row 43 (nothing changes, no message, lsp4ij #381; KEEP formats and keeps CRLF) and expects the Denumber action greyed out on unnumbered and early-mixed files, as the verdict and plugin behaviour require. Script check: every row has exactly 6 unescaped pipes, ends in `[ ] |`, numbering is contiguous. Message strings in Expected cells match the `FORMAT_*` and `DENUM_*` constants in `bbj-format-service.ts` / `bbj-denum-service.ts` verbatim. |
| 4 | D-06: all 15 `bbj.formatter.*` settings are documented in both guides, plus the deprecated `splitSingleLineIF` alias in VS Code | VERIFIED | `package.json` defines 15 current keys plus the deprecated alias. Script: `missing in vscode/configuration.md: []`; every default and enum value in the table and in the Complete Settings Example matches `package.json`. The IntelliJ table lists 15 controls; labels match `BbjSettingsComponent` (Indent width, Indent character, Indent label blocks, Keywords in upper case, IF closing keyword, IF keyword case, Split single-line IF, Remove line continuation, the two comment controls, Collapse blank lines, Blank line after RETURN, Parameter layout, Operator spacing, Line ending), with the restart note. |
| 5 | D-11: the IntelliJ CRLF limitation is a `:::warning` after the Line ending row, using the verdict's `eol_note` and linking lsp4ij #381 | VERIFIED | `intellij/formatting.md` lines 89-91. The wording equals `eol_note` in `129-VERDICT.md` plus the link. The page has exactly two admonitions (info + warning); the VS Code page has exactly one (info), as planned. |
| 6 | D-09/D-10: VS Code stale text rewritten in place; Decompile kept; IntelliJ format-on-save documented step by step with the Denumber action, banner and console | VERIFIED | `vscode/commands.md` Denumber entry now describes the unsaved buffer edit through BBjServices, buttons `Denumber` / `Open Read-only`; the Requirements item and a "Formatting or Denumber Does Nothing" troubleshooting entry replaced the `javaPath` mentions. `intellij/formatting.md` has the 4-step Actions on Save path with the "no BBj-specific switch" sentence. `intellij/commands.md` gains `Denumber BBj Program` (`bbj.denumber`, no shortcut), matching `plugin.xml` (Tools menu + editor popup after `bbj.compile`, no `keyboard-shortcut`). |
| 7 | D-12/D-20/D-21: requirement bullets, Quick Links rows, IntelliJ `## Formatter` pointer, README | VERIFIED | Both `index.md` Quick Links tables have a Formatting row. `intellij/configuration.md` has `## Formatter` between `## BBj Compiler` and `## Node.js Runtime`. README line 91 is now "Formatting and Denumber in both IDEs" linking both guides; decompile stays a VS Code item. `description.html` unchanged. |
| 8 | D-02: IntelliJ `changeNotes` replaced with a short current-release entry | VERIFIED | `build.gradle.kts` diff: the "0.1.0 - Initial Release" block is gone; the new h3 and 5 list items (Reformat Code and Actions on Save, Formatter section, Denumber action and banner, 26.03 + BBjServices, CRLF known issue with lsp4ij #381); no table; well-formed HTML. |
| 9 | The docs site builds clean and guard tests pass | VERIFIED | I re-ran `npm run build` in `documentation/`: `[SUCCESS] Generated static files`, no warning or error (`onBrokenLinks: throw` is active). `formatter-removal.test.ts`: 13/13 passed. Orchestrator evidence: bbj-intellij 1306 tests, 0 failures; vscode 4464 tests, `numFailedTests` 0. |
| 10 | Scope and hygiene: only the 16 expected non-planning files changed; `manual-release.yml` untouched; no planning IDs, debt markers or closing keywords in shipped text | VERIFIED | `git diff --name-only a4439b4c^..HEAD` outside `.planning` lists exactly 16 files (6 VS Code pages, 6 IntelliJ pages, 2 QA files, README, `build.gradle.kts`). `.github` and `description.html` show no diff. Planning-ID grep over the 16 files hits only pre-existing comments in `build.gradle.kts` lines 112-165 (not in this phase's diff). No TBD/FIXME/XXX/TODO/HACK markers. All commit hashes cited in the SUMMARYs exist. |

**Score:** 10/10 truths verified (0 behavior-unverified; the truths are documentation claims, not runtime state transitions)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `documentation/docs/vscode/formatting.md` | VS Code formatting page | VERIFIED | 119 lines, `sidebar_position: 7`, wired via Quick Links, features, commands and configuration links |
| `documentation/docs/intellij/formatting.md` | IntelliJ formatting page | VERIFIED | 151 lines, 15-control table, CRLF warning, both message tables plus `Denumber failed` bodies |
| `documentation/docs/vscode/configuration.md` | 15-key table, alias row, no `javaPath` | VERIFIED | Table at lines 275-292, example JSON lines 317-331 |
| `documentation/docs/vscode/commands.md`, `intellij/commands.md` | Denumber entries | VERIFIED | Both rewritten or added; Decompile section intact |
| `documentation/docs/intellij/configuration.md` | `## Formatter` pointer | VERIFIED | Lines 70-76 |
| `130-FORMAT-EVIDENCE.md` | Six real old/new runs | VERIFIED | E1-E6 with commands and raw output, including the `od -c` line-ending dump and the old jar's stack trace |
| `130-RELEASE-NOTES.md` | Release-body draft | VERIFIED | Present and complete; paste-later by design (D-01) |
| `QA/SMOKE-TEST-CHECKLIST.md`, `QA/FULL-TEST-CHECKLIST.md` | New rows | VERIFIED | 14 smoke rows; full rows 25, 29-38, 34-43 as planned |
| `bbj-intellij/build.gradle.kts`, `README.md` | changeNotes, README bullet | VERIFIED | See truths 7 and 8 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vscode/index.md`, `intellij/index.md` | the two formatting pages | Quick Links row | WIRED | Rows present; docs build resolves them |
| `vscode/formatting.md` | `configuration.md#formatter-settings` | Settings section | WIRED | Anchor exists (`### Formatter Settings`) |
| `vscode/commands.md` | `formatting.md#denumber` | Denumber entry | WIRED | Build passes with `onBrokenLinks: throw` |
| `intellij/configuration.md` | `formatting.md#formatter-settings` | Formatter section | WIRED | Same |
| `README.md` | both published formatting guides | absolute URLs | WIRED | Lines 94-95 |
| QA expected cells | `bbj-denum-service.ts` / `bbj-format-service.ts` | verbatim message text | WIRED | Spot-checked against the constants |

### Data-Flow Trace (Level 4)

Not applicable: documentation-only phase. The one rendered value, the `changeNotes` string, is a static literal by design.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Docs site builds with no broken links or MDX errors | `npm run build` in `documentation/` | `[SUCCESS] Generated static files` | PASS |
| Formatter-removal guard | `npx vitest run test/formatter-removal.test.ts` | 13 passed | PASS |
| All 15 settings documented with correct defaults | node script over `package.json` and `configuration.md` | `missing: []` | PASS |
| Release-note snippets are unedited evidence | node script, `bbj` fences vs evidence file | 7 blocks, 0 not verbatim | PASS |
| QA table shape | node script over both checklists | 0 bad column counts, 0 rows without `[ ]` | PASS |

### Probe Execution

SKIPPED: the phase declares no probes.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MIG-01 | 130-01, 130-04, 130-05 | Both guides describe formatting, Format Selection, DENUM, the 15 settings, the 26.03 requirement and the IntelliJ verdict | SATISFIED | Truths 1, 4, 5, 6, 7 |
| MIG-02 | 130-02, 130-05 | Migration note lists output differences and warns about the large first diff | SATISFIED (publication pending, human item 2) | Truth 2 |
| MIG-03 | 130-03, 130-05 | QA smoke and full checklists cover format, selection, on-save, DENUM and errors in both IDEs | SATISFIED | Truth 3 |

All three IDs appear in plan frontmatter and in REQUIREMENTS.md (ticked, "Phase 130, Complete"). No orphaned requirements: REQUIREMENTS.md maps only MIG-01..03 to Phase 130.

### Anti-Patterns Found

None blocking. No debt markers, placeholders or stub patterns in the 16 shipped files.

### Code Review Findings Considered (130-REVIEW.md: 0 critical, 3 warnings, 4 info)

None is a must-have gap. I confirmed WR-02 against source and could not settle WR-01 from source.

| Finding | Assessment |
|---------|------------|
| WR-01: IntelliJ guide cites a Reformat Code editor context-menu entry | Confirmed that the plugin registers none (`plugin.xml` adds only the composers, run/compile and `bbj.denumber` to `EditorPopupMenu`). The platform's own popup is unverifiable here, so it is human item 1. The primary path (Code > Reformat Code) is correct, so success criterion 1 still holds. |
| WR-02: message tables say "Try again" but not that repeats are silent | Confirmed in `bbj-format-service.ts` (`environmentNotice`, `contentNotice`, `shownNotices`: timeout, engine-failed and service-unavailable are shown once per connection; too-large and protected once per file version). Tables still give meaning and action per D-07; the QA rows do not test these cases. Doc-completeness warning only. |
| WR-03: some QA rows name no file; an undocumented open prompt appears | Real executability gaps in four rows, listed in human item 3 for the QA run. The rows exist and cover the scope. |
| IN-01..IN-04 | Minor. IN-04 is human item 4. |

### Human Verification Required

See the frontmatter `human_verification` list (4 items):

1. **WR-01 menu clause.** Confirm IntelliJ's editor context menu has no Reformat Code entry; if so remove the clause in `documentation/docs/intellij/formatting.md` line 16.
2. **Publish the release notes.** Paste `130-RELEASE-NOTES.md` into the GitHub release body at release time; until then the guides' Releases link has nothing to show.
3. **Execute the new QA rows in real IDEs** at the release QA run, tidying the four row gaps from WR-03 first if wanted.
4. **IN-04.** Check the Actions on Save claims (changed-lines choice, double save) in a real IDE.

### Gaps Summary

No gaps. Everything the roadmap contract and the plan must-haves require exists in the shipped files and is consistent with the code it describes: 15 settings match `package.json` and `BbjSettingsComponent`, message texts match the server constants, the CRLF warning matches the Phase 129 verdict, release-note snippets are unedited evidence, the stale formatter jar / `javaPath` / bbjlst-denumber text is gone, and the docs build is clean. The optional follow-ups worth a quick edit before release are WR-01 (delete one clause), WR-02 (add a "messages are shown once" note) and WR-03 (name the files in four QA rows). None blocks the next phase.

---

_Verified: 2026-10-04T17:40:00Z_
_Verifier: Claude (gsd-verifier)_
