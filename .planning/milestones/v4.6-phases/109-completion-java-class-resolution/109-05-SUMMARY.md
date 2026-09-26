---
phase: 109-completion-java-class-resolution
plan: 05
subsystem: java-interop
tags: [langium, java-interop, vitest, resolveClassByName, nested-classes]

requires:
  - phase: 109-completion-java-class-resolution
    provides: "plan 109-04's counting test double (test/counting-java-interop.ts) and the
      resolveClassByName/resolveClass shape it left, reused unchanged"
provides:
  - "canonicalJavaClassName exported from java-interop.ts: normalizes a nested Java class's
    binary spelling (Outer$Inner) to its Java source spelling (Outer.Inner), the single identity
    used everywhere in the module"
  - "resolveClassByName, doResolveClassByName, resolveClass and getResolvedClass all key on the
    canonical spelling, so a nested class arriving under either spelling resolves once and is
    shown as Outer.Inner (issue #659)"
  - "test/java-interop-nested-class-names.test.ts: dotted-first, binary-first, the issue #659
    mechanism (a Holder class whose method and its nested class's own constructor use different
    spellings), the normalization rule's edges (multi-level nesting, anonymous/local classes, a
    $ starting a segment, a $$ run, a trailing $, an array suffix), distinct-classes guarantees
    and getResolvedClass agreement across both spellings"
affects: [109-06]

actuals:
  tokens: 5185
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A single canonicalization function applied at every entry point that reads or writes the
      resolution caches (resolveClassByName, doResolveClassByName, resolveClass,
      getResolvedClass) rather than normalizing once at the outermost caller — because
      resolveClass is also entered directly from loadImplicitImports, bypassing
      resolveClassByName entirely."
    - "The backend request still carries whichever spelling arrived (a new requestName parameter
      threaded alongside the canonical key through doResolveClassByName), so the canonical key is
      purely a caching/display concern and never changes what is sent over the wire."

