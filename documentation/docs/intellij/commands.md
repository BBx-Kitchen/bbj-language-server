---
sidebar_position: 5
title: Commands
---

# IntelliJ Commands

The BBj Language Support plugin for IntelliJ IDEA provides commands for running, compiling, and managing BBj programs through keyboard shortcuts, context menus, the toolbar, and the Tools menu.

## Run Commands

### Run As BBj Program (Alt+G)

Runs the current BBj file as a GUI (desktop) application.

**Action ID:** `bbj.runGui`

**Keyboard Shortcut:** `Alt+G`

**Access:**
- Press `Alt+G` in the editor
- Right-click in a BBj file editor → "Run As BBj Program"
- Right-click a BBj file in Project View → BBj Run → Run As BBj Program

**Available when:** BBj source file is open and language server is ready.

### Run As BUI Program (Alt+B)

Runs the current BBj file as a BUI (Browser User Interface) web application.

**Action ID:** `bbj.runBui`

**Keyboard Shortcut:** `Alt+B`

**Access:**
- Press `Alt+B` in the editor
- Right-click in a BBj file editor → "Run As BUI Program"
- Right-click a BBj file in Project View → BBj Run → Run As BUI Program

**Requires:** Enterprise Manager authentication. See [Configuration](./configuration.md#em-token-authentication) for authentication setup.

**Behavior:** Opens the program in your default browser via the configured EM URL.

### Run As DWC Program (Alt+D)

Runs the current BBj file as a DWC (Dynamic Web Client) application.

**Action ID:** `bbj.runDwc`

**Keyboard Shortcut:** `Alt+D`

**Access:**
- Press `Alt+D` in the editor
- Right-click in a BBj file editor → "Run As DWC Program"
- Right-click a BBj file in Project View → BBj Run → Run As DWC Program

**Requires:** Enterprise Manager authentication. See [Configuration](./configuration.md#em-token-authentication) for authentication setup.

**Behavior:** Opens the program in your default browser via the configured EM URL.

## Compile Command

### Compile BBj File

Compiles the current BBj source file to bytecode.

**Action ID:** `bbj.compile`

**Access:** Toolbar button in the main toolbar (located before the Run Configuration dropdown area).

**Note:** No keyboard shortcut is assigned by default. You can assign a custom shortcut in Settings → Keymap → search "BBj".

**Available when:** BBj source file is open and language server is ready.

## Tools Menu Commands

The following commands are available in the Tools menu.

### Restart BBj Language Server

Restarts the language server process.

**Action ID:** `bbj.restartLanguageServer`

**Access:** `Tools > Restart BBj Language Server`

**Available when:** A BBj file is open in the editor.

**Use when:**
- Language server becomes unresponsive
- After significant configuration changes (BBj Home, classpath, Node.js path)
- Troubleshooting unexpected language server behavior

### Refresh Java Classes

Reloads the Java classpath and clears cached class information.

**Action ID:** `bbj.refreshJavaClasses`

**Access:** `Tools > Refresh Java Classes`

**Available when:** Language server is started.

**Use when:**
- Classpath has changed (new JARs added, classpath entry updated in Enterprise Manager)
- Java classes are not appearing in code completion
- After modifying BBj.properties classpath entries

### Login to Enterprise Manager

Authenticates with BBj Enterprise Manager and stores the JWT token.

**Action ID:** `bbj.loginEM`

**Access:** `Tools > Login to Enterprise Manager`

**Usage:**
1. Select `Tools > Login to Enterprise Manager`
2. Enter your Enterprise Manager username and password in the dialog
3. Plugin stores the JWT token securely in IntelliJ's PasswordSafe
4. Token is used automatically for subsequent BUI/DWC run commands

**Required for:** Running BUI and DWC programs. The stored token persists across IDE restarts.

**Token expiration:** If the token expires, run this command again to re-authenticate.

**Configuration:** See [EM URL configuration](./configuration.md#em-url) to configure the Enterprise Manager URL.

## Keyboard Shortcuts Summary

| Command | Shortcut | Description |
|---------|----------|-------------|
| Run As BBj Program | `Alt+G` | Run as GUI (desktop) application |
| Run As BUI Program | `Alt+B` | Run as BUI web application |
| Run As DWC Program | `Alt+D` | Run as DWC web application |
| Compile BBj File | (toolbar button) | Compile current BBj file |

**Note:** Shortcuts use the default keymap. Custom keymaps may differ. You can customize shortcuts in `Settings > Keymap` → search "BBj".

## Context Menus

### Editor Context Menu

Right-click in a BBj file editor to access run actions at the top of the menu:
- Run As BBj Program
- Run As BUI Program
- Run As DWC Program

### Project View Context Menu

Right-click a BBj file in the Project tool window to see the "BBj Run" submenu containing:
- Run As BBj Program
- Run As BUI Program
- Run As DWC Program

## Toolbar Buttons

The **Compile** button appears in the main toolbar when editing BBj files. It is located before the Run Configuration dropdown area.

Run commands are accessed via keyboard shortcuts and context menus (not toolbar buttons).

## Auto-Save Option

When the "Auto-save before run" setting is enabled in [Settings](./configuration.md#auto-save-before-run), files are automatically saved before any run command executes.

**Default:** Enabled

**Configuration:** `Settings > Languages & Frameworks > BBj > Auto-save before run`

## Requirements for Commands

For commands to work properly, ensure:

1. **BBj Home** is configured in Settings
2. **BBjServices** is running
3. **Language server** is in "Ready" state (check the status bar widget)
4. **For BUI/DWC commands:**
   - Enterprise Manager is accessible at the configured EM URL
   - You are authenticated (use `Tools > Login to Enterprise Manager`)

## Troubleshooting

### Commands Not Available

If commands are disabled or grayed out:
1. Verify a BBj file is open in the editor
2. Check the language server status bar widget shows "Ready"
3. Verify BBj Home is configured in Settings

### Run Commands Fail

If run commands do not execute or show errors:
1. Ensure BBjServices is running
2. Verify the BBj file has no syntax errors (check for diagnostics in the editor)
3. Check the BBj Language Server tool window (bottom panel) for error messages

### BUI/DWC Commands Fail

If BUI or DWC run commands fail:
1. Verify Enterprise Manager is accessible at the configured EM URL
2. Authenticate using `Tools > Login to Enterprise Manager`
3. Check the EM URL in `Settings > Languages & Frameworks > BBj > EM URL`
4. Ensure the EM token has not expired (re-authenticate if needed)

### Compile Command Not Working

If the Compile button does not appear or does not work:
1. Verify BBj Home is configured
2. Check that a BBj file is open in the editor
3. Ensure the language server is running (check status bar widget)
