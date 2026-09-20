---
phase: 97-release-0-16-0-milestone-close
plan: 03
subsystem: testing
tags: [vitest, java-interop, test-housekeeping, gradle-wrapper]

requires:
  - phase: 97-release-0-16-0-milestone-close
    provides: none (independent test-housekeeping wave, no code dependency on 97-01/97-02)
provides:
  - issue447-real-interop.test.ts capability test rewritten to a backend-shape-agnostic invariant
  - gradle-wrapper-hygiene.test.ts confirmed green (folded todo 5 closed, bookkeeping only)
  - linking.test.ts's 11 interop-gated failures re-filed with the actual, evidence-based root cause
affects: [97-05 (whole-suite gate), 97-11 (todo close-out bookkeeping)]

actuals:
  tokens: 6500
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md
  modified:
    - bbj-vscode/test/functional/issue447-real-interop.test.ts

key-decisions:
  - "issue447's capability test now asserts a product invariant (probe result agrees with the cached flag; suggestions resolve either way) instead of one backend's answer, so it is green regardless of which java-interop server shape is live."
  - "The linking.test.ts investigation took the re-file branch, not the fix branch: both the complete-class-index hypothesis and the live-interop warm-up hypothesis were tested and refuted, and the real root cause (the describe block runs against a hermetic, never-connecting test double, not real interop) is out of this plan's declared scope to fix."

requirements-completed: [REL-01]

