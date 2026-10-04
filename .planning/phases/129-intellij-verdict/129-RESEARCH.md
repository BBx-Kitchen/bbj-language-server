# Phase 129: IntelliJ Verdict - Research

**Researched:** 2026-10-04
**Domain:** LSP4IJ 0.21.0 formatting runtime inside IntelliJ Platform 2024.2 (build 242.20224.300), evaluation tooling in a headless dev container, a plain-Java `initializationOptions` seam, and a conditional (supported / disabled) plan structure
**Confidence:** HIGH on LSP4IJ routing and the in-repo seams (read from bytecode and source this session); MEDIUM on the driving options (probed, not run end to end); LOW on the Actions on Save and CRLF runtime outcomes, which only the evaluation can settle

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Carried forward (not re-asked)
- Phase 125 IJF-01: the single switch `LSP_FORMATTING_ENABLED` (currently `false`) gates
  `isEnabled`, `isSupported`, `isFormattingSupported` and `isRangeFormattingSupported` on the
  `LSPFormattingFeature` in `BbjLanguageServerFactory.createClientFeatures()`. Fence tests:
  `Lsp4ijCouplingCanaryTest`, `Lsp4ijOverrideSiteSourceGuardTest`.
- Phase 125 D-01..D-15: server-side message cadence (toast once, then log), dedup, Warning severity,
  fire-and-forget prompts, range edits accepted as snapped by bbj-ls, `indentWidth` default 2, all
  15 keys always sent with explicit values. The server already reads `initializationOptions.formatter`
  (an object, normalized by `normalizeFormatterSettings` in `bbj-format-settings.ts`) and omits it
  from the init log.
- Phase 125 D-05: invalid settings send `bbj/openFormatterSettings` (payload `{ keys }`); IntelliJ
  had no handler until now.
- Phase 126/128: the DENUM offer from the format path, `bbj/denum`, diagnostics in the BBj console;
  the IntelliJ Denumber action and banner already ship and do not depend on the verdict.
- Standing (v4.4 / memory): build both distributables (VSIX and IntelliJ zip) before the first hand
  check and again from the final tree after code-review fixes. Every runtime sequence used as
  evidence comes from a real `idea.log`, never a hand-derived trace. Any `bbj/*` request or
  `BbjLanguageClient` notification change runs `bbj-intellij ./gradlew test`.

#### Evaluation method (IJF-02)
- **D-01:** Linux runs are **driven by Claude in a Gradle `runIde` sandbox** loaded with the built
  plugin zip (headful on the container display), against :5008 BBjServices 26.03. Claude opens
  files, triggers actions where possible and reads `idea.log` plus the BBj Language Server console
  after each case. Anything Claude cannot drive, the user clicks. Each row of the record cites real
  log lines.
- **D-02:** **Linux + Windows.** Claude writes a short Windows checklist (CRLF file, Reformat Code,
  Reformat selection, Actions on Save). The user runs it with the same built zip on Windows and
  returns the `idea.log`, and Claude adds it to the record.
- **D-03:** The seven IJF-02 cases (Reformat Code, selection, Actions on Save, numbered-file message,
  settings, CRLF, edit application) are run hands-on. The **extra cases are verified from code and
  existing tests, not hand-run**: `config.bbx` / BBx Config left untouched (FMT-12 guard; lsp4ij
  #1647), the commit-dialog reformat option, large file (apply time, caret/folding, one undo step,
  no dirty flag when already formatted), and server down / older BBj (bounded handler, no EDT
  freeze, one message). The record labels these rows **"code-verified"** and claims no runtime
  sequence for them.
- **D-04:** **Blocker bar: only data loss or a UI freeze blocks "supported".** Wrong or corrupted
  edits, a CRLF file silently not formatted, `config.bbx` rewritten, or an EDT freeze are
  blockers. Cosmetic findings (caret jump, extra dirty flag, highlighting refresh) go into the
  record as known issues.
- **D-05:** **Settings are evaluated through the seam before any UI exists.** Before the evaluation,
  build only the `FormatterInitOptions` seam (plain Java, like `CompilerInitOptions`) and the
  `BbjSettings.State` fields for the 15 keys, wired into `initializationOptions.formatter`. During
  the evaluation, set values in the sandbox's BBj settings XML, restart, and show from `idea.log`
  that format output follows them. On "disabled", the seam and state fields are reverted.

#### Verdict shape (IJF-03)
- **D-06:** The verdict can be **"supported", "supported, no range formatting", or "disabled"**. If
  whole-file Reformat Code passes but range formatting hits a blocker, a second constant turns off
  only `isRangeFormattingSupported`, and the verdict names that exception. The fence tests pin both
  constants.
- **D-07:** A blocker in **Actions on Save or commit-dialog reformat means "disabled" overall**.
  LSP4IJ cannot switch format-on-save off on its own, so there is no partial verdict for the save
  path.
- **D-08:** At the decision checkpoint **Claude presents the record, the blockers measured against
  D-04, and a recommended verdict, and the user decides** (confirms or overrides). The verdict and
  its evidence are recorded in the phase directory; the switch constant(s) are set to match.

#### Settings page (IJF-04, only on "supported")
- **D-09:** A new **"Formatter" `TitledSeparator` section on the existing BBj settings page**
  (`BbjSettingsComponent`), placed after "BBj Compiler". No separate configurable, no Code Style
  page.
- **D-10:** **Controls mirror the VS Code schema** in `bbj-vscode/package.json`: `indentWidth` as a
  bounded spinner, booleans as checkboxes, enums as combos with the same values, and the
  package.json descriptions as tooltips. Defaults match `FORMATTER_DEFAULTS` (`indentWidth` 2). No
  free-text fields, so no null or blank value can reach bbj-ls (`-33007`).
- **D-11:** **Restart uses the existing debounced restart on Apply** (`BbjSettingsConfigurable`), the
  same as every other BBj setting. A short note under the section says the values apply after the
  language server restarts. No confirmation dialog.
- **D-12:** **`bbj/openFormatterSettings` opens the BBj settings page** through a
  `@JsonNotification` handler on `BbjLanguageClient` (scrolled to the Formatter section if cheap).
  The payload `keys` are never used as a path, command or link. On "disabled", leave the
  notification unhandled, as it is today.

#### Disabled outcome
- **D-13:** On "disabled", **nothing new appears in the IDE**: no balloon, no banner, and Reformat
  Code behaves as today. Phase 130's IntelliJ guide says formatting is VS Code-only for now.
- **D-14:** On "disabled", **keep `LSP_FORMATTING_ENABLED = false` and its fence tests**, and update
  its javadoc to point to the evaluation record and its blockers, so a later LSP4IJ upgrade can
  re-check by flipping one constant. The evaluation record stays in the phase directory.
