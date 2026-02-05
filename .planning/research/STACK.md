# Stack Research: IntelliJ CI/CD

**Project:** BBj Language Server - IntelliJ Plugin CI/CD
**Researched:** 2026-02-05
**Confidence:** HIGH (verified with official documentation)

## Executive Summary

The IntelliJ plugin CI/CD stack builds on the existing Gradle IntelliJ Platform Plugin (already configured in `bbj-intellij/build.gradle.kts`). The key additions needed are:

1. **GitHub Actions workflow** using `actions/setup-java@v5` and `gradle/actions/setup-gradle@v5`
2. **Version synchronization** reading from `bbj-vscode/package.json` using Groovy's built-in JsonSlurper
3. **GitHub Releases** for artifact distribution (until Marketplace access obtained)
4. **Optional signing** for future Marketplace publishing

## Tools Required

### Gradle IntelliJ Platform Plugin

**Current Version:** 2.11.0 (released January 26, 2026)
**Already Configured:** Yes, project uses `org.jetbrains.intellij.platform`

| Task | Purpose | When to Use |
|------|---------|-------------|
| `buildPlugin` | Creates distributable ZIP in `build/distributions/` | Every CI build |
| `verifyPlugin` | Runs Plugin Verifier against target IDEs | PR validation, release builds |
| `verifyPluginStructure` | Validates plugin.xml and archive integrity | Every build |
| `signPlugin` | Signs ZIP with certificate (optional) | Marketplace publishing |
| `publishPlugin` | Uploads to JetBrains Marketplace | Future Marketplace releases |

**Task Execution Order:**
```
buildPlugin -> signPlugin (if configured) -> publishPlugin
```

**Key Configuration (already in build.gradle.kts):**
```kotlin
intellijPlatform {
    pluginConfiguration {
        name = "BBj Language Support"
        version = project.version.toString()
        // ... vendor info, description, etc.
    }
    pluginVerification {
        ides {
            recommended()  // Verifies against recommended IDE versions
        }
    }
}
```

### GitHub Actions

**Recommended Versions:**

| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | v4 | Repository checkout |
| `actions/setup-java` | v5 | JDK setup with caching |
| `gradle/actions/setup-gradle` | v5 | Gradle setup with caching |
| `actions/upload-artifact` | v4 | Upload build artifacts |
| `softprops/action-gh-release` | v2 | Create GitHub releases with assets |

**Java Configuration:**
```yaml
- uses: actions/setup-java@v5
  with:
    distribution: 'temurin'
    java-version: '17'
    cache: 'gradle'
```

**Gradle Configuration:**
```yaml
- uses: gradle/actions/setup-gradle@v5
  # Automatic caching, wrapper validation
```

**Note:** The project already uses Java 17 (`sourceCompatibility = JavaVersion.VERSION_17`), which matches IntelliJ Platform 2024.2 requirements.

### GitHub Releases (Artifact Distribution)

**Action:** `softprops/action-gh-release@v2`

```yaml
- uses: softprops/action-gh-release@v2
  with:
    files: bbj-intellij/build/distributions/*.zip
    tag_name: intellij-v${{ env.VERSION }}
    name: IntelliJ Plugin v${{ env.VERSION }}
    prerelease: true  # For preview releases
```

**Key Features:**
- Creates release from tag automatically
- Uploads multiple assets with glob patterns
- Outputs `browser_download_url` for asset links
- Handles both new releases and updates to existing releases

### JetBrains Marketplace Publishing

**Requirements (for future use):**
1. **First upload must be manual** - cannot automate initial publication
2. **Personal Access Token** from JetBrains Marketplace profile ("My Tokens" section)
3. **Plugin signing** recommended but not required for first upload

**Token Configuration:**
```bash
# Environment variable (recommended for CI)
export ORG_GRADLE_PROJECT_intellijPlatformPublishingToken='YOUR_TOKEN'

# Or Gradle property
-PintellijPlatformPublishingToken=YOUR_TOKEN
```

**Gradle Configuration (for future Marketplace publishing):**
```kotlin
intellijPlatform {
    publishing {
        token = providers.gradleProperty("intellijPlatformPublishingToken")
        channels = listOf("eap")  // or "default" for stable
    }
}
```

**Release Channels:**
- `default` - Stable releases (visible to all users)
- `eap` / `beta` / `alpha` - Preview channels (requires custom repository setup)

### Version Extraction from package.json

**Approach:** Use Groovy's built-in `JsonSlurper` (no additional dependencies needed)

