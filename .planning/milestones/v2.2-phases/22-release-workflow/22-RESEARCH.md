# Phase 22: Release Workflow - Research

**Researched:** 2026-02-05
**Domain:** GitHub Actions release automation for multi-platform extensions
**Confidence:** HIGH

## Summary

This phase extends the existing `manual-release.yml` workflow to build both VS Code and IntelliJ extensions, create a GitHub Release with both artifacts attached, and include IntelliJ installation instructions. The research focuses on GitHub Release creation patterns, artifact naming, auto-generated changelog from commits, and error handling strategies.

The existing `manual-release.yml` already handles version validation (x.y.0 format), package.json update, commit, tag, and VS Code Marketplace publishing. The extension adds: (1) IntelliJ plugin build using the artifact-sharing pattern from Phase 21's preview workflow, (2) GitHub Release creation with `gh release create`, and (3) custom release body with auto-generated changelog plus IntelliJ installation instructions.

The recommended approach uses the GitHub CLI (`gh release create`) which is pre-installed on all GitHub-hosted runners. This is simpler and more reliable than third-party actions like `softprops/action-gh-release` for this use case since we need precise control over release body content (installation instructions + changelog). Sequential job execution (VS Code first, then IntelliJ) is recommended over parallel because IntelliJ depends on `main.cjs` from VS Code build.

**Primary recommendation:** Add IntelliJ build job after VS Code publish, then use `gh release create --generate-notes` with `--notes` for prepended installation instructions, uploading both .vsix and versioned .zip as assets.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub CLI (gh) | Pre-installed | Create releases, upload assets | Native GitHub tool, pre-installed on runners, simpler than third-party actions |
| actions/upload-artifact | v4 | Share main.cjs between jobs | Official GitHub action, fast, reliable artifact sharing |
| actions/download-artifact | v5 | Retrieve main.cjs in IntelliJ job | Official companion to upload-artifact v4 |
| jq | Pre-installed | JSON manipulation | Pre-installed on runners, reliable for version extraction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vscode/vsce | ^2.32 | Package and publish VS Code extension | Already used in existing workflow |
| Gradle wrapper | 8.x | Build IntelliJ plugin | Committed to repository |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gh CLI | softprops/action-gh-release@v2 | Third-party dependency; gh is simpler for custom body with auto-notes |
| Sequential jobs | Parallel jobs | Cannot parallelize - IntelliJ needs main.cjs from VS Code build |
| Upload .vsix to release | Upload only to Marketplace | Users would lose direct download option |

**Installation:**
```bash
# No installation needed - all tools pre-installed on ubuntu-latest runners
# gh CLI: pre-installed
# jq: pre-installed
# Node.js: via actions/setup-node@v4
# Gradle wrapper: committed to repository
```

## Architecture Patterns

### Recommended Workflow Structure
```
.github/workflows/
├── build.yml             # PR builds (existing)
├── preview.yml           # On push to main (existing, Phase 21)
└── manual-release.yml    # Manual dispatch: release both extensions (Phase 22)
```

### Pattern 1: Sequential Jobs for Dependent Builds
**What:** Use `needs` keyword to chain VS Code build -> IntelliJ build -> Release creation
**When to use:** When one artifact depends on another (IntelliJ needs main.cjs from VS Code)
**Example:**
```yaml
# Source: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
jobs:
  release-vscode:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ github.event.inputs.version }}
      vsix_name: ${{ steps.package.outputs.vsix_name }}
    steps:
      # ... existing version validation, update, commit, tag, publish
      - name: Package extension
        id: package
        run: |
          npx vsce package
          echo "vsix_name=$(ls *.vsix)" >> $GITHUB_OUTPUT
      - name: Upload .vsix artifact
        uses: actions/upload-artifact@v4
        with:
          name: vscode-extension
          path: bbj-vscode/*.vsix
      - name: Upload language server
        uses: actions/upload-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/main.cjs

  build-intellij:
    needs: release-vscode
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download language server
        uses: actions/download-artifact@v4
        with:
          name: language-server
          path: bbj-vscode/out/language/
      - name: Build IntelliJ plugin
        run: ./gradlew buildPlugin -Pversion=${{ needs.release-vscode.outputs.version }}

  create-release:
    needs: [release-vscode, build-intellij]
    runs-on: ubuntu-latest
    steps:
      # Download artifacts and create release
```

