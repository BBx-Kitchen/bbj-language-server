---
phase: 109-completion-java-class-resolution
verified: 2026-09-26T04:54:25Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "After a fully-qualified Java class reference typed without USE, completion offers only static members (ROADMAP criterion 1) — the `java.lang.Class.` counter-example (WR-01) is now closed by behaviour, not waived"
  gaps_remaining: []
  regressions: []
---

# Phase 109: Completion & Java Class Resolution Verification Report

**Phase Goal:** Completion offers the right members in the right places: statics only after a
fully-qualified Java class, the result type of the overload a call actually matches, and
candidates inside class method bodies. Class resolution sends the java-interop backend only real
class names, once each.
**Verified:** 2026-09-26T04:54:25Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 109-07, commits `cc25ae07`, `d95fc856`)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Criterion 1: fully-qualified Java class reference (no `USE`) offers only static members | ✓ VERIFIED | Previously-open gap (WR-01, `java.lang.Class.`) is now closed. `bbj-scope.ts`'s `MemberCall` class-reference branch narrows the `class`-pseudo-member exclusion to also require `!isJavaPackage(this.typeInferer.getType(receiver.receiver))` (lines 218-227, read directly). `java.lang.Class.<|>` (dot-trigger, no `USE`) now independently reproduced to return exactly `['class', 'forName()']` — no `getName()` (an instance method) leaks in. `test/completion-class-reference.test.ts` independently re-run: 15/15 pass, including the two new tests pinning the static-only list and USE-equivalence for the class named `Class`, plus a test pinning that `.class` after `java.lang.Class.` and after a value (`s!.class.`) still offers `['class', 'forName()', 'getName()']` (the pseudo-member reading is unchanged where it must stay unchanged). Three new validation tests confirm `x! = java.lang.Class.forName()` and `x! = java.lang.Class.class.getName()` have zero diagnostics, and `x! = java.lang.Class.getName()` has no `bbj-unknown-java-member` diagnostic and no Error-severity diagnostic (only the expected Warning-severity linking diagnostic, matching `java.lang.String.charAt()`'s existing treatment) |
| 2 | Criterion 2: an overloaded BBj/Java call gets the matched overload's return type, in any declaration/backend order; completion on the result follows it | ✓ VERIFIED (regression check) | `bbj-overload-selector.ts`/`bbj-type-inferer.ts` untouched by plan 109-07 (confirmed via `git diff --stat 571cafee` — clean). Whole-suite re-run (below) includes `test/overload-return-type.test.ts` with zero failures |
| 3 | Criterion 3: completion inside class method bodies works at every measured position, including the DEF FN `_f$`/`_t$` position | ✓ VERIFIED (regression check) | Not touched by plan 109-07; whole-suite re-run includes `test/completion-method-body.test.ts` and `test/completion-test.test.ts` with zero failures (75/75 in the two files re-run directly) |
| 4 | Criterion 4: cold start with debug logging shows no class lookup for a primitive, `void`, or array type | ✓ VERIFIED (regression check) | `java-interop.ts` confirmed byte-identical to phase base commit `571cafee` (`git diff --stat` empty); whole-suite re-run includes `test/java-interop-local-types.test.ts` with zero failures |
| 5 | Criterion 5: a nested class named `Outer.Inner` in one place and `Outer$Inner` in another resolves once, showing the same members for both spellings | ✓ VERIFIED (regression check) | `java-interop.ts` confirmed byte-identical to phase base commit `571cafee`; whole-suite re-run includes `test/java-interop-nested-class-names.test.ts` with zero failures |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `bbj-vscode/src/language/bbj-scope.ts` | class-reference detection narrowed by preceding-segment inferred type | ✓ VERIFIED | Read directly (lines 192-254): `isPseudoClassMember` local now requires both a `class`-text member AND that `this.typeInferer.getType(receiver.receiver)` is not a `JavaPackage`; comment above rewritten to state the new rule and cites issue #577 only (no planning identifiers) |
| `bbj-vscode/test/completion-class-reference.test.ts` | regression tests for the class named `Class`, the pseudo-member after that class and after a value, three validation guards | ✓ VERIFIED | Read directly: `STATIC_FOR_NAME`/`USE_ADDED_CLASS_SYMBOL` constants, `forName` pushed onto the fake `java.lang.Class`, 6 new tests (2 in the class-reference describe block, 1 in the pseudo-member describe block, 3 in the validation describe block); all 15 tests in the file independently re-run and pass |
| `bbj-vscode/src/language/bbj-type-inferer.ts`, `java-interop.ts`, `test/bbj-test-module.ts` | must stay unchanged (D-11 scope boundary) | ✓ VERIFIED | `git diff --stat 571cafee -- <these three files>` independently re-run: empty output, confirming byte-identical to the phase base commit |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `BBjScopeProvider.getScope` `MemberCall` class-reference detection | static-only scope branch, for a `class`-text receiver preceded by a Java package | `isPseudoClassMember` false when `isJavaPackage(this.typeInferer.getType(receiver.receiver))` is true, falling through to the existing `receiver.member.ref`/`isJavaClass` read | ✓ WIRED | Confirmed by reading `bbj-scope.ts` lines 218-227 directly, and by the independently re-run `java.lang.Class.<|>` reproduction returning the static-only list |
| Same detection | pseudo-member (instance) branch, for a `class`-text receiver preceded by a class or a value | `isPseudoClassMember` true, `isClassRef` stays `false` | ✓ WIRED | Confirmed by the independently re-run `java.lang.Class.class.<|>` and `s!.class.<|>` cases both returning `['class', 'forName()', 'getName()']` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| COMP-01 | 109-02, 109-07 | Static-only completion after a fully-qualified Java class reference | ✓ SATISFIED | Gap closed by plan 109-07; independently reproduced above. `REQUIREMENTS.md` line 38/85 still shows the requirement unchecked and mapped "Gaps Found" — this is a documentation-sync lag from before the gap-closure plan landed, not a code gap; the orchestrator should tick it and update the status line to "Complete" alongside this report |
| COMP-02 | 109-03 | Overload-aware return type for completion/checks | ✓ SATISFIED | Regression check: files untouched, tests pass in whole-suite re-run |
| COMP-03 | 109-01, 109-06 | Completion inside class method bodies measured, fixed/recorded | ✓ SATISFIED | Regression check: files untouched, tests pass in whole-suite re-run |
| JINT-01 | 109-04, 109-06 | Primitives/void/arrays never sent to the backend as class lookups | ✓ SATISFIED | Regression check: `java-interop.ts` untouched, tests pass in whole-suite re-run |
| JINT-02 | 109-05, 109-06 | Nested class resolved once regardless of spelling | ✓ SATISFIED | Regression check: `java-interop.ts` untouched, tests pass in whole-suite re-run |

