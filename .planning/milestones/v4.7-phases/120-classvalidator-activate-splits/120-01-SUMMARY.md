---
phase: 120-classvalidator-activate-splits
plan: "01"
subsystem: validation
tags: [langium, validator, refactor, typescript]

requires: []
provides:
  - "ClassValidator split into four responsibility modules plus a shared class-type helper module, with check-classes.ts reduced to registerClassChecks only"
affects: [121-java-interop-service-decomposition]

actuals:
  tokens: 14400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Free-function validation modules take their service dependency as a trailing parameter (checkClassReference(..., javaInterop), checkMethodReturn(..., inferer)), matching check-function-calls.ts/check-unknown-java-member.ts"
    - "One registration entry point per feature (registerClassChecks) builds the ValidationChecks map and calls into the responsibility modules; the modules themselves never register anything"

key-files:
  created:
    - bbj-vscode/src/language/validations/class-types.ts
    - bbj-vscode/src/language/validations/check-cyclic-inheritance.ts
    - bbj-vscode/src/language/validations/check-class-reference.ts
    - bbj-vscode/src/language/validations/check-return-types.ts
    - bbj-vscode/src/language/validations/check-constructor.ts
  modified:
    - bbj-vscode/src/language/validations/check-classes.ts
    - bbj-vscode/src/language/validations/check-variable-scoping.ts

key-decisions:
  - "Followed the plan's D-01/D-02/D-03/D-04 exactly: four responsibility modules (class-types.ts moved first as the tracer alongside check-cyclic-inheritance.ts, then check-class-reference.ts/check-return-types.ts/check-constructor.ts), each an exported free function taking its service as a trailing argument, check-classes.ts left with only registerClassChecks and no thisArg"

requirements-completed: [REF-10]

coverage:
  - id: D1
    description: "check-classes.ts split into four responsibility modules (class-reference, return-type/field-init, constructor, cyclic-inheritance) plus a shared class-types.ts helper module"
    requirement: "REF-10"
    verification:
      - kind: unit
        ref: "structure/order/message/FINAL_TYPE_ASSIGNABLE_TO identity greps in this plan's own <verify> blocks"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every validation suite (class-validations-issues, classes, inheritance-cycle-validation, method-return-java-type, unresolvable-type, variable-scoping, declare-in-class, java-package-name-collision, method-body-scope, validation) reports identical diagnostics with no assertion changes"
    requirement: "REF-10"
    verification:
      - kind: unit
        ref: "npx vitest run <the ten suites>"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whole test suite has no failing name absent from the phase base list; lint, typecheck:test and build pass; only the seven validation files changed under bbj-vscode"
    requirement: "REF-10"
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite) + npm run lint + npm run typecheck:test + npm run build"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-09-29
status: complete
---

# Phase 120 Plan 01: ClassValidator Split Summary

**`ClassValidator`'s 579-line class dissolved into five free-function modules (class-types.ts, check-cyclic-inheritance.ts, check-class-reference.ts, check-return-types.ts, check-constructor.ts) with `check-classes.ts` reduced to a single `registerClassChecks` entry point, diagnostics byte-identical to the base.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-29T06:19:55Z
- **Completed:** 2026-09-29T06:33:15Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Task 1 (tracer): recorded the phase base (base SHA, whole-suite failing-name list, a clean run of the 27 load-bearing suites) before any source edit, then moved `classFqn`, `bbjSupertypesReach`, `bbjTypesAreRelated` and `KNOWN_BBJ_SCALAR_TYPES` into a new `class-types.ts`, and `checkCyclicInheritance` into a new `check-cyclic-inheritance.ts` as an exported free function — the tracer feedback gate's targeted suites (cycle, class, variable-scoping suites) passed on the first attempt, so Task 2 proceeded without a checkpoint (auto mode, `<automated>`-only verify).
- Task 2: extracted the remaining three responsibilities into `check-class-reference.ts` (`checkClassReference`, `checkBBjClass`, plus unexported `warnUnresolvableType`/`isSubFolderOf`), `check-return-types.ts` (`checkMethodReturn`, `checkFieldInit`, plus unexported `checkReturnTypeAssignable`/`isAssignable`/`classDisplayName`/`literalTypeMismatch`/`simpleTypeName` and the `*_RETURN_TYPES` sets / `FINAL_TYPE_ASSIGNABLE_TO` map) and `check-constructor.ts` (`checkInstantiable`, `checkConstructorArguments`, plus unexported `isArrayConstruction`). `check-classes.ts` now only builds the `ValidationChecks` map and calls `registry.register(classChecks)` with no `thisArg` — the `ClassValidator` class is gone.
- All 13 check calls in `registerClassChecks`'s per-node-type handlers run in exactly the base order; every `accept(` message line is byte-identical to the base (`this.` removed only); `FINAL_TYPE_ASSIGNABLE_TO` keeps its 11 entries in the same order, type and lookup shape.

