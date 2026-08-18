---
phase: 64-build-ci-dependency-review
plan: 02
subsystem: review
tags: [build-ci, github-actions, sec-07, workflow-security, secret-handling, action-pinning, dependabot, inventory-drift]

requires:
  - phase: 60-review-inventory
    provides: INVENTORY.md's RU-64-01 unit definition, applicability grid row, R-D5-CI/R-D7-CI exclusion texts, the 13-field finding template, the finding-ID scheme, the easy-vs-major tests and the frozen 15-issue snapshot
  - phase: 64-build-ci-dependency-review
    provides: "plan 64-01's 64-COVERAGE.md skeleton — header, 8-row grid, both gates, the four verbatim n/a carry-forwards, the inherited-item ledger, the stubbed RU-64-01 section, and its open cross-unit referral asking RU-64-01 whether dependency automation could ever see the three vendored JARs"
provides:
  - RU-64-01 (GitHub Actions workflows, 6 files / 568 lines plus .github/dependabot.yml / 19 lines adopted by D-19) fully swept across all 6 live dimensions — D1, D2, D3, D6 at tier repro/repro-equivalent and D4, D8 at tier trace — and closed against the four-part stopping rule
  - "### SEC-07 Workflow Security Posture — the criterion-2 deliverable: 6 workflow rows x 4 clause columns, all 24 cells filled and substantive, with the empty-secret behaviour, the effective permission scope, the definition-ref-versus-checkout-ref ordering and the concurrency/cancellation consequence all stated rather than left to inference"
  - The full enumeration of all 36 `uses:` references classified by pinning kind — 0 SHA-pinned, 36 mutable tags, 0 floating — so Phase 67 has a fix-now set and Phase 68 a major set that nobody has to re-derive
  - The absence of `pull_request_target` recorded as an explicit positive result with its search command and empty output, so checked-and-clean is distinguishable from not-checked
  - P64-D6-005 — .github/dependabot.yml covers 1 of this repository's 4 dependency trees; its Gradle half is the SEC-08 input 64-03 composes with D-10's un-enumerable Gradle tree
  - P64-D8-002 — INVENTORY's `.github/` accounting drift recorded as a finding located in INVENTORY.md:932, with D-19's and D-20's adoption arithmetic kept separate
  - The answer to 64-01's open referral — no ecosystem declared in .github/dependabot.yml can see the three vendored tools/formatter JARs
affects: [64-build-ci-dependency-review, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes-major-refactors, 68-deliverable-documents, 69-issue-filing]

actuals:
  tokens: 98000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "### SEC-07 Workflow Security Posture — a criterion-rendered grid rather than a narrative: rows are the artifacts the criterion names, columns are the criterion's own clauses in its own order, and every cell is filled including the negative ones, so a reader verifies the criterion instead of trusting the phase's assertion (D-13)"
    - "D-16's two-tier disclosure rendered under structural enforcement rather than a checkpoint — the marker phrase `Disclosure-limited per D-16` opens the one redacted evidence field, and an acceptance criterion asserts the critical/high count equals the marker count inside the section"
    - "A stated reading of INVENTORY 3c test (4) for workflow files — the existing harness for a workflow IS the workflow run — applied identically to all 13 records and written once at the head of the Findings block, so easy-vs-major does not vary silently between records"
    - "D-12's sink-without-a-reachable-trigger rule exercised in both directions: manual-release.yml:127,133 is a real injection sink recorded as a pass-with-note because an anchored regex in a required upstream job gates it, and pr-vsix.yml:57-62's output-injection sink is noted because its only fork-reachable consumer reaches nothing a fork does not already own"

key-files:
  created: []
  modified:
    - .planning/reviews/64-COVERAGE.md

