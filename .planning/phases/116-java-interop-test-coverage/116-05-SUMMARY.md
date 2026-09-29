---
phase: 116-java-interop-test-coverage
plan: "05"
subsystem: testing
tags: [langium, parser, linking, java-interop, vitest, diagnostics]

requires:
  - phase: 116-java-interop-test-coverage
    provides: "116-04's indexed classpath document (indexJavaClasspathDocument), so BBjAPI() resolves to the JavaClass, not the member-less synthetic BbjClass"
provides:
  - "The last of the three disabled parser.test.ts assertions re-enabled and passing: 'Release usage' (BBjAPI().getGlobalNamespace().getValue() chain with release())"
  - "BBjAPI.getGlobalNamespace and the com.basis.bbj.proxies.BBjNamespace fixture (getValue(java.lang.String) -> java.lang.Object) in test/bbj-test-module.ts, with the real signatures read from the live peer"
  - "A src/ fix: processLinkingErrors no longer emits a linking diagnostic when a member is reached through a receiver whose resolved type is exactly java.lang.Object"
affects: [119-grammar-declare-and-shared-channel]

actuals:
  tokens: 3900
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "isUniversalObjectReceiver (already used by the unknown-member Error check) is now also
      consulted by bbj-document-validator.ts's processLinkingErrors, so both diagnostic paths
      apply the same 'a receiver typed exactly java.lang.Object can hold anything' rule"

key-files:
  created: []
  modified:
    - bbj-vscode/test/bbj-test-module.ts
    - bbj-vscode/test/parser.test.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/test/linking.test.ts

key-decisions:
  - "Task 1's blocking-human checkpoint was already resolved at plan time (/gsd-plan-phase 116):
    the human chose 'suppress-object-receiver-warning' -- no linking diagnostic for a member
    reached through an exactly-java.lang.Object receiver (a src/ change), with 'Release usage'
    asserting expectNoValidationErrors exactly as D-07 states. Reason recorded in the plan: this
    meets D-07's assertion and TEST-04's 're-enabled and pass' literally, matches D-07's stated
    intent that the code is valid BBj and not flagged, and applies the rationale
    isUniversalObjectReceiver already documents to both diagnostic paths (the Error check already
    skipped Object receivers; the linking-Warning path did not). The known cost is a production
    behaviour change: any Object-typed receiver loses a Warning it shows today, narrowing FIX-03's
    visibility rule for that one type. No further human input was requested for this task per the
    plan's own instruction."
  - "The two new linking-block tests were written and confirmed RED before the src/ change, by
    saving the src/ diff as a local patch, reverting the file with git checkout -- <file> (never
    git stash), running the new tests, and observing the exact pre-fix failure ('release' is not
    a known method or field of Object still reported as a linking diagnostic on the Object-typed
    receiver), then reapplying the patch with git apply."
  - "The control test ('An unknown member on another resolved Java class is still reported') does
    not use findLinkingErrors: a declared (non-array) receiver's unresolved member is certain
    enough to trip checkUnknownJavaMember's Error path, not the linking-Warning path, so the test
    asserts on document.diagnostics directly (exactly one diagnostic naming release) rather than
    the LinkingError-coded subset."

requirements-completed: [TEST-04]

coverage:
  - id: D1
    description: "BBjAPI.getGlobalNamespace (real signature) and the com.basis.bbj.proxies.BBjNamespace
      fixture (getValue(java.lang.String) -> java.lang.Object) added to test/bbj-test-module.ts,
      with the real signatures read from the live peer during planning"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/parser.test.ts 'Release usage'"
        status: pass
    human_judgment: false
  - id: D2
    description: "'Release usage' runs a live expectNoValidationErrors and passes; no DISABLED
      comment remains in parser.test.ts"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/parser.test.ts 'Release usage' (env -u RUN_BBJ_TESTS npx vitest run test/parser.test.ts)"
        status: pass
      - kind: other
        ref: "grep -c DISABLED bbj-vscode/test/parser.test.ts == 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "processLinkingErrors skips the linking diagnostic for a member reached through a
      receiver whose resolved type is exactly java.lang.Object (isUniversalObjectReceiver);
      an unknown member on any other fully resolved Java class still gets exactly one diagnostic"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/linking.test.ts 'A member reached through a java.lang.Object receiver is not flagged' (RED before the src/ fix, GREEN after)"
        status: pass
      - kind: unit
        ref: "test/linking.test.ts 'An unknown member on another resolved Java class is still reported'"
        status: pass
    human_judgment: false
  - id: D4
    description: "The whole hermetic suite, lint and typecheck:test all stay green after the
      fixture and src/ changes"
    requirement: "TEST-04"
    verification:
      - kind: other
        ref: "coverage/phase-116/suite-05.json (numFailedTests 0, numTotalTests 3574, --maxWorkers=2, RUN_BBJ_TESTS=0)"
        status: pass
      - kind: other
        ref: "npm run lint / npm run typecheck:test"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-28
