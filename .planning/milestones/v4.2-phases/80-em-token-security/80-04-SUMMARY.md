---
phase: 80-em-token-security
plan: 04
subsystem: security
tags: [jwt, intellij, java, cache, trust-window, sha-256]

# Dependency graph
requires:
  - phase: 78-build-foundation
    provides: JDK 17 daemon toolchain (BUILD-01) so ./gradlew test resolves correctly on this JDK 25 host
  - phase: 80-em-token-security-01-fail-closed-jwt-expiry
    provides: JwtValidity.Result three-valued classification and the fail-closed isTokenExpired delegate this plan's ordering guard depends on
provides:
  - TokenValidationCache — a digest-keyed, five-minute read-through trust window in front of the EM server-side validation subprocess
  - BbjRunActionBase.validateTokenTrusted(project, token) — the single read-through entry point both run actions call
  - BbjEMTokenStore.storeToken/deleteToken unconditional cache invalidation
  - A cross-file source guard proving the collapsed call sites and invalidation hooks as build-checked properties
affects: []

# Actuals (#2632)
actuals:
  tokens: 7057
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static-memo-with-injected-collaborators cache (TokenValidationCache), mirroring BbjNodeVersionCache's SESSION/package-private-constructor/test-hook shape but simplified to a single AtomicReference<Entry> since there is exactly one token of interest at a time"
    - "Negative-control red observation when a source guard is written after the production change it pins: temporarily revert the call site, observe the guard fail, restore via git checkout --, confirm byte-identical, then commit the guard against the real green state"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenValidationCache.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/TokenValidationCacheTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java

key-decisions:
  - "The cache is keyed on the SHA-256 digest of the token's UTF-8 bytes, never the plaintext; the class declares no String field and the digest is computed fresh on every isTrusted/recordValidated call, matching the plan's D-14 requirement verbatim"
  - "isTrusted's window comparison is inclusive (now - validatedAt <= TRUST_WINDOW_MS), pinned by Test 7's exact-boundary-is-still-trusted / one-millisecond-later-is-a-miss pair"
  - "storeToken and deleteToken both call TokenValidationCache.SESSION.invalidate() unconditionally as their last statement; getToken is untouched since it only reads"
  - "Task 2's seven appended edge-case tests (5-11) all passed against Task 1's TokenValidationCache with zero production changes to the cache itself -- the only Task 2 production change was the two invalidate() call sites in BbjEMTokenStore, which the cache's own tests cannot see and which Task 3's source guard proves instead"
  - "Task 3's red was observed by negative control (Tasks 1-2 were already committed, so a straight pre-fix-source red is unreproducible without reverting real work): BbjRunBuiAction.java was temporarily edited to call validateTokenServerSide directly, 4 of 7 guards failed as expected, then the file was restored via git checkout -- and confirmed byte-identical before the guard test was committed against the true green state"

requirements-completed: [TOKEN-04]

coverage:
  - id: D1
    description: "Two Run invocations in quick succession with the same token run the server-side validation subprocess at most once"
    requirement: "TOKEN-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/TokenValidationCacheTest.java#twoRunInvocationsInQuickSuccessionWithTheSameTokenValidateAtMostOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "The window expires and re-validates, invalidate() forces re-validation, a different token value is a miss, a failed validation is never recorded, a hit inside the window does not extend it, the boundary is inclusive, a null/empty token is never trusted or recorded, a malformed token never reaches validateThrough, eight concurrent cold-cache calls leave one coherent entry, and recording a second token replaces rather than accumulates"
    requirement: "TOKEN-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/TokenValidationCacheTest.java (11 tests total)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The run actions no longer call the subprocess directly, the expiry gate still precedes the trusted check, the trusted check still precedes the re-prompt, the base class still declares both methods in the right order, and both store mutations invalidate the cache in the right two methods"
    requirement: "TOKEN-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java (7 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Two quick Run As BUI launches on the same file in a live IDE show a noticeably faster second launch with no second em-validate-token.bbj process, and logging out then back in re-validates on the first Run after re-login"
    human_judgment: true
    rationale: "No automated test in this repository drives a live IntelliJ Run action or observes an actual spawned subprocess end to end; the behavioural tests prove the cache's arithmetic and the source guards prove the wiring, but the user-visible speedup and the logout/re-login reset are the plan's own designated human UAT items (see Human UAT items below)."

# Metrics
duration: ~30min
completed: 2026-09-04
status: complete
---

# Phase 80 Plan 04: Validation Trust Window Summary

**A digest-keyed, five-minute `TokenValidationCache` collapses the BUI/DWC run actions' duplicated server-side JWT validation calls onto one `validateTokenTrusted` entry point, so two Run invocations with the same token spawn the `em-validate-token.bbj` subprocess at most once, while `storeToken`/`deleteToken` unconditionally clear the trust record.**

