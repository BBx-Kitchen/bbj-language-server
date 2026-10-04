# Phase 129: IntelliJ Verdict - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 17 new/modified code and test files (plus 4 non-code planning artefacts)
**Analogs found:** 17 / 17 code files (all analog paths verified git-tracked)

All paths below are under `/home/coder/repos/bbj-language-server/bbj-intellij/src/` unless stated. `main/` = `main/java/com/basis/bbj/intellij/`, `test/` = `test/java/com/basis/bbj/intellij/`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `main/lsp/FormatterInitOptions.java` (new, seam) | utility (plain Java) | transform | `main/lsp/CompilerInitOptions.java` | exact |
| `main/BbjSettings.java` (modify, State fields) | model/config | CRUD (persisted state) | same file, `State` class lines 24-38 | exact |
| `main/lsp/BbjLanguageServerFactory.java` (modify: interop key rename, `formatter` attach, switch constant(s)) | provider/config | request-response (initialize) | same file lines 57-79, 107-131 | exact |
| `main/lsp/BbjLanguageClient.java` (modify: `bbj/openFormatterSettings`, supported only) | controller (notification handler) | event-driven | `showDenumDiagnostics` in same file lines 173-190 | exact |
| `main/BbjSettingsComponent.java` (modify: Formatter section, supported only) | component | request-response (UI) | same file, "BBj Compiler" block + combo/checkbox | exact |
| `main/BbjSettingsConfigurable.java` (modify, supported only) | controller | CRUD | same file lines 44-180 | exact |
| `test/lsp/FormatterInitOptionsTest.java` (new) | test | transform | `test/lsp/CompilerInitOptionsTest.java` | exact |
| `test/lsp/FormatterInitOptionsContractTest.java` (new) | test (cross-language text contract) | file-I/O (reads TS/JSON as text) | `test/config/ConfigReloadNotificationContractTest.java` | role-match |
| `test/lsp/InteropInitOptionsContractTest.java` (new) | test (text contract) | file-I/O | `test/config/ConfigReloadNotificationContractTest.java` | role-match |
| `test/lsp/FormatterInitOptionsSourceGuardTest.java` (new, or extend `Lsp4ijOverrideSiteSourceGuardTest`) | test (source guard) | file-I/O | `test/lsp/CompilerOutputDirectorySourceGuardTest.java` | exact |
| `test/lsp/BbjSettingsFormatterSourceGuardTest.java` (new, supported only) | test (source guard) | file-I/O | `test/lsp/CompilerOutputDirectorySourceGuardTest.java` | exact |
| `test/lsp/BbjLanguageClientOpenFormatterSettingsTest.java` (new, supported only) | test | event-driven | `test/lsp/BbjLanguageClientDenumNotificationTest.java` | exact |
| `test/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` (modify per verdict) | test (source guard) | file-I/O | same file lines 125-144 | exact |
| `test/lsp/BbjLspFormattingSwitchTest.java` (modify/replace on supported) | test | request-response | same file | exact |
| `test/lsp/Lsp4ijCouplingCanaryTest.java` (extend only if `isExistingFormatterOverrideable` is added) | test | reflection | same file lines 84-111 (member loop line ~103) | exact |
| `.planning/todos/pending/2026-09-26-intellij-interop-initoptions-key-mismatch.md` | planning | move to `completed/` | existing `completed/` entries | n/a |
| `.planning/REQUIREMENTS.md` (IJF-04 to Out of Scope on "disabled") | planning | edit | n/a | n/a |

