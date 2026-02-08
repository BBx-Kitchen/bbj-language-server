# Phase 36: Settings Plumbing - Research

**Researched:** 2026-02-08
**Domain:** LSP configuration hot-reload and logger level synchronization
**Confidence:** HIGH

## Summary

Phase 36 implements hot-reloadable debug settings that flow from IDE settings UI to the language server and control logger behavior without requiring restart. The implementation uses LSP's `workspace/didChangeConfiguration` notification mechanism, which is already partially implemented in the codebase for Java interop settings but needs extension to handle the new `bbj.debug` boolean setting.

The VS Code client declares `configurationSection: 'bbj'` in its `synchronize` options, which causes vscode-languageclient to automatically send `didChangeConfiguration` notifications whenever any `bbj.*` setting changes. The language server's existing handler in `main.ts` (lines 72-131) receives these notifications and updates Java interop configuration. This same handler needs extension to toggle logger level between WARN (debug off) and DEBUG (debug on).

IntelliJ uses LSP4IJ's initialization options pattern — settings are passed once at server startup via `initializeParams`, so hot-reload requires server restart. However, the phase focuses on VS Code first (IntelliJ enhancement is future work).

**Primary recommendation:** Extend the existing `onDidChangeConfiguration` handler in `main.ts` to read `bbj.debug` boolean, map it to logger level (false → WARN, true → DEBUG), call `logger.setLevel()`, and ensure the handler runs AFTER workspace initialization to implement quiet startup mode.

## Standard Stack

### Core LSP Infrastructure

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| vscode-languageserver | 9.0.1 | Server-side LSP protocol implementation | Industry standard, used by all Langium projects |
| vscode-languageclient | 9.0.1 | Client-side LSP protocol implementation | Pairs with server library, handles config sync |
| Langium ConfigurationProvider | 4.1.3 | Abstraction over LSP workspace configuration | Part of Langium framework, provides config caching |
| LSP workspace/didChangeConfiguration | LSP 3.17 | Configuration change notification protocol | Official LSP spec for hot-reload settings |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| InitializationOptions | LSP 3.17 | Server startup configuration | One-time settings passed during `initialize` request |
| workspace/configuration request | LSP 3.17 | Server-initiated config pull | When server needs to query specific settings on-demand |

**Installation:**

No additional dependencies required. All components already present in the codebase.

## Architecture Patterns

### Recommended Project Structure

```
bbj-vscode/src/
├── extension.ts           # Client-side: synchronize config, initializationOptions
├── language/
│   ├── main.ts           # Server-side: onDidChangeConfiguration handler
│   ├── logger.ts         # Logger singleton with setLevel()
│   ├── bbj-ws-manager.ts # Workspace initialization, onInitialize handler
│   └── bbj-module.ts     # DI container setup
└── package.json          # VS Code settings schema (contributes.configuration)
```

Settings flow: `package.json schema` → `extension.ts initializationOptions` → `main.ts onInitialize` → `main.ts onDidChangeConfiguration` → `logger.setLevel()` → behavior change

### Pattern 1: Configuration Section Synchronization (VS Code)

**What:** Declare `configurationSection` in LanguageClientOptions to automatically sync settings to server

**When to use:** When you want the client to push settings changes to the server automatically

**Example:**
```typescript
// extension.ts (client-side)
const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'bbj' }],
    synchronize: {
        fileEvents: fileSystemWatcher,
        configurationSection: 'bbj'  // Auto-sync all bbj.* settings
    },
    initializationOptions: {
        home: vscode.workspace.getConfiguration("bbj").get("home"),
        classpath: vscode.workspace.getConfiguration("bbj").get("classpath"),
        // ... other settings sent once at startup
    }
};
```

**Source:** Existing pattern in `bbj-vscode/src/extension.ts` lines 539-555

### Pattern 2: onDidChangeConfiguration Handler (Server-side)

**What:** Register handler AFTER `startLanguageServer()` to override Langium's default and apply custom logic

**When to use:** When you need custom logic beyond Langium's config cache update

