---
phase: 116-java-interop-test-coverage
plan: "03"
subsystem: testing
tags: [langium, linking, java-interop, vitest, test-fixtures]

requires: []
provides:
  - "JavaInteropTestService's fixture carries eight constructor-time fake classes
    (java.lang.Object, java.util.Date/List/LinkedList/Map/Map.Entry, java.sql.Date,
    java.lang.Boolean) covering every class the former interop-gated linking tests reference"
  - "linking.test.ts's 'Java class linking (test double)' block runs unconditionally, hermetically,
    in CI too — no describe.runIf gate, no shouldRunBBjTests dependency"
  - "The whole hermetic suite (RUN_BBJ_TESTS unset) reports numFailedTests 0"
affects: [116-06-verify-both-states, 117-dependency-hygiene-and-dependabot-coverage]

actuals:
  tokens: 2500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "makeMethod's opts.isStatic trailing parameter (mirroring makeField's existing shape) lets
      a fixture factory build a static method without a second builder function"
    - "Constructor-time-only fixture visibility: every new fake class was appended to the
      fakeJavaClasses array before addDocument runs, never via a post-construction seam"

key-files:
  created: []
  modified:
    - bbj-vscode/test/bbj-test-module.ts
    - bbj-vscode/test/linking.test.ts
    - bbj-vscode/test/scope-cost-regression.test.ts

key-decisions:
  - "makeMethod gained a trailing opts: { isStatic?: boolean } = {} parameter (matching
    makeField's existing shape) instead of a separate makeStaticMethod helper, keeping one
    method-building function for every fixture class"
  - "The #505 scope-cost-regression signature-type test's fixture types were swapped from
    java.util.List/java.util.Map to java.util.Collection/java.util.SortedMap — two classes the
    completed fixture does not preload — keeping the same assertion strength and the
    not.toContain lines unchanged"

requirements-completed: []

