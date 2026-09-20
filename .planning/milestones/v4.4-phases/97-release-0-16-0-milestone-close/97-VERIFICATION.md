---
phase: 97-release-0-16-0-milestone-close
verified: 2026-09-20T19:30:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "ROADMAP criterion 3: the published VS Code extension and JetBrains plugin install from their marketplaces and pass the QA smoke checklist in a clean IDE"
    reason: "D-14 (maintainer decision, recorded pre-verification): a green publish-intellij job counts as 'live' for the JetBrains side; the review queue is not waited on. The IntelliJ smoke was therefore run against bbj-intellij-0.16.0.zip from the v0.16.0 GitHub Release (byte-identical to what publish-intellij uploaded, per 97-RELEASE-EVIDENCE.md §6), not a Marketplace install. VS Code was installed from the Marketplace as written."
    accepted_by: "StephanWald (recorded in 97-CONTEXT.md D-14, discuss-time decision)"
    accepted_at: "2026-09-20"
---

# Phase 97: Release 0.16.0 & Milestone Close Verification Report

**Phase Goal:** Everything Phases 93-96 delivered ships as release 0.16.0 to both marketplaces
through a single verification gate, and GitHub milestone #7 closes behind it.
**Verified:** 2026-09-20T19:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One verification job runs green before anything is published, tagged or pushed; no publish job starts ahead of it | VERIFIED | Independently re-ran `gh run view 35524399880 --json conclusion,headSha,jobs`: `verify` job completed `2026-09-20T17:06:32Z`; `publish-vscode` and `publish-intellij` both started `17:06:34Z` (after `verify`); `tag-release` started `17:09:08Z` (after both publish jobs completed); `create-release` started `17:09:17Z` (after `tag-release`). `manual-release.yml`'s `needs:` graph (`publish-vscode: needs verify`, `publish-intellij: needs verify`, `tag-release: needs [verify, publish-vscode, publish-intellij]`, `create-release: needs [...tag-release]`) independently confirmed by direct grep of the workflow file — matches observed timings exactly. All 5 jobs `success`. |
| 2 | Version 0.16.0 is live on both Marketplaces, with tag `v0.16.0` and a GitHub Release present; no half-release, no orphaned tag | VERIFIED | `git ls-remote --tags origin v0.16.0` → `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464`; `gh release view v0.16.0` confirms tag, two uploaded assets (`bbj-intellij-0.16.0.zip` sha256 `ce2561aa…`, `bbj-lang-0.16.0.vsix` sha256 `0fa7ce1f…`), `publishedAt 2026-09-20T17:09:25Z`. `git log --oneline -3 origin/main` shows `6101a6b6 Release version 0.16.0` directly atop `5f03a0a8 Bump preview version` atop `7ab6b810` (the landing squash merge) — no orphan commits between. VS Code Marketplace independently queried live (`npx @vscode/vsce show basis-intl.bbj-lang --json`): `0.16.0` now listed as the newest version (propagated since the evidence record was written). JetBrains: `publish-intellij` job conclusion `success`, `:publishPlugin` `BUILD SUCCESSFUL` — counts as live per the accepted D-14 override (review queue not required). |
| 3 | The published extension and plugin install from their marketplaces and pass the QA smoke checklist in a clean IDE | VERIFIED (PARTIAL OVERRIDE — see overrides) | Met **as written** for VS Code: installed from the Marketplace, which listed `0.16.0` at test time. Met **via the accepted D-14 override** for JetBrains: installed from the GitHub Release's `.zip` (byte-identical to the uploaded artifact per 97-RELEASE-EVIDENCE.md §6), not the Marketplace, because the review queue is deliberately not waited on. Maintainer's smoke reply (`QA/test-runs/2026-09-20-smoke-test-PASS.md`) was the single word `"pass"` — an overall verdict, not per-row confirmation; all ten checklist rows are marked `[x]` on that basis, and the record itself says so. No VS Code version was stated. OS/IntelliJ version inferred from a different phase artifact (97-UAT-ARTIFACTS.md), not independently stated in the smoke reply. This truth is **not** reported as met verbatim — the override and the shallow-verdict caveat are both recorded here as instructed. |
| 4 | All 21 issues on GitHub milestone #7 are closed and milestone #7 itself is closed | VERIFIED | `gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '{state,open_issues,closed_issues}'` → `{"closed_issues":21,"open_issues":0,"state":"closed"}`. Per-issue check of all 21 issue numbers (587-594, 607, 609, 613-622, 630): every issue `state=closed`, every issue has exactly 1 comment, every comment contains `releases/tag/v0.16.0`. #621 and #594 (auto-closed by the PR #679 squash merge per D-23) each independently confirmed to carry exactly one comment with the release link, posted without reopening/re-closing. |

