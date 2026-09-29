---
phase: 112-em-login-web-launch-fail-closed
reviewed: 2026-09-27T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmUsernameMemory.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginUsernameMemorySourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmUsernameMemoryTest.java
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/em-token-validity.ts
  - bbj-vscode/src/em-username-memory.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/test/commands-cjs-execution.test.ts
  - bbj-vscode/test/commands-cjs-harness.ts
  - bbj-vscode/test/config-path-consumers.test.ts
  - bbj-vscode/test/em-login-username.test.ts
  - bbj-vscode/test/em-properties-reader-guard.test.ts
  - bbj-vscode/test/em-token-expiry-wiring.test.ts
  - bbj-vscode/test/em-token-validity.test.ts
  - bbj-vscode/test/no-shell-command-construction.test.ts
  - bbj-vscode/test/web-bbj-source-guard.test.ts
  - bbj-vscode/tools/web.bbj
  - bbj-vscode/vitest.config.ts
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 112: Code Review Report

**Reviewed:** 2026-09-27
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the phase 112 diff against `4147fe01..HEAD`: the `web.bbj` fail-closed rewrite
(SEC-13/D-01..D-06), `em-token-validity.ts` (SEC-14/D-09..D-11), the EM username-memory seam
on both hosts (SEC-12/D-08), and the `Commands.cjs` vitest harness (TEST-09/D-12..D-15).

The `web.bbj` rewrite is careful and well-covered by `web-bbj-source-guard.test.ts`: every D-03
call site carries its own `err=` label into a single shared reporter, `login_failed` now exits
non-zero, and no MSGBOX or `failedStep$` value can carry a credential. `em-token-validity.ts` is a
faithful, well-tested port of `JwtValidity.check`, including the JS-specific `split()`
trailing-empty-segment trap the phase's own research flagged. The username-memory seam
(`em-username-memory.ts` / `EmUsernameMemory.java`) is symmetric across both hosts and its own
tests (unit + activation-driven + source-guard) genuinely exercise the "remember only after the
token is stored, never a password/token" invariant.

The one real correctness gap is that VS Code's `bbj.loginEM` handler never applies the new
`isEmTokenExpired`/`classifyEmToken` check to the token `em-login.bbj` returns before storing it
and reporting "Successfully logged in" — the exact bug IntelliJ's `BbjEMLoginAction` already closed
(the `JwtValidity.check(...) != VALID` guard at `BbjEMLoginAction.java:184-190`, unchanged by this
phase, pre-dating it). See CR-01. Two further issues are lower-severity robustness/quality gaps in
the `Commands.cjs` fix and the new test harness (WR-01, WR-02), plus one unverified detail in
`web.bbj`'s new error text worth confirming in the phase's already-deferred human UAT (IN-01).

## Critical Issues

### CR-01: VS Code's EM login stores and reports success for a token it never validates

**File:** `bbj-vscode/src/extension.ts:769-776`
**Issue:** The `bbj.loginEM` handler only checks `output.startsWith('ERROR:')` before storing the
token:
```ts
if (output.startsWith('ERROR:')) {
    throw new Error(output.substring(6));
}

// Store token in SecretStorage
await context.secrets.store('bbj.em.token', output);
await rememberEmUsername(context.globalState, username);
vscode.window.showInformationMessage('Successfully logged in to Enterprise Manager');
```
It never runs the token through `classifyEmToken`/`isEmTokenExpired` (both added in this same
diff, in `bbj-vscode/src/em-token-validity.ts`, and already used by `getEMCredentials()` at
`extension.ts:414-432`) before storing it. A malformed or already-expired token — any shape that
does not start with `ERROR:` but also does not decode as an unexpired JWT — is stored as-is, the
user is told "Successfully logged in to Enterprise Manager", and the failure only surfaces
silently on the *next* `Run BUI`/`Run DWC` attempt, when `getEMCredentials()` deletes the token and
re-prompts for login.

This is exactly the defect IntelliJ's `BbjEMLoginAction.performLogin` already fixed (issue #535,
pre-dating this phase, unchanged by it):
```java
// BbjEMLoginAction.java:184-190
if (JwtValidity.check(stdout, System.currentTimeMillis() / 1000) != JwtValidity.Result.VALID) {
    showErrorOnEdt(
        "Enterprise Manager returned an unusable token",
        "EM Login Failed"
    );
    return false;
}
```
Phase 112's own decisions (D-09..D-11) explicitly ported `JwtValidity.check` to VS Code and wired
it into `getEMCredentials()`, but not into the login handler itself, leaving VS Code's login flow
with the exact "reports success, fails silently and confusingly on next use" bug the Java side no
longer has. `test/em-login-username.test.ts`'s "a successful login stores the token then remembers
the username" test uses an arbitrary non-JWT string (`'the-em-token'`) as the "successful" token
and asserts no gate on it, confirming the gap is real, not just theoretical.
**Fix:** Mirror the IntelliJ guard: after the `ERROR:` check and before `context.secrets.store`,
reject a token that isn't positively valid, without ever including it or any password in the
message:
```ts
if (isEmTokenExpired(output, Math.floor(Date.now() / 1000))) {
    throw new Error('Enterprise Manager returned an unusable token');
}
await context.secrets.store('bbj.em.token', output);
```

## Warnings