## Task Commits

1. **Task 1: Phase base recorded, then the cyclic-inheritance check runs from its own module with the class-type helpers in class-types.ts** — `4ff63858` (refactor)
2. **Task 2: Class reference, return type and constructor checks in their own modules; check-classes.ts only registers, in the base order, with identical messages** — `61b0d71f` (refactor)

**Plan metadata:** committed alongside STATE.md/ROADMAP.md/REQUIREMENTS.md at phase-completion time.

## Files Created/Modified

- `bbj-vscode/src/language/validations/class-types.ts` — `classFqn`, `bbjSupertypesReach`, `bbjTypesAreRelated`, `KNOWN_BBJ_SCALAR_TYPES` (no service dependency)
- `bbj-vscode/src/language/validations/check-cyclic-inheritance.ts` — `checkCyclicInheritance(klass, accept)` (no service dependency)
- `bbj-vscode/src/language/validations/check-class-reference.ts` — `checkClassReference(accept, qclass, info, javaInterop)`, `checkBBjClass(klass, uriOfDeclaration, uriOfUsage, accept, info)` (dependency: `javaInterop: JavaInteropService | undefined`)
- `bbj-vscode/src/language/validations/check-return-types.ts` — `checkMethodReturn(meth, accept, inferer)`, `checkFieldInit(field, accept)` (dependency: `inferer: TypeInferer`)
- `bbj-vscode/src/language/validations/check-constructor.ts` — `checkInstantiable(call, accept)`, `checkConstructorArguments(call, accept)` (no service dependency)
- `bbj-vscode/src/language/validations/check-classes.ts` — reduced to `registerClassChecks(registry, services)` only; reads `inferer`/`javaInterop` from `services` and passes them as trailing arguments to the extracted functions
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — one import line changed, from `./check-classes.js` to `./class-types.js`

## Base Evidence and Identity Checks

**Phase base SHA:** `a2d08e25ca22ab7c995f942ce6b5a21d27b0efa0`

**Base whole-suite run** (`suite-base.json` / `suite-base-failed.txt`):
```
numFailedTests=0 numPassedTests=3608 numPendingTests=30 numTotalTests=3638 failedSuites=1 lines=1
```
Base failing name (pre-existing, stale installed bundle, unrelated to this phase):
```
test/functional/installed-extension-e2e.test.ts > (suite failed)
```

**Targeted base run** (27 load-bearing suites, `targeted-base.txt`):
```
Test Files  27 passed (27)
     Tests  490 passed | 1 skipped (491)
vitest-exit=0
```

**Post-plan whole-suite run** (`suite-01.json` / `suite-01-failed.txt`):
```
numFailedTests=0 numPassedTests=3608 numPendingTests=30 numTotalTests=3638 failedSuites=1 lines=1
```
`comm -13 suite-base-failed.txt suite-01-failed.txt` (names failing at HEAD but not at base): **empty** — no new failing name.

