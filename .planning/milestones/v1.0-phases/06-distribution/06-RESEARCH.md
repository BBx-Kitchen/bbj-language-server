# Phase 6: Distribution - Research

**Researched:** 2026-02-01
**Domain:** IntelliJ Platform Plugin Distribution & Packaging
**Confidence:** MEDIUM

## Summary

IntelliJ Platform Gradle Plugin 2.11.0 (released January 26, 2026) provides comprehensive tooling for packaging plugins as distributable ZIP files. The standard workflow uses `buildPlugin` task which depends on `prepareSandbox` to create a marketplace-ready archive in `build/distributions/`. Plugin metadata (vendor, description, changelog) can be configured via `patchPluginXml` task using the `intellijPlatform.pluginConfiguration {}` extension, with support for loading content from external files or inline HTML.

For language server bundling, the current VSCode extension already uses esbuild to create a single `main.cjs` bundle (1.8MB) with all dependencies inlined. This can be copied at build time into the plugin's resources and extracted to a temporary directory at runtime using the plugin's classloader. Node.js dependency management requires detecting the runtime OS using `System.getProperty("os.name")` and `System.getProperty("os.arch")`, then downloading the appropriate binary from `https://nodejs.org/dist/v{VERSION}/` if system Node.js is unavailable or incompatible.

Cross-platform compatibility is verified manually since IntelliJ Plugin Verifier only checks API compatibility, not OS-specific behavior. Welcome notifications can be implemented using the Notifications API with PropertiesComponent for first-launch detection.

**Primary recommendation:** Use IntelliJ Platform Gradle Plugin's standard tasks (`buildPlugin`, `patchPluginXml`) with marketplace-ready metadata, bundle pre-built `main.cjs` from VSCode extension, implement Node.js download fallback using platform detection, and verify cross-platform functionality through manual testing on macOS, Windows, and Linux.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform Gradle Plugin | 2.11.0 | Build, package, and publish IntelliJ plugins | Official JetBrains build tool, released Jan 26 2026 |
| esbuild | 0.25.12 | Bundle language server into single file | Already used in bbj-vscode, extremely fast bundler |
| LSP4IJ | 0.19.0 | LSP integration layer | Already integrated in Phase 4, handles server lifecycle |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Gradle Changelog Plugin | Latest | Manage CHANGELOG.md and auto-populate changeNotes | Marketplace best practice for version history |
| PropertiesComponent | Platform API | Persist first-launch detection flag | Built-in persistence for plugin settings |
| Notifications API | Platform API | Display welcome balloon on first launch | Standard way to notify users in IntelliJ |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js download on-demand | Bundle Node.js in plugin ZIP | Download: smaller ZIP, works with system Node; Bundle: larger ZIP (40-50MB per platform), no network required |
| Single universal ZIP | Per-platform ZIPs | Universal: simpler distribution, user doesn't choose platform; Per-platform: smaller downloads but more complexity |
| Manual changelog in plugin.xml | Gradle Changelog Plugin | Manual: simpler but error-prone; Plugin: automated but adds dependency |

**Installation:**
```bash
# Already in build.gradle.kts
plugins {
    id("org.jetbrains.intellij.platform") version "2.11.0"
}

# Optional for changelog management
plugins {
    id("org.jetbrains.changelog") version "2.2.1"
}
```

## Architecture Patterns

### Recommended Project Structure

```
bbj-intellij/
├── src/main/
│   ├── java/com/basis/bbj/intellij/     # Plugin code
│   └── resources/
│       ├── META-INF/
│       │   ├── plugin.xml               # Base plugin descriptor
│       │   ├── pluginIcon.svg          # Plugin icon (40x40, 80x80, 130x130)
│       │   └── description.html         # Full plugin description (marketplace)
│       ├── language-server/
│       │   └── main.cjs                 # Bundled language server (copied at build)
│       └── textmate/bbj-bundle/         # TextMate grammars (copied at build)
├── build.gradle.kts                     # Build configuration
├── CHANGELOG.md                         # Version history (optional, for Gradle Changelog Plugin)
└── build/
    └── distributions/                   # buildPlugin output directory
        └── bbj-intellij-0.1.0-alpha.zip # Final distributable
```

### Pattern 1: Language Server Bundling

**What:** Copy pre-built language server bundle at Gradle build time, extract at plugin runtime
**When to use:** Language server is built separately (e.g., in sibling VSCode extension project)
**Example:**

