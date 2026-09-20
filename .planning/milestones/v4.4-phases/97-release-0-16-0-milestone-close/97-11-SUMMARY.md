---
phase: 97-release-0-16-0-milestone-close
plan: 11
subsystem: release-ops
tags: [github-cli, milestone-close, issue-triage, todo-bookkeeping]

# Dependency graph
requires:
  - phase: 97-10
    provides: v0.16.0 smoke verdict PASS, authorizing this closure pass (D-18)
provides:
  - All 21 issues on GitHub milestone #7 ("v4.4 IntelliJ Focus") closed with a maintainer-approved comment naming v0.16.0
  - Milestone #7 closed (0 open, 21 closed, state closed) — REL-02 proof
  - Four shipped folded todos moved from pending to completed; three D-22 residuals confirmed left pending
affects: [milestone-close, release-process]

actuals:
  tokens: 9000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: [one-issue-at-a-time closure with re-read-before/re-read-after verification, comment-only handling for pre-closed issues (D-23)]

key-files:
  created:
    - .planning/phases/97-release-0-16-0-milestone-close/97-11-SUMMARY.md
  modified:
    - .planning/phases/97-release-0-16-0-milestone-close/97-CLOSING-COMMENTS.md
    - .planning/todos/pending/ (four files removed)
    - .planning/todos/completed/ (four files added)

key-decisions:
  - "Posted the maintainer-approved text byte-for-byte from 97-CLOSING-COMMENTS.md at commit b2b8c4d6 — no rewording, shortening, merging or improvement of any comment."
  - "#594 and #621 (already CLOSED per D-23, auto-closed by the PR #679 squash merge) received their approved comment via plain `gh issue comment`, never reopened or re-closed."
  - "Recorded the maintainer's verbatim go (\"go\", 2026-09-20) in the review file along with what was shown before the go: file path, file checks, the two orchestrator-corrected comments (#616, #618) in full, the gist of every other special case, and the posting procedure."

patterns-established:
  - "Milestone closure runs one issue at a time in ascending number order, re-reading state/comments before and after each action, with the milestone-level close gated on a confirmed 0-open/21-closed read-back — reusable for any future milestone close."

requirements-completed: [REL-02]

coverage:
  - id: D1
    description: "All 21 milestone #7 issues carry exactly one closing comment naming v0.16.0, the release link and the squash commit, and are all CLOSED"
    requirement: "REL-02"
    verification:
      - kind: other
        ref: "gh issue view <n> --json number,state,comments (run individually for all 21 issues; each confirmed CLOSED with the approved comment present and URL recorded in the posting log)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Milestone #7 reports 0 open, 21 closed, state closed"
    requirement: "REL-02"
    verification:
      - kind: other
        ref: "gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '{open_issues,closed_issues,state}' -> {\"closed_issues\":21,\"open_issues\":0,\"state\":\"closed\"}"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exactly four shipped folded todos moved from pending to completed; the three D-22 residuals stay pending"
    verification:
      - kind: other
        ref: "ls .planning/todos/completed/ | grep -c ... -> 4; ls .planning/todos/pending/ | grep -c ... -> 3"
        status: pass
    human_judgment: false

duration: ~20min (Task 3 continuation; Tasks 1-2 prior sessions)
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 11: Milestone #7 Closing Pass Summary

**19 of 21 GitHub milestone issues closed with a maintainer-approved comment each, 2 already-closed issues (D-23) commented in place, milestone #7 closed at 0/21/closed, and the four shipped folded todos moved to completed.**

## Performance

- **Duration:** ~20 min (Task 3 continuation only; Task 1 drafted in a prior session, Task 2 approved via maintainer reply before this continuation)
- **Tasks:** 3 (1 tracer draft, 1 blocking-human checkpoint, 1 posting/close/bookkeeping)
- **Files modified:** 6 (`97-CLOSING-COMMENTS.md`, 4 todo file moves via `git mv`, plus this SUMMARY)

## Accomplishments

