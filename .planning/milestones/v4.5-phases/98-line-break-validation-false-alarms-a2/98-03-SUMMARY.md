---
phase: 98-line-break-validation-false-alarms-a2
plan: 03
subsystem: parser/validation
tags: [langium, chevrotain, bbj, validation, declare, methodret, vitest]

# Dependency graph
requires:
  - phase: 98-01
    provides: "conformance-regressions.test.ts harness and the test-data/conformance/ fixture convention"
provides:
  - "checkMethodReturn's two disagreements with the compiler (void-method-returns-a-value, missing value-returning METHODRET) downgraded from error to warning"
  - "checkConflictingDeclares narrowed by scope and by resolved-type relation: silent for related or unresolvable types, warning at program level, error only for an unrelated resolved pair inside a method body"
  - "classFqn, bbjSupertypesReach, bbjTypesAreRelated promoted to module-level exported functions in check-classes.ts, shared by check-variable-scoping.ts (one subtype implementation, not two)"
  - "declare-methodret.bbj conformance fixture"
affects: [98-04, 98-05, 98-06]

actuals:
  tokens: 4864
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Promote a private validator helper to a module-level exported function when a sibling validator needs the same three-valued (resolved/unresolved/related) logic, rather than widening a registration signature to pass services through or duplicating the walker."

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/declare-methodret.bbj
  modified:
    - bbj-vscode/src/language/validations/check-classes.ts
    - bbj-vscode/src/language/validations/check-variable-scoping.ts
    - bbj-vscode/test/classes.test.ts
    - bbj-vscode/test/variable-scoping.test.ts

key-decisions:
  - "java.lang.String and java.lang.Integer DO resolve to a Class under this test suite's EmptyFileSystem setup (confirmed by probe) — the plan's flagged risk did not materialize, so the two existing severity-assertion DECLARE tests kept their original java.lang.* types instead of being re-expressed with BBj classes."
  - "registerVariableScopingChecks needed no services parameter — promoting classFqn/bbjSupertypesReach to module-level exported functions in check-classes.ts (plus the new bbjTypesAreRelated) let check-variable-scoping.ts import and call them directly, so bbj-validator.ts's registration call is unchanged."
  - "The combined 'two missing-METHODRET errors, void method unaffected' test in classes.test.ts was split into two documents: mixing the now-Warning missing-METHODRET diagnostic with the still-Error return-type-mismatch diagnostic in one document hid the warning under the existing diagnostic-suppression hierarchy (BBjDocumentValidator's 'any Error present suppresses all warnings' rule), which is pre-existing, unrelated-to-this-plan behavior, not something to weaken."

requirements-completed: [VALID-05, CONF-01]

coverage:
  - id: D1
    description: "Both METHODRET checks (void method returns a value; non-void method has no value-returning METHODRET) report warning severity, never error, with no special case for an empty or stub-looking body"
    requirement: VALID-05
    verification:
      - kind: unit
        ref: "test/classes.test.ts#Flags non-void method missing METHODRET"
        status: pass
      - kind: unit
        ref: "test/classes.test.ts#Flags value returned from a void method"
        status: pass
    human_judgment: false
  - id: D2
    description: "Conflicting-DECLARE check narrowed: silent for related (sub/supertype) types, silent when at least one type is unresolvable, a warning for an unrelated resolved pair at program level, and still an error for an unrelated resolved pair inside a method body"
    requirement: VALID-05
    verification:
      - kind: unit
        ref: "test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation > Conflicting DECLARE types produce error inside a method body"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation > Conflicting DECLARE at program scope produces a warning, not an error"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation > Conflicting DECLARE of related (sub/supertype) BBj classes produces no diagnostic"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation > Conflicting DECLARE where a type does not resolve produces no diagnostic"
        status: pass
    human_judgment: false
  - id: D3
    description: "declare-methodret.bbj conformance fixture parses and validates clean (zero error-severity diagnostics, linking excluded), covering every narrowed-to-silent-or-warning branch while deliberately omitting the still-an-error in-method case"
    requirement: CONF-01
    verification:
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-20
status: complete
---