**Example:**
```typescript
// main.ts (server-side)
import { logger, LogLevel } from './logger.js';

// Start server FIRST (Langium registers default handler)
startLanguageServer(shared);

// THEN override with custom handler
connection.onDidChangeConfiguration(async (change) => {
    // Step 1: Forward to Langium's ConfigurationProvider (keeps cache in sync)
    shared.workspace.ConfigurationProvider.updateConfiguration(change);

    // Step 2: Extract bbj-specific settings
    const config = change.settings?.bbj;
    if (!config) {
        return;
    }

    // Step 3: Apply debug setting to logger
    const debugEnabled = config.debug === true;
    const newLevel = debugEnabled ? LogLevel.DEBUG : LogLevel.WARN;
    logger.setLevel(newLevel);

    // Step 4: Handle other settings (Java interop, etc.)
    // ... existing logic for config.interop, config.configPath ...
});
```

**Source:** Existing pattern in `bbj-vscode/src/language/main.ts` lines 72-131, extended for logger

**Critical ordering:**
1. Call `startLanguageServer(shared)` first — Langium registers default handler
2. Register `connection.onDidChangeConfiguration()` second — overrides default
3. Always call `ConfigurationProvider.updateConfiguration()` — keeps Langium internals in sync

**Why this order matters:** Langium's default handler only updates the config cache. Custom handler needs to run instead to apply settings to logger, Java interop, etc. BUT custom handler must still update the cache via `updateConfiguration()`.

### Pattern 3: Quiet Startup via Temporary Log Level

**What:** Gate verbose output during initial workspace build by temporarily suppressing logger

**When to use:** When startup involves heavy operations (javadoc scanning, classpath loading) that spam console

**Implementation:**
```typescript
// main.ts (server-side)

// Default logger level: ERROR (quietest)
// logger.ts already defaults to LogLevel.ERROR

// Guard flag to prevent premature Java interop reload
let workspaceInitialized = false;

// Hook into DocumentBuilder build phase completion
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    workspaceInitialized = true;

    // NOW apply user's debug setting for the first time
    // (Assumption: settings were passed via initializationOptions)
    const debugEnabled = /* extract from initializationOptions or query config */;
    const newLevel = debugEnabled ? LogLevel.DEBUG : LogLevel.WARN;
    logger.setLevel(newLevel);
});

// onDidChangeConfiguration handler checks workspaceInitialized flag
connection.onDidChangeConfiguration(async (change) => {
    shared.workspace.ConfigurationProvider.updateConfiguration(change);
    const config = change.settings?.bbj;
    if (!config) return;

    // Apply debug setting change
    if (config.debug !== undefined) {
        const newLevel = config.debug ? LogLevel.DEBUG : LogLevel.WARN;
        logger.setLevel(newLevel);
    }

    // Skip Java interop reload during initial startup
    if (!workspaceInitialized) {
        // Still update non-reload settings
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(config.configPath || '');
        return;
    }

    // ... rest of handler for post-initialization changes
});
```

**Source:** Existing pattern in `main.ts` lines 65-88 (workspaceInitialized guard for Java interop)

**Key insight:** Quiet startup is NOT about delayed logger initialization — it's about temporarily suppressing output (ERROR level) until workspace is ready, then restoring user's preferred level (WARN or DEBUG).

### Pattern 4: InitializationOptions vs Configuration (When to Use Each)

**What:** Two mechanisms for passing settings from client to server — understand when to use which

| Mechanism | When Sent | Hot-Reload | Use Case |
|-----------|-----------|------------|----------|
| **InitializationOptions** | Once at server startup (`initialize` request) | No — requires restart | Immutable settings (BBj home path, node path) |
| **workspace/didChangeConfiguration** | On every setting change | Yes | Hot-reloadable settings (debug flag, interop host/port) |

