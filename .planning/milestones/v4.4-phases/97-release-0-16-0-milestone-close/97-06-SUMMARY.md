---
phase: 97-release-0-16-0-milestone-close
plan: 06
subsystem: release-process
tags: [git, github-pr, squash-merge, milestone]

# Dependency graph
requires:
  - phase: 97-05
    provides: "Both suites green, both distributables rebuilt and hashed, and the maintainer's Round 2 hand-check approval on the post-revert tree — the code-wave gate this plan's PR carries."
provides:
  - "The whole v4.4 lineage (Phases 93-96, this phase's four folded-todo fixes, the v4.4 planning docs) landed on origin/main as one squash-merged pull request (#679, squash commit 7ab6b810)"
  - "origin/main's bbj-vscode/package.json holds 0.15.4 (origin/main's pre-merge value), never regressed by the merge-in"
  - "A recorded, maintainer-confirmed merge event (PR number, squash SHA, merged-at timestamp, new origin/main HEAD) for plan 97-11's closing comments to cite"
  - "A documented, accepted deviation (D-23): the squash merge auto-closed #621 and #594 ahead of the release, narrowing the closing pass to 19 comment-and-close plus 2 comment-only"
affects: ["97-07 (preview hand check watches the Preview run this merge triggered)", "97-11 (closing comments cite this PR/SHA and the D-23 narrowed issue list)"]

actuals:
  tokens: 3200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Squash-merge landing PR: one PR carries an entire multi-phase lineage, gated by a pre-push register check (planning identifiers) and a PR-body closing-keyword grep — both scoped to the PR body/diff only, not the underlying commit-message range being squashed"

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - .planning/phases/97-release-0-16-0-milestone-close/97-LANDING-PR.md

key-decisions:
  - "D-23 (discovered post-merge, maintainer decision 2026-09-20): the squash merge of PR #679 auto-closed #621 and #594 because GitHub concatenated all 135 commit messages into the squash commit body, and two Phase 95/96 commit bodies carried `Closes #621.` / `This closes #594`. The D-04 gate checked only the PR body text, never the underlying commit-message range. Maintainer decision: leave both closed, do not reopen; the closing pass (97-11) still posts each its drafted comment, plain (not re-closing). Narrows D-18/D-19: 19 issues to comment-and-close plus 2 to comment-only; end state (21 closed, milestone #7 closed last) unchanged."
  - "Task 3's acceptance criterion 'no issue on milestone #7 changed state as a result of the merge' is reported FAILED, with the D-23 deviation accepted by the maintainer rather than papered over — open_issues read 19, not the expected 21, immediately after the merge."

patterns-established:
  - "Lesson recorded in D-23 for future squash-merge landings: scan the commit messages of the merge range (not only the PR body) for GitHub closing keywords before merging, since a squash commit's body is the concatenation of every commit in the range."

requirements-completed: []  # REL-01 is NOT complete. This plan lands the code on origin/main; the release dispatch, preview hand-check, release-notes and issue-closing steps of REL-01 (plans 97-07..97-11) remain open.

coverage:
  - id: D1
    description: "The branch was merged up to date with origin/main with no package.json version regression, and both release workflow files stayed byte-identical to origin/main (Task 1, prior executor)."
    requirement: "REL-01"
    verification:
      - kind: other
        ref: "git diff --exit-code origin/main -- .github/workflows/manual-release.yml .github/workflows/preview.yml (recorded exit 0 in 97-LANDING-PR.md); package.json version equality check (recorded 0.15.4 == 0.15.4)"
        status: pass
    human_judgment: false
  - id: D2
    description: "One PR (#679) carried the whole lineage with no planning-identifier leak and no GitHub closing keyword in its body, pushed via plain git + gh pr create (Task 2, prior executor)."
    requirement: "REL-01"
    verification:
      - kind: other
        ref: "register-check grep over origin/main...HEAD diff (empty); closing-keyword grep over 97-LANDING-PR.md body (empty); gh pr view baseRefName == main"
        status: pass
    human_judgment: false
  - id: D3
    description: "The maintainer reviewed and squash-merged PR #679; the squash SHA, merged-at timestamp and new origin/main HEAD are recorded for plan 97-11 to cite."
    requirement: "REL-01"
    verification:
      - kind: other
        ref: "gh pr view 679 --json state,mergedAt,mergeCommit -> MERGED, 2026-09-20T16:15:13Z, 7ab6b810...; git rev-parse origin/main -> 7ab6b810... (this execution's own re-verification, this plan)"
        status: pass
    human_judgment: true
    rationale: "The merge action itself is an irreversible, maintainer-only act (gate=blocking-human) — Claude verified the outcome read-only but did not and must not perform or approve the merge."
  - id: D4
    description: "No issue on milestone #7 changed state as a result of the merge (Task 3's stated acceptance criterion)."
    requirement: "REL-01"
    verification:
      - kind: other
        ref: "gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '.open_issues' -> 19 (expected 21)"
        status: fail
    human_judgment: true
    rationale: "This criterion failed as written; the maintainer has already reviewed and accepted the underlying cause (D-23) as a documented deviation rather than something to fix, so a human should see the failed criterion and the accepted resolution together rather than have it silently reclassified as passing."

