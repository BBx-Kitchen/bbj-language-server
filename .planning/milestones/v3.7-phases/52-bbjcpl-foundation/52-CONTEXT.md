# Phase 52: BBjCPL Foundation - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a verified, safe BBjCPL compiler service that invokes the `bbjcpl` binary, parses its error output into LSP Diagnostic objects, and manages process lifecycle with abort/timeout safety. This phase produces the compiler service and output parser — wiring it into the document lifecycle is Phase 53.

</domain>

<decisions>
## Implementation Decisions

### Compiler invocation
- `bbjcpl` binary lives at `{bbj.home}/bin/bbjcpl` — derive path from existing `bbj.home` setting, no new path setting needed
- Invocation: `bbjcpl -N <file>` — the `-N` flag runs syntax check only (no output file)
- `bbjcpl` always exits 0 — errors reported on stderr, empty stderr = valid
- Reference implementation exists at `/Users/beff/_workspace/bbj-ai-strategy/rag-ingestion/src/bbj_rag/compiler.py` (Python async subprocess pattern)

### Output format
- Error format: `<filepath>: error at line <legacy_line> (<physical_line>):\n            <source_line>`
- The parenthesized number `(N)` is the **physical line number** — use this for LSP line mapping
- The first number (e.g., 350) is a legacy BASIC line number — ignore it
- Multiple errors per file are reported in one pass
- bbjcpl can produce cascading errors (e.g., `methodend` flagged because the `method` declaration line has an error) — Phase 53's diagnostic hierarchy handles this
- stdout vs stderr distinction needs empirical verification — capture both during research

### Output discovery
- Create synthetic .bbj files with deliberate errors for test fixtures (don't rely on existing test files)
- Capture real bbjcpl stderr output against these files and commit as test fixtures
- Investigate whether bbjcpl produces warnings in addition to errors (unknown — discover empirically)

### Process lifecycle
- Trigger: on file save (not on every keystroke)
- Timeout: configurable via VS Code setting, default TBD (needs to be generous — large files can take 15-30+ seconds)
- Concurrency: one bbjcpl process per file, no global limit
- Abort policy: let current compilation finish; if a new save comes in, abort the in-flight process and start fresh. Don't aggressively abort on keystrokes
- Kill process on timeout, continue without hanging the language server

### Error mapping
- All bbjcpl errors map to LSP Error severity (no Warning distinction)
- Diagnostic source label: `"BBj Compiler"`
- Error range: highlight entire line (start of line to end of line) since bbjcpl doesn't report columns
- Parse the physical line number from parentheses in the error format

### Claude's Discretion
- Whether to compile saved file on disk vs write buffer to temp file
- Exact default timeout value
- stdout capture strategy
- Temp file cleanup approach if using temp files

</decisions>

<specifics>
## Specific Ideas

- Real error sample (3 errors from one file):
  ```
  /path/file.bbj: error at line 340 (34):
       method public void methodWithSyntaxError())
  /path/file.bbj: error at line 350 (35):
              myEditBox!.setText"00-00-0000_0000")
  /path/file.bbj: error at line 360 (36):
       methodend
  ```
- Note: line 36 (`methodend`) is flagged not because it's wrong, but because the `method` line (34) has a syntax error — this is a cascading error from bbjcpl itself

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 52-bbjcpl-foundation*
*Context gathered: 2026-02-20*
