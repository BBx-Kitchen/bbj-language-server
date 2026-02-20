# Phase 57: Bug Fixes - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix four reported regressions: EM Config "--" startup failure (#382), config.bbx highlighting (#381), suffixed identifier parsing (#379), and DECLARE in class body parsing (#380). No new features — parser and launch behavior corrections only.

</domain>

<decisions>
## Implementation Decisions

### EM Config "--" handling
- Strip "--" from EM Config values before use — treat as "not configured"
- "--" is the only sentinel value to strip (no other special values)
- EM Config is only read during program launch (run command), not during editing/parsing
- When "--" is stripped, silently omit the entry and proceed with launch — no warning, no failure
- Behavior: launch works as if that EM Config entry was never set

### config.bbx file association
- config.bbx is a configuration file, NOT a BBj program — it must not get BBj language treatment
- Exclude by filename only: any file named `config.bbx` or `config.min` is excluded from BBj language association regardless of directory
- Excluded files should open as plain text (no syntax highlighting)
- `.bbx` extension otherwise remains a valid BBj program extension — only these specific filenames are excluded
- Future: a proper config.bbx DSL would be its own phase if ever needed

### Suffixed identifier parsing
- The bug: parser greedily matches keyword prefixes (e.g., `release` from `releaseVersion!`) and chokes on the remainder
- Rule: longest match wins — keyword matching only applies when the token exactly matches the keyword
- If a contiguous alphanumeric token is longer than a keyword, it's an identifier regardless of whether it starts with a keyword
- Valid type suffixes: `!` (object), `$` (string), `%` (integer) — these three only
- Suffix always makes a token an identifier: `release!` is an identifier, not keyword RELEASE
- No suffix also valid: `releaseDate` (no suffix, numeric type) is an identifier, not keyword RELEASE + `Date`

### DECLARE in class body
- DECLARE is valid: inside method bodies (method-local variables) and in global scope (outside classes)
- DECLARE is NOT valid: between methods in a class body (at class member level)
- The bug: parser crashes when DECLARE appears at class member level instead of recovering
- Fix: recover gracefully and show an error diagnostic (red squiggly) — "DECLARE not valid here"
- Parser recovery strategy after misplaced DECLARE: Claude's discretion based on parser architecture

### Claude's Discretion
- Parser recovery strategy for misplaced DECLARE (continue normally vs skip to next member)
- Exact error message wording for DECLARE diagnostic
- Implementation approach for identifier longest-match rule (lexer vs parser level)

</decisions>

<specifics>
## Specific Ideas

- EM Config "--" is a BBj convention meaning "not configured" — the language server should respect this silently
- config.bbx and config.min are BBj Home configuration files — they have their own format unrelated to BBj source code
- Identifier parsing must handle both suffixed (`releaseVersion!`, `stepMode!`) and unsuffixed (`releaseDate`) cases where the name starts with a keyword

</specifics>

<deferred>
## Deferred Ideas

- config.bbx DSL with proper syntax highlighting for BBj configuration files — future phase if needed

</deferred>

---

*Phase: 57-bug-fixes*
*Context gathered: 2026-02-20*
