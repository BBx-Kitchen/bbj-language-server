---
phase: 85-config-hot-reload-with-restart-coalescing
plan: 05
subsystem: testing
tags: [qa-checklist, coverage-declaration, manual-verification, documentation]

requires:
  - phase: 85-config-hot-reload-with-restart-coalescing
    provides: "the five hot-reload behaviors named in 85-CONTEXT's Integration Points (external PREFIX change, atomic save, out-of-workspace config, SETOPTS no-restart, save burst) that this plan writes down as hand-executable checks"
provides:
  - "QA/FULL-TEST-CHECKLIST.md rows for the phase's headline reload behavior (both IDEs) and the four remaining hand-only behaviors (atomic save, out-of-workspace config, SETOPTS no-restart, save burst)"
  - "COVERAGE.md — the reasoned no-external-API declaration the seal-time api-coverage gate reads"
affects: [phase-85-seal, phase-85-uat]

actuals:
  tokens: 1000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One-line reasoned COVERAGE.md declaration (Phase 84 precedent) in place of a capability matrix when a phase integrates no external API"

key-files:
  created:
    - .planning/phases/85-config-hot-reload-with-restart-coalescing/COVERAGE.md
  modified:
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "Placed the four remaining hand-only rows two-per-IDE-section rather than duplicating each across both tables: atomic-save and SETOPTS-no-restart under VS Code (SETOPTS composer exists only on the VS Code side today — IntelliJ's SETOPTS composer is Phase 87), out-of-workspace-config and the save-burst under IntelliJ, since none of the four were flagged '(both IDEs)' in 85-CONTEXT's Integration Points list (unlike the headline PREFIX-reload behavior, which explicitly needed a row per IDE)."
  - "Mirrored Phase 84's COVERAGE.md shape exactly (single line, no heading, no table) but reworded the reason to name this phase's actual surface (internal LSP notification, Node fs watching, each IDE's own restart machinery) rather than reusing Phase 84's wording verbatim."

requirements-completed: [CFG-03]

coverage:
  - id: D1
    description: "The seal-time API-coverage gate has a reasoned declaration to read instead of blocking on a missing or fabricated capability matrix"
    requirement: CFG-03
    verification:
      - kind: other
        ref: "awk one-line-under-200-chars-starting-with-declaration-prefix check against COVERAGE.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both IDEs have a checklist row for the headline external-editor PREFIX change reloading the server automatically, naming the status-bar signal and explicitly ruling out a prompt/modal/toast (VS Code) or balloon (IntelliJ)"
    requirement: CFG-03
    verification:
      - kind: other
        ref: "grep -E '^\\| 1[23] \\|' QA/FULL-TEST-CHECKLIST.md | grep -ic reload -> 2"
        status: pass
    human_judgment: true
    rationale: "The row content itself is a hand-executable QA instruction, not something a hermetic test can execute — a human tester must actually perform the steps in a live IDE to close CFG-03's UAT obligation. This plan's job is only to prove the row exists and is worded correctly, which the automated checks above do."
  - id: D3
    description: "The four remaining hand-only behaviors (atomic-save single reload, out-of-workspace config file, SETOPTS composer apply+save producing no restart, .bbj+config save burst yielding one clean restart) each have a checklist row with an unambiguous expected result, and no existing row was renumbered, reworded or removed"
    requirement: CFG-03
    verification:
      - kind: other
        ref: "for k in atomic outside SETOPTS burst; do grep -qi -- \"$k\" QA/FULL-TEST-CHECKLIST.md; done -> OK"
        status: pass
      - kind: other
        ref: "git diff --numstat -- QA/FULL-TEST-CHECKLIST.md across both task commits -> 0 deletions, 6 insertions total"
        status: pass
    human_judgment: true
    rationale: "As with D2, the rows are instructions for a human tester to execute by hand in a live IDE (SETOPTS composer, atomic-save editor, content-root placement, timed save burst) — no hermetic test in this repo can perform those steps. This plan proves the rows exist, are non-destructive to prior content, and name the correct negative-check regression; the UAT run itself closes the behavior."

duration: 5min
completed: 2026-09-06
status: complete
---

# Phase 85 Plan 05: Hot-Reload QA Checklist and Coverage Declaration Summary

