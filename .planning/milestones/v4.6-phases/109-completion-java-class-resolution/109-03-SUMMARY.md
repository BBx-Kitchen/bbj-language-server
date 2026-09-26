---
phase: 109-completion-java-class-resolution
plan: 03
subsystem: completion
tags: [langium, type-inferer, overload-selector, vitest, java-interop]

requires: []
provides:
  - "argumentTypeOf, OverloadCandidate, overloadCandidates and bestOverloadCandidates exported
    from bbj-overload-selector.ts, sharing argument-type derivation between the inlay-hint
    provider and the type inferer and keeping a candidate's AstNode alongside its MethodData"
  - "bbj-type-inferer.ts's MethodCall branch re-selects an overloaded call's return type by the
    call's own argument types before falling back to the linker's first-yielded declaration,
    with a conservative no-type answer when the arguments do not decide between candidates with
    different return types"
  - "test/overload-return-type.test.ts pinning both BBj and Java overload orders, completion on
    the matched result, every tie-rule shape, the unchanged link target, and the unchanged
    bbj-unknown-java-member guard"
affects: [109-06]

actuals:
  tokens: 7034
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A caller-supplied AstNode-preserving candidate shape (OverloadCandidate) sits alongside
      the existing MethodData-only findBestOverload — the new path is additive, not a
      replacement, so the inlay-hint provider's own call site and tie rule are untouched"
    - "The type inferer's re-selection is a pre-check inside the existing isMethodCall branch:
      it returns early only when it has something to say (2+ same-named candidates), otherwise
      falling through to today's linked-member lookup unchanged"

key-files:
  created:
    - bbj-vscode/test/overload-return-type.test.ts
  modified:
    - bbj-vscode/src/language/bbj-overload-selector.ts
    - bbj-vscode/src/language/bbj-type-inferer.ts
    - bbj-vscode/src/language/bbj-inlay-hint-provider.ts

key-decisions:
  - "Task 1 was executed red-then-green: the test file was written and run against the
    unmodified (pre-fix) source first (4 of 7 cases failed exactly as predicted — the
    String-first HashMap case, the HashMap-first String case, the completion case, and the
    methodret validation case), then the fix was restored and the same 7 cases passed. The
    pre-fix source was preserved via file copies rather than git stash, per the project's
    stash prohibition."
  - "Task 2 (tdd=\"true\") found every one of its 19 pinned cases — Java overload order, the
    conservative tie rule in all four shapes, the arity-only pick, the no-sibling case, the
    unchanged link target, and both unknown-member validation guards — already passing against
    the tree Task 1 produced. No production code change was needed; the task's own generic
    OverloadCandidate/bestOverloadCandidates design already covered the Java case without a
    second re-selection path. Committed as a test-only commit, matching the same 'branch A, no
    fix needed' outcome the sibling 109-01 and 109-02 plans recorded for their own measurement
    tasks."

patterns-established:
  - "A conservative tie rule lives in the type inferer only, never in findBestOverload: tied
    candidates with differing declared return types infer no type at all (not a guess), so no
    downstream type-based check can fire on a wrong guess. Tied candidates sharing a return type
    still infer it."

requirements-completed: [COMP-02]

coverage:
  - id: D1
    description: "A call to an overloaded BBj method (MethodDecl) gets the return type of the
      overload its arguments match, in either declaration order, and completion on the result
      follows the matched type"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/overload-return-type.test.ts#overloaded BBj method calls (issue #556)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A call to an overloaded Java method (JavaMethod) gets the return type of the
      overload its arguments match, in either declaration order, and completion on the result
      follows the matched type"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/overload-return-type.test.ts#overloaded Java method calls (issue #556)"
        status: pass
    human_judgment: false
  - id: D3
    description: "When the arguments do not decide between candidates (a scoring tie, unknown
      argument types, or no overload taking the argument count), tied candidates with different
      return types give the call no inferred type and offer no member completion from either
      candidate; tied candidates sharing a return type give that type"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/overload-return-type.test.ts#arguments that do not decide"
        status: pass
    human_judgment: false
  - id: D4
    description: "A method with no same-named sibling keeps today's linked type; the linker's
      link target and the inlay-hint provider's findBestOverload call and tie rule are
      unchanged for both the BBj and Java cases; no bbj-unknown-java-member Error fires on a
      member read through a re-selected or tied call result"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/overload-return-type.test.ts#what does not change"
        status: pass
      - kind: other
        ref: "git diff --stat HEAD -- bbj-vscode/src/language/bbj-linker.ts bbj-vscode/src/language/bbj-scope.ts bbj-vscode/test/bbj-test-module.ts (empty)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-25
status: complete
---

# Phase 109 Plan 03: Overload-Aware Return Type Summary

**An overloaded BBj or Java method call now infers the return type of the overload its arguments actually match, in either declaration order, via a new AstNode-preserving candidate shape in `bbj-overload-selector.ts` consumed only by the type inferer — the linker's link target and the inlay-hint provider's own tie rule are untouched.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-25T17:58:26Z
- **Completed:** 2026-09-25T18:13:19Z
- **Tasks:** 2 completed
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments

