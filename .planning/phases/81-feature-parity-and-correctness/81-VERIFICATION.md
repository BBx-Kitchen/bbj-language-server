---
phase: 81-feature-parity-and-correctness
verified: 2026-09-05T12:00:00Z
status: human_needed
score: 3/3 roadmap success criteria verified (24/24 plan-level must-have truths checked against source)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "In a live IDE, open a .bbj file, place the caret on the parenthesis inside `PRINT \"value (not a bracket)\"`."
    expected: "No match highlight appears, Ctrl+Shift+M does not jump, and typing `(` inside the quotes does not auto-insert a closing parenthesis. The same holds inside a `\"\"`-doubled literal and on a `rem (x` comment line. A real code bracket on the same line still highlights/navigates/auto-closes normally, and Ctrl+hover/go-to-definition still underline single words only."
    why_human: "The plugin's editor rendering (bracket-match highlight, Ctrl+Shift+M navigation, auto-close) requires the IntelliJ platform, which C-01 deliberately keeps out of this module's plain-JUnit test harness (Phase 79/80 practice). The token-classification mechanism underneath is unit-tested directly (BbjStringCommentScannerTest 13/13, BbjLexerStringCommentSourceGuardTest 10/10), but the on-screen rendering itself is unverified by any automated test in this repo."
  - test: "In a live IDE, place the caret on a line reading `rem foo`, `Rem foo`, and `REM foo` and press Ctrl+/ (Cmd+/ on macOS); then on `remark = 1`; then toggle an indented line twice; then select several lines with mixed/consistent rem prefixes and toggle."
    expected: "Ctrl+/ on `rem foo`/`Rem foo`/`REM foo` removes the prefix instead of producing a doubled prefix. Ctrl+/ on `remark = 1` (no word boundary) adds `REM ` in front, producing `REM remark = 1`. Toggling an indented line twice returns it to its exact original text, with the first toggle's insert at column 0. A multi-line selection where every line is commented uncomments them all; a mixed selection comments them all."
    why_human: "The Ctrl+/ keystroke round-trip needs a live editor and the platform's SelfManagingCommenter dispatch, which C-01 keeps out of the test module. The underlying recognition/strip logic is unit-tested directly (RemToggleSeamTest 11/11, BbjCommenterSelfManagingSourceGuardTest 7/7), but the on-screen toggle behavior itself is unverified by any automated test in this repo."
  - test: "Open Settings > Languages & Frameworks > BBj; confirm a 'BBj Compiler' section with a 'Compile output directory:' row, a working folder chooser, and hint text visible while empty. Type a directory, click Apply, reopen Settings — value should persist and the language server should restart. Edit the field then click Reset."
    expected: "The section and row are visible with the folder chooser and hint text; the typed value persists across Apply/reopen and the LS restarts on Apply (as it does for other fields); Reset restores the previously saved value without clearing any other field."
    why_human: "A Swing settings dialog cannot be driven without the IntelliJ platform, which C-01 keeps out of this module's test harness. The persistence/wiring (isModified/apply/reset, the flat initialization key) is unit- and source-guard-tested directly (CompilerInitOptionsTest 8/8, CompilerOutputDirectorySourceGuardTest 7/7), but the dialog's on-screen rendering is unverified by any automated test in this repo."
  - test: "With a BBj home and a compile output directory configured, invoke 'Compile BBj File' on a valid .bbj file; then on a file with a syntax error; then with the output directory cleared; then on an edited-but-unsaved file; then on a large file while watching IDE responsiveness; then confirm the action is hidden for a .bbl file and when the server is stopped."
    expected: "A progress indicator titled 'Compiling <file>…' appears, then an information balloon reading 'Compiled \"<file>\"', and a tokenized file appears in the configured directory. A syntax error shows an error balloon whose body lists the compiler's errors as `line:col message`, with the same text in the language-server console. Clearing the output directory shows an error balloon naming the missing setting with a working 'Open Settings' action. Editing without saving still compiles the edited content (confirming the unconditional save). The IDE stays responsive during a large-file compile. The action stays hidden for `.bbl` files and when the server is not started."
    why_human: "The action, the balloons, and the full save→request→render round trip require the IntelliJ platform and a running language server, which C-01 keeps out of the test module (Phase 79/80 practice). The wiring is unit- and source-guard-tested directly (CompileResultPresenterTest 12/12, BbjCompileActionSourceGuardTest 8/8, plus the shared-server-side compile-request.test.ts 12/12), but the live round trip and balloon rendering are unverified by any automated test in this repo."
