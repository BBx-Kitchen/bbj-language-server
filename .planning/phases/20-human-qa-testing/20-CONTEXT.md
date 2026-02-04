# Phase 20: Human QA Testing - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Create documentation for human QA testing with recurring testing checklists. This phase produces test documentation — it does not automate tests or modify existing test infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Checklist Scope
- Cover both VS Code and IntelliJ with separate sections
- Include all 9 LSP features: syntax highlighting, diagnostics, completion, hover, signature help, go-to-definition, document symbols, semantic tokens, Java interop
- Include Run BBj commands (Run Program, Run with Debug, etc.)
- Include EM (Enterprise Manager) integration testing

### Checklist Format
- Use Markdown tables with columns: Feature | Steps | Expected | Pass/Fail
- Start with brief reminders assuming tester knows the product; improve iteratively as testers contribute
- Include inline code examples/snippets within the checklist
- Location: new `QA/` directory at project root

### Testing Cadence
- Create a separate shorter smoke test checklist (5-10 items for quick sanity testing)
- Test latest versions of VS Code and IntelliJ only (not version matrix)
- When to run full checklist: TBD by user (not defined in this phase)

### Pass/Fail Criteria
- Document expected results explicitly in checklist AND allow tester judgment for discrepancies
- Evidence (screenshots, logs) required only on failures
- Each test run creates a dated copy of checklist with Pass/Fail filled in
- Release gate: all tests must pass for release approval

### Claude's Discretion
- Exact table column widths and formatting
- Which inline snippets to include for each test
- Organization of tests within each IDE section

</decisions>

<specifics>
## Specific Ideas

- "We can improve test instructions iteratively, this phase is to seed formal testing procedures"
- Testers should be able to contribute snippets over time
- Smoke test should be quick (5-10 items) for sanity checking

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-human-qa-testing*
*Context gathered: 2026-02-04*
