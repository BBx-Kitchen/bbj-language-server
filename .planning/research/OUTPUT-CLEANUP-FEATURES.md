# Feature Research

**Domain:** Language Server Output Cleanup and Debug Logging
**Researched:** 2026-02-08
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Quiet startup by default | Professional tools don't spam console with internal details | LOW | Gate verbose logs behind debug flag; standard practice across rust-analyzer, pylsp, typescript-server |
| User-facing diagnostics only | Errors/warnings users can act on, not internal synthetic file issues | MEDIUM | Filter diagnostics by URI scheme/path; publishDiagnostics should skip bbjlib:// URIs |
| Aggregated error reporting | Related errors summarized, not per-item spam | LOW | "N javadoc paths failed" instead of N separate errors |
| Log level control | Debug/Info/Warn/Error hierarchy with user override | LOW | Via initialization options or environment variable |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Conditional logging performance | Debug checks prevent string formatting overhead when disabled | LOW | `if (debugEnabled) console.debug(...)` pattern; Pino/Winston do this automatically |
| Structured logging | JSON output for machine parsing/monitoring | MEDIUM | Pino defaults to this; useful for IntelliJ/VSCode log parsing |
| LSP trace integration | Use LSP's built-in $/logTrace notification | LOW | Respects client-controlled trace level (off/messages/verbose) |
| Documentation for settings | User-facing docs explain when to enable debug logging | LOW | Docusaurus guide already planned in milestone |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-module log levels | Fine-grained control seems powerful | Overwhelming config surface; maintenance burden | Single debug flag with smart category filtering |
| Multiple output channels | Separate channels for java-interop, parser, etc. | Splits user attention; harder to correlate events | Single unified log with prefixes/categories |
| Log rotation in LS | "Production server" mindset | LS is short-lived process; client handles persistence | Let VSCode/IntelliJ manage output channel history |
| Real-time log streaming UI | "Live view" of LS internals | Adds complexity; IDEs already provide this | Use IDE's built-in LS log output window |

## Feature Dependencies

```
[Debug Flag Control]
    └──enables──> [Verbose Startup Logs]
                       ├──> [Java Class Resolution Logging]
                       ├──> [Javadoc Scanning Logging]
                       └──> [PREFIX Loading Logging]

[Diagnostic Filtering]
    └──requires──> [URI Scheme Detection]

[Smart Javadoc Reporting]
    └──requires──> [Aggregation Logic]

[Ambiguous Alternatives Handling]
    └──requires──> [Root Cause Investigation]
                       └──branches──> [Grammar Fix] OR [Suppress Warning]
```

### Dependency Notes

- **Debug Flag Control enables Verbose Startup Logs:** All verbose logging (class resolution, javadoc scanning, PREFIX loading) must check debug flag before outputting
- **Diagnostic Filtering requires URI Scheme Detection:** Must distinguish bbjlib:// (synthetic) from file:// (user code) URIs
- **Ambiguous Alternatives Handling requires Root Cause Investigation:** Cannot suppress blindly; must understand if it's a real grammar issue or false positive

## MVP Definition

### Launch With (v3.3)

Minimum viable product — what's needed to validate the concept.

- [x] Debug flag via initialization options — Enables all verbose logging gates
- [x] Quiet startup — Class resolution, classpath, PREFIX loading behind debug flag
- [x] Smart javadoc error reporting — Only report if ALL sources fail (not per-path)
- [x] Synthetic file diagnostic suppression — Filter bbjlib:// URIs from publishDiagnostics
- [x] Ambiguous Alternatives investigation — Determine if grammar fix or suppression needed
- [x] Documentation — Docusaurus guide explaining debug logging setting

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Structured logging (Pino) — When monitoring/observability becomes priority
- [ ] LSP $/logTrace integration — When standardization across clients matters
- [ ] Log level granularity — When different severity levels needed (DEBUG/INFO/WARN)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Performance logging metrics — Execution timing, bottleneck detection
- [ ] Client-side log filtering — Let VSCode/IntelliJ filter categories
- [ ] Trace export formats — OpenTelemetry, structured JSON for analysis

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Debug flag control | HIGH | LOW | P1 |
| Quiet startup | HIGH | LOW | P1 |
| Synthetic file filtering | HIGH | MEDIUM | P1 |
| Smart javadoc reporting | MEDIUM | LOW | P1 |
| Ambiguous Alternatives fix | LOW | MEDIUM | P1 |
| Documentation | MEDIUM | LOW | P1 |
| Structured logging (Pino) | LOW | MEDIUM | P2 |
| LSP $/logTrace integration | LOW | LOW | P2 |
| Performance metrics | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (v3.3)
- P2: Should have, add when possible (v3.4+)
- P3: Nice to have, future consideration (v4+)

## Implementation Details

### Debug Flag Control

**Standard practice:** Environment variable or initialization option

