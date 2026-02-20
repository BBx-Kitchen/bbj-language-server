# Requirements: BBj Language Server

**Defined:** 2026-02-19
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v3.7 Requirements

Requirements for Diagnostic Quality & BBjCPL Integration milestone. Each maps to roadmap phases.

### Diagnostic Noise Reduction

- [x] **DIAG-01**: Suppress cascading linking/validation errors when parser errors exist — only show the actual syntax errors, not downstream noise
- [x] **DIAG-02**: Show warnings/hints only when no hard errors present from any source — clean diagnostic hierarchy across all error levels

### Outline Resilience

- [x] **OUTL-01**: Document symbols survive syntax errors without crashing — Structure View does not go blank or throw errors on partial ASTs
- [x] **OUTL-02**: Methods/classes before and after error point visible in Structure View — syntax error in one method does not hide other methods in the outline

### BBjCPL Foundation

- [x] **CPL-01**: Discover BBjCPL error output format via test fixtures — run compiler against known-bad files, capture actual stderr format, create test data
- [x] **CPL-02**: Invoke BBjCPL using bbj.home path with -N flag (check-only mode) — cross-platform process spawning with proper path handling
- [x] **CPL-03**: Parse BBjCPL stderr into LSP diagnostics with accurate line numbers — error output parser validated against real compiler output
- [x] **CPL-04**: Safe process management — abort on re-edit, no orphaned processes, configurable timeout, AbortController lifecycle

### BBjCPL Diagnostics

- [x] **CPL-05**: BBjCPL diagnostics labeled with source "BBjCPL" — distinct from Langium "bbj" source for user clarity
- [x] **CPL-06**: Diagnostic hierarchy — BBjCPL errors shown first; Langium parser errors only when BBjCPL reports clean; warnings/hints only when no hard errors
- [x] **CPL-07**: Configurable trigger setting — on-save (default) or debounced invocation, controlled via bbj.compiler.trigger setting
- [ ] **CPL-08**: BBjCPL integration degrades gracefully when BBj not installed — no errors, no UI noise, Langium diagnostics work as before

## Future Requirements

Deferred to subsequent milestones. Tracked but not in current roadmap.

### BBjCPL Advanced

- **CPL-A01**: Static type checking via -t flag with configurable prefix/config file
- **CPL-A02**: Undeclared variable warnings via -W flag (requires -t)
- **CPL-A03**: BBjCPL pipe mode (stdin) for reduced JVM startup overhead
- **CPL-A04**: Diagnostic range correlation — map BBjCPL line errors to exact token ranges from Langium AST

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| BBjCPL compilation output (.bbj tokenized files) | v3.7 is check-only (-N flag); compilation is a separate feature |
| BBjCPL type checking (-t flag) | Requires prefix/config file setup; defer to v3.8+ |
| Custom Chevrotain error recovery rules | High complexity; research showed defensive symbol provider is sufficient |
| Parser grammar changes for better error recovery | Grammar is stable; outline resilience solved at symbol provider level |
| IntelliJ-specific BBjCPL UI (tool window, gutter icons) | Both IDEs consume same LSP diagnostics; no IDE-specific work needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DIAG-01 | Phase 50 | Complete |
| DIAG-02 | Phase 50 | Complete |
| OUTL-01 | Phase 51 | Complete |
| OUTL-02 | Phase 51 | Complete |
| CPL-01 | Phase 52 | Complete |
| CPL-02 | Phase 52 | Complete |
| CPL-03 | Phase 52 | Complete |
| CPL-04 | Phase 52 | Complete |
| CPL-05 | Phase 53 | Complete |
| CPL-06 | Phase 53 | Complete |
| CPL-07 | Phase 53 | Complete |
| CPL-08 | Phase 53 | Pending |

**Coverage:**
- v3.7 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation — all 12 requirements mapped*