### Pattern 2: GitHub Release with Auto-Generated Notes + Custom Content
**What:** Use `gh release create --generate-notes` with `--notes` to prepend custom content
**When to use:** When you want automatic changelog but also custom content (installation instructions)
**Example:**
```bash
# Source: https://cli.github.com/manual/gh_release_create
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --generate-notes \
  --notes "$(cat <<'EOF'
## Installation

### VS Code
Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang)

### IntelliJ
1. Download `bbj-intellij-X.Y.Z.zip` from this release
2. Open IntelliJ IDEA
3. Go to **Settings** > **Plugins**
4. Click the gear icon and select **Install Plugin from Disk...**
5. Select the downloaded ZIP file
6. Restart IntelliJ when prompted

## What's Changed
EOF
)" \
  "./*.vsix#VS Code Extension" \
  "./bbj-intellij-$VERSION.zip#IntelliJ Plugin"
```

### Pattern 3: Versioned Artifact Naming
**What:** Include version in IntelliJ ZIP filename during build or rename after
**When to use:** When artifacts need version identification outside of GitHub Release
**Example:**
```yaml
# Option A: Rename after Gradle build
- name: Build and rename IntelliJ plugin
  run: |
    cd bbj-intellij
    ./gradlew buildPlugin -Pversion=${{ needs.release-vscode.outputs.version }}
    mv build/distributions/*.zip build/distributions/bbj-intellij-${{ needs.release-vscode.outputs.version }}.zip

# Option B: Configure Gradle to name correctly (if archiveBaseName is set)
# The IntelliJ Platform Gradle Plugin names output as: {pluginName}-{version}.zip
# Default would be: bbj-lang-0.7.0.zip (from plugin configuration name)
```

### Anti-Patterns to Avoid
- **Parallel VS Code and IntelliJ builds:** IntelliJ MUST wait for VS Code because it needs main.cjs artifact
- **Using PAT instead of GITHUB_TOKEN for same-repo releases:** GITHUB_TOKEN is sufficient and more secure for releases within the same repository
- **Hardcoding version in release notes:** Use variable substitution to avoid version mismatch
- **Uploading artifacts without display labels:** Use `file#Label` syntax in gh release for better UX

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Changelog generation | Custom commit parsing script | `gh release create --generate-notes` | Handles edge cases, integrates with GitHub's PR tracking |
| Asset upload to release | REST API calls | `gh release create file1 file2` | Built-in, handles retries, proper error messages |
| Version validation | Regex in bash | Existing validation in manual-release.yml | Already tested, handles semver comparison |
| Artifact sharing | Git commit + pull | actions/upload-artifact + download-artifact | No git pollution, automatic cleanup |

**Key insight:** The `gh` CLI provides all release functionality needed; third-party actions add complexity without benefit for this use case.

## Common Pitfalls

### Pitfall 1: Missing `contents: write` Permission
**What goes wrong:** `gh release create` fails with "Resource not accessible by integration" error
**Why it happens:** Default GITHUB_TOKEN permissions don't include write access to releases
**How to avoid:** Add `permissions: contents: write` at workflow or job level
**Warning signs:** 403 or permission denied errors in release creation step

### Pitfall 2: Tag Already Exists When Creating Release
**What goes wrong:** `gh release create` fails because tag was pushed in earlier step
**Why it happens:** The existing workflow pushes tag before release creation; gh expects to create tag or find it
**How to avoid:** Use existing tag - release creation will attach to it
**Warning signs:** "tag already exists" warning (not necessarily error if tag exists)

