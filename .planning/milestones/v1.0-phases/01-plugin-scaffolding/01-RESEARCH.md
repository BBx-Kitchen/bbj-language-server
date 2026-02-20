# Phase 1: Plugin Scaffolding - Research

**Researched:** 2026-02-01
**Domain:** IntelliJ Platform Plugin - Basic Project Structure
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational plugin project structure with file type registration only. NO language server integration, NO TextMate grammar, NO settings UI—just the absolute minimum to get IntelliJ to recognize BBj files with a custom icon.

The standard approach uses:
- **IntelliJ Platform Gradle Plugin 2.x** (version 2.11.0, released Jan 26, 2026)
- **Kotlin DSL** for build.gradle.kts (recommended over Java/Groovy)
- **Java 17+** for plugin implementation code
- **Gradle wrapper** for reproducible builds
- **SVG icons** (16×16 for file types)
- **Singleton pattern** for Language and FileType classes

**Primary recommendation:** Use the IntelliJ Platform Gradle Plugin 2.11.0 with Kotlin build scripts, implement plugin code in Java (not Kotlin) for Phase 1 simplicity, and follow the INSTANCE singleton pattern for all Language/FileType classes.

## Standard Stack

The established tools for IntelliJ plugin development targeting Community Edition:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform Gradle Plugin | 2.11.0 | Build automation, IDE SDK, packaging | Official JetBrains build tool, released Jan 2026 |
| Gradle | 9.3.1+ | Build system | Required by IntelliJ Platform Gradle Plugin |
| Java | 17+ | Implementation language | IntelliJ 2024.x minimum requirement |
| IntelliJ Platform SDK | 2024.2+ | IDE APIs for file types, extensions | Target platform |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Kotlin JVM Plugin | 2.0+ | Build script DSL | For build.gradle.kts (recommended) |
| Gradle Wrapper | Included | Reproducible builds | Always use in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gradle Plugin 2.x | Gradle Plugin 1.x | 1.x is legacy, 2.x is current standard |
| Java implementation | Kotlin implementation | Kotlin requires more setup; Java simpler for Phase 1 |
| Kotlin build scripts | Groovy build scripts | Groovy is legacy; Kotlin DSL is current standard |

**Installation:**
```bash
# Create project directory
mkdir bbj-intellij && cd bbj-intellij

# Initialize Gradle wrapper (version 9.3.1 current as of Jan 2026)
gradle wrapper --gradle-version=9.3.1 --distribution-type=bin

# Build script will declare IntelliJ Platform Gradle Plugin 2.11.0
```

## Architecture Patterns

### Recommended Project Structure
```
bbj-intellij/
├── build.gradle.kts              # Kotlin DSL build configuration
├── settings.gradle.kts           # Repository configuration
├── gradle.properties             # Build properties
├── gradlew                       # Gradle wrapper (Unix)
├── gradlew.bat                   # Gradle wrapper (Windows)
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
└── src/
    └── main/
        ├── java/com/basis/bbj/intellij/
        │   ├── BbjLanguage.java         # Language singleton
        │   ├── BbjFileType.java         # File type singleton
        │   └── BbjIcons.java            # Icon constants
        └── resources/
            ├── META-INF/
            │   └── plugin.xml           # Plugin descriptor
            └── icons/
                ├── bbj.svg              # 16×16 file icon (light theme)
                └── bbj_dark.svg         # 16×16 file icon (dark theme)
```

### Pattern 1: Minimal build.gradle.kts
**What:** IntelliJ Platform Gradle Plugin 2.x configuration for Phase 1
**When to use:** Initial plugin scaffolding with no dependencies
**Example:**
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.11.0"
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
        intellijIdeaCommunity("2024.2")  // Target IntelliJ Community Edition
    }
}

tasks {
    patchPluginXml {
        sinceBuild.set("242")  // 2024.2
        untilBuild.set("243.*")  // Up to but not including 2024.4
    }
}
```

### Pattern 2: Language Singleton
**What:** Language class with INSTANCE singleton pattern
**When to use:** Every custom language registration
**Example:**
```java
// Source: https://plugins.jetbrains.com/docs/intellij/language-and-filetype.html
package com.basis.bbj.intellij;

import com.intellij.lang.Language;

public class BbjLanguage extends Language {
    public static final BbjLanguage INSTANCE = new BbjLanguage();

