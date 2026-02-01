# Integration Check Report

**Project:** BBj IntelliJ Plugin (bbj-intellij)
**Milestone:** v1.0 (Phases 1-6)
**Date:** 2026-02-01
**Checker:** Claude Opus 4.5 (integration-checker role)

---

## Wiring Summary

| Metric | Count | Status |
|--------|-------|--------|
| **Connected exports** | 22 | All key classes cross-referenced |
| **Orphaned exports** | 1 | BbjCompletionFeature (utility not wired) |
| **Missing connections** | 0 | -- |
| **plugin.xml registrations** | 24 | All matched to implementation classes |

## API Coverage (LSP4IJ Extension Points)

| Metric | Count | Status |
|--------|-------|--------|
| **Consumed** | 3 | server, languageMapping, factory methods |
| **Orphaned** | 0 | -- |

## Auth Protection (N/A — desktop plugin)

Not applicable. This is an IntelliJ plugin, not a web application. There are no API routes or auth flows.

## E2E Flows

| Flow | Status | Notes |
|------|--------|-------|
| Fresh install | COMPLETE | All steps connected |
| Settings change | COMPLETE | Settings -> restart -> re-init |
| Java interop | COMPLETE | Settings -> initOptions -> TCP health check -> UI |
| Error recovery (Node.js missing) | COMPLETE | Banner -> download -> restart |
| Error recovery (server crash) | COMPLETE | Detect -> auto-restart -> banner |
| Distribution | COMPLETE | ZIP includes all artifacts |

---

## Step 1: Export/Import Map

### Phase 1 — Plugin Scaffolding

| Export | Consumers | Status |
|--------|-----------|--------|
| `BbjLanguage.INSTANCE` | BbjFileType, BbjTokenTypes (x2), BbjFile, BbjParserDefinition | CONNECTED (5 uses) |
| `BbjFileType.INSTANCE` | BbjMissingHomeNotificationProvider, BbjMissingNodeNotificationProvider, BbjJavaInteropNotificationProvider, BbjFile, plugin.xml (fieldName) | CONNECTED (4 Java uses + XML) |
| `BbjIcons.FILE` | BbjFileType.getIcon(), BbjRestartServerAction, BbjColorSettingsPage | CONNECTED (3 uses) |
| `BbjIcons.FUNCTION/VARIABLE/KEYWORD` | BbjCompletionFeature | CONNECTED (but see orphaned note below) |
| `BbjIcons.STATUS_READY/STARTING/ERROR` | BbjStatusBarWidget | CONNECTED (3 uses) |
| `BbjIcons.TOOL_WINDOW` | plugin.xml toolWindow icon attribute | CONNECTED |
| `BbjIcons.INTEROP_CONNECTED/DISCONNECTED` | BbjJavaInteropStatusBarWidget | CONNECTED (2 uses) |

### Phase 2 — Syntax Highlighting

| Export | Consumers | Status |
|--------|-----------|--------|
| `BbjTextMateBundleProvider` | plugin.xml `textmate.bundleProvider` | CONNECTED |
| `TextMateEditorHighlighterProvider` (platform) | plugin.xml `editorHighlighterProvider` filetype="BBj" | CONNECTED |
| `TextMateSyntaxHighlighterFactory` (platform) | plugin.xml `lang.syntaxHighlighterFactory` language="BBj" | CONNECTED |
| `BbjCommenter` | plugin.xml `lang.commenter` language="BBj" | CONNECTED |
| `BbjColorSettingsPage` | plugin.xml `colorSettingsPage` | CONNECTED |
| `BbjParserDefinition` | plugin.xml `lang.parserDefinition` language="BBj" | CONNECTED |
| `BbjWordLexer` | BbjParserDefinition.createLexer() | CONNECTED |
| `BbjTokenTypes.WORD/SYMBOL` | BbjWordLexer | CONNECTED |
| `BbjPsiElement` | BbjParserDefinition.createElement() | CONNECTED |
| `BbjFile` | BbjParserDefinition.createFile() | CONNECTED |
| `BbjSpellcheckingStrategy` | plugin.xml `spellchecker.bundledDictionaryProvider` | CONNECTED |

### Phase 3 — Settings & Runtime

