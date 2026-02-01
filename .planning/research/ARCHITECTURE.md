# IntelliJ LSP Plugin Architecture

## Research Context
**Project:** BBj Language Server - IntelliJ Integration
**Approach:** LSP4IJ-based plugin consuming existing Langium language server
**Date:** 2026-02-01
**Status:** Architecture Research

## Executive Summary

IntelliJ LSP plugins using LSP4IJ follow a three-layer architecture:

1. **Plugin Layer** - IntelliJ extension points, UI components, settings
2. **LSP Adapter Layer** - LSP4IJ framework managing client/server communication
3. **External Processes** - Language server (Node.js) and supporting services (java-interop)

The critical architectural challenge is **process lifecycle management** - orchestrating two external processes (language server + java-interop) with proper startup sequencing, health monitoring, and graceful shutdown.

## Component Architecture

### Layer 1: IntelliJ Plugin (Java/Kotlin)

**Location:** `bbj-intellij/src/main/` (proposed)

#### 1.1 Plugin Descriptor (`plugin.xml`)

Defines extension points and services:

```xml
<extensions defaultExtensionNs="com.intellij">
  <!-- File type registration -->
  <fileType name="BBj"
            implementationClass="com.basis.bbj.intellij.BbjFileType"
            fieldName="INSTANCE"
            language="BBj"
            extensions="bbj;bbl;bbjt;src"/>

  <!-- Language definition -->
  <lang.language id="BBj"
                 implementationClass="com.basis.bbj.intellij.BbjLanguage"/>

  <!-- LSP4IJ language server definition -->
  <languageServer id="bbj-ls"
                  name="BBj Language Server"
                  serverInterface="com.basis.bbj.intellij.BbjLanguageServerDefinition"
                  factoryClass="com.basis.bbj.intellij.BbjLanguageServerFactory"/>

  <!-- TextMate grammar support -->
  <textMate.bundleProvider implementation="com.basis.bbj.intellij.BbjTextMateBundleProvider"/>

  <!-- Settings UI -->
  <projectConfigurable instance="com.basis.bbj.intellij.settings.BbjSettingsConfigurable"
                       displayName="BBj"
                       id="bbj.settings"/>
</extensions>

<depends>com.redhat.devtools.lsp4ij</depends>
```

**Key Extension Points:**
- `fileType` - Associates .bbj/.bbl/.bbjt/.src files with BBj language
- `languageServer` - Registers BBj language server with LSP4IJ
- `textMate.bundleProvider` - Provides TextMate grammar for syntax highlighting
- `projectConfigurable` - Settings UI for BBj home path and classpath

#### 1.2 File Type & Language Registration

**BbjFileType.java:**
```java
public class BbjFileType extends LanguageFileType {
    public static final BbjFileType INSTANCE = new BbjFileType();

    private BbjFileType() {
        super(BbjLanguage.INSTANCE);
    }

    @Override
    public String getName() { return "BBj"; }

    @Override
    public String getDescription() { return "BBj source file"; }

    @Override
    public String getDefaultExtension() { return "bbj"; }

    @Override
    public Icon getIcon() { /* BBj icon */ }
}
```

**BbjLanguage.java:**
```java
public class BbjLanguage extends Language {
    public static final BbjLanguage INSTANCE = new BbjLanguage();

    private BbjLanguage() {
        super("BBj");
    }
}
```

**Purpose:** Registers BBj as a recognized language in IntelliJ, enabling syntax highlighting, file associations, and LSP integration.

#### 1.3 TextMate Grammar Provider

**BbjTextMateBundleProvider.java:**
```java
public class BbjTextMateBundleProvider implements TextMateBundleProvider {
    @Override
    public @NotNull TextMateBundle getBundle() {
        // Load bbj.tmLanguage.json from plugin resources
        return TextMateBundle.create(
            "BBj",
            getClass().getResourceAsStream("/textmate/bbj.tmLanguage.json")
        );
    }
}
```

**Data Flow:**
1. IntelliJ detects .bbj file opening
2. TextMate bundle loads grammar rules from bundled JSON
3. IntelliJ's TextMate support applies syntax highlighting
4. LSP semantic tokens (if provided) overlay additional highlighting

**Note:** TextMate provides fast initial highlighting; LSP semantic tokens can provide more precise highlighting based on language server analysis.

