# Requirements: BBj Language Server

**Defined:** 2026-08-17
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v4.0 Requirements

Requirements for the v4.0 Stability and Quality milestone. Each maps to exactly one roadmap phase.

**Milestone shape:** discover as much as possible, fix the easy findings, document the expensive ones as detailed GitHub issues for separate resolution.

**Review dimensions** (applied to every in-scope module):

| # | Dimension | What counts as a finding |
|---|-----------|--------------------------|
| D1 | Security | Injection, untrusted input, secret exposure, integrity gaps, privilege/trust boundary errors |
| D2 | Correctness & error handling | Null/undefined safety, unhandled rejections, swallowed exceptions, async races, off-by-one, wrong edge-case behavior, resource leaks |
| D3 | Performance & resource use | Hot-path cost, O(n²) walks, missing caches/debounces, redundant AST traversals, unbounded memory growth |
| D4 | Maintainability & code smells | Duplication, god functions, dead code, tangled coupling, inconsistent patterns, missing abstractions |
| D5 | Test coverage gaps | Untested modules and branches, missing regression tests for past fixes, skipped/disabled tests, brittle setups |
| D6 | Dependency health | Outdated or vulnerable deps (npm + Gradle), license issues, unpinned GitHub Actions |
| D7 | Cross-IDE parity | Behavior present or correct in one IDE but not the other |
| D8 | Comment & doc accuracy | Stale comments, wrong JSDoc, CLAUDE.md and docs-site claims contradicted by code |

### Baseline

