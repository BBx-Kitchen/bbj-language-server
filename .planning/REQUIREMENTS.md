# Requirements: BBj Language Server

**Defined:** 2026-09-20
**Milestone:** v4.5 Compiler Conformance
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

**Baseline** (language server `d8071b24`, compiler build of 2026-09-01, corpus of 11,898 compiler-accepted and 1,210 compiler-rejected programs): A = 168 valid files the parser rejects, A2 = 267 valid files with a validation error, B = 658 invalid files without any error (54.4 %).

## v1 Requirements

### Parsing valid code (list A)

- [ ] **PARSE-01**: A program that uses `FIELD` as a verb (`FIELD rec$,"name"=value`) parses without lexer or parser errors
- [ ] **PARSE-02**: `READ RECORD(chan,LEN=n)var$` and the other combined `RECORD` verbs with channel options directly after the verb parse without errors
- [ ] **PARSE-03**: A label alone on a line, and a label directly followed by a statement (`label:escape`, `L30: iolist a,b,c`), parse without errors
- [ ] **PARSE-04**: `PRINT (chan,err=label) ...` and the other `PRINT`/`INPUT` item forms the compiler accepts but the parser rejects today parse without errors
- [ ] **PARSE-05**: `DREAD` into arrays (`dread x![]`) parses without errors
- [ ] **PARSE-06**: A `; rem` comment after a `METHOD` header, `METHODEND` or `CLASSEND`, and line-numbered class code, parse without errors
- [ ] **PARSE-07**: The `IOLIST` statement parses without errors
- [ ] **PARSE-08**: Words BBj accepts as names although they are language words (for example `label`, `text`, `vector`, `state`, `val`) can be used as variables and labels without parser errors
- [ ] **PARSE-09**: Every file that remains on list A is either fixed or recorded in a tracked list with the reason it stays (not a program, compiler quirk, deliberate)

### No false alarms on valid code (list A2)

- [x] **VALID-01**: A `TABLE` statement gets no line-break error
- [x] **VALID-02**: `RESTORE n`, `GOSUB`/`GOTO` to a label named like a keyword, `EXIT expr`, `LOAD` and `SAVE` get no line-break error
- [x] **VALID-03**: A multi-line `DEF FN...(params)` header gets no line-break error
- [x] **VALID-04**: Single-line `IF` forms and `FI` that the compiler accepts are not reported as "needs to start in a new line"
- [x] **VALID-05**: The conflicting-`DECLARE` and `METHODRET` checks report no error on code the compiler accepts

### Compiler parser diagnostics (list B)

- [ ] **PSRV-01**: `bbj-ls` offers an endpoint that runs BBj's parser on supplied document text, without reading or writing the document on disk and with type checking off, and returns each error's category, message and editor line and character range
- [ ] **PSRV-02**: The endpoint uses the supplied text for the active document, resolves referenced programs through the configured prefixes and workspace roots, and never returns results of an earlier version of the text
- [ ] **PSRV-03**: With a BBjServices that offers the endpoint, the user sees the compiler's syntax errors while typing, without saving
- [ ] **PSRV-04**: With a BBj older than 26.03, whose `bbj-ls` lacks the endpoint, and with no connection at all, both extensions (VS Code and IntelliJ) keep every feature they have in 0.16.x, including Java completion through the same service and the save-time `bbjcpl` run. The language server finds out by probing the endpoint once per connection, not by comparing version strings, and reports no error, dialog or repeated log line. An automated test runs against a service double that lacks the endpoint
- [ ] **PSRV-05**: Compiler diagnostics appear on the correct editor line and range for continuation lines, line-numbered programs, CRLF files and a last line without newline
- [ ] **PSRV-06**: Compiler diagnostics and the language server's own diagnostics do not duplicate each other on a line, and the save-time `bbjcpl` run does not repeat what the endpoint already reported
- [ ] **PSRV-07**: When the compiler's parser accepts a document, the user sees no lexer, parser or line-break error from the language server for it
- [ ] **PSRV-08**: A failure of the endpoint (exception, timeout, BBj not running) is never shown as a syntax error in the document; it is visible in the server log or status
- [ ] **PSRV-09**: The user can tell which mode is active: the server log states once per connection whether live compiler diagnostics are on, and the documentation of both extensions says they need BBj 26.03 or later

### Examples

- [ ] **EXMP-01**: Every file under `examples/` either compiles with `bbjcpl` or lives in a folder marked as deliberately invalid, with its expected diagnostics asserted by a test

