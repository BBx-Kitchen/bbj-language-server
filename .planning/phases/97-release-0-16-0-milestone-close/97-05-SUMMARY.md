---
phase: 97-release-0-16-0-milestone-close
plan: 05
subsystem: release-verification
tags: [uat, gradle, vitest, intellij, vsix, sha256, revert]

# Dependency graph
requires:
  - phase: 97-01
    provides: "the crash-detection status-feed move (later reverted — see Deviations)"
  - phase: 97-02
    provides: "the status-log from-state change (later reverted — see Deviations)"
  - phase: 97-03
    provides: "the rewritten issue447-real-interop.test.ts and the linking.test.ts re-filing"
  - phase: 97-04
    provides: "the no-op bbj/bbjcplAvailability handler and the setIndeterminate(false) fix"
provides:
  - "A closed D-01 step 1 gate (as narrowed by D-22): the post-revert tree is provably reverted, both whole suites are green, the register check is clean, both distributables are rebuilt and proven fresh, and the maintainer has approved a real-IDE hand check"
  - "The permanent record of Round 1's failed hand UAT (crash-detection rework) alongside Round 2's approved verdict, both in 97-UAT-ARTIFACTS.md"
affects: ["97-06 (landing PR)"]

actuals:
  tokens: 4200
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Round 1/Round 2 append-only UAT record: a failed hand UAT does not get deleted or rewritten, it stays as history beneath the re-run verdict"

key-files:
  created: []
  modified:
    - .planning/phases/97-release-0-16-0-milestone-close/97-UAT-ARTIFACTS.md

key-decisions:
  - "D-22 (maintainer, 2026-09-20): the crash-detection status-feed rework and the status-log from-state change are pulled out of 0.16.0 after the Round 1 hand UAT failed on macOS — a killed server arrives as started -> stopping -> stopped, which ExpectedStopGuard never classifies as a crash, and status alone cannot separate a kill from LSP4IJ's own deliberate stops. Both were reverted (8fe7cb72, a22b78ad); both todo files stay pending with the evidence appended."
  - "D-22 narrows D-01's code-wave gate to: revert provably complete, both suites green on the post-revert tree, both distributables rebuilt and proven fresh, and a short maintainer hand check of what is left (no bbj/bbjcplAvailability WARN; server starts and works) — no crash-banner or auto-restart expectation."
  - "Round 2 hand check APPROVED (2026-09-20) against bbj-intellij-0.1.0.zip sha256 9ae85e20d3a027fe341ba6afac3bd71c95ba3dcda8da4174503b0d5d99855b40 (1,159,953 bytes) and bbj-lang-0.15.3.vsix sha256 65b74bfe43dfddce4bdb2844c37678bbca94b783388f94d1243456b995476d2d (2,631,405 bytes), source commit f0f56b290a2e47c24943b0f101260380b11e2f9d. The optional Node.js download step (setFraction) was not separately exercised and is recorded as 'not reported', not as passed."

patterns-established:
  - "A hand-UAT failure is recorded with full root-cause evidence (log excerpt, classifier trace) in the same file the eventual passing verdict lives in, so the reasoning behind a pulled feature survives past the phase."

requirements-completed: []  # REL-01 is NOT complete — this plan closes only the code-wave gate (D-01 step 1); the landing PR, release dispatch, smoke and issue closure steps of REL-01 remain open.

coverage: []

duration: ~10min (task work across two rounds; Round 1 ran 2026-09-20T14:28-14:31Z, Round 2 ran 2026-09-20T15:36-15:44Z, separated by the maintainer's Round 1 hand UAT, the D-22 decision, the revert and the plan amendment)
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 05: Post-Revert Suite Gate and Hand-Check Verdict Summary

**Round 1's crash-detection hand UAT failed on macOS and was pulled from 0.16.0 (D-22); Round 2 re-gated the post-revert tree — both suites green, both distributables rebuilt fresh, and the maintainer approved what is actually left.**

## Performance

- **Duration:** ~10 min of task execution, spread across two rounds separated by a maintainer decision cycle
- **Started:** 2026-09-20T14:28:59Z (Round 1, Task 1)
- **Completed:** 2026-09-20T15:44:17Z (Round 2, Task 3 verdict recorded)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify), each run twice (Round 1 against the pre-revert tree, Round 2 against the post-revert tree)
- **Files modified:** 1 (`97-UAT-ARTIFACTS.md`, append-only across both rounds)

## Accomplishments

