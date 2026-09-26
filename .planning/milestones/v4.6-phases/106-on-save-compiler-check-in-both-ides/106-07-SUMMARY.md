---
phase: 106-on-save-compiler-check-in-both-ides
plan: 07
subsystem: verification
tags: [uat, on-save, intellij, vscode, lsp4ij, measurement]
status: complete

# Dependency graph
requires:
  - phase: 106-on-save-compiler-check-in-both-ides
    provides: "On-save trigger and kept errors (plans 01, 05, 06), live parse on its own connection (plan 02), IntelliJ Compiler check setting (plan 03), bbjcpl fallback dedup (plan 04)"
provides:
  - "VSIX and IntelliJ zip built from the final tree with a byte-identical language-server bundle, SHA-256 recorded"
  - "Whole vitest suite numFailedTests=0 (2671 tests) and IntelliJ JUnit suite green (1109 tests) on the final tree"
  - "Tester approval of all 13 hand-verification steps in VS Code and IntelliJ, with idea.log / LSP4IJ trace evidence for the IntelliJ restart-on-Apply and one-diagnostics-update-per-save behaviour"
  - "106-MEASUREMENT.md: metric, environment, runbook reference, results (timing re-check recorded as not taken) and per-step hand-verification"
affects: []

# Actuals (#2632)
actuals:
  tokens: 3800
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/106-on-save-compiler-check-in-both-ides/106-MEASUREMENT.md
  modified: []

key-decisions:
  - "The Phase 105 timing re-check was not taken, at the user's decision after the checkpoint; the Results table records 'not taken' with the 105 medians (5.3 s VS Code, 6 s IntelliJ) kept for comparison, and the verdict is 'no regression evidence either way'."
  - "A single message-level IntelliJ trace gap of about 5.3 s is noted but not counted as a sample, because the trace had no payloads and the diagnostic source of that update could not be confirmed."
  - "The one 5000 ms stop timeout during a restart is attributed to the known upstream LSP4IJ shutdown issue #1672, not to this phase."

requirements-completed: []

# Metrics
duration: ~2.5 h wall-clock (Task 1 builds and suites, then the hand-verification checkpoint)
completed: 2026-09-24
---

# Phase 106 Plan 07: On-Save Compiler Check UAT and Measurement Summary

**Both distributables built from the final tree with an identical server bundle, both whole suites green, all 13 on-save / IntelliJ setting / fallback-dedup steps approved by the tester in VS Code and IntelliJ; the Phase 105 timing re-check was not taken, at the user's decision.**

## Performance

- **Duration:** about 2.5 h wall-clock, including the time spent waiting at the checkpoint
- **Completed:** 2026-09-24
- **Tasks:** 3 (1 auto/tracer, 1 human-verify checkpoint, 1 auto)
- **Files modified:** 1 planning file (no source changes)

## Accomplishments

- Built `/tmp/phase-106-uat/bbj-lang.vsix` and `/tmp/phase-106-uat/bbj-intellij-0.1.0.zip`; the zip's `main.cjs` is byte-identical to `bbj-vscode/out/language/main.cjs`; SHA-256 of both recorded.
- Whole vitest suite (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`): `numFailedTests=0`, 2671 tests. IntelliJ `./gradlew test --rerun-tasks`: BUILD SUCCESSFUL, 1109 tests, 0 failures.
- Tester approved all 13 hand-verification steps in both IDEs. Evidence from the tester's `idea.log` and LSP4IJ trace: test plugin build 0.1.0 loaded, server v0.16.4; each Settings Apply scheduled a restart in 500 ms; each `didSave` led to one `publishDiagnostics` for the file (plus one after `didChangeWatchedFiles`), with no duplicate bursts.
- Tester machine and IDE versions recorded (macOS 27.0 aarch64, IntelliJ IDEA 2026.2.3, JBR 25.0.4, LSP4IJ 0.21.0, Node 22). VS Code version, BBjServices version and other port-5008 clients were not reported.

## Task Commits

1. **Task 1: Build both distributables, run both whole suites, prepare the measurement record** - `a2071c45` (docs)
2. **Task 2: Hand UAT in VS Code and IntelliJ, and the Phase 105 timing re-check** - checkpoint, no commit (approved; re-check not taken)
3. **Task 3: Record the re-check results and hand-verification outcome** - `8d357c29` (docs)

**Plan metadata:** final docs commit (this SUMMARY, STATE.md, ROADMAP.md)

## Files Created/Modified

- `.planning/phases/106-on-save-compiler-check-in-both-ides/106-MEASUREMENT.md` - metric, environment, runbook reference, results table, per-step hand-verification and log evidence

## Decisions Made

See `key-decisions` in the frontmatter. The final commit recorded in the measurement is `a2071c45`; the `bbj-vscode/` and `bbj-intellij/` sources are unchanged since `6824b2ca`, so the tested distributables match that tree.

## Deviations from Plan

### User-directed deviations

**1. Timing re-check not taken (user decision)**
- **Found during:** Task 2 checkpoint
- **Issue:** The plan asks for three timing samples per IDE, following the Phase 105 runbook on the large workspace (criterion 5, JINT-03). The tester first asked whether the times could come from the logs. The trace that was supplied was message-level only (no payloads, so the `BBj Parser` diagnostic could not be identified), covered one IntelliJ run and no VS Code run. The user then decided: "skip the re-check, record it as not taken".
- **Resolution:** Results table cells are "not taken" for both IDEs; the 105 medians are kept; the verdict per IDE is "not taken — user decision; no regression evidence either way". The approximately 5.3 s gap from the one IntelliJ trace is noted but not counted as a sample. The plan's truth "first live diagnostic in about 5-6 s in each IDE" is therefore not evidenced by this plan.
- **Files modified:** `106-MEASUREMENT.md`
- **Commit:** `8d357c29`

**2. Hand-verification recorded as approval, not per-step observations**
- **Found during:** Task 3
- **Issue:** The tester's reply was "approved" without per-step observations, and no VS Code trace was supplied.
- **Resolution:** Each of steps 1-13 is recorded as "pass (tester approved)". Log evidence is attached only where the IntelliJ logs support it (step 11: restart on Apply, one diagnostics update per save). The VS Code steps rest on the tester's approval alone.

### Auto-fixed Issues

None.

## Issues Encountered

- One restart logged "Timed out after 5000 ms waiting for the BBj language server to stop; starting anyway", with an LSP4IJ `TimeoutException` during shutdown. The server came back. This is attributed to the known upstream LSP4IJ shutdown issue #1672.
- Large-workspace observation: during the initial build, linking took about 24.9 s and queued requests waited 4-12 s. This behaviour predates this phase.
- Test-environment note: the JetBrains Marketplace downloaded BBj Language Support 0.16.5 as a pending update during testing. The session under test ran the plan's 0.1.0 build.

## Requirements

This plan declares TRIG-02, TRIG-06 and JINT-03, but other plans in this phase also declare each of them (TRIG-02 in plan 01, TRIG-06 in plan 03, JINT-03 in plan 02). None is marked complete here. Phase verification decides. The JINT-03 timing criterion has no re-check evidence (see Deviation 1).

## Next Phase Readiness

- All seven plans of phase 106 have summaries. The phase is ready for verification. The skipped timing re-check should be noted there as a user-accepted gap.

## Self-Check: PASSED

- FOUND: `.planning/phases/106-on-save-compiler-check-in-both-ides/106-MEASUREMENT.md` (verify printed `measurement-ok`; 5 required section headings)
- FOUND: commit `a2071c45`
- FOUND: commit `8d357c29`
