---
phase: 112-em-login-web-launch-fail-closed
plan: 03
subsystem: em-integration
tags: [vscode, intellij, em-login, globalState, propertiescomponent, tdd]

requires:
  - phase: 112
    provides: "112-02's extension.ts EM token expiry rewiring (independent surface, no direct dependency)"
provides:
  - "src/em-username-memory.ts exporting EM_LAST_USERNAME_KEY, DEFAULT_EM_USERNAME, EmUsernameStore, initialEmUsername, rememberEmUsername"
  - "extension.ts bbj.loginEM pre-fills from context.globalState and remembers the username only after the token is stored"
  - "test/em-login-username.test.ts: unit tests for the seam plus activation-driven bbj.loginEM handler tests"
  - "IntelliJ EmUsernameMemory.java: platform-free Supplier/Consumer seam over initialUsername()/remember(String)"
  - "BbjEMLoginAction wired to an application-level PropertiesComponent value (com.basis.bbj.intellij.emLastUsername)"
  - "EmUsernameMemoryTest.java and EmLoginUsernameMemorySourceGuardTest.java"
affects: [phase-114-lint-type-check-test-suite-gates]

actuals:
  tokens: 8037
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Plain, import-free src/ seam over a Memento-shaped store (VS Code) mirrored by a platform-free Supplier/Consumer seam over PropertiesComponent (IntelliJ), same shape as BackendNoticePolicy"

key-files:
  created:
    - bbj-vscode/src/em-username-memory.ts
    - bbj-vscode/test/em-login-username.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmUsernameMemory.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmUsernameMemoryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginUsernameMemorySourceGuardTest.java
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

key-decisions:
  - "Task 1 (the tracer) built the complete VS Code seam plus both call sites (pre-fill and remember-after-store) in one slice, proven through the real bbj.loginEM handler rather than a mocked helper"
  - "Task 2's RED phase was verified by physically reverting the two production Java files (a temporary file move plus a git checkout of the tracked file) and confirming the new tests fail to compile, then restoring the implementation for GREEN -- a genuine RED signal rather than an after-the-fact narrative, since both files existed by the time the test files were authored"
  - "Key names follow the existing dotted-namespace convention on each host: bbj.em.lastUsername beside bbj.em.token/bbj.em.credentials in VS Code, com.basis.bbj.intellij.emLastUsername beside BbjEMTokenStore's emTokenBackendWarned in IntelliJ"

requirements-completed: [SEC-12]

coverage:
  - id: D1
    description: "VS Code's bbj.loginEM username prompt pre-fills the last successfully used EM username from context.globalState, or admin when none is remembered or the stored value is not a non-blank string"
    requirement: SEC-12
    verification:
      - kind: unit
        ref: "test/em-login-username.test.ts#em-username-memory (unit)"
        status: pass
      - kind: unit
        ref: "test/em-login-username.test.ts#bbj.loginEM username pre-fill (activation-driven) — pre-fills admin when nothing has been remembered / pre-fills the remembered username"
        status: pass
    human_judgment: false
  - id: D2
    description: "VS Code remembers the username only after the token is stored (store then update, in that order), and never with a password or token; a failed or cancelled login remembers nothing"
    requirement: SEC-12
    verification:
      - kind: unit
        ref: "test/em-login-username.test.ts#bbj.loginEM username pre-fill (activation-driven) — a successful login stores the token then remembers the username, in that order / a failed login shows an error and remembers nothing / cancelling the username prompt calls neither runProcess nor the username memory"
        status: pass
    human_judgment: false
  - id: D3
    description: "IntelliJ's Login to Enterprise Manager username prompt pre-fills the last successfully used EM username from an application-level PropertiesComponent value, or admin when none is remembered, and remembers only after BbjEMTokenStore.storeToken succeeds"
    requirement: SEC-12
    verification:
      - kind: unit
        ref: "EmUsernameMemoryTest.java"
        status: pass
      - kind: unit
        ref: "EmLoginUsernameMemorySourceGuardTest.java"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real IDE session pre-fills the last successful EM username in both hosts, falls back to admin for a fresh profile, and does not update the pre-fill after a failed login with a different name"
    verification: []
    human_judgment: true
    rationale: "Requires a live VS Code extension host, a live IntelliJ session and a live Enterprise Manager; recorded as the plan's own human-check, deferred to the end-of-phase UAT alongside 112-01/112-02/112-04's human-check items."

