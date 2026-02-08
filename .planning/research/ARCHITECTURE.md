# Architecture: Debug Logging and Diagnostic Filtering Integration

**Domain:** Langium Language Server Enhancement (Output Cleanup)
**Researched:** 2026-02-08
**Confidence:** HIGH (based on existing codebase analysis and Langium LSP patterns)

## Executive Summary

This milestone adds debug logging, quiet startup, and synthetic file diagnostic suppression to an existing Langium 4.1.3 language server. The architecture leverages Langium's dependency injection system, existing settings flow via LSP `initializationOptions`, and the established diagnostic pipeline. **Key insight: All new features integrate into existing components—no new architectural layers needed.** The challenge is coordinating logging behavior across 10+ files that use `console.log/warn/error/debug` without introducing a heavyweight logging framework.

## Current Architecture (Baseline)

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
│  extension.ts → startLanguageClient() → initializationOptions │
├─────────────────────────────────────────────────────────────┤
│                    Language Server (Node.js)                 │
├─────────────────────────────────────────────────────────────┤
│  main.ts (LS Entry)                                          │
│    ↓ createConnection()                                      │
│    ↓ createBBjServices() ← DI injection                      │
│    ↓ startLanguageServer()                                   │
├─────────────────────────────────────────────────────────────┤
│  BBjWorkspaceManager (Settings)                              │
│    onInitialize → receives initializationOptions             │
│    → applies to JavaInteropService, setTypeResolutionWarnings│
├─────────────────────────────────────────────────────────────┤
│  Langium Services (via DI)                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Validator    │  │ Scope        │  │ Linker       │       │
│  │ (diagnostics)│  │ (synthetic)  │  │ (refs)       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ DocBuilder   │  │ JavaInterop  │  │ IndexMgr     │       │
│  │ (validation) │  │ (verbose)    │  │ (external)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│  Logging Landscape (Current: console.*)                      │
│    56 total usages across 10 files                           │
│    - java-interop.ts: 14 (loadClasspath, resolveClass)      │
│    - bbj-ws-manager.ts: 18 (PREFIX, settings, startup)       │
│    - bbj-scope-local.ts: 5 (scope computation)               │
│    - main.ts: 3 (settings change, errors)                    │
│    - bbj-module.ts: 1 (parser ambiguities)                   │
│    - Others: 15 (scattered debug/error)                      │
└─────────────────────────────────────────────────────────────┘
```

### Settings Flow (Current)

```
VS Code Settings (package.json "configuration")
    ↓
extension.ts: getConfiguration("bbj")
    ↓
initializationOptions object
    ↓
LSP initialize request
    ↓
BBjWorkspaceManager.onInitialize(params)
    ↓ params.initializationOptions.{field}
Applied to services:
  - setTypeResolutionWarnings(bool)
  - JavaInteropService.setConnectionConfig(host, port)
  - this.configPath = ...
```

**Current settings in `initializationOptions`:**
- `home` (BBj installation)
- `classpath` (BBj classpath name)
- `typeResolutionWarnings` (boolean)
- `configPath` (custom config.bbx path)
- `interopHost` (Java service host)
- `interopPort` (Java service port)

### Diagnostic Flow (Current)

```
Document change
    ↓
BBjDocumentBuilder.buildDocuments()
    ↓ shouldValidate() → filters JavaSyntheticDocUri, external docs
    ↓
BBjDocumentValidator.validateDocument()
    ↓ processLinkingErrors() → downgrades LinkingError to Warning (except cyclic)
    ↓
BBjValidator validation checks
    ↓ checkUsedClassExists(), checkCastTypeResolvable(), etc.
    ↓ respects typeResolutionWarningsEnabled flag
    ↓