```kotlin
// build.gradle.kts
val copyLanguageServer by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
    }
    into(layout.buildDirectory.dir("resources/main/language-server"))
}

tasks.named("processResources") {
    dependsOn(copyLanguageServer)
}
```

**Runtime extraction:**
```java
// Extract bundled resource to temp directory
ClassLoader classLoader = getClass().getClassLoader();
InputStream stream = classLoader.getResourceAsStream("language-server/main.cjs");
Path tempFile = Files.createTempFile("bbj-ls-", ".cjs");
Files.copy(stream, tempFile, StandardCopyOption.REPLACE_EXISTING);
return tempFile.toAbsolutePath().toString();
```

### Pattern 2: Node.js On-Demand Download

**What:** Detect platform, download Node.js binary if not found on system
**When to use:** Plugin needs Node.js but shouldn't bundle it (size constraint)
**Example:**

```java
// Platform detection
String osName = System.getProperty("os.name").toLowerCase();
String osArch = System.getProperty("os.arch").toLowerCase();

String platform, arch;
if (osName.contains("win")) {
    platform = "win";
    arch = osArch.contains("64") ? "x64" : "x86";
} else if (osName.contains("mac")) {
    platform = "darwin";
    arch = osArch.contains("aarch64") || osArch.contains("arm") ? "arm64" : "x64";
} else {
    platform = "linux";
    arch = osArch.contains("64") ? "x64" : "x86";
}

// Download URL pattern
String version = "v20.18.1"; // LTS version
String url = String.format(
    "https://nodejs.org/dist/%s/node-%s-%s-%s.tar.gz",
    version, version, platform, arch
);

// Storage location
Path pluginDataDir = Paths.get(PathManager.getPluginsPath())
    .resolve("bbj-intellij/nodejs");
```

