---
phase: 21-preview-workflow
verified: 2026-02-05T12:00:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 21: Preview Workflow Verification Report

**Phase Goal:** IntelliJ plugin builds automatically on every push to main, synchronized with VS Code builds
**Verified:** 2026-02-05
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Push to main triggers IntelliJ plugin build in addition to VS Code build | VERIFIED | preview.yml has `on: push: branches: main` (lines 4-7) and two jobs: `publish-preview` (line 10) and `build-intellij` (line 76) |
| 2 | IntelliJ plugin version matches VS Code version from package.json | VERIFIED | publish-preview outputs version (line 12-13), build-intellij uses `-Pversion=${{ needs.publish-preview.outputs.version }}` (line 97), build.gradle.kts accepts via `providers.gradleProperty("version")` (line 9) |
| 3 | IntelliJ build waits for VS Code build to complete (downloads main.cjs artifact) | VERIFIED | build-intellij has `needs: publish-preview` (line 78), downloads language-server artifact (lines 84-87) |
| 4 | IntelliJ .zip artifact is downloadable from workflow run | VERIFIED | upload-artifact@v4 uploads `intellij-plugin` from `bbj-intellij/build/distributions/*.zip` (lines 100-104) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/build.gradle.kts` | Dynamic version injection via -Pversion flag | VERIFIED | 123 lines, contains `providers.gradleProperty("version").getOrElse("0.1.0")` at line 9, no stubs |
| `.github/workflows/preview.yml` | Two-job workflow with artifact sharing | VERIFIED | 104 lines, contains `needs: publish-preview` at line 78, no stubs |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `.github/workflows/preview.yml` | `bbj-intellij/build.gradle.kts` | Gradle -Pversion flag | WIRED | Line 97: `./gradlew buildPlugin -Pversion=${{ needs.publish-preview.outputs.version }}` |
| `.github/workflows/preview.yml (build-intellij)` | `.github/workflows/preview.yml (publish-preview)` | needs dependency and artifact download | WIRED | Line 78: `needs: publish-preview`, Lines 84-87: downloads language-server artifact |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PREV-01: Push to main triggers IntelliJ build | SATISFIED | Two-job workflow with dependency chain |
| PREV-02: Version matches VS Code | SATISFIED | Job outputs + Gradle property injection |
| PREV-03: Waits for VS Code build | SATISFIED | `needs: publish-preview` + artifact download |
| PREV-04: .zip downloadable | SATISFIED | upload-artifact@v4 with 7-day retention |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| - | - | - | - | No anti-patterns found |

### Human Verification Required

### 1. GitHub Actions Execution Test
**Test:** Push any change to main branch and observe GitHub Actions
**Expected:** 
- Both jobs appear in workflow run
- `publish-preview` completes first
- `build-intellij` starts after `publish-preview` succeeds
- Both artifacts (language-server, intellij-plugin) downloadable
**Why human:** Requires actual GitHub Actions execution, cannot verify programmatically

### 2. Version Synchronization Test
**Test:** After workflow completes, download intellij-plugin artifact and check filename
**Expected:** ZIP filename contains same version as VS Code package.json after bump
**Why human:** Requires workflow execution to produce artifact

### Gaps Summary

No gaps found. All must-haves are verified in the codebase:

1. **Workflow trigger**: `on: push: branches: main` triggers both jobs
2. **Two-job structure**: `publish-preview` (VS Code) and `build-intellij` (IntelliJ) jobs exist
3. **Job dependency**: `needs: publish-preview` ensures sequential execution
4. **Version synchronization**: Version output from bump step passed to Gradle via `-Pversion=`
5. **Artifact sharing**: main.cjs uploaded by publish-preview, downloaded by build-intellij
6. **IntelliJ artifact**: .zip uploaded with 7-day retention
7. **Dynamic version in Gradle**: `providers.gradleProperty("version").getOrElse("0.1.0")`

---

*Verified: 2026-02-05*
*Verifier: Claude (gsd-verifier)*