---

# Phase 81: Feature Parity and Correctness Verification Report

**Phase Goal:** IntelliJ's Compile action, bracket matching, and REM toggle match VS Code's behavior and BBj's actual syntax rules.
**Verified:** 2026-09-05
**Status:** human_needed
**Re-verification:** No — initial verification

## Context

Read all 5 PLAN.md/SUMMARY.md pairs, REQUIREMENTS.md, and the four already-produced gate artifacts (81-VALIDATION.md, 81-SECURITY.md, 81-REVIEW.md, 81-UI-REVIEW.md). None of those artifacts is treated as evidence on its own — every must-have below was checked directly against the source at HEAD `c7eb9bb6` and against fresh test re-runs executed in this verification pass, not against SUMMARY prose.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Invoking "Compile BBj File" in IntelliJ sends a `bbj/compile` request to the shared language server, which runs bbjcpl through the existing `BBjCPLService`, and the action displays success or the returned diagnostics — with no bbjcpl invocation logic duplicated on the IntelliJ side (#571) | ✓ VERIFIED (code + tests) / live round trip → human verification | Full chain read end to end: `BbjCompileAction.actionPerformed` (saves doc, `Task.Backgroundable`, `assertIsNonDispatchThread()` first, calls `BbjComposerServer.compile(new CompileParams(uri))`) → `BbjComposerServer.compile` declared `@JsonRequest("bbj/compile")` on the one interface `BbjLanguageServerFactory.getServerInterface()` returns → server-side `registerCompileRequest(connection, {cplService: BBj.compiler.BBjCPLService, wsManager: ...})` in `main.ts` → `compile-command.ts`'s handler calls `BBjCPLService.compileWithOptions(filePath, compilerArgs)`, which spawns bbjcpl as an argv array (`spawn(bbjcplBin, [...compilerArgs, filePath])`), classifies success on `stderr.trim() === ''` (never exit code), and returns diagnostics rather than publishing them. No `ProcessBuilder`/`GeneralCommandLine`/`resolveBbjBinary` anywhere in `BbjCompileAction.java` (grep confirms 0 occurrences). Balloon rendering keyed on machine-readable `reason` via `CompileResultPresenter`. Re-ran fresh this session: `BbjStringCommentScannerTest`/`RemToggleSeamTest`/`CompileResultPresenterTest` classes all 0 failures (see Behavioral Spot-Checks); `compile-request.test.ts` + `compiler-options-single-table.test.ts` 15/15 passing fresh. Live write-to-disk and balloon rendering are unverifiable without the IntelliJ platform — see Human Verification. |
| 2 | Typing `PRINT "value (not a bracket)"` or a doubled-quote string in a BBj file does not trigger bracket matching, navigation, or auto-close on the parenthesis inside the string literal, verified by regression tests for both cases (#568) | ✓ VERIFIED (code + tests) / live rendering → human verification | `BbjWordLexer.advance()` dispatches to `BbjStringCommentScanner.isCommentStart`/`.scanString` **before** the letter/digit word branch, so a `"` opens a `BbjTokenTypes.STRING` span; the bracket characters inside it are consumed as part of that span and never reach the `case '(' -> LPAREN` branch — they are structurally never classified as bracket tokens (read `BbjWordLexer.java` in full: `isCommentStart(...)` check precedes `c == '"'` precedes `Character.isLetterOrDigit(c)`, which precedes the bracket `switch`). `BbjParserDefinition.getStringLiteralElements()` returns `TokenSet.create(BbjTokenTypes.STRING)` (was `TokenSet.EMPTY`) and `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` returns `contextType != STRING && contextType != COMMENT`. `scanString`'s doubled-quote handling (`pos+1 < end && charAt(pos+1) == '"'` → consume both, continue) directly matches the grammar's `STRING_LITERAL: /"([^"]\|"{2})*"/`. Regression tests exist and pass for both named cases: `printValueNotABracketIsOneStringTokenAndTheParenthesisIsInsideIt`, `aDoubledQuoteInsideAStringDoesNotEndTheLiteral` (plus 11 more edge cases). Fresh re-run: `BbjStringCommentScannerTest` 13/13, 0 failures. Live on-screen non-highlighting is unverifiable without the platform — see Human Verification. |
| 3 | Toggling the line-comment shortcut on a line already prefixed with `rem`, `Rem`, or `REM` (word-bounded) removes the prefix instead of adding a second one, verified by regression tests for lowercase and mixed case (#540) | ✓ VERIFIED (code + tests) / live keystroke → human verification | `BbjCommenter implements Commenter, SelfManagingCommenter<CommenterDataHolder>`; `isLineCommented`/`commentLine`/`uncommentLine` each delegate to `RemToggleSeam.isCommented`/`.comment`/`.uncomment` over the line's text (confirmed by direct read — no inlined `equalsIgnoreCase`/`startsWith` in `BbjCommenter.java`). `RemToggleSeam.isCommented` checks `rem` in any of-case combination followed by space/tab/EOL (word-bounded, matching the grammar's `COMMENT` terminal); `uncomment` strips the prefix plus at most one following space/tab while preserving leading indentation. `plugin.xml`'s existing `lang.commenter` registration already points at `BbjCommenter` — unchanged. Regression tests exist and pass for both named cases: `aLowercaseRemLineIsAlreadyCommentedAndUncommentsToTheOriginalText`, `aMixedCaseRemLineIsAlreadyCommentedAndUncommentsToTheOriginalText` (plus 9 more edge cases: `remark`/`rem15`/`rem$` non-matches, indentation, bare `rem`, locale, concurrency). Fresh re-run: `RemToggleSeamTest` 11/11, `BbjCommenterSelfManagingSourceGuardTest` 7/7, 0 failures. Live Ctrl+/ keystroke behavior is unverifiable without the platform — see Human Verification. |

**Score:** 3/3 roadmap success criteria verified at the code/test level; all three also carry a live-IDE rendering/keystroke confirmation that no automated test in this repo can exercise (C-01's standing decision to exclude the IntelliJ platform test harness) — routed to Human Verification, consistent with Phase 79/80 precedent.

### Plan-Level Must-Haves

All must-have truths across the five plans (81-01 through 81-05) were checked directly against source, not SUMMARY prose. Representative direct-evidence checks beyond the roadmap-level table above:

| # | Must-have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `COMPILER_OPTIONS` exists exactly once in the repository; VS Code's adapter delegates | ✓ VERIFIED | `bbj-vscode/src/Commands/CompilerOptions.ts` imports and re-exports from `../language/compiler-options.js`; `grep -c "flag: '-t'"` in `CompilerOptions.ts` = 0 (no duplicated table). `test/compiler-options.test.ts` (50 pre-existing tests) unedited and passing. |
| 2 | bbjcpl spawned as an argv array, never a shell string | ✓ VERIFIED | `spawn(bbjcplBin, [...compilerArgs, filePath])` in `bbj-cpl-service.ts:272`; no string concatenation into a shell command anywhere in `compile-command.ts`/`bbj-cpl-service.ts`. |
| 3 | Success classified as empty stderr, never exit status, never empty-diagnostics-as-success | ✓ VERIFIED | `compileWithOptions`'s `close` handler: `settle({ success: stderr.trim() === '', stderr, diagnostics: parseBbjcplOutput(stderr) })` — no reference to `proc.exitCode`/`signalCode` in the file (grep, comment-filtered, = 0 for both). |
| 4 | `bbj/compile`'s diagnostics never published as editor markers | ✓ VERIFIED | `grep -v comment compile-command.ts \| grep -c publishDiagnostics/sendDiagnostics` = 0; `BbjCompileAction.java` never turns diagnostics into editor markers — they flow only into `CompileResultPresenter`'s balloon/console text. |
| 5 | Compile output directory reaches the server via flat `initializationOptions.compilerOutputDirectory`, not `config.compiler` | ✓ VERIFIED | `BbjLanguageServerFactory.java`: `options.addProperty(CompilerInitOptions.COMPILER_OUTPUT_DIRECTORY_KEY, CompilerInitOptions.normalizeOutputDirectory(state.compilerOutputDirectory))` inside `initializeParams`, before `params.setInitializationOptions(options)`. Server-side `bbj-ws-manager.ts`'s `onInitialize` reads `params.initializationOptions.compilerOutputDirectory` in the same style as `compilerTrigger`. `BbjLanguageClient.java` confirmed unchanged (no `compilerOutputDirectory` reference). |
| 6 | `BbjSettings.State.compilerOutputDirectory` persisted, empty by default; dialog row wired through isModified/apply/reset | ✓ VERIFIED | `BbjSettings.java:34`; `BbjSettingsComponent.java` has `compilerOutputDirectoryField` (a `TextFieldWithBrowseButton`) with getter/setter; `BbjSettingsConfigurable.java` carries the field through `isModified` (line 56), `apply` (line 79, before `scheduleRestart()`), and `reset` (line 155). |
| 7 | `BbjStringCommentScanner`/`RemToggleSeam` carry no IntelliJ platform import (C-01) | ✓ VERIFIED | Both files read in full — zero `com.intellij` imports; both are plain, stateless, private-constructor final classes. |
| 8 | `bbj/compile` request never blocks the EDT | ✓ VERIFIED | `Task.Backgroundable.run()`'s first statement is `ApplicationManager.getApplication().assertIsNonDispatchThread()`, ahead of `BbjComposerService.server(project).get(...)` and `server.compile(...).get(...)` — only the document save (required to run on the dispatch thread) precedes the background task. |
| 9 | The action's `update()` gating unchanged (`.bbj`/`.bbx`/`.src`, server started, `.bbl` excluded) | ✓ VERIFIED | `update()` unchanged in content from the plan's description — `ext.equals("bbj") \|\| ext.equals("bbx") \|\| ext.equals("src")`, `ServerStatus.started` gate, `.bbl` never matched. (Noted, non-blocking: `81-REVIEW.md` WR-04 flags this comparison as case-sensitive, inconsistent with the codebase's stated case-insensitivity elsewhere — a real but non-critical robustness gap already tracked by the review gate, not a phase-goal failure.) |

**Note on a REVIEW.md finding (WR-01), checked directly:** `BBjWorkspaceManager.setCompilerConfig` (`bbj-ws-manager.ts:296-301`) does `this.compilerConfig = { ...this.compilerConfig, ...config }` — a shallow, top-level merge. The doc comment above it and one 81-01 must-have both claim a pushed config "can never erase" a seeded `output.directory`; that claim is only true for a pushed object that omits the `output` key entirely (exactly what `compile-request.test.ts`'s regression test exercises: `setCompilerConfig({ trigger: 'off' })`). A pushed object that *does* carry a partial `output` key (e.g. `{ output: { validateOnly: true } }`) would, under this implementation, replace the whole `output` object and could erase a previously-seeded `directory`. Confirmed directly in source — this is a real latent gap in a shared module, already caught and disposed as a non-critical warning by the phase's own code-review gate (`81-REVIEW.md` WR-01, `findings.critical: 0`). It does not affect IntelliJ's compile flow in practice: IntelliJ never sends a nested `config.compiler` push (confirmed — `main.ts`'s `config.compiler !== undefined` branch is VS-Code-only, and each IDE drives its own separate language-server process), so the escape hatch cannot fire against an IntelliJ-seeded value. Not treated as a phase-blocking gap; recorded here for visibility since it directly concerns a must-have's literal wording.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/compiler-options.ts` | vscode-free shared option table + guard predicate | ✓ VERIFIED | Read in full; `COMPILER_OPTIONS`, `buildCompileOptionsFrom`, `validateOptionsFrom`, `readerFromCompilerConfig`, `lacksExplicitOutputLocation` all present; no `vscode` import. |
| `bbj-vscode/src/language/compile-command.ts` | `bbj/compile` handler, `CompileResult`/`CompileFailureReason` | ✓ VERIFIED | Read in full; nine-value reason vocabulary present, handler translates `CompileRun` correctly, never publishes diagnostics. |
| `bbj-vscode/src/language/bbj-cpl-service.ts` | `compileWithOptions` beside untouched `compile` | ✓ VERIFIED | Read in full; `compile(filePath)` byte-identical in shape to its documented behavior (abort-on-resave map, 30s timeout, ENOENT handling); `compileWithOptions` never touches `inFlight`. |
| `bbj-vscode/src/language/bbj-ws-manager.ts` | `compilerConfig`/`getCompilerConfig`/`setCompilerConfig`, flat-key seed | ✓ VERIFIED (with WR-01 caveat above) | Read in full. |
| `bbj-vscode/src/language/main.ts` | `registerCompileRequest` wired after `createBBjServices` | ✓ VERIFIED | Line 46-49, exactly once. |
| `bbj-intellij/.../lexer/BbjStringCommentScanner.java` | plain-Java scan seam | ✓ VERIFIED | Read in full; no platform import, no fields. |
| `bbj-intellij/.../BbjTokenTypes.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java` | STRING/COMMENT token types wired | ✓ VERIFIED | Read in full. |
| `bbj-intellij/.../commenter/RemToggleSeam.java`, `BbjCommenter.java` | toggle seam + SelfManagingCommenter | ✓ VERIFIED | Read in full. |
| `bbj-intellij/.../lsp/CompilerInitOptions.java`, `BbjSettings.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`, `BbjLanguageServerFactory.java` | setting + normalisation seam + wiring | ✓ VERIFIED | Read in full. |
| `bbj-intellij/.../compile/CompileModels.java`, `CompileResultPresenter.java`, `composer/BbjComposerServer.java`, `actions/BbjCompileAction.java` | DTOs, rendering seam, request method, action | ✓ VERIFIED | Read in full; every one of the nine reasons has a distinct titleTail; unknown/null reason still renders a visible error (`titleTail = ": " + reason` in the default/null branches). |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `main.ts` | `compile-command.ts` | `registerCompileRequest(connection, {cplService, wsManager})` | ✓ WIRED |
| `compile-command.ts` | `bbj-cpl-service.ts` | `compileWithOptions(fsPath, buildCompileOptionsFrom(read))` | ✓ WIRED |
| `compile-command.ts` | `compiler-options.ts` | `readerFromCompilerConfig`, `lacksExplicitOutputLocation`, `validateOptionsFrom`, `buildCompileOptionsFrom` | ✓ WIRED |
| `Commands/CompilerOptions.ts` | `language/compiler-options.ts` | re-export + two adapter functions | ✓ WIRED |
| `BbjWordLexer.java` | `BbjStringCommentScanner.java` | `isCommentStart`/`scanComment`/`scanString` dispatched ahead of the word branch | ✓ WIRED |
| `BbjParserDefinition.java` | `BbjTokenTypes.java` | `TokenSet.create(BbjTokenTypes.STRING\|COMMENT)` | ✓ WIRED |
| `BbjPairedBraceMatcher.java` | `BbjTokenTypes.java` | `contextType != BbjTokenTypes.STRING/.COMMENT` | ✓ WIRED |
| `BbjCommenter.java` | `RemToggleSeam.java` | `isLineCommented`/`commentLine`/`uncommentLine` delegate | ✓ WIRED |
| `BbjLanguageServerFactory.java` | `BbjSettings.java`/`CompilerInitOptions.java` | `initializeParams` reads `state.compilerOutputDirectory` through the seam | ✓ WIRED |
| `BbjSettingsConfigurable.java` | `BbjSettingsComponent.java` | `isModified`/`apply`/`reset` carry the field | ✓ WIRED |
| `BbjCompileAction.java` | `BbjComposerServer.java` | `server.compile(new CompileParams(uri))` | ✓ WIRED |
| `BbjComposerServer.java` | `compile-command.ts` | `@JsonRequest("bbj/compile")` name/shape match | ✓ WIRED |
| `BbjCompileAction.java` | `CompileResultPresenter.java` | every balloon field sourced from `Presentation` | ✓ WIRED |
| `BbjCompileAction.java` | `BbjServerService.java` | `logToConsole(...)` on failure | ✓ WIRED |

### Behavioral Spot-Checks (fresh re-run this session)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Server-side `bbj/compile` handler (success, refusals, unparsed stderr, concurrency) | `cd bbj-vscode && npx vitest run test/compile-request.test.ts test/compiler-options-single-table.test.ts` | `Test Files 2 passed (2)`, `Tests 15 passed (15)` | ✓ PASS |
| IntelliJ lexer scanner (bracket-inert strings/comments) | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.lexer.*' --tests 'com.basis.bbj.intellij.commenter.*' --tests 'com.basis.bbj.intellij.compile.*' --rerun` | BUILD SUCCESSFUL; XML results confirm `RemToggleSeamTest` tests=11 failures=0, `CompileResultPresenterTest` tests=12 failures=0, `BbjStringCommentScannerTest` tests=13 failures=0 | ✓ PASS |
| No debt markers introduced by this phase | Grep for `TODO\|FIXME\|XXX\|HACK\|PLACEHOLDER` across all 20 phase-touched production files | 2 hits, both `TODO` in `bbj-ws-manager.ts` lines 15 and 272 — `git blame` confirms both pre-date this phase (2023 commits `477f0b6e`, `c757a8d6`), untouched by phase 81 | ✓ PASS (no new markers) |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` files exist in this repository and no plan/summary references probe-based verification.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| PARITY-01 | 81-01, 81-04, 81-05 | `bbj/compile` request, IntelliJ setting, IntelliJ action (#571) | ✓ SATISFIED (code); live round trip → human verification | See Truth #1 above |
| PARITY-02 | 81-02 | Bracket inertness inside string literals (#568) | ✓ SATISFIED (code); live rendering → human verification | See Truth #2 above |
| PARITY-03 | 81-03 | Case-insensitive REM toggle (#540) | ✓ SATISFIED (code); live keystroke → human verification | See Truth #3 above |

No orphaned requirements — `REQUIREMENTS.md`'s traceability table maps exactly PARITY-01/02/03 to Phase 81 (all "Complete"), and every one of the five plans' `requirements:` frontmatter field claims exactly one of these three IDs, matching 1:1. `git log` HEAD confirmed at `c7eb9bb6`, matching the commit the orchestrator specified.

### Anti-Patterns Found

None introduced by this phase. The two `TODO` markers found by the phase-wide grep both pre-date Phase 81 (confirmed via `git blame`, commits from 2023). No `FIXME`/`XXX`/`HACK`/`PLACEHOLDER`/`TBD` anywhere in the 20 files this phase created or modified. The four `81-REVIEW.md` warnings (WR-01 through WR-04) and the `81-UI-REVIEW.md` copywriting/experience findings are real, non-critical robustness/polish gaps already caught and disposed by this phase's own review gates (`findings.critical: 0` in both) — they do not invalidate any of the three roadmap success criteria as literally stated, and are not re-litigated here as new gaps. WR-01 is called out above because it directly concerns a plan-level must-have's exact wording.

### Human Verification Required

See frontmatter `human_verification` (4 items) — one per plan area (compile action round trip, bracket inertness, REM toggle, settings dialog). All four exist because this repo's IntelliJ test module deliberately carries no platform test harness (C-01, a standing decision inherited from Phase 79/80): every mechanism underneath each behavior (token classification, prefix recognition/stripping, request/response wiring, settings persistence) is covered by direct, passing JUnit 5/vitest tests re-run fresh in this session, but the on-screen rendering and live keystroke/action behavior cannot be exercised by any test in this repository.

### Gaps Summary

No gaps found. All three roadmap success criteria are structurally, behaviorally (at the unit level), and end-to-end wired in source, with zero critical findings from the phase's own review/security/UI gates and zero new debt markers. The phase cannot be marked `passed` because — consistent with every prior phase in this milestone that touches live IntelliJ UI (Phase 79, Phase 80) — the on-screen/keystroke confirmation of all three fixes requires a running IDE that this environment's test harness cannot provide by design. This is the same disposition Phase 80's verification used and is not a defect introduced by this verification pass.

---

*Verified: 2026-09-05*
*Verifier: Claude (gsd-verifier)*