## Performance

- **Duration:** ~30 min (continuation from a prior session that drafted and verified Task 1's code but stalled before any commit)
- **Started:** 2026-09-04
- **Completed:** 2026-09-04T16:02:04Z
- **Tasks:** 3
- **Files modified:** 7 (3 new, 4 modified)

## Accomplishments
- `TokenValidationCache` — a plain-Java, `com.intellij`-import-free class beside `BbjEMTokenStore` with a static `SESSION` instance over an injected `LongSupplier` clock, an `AtomicReference<Entry>` holding an immutable `(SHA-256 digest, validatedAtMillis)` record, `isTrusted`, `recordValidated`, `invalidate`, and the read-through `validateThrough(token, serverCheck)` entry point
- `BbjRunActionBase.validateTokenTrusted(project, token)` — delegates to `TokenValidationCache.SESSION.validateThrough`, placed immediately after `validateTokenServerSide` so the pair reads as one unit; `validateTokenServerSide` itself is unchanged
- `BbjRunBuiAction` and `BbjRunDwcAction` both route their single server-validation condition through `validateTokenTrusted(project, token)` instead of calling `validateTokenServerSide` directly; the client-side expiry check still runs first in both, unchanged
- `BbjEMTokenStore.storeToken` and `deleteToken` both call `TokenValidationCache.SESSION.invalidate()` unconditionally as their last statement; `getToken` is untouched
- `TokenValidationCacheTest` — 11 behavioural tests over a mutable clock and a counting `BooleanSupplier`, covering the hit/miss arithmetic, the boundary, null/empty and malformed-token cases, an eight-thread cold-cache concurrency race, and token-replacement semantics
- `EmTokenTrustWindowSourceGuardTest` — 7 source-guard assertions proving the collapsed call sites, the expiry-before-trust ordering, and the invalidation hooks as build-checked properties
- Whole `./gradlew test` suite: 234/234, 0 failures, 0 errors (up from 216 at the close of 80-03)

## Task Commits

Each task was committed atomically per its own red-then-green cycle:

1. **Task 1 RED: failing test for token validation trust window** - `6f97c89` (test) — `TokenValidationCacheTest` (4 tests) written against a class that did not exist yet; a prior session observed the compile-error red (`cannot find symbol TokenValidationCache`) before this continuation session verified the drafted green state and committed.
2. **Task 1 GREEN: implement token validation trust window** - `9b0b7b1` (feat) — `TokenValidationCache`, `validateTokenTrusted`, and the BUI/DWC call-site changes. Verified in this session: 4/4 tests, fresh `--rerun`, before committing.
3. **Task 2 RED: edge-case tests** - `e2b2140` (test) — Tests 5-11 appended to `TokenValidationCacheTest`; all 11 passed immediately against Task 1's unmodified cache (see Deviations note — not a TDD violation, the plan's own action text anticipates this).
4. **Task 2 GREEN: invalidate on store/delete** - `b835b7c` (feat) — the two `TokenValidationCache.SESSION.invalidate()` call sites in `BbjEMTokenStore`, the actual new production surface Task 2 required.
5. **Task 3: source-guard the collapsed call sites** - `3ee195a` (test) — `EmTokenTrustWindowSourceGuardTest`; red observed by negative control (see Deviations), then 7/7 green against the true committed state.

**Plan metadata:** (this commit) `docs(80-04): complete plan`

_Note: this plan is `tdd="true"` throughout (Task 1 is `type="tracer"`, Tasks 2-3 are `type="auto"`); each task carries a red observation and a green commit._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenValidationCache.java` - New digest-keyed, five-minute read-through trust window
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` - `storeToken`/`deleteToken` both invalidate the cache unconditionally
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - New `validateTokenTrusted(project, token)` beside `validateTokenServerSide`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` - Server-validation call routed through `validateTokenTrusted`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` - Server-validation call routed through `validateTokenTrusted`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/TokenValidationCacheTest.java` - 11-test behavioural coverage for the cache
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java` - 7-assertion source guard for the wiring

## Decisions Made
- Kept `TRUST_WINDOW_MS` at exactly five minutes (`TimeUnit.MINUTES.toMillis(5)`), the plan's fixed upper bound; no configurability was added.
- The digest is computed with `MessageDigest.getInstance("SHA-256")` over the token's UTF-8 bytes on every call rather than cached alongside the token, so no plaintext or partial representation is ever retained in a field.
- `hasEntry()` is package-private, test-only, matching the `BbjNodeVersionCache` precedent's `clear()`/`size()` test hooks.
- No timer, scheduled sweep, or persisted record was added anywhere; expiry is evaluated entirely on read, confirmed absent by both the acceptance-criteria greps and the source guard.

## Deviations from Plan

