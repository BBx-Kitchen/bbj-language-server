---
sidebar_position: 5
title: Commands
---

# IntelliJ Commands

The BBj Language Support plugin for IntelliJ IDEA provides commands for running, compiling, and managing BBj programs through keyboard shortcuts, context menus, and the Tools menu.

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

**Requires:** Enterprise Manager authentication — the run asks for a login by itself when none is
stored or the stored one is no longer valid. See [Configuration](./configuration.md#em-token-authentication)
for the full flow.

**Behavior:** Opens the program in your default browser via the configured EM URL.

### Run As DWC Program (Alt+D)

Runs the current BBj file as a DWC (Dynamic Web Client) application.

**Action ID:** `bbj.runDwc`

**Keyboard Shortcut:** `Alt+D`

**Access:**
- Press `Alt+D` in the editor
- Right-click in a BBj file editor → "Run As DWC Program"
- Right-click a BBj file in Project View → BBj Run → Run As DWC Program

**Requires:** Enterprise Manager authentication — the run asks for a login by itself when none is
stored or the stored one is no longer valid. See [Configuration](./configuration.md#em-token-authentication)
for the full flow.

**Behavior:** Opens the program in your default browser via the configured EM URL.

## Compile Command

### Compile BBj File (Alt+C)

Compiles the current BBj source file to bytecode.

**Action ID:** `bbj.compile`

**Keyboard Shortcut:** `Alt+C`

**Access:**
- Press `Alt+C` in the editor
- Right-click in a BBj file editor → "Compile BBj File" (listed after the run actions)
- `Tools > Compile BBj File`

**Available when:** A `.bbj`, `.bbx`, or `.src` file is open and the language server is in the
"Ready" state.

**Requires:** A [Compile output directory](./configuration.md#compile-output-directory)
configured in Settings — compiling without one reports that no compile output directory is
configured.

## Denumber Command

### Denumber BBj Program

Removes the line numbers from a line-numbered BBj program in the open editor.

**Action ID:** `bbj.denumber`

**Keyboard Shortcut:** none

**Access:**
- `Tools > Denumber BBj Program`
- Right-click in a BBj file editor → "Denumber BBj Program" (listed after "Compile BBj File")

**Available when:** The open BBj file looks line-numbered. The action is greyed out on any other
file.

**Requires:** BBj 26.03 or later and a running BBjServices.

The edit happens in the editor text and is left unsaved; one Undo restores the line numbers. A
line-numbered file also shows the banner `This is a line-numbered BBj program. Denumber it for editing.`
with a `Denumber` link, and problems found while denumbering go to the `BBj Language Server`
console. See [Denumber](./formatting.md#denumber) for the details.

## Decompile Tokenized Programs

A tokenized (binary) BBj program is a compiled program, for example the output of
[Compile BBj File](#compile-command). Its text cannot be read or edited. When you open one,
the editor shows the banner `This is a tokenized (binary) BBj program. Decompile it to editable source, or open a read-only copy.`
with two links. The banner is decided from the first bytes of the file itself, not from its name,
and it goes away as soon as the file holds source.

| Link | What it does |
|------|--------------|
| `Decompile & Replace` | Runs `bbjlst` from `<BBj Home>/bin`, replaces the tokenized file with its decompiled source, and reopens the file |
| `Open Read-only` | Runs `bbjlst` and opens a read-only `.bbj` copy of the source; the tokenized original is left untouched |

**Requires:** BBj Home set in Settings and `bbjlst` present in its `bin` folder. Both choices run
in the background with a progress entry.

Decompile returns the program as it was written: a line-numbered program stays line-numbered, with
its numeric `GOTO` and `GOSUB` targets intact, and an unnumbered program gets no numbers. A
numbered result shows the line-numbered banner, and [Denumber](./formatting.md#denumber) turns it
into labels.

**Good to know:**
- A symlinked program is decompiled at its target: the target file receives the source and the link
  stays a link.
- `Decompile & Replace` refuses a file that has unsaved changes in the editor. Save or revert them
  first.
- The banner appears only for files IntelliJ opens as BBj files (`.bbj`, `.bbjt`, `.src` and
  `.bbx`). A tokenized program named `.pub`, or without an extension, shows no banner.
- Tokenized programs are not sent to the language server, so they show no diagnostics.

When a choice cannot be carried out, one `Decompile failed` balloon names the cause:

| Cause | Text |
|-------|------|
| BBj Home is empty | `BBj Home is not configured. Set it in Settings > Languages & Frameworks > BBj.` |
| No `bbjlst` | `bbjlst was not found in <BBj Home>/bin.` |
| The file holds source already | `"<file name>" is not a tokenized BBj program, so there is nothing to decompile.` |
| The file is gone | `"<file name>" was not found, so there is nothing to decompile.` |
| Not an ordinary file | `"<file name>" is not a regular file, so there is nothing to decompile.` |
| The file cannot be read | `Could not read "<file name>": <cause>` |
| Unsaved editor changes | `"<file name>" has unsaved changes in the editor. Save or revert them first.` |
| `bbjlst` wrote no listing | `bbjlst wrote no decompiled listing for "<file name>".` |
| `bbjlst` wrote an empty listing | `bbjlst wrote an empty listing for "<file name>".` |
| `bbjlst` left the program tokenized | `bbjlst did not decompile "<file name>"; the listing is still a tokenized program.` |

## Composer Actions

Visual dialogs for composing or editing `MSGBOX`, `addWindow`, `addChildWindow`, `CVS()`, and
`SETOPTS` calls are available from the editor context menu, Alt+Enter intentions, and Code Vision
cues — see [Composers](./composers.md) for the full list and how assign-to validation works.

## Tools Menu Commands

The following commands are available in the Tools menu. `Tools > Compile BBj File` is also here —
see [Compile Command](#compile-command) above for its full description. So is
`Tools > Denumber BBj Program` — see [Denumber Command](#denumber-command).

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

Authenticates with BBj Enterprise Manager and stores the JWT token. This command lets you log in
ahead of time, or as a different user — running a program as BUI or DWC prompts for this same
login automatically when it is needed (see below).

**Action ID:** `bbj.loginEM`

**Access:** `Tools > Login to Enterprise Manager`

**Usage:**
1. Select `Tools > Login to Enterprise Manager`
2. Enter your Enterprise Manager username and password in the dialog — the username field is
   pre-filled with the last username that logged in successfully (`admin` the first time)
3. Plugin stores the JWT token securely in IntelliJ's PasswordSafe; the username is remembered
   for next time only after a successful login, and the password is never remembered
4. Token is used automatically for subsequent BUI/DWC run commands

**Required for:** Running BUI and DWC programs. The stored token persists across IDE restarts.

**Automatic re-prompt:** Running a program as BUI or DWC asks for this same login by itself when
needed. With no stored token it asks "EM login required for BUI. Login now?" (or DWC). With a
token that has expired locally, or one Enterprise Manager no longer accepts, it deletes the token
and asks "EM token expired or invalid. Login again?". Answering No either time stops the run and
logs the reason in the BBj Language Server tool window.

**Configuration:** See [EM URL configuration](./configuration.md#em-url) to configure the Enterprise Manager URL.

## Keyboard Shortcuts Summary

| Command | Shortcut | Description |
|---------|----------|-------------|
| Run As BBj Program | `Alt+G` | Run as GUI (desktop) application |
| Run As BUI Program | `Alt+B` | Run as BUI web application |
| Run As DWC Program | `Alt+D` | Run as DWC web application |
| Compile BBj File | `Alt+C` | Compile current BBj file |

**Note:** Shortcuts use the default keymap. Custom keymaps may differ. You can customize shortcuts in `Settings > Keymap` → search "BBj".

## Context Menus

### Editor Context Menu

Right-click in a BBj file editor to access run actions at the top of the menu, followed by Compile
and the [composer actions](./composers.md):
- Run As BBj Program
- Run As BUI Program
- Run As DWC Program
- Compile BBj File
- Denumber BBj Program
- Compose MSGBOX…, Compose addWindow…, Compose addChildWindow…, Compose CVS()…, Configure SETOPTS
  Options in Code…, Compose SETOPTS… — see [Composers](./composers.md)

### Project View Context Menu

Right-click a BBj file in the Project tool window to see the "BBj Run" submenu containing:
- Run As BBj Program
- Run As BUI Program
- Run As DWC Program

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
5. **For formatting and Denumber:** BBj 26.03 or later and a running BBjServices — they run inside it

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
2. The run asks for a login by itself when no token is stored, or the stored one has expired or
   is no longer accepted — answer Yes to log in. Answering No stops the run; the reason is logged
   in the BBj Language Server tool window.
3. Check the EM URL in `Settings > Languages & Frameworks > BBj > EM URL`
4. Log in ahead of time with `Tools > Login to Enterprise Manager` if you want to authenticate
   before running, or to switch users

### Compile Command Not Working

If Compile BBj File does not appear or does not run:
1. Verify BBj Home is configured
2. Check that a `.bbj`, `.bbx`, or `.src` file is open in the editor
3. Ensure the language server is running (check status bar widget shows "Ready")
4. Configure a [Compile output directory](./configuration.md#compile-output-directory) in Settings

### Formatting or Denumber Does Nothing

If Reformat Code or Denumber BBj Program changes nothing:
- Check that BBjServices is running and that it is BBj 26.03 or later
- Read the `BBj Language Server` balloon and look its text up in [the message tables](./formatting.md#messages)
- Denumber is greyed out on files that do not look line-numbered

### Decompile Does Nothing

If `Decompile & Replace` or `Open Read-only` on a tokenized program shows a `Decompile failed`
balloon or no result:
1. Verify BBj Home is configured and that `bbjlst` exists in its `bin` folder
2. Save or revert unsaved changes in the editor — `Decompile & Replace` refuses them
3. Look the balloon text up in [the cause table](#decompile-tokenized-programs)
4. If no banner appears at all, the file is not opened as a BBj file (a `.pub` file or one without
   an extension is not)
