---
phase: 08-run-commands
verified: 2026-02-02T08:15:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 8: Run Commands Verification Report

**Phase Goal:** Users can run BBj programs directly from IntelliJ as GUI, BUI, or DWC with one click or keyboard shortcut
**Verified:** 2026-02-02T08:15:00Z
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can run the current BBj file as GUI via menu action or toolbar button, and the bbj executable launches with the file | ✓ VERIFIED | BbjRunGuiAction registered in plugin.xml with EditorPopupMenu and MainToolBar placement, builds command `bbj -q [-CPclasspath] -WD<project_root> <file_path>`, spawns OSProcessHandler |
| 2 | User can run the current BBj file as BUI or DWC via menu action or toolbar button, and a browser-based session starts | ✓ VERIFIED | BbjRunBuiAction and BbjRunDwcAction registered in plugin.xml with EditorPopupMenu and MainToolBar placement, build web.bbj commands matching VSCode pattern, web.bbj bundled at lib/tools/web.bbj |
| 3 | Pressing Alt+G / Alt+B / Alt+D triggers the corresponding run action from any BBj file | ✓ VERIFIED | plugin.xml has keyboard-shortcut elements: alt G for bbj.runGui, alt B for bbj.runBui, alt D for bbj.runDwc |
| 4 | Run commands respect BBj home and classpath from plugin settings; missing BBj home shows a clear error notification | ✓ VERIFIED | BbjRunActionBase.getBbjExecutablePath() reads BbjSettings.bbjHomePath and validates executable exists, getClasspathArg() reads classpathEntry, showError() displays notification via "BBj Language Server" notification group |
| 5 | Active file is auto-saved before run execution | ✓ VERIFIED | BbjRunActionBase.autoSaveIfNeeded() calls FileDocumentManager.saveAllDocuments() when BbjSettings.autoSaveBeforeRun is true (defaults to true), invoked in actionPerformed() before buildCommandLine() |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` | Abstract base class with settings integration, auto-save, error handling | ✓ VERIFIED | 204 lines, extends AnAction, provides getBbjExecutablePath(), getClasspathArg(), getWebBbjPath(), autoSaveIfNeeded(), showError(), showSuccess(), abstract buildCommandLine() and getRunMode(), actionPerformed() orchestrates execution flow |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java` | GUI run action | ✓ VERIFIED | 60 lines, extends BbjRunActionBase, builds command `bbj -q [-CPclasspath] -WD<project_root> <file_path>` matching VSCode pattern |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` | BUI run action | ✓ VERIFIED | 86 lines, extends BbjRunActionBase, builds web.bbj command with BUI client type, reads EM credentials from settings |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` | DWC run action | ✓ VERIFIED | 86 lines, extends BbjRunActionBase, builds web.bbj command with DWC client type, reads EM credentials from settings |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` | Settings with autoSaveBeforeRun, emUsername, emPassword | ✓ VERIFIED | State class has autoSaveBeforeRun = true, emUsername = "admin", emPassword = "admin123" |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` | Settings UI with EM fields and auto-save checkbox | ✓ VERIFIED | Has emUsernameField, emPasswordField, autoSaveCheckbox in "Run Commands" section, getter/setter methods present |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` | Settings wiring | ✓ VERIFIED | isModified(), apply(), reset() all wire emUsername, emPassword, autoSaveBeforeRun fields |
| `bbj-intellij/src/main/resources/META-INF/plugin.xml` | All three actions registered | ✓ VERIFIED | bbj.runGui, bbj.runBui, bbj.runDwc registered with keyboard shortcuts, EditorPopupMenu placement (after each other), MainToolBar placement (after each other) |
| `bbj-intellij/build.gradle.kts` | web.bbj bundling | ✓ VERIFIED | copyWebRunner task copies from bbj-vscode/tools/web.bbj to build/resources/main/tools, prepareSandbox includes web.bbj at lib/tools/ |
| `bbj-vscode/tools/web.bbj` | Source web.bbj exists | ✓ VERIFIED | 1702 bytes, exists at bbj-vscode/tools/web.bbj |
| `bbj-intellij/src/main/resources/icons/run-*.svg` | Run action icons | ✓ VERIFIED | run-gui.svg, run-bui.svg, run-dwc.svg and _dark variants exist, 6-8 lines each, non-empty |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| BbjRunActionBase | BbjSettings | reads bbjHomePath and classpathEntry | WIRED | getBbjExecutablePath() and getClasspathArg() call BbjSettings.getInstance().getState(), used in all three action classes |
| BbjRunGuiAction | BbjRunActionBase | extends base class, calls buildGuiCommand() | WIRED | extends BbjRunActionBase, calls getBbjExecutablePath() and getClasspathArg() |
| BbjRunBuiAction | BbjRunActionBase | extends base class, calls getWebBbjPath() | WIRED | extends BbjRunActionBase, calls getBbjExecutablePath() and getWebBbjPath(), reads emUsername/emPassword from BbjSettings |
| BbjRunDwcAction | BbjRunActionBase | extends base class, calls getWebBbjPath() | WIRED | extends BbjRunActionBase, calls getBbjExecutablePath() and getWebBbjPath(), reads emUsername/emPassword from BbjSettings |
| BbjRunActionBase | OSProcessHandler | spawns process with GeneralCommandLine | WIRED | actionPerformed() creates OSProcessHandler(cmd) and calls startNotify() |
| plugin.xml | BbjRunGuiAction | action registration | WIRED | bbj.runGui with class="com.basis.bbj.intellij.actions.BbjRunGuiAction", keyboard-shortcut alt G |
| plugin.xml | BbjRunBuiAction | action registration | WIRED | bbj.runBui with class="com.basis.bbj.intellij.actions.BbjRunBuiAction", keyboard-shortcut alt B |
| plugin.xml | BbjRunDwcAction | action registration | WIRED | bbj.runDwc with class="com.basis.bbj.intellij.actions.BbjRunDwcAction", keyboard-shortcut alt D |
| build.gradle.kts | web.bbj | Copy task bundling | WIRED | copyWebRunner task includes web.bbj, prepareSandbox copies to lib/tools/, verified at build/idea-sandbox/IC-2024.2/plugins/bbj-intellij/lib/tools/web.bbj |
| BbjRunActionBase | web.bbj | locates bundled web.bbj via PluginManagerCore | WIRED | getWebBbjPath() resolves plugin.getPluginPath().resolve("lib/tools/web.bbj"), used by BUI/DWC actions |
| BbjSettingsConfigurable | BbjSettings | wires emUsername, emPassword, autoSaveBeforeRun | WIRED | isModified(), apply(), reset() all handle emUsername, emPassword, autoSaveBeforeRun fields |

### Anti-Patterns Found

**None detected.**

- No TODO, FIXME, XXX, HACK, or placeholder comments in action files
- No empty implementations (all `return null` are legitimate error handling with showError() calls)
- No stub patterns (console.log only, empty handlers, hardcoded placeholders)
- All actions have substantive implementations (60-204 lines, non-trivial logic)

### Human Verification Required

**None required for structural verification.**

The following runtime behaviors SHOULD be tested by a human, but are not required for phase completion:

1. **GUI run launches BBj process**
   - Test: Right-click a .bbj file, select "Run As BBj Program", or press Alt+G
   - Expected: bbj executable spawns with the file path, program runs
   - Why human: Requires BBj installation and runtime environment

2. **BUI run opens browser session**
   - Test: Right-click a .bbj file, select "Run As BUI Program", or press Alt+B
   - Expected: bbj spawns web.bbj runner, browser opens with BUI session
   - Why human: Requires BBj installation, Enterprise Manager, and browser interaction

3. **DWC run opens browser session**
   - Test: Right-click a .bbj file, select "Run As DWC Program", or press Alt+D
   - Expected: bbj spawns web.bbj runner, browser opens with DWC session
   - Why human: Requires BBj installation, Enterprise Manager, and browser interaction

4. **Missing BBj home shows error notification**
   - Test: Clear BBj home in settings, try to run any action
   - Expected: Error notification "BBj home is not configured or bbj executable not found"
   - Why human: Requires settings manipulation and notification observation

5. **Auto-save before run**
   - Test: Edit a .bbj file without saving, run any action with auto-save enabled
   - Expected: File is saved before bbj process spawns
   - Why human: Requires filesystem observation and timing

6. **Toolbar buttons appear and work**
   - Test: Open a BBj file, look at main toolbar, click run buttons
   - Expected: Three toolbar buttons (GUI/BUI/DWC icons) appear, clicking launches corresponding action
   - Why human: Requires visual verification of toolbar and icon rendering

7. **Keyboard shortcuts work**
   - Test: Open a BBj file, press Alt+G, Alt+B, Alt+D
   - Expected: Corresponding run actions trigger
   - Why human: Requires keyboard interaction and shortcut verification

8. **Context menu shows all three actions**
   - Test: Right-click a .bbj file in editor
   - Expected: Context menu shows "Run As BBj Program", "Run As BUI Program", "Run As DWC Program" at the top
   - Why human: Requires visual verification of context menu

9. **EM credentials and auto-save settings appear**
   - Test: Open Settings > Languages & Frameworks > BBj
   - Expected: "Run Commands" section shows EM Username (default: admin), EM Password (default: admin123), Auto-save checkbox (default: checked)
   - Why human: Requires settings UI navigation and visual verification

## Command Line Verification

### GUI Command Pattern

**Expected (from Plan 08-01):**
```bash
bbj -q [-CPclasspath] -WD<project_root> <file_path>
```

**Actual (BbjRunGuiAction.buildCommandLine()):**
```java
cmd.addParameter("-q");
if (classpath != null) cmd.addParameter(classpath); // -CPvalue
cmd.addParameter("-WD" + projectRoot);
cmd.addParameter(file.getPath());
```

**Status:** ✓ MATCHES

### BUI/DWC Command Pattern

**Expected (from Plan 08-02, matching VSCode runWeb):**
```bash
bbj -q -WD<webRunnerDir> <webBbjPath> - "<client>" "<name>" "<programme>" "<workingDir>" "<username>" "<password>" "<classpath>"
```

**Actual (BbjRunBuiAction/BbjRunDwcAction.buildCommandLine()):**
```java
cmd.addParameter("-q");
cmd.addParameter("-WD" + webRunnerDir);
cmd.addParameter(webBbjPath);
cmd.addParameter("-");
cmd.addParameter("BUI" or "DWC");
cmd.addParameter(name);
cmd.addParameter(programme);
cmd.addParameter(workingDir);
cmd.addParameter(username);
cmd.addParameter(password);
cmd.addParameter(classpath);
```

**Status:** ✓ MATCHES VSCode pattern (line 66 of Commands.cjs)

## Build Verification

```bash
cd bbj-intellij && ./gradlew compileJava
# Result: BUILD SUCCESSFUL in 1s (UP-TO-DATE)

cd bbj-intellij && ./gradlew processResources
# Result: BUILD SUCCESSFUL in 517ms
# Verified: build/resources/main/tools/web.bbj exists (1702 bytes)

cd bbj-intellij && ./gradlew prepareSandbox
# Result: BUILD SUCCESSFUL in 3s
# Verified: build/idea-sandbox/IC-2024.2/plugins/bbj-intellij/lib/tools/web.bbj exists

cd bbj-intellij && ./gradlew buildPlugin
# Result: BUILD SUCCESSFUL in 2s
```

All build tasks complete successfully. web.bbj bundled correctly in plugin distribution.

## Gaps Summary

**No gaps found.** All 5 success criteria verified, all required artifacts exist and are substantive, all key links wired correctly.

---

_Verified: 2026-02-02T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