### Pitfall 3: Release Already Exists for Tag
**What goes wrong:** Running workflow twice for same version creates duplicate release or fails
**Why it happens:** Version validation only checks package.json, not existing releases
**How to avoid:** Version validation already prevents this (must be greater than current), but workflow is idempotent - re-running will update existing release
**Warning signs:** "Release already exists" error from gh

### Pitfall 4: Artifact Download Path Mismatch
**What goes wrong:** IntelliJ build can't find main.cjs, build fails or produces broken plugin
**Why it happens:** download-artifact path doesn't match what Gradle copyLanguageServer task expects
**How to avoid:** Ensure download path is `bbj-vscode/out/language/` to match Gradle's `from("${projectDir}/../bbj-vscode/out/language/")`
**Warning signs:** "File not found" during prepareSandbox, or very small ZIP file (missing main.cjs)

### Pitfall 5: Marketplace Publish Fails After Commit
**What goes wrong:** Commit and tag pushed, but Marketplace publish fails; release in inconsistent state
**Why it happens:** Network issues, invalid VSCE_PAT, Marketplace downtime
**How to avoid:** Option A: Reorder to publish first (but requires tag for release); Option B: Make release job conditional on publish success (existing flow); Option C: Accept that manual re-run completes the process
**Warning signs:** Version tag exists on GitHub but extension not on Marketplace

### Pitfall 6: VSIX Filename Changes Between Versions
**What goes wrong:** Artifact upload or release creation uses wrong filename
**Why it happens:** vsce names output as `{name}-{version}.vsix`, so filename changes each release
**How to avoid:** Use glob pattern (`*.vsix`) or capture actual filename with `ls *.vsix`
**Warning signs:** "File not found" when uploading to release

## Code Examples

Verified patterns from official sources:

### GitHub Release with Auto-Notes and Custom Body
```bash
# Source: https://cli.github.com/manual/gh_release_create
# --notes content is PREPENDED to --generate-notes output
VERSION="25.12.0"
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --generate-notes \
  --notes "## Installation

### VS Code
Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang)

### IntelliJ IDEA
1. Download \`bbj-intellij-$VERSION.zip\` from the Assets below
2. Open IntelliJ IDEA
3. Go to **Settings** > **Plugins**
4. Click the gear icon and select **Install Plugin from Disk...**
5. Select the downloaded ZIP file
6. Restart IntelliJ when prompted

---
" \
  "bbj-vscode/bbj-lang-$VERSION.vsix#VS Code Extension (.vsix)" \
  "bbj-intellij/build/distributions/bbj-intellij-$VERSION.zip#IntelliJ Plugin (.zip)"
```

### Workflow Permissions for Release Creation
```yaml
# Source: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token
jobs:
  create-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Required for gh release create
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - name: Create GitHub Release
        run: |
          gh release create "v$VERSION" --title "v$VERSION" --generate-notes
```

### Capturing VSIX Filename
```yaml
# vsce names output dynamically based on package.json name and version
- name: Package VS Code extension
  id: package
  working-directory: bbj-vscode
  run: |
    npx vsce package
    VSIX_NAME=$(ls *.vsix)
    echo "vsix_name=$VSIX_NAME" >> $GITHUB_OUTPUT
```

### Renaming IntelliJ ZIP with Version
```bash
# Gradle produces: bbj-lang-{version}.zip (based on pluginConfiguration.name)
# Rename to include "intellij" for clarity
cd bbj-intellij
./gradlew buildPlugin -Pversion=$VERSION
mv build/distributions/bbj-lang-$VERSION.zip build/distributions/bbj-intellij-$VERSION.zip
```