**Score:** 4/4 truths verified (1 carries an accepted, explicitly-recorded override on the JetBrains-marketplace half of criterion 3; 0 present-but-behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `97-UAT-ARTIFACTS.md` | Round 1 FAILED hand UAT + D-22 revert record + Round 2 APPROVED hand UAT, both tied to hashed distributables | VERIFIED | 388 lines. Round 1 (2026-09-20, macOS): maintainer replies quoted verbatim, `idea.log` trace shows `started -> stopping (NOT_A_STOP) -> stopped (NOT_A_STOP)`, no CRASH classification ever fired — root cause matches D-22's account exactly. Round 2: hand-check verdict "APPROVED" on the reverted tree, hashes independently re-verified against artifacts, gate declared MET, explicitly states no crash/restart/status-log expectation was put to the maintainer. |
| `97-LANDING-PR.md` | PR #679 record: no closing keywords, squash SHA recorded | VERIFIED | 138 lines. `gh pr view 679 --json body` independently confirmed no `Fixes #`/`Closes #`/`Resolves #` in the PR body. |
| `97-PREVIEW-GATE.md` | Green Preview run + two-IDE maintainer hand check | VERIFIED | 138 lines. Independently re-queried `gh run view 35522129619` → `conclusion: success`, `headSha: 7ab6b81…` matching the squash-merge commit. Maintainer replies ("approved vscode", "approved intellij") quoted verbatim. |
| `97-RECONCILIATION-RUNBOOK.md` | Five recovery paths (A-E) with exact commands, retention-days warning up front | VERIFIED | 275 lines; not exercised (no job failed), consistent with D-10/D-12. |
| `97-RELEASE-PRECONDITIONS.md` | Seven-item precondition report, all PASS, dispatch instructions | VERIFIED | 123 lines; every item's command and literal output shown; independently re-checked items 1, 2, 4, 6 against live GitHub state — all match. |
| `97-RELEASE-EVIDENCE.md` | Run identity, job graph, tag/commit, release, asset hashes, marketplace state, milestone state | VERIFIED | 204 lines; every hash independently re-derived above and matched GitHub's own reported digests via `gh release view --json assets`. |
| `97-RELEASE-NOTES.md` | Curated user-facing notes, D-22-narrowed (no crash/restart/status-log claims), applied via `gh release edit` | VERIFIED | 211 lines. Published release body independently fetched via `gh release view --json body`; grep for "crash|auto-restart|status.transition" returns nothing — confirms the D-22 narrowing was honoured in what actually shipped. |
| `97-SMOKE-VERDICT.md` + `QA/test-runs/2026-09-20-smoke-test-PASS.md` | Verdict tied to released asset hashes, criterion-3 override recorded explicitly | VERIFIED | Both files present; verdict sentence names the exact sha256/size/run-id/commit; the override framing matches D-14/D-15 exactly and is honest about the maintainer's single-word "pass" not being per-row. |
| `97-CLOSING-COMMENTS.md` | 21-row posting log, maintainer's verbatim "go", D-23 handling for #621/#594 | VERIFIED | 272 lines; cross-referenced against live `gh api` issue/comment state — all 21 rows match reality exactly (state, comment count, release-link presence). |
| `97-REVIEW.md` | Code review of the 5 surviving code-wave files | VERIFIED | 4 warnings (all advisory, none blocking), 3 info items; findings are honest about real coverage gaps (WR-01 Content-Length gap, WR-04 tautological assertion) rather than papering over them. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `verify` job completion | `publish-vscode`/`publish-intellij` start | Job timestamps in `gh run view` | WIRED | `verify` ended 17:06:32Z; both publish jobs started 17:06:34Z — confirmed independently, not just from workflow YAML. |
| Both publish jobs completion | `tag-release` start | Job timestamps | WIRED | `tag-release` started 17:09:08Z, after `publish-vscode` (17:06:58Z) and `publish-intellij` (17:09:06Z) both completed. |
| `tag-release` completion | `create-release` start | Job timestamps | WIRED | `create-release` started 17:09:17Z, after `tag-release` completed 17:09:15Z. |
| `verify`'s uploaded `vscode-extension`/`intellij-plugin` artifacts | Release assets | sha256 comparison | WIRED (FLOWING) | Run-artifact hashes match Release-asset hashes exactly for both files (independently re-derivable from `gh release view --json assets` digests, which match 97-RELEASE-EVIDENCE.md's recorded values). |
| Squash commit `7ab6b810` | Preview run `35522129619` | `push` trigger, headSha match | WIRED | Independently confirmed `gh run view 35522129619 --json headSha` = `7ab6b81042841efbade0610890e7e22495b0e205`, exactly the squash-merge commit. |
| PR #679 squash commit message | Auto-closure of #621/#594 | `git log -1 --format=%B 7ab6b810` | WIRED (as documented in D-23) | Commit message body contains `Closes #621.` and `This closes #594` — confirms the D-23 mechanism, not just the claim. |

