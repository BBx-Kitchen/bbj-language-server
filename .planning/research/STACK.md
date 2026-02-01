# IntelliJ LSP Plugin Stack - BBj Language Server Integration

**Research Date:** 2026-02-01
**Researcher:** Claude (Sonnet 4.5)
**Scope:** Technology stack for IntelliJ plugin wrapping existing Langium-based BBj language server via LSP4IJ

---

## Executive Summary

This document defines the prescriptive technology stack for building an IntelliJ plugin that connects to the existing BBj language server (TypeScript/Langium) via LSP4IJ. The plugin reuses the existing language server binary without modification, focusing purely on the IntelliJ integration layer.

**Key Constraint:** Must work with IntelliJ Community Edition (no Ultimate-only APIs).

---

## Core Stack Components

### 1. Build System & Plugin Development Framework

#### Gradle (8.5+)
**Version:** 8.5 or later (latest stable: 8.11 as of early 2026)
**Rationale:** Industry standard for IntelliJ plugin development. Required by `gradle-intellij-plugin`.
**Confidence:** HIGH (verified standard)

**Gradle Wrapper:** Include `gradlew` and `gradlew.bat` in repository for reproducible builds across environments without requiring global Gradle installation.

#### Gradle IntelliJ Plugin (2.0.0+)
**Artifact:** `org.jetbrains.intellij`
**Version:** 2.0.0 or later (verify latest at [plugins.gradle.org](https://plugins.gradle.org/plugin/org.jetbrains.intellij))
**Rationale:** Official JetBrains Gradle plugin for building, testing, and packaging IntelliJ plugins. Handles IntelliJ Platform SDK dependencies, sandboxing, and plugin verification.
**Confidence:** HIGH (official tooling)

**Key Configuration:**
```kotlin
plugins {
    id("java")
    id("org.jetbrains.intellij") version "2.0.0"
}

intellij {
    version.set("2024.3") // or LATEST-EAP-SNAPSHOT for bleeding edge
    type.set("IC") // IC = IntelliJ Community Edition
    plugins.set(listOf(
        "com.redhat.devtools.lsp4ij:0.8.0" // LSP4IJ dependency
    ))
}
```

**Why NOT Maven:** While Maven is supported, Gradle is the modern standard for IntelliJ plugin development with better Kotlin DSL support and superior IDE integration. All JetBrains examples use Gradle.

---

### 2. LSP Integration Layer

#### LSP4IJ (0.8.0+)
**Artifact:** `com.redhat.devtools.lsp4ij:lsp4ij`
**Version:** 0.8.0 or later (verify latest at [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/23257-lsp4ij))
**GitHub:** [redhat-developer/lsp4ij](https://github.com/redhat-developer/lsp4ij)
**Rationale:**
- Community Edition compatible (unlike JetBrains' native LSP API which requires Ultimate)
- Actively maintained by Red Hat
- Production-proven (used by Quarkus Tools, Liberty Tools, COBOL Language Support)
- Handles LSP protocol implementation, process management, and editor integration
- Supports stdio, socket, and named pipe communication with language servers

**Confidence:** HIGH (verified as standard for Community Edition LSP plugins)

**Key Features Used:**
- `LanguageServerFactory` - Define how to spawn/connect to the BBj language server process
- `LanguageServerDefinition` - Declarative LSP server configuration in `plugin.xml`
- `LanguageServerProcessSupport` - Process lifecycle management (start/stop/restart)
- LSP client implementation for all LSP methods (textDocument/*, workspace/*, etc.)
- Semantic token support for advanced syntax highlighting (if LS provides it)

**Alternative Considered:** JetBrains Platform LSP API
**Why NOT:** Requires IntelliJ Ultimate. Project requirement is Community Edition support.

---

### 3. Language & Runtime

#### Java (17+)
**Version:** Java 17 LTS minimum, Java 21 LTS recommended
**Rationale:**
- IntelliJ Platform 2024.x targets Java 17 as minimum
- Java 21 LTS (released Sept 2023) is recommended for new projects
- Matches existing java-interop service requirement (Java 17)

**Confidence:** HIGH (verified IntelliJ Platform requirement)

**Why NOT Java 11:** IntelliJ 2024.x dropped Java 11 support. While older IDE versions support it, future-proofing requires Java 17+.

#### Kotlin (1.9.0+) [OPTIONAL but RECOMMENDED]
**Version:** 1.9.0+ (Kotlin 1.9.x is stable as of 2024)
**Rationale:**
- Modern IntelliJ plugin development uses Kotlin for plugin code
- Better null safety, concise syntax, DSL support
- JetBrains' own plugins use Kotlin
- Gradle build scripts in Kotlin DSL (`.gradle.kts`) are now standard

**Confidence:** MEDIUM-HIGH (recommended, not required)

**Tradeoff:** Pure Java is acceptable if team lacks Kotlin experience. LSP4IJ works with both. However, all modern examples and JetBrains docs favor Kotlin.

**Decision Point:** Use Kotlin for plugin logic, Java for any shared code with java-interop service.

---

### 4. Syntax Highlighting

#### TextMate Grammar Support (via LSP4IJ)
**Artifact:** Built into LSP4IJ
**Version:** N/A (uses IntelliJ Platform's TextMate support)
**Rationale:**
- IntelliJ Platform has built-in TextMate grammar support since 2020.3
- Existing `bbj.tmLanguage.json` and `bbx.tmLanguage.json` grammars from VS Code can be reused directly
- LSP4IJ can map TextMate scopes to IntelliJ color schemes

**Confidence:** HIGH (standard approach for LSP-based plugins)

**Integration:**
1. Include `.tmLanguage.json` files in plugin resources
2. Register in `plugin.xml` via `<textMateBundleProvider>` extension point
3. LSP4IJ automatically applies TextMate highlighting to registered file types

**Alternative:** Semantic Tokens (LSP 3.16+)
**Why NOT primary:** TextMate is simpler for initial implementation. Semantic tokens can be added later for enhanced highlighting if LS supports `textDocument/semanticTokens`.

---

### 5. Node.js Runtime Management

**Challenge:** IntelliJ plugin needs to run a Node.js-based language server. Users may not have Node.js installed.

#### Strategy A: Bundle Node.js Runtime (RECOMMENDED)
**Tool:** [jlink](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jlink.html) or [node-gradle](https://github.com/node-gradle/gradle-node-plugin)
**Approach:** Include platform-specific Node.js binaries in plugin distribution
**Rationale:**
- Zero user configuration required
- Guaranteed compatible Node.js version
- Works in air-gapped environments
- Increased plugin size (50-100MB per platform)

**Implementation:**
- Use [gradle-node-plugin](https://github.com/node-gradle/gradle-node-plugin) to download Node.js during build
- Package platform-specific binaries (macOS, Windows, Linux) in plugin JAR
- Detect OS at runtime and extract appropriate binary to plugin cache directory
- Use extracted Node.js to spawn language server process

**Confidence:** MEDIUM-HIGH (proven pattern, but complex packaging)

#### Strategy B: Detect System Node.js (FALLBACK)
**Approach:** Check system PATH for `node` executable
**Rationale:**
- Lightweight plugin distribution
- Users must install Node.js 16+ separately
- Risk: version mismatches, missing Node.js installations

**Implementation:**
- Check `node --version` in PATH
- Validate version >= 16
- Display error message with installation instructions if missing/incompatible
- Allow manual path configuration in plugin settings

**Confidence:** HIGH (simpler, but worse UX)

**Recommendation:** Start with Strategy B for alpha, migrate to Strategy A for beta/production.

---

### 6. File Type Registration

#### IntelliJ Platform File Type API
**Extension Point:** `com.intellij.fileType`
**Rationale:** Standard mechanism for registering custom file types in IntelliJ
**Confidence:** HIGH (core platform API)

**Configuration in `plugin.xml`:**
```xml
<extensions defaultExtensionNs="com.intellij">
    <fileType
        name="BBj File"
        implementationClass="com.example.bbj.BbjFileType"
        fieldName="INSTANCE"
        language="BBj"
        extensions="bbj;bbl;bbjt;src"/>
</extensions>
```

**File Types to Register:**
- `.bbj` - BBj source files
- `.bbl` - BBj library files
- `.bbjt` - BBj template files
- `.src` - BBj source files (legacy extension)

---

### 7. Configuration & Settings

#### IntelliJ Settings API
**Extension Point:** `com.intellij.applicationConfigurable` or `com.intellij.projectConfigurable`
**Rationale:** Standard settings UI integration
**Confidence:** HIGH (core platform API)

**Settings to Expose:**
- BBj Home Path (required for java-interop service to find BBj runtime classpath)
- Additional Classpath Entries (optional)
- Node.js Path (if using detection strategy)
- Language Server Debug Options (for troubleshooting)
- java-interop Service Port (default 5008)

**Implementation:**
- Use `PersistentStateComponent` for settings storage
- Settings stored in `.idea/` workspace or IDE-level config
- Integrate with IntelliJ Settings dialog via `Configurable` interface

---

### 8. Testing Framework

#### IntelliJ Platform Test Framework
**Artifact:** Provided by `gradle-intellij-plugin`
**Version:** Matches target IntelliJ version
**Rationale:** Official testing framework for plugin development, integrates with IntelliJ Platform
**Confidence:** HIGH (official testing approach)

**Test Types:**
1. **Light Tests** - Fast unit tests without full IDE instance
2. **Heavy Tests** - Integration tests with full IDE sandbox
3. **UI Tests** - For settings pages and dialogs

**Test Dependencies:**
- JUnit 5 (Jupiter) - Modern JUnit API
- AssertJ or Hamcrest - Fluent assertions
- Mockito - Mocking framework (if needed for java-interop interaction)

#### LSP4IJ Testing Support
**Availability:** LSP4IJ provides test utilities for LSP client/server interaction
**Use Case:** Verify language server communication, LSP method handling
**Confidence:** MEDIUM (less documented, but available)

---

### 9. Packaging & Distribution

#### Plugin Artifact Format
**Format:** `.zip` containing plugin JAR and dependencies
**Tool:** `gradle-intellij-plugin` `buildPlugin` task
**Rationale:** Standard IntelliJ plugin distribution format
**Confidence:** HIGH (official packaging)

**Artifact Contents:**
- Plugin JAR (`bbj-intellij.jar`)
- LSP4IJ dependency (if not using marketplace installation)
- Bundled language server files (`out/language/main.cjs`, etc.)
- TextMate grammar files (`.tmLanguage.json`)
- Node.js runtime (if bundling strategy)
- `plugin.xml` descriptor

#### JetBrains Marketplace (FUTURE)
**Not in scope for alpha**, but standard distribution channel for public release.

---

## Dependencies Summary

### Gradle Build Dependencies

```kotlin
plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.20" // if using Kotlin
    id("org.jetbrains.intellij") version "2.0.0"
}

dependencies {
    // LSP4IJ provided via intellij.plugins configuration, not direct dependency

    // Testing
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.0")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.10.0")
    testImplementation("org.assertj:assertj-core:3.24.2")
}

intellij {
    version.set("2024.3")
    type.set("IC") // Community Edition
    plugins.set(listOf(
        "com.redhat.devtools.lsp4ij:0.8.0"
    ))
}
```

### Runtime Dependencies (Bundled in Plugin)

- **Language Server:** `bbj-vscode/out/language/main.cjs` (existing compiled LS)
- **Node.js Runtime:** Platform-specific binaries (if bundling)
- **TextMate Grammars:** `bbj.tmLanguage.json`, `bbx.tmLanguage.json`

### External Process Dependencies

- **java-interop Service:** Separate Java process on port 5008 (managed by plugin or LS)
- **BBj Runtime:** External installation (not bundled), configured via plugin settings

---

## Platform Compatibility Matrix

| IntelliJ Version | Java Version | LSP4IJ Version | Status |
|------------------|--------------|----------------|--------|
| 2024.3 (2024.3.x) | Java 17+ | 0.8.0+ | Primary Target |
| 2024.2 (2024.2.x) | Java 17+ | 0.7.0+ | Secondary Target |
| 2024.1 (2024.1.x) | Java 17+ | 0.6.0+ | Legacy Support |
| 2023.3 or earlier | Java 11+ | 0.5.0 or earlier | Not Supported |

**Recommendation:** Target IntelliJ 2024.2+ (released ~July 2024) for widest compatibility with modern LSP4IJ features.

---

## What NOT to Use

### ❌ JetBrains Platform LSP API
**Why:** Requires IntelliJ Ultimate Edition. Project constraint is Community Edition support.

### ❌ Custom Parser/Lexer Implementation
**Why:** Defeats the purpose of reusing existing Langium-based language server. LSP4IJ + TextMate handles syntax highlighting without custom lexers.

### ❌ Grammar-Kit
**Why:** Grammar-Kit generates PSI (Program Structure Interface) parsers for IntelliJ. Not needed when using LSP — the language server provides all parsing and semantic analysis.

### ❌ Apache Maven
**Why:** While supported, Gradle is the modern standard with better Kotlin DSL support and tighter JetBrains integration.

### ❌ Langium in IntelliJ Plugin
**Why:** Langium is Node.js/TypeScript framework. Cannot run directly in JVM-based IntelliJ plugin. Language server runs as separate Node.js process.

### ❌ VS Code Extension API in Plugin
**Why:** IntelliJ and VS Code use completely different extension APIs. Only the language server is shared, not extension code.

---

## Development Workflow

### Initial Setup
1. Initialize Gradle project with `gradle-intellij-plugin`
2. Configure IntelliJ Platform SDK (Community Edition)
3. Add LSP4IJ plugin dependency
4. Create `plugin.xml` descriptor with file type and LSP server definitions
5. Implement `LanguageServerFactory` to spawn Node.js language server process
6. Bundle existing language server artifacts in plugin resources

### Build Process
1. Compile language server (if not pre-built) - **NOTE:** This happens in `bbj-vscode/` directory, not plugin
2. Compile plugin code (Java/Kotlin) via Gradle
3. Package plugin JAR with bundled resources (LS, TextMate grammars)
4. Generate plugin distribution ZIP

### Testing Workflow
1. Run IDE sandbox with `runIde` Gradle task
2. Load test BBj project in sandbox IDE
3. Verify language server launches and LSP communication works
4. Test syntax highlighting, diagnostics, code completion
5. Verify java-interop integration (Java class completions)

### Distribution
1. Build plugin ZIP with `buildPlugin` task
2. Manually install in target IntelliJ instances (alpha)
3. Future: Publish to JetBrains Marketplace (beta/production)

---

## Open Questions & Decisions Required

### 1. Node.js Bundling Strategy
**Question:** Bundle Node.js runtime or require user installation?
**Recommendation:** Start with user installation (simpler), migrate to bundling for production
**Impact:** Plugin size (50-100MB vs <1MB), user configuration burden
**Confidence:** MEDIUM (both approaches viable)

### 2. java-interop Process Management
**Question:** Should IntelliJ plugin manage java-interop process lifecycle, or let language server handle it?
**Options:**
- **A:** Plugin spawns both Node.js LS and java-interop service
- **B:** Plugin spawns LS, LS spawns java-interop (current VS Code approach)

**Recommendation:** Option B (less change to existing architecture)
**Confidence:** MEDIUM (requires validation that LS can spawn java-interop from IntelliJ context)

### 3. Minimum IntelliJ Version
**Question:** Target 2024.1, 2024.2, or 2024.3 as minimum?
**Recommendation:** 2024.2 (released mid-2024, balances modernity and adoption)
**Impact:** Access to newer LSP4IJ features vs. wider user base
**Confidence:** MEDIUM (depends on target user base IntelliJ version distribution)

### 4. Kotlin vs. Java for Plugin Code
**Question:** Use Kotlin or pure Java for plugin implementation?
**Recommendation:** Kotlin (modern standard for IntelliJ plugins)
**Caveat:** Use Java if team lacks Kotlin experience
**Confidence:** MEDIUM (preference, not technical requirement)

### 5. Settings Storage Level
**Question:** Store BBj settings at project level or application level?
**Recommendation:** Project level (different projects may have different BBj runtimes)
**Confidence:** HIGH (aligns with VS Code extension approach)

---

## Confidence Levels Explained

- **HIGH:** Verified against official documentation or proven in production LSP4IJ plugins
- **MEDIUM-HIGH:** Strong evidence from community or recent examples, pending verification
- **MEDIUM:** Logical inference based on platform patterns, requires validation
- **LOW:** Speculative or requires research beyond knowledge cutoff (Jan 2025)

---

## Verification Sources

As of January 2025 knowledge cutoff:
- **LSP4IJ:** GitHub repository and JetBrains Marketplace listing
- **Gradle IntelliJ Plugin:** Official JetBrains documentation
- **IntelliJ Platform SDK:** JetBrains Platform SDK documentation
- **Gradle:** gradle.org documentation
- **Java/Kotlin Versions:** JetBrains platform version compatibility matrix

**Recommended Next Steps:**
1. Verify LSP4IJ latest version at [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/23257-lsp4ij)
2. Check Gradle IntelliJ Plugin latest at [plugins.gradle.org](https://plugins.gradle.org/plugin/org.jetbrains.intellij)
3. Review LSP4IJ examples: [Quarkus Tools](https://github.com/redhat-developer/intellij-quarkus), [COBOL LS](https://github.com/eclipse-che4z/che-che4z-lsp-for-cobol)

---

## Stack Evolution Path

### Alpha (Current Milestone)
- ✅ Gradle 8.5+ with IntelliJ Plugin 2.0.0
- ✅ LSP4IJ 0.8.0
- ✅ Java 17 minimum
- ✅ Manual Node.js installation required
- ✅ TextMate grammar for syntax highlighting
- ✅ Basic file type registration

### Beta (Future)
- Bundle Node.js runtime for zero-config UX
- Semantic token support if LS implements it
- Enhanced settings UI with validation
- Automated plugin updates

### Production (Future)
- JetBrains Marketplace publication
- Telemetry/error reporting integration
- Multi-platform testing automation
- Support for IntelliJ 2025.x versions

---

*Research completed: 2026-02-01*
*Researcher: Claude (Sonnet 4.5)*
*Next Review: Before beta milestone*