- **D-15:** For each **blocker caused by LSP4IJ, Claude drafts a minimal-repro upstream issue** in
  the phase directory (as for lsp4ij #1672/#1673); the user decides whether and when to file it.

### Claude's Discretion
- File name and layout of the evaluation record (one row per case: steps, expected, observed,
  `idea.log` excerpt or code reference, pass / known issue / blocker).
- How `runIde` is driven (display/VNC, sandbox config dir, how the sandbox BBj settings XML is
  seeded) and which test corpus files are used (prefer real programs from `examples/` and a CRLF
  copy).
- Name of the range-only constant and how the fence tests pin two constants.
- Ordering of the 15 controls within the Formatter section, spinner bounds (take them from
  package.json), and the restart-note wording.
- Whether the seam (D-05) lives in a new `FormatterInitOptions` class in `lsp/`, by analogy with
  `CompilerInitOptions`.

### Folded Todos
- **IntelliJ sends `javaInteropHost`/`javaInteropPort`, but the language server reads
  `interopHost`/`interopPort`** (`.planning/todos/pending/2026-09-26-intellij-interop-initoptions-key-mismatch.md`).
  `BbjLanguageServerFactory` (lines ~64-67) puts the `javaInterop*` keys into
  `initializationOptions`, while `bbj-ws-manager.ts` only reads `interopHost`/`interopPort`, so
  IntelliJ's configured interop host/port never reach the server at initialize. Fixed in this phase
  because it touches the same `initializationOptions` build as D-05. The fix applies regardless of
  the verdict. The planner picks the direction (rename on the IntelliJ side, or accept both
  server-side) and checks whether anything relies on the old key names. Close the todo when done.

### Deferred Ideas (OUT OF SCOPE)
- Hot-apply of IntelliJ formatter settings without a restart: IJF-07, already deferred.
- A one-time "formatting not supported in IntelliJ" balloon: rejected in favour of D-13.
- Reviewed, not folded: peer-supplied Java names breaking out of the signature-help code fence /
  snippet variables (security, unrelated); re-check of the IntelliJ Node.js download progress bar
  on Windows (separate Windows check); moving lsp4j.jsonrpc to 1.0 in bbj-ls then java-interop
  (dependency work).
- Not in this phase: docs and QA checklists (Phase 130), any bbj-ls change.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IJF-02 | IntelliJ formatting is evaluated on the built plugin zip against a live BBjServices (Reformat Code, selection, Actions on Save, numbered-file message, settings, CRLF, edit application), recorded from a real `idea.log` | Sections "LSP4IJ 0.21.0 formatting runtime" (what each action calls and where evidence lands), "Driving the evaluation" (display, scripted drivers, seeding, log paths, what the user must click), "Code-verified cases" |
| IJF-03 | The user decides from the evaluation whether IntelliJ formatting is officially supported or disabled, and the switch is set accordingly | "Switch and fence tests" (how one or two constants are pinned), "Decision checkpoint mechanics" (verdict file, guard tasks, conditional plans) |
| IJF-04 | If supported: all 15 formatter settings are on the IntelliJ BBj settings page and reach the server via `initializationOptions` (restart on change) | "Seam design" (`FormatterInitOptions`, State fields, key/enum/bound table), "Supported-path UI" (component, configurable, `bbj/openFormatterSettings` handler) |
</phase_requirements>

## Summary

Phase 129 is mostly measurement and a decision, and the research shows the measurement can be made precise before anyone opens an IDE. LSP4IJ 0.21.0 formats through the platform's `AsyncDocumentFormattingService` via two registered services, `LSPFormattingOnlyService` and `LSPFormattingAndRangeBothService`. Both are gated first by `LSPFormattingFeature.isEnabled(file)` (false only when an IDE `FormattingModelBuilder` exists and `isExistingFormatterOverrideable` is not overridden, and BBj registers none) and by `ProjectIndexingManager.canExecuteLSPFeature(file) == NOW`. Edits are applied to a copy of the document string by `LSPIJUtils.applyEdits` with no `\r` handling and handed back through `onTextReady`; the platform then diffs that into the real document. This explains the open CRLF issue (lsp4ij #381) and tells the evaluation exactly what to try: a CRLF file with the default `eolCharacter=KEEP` should pass (IntelliJ documents are `\n` in memory, so bbj-ls sees LF), while forcing `eolCharacter=CRLF` or `LF` through the seam is the real #381 trap, because bbj-ls treats a changed line terminator as a real edit.

The container has no display (`DISPLAY` is empty, no `/tmp/.X11-unix`), so "headful on the container display" (D-01) cannot mean a screen anyone watches. Three drivers are available and none was run end to end: (1) the IDE's bundled `performanceTesting` plugin, which provides script commands (`%openFile`, `%selectText`, `%executeEditorAction`, `%saveDocumentsAndSettings`, `%goto`, `%takeScreenshot`, `%exitApp`) enabled by the `testscript.filename` system property; (2) `xvfb-run` plus a tiny `java.awt.Robot` program for key presses and PNG screenshots (probe run this session: key events and a 1600x1000 capture worked, with no window manager installed, so focus follows the pointer); (3) the user clicking. Real evidence has two sources, not one: `idea.log` carries lifecycle lines and exceptions only, while request/response traffic lives in the LSP4IJ LSP console trace (`Trace = verbose`), which is the format already found in `tmp/intellij_traces.txt`. The record must cite both.

The folded todo is a one-sided fix: only IntelliJ writes the wrong spelling. VS Code (`extension.ts:922-923`) and every server-side reader and test use `interopHost`/`interopPort`, nothing on the IntelliJ side tests the old key strings, and the Windows trace in `tmp/intellij_traces.txt` shows `javaInteropHost` leaving IntelliJ unread. Rename on the IntelliJ side. The seam for the 15 keys follows `CompilerInitOptions` exactly, and the plan structure should put the interop fix, the revertable seam, the evaluation, the decision, and two mutually exclusive post-verdict plans (each opening with a guard task that reads a verdict file) in separate plans so a "disabled" verdict is a clean revert.

**Primary recommendation:** Plan 01 renames the two IntelliJ interop keys (permanent, with a contract test against `bbj-ws-manager.ts`); Plan 02 adds `FormatterInitOptions` and flat `BbjSettings.State` fields in commits that revert cleanly; Plan 03 builds both distributables, runs a driver spike, then the Linux cases, recording `idea.log` plus LSP trace excerpts; Plan 04 ingests the Windows log and presents the `checkpoint:decision`, writing `129-VERDICT.md`; Plans 05 (supported) and 06 (disabled) each start with a guard task on that file; Plan 07 is the final gate from the final tree.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Offering Reformat Code / Reformat selection / Actions on Save for BBj files | IntelliJ plugin (`LSPFormattingFeature` overrides in `BbjLanguageServerFactory`) | LSP4IJ vendor services | The four `isXxx` checks are the only client-side gate; the vendor services consult them [VERIFIED: javap, below] |
| Building and sending the 15 formatter values | IntelliJ plugin (`FormatterInitOptions` seam + `BbjSettings.State`) | Language server (`normalizeFormatterSettings`) | IntelliJ's settings reach the server only through flat `initializationOptions` at initialize; the server whitelists and defaults [VERIFIED: `bbj-ws-manager.ts:141-146`] |
| Formatting itself, minimal edits, stale-version guard, config-file exclusion | Language server (`bbj-formatting-handler.ts`, `bbj-format-service.ts`, `bbj-format-edit.ts`) | BBj peer (`formatProgram`) | Already shipped and unit-tested in Phases 124-125; Phase 129 only observes it through IntelliJ |
| Applying the returned edits to the buffer | LSP4IJ + IntelliJ platform (`LSPIJUtils.applyEdits` -> `onTextReady` -> platform diff) | - | This is the "edit application" case; the server cannot influence it beyond what it sends |
| User-visible messages (numbered file, settings, mixed numbering) | Language server (`window/showMessageRequest`) | LSP4IJ (`ServerMessageHandler`, STICKY_BALLOON group) | Server-driven and already Phase 125/126 behaviour; IntelliJ only renders the balloons |
| Settings UI and restart on change | IntelliJ plugin (`BbjSettingsComponent`, `BbjSettingsConfigurable`, `BbjServerService.scheduleRestart`) | - | Only on "supported" |
| Opening the settings page from the server's "Open Settings" button | IntelliJ plugin (`BbjLanguageClient` `@JsonNotification`) | Language server (sends `bbj/openFormatterSettings`) | Only on "supported" |
| Evidence capture | Real `idea.log` (lifecycle, exceptions) + LSP4IJ console trace (requests/responses) | Language server `window/logMessage` (console only) | `window/logMessage` goes to the LSP console, not `idea.log` [VERIFIED: javap `ServerMessageHandler.logMessage` -> `LSPConsoleToolWindowPanel.showLog`] |

## Standard Stack

### Core

No new libraries. Everything below is already on the compile classpath.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform (IC) | 2024.2 (build 242.20224.300) | Compile/test target and the `runIde` IDE | `intellijIdeaCommunity("2024.2")` [VERIFIED: `build.gradle.kts`, quoted below] |
| LSP4IJ | 0.21.0 | Formatting services, feature class | `plugin("com.redhat.devtools.lsp4ij:0.21.0")` [VERIFIED: `build.gradle.kts`] |
| `com.intellij.ui.JBIntSpinner` | platform 242 | Bounded integer control for `indentWidth` | Constructor `JBIntSpinner(int, int, int)` and `getNumber()`/`setNumber(int)` confirmed by javap this session [VERIFIED: javap] |
| `com.intellij.openapi.options.ShowSettingsUtil` | platform 242 | Open the BBj settings page | `showSettingsDialog(Project, Class<T>)` and `showSettingsDialog(Project, Class<T>, Consumer<? super T>)` exist [VERIFIED: javap] |
| JUnit Jupiter | via `junit-bom:6.1.3` | Plain-Java seam tests, contract and source-guard tests | Existing convention [VERIFIED: `build.gradle.kts`] |

Quoted from `/home/coder/repos/bbj-language-server/bbj-intellij/build.gradle.kts` (lines 29-37 and the tail):

```
        intellijIdeaCommunity("2024.2")
        bundledPlugin("org.jetbrains.plugins.textmate")
        ...
        plugin("com.redhat.devtools.lsp4ij:0.21.0")
```
```
tasks {
    runIde {
        args = listOf(System.getProperty("user.home") + "/tinybbj")
    }
}
```

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Gson (`com.google.gson.JsonObject`) | on the test classpath through LSP4IJ/lsp4j | Build the `formatter` object | `FormatterInitOptions.toJson(...)`; `CompilerInitOptionsTest`'s guard only forbids `import com.intellij`, not Gson [VERIFIED: `CompilerOutputDirectorySourceGuardTest` `theSeamHasNoIntellijImport`] |
| IDE-bundled `performanceTesting` plugin (`com.jetbrains.performancePlugin`) | 242.20224.300 | Script-driven `%reformat`, `%executeEditorAction`, `%selectText`, `%saveDocumentsAndSettings`, `%takeScreenshot` | Driver option 1 in "Driving the evaluation"; present in `.../ideaIC-2024.2/plugins/performanceTesting` [VERIFIED: `ls` + javap constants] |
| `xvfb-run` + `java.awt.Robot` | Xvfb present, JDK 17/21/25 | Virtual display, key injection, PNG screenshots | Driver option 2 [VERIFIED: probe run, `RobotProbe` printed `ok 1600x1000`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flat `formatter*` fields on `BbjSettings.State` | One nested bean field | A nested bean's XML shape was not probed; flat fields serialize as `<option name=... value=... />`, which was probed (below) and makes the evaluation's XML seeding certain |
| Rename IntelliJ keys to `interopHost`/`interopPort` | Make the server accept both spellings | Server change widens the contract and touches `bbj-ws-manager.ts`, `main.ts` tests and VS Code; IntelliJ-only rename is two string literals |
| `idea format.sh` headless formatter | - | Not representative: it does not start the plugin's language server session the way an editor does; do not use it as evidence |

**Installation:** none (no new dependency).

**Version verification:** `lsp4ij-0.21.0.jar` and the IC 2024.2 distribution are in the Gradle cache (`/home/coder/.gradle/caches/9.8.0/transforms/93ce6bf9994442f92701d6affdfa84db/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/lsp4ij-0.21.0.jar`, `/home/coder/.gradle/caches/transforms-4/8134c9f42dc9c2c9bf0891137d2815d0/transformed/ideaIC-2024.2`); the sandbox plugin matches the zip (`main.cjs` is byte-identical to `bbj-vscode/out/language/main.cjs`, checked with `cmp`; the zip lists `bbj-intellij/lib/language-server/main.cjs` at 1291897 bytes, the same size as the sandbox copy).

## Package Legitimacy Audit

This phase installs no external package. `JBIntSpinner`, `ComboBox`, `TitledSeparator`, `FormBuilder`, `ShowSettingsUtil` ship with the IntelliJ Platform already on the classpath; LSP4IJ 0.21.0 and the platform are existing pinned dependencies. The `package-legitimacy` gate was not run because there is nothing to check.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | - | - | - | - | - | - |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 User / driver script
   |  Reformat Code (Ctrl+Alt+L) | Reformat selection | Ctrl+S with Actions on Save | commit dialog
   v
 IntelliJ platform  FormattingServiceUtil.findService(file, flagA, flagB)
   |  picks a FormattingService where  (flagA || has AD_HOC_FORMATTING)
   |                                   && (flagB || has FORMAT_FRAGMENTS)
   |                                   && service.canFormat(file)
   v
 LSP4IJ  AbstractLSPFormattingService.canFormat(file)
   |  ProjectIndexingManager.canExecuteLSPFeature(file) == NOW ?        --no--> not LSP formatting
   |  per server: BbjLanguageServerFactory's LSPFormattingFeature
   |      isEnabled(file)  = LSP_FORMATTING_ENABLED && (isExistingFormatterOverrideable || no IDE FormattingModelBuilder)
   |      then canSupportFormatting:
   |         FormattingOnlyService:      isFormattingSupported && !isRangeFormattingSupported
   |         FormattingAndRangeService:  isRangeFormattingSupported   (features = {FORMAT_FRAGMENTS})
   v
 LSPFormattingSupport.format(...)                       <-- one request per action, cancels the previous
   |  FormattingOptions{tabSize, insertSpaces} from the editor (server ignores them)
   |  range request iff a TextRange was derived AND the server advertises range formatting
   v
 JSON-RPC (stdio)  -->  bbj language server  --> bbj-formatting-handler.ts
                                                  |  not open / not 'bbj' languageId (config.bbx, txt) -> []
                                                  |  formatProgram over :5008 (15 settings, version, allowDenum=false)
                                                  |  answers []  for cancel / stale / error / tokenized / numbered-file
                                                  |  shows ONE window/showMessageRequest for notices
                                                  v  returns minimal line edits (or [])
 LSP4IJ  LSPIJUtils.applyEdits(Document, edits) -> String       (no \r handling; overlapping edit = java.lang.Error)
   |  AsyncFormattingRequest.onTextReady(newText)    cancellation -> onTextReady(original)
   |                                                  other failure -> onError("LSP formatting error", message)
   v
 IntelliJ platform diffs the new text into the Document (one undo step)

 Evidence:  idea.log  (lifecycle, WARN/ERROR, exceptions)      LSP console trace (requests, responses, edits)
            -> sandbox .../IC-2024.2/log/idea.log               -> Language Servers tool window, Trace = verbose
```

### Recommended Project Structure

```
bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── lsp/
│   ├── BbjLanguageServerFactory.java   # constants LSP_FORMATTING_ENABLED (+ range constant), interop key fix, formatter object
│   ├── FormatterInitOptions.java       # NEW plain-Java seam (no com.intellij import), mirrors CompilerInitOptions
│   └── BbjLanguageClient.java          # + @JsonNotification("bbj/openFormatterSettings") only on "supported"
├── BbjSettings.java                    # + flat formatter* State fields
├── BbjSettingsComponent.java           # + "Formatter" TitledSeparator section (supported only)
└── BbjSettingsConfigurable.java        # + isModified/apply/reset coverage (supported only)
bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/
├── FormatterInitOptionsTest.java            # plain unit tests
├── FormatterInitOptionsContractTest.java    # reads bbj-format-settings.ts + package.json as text
├── InteropInitOptionsContractTest.java      # reads bbj-ws-manager.ts + extension.ts as text (folded todo)
└── (extended) Lsp4ijOverrideSiteSourceGuardTest, BbjLspFormattingSwitchTest, Lsp4ijCouplingCanaryTest
.planning/phases/129-intellij-verdict/
├── 129-EVALUATION.md         # the record, one row per case
├── 129-WINDOWS-CHECKLIST.md  # handed to the user
├── 129-VERDICT.md            # frontmatter: verdict: supported | supported-no-range | disabled
└── 129-LSP4IJ-ISSUE-*.md     # drafts, only for LSP4IJ-caused blockers (D-15)
```

### Pattern 1: LSP4IJ formatting gate (verified by bytecode)

**What:** The four checks the plugin overrides are exactly the ones the vendor services call. Verified by `javap -p -c` on `lsp4ij-0.21.0.jar` this session:

- `LSPFormattingFeature.isEnabled(file)`: calls `isExistingFormatterOverrideable(file)`; if that is false it calls `LanguageFormatting.INSTANCE.forContext(file)` and returns false when a builder is found, otherwise true. `isExistingFormatterOverrideable` returns `false` by default.
- `isSupported(file)` returns `isFormattingSupported(file)`.
- `isFormattingSupported` / `isRangeFormattingSupported` consult the capability registries.
- `LSPFormattingOnlyService.canSupportFormatting` = `isFormattingSupported && !isRangeFormattingSupported`, with `FEATURES = Collections.emptySet()`.
- `LSPFormattingAndRangeBothService.canSupportFormatting` = `isRangeFormattingSupported`, `FEATURES = Set.of(FORMAT_FRAGMENTS)`.
- `AbstractLSPFormattingService.canFormat` requires `ProjectIndexingManager.canExecuteLSPFeature(file) == ExecuteLSPFeatureStatus.NOW`, then `feature.isEnabled(file)`, then the abstract `canSupportFormatting`.
- Platform `FormattingServiceUtil` lambda: `(boolA || service has AD_HOC_FORMATTING) && (boolB || service has FORMAT_FRAGMENTS) && service.canFormat(file)`.

**When to use:** to reason about every IJF-03 outcome without guessing.

**Consequences for the plan:**
- With the range constant off (D-06), the whole-file service is `LSPFormattingOnlyService` (works), while a selection reformat finds no `FORMAT_FRAGMENTS` service and falls to the platform default, which for BBj (no `FormattingModelBuilder`) does nothing. That is the "supported, no range formatting" behaviour D-06 describes; the evaluation should still observe it once rather than trust this reading.
- Neither LSP service declares `AD_HOC_FORMATTING`. Whether Actions on Save counts as explicit depends on the first boolean at runtime [ASSUMED: it is the "explicit" flag]; if it did not, save would never reach LSP4IJ and the "Actions on Save" row records "no LSP request" (not a blocker, no data loss). Only the evaluation settles this; record the observed request or its absence from the trace.
- `LSPFormattingSupport.getFormatting` sends `textDocument/rangeFormatting` only when a `TextRange` exists and `LanguageServerItem.isDocumentRangeFormattingSupported()` (server capability, not the plugin override); otherwise `textDocument/formatting` [VERIFIED: javap order of `textRange()` then `isDocumentRangeFormattingSupported()`].

### Pattern 2: `CompilerInitOptions` seam for the 15 keys

**What:** A final class, private constructor, no `import com.intellij`, constants for the wire key and values, `normalizeX` methods that map `null`, blank, unknown or out-of-range to the default, plus a method that builds the JSON the factory attaches. The factory attaches the object next to the compiler keys and before `params.setInitializationOptions(options)`.

**Source it models** [VERIFIED: `CompilerInitOptions.java:21-37`, quoted]:
```java
public final class CompilerInitOptions {
    public static final String COMPILER_OUTPUT_DIRECTORY_KEY = "compilerOutputDirectory";
    public static final String COMPILER_TRIGGER_KEY = "compilerTrigger";
    public static final String TRIGGER_DEBOUNCED = "debounced";
    public static final String TRIGGER_ON_SAVE = "on-save";
    public static final String TRIGGER_OFF = "off";
```

### Pattern 3: `@JsonNotification` handler that ignores its payload

**What:** `BbjLanguageClient.showDenumDiagnostics(Object ignoredPayload)` shows the safe shape for a server notification whose payload must never be acted on. Use the same for `bbj/openFormatterSettings`, so the `keys` array cannot be turned into a path, command or link by construction. LSP4J reflects over the concrete class, so no registration is needed [VERIFIED: `BbjLanguageClient.java` javadoc, lines 146-153 region].

### Anti-Patterns to Avoid
- **Gating only `isSupported`** (as the document-link feature does): the vendor services call `isEnabled`/`isFormattingSupported`/`isRangeFormattingSupported` directly, so all four must be overridden [VERIFIED: `BbjLanguageServerFactory.java:107-110` comment and the bytecode above].
- **Sending `eolCharacter` values the editor cannot honor without evidence:** see Pitfall 1.
- **Reading `state.javaInteropPort` in the factory:** `EffectiveInteropPortSourceGuardTest` requires `getEffectiveJavaInteropPort()` exactly once and zero `state.javaInteropPort` occurrences [VERIFIED: `EffectiveInteropPortSourceGuardTest.java:60-72, 100-106`].
- **Putting planning ids (plan/D-xx/requirement ids) in source or test comments:** project convention enforced at phase close (memory: "Register-check the source diff before push").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bounded integer input | A `JTextField` + parse | `JBIntSpinner(2, 0, 16)` | No blank or non-numeric value can reach bbj-ls (`-33007`); this is D-10's "no free-text fields" |
| Persisting 15 values | Custom XML | Flat public fields on `BbjSettings.State` | `XmlSerializer` writes `<option name="..." value="..." />` per field [VERIFIED: probe, below] and omits defaults on disk |
| Opening the settings page | `Settings` action id lookups or custom dialogs | `ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class)` | Signature verified; with the `Consumer<? super T>` overload the configurable can scroll to the Formatter section |
| A way to run actions without clicking | A bespoke test harness plugin | The bundled `performanceTesting` script commands, or `xvfb-run` + `java.awt.Robot` | Both already present; no new dependency |
| Serializing `FormatterInitOptions` JSON | String concatenation | Gson `JsonObject.addProperty(...)` with typed values | `addProperty(String, Integer)` yields a JSON number, `Boolean` a JSON boolean, which the server whitelist accepts [VERIFIED: `normalizeFormatterSettings` accepts string, boolean, finite number, `bbj-format-settings.ts:127-129`] |

**Key insight:** the server already whitelists and defaults, so the IntelliJ seam's only job is to guarantee that every key carries an explicit, in-range, canonical value and never a null or blank.

## Runtime State Inventory

Trigger: the folded todo renames two wire keys on the IntelliJ side (a protocol rename, not a source rename). All five categories answered:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. The wire keys are never persisted; `BbjSettings.State` keeps its own `javaInteropHost`/`javaInteropPort` field names (`BbjSettings.java:29-31`), which do not change. Verified by reading `BbjSettings.State`. | none |
| Live service config | None. Only the server's reader (`bbj-ws-manager.ts:85`) matters and it is unchanged. | none |
| OS-registered state | None. | none |
| Secrets and env vars | None. | none |
| Build artifacts / installed packages | The already built zip `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` still sends the old keys. | Rebuild from the final tree (already a standing requirement) |

**Behaviour change to flag:** after the rename, IntelliJ's configured host and its effective (auto-detected) port start to reach the server for the first time at initialize. Before, the server always fell back to `localhost:5008` [VERIFIED: `bbj-ws-manager.ts:85` reads only `interopHost`/`interopPort`; the Windows trace shows `"javaInteropHost": "localhost", "javaInteropPort": 5008` in the `initialize` params, `tmp/intellij_traces.txt:1-12`]. A user whose BBj.properties port differs from 5008 and who relied on the (accidental) default will see the server connect to the detected port, matching what IntelliJ's own interop probe already does.

## Common Pitfalls

### Pitfall 1: `eolCharacter` CRLF/LF versus IntelliJ's LF-only documents
**What goes wrong:** A CRLF file opens in IntelliJ with `\n` in the in-memory `Document`; the separator is stored separately. bbj-ls therefore sees LF text and `KEEP` returns LF, which is fine. But `eolCharacter=CRLF` (or `LF` on a CRLF file) makes every line differ: bbj-ls treats a changed terminator as a real edit (`bbj-format-edit.ts:17-19`, quoted: "so two lines compare equal only when their endings match too and a changed terminator is a real edit") and returns `\r\n` in `newText`. `LSPIJUtils.applyEdits` pastes it verbatim and IntelliJ rejects `\r` in document text. lsp4ij #381 (open, no milestone) is this failure [CITED: gh api repos/redhat-developer/lsp4ij/issues/381; its trace shows `"newText": "local t \u003d ... \r\n\r\n..."`].
**Why it happens:** the formatter owns output bytes; under LSP the editor owns separators (Pitfall 5 in `.planning/research/PITFALLS.md`).
**How to avoid:** the CRLF evaluation row has three sub-cases: (a) CRLF-on-disk file, default `KEEP`: expected pass, and the file on disk must still be CRLF after save; (b) `eolCharacter=CRLF` via the seam on that file; (c) `eolCharacter=LF` on it. If (b)/(c) produce no edit with no message that is a D-04 "CRLF file silently not formatted" candidate only for the default path (a); for (b)/(c) the planner's choice is in Open Question 1.
**Warning signs:** Reformat Code does nothing on a Windows-ending file; an `onError` balloon titled "LSP formatting error"; a `Wrong line separators` style exception in `idea.log`.

### Pitfall 2: `idea.log` has no request/response lines
**What goes wrong:** the requirement says "each backed by real `idea.log` evidence", but LSP traffic is not in `idea.log`. Server `window/logMessage` goes to the LSP console (`ServerMessageHandler.logMessage` -> `LSPConsoleToolWindowPanel.showLog`), and request traces appear only when the per-server `ServerTrace` is `messages` or `verbose` (enum values `off`, `messages`, `verbose`) [VERIFIED: javap `ServerTrace`]. The existing precedent file `tmp/intellij_traces.txt` has lines like `[Trace - 10:27:43] Sending request 'initialize - (1)'.` [VERIFIED: read]. The real `idea.log` has `BbjServerService`/`BbjLanguageServer` lifecycle lines (for example `Launching the BBj language server: ... --stdio (working directory: C:\tinybbj)`, `tmp/idea.log:1326-1346`).
**How to avoid:** each evaluation row cites (1) the `idea.log` lines (lifecycle, any WARN/ERROR/exception) and (2) the trace lines (`textDocument/formatting` or `rangeFormatting` request and response). Set Trace to `verbose` before the session, and copy the console to a file. Server-side `logger.debug` lines (for example `Format notice: ...`) will not show: IntelliJ's "Log level" setting never reaches the server (`createSettings()` is unused; `logLevel` is not an initialization option; the server sets its level only from `didChangeConfiguration`, `main.ts:202`), so the server stays at `WARN`. Do not promise server debug lines.
**Warning signs:** an evaluation row whose evidence is only a screenshot or only a trace.

### Pitfall 3: Evidence log polluted by headless builds
**What goes wrong:** `buildPlugin` runs `buildSearchableOptions`, a headless IDE that writes to the same sandbox `log/` (the existing `log/idea.log` is 700819 bytes, last written `Oct 3 12:54`, plus `open-telemetry-meters.*.json` files) [VERIFIED: `ls` of the sandbox].
**How to avoid:** after the final build and before the evaluation session, move or truncate `bbj-intellij/.intellijPlatform/sandbox/bbj-intellij/IC-2024.2/log/idea.log`, and record the session start time so excerpts can be time-filtered.

### Pitfall 4: Evaluating on IDE 2024.2 while the user's IDE is 2026.2
**What goes wrong:** the sandbox IDE is IC 2024.2. The user's Windows `idea.log` shows `Loaded custom plugins: ... LSP4IJ (0.21.0)` and the path `...\JetBrains\IntelliJIdea2026.2\...` (`tmp/idea.log:181, 1326`), i.e. build 262. Platform formatting code may differ across 242 and 262.
**How to avoid:** record the IDE build number in every row (`Help > About`, or the first lines of `idea.log`), and make the Windows checklist ask for it. The Windows run is the evidence for the user's actual IDE; the Linux run is evidence for the pinned `since-build` 242 baseline. IC 2025.2.6.3, 2025.1.7.2 and 2024.3.7.1 are in the Gradle cache (`.../files-2.1/idea/ideaIC/`) if the planner wants a third Linux data point; 2026.2 is not.

### Pitfall 5: First Reformat after open silently does nothing
**What goes wrong:** `canFormat` requires `canExecuteLSPFeature(file) == NOW`; during indexing (dumb mode) or before the language server session is ready the vendor service declines and IntelliJ uses its default (no formatter for BBj), which looks like "nothing happened".
**How to avoid:** the driver waits for smart mode (`%waitForSmart` in the script option) and for the status bar widget / `BbjServerService` "started" log line before the first action; the record notes the wait.

### Pitfall 6: Actions on Save is off by default and project-scoped
**What goes wrong:** `FormatOnSaveOptions` is a project-level `PersistentStateComponent` (state fields `myRunOnSave`, `myAllFileTypesSelected`, `mySelectedFileTypes`, `myFormatOnlyChangedLines`) [VERIFIED: javap]. It is not enabled in a fresh sandbox.
**How to avoid:** the driver or the user turns on Settings > Tools > Actions on Save > Reformat code once; then read back the project's resulting XML to cite it. The exact storage file name is [ASSUMED: `.idea/workspace.xml`]; confirm by reading `~/tinybbj/.idea` after toggling. Test both "whole file" and "only changed lines" (the latter produces range requests).

### Pitfall 7: Overlapping edits throw an `Error`
**What goes wrong:** `LSPIJUtils.applyEdits(Document, List)` throws `java.lang.Error("Overlapping edit")` on overlapping ranges [VERIFIED: javap `ldc "Overlapping edit"` then `Error.<init>`]. bbj-ls returns at most one minimal edit, so this should not occur, but a range answer wider than the selection (accepted per Phase 125) is where it would show; an `Error` would appear in `idea.log` as a stack trace rather than a balloon.
**How to avoid:** the selection row includes a selection that sits inside a multi-line statement (so the server snaps outward) and cites the response edit range from the trace.

### Pitfall 8: The `BbjLspFormattingSwitchTest` throwing-file design cannot run with the switch on
**What goes wrong:** `everyFormattingCheckAnswersFalseWithoutTouchingTheFile` passes a proxy `PsiFile` whose every method throws, which is only valid while the switch short-circuits `super`. With the switch on, `super.isEnabled` touches the file [VERIFIED: `BbjLspFormattingSwitchTest.java:34-60`].
**How to avoid:** see "Switch and fence tests": on "supported" this test is rewritten, not kept.

### Pitfall 9: Gradle `runIde` opens a hard-coded project directory
**What goes wrong:** `runIde { args = listOf(System.getProperty("user.home") + "/tinybbj") }` opens `/home/coder/tinybbj`, which does not exist in this container [VERIFIED: `ls` -> "No such file or directory"].
**How to avoid:** create `/home/coder/tinybbj` (outside the repo) holding the corpus; do not edit `build.gradle.kts` for evaluation purposes.

### Pitfall 10: Do not stage the stray `com/` directory
`git status` shows `?? com/` at the repo root. Stage by exact path only (project rule).

## Code Examples

### Seam skeleton (values quoted from the sources; do not add values not listed)

The 15 keys in the server's fixed order [VERIFIED: `bbj-format-settings.ts:30-46`, quoted]:
```
'indentWidth', 'indentCharacter', 'keywordsToUppercase', 'removeLineContinuation',
'splitSingleLineIf', 'splitInlineComments', 'splitInlineLabelComment', 'collapseMultiLine',
'eolCharacter', 'ifClosingKeyword', 'ifKeywordCase', 'parameterLayout', 'operatorSpacing',
'indentLabelBlocks', 'blankLineAfterReturn'
```
Defaults [VERIFIED: `bbj-format-settings.ts:52-68`, quoted]:
```
indentWidth: 2, indentCharacter: 'SPACE', keywordsToUppercase: false, removeLineContinuation: false,
splitSingleLineIf: false, splitInlineComments: false, splitInlineLabelComment: false,
collapseMultiLine: false, eolCharacter: 'KEEP', ifClosingKeyword: 'KEEP', ifKeywordCase: 'KEEP',
parameterLayout: 'KEEP_INITIAL_LAYOUT', operatorSpacing: 'KEEP', indentLabelBlocks: false,
blankLineAfterReturn: false
```
Types, bounds and enum values from `bbj-vscode/package.json` (lines 410-578) [VERIFIED: read]:

| Key | package.json type | Bounds / values | Default | Description (tooltip source) |
|-----|-------------------|-----------------|---------|------------------------------|
| `indentWidth` | integer | `"minimum": 0`, `"maximum": 16` | 2 | "Number of indent characters per block level, from 0 to 16." |
| `indentCharacter` | string enum | `SPACE`, `TAB` | `SPACE` | "Character used for indentation." |
| `indentLabelBlocks` | boolean | - | false | "Indent the statements between a subroutine label and its closing RETURN by one level." |
| `keywordsToUppercase` | boolean | - | false | markdownDescription: "Write BBj keywords in upper case. Wins over `#bbj.formatter.ifKeywordCase#`." |
| `ifClosingKeyword` | string enum | `KEEP`, `FI`, `ENDIF` | `KEEP` | markdownDescription (see file) |
| `ifKeywordCase` | string enum | `KEEP`, `MATCH_IF`, `LOWER_CASE`, `UPPER_CASE` | `KEEP` | markdownDescription (see file) |
| `splitSingleLineIf` | boolean | - | false | "Split a single-line IF statement across several lines." |
| `removeLineContinuation` | boolean | - | false | "Remove line-continuation characters." |
| `splitInlineComments` | boolean | - | false | "Move in-line comments onto their own line." |
| `splitInlineLabelComment` | boolean | - | false | "Move a label's in-line comment onto its own line." |
| `collapseMultiLine` | boolean | - | false | "Collapse consecutive blank lines into one." |
| `blankLineAfterReturn` | boolean | - | false | "Put exactly one blank line after a subroutine's closing RETURN." |
| `parameterLayout` | string enum | `KEEP_INITIAL_LAYOUT`, `NO_BLANK`, `BEFORE_COMMA`, `AFTER_COMMA`, `BEFORE_AND_AFTER_COMMA` | `KEEP_INITIAL_LAYOUT` | "Spacing around the commas between method parameters." |
| `operatorSpacing` | string enum | `KEEP`, `SPACED` | `KEEP` | "Spacing around binary operators." |
| `eolCharacter` | string enum | `KEEP`, `LF`, `CRLF` | `KEEP` | "Line ending of the formatted file." |

Control mix: 1 spinner, 6 combos (`indentCharacter`, `ifClosingKeyword`, `ifKeywordCase`, `parameterLayout`, `operatorSpacing`, `eolCharacter`), 8 checkboxes. VS Code's `order` values group them (1-3, 10-13, 20-26, 30); reuse that order for the Formatter section. The `markdownDescription` strings contain `` ` `` and `#bbj.formatter.x#` markup: strip those for Swing tooltips. `bbj.formatter.splitSingleLineIF` (capital IF) is the deprecated alias and must NOT get a control (SET-03 is VS Code only; the server normalizer maps the alias).

The legacy alias and normalizer mean IntelliJ must send exactly the 15 canonical keys; any other key is dropped by the server [VERIFIED: `bbj-format-settings.ts:107-116` doc comment].

Where the server reads it [VERIFIED: `bbj-ws-manager.ts:141-146`, quoted]:
```ts
const formatter = params.initializationOptions.formatter;
if (formatter !== undefined) {
    this.formatService().setSettings(formatter);
}
```
and the log omits the values: `{ ...options, formatter: '[omitted]' }` (`bbj-ws-manager.ts:64-71`). So `idea.log`/trace for the initialize request WILL show the formatter values only in the LSP trace (the client's own `initialize` trace), which is useful evidence for the settings row.

Factory attachment (shape, after the compiler keys and before `params.setInitializationOptions(options)`):
```java
options.add(FormatterInitOptions.FORMATTER_KEY, FormatterInitOptions.toJson(state.formatterValues()));
```
`BbjSettings.State` flat fields (names are the planner's; keep the serialized-name prefix `formatter` and the exact key spelling after it so the seeded XML is predictable), mirroring the existing style [VERIFIED: `BbjSettings.java:24-38`, e.g. `public String compilerTrigger = "debounced";`]. Probe of the on-disk shape [VERIFIED: ran `XmlSerializer.serialize(new BbjSettings.State())` with the IDE's `util.jar`]:
```xml
<State>
  <option name="javaInteropPort" value="6001" />
  <option name="autoSaveBeforeRun" value="false" />
  <option name="compilerTrigger" value="on-save" />
</State>
```
On disk the file is the application-level `<sandbox>/config/options/BbjSettings.xml` (`@State(name = "com.basis.bbj.intellij.BbjSettings", storages = @Storage("BbjSettings.xml"))`, `BbjSettings.java:18-21`); the component wrapper (`<application><component name="com.basis.bbj.intellij.BbjSettings">...`) is the platform's standard form [ASSUMED]. Defaults are omitted on write, so a seed only needs the changed fields. `config/options/` currently holds only `updates.xml`, so there is no `BbjSettings.xml` yet.

Notification handler (supported path), following `showDenumDiagnostics`:
```java
@JsonNotification("bbj/openFormatterSettings")
public void openFormatterSettings(Object ignoredPayload) {
    Project project = getProject();
    if (project.isDisposed()) { return; }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) { return; }
        ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
    });
}
```
The method-name constant is owned by the TS side [VERIFIED: `format-settings-notification.ts`: `export const OPEN_FORMATTER_SETTINGS_METHOD = 'bbj/openFormatterSettings';` and "Open the settings view with a fixed query ... and ignore the keys."].

## Folded todo: `javaInterop*` versus `interopHost`/`interopPort`

**Every reader and writer found** (source trees only; documentation and QA contain none):

| Where | Spelling | Role |
|-------|----------|------|
| `bbj-vscode/src/language/bbj-ws-manager.ts:85` | `interopHost`, `interopPort` | server reader (only reader) |
| `bbj-vscode/src/extension.ts:922-923` | `interopHost`, `interopPort` | VS Code writer [VERIFIED: read 914-929] |
| `bbj-vscode/test/extension-config-trust.test.ts:405-425`, `bbj-vscode/test/interop-config.test.ts:89-96` | `interopHost`, `interopPort` | tests pin the server spelling |
| `bbj-intellij/.../lsp/BbjLanguageServerFactory.java:64,67` | `javaInteropHost`, `javaInteropPort` | the only writer of the wrong spelling [VERIFIED: read] |
| `bbj-intellij/.../BbjSettings.java:29-31`, `BbjSettingsConfigurable.java`, `BbjJavaInteropService.java:227` | `state.javaInteropHost` / `state.javaInteropPort` | persisted State field names; unrelated to the wire keys, unchanged |
| `bbj-intellij/src/test/...` | none for the wire strings | `EffectiveInteropPortSourceGuardTest` counts `state.javaInteropPort`/`state.javaInteropHost` (State access), not the wire strings |

**Recommendation: rename on the IntelliJ side** (change the two `addProperty` string literals to `"interopHost"` and `"interopPort"`). Nothing reads the old names, so no compatibility shim is needed, and the server contract stays single-spelled. Add a small test, `InteropInitOptionsContractTest`, in the style of `ConfigReloadNotificationContractTest` (reads text only): assert the factory source contains the quoted `interopHost` and `interopPort` and no quoted `javaInteropHost`/`javaInteropPort`, and that `bbj-ws-manager.ts` contains `initializationOptions.interopHost` and `initializationOptions.interopPort`. Keep `state.javaInteropHost` once in the factory (the host is read from State; `EffectiveInteropPortSourceGuardTest` guards the port accessor, and the host guard is on `BbjJavaInteropService`). Close the todo by moving `.planning/todos/pending/2026-09-26-intellij-interop-initoptions-key-mismatch.md` to `.planning/todos/completed/` (the `completed/` directory exists and holds earlier todos). The behaviour change above goes into the SUMMARY and, because it is a user-visible effect, the evaluation should note that the interop host/port in the initialize trace now read `interopHost`/`interopPort`.

## Switch and fence tests

Current pinning [VERIFIED: read]:
- `BbjLanguageServerFactory.java:36`: `private static final boolean LSP_FORMATTING_ENABLED = false;`; all four overrides are `return LSP_FORMATTING_ENABLED && super.<name>(file);` (lines 113-130).
- `Lsp4ijOverrideSiteSourceGuardTest.theLspFormattingSwitchIsOneConstantSetToFalseThatGatesAllFourFormattingChecks` (lines 125-144) asserts: the exact text `private static final boolean LSP_FORMATTING_ENABLED = false;` appears once; each of the four method declarations appears once in the `new LSPFormattingFeature()` body; `LSP_FORMATTING_ENABLED && super.` appears exactly 4 times.
- `Lsp4ijOverrideSiteSourceGuardTest.createClientFeaturesBuildsOneDocumentLinkThenOneCompletionThenOneFormattingFeatureWithOneInitializeParamsOverride` (lines 106-123) pins one `setFormattingFeature(` after `setCompletionFeature(`, and exactly one `public void initializeParams(` override.
- `BbjLspFormattingSwitchTest` (all four answer `false` for a throwing `PsiFile`) and `Lsp4ijCouplingCanaryTest` (lines 84-111: `LSPFormattingFeature` still carries the `@ApiStatus.Experimental` marker; the four members exist, return boolean, are public and not final).
- `Lsp4ijImportAllowlistTest` allowlists vendor symbols per file; a new constant adds none. A new import of `com.redhat.devtools.lsp4ij.*` anywhere (for example an override needing a new vendor type) would require an allowlist edit.

How to pin a second constant (D-06): declare `private static final boolean LSP_RANGE_FORMATTING_ENABLED = <bool>;` next to the first and change only the range override to `return LSP_FORMATTING_ENABLED && LSP_RANGE_FORMATTING_ENABLED && super.isRangeFormattingSupported(file);`. Then update the source guard: the count of `LSP_FORMATTING_ENABLED && super.` becomes 3, add `assertEquals(1, countOccurrences(text, "private static final boolean LSP_RANGE_FORMATTING_ENABLED = "))` and an assertion that the range method body holds `LSP_FORMATTING_ENABLED && LSP_RANGE_FORMATTING_ENABLED && super.isRangeFormattingSupported`. A second constant should be introduced only on the "supported-no-range" verdict; on "supported" it must not exist.

Per verdict, test edits:
- **disabled:** no code or test change beyond the javadoc on the constant (D-14), plus removing the seam and State fields (D-05). The existing tests stay green unchanged. Update the javadoc to name the evaluation record and the blockers.
- **supported:** change the constant to `true`; change the guard's literal to `= true;`; `BbjLspFormattingSwitchTest.everyFormattingCheckAnswersFalseWithoutTouchingTheFile` cannot stay (Pitfall 8): replace it with a test that the installed feature is still the gated subclass (the first test) and a text guard that all four checks still short-circuit on the constant. Do not try an inverse "throws" test: `LanguageFormatting.INSTANCE` needs the platform Application and would fail for the wrong reason in plain JUnit [ASSUMED].
- **supported-no-range:** as supported, plus the second constant `false` and its guard.
- If the evaluation shows `isEnabled` false because of an IDE `FormattingModelBuilder` (not expected, BBj registers none, `BbjLanguage` has no base language), the remedy is overriding `isExistingFormatterOverrideable` to `true` in the same anonymous class, with `"isExistingFormatterOverrideable"` added to the canary's member loop (currently `"isEnabled", "isSupported", "isFormattingSupported", "isRangeFormattingSupported"`, `Lsp4ijCouplingCanaryTest.java:103`).

## Supported-path UI

Patterns already in `BbjSettingsComponent` / `BbjSettingsConfigurable` [VERIFIED: read in full]:
- Sections are `.addComponent(new TitledSeparator("BBj Compiler"))` followed by `.addLabeledComponent(new JBLabel("Compiler check:"), compilerTriggerCombo, 1, false)` and an `.addComponent(compilerTriggerHintLabel)` hint line. Add `.addComponent(new TitledSeparator("Formatter"))` right after the compiler block (before "Node.js Runtime"), 15 labelled controls, then a `JBLabel` note ("applies after the language server restarts").
- Combos are `ComboBox<String>` over `CollectionComboBoxModel<>(List.of(...))`; read with `getSelectedItem()`, write with `setSelectedItem(...)`; the compiler trigger shows display names and maps to wire values through `CompilerInitOptions`. For the formatter combos show the wire values themselves (D-10: "the same values") and put the `enumDescriptions` text in the tooltip.
- There is **no spinner anywhere in the plugin today** (`grep` for `JSpinner`/`JBIntSpinner` under `bbj-intellij/src` is empty); the premise that one already exists is wrong. `JBIntSpinner(int value, int min, int max)` exists in platform 242.
- `isModified()` is one long `||` chain of `!Objects.equals(component.getX(), state.x)`; `apply()` writes each field then runs `EditorNotifications...updateAllNotifications()` and `BbjServerService.getInstance(project).scheduleRestart()` for every open project; `reset()` loads each field with defaults. The restart is debounced and happens on every Apply [VERIFIED: `BbjSettingsConfigurable.java:44-102`]. To avoid 15 more lines in each of three places, give the component `getFormatterValues()` / `setFormatterValues(Values)` and the seam a `Values` value class with `equals`, so `isModified` adds one comparison.
- `BbjSettingsComponentSourceGuardTest` forbids filesystem/subprocess work in the component; spinner/combos/checkboxes do none.
- A normalized read protects hand-edited XML: `reset()` should push `FormatterInitOptions.normalize...` results (as it does `CompilerInitOptions.normalizeTrigger(state.compilerTrigger)`), and `isModified()` should compare against the normalized value so a hand-edited out-of-range value does not look "modified" forever.
- Focusing the section on `bbj/openFormatterSettings` is cheap with `showSettingsDialog(project, BbjSettingsConfigurable.class, c -> c.focusFormatterSection())`; if not cheap, omit (D-12 allows it).

`ComposerRequestContractTest` pins request names only (`DECLARED_REQUESTS` ends with `"bbj/denum"`, lines 52-68) and its javadoc scope is "requests"; a notification does not touch it [VERIFIED: read]. The notification-level pattern to copy is `ConfigReloadNotificationContractTest` (text-only comparison against `config-reload-notification.ts`) plus `BbjLanguageClientDenumNotificationTest` (asserts the name is in `ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class)` as a notification and parses a literal JSON-RPC message). Add the same two for `bbj/openFormatterSettings`, with the TS side `format-settings-notification.ts`. Per the standing rule, a `BbjLanguageClient` notification change runs the whole `bbj-intellij ./gradlew test`.

## Code-verified cases (D-03)

The planner can cite these as the evidence for the rows the record labels "code-verified". Each is an existing test; none was re-run in this session except where stated.

| Case | Test (file : test name) | What it proves |
|------|-------------------------|----------------|
| `config.bbx` / BBx Config untouched (FMT-12) | `bbj-vscode/test/bbj-formatting-handler.test.ts:124` "a config document and a plain text document give no edit and are never sent to the formatter" | `[]` and `formatProgramCalls` stays empty for `file:///ws/config.bbx` opened with `CONFIG_DOCUMENT_LANGUAGE_ID`. Handler doc: "The language check is a positive allow-list" (`bbj-formatting-handler.ts` header) |
| IntelliJ does map config files to the server | `plugin.xml`: `languageMapping language="BBx Config" ... languageId="bbx-config"` [VERIFIED: read] | The client side does not exclude config files; the server-side guard above is the protection. lsp4ij #1647 (commit reformat cannot be filtered by file type, open) is therefore real for this plugin; the effect is a harmless `[]` |
| Bounded handler, no wait for workspace | `bbj-formatting-handler.test.ts:110` "a format resolves while the workspace is still loading and no document wait is started" | answers while `WorkspaceManager.ready` never settles |
| No hang when interop is down or `formatProgram` missing | `bbj-format-notices.test.ts:98` "is reported once per connection and a reconnect re-arms it" (older BBj, `method-not-found`), `:117` (two formats, one message), `:254` "a failed outcome with an empty peer message still shows the fixed text"; `java-interop-program-lane.ts` deadlines `PROGRAM_REQUEST_TIMEOUT_MS = 15_000` and `PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS = 25_000` | one clear Warning, `[]` edits, request cancelled on the wire at 15 s |
| Stale answer dropped | `bbj-format-service.test.ts:149` "an answer for an older version is dropped when the document was edited meanwhile", `:162` (closed meanwhile) | never applies an edit computed for an older version |
| Minimal edits, no dirty flag when already formatted | `bbj-format-edit.test.ts:33-143` (`minimalLineEdit`), seeded round trip `:184`, `bbj-format-service.test.ts:87` "an open buffer comes back as one edit over the changed line only", `:139` "text that is already formatted gives no edit" | one edit over changed lines; none when equal |
| Editor `tabSize`/`insertSpaces` cannot change the settings | `bbj-format-service.test.ts:127` | LSP4IJ's `FormattingOptions` are ignored (lsp4ij #1323 closed 2025-10-08, milestone 0.18.0, but the server ignores the value anyway) |
| Range edits wider than the selection | `bbj-format-service.test.ts:255` "an edit that reaches past the selection is accepted at its own range, not clipped to the selection" | This is the Phase 125 decision; in IntelliJ the platform applies the whole new text, so the effect is visible in the selection row |

LSP4IJ upstream issue status fetched with `gh api` this session [VERIFIED: tool output]:

| Issue | State | Relevance |
|-------|-------|-----------|
| #381 CRLF cannot be formatted | open, no milestone | Pitfall 1; the failure path is `\r\n` in `newText` |
| #1404 text edits at the same position not applied in LSP order | closed 2026-05-20, milestone 0.19.4 | fixed before 0.21.0; bbj-ls returns one edit, so irrelevant either way |
| #1647 commit-dialog reformat cannot be filtered by file type | open | formatter would also run for "BBx Config" files; server returns `[]` |
| #388 / #424 existing formatter blocks LSP formatting | closed 2024-10 (milestone 0.7.0) | became `isExistingFormatterOverrideable`; BBj has no `FormattingModelBuilder` |
| #1323 custom `tabSize` in formatting request | closed 2025-10-08 (milestone 0.18.0) | `getFormattingOptions`/`getTabSize`/`getInsertSpaces` are overridable in 0.21.0 |

## Driving the evaluation

### What the container offers [VERIFIED: probes this session]
- No display: `DISPLAY` and `WAYLAND_DISPLAY` are empty, `/tmp/.X11-unix` does not exist.
- `Xvfb` and `xvfb-run` are installed. No `xdotool`, no VNC server, no window manager (`openbox`, `fluxbox`, `icewm`, `twm`, `metacity`, `xfwm4` all absent), no ImageMagick `import`/`scrot`. `ffmpeg` has `x11grab`. Python `Xlib` is absent.
- `xvfb-run -a -s "-screen 0 1600x1000x24" /opt/java/17/bin/java RobotProbe.java out.png` produced a 1600x1000 PNG and sent a Ctrl+Alt+L key chord without error. Whether key events reach an IntelliJ window without a window manager (X focus follows the pointer on Xvfb) is [ASSUMED] and is the first spike; move the pointer into the IDE window with `Robot.mouseMove` before keys.
- The IDE 2024.2 distribution is unpacked in the Gradle cache and ships `plugins/performanceTesting`. Commands with `PREFIX` constants read by javap: `%openFile`, `%goto`, `%selectText`, `%reformat`, `%executeEditorAction`, `%saveDocumentsAndSettings`, `%pressKey`, `%waitForSmart`, `%exitApp`; classes for `TakeScreenshotCommand`, `DelayTypeCommand` and `CloseAllTabsCommand` also exist. Enabling property: `testscript.filename` [VERIFIED: constant in the plugin classes]. `%reformat` runs `new ReformatCodeProcessor(project, false)` (a project-level processor, [ASSUMED] not the same entry as the editor action), so prefer `%executeEditorAction ReformatCode` for the current-file case; whether that and the property work inside the `runIde` sandbox is unverified.
- Java 25 is the default `java`; the Gradle toolchain is JDK 17 (`/opt/java/17`, `/opt/java/21` registered in `~/.gradle/gradle.properties`); Node is v24.20.0 (the plugin needs 22+).
- BBjServices on `127.0.0.1:5008` is up (TCP connect succeeded); `/opt/bbx/.lib/bbjls/bbj-ls.jar` (305339 bytes, `Oct 2 00:37`) contains `bbj/interop/FormatWorker` and `bbj/interop/denum/*`, so `formatProgram` and `denumProgram` are present [VERIFIED: `unzip -l`].

### Recommended driver order (each step is a spike gate; stop at the first that works)
1. **`performanceTesting` script** via `./gradlew runIde` with a jvm arg `-Dtestscript.filename=<abs path to .ijperf>` under `xvfb-run -a` (needs a display even for scripts) [ASSUMED]. Script lines such as `%openFile /home/coder/tinybbj/a.bbj`, `%waitForSmart`, `%executeEditorAction ReformatCode`, `%saveDocumentsAndSettings`, `%takeScreenshot ...`, `%exitApp`. This runs the real editor action with no key injection and exits cleanly, so `idea.log` is complete when it ends.
2. **Robot driver**: `xvfb-run` wrapping `runIde`, plus a separate Java Robot process that moves the pointer into the window, sends Ctrl+Alt+L / Ctrl+S, and saves PNGs Claude can read with the image `Read` tool. Fragile around dialogs and focus.
3. **The user clicks**, in the user's own IDE, for anything not driven. This is the only route for the Windows run (D-02) and, honestly, for confirming what a human sees in the balloons.

"Headful on the container display" (D-01) cannot be literal here; say so in the plan. Nothing about the Xvfb run is watchable by the user, which is why the screenshots and the trace file are part of the evidence.

### Build, load, seed, log [VERIFIED unless marked]
1. Build order: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, then `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew buildPlugin --console=plain -q`. `buildPlugin` depends on `test`, so the whole IntelliJ suite runs (last recorded: 1263 tests, 0 failures, `build/test-results/test`). Prove the zip's language server with `unzip -p .../bbj-intellij-0.1.0.zip bbj-intellij/lib/language-server/main.cjs | cmp - /home/coder/repos/bbj-language-server/bbj-vscode/out/language/main.cjs`; when `main.cjs` is unchanged Gradle may report the zip UP-TO-DATE (memory: use `./gradlew clean buildPlugin` to force). `buildSearchableOptions` prints a Swing stack trace in a headless run; that is noise (exit code 0).
2. Sandbox location in IPGP 2.19 is `/home/coder/repos/bbj-language-server/bbj-intellij/.intellijPlatform/sandbox/bbj-intellij/IC-2024.2/` with `config`, `plugins`, `system`, `log` (and `-test` twins); NOT `build/idea-sandbox` (that directory does not exist now, although earlier phase notes cite it). `plugins/` holds `bbj-intellij` and `lsp4ij`; `plugins/bbj-intellij/lib/language-server/main.cjs` is byte-identical to `bbj-vscode/out/language/main.cjs`.
3. Loading "the built zip": `runIde` loads the `prepareSandbox` output, which is built from the same jar and bundle as the zip. Prove equivalence rather than unzipping: compare `main.cjs` (done above) and the jar size/hash against the zip's `bbj-intellij/lib/bbj-intellij-0.1.0.jar`. If the user wants the literal zip, extract it over `plugins/bbj-intellij` and run `runIde -x prepareSandbox` [ASSUMED to work].
4. `runIde` opens `/home/coder/tinybbj` (hard-coded); create it with the corpus. No CRLF file exists under `examples/` (`grep -lU $'\r'` over `*.bbj *.bbx *.min` found none) and no verified numbered example was found, so build the corpus: a copy of a real `examples/` program, a CRLF copy made with `sed 's/$/\r/'`, a three-line numbered program, an already-formatted file, `config.bbx` copied from `examples/config.bbx`, and a larger program (the largest `examples/*.bbj` is `interfaces.bbj`, 100 lines, so a synthetic large file is needed for the apply-time observation).
5. Seed `BbjSettings` by writing `<sandbox>/config/options/BbjSettings.xml` before launching; `BbjSettings.getState()` auto-detects BBj home (`/opt/bbx`) and Node when the fields are empty, so only the seam fields and anything non-default need seeding. Restart after a change through the existing "Restart BBj Language Server" Tools action or `BbjServerService.scheduleRestart` (the Settings Apply path is for the supported UI that does not exist yet).
6. Trace: Settings > Languages & Frameworks > Language Servers > BBj Language Server, set Trace to `verbose` [ASSUMED label; the setting is `LanguageServerDefinitionSettings.serverTrace` of type `ServerTrace`, verified]. The console is in the Language Servers tool window; copy it to a file after each case.
7. `idea.log` at `<sandbox>/log/idea.log`. The real lines available to cite include the plugin's own: `BbjServerService - BBj language server status: stopped -> started (classified as NOT_A_STOP)`, `BbjLanguageServer - Launching the BBj language server: ...` [VERIFIED: `tmp/idea.log:1326-1346`, a real Windows log].
8. Actions on Save and the commit dialog: see Pitfall 6. The commit-dialog case is code-verified per D-03; do not hand-run it.

### Honest split: what Claude can and cannot do
Claude can: build, create the corpus and seed, launch under Xvfb, drive actions through whichever driver passes its spike, take screenshots, read `idea.log`, and compare buffer text on disk and in the saved file. Claude cannot: watch a display, observe Windows or macOS, or judge what a user sees in a sticky balloon beyond a screenshot. Every row's "driven by" column should say `script`, `robot`, `user` or `code-verified`.

## Decision checkpoint mechanics

Plan files are static, so the conditional work is split into plans that each begin with a deterministic guard. GSD's checkpoint formats: `checkpoint:decision` carries `<decision>`, `<context>`, `<options>` with per-option `<name>/<pros>/<cons>`, and `<resume-signal>`; `checkpoint:human-verify` carries `<what-built>`/`<how-to-verify>`/`<resume-signal>` [CITED: `/home/coder/.claude-shared/dot-claude/gsd-core/references/checkpoints.md`, "checkpoint:decision" section]. `checkpoint:decision` is not suppressed by `human_verify_mode` (same file, line 37).

Recommended structure (`autonomous: false` where a checkpoint exists):

| Plan | Wave | Content | Reversible by |
|------|------|---------|----------------|
| 129-01 | 1 | Interop key rename + contract test + close the todo | permanent |
| 129-02 | 1 | `FormatterInitOptions` seam, flat State fields, factory wiring, unit/contract/source-guard tests; its own commits | `git revert` of this plan's commits (D-05) |
| 129-03 | 2 | Build both distributables; Wave-0 spike on the driver; corpus, seed, trace; Linux case runs; write `129-EVALUATION.md` with `idea.log` + trace excerpts, "code-verified" rows labeled; write `129-WINDOWS-CHECKLIST.md`; draft D-15 issue files for LSP4IJ-caused blockers | n/a |
| 129-04 | 3 | `checkpoint:human-action` (user returns the Windows `idea.log` and trace, with IDE build number) -> add rows -> Claude's recommended verdict measured against D-04 -> `checkpoint:decision` (options `supported`, `supported-no-range`, `disabled`) -> write `129-VERDICT.md` | n/a |
| 129-05 | 4 | **Supported path.** Task 1 guard (below). Flip the constant(s), update tests, State UI wiring, settings section, `bbj/openFormatterSettings` handler + tests | skipped on `disabled` |
| 129-06 | 4 | **Disabled path.** Task 1 guard. Revert plan 02's commits, move IJF-04 to Out of Scope in `REQUIREMENTS.md` (bullet and traceability row), javadoc on the constant pointing at the record, finalize D-15 drafts | skipped on `supported*` |
| 129-07 | 5 | Final gate from the final tree: rebuild both distributables, `cd bbj-intellij && ./gradlew cleanTest test` at or above the 1263 baseline, register-check the source diff, hand UAT of the settings page from the final zip (supported only), update `REQUIREMENTS.md` IJF-02/03(/04) | n/a |

Guard task (first task of 05 and 06), runnable by an executor with no judgement:
```
test "$(sed -n 's/^verdict: //p' /home/coder/repos/bbj-language-server/.planning/phases/129-intellij-verdict/129-VERDICT.md)" = "supported"   # 05 also accepts supported-no-range
```
On mismatch the executor writes a SUMMARY stating "skipped: verdict is <x>" and makes no code change. `129-VERDICT.md` frontmatter keys: `verdict` (`supported`, `supported-no-range`, `disabled`), `decided_by: user`, `decided_at`, `blockers: [..]`, `known_issues: [..]`, `recommended: <what Claude recommended>`. The plan-checker and `gsd` verify tools should not expect plan 05 and 06 to both be "executed".

Alternative if the plan-checker rejects the conditional pair: plan only 01-04 now and run `/gsd-plan-phase 129` again after the verdict for the post-verdict plans. This costs one extra planning pass but keeps every plan unconditional.

Memory-derived execution cautions that bear on this structure: diff `REQUIREMENTS.md` after each plan (a continuation executor once marked a shared requirement early); executors must not use `git stash`; shell rules (absolute paths, `git -C`, no `cd ... && grep`) go into every subagent prompt; `use_worktrees` is true but a fresh per-phase branch normally trips the base-check degrade to sequential, so expect sequential execution; run `./gradlew` tests in the foreground; the GSD commit helper writes subject only, so add the `Co-Authored-By` trailer through plain `git`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Formatting gated by whether an IDE `FormattingModelBuilder` exists, no way around it (lsp4ij #388, #424) | `LSPFormattingFeature.isExistingFormatterOverrideable(file)` | lsp4ij 0.7.0 (2024-10) | Present in 0.21.0 [VERIFIED: javap]; irrelevant while BBj has no formatter |
| Fixed `tabSize`/`insertSpaces` from the editor | Overridable `getFormattingOptions`/`getTabSize`/`getInsertSpaces` | lsp4ij 0.18.0 (#1323) | [VERIFIED: javap members]; the server ignores them, so no override needed |
| LSP4IJ-specific formatting actions | Platform `AsyncDocumentFormattingService` services | already in 0.21.0 | Reformat Code, Actions on Save and range reformat all flow through `FormattingServiceUtil` [VERIFIED: javap] |

**Deprecated/outdated:**
- Earlier phase notes cite `bbj-intellij/build/idea-sandbox/IC-2024.2/...`; with IPGP 2.19.0 the sandbox is under `.intellijPlatform/sandbox/bbj-intellij/IC-2024.2/` [VERIFIED: directory listing].
- `LSPFormattingFeature` still carries the experimental marker (the canary asserts it); treat any 0.22+ upgrade as a re-audit.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The first boolean of `FormattingServiceUtil.findService(file, boolA, boolB)` is "explicit" and the second "whole file", so Actions on Save may or may not reach the LSP services | Pattern 1 | Wrong reading changes what the "Actions on Save" row can observe; the runtime trace decides |
| A2 | `performanceTesting` scripts (`testscript.filename`, `%executeEditorAction ReformatCode`) work inside the `runIde` sandbox under Xvfb | Driving the evaluation | If not, fall back to Robot or the user; spike first |
| A3 | Key events reach IntelliJ on Xvfb without a window manager when the pointer is inside the window | Driving the evaluation | If not, install nothing; use the script driver or the user |
| A4 | The on-disk `BbjSettings.xml` wraps the `<option>` list in `<application><component name="com.basis.bbj.intellij.BbjSettings">` | Code Examples | Seeding fails silently; confirm by letting the IDE write the file once and diffing |
| A5 | `FormatOnSaveOptions` persists to project `.idea/workspace.xml` | Pitfall 6 | Seed by toggling in the UI and reading back |
| A6 | LSP4IJ's Trace dropdown is labelled "Trace" under the server's settings page, and the console has a copyable trace tab | Driving the evaluation | The user may have to find the control; the existing `tmp/intellij_traces.txt` proves the output exists |
| A7 | With the range constant off, a selection reformat does nothing (no `FORMAT_FRAGMENTS` service, no BBj builder) | Pattern 1 | The "supported-no-range" verdict would not behave as D-06 describes; observe it once |
| A8 | `ReformatCodeProcessor(project, false)` used by `%reformat` is project-level, not the editor action | Driving the evaluation | Only affects which script command to pick |
| A9 | `LanguageFormatting.INSTANCE` needs the platform Application, so a plain-JUnit "inverse" switch test would be fragile | Switch and fence tests | Low; a source guard is the recommended route either way |

## Open Questions (RESOLVED)

Each question below is resolved by measurement in plans 129-03/129-04 (Actions on Save request visibility, CRLF, IDE build representativeness, driver choice) or put to the user as an explicit sub-question at the 129-05 decision checkpoint (eolCharacter LF/CRLF exposure).

1. **What does `eolCharacter` do in IntelliJ, and does IJF-04's "all 15 settings" survive the answer?**
   - What we know: IntelliJ documents are LF in memory; bbj-ls treats terminator changes as real edits and does not normalize them (`bbj-format-edit.ts:14-19`, no `eol` handling in `bbj-format-service.ts`); `LSPIJUtils.applyEdits` does no `\r` handling; #381 is open.
   - What's unclear: whether forcing `CRLF`/`LF` produces a visible failure, a silent no-op, or a platform exception in 242 and 262.
   - Recommendation: measure it as sub-cases (b) and (c) of the CRLF row. If it breaks, do not silently drop the control (IJF-04 says all 15): keep it, document the limitation in the Formatter section's note, and let the user decide at the checkpoint whether it is a known issue or part of the verdict. This is a user decision, so surface it in the checkpoint.

2. **Is IDE 2024.2 representative enough?**
   - What we know: the user's real IDE is 2026.2 (`tmp/idea.log:181, 1326`); the compile target and `since-build` are 242.
   - What's unclear: whether 242 and 262 differ in formatting behavior for this plugin.
   - Recommendation: the Windows run on the user's IDE is the deciding evidence for the user's own setup; consider one extra Linux run on cached IC 2025.2.6.3 if the Linux and Windows rows disagree.

3. **Which of Actions on Save paths produce LSP requests?**
   - What we know: neither LSP service has `AD_HOC_FORMATTING`; `FormatOnSaveOptions` has "whole file" and "only changed lines" modes.
   - What's unclear: whether save is explicit.
   - Recommendation: the evaluation records the request or its absence in the trace; D-07 says a blocker here means "disabled" overall, and "no request at all" is not data loss, so classify it as a known issue unless the verdict logic is changed by the user.

4. **Does the driver pass its spike?**
   - Recommendation: make the driver choice the first task of plan 03, with a one-file proof (open, reformat, screenshot, read back), and record which driver produced each row.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Display / `DISPLAY` | Literal "headful" run (D-01) | ✗ | - | `xvfb-run` virtual display; user's own machines for anything visible |
| `Xvfb`, `xvfb-run` | Any runIde evaluation here | ✓ | `/usr/bin/Xvfb` | - |
| `xdotool`, VNC, window manager | Input injection / watching | ✗ | - | Java Robot; `performanceTesting` scripts |
| `java.awt.Robot` under Xvfb | Key events, PNG capture | ✓ (probe passed) | JDK 17.0.20.1 | - |
| `ffmpeg` with `x11grab` | Screenshots / video | ✓ | `/usr/bin/ffmpeg` | Robot `createScreenCapture` |
| IDE `performanceTesting` plugin | Scripted actions | ✓ | 242.20224.300 | Robot, user |
| IC 2024.2 distribution | `runIde`, buildSearchableOptions | ✓ (Gradle cache) | 242.20224.300 | - |
| LSP4IJ 0.21.0 | Everything | ✓ | 0.21.0 | - |
| Gradle (offline) + JDK 17 toolchain | Build, tests | ✓ | Gradle 9.8.0; `./gradlew test --offline` ran in 3.7 s for two classes | - |
| Node | Language server | ✓ | v24.20.0 (plugin needs 22+) | - |
| BBjServices :5008 with `formatProgram` | Every format case | ✓ | `bbj-ls.jar` 305339 bytes, has `FormatWorker` | Rows that need it are blocked; no fallback |
| `/home/coder/tinybbj` | `runIde` project argument | ✗ | - | Create it with the corpus |
| Windows machine with IntelliJ 2026.2 + LSP4IJ 0.21.0 | D-02 | user-side | evidence of build 262 in `tmp/idea.log` | none |

**Missing dependencies with no fallback:** a literal visible display (the user-side Windows run covers visibility).
**Missing dependencies with fallback:** `~/tinybbj` (create), input injection (Robot or script).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit Jupiter via `junit-bom:6.1.3` (IntelliJ plugin); vitest 4.1.10 (language server, unchanged this phase) |
| Config file | `/home/coder/repos/bbj-language-server/bbj-intellij/build.gradle.kts` (`useJUnitPlatform()`); `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --console=plain --tests '*FormatterInitOptions*' --tests '*InteropInitOptions*' --tests '*Lsp4ijOverrideSiteSourceGuardTest' --tests '*BbjLspFormattingSwitchTest'` (the last two ran green in 3.7 s this session) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew cleanTest test --offline --console=plain` (needs `bbj-vscode/out/language/main.cjs` for packaging tasks only; last count 1263 tests, 0 failures) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IJF-02 | Record has a row for each of the seven hands-on cases, each with an `idea.log` excerpt and a trace excerpt (or a "code-verified" label naming a test) | document check | `grep -c '^| ' /home/coder/repos/bbj-language-server/.planning/phases/129-intellij-verdict/129-EVALUATION.md` plus a per-case `grep -q` for each case id | ❌ Wave 0 (record not yet written) |
| IJF-02 | The zip under test carries the fresh server | build check | `unzip -p /home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip bbj-intellij/lib/language-server/main.cjs \| cmp - /home/coder/repos/bbj-language-server/bbj-vscode/out/language/main.cjs` | ✅ |
| IJF-03 | Constant(s) match the verdict | source guard + document check | `Lsp4ijOverrideSiteSourceGuardTest.theLspFormattingSwitch...` (edited per verdict) and `grep -n 'LSP_FORMATTING_ENABLED = ' .../BbjLanguageServerFactory.java` compared to `129-VERDICT.md` in the plan's verify step (tests must not read planning files) | ✅ test exists; verdict compare ❌ Wave 0 |
| IJF-03 | Gate still wraps all four checks | unit | `BbjLspFormattingSwitchTest` (kept on disabled; replaced on supported) | ✅ |
| IJF-03 | Vendor surface unchanged | unit | `Lsp4ijCouplingCanaryTest`, `Lsp4ijImportAllowlistTest` | ✅ |
| IJF-04 | The 15 keys, defaults, bounds and enum values agree with the TS whitelist and `package.json` | contract (text) | `FormatterInitOptionsContractTest` | ❌ Wave 0 |
| IJF-04 | Normalization: null, blank, unknown, out-of-range fall back to defaults; idempotent; all 15 keys always present with explicit values | unit | `FormatterInitOptionsTest` | ❌ Wave 0 |
| IJF-04 | Seam has no `import com.intellij` | source guard | `FormatterInitOptionsTest` (style of `theSeamHasNoIntellijImport`) | ❌ Wave 0 |
| IJF-04 | The factory attaches `formatter` before `params.setInitializationOptions(options)` exactly once; `getEffectiveJavaInteropPort()` still once | source guard | extend `Lsp4ijOverrideSiteSourceGuardTest` / new `FormatterInitOptionsSourceGuardTest`; `EffectiveInteropPortSourceGuardTest` unchanged | ❌ Wave 0 / ✅ |
| IJF-04 | `isModified`/`apply`/`reset` cover all 15; value stored before `scheduleRestart()` | source guard | new `BbjSettingsFormatterSourceGuardTest` (style of `CompilerOutputDirectorySourceGuardTest`) | ❌ Wave 0 (supported only) |
| IJF-04 | `bbj/openFormatterSettings` is a registered notification with the TS name; handler never reads the payload | unit + contract | new `BbjLanguageClientOpenFormatterSettingsTest` (style of `BbjLanguageClientDenumNotificationTest`) and a name check against `format-settings-notification.ts` | ❌ Wave 0 (supported only) |
| Folded todo | `interopHost`/`interopPort` written by IntelliJ and read by the server | contract (text) | `InteropInitOptionsContractTest` | ❌ Wave 0 |
| All | No regression | full suite | the full command above, at or above 1263 tests | ✅ |

On "disabled", the supported-only rows are not applicable, and the seam/State tests are removed with the seam.

### Sampling Rate
- **Per task commit:** the quick run command above (seconds).
- **Per wave merge:** `./gradlew cleanTest test --offline` (whole IntelliJ suite) plus `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` only if a TS file changes (none is planned; run it if anything under `bbj-vscode/` is touched).
- **Phase gate:** full IntelliJ suite green, both distributables rebuilt from the final tree, source diff register-checked for planning ids in comments, then `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `FormatterInitOptionsTest.java`, `FormatterInitOptionsContractTest.java`, `InteropInitOptionsContractTest.java`, extensions of `Lsp4ijOverrideSiteSourceGuardTest`
- [ ] Driver spike result recorded (which of script / Robot / user drives which row)
- [ ] Evaluation corpus under `/home/coder/tinybbj` and a seed `BbjSettings.xml` recipe verified by letting the IDE rewrite it once
- [ ] Supported-only: `BbjSettingsFormatterSourceGuardTest`, `BbjLanguageClientOpenFormatterSettingsTest`
- Framework install: none.

## Security Domain

`security_enforcement` is absent in `.planning/config.json`, so it is treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | - |
| V3 Session Management | no | - |
| V4 Access Control | no | - |
| V5 Input Validation | yes | Seam normalization (allow-list of enum values, integer bounds 0..16) before anything reaches `initializationOptions`; the server whitelists again; the notification payload is not read at all |
| V6 Cryptography | no | - |
| V12 Files and Resources | yes | Evaluation writes only under `/home/coder/tinybbj`, the sandbox, and the phase directory; the `config.bbx` copy in the corpus is never the live config; `tmp/idea.log` and `tmp/intellij_traces.txt` contain a Windows user name and must never be committed |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Server-supplied `keys` in `bbj/openFormatterSettings` turned into a path, command or link | Tampering / Elevation | Handler takes `Object ignoredPayload` and opens a fixed configurable; a source guard asserts the handler body never references the parameter [cites `format-settings-notification.ts`: "A host must never turn the payload into a command argument, a path or a document location"] |
| Hand-edited `BbjSettings.xml` carrying null, blank, wrong-case or out-of-range values | Tampering | `FormatterInitOptions.normalize*` falls back to the default per key, as `normalizeTrigger` does; no free-text control exists, so the UI cannot produce them either (`-33007` cannot be triggered from IntelliJ) |
| Formatter output applied to the wrong file or an older version | Tampering | Server drops stale versions and non-BBj documents (code-verified rows); IntelliJ applies via the platform diff of one document |
| `config.bbx` rewritten by commit-time reformat (lsp4ij #1647) | Tampering | Server returns `[]` for `bbx-config` (code-verified); the evaluation corpus uses a copy |
| Settings values leaking into logs | Information disclosure | The server logs `formatter: '[omitted]'`; do not paste a trace with real paths into committed files without redaction |
| A trace or `idea.log` with a username committed | Information disclosure | Keep raw logs in the scratchpad or `tmp/` (untracked); commit only redacted excerpts |

## Project Constraints (from CLAUDE.md)

- Search and read with built-in tools first; the `Grep` tool is not registered in this environment (memory note), so scope shell `grep` to exact absolute paths, no recursive scans over `.env*`, `*.pem`, `*.key`, no relative paths or `cd ... && grep|find|cat|sed|head|tail`.
- All shell paths absolute; `cd` only before a build tool that needs its project directory (`cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew ...`).
- Stage by exact path only (`git add <path>`), never `git add -A`/`.`; `?? com/` is an unrelated untracked directory.
- Never edit `bbj-vscode/src/language/generated/`; this phase makes no grammar change and no `bbj-vscode` change at all (the contract tests only read TS files).
- IntelliJ plugin: build `bbj-vscode` first (`npm run build`) or `./gradlew build`/`buildPlugin` fails fast on a missing `bbj-vscode/out/language/main.cjs`.
- Every pull request runs lint, `typecheck:test`, `npm test` and a VSIX package; an IntelliJ-only change still has to leave those green.
- Standing project decisions that constrain this phase: no planning ids (plan numbers, D-xx, requirement ids) in source or test comments; build both distributables before the first hand check and again from the final tree; real `idea.log` evidence, never hand-derived sequences; whole-suite gate judged on `numFailedTests: 0`; commit trailers added through plain `git` (the GSD commit helper omits them).

## Sources

### Primary (HIGH confidence)
- `lsp4ij-0.21.0.jar` (Gradle cache path above): `javap -p -c` of `LSPFormattingFeature`, `AbstractLSPFormattingService`, `LSPFormattingSupport`, `LSPFormattingOnlyService`, `LSPFormattingAndRangeBothService`, `LSPIJUtils.applyEdits`, `ServerMessageHandler`, `ServerTrace`, `LanguageServerSettings$LanguageServerDefinitionSettings`; plugin.xml `formattingService` registrations (lines 430-432).
- IC 2024.2 `lib/*.jar`: `FormattingServiceUtil`, `FormattingService$Feature` (`AD_HOC_FORMATTING`, `FORMAT_FRAGMENTS`, `OPTIMIZE_IMPORTS`), `AsyncDocumentFormattingService`, `ShowSettingsUtil`, `JBIntSpinner`, `TitledSeparator`, `FormatOnSaveOptions(+Base)`; `plugins/performanceTesting/lib/performanceTesting.jar` command prefixes and `testscript.filename`.
- In-repo sources read this session: `BbjLanguageServerFactory.java`, `CompilerInitOptions.java`, `BbjSettings.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`, `BbjLanguageClient.java`, `plugin.xml`, `build.gradle.kts`, `Lsp4ijOverrideSiteSourceGuardTest.java`, `BbjLspFormattingSwitchTest.java`, `EffectiveInteropPortSourceGuardTest.java`, `ComposerRequestContractTest.java` (header), `bbj-format-settings.ts`, `bbj-ws-manager.ts`, `format-settings-notification.ts`, `bbj-format-service.ts` (regions), `bbj-formatting-handler.ts` (header), `package.json` lines 400-600, `extension.ts` lines 914-929, `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` (Settings reference table; matches the TS key list and enums).
- Probes run this session: `xvfb-run` + `RobotProbe`, `XmlSerializer.serialize(new BbjSettings.State())`, `./gradlew prepareSandbox --offline` and a two-class `./gradlew test --offline`, `gh api` for lsp4ij issues #381, #1404, #1647, #388, #424, #1323.
- Real logs: `/home/coder/repos/bbj-language-server/tmp/idea.log` and `tmp/intellij_traces.txt` (untracked, contain a Windows user name).

### Secondary (MEDIUM confidence)
- `/home/coder/.claude-shared/dot-claude/gsd-core/references/checkpoints.md` for the `checkpoint:decision` structure.
- `.planning/research/PITFALLS.md` Pitfalls 5, 14, 15, 16, 18 (marked there as MEDIUM and "not re-run on 0.21.0"; the bytecode findings above supersede the routing statements).

### Tertiary (LOW confidence)
- None used as a basis for a recommendation; unresolved items are in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies; every class and method used was confirmed by javap against the exact jars.
- Architecture: HIGH for LSP4IJ routing and the seam; MEDIUM for the supported-no-range behaviour (A7) and Actions on Save (A1).
- Pitfalls: MEDIUM-HIGH - CRLF mechanism and log-source split are evidenced; runtime outcomes await the evaluation.
- Driving options: MEDIUM - the display and Robot probes passed, the scripted driver and focus behaviour were not run.

**Research date:** 2026-10-04
**Valid until:** 2026-11-03 (30 days), or until LSP4IJ or the IntelliJ target changes