| Export | Consumers | Status |
|--------|-----------|--------|
| `BbjSettings.getInstance()` | BbjSettingsConfigurable (x3), BbjLanguageServerFactory, BbjLanguageClient, BbjLanguageServer, BbjMissingHomeNotificationProvider, BbjMissingNodeNotificationProvider, BbjJavaInteropService | CONNECTED (9 consumers) |
| `BbjSettings.State.bbjHomePath` | BbjLanguageServerFactory (initOptions), BbjLanguageClient (settings), BbjMissingHomeNotificationProvider | CONNECTED |
| `BbjSettings.State.nodeJsPath` | BbjLanguageServer (resolveNodePath), BbjMissingNodeNotificationProvider | CONNECTED |
| `BbjSettings.State.classpathEntry` | BbjLanguageServerFactory (initOptions), BbjLanguageClient (settings) | CONNECTED |
| `BbjSettings.State.logLevel` | BbjLanguageClient (settings) | CONNECTED |
| `BbjSettings.State.javaInteropPort` | BbjLanguageServerFactory (initOptions), BbjJavaInteropService (TCP check) | CONNECTED |
| `BbjSettings.getBBjClasspathEntries()` | BbjSettingsComponent.updateClasspathDropdown() | CONNECTED |
| `BbjSettings.detectJavaInteropPort()` | BbjSettingsConfigurable.reset() | CONNECTED |
| `BbjSettingsConfigurable` | plugin.xml `applicationConfigurable`, BbjMissingHomeNotificationProvider, BbjMissingNodeNotificationProvider, BbjJavaInteropNotificationProvider, BbjJavaInteropStatusBarWidget, BbjWelcomeNotification | CONNECTED (6 consumers) |
| `BbjNodeDetector.detectNodePath()` | BbjLanguageServer, BbjSettingsConfigurable, BbjSettingsComponent, BbjMissingNodeNotificationProvider | CONNECTED (4 consumers) |
| `BbjNodeDetector.getNodeVersion()` | BbjSettingsComponent (x2), BbjMissingNodeNotificationProvider | CONNECTED |
| `BbjNodeDetector.meetsMinimumVersion()` | BbjSettingsComponent, BbjMissingNodeNotificationProvider | CONNECTED |
| `BbjHomeDetector.detectBbjHome()` | BbjSettingsConfigurable, BbjMissingHomeNotificationProvider | CONNECTED |
| `BbjHomeDetector.isValidBbjHome()` | BbjSettingsComponent (x2), BbjMissingHomeNotificationProvider | CONNECTED |

### Phase 4 — Language Server Integration

| Export | Consumers | Status |
|--------|-----------|--------|
| `BbjLanguageServerFactory` | plugin.xml `com.redhat.devtools.lsp4ij.server` factoryClass | CONNECTED |
| `BbjLanguageServer` | BbjLanguageServerFactory.createConnectionProvider() | CONNECTED |
| `BbjLanguageClient` | BbjLanguageServerFactory.createLanguageClient() | CONNECTED |
| `BbjServerService.getInstance()` | BbjSettingsConfigurable, BbjNodeDownloader, BbjStatusBarWidget (x2), BbjServerCrashNotificationProvider, BbjJavaInteropService, BbjJavaInteropStatusBarWidget, BbjRestartServerAction, BbjServerLogToolWindowFactory, BbjLanguageClient | CONNECTED (10 consumers) |
| `BbjServerService.BbjServerStatusListener.TOPIC` | BbjStatusBarWidget (subscribe), BbjJavaInteropService (subscribe), BbjServerService (publish) | CONNECTED (1 publisher, 2 subscribers) |
| `BbjStatusBarWidgetFactory` | plugin.xml `statusBarWidgetFactory` id="BbjLanguageServerStatus" | CONNECTED |
| `BbjStatusBarWidget` | BbjStatusBarWidgetFactory.createWidget() | CONNECTED |
| `BbjRestartServerAction` | plugin.xml `action` id="bbj.restartLanguageServer" | CONNECTED |
| `BbjServerCrashNotificationProvider` | plugin.xml `editorNotificationProvider` | CONNECTED |
| `BbjServerLogToolWindowFactory` | plugin.xml `toolWindow` id="BBj Language Server" | CONNECTED |

### Phase 5 — Java Interop

