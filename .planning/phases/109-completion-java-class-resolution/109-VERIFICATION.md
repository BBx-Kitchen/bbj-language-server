---
phase: 109-completion-java-class-resolution
verified: 2026-09-25T19:37:31Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "After a fully-qualified Java class reference typed without USE, completion offers only static members (ROADMAP criterion 1)"
    status: partial
    reason: >
      The roadmap's own literal example (`java.lang.String.`) works correctly and was independently
      re-verified: it offers exactly the static-only list, matching `String.` after `USE
      java.lang.String`. But the general statement "completion offers only static members" after
      *any* fully-qualified Java class reference does not hold universally: a fully-qualified
      reference whose last segment is literally the identifier `Class` (case-insensitively, e.g.
      `java.lang.Class.` typed with no `USE`) is misclassified as the synthetic `.class`
      pseudo-member and falls into the instance-access branch instead of the static-only branch.
      Independently reproduced against the current tree: `java.lang.Class.<|>` (dot-trigger, no
      USE) returns `["class", "getName()"]` — `getName()` is `java.lang.Class`'s *instance*
      method, not a static member, proving the instance-access (unfiltered) branch was taken. This
      is exactly code review finding WR-01 (`109-REVIEW.md`), reproduced first-hand rather than
      taken on the review's word.
    artifacts:
      - path: "bbj-vscode/src/language/bbj-scope.ts"
        issue: >
          Line ~212: `isMemberCall(receiver) && receiver.member && receiver.member.$refText.toLowerCase() !== 'class'`
          excludes any receiver whose last segment's text is `class`, which also excludes a
          literal, fully-qualified reference to the class named `Class` itself (BBj is
          case-insensitive, so the two are indistinguishable by text). No test in
          `completion-class-reference.test.ts` exercises a receiver literally named `Class`.
    missing:
      - "Either a follow-up fix that disambiguates the `.class` pseudo-member from a literal reference to a class named `Class` (per WR-01's suggested approaches: narrow the exclusion, or add a documented/tested-limitation comment plus a regression test pinning today's actual behavior), or an explicit maintainer override in this VERIFICATION.md accepting the narrow collision as out of scope."
---

# Phase 109: Completion & Java Class Resolution Verification Report

