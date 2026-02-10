---
phase: quick-10
plan: 01
subsystem: IntelliJ Plugin
tags:
  - bug-fix
  - plugin-config
  - action-registration
  - intellij
dependency_graph:
  requires: []
  provides:
    - "IntelliJ compile action properly registered in EditorPopupMenu"
    - "ToolsMenu access to compile action"
    - "Keyboard shortcut alt+C for compile action"
  affects:
    - "bbj-intellij/src/main/resources/META-INF/plugin.xml"
tech_stack:
  added: []
  patterns:
    - "IntelliJ Platform action group registration"
    - "EditorPopupMenu for context menu actions"
    - "ToolsMenu for discoverable tools"
key_files:
  created: []
  modified:
    - path: "bbj-intellij/src/main/resources/META-INF/plugin.xml"
      purpose: "Fixed BbjCompileAction group registration"
      key_changes:
        - "Removed MainToolbar group reference (non-existent)"
        - "Added EditorPopupMenu registration (after bbj.runDwc)"
        - "Added ToolsMenu registration (last position)"
        - "Added keyboard shortcut alt+C"
decisions: []
metrics:
  duration_seconds: 61
  duration_human: "1 minute"
  completed_date: "2026-02-10"
  tasks_completed: 1
  files_modified: 1
  lines_added: 3
  lines_removed: 1
---

# Quick Task 10: Fix IntelliJ MainToolbar Group Registration

**One-liner:** Eliminated IntelliJ PluginException by moving compile action from non-existent MainToolbar to EditorPopupMenu + ToolsMenu with alt+C shortcut

## Context

The IntelliJ plugin was throwing a PluginException on startup: `group with id "MainToolbar" isn't registered`. This occurred because the BbjCompileAction was attempting to register itself in the "MainToolbar" group, which is not universally available across all IntelliJ Platform versions and configurations.

## What Was Built

Fixed the compile action registration by:
1. Removing the reference to the non-existent MainToolbar group
2. Registering the action in EditorPopupMenu (editor right-click menu) positioned after the bbj.runDwc action
3. Adding the action to ToolsMenu for additional discoverability
4. Adding a keyboard shortcut (alt+C) consistent with the run actions (alt+G, alt+B, alt+D)

This places the compile action alongside the existing run actions in the editor context menu, creating a consistent and discoverable location that works across all IntelliJ Platform versions.

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] The PluginException about "MainToolbar" group not being registered is eliminated
- [x] BbjCompileAction is accessible from the editor right-click context menu (after the DWC run action)
- [x] BbjCompileAction is accessible from the Tools menu
- [x] BbjCompileAction has a keyboard shortcut (alt+C)
- [x] Plugin builds without errors or warnings related to group registration

## Task Completion

### Task 1: Move BbjCompileAction from MainToolbar to EditorPopupMenu
**Status:** Complete
**Commit:** 8c57712
**Files Modified:**
- bbj-intellij/src/main/resources/META-INF/plugin.xml

**Changes:**
- Changed comment from `<!-- BBj Compile Action (toolbar only) -->` to `<!-- BBj Compile Action -->`
- Replaced `<add-to-group group-id="MainToolbar" anchor="before" relative-to-action="RunConfiguration"/>` with:
  - `<add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runDwc"/>`
  - `<add-to-group group-id="ToolsMenu" anchor="last"/>`
- Added keyboard shortcut: `<keyboard-shortcut keymap="$default" first-keystroke="alt C"/>`

**Verification:**
- `grep "MainToolbar"` returns no matches (MainToolbar reference removed)
- Plugin builds successfully with no group registration errors
- `add-to-group` count: 9 total registrations (all using universally available groups)

## Self-Check: PASSED

**Files created:** None (modification only)

**Files modified:**
```bash
[ -f "bbj-intellij/src/main/resources/META-INF/plugin.xml" ] && echo "FOUND: bbj-intellij/src/main/resources/META-INF/plugin.xml" || echo "MISSING: bbj-intellij/src/main/resources/META-INF/plugin.xml"
```
FOUND: bbj-intellij/src/main/resources/META-INF/plugin.xml

**Commits:**
```bash
git log --oneline --all | grep -q "8c57712" && echo "FOUND: 8c57712" || echo "MISSING: 8c57712"
```
FOUND: 8c57712

## Impact

**User-facing:**
- IntelliJ plugin no longer throws PluginException on startup
- Compile action is now accessible via:
  - Editor context menu (right-click on BBj file)
  - Tools menu
  - Keyboard shortcut (alt+C)
- Compile action appears alongside run actions in a consistent location

**Technical:**
- Eliminated dependency on MainToolbar group (not universally available)
- Uses only standard IntelliJ Platform groups (EditorPopupMenu, ToolsMenu, ProjectViewPopupMenu)
- Consistent with existing action registration patterns

## Next Steps

None - quick task complete. The compile action now uses standard IntelliJ Platform groups that are guaranteed to exist across all versions and configurations.