duration: ~29min for Tasks 1-2 (prior executor, 2026-09-20T15:50Z-16:17Z) + ~10min for this continuation's Task 3 verification and write-up
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 06: Landing PR Merged — v4.4 Lineage on origin/main (with One Accepted Deviation) Summary

**PR #679 (135 commits, 76 source files, +4167/-1166) squash-merged to `main` as `7ab6b810` by the maintainer at 2026-09-20T16:15:13Z — but the squash auto-closed two issues (#621, #594) ahead of schedule, an accepted D-23 deviation, not silently passed over.**

## Performance

- **Duration:** ~29 min (Tasks 1-2, prior executor session) + ~10 min (this continuation, Task 3 read-only verification and write-up)
- **Started:** 2026-09-20T15:50:00Z (Task 1 merge commit `0458612f`)
- **Completed:** 2026-09-20T16:19:17Z (this SUMMARY)
- **Tasks:** 3/3 (Task 3 was a `checkpoint:human-verify` performed by the maintainer, not Claude)
- **Files modified:** 2 (`bbj-vscode/package.json`, `97-LANDING-PR.md`) plus this SUMMARY and STATE/ROADMAP metadata

## Accomplishments

- Merged `origin/main` into the landing branch, resolving `bbj-vscode/package.json` to `origin/main`'s `0.15.4` with no version regression; both release workflow files stayed byte-identical to `origin/main`; both whole suites green on the merged tree (commit `0458612f`).
- Ran the register check over the full source diff against `origin/main` (clean, no planning identifiers), opened landing branch `gsd/phase-97-release-0-16-0`, pushed it, and opened PR #679 against `main` with a body containing zero GitHub closing keywords.
- The maintainer reviewed and squash-merged PR #679 (`7ab6b810042841efbade0610890e7e22495b0e205`, 2026-09-20T16:15:13Z). Verified read-only, post-merge: `git diff 7ab6b810 0458612f -- bbj-intellij bbj-vscode documentation .github java-interop` is empty (the merged tree on `main` is identical to the gated branch tip across every path the release gates checked); all six PR status checks were SUCCESS before the merge; the `Publish Preview Extension` run (`35522129619`) started on `7ab6b810` immediately after.
- Discovered and documented D-23: the squash commit's concatenated commit-message body carried closing keywords from two Phase 95/96 commits, auto-closing #621 and #594 one second after the merge — something the pre-push PR-body-only grep could not catch. The maintainer accepted this as a deviation rather than asking for a fix; recorded in `97-CONTEXT.md` (D-23) and `97-LANDING-PR.md`'s merge record.

## Task Commits

Tasks 1 and 2 were committed by the prior executor session (this is a continuation):