**Phase Goal:** Completion offers the right members in the right places: statics only after a
fully-qualified Java class, the result type of the overload a call actually matches, and
candidates inside class method bodies. Class resolution sends the java-interop backend only real
class names, once each.
**Verified:** 2026-09-25T19:37:31Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Criterion 1: fully-qualified Java class reference (no `USE`) offers only static members | ⚠️ PARTIAL (gap) | `java.lang.String.` verified correct (independently re-run, matches USE'd list); `java.lang.Class.` (any FQN ending in the literal segment `Class`) falls into the instance-access branch and offers `getName()` (an instance method) — reproduced live, see Gaps Summary and WR-01 |
| 2 | Criterion 2: an overloaded BBj/Java call gets the matched overload's return type, in any declaration/backend order; completion on the result follows it | ✓ VERIFIED | `bbj-overload-selector.ts` exports `argumentTypeOf`/`OverloadCandidate`/`overloadCandidates`/`bestOverloadCandidates`; `bbj-type-inferer.ts`'s `isMethodCall` branch calls `overloadedCallType` first; `test/overload-return-type.test.ts` (19 tests) independently re-run and passed, covering both declaration orders, Java overloads, the D-06 tie rule (differing/shared return types, arity-only, no-arity-fit), the unchanged link target, and the absence of a false `bbj-unknown-java-member` diagnostic |
| 3 | Criterion 3: completion inside class method bodies works at every measured position, including the DEF FN `_f$`/`_t$` position; every broken position is fixed+pinned or recorded out of reach | ✓ VERIFIED | `109-COMP03-MEASUREMENT.md` records 11 matrix positions, all `works` before and after the phase (byte-identical tables); `test/completion-method-body.test.ts` independently re-run, all 11 pins pass; `test/completion-test.test.ts`'s previously-skipped `'DEF FN parameters with $ suffix inside class method'` test independently re-run as a normal (non-skipped) test and passes with its original assertions intact |
| 4 | Criterion 4: cold start with debug logging shows no class lookup for a primitive, `void`, or array type | ✓ VERIFIED | `java-interop.ts` exports `JAVA_PRIMITIVE_TYPE_NAMES`/`isLocalJavaTypeName`, applied as the first statement of `resolveClassByName` and to gate the `Resolving class` debug line; unit proof via `test/java-interop-local-types.test.ts` (independently re-run, passed); live proof independently re-run against the real backend on :5008 (`test/functional/java-class-lookups-real-interop.test.ts`, all 3 tests passed, not skipped) |
| 5 | Criterion 5: a nested class named `Outer.Inner` in one place and `Outer$Inner` in another resolves once, showing the same members for both spellings | ✓ VERIFIED | `java-interop.ts` exports `canonicalJavaClassName`, applied at all four resolution entry points (`resolveClassByName`, `doResolveClassByName`'s request spelling threading, `resolveClass`, `getResolvedClass`); unit proof via `test/java-interop-nested-class-names.test.ts` (independently re-run, passed); live proof independently re-run against :5008 confirmed no class requested under two spellings and `java.util.AbstractMap.SimpleEntry` resolved once for both spellings sharing one object |

**Score:** 4/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `bbj-vscode/src/language/bbj-scope.ts` | class-reference detection for a `MemberCall` receiver | ✓ VERIFIED (with a narrow behavioral gap) | `isMemberCall(receiver) && ... !== 'class'` branch present at line ~212; confirmed wired into the static-only scope branch; WR-01 collision confirmed live (see gap above) |
| `bbj-vscode/src/language/bbj-overload-selector.ts` | `argumentTypeOf`, `OverloadCandidate`, `overloadCandidates`, `bestOverloadCandidates` | ✓ VERIFIED | All four exports present (`grep -n "export function\|export interface"` confirms); `findBestOverload`/`siblingOverloads` unchanged per D-05 |
| `bbj-vscode/src/language/bbj-type-inferer.ts` | overload-aware return type for `MethodCall` | ✓ VERIFIED | `overloadedCallType`, `declaredReturnType` present and called from the `isMethodCall` branch before the fallback |
| `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` | `argumentType` delegating to `argumentTypeOf` | ✓ VERIFIED | Confirmed by 19-test `overload-return-type.test.ts` pass including the unchanged-inlay-hints guard |
| `bbj-vscode/src/language/java-interop.ts` | local primitive/void/array/blank resolution; `canonicalJavaClassName` at every entry point | ✓ VERIFIED | `JAVA_PRIMITIVE_TYPE_NAMES`, `isLocalJavaTypeName`, `localJavaTypeDto`, `canonicalJavaClassName` all present and wired at the documented call sites (4+ call sites for the canonical function, confirmed via grep) |
| `test/completion-class-reference.test.ts` | label-set equality, instance/.class/package/case guards, VAL-03 guard | ✓ VERIFIED (exists, passes) | Does not cover the literal `Class`-named receiver case (the WR-01 gap) |
| `test/overload-return-type.test.ts` | BBj/Java overload return types, tie rule, link target, validation guards | ✓ VERIFIED | 19 tests, independently re-run, all pass |
| `test/completion-method-body.test.ts` | D-03 position matrix, env-gated recorder, label-set pins | ✓ VERIFIED | 11 pins, independently re-run, all pass; recorder gated correctly by `MEASURE_COMPLETION_OUT` (11 skipped without the env var, as designed) |
| `test/java-interop-local-types.test.ts` | request counts, behaviour neutrality, logging, adjacency, blank, concurrency | ✓ VERIFIED | Independently re-run, passes |
| `test/java-interop-nested-class-names.test.ts` | one-request, same-object, #659 mechanism, `getResolvedClass`, normalization-rule tests | ✓ VERIFIED | Independently re-run, passes |
| `test/functional/java-class-lookups-real-interop.test.ts` | live cold-start evidence gated by `shouldRunBBjTests` | ✓ VERIFIED | Independently re-run against the real backend on :5008 (reachable in this environment); all 3 tests passed, not skipped |
| `.planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md` | before-fix measurement, Final state, #561 decision | ✓ VERIFIED | Contains `## Before-fix measurement`, `## Final state` (byte-identical to before), and `## #561 decision` with the posted comment URL and closed state |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `BBjScopeProvider.getScope` member branch | static-only scope branch | `isClassRef` set for a `MemberCall` receiver whose `member.ref` is a `JavaClass` | ✓ WIRED (narrow gap) | Confirmed by reading `bbj-scope.ts` lines 190-247; the text-based `class` exclusion is the source of the WR-01 gap, not a wiring defect |
| `BBjTypeInferer.getTypeInternal` `isMethodCall` branch | `overloadCandidates`/`bestOverloadCandidates`/`argumentTypeOf` | `overloadedCallType(call)` consulted before the linked-declaration fallback | ✓ WIRED | Confirmed in source and by passing tests |
| `BBjInlayHintProvider.argumentType` | `argumentTypeOf` | delegation with `this.inferer` | ✓ WIRED | `findBestOverload` call site and tie rule byte-identical to before, per plan's own diff-stat guard |
| `JavaInteropService.resolveClassByName` | `resolveClass(localJavaTypeDto(...))` | `isLocalJavaTypeName` check as the first statement | ✓ WIRED | Confirmed by source read and by the live cold-start test (zero primitive/void/array/blank lookups on a real cold start) |
| `JavaInteropService.resolveClassByName` / `resolveClass` / `getResolvedClass` | `canonicalJavaClassName` | applied at every cache/in-flight/pending entry point | ✓ WIRED | Confirmed by source read (4+ call sites) and by the live nested-class test |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| COMP-01 | 109-02 | Static-only completion after a fully-qualified Java class reference | ⚠️ PARTIAL | Primary case verified; WR-01 collision (a class literally named `Class`) is an unaddressed, real gap against the criterion as generally stated |
| COMP-02 | 109-03 | Overload-aware return type for completion/checks | ✓ SATISFIED | `test/overload-return-type.test.ts` (19 tests, independently re-run) |
| COMP-03 | 109-01, 109-06 | Completion inside class method bodies measured, fixed/recorded | ✓ SATISFIED | `109-COMP03-MEASUREMENT.md` Final state byte-identical to before-fix; DEF FN test independently re-run un-skipped and passing |
| JINT-01 | 109-04, 109-06 | Primitives/void/arrays never sent to the backend as class lookups | ✓ SATISFIED | Unit + independently re-run live cold-start proof (0 of 635 requests for a local type) |
| JINT-02 | 109-05, 109-06 | Nested class resolved once regardless of spelling | ✓ SATISFIED | Unit + independently re-run live proof (`java.util.AbstractMap.SimpleEntry` resolved once for both spellings, one object) |

No orphaned requirements: REQUIREMENTS.md's Phase 109 mapping (COMP-01, COMP-02, COMP-03, JINT-01,
JINT-02) exactly matches the union of `requirements:` fields declared across the six phase plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `bbj-vscode/src/language/bbj-scope.ts` | 585 | Pre-existing `// TODO inspect \`use\` inside classes?` | ℹ️ Info | Pre-existing (introduced in commit `1b77f4c6`, well before the phase base commit `0379065c`), not part of this phase's diff — not a phase-109 debt marker |
| `bbj-vscode/src/language/bbj-overload-selector.ts:133-145` | — | `overloadCandidates` silently drops `LibFunction` overloads (code review IN-01) | ℹ️ Info | Currently unreachable (guarded by caller); advisory only, no test/behavior impact found |
| `bbj-vscode/src/language/bbj-type-inferer.ts:187` | — | Missing trailing newline (code review IN-02) | ℹ️ Info | Cosmetic |
| `bbj-vscode/src/language/java-interop.ts:107-123` | — | `localJavaTypeDto`'s primitive branch uses untrimmed `name` (code review IN-03) | ℹ️ Info | Not reachable from any tested call site today; hardening note only |
| `bbj-vscode/src/language/bbj-scope.ts:212` | — | WR-01: literal-`Class`-named receiver collision (code review, independently reproduced) | ⚠️ Warning | Promoted to a gap in this report — see Gaps Summary |

No `TBD`/`FIXME`/`XXX` markers introduced by this phase's diff. No unreferenced debt markers found
in the phase's added/changed lines.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| `java.lang.String.` (no USE) offers static-only list | `npx vitest run test/completion-class-reference.test.ts` | 1 file, all tests pass | ✓ PASS |
| Overload return-type re-selection (BBj + Java, tie rule) | `npx vitest run test/overload-return-type.test.ts` | 19/19 pass | ✓ PASS |
| DEF FN completion inside class method body (previously skipped) | `npx vitest run test/completion-test.test.ts --reporter=verbose \| grep -i "DEF FN"` | `'DEF FN parameters with $ suffix inside class method'` passes, un-skipped | ✓ PASS |
| Primitive/void/array/blank names never reach the backend (unit) | `npx vitest run test/java-interop-local-types.test.ts` | all pass | ✓ PASS |
| Nested class resolved once for both spellings (unit) | `npx vitest run test/java-interop-nested-class-names.test.ts` | all pass | ✓ PASS |
| Real cold start against :5008: no primitive/void/array/blank lookup, no double-spelling request | `RUN_BBJ_TESTS=1 npx vitest run test/functional/java-class-lookups-real-interop.test.ts` | 3/3 pass, not skipped (backend was reachable) | ✓ PASS |
| WR-01 reproduction: `java.lang.Class.` (no USE) completion list | ad hoc scratch test against `BBjCompletionProvider.getCompletion`, deleted after use | `["class","getName()"]` — an instance member (`getName()`) leaked into the list | ✗ FAIL (confirms the gap) |
| Whole suite regression | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 --reporter=json` | `numFailedTests=0 numTotalTests=2842` | ✓ PASS |
| Register check (no planning identifiers in phase diff) | `git diff <base> HEAD -- bbj-vscode/src bbj-vscode/test \| grep ...` | no match | ✓ PASS |
| tsc | `npx tsc -p tsconfig.json` | exit 0, no errors | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` probes; verification is via vitest
suites and a live functional test against the java-interop backend, both exercised above.

### Human Verification Required

None. Every roadmap criterion is verifiable through the language server's own test suite (unit and
live-backend), and the one open gap (WR-01) is a deterministic, reproduced code behavior — not a
visual, real-time, or external-service item requiring a human in a running IDE.