- **Round 1 ran and FAILED.** The crash-detection rework's hand UAT (Task 3, Round 1) found that a killed IntelliJ language-server process arrives as `started -> stopping -> stopped`, which `ExpectedStopGuard.classify` never treats as a crash — see `97-UAT-ARTIFACTS.md` § Hand UAT verdict, Round 1, for the maintainer's verbatim replies and the `idea.log` evidence trace (19 status lines, no `classified as CRASH` line, no restart line). The maintainer's blocking decision was "Pull it out of 0.16.0" (D-22).
- **The rework was reverted** (`8fe7cb72`, `a22b78ad`) and the phase's remaining plans were amended (`8a23265f`) to reflect that only four of the six folded todos ship in 0.16.0.
- **Round 2 re-ran the whole gate on the post-revert tree:** a revert-completeness assertion (exit-0 diff of the three touched files against pre-code-wave `bdc024dc`), the IntelliJ whole suite (`BUILD SUCCESSFUL`, 1096 tests, 0 failures under `--rerun-tasks`, smaller than Round 1's 1101 because the reverted work's own tests went with it), the Vitest whole suite (`numFailedTests: 0` under `RUN_BBJ_TESTS=0 --maxWorkers=2`, with three `beforeAll`-contention-timeout suites named and classified as pre-existing, not regressions), and a clean register check (no planning identifier in the diff against `origin/main`).
- **Both distributables were rebuilt from the post-revert tree** with `./gradlew clean buildPlugin` (mandatory `clean` per D-22, to defeat an UP-TO-DATE bundling task) and freshness-proved by byte-comparing each archive's bundled `main.cjs` against the just-built `bbj-vscode/out/language/main.cjs` — both comparisons reported no difference.
- **The maintainer approved the Round 2 hand check** (verbatim: "approved") against the rebuilt artifacts' identities. Per the checkpoint's resume signal, "approved" covers a clean install, a `.bbj` file reaching a started server with diagnostics and completion, and the absence of the `bbj/bbjcplAvailability` WARN in that session's `idea.log`. The optional Node.js download step was not separately exercised and is recorded as "not reported."
- **D-01 step 1's gate, as narrowed by D-22, is now closed.** The landing PR (plan 97-06) may proceed.

## Task Commits

Round 1 (against the pre-revert tree — history, not redone):
1. **Task 1 (Round 1): Two-suite gate + register check** - `25821695` (docs)
2. **Task 2 (Round 1): Distributables' identity** - `a7adea54` (docs)
3. **Task 3 (Round 1): Hand check — FAILED**, recorded as part of `25821695`/`a7adea54`'s file, verdict text added before the D-22 decision commits (`8fe7cb72`, `a22b78ad`, `18bc4408`, `8a23265f` — outside this plan's own commit set, recorded in STATE.md and 97-CONTEXT.md)

Round 2 (against the post-revert tree):
1. **Task 1 (Round 2): Revert assertion, two-suite gate, register check** - `f0f56b29` (docs)
2. **Task 2 (Round 2): Rebuild both distributables, prove freshness** - `08fa3a8e` (docs)
3. **Task 3 (Round 2): Hand-check verdict — APPROVED** - `7d3d86fc` (docs)

**Plan metadata:** this commit (docs: complete plan) plus STATE.md/ROADMAP.md updates

_Note: this is a documentation-only plan — no source files were touched; every commit lands in `97-UAT-ARTIFACTS.md`._

## Files Created/Modified
- `.planning/phases/97-release-0-16-0-milestone-close/97-UAT-ARTIFACTS.md` - append-only UAT record: Round 1's suite gate, artifact identities and failed hand-UAT verdict (kept as history), then Round 2's revert assertion, suite gate, artifact identities and approved hand-check verdict.

## Decisions Made

