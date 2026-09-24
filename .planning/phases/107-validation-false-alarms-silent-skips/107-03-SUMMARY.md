---
phase: 107-validation-false-alarms-silent-skips
plan: 03
subsystem: validation
tags: [langium, java-interop, member-linking, unknown-member, diagnostic-hierarchy]

requires: []
provides:
  - "A new MemberCall validation check (check-unknown-java-member.ts) that reports an unknown method or field on a fully resolved Java class as a hierarchy-surviving Error, instead of a hideable linking Warning"
  - "dropShadowedMemberLinkingDiagnostics in bbj-document-validator.ts, removing the now-duplicate linking diagnostic for the same reference"
  - "A guard-case regression suite (unknown-java-member.test.ts, 32 tests) and a live-interop functional suite (unknown-java-member-real-interop.test.ts, 4 tests) against the real BBjAPI class"
affects: [107-04, 107-05, 107-06]

actuals:
  tokens: 8700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Certainty-gated validation check: a JavaClass fully resolved (no `error`) AND a syntactically certain receiver (declaration, constructor, cast, string literal, class reference, or BBjAPI()) are both required before an 'unknown member' verdict can fire"
    - "Post-processing diagnostic dedup by CST range: a new validation Error and Langium's own linking diagnostic target the same node/property, so an equal-range match is a cheap, reliable way to drop the duplicate without threading new state through the validator"

key-files:
  created:
    - bbj-vscode/src/language/validations/check-unknown-java-member.ts
    - bbj-vscode/test/unknown-java-member.test.ts
    - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
  modified:
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/test/linking.test.ts

key-decisions:
  - "A class-reference member used as the receiver of a further member access (e.g. Tree.Kind.CLASS) is exempted from the check even when no method/field matches, because java-interop's JavaClass model carries no nested-class membership data at all -- found by the whole-suite run flagging a real example file (javadoc/genjdoc.bbj), fixed before committing Task 2"
  - "The literal BBjAPI() functional test needed one extra warm-up step beyond issue440-real-interop.test.ts's own pattern: reindexing the synthetic classpath document via IndexManager.updateContent, because this bare test harness has no real workspace folder and its initializeWorkspace never reaches loadClasspath/loadImplicitImports before the classpath document's first (empty) build -- documentBuilder.update() cannot be used for this since it always re-reads a document's source from disk, which the synthetic classpath document has none of"
  - "Used a lexer error (an unterminated string literal) rather than a genuine parser error to prove the new Error coexists with another Error-severity diagnostic in the same file -- every parser-error shape tried this session (a lone close paren, a stray semicolon chain) swallows the rest of the token stream, confirming 107-RESEARCH.md's own finding; the lexer-error shape is a real, non-synthetic coexistence case instead"

patterns-established:
  - "New validations/check-*.ts modules stay pure guard-and-accept functions with silent early returns on any ambiguous shape -- never throw, never flag when in doubt"

requirements-completed: [VAL-03]

coverage:
  - id: D1
    description: "An unknown method or field on a fully resolved, declared or constructed Java object is one Error on the member name, with method/field wording chosen correctly, and no duplicate linking warning"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/unknown-java-member.test.ts#Unknown member on a fully resolved Java class"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every guard case (unresolved/cold class, the synthetic BBjAPI fallback, a BBj class receiver, an inherited method, the .class pseudo-member, a template-string field, a case-different real member, a method-return receiver, broken member syntax) keeps today's diagnostics unchanged"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/unknown-java-member.test.ts#Receivers that keep today's diagnostics"
        status: pass
    human_judgment: false
  - id: D3
    description: "Class-reference access honours the static-only rule: a real static field stays clean, an instance field surfaces a Static-field Error with no linking diagnostic, and an instance receiver reaches both static and instance members"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/unknown-java-member.test.ts#Static-only access through a class reference"
        status: pass
      - kind: integration
        ref: "test/linking.test.ts#Instance field does NOT resolve on a Java class reference - issue #440"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Error survives the diagnostic hierarchy (coexists with other Errors, is never suppressed by Rule 1/Rule 2) and exactly one diagnostic remains per unknown member"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/unknown-java-member.test.ts#The unknown-member Error in files with other errors"
        status: pass
    human_judgment: false
  - id: D5
    description: "BBjAPI().anyInvalidMethod(), an assigned BBjAPI() variable, and a real BBjAPI method (getSysGui) behave correctly against the live java-interop backend"
    requirement: "VAL-03"
    verification:
      - kind: e2e
        ref: "test/functional/unknown-java-member-real-interop.test.ts#Unknown Java member on the real BBjAPI class (real interop)"
        status: pass
    human_judgment: false

