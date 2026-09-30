---
phase: 116-java-interop-test-coverage
plan: "04"
subsystem: testing
tags: [langium, parser, java-interop, vitest, primitives, scope]

requires:
  - phase: 116-java-interop-test-coverage
    provides: "116-03's completed JavaInteropTestService fixture (constructor-time fake classes)"
provides:
  - "indexJavaClasspathDocument(shared) in test-helper.ts, indexing the synthetic classpath
    document into IndexManager the same way production does before user documents link"
  - "Two of three disabled parser.test.ts assertions re-enabled and passing: the substring
    parse (new String()(1)) and the String[]/byte[] field-and-method-signature (Array type ref)"
  - "A real LS false positive fixed in src/: a Java primitive named directly in a field,
    parameter or return-type position (SimpleTypeRef) now resolves, matching #660's existing
    qualified-JavaTypeRef local resolution"
affects: [116-05-bbjapi-chain-decision, 119-grammar-declare-and-shared-channel]

actuals:
  tokens: 3731
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "indexJavaClasspathDocument(shared) generalizes the inline classpath-indexing pattern
      already used in unknown-java-member-real-interop.test.ts into a reusable test-helper
      function for any parseHelper-based suite"
    - "JavaInteropTestService.resolveClassByName checks isLocalJavaTypeName first and
      delegates to super.resolveClassByName for that case, mirroring the base class's own
      #660 guard order, before falling through to the double's preloaded-or-stub path"

key-files:
  created: []
  modified:
    - bbj-vscode/test/test-helper.ts
    - bbj-vscode/test/bbj-test-module.ts
    - bbj-vscode/test/parser.test.ts
    - bbj-vscode/src/language/bbj-scope-local.ts
    - bbj-vscode/src/language/bbj-scope.ts

key-decisions:
  - "The real bug (#660 gap) is fixed narrowly: bbj-scope-local.ts's processNode gained one
    else-if branch for a primitive-named SimpleTypeRef (mirroring the existing qualified
    JavaTypeRef branch), and bbj-scope.ts's resolveClassScopeByName offers the already-resolved
    primitive class ahead of the unchanged global scope only when the queried name is in
    JAVA_PRIMITIVE_TYPE_NAMES. Every other name, including a capitalized class like Byte, takes
    the unchanged path — matching the plan's 'narrower fix' allowance."
  - "'Array type ref' gained a `methodret #strings` line (not `methodret null()`) — it parsed
    and validated cleanly on the first try, so no fallback was needed."
  - "The RED state for the new primitive-types regression test was verified by temporarily
    reverting the two src/ files (via a saved patch + git checkout -- <file>, never git stash)
    with the test double's resolveClassByName delegate already in place, confirming the test
    fails with the exact 'Could not resolve reference to Class named' messages Pitfall 1/3
    predicted, before reapplying the src/ fix."

requirements-completed: []

