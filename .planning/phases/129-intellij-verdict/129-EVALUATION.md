---
record: lsp4ij-formatting-evaluation
lsp4ij: 0.21.0
ide_linux: "IntelliJ IDEA 2024.2, Build #IC-242.20224.300, Gradle runIde sandbox, JBR 21.0.3 (from idea.log)"
ide_windows: pending
eval_zip_sha256: ae214de390169bc955c05ce0c53075e644bbe242e7986c86c070e2721ef69626
bbj_ls_jar: "/opt/bbx/.lib/bbjls/bbj-ls.jar, 305339 bytes, 2026-10-02 00:37 UTC (BBjServices 26.03 on localhost:5008)"
driver: script
session_start: 2026-10-04T08:18:00Z
---

# Phase 129 evaluation record: LSP4IJ 0.21.0 formatting for BBj

This record measures what a "supported" verdict would ship. Every runtime sequence below is copied from the
`idea.log` or the wire capture of the session it describes; a row without such evidence says `not run` with the
reason. Raw logs, wire captures and screenshots stay under the git-excluded `tmp/129-eval/linux/<case>/`.

## Setup

### Builds (from the committed tree)

| Step | Command | Outcome |
|------|---------|---------|
| language server | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build` | exit 0 (`tsc -b` then esbuild) |
| VSIX | `/usr/local/bin/bbj-ext-install` | packaged `/tmp/bbj-lang.vsix` (34 files, 672.02 KB); "Extension 'bbj-lang.vsix' was successfully installed." |
| IntelliJ zip, committed | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew cleanTest buildPlugin --offline --console=plain` | exit 0, `BUILD SUCCESSFUL`; whole suite summed from `build/test-results/test/TEST-*.xml`: tests=1286 failures=0 errors=0 |
| IntelliJ zip, evaluation | `./gradlew buildPlugin -x test --offline --console=plain` after the one-line switch flip below | exit 0; tests skipped only because the switch fence tests assert the committed `false` |

Committed zip (`tmp/129-eval/bbj-intellij-committed.zip`, 1044049 bytes, sha256
`8caf96f0d694f6ab017b89c98afd2fdaa69f5ecc45514c6611bae2df4af3167b`): its `lib/language-server/main.cjs` is
byte-identical to `bbj-vscode/out/language/main.cjs` (`cmp` silent, sha256
`8ac74e768ebfb2ff3467ccfe6ae250151d1d766df4c9eec51897482177b7a4c5`); `javap -v -p` on
`BbjLanguageServerFactory` prints `ConstantValue: int 0` for `LSP_FORMATTING_ENABLED`.

### Evaluation build (switch on, local and uncommitted)

With the switch off there is no LSP formatting to evaluate, so the evaluation zip is the committed tree plus this
one working-tree line. It is never staged or committed (`git diff` of the file, verbatim):

```diff
--- a/bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
+++ b/bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
@@ -33,7 +33,7 @@ public final class BbjLanguageServerFactory implements LanguageServerFactory {
      * language server does not advertise it. Setting the switch to {@code true} restores
      * LSP4IJ's own behaviour unchanged.
      */
-    private static final boolean LSP_FORMATTING_ENABLED = false;
+    private static final boolean LSP_FORMATTING_ENABLED = true;
```

Evaluation zip (`tmp/129-eval/bbj-intellij-eval.zip`, 1044094 bytes, sha256
`ae214de390169bc955c05ce0c53075e644bbe242e7986c86c070e2721ef69626`): `main.cjs` byte-identical to
`bbj-vscode/out/language/main.cjs`; `ConstantValue: int 1`; the jar carries `FormatterInitOptions.class` and
`FormatterInitOptions$Values.class`. HEAD's factory still declares the switch `false`
(`git show HEAD:...BbjLanguageServerFactory.java` has one `private static final boolean LSP_FORMATTING_ENABLED = false;`).

### Sandbox equivalence

The sandbox plugin jar (`plugins_runIde/bbj-intellij/lib/bbj-intellij-0.1.0.jar`) is byte-identical to the jar inside
the evaluation zip (sha256 `e9243dcb40de288726b31094ec3719e4bcd4e613cd141c0061e092ea2affe61a` for both), so every
`BbjLanguageServerFactory*.class` hash matches:

```
207118e6bbc03e29ea29454b19787d11e57ce1f3e994550c8b2e9a51aa5aa4dd  BbjLanguageServerFactory$1.class
41d81b98189a4629a10471d95d9ca94c8da39b501898fee1b237cb720415c2b6  BbjLanguageServerFactory$2.class
283c1f85d792d0ef7cb84ff6d60fdf0b778eec3f2c20eb2d4938a74f67801c92  BbjLanguageServerFactory$3.class
2eef31f10cb18d82df013444c14153e0cd197fd92d9b8288db818c60a5fbdcb1  BbjLanguageServerFactory.class
```

The jar's embedded `language-server/main.cjs` is byte-identical to `bbj-vscode/out/language/main.cjs`. One difference
from the zip: the `runIde` sandbox plugin folder holds only the jar (no `lib/language-server/`, `lib/textmate/` or
`lib/tools/`), so the server is the jar's embedded copy, extracted to `/tmp/bbj-language-server-*.cjs` at launch (the
launch line below shows it). The zip install on Windows uses `lib/language-server/main.cjs`, same bytes.

### Driver and the route that passed

The container has no display (`DISPLAY` empty), so "headful" cannot be literal. The runs use `xvfb-run -a -s
"-screen 0 1600x1000x24"` around Gradle `runIde`. Route 1, the IDE's bundled `performanceTesting` script plugin,
passed its spike on the first try: `-Dtestscript.filename=<script>` runs `%openFile`, `%waitForSmart`, `%sleep`,
`%executeEditorAction ReformatCode`, `%takeScreenshot` and `%saveDocumentsAndSettings` inside the sandbox; the real
editor action formatted the file. Routes 2 (Robot) and 3 (user) were not needed for the cases driven by script;
`driver: script`.

Final JVM arguments added to `runIde` by `tmp/129-eval/runide-eval.init.gradle` (`allprojects` init script, set only on
the task named `runIde`):

```
-Dtestscript.filename=<value of env BBJ_EVAL_SCRIPT>
-Didea.trust.all.projects=true
-Dide.show.tips.on.startup.default.value=false
-Djb.privacy.policy.text=<!--999.999-->
-Djb.consents.confirmation.enabled=false
-Dide.no.platform.update=true
-Dnosplash=true
-DjbScreenMenuBar.enabled=false
```

No modal dialog blocked startup with this list.

Three facts that differ from what the plan assumed, found by running it:

- The `runIde` task uses suffixed sandbox folders, not the ones the plan names: `config_runIde/`, `log_runIde/`,
  `plugins_runIde/`, `system_runIde/` under `bbj-intellij/.intellijPlatform/sandbox/bbj-intellij/IC-2024.2/`. The
  seeded settings and the evidence log therefore live there (`log_runIde/idea.log`).
- `runIde` cannot run with `--offline`: it resolves `org.jetbrains.compose.hot-reload:hot-reload-agent:1.1.0-alpha03`
  (`No cached version available for offline mode`). It was run online; the builds above stayed offline.
- The IDE's virtual file system keeps its own copy of a file it has seen. A corpus file that was overwritten outside
  the IDE between two sessions opened with the previous session's content (the first Reformat Code then answered
  `[]` because the buffer was already formatted; that session is kept as `tmp/129-eval/linux/aside/c1-stale-vfs/`
  and is not used as evidence). Every case therefore uses a corpus file name the IDE has never seen.
- A file created while no IDE was running is not always known to the IDE's virtual file system when the script runs
  `%openFile`: with a freshly created `c2b.bbj` and then `c2b-cont.bbj` the command failed with `File not found`
  (`%reloadFiles` and `%waitForInitialRefresh` did not help; those sessions are kept under `tmp/129-eval/linux/aside/`).
  Running the editor action `Synchronize` (File, Reload All from Disk) first fixed it, so every later script starts
  with `%waitForSmart`, `%sleep 3000`, `%executeEditorAction Synchronize`, `%sleep 4000`.