key-decisions:
  - "Every ground-truth fact the plan supplied was re-derived rather than trusted, and all of them held: 36 `uses:` references (build 3, deploy-docs 5, pr-vsix 4, manual-release 11, pr-validation 6, preview 7), no pull_request_target, top-level permissions in deploy-docs.yml and pr-vsix.yml only, and dependabot.yml at 19 lines / 881 bytes / commit be402d6"
  - "One nuance the plan's ground truth did not carry, found by re-deriving: manual-release.yml:149 declares a JOB-level permissions block on create-release, so the file is 'no top-level block' rather than 'no block' — recorded in the SEC-07 table and inside P64-D1-005 rather than flattened into the four-of-six count"
  - "P64-D1-005's tree-verifiable half (7 of 10 jobs state no scope anywhere) recorded as the finding; its inferential half (the repository default must therefore be the permissive setting, because preview.yml:60 pushes with the checkout-persisted credential) flagged as an inference inside the record AND written as a Not-reproducible disposition, rather than asserted as observed"
  - "Exactly one finding rated `high` (P64-D1-004, the JetBrains token interpolated into a run: command line), matching 64-01's `high` rating for the structurally identical em-login.bbj ARGV exposure; severity consistency within the phase was chosen over rating this unit up because it is the security unit"
  - "Both dependabot ignore: entries verified mechanically before being recorded as well-reasoned — langium@4.3.1 depends on chevrotain ~12.0.0 (package-lock.json:4619-4626), matching package.json:671 exactly, and typescript-eslint's peer range is the literal `>=4.8.4 <6.1.0` at package-lock.json:1826,1857,1881,1941, exactly the range the comment cites"
  - "P64-D2-004 found by checking a path filter against the tree rather than reading it: bbj-vscode/.gitignore:1 ignores /out/ and git ls-files bbj-vscode/out returns 0, so pr-validation.yml:10's glob can never match and the cross-IDE build gate does not run on language-server source changes — the unit's one `easy` D2 finding"
  - "Two findings classified `easy` and dispositioned easy-fix (P64-D2-004 and P64-D4-004) plus one `fix-now` D6 triage (P64-D6-004), which required stating the test-(4) reading explicitly; without it every workflow finding would have been major by default and Phase 67 would have inherited nothing"
  - "The 36-reference SHA-pinning question kept separate from build.yml's stale @v3 pair — P64-D6-003 (file-issue, major, 6 files) and P64-D6-004 (fix-now, easy, 1 file) — because collapsing them would have routed the applicable one-file fix onto MAJOR-REFACTORS.md with the six-file one"
  - "Three not-reproducible dispositions recorded rather than dropped or asserted: the repository's default workflow-permission setting, whether the runner's $GITHUB_OUTPUT parser accepts a bare multi-line value, and whether manual-release.yml:72's GITHUB_TOKEN binding is vestigial"
  - "64-01's open cross-unit referral answered here rather than left hanging: no ecosystem declared in .github/dependabot.yml can see the three tools/formatter JARs, which is a stronger statement than 'no advisory reported'; recorded in this unit because RU-64-03 is closed and its section is not edited"
  - "Roughly a dozen observations deliberately not inflated into findings, each with the judgement written into its dimension's check line — including the build-intellij job ids that publish, build.yml's missing retention-days, the unpinned `npm install -g semver`, the four workflows without timeout-minutes, and manual-release.yml:47's imprecise regex comment"

requirements-completed: []  # RVW-05 and SEC-07 are phase-wide; SEC-07's substance is fully discharged by this plan but the ticks belong to 64-03's close-out, per 64-01's precedent

metrics:
  duration: ~45min
  completed: 2026-08-18
  status: complete
---

# Phase 64 Plan 02: RU-64-01 GitHub Actions Workflows Summary

The entire SEC-07 surface swept and closed: 6 workflows plus `.github/dependabot.yml` across 6 live
dimensions, 13 findings, and the criterion-2 posture table with all 24 cells filled — one `high`
record redacted under D-16, and INVENTORY's `.github/` drift recorded rather than corrected.

## What Was Built

`.planning/reviews/64-COVERAGE.md` section `## RU-64-01 — GitHub Actions workflows`, appended into
the frozen skeleton plan `64-01` wrote. Nothing else in that file was touched, and no source file
anywhere in the repository was modified.

**Cells recorded (6 live, 2 `n/a` carried forward untouched):**

| Dimension | Tier | Verdict | Findings |
|---|---|---|---|
| D1 Security | `repro` (by trace, D-12) | `fail` | `P64-D1-004`, `P64-D1-005` |
| D2 Correctness & error handling | `repro` (by trace) | `fail` | `P64-D2-004`, `P64-D2-005`, `P64-D2-006` |
| D3 Performance & resource use | `repro` (by trace) | `fail` | `P64-D3-001`, `P64-D3-002` |
| D4 Maintainability & code smells | `trace` | `fail` | `P64-D4-003`, `P64-D4-004` |
| D5 Test coverage gaps | — | `n/a — R-D5-CI` | none, by construction (D-15) |
| D6 Dependency health | `inherited` → repro-equivalent | `fail` | `P64-D6-003`, `P64-D6-004`, `P64-D6-005` |
| D7 Cross-IDE parity | — | `n/a — R-D7-CI` | none; no `P64-D7-*` ID exists (D-14) |
| D8 Comment & doc accuracy | `trace` | `fail` | `P64-D8-002` |

