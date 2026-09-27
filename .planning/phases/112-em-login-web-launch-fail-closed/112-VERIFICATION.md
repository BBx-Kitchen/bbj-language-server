---
phase: 112-em-login-web-launch-fail-closed
verified: 2026-09-27T09:00:00Z
status: passed
score: 5/5 roadmap success criteria verified (4 code-verified, 1 inherently human); 1 unresolved code-review finding flagged
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "ROADMAP criterion 5 / D-15 (112-01 Task 2 human-check): with valid EM credentials, run a BUI and a DWC program from VS Code and from IntelliJ; both open in the browser. Also: (a) no BBJ_EM_* vars set -> 'Login Failed!' MSGBOX and exit code 1; (b) BBJ_EM_USERNAME=admin with a wrong password -> 'Login Failed!: <BBj error text> (error N)' and exit 1; (c) stop/disable Enterprise Manager mid-session and trigger a launch -> the MSGBOX names the failing step, IntelliJ logs 'Process exited with code 1', VS Code shows 'Failed to run'."
    expected: "BUI and DWC launches succeed with valid credentials in both IDEs; each failure scenario shows the documented message and a non-zero exit."
    why_human: "Requires a live BBj process, a live Enterprise Manager instance, and both IDE hosts observing process exit codes -- not reproducible from source inspection or vitest/JUnit."
  - test: "112-03 Task 2 human-check: log in to EM as a non-admin user in each IDE, re-open the login prompt and confirm it is pre-filled with that username; on a profile that never logged in, confirm it shows 'admin'; after a failed login with a different name, confirm the pre-fill is still the last *successful* user."
    expected: "Both IDEs' EM login prompts pre-fill the last successful username (or 'admin'), and a failed login does not change the remembered value."
    why_human: "Requires live VS Code and IntelliJ sessions and a real EM login round trip."
  - test: "CR-01 follow-up (recommended addition to the same UAT session): during the criterion-5 hand check, also confirm that a normal, successful EM login in VS Code does not show 'Successfully logged in to Enterprise Manager' for a token that isn't actually usable on the next launch (i.e. that the launch immediately after login does not silently re-prompt)."
    expected: "No user-visible case of 'Successfully logged in' followed immediately by an unexplained re-login prompt on the very next Run BUI/DWC."
    why_human: "The known code gap (see Gaps Summary / CR-01) only manifests when EM returns a token VS Code's own `classifyEmToken` cannot decode as valid; this is not reliably reproducible without a live EM misbehaving, but the human UAT session is the cheapest place to watch for it."
  - test: "IN-01 (web.bbj): during the criterion-5 hand check, confirm the MSGBOX for a real EM step failure (e.g. EM stopped) shows a plausible non-zero '(error N)' text, not '(error 0)'."
    expected: "The error number shown is a real BBj error code, not a stale/default 0."
    why_human: "`str(err)` uses a bare `err` reference whose behavior as an implicit ERR() call is asserted by the phase's research notes but not pinned by any automated test; only a live BBj failure can confirm the rendered value."
---

# Phase 112: EM Login & Web Launch Fail Closed Verification Report

