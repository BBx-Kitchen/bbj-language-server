---
phase: 96-platform-integration-node-js-diagnosis
reviewed: 2026-09-20T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNotificationProviderBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjHexLiteral.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropPollPolicy.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/TextMateBundleCache.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNotificationProviderBaseSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverVersionGatingTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodePresentationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/TextMateBundleCacheTest.java
  - bbj-intellij/src/test/resources/node-fixtures/README.md
  - documentation/docs/intellij/features.md
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 96: Code Review Report

**Reviewed:** 2026-09-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the IntelliJ-side Node.js diagnosis/install pipeline, the four-provider editor-banner
consolidation, and the TextMate bundle cache introduced/changed in this phase, against the
`674abc38^..HEAD` diff. I traced call chains across `BbjLanguageServer` → `NodeExecutableResolver`
→ `NodePresentation`/`BbjMissingNodeNotificationProvider`, and `BbjTextMateBundleProvider` →
`TextMateBundleCache`, and cross-checked the four notification-provider source-guard tests against
the actual file contents they claim to pin.

Specific scrutiny per the review priorities:

- **`TextMateBundleCache.sweepAbandoned`**: correctly scoped to direct children only, requires a
  non-blank prefix (an empty/blank/null prefix is a documented no-op, verified against the actual
  guard code and tests), and deletes via the symlink-safe `deleteRecursively`. I traced the edge
  case where the *matched entry itself* is a symlink to a directory (not covered by the existing
  tests, which only cover a symlink nested *inside* a matched directory): `Files.isDirectory(entry)`
  follows the link and admits it as a candidate, but `Files.walkFileTree`'s default (non-following)
  traversal treats the *root* argument itself as a plain file when it is a symlink, so only the
  link is deleted, never its target. This is safe by JDK semantics but untested — flagged as INFO
  below, not a blocker.
- **`NodeInstallPipeline` integrity gate**: the SHA-256 pin is looked up before the file is ever
  opened (an unknown archive name never trusts anyway), the zip-entry match is now an exact
  relative-path equality rather than a suffix test (closing the decoy/zip-slip class of bug the
  new `fake-node-win-decoy.zip` fixture specifically exercises), and cleanup failures are
  swallowed in a way proven, by a dedicated hostile-fetcher test, never to mask the real
  verification failure. Recomputed the SHA-256 of every committed fixture archive directly and
  confirmed each matches both the README's transcription and the literal pinned in
  `NodeInstallPipelineTest` — no drift.
- **Write ordering in `TextMateBundleCache.populate`**: files are written before the marker, and a
  `null` plugin version deliberately skips the marker write, in both the code and its test
  coverage (`populateInterruptedPartwayLeavesNoMarker`, `nullPluginVersionIsNeverACacheHit`).
  However, `populate()` itself does no locking, and `BbjTextMateBundleProvider.getBundles()` can
  in principle be re-entered by the platform before an in-flight `populate()` call returns — see
  WR-01.
- **`NodeExecutableResolver`'s 4-arg/7-arg pair**: the 4-arg overload is a pure delegator to the
  7-arg one with permissive defaults (verified by reading the source, not just the tests) — they
  cannot diverge because there is only one implementation.
- **Source guards**: `BbjNotificationProviderBaseSourceGuardTest` and
  `BbjMissingNodeNotificationSourceGuardTest` both read the actual files they claim to guard (paths
  resolve correctly under the Gradle test working directory) and assert non-tautological,
  file-content-derived invariants (delegation counts, argument ordering, status literals). One
  guard's body-extraction helper uses a string-unaware brace-depth scanner; it happens to be safe
  for the current file contents but is a latent fragility — see WR-02.
- **Concurrency**: `BbjNodeVersionCache` (not itself in this diff's scope, but exercised by the
  in-scope `BbjMissingNodeNotificationProvider`) is documented and structured to spawn `node
  --version` at most once per unchanged stat via `ConcurrentHashMap.compute`; this holds correctly
  from the calling code reviewed here.

No BLOCKER-level defects were found. The three deliberate, hand-UAT'd behavior changes described in
the phase context (crash banner now file-type-based and `DumbAware`; too-old configured Node.js now
rejected and falls through; banner text/actions vary by rejection reason) are implemented
consistently with their documentation and are not re-litigated here. The two out-of-scope deferred
items (Unix `tar` cancellation/stdin, Settings-dialog EDT violation) are not reported.

## Warnings

