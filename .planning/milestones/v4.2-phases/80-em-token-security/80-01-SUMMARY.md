---
phase: 80-em-token-security
plan: 01
subsystem: security
tags: [jwt, intellij, java, fail-closed, passwordsafe]

# Dependency graph
requires:
  - phase: 78-build-foundation
    provides: JDK 17 daemon toolchain (BUILD-01) so ./gradlew test resolves correctly on this JDK 25 host
provides:
  - Three-valued JWT classification (JwtValidity.Result{VALID,EXPIRED,MALFORMED}) replacing four independent fail-open return-false sites
  - Fail-closed isTokenExpired delegate in BbjEMTokenStore
  - Login-time gate in BbjEMLoginAction that rejects an unusable EM login result before it reaches PasswordSafe
affects: [80-em-token-security-04-validation-trust-window]

# Actuals (#2632)
actuals:
  tokens: 5300
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Java classifier seam beside the platform-coupled class it replaces logic in (JwtValidity beside BbjEMTokenStore), covered by behavioural JUnit 5 tests plus a source-guard test for platform-coupled wiring"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenFailClosedSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java

key-decisions:
  - "One three-valued classification (VALID/EXPIRED/MALFORMED) from a single decode replaces four independent early returns, so no fail-open branch can be fixed while another is missed (D-03)"
  - "exp is compared strictly (exp <= now, no clock-skew leeway); a non-integer or absent exp is MALFORMED, never a separate 'unknown' classification (D-04)"
  - "The EXP_PATTERN regex gained a (?![.\\d]) negative lookahead during Task 2's GREEN phase: the original digit-only regex silently truncated a decimal exp (e.g. 12.5) to its leading digits and produced a verdict instead of MALFORMED -- a genuine Rule 1 bug the new test caught red"
  - "performLogin classifies EM's returned text before storeToken; MALFORMED or already-EXPIRED is a login failure via the existing showErrorOnEdt with a fixed, non-interpolated message (D-05)"

requirements-completed: [TOKEN-01]

coverage:
  - id: D1
    description: "A non-3-part token, an exp-less payload, and a decode-throwing payload are each classified MALFORMED and reported expired by isTokenExpired"
    requirement: "TOKEN-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java#aTwoPartTokenIsMalformed,aWellFormedPayloadWithoutAnExpClaimIsMalformed,aDecodeThrowingPayloadIsMalformed"
        status: pass
    human_judgment: false
  - id: D2
    description: "The exp boundary (exp == now is EXPIRED) and both malformed-exp shapes (non-integer, overflow) never reach a verdict"
    requirement: "TOKEN-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java#anExpExactlyEqualToNowIsExpired,anExpThatIsNotAnIntegerIsMalformed,anExpLargerThanLongMaxIsMalformed"
        status: pass
    human_judgment: false
  - id: D3
    description: "A token EM returns in an unusable shape (MALFORMED or already-EXPIRED) is rejected at login and never reaches PasswordSafe"
    requirement: "TOKEN-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenFailClosedSourceGuardTest.java#loginActionClassifiesBeforeStoringSoNoUnusableTokenReachesPasswordSafe"
        status: pass
    human_judgment: false
  - id: D4
    description: "The failure message shown to the user on an unusable login token contains no token text, decoded fragment, or exp value"
    human_judgment: true
    rationale: "The literal message string is asserted in code review context but a human should confirm no interpolation was silently reintroduced; a live-IDE glance at the dialog is the natural check, not automatable from this test classpath"

# Metrics
duration: ~45min
completed: 2026-09-04
status: complete
---

# Phase 80 Plan 01: Fail-Closed JWT Expiry Classification Summary

**Collapsed four independent fail-open `isTokenExpired` branches into one three-valued `JwtValidity.check` classifier, and closed the matching login-time gap so an undecodable EM login result never reaches PasswordSafe.**

## Performance

- **Duration:** ~45 min (continuation from a prior stalled session that had drafted Task 1)
- **Completed:** 2026-09-04
- **Tasks:** 3
- **Files modified:** 6 (3 new, 3 modified)

## Accomplishments
- `JwtValidity.check(token, nowEpochSeconds)` — a plain-Java, platform-import-free classifier producing `VALID`/`EXPIRED`/`MALFORMED` from a single decode; `BbjEMTokenStore.isTokenExpired` is now a one-line fail-closed delegate
- 12-case `JwtValidityTest` completing the full #535 case table: two-part token, exp-less payload, decode-throwing payload, null/empty, four-part/no-dot tokens, `exp == now` boundary, non-integer `exp` (string and decimal), `exp` overflow, and classifier purity across interleaved calls
- `BbjEMLoginAction.performLogin` now classifies the EM login result before `storeToken`; an unusable result is a login failure ("Enterprise Manager returned an unusable token") and nothing is stored
- `EmTokenFailClosedSourceGuardTest` (7 tests) pins the fail-closed structure as a source property, since `performLogin` is platform-coupled and unreachable from a behavioural test

## Task Commits

