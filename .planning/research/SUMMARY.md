# Project Research Summary

**Project:** BBj Language Server -- Langium 3.2.1 to 4.1.3 Migration
**Domain:** Language server framework major version upgrade
**Researched:** 2026-02-03
**Confidence:** MEDIUM-HIGH

## Executive Summary

The Langium 3.2.1 to 4.1.3 upgrade is a **non-trivial but well-scoped migration** affecting roughly 12 of the project's ~38 TypeScript source files, with the bulk of effort concentrated in mechanical find-and-replace changes rather than logic rewrites. Langium 4 introduces 13 documented breaking changes, of which 6 directly impact this codebase: the `PrecomputedScopes` to `LocalSymbols` rename (scope computation), the AST type constant restructuring from `TypeName` to `TypeName.$type` (pervasive across 10+ files), the `Reference | MultiReference` union type in linker/scope APIs, the `createReferenceCompletionItem` signature expansion, the removal of deprecated APIs (most critically `prepareLangiumParser`), and the `DefaultServiceRegistry` singleton removal. The remaining 7 breaking changes either do not affect this project (grammar naming rules, EBNF terminal refinements, TypeScript version requirement) or are handled automatically by regeneration.

The recommended approach is a **strict sequential migration** starting with dependency updates and grammar regeneration to establish the new baseline, followed by systematic compilation error resolution in dependency order. The single highest-volume change is the AST type constant pattern (BC-3), which touches every file that uses generated type names in comparisons, switch statements, or object literals -- an estimated 25+ code sites across 10 files. This change carries runtime risk: if any site is missed, comparisons will silently fail because the old constant (now an object) will never equal a string. The second highest-risk item is the `prepareLangiumParser` function potentially being removed, which would require rewriting the custom parser creation logic in `bbj-module.ts`.

The DI/module system, bundling pipeline (esbuild to CJS), VS Code extension client, IntelliJ plugin consumption, and import path patterns are all **unchanged** in Langium 4 -- limiting the blast radius to the language server internals. No new Langium 4 features need to be adopted for this migration. The project's existing TypeScript 5.8.3 and chevrotain 11.0.3 dependencies are compatible with Langium 4.x and need no changes. Total estimated effort is **2-3 days** for a developer familiar with the codebase.

## Key Findings

### Recommended Stack

Only two dependency changes are required. Everything else stays the same.

**Dependencies to change:**
- `langium`: ~3.2.1 to ~4.1.3 -- latest stable with bug fixes
- `langium-cli`: ~3.2.0 to ~4.1.0 -- latest CLI, must match runtime

**Dependencies to keep unchanged:**
- `chevrotain`: ~11.0.3 -- directly imported by `bbj-token-builder.ts` for `TokenType`/`TokenVocabulary`; compatible with Langium 4's internal chevrotain 11.0.x
- `typescript`: ^5.8.3 -- already satisfies Langium 4's >= 5.8.0 requirement
- All other dependencies (vscode-languageclient, esbuild, vitest, properties-file, etc.) -- unrelated to Langium version

**Note on chevrotain version discrepancy:** PITFALLS.md references Langium 4.2.0 requiring chevrotain ~11.1.1, but the actual target is 4.1.3 (not 4.2.0). STACK.md confirms chevrotain ~11.0.3 is compatible with Langium 4.1.x. Keep the existing pin.

### Breaking Changes (Expected Features)

**Must address (compilation blockers):**
- BC-1: `PrecomputedScopes` renamed to `LocalSymbols` -- 4 type annotation sites in `bbj-scope-local.ts`, 3 property access sites in `bbj-scope.ts`
- BC-2: Scope computation method renames -- `computeExports()` may become `collectExportedSymbols()`, `computeLocalScopes()` may become `collectLocalSymbols()` (MEDIUM confidence, needs verification)
- BC-3: AST type constants `TypeName` to `TypeName.$type` -- 25+ sites across 10+ files (highest volume change)
- BC-4: `Reference | MultiReference` in linker/scope -- type narrowing needed in `bbj-linker.ts` and `bbj-scope.ts`
- BC-5: `createReferenceCompletionItem` new signature -- 1 file, 2 sites
- BC-9: Removed deprecated APIs -- `prepareLangiumParser` is critical risk

