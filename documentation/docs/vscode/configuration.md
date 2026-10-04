---
sidebar_position: 4
title: Configuration
---

# Configuration

The BBj Language Server extension provides various configuration options to customize your development experience.

## VS Code Settings

All settings can be configured in VS Code's settings (`Ctrl+,` or `Cmd+,`) or directly in your `settings.json` file.

### Core Settings

#### `bbj.home`

The path to your BBj installation directory.

```json
{
  "bbj.home": "/opt/bbj"
}
```

**Required** for most features to work properly. The extension uses this path to:
- Locate BBj executables for running programs
- Find configuration files
- Resolve built-in libraries

#### `bbj.classpath`

The name of the classpath entry to use for Java class resolution.

```json
{
  "bbj.classpath": "bbj_default"
}
```

This should match a classpath entry defined in your BBj Enterprise Manager.

#### `bbj.debug`

Enable verbose debug logging in the language server. When enabled, the Output panel shows detailed information about:
- Java class loading and resolution
- Classpath scanning details
- Parser ambiguity analysis
- Document validation timing

```json
{
  "bbj.debug": true
}
```

**Default**: `false`

To view debug output:
1. Set `bbj.debug` to `true` in VS Code settings
2. Open the Output panel (`View` > `Output`)
3. Select "BBj" from the dropdown
4. Debug messages appear with ISO 8601 timestamps

This setting takes effect immediately without restarting the language server.

### Enterprise Manager Settings

#### `bbj.em.url`

Enterprise Manager URL for BUI/DWC run commands and authentication.

```json
{
  "bbj.em.url": "http://localhost:8888"
}
```

**Default**: `null` (defaults to `http://localhost:8888` when not set)

#### `bbj.web.apps`

Configuration for BUI application deployment.

```json
{
  "bbj.web.apps": {
    "myapp": {
      "program": "myapp.bbj",
      "config": "myapp.arc"
    }
  }
}
```

#### `bbj.web.AutoSaveUponRun`

Automatically save files before running.

```json
{
  "bbj.web.AutoSaveUponRun": true
}
```

**Default**: `false`

### Advanced Settings

#### `bbj.configPath`

Path to a custom `config.bbx` file, used for PREFIX directory resolution. Set this when your
`config.bbx` is in a non-standard location.

```json
{
  "bbj.configPath": "/path/to/custom/config.bbx"
}
```

**Default**: `null` (uses `{bbj.home}/cfg/config.bbx`)

**Value rules:**
- The path must be absolute. A leading `~` is expanded to your home directory.
- A relative path is rejected: no config file and no PREFIX directories are used, and the `BBj`
  output channel shows one warning line naming the rejected value.
- A path to a file that does not exist, or cannot be read, is reported the same way — a warning in
  the `BBj` output channel, and no PREFIX directories loaded.
- Leaving the setting unset uses `{bbj.home}/cfg/config.bbx`.

**Workspace Trust:** the extension does not run in Restricted Mode — VS Code never gates it there.
Instead, a `bbj.configPath` set in a workspace's `.vscode/settings.json` is never used while that
workspace is untrusted; only the user-level (global) value is read. Trusting the workspace applies
its `bbj.configPath` immediately, with no reload needed.

#### `bbj.typeResolution.warnings`

Enable or disable type resolution warnings (CAST, USE, inheritance). Disable for heavily dynamic codebases where these warnings are noisy.

```json
{
  "bbj.typeResolution.warnings": true
}
```

**Default**: `true`

### Opening Programs

#### `bbj.decompile.promptOnOpen`

When opening a tokenized (binary) BBj program, prompt to decompile it to editable source
(replacing the file) or open a read-only decompiled copy. Detection is content-based (magic
bytes), so it works regardless of the file's extension — tokenized programs are often named
`.pub`, `.src`, or have no extension at all.

```json
{
  "bbj.decompile.promptOnOpen": true
}
```

**Default**: `true`

#### `bbj.denumber.promptOnOpen`

When opening a line-numbered BBj program, prompt to denumber it in the editor (the result is left
unsaved for you to review and save) or open it read-only. The buttons are `Denumber` and
`Open Read-only`.

```json
{
  "bbj.denumber.promptOnOpen": true
}
```

**Default**: `true`

### Diagnostics Settings

#### `bbj.diagnostics.suppressCascading`

Suppress cascading linking and validation noise when parse errors exist. When enabled, a single
syntax error shows only the actual error instead of 40+ downstream diagnostics.

```json
{
  "bbj.diagnostics.suppressCascading": true
}
```

**Default**: `true`

#### `bbj.diagnostics.maxErrors`

Maximum number of parse errors displayed at once (minimum `1`). Additional parse errors beyond
this limit are hidden to reduce noise.

