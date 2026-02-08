---
phase: quick
plan: 2
subsystem: intellij-plugin
tags: [bugfix, em-login, gradle, plugin-bundle]
dependency_graph:
  requires: [bbj-vscode/tools/em-login.bbj]
  provides: [lib/tools/em-login.bbj bundled in IntelliJ plugin]
  affects: [BbjEMLoginAction, IntelliJ plugin build]
tech_stack:
  added: []
  patterns: [plugin-bundling, path-resolution]
key_files:
  created: []
  modified:
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
decisions:
  - "Mirrored web.bbj bundling pattern for em-login.bbj"
  - "Used lib/tools/ path prefix matching BbjRunActionBase pattern"
metrics:
  tasks_completed: 2
  duration_minutes: 1
  completed_date: "2026-02-08"
---

# Quick Task 2: Fix em-login.bbj not found in IntelliJ plugin

**One-liner:** Fixed IntelliJ EM Login action by bundling em-login.bbj at lib/tools/ and correcting path resolution

## Overview

The IntelliJ plugin's "Login to Enterprise Manager" action failed because em-login.bbj was not copied into the plugin bundle during build, and the path resolution used the wrong relative path (missing `lib/` prefix). This fix mirrors the existing pattern used for web.bbj bundling.

## Tasks Completed

### Task 1: Add em-login.bbj to Gradle build copy tasks
**Status:** ✓ Complete
**Commit:** 8d4e094

**What was done:**
- Added `include("em-login.bbj")` to `copyWebRunner` task alongside existing `include("web.bbj")`
- Added `include("em-login.bbj")` to `prepareSandbox` task's tools copy block
- File now bundled at `lib/tools/em-login.bbj` in plugin distribution

**Files modified:**
- bbj-intellij/build.gradle.kts

**Verification:**
- ✓ `./gradlew :bbj-intellij:processResources` succeeded
- ✓ `bbj-intellij/build/resources/main/tools/em-login.bbj` exists alongside web.bbj

### Task 2: Fix em-login.bbj path resolution in BbjEMLoginAction
**Status:** ✓ Complete
**Commit:** 24804d4

**What was done:**
- Changed path resolution from `plugin.getPluginPath().resolve("tools/em-login.bbj")` to `plugin.getPluginPath().resolve("lib/tools/em-login.bbj")`
- Removed intermediate `toolsDir` variable, using direct path resolution like `BbjRunActionBase.getWebBbjPath()`
- Path now matches actual plugin bundle structure from prepareSandbox

**Files modified:**
- bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

**Verification:**
- ✓ `./gradlew :bbj-intellij:compileJava` succeeded
- ✓ Path resolves to `lib/tools/em-login.bbj` matching bundle structure
- ✓ Consistent with how BbjRunActionBase resolves web.bbj

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] em-login.bbj is bundled in IntelliJ plugin at lib/tools/em-login.bbj
- [x] BbjEMLoginAction correctly resolves the path using lib/tools/ prefix
- [x] Plugin compiles successfully with both changes
- [x] Path resolution is consistent with how web.bbj is resolved in BbjRunActionBase

## Testing Notes

The fix ensures em-login.bbj is properly bundled and can be found at runtime by BbjEMLoginAction. The changes mirror the existing working pattern for web.bbj, ensuring consistency across the plugin's bundled tool scripts.

## Key Decisions

1. **Mirrored web.bbj bundling pattern:** Rather than inventing a new approach, followed the exact same pattern already working for web.bbj in both Gradle tasks and path resolution.

2. **Used lib/tools/ path prefix:** Aligned with IntelliJ plugin sandbox structure where bundled resources go under `lib/` subdirectory, matching BbjRunActionBase.getWebBbjPath() pattern.

## Self-Check: PASSED

**Created files:** None

**Modified files:**
- FOUND: bbj-intellij/build.gradle.kts
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

**Commits:**
- FOUND: 8d4e094 (feat(quick-2): bundle em-login.bbj in IntelliJ plugin)
- FOUND: 24804d4 (fix(quick-2): resolve em-login.bbj at correct plugin path)

**Build verification:**
- FOUND: bbj-intellij/build/resources/main/tools/em-login.bbj
- FOUND: bbj-intellij/build/resources/main/tools/web.bbj
