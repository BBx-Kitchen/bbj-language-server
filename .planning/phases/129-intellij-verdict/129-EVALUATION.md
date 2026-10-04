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
untouched copy is `tmp/129-eval/linux/corpus/a.orig.bbj` (63 lines, 1240 bytes, no CR).

### IDE and server

IntelliJ IDEA 2024.2, `Build #IC-242.20224.300`, `JDK: 21.0.3; VM: OpenJDK 64-Bit Server VM; Vendor: JetBrains s.r.o.`,
`OS: Linux` (idea.log lines 396-398 of the C1 session). The user's own IDE is build 262 (2026.2); the Windows run is
the evidence for that build. BBjServices 26.03 on `localhost:5008` with the `bbj-ls.jar` named in the frontmatter
(`bbj/interop/FormatWorker` present).

## Cases

| ID | Case | Platform | Driven by | Steps | Expected | Observed | Evidence | Class |
|----|------|----------|-----------|-------|----------|----------|----------|-------|
| C1 | Reformat Code | Linux | script | open c1.bbj (63 lines, no leading indentation); wait for smart mode and the started server (25 s); editor action ReformatCode; save | re-indented with indentWidth 2, one formatting request | one textDocument/formatting request (id 12), response with one edit over lines 5 to 62; file on disk grew from 1240 to 1300 bytes and is indented two spaces per level; no message, no WARN or ERROR from a BBj or LSP4IJ class | ### C1 | pass |

## Code-verified

## Windows

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

## Known issues

## Blockers

## Recommendation

(Filled in the verdict plan.)
