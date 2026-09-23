---
gsd_state_version: 1.0
milestone: v4.5
milestone_name: Compiler Conformance (Phases 98-104) — IN PROGRESS
current_phase: 104
current_phase_name: Conformance Measurement & Milestone Exit
status: planning
stopped_at: Phase 105 complete, ready to plan Phase 104
last_updated: "2026-09-23T17:53:04.502Z"
last_activity: 2026-09-23
last_activity_desc: Phase 105 complete, transitioned to Phase 104
state_head: 06292d2d735f0459b4275e1a837789ab98bd7017
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 40
  completed_plans: 40
  percent: 88
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-23 (Phase 105 complete — live diagnostics on large workspaces; UAT 1/1, validated, threat-secure; next Phase 104)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-23)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 104 — Conformance Measurement & Milestone Exit

---

## Current Position

Phase: 104 — Conformance Measurement & Milestone Exit
Plan: Not started
Status: Ready to plan
Phase 101 closed 2026-09-22: `bbj-ls` `parseProgram` endpoint on branch `feat/689-parse-program-endpoint` (10 commits, pushed to BASIS GitLab, MR pending by hand); verification passed 4/4 with 1 override (criterion 2, referenced-program resolution, accepted as a ParserServiceAPI limitation); code review 101-REVIEW.md open with 5 critical findings for a follow-up.
Last activity: 2026-09-23 — Phase 105 complete, transitioned to Phase 104

### v4.5 milestone map

| Phase | Name | Requirements | Repository changed |
|-------|------|--------------|--------------------|
| 98 | Line-Break & Validation False Alarms (A2) | VALID-01..05, CONF-01 | this repo (`bbj-vscode/src/language/validations/`) |
| 99 | Parser Gaps — the Largest Groups | PARSE-01, -02, -03, -07 | this repo (`bbj.langium`, lexer) |
| 100 | Parser Gaps — Remaining Groups, Long Tail & Examples | PARSE-04, -05, -06, -08, -09, EXMP-01 | this repo (grammar, `examples/`) |
| 101 | BBj Parser Endpoint in `bbj-ls` | PSRV-01, -02 | **separate `bbj-ls` repo** (Java, BASIS GitLab) |
| 102 | Live Compiler Diagnostics With Backward Compatibility | PSRV-03, -04, -05, -08, -09 | this repo (`bbj-vscode/`, `documentation/`) |
| 103 | One Set of Errors — Diagnostic Reconciliation | PSRV-06, -07 | this repo (document validator) |
| 104 | Conformance Measurement & Milestone Exit | CONF-02, -03 | private `bbj-corpus` harness + this repo's gates |
| 105 | Live Diagnostics Responsiveness on Large Workspaces | RESP-01..05 | this repo (document builder, java-interop parse lane) |

Baseline to beat: A = 168, A2 = 267, B = 658 of 1,210 (54.4 %). Exit: A ≤ 25, A2 ≤ 25, B ≤ 5 %
with the endpoint active.

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 21
**Phases completed:** 95
**Plans completed:** 349
**Days elapsed:** 231
**Velocity:** ~1.5 plans/day (lifetime); v4.4 ran at ~9 plans/day over its 4 phase-work days

Per-plan duration tables for phases 72-97 are archived with their phase artifacts under
`.planning/milestones/v4.2-phases/`, `v4.3-phases/` and `v4.4-phases/`.

### Recent History

**v4.4 (Shipped: 2026-09-20):**

- Duration: 7 days (roadmap 2026-09-17, phase work 4 days)
- Phases: 5 (93-97)
- Plans: 36 (101 tasks)
- Key: all 21 GitHub milestone #7 IntelliJ issues closed — eleven behaviour fixes (composer EDT guards and server-verdict OK gating, honest java-interop status, EM login cleanup and enablement, cached TextMate bundle, one Node.js decision engine attested on real Windows) and ten consolidations; shipped as release 0.16.0 through the verify-before-publish gate; a crash-detection rework was reverted before release; override closeout, no milestone audit (6 artifacts acknowledged). IntelliJ JUnit 865 → 1,101.

**v4.3 (Shipped: 2026-09-13):**

- Duration: 8 days
- Phases: 9 (84-92)
- Plans: 70 (174 tasks)
- Key: all 23 GitHub milestone #5 issues fixed in code — config path honored everywhere with hot-reload, IntelliJ targeted Java refresh and port auto-detect, composer cues in both IDEs plus SETOPTS-in-code and CVS() composers, composer robustness on both hosts, language-server responsiveness, host-side hygiene; milestone audit `tech_debt` with no gaps; override closeout (21 artifacts acknowledged). All phases now on `origin/main`.

**v4.2 (Shipped: 2026-09-06):**