- [x] **BASE-01**: PROJECT.md Validated requirements cover everything shipped between v3.9 (`2194616`) and `v0.12.0`, reconstructed from that 153-commit range
- [x] **BASE-02**: PROJECT.md Context, Constraints, and Key Decisions reflect the subsystems added in that range — webview composers, inlay hints, the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`), `Commands/CompilerOptions.ts`, document formatter, line numbering
- [x] **BASE-03**: A module inventory recording review scope, the 8 dimensions, and explicit exclusions exists, so review coverage is auditable rather than assumed (satisfied by 60-01 + 60-02: INVENTORY.md's 21 review units, the applicability grid, and the surface accounting all exist and account for every in-scope file)
- [x] **BASE-04**: MILESTONES.md records the v3.9 → 0.12.0 interval so project history contains no silent six-month gap

### Review Coverage

- [x] **RVW-01**: `bbj-vscode/src/language/` reviewed across all 8 dimensions — grammar, lexer, scope, scope-local, linker, type inferer, validator, `validations/`, completion provider, document builder, document validator, ws-manager, CPL service/parser, java-interop client, `lib/` builtin catalogs
- [x] **RVW-02**: `bbj-vscode/src/` extension host reviewed across all 8 dimensions — `extension.ts`, document formatter, line numbering, tokenized-BBj, decompile-io, `Commands/CompilerOptions.ts`
- [x] **RVW-03**: All four webview composer subsystems reviewed across all 8 dimensions — 11 composer files: msgbox, addwindow, addchildwindow each split across `-composer`/`-ui`/`-webview`; SETOPTS split across `-ui`/`-webview` only (no `-composer.ts`) — plus `setopts-catalog.ts`
- [x] **RVW-04**: `bbj-intellij/` reviewed across all 8 dimensions — run/compile/EM-login actions, settings, `BbjNodeDownloader`, LSP wiring, composer dialogs, status bar widgets, `BbjEMTokenStore`, lexer/parser definitions
- [x] **RVW-05**: Build and CI reviewed across all 8 dimensions — 6 GitHub Actions workflows, Gradle build, esbuild/packaging config, and the three `bbj-vscode/tools/*.bbj` scripts
- [x] **RVW-06**: Every recorded finding carries a concrete verified failure scenario (inputs/state → wrong behavior), confirmed by tracing the code path or reproducing it; findings that cannot be verified are dropped rather than filed
- [x] **RVW-07**: Every finding is checked against the open GitHub issues before it is recorded, so no finding duplicates existing tracker content

### Security

- [x] **SEC-01**: Webview HTML generation audited for injection — every interpolated value into composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is escaped or provably safe, and CSP posture is documented
- [x] **SEC-02**: Webview → extension message handling audited — messages from webview content are validated for shape and value range before acting on them
- [x] **SEC-03**: Node.js runtime download audited for integrity — transport security, checksum or signature verification, archive extraction path traversal (zip-slip), and cache trust
- [x] **SEC-04**: EM token lifecycle audited end to end — acquisition, storage at rest, exposure via process arguments or logs, and expiry handling across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`
- [x] **SEC-05**: Process spawning audited for argument and command injection across every run/compile path in both IDEs, including user-controlled paths, classpath values, and config.bbx settings
- [x] **SEC-06**: java-interop client trust boundary audited — configurable host/port implications, unauthenticated channel, and behavior against a malicious or unresponsive peer
- [x] **SEC-07**: GitHub Actions workflows audited — secret handling, `GITHUB_TOKEN` permission scope, unpinned third-party actions, and script injection via untrusted PR-controlled inputs
- [x] **SEC-08**: Dependency vulnerabilities enumerated for both `npm` and Gradle dependency trees, each triaged as fix-now, file-issue, or accepted-with-reason

### Debt Re-triage

- [x] **DEBT-01**: CPU stability in multi-project workspaces (#232) re-triaged against current code — mitigation implemented, or issue updated with a concrete implementation plan
- [x] **DEBT-02**: The 3 disabled `parser.test.ts` assertions and the skipped TEST-03 case re-triaged — enabled, or documented with the specific blocking limitation and what would unblock them
- [x] **DEBT-03**: Static method return-type inference gap (`String.valueOf(2)` assigns no type) re-triaged — fixed or filed
- [x] **DEBT-04**: FQN path static-only completion filtering re-triaged — fixed or filed, with the JAR-redeployment dependency stated
- [x] **DEBT-05**: LSP4IJ experimental API usage (19 sites) and `BbjCompletionFeature` coupling re-triaged — current risk assessed against the installed LSP4IJ version
- [x] **DEBT-06**: Every carried debt item ends this milestone either fixed or represented by a GitHub issue — none remain recorded only as prose in PROJECT.md
- [ ] **DEBT-07**: CPL-06 hierarchy suppression takes one extra build cycle after the BBjCPL merge (timing nuance, end state correct) re-triaged against current code
- [ ] **DEBT-08**: IntelliJ TextMate bundle's filename-based `config.bbx`/`config.min` registration (`2489001`, #381) — whether JetBrains' TextMate plugin honors `filenames` re-triaged against current code

### Easy Fixes

- [ ] **FIX-01**: Each easy fix is low-risk and contained, and lands as its own atomic commit referencing its finding ID
- [ ] **FIX-02**: Each behavior-changing fix ships with a regression test that fails before the fix and passes after
- [ ] **FIX-03**: After all fixes, `npm test` and `npm run lint` are clean in `bbj-vscode/`, and `./gradlew build` succeeds in `bbj-intellij/`
- [ ] **FIX-04**: No applied fix changes user-facing behavior without that change being recorded in EASY-FIXES.md

### Deliverable Documents

- [ ] **DOC-01**: `.planning/reviews/EASY-FIXES.md` records every easy finding with finding ID, `file:line`, dimension, verified failure scenario, the fix applied, and its commit hash
- [ ] **DOC-02**: `.planning/reviews/MAJOR-REFACTORS.md` records every major finding with finding ID, `file:line`, dimension, verified failure scenario, proposed approach, effort estimate, and proposed labels
- [ ] **DOC-03**: Both documents state review coverage explicitly — modules reviewed, dimensions applied, and what was excluded — so coverage gaps are visible to a reader
- [ ] **DOC-04**: Findings that are neither easy fixes nor major refactors (duplicate, wontfix, already-covered, not-reproducible) are recorded with their disposition and reason rather than dropped silently

### GitHub Issues

- [ ] **ISSUE-01**: The drafted issue list is presented for approval, and nothing is filed to the tracker before that approval
- [ ] **ISSUE-02**: Each filed issue is self-contained — problem statement, evidence with `file:line`, verified failure scenario, proposed approach, and acceptance criteria — readable without the review documents
- [ ] **ISSUE-03**: Each filed issue carries area, `PRIO 1/2/3`, and effort (`2`/`4`/`8`) labels drawn from the repository's existing label set
- [ ] **ISSUE-04**: No filed issue duplicates an existing open issue
- [ ] **ISSUE-05**: MAJOR-REFACTORS.md cross-references the filed issue numbers, so each documented finding is traceable to its tracker entry

## Future Requirements

Acknowledged, not in this roadmap.

### Review Scope Extensions

- **FUT-01**: `java-interop/` Java service reviewed across the same 8 dimensions
- **FUT-02**: Docs-site editorial review (structure, tone, completeness) beyond code-accuracy checks
- **FUT-03**: Automated quality gates in CI derived from this review's findings (lint rules, coverage thresholds, dependency scanning)

### Resolution Work

- **FUT-04**: Implementation of the major refactors filed as issues by this milestone — each resolved in its own dedicated milestone or PR

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Item | Reason |
|------|--------|
| `java-interop/` Java service review | Excluded by scope decision at milestone start; the TypeScript-side client (`java-interop.ts`) is reviewed |
| `bbj-vscode/src/language/generated/` (17.5k LOC) | Machine-generated from `bbj.langium`; the grammar source is reviewed instead |
| Implementing the major refactors | The milestone deliverable is detailed issues for separate resolution — that is the explicit intent |
| Wholesale test-suite authoring | Coverage gaps are reported as findings; only regression tests for applied fixes are written here |
| `bbj-vscode-deprecated/` contents | Contains a stale `.vsix` artifact only, no source; flagged for removal, not reviewed |
| New features of any kind | Quality milestone — behavior changes only where a defect is being fixed |
| Grammar redesign to remove parser ambiguity | v3.3 established all 47 ambiguities resolve correctly; redesign is a language-level project |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BASE-01 | Phase 60 | Complete |
| BASE-02 | Phase 60 | Complete |
| BASE-03 | Phase 60 | Complete |
| BASE-04 | Phase 60 | Complete |
| RVW-06 | Phase 60 | Complete |
| RVW-07 | Phase 60 | Complete |
| RVW-01 | Phase 61 | Complete |
| SEC-06 | Phase 61 | Complete |
| RVW-02 | Phase 62 | Complete |
| RVW-03 | Phase 62 | Complete |
| RVW-04 | Phase 63 | Complete |
| SEC-03 | Phase 63 | Complete |
| RVW-05 | Phase 64 | Complete |
| SEC-07 | Phase 64 | Complete |
| SEC-08 | Phase 64 | Complete |
| SEC-01 | Phase 65 | Complete |
| SEC-02 | Phase 65 | Complete |
| SEC-04 | Phase 65 | Complete |
| SEC-05 | Phase 65 | Complete |
| DEBT-01 | Phase 66 | Complete |
| DEBT-02 | Phase 66 | Complete |
| DEBT-03 | Phase 66 | Complete |
| DEBT-04 | Phase 66 | Complete |
| DEBT-05 | Phase 66 | Complete |
| DEBT-06 | Phase 66 | Complete |
| DEBT-07 | Phase 66 | Pending |
| DEBT-08 | Phase 66 | Pending |
| FIX-01 | Phase 67 | Pending |
| FIX-02 | Phase 67 | Pending |
| FIX-03 | Phase 67 | Pending |
| FIX-04 | Phase 67 | Pending |
| DOC-01 | Phase 68 | Pending |
| DOC-02 | Phase 68 | Pending |
| DOC-03 | Phase 68 | Pending |
| DOC-04 | Phase 68 | Pending |
| ISSUE-01 | Phase 69 | Pending |
| ISSUE-02 | Phase 69 | Pending |
| ISSUE-03 | Phase 69 | Pending |
| ISSUE-04 | Phase 69 | Pending |
| ISSUE-05 | Phase 69 | Pending |

**Coverage:**

- v4.0 requirements: 40 total
- Mapped to phases: 40 (Phases 60-69)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-17*
*Last updated: 2026-08-17 after v4.0 roadmap creation — 100% requirement coverage across Phases 60-69*

*Amended 2026-08-17 by Phase 60 (plan 60-04) under D-15: BASE-01, BASE-02, RVW-03 and SEC-01 texts
corrected in place against the verified tree. See `.planning/reviews/INVENTORY.md` §"D-15 Correction
Log" for the evidence.*
