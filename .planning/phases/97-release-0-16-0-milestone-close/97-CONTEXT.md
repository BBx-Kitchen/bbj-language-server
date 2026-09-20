# Phase 97: Release 0.16.0 & Milestone Close - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Everything Phases 93-96 delivered reaches `origin/main`, ships as release 0.16.0 to the VS Code
Marketplace and the JetBrains Marketplace through the single verify-before-publish gate in
`manual-release.yml`, is smoke-tested as released, and GitHub milestone #7 closes behind it with
all 21 issues closed (REL-01, REL-02).

By the maintainer's decision in this discussion the phase also carries six folded todos, so it
opens with a small code wave in `bbj-intellij/` (and test housekeeping in `bbj-vscode/`) that must
be complete, verified and hand-UAT'd **before** the landing PR is opened.

Out of scope, unchanged: reconciling the half-released 0.15.0; the v4.1 advisory publication and
any CVE decision (maintainer-owned, PROC-03 — the tagged release is only the trigger); any change
to `manual-release.yml`'s job graph; fixing or waiving WINDOWS.md entry 1.

**State found at discussion time (2026-09-20) — the planner must re-verify, not assume:**

- None of the Phase 93-96 source is on `origin/main`. It all sits on the local, unpushed branch
  `gsd/phase-96-platform-integration-node-js-diagnosis`: 102 commits ahead of `origin/main`
  (45 non-docs), 72 source files, +4114/−1161. `origin/main` is one commit ahead of the merge base
  (`d4a335ac Bump preview version`) and already carries planning docs up to Phase 95.
- Milestone #7: 21 open, 0 closed. Local `bbj-vscode/package.json` is 0.15.3; last tag `v0.15.0`.
- Every push to `main` triggers `preview.yml`, which bumps the patch version and publishes a
  preview build to both marketplaces.

</domain>

<decisions>
## Implementation Decisions

### Sequencing (derived from the decisions below)

- **D-01:** Phase order is fixed: (1) folded-todo code wave + its verification and hand UAT →
  (2) one landing PR → (3) green Preview run + maintainer hand check → (4) maintainer dispatches
  Manual Release 0.16.0 → (5) release evidence + curated release notes → (6) maintainer smoke →
  (7) issue closure + milestone #7 close. No step starts before the previous one's gate is met.

### Landing 93-96 on main

- **D-02:** One PR carrying the whole branch lineage — Phases 93-96 source, the folded-todo fixes,
  and the planning docs (v4.4 artifacts are not embargoed; `origin/main` already has 93-95
  planning docs). Not filtered, not per-phase, not split into "code now, todos after".
  The branch must first be brought up to date with `origin/main` (one `Bump preview version`
  commit ahead). — **Reversibility:** costly — once merged, every preview build and the 0.16.0
  release are cut from it; backing a piece out means a revert PR and another preview publish.
- **D-03:** The standing per-commit register check applies before push: grep the source/test diff
  for planning identifiers (plan numbers, `D-xx`, `C-xx`, `CR-xx`, requirement ids such as
  `COMP-`/`PLAT-`). GitHub issue numbers are fine.
- **D-04:** The PR body carries **no** `Fixes #nnn` / `Closes #nnn` keywords (see D-18), and does
  carry a readable summary of v4.4 including the folded todos (see D-21).
- **D-05:** `/gsd-ship` is bypassed. The PR is created with plain `git push -u origin <branch>` +
  `gh pr create`. WINDOWS.md entry 1 stays **open and untouched** — it was "deferred, not waived"
  by explicit decision on 2026-08-21 and that wording stands. Do not run `windows waive`.
- **D-06:** Pre-release gate after merge: the Preview workflow run triggered by the merge must
  finish green (it runs the same `verify` job and uses both publish tokens — a dress rehearsal of
  the release gate), **and** the maintainer installs that preview build in both IDEs for a quick
  sanity pass. No calendar soak period. Release dispatch follows directly.

### Folded-todo verification bar