### Register Check (D-03)

`git diff bdc024dc..HEAD -- bbj-intellij bbj-vscode` scanned for `plan|D-[0-9]|C-[0-9]|CR-[0-9]|97-0|COMP-|PLAT-|REL-01|REL-02` — **zero matches**. Register check clean.

### D-22 Revert Completeness

`git diff --exit-code bdc024dc -- bbj-intellij/.../BbjServerService.java bbj-intellij/.../BbjLanguageServerFactory.java bbj-intellij/.../ExpectedStopGuard.java` → exit 0 (no diff). The three files touched by the reverted crash-detection rework are byte-identical to the pre-code-wave baseline. `git diff --stat bdc024dc..HEAD -- bbj-intellij bbj-vscode` shows only the five surviving files (BbjNodeDownloader.java, BbjLanguageClient.java, two new source-guard test files, issue447-real-interop.test.ts) plus the expected package.json version bump — matching the guidance's expectation exactly.

### `manual-release.yml` Unchanged (D-09)

`git diff --exit-code d4a335ac -- .github/workflows/manual-release.yml` → exit 0. Confirmed unmodified since before the phase began.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| REL-01 | 97-01 through 97-10 | Release 0.16.0 published to both marketplaces through the single verification gate, no half-release, no orphaned tag | SATISFIED | Success criteria 1-3 above; independently confirmed job graph, tag, release, asset hashes. |
| REL-02 | 97-11 | All 21 milestone #7 issues closed and the milestone itself closed | SATISFIED | Success criterion 4 above; independently confirmed via `gh api` on all 21 issues plus the milestone object. |

No orphaned requirements: REQUIREMENTS.md maps exactly REL-01 and REL-02 to Phase 97, and both appear declared across the eleven plans' `requirements:` frontmatter.

