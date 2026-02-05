# Architecture Research: IntelliJ CI/CD Integration

**Domain:** CI/CD automation for dual-extension monorepo (VS Code + IntelliJ)
**Researched:** 2026-02-05
**Confidence:** HIGH (verified against GitHub Actions official docs, JetBrains plugin template, existing workflows)

## Executive Summary

The BBj language server repository contains two extensions: a VS Code extension (bbj-vscode) and an IntelliJ plugin (bbj-intellij). The IntelliJ plugin has a hard dependency on VS Code build artifacts - specifically `main.cjs` (the language server bundle) and TextMate grammar files. This creates a sequential build requirement: VS Code must build first, then IntelliJ.

The recommended approach is to **extend existing workflows** with sequential jobs using `needs:` dependencies and artifact sharing via `upload-artifact`/`download-artifact`. This leverages GitHub Actions' native artifact passing, keeps version management unified, and creates a single GitHub Release with both artifacts.

## Build Dependencies

### Dependency Graph

```
bbj-vscode/
    npm ci
    npm run build
        |
        v
    out/language/main.cjs ----+
    syntaxes/*.tmLanguage.json |
    *-language-configuration.json
                              |
                              v
bbj-intellij/
    ./gradlew buildPlugin
        |
        v
    build/distributions/*.zip
```

### IntelliJ Dependency on VS Code Artifacts

From `bbj-intellij/build.gradle.kts`, the IntelliJ plugin copies these VS Code assets:

| VS Code Source | IntelliJ Destination | Used For |
|---------------|---------------------|----------|
| `bbj-vscode/out/language/main.cjs` | `resources/main/language-server/` | Language server runtime |
| `bbj-vscode/syntaxes/bbj.tmLanguage.json` | `resources/main/textmate/bbj-bundle/` | Syntax highlighting |
| `bbj-vscode/syntaxes/bbx.tmLanguage.json` | `resources/main/textmate/bbj-bundle/` | Config file highlighting |
| `bbj-vscode/bbj-language-configuration.json` | `resources/main/textmate/bbj-bundle/` | Language configuration |
| `bbj-vscode/bbx-language-configuration.json` | `resources/main/textmate/bbj-bundle/` | Config language configuration |
| `bbj-vscode/tools/web.bbj` | `resources/main/tools/` | Web runner tool |

**Critical:** The `main.cjs` file is produced by `npm ci` (which runs the build via the `prepare` script). Without a successful VS Code build, IntelliJ's `buildPlugin` task will fail because it cannot find the required files.

### Build Order Requirements

1. **VS Code Build (npm ci)** - Produces `out/language/main.cjs` and other assets
2. **IntelliJ Build (./gradlew buildPlugin)** - Copies VS Code assets and produces `.zip` distribution

This ordering is non-negotiable. The IntelliJ build Gradle tasks explicitly reference paths in `../bbj-vscode/`.

## Workflow Structure Options

### Option A: Extend Existing Workflows (RECOMMENDED)

Add IntelliJ build as a dependent job in existing `preview.yml` and `manual-release.yml`.

**Pros:**
- Single workflow orchestrates both builds
- Version management stays centralized
- Artifact sharing via `upload-artifact`/`download-artifact` is native
- Single git tag for both releases
- Easier to maintain - one file to update
- Clear job dependency visualization in GitHub UI

**Cons:**
- Longer workflow files
- VS Code failure blocks IntelliJ build (but this is correct behavior given the dependency)

**Structure:**
```yaml
jobs:
  build-vscode:
    runs-on: ubuntu-latest
    steps:
      # Build VS Code, upload artifacts

  build-intellij:
    needs: build-vscode
    runs-on: ubuntu-latest
    steps:
      # Download VS Code artifacts
      # Build IntelliJ plugin

  release:
    needs: [build-vscode, build-intellij]
    runs-on: ubuntu-latest
    steps:
      # Download both artifacts
      # Create/update GitHub Release
```