- **D-07:** The crash-detection rework ships in 0.16.0 only with: plain-JUnit seam tests, a
  whole-file source guard for the IDE-only wiring, an LSP4IJ coupling canary for the new hook,
  **and** a maintainer hand UAT in their usual IDE (kill the node process / drop the connection
  in a running IDE; crash banner and restart behave). No Windows re-attestation is required.
  Build both distributables before the UAT, and again from the final tree after any code-review
  fixes (standing practice).
- **D-08:** No "pull it back out if it balloons" escape hatch was chosen. If the rework turns out
  to need a change to `ExpectedStopGuard`'s classification semantics, that is a deviation to
  surface to the maintainer, not something to decide silently — the stale-previous-status todo
  itself says "do not change the classifier input without a test that pins the intended
  behaviour".

### Release run & failure plan

- **D-09:** `manual-release.yml` is **not** changed. `publish-vscode` and `publish-intellij` stay
  parallel. The maintainer explicitly declined serializing them (IntelliJ-first was the
  recommended option). — **Reversibility:** reversible — a one-line `needs:` edit later.
- **D-10:** Because of D-09, the phase produces a **written reconciliation runbook** before the
  release is dispatched. It must cover, with exact commands: VS Code published but JetBrains
  failed; JetBrains published but VS Code failed; both published but `tag-release` failed; tag
  pushed but `create-release` failed. Each path publishes the missing side **from the failed
  run's own verified artifact** (`vscode-extension`, `intellij-plugin`, `language-server`), then
  tags and creates the GitHub Release by hand.
  **Constraint the runbook must state up front:** the run's artifacts have `retention-days: 1`,
  so on any publish failure the first action is to download all three artifacts from the run
  (`gh run download <run-id>`) before diagnosing anything.
- **D-11:** The maintainer dispatches Manual Release with version `0.16.0` **from the Actions UI**.
  This is a blocking-human checkpoint. Before it, Claude confirms and reports the preconditions
  (landing PR merged; Preview run green; hand check passed; `origin/main` HEAD is the expected
  SHA; `package.json` on `main` is a 0.15.x lower than 0.16.0 so the version validator passes;
  no `v0.16.0` tag or release exists; runbook written). Claude then watches the run with `gh`
  and reports. Claude does not run `gh workflow run`. — **Reversibility:** one-way — a version
  published to the VS Code Marketplace cannot be replaced or re-published under the same
  number, and the JetBrains upload enters a review queue.
- **D-12:** Failure rule, tiered by where the run failed:
  - `verify` fails → nothing is public; fix on a branch + PR, then re-dispatch `0.16.0` as-is.
  - exactly one publish fails → follow the D-10 runbook; publish the missing side by hand, then
    tag + GitHub Release by hand. **Never bump the version to paper over a half-release.**
  - `tag-release` / `create-release` fails → perform those steps by hand per the runbook.
  - Every manual recovery step is a human checkpoint. Claude performs **no autonomous retries**,
    not even for a plainly transient failure — it reports and waits.
- **D-13:** Release notes: the workflow creates the GitHub Release untouched (auto-generated
  notes + install block). Claude then drafts a short, user-facing v4.4 summary — the eleven
  behaviour fixes in plain language, the ten consolidations as one line, the Color Scheme page
  removal and the Node.js diagnosis/fallback change called out, plus the user-visible folded
  todos — the maintainer approves it, and only then does Claude apply it with `gh release edit`,
  keeping the install block.

### Post-publish smoke & "live"

- **D-14:** **"Live" on JetBrains = upload accepted.** A green `publish-intellij` job satisfies
  success criterion 2 for the JetBrains side; the phase does **not** wait on the JetBrains review
  queue (the maintainer declined the recommended "wait for approval" option). Consequently the
  IntelliJ smoke is run against `bbj-intellij-0.16.0.zip` from the v0.16.0 GitHub Release
  (the same bytes that were uploaded), not against a marketplace install. This is a recorded
  override of ROADMAP criterion 3's "install from their marketplaces" wording **for the JetBrains
  side only**; VS Code is installed from the Marketplace as written. VERIFICATION.md must state
  this override explicitly rather than reporting criterion 3 as met verbatim.