1. **Task 1: Bring the branch up to date with origin/main, keeping the higher version** - `0458612f` (Merge origin/main into landing branch)
2. **Task 2: Register check, landing branch, push, and open the PR** - `eb75cda2` (docs(97-06): open the landing PR #679); corrected in `0ed556e1` (docs(97-06): correct the #593 bullet in the stored landing-PR body)
3. **Task 3: Maintainer reviews and merges the landing PR** - performed by the maintainer outside this repository's commit history (GitHub squash-merge `7ab6b810`); this continuation's own commits record the verification and the D-23 deviation: `4aab81d1` (docs(97): record the two issues the squash merge closed early — written by the orchestrator before this continuation was spawned) plus this plan's closing commit (below)

**Plan metadata:** (this commit) `docs(97-06): complete landing PR plan — squash merge verified, D-23 deviation recorded`

_Note: This is a continuation execution — Tasks 1-2 and their commits pre-date this session; only Task 3's post-merge verification and documentation were performed here._

## Files Created/Modified

- `bbj-vscode/package.json` - Version resolved to `0.15.4` (origin/main's value) during the Task 1 merge; no regression.
- `.planning/phases/97-release-0-16-0-milestone-close/97-LANDING-PR.md` - PR body, pre-push facts, PR record, and (this continuation) the completed merge record: PR state MERGED, merged-at, squash SHA, checks, merged-tree verification, Preview run, and the D-23 deviation write-up.

## Decisions Made

- D-23 (see frontmatter `key-decisions` and `97-CONTEXT.md`): the squash merge auto-closed #621 and #594 via concatenated commit-message closing keywords; maintainer accepted, leave both closed, closing pass (97-11) comments only on those two rather than re-closing.
- Task 3's stated acceptance criterion ("no issue on milestone #7 changed state") is recorded as **FAILED** in this SUMMARY's `coverage` block (D4) rather than silently treated as passing, per this plan's explicit instruction not to paper over it.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1/2/3 auto-fixes applied in this continuation. This continuation was read-only verification plus documentation of an already-maintainer-accepted deviation.

### Accepted Deviation (not auto-fixed — maintainer decision required and given)

**1. [D-23] Squash merge auto-closed #621 and #594 ahead of the release**
- **Found during:** Task 3 post-merge verification (this continuation)
- **Issue:** PR #679's squash commit message is the concatenation of all 135 individual commit messages in the merge range. Two Phase 95/96 commits carried `Closes #621.` / `This closes #594` in their bodies. GitHub parsed those keywords from the squash commit and closed both issues ~1 second after the merge (2026-09-20T16:15:13Z). The pre-push D-04 gate only grepped the PR *body* text for closing keywords — it never scanned the commit-message range being squashed, so it reported clean while the underlying risk was live.
- **Resolution:** Not fixed (the issues were already closed on GitHub by the time this was discovered, and re-opening was considered and explicitly declined). Maintainer decision (2026-09-20): leave #621 and #594 closed; the closing pass in plan 97-11 posts each its drafted 0.16.0 comment as a plain `gh issue comment`, without a `gh issue close` call, since both are already closed.
- **Files modified:** `.planning/phases/97-release-0-16-0-milestone-close/97-CONTEXT.md` (D-23, written by the orchestrator before this continuation), `97-LANDING-PR.md` (this continuation's merge-record write-up)
- **Verification:** `gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '.open_issues, .closed_issues'` → `19`, `2` (re-confirmed in this continuation)
- **Committed in:** `4aab81d1` (D-23 recorded in `97-CONTEXT.md`, prior to this continuation) and this plan's closing commit (the `97-LANDING-PR.md` merge-record edit and this SUMMARY)

---

**Total deviations:** 1 accepted-not-fixed (D-23, maintainer-approved)
**Impact on plan:** Task 3's literal acceptance criterion about milestone #7 issue state is not met and is reported as failed above rather than reinterpreted as passing. The overall plan objective (land the lineage on `origin/main` via one reviewed, merged PR) is met. Every other acceptance criterion across Tasks 1-3 passed on re-verification.

## Issues Encountered

None beyond the D-23 deviation documented above. All read-only verification commands (`gh pr view`, `gh api`, `git diff`, `git rev-parse`, `git log`) confirmed the orchestrator-supplied facts in the hand-off exactly: PR #679 state MERGED at 2026-09-20T16:15:13Z; squash commit `7ab6b810` is `origin/main` HEAD; the merged source tree equals the gated branch tip across every path the release gates cover; all six PR checks were SUCCESS before merge; the Preview run (`35522129619`) started on `7ab6b810` and was in progress.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `origin/main` now carries the whole v4.4 lineage at `7ab6b810`; plan 97-07 can proceed to watch the `Publish Preview Extension` run this merge triggered (`35522129619`) and run the maintainer's preview hand check in both IDEs.
- Local commits `eb75cda2`, `0ed556e1`, `4aab81d1`, and this plan's own commits (the `97-LANDING-PR.md` merge-record edit, this SUMMARY, and the STATE/ROADMAP metadata commit) exist **only on the local branch** `gsd/phase-97-release-0-16-0` — they were never intended to land on `main` (they are internal planning docs, not source), but they are also not yet pushed anywhere. **Flag for a later plan or the maintainer:** a follow-up docs landing (a second, much smaller PR, or a direct push if the maintainer prefers) is needed at some point in this phase to get the phase's own planning-doc trail (this SUMMARY, `97-LANDING-PR.md`'s merge record, `97-CONTEXT.md`'s D-23) onto a shared branch/backup — right now they exist in exactly one working tree.
- REL-01 remains open. Plans 97-07 through 97-11 (preview hand-check, release dispatch, release-notes, smoke, closing comments) still gate REL-01's completion; this plan closed only the "branch synced, one PR, maintainer merge" slice of it.
- 97-11's closing pass must use the D-23-narrowed issue list: 19 issues get comment-and-close, #621 and #594 get comment-only (no close call).

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
