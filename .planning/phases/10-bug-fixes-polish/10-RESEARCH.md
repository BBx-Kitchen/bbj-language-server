# Phase 10: Bug Fixes & Polish - Research

**Researched:** 2026-02-02
**Domain:** IntelliJ Platform plugin development - bug fixes and polish features
**Confidence:** MEDIUM

## Summary

Phase 10 resolves 7 carried-forward v1.0 issues spanning IntelliJ's comment system, bracket matching, LSP4IJ hover customization, language server lifecycle management, completion icon mapping, build artifact cleanup, and cross-platform code paths. The research reveals that most fixes require understanding IntelliJ Platform's extension point patterns rather than complex algorithms.

**Key findings:**
- Comment toggling requires custom logic beyond basic `Commenter` interface - IntelliJ's default implementation doesn't support column-0 placement with REM stacking behavior
- Bracket matching via `PairedBraceMatcher` is straightforward but requires token types from lexer
- LSP4IJ hover customization is possible through `LSPClientFeatures` but documentation is sparse - may require source code inspection
- Language server lifecycle management needs custom file close tracking and scheduled executor for grace period
- Platform icons (`AllIcons.Nodes.*`) provide native look for completion items - superior to custom SVG icons
- Cross-platform path handling in Java is well-established: `File.pathSeparator` handles `:` vs `;` automatically

**Primary recommendation:** Implement fixes in this order: (1) completion icons (simplest), (2) bracket matching (well-documented pattern), (3) comment toggling (needs custom logic), (4) META-INF cleanup (one-time task), (5) Linux review (code inspection only), (6) LS grace period (moderate complexity), (7) LSP Symbol popup (least documented, may need experimentation).

## Standard Stack

### Core IntelliJ Platform APIs

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform | 242+ | Plugin development foundation | Required for all JetBrains IDE plugins |
| LSP4IJ | Current | Language Server Protocol client | RedHat's official LSP integration for IntelliJ |
| AllIcons | Platform | Icon resources | Platform-standard icons for native UI consistency |

### Supporting APIs

| API Class | Purpose | When to Use |
|-----------|---------|-------------|
| `Commenter` | Line/block comment toggling | Implementing Cmd+/ behavior |
| `PairedBraceMatcher` | Bracket matching and highlighting | Matching (), [], {} pairs |
| `FileEditorManagerListener` | Track file open/close events | Detecting when last BBj file closes |
| `LSPClientFeatures` | Customize LSP feature behavior | Override hover, completion, diagnostics |
| `File.pathSeparator` | Cross-platform path separators | Building classpaths for ProcessBuilder |
| `MessageBus` | Event-driven communication | Project-level listeners and services |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Platform icons | Custom SVG icons | Platform icons feel native, custom icons require maintenance and don't adapt to themes |
| `FileEditorManagerListener` | Polling open editors | Message bus is event-driven and efficient, polling wastes CPU |
| `File.pathSeparator` | Platform checks with hardcoded `:` or `;` | `File.pathSeparator` handles all platforms automatically including obscure OS variants |

**Installation:**
```bash
# Already in bbj-intellij/build.gradle.kts
dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
        bundledPlugin("org.jetbrains.plugins.textmate")
        bundledPlugin("com.redhat.devtools.lsp4ij")
    }
}
```

## Architecture Patterns

### Pattern 1: Custom Line Comment Handler

**What:** Override default comment toggling to place REM at column 0 with stacking behavior
**When to use:** When language comment rules differ from IntelliJ's default indent-aware commenting

**Problem:** IntelliJ's default `Commenter` implementation respects the "Line comment at first column" setting in Code Style preferences, but BBj requires REM to always be at column 0, and CONTEXT.md specifies comment stacking (`REM REM original`) to preserve existing REM prefixes when commenting out already-commented code.

**Solution:** The basic `Commenter` interface only defines prefixes. For custom placement and stacking logic, implement a custom action or override comment handler behavior. However, the CONTEXT.md decisions may be achievable by:
1. Keep simple `Commenter` implementation returning `"REM "` prefix
2. IntelliJ's built-in comment handler actually supports column-0 placement when the Code Style setting "Line comment at first column" is enabled
3. For stacking behavior, test if IntelliJ's default implementation already stacks comments (it may - many IDEs do this by default)

**Example:**
```java
// Current implementation (simple approach)
public class BbjCommenter implements Commenter {
    @Override
    public String getLineCommentPrefix() {
        return "REM ";
    }
    // ... other methods return null
}
```

