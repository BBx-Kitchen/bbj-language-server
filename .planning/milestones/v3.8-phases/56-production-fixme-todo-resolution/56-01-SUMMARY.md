---
phase: 56-production-fixme-todo-resolution
plan: 01
subsystem: language-server
tags: [langium, java-interop, bbj-linker, bbj-scope, javadoc, debt-cleanup]

# Dependency graph
requires:
  - phase: 55-test-hardening-dead-code
    provides: clean test baseline with dead code removed
provides:
  - All 4 production FIXME comments resolved with documented rationale or working fixes
  - FIX-01: bbj-linker.ts receiver ref resolution documented as intentional
  - FIX-02: bbj-scope.ts orphaned AST workaround documented as Langium lifecycle constraint
  - FIX-03: java-javadoc.ts cancellation handling documented as acceptable with proper early return
  - FIX-04: InteropService.java inner class FIXME replaced with reference to existing #314 fix
affects: [57, future-debt-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Replace FIXME with explanatory comment documenting WHY behavior is intentional, not just WHAT it does"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/src/language/java-javadoc.ts
    - java-interop/src/main/java/bbj/interop/InteropService.java

key-decisions:
  - "FIX-01: Eager receiver ref resolution is necessary — isArrayDecl() requires the ref to be resolved to detect template string arrays; cannot be deferred"
  - "FIX-02: Orphaned AST $container fallback is a known Langium lifecycle workaround; intentional and necessary"
  - "FIX-03: Cancellation during javadoc init is harmless (best-effort feature); added missing return statement that was commented out in the FIXME"
  - "FIX-04: Inner class handling was already implemented in loadClassByName() as part of #314; FIXME was stale"

patterns-established:
  - "FIXME resolution pattern: investigate root cause, then either fix or document with WHY comment referencing issue numbers where relevant"

requirements-completed: [FIX-01, FIX-02, FIX-03, FIX-04]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 56 Plan 01: Production FIXME Resolution Summary

**All 4 production FIXME comments replaced with explanatory documentation comments or proper fixes; FIX-03 also restored a missing `return` statement**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T12:32:07Z
- **Completed:** 2026-02-20T12:34:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- FIX-01: bbj-linker.ts line 74 FIXME replaced with 3-line comment explaining why receiver ref must be eagerly resolved (template string array detection requires it)
- FIX-02: bbj-scope.ts line 209 FIXME HACK replaced with 3-line comment documenting Langium AST lifecycle constraint for orphaned nodes
- FIX-03: java-javadoc.ts line 54 malformed FIXME replaced with documentation comment; restored the missing `return` statement that was accidentally embedded in the comment text
- FIX-04: InteropService.java line 166 stale FIXME replaced with comment documenting that `loadClassByName()` already handles inner class names via dot-to-$ conversion (since #314)
- All 21 test files pass: 501 tests passing, 4 skipped — zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Resolve FIX-01 and FIX-02 in linker and scope provider** - `fc59796` (fix)
2. **Task 2: Resolve FIX-03 and FIX-04 in javadoc provider and InteropService** - `327d34e` (fix)

**Plan metadata:** (docs commit — see final)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-linker.ts` - FIX-01: FIXME replaced with explanatory comment on receiver ref resolution
- `bbj-vscode/src/language/bbj-scope.ts` - FIX-02: FIXME HACK replaced with Langium lifecycle documentation
- `bbj-vscode/src/language/java-javadoc.ts` - FIX-03: FIXME replaced with documentation + restored missing `return` statement
- `java-interop/src/main/java/bbj/interop/InteropService.java` - FIX-04: Stale FIXME replaced with comment referencing existing #314 fix

## Decisions Made
- FIX-01: Confirmed eager resolution is mandatory — `isArrayDecl(receiver.symbol.ref)` requires ref to already be resolved; cannot defer without breaking template string array guard
- FIX-02: Documented as intentional Langium workaround per user decision from STATE.md context
- FIX-03: The FIXME text "will not be re-triggered return;" was a malformed comment with `return;` embedded in the comment text (not a real return statement); restored the intended early return alongside the documentation comment
- FIX-04: `loadClassByName()` (lines 217-247) already handles `Outer.Inner` → `Outer$Inner` via `FIRST_UPPER_SEGMENT` pattern and `$` delimiter switching — FIXME was stale since #314

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Restored missing `return` statement in FIX-03**
- **Found during:** Task 2 (java-javadoc.ts FIX-03)
- **Issue:** The FIXME text `// FIXME will not be re-triggered return;` included `return;` as part of the comment text, meaning the early return on cancellation was never actually executed — the loop just continued on cancellation rather than exiting
- **Fix:** Added explicit `return;` after the cancellation warning log, then replaced the comment with proper documentation
- **Files modified:** `bbj-vscode/src/language/java-javadoc.ts`
- **Verification:** All tests pass; javadoc.test.ts (6 tests) all passing
- **Committed in:** `327d34e` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical behavior restored)
**Impact on plan:** The missing return was an unintentional bug embedded in the FIXME text. Adding it restores the intended behavior (early exit on cancellation) without changing the documented outcome. No scope creep.

## Issues Encountered
- Gradle wrapper not available in CI environment for Java compilation verification; Java change is a pure comment replacement with no logic changes so this is not a concern.

## Next Phase Readiness
- All 4 production FIXMEs in target files resolved — no ambiguous FIXME markers remain
- v3.8 FIXME/TODO cleanup phase complete
- Ready for any subsequent cleanup or release phases

---
*Phase: 56-production-fixme-todo-resolution*
*Completed: 2026-02-20*