# Phase 98 Plan 03: Narrowed Conflicting-DECLARE and METHODRET Checks Summary

**Both METHODRET disagreements with the compiler are now warnings, and the conflicting-DECLARE check reuses `check-classes.ts`'s existing subtype logic (promoted to module-level exports) to stay silent for related or unresolvable types, warn at program level, and error only for an unrelated resolved pair inside a method body — proven by four new tests and a new `declare-methodret.bbj` conformance fixture.**

## Performance

- **Duration:** ~40 min (approx.)
- **Started:** 2026-09-20T22:12:00Z (approx.)
- **Completed:** 2026-09-20T22:51:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `ClassValidator.checkMethodReturn`'s two `accept('error', ...)` calls (void method returning a value; non-void method with no value-returning METHODRET) are now `accept('warning', ...)`, with no special case for an empty or stub-looking body — matching what `bbjcpl` accepts.
- `classFqn` and `bbjSupertypesReach` promoted from private `ClassValidator` instance methods to module-level exported functions in `check-classes.ts`; a new exported `bbjTypesAreRelated(a, b)` reuses them to answer "are these two resolved classes related" (same class, shared FQN, either is `java.lang.Object`, or either's resolvable BBj supertype chain reaches the other) — one implementation, shared by both validators, not a second walker.
- `checkConflictingDeclares` in `check-variable-scoping.ts` now resolves both types via `getClass` before comparing: unresolvable stays silent, related stays silent, and an unrelated resolved pair is an error inside a method body (the one deliberate, named exception) but only a warning at program level.
- `declare-methodret.bbj` conformance fixture: a related BBj class pair (`extends`), an unrelated third class, and an unresolvable-type reference exercise all four conflicting-DECLARE branches; a missing-METHODRET method and a void-method-returns-a-value method exercise both narrowed METHODRET severities; a normally-returning method proves the no-diagnostic case. The in-method unrelated-resolved DECLARE pair (still an error on purpose) is deliberately absent.

## Task Commits

Each task was committed atomically:

1. **Task 1: Both METHODRET disagreements become warnings** - `138d19ea` (feat)
2. **Task 2: Narrow the conflicting-DECLARE check by scope and by resolved-type relation** - `b079e406` (feat)
3. **Task 3: Conformance fixture for the narrowed checks, and the register check** - `d44dd378` (test)

_No plan-metadata commit yet — this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `bbj-vscode/src/language/validations/check-classes.ts` - Two `accept('error', ...)` calls in `checkMethodReturn` flipped to `'warning'`; `classFqn`/`bbjSupertypesReach` promoted to module-level exported functions; new exported `bbjTypesAreRelated`.
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` - `checkConflictingDeclares` rewritten to resolve both types via `getClass`, skip when either is unresolvable or related (`bbjTypesAreRelated`), and choose `'error'`/`'warning'` by scope (`isProgram(node)`).
- `bbj-vscode/test/classes.test.ts` - Both METHODRET severity assertions updated to `DiagnosticSeverity.Warning`; the combined missing-METHODRET/type-mismatch test split into two documents (see Decisions).
- `bbj-vscode/test/variable-scoping.test.ts` - Program-scope DECLARE test flipped to assert a warning; two new tests added for the related-types-silent and unresolvable-type-silent branches; the method-scope error test kept as the pinned exception.
- `bbj-vscode/test/test-data/conformance/declare-methodret.bbj` - New fixture (created).

## Decisions Made
- Confirmed by probe (scratch file, deleted before committing) that `java.lang.String`/`java.lang.Integer` resolve to a `Class` under this test suite's `EmptyFileSystem` setup, for all five probed shapes (method-scope unrelated → error, program-scope unrelated → warning, related BBj classes → silent, unresolvable type → silent for the conflicting-DECLARE message specifically, same-type duplicate → silent, unchanged). The plan's flagged risk ("`java.lang.*` types may not resolve under `EmptyFileSystem`") did not materialize, so no test needed re-expression with BBj-declared classes to keep exercising a genuinely-resolved case.
- `registerVariableScopingChecks(registry: ValidationRegistry)`'s signature is unchanged — no `services` parameter was needed. Promoting the two helper functions plus adding `bbjTypesAreRelated` in `check-classes.ts` let `check-variable-scoping.ts` import and call them directly, matching the plan's preferred route over widening the registration call.
- VALID-05 unclassified edge (three-or-more DECLAREs of one name, mixed resolvable/unresolvable): the narrowed check keeps the pre-existing "always compare against the first declaration" rule unchanged, per the plan's explicit instruction not to invent a new rule for this case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Combined METHODRET test broke under the pre-existing diagnostic-suppression hierarchy**
- **Found during:** Task 1, running the targeted verify set
- **Issue:** `classes.test.ts`'s "Issue #372 example: two missing-METHODRET errors, void method unaffected" test declared one method with a missing METHODRET (now Warning) and one method with a return-type mismatch (still Error) in the same document. `BBjDocumentValidator`'s existing `applyDiagnosticHierarchy` Rule 2 ("any Error-severity diagnostic present → suppress all warnings/hints") — pre-existing behavior, unrelated to this plan — then hid the new Warning entirely, failing the test's `missing` assertion (`expected [] to have a length of 1`).
- **Fix:** Split the test into two documents: one asserting the missing-METHODRET warning alone (no other Error-severity diagnostic present to trigger suppression), one asserting the return-type-mismatch error alone (unaffected by this plan's severity change). No production code change — the split test now exercises what it always meant to, without the two diagnostics interfering via the existing hierarchy.
- **Files modified:** `bbj-vscode/test/classes.test.ts`
- **Verification:** Both split tests pass; confirmed via a temporary revert-and-rerun that the original combined test passed before this plan's severity change and only broke because of the interaction with the (untouched) suppression hierarchy, not because of a bug in the new severity logic itself.
- **Committed in:** `138d19ea` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a pre-existing test whose combined premise broke under an existing, unrelated diagnostic-suppression rule once this plan's severity change was applied)
**Impact on plan:** Necessary for correctness of the test suite; no production code was touched beyond the plan's own scope, and no scope creep beyond `classes.test.ts`.

## Issues Encountered
None beyond the deviation above, found and resolved during the plan's own probe-first workflow.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Every A2 DECLARE/METHODRET false alarm named in this phase's scope (7 conflicting-DECLARE hits, 7 missing-METHODRET hits, 2 void-returns-a-value hits) is now covered: all fall into a silent, warning, or (for the one named in-method exception) still-error branch, each proven by a test with types that genuinely resolve in the test environment.
- No DECLARE or METHODRET shape from this plan's scope produced a residual error — nothing to hand off to the residue triage in plan 06.
- `classFqn`, `bbjSupertypesReach`, and the new `bbjTypesAreRelated` are now module-level exports of `check-classes.ts` available to any later plan that needs the same resolved-type-relation test.
- No blockers for the next plan.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/validations/check-classes.ts
- FOUND: bbj-vscode/src/language/validations/check-variable-scoping.ts
- FOUND: bbj-vscode/test/classes.test.ts
- FOUND: bbj-vscode/test/variable-scoping.test.ts
- FOUND: bbj-vscode/test/test-data/conformance/declare-methodret.bbj
- FOUND commit: 138d19ea (feat(98-03): make both METHODRET disagreements warnings)
- FOUND commit: b079e406 (feat(98-03): narrow conflicting-DECLARE by scope and resolved-type relation)
- FOUND commit: d44dd378 (test(98-03): add conformance fixture for narrowed DECLARE/METHODRET checks)
- Re-ran plan `<verification>` block 1 (targeted set, `--maxWorkers=2`): 160 passed, 0 failed.
- Re-ran plan `<verification>` block 2 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (1965 passed, 52 skipped) — 3 failed suites are pre-existing `beforeAll` hook timeouts under contention (`document-builder-rebuild-guard.test.ts`, `hover.test.ts`) plus one known e2e "No document found" flake (`installed-extension-e2e.test.ts`), per the whole-suite gate substitution standing decision.
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows no stray scratch probe file (only the pre-existing untracked `.planning/milestone.lock`).
- Re-ran all `<acceptance_criteria>` across the three tasks: all pass (grep counts, probe outputs, register check, test assertions).