Diagnostics published to client
```

**Key insight:** Synthetic file filtering already exists in `BBjDocumentBuilder.shouldValidate()` (line 26-29):
```typescript
if (_document.uri.toString() === JavaSyntheticDocUri) {
    _document.state = DocumentState.Validated;
    return false;
}
```

## Recommended Integration Architecture

### New Components (Minimal)

| Component | Location | Purpose | Type |
|-----------|----------|---------|------|
| **LogLevel enum** | `bbj-logging.ts` (new) | `OFF \| ERROR \| WARN \| INFO \| DEBUG` | Simple enum |
| **Logger singleton** | `bbj-logging.ts` (new) | Wraps `console.*` with level checking | 60 lines |
| **Settings extension** | `initializationOptions` | Add `logLevel`, `quietStartup` fields | Config only |

**Rationale for singleton Logger vs DI:**
- Langium services are created before settings arrive (onInitialize is async)
- Logging needs to work immediately in `main.ts` and `bbj-module.ts`
- Simple global state (current log level) is easier than threading through 10 DI services
- **Trade-off:** Singleton is less testable, but this is diagnostic infrastructure, not business logic

### Pattern: Lightweight Logger Wrapper

**What:** A module-level singleton that checks a global log level before calling `console.*`

**When to use:** When you need coordinated logging across many services without heavyweight framework overhead

**Trade-offs:**
- **Pro:** No DI changes, works immediately, easy to migrate from console.*
- **Pro:** Zero runtime overhead when logging disabled (early return)
- **Con:** Singleton state (but acceptable for infrastructure)
- **Con:** Can't easily inject different loggers per service (not needed here)

**Example:**
```typescript
// bbj-logging.ts
export enum LogLevel {
    OFF = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}

let currentLogLevel: LogLevel = LogLevel.INFO; // default

export function setLogLevel(level: LogLevel): void {
    currentLogLevel = level;
}

export const logger = {
    error: (message: string, ...args: unknown[]) => {
        if (currentLogLevel >= LogLevel.ERROR) {
            console.error(message, ...args);
        }
    },
    warn: (message: string, ...args: unknown[]) => {
        if (currentLogLevel >= LogLevel.WARN) {
            console.warn(message, ...args);
        }
    },
    info: (message: string, ...args: unknown[]) => {
        if (currentLogLevel >= LogLevel.INFO) {
            console.log(message, ...args);
        }
    },
    debug: (message: string, ...args: unknown[]) => {
        if (currentLogLevel >= LogLevel.DEBUG) {
            console.debug(message, ...args);
        }
    }
};
```

**Migration pattern:**
```typescript
// BEFORE
console.log('Loaded PREFIX from config.bbx:', prefix);
console.debug('Resolving class:', className);

// AFTER
import { logger } from './bbj-logging.js';
logger.info('Loaded PREFIX from config.bbx:', prefix);
logger.debug('Resolving class:', className);
```

### Data Flow Changes

#### 1. Settings Flow (Extended)

```
VS Code Settings (package.json)
    NEW: bbj.logging.level: "off" | "error" | "warn" | "info" | "debug"
    NEW: bbj.logging.quietStartup: boolean
    ↓
extension.ts: initializationOptions
    NEW: logLevel: string
    NEW: quietStartup: boolean
    ↓
BBjWorkspaceManager.onInitialize()
    NEW: import { setLogLevel, LogLevel } from '../bbj-logging.js'
    NEW: setLogLevel(LogLevel[params.initializationOptions.logLevel.toUpperCase()])
    NEW: if (quietStartup) setLogLevel(LogLevel.ERROR)  // temporary override
    ↓
Logger singleton updated
    ↓
All subsequent logger.* calls respect new level
```

**Quiet startup timing:**
```
Server starts → logLevel = ERROR (quietStartup overrides setting)
    ↓
onInitialize completes
    ↓
Workspace loaded
    ↓
DocumentBuilder.onBuildPhase(DocumentState.Validated) fires
    ↓ (existing hook in main.ts, line 68)
    NEW: if (quietStartup && originalLevel > ERROR) setLogLevel(originalLevel)
    ↓