**Example:**
```typescript
// Client-side (extension.ts):
initializationOptions: {
    home: vscode.workspace.getConfiguration("bbj").get("home"),           // Immutable: rarely changes
    classpath: vscode.workspace.getConfiguration("bbj").get("classpath"), // Immutable: project-level
    debug: vscode.workspace.getConfiguration("bbj").get("debug"),         // Mutable: frequently toggled
    // ^^^ This is WRONG — debug should NOT be in initializationOptions
}

// CORRECT approach:
// - Pass immutable settings via initializationOptions (home, classpath)
// - Read mutable settings in onDidChangeConfiguration (debug, interop)
// - OR read initial debug value from config in onInitialize, then updates via didChangeConfiguration
```

**Trade-off:** The codebase currently passes some hot-reloadable settings (interop host/port) via initializationOptions AND handles them in didChangeConfiguration. This works but is redundant. For `bbj.debug`, we should:
1. NOT add it to initializationOptions (avoid redundancy)
2. Read initial value in `onInitialize` or after workspace build completes
3. Handle changes via `onDidChangeConfiguration`

**Source:** Analysis of `extension.ts` lines 546-553 and `main.ts` lines 72-131

### Anti-Patterns to Avoid

- **Not calling ConfigurationProvider.updateConfiguration():** Langium's config cache will desync from actual settings, breaking `workspace/configuration` requests
- **Reading config.debug from initializationOptions:** Debug is a hot-reloadable setting, should come from didChangeConfiguration
- **Setting logger level before workspace initialization completes:** Violates quiet startup requirement (see success criterion 3)
- **Ignoring change.settings nullability:** Some LSP clients send didChangeConfiguration with null settings (just a signal), must check before accessing properties

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Configuration schema definition | Custom JSON schema in docs | VS Code `contributes.configuration` in package.json | IDE validates settings, generates UI, provides autocomplete |
| Configuration caching | Custom in-memory map | Langium ConfigurationProvider | Already handles caching, scoping, and LSP protocol details |
| Settings persistence | File-based storage | IDE settings system | Workspace vs global scopes, user overrides, all handled by IDE |
| Change notifications | File watchers or polling | LSP workspace/didChangeConfiguration | Standard protocol, works across all LSP clients |

**Key insight:** LSP configuration is well-specified and tooling-mature. Don't reinvent — use the protocol as designed.

## Common Pitfalls

### Pitfall 1: Registering onDidChangeConfiguration before startLanguageServer()

**What goes wrong:** Handler gets overridden by Langium's default handler, custom logic never runs

**Why it happens:** `startLanguageServer()` internally calls `connection.onDidChangeConfiguration()` to register Langium's default handler (which only updates ConfigurationProvider cache)

**How to avoid:**
1. Call `startLanguageServer(shared)` first
2. THEN register custom handler with `connection.onDidChangeConfiguration()`
3. Custom handler overrides Langium's default

**Warning signs:**
- Settings changes don't trigger expected behavior
- ConfigurationProvider cache updates but logger level doesn't change

**Source:** Existing pattern in `main.ts` lines 62-63 (startLanguageServer) and 72-131 (custom handler after)

### Pitfall 2: Forgetting to update ConfigurationProvider in custom handler

**What goes wrong:** Langium's config cache desyncs from actual settings, breaking workspace/configuration requests

**Why it happens:** Overriding the default handler bypasses ConfigurationProvider.updateConfiguration() call

**How to avoid:** First line of custom handler should be:
```typescript
shared.workspace.ConfigurationProvider.updateConfiguration(change);
```

**Warning signs:**
- Custom handler works but Langium internals (validators, etc.) see stale config
- workspace/configuration requests return outdated values

**Source:** Documented in Langium issue discussions about ConfigurationProvider.updateConfiguration requirement

### Pitfall 3: Setting logger level too early (before workspace init completes)

**What goes wrong:** Violates quiet startup requirement — verbose javadoc scanning output appears on startup

**Why it happens:** Reading debug setting from initializationOptions and applying immediately

**How to avoid:**
1. Default logger to ERROR level (already done in logger.ts)
2. Apply user's debug setting AFTER workspace build completes (onBuildPhase(Validated) hook)
3. Subsequent changes via didChangeConfiguration apply immediately

