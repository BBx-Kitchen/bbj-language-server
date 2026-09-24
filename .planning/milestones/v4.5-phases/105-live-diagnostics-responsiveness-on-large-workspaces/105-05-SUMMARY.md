---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
plan: 05
subsystem: testing
tags: [measurement, live-diagnostics, vsix, intellij-plugin, pull-request, release-gate]

# Dependency graph
requires:
  - phase: 105-01
    provides: event-armed live parse (bypasses Langium's WorkspaceLock)
  - phase: 105-02
    provides: snapshot-consistent verdict/Langium diagnostics composition
  - phase: 105-03
    provides: dedicated parser interop connection with silent fallback
  - phase: 105-04
    provides: latestLangiumBaseline seam unifying every document.diagnostics writer
provides:
  - Whole-suite gate confirmed clean on the final tree (every failing name also fails on the phase base — documented interop-backend drift)
  - Register check and commit-body closing-keyword scan clean across the phase diff
  - Both distributable pairs (VSIX + IntelliJ zip) built from the phase base and from the final tree, with recorded SHA-256 hashes
  - "105-MEASUREMENT.md" with method, environment, runbook, a filled twelve-sample results table with medians, hand-verification answers, and a drafted #692 closing comment
  - PR #691 retitled and extended to cover phase 105, quoting the measured medians
affects: [104-conformance-measurement-and-milestone-exit, v4.5-milestone-close]

# Actuals (#2632)
actuals:
  tokens: 3259
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Before/after responsiveness claims are measured against a real, large, private workspace and real BBjServices, never estimated or hand-derived — LSP trace timestamps only."
    - "A milestone PR grows across phases rather than opening one PR per phase; each phase adds a section and updates the title when it lands."

key-files:
  created: []
  modified:
    - .planning/phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-MEASUREMENT.md

key-decisions:
  - "Kept the flagged IntelliJ 'before' sample (61 s, started from a file whose line still carried a previous run's edit) in the recorded table rather than discarding it — excluding it would only worsen the before median, so keeping it is the conservative choice and it is footnoted as flagged."
  - "Added a 'Hand-verification results (Task 2)' section to 105-MEASUREMENT.md beyond what Task 3's action text required, to keep the four runbook questions' answers next to the numbers they qualify, since the plan's must-haves (RESP-03 concurrency edge, D-05, D-07) reference this evidence directly."
  - "Tester's BBjServices build (BBj 26.03 RC, nightly 2026-09-23) arrived via a coordinator update after the first commit was already pushed; corrected it in a new follow-up commit rather than amending, per the coordinator's explicit instruction not to rewrite history."

requirements-completed: [RESP-05, RESP-01]

coverage:
  - id: D1
    description: "105-MEASUREMENT.md records four cells (VS Code/IntelliJ x before/after) with three samples each, medians, timestamp resolution, and full environment notes"
    requirement: "RESP-05"
    verification:
      - kind: manual_procedural
        ref: "Tester ran the runbook in 105-MEASUREMENT.md against a real large private workspace and real BBjServices; numbers copied verbatim from IDE traces"
        status: pass
    human_judgment: true
    rationale: "The measurement itself is definitionally a human-run procedure against a private workspace this executor cannot access; the executor only records and computes from the tester's reported numbers."
  - id: D2
    description: "A BBj Parser diagnostic appears for a file opened and edited during the initial build, before that build finishes, in both VS Code and IntelliJ"
    requirement: "RESP-01"
    verification:
      - kind: manual_procedural
        ref: "Tester's answer to runbook question 1: yes in both IDEs, confirmed by every 'after' sample trace showing no build-finished marker"
        status: pass
    human_judgment: true
    rationale: "Requires observing a running IDE against real BBjServices; not automatable in this environment."
  - id: D3
    description: "Both distributable pairs (phase base 'before', final tree 'after') built and hashed; the 'after' IntelliJ zip proven to bundle the freshly built language server via a byte-for-byte main.cjs comparison"
    verification:
      - kind: other
        ref: "unzip -p <after zip> bbj-intellij/lib/language-server/main.cjs | cmp - bbj-vscode/out/language/main.cjs (exit 0, recorded in 105-04-SUMMARY.md's Task 1 and in 105-MEASUREMENT.md's Environment section)"
        status: pass
    human_judgment: false
  - id: D4
    description: "PR #691 retitled to cover phases 98-103 and 105, body extended with a Phase 105 section quoting the measured medians, no planning identifier or closing keyword, ends with the required attribution line"
    verification:
      - kind: other
        ref: "gh pr view 691 --json title,body,state,headRefName; grep scan of the body for planning identifiers and closing keywords (exit 1, clean)"
        status: pass
    human_judgment: false

# Metrics
duration: continuation (Task 1/2 completed in a prior session; this session covered Task 3 only, ~15min)
completed: 2026-09-23
status: complete
---

# Phase 105 Plan 05: Measure, Record, and Ship the Live-Diagnostics Fix Summary

**Measured VS Code's and IntelliJ's before/after wait for a live `BBj Parser` diagnostic on a real large workspace (58.9 s -> 5.3 s in VS Code, 66 s -> 6 s in IntelliJ), recorded it in `105-MEASUREMENT.md`, and carried the result into a retitled, extended PR #691.**

## Performance

- **Duration:** Task 1 (whole-suite gate, both distributable pairs, runbook staging) and Task 2 (the tester's checkpoint) were completed and committed in a prior session (commit `6ab39669`). This session executed Task 3 only: filling in Results, drafting the #692 comment, pushing, and updating the PR.
- **Started (this session):** 2026-09-23T15:xx (Task 3 continuation)
- **Completed:** 2026-09-23T15:23:07Z
- **Tasks:** 3 (1 auto, 1 checkpoint:human-verify, 1 auto) — all complete across the full plan
- **Files modified (this session):** 1 (`105-MEASUREMENT.md`, two follow-up edits)

## Accomplishments

- Whole-suite regression gate confirmed clean on the final tree: the 11 `test/linking.test.ts` interop failures also fail on the phase base (`9601e7122827888ad308611553f9ee145ce9b1fe`) — documented environment drift, not a regression (recorded in the prior session's Task 1, carried forward here).
- Both distributable pairs (VS Code `.vsix` and IntelliJ `.zip`, before and after) built and SHA-256 hashed; the "after" IntelliJ zip's bundled `main.cjs` verified byte-identical to the freshly built language server.
- `105-MEASUREMENT.md`'s Results table filled with all twelve samples and four medians: VS Code 58.895 s -> 5.260 s (~11x), IntelliJ 66 s -> 6 s (~11x); every "before" sample's verdict arrived only alongside the build-finished marker, every "after" sample's verdict arrived with no build-finished marker in the trace at all — direct confirmation the fix delivers diagnostics strictly during the build, not just faster.
- Hand-verification answers recorded: a `BBj Parser` diagnostic appears before the initial build finishes in both IDEs (yes); no overlapping/duplicate diagnostic observed (no, with one recorded caveat about an untested state); no flash/doubling on continued typing (no; verdict clears and reappears in ~0.6 s on edit/undo).
- The closing comment for issue #692 drafted verbatim in `105-MEASUREMENT.md`, ready to post when the milestone's PR merges — not posted, and #692 remains OPEN.
- PR #691 retitled to "v4.5 phases 98-103 and 105: parser conformance, live compiler diagnostics, one set of errors, and live diagnostics on large workspaces" and its body extended with a Phase 105 section quoting the measured medians; the branch was pushed to its own head and fast-forwarded onto PR #691's head branch, never forced.

## Task Commits

Task 1 and its whole-suite/build work were committed in the prior session:

1. **Task 1: Gate the final tree, build both distributable pairs, stage the runbook** - `6ab39669` (docs)

This session (Task 3 continuation):

2. **Task 3 (part 1): Fill Results and draft the #692 comment** - `c92527a8` (docs)
3. **Task 3 (part 2): Correct the tester's BBjServices build in the environment/comment** - `b3538670` (docs)

No plan-metadata commit is separate from the above — this plan has no source deliverable to gate (a measurement/ship plan), and `commit_docs` handling for STATE.md/ROADMAP.md/REQUIREMENTS.md is applied in the state-update step below per this plan's sequential-mode instructions.

_Note: this plan is entirely `type="auto"`/`checkpoint:human-verify` tasks with no TDD; no test -> feat -> refactor sequence applies._

## Files Created/Modified

- `.planning/phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-MEASUREMENT.md` - Method, environment (incl. corrected tester BBjServices build: BBj 26.03 RC nightly 2026-09-23), runbook, filled Results table with medians, hand-verification answers, residual server risk, and the drafted #692 closing comment.

## Decisions Made

- Kept the flagged IntelliJ "before" sample (61 s) in the recorded table instead of discarding it — excluding it would only push the before median higher, so keeping it as reported is the conservative choice; footnoted in the file.
- Added a "Hand-verification results (Task 2)" section beyond the plan's minimum text requirement, to keep the four runbook question answers next to the numbers they support (the plan's backstop truths for RESP-03's concurrency edge reference this evidence).
- Corrected the tester's BBjServices build via a new follow-up commit (not an amend) after the coordinator's mid-task update, per its explicit no-history-rewrite instruction, then re-pushed both refs by plain fast-forward.

## Deviations from Plan

None - plan executed exactly as written. The mid-task coordinator correction (BBjServices build string) was handled as directed by the coordinator's own message, not as an executor-initiated deviation rule.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `105-MEASUREMENT.md` is complete and holds the drafted #692 closing comment, ready to post by hand when the v4.5 milestone's PR (#691) actually merges — not done by this plan.
- PR #691 is OPEN, at local HEAD (`b3538670644cca5d3638790c3e7551e7a9da6337`), retitled and carrying the phase 105 section with the measured medians. It stays open until the whole v4.5 milestone (through Phase 104) is finished.
- Issue #692 remains OPEN as required.
- Requirements RESP-01..05 are intentionally NOT marked complete in `REQUIREMENTS.md` by this plan — that is left to phase verification, per this plan's own instructions.
- No `WINDOWS.md` entries were added by this plan.
- Phase 104 (Conformance Measurement & Milestone Exit) is the remaining phase before the v4.5 milestone can close.

---
*Phase: 105-live-diagnostics-responsiveness-on-large-workspaces*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `105-MEASUREMENT.md` found on disk with the filled Results table and the drafted #692 comment.
- Commits `c92527a8` and `b3538670` found in `git log --oneline --all`.
- `git ls-remote origin` confirms both `gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility` and `gsd/phase-103-one-set-of-errors-diagnostic-reconciliation` point at local HEAD `b3538670644cca5d3638790c3e7551e7a9da6337`.
- PR #691 confirmed OPEN, `headRefName` = `gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility`, title mentions 105, body clean of planning identifiers and closing keywords.
- Issue #692 confirmed OPEN.