Full logging restored after initial workspace validation
```

#### 2. Diagnostic Flow (No Changes to Pipeline)

The diagnostic pipeline is **unchanged**. Filtering happens earlier:

```
BBjDocumentBuilder.shouldValidate()
    EXISTING: if (uri === JavaSyntheticDocUri) return false
    EXISTING: if (isExternalDocument(uri)) return false
    NEW: (no changes—synthetic filtering already complete)
    ↓
BBjDocumentValidator.validateDocument()
    (runs normally, synthetic docs already filtered out)
```

**Key insight:** The existing `shouldValidate()` check already prevents validation of synthetic documents. The milestone requirement "suppress diagnostics for synthetic files" is already satisfied—we just need to verify it works for all synthetic URIs.

**Synthetic URI check extension:**
```typescript
// bbj-document-builder.ts shouldValidate()
protected override shouldValidate(_document: LangiumDocument<AstNode>): boolean {
    // Existing: never validate JavaSyntheticDocUri (classpath:/bbj.bbl)
    if (_document.uri.toString() === JavaSyntheticDocUri) {
        _document.state = DocumentState.Validated;
        return false;
    }
    // NEW: also skip bbjlib:/ synthetic library docs
    if (_document.uri.scheme === 'bbjlib') {
        _document.state = DocumentState.Validated;
        return false;
    }
    // Existing: external document filtering
    if (this.wsManager() instanceof BBjWorkspaceManager) {
        const validate = super.shouldValidate(_document)
            && !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(_document.uri)
        if (!validate) {
            _document.state = DocumentState.Validated;
        }
        return validate;
    }
    return super.shouldValidate(_document);
}
```

## Integration Points

### Modified Components

| Component | File | Change Type | Lines Changed |
|-----------|------|-------------|---------------|
| **Logger singleton** | `bbj-logging.ts` | NEW | +60 |
| **Settings handler** | `bbj-ws-manager.ts` | EXTEND | +15 |
| **Main entry** | `main.ts` | EXTEND | +5 (quiet startup restore) |
| **VS Code client** | `extension.ts` | EXTEND | +2 (initializationOptions) |
| **Settings schema** | `package.json` | EXTEND | +20 (configuration) |
| **Logger imports** | 10 files with console.* | MODIFY | ~56 import + call sites |
| **Doc builder** | `bbj-document-builder.ts` | VERIFY | 0 (existing check sufficient) |

### External Boundaries

| Boundary | Protocol | Notes |
|----------|----------|-------|
| **VS Code ↔ LS** | LSP initialize | `initializationOptions` extended with `logLevel`, `quietStartup` |
| **IntelliJ ↔ LS** | LSP initialize | Same `initializationOptions` (IntelliJ passes via LSP client config) |
| **Console ↔ Output** | Node.js stdio | Logger wraps `console.*`, output unchanged (still goes to Output panel) |

**IntelliJ integration:** IntelliJ LSP plugin must pass same `initializationOptions` structure. This is likely done in Kotlin LSP client configuration (exact file unknown—IntelliJ plugin structure not visible in provided context).

## Recommended Build Order

### Phase 1: Logger Infrastructure (Foundation)

**Why first:** Establish logging before migrating console.* calls

1. Create `bbj-logging.ts` with `LogLevel` enum, `setLogLevel()`, `logger` singleton
2. Add unit tests for logger (vitest)
3. Verify logger compiles and bundles correctly

**Validation:** `npm run build` succeeds, logger imports correctly

### Phase 2: Settings Plumbing (Configuration)

**Why second:** Settings must be in place before logger can be configured

1. Add `bbj.logging.level` and `bbj.logging.quietStartup` to `package.json` configuration
2. Extend `extension.ts` `initializationOptions` with `logLevel`, `quietStartup`
3. Update `bbj-ws-manager.ts` to read settings and call `setLogLevel()`
4. Add quiet startup restore logic in `main.ts` (onBuildPhase hook)

**Validation:** Settings appear in VS Code, `console.log` in `onInitialize` shows correct values

### Phase 3: Console Migration (Systematic)

**Why third:** Logger works, settings work, now replace console.* calls

**Migration checklist (56 call sites across 10 files):**

| File | console.log | console.warn | console.error | console.debug | Total |
|------|-------------|--------------|---------------|---------------|-------|
| java-interop.ts | 4 | 2 | 2 | 6 | 14 |
| bbj-ws-manager.ts | 10 | 3 | 1 | 4 | 18 |
| bbj-scope-local.ts | 0 | 1 | 1 | 3 | 5 |
| main.ts | 1 | 0 | 2 | 0 | 3 |
| bbj-module.ts | 0 | 0 | 0 | 1 | 1 |
| java-javadoc.ts | 0 | 1 | 7 | 0 | 8 |
| bbj-scope.ts | 0 | 3 | 0 | 0 | 3 |
| bbj-document-builder.ts | 1 | 1 | 0 | 0 | 2 |
| bbj-linker.ts | 0 | 0 | 1 | 0 | 1 |
| bbj-hover.ts | 0 | 0 | 1 | 0 | 1 |

**Systematic approach:**
1. Start with highest-impact files (java-interop, bbj-ws-manager)
2. Add `import { logger } from './bbj-logging.js'` to each file
3. Replace `console.log` → `logger.info`
4. Replace `console.warn` → `logger.warn`
5. Replace `console.error` → `logger.error`
6. Replace `console.debug` → `logger.debug`
7. Verify each file compiles after changes

**Special case: Parser ambiguities (bbj-module.ts line 113):**
```typescript
// BEFORE
lookaheadStrategy.logging = (message: string) => {
    if (!ambiguitiesReported) {
        ambiguitiesReported = true;
        console.debug('Parser: Ambiguous Alternatives Detected. ...');
    }
}