**Warning signs:**
- Startup console shows verbose output even with debug=false
- User expects quiet startup but sees 50+ lines of "Loading class X..."

**Source:** Phase requirements LOG-05 and success criterion 3 ("Quiet startup mode gates verbose output until first document validation completes")

### Pitfall 4: Assuming change.settings is always populated

**What goes wrong:** Handler crashes with null reference error when some LSP clients send empty notification

**Why it happens:** LSP spec allows clients to send workspace/didChangeConfiguration as a "something changed, re-query" signal without payload

**How to avoid:**
```typescript
connection.onDidChangeConfiguration(async (change) => {
    // Always forward to ConfigurationProvider first (handles null case)
    shared.workspace.ConfigurationProvider.updateConfiguration(change);

    // Then check nullability before accessing nested properties
    const config = change.settings?.bbj;
    if (!config) {
        return;  // or: use workspace/configuration request to pull current values
    }

    // NOW safe to access config.debug, config.interop, etc.
});
```

**Warning signs:**
- Server crashes on settings change in some IDEs but not others
- Error: "Cannot read properties of null (reading 'bbj')"

**Source:** LSP 3.17 spec and vscode-languageserver-node issues about null settings

### Pitfall 5: Not handling boolean vs undefined for debug flag

**What goes wrong:** Debug setting defaults to false when user hasn't explicitly set it, but undefined !== false

**Why it happens:** VS Code settings have default values in package.json, but reading config may return undefined if user never changed it

**How to avoid:**
```typescript
const debugEnabled = config.debug === true;  // Explicit true check, undefined and false both map to false
const newLevel = debugEnabled ? LogLevel.DEBUG : LogLevel.WARN;
```

**Warning signs:**
- Debug mode doesn't activate even though user set debug=true in settings
- Logger stays at WARN level despite settings UI showing debug enabled

**Source:** TypeScript boolean coercion behavior and VS Code configuration API

## Code Examples

### Complete onDidChangeConfiguration Handler with Logger Integration

```typescript
// main.ts (server-side)

import { logger, LogLevel } from './logger.js';

// Start the language server (Langium registers default handler)
startLanguageServer(shared);

// Guard: track workspace initialization state for quiet startup
let workspaceInitialized = false;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    if (!workspaceInitialized) {
        workspaceInitialized = true;

        // Apply user's debug setting for the first time after quiet startup
        // ASSUMPTION: We can read current config via ConfigurationProvider
        // Alternative: store initializationOptions value and apply here
        // For now, default to WARN (debug off) — user can toggle in settings UI
        logger.setLevel(LogLevel.WARN);
    }
});

// Override Langium's default handler to add logger + Java interop logic
connection.onDidChangeConfiguration(async (change) => {
    // Step 1: Forward to Langium (keeps ConfigurationProvider cache in sync)
    shared.workspace.ConfigurationProvider.updateConfiguration(change);

    // Step 2: Extract bbj-specific settings (null-safe)
    const config = change.settings?.bbj;
    if (!config) {
        return;
    }

    // Step 3: Apply debug setting to logger (if present in change)
    if (config.debug !== undefined) {
        const newLevel = config.debug === true ? LogLevel.DEBUG : LogLevel.WARN;
        logger.setLevel(newLevel);
    }

    // Step 4: Skip heavy operations during initial startup
    if (!workspaceInitialized) {
        // Still apply lightweight settings
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(config.configPath || '');
        return;
    }

    // Step 5: Handle Java interop settings (existing logic)
    try {
        const javaInterop = BBj.java.JavaInteropService;
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;

        const newInteropHost = config.interop?.host || 'localhost';
        const newInteropPort = config.interop?.port || 5008;

        wsManager.setConfigPath(config.configPath || '');

        console.log('BBj settings changed, refreshing Java classes...');
        javaInterop.setConnectionConfig(newInteropHost, newInteropPort);
        javaInterop.clearCache();

        const settings = wsManager.getSettings();
        if (settings && settings.classpath.length > 0) {
            await javaInterop.loadClasspath(settings.classpath);
        }
        await javaInterop.loadImplicitImports();

        // Re-validate all open documents
        const documents = shared.workspace.LangiumDocuments.all.toArray();
        for (const doc of documents) {
            if (doc.uri.scheme === 'file') {
                doc.state = DocumentState.Parsed;
            }
        }
        const docUris = documents.filter(doc => doc.uri.scheme === 'file').map(doc => doc.uri);
        if (docUris.length > 0) {
            await shared.workspace.DocumentBuilder.update(docUris, []);
        }

        connection.window.showInformationMessage('Java classes refreshed');
    } catch (error) {
        console.error('Failed to refresh Java classes after settings change:', error);
    }
});
```

