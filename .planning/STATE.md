# Project State: BBj Language Server

**Last Updated:** 2026-08-20

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Remediating GHSA-p5f3-9456-9pcx (critical, CWE-78); next milestone unscoped

---

## Current Position

Phase: none active on `main` — v4.0 (phases 60-69) code-merged but NOT shipped
Status: v4.0 `tech_debt` — audited 40/40, never closed; artifacts on unmerged branch `v4.0-stability-and-quality`
Last activity: 2026-08-20 - Filed v4.0 Stability & Quality retroactively; opened .planning/DEBT.md; executing quick task 260820-hxg (GHSA-p5f3-9456-9pcx command-injection hardening)

Progress: [██████████] 100% of planned v4.0 phases executed (10/10, 62 plans) — milestone close pending

**Needs human attention:** see `tmp_human_review/` — 9 unpublished draft security
advisories, WR-01..WR-06 unfiled concurrency warnings, the unmerged v4.0 artifact
branch, and the v4.0 milestone close. See `.planning/DEBT.md` for the deferred
UAT/patterns debt.

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 16 (v4.0 executed and audited but not closed)
**Phases completed:** 59
**Plans completed:** 143
**Days elapsed:** 21
**Velocity:** ~6.8 plans/day

### Recent History

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

**v3.7 (Shipped: 2026-02-20):**
- Duration: 1 day
- Phases: 4 (50-53)
- Plans: 7
- Key: Diagnostic noise reduction, Structure View resilience, BBjCPL compiler integration

---

## Accumulated Context

### Active Constraints

- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key recent decisions:
- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion filtering
- [Phase 59]: MemberCall isClassRef extension dropped — old JAR does not send isStatic for fields
- [Phase 59]: ( trigger returns empty CompletionList (not undefined) — prevents slow fallthrough
- [Phase 59]: CompletionItemTag.Deprecated only — no sortText change, no label suffix

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Blockers/Concerns

- **Unpushed security fix.** Quick task 260820-hxg (3 commits) sits on local branch
  `fix/ghsa-p5f3-9456-9pcx`; not pushed, no PR. GHSA-p5f3-9456-9pcx stays an unpublished
  draft until the fix ships.
- **8 further draft advisories unfixed** (all high) from v4.0 phase 65. See
  `tmp_human_review/01-security-advisories.md`.
- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates
  on a bare TCP connect to :5008. BBjServices squats on that port without speaking the
  interop protocol, so 11 `linking.test.ts` interop tests switch on and fail. Green with
  `RUN_BBJ_TESTS=0`. Pre-existing; reproduced identically at `291cd23`.
- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260329-oqw | PR #383: Return undefined instead of empty list from getFieldCompletion to allow other providers to continue | 2026-03-29 | ab42eef | | [260329-oqw-pr-383-return-undefined-instead-of-empty](./quick/260329-oqw-pr-383-return-undefined-instead-of-empty/) |
| 260820-hxg | GHSA-p5f3-9456-9pcx (critical, CWE-78): replace shell-string `child_process.exec()` construction with `execFile` argument arrays across all 7 command constructions; adds metacharacter regression tests + reintroduction guard | 2026-08-20 | f289fc5 | Verified | [260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape](./quick/260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape/) |

---

## Session Continuity

Last session: 2026-08-20
Stopped at: Quick task 260820-hxg verified (9/9 must-haves, live-tested against /opt/bbx); planning docs committed; nothing pushed
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

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-21 after v3.9 milestone completion*
