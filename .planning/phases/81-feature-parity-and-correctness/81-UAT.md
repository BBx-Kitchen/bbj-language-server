---
status: diagnosed
phase: 81-feature-parity-and-correctness
source: [81-VERIFICATION.md]
started: 2026-09-05T13:05:00Z
updated: 2026-09-05T17:08:44Z
---

## Current Test

[testing complete]

## Tests

### 1. Bracket inertness inside string literals and rem comments (PARITY-02, #568)
steps: In a live IDE with the rebuilt plugin, open a `.bbj` file and place the caret on the parenthesis inside `PRINT "value (not a bracket)"`. Repeat inside a doubled-quote literal such as `PRINT "say ""hi"" (ok)"` and on a comment line `rem (x`. Then place the caret on a real code bracket after the string on the same line.
expected: No match highlight, no Ctrl+Shift+M jump, and no auto-close on the bracket inside the literal or comment; a real code bracket on the same line still highlights, navigates and auto-closes; Ctrl+hover / go-to-definition still underline single words only.
why_human: The plugin's editor rendering (bracket-match highlight, Ctrl+Shift+M navigation, auto-close) requires the IntelliJ platform, which this module's plain-JUnit harness deliberately excludes (Phase 79/80 practice). The token classification underneath is unit-tested (BbjStringCommentScannerTest 13/13, BbjLexerStringCommentSourceGuardTest 10/10).
coverage_id: 81-02 D5
result: pass

### 2. Case-insensitive REM toggle round trip (PARITY-03, #540)
steps: Place the caret on a line reading `rem foo`, then `Rem foo`, then `REM foo`, and press Ctrl+/ (Cmd+/ on macOS) on each. Then press it on `remark = 1`. Then toggle an indented line twice. Then select several lines that are all commented and toggle; then select a mixed set and toggle.
expected: Ctrl+/ on `rem foo`, `Rem foo` and `REM foo` removes the prefix instead of producing a doubled prefix. On `remark = 1` (no word boundary) it adds `REM ` in front, giving `REM remark = 1`. Toggling an indented line twice returns its exact original text, with the first toggle's insert at column 0. An all-commented selection uncomments every line; a mixed selection comments every line.
why_human: The Ctrl+/ keystroke round trip needs a live editor and the platform's SelfManagingCommenter dispatch, which the test module excludes. The recognition and strip logic is unit-tested (RemToggleSeamTest 11/11, BbjCommenterSelfManagingSourceGuardTest 7/7).
coverage_id: 81-03 D4
result: pass

### 3. "Compile output directory" settings row (PARITY-01, #571)
steps: Open Settings > Languages & Frameworks > BBj. Confirm a "BBj Compiler" section with a "Compile output directory:" row, a working folder chooser, and hint text visible while the field is empty. Type or choose a directory, click Apply, then reopen Settings. Edit the field again and click Reset.
expected: The section and row are visible with the folder chooser and hint text; the typed value persists across Apply and reopen; the language server restarts on Apply as it does for the other fields; Reset restores the previously saved value without clearing any other field.
why_human: A Swing settings dialog cannot be driven without the IntelliJ platform. Persistence and wiring (isModified/apply/reset, the flat initialization key) are unit- and source-guard-tested (CompilerInitOptionsTest 8/8, CompilerOutputDirectorySourceGuardTest 7/7).
coverage_id: 81-04 D7
result: pass
note: "Initially reported \"not visible\"; re-test passed. Cause was environmental: IntelliJ auto-updated the BBj plugin from the Marketplace mid-session, replacing the locally installed 0.1.0 build. Not a code defect."