coverage:
  - id: D1
    description: "indexJavaClasspathDocument(shared) added to test-helper.ts; parser.test.ts's
      beforeAll awaits it after initializeWorkspace, so every parser test sees Java classes
      reached by simple name (or BBjAPI()) through the global scope, matching production"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/parser.test.ts (env -u RUN_BBJ_TESTS npx vitest run test/parser.test.ts test/linking.test.ts)"
        status: pass
    human_judgment: false
  - id: D2
    description: "'Check substring other cases' (new String()(1)) runs a live
      expectNoValidationErrors and passes, using only a new simple-name String fixture entry —
      no src/ change"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/parser.test.ts 'Check substring other cases'"
        status: pass
    human_judgment: false
  - id: D3
    description: "JavaInteropTestService.resolveClassByName delegates a local Java type name
      (isLocalJavaTypeName) to the base class's #660 no-network local path instead of a stub"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/parser.test.ts 'Java primitive types link in field, parameter and return positions (#660)' (RED before src/ fix, GREEN after)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real LS false positive on Java primitive types in signature positions is
      fixed in src/ (bbj-scope-local.ts processNode, bbj-scope.ts resolveClassScopeByName),
      pinned by the new regression test and confirmed against the live BBjServices peer on
      127.0.0.1:5008 via a throwaway probe (no diagnostics, matching the hermetic result)"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "test/parser.test.ts 'Java primitive types link in field, parameter and return positions (#660)' and 'Array type ref'"
        status: pass
      - kind: manual_procedural
        ref: "throwaway live probe against 127.0.0.1:5008 (deleted before commit): Array type ref snippet produced no lexer/parser errors and no diagnostics"
        status: pass
    human_judgment: false
  - id: D5
    description: "The whole hermetic suite, lint, typecheck:test and build all stay green after
      the fixture and scope changes"
    requirement: "TEST-04"
    verification:
      - kind: other
        ref: "coverage/phase-116/suite-04.json (numFailedTests 0, numTotalTests 3572, --maxWorkers=2, RUN_BBJ_TESTS=0)"
        status: pass
      - kind: other
        ref: "npm run lint / npm run typecheck:test / npm run build"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-28
status: complete
---

# Phase 116 Plan 04: Disabled Parser Assertions (Part 1) Summary

**Indexed the fixture classpath document as production does, re-enabled two of three disabled parser.test.ts assertions, and fixed a real language-server false positive on Java primitive types in field/parameter/return-type positions.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-28T12:31:50Z (end of 116-03)
- **Completed:** 2026-09-28T12:49:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- `test/test-helper.ts`: new `indexJavaClasspathDocument(shared)` — indexes the synthetic Java
  classpath document (`classpath:/bbj.bbl`) into `IndexManager` the same way production does
  before any user document links, generalizing the inline pattern already used in
  `unknown-java-member-real-interop.test.ts`
- `test/bbj-test-module.ts`: a simple-name `String` fixture entry (package `java.lang`, no
  members), mirroring the simple-name copy production's `loadImplicitImports` makes; and
  `resolveClassByName` now delegates a local Java type name (`isLocalJavaTypeName`) to the base
  class's own `#660` local resolution path instead of a stub
- `test/parser.test.ts`: `beforeAll` awaits `indexJavaClasspathDocument` after
  `initializeWorkspace`; 'Check substring other cases' and 'Array type ref' are live and green;
  a new regression test 'Java primitive types link in field, parameter and return positions
  (#660)' pins the src/ fix
- `src/language/bbj-scope-local.ts` and `src/language/bbj-scope.ts`: a Java primitive named
  directly in a field, parameter or return-type position (`SimpleTypeRef`) now resolves —
  a real LS false positive fixed, verified against the live BBjServices peer on `:5008`
- Only one `DISABLED` block remains in `parser.test.ts` (`Release usage`, for plan 05)

## Task Commits

Each task was committed atomically:

1. **Task 1: The substring assertion runs against an indexed test classpath and passes with no src change** — `6bc527ff` (feat)
2. **Task 2: Java primitive types link in signatures, and the Array type ref assertion passes** — `3e2996c9` (fix)

**Plan metadata:** (this commit)

_Note: Task 2 is TDD (`tdd="true"`); the RED state for the new regression test was verified by
temporarily reverting the two `src/` files (saved as a local patch, restored via `git apply`,
never `git stash`) before the fix landed, confirming the exact "Could not resolve reference to
Class named" messages Pitfall 1/3 predicted. Both the test-double delegate and the `src/` fix
commit together in Task 2's single commit, since D-06's TDD gate is enforced at the task level
via the plan's `<verify>`/`<acceptance_criteria>` re-run, not a separate `test(...)` commit._

## Files Created/Modified
- `bbj-vscode/test/test-helper.ts` - `indexJavaClasspathDocument(shared)`
- `bbj-vscode/test/bbj-test-module.ts` - simple-name `String` fixture entry;
  `resolveClassByName` delegates local type names to the base class
- `bbj-vscode/test/parser.test.ts` - indexed `beforeAll`, two live assertions, new regression
  test, `methodret #strings` line added to 'Array type ref'
- `bbj-vscode/src/language/bbj-scope-local.ts` - `processNode` resolves primitive
  `SimpleTypeRef` names locally
- `bbj-vscode/src/language/bbj-scope.ts` - `resolveClassScopeByName` offers resolved primitive
  classes ahead of the unchanged global scope

## Decisions Made
- The src/ fix is scoped narrowly to `JAVA_PRIMITIVE_TYPE_NAMES` entries in both files — every
  other name (including a capitalized class like `Byte`) takes the exact unchanged path.
- 'Array type ref' uses `methodret #strings`, not the fallback `methodret null()` the plan
  allowed — it validated cleanly on the first attempt.
- No `resolveClassCandidatesBySimpleName`/index changes were needed; the fix is confined to
  local (non-network) resolution paths already established by `#660`.

## Deviations from Plan

None — plan executed exactly as written, including the D-06 test-first sequencing (test double
delegate, then a confirmed-RED regression test, then the src/ fix) and the live-probe step.

### Auto-fixed Issues

None.

---

**Total deviations:** 0
**Impact on plan:** None — plan executed as specified.

## Issues Encountered

None. The one literal Task 1 acceptance-criteria command (`git diff --quiet 5833a207 -- bbj-vscode/src`
exits 0) fails as written because the phase base (`5833a207`) already carries legitimate `src/`
changes from plan 116-02 (the `main.ts` LSP handler extraction). Verified the actual intent
instead: `git diff --stat 413184e7 -- bbj-vscode/src` (413184e7 = the commit ending 116-03, i.e.
the state Task 1 started from) is empty after Task 1's commit, confirming Task 1 itself made no
`src/` change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Two of the three `parser.test.ts` `DISABLED` assertions are live and green; only 'Release
  usage' (the `BBjAPI().getGlobalNamespace().getValue()` chain) remains, gated on plan 05's
  decision per the plan.
- `JAVA_PRIMITIVE_TYPE_NAMES` is now referenced from `bbj-scope-local.ts` and `bbj-scope.ts` in
  addition to `java-interop.ts` and `test/bbj-test-module.ts` — relevant context for phases
  119-121's refactors of the same files.
- Do not mark `TEST-04` Complete in `REQUIREMENTS.md`; plan 05 also declares it (per this plan's
  own instruction, left unmarked).
- No blockers for plan 05 — this plan's files (`test-helper.ts`, `bbj-test-module.ts`,
  `parser.test.ts`, `bbj-scope-local.ts`, `bbj-scope.ts`) are not declared as touched by any
  other `116-xx` plan's `files_modified`.

## Self-Check: PASSED

- `[ -f bbj-vscode/test/test-helper.ts ]` → FOUND
- `[ -f bbj-vscode/test/bbj-test-module.ts ]` → FOUND
- `[ -f bbj-vscode/test/parser.test.ts ]` → FOUND
- `[ -f bbj-vscode/src/language/bbj-scope-local.ts ]` → FOUND
- `[ -f bbj-vscode/src/language/bbj-scope.ts ]` → FOUND
- `git log --oneline --all` shows commits `6bc527ff` and `3e2996c9` on
  `gsd/v4.7-audit-hygiene-burndown`
- Plan-level `<verification>` re-run:
  - `env -u RUN_BBJ_TESTS npx vitest run test/parser.test.ts` → 222 passed, 1 skipped, 0 failed;
    `grep -c "DISABLED" test/parser.test.ts` → 1
  - Whole hermetic suite (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) →
    `coverage/phase-116/suite-04.json`: `numFailedTests: 0`, `numTotalTests: 3572`
  - `npm run lint` → exit 0
  - `npm run typecheck:test` → exit 0
  - `npm run build` → exit 0
- All acceptance-criteria grep/diff checks from both tasks re-run and pass (DISABLED counts,
  `indexJavaClasspathDocument(services.shared)` call count, live `expectNoValidationErrors`
  call, `JAVA_PRIMITIVE_TYPE_NAMES` in both src files, `isLocalJavaTypeName(className)` in the
  test double)
- `pgrep -af vitest` → no leftover vitest process
- `git status --short` → only the pre-existing untracked `.planning/milestone.lock` (present
  before this plan started); no stray probe/patch files

---
*Phase: 116-java-interop-test-coverage*
*Completed: 2026-09-28*
