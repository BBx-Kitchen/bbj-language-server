---
phase: 94-em-login-run-action-consolidation
reviewed: 2026-09-19T00:00:00Z
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
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 94: Code Review Report

**Reviewed:** 2026-09-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This phase relocates three tool-script lookups behind a shared `BbjToolScriptResolver`, moves EM
token validation out of `BbjRunActionBase` into a new standalone `EmTokenValidator`, and adds an
`update()`/`getActionUpdateThread()` enablement gate to `BbjEMLoginAction`. I traced all four
commits (`5535b0db`, `5162571b`, `95484340`, `0598668b`) against the current file contents.

The security-critical invariants called out in the phase context all hold in the reviewed code:
- The EM token, username, and password travel exclusively on `BbjProcessSecretEnv`'s environment
  map in every reviewed call site (`BbjEMLoginAction.performLogin`, `EmTokenValidator`'s runner,
  `BbjRunActionBase.buildWebRunCommandLine`); no `addParameter(token/username/password)` call
  exists anywhere in the diff.
- The owner-only temp file in `BbjEMLoginAction.performLogin` is created before the launch's
  opening `try` and deleted in a `finally` that encloses process-handler construction and
  `runProcess(15000)`, matching `EmTokenValidator.runValidationScript`'s shape.
- `BbjRunActionBase.buildWebRunCommandLine` still runs the client-side expiry check
  (`isTokenExpired`) before `EmTokenValidator.validateTokenTrusted`, and the trust-window read
  (`validateThrough`) is the sole entry point into the server-side subprocess — no direct
  `validateTokenServerSide` call was reintroduced.
- `BbjEMLoginAction.update()` gates on project presence alone, reading neither `ServerStatus` nor
  `bbjHomePath`, per the deliberate decision documented in its Javadoc.
- `BbjSecretArgvSourceGuardTest` was correctly extended (not weakened) to cover the relocated
  `EmTokenValidator.java`, including moving it into `OWNER_ONLY_FILE_CALLERS` and out of the set
  that `BbjRunActionBase` no longer belongs to.

I did find one genuine test-reliability defect newly introduced by this phase (a tautological
ordering assertion that cannot independently fail) and one unguarded null-dereference risk in
code this phase's refactor left untouched but which is now the sole home of the affected logic.

## Warnings

### WR-01: Tautological assertion in the new temp-file-cleanup source guard

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java:107-119`
**Issue:** `theCreationPrecedesTheLaunchTry()` computes:
```java
int creationIndex = body.indexOf(CREATION_LITERAL);
int launchTryIndex = body.indexOf("try {", creationIndex);
...
assertTrue(creationIndex < launchTryIndex, "the owner-only creation must precede the launch's opening `try`");
```
`String.indexOf(str, fromIndex)` can only return an index `>= fromIndex` (or `-1`). Since the
search starts at `creationIndex` itself, and `CREATION_LITERAL` does not begin with `"try {"`, any
non-`-1` result is *guaranteed* to be strictly greater than `creationIndex`. The final assertion
therefore cannot fail once the preceding `assertTrue(launchTryIndex >= 0, ...)` has already
passed — it verifies nothing beyond "some `try {` exists somewhere after the creation call,"
which is not the ordering claim in its own failure message or the class-level Javadoc ("this
guard pins ordering instead of presence"). A regression that moves the owner-only creation
*inside* the launch's existing `try` (collapsing the two `try` blocks) would still pass this
specific assertion. The adjacent test `theSubprocessRunSitsBetweenTheLaunchTryAndTheFinally` does
independently verify the ordering that matters (`runProcess` between the launch `try` and its
`finally`) and would catch the pinned regression (#590), so the file's overall protection is not
lost — but this individual assertion gives false confidence and should be rewritten to compare
two independently-located indices (both from offset 0) rather than chaining the second `indexOf`
off the first result.
**Fix:**
```java
int creationIndex = body.indexOf(CREATION_LITERAL);
int launchTryIndex = body.indexOf("try {"); // independent search, not chained off creationIndex
// ...then also assert there is no OTHER "try {" between them that would indicate the two blocks
// were merged, e.g. by counting "try {" occurrences before creationIndex vs. after.
```
At minimum, drop the assertion or replace it with one that cannot pass by construction whenever
its own "found" precondition passes.

### WR-02: Unguarded `NullPointerException` risk on `file.getParent()` in the shared web-run builder

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:358`
**Issue:** `buildWebRunCommandLine` computes `workingDir` via:
```java
String workingDir = file.getParent().getPath();
```
`VirtualFile.getParent()` is `@Nullable` (it returns `null` for a filesystem root, and some
virtual/synthetic file systems can produce a `VirtualFile` with no parent). This method is now
the single shared implementation both `BbjRunBuiAction` and `BbjRunDwcAction` delegate to
(consolidated in phase 84, retained by this phase's refactor), so any such input reaches this one
unguarded call. A resulting `NullPointerException` is thrown from inside `buildCommandLine()`,
called by `actionPerformed`'s pooled-thread `Runnable` *before* the `try { ... } catch
(ExecutionException ex)` block that surrounds only `OSProcessHandler` construction — so the
exception propagates uncaught out of the `Runnable` with no `logError` call and no user-visible
diagnostic, silently failing the Run action.
**Fix:**
```java
VirtualFile parent = file.getParent();
if (parent == null) {
    logError(project, "Cannot determine working directory for " + file.getName());
    return null;
}
String workingDir = parent.getPath();
```

## Info

### IN-01: Broad `catch (Exception ignored)` around `toRealPath()` masks legitimate I/O failures

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:112`
**Issue:**
```java
Path bbjPath = Path.of(bbjBin);
try { bbjPath = bbjPath.toRealPath(); } catch (Exception ignored) {}
```
Catching `Exception` (rather than the narrower `IOException` that `toRealPath()` actually
declares) also silently swallows unchecked exceptions such as `SecurityException` or a
`InvalidPathException` from a malformed `bbjHome` setting. The subsequent
`Files.isExecutable(bbjPath)` check still fails closed in the common case, so this is low risk,
but it makes debugging a misconfigured BBj Home harder than necessary since no diagnostic
survives the swallow.
**Fix:** Narrow the catch to `IOException`, or log the ignored exception at debug level.

---

_Reviewed: 2026-09-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