### Conformance measurement

- [x] **CONF-01**: Each construct fixed for PARSE and VALID has a small synthetic regression file that the existing example-files test parses with zero errors
- [ ] **CONF-02**: The conformance run can include the `bbj-ls` endpoint, reports list B with it, and the way to run it is documented for maintainers
- [ ] **CONF-03**: On the corpus build of the baseline, the milestone ends with A ≤ 25, A2 ≤ 25, and B ≤ 5 % with the endpoint active, with all existing test suites passing

## Future Requirements

### Strict checks without BBj

- **STRICT-01**: Bare expression statements the compiler rejects (`PRINT "x"; STR(y)`, `TRY`, `ELSEIF`, unknown verbs) are flagged by the language server's own grammar, for users without a current BBj and for the BNF generated from the grammar
- **STRICT-02**: Unterminated `CLASS`, `METHOD`, `INTERFACE` and `DEF` blocks are flagged without BBj

### Compiler parser, beyond syntax

- **PSRV-10**: A slower type-aware pass through the endpoint after the user pauses or saves
- **PSRV-11**: Keyword, verb and function tables for highlighting and completion are generated from BBj's symbol inventories and tied to a BBj version

## Out of Scope

| Feature | Reason |
|---------|--------|
| Porting BBj's scanner, pre-scanner filter, CUP grammar and parameter validation to TypeScript | The compiler's parser is available in-process through `bbj-ls`; a port could only approximate it and would have to follow every BBj release |
| A blanket "reserved word cannot be a name" rule | BBj allows many language words as names depending on context; such a rule would reject valid code |
| Proprietary BBj source text in this repository | The repository is public; planning files and tests describe behaviour and use word lists only |
| The private corpus or the harness in this repository or its CI | The corpus contains internal and third-party code; regression files here are synthetic |
| MCP server, BNF generation and LLM fine-tuning | Separate projects that build on this milestone's result |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 99 | Pending |
| PARSE-02 | Phase 99 | Pending |
| PARSE-03 | Phase 99 | Pending |
| PARSE-04 | Phase 100 | Pending |
| PARSE-05 | Phase 100 | Pending |
| PARSE-06 | Phase 100 | Pending |
| PARSE-07 | Phase 99 | Pending |
| PARSE-08 | Phase 100 | Pending |
| PARSE-09 | Phase 100 | Pending |
| VALID-01 | Phase 98 | Complete |
| VALID-02 | Phase 98 | Complete |
| VALID-03 | Phase 98 | Complete |
| VALID-04 | Phase 98 | Complete |
| VALID-05 | Phase 98 | Complete |
| PSRV-01 | Phase 101 | Pending |
| PSRV-02 | Phase 101 | Pending |
| PSRV-03 | Phase 102 | Pending |
| PSRV-04 | Phase 102 | Pending |
| PSRV-05 | Phase 102 | Pending |
| PSRV-06 | Phase 103 | Pending |
| PSRV-07 | Phase 103 | Pending |
| PSRV-08 | Phase 102 | Pending |
| PSRV-09 | Phase 102 | Pending |
| EXMP-01 | Phase 100 | Pending |
| CONF-01 | Phase 98 | Complete |
| CONF-02 | Phase 104 | Pending |
| CONF-03 | Phase 104 | Pending |

**Coverage:**

- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

Phases 98-104 are defined in `.planning/ROADMAP.md`. Requirements per phase: Phase 98 — 6
(VALID-01..05, CONF-01); Phase 99 — 4 (PARSE-01, -02, -03, -07); Phase 100 — 6 (PARSE-04, -05,
-06, -08, -09, EXMP-01); Phase 101 — 2 (PSRV-01, -02, in the separate `bbj-ls` repository);
Phase 102 — 5 (PSRV-03, -04, -05, -08, -09); Phase 103 — 2 (PSRV-06, -07); Phase 104 — 2
(CONF-02, -03). No requirement is mapped to more than one phase.

CONF-01 is a cross-cutting rule mapped once, to Phase 98 — the first phase that fixes constructs.
Phases 99 and 100 carry it in their own success criteria: every construct they fix also gets a
synthetic regression file under `bbj-vscode/test/test-data/`.

---
*Requirements defined: 2026-09-20*
*Last updated: 2026-09-20 — traceability filled by the v4.5 roadmap (27/27 mapped, no orphans)*