- **D-15:** The maintainer runs `QA/SMOKE-TEST-CHECKLIST.md` by hand, in a clean profile of each
  IDE on their usual machine. Claude prepares a filled-in copy of the checklist's "Test Run
  Result" / "Test Information" blocks and records the verdict. No Playwright-driven VS Code
  pass, no Windows pass.
- **D-16:** Artifact identity: Claude records the sha256 of the `.vsix` and `.zip` attached to the
  v0.16.0 GitHub Release, plus the workflow run id and the released commit SHA; the smoke verdict
  is recorded against those hashes (the 96-08 re-UAT precedent). No download-and-compare of the
  Marketplace VSIX. The job graph (`needs: verify`, publish from downloaded artifacts) is the
  rest of the argument.
- **D-17:** A smoke finding is classified by the maintainer, not by Claude. **Blocking**
  (extension will not activate, server will not start, data loss) → fix lands via PR and ships
  in the next preview immediately, stable users get it in 0.17.0, and milestone #7 stays open
  until then. **Non-blocking** → filed as a GitHub issue for the next milestone; 0.16.0 stands
  and the milestone closes.

### Closing the 21 issues

- **D-18:** Issues close only **after** the release run is green **and** the smoke verdict is in
  — so every closing comment names a version users can install. Hence no closing keywords in the
  landing PR (D-04).
- **D-19:** Claude drafts all 21 closing comments into **one review file in the phase directory**;
  the maintainer reads and edits it; after an explicit "go" Claude posts each comment and closes
  each issue one at a time (`gh issue close`), then closes milestone #7. One approval gate for
  the batch. — **Reversibility:** costly — 21 public comments under the maintainer's identity;
  editable after the fact but already notified to watchers.
- **D-20:** Comment shape: two to four sentences — "Fixed in 0.16.0" with the release link, what
  the user now sees (or "no behaviour change" for the ten consolidations), and the fixing commit
  SHA(s) on `main`. The six issues that closed on cited reasoning rather than as literally
  written — **#616, #618, #620, #622, #594, #593** — additionally say plainly what was done
  instead and why (the reasoning is already recorded in STATE.md's Phase 93/95/96 decision
  entries and REQUIREMENTS.md IOP-02). **No planning identifiers** in any comment (no `D-xx`,
  plan numbers, or requirement ids).
- **D-21:** The folded todos get **no GitHub issues**. The user-visible ones appear in the
  curated release notes and the landing PR body only. Milestone #7 stays at exactly 21 issues,
  matching criterion 4. The todo files move from `.planning/todos/pending/` to completed.

### Claude's Discretion

- Merge method for the landing PR and therefore which SHA(s) the closing comments cite. The repo
  has been squash-merging; if squashed, comments cite the squash commit + the PR number rather
  than per-fix SHAs.
- Branch name for the landing PR, and whether the folded-todo work continues on the current
  branch or a `gsd/phase-97-…` branch cut from its HEAD (not from `origin/main` — local work
  runs far ahead).
- Exact wording and file name of the runbook, the precondition checklist, and the closing-comment
  review file.
- Plan/wave split. The human checkpoints are not discretionary: crash-detection hand UAT, PR
  merge, preview hand check, release dispatch, release-notes approval, smoke, closing-comment
  approval.
- For the `bbj/bbjcplAvailability` todo: a no-op `@JsonNotification` handler versus surfacing
  BBjCPL availability the way VS Code does — prefer the no-op; surfacing it is a new capability.

### Folded Todos

All six matched todos were folded (first selection was contradictory; confirmed "Fold all six").

1. **A lost language-server connection is invisible to the plugin's crash detection** (major) —
   `.planning/todos/pending/2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`.
   LSP4IJ detaches the language client before publishing `ServerStatus.stopped`, so
   `ExpectedStopGuard.classify`'s CRASH branch never fires. Move the status feed for
   `BbjServerService.updateStatus` to the `LSPClientFeatures` subclass returned by
   `BbjLanguageServerFactory.createClientFeatures()` (`handleServerStatusChanged`), re-check the
   classification against the full status sequence, add a source guard and a coupling canary.
   Verification bar: D-07 / D-08.
