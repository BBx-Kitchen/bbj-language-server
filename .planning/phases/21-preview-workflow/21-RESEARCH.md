# Phase 21: Preview Workflow - Research

**Researched:** 2026-02-05
**Domain:** GitHub Actions CI/CD for multi-platform extension builds
**Confidence:** HIGH

## Summary

GitHub Actions provides robust support for multi-job workflows with artifact sharing and job dependencies. The standard approach for building dependent artifacts (IntelliJ plugin depending on VS Code extension) uses the `needs` keyword to establish sequential execution, and `actions/upload-artifact@v4` / `actions/download-artifact@v5` to share build outputs between jobs.

The preview workflow pattern builds on the existing VS Code preview workflow (`.github/workflows/preview.yml`) by adding a second job that depends on the VS Code build, downloads the `main.cjs` artifact, and runs the IntelliJ Gradle build. Version synchronization is achieved by reading `bbj-vscode/package.json` with `jq` (pre-installed on GitHub runners) and passing the version to both builds.

IntelliJ plugins built with `org.jetbrains.intellij.platform` Gradle plugin use the `buildPlugin` task to create distributable ZIP archives in `build/distributions/`. The plugin version can be set via Gradle properties or system properties, allowing CI/CD workflows to inject versions dynamically.

**Primary recommendation:** Use a two-job workflow with `needs` dependency, share `main.cjs` via artifacts, read version from `package.json` with `jq`, and pass it to both VS Code and IntelliJ builds.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Actions | Native | CI/CD workflow orchestration | Native GitHub integration, free for public repos |
| actions/checkout | v4 | Clone repository into runner | Official GitHub action, required first step |
| actions/upload-artifact | v4 | Share files between jobs | Official artifact management, 90% faster than v3 |
| actions/download-artifact | v5 | Retrieve artifacts in dependent jobs | Official companion to upload-artifact |
| actions/setup-node | v4 | Install Node.js runtime | Official Node.js setup, supports version matrix |
| jq | 1.6+ | Parse JSON in bash scripts | Pre-installed on GitHub runners, standard JSON processor |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| IntelliJ Platform Gradle Plugin | 2.x | Build IntelliJ plugins | Required for all IntelliJ plugin projects |
| Gradle wrapper | 8.x | Execute Gradle builds | Standard for Java/Kotlin projects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jq for JSON parsing | Node.js script with fs.readFileSync | More verbose, requires Node setup (though already needed) |
| upload-artifact v4 | upload-artifact v3 | v3 deprecated, v4 is 90% faster and prevents concurrent write conflicts |
| Gradle properties | Environment variables | Properties integrate better with Gradle's configuration cache |

**Installation:**
```bash
# No installation needed - all tools pre-installed on ubuntu-latest runners
# jq: pre-installed
# Node.js: via actions/setup-node@v4
# Gradle wrapper: committed to repository
```

## Architecture Patterns

### Recommended Workflow Structure
```
.github/workflows/
├── preview.yml           # On push to main: build both extensions
├── build.yml             # On PR: build VS Code only (existing)
└── manual-release.yml    # Manual trigger: release both (Phase 22)
```

### Pattern 1: Sequential Job Dependencies with Artifact Sharing
**What:** Use `needs` keyword to create job dependency chain, upload artifacts in first job, download in dependent job
**When to use:** When one build consumes output from another build (IntelliJ needs main.cjs from VS Code)
**Example:**
```yaml
# Source: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
jobs:
  build-vscode:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build VS Code extension
        run: |
          cd bbj-vscode
          npm ci
          npm run build
      - name: Upload main.cjs
        uses: actions/upload-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/main.cjs

  build-intellij:
    runs-on: ubuntu-latest
    needs: build-vscode  # Wait for VS Code build to complete
    steps:
      - uses: actions/checkout@v4
      - name: Download main.cjs
        uses: actions/download-artifact@v5
        with:
          name: language-server
          path: bbj-vscode/out/language/
      - name: Build IntelliJ plugin
        run: |
          cd bbj-intellij
          ./gradlew buildPlugin
```

