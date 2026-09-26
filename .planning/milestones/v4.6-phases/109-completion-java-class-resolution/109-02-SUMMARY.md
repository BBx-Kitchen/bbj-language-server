---
phase: 109-completion-java-class-resolution
plan: 02
subsystem: completion
tags: [langium, scope-provider, vitest, java-interop, completion]

requires: []
provides:
  - "A MemberCall branch in bbj-scope.ts's class-reference detection so a fully-qualified Java
    class receiver (java.lang.String.) offers the same static-only completion list as USE'd
    String., excluding the implicit .class pseudo-member"
  - "test/completion-class-reference.test.ts pinning the USE/no-USE label-set match, instance
    access, .class, package, no-static-member and case-variant guards, and the absence of a
    bbj-unknown-java-member Error through a fully-qualified receiver"
affects: []

actuals:
  tokens: 2433
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Class-reference detection extended with an else-if MemberCall branch, reusing the exact
      try/catch cyclic-reference idiom and isJavaClass predicate the existing SymbolRef branch
      already uses, excluding member text 'class' (case-insensitively) so the .class pseudo-member
      keeps its own instance-of-java.lang.Class member list"

key-files:
  created:
    - bbj-vscode/test/completion-class-reference.test.ts
  modified:
    - bbj-vscode/src/language/bbj-scope.ts

key-decisions:
  - "Invoked-trigger completion at this cursor position also offers a 'start new statement'
    fallback merged with the member-scope candidates; after USE that fallback additionally offers
    the bare class name itself (String) as a program-scope symbol, which the no-USE form has no
    equivalent for. This is a genuine, pre-existing scope difference caused by USE itself (not a
    class-member leak), so the Invoked-trigger label-set comparison filters that one known name
    before asserting equality; the dot-trigger comparison needs no such allowance (its list is
    already narrow and exactly equal)."
  - "Every Task 2 guard (instance access, .class, package, no-static-member class, case-variant
    receiver, and both unknown-member validation cases) already held on the tree Task 1 produced
    with no further production change -- Task 1's isClassRef detection and its 'class' exclusion
    already covers every guard, and hasCertainReceiverType already returns false for a MemberCall
    receiver, so the unknown-member check can never fire through a fully-qualified class reference
    regardless of this fix."

patterns-established: []

requirements-completed: [COMP-01]

coverage:
  - id: D1
    description: "java.lang.String. (no USE) offers exactly the same static-only label set as
      String. after USE java.lang.String, for both Invoked and .-trigger completion requests,
      including a pushed static method and the implicit class pseudo-member"
    requirement: "COMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#completion after a fully-qualified Java class reference (issue #577) > offers static members only without USE"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#completion after a fully-qualified Java class reference (issue #577) > matches the list after USE"
        status: pass
    human_judgment: false
  - id: D2
    description: "Instance access, the .class pseudo-member, a package receiver, a fully-qualified
      class with no static members, and a case-variant fully-qualified receiver all keep today's
      correct member list"
    requirement: "COMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#receivers that keep today's member list"
        status: pass
    human_judgment: false
  - id: D3
    description: "No bbj-unknown-java-member Error fires on an instance or static field read
      through a fully-qualified class reference"
    requirement: "COMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-class-reference.test.ts#validation after a fully-qualified class reference"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-09-25
status: complete
---

# Phase 109 Plan 02: Completion & Java Class Resolution Summary

**`java.lang.String.` typed without `USE` now offers exactly the static-only completion list `String.` offers after `USE java.lang.String` — one new `MemberCall` branch in `bbj-scope.ts`'s class-reference detection, no `java-interop.ts` or backend change.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-09-25T17:46:00Z
- **Completed:** 2026-09-25T17:57:08Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments

- Added an `else if (isMemberCall(receiver) && receiver.member && receiver.member.$refText.toLowerCase() !== 'class')` branch to `bbj-scope.ts`'s `isClassRef` detection, reusing the existing `SymbolRef` branch's exact try/catch cyclic-reference idiom and `isJavaClass` predicate against `receiver.member.ref` — a fully-qualified receiver (`java.lang.String.`) is now recognized as a class reference exactly like a `USE`'d `SymbolRef` receiver, while a receiver ending in `.class` (`String.class`, `java.lang.String.class`) is explicitly excluded and keeps offering `java.lang.Class`'s own instance members
- Built `test/completion-class-reference.test.ts` with a `labels(text, trigger?)` driver (mirroring `completion-method-body.test.ts`'s `labelsAt`) and proved, red-then-green (the fix was temporarily reverted, the tests failed on leaked `someInstanceField`/`charAt()`, then the fix was restored and both tests passed): the no-`USE` static-only list and the `USE`'d list are the same set for both Invoked and `.`-trigger completion, including a static `valueOf()` method pushed onto the fake `java.lang.String` class
- Pinned five additional receiver shapes that must keep today's behaviour unchanged: instance access on a declared variable (all members), `.class` on both a `USE`'d and a fully-qualified receiver (`getName()`), a bare package receiver (`java.lang.` still offers `String`), a fully-qualified class with no static members (`java.util.HashMap.` offers only `class`), and a case-variant fully-qualified receiver (`JAVA.LANG.STRING.` never leaks an instance-only member) — every one of these already held on the tree produced by Task 1, confirming D-11's design needed no further branch
- Pinned that `x! = java.lang.String.someInstanceField` and `x! = java.lang.String.CASE_INSENSITIVE_ORDER` produce no `bbj-unknown-java-member` diagnostic — `hasCertainReceiverType` already returns `false` for a `MemberCall` receiver (the only branches it recognizes are `ConstructorCall`, `CastExpression`, `StringLiteral`, a `bbjapi(...)` `MethodCall`, and `SymbolRef`), so this check can never fire through a fully-qualified class reference regardless of the scope fix
- Confirmed `java-interop.ts` and `bbj-test-module.ts` are byte-identical to the phase base commit — the fix is entirely in `bbj-scope.ts`'s member-completion branch, per D-11

## Task Commits

1. **Task 1: `java.lang.String.` offers the same static-only list as `String.` after USE, end to end** - `7851ea43` (feat)
2. **Task 2: Instance, `.class`, package, case and validation guards keep today's behaviour** - `ee145d94` (test)

**Plan metadata:** committed with this SUMMARY (see final commit)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-scope.ts` - added the `MemberCall`-receiver branch to `isClassRef` detection (member-completion scope branch, `getScope`)
- `bbj-vscode/test/completion-class-reference.test.ts` - `labels()` completion driver, the USE/no-USE label-set match, five receiver-shape guards, and two unknown-member validation guards

## Decisions Made

- Invoked-trigger completion at a dangling `MemberCall` position also merges in a "start new statement" fallback; after `USE`, that fallback additionally offers the bare class name (`String`) as a program-scope symbol with no equivalent in the no-`USE` form. This is a real, pre-existing artifact of `USE` itself, not a class-member leak, so the Invoked-trigger equality assertion filters that one known name (documented inline as `USE_ADDED_PROGRAM_SYMBOL`) before comparing; the `.`-trigger comparison needed no such allowance since its narrower list already matched exactly.
- A Java method's completion label carries its call parentheses (`valueOf()`, `getName()`, `charAt()`), matching the convention already established in `completion-method-body.test.ts`.

## Deviations from Plan

None - plan executed exactly as written. Task 1 followed its own red-then-green instruction (fix temporarily reverted, tests confirmed failing on the exact leaked members, fix restored, tests passed). Task 2's guards all passed immediately with no further code change, exactly as Task 1's D-11 design predicted — the same "branch A" outcome the sibling Phase 109-01 plan recorded for its own measurement matrix.

## Issues Encountered

- `RUN_BBJ_TESTS=0 npx vitest run test/linking.test.ts test/hover.test.ts` reported a failed suite: `test/hover.test.ts`'s `beforeAll(initializeWorkspace(...))` hook timed out (10000ms) in 3 of its describe blocks (`numFailedTests: 0`, 27 tests passed, 32 skipped). Reproduced identically (same 3 hook timeouts, same 0 failed tests) on the phase base commit (`0379065c`, the parent of plan 109-01's first commit) in a scratch worktree with node_modules and generated/ symlinked in — confirmed pre-existing environment contention, not a regression from this plan's change. `test/linking.test.ts` run alone passes clean (23 passed, 19 skipped — the known interop-gated baseline).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMP-01 is marked complete in REQUIREMENTS.md — this plan is its sole declarer
- `bbj-scope.ts`'s member-completion branch now has the class-reference detection D-11 required; 109-03 through 109-05 build on top of the current scope/type-inferer/interop code, none of which this plan touched further
- `java-interop.ts` and `bbj-test-module.ts` remain byte-identical to the phase base, so JINT-01/02 (plan 109-04/05) start from the same interop code this plan found

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-25*

## Self-Check: PASSED

- FOUND: .planning/phases/109-completion-java-class-resolution/109-02-SUMMARY.md
- FOUND commit 7851ea43 (Task 1) in `git log --oneline --all`
- FOUND commit ee145d94 (Task 2) in `git log --oneline --all`