No orphaned requirements: REQUIREMENTS.md's Phase 109 mapping (COMP-01, COMP-02, COMP-03, JINT-01,
JINT-02) exactly matches the union of `requirements:` fields declared across the seven phase plans
(109-01 through 109-07).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `bbj-vscode/src/language/bbj-scope.ts` | 585 | Pre-existing `// TODO inspect \`use\` inside classes?` | ℹ️ Info | Pre-existing, not part of this phase's diff |

No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` markers in `bbj-scope.ts`'s or
`completion-class-reference.test.ts`'s diff for plan 109-07 (independently grepped across the
`cc25ae07~1..d95fc856` range). No planning identifiers (`D-NN`, `COMP-0N`, `JINT-0N`, `109-0N`,
`WR-NN`/`CR-NN`/`IN-NN`, `T-109-NN`) found added in that diff either — register check clean.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| `java.lang.Class.` (no USE) offers static-only list, no `getName()` leak | `npx vitest run test/completion-class-reference.test.ts` | 15/15 pass | ✓ PASS |
| `.class` pseudo-member after the class named `Class` and after a value still offers instance members | (same file, `'the .class pseudo-member after the class named Class or after a value...'` test) | pass | ✓ PASS |
| Zero/expected-severity diagnostics for the three validation cases | (same file, `'validation after a fully-qualified class reference'` describe block) | 5/5 pass | ✓ PASS |
| Neighbouring suites unaffected | `npx vitest run test/completion-test.test.ts test/unknown-java-member.test.ts` | 75/75 pass | ✓ PASS |
| Scope-boundary files untouched since phase base | `git diff --stat 571cafee -- bbj-vscode/src/language/bbj-type-inferer.ts bbj-vscode/src/language/java-interop.ts bbj-vscode/test/bbj-test-module.ts` | empty output | ✓ PASS |
| Whole suite regression | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 --reporter=json` | `numFailedTests=0 numTotalTests=2848` | ✓ PASS |
| tsc | `npx tsc -p tsconfig.json` | exit 0, no errors | ✓ PASS |
| Register check (no planning identifiers in plan 109-07's diff) | `git diff cc25ae07~1..d95fc856 -- bbj-vscode/src bbj-vscode/test \| grep -E ...` | no match (exit 1) | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` probes; verification is via vitest
suites, both exercised above.

### Human Verification Required

None. Every roadmap criterion is verifiable through the language server's own test suite, and the
one previously-open gap (WR-01) is now closed by a deterministic, independently reproduced code
behavior change.

### Gaps Summary

No gaps. Plan 109-07 closed the one item the previous verification (2026-09-25) recorded against
COMP-01: a fully-qualified reference to the class literally named `Class` (`java.lang.Class.`,
typed with no `USE`) was misclassified by `bbj-scope.ts`'s `MemberCall` class-reference branch as
the synthetic `.class` pseudo-member, leaking an instance method (`getName()`) into completion.

The fix narrows the pseudo-member exclusion: a `class`-text receiver is now only treated as the
pseudo-member when the segment *before* it does not infer to a Java package. This was verified
directly by reading the changed source (`bbj-scope.ts` lines 218-227) and by independently
re-running the full test file plus the two neighbouring suites, the whole-suite regression gate,
and tsc — all clean. The three files the plan was scoped to leave untouched
(`bbj-type-inferer.ts`, `java-interop.ts`, `test/bbj-test-module.ts`) were independently confirmed
byte-identical to the phase base commit `571cafee`, so criteria 2-5 (already fully verified in the
previous pass) carry no regression risk from this plan and were re-confirmed via the whole-suite
run and direct re-execution of their dedicated test files.

The only outstanding item is a documentation-sync one, not a code gap: `REQUIREMENTS.md` still
shows COMP-01 unchecked and mapped "Gaps Found" from before this gap-closure plan landed. This
should be updated to "Complete" as part of closing out this phase, but does not affect the
behavioral verdict above.

---

_Verified: 2026-09-26T04:54:25Z_
_Verifier: Claude (gsd-verifier)_