coverage:
  - id: D1
    description: "issue447 capability test passes against both java-interop backend shapes"
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/functional/issue447-real-interop.test.ts#capability detection: the index probe and the cached flag agree, and suggestions work either way"
        status: pass
    human_judgment: false
  - id: D2
    description: "gradle-wrapper-hygiene fixture confirmed green with no code change (folded todo 5 bookkeeping)"
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/gradle-wrapper-hygiene.test.ts (19/19 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "linking.test.ts's 11 interop failures investigated within the time-box; re-filed with refuted hypotheses and confirmed root cause recorded"
    requirement: "REL-01"
    verification: []
    human_judgment: true
    rationale: "The investigation itself is complete and evidence-backed (source inspection + an empirical warm-up experiment), but whether the re-filed todo's proposed fix direction is the right one for a future phase is a judgment call for a human, not something a passing test can certify."

duration: 20min
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 03: Test-Housekeeping for Folded Todos 5 & 6 Summary

**Rewrote the issue447 capability test to a backend-shape-agnostic invariant, confirmed the gradle-wrapper-hygiene fixture is already green, and re-filed the linking.test.ts interop failures with the actual root cause found by refuting two hypotheses in turn.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-20T13:55:00Z (approx.)
- **Completed:** 2026-09-20T14:02:02Z
- **Tasks:** 3
- **Files modified:** 2 (1 test file rewritten, 1 new todo file)

## Accomplishments

- `issue447-real-interop.test.ts`'s capability-detection test no longer hard-codes the older
  backend's answer (`toBe(false)`). It now asserts `ensureCompleteClassIndex()`'s result is a
  boolean, that `hasCompleteClassIndex()` agrees with it, and that `resolveClassCandidatesBySimpleName('HashMap')`
  still contains `java.util.HashMap` regardless of backend shape. Ran against the live `:5008`
  backend with `RUN_BBJ_TESTS=1` (this environment's default port-open auto-detect would also have
  picked it up, but the run was forced explicitly per the plan): 2 passed, 0 failed.
- `gradle-wrapper-hygiene.test.ts` confirmed green: 19/19 passed, no code change. The fixture
  derives its expected properties lines from the real `bbj-intellij/gradle/wrapper/gradle-wrapper.properties`
  at test time (currently declaring Gradle **9.7.1**), so a future wrapper bump cannot desynchronize
  it again — folded todo 5 is closed as pure bookkeeping (todo file move happens in plan 97-11).
- `linking.test.ts`'s 11 "Interop related tests" failures were investigated within the ~45-minute
  time-box: the predecessor todo's complete-class-index hypothesis was refuted by source inspection
  (already refuted in RESEARCH.md), and the project's own live-interop warm-up hypothesis was tested
  empirically — a `beforeAll` warming `java.util.Map`/`java.util.Map.Entry` through the suite's
  `JavaInteropService` was added, run (identical 11 failed/7 passed/24 skipped), and reverted.
  Reading `bbj-vscode/test/bbj-test-module.ts` found the actual root cause: this describe block runs
  against `JavaInteropTestService`, a hermetic test double whose `connect()` always rejects and whose
  `resolveClassByName()` never registers a class with the scope/linker — the `isInteropRunning` gate
  and the fake service are structurally disconnected from each other. Re-filed as
  `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` with the
  verbatim baseline failures, both refuted hypotheses, the confirmed root cause, and two fix-option
  directions for a future investigator.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — the issue447 capability test passes against the live backend as it is
   today** - `b86b2e27` (test)
2. **Task 2: Confirm the gradle-wrapper-hygiene fixture is green (folded todo 5, no code change)** -
   no commit (verification-only per the plan; file is unmodified, nothing to stage)
3. **Task 3: Time-boxed investigation of the eleven linking interop failures** - `7848e275` (docs)

**Plan metadata:** (this commit)

_Note: Task 1 was a `type="tracer"` task. Per the tracer feedback gate, auto mode is active
(`workflow._auto_chain_active`/`workflow.auto_advance`), so its `<verify>` was re-run end-to-end
after the commit (2 passed, 0 failed; `toBe(false)` count 0) and execution proceeded straight to
Task 2 without a checkpoint._

## Files Created/Modified

- `bbj-vscode/test/functional/issue447-real-interop.test.ts` - capability test rewritten to a
  backend-shape-agnostic invariant; `describe`/`beforeAll`/`linkingErrors`/second test untouched
- `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` - new todo
  recording the refuted hypotheses, confirmed root cause, and fix-option directions

## Decisions Made

- The rewritten issue447 test states the invariant (probe answer agrees with the cached flag;
  suggestions resolve either way) rather than either backend's specific answer — this is the fix
  the plan's `must_haves.truths` required, and it means a green local run and a green CI run mean
  the same thing regardless of which java-interop shape is live (T-97-08 mitigation).
- The linking.test.ts investigation took the "re-file" branch, not the "fix" branch, per the plan's
  explicit two-branch design: both leading hypotheses (complete-class-index, live-interop warm-up)
  were tested and refuted rather than assumed, and the actual root cause (a hermetic test double that
  never talks to real interop, gated by a check that only asks whether real interop is reachable) is
  a fixture-completeness problem outside this plan's scoped todo list — fixing it would mean either
  adding several new fake Java classes to `JavaInteropTestService` or rewiring the describe block to
  use a genuinely live-backed services instance, both of which are new work, not "fix the two todos
  as scoped."

## Deviations from Plan

None - plan executed exactly as written. Task 2 required no commit because the plan explicitly
scoped it as verification-only ("make no edit... Do not move the todo file here"); this is expected
per the task's own acceptance criteria, not a deviation.

## Issues Encountered

None. The plan's own time-box for Task 3 was respected — both hypotheses were tested and refuted
inside roughly 30 minutes of the allotted ~45, well short of an open-ended investigation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Folded todo 5 is closed (bookkeeping-only close-out deferred to plan 97-11, which moves all six
  todo files together per the plan's own instruction).
- Folded todo 6 shipped as "issue447 fixed, linking residual re-filed" — the new todo file exists
  under `.planning/todos/pending/` and will also move in plan 97-11's bookkeeping step.
- No blockers for plan 97-05's whole-suite gate: this plan neither introduces new local-suite
  failures nor claims to have fixed the pre-existing 11 (they remain exactly as documented in
  DEBT.md and the predecessor todo, now with a more precise root cause on record).

## Self-Check: PASSED

- `[ -f /home/coder/repos/bbj-language-server/bbj-vscode/test/functional/issue447-real-interop.test.ts ]` -> FOUND
- `[ -f /home/coder/repos/bbj-language-server/.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md ]` -> FOUND
- `git log --oneline --all --grep="97-03"` -> FOUND (b86b2e27, 7848e275)
- Re-ran plan-level `<verification>`:
  - `RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts` -> 2 passed, 0 failed. PASS
  - `npx vitest run test/gradle-wrapper-hygiene.test.ts` -> 19/19 passed, file unmodified. PASS
  - Linking investigation ended in exactly one branch (re-file), with the todo file present and
    evidence recorded. PASS
- Acceptance criteria for all three tasks re-verified: `toBe(false)` count 0; `DocumentBuilder`
  count 0 in both touched test files; `git diff --exit-code -- bbj-vscode/src` clean.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
