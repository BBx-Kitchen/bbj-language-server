---
phase: 97-release-0-16-0-milestone-close
plan: 07
subsystem: release-process
tags: [github-actions, jetbrains-marketplace, vscode-marketplace, reconciliation-runbook]

# Dependency graph
requires:
  - phase: 97-06
    provides: "The whole v4.4 lineage landed on origin/main as squash commit 7ab6b810 via PR #679 — the tree the Preview run this plan watches was triggered by."
provides:
  - "A written reconciliation runbook (`97-RECONCILIATION-RUNBOOK.md`) covering all five failure paths of `manual-release.yml`'s parallel-publish job graph (verify failed; VS Code published/JetBrains failed; JetBrains published/VS Code failed; tagging failed; release-creation failed), each with exact, verified commands and the token-interchangeability assumption flagged UNVERIFIED"
  - "A recorded, green Preview dress-rehearsal run (35522129619, preview version 0.15.5) on the exact squash-merge commit (7ab6b81042841efbade0610890e7e22495b0e205)"
  - "The maintainer's verbatim, per-IDE hand-check approval of that preview build, satisfying D-06 in full"
affects: ["97-08 (release dispatch precondition list can now cite D-06 as satisfied)", "any future publish-job failure (the runbook is the standing recovery document)"]

actuals:
  tokens: 5400
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Reconciliation-by-download: on any half-published release, download the failed run's own three verified artifacts (`gh run download`, one-day retention) and publish those exact bytes by hand rather than re-running a job that would rebuild — pins byte identity to what `verify` already checked."
    - "Dress-rehearsal gate: the Preview workflow run triggered by a landing merge is treated as a full mechanical + human rerun of the release gate (same `verify` job, both publish tokens, then a hand check in both IDEs) before a version-numbered release is ever dispatched."

key-files:
  created:
    - .planning/phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md
  modified:
    - .planning/phases/97-release-0-16-0-milestone-close/97-PREVIEW-GATE.md

key-decisions:
  - "No new decisions recorded by this plan beyond executing D-06/D-09/D-10/D-12 as already specified in 97-CONTEXT.md; the maintainer's IntelliJ install route (JetBrains preview channel vs. the run's own verified zip) was not stated and is recorded as 'route not stated' rather than assumed — a factual gap, not a decision needing resolution, since both routes install the same reviewed build."

patterns-established: []

requirements-completed: []  # REL-01 is NOT complete. This plan satisfies the D-06 preview-gate precondition only; release dispatch, release notes, smoke, and issue closing (plans 97-08..97-11) remain open.

coverage:
  - id: D1
    description: "The reconciliation runbook exists, covers all five labelled failure paths with exact commands verified against manual-release.yml, states the one-day artifact retention up front, marks the JetBrains token-interchangeability assumption UNVERIFIED with a web-UI fallback, contains no token-shaped literal, and leaves both workflow files byte-identical to origin/main."
    requirement: "REL-01"
    verification:
      - kind: other
        ref: "Task 1's automated <verify> block (grep for 'gh run download' count>0, grep -ci UNVERIFIED count>0, token-shape grep empty, git diff --exit-code origin/main -- manual-release.yml preview.yml) — run by the prior executor, re-read and confirmed present in the file this session"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Preview run triggered by the landing merge (35522129619) matched the squash-merge head SHA, finished green in all four jobs, and is recorded in 97-PREVIEW-GATE.md with run id, URL, head SHA, per-job conclusions and the published preview version (0.15.5)."
    requirement: "REL-01"
    verification:
      - kind: other
        ref: "97-PREVIEW-GATE.md 'Run identity' and 'Per-job results' sections — headSha 7ab6b81042841efbade0610890e7e22495b0e205 equals 97-LANDING-PR.md's recorded squash commit; all four jobs conclusion: success"
        status: pass
    human_judgment: false
  - id: D3
    description: "The maintainer installed the 0.15.5 preview build in both VS Code and IntelliJ, opened a .bbj file, and confirmed server start + diagnostics + completion in each, replying 'approved' per IDE."
    requirement: "REL-01"
    verification: []
    human_judgment: true
    rationale: "A checkpoint:human-verify (gate=blocking-human) by design — this is exactly the sanity pass a human must perform in a running IDE; no automated test can substitute for it."

duration: ~5min for Tasks 1-2 (prior executor, 2026-09-20T16:21Z-16:27Z) + this continuation's Task 3 hand-check record and write-up
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 07: Reconciliation Runbook Written, Preview Dress Rehearsal Green, Maintainer Approved Both IDEs Summary

**A five-path by-hand recovery runbook for `manual-release.yml`'s parallel publish jobs, plus a green Preview dress-rehearsal (0.15.5, run 35522129619) approved in both VS Code and IntelliJ by the maintainer — D-06 is now fully satisfied.**

## Performance

- **Duration:** ~5 min (Tasks 1-2, prior executor session) + this continuation (Task 3 hand-check record and SUMMARY write-up)
- **Started:** 2026-09-20T16:21:44Z (end of plan 97-06)
- **Completed:** 2026-09-20T16:56:38Z (hand-check commit)
- **Tasks:** 3/3 (Task 3 was a `checkpoint:human-verify` answered by the maintainer, not Claude)
- **Files modified:** 2 (`97-RECONCILIATION-RUNBOOK.md` created, `97-PREVIEW-GATE.md` extended) plus this SUMMARY and STATE/ROADMAP metadata