// AFTER
import { logger } from './bbj-logging.js';
lookaheadStrategy.logging = (message: string) => {
    if (!ambiguitiesReported) {
        ambiguitiesReported = true;
        logger.debug('Parser: Ambiguous Alternatives Detected. ...');
    }
}
```

### Phase 4: Synthetic File Verification (Minimal)

**Why last:** Diagnostic filtering already works, just verify coverage

1. Verify `JavaSyntheticDocUri` (`classpath:/bbj.bbl`) check exists (already confirmed)
2. Verify `bbjlib:/` scheme check exists in `shouldValidate()` (already confirmed at line 15 of bbj-index-manager.ts)
3. Add test case: Create document with synthetic URI, verify no diagnostics published

**Expected result:** No code changes needed, existing filtering is sufficient

### Phase 5: Integration Testing

**Why last:** Full end-to-end verification

1. Manual test: Set `bbj.logging.level` to each value, verify output
2. Manual test: Enable `bbj.logging.quietStartup`, verify silent startup then full logging
3. Manual test: Open workspace with syntax errors in synthetic files, verify no diagnostics shown
4. Manual test: Verify IntelliJ plugin respects same settings (requires IntelliJ Kotlin changes)

## Ambiguous Alternatives Investigation (Separate Feature)

**Architecture note:** This is a separate toggle from general debug logging

### Current Behavior

Parser ambiguity detection is hardcoded in `bbj-module.ts` (lines 108-116):
```typescript
const lookaheadStrategy = (parser as any).wrapper.lookaheadStrategy
if (lookaheadStrategy) {
    lookaheadStrategy.logging = (message: string) => {
        if (!ambiguitiesReported) {
            ambiguitiesReported = true;
            console.debug('Parser: Ambiguous Alternatives Detected. ...');
        }
    }
}
```

**Problem:** The original Chevrotain ambiguity messages are suppressed. The one-time warning is shown, but individual ambiguity details are lost.

### Recommended Approach

**Option A: Add setting to enable full ambiguity logging**

```typescript
// bbj-module.ts
let showAmbiguityDetails = false; // set via initializationOptions

