# Phase 81: Feature Parity and Correctness - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Three IntelliJ correctness fixes that make the plugin match VS Code and BBj's actual syntax rules:

1. **#571 / PARITY-01** — "Compile BBj File" becomes a real compile: the action sends a new `bbj/compile` request to the shared language server, which runs bbjcpl through the existing `BBjCPLService` and returns success or diagnostics; no bbjcpl invocation logic on the IntelliJ side.
2. **#568 / PARITY-02** — the IntelliJ word lexer becomes string-literal aware so bracket characters inside `"..."` (including `""`-doubled quotes) are inert for bracket matching, navigation and auto-close.
3. **#540 / PARITY-03** — the line-comment toggle recognises `rem` / `Rem` / `REM` (word-bounded) as already commented and removes the prefix instead of adding a second one.

Out of scope: the full BBjCPL compiler-option UI in IntelliJ (PAR-V2-04), any change to VS Code's own `bbj.compile` command, and the two reviewed todos listed under Deferred Ideas.

</domain>

<decisions>
## Implementation Decisions

### Verified state of the code (2026-09-05)

- `bbj-vscode/src/language/bbj-cpl-service.ts` — `BBjCPLService.compile(filePath)` spawns `bbjcpl -N <file>` (validate only, nothing written), parses stderr into LSP diagnostics via `parseBbjcplOutput`, and feeds the debounced / on-save background compile in `bbj-document-builder.ts`. Abort-on-resave (per-file `inFlight` map), 30 s timeout, ENOENT degradation, and `resolveBbjBinary` guarding are all in that class. bbjcpl diagnostics therefore already reach IntelliJ's editor as `source: 'BBjCPL'` squiggles whenever BBj home is configured.
- VS Code's `bbj.compile` (`bbj-vscode/src/Commands/Commands.cjs` `compile`, ~lines 298-345) is a different feature: it validates the 18 `bbj.compiler.*` options with `validateOptions`, builds argv with `buildCompileOptions` (`bbj-vscode/src/Commands/CompilerOptions.ts`, which imports `vscode`) and `buildCompileArgv` (`bbj-vscode/src/Commands/process-args.ts`), spawns bbjcpl itself, and shows `Successfully compiled "<file>"` or `Failed to compile "<file>": … Details: <stderr>`. It never produces diagnostics. With default options (`output.validateOnly` false, no `output.directory`) it is a real compile.
- Custom LS requests already follow one pattern: `bbj/refreshJavaClasses` (`bbj-vscode/src/language/main.ts`) and the `bbj/composer/*` family (`bbj-vscode/src/language/composer-commands.ts`); on the IntelliJ side `BbjComposerServer` (`@JsonRequest` interface extending `LanguageServer`) is registered by `BbjLanguageServerFactory.getServerInterface()` and resolved via `BbjComposerService.server(project)` (`LanguageServerManager.getLanguageServer("bbjLanguageServer")`). Gson DTOs live in `ComposerModels`.
- The LS reads client configuration in `main.ts`'s `onDidChangeConfiguration` (push `change.settings.bbj`, else pull `workspace.getConfiguration('bbj')`) and already consumes `config.compiler.trigger`. IntelliJ's `BbjLanguageClient.createSettings()` sends a flat `{home, classpath, logLevel}` JsonObject and nothing under `compiler`.
- `BbjWordLexer` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java`) is a hand-written scanner emitting WORD / SYMBOL / six bracket token types; `"` falls through to SYMBOL. `BbjParserDefinition.getStringLiteralElements()` and `getCommentTokens()` both return `TokenSet.EMPTY`; `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` returns `true` unconditionally.
- `BbjCommenter` returns the literal `"REM "` line prefix; IntelliJ's line-comment handler compares that literal case-sensitively.
- Grammar reference (`bbj-vscode/src/language/bbj.langium` ~lines 923-951): `COMMENT: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/`, `STRING_LITERAL: /"([^"]|"{2})*"/`, `MNEMONIC: /'[0-9a-zA-Z_]*'/`. Mnemonic bodies cannot contain brackets.
- IntelliJ test classpath is plain JUnit 5 with no IntelliJ platform test framework (Phase 79 D-01, Phase 80 D-01 still hold). Existing seams: `concurrency/` (`Scheduler`, `ThreadProbe`, `RestartGate`, `KeystrokeDebouncer`, `ManualScheduler`), `DownloadGuard`, `BbjNodeVersionCache`, `JwtValidity`, `OwnerOnlyAcl`, `BackendNoticePolicy`, `TokenValidationCache`; source-guard style in `src/test/java/com/basis/bbj/intellij/lsp/*SourceGuardTest.java` and `actions/*SourceGuardTest.java`.

