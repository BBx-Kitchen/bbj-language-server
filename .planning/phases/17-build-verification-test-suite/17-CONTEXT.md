# Phase 17: Build Verification & Test Suite - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Get the full project compiling, bundling, and passing all tests after the Langium 3-to-4 migration (Phases 14-16). This is the catch-all verification phase -- fix every remaining compiler error, bundle issue, and test failure. No new features, no behavior changes beyond what Langium 4 requires.

</domain>

<decisions>
## Implementation Decisions

### Error resolution strategy
- Claude's Discretion on fix approach (batch by category vs file-by-file vs hybrid -- pick the most efficient strategy based on what errors appear)
- Claude's Discretion on fix depth per case: find the proper Langium 4 pattern when warranted, use pragmatic workarounds when appropriate
- Phase 14-16 gaps found during compilation: just fix them here without ceremony -- this phase is the catch-all
- Claude's Discretion on plan granularity: split into multiple plans or single plan based on error volume

### Test failure handling
- When Langium 4 changes behavior: update test expectations to match the new behavior (don't try to preserve old behavior)
- Tests exercising deprecated/removed APIs: rewrite to test the equivalent Langium 4 path (maintain coverage)
- No known flaky tests -- all failures are real problems
- Test infrastructure (helpers, mock setups, service creation): update as needed to work with Langium 4 APIs

### Build artifact scope
- Claude's Discretion on whether vsce package + IntelliJ build belong here or Phase 18 -- decide based on dependency chain
- Smoke-test the esbuild bundle: verify main.cjs loads (e.g., `node -e 'require("./main.cjs")'`)
- Claude's Discretion on which npm scripts to run -- investigate package.json and run what's relevant
- Claude's Discretion on IntelliJ build process -- investigate the setup and handle accordingly

### Acceptable compromises
- Claude's Discretion on skipping tests: if a test needs major rework, Claude can skip with TODO if justified
- Claude's Discretion on TypeScript warnings: judge based on what kinds of warnings appear
- Claude's Discretion on bundle size changes: flag significant increases but don't block
- No specific codebase areas of concern flagged -- standard migration verification

### Claude's Discretion
All areas above have significant Claude discretion. The core locked decisions are:
- Update test expectations to match Langium 4 (not preserve old behavior)
- Rewrite deprecated-API tests for Langium 4 equivalents (not delete)
- Smoke-test the bundle (not just check build success)
- Fix Phase 14-16 gaps in place (don't track as separate issues)

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. This is a mechanical verification phase. Get it green.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 17-build-verification-test-suite*
*Context gathered: 2026-02-03*
