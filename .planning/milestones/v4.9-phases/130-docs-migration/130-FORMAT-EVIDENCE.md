# Format evidence: old jar versus bbj-ls formatProgram

Captured 2026-10-04 from real runs. Every program and output block below was written into this file by a script
that reads the input and output files unchanged; nothing was typed or tidied by hand.

- **Old engine:** `BBjCFCli.jar` with `lib/BBjCodeFomatter.jar` and `lib/jcommander-1.71.jar`, extracted from git
  history at `06c81df9^` (`bbj-vscode/tools/formatter/`), run on Temurin Java 25 with the arguments the extension
  used: `-p -i FILE -w 2` (plus `--single-line-if` where the case says so), the document on stdin.
- **New engine:** bbj-ls `formatProgram` on `127.0.0.1:5008`, called through the language server's own client
  (`createBBjServices`, `JavaInteropService.formatProgram`) with `normalizeFormatterSettings`, so the extension
  defaults apply (`indentWidth` 2, every other setting at its default) unless the case names a setting.
- `$W` is the untracked scratch directory next to this file. The scratch script `$W/newfmt.mts`:

```ts
import * as fs from 'node:fs';
const BV = '/home/coder/repos/bbj-language-server/bbj-vscode';
const { createBBjServices } = await import(`${BV}/src/language/bbj-module.ts`);
const { NodeFileSystem } = await import(`${BV}/node_modules/langium/lib/node/index.js`);
const { normalizeFormatterSettings } = await import(`${BV}/src/language/bbj-format-settings.ts`);
const text = fs.readFileSync(process.argv[2], 'utf8');
const outPath = process.argv[3];
const interop = createBBjServices(NodeFileSystem).BBj.java.JavaInteropService;
interop.setConnectionConfig('127.0.0.1', 5008);
const outcome = await interop.formatProgram({ text, version: 'evidence-1',
    settings: normalizeFormatterSettings(JSON.parse(process.env.FMT_SETTINGS ?? '{}')) });
if (outcome.kind === 'ok' && outcome.result.scope === 'document') {
    fs.writeFileSync(outPath, outcome.result.text);
    process.exit(0);
}
console.error('outcome', JSON.stringify(outcome));
process.exit(1);
```

Inputs are six small self-written programs; each ends with a newline.

### E1 Labels and a closer followed by ; rem

Input:

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

Commands:

```bash
/opt/java/default/bin/java -jar $W/oldfmt/BBjCFCli.jar -p -i $W/e1-labels.bbj -w 2 < $W/e1-labels.bbj > $W/e1-old.txt 2> $W/e1-old.err
cd /home/coder/repos/bbj-language-server/bbj-vscode && ./node_modules/.bin/tsx $W/newfmt.mts $W/e1-labels.bbj $W/e1-new.txt
```

Old formatter output:

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

New formatter output (extension defaults):

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

What differs: the old output indents one level deeper after every label (`one:`, `two:`, `three:`), inserts seven blank
lines (after the class header, before each label, before both block IFs and before `classend`) and does not recognise
`endif; rem done` as a closer, so `if a=2 then` and everything after it stays one level too deep. The new output keeps
the code after a label at the enclosing level, inserts no blank line and closes the first IF at its own level. Compared
with the research capture of the same program: the old and new outputs are identical to it, except that the research
text placed the old blank line before `methodend`; in this live run it sits before `classend` (after `methodend`).

### E2 Blank lines

Input:

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

Commands:

```bash
/opt/java/default/bin/java -jar $W/oldfmt/BBjCFCli.jar -p -i $W/e2-blanklines.bbj -w 2 < $W/e2-blanklines.bbj > $W/e2-old.txt 2> $W/e2-old.err
cd /home/coder/repos/bbj-language-server/bbj-vscode && ./node_modules/.bin/tsx $W/newfmt.mts $W/e2-blanklines.bbj $W/e2-new.txt
```

Old formatter output:

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