### 4. "Compile BBj File" round trip through the language server (PARITY-01, #571)
steps: With a BBj home and a compile output directory configured, invoke Tools > Compile BBj File on a valid `.bbj` file. Then on a file with a syntax error. Then with the output directory setting cleared. Then on an edited-but-unsaved file. Then on a large file while watching IDE responsiveness. Finally confirm the action is hidden for a `.bbl` file and when the server is stopped.
expected: A progress indicator titled "Compiling <file>…" appears, then an information balloon reading `Compiled "<file>"`, and a tokenized file appears in the configured directory. A syntax error shows an error balloon whose body lists the compiler's errors as `line:col message`, with the same text in the language-server console. A cleared output directory shows an error balloon naming the missing setting with a working "Open Settings" action. Editing without saving still compiles the edited content. The IDE stays responsive during a large-file compile. The action stays hidden for `.bbl` files and when the server is not started.
why_human: The action, the balloons and the full save → request → render round trip require the IntelliJ platform and a running language server, which the test module excludes. The wiring is unit- and source-guard-tested (CompileResultPresenterTest 12/12, BbjCompileActionSourceGuardTest 8/8, compile-request.test.ts 12/12).
coverage_id: 81-05 D7
result: issue
reported: "it works, but the error message when a syntax error is in the source file is not useful: Failed to compile xxx.bbj org.eclipse.lsp4j.jsonrpc.MessageIssueException: Message could not be parsed."
severity: major

### 5. Compile-error balloon after the G-81-4 fix (PARITY-01, #571)
steps: Rebuild and install the plugin from this branch (bbj-vscode `npm run build`, then bbj-intellij `./gradlew buildPlugin`; confirm the installed build is the local one, not a Marketplace auto-update). With a BBj home and a compile output directory configured, invoke Tools > Compile BBj File on a `.bbj` file that contains a syntax error. Compare against a valid file to confirm the success balloon still appears.
expected: The syntax-error file shows an error balloon whose body lists the compiler's errors as `line:col message`, and the same text appears in the language-server console. The former `Failed to compile xxx.bbj org.eclipse.lsp4j.jsonrpc.MessageIssueException: Message could not be parsed` no longer appears. The valid file still shows `Compiled "<file>"`.
why_human: The fix (a shared END_OF_LINE_CHARACTER = 2147483647 sentinel replacing Number.MAX_SAFE_INTEGER at both range-emitting sites) is proven on both sides of the JSON-RPC boundary by lsp-position.test.ts, compile-request.test.ts and CompileResultJsonBoundaryTest (LSP4J MessageJsonHandler parse), but the on-screen balloon after a plugin rebuild has not been re-exercised in a live IDE since 81-06 landed.
coverage_id: 81-06 D1
result: issue
reported: "First compile with syntax error produced: java.lang.NoSuchMethodError: 'java.lang.String org.eclipse.lsp4j.Diagnostic.getMessage()' at com.basis.bbj.intellij.compile.CompileResultPresenter.renderOne(CompileResultPresenter.java:156) <- renderDiagnostics(CompileResultPresenter.java:143) <- present(CompileResultPresenter.java:83) <- BbjCompileAction$1.run(BbjCompileAction.java:108) (inside ProgressManager task). Subsequent compiles with syntax error remained silent (no balloon at all)."
severity: blocker

## Summary

total: 5
passed: 3
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-81-3
  status_note: "WITHDRAWN 2026-09-05: not a code defect. IntelliJ auto-updated the plugin from the Marketplace during the UAT session; re-test with the local build shows the row. No fix plan needed."
  truth: "Settings > Languages & Frameworks > BBj shows a 'BBj Compiler' section with a 'Compile output directory:' row (folder chooser + hint text) that persists across Apply/reopen, restarts the language server on Apply, and Reset restores the saved value"
  status: withdrawn
  reason: "User reported: not visible" (environment: Marketplace auto-update replaced the local build; re-test passed)
  severity: major
  test: 3
  root_cause: "Investigation inconclusive - manual review needed. Shipped jar (built 2026-09-05 13:21) verifiably contains BbjSettingsComponent with the 'BBj Compiler' separator and 'Compile output directory:' row, added unconditionally to the single FormBuilder chain; plugin.xml registration under parentId=language unchanged. Remaining hypothesis: a runtime exception in the BbjSettingsComponent constructor (candidate: the (JBTextField) cast on compilerOutputDirectoryField.getTextField() for the empty-text hint) would blank the WHOLE BBj settings page, not just the row. Needs idea.log + confirmation whether the rest of the page rendered."
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java"
      issue: "lines 90-101 add the row; the JBTextField cast at 100-101 is the only novel runtime risk"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java"
      issue: "wiring confirmed correct"
    - path: "bbj-intellij/gradle.properties"
      issue: "plugin version has always been 0.1.0 (pre-existing; IntelliJ may keep a same-version install)"
  missing:
    - "Discriminating live-IDE fact: did the rest of the BBj settings page render, and does idea.log show an exception from BbjSettingsComponent?"
  debug_session: ".planning/debug/compile-output-directory-row-not-visible.md"

