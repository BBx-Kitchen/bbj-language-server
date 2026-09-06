---
phase: 83-regression-test-hardening
reviewed: 2026-09-06T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/DownloadCompletions.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsFailurePathTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/DebouncedLookupFailureDeliveryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/DownloadCompletionsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijClassFileMarkers.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijVersionPinTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeAvailabilityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
  - bbj-intellij/src/test/resources/node-fixtures/README.md
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 83: Code Review Report

**Reviewed:** 2026-09-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This phase extracts the Node.js install pipeline (`NodeInstallPipeline`) and the missing-Node
banner decision (`NodeAvailability`) into plain-Java, platform-free seams, adds a failure-carrying
result to the debounced Settings lookups, and layers on a substantial set of structural/canary
tests (LSP4IJ coupling allowlist, version-pin, cross-language request-name contract, composer DTO
round trips). The extraction is careful and the new pipeline's symlink-safe cleanup, digest
verification ordering (verify strictly precedes extraction and installation, confirmed by both the
source and `NodeInstallPipelineTest`/`NodeInstallPipelineSourceGuardTest`), and cache-hit gating are
all correct and well covered by tests that exercise real fixture archives rather than mocks.

No critical/security-grade defects were found. The issues below are all correctness/robustness
gaps or maintainability nits: an exception-masking `finally` block, a cancellation mechanism on the
Unix tar-extraction path that will not actually interrupt a normal (non-verbose) `tar` run despite
the code's own claim that it does, an unclosed process stream, a loose archive-entry name match,
and a pre-existing EDT-blocking call path that the failure-path changes landed directly on top of.
Two decision-id comments ("D-12") also leaked into production source.

## Warnings

