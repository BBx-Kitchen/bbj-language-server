# Requirements: BBj Language Server

**Defined:** 2026-02-08
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v3.3 Requirements

Requirements for v3.3 Output & Diagnostic Cleanup. Each maps to roadmap phases.

### Logging

- [ ] **LOG-01**: Language server has a debug logging setting (`bbj.debug`) that is off by default
- [ ] **LOG-02**: When debug is off, startup output is limited to essential summary lines (init config, class count, errors only)
- [ ] **LOG-03**: When debug is on, verbose output is shown (individual class resolution, classpath details, javadoc scanning)
- [ ] **LOG-04**: All existing console.log/debug calls routed through logger wrapper that respects debug flag
- [ ] **LOG-05**: Debug setting is hot-reloadable via `didChangeConfiguration` without LS restart

### Diagnostics

- [ ] **DIAG-01**: Parse errors from synthetic/internal files (bbj-api.bbl, functions.bbl) are not shown to the user
- [ ] **DIAG-02**: Javadoc loading reports only a summary error if no javadoc source succeeds (not each failed path)

### Parser

- [ ] **PARSE-01**: Chevrotain "Ambiguous Alternatives Detected" message investigated — root cause documented
- [ ] **PARSE-02**: Ambiguous Alternatives message either fixed (if real grammar issue) or moved behind debug flag (if expected)

### Documentation

- [ ] **DOCS-01**: Debug logging setting documented in Docusaurus docs with instructions for enabling verbose output

## Future Requirements

None — this is a focused cleanup milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Structured logging (Pino/Winston) | External libraries add 200KB-1MB+ for features LSP already provides |
| Per-module log levels | Over-engineering for current needs |
| Log file output/rotation | Language server uses stdio; log files add complexity |
| LSP $/logTrace integration | Standard but unnecessary for current scope |
| Multiple output channels | Adds complexity without value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOG-01 | — | Pending |
| LOG-02 | — | Pending |
| LOG-03 | — | Pending |
| LOG-04 | — | Pending |
| LOG-05 | — | Pending |
| DIAG-01 | — | Pending |
| DIAG-02 | — | Pending |
| PARSE-01 | — | Pending |
| PARSE-02 | — | Pending |
| DOCS-01 | — | Pending |

**Coverage:**
- v3.3 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10 ⚠️

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after initial definition*