status: complete
---

# Phase 116 Plan 05: BBjAPI() Chain Decision Summary

**The BBjAPI().getGlobalNamespace().getValue().release() chain resolves against the completed fixture, and processLinkingErrors now suppresses the linking diagnostic for any member reached through an exactly-java.lang.Object receiver -- the last of TEST-04's three disabled parser.test.ts assertions is live and green.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-28T12:51:16Z (end of 116-04)
- **Completed:** 2026-09-28T13:27:19Z
- **Tasks:** 2 (Task 1 resolved at plan time; Task 2 executed)
- **Files modified:** 4

## Accomplishments
- `test/bbj-test-module.ts`: `BBjAPI.getGlobalNamespace` returning
  `com.basis.bbj.proxies.BBjNamespace`, and a new `com.basis.bbj.proxies.BBjNamespace` fixture
  class with `getValue(java.lang.String)` returning `java.lang.Object` -- the real signatures
  read from the live peer during planning, no semaphore typing
- `src/language/bbj-document-validator.ts`: `processLinkingErrors` skips the reference entirely
  (no diagnostic) when the receiver's resolved type is exactly `java.lang.Object`
  (`isUniversalObjectReceiver`, imported from the unknown-java-member check it already draws
  `UNKNOWN_JAVA_MEMBER_CODE` from) -- a real LS bug fix per D-06's disposition
- `test/parser.test.ts`: `'Release usage'` runs a live `expectNoValidationErrors` and passes; no
  `DISABLED` text remains anywhere in the file
- `test/linking.test.ts`: two new tests in the `'Java class linking (test double)'` block --
  the Object-receiver skip, and a control proving an unknown member on another resolved Java
  class (`java.lang.String`) still produces exactly one diagnostic

## Task Commits

Task 1 (`checkpoint:decision`, `gate="blocking-human"`) was pre-resolved by the human at plan
time (`/gsd-plan-phase 116`), per the plan's own `<resolved>` block instructing the executor not
to stop and ask again -- no code change, no commit for Task 1 itself.

1. **Task 2: The BBjAPI() chain resolves on the fixture, and Release usage runs the assertion the
   chosen option calls for** - `e1704f92` (fix)

**Plan metadata:** (this commit)

_Note: Task 2 is TDD (`tdd="true"`); the RED state for the two new linking-block tests was
verified by temporarily reverting `bbj-document-validator.ts` (saved as a local patch, restored
via `git apply`, never `git stash`), confirming the Object-receiver test failed with the exact
pre-fix `'release' is not a known method or field of Object` linking diagnostic, and the control
test already passed unchanged. The fixture additions, the `src/` fix and both new tests commit
together in Task 2's single commit, following the same pattern 116-04 established: the TDD gate
is enforced at the task level via the plan's `<verify>`/`<acceptance_criteria>` re-run, not a
separate `test(...)` commit._

## Files Created/Modified
- `bbj-vscode/test/bbj-test-module.ts` - `BBjAPI.getGlobalNamespace`; new
  `com.basis.bbj.proxies.BBjNamespace` fixture class
- `bbj-vscode/test/parser.test.ts` - live `'Release usage'` assertion, no `DISABLED` text left
- `bbj-vscode/src/language/bbj-document-validator.ts` - `processLinkingErrors` skips a member
  reached through an exactly-`java.lang.Object` receiver
- `bbj-vscode/test/linking.test.ts` - two new tests: the Object-receiver skip and its control

