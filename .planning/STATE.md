---
gsd_state_version: 1.0
milestone: v4.5
milestone_name: Compiler Conformance (Phases 98-105) — SHIPPED 2026-09-24
status: Awaiting next milestone
stopped_at: Milestone v4.5 completed and archived; next milestone not yet defined
last_updated: "2026-09-24T04:46:27.175Z"
last_activity: 2026-09-24
last_activity_desc: Milestone v4.5 completed and archived
state_head: d81987364e09bbfad54a5a9b9f054db0868d7b06
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 44
  completed_plans: 44
  percent: 100
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-24 (v4.5 Compiler Conformance shipped and archived; next milestone not yet defined)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-24)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Planning next milestone (`/gsd-new-milestone`); merge PR #691 first

---

## Current Position

Phase: Milestone v4.5 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-09-24 — Milestone v4.5 completed and archived

### v4.5 milestone map (shipped 2026-09-24)

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

Baseline A = 168, A2 = 267, B = 658 of 1,210 (54.4 %) → exit A = 9, A2 = 22, B = 31 (2.6 %) with the
endpoint active, 0 endpoint failures (all gates passed).

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 22
**Phases completed:** 103
**Plans completed:** 393
**Days elapsed:** 236
**Velocity:** ~1.5 plans/day (lifetime); v4.5 ran at ~11 plans/day over its 4 days

Per-plan duration tables for phases 72-105 are archived with their phase artifacts under
`.planning/milestones/v4.2-phases/` through `v4.5-phases/`.

### Recent History

**v4.5 (Shipped: 2026-09-24):**

- Duration: 4 days (2026-09-20 → 2026-09-23 phase work, closed 2026-09-24)
- Phases: 8 (98-105; 105 added mid-milestone for #692)
- Plans: 44 (124 tasks)
- Key: compiler conformance. A 168 → 9, A2 267 → 22 and B 658 → 31 of 1,210 with the new `bbj-ls` `parseProgram` endpoint feeding live compiler diagnostics, one set of errors via verdict reconciliation, and large-workspace live diagnostics in 5-6 s. Audit `tech_debt` with no gaps; override closeout (3 artifacts acknowledged). Code on PR #691.

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

Per-plan metrics for phases 98-105 are in the v4.5 phase SUMMARYs under `.planning/milestones/v4.5-phases/`.

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

Full decision log in PROJECT.md's Key Decisions table; per-phase decision detail for phases 70-105
is archived with the phase directories (v4.1 embargoed off `main`; v4.2-v4.5 tracked). Standing
decisions:

- [v4.1, standing]: No CVE is requested for any advisory during implementation; CVE and severity are decided by the maintainer at publication time (a deliberate PROC-03 departure).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.4, standing]: IntelliJ consolidations ship as an abstract base plus thin no-arg subclasses, never a runtime-keyed "data-driven" single class — every per-kind difference stays compile-time checked.
- [v4.4, standing]: A runtime status or lifecycle sequence used as UAT evidence must come from a real `idea.log`, not a hand-derived trace (the Phase 97 crash-detection rework was approved on a wrong trace and reverted).
- [v4.4, standing]: IntelliJ whole-suite gates run with `--rerun-tasks` (or `cleanTest test`); a plain `test` can report UP-TO-DATE and mask a stale green.
- [v4.4, standing]: Before a squash merge, scan the branch's commit bodies for closing keywords — PR #679's squash closed #621/#594 early.
- [v4.5, standing]: new diagnostics from the compiler's parser are errors, like the compiler's own; invalid code is decided by BBj's parser, not hand-written strict checks.
- [v4.5, standing until merged]: PR #691 carries phases 98-105 and lands on `main` as one piece; scan its commit bodies for closing keywords before the squash merge.

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type
- v4.5: verdict state never cleared for deleted files (103 WR-01); open review warnings in 98/99/100/104; no SECURITY.md for 101 and 104 (full list in `milestones/v4.5-MILESTONE-AUDIT.md`)

### Pending Todos

7 pending in `.planning/todos/pending/`, all acknowledged at a milestone close (v4.4: 4, v4.5: 2 plus
the Phase 98 one):

- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection` — severity major; the Phase 97 attempt was reverted
- `2026-09-20-status-transition-log-prints-a-stale-previous-status` — only makes sense together with the one above
- `2026-09-20-phase-97-code-review-follow-ups` — partial download-progress fix, three weak source guards
- `2026-09-20-linking-interop-failures-survive-class-warmup` — root cause found (hermetic test double), not fixed
- `2026-09-21-loosen-single-line-if-balance-rule-a2-residue` — part of the A2 residue (22 at v4.5 exit)
- `2026-09-23-live-parse-waits-on-shared-connection-breaker` — 105 WR-01, deferred by the user
- `2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol` — reproduced in 104-02

### Blockers/Concerns

- **9 advisory fixes merged and released, not yet published.** The tagged release publication was waiting for exists (`v0.16.0`, 2026-09-20). Per-advisory severity/CVE decisions are the maintainer's; post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived. Entry 3 (Phase 96 Windows attestation) is fixed.

- **0.15.0 stays half-released** (VS Code only) — deliberately not reconciled (SEED-002); 0.16.0 is on both marketplaces. `manual-release.yml`'s two publish jobs still run in parallel; the by-hand runbook is `milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md`.

- **Crash detection cannot see a lost language-server connection.** LSP4IJ detaches the client before it publishes `stopped`; the Phase 97 fix failed hand UAT and was reverted. Accepted `86-05-REVIEW` WR-01 is the same defect. Upstream: LSP4IJ #1672/#1673.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts`) gates on a bare TCP connect to :5008, so with BBjServices up 11 `linking.test.ts` interop tests switch on and fail. The issue447 capability test was rewritten backend-agnostic in 97-03, so the local baseline is 11 (re-measured 2026-09-23 at the Phase 105 close); green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`.


- **Advisory review follow-ups still open:** `89-REVIEW` WR-01 (VS Code composer primary button always says "Insert"); `90-SECURITY` T-90-11 (`ComposerHandleCache` has no source guard forbidding a static map); `86-05-REVIEW` WR-02 (no exception handling around the bounded restart wait); `97-REVIEW` WR-01..WR-04 (todo filed). The `79-REVIEW` IN-02, `83-REVIEW` WR-02/WR-04 and `82-UI-REVIEW` colour items were retired by v4.4 phases 93, 94 and 96.

- **v4.5 not on `main` yet.** PR #691 carries phases 98-105; the `bbj-ls` endpoint MR (`feat/689-parse-program-endpoint`, BASIS GitLab) is opened by hand. No release has been cut since 0.16.0.
- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

Rows through 2026-09-17 are archived with their directories under `.planning/milestones/v4.4-quick/` (see its README).

---

### Roadmap Evolution

- v4.5 archived 2026-09-24 (Phases 98-105).
- Phase 105 added: Live diagnostics responsiveness on large workspaces (issue #692) — live-parse timer is armed inside buildDocuments, behind Langium's FIFO WorkspaceLock; observed in both IDEs during phase 102 UAT

## Session Continuity

Last session: 2026-09-24
Stopped at: v4.5 milestone completed and archived
Resume file: None

Next: merge PR #691 (scan commit bodies for closing keywords first), then `/gsd-new-milestone`.
The `bbj-ls` hardening follow-up is tracked separately in `bbj-ls` and is not a GSD step here.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| todos | 2026-09-23-live-parse-waits-on-shared-connection-breaker.md | (presence-only) | 2026-09-24 | v4.5 |
| todos | 2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md | (presence-only) | 2026-09-24 | v4.5 |
| deferred_items | 99/deferred-items.md: installed-extension e2e SETOPTS-in-code (#475) fails with "No document found" (stale installed bundle, not a regression) | acknowledged | 2026-09-24 | v4.5 |
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
| v4.5 Compiler Conformance | 98-105 | 44 | 2026-09-24 |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-24 after the v4.5 close. Per-plan metrics and per-phase decision
detail for phases 70-105 live with their archived phase artifacts; this file is a digest again.*

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
