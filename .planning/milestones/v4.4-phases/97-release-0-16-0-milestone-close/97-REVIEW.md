---
phase: 97-release-0-16-0-milestone-close
reviewed: 2026-09-20T18:55:38Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java
  - bbj-vscode/test/functional/issue447-real-interop.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 97: Code Review Report

**Reviewed:** 2026-09-20T18:55:38Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Scope was the surviving diff `bdc024dc..HEAD` only (53 added / 5 removed lines across the five
listed files). The crash-detection status-feed rework and the `BbjServerService` from-state change
are net-zero in that range: `git diff bdc024dc..HEAD --stat -- bbj-intellij/src` lists exactly the
four IntelliJ files under review and nothing else, so the revert left no residue in main or test
sources.

Checks that came back clean:

- **Dangling references after the revert:** none. Neither test file references a removed override,
  helper or constant (no status-hook, crash, or from-state identifiers remain in either guard file).
- **Planning identifiers in source/test comments:** none. No plan numbers, decision ids,
  requirement ids, or phase/plan/wave/milestone wording in any of the five files. (Issue number
  `#447` is present and is fine.)
- **The no-op handler itself** (`BbjLanguageClient.java:132-134`) is correct: the method name on
  the wire matches the server (`bbj-notifications.ts:42`), the `Object` parameter gives Gson no
  typed parse path, and the reflective discovery mechanism is the same one the two sibling
  handlers already rely on.

No blockers. The four warnings are all of one kind: the shipped fix or guard is narrower than the
claim written next to it. One is a production gap (the indeterminate-mode fix does not hold for the
whole install), three are test-strength gaps (two guards pass on a commented-out line; the rewritten
live-interop invariant is true by construction).

## Warnings

### WR-01: `setIndeterminate(false)` is called once, but the platform fetcher can flip the indicator back before the later fractions

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:101-107` (with `:133-138`)
**Issue:** The fix sets determinate mode once, before `pipeline.install(...)`. The production
fetcher then hands the *same* indicator to the platform
(`request.saveToFile(targetPath.toFile(), ProgressManager.getInstance().getProgressIndicator())`).
Verified against the bundled platform bytecode (`ideaIC-2025.2.6.3/lib/app-client.jar`,
`HttpRequests$RequestImpl.saveToFile` and `lib/util.jar`, `NetUtils.copyStreamContent`):
`saveToFile` passes `getConnection().getContentLengthLong()` to `copyStreamContent`, whose first
action on the indicator is `indicator.setIndeterminate(expectedContentLength <= 0)`.

So whenever the response carries no `Content-Length` (chunked transfer, a re-encoding corporate
proxy -- precisely the environments this plugin's enterprise users sit behind), the indicator is
put back into indeterminate mode mid-install, and the next pipeline step
(`progress.step("Verifying Node.js archive...", 0.4)`, `NodeInstallPipeline.java:185`) calls
`setFraction` on an indeterminate indicator -- the exact logged
`IllegalStateException("This progress indicator ... is indeterminate ...")` this change was meant to
remove. `AbstractProgressIndicatorBase.setFraction` self-heals after logging, so the impact is one
logged stack trace per such download rather than a functional failure, but the defect the fix
targets is still reachable. The source comment at `:98-100` ("must leave indeterminate mode before a
fraction is meaningful") describes a one-time precondition that the platform does not honour.

**Fix:** Re-assert determinate mode at each reporting site instead of once up front, so the adapter
is correct regardless of what the fetcher did to the shared indicator:

```java
pipeline.install(
        (text, fraction) -> {
            indicator.setText(text);
            // The platform's own download copy may switch the shared indicator back to
            // indeterminate when the response has no Content-Length.
            indicator.setIndeterminate(false);
            indicator.setFraction(fraction);
        },
        indicator::checkCanceled);