duration: 49min
completed: 2026-09-24
status: complete
---

# Phase 107 Plan 03: Unknown Java member as a hierarchy-surviving Error Summary

**A new conservative MemberCall check reports `BBjAPI().anyInvalidMethod()` and its like as one Error the diagnostic hierarchy cannot hide, while every uncertain receiver (unresolved classes, the synthetic BBjAPI fallback, BBj classes, nested-class access, method-return receivers) keeps today's linking Warning.**

## Performance

- **Duration:** 49 min
- **Started:** 2026-09-24T20:35:00Z (approx)
- **Completed:** 2026-09-24T21:24:00Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- New `check-unknown-java-member.ts` exports `UNKNOWN_JAVA_MEMBER_CODE`, `isFullyResolvedJavaClass`, `hasCertainReceiverType` and `checkUnknownJavaMember`, registered as a `MemberCall` check after the existing function-call checks
- `BBjDocumentValidator` gained `dropShadowedMemberLinkingDiagnostics`, removing the linking diagnostic that targets the exact same CST range as the new Error, so exactly one diagnostic remains per unknown member
- Every D-12 guard case is pinned in `unknown-java-member.test.ts` (32 tests): unresolved/cold classes, the synthetic BBjAPI fallback, BBj class receivers, inherited methods, `.class`, template-string fields, case-insensitive linking matches, method-return receivers, broken member syntax, and the static-only class-reference rule
- A real false positive was caught by the whole-suite run (`javadoc/genjdoc.bbj`'s `Tree.Kind.CLASS`, a Java nested-class reference) and fixed before committing: the check now exempts a class-reference member used as the receiver of a further member access, since java-interop's `JavaClass` model has no nested-class data to consult
- Updated the issue #440 "Instance field does NOT resolve" expectation in `linking.test.ts` to the new Error, keeping the test name; the live "Interop related tests" failure set (11 names) is identical to the phase base, verified in a scratch worktree
- New `functional/unknown-java-member-real-interop.test.ts` proves the literal `BBjAPI().anyInvalidMethod()` criterion against the real backend on `:5008` — 4/4 tests passed (not skipped) on this machine

## Task Commits

Each task was committed atomically:

1. **Task 1: An unknown method on a declared Java object is one Error on the member name, end to end** - `50f71d14` (feat)
2. **Task 2: Every guard case keeps today's diagnostics, and the suite agrees** - `2237ad9c` (test)
3. **Task 3: The Error survives other errors, and BBjAPI() fires against the live backend** - `5084f035` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/src/language/validations/check-unknown-java-member.ts` - the new check, its guards and registration function
- `bbj-vscode/src/language/bbj-validator.ts` - one added registration call
- `bbj-vscode/src/language/bbj-document-validator.ts` - `dropShadowedMemberLinkingDiagnostics` plus the one-line call site
- `bbj-vscode/test/unknown-java-member.test.ts` - 32 tests: positive cases, every guard case, the static-only rule, hierarchy-survival, and the pure-function tests
- `bbj-vscode/test/linking.test.ts` - the issue #440 instance-field expectation updated to the new Error
- `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` - 4 live tests against the real BBjAPI class on `:5008`

## Decisions Made
- Nested-class-reference exemption (Task 2 fix), the live-interop harness's extra `IndexManager.updateContent` warm-up step (Task 3), and the lexer-error-not-parser-error coexistence fixture (Task 3) are recorded in `key-decisions` above with full rationale.
- Did not mark VAL-03 complete in `REQUIREMENTS.md` per this plan's own instructions (107-05 and 107-06 also declare it; the phase verifier/orchestrator handles the shared-ID gate).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Java nested-class access through a class reference produced a false-positive Error**
- **Found during:** Task 2, whole-suite run (`RUN_BBJ_TESTS=0 --maxWorkers=2`)
- **Issue:** `examples/javadoc/genjdoc.bbj` (a real, always-valid example file) uses `Tree.Kind.CLASS` / `Tree.Kind.INTERFACE` (`com.sun.source.tree.Tree`'s nested `Kind` enum). `Tree` resolves to a fully-resolved `JavaClass` with no error, and `Kind` matches no method or field on it (java-interop's `JavaClass.classes` field carries no nested-class reflection data at all — confirmed empirically: it is always empty for a real reflected class). The check fired two new Errors ("Static field 'Kind' is not defined on Tree") where today's behaviour is a silently-filtered linking Warning.
- **Fix:** Added a guard: when the receiver is a class reference (`isClassRef`) and this `MemberCall` is itself used as the receiver of a further `MemberCall` (the `Tree.Kind.CLASS` shape), stay silent rather than risk a false positive on legitimate Java syntax the check has no data to judge. Scoped to `isClassRef` only, since nested types are only ever reached through a class reference, never an instance — no expansion of false-negative risk for ordinary instance-field chaining.
- **Files modified:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts`
- **Verification:** Re-ran the whole suite after the fix — `numFailedTests=0` (2713 tests); confirmed via a scratch vitest probe that `Tree.Kind.CLASS`/`Tree.Kind.INTERFACE` no longer produce the new diagnostic code.
- **Committed in:** `2237ad9c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, found by the whole-suite gate the plan's own Task 2 action mandated running).
**Impact on plan:** Necessary for correctness — a false positive on legitimate Java syntax is exactly the failure mode D-10/D-11 exist to prevent. No scope creep: the fix stays inside the new check's own file, touches no read-only file, and does not weaken any of the pinned D-12 guard-case tests.

## Issues Encountered
- The live functional test's `beforeAll` (following `issue440-real-interop.test.ts`'s pattern verbatim) left `BBjAPI()` resolving to the synthetic `LibFunction`/`BbjClass` fallback instead of the real, already-warmed `JavaClass` — not because the class was unresolved (the interop service's own cache had it, with 145 methods, after `loadImplicitImports()`), but because `bbj-linker.ts`'s special case for `BBjAPI()` looks the class up in the shared `IndexManager`, which this bare test harness's `initializeWorkspace` never populated (no real `/test` workspace folder on disk, so `BBjWorkspaceManager.initializeWorkspace`'s own `loadClasspath`/`loadImplicitImports` sequence throws before ever running, caught and logged, harmless). Resolved by calling `IndexManager.updateContent()` directly on the synthetic classpath document once `loadImplicitImports()` populated its in-memory AST — `documentBuilder.update()` was tried first and rejected, since it unconditionally tries to re-read a document's source text from disk, which the synthetic classpath document has none of (confirmed via a scratch probe: attempting it threw `ENOENT: open '/bbj.bbl'`). This is a test-harness-only concern; no production code path was touched.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VAL-03's check, dedup filter and full test coverage are in place. Per the shared-ID gate, VAL-03 is declared by this plan and by 107-05/107-06 — it is intentionally NOT marked complete in REQUIREMENTS.md here.
- 107-05's live corpus review (the certainty guard's own stated validation step) can now run against a real, tested check.
- No blockers for 107-04 or 107-06, which are independent of this plan's files (VAL-01/VAL-02 conformance re-measurement and todo close-out).

## Self-Check: PASSED

All modified/created files verified present on disk; all three commit hashes (`50f71d14`, `2237ad9c`, `5084f035`) verified in `git log`. `npx tsc -p tsconfig.json` passes clean. Whole suite (`RUN_BBJ_TESTS=0 --maxWorkers=2`) reports `numFailedTests=0` across 2721 tests. Live functional file (`RUN_BBJ_TESTS=1`) reports 4/4 passed, not skipped. `bbj-scope.ts`, `bbj-linker.ts`, `java-interop.ts` and `package.json` are byte-identical to the phase base (`git diff --stat` empty). Register check (planning-identifier grep) clean on every task's diff.

---
*Phase: 107-validation-false-alarms-silent-skips*
*Completed: 2026-09-24*
