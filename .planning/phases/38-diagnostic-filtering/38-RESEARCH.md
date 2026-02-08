# Phase 38: Diagnostic Filtering - Research

**Researched:** 2026-02-08
**Domain:** LSP diagnostic filtering and error aggregation
**Confidence:** HIGH

## Summary

Phase 38 is primarily a **verification phase**, not an implementation phase. The existing `shouldValidate()` implementation in `BBjDocumentBuilder` already handles synthetic file diagnostic suppression. Research confirms:

1. **Synthetic file filtering is already implemented** via `shouldValidate()` which prevents validation from running on `JavaSyntheticDocUri` (classpath:/bbj.bbl) and external documents
2. **URI scheme coverage is incomplete** - `shouldValidate()` checks for exact URI match and `isExternalDocument()` but NOT for the `bbjlib:/` scheme used by synthetic library files (functions.bbl, variables.bbl, labels.bbl, events.bbl, bbj-api.bbl)
3. **Javadoc error reporting needs aggregation** - currently uses `console.error()` for each failed source, resulting in diagnostic spam when multiple javadoc directories fail

The phase requires minimal code changes: adding `bbjlib:/` scheme check to `shouldValidate()` and implementing single-error aggregation for javadoc loading failures.

**Primary recommendation:** Verify existing `shouldValidate()` coverage with unit tests, add `bbjlib:/` scheme check, implement javadoc error aggregation with silent partial success pattern.

## Standard Stack

### Core Validation Infrastructure
| Component | Location | Purpose | Current State |
|-----------|----------|---------|---------------|
| `shouldValidate()` | bbj-document-builder.ts:26-42 | Filters documents before validation runs | EXISTING - needs bbjlib:/ check |
| `BBjIndexManager.isAffected()` | bbj-index-manager.ts:14-28 | Prevents synthetic doc rebuilds | EXISTING - already checks bbjlib:/ |
| `BBjWorkspaceManager.isExternalDocument()` | bbj-ws-manager.ts:185-195 | Identifies PREFIX-loaded docs | EXISTING - works correctly |
| Logger | logger.ts | Structured logging (Phase 37) | EXISTING - ready to use |

### Diagnostic Pipeline (Langium)
| Component | Role | When It Runs |
|-----------|------|--------------|
| Lexer | Tokenization errors | Parse phase |
| Parser | Syntax errors | Parse phase |
| Linker | Reference resolution errors | Link phase |
| Validator | Custom semantic validations | Validate phase |
| `shouldValidate()` | **Gatekeeper** - prevents validate phase | Before validation |

**Key insight:** `shouldValidate()` returns `false` to skip validation entirely (performance optimization), NOT to filter diagnostics post-validation. This is the correct approach for synthetic files.

### Synthetic File URI Schemes

| Scheme | Files | Current Coverage |
|--------|-------|------------------|
| `classpath:/` | bbj.bbl (Java interop classes) | COVERED - exact URI check |
| `bbjlib:/` | functions.bbl, variables.bbl, labels.bbl, events.bbl, bbj-api.bbl | **GAP** - not checked |
| `file:` with PREFIX | External BBj files loaded from PREFIX dirs | COVERED - isExternalDocument() |

**Installation:** No packages needed - verification only.

## Architecture Patterns

### Pattern 1: Synthetic File Validation Suppression

**What:** Override `shouldValidate()` to return `false` for programmatically-generated documents that should never show user-facing diagnostics.

**When to use:** For files that are:
- Generated from external data (Java classpath, builtin definitions)
- Not user-editable
- Used only for cross-reference resolution

**Example:**
```typescript
// Source: bbj-document-builder.ts:26-42 (existing implementation)
protected override shouldValidate(_document: LangiumDocument<AstNode>): boolean {
    if (_document.uri.toString() === JavaSyntheticDocUri) {
        // never validate programmatically created classpath document
        _document.state = DocumentState.Validated;
        return false;
    }
    if (this.wsManager() instanceof BBjWorkspaceManager) {
        const validate = super.shouldValidate(_document)
            && !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(_document.uri)
        if (!validate) {
            // mark as validated to avoid rebuilding
            _document.state = DocumentState.Validated;
        }
        return validate;
    }
    return super.shouldValidate(_document);
}
```

**Required addition:**
```typescript
// Add URI scheme check for bbjlib:/ synthetic files
if (_document.uri.scheme === 'bbjlib') {
    _document.state = DocumentState.Validated;
    return false;
}
```

