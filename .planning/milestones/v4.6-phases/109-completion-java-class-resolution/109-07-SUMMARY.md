---
phase: 109-completion-java-class-resolution
plan: 07
subsystem: completion
tags: [langium, scope-provider, vitest, completion, gap-closure]

requires:
  - phase: 109-completion-java-class-resolution
    provides: "plan 109-02's MemberCall class-reference branch in bbj-scope.ts, which this plan
      narrows to close the one gap 109-VERIFICATION.md recorded against COMP-01"
provides:
  - "The class-reference detection in bbj-scope.ts's member-completion branch now tells the
    class pseudo-member apart from a fully-qualified reference to a class literally named
    Class by the preceding segment's inferred type, not by the member text alone"
  - "Regression tests in test/completion-class-reference.test.ts pinning java.lang.Class.
    (no USE) as static-only, matching the USE'd list, and pinning that the .class
    pseudo-member still offers java.lang.Class instance members after that class or after a
    value, with no unexpected diagnostics either way"
affects: []

actuals:
  tokens: 2641
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "isClassRef detection's MemberCall branch narrowed with a local isPseudoClassMember flag:
      true only when the member text lowercased is 'class' AND the preceding segment's inferred
      type (this.typeInferer.getType(receiver.receiver)) is not a JavaPackage; the existing
      try/catch cyclic-reference guard and isJavaClass(receiver.member.ref) read run only when
      that flag is false"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/test/completion-class-reference.test.ts

key-decisions:
  - "The type inferer already types the full java.lang.Class receiver expression as the
    java.lang.Class JavaClass under either reading (memberRefText === 'class' is a case-sensitive
    check that only matches the lowercase pseudo-member spelling, never the class name 'Class'),
    so receiverType needed no change; only the isClassRef detection's preceding-segment check
    was narrowed, per D-11 and the plan's own scope boundary (bbj-type-inferer.ts, java-interop.ts
    and bbj-test-module.ts stayed untouched, confirmed byte-identical to the phase base commit
    571cafee)."
  - "Task 2's three new guards (the .class pseudo-member after the class named Class or after a
    value, and the three validation cases) all passed against the tree Task 1 produced with no
    further bbj-scope.ts change -- Task 1's preceding-segment check already covers every shape
    the plan's <interfaces> block measured, so Task 2 is a test-only commit."

patterns-established: []

requirements-completed: [COMP-01]

coverage:
  - id: D1
    description: "java.lang.Class. typed without USE offers exactly the static-only label set
      ['class', 'forName()'] -- the same list as Class. after use java.lang.Class -- for both
      Invoked and .-trigger completion requests"
    requirement: "COMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#completion after a fully-qualified Java class reference (issue #577) > the class named Class offers its static members only without USE"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#completion after a fully-qualified Java class reference (issue #577) > the class named Class matches the list after USE"
        status: pass
    human_judgment: false
  - id: D2
    description: "The .class pseudo-member keeps offering java.lang.Class's instance members
      after the fully-qualified class named Class (java.lang.Class.class.) and after a value
      (s!.class.)"
    requirement: "COMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#receivers that keep today's member list > the .class pseudo-member after the class named Class or after a value offers java.lang.Class instance members"
        status: pass
    human_judgment: false
  - id: D3
    description: "A static method called through the fully-qualified class named Class has no
      diagnostics; an instance method called that way is not an Error (a Warning-severity
      linking diagnostic is expected and not suppressed); .class after that class still links
      its instance members with no diagnostics"
    requirement: "COMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#validation after a fully-qualified class reference > a static method called through the fully-qualified class named Class has no diagnostics"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#validation after a fully-qualified class reference > an instance method called through the fully-qualified class named Class is not an Error"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#validation after a fully-qualified class reference > .class after the fully-qualified class named Class still links its instance members"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-26
status: complete
---

# Phase 109 Plan 07: Class-Reference Static-Only Gap Closure Summary