| Export | Consumers | Status |
|--------|-----------|--------|
| `BbjJavaInteropService.getInstance()` | BbjJavaInteropNotificationProvider, BbjJavaInteropStatusBarWidget | CONNECTED |
| `BbjJavaInteropService.BbjJavaInteropStatusListener.TOPIC` | BbjJavaInteropStatusBarWidget (subscribe), BbjJavaInteropService (publish) | CONNECTED (1 publisher, 1 subscriber) |
| `BbjJavaInteropStatusBarWidgetFactory` | plugin.xml `statusBarWidgetFactory` id="BbjJavaInteropStatus" | CONNECTED |
| `BbjJavaInteropStatusBarWidget` | BbjJavaInteropStatusBarWidgetFactory.createWidget() | CONNECTED |
| `BbjJavaInteropNotificationProvider` | plugin.xml `editorNotificationProvider` | CONNECTED |

### Phase 6 — Distribution

| Export | Consumers | Status |
|--------|-----------|--------|
| `BbjNodeDownloader.getCachedNodePath()` | BbjLanguageServer.resolveNodePath(), BbjMissingNodeNotificationProvider | CONNECTED |
| `BbjNodeDownloader.downloadNodeAsync()` | BbjMissingNodeNotificationProvider | CONNECTED |
| `BbjWelcomeNotification` | plugin.xml `postStartupActivity` | CONNECTED |

---

## Step 2: Orphaned Exports

### 1. `BbjCompletionFeature` — ORPHANED (low severity)

- **File:** `/Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java`
- **What it does:** Static utility class mapping LSP CompletionItemKind to BBj-specific icons (FUNCTION, VARIABLE, KEYWORD)
- **Problem:** `BbjCompletionFeature.getIcon()` is never called. It is not registered in plugin.xml and not invoked by `BbjLanguageServerFactory.createClientFeatures()`.
- **Impact:** LOW. BBj-specific icons for completion items (function, variable, keyword) will not appear in code completion popups. LSP4IJ will use its default icons instead. The feature exists but is not wired into the LSP client features chain.
- **Root cause:** The `createClientFeatures()` method in BbjLanguageServerFactory returns an anonymous `LSPClientFeatures` subclass that only overrides `initializeParams()` and disables `documentLinkFeature`. It does not override the completion feature to call `BbjCompletionFeature.getIcon()`.
- **Fix needed:** Wire `BbjCompletionFeature.getIcon()` into an LSPCompletionFeature subclass and register it via `.setCompletionFeature()` in `createClientFeatures()`.

### 2. Stale `META-INF/plugin.xml` at project root — NOT A BUG but worth noting

- **File:** `/Users/beff/_workspace/bbj-language-server/bbj-intellij/META-INF/plugin.xml`
- **What it is:** An older version of plugin.xml from early phases, missing LSP4IJ dependency, settings, and all Phase 3-6 extensions. Contains `until-build="243.*"` (the bug fixed in Phase 6 Plan 03).
- **Impact:** NONE at runtime. Gradle uses `src/main/resources/META-INF/plugin.xml`. This is build output or leftover. However, it could cause confusion for developers.
- **Recommendation:** Delete `/Users/beff/_workspace/bbj-language-server/bbj-intellij/META-INF/plugin.xml` to avoid confusion.

---

## Step 3: plugin.xml Registration Completeness

Every Java class in the project is either:
1. Registered in `plugin.xml` as an extension, or
2. Used as an internal dependency by a registered class

**Registration audit (all 24 extensions verified):**

