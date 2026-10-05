# Phase 129: Windows run of the IntelliJ formatting evaluation

You run this once, in your usual Windows IntelliJ, with the evaluation build of the plugin. It takes about 20
minutes. The Linux runs are already recorded in `129-EVALUATION.md`; this run answers the questions only Windows
can answer (CRLF files, your IDE build, what you see on screen). At the end you return three files and the IDE
build line. Nothing here changes your BBj files outside the test copies named below.

The evaluation build is the committed plugin with the formatting switch turned on. It is the same zip that was
used on Linux. It is for this test only: install your usual plugin build again afterwards (last step).

## What you need

- Your Windows IntelliJ (the one with LSP4IJ 0.21.0 and the BBj plugin) and a BBjServices 26.03 or later that the
  plugin can reach (formatting needs it; with an older BBj the plugin shows a message and nothing is formatted).
- The evaluation zip from the remote workspace: `tmp/129-eval/bbj-intellij-eval.zip` (1044094 bytes).
- Optional test files, same folder tree: `tmp/129-eval/for-windows/crlf-test.bbj` (a BBj program with CRLF line
  endings), `tmp/129-eval/for-windows/stripped-program.bbj` (a real program with all indentation removed) and
  `tmp/129-eval/for-windows/numbered-test.bbj` (three line-numbered lines, for the extra steps at the end).
  In VS Code's Explorer: right-click the file, Download. If you prefer, create the CRLF file yourself in Notepad
  (Notepad writes CRLF by default).

## Step 0: IDE build and the zip

1. In IntelliJ: Help | About. Copy the build line (for example `IntelliJ IDEA 2026.2 ... Build #IU-262.xxxx`) into a
   text file called `ide-build.txt`.
2. Check the downloaded zip in PowerShell (use your own path):

   ```
   Get-FileHash <path-to>\bbj-intellij-eval.zip -Algorithm SHA256
   ```

   The hash must be exactly:

   ```
   ae214de390169bc955c05ce0c53075e644bbe242e7986c86c070e2721ef69626
   ```

   If it differs, stop and tell me; you have a different build from the one Linux evaluated.
3. Settings | Plugins | gear icon | Install Plugin from Disk, pick the zip, restart the IDE when asked.

## Step 1: trace and a clean log

1. Settings | Languages & Frameworks | Language Servers | BBj Language Server: set the trace to `verbose` (the
   dropdown is called Trace on the Debug tab in LSP4IJ 0.21.0; if yours is labelled differently, write the real
   label into `ide-build.txt` and use the verbose one). Apply.
2. Open a folder that has the test files (a scratch folder, not a project you care about). Wait until the status
   bar says the BBj server is ready.
3. Open View | Tool Windows | Language Servers (the LSP4IJ tool window), select the BBj Language Server, and keep its
   console visible. Every time a step below says "copy the console", select all in the console and append it to
   `lsp-trace.txt` (note the step name above each paste).

## The four cases

For each case: do the steps, watch for anything odd (a message balloon, a frozen window, a caret that jumps, a
file that changes when it should not), and write one line for each case in `notes.txt`: what you saw. Then copy
the console into `lsp-trace.txt`.

**W1: CRLF file, Reformat Code.**

1. Create `crlf-test.bbj` in Notepad (or use the downloaded one) with this content, no indentation:

   ```
   CLASS PUBLIC Demo
   METHOD PUBLIC String hello()
   print "hi"
   METHODRET "x"
   METHODEND
   CLASSEND
   ```

2. Open it in IntelliJ. The status bar (bottom right) must show `CRLF`.
3. Reformat Code (Ctrl+Alt+L). Expect the lines to be indented.
4. Save (Ctrl+S). The status bar must still show `CRLF`. In PowerShell this prints `True` for a file that still
   has CRLF line endings: `[IO.File]::ReadAllText("<path>").Contains("`r`n")`.
5. Note: did anything happen at all? (A CRLF file that silently does nothing is a blocker for the verdict.)

**W2: Reformat Code on a real program.**

