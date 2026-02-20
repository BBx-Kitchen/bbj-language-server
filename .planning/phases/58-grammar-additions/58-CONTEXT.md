# Phase 58: Grammar Additions - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three missing constructs to the BBj parser so valid programs no longer produce false parse errors: EXIT with optional numeric argument, SERIAL verb for creating serial file types, and ADDR verb for loading public programs as resident. No new IDE features — parser grammar and token additions only.

</domain>

<decisions>
## Implementation Decisions

### EXIT verb syntax
- Bare `EXIT` already works in the grammar — only the optional numeric argument is missing
- EXIT accepts any numeric expression as its argument (not just integer literals): `EXIT 0`, `EXIT myVar`, `EXIT fn(x)`
- No range restriction on the argument value — parser accepts any numeric expression
- EXIT (with or without argument) is valid anywhere a statement is valid — programs, methods, loops, class bodies

### SERIAL verb syntax
- SERIAL is a verb that creates a serial file type
- Syntax: `SERIAL fileid{,records,recsize}{,MODE=str}{,ERR=lineref}`
- `fileid` is a string expression (file path)
- `records` and `recsize` are numeric expressions, both optional
- All optional parts are truly optional — `SERIAL "myfile.dat"` with just fileid is valid
- MODE= and ERR= clause handling: Claude's discretion (check if existing grammar already has these patterns from other verbs)

### ADDR verb syntax
- ADDR is a **verb** (statement), NOT a function — the requirement description (#377) and success criteria are incorrect
- Syntax: `ADDR fileid{,ERR=lineref}`
- `fileid` is a string expression (program path to load as resident)
- ERR= is the optional error clause
- ADDR is valid anywhere a statement is valid
- Success criteria in ROADMAP.md should be updated: "ADDR verb parses without error as a standalone statement" (not "usable in assignments and conditions")

### Claude's Discretion
- Whether MODE= and ERR= clause patterns already exist in grammar or need adding
- How to structure the grammar rules (inline vs shared clause rules)
- Token registration approach for new verb keywords

</decisions>

<specifics>
## Specific Ideas

- SERIAL reference: https://documentation.basis.cloud/BASISHelp/WebHelp/commands/serial_verb.htm
- ADDR loads a public program as resident — it's a program management verb, not a memory address function
- All three constructs follow the pattern of "verb + arguments + optional clauses" common in BBj

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 58-grammar-additions*
*Context gathered: 2026-02-20*