### WR-01: Cancellation during Unix tar extraction is not actually honored mid-extraction

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java:250-266`
**Issue:** `extractTarGz` invokes `cancel.checkCanceled()` only inside the loop that reads
`process`'s merged stdout/stderr line by line, and the surrounding comment claims this is "so a
cancel request during a slow extraction is honored rather than silently ignored until the tar
process finishes on its own." The command executed is `tar xzf <archive> -C <dest>
--strip-components=1` with no `-v`/verbose flag, so on a normal, successful extraction `tar`
produces **zero lines of output**. `reader.readLine()` therefore blocks until the process exits on
its own (EOF), and `cancel.checkCanceled()` is never reached while the extraction is actually
running — only after it has already finished. A user who cancels a slow Node.js download while the
(potentially tens-of-MB) archive is being extracted on Linux/macOS will not see the extraction
actually stop; the next `checkCanceled()` call (before `installExtracted`) only fires once
extraction has already completed on its own. This contradicts the documented behavior and the
`aCancelSignalledBeforeExtractionStopsThePipelineAndCleansUp` test does not exercise this path
either, since it cancels at the `cancel.checkCanceled()` call that precedes `extractArchive(...)`,
not during the tar subprocess itself.
**Fix:** Poll for cancellation independently of subprocess output, e.g.:
```java
try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
    // still drain output for the error message
    ...
}
while (!process.waitFor(100, TimeUnit.MILLISECONDS)) {
    try {
        cancel.checkCanceled();
    } catch (RuntimeException cancelled) {
        process.destroyForcibly();
        throw cancelled;
    }
}
```
or run the output-draining and the cancellation poll on separate threads/timers so a silent `tar`
run is still interruptible.

### WR-02: A failed cleanup in `install()`'s outer `finally` can mask the pipeline's real failure

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java:207-209`
**Issue:**
```java
} finally {
    Files.deleteIfExists(tempFile);
}
```
Unlike the inner cleanup (`deleteRecursivelyQuietly`, which explicitly swallows `IOException` "so a
failure here must never mask an earlier exception"), this outer cleanup calls
`Files.deleteIfExists` directly and unguarded. If the `try` block already threw (e.g. `fetch`
failed with a network `IOException`, or verification failed) and `Files.deleteIfExists(tempFile)`
itself then throws (e.g. a transient filesystem/AV-lock issue), the *original* exception is
discarded and replaced by the deletion failure, hiding the real root cause from the user-facing
error message in `BbjNodeDownloader.downloadNodeAsync`.
**Fix:** Mirror the inner cleanup's swallow-and-log pattern:
```java
} finally {
    try {
        Files.deleteIfExists(tempFile);
    } catch (IOException e) {
        // Best-effort cleanup: a failure here must never mask an earlier exception.
    }
}
```

### WR-03: `process.getOutputStream()` (the tar subprocess's stdin pipe) is never closed

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java:242-277`
**Issue:** `extractTarGz` starts a `Process` via `ProcessBuilder` and consumes/closes its merged
stdout (via the try-with-resources `BufferedReader`), but never obtains or closes
`process.getOutputStream()`. Every `Process` created this way keeps its stdin pipe open until the
`Process` object is garbage collected, leaking a file descriptor per extraction. `tar` does not
read stdin here so it causes no functional hang, but it is an outstanding resource leak the review
context specifically called out ("resource/stream handling in archive extraction").
**Fix:**
```java
Process process = pb.start();
try {
    process.getOutputStream().close();
    ...
} finally {
    ...
}
```

### WR-04: `extractZip`'s archive-entry match is a loose suffix check, not an exact name match

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java:220-240`
**Issue:** `entry.getName().endsWith("node.exe")` matches any entry whose path happens to end in
that literal — e.g. `foo/somenode.exe`, `weirdnode.exe`, or a mis-shaped archive with a directory
entry literally named `node.exe/`. Because production archives are digest-verified against pinned
hashes before extraction, this is low-exploitability today, but it is still an incorrect matching
rule: a future archive-layout change, or a corrupted/mismatched fixture that happens to keep the
same digest key, could silently extract the wrong entry as "the" Node binary.
**Fix:** Compare the exact file name segment instead of a suffix:
```java
String name = entry.getName();
if (name.equals("node.exe") || name.endsWith("/node.exe")) { ... }
```
or use `Paths.get(entry.getName()).getFileName().toString().equals("node.exe")`.

### WR-05: `flushPendingHomeLookup()` runs the blocking BBj-home lookup synchronously on the EDT

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:363-368`
**Issue:** The class's own javadoc states the field's `DocumentAdapter`s and `ComponentValidator`s
"perform no filesystem or subprocess work of their own; that work lives entirely in
{@link BbjSettingsLookups}, called only from {@link #nodeDebouncer}/{@link #homeDebouncer}." (lines
32-35). `flushPendingHomeLookup()` violates that invariant: it is documented to run "from the
Configurable's `apply()`" — which IntelliJ always invokes on the EDT — and calls
`BbjSettingsLookups.lookupHome(...)` directly and synchronously, performing a BBj-home validity
check plus a full classpath-entry enumeration on the EDT. For a large BBj installation this can
visibly freeze the Settings dialog's OK/Apply click. This method pre-dates this phase, but this
phase's failure-path changes (`lookup.failed()` handling in `applyHomeLookup`) land squarely on the
result this synchronous call produces, so the EDT-blocking call site is exercised by the very code
this phase touches.
**Fix:** Either move the classpath-entry enumeration off the EDT (e.g. run it under
`ProgressManager`/a modal progress indicator during `apply()`), or scope `apply()` to persist the
already-debounced `lastHomeLookup`/`pendingClasspathSelection` state without re-running the
filesystem work synchronously, falling back to a "pending" placeholder rather than blocking.

## Info

### IN-01: Decision-id comments leaked into production source

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:33,188`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java:11`
**Issue:** The literal `(D-12)` (a planning decision id) appears in production Javadoc/comments
rather than in planning artifacts.
**Fix:** Replace with a plain-English description or a GitHub issue reference, e.g. "Every
keystroke ... only schedules a debounced background lookup — the fields' ... perform no filesystem
or subprocess work of their own ...", dropping the `(D-12)` tag.

### IN-02: Node executable path literals are duplicated instead of reusing `Target.nodeExecutableName()`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java:73-75,225-226,280-282`
**Issue:** `"node.exe"` and `"node"`/`"bin/node"` are hard-coded independently in `extractZip` and
`installExtracted`, in addition to being derived once in `Target.nodeExecutableName()`. All three
sites must be kept in sync by hand if a platform's executable name ever changes.
**Fix:** Derive the extraction target and the extracted-node lookup path from
`target.nodeExecutableName()` rather than repeating the string literal.

### IN-03: Duplicate progress text for two different install-step fractions

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java:198,202`
**Issue:** `progress.step("Installing Node.js to plugin directory...", 0.9)` and the final
`progress.step("Installing Node.js to plugin directory...", 1.0)` use the identical text for two
different progress fractions, which reads as a stalled/duplicate status update in progress UIs that
surface the text.
**Fix:** Give the terminal step distinct text, e.g. `"Node.js installed."`.

---

_Reviewed: 2026-09-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
