# Phase 25: Type Resolution & Crash Fixes - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix type conveyance so CAST(), super class fields, implicit getters, and DECLARE all correctly provide type information for downstream completion. Fix USE statement crash on Java inner classes. This phase does NOT add new completion features — it makes existing type infrastructure work correctly.

Requirements: TYPE-01, TYPE-02, TYPE-03, TYPE-04, STAB-01

</domain>

<decisions>
## Implementation Decisions

### Type resolution fallback behavior
- When CAST() references an unresolvable type: show warning diagnostic, treat result as untyped (no completion offered)
- DECLARE type is authoritative — if variable is reassigned to incompatible type, DECLARE wins for type resolution purposes
- Implicit getter with unresolvable return type: no completion offered on the result (only complete when type is confidently resolved)
- DECLARE applies to entire method scope regardless of position in the method body (not position-sensitive)

### Super class field resolution
- Traverse the full inheritance chain with no depth limit — walk up to Object, including Java supers
- `#field!` access on inherited fields resolves silently without warning
- Hover/tooltip on inherited fields should say "inherited from ParentClass" as helpful info
- If a class extends an unresolvable type, each `#field!` access gets a warning explaining why resolution is incomplete
- `#` completion inside a class includes inherited fields from super classes (own + inherited)

### Diagnostic messaging
- Type resolution failures (CAST to unknown type, unresolvable DECLARE type) use Warning severity (yellow squiggly)
- Squiggly underline appears on the whole statement (CAST() or DECLARE), not just the type name
- Include actionable suggestions where possible (e.g., "Did you mean BBjString?" or "Add USE statement for X")
- Add a workspace setting to disable type resolution warnings entirely (for heavily dynamic codebases)

### USE crash recovery
- Warning diagnostic on the specific USE line that couldn't be resolved
- Each USE statement is independent — one failure doesn't block others from processing
- Attempt to resolve Java inner classes using classpath JARs (not just graceful skip)
- Inner class lookup scope: classpath JARs only (not workspace Java sources)

### Claude's Discretion
- Exact implementation of inner class resolution via JAR inspection
- How to integrate DECLARE scope into existing scoping infrastructure
- Performance considerations for full inheritance chain traversal
- Warning message wording and diagnostic codes

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-type-resolution-crash-fixes*
*Context gathered: 2026-02-06*