**`### SEC-07 Workflow Security Posture`** — ROADMAP criterion 2 rendered as a 6-row × 4-column
grid, one row per workflow, one column per clause, **24 of 24 cells filled** and none shorter than
229 characters. Beneath it: the note explaining why `.github/dependabot.yml` has no row, the
positive `pull_request_target` result with its search, the concurrency/cancellation analysis, the
blast-radius statement for all three named secrets, and a what-was-read-versus-what-was-asserted
disclaimer.

**Findings, 13 records** — all `unit: RU-64-01`, sequences continued rather than restarted:

| ID | Dimension | What | Severity | Class | Effort |
|---|---|---|---|---|---|
| `P64-D1-004` | D1 | `JETBRAINS_MARKETPLACE_TOKEN` interpolated into a `run:` command line (`preview.yml:102`, `manual-release.yml:137`) while `VSCE_PAT` two steps away uses `env:` | high | major | 2 |
| `P64-D1-005` | D1 | 7 of 10 jobs declare no `permissions:`; `preview.yml:60`'s push proves the default must include `contents: write` | medium | major | 4 |
| `P64-D2-004` | D2 | `pr-validation.yml:10` gates on a gitignored path that can never match, and omits `src/language/**` — the cross-IDE build gate never runs on LS source changes | medium | **easy** | 2 |
| `P64-D2-005` | D2 | Both release workflows tag and push before publishing, across 2-3 jobs, with no rollback | medium | major | 8 |
| `P64-D2-006` | D2 | `preview.yml` has no `concurrency:` and recomputes the version from its own checkout | low | major | 2 |
| `P64-D3-001` | D3 | 5 of 6 workflows run `npm ci` (which triggers `prepare` → langium generate + build) with no cache; 3 `setup-java` steps with no Gradle cache | medium | major | 2 |
| `P64-D3-002` | D3 | `build.yml` has no `paths:` filter and no `concurrency:`, duplicating `pr-vsix.yml` for every `bbj-vscode/**` PR | medium | major | 4 |
| `P64-D4-003` | D4 | The build preamble is duplicated across 5 workflows and has drifted on 6 measured axes; no composite action exists | medium | major | 8 |
| `P64-D4-004` | D4 | `build.yml:4-6` triggers on `typefox-dev`, a branch in 0 of 20 remote branches | low | **easy** | 2 |
| `P64-D6-003` | D6 | All 36 `uses:` on mutable tags, 0 SHA-pinned; 5 of them in jobs holding marketplace credentials — `triage: file-issue` | medium | major | 4 |
| `P64-D6-004` | D6 | `build.yml:18,20` still on `@v3` while 5 other files moved to `@v4` — `triage: fix-now` | low | **easy** | 2 |
| `P64-D6-005` | D6 | `dependabot.yml` covers 1 of 4 dependency trees (no gradle, no `documentation/`, no `github-actions`) — `triage: file-issue` | medium | major | 4 |
| `P64-D8-002` | D8 | INVENTORY:932 claims no content under `.github/` besides `workflows/`; `dependabot.yml` sits beside it — `disposition: wontfix` (INVENTORY is immutable) | low | major | 2 |

Plus **3 not-reproducible dispositions** and **4 cross-unit referrals**, both sub-blocks non-empty.

## Notable Results Worth Flagging

1. **`pr-validation.yml`'s cross-IDE gate does not run on the change class most likely to break it.**
   `bbj-vscode/.gitignore:1` ignores `/out/` and `git ls-files bbj-vscode/out` returns 0 tracked
   files, so the glob `bbj-vscode/out/language/**` can never appear in a PR diff — while
   `bbj-vscode/src/language/**` (53 tracked files) is absent from the filter. A language-server
   change merges with no IntelliJ check at all: not a failing check, an absent one. This is the
   unit's one `easy` D2 finding and a one-glob fix.
2. **Zero of 36 action references are SHA-pinned**, and the reason nothing has noticed is in the
   same directory: `.github/dependabot.yml` declares no `github-actions` ecosystem. That same
   omission is why `build.yml` alone is still on `@v3`. The config gap and the pinning posture are
   one causal chain, recorded as two findings that cite each other.
