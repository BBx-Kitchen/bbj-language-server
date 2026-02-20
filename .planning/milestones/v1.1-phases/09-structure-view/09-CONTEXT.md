# Phase 9: Structure View - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore and verify the Structure tool window for BBj files via LSP DocumentSymbol. The language server already provides DocumentSymbol responses (Langium default + custom BBjNodeKindProvider). LSP4IJ v0.19.0 maps this to IntelliJ's Structure View automatically. No new feature code needed — this is a regression fix and verification phase.

</domain>

<decisions>
## Implementation Decisions

### Approach
- Structure View was working during v1.0 development but broke unnoticed toward the end
- This is a **verify and fix** task, not a new implementation
- LSP4IJ handles the Structure View mapping automatically — no custom StructureViewProvider needed
- The language server's DocumentSymbol provider (via Langium defaults + BBjNodeKindProvider) is the source of truth

### Symbol coverage
- Current BBjNodeKindProvider maps: MethodDecl/LibFunction → Function, BbjClass → Class, ArrayDecl → Array, LibEventType → Event, JavaPackage → Package, everything else → Field
- Hierarchy: top-level symbols (variables, classes, labels, functions) with class children (fields, methods)
- Coverage is adequate — no additional constructs requested

### Claude's Discretion
- Root cause investigation of the regression
- Any fixes needed to restore functionality
- Whether the regression is in the language server, plugin configuration, or LSP4IJ integration
- Testing approach to verify restoration

</decisions>

<specifics>
## Specific Ideas

- Was working during v1.0 development, so the regression is likely a configuration change, dependency update, or side effect from later phases
- Check if any plugin.xml changes, LSP4IJ version updates, or language server modifications broke the symbol provider

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-structure-view*
*Context gathered: 2026-02-02*
