---
gsd_state_version: 1.0
milestone: v4.6
milestone_name: User-Facing Bug Burn-down (Phases 106-109) — IN PROGRESS
current_phase: 109
current_phase_name: Completion & Java Class Resolution
status: executing
stopped_at: Completed 109-04-PLAN.md
last_updated: "2026-09-25T18:26:45.896Z"
last_activity: 2026-09-25
last_activity_desc: Phase 109 execution started
state_head: 9d412415d5dd9194bb4965f10c6341a1a8c846b9
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 23
  completed_plans: 21
  percent: 75
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-25 (Phase 108 complete — LIFE-01/02 verified, UAT 15/15; next: Phase 109)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-25)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 109 — Completion & Java Class Resolution

---

## Current Position

Phase: 109 (Completion & Java Class Resolution) — EXECUTING
Plan: 5 of 6
Status: Ready to execute
Last activity: 2026-09-25 — Phase 109 execution started

Progress: [████████░░] 75% (3/4 phases)

### v4.6 milestone map

| Phase | Name | Requirements | Where it works |
|-------|------|--------------|----------------|
| 106 | On-Save Compiler Check in Both IDEs | TRIG-01..07, DIAG-01, JINT-03 | language server (`bbj-document-builder.ts`, save handling, `java-interop.ts` parse lane), IntelliJ trigger setting, VS Code setting description, both feature docs |
| 107 | Validation False Alarms & Silent Skips | VAL-01..03 | two validators, a new unknown-Java-member check, synthetic fixtures; private conformance run for VAL-01 and VAL-03 |
| 108 | IntelliJ Crash Detection | LIFE-01, LIFE-02 | `bbj-intellij/` only; runs after 106 (both change `BbjLanguageServerFactory`) |
| 109 | Completion & Java Class Resolution | COMP-01..03, JINT-01, JINT-02 | scope, type inferer, linker, overload selector, completion provider, `java-interop.ts` `resolveClass` |

v4.5 (phases 98-105) is summarised under Recent History below and in MILESTONES.md.

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

Per-plan metrics for phases 98-105 are in the v4.5 phase SUMMARYs under `.planning/milestones/v4.5-phases/`.
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 106 P01 | 55min | 3 tasks | 5 files |
| Phase 106-on-save-compiler-check-in-both-ides P02 | 20min | 2 tasks | 2 files |
| Phase 106 P03 | 9min | 3 tasks | 10 files |
| Phase 106 P04 | 15min | 3 tasks | 5 files |
| Phase 106 P05 | 105min | 3 tasks | 6 files |
| Phase 106 P06 | 95min | 3 tasks | 6 files |
| Phase 106 P07 | 2.5h | 3 tasks | 1 files |
| Phase 107 P01 | 12min | 2 tasks | 3 files |
| Phase 107 P02 | 11min | 2 tasks | 3 files |
| Phase 107-validation-false-alarms-silent-skips P03 | 49min | 3 tasks | 6 files |
| Phase 107 P04 | 70min | 2 tasks | 6 files |
| Phase 107 P05 | 141min | 2 tasks | 3 files |
| Phase 107 P06 | 59min | 2 tasks | 8 files |
| Phase 108 P01 | 6min (+ ~3h49m checkpoint wait) | 3 tasks | 9 files |
| Phase 108 P02 | 17min | 2 tasks | 7 files |
| Phase 108 P03 | 11min | 2 tasks | 5 files |
| Phase 108 P04 | 25min | 3 tasks | 1 files |
| Phase 109 P01 | 20min | 3 tasks | 3 files |
| Phase 109 P02 | 11min | 2 tasks | 2 files |
| Phase 109 P03 | 15min | 2 tasks | 4 files |
| Phase 109 P04 | 10min | 2 tasks | 3 files |

## Accumulated Context

### Active Constraints