3. **`.github/dependabot.yml` covers one of four dependency trees.** No `gradle` entry, no
   `documentation/` entry (a 685 KB lockfile that `deploy-docs.yml` builds on every docs change),
   no `github-actions` entry. Corroborated by the observable output: five open
   `dependabot/npm_and_yarn/bbj-vscode/*` remote branches and none for anything else — which is
   exactly why the gap is invisible, since working automation for one tree reads as working
   automation.
4. **The two `ignore:` entries are correct, and were verified rather than taken on trust.**
   `langium@4.3.1` depends on `chevrotain ~12.0.0` and `package.json` declares `~12.0.0`;
   typescript-eslint's peer range is the literal `>=4.8.4 <6.1.0` in the lockfile, exactly what the
   comment cites. They are recorded as the model of `triage: accepted-with-reason`, not as defects.
5. **`pull_request_target` is absent**, recorded with the search and its empty output. The single
   highest-severity Actions pattern is not present here, and a document listing only defects would
   have left that indistinguishable from a dimension nobody checked.

## Deviations from Plan

### Documentation discrepancies in the plan text, proceeded rather than halted

**1. [Rule 3 - Blocking] Task 1's `<precondition>` states the placeholder count is "exactly 14"**
- **Found during:** Task 1 precondition check
- **Issue:** The skeleton carries **16** placeholders, not 14. The precondition's other clause
  (phase-wide verdict count exactly 13) matched exactly, and the plan's own mechanically-checked
  acceptance criteria assert 12 placeholders after Task 1 and 10 after Task 2 — both consistent with
  16, not with 14, and both passed.
- **Fix:** Treated the acceptance criteria and `<verify>` blocks as authoritative over the prose
  precondition, since only the former are mechanically checked and the two disagree with each other.
  Proceeded. No file was edited to reconcile them — plans are not rewritten during execution.
- **Files modified:** none
- **Commit:** n/a

**2. [Rule 3 - Blocking] The plan's `<verification>` block states the phase-wide file-exception
count is "still 32"**
- **Issue:** It is **40** (5 file-exception rows × 8 dimensions), which is what the acceptance
  criteria of both tasks assert and what the file contains. Same class of slip as (1).
- **Fix:** Acceptance criteria treated as authoritative; both tasks' checks passed at 40.
- **Files modified:** none
- **Commit:** n/a

### Substantive refinements to the plan's stated ground truth

**3. [Rule 2 - Missing precision] `manual-release.yml` declares a job-level `permissions:` block**
- **Found during:** Task 1, D1 sweep
- **Issue:** The plan and CONTEXT D-12 state that only `deploy-docs.yml` and `pr-vsix.yml` declare a
  `permissions:` block. That is true of **top-level** blocks; `manual-release.yml:149-150` declares
  a job-level `permissions: contents: write` on `create-release`. Recording "four of six declare
  none" without that nuance would have mis-described the one job in the repository whose token is
  correctly scoped.
- **Fix:** `P64-D1-005` counts **jobs** (7 of 10 undeclared) as well as files, and the SEC-07 table's
  permission-scope column states the job-level declaration explicitly.
- **Commit:** `17bbd8f`

**4. [Rule 2 - Missing precision] Distinct-action count required care around trailing whitespace**
- **Issue:** `build.yml:41` carries a trailing space, so a naive `sort | uniq -c` over the `uses:`
  values reports `actions/upload-artifact@v4` and `actions/upload-artifact@v4 ` as two actions.
- **Fix:** Reconciled by hand and stated as 9 distinct actions in 11 distinct `action@ref` pairs
  summing to 36; the trailing whitespace is separately noted as a D4 observation.
- **Commit:** `17bbd8f`

**5. Interpretation recorded, not deviated from: INVENTORY 3c test (4) for workflow files.** The
test asks whether a fix is regression-testable "with the existing harness — vitest for TypeScript,
Gradle for the IntelliJ plugin". Neither runs a workflow. Read literally, every finding in this unit
would be `major` and Phase 67 would inherit nothing from the SEC-07 surface. The reading applied is
that for a workflow file the existing harness *is* the workflow run, which is exercised by the very
pull request that changes it; test (4) therefore passes for changes a single run demonstrates and
fails for changes only a race or a scheduled service would show. This reading is written once at the
head of the `### Findings` block and each of the 13 records states which side it falls on, so it is
visible and reversible rather than silently varying between records. **This differs in outcome from plan `64-01`**, which
recorded all 12 of its `RU-64-03` findings as `major` partly on test (4): the distinction is real
rather than a drift in standards — nothing in this repository runs a `.bbj` tool script, so
`RU-64-03` genuinely has no harness, whereas a workflow file is executed by CI on the pull request
that changes it. A reader comparing the two units sees two different verdicts because the two
surfaces have different harnesses, and both sections say so.

