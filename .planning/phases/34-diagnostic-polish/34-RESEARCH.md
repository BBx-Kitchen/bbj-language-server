# Phase 34: Diagnostic Polish - Research

**Researched:** 2026-02-08
**Domain:** VS Code Extension Configuration, Langium Validation, File Path Resolution
**Confidence:** HIGH

## Summary

Phase 34 addresses two independent polish items: correcting product name capitalization in VS Code settings labels and adding diagnostic errors for unresolvable file paths in USE statements.

**POL-01: Settings label capitalization** is a straightforward package.json text change. VS Code settings labels are defined in the `contributes.configuration.properties` section of package.json. Each setting has a `description` field that appears in the VS Code settings UI. Currently, line 303 contains "Auto Save upon run of bbj program" which should be "Auto Save upon run of BBj program" to match the product's official capitalization (capital B, capital B, lowercase j). The description field is user-facing text displayed in the settings panel, making this a simple string replacement with no code changes required.

**POL-02: USE statement file path validation** requires adding a new validation check for the BBjFilePath portion of USE statements. Currently, the `checkUsedClassExists` validator (bbj-validator.ts line 275) only validates Java classes in USE statements (`use java.util.List`), not BBj file paths (`use ::path/to/file.bbj::ClassName`). The BBj file path resolution logic exists in `getBBjClassesFromFile` (bbj-scope.ts line 219), which attempts to resolve paths relative to the current document and PREFIX directories but silently returns an empty scope when files don't exist. The implementation needs to check if the file path resolves to an existing file using Langium's FileSystemProvider and report an error diagnostic on the `bbjFilePath` property of the Use node when resolution fails.

**Primary recommendation:** Implement POL-01 as a single text replacement in package.json. Implement POL-02 by adding file existence checking to the USE validator, using the same path resolution logic as `getBBjClassesFromFile` but with FileSystemProvider stat() calls to check file existence before reporting diagnostics.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | 4.1.3 | Language server framework with validation infrastructure | Already the project's language server; provides ValidationAcceptor and diagnostic reporting |
| vscode-languageserver | 9.0.1 | LSP protocol types including Diagnostic | Already used for LSP communication; defines diagnostic severity and message formats |
| VS Code Extension Manifest | N/A | package.json configuration schema | Standard VS Code extension configuration; defines `contributes.configuration` structure |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:path | Built-in | File path manipulation (resolve, dirname) | Use for constructing candidate file paths from USE statements |
| Langium FileSystemProvider | 4.1.3 | Async file system access | Use readFile() wrapped in try-catch to check file existence |

### Alternatives Considered

None. Both features use existing libraries and standard LSP/VS Code patterns.

**Installation:** No new dependencies needed. All libraries are already declared in package.json.

## Architecture Patterns

### Pattern 1: VS Code Settings Description Fields

**What:** VS Code settings panel labels come from the `description` field in `contributes.configuration.properties`.

**When to use:** When defining user-facing configuration options in a VS Code extension.

**Implementation:**
```json
// Source: bbj-vscode/package.json (existing pattern)
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "BBj configuration",
      "properties": {
        "bbj.web.AutoSaveUponRun": {
          "type": "boolean",
          "default": false,
          "description": "Auto Save upon run of BBj program",  // User-facing text
          "scope": "window"
        }
      }
    }
  }
}
```

**Key insight:** The `description` field is user-facing text that appears directly in the VS Code settings panel. Case sensitivity matters for product names. Line 303 currently shows "bbj program" which should be "BBj program".