Non-code artefacts (no code analog, planner follows RESEARCH.md): `129-EVALUATION.md`, `129-WINDOWS-CHECKLIST.md`, `129-VERDICT.md`, `129-LSP4IJ-ISSUE-*.md` (style of lsp4ij #1672/#1673 drafts).

## Pattern Assignments

### `main/lsp/FormatterInitOptions.java` (utility, transform)

**Analog:** `main/lsp/CompilerInitOptions.java` (lines 1-123)

**Shape to copy:** `public final class`, private ctor, no `import com.intellij` (a guard test enforces this), wire-key constants, value constants, `normalizeX(String raw)` returning a default for null/blank/unknown, idempotent. Javadoc explains the flat `initializationOptions` channel.

**Constants + ctor** (lines 21-43):
```java
public final class CompilerInitOptions {
    public static final String COMPILER_TRIGGER_KEY = "compilerTrigger";
    public static final String TRIGGER_DEBOUNCED = "debounced";
    public static final String TRIGGER_ON_SAVE = "on-save";
    public static final String TRIGGER_OFF = "off";
    public static final List<String> TRIGGER_DISPLAY_NAMES = List.of("Debounced", "On save", "Off");
    private CompilerInitOptions() {
    }
```

**Normalizer (allow-list with default fallback)** (lines 79-88):
```java
public static String normalizeTrigger(String raw) {
    if (raw == null) {
        return TRIGGER_DEBOUNCED;
    }
    String trimmed = raw.trim();
    if (TRIGGER_DEBOUNCED.equals(trimmed) || TRIGGER_ON_SAVE.equals(trimmed) || TRIGGER_OFF.equals(trimmed)) {
        return trimmed;
    }
    return TRIGGER_DEBOUNCED;
}
```

**Adaptation for 15 keys:** one `FORMATTER_KEY = "formatter"` constant (the server reads `initializationOptions.formatter` as an object, `bbj-ws-manager.ts:141-146`); per-enum normalizers (`indentCharacter`, `ifClosingKeyword`, `ifKeywordCase`, `parameterLayout`, `operatorSpacing`, `eolCharacter`) in the `normalizeTrigger` style; `normalizeIndentWidth(int)` clamping to 0..16, default 2; a `toJson(Values)` using Gson `JsonObject.addProperty` with typed values (Integer -> number, Boolean -> boolean). Gson is allowed by the no-`com.intellij` guard. Defaults, order, enum values and bounds: see RESEARCH.md "Seam skeleton" table (verified against `bbj-vscode/src/language/bbj-format-settings.ts` lines 30-68 and `bbj-vscode/package.json` lines 410-578). A `Values` value class with `equals` lets `isModified` add one comparison (RESEARCH "Supported-path UI"). Send exactly the 15 canonical keys; never the deprecated `splitSingleLineIF` alias.

---

### `main/BbjSettings.java` (model, persisted state)

**Analog:** same file, `State` (lines 24-38)

**Pattern:** flat public fields with in-line default and trailing comment listing the options. XmlSerializer writes `<option name=... value=.../>` and omits defaults.
```java
public String compilerOutputDirectory = "";  // Default: empty (no output directory configured; #571)
public String compilerTrigger = "debounced";  // Default: debounced. Options: debounced, on-save, off
```
Add 15 flat `formatter*` fields (e.g. `public int formatterIndentWidth = 2;`, `public String formatterIndentCharacter = "SPACE";`, `public boolean formatterKeywordsToUppercase = false;`). Keep the prefix `formatter` plus the exact key spelling so a hand-seeded `BbjSettings.xml` is predictable. On "disabled" these fields are reverted with the seam.

---

### `main/lsp/BbjLanguageServerFactory.java` (provider, initialize request-response)

**Analog:** itself.

**Interop key rename (folded todo), lines 64-67** (only IntelliJ writes the wrong spelling; server reads `interopHost`/`interopPort`):
```java
options.addProperty("javaInteropHost",
    state.javaInteropHost != null && !state.javaInteropHost.isEmpty()
        ? state.javaInteropHost : "localhost");
options.addProperty("javaInteropPort", BbjSettings.getInstance().getEffectiveJavaInteropPort());
```
Change only the two string literals to `"interopHost"` and `"interopPort"`. Keep `getEffectiveJavaInteropPort()` exactly once and never read `state.javaInteropPort` here (`EffectiveInteropPortSourceGuardTest`).

**Attach `formatter` (copy compiler-key attach style), lines 70-78:**
```java
options.addProperty(CompilerInitOptions.COMPILER_TRIGGER_KEY,
    CompilerInitOptions.normalizeTrigger(state.compilerTrigger));
params.setInitializationOptions(options);
```
Add `options.add(FormatterInitOptions.FORMATTER_KEY, FormatterInitOptions.toJson(...));` between the compiler keys and `params.setInitializationOptions(options);` (source guard pins attach-before-handover, exactly once).

**Switch, lines 27-36 and 107-131:**
```java
private static final boolean LSP_FORMATTING_ENABLED = false;
...
.setFormattingFeature(new LSPFormattingFeature() {
    @Override
    public boolean isRangeFormattingSupported(@NotNull PsiFile file) {
        return LSP_FORMATTING_ENABLED && super.isRangeFormattingSupported(file);
    }
    // isEnabled / isSupported / isFormattingSupported identical shape
```
Per verdict: "supported" flips the constant to `true`; "supported-no-range" adds `private static final boolean LSP_RANGE_FORMATTING_ENABLED = false;` and changes only the range override to `return LSP_FORMATTING_ENABLED && LSP_RANGE_FORMATTING_ENABLED && super.isRangeFormattingSupported(file);`; "disabled" keeps `false` and only rewrites the javadoc to point at the evaluation record (no planning ids in comments; refer to the record by description or path of the doc, per the register-check rule).

---

### `main/lsp/BbjLanguageClient.java` (notification handler, event-driven; supported only)

**Analog:** `showDenumDiagnostics` (lines 173-190), the payload-ignoring shape.
```java
@JsonNotification("bbj/showDenumDiagnostics")
public void showDenumDiagnostics(Object ignoredPayload) {
    Project project = getProject();
    if (project.isDisposed()) {
        return;
    }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) {
            return;
        }
        ToolWindow toolWindow = ensureLogConsole(project);
        ...
    });
}
```
New handler: `@JsonNotification("bbj/openFormatterSettings") public void openFormatterSettings(Object ignoredPayload)`, same disposed-guard + `invokeLater` skeleton, body `ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class)` (optionally the `Consumer` overload to focus the Formatter section). Never read the parameter (`keys` must not become a path/command/link). Name constant owned by `bbj-vscode/src/language/format-settings-notification.ts` (`OPEN_FORMATTER_SETTINGS_METHOD`). Any `BbjLanguageClient` notification change requires the whole `bbj-intellij ./gradlew test` (standing rule).

---

### `main/BbjSettingsComponent.java` (component, UI; supported only)

**Analog:** same file.

**Section placement, lines 304-307 (insert the Formatter block right after, before "Node.js Runtime" at 309):**
```java
.addComponent(new TitledSeparator("BBj Compiler"))
.addLabeledComponent(new JBLabel("Compile output directory:"), compilerOutputDirectoryField, 1, false)
.addLabeledComponent(new JBLabel("Compiler check:"), compilerTriggerCombo, 1, false)
.addComponent(compilerTriggerHintLabel)
```

**Combo (lines 116-119):**
```java
compilerTriggerCombo = new ComboBox<>(
        new CollectionComboBoxModel<>(CompilerInitOptions.TRIGGER_DISPLAY_NAMES));
compilerTriggerCombo.setSelectedItem("Debounced");
compilerTriggerHintLabel = new JBLabel("On save is recommended for large workspaces.");
```
Formatter combos show wire values directly (D-10), with package.json text as `setToolTipText`. Hint label pattern reused for the "applies after the language server restarts" note.

**Checkbox (lines 231-232, getters 557-563):**
```java
autoSaveCheckbox = new JCheckBox("Auto-save before run");
autoSaveCheckbox.setSelected(true);
...
public boolean isAutoSaveBeforeRun() { return autoSaveCheckbox.isSelected(); }
public void setAutoSaveBeforeRun(boolean autoSave) { autoSaveCheckbox.setSelected(autoSave); }
```

**Getter/setter convention (lines 540-547):** `getCompilerTrigger()` / `setCompilerTrigger(String wireValue)` wrapping a `CompilerInitOptions` mapping. Offer `getFormatterValues()` / `setFormatterValues(Values)` instead of 30 accessors.

**No analog for the spinner:** no `JSpinner`/`JBIntSpinner` exists in the plugin. Use `new JBIntSpinner(2, 0, 16)` with `getNumber()`/`setNumber(int)` (RESEARCH, verified by javap). The component must do no filesystem/subprocess work (`BbjSettingsComponentSourceGuardTest`).

---

### `main/BbjSettingsConfigurable.java` (controller, CRUD; supported only)

**Analog:** same file.

**isModified (lines 59-61):** `|| !Objects.equals(myComponent.getCompilerTrigger(), CompilerInitOptions.normalizeTrigger(state.compilerTrigger))` -- compare against the normalized value so hand-edited XML does not look modified forever.

**apply (lines 89-101):** assign fields first, then editor notifications, then restart:
```java
state.compilerTrigger = myComponent.getCompilerTrigger();
...
for (var project : ProjectManager.getInstance().getOpenProjects()) {
    BbjServerService.getInstance(project).scheduleRestart();
}
```
Formatter values must be stored before `scheduleRestart()` (guard-tested).

**reset (line 175):** `myComponent.setCompilerTrigger(CompilerInitOptions.normalizeTrigger(state.compilerTrigger));` -- push normalized formatter values the same way.

---

### `test/lsp/FormatterInitOptionsTest.java` (test, transform)

**Analog:** `test/lsp/CompilerInitOptionsTest.java`

**Style:** package-private class, `org.junit.jupiter.api.Test`, static `assertEquals`, one behaviour per method with descriptive camel-case names.
```java
@Test
void theTriggerKeyIsTheFlatNameTheServerReads() {
    assertEquals("compilerTrigger", CompilerInitOptions.COMPILER_TRIGGER_KEY);
}

@Test
void normalizingTwiceGivesTheSameResult() {
    String[] inputs = {"/tmp/out", null, "", "   ", "\t", ...};
    for (String input : inputs) {
        String once = CompilerInitOptions.normalizeOutputDirectory(input);
        String twice = CompilerInitOptions.normalizeOutputDirectory(once);
        assertEquals(once, twice, "normalizing \"" + input + "\" twice must be stable");
    }
}
```
Cover: all 15 keys always present with explicit values; null/blank/unknown/out-of-range fall back to defaults; idempotence; numbers serialize as JSON numbers and booleans as JSON booleans.

---

### `test/lsp/FormatterInitOptionsContractTest.java` and `test/lsp/InteropInitOptionsContractTest.java` (text contract)

**Analog:** `test/config/ConfigReloadNotificationContractTest.java` (lines 25-93)

**Path + helper pattern (copy verbatim, adapt files):**
```java
private static final Path CONFIG_RELOAD_NOTIFICATION_TS = Paths.get(
    "..", "bbj-vscode", "src", "language", "config-reload-notification.ts")
    .toAbsolutePath().normalize();

private static boolean containsQuoted(String text, String literal) {
    return text.contains("'" + literal + "'") || text.contains("\"" + literal + "\"");
}

@Test
void theNotificationNameAppearsOnBothSides() {
    String ts = readSource(CONFIG_RELOAD_NOTIFICATION_TS);
    String java = readSource(BBJ_LANGUAGE_CLIENT_JAVA);
    assertTrue(containsQuoted(ts, NOTIFICATION_NAME), "...");
    assertTrue(containsQuoted(java, NOTIFICATION_NAME), "...");
}
```
Reads only as plain text (`Files.readString`), never parsed. `FormatterInitOptionsContractTest`: assert each of the 15 keys, defaults, enum values appear in `../bbj-vscode/src/language/bbj-format-settings.ts` and `../bbj-vscode/package.json`. `InteropInitOptionsContractTest`: factory contains quoted `interopHost`/`interopPort` and no quoted `javaInteropHost`/`javaInteropPort`; `bbj-ws-manager.ts` contains `initializationOptions.interopHost` and `initializationOptions.interopPort`. Also pattern for a notification-name check against `format-settings-notification.ts` (`bbj/openFormatterSettings`).

---

### `test/lsp/FormatterInitOptionsSourceGuardTest.java`, `test/lsp/BbjSettingsFormatterSourceGuardTest.java` (source guards)

**Analog:** `test/lsp/CompilerOutputDirectorySourceGuardTest.java` (lines 26-159)

**Helpers (copy):** `Paths.get("src","main","java",...).toAbsolutePath()` constants, `readSource`, `countOccurrences` (lines 28-79).

**Order guard (lines 107-119) for "stored before restart":**
```java
int assignIndex = text.indexOf("state.compilerOutputDirectory = myComponent.getCompilerOutputDirectory()");
int restartIndex = text.indexOf("scheduleRestart()");
assertTrue(assignIndex >= 0, "...");
assertTrue(assignIndex < restartIndex, "the value must be stored before the restart ...");
```

**Factory attach guard (lines 121-136):**
```java
assertEquals(1, countOccurrences(text, "params.setInitializationOptions(options)"), "...");
int addPropertyIndex = text.indexOf("CompilerInitOptions.COMPILER_OUTPUT_DIRECTORY_KEY");
int handOverIndex = text.indexOf("params.setInitializationOptions(options)");
assertTrue(addPropertyIndex < handOverIndex, "...");
```

**Seam has no platform import (lines 153-158):**
```java
assertEquals(0, countOccurrences(text, "import com.intellij"),
        "CompilerInitOptions must have no IntelliJ platform import");
```
Also guard: `BbjLanguageClient` must not carry formatter settings in `createSettings()` (lines 138-151 style); the `openFormatterSettings` handler body never references its parameter.

---

### `test/lsp/BbjLanguageClientOpenFormatterSettingsTest.java` (test, event-driven; supported only)

**Analog:** `test/lsp/BbjLanguageClientDenumNotificationTest.java` (lines 31-107)

**Pattern (lines 36-42, 84-97, 99-107):**
```java
private static Map<String, JsonRpcMethod> supported() {
    return ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class);
}
private static Message parse(String json) {
    return new MessageJsonHandler(supported()).parseMessage(json);
}

@Test
void theRevealNotificationIsRegisteredWithOneObjectParameterAndCarriesItsName() throws Exception {
    JsonRpcMethod registered = supported().get(SHOW);
    assertNotNull(registered, SHOW + " must be a supported method of the client");
    assertTrue(registered.isNotification(), ...);
    assertArrayEquals(new Type[] {Object.class}, registered.getParameterTypes(), "...");
    Method handler = BbjLanguageClient.class.getMethod("showDenumDiagnostics", Object.class);
    JsonNotification annotation = handler.getAnnotation(JsonNotification.class);
    assertEquals(SHOW, annotation.value());
}

@Test
void aRevealWithoutAParamsMemberParsesWithNullParams() {
    String json = "{\"jsonrpc\":\"2.0\",\"method\":\"bbj/showDenumDiagnostics\"}";
    NotificationMessage notification = assertInstanceOf(NotificationMessage.class, parse(json));
    assertNull(notification.getParams());
}
```
Adapt with method `openFormatterSettings`, and add a parse of `{"keys":["indentWidth"]}` params.

---

### `test/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` and `BbjLspFormattingSwitchTest.java` (fence tests, per verdict)

**Analog:** same files.

**Switch guard (Lsp4ijOverrideSiteSourceGuardTest lines 125-144):**
```java
assertEquals(1, countOccurrences(text,
        "private static final boolean LSP_FORMATTING_ENABLED = false;"), "...");
String body = bodyOf(text, "new LSPFormattingFeature()");
assertEquals(4, countOccurrences(body, "LSP_FORMATTING_ENABLED && super."), "...");
```
Edits: disabled = none (tests unchanged, javadoc only). Supported = literal becomes `= true;`. Supported-no-range = the `LSP_FORMATTING_ENABLED && super.` count becomes 3, add `assertEquals(1, countOccurrences(text, "private static final boolean LSP_RANGE_FORMATTING_ENABLED = "))` and an assertion that the range method body holds `LSP_FORMATTING_ENABLED && LSP_RANGE_FORMATTING_ENABLED && super.isRangeFormattingSupported`. The `createClientFeaturesBuilds...` test (lines 106-123) stays unchanged (one `initializeParams` override, one `setFormattingFeature(`).

**BbjLspFormattingSwitchTest:** `theInstalledFormattingFeatureIsOurSubclassAndIsStable` (lines 32-45) is kept. `everyFormattingCheckAnswersFalseWithoutTouchingTheFile` (lines 47-59, proxy `PsiFile` whose every method throws, `throwingFile()` lines 22-30) is valid only while the switch short-circuits `super`; on "supported" it must be replaced with a text guard that all four checks still short-circuit on the constant (do not write an inverse "throws" test; `LanguageFormatting.INSTANCE` needs the platform Application).

**Lsp4ijCouplingCanaryTest:** member loop `"isEnabled", "isSupported", "isFormattingSupported", "isRangeFormattingSupported"` (~line 103); add `"isExistingFormatterOverrideable"` only if that override becomes necessary. `Lsp4ijImportAllowlistTest` needs an edit only if a new `com.redhat.devtools.lsp4ij.*` import is added.

## Shared Patterns

### Plain-Java seam with no platform import
**Source:** `main/lsp/CompilerInitOptions.java` + `theSeamHasNoIntellijImport` in `test/lsp/CompilerOutputDirectorySourceGuardTest.java` (lines 153-158)
**Apply to:** `FormatterInitOptions`

### Flat `initializationOptions` channel (never `createSettings()`)
**Source:** `main/lsp/BbjLanguageServerFactory.java` lines 70-78; rationale in `CompilerInitOptions` javadoc lines 5-18
**Apply to:** `formatter` object and interop keys. A settings-apply restart re-sends fresh options.

### Source-guard test helpers
**Source:** `test/lsp/CompilerOutputDirectorySourceGuardTest.java` lines 28-79 (`Paths.get("src","main","java",...).toAbsolutePath()`, `readSource`, `countOccurrences`); `Lsp4ijOverrideSiteSourceGuardTest` adds `bodyOf(text, signature)`.
**Apply to:** all new guard tests. Tests run with cwd = `bbj-intellij`; cross-module reads use `Paths.get("..","bbj-vscode",...)` (`ConfigReloadNotificationContractTest`).

### Payload-ignoring `@JsonNotification` with disposed-guard + `invokeLater`
**Source:** `main/lsp/BbjLanguageClient.java` lines 173-190
**Apply to:** `bbj/openFormatterSettings`.

### Settings triple (isModified / apply / reset) with normalization and store-before-restart
**Source:** `main/BbjSettingsConfigurable.java` lines 44-102, 175
**Apply to:** the 15 formatter values.

### Project conventions
No planning ids (plan numbers, `D-xx`, requirement ids) in source or test comments (register-check at phase close; issue numbers like `#571` are fine). Stage by exact path only (`?? com/` at repo root is unrelated). Build `bbj-vscode` first (`npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`) before any `bbj-intellij` Gradle packaging. Quick test run: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --console=plain --tests '*FormatterInitOptions*' --tests '*InteropInitOptions*' --tests '*Lsp4ijOverrideSiteSourceGuardTest' --tests '*BbjLspFormattingSwitchTest'`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Spinner control for `indentWidth` in `BbjSettingsComponent` | component | UI | No `JSpinner`/`JBIntSpinner` exists in the plugin; use `JBIntSpinner(2, 0, 16)` per RESEARCH (platform API verified by javap) |
| `129-EVALUATION.md`, `129-WINDOWS-CHECKLIST.md`, `129-VERDICT.md` | document | n/a | No prior evaluation-record format; layout is Claude's discretion (one row per case: steps, expected, observed, `idea.log` + trace excerpt, pass/known issue/blocker, driven-by column) |
| `129-LSP4IJ-ISSUE-*.md` | document | n/a | Style reference is the lsp4ij #1672/#1673 drafts (minimal repro, LSP4IJ version, log excerpt); see memory note "LSP4IJ upstream issues #1672/#1673" |
| Evaluation driver (`runIde` under Xvfb, `performanceTesting` script, Robot) | tooling | n/a | No existing harness; follow RESEARCH.md "Driving the evaluation" |

## Metadata

**Analog search scope:** `/home/coder/repos/bbj-language-server/bbj-intellij/src/main` and `/src/test` (lsp/, config/, denum/, settings classes)
**Files scanned:** about 20 read or listed; analog paths checked with `git ls-files` (all tracked)
**Pattern extraction date:** 2026-10-04
