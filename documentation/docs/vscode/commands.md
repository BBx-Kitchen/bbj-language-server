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

**Note:** Requires BUI configuration in BBj Enterprise Manager and authentication via `BBj: Login to Enterprise Manager`.

### Run as DWC (`Alt+D`)

Runs the current BBj program as a DWC (Dynamic Web Client) application.

**Command ID:** `bbj.runDWC`

**Usage:**
- Open a `.bbj` file
- Press `Alt+D` or right-click and select "Run as DWC"

**Note:** Requires Enterprise Manager authentication via `BBj: Login to Enterprise Manager`.

## Build Commands

### Compile (`Alt+C`)

Compiles the current BBj source file to bytecode.

**Command ID:** `bbj.compile`

**Usage:**
- Open a `.bbj` file
- Press `Alt+C` or right-click and select "Compile"

**Output:** Creates a compiled `.bbj` file (tokenized format).

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

### Login to Enterprise Manager

Authenticates with BBj Enterprise Manager and stores the JWT token for BUI/DWC run commands.

**Command ID:** `bbj.loginEM`

**Usage:**
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "BBj: Login to Enterprise Manager"
3. Enter your Enterprise Manager username and password
4. Token is stored securely in VS Code's SecretStorage

**Required for:** Running BUI and DWC programs. Token persists across VS Code restarts.

### Refresh Java Classes

Reloads the Java classpath and clears cached class information.

**Command ID:** `bbj.refreshJavaClasses`

**Usage:** Run from the Command Palette when Java classes are not appearing in code completion, or after classpath changes in Enterprise Manager.

### Configure Compile Options

Opens a settings dialog to configure BBj compiler options (type checking, line numbering, output settings, content protection, and diagnostics).

**Command ID:** `bbj.configureCompileOptions`

**Usage:** Run from the Command Palette to configure compiler flags before compiling.

## Keyboard Shortcuts Summary

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Run as GUI | `Alt+G` | `Alt+G` |
| Run as BUI | `Alt+B` | `Alt+B` |
| Run as DWC | `Alt+D` | `Alt+D` |
| Compile | `Alt+C` | `Alt+C` |
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
4. **Enterprise Manager** is accessible and authenticated (for BUI/DWC commands - use `BBj: Login to Enterprise Manager`)

## Troubleshooting

### Commands Not Working

1. Verify `bbj.home` setting points to valid BBj installation
2. Check BBjServices is running
3. Look for errors in Output panel (BBj Language Server)

### Run Commands Fail

1. Ensure BBjServices is started
2. Verify program file has no syntax errors
3. Check BBj configuration files

### BUI/DWC Commands Fail

If BUI or DWC run commands fail:
1. Verify Enterprise Manager is accessible at the configured EM URL
2. Authenticate using `BBj: Login to Enterprise Manager` from the Command Palette
3. Check if the token has expired (re-authenticate if needed)

### Compile Issues

1. Verify Java is installed and in PATH
2. Check file permissions
3. Ensure source file is saved
