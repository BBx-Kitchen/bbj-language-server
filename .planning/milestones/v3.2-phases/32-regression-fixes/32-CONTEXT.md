# Phase 32: Regression Fixes - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore two capabilities that broke during v3.1: BBjAPI() class resolution (type inference + completion) and USE statement Ctrl-click navigation (go-to-definition via PREFIX paths). No new features — purely restoring pre-regression behavior.

</domain>

<decisions>
## Implementation Decisions

### BBjAPI() resolution
- Treat BBjAPI() as a special built-in call — hardcode recognition so it always resolves to BBjAPI type
- Does NOT depend on Java interop service availability — always resolves regardless of service status
- Show all methods from BBjAPI class in completions (no filtering or prioritization)
- Only BBjAPI() itself needs special built-in treatment — chained calls like .getConfig() resolve through normal return-type inference

### USE navigation
- Ctrl-click on class name in USE statement should navigate to the .bbj file AND jump to the specific class declaration line
- Only supports BBj classes in the `USE ::filename.bbj::ClassName` format — not Java classes
- Only the full form with both filename and classname — short form `USE ::ClassName` not in scope
- If the .bbj file can't be found via PREFIX paths, show an info message (e.g., "File not found in PREFIX paths")

### Regression verification
- Broad automated test coverage — add/fix tests for both regressions AND related linker/navigation paths
- Manual sign-off required before moving to Phase 33 — phase stays open until user confirms both regressions are fixed in IDE
- Manual testing in BOTH VS Code and IntelliJ
- Provide a manual test checklist with specific scenarios to verify in each IDE

### Claude's Discretion
- Technical approach to implementing BBjAPI() as built-in (grammar rule, scope provider, linker override, etc.)
- How to structure the manual test checklist
- Which related linker/navigation paths need broader test coverage

</decisions>

<specifics>
## Specific Ideas

- BBjAPI() is the single most-used factory function in BBj code — it must "just work" without any external dependencies
- USE statement format for BBj classes: `USE ::filename.bbj::ClassName` — this is the only format that needs navigation support
- User will manually test in both IDEs before sign-off, so the checklist should cover both VS Code and IntelliJ scenarios

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-regression-fixes*
*Context gathered: 2026-02-07*