- `%selectText a b c d` takes 1-based line and column numbers (the command subtracts one from each argument, read
  from its bytecode), so the range that reaches the server is taken from the wire, not from the script. `%selectText
  12 1 14 31` produced the request range 11:0 to 13:30 in C2a. A first probe with `%selectText 11 0 14 0` produced
  9:0 to 11:30 (the selection ended at the end of the print line); it was also answered with one
  edit, is kept as `aside/c2a-probe-selection/` and is not used as evidence.

### Evidence routes

- Wire capture: `tmp/129-eval/node-tee.sh` is a bash wrapper that runs `/usr/bin/node` and copies the language
  server's stdin to `tmp/129-eval/linux/wire-in.log` and its stdout to `wire-out.log` (`tee -a`, stderr untouched; a
  call without `--stdio`, such as the version check, runs plain node). The plugin's Node.js resolution accepted it
  unchanged: the log says `Using the SETTINGS Node.js executable: .../node-tee.sh`.
- The seed went into `config_runIde/options/BbjSettings.xml` (the sandbox's application settings, never the user's
  IDE) with `nodeJsPath` set to the wrapper. The IDE kept it and rewrote the file once (it now reads
  `$USER_HOME$/repos/bbj-language-server/tmp/129-eval/node-tee.sh` and adds `javaInteropSettingsMigrated`), which
  confirms the shape: an `application` element holding a `component` named `com.basis.bbj.intellij.BbjSettings`
  with one `option` per field.
- Trace level: the project's `.idea/LanguageServersSettings.xml` was seeded (`LanguageServerSettingsState`, entry
  `bbjLanguageServer`, `serverTrace` = `verbose`) and the IDE left it unchanged, so whether the LSP console honored
  it is not known; the Language Servers console was not read (no display). The wire capture is the request/response
  trace for the Linux rows.
- `window/logMessage` from the server goes to the LSP console, not to `idea.log`; the server's debug lines never
  appear (its level is WARN in IntelliJ).
- Before each session `tmp/129-eval/prep-case.sh` moves `log_runIde/idea.log` and the wire logs aside and writes the
  UTC start; `finish-case.sh` copies them into `tmp/129-eval/linux/<case>/`.

### Corpus

Corpus folder `/home/coder/tinybbj` (outside the repository; `runIde` opens it). `examples/bbj-classes.bbj` with all
leading whitespace removed (`sed 's/^[ \t]*//'`) is the starting file, so Reformat Code must re-indent it; the
untouched copy is `tmp/129-eval/linux/corpus/a.orig.bbj` (63 lines, 1240 bytes, no CR). The remaining corpus files
for the later cases are in place, sha256 of each (`config.bbx` is a copy of `examples/config.bbx`; nothing under
`/opt/bbx/cfg` is opened or written):

```
4ef0fb934787d887ba1a0ff3ed479d64dd3d758a0a20b48553fb44a8e63f7232  tmp/129-eval/linux/corpus/a.orig.bbj
1e35a9717526732e778b1b8ce5af4891eb7b0fa2b359e3463ec482bd8af8c05f  tmp/129-eval/linux/corpus/c2b.orig.bbj
f9650057b37e594cfa61f7fb7237378f6d989250461ea2b11f716278e6388e81  /home/coder/tinybbj/numbered.bbj
c1ef134ca4f5ff320e1b33fc870e7527d80dd5d24671ed8ee6be8614c4dce636  /home/coder/tinybbj/crlf.bbj
c1ef134ca4f5ff320e1b33fc870e7527d80dd5d24671ed8ee6be8614c4dce636  /home/coder/tinybbj/crlf-eol-crlf.bbj
c1ef134ca4f5ff320e1b33fc870e7527d80dd5d24671ed8ee6be8614c4dce636  /home/coder/tinybbj/crlf-eol-lf.bbj
7e924a6f7e416db0168c89495fe1a0381d7d67261e977f7975e6726c0518a1e1  /home/coder/tinybbj/config.bbx
1933f5d3c2b3ec05d61546bb3f2fe8986dcbd1a7172c2b9495741d7c79ba5648  /home/coder/tinybbj/formatted.bbj
```

`numbered.bbj` is `0010 PRINT "A"`, `0020 PRINT "B"`, `0030 GOTO 0010`. `crlf.bbj` is the stripped `a.orig.bbj` with CRLF
endings (`sed 's/$/\r/'`: 63 CR LF line breaks and a lone CR at the very end, because the source has no final line
break, so it is not a clean CRLF file); `crlf-eol-crlf.bbj` and `crlf-eol-lf.bbj` are two identical copies. The CRLF cases
C6a to C6c therefore use fresh copies of `tmp/129-eval/linux/corpus/crlf-clean.orig.bbj` (`c6a2.bbj`, `c6b2.bbj`,
`c6c2.bbj`; sha256 `3c59aa9aed0c75ebd2451669a71d2b1dec1adf85601f32ae026f892b4316db23`, 1303 bytes: 63 CR LF breaks, no bare
LF or CR, no final line break). The older files are not used as evidence. The corpus files of the C1 to C7 sessions (`c1.bbj`, `c2a*.bbj`,
`c2b*.bbj`, `c7a.bbj`, `c7b.bbj`, `formatted.bbj`) hold the results of those sessions and are not reused.

### Seeds, project setup and restoration (plan 129-04)

Seeds used after the first cases and their removal (all in git-excluded locations or outside this repository):

- `/home/coder/tinybbj/.idea/workspace.xml`: component `FormatOnSaveOptions` for C3a (`myRunOnSave`, `myAllFileTypesSelected`)
  and C3b (`myFormatOnlyChangedLines` added); removed again before C4a. The shape the IDE wrote back is in the C3
  sections.
- `/home/coder/tinybbj` is a git repository since C3b (one commit `0f0f840 baseline` with `.gitignore` and `c3b.bbj`),
  with `.idea/vcs.xml` mapping `$PROJECT_DIR$` to Git; the repository is outside this one.
- sandbox `config_runIde/options/BbjSettings.xml`: the wrapper seed plus `formatterIndentWidth` 4 and
  `formatterKeywordsToUppercase` true for C5, `formatterEolCharacter` CRLF for C6b and LF for C6c (each file is copied
  into its case folder).
- After the last case the file `config_runIde/options/BbjSettings.xml` and the first, unused seed
  `config/options/BbjSettings.xml` (both held the Node.js wrapper path) were deleted; `test ! -e` on both paths passes.
  Copies are under `tmp/129-eval/linux/BbjSettings.xml.*`.
- The one-line evaluation flip in `BbjLanguageServerFactory.java` was restored with `git checkout -- <that file>` after
  `git diff --numstat HEAD -- bbj-intellij bbj-vscode` showed only `1 1` for it; `git diff --quiet HEAD -- bbj-intellij
  bbj-vscode` passes afterwards, so the tree's source equals HEAD again (`LSP_FORMATTING_ENABLED = false`).
- The evaluation zip built in the previous plan still carries the flip and is the one the Windows run uses.

### IDE and server

IntelliJ IDEA 2024.2, `Build #IC-242.20224.300`, `JDK: 21.0.3; VM: OpenJDK 64-Bit Server VM; Vendor: JetBrains s.r.o.`,
`OS: Linux` (idea.log lines 396-398 of the C1 session). The user's own IDE is build 262 (2026.2); the Windows run is
the evidence for that build. BBjServices 26.03 on `localhost:5008` with the `bbj-ls.jar` named in the frontmatter
(`bbj/interop/FormatWorker` present).

## Cases

