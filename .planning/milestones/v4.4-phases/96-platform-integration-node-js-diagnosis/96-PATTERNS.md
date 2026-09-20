# Phase 96: Platform Integration & Node.js Diagnosis - Pattern Map

**Mapped:** 2026-09-19
**Files analyzed:** 12 (new + modified)
**Analogs found:** 11 / 12 (all files have at least a partial/role match; one — `NodePresentation` — has two co-equal analogs)

All files are under `bbj-intellij/src/main/java` (and one test under `bbj-intellij/src/test/java`), consistent with CLAUDE.md's note that this phase is the exception to "nearly all development happens in `bbj-vscode/`". All analog paths below were verified git-tracked via `git ls-files` (not gitignored mirrors).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lsp/BbjNotificationProviderBase.java` (NEW) | component (platform EP base) | request-response (render-on-demand) | `ui/BbjStatusBarWidgetBase.java` | role-match (different platform interface, same base+hooks shape) |
| `.../BbjMissingHomeNotificationProvider.java` (MODIFIED: extends base) | component (thin subclass) | request-response | itself (pre-image) + `ui/BbjStatusBarWidget.java`-style subclass shape | exact (behavior-preserving refactor) |
| `.../BbjMissingNodeNotificationProvider.java` (MODIFIED: extends base, calls resolver not `NodeAvailability`) | component (thin subclass) | request-response | itself (pre-image); decision call swaps to `NodeExecutableResolver.resolve` | exact (call-site swap + base extraction) |
| `.../BbjJavaInteropNotificationProvider.java` (MODIFIED: extends base) | component (thin subclass) | request-response | itself (pre-image); already models the "presentation seam" convention D-08 imitates | exact |
| `ui/BbjServerCrashNotificationProvider.java` (MODIFIED: extends base, extension guard → file-type guard, `fileEditor` ctor, `DumbAware`) | component (thin subclass) | request-response | the other three providers (post-fix) + `ui/BbjFileVisibility.java` for the guard | role-match |
| `lsp/NodeExecutableResolver.java` (MODIFIED: new `Reason.BELOW_MINIMUM_VERSION`/`CACHE_UNAVAILABLE`, new 6-arg `resolve`/`validate` overload) | service (plain-Java decision engine) | transform (candidate → Resolution) | itself (extend in place); overload pattern models `NodeInstallIntegrity`'s "new capability without breaking the pinned 4-arg contract" | exact |
| `lsp/NodePresentation.java` (NEW) | utility (platform-free presentation seam) | transform (Reason/Source → text+actions) | `interop/InteropStatusPresentation.java` (primary) and `config/ConfigReloadPresentation.java` (secondary) | exact |
| `BbjTextMateBundleProvider.java` (MODIFIED: stable dir, version marker, skip-copy, sweep) | provider (platform EP, cache-backed) | file-I/O (cache read/write) | `BbjNodeDownloader.java`'s `getNodeDataDirectory()`/`getCachedNodePath()` (primary); `lsp/NodeInstallIntegrity.java`'s sidecar convention (secondary, for the invalidation-marker shape) | role-match |
| `BbjColorSettingsPage.java` (DELETED) | config (Settings EP) | — | n/a — deletion, no analog needed | n/a |
| `plugin.xml` (MODIFIED: remove `<colorSettingsPage>`, no other changes needed) | config | — | itself | exact |
| `ui/BbjFileVisibility.java` (MODIFIED: widen `isBbjProgramFileTypeName` to `public`) | utility (predicate) | transform | itself (pre-image); `showsForFileTypeNames`'s existing widen-for-cross-package-caller precedent in the same file | exact |
| `lsp/NodeInstallPipeline.java` (MODIFIED: WR-02 outer-`finally` swallow, WR-04 exact zip-entry match, optionally IN-02 reuse) | service (file-I/O pipeline) | file-I/O | itself; `deleteRecursivelyQuietly` (same file) is the model for the WR-02 fix | exact |
| Test: `NodeExecutableResolverTest` companion for new overload / new `Reason`s (MODIFIED/NEW cases) | test | transform | `NodeExecutableResolverTest.java` (existing, 24 methods) | exact |
| Test: notification-provider source guard(s) (NEW/MODIFIED, replacing `BbjMissingNodeNotificationSourceGuardTest`'s invalidated pin) | test (source guard) | transform | `ui/BbjStatusBarWidgetSourceGuardTest.java` | exact (structural template) |

## Pattern Assignments

### `lsp/BbjNotificationProviderBase.java` (NEW component, request-response)

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java`

**Imports pattern** (lines 1-20 of the analog):
```java
package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjSettingsConfigurable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.FileEditorManagerEvent;
import com.intellij.openapi.fileEditor.FileEditorManagerListener;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.CustomStatusBarWidget;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.ui.components.JBLabel;
import com.intellij.util.messages.MessageBusConnection;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
```
For the new base, swap the platform interface import to `com.intellij.ui.EditorNotificationProvider` / `com.intellij.ui.EditorNotificationPanel` / `com.intellij.openapi.fileEditor.FileEditor` / `com.intellij.openapi.vfs.VirtualFile` / `com.intellij.openapi.project.DumbAware`, and keep the `ui/BbjFileVisibility` import (same package, no import needed if colocated).

**Core "abstract base + typed hooks" pattern** (lines 35-99, class declaration through hook signatures):
```java
public abstract class BbjStatusBarWidgetBase<S> implements CustomStatusBarWidget {

    protected final Project project;
    ...
    protected BbjStatusBarWidgetBase(@NotNull Project project) {
        ...
        // Follow editor-tab switches so the widget shows/hides immediately, not only on the
        // next status change (#610)
        this.messageBusConnection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, new FileEditorManagerListener() {
            @Override
            public void selectionChanged(@NotNull FileEditorManagerEvent event) {
                updateVisibility();
            }
        });
        ...
    }

    /** Backs {@link #ID()}. */
    protected abstract String widgetId();
    protected abstract void subscribeToStatusTopic(@NotNull MessageBusConnection messageBusConnection);
    protected abstract S currentStatus();
    protected abstract Icon iconFor(S status);
    protected abstract String textFor(S status);
    protected abstract String tooltipFor(S status, String text);
    protected abstract void addPopupItems(JPopupMenu popup);
```
Translate directly: the new base implements `EditorNotificationProvider` (not generic over `S` — there is no shared "status" type across the four providers, only a shared file-type guard and panel-construction convention), and exposes exactly one `final` template method (`collectNotificationData`) that runs the guard then delegates to an abstract hook, exactly as `updateStatus(S)` is the base's one sequencing point. See the concrete sketch already vetted in RESEARCH.md's Pattern 1 (`96-RESEARCH.md` lines 232-266) — reuse it verbatim as the starting shape:
```java
public abstract class BbjNotificationProviderBase implements EditorNotificationProvider, DumbAware {

    @Override
    public final @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {
        if (!BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())) {
            return null;
        }
        return buildPanel(project, file);
    }

    protected abstract @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file);

    protected static EditorNotificationPanel newPanel(
            @NotNull FileEditor fileEditor, EditorNotificationPanel.Status status, String text) {
        EditorNotificationPanel panel = new EditorNotificationPanel(fileEditor, status);
        panel.setText(text);
        return panel;
    }
}
```

**"Final template method, one call site" convention to preserve for the source guard** (mirrors `updateVisibility()`'s single delegation, lines 118-120):
```java
private void updateVisibility() {
    panel.setVisible(BbjFileVisibility.showsForSelection(FileEditorManager.getInstance(project).getSelectedFiles()));
}
```
The new base's guard call (`BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())`) must likewise appear **exactly once**, inside `collectNotificationData`'s body — this is what the new/rewritten source guard will pin, patterned on `BbjStatusBarWidgetSourceGuardTest`'s `baseUpdateVisibilityDelegatesToSharedPredicateExactlyOnce` (see Test section below).

**Dispose/lifecycle note:** `EditorNotificationProvider` has no `dispose()`/`install()` lifecycle analogous to `CustomStatusBarWidget` — the base needs none of `BbjStatusBarWidgetBase`'s `messageBusConnection`/`dispose()` machinery. Do not port that part; the notification-provider EP is purely a per-call `collectNotificationData` render, no subscription state.

---

### Thin subclasses: `BbjMissingHomeNotificationProvider.java`, `BbjMissingNodeNotificationProvider.java`, `BbjJavaInteropNotificationProvider.java`, `ui/BbjServerCrashNotificationProvider.java`

**Analog:** each other (pre-image), plus the file-type-guard convention already correct in three of the four.

**Guard pattern already correct in three providers** (e.g. `BbjMissingHomeNotificationProvider.java:28-30`):
```java
if (file.getFileType() != BbjFileType.INSTANCE) {
    return null;
}
```
Note: this uses `!= BbjFileType.INSTANCE`, which D-11's canonical_refs explicitly reject as the long-term shared definition (two definitions in the tree) — but it is file-type-resolved, not extension-based, so it is the *behavior* D-09 wants; the base replaces it with `BbjFileVisibility.isBbjProgramFileTypeName(...)` per D-11, retiring this per-file check.

**The one broken guard to fix** (`ui/BbjServerCrashNotificationProvider.java:29-34`, the D-09/D-11 target):
```java
// Only show on BBj files
String extension = file.getExtension();
if (extension == null ||
    !(extension.equals("bbj") || extension.equals("bbl") ||
      extension.equals("bbjt") || extension.equals("src"))) {
    return null;
}
```
Delete this block entirely — the base's guard supersedes it. Also fix, in the same file, the three D-10 divergences:
- `implements EditorNotificationProvider` → add `, DumbAware` (line 21; the other three already have it, e.g. `BbjMissingHomeNotificationProvider.java:22`).
- `new EditorNotificationPanel(EditorNotificationPanel.Status.Error)` (line 44, bare constructor) → `new EditorNotificationPanel(fileEditor, EditorNotificationPanel.Status.Error)`, matching every other provider's `fileEditor`-arg constructor (e.g. `BbjMissingHomeNotificationProvider.java:46-47`).
- Keep `Status.Error` as the per-subclass hook value (D-10: `Status` stays a subclass concern).

**Panel + action-label convention every subclass keeps** (`BbjMissingHomeNotificationProvider.java:45-53`):
```java
return fileEditor -> {
    EditorNotificationPanel panel = new EditorNotificationPanel(
            fileEditor, EditorNotificationPanel.Status.Warning);
    panel.setText("BBj home directory is not configured");
    panel.createActionLabel("Configure BBj Home", () ->
            ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, BbjSettingsConfigurable.class));
    return panel;
};
```
This per-provider action-label shape stays in each subclass (per RESEARCH.md's Pattern 1 translation note) — only the outer guard moves to the base.

**`BbjMissingNodeNotificationProvider`'s decision call-site swap** (current, lines 37-46, to be replaced per D-05):
```java
NodeAvailability.Decision decision = NodeAvailability.decide(
        nodeJsPath,
        NodeAvailability.REAL_FILES,
        BbjNodeVersionCache.SESSION::getVersion,
        BbjNodeDetector::meetsMinimumVersion,
        BbjNodeDetector::detectNodePath,
        BbjNodeDownloader::getCachedNodePath);