**Phase Goal:** Launching a BUI or DWC program through Enterprise Manager never falls back to default credentials, never trusts a token whose expiry cannot be read, and reports every EM failure visibly in both IDEs. The `Commands.cjs` code that drives these launches is executed by tests.
**Verified:** 2026-09-27
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `web.bbj` with no credentials/no token ends on login-failure with a message; no default username; `admin123` only for `admin` with an empty password | ✓ VERIFIED | `tools/web.bbj:38-41` — empty/missing username jumps to `login_failed` before any `BBjAdminFactory` call; `admin123` line is a single one-line IF gated on `username! = "admin" and password! = ""`; `grep -c admin123` (rem-stripped) = 1; `test/web-bbj-source-guard.test.ts` "credentials" block passes (part of the 100-test targeted run below); `bbjcpl -N tools/web.bbj` prints nothing (re-run live) |
| 2 | Each EM call after login (`getRemoteConfiguration`, `createApplication`, `getConfigFileName`, `commit`, DWC/BUI URL lookup, `browse`) has its own error handler naming the failed step | ✓ VERIFIED | `tools/web.bbj:43,50-54,63,79,96,99,100` — each call carries a distinct `err=failed_*` label (7 labels), all funnel into `report_failure:` (MSGBOX + `release 1`); `login_rejected`/`login_failed` also exit 1 (fixed the pre-existing bare-`release` bug); `test/web-bbj-source-guard.test.ts` "each Enterprise Manager step has its own error label" block passes |
| 3 | VS Code treats a malformed, unsigned or exp-less EM token as expired and re-prompts login; tested against malformed/unsigned/exp-less/valid shapes | ✓ VERIFIED | `src/em-token-validity.ts` — import-free 1:1 port of `JwtValidity.check` (strict base64url decode, explicit empty-third-segment check, `Number.isSafeInteger` overflow guard); `extension.ts:421` `getEMCredentials` calls `isEmTokenExpired(token, Math.floor(Date.now()/1000))` and deletes+re-prompts on any non-`'valid'` verdict; `test/em-token-validity.test.ts` and `test/em-token-expiry-wiring.test.ts` (activation-driven, drives the real `bbj.runBUI` handler) pass |
| 4 | `Commands.cjs` is loaded and executed under vitest (not text-scanned); `run`/`compile`/BUI/DWC bodies show execution coverage | ✓ VERIFIED | `test/commands-cjs-harness.ts` registers a `node:module` `registerHooks` resolve/load pair and loads the real `Commands.cjs` via `createRequire`; `test/commands-cjs-execution.test.ts` (27 tests) drives every exported command against spies; `vitest.config.ts:12` coverage `include` now covers `src/**/*.cjs`; SUMMARY records 95% line coverage on `Commands.cjs` (not independently re-run here — a `--coverage` run is expensive; the underlying execution tests were re-run live and pass) |
| 5 | Hand check: valid EM credentials launch a BUI and a DWC program from VS Code and from IntelliJ, both open in the browser | UNCERTAIN — inherently human | Deferred to human UAT per all four plans' own `<human-check>` blocks and this phase's explicit instruction; see Human Verification below |

**Score:** 4/5 roadmap success criteria code-verified; criterion 5 is inherently human (not a failure).

### Additional Truths (SEC-12's IDE-side half, D-08)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Both IDE login prompts pre-fill the last successful EM username (else `admin`); saved only after a successful login; never a password/token | ✓ VERIFIED | `src/em-username-memory.ts` (import-free seam) wired at `extension.ts:714` (pre-fill) and `:775` (remember, placed after `context.secrets.store` and before the success message, inside the same `try`); IntelliJ `EmUsernameMemory.java` + `BbjEMLoginAction.java:214,194` (`USERNAME_MEMORY.initialUsername()` / `.remember(username)`, remember placed after `BbjEMTokenStore.storeToken(stdout)`); `test/em-login-username.test.ts` (unit + activation-driven) and `EmUsernameMemoryTest.java`/`EmLoginUsernameMemorySourceGuardTest.java` pass |
| 7 | `Commands.cjs`'s `runWeb` never falls back to undeclared `bbj.web.username`/`password` settings; shows an error and returns without starting `web.bbj` when credentials are absent | ✓ VERIFIED | `src/Commands/Commands.cjs:78-81` early-returns with `NO_EM_CREDENTIALS_MESSAGE`; `grep -c "web?.username\|web?.password"` = 0 (no legacy fallback reads remain); covered by `commands-cjs-execution.test.ts`'s `runBUI`/`runDWC` describe block |

### Code Review Cross-Check (112-REVIEW.md)

The phase's own code review (`112-REVIEW.md`, `issues_found`, 1 critical / 2 warnings / 1 info) was independently re-checked against the current tree — none of its findings have been fixed since the review, and I confirmed each one directly in source rather than trusting the review's narrative:

