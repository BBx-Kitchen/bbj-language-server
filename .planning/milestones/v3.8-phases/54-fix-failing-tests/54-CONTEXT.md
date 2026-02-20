# Phase 54: Fix Failing Tests - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Repair all 6 pre-existing test failures so the test suite runs fully green. This covers stale test expectations (error message format changes), missing completion behavior, missing validation diagnostics, and missing access-level enforcement. No new features — only making existing tests pass.

</domain>

<decisions>
## Implementation Decisions

### Fix vs update strategy
- Tests 1-2 (classes.test.ts): Use **substring matching** instead of exact match — change assertions to check "starts with" or "contains" so they survive future message enhancements
- Tests 3-6: **Case by case** — investigate each failure, fix the code if feasible, or `.skip` the test with a comment explaining why if the fix is too complex for a cleanup milestone
- If a fix is too complex: mark the test as `.skip` with a clear reason comment, and note it for a future milestone

### Access-level validation (Tests 5-6)
- BBj enforces access modifiers on methods: **Java-style** access model
  - **Private** = same class only
  - **Protected** = same class + subclasses (NOT directory-based)
  - **Public** = anywhere
- The validator should flag private member access from outside the defining class
- Scope: fix what the failing tests cover (private cross-file access for instance and static members)

### DEF FN completion (Test 3)
- `$` suffix on DEF FN parameters is valid but edge-case BBj syntax
- **Try to fix it** — investigate the completion provider/scope provider to make `$`-suffixed DEF FN parameters complete correctly inside class methods
- If the fix proves disproportionately complex, fall back to `.skip` with reason

### USE import validation (Test 4)
- USE is strictly for class imports: `use ::filename::classname` (BBj) or `use java.util.HashMap` (Java). Nothing else.
- If a USE references a valid file path but no classes are found: emit a **Warning** (not Error) — the file might not be fully parsed yet
- This is a real missing validation that should be implemented

### Claude's Discretion
- Exact assertion patterns for substring matching (contains vs startsWith vs regex)
- Investigation depth for each failure — how deep to dig before deciding "too complex"
- Test helper refactoring if needed to support new assertion patterns

</decisions>

<specifics>
## Specific Ideas

- Protected access is about inheritance hierarchy, not file/directory location — important distinction from some other languages
- USE validation should warn, not error, because the referenced file might contain classes that haven't been parsed yet in a multi-file workspace

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 54-fix-failing-tests*
*Context gathered: 2026-02-20*