- gap_id: G-81-4
  status_note: "FIX SHIPPED 2026-09-05 by gap-closure plan 81-06 (commits 03506428, 744993fb, fc984238): shared END_OF_LINE_CHARACTER = 2147483647 in bbj-vscode/src/language/lsp-position.ts, used by bbj-cpl-parser.ts and bbj-document-validator.ts; pinned by lsp-position.test.ts, compile-request.test.ts and CompileResultJsonBoundaryTest.java. Live re-check is test 5."
  truth: "Compile BBj File on a file with a syntax error shows an error balloon whose body lists the compiler's errors as line:col message, with the same text in the language-server console"
  status: resolved
  resolved_by: 81-06-PLAN.md
  resolved_at: 2026-09-05
  reason: "User reported: it works, but the error message when a syntax error is in the source file is not useful: Failed to compile xxx.bbj org.eclipse.lsp4j.jsonrpc.MessageIssueException: Message could not be parsed."
  severity: major
  test: 4
  root_cause: "parseBbjcplOutput() sets every syntax-error diagnostic's range.end.character to Number.MAX_SAFE_INTEGER (9007199254740991) as an end-of-line stand-in. org.eclipse.lsp4j.Position.character is a Java primitive int (max 2147483647), so when the bbj/compile response carries any diagnostic (exactly the syntax-error case) LSP4J's Gson MessageJsonHandler fails at $.result.diagnostics[0].range.end.character and surfaces MessageIssueException 'Message could not be parsed' before CompileResultPresenter runs. The success path sends diagnostics: [] so no Position is serialized, which is why the happy path works."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-cpl-parser.ts"
      issue: "line 47: end.character = Number.MAX_SAFE_INTEGER, outside Java int range; breaks LSP4J deserialization whenever a diagnostic is present"
    - path: "bbj-vscode/src/language/bbj-document-validator.ts"
      issue: "line 229: same Number.MAX_SAFE_INTEGER end.character pattern on the publishDiagnostics (on-save CPL) path; same int-overflow hazard for JVM LSP clients"
    - path: "bbj-vscode/test/compile-request.test.ts"
      issue: "lines 158-172: compile-errors test asserts only diagnostics.length and .source, never range bounds"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java"
      issue: "lines 149-157: only reads range.start; range.end is unused on the consuming side (no Java change needed to render)"
  missing:
    - "Replace Number.MAX_SAFE_INTEGER with an end-of-line sentinel that fits a Java int (e.g. a shared constant capped at 2147483647, or the actual line length) in bbj-cpl-parser.ts and bbj-document-validator.ts"
    - "Add a cross-boundary regression test that JSON-serializes a compile-errors result and asserts every Position.line/character is a non-negative integer <= 2147483647"
    - "Optionally a Java-side fixture test deserializing a captured compile-errors JSON response through LSP4J's Gson to prove the boundary parses"
  debug_session: ".planning/debug/compile-error-response-message-could-not-be-parsed.md"