### Job Output Passing
```yaml
# Source: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
jobs:
  release-vscode:
    outputs:
      version: ${{ github.event.inputs.version }}
    steps:
      # ... steps that use version

  build-intellij:
    needs: release-vscode
    steps:
      - name: Use version from previous job
        run: echo "Building version ${{ needs.release-vscode.outputs.version }}"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| actions/create-release + actions/upload-release-asset | gh release create (single command) | 2023 | Simpler, one command does everything |
| Separate changelog file maintenance | --generate-notes flag | 2022 | Automatic changelog from PRs/commits |
| Third-party release actions | Native gh CLI | Ongoing | Fewer dependencies, better support |

**Deprecated/outdated:**
- **actions/create-release**: Archived/unmaintained; use gh CLI instead
- **actions/upload-release-asset**: Archived; gh CLI handles asset upload

## Open Questions

Things that couldn't be fully resolved:

1. **IntelliJ ZIP naming convention**
   - What we know: Gradle produces `bbj-lang-{version}.zip` based on pluginConfiguration.name
   - What's unclear: Whether to keep as-is or rename to `bbj-intellij-{version}.zip` for clarity
   - Recommendation: Rename to `bbj-intellij-{version}.zip` per CONTEXT.md decision

2. **Error handling if Marketplace publish fails mid-workflow**
   - What we know: Current workflow commits/tags before publish; failure leaves partial state
   - What's unclear: Best recovery strategy (manual re-run vs. automated rollback)
   - Recommendation: Keep current order (commit/tag/publish is atomic conceptually); if publish fails, version bump already happened but that's acceptable - user re-runs after fixing PAT or waiting for Marketplace

3. **Whether to upload .vsix to release or rely on Marketplace only**
   - What we know: Some users prefer direct download over Marketplace
   - Recommendation: Include .vsix in release assets (already decided in CONTEXT.md)

## Discretionary Decisions

Based on research findings, recommendations for "Claude's Discretion" items from CONTEXT.md:

### Build Order: Sequential (Recommended)
**Recommendation:** Sequential execution (VS Code -> IntelliJ -> Release)
**Rationale:** IntelliJ build depends on main.cjs from VS Code build. Parallel is impossible due to this dependency. The only question is whether to create GitHub Release as separate job or combine with last build job.

### GitHub Release Job Structure: Separate Job (Recommended)
**Recommendation:** Create release in separate `create-release` job that depends on both builds
**Rationale:**
- Cleaner separation of concerns (build vs. release)
- Easier to re-run just release step if it fails
- Both artifacts already uploaded, just need to download and attach to release
- Clear job dependency visualization in GitHub Actions UI

### Error Handling for Marketplace Failure: Continue Workflow (Recommended)
**Recommendation:** Do not add special error handling; accept that workflow can be re-run
**Rationale:**
- Marketplace publish happens before IntelliJ build and release
- If publish fails, version is already committed but that's acceptable (new minor version bump next time)
- Adding retry logic or rollback adds significant complexity
- Manual re-run after fixing issue (PAT expiry, Marketplace downtime) is acceptable UX

## Sources

### Primary (HIGH confidence)
- [GitHub CLI: gh release create](https://cli.github.com/manual/gh_release_create) - All release creation options, --generate-notes flag
- [GitHub Docs: Using GitHub CLI in workflows](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-github-cli-in-workflows) - GH_TOKEN authentication
- [GitHub Docs: Automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) - How --generate-notes works
- [GitHub Docs: Controlling permissions for GITHUB_TOKEN](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token) - contents: write requirement

### Secondary (MEDIUM confidence)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release) - Alternative action, verified generate_release_notes feature
- [GitHub Blog: Get started with v4 of GitHub Actions Artifacts](https://github.blog/news-insights/product-news/get-started-with-v4-of-github-actions-artifacts/) - Artifact v4 features

### Tertiary (LOW confidence)
- [Medium: Running GitHub Actions in Parallel and Sequentially](https://medium.com/@nickjabs/running-github-actions-in-parallel-and-sequentially-b338e4a46bf5) - Job ordering patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gh CLI is official GitHub tool, well-documented
- Architecture: HIGH - Patterns verified against existing preview.yml and official docs
- Pitfalls: HIGH - Based on official documentation and existing workflow patterns
- Discretionary decisions: MEDIUM - Based on research but not validated in production

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days; GitHub CLI and Actions are stable)