| plugin.xml Extension | Implementation Class | Exists? |
|---------------------|---------------------|---------|
| `fileType` name="BBj" | BbjFileType | YES |
| `lang.parserDefinition` language="BBj" | BbjParserDefinition | YES |
| `editorHighlighterProvider` filetype="BBj" | TextMateEditorHighlighterProvider (platform) | YES |
| `lang.syntaxHighlighterFactory` language="BBj" | TextMateSyntaxHighlighterFactory (platform) | YES |
| `textmate.bundleProvider` | BbjTextMateBundleProvider | YES |
| `lang.commenter` language="BBj" | BbjCommenter | YES |
| `colorSettingsPage` | BbjColorSettingsPage | YES |
| `applicationService` | BbjSettings | YES |
| `applicationConfigurable` | BbjSettingsConfigurable | YES |
| `editorNotificationProvider` (home) | BbjMissingHomeNotificationProvider | YES |
| `editorNotificationProvider` (node) | BbjMissingNodeNotificationProvider | YES |
| `editorNotificationProvider` (crash) | BbjServerCrashNotificationProvider | YES |
| `editorNotificationProvider` (interop) | BbjJavaInteropNotificationProvider | YES |
| `projectService` (server) | BbjServerService | YES |
| `projectService` (interop) | BbjJavaInteropService | YES |
| `statusBarWidgetFactory` (server) | BbjStatusBarWidgetFactory | YES |
| `statusBarWidgetFactory` (interop) | BbjJavaInteropStatusBarWidgetFactory | YES |
| `toolWindow` "BBj Language Server" | BbjServerLogToolWindowFactory | YES |
| `notificationGroup` "BBj Language Server" | (used by BbjServerService.notifyCrash()) | YES |
| `spellchecker.bundledDictionaryProvider` | BbjSpellcheckingStrategy | YES |
| `postStartupActivity` | BbjWelcomeNotification | YES |
| `action` bbj.restartLanguageServer | BbjRestartServerAction | YES |
| `lsp4ij:server` bbjLanguageServer | BbjLanguageServerFactory | YES |
| `lsp4ij:languageMapping` BBj | serverId="bbjLanguageServer" | YES |

---

## Step 4: Cross-Phase Connection Verification

### Connection 1: Phase 1 (FileType) -> Phase 2 (TextMate binds to BBj language)

**Status: CONNECTED**

- `BbjLanguage` defines language ID "BBj" (line 9 of BbjLanguage.java)
- `BbjFileType` binds to `BbjLanguage.INSTANCE` (line 11 of BbjFileType.java)
- plugin.xml registers `editorHighlighterProvider filetype="BBj"` pointing to `TextMateEditorHighlighterProvider`
- plugin.xml registers `lang.syntaxHighlighterFactory language="BBj"` pointing to `TextMateSyntaxHighlighterFactory`
- `BbjTextMateBundleProvider` loads grammars from `textmate/bbj-bundle/` resource path
- TextMate `package.json` declares language ID "BBj" with extensions `.bbj`, `.bbl`, `.bbjt`, `.src` -- **matches** plugin.xml fileType extensions exactly

**Verified chain:** `.bbj` file opened -> BbjFileType recognized -> TextMate grammar applied -> syntax highlighting rendered

### Connection 2: Phase 2 (TextMate) -> Phase 4 (LSP4IJ binds to BBj language)

**Status: CONNECTED**

- plugin.xml `languageMapping` binds `language="BBj"` to `serverId="bbjLanguageServer"`
- The `languageId="bbj"` (lowercase) in the mapping is what gets sent to the language server in TextDocumentIdentifier -- this matches the Langium BBj language server's expected language ID
- `BbjLanguageServerFactory` is registered as the factory for server ID "bbjLanguageServer"

**Verified chain:** BBj file type -> LSP4IJ language mapping -> BBj language server activated

### Connection 3: Phase 3 (Settings) -> Phase 4 (Server reads settings)

**Status: CONNECTED**

Two paths for settings delivery to the language server:

**Path A — initializationOptions (on server start):**
- `BbjLanguageServerFactory.createClientFeatures()` overrides `initializeParams()`
- Reads `BbjSettings.getInstance().getState()` for: `home`, `classpath`, `javaInteropHost`, `javaInteropPort`
- Sets these as `params.setInitializationOptions(options)`
- Language server receives these in its `initialize` handler

**Path B — didChangeConfiguration (on settings change):**
- `BbjLanguageClient.createSettings()` returns JSON with: `home`, `classpath`, `logLevel`
- LSP4IJ calls this when `workspace/didChangeConfiguration` is sent

**Path C — Server restart (on settings apply):**
- `BbjSettingsConfigurable.apply()` calls `BbjServerService.getInstance(project).scheduleRestart()` for every open project
- This stops and restarts the server, which re-triggers `initializeParams()` with fresh settings

**Verified chain:** Settings UI -> apply() -> BbjSettings state updated -> server restart scheduled -> new server reads fresh initializationOptions

### Connection 4: Phase 3 (Settings) -> Phase 5 (Java-interop config)

**Status: CONNECTED**