- **D-22** (maintainer, 2026-09-20): pull the crash-detection status-feed rework and the status-log from-state change out of 0.16.0 after the Round 1 hand UAT failed. Root cause: `ExpectedStopGuard.classify` only treats `started`/`starting` as a live predecessor, but a killed process passes through `stopping` before `stopped` — the same path LSP4IJ's own deliberate stops take, so status alone cannot distinguish a kill from a normal stop. Both changes reverted; both todo files return to `.planning/todos/pending/` with the evidence appended. This supersedes D-07/D-08 and narrows D-13/D-20/D-21 (0.16.0 ships four folded todos, not six).
- The Round 2 gate is judged against the post-revert tree only — Round 1's numbers describe code that is no longer in the tree and are preserved solely as the record of what failed and why.
- The optional Node.js download check (Task 3's step 4) was deliberately recorded as "not reported" rather than inferred as passed from the maintainer's general "approved" — the resume signal for this plan explicitly required that distinction.

## Deviations from Plan

**1. [Rule 4 - architectural, maintainer-decided] Round 1 hand UAT failed; crash-detection rework and from-state change pulled from 0.16.0**
- **Found during:** Task 3, Round 1 (checkpoint:human-verify)
- **Issue:** The crash-detection classifier never fires on a real process kill because the full status feed always passes through an intermediate `stopping` state indistinguishable from a normal shutdown.
- **Fix:** Not an auto-fix — this is a Rule 4 architectural question the maintainer decided directly: "Pull it out of 0.16.0." `BbjServerService.java`, `BbjLanguageServerFactory.java` and `ExpectedStopGuard.java` were reverted to their pre-code-wave state (`8fe7cb72`, `a22b78ad`); the Round 1 UAT failure and root cause are recorded verbatim in `97-UAT-ARTIFACTS.md`; the remaining plans in this phase were amended (`8a23265f`) to describe only the four todos that still ship.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` (reverted by prior commits `8fe7cb72`, `a22b78ad`, outside this plan's own task commits)
- **Verification:** Round 2's revert-completeness assertion (`git diff --exit-code bdc024dc -- <the three files>`) exits 0, proving the revert is byte-complete.
- **Committed in:** `8fe7cb72`, `a22b78ad` (revert), `18bc4408` (evidence record), `8a23265f` (plan amendments) — all prior to this continuation's start.

**2. [Reported, not auto-fixed — scope boundary] Vitest whole-suite reported "failed" suites with `numFailedTests: 0` in both rounds**
- **Found during:** Task 1, both rounds
- **Issue:** Round 1 saw 2 suites, Round 2 saw 3 suites reported as failed at the `--reporter=default` text-summary level, all with zero attributed failed tests. Two causes recur across both rounds: (a) `initializeWorkspace`'s `beforeAll` hook timing out under worker contention (different specific files each round — `builtin-library-members.test.ts` in Round 1; `class-validations-issues.test.ts` and `hover.test.ts` in Round 2 — confirmed passing in isolation both times), and (b) `installed-extension-e2e.test.ts`'s async LSP response handler firing after a preceding `describe`'s `afterAll` tears down the connection (reproduces on every isolated re-run in both rounds, but still reports 0 failed tests per file — a file-level uncaught-rejection event, not an assertion failure).
- **Fix:** None applied — both causes are pre-existing (confirmed via `git diff --stat 84d485b26e -- bbj-vscode/test/functional/installed-extension-e2e.test.ts` being empty) and unrelated to this phase's diff, per the executor scope boundary. Named and classified in the record rather than fixed.
- **Files modified:** none
- **Verification:** `numFailedTests: 0` in both rounds' JSON summaries; isolated re-runs pass for the contention-timeout suites.
- **Committed in:** `f0f56b29` (Round 2 record), `25821695` (Round 1 record)

---

**Total deviations:** 1 architectural (maintainer-decided, Rule 4) + 1 reported-not-fixed (pre-existing, scope boundary).
**Impact on plan:** The architectural deviation is the entire reason this plan runs a second round; it removed real, previously-planned functionality from 0.16.0 by explicit maintainer decision. The reported deviation is pure test-infrastructure noise, unchanged in kind between rounds, and does not affect the gate's pass/fail judgment.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-01 step 1's code-wave gate (as narrowed by D-22) is closed: revert proven complete, both suites green, register check clean, both distributables rebuilt and fresh, maintainer hand check approved. Plan 97-06 (the landing PR) may now proceed.
- **97-01 and 97-02 have SUMMARYs describing work that is no longer in the tree.** Both plans built the crash-detection status-feed move and the status-log from-state change; both were reverted per D-22 after the Round 1 hand UAT failed. Their SUMMARYs remain in the phase directory as history only — do not use them to predict what ships in 0.16.0, what the suite counts should be, or what a maintainer should be asked to verify. The four todos that do ship (3, 4, 5, and the issue447 half of 6) are covered by 97-03 and 97-04.
- REL-01 is **not** marked complete by this plan — this plan closes only the code-wave gate that sits in front of REL-01's remaining steps (landing PR, Preview run + hand check, release dispatch, smoke, issue closure). REL-01 stays open until those later plans complete.
- WINDOWS.md entry 1 remains open and untouched (D-05) — not this plan's concern.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*

## Self-Check: PASSED

All referenced commit hashes (`25821695`, `a7adea54`, `f0f56b29`, `08fa3a8e`, `7d3d86fc`, `8fe7cb72`, `a22b78ad`, `18bc4408`, `8a23265f`) verified present in git history via `git log --oneline --all`. `97-05-SUMMARY.md` verified present on disk.
