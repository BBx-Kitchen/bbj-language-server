---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Stability and Quality
current_phase: 62
current_phase_name: Extension Host & Webview Composer Review
status: verifying
stopped_at: Completed 62-05-PLAN.md (Phase 62 fully closed, RVW-02 complete)
last_updated: "2026-08-18T08:18:22.271Z"
last_activity: 2026-08-18
last_activity_desc: Phase 61 Plan 05 — RU-61-04 (LSP feature providers) swept across all 6 live dimensions
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 16
  completed_plans: 16
  percent: 30
---

# Project State: BBj Language Server

**Last Updated:** 2026-08-17

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-17)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 62 — Extension Host & Webview Composer Review

---

## Current Position

Phase: 62 (Extension Host & Webview Composer Review) — EXECUTING
Plan: 5 of 5
Status: Phase complete — ready for verification
Last activity: 2026-08-18 — Phase 62 execution started

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 16
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
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 60 P01 | ~34s (task commits only) | 4 tasks | 1 files |
| Phase 60 P02 | ~1h | 3 tasks | 1 files |
| Phase 60 P03 | ~55m | 3 tasks | 2 files |
| Phase 60 P04 | ~45m | 2 tasks | 10 files |
| Phase 61 P01 | 23min | 3 tasks | 3 files |
| Phase 61 P02 | ~25min | 2 tasks | 1 files |
| Phase 61 P03 | 20min | 2 tasks | 1 files |
| Phase 61-language-core-review P04 | 20min | 2 tasks | 1 files |
| Phase 61-language-core-review P05 | ~45min | 2 tasks | 1 files |
| Phase 61-language-core-review P06 | ~50min | 2 tasks | 1 files |
| Phase 61 P07 | ~90min | 2 tasks | 1 files |
| Phase 62 P01 | 6min | 3 tasks | 1 files |
| Phase 62 P02 | 20min | 2 tasks | 1 files |
| Phase 62 P03 | 70min | 2 tasks | 1 files |
| Phase 62 P04 | ~22min | 2 tasks | 1 files |
| Phase 62 P05 | 40min | 3 tasks | 4 files |

## Accumulated Context

### Active Constraints

- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment
- v4.0 scope excludes `java-interop/` Java service and `src/language/generated/` (machine-generated, 17.5k LOC)
- v4.0 ISSUE-01 is a hard gate — no GitHub issue is filed before the user approves the drafted list

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key recent decisions:

- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion filtering
- [Phase 59]: MemberCall isClassRef extension dropped — old JAR does not send isStatic for fields
- [Phase 59]: ( trigger returns empty CompletionList (not undefined) — prevents slow fallthrough
- [Phase 59]: CompletionItemTag.Deprecated only — no sortText change, no label suffix
- [v4.0 Roadmap]: SEC-03/SEC-06/SEC-07/SEC-08 folded into the single-owning module review phase
  (RVW-04, RVW-01, RVW-05, RVW-05 respectively); SEC-01/SEC-02/SEC-04/SEC-05 given a dedicated
  Cross-Cutting Security Audit phase (65) because each spans multiple modules/IDEs

- [v4.0 Roadmap]: RVW-01 (`src/language/`, ~8.5k LOC) kept as a single phase rather than split —
  comparable in scale to RVW-04's single-phase 6.6k LOC IntelliJ review, so splitting wasn't
  necessary to keep the phase executable

- [v4.0 Roadmap]: RVW-06 (verified failure scenario) and RVW-07 (dedup vs open issues) established
  as standards in Phase 60 and enforced as a success criterion in every review/security phase (61-65)

- [v4.0 Roadmap]: FIX-01..04 isolated to a single dedicated Phase 67 run after all review sweeps —
  review phases record findings, this phase is the only one that applies them

- [Phase 60 Plan 01]: Finding-ID scheme locked as phase-dimension-seq (P{phase}-D{dimension}-{seq}) at Task 1 checkpoint, confirming D-11
- [Phase 60 Plan 01]: Baseline range pinned to 2194616..v0.12.0 (153 commits), not HEAD, because HEAD moves with v4.0 planning commits
- [Phase 60 Plan 02]: Applicability grid n/a cells use short markers resolved in a keyed Exclusion reasons list (232 cells across 29 rows) rather than inline prose, to keep the grid readable
- [Phase 60 Plan 02]: RU-62-04 kept in its pre-existing physical position (predates the D-07 ascending phase/risk-rank ordering rule) with a documented ordering-exception note, rather than moved
- [Phase 60 Plan 03]: Reconstructed 17 Validated entries labelled by release tag (0.9.0-0.12.0) from the pinned 2194616..v0.12.0 range, each traced to a named commit
- [Phase 60 Plan 03]: Corrected PROJECT.md Context/Constraints/Key Decisions per D-15 log (154->153 commits, 39->~49 files, 7->6 debt items, HEAD->v0.12.0 endpoint) plus 3 plan-authorized Tech-stack version corrections not in the D-15 log
- [Phase 60 Plan 04]: Corrected ROADMAP.md/REQUIREMENTS.md figures per D-15 (154->153 commits, HEAD->v0.12.0 endpoint, 39->~49 src/language/ files with LOC re-measured to ~10.8k, 13->11 composer files+setopts-catalog.ts with SETOPTS asymmetry made explicit, nonexistent bbx-config editor replaced with setopts-composer-webview.ts wording)
- [Phase 60 Plan 04]: Added additive dated SUPERSEDED banners to all seven codebase/*.md maps naming INVENTORY.md as the v4.0 scope authority (D-16); logged 60-03's un-logged Langium/Chevrotain/Vitest Tech-stack corrections into INVENTORY.md's D-15 Correction Log as a carried-forward defect fix
- [Phase ?]: [Phase 61 Plan 01]: D-05 checkpoint approved as rendered — RU-61-06 recording shape frozen verbatim for plans 61-02..61-07
- [Phase ?]: [Phase 61 Plan 01]: 11 test/linking.test.ts Interop related tests failures recorded once as RU-61-06 (not RU-61-02) per location-decides-ownership rule, with a cross-unit referral
- [Phase ?]: [Phase 61 Plan 02]: STRING_LITERAL doubled-quote escape never collapsed by BBjValueConverter despite bbj.langium's own comment claiming it is (P61-D2-005/P61-D8-002)
- [Phase ?]: [Phase 61 Plan 02]: mixed line-ending files break bbj-lexer.ts's prepareLineSplitter length-preservation invariant, corrupting downstream LSP position mapping (P61-D2-006)
- [Phase ?]: [Phase 61 Plan 02]: 3 disabled parser.test.ts assertions recorded as P61-D5-003 with dedup naming DEBT-02 as owning requirement
- [Phase ?]: P61-D1-003 (bbjcpl spawn path validation gap) rated severity high to match plan's threat T-61-P03-S1, forcing classification major
- [Phase ?]: P61-D2-010's redundant-AST-walk consequence folded into that finding as secondary D3 rather than a second record, sharing one root cause
- [Phase ?]: P61-D2-011 root-causes and reproduces DEBT-03's static-method type-inference gap (bbj-type-inferer.ts missing resolvedReturnType fallback)
- [Phase ?]: P61-D3-003 re-triages #232/DEBT-01 against current code: uncached full-index scan + unpruned scope-computation walk, with isAffected() confirmed as an existing partial mitigation
- [Phase 61 Plan 05]: Settled RU-61-06's open not-reproducible disposition — hover/completion documentation is explicitly typed and sent as LSP Markdown (kind: 'markdown'), confirming unescaped peer javadoc/signature text CAN render as markup (P61-D1-004); no command-execution claim asserted (VS Code sanitizes untrusted MarkupContent)
- [Phase 61 Plan 05]: Unvalidated peer-supplied FQNs interpolate unescaped into `use ${fqn}\n` TextEdits inserted into the user's source document via the missing-use quick-fix and completion auto-import, with no format validation at either call site (P61-D1-005)
- [Phase 61 Plan 05]: TEST-03 skip recorded as P61-D5-010 with dedup naming DEBT-02 as owning requirement; signature-help provider and hover provider's core logic found to have zero direct behavioral test coverage (P61-D5-011, P61-D5-012)
- [Phase ?]: [Phase 61 Plan 06]: Resolved all 4 inherited cross-unit referrals for RU-61-05 — 2 promoted to new findings with direct node -e reproductions (P61-D1-006 interop host/port call-site gap, P61-D1-008 PREFIX path traversal), 1 dismissed with evidence (RU-61-03's trackBbjcplAvailability), 1 promoted as the hookTimeout flakiness cost-profile trace (P61-D5-013)
- [Phase ?]: [Phase 61 Plan 06]: Found root cause behind #33 (multi-root workspaces broken) — initializeWorkspace() reads project.properties/config.bbx from folders[0] only (P61-D2-015); found settings never refresh on didChangeConfiguration, matching #486 exactly (P61-D2-018)
- [Phase ?]: [Phase 61 Plan 06]: constants.ts/utils.ts dead-module candidate confirmed live (3 references) and dismissed with evidence, not asserted as a finding, per plan's explicit instruction
- [Phase ?]: [Phase 61 Plan 07]: RU-61-07 (builtin catalogs) swept mechanically per D-08 — physical .bbl files confirmed never read by any runtime consumer or test, only their .ts-exported string siblings are used; found duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT eventtype declarations (P61-D2-019) and a CVS docstring drift between functions.ts/functions.bbl (P61-D4-015)
- [Phase ?]: [Phase 61 Plan 07]: Phase 61 closed — D-17 gate re-derivation from INVENTORY prints 50 38 88, agrees with the coverage file's own totals; 53-file tree enumeration confirms every hand-written src/language/ file is named in 61-COVERAGE.md; RVW-01 marked complete
- [Phase ?]: [Phase 62 Plan 01]: D-09 disclosure checkpoint approved as written for RU-62-04 — none of the 5 findings rates critical/high, so the redaction tier was never actually triggered; approved shape frozen for plans 62-02..62-05
- [Phase ?]: [Phase 62 Plan 01]: RU-62-04 (composer webview HTML generators) swept across all 7 live dimensions — 5 findings recorded (P62-D1-001/002, P62-D2-001, P62-D4-001, P62-D5-001), 1 not-reproducible disposition, 1 cross-unit referral (SETOPTS has no IntelliJ counterpart) to RU-63-04
- [Phase ?]: P62-D1-003 rated critical, rendered per the frozen D-09 disclosure tier: names the surface/problem-class/impact of unescaped child_process.exec() interpolation across Commands.cjs/extension.ts, no trigger sequence or payload
- [Phase ?]: IntelliJ's BbjCompileAction.java is a TODO stub and 6 VS Code commands have no IntelliJ counterpart — routed as Cross-unit referrals to RU-63-01 rather than P62-D7-* findings, per D-05
- [Phase ?]: P62-D1-005 rated low: every affected field (addwindow/addchildwindow composer geometry/title/receiver, msgbox assignTo) is developer-typed webview input, not document/config/workspace data — self-inflicted statement-corruption gap, not attacker-controlled injection
- [Phase ?]: P62-D4-004 cross-references RU-62-04's P62-D4-001 by ID rather than restating it — the logic/UI-layer half of the D-12 composer duplication callout, applying the 3-file (not 4) -composer.ts baseline
- [Phase ?]: RVW-03 marked complete — both plans declaring it (62-01's RU-62-04, 62-03's RU-62-03) now cover the full 12-file webview-composer surface; RVW-02 remains open pending 62-04/62-05
- [Phase ?]: [Phase 62 Plan 04]: RU-62-05 (TextMate grammar & language configuration) swept across all 7 live dimensions via live vscode-textmate tokenization — found 4 concrete D2 defects (P62-D2-006 invalid JSON trailing commas, P62-D2-007 string content mis-scoped as escape, P62-D2-008 bare REM not a comment, P62-D2-009 IOL=/LEN= boundary inverted), confirmed #381 already fixed and symmetric on both IDEs, found one VS Code-side .bbl extension gap (P62-D7-002), and 2 test-coverage/1 doc-accuracy findings; 2 cross-unit referrals to RU-63-02
- [Phase ?]: RU-62-02 swept: 8 findings recorded (P62-D1-006/007, P62-D2-010/011, P62-D3-001, P62-D4-005, P62-D5-006, P62-D8-002); document-formatter.ts's spawn() explicitly distinguished from RU-62-01's exec()-shell-string pattern rather than cross-referenced as a duplicate
- [Phase ?]: Phase 62 closed: both D-14 gates re-derived live and agree (22 files; 35/5/40 cells) across all three sources; 34 findings total (14 easy-fix, 20 major-refactor); 0 intra-phase referrals, 7 outstanding RU-63-* referrals; all 4 ROADMAP success criteria answered Met

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232) — re-triaged in v4.0 Phase 66 (DEBT-01)
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize) — re-triaged in v4.0 Phase 66 (DEBT-05)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change — re-triaged in v4.0 Phase 66 (DEBT-05)
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level
- FQN path static-only filtering deferred — re-triaged in v4.0 Phase 66 (DEBT-04)
- Static method return type inference gap — String.valueOf(2) does not assign type — re-triaged in v4.0 Phase 66 (DEBT-03)

### Blockers/Concerns

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260329-oqw | PR #383: Return undefined instead of empty list from getFieldCompletion to allow other providers to continue | 2026-03-29 | ab42eef | [260329-oqw-pr-383-return-undefined-instead-of-empty](./quick/260329-oqw-pr-383-return-undefined-instead-of-empty/) |

---

## Session Continuity

Last session: 2026-08-18T08:18:22.253Z
Stopped at: Completed 62-05-PLAN.md (Phase 62 fully closed, RVW-02 complete)
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

v4.0 Stability and Quality (Phases 60-69) is in progress — not yet in this table (added on ship).

See: `.planning/MILESTONES.md`

---

*State updated: 2026-08-17 after v4.0 ROADMAP.md creation*