key-files:
  created:
    - bbj-vscode/test/java-interop-nested-class-names.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "canonicalJavaClassName returns the whole name unchanged as soon as any `$` in it is directly
    followed by a digit, rather than normalizing per-`$`: an anonymous/local class name like
    Foo$1$Bar has no canonical spelling for either segment, so the digit check short-circuits the
    entire name rather than partially rewriting it."
  - "The `$`-to-`.` replacement captures the preceding character in a group instead of using a
    lookbehind, per the plan's own instruction, so the regex behaves identically across every
    supported JS engine."
  - "doResolveClassByName gained a second parameter (requestName) rather than re-deriving the
    original spelling from the canonical key, since a canonical key cannot be reversed back to a
    `$` spelling: 'com.test.Outer.Inner' could have arrived as either 'Outer.Inner' or
    'Outer\\$Inner', and only the caller (resolveClassByName) still has the original string."

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "Both spellings of a nested class (Outer.Inner, Outer\\$Inner), in either arrival
      order, resolve to one JavaClass object with exactly one backend request, named Outer.Inner
      with the correct packageName"
    requirement: JINT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#a nested class is resolved once whatever its spelling (issue #659) > dotted spelling first: the dotted spelling is sent once, and the binary spelling reuses the same object"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#a nested class is resolved once whatever its spelling (issue #659) > binary spelling first: the binary spelling is sent once, and the dotted spelling reuses the same object"
        status: pass
    human_judgment: false
  - id: D2
    description: "The issue #659 mechanism (a Holder class whose method returns the dotted
      spelling, whose other method returns the binary spelling, and whose nested class's own
      constructor also returns the binary spelling, mirroring bbj-ls's getCanonicalName vs
      getName split) resolves the nested class with one backend request, and every reference
      (both methods, the constructor) points at one object"
    requirement: JINT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#a nested class is resolved once whatever its spelling (issue #659) > the mechanism behind issue #659: a Holder class whose methods, and the nested class's own constructor, name the nested class under both spellings resolve to one object"
        status: pass
    human_judgment: false
  - id: D3
    description: "canonicalJavaClassName never merges a distinct class into a nested-class name:
      multi-level nesting normalizes fully (A$B$C -> A.B.C), while anonymous/local classes
      (Foo$1, Foo$1$Bar, Foo$1Local), a $ starting a segment ($Proxy12), a $$ run and a trailing
      $ are all left unchanged; an array suffix on a nested class name normalizes the class part
      only"
    requirement: JINT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#canonicalJavaClassName"
        status: pass
    human_judgment: false
  - id: D4
    description: "A name that must stay distinct from its dotted look-alike (Foo$1 vs Foo, or a
      $Proxy12-style synthetic name) is fetched and cached under its own key, never merged with
      an unrelated class, and getResolvedClass agrees with the resolution cache for both a
      resolved and an unresolved spelling"
    requirement: JINT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#names that must stay distinct"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#every lookup path agrees > getResolvedClass answers either spelling with the same object"
        status: pass
    human_judgment: false
  - id: D5
    description: "Concurrent resolution of both spellings of the same nested class (Promise.all)
      issues exactly one backend request and returns identical objects to every caller; an array
      type built on a nested class name still resolves locally with zero backend requests"
    requirement: JINT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#every lookup path agrees > concurrent Promise.all of the dotted and the $ spelling: one request, identical objects"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-nested-class-names.test.ts#every lookup path agrees > com.test.Outer$Inner[] adds no request (still a local array type)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No regression in the interop suites, java-interop-local-types.test.ts (plan
      109-04), the unknown-java-member/completion/hover/method-return-java-type suites, or tsc"
    verification:
      - kind: unit
        ref: "npx vitest run test/java-interop-nested-class-names.test.ts test/java-interop-local-types.test.ts test/java-interop-service.test.ts test/java-interop-timeouts.test.ts test/java-interop-breaker.test.ts test/java-interop-parse-lane.test.ts test/java-class-reload.test.ts test/unknown-java-member.test.ts test/completion-test.test.ts test/hover.test.ts test/method-return-java-type.test.ts"
        status: pass
      - kind: other
        ref: "npx tsc -p tsconfig.json"
        status: pass
    human_judgment: false

duration: 29min
completed: 2026-09-25
status: complete
---

# Phase 109 Plan 05: JINT-02 Nested Java Class Name Resolution Summary

**A nested Java class arriving as `Outer.Inner` or `Outer$Inner` now resolves once and displays as `Outer.Inner` everywhere — `canonicalJavaClassName` is the single cache key at every resolution entry point in `java-interop.ts`, closing issue #659's duplicate-class bug without any backend or bbj-ls change.**

## Performance

- **Duration:** ~29 min
- **Started:** 2026-09-25T18:27:00Z
- **Completed:** 2026-09-25T18:55:49Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments

- Added `export function canonicalJavaClassName(name: string): string` to
  `bbj-vscode/src/language/java-interop.ts`: normalizes a `$` that directly follows a
  letter/digit/underscore and directly precedes a letter/underscore to `.`, while leaving
  anonymous/local classes (`Foo$1`), a `$` starting a segment (`$Proxy12`), a `$$` run and a
  trailing `$` untouched — using a capture group for the preceding character rather than a
  lookbehind
- Applied it as the single key for `resolvedClasses`, `_inFlightPhase2` and
  `_pendingResolutions` in `resolveClassByName`, threading a new `requestName` parameter through
  `doResolveClassByName` so the backend is still asked with whichever spelling arrived
  (no version check, no bbj-ls change)
- `resolveClass` canonicalizes `javaClass.name` as its first statement (covering the
  `loadImplicitImports` path that calls `resolveClass` directly), and `getResolvedClass`
  canonicalizes its lookup after the `java.lang.Object` fast path