**Ten validation suites** (`class-validations-issues`, `classes`, `inheritance-cycle-validation`, `method-return-java-type`, `unresolvable-type`, `variable-scoping`, `declare-in-class`, `java-package-name-collision`, `method-body-scope`, `validation`):
```
Test Files  10 passed (10)
     Tests  185 passed (185)
```

**Structure check** (`structure OK`): each module exports exactly the expected number of names (`check-classes.ts`: 1, `check-class-reference.ts`: 2, `check-return-types.ts`: 2, `check-constructor.ts`: 2, `check-cyclic-inheritance.ts`: 1, `class-types.ts`: 4); zero `ClassValidator`/`this.` occurrences across all six files; `registry.register(classChecks);` appears exactly once with no `thisArg`; zero stray `FINAL_TYPE_ASSIGNABLE_TO` occurrences outside `check-return-types.ts`; `bbj-validator.ts` byte-identical to the base.

**Order and messages check** (`order and messages OK`): the 13 `check*(` calls inside `registerClassChecks` at HEAD, in order — `checkBBjClass`, `checkClassReference` ×2 (extends/implements), `checkCyclicInheritance`, `checkClassReference`, `checkInstantiable`, `checkConstructorArguments`, `checkClassReference`, `checkMethodReturn`, `checkClassReference`, `checkFieldInit`, `checkClassReference` ×2 (ParameterDecl/VariableDecl) — are identical in name and order to the base. All 13 `accept(` message lines across the split files match the base byte-for-byte (only a leading `this.` removed).

**FINAL_TYPE_ASSIGNABLE_TO check** (`final map OK`): all 11 map entries in `check-return-types.ts` are byte-identical to the base, same order, same `ReadonlyMap<string, ReadonlySet<string>>` type, same `.get(returnedFqn)` / `.has(declaredFqn)` lookup shape.

**Gates** (`gates OK`): `npm run lint`, `npm run typecheck:test` and `npm run build` all exit 0.

**Hygiene** (`hygiene OK`): no added source/test line carries a planning identifier; no commit body since the base contains a GitHub closing keyword; exactly the seven expected validation files changed under `bbj-vscode`.

## Decisions Made

None beyond following the plan's locked decisions (D-01 through D-04) exactly as specified. File names for the four modules and the shared helper matched the plan's own naming (`check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts`, `check-cyclic-inheritance.ts`, `class-types.ts`).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Hygiene verify command initially failed a `git diff --name-only` file-set comparison** because the three Task 2 files (`check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts`) were newly created but not yet staged, and `git diff <base-sha>` does not surface untracked files. Staged the three new files with `git add` (their eventual, correct staging step per the plan's own action list) before re-running the check, which then passed. No plan or code change was needed — this was a verify-ordering artifact of running the check before the plan's own staging step, not a defect.

## Observation (not acted on)

`test/method-return-java-type.test.ts:256` still names `check-classes.ts` in a comment ("reconstruct the FQN the same way check-classes.ts's ... does"), describing FQN-reconstruction logic that now actually lives in `class-types.ts`/`check-return-types.ts`. This is a comment, not an import or assertion — the plan's scope is behaviour-neutral file moves, not touching unrelated test comments, so it was left as-is.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

REF-10 is complete. `check-classes.ts` is a pure registration entry point; the four responsibility modules and `class-types.ts` are available for Phase 121's `JavaInteropService` decomposition (REF-09/REF-12) to reference as an established free-function-module precedent, alongside the pre-existing `check-function-calls.ts`/`check-unknown-java-member.ts`. No blockers for REF-11 (`activate()` split), which is independent and can proceed in parallel or in the next plan.

## Self-Check: PASSED

- All 5 created source files verified present on disk.
- SUMMARY.md verified present on disk.
- All 3 commits (`4ff63858`, `61b0d71f`, `6db81c38`) verified present in `git log --oneline --all`.

---
*Phase: 120-classvalidator-activate-splits*
*Completed: 2026-09-29*