if (!NodeAvailability.bannerNeeded(decision)) {
    return null;
}
```
Replace with a call into the new 6-arg `NodeExecutableResolver.resolve(...)` overload (see below), then route the `Resolution`'s rejections/reason through `NodePresentation` for text and action set (D-08).

**`BbjJavaInteropNotificationProvider`'s presentation-seam call, already the model D-08 imitates** (lines 48-51):
```java
String bannerText = InteropStatusPresentation.bannerText(currentStatus.name());
if (bannerText == null) {
    return null;
}
```

---

### `lsp/NodeExecutableResolver.java` (MODIFIED: sixth validation step, new overload, new `Reason`s)

**Analog:** itself — extend in place, following the file's own established enum/record/`validate()` shape.

**Existing `Reason` enum to extend** (lines 30-36):
```java
public enum Reason {
    MALFORMED,
    NOT_ABSOLUTE,
    MISSING,
    NOT_A_FILE,
    NOT_EXECUTABLE
}
```
Add `BELOW_MINIMUM_VERSION` (D-06) and `CACHE_UNAVAILABLE` (D-07, attached to `Source.CACHED`).

**Existing `validate()` five-step core to extend with a sixth step** (lines 181-210):
```java
private static String validate(Source source, String candidate, PathProbe probe,
                                 List<Rejected> rejections) {
    if (candidate == null || candidate.isBlank()) {
        return null;
    }
    ...
    if (!probe.isExecutable(candidate)) {
        rejections.add(new Rejected(source, Reason.NOT_EXECUTABLE, candidate));
        return null;
    }
    return candidate;
}
```
RESEARCH.md's Pattern 2/Code Examples section gives the exact sixth-step shape and the additive-overload mechanism (new 6-arg `resolve`/`validate` taking `Function<String,String> versionOf` and `Predicate<String> meetsMinimum`, with the existing 4-arg `resolve` delegating to it with no-op collaborators) — copy that sketch verbatim; it is already verified against the pinned 24-test `NodeExecutableResolverTest` contract.

**`describe()`/`render()` switch pattern to extend for the new `Reason`s** (lines 227-235):
```java
private static String describe(Reason reason) {
    return switch (reason) {
        case MALFORMED -> "could not be parsed as a path";
        case NOT_ABSOLUTE -> "is not an absolute path";
        case MISSING -> "does not exist";
        case NOT_A_FILE -> "is not a regular file";
        case NOT_EXECUTABLE -> "is not executable";
    };
}
```
Add cases for `BELOW_MINIMUM_VERSION` and `CACHE_UNAVAILABLE` in the same `switch` (Java requires exhaustiveness here, so the compiler enforces this).

**D-07's "CACHE_UNAVAILABLE" push site** — per RESEARCH.md Pitfall 1, this must be pushed by the *caller* that knows the `IOException` occurred (inside/near `BbjNodeDownloader.getCachedNodePath()`, see below), not inside `validate()`'s generic null-skip — `validate()` only needs the new `Reason` constant to exist.

---

### `lsp/NodePresentation.java` (NEW platform-free presentation seam, D-08)

**Analog (primary):** `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java` (full file, 74 lines)

**Convention to copy exactly** — file-level javadoc naming the seam convention (lines 3-10):
```java
/**
 * Platform-free presentation logic for java-interop status rendering: the status-bar label, its
 * tooltip, and the editor-banner sentence (#587). This class holds no IntelliJ platform import,
 * so plain JUnit drives every branch -- the same seam convention as {@code
 * com.basis.bbj.intellij.config.ConfigReloadPresentation}. Takes the status as a plain
 * status-name String rather than {@code BbjJavaInteropService.InteropStatus}, so this class stays
 * free of the {@code ui} package.
 */