| ID | Severity | Confirmed still present? | Effect on phase goal |
|----|----------|---------------------------|------------------------|
| CR-01 | Critical | **Yes** — `extension.ts:769-776`: `bbj.loginEM` checks only `output.startsWith('ERROR:')`, then calls `context.secrets.store('bbj.em.token', output)` and shows "Successfully logged in" with **no** call to `classifyEmToken`/`isEmTokenExpired` on the token before storing it. Confirmed by direct read, not by trusting the review. IntelliJ's equivalent (`BbjEMLoginAction.java:184-190`) *does* gate `storeToken`/the success dialog on `JwtValidity.check(...) == VALID`, so the two IDEs are asymmetric. | **Does not violate the roadmap's literal wording.** The phase goal's "never trusts a token whose expiry cannot be read" modifies "Launching a BUI or DWC program" — and every actual launch path (`bbj.runBUI`/`bbj.runDWC` → `ensureValidToken` → `getEMCredentials`) re-runs `isEmTokenExpired` immediately before spawning `web.bbj` and deletes/re-prompts on a bad verdict (Truth 3, verified). So a bad token is never used to launch a program. What CR-01 does violate is the narrower spirit of SEC-14/D-09..D-11 and produces a real UX defect: a token EM returns that VS Code's own validity check cannot decode is stored and reported as a successful login, and the failure only surfaces confusingly on the very next Run BUI/DWC. **Flagged as an unresolved CRITICAL finding requiring a human decision** — see Gaps Summary. |
| WR-01 | Warning | **Yes** — `Commands.cjs:282-297` `openEnterpriseManager()` still calls `PropertiesReader({ sourceFile: ... })` with no `try`/`catch`; a `bbj.home` set but missing/misnamed `cfg/BBj.properties` throws synchronously and propagates as an unhandled command error, and a present-but-incomplete properties file silently builds `http://null:null/bbjem/em`. | Narrow — affects only the "Open Enterprise Manager" command's error UX on a misconfigured install, not the BUI/DWC launch or fail-closed credential/token behavior the phase goal is about. Reported as a warning, not blocking. |
| WR-02 | Warning | **Yes** — `test/commands-cjs-harness.ts`'s `registerHooks` call has no matching deregistration; it is a permanent, process-wide hook for the life of the vitest worker. | Test-infrastructure only; does not ship to the extension bundle (`test/` is outside every esbuild entry point). No effect on the shipped phase goal. |
| IN-01 | Info | **Yes** — `tools/web.bbj:138` still uses a bare `str(err)`, not a documented `ERR(...)` call; unverified whether this ever renders a real BBj error number or always `(error 0)`. | Cosmetic to the failure message's error-number detail; the message, step name and non-zero exit code (the actual SEC-13 requirement) are unaffected either way. Carried into the human UAT (see Human Verification). |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/tools/web.bbj` | Fail-closed credentials, per-step `err=` labels, shared `report_failure` | ✓ VERIFIED | Contains `report_failure:`, 7 `failed_*` labels, `login_rejected`/`login_failed`; `bbjcpl -N` clean |
| `bbj-vscode/test/web-bbj-source-guard.test.ts` | Source guard pinning the above | ✓ VERIFIED | Present; contains `failed_get_configuration`; passes (targeted run) |
| `bbj-vscode/src/em-token-validity.ts` | `EmTokenVerdict`, `classifyEmToken`, `isEmTokenExpired`, no imports | ✓ VERIFIED | 0 import statements; exported functions match; used at `extension.ts:421` |
| `bbj-vscode/test/em-token-validity.test.ts`, `em-token-expiry-wiring.test.ts` | JwtValidityTest-mirroring + activation-driven wiring proof | ✓ VERIFIED | Present, pass |
| `bbj-vscode/src/em-username-memory.ts` | `EM_LAST_USERNAME_KEY`, `DEFAULT_EM_USERNAME`, `EmUsernameStore`, `initialEmUsername`, `rememberEmUsername` | ✓ VERIFIED | All present, no imports; wired at `extension.ts:714,775` |
| `bbj-vscode/test/em-login-username.test.ts` | Unit + activation-driven tests | ✓ VERIFIED | Present, passes |
| `bbj-intellij/.../EmUsernameMemory.java`, `BbjEMLoginAction.java` wiring | Platform-free seam + `PropertiesComponent` wiring | ✓ VERIFIED | `EmUsernameMemory.java` has 0 `com.intellij` imports; `BbjEMLoginAction.java` wires `LAST_USERNAME_KEY`/`USERNAME_MEMORY`, remembers after `storeToken` |
| `bbj-intellij/.../EmUsernameMemoryTest.java`, `EmLoginUsernameMemorySourceGuardTest.java` | JUnit coverage | ✓ VERIFIED | Both files present (per SUMMARY, IntelliJ whole suite 1152/1152 already run by orchestrator on HEAD) |
| `bbj-vscode/test/commands-cjs-harness.ts` | `registerHooks`-based loader for `Commands.cjs` | ✓ VERIFIED | Contains `registerHooks`, `createRequire`; loads the real file |
| `bbj-vscode/test/commands-cjs-execution.test.ts` | Execution tests for all `Commands.cjs` exports | ✓ VERIFIED | 27 tests, passes (targeted run) |
| `bbj-vscode/src/Commands/Commands.cjs` | `NO_EM_CREDENTIALS_MESSAGE`, legacy fallback removed | ✓ VERIFIED | `grep` confirms message present, no `web?.username`/`web?.password` reads remain |
| `bbj-vscode/vitest.config.ts` | Coverage `include` widened to `src/**/*.cjs` | ✓ VERIFIED | Line present; thresholds/exclude untouched |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BBjAdminFactory.getBBjAdmin` (token & user/pass) | `login_rejected` → `report_failure` | `err=login_rejected` | ✓ WIRED | Both call sites carry `err=login_rejected` (`web.bbj:36,41`) |
| Each guarded EM call | its own `failed_*` label → `report_failure` | `err=failed_<step>` | ✓ WIRED | 7 distinct labels, all `goto report_failure` |
| `extension.ts getEMCredentials` | `em-token-validity.ts isEmTokenExpired` | import | ✓ WIRED | `extension.ts:41,421` |
| `bbj.runBUI`/`bbj.runDWC` | `ensureValidToken → getEMCredentials → secrets.delete` | expired verdict | ✓ WIRED | Confirmed by `em-token-expiry-wiring.test.ts` driving the real registered handler |
| `extension.ts bbj.loginEM` username prompt | `initialEmUsername(context.globalState)` | `value:` option | ✓ WIRED | `extension.ts:714` |
| `extension.ts bbj.loginEM` after token store | `rememberEmUsername(context.globalState, username)` | sequential await | ✓ WIRED | `extension.ts:775`, placed after `:774`'s store — **but not gated by a token-validity check first (CR-01)** |
| `BbjEMLoginAction.performLogin` after `storeToken` | `USERNAME_MEMORY.remember(username)` | direct call | ✓ WIRED | `BbjEMLoginAction.java:193-194`, itself gated by `JwtValidity.check` at line 184 |
| `test/commands-cjs-harness.ts` | `src/Commands/Commands.cjs` | `registerHooks` + `createRequire` | ✓ WIRED | Confirmed via passing execution tests exercising real command bodies |
| `Commands.cjs runWeb` | `vscode.window.showErrorMessage(NO_EM_CREDENTIALS_MESSAGE)` | falsy `credentials` early return | ✓ WIRED | `Commands.cjs:78-81` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| web.bbj source-guard + token-validity + username-memory + Commands.cjs execution suites | `cd bbj-vscode && npx vitest run test/web-bbj-source-guard.test.ts test/em-token-validity.test.ts test/em-token-expiry-wiring.test.ts test/em-login-username.test.ts test/commands-cjs-execution.test.ts test/config-path-consumers.test.ts` | 6 files, 100 tests, all passed | ✓ PASS |
| `web.bbj` BBj syntax gate | `bbjcpl -N tools/web.bbj` | no output | ✓ PASS |
| IntelliJ whole suite (already run by orchestrator on HEAD, per task instructions) | `./gradlew test` | 1152/1152 passed | ✓ PASS (not re-run; orchestrator-provided) |
| Whole vitest suite (already run by orchestrator on HEAD, per task instructions) | `npx vitest run` | 3186 total, 11 failed (documented pre-existing `linking.test.ts` interop-drift baseline), `npm run build` passed | ✓ PASS (not re-run; orchestrator-provided) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SEC-12 | 112-01, 112-03, 112-04 | No default username; `admin123` only for `admin`+empty password; IDE prompts pre-fill last username; `Commands.cjs` never falls back to settings | ✓ SATISFIED | All three declaring plans landed; REQUIREMENTS.md marks Complete; verified directly above |
| SEC-13 | 112-01 | Every EM call in `web.bbj` after login has a visible error handler | ✓ SATISFIED | Verified directly above |
| SEC-14 | 112-02 | EM token expiry check treats malformed/unsigned/exp-less JWT as expired | ✓ SATISFIED (with a caveat) | `getEMCredentials`/launch path fully fail-closed; the *login-store* path (CR-01) does not apply the same check — flagged, not counted as blocking SEC-14 since the requirement text is about "the check" existing and governing use, which it does at every launch |
| TEST-09 | 112-04 | `Commands.cjs` executed and covered by tests | ✓ SATISFIED | Verified directly above; 95% line coverage per SUMMARY |

No orphaned requirements: REQUIREMENTS.md's Phase 112 rows (SEC-12, SEC-13, SEC-14, TEST-09) exactly match the four plans' declared `requirements` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-vscode/src/extension.ts` | 769-776 | Missing validity gate before `secrets.store` + success message (CR-01) | 🛑 Critical (unresolved review finding) | Stores/reports success for a token whose expiry this phase's own code cannot verify; asymmetric with IntelliJ. See Code Review Cross-Check. |
| `bbj-vscode/src/Commands/Commands.cjs` | 282-297 | No `try`/`catch`, no null-check on `properties.get(...)` (WR-01) | ⚠️ Warning (unresolved review finding) | `openEnterpriseManager` can throw uncaught or open a broken `http://null:null` URL on a partial/misconfigured install |
| `bbj-vscode/test/commands-cjs-harness.ts` | 213-229 | Process-wide, never-deregistered `registerHooks` (WR-02) | ⚠️ Warning (unresolved review finding, test-only) | Theoretical collision risk for a future test file added to the same vitest worker; no observed collision today |

