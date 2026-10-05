---
phase: 130-docs-migration
plan: 02
subsystem: docs
tags: [release-notes, formatter, migration, evidence]

requires:
  - phase: 127-vs-code-cut-over
    provides: settings migration, removed Java path setting, Denumber prompt button
  - phase: 129-intellij-verdict
    provides: IntelliJ verdict, CRLF known issue, Actions on Save behaviour
provides:
  - 130-FORMAT-EVIDENCE.md with real old-jar and bbj-ls formatProgram runs for six cases
  - 130-RELEASE-NOTES.md, a paste-ready GitHub release body with the formatter migration note
affects: [130-05 phase gate, release]

actuals:
  tokens: 4950
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Release-note snippets are injected from captured output files by script and proven to be verbatim substrings of the evidence file"

key-files:
  created:
    - .planning/phases/130-docs-migration/130-FORMAT-EVIDENCE.md
    - .planning/phases/130-docs-migration/130-RELEASE-NOTES.md

key-decisions:
  - "The notes name no exact positions for the old blank lines, because the live run differs from the research capture in where they land"
  - "The IF-closer row claims only the verified differences (added closer FI instead of ENDIF, closer followed by ; rem recognised, two new settings) and says closers already in a file were kept before as well"

requirements-completed: [MIG-02]

duration: 3min
completed: 2026-10-04
status: complete

coverage:
  - id: D1
    description: "Evidence file records six cases with input, commands and raw output of the old jar (06c81df9^, Java 25) and of formatProgram on 127.0.0.1:5008"
    requirement: MIG-02
    verification:
      - kind: command
        ref: "Task 1 node check prints 'evidence ok' (13 outputs verbatim in the file, each documented difference visible in the real output)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Release-notes draft opens with the large first-format diff warning and commit-first advice, then the difference table, before/after snippets, Denumber, requirements, settings and IntelliJ known issues"
    requirement: MIG-02
    verification:
      - kind: command
        ref: "Task 2 string checks, first-heading position check, planning-id and closing-keyword scans"
        status: pass
      - kind: command
        ref: "snippet check: 7 bbj blocks, 0 not in evidence"
        status: pass
    human_judgment: true
    rationale: "Tone and accuracy of the prose against the evidence is read by a person at end of phase, as the plan states"
---

# Phase 130 Plan 02: Formatter Migration Note Summary

**Release-body draft that warns about the large first-format diff, lists the verified old-versus-new output differences with the setting that restores each old style, and shows seven before/after snippets taken unedited from real runs of the old jar and the live bbj-ls formatter.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-04T17:12:48Z
- **Completed:** 2026-10-04T17:15:18Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- `130-FORMAT-EVIDENCE.md`: six cases (E1 labels and a `; rem` closer, E2 blank lines, E3 closer added on split, E4 line endings, E5 the crash, E6 closers already present). Old engine is `BBjCFCli.jar` from `06c81df9^` on Temurin Java 25 with `-p -i FILE -w 2`; new engine is `formatProgram` on `127.0.0.1:5008` through the language server's own client with the extension defaults. All blocks were written by script from the captured files.
- `130-RELEASE-NOTES.md`: sections in the order warning, output differences table, before/after, Denumber, requirements, settings, IntelliJ known issues, guide links. The `--single-line-if` crash is cited as "tracked under #507"; no closing keyword anywhere.
- E6 shows the old jar kept `endif`, `ENDIF` and `fi` as written, so the note does not claim the old formatter changed existing closers.

## Task Commits

1. **Task 1: Old and new formatter output captured from real runs** - `2393a74c` (docs)
2. **Task 2: Release-notes draft with the migration note** - `4a99e2e8` (docs)

**Plan metadata:** committed separately after this file (docs: complete plan).

## Differences between the live output and the RESEARCH E4 capture

- **E1 (labels):** old and new outputs are identical to the capture, except one position: the capture says the old blank line "precedes `methodend`"; in the live run it sits before `classend` (after `methodend`). The old output has seven inserted blank lines (after the class header, before each label, before both IFs, before `classend`); the new has none.
- **E2 (blank lines):** my ten-line input is smaller than the capture's `demo.bbj`. The old jar kept the one blank line written before `first:` and inserted two (after `declare`, between `fi` and `return`); no blank around the IF. The capture lists blanks "around the block IF" and "after release". The new output keeps only the written blank line. The notes therefore say "inserted blank lines around labels, block IFs and class headers" without per-position claims beyond the E1 and E2 blocks.
- **E3, E4, E5, E6:** match the capture and the plan (E5 crash `StringIndexOutOfBoundsException: Index 18 out of bounds for length 18` in `BBjCodeSplitter.isSplitablePosition`; E6 all three closers kept by the old jar).

## Decisions Made

- Used whole outputs (not excerpts) for the seven `bbj` blocks, injected by script, so "copied unedited" is literally true.
- Table rows without an evidence case (final newline, whitespace-only lines, `::path::Reference`, `FNEND`, `ERR=*NEXT` chain, upper-casing, other crash fixes) describe the new behaviour only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Attribution] Commit trailer**
- The plan text asks for `Co-Authored-By: Claude Opus 5.5`; this executor runs as Claude Sonnet 5.5 and the session attribution instruction names that model, so both commits carry `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (same as 130-01).

---

**Total deviations:** 0 behavioural, 1 attribution note.
**Impact on plan:** none.

## Issues Encountered

None. Preconditions were met (`:5008` listening, Java 25.0.4.1, `06c81df9^` jar present). The scratch directory was deleted at the end of Task 2 and never staged.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. The draft and the evidence contain only the six self-written samples, `$W` for the scratch directory and the loopback endpoint; no secrets or session scratch paths (checked).

## Next Phase Readiness

- The user pastes `130-RELEASE-NOTES.md` into the GitHub release body at release time; `.github/workflows/manual-release.yml` is unchanged.
- MIG-02 is not ticked in REQUIREMENTS.md; 130-05 marks it after the phase gate.
- End-of-phase manual check: read the draft once for tone and accuracy against `130-FORMAT-EVIDENCE.md`.

## Self-Check: PASSED

- FOUND: 130-FORMAT-EVIDENCE.md, 130-RELEASE-NOTES.md
- FOUND commits: 2393a74c, 4a99e2e8
- Evidence check prints `evidence ok`; snippet check reports 7 blocks, 0 not in evidence; evidence-work directory is gone; no closing keyword in either commit message.