| ID | Case | Platform | Driven by | Steps | Expected | Observed | Evidence | Class |
|----|------|----------|-----------|-------|----------|----------|----------|-------|
| C1 | Reformat Code | Linux | script | open c1.bbj (63 lines, no leading indentation); wait for smart mode and the started server (25 s); editor action ReformatCode; save | re-indented with indentWidth 2, one formatting request | one textDocument/formatting request (id 12), response with one edit over lines 5 to 62; file on disk grew from 1240 to 1300 bytes and is indented two spaces per level; no message, no WARN or ERROR from a BBj or LSP4IJ class | ### C1 | pass |
| C2a | Reformat selection inside a block | Linux | script | open c2a-body.bbj (stripped copy); select the print and METHODRET lines of a METHOD body (wire range: line 11 column 0 to line 13 column 30, 0-based); ReformatCode; save | a textDocument/rangeFormatting request; lines outside the selection unchanged | rangeFormatting request id 17 with that range; response with one edit over lines 11 to 14 (whole lines, ending at the start of the next line); the IDE applied it as one didChange; only the two selected non-blank lines of the file changed (four leading spaces each); no Overlapping edit and no LSP formatting error in idea.log | ### C2a | pass |
| C2b | Reformat selection inside a multi-line statement | Linux | script | open c2b-cont.bbj (statement continued with colon lines, first line indented four spaces); select nine characters inside the second line (line 2, columns 8 to 17, 0-based); ReformatCode; save | response range wider than the selection, applied, no Overlapping edit error | rangeFormatting request id 19; response one edit over line 2 column 0 to line 3 column 0, the whole continuation line, wider than the selection; applied (the didChange removed five spaces); the first line of the statement was not touched, the server snapped to the line, not to the statement; no Overlapping edit in idea.log | ### C2b | pass |
| C7a | Edit application, one undo step | Linux | script | open a fresh stripped copy c7a.bbj; ReformatCode; editor action Undo once; save; cmp the file with the stripped original | one Undo restores the original text byte for byte | the formatting reached the document as one didChange (version 2) and the undo as one didChange (version 3); the saved file is byte-identical to a.orig.bbj (cmp silent) | ### C7a | pass |
| C7b | Idempotency | Linux | script | open a fresh stripped copy c7b.bbj; ReformatCode twice, six seconds apart; save | the second response carries no edit | first request (id 18) answered with one edit, second request (id 25) answered with an empty result; the saved file equals the C1 result; the IDE still emitted one didChange with empty text after the empty answer (see Known issues) | ### C7b | pass |
| C7c | Already formatted file | Linux | script | open formatted.bbj (the C1 result, 1300 bytes), caret at 1:1; ReformatCode; save; compare content and modification time | no edit in the response, modification time unchanged | request id 15 answered with an empty result; content equal to the opened file; modification time 1791102418 before and after (epoch seconds); caret 1:1 in both screenshots; one empty didChange (see Known issues) | ### C7c | pass |
| C3a | Actions on Save, whole file | Linux | script | project setting Reformat code on save, all file types (workspace.xml seed); open c3a.bbj (stripped, no indentation); insert `;rem` at the end of line 12; editor action SaveAll | a formatting request at save, the file formatted on disk | after SaveAll the wire shows didChange, didSave, then one textDocument/formatting request (id 25) answered with one edit over lines 4 to 62, a didChange applying it, a second didSave and a second formatting request (id 32) answered with an empty result; the file on disk is the C1 result plus the typed `;rem` on line 12 (diff against c1.bbj shows only that); no message, no WARN or ERROR from a BBj or LSP4IJ class; D-07 not triggered | ### C3a | pass |
| C3b | Actions on Save, changed lines only | Linux | script | corpus made a git repository with the stripped c3b.bbj committed and a Git mapping seeded; Reformat code on save, only changed lines (workspace.xml seed); insert `;rem` at the end of line 12; SaveAll | a rangeFormatting request at save, only the changed line formatted | after SaveAll: didChange, didSave, then textDocument/rangeFormatting (id 24) with range 11:0 to 11:34, answered with one edit over line 11 (`    print something!, some_string!;rem`), applied as one didChange inserting four spaces at 11:0, a second didSave, a second rangeFormatting (id 31) answered with an empty result; on disk exactly one line differs from the committed file (git diff: line 12 gained four spaces and the typed `;rem`), every other line is unchanged and still unindented; D-07 not triggered | ### C3b | pass |
| C4a | Numbered-file message | Linux | script | open numbered.bbj (three numbered lines); editor action ReformatCode; screenshot; save | no edit, file unchanged, the server shows its message | one textDocument/formatting request (id 21) answered with an empty result; before it the server sent window/showMessageRequest (its id 5, type 2) with the numbered-file offer and the actions Denumber and Denumber and Format; the screenshot shows the Warning balloon `BBj Language Server` with both buttons; sha256 of numbered.bbj identical before and after; the balloon was still open when the script ended the IDE, no answer to request 5 was sent, and the server kept answering (ids 22 and 23, publishDiagnostics) after the request; no BBj or LSP4IJ line at WARN or above in idea.log; clicking the buttons is not scriptable and is in the Windows extra steps | ### C4a | pass |
| C4b | Selection on a numbered file | Linux | script | open c4b.bbj (copy of numbered.bbj); select line 1 and the first nine characters of line 2; ReformatCode; save | no edit, the server explains that a selection needs an unnumbered file | one textDocument/rangeFormatting request (id 20, range 0:0 to 1:9) answered with an empty result; the server sent window/showMessageRequest (id 5, type 2) with `Formatting a selection needs a file without line numbers. Denumber the file first.` and the single action Denumber; sha256 of c4b.bbj identical before and after; no BBj or LSP4IJ line at WARN or above in idea.log | ### C4b | pass |
| C5 | Settings reach the format output | Linux | script | sandbox BbjSettings.xml seeded with formatterIndentWidth 4 and formatterKeywordsToUppercase true (plus the wrapper and home path); fresh IDE session; open c5.bbj (stripped); ReformatCode; save | the initialize request carries both values inside `formatter`, the output follows them | the `initialize` request on the wire carries `"indentWidth":4` and `"keywordsToUppercase":true` inside `initializationOptions.formatter`, the other 13 keys at their defaults; one textDocument/formatting request (id 22) answered with one edit over 4:0 to 63:8; the saved file is indented with four spaces per level and the keywords are upper case (`METHODRET`, `SETERR`, `THROW`, `ERR`, `PRINT`, `CLASSEND`); no BBj or LSP4IJ line at WARN or above | ### C5 | pass |
| C6a | CRLF file, default eolCharacter KEEP | Linux | script | no seed; open c6a2.bbj (63 lines, every line ending in CR LF, no trailing line break); ReformatCode; save; check the line endings on disk | indented, still CRLF on every line on disk, no error | one textDocument/formatting request (id 18); the response carries `\n` only and one edit over 4:0 to 62:0; the file on disk: 63 CR LF, 0 bare LF, 0 bare CR, the status bar shows CRLF; with the CRs removed the content equals the C1 result byte for byte; no BBj or LSP4IJ line at WARN or above | ### C6a | pass |
| C6b | CRLF file, eolCharacter CRLF | Linux | script | sandbox BbjSettings.xml seeded with formatterEolCharacter CRLF; open c6b2.bbj (unformatted, CRLF); ReformatCode; save | observed outcome recorded (lsp4ij issue 381 is the known trap) | the `initialize` request carries `"eolCharacter":"CRLF"`; one textDocument/formatting request (id 18) answered with one edit over 0:0 to 63:0 whose `newText` carries `\r\n` line breaks (it begins `\r\nREM /** Some Javadoc */\r\nCLASS PUBLIC someClass\r\n`); the IDE did not apply it: idea.log has `SEVERE - #c.i.f.s.AsyncDocumentFormattingService - Wrong line separators: '\r\nREM /** ...' at offset 0` (a java.lang.AssertionError from DocumentImpl.replaceString), no didChange followed, the buffer and the file stayed unformatted (sha256 identical to the original) and no balloon showed in the screenshot; the server was unaffected | ### C6b | known issue |
| C6c | CRLF file, eolCharacter LF | Linux | script | sandbox BbjSettings.xml seeded with formatterEolCharacter LF; open c6c2.bbj (unformatted, CRLF); ReformatCode; save | observed outcome recorded | the `initialize` request carries `"eolCharacter":"LF"`; one textDocument/formatting request (id 15) answered with one edit over 4:0 to 62:0 with `\n` breaks, applied; the file on disk: 63 CR LF, 0 bare LF, so the LF value did not change the line endings the IDE keeps for the file; with the CRs removed the content equals the C1 result; no balloon, no exception in idea.log | ### C6c | pass |

## Code-verified

These rows are verified from code and existing tests, not hand-run (they claim no runtime sequence). The test titles
below were checked to exist in the named files and the four test files pass (see the Evidence column); the rows
claim no runtime sequence.