#### 1.4 Settings Management

**BbjSettings.java (Application Service):**
```java
@State(
    name = "BbjSettings",
    storages = {@Storage("bbj.xml")}
)
public class BbjSettings implements PersistentStateComponent<BbjSettings.State> {
    public static class State {
        public String bbjHomePath;
        public List<String> classpathEntries = new ArrayList<>();
    }

    private State state = new State();

    public static BbjSettings getInstance() {
        return ApplicationManager.getApplication().getService(BbjSettings.class);
    }

    @Override
    public State getState() { return state; }

    @Override
    public void loadState(State state) { this.state = state; }
}
```

**BbjSettingsConfigurable.java (UI):**
```java
public class BbjSettingsConfigurable implements Configurable {
    private BbjSettingsPanel panel;

    @Override
    public JComponent createComponent() {
        panel = new BbjSettingsPanel();
        return panel.getPanel();
    }

    @Override
    public boolean isModified() {
        BbjSettings settings = BbjSettings.getInstance();
        return !Objects.equals(panel.getBbjHomePath(), settings.getState().bbjHomePath);
    }

    @Override
    public void apply() {
        BbjSettings settings = BbjSettings.getInstance();
        settings.getState().bbjHomePath = panel.getBbjHomePath();
        settings.getState().classpathEntries = panel.getClasspathEntries();

        // Restart language server with new settings
        restartLanguageServer();
    }
}
```

**Purpose:** Stores BBj home path and classpath configuration; triggers language server restart when settings change.

### Layer 2: LSP4IJ Adapter

**Location:** LSP4IJ library (dependency)

#### 2.1 Language Server Factory

**BbjLanguageServerFactory.java:**
```java
public class BbjLanguageServerFactory implements LanguageServerFactory {

    @Override
    public ServerCapabilities createServerCapabilities(@NotNull ProcessDescriptor descriptor) {
        return new BbjLanguageServerDefinition().getServerCapabilities(descriptor);
    }

    @Override
    public LanguageServerDefinition createServerDefinition(@NotNull Project project) {
        return new BbjLanguageServerDefinition(project);
    }
}
```

**Purpose:** Factory pattern for creating language server instances per-project.

#### 2.2 Language Server Definition

**BbjLanguageServerDefinition.java:**
```java
public class BbjLanguageServerDefinition extends LanguageServerDefinition {
    private final Project project;
    private ProcessHandle javaInteropProcess;

    public BbjLanguageServerDefinition(Project project) {
        this.project = project;
    }

    @Override
    public @NotNull ProcessDescriptor createProcessDescriptor() {
        // 1. Resolve Node.js runtime
        String nodePath = detectNodeJs();
        if (nodePath == null) {
            throw new RuntimeException("Node.js not found. Please install Node.js 18+");
        }

        // 2. Resolve language server bundle
        String serverPath = resolveLanguageServerPath();

        // 3. Start java-interop process FIRST
        startJavaInteropProcess();

        // 4. Build command line
        List<String> command = new ArrayList<>();
        command.add(nodePath);

        // Add debug flags if needed
        if (isDebugMode()) {
            command.add("--inspect=6009");
        }

        command.add(serverPath);

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.redirectErrorStream(true);

        return new ProcessDescriptor(builder);
    }

    @Override
    public void dispose() {
        // Shutdown java-interop process when language server stops
        if (javaInteropProcess != null && javaInteropProcess.isAlive()) {
            javaInteropProcess.destroy();
            try {
                javaInteropProcess.waitFor(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                javaInteropProcess.destroyForcibly();
            }
        }
        super.dispose();
    }

    private String detectNodeJs() {
        // Strategy 1: Check bundled Node.js in plugin resources
        String bundledNode = getBundledNodePath();
        if (bundledNode != null) return bundledNode;

        // Strategy 2: Check system PATH
        String systemNode = findInPath("node");
        if (systemNode != null) return systemNode;

        // Strategy 3: Check common install locations
        return checkCommonNodeLocations();
    }

    private String resolveLanguageServerPath() {
        // Language server is bundled with plugin
        // Path: bbj-intellij/src/main/resources/language-server/main.cjs
        File serverFile = new File(
            PluginManager.getPlugin(PluginId.getId("com.basis.bbj"))
                         .getPath()
                         .resolve("language-server/main.cjs")
                         .toString()
        );

        if (!serverFile.exists()) {
            throw new RuntimeException("Language server bundle not found at: " + serverFile);
        }

        return serverFile.getAbsolutePath();
    }

    private void startJavaInteropProcess() {
        BbjSettings settings = BbjSettings.getInstance();
        String bbjHome = settings.getState().bbjHomePath;

        if (bbjHome == null || bbjHome.isEmpty()) {
            throw new RuntimeException("BBj home path not configured");
        }

        // Build java-interop command
        // Assumes java-interop.jar is bundled with plugin
        String jarPath = resolveJavaInteropJarPath();

        List<String> command = Arrays.asList(
            "java",
            "-cp", bbjHome + "/lib/*:" + jarPath,
            "bbj.interop.SocketServiceApp",
            "--port", "5008"
        );

        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.redirectErrorStream(true);
            Process process = builder.start();
            javaInteropProcess = process.toHandle();

            // Wait for java-interop to start accepting connections
            waitForJavaInterop(5000);

        } catch (IOException e) {
            throw new RuntimeException("Failed to start java-interop service", e);
        }
    }

    private void waitForJavaInterop(int timeoutMs) {
        long startTime = System.currentTimeMillis();
        while (System.currentTimeMillis() - startTime < timeoutMs) {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress("127.0.0.1", 5008), 1000);
                return; // Connection successful
            } catch (IOException e) {
                // Retry
                try {
                    Thread.sleep(100);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted waiting for java-interop");
                }
            }
        }
        throw new RuntimeException("java-interop failed to start within " + timeoutMs + "ms");
    }
}
```

