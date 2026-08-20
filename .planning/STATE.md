---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Security Advisory Remediation
current_phase: 70
current_phase_name: Remediate GHSA-89r9-2pw4-mc7f
status: ready_to_execute
stopped_at: Phase 70 planned (5 plans, verification passed); execution not started
last_updated: "2026-08-20T15:35:50.409Z"
last_activity: 2026-08-20
last_activity_desc: Phase 70 planned — 5 plans across 5 waves, plan-checker passed
state_head: 34fdac0bdfc288861f51b16c1460c4db0a8da130
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 0
---

# Project State: BBj Language Server

**Last Updated:** 2026-08-20

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-20)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v4.1 Security Advisory Remediation — Phase 70 (GHSA-89r9-2pw4-mc7f), first of 8 advisory phases

---

## Current Position

Phase: 70 of 77 (Remediate GHSA-89r9-2pw4-mc7f)
Plan: 70-01-PLAN.md (wave 1 of 5) — not started
Total Plans in Phase: 5
Plans Complete: 0
Status: Ready to execute
Last activity: 2026-08-20 — Phase 70 planned: 5 plans in 5 waves, plan-checker VERIFICATION PASSED, 4/4 requirements and 12/12 context decisions covered

Note: Phase 70 planning artifacts are held off public `main` (see REQUIREMENTS.md PROC-01);
`.git/info/exclude` covers `.planning/phases/70-*/` and the `pre-push` hook covers `phases/7[0-7]`.
Waves 4 and 5 are `autonomous: false` — they touch public history and external state.

Progress: [░░░░░░░░░░] 0%

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

- [v4.1 roadmap]: One phase per advisory, 1:1, fixed order (Phase 70-77 = SEC-01..SEC-08) — mapping fixed by REQUIREMENTS.md traceability, not re-derived
- [v4.1 roadmap]: PROC-01/02/03 (private fork per advisory, non-vacuous regression test, publish-after-release) mapped across the full Phase 70-77 range rather than to a single phase
- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion filtering

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
  MILESTONES.md).

- ~~Manual QA outstanding on the merged GHSA-p5f3-9456-9pcx fix.~~ **Cleared 2026-08-20** —
  Run / Run BUI / Run DWC manually QA'd by the maintainer, closing the live-launch gap the
  automated verification left open (only the `bbjcpl` compile path had been exercised live).
  That advisory now waits only on the release before it can be published.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates
  on a bare TCP connect to :5008. BBjServices squats on that port without speaking the
  interop protocol, so 11 `linking.test.ts` interop tests switch on and fail. Green with
  `RUN_BBJ_TESTS=0`. Pre-existing; reproduced identically at `291cd23`. Tracked in
  `.planning/DEBT.md`, not v4.1 scope.

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260329-oqw | PR #383: Return undefined instead of empty list from getFieldCompletion to allow other providers to continue | 2026-03-29 | ab42eef | | [260329-oqw-pr-383-return-undefined-instead-of-empty](./quick/260329-oqw-pr-383-return-undefined-instead-of-empty/) |
| 260820-hxg | GHSA-p5f3-9456-9pcx (critical, CWE-78): replace shell-string `child_process.exec()` construction with `execFile` argument arrays across all 7 command constructions; adds metacharacter regression tests + reintroduction guard | 2026-08-20 | f289fc5 | Verified | [260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape](./quick/260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape/) |

---

## Session Continuity

Last session: 2026-08-20
Stopped at: v4.1 ROADMAP.md created (Phases 70-77, one per advisory, 11/11 requirements
mapped); REQUIREMENTS.md traceability already correct and unchanged. Next: `/gsd-plan-phase 70`.
Resume file: None

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

*State updated: 2026-08-20 after v4.1 ROADMAP.md creation (Phases 70-77)*