**Verify only (likely no action needed):**
- BC-6: TypeScript >= 5.8.0 -- already satisfied
- BC-7: Regeneration required -- automated via `langium generate`
- BC-8: Grammar rule naming -- already compliant
- BC-10: ServiceRegistry singleton removed -- verify `.all` still works
- BC-11: FileSystemProvider extended -- `NodeFileSystem` handles it
- BC-12: EBNF terminal refinements -- uses regex terminals, not EBNF
- BC-13: Xtext features removed -- standard grammar syntax only

### Architecture Impact

The migration is contained within the language server layer. No changes needed to:
- Entry point (`main.ts`) and DI wiring pattern (`inject`, `createDefaultModule`, `createDefaultSharedModule`)
- Import path patterns (`langium`, `langium/lsp`, `langium/node`)
- Bundling pipeline (`esbuild.mjs` -- CJS output)
- VS Code extension client (`extension.ts`)
- IntelliJ plugin consumption (runs `main.cjs` via stdio)

**Components requiring modification (ranked by effort):**

| Component | File | Primary Change | Effort |
|-----------|------|----------------|--------|
| DI Module | `bbj-module.ts` | `prepareLangiumParser` potentially removed | HIGH |
| Scope computation | `bbj-scope-local.ts` | `PrecomputedScopes` rename + type constants | MODERATE |
| Scope provider | `bbj-scope.ts` | `document.precomputedScopes` rename + type constants | MODERATE |
| Linker | `bbj-linker.ts` | `Reference \| MultiReference` + type constants | MODERATE |
| Completion provider | `bbj-completion-provider.ts` | Signature change + type constants | MODERATE |
| Validator | `bbj-validator.ts` | Type constants in `ValidationChecks` keys | LOW-MODERATE |
| 5 other files | Various | Type constant updates only | LOW each |

**Components unchanged:** `bbj-lexer.ts`, `bbj-token-builder.ts`, `bbj-value-converter.ts`, `bbj-hover.ts`, `bbj-comment-provider.ts`, `extension.ts`, `main.ts`, `java-interop.ts`, `java-javadoc.ts`

### Critical Pitfalls

1. **Silent runtime bugs from type constant changes** -- If any `case TypeName:` or `descr.type === TypeName` site is missed, comparisons silently fail (object !== string). Prevention: systematic grep sweep after regeneration, TypeScript strict checks.

2. **`prepareLangiumParser` removal** -- Used in `bbj-module.ts` to create custom parser with modified ambiguity logging. If removed, parser initialization fails entirely. Prevention: check Langium 4 exports first; prepare fallback using standard parser creation.

3. **Regeneration order mistake** -- Regenerating with old CLI against new runtime (or vice versa) produces incompatible generated code. Prevention: update both `langium` and `langium-cli` atomically, then regenerate immediately.

4. **`LocalSymbols` interface shape** -- The old `PrecomputedScopes` was `MultiMap<AstNode, AstNodeDescription>`. If `LocalSymbols` has a different interface, the `new MultiMap()` construction and `.add()`/`.get()` patterns in scope computation need adaptation.

5. **ServiceRegistry `.all` pattern** -- `bbj-ws-manager.ts` uses `services.ServiceRegistry.all.find(...)` to look up BBj services. If `.all` was removed with the singleton, this silently fails and Java interop never initializes.

## Implications for Roadmap

Based on combined research, the migration should follow a **5-phase sequential structure** driven by compilation dependencies. Each phase builds on the previous one's output.

### Phase 1: Dependency Update and Grammar Regeneration
**Rationale:** Establishes the new baseline. Generated code must exist before hand-written code can compile against it. This is a hard prerequisite for everything else.
**Delivers:** Updated `package.json`, regenerated `ast.ts`/`grammar.ts`/`module.ts`, understanding of the new type constant pattern
**Addresses:** BC-7 (regeneration), BC-8 (grammar validation), BC-12 (EBNF terminals), BC-13 (Xtext features)
**Avoids:** Pitfall 14 (regeneration order), Pitfall 15 (grammar validation)
**Effort:** ~1 hour