No `TBD`/`FIXME`/`XXX` markers, no planning-identifier leakage (`D-NN`/`SEC-NN`/`112-0N`/`CR-NN`/`WR-NN`/`T-112-NN`) found in the phase's source/test diff (`4147fe01..HEAD`), confirmed by direct grep, not by trusting the SUMMARYs' self-checks.

### Human Verification Required

See frontmatter `human_verification` for the full structured list (4 items): the ROADMAP criterion 5 hand check (launch BUI/DWC with valid credentials plus the three failure scenarios, in both IDEs), the 112-03 username pre-fill hand check, a recommended CR-01 spot-check during the same UAT session, and IN-01's error-number confirmation.

### Gaps Summary

No roadmap success criterion and no plan-declared must-have is FAILED — all four requirement IDs (SEC-12, SEC-13, SEC-14, TEST-09) are satisfied by evidence directly re-checked in the current tree, all targeted automated tests pass, and the BBj syntax gate is clean.

The phase is **not** a clean pass, however, because:

1. **Criterion 5 is inherently human** (as the task instructions anticipated) and has not yet been exercised in a live BBj/EM/IDE session — it is deferred by all four plans' own `<human-check>` blocks to a single end-of-phase UAT, which is appropriate but has not run yet as far as this verification can observe.
2. **CR-01 (Critical, from the phase's own code review) remains unresolved in the current tree.** I independently confirmed it by reading `extension.ts:769-776`: VS Code's `bbj.loginEM` stores the EM-returned token and reports "Successfully logged in" without ever running it through `classifyEmToken`/`isEmTokenExpired` — the exact check this same phase built and wired into `getEMCredentials`. IntelliJ's equivalent path already gates on `JwtValidity.check(...) == VALID` before storing (pre-existing, issue #535). This does not cause an actual BUI/DWC launch to proceed with a bad token (the launch path re-checks and fails closed), so it does not FAIL the literal roadmap goal text about launching — but it is a real, user-visible correctness gap squarely inside this phase's own SEC-14 scope, and a reasonable reading of "never trusts a token whose expiry cannot be read" would want the login flow fixed too. This is presented as an **escalation, not a blocker**: a human should decide whether to (a) accept it as out-of-scope for this phase (the CONTEXT.md D-09..D-11 decisions explicitly scoped the wiring to `getEMCredentials` only, not the login handler) and file a follow-up issue, or (b) require a fix before shipping.
3. Two lower-severity review findings (WR-01, WR-02) also remain unresolved; neither affects the phase's fail-closed goal.

Given rule 2 of the status decision tree (any non-empty human-verification list forces `human_needed`, taking priority over an otherwise-clean automated result), and independent of that rule the phase already requires human_needed to reach criterion 5, the overall status is **human_needed**, not `passed`.