**VS Code documentation:** [Contribution Points](https://code.visualstudio.com/api/references/contribution-points) and [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest) describe the configuration schema.

### Pattern 2: Langium Validation with Property Targeting

**What:** Report diagnostics on specific AST node properties using `accept('error', message, {node, property})`.

**When to use:** When validation errors should highlight a specific portion of a statement rather than the entire statement.

**Implementation:**
```typescript
// Source: Existing pattern in bbj-validator.ts (checkUsedClassExists)
checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
    if (!typeResolutionWarningsEnabled) return;

    if (use.javaClass) {
        const className = getFQNFullname(use.javaClass);
        if(use.javaClass.pathParts.some(pp => pp.symbol.ref === undefined)) {
            accept('warning', `Class '${className}' could not be resolved. Check your classpath configuration.`, { node: use });
        }
        const errorPart = use.javaClass.pathParts.find(pp => pp.symbol.error !== undefined)
        if (errorPart) {
            accept('warning', `Error when loading ${className}: ${errorPart.symbol.error}`, { node: use, property: 'javaClass' });
        }
    }
}
```

**Key insight:** The `property` parameter in the accept call determines which portion of the AST node gets the red squiggly. For USE statements with file paths, use `property: 'bbjFilePath'` to highlight only the `::path::` portion.

**Langium documentation:** [Validation](https://langium.org/docs/learn/minilogo/validation/) and [Discussion #1692](https://github.com/eclipse-langium/langium/discussions/1692) demonstrate property-specific error reporting.

### Pattern 3: File Path Resolution with PREFIX Fallback

**What:** Resolve BBj file paths by checking multiple candidate locations: relative to current file, then PREFIX directories from config.bbx.

**When to use:** When resolving `::path::` file references in USE statements or qualified type names.

**Implementation:**
```typescript
// Source: bbj-scope.ts lines 219-236 (getBBjClassesFromFile)
private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
    const currentDocUri = AstUtils.getDocument(container).uri;
    const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
    const adjustedFileUris = [UriUtils.resolvePath(UriUtils.dirname(currentDocUri), bbjFilePath)].concat(
        prefixes.map(prefixPath => URI.file(resolve(prefixPath, bbjFilePath)))
    );
    let bbjClasses = this.indexManager.allElements(BbjClass.$type).filter(bbjClass => {
        return adjustedFileUris.some(adjustedFileUri =>
            bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase())
        );
    });
    // ... rest of logic
}
```

**Key insight:** The path resolution strategy checks (1) relative to current document, (2) each PREFIX directory in order. This same strategy should be used in the validator to determine if a file exists.

### Pattern 4: File Existence Checking with FileSystemProvider

**What:** Check if a file exists by attempting to read it with FileSystemProvider and catching errors.

**When to use:** When validation needs to verify that a referenced file path is valid.

**Implementation:**
```typescript
// Recommended approach based on Langium patterns
async checkFileExists(uri: URI): Promise<boolean> {
    try {
        await this.fileSystemProvider.readFile(uri);
        return true;
    } catch (error) {
        return false;
    }
}

// Alternative: Use stat() if available
async checkFileExists(uri: URI): Promise<boolean> {
    try {
        await this.fileSystemProvider.stat(uri);
        return true;
    } catch (error) {
        // FileSystemError.FileNotFound thrown for non-existent files
        return false;
    }
}
```

**Key insight:** Langium's FileSystemProvider interface follows VS Code's pattern where non-existent files throw errors rather than returning null/undefined. The validator needs async support, but Langium validation checks are synchronous by default. The recommended approach is to validate during the linking phase when async operations are supported, or pre-compute file existence in the document builder and cache results.

**Sources:** [Langium Builtin Libraries](https://langium.org/docs/recipes/builtin-library/), [Discussion #1450](https://github.com/eclipse-langium/langium/discussions/1450)

### Anti-Patterns to Avoid

- **Don't report errors during scope resolution:** The `getBBjClassesFromFile` method is called during linking/scoping and should remain silent about missing files. Reporting errors in scope providers can cause cascading validation issues. Instead, check file existence in the validator.
- **Don't use synchronous file I/O:** Langium's FileSystemProvider is async-only. Validation checks are synchronous, so file existence needs to be pre-computed or cached.
- **Don't validate external/imported documents:** The validator should only check USE statements in workspace documents, not in imported PREFIX files, to avoid false positives for library code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File path existence checking | Custom fs.existsSync() calls | FileSystemProvider with try-catch | Works across VS Code, web, and test environments; respects virtual file systems |
| URI path manipulation | String concatenation | UriUtils.resolvePath, UriUtils.dirname | Handles edge cases (Windows paths, URI encoding, relative paths) |
| PREFIX directory resolution | Custom config.bbx parser | workspaceManager.getSettings().prefixes | Already implemented and tested; handles config.bbx parsing complexities |

**Key insight:** File system operations must go through Langium's abstraction layer to work in all deployment environments (VS Code desktop, VS Code web, test harness with EmptyFileSystem/NodeFileSystem).

## Common Pitfalls

### Pitfall 1: Async Validation in Synchronous Context

**What goes wrong:** Trying to call async FileSystemProvider methods inside a synchronous validation check causes the check to return before file I/O completes, missing errors.

**Why it happens:** Langium validation checks registered via ValidationRegistry are synchronous by design, but FileSystemProvider methods are async.

**How to avoid:** Pre-compute file existence during document building (which is async) and cache results on the document or USE node. Alternative: Perform validation during the linking phase where async operations are supported.

**Warning signs:** Diagnostics don't appear until the document is re-opened or re-validated; intermittent validation behavior.

### Pitfall 2: Case Sensitivity Mismatches

**What goes wrong:** File existence checks fail on case-sensitive file systems (Linux) when the USE statement path casing doesn't match the actual file's casing, even though BBj itself is case-insensitive.

**Why it happens:** The current implementation uses `.toLowerCase()` for matching (bbj-scope.ts line 230), but FileSystemProvider uses exact case matching.

**How to avoid:** Use the same case-insensitive matching strategy as `getBBjClassesFromFile`. For file existence checks, try the exact path first, then attempt case-insensitive variants if needed.

**Warning signs:** Tests pass on macOS/Windows but fail on Linux; users report false errors for valid file paths.

### Pitfall 3: Reporting Errors on External Documents

**What goes wrong:** Validation errors appear on USE statements in imported library files (loaded from PREFIX directories), confusing users about whether to fix their code or the library.

**Why it happens:** The validator runs on all documents unless explicitly filtered.

**How to avoid:** Check `workspaceManager.isExternalDocument(documentUri)` before reporting errors, similar to how `addImportedBBjDocuments` filters documents (bbj-document-builder.ts line 103).

**Warning signs:** Users report errors in files they didn't write; errors in read-only library code.

### Pitfall 4: Infinite Import Depth from Bad Paths

**What goes wrong:** A USE statement with a typo causes the document builder to repeatedly attempt transitive import resolution, hitting the MAX_IMPORT_DEPTH limit.

**Why it happens:** The document builder's transitive import logic (bbj-document-builder.ts lines 88-96) processes all USE statements before checking file existence.

**How to avoid:** This is already handled by the depth guard. The validator provides user-facing feedback that the existing depth guard silently prevents.

**Warning signs:** Console warning "Maximum transitive import depth reached" appears; performance degrades with many nested USE statements.

## Code Examples

Verified patterns from codebase:

### Example 1: Validator for USE Java Class (Existing Pattern)

```typescript
// Source: bbj-validator.ts lines 275-288
checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
    if (!typeResolutionWarningsEnabled) return;

    if (use.javaClass) {
        const className = getFQNFullname(use.javaClass);
        if(use.javaClass.pathParts.some(pp => pp.symbol.ref === undefined)) {
            accept('warning', `Class '${className}' could not be resolved. Check your classpath configuration.`, { node: use });
        }
        const errorPart = use.javaClass.pathParts.find(pp => pp.symbol.error !== undefined)
        if (errorPart) {
            accept('warning', `Error when loading ${className}: ${errorPart.symbol.error}`, { node: use, property: 'javaClass' });
        }
    }
}
```

### Example 2: Extended Validator for USE BBj File Path (Recommended Implementation)

```typescript
// Extends existing checkUsedClassExists method
checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
    if (!typeResolutionWarningsEnabled) return;

    // Existing Java class validation (unchanged)
    if (use.javaClass) {
        const className = getFQNFullname(use.javaClass);
        if(use.javaClass.pathParts.some(pp => pp.symbol.ref === undefined)) {
            accept('warning', `Class '${className}' could not be resolved. Check your classpath configuration.`, { node: use });
        }
        const errorPart = use.javaClass.pathParts.find(pp => pp.symbol.error !== undefined)
        if (errorPart) {
            accept('warning', `Error when loading ${className}: ${errorPart.symbol.error}`, { node: use, property: 'javaClass' });
        }
    }

    // NEW: BBj file path validation
    if (use.bbjFilePath) {
        const match = use.bbjFilePath.match(BBjPathPattern);
        if (match) {
            const cleanPath = match[1];
            // Check if file exists using same resolution strategy as getBBjClassesFromFile
            const currentDocUri = AstUtils.getDocument(use).uri;
            const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
            const adjustedFileUris = [
                UriUtils.resolvePath(UriUtils.dirname(currentDocUri), cleanPath)
            ].concat(
                prefixes.map(prefixPath => URI.file(resolve(prefixPath, cleanPath)))
            );

            // Check if ANY of the candidate paths resolves to an existing document
            const resolved = this.indexManager.allElements(BbjClass.$type).some(bbjClass => {
                return adjustedFileUris.some(adjustedFileUri =>
                    bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase())
                );
            });

            if (!resolved) {
                accept('error', `File '${cleanPath}' could not be resolved. Check the file path and PREFIX configuration.`, {
                    node: use,
                    property: 'bbjFilePath'
                });
            }
        }
    }
}
```

**Note:** This implementation uses the index manager to check if classes exist at the resolved paths, which is synchronous and matches the existing scope resolution behavior. Alternative: Pre-compute file existence in the document builder and cache on the USE node.

### Example 3: VS Code Settings Description Text (Fix Location)

```json
// Source: bbj-vscode/package.json line 300-305
// BEFORE (incorrect):
"bbj.web.AutoSaveUponRun": {
    "type": "boolean",
    "default": false,
    "description": "Auto Save upon run of bbj program",  // ❌ lowercase "bbj"
    "scope": "window"
}

// AFTER (correct):
"bbj.web.AutoSaveUponRun": {
    "type": "boolean",
    "default": false,
    "description": "Auto Save upon run of BBj program",  // ✅ capitalized "BBj"
    "scope": "window"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Silent failures for missing USE files | Diagnostic error on file path portion | Phase 34 (new) | Users get immediate feedback about typos and missing files |
| Inconsistent product name casing | Standardized "BBj" capitalization | Phase 34 (new) | Professional appearance in settings UI |

**Deprecated/outdated:**
- N/A (no deprecated patterns apply to this phase)

## Open Questions

1. **Should BBj file path validation be an error or warning?**
   - What we know: Java class validation uses `'warning'` severity. File paths that don't resolve prevent compilation.
   - What's unclear: Whether non-existent BBj files should block development or just warn.
   - Recommendation: Use `'error'` severity to match REQ-02 specification ("flagged as error"). Java class warnings are appropriate because classpath configuration can be dynamic, but file paths are static and should be correctable immediately.

2. **Should validation check file existence or class availability?**
   - What we know: The current `getBBjClassesFromFile` checks if any BbjClass exists at the resolved path, not if the file exists.
   - What's unclear: Should the validator report an error if the file exists but contains no matching class, or only if the file doesn't exist?
   - Recommendation: Check if any BbjClass exists at the resolved paths (matching current behavior). This avoids false positives for files that parse but don't contain the expected class, and matches user intent (they want to use a class from that file).

3. **Should external/imported documents be validated?**
   - What we know: `isExternalDocument` identifies PREFIX-loaded library files. `addImportedBBjDocuments` already filters to workspace documents only.
   - What's unclear: Should USE statements in library files show errors if they reference other library files incorrectly?
   - Recommendation: Skip validation for external documents using `workspaceManager.isExternalDocument(documentUri)` check. Library maintainers should validate their own files; users shouldn't see errors in read-only library code.

## Sources

### Primary (HIGH confidence)

- **Codebase:** bbj-vscode/package.json line 303 - Current "bbj program" text needing capitalization fix
- **Codebase:** bbj-vscode/src/language/bbj-validator.ts lines 275-288 - Existing checkUsedClassExists pattern
- **Codebase:** bbj-vscode/src/language/bbj-scope.ts lines 219-236 - BBj file path resolution logic (getBBjClassesFromFile)
- **Codebase:** bbj-vscode/src/language/bbj.langium lines 303-306 - USE statement grammar showing bbjFilePath property
- **Codebase:** bbj-vscode/src/language/bbj.langium line 932 - BBjFilePath terminal definition (`/::.*::/`)
- **Codebase:** bbj-vscode/test/imports.test.ts - USE statement test patterns showing expected behavior

### Secondary (MEDIUM confidence)

- [VS Code Contribution Points](https://code.visualstudio.com/api/references/contribution-points) - Configuration contribution schema
- [VS Code Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest) - package.json structure
- [Langium Validation Tutorial](https://langium.org/docs/learn/minilogo/validation/) - ValidationAcceptor API and property targeting
- [Langium Discussion #1692](https://github.com/eclipse-langium/langium/discussions/1692) - Custom validation error messages
- [Langium Builtin Libraries](https://langium.org/docs/recipes/builtin-library/) - FileSystemProvider usage patterns
- [Langium Discussion #1450](https://github.com/eclipse-langium/langium/discussions/1450) - File operation handling

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Clear patterns from existing validator and scope provider code
- Pitfalls: HIGH - Identified from existing patterns (isExternalDocument check, case sensitivity, async/sync boundary)

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable APIs, no fast-moving dependencies)