- Posted the maintainer-approved closing comment on 19 open milestone issues and closed each individually (#587, #588, #589, #590, #591, #592, #593, #607, #609, #613, #614, #615, #616, #617, #618, #619, #620, #622, #630), verifying state CLOSED and comment presence before moving to the next issue.
- Posted the approved comment via plain `gh issue comment` on #594 and #621 — both already CLOSED by the PR #679 squash merge (D-23) — without reopening or re-closing either.
- Closed milestone #7 ("v4.4 IntelliJ Focus") only after confirming 0 open / 21 closed; read back afterward to confirm `state: closed`.
- Moved the four shipped folded-todo files from `.planning/todos/pending/` to `.planning/todos/completed/` via `git mv`; confirmed the three D-22 residuals (crash-detection, status-log, linking-interop) remain in pending.
- Recorded the maintainer's verbatim "go" and a complete posting log (per-issue action + comment URL) in `97-CLOSING-COMMENTS.md`.

## Task Commits

Task 1 and its orchestrator correction ran in a prior session:

1. **Task 1: Draft all 21 closing comments** — `7170fdab` (docs)
2. **Orchestrator correction to #616/#618 comments** — `b2b8c4d6` (docs)

Task 2 (`checkpoint:human-verify`, `gate="blocking-human"`) was answered by the maintainer's explicit "go" — no commit (approval recorded in the review file by this continuation).

3. **Task 3: Post, close one at a time, close the milestone, move the four shipped todo files** — `7b4af67e` (docs)

**Plan metadata:** this SUMMARY's own commit (see below) — no separate `gsd_run query commit`; all commits in this plan used plain `git commit` with the required trailers per the orchestrator's project rules.

## Files Created/Modified

- `.planning/phases/97-release-0-16-0-milestone-close/97-CLOSING-COMMENTS.md` — verbatim maintainer go recorded, edits-folded-in noted as none, full 21-row posting log with per-issue action and comment URL, and the milestone read-back appended.
- `.planning/todos/pending/2026-09-20-intellij-client-has-no-handler-for-bbjcplavailability.md` → `.planning/todos/completed/` (git mv)
- `.planning/todos/pending/2026-09-20-node-download-progress-setfraction-on-indeterminate-indicator.md` → `.planning/todos/completed/` (git mv)
- `.planning/todos/pending/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md` → `.planning/todos/completed/` (git mv)
- `.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` → `.planning/todos/completed/` (git mv)

## Decisions Made

- Posted the approved text byte-for-byte from `97-CLOSING-COMMENTS.md` at commit `b2b8c4d6` for every issue — no rewording, shortening, merging, or "improving" of any comment body, per the maintainer's explicit instruction at the go.
- #594 and #621 handled per D-23: both already CLOSED (auto-closed by the PR #679 squash merge's concatenated commit-message closing keywords); each received its approved comment via a plain `gh issue comment`, never reopened, never re-closed.
- The milestone-level PATCH to `state=closed` ran only after an explicit `gh api .../milestones/7 --jq '{open_issues,closed_issues,state}'` read confirmed `0` open / `21` closed, per the plan's ordering requirement (milestone closed last, never before).

## Deviations from Plan

None — plan executed exactly as written. No command errored, no verification mismatched, and the pass ran to completion in one continuous ascending-order sequence with no skips (all 21 issues were open or already-closed-at-merge as expected from the Task 2 checkpoint's pre-check; no issue needed a "comment already present, skipped" or "already closed, skipped" outcome beyond the two D-23 cases).

## Side Finding (flagged for Next, not acted on)

The curated v0.16.0 release notes (97-09) list #622 under "no observable change," but the shipped fix for #622 changed the server-crash banner's file-type guard from a hard-coded extension list to the resolved-file-type check the other three notification providers already used — a real, visible behavior change (the banner now correctly appears on `.bbx` programs it previously missed, no longer misfires on `.bbl` files, and now also appears while the IDE is indexing), as the #622 closing comment itself states. This is a discrepancy between the release notes and the shipped code, not something this plan is authorized to fix (release notes are not in this plan's file scope and the release is already published). Flagged here for a future correction pass rather than edited.

## Issues Encountered

None. Every `gh` command succeeded on the first attempt; every re-read matched the expected state.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- REL-02 is complete and provable from the GitHub API (0 open / 21 closed / state closed on milestone #7).
- Phase 97 (Release 0.16.0 & Milestone Close) is now complete — all 11 plans done.
- Side finding above (release notes vs. shipped #622 behavior) is a candidate for a small follow-up correction, not a blocker.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