**Wrote the five hand-executable QA rows for hot-reload's human-only surface (headline PREFIX reload in both IDEs, atomic save, out-of-workspace config, SETOPTS no-restart, save burst) and the one-line COVERAGE.md the seal-time API-coverage gate reads.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-06T23:45:00Z (approx.)
- **Completed:** 2026-09-06T23:49:19Z
- **Tasks:** 2 completed (Task 1 tracer, Task 2 auto)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `.planning/phases/85-config-hot-reload-with-restart-coalescing/COVERAGE.md` created — a single line under 200 characters, mirroring Phase 84's declaration shape, so the seal-time API-coverage gate accepts a reasoned "no external API" statement instead of blocking on a missing or fabricated capability matrix.
- `QA/FULL-TEST-CHECKLIST.md` grew from 11/12 rows (VS Code/IntelliJ LSP Features) to 14/15: the headline "Config PREFIX change reloads the server automatically" row for both IDEs (VS Code row 12, IntelliJ row 13), plus the four remaining hand-only behaviors — atomic-save single reload and SETOPTS composer apply+save producing no restart under VS Code (rows 13-14), out-of-workspace config file and the `.bbj`+config save burst under IntelliJ (rows 14-15).
- Every existing checklist row's number, wording and Pass state is unchanged across both commits — confirmed via `git diff --numstat` showing zero deletions and six total additions.

## Task Commits

Each task was committed atomically:

1. **Task 1: The thinnest end-to-end documentation slice — the user-visible reload path, written down** - `9b6ba199` (docs, type="tracer")
2. **Task 2: The four remaining hand-only behaviors** - `256ca65e` (docs)

_Both tasks are documentation-only edits with no test framework involved; each task's own `<verify>` (`awk`/`grep` assertions) served as its acceptance gate._

## Files Created/Modified
- `.planning/phases/85-config-hot-reload-with-restart-coalescing/COVERAGE.md` — one-line reasoned "no external API integration" declaration for the seal-time coverage gate
- `QA/FULL-TEST-CHECKLIST.md` — six new rows total: VS Code rows 12-14, IntelliJ rows 13-15, covering all five hot-reload behaviors named in 85-CONTEXT's Integration Points

## Decisions Made
- Placed the four Task 2 rows two-per-IDE-section (VS Code: atomic-save, SETOPTS-no-restart; IntelliJ: out-of-workspace config, save burst) rather than duplicating each across both tables. Rationale: 85-CONTEXT's Integration Points list flagged only the headline PREFIX-reload behavior as needing a row per IDE ("(both IDEs)"); the four remaining behaviors carried no such annotation. The SETOPTS composer specifically exists only on the VS Code side as of this phase (IntelliJ's SETOPTS composer is Phase 87's deliverable), which fixed that row's placement unambiguously.
- Reworded Phase 84's COVERAGE.md reason rather than copying it verbatim — Phase 84's declaration named its own surface (internal LSP request/notification plus IntelliJ file-type APIs); this phase's declaration names its surface instead (internal LSP notification, Node fs watching, each IDE's restart machinery), per the plan's explicit instruction to mirror the *shape*, not the wording.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. This plan adds no package-manager dependency and touches no runtime code; it is documentation only (a coverage declaration and QA checklist rows).

## Next Phase Readiness

This is the last plan (05 of 5) in Phase 85. All five hot-reload behaviors named in the phase's Integration Points now have either automated test coverage (85-01 through 85-04, delivered in earlier plans of this phase) or a hand-executable checklist row (this plan) — nothing in CFG-03's scope is undocumented. The seal-time API-coverage gate has a reasoned declaration to read. Ready for phase-level verification and the phase 85 UAT run that exercises these new checklist rows against a live build.

No blockers or concerns.

## Self-Check: PASSED

- `.planning/phases/85-config-hot-reload-with-restart-coalescing/COVERAGE.md` verified present on disk, one line, 143 bytes, begins `No external API integration: `.
- `QA/FULL-TEST-CHECKLIST.md` verified present on disk with rows 12-14 (VS Code) and 13-15 (IntelliJ) covering all five named behaviors.
- Both task commit hashes (`9b6ba199`, `256ca65e`) confirmed present via `git log --oneline --all`.
- Full plan `<verification>` re-run: COVERAGE.md single-line/length/prefix check passed; `git diff --numstat -- QA/FULL-TEST-CHECKLIST.md` across both commits reports 0 deletions, 6 insertions; all four keyword checks (atomic, outside, SETOPTS, burst) present; register-check grep for plan/decision-id tokens (`85-0N`, `D-NN`, `C-NN`, `COMP-N`, `CR-N`) in the diff returned clean.

---
*Phase: 85-config-hot-reload-with-restart-coalescing*
*Completed: 2026-09-06*
