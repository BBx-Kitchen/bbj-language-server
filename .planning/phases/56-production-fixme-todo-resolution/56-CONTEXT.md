# Phase 56: Production FIXME & TODO Resolution - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve or document all 4 production FIXMEs and 2 actionable TODOs in the codebase. Each marker is either fixed with a working implementation or replaced with an explanatory comment documenting why the current behavior is intentional. No ambiguous technical debt markers remain after this phase.

</domain>

<decisions>
## Implementation Decisions

### Per-item disposition

**FIX-01** (`bbj-linker.ts:74` — receiver ref FIXME): Claude's discretion. Investigate whether the eager resolution can be safely avoided, then fix or document.

**FIX-02** (`bbj-scope.ts:209` — orphaned AST HACK): Document as intentional. This is a Langium AST lifecycle quirk where nodes lose their container chain. Replace FIXME with explanation of the constraint.

**FIX-03** (`java-javadoc.ts:54` — cancellation FIXME): Document as acceptable. The javadoc loading completing despite cancellation is harmless. Replace FIXME with explanation.

**FIX-04** (`InteropService.java:166` — inner class names): Claude's discretion. The crash from #314 is already fixed. Investigate whether `Outer.Inner` → `Outer$Inner` conversion is safe in `loadClassInfo`, then fix or document.

**TODO-01** (`bbj-completion-provider.ts:132,144`): Implement both:
- Load param names from Javadoc into completion items (with types — full names + types, not just names)
- Add full method Javadoc documentation to completion item description (complete description, params, return type)

**TODO-02** (`java-interop.ts:78`): Implement. Send `window/showMessage` with Error severity to the IDE on connection failure. Include guidance about checking the Java service.

### Fix depth
- TODO-01a (param names): Full integration — show param names with types in completion label/detail. Fall back to existing names if Javadoc missing.
- TODO-01b (documentation): Full method Javadoc — complete description, params, and return type in the documentation panel.
- TODO-02 (connection error): Error-level notification via `window/showMessage`. Non-blocking but prominent.

### Documentation standard
- Replace FIXMEs with inline 1-3 line explanatory comments (no special tag prefix)
- Include GitHub issue references where applicable (e.g., #314 for FIX-04)
- After implementing TODO items, delete the TODO comment entirely — code speaks for itself

### Claude's Discretion
- FIX-01: Whether to fix or document (based on investigation of eager resolution safety)
- FIX-04: Whether to implement inner class name conversion or document as known gap (based on investigation)
- Exact wording of documentation comments for FIX-02 and FIX-03

</decisions>

<specifics>
## Specific Ideas

- FIX-04 is related to closed issue #314 (jSoup inner class USE statement crash). The crash was fixed but the FIXME about `Class.forName()` inner class name handling remains.
- TODO-02 error message should help users understand they need to check the Java service / BBjServices, not just show a generic connection error.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 56-production-fixme-todo-resolution*
*Context gathered: 2026-02-20*
