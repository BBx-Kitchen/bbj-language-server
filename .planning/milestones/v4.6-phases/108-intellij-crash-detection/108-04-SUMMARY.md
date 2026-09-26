---
phase: 108-intellij-crash-detection
plan: 04
subsystem: intellij
tags: [intellij, lsp4ij, crash-detection, uat, idea-log]

# Dependency graph
requires:
  - phase: 108-01
    provides: unexpected-stop hook, status feed, probe UAT with the D-01 crash-signal verdict
  - phase: 108-02
    provides: BbjServerService.reportUnexpectedExit/applyCrashPolicy crash and give-up policy, ExpectedStopGuard
  - phase: 108-03
    provides: BBj Crashed widget state, give-up-gated editor banner
provides:
  - Final build identity for both distributables (VSIX and IntelliJ zip) built from the phase's final commit
  - A seven-scenario hand-UAT script with every expected line derived from the final code
  - The maintainer's real idea.log excerpt for all seven run-order scenarios (with the maintainer's own extra third kill), pasted verbatim and redacted
  - Every S<N>.k row marked observed, derived or missing, with the criterion-3 from-state chain checked across the whole session
  - The phase's overall UAT verdict: pass, all seven scenarios run; S7.8 recorded missing as an over-specific expectation
affects: [108-intellij-crash-detection phase verification, LIFE-01, LIFE-02]

# Actuals (#2632)
actuals:
  tokens: 19128
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "UAT rows marked observed/derived/missing per D-15, never smoothed into a pass"

key-files:
  created: []
  modified:
    - .planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md

key-decisions:
  - "Scenario 7 was first left derived (both 500 ms restarts were Settings Apply), then run by the maintainer at 16:52:47 with a saved PREFIX change to config.bbx; its rows were re-marked observed. S7.8 (`stopping -> starting`) is missing — LSP4IJ went `stopping -> stopped -> starting` — and the maintainer ruled it an over-specific expectation, not a scenario failure."
  - "The maintainer's unscripted extra third kill (crash 3) is folded into Scenario 2's evidence rather than treated as a script deviation, since it exercises the same give-up-and-stay-Crashed behavior the scenario tests for."

patterns-established: []

requirements-completed: []  # LIFE-01/LIFE-02 checkboxes are NOT flipped here — phase verification owns that, per this plan's explicit instruction.

coverage:
  - id: D1
    description: "Seven-scenario hand UAT run on macOS against the final build; every expected line and UI signal marked observed, derived or missing from the maintainer's real idea.log excerpt and description"
    requirement: "LIFE-01"
    verification:
      - kind: manual_procedural
        ref: "108-UAT-ARTIFACTS.md ## Final UAT, Scenario 1-7 tables"
        status: pass
    human_judgment: true
    rationale: "This is itself the human-verification checkpoint (Task 2) plus its transcription; there is no automated test to substitute for the maintainer's real macOS session."
  - id: D2
    description: "Every status line's from-state equals the previous status line's to-state across the whole macOS session (criterion 3), including both crash windows and the LSP4IJ double-start race"
    requirement: "LIFE-02"
    verification:
      - kind: manual_procedural
        ref: "108-UAT-ARTIFACTS.md ### Criterion 3 check (from-state chain, whole session)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-25
status: complete
---

# Phase 108 Plan 04: Final IntelliJ UAT Verdict Summary

**Hand UAT on macOS against the final build passed all seven scenarios (crash detection, give-up-after-second-crash, deliberate stops, Settings Apply, manual restart, config reload); one over-specific expected line (S7.8) is recorded missing by the maintainer's decision, and the Refresh Java Classes fallback entry was not exercised.**

## Performance

- **Duration:** ~25 min (this continuation; Task 3 only)
- **Tasks:** 1 (Task 3 — Tasks 1 and 2 completed in a prior session, see below)
- **Files modified:** 1

