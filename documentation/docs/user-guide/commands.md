---
sidebar_position: 5
title: Commands
---

# VS Code Commands

The BBj Language Server extension provides several commands accessible via keyboard shortcuts, the command palette, or context menus.

## Run Commands

These commands execute BBj programs in different modes.

### Run as GUI (`Alt+G`)

Runs the current BBj program in GUI (Graphical User Interface) mode.

**Command ID:** `bbj.run`

**Usage:**
- Open a `.bbj` file
- Press `Alt+G` or right-click and select "Run as GUI"

### Run as BUI (`Alt+B`)

Runs the current BBj program as a BUI (Browser User Interface) web application.

**Command ID:** `bbj.runBUI`

**Usage:**
- Open a `.bbj` file
- Press `Alt+B` or right-click and select "Run as BUI"

**Note:** Requires BUI configuration in BBj Enterprise Manager.

### Run as DWC (`Alt+D`)

Runs the current BBj program as a DWC (Dynamic Web Client) application.

**Command ID:** `bbj.runDWC`

**Usage:**
- Open a `.bbj` file
- Press `Alt+D` or right-click and select "Run as DWC"

## Build Commands

### Compile (`Alt+C`)

Compiles the current BBj source file to bytecode.

**Command ID:** `bbj.compile`

**Usage:**
- Open a `.bbj` file
- Press `Alt+C` or right-click and select "Compile"

**Output:** Creates a compiled `.bbj` file (tokenized format).

### Decompile (`Alt+X`)

Decompiles a compiled BBj program back to source code.

**Command ID:** `bbj.decompile`

**Usage:**
- Open a compiled `.bbj` file
- Press `Alt+X` or right-click and select "Decompile"

### Denumber (`Alt+N`)

Removes line numbers from a BBj program.

**Command ID:** `bbj.denumber`

**Usage:**
- Open a `.bbj` file with line numbers
- Press `Alt+N` or right-click and select "Denumber"

**Before:**
```bbj
0010 PRINT "Hello"
0020 PRINT "World"
```

**After:**
```bbj
PRINT "Hello"
PRINT "World"
```

## Configuration Commands

### Show config.bbx

Opens the BBj configuration file (`config.bbx`) in the editor.

**Command ID:** `bbj.config`

**Location:** `$BBJ_HOME/cfg/config.bbx`

### Show BBj.properties

Opens the BBj properties file in the editor.

**Command ID:** `bbj.properties`

**Location:** `$BBJ_HOME/cfg/BBj.properties`

### Open Enterprise Manager

Opens the BBj Enterprise Manager web interface in your default browser.

**Command ID:** `bbj.em`

**URL:** Typically `http://localhost:8888/bbjem/em`

### Show Classpath Entries

Displays available classpath entries configured in BBj Enterprise Manager.

**Command ID:** `bbj.showClasspathEntries`

**Usage:** Useful for verifying which classpath entries are available for Java class resolution.

## Keyboard Shortcuts Summary

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Run as GUI | `Alt+G` | `Alt+G` |
| Run as BUI | `Alt+B` | `Alt+B` |
| Run as DWC | `Alt+D` | `Alt+D` |
| Compile | `Alt+C` | `Alt+C` |
| Decompile | `Alt+X` | `Alt+X` |
| Denumber | `Alt+N` | `Alt+N` |

## Command Palette

All commands are available via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- Type "BBj" to see all BBj commands
- Select the desired command

## Context Menus

### Editor Context Menu

Right-click in a BBj file editor to access:
- Run as GUI
- Run as BUI
- Run as DWC
- Compile
- Decompile
- Denumber

### Explorer Context Menu

Right-click on a `.bbj` file in the Explorer to access run and build commands.

### Editor Title Bar

Quick action buttons appear in the editor title bar when editing BBj files:
- Run button (GUI mode)
- Additional action buttons based on configuration

## Auto-Save Option

Configure automatic saving before running:

```json
{
  "bbj.web.AutoSaveUponRun": true
}
```

When enabled, files are automatically saved before any run command executes.

## Requirements

For commands to work properly, ensure:

1. **BBj Home** is configured (`bbj.home` setting)
2. **BBjServices** is running
3. **Java** is available in PATH
4. **Enterprise Manager** is accessible (for BUI/DWC)

## Troubleshooting

### Commands Not Working

1. Verify `bbj.home` setting points to valid BBj installation
2. Check BBjServices is running
3. Look for errors in Output panel (BBj Language Server)

### Run Commands Fail

1. Ensure BBjServices is started
2. Verify program file has no syntax errors
3. Check BBj configuration files

### Compile/Decompile Issues

1. Verify Java is installed and in PATH
2. Check file permissions
3. Ensure source file is saved
