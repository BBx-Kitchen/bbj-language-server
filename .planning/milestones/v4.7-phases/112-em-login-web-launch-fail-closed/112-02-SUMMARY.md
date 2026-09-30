---
phase: 112-em-login-web-launch-fail-closed
plan: 02
subsystem: em-integration
tags: [vscode, jwt, em-login, fail-closed, vitest, module-registerHooks-free]

requires:
  - phase: 112
    provides: "112-01's web.bbj fail-closed rewrite (independent surface, no direct dependency)"
provides:
  - "src/em-token-validity.ts exporting EmTokenVerdict, classifyEmToken(token, nowEpochSeconds), isEmTokenExpired(token, nowEpochSeconds) — a plain, import-free port of bbj-intellij's JwtValidity.check"
  - "extension.ts getEMCredentials() classifies via isEmTokenExpired and deletes bbj.em.token for any token it cannot positively decode as unexpired"
  - "test/em-token-validity.test.ts (17 tests) mirrors every JwtValidityTest shape plus the JavaScript-specific empty-signature and base64url-alphabet cases"
  - "test/em-token-expiry-wiring.test.ts proves the activation-driven end-to-end flow: a malformed stored token is deleted and bbj.runBUI asks for a new login without ever calling Commands.runBUI"
affects: [112-03, 112-04, phase-114-lint-type-check-test-suite-gates]

actuals:
  tokens: 5541
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Plain, import-free src/ module ported 1:1 from a Java reference implementation, mirroring 110/111's plain-module-shared-with-tests pattern"

key-files:
  created:
    - bbj-vscode/src/em-token-validity.ts
    - bbj-vscode/test/em-token-validity.test.ts
    - bbj-vscode/test/em-token-expiry-wiring.test.ts
  modified:
    - bbj-vscode/src/extension.ts

key-decisions:
  - "Task 1 (the tracer) ported the complete JwtValidity.check rule set in one slice — strict base64url decode plus the Number.isSafeInteger overflow guard — rather than a partial first pass, because both were called out explicitly in the plan's own task description"
  - "Task 2's RED phase (17 JwtValidityTest-mirroring rows) passed against Task 1's implementation with zero code changes to classifyEmToken; committed as a test-only commit rather than forcing an artificial GREEN commit, and documented under TDD Gate Compliance below"
  - "The standard-alphabet-rejection test uses a hand-picked byte sequence (0xfb,0xff,0xfe,0xfd,0xfc) rather than a derived payload, since ASCII JSON text rarely round-trips through base64 with a '+' or '/' character; the test only needs the segment to contain a disallowed character, not to decode to meaningful JSON"

requirements-completed: [SEC-14]

coverage:
  - id: D1
    description: "classifyEmToken treats a null/empty token, a non-3-part token, an empty signature segment, a base64url decode failure, an exp-less payload, and a non-safe-integer exp (string/decimal/negative/overflow) as malformed"
    requirement: SEC-14
    verification:
      - kind: unit
        ref: "test/em-token-validity.test.ts#classifyEmToken"
        status: pass
    human_judgment: false
  - id: D2
    description: "A valid integer exp compared strictly against now yields 'valid' or 'expired' with no clock-skew allowance; isEmTokenExpired maps every non-'valid' verdict to true"
    requirement: SEC-14
    verification:
      - kind: unit
        ref: "test/em-token-validity.test.ts#classifyEmToken"
        status: pass
    human_judgment: false
  - id: D3
    description: "getEMCredentials() deletes bbj.em.token and returns undefined for a malformed/unsigned/exp-less stored token; a valid unexpired token is returned unchanged as { username: '__token__', password: token }"
    requirement: SEC-14
    verification:
      - kind: unit
        ref: "test/em-token-expiry-wiring.test.ts#EM token expiry wiring (issue #553)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Invoking the registered bbj.runBUI handler with a malformed stored token deletes the token, shows the 'EM login required. Login now?' prompt, and never calls the mocked Commands.runBUI"
    requirement: SEC-14
    verification:
      - kind: unit
        ref: "test/em-token-expiry-wiring.test.ts#EM token expiry wiring (issue #553) — a malformed stored token is deleted and Run BUI asks for a new login without ever calling Commands.runBUI"
        status: pass
    human_judgment: false
  - id: D5
    description: "A real expired/malformed EM token observed in a running VS Code session actually re-prompts login end to end, and a real valid token launches BUI/DWC without a spurious re-login"
    verification: []
    human_judgment: true
    rationale: "Requires a live VS Code extension host and a live Enterprise Manager session; recorded as ROADMAP criterion 5, deferred to the end-of-phase UAT alongside 112-01/112-03/112-04's human-check items."