    private BbjLanguage() {
        super("BBj");
    }
}
```

### Pattern 3: LanguageFileType Singleton
**What:** File type class with INSTANCE singleton and icon reference
**When to use:** Register file extensions with language association
**Example:**
```java
// Source: https://plugins.jetbrains.com/docs/intellij/language-and-filetype.html
package com.basis.bbj.intellij;

import com.intellij.openapi.fileTypes.LanguageFileType;
import org.jetbrains.annotations.NotNull;
import javax.swing.Icon;

public final class BbjFileType extends LanguageFileType {
    public static final BbjFileType INSTANCE = new BbjFileType();

    private BbjFileType() {
        super(BbjLanguage.INSTANCE);
    }

    @NotNull
    @Override
    public String getName() {
        return "BBj";
    }

    @NotNull
    @Override
    public String getDescription() {
        return "BBj source file";
    }

    @NotNull
    @Override
    public String getDefaultExtension() {
        return "bbj";
    }

    @Override
    public Icon getIcon() {
        return BbjIcons.FILE;
    }
}
```

### Pattern 4: Icon Constants
**What:** Icon holder class loading SVG resources
**When to use:** Define all plugin icons in one place
**Example:**
```java
// Source: https://plugins.jetbrains.com/docs/intellij/icons.html
package com.basis.bbj.intellij;

import com.intellij.openapi.util.IconLoader;
import javax.swing.Icon;

public interface BbjIcons {
    Icon FILE = IconLoader.getIcon("/icons/bbj.svg", BbjIcons.class);
}
```

### Pattern 5: Minimal plugin.xml
**What:** Plugin descriptor with file type registration only
**When to use:** Phase 1 - no language server, no settings, just file types
**Example:**
```xml
<!-- Source: https://plugins.jetbrains.com/docs/intellij/plugin-configuration-file.html -->
<idea-plugin>
    <id>com.basis.bbj.intellij</id>
    <name>BBj Language Support</name>
    <version>0.1.0</version>
    <vendor email="support@basis.cloud" url="https://basis.cloud">BASIS International</vendor>

    <description><![CDATA[
        BBj language support for IntelliJ IDEA.
        Phase 1: File type registration with custom icon.
    ]]></description>

    <idea-version since-build="242"/>

    <!-- Depend on platform module for file type support -->
    <depends>com.intellij.modules.platform</depends>

    <extensions defaultExtensionNs="com.intellij">
        <!-- Register BBj file type -->
        <fileType
            name="BBj"
            implementationClass="com.basis.bbj.intellij.BbjFileType"
            fieldName="INSTANCE"
            language="BBj"
            extensions="bbj;bbl;bbjt;src"/>
    </extensions>
