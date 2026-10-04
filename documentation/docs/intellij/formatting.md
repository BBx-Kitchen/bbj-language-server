---
sidebar_position: 7
title: Formatting
---

# Formatting and Denumber

:::info
Formatting and Denumber need BBj 26.03 or later and a running BBjServices. The BBj formatter runs inside BBjServices, so without it nothing is formatted or denumbered. There is no offline formatting, and no local Java is involved.
:::

Formatting BBj files is supported in IntelliJ: for the whole file, for a selection, and on save. The BBj language server does the work, so the result is the same as in VS Code. Config files and tokenized programs are never formatted.

## Reformat Code

Choose **Code > Reformat Code**, or use **Reformat Code** in the editor context menu. The whole file is formatted as one edit, so a single Undo restores the previous text. Nothing is written to disk until you save, and a successful format shows no message.

A file with line numbers cannot be formatted as it is. Nothing is changed, and a `BBj Language Server` balloon offers two buttons instead: `Denumber` and `Denumber and Format`. See [Denumber](#denumber) below, and the [Formatting messages](#formatting-messages) table for the exact text.

## Reformat a selection

Select the statements you want to format, then choose **Code > Reformat Code**. The selection is widened to whole statements and whole lines, and only those lines change. On a file with line numbers a selection cannot be formatted, and the selection message from the [Formatting messages](#formatting-messages) table appears.

## Format on Save

Format on save is IntelliJ's own Actions on Save feature:

1. Open **Settings**.
2. Go to **Tools > Actions on Save**.
3. Turn on **Reformat code**. Both the whole-file and the changed-lines choice work with BBj files.
4. Click **OK**.

There is no BBj-specific format-on-save switch, and the BBj settings page points here. IntelliJ saves the text you typed, formats it, and saves a second time, so nothing is lost. On a file with line numbers each save shows the Denumber offer again.

## Denumber

Choose **Tools > Denumber BBj Program**, or use **Denumber BBj Program** in the editor context menu, where it sits after Compile BBj File. The action has no keyboard shortcut. It is shown on BBj program files and enabled only when the file looks line-numbered: all of the first 20 non-blank lines are numbered, and there are at least three of them. On any other file it is greyed out, so a two-line sample never enables it.

A line-numbered file also shows a banner at the top of the editor: `This is a line-numbered BBj program. Denumber it for editing.` Its `Denumber` link runs the same action. The banner disappears after the edit and comes back after Undo.

Denumber removes the line numbers from the text in the open editor, through BBjServices. A line number that a statement refers to becomes a label. For example, this program:

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

Problems that the denumbering reports are written to the `BBj Language Server` console. The `Show` button in the result balloon reveals the console.

When you reformat a file with line numbers, the `Denumber and Format` button in the offer does both in one step, as one edit with one Undo.

## Formatter settings

The formatter settings are on **Settings > Languages & Frameworks > BBj**, in the section **Formatter**. These settings apply after the language server restarts. Apply restarts it automatically.

| Control | Values | Default | Description |
|---------|--------|---------|-------------|
| Indent width | 0 to 16 | 2 | Number of indent characters per block level, from 0 to 16. |
| Indent character | `SPACE`, `TAB` | `SPACE` | Character used for indentation: spaces or tab characters. |
| Indent label blocks | on or off | off | Indent the statements between a subroutine label and its closing RETURN by one level. |
| Keywords in upper case | on or off | off | Write BBj keywords in upper case. This wins over the IF keyword case setting. |
| IF closing keyword | `KEEP`, `FI`, `ENDIF` | `KEEP` | Keyword that closes a block IF. `KEEP` leaves every existing FI or ENDIF as written, and a closer the formatter adds uses FI. `FI` closes every block IF with FI. `ENDIF` closes every block IF with ENDIF. |
| IF keyword case | `KEEP`, `MATCH_IF`, `LOWER_CASE`, `UPPER_CASE` | `KEEP` | Case of ELSE, FI and ENDIF. `KEEP` leaves existing keywords as written, and added ones copy the case of their IF. `MATCH_IF` copies the case of the opening IF. `LOWER_CASE` and `UPPER_CASE` force that case. Upper-casing all keywords always wins. |
| Split single-line IF | on or off | off | Split a single-line IF statement across several lines. |
| Remove line continuation | on or off | off | Remove line-continuation characters. |
| Move in-line comments to their own line | on or off | off | Move in-line comments onto their own line. |
| Move label comments to their own line | on or off | off | Move a label's in-line comment onto its own line. |
| Collapse blank lines | on or off | off | Collapse consecutive blank lines into one. |
| Blank line after RETURN | on or off | off | Put exactly one blank line after a subroutine's closing RETURN. |
| Parameter layout | `KEEP_INITIAL_LAYOUT`, `NO_BLANK`, `BEFORE_COMMA`, `AFTER_COMMA`, `BEFORE_AND_AFTER_COMMA` | `KEEP_INITIAL_LAYOUT` | Spacing around the commas between method parameters. `KEEP_INITIAL_LAYOUT` keeps the spacing as written. `NO_BLANK` puts no blank around the commas. `BEFORE_COMMA` puts one blank before each comma, `AFTER_COMMA` one blank after each comma, and `BEFORE_AND_AFTER_COMMA` one blank before and after each comma. |
| Operator spacing | `KEEP`, `SPACED` | `KEEP` | Spacing around binary operators. `KEEP` keeps the spacing as written. `SPACED` puts exactly one blank on each side; unary signs, exponents, strings and comments stay as written. |
| Line ending | `KEEP`, `LF`, `CRLF` | `KEEP` | Line ending of the formatted file. `KEEP` uses the file's most frequent line ending. `LF` and `CRLF` force that line ending. |

:::warning
In IntelliJ, Line ending CRLF stops formatting entirely: the IDE refuses the formatter's edit and the file stays unchanged, without a message (an LSP4IJ limitation, [lsp4ij issue #381](https://github.com/redhat-developer/lsp4ij/issues/381)); LF does not change a file's line endings either, so leave it at KEEP.
:::

## Messages

Messages appear as `BBj Language Server` balloons. Each message is quoted as the language server writes it.

### Formatting messages

| Message | Meaning | What to do |
|---------|---------|------------|
| `BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it.` | The connected BBjServices is older than BBj 26.03 and has no formatter. Shown once per connection. | Upgrade BBj to 26.03 or later. |
| `BBj formatting timed out. The file was not changed; try again.` | The format did not finish in time. | Try again. |
| `This file is too large for BBj formatting. The file was not changed.` | The file is over the size limit for formatting. | Split the file, or format it by hand. |
| `This BBj program is protected and cannot be formatted.` | The program is protected, so its source cannot be formatted. | Format the unprotected source instead. |
| `The BBj formatter could not process this file. The file was not changed. See the BBj output for details.` | The formatter failed or gave an unusable answer. | Open the `BBj Language Server` console for details. |
| `The BBj formatting service is not available right now. The file was not changed; try again later.` | The formatting service in BBjServices cannot be reached at the moment. | Check that BBjServices is running, then try again. |
| `Invalid BBj formatter settings:` followed by the problems | A formatter setting holds a value the formatter rejects. The file was not changed. The button `Open Settings` opens the BBj settings page. The IntelliJ controls only offer valid values, so this message is rare in IntelliJ. | Click `Open Settings` and correct the listed settings. |
| `This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in one step.` | The file is a line-numbered program. Shown on every Reformat Code and on every save with Reformat code turned on, with the buttons `Denumber` and `Denumber and Format`. | Click `Denumber and Format`, or `Denumber` and format afterwards. |
| `Formatting a selection needs a file without line numbers. Denumber the file first.` | Reformat Code was run on a selection in a file with line numbers. The button `Denumber` is offered. | Click `Denumber`, then format the selection again. |
| No message of its own | BBjServices is not running, so the file stays unchanged. A Java interop connection error such as `Failed to connect to the Java interop service.` may appear. | Start BBjServices and format again. |

### Denumber messages

| Message | Meaning | What to do |
|---------|---------|------------|
| `Denumbered.` | The line numbers were removed in the editor. The file is not saved. | Review the result and save it. |
| `Denumbered.` followed by counts, for example `Denumbered. 2 errors, 1 warning.` | The line numbers were removed, and the denumbering reported problems. Counts of errors, warnings and notes are shown, zero counts are left out. The balloon is a warning when there is any error. The button `Show` reveals the `BBj Language Server` console. | Click `Show` and check the reported lines. |
| `This file has no line numbers. Nothing to denumber.` | The file has no line numbers, so nothing changed. IntelliJ greys the action out on files that do not look line-numbered, so this message is rare there. | Nothing. |
| `Denumbered and formatted.` | `Denumber and Format` removed the line numbers and formatted the file in one edit. | Review the result and save it. |
| `This file has no line numbers. It was formatted.` | `Denumber and Format` was used on a file without line numbers, so it was only formatted. | Nothing. |
| `Mixed line numbering at line 3. The file was not changed.` (the line number varies) | Some lines have line numbers and others do not. The message names the line without a number, and the button `Go to Line` jumps to it. Without a line number the text is `Mixed line numbering in this file. The file was not changed.` The action is enabled only when the first 20 non-blank lines are all numbered, so a file mixed earlier than that reaches this message through the `Denumber` button of the Reformat Code offer. | Number every line or none, then run Denumber again. |
| `BBjServices is not reachable. The file was not changed.` | The language server cannot connect to BBjServices. | Start BBjServices and run Denumber again. |
| `Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it.` | The connected BBjServices is older than BBj 26.03. | Upgrade BBj to 26.03 or later. |
| `Denumbering timed out. The file was not changed; try again.` | The denumbering did not finish in time. | Try again. |
| `This file is too large to denumber. The file was not changed.` | The file is over the size limit. | Split the file, or denumber it by other means. |
| `This BBj program is protected and cannot be denumbered.` | The program is protected, so its source cannot be changed. | Denumber the unprotected source instead. |
| `Denumbering failed. The file was not changed. If it contains characters BBj cannot represent, remove them and try again.` | BBj could not read the text of the file. | Remove the characters BBj cannot represent and try again. |
| `Denumbering failed. The file was not changed. See the BBj output for details.` | The denumbering failed for another reason. | Open the `BBj Language Server` console for details. |
| `The BBj denumbering service is not available right now. The file was not changed; try again later.` | The denumbering service in BBjServices cannot be reached at the moment. | Check that BBjServices is running, then try again. |
| `This is a tokenized BBj program, not source text. Decompile it first, then denumber the source.` | The file is a compiled program, not source text. | Decompile it first, then denumber the source. |
| `Open the BBj file in the editor first; denumbering works on the open editor text.` | The file is not open in an editor. | Open the file in the editor and run Denumber again. |
| `The file changed while it was being denumbered. Nothing was changed; run Denumber again.` | You edited the file while the denumbering was running. | Run Denumber again. |
| `The editor did not accept the denumbered text. Nothing was changed; run Denumber again.` | The editor refused the change. | Run Denumber again. |
| `Denumbering is already running for this file.` | A denumbering of this file is still in progress. | Wait for it to finish. |

Formatting problems during `Denumber and Format` use the texts from the formatting messages table, including the invalid settings message with its `Open Settings` button.

One failure is specific to IntelliJ. When the request cannot be sent or answered, the notification group `BBj Language Server` shows an error titled `Denumber failed`. Its body is one of:

| Body | Meaning | What to do |
|------|---------|------------|
| `the BBj language server is not running` | The language server is not started. | Start or restart the language server and try again. |
| `no answer from the BBj language server within 60 seconds` | The language server did not answer in time. | Restart the language server and try again. |
| `interrupted` | The denumbering was interrupted. | Try again. |
| `the BBj language server was stopped or restarted` | The language server was stopped or restarted while the request was running. | Wait until it is ready, then try again. |

Any other error shows its own message as the body.

## Changes from the old formatter

IntelliJ formats BBj files for the first time, so the first format of an existing file can change many lines. Commit your files before you format them for the first time. If your team also uses VS Code, its output differs from the formatter that earlier VS Code versions used. The full list of differences is in the release notes on [GitHub Releases](https://github.com/BBx-Kitchen/bbj-language-server/releases).