Each task was committed atomically (Task 1 continued a prior session's uncommitted draft):

1. **Task 1: End-to-end fail-closed classification** - `9d61900` (feat) — `JwtValidity` extraction, `isTokenExpired` delegate, 3 initial behavioural tests. Red was observed by the prior session before `JwtValidity` existed (`package JwtValidity does not exist` compile error); this session verified the drafted GREEN state (3/3 tests, fresh timestamped run) before committing.
2. **Task 2 RED: case table** - `78eeee5` (test) — 9 appended tests; `anExpThatIsNotAnIntegerIsMalformed()` failed red against the Task 1 implementation.
3. **Task 2 GREEN: fix decimal-exp regex** - `1e1d530` (feat) — added `(?![.\d])` to `EXP_PATTERN`; all 12 tests pass.
4. **Task 3 RED: login-gate source guard** - `508298d` (test) — `EmTokenFailClosedSourceGuardTest`; 3/7 assertions failed red (no login gate yet).
5. **Task 3 GREEN: login gate + CR-02 restore** - `dbd4f36` (feat) — inserted the classification gate into `performLogin`; restored an unrelated `(CR-02)` comment tag dropped by same-day commit `fa6804e` so the whole-suite gate passes. All 7 source-guard tests pass; whole suite 180/180.

**Plan metadata:** (this commit) `docs(80-01): complete plan`

_Note: this plan follows `tdd="true"` red-then-green discipline; Tasks 1-3 each have a red observation (Task 1's recorded by the prior session, Tasks 2-3 observed directly in this session) and a green commit._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java` - New plain-Java three-valued JWT classifier
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` - `isTokenExpired` reduced to a fail-closed delegate over `JwtValidity.check`; decode/regex/imports removed
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` - Login-time gate classifies EM's returned text before `storeToken`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - Restored a dropped `(CR-02)` comment tag (unrelated pre-existing regression, see Deviations)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java` - 12-case behavioural coverage for the classifier
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenFailClosedSourceGuardTest.java` - 7-assertion source guard for the platform-coupled wiring

## Decisions Made
- Kept the dependency-free regex `exp` extraction and reused the base64url decode verbatim from the pre-image (D-04) rather than reimplementing.
- The `EXP_PATTERN` regex was tightened during Task 2's GREEN phase (see Deviations) — the change is additive (a negative lookahead) and does not alter the extraction approach D-04 mandates.
- No JWT/JSON library added; the classpath is unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Decimal `exp` value silently truncated to a verdict instead of MALFORMED**
- **Found during:** Task 2 RED phase (`anExpThatIsNotAnIntegerIsMalformed`)
- **Issue:** The original `EXP_PATTERN` (`"\"exp\"\\s*:\\s*(\\d+)"`) matches only leading digits, so a payload like `{"exp":12.5}` matched digit group `"12"` and produced a `VALID`/`EXPIRED` verdict instead of `MALFORMED` — exactly the "unknown treated as usable" shape D-04 prohibits.
- **Fix:** Added a negative lookahead `(?![.\d])` after the digit group so a digit run followed by another digit or a decimal point never matches; the payload then falls into the no-match `MALFORMED` branch.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java`
- **Verification:** All 12 `JwtValidityTest` cases pass, including the new `anExpThatIsNotAnIntegerIsMalformed` covering both string and decimal shapes.
- **Committed in:** `1e1d530`

**2. [Rule 3 - Blocking] Whole-suite gate failed on an unrelated pre-existing regression**
- **Found during:** Task 3's whole-suite `<verify>` step
- **Issue:** `OffEdtDispatchSourceGuardTest#bothFilesStillCarryTheCr02RationaleComment` failed because `BbjRunActionBase.java` no longer contained the literal `"CR-02"` — a same-day, unrelated commit (`fa6804e`, "chore(79): drop review-finding tag from run action comment") had removed the tag from a comment that guard still asserts on. This is out of this plan's file scope (`BbjRunActionBase.java` off-EDT dispatch, not token classification) but blocked the plan's required whole-suite `numFailedTests: 0` acceptance criterion.
- **Fix:** Restored the `(CR-02)` tag in the comment at the same location it was removed from; no logic change.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
- **Verification:** `./gradlew test` (whole suite) exits 0, 180/180 tests passing.
- **Committed in:** `dbd4f36` (same commit as the login gate, since both were needed to satisfy Task 3's acceptance criteria)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking issue)
**Impact on plan:** Both fixes were necessary to meet the plan's own acceptance criteria (12/12 JwtValidityTest cases; whole-suite green). No scope creep — the second fix is a one-word comment restoration with zero behavioral change.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TOKEN-01 (#535) is complete: `BbjEMTokenStore` and `BbjEMLoginAction` both fail closed on any token that cannot be positively decoded as an unexpired JWT.
- `BbjProcessSecretEnv.java` is untouched, so 80-02 (TOKEN-02, owner-only Windows temp files) runs independently in the same wave without conflict.
- 80-04 (TOKEN-04, validation trust cache) depends on this plan landing first (STATE.md sequencing constraint) — that dependency is now satisfied.
- The Windows ACL half of 80-02 cannot be exercised in this CI environment; that plan's SUMMARY will need to record manual verification separately (unrelated to this plan).

---
*Phase: 80-em-token-security*
*Completed: 2026-09-04*