public final class InteropStatusPresentation {

    private InteropStatusPresentation() {
    }
```
`NodePresentation` should follow the identical shape: `public final class`, private no-arg constructor, private `static final String`/enum-name constants for whichever token vocabulary it takes as plain values (per A3 in RESEARCH.md, take the real `Source`/`Reason` enum types directly since this seam already lives in `lsp` alongside them — a stronger option than stringifying, and still zero `com.intellij` import since `Source`/`Reason` are plain enums).

**"null means no banner" convention** (lines 56-73, `bannerText`):
```java
/**
 * The editor-banner sentence for {@code statusName}, or {@code null} when no banner should
 * show. {@code CONNECTED} and {@code CHECKING} return {@code null} -- the provider treats
 * {@code null} as "no banner". ...
 */
public static String bannerText(String statusName) {
    if (STATUS_DISCONNECTED.equals(statusName)) {
        return "Start BBjServices for Java completions";
    }
    if (STATUS_WRONG_PEER.equals(statusName)) {
        return "The configured java-interop port is held by a process that is not "
                + "java-interop -- check the port in Settings";
    }
    return null;
}
```
`NodePresentation`'s text method follows this exact shape, switching on `Reason` (or `Rejected`) instead of a status-name string. D-08 additionally needs an **action-set** method returning which action ids to offer (e.g. a `List<String>` or a small enum set) — no existing seam in this codebase returns an action set (both `InteropStatusPresentation` and `ConfigReloadPresentation` return only text/labels), so this part is a new addition to the convention, not a copy; keep it in the same plain-static, `com.intellij`-free style.

**Analog (secondary):** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` (full file, 70 lines) — the origin of the convention `InteropStatusPresentation`'s own javadoc cites; useful for the "map a token to null-safe label, default on unrecognized" idiom (lines 24-38):
```java
public static String reasonLabel(String reason) {
    if (reason == null) {
        return null;
    }
    switch (reason) {
        case REASON_PREFIX_CHANGED:
            return "config file changed";
        ...
        default:
            return null;
    }
}
```

---

### `BbjTextMateBundleProvider.java` (MODIFIED: stable dir + version marker + skip-copy + sweep, PLAT-01)

**Analog (primary):** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`

**Stable-directory pattern to mirror exactly** (`BbjNodeDownloader.java:149-153`):
```java
private static @NotNull Path getNodeDataDirectory() throws IOException {
    Path dataDir = Paths.get(PathManager.getPluginsPath(), "bbj-intellij-data", "nodejs");
    Files.createDirectories(dataDir);
    return dataDir;
}
```
Per RESEARCH.md Pattern 3, the new method is the same shape with `"textmate"` as the leaf subdirectory: `Paths.get(PathManager.getPluginsPath(), "bbj-intellij-data", "textmate")`.

**"Read cache, else compute" gate pattern to mirror** (`BbjNodeDownloader.java:49-56`, `getCachedNodePath()`):
```java
public static @Nullable Path getCachedNodePath() {
    try {
        return productionPipeline().cachedNodePath();
    } catch (IOException e) {
        // Directory creation failed, return null
        return null;
    }
}
```
For PLAT-01 this becomes: read the version-marker file; if it matches the running plugin version, return the existing `PluginBundle` referencing the stable directory without touching the filesystem further (the "skip-copy" criterion); otherwise fall through to copying the five bundle files and writing the marker last.

**Current per-launch temp-directory code being replaced** (`BbjTextMateBundleProvider.java:27-48`, full method — this is literally the code under change, not an analog, but is the exact block whose shape (URL-resource-stream copy loop, `try`/`catch IOException`) should be preserved for the five-file-copy step while the temp-directory allocation is replaced by the stable directory):
```java
@NotNull
@Override
public List<PluginBundle> getBundles() {
    try {
        Path bundleDir = Files.createTempDirectory(
            Path.of(PathManager.getTempPath()), "textmate-bbj");

        for (String file : BUNDLE_FILES) {
            URL resource = getClass().getClassLoader()
                .getResource(BUNDLE_RESOURCE_PATH + file);
            Objects.requireNonNull(resource,
                "Missing TextMate bundle resource: " + BUNDLE_RESOURCE_PATH + file);
            try (InputStream stream = resource.openStream()) {
                Path target = bundleDir.resolve(file);
                Files.createDirectories(target.getParent());
                Files.copy(stream, target);
            }
        }

        return List.of(new PluginBundle("BBj", bundleDir));
    } catch (IOException e) {
        throw new RuntimeException("Failed to extract BBj TextMate bundle", e);
    }
}
```
Keep the per-file `URL`/`InputStream`/`Files.copy` loop verbatim for populating the stable directory; only the directory-acquisition line and the "skip if marker matches" gate around it change.

**Analog (secondary, for the invalidation-marker/sidecar shape):** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallIntegrity.java` — the `.sha256`-sidecar convention (full file read; see `sidecarFor`, lines 33-35, and the "absent/disagreeing record reads as not cached, never as an error" idiom, lines 67-77/108-116). RESEARCH.md's Pattern 3 explicitly recommends **not** copying the digest/hash mechanism here (packaged-resource invalidation is version-keyed, not content-keyed) — use this file only as the model for "a small sidecar file recording an invalidation key, read defensively, absent/mismatched degrading to recompute rather than to an error," e.g.:
```java
// NodeInstallIntegrity.matchesRecordedDigest's defensive-read idiom (lines 79-116) —
// translate "digest" to "plugin version string" for the new marker file:
try {
    ...
} catch (java.io.IOException | RuntimeException e) {
    return false; // "not cached", never "fail" or "trust anyway"
}
```

**Sweep helper to reuse rather than hand-roll:** `NodeInstallPipeline.deleteRecursively(Path)` is package-private in `lsp` (per RESEARCH.md Open Question 2) — widen to `public` and call it from the (default-package) `BbjTextMateBundleProvider`, rather than writing a second recursive walker; this is the same "don't hand-roll" principle the Don't-Hand-Roll table applies to `deleteRecursivelyQuietly`.

---

### `ui/BbjFileVisibility.java` (MODIFIED: widen `isBbjProgramFileTypeName` to public, D-11)

**Analog:** itself — the file already contains the precedent for this exact kind of widen.

**Existing precedent to follow, in the same file** (lines 28-32, widening `showsForFileTypeNames`):
```java
/**
 * Public so the {@code interop} package's poll-gate tests can feed the empty-selection edge
 * case into {@code InteropPollPolicy} without a {@code VirtualFile} (#593). {@link
 * #showsForSelection} stays package-private -- it is only ever called from within {@code ui}.
 */
public static boolean showsForFileTypeNames(@NotNull List<String> fileTypeNames) {
```
**Method being widened** (lines 24-26, currently package-private):
```java
static boolean isBbjProgramFileTypeName(@Nullable String fileTypeName) {
    return BBJ_FILE_TYPE_NAME.equals(fileTypeName);
}
```
Change `static` → `public static`, and add a javadoc comment in the same style explaining the cross-package caller (the new notification base), following exactly the phrasing precedent above.

---

### `lsp/NodeInstallPipeline.java` (MODIFIED: WR-02, WR-04, optional IN-02)

**Analog:** itself — `deleteRecursivelyQuietly` (same file, per RESEARCH.md line ~301) is the direct model for WR-02's fix (swallow-and-log a cleanup failure so it never masks the primary exception). This file was not re-read in full this session since RESEARCH.md already quotes the exact three fix sites verbatim (Pitfalls 4/5 and the IN-02 Code Example) — reuse those quoted snippets directly:

- WR-02 fix target: `NodeInstallPipeline.java:207-209`, wrap the outer `Files.deleteIfExists(tempFile)` the same way `deleteRecursivelyQuietly` (lines 301-307) already swallows `IOException`.
- WR-04 fix target: `NodeInstallPipeline.java:225`, replace the loose `entry.getName().endsWith("node.exe")` with the exact relative-path match built from the same three literals `archiveFileName()` (lines 141-144) already assembles.
- IN-02 (optional fold): `NodeInstallPipeline.java:280-282`, reuse `target.nodeExecutableName()` instead of re-deriving `"node.exe"`/`"node"` — RESEARCH.md's Code Examples section has the verbatim before/after.

---

### Tests

**`NodeExecutableResolverTest`** — the existing 24-method test class must keep passing with **zero edits** (canonical_refs constraint); add new test methods (not modifications) for the new overload, `BELOW_MINIMUM_VERSION`, and `CACHE_UNAVAILABLE`, following the existing file's per-scenario naming convention (e.g. `aRejectedConfiguredValueFallsThroughToAValidCachedValue`, cited in RESEARCH.md line ~308) for the new methods' names.

**Notification-provider source guard(s)** — analog: `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` (full file, 163 lines, read above). Copy its structural idioms directly for the new/rewritten guard replacing `BbjMissingNodeNotificationSourceGuardTest`:

- Private `readSource(Path)` + `UncheckedIOExceptionForTest` helper (lines 41-56) — copy per-file, not shared (per Phase 93 D-12 convention cited in CLAUDE.md-adjacent memory).
- `countOccurrences(String, String)` literal counter (lines 58-66) — copy verbatim.
- `sliceBetween(String, String, String)` index-slice technique to assert a token lives inside a specific extracted method body (lines 74-80) — use this to pin the new base's guard call inside `collectNotificationData`'s body specifically, exactly as `baseUpdateVisibilityDelegatesToSharedPredicateExactlyOnce` (lines 123-130) pins `BbjFileVisibility.showsForSelection(` inside `updateVisibility()`'s body:
```java
@Test
void baseUpdateVisibilityDelegatesToSharedPredicateExactlyOnce() {
    String text = readSource(BBJ_STATUS_BAR_WIDGET_BASE_SOURCE);
    String updateVisibilityRegion = sliceBetween(text,
            "private void updateVisibility()", "private void showPopupMenu(");
    assertEquals(1, countOccurrences(updateVisibilityRegion, "BbjFileVisibility.showsForSelection("),
            "the base's updateVisibility() must delegate to the shared decision exactly once");
}
```
- Negative-assertion-at-full-breadth idiom (lines 94-102, `widgetSourceNeverReDerivesVisibilityByExtension`) — the new guard's equivalent must assert `getExtension(` and `"bbl"`/hardcoded-extension literals appear **zero** times across all four subclasses and the new base, exactly mirroring this parameterized test's shape:
```java
@ParameterizedTest
@ValueSource(strings = {"BbjStatusBarWidget", "BbjJavaInteropStatusBarWidget", "BbjStatusBarWidgetBase"})
void widgetSourceNeverReDerivesVisibilityByExtension(String simpleName) {
    String text = readSource(sourceForOrBase(simpleName));
    assertEquals(0, countOccurrences(text, "getExtension("),
            simpleName + " must not re-derive visibility by file extension");
    assertEquals(0, countOccurrences(text, "\"bbl\""),
            simpleName + " must not hard-code the bbl extension");
}
```
- The "exactly one `getFileType()` read inside `BbjFileVisibility.java` itself" pin (lines 143-149, `sharedPredicateReadsFileTypeExactlyOnceAndNeverExtension`) is **already verified untouched** by D-11 per CONTEXT.md's own note — do not re-pin it differently, just confirm it still passes after the widen.

## Shared Patterns

### Platform-free presentation seam (applies to `NodePresentation`)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java` (full), `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` (full)
**Apply to:** `lsp/NodePresentation.java` (new)
```java
public final class InteropStatusPresentation {
    private InteropStatusPresentation() {}
    // ... private static final String constants for the input vocabulary ...
    public static String bannerText(String statusName) { /* null-safe, null means "no banner" */ }
}
```

### Resolved-file-type guard, never extension (applies to all four notification providers + the new base)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` (full, 50 lines)
**Apply to:** `lsp/BbjNotificationProviderBase.java`, and by removal from `ui/BbjServerCrashNotificationProvider.java`
```java
public static boolean isBbjProgramFileTypeName(@Nullable String fileTypeName) {
    return BBJ_FILE_TYPE_NAME.equals(fileTypeName);
}
```
Never `file.getExtension()`; always `file.getFileType().getName()`.

### Base + thin-subclass consolidation (applies to the notification-provider base)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java` (full, 161 lines)
**Apply to:** `lsp/BbjNotificationProviderBase.java` and its four subclasses
Abstract base owns the identical shape and exactly one `final` template/sequencing method; every difference is a typed abstract hook, never a single "do everything" override — this is what keeps a wiring mistake a compile error rather than a silent runtime no-op.

### Additive overload over signature-breaking change (applies to `NodeExecutableResolver`)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java:155-172` (the existing 4-arg `resolve`)
**Apply to:** the new 6-arg `resolve`/`validate` overload
Keep the old signature as a documented "no version gating" delegator calling the new signature with no-op collaborators (`path -> null`, `version -> true`), so the ~24 pinned `NodeExecutableResolverTest` call sites need zero edits.

### Best-effort cleanup that never masks the primary exception (applies to WR-02's fix)
**Source:** `NodeInstallPipeline.deleteRecursivelyQuietly` (same file, `NodeInstallPipeline.java:301-307`, quoted in full in `96-RESEARCH.md` Pitfall 5)
**Apply to:** `NodeInstallPipeline.java`'s outer `finally { Files.deleteIfExists(tempFile); }` at lines 207-209

### Per-file private source-guard helpers (applies to any new/rewritten notification-provider guard)
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` (full, 163 lines)
**Apply to:** the guard replacing `BbjMissingNodeNotificationSourceGuardTest`
Each guard owns its own private copies of `readSource`, `countOccurrences`, `sliceBetween` — no shared test-utility class, per Phase 93 D-12's convention.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `BbjColorSettingsPage.java` deletion + `plugin.xml:236` deregistration | config | — | Deletion, not creation — no analog needed; verify via `git ls-files`/`grep` that no other file references the nine `TextAttributesKey` constants (already confirmed in CONTEXT.md D-01) |
| D-08's action-set-varies-by-reason half of `NodePresentation` (the part beyond text) | utility | transform | No existing `*Presentation` seam in this codebase returns an action-id set today (`InteropStatusPresentation`/`ConfigReloadPresentation` return only text/labels) — this is new ground within an otherwise-established convention, not a gap in the convention itself |

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (including `ui/`, `lsp/`, `interop/`, `config/` subpackages) and `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/`
**Files read in full this session:** `BbjStatusBarWidgetBase.java`, `InteropStatusPresentation.java`, `ConfigReloadPresentation.java`, `NodeExecutableResolver.java`, `BbjNodeDownloader.java`, `NodeInstallIntegrity.java`, `BbjMissingHomeNotificationProvider.java`, `BbjMissingNodeNotificationProvider.java`, `BbjJavaInteropNotificationProvider.java`, `BbjServerCrashNotificationProvider.java`, `BbjTextMateBundleProvider.java`, `BbjFileVisibility.java`, `BbjStatusBarWidgetSourceGuardTest.java` — 13 files, all verified git-tracked via `git ls-files`
**Pattern extraction date:** 2026-09-19
