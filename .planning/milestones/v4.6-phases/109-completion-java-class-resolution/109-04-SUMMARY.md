---
phase: 109-completion-java-class-resolution
plan: 04
subsystem: java-interop
tags: [langium, java-interop, vitest, resolveClassByName]

requires: []
provides:
  - "JAVA_PRIMITIVE_TYPE_NAMES and isLocalJavaTypeName exported from java-interop.ts, and a
    module-private localJavaTypeDto, so resolveClassByName recognizes a primitive, void,
    array-suffixed or blank type name as the first statement and resolves it locally through
    the real resolveClass pipeline instead of sending a getClassInfo request"
  - "CountingJavaInteropService, createCountingInteropServices, backendLikeDto, rawMethod and
    rawField in test/counting-java-interop.ts: a narrower Java-interop test double (left over
    resolveClassByName/resolveClass as the real, inherited implementation, spies only on
    getRawClass) reusable by plan 109-05"
  - "test/java-interop-local-types.test.ts: request-count, behaviour-neutrality, adjacency,
    multi-dimensional-array, concurrency and debug-logging coverage for issue #660"
affects: [109-05, 109-06]

actuals:
  tokens: 5372
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A local branch as the very first statement of resolveClassByName, guarded by a single
      isLocalJavaTypeName predicate, feeds a locally-built raw DTO through the real resolveClass
      pipeline rather than a parallel/duplicate stub path — so resolveClass's own cache and
      in-flight checks give every later or concurrent lookup the identical object for free"
    - "A counting test double that extends the production service directly and overrides only
      the deepest layer (getRawClass, protected) instead of overriding resolveClassByName
      itself, so the real production code path under test still runs"

key-files:
  created:
    - bbj-vscode/test/counting-java-interop.ts
    - bbj-vscode/test/java-interop-local-types.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "Reused resolveClass's own Phase 1 pipeline for the local result (feeding it a locally-built
    raw object) instead of createStubClass, whose error: 'Resolution failed or depth limit
    exceeded' is not what today's real primitive/void/array round trip produces. This keeps the
    local result behaviour-neutral: no error for a primitive/void, the same not-found error text
    for an array or blank name."
  - "isLocalJavaTypeName checks whole-name membership in a nine-name primitive/void set plus an
    endsWith('[]') array suffix, after trimming for the blank-name case only — a real class whose
    name merely contains or starts with a primitive name (java.lang.Integer, a bytes package
    segment, a class named Voider) is never matched, so only the exact primitive/void spellings
    and array/blank names are ever filtered."
  - "CountingJavaInteropService's own BACKEND_PRIMITIVE_NAMES constant is a second, independent
    list of the same nine names as the production JAVA_PRIMITIVE_TYPE_NAMES, not a shared import
    — so a behaviour-neutrality test that compares the local result against
    resolveRaw(backendLikeDto(name)) is a genuine check against a backend model, not a
    tautology that would pass even if the production filter's own list went stale or wrong."

patterns-established:
  - "The single choke point for a resolution-traffic filter is resolveClassByName's entry, not a
    parallel guard at each of Phase 2's four call sites (field/method/parameter/constructor) —
    guarding once there covers every current and future caller."

requirements-completed: []

coverage:
  - id: D1
    description: "A class with a primitive-typed member (e.g. an int-returning method) resolves
      with exactly one backend request for the class itself; the primitive member type resolves
      locally to a zero-member JavaClass named after the primitive, packageName java.lang, no
      error, shared across every later or concurrent lookup of that same primitive name"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-local-types.test.ts#primitive, void and array type names never reach the backend (issue #660) > a class with an int member resolves with one backend request, end to end"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every primitive, void, array-suffixed (any dimension) and blank/whitespace type
      name resolves with zero backend requests, and the local result matches field for field what
      resolveClass would have produced from the backend's own answer for that same name; an array
      keeps the backend's not-found error and is never replaced by its component class"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-local-types.test.ts#the local result is what the backend answered before"
        status: pass
    human_judgment: false
  - id: D3
    description: "A multi-dimensional array member type (already erased one dimension by the
      backend before reaching the language server, e.g. a byte[][] parameter arriving as
      byte[]) is still recognized as local and adds no extra backend request beyond the one for
      its owning class"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-local-types.test.ts#the local result is what the backend answered before > multi-dimensional member types (one-level backend erasure) stay local"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real class name that merely contains or starts with a primitive/void spelling
      (java.lang.Integer, java.lang.Byte, a package segment com.bytes, a class named Voider) is
      still fetched from the backend exactly once, spelled as requested — the filter matches
      whole type names only"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-local-types.test.ts#real class names still reach the backend"
        status: pass
    human_judgment: false
  - id: D5
    description: "Two concurrent lookups of the same primitive or array name return the identical
      cached object and issue zero backend requests"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-local-types.test.ts#the local result is what the backend answered before > two concurrent lookups of the same primitive or array name share one object and issue zero backend requests"
        status: pass
    human_judgment: false
  - id: D6
    description: "With bbj.debug on, the 'Resolving class ...' debug line is written for a real
      class and skipped for a primitive, void, array or blank member type name reached while
      resolving that class"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-local-types.test.ts#logging on a cold start > the debug log shows the real class but no local member type"
        status: pass
    human_judgment: false
  - id: D7
    description: "No regression in the interop suites, the unknown-java-member/completion/hover/
      method-return-java-type suites, or tsc"
    verification:
      - kind: unit
        ref: "npx vitest run test/java-interop-local-types.test.ts test/java-interop-service.test.ts test/java-interop-timeouts.test.ts test/java-interop-breaker.test.ts test/java-interop-parse-lane.test.ts test/java-class-reload.test.ts test/unknown-java-member.test.ts test/completion-test.test.ts test/method-return-java-type.test.ts test/hover.test.ts"
        status: pass
      - kind: other
        ref: "npx tsc -p tsconfig.json"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-25