**Source:** Extended from existing pattern in `main.ts` lines 62-131

### VS Code Settings Schema for bbj.debug

```json
// package.json (client-side)
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "BBj configuration",
      "properties": {
        "bbj.debug": {
          "type": "boolean",
          "default": false,
          "description": "Enable debug logging in the BBj language server. Shows detailed diagnostics, class loading, and validation messages.",
          "scope": "window"
        }
      }
    }
  }
}
```

**Source:** Pattern from existing bbj.* settings in `package.json` lines 269-503

**Note:** Setting NOT yet present in codebase — needs to be added.

### IntelliJ Settings Pattern (LSP4IJ InitializationOptions)

```java
// BbjLanguageServerFactory.java (IntelliJ client-side)

@Override
public @NotNull LSPClientFeatures createClientFeatures() {
    return new LSPClientFeatures() {
        @Override
        public void initializeParams(@NotNull InitializeParams params) {
            super.initializeParams(params);
            BbjSettings.State state = BbjSettings.getInstance().getState();
            JsonObject options = new JsonObject();
            options.addProperty("home", state.bbjHomePath);
            options.addProperty("classpath", state.classpathEntry);
            options.addProperty("javaInteropHost",
                state.javaInteropHost != null && !state.javaInteropHost.isEmpty()
                    ? state.javaInteropHost : "localhost");
            options.addProperty("javaInteropPort", state.javaInteropPort);
            options.addProperty("configPath",
                state.configPath != null ? state.configPath : "");

            // ADD: debug setting from IntelliJ settings
            // options.addProperty("debug", state.logLevel.equals("Debug"));

            params.setInitializationOptions(options);
        }
    };
}
```

**Source:** Existing pattern in `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`

**Note:** IntelliJ currently has `logLevel` setting (Error, Warn, Info, Debug) but doesn't pass it to language server. Adding `debug` boolean to initializationOptions would enable debug mode, but changes require server restart (LSP4IJ limitation). Full hot-reload in IntelliJ requires more complex approach (not in Phase 36 scope).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Require server restart for setting changes | workspace/didChangeConfiguration hot-reload | LSP 3.0+ (2016) | Better UX — toggle debug without losing session state |
| Pass all settings via initializationOptions | Distinguish immutable (init) vs mutable (didChange) | LSP 3.6+ (workspace/configuration added) | Clearer semantics, enables server-initiated config pull |
| Manual config file parsing | IDE-managed settings with schema | Modern LSP tooling (2018+) | Type-safe, validated, UI-generated settings |
| Global log level only | Per-component scoped loggers | Logger singleton pattern with scoped() | Better signal-to-noise ratio in debug output |

**Deprecated/outdated:**
- **Restart-only configuration:** Modern LSP servers should handle didChangeConfiguration for developer experience
- **Mixing init-time and runtime settings:** Clear separation improves maintainability

## Open Questions

### 1. Should debug setting be in initializationOptions at all?

**What we know:**
- VS Code client currently passes home, classpath, typeResolutionWarnings, configPath, interopHost, interopPort via initializationOptions
- Some of these (interopHost, interopPort) are ALSO handled in didChangeConfiguration
- This creates redundancy but ensures initial value is available

**What's unclear:**
- Is it better to omit debug from initializationOptions and default to WARN until first didChangeConfiguration?
- Or include it for consistency with interop settings pattern?

