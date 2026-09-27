---
phase: 112-em-login-web-launch-fail-closed
plan: 01
subsystem: em-integration
tags: [bbj, web.bbj, em-login, fail-closed, source-guard, vitest]

requires:
  - phase: 111
    provides: java-interop hardening on the resolveClass path (unrelated surface, no direct dependency)
provides:
  - "web.bbj requires an explicit username in the username/password path; an empty username never reaches BBjAdminFactory"
  - "admin123 fires only for the exact lower-case user admin with an empty password"
  - "A shared report_failure reporter (MSGBOX + release 1) backs every guarded EM call and the login-rejection path"
  - "Every Enterprise Manager step after login (getRemoteConfiguration, the app lookup loop, createApplication, getConfigFileName, commit, getDwcUrl/getBuiUrl, browse) has its own err= label"
  - "web-bbj-source-guard.test.ts pins all of the above"
affects: [112-02, 112-03, 112-04, phase-114-lint-type-check-test-suite-gates]

actuals:
  tokens: 4415
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "BBj err=-label routing to one shared MSGBOX+non-zero-RELEASE reporter, one label per guarded call (mirrors em-login.bbj's authFailed: idiom)"

key-files:
  created:
    - bbj-vscode/test/web-bbj-source-guard.test.ts
  modified:
    - bbj-vscode/tools/web.bbj

key-decisions:
  - "admin123 default kept for exactly username! = \"admin\" (case-sensitive) with an empty password; every other missing/empty credential goes to login_failed with no EM call (D-05)"
  - "One shared report_failure reporter builds every non-login-rejection MSGBOX from failedStep$/ERRMES(-1)/err; login_failed never calls ERRMES so stale error text from an earlier err=*next read can't leak into it (D-06)"
  - "The DWC/BUI URL lookup's iff(isDWC!, ...) was replaced with a one-line IF/ELSE so each branch could carry its own err=failed_get_url guard"

requirements-completed: [SEC-12, SEC-13]

coverage:
  - id: D1
    description: "web.bbj never fills in a default username; an empty/missing username (no token) jumps to login_failed with no EM call"
    requirement: SEC-12
    verification:
      - kind: unit
        ref: "test/web-bbj-source-guard.test.ts#web-bbj-source-guard — credentials"
        status: pass
      - kind: other
        ref: "bbjcpl -N tools/web.bbj"
        status: pass
    human_judgment: false
  - id: D2
    description: "admin123 fires only for username! = \"admin\" (case-sensitive) with an empty password; any other user with an empty password is sent to EM as given"
    requirement: SEC-12
    verification:
      - kind: unit
        ref: "test/web-bbj-source-guard.test.ts#web-bbj-source-guard — credentials"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every guarded EM call after login (getRemoteConfiguration, the app lookup loop, createApplication, getConfigFileName, commit, getDwcUrl/getBuiUrl, browse) has its own err= label reporting through the shared reporter"
    requirement: SEC-13
    verification:
      - kind: unit
        ref: "test/web-bbj-source-guard.test.ts#web-bbj-source-guard — each Enterprise Manager step has its own error label"
        status: pass
      - kind: other
        ref: "bbjcpl -N tools/web.bbj"
        status: pass
    human_judgment: false
  - id: D4
    description: "No failure message contains username!, password! or token!; every failure path (login rejection and each EM step) ends on a non-zero exit code"
    requirement: SEC-13
    verification:
      - kind: unit
        ref: "test/web-bbj-source-guard.test.ts#web-bbj-source-guard — failure reporting"
        status: pass
    human_judgment: false
  - id: D5
    description: "A real login failure and a real EM step failure show the expected MSGBOX and exit code 1 in a running VS Code / IntelliJ session, in both BUI and DWC"
    verification: []
    human_judgment: true
    rationale: "Requires a live BBj process, a live Enterprise Manager, and both IDE hosts observing the exit code; recorded as ROADMAP criterion 5, deferred to the end-of-phase UAT per the plan's <human-check>."

duration: 14min
completed: 2026-09-27
status: complete
---

# Phase 112 Plan 01: EM Login & Web Launch Fail Closed — web.bbj Summary

