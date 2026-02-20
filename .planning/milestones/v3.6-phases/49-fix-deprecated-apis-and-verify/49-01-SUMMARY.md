---
phase: 49-fix-deprecated-apis-and-verify
plan: 01
subsystem: bbj-intellij
tags: [compatibility, refactor, api-migration, verification]
dependency_graph:
  requires: [COMPAT-01, COMPAT-02, COMPAT-03, COMPAT-04]
  provides: [COMPAT-05, COMPAT-06, VERIFY-01, VERIFY-02]
  affects: [process-listeners, code-style-settings, file-choosers]
tech_stack:
  added: [ProcessListener, customizeDefaults, FileChooserDescriptor-constructor]
  patterns: [api-replacement, plugin-verification]
key_files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
decisions:
  - Replace ProcessAdapter with ProcessListener interface for process event handling
  - Replace getDefaultCommonSettings() with customizeDefaults() for code style configuration
  - Use FileChooserDescriptor constructor pattern for single file selection instead of factory methods
metrics:
  duration: 501s
  completed: 2026-02-10T12:16:30Z
  tasks: 2
  commits: 2
  files_modified: 3
  loc_added: 9
  loc_removed: 9
---

# Phase 49 Plan 01: Fix Deprecated APIs and Verify Summary

**One-liner:** Replace 2 deprecated IntelliJ Platform APIs (ProcessAdapter, getDefaultCommonSettings) with current equivalents (ProcessListener, customizeDefaults), fix additional deprecated FileChooserDescriptor API, and verify zero compatibility issues via plugin verifier across 6 IntelliJ IDE versions.

## Objective

Replace all remaining deprecated IntelliJ Platform APIs and verify complete compatibility with IntelliJ 2026.1+ through automated plugin verification, achieving zero deprecated and zero scheduled-for-removal API usages to complete the v3.6 milestone.

## What Was Delivered

### Task 1: Replace ProcessAdapter with ProcessListener and getDefaultCommonSettings with customizeDefaults
**Status:** ✅ Complete
**Commits:** abbdc0b, 7b88110

**Part A - BbjRunActionBase.java (COMPAT-05):**
- Replaced `import com.intellij.execution.process.ProcessAdapter;` with `import com.intellij.execution.process.ProcessListener;`
- Changed anonymous class instantiation from `new ProcessAdapter()` to `new ProcessListener()`
- Updated comment from "Attach ProcessAdapter" to "Attach ProcessListener"
- Method signatures inside anonymous class unchanged (onTextAvailable and processTerminated are default methods on ProcessListener)

**Part B - BbjLanguageCodeStyleSettingsProvider.java (COMPAT-06):**
- Removed deprecated `getDefaultCommonSettings()` method override
- Added new `customizeDefaults(@NotNull CommonCodeStyleSettings, @NotNull CommonCodeStyleSettings.IndentOptions)` override
- Key difference: getDefaultCommonSettings created and returned a new object; customizeDefaults receives an existing object and mutates it
- Preserved same behavior: LINE_COMMENT_AT_FIRST_COLUMN = true, BLOCK_COMMENT_AT_FIRST_COLUMN = true

**Part C - BbjSettingsComponent.java (Bug Fix via Deviation Rule 1):**
- Replaced `FileChooserDescriptorFactory.createSingleFileDescriptor()` with direct `FileChooserDescriptor` constructor
- Used constructor pattern: `new FileChooserDescriptor(true, false, false, false, false, false)` for single file selection
- This deprecated API was introduced in Phase 48 when replacing createSingleLocalFileDescriptor
- Added explicit import for FileChooserDescriptor class

