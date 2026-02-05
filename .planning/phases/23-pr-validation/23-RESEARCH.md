# Phase 23: PR Validation - Research

**Researched:** 2026-02-05
**Domain:** GitHub Actions CI/CD workflows, IntelliJ Platform plugin validation
**Confidence:** HIGH

## Summary

Pull request validation for IntelliJ plugins requires two distinct approaches: path-based filtering to trigger builds only when relevant files change, and plugin verification to ensure binary compatibility with target IDE versions.

GitHub Actions provides native path filtering through the `paths` configuration in workflow triggers, which is the standard approach for monorepo-style projects with multiple independent components. For IntelliJ plugin validation, the IntelliJ Platform Gradle Plugin 2.x includes a `verifyPlugin` task that runs the IntelliJ Plugin Verifier tool to check binary compatibility across IDE versions.

The existing project already has a working pattern: the `build.yml` workflow validates VS Code extension builds on PRs, and the `preview.yml` workflow demonstrates the two-job pattern (build VS Code → build IntelliJ) with artifact passing for the shared language server. Phase 23 extends this pattern by adding path-filtered PR validation for the IntelliJ plugin.

**Primary recommendation:** Create a PR validation workflow that uses native GitHub Actions path filtering to trigger only when bbj-intellij/ or shared dependencies change, builds both VS Code and IntelliJ plugins (to ensure language server compatibility), and runs verifyPlugin to catch API incompatibilities early.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Actions | 2026 | CI/CD platform | Native integration with GitHub, no external services needed |
| IntelliJ Platform Gradle Plugin | 2.x (latest: 2.10.5) | Plugin build automation | Official JetBrains tool, replaces deprecated 1.x plugin |
| IntelliJ Plugin Verifier | Latest (1.398+) | Binary compatibility verification | Official JetBrains tool, catches API issues before runtime |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| actions/checkout | v4 | Repository checkout | Standard for all workflows |
| actions/setup-node | v4 | Node.js environment | Required for VS Code extension builds |
| actions/setup-java | v4 | Java environment | Required for IntelliJ plugin builds (Java 17) |
| actions/upload-artifact | v4 | Cross-job artifact sharing | Pass language server from VS Code to IntelliJ job |
| actions/download-artifact | v4 | Retrieve artifacts | Receive language server in IntelliJ job |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native paths filter | dorny/paths-filter action | More powerful filtering with job/step-level control, but adds complexity; not needed for simple directory-based filtering |
| Gradle verifyPlugin | ChrisCarini/intellij-platform-plugin-verifier-action | GitHub Action wrapper around same tool; simpler syntax but less control; Gradle task preferred for consistency with existing builds |
| Separate workflows | Single workflow with conditionals | Could split VS Code and IntelliJ into separate workflows, but unified workflow better matches preview/release patterns |

**Installation:**
```bash
# Already in project - no additional dependencies needed
# IntelliJ Platform Gradle Plugin configured in bbj-intellij/build.gradle.kts
# GitHub Actions built into platform
```

## Architecture Patterns

### Recommended Workflow Structure
```
.github/workflows/
├── build.yml              # Existing: VS Code PR validation
├── preview.yml            # Existing: Push to main → publish preview
├── manual-release.yml     # Existing: Manual release workflow
└── pr-validation.yml      # NEW: IntelliJ PR validation
```

### Pattern 1: Path-Filtered PR Trigger
**What:** Use GitHub Actions native path filtering to trigger workflow only when relevant files change
**When to use:** Always for monorepo-style projects with independent components
**Example:**
```yaml
# Source: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
on:
  pull_request:
    branches:
      - main
    paths:
      - 'bbj-intellij/**'
      - 'bbj-vscode/out/language/**'
      - 'bbj-vscode/tools/**'
      - '.github/workflows/pr-validation.yml'
```

### Pattern 2: Two-Job Build with Artifact Passing
**What:** Build VS Code extension first to generate language server, then pass to IntelliJ build
**When to use:** When IntelliJ plugin depends on artifacts from VS Code build
**Example:**
```yaml
# Source: .github/workflows/preview.yml (existing project pattern)
jobs:
  build-vscode:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Build
        run: cd bbj-vscode && npm ci && npm run build
      - name: Upload language server
        uses: actions/upload-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/main.cjs

  build-intellij:
    needs: build-vscode
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download language server
        uses: actions/download-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/
      - uses: actions/setup-java@v4
      - name: Build and verify
        run: cd bbj-intellij && ./gradlew buildPlugin verifyPlugin
```

### Pattern 3: Plugin Verification Configuration
**What:** Configure IDE versions and failure levels for plugin verification
**When to use:** Always for IntelliJ plugin builds in CI/CD
**Example:**
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
// Already configured in bbj-intellij/build.gradle.kts
intellijPlatform {
    pluginVerification {
        ides {
            recommended()  // Tests against recommended IDE versions
        }
    }
}

