# Phase 2: Syntax Highlighting - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

BBj code displays with color syntax highlighting in IntelliJ via TextMate grammar integration. Highlighting appears immediately when opening a BBj file (no language server needed). Also includes language configuration for bracket matching, auto-closing pairs, and comment toggling.

</domain>

<decisions>
## Implementation Decisions

### Grammar source
- Reuse the existing TextMate grammar from bbj-vscode — do not create a new one
- The existing grammar is comprehensive and covers all BBj syntax needed
- Researcher should investigate the grammar file structure (single vs multiple files, injections)

### Token coloring
- Match whatever token scopes the VS Code grammar already produces — faithful mapping to IntelliJ
- Map to standard TextMate scopes and let the IntelliJ theme handle colors
- No BBj-specific color overrides beyond what the grammar scopes provide
- No strong preference on exact colors — correctness over aesthetics

### Color scheme customization
- Add a BBj-specific section in Settings > Editor > Color Scheme so users can customize BBj token colors
- Ship a BBj color preset (dark and light variants) based on IntelliJ's default color scheme, tuned for BBj
- Claude's discretion on which token types appear as customizable entries (reasonable set based on grammar scopes)

### Bundling approach
- Gradle build copies the grammar file from bbj-vscode at compile time (not a static copy) — keeps it always in sync
- Grammar changes are picked up silently — no checksum or diff checks needed at this stage
- Also bundle language-configuration.json for bracket matching, auto-closing pairs, and comment toggling
- Claude's discretion on TextMate registration method (LSP4IJ vs plugin.xml — whichever fits best)

### Claude's Discretion
- Grammar sync mechanism (symlink vs Gradle copy task vs other approach fitting the monorepo structure)
- TextMate grammar registration method (LSP4IJ TextMate support vs IntelliJ TextMate bundle extension point)
- Which token types are exposed as customizable in the Color Scheme settings page
- Exact color values for the BBj preset (based on IntelliJ defaults)

</decisions>

<specifics>
## Specific Ideas

- The VS Code extension's grammar is the single source of truth — IntelliJ should never diverge from it
- Language configuration (brackets, comments, auto-close) should also come from bbj-vscode if it exists there
- The editing experience should feel complete even without the language server running

</specifics>

<deferred>
## Deferred Ideas

- Visually distinguishing legacy BBj syntax (line numbers, older BASIC-style keywords) from modern BBj — this is a grammar-level change that should apply across all IDEs, not IntelliJ-specific

</deferred>

---

*Phase: 02-syntax-highlighting*
*Context gathered: 2026-02-01*
