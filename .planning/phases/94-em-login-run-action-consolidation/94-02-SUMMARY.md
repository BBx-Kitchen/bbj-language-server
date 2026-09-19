---
phase: 94-em-login-run-action-consolidation
plan: 02
subsystem: intellij
tags: [intellij, em-login, token-validation, java, junit5, security]

requires:
  - phase: 94-em-login-run-action-consolidation
    provides: "BbjToolScriptResolver.SESSION.resolveToolScript(...) for em-validate-token.bbj (plan 01)"
provides:
  - "EmTokenValidator holding both validateTokenServerSide and validateTokenTrusted beside BbjEMTokenStore/TokenValidationCache"
  - "Re-pointed BbjSecretArgvSourceGuardTest and EmTokenTrustWindowSourceGuardTest asserting against the new location"
affects: [94-03-em-login-and-run-action-cleanup]

actuals:
  tokens: 6985
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "EmTokenValidator follows the BbjInteropPortCache/BbjToolScriptResolver seam convention: public final class, nested @FunctionalInterface (ValidationRunner), public static final SESSION wired by method reference to a private static default implementation, package-private constructor for test injection"
    - "The moved public methods take the BBj executable path and script path as explicit parameters instead of resolving them internally, matching D-04's 'no settings read, no plugin lookup' property"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmTokenValidator.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java

key-decisions:
  - "Task 1 (tracer) moved both validation methods and rewired the single call site end-to-end, then re-ran its targeted verify (auto mode active per workflow.auto_advance) before expanding into Tasks 2/3, per the plan's tracer/expansion split."
  - "Confirmed by inspection, not merely a green run, that after the move the first BbjProcessSecretEnv.Invocation declaration and first withEnvironment( call remaining in BbjRunActionBase.java are both buildWebRunCommandLine's own invocation variable -- so the pre-existing data-flow assertion in BbjSecretArgvSourceGuardTest continues to hold against its original (unmoved) subject without any code change."
  - "Removed 'plan 01'/'plan 02' and one 'CR-01' planning-identifier mention from BbjSecretArgvSourceGuardTest's class javadoc and a method-level comment while editing those exact blocks for the relocation, per the project's no-planning-identifiers-in-edited-text rule; left the pre-existing CR-02 rationale comment in BbjRunActionBase.java untouched (pinned by OffEdtDispatchSourceGuardTest) and the pre-existing CR-01/phase-75/80-01 mentions elsewhere in both files untouched, since those blocks were not otherwise edited."

requirements-completed: [EM-03]

coverage:
  - id: D1
    description: "validateTokenServerSide and validateTokenTrusted both moved off BbjRunActionBase into a new EmTokenValidator beside BbjEMTokenStore/TokenValidationCache, taking the BBj path and script path as parameters; the BUI/DWC call site rewired to the new three-argument signature"
    requirement: "EM-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java#aSecondCallInsideTheTrustWindowInvokesTheRunnerZeroAdditionalTimes"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java#aCacheMissWithAValidSentinelReturnsTrueAndInvokesTheRunnerExactlyOnce"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java#aCacheMissWithANonValidSentinelReturnsFalseAndTheNextCallInvokesTheRunnerAgain"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java#aNullBbjPathReturnsFalseAndTheRunnerIsNeverInvoked"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java#aNullScriptPathReturnsFalseAndTheRunnerIsNeverInvoked"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java#aThrowingRunnerReturnsFalseRatherThanPropagating"
        status: pass
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test (whole suite)"
        status: pass
    human_judgment: false
  - id: D2
    description: "BbjSecretArgvSourceGuardTest (the GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8 pin) re-pointed to the new file with no assertion weakened -- OWNER_ONLY_FILE_CALLERS replaces the base with the validator, ALL_GUARDED_ACTION_FILES gains the validator, and the file-presence/no-secret-param tests now sweep five sources"
    requirement: "EM-03"
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --tests \"*.BbjSecretArgvSourceGuardTest\" --tests \"*.BbjProcessSecretEnvTest\" --tests \"*.OwnerOnlyAclTest\""
        status: pass
    human_judgment: false
  - id: D3
    description: "EmTokenTrustWindowSourceGuardTest re-pointed: the declaration/ordering assertion now reads EmTokenValidator.java with the updated public-visibility literal, a new assertion pins zero declarations of both methods in BbjRunActionBase.java, and the three call-site literals use the new three-argument validateTokenTrusted(bbjPath, emValidatePath, token) form"
    requirement: "EM-03"
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --tests \"*.EmTokenTrustWindowSourceGuardTest\" --tests \"*.BbjRunActionConfigPathSourceGuardTest\" --tests \"*.EmTokenBackendNoticeSourceGuardTest\""
        status: pass
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --rerun-tasks (whole suite)"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-09-19
status: complete
---

