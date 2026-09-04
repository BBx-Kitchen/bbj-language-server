---
gsd_state_version: 1.0
milestone: v4.2
milestone_name: IntelliJ Burn-down
current_phase: 79
current_phase_name: EDT Responsiveness
status: verifying
stopped_at: Completed 79-03-PLAN.md (Atomic DownloadGuard, off-EDT assertion tripwire; EDT-01/EDT-06; phase 79 complete)
last_updated: "2026-09-04T10:24:43.829Z"
last_activity: 2026-09-04
last_activity_desc: Phase 79 execution started
state_head: 3fac6cacd7f0eedc7c8711bbcc63bd62ef0c23fe
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 6
  completed_plans: 6
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-04 (v4.2 roadmap created — 6 phases, 78-83)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-03)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 79 — EDT Responsiveness

---

## Current Position

Phase: 79 (EDT Responsiveness) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-09-04 — Phase 79 execution started

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 18
**Phases completed:** 77
**Plans completed:** 242
**Days elapsed:** 214
**Velocity:** ~1.1 plans/day (lifetime); v4.1 ran at ~2.6 plans/day

### Recent History

**v4.1 (Shipped: 2026-09-03):**

- Duration: 14 days
- Phases: 8 (70-77; 76 closed by 75)
- Plans: 37
- Key: Eight advisories remediated 1:1 per phase, each fix merged to `main` via a human-gated public PR with red-then-green regression coverage; override closeout — PROC-01/02/03 carried as known gaps until a tagged release and publication

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
| Phase 75 P01 | 65min | 3 tasks | 9 files |
| Phase 75 P02 | 58min | 3 tasks | 10 files |
| Phase 75 P03 | 14min | 3 tasks | 5 files |
| Phase 75 P04 | 8 min | 3 tasks | 4 files |
| Phase 75 P05 | 26min | 3 tasks | 1 files |
| Phase 75 P06 | 65min | 2 tasks | 2 files |
| Phase 77 P01 | 20min | 3 tasks | 6 files |
| Phase 77 P02 | 12min | 3 tasks | 1 files |
| Phase 77 P03 | 10min | 3 tasks | 5 files |
| Phase 77 P04 | 20min | 3 tasks | 3 files |
| Phase 77 P05 | 15min | 3 tasks | 2 files |
| Phase 77 P06 | 20min | 1 tasks | 1 files |
| Phase 77 P07 | 35min | 2 tasks | 1 files |
| Phase 78 P01 | 17min | 3 tasks | 4 files |
| Phase 78 P02 | 20min | 3 tasks | 6 files |
| Phase 78 P03 | 52min | 3 tasks | 3 files |
| Phase 79 P01 | 25min | 3 tasks | 13 files |
| Phase 79 P02 | ~15min | 3 tasks | 10 files |
| Phase 79 P03 | 20min | 3 tasks | 7 files |

## Accumulated Context

### Active Constraints

- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only (see REQUIREMENTS.md disclosure notice)
- Per-phase implementation detail (findings, fix design, tests) lives inside each advisory's private fork, not under `.planning/phases/` on `main`
- Remediation RESEARCH is likewise untracked (`.git/info/exclude`): `SECRETS-AND-EXEC.md` and `SUPPLY-CHAIN.md` exist on disk only. Naming a file plus the control to add to it discloses that the control is absent — "best-practice framing" does not sanitise that. Copy the relevant sections into each private fork when its phase starts.
- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment
- v4.2 sequencing: TOKEN-01 (#535) must land before TOKEN-04 (#542) — a trust-window cache built on a fail-open expiry check widens the vulnerability. Phase 83 (BUILD-04, BUILD-05) depends on Phase 79 (EDT paths) and Phase 81 (new `bbj/compile` surface) landing first.

### Decisions

Full decision log in PROJECT.md Key Decisions table. Per-phase decision detail for phases
70-77 was archived with the phase directories under `.planning/milestones/v4.1-phases/`
(embargoed, off `main`) and removed from this file at the v4.1 close — it described fix
mechanisms for advisories that are still unpublished. Standing decisions that still apply:

- [v4.1, standing]: No CVE is requested for any v4.1 advisory during implementation; CVE
  and severity are decided by the maintainer at publication time (a deliberate PROC-03
  departure, recorded per phase).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus
  deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.1, landing shape]: An advisory's private fork cannot take a same-repo pull request
  (its base resolves to the public repo), so every fix landed via a normal public PR under a
  recorded PROC-01 waiver.
- [Phase 74 UAT]: Three post-hoc code-review findings accepted as residual before
  publication; detail embargoed.
- [Phase 77 UAT]: Two human-attestation items closed at the UAT checkpoint 2026-09-03;
  detail embargoed.
- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before
  registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion
  filtering
