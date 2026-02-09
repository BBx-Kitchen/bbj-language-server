---
sidebar_position: 4
title: Configuration
---

# Configuration

The BBj Language Support plugin for IntelliJ IDEA provides comprehensive configuration options accessible through IntelliJ's Settings UI.

## Accessing Settings

**Open Settings:**
- macOS: `Cmd+,`
- Windows/Linux: `Ctrl+Alt+S`

**Navigate to:** `Languages & Frameworks > BBj`

All BBj plugin settings are located on this single application-level settings page.

## BBj Environment

### BBj Home

Path to your BBj installation directory (e.g., `/opt/bbj` or `C:\bbj`).

**Features:**
- Browse button for directory selection
- Auto-detects BBj Home if installed in standard locations (empty field triggers auto-detection)
- Validates path by checking for `BBj.properties` file in `cfg/` subdirectory
- Valid paths show no error; invalid paths display a warning about missing `BBj.properties`

**Required for most features to work:**
- Running programs
- Resolving libraries
- Finding configuration files

### config.bbx Path

Optional custom path to your `config.bbx` file.

**Default:** `{BBj Home}/cfg/config.bbx` (used when field is empty)

**When to configure:** Only needed if using a non-standard `config.bbx` location outside the BBj installation directory.

## Node.js Runtime

### Node.js Path

Path to the Node.js executable.

**Features:**
- Auto-detects from system PATH
- Validates version 18+
- If not found, plugin can auto-download a compatible Node.js version

**Required:** The language server is a Node.js application and requires Node.js to run.

## Classpath

### Classpath Entry

Dropdown populated from `basis.classpath.*` entries in `BBj.properties`.

**Features:**
- Dynamically updates when BBj Home changes
- Determines which Java classes are available for code completion
- Must match a classpath entry defined in BBj Enterprise Manager

**Troubleshooting:** If dropdown is empty, verify BBj Home is set correctly and `BBj.properties` contains `basis.classpath.*` entries.

## Language Server

### Log Level

Controls the verbosity of language server output.

**Options:** `Error`, `Warn`, `Info`, `Debug`

**Default:** `Info`

**Debug level shows:**
- Detailed information about Java class loading
- Classpath scanning details
- Parser analysis
- Validation timing

**Features:**
- Changes take effect immediately without restarting the language server
- View logs in the "BBj Language Server" tool window (bottom panel)

**Usage:**
1. Set Log Level to `Debug` in settings
2. Open the BBj Language Server tool window to see detailed diagnostics
3. Set back to `Info` when done to reduce output noise

## Java Interop

The Java interop service provides Java class introspection for code completion.

### Host

Hostname for the Java interop service.

**Default:** `localhost`

### Port

Port number for the Java interop service.

**Default:** `5008`

**Features:**
- Auto-detected from `BBj.properties` when BBj Home is set
- Validates range: 1-65535
- Must match the port BBjServices is using for the Java interop service

## Enterprise Manager

### EM URL

URL for BBj Enterprise Manager.

**Default:** `http://localhost:8888` (used when field is empty)

**Usage:** Used for BUI and DWC web runner (launching programs in browser).

### EM Token Authentication

BUI and DWC run commands require authentication with Enterprise Manager.

**Authentication Flow:**
1. Go to `Tools > Login to Enterprise Manager`
2. Enter your EM username and password in the dialog
3. Plugin stores the JWT token securely in IntelliJ's PasswordSafe (credential store)
4. Token is used automatically for subsequent BUI/DWC runs
5. Re-authenticate if the token expires

The stored token is managed by IntelliJ's secure credential storage and persists across IDE restarts.

## Run Settings

### Auto-save before run

Checkbox to enable automatic file saving before executing run commands.

**Default:** Enabled

**When enabled:** Automatically saves the current file before executing any run command (GUI, BUI, or DWC).

## Troubleshooting Configuration

### Verify BBj Home

Check the Settings page for validation errors on the BBj Home field:
- Valid path: No error displayed
- Invalid path: Warning appears about missing `BBj.properties`

### Check Classpath

If the Classpath Entry dropdown is empty:
1. Verify BBj Home is set correctly
2. Check that `{BBj Home}/cfg/BBj.properties` exists
3. Verify `BBj.properties` contains `basis.classpath.*` entries

### Language Server Logs

To diagnose language server issues:
1. Set Log Level to `Debug` in Settings
2. Open the "BBj Language Server" tool window (bottom panel)
3. Look for detailed diagnostics including:
   - Java class resolution
   - Parser warnings
   - Validation details
4. Set Log Level back to `Info` when done