**Critical Design Points:**

1. **Startup Sequencing:** java-interop MUST start before language server
   - Language server immediately connects to java-interop on startup
   - If java-interop not available, language server connection fails
   - Wait for socket to accept connections before starting LS

2. **Process Ownership:** LanguageServerDefinition owns both processes
   - Creates java-interop in `createProcessDescriptor()`
   - Destroys java-interop in `dispose()`
   - Ensures proper cleanup when project closes

3. **Node.js Detection Strategy:**
   - Priority 1: Bundled Node.js (recommended for production)
   - Priority 2: System PATH
   - Priority 3: Common install locations (/usr/local/bin, etc.)

4. **Resource Bundling:**
   - Language server bundle: `resources/language-server/main.cjs`
   - java-interop JAR: `resources/java-interop/java-interop.jar`
   - TextMate grammar: `resources/textmate/bbj.tmLanguage.json`

#### 2.3 LSP Client Communication

**Managed by LSP4IJ:**
```
IntelliJ Editor
     |
     v
LSP4IJ Client (automatic)
     |
     v (JSON-RPC over stdio)
Language Server Process
     |
     v (JSON-RPC over socket)
java-interop Process
```

**Data Flow:**
1. User types in IntelliJ editor
2. IntelliJ generates document change events
3. LSP4IJ converts to LSP `textDocument/didChange` notifications
4. Sends JSON-RPC message to language server via stdio
5. Language server processes, may query java-interop via socket
6. Language server responds with diagnostics/completions
7. LSP4IJ converts LSP responses to IntelliJ UI updates

**Transport Mechanisms:**
- **IntelliJ ↔ LS:** stdio (ProcessBuilder input/output streams)
- **LS ↔ java-interop:** TCP socket (localhost:5008)

### Layer 3: External Processes

#### 3.1 Language Server (Node.js)

**Location:** `bbj-vscode/out/language/main.cjs` (existing, bundled)

**Entry Point:**
```typescript
// bbj-vscode/src/language/main.ts
import { startLanguageServer } from 'langium/lsp';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';

const connection = createConnection(ProposedFeatures.all);
const { shared } = createBBjServices({ connection, ...NodeFileSystem });
startLanguageServer(shared);
```

**Process Characteristics:**
- **Runtime:** Node.js 18+
- **Communication:** stdio (stdin/stdout for JSON-RPC)
- **Lifecycle:** Started by IntelliJ plugin, exits when stdio closes
- **Dependencies:** java-interop service (localhost:5008)

