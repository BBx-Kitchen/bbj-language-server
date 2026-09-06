# Phase 83: Regression Test Hardening - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** ~16 (new test classes/seams grouped by plan P01/P02/P03) + fixtures
**Analogs found:** 16 / 16 (all have a role-match or exact analog; no "no analog" bucket)

All analogs below are git-tracked source (verified with `git ls-files`), not mirrors.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lsp/NodeInstallPipeline.java` (new seam, D-01) | service | file-I/O | `lsp/NodeArchiveVerifier.java`, `lsp/NodeExecutableResolver.java` | role-match |
| `BbjNodeDownloader.java` (thinned, D-01) | service | event-driven (Task.Backgroundable) | itself (existing) | exact (same file) |
| `lsp/NodeInstallPipelineTest.java` (new) | test | file-I/O | `lsp/NodeArchiveVerifierTest.java` (`@TempDir`, injectable fakes) | exact |
| `lsp/BbjNodeDownloaderSourceGuardTest.java` (edited, guards re-pointed) | test | structural/text-guard | itself (existing) | exact (same file) |
| `src/test/resources/nodefixtures/*.zip`, `*.tar.gz` (new, D-02) | fixture | file-I/O | none (new dir) — provenance convention from `IntentionDescriptionResourcesTest`'s resource-dir reads | role-match |
| `concurrency/KeystrokeDebouncerFailurePathTest.java` (new, D-13) or added cases in `KeystrokeDebouncerTest.java` | test | event-driven | `concurrency/KeystrokeDebouncerTest.java` + `concurrency/ManualScheduler.java` | exact |
| `BbjSettingsLookups.java` (catch added, D-13) | utility | request-response | itself (existing) | exact (same file) |
| EDT residual test additions (cache invalidation, restart coalescing, drained downloads, notification-provider branches) | test | event-driven | `concurrency/RestartGateTest.java`, `lsp/BbjNodeDownloaderSourceGuardTest.java` (`drainedCompletionsAreDispatchedToTheEdt`), `lsp/OffEdtDispatchSourceGuardTest.java` | exact |
| `lsp/Lsp4ijCouplingCanaryTest.java` (new, D-07/D-08, one-or-per-file) | test | reflective/structural | `lsp/BbjNodeDownloaderSourceGuardTest.java`, `lsp/OffEdtDispatchSourceGuardTest.java` (guard shape); `compile/CompileResultJsonBoundaryTest.java` (reflective LSP4IJ-shape assertions on real vendor types) | role-match |
| `lsp/Lsp4ijImportAllowlistTest.java` (new, D-09) | test | structural (source scan) | `composer/IntentionDescriptionResourcesTest.java` (derive-the-subject-list-don't-hard-code pattern, inverted) | role-match |
| `composer/ComposerRequestContractTest.java` (new, D-10a) | test | cross-language string-presence | `composer/IntentionDescriptionResourcesTest.java` (reads a sibling resource tree by relative path) | role-match |
| `composer/ComposerModelsJsonBoundaryTest.java` (new, D-10b) | test | request-response (JSON round trip) | `compile/CompileResultJsonBoundaryTest.java` | exact |
| `lsp/Lsp4ijVersionPinTest.java` (new, D-11) | test | config/version-check | `lsp/BbjNodeDownloaderSourceGuardTest.java` (`everyPlatformAndArchitectureTheFileCanProduceHasAPinnedDigest`, reads `build.gradle.kts`-adjacent version literal pattern) | partial-match |
| `lsp/NodeInstallPipelineSymlinkTest.java` or nested case in pipeline test (D-14, IN-03) | test | file-I/O | `lsp/NodeArchiveVerifierTest.java` (`@TempDir` fixture-planting style) | exact |
| Mutation-check notes (D-16, recorded in SUMMARY, not a file) | n/a | n/a | n/a | n/a |

## Pattern Assignments

### `lsp/NodeInstallPipeline.java` (service, file-I/O) — D-01..D-06, D-14

**Analogs:** `lsp/NodeArchiveVerifier.java` (interface-collaborator shape), `lsp/NodeExecutableResolver.java` (`PathProbe` precedent), `BbjNodeDownloader.java` (the logic being moved, lines 50-312 per CONTEXT.md's "Verified state" map).

**Injectable-collaborator pattern** (mirror `NodeArchiveVerifier.ByteSource`/`DigestSource`):
```java
public interface ByteSource {
    InputStream open(Path file) throws IOException;
}
public interface DigestSource {
    String expectedSha256(String archiveFileName);
}
```
Apply the same shape for the new seam's `Fetcher` (url, target path, progress/cancel) and cancel-probe — one small interface per collaborator, a `REAL_*`/production singleton constant plus a swappable one for tests, exactly like `NodeArchiveVerifier.REAL_FILES` and `NodeArchiveVerifier.PINNED_DIGESTS`.

**Result-object pattern** (mirror `NodeArchiveVerifier.Result`): a verified/refused result object with a `Reason` enum and fields legal to read only on the matching branch (`assertThrows(IllegalStateException.class, result::expectedDigest, ...)` — see `NodeArchiveVerifierTest.expectedDigestOnAVerifiedResultThrows`, lines 170-187). Use the same "only meaningful when refused" convention for the pipeline's failure result (verify-failure short-circuit, missing-binary-in-archive, cancel-between-steps).

**IN-03 fix (D-14):** when the seam owns `cleanup()`/directory walk, switch to `Files.walkFileTree` (or equivalent) using `FileVisitOption` that does NOT follow links — i.e. omit `FOLLOW_LINKS` — so a symlink is deleted itself, never traversed into its target. Test with `@TempDir` planting a symlink pointing outside the extraction dir (pattern: `NodeArchiveVerifierTest` uses `@TempDir Path tempDir` + `Files.write`/`Files.readAllBytes` to construct fixture bytes at lines 86-97, 100-121 — reuse that `@TempDir` + real-filesystem style for the symlink case).

### `lsp/NodeInstallPipelineTest.java` (test, file-I/O) — D-01..D-06

**Analog:** `lsp/NodeArchiveVerifierTest.java` (full file read above).

**Core test-double pattern** (lines 37-66):
```java
private static final class RecordingByteSource implements NodeArchiveVerifier.ByteSource {
    private final AtomicInteger invocationCount = new AtomicInteger();
    int invocations() { return invocationCount.get(); }
    @Override public InputStream open(Path file) throws IOException {
        invocationCount.incrementAndGet();
        return Files.newInputStream(file);
    }
}
private static final class FixedDigestSource implements NodeArchiveVerifier.DigestSource {
    private final Map<String, String> pins;
    FixedDigestSource(Map<String, String> pins) { this.pins = pins; }
    @Override public String expectedSha256(String archiveFileName) { return pins.get(archiveFileName); }
}
```
Write a `FakeFetcher` the same way: implements the new `Fetcher` interface, copies a fixture archive to the requested target path, counts invocations so a test can assert "never opened a socket."

**Platform-branch coverage pattern:** `NodeArchiveVerifierTest`'s `@Nested class ProductionConstants` (lines 225-263) shows the idiom for pinned-constant assertions (`pinnedArchiveNames()` exact count/contents/immutability) — use a similar `@Nested` group for Windows-branch vs. Unix-branch pipeline assertions (D-05) so the platform axis is visually separated from the step-order axis.

**tar skip-on-Windows pattern (D-03):** no existing analog in this codebase for `@DisabledOnOs`; use JUnit 5's own annotation directly: `@DisabledOnOs(OS.WINDOWS)` on the tar.gz extraction test, or `Assumptions.assumeTrue(...)` guarding a `where(tar)`-style PATH probe. CI is `ubuntu-latest` only (verified in CONTEXT.md), so this always executes there.

### `src/test/resources/nodefixtures/` (fixture, file-I/O) — D-02

No existing fixture-resources directory in `bbj-intellij/src/test/resources/` (CONTEXT.md: "does not exist yet"). Follow `IntentionDescriptionResourcesTest.java`'s convention of resolving `src/main/resources/...` via `Paths.get("src", "main", "resources", ...).toAbsolutePath()` (lines 36-40) — mirror the same absolute-path-from-project-root idiom for `Paths.get("src", "test", "resources", "nodefixtures", ...)`. Record fixture provenance (the exact `zip`/`tar` commands used to build them) in a sibling `README` file or test javadoc, per D-02's discretion — `CompileResultJsonBoundaryTest`'s javadoc style (lines 18-27, narrative "this class exists because...") is the model for provenance-as-javadoc if that route is chosen.

### `concurrency/KeystrokeDebouncerFailurePathTest.java` (test, event-driven) — D-13

**Analog:** `concurrency/KeystrokeDebouncerTest.java` (full file above) + `concurrency/ManualScheduler.java` (full file above).

**Core throwing-task pattern** to add (extends the existing `newDebouncer` helper at lines 26-34):
```java
private static final ThreadProbe NOT_EDT = () -> false;
private static final KeystrokeDebouncer.UiThread SAME_THREAD = Runnable::run;
private static final long DELAY_MS = 300L;
```
New case: a `lookup` `Function` that throws, driven through `ManualScheduler.advanceBy(DELAY_MS)` (see `aStaleResultWhenCurrentTextChangedBeforeTheLookupRanIsNotApplied`, lines 106-126, for the shape of asserting on `lookupCount`/`applyCount` `AtomicInteger`s around a scheduler-fired lookup). Assert: (a) the debouncer/its task wrapper catches the exception rather than propagating out of the scheduled `Runnable`; (b) an error result reaches `apply` (the `BbjSettingsComponent.applyNodeLookup`/`applyHomeLookup` sink per CONTEXT.md Integration Points); (c) no pending "Checking…"/disabled-combo state is left stuck.

**Production fix site (D-13):** `BbjSettingsLookups.lookupNode`/`lookupHome` (CONTEXT.md: lines 37, 50) — add a `catch` there (or in the debouncer's task-wrapper) that constructs an error result routed through the existing `applyNodeLookup`/`applyHomeLookup` wiring (`BbjSettingsComponent.java` :190/:199 wiring, :266, :291 per CONTEXT.md). Do not touch the placeholder wording.

### `lsp/Lsp4ijCouplingCanaryTest.java` (test, reflective/structural) — D-07, D-08

**Analog:** `lsp/BbjNodeDownloaderSourceGuardTest.java` (full file above) for the guard-shape convention; `compile/CompileResultJsonBoundaryTest.java` for driving real vendor classes (`MessageJsonHandler`, `Diagnostic`) instead of mocks.

**Reflective signature-canary pattern** (new — no direct precedent, compose from the guard idiom above):
```java
Method getIcon = LSPCompletionFeature.class.getDeclaredMethod("getIcon", CompletionItem.class);
assertEquals(Icon.class, getIcon.getReturnType());
assertTrue(java.lang.reflect.Modifier.isPublic(getIcon.getModifiers()));
```
For the `@ApiStatus.Experimental` marker: reflection sees only `RuntimeVisibleAnnotations`; `@ApiStatus.Experimental` is `@Retention(CLASS)` (class-file only), so `Class.isAnnotationPresent` will return `false` even when present. Per D-17 discretion, either (a) read the marker via bytecode (`javap -v` shelled out, or a lightweight classfile parser reading the constant pool for the annotation descriptor `Lorg/jetbrains/annotations/ApiStatus$Experimental;`), or (b) record the limit in the SUMMARY and assert what reflection *can* see (superclass, method signatures). Do not silently assert `false` and call it "present."

**Text/structural guard shape to reuse** (mirror `BbjNodeDownloaderSourceGuardTest`'s `readGuardedSource`/`countOccurrences` helpers, lines 14-37 and 187-195, and `OffEdtDispatchSourceGuardTest`'s per-class `Paths.get("src","main",...)` constants, lines 22-28) for the source-guard half of each canary (D-17: assert inside a method-body window, not whole-file `indexOf`).

### `lsp/Lsp4ijImportAllowlistTest.java` (test, structural source-scan) — D-09

**Analog:** `composer/IntentionDescriptionResourcesTest.java` (full file above) — "derive the subject list from a structural source, never hard-code" idiom.

Where `IntentionDescriptionResourcesTest.registeredIntentions()` parses `plugin.xml` via `DocumentBuilderFactory` (lines 57-73, 90-110) to build the list of things that must have resources, the allowlist fence inverts this: scan `bbj-intellij/src/main/java` (walk `.java` files under that root) for `com.redhat.devtools.lsp4ij` imports and FQN uses, build a `file → {simple symbols}` map, and assert it equals an **in-test literal allowlist** (the 11 files/symbols from CONTEXT.md's "LSP4IJ coupling inventory"). This is the mirror image of `IntentionDescriptionResourcesTest`'s enumerate-then-check-each pattern: here the enumeration itself is the assertion target, checked against a fixed expected map, so drift (new coupling anywhere) fails loudly.

FQN-without-import matching (`BbjRunActionBase:131`, `BbjCompileAction:174`, per CONTEXT.md line 29): scan for the fully-qualified string `com.redhat.devtools.lsp4ij.` in addition to import statements — same `text.indexOf`/occurrence-counting idiom as the source guards above.

### `composer/ComposerRequestContractTest.java` (test, cross-language string-presence) — D-10a

**Analog:** `composer/IntentionDescriptionResourcesTest.java` — relative-path resolution to a sibling resource tree (`Paths.get("src","main","resources",...)`, lines 36-40).

Same idiom, reaching further: resolve `../bbj-vscode/src/language/composer-commands.ts` and `compile-command.ts` relative to the Gradle project dir — the CONTEXT.md note says this is "the same way `build.gradle.kts` reaches `../bbj-vscode`," so read `bbj-intellij/build.gradle.kts` first to confirm the exact relative path convention used there before hardcoding a different one in the test. For each of the 8 `@JsonRequest` string literals on `BbjComposerServer` (lines 32-65 above: `bbj/composer/catalogs`, `bbj/composer/msgbox/preview`, `bbj/composer/addwindow/preview`, `bbj/composer/msgbox/decodeCall`, `bbj/composer/addwindow/decodeCall`, `bbj/composer/addchildwindow/preview`, `bbj/composer/addchildwindow/decodeCall`, `bbj/compile`), assert the quoted literal appears in the TS source read as plain text (`Files.readString`, then `String.contains("'bbj/composer/catalogs'")` or similar quoting-tolerant check) — never parse TypeScript, per CONTEXT.md's "Specific Ideas."

### `composer/ComposerModelsJsonBoundaryTest.java` (test, request-response JSON) — D-10b

**Analog:** `compile/CompileResultJsonBoundaryTest.java` (full file above).

**Core `MessageJsonHandler` round-trip harness** (lines 36-44) generalises directly:
```java
private static CompileModels.CompileResult parse(String envelope) {
    MessageJsonHandler handler = new MessageJsonHandler(Map.of("bbj/compile",
        JsonRpcMethod.request("bbj/compile", CompileModels.CompileResult.class,
            CompileModels.CompileParams.class)));
    handler.setMethodProvider(id -> "bbj/compile");
    Message message = handler.parseMessage(envelope);
    ResponseMessage response = (ResponseMessage) message;
    return (CompileModels.CompileResult) response.getResult();
}
```
Repeat this per composer DTO (`ComposerCatalogs`, `MsgboxPreview`, `AddWindowPreview`, `MsgboxDecodeResult`, `AddWindowDecodeResult`, `AddChildWindowPreview`, `AddChildWindowDecodeResult`), swapping the method name/result/params types per the `BbjComposerServer` interface (lines 32-57 above). Include a negative-control test per the "oversized value rejected" idiom (lines 70-90) wherever a DTO carries a primitive numeric field that could overflow, and one "documents genuinely usable values, not just no-throw" test per the pattern at lines 92-109.

### `lsp/Lsp4ijVersionPinTest.java` (test, config/version-check) — D-11

**Analog (partial):** `lsp/BbjNodeDownloaderSourceGuardTest.everyPlatformAndArchitectureTheFileCanProduceHasAPinnedDigest` (lines 66-88) for the "parse a version literal out of a source/config file by locating a marker string, then verify derived facts against it" idiom:
```java
String marker = "NODE_VERSION = \"";
int versionStart = text.indexOf(marker);
versionStart += marker.length();
int versionEnd = text.indexOf('"', versionStart);
String version = text.substring(versionStart, versionEnd);
```
Apply the same marker-locate-then-substring technique to `build.gradle.kts` to extract the LSP4IJ version string (":34" per CONTEXT.md), then compare it against the LSP4IJ plugin's `plugin.xml`/manifest read off the test classpath (via `getResourceAsStream` or classloader resource lookup — no direct analog in this codebase; nearest is `IntentionDescriptionResourcesTest`'s `DocumentBuilderFactory` XML-parsing setup, lines 61-73, reusable if the LSP4IJ plugin descriptor is also XML).

## Shared Patterns

### Source-guard text-window convention (D-17)
**Source:** `lsp/BbjNodeDownloaderSourceGuardTest.java` (`readGuardedSource`, `countOccurrences`, lines 14-37, 187-195), `lsp/OffEdtDispatchSourceGuardTest.java` (per-guarded-file `Path` constants, lines 22-28).
**Apply to:** every new source guard in P01 and P03.
```java
private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "<pkg>", "<File>.java")
        .toAbsolutePath();
private static String readGuardedSource() { /* Files.readString, fail() if missing */ }
private static int countOccurrences(String text, String literal) { /* indexOf loop */ }
```
D-17 tightens this: locate the method body first (`text.indexOf("methodName(")`, take the substring up to the matching close), then assert within that window — not whole-file `indexOf`, to avoid false positives from unrelated code containing the same literal.

### Deterministic time via `ManualScheduler` (never real timers)
**Source:** `concurrency/ManualScheduler.java` (full file above), `concurrency/KeystrokeDebouncerTest.java`.
**Apply to:** all EDT-residual tests (D-12, D-13) that involve `Scheduler`/delay semantics — restart coalescing, debounced lookups, drained downloads.

### `MessageJsonHandler` round-trip via real LSP4IJ/lsp4j types, not `new Gson()`
**Source:** `compile/CompileResultJsonBoundaryTest.java`, lines 36-44.
**Apply to:** all JSON boundary tests (D-10b) and any canary that needs to prove a DTO actually deserializes the way the plugin's real connection does.

### Derive-the-subject-list-structurally, never hard-code
**Source:** `composer/IntentionDescriptionResourcesTest.java`, `registeredIntentions()` (lines 90-110) and its closing self-documenting test `thisTestDoesNotHardCodeTheIntentionClassNames` (lines 204-211).
**Apply to:** the allowlist fence (D-09, inverted direction) and the version-pin test (D-11).

## No Analog Found

None — every planned file has at least a role-match analog in the existing `bbj-intellij/src/test/java` or `src/main/java` tree (43-class suite covers this territory well per CONTEXT.md's verified state). The tar-skip-on-Windows annotation and the class-file/bytecode read for `@ApiStatus.Experimental` (`RuntimeInvisibleAnnotations`) have no in-repo precedent and must be written fresh using JUnit 5's own API / a bytecode-reading utility — flagged above rather than listed as a separate "no analog" row since they are small idioms within otherwise-analogous test classes.

## Metadata

**Analog search scope:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/{lsp,concurrency,composer,compile}/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/{lsp,composer,BbjNodeDownloader.java}`
**Files scanned:** 9 read in full (`CompileResultJsonBoundaryTest`, `NodeArchiveVerifierTest`, `BbjNodeDownloaderSourceGuardTest`, `KeystrokeDebouncerTest`, `ManualScheduler`, `IntentionDescriptionResourcesTest`, `BbjLanguageServerFactory`, `BbjComposerServer`, `OffEdtDispatchSourceGuardTest` partial) + `git ls-files` tracked-source verification on 3 production paths
**Pattern extraction date:** 2026-09-06