- `BbjSettings.State.javaInteropPort` (default 5008) is set via `BbjSettingsComponent.javaInteropPortField`
- `BbjLanguageServerFactory.createClientFeatures().initializeParams()` reads `state.javaInteropPort` and sends it as `javaInteropPort` in initializationOptions
- `BbjJavaInteropService.checkConnection()` reads `BbjSettings.getInstance().getState().javaInteropPort` at check time (not cached) for TCP health checks

**Verified chain:** Settings UI port field -> BbjSettings.State -> initializationOptions to LS + TCP health check target

### Connection 5: Phase 4 (Server process) -> Phase 5 (initializationOptions include java-interop config)

**Status: CONNECTED**

- `BbjLanguageServerFactory.createClientFeatures()` sends:
  - `javaInteropHost: "127.0.0.1"` (hardcoded, correct for localhost)
  - `javaInteropPort: state.javaInteropPort` (from settings, default 5008)
- The language server uses these to connect to the java-interop TCP service internally

**Verified chain:** Server init -> initializationOptions with java-interop config -> LS connects to BBjServices

### Connection 6: Phase 6 (Distribution) -> All phases (ZIP includes all artifacts)

**Status: CONNECTED**

Build pipeline:
1. `copyTextMateBundle` task copies from `bbj-vscode/` to `build/resources/main/textmate/bbj-bundle/`:
   - `syntaxes/bbj.tmLanguage.json` -- **exists at source** (`/Users/beff/_workspace/bbj-language-server/bbj-vscode/syntaxes/bbj.tmLanguage.json`)
   - `syntaxes/bbx.tmLanguage.json` -- **exists at source**
   - `bbj-language-configuration.json` -- **exists at source**
   - `bbx-language-configuration.json` -- **exists at source**
2. `copyLanguageServer` task copies `bbj-vscode/out/language/main.cjs` -- **exists at source** (1.8 MB)
3. `prepareSandbox` task copies to `lib/` directory structure for installed plugin
4. `processResources` depends on both copy tasks (line 71-74 of build.gradle.kts)

**Verified chain:** Source files -> Gradle copy tasks -> JAR resources (dev) + lib/ directory (production) -> BbjTextMateBundleProvider reads grammars, BbjLanguageServer resolves main.cjs

**Resource resolution in BbjLanguageServer:**
1. Check `plugin.getPluginPath().resolve("lib/language-server/main.cjs")` (installed plugin)
2. Fallback: classloader `getResource("language-server/main.cjs")` (development mode)
3. Both paths are populated by the build system

**Resource resolution in BbjTextMateBundleProvider:**
1. Classloader `getResource("textmate/bbj-bundle/" + file)` for each of 5 files
2. Extracts to temp directory for TextMate engine consumption

---

## Step 5: E2E Flow Verification

### Flow 1: Fresh Install

```
Install ZIP -> Open project -> Open .bbj file -> [all features active]
```

| Step | Component | Connected To | Status |
|------|-----------|-------------|--------|
| 1. Install ZIP | buildPlugin output | Plugin manager | CONNECTED |
| 2. First launch | BbjWelcomeNotification (postStartupActivity) | Shows balloon -> links to BbjSettingsConfigurable | CONNECTED |
| 3. Open .bbj file | BbjFileType registered for extensions `bbj;bbl;bbjt;src` | IntelliJ file type system | CONNECTED |
| 4. Syntax highlighting | BbjTextMateBundleProvider -> TextMateEditorHighlighterProvider | Loads grammars from resources | CONNECTED |
| 5. Node.js detection | BbjLanguageServer.resolveNodePath() | Settings -> detectNodePath() -> getCachedNodePath() -> "node" | CONNECTED |
| 6. Server start | BbjLanguageServerFactory -> BbjLanguageServer (OSProcessStreamConnectionProvider) | `node main.cjs --stdio` | CONNECTED |
| 7. Init options | BbjLanguageServerFactory.createClientFeatures().initializeParams() | home, classpath, javaInteropHost, javaInteropPort | CONNECTED |
| 8. Status display | BbjLanguageClient.handleServerStatusChanged() -> BbjServerService.updateStatus() -> TOPIC -> BbjStatusBarWidget | Shows "BBj: Ready" | CONNECTED |
| 9. Diagnostics | LSP4IJ receives textDocument/publishDiagnostics | Built-in LSP4IJ handling | CONNECTED (via languageMapping) |
| 10. Completion | LSP4IJ sends textDocument/completion | Built-in LSP4IJ handling | CONNECTED (via languageMapping) |
| 11. Missing home banner | BbjMissingHomeNotificationProvider checks BbjSettings + BbjHomeDetector | Shows warning if not auto-detected | CONNECTED |
| 12. Missing node banner | BbjMissingNodeNotificationProvider checks BbjSettings + BbjNodeDetector + BbjNodeDownloader | Shows warning with download action | CONNECTED |