dependencies {
    intellijPlatform {
        pluginVerifier()  // Includes verifier tool
    }
}
```

### Anti-Patterns to Avoid
- **Running verifyPlugin on every push to non-main branches:** Expensive operation; reserve for PRs targeting main
- **Using paths-ignore instead of paths:** Harder to reason about what triggers the workflow; explicit inclusion is clearer
- **Omitting GITHUB_TOKEN environment variable:** Causes rate limiting issues when resolving latest verifier version
- **Mixing PR validation with release logic:** Keep PR validation focused on verification only; no publishing, tagging, or version bumping

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path change detection | Custom git diff scripts | GitHub Actions native `paths` filter | Built-in, tested, handles edge cases (merge commits, file renames) |
| IDE compatibility checking | Custom API reflection checks | IntelliJ Plugin Verifier | Catches binary incompatibilities, missing dependencies, API deprecations that reflection won't find |
| Cross-job file passing | Workspace persistence hacks | actions/upload-artifact + actions/download-artifact | Handles cleanup, compression, retention policies automatically |
| Conditional job execution | Complex bash conditionals | GitHub Actions `needs` and `if` expressions | Native workflow orchestration with better failure handling |

**Key insight:** CI/CD platforms provide robust primitives that handle edge cases (concurrent runs, artifact cleanup, security, caching). Custom scripts miss these details and create maintenance burden.

## Common Pitfalls

### Pitfall 1: Path Filter with Both Inclusion and Exclusion
**What goes wrong:** Workflow uses both `paths` and `paths-ignore` in same event
**Why it happens:** Natural to think "include X but exclude Y"
**How to avoid:** Use only `paths` with `!` prefix for exclusions:
```yaml
paths:
  - 'bbj-intellij/**'
  - '!bbj-intellij/docs/**'
```
**Warning signs:** Workflow file validation error, workflow not triggering when expected

### Pitfall 2: Missing GITHUB_TOKEN for Plugin Verifier
**What goes wrong:** Plugin verifier fails to resolve latest version, hits GitHub API rate limits
**Why it happens:** Anonymous API requests limited to 60/hour per IP; CI runners share IPs
**How to avoid:** Always set GITHUB_TOKEN environment variable:
```yaml
- name: Verify Plugin
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: ./gradlew verifyPlugin
```
**Warning signs:** Error message about API rate limits, "Failed to resolve latest verifier version"

### Pitfall 3: Forgetting Shared Dependencies in Path Filter
**What goes wrong:** Changes to language server or shared tools don't trigger IntelliJ validation
**Why it happens:** Focus on bbj-intellij/ directory, forget that plugin depends on bbj-vscode artifacts
**How to avoid:** Include all dependency paths in filter:
```yaml
paths:
  - 'bbj-intellij/**'
  - 'bbj-vscode/out/language/**'  # Language server dependency
  - 'bbj-vscode/tools/**'          # Shared tools
  - 'bbj-vscode/syntaxes/**'       # TextMate bundles
```
**Warning signs:** Build passes but runtime issues appear when language server changes

### Pitfall 4: Using Old Gradle Plugin Syntax
**What goes wrong:** References to `runPluginVerifier` task fail; old IntelliJ Plugin 1.x configuration doesn't work
**Why it happens:** IntelliJ Platform Gradle Plugin 2.x (current) replaced 1.x with different task names and DSL
**How to avoid:** Use `verifyPlugin` task (not `runPluginVerifier`) and 2.x DSL configuration
**Warning signs:** Task not found errors, deprecation warnings in Gradle output

### Pitfall 5: Not Building VS Code Extension First
**What goes wrong:** IntelliJ build fails because language server artifact doesn't exist
**Why it happens:** IntelliJ plugin depends on bbj-vscode/out/language/main.cjs generated by VS Code build
**How to avoid:** Always build VS Code extension first and pass artifact to IntelliJ job:
```yaml
jobs:
  build-intellij:
    needs: build-vscode  # Critical: ensures VS Code builds first
```
**Warning signs:** IntelliJ build task fails with "file not found" for language server

## Code Examples

Verified patterns from official sources:

### Path-Filtered PR Workflow
```yaml
# Source: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
# Pattern: .github/workflows/deploy-docs.yml (existing project)
name: PR Validation - IntelliJ

on:
  pull_request:
    branches:
      - main
    paths:
      - 'bbj-intellij/**'
      - 'bbj-vscode/out/language/**'
      - 'bbj-vscode/tools/**'
      - 'bbj-vscode/syntaxes/**'
      - '.github/workflows/pr-validation.yml'