### Pattern 2: Error Aggregation with Partial Success

**What:** When loading resources from multiple sources, show single summary error only if ALL sources fail, show nothing if ANY source succeeds.

**When to use:**
- Multiple fallback locations (javadoc dirs: workspace, BBj installation)
- Partial success is acceptable (one javadoc source is enough)
- Verbose per-source errors create noise

**Example:**
```typescript
// Pseudocode for javadoc initialization aggregation
async initialize(roots: URI[], fsAccess: FileSystemProvider) {
    let anySuccess = false;
    const failedRoots: string[] = [];

    for (const root of roots) {
        try {
            await this.fsAccess.readDirectory(root);
            // Load javadoc files...
            anySuccess = true;
        } catch (e) {
            failedRoots.push(root.toString());
            logger.debug(`Failed to read javadoc directory ${root.toString()}: ${e}`);
        }
    }

    if (!anySuccess && failedRoots.length > 0) {
        logger.warn(`Javadoc initialization failed: no sources accessible. Tried: ${failedRoots.join(', ')}`);
    }

    this.initialized = true;
    logger.info(`JavadocProvider initialized with ${this.packages.size} packages.`);
}
```

### Pattern 3: URI Scheme-Based Filtering

**What:** Use `document.uri.scheme` to identify synthetic document types rather than hardcoded URI string matching.

**When to use:**
- Multiple synthetic files sharing a common scheme
- Cleaner than maintaining list of exact URI strings
- Aligns with existing `BBjIndexManager.isAffected()` pattern

**Example:**
```typescript
// Source: bbj-index-manager.ts:15 (existing pattern)
if (document.uri.scheme === 'bbjlib') {
    // only affected by ClassPath changes
    return false;
}
```

### Anti-Patterns to Avoid

- **Don't filter by diagnostic severity in `shouldValidate()`:** This method should prevent validation from running (performance), not filter results (UX). Severity filtering belongs in diagnostic publication.
- **Don't suppress console.error():** Per Phase 37 decisions, error output must always be visible. Convert javadoc `console.error()` to `logger.error()` but don't suppress it based on debug flags.
- **Don't add URI scheme checks to multiple locations:** Centralize in `shouldValidate()` rather than duplicating in validator, indexer, etc.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diagnostic filtering infrastructure | Custom diagnostic suppression pipeline | Langium's `shouldValidate()` override | Already integrated with document lifecycle, sets state correctly |
| Error aggregation for multiple sources | Custom promise accumulator | Standard try/catch with counters | Simpler, easier to debug, matches existing javadoc pattern |
| URI scheme validation | String prefix matching | `URI.scheme` property | Type-safe, standard Langium/VSCode pattern |

**Key insight:** This phase requires minimal code because Langium's architecture already provides the right hooks. Don't add complexity where framework patterns suffice.

## Common Pitfalls

### Pitfall 1: Incomplete Synthetic URI Coverage

**What goes wrong:** `shouldValidate()` checks for `JavaSyntheticDocUri` exact match but misses `bbjlib:/` scheme, resulting in validation running on synthetic library files and emitting false-positive diagnostics.

**Why it happens:** `JavaSyntheticDocUri` was added first (Phase 16), `bbjlib:/` scheme added later (Phase 19), coverage gap never detected because synthetic files are well-formed.

**How to avoid:** Check BOTH exact URI match (for backward compatibility) AND scheme-based matching (for URI families).

**Warning signs:**
- Diagnostics appearing on "functions.bbl" or "variables.bbl" in problems panel
- Validation running on files user cannot open/edit
- Performance slowdown from validating large synthetic files

**Detection:**
```typescript
// Add test case to verify shouldValidate() returns false
test('shouldValidate returns false for bbjlib:// synthetic files', async () => {
    const doc = documentFactory.fromString(
        'some content',
        URI.parse('bbjlib:///functions.bbl')
    );
    expect(documentBuilder.shouldValidate(doc)).toBe(false);
});
```

### Pitfall 2: Diagnostic Spam from Multi-Source Loading

**What goes wrong:** Javadoc loading tries multiple directories (workspace/javadoc, BBj installation/documentation/javadoc) and calls `console.error()` for EACH failed source, creating noise when javadoc is simply not available.

**Why it happens:** Current implementation (java-javadoc.ts:58, 160) logs errors immediately rather than aggregating failures.