### Carried forward (locked by Phases 79/80 — do not re-open)

- **C-01:** Every fix is a plain-Java seam with no IntelliJ imports, covered by behavioural JUnit 5 tests, plus one source-guard test per production wiring site. No new test framework, no `testFramework(TestFrameworkType.Platform)`, no `BasePlatformTestCase`.
- **C-02:** Tests are written red-then-green; each issue's acceptance-criteria wording is the literal target of at least one test name (for #568: `PRINT "value (not a bracket)"` and a doubled-quote string; for #540: a lowercase `rem` line and a mixed-case `Rem` line).
- **C-03:** Nothing blocking runs on the EDT; process work and LS round-trips go through pooled threads / `Task.Backgroundable`. Phase 79's `assertIsNonDispatchThread` convention applies to the new compile path.
- **C-04:** Landing follows v4.1/Phase 80 practice: public PRs per plan or per phase, issue numbers in comments are fine, no advisory ids (none apply here).

### Compile semantics and options (#571, PARITY-01)

- **D-01:** `bbj/compile` is a **real compile with VS Code parity**: the LS runs bbjcpl **without** `-N`, honouring compiler options, so it writes tokenized output exactly as VS Code's default compile does. `BBjCPLService` gains an **options-aware entry point beside** the existing `-N` path; the background diagnostics path (`compile(filePath)`, abort-on-resave, timeout, ENOENT handling) keeps its current behaviour and callers. — **Reversibility:** costly — `bbj/compile` becomes a client-facing request contract that the IntelliJ plugin ships against; changing its semantics later means coordinating a plugin and LS release.
- **D-02:** The **LS builds the argv from its own `bbj.compiler.*` configuration** (the object `main.ts` already receives per client). The option table / `buildCompileOptions` / `validateOptions` logic is re-homed into a **`vscode`-free module under `bbj-vscode/src/language/`** (or shared code the LS can import). One option table, shared by both IDEs. VS Code today sends all 18 keys; IntelliJ sends only what D-05 adds, so everything else takes bbjcpl defaults.
- **D-03:** **VS Code's `bbj.compile` command is left untouched** in this phase. Whether `Commands/CompilerOptions.ts` is refactored to import the re-homed table is Claude's discretion, provided VS Code's compile behaviour and its existing tests do not change. Re-pointing VS Code to `bbj/compile` is a deferred idea.
- **D-04:** The IntelliJ action **always saves the current document first** (bbjcpl compiles the file on disk), independent of `autoSaveBeforeRun`.
- **D-05:** **Refuse in-place output.** When the effective options would write the tokenized program over the source (no `-d` output directory and no `-N`), `bbj/compile` **rejects with a structured error** instead of running bbjcpl. This rule **lives in the language server** (one rule for every client, unit-tested in vitest); IntelliJ only renders the message. So that the action is usable, IntelliJ gets **one new setting, "Compile output directory"**, in `BbjSettings` / `BbjSettingsComponent`, forwarded to the LS as `bbj.compiler.output.directory` through the existing `BbjLanguageClient.createSettings()` object (nested as the LS expects). This is deliberately not the full option UI (PAR-V2-04). — **Reversibility:** reversible — one setting field and one guard branch; loosening it later is a one-line change.
- **D-06 (research item):** Research must confirm (a) bbjcpl's default output location when no `-d`/`-o` is given (the in-place-overwrite premise of D-05), and (b) how LSP4IJ delivers `createSettings()` to the LS (push `settings.bbj` vs. pull `workspace/configuration`) so `compiler.output.directory` lands where the LS reads `config.compiler`. If (a) turns out not to overwrite, D-05's guard still applies to whatever combination does.

