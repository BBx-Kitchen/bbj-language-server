# Phase 14: Dependency Update & Grammar Regeneration - Research

**Researched:** 2026-02-03
**Domain:** npm package upgrade, Langium CLI tooling, grammar code generation
**Confidence:** HIGH

## Summary

Phase 14 establishes the new Langium 4.1.3 baseline by updating two npm packages and regenerating three generated TypeScript files. This is a prerequisite phase that creates the foundation for all subsequent source code migration work. The phase has zero hand-written source code changes — it only touches `package.json`, `package-lock.json`, and the three auto-generated files in `src/language/generated/`.

The update is straightforward: bump `langium` from ~3.2.1 to ~4.1.3 and `langium-cli` from ~3.2.0 to ~4.1.0, run `npm install`, then run `langium generate` to regenerate AST/grammar/module files. The generated code will compile, but hand-written source files will have compilation errors due to breaking API changes — those are intentionally deferred to Phase 15+.

**Primary recommendation:** Update both packages atomically, regenerate immediately, commit the generated files, then stop. Do not attempt to fix compilation errors in hand-written code during this phase.

## Standard Stack

Phase 14 is a standard npm package upgrade workflow with Langium-specific code generation.

### Core Tools
| Tool | Current Version | Target Version | Purpose |
|------|----------------|----------------|---------|
| npm | 10.2.3+ | (no change) | Package manager — use existing version |
| langium | ~3.2.1 | ~4.1.3 | Langium framework runtime — major version upgrade |
| langium-cli | ~3.2.0 | ~4.1.0 | Code generator CLI — must match runtime version |

### Dependencies to NOT Change
| Package | Version | Why Keep |
|---------|---------|----------|
| chevrotain | ~11.0.3 | Compatible with Langium 4.1.x; directly imported by `bbj-token-builder.ts` for `TokenType`/`TokenVocabulary` types that Langium does not re-export |
| typescript | ^5.8.3 | Already satisfies Langium 4's >= 5.8.0 requirement |
| All others | (no change) | Unrelated to Langium version |

**Installation:**
```bash
# From bbj-vscode/ directory
npm install langium@~4.1.3 langium-cli@~4.1.0
```

**Verification:**
```bash
# Confirm installed versions
npm list langium langium-cli

# Expected output:
# langium@4.1.3
# langium-cli@4.1.0
```

## Architecture Patterns

### Atomic Update Pattern

**What:** Update both `langium` and `langium-cli` in a single npm install command before regenerating grammar.

**When to use:** Always when upgrading Langium major versions.

**Why:** Mismatched CLI and runtime versions produce incompatible generated code. If `langium-cli@3.2.0` runs against `langium@4.1.3` runtime (or vice versa), the generated `ast.ts` exports will use patterns the runtime doesn't understand, causing cryptic compilation errors.

**Example:**
```bash
# CORRECT — atomic update
npm install langium@~4.1.3 langium-cli@~4.1.0
npx langium generate

# WRONG — staggered update (DO NOT DO THIS)
npm install langium@~4.1.3
npx langium generate  # Still using langium-cli 3.2.0 — BREAKS
npm install langium-cli@~4.1.0
```

### Regeneration-First Pattern

**What:** Regenerate grammar-derived code immediately after package update, before touching any hand-written source.

**When to use:** Any time generated code structure changes (major version upgrades, grammar modifications).

**Why:** Hand-written source files import types from `generated/ast.ts`. You cannot know what needs fixing in hand-written code until you see the new generated code structure.

**Order:**
```
1. Update package.json (langium + langium-cli versions)
2. npm install
3. langium generate
4. Inspect generated files to understand new patterns
5. Commit generated files
6. STOP — Phase 14 ends here
7. (Phase 15+: Fix hand-written source to match new generated code)
```

### Generated Files Structure

The `langium generate` command produces three files under `src/language/generated/`:

```
src/language/generated/
├── ast.ts           # AST type definitions, type guards, type constants, reflection
├── grammar.ts       # Serialized grammar JSON
└── module.ts        # DI module with AstReflection, Grammar, LanguageMetaData
```

**What changes in Langium 4:**
- `ast.ts`: Type constants restructured from `export const TypeName = 'TypeName'` to `TypeName.$type` pattern
- `ast.ts`: New property constants and richer type metadata (implementation detail)
- `grammar.ts`: Grammar JSON structure largely unchanged (minor metadata additions)
- `module.ts`: Types may reference new Langium 4 interfaces (but structure unchanged)

**Example transformation:**
```typescript
// Langium 3.x generated ast.ts
export const MethodDecl = 'MethodDecl';
export const FieldDecl = 'FieldDecl';

// Langium 4.x generated ast.ts
export const MethodDecl = {
    $type: 'MethodDecl',
    // ... additional metadata
};
export const FieldDecl = {
    $type: 'FieldDecl',
    // ... additional metadata
};
```

### Configuration File Compatibility

The existing `langium-config.json` requires no changes for Langium 4.1.x:

