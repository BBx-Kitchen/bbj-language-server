---
phase: 112-em-login-web-launch-fail-closed
fixed_at: 2026-09-27T08:55:02Z
review_path: .planning/phases/112-em-login-web-launch-fail-closed/112-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 112: Code Review Fix Report

**Fixed at:** 2026-09-27T08:55:02Z
**Source review:** .planning/phases/112-em-login-web-launch-fail-closed/112-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (CR-01, WR-01, WR-02; IN-01 is Info and out of scope for `fix_scope: critical_warning`)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: VS Code's EM login stores and reports success for a token it never validates

**Files modified:** `bbj-vscode/src/extension.ts`, `bbj-vscode/test/em-login-username.test.ts`
**Commit:** d82dd8d8
**Applied fix:** Added the token-validity gate to the `bbj.loginEM` command handler between the
`ERROR:` check and `context.secrets.store`, calling `isEmTokenExpired(output, Math.floor(Date.now()
/ 1000))` (already imported for `getEMCredentials()`) and throwing `'Enterprise Manager returned an
unusable token'` — never the token itself — when it fails, mirroring
`BbjEMLoginAction.java:184-190`'s `JwtValidity.check(...) != VALID` guard. Updated the "successful
login" test to use a real unexpired JWT-shaped token (matching the helper pattern already used in
`em-token-validity.test.ts` / `em-token-expiry-wiring.test.ts`) instead of the arbitrary
`'the-em-token'` string, and added a new test asserting a malformed/expired token is neither stored
via `context.secrets.store` nor remembered via the username-memory store, and that the resulting
error message never contains the token text.

### WR-01: `openEnterpriseManager` can now throw an uncaught exception, and silently opens a broken URL on partial config

**Files modified:** `bbj-vscode/src/Commands/Commands.cjs`, `bbj-vscode/test/commands-cjs-execution.test.ts`
**Commit:** 0fa189e6
**Applied fix:** Wrapped the `PropertiesReader({ sourceFile: ... })` call in `try`/`catch`, reporting
failures through `vscode.window.showErrorMessage` (matching the pattern `getBBjHome()` already uses
two lines above) instead of letting the synchronous `fs.readFileSync` ENOENT propagate as an
unhandled command error. Added an explicit `com.basis.jetty.host`/`com.basis.jetty.port` presence
check before building the URL, reporting a diagnosable error instead of opening
`http://null:null/bbjem/em`. Added two new tests in the existing `openEnterpriseManager` describe
block: one for a missing `BBj.properties` file, one for a properties file present but missing the
host/port keys — both asserting no URL is opened and an error is shown.

### WR-02: `commands-cjs-harness.ts`'s `registerHooks` shim is a process-wide, never-unregistered side effect

**Files modified:** `bbj-vscode/test/commands-cjs-harness.ts`
**Commit:** 43fa6a78
**Applied fix:** Added a `commandsTreeUrls` set tracking every module URL reachable from
`Commands.cjs`'s own require tree, seeded with `Commands.cjs`'s own file URL in `loadCommands()`
before hook registration. The resolve hook now only exercises the extensionless/`.js`→`.ts` fallback
branch when the requesting module (`context.parentURL`) is already in that set, and every URL a
resolution succeeds to (via the fallback or Node's own default resolution) is added to the set too —
so the fallback follows `Commands.cjs`'s actual dependency graph (verified through
`config-path-cache.ts` → `config-path-trust.ts` / `resolved-config-path-request.ts`, several `.ts`
files deep) without ever firing for an unrelated relative import elsewhere in the same worker
process. The `vscode` and `./process-runner` shims remain intentionally global matches, as before.
Documented at the `registerHooks` call site in `loadCommands()` that the hooks remain permanent and
process-wide for the rest of the worker's life regardless of this scoping.

## Skipped Issues

None — all in-scope findings were fixed.

## Verification

All commands run inside the isolated review-fix worktree
(`.claude/worktrees/rf-112-*` on branch `gsd-reviewfix/112-*`, fast-forwarded onto
`gsd/v4.7-audit-hygiene-burndown` and removed after this report was written), from
`bbj-vscode/` unless noted:

- `npx vitest run test/em-login-username.test.ts test/em-token-expiry-wiring.test.ts test/em-token-validity.test.ts test/web-bbj-source-guard.test.ts test/no-shell-command-construction.test.ts test/config-path-consumers.test.ts test/commands-cjs-execution.test.ts test/em-properties-reader-guard.test.ts --maxWorkers=2` → 8 files, 118 tests, all passed (run after all three commits, so the worker-sharing scenario WR-02 targets is exercised for real).
- `npx tsc --noEmit -p .` → no output, no errors, run after each of the three fixes.
- `node -c src/Commands/Commands.cjs` → syntax OK.

`node_modules` and `src/language/generated` do not exist in a fresh `git worktree` (not tracked in
git); they were symlinked from the main checkout for the duration of this run only, to let vitest/tsc
resolve real dependencies, and removed before handing back — no source or lockfile changes resulted
from this.

CR-01's fix is a straightforward guard-clause port of an already-existing, already-tested function
(`isEmTokenExpired`) with a well-covered call site pattern (`getEMCredentials()`); it is not flagged
as requiring additional human logic verification beyond the passing tests above.

---

_Fixed: 2026-09-27T08:55:02Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