**Note:** If default IntelliJ behavior doesn't match CONTEXT.md requirements, need to examine `CommentByLineCommentHandler` source or implement custom line comment action. The setting `LINE_COMMENT_AT_FIRST_COLUMN` controls column placement.

**Sources:**
- [IntelliJ Platform Plugin SDK - Commenter](https://plugins.jetbrains.com/docs/intellij/commenter.html)
- [GitHub - Commenter.java interface](https://github.com/JetBrains/intellij-community/blob/master/platform/core-api/src/com/intellij/lang/Commenter.java)

### Pattern 2: PairedBraceMatcher for Bracket Highlighting

**What:** Implement `PairedBraceMatcher` to define which bracket pairs to highlight
**When to use:** Any language with paired delimiters (parentheses, brackets, braces)

**Example:**
```java
// Source: IntelliJ Platform documentation and community examples
public class BbjPairedBraceMatcher implements PairedBraceMatcher {
    private static final BracePair[] PAIRS = new BracePair[]{
        new BracePair(BbjTypes.LPAREN, BbjTypes.RPAREN, false),
        new BracePair(BbjTypes.LBRACKET, BbjTypes.RBRACKET, false),
        new BracePair(BbjTypes.LBRACE, BbjTypes.RBRACE, true) // structural
    };

    @Override
    public BracePair @NotNull [] getPairs() {
        return PAIRS;
    }

    @Override
    public boolean isPairedBracesAllowedBeforeType(@NotNull IElementType lbraceType,
                                                   @Nullable IElementType contextType) {
        return true; // Safe default - allows auto-insertion
    }

    @Override
    public int getCodeConstructStart(PsiFile file, int openingBraceOffset) {
        return openingBraceOffset; // Simple default - just return opening brace position
    }
}
```

**Registration in plugin.xml:**
```xml
<lang.braceMatcher language="BBj"
                    implementationClass="com.basis.bbj.intellij.BbjPairedBraceMatcher"/>
```

**Note:** BBj uses TextMate grammar for syntax highlighting. There's a known limitation that bracket matching may not work automatically with TextMate bundles - requires explicit `PairedBraceMatcher` implementation. The token types (LPAREN, RPAREN, etc.) must come from BBj's lexer (currently `BbjWordLexer`).

**Sources:**
- [PairedBraceMatcher API Documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/lang/PairedBraceMatcher.html)
- [BracePair API Documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/lang/BracePair.html)
- [TextMate Bundle support vs. paired braces discussion](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206216639-TextMate-Bundle-support-vs-paired-braces)

### Pattern 3: Language Server Grace Period with File Close Tracking

**What:** Keep language server alive for 30 seconds after last BBj file closes, cancel shutdown if file reopens
**When to use:** Avoiding expensive server restart cycles when users quickly switch between files

**Example:**
```java
// Track per-project BBj file editor count
@Service(Service.Level.PROJECT)
public final class BbjServerService {
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> shutdownTask;
    private int openBbjFileCount = 0;

    public BbjServerService(Project project) {
        // Subscribe to file editor events
        MessageBusConnection connection = project.getMessageBus().connect();
        connection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER,
            new FileEditorManagerListener() {
                @Override
                public void fileOpened(@NotNull FileEditorManager source,
                                      @NotNull VirtualFile file) {
                    if (isBbjFile(file)) {
                        openBbjFileCount++;
                        cancelShutdown(); // File opened during grace period
                    }
                }

                @Override
                public void fileClosed(@NotNull FileEditorManager source,
                                      @NotNull VirtualFile file) {
                    if (isBbjFile(file)) {
                        openBbjFileCount--;
                        if (openBbjFileCount == 0) {
                            scheduleShutdown();
                        }
                    }
                }
            });
    }

    private void scheduleShutdown() {
        shutdownTask = scheduler.schedule(() -> {
            // Shutdown language server
            // Update status bar to remove "idle" hint
        }, 30, TimeUnit.SECONDS);
        // Update status bar to show "idle" hint
    }

    private void cancelShutdown() {
        if (shutdownTask != null && !shutdownTask.isDone()) {
            shutdownTask.cancel(false);
            // Update status bar to remove "idle" hint
        }
    }
}
```

**Key considerations:**
- Per-project scope: Each IntelliJ project has its own `BbjServerService` instance
- Thread safety: `ScheduledExecutorService` handles timer management safely
- Status bar updates: Use existing `BbjStatusBarWidget` to show grace period state
- File type check: `isBbjFile(file)` checks file extension matches `.bbj`, `.bbl`, `.bbjt`, `.src`

**Sources:**
- [How to track file and document editors in an IntelliJ plugin](https://www.plugin-dev.com/intellij/editor/editor-open-close/)
- [FileEditorManagerListener API Documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/openapi/fileEditor/FileEditorManager.html)

### Pattern 4: Platform Icon Mapping for Completion Items

**What:** Map LSP `CompletionItemKind` to IntelliJ platform icons from `AllIcons.Nodes.*`
**When to use:** Displaying completion items with native-looking icons consistent with rest of IDE

**Example:**
```java
// Replace custom BbjIcons with platform AllIcons
import com.intellij.icons.AllIcons;

public final class BbjCompletionFeature {
    public static @Nullable Icon getIcon(@Nullable CompletionItemKind kind) {
        if (kind == null) return null;

        return switch (kind) {
            case Function, Method -> AllIcons.Nodes.Method;
            case Class -> AllIcons.Nodes.Class;
            case Interface -> AllIcons.Nodes.Interface;
            case Variable, Field -> AllIcons.Nodes.Field;
            case Property -> AllIcons.Nodes.Property;
            case Keyword -> AllIcons.Nodes.Static; // or custom icon for keywords
            case Array -> AllIcons.Nodes.DataSchema;
            case Event -> AllIcons.Nodes.Lambda;
            case Package, Module -> AllIcons.Nodes.Package;
            default -> null; // Let LSP4IJ use its default icon
        };
    }
}
```

**Available platform icons for completion:**
- `AllIcons.Nodes.Method` - Methods and functions
- `AllIcons.Nodes.Class` - Class definitions
- `AllIcons.Nodes.Interface` - Interfaces
- `AllIcons.Nodes.Field` - Fields and variables
- `AllIcons.Nodes.Property` - Properties
- `AllIcons.Nodes.Parameter` - Function parameters
- `AllIcons.Nodes.Constant` - Constants
- `AllIcons.Nodes.Lambda` - Lambda expressions
- `AllIcons.Nodes.Static` - Static markers (could represent keywords)
- `AllIcons.Nodes.Package` - Packages/modules

**Java interop distinction:** For Java class/method completions from java-interop, LSP4IJ may already use Java-specific icons. Verify in testing whether explicit Java icon mapping is needed.

**Cleanup:** Remove orphaned icon files from `src/main/resources/icons/`:
- `bbj-function.svg` (replaced by `AllIcons.Nodes.Method`)
- `bbj-variable.svg` (replaced by `AllIcons.Nodes.Field`)
- `bbj-keyword.svg` (replaced by `AllIcons.Nodes.Static` or custom if needed)

**Sources:**
- [AllIcons.Nodes API Documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/icons/AllIcons.Nodes.html)
- [IntelliJ Platform Icons - Official Reference](https://intellij-icons.jetbrains.design/)
- [Working with Icons - Plugin SDK](https://plugins.jetbrains.com/docs/intellij/icons.html)

### Anti-Patterns to Avoid

- **Don't manually place REM at indentation level:** BBj standard is column 0, not indent-aware
- **Don't implement hover suppression by catching exceptions:** Use proper LSP4IJ feature APIs
- **Don't use hardcoded `:` or `;` for classpath separators:** Use `File.pathSeparator` for cross-platform support
- **Don't poll for open editor count:** Use `FileEditorManagerListener` message bus for events
- **Don't create custom icons when platform icons exist:** Platform icons adapt to themes and feel native

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line comment toggling | Custom text manipulation logic | `Commenter` interface with possible custom handler | IntelliJ handles edge cases: empty lines, partial selections, undo/redo |
| Bracket matching | Manual cursor position tracking | `PairedBraceMatcher` | IntelliJ handles highlighting, navigation (Ctrl+Shift+M), and smart selection |
| Cross-platform paths | Platform detection + if/else for `:` vs `;` | `File.pathSeparator` constant | Handles all platforms including obscure OS variants, already tested |
| File close events | Timer polling editor tabs | `FileEditorManagerListener` | Event-driven, no CPU waste, integrates with IntelliJ's editor lifecycle |
| Icon theming | Multiple SVG variants (light/dark) | `AllIcons.*` platform icons | Automatically adapt to UI themes, HiDPI-aware, maintained by JetBrains |
| Scheduled tasks | Manual thread management with `Timer` | `ScheduledExecutorService` | Thread-safe, handles cancellation, integrates with Java concurrency utilities |

**Key insight:** IntelliJ Platform provides robust APIs for all these scenarios. Custom implementations introduce bugs (edge cases, thread safety, theme compatibility) and maintenance burden. When platform APIs exist, use them - they're battle-tested across millions of users.

## Common Pitfalls

### Pitfall 1: Assuming Commenter Interface Controls Placement

**What goes wrong:** Implementing `Commenter.getLineCommentPrefix()` doesn't guarantee column-0 placement or comment stacking behavior - IntelliJ's comment handler respects Code Style preferences and may place comments at indentation level.

**Why it happens:** The `Commenter` interface only defines comment delimiters, not placement logic. IntelliJ's `CommentByLineCommentHandler` checks the `LINE_COMMENT_AT_FIRST_COLUMN` setting, which defaults to `false` (indent-aware) in many language styles.

**How to avoid:** After implementing `BbjCommenter`, test with indented code to verify column-0 placement. If IntelliJ places REM at indentation level, investigate:
1. Does BBj have a Code Style profile that sets `LINE_COMMENT_AT_FIRST_COLUMN = true`?
2. Can the setting be forced programmatically for BBj language?
3. Does custom comment action override need to be implemented?

**Warning signs:** Comments appear indented when toggling Cmd+/ on indented code; uncommenting doesn't work on column-0 REM comments.

**Sources:**
- [Line Comment not adhering to cursor position or indentation - JetBrains Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360003240399-Line-Comment-not-adhering-to-cursor-position-or-indentation)

### Pitfall 2: Missing Token Types for Bracket Matcher

**What goes wrong:** `PairedBraceMatcher` implementation compiles but bracket matching doesn't work at runtime - no highlighting when cursor is adjacent to brackets.

**Why it happens:** BBj currently uses `BbjWordLexer` (a minimal lexer for word-level PSI elements) which may not define separate token types for LPAREN, RPAREN, LBRACKET, RBRACKET, LBRACE, RBRACE. TextMate grammar handles syntax highlighting but doesn't expose token types to IntelliJ's bracket matching system.

**How to avoid:**
1. Check if `BbjTokenTypes` or `BbjTypes` class exists with bracket token constants
2. If not, extend `BbjWordLexer` to recognize bracket characters as distinct token types
3. Alternatively, implement a simple `IElementType` enum for brackets without full lexer overhaul
4. Test by placing cursor next to `(`, `[`, `{` and verifying matching bracket highlights

**Warning signs:** Bracket highlighting works in other languages but not in BBj files; `getPairs()` returns empty array or throws NullPointerException for token types.

**Sources:**
- [Auto-closing braces in a custom language, BraceMatcher not working - JetBrains Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000393430-Auto-closing-braces-in-a-custom-language-BraceMatcher-not-working)

### Pitfall 3: LSP4IJ Hover Feature Customization is Underdocumented

**What goes wrong:** Attempting to suppress "LSP Symbol ..." placeholder text by searching official docs yields no clear API - multiple approaches exist but none are obvious.

**Why it happens:** LSP4IJ is actively evolving (0.14.0 released recently) and hover customization is a newer feature. The `LSPClientFeatures` class supports feature customization but documentation focuses on completion and diagnostics, not hover suppression.

**How to avoid:**
1. Examine `LSPClientFeatures` source code in LSP4IJ GitHub repository
2. Look for `setHoverFeature()` or similar methods to override hover provider
3. Check if returning `null` from hover feature disables placeholder text
4. Alternative: Override `LSPHoverFeature#isEnabled()` to disable hover entirely (may not be desired)
5. Test multiple approaches since docs are sparse

**Warning signs:** No `setHoverFeature()` method found in `LSPClientFeatures`; overriding methods has no effect; placeholder text still appears on Cmd+hover.

**Recommendation:** Allocate extra time for experimentation. If suppression proves too complex, consider showing meaningful hover content instead (e.g., symbol type from LSP) rather than suppressing entirely.

**Sources:**
- [LSP4IJ LSPSupport.md - Developer Documentation](https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPSupport.md)
- [LSP4IJ DeveloperGuide.md - Feature Customization](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md)

### Pitfall 4: Linux Path Detection Assumes Standard Locations

**What goes wrong:** Code assumes Node.js is at `/usr/bin/node` or `/usr/local/bin/node`, but many Linux users install via nvm, n, or distro-specific locations.

**Why it happens:** Linux has no single standard for Node.js installation - system package managers use `/usr/bin`, manual installs use `/usr/local/bin`, version managers use `~/.nvm` or `~/.local/share/nvm`, and some distros symlink `/usr/bin/node` to `/usr/bin/nodejs`.

**How to avoid:**
1. `BbjNodeDetector.detectNodePath()` already uses `PathEnvironmentVariableUtil.findInPath("node")` - this searches the user's entire PATH, not hardcoded locations
2. Verify that `PathEnvironmentVariableUtil` on Linux respects the user's shell PATH (not just system default PATH)
3. Test detection logic with different Node.js installations: apt-installed, nvm-managed, manually compiled
4. Fallback to user-configured `BbjSettings.nodeJsPath` if detection fails

**Warning signs:** Node.js detection works on macOS but fails on Linux even though `which node` succeeds in terminal; users with nvm-installed Node.js get "Node.js not found" errors.

**Note:** Since Linux runtime testing is unavailable, code review should verify `PathEnvironmentVariableUtil` is the correct API (it is - it's IntelliJ's standard way to find executables in PATH).

**Sources:**
- [Node.js detection Linux standard paths discussion](https://github.com/nodejs/node-v0.x-archive/issues/3911)
- [How to fix /usr/bin/env: node: No such file or directory](https://www.uptimia.com/questions/how-to-fix-usrbinenv-node-no-such-file-or-directory-error)

### Pitfall 5: Classpath Separator Hardcoded Instead of Platform-Aware

**What goes wrong:** Building classpaths with hardcoded `;` works on Windows but fails on Linux/macOS; hardcoding `:` has the opposite problem.

**Why it happens:** Developers test on one platform and forget classpath separators differ: Windows uses `;` while Unix-like systems use `:`.

**How to avoid:**
```java
// WRONG: Hardcoded separator
String classpath = jar1 + ":" + jar2; // Fails on Windows

// RIGHT: Platform-aware
String classpath = jar1 + File.pathSeparator + jar2; // Works everywhere
```

**Check these locations in codebase:**
- `BbjLanguageServer.java` - Building server classpath for Node.js process
- Any `GeneralCommandLine` that passes `-cp` or `-classpath` arguments
- BBj installation detection code that parses existing classpaths

**Warning signs:** Classpath parsing errors on one platform but not another; "ClassNotFoundException" on Linux but not macOS (or vice versa).

**Sources:**
- [Java Classpath Syntax in Linux vs. Windows - Baeldung](https://www.baeldung.com/java-classpath-syntax)
- [Java File separator, pathSeparator - DigitalOcean](https://www.digitalocean.com/community/tutorials/java-file-separator-separatorchar-pathseparator-pathseparatorchar)

### Pitfall 6: Stale META-INF Causes Build Confusion

**What goes wrong:** Two `plugin.xml` files exist: `bbj-intellij/META-INF/plugin.xml` (stale) and `bbj-intellij/src/main/resources/META-INF/plugin.xml` (active). Gradle uses the resources version but developers might edit the wrong one.

**Why it happens:** During plugin development, IntelliJ's project wizard or early Gradle configurations may have created `META-INF/` at the project root. Later, the standard Gradle layout moved it to `src/main/resources/META-INF/`. The old file wasn't deleted.

**How to avoid:**
1. Delete `bbj-intellij/META-INF/` directory entirely
2. Verify `build.gradle.kts` uses `sourceSets.main.resources` correctly
3. Add `bbj-intellij/META-INF/` to `.gitignore` if it's a generated artifact (it's not - it's just orphaned)
4. Document in README that `src/main/resources/META-INF/plugin.xml` is the canonical location

**Warning signs:** Changes to `plugin.xml` don't take effect; built plugin JAR contains unexpected plugin descriptor; Git shows uncommitted changes in `META-INF/plugin.xml` that seem unrelated to recent edits.

**Sources:**
- [IDEA re-compile deletes build system artifacts - JetBrains Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360000638400-IDEA-re-compile-deletes-build-system-artifacts)

## Code Examples

### Example 1: Custom Commenter with Column-0 Placement

```java
// Source: IntelliJ Platform Commenter API + custom logic
package com.basis.bbj.intellij;

import com.intellij.lang.Commenter;
import org.jetbrains.annotations.Nullable;

/**
 * BBj line commenter - places REM at column 0, not at indentation level.
 * Handles comment stacking (REM REM ...) for uncommenting blocks that
 * contain existing REM comments.
 */
public class BbjCommenter implements Commenter {
    @Nullable
    @Override
    public String getLineCommentPrefix() {
        return "REM ";
    }

    @Nullable
    @Override
    public String getBlockCommentPrefix() {
        return null; // BBj doesn't have block comments
    }

    @Nullable
    @Override
    public String getBlockCommentSuffix() {
        return null;
    }

    @Nullable
    @Override
    public String getCommentedBlockCommentPrefix() {
        return null;
    }

    @Nullable
    @Override
    public String getCommentedBlockCommentSuffix() {
        return null;
    }
}
```

**Note:** If IntelliJ's default comment handler doesn't place REM at column 0 or doesn't stack comments, a custom action extending `CommentByLineCommentAction` may be needed. Test first before implementing custom logic.

### Example 2: PairedBraceMatcher Implementation

```java
// Source: IntelliJ Platform PairedBraceMatcher pattern
package com.basis.bbj.intellij;

import com.intellij.lang.BracePair;
import com.intellij.lang.PairedBraceMatcher;
import com.intellij.psi.PsiFile;
import com.intellij.psi.tree.IElementType;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Defines bracket pairs for BBj: (), [], {}
 * Enables bracket matching highlight and Ctrl+Shift+M navigation.
 */
public class BbjPairedBraceMatcher implements PairedBraceMatcher {
    private static final BracePair[] PAIRS = new BracePair[]{
        new BracePair(BbjTokenTypes.LPAREN, BbjTokenTypes.RPAREN, false),
        new BracePair(BbjTokenTypes.LBRACKET, BbjTokenTypes.RBRACKET, false),
        new BracePair(BbjTokenTypes.LBRACE, BbjTokenTypes.RBRACE, true) // structural
    };

    @Override
    public BracePair @NotNull [] getPairs() {
        return PAIRS;
    }

    @Override
    public boolean isPairedBracesAllowedBeforeType(@NotNull IElementType lbraceType,
                                                   @Nullable IElementType contextType) {
        // Safe default: allow auto-closing brackets
        return true;
    }

    @Override
    public int getCodeConstructStart(PsiFile file, int openingBraceOffset) {
        // Simple implementation: return opening brace position
        // Could be extended to find start of function/if statement
        return openingBraceOffset;
    }
}
```

**Register in plugin.xml:**
```xml
<lang.braceMatcher language="BBj"
                    implementationClass="com.basis.bbj.intellij.BbjPairedBraceMatcher"/>
```

### Example 3: File Close Tracking for LS Grace Period

```java
// Source: IntelliJ Platform FileEditorManagerListener pattern
package com.basis.bbj.intellij.lsp;

import com.intellij.openapi.components.Service;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.FileEditorManagerListener;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.util.messages.MessageBusConnection;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Tracks BBj file open/close events to implement 30-second grace period
 * before shutting down language server when last file is closed.
 */
@Service(Service.Level.PROJECT)
public final class BbjServerLifecycleService {
    private final Project project;
    private final ScheduledExecutorService scheduler =
        Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> shutdownTask;
    private int openBbjFileCount = 0;

    public BbjServerLifecycleService(@NotNull Project project) {
        this.project = project;
        MessageBusConnection connection = project.getMessageBus().connect();
        connection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER,
            new FileEditorManagerListener() {
                @Override
                public void fileOpened(@NotNull FileEditorManager source,
                                      @NotNull VirtualFile file) {
                    if (isBbjFile(file)) {
                        synchronized (BbjServerLifecycleService.this) {
                            openBbjFileCount++;
                            cancelShutdown();
                        }
                    }
                }

                @Override
                public void fileClosed(@NotNull FileEditorManager source,
                                      @NotNull VirtualFile file) {
                    if (isBbjFile(file)) {
                        synchronized (BbjServerLifecycleService.this) {
                            openBbjFileCount--;
                            if (openBbjFileCount == 0) {
                                scheduleShutdown();
                            }
                        }
                    }
                }
            });
    }

    private boolean isBbjFile(@NotNull VirtualFile file) {
        String ext = file.getExtension();
        return ext != null &&
               (ext.equals("bbj") || ext.equals("bbl") ||
                ext.equals("bbjt") || ext.equals("src"));
    }

    private synchronized void scheduleShutdown() {
        shutdownTask = scheduler.schedule(() -> {
            // TODO: Shutdown language server
            // TODO: Update BbjStatusBarWidget to show server stopped
        }, 30, TimeUnit.SECONDS);
        // TODO: Update BbjStatusBarWidget to show "idle" hint
    }

    private synchronized void cancelShutdown() {
        if (shutdownTask != null && !shutdownTask.isDone()) {
            shutdownTask.cancel(false);
            shutdownTask = null;
            // TODO: Update BbjStatusBarWidget to remove "idle" hint
        }
    }
}
```

### Example 4: Platform Icon Mapping

```java
// Source: IntelliJ Platform AllIcons.Nodes + LSP CompletionItemKind
package com.basis.bbj.intellij.lsp;

import com.intellij.icons.AllIcons;
import org.eclipse.lsp4j.CompletionItemKind;
import org.jetbrains.annotations.Nullable;

import javax.swing.Icon;

/**
 * Maps LSP CompletionItemKind to IntelliJ platform icons.
 * Uses native platform icons for consistency with other languages.
 */
public final class BbjCompletionFeature {
    private BbjCompletionFeature() {}

    public static @Nullable Icon getIcon(@Nullable CompletionItemKind kind) {
        if (kind == null) return null;

        return switch (kind) {
            case Function, Method -> AllIcons.Nodes.Method;
            case Class -> AllIcons.Nodes.Class;
            case Interface -> AllIcons.Nodes.Interface;
            case Variable, Field -> AllIcons.Nodes.Field;
            case Property -> AllIcons.Nodes.Property;
            case Keyword -> AllIcons.Nodes.Static; // Static marker for keywords
            case Array -> AllIcons.Nodes.DataSchema;
            case Event -> AllIcons.Nodes.Lambda;
            case Package, Module -> AllIcons.Nodes.Package;
            case Constant -> AllIcons.Nodes.Constant;
            case Enum -> AllIcons.Nodes.Enum;
            case EnumMember -> AllIcons.Nodes.Field;
            default -> null; // Use LSP4IJ default
        };
    }
}
```

### Example 5: Cross-Platform Classpath Building

```java
// Source: Java File API + IntelliJ ProcessBuilder pattern
import java.io.File;
import java.util.List;

public class BbjClasspathBuilder {
    /**
     * Builds a platform-aware classpath string from JAR paths.
     * Uses ':' on Unix, ';' on Windows automatically.
     */
    public static String buildClasspath(List<String> jarPaths) {
        return String.join(File.pathSeparator, jarPaths);
    }

    /**
     * Example usage in language server startup
     */
    public static void startLanguageServer(String bbjHome) {
        List<String> jars = List.of(
            bbjHome + "/lib/BBj.jar",
            bbjHome + "/lib/BBjUtil.jar"
        );
        String classpath = buildClasspath(jars);

        GeneralCommandLine cmd = new GeneralCommandLine(
            "node", "main.cjs",
            "--bbj-home", bbjHome,
            "--classpath", classpath  // Platform-correct separator
        );
        // ... launch process
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SVG icons for completion | Platform icons (`AllIcons.Nodes.*`) | 2025+ (IntelliJ Platform icons site launched) | Better theme adaptation, native look, less maintenance |
| Polling for file close events | `FileEditorManagerListener` message bus | IntelliJ Platform standard since early versions | Event-driven, no CPU waste |
| Platform-specific path handling with if/else | `File.pathSeparator` constant | Java 1.0+ (always standard) | Simpler code, handles all platforms |
| Custom LSP client implementations | LSP4IJ plugin framework | 2023+ (LSP4IJ released) | Standardized LSP integration, less boilerplate |
| Hardcoded language server shutdown on file close | Grace period with scheduled shutdown | Best practice emerging 2024+ | Better UX - avoids restart churn |

**Deprecated/outdated:**
- `FileEditorManagerAdapter`: Deprecated because `FileEditorManagerListener` migrated to JDK8 default methods - implement interface directly
- `ActionUpdateThread.OLD_EDT`: Deprecated in IntelliJ Platform 2024+ - must override `getActionUpdateThread()` and return `EDT` or `BGT`
- Custom icon loading without HiDPI support: Modern platform icons are vector-based and HiDPI-aware

## Open Questions

### Question 1: Does IntelliJ's default Commenter support REM stacking?

**What we know:** IntelliJ's comment toggling typically adds one comment prefix per line. When uncommenting, it strips one prefix. This naturally creates stacking behavior: commenting already-commented code produces `REM REM original`.

**What's unclear:** Whether IntelliJ's implementation handles edge cases like:
- Uncommenting `REM    code` when there's no space after REM
- Uncommenting `REMcode` (no space, possible if user manually wrote it)
- Mixed indentation in selection (some lines REM at column 0, some not)

**Recommendation:** Implement simple `BbjCommenter` and test thoroughly. If edge cases fail, implement custom comment action that handles REM stripping logic explicitly.

### Question 2: How to suppress "LSP Symbol ..." hover placeholder?

**What we know:** LSP4IJ shows "LSP Symbol <name>" placeholder when hovering with Cmd held. This is likely a fallback when no hover content is available from the language server.

**What's unclear:**
- Is the placeholder generated by LSP4IJ or IntelliJ Platform's documentation provider?
- Can it be suppressed by returning empty content from language server?
- Does `LSPClientFeatures` have a method to disable hover entirely?
- Can hover provider be overridden to return `null` or empty documentation?

**Recommendation:** Research in this order:
1. Check if BBj language server returns hover content - if not, implement hover provider in LS
2. Examine LSP4IJ source code for `LSPHoverProvider` or `LSPHoverFeature`
3. Look for `setHoverFeature()` or similar in `LSPClientFeatures.createClientFeatures()`
4. Test if returning `null` from custom hover provider suppresses placeholder
5. If suppression is complex, consider showing meaningful content instead (symbol type, documentation)

### Question 3: What token types does BbjWordLexer provide?

**What we know:** `BbjWordLexer` is a minimal lexer created in Phase 3 to provide word-level PSI elements for fixing Cmd+hover range issues. It likely tokenizes identifiers but may not distinguish bracket characters.

**What's unclear:** Whether `BbjWordLexer` already defines:
- `LPAREN`, `RPAREN` tokens for parentheses
- `LBRACKET`, `RBRACKET` tokens for square brackets
- `LBRACE`, `RBRACE` tokens for curly braces

**Recommendation:** Inspect `BbjWordLexer` and `BbjTokenTypes` classes. If bracket tokens don't exist, extend the lexer to recognize them. This is likely a small change - adding 6 token type constants and updating lexer logic to return those types when encountering `(`, `)`, `[`, `]`, `{`, `}`.

## Sources

### Primary (HIGH confidence)

- [IntelliJ Platform Plugin SDK - Commenter](https://plugins.jetbrains.com/docs/intellij/commenter.html) - Official documentation on comment toggling
- [GitHub - Commenter.java interface](https://github.com/JetBrains/intellij-community/blob/master/platform/core-api/src/com/intellij/lang/Commenter.java) - Commenter API source code
- [PairedBraceMatcher API Documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/lang/PairedBraceMatcher.html) - Bracket matching interface
- [AllIcons.Nodes API Documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/icons/AllIcons.Nodes.html) - Platform icon constants
- [IntelliJ Platform Icons - Official Reference](https://intellij-icons.jetbrains.design/) - Visual icon browser
- [Java File separator, pathSeparator - DigitalOcean](https://www.digitalocean.com/community/tutorials/java-file-separator-separatorchar-pathseparator-pathseparatorchar) - Cross-platform path handling
- [Java Classpath Syntax in Linux vs. Windows - Baeldung](https://www.baeldung.com/java-classpath-syntax) - Classpath separator differences

### Secondary (MEDIUM confidence)

- [How to track file and document editors in an IntelliJ plugin](https://www.plugin-dev.com/intellij/editor/editor-open-close/) - FileEditorManagerListener pattern
- [LSP4IJ LSPSupport.md - Developer Documentation](https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPSupport.md) - LSP feature implementation
- [LSP4IJ DeveloperGuide.md - Feature Customization](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md) - LSPClientFeatures usage
- [Line Comment not adhering to cursor position - JetBrains Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360003240399-Line-Comment-not-adhering-to-cursor-position-or-indentation) - Column placement behavior
- [TextMate Bundle support vs. paired braces discussion](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206216639-TextMate-Bundle-support-vs-paired-braces) - TextMate limitations

### Tertiary (LOW confidence)

- [LSP4IJ Release 0.14.0 Discussion](https://github.com/redhat-developer/lsp4ij/discussions/1085) - Recent feature additions (not specific to hover)
- [Node.js detection Linux paths discussion](https://github.com/nodejs/node-v0.x-archive/issues/3911) - Historical issue about Node.js location detection
- Various JetBrains support forum posts about comment placement, bracket matching, and editor listeners

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs are IntelliJ Platform standard and well-documented
- Architecture patterns: MEDIUM - Most patterns documented, LSP4IJ hover customization needs source inspection
- Comment toggling: MEDIUM - Basic API is clear, column-0 placement and stacking may need testing
- Bracket matching: HIGH - Standard pattern, well-documented, multiple examples
- LS grace period: HIGH - FileEditorManagerListener is standard, pattern is straightforward
- Completion icons: HIGH - AllIcons.Nodes is documented, mapping is simple enum switch
- Linux paths: MEDIUM - Code review only, no runtime testing available
- META-INF cleanup: HIGH - Simple file deletion task
- LSP hover suppression: LOW - Documentation sparse, may require source code inspection

**Research date:** 2026-02-02
**Valid until:** 60 days for stable APIs (Commenter, PairedBraceMatcher, FileEditorManagerListener), 14 days for LSP4IJ features (actively evolving project)