- [v4.2 roadmap]: Phases 78-83 derived from research's 8-phase grouping, merged to 6:
  build foundation (78) gates every `./gradlew` invocation; EDT shared-state guards and the
  new caching layer merged into one EDT Responsiveness phase (79); the compile action and
  lexer/commenter fixes merged into one Feature Parity phase (81), matching the
  REQUIREMENTS.md category boundary; LSP4IJ coupling tests deferred to a final Regression
  Test Hardening phase (83) so it can cover both the EDT paths and the new compile surface.
- [Phase 78]: 78-01: Daemon JVM criteria (toolchainVersion=17) plus a compile/test toolchain block fix #570; foojay resolver proven end-to-end with a real Temurin 17.0.20.1 download for the self-heal path. — Gradle 8.x cannot run its daemon on Java 25; the daemon JVM criteria file steers the daemon itself, which a build-script-level toolchain block alone cannot do.
- [Phase 78]: 78-02: Wrapper regenerated to Gradle 8.14.5 via the wrapper task run twice, checksums verified live against services.gradle.org, and buildPlugin proven on intellij-platform-gradle-plugin 2.11.0 after installing missing host fontconfig/libfreetype6 packages (unrelated to the version bump).
- [Phase 78]: 78-03: fail-fast bundle guard scoped via gradle.taskGraph.hasTask(buildPlugin|prepareSandbox|runIde) so the pre-existing test-sandbox coupling (intellij-platform-gradle-plugin's prepareTestSandbox needing a composed jar) never fails ./gradlew test on a clean clone — Two Rule-1 fixes discovered only by running the build: processResources->classes->test coupling (fixed by moving copyLanguageServer's output outside sourceSets.main.output) and the deeper plugin-internal test-sandbox coupling (fixed by scoping the guard's throw to packaging tasks only)
- [Phase 79]: Phase 79 Plan 01: Task 1 redirected all six external restart call sites (not just BbjRestartServerAction) because making doRestart() private broke compilation for the others (Rule 3 blocking-issue auto-fix); Task 2 still delivered its own scoped source-guard coverage.
- [Phase 79]: Phase 79 Plan 01: the in-file crash-balloon Restart action (notifyCrash()) was also redirected through requestRestart(0), a superset of D-06 matching #539's 'all triggers' literally.
- [Phase 79]: Phase 79 Plan 02: BbjNodeVersionCache memoizes node --version keyed on path + file stat (lastModified+length); KeystrokeDebouncer over the 79-01 Scheduler seam cancels only its own pending task (never cancelAll), keeping two Settings fields on one Alarm independent; BbjSettingsLookups isolates all Settings-dialog file/subprocess work off the EDT. — EDT-02/EDT-03 (#541, #543): a per-path stat-keyed cache avoids re-spawning node --version on every notification refresh, and a debounced background lookup with staleness discard removes all keystroke-path filesystem/subprocess work from the EDT while keeping the two settings fields independently coalesced.
- [Phase 79]: Phase 79 Plan 03: DownloadGuard.tryAcquire performs the compare-and-set and completion-attachment under one lock, acquired before the Task.Backgroundable is queued (the actual EDT-06 fix, since the old persisted flag was set only after a second caller could already pass the check); assertIsNonDispatchThread() compiled without a ThreadingAssertions substitution on this platform. — EDT-06 (#537) and EDT-01 (#506) verify-and-close; both close phase 79's remaining requirements

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Blockers/Concerns

- **8 draft advisories — every fix merged to `main`, none yet published.** v4.1 closed
  2026-09-03 with all eight phases verified (70 and 77 with recorded overrides). Publication
  for each waits on a tagged `manual-release.yml` release, then per-advisory severity/CVE
  decisions and publication by the maintainer. GHSA-p5f3-9456-9pcx (fixed in v4.0, PR #637)
  waits on the same release. The post-release checklist is in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21).
  With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates
  on a bare TCP connect to :5008. BBjServices squats on that port without speaking the
  interop protocol, so 11 `linking.test.ts` interop tests switch on and fail. Green with
  `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`. Since 2026-09-03 the live backend also
  exposes `getAllClassNames`, which drifts a further set of interop tests (todo filed).

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

---

## Session Continuity

Last session: 2026-09-04T10:24:43.769Z
Stopped at: Completed 79-03-PLAN.md (Atomic DownloadGuard, off-EDT assertion tripwire; EDT-01/EDT-06; phase 79 complete)
Resume file: None

Next: `/gsd-plan-phase 78`. Roadmap for v4.2 (Phases 78-83) created 2026-09-04; build
foundation (78) gates every subsequent `./gradlew` invocation in this environment.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
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

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-04 after v4.2 roadmap creation (Phases 78-83)*

## Operator Next Steps

- Plan the first phase with `/gsd-plan-phase 78`