2. **The server status log line prints a stale previous status** (minor) —
   `…/2026-09-20-status-transition-log-prints-a-stale-previous-status.md`. Same files as (1);
   plan them together. Log must print the real from-state; classifier input changes only behind
   a pinning test.
3. **The IntelliJ client has no handler for `bbj/bbjcplAvailability`** (minor) —
   `…/2026-09-20-intellij-client-has-no-handler-for-bbjcplavailability.md`. WARN on every server
   start.
4. **Node.js download logs an IllegalStateException for `setFraction` on an indeterminate
   indicator** (trivial) — `…/2026-09-20-node-download-progress-setfraction-on-indeterminate-indicator.md`.
   Call `setIndeterminate(false)` before the first `setFraction` in `BbjNodeDownloader`.
5. **gradle-wrapper-hygiene fixture declares a stale Gradle version** —
   `…/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md`. Already fixed
   2026-09-06; bookkeeping close-out only — verify the test is green, then move the todo.
6. **Update live-interop tests for the getAllClassNames backend** —
   `…/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md`. Environment drift,
   not a product regression; failures are local-only when :5008 is reachable. See
   `.planning/DEBT.md` for the `shouldRunBBjTests()` false-positive context.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Release gate and its history
- `.github/workflows/manual-release.yml` — the five-job gate (`verify` → `publish-vscode` ∥
  `publish-intellij` → `tag-release` → `create-release`); version validator (x.y.0, strictly
  greater); `retention-days: 1` on all three artifacts; the in-file comment on the accepted
  parallel-publish residual. **Not to be modified in this phase (D-09).**
- `.github/workflows/preview.yml` — what a merge to `main` triggers; the D-06 dress rehearsal.
- `.planning/quick/260917-9ei-verify-before-publish-in-the-release-and/260917-9ei-SUMMARY.md` —
  what the gate guarantees and how it was checked; "the first real Manual Release is the true
  test".
- `.planning/seeds/SEED-002-verify-before-publish-and-cache-verifier-ides.md` — why 0.15.0 is
  half-released and why it is deliberately not reconciled.
- `bbj-vscode/test/workflow-secret-hygiene.test.ts`, `bbj-vscode/tools/check-workflow-secrets.mjs`
  — pin the `publishPlugin` argument shape; relevant to any hand-run publish command in the
  runbook (token last, never echoed).

### Scope and success criteria
- `.planning/ROADMAP.md` § "Phase 97: Release 0.16.0 & Milestone Close" — goal, four success
  criteria, the closing note. Criterion 3 is partly overridden by D-14.
- `.planning/REQUIREMENTS.md` — REL-01, REL-02; the Out of Scope table (advisory publication,
  0.15.0 reconciliation); IOP-02's cited-reasoning closure text for #593.
- `.planning/STATE.md` § Decisions — the recorded reasoning for closing #616, #618 (Phase 93),
  #594, #620 (Phase 95), #622 (Phase 96) as done-with-deviation; § Active Constraints;
  § Blockers/Concerns.
- `.planning/MILESTONES.md` — v4.1 post-release checklist (maintainer-owned; context only).

### Smoke test
- `QA/SMOKE-TEST-CHECKLIST.md` — the checklist the maintainer runs (D-15), incl. its "Test Run
  Result" and "Test Information" blocks.
- `QA/TESTING-GUIDE.md` — clean-IDE setup guidance.

### Folded todos
- `.planning/todos/pending/2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`
- `.planning/todos/pending/2026-09-20-status-transition-log-prints-a-stale-previous-status.md`
- `.planning/todos/pending/2026-09-20-intellij-client-has-no-handler-for-bbjcplavailability.md`
- `.planning/todos/pending/2026-09-20-node-download-progress-setfraction-on-indeterminate-indicator.md`
- `.planning/todos/pending/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md`
- `.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md`
- `.planning/debug/resolved/restart-duplicate-node-launches.md` — the Windows session that
  surfaced todos 1-4.
- `.planning/debug/resolved/bbj-language-server-does-not-s.md` — companion diagnosis.
- `.planning/debug/resolved/lsp4ij-upstream-report-draft.md` — report C (withdrawn): LSP4IJ
  documents that `LanguageClientImpl.handleServerStatusChanged` sees only `stopping`/`started`
  and that full status tracking belongs on `LSPClientFeatures`.