### WR-01: `TextMateBundleCache.populate()` is not guarded against concurrent re-entry

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/TextMateBundleCache.java:86-100`
**Issue:** `populate()` performs an unsynchronized read-check-write sequence (`isPopulatedFor` →
loop of `Files.copy(..., REPLACE_EXISTING)` → marker write) against a shared, versioned directory
under the plugin's data path. `BbjTextMateBundleProvider.getBundles()` calls
`isPopulatedFor`/`populate` with no lock:

```java
if (!TextMateBundleCache.isPopulatedFor(bundleDir, pluginVersion, BUNDLE_FILES)) {
    TextMateBundleCache.populate(bundleDir, pluginVersion, BUNDLE_FILES, this::openBundleResource);
}
```

If the platform (or a future caller — e.g. a second project window opened during the very first
launch after an update) invokes `getBundles()` a second time before the first `populate()` call
has finished, both threads observe "not populated" and both proceed to copy the same five files
into the same directory and write the marker independently. Because `Files.copy` is not atomic for
non-tiny files and both writers race on the same target paths, a reader (a third `getBundles()`
call, or the TextMate engine itself reading the files off disk after the marker appears from
whichever writer finishes writing its marker first) could observe a torn/interleaved file if the
*other* writer is still mid-copy at that moment. The single-writer write-ordering guarantee this
class's Javadoc describes ("a reader that observes the marker is guaranteed to observe every file
complete") only holds for one writer at a time; it does not hold across two concurrent `populate()`
calls to the same `bundleDir`.
**Fix:** Either serialize `populate()` per `bundleDir` (e.g. a static `ConcurrentHashMap<Path,
Object>` of per-directory locks, or a single class-wide lock — contention is negligible since this
only matters during the narrow first-populate window), or write into a fresh temp directory and
atomically `Files.move` it into place with `ATOMIC_MOVE`/`REPLACE_EXISTING` before writing the
marker, so two racing writers each produce a self-consistent result and the last rename wins
cleanly instead of interleaving file contents.

### WR-02: Source-guard body extraction is a string-unaware brace scanner

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java:61-83`
**Issue:** `bodyOf()` locates a declaration and then finds its closing brace by counting `{`/`}`
characters verbatim across the rest of the file, with no awareness of string or char literals,
line comments, or block comments:

```java
for (; i < source.length(); i++) {
    char c = source.charAt(i);
    if (c == '{') {
        depth++;
    } else if (c == '}') {
        depth--;
        ...
```

For the current contents of `BbjMissingNodeNotificationProvider.java` this happens to be safe,
because none of the string literals inside `buildPanel` (`"Download Node.js"`,
`"https://nodejs.org/"`, etc.) contain a brace character. But the guard gives no protection against
that invariant being broken by a future edit — e.g. adding a log message or comment inside
`buildPanel` that contains a literal `{` (a very ordinary thing to write, e.g. `"resolved as {0}"`
or a JSON snippet in a comment) would silently mis-locate the closing brace, and every assertion
built on `body` (`bodyOf(...)`) would then run against a truncated or over-extended slice without
any test failure pointing at the real cause. This is exactly the class of "green but structurally
fragile" guard flagged in this project's own history (tautological assertions, string-unaware
brace scanning, guards pointed at the wrong file).
**Fix:** Track whether the scanner is currently inside a `"..."` or `'...'` literal (respecting
`\"`/`\\` escapes) and skip brace-counting while inside one, or — more robustly — parse the file
with a lightweight tokenizer/JavaParser-lite instead of raw character scanning. At minimum, add a
regression test that plants a `{`/`}` inside a string literal in a copy of the guarded body and
asserts the guard still slices correctly, so a future maintainer notices the fragility before it
silently breaks.

## Info

### IN-01: `CACHE_UNAVAILABLE` rejection renders an awkward "value" in `NodeExecutableResolver.failureMessage()`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java:190-201,247-260`
**Issue:** When the cache directory is inaccessible, `resolve()` records
`new Rejected(Source.CACHED, Reason.CACHE_UNAVAILABLE, "")` — an empty-string candidate, since
there is no path to name. `render()` (used by `Resolution.failureMessage()`, which
`BbjLanguageServer.notifyUnresolvedNodePath` surfaces verbatim as the startup failure
notification) does not special-case an empty candidate:

```java
String candidate = "\"" + escape(rejected.candidate()) + "\"";
...
return label + " value " + candidate + " " + reason + ".";
```

