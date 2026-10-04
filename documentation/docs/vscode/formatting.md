---
sidebar_position: 7
title: Formatting
---

# Formatting and Denumber

:::info
Formatting and Denumber need BBj 26.03 or later and a running BBjServices. The BBj formatter runs inside BBjServices, so without it nothing is formatted or denumbered. There is no offline formatting, and no local Java is involved.
:::

The BBj language server formats BBj program files. Config files and tokenized programs are never formatted.

## Format Document

Run **Format Document** from the Command Palette or the editor context menu, or bind it to a key of your own. The whole file is formatted as one edit, so a single Undo restores the previous text. Nothing is written to disk until you save, and a successful format shows no message.

A file with line numbers cannot be formatted as it is. Nothing is changed, and the language server offers two buttons instead: `Denumber` and `Denumber and Format`. See [Denumber](#denumber) below, and the [Formatting messages](#formatting-messages) table for the exact text.

## Format Selection

**Format Selection** formats only the statements you select. The selection is widened to whole statements and whole lines, and only those lines change. On a file with line numbers a selection cannot be formatted, and the selection message from the [Formatting messages](#formatting-messages) table appears.

## Format on Save

Format on save is VS Code's own `editor.formatOnSave` setting. To turn it on for BBj files only, add this to your settings:

```json
{
  "[bbj]": {
    "editor.formatOnSave": true
  }
}
```

There is no BBj-specific switch. On a file with line numbers, every save shows the Denumber offer again and the file is saved unformatted.

## Denumber

Run **Denumber BBj Program** with `Alt+N`, from the Command Palette, the editor context menu, the editor title bar, or the Explorer context menu. It removes the line numbers from the text in the open editor, through BBjServices. A line number that a statement refers to becomes a label. For example, this program:

```bbj
0010 PRINT "Hello"
0020 GOSUB 0100
0030 END
0100 PRINT "Sub"
0110 RETURN
```

becomes:

```bbj
PRINT "Hello"
GOSUB L100
END
L100: PRINT "Sub"
RETURN
```

The result is left unsaved. Review it and save to keep it; one Undo restores the line numbers. Denumber never writes the file itself.

Problems that the denumbering reports appear in the Problems view, with the source `BBj Denumber`, and in the `BBj` output channel. The `Show` button on the message opens the Problems view.

When you format a file with line numbers, the `Denumber and Format` button does both in one step, as one edit with one Undo.

Opening a line-numbered program shows the prompt `"<file name>" is a line-numbered BBj program. Denumber it for editing, or open it read-only?` with the buttons `Denumber` and `Open Read-only`. It appears once per file and session, unless `bbj.denumber.promptOnOpen` is off. The prompt only appears for a file whose first non-blank lines are all numbered, at least three of them, so a two-line sample triggers no prompt.

## Settings

The 15 `bbj.formatter.*` settings control how the formatter lays out your code. They apply on the next format, without a reload, and are listed in [Formatter Settings](./configuration.md#formatter-settings).

## Messages

### Formatting messages

| Message | Meaning | What to do |
|---------|---------|------------|
| `BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it.` | The connected BBjServices is older than BBj 26.03 and has no formatter. Shown once per connection. | Upgrade BBj to 26.03 or later. |
| `BBj formatting timed out. The file was not changed; try again.` | The format did not finish in time. | Try again. |
| `This file is too large for BBj formatting. The file was not changed.` | The file is over the size limit for formatting. | Split the file, or format it by hand. |
| `This BBj program is protected and cannot be formatted.` | The program is protected, so its source cannot be formatted. | Format the unprotected source instead. |
| `The BBj formatter could not process this file. The file was not changed. See the BBj output for details.` | The formatter failed or gave an unusable answer. | Open the `BBj` output channel for details. |
| `The BBj formatting service is not available right now. The file was not changed; try again later.` | The formatting service in BBjServices cannot be reached at the moment. | Check that BBjServices is running, then try again. |
| `Invalid BBj formatter settings:` followed by the problems, for example `bbj.formatter.indentWidth: must be between 0 and 16, was 99` | One or more formatter settings hold a value the formatter rejects. Up to five problems are listed, then `and N more`. The file was not changed. The button `Open Settings` opens the Settings UI filtered to `bbj.formatter`. | Click `Open Settings` and correct the listed settings. |
| `This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in one step.` | The file is a line-numbered program. Shown on every Format Document and on every format on save, with the buttons `Denumber` and `Denumber and Format`. | Click `Denumber and Format`, or `Denumber` and format afterwards. |
| `Formatting a selection needs a file without line numbers. Denumber the file first.` | Format Selection was run on a file with line numbers. The button `Denumber` is offered. | Click `Denumber`, then format the selection again. |
| No message of its own | BBjServices is not running, so the file stays unchanged. A Java interop connection error such as `Failed to connect to the Java interop service.` may appear. | Start BBjServices and format again. |

### Denumber messages

| Message | Meaning | What to do |
|---------|---------|------------|
| `Denumbered.` | The line numbers were removed in the editor. The file is not saved. | Review the result and save it. |
| `Denumbered.` followed by counts, for example `Denumbered. 2 errors, 1 warning.` | The line numbers were removed, and the denumbering reported problems. Counts of errors, warnings and notes are shown, zero counts are left out. The message is a warning when there is any error. The button `Show` opens the Problems view. | Click `Show` and check the reported lines. |
| `This file has no line numbers. Nothing to denumber.` | The file has no line numbers, so nothing changed. | Nothing. |
| `Denumbered and formatted.` | `Denumber and Format` removed the line numbers and formatted the file in one edit. | Review the result and save it. |
| `This file has no line numbers. It was formatted.` | `Denumber and Format` was used on a file without line numbers, so it was only formatted. | Nothing. |
| `Mixed line numbering at line 3. The file was not changed.` (the line number varies) | Some lines have line numbers and others do not. The message names the line without a number, and the button `Go to Line` jumps to it. Without a line number the text is `Mixed line numbering in this file. The file was not changed.` | Number every line or none, then run Denumber again. |
| `BBjServices is not reachable. The file was not changed.` | The language server cannot connect to BBjServices. | Start BBjServices and run Denumber again. |
| `Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it.` | The connected BBjServices is older than BBj 26.03. | Upgrade BBj to 26.03 or later. |
| `Denumbering timed out. The file was not changed; try again.` | The denumbering did not finish in time. | Try again. |
| `This file is too large to denumber. The file was not changed.` | The file is over the size limit. | Split the file, or denumber it by other means. |
| `This BBj program is protected and cannot be denumbered.` | The program is protected, so its source cannot be changed. | Denumber the unprotected source instead. |
| `Denumbering failed. The file was not changed. If it contains characters BBj cannot represent, remove them and try again.` | BBj could not read the text of the file. | Remove the characters BBj cannot represent and try again. |
| `Denumbering failed. The file was not changed. See the BBj output for details.` | The denumbering failed for another reason. | Open the `BBj` output channel for details. |
| `The BBj denumbering service is not available right now. The file was not changed; try again later.` | The denumbering service in BBjServices cannot be reached at the moment. | Check that BBjServices is running, then try again. |
| `This is a tokenized BBj program, not source text. Decompile it first, then denumber the source.` | The file is a compiled program, not source text. | Decompile it first, then denumber the source. |
| `Open the BBj file in the editor first; denumbering works on the open editor text.` | The file is not open in an editor. | Open the file in the editor and run Denumber again. |
| `The file changed while it was being denumbered. Nothing was changed; run Denumber again.` | You edited the file while the denumbering was running. | Run Denumber again. |
| `The editor did not accept the denumbered text. Nothing was changed; run Denumber again.` | The editor refused the change. | Run Denumber again. |
| `Denumbering is already running for this file.` | A denumbering of this file is still in progress. | Wait for it to finish. |
| `No active BBj file. Open or select a BBj file and try again.` | The command was run with no BBj file to work on. This message comes from the extension. | Open or select a BBj file and run the command again. |
| `Denumber failed:` followed by the error text | The request was rejected, or the file could not be opened. This message comes from the extension. | Read the error text; check that BBjServices is running. |

Formatting problems during `Denumber and Format` use the texts from the formatting messages table, including the invalid settings message with its `Open Settings` button.

## Changes from the old formatter

Formatting now runs in BBjServices, and its output differs from the formatter that earlier versions of this extension used. The first format of an existing file can change many lines, so commit your files before you format them for the first time. The full list of differences is in the release notes on [GitHub Releases](https://github.com/BBx-Kitchen/bbj-language-server/releases).
