---
sidebar_position: 5
title: Commands
---

# VS Code Commands

The BBj Language Server extension provides several commands accessible via keyboard shortcuts, the
Command Palette, or context menus. In the Command Palette, BBj-category commands show with a
"BBj:" prefix in front of their title; **Denumber BBj Program** has no category and appears by its
title alone.

## Run Commands

These commands execute BBj programs in different modes.

All three run commands start BBj with the workspace folder that contains the program as the working directory, or with the program's own folder when it lies outside every workspace folder. BUI and DWC register the web app with that working directory. The language server resolves relative `use ::path::Class` references and RUN/CALL program names the same way BBj does: the working directory first, then each PREFIX directory. A program in `subdir/` therefore refers to a file next to it as `::subdir/OtherClass.bbj::`, and `::OtherClass.bbj::` is flagged.

### Run As BBj Program (`Alt+G`)

Runs the current BBj program in GUI (Graphical User Interface) mode.

**Command ID:** `bbj.run`

**Usage:**
- Open a `.bbj` file
- Press `Alt+G` or right-click and select "Run As BBj Program"

### Run As BUI Program (`Alt+B`)

Runs the current BBj program as a BUI (Browser User Interface) web application.

**Command ID:** `bbj.runBUI`

**Usage:**
- Open a `.bbj` file
- Press `Alt+B` or right-click and select "Run As BUI Program"

