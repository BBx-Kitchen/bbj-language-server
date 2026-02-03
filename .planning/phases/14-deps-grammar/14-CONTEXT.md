# Phase 14: Dependency Update & Grammar Regeneration - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Langium 4.1.3 (and langium-cli 4.1.0), resolve dependency conflicts, regenerate grammar files, and get generated code compiling cleanly. This phase only handles packages and generated code — hand-written source migration is Phase 15+.

</domain>

<decisions>
## Implementation Decisions

### Chevrotain handling
- Follow Langium's recommendation for chevrotain version alignment
- Reduce direct chevrotain coupling where possible (import through Langium if it re-exports the needed types)
- If Langium doesn't re-export `TokenType`/`TokenVocabulary`, keep direct dependency but align version to what Langium 4.1.3 expects
- Minimize risk — don't refactor chevrotain usage beyond what's needed for the upgrade

### Grammar migration approach
- Fix forward — adapt grammar to Langium 4's expectations, no backward compatibility concerns
- Grammar is fully owned by the team, no coordination with TypeFox needed
- Both grammar files (bbj.langium, java-types.langium) can be modified freely if needed

### Claude's Discretion
- Version pinning strategy (tilde ~4.1.3 recommended to match project convention, but Claude decides)
- Whether to update non-Langium dependencies at the same time (Claude judges based on staleness/risk)
- Exact order of operations within the phase (package.json first vs langium-config first, etc.)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard dependency upgrade workflow. The key reference is the existing project convention of tilde ranges in package.json.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-deps-grammar*
*Context gathered: 2026-02-03*
