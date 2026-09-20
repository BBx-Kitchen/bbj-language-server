---
phase: 94-em-login-run-action-consolidation
reviewed: 2026-09-19T12:39:07Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjToolScriptResolver.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/EmTokenValidator.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjToolScriptResolverTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenValidatorTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 94: Code Review Report

**Reviewed:** 2026-09-19T12:39:07Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This is a re-review of phase 94 (EM-login/run-action consolidation): three duplicated tool-script
lookups were replaced with a shared `BbjToolScriptResolver`, EM token validation moved out of
`BbjRunActionBase` into a standalone `EmTokenValidator`, and `BbjEMLoginAction` gained an
`update()`/`getActionUpdateThread()` enablement gate. I read the diff against
`de99a1d74129d3f38ee622ea8a30338a8dd45871^` as well as the full current content of every listed
file, and re-derived my own judgement rather than deferring to the prior review.

**Prior-review fix verification:**

- **Fix `1032030b`** (creation-precedes-launch-try guard capable of failing,
  `EmLoginTempFileCleanupSourceGuardTest.java`): **confirmed correct.** The
  `theCreationPrecedesTheLaunchTry` test anchors its `try {` search with
  `body.lastIndexOf("try {", runProcessIndex)`, which — unlike an index chained off
  `creationIndex` — is genuinely capable of failing: it always resolves to the nearest `try {`
  at or before the subprocess run (the launch's own opening brace, `BbjEMLoginAction.java:133`),
  so a regression that merged the creation and launch blocks would push `creationIndex` past
  `launchTryIndex` and the assertion would fail. Traced against current
  `BbjEMLoginAction.java:124-198`: the owner-only temp file is created at line 128 (outside and
  before the launch `try` at line 133), the 15s subprocess run sits inside that `try` (line 151),
  and `Files.deleteIfExists(tmpFile)` sits in the enclosing `finally` (line 197) — matching
  `EmTokenValidator.runValidationScript`'s shape exactly.
- **Fix `dc240d10`** (guarded null `VirtualFile` parent in `buildWebRunCommandLine`,
  `BbjRunActionBase.java`): **confirmed correct and complete.**
  `BbjRunActionBase.java:358-363` now checks `file.getParent() == null` and returns `null` with
  a `logError` call before dereferencing it, closing the NPE that the pre-fix
  `file.getParent().getPath()` one-liner exposed for a file with no parent (e.g. a root-level
  virtual file). No other call site in the reviewed files dereferences `getParent()` without a
  null check.
- **Third item** (broad `catch (Exception ignored)` around `toRealPath()`,
  `BbjEMLoginAction.java`, previously classed Info): **still stands, unchanged.** See IN-02 below.

Beyond re-confirming those three, the consolidation itself is clean: `BbjToolScriptResolver` and
`EmTokenValidator` both reproduce their previous inline-method contracts exactly (null/exists
checks, fail-closed on any exception), the three security-critical invariants named in scope all
hold in the current tree (secrets travel only via `BbjProcessSecretEnv`'s environment map — see
`BbjSecretArgvSourceGuardTest`'s data-flow assertions, which resolve the actual
`withEnvironment(...)` argument rather than merely checking token ordering; owner-only temp files
are created before their launch `try` and deleted in an enclosing `finally` in both
`BbjEMLoginAction` and `EmTokenValidator`; the client-side expiry check at
`BbjRunActionBase.java:386` precedes the server-side trust-window check at line 394), and no
unused imports or dead branches were introduced by the refactor. One pre-existing but newly
significant defect surfaced during this pass (WR-01, below): the consolidation makes the two
tool-script-resolution failure modes for `em-validate-token.bbj` and for an invalid/expired token
share the exact same downstream code path, so a missing bundled script now presents to the user
as an unrecoverable login loop rather than a distinguishable installation error.

## Warnings

### WR-01: A missing `em-validate-token.bbj` in the plugin bundle is indistinguishable from an invalid token, and can loop the user through login forever

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:392-397`
**Issue:** `emValidatePath` is resolved via `BbjToolScriptResolver.SESSION.resolveToolScript("em-validate-token.bbj")` and, unlike the sibling `webBbjPath` resolution eleven lines above it (`BbjRunActionBase.java:338-342`, which shows a dedicated "web.bbj runner not found in plugin bundle" error and aborts), a `null` result here is *not* checked directly. It falls straight into `EmTokenValidator.SESSION.validateTokenTrusted(bbjPath, emValidatePath, token)`, whose callee `validateTokenServerSide` (`EmTokenValidator.java:59-62`) fails closed on a null `scriptPath` and returns `false` — exactly the same return value produced by a genuinely invalid or expired token. `BbjRunActionBase.java:395-397` then unconditionally deletes the (possibly perfectly valid) stored token and re-prompts the user to log in again (`buildWebRunCommandLine`'s re-prompt block, lines 400-416). Because `em-login.bbj` (a different, independently-resolved script) is what `performLogin` actually runs, a fresh login can succeed and mint a new token — which then fails the very same broken `em-validate-token.bbj` check on the next run, indefinitely. The user sees a repeating "EM token expired or invalid. Login again?" dialog with no way to discover that the real problem is a broken/incomplete plugin installation.
**Fix:** Check `emValidatePath == null` explicitly before calling `validateTokenTrusted`, the same way `webBbjPath == null` is already handled, and report it distinctly rather than folding it into the token-invalid path:
```java
String emValidatePath = BbjToolScriptResolver.SESSION.resolveToolScript("em-validate-token.bbj");
if (emValidatePath == null) {
    logError(project, "em-validate-token.bbj not found in plugin bundle");
    return null;
}
if (token != null && !EmTokenValidator.SESSION.validateTokenTrusted(bbjPath, emValidatePath, token)) {
    BbjEMTokenStore.deleteToken();
    token = null;
}
```

## Info

### IN-01: `ProcessOutput` from the EM login launch is captured but never inspected

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:150-151`
**Issue:** `ProcessOutput output = handler.runProcess(15000);` assigns the process's exit code, stderr, and timeout status to `output`, but the variable is never read afterward — the method proceeds straight to `Files.readString(tmpFile)` regardless of whether the process actually completed, exited non-zero, or hit the 15s timeout. In the timeout case in particular, the subprocess may still be running and writing to `tmpFile` after this method's `finally` block has already deleted it, and the failure is reported generically ("No token received from EM login") rather than distinguishing a timeout/crash from a script that legitimately produced no output. This variable and the same gap exist verbatim in `EmTokenValidator.runValidationScript` (`EmTokenValidator.java:102-103`, where the return value of `runProcess` is not even captured).
**Fix:** Either use the captured `ProcessOutput` (e.g. `if (output.isTimeout()) { ... }` / check `output.getExitCode()`) to produce a more specific error message, or remove the unused local and note in a comment that the temp-file contract is authoritative regardless of process outcome.

### IN-02: Broad `catch (Exception ignored)` around `toRealPath()` still swallows all resolution failures

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:112`
**Issue:** `try { bbjPath = bbjPath.toRealPath(); } catch (Exception ignored) {}` catches every `Exception` (not just the expected `NoSuchFileException`/`IOException`), including any `SecurityException` or unexpected runtime failure, and silently falls back to the unresolved path. In practice this is benign here because the very next line (`Files.isExecutable(bbjPath)`) re-validates the fallback path and reports a clear error if it isn't usable, so no failure is swallowed without user-visible consequence — this is the same conclusion the prior review reached, and the code is unchanged since then.
**Fix (optional, non-blocking):** Narrow the catch to `IOException` (the checked exception `toRealPath()` actually declares) so an unrelated `RuntimeException` doesn't get silently absorbed:
```java
try { bbjPath = bbjPath.toRealPath(); } catch (IOException ignored) {}
```

### IN-03: Source-guard test scaffolding (`extractMethodBody`/`countOccurrences`/`readGuardedSource`) is duplicated across four test files

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java:44-74`, `EmLoginTempFileCleanupSourceGuardTest.java:56-86`, `EmTokenTrustWindowSourceGuardTest.java:37-94`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java:71-86,450-476,478-486`
**Issue:** All four source-guard test classes independently redefine near-identical private helpers for reading a guarded source file, counting literal occurrences, and extracting a brace-balanced method body (the last two in slightly different but functionally equivalent forms). None of this is a test-reliability problem — each copy is internally correct — but it is copy-pasted boilerplate that will drift if one copy is fixed (e.g. for a brace-inside-a-string-literal edge case) and the others are not.
**Fix:** Extract a small shared `SourceGuardSupport` (or similar) test-utility class in `com.basis.bbj.intellij.actions` (or a shared test package) providing `readSource(Path)`, `countOccurrences(String, String)`, and `extractMethodBody(String, String)`, and have all four guard test classes depend on it instead of redeclaring it.

---

_Reviewed: 2026-09-19T12:39:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
