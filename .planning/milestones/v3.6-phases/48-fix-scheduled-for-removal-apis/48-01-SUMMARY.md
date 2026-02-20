---
phase: 48-fix-scheduled-for-removal-apis
plan: 01
subsystem: bbj-intellij
tags: [compatibility, refactor, api-migration]
dependency_graph:
  requires: []
  provides: [COMPAT-01, COMPAT-02, COMPAT-03, COMPAT-04]
  affects: [platform-detection, plugin-loading, settings-ui]
tech_stack:
  added: [CpuArch, TextBrowseFolderListener]
  patterns: [api-replacement]
key_files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
decisions:
  - Use TextBrowseFolderListener constructor pattern for browse folder listeners with title/description
  - Remove null check on PluginId.getId() result as it never returns null
metrics:
  duration: 180s
  completed: 2026-02-10T11:50:59Z
  tasks: 2
  commits: 2
  files_modified: 3
  loc_added: 16
  loc_removed: 17
---

# Phase 48 Plan 01: Fix Scheduled-for-Removal APIs Summary

**One-liner:** Replace 4 scheduled-for-removal IntelliJ Platform APIs with current equivalents: CpuArch for platform detection, PluginId.getId for plugin lookup, TextBrowseFolderListener for file choosers, and createSingleFileDescriptor for file selection.

## Objective

Replace all 4 scheduled-for-removal IntelliJ Platform APIs with their current equivalents across 3 Java files, satisfying COMPAT-01 through COMPAT-04 requirements. Eliminate critical compatibility errors that will break the plugin in future IntelliJ IDE versions (2026.1+).

## What Was Delivered

### Task 1: Replace SystemInfo.is64Bit/isAarch64 with CpuArch API (COMPAT-01)
**Status:** ✅ Complete
**Commit:** f756600

**Changes:**
- Added import for `com.intellij.util.system.CpuArch`
- Replaced `SystemInfo.isAarch64` with `CpuArch.isArm64()` in BbjNodeDownloader.getArchitecture()
- Replaced `SystemInfo.is64Bit` with `CpuArch.CURRENT.width == 64`
- Preserved all other SystemInfo usages (isWindows, isMac, isLinux) as they are not deprecated

**Files Modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`

**Verification:**
- ✅ Compilation successful
- ✅ No SystemInfo.is64Bit or SystemInfo.isAarch64 usage remains
- ✅ CpuArch API properly imported and used

### Task 2: Replace PluginId.findId and deprecated FileChooser APIs (COMPAT-02, COMPAT-03, COMPAT-04)
**Status:** ✅ Complete
**Commit:** 00a8781

**Part A - BbjEMLoginAction (COMPAT-02):**
- Replaced `PluginId.findId("com.basis.bbj")` with `PluginId.getId("com.basis.bbj")`
- Added proper imports for `PluginId` and `PluginManagerCore`
- Removed unnecessary null check on pluginId (getId never returns null)
- Kept null check on plugin object from PluginManagerCore.getPlugin()

**Part B - BbjSettingsComponent (COMPAT-03, COMPAT-04):**
- Replaced 4-parameter `addBrowseFolderListener(title, description, project, descriptor)` with `TextBrowseFolderListener` constructor pattern
- Used `FileChooserDescriptor.withTitle()` and `.withDescription()` to set dialog title and description
- Replaced `createSingleLocalFileDescriptor()` with `createSingleFileDescriptor()` for nodeJsField
- Applied changes to both bbjHomeField and nodeJsField

**Files Modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`

**Verification:**
- ✅ Compilation successful
- ✅ No PluginId.findId usage remains
- ✅ No createSingleLocalFileDescriptor usage remains
- ✅ No 4-parameter addBrowseFolderListener calls remain
- ✅ PluginId.getId properly used

## Deviations from Plan

### Corrected API Usage Pattern

