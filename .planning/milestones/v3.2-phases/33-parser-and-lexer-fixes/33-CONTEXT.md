# Phase 33: Parser and Lexer Fixes - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate false errors on valid BBj syntax patterns. Four specific parser/lexer bugs produce diagnostics on legal code: `void` return types, suffixed variables in DEF FN inside methods, SELECT verb clauses, and cast with array types. No new language features — just make valid code parse cleanly.

</domain>

<decisions>
## Implementation Decisions

### Void return type (PARSE-01)
- Recognize `void` specifically in method return-type position only — not as a general keyword
- Only `void` is affected — other return types like BBjString resolve correctly already
- `void` is NOT valid anywhere else (e.g., not in cast expressions)
- Just stop the false error — no return-value validation (don't check METHODRET usage)

### DEF FN suffixed variables (PARSE-02)
- All variable suffixes are affected: `$`, `%`, `!` — not just `$`
- Problem only occurs when DEF FN is inside a class method body — works fine in main program scope
- Both single-line and multi-line DEF FN forms should work inside method bodies
- Uncommon but valid pattern — needs a solid fix, not a workaround

### SELECT verb (PARSE-03)
- SELECT is a BBj verb, not SQL — treat it like other BBj verbs (READ, WRITE, etc.)
- Handle all SELECT verb clauses: FROM, WHERE, SORTBY, LIMIT, MODE, ERR
- Full syntax: `SELECT (chan{,MODE=str}{,ERR=ref})template {:fields} FROM fileid {WHERE expr} {SORTBY expr} {LIMIT first, count}`
- Multi-line only via standard BBj line continuation (`:` at first position of next line)
- Only SELECT has this issue — no other verbs have the same clause-based false error

### Cast array notation (PARSE-04)
- Array bracket notation `[]` should work with any type in cast — BBj built-ins and user-defined classes
- Multi-dimensional arrays supported: `Type[][]`, `Type[][][]`, etc.
- Only cast has this parsing issue — array notation works correctly in method signatures and other contexts
- Just stop the false error — no type resolution for array casts in this phase

### Claude's Discretion
- Grammar rule structure for each fix
- Whether to use lexer-level or parser-level approach for each issue
- Test case design and coverage
- Fix ordering within the phase

</decisions>

<specifics>
## Specific Ideas

- SELECT verb reference documentation: https://documentation.basis.cloud/BASISHelp/WebHelp/commands/select_verb.htm
- DEF FN in method bodies is uncommon but valid — don't over-engineer but ensure it's robust

</specifics>

<deferred>
## Deferred Ideas

- METHODRET return type validation (verify METHODRET value matches declared return type for non-void methods) — future phase
- Type resolution for array cast expressions (e.g., `cast(BBjString[], x!)` resolving to typed array for code completion) — future phase

</deferred>

---

*Phase: 33-parser-and-lexer-fixes*
*Context gathered: 2026-02-07*
