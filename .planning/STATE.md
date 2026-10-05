---
gsd_state_version: 1.0
milestone: v4.9
milestone_name: bbj-ls DENUM & Format Migration (Phases 124-130) — IN PROGRESS
current_phase: 130.1
current_phase_name: "Address tech debt: 127 review warnings and loading of binary files, intellij and vscode"
status: executing
stopped_at: Completed 130.1-06-PLAN.md
last_updated: "2026-10-05T07:00:09.838Z"
last_activity: 2026-10-05
last_activity_desc: Phase 130.1 execution started
state_head: 1f6d92db59d0ed5ef8737ae79c55d08932b11ee9
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 43
  completed_plans: 43
  percent: 100
---

# Project State: BBj Language Server

**Last Updated:** 2026-10-04 (Phase 130 Docs & Migration complete — 5/5 plans, UAT 4/4, Nyquist-compliant, 17/17 threats closed; v4.9 all 7 phases complete)

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-04)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 130.1 — Address tech debt: 127 review warnings and loading of binary files, intellij and vscode

---

## Current Position

Phase: 130.1 (Address tech debt: 127 review warnings and loading of binary files, intellij and vscode) — EXECUTING
Plan: 6 of 10
Status: Ready to execute
Last activity: 2026-10-05 — Phase 130.1 execution started

Progress: [██████████] 100% (v4.9: 7/7 phases)

### v4.9 milestone map

| Phase | Name | Requirements |
|-------|------|--------------|
| 124 | Interop Client | INT-01..05 |
| 125 | LS Formatting | FMT-01..05, FMT-08..12, SET-02, CUT-01, IJF-01 |
| 126 | LS DENUM | DEN-01, DEN-03, DEN-04, FMT-06, FMT-07 |
| 127 | VS Code Cut-Over | SET-01, SET-03, SET-04, DEN-02, DEN-05, DEN-06, CUT-02, CUT-03 |
| 128 | IntelliJ DENUM | IJF-05, IJF-06 |
| 129 | IntelliJ Verdict | IJF-02, IJF-03, IJF-04 (IJF-04 only on a "supported" verdict) |
| 130 | Docs & Migration | MIG-01..03 |

The interop client comes first. The server formatter lands together with the removal of VS Code's
jar provider and IntelliJ's switch set to off. DENUM (`bbj/denum`) follows formatting, and the VS
Code cut-over ends with an end-to-end check from the built VSIX against live BBj 26.03. The
IntelliJ DENUM action and banner come before the evaluation and the user's verdict. Docs come last.
The v4.8 map is archived in `.planning/milestones/v4.8-ROADMAP.md`.

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 23
**Phases completed:** 107
**Plans completed:** 418
**Days elapsed:** 238
**Velocity:** ~1.5 plans/day (lifetime); v4.6 ran at ~8 plans/day over its 3 days

Per-plan duration tables for phases 72-109 are archived with their phase artifacts under
`.planning/milestones/v4.2-phases/` through `v4.6-phases/`.

### Recent History

**v4.6 (Shipped: 2026-09-26):**

- Duration: 3 days (2026-09-24 → 2026-09-26)
- Phases: 4 (106-109)
- Plans: 25 (60 tasks)
- Key: user-facing bug burn-down. `on-save` really waits for a save in both IDEs and keeps the last save's compiler errors visible; one error per finding on the bbjcpl fallback; the live parse gets its own connection first; single-line IF false alarms and the use-before-assignment crash fixed; unknown Java members on resolved classes are Errors; IntelliJ detects a crashed server via LSP4IJ's unexpected-stop hook; completion fixes for FQN statics, overloads, method bodies and Java class resolution. Audit `tech_debt` with no gaps; override closeout (2 artifacts acknowledged). On `main` via PR #699 (merged 2026-09-26).

**v4.5 (Shipped: 2026-09-24):**