# Phase 94 Plan 02: EM Token Validator Relocation Summary

**`EmTokenValidator` (BbjInteropPortCache/BbjToolScriptResolver seam shape) now carries both `validateTokenServerSide` and `validateTokenTrusted`, beside `BbjEMTokenStore`/`TokenValidationCache` instead of on `BbjRunActionBase`, with both re-pointed security guards gaining assertions rather than losing them.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-19T06:59:00Z (approx.)
- **Completed:** 2026-09-19T07:12:44Z
- **Tasks:** 3 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- New `EmTokenValidator` class (nested `@FunctionalInterface ValidationRunner`, `SESSION` field, package-private constructor) reproduces `validateTokenServerSide`/`validateTokenTrusted` verbatim except that the BBj executable path and the `em-validate-token.bbj` script path now arrive as parameters (D-04) rather than being resolved internally -- reads no settings and performs no plugin lookup of its own.
- `EmTokenValidatorTest` covers all six behavior cases: in-window trust hit (zero additional runner invocations), cache-miss VALID sentinel, cache-miss non-VALID sentinel (next call re-validates), null BBj path, null script path, and a throwing runner -- all via a counting fake `ValidationRunner`, invalidating the shared `TokenValidationCache.SESSION` before and after each test.
- `BbjRunActionBase.buildWebRunCommandLine` resolves `em-validate-token.bbj` via `BbjToolScriptResolver.SESSION.resolveToolScript(...)` and calls `EmTokenValidator.SESSION.validateTokenTrusted(bbjPath, emValidatePath, token)`; both moved methods and their javadoc are deleted from the base, and the off-EDT dispatch comment now names `EmTokenValidator` instead of the deleted method while keeping its `CR-02` rationale token intact.
- `BbjSecretArgvSourceGuardTest` (the GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8 advisory pin) re-pointed: `OWNER_ONLY_FILE_CALLERS` now names `EmTokenValidator.java` in place of the base (which no longer calls `createOwnerOnlyFile` or constructs a `CapturingProcessHandler`), `ALL_GUARDED_ACTION_FILES` gains the validator alongside the base and EM login action, and the file-presence/no-secret-param tests were renamed and extended to sweep all five guarded sources.
- Confirmed **by inspection**, not merely a green run: after the move, the first `BbjProcessSecretEnv.Invocation` declaration and the first `withEnvironment(` call remaining anywhere in `BbjRunActionBase.java` are both `buildWebRunCommandLine`'s own `invocation` variable (verified at the two indices found by a direct source scan), so the pre-existing data-flow assertion continues to hold against its unmoved subject with no code change required.
- `EmTokenTrustWindowSourceGuardTest` re-pointed: the declaration/ordering test now reads `EmTokenValidator.java` with the updated `public boolean validateTokenServerSide(` literal (visibility changed from `protected`); a new test asserts `BbjRunActionBase.java` declares neither method (declaration-shaped literals, immune to prose javadoc mentions); the three call-site literals pinning `validateTokenTrusted(...)` were updated to the three-argument form. Delegation, no-direct-server-check, store-mutation-invalidation, and cache-import tests are unchanged.
- Whole `bbj-intellij` JUnit suite green after a forced full re-run: **995 tests, 0 failures, 0 errors** (up from 988 at the end of plan 01 -- 6 new `EmTokenValidatorTest` cases plus 1 new assertion method in `EmTokenTrustWindowSourceGuardTest`).

## Task Commits

Each task was committed atomically:

1. **Task 1: The validator in its new home, carrying the BUI/DWC token path end-to-end** - `95484340` (feat, tracer)
2. **Task 2: Re-point the advisory argv guard without weakening it** - `3aaee5f9` (test)
3. **Task 3: Re-point the trust-window guard and its changed call-site literal** - `80a8a1b7` (test)

