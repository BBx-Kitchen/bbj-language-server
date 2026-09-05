---
status: testing
phase: 81-feature-parity-and-correctness
source: [81-VERIFICATION.md]
started: 2026-09-05T13:05:00Z
updated: 2026-09-05T13:05:00Z
---

## Current Test

number: 1
name: Bracket inertness inside string literals and rem comments (PARITY-02, #568)
expected: |
  No match highlight appears on the parenthesis inside `PRINT "value (not a bracket)"`, Ctrl+Shift+M does not jump, and typing `(` inside the quotes does not auto-insert a closing parenthesis. The same holds inside a `""`-doubled literal and on a `rem (x` comment line. A real code bracket on the same line still highlights, navigates and auto-closes normally, and Ctrl+hover / go-to-definition still underline single words only.
awaiting: user response

## Tests

### 1. Bracket inertness inside string literals and rem comments (PARITY-02, #568)
steps: In a live IDE with the rebuilt plugin, open a `.bbj` file and place the caret on the parenthesis inside `PRINT "value (not a bracket)"`. Repeat inside a doubled-quote literal such as `PRINT "say ""hi"" (ok)"` and on a comment line `rem (x`. Then place the caret on a real code bracket after the string on the same line.
expected: No match highlight, no Ctrl+Shift+M jump, and no auto-close on the bracket inside the literal or comment; a real code bracket on the same line still highlights, navigates and auto-closes; Ctrl+hover / go-to-definition still underline single words only.
why_human: The plugin's editor rendering (bracket-match highlight, Ctrl+Shift+M navigation, auto-close) requires the IntelliJ platform, which this module's plain-JUnit harness deliberately excludes (Phase 79/80 practice). The token classification underneath is unit-tested (BbjStringCommentScannerTest 13/13, BbjLexerStringCommentSourceGuardTest 10/10).
coverage_id: 81-02 D5
result: [pending]

### 2. Case-insensitive REM toggle round trip (PARITY-03, #540)
steps: Place the caret on a line reading `rem foo`, then `Rem foo`, then `REM foo`, and press Ctrl+/ (Cmd+/ on macOS) on each. Then press it on `remark = 1`. Then toggle an indented line twice. Then select several lines that are all commented and toggle; then select a mixed set and toggle.
expected: Ctrl+/ on `rem foo`, `Rem foo` and `REM foo` removes the prefix instead of producing a doubled prefix. On `remark = 1` (no word boundary) it adds `REM ` in front, giving `REM remark = 1`. Toggling an indented line twice returns its exact original text, with the first toggle's insert at column 0. An all-commented selection uncomments every line; a mixed selection comments every line.
why_human: The Ctrl+/ keystroke round trip needs a live editor and the platform's SelfManagingCommenter dispatch, which the test module excludes. The recognition and strip logic is unit-tested (RemToggleSeamTest 11/11, BbjCommenterSelfManagingSourceGuardTest 7/7).
coverage_id: 81-03 D4
result: [pending]

### 3. "Compile output directory" settings row (PARITY-01, #571)
steps: Open Settings > Languages & Frameworks > BBj. Confirm a "BBj Compiler" section with a "Compile output directory:" row, a working folder chooser, and hint text visible while the field is empty. Type or choose a directory, click Apply, then reopen Settings. Edit the field again and click Reset.
expected: The section and row are visible with the folder chooser and hint text; the typed value persists across Apply and reopen; the language server restarts on Apply as it does for the other fields; Reset restores the previously saved value without clearing any other field.
why_human: A Swing settings dialog cannot be driven without the IntelliJ platform. Persistence and wiring (isModified/apply/reset, the flat initialization key) are unit- and source-guard-tested (CompilerInitOptionsTest 8/8, CompilerOutputDirectorySourceGuardTest 7/7).
coverage_id: 81-04 D7
result: [pending]

### 4. "Compile BBj File" round trip through the language server (PARITY-01, #571)
steps: With a BBj home and a compile output directory configured, invoke Tools > Compile BBj File on a valid `.bbj` file. Then on a file with a syntax error. Then with the output directory setting cleared. Then on an edited-but-unsaved file. Then on a large file while watching IDE responsiveness. Finally confirm the action is hidden for a `.bbl` file and when the server is stopped.
expected: A progress indicator titled "Compiling <file>…" appears, then an information balloon reading `Compiled "<file>"`, and a tokenized file appears in the configured directory. A syntax error shows an error balloon whose body lists the compiler's errors as `line:col message`, with the same text in the language-server console. A cleared output directory shows an error balloon naming the missing setting with a working "Open Settings" action. Editing without saving still compiles the edited content. The IDE stays responsive during a large-file compile. The action stays hidden for `.bbl` files and when the server is not started.
why_human: The action, the balloons and the full save → request → render round trip require the IntelliJ platform and a running language server, which the test module excludes. The wiring is unit- and source-guard-tested (CompileResultPresenterTest 12/12, BbjCompileActionSourceGuardTest 8/8, compile-request.test.ts 12/12).
coverage_id: 81-05 D7
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