**Capabilities Provided:**
```json
{
  "textDocumentSync": "incremental",
  "completionProvider": {
    "triggerCharacters": [".", ":", "(", " "]
  },
  "hoverProvider": true,
  "signatureHelpProvider": {
    "triggerCharacters": ["(", ","]
  },
  "definitionProvider": true,
  "referencesProvider": true,
  "documentSymbolProvider": true,
  "workspaceSymbolProvider": true,
  "semanticTokensProvider": {
    "legend": { /* token types */ },
    "full": true
  },
  "diagnosticProvider": {
    "interFileDependencies": true,
    "workspaceDiagnostics": true
  }
}
```

#### 3.2 Java Interop Service

**Location:** `java-interop/build/libs/java-interop.jar` (existing, bundled)

**Entry Point:**
```java
// java-interop/src/main/java/bbj/interop/SocketServiceApp.java
public class SocketServiceApp {
    public static void main(String[] args) {
        int port = 5008; // Default
        ServerSocket serverSocket = new ServerSocket(port);
        Socket socket = serverSocket.accept();

        MessageConnection connection = createMessageConnection(
            new SocketMessageReader(socket),
            new SocketMessageWriter(socket)
        );

        connection.listen();
    }
}
```

**Process Characteristics:**
- **Runtime:** Java 17+
- **Communication:** TCP socket (localhost:5008)
- **Lifecycle:** Started by IntelliJ plugin before LS, exits when socket closes
- **Classpath:** Requires BBj lib JARs (from BBj home path)

**RPC Methods:**
```java
interface JavaInteropRPC {
    Classpath loadClasspath(ClasspathRequest request);
    JavaClass getClassInfo(ClassInfoRequest request);
    List<JavaClass> getClassInfos(PackageRequest request);
    List<JavaPackage> getTopLevelPackages();
}
```

## Process Lifecycle Management

### Startup Sequence

```
1. User opens IntelliJ project with .bbj files
   ↓
2. IntelliJ detects BBj file type
   ↓
3. LSP4IJ framework calls BbjLanguageServerDefinition.createProcessDescriptor()
   ↓
4. Plugin starts java-interop process
   - Validates BBj home path from settings
   - Builds classpath: BBj libs + java-interop.jar
   - Executes: java -cp ... bbj.interop.SocketServiceApp --port 5008
   - Waits for socket on localhost:5008 (max 5s timeout)
   ↓
5. Plugin starts language server process
   - Detects Node.js runtime (bundled or system)
   - Executes: node out/language/main.cjs
   - Language server immediately connects to java-interop:5008
   ↓
6. Language server sends initialize request
   ↓
7. LSP4IJ responds with client capabilities
   ↓
8. Language server sends initialized notification
   ↓
9. READY: IntelliJ can send document events
```

**Critical Dependency:** Step 4 must complete before step 5. If java-interop fails to start or times out, language server startup aborts with user-visible error.

### Health Monitoring

**Process Monitoring:**
```java
public class BbjLanguageServerDefinition {
    private ProcessHandle languageServerProcess;
    private ProcessHandle javaInteropProcess;

    public void monitorProcesses() {
        // Watch for unexpected exits
        javaInteropProcess.onExit().thenRun(() -> {
            if (languageServerProcess.isAlive()) {
                // java-interop crashed, restart both
                restartBothProcesses();
            }
        });

        languageServerProcess.onExit().thenRun(() -> {
            // Language server exited, clean up java-interop
            if (javaInteropProcess.isAlive()) {
                javaInteropProcess.destroy();
            }
        });
    }
}
```

**Connection Health:**
- LSP4IJ handles LS connection failures via automatic retry
- java-interop connection failures logged by LS, no auto-retry
- Restart strategy: User action or settings change triggers full restart

### Shutdown Sequence

```
1. User closes IntelliJ project
   ↓
2. IntelliJ disposes project services
   ↓
3. LSP4IJ calls LanguageServerDefinition.dispose()
   ↓
4. Plugin sends shutdown request to language server
   ↓
5. Language server closes connection to java-interop
   ↓
6. Plugin terminates language server process (graceful)
   ↓
7. Plugin terminates java-interop process (graceful)
   ↓
8. If processes don't exit in 5s, forcibly kill
```

### Error Recovery