### Phase 2: Core API Renames and Type Constant Migration
**Rationale:** These are mechanical renames and type adjustments that must happen before the more complex signature changes. They unblock compilation of the scope and linker layers. BC-3 (type constants) is the single highest-volume task but is systematic -- grep-driven find-and-replace.
**Delivers:** Compiling scope computation (`bbj-scope-local.ts`), scope provider (`bbj-scope.ts`), and all files using type constants
**Addresses:** BC-1 (PrecomputedScopes to LocalSymbols), BC-2 (method renames), BC-3 (type constants -- 25+ sites)
**Avoids:** Pitfall 1 (silent runtime bugs from type constants), Pitfall 2 (PrecomputedScopes rename)
**Effort:** ~4-6 hours (BC-3 alone is 25+ sites across 10 files)

### Phase 3: Linker, Completion, and API Signature Updates
**Rationale:** These require understanding new API shapes, not just renaming. Depends on Phase 2's type constant fixes being complete. Contains the highest-uncertainty item (`prepareLangiumParser`).
**Delivers:** Compiling linker, completion provider, DI module, and all remaining service overrides
**Addresses:** BC-4 (Reference | MultiReference), BC-5 (completion provider signature), BC-9 (removed deprecated APIs), BC-10 (ServiceRegistry)
**Avoids:** Pitfall 3 (Reference union), Pitfall 4 (prepareLangiumParser), Pitfall 5 (completion signature), Pitfall 7 (ServiceRegistry)
**Effort:** ~2-4 hours (higher if `prepareLangiumParser` was removed and needs replacement)

### Phase 4: Build Verification and Test Suite
**Rationale:** Full compilation and test pass must succeed before manual testing. Test infrastructure (`bbj-test-module.ts`, `test-helper.ts`) may need its own fixes for synthetic AST nodes using `$type: JavaClass` and test utility imports.
**Delivers:** Green build (`tsc`), successful bundle (`esbuild`), passing test suite (`vitest`)
**Addresses:** Remaining compilation errors, test utility compatibility
**Avoids:** Pitfall 16 (test suite breakage), Pitfall 17 (esbuild bundle compatibility)
**Effort:** ~2-3 hours

### Phase 5: Integration Testing and Validation
**Rationale:** Runtime behavior must be verified in both VS Code and IntelliJ after all code changes. This catches silent regressions that TypeScript cannot detect -- especially missed type constant sites in switch statements.
**Delivers:** Confirmed zero-regression migration, release-ready build
**Tests:** Parsing, completion, go-to-definition, hover, validation, Java interop, semantic tokens, signature help
**Avoids:** Pitfall 1 (silent switch statement failures), Pitfall 10 (DocumentBuilder behavioral changes)
**Effort:** ~2 hours

### Phase Ordering Rationale

- Phases are strictly sequential because each depends on the previous phase's output
- Phase 1 (regeneration) must come first -- all subsequent phases depend on the new generated code
- BC-3 (type constants) is in Phase 2 despite being high-volume because it is mechanical and can be done systematically with grep
- BC-9 (deprecated API removal) is in Phase 3 because it may require creative solutions (especially `prepareLangiumParser`) and benefits from having the rest of the codebase closer to compiling
- Test fixes are deferred to Phase 4 because they depend on all source changes being complete
- Manual testing is last because it requires a working build

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** The `prepareLangiumParser` status is LOW confidence. Need to check Langium 4 exports immediately when starting this phase. If removed, need to find the replacement pattern -- check PR #1991 diff or Langium 4 source.
- **Phase 3:** The exact new signature for `createReferenceCompletionItem` is unknown -- check `DefaultCompletionProvider` in Langium 4.
- **Phase 2:** Whether `computeExports`/`computeLocalScopes` methods were renamed to `collectExportedSymbols`/`collectLocalSymbols` (MEDIUM confidence) -- verify against `DefaultScopeComputation` in Langium 4.
- **Phase 2:** Whether `LocalSymbols` interface supports `MultiMap` construction pattern -- verify interface definition.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Dependency update and regeneration -- well-documented, standard npm workflow
- **Phase 4:** Build and test -- standard verification, no research needed
- **Phase 5:** Manual testing -- standard smoke testing

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Version numbers verified via npm registry; dependency compatibility confirmed |
| Features (Breaking Changes) | HIGH | 11 of 13 BCs verified via official CHANGELOG; 2 need implementation-time verification |
| Architecture | MEDIUM-HIGH | Component impact analysis thorough; some internal API details (protected fields, utility types) unverified |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls well-documented; some moderate pitfalls based on inference rather than direct verification |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

