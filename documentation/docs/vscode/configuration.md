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
3. Select "BBj Language Server" from the dropdown
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

Path to a custom `config.bbx` file. When not set, defaults to `{bbj.home}/cfg/config.bbx`.

```json
{
  "bbj.configPath": "/path/to/custom/config.bbx"
}
```

**Default**: `null` (uses `{bbj.home}/cfg/config.bbx`)

Set this when your `config.bbx` is in a non-standard location. Used for PREFIX directory resolution.

#### `bbj.typeResolution.warnings`

Enable or disable type resolution warnings (CAST, USE, inheritance). Disable for heavily dynamic codebases where these warnings are noisy.

```json
{
  "bbj.typeResolution.warnings": true
}
```

**Default**: `true`

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

## Complete Settings Example

Here's a complete `settings.json` example with all BBj settings:

```json
{
  "bbj.home": "/opt/bbj",
  "bbj.classpath": "bbj_default",
  "bbj.debug": false,
  "bbj.em.url": "http://localhost:8888",
  "bbj.configPath": null,
  "bbj.typeResolution.warnings": true,
  "bbj.interop.host": "localhost",
  "bbj.interop.port": 5008,
  "bbj.web.AutoSaveUponRun": true,
  "bbj.formatter.indentWidth": 4,
  "bbj.formatter.removeLineContinuation": false,
  "bbj.formatter.keywordsToUppercase": true,
  "bbj.formatter.splitSingleLineIF": false
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

Workspace settings override user settings for the specific project.

## BBj Configuration Files

### config.bbx

The BBj configuration file (`config.bbx`) is located at:
- Linux/Mac: `$BBJ_HOME/cfg/config.bbx`
- Windows: `%BBJ_HOME%\cfg\config.bbx`

Access it quickly using the **BBj: Show config.bbx** command.

### BBj.properties

The BBj properties file is located at:
- Linux/Mac: `$BBJ_HOME/cfg/BBj.properties`
- Windows: `%BBJ_HOME%\cfg\BBj.properties`

Access it using the **BBj: Show BBj.properties** command.

## Enterprise Manager Authentication

BUI and DWC run commands require authentication with Enterprise Manager.

**Authentication Flow:**
1. Run `BBj: Login to Enterprise Manager` from the Command Palette
2. Enter your EM username and password in the dialog
3. The extension stores the JWT token securely in VS Code's SecretStorage
4. Token is used automatically for subsequent BUI/DWC runs
5. Re-authenticate if the token expires

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

1. Run command: **BBj: Show Classpath Entries**
2. Verify your configured classpath is listed

### Language Server Logs

To diagnose issues with the language server:

1. Set `bbj.debug` to `true` in VS Code settings
2. Open the Output panel (`View` > `Output`)
3. Select "BBj Language Server" from the dropdown
4. Look for timestamped debug messages showing detailed diagnostics

Common debug output includes Java class resolution, parser warnings, and validation details. Set `bbj.debug` back to `false` when done to reduce output noise.