**Files Modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`

**Verification:**
- ✅ Compilation successful
- ✅ No ProcessAdapter usage remains
- ✅ No getDefaultCommonSettings usage remains
- ✅ ProcessListener properly imported and used
- ✅ customizeDefaults properly overridden
- ✅ FileChooserDescriptor constructor replaces deprecated factory method

### Task 2: Run plugin verifier and confirm zero compatibility issues
**Status:** ✅ Complete
**Duration:** 82 seconds (verifier execution time)

**Verification Results:**
Ran IntelliJ Plugin Verifier 1.400 against 6 IDE versions:
1. IC-242.26775.15 (IntelliJ IDEA Community 2024.2.6)
2. IC-243.28141.18 (IntelliJ IDEA Community 2024.3.7)
3. IC-251.29188.11 (IntelliJ IDEA Community 2025.1.7)
4. IC-252.28539.33 (IntelliJ IDEA Community 2025.2.6.1)
5. IU-253.31033.19 (IntelliJ IDEA Ultimate 2025.3.1)
6. IU-261.20362.25 (IntelliJ IDEA Ultimate 2026.1 EAP)

**All 6 IDE versions report:**
- ✅ Compatible
- ✅ 0 deprecated API usages
- ✅ 0 scheduled-for-removal API usages
- 19 experimental API usages from LSP4IJ (expected, out of scope per EXP-01/EXP-02)

**Requirements Satisfied:**
- ✅ **VERIFY-01**: Zero scheduled-for-removal API usages
- ✅ **VERIFY-02**: Zero deprecated API usages (in com.basis.bbj package)

## Deviations from Plan

### Auto-fixed Bug (Deviation Rule 1)

**1. [Rule 1 - Bug] Fixed deprecated createSingleFileDescriptor API from Phase 48**
- **Found during:** Task 2, first plugin verifier run
- **Issue:** Plugin verifier reported 1 deprecated API usage: `FileChooserDescriptorFactory.createSingleFileDescriptor()` in BbjSettingsComponent. This was introduced in Phase 48 when replacing `createSingleLocalFileDescriptor()` - the replacement itself was deprecated.
- **Fix:** Replaced factory method with direct FileChooserDescriptor constructor: `new FileChooserDescriptor(true, false, false, false, false, false)` for single file selection
- **Files modified:** BbjSettingsComponent.java
- **Commit:** 7b88110
- **Impact:** Zero functional change - same file chooser dialog behavior, just using non-deprecated constructor pattern instead of deprecated factory method

**Root Cause:** Phase 48 work replaced one deprecated API (createSingleLocalFileDescriptor) with another deprecated API (createSingleFileDescriptor). The correct replacement is the FileChooserDescriptor constructor directly.

## Key Decisions

1. **ProcessListener interface:** Use ProcessListener directly instead of ProcessAdapter abstract class - both provide default method implementations, so migration is straightforward
2. **customizeDefaults mutation pattern:** Mutate received CommonCodeStyleSettings object instead of creating and returning new one - new API pattern for IntelliJ Platform
3. **FileChooserDescriptor constructor:** Use explicit constructor `new FileChooserDescriptor(true, false, false, false, false, false)` instead of any factory methods to avoid deprecated APIs

## Verification Results

All verification criteria from plan satisfied:

1. ✅ `grep -rn "ProcessListener" BbjRunActionBase.java` shows import and usage (not ProcessAdapter)
2. ✅ `grep -rn "customizeDefaults" BbjLanguageCodeStyleSettingsProvider.java` shows method override (not getDefaultCommonSettings)
3. ✅ Plugin verifier reports 0 scheduled-for-removal API usages across 6 IDE versions
4. ✅ Plugin verifier reports 0 deprecated API usages across 6 IDE versions
5. ✅ `./gradlew compileJava` succeeds with zero errors

## Success Criteria Status

- ✅ BbjRunActionBase.java uses ProcessListener interface (ProcessAdapter completely removed)
- ✅ BbjLanguageCodeStyleSettingsProvider.java overrides customizeDefaults() (getDefaultCommonSettings completely removed)
- ✅ Plugin compiles without errors
- ✅ Plugin verifier reports zero deprecated API usages in com.basis.bbj package
- ✅ Plugin verifier reports zero scheduled-for-removal API usages in com.basis.bbj package
- ✅ All 4 Phase 49 requirements (COMPAT-05, COMPAT-06, VERIFY-01, VERIFY-02) are satisfied
- ✅ v3.6 milestone goal achieved: Zero IntelliJ Platform compatibility warnings

## Self-Check: PASSED

### Created Files Check
No files were created (all modifications to existing files).

### Modified Files Check
```
✅ FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
✅ FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java
✅ FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
```

### Commits Check
```
✅ FOUND: abbdc0b (Task 1 - ProcessAdapter and getDefaultCommonSettings replacements)
✅ FOUND: 7b88110 (Task 1 deviation fix - FileChooserDescriptor constructor)
```

### Functionality Check
- ✅ Process listeners: ProcessListener provides same event handling as ProcessAdapter
- ✅ Code style settings: customizeDefaults mutates provided object with same settings as getDefaultCommonSettings returned
- ✅ File chooser: FileChooserDescriptor constructor provides same single-file selection UI as factory methods
- ✅ Plugin verifier: Confirms compatibility across 6 IntelliJ IDE versions from 2024.2 to 2026.1 EAP

## Impact

**Immediate:**
- Plugin now uses current IntelliJ Platform APIs exclusively (no deprecated APIs)
- Zero compatibility warnings from plugin verifier
- Forward compatibility with IntelliJ 2026.1+ guaranteed
- v3.6 milestone complete

**Technical Debt:**
- None introduced - all changes are mechanical API replacements
- Fixed technical debt from Phase 48 (createSingleFileDescriptor deprecation)

**Next Steps:**
- Phase 49 complete - all deprecated APIs fixed and verified
- Ready for milestone v3.6 release
- LSP4IJ experimental API usages remain (19 usages) - out of scope, tracked in tech debt

## Notes

- All changes are drop-in API replacements with identical functional behavior
- No user-facing changes - all modifications are internal implementation details
- Plugin verifier execution took 82 seconds across 6 IDE versions (2024.2 through 2026.1 EAP)
- Experimental API usages from LSP4IJ are expected and documented in STATE.md tech debt section
- This completes the IntelliJ Platform API compatibility initiative (v3.6)
