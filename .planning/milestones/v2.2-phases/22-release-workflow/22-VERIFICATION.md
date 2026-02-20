---
phase: 22-release-workflow
verified: 2026-02-05T07:30:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 22: Release Workflow Verification Report

**Phase Goal:** Manual release trigger produces both extensions with matching versions and creates GitHub Release
**Verified:** 2026-02-05T07:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Manual workflow dispatch triggers build of both VS Code and IntelliJ extensions | ✓ VERIFIED | workflow_dispatch input exists, three jobs present (build-vscode, build-intellij, create-release), build-intellij depends on build-vscode |
| 2   | Both extensions receive the input version (x.y.0 format) | ✓ VERIFIED | build-vscode outputs version from input, build-intellij uses needs.build-vscode.outputs.version for Gradle build, validation regex enforces x.y.0 format |
| 3   | GitHub Release is created with .vsix and .zip as downloadable assets | ✓ VERIFIED | create-release job runs gh release create with ./artifacts/*.vsix and ./artifacts/*.zip, downloads both vscode-extension and intellij-plugin artifacts |
| 4   | Release body contains step-by-step IntelliJ installation instructions | ✓ VERIFIED | --notes parameter includes ### IntelliJ IDEA section with 6 numbered steps (download, open, settings, install from disk, select file, restart) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `.github/workflows/manual-release.yml` | Three-job release workflow (VS Code, IntelliJ, GitHub Release) | ✓ VERIFIED (SUBSTANTIVE, WIRED) | 184 lines, contains build-intellij job (line 105) and gh release create (line 165), YAML syntax valid |
| `.github/workflows/manual-release.yml` | GitHub Release creation | ✓ VERIFIED (SUBSTANTIVE, WIRED) | create-release job has permissions: contents: write (line 144), gh release create command with --generate-notes and --notes |

**Artifact Details:**

**Level 1 (Existence):**
- ✓ `.github/workflows/manual-release.yml` EXISTS (184 lines)

**Level 2 (Substantive):**
- ✓ SUBSTANTIVE: 184 lines, no stub patterns (TODO/FIXME), has all required jobs
- ✓ Contains `build-intellij` job (line 105)
- ✓ Contains `gh release create` command (line 165)
- ✓ Version validation logic (lines 36-58)
- ✓ IntelliJ installation instructions (lines 173-179)

**Level 3 (Wired):**
- ✓ build-vscode job outputs version (line 15)
- ✓ build-intellij job uses version via needs.build-vscode.outputs.version (lines 126, 131)
- ✓ create-release job uses version via needs.build-vscode.outputs.version (line 163)
- ✓ All artifacts properly wired (see Key Link Verification)

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| manual-release job | build-intellij job | needs + artifact upload/download | ✓ WIRED | build-intellij declares needs: build-vscode (line 107), downloads language-server artifact (lines 113-116) |
| build-intellij job | create-release job | needs dependency | ✓ WIRED | create-release declares needs: [build-vscode, build-intellij] (line 143), downloads both vscode-extension and intellij-plugin artifacts (lines 149-158) |
| create-release job | GitHub Release API | gh release create with assets | ✓ WIRED | gh release create "v$VERSION" with ./artifacts/*.vsix ./artifacts/*.zip (lines 165-184) |

**Artifact Flow Verification:**

All artifacts uploaded are consumed by downstream jobs:

1. **language-server** (build-vscode → build-intellij)
   - Upload: build-vscode job, path: bbj-vscode/out/language/main.cjs (lines 92-96)
   - Download: build-intellij job, path: bbj-vscode/out/language/ (lines 113-116)
   - Status: ✓ WIRED

2. **vscode-extension** (build-vscode → create-release)
   - Upload: build-vscode job, path: bbj-vscode/*.vsix (lines 99-103)
   - Download: create-release job, path: ./artifacts (lines 149-152)
   - Status: ✓ WIRED

3. **intellij-plugin** (build-intellij → create-release)
   - Upload: build-intellij job, path: bbj-intellij/build/distributions/bbj-intellij-*.zip (lines 135-139)
   - Download: create-release job, path: ./artifacts (lines 155-158)
   - Status: ✓ WIRED

**Version Flow Verification:**

Version flows correctly through all jobs:

1. Input: workflow_dispatch input (line 7)
2. Validation: x.y.0 format enforced via regex (line 47)
3. Output: build-vscode outputs version (line 15)
4. Consumption: build-intellij uses it for Gradle -Pversion (line 126) and file rename (line 131)
5. Consumption: create-release uses it for tag name and release notes (line 163)
6. Status: ✓ FULLY WIRED

### Requirements Coverage

| Requirement | Status | Blocking Issue |
| ----------- | ------ | -------------- |
| RELS-01: Manual release trigger builds both extensions | ✓ SATISFIED | None - workflow_dispatch input triggers build-vscode and build-intellij jobs |
| RELS-02: Both extensions use input version (x.y.0 format) | ✓ SATISFIED | None - version validated and passed to both vsce publish and gradlew -Pversion |
| RELS-03: GitHub Release created with both .vsix and .zip | ✓ SATISFIED | None - create-release downloads both artifacts and attaches via gh release create |
| RELS-04: Release includes installation instructions for IntelliJ | ✓ SATISFIED | None - release notes include ### IntelliJ IDEA section with 6 numbered steps |

### Anti-Patterns Found

No anti-patterns detected.

**Scanned for:**
- TODO/FIXME comments: None found
- Placeholder content: None found
- Empty implementations: None found
- Stub patterns: None found

### Human Verification Required

None. All verification completed programmatically.

**Note:** While the workflow structure is fully verified, actual runtime behavior (workflow execution, marketplace publishing, GitHub Release creation) cannot be verified without triggering the workflow. However, all structural elements required for success are present and correctly wired.

---

## Verification Details

### Workflow Structure Analysis

**Three-job workflow validated:**

1. **build-vscode** (lines 12-103)
   - Validates version input (x.y.0 format)
   - Sets package.json version
   - Commits and tags
   - Publishes to VS Code Marketplace
   - Uploads language-server and vscode-extension artifacts
   - Outputs version for downstream jobs

2. **build-intellij** (lines 105-139)
   - Depends on build-vscode
   - Downloads language-server artifact
   - Builds plugin with Gradle using version from build-vscode
   - Renames output to bbj-intellij-{version}.zip
   - Uploads intellij-plugin artifact

3. **create-release** (lines 141-184)
   - Depends on both build-vscode and build-intellij
   - Has contents: write permission for release creation
   - Downloads both vscode-extension and intellij-plugin artifacts
   - Creates GitHub Release with:
     - Tag: v{version}
     - Auto-generated changelog (--generate-notes)
     - Installation instructions for both VS Code and IntelliJ
     - Both .vsix and .zip as release assets

### Release Notes Content Verification

**Release notes include all required elements:**

- ✓ VS Code section with Marketplace link
- ✓ IntelliJ IDEA section with 6 numbered steps:
  1. Download bbj-intellij-{version}.zip from Assets
  2. Open IntelliJ IDEA
  3. Go to Settings > Plugins
  4. Click gear icon and select Install Plugin from Disk...
  5. Select the downloaded ZIP file
  6. Restart IntelliJ when prompted
- ✓ Version variable correctly interpolated ($VERSION)
- ✓ Both .vsix and .zip attached as release assets

### YAML Syntax Validation

YAML syntax validated successfully with Python yaml.safe_load() - no parse errors.

### Job Dependency Graph

```
workflow_dispatch (manual trigger)
    ↓
build-vscode
    ↓ (needs)     ↓ (artifacts: language-server, vscode-extension)
    ↓             ↓
    ↓         build-intellij
    ↓             ↓ (artifacts: intellij-plugin)
    ↓             ↓
    └─────────────┘
          ↓ (needs: [build-vscode, build-intellij])
    create-release
          ↓
    GitHub Release (v{version} with .vsix and .zip)
```

All dependencies correctly declared and artifacts properly passed between jobs.

---

_Verified: 2026-02-05T07:30:00Z_
_Verifier: Claude (gsd-verifier)_
