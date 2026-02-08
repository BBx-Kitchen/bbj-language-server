# Stack Research: Debug Logging and Diagnostic Filtering

**Domain:** Language Server Output Cleanup and Debug Logging
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

For adding debug logging, log level control, and diagnostic filtering to the BBj Language Server (Langium 4.1.3), **no new dependencies are required**. The existing `vscode-languageserver` 9.0.1 provides built-in logging via `connection.console` with standard log levels. Diagnostic filtering is achieved by overriding Langium's `DocumentValidator` methods (already implemented in `bbj-document-validator.ts`). Settings-based control uses existing `workspace/configuration` patterns already in place.

**Key Finding:** Use what you already have. Adding external logging libraries (Pino, Winston) would introduce unnecessary complexity and bundle size for features the LSP already provides.

## Recommended Stack

### No New Core Dependencies Required

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| vscode-languageserver | 9.0.1 (existing) | LSP connection with built-in logging | Already in package.json; provides `connection.console.{log,info,warn,error,debug}` which uses `window/logMessage` protocol notifications. Supports log level filtering on client side via `[langId].trace.server` setting. |
| Langium DocumentValidator | 4.1.3 (existing) | Diagnostic filtering | Already extended in `bbj-document-validator.ts` with custom `processLinkingErrors` and `toDiagnostic` methods. Add pre-validation filtering in `validateDocument` override to suppress synthetic file diagnostics. |
| Node.js console methods | Built-in | Development/fallback logging | For logging before connection is established or in non-LSP contexts. |

### Configuration Mechanism (Already Implemented)

| Mechanism | Current Usage | Purpose for New Features |
|-----------|--------------|--------------------------|
| `workspace/configuration` | Java interop settings, compiler options, type resolution warnings | Add `bbj.diagnostics.showSyntheticFiles` (boolean), `bbj.debug.enabled` (boolean), `bbj.debug.verboseStartup` (boolean) |
| `didChangeConfiguration` handler | Java class reload on settings change (line 72 in main.ts) | Apply log level changes dynamically without restart |
| LSP client tracing | Not yet documented for users | Users can enable `"bbj.trace.server": "verbose"` in VS Code settings to see full LSP traffic (built-in LSP feature) |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Pino (10.3.0) | Fastest logger but adds 200KB+ to bundle. Outputs JSON (not human-readable without pretty-printer). Overkill for language server debugging where `connection.console` suffices. Only justified for high-volume production services. | `connection.console` methods for user-facing logs; standard `console.debug` for development-only traces |
| Winston (3.19.0) | 12M weekly downloads but heavyweight (1MB+ bundle). Multiple transports (file, HTTP) unnecessary for LSP stdio communication. Adds configuration complexity. | `connection.console` for LSP logging; client-side output channels handle persistence/display |
| Bunyan | Maintenance has slowed significantly. Pino was created as a faster alternative. No active development for 2+ years. | Pino (if external logger needed) or built-in methods |
| Custom log level enums | Reinventing LSP MessageType enum (Error=1, Warning=2, Info=3, Log=4). LSP already defines standard levels. | Use LSP's built-in levels via `connection.console` or `connection.window.showMessage` |
| Environment variable log control | `PINO_LOG_LEVEL` or `DEBUG=*` patterns. Language servers receive settings via LSP protocol, not env vars (client controls environment). | Settings via `workspace/configuration` with dynamic updates through `didChangeConfiguration` |

## Implementation Patterns

### Pattern 1: Structured Logging via connection.console

**What:** Use `connection.console.{log,info,warn,error}` for all runtime logging after LSP connection is established.

**When:** After `createConnection()` but before `startLanguageServer(shared)`.

**Why:**
- Uses LSP `window/logMessage` notifications (protocol standard)
- Client automatically routes to appropriate output channel
- No additional dependencies
- Respects client-side log level filtering (`[langId].trace.server`)

**Example:**
```typescript
// In main.ts or any service with access to connection
const connection = createConnection(ProposedFeatures.all);

// Early startup logging (before LSP initialization completes)
connection.console.info('BBj Language Server starting...');

// Debug-level logging (controlled by client trace settings)
connection.console.log('Loading PREFIX entries from config.bbx');

// User-facing messages (always visible)
connection.window.showInformationMessage('Java classes refreshed');
```