jobs:
  validate-intellij:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and verify
        run: echo "Build steps here"
```

### Running Plugin Verification
```yaml
# Source: https://github.com/JetBrains/intellij-platform-plugin-template/blob/main/.github/workflows/build.yml
# Pattern: Official JetBrains plugin template
- name: Verify Plugin
  working-directory: bbj-intellij
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: ./gradlew verifyPlugin
```

### Existing Two-Job Pattern (for reference)
```yaml
# Source: .github/workflows/preview.yml (current project)
jobs:
  publish-preview:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.bump.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install deps and build
        working-directory: bbj-vscode
        run: npm ci
      - name: Upload language server
        uses: actions/upload-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/main.cjs
          retention-days: 7

  build-intellij:
    runs-on: ubuntu-latest
    needs: publish-preview
    steps:
      - uses: actions/checkout@v4
      - name: Download language server
        uses: actions/download-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Build IntelliJ plugin
        working-directory: bbj-intellij
        run: ./gradlew buildPlugin -Pversion=${{ needs.publish-preview.outputs.version }}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gradle IntelliJ Plugin 1.x | IntelliJ Platform Gradle Plugin 2.x | 2024 | Task names changed (runPluginVerifier → verifyPlugin); DSL restructured; better dependency management |
| Manual IDE download for verification | pluginVerifier() dependency | 2024 | Automatic IDE download and caching; no manual setup |
| actions/upload-artifact v3 | actions/upload-artifact v4 | 2024 | Better artifact retention policies, improved performance |
| Node 18 | Node 20 | 2024 | Required for latest npm packages, security updates |

**Deprecated/outdated:**
- **runPluginVerifier task**: Replaced by `verifyPlugin` in IntelliJ Platform Gradle Plugin 2.x
- **actions/checkout@v3**: Use v4 for latest features and security fixes
- **paths-filter with workflow-level conditions**: Native `paths` now handles most use cases without third-party actions

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal IDE version coverage for verifyPlugin**
   - What we know: `recommended()` configuration tests against JetBrains-recommended IDE versions; current build.gradle.kts uses this
   - What's unclear: Whether additional version ranges (e.g., older IDE versions for broader compatibility) should be tested
   - Recommendation: Start with `recommended()` configuration; expand if users report compatibility issues with specific IDE versions

2. **Artifact retention for PR builds**
   - What we know: Preview workflow uses 7 days; release workflow uses 1 day
   - What's unclear: Optimal retention for PR validation artifacts (likely not needed long-term)
   - Recommendation: Use 1-3 days for PR builds; enough for debugging but not long-term storage

3. **Whether to fail PR on verifyPlugin warnings vs errors**
   - What we know: Plugin verifier has configurable failure levels (COMPATIBILITY_PROBLEMS, INVALID_PLUGIN, etc.)
   - What's unclear: Whether strict enforcement (fail on warnings) or permissive (fail only on errors) is better
   - Recommendation: Default configuration in build.gradle.kts already handles this; no override needed unless specific issues arise

## Sources

### Primary (HIGH confidence)
- Official GitHub Actions documentation - [Triggering a workflow](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow) - Path filtering syntax and behavior
- IntelliJ Platform Plugin SDK - [Verifying Plugin Compatibility](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html) - Plugin verification best practices
- IntelliJ Platform Plugin SDK - [Plugin Tasks](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html) - verifyPlugin task configuration
- JetBrains Plugin Verifier - [GitHub Repository](https://github.com/JetBrains/intellij-plugin-verifier) - What the tool checks and common failures
- JetBrains Platform Blog - [Busy Plugin Developers Newsletter Q4 2025](https://blog.jetbrains.com/platform/2026/01/busy-plugin-developers-newsletter-q4-2025/) - Recent updates to Gradle plugin

### Secondary (MEDIUM confidence)
- JetBrains Plugin Template - [build.yml workflow](https://github.com/JetBrains/intellij-platform-plugin-template/blob/main/.github/workflows/build.yml) - Official pattern for PR validation
- Existing project workflows - .github/workflows/preview.yml, deploy-docs.yml - Proven patterns in current codebase

### Tertiary (LOW confidence)
- GitHub Marketplace - [IntelliJ Platform Plugin Verifier Action](https://github.com/marketplace/actions/intellij-platform-plugin-verifier) - Third-party wrapper; not needed but documents common pitfalls
- Community discussions - [GitHub Actions monorepo patterns](https://github.com/dorny/paths-filter) - Alternative approaches not needed for this project

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official tools and actions, current versions verified
- Architecture: HIGH - Native GitHub Actions features, patterns from official JetBrains template and existing project workflows
- Pitfalls: HIGH - Documented in official sources and community issues

**Research date:** 2026-02-05
**Valid until:** 60 days (stable platform, low churn)