## Accomplishments
- Pasted the maintainer's real, redacted `grep "BBj language server" idea.log` output for the full macOS session (16:25:44-16:28:12) into `### Scenario excerpts (observed)`, in run order, including an unscripted extra third kill the maintainer performed.
- Marked all 81 `S<N>.k` rows across the seven scenario tables as `observed` (quoting the timestamp or the maintainer's own words), `derived` (naming the code path), or absent-as-expected, per D-15 — never converting a missing/unexercised row into a pass.
- Ran the criterion-3 from-state chain check across the entire session, including inside both crash windows (16:27:33-16:27:34 and the 16:27:44 LSP4IJ double-start race) and the 16:28:12 manual restart, confirming no gap; documented the one expected non-violating boundary (the reopened project's fresh `BbjServerService` instance starting from its own initial `stopped`).
- Recorded the per-scenario, criteria-mapped, and overall verdict: **pass**. The orchestrator then added the maintainer's scenario 7 run (16:52:47 config reload), re-marked the S7 rows, and corrected the Scenario 2 verdict: the LSP4IJ-driven `started` at 16:27:44 cleared the Crashed display (maintainer saw `BBj: Ready`) but not the crash counter.

## Task Commits

This continuation resumed at Task 3; Tasks 1 and 2 were completed in a prior session:

1. **Task 1: Final tree to the maintainer — register check, both distributables, whole suite, seven-scenario script** - `d8e9b2c0` (docs) — prior session
2. **Task 2: Hand UAT on macOS (checkpoint:human-verify)** - no commit (checkpoint); maintainer's reply captured in this continuation's prompt and folded into Task 3's marks
3. **Task 3: Mark every expected line observed, derived or missing, and record the verdict** - `cf251d9d` (docs)

_No plan-metadata closing commit is issued separately here; `cf251d9d` is both the Task 3 commit and this plan's substantive closing commit. The `## State/roadmap updates` commit below records STATE.md/ROADMAP.md bookkeeping only._

## Files Created/Modified
- `.planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md` - Final UAT scenario excerpts pasted, all 81 `S<N>.k` rows marked, criterion-3 chain check written, overall verdict recorded

## Decisions Made
- Scenario 7 was not assumed to pass by analogy to scenarios 5/6; it was re-run for observed evidence. Its S7.8 row stays `missing` (never turned into a pass); the maintainer decided that row does not fail the scenario.
- The maintainer's extra, unscripted third kill (producing "crash 3") is used as corroborating evidence for Scenario 2's give-up-and-stay-Crashed behavior (S2.1, S2.2, S2.8) rather than being discarded as off-script, since it exercises exactly the row the scenario is testing.
- S2.6's tooltip substring was left partially derived: the maintainer confirmed the widget text (`BBj: Crashed`) and its persistence, but did not quote the exact tooltip wording, so the tooltip text itself remains sourced from `BbjStatusBarWidget.tooltipFor` rather than the transcript.

## Deviations from Plan

- After this continuation, the orchestrator amended Task 3's marks with the maintainer's scenario 7 run and the Scenario 2 verdict correction noted under Accomplishments.

Otherwise Task 3 executed exactly as specified in the resume instructions. No Rule 1-4 auto-fixes were needed; this task only edits `108-UAT-ARTIFACTS.md`.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The `## Final UAT` section of `108-UAT-ARTIFACTS.md` is complete with build identity, run order, seven scenario tables (all rows marked), the pasted excerpt, the criterion-3 chain check, and the overall verdict.
- Overall verdict is **pass** for all seven scenarios. Phase verification (which owns flipping LIFE-01/LIFE-02) should note S7.8 (missing, over-specific expectation, maintainer-accepted) and that the Refresh Java Classes fallback entry to scenario 7 was not exercised.
- No further build or hand-UAT work is required by this plan. If code-review fixes land later that touch the crash/restart/status-line code paths, both distributables must be rebuilt and the affected scenarios repeated per this plan's executor rules.

## Verify Output

Task 3's `<verify><automated>` command, run against the final file state:

```
$ F=/home/coder/repos/bbj-language-server/.planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md; \
  test "$(grep -cE '^\| S[1-7]\.[0-9]+ ' "$F")" -ge 35 && echo "COUNT_OK: $(grep -cE '^\| S[1-7]\.[0-9]+ ' "$F")" && \
  test "$(grep -E '^\| S[1-7]\.[0-9]+ ' "$F" | grep -vcE '\| *(observed|derived|missing)[^|]*\| *$')" = 0 && echo "ALL_MARKED_OK" && \
  test "$(grep -cE '/Users/[^<]' "$F")" = 0 && echo "REDACTION_OK" && \
  grep -c -E '^### Verdict' "$F"

COUNT_OK: 81
ALL_MARKED_OK
REDACTION_OK
1
```

All four checks pass: 81 scenario rows (≥35 required), every row carries an `observed`/`derived`/`missing` mark, no unredacted `/Users/<name>` path remains, and exactly one `### Verdict` heading is present.

---
*Phase: 108-intellij-crash-detection*
*Plan: 04*
*Completed: 2026-09-25*

## Self-Check: PASSED

- FOUND: .planning/phases/108-intellij-crash-detection/108-04-SUMMARY.md
- FOUND: d8e9b2c0 (Task 1 commit)
- FOUND: cf251d9d (Task 3 commit)
