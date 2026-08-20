---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Stability and Quality
current_phase: 69
current_phase_name: github-issue-filing
status: executing
stopped_at: Completed 69-05-PLAN.md
last_updated: "2026-08-20T05:40:21.538Z"
last_activity: 2026-08-19
last_activity_desc: Phase 66 execution started
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 62
  completed_plans: 54
  percent: 87
---

# Project State: BBj Language Server

**Last Updated:** 2026-08-17

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-17)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 69 — github-issue-filing

---

## Current Position

Phase: 69 (github-issue-filing) — EXECUTING
Plan: 6 of 13
Status: Ready to execute
Last activity: 2026-08-19 — Phase 69 execution started

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
| Phase 63 P01 | ~15min (task commits only) | 2 tasks | 1 files |
| Phase 63 P02 | ~40min | 2 tasks | 1 files |
| Phase 63 P03 | ~24min (task commits only) | 2 tasks | 1 files |
| Phase 63 P04 | ~20min | 2 tasks | 1 files |
| Phase 63 P05 | ~48min | 3 tasks | 1 files |
| Phase 64 P01 | ~50min | 2 tasks | 1 files |
| Phase 64 P02 | ~45min | 2 tasks | 1 files |
| Phase 64 P03 | ~90min | 4 tasks | 1 files |
| Phase 65 P01 | ~40min | 3 tasks | 1 files |
| Phase 65 P02 | 55min | 2 tasks | 1 files |
| Phase 65 P03 | 30min | 3 tasks | 1 files |
| Phase 66 P01 | 12min | 3 tasks | 1 files |
| Phase 66 P02 | ~55min | 2 tasks | 1 files |
| Phase 66 P03 | ~45min | 3 tasks | 3 files |
| Phase 67 P01 | ~14min | 3 tasks | 5 files |
| Phase 67 P02 | ~9min | 3 tasks | 4 files |
| Phase 67 P03 | ~15min | 3 tasks | 6 files |
| Phase 67 P04 | ~22min | 3 tasks | 8 files |
| Phase 67 P05 | ~13min | 3 tasks | 11 files |
| Phase 67 P06 | ~35min | 3 tasks | 8 files |
| Phase 67 P07 | ~33min | 3 tasks | 13 files |
| Phase 67 P08 | ~13min | 3 tasks | 6 files |
| Phase 67 P09 | ~9min | 3 tasks | 8 files |
| Phase 67 P10 | ~30min | 3 tasks | 8 files |
| Phase 67 P11 | ~14min | 3 tasks | 10 files |
| Phase 67 P12 | 18min | 3 tasks | 2 files |
| Phase 68 P01 | 17min | 3 tasks | 3 files |
| Phase 68 P02 | ~20min | 3 tasks | 3 files |
| Phase 68 P03 | ~25min | 3 tasks | 3 files |
| Phase 68 P04 | 3min | 3 tasks | 3 files |
| Phase 68 P05 | 4min | 3 tasks | 2 files |
| Phase 68 P06 | 9min | 3 tasks | 2 files |
| Phase 68 P07 | 12min | 3 tasks | 3 files |
| Phase 69 P01 | ~20min | 2 tasks | 2 files |
| Phase 69 P02 | ~35min | 2 tasks | 1 files |
| Phase 69 P03 | 55min | 2 tasks | 2 files |
| Phase 69 P04 | 27min | 2 tasks | 1 files |
| Phase 69 P05 | ~20min | 2 tasks | 1 files |

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
- [Phase 64]: [Phase 61 Plan 01]: D-05 checkpoint approved as rendered — RU-61-06 recording shape frozen verbatim for plans 61-02..61-07
- [Phase 64]: [Phase 61 Plan 01]: 11 test/linking.test.ts Interop related tests failures recorded once as RU-61-06 (not RU-61-02) per location-decides-ownership rule, with a cross-unit referral
- [Phase 64]: [Phase 61 Plan 02]: STRING_LITERAL doubled-quote escape never collapsed by BBjValueConverter despite bbj.langium's own comment claiming it is (P61-D2-005/P61-D8-002)
- [Phase 64]: [Phase 61 Plan 02]: mixed line-ending files break bbj-lexer.ts's prepareLineSplitter length-preservation invariant, corrupting downstream LSP position mapping (P61-D2-006)
- [Phase 64]: [Phase 61 Plan 02]: 3 disabled parser.test.ts assertions recorded as P61-D5-003 with dedup naming DEBT-02 as owning requirement
- [Phase 64]: P61-D1-003 (bbjcpl spawn path validation gap) rated severity high to match plan's threat T-61-P03-S1, forcing classification major
- [Phase 64]: P61-D2-010's redundant-AST-walk consequence folded into that finding as secondary D3 rather than a second record, sharing one root cause
- [Phase 64]: P61-D2-011 root-causes and reproduces DEBT-03's static-method type-inference gap (bbj-type-inferer.ts missing resolvedReturnType fallback)
- [Phase 64]: P61-D3-003 re-triages #232/DEBT-01 against current code: uncached full-index scan + unpruned scope-computation walk, with isAffected() confirmed as an existing partial mitigation
- [Phase 61 Plan 05]: Settled RU-61-06's open not-reproducible disposition — hover/completion documentation is explicitly typed and sent as LSP Markdown (kind: 'markdown'), confirming unescaped peer javadoc/signature text CAN render as markup (P61-D1-004); no command-execution claim asserted (VS Code sanitizes untrusted MarkupContent)
- [Phase 61 Plan 05]: Unvalidated peer-supplied FQNs interpolate unescaped into `use ${fqn}\n` TextEdits inserted into the user's source document via the missing-use quick-fix and completion auto-import, with no format validation at either call site (P61-D1-005)
- [Phase 61 Plan 05]: TEST-03 skip recorded as P61-D5-010 with dedup naming DEBT-02 as owning requirement; signature-help provider and hover provider's core logic found to have zero direct behavioral test coverage (P61-D5-011, P61-D5-012)
- [Phase 64]: [Phase 61 Plan 06]: Resolved all 4 inherited cross-unit referrals for RU-61-05 — 2 promoted to new findings with direct node -e reproductions (P61-D1-006 interop host/port call-site gap, P61-D1-008 PREFIX path traversal), 1 dismissed with evidence (RU-61-03's trackBbjcplAvailability), 1 promoted as the hookTimeout flakiness cost-profile trace (P61-D5-013)
- [Phase 64]: [Phase 61 Plan 06]: Found root cause behind #33 (multi-root workspaces broken) — initializeWorkspace() reads project.properties/config.bbx from folders[0] only (P61-D2-015); found settings never refresh on didChangeConfiguration, matching #486 exactly (P61-D2-018)
- [Phase 64]: [Phase 61 Plan 06]: constants.ts/utils.ts dead-module candidate confirmed live (3 references) and dismissed with evidence, not asserted as a finding, per plan's explicit instruction
- [Phase 64]: [Phase 61 Plan 07]: RU-61-07 (builtin catalogs) swept mechanically per D-08 — physical .bbl files confirmed never read by any runtime consumer or test, only their .ts-exported string siblings are used; found duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT eventtype declarations (P61-D2-019) and a CVS docstring drift between functions.ts/functions.bbl (P61-D4-015)
- [Phase 64]: [Phase 61 Plan 07]: Phase 61 closed — D-17 gate re-derivation from INVENTORY prints 50 38 88, agrees with the coverage file's own totals; 53-file tree enumeration confirms every hand-written src/language/ file is named in 61-COVERAGE.md; RVW-01 marked complete
- [Phase 64]: [Phase 62 Plan 01]: D-09 disclosure checkpoint approved as written for RU-62-04 — none of the 5 findings rates critical/high, so the redaction tier was never actually triggered; approved shape frozen for plans 62-02..62-05
- [Phase 64]: [Phase 62 Plan 01]: RU-62-04 (composer webview HTML generators) swept across all 7 live dimensions — 5 findings recorded (P62-D1-001/002, P62-D2-001, P62-D4-001, P62-D5-001), 1 not-reproducible disposition, 1 cross-unit referral (SETOPTS has no IntelliJ counterpart) to RU-63-04
- [Phase 64]: P62-D1-003 rated critical, rendered per the frozen D-09 disclosure tier: names the surface/problem-class/impact of unescaped child_process.exec() interpolation across Commands.cjs/extension.ts, no trigger sequence or payload
- [Phase 64]: IntelliJ's BbjCompileAction.java is a TODO stub and 6 VS Code commands have no IntelliJ counterpart — routed as Cross-unit referrals to RU-63-01 rather than P62-D7-* findings, per D-05
- [Phase 64]: P62-D1-005 rated low: every affected field (addwindow/addchildwindow composer geometry/title/receiver, msgbox assignTo) is developer-typed webview input, not document/config/workspace data — self-inflicted statement-corruption gap, not attacker-controlled injection
- [Phase 64]: P62-D4-004 cross-references RU-62-04's P62-D4-001 by ID rather than restating it — the logic/UI-layer half of the D-12 composer duplication callout, applying the 3-file (not 4) -composer.ts baseline
- [Phase 64]: RVW-03 marked complete — both plans declaring it (62-01's RU-62-04, 62-03's RU-62-03) now cover the full 12-file webview-composer surface; RVW-02 remains open pending 62-04/62-05
- [Phase 64]: [Phase 62 Plan 04]: RU-62-05 (TextMate grammar & language configuration) swept across all 7 live dimensions via live vscode-textmate tokenization — found 4 concrete D2 defects (P62-D2-006 invalid JSON trailing commas, P62-D2-007 string content mis-scoped as escape, P62-D2-008 bare REM not a comment, P62-D2-009 IOL=/LEN= boundary inverted), confirmed #381 already fixed and symmetric on both IDEs, found one VS Code-side .bbl extension gap (P62-D7-002), and 2 test-coverage/1 doc-accuracy findings; 2 cross-unit referrals to RU-63-02
- [Phase 64]: RU-62-02 swept: 8 findings recorded (P62-D1-006/007, P62-D2-010/011, P62-D3-001, P62-D4-005, P62-D5-006, P62-D8-002); document-formatter.ts's spawn() explicitly distinguished from RU-62-01's exec()-shell-string pattern rather than cross-referenced as a duplicate
- [Phase 64]: Phase 62 closed: both D-14 gates re-derived live and agree (22 files; 35/5/40 cells) across all three sources; 34 findings total (14 easy-fix, 20 major-refactor); 0 intra-phase referrals, 7 outstanding RU-63-* referrals; all 4 ROADMAP success criteria answered Met
- [Phase 64]: [Phase 63 Plan 01]: RU-63-03 (settings & runtime acquisition) swept across all 7 live dimensions — 12 findings recorded incl. P63-D1-001 (no checksum/signature verification on Node.js download/cache path, high, D-13 two-tier disclosure) and P63-D5-001 (systemic no-test-source-set finding, cross-referenced by the other 4 units)
- [Phase 64]: [Phase 63 Plan 01]: Verified live against nodejs.org/dist/index.json and nodejs/Release schedule.json that pinned Node.js v20.18.1 is past its own LTS end-of-life (2026-04-30) and missing 5 later security releases (P63-D6-001)
- [Phase 64]: [Phase 63 Plan 01]: extractZip's zip-slip risk confirmed NOT exploitable (hardcoded 'node.exe' target, not entry.getName()); extractTarGz's delegation to system tar recorded as Not-reproducible rather than a finding, since confirming it would require constructing an exploit archive (D-13 prohibition)
- [Phase 64]: [Phase 63 Plan 02]: RU-63-01 (run/compile/EM actions) swept across all 7 live dimensions — 16 findings recorded incl. P63-D2-004 (BUI/DWC buildCommandLine blocks the EDT up to ~25s via synchronous EM token validation/re-login) and P63-D1-003 (EM password/token exposed as GeneralCommandLine process arguments)
- [Phase 64]: [Phase 63 Plan 02]: All 3 inherited Phase 62 referrals dispositioned as promoted (P63-D7-001/002/003) — corrected referral #2's stated count from six to the actually-enumerated 5 VS Code commands with no IntelliJ counterpart; outbound referral to RU-63-05 for BbjServerService.restart()'s mechanism side
- [Phase 64]: [Phase 63 Plan 03]: RU-63-04 (composer dialogs & bridge) swept across all 7 live dimensions — 14 findings recorded incl. P63-D2-010 (stale captured document-edit range never revalidated, matching threat T-63-P03-S4) and P63-D7-004 (dormant MsgboxPreview.exprText/CatalogItem.constant DTO field gap, currently inert on both IDEs)
- [Phase 64]: [Phase 63 Plan 03]: Corrected INVENTORY's composer-bridge risk-rank framing ('bridge to an external composer process') after tracing BbjComposerServer.java/BbjComposerService.java — it is an LSP4IJ proxy over the existing language server, spawns no external process
- [Phase 64]: [Phase 63 Plan 03]: Merged inherited referrals #4 (RU-62-04) and #5 (RU-62-03) into one disposition per D-06 — SETOPTS has no IntelliJ composer dialog, verified against the current tree, promoted to P63-D7-005 with dedup naming #475 as a partial-overlap (porting the existing #474 config.bbx composer)
- [Phase 64]: [Phase 63 Plan 04]: RU-63-05 (LSP wiring, server lifecycle & status UI) swept across all 7 live dimensions — 11 findings incl. P63-D1-007 (untrusted-search-path 'node' launch fallback + project-CWD, high) and P63-D2-013 (dead debounce infrastructure behind an unguarded restart() race)
- [Phase 64]: [Phase 63 Plan 04]: DEBT-05 evidence corrected to measured '20 lsp4ij references across 11 files' (not the carried '10 files'); referral #3's mechanism side re-triaged by cross-reference to RU-63-01's P63-D7-003 rather than re-filed
- [Phase 64]: [Phase 63 Plan 05]: RU-63-02 (language registration, editor support & notifications) swept across all 7 live dimensions — 9 findings incl. P63-D2-015 (bracket-matching doesn't exclude string-literal content) and P63-D2-016 (BbjCommenter's case-sensitive 'REM ' prefix vs BBj's case-insensitive REM grammar terminal)
- [Phase 64]: [Phase 63 Plan 05]: Both inherited Phase 62 referrals dispositioned — #6 (TextMate filenames/.bbl LSP4IJ coverage) not-reproducible without IDE launch; #7 (format/denumber/tokenized/decompile absence) promoted as one categorical finding P63-D7-006, dedup #65 partial-overlap
- [Phase 64]: [Phase 63 Plan 05]: Phase 63 closed — both D-17 gates re-derived live and agree (file gate 61/61, cell gate 35/5/40); 62 findings total (10 easy-fix, 52 major-refactor) across all 5 units; RVW-04 and SEC-03 marked complete
- [Phase 64]: Phase 64 D-20's adopted gradle-wrapper.jar row moves BOTH gates: the cell gate is 8 29 35 64 (not INVENTORY's 7 27 29 56) and the file gate is 29 — the adopted row is not derivable from any INVENTORY grep and must be added by hand
- [Phase 64]: Phase 64 carries R-D6-CENTRAL zero times — all eight D6 cells in its slice are live, and 64-COVERAGE.md states that non-carry as a fact so its absence does not read as a dropped carry-forward
- [Phase 64]: BBjCodeFomatter.jar's unidentifiability is itself the SEC-08 finding (P64-D6-002, triage file-issue): a 38,078-byte binary shipped in the published .vsix whose entire manifest is 'Manifest-Version: 1.0' cannot be vulnerability-triaged at all, which is a strictly worse posture than a known-vulnerable dependency
- [Phase 64]: jcommander 1.71 is advisory-clean (OSV, checked 2026-08-18, mechanism sanity-checked against log4j-core 2.14.1) but dated 2017-04-27 from its own Bnd-LastModified — recorded as a finding-free pass with source and date rather than inflated into a CVE claim
- [Phase 64]: All 12 RU-64-03 findings classify as major and none as easy — INVENTORY 3c test (4) fails for everything under bbj-vscode/tools/, which is reached by no tsconfig, no lint script and no vitest pattern; P64-D5-001 is the finding that explains why Phase 67's easy path gets nothing from this unit
- [Phase 64]: RU-64-01 — SEC-07 rendered as a 6-workflow x 4-clause grid with all 24 cells filled — a workflow with no secrets gets an explicit written cell, so criterion 2 is verifiable by a reader rather than by the phase's assertion (D-13)
- [Phase 64]: RU-64-01 — INVENTORY 3c test (4) read as 'the existing harness for a workflow file IS the workflow run' — stated once at the head of the Findings block and applied to all 13 records, which is what let 2 findings classify easy and 1 D6 triage fix-now instead of everything defaulting to major
- [Phase 64]: RU-64-01 — all 36 uses: references enumerated — 0 SHA-pinned, 36 mutable tags — and split into P64-D6-003 (6 files, file-issue) and P64-D6-004 (build.yml's stale @v3 pair, fix-now) so the applicable one-file fix is not routed onto MAJOR-REFACTORS.md with the six-file one
- [Phase 64]: RU-64-01 — .github/dependabot.yml covers 1 of 4 dependency trees (no gradle, no documentation/, no github-actions); its Gradle half is referred to RU-64-02 to compose with D-10's un-enumerable Gradle tree, and its two ignore: entries are recorded as verified-correct accepted-with-reason models, not defects
- [Phase 64]: RU-64-01 — INVENTORY's .github/ accounting drift recorded as P64-D8-002 located in INVENTORY.md:932 with disposition wontfix — INVENTORY is immutable (Phase 60 D-09), so the finding is the correction; D-19's adoption (one file, no cell) is stated separately from D-20's (one file, one row), giving file gate 29 and cell gate 29/35/64
- [Phase 64]: RU-64-02 — gradle-wrapper.jar identified by hash against Gradle's published wrapperChecksum — it is the 8.10-8.12.1 wrapper while gradle-wrapper.properties:3 declares 8.13, and nothing in-repo pins either (no distributionSha256Sum, no wrapper-validation action)
- [Phase 64]: RU-64-02 — SEC-08 closed with a 20-row criterion-3 triage table — npm half pinned to a live 2026-08-18 audit (19 vulns), Gradle half declared-coordinates-only with the transitive gap stated; exactly 1 of 19 flagged packages (brace-expansion@5.0.7) reaches the shipped bundle, 15 reach the prod closure only through @vscode/vsce being in dependencies
- [Phase 64]: RU-64-02 — P63-D6-002 dispositioned merged into P64-D6-010; fixing the bbj-intellij toolchain would retroactively close the D-10 Gradle enumeration gap, making one fix close two records
- [Phase 64]: Phase 64 closed — both D-18 gates re-run live (file gate 29; cell gate 7 27 29 56 from INVENTORY plus D-20's hand-added row = 8 29 35 64), 44 findings, 8 easy / 36 major. Milestone sweep coverage is 147 of INVENTORY's 148 applies cells, remainder RU-D8-01/D8, plus 8 cells beyond the grid reported separately
- [Phase ?]: [Phase 65 Plan 01]: Verified and committed pre-existing interrupted-run's 65-COVERAGE.md skeleton draft after live re-derivation confirmed every arithmetic identity; fixed an internal inconsistency in its D-14 self-reference-hazard note
- [Phase ?]: [Phase 65 Plan 01]: SEC-01 closed with zero new findings (confirms P62-D1-001/002 cover the whole enumerated surface); SEC-02 closed with new finding P65-D1-001 — msgbox's insert arm gates on r.valid content-validity while near-identical addwindow/addchildwindow arms apply unconditionally, an asymmetry Phase 62's single-file review characterized as identical and did not surface
- [Phase ?]: SEC-04 closed: at-rest asymmetry between VS Code SecretStorage (fixed OS-native binding) and IntelliJ PasswordSafe (user-configurable backend) recorded as P65-D1-002; expiry handling recorded as genuine cross-IDE agreement (identical fail-open decode + mandatory server round-trip) per D-12, with VS Code's own previously-unowned instance of the decode weakness recorded as P65-D1-003
- [Phase ?]: SEC-05 closed with zero new findings — every real spawn site's shape, including the cross-IDE shell-vs-argv asymmetry, traces to an inherited owner (P61/62/63/64-D1-*, plus P62-D7-001)
- [Phase ?]: Phase 65 closed: all four SEC-01/02/04/05 requirements complete, D-16's surface/criterion/requirement gates re-derived live, zero cells recorded against INVENTORY's grid
- [Phase ?]: Resume signal drafts-only recorded (D-02): zero gh write subcommands anywhere in Phase 66
- [Phase ?]: DEBT-03 verdicts easy-fix not major-refactor: both inherited P61 records already established all six D-13 tests pass
- [Phase ?]: DEBT-02 split into two finding records/drafts per D-07: repo-local vs upstream unblocking conditions
- [Phase ?]: DEBT-05's '19 experimental API usages' figure settled by provenance (traced via git log -S to the IntelliJ Plugin Verifier's 2026-02-10 compatibility report), not re-derived or discarded
- [Phase ?]: DEBT-05 verdicts major-refactor (superseding P63-D4-010): 3 of 9 LSP4IJ classes bbj-intellij touches carry class-level @ApiStatus.Experimental, with a contract-test issue draft as the actionable in-repo fix
- [Phase ?]: DEBT-04 verdicts major-refactor with P66-D2-002 (evidence_tier repro via INVENTORY §3b's second form): the USE-alias completion path works, the MemberCall FQN path is the traced gap, java-interop JAR redeployment is the stated blocker
- [Phase ?]: DEBT-07 verdicted major-refactor: traced Rule 0 (BBjCPL suppresses Langium parse errors) as unreachable on every build cycle, not delayed by one as PROJECT.md previously claimed — the merge path that introduces BBjCPL diagnostics never calls applyDiagnosticHierarchy
- [Phase ?]: DEBT-08 verdicted wontfix (unblocking condition P64-D6-010 stated): IntelliJ TextMate filenames-vs-extensions verification remains blocked on the JDK toolchain mismatch, still drafted for Phase 69 per D-07
- [Phase ?]: Criteria 3 and 5 of Phase 66's ROADMAP success criteria answered Partially Met, not Met — neither DEBT-03/DEBT-04 nor the six original carried items are literally 'fixed or filed'/'represented by a GitHub issue' on the strength of a draft; the Phase 69 dependency is named explicitly
- [Phase ?]: [Phase 67 Plan 01]: D-04 merge realized as two ledger rows (P61-D2-011, P66-D2-001), not one combined row, both closed against the same red+green commit pair
- [Phase ?]: [Phase 67 Plan 01]: FIX-01..04 left Pending in REQUIREMENTS.md after this plan — only 3 of 77 apply-set rows applied; marking complete deferred to 67-12 phase close
- [Phase ?]: [Phase 67 Plan 02]: P61-D2-002's fail_before recorded as inapplicable (empirically verified against the real vscode-jsonrpc library that Promise.race already handles both race branches synchronously) rather than a fabricated observed-red claim
- [Phase ?]: [Phase 67 Plan 02]: P61-D3-001's LRU cap (RESOLVED_CLASSES_CACHE_LIMIT=5000) is a discretionary named-constant choice; P61-D4-003's sendRequestSafe helper routed through 1 of 4 candidate call sites, the other 3 documented as not fitting the plain shape
- [Phase ?]: [Phase 67 Plan 02]: P61-D8-001 closed no-op per its own record's escape clause — clearCache()'s doc comment became accurate once P61-D2-004 landed in this same plan
- [Phase ?]: [Phase 67 Plan 03]: P61-D8-006 closed no-op - P61-D2-016's own fix (same plan) already deleted the misleading all-fine comment its record complains about
- [Phase ?]: [Phase 67 Plan 03]: ws-manager.test.ts uses createBBjTestServices (not plain createBBjServices) to avoid the real java-interop socket connect cost documented by P61-D5-013
- [Phase ?]: [Phase 67 Plan 04]: P61-D3-004's memoization cache stores the in-flight Promise (not resolved value) since Langium's completion engine invokes completionForCrossReference concurrently via Promise.all; a resolved-value cache under-deduplicated
- [Phase ?]: [Phase 67 Plan 04]: npm run lint reached literal zero-warning cleanliness via P61-D4-010, the phase's own lint-clean milestone (D-10)
- [Phase ?]: [Phase 67 Plan 05]: P61-D2-006 branch taken: track and re-emit each line's own original EOL via a capturing split, not the reject/normalize-before-parse alternative
- [Phase ?]: [Phase 67 Plan 05]: P61-D2-010 branch taken: TreeStream iterator's prune() over a manual recursive walk mirroring walkStatements
- [Phase ?]: [Phase 67 Plan 05]: P61-D2-019 branch taken: merge (DOCU text differed) not delete — both phrasings preserved as a union in the kept declaration
- [Phase ?]: [Phase 67 Plan 05]: FIX-01..03 left Pending in REQUIREMENTS.md, following 67-01's precedent, deferred to 67-12 phase close
- [Phase ?]: [Phase 67 Plan 06]: P61-D4-006 branch taken: delete BBjValidator's dead checkClassReference/isSubFolderOf (never DI-registered), shadowed by check-classes.ts's own strictly-more-complete ClassValidator copy
- [Phase ?]: [Phase 67 Plan 06]: P61-D8-002 closed no-op — bbj.langium:948's comment already accurate after P61-D2-005's fix (plan 67-05); no edit made per the record's own escape clause
- [Phase ?]: [Phase 67 Plan 06]: P61-D8-005's LSP provider count corrected from the finding record's estimated 'ten' to the actual 7, read live from bbj-module.ts's lsp service group
- [Phase ?]: [Phase 67 Plan 06]: FIX-01/FIX-03/FIX-04 left Pending in REQUIREMENTS.md, following 67-01/67-05 precedent — deferred to 67-12 phase close
- [Phase ?]: [Phase 67 Plan 07]: P61-D5-005 branch taken: document current unvalidated bbjHome spawn behaviour (not assert rejection) since P61-D1-003 is major-refactor and out of scope
- [Phase ?]: [Phase 67 Plan 07]: P61-D5-011 extended existing test/functional/lsp-features.test.ts rather than creating a new signature-help.test.ts, per the plan's own escape clause
- [Phase ?]: [Phase 67 Plan 07]: P61-D5-012's inherited-field hover only fires for chained member access (d!.x.y), not one-hop d!.x — documented inline, not filed as a new finding
- [Phase ?]: [Phase 67 Plan 07]: P61-D5-017's .ts-vs-.bbl equivalence compares unique name sets, not raw counts, so events.bbl's pre-P61-D2-019 duplicate leftovers aren't mistaken for new drift
- [Phase ?]: [Phase 67 Plan 08]: P62-D8-002 comment-correction branch taken over map removal; P62-D5-006's non-ENOENT-error case reuses P62-D2-010's own test rather than duplicating it; P62-D2-011's stale-fixture test lives under bbj-vscode/test/test-data/ rather than os.tmpdir(), read as binding on new tests this plan adds
- [Phase ?]: [Phase 67 Plan 08]: Own-test-bug found and fixed mid-fix — P62-D2-011's red test lacked a real gap before the wait call, letting the stale write's mtime coincidentally satisfy the new mtime gate; fixed with a 100ms gap, landed as its own test(P62-D2-011) commit
- [Phase ?]: [Phase 67 Plan 09]: P62-D2-009 branch taken: dropped trailing \B entirely rather than substituting (?=\d), preserving the pre-existing space/end-of-line-terminated IOL=/LEN= form
- [Phase ?]: [Phase 67 Plan 09]: P62-D5-004 closed no-op — its three named assertions landed as the P62-D2-007/008/009 regression tests in the same file the record names
- [Phase ?]: [Phase 67 Plan 10]: Task 2's blocking-human package-legitimacy checkpoint approved verbatim (approved) for the six transitive advisory-fix packages
- [Phase ?]: [Phase 67 Plan 10]: npm audit fix --package-lock-only, run for real (no --force), closed all 19 pre-existing advisories rather than only the six P64-D6-013 names -- recorded honestly as a larger-than-predicted outcome, package.json provably unchanged
- [Phase ?]: [Phase 67 Plan 10]: FIX-01/FIX-02/FIX-03 left Pending in REQUIREMENTS.md, continuing 67-01/67-05/67-06 precedent, deferred to 67-12 phase close
- [Phase ?]: [Phase 67 Plan 11]: P63-D8-007's underlying finding P63-D2-013 has a factual evidence error (scheduleRestart() claimed zero callers, but BbjSettingsConfigurable.apply() has called it since v1.2) — applied a corrected-not-removed Javadoc edit instead of the plan's literal instruction, recorded as a divergence
- [Phase ?]: [Phase 67 Plan 11]: P63-D8-008's comment-only-proof check doesn't literally apply since its edit is inside a Java text-block String literal (demo sample data), not comment syntax — ran the check anyway and recorded the honest non-matching output rather than fabricating conformance
- [Phase ?]: [Phase 67 Plan 11]: FIX-01..04 left Pending in REQUIREMENTS.md, continuing 67-01/05/06/07/08/09/10 precedent, deferred to 67-12 phase close
- [Phase ?]: FIX-03 verdict: not achieved as written — lint clean and D-07 baseline-delta gate passes, but interop test failures and IntelliJ JDK-version-check failure persist for documented environmental reasons
- [Phase ?]: FIX-04 verdict: not literally true at phase end — EASY-FIXES.md is deliberately not created (Phase 68's DOC-01 deliverable); all 77 ledger rows carry the fields DOC-01 needs
- [Phase ?]: Close-out correction: Index/Rows drift was six rows, not seven — P62-D4-005 was one of the original six, and the phantom P64-D4-005 (an unrelated Phase-64 finding) was removed from the reconciliation prose
- [Phase ?]: 68-01: EASY-FIXES.md failure_scenario sourced from COVERAGE (not 67-APPLY-SET.md) so verbatim fidelity holds against the phase's fidelity truth
- [Phase ?]: 68-01: proposed_labels PRIO/effort mechanically derived from INVENTORY's locked severity scale; only area is a PENDING-AREA placeholder
- [Phase ?]: [Phase 68 Plan 02]: proposed_approach seeded from classification test-(5) clause with two real-text fallbacks (Issue-ready-draft paragraph, test-(1) clause) so no record with a genuinely nameable edit falls to the placeholder for want of the (5) span alone; dynamically-derived 26-ID placeholder set verified to exactly match the plan's literal list
- [Phase ?]: [Phase 68 Plan 02]: proposed_labels area rule extended with a documented bbj-vscode/ catch-all (-> vscode) for 6 root-level build/tooling files outside src/test/tools/, reconciling the must_haves.truths zero-out-of-set-values requirement against the action text's own else-placeholder escape hatch
- [Phase ?]: [Phase 68 Plan 03] Rendered all Other Dispositions entries as plain prose (no fenced code blocks) since the existing record-extraction regex is blind to content and would have miscounted them as major/easy-fix records
- [Phase ?]: [Phase 68 Plan 03] Split the three tasks' script code across commits per 68-02's own precedent: extraction/rendering for Tasks 1-2 landed as one coherent pass with document regeneration staged per task; Task 3's check() DOC-04 group landed separately since it could not validate the referrals sub-section before Task 2 wrote it
- [Phase ?]: 68-04: renderCoveragePreamble emits one ## Coverage block (Scope+Gaps) into both review docs; Tasks 1+2 shared a commit since the preamble is one function with no checkable intermediate split
- [Phase ?]: P61-D5-014's clause names a concrete edit unlike its Task-1 siblings; lifted verbatim and the shape discrepancy is flagged, not silently reclassified
- [Phase ?]: Fixed check()'s proposed_approach placeholder assertion from exact-26-equality to subset-of-26, so the standing gate proves incremental authoring across this plan's three tasks instead of only the pre-authoring state
- [Phase ?]: 68-06: two self-answering referral pairs recognized within the 30-entry referral list (Phase 61 referrals 1/9, 5/10, 7/11, 4/12; Phase 64 referrals 22/26) rather than resolved independently
- [Phase ?]: 68-06: 5 of 30 cross-unit referrals recorded as open gaps with a traced structural cause (closed-unit-before-referral for 3; not-yet-executed Phase 69 for 2) rather than rounded up to landed
- [Phase ?]: 68-06: added check() assertion 5b re-deriving the resolution census's four counts and failing on drift, per the plan's own Task 3 acceptance criteria (Rule 2 auto-fix)
- [Phase ?]: Write-boundary assertion in check() implements 'at most 2 entries, allowed pair only' rather than the plan's literal 'exactly 2 forever' — a permanent exactly-2 requirement would break the standing gate the moment this phase's own commits land (git status then reports 0 dirty entries).
- [Phase ?]: FIX-04 discharged this phase (Phase 68): 29 of EASY-FIXES.md's 77 rows carry user_facing: yes, discharging the requirement Phase 67 deliberately left open.
- [Phase ?]: [Phase 69 Plan 01]: ISSUE-01..04 left Pending in REQUIREMENTS.md — only the draft exists after plan 1 of 13; marking complete would misstate phase state
- [Phase ?]: [Phase 69 Plan 01]: P66-D3-001's proposed_approach (test-fixture precondition) transcribed verbatim despite not matching its own failure_scenario's fix description, per the corpus-is-closed no-re-triage rule
- [Phase ?]: [Phase 69 Plan 02]: P61-D1-004's failure_scenario RU-61-06 reference translated in place (not verbatim+appended-gloss) because this plan's own zero-RU-nn-nn verify gate is stricter than wave-1's
- [Phase ?]: [Phase 69 Plan 02]: P61-D1-007 (dedup #485 partial-overlap) and P61-D5-003 (dedup DEBT-02 internal debt item) both filed with Traceability stating what each adds, per D-08 — neither skipped
- [Phase ?]: [Phase 69 Plan 02]: ISSUE-02/03 left Pending in REQUIREMENTS.md, following 69-01's precedent — they describe filed issues, and only 40 of 144 records are rendered as drafts after plan 2 of 7 rendering plans; marking complete would misstate phase state
- [Phase ?]: Applied the settled review-internal-reference in-place-translation convention to both RU-nn-nn and bare § pointers in this shard, matching the zero-occurrence shape of 69-BODIES-01/02
- [Phase ?]: P63-D4-010's Acceptance criteria defers regression-test scope to its superseding finding P66-D4-001's own issue rather than double-committing the same work to two open issues
- [Phase ?]: P61-D5-010's Traceability describes its Phase 66 internal-debt relationship without using the internal identifier as a lookup key
- [Phase ?]: P64-D6-010's Traceability cross-references P63-D6-002 by finding ID (both filed separately, dedup: none, not a formal supersedes pair)
- [Phase ?]: Applied the settled RU-nn-nn in-place translation convention to all four gloss occurrences in this shard (RU-62-04, RU-63-03, RU-64-02 x2, RU-64-01), leaving non-RU identifiers verbatim
- [Phase ?]: [Phase 69 Plan 05]: P63-D3-005's prose rounding annotation inside effort: is review bookkeeping only, never a label source and never transcribed into the rendered body; labels parsed from proposed_labels: alone (intellij, PRIO 3, 2)
- [Phase ?]: [Phase 69 Plan 05]: All 5 D1-primary records in filing-order rows 88-107 are low severity and route public issue with no special handling (D-03) — observed that all five fall in Task 1's ten (plan text said four), a plan-text discrepancy documented rather than corrected per corpus-is-closed

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

Last session: 2026-08-20T05:40:21.503Z
Stopped at: Completed 69-05-PLAN.md
Resume file: 

None

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
