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

A file with line numbers cannot be formatted as it is. Nothing is changed, and the language server offers two buttons instead: `Denumber` and `Denumber and Format`. The offer is described in the [Formatting messages](#formatting-messages) table below.

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

## Changes from the old formatter

Formatting now runs in BBjServices, and its output differs from the formatter that earlier versions of this extension used. The first format of an existing file can change many lines, so commit your files before you format them for the first time. The full list of differences is in the release notes on [GitHub Releases](https://github.com/BBx-Kitchen/bbj-language-server/releases).