</idea-plugin>
```

### Anti-Patterns to Avoid
- **Don't add LSP4IJ dependency in Phase 1** — That's Phase 4. Phase 1 is file types only.
- **Don't add TextMate grammar yet** — That's Phase 2. Phase 1 files open as plain text.
- **Don't create settings UI** — That's Phase 3. No configuration needed for Phase 1.
- **Don't use Kotlin for implementation** — Use Java for simplicity; Kotlin adds build complexity.
- **Don't manually manage plugin dependencies** — Use `intellijPlatform {}` block, not raw Maven coordinates.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon loading | Hardcoded ImageIcon paths | `IconLoader.getIcon()` | Handles theme variants, HiDPI, caching automatically |
| File type registration | Manual FileTypeManager calls | `<fileType>` extension point in plugin.xml | Declarative, validated by platform |
| Build configuration | Custom Gradle tasks | IntelliJ Platform Gradle Plugin | Handles IDE SDK, sandboxing, packaging, verification |
| Singleton pattern | DIY getInstance() | INSTANCE field pattern | Platform convention, avoids lazy init issues |
| Plugin versioning | Manual plugin.xml editing | `patchPluginXml` Gradle task | Auto-populates from build.gradle.kts |

**Key insight:** IntelliJ Platform has strong conventions. Follow INSTANCE singleton pattern, use extension points over programmatic API calls, and let Gradle plugin handle build complexity.

## Common Pitfalls

### Pitfall 1: Wrong Gradle Plugin Version
**What goes wrong:** Using legacy Gradle IntelliJ Plugin 1.x (id `org.jetbrains.intellij`) instead of new 2.x (id `org.jetbrains.intellij.platform`)
**Why it happens:** Documentation and examples still reference 1.x syntax
**How to avoid:**
- Use plugin ID `org.jetbrains.intellij.platform` version `2.11.0`
- Use `intellijPlatform {}` dependency block, not `intellij {}` configuration block
- Check plugin.gradle.org for latest version
**Warning signs:** Build errors about "intellij extension not found", dependency resolution failures

### Pitfall 2: Missing defaultRepositories()
**What goes wrong:** Plugin dependency resolution fails with "Could not find IntelliJ Platform" errors
**Why it happens:** IntelliJ Platform artifacts require specific repositories that aren't in mavenCentral()
**How to avoid:**
```kotlin
repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()  // REQUIRED for IntelliJ Platform artifacts
    }
}
```
**Warning signs:** Build fails with "Could not resolve intellijIdeaCommunity:2024.2"

### Pitfall 3: Icon Size Mismatch
**What goes wrong:** File icons appear blurry, too large, or cropped in Project view
**Why it happens:** Wrong SVG dimensions or missing viewBox attribute
**How to avoid:**
- Use exactly 16×16 for file type icons (width and height attributes)
- Leave 1px transparent border (visible content in 14×14 area)
- Provide both light (`bbj.svg`) and dark (`bbj_dark.svg`) variants
**Warning signs:** Icons look pixelated or don't adapt to theme changes

### Pitfall 4: Non-Private Constructor
**What goes wrong:** Multiple Language or FileType instances created, causing registration conflicts
**Why it happens:** Forgetting to make constructor private in singleton pattern
**How to avoid:**
```java
public static final BbjLanguage INSTANCE = new BbjLanguage();
private BbjLanguage() { super("BBj"); }  // MUST be private
```
**Warning signs:** "Language already registered" errors in IDE logs

### Pitfall 5: Missing fieldName Attribute
**What goes wrong:** Plugin fails to load with "Cannot access INSTANCE field" error
**Why it happens:** plugin.xml declares `implementationClass` but omits `fieldName="INSTANCE"`
**How to avoid:**
```xml
<fileType
    implementationClass="com.basis.bbj.intellij.BbjFileType"
    fieldName="INSTANCE"  <!-- REQUIRED for singleton pattern -->
    .../>
```
**Warning signs:** Plugin verification fails, runtime ClassNotFoundException

### Pitfall 6: Icon Path Without Leading Slash
**What goes wrong:** Icons don't load, appear as default file icon
**Why it happens:** `IconLoader.getIcon()` requires absolute resource path
**How to avoid:**
```java
// WRONG: IconLoader.getIcon("icons/bbj.svg", ...)
// RIGHT:
Icon FILE = IconLoader.getIcon("/icons/bbj.svg", BbjIcons.class);
```
**Warning signs:** File icons missing in Project view, no errors in logs

### Pitfall 7: Gradle Wrapper Not Committed
**What goes wrong:** Team members see "gradle: command not found" errors
**Why it happens:** `.gitignore` excludes gradle/wrapper/ directory
**How to avoid:**
- ALWAYS commit `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`, `gradle/wrapper/gradle-wrapper.properties`
- Do NOT add gradle/wrapper/ to .gitignore
**Warning signs:** CI builds fail, new contributors can't build project

## Code Examples

Verified patterns from official sources:

### Complete build.gradle.kts for Phase 1
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.11.0"
}

group = "com.basis.bbj"
version = "0.1.0-alpha"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
    }
}

tasks {
    patchPluginXml {
        sinceBuild.set("242")
        untilBuild.set("243.*")
    }

    buildPlugin {
        // Output: build/distributions/bbj-intellij-0.1.0-alpha.zip
    }
}
```

### settings.gradle.kts (if using settings-based repositories)
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
plugins {
    id("org.jetbrains.intellij.platform.settings") version "2.11.0"
}

rootProject.name = "bbj-intellij"
```

### Minimal SVG Icon (16×16)
```xml
<!-- Source: https://plugins.jetbrains.com/docs/intellij/icons.html -->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <!-- 1px transparent border, visible content in 14×14 area -->
    <rect x="1" y="1" width="14" height="14" fill="#4B8BBE" rx="2"/>
    <text x="8" y="12" font-family="sans-serif" font-size="10"
          text-anchor="middle" fill="white" font-weight="bold">B</text>