_Task 1 was `type="tracer"`: after committing, its `<verify>` was re-run end-to-end (auto mode active per `workflow.auto_advance`), passed, and Task 2 proceeded to expansion -- no checkpoint needed._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmTokenValidator.java` - the relocated validator, seam-shaped per `BbjInteropPortCache`/`BbjToolScriptResolver`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java` - plain JUnit 5 coverage of all six behavior cases
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - both validation methods deleted, call site rewired, off-EDT comment updated
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java` - re-pointed to the validator; five-source sweep
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java` - re-pointed declaration/ordering test, new zero-declarations-in-base test, updated call-site literals

## Decisions Made

- Followed the `EmTokenValidator` interface signatures exactly as specified in the plan's `<interfaces>` block (`@Nullable String bbjPath, @Nullable String scriptPath, @NotNull String token`), preserving the existing null-tolerance behavior at the new boundary.
- Kept the two guard test files' own private `readGuardedSource`/`countOccurrences`/`extractMethodBody` helper copies rather than extracting a shared utility, per the D-12 precedent the plan cites.
- Cleaned three pre-existing planning-identifier mentions ("plan 01", "plan 02", "CR-01") out of `BbjSecretArgvSourceGuardTest`'s class javadoc and one method-level comment while editing those exact blocks for the relocation (the project's no-planning-identifiers-in-edited-text rule applies to any text touched, not just newly authored lines). Left the pre-existing `CR-02` rationale comment in `BbjRunActionBase.java` untouched, since it is pinned by `OffEdtDispatchSourceGuardTest`'s `bothFilesStillCarryTheCr02RationaleComment` assertion and was not part of the text I needed to edit for this plan; likewise left the unrelated `CR-01`/`phase-75` javadoc at `BbjSecretArgvSourceGuardTest.java:111` and the `80-01` mention in `EmTokenTrustWindowSourceGuardTest.java`'s class javadoc untouched, since neither block was otherwise edited by this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`EmTokenValidator.SESSION` is the single home for server-side and trusted EM token validation; `TokenValidationCache.java` is confirmed byte-identical to its pre-plan state. Plan 03 (EM login enablement and cleanup) can proceed against the final shape of `BbjRunActionBase.java` and the re-pointed guards -- no further token-validation-path changes are expected from that plan.

---
*Phase: 94-em-login-run-action-consolidation*
*Completed: 2026-09-19*

## Self-Check: PASSED

- `[ -f bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmTokenValidator.java ]` → FOUND
- `[ -f bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java ]` → FOUND
- `git log --oneline --all --grep="94-02"` → 3 commits found (`95484340`, `3aaee5f9`, `80a8a1b7`)
- Task 1 acceptance criteria: all 10 PASS (exactly one `validateThrough(` call; `validateTokenServerSide(` precedes `validateTokenTrusted(`; zero `getBbjExecutablePath`/`BbjSettings`/`findEnabledPlugin`; `createOwnerOnlyFile` precedes `CapturingProcessHandler(`; zero base decl literals; base retains exactly one `assertIsNonDispatchThread()` and `CR-02`; `buildWebRunCommandLine` body has exactly one new-form `validateTokenTrusted(...)` call and zero `validateTokenServerSide`; `TokenValidationCache.java` byte-identical; in-window test asserts zero additional invocations)
- Task 2 acceptance criteria: all 5 PASS (owner-only list names validator not base; presence list names all three; both sweep tests cover five sources; diff adds >= removes assertions; both GHSA identifiers still present)
- Task 3 acceptance criteria: all 6 PASS (declaration/ordering test reads validator; new zero-in-base assertion added; three call-site literals updated; unrelated tests unchanged; guard keeps its own private helpers; diff adds >= removes assertions)
- Plan-level `<verification>`: whole suite green (995 tests, 0 failures, 0 errors, forced full re-run); `EmTokenFailClosedSourceGuardTest`, `EmTokenBackendNoticeSourceGuardTest`, `OffEdtDispatchSourceGuardTest`, `Lsp4ijImportAllowlistTest` all pass unmodified; data-flow assertion's post-move subject confirmed by direct source inspection (see Accomplishments)
- Register check: `git diff` for all three commits' additions scanned for `EM-0[0-9]`, `D-0[0-9]`, `C-[0-9]+`, `CR-0[0-9]`, `plan 0[0-9]` — no matches in added lines