**How to avoid:** Accumulate failures, report ONLY if all sources fail, use logger.warn() not console.error(), include tried paths.

**Warning signs:**
- Console spam: "Failed to read javadoc directory file:///workspace/javadoc: ENOENT"
- Multiple identical error messages with different paths
- Users reporting "errors" that don't affect functionality

**Detection:** Load project without javadoc directories, observe console output.

### Pitfall 3: Filtering Parser Errors from Synthetic Files

**What goes wrong:** Adding diagnostic severity filtering to `shouldValidate()` suppresses parser/lexer errors from synthetic files, masking grammar bugs and generation issues.

**Why it happens:** Confusion between "skip validation for performance" (shouldValidate) vs "hide warnings for UX" (diagnostic filtering).

**How to avoid:** Keep `shouldValidate()` as binary gate (validate or don't), never add post-validation filtering for synthetic files. If synthetic files have parser errors, that's a BUG in generation logic.

**Warning signs:**
- Synthetic file generation produces malformed BBj code
- Parser crashes not visible in logs
- Cross-reference failures with no diagnostic explanation

**Prevention:** Phase 37 decision explicitly states "Never suppress console.error()" and "Filter by severity not file type" - synthetic files should NEVER have errors, so suppression is wrong approach.

### Pitfall 4: Testing Validation Suppression Without State Check

**What goes wrong:** Test verifies `shouldValidate()` returns `false` but doesn't verify `document.state` is set to `DocumentState.Validated`, causing infinite rebuild loops.

**Why it happens:** `shouldValidate()` must set state AND return false; tests that only check return value miss half the contract.

**How to avoid:** Test BOTH return value and state change.

**Example:**
```typescript
test('shouldValidate sets document state to Validated', async () => {
    const doc = documentFactory.fromString('', URI.parse('bbjlib:///test.bbl'));
    const result = documentBuilder.shouldValidate(doc);
    expect(result).toBe(false);
    expect(doc.state).toBe(DocumentState.Validated); // Critical check
});
```

## Code Examples

Verified patterns from existing codebase:

### Synthetic File Detection (Existing - Needs Extension)

```typescript
// Source: bbj-document-builder.ts:26-42
protected override shouldValidate(_document: LangiumDocument<AstNode>): boolean {
    // Exact URI check for classpath synthetic doc
    if (_document.uri.toString() === JavaSyntheticDocUri) {
        // never validate programmatically created classpath document
        _document.state = DocumentState.Validated;
        return false;
    }

    // MISSING: Scheme-based check for bbjlib:/ family
    // if (_document.uri.scheme === 'bbjlib') {
    //     _document.state = DocumentState.Validated;
    //     return false;
    // }

    if (this.wsManager() instanceof BBjWorkspaceManager) {
        const validate = super.shouldValidate(_document)
            && !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(_document.uri)
        if (!validate) {
            // mark as validated to avoid rebuilding
            _document.state = DocumentState.Validated;
        }
        return validate;
    }
    return super.shouldValidate(_document);
}
```

### Javadoc Error Aggregation (Requires Implementation)

```typescript
// Source: java-javadoc.ts:44-76 (current implementation with per-source errors)
// CURRENT (problematic):
for (const root of roots.filter(uri => uri.scheme === 'file')) {
    try {
        nodes = await this.fsAccess.readDirectory(root)
    } catch (e) {
        logger.debug(`Failed to read javadoc directory ${root.toString()}: ${e}`);
        continue; // Silent continue, but also has console.error in loadJavadocFile
    }
}

// SHOULD BE (aggregated):
const failedRoots: string[] = [];
let successCount = 0;

for (const root of roots.filter(uri => uri.scheme === 'file')) {
    try {
        nodes = await this.fsAccess.readDirectory(root);
        // ... load files ...
        successCount++;
    } catch (e) {
        failedRoots.push(root.toString());
        logger.debug(`Failed to read javadoc directory ${root.toString()}: ${e}`);
    }
}

// Only warn if ALL sources failed
if (successCount === 0 && failedRoots.length > 0) {
    logger.warn(`Javadoc initialization failed: no sources accessible. Tried: ${failedRoots.join(', ')}`);
}

this.initialized = true;
logger.info(`JavadocProvider initialized with ${this.packages.size} packages from ${successCount} source(s).`);
```

### Console.error Replacement

```typescript
// Source: java-javadoc.ts:154, 160 (existing console.error calls)
// CURRENT:
try {
    const doc = JSON.parse(await this.readFile(packageDocURI)) as PackageDoc;
    if (doc.name !== packageName) {
        console.error(`Failed to load javadoc file, package name '${doc.name}' does not match file name ${packageDocURI.toString()}`);
        return null;
    }
} catch (e) {
    console.error(`Failed to load javadoc file ${packageDocURI.toString()}: ${e}`);
}

// SHOULD BE:
try {
    const doc = JSON.parse(await this.readFile(packageDocURI)) as PackageDoc;
    if (doc.name !== packageName) {
        logger.error(`Failed to load javadoc file, package name '${doc.name}' does not match file name ${packageDocURI.toString()}`);
        return null;
    }
} catch (e) {
    logger.error(`Failed to load javadoc file ${packageDocURI.toString()}: ${e}`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Validate all documents | shouldValidate() gatekeeper | Langium 1.0+ | Performance - skip validation for synthetic/external docs |
| Per-source error logging | Error aggregation with partial success | Emerging pattern (2024-2026) | UX - reduce noise, report only actionable failures |
| Hardcoded URI strings | URI scheme-based filtering | VSCode LSP best practice | Maintainability - handle URI families not instances |
| console.* calls everywhere | Structured logger | Phase 37 (just completed) | Debuggability - log level control, structured output |

**Deprecated/outdated:**
- Direct `console.error()` calls in production code (replaced by logger in Phase 37)
- Validating external/synthetic documents (performance cost, no user benefit)

## Open Questions

1. **Should javadoc loading failure be warning or info?**
   - What we know: Current code uses `console.error()` which is too severe for "optional feature not available"
   - What's unclear: Is missing javadoc documentation a warning-level issue (user should know) or info-level (silent degradation)?
   - Recommendation: Use `logger.warn()` with aggregation - javadoc is optional but valuable, user should be informed if completely unavailable

2. **Should we verify PREFIX-loaded document filtering works correctly?**
   - What we know: `isExternalDocument()` checks PREFIX paths, `shouldValidate()` uses it
   - What's unclear: Does this need explicit test coverage, or is verification from Phase 34 sufficient?
   - Recommendation: Add single integration test for PREFIX document non-validation, leverage existing test infrastructure

3. **Is there a performance benefit to NOT setting DocumentState.Validated for skipped docs?**
   - What we know: Current code always sets state when returning false from `shouldValidate()`
   - What's unclear: Langium internals - does setting state trigger any lifecycle hooks?
   - Recommendation: Keep existing pattern (set state) - documented in Langium as preventing rebuild loops

## Sources

### Primary (HIGH confidence)
- bbj-vscode/src/language/bbj-document-builder.ts - existing shouldValidate() implementation
- bbj-vscode/src/language/bbj-index-manager.ts - existing bbjlib:/ scheme check
- bbj-vscode/src/language/java-javadoc.ts - current error handling pattern
- bbj-vscode/src/language/bbj-ws-manager.ts - synthetic file URIs (bbjlib:/ scheme usage)
- .planning/STATE.md - Phase 37 decisions on console.error() and diagnostic filtering

### Secondary (MEDIUM confidence)
- [Langium Document Lifecycle](https://langium.org/docs/reference/document-lifecycle/) - validation phase overview
- [LSP Specification 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) - diagnostic structure and metadata
- [Neovim LSP Diagnostics](https://neovim.io/doc/user/diagnostic.html) - aggregation mechanisms and severity-based filtering patterns

### Tertiary (LOW confidence - general context)
- [Testing DSLs in Langium](https://dev.to/diverse_research/testing-your-dsls-in-langium-gp9) - DocumentBuilder testing patterns
- [VSCode Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) - diagnostic best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against existing codebase, all components identified and located
- Architecture: HIGH - patterns extracted from working code, well-documented in source
- Pitfalls: HIGH - identified from code review and prior phase debugging (PREFIX reconciliation)

**Research date:** 2026-02-08
**Valid until:** 60 days (stable domain - LSP/Langium core patterns change slowly)

**Key finding:** This is a **verification phase with minimal changes**. Existing architecture is 90% correct; gaps are:
1. Missing `bbjlib:/` scheme check in `shouldValidate()` (one if-block)
2. Missing javadoc error aggregation (refactor of existing try/catch)
3. Two console.error() calls not yet migrated to logger

Expected code change: <30 lines, expected test coverage: 3-4 test cases.