This produces the sentence `Cached value "" could not be checked because the plugin's Node.js
cache directory could not be accessed.` — grammatically confusing ("value \"\""  reads like an
actual empty path was rejected, rather than "the cache location itself is unreachable"). The
sibling `NodePresentation.bannerText()` seam already phrases this case cleanly for the editor
banner ("The plugin's Node.js cache directory could not be accessed."); the language-server
startup notification path does not benefit from that same phrasing because it calls
`resolution.failureMessage()` directly instead of going through `NodePresentation`.
**Fix:** In `render()`, special-case `Reason.CACHE_UNAVAILABLE` to omit the `value "..."` segment
entirely (mirroring how `describe()` already fully explains the reason without needing the
candidate), e.g. `return "Cached " + reason + ".";` for that one reason, or route
`BbjLanguageServer`'s failure notification through `NodePresentation` instead of
`Resolution.failureMessage()` so both surfaces share one wording.

### IN-02: `sweepAbandoned` has no test for a direct-child entry that is itself a symlink to a directory

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/TextMateBundleCacheTest.java` (whole
`sweepAbandoned*` group, e.g. lines 226-243)
**Issue:** The existing symlink test
(`sweepAbandonedDeletesASymbolicLinkAndNeverTheFileItPointsAt`) places the symlink *inside* a
matched real directory. It does not cover the case where a direct child of `tempRoot` whose name
matches the prefix is itself a symlink pointing at an external directory. `Files.isDirectory(Path)`
follows symlinks by default, so such an entry is admitted into the `sweepAbandoned` loop and passed
to `NodeInstallPipeline.deleteRecursively(entry)` as the walk root. I traced this through
`Files.walkFileTree`'s documented semantics (the traversal reads the *root* argument's attributes
without following links when `FileVisitOption.FOLLOW_LINKS` is absent, which it is here) and
concluded the outcome is safe — only the symlink itself is deleted, its target is untouched — but
this is exactly the kind of blast-radius edge case this method's own Javadoc calls out for
scrutiny, and it currently rests on an implicit understanding of JDK internals rather than an
explicit test.
**Fix:** Add a test that creates `tempRoot/<prefix>-symlink` as a symbolic link (rather than a real
directory) pointing at an external directory, asserts `sweepAbandoned` reports it as removed (or
explicitly documents that it is skipped, whichever behavior is intended), and asserts the link's
target directory and its contents survive — the same shape as the existing nested-symlink test,
but with the link as the direct child instead of nested one level down.

---

## Disposition

Every finding above was acted on or explicitly declined before the phase's Windows attestation
build. No finding is left merely unread.

| ID | Disposition | Commit | Reasoning |
|----|-------------|--------|-----------|
| WR-01 | Declined — not a defect | — | Plan 96-02 decided against a lock on researched grounds: "Do not add a file lock — RESEARCH concluded ordering neutralises the race that a lock would guard, and a lock would be new complexity for no gain." Write-before-marker ordering is the deliberate correctness rule, and racing writes copy identical bytes from the same packaged JAR resource. The finding describes a real property of the code but re-litigates a settled design decision rather than reporting a fault. |
| WR-02 | Fixed | `6d9b6a7d` | `bodyOf()` now tracks string-literal, char-literal, line-comment and block-comment state while counting braces. The fix was proven falsifiable: reverting `bodyOf()` to the old scanner makes the new regression test fail at its `assertFalse(body.contains(...))` assertion, and restoring the fix returns the class to green. |
| IN-01 | Deferred | — | Deferred by explicit human decision so the attested build stays behaviourally identical to the reviewed tree. The `CACHE_UNAVAILABLE` sentence in `NodeExecutableResolver.failureMessage()` is cosmetic and touches production user-visible text; `NodePresentation` already gives the editor banner the cleaner phrasing for the same case. Carry as follow-up. |
| IN-02 | Fixed | `d154c08b` | Added a direct-child symlink sweep test. Behaviour was confirmed safe by reading `sweepAbandoned` and `deleteRecursively` rather than assumed: `Files.isDirectory` follows the link and admits the entry, but `walkFileTree` without `FOLLOW_LINKS` treats the symlink root as a plain file, so only the link is unlinked and the target survives. That reasoning is now pinned by a test instead of resting on implicit JDK semantics. |

Both fixes are test-only. `git diff --name-only b040b195..HEAD` contains exactly the two test files
and nothing under `src/main/`, so the distributables built for the Windows attestation are
behaviourally identical to the tree reviewed here.

---

_Reviewed: 2026-09-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