```json
{
    "projectName": "BBj",
    "languages": [{
        "id": "bbj",
        "grammar": "src/language/bbj.langium",
        "fileExtensions": [".bbj", ".bbl", ".bbjt"],
        "caseInsensitive": true,
        "textMate": { "out": "syntaxes/gen-bbj.tmLanguage.json" }
    }],
    "out": "src/language/generated",
    "chevrotainParserConfig": {
        "recoveryEnabled": true,
        "nodeLocationTracking": "full"
    }
}
```

**Verified:** All keys (`projectName`, `languages`, `caseInsensitive`, `chevrotainParserConfig`) remain valid in langium-cli 4.1.0.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manual AST type generation | Hand-written TypeScript interfaces matching grammar | `langium generate` | Grammar is single source of truth; regeneration ensures type safety |
| Custom grammar parser | Recursive descent parser for `.langium` files | langium-cli (Langium's own parser) | Grammar language has complex semantics (actions, predicates, cross-references) |
| Type constant management | Manually exporting `const TypeName = 'TypeName'` | Generated constants from `ast.ts` | Langium 4 structure is complex (not just strings); manual sync causes bugs |

**Key insight:** Never edit files in `src/language/generated/` — they are fully code-generated and any manual edits will be overwritten on next `langium generate`.

## Common Pitfalls

### Pitfall 1: CLI/Runtime Version Mismatch
**What goes wrong:** Running `langium generate` with mismatched CLI and runtime versions (e.g., langium-cli 3.2.0 with langium 4.1.3) produces incompatible generated code.

**Why it happens:** Developer updates one package but not the other, or runs `npx langium generate` before `npm install` completes.

**How to avoid:**
1. Update both packages in the same `npm install` command
2. Verify both versions before generating: `npm list langium langium-cli`
3. Never commit generated files from mismatched versions

**Warning signs:**
- Generated `ast.ts` imports types that don't exist in installed `langium`
- Type errors in `generated/module.ts` immediately after regeneration
- Generated code uses old constant pattern (`const TypeName = 'TypeName'`) after upgrading to 4.x

### Pitfall 2: Attempting Source Migration Too Early
**What goes wrong:** Developer tries to fix compilation errors in hand-written source files during Phase 14 (before completing regeneration and inspection).

**Why it happens:** Instinct to "fix all errors" immediately after seeing red squiggles in IDE.

**How to avoid:**
1. Understand Phase 14 scope: packages + generated code only
2. Expect hand-written source to have compilation errors — that's intentional
3. Commit generated files first, then address source errors in Phase 15+
4. Use git to separate "regenerated code" commit from "fixed source code" commits

**Warning signs:**
- Mixing regeneration and source fixes in the same commit
- Guessing at API changes without inspecting generated code
- Fixing `PrecomputedScopes` rename before completing regeneration

### Pitfall 3: Grammar Validation Failures Not Noticed
**What goes wrong:** `langium generate` produces warnings or errors about grammar syntax, but developer ignores them and proceeds with broken generated code.

**Why it happens:** Langium 4 enforces stricter grammar rules (rule naming restrictions, removed Xtext features). The BBj grammar may violate new rules even though it worked in Langium 3.

**How to avoid:**
1. Run `langium generate` from terminal (not as background npm script) to see output
2. Check for any `[ERROR]` or `[WARN]` lines in CLI output
3. If validation fails, grammar files need fixing before generated code is usable
4. The BBj grammar is known-good (no rule named `BBj`, standard syntax), but verify anyway

**Warning signs:**
- `langium generate` exits with non-zero code
- Generated `ast.ts` is missing expected type definitions
- Grammar-related error messages in CLI output

### Pitfall 4: Chevrotain Version Conflict
**What goes wrong:** npm resolves to chevrotain 11.1.1+ (Langium 4.2.0's requirement) even though package.json pins ~11.0.3, or duplicate chevrotain instances appear in `node_modules`.

**Why it happens:** The direct `chevrotain` dependency in package.json conflicts with Langium's transitive dependency. npm may choose the higher version or install both.

**How to avoid:**
1. Keep chevrotain ~11.0.3 pin unchanged (compatible with Langium 4.1.x)
2. Run `npm list chevrotain` after install to verify single instance at 11.0.3
3. If multiple versions appear, deduplicate: `npm dedupe`
4. Note: Langium 4.1.3 uses chevrotain ~11.0.x internally, so ~11.0.3 is aligned

**Warning signs:**
- Two chevrotain versions in `npm list chevrotain` output
- "Multiple chevrotain instances detected" warning from chevrotain at runtime
- Token type mismatches in custom `BBjTokenBuilder`

### Pitfall 5: Skipping Generated File Inspection
**What goes wrong:** Developer regenerates, commits, and immediately starts fixing source code without examining the new generated code patterns.

**Why it happens:** Pressure to complete migration quickly; assuming generated code changes are "just internal details."

**How to avoid:**
1. After regeneration, open `generated/ast.ts` and search for one known type (e.g., `MethodDecl`)
2. Understand the new constant structure: is it `MethodDecl.$type` or something else?
3. Check whether type guards (`isMethodDecl`) changed signature
4. Note: This inspection informs Phase 15+ work — skipping it causes rework

**Warning signs:**
- Attempting string-to-string find-and-replace (`MethodDecl` → `MethodDecl.$type`) without verifying
- Compilation errors that don't match expected patterns
- Runtime failures because new constant structure wasn't understood

## Code Examples

### Updating package.json (Tilde Range Pattern)

The project uses tilde (`~`) ranges for langium packages to allow patch updates but not minor/major:

```json
{
  "dependencies": {
    "chevrotain": "~11.0.3",
    "langium": "~4.1.3",
    "vscode-languageclient": "^9.0.1"
  },
  "devDependencies": {
    "langium-cli": "~4.1.0",
    "typescript": "^5.8.3"
  }
}
```

**Pattern:** `~X.Y.Z` allows `X.Y.Z` through `X.Y.999` but not `X.(Y+1).0`. This ensures bugfix updates (4.1.3 → 4.1.4) install automatically but feature updates (4.1.3 → 4.2.0) require explicit version bump.

**Why this matters:** Langium occasionally releases breaking changes in minor versions. Tilde range provides stability while allowing bugfixes.

### Running langium generate

```bash
# From bbj-vscode/ directory
npx langium generate

# Expected output (success case):
# Langium generator version: 4.1.0
# Processing grammar at src/language/bbj.langium
# Processing interfaces at src/language/java-types.langium
# Writing generated files to src/language/generated/
# Generation completed successfully

# Expected output (failure case):
# Langium generator version: 4.1.0
# [ERROR] Grammar validation failed:
# [ERROR] Rule BBj uses the same name as the grammar (not allowed)
# Generation failed
```

### Verifying Generated Code Changes

After regeneration, inspect the new type constant structure:

```bash
# From bbj-vscode/ directory
grep -A 3 "export const MethodDecl" src/language/generated/ast.ts
```

**Expected in Langium 3.x:**
```typescript
export const MethodDecl = 'MethodDecl';
```

**Expected in Langium 4.x:**
```typescript
export const MethodDecl = {
    $type: 'MethodDecl'
};
```

If the pattern doesn't match either, investigate further before proceeding to Phase 15.

### Checking for Chevrotain Conflicts

```bash
npm list chevrotain

# Good output (single version):
# bbj-lang@0.7.0 /path/to/bbj-vscode
# └── chevrotain@11.0.3

# Bad output (multiple versions):
# bbj-lang@0.7.0 /path/to/bbj-vscode
# ├── chevrotain@11.0.3
# └── langium@4.1.3
#     └── chevrotain@11.1.1

# Fix: npm dedupe
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Caret ranges (`^3.2.1`) | Tilde ranges (`~4.1.3`) | Project convention | More controlled updates; opt-in to minor versions |
| Type constants as strings | Type constants as objects with `.$type` | Langium 4.0.0 | Breaking change for all code using generated constants |
| `PrecomputedScopes` type | `LocalSymbols` type | Langium 4.0.0 | Breaking change for scope computation code |
| `Reference` type only | `Reference | MultiReference` | Langium 4.0.0 | Breaking change for linker/scope provider code |

**Deprecated/outdated:**
- `prepareLangiumParser` function: Likely removed in Langium 4.x (unverified — needs Phase 16 investigation)
- `DefaultServiceRegistry` singleton: Removed in Langium 4.x; use instance methods instead
- `References.findDeclaration`: Renamed to `findDeclarations` (plural) with array return

## Open Questions

None for Phase 14 — this phase is well-defined with no unresolved decisions. Open questions exist for Phase 15+ (source migration) but are out of scope here.

## Sources

### Primary (HIGH confidence)
- [langium npm registry](https://www.npmjs.com/package/langium) — Version 4.1.3 confirmed, dependency tree verified
- [langium-cli npm registry](https://www.npmjs.com/package/langium-cli) — Version 4.1.0 confirmed
- [Langium CHANGELOG](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md) — Breaking changes for 4.0.0, 4.1.0 releases
- Project research: `.planning/research/SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md` — Comprehensive Langium 4 migration research completed 2026-02-03

### Secondary (MEDIUM confidence)
- [Langium 4.0 Release Blog](https://www.typefox.io/blog/langium-release-4.0/) — Feature overview and migration guidance
- Current `bbj-vscode/package.json` — Existing version pins and dependency patterns
- Current `bbj-vscode/langium-config.json` — Verified configuration schema compatibility

### Tertiary (LOW confidence)
- None — this phase relies on official documentation and verified package versions only

## Metadata

**Confidence breakdown:**
- Package versions: HIGH — verified via npm registry 2026-02-03
- Configuration compatibility: HIGH — schema unchanged per official docs
- Generated code structure: HIGH — verified in CHANGELOG and research docs
- Workflow patterns: HIGH — standard npm + Langium CLI workflow

**Research date:** 2026-02-03
**Valid until:** 90 days (until 2026-05-04) — Langium patch releases (4.1.4+) won't affect this research; minor versions (4.2.0+) would