### Pattern 2: Version Synchronization from package.json
**What:** Extract version from package.json using jq, pass to multiple builds via environment variables
**When to use:** When maintaining unified version across multiple platform extensions
**Example:**
```yaml
# Source: https://www.w3tutorials.net/blog/read-json-file-in-github-actions/
jobs:
  build-vscode:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Extract version
        id: version
        run: |
          VERSION=$(jq -r .version bbj-vscode/package.json)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      - name: Bump version for preview
        run: |
          cd bbj-vscode
          PARTS=(${VERSION//./ })
          # Increment patch version
          PATCH=$((${PARTS[2]:-0} + 1))
          NEW_VERSION="${PARTS[0]}.${PARTS[1]}.$PATCH"
          jq ".version = \"$NEW_VERSION\"" package.json > tmp && mv tmp package.json
    outputs:
      version: ${{ steps.version.outputs.version }}

  build-intellij:
    needs: build-vscode
    runs-on: ubuntu-latest
    steps:
      - name: Build with version
        run: |
          cd bbj-intellij
          ./gradlew buildPlugin -Pversion=${{ needs.build-vscode.outputs.version }}
```

### Pattern 3: IntelliJ Plugin Version Injection
**What:** Pass version to Gradle via system property or project property, override build.gradle.kts hardcoded version
**When to use:** When CI/CD needs to control plugin version dynamically
**Example:**
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
// build.gradle.kts
version = providers.gradleProperty("version")
  .orElse(providers.systemProperty("version"))
  .getOrElse("0.1.0")  // Fallback for local builds
```

```yaml
# GitHub Actions workflow
- name: Build IntelliJ plugin with custom version
  run: ./gradlew buildPlugin -Pversion=0.7.3