coverage:
  - id: D1
    description: "The JavaInteropTestService fixture gains java.lang.Object, java.util.Date,
      java.util.List, java.util.LinkedList, java.util.Map, java.util.Map.Entry, java.sql.Date
      and java.lang.Boolean, each built in the createHashMapClass shape with only the members
      the linking tests reference"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "test/linking.test.ts 'Java class linking (test double)' block (11 previously
          interop-gated tests, part of 41 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "linking.test.ts's former 'Interop related tests' block runs unconditionally
      as 'Java class linking (test double)', with no :5008/RUN_BBJ_TESTS dependency"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "test/linking.test.ts (env -u RUN_BBJ_TESTS npx vitest run test/linking.test.ts)"
        status: pass
      - kind: unit
        ref: "test/linking.test.ts (RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The completed fixture has no other side effect on the hermetic suite: the one
      collision found in planning (scope-cost-regression's #505 signature-type test) is fixed by
      moving that test's fixture types off the newly-preloaded classes, with the same assertion
      strength"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "test/scope-cost-regression.test.ts (env -u RUN_BBJ_TESTS npx vitest run
          test/scope-cost-regression.test.ts)"
        status: pass
      - kind: other
        ref: "coverage/phase-116/suite-03.json (numFailedTests 0, numTotalTests 3571,
          --maxWorkers=2, RUN_BBJ_TESTS=0)"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-28
status: complete
---

# Phase 116 Plan 03: Linking Fixture Completion Summary

**Completed JavaInteropTestService's fixture with eight constructor-time fake classes so linking.test.ts's 11 formerly interop-gated tests pass hermetically everywhere, then fixed the one whole-suite collision the new fixture caused.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-28T12:23:03Z (STATE.md session start for this plan)
- **Completed:** 2026-09-28T12:30:00Z (approximate)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `test/bbj-test-module.ts`: eight new constructor-time fake classes
  (`createJavaLangObjectClass`, `createJavaUtilDateClass`, `createJavaUtilListClass`,
  `createJavaUtilLinkedListClass`, `createJavaUtilMapClass`, `createJavaUtilMapEntryClass`,
  `createJavaSqlDateClass`, `createJavaLangBooleanClass`), each in the existing
  `createHashMapClass` shape with only the members the linking tests reference; `makeMethod`
  gained a trailing `opts: { isStatic?: boolean }` parameter so `valueOf` and `TRUE` can be static
- `test/linking.test.ts`: the former `describe.runIf(isInteropRunning)("Interop related tests", ...)`
  block is now `describe("Java class linking (test double)", ...)` — no gate, no `shouldRunBBjTests`
  import, running unconditionally in CI too
- `test/scope-cost-regression.test.ts`: the #505 signature-type test's fixture field/parameter
  types moved from `java.util.List`/`java.util.Map` (now preloaded by the completed fixture) to
  `java.util.Collection`/`java.util.SortedMap`, with the matching `toContain` assertions updated
  and the `not.toContain` lines unchanged
- Whole hermetic suite (`RUN_BBJ_TESTS` unset, `--maxWorkers=2`): `numFailedTests: 0`,
  `numTotalTests: 3571`

## Task Commits

Each task was committed atomically:

1. **Task 1: The formerly gated linking block runs on the completed test double and passes everywhere** — `dcf5c6ee` (feat)
2. **Task 2: The whole hermetic suite has no failure from the new fixture classes** — `bc072f36` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/test/bbj-test-module.ts` - eight new fixture classes, `makeMethod`'s `isStatic` option
- `bbj-vscode/test/linking.test.ts` - dropped the interop gate, renamed the block
- `bbj-vscode/test/scope-cost-regression.test.ts` - moved the #505 test off the newly-preloaded types

## Decisions Made
- `makeMethod` grew a trailing `opts: { isStatic?: boolean } = {}` parameter instead of a second
  `makeStaticMethod` helper — mirrors `makeField`'s existing shape and keeps one method-building
  function for every fixture class.
- The `#505` scope-cost-regression test's fixture types moved to `java.util.Collection` and
  `java.util.SortedMap` rather than to arbitrary unrelated classes, so the test still documents a
  public field type / public method parameter type collision with real (if now different) JDK
  class names.

## Deviations from Plan

None - plan executed exactly as written. Task 2's known collision (the #505 signature-type test)
was anticipated by the plan itself and fixed exactly as instructed; no other whole-suite failure
appeared in the `RUN_BBJ_TESTS=0`, `--maxWorkers=2` run, so no contention-noise or base-comparison
judgment call was needed.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The 11 formerly interop-gated `linking.test.ts` tests now run hermetically everywhere,
  addressing the first half of TEST-05 (#559) per the 2026-09-20 todo's root cause.
- Plan 06 covers the remaining "both states" whole-suite half of TEST-05 (with `:5008` up and
  down) — this plan intentionally did not mark TEST-05 Complete in REQUIREMENTS.md, per the
  plan's own instruction, since plan 06 also declares it.
- No blockers for later phase-116 plans — this plan's files (`bbj-test-module.ts`,
  `linking.test.ts`, `scope-cost-regression.test.ts`) are not declared as touched by any other
  `116-xx` plan's `files_modified`.

## Self-Check: PASSED

- `[ -f bbj-vscode/test/bbj-test-module.ts ]` → FOUND
- `[ -f bbj-vscode/test/linking.test.ts ]` → FOUND
- `[ -f bbj-vscode/test/scope-cost-regression.test.ts ]` → FOUND
- `git log --oneline --all --grep="dcf5c6ee"` / direct lookup → commits `dcf5c6ee`, `bc072f36`
  both present on `gsd/v4.7-audit-hygiene-burndown`
- Plan-level `<verification>` re-run:
  - `env -u RUN_BBJ_TESTS npx vitest run test/linking.test.ts` → 41 passed, 1 skipped, 0 failed
  - `RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts` → 41 passed, 1 skipped, 0 failed
  - Whole hermetic suite (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) → `numFailedTests: 0`,
    `numTotalTests: 3571`
- All acceptance-criteria grep/diff checks from both tasks re-run and pass (block rename, gate
  removal, 8 fixture-class name matches, zero assertion diff on `linking.test.ts`, the
  `java.util.Collection` count and unchanged `expect(requested)` count on
  `scope-cost-regression.test.ts`)
- `npx eslint test/bbj-test-module.ts test/linking.test.ts test/scope-cost-regression.test.ts` →
  exit 0
- `npm run typecheck:test` → exit 0
- `pgrep -af vitest` → no leftover vitest process (only the check command's own invocation line)

---
*Phase: 116-java-interop-test-coverage*
*Completed: 2026-09-28*
