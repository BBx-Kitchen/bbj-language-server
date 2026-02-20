# Phase 51: Outline Resilience - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Make Structure View (document symbols) survive syntax errors in both VS Code and IntelliJ. Methods, classes, labels, and other symbols before and after a parse error point remain visible in the outline. No grammar changes — solved at the symbol provider level.

</domain>

<decisions>
## Implementation Decisions

### Error point behavior
- Show partial methods — if a method's name/signature was parsed but the body is broken, it still appears in the outline
- Unparseable declarations that have no recoverable name show with fallback label `(parse error)`
- Claude's discretion: whether partial/broken symbols use a distinct SymbolKind or tag for visual differentiation

### Symbol granularity
- Recover everything possible — classes, methods, labels, fields, variables — not just top-level constructs
- Labels and symbols after the error point should appear if Langium's error recovery parsed them (not cut off at error)
- Claude's discretion: hierarchy preservation vs flattening when class body is broken
- Claude's discretion: field recovery strategy when containing class node is broken

### Partial AST strategy
- Claude's discretion: walk partial AST vs separate text scan — pick the most maintainable approach
- Claude's discretion: error handling per node (skip and continue vs fail safe) — maximize recovery
- Debounced outline updates during rapid typing — avoid flicker
- Claude's discretion: transition behavior when parse error is fixed (snap vs smooth)

### Degradation UX
- Claude's discretion: whether to indicate partial/recovered state to users (via LSP DocumentSymbol capabilities)
- If recovery fails entirely (file too broken for any symbols): empty outline, no message
- Minor behavioral differences between VS Code and IntelliJ are acceptable
- Skip partial recovery for very large files — Claude picks appropriate threshold based on typical BBj file sizes

### Claude's Discretion
- Visual differentiation of partial/broken symbols (icon, tag, or same as normal)
- AST walk strategy vs text scan — whatever is most maintainable and reliable
- Error handling approach per-node during symbol extraction
- Hierarchy preservation decisions on broken class bodies
- Field recovery when parent class node is broken
- Large file size threshold for skipping recovery
- Outline update transition when errors are resolved

</decisions>

<specifics>
## Specific Ideas

- The `(parse error)` fallback label was chosen to be descriptive — tells the user why the name is missing rather than a generic placeholder
- Debounced outline updates are important to prevent visual noise during typing in a broken file
- Both IDEs consume the same LSP DocumentSymbol response, so the core behavior is shared — rendering differences are the IDE's responsibility

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 51-outline-resilience*
*Context gathered: 2026-02-19*