New formatter output (extension defaults):

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

What differs: the input has one blank line, written before `first:`. The old output keeps it and adds two more (after
the `declare` line and between `fi` and `return`), three in all. The new output has exactly the one blank line the
author wrote. This is a smaller program than the `demo.bbj` of the research capture, so the old inserted blank lines
sit at different places than that capture lists (after `declare` and before `return` here, no blank around the IF);
the behaviour shown is the same, the formatter inserts blank lines the author did not write and the new one does not.
The note therefore says "inserts blank lines" without naming exact positions.

### E3 A closer added by splitting a single-line IF

Input:

```bbj
if a=1 then print "x"
```

Commands:

```bash
/opt/java/default/bin/java -jar $W/oldfmt/BBjCFCli.jar -p -i $W/e3-splitif.bbj -w 2 --single-line-if < $W/e3-splitif.bbj > $W/e3-old.txt 2> $W/e3-old.err
cd /home/coder/repos/bbj-language-server/bbj-vscode && FMT_SETTINGS='{"splitSingleLineIf":true}' ./node_modules/.bin/tsx $W/newfmt.mts $W/e3-splitif.bbj $W/e3-new.txt
cd /home/coder/repos/bbj-language-server/bbj-vscode && FMT_SETTINGS='{"splitSingleLineIf":true,"ifClosingKeyword":"ENDIF"}' ./node_modules/.bin/tsx $W/newfmt.mts $W/e3-splitif.bbj $W/e3-new-endif.txt
```

Old formatter output (`--single-line-if`):

```bbj
if a=1 then
  print "x"
endif
```

New formatter output (`splitSingleLineIf` on):

```bbj
if a=1 then
  print "x"
fi
```

New formatter output (`splitSingleLineIf` on, `ifClosingKeyword` `ENDIF`):

```bbj
if a=1 then
  print "x"
endif
```

What differs: with the single-line IF split, the old jar closes the new block with `endif`; the new formatter closes
it with `fi` by default, and with `ifClosingKeyword` set to `ENDIF` it writes `endif` again. This matches the
research capture.

### E4 Line endings

Input, `od -c` (every line ends with CR LF):

```text
0000000   f   o   r       i   =   0       t   o       1  \r  \n   p   r
0000020   i   n   t       i  \r  \n   n   e   x   t  \r  \n
0000035
```

Commands:

```bash
/opt/java/default/bin/java -jar $W/oldfmt/BBjCFCli.jar -p -i $W/e4-crlf.bbj -w 2 < $W/e4-crlf.bbj > $W/e4-old.raw 2> $W/e4-old.err
cd /home/coder/repos/bbj-language-server/bbj-vscode && ./node_modules/.bin/tsx $W/newfmt.mts $W/e4-crlf.bbj $W/e4-new.raw
od -c $W/e4-crlf.bbj > $W/e4-crlf.od.txt
od -c $W/e4-old.raw > $W/e4-old.od.txt
od -c $W/e4-new.raw > $W/e4-new.od.txt
```

Old formatter output, `od -c`:

```text
0000000   f   o   r       i   =   0       t   o       1  \n           p
0000020   r   i   n   t       i  \n   n   e   x   t  \n
0000034
```

New formatter output, `od -c`:

```text
0000000   f   o   r       i   =   0       t   o       1  \r  \n        
0000020   p   r   i   n   t       i  \r  \n   n   e   x   t  \r  \n
0000037
```

What differs: the input uses CR LF (`\r  \n` in the dump). The old output has only LF (`\n`), no `\r`. The new
output keeps CR LF on every line (`eolCharacter` defaults to `KEEP`). This matches the research capture.

### E5 The single-line-if crash

Input:

```bbj
if (a=1)
x=1
endif
```

Commands:

```bash
/opt/java/default/bin/java -jar $W/oldfmt/BBjCFCli.jar -p -i $W/e5-crash.bbj -w 2 --single-line-if < $W/e5-crash.bbj > $W/e5-old.txt 2>&1
cd /home/coder/repos/bbj-language-server/bbj-vscode && FMT_SETTINGS='{"splitSingleLineIf":true}' ./node_modules/.bin/tsx $W/newfmt.mts $W/e5-crash.bbj $W/e5-new.txt
```

Old formatter output (stdout and stderr together; exit status 1):

```text
Exception in thread "main" java.lang.StringIndexOutOfBoundsException: Index 18 out of bounds for length 18
	at java.base/jdk.internal.util.Preconditions$1.apply(Preconditions.java:55)
	at java.base/jdk.internal.util.Preconditions$1.apply(Preconditions.java:52)
	at java.base/jdk.internal.util.Preconditions$4.apply(Preconditions.java:213)
	at java.base/jdk.internal.util.Preconditions$4.apply(Preconditions.java:210)
	at java.base/jdk.internal.util.Preconditions.outOfBounds(Preconditions.java:98)
	at java.base/jdk.internal.util.Preconditions.outOfBoundsCheckIndex(Preconditions.java:106)
	at java.base/jdk.internal.util.Preconditions.checkIndex(Preconditions.java:302)
	at java.base/java.lang.String.checkIndex(String.java:4904)
	at java.base/java.lang.StringLatin1.charAt(StringLatin1.java:45)
	at java.base/java.lang.String.charAt(String.java:1624)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeSplitter.isSplitablePosition(BBjCodeSplitter.java:490)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeSplitter.splitMultiLineIF(BBjCodeSplitter.java:236)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeSplitter.splitLines(BBjCodeSplitter.java:128)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeSplitter.split(BBjCodeSplitter.java:39)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeFormatter.splitCode(BBjCodeFormatter.java:328)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeFormatter.formatBBjCode(BBjCodeFormatter.java:76)
	at com.basis.bbjutilities.bbjcodeformatter.internal.BBjCodeFormatter.formatBBjCode(BBjCodeFormatter.java:222)
	at BBjCFCli.BBjCFCli.run(BBjCFCli.java:118)
	at BBjCFCli.BBjCFCli.main(BBjCFCli.java:67)
```

New formatter output (`splitSingleLineIf` on):

```bbj
if (a=1)
  x=1
endif
```

What differs: with `--single-line-if`, the old jar dies with `java.lang.StringIndexOutOfBoundsException: Index 18 out
of bounds for length 18` raised in `BBjCodeSplitter.isSplitablePosition` and writes no formatted text. The new
formatter returns the program formatted, with the existing `endif` kept. This matches the research capture.

### E6 Closers already in the file

Input:

```bbj
if a=1 then
print "a"
endif
if b=1 then
print "b"
ENDIF
if c=1 then
print "c"
fi
```

Commands:

```bash
/opt/java/default/bin/java -jar $W/oldfmt/BBjCFCli.jar -p -i $W/e6-closers.bbj -w 2 < $W/e6-closers.bbj > $W/e6-old.txt 2> $W/e6-old.err
cd /home/coder/repos/bbj-language-server/bbj-vscode && ./node_modules/.bin/tsx $W/newfmt.mts $W/e6-closers.bbj $W/e6-new.txt
```

Old formatter output:

```bbj
if a=1 then
  print "a"
endif

if b=1 then
  print "b"
ENDIF

if c=1 then
  print "c"
fi
```

New formatter output (extension defaults):

```bbj
if a=1 then
  print "a"
endif
if b=1 then
  print "b"
ENDIF
if c=1 then
  print "c"
fi
```

What differs: the old jar kept all three closers as written (`endif`, `ENDIF`, `fi`); its only visible change here is
two blank lines it inserted before the second and third IF. The new formatter with the default `ifClosingKeyword` and
`ifKeywordCase` (`KEEP`) also keeps all three closers as written. So the migration note must not say the old
formatter changed closers that were already in a file; the closer differences are the ones in E1 and E3.