### Option B: Separate IntelliJ Workflows

Create new `intellij-preview.yml` and `intellij-release.yml` that trigger after VS Code workflows complete.

**Pros:**
- Cleaner separation of concerns
- Can rerun IntelliJ build independently
- Smaller, more focused workflow files

**Cons:**
- Cross-workflow artifact sharing is complex (requires `workflow_run` trigger and API calls)
- Version synchronization becomes manual
- Two places to update when changing CI patterns
- GitHub Release creation becomes complicated (which workflow owns it?)

**Structure:**
```yaml
# intellij-release.yml
on:
  workflow_run:
    workflows: ["Manual Release"]
    types: [completed]

jobs:
  build-intellij:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    # Download artifacts via GitHub API
    # Build IntelliJ
    # Upload to existing release
```

### Recommendation: Option A (Extend Existing Workflows)

**Rationale:**

1. **Artifact sharing is built-in** - Within a single workflow, `upload-artifact` and `download-artifact` work seamlessly between jobs. Cross-workflow artifact passing requires GitHub API calls and is fragile.

2. **Version unity** - A single workflow ensures both extensions get the same version number from a single source of truth (the version input or the package.json bump).

3. **Release coherence** - Creating a GitHub Release with multiple artifacts is straightforward when all artifacts are available in the same workflow run.

4. **Failure handling** - If VS Code build fails, IntelliJ should not build. The `needs:` dependency enforces this naturally.