**Failure Scenarios:**

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Node.js not found | Startup | Show error dialog, link to Node.js download |
| java-interop startup timeout | Startup | Show error with BBj home path validation |
| java-interop crash | Runtime | Log error, restart both processes |
| Language server crash | Runtime | LSP4IJ auto-restarts LS |
| BBj home path invalid | Startup | Show settings dialog |
| Port 5008 already in use | Startup | Show error, suggest killing existing process |

## Build Structure

### Gradle Plugin Configuration

**Location:** `bbj-intellij/build.gradle.kts`

```kotlin
plugins {
    id("java")
    id("org.jetbrains.intellij") version "1.17.2"
}

group = "com.basis.bbj"
version = "0.1.0-alpha"

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.redhat.devtools:lsp4ij:0.0.1") // LSP4IJ library
}

intellij {
    version.set("2023.2") // IntelliJ Community 2023.2
    type.set("IC") // Community Edition
    plugins.set(listOf("com.redhat.devtools.lsp4ij"))
}

tasks {
    patchPluginXml {
        sinceBuild.set("232")
        untilBuild.set("242.*")
    }

    // Copy language server bundle to resources
    register("copyLanguageServer", Copy::class) {
        from("../bbj-vscode/out/language/main.cjs")
        into("src/main/resources/language-server/")
    }

    // Copy java-interop JAR to resources
    register("copyJavaInterop", Copy::class) {
        from("../java-interop/build/libs/java-interop.jar")
        into("src/main/resources/java-interop/")
    }

    // Copy TextMate grammar to resources
    register("copyTextMateGrammar", Copy::class) {
        from("../bbj-vscode/syntaxes/bbj.tmLanguage.json")
        into("src/main/resources/textmate/")
    }

    buildPlugin {
        dependsOn("copyLanguageServer", "copyJavaInterop", "copyTextMateGrammar")
    }
}
```

**Build Dependencies:**
1. `bbj-vscode` must build first → produces `out/language/main.cjs`
2. `java-interop` must build first → produces `java-interop.jar`
3. `bbj-intellij` copies artifacts and packages into plugin ZIP

### Directory Structure

```
bbj-intellij/
├── build.gradle.kts
├── settings.gradle.kts
├── src/
│   ├── main/
│   │   ├── java/com/basis/bbj/intellij/
│   │   │   ├── BbjFileType.java
│   │   │   ├── BbjLanguage.java
│   │   │   ├── BbjLanguageServerFactory.java
│   │   │   ├── BbjLanguageServerDefinition.java
│   │   │   ├── BbjTextMateBundleProvider.java
│   │   │   └── settings/
│   │   │       ├── BbjSettings.java
│   │   │       ├── BbjSettingsConfigurable.java
│   │   │       └── BbjSettingsPanel.java
│   │   └── resources/
│   │       ├── META-INF/
│   │       │   └── plugin.xml
│   │       ├── language-server/
│   │       │   └── main.cjs (copied from bbj-vscode)
│   │       ├── java-interop/
│   │       │   └── java-interop.jar (copied from java-interop)
│   │       └── textmate/
│   │           └── bbj.tmLanguage.json (copied from bbj-vscode)
│   └── test/
│       └── java/com/basis/bbj/intellij/
│           └── BbjLanguageServerTest.java
└── build/ (generated)
    └── distributions/
        └── bbj-intellij-0.1.0-alpha.zip
```

## Data Flow Diagrams

### Completion Request Flow

```
User types "obj." in IntelliJ editor
    ↓
IntelliJ generates document change event
    ↓
LSP4IJ sends textDocument/didChange (JSON-RPC over stdio)
    ↓
Language Server updates document AST
    ↓
User triggers completion (Ctrl+Space)
    ↓
LSP4IJ sends textDocument/completion (JSON-RPC over stdio)
    ↓
Language Server analyzes AST
    ↓
If obj is Java type:
    Language Server → java-interop: getClassInfo("ClassName") (JSON-RPC over socket)
    java-interop → Java reflection → return methods/fields
    Language Server receives Java class info
    ↓
Language Server builds completion items
    ↓
Language Server responds with CompletionList (JSON-RPC over stdio)
    ↓
LSP4IJ converts to IntelliJ completion UI
    ↓
IntelliJ shows completion popup
```

### Diagnostics Flow