| ID | Case | Platform | Driven by | Steps | Expected | Observed | Evidence | Class |
|----|------|----------|-----------|-------|----------|----------|----------|-------|
| V1 | config.bbx and BBx Config left untouched | any | code-verified | read bbj-formatting-handler.ts line 52 (a document that is not open, or whose languageId is not `bbj`, is answered with `[]`); plugin.xml line 330 maps the language `BBx Config` to the server with languageId `bbx-config`; read the test | a reformat of a config file reaches the server and is answered with no edit, so config.bbx is never rewritten | the server-side allow-list on languageId gives `[]` for `bbx-config`; no runtime sequence is claimed (the evaluation did not open a config file in the IDE); lsp4ij issue 1647 is open | bbj-vscode/test/bbj-formatting-handler.test.ts line 124 "a config document and a plain text document give no edit and are never sent to the formatter"; `npx vitest run` of the four files on 2026-10-04: `Test Files  4 passed (4)`, `Tests  109 passed (109)` | pass |
| V2 | Commit-dialog reformat option | any | code-verified | the commit dialog's Reformat code option cannot be limited to file types in LSP4IJ (lsp4ij issue 1647, open when the plan was written, taken from the research, not re-read); BBj files take the same Reformat Code path as in C1, config files are answered by the V1 guard | a commit-time reformat of a config file gets `[]`, of a BBj file the same edit as Reformat Code | the only config-file protection is the V1 guard in the server, proven by the V1 test; the commit dialog itself was not opened in either platform and no runtime sequence is claimed | bbj-vscode/test/bbj-formatting-handler.test.ts line 124 (same test as V1); `npx vitest run` of the four files on 2026-10-04: `Test Files  4 passed (4)`, `Tests  109 passed (109)` | pass |
| V3 | Large file: minimal edits, no edit when already formatted | any | code-verified | read bbj-format-edit.test.ts (`minimalLineEdit`: no edit for equal text; insert, delete, replace-every-line and trailing-line-break edits round-trip and touch only the changed lines) and bbj-format-service.test.ts lines 87 and 139; the Linux rows C7a and C7c show one undo step and an unchanged modification time on a 63-line file | the server returns minimal line edits and none when nothing changes | proven for edit shape and the empty answer; apply time, caret and folding on a large file were not measured (no runtime sequence claimed, the corpus has no large file) | bbj-vscode/test/bbj-format-edit.test.ts "minimalLineEdit" (line 33 onward); bbj-vscode/test/bbj-format-service.test.ts line 87 "an open buffer comes back as one edit over the changed line only", line 139 "text that is already formatted gives no edit"; `npx vitest run` of the four files on 2026-10-04: `Test Files  4 passed (4)`, `Tests  109 passed (109)` | pass |
| V4 | Server down or older BBj: bounded handler, one message | any | code-verified | read bbj-formatting-handler.test.ts line 110 (a format resolves while the workspace is still loading and no document wait is started), bbj-format-notices.test.ts lines 98 and 254, and java-interop-program-lane.ts lines 37 and 45 (`PROGRAM_REQUEST_TIMEOUT_MS = 15_000`, `PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS = 25_000`) | an empty edit list, one Warning per connection, the request bounded at its deadline | proven in the server tests; the IDE side (no EDT wait on a down server) was not exercised, no runtime sequence is claimed | bbj-vscode/test/bbj-formatting-handler.test.ts line 110; bbj-vscode/test/bbj-format-notices.test.ts line 98 "is reported once per connection and a reconnect re-arms it", line 254 "a failed outcome with an empty peer message still shows the fixed text"; `npx vitest run` of the four files on 2026-10-04: `Test Files  4 passed (4)`, `Tests  109 passed (109)` | pass |
| V5 | Stale answer dropped | any | code-verified | read bbj-format-service.test.ts lines 149 and 162 | an edit computed for an older document version is never applied | the answer for a version older than the live buffer is dropped, and so is an answer for a document closed meanwhile | bbj-vscode/test/bbj-format-service.test.ts line 149 "an answer for an older version is dropped when the document was edited meanwhile", line 162 "an answer is dropped when the document was closed meanwhile"; `npx vitest run` of the four files on 2026-10-04: `Test Files  4 passed (4)`, `Tests  109 passed (109)` | pass |
| V6 | Editor options and a range edit wider than the selection | any | code-verified | read bbj-format-service.test.ts lines 128 and 255; the Linux rows C2a and C2b show the IDE applying such an edit | the editor's tabSize and insertSpaces never change the settings sent, and an edit that reaches past the selection is returned at its own range | both proven in the service tests; the runtime counterpart of the second claim is C2b (response wider than the selection, applied, no Overlapping edit) and of the first C1 (the editor sent `tabSize` 4, the output used `indentWidth` 2) | bbj-vscode/test/bbj-format-service.test.ts line 128 "the editor formatting options never change the settings that are sent", line 255 "an edit that reaches past the selection is accepted at its own range, not clipped to the selection"; `npx vitest run` of the four files on 2026-10-04: `Test Files  4 passed (4)`, `Tests  109 passed (109)` | pass |

## Windows

Run by the user with the same evaluation zip (sha256 in the frontmatter) following `129-WINDOWS-CHECKLIST.md`; the
returned `idea.log`, LSP console trace and IDE build line are added here when they arrive. Excerpts only; the raw files
stay under `tmp/129-eval/windows/`.

| ID | Case | Platform | Driven by | Steps | Expected | Observed | Evidence | Class |
|----|------|----------|-----------|-------|----------|----------|----------|-------|
| W1 | CRLF file, Reformat Code | Windows | user | CRLF program without indentation; Reformat Code; save | indented, status bar still shows CRLF after the save, one formatting request | pending | pending | not run |
| W2 | Reformat Code on a real program | Windows | user | unindented copy of a real program; Reformat Code; one Undo | re-indented with two spaces per level; one Undo restores it | pending | pending | not run |
| W3 | Reformat selection | Windows | user | select three lines inside a METHOD; Reformat Code | a rangeFormatting request, only those lines (and whole lines around them) change | pending | pending | not run |
| W4 | Actions on Save | Windows | user | Settings, Tools, Actions on Save, Reformat code on; unindent one line; Ctrl+S | the line is indented again after the save | pending | pending | not run |

## Evidence

### C1

Session start `2026-10-04T08:18:00Z` (`tmp/129-eval/linux/C1/session_start`); files `tmp/129-eval/linux/C1/idea.log`,
`wire-in.log`, `wire-out.log`, `screens/C1-before.png`, `screens/C1-after.png` (status bar shows `BBj: Ready`).

idea.log, the language server launch and start (lines 404-408, 420, session of the C1 row):