**Examples:**
- `RUST_LOG=debug` (rust-analyzer)
- `LANGFLOW_LOG_LEVEL=DEBUG` (Langflow)
- VSCode: `"[langId].trace.server": "verbose"` (client-controlled trace)

**BBj LS approach:**
- Add `debugLogging: boolean` to initialization options (alongside existing home/classpath)
- Default: `false` (quiet mode)
- Gate all verbose logs: `if (debugEnabled) console.log(...)`

**Complexity:** LOW — Single boolean flag, straightforward conditional checks

### Quiet Startup

**Current behavior (verbose):**
```
Initialization options received: {...}
BBj home: /path/to/bbj
Classpath from settings: ...
Type resolution warnings enabled
Loaded config.bbx from custom path: ...
Using classpath from VS Code settings: ...
Formatted for Java interop: [...]
Loading classpath with entries: [...]
Resolving class java.lang.String: 50 methods, 2 fields
Resolving class java.lang.Object: 11 methods, 0 fields
[... hundreds more ...]
JavadocProvider initialized with 15 package/-s.
Scanning directory for javadoc: /path/1
Failed to read javadoc directory /path/2: ENOENT
Failed to read javadoc directory /path/3: ENOENT
[... more failures ...]
Java Classes loaded
```

**Desired behavior (quiet):**
```
BBj Language Server initialized
```

**Gating pattern:**
- `console.log()` → `if (debugEnabled) console.log()`
- `console.warn()` → Keep warnings visible OR gate behind debug
- `console.error()` → Keep errors visible (genuine failures)
- `console.debug()` → Already implies debug-only; consistently gate these

**Files to update:**
- `bbj-ws-manager.ts` — Lines 34, 42-43, 57, 60, 86, 88, 98, 101, 115, 129-130, 134, 136, 138
- `java-interop.ts` — Lines 87, 158, 182, 200, 286
- `java-javadoc.ts` — Lines 60, 65, 74

**Complexity:** LOW — Straightforward gating with debug flag checks

### Smart Javadoc Error Reporting

**Current behavior:**
```
Failed to read javadoc directory /path/1: ENOENT
Failed to read javadoc directory /path/2: ENOENT
Failed to read javadoc directory /path/3: ENOENT
```

