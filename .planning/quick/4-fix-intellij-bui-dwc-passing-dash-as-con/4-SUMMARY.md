---
phase: quick-4
plan: 01
subsystem: intellij-run-actions
tags: [bugfix, intellij, bui, dwc, config-path, argv]
dependency_graph:
  requires: []
  provides:
    - "Conditional configPath parameter passing in BUI/DWC run actions"
  affects:
    - "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java"
    - "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java"
tech_stack:
  added: []
  patterns:
    - "Conditional parameter passing for optional command line arguments"
key_files:
  created: []
  modified:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java"
      role: "BUI run action with conditional configPath parameter"
      lines_modified: 4
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java"
      role: "DWC run action with conditional configPath parameter"
      lines_modified: 4
decisions:
  - summary: "Use isEmpty() check instead of null check for configPath"
    rationale: "getConfigPath() returns empty string (not null) when config path is not configured"
  - summary: "Match BbjRunGuiAction's conditional parameter pattern"
    rationale: "Maintains consistency across run action implementations for optional arguments"
metrics:
  duration: 42
  completed: "2026-02-08"
---

# Quick Task 4: Fix IntelliJ BUI/DWC Passing Empty String as Config Argument

**One-liner:** Fixed BUI and DWC run actions to conditionally pass configPath, preventing empty string from causing incorrect ARGV parsing in web.bbj.

## What Was Done

Fixed a bug where IntelliJ's BUI and DWC run actions unconditionally passed the configPath parameter to web.bbj, even when it was an empty string. This caused issues with BBj's positional argument parsing (ARGV), where the empty string could result in "-" being interpreted as the config file path.

### Changes Made

**Both BbjRunBuiAction.java and BbjRunDwcAction.java:**
- Updated comment from `// Get config path` to `// Get config path - only add if configured (web.bbj handles absent ARGV(9) gracefully)`
- Replaced unconditional `cmd.addParameter(configPath)` with conditional check:
  ```java
  if (!configPath.isEmpty()) {
      cmd.addParameter(configPath);
  }
  ```

This matches the pattern used in BbjRunGuiAction.java for handling optional arguments and aligns with how web.bbj's `ARGV(9,err=*next)` gracefully handles missing arguments by leaving configFile! as null, which then correctly triggers the default config path logic.

## Verification Results

- Java compilation successful via `./gradlew compileJava`
- Both files have the conditional check around `cmd.addParameter(configPath)`
- The "-" separator parameter on line 86 remains unchanged
- All other parameters (token, classpath, username, password placeholders, working directory, etc.) remain unchanged
- Conditional logic is consistent across both BUI and DWC actions

## Deviations from Plan

None - plan executed exactly as written.

## Task Completion

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Fix BUI and DWC actions to conditionally pass configPath | 79f20a0 | BbjRunBuiAction.java, BbjRunDwcAction.java |

## Success Criteria Met

- [x] BbjRunBuiAction and BbjRunDwcAction skip the configPath argument when the setting is empty
- [x] BbjRunBuiAction and BbjRunDwcAction still pass configPath when it IS configured
- [x] Java compilation succeeds

## Impact

**Before:** When config.bbx path was not configured (empty string), BUI and DWC run commands would pass an empty string as the last positional argument, potentially causing ARGV parsing issues in web.bbj.

**After:** When config.bbx path is not configured, the configPath parameter is omitted entirely. web.bbj's `ARGV(9,err=*next)` handles the absence gracefully, leaving configFile! as null, which triggers the correct default config path logic using `BBjAPI().getConfig().getConfigFileName()`.

This ensures consistent behavior with VS Code (which handles empty configPath correctly via shell quoting) and matches the conditional parameter pattern already used in BbjRunGuiAction.

## Self-Check: PASSED

Verified files exist:
```
FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
```

Verified commit exists:
```
FOUND: 79f20a0
```