**Flow status: COMPLETE** -- all 12 steps connected end-to-end.

### Flow 2: Settings Change

```
User changes BBj home -> Settings saved -> Server restarts -> New config active
```

| Step | Component | Connected To | Status |
|------|-----------|-------------|--------|
| 1. Open settings | ShowSettingsUtil -> BbjSettingsConfigurable | Creates BbjSettingsComponent | CONNECTED |
| 2. Edit BBj home | bbjHomeField with BbjHomeDetector validation | Updates classpath dropdown via updateClasspathDropdown() | CONNECTED |
| 3. Apply | BbjSettingsConfigurable.apply() | Writes to BbjSettings.State | CONNECTED |
| 4. Refresh banners | apply() calls EditorNotifications.updateAllNotifications() for all open projects | Banners re-evaluate | CONNECTED |
| 5. Restart server | apply() calls BbjServerService.scheduleRestart() for all open projects | Debounced restart via Alarm | CONNECTED |
| 6. Server reinit | BbjServerService.restart() -> LanguageServerManager.stop("bbjLanguageServer") + start("bbjLanguageServer") | LSP4IJ restarts process | CONNECTED |
| 7. Fresh initOptions | BbjLanguageServerFactory.createClientFeatures().initializeParams() reads fresh BbjSettings.State | New home/classpath/javaInteropPort | CONNECTED |

**Flow status: COMPLETE** -- settings changes propagate through restart to language server.

### Flow 3: Java Interop

```
BBjServices running on port 5008 -> LS connects -> Java completions -> Status bar shows connected
```

| Step | Component | Connected To | Status |
|------|-----------|-------------|--------|
| 1. Port config | BbjSettings.State.javaInteropPort (default 5008) | BbjSettingsComponent.javaInteropPortField | CONNECTED |
| 2. Init options | BbjLanguageServerFactory sends javaInteropHost="127.0.0.1", javaInteropPort=state.javaInteropPort | Language server receives in initialize | CONNECTED |
| 3. LS connects | Language server internally connects to java-interop TCP service | Not plugin's responsibility (LS-internal) | N/A (by design) |
| 4. Health check starts | BbjJavaInteropService subscribes to BbjServerStatusListener.TOPIC | When ServerStatus.started, calls startChecking() | CONNECTED |
| 5. TCP probe | BbjJavaInteropService.checkConnection() -> Socket connect to 127.0.0.1:port | Reads port from BbjSettings at check time | CONNECTED |
| 6. Status broadcast | BbjJavaInteropService.broadcastStatus() -> BbjJavaInteropStatusListener.TOPIC | BbjJavaInteropStatusBarWidget subscribes | CONNECTED |
| 7. Status bar | BbjJavaInteropStatusBarWidget.updateStatus() | Shows "Java: Connected" or "Java: Disconnected" with appropriate icons | CONNECTED |
| 8. Disconnected banner | BbjJavaInteropNotificationProvider checks BbjJavaInteropService.getCurrentStatus() | Shows "Start BBjServices for Java completions" if DISCONNECTED | CONNECTED |
| 9. Grace period | BbjJavaInteropService.disconnectedSince + GRACE_PERIOD_MS (2s) | Prevents flash on transient disconnects | CONNECTED |
| 10. Startup suppression | BbjJavaInteropService.isFirstCheckCompleted() | BbjJavaInteropNotificationProvider suppresses banner until first check | CONNECTED |

**Flow status: COMPLETE** -- java-interop config flows to LS, independent TCP health check drives UI.

### Flow 4: Error Recovery (Node.js Missing)

```
No Node.js -> Banner shown -> User clicks Download -> Node.js cached -> Server starts
```

