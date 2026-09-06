# Phase 81: Feature Parity and Correctness - Research

**Researched:** 2026-09-05
**Domain:** Language-server custom-request design (bbjcpl compile invocation), LSP4IJ client/settings plumbing, IntelliJ lexer/PairedBraceMatcher/Commenter internals
**Confidence:** HIGH — every priority item in CONTEXT.md's D-06 was resolved with executed evidence (real `bbjcpl` binary runs, `javap` disassembly of the exact `lsp4ij-0.19.0.jar` shipped in this container, and direct reads of every cited source file), not training-data recall.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Verified state of the code (2026-09-05)** — see CONTEXT.md `<decisions>` for the full paragraph; summarized: `BBjCPLService.compile(filePath)` spawns `bbjcpl -N <file>`; VS Code's `bbj.compile` is a separate feature (`Commands.cjs`, `CompilerOptions.ts`, `process-args.ts`); custom LS requests follow `bbj/refreshJavaClasses` and `bbj/composer/*`; the LS reads client config in `main.ts`'s `onDidChangeConfiguration`; `BbjWordLexer`/`BbjParserDefinition`/`BbjPairedBraceMatcher`/`BbjCommenter` have no string/comment awareness today; grammar terminals `COMMENT`/`STRING_LITERAL`/`MNEMONIC` are at `bbj.langium` ~923-951; IntelliJ tests are plain JUnit 5 with source-guard style.
- **Carried forward (locked by Phases 79/80):** C-01 plain-Java seam + source-guard per wiring site, no new test framework; C-02 red-then-green, acceptance wording is the literal test-name target; C-03 nothing blocking on EDT; C-04 public PRs, no advisory ids.
- **Compile semantics (D-01 to D-06):** `bbj/compile` is a real compile with VS Code parity (no `-N`), via a new options-aware `BBjCPLService` entry point beside the existing `-N` path. The LS builds argv from its own `bbj.compiler.*` config, re-homed into a `vscode`-free module (D-02). VS Code's `bbj.compile` command is untouched (D-03). IntelliJ always saves the current document first (D-04). The LS refuses in-place output (no `-d` and no `-N`) with a structured error; IntelliJ gets one new "Compile output directory" setting forwarded as `bbj.compiler.output.directory` through `BbjLanguageClient.createSettings()` (D-05). D-06 asked research to confirm bbjcpl's default output behavior and the LSP4IJ config-delivery mechanism — **both are answered below, and the second overturns the literal mechanism D-05 assumed; the guard itself still stands.**
- **Compile result surfacing (D-07 to D-10):** Balloon notifications in the "BBj Language Server" group, VS-Code-style text (D-07). `bbj/compile` returns diagnostics, does not publish them (D-08). Runs as `Task.Backgroundable` off the EDT with a clear error balloon + "Open Settings" action when unusable (D-09). Request/result shape is Claude's discretion within: file by URI, `success` + diagnostics + machine-readable reason, mirroring `bbj/composer/*` conventions (D-10).
- **String/comment lexing (D-11 to D-14):** `BbjWordLexer` learns STRING (`"..."`, `""` escapes) and COMMENT (word-bounded `rem`/any case) token kinds; mnemonics are not touched (D-11). Unterminated `"` runs to end of line only (D-12). `BbjTokenTypes` gains STRING/COMMENT; `getStringLiteralElements()`/`getCommentTokens()` return them; `isPairedBracesAllowedBeforeType` returns false for STRING/COMMENT context (D-13). Scanning logic is a plain-Java seam wrapped by `BbjWordLexer` (D-14).
- **REM toggle (D-15 to D-18):** `BbjCommenter` implements `SelfManagingCommenter`, delegating to a plain-Java seam (D-15). Commenting still inserts `REM ` uppercase; only recognition is case-insensitive (D-16). Recognition: optional leading whitespace, `rem` any case, then space/tab/EOL; uncomment removes `rem` plus one following space/tab, preserving indentation (D-17). Regression tests name the acceptance wording; a source-guard asserts the `SelfManagingCommenter` wiring (D-18).

### Claude's Discretion

- Exact `bbj/compile` request/result DTO fields and names (within D-10), the explicit-compile timeout, and whether it shares or bypasses the per-file abort-on-resave map.
- Module name/location of the re-homed compiler-option table, and whether `Commands/CompilerOptions.ts` imports it now.
- Settings-dialog placement and label of the new output-directory field, and whether it gets a directory chooser.
- Seam class names, test file placement, source-guard scoping.
- Plan split; a natural shape is three plans mirroring the three issues, with the compile plan possibly split LS-side / IntelliJ-side.

### Deferred Ideas (OUT OF SCOPE)