**`java.lang.Class.` typed without `USE` now offers the static-only list `['class', 'forName()']` — the same list `Class.` offers after `use java.lang.Class` — by narrowing `bbj-scope.ts`'s pseudo-member exclusion with the preceding segment's inferred type, closing the one gap 109-VERIFICATION.md recorded against COMP-01.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-26T04:31:00Z
- **Completed:** 2026-09-26T04:42:58Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Narrowed the text-only `class`-pseudo-member exclusion in `bbj-scope.ts`'s `isClassRef` detection: a `MemberCall` receiver whose member text lowercased is `class` is now only treated as the pseudo-member when the preceding segment's inferred type (`this.typeInferer.getType(receiver.receiver)`) is **not** a `JavaPackage`. After a package, the same text falls through to the existing `receiver.member.ref` read and `isJavaClass` check, so a fully-qualified reference to the class named `Class` (`java.lang.Class.`) now takes the static-only branch exactly like every other fully-qualified class reference.
- Proved the gap red first: pushed a static `forName` method onto the fake `java.lang.Class` test double (mirroring the existing `valueOf` push on the fake `java.lang.String`), added two tests asserting the static-only list and USE-equivalence for `java.lang.Class.`, ran them and confirmed both failed on the exact leaked `getName()` instance method — then applied the fix and confirmed both pass.
- Rewrote the comment above the detection to state the new rule: the member text alone cannot tell the `class` pseudo-member apart from a class literally named `Class` (BBj is case-insensitive and the pseudo-member links to the same java.lang.Class node), so the preceding segment decides — after a package it names a class in that package (static members only); after a class or a value it is the pseudo-member (all instance members).
- Pinned the two pseudo-member shapes that must keep working after the narrowing: `java.lang.Class.class.` and `s!.class.` (`declare java.lang.String s!`) both still offer `['class', 'forName()', 'getName()']` — every guard already held on the tree Task 1 produced, so Task 2 needed no further `bbj-scope.ts` change.
- Pinned three validation guards: `x! = java.lang.Class.forName()` and `x! = java.lang.Class.class.getName()` produce no diagnostics at all; `x! = java.lang.Class.getName()` produces no `bbj-unknown-java-member` diagnostic and no Error-severity diagnostic (a Warning-severity linking diagnostic is expected and intentionally not suppressed — the same treatment `java.lang.String.charAt()` already gets).
- Confirmed `bbj-type-inferer.ts`, `java-interop.ts` and `bbj-test-module.ts` remain byte-identical to the phase base commit `571cafee` — the fix is entirely in `bbj-scope.ts`'s class-reference detection, per D-11 and the plan's own scope prohibition.
- Whole-suite regression gate: `numFailedTests=0`, `numTotalTests=2848` (up from the phase's prior 2842 by the 6 new tests this plan added); tsc clean.

## Task Commits

1. **Task 1: `java.lang.Class.` offers the same static-only list as `Class.` after USE, end to end** - `cc25ae07` (fix)
2. **Task 2: The pseudo-member after the class named Class or a value, validation guards and the phase gate** - `d95fc856` (test)

**Plan metadata:** committed with this SUMMARY

## Files Created/Modified

- `bbj-vscode/src/language/bbj-scope.ts` - narrowed the `class`-pseudo-member exclusion in the `isClassRef` detection with a preceding-segment `JavaPackage` check; rewrote the surrounding comment
- `bbj-vscode/test/completion-class-reference.test.ts` - pushed a static `forName` onto the fake `java.lang.Class`; added `STATIC_FOR_NAME` and `USE_ADDED_CLASS_SYMBOL` constants; added two tests for the class named `Class` (static-only list, USE-equivalence), one test pinning both `.class` pseudo-member shapes, and three validation tests

## Decisions Made

- No production change was needed beyond Task 1's single narrowed condition — the type inferer already types the full `java.lang.Class` receiver expression as the `java.lang.Class` `JavaClass` under either reading (`memberRefText === 'class'` is a case-sensitive check, so it only ever matches the lowercase pseudo-member spelling, never the class name `Class`), and `hasCertainReceiverType` already returns `false` for a `MemberCall` receiver, so the unknown-member check was already inert for this path (carried over from 109-02's finding).
- Task 2's three new guards all passed immediately against the tree Task 1 produced, confirming the plan's own measured `<interfaces>` facts held exactly as described; Task 2 is therefore a test-only commit.

## Deviations from Plan

None - plan executed exactly as written. Task 1 followed its own red-then-green instruction (two new tests added first, confirmed failing on the exact leaked `getName()`, then the fix applied and both tests passed). Task 2's guards all passed with no further code change, exactly as the plan's `<interfaces>` measurements predicted.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The 109-VERIFICATION.md gap against COMP-01 (ROADMAP criterion 1, the class literally named `Class`) is closed by behaviour — `java.lang.Class.` typed without `USE` now offers exactly the static-only list `Class.` offers after `use java.lang.Class`, with no override needed.
- `String.class.`, `java.lang.String.class.`, `java.lang.Class.class.` and `s!.class.` all keep offering `java.lang.Class` instance members.
- `bbj-type-inferer.ts`, `java-interop.ts` and `bbj-test-module.ts` remain untouched since the phase base commit `571cafee`, so this gap-closure plan has no effect on JINT-01/02 or COMP-02/03.
- Ready for phase re-verification (`/gsd-verify-work 109` or equivalent) to confirm the gap is closed and COMP-01 can be marked Complete.

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/bbj-scope.ts
- FOUND: bbj-vscode/test/completion-class-reference.test.ts
- FOUND commit cc25ae07 (Task 1) in `git log --oneline --all`
- FOUND commit d95fc856 (Task 2) in `git log --oneline --all`
- Re-ran all task-level `<acceptance_criteria>`: all pass (see Task Commits and Files above)
- Re-ran plan-level `<verification>`: `test/completion-class-reference.test.ts`, `test/completion-test.test.ts`, `test/unknown-java-member.test.ts` all pass (90/90); whole suite `numFailedTests=0 numTotalTests=2848`; tsc clean; `bbj-type-inferer.ts`/`java-interop.ts`/`bbj-test-module.ts` unchanged since `571cafee` (confirmed via `git diff --stat`); register check clean on both commits
