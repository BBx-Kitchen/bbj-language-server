## Formatting and Denumber now run in BBjServices

**Warning: the first format of an existing file can produce a large diff.** Formatting now runs in BBjServices, and its
output differs from the formatter that earlier versions of the VS Code extension used. Commit your files before you
format them for the first time, and keep a whole-project format in a commit of its own so the changes are easy to
review and to revert.

Who is affected:

- **VS Code users** get different formatted output; the table below lists what changes and which setting brings the old
  style back where one exists.
- **IntelliJ users** get formatting for the first time: Reformat Code for a file or a selection, and Actions on Save.
  Nothing changes in how your files were formatted before, because they were not formatted.

## What changes in formatted output

The first three rows are what you will notice on the first format.

| Visibility | Change | Setting |
|------------|--------|---------|
| High | **Labels no longer change indentation.** Code after a label stays at the enclosing level. The old output drifted one level deeper after every label, so long GOTO and label chains ended up far to the right. | `indentLabelBlocks` indents a subroutine body between a label and its RETURN. The old unbounded drift has no setting. |
| High | **No automatic blank lines.** The old formatter inserted blank lines around labels, block IFs and class headers. Now every blank line in the output is one you wrote, and every one of those survives. | `collapseMultiLine` collapses runs of blank lines to one, `blankLineAfterReturn` puts one after a subroutine's RETURN. The old insertion has no setting. |
| High | **IF closers.** A closer the formatter adds when it splits a single-line IF is now `FI`, in the case of the IF (it was `ENDIF`). A closer followed by `; rem`, such as `endif; rem done`, is now recognised, so the rest of the file is no longer indented one level too deep. Closers already in the file are kept as written, as before. | `ifClosingKeyword` and `ifKeywordCase` are new; set `ifClosingKeyword` to `ENDIF` to get `ENDIF` for added closers again. |
| Medium | **Line endings are kept.** A CRLF file stays CRLF; the old formatter wrote LF. | `eolCharacter` (`KEEP`, `LF`, `CRLF`) |
| Medium | The final newline of a file is written once. | none |
| Medium | Lines that contain only whitespace become empty lines, and no line keeps trailing whitespace. | none |
| Medium | A bare `::path::Reference` line gets one blank line before it, so BBj does not read it as a continuation. | none |
| Medium | The formatter does not add an automatic `FNEND` line. | none |
| Medium | A `;` chain after an `ERR=*NEXT` or `*SAME` target is never split, and a single-line IF is left alone when splitting it would cross such a target. | none |
| Low | Upper-casing keywords leaves comments and method, class and variable names alone. | `keywordsToUppercase` |
| Low | Crash fixes: the formatter handles a block IF without THEN and deeply nested parentheses, and no longer crashes on a block IF when the old `--single-line-if` option was on (tracked under #507). | none |
| Low | There is no `removeWhitespace` setting: it never had an effect, and this extension never offered it. | none |
| New | Format Selection, eleven new settings (listed under Settings below), and no Java process is started for each format. | see Settings |

`indentWidth` still defaults to 2, as before. Closers already in a file were kept by the old formatter as well; the closer
differences are the ones in the IF closers row.

## Before and after

The same unindented sample program went through the old formatter and through this release, with the extension's default
settings (and `splitSingleLineIf` on where it says so).

### Labels

Old formatter: code after each label drifts one level deeper, blank lines appear around the labels and the IFs, and the
closer `endif; rem done` is not recognised, so the second IF and everything after it stays one level too deep.

```bbj
class public Demo

  method public void run()
    print "start"
    goto one

    one:
      print "one"
      goto two

    two:
      print "two"
      goto three

    three:
      print "three"

      if a=1 then
        print "x"
        endif; rem done

        if a=2 then
          print "y"
        FI
  methodend

classend
```

This release: code after a label stays at the enclosing level, no blank line is added, and the closer followed by
`; rem` is recognised.

```bbj
class public Demo
  method public void run()
    print "start"
    goto one
    one:
    print "one"
    goto two
    two:
    print "two"
    goto three
    three:
    print "three"
    if a=1 then
      print "x"
    endif; rem done
    if a=2 then
      print "y"
    FI
  methodend
classend
```

### Blank lines

Old formatter: one blank line was written in the sample, before `first:`; the old output has three, the other two
inserted after the `declare` line and before `return`.

```bbj
declare BBjString name$

name$ = "x"
gosub first
release

first:
if name$="x" then
  print "yes"
fi

return
```

This release: only the blank line that was written remains.

```bbj
declare BBjString name$
name$ = "x"
gosub first
release

first:
if name$="x" then
  print "yes"
fi
return
```

### IF closers

The sample is a single-line `if a=1 then print "x"` with `splitSingleLineIf` on. Old formatter: the closer added when
the IF is split is `endif`.

```bbj
if a=1 then
  print "x"
endif
```

This release: the added closer is `fi`.

```bbj
if a=1 then
  print "x"
fi
```

This release with `ifClosingKeyword` set to `ENDIF`: the old closer again.

```bbj
if a=1 then
  print "x"
endif
```

## Denumber

Denumber now runs through BBjServices, like formatting. What changes:

- It edits the text of the open editor and leaves it **unsaved** for you to review. One Undo restores the line-numbered
  text; the file on disk is no longer rewritten.
- Line numbers that other statements refer to become labels: `GOSUB 0100` becomes `GOSUB L100`.
- In VS Code the button on the open-file prompt for a line-numbered program is now `Denumber` (it was `Denumber & Replace`),
  and Denumber messages appear in the Problems view.
- IntelliJ gains a Denumber BBj Program action (Tools menu and editor context menu) and a banner on line-numbered
  programs, with its messages in the BBj Language Server console.
- Decompile is unchanged: it still uses bbjlst and needs neither BBjServices nor BBj 26.03.

## Requirements

- BBj 26.03 or later and a running BBjServices, for formatting and Denumber in both IDEs.
- There is no offline formatting, and formatting no longer needs a local Java.
- With an older BBj, formatting shows the message `BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it.`

## Settings

VS Code:

- `bbj.formatter.javaPath` is removed. A leftover value in your settings is ignored.
- `bbj.formatter.splitSingleLineIF` is renamed `bbj.formatter.splitSingleLineIf`. The extension moves an existing value
  to the new name when it starts.
- Eleven new settings: `indentCharacter`, `indentLabelBlocks`, `ifClosingKeyword`, `ifKeywordCase`,
  `splitInlineComments`, `splitInlineLabelComment`, `collapseMultiLine`, `blankLineAfterReturn`, `parameterLayout`,
  `operatorSpacing` and `eolCharacter`.
- `indentWidth` still defaults to 2; its value is now checked to be between 0 and 16.
- A changed setting applies on the next format.

IntelliJ: a Formatter section with all 15 settings on Settings, Languages & Frameworks, BBj. Changes apply after the
language server restarts; Apply restarts it. Format on save is IntelliJ's own Actions on Save, Reformat code; there is
no BBj-specific switch.

## Known issues in IntelliJ

- Line ending `CRLF` stops formatting entirely, with no message ([lsp4ij #381](https://github.com/redhat-developer/lsp4ij/issues/381)).
  Leave the setting at `KEEP`.
- Actions on Save writes the file twice: first the text you typed, then the formatted text. Nothing is lost.

## Guides

- VS Code: https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/formatting
- IntelliJ: https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/formatting
