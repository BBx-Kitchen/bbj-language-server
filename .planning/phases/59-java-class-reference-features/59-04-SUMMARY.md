---
phase: 59-java-class-reference-features
plan: 04
subsystem: java-interop
tags: [langium, completion, java-interop, scope, static-methods]

# Dependency graph
requires:
  - phase: 59-java-class-reference-features plan 01
    provides: isStatic/deprecated/constructors fields in Langium type model
  - phase: 59-java-class-reference-features plan 02
    provides: isClassRef detection and static-method filtering in bbj-scope.ts
  - phase: 59-java-class-reference-features plan 03
    provides: deprecated strikethrough and constructor completion foundation

provides:
  - Two-phase class resolution in java-interop.ts (isStatic set synchronously before async type resolution)
  - '(' registered as completion trigger character (auto-fires after new ClassName()
  - Empty CompletionList returned when '(' triggers and constructor completion fails (prevents slow fallthrough)
affects: [java-interop, bbj-scope, bbj-completion-provider, UAT-tests-4-5-8]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-phase class resolution: synchronous property initialization (isStatic/deprecated) before async type resolution"
    - "Completion trigger guard: explicit trigger character check returns empty list instead of falling through to slow default"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/src/language/bbj-completion-provider.ts

key-decisions:
  - "Two-phase resolveClass: Phase 1 sets isStatic/deprecated synchronously on all methods/fields from raw DTO; resolvedClasses.set() follows immediately so re-entrant resolveClassByName uses fast-path; Phase 2 does async type resolution"
  - "MemberCall isClassRef extension dropped: extending isClassRef detection to FQN MemberCall chains caused regression — old JAR does not send isStatic for fields so Boolean.TRUE and Date.valueOf could not link; FQN completion showing all members is pre-existing behavior maintained"
  - "( trigger returns empty CompletionList (not undefined) to prevent slow fallthrough to Langium default completion engine when no constructor items available"

patterns-established:
  - "Pattern: Synchronous property initialization before cache registration — set all properties that external callers depend on before adding to shared maps"

requirements-completed: [FEAT-02, FEAT-03, FEAT-04]

# Metrics
duration: 19min
completed: 2026-02-21
---

# Phase 59 Plan 04: Gap Closure — UAT Tests 4, 5, 8 Summary

**isStatic race condition fixed via two-phase class resolution; '(' auto-trigger and empty-list fallback hardening for constructor completion**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-21T06:29:21Z
- **Completed:** 2026-02-21T06:48:41Z
- **Tasks:** 1 of 2 (Task 2 is a human-action deployment gate)
- **Files modified:** 2 (java-interop.ts, bbj-completion-provider.ts)

## Accomplishments

- Fixed isStatic race condition in java-interop.ts: class no longer appears in resolvedClasses until isStatic/deprecated are set on all methods/fields — eliminates the window where `getResolvedClass()` returns a class with `isStatic=undefined` defaulting to false
- Added `'('` to triggerCharacters in BBjCompletionProvider so constructor completion auto-fires when user types `new ClassName(`
- Returning empty CompletionList (not undefined) when `'('` trigger fires and no constructor items are found, preventing fallthrough to the slow default completion engine
- All 511 tests pass, no regressions

## Task Commits

1. **Task 1: Fix isStatic race condition, '(' trigger, prevent constructor fallthrough** - `99820a0` (feat)

**Note:** Task 2 (Deploy updated java-interop JAR) is a human-action gate requiring manual deployment — see Checkpoint Details below.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop.ts` — Two-phase resolveClass: Phase 1 synchronously sets $type, isStatic, deprecated on all fields/methods/constructors; registers in resolvedClasses; Phase 2 does async type resolution. Prevents the race condition where getResolvedClass() returns a class before isStatic is populated.
- `bbj-vscode/src/language/bbj-completion-provider.ts` — Added '(' to triggerCharacters; added explicit '(' trigger guard that returns empty CompletionList instead of falling through to super.getCompletion()

## Decisions Made

- **Two-phase class resolution:** Phase 1 sets isStatic/deprecated synchronously from raw DTO data. Then `resolvedClasses.set()` registers the class with correct isStatic values. Phase 2 does async type resolution using the now-registered class (fast-path prevents infinite recursion). This eliminates the race condition where the old code registered the class before any properties were set.

- **MemberCall isClassRef extension dropped (deviation from plan):** The plan called for extending isClassRef detection to MemberCall receivers (FQN paths like `java.lang.String.`) so they also show only static methods. However, this caused test failures: the running BBj Java interop JAR (predating commit a02e009) does not send `isStatic=true` for fields, so `java.lang.Boolean.TRUE` and `java.sql.Date.valueOf` could not resolve. The FQN path showing all members (static + instance) is pre-existing behavior. The USE path isClassRef fix (the primary goal) is complete and correct.

- **Empty CompletionList for '(' trigger:** When '(' fires and getConstructorCompletion() returns undefined (class not resolved, no constructors, etc.), we return `{ items: [], isIncomplete: false }` instead of falling through to super.getCompletion(). This gives users an instant empty list rather than a slow default completion that produces irrelevant keywords.

## Deviations from Plan

### Auto-fixed Issues

None — the MemberCall isClassRef extension was a plan deviation (dropped, not auto-fixed), documented below.

### Plan Deviations

**1. [Rule 4 - Architectural] MemberCall isClassRef extension dropped**
- **Found during:** Task 1 (implementation and test verification)
- **Issue:** Extending `isClassRef` to MemberCall receivers caused 2 test failures (`Unloaded Java FQN access` and `Java FQN access`). Root cause: these tests run against a real Java backend whose JAR (BBj-bundled version predating commit a02e009) does NOT send `isStatic=true` for static fields. With isClassRef=true on FQN paths, the scope filtered to static-only — but since isStatic=false for all fields (old JAR), `java.lang.Boolean.TRUE` and `java.sql.Date.valueOf` could not be found.
- **Decision:** Drop the MemberCall isClassRef extension. The FQN path continues to show all members (existing behavior). The critical fix — USE path isStatic race condition — is complete and works independently.
- **Impact:** FQN paths (`java.lang.String.`) still show instance methods alongside static methods in completion. This is a known limitation documented in the UAT. Fix requires deploying the updated JAR (Task 2) to ensure isStatic is set correctly before the MemberCall isClassRef extension can safely be applied.
- **Tests:** 511/511 pass (no regressions)

---

**Total deviations:** 1 plan deviation (MemberCall isClassRef dropped due to JAR compatibility)
**Impact on plan:** Core race condition fix is delivered. FQN static-only filtering deferred to after JAR deployment (Task 2).

## Checkpoint: Task 2 — Deploy Updated JAR

**Type:** human-action
**Gate:** blocking

The TypeScript-side fixes (Task 1) are complete. To fully close UAT Tests 6 (deprecated) and 8 (constructors), the updated `java-interop` JAR must be deployed:

1. Build the java-interop module:
   ```
   cd java-interop && mvn package
   ```

2. Deploy the resulting JAR into BBj's runtime classpath (replacing the bundled version)

3. Restart BBj and the language server

**Verification after JAR deployment:**
- `java.util.Date.getHours()` should show strikethrough in completion
- `new java.util.HashMap(` should show constructor signatures
- After `USE java.lang.String`, `String.valueOf` should appear with correct isStatic=true

**Note:** The race condition fix (Task 1) means that once isStatic data arrives from the updated JAR, it will be correctly set before any scope provider accesses the class. No additional TypeScript changes needed.

## Issues Encountered

- **Two-phase fix caused test timeouts (resolved):** Initial implementation moved `resolvedClasses.set()` entirely to the END of resolveClass() without a Phase 1 sync pass. This caused infinite recursion — when resolveClass resolved method return types (e.g., String.valueOf returning String), it called resolveClassByName('java.lang.String') which found no entry in resolvedClasses and tried to re-resolve. Fixed by adding Phase 1 sync pass that sets isStatic/deprecated, then calling resolvedClasses.set() BEFORE the async loop. This provides the re-entrant protection while ensuring isStatic is set.

## Next Phase Readiness

- Task 1 (TypeScript fixes) complete and committed
- Task 2 (JAR deployment) pending human action — see Checkpoint section above
- Once JAR deployed: deprecated strikethrough (UAT Test 6) and constructor completion (UAT Test 8) should work end-to-end
- The MemberCall isClassRef extension can be re-applied after verifying JAR sends correct isStatic values

---
*Phase: 59-java-class-reference-features*
*Completed: 2026-02-21*

## Self-Check: PASSED

- FOUND: 59-04-SUMMARY.md
- FOUND: java-interop.ts
- FOUND: bbj-completion-provider.ts
- FOUND commit 99820a0 (Task 1)