**6. Requirements not marked complete.** `requirements-completed: []`, following plan `64-01`'s
precedent: RVW-05, SEC-07 and SEC-08 are phase-wide and the ticks belong to `64-03`'s close-out.
SEC-07's *substance* is fully discharged by this plan — all four criterion-2 clauses are documented
for all six workflows with no blank cell — and nothing on SEC-07 flows to Phase 65 as open work.

**No auto-fixes to source code were made, and none was in scope:** this phase records and Phase 67
applies. `git status --porcelain` over `bbj-vscode`, `bbj-intellij`, `java-interop`, `.github` and
the four `.planning/reviews/` records was empty before and after both tasks.

## Authentication Gates

None. No credential, network service or interactive step was required; every enumeration is a local
`git`, `grep`, `ls` or `wc` invocation.

## Verification

Both tasks' `<automated>` blocks were run verbatim and passed:

- Task 1 → `P64_02_RU01_REPRO_OK`
- Task 2 → `P64_02_RU01_COMPLETE`

Additional checks run beyond the plan's:

- All 25 `effort:` values phase-wide are on INVENTORY §3d's `{2,4,8}` scale (12×`2`, 6×`4`, 7×`8`) —
  Phase 63 shipped three off-scale values and needed a post-hoc correction; this phase has none.
- The SEC-07 table parses as 6 rows × 5 columns with all 24 non-header cells non-empty and each ≥229
  characters.
- Code-fence balance across the file is even (58 fences / 29 blocks); the section-heading structure
  after `## RU-64-01` is unchanged in shape from the skeleton.
- Phase-wide: 19 verdicts + 10 placeholders + 35 `n/a` = 64 cells across 8 rows, matching the
  `8 29 35 64` gate with 10 live cells still owed by `64-03`.

## Commits

| Commit | Task | What |
|---|---|---|
| `17bbd8f` | 1 | D1, D2, D3, D6 cells; `### SEC-07 Workflow Security Posture`; 10 findings |
| `033fe22` | 2 | D4, D8 cells; 3 findings incl. the INVENTORY drift; the three closing sub-blocks |

## What `64-03` Inherits

- **10 placeholders remain**, all in `## RU-64-02` — 7 unit-row cells plus `package-lock.json`/D6,
  `gradle-wrapper.jar`/D1 and `gradle-wrapper.jar`/D6. Verdicts stand at 19; the gate is unchanged.
- **The SEC-08 input it must compose:** `P64-D6-005`'s Gradle half — `bbj-intellij`'s tree has no
  automated update coverage at all — pairs with D-10's finding that the same tree cannot be
  enumerated locally. Referral 1 in `### Cross-unit referrals` states exactly what is handed over and
  what is deliberately not pre-empted.
- **A second referral it owns:** `bbj-vscode/package.json:654`'s `vscode:prepublish` makes
  `npm run lint` a hard gate on every `vsce package` in the repository, including the two that
  immediately precede a marketplace publish, though no workflow runs lint explicitly. The file is
  `RU-64-02`'s for every dimension, so no finding was allocated here.
- **The close-out arithmetic it must re-derive:** `P64-D8-002` states the D-19 and D-20 adoptions
  separately — one file and no cell versus one file and one row — so the file gate reads 29 and the
  cell gate `29/35/64`. Phase 68's DOC-03 reconciles 29 against INVENTORY's 27, and this record plus
  D-08's is what makes that reconcilable.
- **Nothing on SEC-07 is left open.** Criterion 2 is answered in full; `64-03`'s close-out section F
  can cite `### SEC-07 Workflow Security Posture` rather than re-deriving it.

## Self-Check: PASSED

- `.planning/reviews/64-COVERAGE.md` — FOUND (1,879 lines; `## RU-64-01` section 124,511 bytes)
- `.planning/phases/64-build-ci-dependency-review/64-02-SUMMARY.md` — FOUND
- Commit `17bbd8f` — FOUND
- Commit `033fe22` — FOUND
- No source file modified: `git status --porcelain bbj-vscode bbj-intellij java-interop .github` — empty
- No immutable record touched: `git status --porcelain .planning/reviews/INVENTORY.md .planning/reviews/61-COVERAGE.md .planning/reviews/62-COVERAGE.md .planning/reviews/63-COVERAGE.md` — empty