```
User saves .bbj file
    ↓
IntelliJ triggers save event
    ↓
LSP4IJ sends textDocument/didSave (JSON-RPC over stdio)
    ↓
Language Server re-validates document
    ↓
Language Server runs BBj validators:
    - Syntax errors (lexer/parser)
    - Type checking (may query java-interop for Java types)
    - Semantic analysis (undefined variables, etc.)
    ↓
Language Server sends textDocument/publishDiagnostics (JSON-RPC over stdio)
    ↓
LSP4IJ converts to IntelliJ error markers
    ↓
IntelliJ shows red squiggles and error panel
```

### Settings Change Flow

```
User changes BBj home path in IntelliJ settings
    ↓
BbjSettingsConfigurable.apply() called
    ↓
Settings persisted to bbj.xml
    ↓
BbjSettingsConfigurable.restartLanguageServer() called
    ↓
LSP4IJ.restartServer(project, "bbj-ls") called
    ↓
Language server dispose() → shutdown request → process exit
    ↓
java-interop dispose() → socket close → process exit
    ↓
LSP4IJ creates new LanguageServerDefinition
    ↓
New java-interop process started with new BBj home classpath
    ↓
New language server process started
    ↓
Language server reconnects to java-interop
    ↓
READY with new settings
```

## Component Boundaries

### Plugin ↔ LSP4IJ Interface

**Boundary:** Plugin provides `LanguageServerDefinition`, LSP4IJ manages everything else

**Plugin Responsibilities:**
- File type registration
- TextMate grammar loading
- Settings UI
- Process creation (language server + java-interop)
- Node.js detection
- Resource bundling

**LSP4IJ Responsibilities:**
- JSON-RPC protocol implementation
- Document synchronization
- Request/response routing
- Capability negotiation
- Connection lifecycle (start/stop/restart)
- Error recovery and retry logic

**Interface Contract:**
```java
interface LanguageServerDefinition {
    ProcessDescriptor createProcessDescriptor(); // Plugin implements
    void dispose(); // Plugin implements cleanup
}
```

### Language Server ↔ java-interop Interface

**Boundary:** Socket-based JSON-RPC (existing contract, unchanged)

**Language Server Responsibilities:**
- Connect to java-interop on startup
- Send classpath load request (BBj home + entries)
- Request Java class metadata during completion/validation
- Handle connection failures gracefully (log errors)

**java-interop Responsibilities:**
- Listen on localhost:5008
- Load BBj classpath JARs
- Reflect over Java classes
- Respond to RPC requests with class/method/field info
- Cache class metadata for performance

**Interface Contract:**
```typescript
interface JavaInteropRPC {
    loadClasspath(entries: string[]): Promise<Classpath>;
    getClassInfo(className: string): Promise<JavaClass>;
    getClassInfos(packageName: string): Promise<JavaClass[]>;
    getTopLevelPackages(): Promise<JavaPackage[]>;
}
```

**Port Configuration:** Hardcoded to 5008 (potential future enhancement: make configurable)

### IntelliJ UI ↔ Plugin Interface

**Boundary:** IntelliJ Platform APIs

**IntelliJ Provides:**
- File system events (open/save/close)
- Editor events (typing, cursor movement)
- UI components (error markers, completion popups)
- Settings persistence
- Project lifecycle events

**Plugin Consumes:**
- `FileType` API - file associations
- `Language` API - language registration
- `PersistentStateComponent` API - settings storage
- `Configurable` API - settings UI
- Extension point system - hooking into IntelliJ

## Suggested Build Order

### Phase 1: Minimal Plugin Skeleton
**Goal:** IntelliJ recognizes .bbj files, loads TextMate grammar

**Components:**
1. Gradle build configuration (`build.gradle.kts`)
2. `plugin.xml` with file type + language extensions
3. `BbjFileType.java`
4. `BbjLanguage.java`
5. `BbjTextMateBundleProvider.java`
6. Copy task for TextMate grammar

**Validation:** Open .bbj file → syntax highlighting works

**Estimated Effort:** 1-2 days

### Phase 2: Settings UI
**Goal:** User can configure BBj home path and classpath

**Components:**
1. `BbjSettings.java` (state persistence)
2. `BbjSettingsConfigurable.java` (settings page)
3. `BbjSettingsPanel.java` (UI form)
4. Extension point in `plugin.xml`