### Compile result surfacing (#571, PARITY-01)

- **D-07:** Results are shown as **balloon notifications in VS Code's style**, in the existing `"BBj Language Server"` notification group: success → info balloon `Compiled "<file>"`; failure → error balloon carrying the bbjcpl messages (the returned diagnostics rendered as `line:col message` text, or the raw stderr when nothing parses). Failures are also logged to the LS console tool window via `BbjServerService.logToConsole`. No jump-to-error links in this phase.
- **D-08:** `bbj/compile` **returns** its diagnostics to the caller and does **not** publish them into the document's diagnostics. Editor squiggles stay with the existing background `-N` path; no double reporting.
- **D-09:** The action runs as a **`Task.Backgroundable` with a progress indicator** (`Compiling <file>…`) off the EDT. When the compile cannot run — BBj home not configured, bbjcpl missing, output directory unset (D-05), server not running, request failure — the user gets a **clear error balloon naming the cause**, with an **"Open Settings" action** where a setting is the fix. The action's existing `update()` gating (BBj source file + server started, `.bbl` excluded) stays.
- **D-10:** Request/response shape is Claude's discretion within these constraints: params identify the file by URI; the result carries at least `success`, the diagnostics list (LSP `Diagnostic` shape, as `BBjCPLService` already produces), and a machine-readable reason for refusals (D-05) and unavailability, so IntelliJ can pick the balloon text and the "Open Settings" action without string-matching messages. Mirror the `bbj/composer/*` conventions (plain JSON, Gson DTO on the IntelliJ side, `@JsonRequest` on a server interface registered via `getServerInterface()`).

### String and comment lexing scope (#568, PARITY-02)

- **D-11:** `BbjWordLexer` learns **two new token kinds: STRING and COMMENT**. STRING is a double-quoted literal where `""` is an escaped quote (grammar `STRING_LITERAL`). COMMENT is word-bounded `rem` in any case followed by space/tab/end-of-line, running to end of line (grammar `COMMENT`); `remark`, `rem15`, `rem$` stay identifiers. Mnemonics (`'...'`) are **not** tokenized specially — their bodies cannot contain brackets and the parentheses after a mnemonic are real. — **Reversibility:** reversible.
- **D-12:** An **unterminated `"` runs to end of line only**; the next line lexes normally so a missing quote never disables bracket matching for the rest of the file.
- **D-13:** Wiring: `BbjTokenTypes` gains `STRING` and `COMMENT`; `BbjParserDefinition.getStringLiteralElements()` returns `{STRING}` and `getCommentTokens()` returns `{COMMENT}`; `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` returns `false` when the context type is STRING or COMMENT. Bracket characters inside either token are never emitted as bracket tokens, which is what makes matching, Ctrl+Shift+M navigation and auto-close inert there.
- **D-14:** The scanning logic is a **plain-Java seam** (no IntelliJ imports; e.g. a scanner that yields `(start, end, kind)` over a `CharSequence`) that `BbjWordLexer` wraps. Behavioural tests drive the seam with `PRINT "value (not a bracket)"`, a `""`-doubled string, an unterminated string followed by a bracketed line, and a `rem (x` comment line; source-guards assert the three wiring sites in D-13. Existing WORD/SYMBOL/bracket behaviour outside strings and comments is unchanged (LSP4IJ navigation relies on the word tokens).

### REM toggle mechanics (#540, PARITY-03)