These could not be resolved from research alone and need verification during implementation:

- **`prepareLangiumParser` status:** Cannot confirm whether it was removed in Langium 4. Check `require('langium').prepareLangiumParser` or Langium 4 source immediately in Phase 3. If removed, check PR #1991 for the replacement pattern.
- **`createReferenceCompletionItem` exact new parameters:** CHANGELOG confirms signature change but does not enumerate new params. Check `DefaultCompletionProvider` class definition in `node_modules/langium` after install.
- **`LocalSymbols` interface shape:** Whether it remains compatible with `MultiMap<AstNode, AstNodeDescription>` construction. Check import and interface definition after install.
- **Scope computation method renames:** Whether `computeExports`/`computeLocalScopes` became `collectExportedSymbols`/`collectLocalSymbols`. Check `DefaultScopeComputation` after install.
- **`ValidationChecks<BBjAstType>` key format:** Whether the property name keys in validation check registration are affected by the `BBjAstType` restructuring. Check generated `ast.ts` after regeneration.
- **`StreamScope` protected fields:** Whether `this.elements`, `this.outerScope`, `this.caseInsensitive` still exist on `StreamScope` in Langium 4. Compilation will reveal.
- **`ServiceRegistry.all` pattern:** Whether the `.all` property and `.find()` pattern still work after singleton removal.
- **Node.js engine requirement for 4.1.3:** PITFALLS.md mentions Node >= 20.10.0 for Langium 4.2.0. Verify whether 4.1.3 has the same requirement (current project uses Node 20.18.1 LTS, which satisfies either way).

## Consolidated Breaking Changes Reference

| ID | Breaking Change | Files | Sites | Effort | Confidence |
|----|----------------|-------|-------|--------|------------|
| BC-1 | PrecomputedScopes to LocalSymbols | 2 | 7 | MODERATE | HIGH |
| BC-2 | Scope method renames | 1 | 2 | LOW | MEDIUM |
| BC-3 | Type constants `.$type` | 10+ | 25+ | HIGH | HIGH |
| BC-4 | Reference \| MultiReference | 2 | 4 | MODERATE | HIGH |
| BC-5 | Completion provider signature | 1 | 2 | LOW | HIGH |
| BC-6 | TypeScript >= 5.8.0 | 0 | 0 | NONE | HIGH |
| BC-7 | Regeneration required | 3 | auto | LOW | HIGH |
| BC-8 | Rule naming restrictions | 0 | 0 | NONE | HIGH |
| BC-9 | Removed deprecated APIs | 2+ | 3+ | UNKNOWN | LOW-MEDIUM |
| BC-10 | ServiceRegistry changes | 1 | 2 | LOW | MEDIUM |
| BC-11 | FileSystem provider extended | 0 | 0 | NONE | HIGH |
| BC-12 | EBNF terminal refinements | 0 | 0 | NONE | HIGH |
| BC-13 | Xtext features removed | 0 | 0 | NONE | HIGH |

## Sources

### Primary (HIGH confidence)
- [Langium 4.0 Release Blog Post](https://www.typefox.io/blog/langium-release-4.0/) -- feature overview, breaking changes summary
- [Langium CHANGELOG](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md) -- definitive breaking changes list
- [langium npm](https://www.npmjs.com/package/langium) -- version 4.1.3 confirmed
- [langium-cli npm](https://www.npmjs.com/package/langium-cli) -- version 4.1.0 confirmed

### Secondary (MEDIUM confidence)
- [Langium GitHub Releases](https://github.com/langium/langium/releases) -- release-specific notes
- [Langium Documentation](https://langium.org/docs/) -- recipes and references (may lag behind 4.x)
- [Langium File-based Scoping Recipe](https://langium.org/docs/recipes/scoping/file-based/) -- uses `collectExportedSymbols` naming

### Tertiary (LOW confidence, needs validation)
- PR #1991 (removed deprecated APIs) -- not fully enumerated in CHANGELOG; `prepareLangiumParser` status unknown
- PR #1976 (completion provider) -- exact new parameter list unknown
- PR #1945 (Xtext feature removal) -- exact removed features unknown

---
*Research completed: 2026-02-03*
*Ready for roadmap: yes*