## Decisions Made
- The chosen option is **suppress-object-receiver-warning** (see `key-decisions` in the
  frontmatter for the full reason, copied from the plan's `<resolved>` block).
- The control test asserts on `document.diagnostics` directly rather than `findLinkingErrors`,
  because a declared (non-array) receiver's unresolved member already trips the unknown-member
  **Error** check (`checkUnknownJavaMember`), not the linking-Warning path -- both diagnostic
  paths were exercised as intended, but only one of the two carries the `LinkingError` code.
- No fixture members beyond `getValue` were added to `BBjNamespace`; the plan's interfaces block
  named only that one real signature as needed for the chain.

## Deviations from Plan

None - plan executed exactly as written, including the D-06/D-07 test-first sequencing (tests
written first, confirmed RED via a reverted `src/` file, then the fix reapplied) and the
human's pre-recorded Task 1 decision.

### Auto-fixed Issues

None.

---

**Total deviations:** 0
**Impact on plan:** None - plan executed as specified.

## Issues Encountered

The control test's first draft used `findLinkingErrors` (matching the plan's first-glance
wording "still gives exactly one diagnostic that names release"), but the receiver
(`declare java.lang.String s!`, a non-array `VariableDecl`) is certain enough to trip
`hasCertainReceiverType`, so the unresolved `release` member is reported by the **Error**-level
`checkUnknownJavaMember` check, not the `LinkingError`-coded Warning path `findLinkingErrors`
filters for. Confirmed this was correct (not a regression) by running the control test against
the reverted `src/` file first: it already passed (1 diagnostic, `LinkingError`-filtered count 0)
before any change was made, proving the assertion needed to read `document.diagnostics` directly,
not narrow to the `LinkingError` code. Rewrote the assertion accordingly; no `src/` or fixture
change was needed to fix this.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three previously `DISABLED` `parser.test.ts` assertions are now live and green
  (`grep -c DISABLED bbj-vscode/test/parser.test.ts` returns 0). TEST-04 (#528) is complete;
  this is the last part of it per the plan's own frontmatter (`requirements: [TEST-04]`).
- `isUniversalObjectReceiver` is now referenced from both
  `src/language/validations/check-unknown-java-member.ts` (the Error path) and
  `src/language/bbj-document-validator.ts` (the linking-Warning path) -- relevant context for
  any future change to either diagnostic path, and for phases 119-121's refactors.
- No blockers for the rest of the phase -- this plan's files
  (`bbj-test-module.ts`, `parser.test.ts`, `bbj-document-validator.ts`, `linking.test.ts`) match
  exactly this plan's own `files_modified` declaration.

## Self-Check: PASSED

- `[ -f bbj-vscode/test/bbj-test-module.ts ]` -> FOUND
- `[ -f bbj-vscode/test/parser.test.ts ]` -> FOUND
- `[ -f bbj-vscode/src/language/bbj-document-validator.ts ]` -> FOUND
- `[ -f bbj-vscode/test/linking.test.ts ]` -> FOUND
- `git log --oneline --all` shows commit `e1704f92` on `gsd/v4.7-audit-hygiene-burndown`
- Plan-level `<verify>` re-run:
  - `env -u RUN_BBJ_TESTS npx vitest run test/parser.test.ts test/linking.test.ts test/validation.test.ts`
    -> 308 passed, 2 skipped, 0 failed
  - Whole hermetic suite (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) -> `coverage/phase-116/suite-05.json`:
    `numFailedTests: 0`, `numTotalTests: 3574`
  - `npm run lint` -> exit 0
  - `npm run typecheck:test` -> exit 0
- All acceptance-criteria checks re-run and pass: `grep -c DISABLED` -> 0;
  `grep -c getGlobalNamespace bbj-test-module.ts` -> 3 (>= 1); `grep -c com.basis.bbj.proxies.BBjNamespace`
  -> 4 (>= 2); `grep -c isUniversalObjectReceiver bbj-document-validator.ts` -> 3 (>= 1)
- `pgrep -af vitest` -> no leftover vitest process
- `git status --short` -> only the pre-existing `.planning/STATE.md` (unstaged, to be updated by
  this plan's own state-update step) and the pre-existing untracked `.planning/milestone.lock`;
  no stray probe/patch files (the throwaway `plan-05-src-fix.patch` under `coverage/phase-116/`
  was deleted before commit)

---
*Phase: 116-java-interop-test-coverage*
*Completed: 2026-09-28*