- Duration: 3 days
- Phases: 6 (78-83)
- Plans: 25 (74 tasks)
- Key: Every open PRIO 1/2 IntelliJ issue (22) closed in code — EDT responsiveness, fail-closed EM token handling with owner-only temp files on Windows, `bbj/compile` on the shared language server, composer stale-edit guard, JDK 17 toolchain and pinned wrapper, IntelliJ JUnit suite 96 → 504; landed on `origin/main` via PR #651

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 98 P01 | 12min | 3 tasks | 5 files |
| Phase 98 P02 | 55min | 3 tasks | 6 files |
| Phase 98 P03 | 40min | 3 tasks | 5 files |
| Phase 98 P04 | 40min | 3 tasks | 5 files |
| Phase 98 P05 | 55min | 2 tasks | 3 files |
| Phase 98 P06 | 50min | 3 tasks | 8 files |
| Phase 98 P07 | 15min | 3 tasks | 4 files |
| Phase 98 P08 | 19min | 3 tasks | 5 files |
| Phase 98 P09 | 20min | 3 tasks | 1 files |
| Phase 98 P10 | 15min | 3 tasks | 5 files |
| Phase 99 P01 | 18min | 3 tasks | 5 files |
| Phase 99 P02 | 17min | 3 tasks | 4 files |
| Phase 99 P03 | 15min | 3 tasks | 4 files |
| Phase 99 P04 | 24min | 3 tasks | 4 files |
| Phase 99 P05 | 32min | 3 tasks | 2 files |
| Phase 99 P06 | 48min | 3 tasks | 8 files |
| Phase 100 P01 | 21min | 3 tasks | 5 files |
| Phase 100 P02 | 24min | 3 tasks | 5 files |
| Phase 100 P03 | 55min | 3 tasks | 5 files |
| Phase 100 P04 | 39min | 3 tasks | 7 files |
| Phase 100 P05 | 40min | 3 tasks | 18 files |
| Phase 100 P06 | 27min | 3 tasks | 2 files |
| Phase 101 P01 | 20min | 3 tasks | 9 files |
| Phase 101 P02 | 26min | 3 tasks | 4 files |
| Phase 101 P03 | ~14min | 3 tasks | 4 files |
| Phase 101 P04 | 35min | 3 tasks | 2 files |
| Phase 102 P01 | 22min | 3 tasks | 6 files |
| Phase 102 P02 | 13min | 2 tasks | 4 files |
| Phase 102 P03 | 10min | 3 tasks | 7 files |
| Phase 102 P04 | 28min | 3 tasks | 1 files |
| Phase 103 P01 | 48min | 3 tasks | 7 files |
| Phase 103 P02 | 22min | 2 tasks | 4 files |
| Phase 103 P03 | 25min | 2 tasks | 3 files |
| Phase 103 P04 | 55min | 2 tasks | 2 files |
| Phase 103 P05 | 13min | 3 tasks | 1 files |
| Phase 105 P01 | 35min | 2 tasks | 4 files |
| Phase 105 P02 | 9min | 2 tasks | 2 files |
| Phase 105 P03 | 14min | 2 tasks | 3 files |
| Phase 105 P04 | 85min | 3 tasks | 4 files |
| Phase 105 P05 | 15 min | 3 tasks | 1 files |

## Accumulated Context

### Active Constraints

- **v4.5:** the conformance corpus and harness stay outside this repository (private `bbj-corpus`, `conformance/run.mjs --ls <this repo>`), are run locally at phase boundaries and never in CI. CI protection comes from synthetic regression files under `bbj-vscode/test/test-data/` (CONF-01).
- **v4.5:** no proprietary BBj source text enters this public repository — planning files, tests and regression files describe behaviour and use word lists only.
- **v4.5:** Phase 101 changes the separate `bbj-ls` repository (Java, runs inside BBjServices on port 5008, BASIS GitLab, ships with BBj 26.03+). Both extensions must keep working unchanged against an older BBj whose `bbj-ls` lacks the endpoint (PSRV-04), decided by a once-per-connection probe, not a version-string comparison.
- **v4.5:** no hand-written strict checks are added to the Langium grammar (bare expression statements, reserved words, block balance) — BBj's parser decides those contextually; they are deferred as STRICT-01/02.
- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only. Remediation research (`SECRETS-AND-EXEC.md`, `SUPPLY-CHAIN.md`) stays untracked via `.git/info/exclude`.
- New work lands via a branch cut from `origin/main` plus a pull request, with a per-commit register check of the source diff for planning identifiers (plan/D-xx/C-xx/COMP/CR-xx tokens) before push.
- Anything both IDEs need stays a host-neutral language-server request — no reimplementation on the IntelliJ side.
- No live IntelliJ UI test coverage exists in CI. Verification pattern is plain-Java seams under plain JUnit 5, whole-file source guards for IDE-only wiring, and hand UAT in a running IDE per phase — build both distributables first, and again from the final tree after code-review fixes.
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require a Java classpath unavailable in the EmptyFileSystem test environment
- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation

### Decisions

Full decision log in PROJECT.md's Key Decisions table; per-phase decision detail for phases 70-97
is archived with the phase directories (v4.1 embargoed off `main`; v4.2-v4.4 tracked). Standing
decisions:

- [v4.1, standing]: No CVE is requested for any advisory during implementation; CVE and severity are decided by the maintainer at publication time (a deliberate PROC-03 departure).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.4, standing]: IntelliJ consolidations ship as an abstract base plus thin no-arg subclasses, never a runtime-keyed "data-driven" single class — every per-kind difference stays compile-time checked.
- [v4.4, standing]: A runtime status or lifecycle sequence used as UAT evidence must come from a real `idea.log`, not a hand-derived trace (the Phase 97 crash-detection rework was approved on a wrong trace and reverted).
- [v4.4, standing]: IntelliJ whole-suite gates run with `--rerun-tasks` (or `cleanTest test`); a plain `test` can report UP-TO-DATE and mask a stale green.
- [v4.4, standing]: Before a squash merge, scan the branch's commit bodies for closing keywords — PR #679's squash closed #621/#594 early.
- [v4.5, roadmap]: new diagnostics from the compiler's parser are errors, like the compiler's own.
- [v4.5, Phase 102]: PR #691 (phases 98-102) is held open and not merged until the whole v4.5 milestone is finished, Phase 105 included; the milestone lands on `main` as one piece.
- [v4.5, Phase 101]: referenced-program (USE/CALL) resolution is NOT observable through the `parseProgram` endpoint — BBj's parser never invokes the wired prefix algorithm under this call sequence; accepted by override 2026-09-22. Phases 102/103 must not build reference diagnostics on it. Older-server detection is a once-per-connection MethodNotFound probe.
- [v4.5, roadmap]: phase order is A2 first (98), then list A by file count (99, 100) with the long-tail triage after the named groups, then the endpoint (101) and its client (102, 103), then the closing measurement (104).
- [v4.5, roadmap]: CONF-01 is mapped once, to Phase 98; Phases 99 and 100 repeat the regression-file rule in their own success criteria rather than re-owning the requirement.
- [Phase 98]: TABLE_DATA lexer pattern: lookbehind for TABLE+whitespace, negative lookahead rejecting a following operator/bracket char, body excludes CR/LF/semicolon — Keeps table as an ordinary identifier in table = 5 / x = table + 1 while giving the statement-leading form new opaque rest-of-line meaning; verified via probe with no narrowing needed
- [Phase 98]: TableStatement grammar rule carries no embedded LabelDecl — A leading label already works via the existing isStandaloneStatement mechanism (a statement immediately following a LabelDecl is not required to have a line break before it); confirmed via probe
- [Phase 98]: RestoreStatement uses a RESTORE_NO_NL lexer token (mirroring EXIT_NO_NL), not a plain grammar-level optional, to avoid a parser ambiguity against the next statement — A plain-optional lineref parsed a bare RESTORE cleanly only when it was the last statement in the document; the lexer-level disambiguation avoids that ambiguity entirely
- [Phase 98]: Branch-target exclusion lookbehind extended to look back through a bounded run of prior comma-separated targets — Needed so the last target of a multi-target ON...GOSUB list resolves, not only a single lone target after GOTO/GOSUB; every quantifier stays bounded per the DoS mitigation
- [Phase 98]: Both METHODRET disagreements downgraded to warning; conflicting-DECLARE narrowed by scope and resolved-type relation, reusing check-classes.ts's subtype logic via new module-level exports — Matches the compiler's own acceptance of these shapes; avoids a second subtype walker by promoting classFqn/bbjSupertypesReach and adding bbjTypesAreRelated
- [Phase 98]: java.lang.String/java.lang.Integer resolve under this suite's EmptyFileSystem test setup, confirmed by probe — So the plan's flagged risk did not apply; existing DECLARE severity tests kept their original java.lang.* types
- [Phase 98]: ifStatementLineBreaks clears its before-flag on a same-line label declaration (mirrors isStandaloneStatement's existing rule); ifEndStatementLineBreaks walks past a preceding end-of-IF statement instead of stopping without clearing — Fixes the labelled single-line IF and chained-double-FI false alarms without a new traversal mechanism; the existing fixed-target isSameLine guard keeps both walks terminating
- [Phase 98]: ENDLINE_PRINT_COMMA's lookahead widened to /,(?=[ \t]*(\r?\n|;))/ — the comma-immediately-before-newline requirement (no whitespace tolerance) was the trailing-comma PRINT false alarm's actual cause, confirmed by probe against 98-RESEARCH.md's Open Question 3's first candidate; no grammar change needed
- [Phase 98]: LEN=<number> residue: a fused 'LEN=' keyword literal (from LastVerifyOption) collides with plain-identifier assignment via the generic keyword-to-ID CATEGORIES fallback, producing a wrong AST — recorded as PARSE-08 residue for Phase 100 per D-16/D-18, not fixed in this plan
- [Phase 98]: DefFunction's multi-line alternative closing FNEND made optional (grammar-only fix) — an unclosed function body now runs to end of file as one DefFunction node instead of misparsing into fallback expression statements; investigated-and-reverted a token-category fix (excluding CLASS/INTERFACE/DEF from the ID category) because it broke BBjAPI() resolution, which relies on Chevrotain's parser-error recovery over the synthetic bbj-api.ts library source; the class/interface/nested-unclosed-DEF edge case is recorded as residue for plan 06, not present in this phase's corpus target shape
- [Phase 98]: checkReturnValueInDef downgraded error->warning for a bare early-exit RETURN inside a DEF FN — unmasked by plan 05's FNEND-optional fix once these bodies started parsing correctly; matches the D-06/D-07 pattern of warning rather than silencing a compiler disagreement
- [Phase 98]: elseStatementLineBreaks now walks past a same-line ELSE/end-of-IF statement, mirroring plan 04's ifEndStatementLineBreaks fix for the sibling mask plan 04 did not touch — resolved 12 A2 files (some previously surfacing under a different message from the same underlying defect)
- [Phase 98]: closing measurement — A2 267->22 (gate met), A 168->167 (improved), B 658->665 of 1,210 (regressed, NOT fixed); B's regression is accepted, documented residue since fixing it needs the bbj-ls compiler-parser endpoint (Phases 101-103), not a line-break/DECLARE/METHODRET check; roadmap success criterion 5 recorded as only partially met
- [Phase 98]: RESTORE_NO_NL's operand lookahead widened via non-capturing alternation (existing digit/letter/underscore class OR asterisk-plus-name-start), not a single widened character class — the wider class would also match an asterisk followed by whitespace and reintroduce the x = restore * 2 false positive
- [Phase 98]: Phase 98 plan 08: elseStatementLineBreaks/ifEndStatementLineBreaks each get a local openIfs counter, incremented by a same-line closer and decremented (not stopped at) when an IF is found while positive, so a nested chain still resolves to its true governing IF while a non-nested misplaced ELSE/FI is re-flagged
- [Phase 98]: Phase 98 plan 08: ELSE does not increment ifEndStatementLineBreaks's counter -- an ELSE still belongs to an open IF, so it is a valid thing for an end-of-IF to close directly
- [Phase 98]: Phase 98 plan 08: the scalar-vs-scalar conflicting-DECLARE short circuit sits before the class-resolution guard and requires BOTH sides to be a known BBj scalar type name -- a mixed scalar/unresolvable pair still falls through unchanged to bbjTypesAreRelated
- [Phase 98]: All seven B-regressed files are REFUTED against the originally claimed keyword-branch-target mechanism; each traces to a different already-shipped fix (RESTORE, METHODRET, or DEF-FN) unmasking an unrelated real defect — Direct replay against a baseline checkout, not inferred from counts; corrects the prior plausible-but-unverified attribution ahead of the phase's final gap plan
- [Phase 98]: Phase 98 plan 10: Stephan Wald accepted both open gap-closure gates (B regression 658->665, A2 gate miss 27 vs <=25) on 2026-09-21, closing Phase 98 with two overrides entries in 98-VERIFICATION.md and all six requirement entries ticked
- [Phase 99]: [Phase 99]: LastVerifyOption's fused 'LEN=' literal split into 'LEN' '=' -- fixes the RECORD verbs' LEN= channel option for all six sibling verbs, keeps the INPUT verifier's own LEN=a,b form, and makes LEN a usable variable name as a side effect (no token-builder change needed since LEN is uppercase and inherits the generic ID-category fallback)
- [Phase 99]: [Phase 99]: FieldStatement's name part typed at AdditiveExpr (not full Expression) to dodge the relational level's '=' comparison operator; field(1)/field.x needed no alternation reorder or record-part narrowing (probed unchanged); D-17 still-flagged case is the no-value verb form (field rec$,name$)
- [Phase 99]: [Phase 99]: FeatureName gains a 'label' alternative and a new narrow LabelName rule (ID | 'label') replaces ValidName as the type of LabelDecl.name and the UserLabelRef cross-reference -- follows the already-shipped 'void' precedent; ValidName itself stays unwidened (recorded fallback not needed, confirmed by probe: no new generator ambiguity warning)
- [Phase 99]: [Phase 99]: IolistStatement grammar rule (RedimStatement-shaped, no dedicated item rule) clears the IOLIST group; check-variable-scoping.ts and line-break-validation.ts needed no change, confirmed by probe -- item-list-only variables draw only Warning-severity linking diagnostics by this project's own downgrade design
- [Phase 99]: Closing measurement (plan 05) -- A 167->53 (gate met, <=80), A2 unchanged at 30 (gate missed, exceeds <=27 by 3), B 665->666 (recorded, not gated, plan 04's classified lost accidental catch accepted as-is); gate row 2's one remaining FIELD-labeled list-A file was corrected by the orchestrator's own per-file look from "table churn" to a genuine PARSE-01 residue (the verb's value form plus a trailing `err=<line reference>` option the grammar's FieldStatement rule does not accept). Stephan Wald chose 2026-09-21 to close both open gates (A2 miss, FIELD residue) with a gap plan inside Phase 99 rather than accept them as residue; the checkCommentNewLines false alarm behind the A2 rise (8 files, one shape) is the gap plan's other target. PARSE-01/02/03/07 stay unticked pending that gap plan's re-measure.
- [Phase 99]: checkCommentNewLines needs a second, narrow exemption for lexer tokens that consume their own trailing terminator (KEYWORD_STANDALONE) — a named, closed Set checked alongside the CST-leaf exemptions, found via the plan's own conditional stop rather than the totals alone
- [Phase 100]: Empty ArrayElement brackets set the whole-array marker from the closing bracket token itself (all?="]"), matching x[all]'s node exactly
- [Phase 100]: VariableDecl/MethodDecl's array boolean renamed to arrayDims: string[] across DECLARE/FIELD/method-return/parameter, mirroring CastExpression's repeatable-pair pattern
- [Phase 100]: [Phase 100] Block-boundary comment tail reuses the identical '(";" comments+=CommentStatement)?' fragment already used on MethodDeclStart/ClassDecl headers, repeated at METHODEND/CLASSEND/INTERFACEEND/both DefFunction branches; DefFunction gained a comments AST property
- [Phase 100]: [Phase 100] ClassDecl member loop widened with an optional leading NUMBER before each member and before CLASSEND (mirrors Program/MethodDecl's existing tolerance); InterfaceDecl's identical gap deliberately left untouched, no known corpus need
- [Phase 100]: [Phase 100] line-numbered-class.bbj places each line number on its own source line rather than sharing a line with the construct it numbers, to avoid a pre-existing, unrelated line-break-validation gap (masked keywords' 'before' check is a raw line-start text check with no same-line-number tolerance for ANY masked keyword); same-line shapes are asserted parse-only in parser-keyword-statements.test.ts instead
- [Phase 100]: [Phase 100]: The custom-pattern CATEGORIES-grant mechanism proven for 'start' generalized cleanly to four more lexer tokens (NEXT_BREAK, METHODRET_END, PRINT_STANDALONE_NL, KEYWORD_STANDALONE) covering twelve words total -- each token's own bare-statement alternative is still matched by token TYPE, unaffected by the grant, so no cross-word interference; discovered 'next' was broken despite the roadmap's own already-working claim and fixed it by the same mechanism
- [Phase 100]: [Phase 100]: classend/methodend/interfaceend's EXCLUDED-set removal tried and reverted -- confirmed genuinely load-bearing (a malformed class/method/interface silently degrades to loose expression statements with zero errors once its own terminator is also ID-category); record left unfixed (PrintStatement's own RECORD flag ambiguity needs a lookahead gate, out of scope) -- both recorded as residue in 100-CONFORMANCE.md, no rescue mechanism built
- [Phase 100]: SETDRIVE gained a small statement rule reusing the shared Err fragment; PROCESS_EVENTS/FULLTEXT option tails widened to order-independent alternations over the same fragments — The compiler accepts either written order and no spaces; the grammar previously fixed one order only, and SETDRIVE had no rule at all
- [Phase 100]: CLEAR/BEGIN's plain-variable-list widening was tried and reverted -- it let a bare CLEAR/BEGIN silently swallow the next unrelated statement — Safely disambiguating needs a same-line-only lexer token; recorded as needing lexer work, not fixed
- [Phase 100]: line-break-validation.ts's lineStartRegex/lineEndRegex widened to tolerate a leading line number and a bare rem with no body; InterfaceDecl gained ClassDecl's leading-NUMBER tolerance — Closes the required A2 rise from plan 02 and the orchestrator's line-number false alarms for FIELD/METHOD/CLASSEND/INTERFACEEND; the class/interface header and methodend-in-body cases are a separate, wider, pre-existing gap left recorded
- [Phase 100]: [Phase 100]: A class's own field is read via a bare #fieldName reference, never #this!.fieldName (confirmed by direct bbjcpl probe -- #this!.method() calls work, #this!.field access never does); RELEASE takes a numeric expression, not a string; fileopen()/filesave() are valid BBj functions rejected only when their return value is discarded as a bare statement -- issue246.bbj repaired in place rather than moved+todo'd (overturns the plan's own D-18 disposition), no MODE= problem for msgbox.bbj either
- [Phase 100]: [Phase 100] Closing measurement: A 9 (<=25 gate, PASS), A2 22 (<=23 gate, PASS), B 669 (+3 vs the Phase 99 close baseline of 666, recorded not gated, unchanged since plan 01). Shape-level residue table completed to 8 of 9 rows; 1 row (a METHOD-declaration file) left genuinely pending -- cause probed but not isolated. Plan 06's own conditional stop fired: does not seal the phase, returns a blocking-human checkpoint.
- [Phase 100]: [Phase 100] Redacted corpus file paths that had leaked into 100-CONFORMANCE.md across three earlier plans' per-file-look tables -- a Rule 2 security deviation found and fixed during plan 06, not part of the plan's own task list.
- [Phase 101]: 101-01: kept ParseProgramIntegrationTest naming (not ParseProgramIT) so Surefire's default includes still run it without a pom change
- [Phase 101]: 101-01: fixed root-owned useraccts.json ownership (sudo chown to coder) so BBjServices' own admin auth could read its security file and stopbbjservices could authenticate — pre-existing sandbox misconfiguration, not a phase-caused issue
- [Phase 101]: [Phase 101 P02]: Gson was already transitively reachable at compile time through lsp4j's own dependency tree, confirmed with a clean mvn clean package; no pom.xml change was needed (plan's Branch A taken)
- [Phase 101]: [Phase 101 P02]: ParserWorker.parse() stays a synchronized instance method in this plan per its own interim design; plan 03 replaces synchronization with a single-thread executor and the latest-wins queue without changing the method signature
- [Phase 101]: [Phase 101 P02]: BbjPrefixAlgorithm.findProgram is never invoked by BBj's parser through this endpoint's getProgramFactory+loadSourceProgram+doJSONSerialization call sequence for a bare USE/CALL reference, under either type-checking setting; recorded as WINDOWS.md entry 4 (open), flagged for Phase 102/103 and the plan 04 MR text
- [Phase 101]: [Phase 101 P03]: Non-positive -Dbbj.interop.parse.* overrides fall back to the documented default rather than disabling the guard
- [Phase 101]: [Phase 101 P03]: ParserWorker.checkSize gained a cap-explicit two-argument overload so ParseGuardsTest can exercise the size guard without racing ParserWorker's static-field class-initialization order
- [Phase 101]: [Phase 101 P03]: The protected-program failure signal is a generic text heuristic ("protect"/"password" in the class name or message), not a specific BBj exception type, since none was identified and D-19 forbids depending on internal BBj source for that identification
- [Phase 101]: [Phase 101, plan 04]: Live timeout scenario skipped — a reversible mechanism (basis.java.args.BBjServices in the shared BBj.properties) exists but exercising it needed two more full BBjServices restarts on a shared config file right before the delicate 26.02 replay, and could not be landed as a permanent test without breaking the Skipped:1 acceptance criterion; timeout code stays covered in-process by ParseGuardsTest, carried as a named accepted gap
- [Phase 101]: [Phase 101, plan 04]: 101-MR-DESCRIPTION.md's Referenced-programs section corrected against plan 02's WINDOWS.md entry 4 finding (findProgram never observed invoked under type checking off) rather than shipping the plan's optimistic template text as fact
- [Phase 102]: Only MethodNotFound flips BBjParserService's on/off latch; every other failure leaves it untouched — An endpoint that answers with any recognizable failure code still proves the parseProgram method exists
- [Phase 102]: RequestCancelled is checked first and produces no diagnostic and no log line at any level — It is the server's normal answer to a superseded request on ordinary fast typing, not a failure (D-02/D-08)
- [Phase 102]: [Phase 102, plan 02]: parseErrorToRange's collapsed/inverted-range whole-line clamp restored (start character 0 whenever startCharacter<=0 OR endCharacter<=startCharacter) -- the fixture suite exposed plan 01's shipped converter producing a zero-width marker instead of spanning the whole line for those shapes; fixed in the service, matching D-11's clamp-never-drop policy
- [Phase 102]: [Phase 102, plan 03]: The live confirmation test asserts converted range shape (start line, END_OF_LINE_CHARACTER sentinel) through the exported parseErrorToRange converter, never BBj's raw reported endCharacter value — The raw endCharacter was measured exceeding the anchor line's true length in three of four live-probed cases during research, so pinning it would be green against one BBj build and red against the next
- [Phase 102]: Branch pushed and PR #691 opened for phase 102; two IDE hand-verification blocks (live diagnostics endpoint-present; older-server replay/restore) remain outstanding, recorded as a precise runbook in 102-04-SUMMARY.md rather than claimed as observed — This executor cannot see a running IDE; the human_verification_boundary constraint requires the runbook, never a simulated observation
- [Phase 103]: [Phase 103 P01]: downgradeSyntaxComplaint changes both severity AND data.code together — a severity-only downgrade would leave the diagnostic in the Parse tier and keep suppressing linking diagnostics and counting against the parse-error cap
- [Phase 103]: [Phase 103 P01]: a syntax complaint replaced by an overlapping BBj diagnostic is still recorded in the verdict state's seen set, so it carries over like a downgraded complaint between verdicts rather than reappearing as an Error the moment BBj's own diagnostic vanishes on the next edit
- [Phase 103]: forgetVerdict() is a no-op when no verdict state exists for the document, keeping the never-had-a-verdict path byte-for-byte identical to 0.16.x — avoids unconditionally re-deriving document.diagnostics for documents that never had a verdict
- [Phase 103]: resetIfGenerationChanged() clears every verdict state only on an actual decided-to-undecided connection transition, not on every undecided-latch probe — prevents redundant clearAllVerdictStates() calls before the first real parse on a fresh connection
- [Phase 103]: Carry-over reads gate on compiler trigger not being off before checking for stored verdict state, so no-state and trigger-off share one code path
- [Phase 103]: Two-independent-syntax-error test fixtures use the dangling-binary-operator pattern, not two unclosed-paren statements, since an unclosed paren mid-document swallows everything after it into one diagnostic
- [Phase 103]: [Phase 103]: [Phase 103 P04]: The endpoint-active probe always builds with validation, even for a syntax-erroring document (unlike worker.mts, which skips validation once syntaxErrors>0), and re-measures all 1,210 rejects rather than only the 669 the endpoint-absent run missed -- a verdict can turn a previously-caught reject into a newly-missed one; list B falls to 31 of 1,210 (2.6%), well under the 5% target, with 0 language-server syntax errors surviving on any of the 31 compiler-accepted files
- [Phase 103]: [Phase 103 P05]: Plan 05 is a gate/build/ship plan with no source deliverable -- every task verifies or ships plans 01-04's work, so no task-level commit exists, only the final metadata commit
- [Phase 103]: [Phase 103 P05]: The on-host pre-endpoint jar backup (bbj-ls.jar.26.02) no longer exists after the 2026-09-23 fresh BBj install; rebuilt it from the sibling bbj-ls repository at the commit before the parseProgram endpoint was added, in a scratch worktree, confirmed by unzip -l to carry no parser classes
- [Phase 105]: Direct listener on TextDocuments.onDidOpen/onDidChangeContent arms the live-parse cycle outside Langium's WorkspaceLock; compute-first publish-once debounce cycle with a state-aware publish path — Removes the first of #692's two serialization points without waiting on or enqueueing into the workspace lock
- [Phase 105]: 105-02: composeWithVerdict's stale-list case (reconcileEarlyVerdict) drops a complaint on any overlap with a verdict diagnostic even when the line text no longer matches; it only skips recording that complaint in seen when unmatched, since an unconfirmed line was never re-validated
- [Phase 105]: [Phase 105]: 105-03: The dedicated parser connection is tied to connectionGeneration, opened lazily via a shared in-flight promise (mirroring connect()'s own dedup), and falls back silently to the shared connection on an open failure or a MethodNotFound answer -- reusing the existing breaker/latch machinery instead of building a second one, per the plan's own discretion decision
- [Phase 105]: [Phase 105]: 105-04: latestLangiumBaseline(document) is the one seam every writer of document.diagnostics reads its "what did Langium last see" input through (recallLangiumSnapshot when Langium has validated this session, else the cycle's own current list stripped of compiler diagnostics) -- replaces three different ad-hoc choices the verdict branch, the bbjcpl fallback, and the USE revalidation each made on their own
- [Phase 105]: [Phase 105]: 105-04: two independent Langium syntax complaints in one test fixture need the dangling-binary-operator pattern, not an unclosed-parenthesis-plus-line-break combination -- checkLineBreaks bails unconditionally whenever document.parseResult.parserErrors.length > 0, so no real document can carry both a genuine parser error and a genuine line-break complaint at once
- [Phase 105]: Phase 105: PR #691 retitled and extended to cover phases 98-103 and 105, quoting the measured before/after medians (VS Code 58.9s->5.3s, IntelliJ 66s->6s); pushed by plain fast-forward only. — Milestone PR grows across phases rather than opening a new PR per phase; measured on a real large private workspace against real BBjServices.

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Pending Todos

5 pending in `.planning/todos/pending/`: 4 filed 2026-09-20 and acknowledged at the v4.4 close, 1
filed 2026-09-21 at the Phase 98 close:

- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection` — severity major; the Phase 97 attempt was reverted
- `2026-09-20-status-transition-log-prints-a-stale-previous-status` — only makes sense together with the one above
- `2026-09-20-phase-97-code-review-follow-ups` — partial download-progress fix, three weak source guards
- `2026-09-20-linking-interop-failures-survive-class-warmup` — root cause found (hermetic test double), not fixed
- `2026-09-21-loosen-single-line-if-balance-rule-a2-residue` — Phase 98's accepted A2 gate miss (27 vs ≤25); 5 valid single-line IF/ELSE files re-flagged by plan 08's balance-counter fix

### Blockers/Concerns

- **9 advisory fixes merged and released, not yet published.** The tagged release publication was waiting for exists (`v0.16.0`, 2026-09-20). Per-advisory severity/CVE decisions are the maintainer's; post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived. Entry 3 (Phase 96 Windows attestation) is fixed.

- **0.15.0 stays half-released** (VS Code only) — deliberately not reconciled (SEED-002); 0.16.0 is on both marketplaces. `manual-release.yml`'s two publish jobs still run in parallel; the by-hand runbook is `milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md`.

- **Crash detection cannot see a lost language-server connection.** LSP4IJ detaches the client before it publishes `stopped`; the Phase 97 fix failed hand UAT and was reverted. Accepted `86-05-REVIEW` WR-01 is the same defect. Upstream: LSP4IJ #1672/#1673.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts`) gates on a bare TCP connect to :5008, so with BBjServices up 11 `linking.test.ts` interop tests switch on and fail. The issue447 capability test was rewritten backend-agnostic in 97-03, so the local baseline is 11 (re-measured 2026-09-23 at the Phase 105 close); green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`.

- **Phase 101 closed 2026-09-22 with one accepted override** (`101-VERIFICATION.md`): referenced-program resolution through the prefix algorithm is implemented but never invoked by ParserServiceAPI under type checking off (`WINDOWS.md` entry 4 waived). Merged into `bbj-ls` `develop` as `e23d400`. The 2026-09-22 re-review on `cd5bf83` found the stuck overrun marker fixed and 4 critical / 3 warning findings open. **Those are handed off and handled in `bbj-ls` itself, outside the v4.5 GSD flow:** `/home/coder/repos/bbj-ls/HANDOFF-parse-program-hardening.md`. The v4.5 client already tolerates every one of them (any non-MethodNotFound error is logged, never shown as a diagnostic), so they don't block phases 103-105.

- **Advisory review follow-ups still open:** `89-REVIEW` WR-01 (VS Code composer primary button always says "Insert"); `90-SECURITY` T-90-11 (`ComposerHandleCache` has no source guard forbidding a static map); `86-05-REVIEW` WR-02 (no exception handling around the bounded restart wait); `97-REVIEW` WR-01..WR-04 (todo filed). The `79-REVIEW` IN-02, `83-REVIEW` WR-02/WR-04 and `82-UI-REVIEW` colour items were retired by v4.4 phases 93, 94 and 96.

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).
- **Phase 98 closed 2026-09-21 with two accepted overrides** (Stephan Wald; `98-VERIFICATION.md`): B regressed 658->665 of 1,210 (root cause and per-file evidence in `98-CONFORMANCE.md`; fixing it needs the bbj-ls compiler-parser endpoint, Phases 101-103, not a Phase 98 check), and A2 = 27 vs its ≤25 gate (5 valid single-line IF/ELSE files re-flagged by plan 08's balance-counter fix; tracked as pending todo `2026-09-21-loosen-single-line-if-balance-rule-a2-residue`). Both deltas carry forward to Phase 104's milestone exit measurement.
- **Phase 99 closed 2026-09-21 with all gates green** (A 52, A2 23, FIELD/READ/IOLIST/label groups 0; `99-VERIFICATION.md` passed 9/9). Carried forward: B = 666 of 1,210 (+1 vs the Phase 98 close, a lost accidental catch that needs the compiler-parser endpoint, Phases 101-103); the documented `FIELD` array-index form is still rejected (Phase 100 long tail); security enforcement is on and Phase 99 has no SECURITY.md yet (`/gsd-secure-phase 99`).
- Phase 100 closing gate (resolved 2026-09-22, human accepted): the last residue row was isolated (a `DEF FN` body without `FNEND` followed by a `class` block) and B stays 669 vs 666 — three accidental catches lost, none a correct diagnosis; see 100-CONFORMANCE.md

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

Rows through 2026-09-17 are archived with their directories under `.planning/milestones/v4.4-quick/` (see its README).

---

### Roadmap Evolution

- Phase 105 added: Live diagnostics responsiveness on large workspaces (issue #692) — live-parse timer is armed inside buildDocuments, behind Langium's FIFO WorkspaceLock; observed in both IDEs during phase 102 UAT

## Session Continuity

Last session: 2026-09-23T17:55:00Z
Stopped at: Phase 105 complete, ready to plan Phase 104
Resume file: None

Next: `/gsd-discuss-phase 104` or `/gsd-plan-phase 104` (exit
measurement, the last v4.5 phase); see `.planning/v4.5-MILESTONE-AUDIT.md`. The
`bbj-ls` hardening follow-up is tracked separately in `bbj-ls` (handoff doc) and is not a v4.5 step.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| debug_sessions | g-96-2-too-old-node-no-download-offer | diagnosed (G-96-2 fixed by 96-08, maintainer pass 2026-09-20) | 2026-09-20 | v4.4 |
| uat_gaps | 97/97-UAT-ARTIFACTS.md | unknown (suite-gate and artifact-hash record, not a UAT script; 0 pending scenarios) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-linking-interop-failures-survive-class-warmup.md | (presence-only) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md | (presence-only) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-phase-97-code-review-follow-ups.md | (presence-only) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-status-transition-log-prints-a-stale-previous-status.md | (presence-only) | 2026-09-20 | v4.4 |
| debug_sessions | g-88-1-hover-no-decode | diagnosed (G-88-1 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-2-composer-never-activates | diagnosed (G-88-2 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-2-docker-pull-hang | diagnosed (resolved per 88-UAT) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-3-composer-mask-literal-quoting | diagnosed (G-88-3 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-89-3-cvs-composer-unfinished-call | diagnosed (G-89-3 fixed by 89-14..16) | 2026-09-13 | v4.3 |
| debug_sessions | refresh-stream-closed | diagnosed (G-86-1 fixed by 86-05) | 2026-09-13 | v4.3 |
| quick_tasks | 1-fix-duplicate-bbj-output-channels-create | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 2-fix-em-login-bbj-not-found-in-intellij-p | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 3-fix-duplicate-bbj-output-channel-ensure- | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 4-fix-intellij-bui-dwc-passing-dash-as-con | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 5-fix-em-token-expiration-jwt-expiry-check | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 6-fix-em-login-bbj-and-em-validate-token-b | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 7-add-client-info-string-to-em-auth-token- | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 8-fix-documentation-links-add-jetbrains-ma | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 9-automate-jetbrains-marketplace-publishin | missing | 2026-09-13 | v4.3 |
| quick_tasks | 10-fix-intellij-maintoolbar-group-registrat | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 11-enhance-em-auth-token-info-string-change | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 12-use-actual-jetbrains-ide-product-name-in | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 13-fix-intellij-multi-instance-language-ser | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 14-fix-manual-release-workflow-pass-version | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 260329-oqw-pr-383-return-undefined-instead-of-empty | unknown | 2026-09-13 | v4.3 |
| debug_sessions | compile-diagnostic-getmessage-nosuchmethoderror | diagnosed (fixed by 81-07) | 2026-09-06 | v4.2 |
| debug_sessions | compile-error-response-message-could-not-be-parsed | diagnosed (fixed by 81-06) | 2026-09-06 | v4.2 |
| debug_sessions | compile-output-directory-row-not-visible | diagnosed (fixed by 81-04) | 2026-09-06 | v4.2 |
| debug_sessions | composer-intention-description-missing | diagnosed (fixed by 82-04) | 2026-09-06 | v4.2 |
| debug_sessions | windows-owner-only-tmp-error18 | diagnosed (fixed by 80-05) | 2026-09-06 | v4.2 |
| todos | 2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md | (presence-only) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-configured-node-path-suppresses-cached-download-fallback.md | promoted to PLAT-05 (v4.4 Phase 96) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-live-windows-check-for-node-auto-install-failure.md | promoted to PLAT-06 (v4.4 Phase 96) | 2026-09-06 | v4.2 |
| debug_sessions | constructor-completion | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | deprecated-strikethrough | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | prefix-diagnostic-reconciliation | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | prefix-reconciliation-final | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | use-import-static-completion | diagnosed | 2026-09-03 | v4.1 |
| todos | 2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md | (presence-only) | 2026-09-03 | v4.1 |
| todos | 2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md | (presence-only) | 2026-09-03 | v4.1 |
| uat_gaps | 59/59-UAT.md (archived v3.9) | passed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-final-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-re-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 29/29-UAT.md (archived v3.1) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 30/30-UAT.md (archived v3.1) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 24/24-UAT.md (archived v3.0) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 25/25-UAT.md (archived v3.0) | diagnosed | 2026-09-03 | v4.1 |
| verification_gaps | 50/50-VERIFICATION.md (archived v3.7) | human_needed | 2026-09-03 | v4.1 |
| verification_gaps | 46/46-VERIFICATION.md (archived v3.5) | gaps_found | 2026-09-03 | v4.1 |
| verification_gaps | 17/17-VERIFICATION.md (archived v2.0) | gaps_found | 2026-09-03 | v4.1 |
| verification_gaps | 11/11-VERIFICATION.md (archived v1.2) | human_needed | 2026-09-03 | v4.1 |
| verification_gaps | 10/10-VERIFICATION.md (archived v1.1) | gaps_found | 2026-09-03 | v4.1 |

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
| v4.1 Security Advisory Remediation | 70-77 | 37 | 2026-09-03 |
| v4.2 IntelliJ Burn-down | 78-83 | 25 | 2026-09-06 |
| v4.3 Polish & Quality | 84-92 | 70 | 2026-09-13 |
| v4.4 IntelliJ Focus | 93-97 | 36 | 2026-09-20 |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-20 after the v4.5 roadmap. Per-plan metrics and per-phase decision
detail for phases 70-97 live with their archived phase artifacts; this file is a digest again.*

## Operator Next Steps

- Run `/gsd-discuss-phase 105` to start Phase 105 — live diagnostics while the initial workspace build is still running (issue #692), then Phase 104 (exit measurement). Phase 103 closed 2026-09-23; local branch is ahead of PR #691 by the code-review fixes and the verification docs (not pushed yet). Note for future jar swaps: `stopbbjservices` on the 2026-09-23 BBj install prompts for host/port/admin login on the console; SIGTERM to the BBjServices JVM (runs as `coder`) and restarting as `coder` works.
- `bbj-ls` endpoint hardening (4 critical / 3 warning from the re-review) is decoupled from v4.5 and is done in `bbj-ls` directly: `/home/coder/repos/bbj-ls/HANDOFF-parse-program-hardening.md`. Do not run `/gsd-code-review 101 --fix` here; its fixer commits in this repo.
- Security enforcement is on: Phases 99 and 101 have no SECURITY.md (`/gsd-secure-phase 99`, `/gsd-secure-phase 101`).
- Re-run the private harness (`bbj-corpus/conformance/run.mjs --ls <this repo>`) at each fix-phase boundary; the numbers named in the roadmap's success criteria come from that run.
- Maintainer-owned: advisory publication (PROC-03) is now unblocked by tag `v0.16.0`.
- Small follow-up candidate: the published 0.16.0 release notes list #622 under "no observable change", but the fix visibly changed the crash banner's file-type coverage.
- Carried forward: triage the UAT-log issues #659-#662 and the SETOPTS discoverability follow-up #666.
- `WINDOWS.md` entry 1 still blocks `/gsd-ship` under `windows_enforce`.
