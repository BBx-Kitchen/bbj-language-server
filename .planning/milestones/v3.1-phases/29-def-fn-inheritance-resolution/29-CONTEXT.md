# Phase 29: DEF FN & Inheritance Resolution - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

DEF FN definitions inside class methods work without false errors and with correct parameter scoping. Super class fields and inherited Java methods resolve through the inheritance chain. This phase covers DEF FN validation/scoping and member resolution through inheritance — not new completion features or new language constructs.

</domain>

<decisions>
## Implementation Decisions

### DEF FN scoping rules
- DEF FN parameters are scoped to the FN body only — they do NOT leak into the enclosing method
- Variables assigned inside DEF FN body are local to the FN — they do NOT leak into the enclosing scope
- Enclosing method variables (including DECLARE'd ones) ARE visible inside the DEF FN body (closure-like)
- No DEF FN nesting — DEF FN cannot appear inside another DEF FN
- DEF FN can appear anywhere a statement is valid (not restricted to program/method top level)

### DEF FN line-break validation
- The specific bug: single-line `def fnName(params)=expression` inside a class method produces false "needs to end with a line break" errors
- The line-break validator treats `def` and `fnName(...)=expr` as two separate statements
- Fix must recognize `DEF FN...` as a single statement inside methods
- The issue only manifests inside method bodies — program-scope DEF FN already works correctly
- Multi-line DEF FN already works correctly — only single-line form is broken

### Inheritance chain traversal
- Walk the full inheritance chain: current class → parent → grandparent → ... until found or chain ends
- Methods: resolve through both BBj super classes AND Java super classes (via java-interop reflection)
- Fields (`#field!`): resolve through BBj super classes only — Java classes don't have BBj-style FIELD declarations
- Maximum depth: cap at 20 levels to prevent infinite loops (cyclic inheritance detection is Phase 30)
- `#super!.method()` should resolve through Java super class if the BBj class extends a Java class

### Error behavior for unresolved members
- Unresolved `#field!` (not found in current class or any BBj super): **Error** severity (red)
- Unresolved `#method()` (not found in BBj or Java inheritance chain): **Error** severity (red)
- Error messages should show the chain searched: e.g., "#field! not found in MyClass, BBjWidget, BBjControl"
- When super class itself can't be resolved (e.g., USE file not found): show BOTH the "super class not found" error AND "field/method not found" errors — don't suppress cascading diagnostics

### Claude's Discretion
- Exact approach for fixing the line-break validator for DEF FN in methods
- How to implement inheritance chain walking (recursive vs iterative, caching)
- Integration with existing scope provider for DEF FN parameter scoping
- Performance optimization for deep inheritance chains
- Exact error message wording (as long as it includes the chain searched)

</decisions>

<specifics>
## Specific Ideas

- The exact false error output for DEF FN in methods: `def` gets "This statement needs to end with a line break" and `fnstr_pos(...)=...` gets "This statement needs to start in a new line" — the validator splits them into two statements
- Example of working single-line DEF FN: `def fnstr_pos(tmp0$,tmp1$,tmp0)=int((pos(tmp0$=tmp1$,tmp0)+tmp0-1)/tmp0)`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-def-fn-inheritance-resolution*
*Context gathered: 2026-02-07*