- **v4.6:** minimal fixes only, release soon — no new features and no change to the default compiler trigger (`debounced`).
- **v4.6:** LIFE-01 and LIFE-02 land together. The crash signal cannot come from LSP4IJ's status sequence alone — a crash and a normal stop both arrive as `started -> stopping -> stopped` (Phase 97 finding) — so Phase 108 starts with a design step and ends with a hand UAT that kills the process in a running IDE.
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
- [v4.5]: PR #691 carried phases 98-105 and merged to `main` as one piece on 2026-09-24.
- [v4.6 roadmap]: four phases (106-109). DIAG-01 and JINT-03 fold into Phase 106 — DIAG-01's fix site is the `debouncedCompile()` bbjcpl fallback branch the on-save path reshapes, and the save-triggered check asks the live-parse lane first. JINT-01/02 go with completion in Phase 109 (same `resolveClass` as COMP-01's `isStatic` blocker). Phase 108 runs after 106 because both change `BbjLanguageServerFactory`.
- [Phase 106]: Tasks 2 and 3 verified red-then-green by temporarily disabling their implementation branch in bbj-document-builder.ts, confirming the pinned test failed, then restoring it before the feat commit — Follows the plan's own TDD instruction for tdd=true tasks without needing a separate scratch branch
- [Phase 106]: Task 2's five tests were verified red against the pre-Task-1 parseProgram() ordering, then restored green with no production change needed -- Task 1's fix already covers every case.
- [Phase 106]: Phase 106 Plan 03: IntelliJ's Compiler check dropdown followed the #571 compilerOutputDirectory precedent exactly -- CompilerInitOptions holds the wire constants/normalization, BbjSettingsComponent stays free of BbjSettings references, apply() stores the choice before the debounced restart
- [Phase 106]: Phase 106-04: reconcileWithFallbackCheck never downgrades a syntax complaint -- a fallback result only ever drops it outright (matched line, overlapping bbjcpl diagnostic) or leaves it untouched, since it is a check of the file on disk, not a live-parser verdict
- [Phase 106]: Phase 106-04: checkedTextIsOnDisk tries the last-saved-version record first, then a disk read -- covers a save-triggered check in every encoding, and an open/debounced cycle with no unsaved edits, while any mismatch still merges exactly as before this phase
- [Phase 106]: Phase 106-06: a per-document checkSequence counter plus a widened verdict-branch entrance condition let an on-save save's verdict survive typing and be superseded only by a genuinely newer save, whichever resolves last
- [Phase 106]: Phase 106-06: KeptCheck.storedUnderOnSave (set from the trigger at store time) lets a runtime switch away from on-save keep showing a file's current compiler errors under debounced until that file's own first debounced check replaces them
- [Phase 106]: Phase 106-06: two plan-04 bbj-cpl-fallback-dedup tests were updated from their old merge-as-before expectation to the new on-save behavior (kept and shown, not merged) since this plan's kept-check wiring deliberately supersedes that old rule for on-save
- [Phase 106]: Phase 106: timing re-check of the Phase 105 metric not taken at the user's decision; no regression evidence either way
- [Phase 107]: Phase 107-01: used the plan's specified two-counter bookkeeping (openIfs/elseClaims) in elseStatementLineBreaks instead of the 98-REVIEW.md WR-A one-line snippet, which a planning-time probe showed reopens the 'second ELSE for one IF' false negative
- [Phase 107]: Phase 107-01: the colon-continuation blank-message line-break residue needed no separate fix -- the same nested-ELSE counter repair also clears it, since the lexer joins colon-continued lines into one physical line before the walker runs
- [Phase 107]: Phase 107-02: the '# = 1' control test asserts message count and each message's own stable text/prefix rather than a literal snapshot, since the base-tree probe for that shape produced a >6000-alternative Chevrotain token listing unrelated to this fix
- [Phase 107]: Phase 107-02: guarded all 8 .symbol reads in check-variable-scoping.ts plus 1 in bbj-scope-local.ts inline with ?. rather than a shared type-guard helper, per D-06
- [Phase 107]: check-unknown-java-member.ts exempts a class-reference member used as the receiver of a further member access (Tree.Kind.CLASS), since java-interop's JavaClass model carries no nested-class membership data — Found by the whole-suite run flagging a real example file under this repo's own examples/ tree; fixed before committing Task 2
- [Phase 107]: The live BBjAPI() functional test reindexes the synthetic classpath document via IndexManager.updateContent after loadImplicitImports, since this bare test harness has no real workspace folder for initializeWorkspace to load classes from before the initial (empty) build — documentBuilder.update() cannot be used instead -- it always re-reads a document's source from disk, and the synthetic classpath document has none
- [Phase 107]: Phase 107-04: previousStatement() now skips transparently past a same-line run of DefReturn siblings inside a DEF FN body when finding the governing statement for the IF/ELSE/FI line-break balance walk -- a DEF FN body mixes RETURN (DefReturn, not a Statement) in with ordinary Statement siblings, and a same-line RETURN was stopping the shared backward walk one step early, starving every ELSE/IF on a colon-continued chain of its own governing IF
- [Phase 107]: Phase 107-04: two newly-exposed raw-B corpus files (a compiler-rejected SELECT...FROM...WHERE construct) were reported in 107-CONFORMANCE.md rather than fixed -- each file's only Error-severity diagnostic was the now-removed false alarm on an unrelated DEF FN inline IF/ELSE/RETURN, and nothing else in the language server ever raised an Error for the rejected SELECT construct; left for 107-06's human check per this plan's own instruction not to re-flag valid code to protect the B gate
- [Phase 107]: Phase 107-05: live-backend review found and guarded five false-positive shapes in the unknown-Java-member check (class-ref method static filter, array-typed declare .length, java.lang.Object receiver, empty-string sentinel reassignment, constructor-reassignment to a different class); all narrow hasCertainReceiverType/checkUnknownJavaMember only, no scope/linker/interop file touched
- [Phase 107]: Phase 107-06: Comparable A2 (harness-artifact and accepted-genuine-member files removed) measures 25 on this phase's own same-corpus base, a strict subset of the base's own 33 with zero new files, but 3 above the historical <=22 v4.5 exit number measured on a roughly 3-4x smaller corpus — Recorded as an open human-check item in 107-CONFORMANCE.md rather than resolved either way, matching the precedent already set at the Phase 98 close; resolved at UAT 2026-09-25: the user accepted the file-set reading (comparable A2 25 vs same-corpus base 33, no new entries) and VAL-03 was marked Complete
- [Phase 108]: Phase 108-01: real macOS idea.log confirms D-01 -- the unexpected-stop hook fires only after kill -9, never during a deliberate stop or restart — P3's stop-requested/hook-line ordering races in the same millisecond and is not a usable signal; LSP4IJ's own recovery sometimes double-launches, stopping a first instance while alive with no hook line; closing and reopening the last BBj file within ~30s returns stopping directly to started with no stop request -- all three narrow plan 02's crash-signal design
- [Phase 108]: Phase 108-02: the maintainer's real macOS idea.log excerpt confirms D-01 unconditionally -- the hook line appears after every kill -9 and never inside any deliberate-stop window, so the design proceeds unchanged into implementation
- [Phase 108]: Phase 108-02: Task 1 kept the old status-driven classify(String,String,long) call site routed through the new applyCrashPolicy for one commit so existing source guards stayed green mid-refactor, then Task 2 deleted that call site and the three-argument classifier together
- [Phase 108]: Phase 108-02: applyCrashPolicy's first-crash branch calls a new private requestGatedRestart directly instead of the public requestRestart, since requestRestart now clears crash state as the user-initiated entry point and the crash auto-restart must keep the counter it just incremented
- [Phase 108]: Phase 108-03: A private service() accessor was added to BbjStatusBarWidget so all three render hooks read the crashed/give-up flags through one call site — Matches the plan's own suggested shape rather than three separate BbjServerService.getInstance() calls
- [Phase 108]: Phase 108-03: Task 1's tracer feedback gate re-ran the task's automated verify in auto mode and passed, so execution proceeded straight to Task 2 with no checkpoint — workflow.auto_advance=true and the task carries no gate=blocking-human, so the gate followed row 2 of the tracer feedback gate precedence chain
- [Phase 108]: Scenario 7 (config reload / Refresh Java Classes fallback) was not exercised in the maintainer's UAT session; every S7.k row is marked derived rather than passed, per D-15.
- [Phase 108]: The maintainer's unscripted extra third kill (crash 3) is folded into Scenario 2's evidence as corroboration, not treated as a script deviation.
- [Phase 109]: Phase 109-01: every D-03 position (11-row matrix plus the verbatim DEF FN scenario) already worked on the unmodified tree, so branch A applied throughout Task 2 -- no completion-provider or grammar change was made, only un-skipping and pinning
- [Phase 109]: Phase 109-01: the maintainer chose comment-and-close for issue #561 at the Task 3 checkpoint -- post the drafted comment unchanged and close the issue as completed; nothing posted or closed from this plan, plan 109-06 carries it out after the phase regression gate
- [Phase 109]: Phase 109-02: Invoked-trigger completion at a dangling MemberCall position merges in a "start new statement" fallback -- after USE, that fallback additionally offers the bare class name itself as a program-scope symbol with no equivalent in the no-USE form; the Invoked-trigger label-set comparison filters that one known artifact, the dot-trigger comparison needed no allowance
- [Phase 109]: Phase 109-02: every Task 2 guard (instance access, .class, package, no-static-member class, case-variant receiver, unknown-member validation) already held on the tree Task 1 produced -- hasCertainReceiverType already returns false for a MemberCall receiver, so the unknown-member check can never fire through a fully-qualified class reference regardless of this fix
- [Phase 109]: Phase 109-03: Task 1 proved red-then-green via file copies (not git stash, which this repo's project rules forbid); Task 2's 19 Java/tie-rule/guard cases all passed against the tree Task 1 produced, with no production code change needed, so it was committed as a test-only commit — OverloadCandidate/bestOverloadCandidates already generalize over JavaMethod and MethodDecl candidates, so the Java overload case needed no second re-selection path beyond what Task 1 built
- [Phase 109]: JINT-01: resolveClassByName's local branch reuses resolveClass's own pipeline (not createStubClass) for primitive/void/array/blank names, keeping the result behaviour-neutral with today's real round trip
- [Phase 109]: The local-type filter matches whole type names only (a nine-name primitive/void set plus an array suffix), so java.lang.Integer, a bytes package segment, or a class named Voider are never mistaken for a primitive
- [Phase 109]: The counting test double's BACKEND_PRIMITIVE_NAMES is an independent constant, not shared with production's JAVA_PRIMITIVE_TYPE_NAMES, so the neutrality tests check against a modelled backend rather than a tautology

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- FQN path static-only filtering deferred — requires JAR redeployment (scheduled: COMP-01, Phase 109)
- Static method return type inference gap — String.valueOf(2) does not assign type
- v4.6 Phase 106 review debt (106-REVIEW.md): CR-01 a pending debounced compiler check still runs and publishes after switching the trigger to `off` (pre-existing); WR-01 the bbjcpl fallback branch suppresses Langium warnings before merging the kept BBjCPL error
- v4.5: verdict state never cleared for deleted files (103 WR-01); open review warnings in 98/99/100/104; no SECURITY.md for 101 and 104 (full list in `milestones/v4.5-MILESTONE-AUDIT.md`)

### Pending Todos

5 pending in `.planning/todos/pending/`. Two are scheduled in v4.6 (marked →); the rest stay unscheduled:

- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection` — severity major; the Phase 97 attempt was reverted → LIFE-01, Phase 108
- `2026-09-20-status-transition-log-prints-a-stale-previous-status` — only makes sense together with the one above → LIFE-02, Phase 108
- `2026-09-20-phase-97-code-review-follow-ups` — partial download-progress fix, three weak source guards
- `2026-09-20-linking-interop-failures-survive-class-warmup` — root cause found (hermetic test double), not fixed
- `2026-09-24-unknown-java-member-linking-warning-extras` — deferred extras from VAL-03 (Phase 107)

Closed by Phase 107: the single-line IF A2 residue (VAL-01), the use-before-assignment crash on a symbol-less reference (VAL-02), and unknown method on a Java object as an Error (VAL-03).

### Blockers/Concerns

- **9 advisory fixes merged and released, not yet published.** The tagged release publication was waiting for exists (`v0.16.0`, 2026-09-20). Per-advisory severity/CVE decisions are the maintainer's; post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived. Entry 3 (Phase 96 Windows attestation) is fixed.

- **0.15.0 stays half-released** (VS Code only) — deliberately not reconciled (SEED-002); 0.16.0 is on both marketplaces. `manual-release.yml`'s two publish jobs still run in parallel; the by-hand runbook is `milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md`.

- **Crash detection cannot see a lost language-server connection.** LSP4IJ detaches the client before it publishes `stopped`; the Phase 97 fix failed hand UAT and was reverted. Accepted `86-05-REVIEW` WR-01 is the same defect. Upstream: LSP4IJ #1672/#1673. Scheduled as v4.6 Phase 108 (LIFE-01/02).

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts`) gates on a bare TCP connect to :5008, so with BBjServices up 11 `linking.test.ts` interop tests switch on and fail. The issue447 capability test was rewritten backend-agnostic in 97-03, so the local baseline is 11 (re-measured 2026-09-23 at the Phase 105 close); green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`.

- **Advisory review follow-ups still open:** `89-REVIEW` WR-01 (VS Code composer primary button always says "Insert"); `90-SECURITY` T-90-11 (`ComposerHandleCache` has no source guard forbidding a static map); `86-05-REVIEW` WR-02 (no exception handling around the bounded restart wait); `97-REVIEW` WR-01..WR-04 (todo filed). The `79-REVIEW` IN-02, `83-REVIEW` WR-02/WR-04 and `82-UI-REVIEW` colour items were retired by v4.4 phases 93, 94 and 96.

- **No release since 0.16.0.** v4.5 is on `main` via PR #691 (merged 2026-09-24); the `bbj-ls` endpoint MR (`feat/689-parse-program-endpoint`, BASIS GitLab) is opened by hand. v4.6 is meant to ship soon after its four phases.
- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

Rows through 2026-09-17 are archived with their directories under `.planning/milestones/v4.4-quick/` (see its README).

---

### Roadmap Evolution

- v4.6 roadmap created 2026-09-24: Phases 106-109 for 18 requirements (DIAG-01 and JINT-03 folded into 106, JINT-01/02 into 109).
- v4.5 archived 2026-09-24 (Phases 98-105).
- Phase 105 added: Live diagnostics responsiveness on large workspaces (issue #692) — live-parse timer is armed inside buildDocuments, behind Langium's FIFO WorkspaceLock; observed in both IDEs during phase 102 UAT

## Session Continuity

Last session: 2026-09-25T18:26:36.718Z
Stopped at: Completed 109-04-PLAN.md
Resume file: None

Next: `/gsd-discuss-phase 109` or `/gsd-plan-phase 109`.
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

*State updated: 2026-09-24 after the v4.6 roadmap. Per-plan metrics and per-phase decision
detail for phases 70-105 live with their archived phase artifacts; this file is a digest again.*

## Operator Next Steps

- Discuss or plan Phase 106 with /gsd-discuss-phase 106 (or /gsd-plan-phase 106)