duration: 14min
completed: 2026-09-27
status: complete
---

# Phase 112 Plan 02: EM Login & Web Launch Fail Closed — EM Token Expiry Check Summary

**`src/em-token-validity.ts` is a plain, import-free 1:1 port of bbj-intellij's `JwtValidity.check`, and `extension.ts`'s `getEMCredentials` now deletes and re-prompts for any EM token it cannot positively decode as unexpired.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-27T07:01:00Z
- **Completed:** 2026-09-27T07:14:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- A malformed token (wrong segment count), an unsigned token (empty third segment — the JavaScript `split()` trap Java's own split silently avoids), and an exp-less payload are all classified `'malformed'` and treated as expired, instead of the old code's four independent `return false` ("let server decide") fail-open branches
- The payload segment is decoded with a strict base64url check (alphabet, length modulo 4, padding) mirroring Java's `Base64.getUrlDecoder()`, which Node's lenient `Buffer.from(..., 'base64url')` does not enforce on its own
- A decoded `exp` that is a string, a decimal, negative, or larger than a safe integer is `'malformed'`; only a valid integer `exp` is compared strictly (`exp <= now` is expired, no clock-skew allowance) against the caller-supplied clock reading
- `extension.ts`'s `getEMCredentials()` calls `isEmTokenExpired(token, Math.floor(Date.now() / 1000))` in place of the removed `isTokenExpired` helper; the existing delete-and-reprompt flow and `bbj.em.credentials` fallback are unchanged
- An end-to-end activation test proves the whole chain: a malformed stored token deletes `bbj.em.token`, shows "EM login required. Login now?", and the mocked `Commands.runBUI` is never called; a token expiring an hour in the future passes straight through with no deletion
- The module has zero imports, never logs or parses with `JSON.parse`, and 17 tests mirror every `JwtValidityTest` shape plus the JavaScript-specific empty-signature and standard-alphabet cases

## Task Commits

Each task was committed atomically (Task 2 carried `tdd="true"` but needed no GREEN commit — see TDD Gate Compliance below):

1. **Task 1: A malformed, unsigned or exp-less stored token is deleted and Run BUI asks for a new login, end to end** — `10a862bb` (feat)
2. **Task 2: Every JwtValidityTest shape classifies the same way in VS Code** — `65d35598` (test)

_No plan-metadata commit follows — see the final commit below covering SUMMARY.md/STATE.md/ROADMAP.md/REQUIREMENTS.md together._

## Files Created/Modified

- `bbj-vscode/src/em-token-validity.ts` — new plain module: `EmTokenVerdict`, `classifyEmToken`, `isEmTokenExpired`, strict base64url decode
- `bbj-vscode/src/extension.ts` — removed the fail-open `isTokenExpired` helper; `getEMCredentials` now imports and calls `isEmTokenExpired`
- `bbj-vscode/test/em-token-validity.test.ts` — 17 tests covering every classification shape
- `bbj-vscode/test/em-token-expiry-wiring.test.ts` — activation-driven proof of the delete-and-reprompt flow via a real `activate()` call and the registered `bbj.runBUI` handler

## Decisions Made

- Built the complete `JwtValidity.check` port (strict decode + safe-integer overflow guard) in Task 1's tracer slice rather than deferring any of it to Task 2, per the plan's own task description.
- Task 2's 17-row test suite passed against Task 1's implementation with no code changes; committed as a `test(...)`-only commit documenting that outcome rather than manufacturing an unnecessary `feat(...)` commit.
- Used a literal, hand-picked byte sequence for the "standard alphabet instead of base64url" test rather than deriving one from JSON text, since short ASCII JSON payloads rarely produce a `+`/`/` character when base64-encoded.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<behavior>` rows and `<acceptance_criteria>` were verified directly (grep counts and the full test suite) before each commit.

## TDD Gate Compliance

Task 2 (`tdd="true"`) followed the RED-first process: the 17 JwtValidityTest-mirroring rows were added to `test/em-token-validity.test.ts` and run against Task 1's already-committed `classifyEmToken` before writing any new implementation code. All 17 passed immediately, with zero required changes to `em-token-validity.ts`. This is not a "feature already exists, investigate" violation of the fail-fast rule — Task 1's own action steps explicitly specified the complete rule set (strict base64url decode and the `Number.isSafeInteger` overflow check) as part of the tracer slice, so Task 2's job was exhaustive verification of an already-complete port, not incremental feature work. No GREEN (`feat`) commit was produced because no implementation change was needed; the RED commit (`65d35598`) is a `test(...)` commit standing alone. `git log --oneline --grep="^feat(112-02)"` finds Task 1's commit; there is no `feat(112-02)` commit after the `test(112-02)` commit, which is the expected shape here rather than a gate violation.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- `em-token-validity.ts` is a complete, tested, import-free module; `extension.ts` calls it with the required `Math.floor(Date.now() / 1000)` clock argument.
- Whole-suite regression check after this plan: 3154 total, 11 failed (all pre-existing `linking.test.ts` interop drift while BBjServices is up on :5008, matching the documented local baseline — no `issue447` failure, no new regressions), 3045 passed, 98 pending.
- `bbj-intellij/` is untouched, as required — IntelliJ's `JwtValidity`/`BbjEMTokenStore` already implement the same rule set and needed no change (D-10).
- Ready for 112-03 (remembered EM username, `bbj.loginEM` prefill) and 112-04 (`Commands.cjs` test harness), which touch different files in `extension.ts`/`Commands.cjs` and do not depend on this plan's module.
- ROADMAP criterion 5 (the hand UAT covering login failure, EM-step failure, and successful BUI/DWC launches in both IDEs, plus a real expired-token re-login) stays open until all Phase 112 plans are built and both extensions are rebuilt from the final tree.

## Self-Check: PASSED

- `bbj-vscode/src/em-token-validity.ts` exists and contains `export function isEmTokenExpired` — FOUND
- `bbj-vscode/test/em-token-validity.test.ts` exists and contains 17 `test(` blocks — FOUND
- `bbj-vscode/test/em-token-expiry-wiring.test.ts` exists and exercises `activate()` and `bbj.runBUI` — FOUND
- Commit `10a862bb` — FOUND in `git log --oneline --all`
- Commit `65d35598` — FOUND in `git log --oneline --all`
- All `<acceptance_criteria>` from both tasks re-verified via grep counts immediately before this Summary was written: all passed
- Plan-level `<verification>` re-run: `em-token-validity.test.ts`, `em-token-expiry-wiring.test.ts`, `extension-activation.test.ts` — 21 passed (13 for the first re-run plus the extra 8 rows added by Task 2, 21 total after Task 2); `npx tsc -p tsconfig.json` and eslint on all four touched files — clean; whole-suite run — 3154 total, 11 failed (all pre-existing `linking.test.ts` interop drift), 3045 passed, 98 pending
- No planning identifiers found in the source/test diff (`10a862bb~1..65d35598`, checked with the project's register-check pattern)
- `bbj-intellij/` confirmed unchanged in the diff

---
*Phase: 112-em-login-web-launch-fail-closed*
*Completed: 2026-09-27*
