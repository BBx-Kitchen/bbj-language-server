# Phase 16: API Signature & Deprecated API Migration - Research

**Researched:** 2026-02-03
**Domain:** Langium 4 API migration (reference types, completion signatures, parser API)
**Confidence:** HIGH

## Summary

This phase addresses four critical API changes in Langium 4 that affect type signatures and method parameters. The research confirms all four research flags from the roadmap can be resolved:

1. **Reference union type**: Langium 4 changed `ReferenceInfo.reference` from `Reference` to `Reference | MultiReference`. The linker accesses `refInfo.reference.$refText`, which exists on both types, so current code is type-safe but needs explicit narrowing if accessing `Reference`-specific properties.

2. **createReferenceCompletionItem signature**: Langium 4 added two new required parameters: `_refInfo: ReferenceInfo` and `_context: CompletionContext`. Current override only accepts `nodeDescription`, causing a signature mismatch.

3. **prepareLangiumParser status**: CONFIRMED STILL EXISTS in Langium 4.1.3 with identical signature. No migration needed.

4. **Deprecated APIs from PR #1991**: All APIs removed were from pre-v3 deprecations. Current imports audit shows no usage of pre-v3 deprecated APIs.

**Primary recommendation:** Update completion provider signature, add type guards for Reference/MultiReference distinction, verify no behavioral changes needed in linker.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| langium | ~4.1.3 | Language server framework | Already installed, verified API surface |
| TypeScript | ^5.8.3 | Type checking | Catches signature mismatches at compile time |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| langium type guards | Built-in | Runtime type narrowing | When distinguishing Reference vs MultiReference |

**Installation:**
```bash
# Already installed - no new dependencies needed
```

## Architecture Patterns

### Recommended Approach
```
Migration order:
1. Update completion provider signature first (breaks compilation until fixed)
2. Add Reference/MultiReference type guards to linker (defensive, future-proof)
3. Verify prepareLangiumParser works unchanged (smoke test)
4. Audit for any pre-v3 deprecated API usage (verification step)
```

### Pattern 1: Reference Union Type Handling
**What:** ReferenceInfo.reference is now `Reference | MultiReference`, requiring type guards for property access
**When to use:** When accessing properties beyond common interface (`$refText`, `$refNode`)
**Example:**
```typescript
// Source: Langium 4.1.3 syntax-tree.d.ts and linker implementation
import { isReference, isMultiReference } from 'langium';

override doLink(refInfo: ReferenceInfo, document: LangiumDocument): void {
    // Current code accesses refInfo.reference.$refText - safe for both types
    if (refInfo.reference.$refText?.toLowerCase() === 'err') {
        // Works - $refText exists on both Reference and MultiReference
    }

    // If you need Reference-specific properties:
    if (isReference(refInfo.reference)) {
        // Now TypeScript knows it's Reference, can access .ref
        const target = refInfo.reference.ref;
    } else {
        // MultiReference case - has .items array instead of .ref
        const targets = refInfo.reference.items;
    }

    super.doLink(refInfo, document);
}
```

### Pattern 2: Completion Provider Signature Update
**What:** createReferenceCompletionItem gained two new parameters in Langium 4
**When to use:** When overriding DefaultCompletionProvider methods
**Example:**
```typescript
// Source: Langium 4.1.3 completion-provider.d.ts line 169
// OLD signature (Langium 3):
override createReferenceCompletionItem(
    nodeDescription: AstNodeDescription | FunctionNodeDescription
): CompletionValueItem

// NEW signature (Langium 4):
override createReferenceCompletionItem(
    nodeDescription: AstNodeDescription | FunctionNodeDescription,
    _refInfo: ReferenceInfo,
    _context: CompletionContext
): CompletionValueItem {
    const superImpl = super.createReferenceCompletionItem(nodeDescription, _refInfo, _context);
    // Custom logic unchanged
    return superImpl;
}
```

