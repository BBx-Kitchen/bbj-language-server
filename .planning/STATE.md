---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Security Advisory Remediation
current_phase: 74
current_phase_name: Remediate GHSA-9gv3-gr6g-c4rj
status: executing
stopped_at: "Phase 74 plan 03 complete — PR #642 merged to public main, publish/hygiene runs observed green"
last_updated: "2026-08-21T16:50:00.000Z"
last_activity: 2026-08-21
last_activity_desc: Phase 74 plan 03 complete — GHSA-9gv3-gr6g-c4rj fix merged to public main via PR #642, publication pending
state_head: eed1a2cdf632e16975b3c327ebc8d062c671ef0a
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 24
  completed_plans: 22
  percent: 50
---

# Project State: BBj Language Server

**Last Updated:** 2026-08-21 (Phase 74 plan 02)

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-21)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 74 — Remediate GHSA-9gv3-gr6g-c4rj

---

## Current Position

Phase: 74 (Remediate GHSA-9gv3-gr6g-c4rj) — EXECUTING
Plan: 4 of 4
Total Plans in Phase: 4
Plans Complete: 3/4
Status: Plan 03 (landing) complete — fix merged to public `main`; plan 04 (publication readiness) next
74-03 landed the fix on public `main` via PR #642 (merge commit `421b40e086335b3d670ad1d907729b4384be05d9`),
authorised at its `blocking-human` checkpoint (`merge-now`). The merge-triggered
`Publish Preview Extension` and `Workflow Hygiene` runs both observed concluding `success`, with the
new test suite proven executing inside the exact job holding the JetBrains publishing credential.
Last activity: 2026-08-21 — Phase 74 plan 03 complete

**Phase 70 (GHSA-89r9-2pw4-mc7f) — FILED WITH OVERRIDES, not cleanly verified.**
`70-VERIFICATION.md` now reads `status: passed` with `overrides_applied: 2`. The adversarial
findings were NOT re-run and were NOT fixed; they were accepted. What that means concretely:

1. *SC3 / PROC-01 (fork-PR merge) — waived by substitution.* The fork's `main` is still at its
   pre-fix tip `c6eb3b2`; PR #1's base resolved to the public repo and closed unmerged. The fix
   landed via public PR #638 (`528889d`), CI and workflow-hygiene both green. Accepted as
   satisfying SC3 **for this advisory only** — D-12 had already found this advisory's mechanism
   public since 2026-02-17, so the embargo rationale PROC-01 protects did not apply. Does not
   generalize to 72-77.

2. *CI guardrail breadth — accepted as UNMET and deferred.* The instance-level fix is real and
   live on public `main`; what remains unmet is the guardrail's breadth against equivalent-syntax
   variants, which the regression suite does not cover. Filed as `.planning/WINDOWS.md` entry 1
   (`kind: unmet-truth`, phase 70, **open**). With `workflow.windows_enforce` on, this blocks
   `/gsd-ship` until fixed or explicitly waived — the deferral is tracked, not silent.

3. *no-cve stands; severity was never reassessed.* Per the standing v4.1 no-CVE decision (a
   deliberate PROC-03 waiver). GHSA-89r9-2pw4-mc7f remains live at `severity: high`,
   `cve_id: null`, `state: draft`. Phase 71-05 did reassess its advisory (high → medium); Phase 70
   did not, and no advisory mutation was made here, because reassessing severity is a human
   judgment. **Revisit before this advisory is published.**

Two items are routed to human judgment, not verifier adjudication: ratifying the `no-cve` decision
while `severity` is still `high`, and accepting the substituted public-PR landing for PROC-01.

Phase 70 (GHSA-89r9-2pw4-mc7f) established the landing shape: the advisory's private fork cannot
take a same-repo pull request (its PR base resolves to the public repo), so the planned fork-PR
flow was dropped in favor of a normal public PR — see the embargoed
`70-DECISION-fork-flow.md` and `70-04-SUMMARY.md`. Phase 71 reused that same landing shape (D-11)
without re-litigating it.

