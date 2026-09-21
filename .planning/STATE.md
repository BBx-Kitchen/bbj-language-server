---
gsd_state_version: 1.0
milestone: v4.5
milestone_name: Compiler Conformance (Phases 98-104) — IN PROGRESS
current_phase: 98
current_phase_name: Line-Break & Validation False Alarms (A2)
status: verifying
stopped_at: Completed 98-06-PLAN.md
last_updated: "2026-09-21T04:26:20.851Z"
last_activity: 2026-09-20
last_activity_desc: Phase 98 execution started
state_head: f38d3a82579f2f51741498af7530a9af52de145c
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 6
  completed_plans: 6
  percent: 0
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-20 (v4.5 Compiler Conformance roadmapped — Phases 98-104, 27/27 requirements mapped)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-20)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 98 — Line-Break & Validation False Alarms (A2)

---

## Current Position

Phase: 98 (Line-Break & Validation False Alarms (A2)) — EXECUTING
Plan: 6 of 6
Status: Phase complete — ready for verification
Last activity: 2026-09-20 — Phase 98 execution started

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

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Pending Todos

4 pending in `.planning/todos/pending/`, all filed 2026-09-20 and acknowledged at the v4.4 close:

- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection` — severity major; the Phase 97 attempt was reverted
- `2026-09-20-status-transition-log-prints-a-stale-previous-status` — only makes sense together with the one above
- `2026-09-20-phase-97-code-review-follow-ups` — partial download-progress fix, three weak source guards
- `2026-09-20-linking-interop-failures-survive-class-warmup` — root cause found (hermetic test double), not fixed

### Blockers/Concerns

- **9 advisory fixes merged and released, not yet published.** The tagged release publication was waiting for exists (`v0.16.0`, 2026-09-20). Per-advisory severity/CVE decisions are the maintainer's; post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived. Entry 3 (Phase 96 Windows attestation) is fixed.

- **0.15.0 stays half-released** (VS Code only) — deliberately not reconciled (SEED-002); 0.16.0 is on both marketplaces. `manual-release.yml`'s two publish jobs still run in parallel; the by-hand runbook is `milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md`.

- **Crash detection cannot see a lost language-server connection.** LSP4IJ detaches the client before it publishes `stopped`; the Phase 97 fix failed hand UAT and was reverted. Accepted `86-05-REVIEW` WR-01 is the same defect. Upstream: LSP4IJ #1672/#1673.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts`) gates on a bare TCP connect to :5008, so with BBjServices up 11 `linking.test.ts` interop tests switch on and fail. The issue447 capability test was rewritten backend-agnostic in 97-03, so the documented local baseline of 12 should now be 11 (not re-measured at close); green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`.

- **v4.5 Phase 101 needs a BBj 26.03-class build and the `bbj-ls` repository.** The endpoint phase cannot be verified against an older BBjServices, and Phases 102-104 consume it; Phase 102's fallback half is testable earlier against a service double, its live half is not.

- **Advisory review follow-ups still open:** `89-REVIEW` WR-01 (VS Code composer primary button always says "Insert"); `90-SECURITY` T-90-11 (`ComposerHandleCache` has no source guard forbidding a static map); `86-05-REVIEW` WR-02 (no exception handling around the bounded restart wait); `97-REVIEW` WR-01..WR-04 (todo filed). The `79-REVIEW` IN-02, `83-REVIEW` WR-02/WR-04 and `82-UI-REVIEW` colour items were retired by v4.4 phases 93, 94 and 96.

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).
- Phase 98 closing measurement: B regressed 658->665 of 1,210 (roadmap success criterion 5 only partially met). Root cause and full triage in 98-CONFORMANCE.md; fixing B properly needs the bbj-ls compiler-parser endpoint (Phases 101-103), not a Phase 98 line-break/DECLARE/METHODRET check.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

Rows through 2026-09-17 are archived with their directories under `.planning/milestones/v4.4-quick/` (see its README).

---

## Session Continuity

Last session: 2026-09-21T04:26:12.977Z
Stopped at: Completed 98-06-PLAN.md
Resume file: None

Next: `/gsd-discuss-phase 98` or `/gsd-plan-phase 98`.

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

- Run `/gsd-discuss-phase 98` (or `/gsd-plan-phase 98` to skip discussion) to start v4.5 Phase 98 — the A2 line-break and validation false alarms.
- Before Phase 101, make sure a BBj 26.03-class build and the `bbj-ls` repository (`/home/coder/repos/bbj-ls`) are available to work in; that phase changes no file in this repository.
- Re-run the private harness (`bbj-corpus/conformance/run.mjs --ls <this repo>`) at each fix-phase boundary; the numbers named in the roadmap's success criteria come from that run.
- Maintainer-owned: advisory publication (PROC-03) is now unblocked by tag `v0.16.0`.
- Small follow-up candidate: the published 0.16.0 release notes list #622 under "no observable change", but the fix visibly changed the crash banner's file-type coverage.
- Carried forward: triage the UAT-log issues #659-#662 and the SETOPTS discoverability follow-up #666.
- `WINDOWS.md` entry 1 still blocks `/gsd-ship` under `windows_enforce`.