| Step | Component | Connected To | Status |
|------|-----------|-------------|--------|
| 1. Detection fails | BbjNodeDetector.detectNodePath() returns null | BbjLanguageServer falls through to "node" (which fails) | CONNECTED |
| 2. Banner shown | BbjMissingNodeNotificationProvider: settings empty + detect null + cached null | Shows warning with 3 actions | CONNECTED |
| 3. Download action | Banner "Download Node.js" -> BbjNodeDownloader.downloadNodeAsync() | Background task with progress | CONNECTED |
| 4. Platform detection | BbjNodeDownloader.getPlatformName() + getArchitecture() | SystemInfo API (darwin/linux/win + arm64/x64) | CONNECTED |
| 5. Download + extract | HttpRequests.request(downloadUrl) -> extractTarGz/extractZip | Saves to PathManager.getPluginsPath()/bbj-intellij-data/nodejs/ | CONNECTED |
| 6. Success notification | showDownloadSuccessNotification() with "Restart Language Server" action | BbjServerService.getInstance(project).restart() | CONNECTED |
| 7. Banner refresh | downloadNodeAsync onComplete -> EditorNotifications.updateAllNotifications() | Banner disappears (cached node now found) | CONNECTED |
| 8. Server resolves node | BbjLanguageServer.resolveNodePath() step 3: BbjNodeDownloader.getCachedNodePath() | Returns cached path | CONNECTED |

**Flow status: COMPLETE** -- download flow connects through to server startup.

### Flow 5: Error Recovery (Server Crash)

```
Server crashes -> Auto-restart -> Crashes again -> Banner + balloon -> Manual restart
```

| Step | Component | Connected To | Status |
|------|-----------|-------------|--------|
| 1. Server stops unexpectedly | LSP4IJ sends ServerStatus.stopped to BbjLanguageClient | handleServerStatusChanged() -> BbjServerService.updateStatus() | CONNECTED |
| 2. Crash detection | BbjServerService.updateStatus(): stopped while previousStatus was started/starting | Sets serverCrashed=true, increments crashCount | CONNECTED |
| 3. Auto-restart (1st crash) | crashCount==1 -> invokeLater -> restart() | LanguageServerManager.stop + start | CONNECTED |
| 4. Crash again | Same detection logic, crashCount==2 | Stops auto-restart, calls notifyCrash() | CONNECTED |
| 5. Balloon notification | NotificationGroupManager "BBj Language Server" -> "Show Log" + "Restart" actions | Show Log opens tool window, Restart calls clearCrashState() + restart() | CONNECTED |
| 6. Editor banner | BbjServerCrashNotificationProvider checks BbjServerService.isServerCrashed() | Shows error panel with "Restart Server" and "Show Log" | CONNECTED |
| 7. Banner refresh | updateStatus(started) -> clearCrashState -> EditorNotifications.updateAllNotifications() | Banner disappears on successful restart | CONNECTED |

**Flow status: COMPLETE** -- crash detection, auto-restart, and manual recovery all wired.

### Flow 6: Distribution

```
Gradle buildPlugin -> ZIP -> Install from disk -> All features work
```

| Step | Component | Connected To | Status |
|------|-----------|-------------|--------|
| 1. Compile sources | 35 Java source files | All imports resolve (verified by build) | CONNECTED |
| 2. Copy TextMate | copyTextMateBundle from bbj-vscode/ | 5 files: package.json, 2 grammars, 2 language configs | CONNECTED |
| 3. Copy LS | copyLanguageServer from bbj-vscode/out/language/main.cjs | 1.8 MB bundle | CONNECTED |
| 4. processResources | dependsOn copyTextMateBundle, copyLanguageServer | JAR includes resources | CONNECTED |
| 5. prepareSandbox | Copies main.cjs to lib/language-server/, grammars to lib/textmate/ | Runtime directory structure | CONNECTED |
| 6. Plugin descriptor | src/main/resources/META-INF/plugin.xml (128 lines, all 24 extensions) | Matches all implementation classes | CONNECTED |
| 7. Plugin icon | src/main/resources/META-INF/pluginIcon.svg (40x40) | Marketplace display | CONNECTED |
| 8. Description | src/main/resources/META-INF/description.html loaded in build.gradle.kts line 45 | Marketplace display | CONNECTED |
| 9. Version compatibility | sinceBuild="242", untilBuild=provider { "" } (no cap) | Works on 2024.2+ including 2025.3 | CONNECTED |
| 10. Dependencies | TextMate plugin (bundled), LSP4IJ 0.19.0 (marketplace) | Declared in `<depends>` and Gradle dependencies | CONNECTED |
| 11. Icon resources | 10 SVG icons in src/main/resources/icons/ | All 10 referenced by BbjIcons interface match filesystem | CONNECTED |
| 12. Dictionary | src/main/resources/com/basis/bbj/intellij/bbj.dic | BbjSpellcheckingStrategy returns "bbj.dic" | CONNECTED |

