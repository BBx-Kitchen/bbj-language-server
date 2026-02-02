# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — through a single shared language server.
**Current focus:** v1.2 Run Fixes & Marketplace

## Current Position

Milestone: v1.2 Run Fixes & Marketplace
Phase: 12 (Marketplace Preparation) — COMPLETE
Plan: 2 of 2 complete
Status: Plugin verifier compliance complete, ready for Marketplace submission
Last activity: 2026-02-02 — Completed 12-02-PLAN.md

Progress: ████████████████████████░ 96% (25/26 plans complete)

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-12 | 4+ | In progress |

See: .planning/MILESTONES.md

## Accumulated Context

### Known Issues

1. Structure View symbol kind differentiation — labels, variables, and fields all show same icon (SymbolKind.Field) due to BBjNodeKindProvider default case. Language server issue. (Deferred from v1.1)
2. ~~Run commands broken — BBj executable "not found" despite configured BBj Home path.~~ **FIXED in 11-01**
3. ~~Run command output not captured in IntelliJ console tool window~~ **FIXED in 11-01 — stderr now routed to LS log window**
4. ~~Toolbar buttons not visible in new UI.~~ **FIXED in 11-02 — replaced with ProjectViewPopupMenu submenu**

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02T20:44:41Z
Stopped at: Completed 12-02-PLAN.md
Resume file: None
Next: Phase 12 complete. Ready for Marketplace submission.

## Recent Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Use java.nio.file.Files API for executable resolution | 11-01 | Handles symbolic links correctly (JDK-4956115), fixes "not found" errors |
| Route run command errors to LS log window only (no balloons) | 11-01 | Centralized error output, auto-show only on errors |
| Attach ProcessAdapter before startNotify() | 11-01 | Captures early stderr output (per RESEARCH.md pitfall #3) |
| Pre-launch validation before process spawn | 11-01 | Catches BBj Home, directory, executable issues before confusing errors |
| Remove MainToolBar, add ProjectViewPopupMenu submenu | 11-02 | MainToolBar hidden in IntelliJ new UI (2024.2+) |
| Gate run actions on LS started status | 11-02 | Prevents bad state when LS stopped via grace period |
| Move process launch off EDT to pooled thread | 11-02 | Prevents UI freezing during process startup |
| Eager BBj Home auto-detection in getState() | 11-02 | Users shouldn't need to visit settings dialog for auto-detection |
| Only list features with confirmed codebase implementation evidence | 12-01 | Ensures honest marketplace listing (CONTEXT.md requirement) |
| Remove CDATA wrapper from Gradle changeNotes | 12-01 | patchPluginXml adds it automatically; manual wrapper causes build error |
| Use recommended() for pluginVerification IDE selection | 12-01 | Auto-aligns with sinceBuild/untilBuild, prevents version mismatches |
| Changed plugin ID from 'com.basis.bbj.intellij' to 'com.basis.bbj' | 12-02 | Marketplace rule: no 'intellij' keyword in plugin ID |
| Changed untilBuild to '242.*' wildcard format | 12-02 | Empty string not allowed; wildcard format required for version compatibility |