Phases 72 and 73 were planned AFTER Phase 70 hit the fork-PR wall and already encode the public-PR
landing (72-03 and 73-03, both D-13: "no pull request against the advisory's private fork; a fork
PR resolves its base to the public repository and would merge publicly outside any human gate").
They need no landing re-plan. Phases 74-77 are still unplanned — carry D-13 into them when planned.

Note: Phase 70 and 71 planning artifacts are held off public `main` (REQUIREMENTS.md PROC-01);
`.git/info/exclude` covers `.planning/phases/70-*/` and the `pre-push` hook covers `phases/7[0-7]`.
Phase 71's `71-UAT.md` and `71-VERIFICATION.md` are therefore untracked by design — their absence
from git is correct, not a lost artifact.

Progress: [███████████░░░░░░░░░] 11/20 plans ([█████░░░░░] 50%) — 2/8 phases closed (70 w/ overrides, 71 clean)

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 17
**Phases completed:** 69
**Plans completed:** 205
**Days elapsed:** 21
**Velocity:** ~6.8 plans/day

### Recent History

**v4.0 (Shipped: 2026-08-20):**

- Duration: 181 days
- Phases: 10 (60-69)
- Plans: 62
- Key: Review-and-hardening pass across the repo; cross-cutting security audit surfaced 9 advisories, 1 fixed in-phase (GHSA-p5f3-9456-9pcx, PR #637), 8 carried into v4.1

**v3.9 (Shipped: 2026-02-21):**

- Duration: 1 day
- Phases: 3 (57-59)
- Plans: 8
- Key: Bug fixes, grammar additions (EXIT/SERIAL/ADDR), Java class reference features (.class, static methods, deprecated, constructors)

**v3.8 (Shipped: 2026-02-20):**

- Duration: 1 day
- Phases: 3 (54-56)
- Plans: 7
- Key: Fixed all test failures, re-enabled disabled assertions, removed dead code, resolved all production FIXMEs

---
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 72 P01 | 55min | 2 tasks | 6 files |
| Phase 72 P02 | 50min | 2 tasks | 2 files |
| Phase 72 P03 | 45min | 1 tasks | 1 files |
| Phase 72-remediate-ghsa-c4hw-5j83-cx5h P04 | 15min | 1 tasks | 1 files |
| Phase 72 P05 | 20 min | 3 tasks | 2 files |
| Phase 73 P01 | 18min | 3 tasks | 6 files |
| Phase 73 P02 | 25min | 2 tasks | 3 files |
| Phase 73 P03 | 25min | 3 tasks | 1 files |
| Phase 74 P01 | 55min | 3 tasks | 8 files |
| Phase 74 P02 | 35min | 3 tasks | 4 files |
| Phase 74 P03 | 20min | 1 tasks | 1 files |

## Accumulated Context

### Active Constraints

- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only (see REQUIREMENTS.md disclosure notice)
- Per-phase implementation detail (findings, fix design, tests) lives inside each advisory's private fork, not under `.planning/phases/` on `main`
- Remediation RESEARCH is likewise untracked (`.git/info/exclude`): `SECRETS-AND-EXEC.md` and `SUPPLY-CHAIN.md` exist on disk only. Naming a file plus the control to add to it discloses that the control is absent — "best-practice framing" does not sanitise that. Copy the relevant sections into each private fork when its phase starts.
- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key recent decisions:

- [Phase 71 UAT]: Whole-suite regression gate accepted as project-wide `numFailedTests: 0` plus
  deterministic targeted-file runs, in place of a failing-suite identity delta — standing for
  phases 72-77, do not re-ask (whole-suite failure *count* is unstable here; DEBT.md item 5)

- [Phase 71 UAT]: GHSA-5f22-gqrx-xr22 residual-risk wording accepted as written rather than
  patched — the overstated claim concerns behaviour that fails closed and is not attacker-reachable

- [v4.1 roadmap]: One phase per advisory, 1:1, fixed order (Phase 70-77 = SEC-01..SEC-08) — mapping fixed by REQUIREMENTS.md traceability, not re-derived
- [v4.1 roadmap]: PROC-01/02/03 (private fork per advisory, non-vacuous regression test, publish-after-release) mapped across the full Phase 70-77 range rather than to a single phase
- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion filtering
- [Phase 72]: 72-01: JUnit dependency insertions kept as pure additions inside the existing dependencies{} block (per design_decisions 9) rather than packed onto existing lines to hold a fixed line number for the publishing-token binding; content verified byte-identical instead
- [Phase 72]: 72-02: NodeExecutableResolver's Resolution.resolved() discards prior-branch rejections on any successful resolution; fixing needs a src/main change this plan is prohibited from making, so the fall-through test was scoped to assert only true behavior and the gap is recorded in 72-RESIDUAL-RISK.md for a follow-up decision
- [Phase 72]: Landed GHSA-c4hw-5j83-cx5h fix on public origin via PR #640 (fix/node-executable-validation), authorised at a blocking-human checkpoint (land-now); not merged, merge is 72-04's gated decision
- [Phase 72]: Scoped the fork-tip-to-public-tip content-equality check to bbj-intellij (not the unrestricted repo diff) because the fork base and origin/main diverged by ~34 unrelated commits; no rebase or history rewrite was used
- [Phase 73]: 73-01: kept distributionUrl at Gradle 8.13, regenerated the wrapper JAR to match, rather than downgrading the URL to fit the old JAR
- [Phase 73]: 73-01: private advisory fork's main predates several files/edits already on public main; synced them verbatim in prerequisite commits before the intended fix (kept out of the eventual cherry-pick set)
- [Phase 73]: 73-02: private advisory fork's main was also missing bbj-vscode/test/workflow-secret-hygiene.test.ts and .github/workflows/workflow-hygiene.yml entirely (beyond the three files 73-01 already found); synced verbatim from public main in a third prerequisite commit before writing the regression suite and CI job
- [Phase 73]: 73-02: added the wrapper-hygiene job as a second job (not a second step) on workflow-hygiene.yml, keeping the pre-existing secret-hygiene job's id, name, and steps byte-identical to main
- [Phase 73]: 73-03: human answered the Task 2 `checkpoint:decision` `merge-now`; PR #641 merged with a merge commit, no rebase needed (origin/main unchanged since the branch was cut)
- [Phase 73]: 73-04: GHSA-5vrp-fj75-pm5q — fix merged; publication awaits a release
- [Phase 74]: 74-01: fork remote ghsa-9gv3 added over HTTPS; subtree diff re-derived live (7 paths, matched plan exactly); fork synced verbatim to a green 31-test baseline in a separable prerequisite commit (cc7ea61, excluded from the eventual cherry-pick set)
- [Phase 74]: 74-01: the hardening change and its regression coverage landed on `ghsa-9gv3-gr6g-c4rj/verify-node-archive` in the advisory's private fork; the regression check was observed failing before the change and passing after it (PROC-02), and the module suite is green at 49 tests. Nothing pushed to `origin`. Technical detail stays in the fork and the embargoed phase directory.
- [Phase 74]: 74-02: a further hardening change and its offline regression coverage landed on the same fork branch, and the existing release build config was confirmed (by reading it) to already gate on the module test suite. The whole-suite gate is green at 61 tests. Nothing pushed to `origin`. Technical detail stays in the fork and the embargoed phase directory.
- [Phase 74]: 74-03: human answered the Task 2 `checkpoint:decision` `merge-now`; PR #642 merged with a merge commit (`421b40e086335b3d670ad1d907729b4384be05d9`), no rebase needed (origin/main unchanged since the branch was cut). Merge-triggered `Publish Preview Extension` (version bumped to `0.12.18`) and `Workflow Hygiene` runs both observed concluding `success`; the new test suite ran inside the exact job holding the JetBrains publishing credential.
- [Phase 74]: 74-04: GHSA-9gv3-gr6g-c4rj — fix merged; publication awaits a release
- [Phase 77]: 77-07: GHSA-h43f-jcjr-2g4j — fix merged; publication awaits a release

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Blockers/Concerns

- **8 draft advisories unfixed** (all high) — the entire v4.1 milestone scope, now mapped
  1:1 to Phases 70-77. Private forks exist for all 8. GHSA-p5f3-9456-9pcx is fixed (PR #637)
  but stays an unpublished draft until the release ships (out of scope for v4.1, tracked in
  MILESTONES.md). GHSA-89r9-2pw4-mc7f is fixed, merged to `main`; publication awaits a release.
  GHSA-5f22-gqrx-xr22 is fixed, merged to `main`, and its phase (71) is verified and
  complete; publication awaits a release. GHSA-c4hw-5j83-cx5h is fixed, merged to `main`;
  publication awaits a release. GHSA-5vrp-fj75-pm5q is fixed, merged to `main` via PR #641
  (merge commit `7c10be13f684be8ff42701d84c3175507e4dfa53`); the merge-triggered publish and
  hygiene runs both observed green; publication awaits a release (D-17). GHSA-9gv3-gr6g-c4rj is
  fixed, merged to `main` via PR #642 (merge commit `421b40e086335b3d670ad1d907729b4384be05d9`);
  the merge-triggered publish and hygiene runs both observed green; publication awaits a release
  (D-21). GHSA-h43f-jcjr-2g4j is fixed, merged to `main`; publication awaits a
  release.

- ~~Manual QA outstanding on the merged GHSA-p5f3-9456-9pcx fix.~~ **Cleared 2026-08-20** —
  Run / Run BUI / Run DWC manually QA'd by the maintainer, closing the live-launch gap the
  automated verification left open (only the `bbjcpl` compile path had been exercised live).
  That advisory now waits only on the release before it can be published.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates
  on a bare TCP connect to :5008. BBjServices squats on that port without speaking the
  interop protocol, so 11 `linking.test.ts` interop tests switch on and fail. Green with
  `RUN_BBJ_TESTS=0`. Pre-existing; reproduced identically at `291cd23`. Tracked in
  `.planning/DEBT.md`, not v4.1 scope.

- **Phase 70 has no verification report.** Its 5 plans all have summaries and its fix is merged,
  but `70-VERIFICATION.md` was never produced, so the phase is still open and no UAT ever ran on
  it. `/gsd-execute-phase 70` resumes at the verification gate.

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260329-oqw | PR #383: Return undefined instead of empty list from getFieldCompletion to allow other providers to continue | 2026-03-29 | ab42eef | | [260329-oqw-pr-383-return-undefined-instead-of-empty](./quick/260329-oqw-pr-383-return-undefined-instead-of-empty/) |
| 260820-hxg | GHSA-p5f3-9456-9pcx (critical, CWE-78): replace shell-string `child_process.exec()` construction with `execFile` argument arrays across all 7 command constructions; adds metacharacter regression tests + reintroduction guard | 2026-08-20 | f289fc5 | Verified | [260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape](./quick/260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape/) |

---

## Session Continuity

Last session: 2026-08-21T16:50:00.000Z
Stopped at: Phase 74 plan 03 complete — PR #642 merged to public main, publish/hygiene runs observed green
GHSA-9gv3-gr6g-c4rj fix merged to public main via PR #642 (merge commit
`421b40e086335b3d670ad1d907729b4384be05d9`); publication awaits a release.
Next: Phase 74 plan 04 (publication readiness — release gate and CVE decision), and
`/gsd-execute-phase 70` to close phase 70's open verify gate.
Resume file: .planning/phases/74-remediate-ghsa-9gv3-gr6g-c4rj/74-04-PLAN.md

---

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |
| v2.0 Langium 4 Upgrade | 14-20 | 11 | 2026-02-04 |
| v2.1 Feature Gap Analysis | N/A | N/A | 2026-02-04 |
| v2.2 IntelliJ Build & Release Automation | 21-23 | 3 | 2026-02-05 |
| v3.0 Improving BBj Language Support | 24-27 | 11 | 2026-02-06 |
| v3.1 PRIO 1+2 Issue Burndown | 28-31 | 13 | 2026-02-07 |
| v3.2 Bug Fix Release | 32-34 | 10 | 2026-02-08 |
| v3.3 Output & Diagnostic Cleanup | 35-39 | 6 | 2026-02-08 |
| v3.4 0.8.0 Issue Closure | 40-43 | 4 | 2026-02-08 |
| v3.5 Documentation for 0.8.0 Release | 44-47 | 7 | 2026-02-09 |
| v3.6 IntelliJ Platform API Compatibility | 48-49 | 2 | 2026-02-10 |
| v3.7 Diagnostic Quality & BBjCPL Integration | 50-53 | 7 | 2026-02-20 |
| v3.8 Test & Debt Cleanup | 54-56 | 7 | 2026-02-20 |
| v3.9 Quick Wins | 57-59 | 8 | 2026-02-21 |
| v4.0 Stability and Quality | 60-69 | 62 | 2026-08-20 |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-08-21 after Phase 71 (GHSA-5f22-gqrx-xr22) verification and transition*