- Duration: 4 days (2026-09-20 → 2026-09-23 phase work, closed 2026-09-24)
- Phases: 8 (98-105; 105 added mid-milestone for #692)
- Plans: 44 (124 tasks)
- Key: compiler conformance. A 168 → 9, A2 267 → 22 and B 658 → 31 of 1,210 with the new `bbj-ls` `parseProgram` endpoint feeding live compiler diagnostics, one set of errors via verdict reconciliation, and large-workspace live diagnostics in 5-6 s. Audit `tech_debt` with no gaps; override closeout (3 artifacts acknowledged). Code on `main` via PR #691 (merged 2026-09-24).

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

Per-plan metrics for phases 98-109 are in the phase SUMMARYs under `.planning/milestones/v4.5-phases/` and `v4.6-phases/`.
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 110 P01 | 9min | 2 tasks | 5 files |
| Phase 110 P03 | 7min | 2 tasks | 2 files |
| Phase 110 P04 | 8min | 3 tasks | 7 files |
| Phase 110 P05 | 14min | 3 tasks | 9 files |
| Phase 110 P02 | 13min | 3 tasks | 7 files |
| Phase 111 P01 | 45min | 3 tasks | 3 files |
| Phase 111 P02 | 14min | 2 tasks | 2 files |
| Phase 111 P03 | 20min | 3 tasks | 4 files |
| Phase 111 P04 | 21min | 2 tasks | 3 files |
| Phase 111 P05 | 12min | 2 tasks | 5 files |
| Phase 111 P06 | 27min | 2 tasks | 4 files |
| Phase 111 P07 | 15min | 2 tasks | 5 files |
| Phase 112 P01 | 14min | 2 tasks | 2 files |
| Phase 112 P02 | 14min | 2 tasks | 4 files |
| Phase 112 P04 | 26min | 3 tasks | 7 files |
| Phase 112 P03 | 16min | 2 tasks | 7 files |
| Phase 113 P01 | 18min | 3 tasks | 3 files |
| Phase 113 P02 | 38min | 3 tasks | 9 files |
| Phase 113 P03 | 22min | 3 tasks | 7 files |
| Phase 113 P04 | 18min | 2 tasks | 5 files |
| Phase 113 P05 | 12min | 2 tasks | 6 files |
| Phase 113 P06 | 39min | 2 tasks | 6 files |
| Phase 113 P07 | 17min | 3 tasks | 9 files |
| Phase 113 P08 | 24min | 2 tasks | 5 files |
| Phase 114 P01 | 13min | 2 tasks | 6 files |
| Phase 114 P03 | 16min | 2 tasks | 4 files |
| Phase 114 P02 | 41min | 3 tasks | 31 files |
| Phase 114 P05 | 22min | 3 tasks | 10 files |
| Phase 114 P06 | 18min | 3 tasks | 15 files |
| Phase 114 P07 | 27min | 3 tasks | 7 files |
| Phase 114 P04 | 24min | 2 tasks | 1 files |
| Phase 114 P08 | 13min | 2 tasks | 10 files |
| Phase 114 P09 | 16min | 2 tasks | 16 files |
| Phase 114 P10 | 12min | 2 tasks | 6 files |
| Phase 114 P11 | 20min | 2 tasks | 17 files |
| Phase 114 P12 | 15min | 2 tasks | 25 files |
| Phase 114 P13 | 21min | 3 tasks | 6 files |
| Phase 115 P01 | 12min | 2 tasks | 4 files |
| Phase 115 P02 | 11min | 2 tasks | 1 files |
| Phase 115 P03 | 22min | 3 tasks | 1 files |
| Phase 115 P04 | 16min | 3 tasks | 7 files |
| Phase 115 P05 | 12min | 2 tasks | 4 files |
| Phase 115 P06 | 22 min | 3 tasks | 4 files |
| Phase 116 P01 | ~20min | 3 tasks | 3 files |
| Phase 116 P02 | ~30min | 2 tasks | 8 files |
| Phase 116 P03 | 20min | 2 tasks | 3 files |
| Phase 116 P04 | ~20min | 2 tasks | 5 files |
| Phase 116 P05 | 25min | 2 tasks | 4 files |
| Phase 116 P06 | ~10min | 2 tasks | 2 files |
| Phase 117 P01 | 8min | 2 tasks | 2 files |
| Phase 117 P02 | 10min | 2 tasks | 1 files |
| Phase 117 P03 | 9min | 2 tasks | 3 files |
| Phase 117 P04 | 12min | 2 tasks | 2 files |
| Phase 117 P06 | 33min | 3 tasks | 1 files |
| Phase 118 P01 | 8min | 3 tasks | 9 files |
| Phase 118 P02 | 21min | 2 tasks | 2 files |
| Phase 118 P03 | 8min | 2 tasks | 3 files |
| Phase 119 P01 | 68min | 2 tasks | 4 files |
| Phase 119 P02 | 55min | 2 tasks | 2 files |
| Phase 120 P01 | 14min | 2 tasks | 7 files |
| Phase 120 P02 | 11min | 2 tasks | 2 files |
| Phase 120 P03 | 40min | 2 tasks | 8 files |
| Phase 120 P04 | 20min | 3 tasks | 6 files |
| Phase 121 P01 | 12min | 2 tasks | 12 files |
| Phase 121 P02 | 23min | 2 tasks | 9 files |
| Phase 121 P03 | 8min | 2 tasks | 3 files |
| Phase 121 P04 | 22min | 3 tasks | 3 files |
| Phase 121 P05 | 13min | 2 tasks | 3 files |
| Phase 121 P06 | 9min | 2 tasks | 3 files |
| Phase 121 P07 | 9min | 2 tasks | 3 files |
| Phase 121 P08 | 20min | 2 tasks | 3 files |
| Phase 121 P09 | 25min | 2 tasks | 3 files |
| Phase 121 P10 | 42min | 2 tasks | 2 files |
| Phase 122 P01 | 18min | 2 tasks | 8 files |
| Phase 122 P02 | 22min | 3 tasks | 3 files |
| Phase 122 P03 | 11min | 2 tasks | 2 files |
| Phase 122 P04 | 9min | 3 tasks | 6 files |
| Phase 122 P05 | 34min | 2 tasks | 2 files |
| Phase 122 P06 | 11min | 2 tasks | 3 files |
| Phase 123 P01 | 15min | 3 tasks | 5 files |
| Phase 123 P02 | 20min | 3 tasks | 2 files |
| Phase 123 P03 | 25min | 3 tasks | 5 files |
| Phase 123 P04 | 20min | 3 tasks | 3 files |
| Phase 123 P05 | 25min | 3 tasks | 2 files |
| Phase 123 P06 | 40min | 2 tasks | 3 files |
| Phase 123 P07 | 15min | 2 tasks | 3 files |
| Phase 123 P08 | 15min | 3 tasks | 1 files |
| Phase 124 P01 | 12min | 2 tasks | 4 files |
| Phase 124 P02 | 5min | 3 tasks | 3 files |
| Phase 124 P03 | 10min | 3 tasks | 5 files |
| Phase 124 P04 | 8min | 3 tasks | 3 files |
| Phase 124 P05 | 7min | 3 tasks | 4 files |
| Phase 124 P06 | 5min | 2 tasks | 1 files |
| Phase 125 P01 | 7 min | 2 tasks | 5 files |
| Phase 125 P02 | 10 min | 2 tasks | 5 files |
| Phase 125 P03 | 14 min | 3 tasks | 8 files |
| Phase 125 P04 | 11min | 3 tasks | 5 files |
| Phase 125 P05 | 6 min | 2 tasks | 7 files |
| Phase 125 P06 | 5 min | 3 tasks | 7 files |
| Phase 126 P01 | 8min | 3 tasks | 11 files |
| Phase 126 P02 | 3 min | 2 tasks | 5 files |
| Phase 126 P03 | 12 min | 2 tasks | 4 files |
| Phase 126 P04 | 10 min | 3 tasks | 6 files |
| Phase 126 P05 | 10 min | 2 tasks | 1 files |
| Phase 126 P06 | 9 min | 2 tasks | 2 files |
| Phase 126 P07 | 5 min | 2 tasks | 6 files |
| Phase 127 P01 | 10 min | 2 tasks | 5 files |
| Phase 127 P02 | 2 min | 3 tasks | 16 files |
| Phase 127 P03 | 9 min | 2 tasks | 6 files |
| Phase 127 P04 | 8 min | 3 tasks | 8 files |
| Phase 127 P05 | 5 min | 2 tasks | 10 files |
| Phase 127 P06 | 5 min + hand check | 3 tasks | 0 files |
| Phase 128 P01 | 12 min | 3 tasks | 11 files |
| Phase 128 P02 | 6 min | 2 tasks | 8 files |
| Phase 128 P03 | 8 min | 3 tasks | 9 files |
| Phase 128 P04 | ~1 day incl. hand check | 3 tasks | 6 files |
| Phase 129 P01 | 6 min | 2 tasks | 4 files |
| Phase 129 P02 | 12min | 2 tasks | 6 files |
| Phase 129 P03 | 20 min | 3 tasks | 2 files |
| Phase 129 P04 | 30min | 3 tasks | 2 files |
| Phase 129 P05 | 13min | 3 tasks | 3 files |
| Phase 129 P06 | 6 min | 3 tasks | 5 files |
| Phase 129 P07 | 5 min | 3 tasks | 7 files |
| Phase 129 P08 | 2min | 1 tasks | 1 files |
| Phase 129 P09 | 9min | 3 tasks | 3 files |
| Phase 130 P01 | 4 min | 3 tasks | 6 files |
| Phase 130 P02 | 3 min | 2 tasks | 2 files |
| Phase 130 P03 | 8 min | 2 tasks | 2 files |
| Phase 130 P04 | 14 min | 2 tasks | 6 files |
| Phase 130 P05 | 6 min | 2 tasks | 3 files |
| Phase 130.1 P01 | 5 min | 3 tasks | 7 files |
| Phase 130.1 P03 | 6 min | 2 tasks | 4 files |
| Phase 130.1 P04 | 4 min | 2 tasks | 7 files |
| Phase 130.1 P06 | 12 min | 2 tasks | 5 files |

## Accumulated Context

### Active Constraints

- **v4.9:** hard cut-over with no fallback to `BBjCFCli.jar` or bbjlst denumbering. A BBj older than 26.03 gets a "requires BBj 26.03 or later" message. Decompiling tokenized programs through bbjlst stays.
- **v4.9:** every push to `main` publishes previews. The server formatter capability, the removal of VS Code's client-side jar provider (CUT-01) and IntelliJ's formatting switch set to off (IJF-01) therefore land in one change (Phase 125). IntelliJ formatting stays off until the Phase 129 verdict, which is a user decision checkpoint.
- **v4.9:** DENUM is a custom `bbj/denum` request, like `bbj/compile`. It edits the open buffer (undoable, left unsaved), never the file on disk, and never runs automatically on format or save. IntelliJ formatter settings travel in `initializationOptions` with a server restart on change. `indentWidth` stays 2 by default in both IDEs.
- **v4.9:** bbj-ls is not changed in this milestone; anything it should change is drafted as a bbj-ls issue. Adding a `bbj/*` request means updating `ComposerRequestContractTest` and running `bbj-intellij ./gradlew test`, which the vitest gates do not cover.
- **v4.8:** docs only; the only non-doc changes are a new `.vscode/tasks.json` build task, a `preLaunchTask` in `.vscode/launch.json` that uses it, and `npm run build` in `.gitpod.yml`'s `init` (user-approved 2026-09-30). Nothing else outside the docs. The user wants a short milestone: one phase, one docs PR, no extra work folded in.
- **v4.7:** the milestone PR carries one `Closes #N` line per issue (61 issues across Phases 110-122); an issue table does not close issues. Before the squash merge, scan the branch's commit bodies for closing keywords.
- **v4.7:** Phase 122 changes `preview.yml`, `manual-release.yml` and `vscode:prepublish`, which publish to both marketplaces on every push to `main`. The publish workflows cannot be run from the branch without publishing: check them statically, run packaging only up to the publish step, and watch the first preview run after the merge.
- **v4.7:** do not install or run langium 4.4 inside `bbj-vscode`; the DEP-05 upstream repro lives outside this repository.
- **v4.7:** "unchanged behaviour" in the refactor phases (113's consolidation, 118-121) means the existing suites pass without assertion changes, compared against the phase base when in doubt.
- **v4.5:** the conformance corpus and harness stay outside this repository (private `bbj-corpus`, `conformance/run.mjs --ls <this repo>`), are run locally at phase boundaries and never in CI. CI protection comes from synthetic regression files under `bbj-vscode/test/test-data/` (CONF-01). v4.7 Phase 119 (grammar) uses it.
- **v4.5:** no proprietary BBj source text enters this public repository — planning files, tests and regression files describe behaviour and use word lists only.
- **v4.5:** Phase 101 changes the separate `bbj-ls` repository (Java, runs inside BBjServices on port 5008, BASIS GitLab, ships with BBj 26.03+). Both extensions must keep working unchanged against an older BBj whose `bbj-ls` lacks the endpoint (PSRV-04), decided by a once-per-connection probe, not a version-string comparison.
- **v4.5:** no hand-written strict checks are added to the Langium grammar (bare expression statements, reserved words, block balance) — BBj's parser decides those contextually; they are deferred as STRICT-01/02.
- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only. Remediation research (`SECRETS-AND-EXEC.md`, `SUPPLY-CHAIN.md`) stays untracked via `.git/info/exclude`.
- New work lands via a branch cut from `origin/main` plus a pull request, with a per-commit register check of the source diff for planning identifiers (plan/D-xx/C-xx/COMP/CR-xx tokens) before push.
- Anything both IDEs need stays a host-neutral language-server request — no reimplementation on the IntelliJ side.
- No live IntelliJ UI test coverage exists in CI. Verification pattern is plain-Java seams under plain JUnit 5, whole-file source guards for IDE-only wiring, and hand UAT in a running IDE per phase — build both distributables first, and again from the final tree after code-review fixes.
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests

### Decisions

Full decision log in PROJECT.md's Key Decisions table; per-phase decision detail for phases 70-109
is archived with the phase directories (v4.1 embargoed off `main`; v4.2-v4.6 tracked). Standing
decisions:

- [v4.1, standing]: No CVE is requested for any advisory during implementation; CVE and severity are decided by the maintainer at publication time (a deliberate PROC-03 departure).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.4, standing]: IntelliJ consolidations ship as an abstract base plus thin no-arg subclasses, never a runtime-keyed "data-driven" single class — every per-kind difference stays compile-time checked.
- [v4.9 Phase 129]: IntelliJ LSP formatting is `supported` (`LSP_FORMATTING_ENABLED = true`), the user's override of Claude's `disabled` recommendation; CRLF with Line ending CRLF silently formats nothing in IntelliJ (LSP4IJ #381), kept as a known issue and stated on the settings page. All 15 formatter settings are on the IntelliJ BBj page and reach the server via `initializationOptions.formatter`; Apply restarts the server.
- [v4.4, standing]: A runtime status or lifecycle sequence used as UAT evidence must come from a real `idea.log`, not a hand-derived trace (the Phase 97 crash-detection rework was approved on a wrong trace and reverted).
- [v4.4, standing]: IntelliJ whole-suite gates run with `--rerun-tasks` (or `cleanTest test`); a plain `test` can report UP-TO-DATE and mask a stale green.
- [v4.4, standing]: Before a squash merge, scan the branch's commit bodies for closing keywords — PR #679's squash closed #621/#594 early.
- [v4.5, standing]: new diagnostics from the compiler's parser are errors, like the compiler's own; invalid code is decided by BBj's parser, not hand-written strict checks.
- [v4.5]: PR #691 carried phases 98-105 and merged to `main` as one piece on 2026-09-24.
- [v4.6, standing]: an LSP4IJ unexpected-stop hook is the only IntelliJ crash signal; the status sequence alone cannot tell a crash from a stop.
- [v4.6]: PR #699 (`gsd/v4.6-user-facing-bug-burndown`) carried phases 106-109 and merged to `main` as one piece on 2026-09-26.
- [v4.7 roadmap]: #559's own diagnosis is superseded by the 2026-09-20 todo (the hermetic test double lacks the classes; the describe block never reaches :5008); TEST-05 follows the todo.
- [v4.7 roadmap]: #511 is fixed by gating only a workspace-scoped `bbj.configPath` behind VS Code Workspace Trust; `configPath` stays deliberately un-anchored to the workspace folder for system-wide config files.
- [v4.7 roadmap]: all workflow and packaging-script changes (CI-01..03, CI-05..09) are one late phase (122) so each workflow file is rewritten once; DEP-01 and CI-04 land earlier in Phase 117 because they do not change what a publish run does.
- [Phase 110]: 110-01: interop host/port validated through one shared module (interop-config.ts); default host consolidated to 'localhost' everywhere
- [Phase 110]: 110-03: isTokenizedFile and statSize both lstat-first and reject non-regular files; O_NOFOLLOW/O_NONBLOCK requested where the platform defines them, with an explicit typeof-number check to avoid silent Windows coercion — Closes issue #585: a symlink, directory or FIFO placed at the decompile probe path could redirect the read or block the extension host
- [Phase 110]: 110-04: bbj.formatter.javaPath (scope: machine) resolved/verified by formatter-java-resolver.ts before every spawn; a set value never falls back to PATH, an empty value is resolved by the module's own checked PATH walk — Closes issue #605: the formatter spawned a bare java from PATH with no check
- [Phase 110]: 110-05: bbj.configPath's workspace-scoped value is gated behind Workspace Trust in the VS Code client (effectiveConfigPath); initializationOptions, the settings push/pull, and the client's own config-association fallback all read through it; configPath itself stays un-anchored
- [Phase 110]: 110-02: One plain path-containment.ts module (isPathInside/containedPrefixCandidates) decides every PREFIX-membership check lexically via path.relative, Windows-only case-insensitive; the document builder, scope provider, USE-file validator, revalidation and isExternalDocument() all filter through it, closing issues #526 and #579.
- [Phase 110 UAT]: G-110-1 (formatter no-op with `javaPath` empty) is a pre-existing crash in the vendored formatter jar under `--single-line-if` on block IFs, only logged; deferred out of the phase. The user is considering moving the formatter into bbj-ls behind RPC and MCP (many Bugzilla formatter bugs).
- [Phase 111]: 111-01: java-peer-guard.ts is the single owner of Java-interop peer data bounds (length limits, truncateText, sanitizeJavaClassDto); resolveClass() guards its entry against an unusable class name and sanitizes before storeJavaClass(); Phase 2 bounds javadoc/real-name with one combined warn line per class — SEC-03 (#523): resolveClass() copied peer fields onto the AST unchecked
- [Phase 111]: 111-02: javaMemberAccess flag on LinkingErrorData plus a second applyDiagnosticHierarchy Rule 2 exemption keeps an unresolved Java member Warning on an uncertain receiver visible next to an unrelated Error; javaMemberLinkingMessage replaces the 'NamedElement' wording, no new dedup code needed (Phase 107's dropShadowedMemberLinkingDiagnostics already covers the certain-receiver case)
- [Phase 111]: 111-03: escapeMarkdown/toFenceSafeLine in java-peer-guard.ts applied once at hover's and completion's render boundary, neutralizing Markdown link/image syntax and fenced-code break-out in Java documentation (SEC-04, #524); the less-than sign is deliberately left unescaped (2026-09-26 user decision) so javadoc HTML tags stay readable
- [Phase 111]: 111-04: isKnownJavaPackage(qualifiedName) on JavaInteropService answers from the in-memory package tree only (never sends a request); tryResolveJavaReference in bbj-scope-local.ts returns before any class request when the name is already a known package, covering the USE branch, its $ fallback, the qualified JavaTypeRef branch and the MemberCall FQN preload alike — addresses issue #676: "Java class java.io has no container" log line
- [Phase 111]: 111-04: storeJavaClass's leaf step keeps an existing JavaPackage intact on a colliding class name (defence in depth): the class lands on the classpath fallback instead of overwriting the package; the "has no container" console.error stays for any other genuinely unexpected missing container, not downgraded as the fix
- [Phase 111]: 111-05: isJavaQualifiedName in java-peer-guard.ts gates both createUseAction and completeAutoImportClasses before either builds a use TextEdit; filtering happens before ranking/indexing so the preferred flag naturally moves to the next valid candidate when the top-ranked one is dropped (SEC-05, #525)
- [Phase 111]: 111-06: Phase 1 method/constructor parameters defaulted to [] beside the existing fields/methods defaults, closing the absent-parameters Phase 2 crash (SEC-03 gap 1) — Mirrors the javaClass.fields ??= [] precedent already in resolveClass Phase 1
- [Phase 111 UAT]: G-111-2 — the installed javadoc ends each member with a BASIS `[Docs](https://documentation.basis.cloud/...)` link that SEC-04 escaping turned into literal text. 111-07: escapeJavadocMarkdown keeps exactly one trailing link of that shape clickable (label Docs, https, host documentation.basis.cloud, restricted path); everything else stays escaped. IntelliJ/LSP4IJ shows raw javadoc HTML literally, so leaving `<` unescaped holds.
- [Phase 111]: 111-06: boundedJavadocName truncates hover's javadoc-file MethodDoc fallback name and each parameter name at MAX_JAVA_IDENTIFIER_LENGTH, falling back to the node's own bounded name on a non-string value (SEC-04/D-02 gap 2) — Closes the one D-02 hover path left unbounded; mirrors the interop path's realName bound
- [Phase 112]: 112-01: web.bbj requires a username; admin123 kept only for username! = "admin" with an empty password; one shared report_failure reporter (MSGBOX + release 1) backs the login-rejection path and every EM step after login, each with its own err= label
- [Phase 112]: 112-02: complete port of bbj-intellij's JwtValidity.check into src/em-token-validity.ts (strict base64url decode, Number.isSafeInteger overflow guard); getEMCredentials deletes bbj.em.token and re-prompts for any token it cannot positively decode as unexpired
- [Phase 112]: 112-04: Commands.cjs loaded and executed under vitest via a node:module registerHooks harness (issue #565); runWeb's legacy settings credentials fallback removed (SEC-12 Commands.cjs half); a pre-existing openEnterpriseManager PropertiesReader argument-shape bug (broken EM URL, never exercisable before this harness) fixed as a Rule 1 deviation
- [Phase 112]: 112-03: both IDE EM login prompts pre-fill the last successfully used username via a plain seam (em-username-memory.ts / EmUsernameMemory.java) over context.globalState / PropertiesComponent, remembered only after the token is stored
- [Phase 113]: 113-01: three new *-composer-ui.ts test files execute addWindow, addChildWindow and SETOPTS composer registration, Code Action providers and commands unmocked, pinning labels/ranges/preserved bits as literals ahead of the plan 05-08 consolidation — Closes issue #628 (TEST-10): every prior test file replaced these register functions with vi.fn(), so their CodeActionProvider classes and command callbacks had never executed under test
- [Phase 113]: 113-02: webview-message-guard.ts (isPlainObject/isString/isBoolean/isFiniteInt/isStringArray/isIntArray/isOneOf/isPanelMessage) guards all six composer webviews inline as the handler's first statement; tristate guard runs before its sender() round-trip; config.bbx apply's pre-existing missing value-validity break left untouched (deferred, Open Question 1)
- [Phase 113]: 113-03: assignToError joins ComposerModels.MsgboxPreview/CvsPreview and both dialogs render it via labeledWithError; CVS prefills s$; AddWindowComposerDialog/ComposerLauncher class docs now describe edit-in-place and all six composer kinds — IntelliJ half of SEC-11 (issue #626) plus DOC-01 (issue #595); SEC-11 stays open until plan 04's shared LS-side validation lands
- [Phase 113]: 113-04: validateAssignTo(text, resultType) in msgbox-composer.ts is the one shared validator; msgboxPreview/cvsPreview both apply the same shown-field rule (editMode !== true && assignTo present) to compute assignToError and fold it into valid; CVS prefills s$
- [Phase 113]: 113-05: composer-commands.ts moved from src/language/ to bbj-vscode/src/composer-commands.ts (REF-03); five internal imports rewritten to relative-local, main.ts/test/IntelliJ contract-test/model-doc references updated to match — Per D-13: the composer request layer sits next to the composer modules it re-exposes, stays language-server code bundled into main.cjs, with unchanged behaviour
- [Phase 113]: 113-06: composer-call-scanner.ts is the one place scanArgs/trimmedRange and the name-parameterised call locator (findCalls/findCallAt) live; CVS's stricter identifier/dot boundary is preserved via an explicit notAfterIdentifierOrDot option rather than folding it into one shared plain regex template
- [Phase 113]: 113-07: buildComposerCsp(webview) in webview-csp.ts is the single owner of the composer webview CSP array and nonce; all six panels call it in getHtml, byte-identical output, closing REF-07 (#533)
- [Phase 113]: 113-08: windowPanelArgAt(spec, uri, line, lineText, character) is the one shared Code Action helper; each composer's addXPanelArgAt is a one-line call with its own spec; requireFlagsSlot stays a per-kind spec option (true for addChildWindow, false for addWindow), never unified in either direction
- [Phase 114]: 114-01: vitest.config.ts declares test.include ['test/**/*.test.ts'] and test.exclude ['out/**', 'node_modules/**'] (D-11), verified byte-identical to the 159-file pre-change discovered set via vitest list --filesOnly
- [Phase 114]: 114-01: baseline/suite-digest.mjs plus base-sha.txt, files-before.txt, suite-before.txt captured from the untouched phase base tree; every later 114-xx plan compares its D-07/D-10/D-11 behaviour-neutrality claims against them
- [Phase 114]: 114-03: progressReporter(indicator) extracted as a package-visible static factory calling setIndeterminate(false) before every setText/setFraction; Proxy-based recording-fake test replaces the substring guard — The substring guard could not detect the real bug (indicator reset between chunks by the platform's saveToFile); only a fake invoked 2+ times with an interleaved reset proves it
- [Phase 114]: 114-03: bbjcplAvailability guard is reflective (getMethod + JsonNotification annotation value + ServiceEndpoints.getSupportedMethods), replacing a comment-blind text-scanning guard — A commented-out annotation or a changed parameter type still passed the old text-count/brace-scan guard; the reflective check mirrors exactly what LSP4IJ itself checks at registration
- [Phase 114]: 114-02: 28 un-gated test files (production createBBjServices + initializeWorkspace, not gated on shouldRunBBjTests) moved to createBBjTestServices; hookTimeoutSuites=0 across all whole-suite runs, confirming the real Java-interop socket round trip was the hook-timeout cost — D-08/D-09: harness-only fix, no src/ change; no offline fallback needed, every migrated test passes on the double
- [Phase 114]: 114-05: eslint.config.js spreads tseslint.configs.recommended unwrapped (reaching .cjs too) plus D-01/D-02 overrides; prefer-const autofix landed in 7 files leaving exactly the 51-finding hand-fix list; a new disable-directive guard test rejects file-wide/reason-less lint suppressions
- [Phase 114]: 114-06: 32 src lint findings from 114-05 fixed by hand (20 no-explicit-any via real/structural types, 9 unused names via optional catch bindings/underscore params, 3 small CST/const/param fixes); npx eslint src --max-warnings 0 is clean, build green — lineBreakMap typed LineBreakConfig<AstNode>[] with per-entry casts on the four helper-built configs, not a union of concrete configs (which broke checkLineBreaks' generic dispatch call); readSimpleName narrows to string|undefined in java-javadoc.ts (feeds .split) but stays unknown in bbj-hover.ts (only template-interpolated)
- [Phase 114]: 114-07: tsconfig.test.json repaired (extends, noEmit, rootDir ".", noImplicitAny false commented) behind a new typecheck:test script; baseline/typecheck-before.txt committed (399 errors, 76 files, grouped by owning plan); bbj-comment-provider.ts's two comment arrays typed explicitly (string | undefined)[] since evolving-array-type inference for a bare const [] only fires when noImplicitAny is on, and the relaxed test config turned this src file's inferred type into never[]
- [Phase 114]: 114-07: bbj-test-module.ts's fake Java AST objects rebuilt via typed makeMethod/makeField/makeParameter factories — fixing the $type discriminant (object -> .$type string) unmasked that deprecated/isStatic were silently missing on every method/field object; the factories set both explicitly plus $container on every parameter once its owning method exists
- [Phase 114]: 114-07: commands-cjs-harness.ts's CommandsModule/ConfigPathCacheModule interfaces typed with the tests' own call shapes (setResolvedConfigPath narrowed to {path, exists} rather than the full production ResolvedConfigPathResult); fakeVscode/fakeProcessRunner fakes given real parameter lists so mock.calls tuples type-check, closing the largest single test-tree error concentration (399 -> 300 errors) with no assertion changes
- [Phase 114]: 114-04: WireRecordingInteropService overrides the protected wrapSocket seam to judge issue447's live capability from the wire and force the real fallback, replacing the tautological hasCompleteClassIndex assertion — RESEARCH Open Question 1, option b: reuses the existing test seam already used by fake-interop-peer.ts, exercises the real MethodNotFound detection instead of bypassing it, and needs zero src/ changes
- [Phase 114]: 114-08: lint plan C closed the remaining 18+2 test-file lint findings and their overlapping type errors in one pass across ten files (NormalizedTextDocuments<TextDocument> generics, Diagnostic.getMessageString, createRequire(import.meta.url) loader, namespace Node-builtin imports, JavadocProviderUnderTest's forwarded lazyLoad param, rounded-out in-memory FileSystemProvider fakes) — npm run lint now exits 0 for the whole tree
- [Phase 114]: 114-09: config-reload-host.test.ts's Mock-shaped fake target type is declared standalone, not intersected with RestartTarget (intersecting a shared property name across an interface and an object-literal type combines both declared types, producing an unsatisfiable target); overrides is retyped to match
- [Phase 114]: 114-09: logger.test.ts's debug=false case wraps the literal in Boolean(false), not a : boolean annotation alone -- TS control-flow analysis narrows a never-reassigned const to its own literal type at use sites regardless of an explicit widening annotation
- [Phase 114]: 114-10: the six largest string|MarkupContent message-reading test files (line-break-validation, line-break-single-line-if, parser-keyword-statements, unresolvable-type, classes, variable-scoping) now read diagnostic text through Diagnostic.getMessageString(d); variable-scoping.test.ts's one always-true SymbolRef/FieldDecl comparison was dropped as a documented vacuous clause, predicate unchanged in what it selects
- [Phase 114]: 114-11: parser.test.ts's and imports.test.ts's apparent AST-narrowing/document-typing errors were collateral damage from a missing relative-import .js suffix, not missing isXxx()/isBbjDocument guards -- fixing the import restored the existing guards' narrowing with no new guard code — Under node16/nodenext module resolution an extensionless relative import still error-reports with a 'did you mean .js' hint but does not resolve for type-checking, so the imported guard functions typed as implicit any and lost all narrowing power
- [Phase 114]: 114-12: 13 default-import files (+ orchestrator-assigned eslint-disable-directives.test.ts) use namespace fs/os/path/crypto imports matching src's esModuleInterop-false convention; 9 suffix-only files gain .js; both composer UI tests' hoisted FakeRange constructor is overloaded to accept both vscode.Range forms (4 numbers, or 2 Positions with trailing undefined), matching production's own new vscode.Range(pos, pos) call sites -- npm run typecheck:test now exits 0 for the whole test tree
- [Phase 114]: 114-13: id: build plus steps.build.outcome gates Lint and Type-check test tree independently after Build in build.yml; Test's if: success() || failure() stays unchanged so it still reports when a gate fails
- [Phase 114]: 114-13: the Windows IntelliJ download-progress re-check (approved on Linux only) is filed as a new opportunistic pending todo rather than reopening or blocking the phase
- [Phase 115]: Human approved tsx 4.23.15 verbatim at the blocking-human legitimacy checkpoint before install (D-15)
- [Phase 115]: Installed tsx with --save-exact --ignore-scripts so bbj-vscode's own prepare script does not run under local Node 24 during the devDependency install
- [Phase 115]: 115-02: runRequest is the one generic scaffold every case runs through; deriveStatus (present && typeMatch, every assertion passed) alone derives status; isPeerErrorReply excludes vscode-jsonrpc's four transport codes so only a genuine peer error reply can satisfy case 17's acceptsPeerError opt-in; connect() disposes on socket close
- [Phase 115]: 115-02: case 12's field checks on the first returned class now count toward its status through the shared scaffold (an intentional tightening vs. the old inline wrapper, which discarded fieldChecks); cases 9/10/13/14 keep their tautological assertions until the next plan (D-21 ordering)
- [Phase 115]: 115-03: One CRITICAL_FIELDS list drives the gate/report/exit code (evaluateGate); cases 9/10/13/14 now each report one real disjunction assertion; case 10 opts into the scaffold's acceptsPeerError path like case 17; the JSON highlighter highlights before escaping so keys/strings colour correctly
- [Phase 115]: 115-04: side-effect-free types.ts/scaffold.ts/cases.ts/gate.ts plus a thin run-tests.ts CLI; a real loopback net.createServer + vscode-jsonrpc fake peer drives all 17 cases, the #514 regression and every D-19 mutation through 26 CI tests with no :5008 dependency — D-12/D-17/D-18/D-19: module split and CI coverage were the third step in D-21's ordering, after the scaffold and case/gate fixes landed in 115-02/03
- [Phase 115]: 115-05: generateReport's argument order is (results, matrixRows, verdict, host, port, generatedAt?) per the plan's stated signature; the one run-tests.ts call site was updated to match
- [Phase 115]: 115-05: toJsonText is exported from report.ts (beyond the plan's stated export list) so the value-to-JSON-text helper's undefined-to-'null' behavior could be tested directly
- [Phase 116]: unusedLoopbackPort() reuses startLoopbackPeer() (bind-then-close) instead of a second hand-rolled net.createServer, so loopback-jsonrpc-peer.ts has exactly one listen(0, '127.0.0.1') call site
- [Phase 116]: 116-01: interop-harness-fake-peer.ts's startFakePeer is now a thin four-entry handler-map adapter over the shared startLoopbackPeer; a toFakePeerContext() helper narrows the richer LoopbackPeerContext down to the harness's own drop()-only FakePeerContext
- [Phase 116]: 116-01: Task 3's resolution-lock concurrency assertion was settled by a throwaway probe (run once, deleted before commit) confirming distinct-class-name lookups serialize on the wire one at a time, in call order (max in-flight 1)
- [Phase 116]: 116-02: registerRefreshJavaClassesRequest/registerConfigurationChangeHandler(connection, deps) extraction moved both main.ts LSP handlers out behaviour-neutrally; one shared ReloadJavaClassesDeps closure feeds both, logger.info stays a direct call while setLogLevel is a dep
- [Phase 116]: 116-02: three pre-existing whole-file source-guard tests (config-hot-reload-wiring, config-path-resolution, interop-config) grepped main.ts's literal text and broke when the handler move relocated their target call sites; repointed at configuration-change-handler.ts with counts preserved
- [Phase 116]: 116-03: makeMethod gained a trailing opts.isStatic parameter (matching makeField's shape) instead of a second static-method helper — keeps one method-building function for every fixture class
- [Phase 116]: 116-03: the #505 scope-cost-regression signature-type test's fixture types moved from java.util.List/java.util.Map to java.util.Collection/java.util.SortedMap — the completed interop fixture now preloads List and Map, so the test needs distinct unpreloaded classes to keep its original assertion strength
- [Phase 116]: 116-04: the JAVA_PRIMITIVE_TYPE_NAMES src fix is narrow — a new bbj-scope-local.ts processNode branch (SimpleTypeRef primitive) and a bbj-scope.ts resolveClassScopeByName offer (primitive-only, ahead of the unchanged global scope); every other name, including capitalized classes like Byte, is unaffected
- [Phase 116]: 116-04: 'Array type ref' uses methodret #strings (not the null() fallback the plan allowed); it validated cleanly on the first attempt
- [Phase 116]: 116-05: suppress-object-receiver-warning chosen for the java.lang.Object receiver Warning (Task 1's blocking-human checkpoint, resolved by the human at plan time); processLinkingErrors now skips a member reached through an exactly-java.lang.Object receiver, and 'Release usage' (TEST-04's last disabled assertion) asserts expectNoValidationErrors and passes
- [Phase 116]: 116-06: isInteropPeerAnswering replaces isPortOpen; shouldRunBBjTests() gates on a real getClassInfo answer for java.lang.Object over a 3000ms probe
- [Phase 116]: 116-06: Both whole-suite runs (RUN_BBJ_TESTS=0 and =1) reported numFailedTests 0 on first measurement; no failure needed dispositioning, TEST-05 complete
- [Phase 117]: 117-01: regenerated package-lock.json with --package-lock-only --ignore-scripts (not plain npm install/ci), avoiding the Node 24 langium-generate prepare-script break while moving vsce to devDependencies
- [Phase 117]: 117-02: langium/langium-cli held via versions: ["4.4.x"] npm semver range (not bare dependency-name or update-types), proven by semver satisfies checks against 4.4.0/4.4.9 (matched) and 4.3.1/4.5.0 (not matched)
- [Phase 117]: 117-02: github-actions Dependabot entry groups all actions into one weekly PR (patterns ["*"]) since preview.yml has no path filter and every push to main publishes previews
- [Phase 117]: 117-03: bom.json's purl is asserted self-consistent (pkg:maven/${group}/${name}@${version}) and the pin's relativePath is asserted to equal lib/${name}-${version}.jar, so the SBOM, the purl and the vendored filename cannot silently drift apart — Near-zero-cost extension of the drift-guard assertion block, catching a coordinate/filename mismatch the plan's literal ask did not require but the same test naturally covers
- [Phase 117]: 117-04: Guava bumped from 31.1-jre to 33.7.1-jre (D-05) with an optional argv port added to SocketServiceApp (D-12) for the live D-06 smoke test; before/after harness comparison proved byte-identical results
- [Phase 117]: 117-05: Toy and structurally-faithful bbj-subset grammars (72-alt Statement, 7-level Expression chain, real MemberCall call loop) did not reproduce either langium 4.4 regression (parse-recovery slowdown, lost DEF FN completion params) via raw LangiumParser.parse() or full parseHelper pipeline; harness version isolation (chevrotain 12.0.0/13.2.0) confirmed sound; plan halted, DEP-05 repro half left open pending human decision
- [Phase 117]: 117-06: langium 4.4.0 slowdown + DEF FN completion loss both reproduce with the real bbj-vscode server (git-archive sibling copies, each with its own langium-cli generate); ladder strips to 59 parser rules, minimal/ deliverable runs in ~4s; chevrotain-allstar transitive-dep drift (0.4.4 vs pinned 0.4.3) found and pinned to keep the 4.3.1 baseline faithful; DEP-05 complete, ISSUE-DRAFT.md not filed
- [Phase 118]: 118-01: rewrote each lib/*.bbl from its .ts export's evaluated value via a throwaway tsx script (never hand-copied), unified all four catalog wrappers to one closing shape, and added bbl-catalog-drift.test.ts as the byte-exact guard
- [Phase 118]: 118-02: two-directional package.json-vs-COMPILER_OPTIONS drift test (compiler-options-package-json-drift.test.ts), NOT_BBJCPL_FLAGS allow-list for bbj.compiler.trigger self-checked against both sides; zero data edits needed, both a parser-keyword-statements timing flake and installed-extension-e2e's stale-bundle failure confirmed pre-existing against the phase base commit
- [Phase 118]: 118-03: getFunctionReference lands in utils.ts next to readSimpleName, not in bbj-nodedescription-provider.ts as the issue's own suggested home, because that file is a Langium service class
- [Phase 118]: 118-03: Both protected getFunctionReference methods were deleted outright rather than kept as thin delegates -- no src or test file overrode or called either one, confirmed before deletion
- [Phase 119]: 119-01: kept the D-04 non-greedy BBjFilePath terminal fix; D-05 base check confirmed it was load-bearing (base grammar produced one VariableDecl named 'b' instead of two)
- [Phase 119]: 119-01: test/parser-keyword-statements.test.ts and test/functional/installed-extension-e2e.test.ts whole-suite failures classified as pre-existing contention/stale-bundle flakiness (5 whole-suite runs + 2 isolated runs across base and HEAD), not a regression from the grammar change
- [Phase 119]: 119-02: shared ChannelAndOptions fragment for the PRINT/WRITE and READ/INPUT openings; generated/ast.ts stays byte-identical and the whole phase re-measures clean against the base
- [Phase 119]: 119-02: whole-suite contention flakes recurred on a different unrelated test each of three runs (parser-keyword-statements, document-symbol, on-save-kept-errors); all pass in isolation and a third run matched the base's failed-name list exactly, confirming pre-existing worker contention, not a regression
- [Phase 120]: 120-01: check-classes.ts split into class-types.ts/check-cyclic-inheritance.ts/check-class-reference.ts/check-return-types.ts/check-constructor.ts as exported free functions taking their service (inferer/javaInterop) as a trailing argument; check-classes.ts keeps only registerClassChecks with no thisArg
- [Phase 120]: 120-02: two characterization test files (activation-command-coverage.test.ts, activation-prompts-and-status-bars.test.ts) pin activate()'s command coverage/order and its open-prompt/status-bar behaviour on the unsplit extension.ts, ahead of plans 03/04's split; the derived literal sequence needed no correction against the base
- [Phase 120]: 120-03: em-script-runner.ts has two entry points (createScriptOutputFile, runScriptToOwnerOnlyFile) rather than one combined call, so each EM caller keeps its own pre-launch steps at its base position relative to its own try boundary; em-auth-error-paths.test.ts is written and passes against the unmoved extension.ts before any source edit, then never edited again, proving no EM error path changed across the move. — The runner's real createOwnerOnlyFile calls in em-auth-error-paths.test.ts are suffixed with process.pid to avoid a genuine EEXIST race with test/em-login-username.test.ts's own real file creation across concurrent vitest workers.
- [Phase 120]: 120-04: activate() is an eighteen-call ordered list of single-purpose register functions; the open prompts and diagnostic status bars moved to open-file-prompts.ts/diagnostic-status-bars.ts; the extracted functions are placed after activate() (not before) so an untouched-lines diff against the composer registrations stays clean; REF-11 complete, phase 120 closed
- [Phase 121]: 121-01: services.java.JavadocProvider registered; the production factory still hands out the existing getInstance() instance (plan 02 makes it fresh and deletes getInstance())
- [Phase 121]: 121-01: createBBjTestServices grew an optional javadocProvider parameter so inlay-hints-javadoc.test.ts can hand it a pre-loaded provider instead of racing to initialise the singleton first
- [Phase 121]: 121-02: JavadocProvider.getInstance()/_instance deleted; the DI factory builds a fresh provider per services set; javadoc.test.ts's #624 regression suite proves two providers in one process share no state; REF-09 complete
- [Phase 121]: 121-03: ResolutionLock (acquire/currentToken/reset) extracted verbatim into java-interop-lock.ts, a zero-import sibling module held by the front class as a private readonly field; exports-check.mjs (D-08) written for the remaining REF-12 plans to reuse
- [Phase 121]: 121-04: the shared connection, breaker and generation move verbatim into java-interop-connection.ts as JavaInteropConnection, reached only through call-time hooks (createSocket/wrapSocket/connect) so every hermetic test double's override still fires; probeIfDue/requestClassInfo call hooks.connect() never the module's own connect() directly
- [Phase 121]: 121-04: the backoff unit test's first draft mismeasured the next probe due time (assumed the gap doubles immediately); corrected to match the real onConnectAttemptSettled ordering, which uses the pre-doubling cooldown for the next due time and only doubles it afterward
- [Phase 121]: 121-05: the dedicated parseProgram lane moves verbatim into java-interop-connection.ts, completing D-05's end state; disconnect() now disposes the lane and resets the retired generation itself, collapsing clearCache's step 6 to one call; parseProgram is a plain delegate on the front
- [Phase 121]: 121-06: the complete class index (build, has, clear, size, simpleNameMatches, prefixMatches, ensure/getAllClassNames) moves to java-interop-class-index.ts as CompleteClassIndex; resolveClassCandidatesBySimpleName and findClassCandidatesByPrefix stay on the front as orchestration and keep calling this.ensureCompleteClassIndex(token), closing the hazard where a hermetic double's override could be bypassed
- [Phase 121]: 121-07: the loader's implicit-import loading routes through call-time hooks (connect/resolveClass/registerResolvedClass/classpath/ensureClasspathDocument/addTopLevelPackage) bound to the front class; the top-level package tree stays a private front method (addTopLevelPackage) behind a hook since it is resolution/cache (D-06), not loading, and plan 08 carries it into the resolution module
- [Phase Phase 121]: 121-08: the resolved-class cache and the package tree move into java-interop-cache.ts as JavaResolutionCache, built as a front field initializer so the overridable cache limit is still read eagerly; three fields stay public-in-this-plan only, read through private front getters so the byte-identical resolution pipeline (plan 09) keeps working unchanged; the #676 leaf-collision guard and clearCache's reset order are pinned by a new 7-test unit suite — REF-12 fifth responsibility, first half; plan 09 moves the resolution pipeline itself and makes the three fields private
- [Phase 121]: 121-09: the class resolution pipeline (resolveClassByName/doResolveClassByName/createStubClass/resolveClass) moves into JavaResolutionCache behind six call-time hooks (classpath/ensureClasspathDocument/getDocumentation/getRawClass/resolveClass/resolveClassByName) routed back through the front's own (possibly overridden) methods, closing hazard 1 (a hermetic double's resolveClassByName/getRawClass override staying live); resolveClass is hooked even though nothing overrides it, per CONTEXT's discretion, at zero cost; storeJavaClass/getChildOf/createStubClass/doResolveClassByName stay module-internal since nothing overrides or spies on them (re-checked); the lock field moves above resolutionCache and is passed into its constructor; java-interop.ts is now a 467-line pure wiring/delegate front class — REF-12 fifth responsibility complete, plan 10 closes out and marks the requirement
- [Phase 121]: 121-10: Task 2's live hand check (hover, completion, missing-USE quick fix, Refresh Java Classes) approved in VS Code and IntelliJ against a live BBjServices; REF-12 marked complete, phase 121 fully closed (10/10 plans, REF-09 and REF-12 both complete)
- [Phase 122]: 122-01: prepare = langium:generate only; vscode:prepublish = LICENSE copy + minified esbuild only (no tsc/lint/second bundler); esbuild.mjs sets keepNames: true; .vscodeignore excludes **/*.map, out/main.js, coverage/**
- [Phase 122]: 122-01: activationEvents narrowed to onLanguage:bbj + onLanguage:bbx-config (all onCommand entries removed, incl. a third RESEARCH-found test site); langium-config.json's textMate block and its generated grammar/.gitignore line removed
- [Phase 122]: 122-01: documented (not fixed) a pre-existing beforeAll race in installed-extension-e2e.test.ts's SETOPTS-in-code describe block ("No document found for URI"), proven identical at the phase base and out of this plan's file scope
- [Phase 122]: 122-02: all five Gradle jobs set up Gradle through pinned gradle/actions/setup-gradle after inline wrapper-validation; the three verify-style jobs cache Gradle User Home via the user-approved Enhanced Caching provider with a four-line gradle-home-cache-excludes (IDE archive group, com.jetbrains.intellij.* group, both Gradle-9 and legacy transforms layouts); both publish-intellij jobs (preview, manual-release) run setup-gradle with cache-disabled: true and no restore/save step
- [Phase 122]: 122-02 Task 1: pre-answered checkpoint recorded option-a (Enhanced Caching, gradle-home-cache-excludes) per the user's 2026-09-29 answer during /gsd-plan-phase 122, accepting the Gradle Technologies Terms of Use for this public repository; publish jobs stay caching-disabled so the proprietary component never loads there
- [Phase 122]: 122-03: a single effective-scope helper (job block, else top-level block, else 'default') computes the push-scope rule's reported contents value across all three cases, supporting both block-mapping and same-line scalar/flow-mapping permissions syntax
- [Phase 122]: 122-04: a shared, pinned composite action (.github/actions/node-setup) is the one Node preamble every workflow uses; build.yml absorbs pr-vsix.yml as the single unconditional PR gate with its own build-<PR#> concurrency group, and pr-validation.yml/deploy-docs.yml adopt the action with least-privilege permissions and distinct concurrency naming so the two PR workflows never cancel each other
- [Phase 122]: Phase 122 P05: preview.yml and manual-release.yml top-level permissions:contents:read; write only on bump-version, tag-release and create-release; both verify jobs use the shared node-setup action (cached) with lint/typecheck:test gates after Build; both publish-vscode jobs install cold (cache:'false'); every uses reference pinned
- [Phase 122]: 122-06: pin-hygiene job wired into workflow-hygiene.yml permanently; every tree pin verified clean against GitHub (12/12, no re-pins needed, all already latest-in-major); Dependabot directories now cover the composite action; a fresh Node 22 scratch worktree proved the release-shaped packaging pipeline end to end; IntelliJ buildPlugin used the documented -x test workaround for the pre-existing ComposerRequestContractTest failure; Phase 122 complete, all eight requirements delivered
- [Phase 123]: 123-02: web.bbj row uses plain lowercase placeholder tokens in one backtick code span instead of angle-bracket placeholders, and examples/msgbox.bbj replaces the nonexistent examples/hello.bbj as the run-command example file
- [Phase 123]: 123-03: commands.md MDX build failed on a bare <title> placeholder (Docusaurus parses it as unclosed JSX); reworded to avoid angle brackets instead of escaping them
- [Phase 123]: 123-03: configuration.md Complete Settings Example verified programmatically against bbj-vscode/package.json (21 non-compiler.* keys plus bbj.compiler.trigger)
- [Phase 123]: 123-04: Host fallback documented per the code (empty field substituted to localhost client-side, no warning shown), not the drift scan inaccurate server-side-validator-warning description
- [Phase 123]: 123-04: Compile BBj File Tools-menu presence is a one-line cross-reference from Tools Menu Commands back to the Compile Command section, avoiding duplicate documentation
- [Phase 123]: 123-05: verified the lsp service group's exact provider count (9) against bbj-module.ts before writing 'eight further', and described each validations/ and java-interop-*.ts module from its own header comment rather than the drift scan's summary
- [Phase 123]: 123-06: composers.md documents all seven compose commands, five cue titles and every lightbulb label across MSGBOX/addWindow/addChildWindow/CVS()/SETOPTS, plus assign-to validation; COMP-01 held back (shared with 123-07) per requirements.ready-ids
- [Phase 123]: 123-07: composers.md documents all seven compose actions (including the cue-only bbj.openComposerAt) and five Alt+Enter intentions, plus assign-to validation; COMP-01 stays blocked because 123-08 also declares it and has no SUMMARY yet
- [Phase 123]: Phase 123: 123-08 confirmed all 45 drift-scan items and planning-time extras were already fixed by 123-01..07; no new doc edit needed, all five sweeps (old strings, VS Code channel wording, IntelliJ toolbar wording, planning ids, scope) came back clean
- [Phase 124]: 124-02: java-program-guard.ts validates every format/DENUM answer against the request that was sent (strict version echo, exact shape, in-document overlapping range edit, 4x+64KiB/16MiB size cap) and returns a fresh object or a fixed reason token; diagnostics capped at 500 with line 0 kept as no location
- [Phase 124]: 124-03: format and DENUM travel over a third dedicated connection (ProgramLane) handed only createSocket/wrapSocket and a read-only shared generation; a failed open answers not-reachable with a 5 s cool-down lifted by dispose, and lane loss moves only the lane's own epoch
- [Phase 124]: 124-04: each format/DENUM method has its own availability latch keyed on shared generation and lane epoch (only -32601 latches off; -33004, -32602, cancel, client timeout and transport never do), written only under the key captured before sending; a request settles through a 15 s cancel-always backstop or the caller's token without awaiting the peer
- [Phase 124]: 124-05: the loopback wire suite proves omitted optional fields, -33007/-33008 data framing, per-method availability and real $/cancelRequest at the backstop and on caller cancellation; JavaInteropTestService scripts formatProgram/denumProgram with a success default, routes scripted wire answers through the production guard and classifier, and rejects createSocket so it can never open a socket
- [Phase 124]: 124-06: dedicated program lane kept (measured live): small DENUM behind a pending large parse 3-4 ms on the lane vs ~175 ms on a shared connection, parse latency not above idle while a large DENUM runs; bbj-ls honours $/cancelRequest (-32800 in 1-2 ms) — Route confirmed by measurement through the real client; no route change
- [Phase 125]: Non-JSON formatter setting values are forwarded as JSON text (String fallback) so bbj-ls rejects the key by name — A silent fallback to a default would hide a misconfiguration
- [Phase 125]: IntelliJ LSP formatting is gated by one false constant overriding all four LSP4IJ formatting checks; no handler added for bbj/openFormatterSettings (LSP4J 1.0.0 logs a WARNING and returns) — Formatting services gate on isEnabled then call the supported checks directly; the notification cannot be produced while the switch is off
- [Phase 125]: 125-03: tokenized-program check lives in the format service so handlers and the Langium adapter share it; one private handler body takes an optional range so document and range gates cannot drift
- [Phase 125]: Formatting notices log fixed tokens and numeric codes only, never peer text (bbj-ls messages can quote source)
- [Phase 125]: Notice ledger holds exactly 256 entries, evicting the oldest when a new one arrives while full
- [Phase 125]: 125-05: formatter settings intake is raw-object handoff to BBjFormatService (normalizes to 15 keys); push applies before startup gate, initializationOptions.formatter applies on initialize; no trust gating for formatter values
- [Phase 125]: Formatting switched on in one commit: lsp.Formatter slot, bounded handler after startLanguageServer, client-side jar formatter removed; first format on a fresh program connection measures 8 ms (stay lazy, no warm-up)
- [Phase 126]: bbj/denum: server applies a versioned TextDocumentEdit after re-checking the live version; no canonicalName on DENUM requests; per-document in-flight guard answers in-progress — Never apply text computed for another version; overlapping runs must not cancel each other
- [Phase 126]: Denumber offer: selection explanation and document offer are separate ledger kinds on the same uri@version scope, so neither suppresses the other and an edit re-arms both — Reuses the bounded format notice ledger; no second ledger
- [Phase 126]: Denumber and Format is one whole-document formatProgram call with the denumber permission; formatting failures use the formatting texts, all others the DENUM texts — One undoable edit, one orchestration core shared with plain DENUM
- [Phase 126]: Format-on-save and Format Document offer denumbering on every request (no save signal exists); offer kept out of the notice ledger — LSP formatting carries no trigger and VS Code's save participant races format-on-save
- [Phase 126]: 126-07: Show opens the Problems view (preserveFocus) and a bbj-denum collection holds the entries, cleared on content change or close; the BBj channel keeps the log copy
- [Phase 127]: Denumber command sends bbj/denum through createDenumberCommand, client words no outcome, no retry; Explorer path marks the document so the numbered-file prompt stays quiet — Server presents every outcome and applies the edit; the document is opened first so the server already has it
- [Phase 127]: Client-side formatter and bbj.formatter.javaPath removed; the language server normalizer stays as the backstop for leftover user values — The language server formats; the vendored jars, java resolver and verifier were dead code and a supply-chain surface
- [Phase 127]: 127-03: formatter settings migration moves splitSingleLineIF to splitSingleLineIf per scope (user, then trusted workspace), write-before-remove, never overwrites a set value
- [Phase 127]: 127-04: both Decompile commands refuse a non-tokenized input (symlinks included) before any bbjlst launch; -xlst kept for .lst input — Running bbjlst on plain text is the denumber path being removed; isTokenizedFile already treats non-regular files as not tokenized (issue #585)
- [Phase 128]: Denumber client words no outcome: DenumResult discarded; only a transport failure shows one XML-escaped 'Denumber failed' balloon (60 s timeout)
- [Phase 128]: Show reveals the BBj console with show() only (no activate), so the editor keeps focus; the diagnostics notification never shows the window — Matches VS Code; a source guard forbids activate() and show() in the diagnostics handler
- [Phase 128]: [Phase 128] Line-numbered banner uses Info status; per-file 300 ms debounced refresh via a lazily created Disposable project service that parents its listener and alarm to itself
- [Phase 128]: A cancelled window/showMessageRequest (balloon closed in IntelliJ) must never terminate the language server: all five fire-and-forget message sites handle the rejection — Found in the 128-04 hand check; fixed in acb1912a inside the phase with the user's approval, so the phase finishes clean
- [Phase 129]: 129-01: interop wire keys renamed on the IntelliJ side only (interopHost/interopPort); no server-side shim, BbjSettings.State field names unchanged
- [Phase 129]: 129-02: formatter State fields are formatter+Key; out-of-range indentWidth resets to 2, choices match exactly after trim else default; normalization lives in the seam
- [Phase 129]: 129-03: Linux evaluation driven by the performanceTesting script plugin under Xvfb with a node wrapper for wire capture; runIde sandbox folders are suffixed _runIde, runIde needs network, every case uses a fresh corpus file name plus Synchronize
- [Phase 129]: Phase 129-04: Actions on Save reaches the server on IntelliJ 2024.2 in both modes (formatting / rangeFormatting); eolCharacter CRLF is rejected by the IDE (known issue, sub-question for the user); KEEP and LF format CRLF files correctly
- [Phase 129]: Phase 129-04: Windows run returned on IntelliJ 2026.2.2 (#IU-262.10315.125) with LSP4IJ 0.21.0; zip sha256 not verified by the user, switch-on build shown by formatting requests on the wire
- [Phase 129]: Phase 129: IntelliJ LSP formatting verdict is supported (the user's answer, overriding the recommendation disabled); eolCharacter CRLF is a known issue whose Formatter note says plainly that CRLF stops formatting entirely in IntelliJ (LSP4IJ, lsp4ij #381)
- [Phase 129]: IntelliJ LSP formatting is on (LSP_FORMATTING_ENABLED = true) for whole-file, range and on-save formatting; no range-only constant
- [Phase 129]: bbj/openFormatterSettings opens BbjSettingsConfigurable by class and ignores its keys payload
- [Phase 129]: IntelliJ Formatter section: RESTART_NOTE ends with the verdict's eol_note verbatim; note and format-on-save hint are wrapping comment labels
- [Phase 129]: 129-08 disabled-outcome plan skipped: verdict is supported, no file changed
- [Phase 129]: IJF-02, IJF-03 and IJF-04 complete on the supported verdict; final zip verified (switch int 1, seam and handler present, main.cjs identical)
- [Phase 130]: 130-01: settings table Description cells avoid VS Code key names so the IntelliJ guide reuses them word for word; message tables quote server text verbatim
- [Phase 130]: 130-02: release notes state only verified old-jar differences; old blank-line positions are not listed because the live run differs from the research capture
- [Phase 130]: 130-03: QA rows carry no planning ids; Denumber action expected greyed out on unnumbered and early-mixed files in IntelliJ — Repo rule for QA files; research enablement trap
- [Phase 130]: 130-04: IntelliJ Formatting page reuses the VS Code Description cells word for word (script-checked), the CRLF warning follows the Line ending row, and the Denumber failed balloon bodies have their own table
- [Phase 130]: 130-05: changeNotes carries no version number; README formatting bullet links both published guides — Version comes from -Pversion at build time; both IDEs now format and denumber
- [Phase 130.1]: Denumber menu fix uses the menu-clause option only: three bbj.denumber when clauses drop the bbx branch, no in-command language check — Menu offers only what the client announces to the server; other 12 entries stay on the shared clause
- [Phase 130.1]: 130.1-06: differing old/new splitSingleLineIF values stay untouched and silent; only an equal pair is cleaned — The new key already wins in the language server, and logging would repeat on every settings event for the old key

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- Static method return type inference gap — String.valueOf(2) does not assign type
- v4.6: 107 A2 accepted on a file-set reading; 108 final UAT ran on the pre-review-fix build; 109-REVIEW IN-01..05 open (full list in `milestones/v4.6-MILESTONE-AUDIT.md`)
- v4.6 Phase 106 review debt (106-REVIEW.md): CR-01 a pending debounced compiler check still runs and publishes after switching the trigger to `off` (pre-existing); WR-01 the bbjcpl fallback branch suppresses Langium warnings before merging the kept BBjCPL error
- v4.7 Phase 114 review (114-REVIEW.md, advisory): WR-01 the formatter's ENOENT branch in `document-formatter.ts` rejects exactly like the other branch (pre-existing dead code); IN-01 `readSimpleName` duplicated in `bbj-hover.ts` and `java-javadoc.ts` with different return types. `installed-extension-e2e` still counts as a failed suite with 0 failed assertions (stale installed bundle, pre-existing)
- v4.9 Phase 129 review (129-REVIEW-FIX.md): IN-02 (formatter defaults duplicated as literals in `BbjSettings.State`) and IN-03 (switch constant `true` makes the four overrides tautological; kill-switch not exercised by a test) skipped on purpose. LSP4IJ CRLF `newText` issue draft (`129-LSP4IJ-ISSUE-crlf-newtext.md`) not filed yet; filing is the user's call
- v4.5: verdict state never cleared for deleted files (103 WR-01); open review warnings in 98/99/100/104; no SECURITY.md for 101 and 104 (full list in `milestones/v4.5-MILESTONE-AUDIT.md`)

### Pending Todos

Listed in `.planning/todos/pending/`:

- `2026-09-27-windows-intellij-node-download-progress-check` — repeat the IntelliJ Node.js download progress check on Windows the next time Windows is used for testing (Linux passed in Phase 114; opportunistic, not blocking)
- `2026-09-20-linking-interop-failures-survive-class-warmup` — root cause found (hermetic test double), not fixed → TEST-05, Phase 116
- `2026-09-26-signature-help-and-snippet-peer-name-escaping` — transferred threat T-111-15: peer names in the signature-help fence and completion snippet placeholders (unscheduled)
- `2026-10-04-skip-syntax-checks-on-line-numbered-programs` — line-numbered programs show many pointless syntax errors (at least in IntelliJ); send no diagnostics, or one pointing to Denumber (from the Phase 128 UAT; unscheduled)

Closed in v4.9: `2026-09-26-intellij-interop-initoptions-key-mismatch` (folded into Phase 129).
Closed in v4.7: `2026-09-24-unknown-java-member-linking-warning-extras` (FIX-03, Phase 111), `2026-09-20-phase-97-code-review-follow-ups` (FIX-04, Phase 114).
Closed in v4.6: lost-connection crash detection and the stale previous-status log line (Phase 108), the live parse waiting on the shared breaker (Phase 106), and the use-before-assignment crash (Phase 107).

### Blockers/Concerns

- **9 advisory fixes merged and released, not yet published.** The tagged release publication was waiting for exists (`v0.16.0`, 2026-09-20). Per-advisory severity/CVE decisions are the maintainer's; post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived. Entry 3 (Phase 96 Windows attestation) is fixed.

- **0.15.0 stays half-released** (VS Code only) — deliberately not reconciled (SEED-002); 0.16.0 is on both marketplaces. `manual-release.yml`'s two publish jobs still run in parallel; the by-hand runbook is `milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md`.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts`) gates on a bare TCP connect to :5008, so with BBjServices up 11 `linking.test.ts` interop tests switch on and fail. The issue447 capability test was rewritten backend-agnostic in 97-03, so the local baseline is 11 (re-measured 2026-09-23 at the Phase 105 close); green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`. v4.7 Phase 116 (TEST-05) removes this allowance.

- **v4.7 human gates.** DEP-02 (#507, Phase 117) needs the maintainer to name the library and version behind the vendored formatter JAR (lead found 2026-09-26: it is BASIS's `com.basis.bbjutilities.bbjcodeformatter`; a 2024 build ships in the BDT plugin under `/opt/bbx/BDTStudio/plugins/` and still has the `--single-line-if` crash). DEP-05's upstream langium report may only be filed with the maintainer's approval. FIX-01 (#527, Phase 119) may already be effectively fixed per the tests research; Phase 119 starts by testing it on the phase base.

- **Advisory review follow-ups still open:** `89-REVIEW` WR-01 (VS Code composer primary button always says "Insert"); `90-SECURITY` T-90-11 (`ComposerHandleCache` has no source guard forbidding a static map); `86-05-REVIEW` WR-02 (no exception handling around the bounded restart wait); `97-REVIEW` WR-01..WR-04 closed by FIX-04 in Phase 114. The `79-REVIEW` IN-02, `83-REVIEW` WR-02/WR-04 and `82-UI-REVIEW` colour items were retired by v4.4 phases 93, 94 and 96.

- **No release since 0.16.0.** v4.5 is on `main` via PR #691 (merged 2026-09-24) and v4.6 via PR #699 (merged 2026-09-26); both still need a release. The `bbj-ls` endpoint MR (`feat/689-parse-program-endpoint`, BASIS GitLab) is opened by hand.
- IntelliJ `ComposerRequestContractTest` fails since 116-02 moved the `bbj/refreshJavaClasses` literal from `main.ts` to `language/java-class-refresh.ts`; the test's scanned-file list needs that file (found at the Phase 120 UAT build, which used `-x test`).
- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).
- 117-05 halted: langium 4.4.0 regression repro (DEP-05) not reproduced despite toy + bbj-subset fallback grammars; human decision needed (accept negative result / invest in larger-scale grammar / port custom lexer split) before DEP-05 can close

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | Complete settings example in VS Code configuration.md uses shipped defaults (phase 123 VSC-04 gap) | 2026-09-30 | c46a5d9f | — | — |
| 260930-m99 | Root README rewritten as a customer landing page: install and docs links up front, feature showcase, no build steps | 2026-09-30 | d17ea86d | — | [260930-m99-clean-up-the-readme-advertising-tone-no-](./quick/260930-m99-clean-up-the-readme-advertising-tone-no-/) |

Rows through 2026-09-17 are archived with their directories under `.planning/milestones/v4.4-quick/` (see its README).

---

### Roadmap Evolution

- v4.9 roadmap created 2026-10-01: Phases 124-130 for 39 requirements. CUT-01 and IJF-01 land with the server formatter in 125. SET-02 (the server-side 15-key whitelist) sits in 125 rather than with the other settings in 127, because without it unknown keys such as `bbj.formatter.javaPath` would reach bbj-ls and every format would fail with `-33007`. FMT-06/07 and DEN-03/04 sit with `bbj/denum` in 126. IJF-04 depends on the 129 verdict and moves to Out of Scope on "disabled".
- v4.8 roadmap created 2026-09-30: one phase (123) for 18 requirements. The count was first given as 19; the requirement list has 18, and nothing in the drift scan is left without one.
- v4.7 roadmap created 2026-09-26: Phases 110-122 for 63 requirements (61 GitHub issues plus three carried-over todos). REF-02 folded into 110, FIX-02/03 into 111, TEST-09 into 112, TEST-10/DOC-01 into 113, FIX-04 into 114, DEP-03 into 115, TEST-08 into 116, DEP-01/CI-04 into 117, FIX-01 into 119, REF-09 into 121.
- v4.6 archived 2026-09-26 (Phases 106-109).
- v4.6 roadmap created 2026-09-24: Phases 106-109 for 18 requirements (DIAG-01 and JINT-03 folded into 106, JINT-01/02 into 109).
- v4.5 archived 2026-09-24 (Phases 98-105).
- Phase 105 added: Live diagnostics responsiveness on large workspaces (issue #692) — live-parse timer is armed inside buildDocuments, behind Langium's FIFO WorkspaceLock; observed in both IDEs during phase 102 UAT
- Phase 130.1 inserted after Phase 130: Address tech debt: 127 review warnings and loading of binary files, intellij and vscode (URGENT)

## Session Continuity

Last session: 2026-10-05T07:00:09.438Z
Stopped at: Completed 130.1-06-PLAN.md
Resume file: None

Next: /gsd-complete-milestone v4.9 (phase 130 UAT 4/4 passed, VALIDATION and SECURITY done). Paste 130-RELEASE-NOTES.md into the GitHub release body at release time. Phase 125 review WR-01..03 (125-REVIEW.md) and phase 127 review WR-02..04 (127-REVIEW.md) are still open; 127 WR-01 and the in-place decompile failure are accepted overrides tracked in backlog 999.1. New todo from the 128 UAT: skip syntax checks on line-numbered programs.
The `bbj-ls` hardening follow-up is tracked separately in `bbj-ls` and is not a GSD step here.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| todos | 2026-09-29-lsp4j-1-0-with-bbj-ls.md | (presence-only) | 2026-09-30 | v4.8 |
| todos | 2026-09-29-vitest-5-upgrade.md | (presence-only) | 2026-09-30 | v4.8 |
| todos | 2026-09-29-vscode-jsonrpc-9-migration.md | (presence-only) | 2026-09-30 | v4.8 |
| debug_sessions | g-110-1-formatter-noop-path-java | diagnosed (fix is in the vendored formatter jar, #507) | 2026-09-29 | v4.7 |
| uat_gaps | 114/114-UAT.md | partial (7 hand checks deferred) | 2026-09-29 | v4.7 |
| verification_gaps | 122/122-VERIFICATION.md | human_needed (post-release: manual-release dispatch, PR Gradle cache restore) | 2026-09-29 | v4.7 |
| todos | 2026-09-26-intellij-interop-initoptions-key-mismatch.md | (presence-only) | 2026-09-29 | v4.7 |
| todos | 2026-09-26-signature-help-and-snippet-peer-name-escaping.md | (presence-only) | 2026-09-29 | v4.7 |
| todos | 2026-09-27-windows-intellij-node-download-progress-check.md | (presence-only) | 2026-09-29 | v4.7 |
| uat_gaps | 108/108-UAT-ARTIFACTS.md | unknown (raw idea.log evidence record, not a UAT script; 0 pending scenarios) | 2026-09-26 | v4.6 |
| todos | 2026-09-24-unknown-java-member-linking-warning-extras.md | (presence-only) | 2026-09-26 | v4.6 |
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
| v4.6 User-Facing Bug Burn-down | 106-109 | 25 | 2026-09-26 |
| v4.7 Audit Hygiene Burn-down | 110-122 | 80 | 2026-09-29 |
| v4.8 Documentation Drift | 123 | 8 | 2026-09-30 |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-27 after Phase 112. Per-plan metrics and per-phase decision
detail for phases 70-109 live with their archived phase artifacts; this file is a digest again.*

## Operator Next Steps

- Plan Phase 130 with /gsd-plan-phase 130 (or /gsd-discuss-phase 130 first)