**Recommendation:**
- OMIT debug from initializationOptions (reduces redundancy)
- Default logger to ERROR at startup (quiet mode)
- Apply user's setting after workspace init via either:
  - Reading from ConfigurationProvider cache in onBuildPhase(Validated) hook
  - Or waiting for first didChangeConfiguration (user must toggle to activate)

**Trade-off:** Slight delay before debug activates (user sees WARN level briefly) vs simpler code

### 2. How to handle IntelliJ hot-reload given LSP4IJ limitations?

**What we know:**
- LSP4IJ sends settings via initializeParams once at startup
- No didChangeConfiguration support observed in current integration
- BBjSettings.java has logLevel setting (Error, Warn, Info, Debug) but doesn't pass to server

**What's unclear:**
- Does LSP4IJ support workspace/didChangeConfiguration at all?
- Would require server restart to pick up debug setting changes in IntelliJ?

**Recommendation:**
- Phase 36 focuses on VS Code hot-reload (success criteria specify VS Code)
- IntelliJ enhancement is future work:
  - Option 1: Pass debug boolean via initializationOptions (works now, requires restart)
  - Option 2: Investigate LSP4IJ didChangeConfiguration support (needs research)
  - Option 3: Use custom request handler for settings refresh (non-standard)

### 3. Should quiet startup suppress ALL output or just debug/info?

**What we know:**
- Success criterion 3 says "quiet startup mode gates verbose output until first document validation completes"
- Current logger defaults to ERROR level (shows errors only)
- After workspace init, user's setting applies (WARN or DEBUG)

**What's unclear:**
- Should errors during workspace init be suppressed too?
- Or only debug/info/warn (keep errors visible)?

**Recommendation:**
- Keep ERROR level during startup (errors still visible for troubleshooting)
- Suppress WARN/INFO/DEBUG until workspace init completes
- This matches current logger default (ERROR) and provides safety net for startup failures

## Sources

### Primary (HIGH confidence)

- [Language Server Protocol Specification - 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — workspace/didChangeConfiguration and workspace/configuration protocol
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/main.ts` — Existing onDidChangeConfiguration handler pattern
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/extension.ts` — Client-side synchronize config pattern
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/package.json` — VS Code settings schema
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/logger.ts` — Logger singleton API (setLevel, LogLevel)
- `/Users/beff/_workspace/bbj-language-server/.planning/phases/35-logger-infrastructure/35-RESEARCH.md` — Logger architecture and design decisions

### Secondary (MEDIUM confidence)

- [Language Server Extension Guide | Visual Studio Code Extension API](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) — Configuration synchronization patterns
- [GitHub - redhat-developer/lsp4ij](https://github.com/redhat-developer/lsp4ij) — LSP4IJ architecture for IntelliJ
- [vscode-languageserver-node configuration.ts](https://github.com/microsoft/vscode-languageserver-node/blob/main/client/src/common/configuration.ts) — Client-side config sync implementation
- `/Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` — IntelliJ initializationOptions pattern
- `/Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` — IntelliJ settings persistence

### Tertiary (LOW confidence)

- WebSearch: "language server settings are ignored in lsp4ij" discussion — mentions didChangeConfiguration support but unclear if BBj project uses it

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All components already in use, well-documented LSP protocol
- Architecture patterns: HIGH — Existing onDidChangeConfiguration handler provides template, logger API is complete
- Pitfalls: HIGH — Based on codebase analysis and LSP spec edge cases
- IntelliJ integration: MEDIUM — LSP4IJ initialization pattern clear, but didChangeConfiguration support needs validation

**Research date:** 2026-02-08
**Valid until:** ~30 days (stable domain — LSP protocol is mature, logger implementation complete)

**Key findings:**
1. VS Code client already syncs `bbj.*` config section via `synchronize.configurationSection`
2. Server already has onDidChangeConfiguration handler for Java interop — extend for logger
3. Quiet startup pattern already exists via workspaceInitialized guard flag
4. Logger singleton is ready with setLevel() API from Phase 35
5. IntelliJ hot-reload requires investigation of LSP4IJ capabilities