```

(Keep passing the indicator to `saveToFile` -- it is what makes the download itself cancellable.)
The existing guard (`countOccurrences == 1`, textual order before `setFraction(`) still holds for
this shape.

### WR-02: The indeterminate-mode source guard passes when the call is commented out

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java:110-123`
**Issue:** The guard is a comment-unaware substring count plus a textual-order check. Replacing
`BbjNodeDownloader.java:101` with `// indicator.setIndeterminate(false);` leaves
`countOccurrences(body, "setIndeterminate(false)") == 1` and the index still precedes
`setFraction(`, so the test stays green on a no-op -- the regression it exists to catch. It also
asserts *textual* order, not execution order, and (per WR-01) it cannot see that the platform
re-enters indeterminate mode between the first and second fraction, so "before the first fraction is
reported" in the test name over-states what is pinned.

The inverse fragility is also live: the explanatory source comment at `BbjNodeDownloader.java:98-100`
currently avoids the literals `setIndeterminate(false)` and `setFraction(` only by wording. A
natural reword ("call setIndeterminate(false) before setFraction(...)") breaks the `== 1` counts
with a false failure.

**Fix:** At minimum, strip comments from the body window before counting, e.g.

```java
private static String withoutComments(String source) {
    return source
            .replaceAll("(?s)/\\*.*?\\*/", "")
            .replaceAll("(?m)//.*$", "");
}
```

and run every `countOccurrences`/`indexOf` in this test against `withoutComments(bodyOf(...))`.
Better: lift the two-line progress adapter into a tiny package-private seam taking an interface
with `setText/setIndeterminate/setFraction`, and assert the call sequence against a recording fake
in plain JUnit -- that pins behaviour (including the WR-01 per-step re-assertion) instead of text.

### WR-03: The `bbjcplAvailability` guard does not tie the annotation to the method, passes on a commented-out annotation, and leaves the parameter type unguarded

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java:137-149`
**Issue:** The body half of this guard is sound: `assertEquals("{}", body.replaceAll("\\s+", ""))`
is exact equality, so the string-unaware brace scan in `bodyOf` cannot produce a false pass here --
any content at all, including a string containing a brace, fails it. The declaration half is weak
in three ways:

1. The annotation check is a whole-file substring count. `// @JsonNotification("bbj/bbjcplAvailability")`
   still counts as 1, so the test passes while LSP4J no longer sees the handler and the
   unsupported-notification warning is back -- the one property the handler exists for.
2. Annotation and method are located independently (`countOccurrences(text, "@JsonNotification(...)")`
   vs `bodyOf(text, "public void bbjcplAvailability(")`). The annotation could sit on a different
   method and the test would pass. The sibling guard in the same file already shows the stronger
   pattern (`"@Override\n    public @Nullable Icon getIcon("`, line 154).
3. The assertion message claims the handler "must not parse, validate or store its payload, so a
   malformed payload has no processing path to reach", but the declaration substring stops at the
   opening parenthesis. Changing `Object result` to a typed DTO introduces a Gson deserialization
   path for the payload and the guard stays green.

**Fix:** This class is loadable in plain JUnit (`Lsp4ijCouplingCanaryTest.java:159` already touches
`BbjLanguageClient.class`), so assert the real property reflectively instead of textually:

```java
@Test
void theBbjcplAvailabilityHandlerIsReachableByLsp4jAndTakesAnUntypedPayload() throws Exception {
    Method handler = BbjLanguageClient.class.getMethod("bbjcplAvailability", Object.class);
    JsonNotification annotation = handler.getAnnotation(JsonNotification.class);
    assertNotNull(annotation, "the handler must carry @JsonNotification at runtime");
    assertEquals("bbj/bbjcplAvailability", annotation.value());
    assertTrue(ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class)
            .containsKey("bbj/bbjcplAvailability"));
}
```

`getMethod(..., Object.class)` pins the untyped parameter, the annotation lookup cannot be fooled by
a comment, and `getSupportedMethods` additionally fails on a duplicate RPC name. Keep the `{}` body
assertion as the no-op half. If the textual check is kept instead, assert the adjacent pair
`"@JsonNotification(\"bbj/bbjcplAvailability\")\n    public void bbjcplAvailability(Object result)"`
on comment-stripped text.

### WR-04: The rewritten issue447 capability invariant is true by construction and can no longer detect a broken `getAllClassNames` client path

**File:** `bbj-vscode/test/functional/issue447-real-interop.test.ts:36-46`
**Issue:** Making the test backend-shape-agnostic was the right call (the old `toBe(false)` encoded
an environment fact), and the test does not pass *wholly* vacuously: `expect(candidates).toContain('java.util.HashMap')`
is a real assertion that fails when interop is down, and when `:5008` is unreachable with the flag
unset the tests are reported as skipped, not passed. But the two new "capability" assertions assert
nothing:

- `expect(typeof hasCompleteIndex).toBe('boolean')` is a tautology -- the method's declared return
  type is `Promise<boolean>` and every return statement is a boolean expression.
- `expect(interop.hasCompleteClassIndex()).toBe(hasCompleteIndex)` holds on every path of
  `ensureCompleteClassIndex` (`java-interop.ts:579-600`): the latched branch returns
  `this.completeClassIndex !== null`, which is literally the body of `hasCompleteClassIndex()`
  (`:603-605`); the success branch returns `true` only after `buildCompleteClassIndex` assigned a
  non-null map; the catch branch returns `false` with the field still `null` (the assignment at
  `:632` is the last statement before the latch, and `clearCompleteClassIndex` resets both fields
  together). No code change short of rewriting those twelve lines can make the two disagree.

The consequence is a real coverage loss. A client-side regression in the `getAllClassNames` call
against a backend that *does* expose it (wrong params shape, response-shape change, a throw inside
`buildCompleteClassIndex`) lands in the non-`METHOD_NOT_FOUND` arm, is logged at debug level as
"will retry", returns `false`, agrees with the flag, and `resolveClassCandidatesBySimpleName`
silently falls back to the package probe and still finds `java.util.HashMap`. The test named
"capability detection" is green while capability detection is broken, and the title's
"suggestions work either way" is not what runs -- only the one branch the local backend selects is
ever exercised. Per project memory the local `:5008` backend now exposes the endpoint, which is
exactly the configuration where this matters.

**Fix:** Assert that the probe reached a *definitive* answer (built, or latched on
`METHOD_NOT_FOUND`) rather than a swallowed transient error, and drop the tautology:

```ts
const hasCompleteIndex = await interop.ensureCompleteClassIndex();
// A definitive outcome: either the index was built, or the backend answered MethodNotFound and
// the fallback was latched. A swallowed transient/protocol error leaves this false.
const resolved = (interop as unknown as { completeIndexResolved: boolean }).completeIndexResolved;
expect(resolved).toBe(true);
expect(interop.hasCompleteClassIndex()).toBe(hasCompleteIndex);
```

To genuinely cover "either way" independent of the environment, add a second case that forces the
fallback on the live connection (a test subclass that latches `completeIndexResolved = true` with a
null index) and asserts `resolveClassCandidatesBySimpleName('HashMap')` still contains
`java.util.HashMap`; then the primary case may log which branch the backend selected.

## Info

### IN-01: The guard class's own Javadoc no longer describes the new test

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java:14-20`
**Issue:** The class comment states every assertion runs inside a located method-body window
"except the fully-qualified-reference counts". The new annotation count at `:141` is a second
whole-file search. The handler is also not an LSP4IJ override site (it is an LSP4J reflective
notification handler); its two sibling handlers each have a dedicated guard file
(`BbjLanguageClientResolvedConfigPathSourceGuardTest`, `BbjLanguageClientRestartSourceGuardTest`).
**Fix:** Either update the Javadoc to name the second whole-file exception, or move the test beside
its siblings (naturally resolved if WR-03's reflective form is adopted in the canary test).

### IN-02: Exact `{}` equality forbids any explanatory comment inside the empty handler

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java:145-148`
**Issue:** A reader (or an inspection quick-fix for "empty method") adding `// intentionally empty`
inside `BbjLanguageClient.java:133-134` fails the guard. It fails closed, so this is not a
correctness risk, but the failure message ("must not parse, validate or store its payload") will
mislead whoever trips it.
**Fix:** Strip comments before the equality check (the same helper as WR-02), or say in the failure
message that comments are also rejected.

### IN-03: The notification name is duplicated across three components with no contract check

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:132`
**Issue:** `'bbj/bbjcplAvailability'` is a bare string literal in the server
(`bbj-vscode/src/language/bbj-notifications.ts:42`), the VS Code client
(`bbj-vscode/src/extension.ts:971`) and now the IntelliJ client. A rename on the server side
silently reinstates the unsupported-notification warning in IntelliJ with every test green.
**Fix:** Optional: a small Java test that reads `bbj-notifications.ts` and asserts it contains the
same literal the annotation carries, in the style of the existing cross-tree source guards.

---

_Reviewed: 2026-09-20T18:55:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