duration: 16min
completed: 2026-09-27
status: complete
---

# Phase 112 Plan 03: EM Login & Web Launch Fail Closed — EM Login Username Memory Summary

**Both IDE login prompts now pre-fill the last EM username that logged in successfully (else `admin`), remembered in `context.globalState` (VS Code) and an application-level `PropertiesComponent` value (IntelliJ) only after the token is stored, never a password or token.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-27T07:45:19Z
- **Completed:** 2026-09-27T08:01:48Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `src/em-username-memory.ts` is a plain, import-free seam (`EM_LAST_USERNAME_KEY`, `DEFAULT_EM_USERNAME`, `EmUsernameStore`, `initialEmUsername`, `rememberEmUsername`) exercised directly by an in-memory store double
- `extension.ts`'s `bbj.loginEM` handler pre-fills the `EM Username` input box from `initialEmUsername(context.globalState)` instead of a hard-coded `"admin"`, and calls `rememberEmUsername(context.globalState, username)` directly after the token is stored and before the success message, inside the same `try` so a failed login never reaches it
- An activation-driven test suite drives the real `bbj.loginEM` handler through `activate()`: pre-fill for an empty store and a remembered store, a successful login storing the token then the username (asserted via `invocationCallOrder`), a failed login (`ERROR:` output) showing the error and remembering nothing, and a cancelled username prompt calling neither `runProcess` nor the username memory — plus an assertion that no `globalState.update` argument ever equals the password or the token
- IntelliJ's `EmUsernameMemory.java` mirrors the same seam shape as `BackendNoticePolicy` (a `Supplier<String>`/`Consumer<String>` pair, no `com.intellij` import); `BbjEMLoginAction` wires it over `PropertiesComponent.getInstance()` keyed `com.basis.bbj.intellij.emLastUsername`, pre-fills `promptUsername()`'s dialog from `initialUsername()`, and calls `remember(username)` directly after `BbjEMTokenStore.storeToken(stdout)` and before the success dialog
- `EmUsernameMemoryTest.java` (8 tests) and `EmLoginUsernameMemorySourceGuardTest.java` (7 tests) pass, alongside the four pre-existing IntelliJ source guards (`EmLoginTempFileCleanupSourceGuardTest`, `EmTokenFailClosedSourceGuardTest`, `EmLoginEnablementSourceGuardTest`, `OffEdtDispatchSourceGuardTest`), all unchanged
- SEC-12 (amended) is now fully delivered across all three of its declaring plans: `web.bbj`'s fail-closed rewrite (112-01), `Commands.cjs`'s legacy-fallback removal (112-04), and this plan's IDE-side username pre-fill

## Task Commits

Each task was committed atomically (Task 2 carried `tdd="true"` with a real RED-then-GREEN split):

1. **Task 1 (tracer): VS Code's EM login prompt offers the last successfully used username, end to end** — `81f95000` (feat)
2. **Task 2 RED: failing tests for the IntelliJ EM username memory** — `606b003e` (test)
2. **Task 2 GREEN: IntelliJ EM login prompt pre-fill wired to PropertiesComponent** — `2168e73d` (feat)

_No plan-metadata commit follows — see the final commit below covering SUMMARY.md/STATE.md/ROADMAP.md/REQUIREMENTS.md together._

## Files Created/Modified

- `bbj-vscode/src/em-username-memory.ts` — new plain module: `EM_LAST_USERNAME_KEY`, `DEFAULT_EM_USERNAME`, `EmUsernameStore`, `initialEmUsername`, `rememberEmUsername`
- `bbj-vscode/src/extension.ts` — `bbj.loginEM` pre-fill and remember-after-store, one new import line
- `bbj-vscode/test/em-login-username.test.ts` — unit tests for the seam plus activation-driven handler tests
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmUsernameMemory.java` — new platform-free seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` — `LAST_USERNAME_KEY`, `USERNAME_MEMORY`, `promptUsername` pre-fill, `performLogin` remember call
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmUsernameMemoryTest.java` — behavioural coverage of the seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginUsernameMemorySourceGuardTest.java` — source guard for the IntelliJ wiring