- `.planning/DEBT.md` — the `shouldRunBBjTests()` TCP-connect false positive behind todo 6.

### Process constraints
- `.planning/WINDOWS.md` — entry 1 open (left alone, D-05); entries 2-3 fixed.
- `CLAUDE.md` § Shell and File-Access Rules — absolute paths, no `cd`-chained reads, exact-path
  `git add`; put these rules in every subagent prompt.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `manual-release.yml`'s `verify` job uploads `language-server`, `vscode-extension` and
  `intellij-plugin` artifacts — the runbook's recovery paths reuse exactly these via
  `gh run download`, within the 1-day retention window.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` (note:
  `concurrency/`, not `ui/` as the todo's front matter says) and its tests — the classifier the
  crash-detection rework feeds.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`
  (`createClientFeatures()`), `…/lsp/BbjLanguageClient.java`, `…/ui/BbjServerService.java` —
  the three files the status-feed move touches.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:101` — the
  `setFraction` call.
- Phase 83's LSP4IJ fencing: signature canaries, class-file marker assertions and the eleven-file
  symbol-level import allowlist. A new `LSPClientFeatures#handleServerStatusChanged` override is
  new LSP4IJ coupling — the allowlist and canaries must be extended, not bypassed.

### Established Patterns
- No live IntelliJ UI coverage in CI: plain-Java seams under plain JUnit 5, whole-file source
  guards for IDE-only wiring, hand UAT in a running IDE, both distributables built first.
- IntelliJ whole-suite gate runs with `--rerun-tasks` so an UP-TO-DATE `:test` cannot mask a
  stale green. Vitest whole-suite: judge on `numFailedTests: 0`, run with cwd = `bbj-vscode`,
  `RUN_BBJ_TESTS=0` for a deterministic local baseline.
- Landing: branch + PR, register check of the diff, merge one PR at a time and wait for its
  Preview run. `origin` is HTTPS; plain `git push -u origin <branch>` works.
- Outward-facing actions (PR merge, release dispatch, release edit, issue comments/closure) are
  always behind an explicit maintainer go.

### Integration Points
- GitHub: milestone #7 (`gh api repos/BBx-Kitchen/bbj-language-server/milestones/7`), 21 issues,
  the v0.16.0 Release, Actions runs for `preview.yml` and `manual-release.yml`.
- Marketplaces: VS Code `basis-intl.bbj-lang`; JetBrains plugin 30033 (`bbj-language-support`),
  uploads enter a review queue.

</code_context>

<specifics>
## Specific Ideas

- The maintainer wants the release itself to stay a human act: they press the button in the
  Actions UI, they classify smoke findings, they approve every public word (release notes, 21
  closing comments) before it is posted.
- The maintainer chose twice against the "safer/slower" recommendation in favour of momentum:
  keep the publish jobs parallel with a runbook (D-09/D-10) and treat a JetBrains upload as live
  without waiting for review (D-14). Plans should honour that — no re-proposing serialization
  or a review-queue wait.
- The 96-08 re-UAT record (verdict tied to a zip sha256 and a commit) is the model for how the
  smoke verdict is recorded (D-16).

</specifics>

<deferred>
## Deferred Ideas

- Serializing `publish-intellij` before `publish-vscode` in `manual-release.yml` — declined for
  0.16.0; revisit after the first real run shows how the parallel gate behaves.
- Raising `retention-days` on the release artifacts so a half-release can be reconciled later
  than 24 h — a workflow change, out of scope under D-09.
- Confirming the JetBrains Marketplace listing actually shows 0.16.0 once the review clears —
  not a phase gate under D-14; worth a glance by the maintainer afterwards.
- Surfacing BBjCPL availability in the IntelliJ UI the way VS Code does — a new capability; the
  folded todo only needs the log noise gone.
- Windows re-attestation of the crash-detection rework — not required for 0.16.0 (D-07).

None of the reviewed todos were left unfolded.

</deferred>

---

*Phase: 97-Release 0.16.0 & Milestone Close*
*Context gathered: 2026-09-20*