**`tools/web.bbj` no longer fills in a default username, keeps `admin123` only for the exact user `admin` with an empty password, and every Enterprise Manager step after login (and the login itself) reports its own failure through one shared MSGBOX reporter that exits with code 1.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-27T06:44:11Z
- **Completed:** 2026-09-27T06:57:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- An empty or missing username in the username/password path (no token) jumps straight to `login_failed` with no `BBjAdminFactory` call, and no line in the file assigns a string literal to `username!` (issue #546)
- `admin123` is used only when `username! = "admin"` (case-sensitive) and `password! = ""`; any other user with an empty password is sent to Enterprise Manager exactly as given
- Both `getBBjAdmin` calls route a rejection through a shared `login_rejected` → `report_failure` path that shows `"Login Failed!: " + ERRMES(-1) + " (error " + err + ")"` and exits 1; the pre-existing `login_failed:` label (empty-credentials path) now also exits 1 instead of the old bare-`release` bug (exit 0)
- Every Enterprise Manager call after login — `getRemoteConfiguration`, the `getApplications` lookup loop (`iterator`/`hasNext`/`next`/`getString`), `createApplication`, `getConfigFileName`, `commit`, `getDwcUrl`/`getBuiUrl`, and `browse` — has its own `err=` label naming that step, all funneling into the same `report_failure` reporter (issue #548)
- `setString`/`setBoolean` calls stay unguarded, per the plan's scope
- `bbj-vscode/test/web-bbj-source-guard.test.ts` pins every behavior above as a source guard, since BBj cannot run in-process under Vitest

## Task Commits

Each task was committed atomically (Task 2 split into its own RED/GREEN pair since it carried `tdd="true"`):

1. **Task 1: No default username, admin123 only for admin, shared failure reporter** — `b0ac8a94` (fix)
2. **Task 2 RED: extend the source guard for per-step EM error labels** — `6b985d50` (test)
2. **Task 2 GREEN: guard every EM step with its own error label** — `03c8928c` (feat)

_No plan-metadata commit follows — see the final commit below covering SUMMARY.md/STATE.md/ROADMAP.md/REQUIREMENTS.md together._

## Files Created/Modified

- `bbj-vscode/tools/web.bbj` — fail-closed credential handling, `login_rejected`/`login_failed` and seven `failed_*` labels, shared `report_failure` reporter, `err=` guards on every EM call after login
- `bbj-vscode/test/web-bbj-source-guard.test.ts` — new source-guard test file (credentials, failure reporting, and per-step error-label describe blocks)

## Decisions Made

- Kept the single `admin`/empty-password → `admin123` convenience default per the user's D-05 ruling (matches a fresh BBj install's own default); every other credential gap fails closed with no EM call.
- One shared `report_failure` reporter (rather than one MSGBOX per guarded call) keeps the failure-reporting code in exactly one place, per D-04's explicit rejection of a `step!`-variable-driven catch-all (a call that forgot to set the variable would misreport).
- `login_failed` never calls `ERRMES` — an earlier `err=*next` read (e.g. the optional `ARGV(5)`/`ARGV(6)` reads) can leave stale error text behind, and D-06 requires the "nothing supplied" path to show `"Login Failed!"` alone.
- Replaced the `iff(isDWC!, app!.getDwcUrl(0), app!.getBuiUrl(0))` expression with a one-line `IF/ELSE` so each branch could carry its own `err=failed_get_url` guard (an `IFF()` expression call cannot carry `err=`).

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<behavior>` rows and `<acceptance_criteria>` were verified directly (grep counts, `bbjcpl -N` syntax gate, and the full `web-bbj-source-guard.test.ts` suite) before each commit.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None. ROADMAP criterion 5 (a live login failure and a live EM-step failure observed in a running VS Code / IntelliJ session) is intentionally deferred to the end-of-phase UAT, as directed by this task's `<human-check>` — this is documented behavior per the plan, not an unwired stub.

## Next Phase Readiness

- `web.bbj`'s fail-closed rewrite is complete and independently verified (source guard + `bbjcpl -N` + whole-suite regression check: 11 failures, all pre-existing `linking.test.ts` interop drift, no `issue447` failure this run, no new regressions).
- `bbj-intellij/`, `tools/em-login.bbj`, and `tools/em-validate-token.bbj` are untouched, as required — the IntelliJ plugin bundles `web.bbj` byte-identically and picks up this fix with no Java change.
- Ready for 112-02 (EM token expiry check port) and 112-03 (remembered EM username), which touch `extension.ts`/`BbjEMLoginAction.java` and do not depend on this plan's files.
- ROADMAP criterion 5 (the hand UAT: no credentials, wrong password, EM stopped/unreachable, and a good BUI/DWC launch in both IDEs) stays open until all phase 112 plans are built and both extensions are rebuilt from the final tree.

## Self-Check: PASSED

- `bbj-vscode/tools/web.bbj` exists and contains `report_failure:` — FOUND
- `bbj-vscode/test/web-bbj-source-guard.test.ts` exists and contains `failed_get_configuration` — FOUND
- Commit `b0ac8a94` — FOUND in `git log --oneline --all`
- Commit `6b985d50` — FOUND in `git log --oneline --all`
- Commit `03c8928c` — FOUND in `git log --oneline --all`
- All `<acceptance_criteria>` from both tasks re-verified via grep counts and `bbjcpl -N` immediately before this Summary was written: all passed
- Plan-level `<verification>` re-run: `web-bbj-source-guard.test.ts`, `em-secret-env-channel.test.ts`, `em-clientenv-guard.test.ts` — 69 passed, 1 skipped (unrelated Windows-only test); whole-suite run — 3133 total, 11 failed (all `linking.test.ts` interop drift, pre-existing), 3033 passed, 89 pending
- No planning identifiers found in the source/test diff (`b0ac8a94~1..03c8928c`, checked with the project's register-check pattern)
- `bbj-intellij/`, `tools/em-login.bbj`, `tools/em-validate-token.bbj` confirmed unchanged in the diff

---
*Phase: 112-em-login-web-launch-fail-closed*
*Completed: 2026-09-27*
