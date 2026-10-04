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

A file with line numbers cannot be formatted as it is. Nothing is changed, and a `BBj Language Server` balloon offers two buttons instead: `Denumber` and `Denumber and Format`. See the [Formatting messages](#formatting-messages) table for the exact text.

## Reformat a selection

Select the statements you want to format, then choose **Code > Reformat Code**. The selection is widened to whole statements and whole lines, and only those lines change. On a file with line numbers a selection cannot be formatted, and the selection message from the [Formatting messages](#formatting-messages) table appears.

## Format on Save

Format on save is IntelliJ's own Actions on Save feature:

1. Open **Settings**.
2. Go to **Tools > Actions on Save**.
3. Turn on **Reformat code**. Both the whole-file and the changed-lines choice work with BBj files.
4. Click **OK**.

There is no BBj-specific format-on-save switch, and the BBj settings page points here. IntelliJ saves the text you typed, formats it, and saves a second time, so nothing is lost. On a file with line numbers each save shows the Denumber offer again.

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

## Changes from the old formatter

IntelliJ formats BBj files for the first time, so the first format of an existing file can change many lines. Commit your files before you format them for the first time. If your team also uses VS Code, its output differs from the formatter that earlier VS Code versions used. The full list of differences is in the release notes on [GitHub Releases](https://github.com/BBx-Kitchen/bbj-language-server/releases).