5. **JetBrains best practice** - The official [IntelliJ Platform Plugin Template](https://github.com/JetBrains/intellij-platform-plugin-template/blob/main/.github/workflows/build.yml) uses sequential jobs within a single workflow.

## Artifact Handling Patterns

### Upload VS Code Build Artifacts

After the VS Code build step, upload the files IntelliJ needs:

```yaml
- name: Upload VS Code artifacts for IntelliJ
  uses: actions/upload-artifact@v4
  with:
    name: vscode-build-outputs
    path: |
      bbj-vscode/out/language/main.cjs
      bbj-vscode/syntaxes/bbj.tmLanguage.json
      bbj-vscode/syntaxes/bbx.tmLanguage.json
      bbj-vscode/bbj-language-configuration.json
      bbj-vscode/bbx-language-configuration.json
      bbj-vscode/tools/web.bbj
    retention-days: 1
```

### Download Artifacts in IntelliJ Job

```yaml
- name: Download VS Code artifacts
  uses: actions/download-artifact@v4
  with:
    name: vscode-build-outputs
    path: bbj-vscode
```

**Note:** This restores the files to their original relative paths, which is critical because the IntelliJ Gradle build references `../bbj-vscode/`.

### Upload IntelliJ Plugin Artifact

```yaml
- name: Build IntelliJ Plugin
  working-directory: bbj-intellij
  run: ./gradlew buildPlugin

- name: Upload IntelliJ Plugin
  uses: actions/upload-artifact@v4
  with:
    name: intellij-plugin
    path: bbj-intellij/build/distributions/*.zip
    retention-days: 1
```

### Artifact v4 Considerations

Per [GitHub's official documentation](https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts):

- Artifacts are immutable once uploaded (v4 change)
- Artifact names must be unique within a workflow run
- Max 500 artifacts per job
- Downloaded artifacts maintain relative path structure
- Use `retention-days: 1` for build artifacts (no need for long retention)

## GitHub Releases Strategy

### Single Release with Multiple Artifacts

For official releases, create one GitHub Release containing both:
- VS Code `.vsix` file (also published to marketplace)
- IntelliJ `.zip` plugin file (GitHub Release only, no marketplace yet)

**Using softprops/action-gh-release:**

```yaml
release:
  needs: [build-vscode, build-intellij]
  runs-on: ubuntu-latest
  steps:
    - name: Download all artifacts
      uses: actions/download-artifact@v4

    - name: Create Release
      uses: softprops/action-gh-release@v2
      with:
        tag_name: v${{ github.event.inputs.version }}
        files: |
          vscode-extension/*.vsix
          intellij-plugin/*.zip
        body: |
          ## Release v${{ github.event.inputs.version }}

          ### VS Code Extension
          - Published to [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang)

          ### IntelliJ Plugin
          - Download the `.zip` file from this release
          - In IntelliJ: Settings > Plugins > Gear icon > Install Plugin from Disk
```

### Tagging Strategy

**Single tag for both extensions.** Rationale:

1. Both extensions share the same language server core
2. Users expect synchronized functionality
3. Simpler release notes and changelog management
4. Single version number reduces confusion

**Tag format:** `v{major}.{minor}.{patch}` (e.g., `v0.7.0`)

The existing `manual-release.yml` already creates tags with `git tag "v$VERSION"`. The IntelliJ job can use the same tag for consistency.

### Preview Releases

For preview/pre-release versions (triggered by push to main):

- VS Code: Publishes to marketplace as pre-release (`vsce publish --pre-release`)
- IntelliJ: No action needed (no marketplace yet)

Preview builds could optionally create GitHub pre-releases with IntelliJ artifacts for testing, but this adds complexity. Simpler approach: preview IntelliJ builds are only available as workflow artifacts.

## Workflow Modifications

### preview.yml Modifications

```yaml
# .github/workflows/preview.yml
name: Publish Preview Extension

on:
  push:
    branches:
      - main

jobs:
  build-vscode:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install CLI Tools
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          npm install -g @vscode/vsce

      - name: Install deps and build
        working-directory: bbj-vscode
        run: npm ci

      - name: Bump patch version
        id: version
        working-directory: bbj-vscode
        run: |
          VERSION=$(jq -r .version package.json)
          PARTS=(${VERSION//./ })
          if [ ${#PARTS[@]} -eq 2 ]; then
            NEW_VERSION="${PARTS[0]}.${PARTS[1]}.1"
          else
            PATCH=${PARTS[2]:-0}
            PATCH=$((PATCH + 1))
            NEW_VERSION="${PARTS[0]}.${PARTS[1]}.$PATCH"
          fi
          echo "Bumping version to $NEW_VERSION"
          jq ".version = \"$NEW_VERSION\"" package.json > tmp && mv tmp package.json
          echo "version=$NEW_VERSION" >> $GITHUB_OUTPUT

      - name: Commit version bump
        working-directory: bbj-vscode
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add package.json
          git commit -m "Bump preview version"
          git push

      - name: Upload VS Code artifacts for IntelliJ
        uses: actions/upload-artifact@v4
        with:
          name: vscode-build-outputs
          path: |
            bbj-vscode/out/language/main.cjs
            bbj-vscode/syntaxes/bbj.tmLanguage.json
            bbj-vscode/syntaxes/bbx.tmLanguage.json
            bbj-vscode/bbj-language-configuration.json
            bbj-vscode/bbx-language-configuration.json
            bbj-vscode/tools/web.bbj
          retention-days: 1

      - name: Package & Publish Preview
        working-directory: bbj-vscode
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          npx vsce package
          npx vsce publish --pre-release -p $VSCE_PAT

  build-intellij:
    needs: build-vscode
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download VS Code artifacts
        uses: actions/download-artifact@v4
        with:
          name: vscode-build-outputs
          path: bbj-vscode

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'zulu'

      - name: Build IntelliJ Plugin
        working-directory: bbj-intellij
        run: ./gradlew buildPlugin

      - name: Upload IntelliJ Plugin
        uses: actions/upload-artifact@v4
        with:
          name: intellij-plugin-preview
          path: bbj-intellij/build/distributions/*.zip
          retention-days: 7
```

### manual-release.yml Modifications

```yaml
# .github/workflows/manual-release.yml
name: Manual Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (must be higher and end with .0, e.g. 25.12.0)'
        required: true

jobs:
  build-vscode:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install tools
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          npm install -g @vscode/vsce semver

      - name: Install dependencies
        working-directory: bbj-vscode
        run: npm ci

      - name: Validate version input
        working-directory: bbj-vscode
        env:
          VERSION_INPUT: ${{ github.event.inputs.version }}
        run: |
          VERSION="$VERSION_INPUT"
          CURRENT=$(jq -r .version package.json)
          if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0]+$ ]]; then
            echo "Error: Version must be in format x.y.0"
            exit 1
          fi
          if npx semver "$VERSION" -r ">$CURRENT"; then
            echo "Version $VERSION is valid and greater than $CURRENT"
          else
            echo "Error: Version $VERSION is not greater than current version $CURRENT"
            exit 1
          fi

      - name: Set package.json version
        working-directory: bbj-vscode
        env:
          VERSION_INPUT: ${{ github.event.inputs.version }}
        run: |
          jq ".version = \"$VERSION_INPUT\"" package.json > tmp && mv tmp package.json

      - name: Upload VS Code artifacts for IntelliJ
        uses: actions/upload-artifact@v4
        with:
          name: vscode-build-outputs
          path: |
            bbj-vscode/out/language/main.cjs
            bbj-vscode/syntaxes/bbj.tmLanguage.json
            bbj-vscode/syntaxes/bbx.tmLanguage.json
            bbj-vscode/bbj-language-configuration.json
            bbj-vscode/bbx-language-configuration.json
            bbj-vscode/tools/web.bbj
          retention-days: 1

      - name: Package VS Code extension
        working-directory: bbj-vscode
        run: npx vsce package

      - name: Upload VS Code VSIX
        uses: actions/upload-artifact@v4
        with:
          name: vscode-vsix
          path: bbj-vscode/*.vsix
          retention-days: 1

  build-intellij:
    needs: build-vscode
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download VS Code artifacts
        uses: actions/download-artifact@v4
        with:
          name: vscode-build-outputs
          path: bbj-vscode

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'zulu'

      - name: Update IntelliJ plugin version
        working-directory: bbj-intellij
        env:
          VERSION_INPUT: ${{ github.event.inputs.version }}
        run: |
          sed -i "s/version = \".*\"/version = \"$VERSION_INPUT\"/" build.gradle.kts

      - name: Build IntelliJ Plugin
        working-directory: bbj-intellij
        run: ./gradlew buildPlugin

      - name: Upload IntelliJ Plugin
        uses: actions/upload-artifact@v4
        with:
          name: intellij-plugin
          path: bbj-intellij/build/distributions/*.zip
          retention-days: 1

  release:
    needs: [build-vscode, build-intellij]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set package.json version (for commit)
        working-directory: bbj-vscode
        env:
          VERSION_INPUT: ${{ github.event.inputs.version }}
        run: |
          sudo apt-get install -y jq
          jq ".version = \"$VERSION_INPUT\"" package.json > tmp && mv tmp package.json

      - name: Commit and tag version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VERSION_INPUT: ${{ github.event.inputs.version }}
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add bbj-vscode/package.json
          git commit -m "Release version $VERSION_INPUT"
          git tag "v$VERSION_INPUT"
          git push origin main
          git push origin "v$VERSION_INPUT"

      - name: Download VS Code VSIX
        uses: actions/download-artifact@v4
        with:
          name: vscode-vsix
          path: ./release-assets

      - name: Download IntelliJ Plugin
        uses: actions/download-artifact@v4
        with:
          name: intellij-plugin
          path: ./release-assets

      - name: Publish VS Code extension
        working-directory: bbj-vscode
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          npm install -g @vscode/vsce
          npx vsce publish -p $VSCE_PAT --packagePath ../release-assets/*.vsix

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ github.event.inputs.version }}
          name: Release v${{ github.event.inputs.version }}
          files: |
            release-assets/*.vsix
            release-assets/*.zip
          body: |
            ## BBj Language Support v${{ github.event.inputs.version }}

            ### VS Code Extension
            - Available on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang)
            - Or download `bbj-lang-${{ github.event.inputs.version }}.vsix` below

            ### IntelliJ Plugin
            - Download `bbj-intellij-${{ github.event.inputs.version }}.zip` below
            - Install: Settings > Plugins > Gear icon > Install Plugin from Disk
```

## Version Synchronization

### Current State

- VS Code: Version in `bbj-vscode/package.json` (e.g., `0.7.2`)
- IntelliJ: Version in `bbj-intellij/build.gradle.kts` (currently `0.1.0`)

### Recommended Approach

1. **Single source of truth:** Use `bbj-vscode/package.json` version as the canonical version
2. **IntelliJ version update:** In the release workflow, update `build.gradle.kts` version before building
3. **No commit for IntelliJ version:** The Gradle file change is only for the build; the VS Code package.json commit is the version record

**Alternative:** Extract version to a shared file (e.g., `VERSION.txt`) and have both builds read from it. This is cleaner but requires more changes.

### Version Update in Gradle

```bash
# Update version in build.gradle.kts
sed -i "s/version = \".*\"/version = \"$VERSION\"/" build.gradle.kts
```

Or use Gradle's `-Pversion=X.Y.Z` parameter:

```bash
./gradlew buildPlugin -Pversion=$VERSION
```

However, this requires modifying `build.gradle.kts` to use `findProperty`:

```kotlin
version = findProperty("version")?.toString() ?: "0.1.0"
```

## Phase Ordering for Implementation

### Phase 1: Preview Workflow Extension

**Goal:** Add IntelliJ build to preview.yml

**Steps:**
1. Add `upload-artifact` step after VS Code build
2. Add `build-intellij` job with `needs: build-vscode`
3. Configure Java setup and Gradle build
4. Upload IntelliJ artifact (for download, not release)

**Validation:** Push to main, verify both jobs succeed, download IntelliJ artifact

### Phase 2: Manual Release Workflow Extension

**Goal:** Add IntelliJ build and GitHub Release to manual-release.yml

**Steps:**
1. Split VS Code build into separate job
2. Add artifact upload/download pattern
3. Add IntelliJ build job with version sync
4. Add release job that creates GitHub Release with both artifacts

**Validation:** Trigger manual release, verify:
- Both builds succeed
- Version numbers match
- GitHub Release contains both artifacts
- VS Code published to marketplace

### Phase 3: Build.yml Update (PR Validation)

**Goal:** Validate IntelliJ builds on PRs

**Steps:**
1. Add IntelliJ build job to build.yml
2. Run on PRs affecting `bbj-intellij/**` or `bbj-vscode/**`

**Validation:** Create PR with changes, verify IntelliJ build runs

### Phase 4: Documentation and Cleanup

**Goal:** Document release process

**Steps:**
1. Update README with release instructions
2. Document manual release trigger process
3. Clean up any redundant workflow code

## Sources

- [GitHub Actions: Storing and sharing data from a workflow](https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts)
- [GitHub Actions: Using jobs in a workflow](https://docs.github.com/actions/using-jobs/using-jobs-in-a-workflow)
- [actions/upload-artifact v4](https://github.com/actions/upload-artifact)
- [actions/download-artifact v4](https://github.com/actions/download-artifact)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
- [JetBrains IntelliJ Platform Plugin Template](https://github.com/JetBrains/intellij-platform-plugin-template/blob/main/.github/workflows/build.yml)
- [GitHub Blog: Get started with v4 of GitHub Actions Artifacts](https://github.blog/news-insights/product-news/get-started-with-v4-of-github-actions-artifacts/)
- [Monorepo with GitHub Actions](https://graphite.com/guides/monorepo-with-github-actions)
- [How to Handle Monorepos with GitHub Actions (2026)](https://oneuptime.com/blog/post/2026-01-26-monorepos-github-actions/view)