### Documented (not fixes)

**1. [Method note] Task 2's appended tests passed immediately with no cache change**
- **Found during:** Task 2 RED phase (Tests 5-11)
- **Observation:** All seven appended edge-case tests passed against Task 1's `TokenValidationCache` exactly as committed — no production change to the cache class was needed. The plan's own action text anticipates this explicitly ("If any of these cases does not already hold... fix the cache — not the test"), and the same pattern occurred in 80-03's Task 2. The genuinely new Task 2 production surface — the two `invalidate()` call sites in `BbjEMTokenStore` — is not exercised by `TokenValidationCacheTest` at all (it has no reference to `BbjEMTokenStore`); that wiring is instead pinned by Task 3's source guard.
- **Files modified:** None beyond the planned `BbjEMTokenStore.java` invalidation hooks.
- **Verification:** 11/11 tests pass, fresh `--rerun`.

**2. [Method note] Task 3's red observed by negative control, not a natural pre-fix state**
- **Found during:** Task 3 RED phase
- **Observation:** Tasks 1 and 2 were already committed by the time Task 3's source guard was written, so a straight "run the guard against the pre-Task-1 source" red was not reproducible without reverting real, already-verified work — which the continuation instructions explicitly prohibited (`do not reproduce the red by deleting the class again`, applied here to the wiring by analogy, matching the same technique 80-02's Task 3 used). Instead, `BbjRunBuiAction.java` was temporarily edited in place to call `validateTokenServerSide` directly (the pre-fix shape), the guard test was run and 4 of 7 assertions failed exactly as expected (the two ordering guards involving `validateTokenTrusted` and the two direct-call-site guards), the file was restored via `git checkout --` and confirmed byte-identical to the committed state (`git diff --stat` empty), and only then was the guard test run again (7/7 green) and committed.
- **Files modified:** None — the negative control touched `BbjRunBuiAction.java` in the working tree only and was fully reverted before any commit.
- **Verification:** 4/7 failed under the negative control; 7/7 green after restore; whole suite 234/234 after the commit.

---

**Total deviations:** 0 auto-fixed. Two documented methodological notes (both about how red was observed, not about any behavior that needed fixing) — no Rule 1-4 deviation occurred in this plan.
**Impact on plan:** None on scope or behavior. The plan's own action text anticipated both situations.

## Issues Encountered
- A prior executor session drafted Task 1's test and production code and had observed the red (`cannot find symbol TokenValidationCache`) and two green `BUILD SUCCESSFUL` runs, but stalled before committing anything — a known failure mode for this environment (executor going silent after the last-commit-equivalent checkpoint). This session re-verified the drafted code against the plan's acceptance criteria and threat model, scrubbed six D-xx planning decision-id references the draft's Javadoc had leaked into source comments (the phase's landing rule permits GitHub issue numbers only), then committed.

## User Setup Required
None - no external service configuration required.

## Human UAT items (carry into `/gsd-verify-work`)

1. **Two quick Runs, one subprocess (#542's user-visible criterion).** In a sandbox IDE with EM login done, Run As BUI on a file and then immediately Run As BUI again. The second launch should start noticeably faster and no second `em-validate-token.bbj` process should appear.
2. **Logout clears trust.** Run once (validated), then log out or let the token be deleted, then log in again and Run: the validation subprocess should run again on that first Run after re-login.

## Threat Flags

None — this plan introduces no new network endpoint, auth path, or schema change beyond the surface already enumerated in the plan's own threat register (T-80-19 … T-80-25, T-80-SC), all of which are mitigated or explicitly accepted there.

## Known Stubs

None. No placeholder value, TODO, or unwired data path was introduced.

## Next Phase Readiness
- TOKEN-04 (#542) is complete on the code side: the cache is keyed on the token bytes, holds no plaintext, is invalidated by both store mutations, and the ordering guarantee from TOKEN-01's fail-closed expiry check is preserved and pinned by a source guard. Issue closure additionally needs the two human UAT items above.
- Phase 80 (EM Token Security) is now complete: all four plans (80-01 through 80-04) landed, covering TOKEN-01 through TOKEN-04. `./gradlew test` is green at 234/234 across all four plans' combined coverage.
- No further plan in this phase depends on this one.

---
*Phase: 80-em-token-security*
*Completed: 2026-09-04*

## Self-Check: PASSED

All three source/test files under `key-files.created` exist on disk, and all five task
commits (`6f97c89`, `9b0b7b1`, `e2b2140`, `b835b7c`, `3ee195a`) resolve in `git log`.
Every acceptance criterion from Tasks 1-3 and the plan-level `<verification>` block was
re-run in this session against a fresh `--rerun`: 4/11/7 tests per class respectively,
and 234/234 across the whole IntelliJ suite, 0 failures, 0 errors.