```

### Anti-Patterns to Avoid
- **Manual version duplication:** Hardcoding same version in multiple files leads to desync; always use single source of truth (package.json)
- **Parallel independent builds:** IntelliJ plugin MUST wait for VS Code build because it needs main.cjs artifact; using parallel jobs causes race conditions
- **Artifact name conflicts:** Multiple jobs uploading to same artifact name in v4 will fail; use unique names or overwrite flag
- **Forgetting actions/checkout:** Every job runs in isolated environment; must checkout code before any build steps

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing in bash | Custom bash string manipulation | jq command-line tool | Pre-installed, handles edge cases (nested objects, escaping), battle-tested |
| Artifact sharing between jobs | Git commit + pull in next job | actions/upload-artifact + actions/download-artifact | Native GitHub support, no git pollution, automatic cleanup after retention period |
| Version bumping logic | Complex bash arithmetic | Existing preview.yml pattern | Already tested, handles 2-part and 3-part semver |
| Job sequencing | Sleep loops or polling | needs keyword | Built-in dependency resolution, fails fast on upstream errors |

**Key insight:** GitHub Actions provides built-in primitives for all multi-job workflow patterns; custom solutions introduce failure modes (concurrent access, cleanup, error handling) that are already solved by official actions.

## Common Pitfalls

### Pitfall 1: Artifact Upload/Download Version Mismatch
**What goes wrong:** Using upload-artifact@v3 with download-artifact@v4 causes "Artifact not found" errors
**Why it happens:** v4 introduced new backend storage system incompatible with v3; artifacts uploaded with v3 cannot be downloaded with v4 or v5
**How to avoid:** Always use matching versions - upload-artifact@v4 with download-artifact@v5 (v5 is backward compatible with v4 uploads)
**Warning signs:** Error message "Unable to find artifact" despite successful upload in previous job
**Source:** https://github.blog/news-insights/product-news/get-started-with-v4-of-github-actions-artifacts/

### Pitfall 2: Missing needs Dependency
**What goes wrong:** Dependent job starts before prerequisite job completes, tries to download artifact that doesn't exist yet
**Why it happens:** GitHub Actions runs jobs in parallel by default; without explicit `needs` declaration, no ordering is enforced
**How to avoid:** Always declare `needs: [job-name]` in dependent jobs to establish sequential execution
**Warning signs:** Intermittent failures where download-artifact sometimes succeeds (if jobs happen to run sequentially) and sometimes fails (if they overlap)
**Source:** https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts

### Pitfall 3: Artifact Name Collisions in v4
**What goes wrong:** Multiple jobs try to upload to same artifact name, second upload fails with conflict error
**Why it happens:** v4 made artifacts immutable to prevent concurrent write corruption; v3 allowed (but broke) concurrent uploads to same name
**How to avoid:** Use unique artifact names per job, or use `overwrite: true` if intentional replacement
**Warning signs:** Error "Artifact name already exists" in GitHub Actions logs
**Source:** https://github.com/actions/upload-artifact/tree/v4

### Pitfall 4: IntelliJ Plugin Missing main.cjs Dependency
**What goes wrong:** IntelliJ Gradle build completes successfully but plugin ZIP contains no language server, plugin fails at runtime
**Why it happens:** Gradle build tasks reference `bbj-vscode/out/language/main.cjs` but don't enforce its existence; build succeeds even if file is missing
**How to avoid:** Always run IntelliJ build in job with `needs: [vscode-build-job]` and explicitly download main.cjs artifact before Gradle execution
**Warning signs:** Build logs show "UP-TO-DATE" for copyLanguageServer task; plugin ZIP is much smaller than expected (no main.cjs inside)

### Pitfall 5: Version Synchronization Drift
**What goes wrong:** VS Code and IntelliJ plugins end up with different version numbers despite being built from same commit
**Why it happens:** Preview workflow bumps VS Code package.json version but doesn't propagate that bumped version to IntelliJ build
**How to avoid:** Extract version AFTER bumping package.json, pass bumped version to IntelliJ build via Gradle property
**Warning signs:** VS Code shows version 0.7.3, IntelliJ shows 0.1.0 (hardcoded default)

### Pitfall 6: Gradle Build Directory Not Fresh
**What goes wrong:** IntelliJ build artifacts contain stale main.cjs from previous local build instead of fresh artifact from workflow
**Why it happens:** GitHub runners cache actions/checkout working directory; if main.cjs already exists, download-artifact may not overwrite it
**How to avoid:** Use `path` parameter in download-artifact to specify exact location, ensuring overwrite of any existing file
**Warning signs:** Plugin version doesn't match VS Code version despite correct Gradle property; main.cjs timestamp doesn't match workflow run time

## Code Examples

Verified patterns from official sources:

### Extracting Version from package.json
```bash
# Source: https://www.w3tutorials.net/blog/read-json-file-in-github-actions/
VERSION=$(jq -r .version bbj-vscode/package.json)
echo "Extracted version: $VERSION"
echo "version=$VERSION" >> $GITHUB_OUTPUT
```

### Uploading Build Artifact
```yaml
# Source: https://github.com/actions/upload-artifact
- name: Upload language server artifact
  uses: actions/upload-artifact@v4
  with:
    name: language-server
    path: bbj-vscode/out/language/main.cjs
    retention-days: 1  # Preview artifacts don't need long retention
```

### Downloading Artifact in Dependent Job
```yaml
# Source: https://github.com/actions/download-artifact
- name: Download language server
  uses: actions/download-artifact@v5
  with:
    name: language-server
    path: bbj-vscode/out/language/
```

### Job Dependency Declaration
```yaml
# Source: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
jobs:
  build-vscode:
    runs-on: ubuntu-latest
    steps:
      # ... build steps

  build-intellij:
    runs-on: ubuntu-latest
    needs: build-vscode  # This job waits for build-vscode to complete
    steps:
      # ... build steps that depend on vscode artifacts
```

### IntelliJ Gradle Build with Version Override
```bash
# Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
./gradlew buildPlugin -Pversion=0.7.3