## Decisions Made

- Verified Task 2's RED phase for real: moved `EmUsernameMemory.java` aside and `git checkout`-ed `BbjEMLoginAction.java` back to its pre-edit state, ran the two new test classes and confirmed a compile failure (`cannot find symbol: class EmUsernameMemory`), then restored both files and re-ran to confirm all 15 new tests plus the four pre-existing guards pass.
- Followed the existing dotted-namespace key convention on each host rather than inventing a new one: `bbj.em.lastUsername` (VS Code, beside `bbj.em.token`) and `com.basis.bbj.intellij.emLastUsername` (IntelliJ, beside `BbjEMTokenStore`'s `emTokenBackendWarned`).

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<behavior>` rows and `<acceptance_criteria>` were verified directly (grep counts and full test runs) before each commit.

## TDD Gate Compliance

Task 2 (`tdd="true"`) followed the RED-then-GREEN process exactly, with a physically verified RED failure rather than a narrative one: `606b003e` (`test(112-03)`) added `EmUsernameMemoryTest.java` and `EmLoginUsernameMemorySourceGuardTest.java` against a temporarily-reverted `BbjEMLoginAction.java` and a temporarily-removed `EmUsernameMemory.java`, confirmed to fail to compile (`cannot find symbol: class EmUsernameMemory`); `2168e73d` (`feat(112-03)`) restored `EmUsernameMemory.java` and reapplied the `BbjEMLoginAction.java` wiring, turning all 15 new tests green alongside the four pre-existing source guards (`git log --oneline --grep="^test(112-03)"` finds the RED commit before `git log --oneline --grep="^feat(112-03)"`'s Task 2 entry).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- SEC-12 (amended) is complete: all three declaring plans (112-01, 112-04, 112-03) have landed.
- Whole-suite regression after this plan: vitest 3186 total, 11 failed (all pre-existing `linking.test.ts` interop drift while BBjServices is up on :5008, matching the documented local baseline — no `issue447` failure, no new regressions), 3090 passed, 85 pending; IntelliJ whole suite (`./gradlew test --rerun-tasks`, bbj-vscode built first) — 1152 tests, 0 failures, 0 errors.
- `npx tsc -p tsconfig.json` and eslint on all touched VS Code files are clean.
- This plan's own human-check (D4 above) and ROADMAP criterion 5 (the full hand UAT across every Phase 112 plan) stay open until both extensions are rebuilt from the final tree, per the phase's own deferred human-check convention.
- Phase 112 now has all four plans (112-01..04) landed; ready for the phase-level end-of-phase verification and human UAT.

## Self-Check: PASSED

- `bbj-vscode/src/em-username-memory.ts` exists and contains `export function initialEmUsername` — FOUND
- `bbj-vscode/test/em-login-username.test.ts` exists and contains both the unit and activation-driven describe blocks — FOUND
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmUsernameMemory.java` exists and contains `public String initialUsername()` — FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmUsernameMemoryTest.java` exists (8 tests) — FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginUsernameMemorySourceGuardTest.java` exists (7 tests) — FOUND
- Commit `81f95000` — FOUND in `git log --oneline --all`
- Commit `606b003e` — FOUND in `git log --oneline --all`
- Commit `2168e73d` — FOUND in `git log --oneline --all`
- All `<acceptance_criteria>` from both tasks re-verified via grep counts and full test runs immediately before this Summary was written: all passed
- Plan-level `<verification>` re-run: `em-login-username.test.ts`, `extension-activation.test.ts`, `em-token-expiry-wiring.test.ts` — 21 passed; `npx tsc -p tsconfig.json` and eslint on the touched files — clean; the six named IntelliJ test classes — 15 new + 0 pre-existing failures; IntelliJ whole suite (`--rerun-tasks`) — 1152 passed, 0 failed; whole vitest suite (`--maxWorkers=2`) — 3186 total, 11 failed (all pre-existing `linking.test.ts` interop drift), 3090 passed, 85 pending
- No planning identifiers found in the source/test diff (`8a6f6e7c..2168e73d`, checked with the project's register-check pattern, and in the three commit messages)
- No GitHub closing keywords found in the diff or commit messages

---
*Phase: 112-em-login-web-launch-fail-closed*
*Completed: 2026-09-27*