```
2026-10-04 08:18:06,155 [   3943]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Using the SETTINGS Node.js executable: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh
2026-10-04 08:18:06,164 [   3952]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-13992626498142555520.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:18:06,500 [   4288]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> starting
2026-10-04 08:18:06,985 [   4773]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

idea.log, WARN and SEVERE lines of the session: 27 in total, none names a BBj or LSP4IJ class. The SEVERE ones are the
IDE's own Gradle plugin failing to read its state under the host JDK:

```
2026-10-04 08:18:05,938 [   3726] SEVERE - #c.i.c.ComponentStoreImpl - Cannot init component state (componentName=GradleJvmSupportMatrix, componentClass=GradleJvmSupportMatrix) [Plugin: com.intellij.gradle]
Caused by: java.lang.IllegalArgumentException: 25
```

Wire, `initialize` request (client to server, `wire-in.log`; the capabilities block is elided with `…`). It shows
`interopHost`, `interopPort` and the `formatter` object with its 15 keys, `indentWidth` among them:

```
{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"processId":2682147,"rootPath":"/home/coder/tinybbj","rootUri":"file:///home/coder/tinybbj","initializationOptions":{"home":"/opt/bbx","classpath":"","interopHost":"localhost","interopPort":5008,"configPath":"","compilerOutputDirectory":"","compilerTrigger":"debounced","formatter":{"indentWidth":2,"indentCharacter":"SPACE","keywordsToUppercase":false,"removeLineContinuation":false,"splitSingleLineIf":false,"splitInlineComments":false,"splitInlineLabelComment":false,"collapseMultiLine":false,"eolCharacter":"KEEP","ifClosingKeyword":"KEEP","ifKeywordCase":"KEEP","parameterLayout":"KEEP_INITIAL_LAYOUT","operatorSpacing":"KEEP","indentLabelBlocks":false,"blankLineAfterReturn":false}},…
```

Wire, the server's `initialize` result advertises both capabilities (`wire-out.log`, matches of
`document(Range)?FormattingProvider`):

```
"documentFormattingProvider":true
"documentRangeFormattingProvider":true
```

Wire, the formatting request (no selection, so a whole-document request) and its response (`wire-out.log`; the
`newText` body is elided in the middle with `…`, nothing rewritten):

```
{"jsonrpc":"2.0","id":"12","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c1.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
{"jsonrpc":"2.0","id":"12","result":[{"range":{"start":{"line":4,"character":0},"end":{"line":62,"character":0}},"newText":"  FIELD PUBLIC BBjString someInstanceString$\n\n  METHOD PUBLIC STATI…n    writeErr:\n    throw errmes(-1), err\n  methodend\n"}]}
```

The editor sent `tabSize` 4 (its own default); the server ignores it and used `indentWidth` 2 from the initialize
object, which is what the two-space result shows. The saved file against the untouched copy (`diff` of
`a.orig.bbj` and `c1.bbj`, first hunks): `FIELD PUBLIC BBjString someInstanceString$` gains two leading spaces,
`METHODRET "ABC"` gains four, `METHODEND` two; trailing blanks on `rem missing: ` and `a! = new someClass() ` are
removed.

### C2a

Session start `2026-10-04T08:22:36Z`; files `tmp/129-eval/linux/C2a/`, screenshots `screens/C2a-selected.png` and
`screens/C2a-after.png`. In this and the following sections the number in the `/tmp/bbj-language-server-<n>.cjs`
path of the launch line is replaced by `<n>`; nothing else in a quoted line is changed.

idea.log:

```
2026-10-04 08:22:42,389 [   4870]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:22:43,144 [   5625]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

27 WARN or SEVERE lines, none naming a BBj or LSP4IJ class (the same IDE noise as in C1); no `Overlapping edit`, no
`LSP formatting error`.

Wire (request, the document change the IDE made from the response, response):

```
{"jsonrpc":"2.0","id":"17","method":"textDocument/rangeFormatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c2a-body.bbj"},"options":{"tabSize":4,"insertSpaces":true},"range":{"start":{"line":11,"character":0},"end":{"line":13,"character":30}}}}
{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":2,"uri":"file:///home/coder/tinybbj/c2a-body.bbj"},"contentChanges":[{"range":{"start":{"line":11,"character":0},"end":{"line":13,"character":0}},"rangeLength":32,"text":"    print something!, some_string!\n\n    "}]}}
{"jsonrpc":"2.0","id":"17","result":[{"range":{"start":{"line":11,"character":0},"end":{"line":14,"character":0}},"newText":"    print something!, some_string!\n\n    METHODRET #someInstanceString$\n"}]}
```

`diff` of the saved file against the stripped original shows exactly two changed lines, 12 (`print something!, some_string!`)
and 14 (`METHODRET #someInstanceString$`), each gaining four leading spaces; every line outside the selection is
unchanged.

### C2b

Session start `2026-10-04T08:25:47Z`; files `tmp/129-eval/linux/C2b/`, screenshots `screens/C2b-selected.png`,
`screens/C2b-after.png`. Corpus file `c2b-cont.bbj` (5 lines): `rem multiline statement`, `    X! = "TEST"+`,
`      : "TEST123"+`, ` : "jhgjgj"`, `PRINT X!`.

idea.log:

```
2026-10-04 08:25:52,591 [   3963]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:25:53,398 [   4770]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

27 WARN or SEVERE lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`.

Wire:

```
{"jsonrpc":"2.0","id":"19","method":"textDocument/rangeFormatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c2b-cont.bbj"},"options":{"tabSize":4,"insertSpaces":true},"range":{"start":{"line":2,"character":8},"end":{"line":2,"character":17}}}}
{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":2,"uri":"file:///home/coder/tinybbj/c2b-cont.bbj"},"contentChanges":[{"range":{"start":{"line":2,"character":1},"end":{"line":2,"character":6}},"rangeLength":5,"text":""}]}}
{"jsonrpc":"2.0","id":"19","result":[{"range":{"start":{"line":2,"character":0},"end":{"line":3,"character":0}},"newText":" : \"TEST123\"+\n"}]}
```

The saved file: line 3 changed from `      : "TEST123"+` to ` : "TEST123"+`; the other four lines are unchanged,
including the four-space indent of `X! = "TEST"+`.

### C7a

Session start `2026-10-04T08:26:58Z`; files `tmp/129-eval/linux/C7a/`, screenshots `screens/C7a-formatted.png`,
`screens/C7a-undone.png`.

idea.log:

```
2026-10-04 08:27:03,371 [   3774]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:27:04,202 [   4605]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

31 WARN or SEVERE lines, none naming a BBj or LSP4IJ class (four more than the other sessions: four
`AbstractTreeNodeVisitor - unexpected component class ...CachedTreePresentationNode` lines from the IDE's project
view); no `Overlapping edit`, no `LSP formatting error`.

Wire (request, the two document changes in order, the response; long strings elided with `…` inside the line):

```
{"jsonrpc":"2.0","id":"18","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c7a.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":2,"uri":"file:///home/coder/tinybbj/c7a.bbj"},"contentChanges":[{"range":{"start":{"line":4,"character":0},"end":{"line":61…g()\n? x!.getSomeString()\n\nclass public Sample\n\n  method public String write(String dr!)\n    seterr writeErr\n    PRINT dr!\n    methodret dr!\n\n    writeErr:\n    throw errmes(-1), err\n  "}]}}
{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":3,"uri":"file:///home/coder/tinybbj/c7a.bbj"},"contentChanges":[{"range":{"start":{"line":4,"character":0},"end":{"line":61… x!.getsomeInstanceString()\n? x!.getSomeString()\n\nclass public Sample\n\nmethod public String write(String dr!)\nseterr writeErr\nPRINT dr!\nmethodret dr!\n\nwriteErr:\nthrow errmes(-1), err\n"}]}}
```

Exactly one `didChange` for the formatting (version 2) and one for the undo (version 3); the undo's text is the
unindented original. After the save, `cmp /home/coder/tinybbj/c7a.bbj tmp/129-eval/linux/corpus/a.orig.bbj` is silent:
the file equals the original byte for byte.

### C7b

Session start `2026-10-04T08:28:04Z`; files `tmp/129-eval/linux/C7b/`, screenshots `screens/C7b-first.png`,
`screens/C7b-second.png`.

idea.log:

```
2026-10-04 08:28:10,818 [   4704]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:28:11,506 [   5392]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

27 WARN or SEVERE lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`.

Wire (the first response is shortened to its shape; the second is verbatim):

```
{"jsonrpc":"2.0","id":"18","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c7b.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
{"jsonrpc":"2.0","id":"18","result":[{"range":{"start":{"line":4,"character":0},"end":{"line":62,"character":0}},"newText":"  FIELD PUBLIC BBjString someInstanceString$\n\n  METHOD PUBLIC STATIC String getSomeS…getSomeString()\n\nclass public Sample\n\n  method public String write(String dr!)\n    seterr writeErr\n    PRINT dr!\n    methodret dr!\n\n    writeErr:\n    throw errmes(-1), err\n  methodend\n"}]}
{"jsonrpc":"2.0","id":"25","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c7b.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
{"jsonrpc":"2.0","id":"25","result":[]}
{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":3,"uri":"file:///home/coder/tinybbj/c7b.bbj"},"contentChanges":[{"range":{"start":{"line":63,"character":8},"end":{"line":63,"character":8}},"rangeLength":0,"text":""}]}}
```

The saved file equals the C1 result (`diff` of `c7b.bbj` and `c1.bbj` is empty).

### C7c

Session start `2026-10-04T08:29:14Z`; files `tmp/129-eval/linux/C7c/`, screenshots `screens/C7c-before.png` and
`screens/C7c-after.png` (status bar `1:1` in both); `tmp/129-eval/linux/formatted-stat-before.txt` and
`formatted-stat-after.txt`.

idea.log:

```
2026-10-04 08:29:19,608 [   3787]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:29:20,550 [   4729]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

33 WARN or SEVERE lines, none naming a BBj or LSP4IJ class (the same IDE noise plus six project-view lines of the kind named in C7a);
no `Overlapping edit`, no `LSP formatting error`.

Modification time (`stat -c '%n %s %Y'` of `/home/coder/tinybbj/formatted.bbj`, taken before and after the session):

```
/home/coder/tinybbj/formatted.bbj 1300 1791102418
/home/coder/tinybbj/formatted.bbj 1300 1791102418
```

Wire:

```
{"jsonrpc":"2.0","id":"15","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/formatted.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
{"jsonrpc":"2.0","id":"15","result":[]}
{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":2,"uri":"file:///home/coder/tinybbj/formatted.bbj"},"contentChanges":[{"range":{"start":{"line":63,"character":8},"end":{"line":63,"character":8}},"rangeLength":0,"text":""}]}}
```

`cmp` of the file after the session with `tmp/129-eval/linux/corpus/formatted.orig.bbj` is silent. Line 63, column 8 is
the end of the file (`classend`, no trailing line break), so the empty `didChange` is an empty replacement at the
end of the document.

### C3a

Session start `2026-10-04T08:36:28Z`; files `tmp/129-eval/linux/C3a/` (`idea.log`, `wire-in.log`, `wire-out.log`,
`screens/C3a-before.png`, `C3a-edited.png`, `C3a-after.png`). The project's `.idea/workspace.xml` was seeded before the
session with the component below (the backup is `tmp/129-eval/linux/workspace.xml.before-c3`); the stripped corpus copy
`c3a.bbj` is byte-identical to `a.orig.bbj` (sha256 `4ef0fb93...`).

```
<component name="FormatOnSaveOptions">
  <option name="myRunOnSave" value="true" />
  <option name="myAllFileTypesSelected" value="true" />
</component>
```

The IDE wrote the component back at exit in this shape (the default `myAllFileTypesSelected` is not written):

```
  <component name="FormatOnSaveOptions">
    <option name="myRunOnSave" value="true" />
  </component>
```

idea.log:

```
2026-10-04 08:36:33,349 [   3796]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:36:34,183 [   4630]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

30 WARN, SEVERE or ERROR lines, none naming a BBj or LSP4IJ class (the IDE noise of the earlier sessions); no
`Overlapping edit`, no `LSP formatting error`; nothing in idea.log mentions the save action.

Wire, in order (`wire-in.log` and `wire-out.log`; the long `newText` and `text` bodies are elided with `…` inside the
line). The script typed `;rem` at the end of line 12 and ran SaveAll. The first `didSave` comes before the formatting
request, so the unformatted edit is written to disk first; the formatting follows, and a second save writes the
formatted text:

```
IN : {"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":2,"uri":"file:///home/coder/tinybbj/c3a.bbj"},"contentChanges":[{"range":{"start":{"line":11,"character":30},"end":{"line":11,"character":30}},"rangeLength":0,"text":";rem"}]}}
IN : {"jsonrpc":"2.0","method":"textDocument/didSave","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3a.bbj"}}}
IN : {"jsonrpc":"2.0","id":"25","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3a.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","id":"25","result":[{"range":{"start":{"line":4,"character":0},"end":{"line":62,"character":0}},"newText":"  FIELD PUBLIC BBjString someInstanceStri…ethod public String write(String dr!)\n    seterr writeErr\n    PRINT dr!\n    methodret dr!\n\n    writeErr:\n    throw errmes(-1), err\n  methodend\n"}]}
IN : {"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":3,"uri":"file:///home/coder/tinybbj/c3a.bbj"},"contentChanges":[{"range":{"sta…ple\n\n  method public String write(String dr!)\n    seterr writeErr\n    PRINT dr!\n    methodret dr!\n\n    writeErr:\n    throw errmes(-1), err\n  "}]}}
IN : {"jsonrpc":"2.0","method":"textDocument/didSave","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3a.bbj"}}}
IN : {"jsonrpc":"2.0","id":"32","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3a.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","id":"32","result":[]}
IN : {"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":4,"uri":"file:///home/coder/tinybbj/c3a.bbj"},"contentChanges":[{"range":{"start":{"line":63,"character":8},"end":{"line":63,"character":8}},"rangeLength":0,"text":""}]}}
```

The whole-document request `textDocument/formatting` is what Actions on Save sends in this mode; the second request
is the platform's second pass over the already formatted text and is answered `[]`. The last `didChange` is the empty
one named in Known issues. On disk, `diff /home/coder/tinybbj/c1.bbj /home/coder/tinybbj/c3a.bbj` (c1.bbj is the
Reformat Code result of the same program) prints only:

```
12c12
<     print something!, some_string!
---
>     print something!, some_string!;rem
```

So the whole file was formatted on save and the typed edit survived.

### C3b

Session start `2026-10-04T08:37:48Z`; files `tmp/129-eval/linux/C3b/` (screenshots `C3b-before.png`, `C3b-edited.png`,
`C3b-after.png`). Setup before the session: `git init` in `/home/coder/tinybbj` (outside this repository), `.gitignore`
holding `.idea/`, the stripped `c3b.bbj` committed as `0f0f840 baseline`, and `.idea/vcs.xml` seeded with the mapping
`$PROJECT_DIR$` to `Git`; the workspace component gained `myFormatOnlyChangedLines`. The IDE wrote it back as:

```
  <component name="FormatOnSaveOptions">
    <option name="myFormatOnlyChangedLines" value="true" />
    <option name="myRunOnSave" value="true" />
  </component>
```

The screenshots show the Git branch `master` in the title bar, so the VCS mapping took effect.

idea.log:

```
2026-10-04 08:37:53,724 [   4280]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:37:54,788 [   5344]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

37 WARN, SEVERE or ERROR lines, none naming a BBj or LSP4IJ class (more IDE noise than before from the Git
integration); no `Overlapping edit`, no `LSP formatting error`.

Wire, in order:

```
IN : {"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":2,"uri":"file:///home/coder/tinybbj/c3b.bbj"},"contentChanges":[{"range":{"start":{"line":11,"character":30},"end":{"line":11,"character":30}},"rangeLength":0,"text":";rem"}]}}
IN : {"jsonrpc":"2.0","method":"textDocument/didSave","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3b.bbj"}}}
IN : {"jsonrpc":"2.0","id":"24","method":"textDocument/rangeFormatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3b.bbj"},"options":{"tabSize":4,"insertSpaces":true},"range":{"start":{"line":11,"character":0},"end":{"line":11,"character":34}}}}
OUT: {"jsonrpc":"2.0","id":"24","result":[{"range":{"start":{"line":11,"character":0},"end":{"line":12,"character":0}},"newText":"    print something!, some_string!;rem\n"}]}
IN : {"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":3,"uri":"file:///home/coder/tinybbj/c3b.bbj"},"contentChanges":[{"range":{"start":{"line":11,"character":0},"end":{"line":11,"character":0}},"rangeLength":0,"text":"    "}]}}
IN : {"jsonrpc":"2.0","method":"textDocument/didSave","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3b.bbj"}}}
IN : {"jsonrpc":"2.0","id":"31","method":"textDocument/rangeFormatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c3b.bbj"},"options":{"tabSize":4,"insertSpaces":true},"range":{"start":{"line":11,"character":0},"end":{"line":11,"character":38}}}}
OUT: {"jsonrpc":"2.0","id":"31","result":[]}
```

The request range is the changed line only (line 11 in 0-based numbering, the typed line), and the result is one
whole-line edit. On disk, `git -C /home/coder/tinybbj diff` after the session shows a single hunk:

```
 METHOD PUBLIC String getInstanceString(Boolean something!, String some_string!)
-print something!, some_string!
+    print something!, some_string!;rem
```

and `diff` of the saved file against the unindented original shows only that line, so no other line was touched.

### C4a

Session start `2026-10-04T08:39:00Z`; files `tmp/129-eval/linux/C4a/` (`sha-before.txt`, `sha-after.txt`, screenshots
`C4a-before.png`, `C4a-after.png`). The Actions on Save component was removed from the project's `workspace.xml`
before this session and the next ones.

```
f9650057b37e594cfa61f7fb7237378f6d989250461ea2b11f716278e6388e81  /home/coder/tinybbj/numbered.bbj   (before)
f9650057b37e594cfa61f7fb7237378f6d989250461ea2b11f716278e6388e81  /home/coder/tinybbj/numbered.bbj   (after)
```

idea.log:

```
2026-10-04 08:39:05,885 [   3918]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:39:06,820 [   4853]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

34 WARN, SEVERE or ERROR lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`.
The session ended with the message request still open (the script ends the IDE eight seconds after Reformat Code and
does not click): idea.log has no line from the BBj or LSP4IJ code between `starting -> started` and the IDE shutdown
lines, and the wire has no answer to the server's request id 5 (`grep -c '"id":5,"result"' wire-in.log` prints 0).
The IDE closed the files and exited without sending `shutdown`; there was no stop of the server to observe in this
form.

Wire (the server's log message, the message request, the response to the formatting request, and the traffic that
followed while the request was open):

```
IN : {"jsonrpc":"2.0","id":"21","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/numbered.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","method":"window/logMessage","params":{"type":2,"message":"Format/DENUM interop: formatProgram failed (denum-needed): DENUM needed: the source is a line-numbered program (first numbered line 1); DENUM it first or set allowDenum"}}
OUT: {"jsonrpc":"2.0","id":5,"method":"window/showMessageRequest","params":{"type":2,"message":"This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in one step.","actions":[{"title":"Denumber"},{"title":"Denumber and Format"}]}}
OUT: {"jsonrpc":"2.0","id":"21","result":[]}
IN : {"jsonrpc":"2.0","id":"22","method":"textDocument/codeAction", …
IN : {"jsonrpc":"2.0","id":"23","method":"textDocument/codeAction", …
OUT: {"jsonrpc":"2.0","id":"22","result":null}
OUT: {"jsonrpc":"2.0","id":"23","result":null}
```

The buffer was not changed by the formatting answer: the only `didChange` after the request is the empty
replacement at the end of the document named in Known issues. The screenshot `C4a-after.png` shows the balloon `BBj
Language Server`, `This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in
one...` with the buttons Denumber and Denumber and Format, and the editor banner `This is a line-numbered BBj program.
Denumber it for editing.` The server answered the later requests (ids 22 and 23) and kept publishing diagnostics
while request 5 was unanswered, which is the observable part of "the server keeps running after the IDE drops the
open request". What cancelling the request on a balloon close does is not reproducible by script; it is in the
Windows extra steps.

### C4b

Session start `2026-10-04T08:40:15Z`; files `tmp/129-eval/linux/C4b/` (`sha-before.txt`, `sha-after.txt`, screenshots
`C4b-selected.png`, `C4b-after.png`). The script selected line 1 and the first nine characters of line 2.

```
f9650057b37e594cfa61f7fb7237378f6d989250461ea2b11f716278e6388e81  /home/coder/tinybbj/c4b.bbj   (before)
f9650057b37e594cfa61f7fb7237378f6d989250461ea2b11f716278e6388e81  /home/coder/tinybbj/c4b.bbj   (after)
```

idea.log:

```
2026-10-04 08:40:21,431 [   4219]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:40:22,452 [   5240]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

36 WARN, SEVERE or ERROR lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`.

Wire:

```
IN : {"jsonrpc":"2.0","id":"20","method":"textDocument/rangeFormatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c4b.bbj"},"options":{"tabSize":4,"insertSpaces":true},"range":{"start":{"line":0,"character":0},"end":{"line":1,"character":9}}}}
OUT: {"jsonrpc":"2.0","method":"window/logMessage","params":{"type":2,"message":"Format/DENUM interop: formatProgram failed (denum-needed): DENUM needed: a range cannot be formatted in a line-numbered program (first numbered line 1); DENUM the program or format the whole document"}}
OUT: {"jsonrpc":"2.0","id":5,"method":"window/showMessageRequest","params":{"type":2,"message":"Formatting a selection needs a file without line numbers. Denumber the file first.","actions":[{"title":"Denumber"}]}}
OUT: {"jsonrpc":"2.0","id":"20","result":[]}
```

### C5

Session start `2026-10-04T08:42:41Z`; files `tmp/129-eval/linux/C5/` (`BbjSettings.xml.after`, screenshots `C5-before.png`,
`C5-after.png`). The sandbox `config_runIde/options/BbjSettings.xml` was seeded (before-state kept as
`tmp/129-eval/linux/BbjSettings.xml.before-c5`):

```
<application>
  <component name="com.basis.bbj.intellij.BbjSettings">
    <option name="bbjHomePath" value="/opt/bbx" />
    <option name="nodeJsPath" value="$USER_HOME$/repos/bbj-language-server/tmp/129-eval/node-tee.sh" />
    <option name="javaInteropSettingsMigrated" value="true" />
    <option name="formatterIndentWidth" value="4" />
    <option name="formatterKeywordsToUppercase" value="true" />
  </component>
</application>
```

The IDE left the file unchanged at exit. idea.log:

```
2026-10-04 08:42:47,024 [   3848]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:42:48,070 [   4894]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

37 WARN, SEVERE or ERROR lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`.

Wire, the `initialize` request from the fresh session (capabilities elided with `…`):

```
{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"processId":…,"rootPath":"/home/coder/tinybbj","rootUri":"file:///home/coder/tinybbj","initializationOptions":{"home":"/opt/bbx","classpath":"","interopHost":"localhost","interopPort":5008,"configPath":"","compilerOutputDirectory":"","compilerTrigger":"debounced","formatter":{"indentWidth":4,"indentCharacter":"SPACE","keywordsToUppercase":true,"removeLineContinuation":false,"splitSingleLineIf":false,"splitInlineComments":false,"splitInlineLabelComment":false,"collapseMultiLine":false,"eolCharacter":"KEEP","ifClosingKeyword":"KEEP","ifKeywordCase":"KEEP","parameterLayout":"KEEP_INITIAL_LAYOUT","operatorSpacing":"KEEP","indentLabelBlocks":false,"blankLineAfterReturn":false}},"capabilities":…
```

Formatting request and response (long body elided with `…`):

```
IN : {"jsonrpc":"2.0","id":"22","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c5.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","id":"22","result":[{"range":{"start":{"line":4,"character":0},"end":{"line":63,"character":8}},"newText":"    FIELD PUBLIC BBjString someInstanceString$\n\n    METHOD PUBLIC STATIC String getSomeString()\n        METHODRET \"ABC\"\n    METHODEND\n\n    METHOD PUBLIC String getInstanceString(Boolean something!, String some_string!)…eString()\n? someOtherClass.getSomeString()\n\nx! = new someOtherClass(\"ABC\")\n? x!.getsomeInstanceString()\n? x!.getSomeString()\n\nCLASS PUBLIC Sample\n\n    METHOD PUBLIC String write(String dr!)\n        SETERR writeErr\n        PRINT dr!\n        METHODRET dr!\n\n        writeErr:\n        THROW errmes(-1), ERR\n    METHODEND\n\nCLASSEND"}]}
```

The saved `c5.bbj` (two excerpts, the start and the end of the formatted part):

```
CLASS PUBLIC someClass

    FIELD PUBLIC BBjString someInstanceString$

    METHOD PUBLIC STATIC String getSomeString()
        METHODRET "ABC"
    METHODEND

    METHOD PUBLIC String getInstanceString(Boolean something!, String some_string!)
        PRINT something!, some_string!

        METHODRET #someInstanceString$

    METHODEND
...
    METHOD PUBLIC String write(String dr!)
        SETERR writeErr
        PRINT dr!
        METHODRET dr!

        writeErr:
        THROW errmes(-1), ERR
    METHODEND

CLASSEND
```

Four spaces per level (the C1 session with the default seed produced two) and upper-case keywords (the source
has `print` and `methodret` in lower case; the C1 output keeps their case). The seed was removed after the case.

### C6a

Session start `2026-10-04T08:45:17Z`; files `tmp/129-eval/linux/C6a/` (screenshots `C6a-before.png`, `C6a-after.png`).
The sandbox carries no formatter seed in this session (the before-c5 file again). Corpus: `c6a2.bbj`, a copy of
`corpus/crlf-clean.orig.bbj` (sha256 `3c59aa9aed0c75ebd2451669a71d2b1dec1adf85601f32ae026f892b4316db23`, 1303 bytes), the
unindented program with CR LF after each of its 63 line breaks and no line break at the end. A first attempt with the
older `crlf.bbj` is not used as evidence: its last line ended in a lone CR (63 LF, 64 CR), the IDE read that as one
more line break and the saved file gained a final CR LF; the session is kept as
`tmp/129-eval/linux/aside/c6a-lone-cr-probe/`.

idea.log:

```
2026-10-04 08:45:23,119 [   4076]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:45:24,250 [   5207]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

37 WARN, SEVERE or ERROR lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`.

Wire. The IDE hands the server the document with LF breaks (the `didOpen` text of the file contains no `\r`), and the
answer carries `\n` only, so the line endings of the file on disk are the IDE's to keep:

```
IN : {"jsonrpc":"2.0","id":"18","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c6a2.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","id":"18","result":[{"range":{"start":{"line":4,"character":0},"end":{"line":62,"character":0}},"newText":"  FIELD PUBLIC BBjString someInstanceString$\n\n  METHOD PUBLIC STATIC String getSomeString()\n    METHODRET \"ABC\"\n  METHOD…\n  method public String write(String dr!)\n    seterr writeErr\n    PRINT dr!\n    methodret dr!\n\n    writeErr:\n    throw errmes(-1), err\n  methodend\n"}]}
```

Line endings of the saved file, counted from the bytes (python, `\r\n`, bare `\n`, bare `\r`):

```
bytes 1363 CRLF 63 bare LF 0 bare CR 0 tail b'\r\n\r\nclassend'
```

The status bar of `C6a-after.png` shows `CRLF`, and `tr -d '\r' < c6a2.bbj | diff - c1.bbj` prints nothing: the content
is the formatted program.

### C6b

Session start `2026-10-04T08:46:17Z`; files `tmp/129-eval/linux/C6b/` (`BbjSettings.xml.after`, screenshots
`C6b-before.png`, `C6b-after.png`). The seed is the C5 file with `formatterEolCharacter` `CRLF` as its only formatter
option; the wire shows `"eolCharacter":"CRLF"` in `initializationOptions.formatter`. Corpus `c6b2.bbj`, the same bytes
as C6a (sha256 `3c59aa9a...`).

idea.log, the launch (32 WARN or SEVERE lines in total; the two below are the only ones that name formatting):

```
2026-10-04 08:46:24,322 [   5371]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:46:25,281 [   6330]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

idea.log, at the Reformat Code action:

```
2026-10-04 08:47:04,603 [  45652]   INFO - #c.j.p.CommandLogger - %executeEditorAction ReformatCode
2026-10-04 08:47:04,791 [  45840] SEVERE - #c.i.f.s.AsyncDocumentFormattingService - Wrong line separators: '\r\nREM /** ...' at offset 0
java.lang.AssertionError: Wrong line separators: '\r\nREM /** ...' at offset 0
	at com.intellij.openapi.util.text.StringUtil.assertValidSeparators(StringUtil.java:2552)
	at com.intellij.openapi.editor.impl.DocumentImpl.assertValidSeparators(DocumentImpl.java:716)
	at com.intellij.openapi.editor.impl.DocumentImpl.replaceString(DocumentImpl.java:607)
	at com.intellij.openapi.editor.impl.DocumentImpl.lambda$setText$3(DocumentImpl.java:1086)
	at com.intellij.openapi.editor.impl.DocumentImpl.setText(DocumentImpl.java:1088)
	at com.intellij.formatting.service.AsyncDocumentFormattingService$FormattingRequestImpl.updateDocument(AsyncDocumentFormattingService.java:310)
```

No frame in the trace names a BBj or LSP4IJ class, and the idea.log count of `LSP formatting error` (LSP4IJ's own error balloon title) is 0. Wire:

```
IN : {"jsonrpc":"2.0","id":"18","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c6b2.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","id":"18","result":[{"range":{"start":{"line":0,"character":0},"end":{"line":63,"character":0}},"newText":"\r\nREM /** Some Javadoc */\r\nCLASS PUBLIC someClass\r\n\r\n  FIELD PUBLIC BBjString someInstanceString$\r\n\r\n  METHOD PUBLIC STATIC String getSomeString()\r\n    METHODRET …! = new someOtherClass(\"ABC\")\r\n? x!.getsomeInstanceString()\r\n? x!.getSomeString()\r\n\r\nclass public Sample\r\n\r\n  method public String write(String dr!)\r\n    seterr writeErr\r\n    PRINT dr!\r\n    methodret dr!\r\n\r\n    writeErr:\r\n    throw errmes(-1), err\r\n  methodend\r\n\r\n"}]}
```

After the response the wire has no `didChange` and no `didSave` for `c6b2.bbj` (only the two `didClose` at exit); the
file on disk has the sha256 of the original (`3c59aa9a...` before and after) and the screenshot `C6b-after.png` still
shows the unindented text with `CRLF` in the status bar and no balloon. So with `eolCharacter` CRLF the whole edit is
thrown away by the IDE's document check, the user sees nothing happen, and the log carries one SEVERE assertion from
the platform's formatting service (IDE 2024.2, build 242). Data is not lost or damaged and nothing froze. Whether the
IDE build 262 behaves the same is not known; the Windows checklist has an extra step for it.

### C6c

Session start `2026-10-04T08:47:29Z`; files `tmp/129-eval/linux/C6c/` (`BbjSettings.xml.after`). The seed is the same
file with `formatterEolCharacter` `LF`; the wire shows `"eolCharacter":"LF"`. Corpus `c6c2.bbj`, same bytes as C6a.

idea.log:

```
2026-10-04 08:47:34,974 [   3864]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /home/coder/repos/bbj-language-server/tmp/129-eval/node-tee.sh /tmp/bbj-language-server-<n>.cjs --stdio (working directory: /home/coder/tinybbj)
2026-10-04 08:47:35,941 [   4831]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started
```

27 WARN or SEVERE lines, none naming a BBj or LSP4IJ class; no `Overlapping edit`, no `LSP formatting error`, no
exception.

Wire:

```
IN : {"jsonrpc":"2.0","id":"15","method":"textDocument/formatting","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c6c2.bbj"},"options":{"tabSize":4,"insertSpaces":true}}}
OUT: {"jsonrpc":"2.0","id":"15","result":[{"range":{"start":{"line":4,"character":0},"end":{"line":62,"character":0}},"newText":"  FIELD PUBLIC BBjString someInstanceString$\n\n  METHOD PUBLIC STATIC String getSomeString()\n    METHODRET \"ABC\"\n  METHODEND\n\n  METHOD PUBLIC String getInstanceString(Bo…eOtherClass.getSomeString()\n\nx! = new someOtherClass(\"ABC\")\n? x!.getsomeInstanceString()\n? x!.getSomeString()\n\nclass public Sample\n\n  method public String write(String dr!)\n    seterr writeErr\n    PRINT dr!\n    methodret dr!\n\n    writeErr:\n    throw errmes(-1), err\n  methodend\n"}]}
IN : {"jsonrpc":"2.0","method":"textDocument/didSave","params":{"textDocument":{"uri":"file:///home/coder/tinybbj/c6c2.bbj"}}}
```

The saved file: `bytes 1363 CRLF 63 bare LF 0 bare CR 0`, content equal to the C1 result once the CRs are removed. An `LF`
setting therefore does not convert a CRLF file; the answer is applied as text and the IDE keeps the file's own line
separator on disk. This is the input for the eolCharacter sub-question at the decision checkpoint: LF is harmless and has
no effect, CRLF is thrown away by the IDE (C6b).

## Known issues

- After an empty formatting answer the IDE still sends one `textDocument/didChange` with `rangeLength` 0 and empty
  text at the end of the document, and bumps the document version (C7b second request, C7c). The text, the saved
  file and its modification time do not change, and the editor shows no unsaved marker in the C7c screenshots, so
  it is cosmetic under the blocker bar. Evidence: sections C7b and C7c.
- Actions on Save writes the edited, still unformatted text to disk first (the `didSave` comes before the formatting
  request), applies the formatting and saves a second time; the platform's second pass over the formatted text sends a
  second request answered `[]` (C3a ids 25 and 32, C3b ids 24 and 31). A crash between the two saves would leave the
  unformatted text on disk, which is what the user typed, so nothing is lost; it is noted as an observation, not a
  defect. Evidence: sections C3a and C3b.
- With `eolCharacter` CRLF the server answers with `\r\n` in `newText` and the IDE (2024.2) refuses it with a SEVERE
  `Wrong line separators` assertion in `AsyncDocumentFormattingService`: nothing is formatted, nothing is damaged,
  the user sees no message. Only a non-default value triggers it; the default KEEP (C6a) and LF (C6c) format a CRLF
  file correctly. Evidence: section C6b. Put to the user as the eolCharacter sub-question.

## Blockers

## Recommendation

(Filled in the verdict plan.)