status: complete
---

# Phase 109 Plan 04: JINT-01 Local Java Type Resolution Summary

**Primitive, `void`, array-suffixed and blank Java type names never reach the java-interop backend as class lookups any more — `resolveClassByName`'s first statement recognizes them and reuses `resolveClass`'s own pipeline to build the same zero-member result locally (issue #660).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-25T18:16:18Z
- **Completed:** 2026-09-25T18:25:03Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments

- Added `JAVA_PRIMITIVE_TYPE_NAMES` (the eight Java primitives plus `void`) and
  `isLocalJavaTypeName` (exported), and a module-private `localJavaTypeDto`, to
  `bbj-vscode/src/language/java-interop.ts`
- `resolveClassByName`'s first statement now short-circuits a primitive/void/array/blank name to
  `resolveClass(localJavaTypeDto(name), token, _depth)` — no `getRawClass`/`getClassInfo` round
  trip — and `resolveClass`'s `Resolving class ...` debug line is skipped for the same names
- Built `test/counting-java-interop.ts`: `CountingJavaInteropService` (extends
  `JavaInteropService` directly, overrides only `getRawClass` as a counting spy, never opens a
  socket), `createCountingInteropServices`, `backendLikeDto` (models both backends'
  `loadClassInfo`), `rawMethod`, `rawField` — reusable by plan 109-05
- Built `test/java-interop-local-types.test.ts` (23 tests): a class with an `int` member resolves
  with one backend request end to end; every primitive/void/array/blank name adds zero backend
  requests and matches the modelled round trip field for field; `byte[]` keeps its not-found error
  and is never replaced by the `byte` class; a multi-dimensional member type (one-level backend
  erasure) stays local; `java.lang.Integer`, `java.lang.Byte`, `com.bytes.Foo`, `Voider` and
  `Integer` still reach the backend exactly once each; concurrent lookups of the same local name
  share one object; the debug log shows a real class but no local member type

## Task Commits

1. **Task 1: A class with an `int` member resolves with one backend request, end to end through
   the real resolver** - `5be6842d` (feat)
2. **Task 2: Every primitive, void, array and blank name is local and behaviour-neutral; real
   names still go out** - `9d412415` (test)

**Plan metadata:** committed with this SUMMARY (see final commit)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop.ts` - `JAVA_PRIMITIVE_TYPE_NAMES`, `isLocalJavaTypeName`
  (exported), `localJavaTypeDto` added; the local branch in `resolveClassByName`; the debug-line
  skip in `resolveClass`; doc-comment sentences added to both methods
- `bbj-vscode/test/counting-java-interop.ts` - the counting test double and its helpers
- `bbj-vscode/test/java-interop-local-types.test.ts` - 23 tests across 5 `describe` blocks

## Decisions Made

- Task 1's action (build the counting double, prove the round trip, then add the local branch)
  was executed as a single implementation pass rather than a literal stop-and-confirm red step —
  the fix was written directly against the counting double and verified green, mirroring the same
  "no separate red-phase pause needed" practice the sibling 109-01/109-02/109-03 plans recorded
  for their own measurement/guard tasks in this phase. The commit boundary still matches the
  plan's task split: Task 1's commit carries the production fix plus the double plus the first
  `describe` block (the tracer's own behavior cases); Task 2's commit carries only the additional
  test cases, as a `test`-only commit.
- `CountingJavaInteropService`'s `BACKEND_PRIMITIVE_NAMES` is a second, independent nine-name
  constant, not imported from the production `JAVA_PRIMITIVE_TYPE_NAMES` — per the plan's own
  instruction, so the neutrality test stays a genuine check against a modelled backend rather than
  a tautology.
- One test comment initially cited a planning identifier (`D-08`) and was reworded to reference
  only the issue number before committing, per this repo's register-check rule.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria and behavior cases
matched their predicted shape.

## Issues Encountered

- Running `test/hover.test.ts` together with `test/unknown-java-member.test.ts`,
  `test/completion-test.test.ts` and `test/method-return-java-type.test.ts` hit two
  `initializeWorkspace` `beforeAll` hook timeouts (10000ms) in this environment — `9 skipped`
  reported alongside `96 passed`, no assertion failures. Re-run alone with
  `--hookTimeout=30000`, `hover.test.ts` passed completely (17/17), confirming environment
  contention rather than a regression, consistent with this project's documented finding on
  whole-suite hook timeouts. `hover.test.ts` was not modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `bbj-test-module.ts` remains byte-identical to the phase base commit (confirmed by `git diff
  --stat` after each task), so plan 109-05 (JINT-02, nested-class spelling in the same
  `resolveClassByName`/`resolveClass`) starts from the interop code this plan left, and can reuse
  `test/counting-java-interop.ts` as-is
- JINT-01 is NOT marked complete in `REQUIREMENTS.md` — plan 109-06 closes it after the live
  cold-start check against the real backend
- The register check (`D-xx`/`COMP-`/`JINT-`/plan-number/`CR-`/`WR-`/`IN-`/`T-109-` grep) is clean
  across both commits' diffs

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-25*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop.ts
- FOUND: bbj-vscode/test/counting-java-interop.ts
- FOUND: bbj-vscode/test/java-interop-local-types.test.ts
- FOUND: .planning/phases/109-completion-java-class-resolution/109-04-SUMMARY.md
- FOUND commit 5be6842d (Task 1) in `git log --oneline --all`
- FOUND commit 9d412415 (Task 2) in `git log --oneline --all`