```kotlin
// In build.gradle.kts
import groovy.json.JsonSlurper

// Read version from bbj-vscode/package.json
val vscodePackageJson = file("${projectDir}/../bbj-vscode/package.json")
val packageJson = JsonSlurper().parseText(vscodePackageJson.readText()) as Map<*, *>
val vscodeVersion = packageJson["version"] as String

version = vscodeVersion
```

**For CI Preview Builds (patch bump):**
```kotlin
// Parse and bump patch version for previews
val parts = vscodeVersion.split(".")
val major = parts[0]
val minor = parts[1]
val patch = parts.getOrElse(2) { "0" }.toInt() + 1
version = "$major.$minor.$patch"
```

**Alternative: Command-line override:**
```bash
./gradlew buildPlugin -Pversion=0.7.3
```

## Integration Points

### Relationship to Existing VS Code Workflows

| VS Code Workflow | IntelliJ Equivalent | Shared Elements |
|------------------|---------------------|-----------------|
| `preview.yml` | `intellij-preview.yml` | Version from package.json, push to main trigger |
| `manual-release.yml` | `intellij-release.yml` | Manual trigger, version validation |
| `build.yml` | `build.yml` (extended) | PR validation |

**Shared Pattern:**
1. Both read version from `bbj-vscode/package.json`
2. Both bump patch version for previews
3. Both use GitHub Actions secrets for publishing tokens
4. Both create GitHub releases for artifacts

### Build Dependencies

The IntelliJ plugin depends on VS Code build outputs:
```kotlin
// From existing build.gradle.kts
val copyLanguageServer by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
    }
    // ...
}
```

**CI Implication:** IntelliJ build must run AFTER VS Code build completes (npm ci && npm run build).

### Recommended Workflow Sequence

```
1. Checkout
2. Setup Node.js (for VS Code build)
3. Build VS Code extension (npm ci, npm run build)
4. Setup Java 17
5. Setup Gradle
6. Extract version from package.json
7. Build IntelliJ plugin (./gradlew buildPlugin)
8. Verify plugin (./gradlew verifyPlugin) - optional for previews
9. Upload artifact / Create release
```

## Recommendations

### Immediate Implementation

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| Java Version | 17 (Temurin) | Already configured, matches IntelliJ 2024.2 |
| Gradle Plugin | 2.11.0 | Latest stable, update from current |
| GitHub Actions | setup-java@v5, setup-gradle@v5 | Current stable with caching |
| Artifact Distribution | GitHub Releases | No Marketplace access yet |
| Version Source | package.json via JsonSlurper | Single source of truth |

### Plugin Signing (Deferred)

Plugin signing is optional for GitHub Releases distribution. Defer until Marketplace access is obtained:

```kotlin
// Future addition to build.gradle.kts
intellijPlatform {
    signing {
        certificateChainFile = file("certificate-chain.crt")
        privateKeyFile = file("private.pem")
        password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
    }
}
```

**Certificate Generation (when needed):**
```bash
# Generate RSA key
openssl genpkey -aes-256-cbc -algorithm RSA \
  -out private_encrypted.pem -pkeyopt rsa_keygen_bits:4096

# Generate certificate (365 days)
openssl req -x509 -key private.pem -out certificate.crt -days 365
```

### Gradle IntelliJ Platform Plugin Update

Update `bbj-intellij/build.gradle.kts` to use latest version:

```kotlin
plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.11.0"
}
```

## CI Secrets Required

| Secret Name | Purpose | Where to Configure |
|-------------|---------|-------------------|
| `GITHUB_TOKEN` | GitHub Releases (automatic) | Built-in |
| `INTELLIJ_MARKETPLACE_TOKEN` | Future Marketplace publishing | Repository secrets |
| `PRIVATE_KEY_PASSWORD` | Future plugin signing | Repository secrets |

## Sources

### Official Documentation (HIGH confidence)
- [IntelliJ Platform Gradle Plugin 2.x](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html)
- [IntelliJ Plugin Tasks Reference](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html)
- [Publishing a Plugin](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)
- [Plugin Signing](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
- [Gradle Plugin Portal - org.jetbrains.intellij.platform](https://plugins.gradle.org/plugin/org.jetbrains.intellij.platform)

### GitHub Actions (HIGH confidence)
- [actions/setup-java](https://github.com/actions/setup-java)
- [gradle/actions](https://github.com/gradle/actions)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)

### Gradle Documentation (HIGH confidence)
- [Executing Gradle builds on GitHub Actions](https://docs.gradle.org/current/userguide/github-actions.html)
- [GitHub Actions - Gradle Cookbook](https://cookbook.gradle.org/ci/github-actions/)