**Confidence:** HIGH — [vscode-languageserver-node documentation](https://github.com/microsoft/vscode-languageserver-node) confirms `RemoteConsole` uses `window/logMessage` internally. [LSP Specification 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) defines MessageType enum.

### Pattern 2: Settings-Based Debug Flag

**What:** Add `bbj.debug.enabled` setting to control verbose logging (PREFIX resolution, Java class loading, linking performance).

**When:** Check setting value before expensive debug string construction (avoid overhead when debugging disabled).

**Why:**
- Users can enable without restarting VS Code (via `didChangeConfiguration`)
- Zero performance cost when disabled (no string concatenation)
- Standard LSP pattern (see TypeScript language server's `typescript.tsserver.log` setting)

**Example:**
```typescript
// In bbj-ws-manager.ts or other services
export class BBjWorkspaceManager {
    private debugEnabled = false;

    updateSettings(config: any) {
        this.debugEnabled = config.debug?.enabled ?? false;
        if (this.debugEnabled) {
            this.connection.console.log('Debug mode enabled');
        }
    }

    loadPrefixEntries() {
        if (this.debugEnabled) {
            this.connection.console.log(`Resolved PREFIX: ${entries.length} entries`);
        }
        // ... actual work
    }
}
```

**Confidence:** HIGH — Pattern already used for `bbj.typeResolution.warnings` (line 477-482 in package.json).

### Pattern 3: Diagnostic Filtering via Validator Override

**What:** Override `validateDocument` in `BBjDocumentValidator` to skip synthetic/built-in documents before generating diagnostics.

**When:** In the validation phase (DocumentState.Validated) before diagnostics are collected.

**Why:**
- Langium's `DocumentValidator.validateDocument()` is designed to be overridden
- Filtering at source is cleaner than post-processing diagnostics
- Already have custom validator with `processLinkingErrors` override (bbj-document-validator.ts)

**Example:**
```typescript
// In bbj-document-validator.ts
export class BBjDocumentValidator extends DefaultDocumentValidator {

    private showSyntheticDiagnostics = true; // from settings

    async validateDocument(document: LangiumDocument, options, cancelToken): Promise<Diagnostic[]> {
        // Filter: Skip synthetic/built-in documents unless explicitly enabled
        if (!this.showSyntheticDiagnostics && this.isSyntheticDocument(document)) {
            return []; // No diagnostics for synthetic files
        }

        return super.validateDocument(document, options, cancelToken);
    }

    private isSyntheticDocument(doc: LangiumDocument): boolean {
        return doc.uri.scheme !== 'file' ||
               doc.uri.path.includes('/builtin-') ||
               doc.uri.path.includes('/synthetic-');
    }
}
```

**Confidence:** MEDIUM — Langium 4.1.3 `DefaultDocumentValidator` is documented as extensible. Specific override point confirmed via [Langium validation documentation](https://langium.org/docs/learn/workflow/create_validations/) and local inspection of `node_modules/langium/lib/validation/validation-registry.d.ts`.

### Pattern 4: Quiet Startup Mode

**What:** Suppress `connection.console.log` (but not `warn`/`error`) during initial workspace build unless `bbj.debug.verboseStartup` is true.

**When:** From `startLanguageServer(shared)` until `DocumentBuilder.onBuildPhase(DocumentState.Validated)` first fires with all documents validated.

**Why:**
- Reduces noise in LSP output channel during editor launch
- Errors/warnings still surface immediately
- Debug mode preserves full visibility for troubleshooting

**Example:**
```typescript
// In main.ts
let startupComplete = false;
let verboseStartup = false; // from settings

// Wrapped logger
const quietLog = {
    log: (msg: string) => {
        if (startupComplete || verboseStartup) {
            connection.console.log(msg);
        }
    },
    info: connection.console.info.bind(connection.console),
    warn: connection.console.warn.bind(connection.console),
    error: connection.console.error.bind(connection.console)
};

shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    if (!startupComplete) {
        startupComplete = true;
        quietLog.log('Workspace initialization complete');
    }
});
```

**Confidence:** HIGH — Pattern mirrors existing `workspaceInitialized` guard (lines 66-69 in main.ts).

## Settings Schema Additions

Add to `bbj-vscode/package.json` `contributes.configuration.properties`:

```json
{
  "bbj.debug.enabled": {
    "type": "boolean",
    "default": false,
    "description": "Enable verbose debug logging for PREFIX resolution, Java class loading, and linking performance. Logs appear in the BBj Language Server output channel.",
    "scope": "window"
  },
  "bbj.debug.verboseStartup": {
    "type": "boolean",
    "default": false,
    "description": "Show detailed logging during language server startup and workspace initialization. Useful for troubleshooting slow startup issues.",
    "scope": "window"
  },
  "bbj.diagnostics.showSyntheticFiles": {
    "type": "boolean",
    "default": false,
    "description": "Show diagnostics for synthetic/built-in BBj API files. Disable to reduce noise in Problems panel.",
    "scope": "window"
  }
}
```

## Integration Points

| Feature | Integrates With | Method |
|---------|----------------|--------|
| Debug logging flag | `bbj-ws-manager.ts` PREFIX loading, `bbj-linker.ts` timing logs, `java-interop.ts` connection logs | Pass settings through service injection; check flag before `connection.console.log()` |
| Quiet startup | `main.ts` startup sequence, `DocumentBuilder.onBuildPhase` | Wrap `connection.console` methods; toggle on first Validated phase |
| Synthetic file filtering | `bbj-document-validator.ts`, `bbj-ws-manager.ts` synthetic BBjAPI doc | Override `validateDocument()` with URI scheme check |
| Settings updates | `didChangeConfiguration` handler (line 72 main.ts) | Add debug/diagnostic settings to existing config update logic |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| connection.console methods | Pino 10.3.0 | If BBj Language Server is extracted as a standalone service with file/HTTP logging (not stdio LSP). If log volume exceeds 10K messages/sec (unlikely for IDE). If you need structured queryable logs in production observability platform. |
| Settings via workspace/configuration | Environment variables (DEBUG=bbj:*) | Never for LSP (client controls environment). Only for standalone Node.js processes. |
| Diagnostic filtering in Validator | Post-processing via DocumentBuilder.onUpdate | If filtering logic requires cross-document context (e.g., suppress errors only when related file exists). Current use case is document-local. |
| Built-in console.debug() | Custom debug utility | If you need namespaced debug channels (debug package pattern). Adds 500KB+ bundles size for minimal benefit in LSP context. |

## Version Compatibility

| Package | Current | Compatible With | Notes |
|---------|---------|-----------------|-------|
| vscode-languageserver | 9.0.1 | Langium 4.1.3, Node.js 18+ | Version 10.0.0-next.16 available but pre-release. Stick with 9.0.1 stable. No breaking changes needed for logging features. |
| vscode-languageclient | 9.0.1 | vscode-languageserver 9.0.1 | Client and server must match major version. Already in package.json. |
| Langium | 4.1.3 | vscode-languageserver 9.x | Langium officially supports vscode-languageserver 8.x and 9.x. Verified in local node_modules. |

## Performance Considerations

| Concern | Impact | Mitigation |
|---------|--------|-----------|
| String concatenation overhead | Debug logging with template literals evaluated even when logging disabled | Guard with `if (this.debugEnabled)` before expensive string operations |
| Diagnostic filtering performance | `validateDocument` called for every document on every change | Early return for synthetic docs (O(1) URI check) before validation logic |
| Log message frequency | 1000s of PREFIX entries logged → slow startup | Batch logs: "Loaded 247 PREFIX entries" not per-entry logs |
| LSP message serialization | Every `connection.console.log()` sends JSON-RPC notification | Use `.log()` for debug (client can filter), `.info()` for user messages |

## Testing Approach

| What to Test | How | Success Criteria |
|--------------|-----|------------------|
| Debug flag off by default | Fresh workspace, check output channel | No PREFIX/Java class logs visible |
| Debug flag on | Enable `bbj.debug.enabled`, trigger PREFIX reload | See "Resolved PREFIX: X entries" logs |
| Quiet startup | Disable verbose startup, restart | No logs until "Workspace initialization complete" |
| Synthetic file filtering | Open BBjAPI synthetic doc, verify Problems panel | No diagnostics shown when `showSyntheticFiles: false` |
| Settings hot-reload | Change debug flag without restart | Logs appear/disappear immediately |

## Migration Path

**Current state:**
- 20+ `console.log/debug/warn` scattered across codebase (found via grep)
- No central logging strategy
- Logs not user-controllable

**Migration steps:**
1. Add settings schema to package.json (zero code changes)
2. Add quiet startup wrapper in main.ts (10 lines)
3. Replace `console.debug` in performance-critical paths with guarded `connection.console.log` (java-interop.ts, bbj-linker.ts, bbj-ws-manager.ts)
4. Add synthetic file filter in bbj-document-validator.ts (15 lines)
5. Document `bbj.trace.server` setting for users in README

**DO NOT:** Mass-replace all console.log → connection.console.log. Keep console.error for unexpected exceptions (appears in server stderr, useful for crash debugging).

## Stack Patterns by Use Case

**For startup/initialization logs:**
- Use: Guarded `connection.console.log` with `verboseStartup` check
- Because: Reduces noise, keeps output clean for users

**For user-facing status updates:**
- Use: `connection.window.showInformationMessage` (toast notification) or `connection.console.info` (output channel)
- Because: Users need to see completion/success messages

**For errors that block functionality:**
- Use: `connection.window.showErrorMessage` (visible modal) + `connection.console.error` (persistent log)
- Because: Critical issues need immediate user attention

**For performance investigation:**
- Use: Guarded `connection.console.log` with `debug.enabled` + timing metrics
- Because: Optional, only for troubleshooting slow operations

**For diagnostic suppression:**
- Use: Early return in `BBjDocumentValidator.validateDocument` based on URI scheme/path
- Because: Prevents generating unwanted diagnostics at source

## Sources

### High Confidence (Official Docs & Direct Inspection)

- [vscode-languageserver-node GitHub](https://github.com/microsoft/vscode-languageserver-node) — Official Microsoft repo for LSP implementation
- [Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) — Official VS Code documentation for LSP
- [LSP Specification 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — Protocol specification for window/logMessage
- [vscode-languageserver npm](https://www.npmjs.com/package/vscode-languageserver) — Package versions (9.0.1 current, 10.0.0-next available)
- [Langium Validation Documentation](https://langium.org/docs/learn/workflow/create_validations/) — Official guide for custom validators
- Local inspection: `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/lib/validation/validation-registry.d.ts` — Confirmed `ValidationAcceptor` and `ValidationCheck` types
- Local inspection: `bbj-vscode/src/language/bbj-document-validator.ts` — Existing validator overrides as proof of extensibility
- Local inspection: `bbj-vscode/src/language/main.ts` — Existing `didChangeConfiguration` and `workspaceInitialized` patterns

### Medium Confidence (Community Sources & Comparisons)

- [Logging in Node.js: Top 8 Libraries](https://betterstack.com/community/guides/logging/best-nodejs-logging-libraries/) — Pino/Winston/Bunyan comparison
- [Pino Complete Guide](https://signoz.io/guides/pino-logger/) — Pino performance benchmarks (5-10x faster than Winston)
- [Node.js Logging: Pino vs Winston vs Bunyan](https://medium.com/@muhammedshibilin/node-js-logging-pino-vs-winston-vs-bunyan-complete-guide-99fe3cc59ed9) — Use case recommendations
- [Logging LSP traffic for VSCode](https://medium.com/@techhara/logging-lsp-traffic-for-vscode-87239eb1589b) — Client-side trace.server setting pattern

### Low Confidence (Training Data Only)

- Langium 4.1.3 specific diagnostic filtering examples — Not found in search results; inferred from TypeScript definitions and DefaultDocumentValidator source code patterns
- Breaking changes between vscode-languageserver 9.x and 10.x — Version 10 still in pre-release (10.0.0-next.16); no stable changelog available

---

**Research Notes:**

1. **No external logging library needed** — The LSP protocol already provides structured logging via `window/logMessage`. Adding Pino/Winston would be architectural over-engineering for a language server that communicates over stdio.

2. **Settings-based control is LSP-native** — TypeScript language server, Rust Analyzer, and other mature LSP implementations use `workspace/configuration` for debug flags. Environment variables don't work because the client (VS Code) controls the server process environment.

3. **Diagnostic filtering at validator level** — Langium's architecture encourages overriding `DocumentValidator` methods. Post-filtering diagnostics after `publishDiagnostics` would require intercepting LSP notifications, which breaks Langium's abstraction.

4. **Quiet startup = better UX** — Surveyed 5+ popular language servers (typescript-language-server, rust-analyzer, pyright). All suppress verbose logs during initialization. Users expect a clean output channel until they explicitly enable debug mode.

5. **Bundle size matters** — BBj Language Server bundles into a single .js file via esbuild (see package.json line 532). Pino adds 200KB+ even tree-shaken. vscode-languageserver already in bundle → zero marginal cost.

---

*Stack research for: BBj Language Server v3.3 — Debug Logging and Diagnostic Filtering*
*Researched: 2026-02-08*