- Migrate VS Code's `bbj.compile` to the shared `bbj/compile` request (future milestone; the LS request is designed so this is a drop-in later).
- Jump-to-error links in the compile failure balloon.
- Full compiler-option UI in IntelliJ (PAR-V2-04).
- MNEMONIC token in the IntelliJ lexer.
- Two reviewed todos (EM Config `--` sentinel; live-interop `getAllClassNames` test drift) — unrelated to #571/#568/#540, stay pending.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PARITY-01 | "Compile BBj File" in IntelliJ sends `bbj/compile` to the LS, which invokes bbjcpl through `BBjCPLService`, surfacing success/diagnostics; no bbjcpl logic duplicated in IntelliJ (#571) | bbjcpl default-output-behavior falsification (Common Pitfalls #1); LSP4IJ config-delivery trace (Common Pitfalls #2, the D-06 answer); `bbj/composer/*` pattern to mirror (Code Examples); `BBjCPLService`/`bbj-cpl-parser.ts` internals and the always-exit-0 success-classification pitfall (Common Pitfalls #3) |
| PARITY-02 | STRING token so bracket chars inside string literals (incl. `""`) are inert for matching/navigation/auto-close, tested for `PRINT "value (not a bracket)"` and doubled quotes (#568) | `BbjWordLexer`/`BbjTokenTypes`/`BbjParserDefinition`/`BbjPairedBraceMatcher` current state (Code that this phase changes); grammar `STRING_LITERAL`/`COMMENT` terminals verbatim (Architecture Patterns); IntelliJ platform version 2024.2/build 242 confirmed compatible |
| PARITY-03 | Line-comment toggle recognizes `rem`/`Rem`/`REM` (word-bounded) as already commented, removes prefix instead of doubling (#540) | `SelfManagingCommenter` interface method list (javap-verified, Code Examples); `LINE_COMMENT_AT_FIRST_COLUMN` interaction pitfall (Common Pitfalls #4) |
</phase_requirements>

## Summary

This phase is a pure internal-correctness pass on code that already exists — no new external packages, no new frameworks. Research therefore focused entirely on **falsifying the assumptions embedded in CONTEXT.md's locked decisions** by running the real `bbjcpl` binary and disassembling the real `lsp4ij-0.19.0.jar` shipped in this dev container, per the D-06 research mandate. Two findings materially change how the planner should sequence work, even though neither overturns a locked decision:

1. **bbjcpl's default (no `-d`, no `-N`) behavior does NOT overwrite the source file.** It writes a *sibling* file with the `.bbj` extension added or stripped (whichever the source doesn't already have), leaving the source byte-identical. bbjcpl has its **own** built-in overwrite guard (`"<path>: error: bbjcpl will not overwrite source file without -F"`, printed to stderr, exit code still 0) for the one case where the derived name collides with the source (e.g. `-X`/keep-extension). D-05's guard is still the right design — the user explicitly anticipated this outcome ("If (a) turns out not to overwrite, D-05's guard still applies to whatever combination does") — but the RESEARCH must correct the *premise* so the planner doesn't write tests or comments asserting a false "always overwrites in place" mechanism.
2. **The literal mechanism in D-06(b) does not work.** Disassembling `LanguageClientImpl`/`SettingsLanguageListener`/`SettingsHelper` shows: (a) the **push** path (`triggerChangeConfiguration()` → `workspace/didChangeConfiguration`) is *only* ever called by LSP4IJ's own generic per-server settings listener, which the BBj plugin never populates — nothing in `bbj-intellij` calls it, so it never fires for a `BbjSettings` change; and (b) the **pull** path (`workspace/configuration`, `section: "bbj"`) resolves against `BbjLanguageClient.createSettings()`'s *flat* JSON object (`{home, classpath, logLevel}`, no `"bbj"` wrapper key), and `SettingsHelper.findSettings("bbj", obj)` returns **null** for that shape (traced instruction-by-instruction below). Nesting `compiler.output.directory` inside `createSettings()`, as D-06 assumed, will therefore never reach `main.ts`'s `config.compiler` read for IntelliJ. The value that *does* reliably reach the LS today is delivered through a **third, separate channel**: `BbjLanguageServerFactory.createClientFeatures().initializeParams()`'s flat `initializationOptions` JsonObject, consumed once in `bbj-ws-manager.ts`'s `onInitialize` — exactly how `compilerTrigger` already works. Settings changes reach IntelliJ's LS via a full restart (`BbjSettingsConfigurable.java` line 86), which re-sends fresh `initializationOptions`, so this channel self-refreshes without needing push/pull at all.

**Primary recommendation:** Implement `compiler.output.directory` for IntelliJ as a **flat `initializationOptions` key** (e.g. `compilerOutputDirectory`), read once in `bbj-ws-manager.ts`'s existing `onInitialize` handler exactly like `compilerTrigger`, and stored on `BBjWorkspaceManager` with a new getter that `BBjCPLService`'s options-aware entry point (or the `bbj/compile` handler) reads directly — not through `config.compiler` at request time. Keep `BbjLanguageClient.createSettings()`'s addition (if the planner still wants it for future pull-model support) as a **non-load-bearing** addition; do not make correctness depend on it this phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| bbjcpl process invocation, argv construction, options validation | API / Backend (LS) | — | Single source of truth per D-01/D-02; no bbjcpl logic in either IDE client |
| Compile-result classification (success vs. diagnostics vs. fatal stderr) | API / Backend (LS) | — | `bbj/compile` handler; must not delegate to IntelliJ string-matching (D-10) |
| Compile-output-directory setting storage | Frontend Server (SSR-equivalent: LS process state) | Browser/Client (IntelliJ Settings UI) | Value is entered in IntelliJ's Settings dialog but the guard and the argv build both live in the LS |
| Balloon/notification rendering | Browser / Client (IntelliJ) | — | D-07: IntelliJ renders; LS only returns structured data |
| Bracket/string/comment token classification | Browser / Client (IntelliJ lexer) | — | `BbjWordLexer` is IntelliJ-only; the LS's Langium lexer already has these terminals (grammar `STRING_LITERAL`/`COMMENT`) and is unaffected |
| REM toggle recognition | Browser / Client (IntelliJ Commenter) | — | Editor-action-local; no LS round-trip |

## Standard Stack

No new external packages are introduced by this phase. All work reuses libraries already present.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| LSP4IJ | 0.19.0 [VERIFIED: `/home/coder/.gradle/caches/modules-2/files-2.1/com.jetbrains.plugins/com.redhat.devtools.lsp4ij/0.19.0/...` — the exact jar this build resolves] | LSP client/server bridge for IntelliJ | Already the plugin's only LSP integration; `getServerInterface()`/`@JsonRequest` is the established custom-request mechanism |
| IntelliJ Platform SDK | 2024.2 / build 242 [VERIFIED: `bbj-intellij/build.gradle.kts:28` `intellijIdeaCommunity("2024.2")`, `:78` `sinceBuild = "242"`] | `SelfManagingCommenter`, `PairedBraceMatcher`, `LexerBase` | Existing plugin platform target; `SelfManagingCommenter` confirmed present in this exact SDK jar |
| lsp4j / lsp4j.jsonrpc | 0.21.1 / 0.21.0 [VERIFIED: jar filenames under `lsp4ij/lib/`: `org.eclipse.lsp4j.jsonrpc-0.21.1.jar`, `org.eclipse.lsp4j.jsonrpc.debug-0.21.0.jar`] | `@JsonRequest`, `LanguageServer` interface, `CompletableFuture` proxying | Already used by `BbjComposerServer` |
| Gson | (bundled with LSP4IJ classpath) | DTO (de)serialization for custom requests | Already used by `ComposerModels` |
| Vitest | project-pinned (`bbj-vscode/package.json`) | LS-side unit tests (`bbj-cpl-service.ts`, `bbj-cpl-parser.ts`, the new options module) | Existing convention; `test:cpl-service.test.ts`/`cpl-parser.test.ts` already model spawn-based tests |
| JUnit 5 (`useJUnitPlatform()`) [VERIFIED: `bbj-intellij/build.gradle.kts:42`] | project-pinned | Plain-Java seam tests + source guards | C-01/C-02 mandate |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flat `initializationOptions` key for `compilerOutputDirectory` | Nested `createSettings()` object + fixing `SettingsHelper`'s wrapping | Fixing the generic pull path is much larger surface (would also need to either wrap `createSettings()`'s whole object under `"bbj"` — risking every other consumer of that object — or call `triggerChangeConfiguration()` explicitly on every settings apply, a behavior LSP4IJ doesn't wire for us). The flat-key channel is proven (identical to `compilerTrigger`) and requires touching only 2 files. |
| Custom regex-based `getDidChangeConfigurationListener` hookup | LSP4IJ's built-in `LanguageClientImpl` machinery | Out of scope; would be a framework-level change to a dependency, not this plugin |

### Installation
No install step — no new dependencies.

## Package Legitimacy Audit

**N/A — no external packages are added or upgraded in this phase.** All libraries used (LSP4IJ 0.19.0, IntelliJ Platform 2024.2, lsp4j, Gson, Vitest, JUnit 5) are pre-existing pinned dependencies untouched by this phase's scope.

## Architecture Patterns

### System Architecture Diagram — `bbj/compile` request flow

```
IntelliJ "Compile BBj File" action (Alt+C / Tools menu / EditorPopupMenu)
        │  (update(): gated on BBj source file + server ServerStatus.started)
        ▼
actionPerformed()
        │  1. save current document (D-04, unconditional)
        │  2. Task.Backgroundable("Compiling <file>…", off-EDT) [D-09]
        ▼
BbjComposerService-style resolver: LanguageServerManager
  .getLanguageServer("bbjLanguageServer") → proxy cast to the
  server interface returned by BbjLanguageServerFactory.getServerInterface()
        │  (null ⇒ "server not running" balloon, D-09)
        ▼
@JsonRequest("bbj/compile")  CompletableFuture<CompileResult> compile(CompileParams)
        │  LSP4IJ dynamic proxy → JSON-RPC over the LS connection
        ▼
connection.onRequest('bbj/compile', handler)   [main.ts, alongside bbj/refreshJavaClasses]
        │
        ▼
resolve effective bbj.compiler.* options
   (LS-side, vscode-free module — D-02)
   home/classpath/etc: from BBjWorkspaceManager (populated at onInitialize
   from flat initializationOptions keys — SAME channel as compilerTrigger,
   NOT the createSettings()/onDidChangeConfiguration nested-config channel)
        │
        ▼
D-05 guard: no output.directory AND no validateOnly? ──yes──▶ reject
        │ no                                                  (structured
        ▼                                                       reason, no
BBjCPLService's NEW options-aware entry point                   bbjcpl spawn)
   (beside the existing compile(filePath) -N path — unchanged)
        │  spawn(bbjcplBin, [...optionArgv, fileName])   (never -N here)
        ▼
stderr/stdout capture (exit code ALWAYS 0 — cannot signal failure)
        │
        ▼
result classification:
   stderr.trim() === '' ⇒ success
   else ⇒ failure; parseBbjcplOutput(stderr) for line-diagnostics,
          PLUS raw stderr text for lines that don't match
          "<path>: error at line N (M): ..." (setup/fatal errors —
          see Common Pitfall #3)
        │
        ▼
CompileResult { success, diagnostics: Diagnostic[], reason? } returned
   (NOT published to textDocument/publishDiagnostics — D-08)
        │
        ▼
IntelliJ balloon: success → "Compiled "<file>"" (info)
                  failure → "Failed to compile "<file>": …" (error, D-07)
   + BbjServerService.logToConsole(...) on failure
```

### System Architecture Diagram — STRING/COMMENT lexing

```
BbjWordLexer.advance()  (per-char scan over CharSequence)
   │
   ├─ '"' seen ─────────────▶ plain-Java string-scan seam
   │                          consume until closing '"' or unescaped
   │                          run-to-EOL (D-12); "" inside = escaped quote
   │                          → emits BbjTokenTypes.STRING
   │
   ├─ word-boundary 'rem' (any case) followed by
   │  space/tab/EOL, NOT followed by [\w!$%@] ──▶ comment-scan seam
   │                          consume to end of line
   │                          → emits BbjTokenTypes.COMMENT
   │
   └─ everything else ──────▶ existing WORD/SYMBOL/bracket logic (unchanged)

BbjParserDefinition.getStringLiteralElements() → {STRING}
BbjParserDefinition.getCommentTokens()         → {COMMENT}
BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType(_, contextType)
   → false when contextType ∈ {STRING, COMMENT}, else true (unchanged)
        │
        ▼
Bracket matching / Ctrl+Shift+M navigation / auto-close engine
(IntelliJ platform code, not ours) treats brackets inside STRING/COMMENT
as inert because they were never classified as LPAREN/RPAREN/etc tokens —
the fix is entirely in what the lexer EMITS, not in the brace matcher's pairs
```

### Recommended Project Structure (files touched, no new directories)
```
bbj-vscode/src/language/
├── bbj-cpl-service.ts          # + options-aware entry point (new method, existing compile() untouched)
├── bbj-cpl-parser.ts           # possibly + a second parse helper for non-line-specific stderr (see Pitfall #3)
├── bbj-ws-manager.ts           # + compilerOutputDirectory field + onInitialize read (mirrors compilerTrigger)
├── main.ts                     # + connection.onRequest('bbj/compile', ...)
├── compiler-options.ts (NEW?)  # re-homed vscode-free COMPILER_OPTIONS/buildCompileOptions (D-02)
bbj-vscode/src/Commands/
├── CompilerOptions.ts          # unchanged behavior (D-03); may import the re-homed module (discretion)
bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── BbjWordLexer.java           # + string/comment seam wiring
├── BbjTokenTypes.java          # + STRING, COMMENT
├── BbjParserDefinition.java    # + getStringLiteralElements/getCommentTokens
├── BbjPairedBraceMatcher.java  # + isPairedBracesAllowedBeforeType logic
├── BbjCommenter.java           # + implements SelfManagingCommenter<CommenterDataHolder>
├── actions/BbjCompileAction.java  # + real request dispatch, Task.Backgroundable
├── lsp/BbjLanguageServerFactory.java  # + compilerOutputDirectory in initializeParams JsonObject
├── lsp/BbjLanguageClient.java  # (discretion) + compiler.output.directory in createSettings()
├── BbjSettings.java / BbjSettingsComponent.java / BbjSettingsConfigurable.java  # + new field
├── composer/ (or a new package)  # bbj/compile server-interface extension + DTOs, mirroring ComposerModels
```

### Pattern 1: Options-aware BBjCPLService entry point beside the existing `-N` path
**What:** A second public method on `BBjCPLService` that accepts a resolved argv (or an options object) instead of hardcoding `['-N', filePath]`, and classifies success by `stderr.trim() === ''` rather than by diagnostic count.
**When to use:** Only for the explicit `bbj/compile` request; the debounced background path (`compile(filePath)`) keeps calling the existing method unmodified (locked by D-01).
**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-cpl-service.ts (existing compile() method,
// read this session — the new method should follow the identical spawn/timeout/
// inFlight-map/ENOENT-handling shape, swapping only the argv and the settle() logic)
async compile(filePath: string): Promise<Diagnostic[]> {
    const bbjcplBin = this.getBbjcplPath();
    // ... existing -N invocation, abort-on-resave inFlight map, 30s timeout ...
    proc = spawn(bbjcplBin, ['-N', filePath]);
    // ...
    settle(parseBbjcplOutput(stderr));
}
```

### Pattern 2: `SelfManagingCommenter` skeleton (javap-verified method list)
**What:** The exact 11 abstract methods `BbjCommenter` must implement, disassembled from the real platform jar this build compiles against.
**When to use:** D-15's wiring.
**Example:**
```java
// Source: javap -p disassembly of com/intellij/codeInsight/generation/SelfManagingCommenter.class
// inside .../ideaIC-2024.2/lib/util-8.jar (this build's exact platform SDK, sinceBuild=242)
public interface SelfManagingCommenter<T extends CommenterDataHolder> {
    T createLineCommentingState(int line, int offset, Document document, PsiFile file);
    T createBlockCommentingState(int startLine, int endLine, Document document, PsiFile file);
    void commentLine(int line, int offset, Document document, T state);
    void uncommentLine(int line, int offset, Document document, T state);
    boolean isLineCommented(int line, int offset, Document document, T state);
    String getCommentPrefix(int line, Document document, T state);
    TextRange getBlockCommentRange(int selectionStart, int selectionEnd, Document document, T state);
    String getBlockCommentPrefix(int selectionStart, Document document, T state);
    String getBlockCommentSuffix(int selectionEnd, Document document, T state);
    void uncommentBlockComment(int startOffset, int endOffset, Document document, T state);
    TextRange insertBlockComment(int startOffset, int endOffset, Document document, T state);
    // static field: SelfManagingCommenter.EMPTY_STATE (a CommenterDataHolder singleton) —
    // BbjCommenter's seam is stateless, so createLineCommentingState can just return EMPTY_STATE.
}
```
`SelfManagingCommenter` does **not** extend `Commenter` at the bytecode level (`super_class: java/lang/Object`, `interfaces: 0`) [VERIFIED: javap disassembly, `SelfManagingCommenter.class` constant pool]; `BbjCommenter` must keep implementing `Commenter` (for `getLineCommentPrefix()` etc., still read by other framework call sites) **and add** `SelfManagingCommenter<CommenterDataHolder>` — both interfaces on the one class, matching D-15's wording ("implements IntelliJ's `SelfManagingCommenter`", not "replaces `Commenter`").

### Anti-Patterns to Avoid
- **Trusting bbjcpl's exit code:** it is always 0 [VERIFIED: empirical — every scenario tested below, including the fatal "Invalid output directory" case, exited 0]. The existing comment in `bbj-cpl-parser.ts` line 23 already documents this for the `-N` path; the new options-aware path must not regress this by adding an exit-code check.
- **Assuming `createSettings()` alone delivers a new nested key to IntelliJ:** disproven below (Common Pitfall #2). Route new LS-bound settings through `initializationOptions` unless you also wire an explicit `triggerChangeConfiguration()` call.
- **Re-deriving bbjcpl's own extension-flip naming logic in the LS to detect "would overwrite":** unnecessary — D-05's simpler rule (require `-d` or `-N`, full stop) is both what the user locked and sufficient; don't over-engineer a predictor for bbjcpl's naming rule.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| bbjcpl argv construction | A parallel option table on the IntelliJ side | The re-homed `vscode`-free module (D-02), imported only by the LS | Single source of truth; IntelliJ never spawns bbjcpl (PARITY-01's explicit requirement) |
| bbjcpl success/failure detection | A custom exit-code check | `stderr.trim() === ''` plus `parseBbjcplOutput` for line diagnostics, with raw-stderr fallback for anything the regex misses | Exit code is always 0 (see Pitfall #1/#3); this is empirically the only reliable signal |
| Cross-IDE settings sync framework | A generic "push settings to LS" abstraction for IntelliJ | The existing "settings change → full LS restart → fresh `initializationOptions`" flow already wired in `BbjSettingsConfigurable.java` | Already proven, already tested (Phase 79/80); building a push-model on top of `triggerChangeConfiguration()` would be new, untested surface for one setting |
| String/comment-aware lexing | A full BBj grammar port into the IntelliJ lexer | The plain-Java scan seam (D-14), driven only by the two grammar terminals needed | Standing decision: no native IntelliJ lexer/parser rewrite (REQUIREMENTS.md Out of Scope) |

**Key insight:** every "don't hand-roll" here is really "don't invent a second implementation of something the LS (or the platform) already does once" — this phase is entirely about routing three IntelliJ-side gaps through existing, shared, single-source-of-truth mechanisms.

## Common Pitfalls

### Pitfall 1: bbjcpl's default (no `-d`, no `-N`) behavior is NOT "overwrite the source in place"
**What goes wrong:** A test or code comment asserting "compiling `foo.bbj` with no options overwrites `foo.bbj`" is factually wrong and will not reproduce.
**Why it happens:** bbjcpl's actual default naming rule flips the `.bbj` extension: given `test1.bbj` it writes `test1` (extension stripped); given `test2` (no extension) it writes `test2.bbj` (extension added) — always as a **new sibling file**, never touching the source. [VERIFIED: empirical — `/opt/bbx/bin/bbjcpl /tmp/.../test1.bbj` (no flags) produced `/tmp/.../test1` (352 bytes, tokenized), left `test1.bbj` byte-identical to the pre-compile copy (`diff` confirmed identical); the inverse case with an extensionless source produced a `.bbj`-suffixed sibling, source untouched.] Only when the *derived* output name collides with the input (e.g. `-X`/keep-extension, or an explicit same-extension `-x`) does bbjcpl refuse: `"<path>: error: bbjcpl will not overwrite source file without -F"` on stderr, **exit code still 0**, source still untouched. [VERIFIED: empirical — `bbjcpl -X test3.bbj` printed exactly that line and left `test3.bbj` unmodified; a second identical invocation reproduced the same refusal.]
**How to avoid:** Keep D-05's guard exactly as locked (refuse whenever neither `-d` nor `-N` is present) — it is still correct and simpler than trying to predict bbjcpl's naming rule — but write the guard's rationale/tests around "we require an explicit output location for safety," not "bbjcpl would otherwise clobber the source."
**Warning signs:** A test that copies a source file, compiles with default options, and asserts the source file changed will fail (the source never changes in the default case).

### Pitfall 2: `compiler.output.directory` inside `createSettings()` does not reach `main.ts`'s `config.compiler` for IntelliJ (the D-06 answer)
**What goes wrong:** Following D-06's literal path — add a nested key to `BbjLanguageClient.createSettings()`'s JsonObject and expect `main.ts`'s `onDidChangeConfiguration` to see it via `config.compiler.output.directory` — silently does nothing on IntelliJ. The setting will appear to "not work" with no error anywhere.
**Why it happens (traced with `javap -p -c` on the exact `lsp4ij-0.19.0.jar`, `com.redhat.devtools.lsp4ij.client.*` classes, this session):**
- **Push is dead for BBj settings.** `LanguageClientImpl.triggerChangeConfiguration()` is the only method that sends `workspace/didChangeConfiguration`. Its only caller anywhere in the jar is `SettingsLanguageListener.handleChanged(LanguageServerSettingsChangedEvent)`, which fires only from LSP4IJ's own `GlobalLanguageServerSettings`/`ProjectLanguageServerSettings` (its generic "user-defined language server" settings UI). `bbj-intellij` never touches those APIs for `BbjSettings` [VERIFIED: `grep -rn "triggerChangeConfiguration" bbj-intellij/src` → no matches this session]. Settings changes instead trigger a full LS restart: [VERIFIED: `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:86` `// Trigger debounced language server restart`].
- **Pull resolves to null for a flat object.** `main.ts`'s fallback is `connection.workspace.getConfiguration('bbj')` [VERIFIED: `bbj-vscode/src/language/main.ts:109`], which the Node `vscode-languageserver` package turns into `ConfigurationParams{items:[{section:'bbj'}]}` [VERIFIED: `bbj-vscode/node_modules/vscode-languageserver/lib/common/configuration.js:45-56`, `getConfiguration(arg)` → `_getConfiguration({section: arg})`]. On the IntelliJ side this becomes `LanguageClientImpl.configuration(ConfigurationParams)` → for the one item, `findSettings("bbj")` → `createSettings()` (called fresh — always current `BbjSettings` state) → `SettingsHelper.findSettings("bbj", jsonObject)`. Traced instruction-by-instruction: (1) `jsonObject.has("bbj")` is false (top-level keys are `home`/`classpath`/`logLevel`, never `"bbj"`); (2) the dotted-path descent (`"bbj".split(".")` = `["bbj"]`) tries `jsonObject.has("bbj")` again inside the same root — also false, so `found=false`; (3) falls through to the deep-copy filter, which removes every top-level key whose own single-segment name isn't literally `"bbj"` — i.e. **all of them** — leaving an empty object, which the method converts to `null`. `main.ts` then hits `if (!config) return;` and applies nothing.
**How to avoid:** Add the new value as a **flat** `initializationOptions` key (e.g. `compilerOutputDirectory`) in `BbjLanguageServerFactory.createClientFeatures().initializeParams()` [VERIFIED: `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:44-56`, the exact JsonObject that already carries `home`/`classpath`/`javaInteropHost`/`javaInteropPort`/`configPath`], and read it once in `bbj-ws-manager.ts`'s `onInitialize` [VERIFIED: `bbj-vscode/src/language/bbj-ws-manager.ts:89-95`, the `compilerTrigger` block — the new field follows this exact shape], storing it on `BBjWorkspaceManager` alongside `bbjdir`/`classpathFromSettings`/`configPath` with a new getter. Because settings changes already restart the LS, this channel self-refreshes with no further wiring. Adding the key to `createSettings()` too is harmless (future-proofing for VS Code parity/pull-model fixes) but must not be load-bearing this phase.
**Warning signs:** A UAT check that changes the IntelliJ output-directory setting, restarts nothing, and expects the *next* compile to pick it up without a restart — under the current architecture this requires the restart (or an explicit `triggerChangeConfiguration()` call the planner would have to add net-new). Confirm with the user whether "changes apply without restart" is actually a requirement; CONTEXT.md doesn't ask for it, and the existing settings-apply flow already restarts.

### Pitfall 3: bbjcpl's fatal/setup-error stderr lines don't match `parseBbjcplOutput`'s regex
**What goes wrong:** A `bbj/compile` call against a misconfigured/deleted output directory reports `success: true` with an empty diagnostics array — the worst possible failure mode, since the user gets no feedback that nothing happened.
**Why it happens:** `parseBbjcplOutput`'s `ERROR_LINE_RE` only matches lines shaped `"<path>: error at line N (M): ..."` [VERIFIED: `bbj-vscode/src/language/bbj-cpl-parser.ts:18`, `const ERROR_LINE_RE = /^.+:\s+error at line \d+ \((\d+)\):\s*(.*)/;`]. Two real bbjcpl stderr shapes don't match this: (a) the overwrite-refusal line from Pitfall 1 (`"<path>: error: bbjcpl will not overwrite source file without -F"`) [VERIFIED: empirical, `bbjcpl -X <file>` on a valid source]; (b) invalid-output-directory fatal errors, which print **two** lines to stderr — `"Directory <path> does not exist.  Exiting..."` and `"stdin: error: Invalid output directory"` — again exit code 0 [VERIFIED: empirical, `bbjcpl -d<nonexistent-dir> <file>` 2>&1 split, both lines confirmed on stderr via separate stdout/stderr capture].
**How to avoid:** The new options-aware entry point's success classification must be `stderr.trim() === ''` (not `diagnostics.length === 0`). When `stderr` is non-empty but `parseBbjcplOutput` yields zero diagnostics, treat the call as a failure and surface the raw stderr text — which is exactly what D-07 already anticipated ("or the raw stderr when nothing parses"). Confirm this classification is implemented in the new code path, not assumed to fall out of reusing `parseBbjcplOutput` alone.
**Warning signs:** A regression test that only checks `diagnostics.length > 0` for the "bad config" case will pass even if the classification bug ships; test `success === false` explicitly for a non-empty-stderr/zero-diagnostics case (e.g. a `bbj.compiler.output.directory` pointed at a nonexistent path).

### Pitfall 4: `SelfManagingCommenter` bypasses `LINE_COMMENT_AT_FIRST_COLUMN`
**What goes wrong:** Today, `BbjLanguageCodeStyleSettingsProvider` sets `commonSettings.LINE_COMMENT_AT_FIRST_COLUMN = true` [VERIFIED: `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java:23`, `commonSettings.LINE_COMMENT_AT_FIRST_COLUMN = true;`], which the platform's *generic* (non-self-managing) comment-toggle algorithm reads to decide whether to insert the prefix at column 0 or at the line's indentation. Once `BbjCommenter` becomes `SelfManagingCommenter`, the platform delegates entirely to `commentLine`/`uncommentLine` — this setting is not consulted for a self-managing commenter's insert position.
**Why it happens:** Self-managing commenters take full ownership of the toggle; the generic algorithm (which reads `LINE_COMMENT_AT_FIRST_COLUMN`) is bypassed once the interface is implemented.
**How to avoid:** `commentLine`'s seam implementation must explicitly insert `"REM "` at column 0 of the line (not at the line's current indentation) to preserve today's forced behavior, matching D-16 ("Commenting inserts `REM ` … as today"). `isLineCommented`/`uncommentLine` should still tolerate optional leading whitespace before `rem` when *recognizing* (per D-17, since older files or pasted text may have indented `REM`), but new inserts stay at column 0.
**Warning signs:** A regression test that comments an indented line and asserts the `REM ` prefix appears at the line's indentation level (rather than column 0) encodes the wrong expectation; verify against `BbjLanguageCodeStyleSettingsProvider`'s existing sample (`"REM Sample BBj code\nPRINT \"Hello World\"\n"`).

### Pitfall 5: `getServerInterface()` returns exactly one `Class<? extends LanguageServer>`
**What goes wrong:** Attempting to register `bbj/compile` on a brand-new sibling interface without updating `BbjLanguageServerFactory.getServerInterface()` leaves the method unreachable — LSP4IJ only builds a dynamic proxy for the single interface that factory method returns.
**Why it happens:** [VERIFIED: `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:33-37`, `getServerInterface()` currently returns `BbjComposerServer.class`.] Every custom-request family must live on that one interface (or an interface it extends).
**How to avoid:** Either add the `@JsonRequest("bbj/compile")` method directly to `BbjComposerServer` (simplest, mirrors the existing pattern exactly, if a naming mismatch with "composer" is acceptable) or introduce a new interface that extends `BbjComposerServer` and point `getServerInterface()` at the new one. Either is fine; just don't create a second unrelated interface without updating this one factory method.
**Warning signs:** `BbjComposerService.server(project).thenApply(item -> (BbjComposerServer) item.getServer())`-style casts throwing `ClassCastException` at runtime if a new, unregistered interface is cast to instead.

## Code Examples

### bbjcpl invocation observed in this session (verbatim outputs)
```
# Default (no -d, no -N): extension-flip naming, source untouched
$ /opt/bbx/bin/bbjcpl /tmp/.../test1.bbj
(no output; exit 0)
$ ls /tmp/.../
test1        # tokenized program (352 bytes) — NEW sibling file
test1.bbj    # source, byte-identical to before (diff confirmed)

# -X (keep extension): output name collides with source -> bbjcpl self-refuses
$ /opt/bbx/bin/bbjcpl -X /tmp/.../test3.bbj
/tmp/.../test3.bbj: error: bbjcpl will not overwrite source file without -F
(exit 0; source untouched)

# -d with a valid directory: output keeps the SAME name+extension, in that directory
$ /opt/bbx/bin/bbjcpl -d/tmp/.../out /tmp/.../test4.bbj
(no output; exit 0)
$ ls /tmp/.../out
test4.bbj    # tokenized, same name as source, in the -d directory

# -d with a directory that does not exist: fatal, two lines on stderr, exit STILL 0
$ /opt/bbx/bin/bbjcpl -d/tmp/.../nope /tmp/.../test6.bbj
Directory /tmp/.../nope does not exist.  Exiting...
stdin: error: Invalid output directory

# usage text (bbjcpl -? / -h)
usage: bbjcpl [-x<ext> | -X] [-d<directory>] [-e<errorlog>] [-t] [-Pprefix|-cconfig.bbx]
  [-W] [-r] [-n] [-D] [-s#] [-i#] [--renum] [-p[password]] [-R] [-N] [-F] [-CPclasspath]
  [--verbose] [-@flist] f1 f2 ...
```

### `bbj/composer/*` custom-request pattern to mirror for `bbj/compile`
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:51-52, 204-208 (read this session)
export const composerHandlers = {
    'bbj/composer/catalogs': () => ({ /* ... */ }),
    // ... one entry per method, plain JSON in/out ...
} as const;

export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```
```java
// Source: bbj-intellij/.../composer/BbjComposerServer.java:25,28-29 (read this session)
public interface BbjComposerServer extends LanguageServer {
    @JsonRequest("bbj/composer/catalogs")
    CompletableFuture<ComposerCatalogs> composerCatalogs();
    // bbj/compile would be added here (or on a new interface extending this one — Pitfall 5)
}
```
```java
// Source: bbj-intellij/.../composer/BbjComposerService.java:23-29 (read this session)
public static @NotNull CompletableFuture<BbjComposerServer> server(@NotNull Project project) {
    LanguageServerManager.getInstance(project).start(SERVER_ID);
    return LanguageServerManager.getInstance(project)
            .getLanguageServer(SERVER_ID)
            .thenApply(item -> item == null ? null : (BbjComposerServer) item.getServer());
}
```

### `compilerTrigger`-shaped flat initializationOptions key (the pattern to copy for `compilerOutputDirectory`)
```typescript
// Source: bbj-vscode/src/language/bbj-ws-manager.ts:88-95 (read this session)
const compilerTrigger = params.initializationOptions.compilerTrigger;
if (compilerTrigger === 'debounced' || compilerTrigger === 'on-save' || compilerTrigger === 'off') {
    setCompilerTrigger(compilerTrigger);
    logger.info(`Compiler trigger mode: ${compilerTrigger}`);
} else {
    setCompilerTrigger('debounced');
}
```
```java
// Source: bbj-intellij/.../lsp/BbjLanguageServerFactory.java:44-56 (read this session)
JsonObject options = new JsonObject();
options.addProperty("home", state.bbjHomePath);
options.addProperty("classpath", state.classpathEntry);
// ... existing flat keys ...
options.addProperty("configPath", state.configPath != null ? state.configPath : "");
// compilerOutputDirectory would be added here, one more addProperty call
params.setInitializationOptions(options);
```

## State of the Art

Not applicable in the "library version drift" sense (no external libraries change this phase). The one relevant "old vs. new" shift is internal:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `BbjCompileAction.actionPerformed()` only logs "Triggered for file: …" (no-op) | Sends `bbj/compile`, real bbjcpl invocation via `BBjCPLService` | This phase (#571) | Action becomes functional for the first time |
| `BbjCommenter` is a plain `Commenter` returning a static "REM " prefix | `Commenter` + `SelfManagingCommenter<CommenterDataHolder>` | This phase (#540) | Case-insensitive recognition, no more double-REM |
| `BbjWordLexer` treats `"` as a bare `SYMBOL` token | `"` opens a STRING-scanning seam; brackets inside are inert | This phase (#568) | Bracket matching stops misfiring inside string literals |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding `compilerOutputDirectory` to `createSettings()` in addition to `initializationOptions` is harmless / non-load-bearing this phase | Common Pitfall #2, Summary | Low — if wrong, it's simply dead code; the load-bearing channel (`initializationOptions`) is independently verified |
| A2 | Combining the `bbj/compile` method onto `BbjComposerServer` (vs. a new sibling interface) is acceptable naming-wise | Pitfall 5 | Low — purely a naming/organization choice, explicitly left to Claude's discretion by CONTEXT.md |
| A3 | `bbjcpl`'s behavior in this dev container (BBj installed at `/opt/bbx`, a specific build) is representative of the bbjcpl version end users run | Pitfall 1, Pitfall 3, Code Examples | Medium — if a different BBj/bbjcpl version changes default-naming or overwrite-refusal wording, tests asserting the exact stderr strings observed here would need updating; the *guard design* (D-05: require `-d` or `-N`) is unaffected either way since it never depends on bbjcpl's exact wording |
| A4 | No IntelliJ UAT requirement exists for "settings apply without an LS restart" for the new output-directory field | Pitfall 2 | Medium — if the user actually expects hot-reload without restart, the planner needs to either add an explicit `triggerChangeConfiguration()` call site or accept restart-required as the UX and document it in the settings label/tooltip |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Does `bbj/compile`'s options-aware entry point need a distinct timeout from the 30s background `-N` path?**
   - What we know: CONTEXT.md D-10 leaves this to discretion, defaulting to "the background path's 30s is a reasonable default."
   - What's unclear: whether a real compile (which does more I/O — writing tokenized output — than a `-N` validate-only pass) could plausibly need longer on a slow disk/large file.
   - Recommendation: default to 30s (matches existing `BBjCPLService.timeoutMs`); revisit only if UAT surfaces a timeout on a real large program.

2. **Should the new IntelliJ "Compile output directory" setting validate that the path exists before sending it, or rely on the LS/bbjcpl's own "Invalid output directory" fatal-error surfacing (Pitfall 3)?**
   - What we know: bbjcpl itself already fails clearly (non-zero-length stderr, two lines) when the directory doesn't exist; the LS's success classification (Pitfall 3's fix) will surface this as a failure balloon with the raw stderr text.
   - What's unclear: whether front-loading validation in the Settings dialog (disallowing an invalid path at configuration time) is worth the extra UI surface, given PAR-V2-04 (full option UI) is explicitly deferred.
   - Recommendation: skip client-side path validation this phase; let the LS's stderr-based failure path carry the message, consistent with "not the full option UI" (D-05).

3. **Does the planner need to add `triggerChangeConfiguration()` wiring at all, given Pitfall 2's finding that restart already refreshes `initializationOptions`?**
   - What we know: the existing restart-on-settings-change flow (`BbjSettingsConfigurable.java`) already re-delivers fresh `initializationOptions` on every settings apply, which is sufficient for `compilerOutputDirectory` to take effect.
   - What's unclear: whether this restart-required UX for a *new* setting needs explicit call-out in the Settings dialog label/tooltip so users aren't confused when a freshly-typed path doesn't take effect until the next restart.
   - Recommendation: no new wiring needed; consider a tooltip/description string noting "applies after language server restart" (the restart already happens automatically per the existing debounced-restart flow, so this is likely a non-issue — flag for UAT rather than code).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bbjcpl` binary | `BBjCPLService`, both the existing `-N` path and the new options-aware path | ✓ | `/opt/bbx/bin/bbjcpl`, `BBJ_HOME=/opt/bbx` [VERIFIED: `env | grep -i bbj`, `resolveBbjBinary`-shaped layout confirmed: `bin/bbjcpl`, `bin/bbj` both executable, `cfg/` directory present] | — |
| `bbjcpl` usage/help flags (`-?`, `-h`) | Confirming argv shape | ✓ | Both print identical usage text, exit 0 | — |
| LSP4IJ jar (0.19.0) for disassembly | Confirming push/pull config-delivery mechanism | ✓ | Extracted from `~/.gradle/caches/modules-2/files-2.1/com.jetbrains.plugins/com.redhat.devtools.lsp4ij/0.19.0/.../com.redhat.devtools.lsp4ij-0.19.0.zip` | — |
| IntelliJ Platform SDK jars (2024.2) for `SelfManagingCommenter` | Confirming interface method list | ✓ | `~/.gradle/caches/8.14.5/transforms/.../ideaIC-2024.2/lib/util-8.jar` | — |
| `javap` | Disassembling the above jars | ✓ | `/opt/java/default/bin/javap` (JDK bundled in container) | — |
| `./gradlew test` | IntelliJ-side JUnit 5 regression tests | Not executed this session (research-only; no code changes to test yet) | Gradle 8.14.5 pinned (Phase 78) | Proven pattern from Phases 79/80: `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests '<Class>'` |
| `npx vitest run <file>` | LS-side unit tests | Not executed this session | project-pinned vitest | Proven pattern: `cd bbj-vscode && npx vitest run test/cpl-service.test.ts` etc. |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none — everything needed for this phase's implementation is present in this container; test execution itself is deferred to the plan/execute phases (this was a research-only session, no source files were modified).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (LS-side) | Vitest [VERIFIED: `bbj-vscode/package.json:659` `"test": "vitest run"`] |
| Framework (IntelliJ-side) | JUnit 5 via `useJUnitPlatform()` [VERIFIED: `bbj-intellij/build.gradle.kts:42`] |
| Config file (LS-side) | `bbj-vscode/vitest.config.ts` (existing, unchanged) |
| Config file (IntelliJ-side) | `bbj-intellij/build.gradle.kts` `test` task (existing, unchanged) |
| Quick run command (LS-side) | `cd bbj-vscode && npx vitest run test/cpl-service.test.ts test/cpl-parser.test.ts` |
| Quick run command (IntelliJ-side) | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests '<ClassName>'` (Phase 80's proven invocation) |
| Full suite command (LS-side) | `cd bbj-vscode && npm test` |
| Full suite command (IntelliJ-side) | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PARITY-01 | `bbj/compile` guard refuses when neither `-d` nor `-N` is effective | unit (LS-side) | `npx vitest run <new-options-module>.test.ts` | ❌ Wave 0 |
| PARITY-01 | Options-aware entry point classifies success as `stderr==''`, not `diagnostics.length==0` | unit (LS-side) | `npx vitest run test/cpl-service.test.ts` (extended) | ⚠️ extend existing file |
| PARITY-01 | `BbjCompileAction` sends `bbj/compile`, saves document first, off-EDT | behavioral + source-guard (IntelliJ) | `./gradlew test --tests 'BbjCompileActionTest'` / `'*SourceGuardTest'` | ❌ Wave 0 |
| PARITY-02 | `PRINT "value (not a bracket)"` — parens inside string inert | unit (IntelliJ, plain-Java seam) | `./gradlew test --tests '<StringScanSeam>Test'` | ❌ Wave 0 |
| PARITY-02 | `""`-doubled quote handling | unit (IntelliJ, plain-Java seam) | same file | ❌ Wave 0 |
| PARITY-03 | lowercase `rem` / mixed-case `Rem` toggle round-trip | unit (IntelliJ, plain-Java seam) | `./gradlew test --tests '<CommenterSeam>Test'` | ❌ Wave 0 |
| PARITY-03 | `remark = 1` is not treated as commented | unit (IntelliJ, plain-Java seam) | same file | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the relevant quick-run command above (LS-side or IntelliJ-side, matching the file touched)
- **Per wave merge:** the corresponding full-suite command
- **Phase gate:** both full suites green before `/gsd-verify-work` (per the Phase 79/80 "whole-suite gate substitution" standing decision — `numFailedTests: 0` + targeted runs)

### Wave 0 Gaps
- [ ] LS-side test file for the new options-aware `BBjCPLService` entry point and the re-homed compiler-option module — covers PARITY-01
- [ ] IntelliJ test file(s) for the STRING/COMMENT scan seam — covers PARITY-02
- [ ] IntelliJ test file for the REM-toggle seam — covers PARITY-03
- [ ] `BbjCompileActionTest` (behavioral) + a `BbjCompileAction*SourceGuardTest` (wiring) — covers PARITY-01's off-EDT/save-first/request-dispatch requirements

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface touched |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | The `bbj/compile` request's file-URI param must resolve through the same path-confinement already used elsewhere (`confineBbjExecutable`-style checks are for the *binary*, not the input file, but the file path should still be validated as a workspace-relative/known document, not an arbitrary attacker-supplied path — LSP4IJ's proxy only ever sends what the IntelliJ action itself constructs from the open editor's `VirtualFile`, so this is a low-risk internal boundary, not a network-facing one) |
| V6 Cryptography | no | Not applicable — no crypto in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OS command injection via compiler options (e.g. a crafted `output.directory` value breaking out of its argv slot) | Tampering | Already mitigated project-wide by `process-args.ts`'s `{file, args}` array convention (GHSA-p5f3-9456-9pcx fix) — the new options-aware argv builder must follow this same pattern (array elements, never a shell string), reusing `buildCompileArgv`'s existing shape |
| A malicious/misconfigured `output.directory` setting used to write tokenized output somewhere sensitive | Tampering | Out of scope for this phase's threat model — `output.directory` is a *local, user-configured* IntelliJ setting reaching a *local* bbjcpl process the user already trusts to run; no new privilege boundary is crossed relative to VS Code's existing identical `bbj.compiler.output.directory` setting |

## Sources

### Primary (HIGH confidence — executed/read this session)
- `/opt/bbx/bin/bbjcpl` (the real binary in this dev container) — usage text, default-naming behavior, overwrite-refusal behavior, invalid-directory fatal-error behavior (all four empirically executed and captured verbatim above)
- `javap -p -c` disassembly of `lsp4ij-0.19.0.jar`'s `com.redhat.devtools.lsp4ij.client.LanguageClientImpl`, `SettingsLanguageListener`, `SettingsHelper` classes — the exact push/pull config-delivery mechanism
- `javap -p` disassembly of `ideaIC-2024.2/lib/util-8.jar`'s `com.intellij.codeInsight.generation.SelfManagingCommenter` — the exact 11-method interface contract
- `bbj-vscode/src/language/bbj-cpl-service.ts`, `bbj-cpl-parser.ts`, `bbj-ws-manager.ts`, `main.ts`, `composer-commands.ts`, `bbj-home-layout.ts` — read in full this session
- `bbj-vscode/src/Commands/CompilerOptions.ts`, `process-args.ts`, `Commands.cjs` (compile handler) — read this session
- `bbj-vscode/src/extension.ts` (initializationOptions block) — read this session
- `bbj-vscode/node_modules/vscode-languageserver/lib/common/configuration.js` — `getConfiguration` section-wrapping behavior
- `bbj-vscode/src/language/bbj.langium` lines 923, 949, 951 — `COMMENT`/`STRING_LITERAL`/`MNEMONIC` terminals, quoted verbatim
- `bbj-vscode/package.json` lines 413-560ish — confirms `bbj.compiler.output.directory` (and all 18 sibling keys) already registered
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java`, `BbjLanguageServerFactory.java`, `BbjSettingsConfigurable.java` (grep), `composer/BbjComposerServer.java`, `BbjComposerService.java`, `ComposerModels.java`, `ui/BbjServerService.java`, `actions/BbjCompileAction.java`, `BbjWordLexer.java`, `BbjTokenTypes.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java`, `BbjCommenter.java`, `BbjLanguageCodeStyleSettingsProvider.java`, `META-INF/plugin.xml`, `build.gradle.kts` — read this session
- `bbj-intellij/src/test/java/.../lsp/OffEdtDispatchSourceGuardTest.java` — the source-guard style to follow
- `bbj-vscode/test/cpl-service.test.ts` — the fixture-based bbjcpl-spawn test style to follow

### Secondary (MEDIUM confidence)
- None used — every claim above traces to an executed command or a directly-read source file this session.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all versions confirmed from the exact jars/binaries resolved in this container
- Architecture: HIGH — every integration point traced by reading the actual source, plus bytecode disassembly for the two third-party contracts (LSP4IJ, IntelliJ Platform SDK) that CONTEXT.md flagged as needing confirmation
- Pitfalls: HIGH — all five pitfalls are backed by executed falsification attempts or verbatim source/bytecode reads, not recalled behavior

**Research date:** 2026-09-05
**Valid until:** 30 days, EXCEPT the LSP4IJ/IntelliJ-Platform-SDK findings (Pitfall 2, Code Example 2), which are pinned to the exact `lsp4ij-0.19.0` / `ideaIC-2024.2` versions this build resolves — re-verify if either dependency version changes before this phase lands.