1. Make a copy of one of your own BBj programs, or use `stripped-program.bbj`, with the indentation removed.
2. Open the copy, Reformat Code (Ctrl+Alt+L). Expect it to be re-indented (two spaces per level).
3. Press Ctrl+Z once. Expect the whole file to go back to the unindented text in that one step.

**W3: Reformat selection.**

1. In the same copy (reload it from disk first if needed), select three lines inside a METHOD body.
2. Reformat Code (Ctrl+Alt+L). Expect only those lines (and at most whole lines around them) to change.
3. Note any error balloon, and whether the caret or selection jumped.

**W4: Actions on Save.**

1. Settings | Tools | Actions on Save: tick "Reformat code" (leave "Whole file"; BBj included in the file types).
   Apply.
2. In the copy, remove the indentation of one line, then press Ctrl+S.
3. Expect the line to be indented again after the save. Note whether anything else changed.
4. Untick "Reformat code" again afterwards.

## Return the files

1. `idea.log`: Help | Show Log in Explorer, copy `idea.log` (and nothing else from that folder).
2. `lsp-trace.txt` (the console pastes) and `notes.txt` (your one-liners) and `ide-build.txt`.
3. Drag the four files into `tmp/129-eval/windows/` in the remote workspace (VS Code Explorer). They contain your
   Windows user name and paths; they stay out of git. I commit only redacted excerpts.

## Last step

Reinstall your usual plugin build (Settings | Plugins | gear | Install Plugin from Disk with your normal zip, or
the Marketplace version) and restart. Turn "Reformat code" on save back off if you had it off before.

## Extra steps from the Linux run

All seven Linux cases that a script could drive have a result; nothing is left as "not run". These steps are what a
script cannot do (clicking a message) or what only your IDE build can show (build 262 against the Linux build 242).
Do them after W1 to W4, same console, and write one line per step into `notes.txt` (E1, E2, ...). E1 to E3 matter for
the verdict; E4 and E5 are optional.

**E1: numbered-file message, click Denumber.**

1. Open `numbered-test.bbj` (or create a file in Notepad with exactly these three lines):

   ```
   0010 PRINT "A"
   0020 PRINT "B"
   0030 GOTO 0010
   ```

2. Reformat Code (Ctrl+Alt+L). Expect: the text does not change, and a balloon from the BBj Language Server says
   `This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in one step.`
   with two buttons, Denumber and Denumber and Format.
3. Click Denumber. Expect: the line numbers are removed (labels where a GOTO needs one), and one Ctrl+Z puts the numbers
   back in one step. Write down what you saw.

**E2: numbered-file message, click Denumber and Format.**

1. Reload `numbered-test.bbj` from disk with the numbers back (File | Reload All from Disk, or reopen it).
2. Reformat Code, click Denumber and Format in the balloon. Expect: the numbers are removed and the program is
   indented in one step, one Ctrl+Z restores the numbered text.

**E3: dismiss the numbered-file balloon.**

1. With the numbers back, Reformat Code again, but this time close the balloon with its X (or let it expire) instead of
   clicking a button.
2. Reformat Code a normal program again (for example the copy from W2). Expect: it still formats, the status bar still
   says the BBj server is ready, and no error balloon appears. This is the check that closing the open message request does not
   stop the server.

**E4 (optional): eolCharacter CRLF on your IDE build.** On Linux (IDE build 242) a language-server answer with
`\r\n` line breaks was refused by the IDE with a `Wrong line separators` error and nothing was formatted. To see whether
build 262 does the same: close the IDE, in `%APPDATA%\JetBrains\<your IDE folder>\options\BbjSettings.xml` add the line
`<option name="formatterEolCharacter" value="CRLF" />` inside the `com.basis.bbj.intellij.BbjSettings` component, start
the IDE, open `crlf-test.bbj` without indentation, Reformat Code, and note whether it indents, does nothing, or shows a
red error indicator or a message. Remove the line again afterwards (close the IDE first).

**E5 (optional): Actions on Save, changed lines only.** In a folder under Git version control (`git init` and commit
`stripped-program.bbj`), Settings | Tools | Actions on Save, tick Reformat code and choose "Only changed lines", then
remove the indentation of one line that is already indented, press Ctrl+S, and note whether only that line is
re-indented. Untick it again afterwards.
