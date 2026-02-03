---
phase: 08
plan: 01
subsystem: actions
tags: [run-actions, gui, settings, notifications, command-line]

requires:
  - 07-01 (BbjIcons for RUN_GUI icon)
  - 03-01 (BbjSettings for configuration)
provides:
  - BbjRunActionBase: Abstract base class for all run actions
  - BbjRunGuiAction: GUI program run action
  - autoSaveBeforeRun setting
  - Editor context menu run action
affects:
  - 08-02 (BUI/DWC actions will extend BbjRunActionBase)

tech-stack:
  added: []
  patterns:
    - Abstract base action pattern for shared functionality
    - IntelliJ AnAction framework with update() gating
    - OSProcessHandler for spawning bbj executable
    - NotificationGroupManager for user feedback

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

decisions:
  - name: "Project root as working directory"
    rationale: "Uses project.getBasePath() as -WD value, differing from VSCode's path.dirname(fileName). Phase 08 context decision for consistent behavior across all run actions."
    impact: "BUI/DWC actions in 08-02 will also use project root"

  - name: "ActionUpdateThread.BGT for update()"
    rationale: "File extension check is cheap (no I/O), safe to run on background thread"
    impact: "Prevents UI freezing during action availability checks"

  - name: "Removed .setExpired(true) from notification"
    rationale: "IntelliJ Platform API doesn't provide setExpired() method"
    impact: "Success notifications display as standard info balloons"

  - name: "Auto-save defaults to true"
    rationale: "Matches VSCode behavior and prevents user confusion from running stale code"
    impact: "All run actions will auto-save by default"

metrics:
  duration: "2m 21s"
  completed: 2026-02-01
---

# Phase 8 Plan 1: GUI Run Action Summary

**One-liner:** Abstract run action base class with settings integration, BBj executable spawning, and GUI run action with context menu registration

## What Was Built

### BbjRunActionBase (Abstract Base Class)
- **File validation:** update() enables action only for BBj file extensions (.bbj, .bbl, .bbjt, .src, .bbx)
- **Settings integration:**
  - `getBbjExecutablePath()`: reads BbjSettings.bbjHomePath, validates executable exists, handles Windows vs. Unix
  - `getClasspathArg()`: reads BbjSettings.classpathEntry, formats as "-CPvalue" (no space)
  - `autoSaveIfNeeded()`: calls FileDocumentManager.saveAllDocuments() when BbjSettings.autoSaveBeforeRun is true
- **Error handling:**
  - `showError()`: displays sticky notification balloon via "BBj Language Server" notification group
  - `showSuccess()`: displays info notification "Launched <filename> (<mode>)"
- **Execution flow:**
  - actionPerformed(): auto-saves → builds command via buildCommandLine() → spawns OSProcessHandler → shows success/error
- **Abstract methods:**
  - `buildCommandLine()`: subclass provides mode-specific command construction
  - `getRunMode()`: subclass provides mode name for success message

### BbjRunGuiAction (GUI Run Implementation)
- Extends BbjRunActionBase
- Icon: BbjIcons.RUN_GUI
- Command pattern: `bbj -q [-CPclasspath] -WD<project_root> <file_path>`
- Matches VSCode Commands.run behavior (except working directory: project root vs. file directory)
- Validates BBj home is configured and executable exists before launching

### Settings Enhancement
- Added `autoSaveBeforeRun` field to BbjSettings.State (default: true)
- Enables all run actions to honor auto-save preference

### Plugin Registration
- Registered bbj.runGui action in plugin.xml
- Placement: EditorPopupMenu at anchor="first"
- Makes "Run As BBj Program" appear at top of right-click context menu on BBj files

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create BbjRunActionBase and BbjRunGuiAction with settings integration | c62d8e3 | BbjRunActionBase.java, BbjRunGuiAction.java, BbjSettings.java |
| 2 | Register GUI run action in plugin.xml with context menu placement | 534dac4 | plugin.xml |

## Decisions Made

1. **Project root as working directory:** Uses `project.getBasePath()` for -WD flag instead of VSCode's `path.dirname(fileName)`. This is a phase-level decision documented in 08-CONTEXT.md that ensures consistent behavior across GUI/BUI/DWC run actions. BUI/DWC actions in Plan 08-02 will inherit this behavior.

2. **Auto-save defaults to true:** Matches VSCode's `bbj.web.AutoSaveUponRun` behavior to prevent users from running stale code. Setting is stored in BbjSettings.State for UI configuration in a future settings enhancement.

3. **Notification API usage:** Removed `.setExpired(true)` call (not available in this IntelliJ Platform version). Success notifications now display as standard INFORMATION balloons.

4. **ActionUpdateThread.BGT:** Explicitly specified background thread for update() since file extension checking is cheap and doesn't require read actions.

## Technical Implementation

### Command Line Structure
BbjRunGuiAction builds commands matching this pattern:
```bash
bbj -q [-CPclasspath] -WD/project/root /path/to/file.bbj
```

### Error Paths
- Missing/empty BBj home → Error notification "BBj home is not configured or bbj executable not found"
- BBj executable doesn't exist → Same error notification
- Spawn failure → Error notification "Failed to launch: <exception message>"

### Success Path
- Auto-saves all open documents (if enabled)
- Spawns bbj process via OSProcessHandler
- Shows info notification "Launched MyProgram.bbj (GUI)"

## Verification Results

✅ `./gradlew buildPlugin` succeeds
✅ BbjRunActionBase has update() with file type check, getBbjExecutablePath(), getClasspathArg(), autoSaveIfNeeded(), showError(), showSuccess(), abstract buildCommandLine() and getRunMode()
✅ BbjRunGuiAction builds command matching VSCode pattern (with project root working directory)
✅ BbjSettings.State has autoSaveBeforeRun = true default
✅ plugin.xml has bbj.runGui action in EditorPopupMenu
✅ Error path: empty bbjHomePath shows notification balloon

## Next Phase Readiness

### For Phase 08 Plan 02 (BUI/DWC Actions)
**Ready.** BbjRunActionBase provides the complete infrastructure:
- Settings integration (getBbjExecutablePath, getClasspathArg)
- Auto-save handling
- Error/success notifications
- File validation

Plan 08-02 can extend BbjRunActionBase, override buildCommandLine() to add web runner parameters, and implement getRunMode() with "BUI" or "DWC".

### Known Limitations
1. **No keyboard shortcuts yet:** Plan 08-02 will add shortcuts for all three actions together in a consistent action group
2. **No toolbar buttons yet:** Same as above
3. **No auto-save UI setting:** Settings UI will be enhanced in a future plan to expose autoSaveBeforeRun checkbox
4. **Command output not captured:** Current implementation spawns process but doesn't pipe stdout/stderr to IDE console. Future enhancement could add Run tool window integration.

## Deviations from Plan

None - plan executed exactly as written. The notification API difference (.setExpired() not available) was handled inline as an implementation detail without changing the behavior specification.