# Artifact location after build
ls -la bbj-intellij/build/distributions/*.zip
# Output: bbj-intellij/build/distributions/bbj-lang-0.7.3.zip
```

### Uploading IntelliJ Plugin Artifact
```yaml
# Source: https://github.com/actions/upload-artifact
- name: Upload IntelliJ plugin
  uses: actions/upload-artifact@v4
  with:
    name: intellij-plugin
    path: bbj-intellij/build/distributions/*.zip
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| upload-artifact@v3 | upload-artifact@v4 | Jan 2025 | v3 deprecated, v4 required; 90% faster uploads, immutable artifacts prevent concurrent write bugs |
| download-artifact@v3 | download-artifact@v5 | Nov 2024 | v5 backward compatible with v4 uploads, runs on Node.js 20 |
| Manual version in gradle.properties | Dynamic version via -P flag | Ongoing | Allows CI/CD to control version without committing files |
| Gradle IntelliJ Plugin (1.x) | IntelliJ Platform Gradle Plugin (2.x) | 2024 | New plugin ID org.jetbrains.intellij.platform, better artifact management, faster builds |

**Deprecated/outdated:**
- **actions/upload-artifact@v3**: Officially deprecated January 30, 2025; must migrate to v4+
- **actions/download-artifact@v3**: Incompatible with v4 uploads; use v5 for all new workflows
- **gradle-intellij-plugin (1.x)**: Legacy plugin ID, replaced by org.jetbrains.intellij.platform in 2.x

## Open Questions

Things that couldn't be fully resolved:

1. **Commit preview version bump in workflow vs separate commit?**
   - What we know: Existing preview.yml commits version bump to main with `git push`
   - What's unclear: Whether IntelliJ build should also commit its build.gradle.kts with new version, or only use runtime -P flag
   - Recommendation: Use -P flag only for IntelliJ (no commit); keep package.json as single source of truth that gets committed

2. **Artifact retention period for preview builds?**
   - What we know: Default retention is 90 days, can be set per-artifact with retention-days parameter
   - What's unclear: Whether preview artifacts need to be downloadable long-term or can be ephemeral
   - Recommendation: Use retention-days: 7 for preview artifacts (long enough for QA, short enough to avoid storage costs)

3. **Should buildPlugin run prepareSandbox explicitly?**
   - What we know: buildPlugin task depends on prepareSandbox automatically; prepareSandbox depends on main.cjs existing
   - What's unclear: Whether explicit `./gradlew prepareSandbox` before `buildPlugin` provides better error messages if main.cjs is missing
   - Recommendation: Run only buildPlugin; Gradle's task dependency will fail fast if main.cjs is missing, providing clear error

## Sources

### Primary (HIGH confidence)
- [GitHub Actions: Store and share data with workflow artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts) - Job dependencies with needs keyword
- [GitHub Actions: upload-artifact v4](https://github.com/actions/upload-artifact) - Official action for artifact uploads
- [GitHub Actions: download-artifact v5](https://github.com/actions/download-artifact) - Official action for artifact downloads
- [IntelliJ Platform Gradle Plugin: Tasks](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html) - buildPlugin task and distribution output
- [GitHub Blog: Get started with v4 of GitHub Actions Artifacts](https://github.blog/news-insights/product-news/get-started-with-v4-of-github-actions-artifacts/) - v4 changes and migration

### Secondary (MEDIUM confidence)
- [W3 Tutorials: Read JSON file in GitHub Actions](https://www.w3tutorials.net/blog/read-json-file-in-github-actions/) - jq pattern for version extraction (verified with jq official docs)
- [IntelliJ Platform Plugin Template](https://github.com/JetBrains/intellij-platform-plugin-template) - Official JetBrains template showing CI/CD patterns
- [Medium: Understanding Job Artifacts in GitHub Actions](https://medium.com/@sovisrushain/understanding-job-artifacts-job-outputs-and-dependency-caching-in-github-actions-23c68cb51091) - Conceptual overview (verified against official docs)

### Tertiary (LOW confidence)
- [GitHub Community Discussion: How should I publish artifacts?](https://github.com/orgs/community/discussions/171247) - Community best practices (not official guidance)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools are official GitHub Actions or JetBrains official plugins with stable versions
- Architecture: HIGH - Patterns verified against official documentation and existing working preview.yml
- Pitfalls: MEDIUM - Based on v4 migration docs and community issues, but not all tested in this specific context

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days; GitHub Actions and Gradle plugin versions are stable)