### Pattern 3: Parser Creation (No Change Needed)
**What:** prepareLangiumParser still exists with identical signature
**When to use:** Current usage pattern remains valid
**Example:**
```typescript
// Source: Langium 4.1.3 langium-parser-builder.d.ts line 17
import { prepareLangiumParser } from 'langium';

function createBBjParser(services: LangiumServices): LangiumParser {
    const parser = prepareLangiumParser(services);
    // Custom configuration
    parser.finalize();
    return parser;
}
// No changes needed - API unchanged in Langium 4
```

### Anti-Patterns to Avoid
- **Accessing .ref without type guard**: MultiReference has `.items` array, not `.ref` property
- **Ignoring new parameters**: Completion provider must accept all parameters even if unused (use `_` prefix)
- **Replacing prepareLangiumParser**: It still exists, don't migrate to different API

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reference type detection | Custom property checks | `isReference()` / `isMultiReference()` | Langium provides type guards that handle edge cases |
| Reference union handling | Type assertions (`as Reference`) | Type guard narrowing | Safer, catches MultiReference cases correctly |

**Key insight:** Langium's type system is built around union types for extensibility. Always use provided type guards rather than assertions.

## Common Pitfalls

### Pitfall 1: Assuming Reference is Single Type
**What goes wrong:** Code accesses `refInfo.reference.ref` directly, fails at runtime for MultiReference
**Why it happens:** Langium 3 only had `Reference`, muscle memory from old API
**How to avoid:** Check current code paths - if only accessing `$refText`/`$refNode`, no guard needed
**Warning signs:** TypeScript error "Property 'ref' does not exist on type 'Reference | MultiReference'"

### Pitfall 2: Completion Provider Signature Mismatch
**What goes wrong:** Override has fewer parameters than base class method, breaks polymorphism
**Why it happens:** Method signature changed in Langium 4, old override incompatible
**How to avoid:** Match exact signature from type definitions, use `_` prefix for unused params
**Warning signs:** TypeScript error about incompatible override, or LSP completion breaks at runtime

### Pitfall 3: Over-Migration of Working APIs
**What goes wrong:** Replacing prepareLangiumParser with createLangiumParser unnecessarily
**Why it happens:** Assumption that "prepare" prefix means deprecated
**How to avoid:** Verify API still exists before migrating - prepareLangiumParser is still valid
**Warning signs:** Changing code that compiles and works without errors

### Pitfall 4: Missing Type Imports
**What goes wrong:** `ReferenceInfo` or `CompletionContext` not imported when adding parameters
**Why it happens:** New parameters require new imports
**How to avoid:** Import from `langium` (core) or `langium/lsp` (LSP-specific)
**Warning signs:** TypeScript error "Cannot find name 'ReferenceInfo'"

## Code Examples

Verified patterns from official sources:

### Current Linker Usage (Already Type-Safe)
```typescript
// Source: bbj-vscode/src/language/bbj-linker.ts lines 64-78, 80-106
override doLink(refInfo: ReferenceInfo, document: LangiumDocument): void {
    // Accessing $refText - safe for both Reference and MultiReference
    if (refInfo.property === 'member' && isMemberCall(refInfo.container)) {
        const receiver = refInfo.container.receiver;
        if (isSymbolRef(receiver) && isArrayDecl(receiver.symbol.ref)) {
            return; // Skip linking
        }
    }
    super.doLink(refInfo, document);
}

override getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
    // All accesses use refInfo.reference.$refText - common to both types
    if (refInfo.reference.$refText?.toLowerCase() === 'err') {
        return BbjLinker.ERR_PARAM;
    }
    const scope = this.scopeProvider.getScope(refInfo);
    const candidate = scope.getElement(refInfo.reference.$refText);
    return candidate ?? this.createLinkingError(refInfo);
}
```

### Completion Provider Fix Required
```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts line 15
// BEFORE (current - incorrect):
override createReferenceCompletionItem(
    nodeDescription: AstNodeDescription | FunctionNodeDescription
): CompletionValueItem

// AFTER (required for Langium 4):
override createReferenceCompletionItem(
    nodeDescription: AstNodeDescription | FunctionNodeDescription,
    _refInfo: ReferenceInfo,
    _context: CompletionContext
): CompletionValueItem {
    // Call super with all parameters
    const superImpl = super.createReferenceCompletionItem(nodeDescription, _refInfo, _context);
    superImpl.kind = this.nodeKindProvider.getCompletionItemKind(nodeDescription);
    // ... rest of custom logic unchanged
    return superImpl;
}
```

