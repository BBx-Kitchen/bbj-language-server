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

**Validation:** The path must be absolute — a leading `~` is expanded first. A missing file is flagged in the dialog.

## BBj Compiler

### Compile output directory

The directory `bbjcpl` writes tokenized output to when you run "Compile BBj File". Required for
that command — the field's placeholder reads "Required for \"Compile BBj File\" to run", and
compiling without one configured reports that no compile output directory is configured, with a
way to open the settings from the error. The dialog does not validate the path itself; `bbjcpl`
reports a bad one.

### Compiler check

Controls when the BBj compiler's own parser checks the currently open file. See
[Live Compiler Diagnostics](./features.md#live-compiler-diagnostics) for the full description of
what each choice does.

**Options:**
- **Debounced** — the default
- **On save**
- **Off**

On save is recommended for large workspaces.

## Formatter

The Formatter section holds the 15 formatter settings. They apply after the language server
restarts, and Apply restarts it for you. Format on save is not a BBj setting: it is under
`Settings > Tools > Actions on Save`. Each control is described in
[Formatter settings](./formatting.md#formatter-settings).

## Node.js Runtime

### Node.js Path

Path to the Node.js executable.

**Features:**
- Auto-detects from system PATH
- Validates version 22+
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

**Note:** The host is never auto-detected — it is always a manually edited field. Leave the field
empty to use `localhost` — the plugin substitutes it before starting the language server. Any
other value is used as typed, with surrounding spaces trimmed.

### Port

Port number for the Java interop service.

**Default:** `5008`

**Auto-detect:**
- An **Auto-detect** checkbox sits under the Port field, checked by default.
- While checked, the Port field is disabled (greyed out) and shows the port read from the `com.basis.languageServer.addr` line in the BBj Home's `cfg/BBj.properties` file. That line has the form `host:port:enabled`.
- A hint line under the field names where the shown value came from — or, if no port could be found in `BBj.properties`, that 5008 is being used as the default.
- If the `enabled` segment of that line reports the Java interop service as disabled in BBjServices, the detected port is still used, and the hint says the service is disabled.
- Unchecking Auto-detect pre-fills the field with whatever value was in effect and makes it editable. Whatever port is then applied — including 5008 — is kept exactly as entered and is never silently replaced by auto-detection. Re-checking Auto-detect discards any edit and returns the field to the detected value.
- Validates range: 1-65535
- Must match the port BBjServices is using for the Java interop service

**Effective value:** The language server's startup options, the Java interop connection-health indicator, and the Settings dialog itself all use the same effective port — whichever value Auto-detect or an explicit choice currently resolves to.

**When changes take effect:** A port change takes effect the next time the language server starts. Applying settings restarts the language server, so the new value is picked up immediately after Apply.

## Enterprise Manager

### EM URL

URL for BBj Enterprise Manager.

**Default:** `http://localhost:8888` (used when field is empty)

**Usage:** Used for BUI and DWC web runner (launching programs in browser).

### EM Token Authentication

BUI and DWC run commands require authentication with Enterprise Manager.

**Authentication Flow:**
1. Go to `Tools > Login to Enterprise Manager`
2. Enter your EM username and password in the dialog — the username field is pre-filled with the
   last username that logged in successfully (`admin` the first time)
3. Plugin stores the JWT token securely in IntelliJ's PasswordSafe (credential store); the
   username is remembered for next time, but only after a successful login, and the password is
   never remembered
4. Token is used automatically for subsequent BUI/DWC runs

**Automatic re-prompt:** Running a program as BUI or DWC asks for a login by itself when needed —
you do not have to log in ahead of time. With no stored token it asks "EM login required for BUI.
Login now?" (or DWC). With a token that has expired locally, or one Enterprise Manager no longer
accepts, it deletes the token and asks "EM token expired or invalid. Login again?". Answering No
either time stops the run and logs the reason in the BBj Language Server tool window. A login
that returns an unusable token fails immediately and stores nothing.

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