### Anti-Patterns / Debt Markers

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` found in the five surviving code-wave files (confirmed by 97-REVIEW.md's own scan and spot-checked). The four review warnings (WR-01 through WR-04) are advisory quality gaps in test strength and one production edge case (missing `Content-Length` handling), not stubs or incomplete features; all four are filed in `.planning/todos/pending/2026-09-20-phase-97-code-review-follow-ups.md`, confirmed present on disk.

### Folded-Todo Bookkeeping (D-21/D-22 narrowing)

`.planning/todos/completed/` contains exactly the four shipped items dated for this phase's scope: `2026-09-20-intellij-client-has-no-handler-for-bbjcplavailability.md`, `2026-09-20-node-download-progress-setfraction-on-indeterminate-indicator.md`, `2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md`, `2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md`. `.planning/todos/pending/` retains the two D-22 residuals (`lost-language-server-connection-is-invisible-to-crash-detection.md`, `status-transition-log-prints-a-stale-previous-status.md`) plus the linking-interop investigation's re-filed item and the new code-review follow-ups file — matching the guidance's account exactly.

### Behavioral Spot-Checks

Not run as fresh commands (phase is release-ops/GitHub-state, not a runnable-code phase in the usual sense); instead every material claim in the release-evidence chain was independently re-derived via `gh`/`git` read-only calls rather than trusted from SUMMARY narrative — see the Observable Truths and Key Link tables above for the specific commands and their literal output.

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` declared or implied by this phase's plans.

### Human Verification Required

None outstanding. Every human checkpoint this phase required was already exercised and recorded by the maintainer during execution, and independently confirmed here against live GitHub/Marketplace state rather than re-requested:
- Crash-detection hand UAT Round 1 (FAILED, led to D-22 revert) and Round 2 (APPROVED) — `97-UAT-ARTIFACTS.md`.
- Landing PR review and squash merge — PR #679, `state: MERGED`.
- Preview hand check in both IDEs — "approved vscode" / "approved intellij", `97-PREVIEW-GATE.md`.
- Release dispatch from the Actions UI — `triggering_actor: StephanWald`, `event: workflow_dispatch`.
- Release-notes approval — applied release body independently confirmed to honor the D-22 narrowing.
- Smoke verdict — maintainer's verbatim "pass", `QA/test-runs/2026-09-20-smoke-test-PASS.md`.
- Closing-comment batch approval ("go") and 21-issue posting — independently confirmed via live `gh api` state.

### Gaps Summary

No gaps block the phase goal. Two items are recorded as honest, pre-disclosed deviations/limitations rather than concealed:

1. **ROADMAP criterion 3, JetBrains half** — met via the accepted D-14 override (upload-accepted = live), not via an actual Marketplace install. This is recorded as an override above per the verification guidance's explicit instruction not to report criterion 3 as met verbatim.
2. **Smoke verdict granularity** — the maintainer's reply was a single overall "pass" rather than per-row confirmation, and did not state a VS Code version or explicitly confirm clean IDE profiles were used. `97-SMOKE-VERDICT.md` and the checklist file both disclose this themselves; it is not concealed. Per D-17, since no finding was reported there is nothing to classify, and this does not block the phase goal — the maintainer's own release/smoke process, not Claude's, is definitionally the acceptance bar here.

Other pre-disclosed, non-blocking items (not gaps against this phase's goal):
- D-18 was technically violated for #621/#594 by an accidental squash-merge artifact (commit-message closing keywords), not by any action this phase took; D-23 is the maintainer's accepted-deviation record and the end state (21 closed, milestone closed last) is unchanged.
- 97-REVIEW.md's 4 warnings are advisory test/production-edge-case gaps, filed as a pending todo rather than blocking the release.
- The applied release notes list #622 under "no observable change" despite a real (if narrow) behavior change in the crash-banner's file-type coverage — flagged as a side finding in 97-11-SUMMARY.md for a future correction pass, not corrected in this phase (release notes were already published; out of this phase's remaining scope).
- 164 local-only `docs(97-...)` planning commits sit on branch `gsd/phase-97-release-0-16-0` ahead of `origin/main` (confirmed: no source-code drift beyond a single `package.json` version line) — an open housekeeping item (these planning docs still need to land), not a phase-goal failure.
- Plans 97-01 and 97-02 (status `complete` in their own SUMMARYs) describe crash-detection/status-log work that was later reverted by D-22; their SUMMARYs are historical record of an attempted-then-reverted approach, not evidence of a currently-shipped truth, and are treated that way throughout this report (their content is superseded, not counted as failed or passed on its own).

---

_Verified: 2026-09-20T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