```json
{
  "bbj.diagnostics.maxErrors": 20
}
```

**Default**: `20`

#### `bbj.compiler.trigger`

Controls when the BBj compiler checks the open file for errors: `debounced` (default), `on-save`,
or `off`. See [Live Compiler Diagnostics](./features.md#live-compiler-diagnostics) for what each
value does.

```json
{
  "bbj.compiler.trigger": "debounced"
}
```

**Default**: `debounced`

### Inlay Hints

#### `bbj.inlayHints.parameterNames.enabled`

Show parameter name inlay hints at call sites. `literals` (default) shows hints only for literal
arguments like `msgbox("Hi")`, `all` shows them for every argument, `none` disables them.

```json
{
  "bbj.inlayHints.parameterNames.enabled": "literals"
}
```

**Default**: `literals`

### Java Interop Settings

#### `bbj.interop.host`

Hostname for the Java interop service.

```json
{
  "bbj.interop.host": "localhost"
}
```

**Default**: `"localhost"`

Change this to connect to a remote Java interop instance.

#### `bbj.interop.port`

Port number for the Java interop service.

```json
{
  "bbj.interop.port": 5008
}
```

**Default**: `5008`

**Invalid values:** the host must be a non-empty string (surrounding spaces are trimmed); the port
must be a whole number from 1 to 65535 — a quoted value like `"5008"` is invalid. Each invalid
value falls back on its own to the default (`localhost` / `5008`), and the language server writes
one warning line per rejected value to the `BBj` output channel, of the form
`Ignoring invalid bbj.interop.host value "..."; using default localhost`. Leaving a setting unset
uses its default silently, with no warning.

### Formatter Settings

#### `bbj.formatter.indentWidth`

Number of spaces for indentation.

```json
{
  "bbj.formatter.indentWidth": 2
}
```

**Default**: `2`

#### `bbj.formatter.removeLineContinuation`

Remove line continuation characters when formatting.

```json
{
  "bbj.formatter.removeLineContinuation": true
}
```

**Default**: `false`

#### `bbj.formatter.keywordsToUppercase`

Convert BBj keywords to uppercase when formatting.

```json
{
  "bbj.formatter.keywordsToUppercase": true
}
```

**Default**: `false`

#### `bbj.formatter.splitSingleLineIF`

Split single-line IF statements into multiple lines.

```json
{
  "bbj.formatter.splitSingleLineIF": true
}
```

**Default**: `false`

#### `bbj.formatter.javaPath`

**Deprecated and no longer used.** Formatting now runs through the BBj language server and
BBjServices (BBj 26.03 or later), not through a local `java` executable, so this setting has no
effect. It was an absolute path to the `java` executable the formatter ran. This setting can only
be set in user settings; it cannot be set from a workspace `.vscode/settings.json` file.

```json
{
  "bbj.formatter.javaPath": "/opt/jdk-17/bin/java"
}
```

**Default**: `""` (look up java on PATH)

## Complete Settings Example

Here's a complete `settings.json` example with every setting except the `bbj.compiler.*` compile
options, which the **Configure Compile Options** command sets (see the note below):

```json
{
  "bbj.home": "/opt/bbj",
  "bbj.classpath": "bbj_default",
  "bbj.debug": false,
  "bbj.em.url": "http://localhost:8888",
  "bbj.web.apps": {},
  "bbj.web.AutoSaveUponRun": false,
  "bbj.decompile.promptOnOpen": true,
  "bbj.denumber.promptOnOpen": true,
  "bbj.configPath": null,
  "bbj.typeResolution.warnings": true,
  "bbj.diagnostics.suppressCascading": true,
  "bbj.diagnostics.maxErrors": 20,
  "bbj.compiler.trigger": "debounced",
  "bbj.inlayHints.parameterNames.enabled": "literals",
  "bbj.interop.host": "localhost",
  "bbj.interop.port": 5008,
  "bbj.formatter.indentWidth": 2,
  "bbj.formatter.removeLineContinuation": false,
  "bbj.formatter.keywordsToUppercase": false,
  "bbj.formatter.splitSingleLineIF": false,
  "bbj.formatter.javaPath": ""
}
```

**Note:** Compiler options (`bbj.compiler.*`) are configured through the "Configure Compile Options" command UI and are not typically set manually in settings.json.

## Workspace Configuration

For project-specific settings, create a `.vscode/settings.json` file in your workspace root:

```json
{
  "bbj.home": "/path/to/project/bbj",
  "bbj.classpath": "project-classpath"
}
```

Workspace settings override user settings, with two exceptions:
[`bbj.formatter.javaPath`](#bbjformatterjavapath) is machine-scoped, so VS Code only reads it from
user (or machine) settings, never from a workspace file; and a workspace-scoped
[`bbj.configPath`](#bbjconfigpath) is ignored entirely while the workspace is untrusted (see
Workspace Trust above).

## BBj Configuration Files

### config.bbx

The active BBj configuration file is the file [`bbj.configPath`](#bbjconfigpath) names, subject to
Workspace Trust, or `{bbj.home}/cfg/config.bbx` when that setting is not set.

Open it with the **BBj: Show the Active Config File** command.

### BBj.properties

The BBj properties file is located at:
- Linux/Mac: `$BBJ_HOME/cfg/BBj.properties`
- Windows: `%BBJ_HOME%\cfg\BBj.properties`

Access it using the **BBj: Show the BBj.properties file** command.

### project.properties

`project.properties` is an optional per-project file that lets you override the
classpath and PREFIX directories for a single workspace, without touching your
global BBj configuration or VS Code settings.

**Location:** the workspace root (the top-level folder you opened in VS Code). If
the file is not present, the extension falls back to the `bbj.classpath` setting
and the PREFIX defined in `config.bbx`.

**Format:** a standard Java properties file (`key=value`, one entry per line).
Only two keys are recognized; any other lines are ignored:

| Key | Description |
|-----|-------------|
| `classpath` | A delimiter-separated list of JAR files and/or directories used for Java class resolution. Entries are separated by `:` on Linux/macOS and `;` on Windows. A leading `~` expands to your home directory. When set, this **takes precedence over** the `bbj.classpath` setting. |
| `PREFIX` | A space-separated list of double-quoted directory paths that are treated as external library locations (the same meaning as the `PREFIX` line in `config.bbx`). A leading `~` in each path expands to your home directory. When set, this **overrides** the PREFIX read from `config.bbx`. |

**Example `project.properties`:**

```properties
classpath=~/BBJ/lib/*
PREFIX="~/BBJ/utils/" "~/BBJ/plugins/"
```

On Windows, use `;` to separate multiple classpath entries:

```properties
classpath=C:\BBJ\lib\myapp.jar;C:\BBJ\lib\vendor.jar
```

:::note
Changes to `project.properties` are picked up when the workspace is
initialized. Reload the window (**Developer: Reload Window**) after editing it
so the language server re-reads the classpath and PREFIX values.
:::

## Enterprise Manager Authentication

BUI and DWC run commands require authentication with Enterprise Manager.

**Login command:** Run **BBj: Login to Enterprise Manager** from the Command Palette. The username
prompt is pre-filled with the last username that logged in successfully — `admin` the first time.
Enter your EM password; on success the extension stores a JWT token in VS Code's SecretStorage and
remembers the username for next time. No credential is ever read from settings.

**Automatic re-prompt:** running a BUI or DWC program with no stored token shows "EM login
required. Login now?" and opens the login prompt for you. If the stored token is missing, expired,
revoked, or cannot be decoded, it is deleted and the prompt "EM token expired or invalid. Please
log in again." opens the login form automatically — you never have to run the login command by
hand first.

**Unusable tokens are rejected:** if Enterprise Manager itself returns a token that cannot be
decoded as an unexpired JWT, the login fails with an error and nothing is stored.

The stored token persists across VS Code restarts. No plaintext passwords are stored in settings.

**Integration Features:**
- Running BUI applications
- Running DWC applications
- Managing classpath entries
- Configuring applications

## Environment Variables

The extension respects the following environment variables:

| Variable | Description |
|----------|-------------|
| `BBJ_HOME` | BBj installation directory (fallback if `bbj.home` not set) |
| `JAVA_HOME` | Java installation directory |

## Java Interop Service

The Java interop service provides:
- Java class introspection
- Method signature resolution
- Field information
- Package structure

The service is managed by BBjServices and starts automatically when the extension activates. Configure the connection using `bbj.interop.host` and `bbj.interop.port` if you need to connect to a remote instance.

## Troubleshooting Configuration

### Verify BBj Home

Check that the configured `bbj.home` path is correct:

1. Open VS Code Settings
2. Search for "bbj.home"
3. Verify the path exists and contains BBj files

### Check Classpath

To see available classpath entries:

1. Run command: **BBj: Show Available Classpath Entries**
2. Verify your configured classpath is listed

### Language Server Logs

To diagnose issues with the language server:

1. Set `bbj.debug` to `true` in VS Code settings
2. Open the Output panel (`View` > `Output`)
3. Select "BBj" from the dropdown
4. Look for timestamped debug messages showing detailed diagnostics

Common debug output includes Java class resolution, parser warnings, and validation details. Set `bbj.debug` back to `false` when done to reduce output noise.
