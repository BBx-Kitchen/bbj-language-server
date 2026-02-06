# Phase 27: IDE Polish - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve IDE-level quality-of-life features: differentiate symbol kinds in Structure View and completion, scope run icons to BBj file types in VS Code, trigger field completion on `#`, and include source filenames in cyclic reference and linker error messages. Both VS Code and IntelliJ are in scope for symbol/completion/error changes; run icon scoping is VS Code only.

</domain>

<decisions>
## Implementation Decisions

### Symbol kind mapping
- Labels, variables/fields, methods, and DEF FN functions should each use appropriate distinct SymbolKinds
- Variables and fields can share the same SymbolKind — the `#` prefix on fields is sufficient to distinguish them
- Methods get SymbolKind.Method, DEF FN functions get SymbolKind.Function — visually distinguished
- Differentiated kinds apply to both Structure View AND completion popups (consistent everywhere)

### Run icon scoping (VS Code only)
- Run icons (GUI/BUI/DWC) should appear on `.bbj`, `.bbl`, `.bbx`, `.src` files only
- `.bbjt` excluded — unit test files need a test panel (deferred)
- `.arc` excluded — not runnable
- IntelliJ run icons are already correctly scoped — no changes needed there
- Current `when` clause in package.json uses `resourceLangId == bbj || resourceLangId == bbx` — needs investigation and fix if icons still appear on non-BBj files
- May need to add `.bbl` and `.src` to the `when` clause or language registration

### # field completion
- Typing `#` immediately triggers field completion popup (trigger character)
- Shows fields from current class AND inherited fields (protected and public only, no private)
- Static fields included
- `#` stays as typed; completion inserts the field name after it (result: `#fieldName`)
- Only triggers inside class method bodies — not outside classes or in other contexts

### Error message format
- Cyclic reference and linker error messages include source filename with relative path (from workspace root)
- Include line number where the issue originates: e.g., `Helper.bbj:42`
- Cyclic reference errors appear at the detection point only — not duplicated in both files
- Error message points to the other file involved

### Claude's Discretion
- Exact SymbolKind choice for labels (Key, Event, or other appropriate kind)
- Linker error message detail level (whether to include symbol name, file, or both — based on what info is available in the error path)
- Exact error message wording

</decisions>

<specifics>
## Specific Ideas

- Run icon investigation: VS Code package.json already has `when` clauses (`resourceLangId == bbj || resourceLangId == bbx`) but issue #354 reports they still show on all files — may be a VS Code bug or clause not working correctly
- Issue #340 tracks missing file extensions for run icons (.bbx, .src — .bbx is already covered via `resourceLangId == bbx`)

</specifics>

<deferred>
## Deferred Ideas

- Unit test panel for `.bbjt` files — needs its own implementation phase (test discovery, run, results display)

</deferred>

---

*Phase: 27-ide-polish*
*Context gathered: 2026-02-06*