### Gaps Summary

**Criterion 1 (COMP-01) is not fully met.** The roadmap's own worked example — `java.lang.String.`
typed without `USE` offering the same static-only list as `String.` after `USE java.lang.String` —
is correct and was independently re-verified (both via the automated test suite and an ad hoc
reproduction). However, the success criterion is phrased generally ("After a fully-qualified Java
class reference typed without `USE`... completion offers only static members"), and this general
form has a real, reproduced counter-example: a fully-qualified reference whose last segment is
literally the identifier `Class` (case-insensitive, e.g. `java.lang.Class.`) is misclassified by
`bbj-scope.ts`'s new `MemberCall` branch as the synthetic `.class` pseudo-member (because BBj's
case-insensitivity makes "a receiver named `Class`" and "the `.class` pseudo-member on any
receiver" indistinguishable by text), so it falls into the *instance*-access branch instead of the
static-only branch. Completion after `java.lang.Class.` then offers `java.lang.Class`'s full
instance member list (e.g. `getName()`) rather than a static-only list.

This was originally raised by code review (`109-REVIEW.md` WR-01) as the review's one warning (0
critical), and this verification independently reproduced it against the live completion provider
rather than taking the review's word for it. Reference resolution/linking still succeeds through
this path (the instance-access branch is a superset, not a dead end), so this is a completion
*quality* gap, not a correctness/crash/data-loss issue — but it is a genuine, narrow violation of
the stated success criterion, currently untested and untracked (no WINDOWS.md/DEBT.md entry, no
VERIFICATION override).