**Flow status: COMPLETE** -- all build artifacts connected to consumers.

---

## Step 6: Detailed Findings

### Finding 1: BbjCompletionFeature is orphaned (LOW severity)

**File:** `/Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java`

The class exists with a well-implemented `getIcon()` method that maps LSP CompletionItemKind values to BBj-specific icons (BbjIcons.FUNCTION, BbjIcons.VARIABLE, BbjIcons.KEYWORD). However, it is never called anywhere in the codebase.

In `BbjLanguageServerFactory.createClientFeatures()` (lines 32-52), the anonymous `LSPClientFeatures` subclass only:
- Overrides `initializeParams()` to send initialization options
- Calls `.setDocumentLinkFeature()` to disable document links

It does **not** call `.setCompletionFeature()` with a custom implementation that would invoke `BbjCompletionFeature.getIcon()`.

**Impact:** Code completion works (via LSP4IJ default handling), but completion items show LSP4IJ default icons rather than the custom BBj function/variable/keyword icons defined in BbjIcons.

**Recommendation:** Wire this in a future release by creating a custom `LSPCompletionFeature` subclass that delegates to `BbjCompletionFeature.getIcon()`.

### Finding 2: logLevel not in initializationOptions (INFORMATIONAL)

**File:** `/Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`

The `initializeParams()` method sends `home`, `classpath`, `javaInteropHost`, and `javaInteropPort` as initialization options, but does **not** include `logLevel`.

The `logLevel` is sent via `BbjLanguageClient.createSettings()` in the `workspace/didChangeConfiguration` path.

**Impact:** NONE if the language server reads log level from didChangeConfiguration settings (which LSP4IJ sends shortly after initialize). However, if the server only reads initializationOptions for log level, it would default to its internal default until a configuration change is sent. This is standard LSP behavior and likely intentional.

### Finding 3: Stale plugin.xml at project root (INFORMATIONAL)

**File:** `/Users/beff/_workspace/bbj-language-server/bbj-intellij/META-INF/plugin.xml`

This is an older version from early phases (Phase 1-2 only). It:
- Has `until-build="243.*"` (the bug fixed in Phase 6)
- Missing `<depends>com.redhat.devtools.lsp4ij</depends>`
- Missing all Phase 3-6 extensions (settings, LSP, interop, status bar, etc.)

**Impact:** NONE at runtime. Gradle uses `src/main/resources/META-INF/plugin.xml`. However, this file could confuse developers or tools that scan for plugin descriptors.

**Recommendation:** Delete this file or add it to `.gitignore`.

---

## Summary

### Overall Integration Status: PASS

All 6 phases are properly integrated. The codebase demonstrates strong cross-phase wiring with no broken E2E flows.

**Strengths:**
1. Settings flow is comprehensive -- changes propagate through debounced restart to fresh initializationOptions
2. Error recovery is thorough -- crash detection with auto-restart (once) and manual recovery UI
3. Node.js resolution has 4-level fallback chain (settings -> detect -> cached download -> PATH)
4. Java-interop health checking is independent of LS (TCP probe) with grace period to avoid UI flicker
5. Distribution build has dual-path resource resolution (lib/ for installed, classloader for development)
6. All 24 plugin.xml extension registrations match their implementation classes
7. All 10 SVG icon resources match their references in BbjIcons
8. TextMate bundle package.json language ID "BBj" matches plugin.xml fileType name and LSP4IJ languageMapping

**One minor orphan:**
- `BbjCompletionFeature` exists but is not wired into the LSP client features chain. Custom completion icons will not appear. This is cosmetic, not functional.

**No broken flows. No missing connections. No unprotected sensitive areas.**

---
*Integration check performed: 2026-02-01*
*Checker: Claude Opus 4.5 (integration-checker role)*
