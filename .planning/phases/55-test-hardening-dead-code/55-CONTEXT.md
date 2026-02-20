# Phase 55: Test Hardening & Dead Code - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-enable 9 commented-out `expectNoValidationErrors()` assertions in `parser.test.ts` and remove confirmed dead MethodCall CAST branches from `bbj-type-inferer.ts` and `bbj-validator.ts`. Makes the test suite more complete and the codebase smaller.

</domain>

<decisions>
## Implementation Decisions

### Assertion triage strategy
- **Case-by-case investigation:** Each of the 9 assertions gets moderate investigation (~15 min) to determine if validation errors are real bugs or legitimate diagnostics
- **Fix bugs in-phase:** If enabling an assertion reveals a real validation bug AND the fix is straightforward (< 30 min), fix it in this phase. Otherwise defer.
- **Legitimate diagnostics:** Claude decides per-case whether to adjust the test input or filter specific diagnostics — whichever best preserves test intent

### Dead code removal scope
- **Full cleanup:** Remove dead method bodies, their registration calls, AND newly-unused imports/types/test code
- **Explicit import guard:** Plan MUST explicitly state which imports are safe to remove and which must be retained. Specifically: `BbjClass` import in `bbj-validator.ts` (line 11) was added by Phase 54 for `checkUsedClassExists` and MUST NOT be removed. `MethodCall` and `isLibFunction` CAN be removed after DEAD-02.
- **Verify before removing:** Grep codebase for callers/references before deleting any dead code. Belt and suspenders.
- **Abort if referenced:** If grep reveals the "dead" code is actually referenced somewhere unexpected, DO NOT remove it. Document the finding and move on.

### Failure tolerance
- **Best effort on assertions:** Enable as many of the 9 as possible. No hard minimum. Document why any remain disabled with inline comments.
- **Partial success accepted:** Test hardening is the main goal. If dead code removal (DEAD-01/02) fails verification (grep finds unexpected references), the phase still passes.
- **Test suite requirement:** `npm test` must exit 0. Skips are acceptable. No constraint on number of new skips beyond the 4 existing.
- **Documentation for disabled:** Assertions that can't be enabled stay commented out with a clear inline comment explaining why and what would need to change.

### Claude's Discretion
- How to handle each legitimate diagnostic (adjust input vs filter) — per case judgment
- Investigation depth per assertion within the moderate (~15 min) budget
- Order of operations (assertions first vs dead code first)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 55-test-hardening-dead-code*
*Context gathered: 2026-02-20*