**This looks like it may be intentional/accepted scope** (BBj's case-insensitive `.class` syntax
inherently collides with any class literally named `Class`, and code review itself noted "a full
disambiguation may not be possible from this location alone"). If the maintainer judges this narrow
collision acceptable as shipped, add an override:

```yaml
overrides:
  - must_have: "After a fully-qualified Java class reference typed without USE, completion offers only static members (ROADMAP criterion 1)"
    reason: "BBj's case-insensitive `.class` syntax is inherently indistinguishable from a literal reference to a class named `Class`; the collision is narrow (only classes literally named `Class`), reference resolution still succeeds, and full disambiguation may not be possible from this code location alone (WR-01)."
    accepted_by: "<name>"
    accepted_at: "<ISO timestamp>"
```

Otherwise, route this to a small gap-closure plan: narrow the `bbj-scope.ts` exclusion (or add a
documented/tested known-limitation) per WR-01's suggested fix, and add a regression test for a
receiver literally named `Class` to `completion-class-reference.test.ts`.

All other roadmap criteria (2, 3, 4, 5) are fully verified with independently re-run evidence
(unit tests re-executed fresh in this session, plus a live re-run against the real java-interop
backend on :5008 for criteria 4 and 5). The phase's regression gate (whole-suite
`numFailedTests=0` over 2842 tests, register-clean diff, tsc clean, issue #561 independently
confirmed CLOSED with 1 comment via `gh issue view`) was also independently reproduced in this
verification session, not taken from the SUMMARY.

---

_Verified: 2026-09-25T19:37:31Z_
_Verifier: Claude (gsd-verifier)_