- **D-15:** `BbjCommenter` implements IntelliJ's **`SelfManagingCommenter`**, so the plugin decides itself whether a line is commented and how to strip the prefix, delegating to a **plain-Java seam** (`isCommented(line)` / `comment(line)` / `uncomment(line)`, names at planner's discretion) tested by JUnit. The lexer COMMENT token from D-11 is not relied on for the toggle. — **Reversibility:** reversible.
- **D-16:** Commenting **inserts `REM `** (uppercase, as today and as VS Code's language configuration does). Only recognition becomes case-insensitive.
- **D-17:** Recognition: optional leading whitespace, then `rem` in any case, followed by a space, a tab, or end of line (word-bounded exactly like the grammar's `COMMENT` terminal). Uncomment removes `rem` **plus one following space or tab**, so `REM foo` round-trips to `foo` and a bare `rem` line becomes empty. Indentation is preserved.
- **D-18:** Regression tests name the acceptance wording: toggling a lowercase-prefixed `rem` line and a mixed-case-prefixed `Rem` line both report "already commented" and uncomment to the original text; `remark = 1` is not commented. A source-guard asserts `BbjCommenter` implements `SelfManagingCommenter` and delegates to the seam. Multi-line selection semantics follow IntelliJ's default (all lines commented → uncomment).

### Claude's Discretion

- Exact `bbj/compile` request/result DTO fields and names (within D-10), the timeout for the explicit compile (the background path's 30 s is a reasonable default), and whether the explicit compile shares or bypasses the per-file abort-on-resave map.
- Module name/location of the re-homed compiler-option table, and whether `Commands/CompilerOptions.ts` imports it now (D-03 constraint).
- Settings-dialog placement and label of the new output-directory field, and whether it gets a directory chooser.
- Seam class names, test file placement (`lsp/` vs mirrored packages — Phase 79/80 mixed both), and source-guard scoping (substrings vs small regexes).
- Plan split; a natural shape is three plans mirroring the three issues, with the compile plan possibly split LS-side / IntelliJ-side. Each plan red-then-green (C-02).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 81 goal, success criteria 1-3, dependency on Phase 78; Phase 83 (BUILD-05) expects a canary/source-guard on the new `bbj/compile` surface.
- `.planning/REQUIREMENTS.md` — PARITY-01, PARITY-02, PARITY-03 wording; PAR-V2-04 (full compiler-option UI deferred); Out of Scope table.
- `.planning/PROJECT.md` — v4.2 milestone goals and "Out of this milestone" list.
- GitHub issues #571, #568, #540 (`gh issue view`) — evidence, failure scenarios, acceptance criteria.

### Conventions carried forward
- `.planning/phases/79-edt-responsiveness/79-CONTEXT.md` — D-01/D-02/D-03 seam + source-guard test pattern, off-EDT rules, `Scheduler`/`ThreadProbe` seams.
- `.planning/phases/80-em-token-security/80-CONTEXT.md` — D-01/D-02 red-then-green convention, D-19 landing practice.
- `.planning/phases/78-build-test-foundation/78-CONTEXT.md` — Gradle/JDK 17 toolchain; `./gradlew test` and `buildPlugin` proofs.

### Code that this phase changes or builds on
- `bbj-vscode/src/language/bbj-cpl-service.ts` — `BBjCPLService` (`-N` background path to keep; new options-aware entry point).
- `bbj-vscode/src/language/bbj-cpl-parser.ts` — `parseBbjcplOutput` (stderr → Diagnostics).
- `bbj-vscode/src/language/bbj-document-builder.ts` — background compile trigger wiring (must remain unchanged in behaviour).
- `bbj-vscode/src/language/main.ts` — `onDidChangeConfiguration` config intake and the `bbj/refreshJavaClasses` request pattern.
- `bbj-vscode/src/language/composer-commands.ts` — `bbj/composer/*` custom-request registration pattern.
- `bbj-vscode/src/Commands/Commands.cjs` (`compile`), `bbj-vscode/src/Commands/CompilerOptions.ts`, `bbj-vscode/src/Commands/process-args.ts` (`buildCompileArgv`, `bbjcplBin`) — VS Code's compile flow that D-01/D-02 mirror; behaviour must not change (D-03).
- `bbj-vscode/src/language/bbj.langium` ~923-951 — `COMMENT`, `STRING_LITERAL`, `MNEMONIC` terminals that D-11/D-17 mirror.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` — the action to implement.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java`, `BbjComposerService.java`, `ComposerModels.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` — LSP4IJ custom-request pattern to extend.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` — `createSettings()` where `compiler.output.directory` is added.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java` — new output-directory setting.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — `logToConsole`, notification group, `getCurrentStatus`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java`, `BbjTokenTypes.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java`, `BbjCommenter.java` — lexer and commenter sites.
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — `bbj.compile` action, `lang.commenter`, `lang.braceMatcher` registrations.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/*SourceGuardTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/*Test.java` — test style to follow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BBjCPLService` already resolves bbjcpl via `resolveBbjBinary`, spawns it, parses stderr into diagnostics, and degrades gracefully; the new entry point reuses all of that and only changes the argv and the "return, don't publish" contract.
- VS Code's `COMPILER_OPTIONS` table, `buildCompileOptions`, `validateOptions` (`CompilerOptions.ts`) and `buildCompileArgv` (`process-args.ts`, already `vscode`-free) are the option logic to re-home.
- `BbjComposerServer` / `BbjComposerService` / `ComposerModels` show exactly how an IntelliJ action calls a custom LS request and handles the "server not running" null.
- `BbjServerService` provides the console log, the notification group and the server status the action already gates on.
- Phase 79/80 seams and `ManualScheduler` show the injectable-seam test style; `*SourceGuardTest` classes show source-text assertions.

### Established Patterns
- Custom requests use the `bbj/…` namespace with plain JSON params/results; Gson DTO field names must match JSON keys exactly.
- LS configuration arrives as a `bbj` object; nested keys mirror VS Code setting ids (`compiler.trigger`, `compiler.output.directory`).
- Plain-Java seams keep IntelliJ platform types out of tested code; source-guards pin the wiring.
- Run actions and EM login already do their process work on pooled threads with `assertIsNonDispatchThread`.

### Integration Points
- `main.ts`: register `bbj/compile` next to `bbj/refreshJavaClasses` (or inside a small module like `composer-commands.ts`).
- `BbjLanguageServerFactory.getServerInterface()`: the server interface must grow the compile request (either extend `BbjComposerServer` or introduce a combined interface).
- `BbjLanguageClient.createSettings()`: add the nested `compiler` object.
- `BbjParserDefinition` / `BbjPairedBraceMatcher` / `plugin.xml`: token-set and commenter wiring.
- Phase 83 (BUILD-05) will add LSP4IJ canary/source-guard coverage on the new compile request surface; keep the coupling to LSP4IJ confined to the same few `lsp/` files.

</code_context>

<specifics>
## Specific Ideas

- "Compile" in IntelliJ must mean what it means in VS Code (a real compile), but the user explicitly does not want it to silently overwrite the source: an in-place compile is refused by the server, and IntelliJ gains just the one output-directory setting needed to make the action usable.
- Balloons should read like VS Code's: `Compiled "<file>"` / `Failed to compile "<file>": …` with the bbjcpl messages in the body.
- Uncommenting must round-trip: `REM foo` → `foo`, `rem foo` → `foo`, `Rem foo` → `foo`; `remark = 1` is code.

</specifics>

<deferred>
## Deferred Ideas

- **Migrate VS Code's `bbj.compile` to the shared `bbj/compile` request** so both IDEs run one implementation and VS Code also gets the refuse-in-place guard. Out of this milestone (VS Code side); the LS request is designed so this is a drop-in later.
- **Jump-to-error links in the compile failure balloon** — considered under D-07, not taken; a natural follow-on once PAR-V2-04 lands.
- **Full compiler-option UI in IntelliJ** — PAR-V2-04, already tracked in REQUIREMENTS.md v2.
- **MNEMONIC token in the IntelliJ lexer** — no bracket impact; only worth it if a later feature needs mnemonic awareness.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — "Strip EM Config `--` sentinel in getConfigPathArg and Commands.cjs run": run-action bug in `BbjRunActionBase` / `Commands.cjs`, unrelated to #571/#568/#540. Stays pending.
- `.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — "Update live-interop tests for the upgraded java-interop backend": vitest drift against the :5008 backend, not IntelliJ. Stays pending.

</deferred>

---

*Phase: 81-feature-parity-and-correctness*
*Context gathered: 2026-09-05*