**Desired behavior:**
- If ANY javadoc source succeeds → Silent (user doesn't care about failures)
- If ALL sources fail → Single warning: "Javadoc not available (searched N paths)"
- If debug enabled → Log each attempt

**Implementation:**
1. Collect all attempted paths + results during initialization
2. After scanning complete, check if `this.packages.size === 0`
3. If zero AND not debug mode → Log single summary warning
4. If debug mode → Log each path attempt (existing behavior)

**Complexity:** LOW — Aggregation logic at end of `initialize()` in `java-javadoc.ts`

### Synthetic File Diagnostic Suppression

**Current behavior:**
Diagnostics from `bbjlib:///bbj-api.bbl` and `bbjlib:///functions.bbl` shown to user even though these are internal synthetic documents users cannot modify.

**Standard LSP practice:**
- Filter diagnostics before `publishDiagnostics` notification
- Check URI scheme (bbjlib:// vs file://)
- Only publish diagnostics for user-editable files

**Implementation approach:**

**Option A: Filter in DocumentValidator** (RECOMMENDED)
Override `validateDocument()` in `BBjDocumentValidator`:
```typescript
async validateDocument(document: LangiumDocument, ...): Promise<Diagnostic[]> {
    const diagnostics = await super.validateDocument(document, ...);

    // Suppress diagnostics for synthetic internal documents
    if (document.uri.scheme === 'bbjlib') {
        if (debugEnabled) {
            console.debug(`Suppressing ${diagnostics.length} diagnostics from synthetic file: ${document.uri.toString()}`);
        }
        return [];
    }

    return diagnostics;
}
```

**Option B: Filter in DocumentBuilder**
Gate diagnostic publishing at LSP notification level (lower-level intercept)

**Option C: Filter in Validator Checks**
Add URI check to each validator function (AVOID — too invasive)

**Recommendation:** Option A — Clean intercept point, minimal code change, follows existing BBjDocumentValidator pattern

**Complexity:** MEDIUM — Requires understanding Langium's validation pipeline and override points

### Ambiguous Alternatives Investigation

**Current message:**
```
Parser: Ambiguous Alternatives Detected. Enable ambiguity logging to see details.
```

**Source:** `bbj-module.ts` line 113

**Root cause analysis needed:**
1. Which grammar rules trigger the ambiguity?
2. Is this a real grammar issue or false positive?
3. Can it be fixed by refactoring grammar?
4. If unfixable, should it be suppressed?

**Chevrotain/Langium background:**
- Ambiguous alternatives = parser cannot distinguish between two alternatives
- Langium 4+ uses ALL(*) algorithm for better lookahead
- IGNORE_AMBIGUITIES flag available for false positives
- Langium discussion #781: Often solvable by merging alternatives into union types

**Investigation steps:**
1. Enable Chevrotain's detailed ambiguity logging (currently disabled)
2. Identify which grammar rules are ambiguous
3. Check if recent grammar changes (v3.0-v3.2) introduced this
4. Attempt grammar refactoring (merge alternatives, increase specificity)
5. If unfixable and harmless → Suppress via IGNORE_AMBIGUITIES

**Complexity:** MEDIUM — Requires grammar analysis and potentially grammar changes

## Existing Codebase Patterns

### Current Logging Sites (50 total)

**By category:**
- Java interop: 13 (class resolution, connection, cache)
- Workspace manager: 15 (initialization, config, classpath)
- Javadoc: 7 (scanning, loading, errors)
- Scope/linking: 7 (warnings, errors)
- Document builder: 2 (PREFIX, binary files)
- Misc: 6 (hover, parser, lexer)

**By severity:**
- `console.log()`: 18 (informational startup messages)
- `console.warn()`: 11 (recoverable issues)
- `console.error()`: 8 (genuine failures)
- `console.debug()`: 13 (already debug-scoped)

**Pattern observed:**
- No centralized logger currently
- Direct `console.*` calls throughout codebase
- Mix of useful (errors) and verbose (startup info)
- Some debug guards already exist (e.g., line 113 bbj-module.ts)

### Existing Diagnostic Filtering Pattern

**BBjDocumentValidator precedent:**
- Already customizes diagnostic severity (linking errors → warnings)
- Already adds relatedInformation for cyclic references
- Clean override point: `toDiagnostic()` and `processLinkingErrors()`
- Pattern: Check message/code/data, then transform or suppress

**Applying to synthetic files:**
- Add override for `validateDocument()` (top-level filter)
- Check `document.uri.scheme === 'bbjlib'`
- Return empty diagnostics array for synthetic files
- Preserve existing diagnostic transformations for user files

## Competitor Feature Analysis

| Feature | rust-analyzer | typescript-server | BBj LS (proposed) |
|---------|---------------|-------------------|-------------------|
| Debug logging control | RUST_LOG env var | --logLevel flag + client trace | initializationOptions.debugLogging |
| Quiet startup | Default silent | Default silent | Default silent (gated by debug flag) |
| Synthetic file filtering | Not applicable | Not applicable | URI scheme filtering (bbjlib://) |
| Javadoc error handling | N/A | N/A | Aggregate summary if all fail |
| LSP trace integration | $/logTrace notifications | $/logTrace notifications | Future (P2) |
| Structured logging | tracing crate (structured) | Custom logger | console.* (unstructured) → Pino (P2) |

**Key insights:**
- Industry standard: Silent by default, verbose on request
- LSP trace integration ($/logTrace) is best practice but not critical for v3.3
- Structured logging (Pino/Winston) is nice-to-have, not table stakes
- URI-based diagnostic filtering is BBj-specific but follows LSP semantics

## Sources

### Official LSP Specification
- [LSP 3.17 Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — TraceValue, initialization, diagnostics
- [VSCode Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) — Output channels, trace settings

### Language Server Implementations
- [rust-analyzer Diagnostics](https://rust-analyzer.github.io/book/diagnostics.html) — Diagnostic configuration, filtering patterns
- [Langium Documentation - Document Lifecycle](https://langium.org/docs/reference/document-lifecycle/) — DocumentValidator, diagnostic generation
- [Langium Discussion #781 - Ambiguous Alternatives](https://github.com/eclipse-langium/langium/discussions/781) — Parser ambiguity resolution

### Logging Best Practices
- [Pino Logger Guide](https://signoz.io/guides/pino-logger/) — Structured logging, performance, conditional execution
- [Log Levels Explained](https://betterstack.com/community/guides/logging/log-levels-explained/) — DEBUG/INFO/WARN/ERROR hierarchy
- [typescript-logging Documentation](https://github.com/vauxite-org/typescript-logging) — Conditional logging patterns

### Chevrotain Parser
- [Resolving Grammar Errors](https://chevrotain.io/docs/guide/resolving_grammar_errors.html) — Ambiguous alternatives, IGNORE_AMBIGUITIES
- [Chevrotain FAQ](https://chevrotain.io/docs/FAQ.html) — Lookahead, performance

### LSP Client Configuration
- [Neovim LSP Docs](https://neovim.io/doc/user/lsp.html) — Trace settings, diagnostic filtering
- [VSCode LSP Traffic Logging](https://medium.com/@techhara/logging-lsp-traffic-for-vscode-87239eb1589b) — Trace configuration examples

### Language Server Logging Patterns
- [VSCode Language Server console.log Discussion](https://github.com/microsoft/vscode-languageserver-node/issues/402) — console vs outputChannel vs diagnostics
- [Neovim LSP Debugging Best Practices](https://neovim.discourse.group/t/lsp-debugging-best-practices/1389) — Log levels, output routing

---
*Feature research for: BBj Language Server Output Cleanup*
*Researched: 2026-02-08*