**1. [Rule 3 - Blocking Issue] TextBrowseFolderListener constructor pattern required**
- **Found during:** Task 2, Part B (BbjSettingsComponent modifications)
- **Issue:** Plan specified using 2-parameter `addBrowseFolderListener(Project, FileChooserDescriptor)` overload, but this overload expects `BrowseFolderActionListener<JTextField>` as second parameter, not `FileChooserDescriptor`. Compilation failed with type mismatch error.
- **Fix:** Used `TextBrowseFolderListener` constructor pattern: `new TextBrowseFolderListener(descriptor, project)` to wrap the descriptor with title/description already set via `.withTitle()` and `.withDescription()` chaining.
- **Files modified:** BbjSettingsComponent.java
- **Commit:** 00a8781 (same commit as Task 2)
- **Impact:** Functional behavior unchanged - same dialog title, description, and file chooser constraints. Different internal implementation using TextBrowseFolderListener wrapper class.

**Root Cause:** Plan instructions based on newer IntelliJ Platform API documentation that may not match the exact API version used by this project. The correct non-deprecated pattern is to wrap the descriptor in a TextBrowseFolderListener.

## Key Decisions

1. **TextBrowseFolderListener constructor pattern:** Use `new TextBrowseFolderListener(descriptor, project)` constructor instead of non-existent 2-parameter overload for browse folder listeners
2. **Remove null check on PluginId.getId():** Removed unnecessary null check since `getId()` never returns null (creates PluginId if not found)
3. **Preserve functional behavior:** All changes are mechanical API replacements with identical runtime behavior

## Verification Results

All verification criteria from plan satisfied:

1. ✅ `cd /Users/beff/_workspace/bbj-language-server/bbj-intellij && ./gradlew compileJava` succeeds
2. ✅ `grep -r "SystemInfo.is64Bit\|SystemInfo.isAarch64" bbj-intellij/src/` returns no matches
3. ✅ `grep -r "PluginId.findId" bbj-intellij/src/` returns no matches
4. ✅ `grep -r "createSingleLocalFileDescriptor" bbj-intellij/src/` returns no matches
5. ✅ `grep -r "CpuArch" bbj-intellij/src/` shows usage in BbjNodeDownloader
6. ✅ `grep -r "PluginId.getId" bbj-intellij/src/` shows usage in BbjEMLoginAction (and existing usages in BbjRunActionBase, BbjLanguageServer)

## Success Criteria Status

- ✅ All 4 COMPAT requirements (01-04) are satisfied
- ✅ Zero scheduled-for-removal API usages remain in the 3 modified files
- ✅ Project compiles without errors
- ✅ Functional behavior is unchanged (same architecture detection, same plugin lookup, same file browsing)

## Self-Check: PASSED

### Created Files Check
No files were created (all modifications to existing files).

### Modified Files Check
```
✅ FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
✅ FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
✅ FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
```

### Commits Check
```
✅ FOUND: f756600 (Task 1 - CpuArch API)
✅ FOUND: 00a8781 (Task 2 - PluginId and FileChooser APIs)
```

### Functionality Check
- ✅ Platform detection: CpuArch.isArm64() and CpuArch.CURRENT.width provide same detection as SystemInfo
- ✅ Plugin lookup: PluginId.getId() provides same functionality as findId() but never returns null
- ✅ File choosers: TextBrowseFolderListener with descriptor.withTitle/withDescription provides same UI as 4-parameter overload
- ✅ File descriptor: createSingleFileDescriptor() provides same functionality as createSingleLocalFileDescriptor()

## Impact

**Immediate:**
- Plugin now uses current IntelliJ Platform APIs for all 4 replaced methods
- Zero scheduled-for-removal API warnings for these 3 files
- Forward compatibility with IntelliJ 2026.1+ maintained

**Technical Debt:**
- None introduced - all changes are mechanical API replacements

**Next Steps:**
- Phase 48 complete - all scheduled-for-removal APIs fixed
- Move to Phase 49: Fix deprecated APIs and verify compatibility

## Notes

- All changes are drop-in API replacements with identical functional behavior
- No user-facing changes - all modifications are internal implementation details
- TextBrowseFolderListener pattern is the correct non-deprecated API for browse folder listeners with custom titles/descriptions
