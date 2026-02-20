# Phase 24: Grammar & Parsing Fixes - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate false errors from valid BBj syntax patterns. The parser must accept common constructs (camel-case identifiers with keyword prefixes, inline REM comments, DREAD/DATA, DEF FN/FNEND) without producing diagnostics. Error recovery should minimize cascading errors from unrecognized statements.

</domain>

<decisions>
## Implementation Decisions

### Identifier vs keyword resolution
- All keywords must be handled as potential identifier prefixes, not just `get`/`new`/`is` — future-proof
- The lexer (Chevrotain) currently splits `getResult` into `GET` + `Result` because keyword matching takes priority over identifier matching
- The main real-world conflict contexts are: labels (`getResult:`) and GOTO/GOSUB targets (`GOTO getResult`) — method calls always have a prefix (`obj!.getResult()`, `#getResult()`, `this!.getResult()`)
- After a dot (`.`) or hash (`#`), the issue doesn't manifest — it's standalone names that break
- The existing workaround in `bbj-token-builder.ts` (adding keywords to ID category) doesn't prevent the lexer from splitting tokens — needs a proper fix at the lexer level
- Reference: BBjAPI javadoc at `/Users/beff/bbx/documentation/javadoc/` contains complete method name reference

### Inline comment patterns
- Semicolon (`;`) is a statement separator, not specifically a comment marker
- `REM` is a statement that treats the rest of the line as comment text
- `endif;rem blah` = `endif` + `;` (separator) + `rem blah` (REM statement) — must parse without error
- Colon at start of line (`:`) is line continuation (appends to previous logical line)
- Colon elsewhere is a label definition (`my_label:`)
- `: REM ...` at start of line = continue previous line + REM comment — rare but valid, must not error

### Legacy statement support (DREAD, DATA, DEF FN)
- These exist in a lot of legacy code and will continue to exist
- `DATA` stores values (numeric, string, expressions) to be read by `DREAD` — they work as a pair
- `DATA` cannot be part of a compound statement; may include a line label
- `DEF FN` / `FNEND` blocks can appear inside class methods (not just top level)
- DATA reference: https://documentation.basis.cloud/BASISHelp/WebHelp/commands/data_verb.htm

### Error tolerance strategy
- Parser should recover and continue when encountering broken/partial constructs — minimize cascading errors
- Cascading errors (one bad line causing entire file to error) is a high priority to fix
- Unrecognized statements: show one error on that specific line, then recover for the rest of the file
- Error messages must clearly show the CAUSE of the parser giving up — not just "unexpected token"
- Discover additional missing statements as they come — fix the known five (GRAM-01 through GRAM-05) now

### Claude's Discretion
- Level of semantic support for DREAD/DATA/DEF FN (parse-without-error vs full validation/completion)
- Specific lexer implementation approach for keyword/identifier resolution (longest match, lookahead, custom token matcher)
- Langium/Chevrotain error recovery mechanisms to use
- Exact error message wording

</decisions>

<specifics>
## Specific Ideas

- "The user always sees the cause for the parser giving up" — error messages must be actionable, not cryptic
- After a dot or hash, keyword conflicts don't manifest — the fix primarily matters for standalone names (labels, GOTO targets)
- Semicolon and colon-at-start-of-line are both line continuation mechanisms but in different contexts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-grammar-parsing-fixes*
*Context gathered: 2026-02-06*