**Source:** [Node.js distribution structure](https://nodejs.org/dist/), [Platform detection patterns](https://dirask.com/posts/Java-detect-operating-system-name-Windows-Linux-macOS-zjMJa1)

### Pattern 3: Marketplace Metadata Configuration

**What:** Configure vendor, description, and changelog via `patchPluginXml` for marketplace readiness
**When to use:** Preparing plugin for JetBrains Marketplace publishing
**Example:**

```kotlin
// build.gradle.kts
intellijPlatform {
    pluginConfiguration {
        name = "BBj Language Support"
        version = "0.1.0-alpha"

        vendor {
            name = "BASIS International Ltd."
            email = "support@basis.cloud"
            url = "https://basis.cloud"
        }

        // Load description from external HTML file
        description = file("src/main/resources/META-INF/description.html")
            .readText()

        // Load latest changelog entry (if using Gradle Changelog Plugin)
        changeNotes = provider {
            changelog.renderItem(
                changelog.getLatest(),
                Changelog.OutputType.HTML
            )
        }

        ideaVersion {
            sinceBuild = "242"
            untilBuild = "243.*"
        }
    }
}
```

**Source:** [IntelliJ Platform Extension docs](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html), [Marketplace best practices](https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html)

### Pattern 4: First-Launch Welcome Notification

**What:** Show one-time welcome balloon with quick links on first plugin launch
**When to use:** Improving initial user experience, directing users to settings/docs
**Example:**

```java
// Check first launch using PropertiesComponent
PropertiesComponent props = PropertiesComponent.getInstance();
String FIRST_LAUNCH_KEY = "com.basis.bbj.intellij.firstLaunchShown";

if (!props.getBoolean(FIRST_LAUNCH_KEY, false)) {
    // Create notification
    Notification notification = new Notification(
        "BBj Language Server",
        "BBj Language Support Installed",
        "Configure BBj Home in Settings > Languages & Frameworks > BBj",
        NotificationType.INFORMATION
    );

    // Add action link
    notification.addAction(new NotificationAction("Open Settings") {
        @Override
        public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
            ShowSettingsUtil.getInstance().showSettingsDialog(
                e.getProject(),
                BbjSettingsConfigurable.class
            );
        }
    });

    Notifications.Bus.notify(notification);

    // Mark as shown
    props.setValue(FIRST_LAUNCH_KEY, true);
}
```

**Source:** [Notifications API](https://plugins.jetbrains.com/docs/intellij/notifications.html), [PropertiesComponent patterns](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206127289-Plugin-location)

### Anti-Patterns to Avoid

- **Bundling platform-specific binaries in universal ZIP:** Bloats plugin size unnecessarily; use on-demand download instead
- **Hard-coding Node.js version paths:** Breaks when user has different Node.js installation; use auto-detection
- **Inline HTML in plugin.xml:** Hard to maintain; use external `description.html` loaded via `patchPluginXml`
- **Skipping `buildSearchableOptions` unconditionally:** Only disable if plugin has no custom settings
- **Manual changelog synchronization:** Error-prone; use Gradle Changelog Plugin or automated extraction

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP download with progress | Custom URLConnection wrapper | IntelliJ Platform's `DownloadableFileService` API | Handles retries, progress, cancellation, platform-specific SSL |
| Plugin ZIP structure | Custom archive builder | `buildPlugin` Gradle task | Handles META-INF layout, lib dependencies, resource bundling automatically |
| Platform detection | String parsing of `os.name` variations | `SystemInfo` class from IntelliJ Platform API | Handles edge cases (Windows 32-bit on 64-bit, ARM variants, etc.) |
| Temporary file cleanup | Manual File.delete() on shutdown | `PathManager.getTempPath()` + `FileUtil.createTempDirectory()` | IDE cleans temp directories automatically, handles permissions |
| Notification grouping | Manual NotificationGroup registration | Extension point in plugin.xml | Allows user configuration, proper IDE integration |

**Key insight:** IntelliJ Platform provides battle-tested APIs for common plugin tasks. Custom solutions miss edge cases and platform-specific quirks that the Platform API handles.

## Common Pitfalls

### Pitfall 1: Incorrect ClassLoader for Resource Loading

**What goes wrong:** Resources not found in deployed plugin despite working in development sandbox
**Why it happens:** Development unpacks JARs while deployment keeps them compressed; wrong classloader used
**How to avoid:** Always use plugin's classloader: `pluginDescriptor.getPluginClassLoader().getResourceAsStream(path)`
**Warning signs:** Resources load in `runIde` but fail after `buildPlugin` and manual installation

**Source:** [Access Resources bundled within Plugin](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206104839-Access-Resources-bundled-within-Plugin)

### Pitfall 2: Node.js Architecture Mismatch

**What goes wrong:** Downloaded Node.js binary won't execute because architecture doesn't match
**Why it happens:** `os.arch` returns JRE architecture, not OS architecture (32-bit JRE on 64-bit OS)
**How to avoid:** Use `System.getenv("PROCESSOR_ARCHITECTURE")` on Windows, prefer system Node.js detection first
**Warning signs:** "Cannot execute binary" errors on Windows 64-bit with 32-bit JRE

**Source:** [System.getProperty os.arch bug discussion](https://coderanch.com/t/582096/java/System-getProperty-os-arch-bug)

### Pitfall 3: Plugin Verifier False Confidence

**What goes wrong:** Plugin passes `verifyPlugin` but fails on different platforms
**Why it happens:** Verifier only checks API compatibility, not runtime behavior or OS-specific paths
**How to avoid:** Manual testing on macOS, Windows, Linux is required for cross-platform plugins
**Warning signs:** API verification passes but users report "file not found" errors on specific platforms

**Source:** [Verifying Plugin Compatibility](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html)

### Pitfall 4: PropertiesComponent Key Collisions

**What goes wrong:** Plugin settings conflict with other plugins or get overwritten
**Why it happens:** PropertiesComponent uses global namespace; keys without prefixes collide
**How to avoid:** Always prefix keys with plugin ID: `"com.basis.bbj.intellij.settingName"`
**Warning signs:** Settings mysteriously reset or change when other plugins are installed

**Source:** [Should I prefix properties in PropertiesComponent?](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206114579-Should-I-prefix-properties-in-PropertiesComponent-)

### Pitfall 5: changeNotes Exceeds Size Limit

**What goes wrong:** Plugin upload to Marketplace fails with "change notes too large" error
**Why it happens:** Marketplace limits changeNotes to ~5000 characters; full CHANGELOG.md exceeds this
**How to avoid:** Use `changelog.getLatest()` to extract only current version, or link to external changelog
**Warning signs:** Local build succeeds but `publishPlugin` task fails with metadata validation error

**Source:** [Gradle Changelog Plugin README](https://github.com/JetBrains/gradle-changelog-plugin)

## Code Examples

Verified patterns from official sources:

### Build Configuration for Distribution

```kotlin
// build.gradle.kts
// Source: IntelliJ Platform Gradle Plugin 2.11.0 documentation
plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.11.0"
    id("org.jetbrains.changelog") version "2.2.1" // Optional
}

group = "com.basis.bbj"
version = "0.1.0-alpha"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
        bundledPlugin("org.jetbrains.plugins.textmate")
        plugin("com.redhat.devtools.lsp4ij:0.19.0")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

intellijPlatform {
    pluginConfiguration {
        name = "BBj Language Support"
        version = project.version.toString()

        vendor {
            name = "BASIS International Ltd."
            email = "support@basis.cloud"
            url = "https://basis.cloud"
        }

        description = file("src/main/resources/META-INF/description.html").readText()

        ideaVersion {
            sinceBuild = "242"
            untilBuild = "243.*"
        }
    }
}

tasks {
    buildPlugin {
        // Output: build/distributions/bbj-intellij-0.1.0-alpha.zip
    }

    buildSearchableOptions {
        // Disable if plugin has no settings UI
        enabled = false
    }

    patchPluginXml {
        sinceBuild.set("242")
        untilBuild.set("243.*")
    }
}
```

### esbuild Configuration for Language Server

```javascript
// esbuild.mjs
// Source: bbj-vscode/esbuild.mjs (already working in VSCode extension)
import * as esbuild from 'esbuild';

const ctx = await esbuild.context({
    entryPoints: ['src/language/main.ts'],
    outdir: 'out/language',
    outExtension: { '.js': '.cjs' },
    bundle: true,
    target: "es6",
    format: 'cjs',
    loader: { '.ts': 'ts' },
    platform: 'node',
    sourcemap: false,
    minify: true
});

await ctx.rebuild();
ctx.dispose();
```

### Runtime Node.js Detection and Download

```java
// Platform detection using SystemInfo (IntelliJ Platform API)
import com.intellij.openapi.util.SystemInfo;

public class NodeJsDetector {

    private static final String MIN_NODE_VERSION = "16.0.0"; // Langium requirement

    public Path detectOrDownloadNodeJs() {
        // 1. Check system Node.js
        Path systemNode = findSystemNodeJs();
        if (systemNode != null && checkVersion(systemNode)) {
            return systemNode;
        }

        // 2. Check cached download
        Path cachedNode = getCachedNodeJs();
        if (cachedNode != null && Files.exists(cachedNode)) {
            return cachedNode;
        }

        // 3. Download on-demand
        return downloadNodeJs();
    }

    private Path downloadNodeJs() {
        String platform = getPlatformName();
        String arch = getArchitecture();
        String version = "v20.18.1"; // Latest LTS

        String fileName = String.format(
            "node-%s-%s-%s.tar.gz",
            version, platform, arch
        );

        String url = String.format(
            "https://nodejs.org/dist/%s/%s",
            version, fileName
        );

        // Use IntelliJ Platform's download service
        Path downloadDir = getPluginDataDirectory().resolve("nodejs");
        Files.createDirectories(downloadDir);

        // Download and extract using Platform API
        // (see "Don't Hand-Roll" section - use DownloadableFileService)
        return downloadDir.resolve("node");
    }

    private String getPlatformName() {
        if (SystemInfo.isWindows) return "win";
        if (SystemInfo.isMac) return "darwin";
        if (SystemInfo.isLinux) return "linux";
        throw new UnsupportedOperationException("Unsupported OS: " + SystemInfo.OS_NAME);
    }

    private String getArchitecture() {
        if (SystemInfo.isMac && SystemInfo.isAarch64) return "arm64";
        if (SystemInfo.isIntel64 || SystemInfo.isAmd64) return "x64";
        return "x86";
    }

    private Path getPluginDataDirectory() {
        // Plugin data directory for downloaded binaries
        return Paths.get(PathManager.getPluginsPath())
            .resolve("bbj-intellij/data");
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gradle IntelliJ Plugin 1.x | IntelliJ Platform Gradle Plugin 2.x | July 2024 | New plugin structure, improved dependency management, better IDE version targeting |
| Manual plugin.xml editing | `patchPluginXml` with extension configuration | Gradle Plugin 2.0 | Dynamic metadata, load from external files, build-time validation |
| Per-platform ZIPs | Universal ZIP with runtime platform detection | Common practice 2024+ | Simpler distribution, single download URL, reduced maintenance |
| Bundle Node.js in plugin | On-demand download with system fallback | Trend for large dependencies | Smaller ZIP size, respects user's Node.js, works offline with system install |

**Deprecated/outdated:**
- `gradle-intellij-plugin` (1.x): Replaced by `org.jetbrains.intellij.platform` (2.x) - API incompatible, must migrate
- `setPlugins(...)` in old plugin: Use `dependencies { intellijPlatform { plugin(...) } }` instead
- `downloadIdeaSources = true`: Removed in 2.x, sources bundled automatically
- `updateSinceUntilBuild = true`: Replaced by explicit `ideaVersion { sinceBuild/untilBuild }` in extension

**Source:** [IntelliJ Platform Gradle Plugin 2.0 announcement](https://blog.jetbrains.com/platform/2024/07/intellij-platform-gradle-plugin-2-0/)

## Open Questions

### 1. Exact Node.js minimum version for BBj language server

**What we know:** Langium requires Node.js 16+, VSCode extension uses modern JavaScript features
**What's unclear:** Whether bbj-language-server uses features requiring Node.js 18+ or 20+
**Recommendation:** Test `main.cjs` bundle with Node.js 16, 18, and 20 to determine actual minimum; default to Node.js 20 LTS for downloads

### 2. Node.js download progress indication to user

**What we know:** Download should be non-blocking, IntelliJ has progress indicator APIs
**What's unclear:** Best UX pattern - background task with notification, or modal progress dialog
**Recommendation:** Use `ProgressManager.run()` with background task, show balloon notification on completion or failure

### 3. TextMate grammar bundling at runtime vs. build-time

**What we know:** Current approach copies grammars at build-time from bbj-vscode
**What's unclear:** Whether runtime extraction from resources would be simpler/more maintainable
**Recommendation:** Keep build-time copy (current approach) - simpler, no runtime extraction complexity, TextMate plugin expects file paths not streams

### 4. Welcome notification links and content

**What we know:** Should show on first launch, link to settings
**What's unclear:** What other links to include (documentation, sample project, etc.)
**Recommendation:** Minimal first version - link to settings and GitHub documentation; gather user feedback before adding more

## Sources

### Primary (HIGH confidence)

- [IntelliJ Platform Gradle Plugin 2.11.0](https://github.com/JetBrains/intellij-platform-gradle-plugin) - Latest release (Jan 26, 2026)
- [IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/welcome.html) - Official documentation
- [Publishing Plugin documentation](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html) - Marketplace requirements
- [Marketplace Best Practices](https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html) - Vendor and description guidelines
- [Plugin Class Loaders](https://plugins.jetbrains.com/docs/intellij/plugin-class-loaders.html) - Resource loading patterns
- [Notifications API](https://plugins.jetbrains.com/docs/intellij/notifications.html) - Welcome balloon implementation
- [Node.js download structure](https://nodejs.org/dist/) - Official binary distribution URLs

### Secondary (MEDIUM confidence)

- [Gradle Changelog Plugin](https://github.com/JetBrains/gradle-changelog-plugin) - Automated changelog management
- [esbuild documentation](https://esbuild.github.io/) - Bundling approach verified against bbj-vscode implementation
- [Langium npm page](https://www.npmjs.com/package/langium) - Node.js 16+ requirement confirmed
- [Platform detection patterns](https://www.baeldung.com/java-detect-os) - Cross-verified multiple sources

### Tertiary (LOW confidence)

- WebSearch results for IntelliJ plugin testing - Manual verification recommended (no official cross-platform testing guide found)
- Community forum discussions on PropertiesComponent - Verified with official API docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official tools and established bbj-vscode patterns
- Architecture: MEDIUM - Patterns verified in documentation but Node.js download implementation requires testing
- Pitfalls: MEDIUM - Compiled from community experiences and official warnings, need project-specific validation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - IntelliJ Platform Gradle Plugin is stable)

**Key assumptions:**
- bbj-vscode's esbuild configuration produces a working standalone bundle
- Node.js 16+ is sufficient for running the language server
- IntelliJ IDEA 2024.2 (build 242) API remains stable through 243.*
- Single universal ZIP is acceptable for initial release (can optimize later)