- Added `argumentTypeOf` (moved verbatim from the inlay-hint provider's own `argumentType`),
  `OverloadCandidate`, `overloadCandidates` and `bestOverloadCandidates` to
  `bbj-overload-selector.ts`, alongside the existing `findBestOverload`/`siblingOverloads`
  (both left unchanged) — the new functions keep a candidate's originating `JavaMethod` or
  `MethodDecl` node paired with its `MethodData`, so a re-selected overload's return type can be
  resolved back to a `Class`, which `findBestOverload`'s `MethodData`-only result cannot do for
  a `MethodDecl` sibling
- Added `declaredReturnType` (a shared per-kind return-type resolver, reused by the existing
  `SymbolRef`/`MemberCall` branches) and `overloadedCallType` to `bbj-type-inferer.ts`; the
  `isMethodCall` branch now calls `overloadedCallType` first and uses its result when it has
  something to say (2 or more same-named candidates), falling back to today's
  linked-member lookup otherwise
- `bbj-inlay-hint-provider.ts`'s `argumentType` now delegates to `argumentTypeOf`; its own
  `findBestOverload` call site, parameters, and tie rule are byte-identical to before this plan
- Built `test/overload-return-type.test.ts` (26 tests) covering: BBj overloads in both
  declaration orders, Java overloads in both declaration orders, completion on the matched
  result, the conservative tie rule (differing-return-type tie, shared-return-type tie,
  arity-only disambiguation, no-arity-fit fallback), a method with no same-named sibling, the
  unchanged linker link target for both the BBj and Java case, and the absence of a
  `bbj-unknown-java-member` diagnostic on a re-selected or tied call result
- Task 1 proved red-then-green: the test file, run against the unmodified source, failed
  exactly the 4 cases the fix targets (String-first HashMap, HashMap-first String, the
  completion case, and the `methodret` validation case) and passed the other 3; restoring the
  fix turned all 7 green
- Task 2's 19 additional cases (Java side, every tie shape, the link target, both validation
  guards) all passed immediately against the tree Task 1 produced — no further production
  change was needed, since `overloadCandidates`/`bestOverloadCandidates` already generalize
  over both `JavaMethod` and `MethodDecl` candidates

## Task Commits

1. **Task 1: An overloaded BBj method call infers the matching overload's return type, end to
   end** - `61d8dd88` (feat)
2. **Task 2: Java overloads, the tie rule, the link target and the validation guards** -
   `f4a1bb85` (test)

**Plan metadata:** committed with this SUMMARY (see final commit)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-overload-selector.ts` - `argumentTypeOf`, `OverloadCandidate`,
  `overloadCandidates`, `bestOverloadCandidates` added; `findBestOverload`/`siblingOverloads`
  unchanged
- `bbj-vscode/src/language/bbj-type-inferer.ts` - `declaredReturnType` and `overloadedCallType`
  added; the `isMethodCall` branch re-selects before falling back; the `SymbolRef`/`MemberCall`
  branches reuse the shared resolver
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` - `argumentType` delegates to
  `argumentTypeOf`; `findBestOverload` call site unchanged
- `bbj-vscode/test/overload-return-type.test.ts` - 26 tests across 5 `describe` blocks: BBj
  overloads, Java overloads, undecided-argument shapes, and what does not change

## Decisions Made

- Task 1's red-then-green proof used file copies (not `git stash`, forbidden by this repo's
  project rules) to hold the pre-fix source while confirming the 4 targeted cases failed.
- Task 2 needed no production code change — its 19 cases (Java side, every D-06-shaped tie
  rule case, the link target, and both validation guards) all passed against the implementation
  Task 1 already generalized, so it was committed as a `test`-only commit.
- Two comments/test names initially cited planning identifiers (`D-05`, `D-06`) and were
  reworded in place before committing, per this repo's register-check rule.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their own predicted branch (Task
1's red-then-green cases failed/passed exactly as designed; Task 2's cases all passed with no
fix needed, mirroring the "branch A" outcome the sibling 109-01 and 109-02 plans recorded for
their own measurement/guard tasks in this same phase).

## Issues Encountered

- Running `overload-selector.test.ts` and `hover.test.ts` together with other suites (and once
  with `--maxWorkers=2`) hit `initializeWorkspace` `beforeAll` hook timeouts (10000ms) in this
  environment — `numFailedTests: 0` in every case, only "Hook timed out" errors. Each affected
  file was re-run alone (and, for `hover.test.ts`, with `--hookTimeout=30000`) and passed
  completely (1/1 and 17/17 respectively), confirming environment contention rather than a
  regression, consistent with this project's documented finding on whole-suite hook timeouts.
  Neither file was modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMP-02 is marked complete in REQUIREMENTS.md — this plan is its sole declarer
- `bbj-linker.ts`, `bbj-scope.ts` and `bbj-test-module.ts` remain byte-identical to the phase
  base commit, so plans 109-04 and 109-05 (JINT-01/02, `java-interop.ts`) start from the same
  interop code this plan found
- The inlay-hint provider's `findBestOverload` call site and tie rule are unchanged, so no
  downstream plan needs to account for a behaviour change there

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-25*

## Self-Check: PASSED

- FOUND: .planning/phases/109-completion-java-class-resolution/109-03-SUMMARY.md
- FOUND commit 61d8dd88 (Task 1) in `git log --oneline --all`
- FOUND commit f4a1bb85 (Task 2) in `git log --oneline --all`