**Note:** requires Enterprise Manager authentication. With no valid token stored, running this
command prompts for login automatically — see
[Login to Enterprise Manager](#login-to-enterprise-manager) below.

### Run As DWC Program (`Alt+D`)

Runs the current BBj program as a DWC (Dynamic Web Client) application.

**Command ID:** `bbj.runDWC`

**Usage:**
- Open a `.bbj` file
- Press `Alt+D` or right-click and select "Run As DWC Program"

**Note:** requires Enterprise Manager authentication, prompted automatically like
Run As BUI Program above.

## Build Commands

### Compile BBj Program (`Alt+C`)

Compiles the current BBj source file by running `bbjcpl` from `{bbj.home}/bin`, with the options
set through [Configure Compile Options](#configure-compile-options) below.

**Command ID:** `bbj.compile`

**Usage:**
- Open a `.bbj` file
- Press `Alt+C` or right-click and select "Compile BBj Program"

**Output:** Creates a compiled `.bbj` file (tokenized format).

### Denumber BBj Program (`Alt+N`)

Removes the line numbers from a BBj program in the open editor, through BBjServices (BBj 26.03 or
later). The result is left unsaved for you to review and save, and one Undo restores the line
numbers. Line numbers that a statement refers to become labels, and problems found while
denumbering appear in the Problems view. See [Denumber](./formatting.md#denumber) for the details.

**Command ID:** `bbj.denumber`

**Usage:**
- Open a `.bbj` file with line numbers
- Press `Alt+N` or right-click and select "Denumber BBj Program"

**Before:**
```bbj
0010 PRINT "Hello"
0020 GOSUB 0100
0030 END
0100 PRINT "Sub"
0110 RETURN
```

**After:**
```bbj
PRINT "Hello"
GOSUB L100
END
L100: PRINT "Sub"
RETURN
```

Opening a line-numbered program offers the same choice automatically (the buttons `Denumber` and
`Open Read-only`) unless `bbj.denumber.promptOnOpen` is off — see
[Opening Programs](./configuration.md#opening-programs) in the Configuration guide.

## Decompile Commands

Tokenized (binary) BBj programs can be converted to editable source with `bbjlst`. Both commands
are in the Command Palette and in the Explorer context menu (group `BBj`) for files, for `.bbj`
files and for the names tokenized programs usually carry: `.pub`, `.src` and no extension. They
have no keybinding. A tokenized file does not open in a text editor, so the Explorer is the way to
reach the commands when the prompt on open was dismissed.

Decompile returns the program as it was written: a line-numbered program stays line-numbered, with
its numeric `GOTO` and `GOSUB` targets intact, and an unnumbered program gets no numbers. Use
[Denumber](./formatting.md#denumber) afterwards to turn a numbered result into labels.

### Decompile Tokenized BBj Program (Replace)

Runs `bbjlst` and replaces the tokenized file on disk with its decompiled source.

**Command ID:** `bbj.decompile`

### Decompile Tokenized BBj Program (Read-only)

Runs `bbjlst` and opens a read-only decompiled copy, leaving the original binary file untouched.

**Command ID:** `bbj.decompileReadonly`

`bbjlst` writes into a private temporary folder, so no listing file is left next to the program
and no other file is overwritten; the Replace command changes only the program itself. A symlinked program is decompiled
at its target: the target receives the source and the link stays a link.

When a command cannot decompile, it reports the cause:

| Message | Meaning |
|---------|---------|
| `"<file name>" is not a tokenized BBj program, so there is nothing to decompile.` | The file holds source already; `bbjlst` is not started. |
| `"<file name>" was not found, so there is nothing to decompile.` | The path no longer exists. |
| `"<file name>" is not a regular file, so there is nothing to decompile.` | The path is a directory or another kind of file. |
| `Could not read "<file name>": <cause>` | The file cannot be read at all, for example for lack of permission. |
| `bbjlst wrote no decompiled listing for "<file name>".` | `bbjlst` finished without producing a listing. |
| `bbjlst wrote an empty listing for "<file name>".` | The listing is empty. |
| `bbjlst did not decompile "<file name>"; the listing is still a tokenized program.` | The listing still starts like a compiled program. |
| `bbjlst did not finish writing the listing for "<file name>".` | The listing was still growing when the wait ran out. |

Opening a tokenized program offers the same two choices automatically, unless
`bbj.decompile.promptOnOpen` is off — see
[Opening Programs](./configuration.md#opening-programs) in the Configuration guide.

## Configuration Commands

### Show the Active Config File

Opens the active BBj configuration file: the file `bbj.configPath` names (subject to Workspace
Trust — see [`bbj.configPath`](./configuration.md#bbjconfigpath)), or `{bbj.home}/cfg/config.bbx`
when that setting is not set. Shows an error when no config file is configured, or the resolved
file does not exist.

**Command ID:** `bbj.config`

### Show the BBj.properties file

Opens the BBj properties file in the editor.

**Command ID:** `bbj.properties`

**Location:**
- Linux/Mac: `$BBJ_HOME/cfg/BBj.properties`
- Windows: `%BBJ_HOME%\cfg\BBj.properties`

### Open Enterprise Manager

Opens the BBj Enterprise Manager web interface in your default browser. The URL is built from
`com.basis.jetty.host` and `com.basis.jetty.port` in `{bbj.home}/cfg/BBj.properties`
(`http://<host>:<port>/bbjem/em`).

**Command ID:** `bbj.em`

### Show Available Classpath Entries

Displays available classpath entries configured in BBj Enterprise Manager.

**Command ID:** `bbj.showClasspathEntries`

**Usage:** Useful for verifying which classpath entries are available for Java class resolution.

### Login to Enterprise Manager

Same login flow as the
[configuration page](./configuration.md#enterprise-manager-authentication): the username prompt
is pre-filled with the last username that logged in successfully, and a login that returns an
unusable token is rejected with nothing stored.

**Command ID:** `bbj.loginEM`

**Usage:**
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "BBj: Login to Enterprise Manager"
3. Enter your Enterprise Manager username and password
4. Token is stored securely in VS Code's SecretStorage

**Required for:** Running BUI and DWC programs. Token persists across VS Code restarts. See
[Enterprise Manager Authentication](./configuration.md#enterprise-manager-authentication) for the
full flow, including the automatic re-prompt on a missing or expired token.

### Refresh Java Classes

Reloads the Java classpath and clears cached class information.

**Command ID:** `bbj.refreshJavaClasses`

**Usage:** Run from the Command Palette when Java classes are not appearing in code completion, or
after classpath changes in Enterprise Manager.

### Configure Compile Options

Opens a QuickPick to select BBj compiler options (type checking, line numbering, output settings,
content protection, and diagnostics), then asks whether to save them to workspace or user
settings.

**Command ID:** `bbj.configureCompileOptions`

**Usage:** Run from the Command Palette to configure compiler flags before compiling.

## Composer Commands

Visual editors that write or edit a `MSGBOX`, `addWindow`, `addChildWindow`, `CVS()` or `SETOPTS`
call for you — see the [Composers](./composers.md) page for every command, cue and lightbulb
action.

## Keyboard Shortcuts Summary

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Run As BBj Program | `Alt+G` | `Alt+G` |
| Run As BUI Program | `Alt+B` | `Alt+B` |
| Run As DWC Program | `Alt+D` | `Alt+D` |
| Compile BBj Program | `Alt+C` | `Alt+C` |
| Denumber BBj Program | `Alt+N` | `Alt+N` |

## Command Palette

All commands are available via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- Type "BBj" to see all BBj commands
- Select the desired command

## Context Menus

### Editor Context Menu

Right-click in a BBj file editor (not for `.bbjt` files) to access:
- Run As BBj Program
- Run As BUI Program
- Run As DWC Program
- Compile BBj Program
- Denumber BBj Program
- The [composer commands](./composers.md) (Compose MSGBOX, Compose MSGBOX (visual), Compose
  addWindow (visual), Compose addChildWindow (visual), Compose SETOPTS in code (visual), Compose
  CVS() (visual))

### Explorer Context Menu

Right-click on a `.bbj` file in the Explorer to access the same five commands.

### Editor Title Bar

Run, compile and denumber buttons appear in the editor title bar when editing BBj files.

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
3. **Formatting and Denumber** run through the BBj language server and BBjServices (BBj 26.03 or
   later). Compiling and running programs do not need Java: they run BBj's own `bbjcpl` and `bbj`
   executables from `{bbj.home}/bin`.
4. **Enterprise Manager** is accessible and authenticated (for BUI/DWC commands — see
   [Login to Enterprise Manager](#login-to-enterprise-manager) above)

## Troubleshooting

### Commands Not Working

1. Verify `bbj.home` setting points to a valid BBj installation
2. Check BBjServices is running
3. Look for errors in the Output panel (select the `BBj` channel)

### Formatting or Denumber Does Nothing

- BBjServices must be running and be BBj 26.03 or later
- Read the message that appears and look it up in [the message tables](./formatting.md#messages)
- A file with line numbers is denumbered before it can be formatted

### Run Commands Fail

1. Ensure BBjServices is started
2. Verify program file has no syntax errors
3. Check BBj configuration files

### BUI/DWC Commands Fail

If BUI or DWC run commands fail:
1. Verify Enterprise Manager is accessible at the configured EM URL
2. The commands prompt for login automatically when no valid token is stored — see
   [Enterprise Manager Authentication](./configuration.md#enterprise-manager-authentication)

### Compile Issues

Compiling runs `bbjcpl` from `{bbj.home}/bin`, not Java:
1. Verify `bbj.home` points to a valid BBj installation with `bin/bbjcpl` present
2. Check file permissions
3. Ensure the source file is saved