### WR-01: `openEnterpriseManager` can now throw an uncaught exception, and silently opens a broken URL on partial config

**File:** `bbj-vscode/src/Commands/Commands.cjs:282-299`
**Issue:** This diff fixes `openEnterpriseManager`'s `PropertiesReader` call from a bare path
string to `{ sourceFile: ... }`, so the file is now actually read (see the Deviations note in
112-04-SUMMARY.md — this was previously silently broken and never threw). `PropertiesReader`'s
`append()` calls `fs.readFileSync(sourceFile, encoding)` synchronously when `sourceFile` is
truthy, so a `bbj.home` that is set but whose `cfg/BBj.properties` does not exist (partial
install, wrong path, case-mismatched path on a case-sensitive filesystem) now throws synchronously
inside `openEnterpriseManager()`, with no `try`/`catch` anywhere in the function — this propagates
out of the VS Code command handler as an unhandled command error instead of the extension's usual
`showErrorMessage` pattern (used by `getBBjHome()` two lines above for the same "not configured"
class of problem). Separately, if the file exists but lacks `com.basis.jetty.host`/`.port`,
`properties.get(...)` returns `null`, and the code builds and opens `http://null:null/bbjem/em`
with no validation — a silently broken URL rather than a diagnosable error.
**Fix:** Wrap the read in a `try`/`catch` and validate the two properties before building the URL:
```js
openEnterpriseManager() {
  const home = getBBjHome();
  if (!home) return;
  try {
    const properties = PropertiesReader({ sourceFile: `${home}/cfg/BBj.properties` });
    const host = properties.get('com.basis.jetty.host');
    const port = properties.get('com.basis.jetty.port');
    if (!host || !port) {
      vscode.window.showErrorMessage(`Could not read com.basis.jetty.host/port from ${home}/cfg/BBj.properties`);
      return;
    }
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://${host}:${port}/bbjem/em`));
  } catch (err) {
    vscode.window.showErrorMessage(`Could not open Enterprise Manager: ${err.message || err}`);
  }
},
```

### WR-02: `commands-cjs-harness.ts`'s `registerHooks` shim is a process-wide, never-unregistered side effect

**File:** `bbj-vscode/test/commands-cjs-harness.ts:213-229`
**Issue:** `loadCommands()` calls `registerHooks({ resolve, load })` once per worker
(`hooksRegistered` guards re-registration) and there is no matching deregistration. `node:module`'s
`registerHooks` resolve/load pair intercepts **every** subsequent `require()`/native ESM
resolution in that worker process for the rest of its life — not just calls made while loading
`Commands.cjs`. Under the project's own documented `--maxWorkers=2` whole-suite run, several
unrelated test files execute in the same worker process as this harness. Today nothing else in
`src/`/`test/` performs a native (non-`vi.mock`) `require('vscode')` or a relative import matching
the `.ts`-fallback branch by coincidence, so no collision has been observed — but that is incidental
to file execution order, not structurally guaranteed, and a future test file added to the same
worker that legitimately needs Node's *default* resolution behavior for an extensionless or
`.js`-suffixed relative specifier could be silently redirected to an unintended `.ts` file, or see
`vscode` shimmed when it did not ask for a shim.
**Fix:** At minimum, document the process-wide, permanent nature of this hook prominently at the
`registerHooks` call site (the current comment explains *why* the hooks are needed, not that they
are irreversible for the rest of the worker's life); consider scoping the resolve hook's `.ts`
fallback branch to specifiers under `Commands/`-relative paths only, rather than any relative
specifier anywhere in the process, to shrink the blast radius.

## Info

### IN-01: `web.bbj`'s new `(error N)` text uses a bare `err` reference, not the documented `ERR(...)` function call — unverified by any automated test

**File:** `bbj-vscode/tools/web.bbj:138`
**Issue:** `report_failure` builds `"... (error " + str(err) + ")"`. The only documented way to
read the most recent BBj error number found in this repo is the `ERR()` *function*
(`bbj-vscode/src/language/lib/functions.bbl:270-276`: `ERR(int{,int...})` /
`ERR(code: int): int`, "Returns the most recent error value..."), not a bare `err` identifier.
`web.bbj` never assigns to a variable named `err` anywhere in the file, so if BBj does not treat a
parenthesis-less `err` as an implicit call to the built-in (unlike, e.g., `ERRMES(-1)`, which is
called correctly with parens two tokens earlier on the same line), this always renders as
`(error 0)` — a numeric variable's default value — regardless of the real failure. The phase's own
research/plan record only a `bbjcpl -N` **syntax** check for this line (which cannot distinguish a
valid-but-wrong-value variable reference from a correct one) and note "ERR returns 252" from an
earlier live probe without showing the exact expression tested. This is plausible either way (BBj's
Business BASIC lineage does have bare system variables for exactly this purpose), and the
phase's own UAT hand-check (ROADMAP criterion 5 / D4) is already deferred and covers a real EM
failure end-to-end — but that check does not currently call out confirming the numeric error text
specifically.
**Fix:** During the already-deferred UAT, additionally confirm the MSGBOX for a real EM failure
(e.g. EM stopped) shows a plausible non-zero error number, not `(error 0)`. If it is `0`, change
`str(err)` to `str(ERR(0))` (or whatever call form the live interpreter accepts).

---

_Reviewed: 2026-09-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