- gap_id: G-81-5
  truth: "With the rebuilt plugin, Compile BBj File on a file with a syntax error shows an error balloon listing the compiler's errors as line:col message (same text in the language-server console); the valid file still shows Compiled \"<file>\""
  status: failed
  reason: "User reported: First compile with syntax error produced: java.lang.NoSuchMethodError: 'java.lang.String org.eclipse.lsp4j.Diagnostic.getMessage()' at com.basis.bbj.intellij.compile.CompileResultPresenter.renderOne(CompileResultPresenter.java:156) <- renderDiagnostics(CompileResultPresenter.java:143) <- present(CompileResultPresenter.java:83) <- BbjCompileAction$1.run(BbjCompileAction.java:108) (inside ProgressManager task). Subsequent compiles with syntax error remained silent (no balloon at all)."
  severity: blocker
  test: 5
  root_cause: "Compile-time vs runtime lsp4j API skew. bbj-intellij compiles and tests only against the lsp4j that LSP4IJ 0.19.0 vendors (org.eclipse.lsp4j-0.21.1.jar, where Diagnostic.getMessage() returns String, confirmed by javap). plugin.xml's <depends>com.redhat.devtools.lsp4ij</depends> carries no version pin, so the live IDE resolves/auto-updates LSP4IJ independently; LSP4IJ builds bundling lsp4j >= 0.24.0 changed Diagnostic.getMessage() to return Either<String, MarkupContent> (LSP 3.18 message: string | MarkupContent). Return type is part of the JVM method descriptor, so CompileResultPresenter.renderOne's call site becomes unresolvable the first time a diagnostic is rendered. The success path sends diagnostics: [] and never touches Diagnostic, which is why valid-file compiles work. Tests pass because they share the pinned 0.19.0 classpath. 'Subsequent compiles silent' is explained by the Error being thrown while evaluating present(...) before render()/any notification runs, plus IntelliJ deduplicating repeated identical background-task errors; not independently confirmed against idea.log."
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java"
      issue: "lines 149-157 (renderOne): diagnostic.getMessage() assumes the String-returning signature that only holds for lsp4j < 0.24.0; the only two getMessage() call sites in bbj-intellij/src/main/java (152, 156) match the stack trace"
    - path: "bbj-intellij/src/main/resources/META-INF/plugin.xml"
      issue: "line 8: unpinned <depends>com.redhat.devtools.lsp4ij</depends> lets the runtime LSP4IJ (and its bundled lsp4j) diverge from the Gradle-time 0.19.0 pin"
    - path: "bbj-intellij/build.gradle.kts"
      issue: "line 30: plugin(\"com.redhat.devtools.lsp4ij:0.19.0\") is the only place lsp4j's version is fixed and affects only the build/test classpath"
    - path: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java"
      issue: "shares the pinned classpath, so structurally blind to the runtime skew (12/12 green alongside the live crash)"
  missing:
    - "Version-tolerant diagnostic message access in CompileResultPresenter: a helper that yields the message text whether Diagnostic.getMessage() returns String or Either<String, MarkupContent> (reflective lookup of the accessor, or an LSP4IJ-provided accessor), with a graceful fallback when neither shape resolves"
    - "A test that pins the tolerant behaviour against both return shapes (e.g. a reflection-based fixture or a second lsp4j jar), since the existing suite runs only against the 0.19.0-vendored lsp4j"
    - "Optionally: align the Gradle-time LSP4IJ pin with what current Marketplace LSP4IJ ships (and/or a since-build/version constraint in plugin.xml) so the build fails fast on drift instead of the live IDE"
  debug_session: ".planning/debug/compile-diagnostic-getmessage-nosuchmethoderror.md"

## Deferred Follow-Ups

- test: 3
  idea: "Maybe the interim builds should always be version 999, to be always higher than the online versions? (Local/dev plugin builds are 0.1.0 and get silently replaced by IntelliJ Marketplace auto-update mid-test.)"
  deferred_at: 2026-09-05