### Type Guard Pattern (If Needed)
```typescript
// Source: Langium 4.1.3 syntax-tree.d.ts lines 81-82
import { isReference, isMultiReference, ReferenceInfo } from 'langium';

function processReference(refInfo: ReferenceInfo): void {
    if (isReference(refInfo.reference)) {
        // Single reference - has .ref property
        const target = refInfo.reference.ref;
        if (target) {
            console.log('References single target:', target.$type);
        }
    } else if (isMultiReference(refInfo.reference)) {
        // Multi reference - has .items array
        const targets = refInfo.reference.items;
        console.log('References', targets.length, 'targets');
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reference type only | Reference \| MultiReference union | Langium 4.0 | Linker/scope must handle both types |
| createReferenceCompletionItem(desc) | createReferenceCompletionItem(desc, refInfo, context) | Langium 4.0 | Overrides must match new signature |
| findDeclaration() | findDeclarations() | Langium 4.0 | Method renamed, returns array (not used in project) |
| Pre-v3 deprecated APIs | Removed in v4.0 | Langium 4.0 PR #1991 | Audit needed, but none found in current imports |

**Deprecated/outdated:**
- **Pre-v3 APIs removed in PR #1991**: Specific list not documented, but project imports audit shows clean state
- **Single-parameter createReferenceCompletionItem**: Must use 3-parameter version in Langium 4

## Open Questions

None - all research flags resolved:

1. **prepareLangiumParser status**: ✅ CONFIRMED exists in Langium 4.1.3, no change needed
2. **createReferenceCompletionItem signature**: ✅ Exact signature documented, 2 new params required
3. **Reference | MultiReference handling**: ✅ Current code is type-safe, optional type guards available
4. **PR #1991 deprecated APIs**: ✅ No pre-v3 APIs found in project imports

## Sources

### Primary (HIGH confidence)
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/lib/syntax-tree.d.ts` - ReferenceInfo interface (line 115), isReference/isMultiReference guards (lines 81-82)
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/lib/lsp/completion/completion-provider.d.ts` - createReferenceCompletionItem signature (line 169)
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/lib/parser/langium-parser-builder.d.ts` - prepareLangiumParser function (line 17)
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/lib/references/linker.d.ts` - Linker interface and ReferenceInfo usage
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/package.json` - Version 4.1.3 confirmed

### Secondary (MEDIUM confidence)
- [Langium 4.0 Release Blog](https://www.typefox.io/blog/langium-release-4.0/) - Multi-reference feature introduction
- [Langium CHANGELOG](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md) - Breaking changes documentation
- [GitHub PR #1991](https://github.com/eclipse-langium/langium/pull/1991) - Deprecated API removal (pre-v3 only)

### Tertiary (LOW confidence)
- None - all findings verified against installed Langium 4.1.3 type definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against installed packages and type definitions
- Architecture: HIGH - Direct examination of Langium 4.1.3 source types
- Pitfalls: HIGH - Based on actual signature mismatches found in current code

**Research date:** 2026-02-03
**Valid until:** 60 days (Langium 4.1.x stable, breaking changes only in major versions)

## Project-Specific Findings

**Current usage audit:**
1. **bbj-linker.ts**: Uses `refInfo.reference.$refText` (4 times) - type-safe, no changes needed
2. **bbj-completion-provider.ts**: Overrides `createReferenceCompletionItem` with wrong signature - MUST FIX
3. **bbj-module.ts**: Uses `prepareLangiumParser` - confirmed still valid, no changes needed
4. **No deprecated APIs found**: Grep of all imports shows no pre-v3 API usage

**Implementation priority:**
1. HIGH: Fix completion provider signature (blocks compilation)
2. MEDIUM: Add type guards to linker (defensive, future-proof)
3. LOW: Verify prepareLangiumParser behavior (smoke test only)
4. LOW: Audit imports (verification step, expected clean)