**Validation:** IntelliJ → Settings → BBj → enter BBj home → persists across restarts

**Estimated Effort:** 1 day

### Phase 3: Language Server Integration (No java-interop)
**Goal:** Language server starts, basic LSP features work (syntax errors, hover)

**Components:**
1. `BbjLanguageServerFactory.java`
2. `BbjLanguageServerDefinition.java` (simplified - no java-interop startup yet)
3. Node.js detection logic
4. Language server bundle copy task
5. Extension point in `plugin.xml`

**Validation:**
- Open .bbj file → LS starts
- Syntax errors appear as red squiggles
- Hover over keyword → shows info

**Estimated Effort:** 2-3 days

### Phase 4: java-interop Integration
**Goal:** Full BBj features work (Java completions, type checking)

**Components:**
1. Update `BbjLanguageServerDefinition.java` with java-interop startup
2. java-interop JAR copy task
3. Startup sequencing logic (java-interop → wait → LS)
4. Shutdown cleanup logic

**Validation:**
- Type `obj = new BBjAPI()` → completion shows BBj API methods
- Java class completions work end-to-end

**Estimated Effort:** 2 days

### Phase 5: Process Management & Error Handling
**Goal:** Robust process lifecycle, graceful error recovery

**Components:**
1. Process health monitoring
2. Restart on settings change
3. Error dialogs for common failures
4. Logging and diagnostics

**Validation:**
- Change BBj home → both processes restart
- Kill java-interop → user sees actionable error
- Invalid BBj home → settings dialog appears

**Estimated Effort:** 2 days

### Phase 6: Node.js Bundling (Optional)
**Goal:** Plugin works without user-installed Node.js

**Components:**
1. Download Node.js binaries (per platform: Windows/Mac/Linux)
2. Bundle in plugin resources
3. Update detection logic to prefer bundled Node
4. Platform-specific logic for executable permissions

**Validation:** Fresh machine without Node.js → plugin works

**Estimated Effort:** 3-4 days

**Note:** This is optional for alpha release if target users already have Node.js installed.

## Key Design Decisions

### 1. Process Ownership Model

**Decision:** Plugin owns both language server and java-interop processes

**Rationale:**
- IntelliJ plugin has access to Java runtime (easy to spawn java-interop)
- LS expects java-interop already running (no startup code in LS)
- Consistent with VS Code approach (extension starts both)
- Simplifies error handling (one place to manage lifecycle)

**Alternative Considered:** LS spawns java-interop
- Rejected: LS would need child process management code
- Rejected: Different behavior between VS Code and IntelliJ

### 2. Transport Mechanisms

**Decision:** stdio for LS, TCP socket for java-interop

**Rationale:**
- stdio is LSP standard (works with all LSP clients)
- Socket allows LS and java-interop in different processes
- Socket survives LS restarts (could keep java-interop alive)

**Alternative Considered:** stdio for both
- Rejected: Would require process chaining or shared parent

### 3. Node.js Detection Strategy

**Decision:** Bundled Node.js (if feasible), fallback to system PATH

**Rationale:**
- Zero-install experience for end users
- Consistent Node version across installations
- Avoids "Node.js not found" support tickets

**Trade-offs:**
- Increases plugin size (~50-80MB per platform)
- Requires platform-specific builds
- More complex build process

**Alternative:** Require system Node.js
- Simpler plugin, but worse UX
- Consider for alpha, bundle for beta/GA

### 4. Settings Scope

**Decision:** Application-level settings (global BBj home path)

**Rationale:**
- Most users have single BBj installation
- Simpler UX (set once, works everywhere)
- Matches VS Code approach

**Alternative Considered:** Project-level settings
- Would allow per-project BBj versions
- Adds complexity for uncommon use case

### 5. TextMate vs LSP Semantic Tokens

**Decision:** TextMate for initial highlighting, LSP semantic tokens as overlay

**Rationale:**
- TextMate provides instant highlighting (no LS startup delay)
- LSP semantic tokens add precision (context-aware colors)
- Graceful degradation if LS unavailable

**Trade-off:** Dual highlighting systems add complexity

## Dependencies Between Components