lookaheadStrategy.logging = (message: string) => {
    if (showAmbiguityDetails) {
        logger.debug(`Parser ambiguity: ${message}`);
    } else if (!ambiguitiesReported) {
        ambiguitiesReported = true;
        logger.debug('Parser: Ambiguous Alternatives Detected. Enable ambiguity logging to see details.');
    }
}
```

**Settings:**
- `bbj.parser.showAmbiguities` (boolean, default false)
- When enabled, logs every ambiguity message (can be verbose)
- When disabled, shows one-time summary (current behavior)

**Option B: Collect and log summary at startup**

```typescript
const ambiguities: string[] = [];
lookaheadStrategy.logging = (message: string) => {
    ambiguities.push(message);
}
// After parser finalization:
if (ambiguities.length > 0) {
    logger.warn(`Parser: ${ambiguities.length} ambiguous alternatives detected`);
    if (showAmbiguityDetails) {
        ambiguities.forEach(msg => logger.debug(`  - ${msg}`));
    }
}
```

**Recommendation:** Option B (collect and summarize) is better for UX—one-time message with count, details on demand.

## Anti-Patterns

### Anti-Pattern 1: Threading Log Level Through DI

**What people do:** Add `logLevel` parameter to every service constructor, thread through DI module

**Why it's wrong:**
- Langium services are created synchronously in `createBBjServices()` before `onInitialize` receives settings
- Would require async service initialization or two-phase init (complex)
- Logger is cross-cutting concern, not business logic (singleton is acceptable)

**Do this instead:** Use module-level singleton with `setLogLevel()` called from `onInitialize`

### Anti-Pattern 2: Filtering Diagnostics in DocumentValidator

**What people do:** Add URI checks in `BBjDocumentValidator.validateDocument()` to skip synthetic files

**Why it's wrong:**
- Validation already skipped by `shouldValidate()` in `BBjDocumentBuilder`
- Adding redundant checks in validator creates two sources of truth
- Breaks separation of concerns (document builder decides what to validate, validator just validates)

**Do this instead:** Use existing `shouldValidate()` hook, extend URI scheme checks if needed

### Anti-Pattern 3: Heavyweight Logging Framework

**What people do:** Add Winston, Pino, or similar structured logging framework

**Why it's wrong:**
- Adds dependency weight (100KB+ bundle size)
- Overkill for diagnostic logging to console
- Langium LS is CLI tool, not production service (structured logs not needed)
- Migration effort multiplied (configure framework, change all call sites)

**Do this instead:** Simple logger wrapper (60 lines) around `console.*` with level checking

## Scaling Considerations

| Concern | Current State | At Scale |
|---------|---------------|----------|
| **Log volume** | ~56 log points | Use DEBUG level for verbose operations (Java class resolution, scope computation) |
| **Startup time** | Quiet startup hides logs | No performance impact—logger just skips console.* calls |
| **Diagnostic volume** | Synthetic files already filtered | No change—filtering prevents diagnostic explosion |

**Key insight:** This is output cleanup, not performance optimization. Logger overhead is negligible (one enum comparison per log call).

## IntelliJ Integration (Unknown Structure)

**Problem:** IntelliJ plugin structure not visible in provided context. No Kotlin files found.

**Required changes (best guess):**
1. IntelliJ LSP client configuration must pass `initializationOptions` with `logLevel`, `quietStartup`
2. Settings UI in IntelliJ preferences (if settings are exposed)
3. Likely in `BbjLanguageClient.kt` or similar LSP client wrapper

**Recommendation:** Search IntelliJ plugin for:
- `initializationOptions` (LSP client setup)
- `LanguageClient` or `LanguageClientCustomization` (IntelliJ LSP integration)
- Settings persistence (IntelliJ Settings UI)

## Sources

- BBj Language Server codebase analysis (main.ts, bbj-module.ts, bbj-ws-manager.ts, bbj-document-builder.ts, etc.)
- [Langium language server debug logging discussion](https://github.com/eclipse-langium/langium/discussions/376)
- [LSP specification: workspace/configuration vs initializationOptions](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [LSP workspace/didChangeConfiguration discussion](https://github.com/sst/opencode/issues/2180)

---
*Architecture research for: Debug Logging and Diagnostic Filtering Integration*
*Researched: 2026-02-08*