</svg>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gradle IntelliJ Plugin 1.x | IntelliJ Platform Gradle Plugin 2.x | July 2024 | Different plugin ID, dependency syntax, repository configuration |
| `intellij {}` config block | `intellijPlatform {}` dependency block | July 2024 | All dependencies now in standard `dependencies {}` section |
| Groovy build scripts | Kotlin DSL (build.gradle.kts) | ~2020, standard by 2024 | Type-safe configuration, better IDE support |
| Java 11 target | Java 17+ minimum | IntelliJ 2024.x | Platform requires Java 17; use 21 for future-proofing |
| PNG icons | SVG icons with theme variants | IntelliJ 2020.3+ | Auto-scaling, theme adaptation, smaller file size |

**Deprecated/outdated:**
- **Gradle IntelliJ Plugin 1.x** (`org.jetbrains.intellij`): Replaced by 2.x in July 2024
- **`intellij.plugins.set()` syntax**: Now use `intellijPlatform { plugin() }` in dependencies block
- **Hardcoded IntelliJ version in plugin.xml**: Use `patchPluginXml` task instead

## Open Questions

Things that couldn't be fully resolved:

1. **LSP4IJ dependency declaration in 2.x plugin**
   - What we know: LSP4IJ is available on JetBrains Marketplace with ID `com.redhat.devtools.lsp4ij`
   - What's unclear: Exact syntax for stable vs nightly channel in `intellijPlatform {}` block
   - Recommendation: Defer to Phase 4; Phase 1 doesn't need LSP4IJ

2. **Icon design specifics**
   - What we know: 16×16 SVG, 1px transparent border, light/dark variants
   - What's unclear: Exact BBj logo/icon design not specified
   - Recommendation: Create simple "B" letter icon for Phase 1, iterate later

3. **IntelliJ version compatibility range**
   - What we know: 2024.2 is safe target, 2024.3 is latest
   - What's unclear: How far back to support (2023.3? 2024.1?)
   - Recommendation: Target 2024.2+ (since-build="242"), test on 2024.2 and 2024.3

## Sources

### Primary (HIGH confidence)
- [IntelliJ Platform Gradle Plugin 2.x Documentation](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html) - Official JetBrains docs, v2.11.0 verified
- [Plugin Configuration File](https://plugins.jetbrains.com/docs/intellij/plugin-configuration-file.html) - plugin.xml structure
- [Registering File Types](https://plugins.jetbrains.com/docs/intellij/registering-file-type.html) - FileType extension point
- [Language and File Type](https://plugins.jetbrains.com/docs/intellij/language-and-filetype.html) - INSTANCE pattern examples
- [Working with Icons](https://plugins.jetbrains.com/docs/intellij/icons.html) - Icon loading and sizing
- [Dependencies Extension](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-dependencies-extension.html) - intellijPlatform {} syntax
- [Tasks Documentation](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html) - buildPlugin and runIde
- [Gradle Plugin Portal - IntelliJ Platform](https://plugins.gradle.org/plugin/org.jetbrains.intellij.platform) - Version 2.11.0 verified Jan 26, 2026

### Secondary (MEDIUM confidence)
- [Gradle Wrapper Documentation](https://docs.gradle.org/current/userguide/gradle_wrapper.html) - Gradle 9.3.1 current as of Jan 2026
- [Using Kotlin in Plugins](https://plugins.jetbrains.com/docs/intellij/using-kotlin.html) - Kotlin setup (not used in Phase 1)
- [intellij-quarkus build.gradle.kts](https://github.com/redhat-developer/intellij-quarkus/blob/main/build.gradle.kts) - Real-world LSP4IJ example

### Tertiary (LOW confidence)
- LSP4IJ latest version (0.19.1 as of Dec 2024) - Not needed for Phase 1 but verified from [GitHub Releases](https://github.com/redhat-developer/lsp4ij/releases)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified from official sources within last 7 days
- Architecture: HIGH - Patterns from official SDK documentation
- Pitfalls: HIGH - Derived from official migration guide and common GitHub issues

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable ecosystem, but versions advance monthly)

---

**Note for Planner:** Phase 1 is MINIMAL. Create only: build.gradle.kts, plugin.xml, BbjLanguage.java, BbjFileType.java, BbjIcons.java, and bbj.svg. Success = `./gradlew runIde` opens IntelliJ with BBj files showing custom icon. NO language features yet.
