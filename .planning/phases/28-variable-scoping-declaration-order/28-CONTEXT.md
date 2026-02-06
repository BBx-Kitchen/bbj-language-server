# Phase 28: Variable Scoping & Declaration Order - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Program-scope variables respect declaration order, DIM-declared arrays are recognized by DREAD, and DECLARE type info propagates correctly throughout its scope. This phase covers scoping rules and diagnostics — not new language features or completion enhancements.

</domain>

<decisions>
## Implementation Decisions

### Declaration order enforcement
- Flag use-before-assignment for non-DECLARE variables (LET, DIM, plain assignment)
- DECLARE does NOT need to come before first use — it applies to the entire scope regardless of position
- Branching is ignored: any assignment above the current line counts as declared, even inside IF/FOR blocks
- Applies to both program scope and method scope

### DIM/DREAD array linkage
- DREAD is an assignment operation, not a read — referencing an undeclared variable in DREAD is valid (it creates the variable)
- DREAD can reference any variable, not just DIM'd arrays
- When a variable is DIM'd with subscripts (e.g., `DIM A$[10]`), DREAD referencing `A$` should link back to that DIM and pick up type/dimension info
- DREAD looks in current scope only, not parent scopes

### DECLARE type propagation
- DECLARE applies to the entire scope (whole-scope visibility) regardless of where the DECLARE statement appears
- Same behavior in both program scope and method scope
- Plain DECLARE is strict — the declared type is locked, assignments must be compatible
- DECLARE AUTO allows derived types — the type can narrow through assignments
- Multiple DECLAREs for the same variable with different types: flag as error

### Diagnostic severity & messaging
- Use-before-assignment: **Hint** severity (blue/faint)
- Conflicting DECLARE types: **Error** severity (red)
- Messages include specifics: variable name and location of the conflicting/missing declaration (e.g., "'myVar$' used before assignment (first assigned at line 42)")
- No comment-based suppression — diagnostics are always shown

### Claude's Discretion
- Exact implementation approach for tracking declaration positions
- How to integrate with existing scope provider infrastructure
- Performance optimization for scope scanning
- Error message exact wording (as long as it includes variable name and location info)

</decisions>

<specifics>
## Specific Ideas

- DREAD as assignment is a key semantic insight — it should be treated like LET/DIM for the purpose of "declaring" a variable at that point
- DECLARE vs DECLARE AUTO distinction matters for type resolution: strict vs derived types

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-variable-scoping-declaration-order*
*Context gathered: 2026-02-06*