```
BbjFileType ──┐
              ├──> BbjLanguage
BbjTextMateBundleProvider ──┘

BbjSettings ──> BbjSettingsConfigurable ──> BbjLanguageServerDefinition

BbjLanguageServerFactory ──> BbjLanguageServerDefinition

BbjLanguageServerDefinition ──┬──> Node.js runtime (external)
                               ├──> Language server bundle (../bbj-vscode/out)
                               └──> java-interop JAR (../java-interop/build/libs)

Language Server ──> java-interop (runtime socket dependency)
```

**Build-time Dependencies:**
- IntelliJ plugin build depends on `bbj-vscode` build completing
- IntelliJ plugin build depends on `java-interop` build completing
- Both artifacts must exist before `buildPlugin` task runs

**Runtime Dependencies:**
- Language server requires java-interop running on port 5008
- java-interop requires BBj home path with valid classpath JARs
- Plugin requires Node.js runtime (bundled or system)

## Open Questions & Risks

### 1. Node.js Bundling Feasibility

**Question:** Should we bundle Node.js in the plugin, or require system install?

**Trade-offs:**
- **Bundle:** Better UX, larger plugin size (~50-80MB), platform-specific builds
- **System:** Smaller plugin, worse UX, potential version conflicts

**Recommendation:** Start with system Node.js for alpha, evaluate bundling for beta based on user feedback.

### 2. java-interop Port Conflicts

**Question:** What if port 5008 is already in use?

**Options:**
1. Fail with error message (simplest)
2. Dynamic port allocation (requires LS config changes)
3. Kill existing process (risky)

**Recommendation:** Fail with error for alpha. Consider dynamic ports in future if this becomes a common issue.

### 3. Multi-Platform Testing

**Question:** How to test on Windows/Mac/Linux before release?

**Challenge:** Different path separators, executable permissions, process management

**Recommendation:**
- Develop on Mac (primary platform)
- Test on Windows via VM or CI
- Linux testing via Docker or CI

### 4. Performance - Startup Time

**Question:** How long does it take for both processes to start?

**Components:**
- java-interop startup: ~1-2s (JVM init + classpath loading)
- Language server startup: ~2-3s (Node.js init + AST build)
- Total: ~3-5s before first completion

**Mitigation:**
- Start processes on project open (not on first .bbj file open)
- Show progress indicator during startup
- Keep processes alive across file opens

### 5. Classpath Configuration UX

**Question:** How should users specify classpath entries beyond BBj home?

**Current:** BBj.properties file parsing (like VS Code)

**Alternative:** Settings UI with list of paths

**Recommendation:** Use same BBj.properties parsing as VS Code for consistency. Add UI in future if needed.

## References & Resources

### LSP4IJ Documentation
- **GitHub:** https://github.com/redhat-developer/lsp4ij
- **Extension Points:** `com.redhat.devtools.lsp4ij.languageServer`
- **Examples:** Quarkus plugin, Liberty Tools plugin

### IntelliJ Platform SDK
- **Plugin Development:** https://plugins.jetbrains.com/docs/intellij/welcome.html
- **Extension Points:** https://plugins.jetbrains.com/docs/intellij/plugin-extensions.html
- **Language Support:** https://plugins.jetbrains.com/docs/intellij/custom-language-support.html

### Existing Codebase
- **Language Server:** `bbj-vscode/src/language/main.ts`
- **VS Code Extension:** `bbj-vscode/src/extension.ts` (reference for process management)
- **java-interop:** `java-interop/src/main/java/bbj/interop/SocketServiceApp.java`

### LSP Specification
- **Protocol:** https://microsoft.github.io/language-server-protocol/
- **Capabilities:** textDocument/completion, hover, diagnostics, etc.

## Conclusion

The IntelliJ LSP plugin architecture follows a clear three-layer pattern:
1. **Plugin Layer** - IntelliJ-specific UI and lifecycle management
2. **LSP4IJ Adapter** - Protocol translation and connection management
3. **External Processes** - Reusable language server and Java interop service

**Critical Path:** Process lifecycle management is the most complex component, requiring careful sequencing (java-interop before LS), health monitoring, and graceful shutdown.

**Build Strategy:** Incremental phases from static file type registration → settings UI → language server integration → java-interop → robust error handling.

**Reuse:** 100% of language server logic reused; only thin IntelliJ adapter layer needed.