- Built `test/java-interop-nested-class-names.test.ts` (24 tests across 4 `describe` blocks):
  dotted-first and binary-first resolution, the issue #659 mechanism (a `Holder` class whose
  method and whose nested class's own constructor use different spellings, mirroring bbj-ls's
  `getCanonicalName`/`getName` split), a table-driven pin of `canonicalJavaClassName`'s edges,
  distinct-classes guarantees (`Foo$1` vs `Foo`, `$Proxy12`) and lookup-path agreement
  (concurrent resolution, `getResolvedClass`, an array type on a nested class name)

## Task Commits

1. **Task 1: Both spellings of a nested class give one request and one object, end to end
   through Phase 2** - `474bf1d8` (feat)
2. **Task 2: The normalization rule never merges distinct classes, and every lookup path
   agrees** - `307bf5fe` (test)

**Plan metadata:** committed with this SUMMARY (see final commit)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop.ts` - `canonicalJavaClassName` added and applied in
  `resolveClassByName`, `doResolveClassByName` (new `requestName` parameter), `resolveClass` and
  `getResolvedClass`
- `bbj-vscode/test/java-interop-nested-class-names.test.ts` - 24 tests across 4 `describe`
  blocks (created in Task 1, extended in Task 2)

## Decisions Made

- Task 1's tracer feedback gate re-ran the task's automated `<verify>` (the three-suite vitest
  run plus tsc) in auto mode and passed, so execution proceeded straight to Task 2 with no
  checkpoint — `workflow.auto_advance=true` and the task carries no `gate="blocking-human"`, so
  the gate followed row 2 of the tracer feedback gate precedence chain.
- All 21 of Task 2's edge-case tests (normalization-rule table, distinct-classes, lookup-path
  agreement) passed against the tree Task 1 produced with no production change needed —
  `canonicalJavaClassName` and its four call sites already generalized to multi-level nesting,
  anonymous/local classes, segment-starting `$`, `$$` runs, trailing `$` and array suffixes, so
  the task was committed as a `test`-only commit, mirroring the same pattern plan 109-03 and
  109-04 recorded for their own second tasks.
- `doResolveClassByName` gained a second parameter (`requestName`) rather than trying to recover
  the original spelling from the canonical key, since the canonicalization is one-directional
  (a canonical key like `com.test.Outer.Inner` cannot say whether the caller's original spelling
  was dotted or `$`) — only `resolveClassByName`, which still holds the original string, can
  supply it.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' behavior cases and acceptance criteria
matched their predicted shape; no auto-fixes were needed.

## Issues Encountered

- Running `test/hover.test.ts` together with `test/unknown-java-member.test.ts`,
  `test/completion-test.test.ts` and `test/method-return-java-type.test.ts` (Task 2's second
  verify command) hit two `initializeWorkspace` `beforeAll` hook timeouts (10000ms) in this
  environment, reporting `98 passed | 7 skipped`, no assertion failures. Re-run alone,
  `hover.test.ts` passed completely (17/17), confirming environment contention rather than a
  regression — the same finding this project's own `109-04-SUMMARY.md` recorded for the
  identical suite combination. `hover.test.ts` was not modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- JINT-02 is NOT marked complete in `REQUIREMENTS.md` — plan 109-06 closes it after the live
  cold-start check against the real backend, per this plan's own instruction
- `test/bbj-test-module.ts` and `test/counting-java-interop.ts`'s backend model
  (`backendLikeDto`) remain byte-identical to the phase base commit (confirmed by `git diff
  --stat` after Task 1), so plan 109-06's functional test can build on both this plan's and
  109-04's interop code unchanged
- The register check (`D-xx`/`COMP-`/`JINT-`/plan-number/`CR-`/`WR-`/`IN-`/`T-109-` grep) is
  clean across both commits' diffs

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-25*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop.ts
- FOUND: bbj-vscode/test/java-interop-nested-class-names.test.ts
- FOUND: .planning/phases/109-completion-java-class-resolution/109-05-SUMMARY.md
- FOUND commit 474bf1d8 (Task 1) in `git log --oneline --all`
- FOUND commit 307bf5fe (Task 2) in `git log --oneline --all`
