# Phase 50: Diagnostic Noise Reduction - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Suppress cascading diagnostic noise when parse errors exist so users see only meaningful errors. A single syntax error should produce 1-3 diagnostics instead of 40+ linking/validation spam. Covers DIAG-01 (cascading suppression) and DIAG-02 (diagnostic hierarchy). Does NOT include BBjCPL integration (Phase 53) or outline resilience (Phase 51).

</domain>

<decisions>
## Implementation Decisions

### Suppression scope
- When parse errors exist, suppress ALL linking errors — no partial/heuristic filtering
- Semantic errors at Error severity survive alongside parse errors — only linking errors are suppressed
- All warnings and hints from any source are suppressed when any Error-severity diagnostic exists
- Cross-file suppression scope: Claude's discretion based on how Langium cross-file validation works
- Suppression is configurable via a setting (e.g., `bbj.diagnostics.suppressCascading`) — default ON

### Diagnostic hierarchy
- Any diagnostic at Error severity (parse OR semantic) triggers warning/hint suppression — not just parse errors
- All warnings and hints from ALL sources (parser, validation, lint) are hidden when errors exist
- Parse errors should appear first/prioritized in the Problems panel, then semantic errors
- Design the hierarchy to be extensible — Phase 53 will add BBjCPL as a higher-priority error source (BBjCPL > parse > semantic > warnings)

### Error counting
- Any single parse error triggers full linking suppression — no threshold
- Cap displayed parse errors at a configurable maximum — default 20
- Add a configurable setting for the error cap (e.g., `bbj.diagnostics.maxErrors`)

### Recovery behavior
- Suppressed diagnostics reappear immediately on keystroke when parse becomes clean — debounced to avoid high CPU
- Incremental reappearance is fine — diagnostics appear as each validation phase completes
- Show a status bar hint when diagnostics are being suppressed — exact format at Claude's discretion

### Claude's Discretion
- Cross-file suppression behavior (whether importing a broken file suppresses linking in the importer)
- Status bar hint format (count-based vs simple label)
- Debounce timing for recovery re-scan
- Exact setting names and defaults

</decisions>

<specifics>
## Specific Ideas

- The hierarchy system should be designed as a ranked/extensible priority model, not a hardcoded if/else, since Phase 53 will add BBjCPL as the highest-priority error source
- Settings should follow existing `bbj.*` namespace conventions in the codebase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 50-diagnostic-noise-reduction*
*Context gathered: 2026-02-19*