## Accomplishments

- Wrote `97-RECONCILIATION-RUNBOOK.md`: five labelled recovery paths (verify failed; VS Code published/JetBrains failed — the fully worked path; JetBrains published/VS Code failed; both published/tagging failed; tag exists/release creation failed), each with commands verified against `manual-release.yml` line-by-line. States the one-day artifact retention up front, explains why re-running `publish-intellij` would rebuild rather than re-upload, marks the JetBrains direct-upload token-interchangeability assumption **UNVERIFIED** with the Marketplace web-UI upload as the fallback, and carries no token-shaped literal — every token is read from the environment and placed last on the command line. Both workflow files stayed byte-identical to `origin/main`.
- Found and watched the Preview run the landing merge triggered: run `35522129619`, head SHA `7ab6b81042841efbade0610890e7e22495b0e205` (equal to PR #679's squash commit), all four jobs (`verify`, `bump-version`, `publish-vscode`, `publish-intellij`) `success`, preview version `0.15.5` published to both marketplaces. Recorded in `97-PREVIEW-GATE.md` along with the resulting `origin/main` HEAD (`5f03a0a8`, one commit ahead of the squash merge — the expected `bump-version` commit).
- Recorded the maintainer's verbatim hand-check reply — two messages, "approved vscode" then "approved intellij" — against the resume-signal's three checks (server starts, diagnostics on a bad line, completion returns BBj keywords) in each IDE. VS Code was installed via **Switch to Pre-Release Version**; for IntelliJ the maintainer was offered both the JetBrains `preview` channel and the run's own verified artifact (`bbj-intellij-0.15.5.zip`, sha256 `65e8dcb97ade5edd5e41ce02959751787fdeaa6073d47dc31b67b7acf8257669`, downloaded and sent by the orchestrator) but did not state which route they used — recorded as "route not stated" rather than assumed.
- D-06 is now satisfied in full: green Preview run plus a maintainer hand check in both IDEs, no calendar soak. Noted for the next plan that an unrelated open PR #675 would move `origin/main` off this hand-checked tree if merged before release dispatch — the maintainer has been told.

## Task Commits

Tasks 1 and 2 were committed by the prior executor session (this is a continuation):

1. **Task 1: Write the reconciliation runbook** - `37313509` (docs(97-07): write the reconciliation runbook for a half-published release)
2. **Task 2: Watch the Preview run and record it** - `00f6c289` (docs(97-07): record the green Preview dress-rehearsal run)
3. **Task 3: Maintainer sanity-checks the preview build in both IDEs** - performed by the maintainer (verbatim replies "approved vscode" / "approved intellij"); this continuation's own commit records it: `7a01c2ac` (docs(97-07): record maintainer hand-check approval for both IDEs)

**Plan metadata:** (this commit) `docs(97-07): complete preview gate plan — maintainer approved both IDEs, D-06 satisfied`

_Note: This is a continuation execution — Tasks 1-2 and their commits pre-date this session; only Task 3's hand-check recording and this write-up were performed here._

## Files Created/Modified

- `.planning/phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md` - New. Five-path by-hand recovery runbook for `manual-release.yml`'s parallel publish-job residual (D-10).
- `.planning/phases/97-release-0-16-0-milestone-close/97-PREVIEW-GATE.md` - Extended with the Preview run record (Task 2, prior executor) and, this continuation, the completed "Maintainer hand check" section: verbatim replies, per-IDE lines, artifact identities and hashes, `origin/main` HEAD at approval time, and the D-06 status statement.

## Decisions Made

None new — this plan executes D-06, D-09, D-10 and D-12 exactly as specified in `97-CONTEXT.md`. The one factual gap (IntelliJ install route not stated by the maintainer) is recorded as such in `97-PREVIEW-GATE.md` rather than guessed, per the hand-off instruction.

## Deviations from Plan

None - plan executed exactly as written. The runbook's structure, the Preview-run watch, and the hand-check recording all matched the plan's `<action>` blocks; no auto-fixes, no architectural questions, no blocking issues.

## Issues Encountered

None. The prior executor's runbook and Preview-run record were verified present and correct on read; the maintainer's two-message reply was recorded verbatim without reinterpretation, and the IntelliJ install-route ambiguity was recorded as a stated gap rather than resolved by assumption.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-06 is fully satisfied: the reconciliation runbook exists and is complete, the Preview dress rehearsal is green, and the maintainer has approved the preview build in both IDEs. This is the precondition list's preview-gate slice for D-11's release dispatch.
- REL-01 remains open. The release dispatch (D-11, blocking-human, maintainer-only via the Actions UI), release notes (D-13), post-publish smoke (D-15/D-16/D-17), and the 21-issue closing pass (D-18..D-21) are still ahead.
- **Flag for the release-dispatch plan:** an unrelated external PR #675 is open against `main`. Merging it before Manual Release `0.16.0` is dispatched would move `origin/main` off the exact tree the maintainer just hand-checked in this plan. The maintainer has already been told; the release-dispatch plan should re-confirm `origin/main` HEAD still equals `5f03a0a8` (or explicitly re-verify a later HEAD) immediately before dispatch, per D-11's precondition-confirmation requirement.
- The reconciliation runbook (`97-RECONCILIATION-RUNBOOK.md`) is now in hand for whichever publish path (if any) fails during the real `0.16.0` dispatch — no path needs to be improvised under time pressure.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*

## Self-Check: PASSED
