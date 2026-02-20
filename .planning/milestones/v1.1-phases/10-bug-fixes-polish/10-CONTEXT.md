# Phase 10: Bug Fixes & Polish - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve all 7 carried-forward v1.0 issues: comment toggling (REM), bracket matching, LSP Symbol popup, LS shutdown grace period, completion icons, stale META-INF, and Linux code path review. No new features — purely fixing and polishing existing functionality.

</domain>

<decisions>
## Implementation Decisions

### Comment toggling (FIX-01)
- REM placed at column 0, before indentation: `REM    code here`
- When commenting: always add `REM ` (with trailing space) to every line, including empty lines
- Mixed selections (some lines already have REM): comment ALL lines — stack REM if needed (`REM REM original`), so uncommenting preserves original REM prefixes
- When uncommenting: strip exactly one `REM ` (or `REM` if no space follows) from the beginning of each line — match what exists, don't assume space

### LS shutdown grace period (FIX-04)
- 30-second grace period after the last BBj file closes before shutting down the language server
- Per-project scope — each IntelliJ project has its own LS instance and independent grace period
- Reuse running LS — if a BBj file reopens during grace period, cancel the shutdown timer and keep the same LS process
- Status bar hint during grace period — subtle indication (e.g., dimmed icon or "idle" text) so user knows the LS is still alive but winding down

### Completion icons (FIX-05)
- Use IntelliJ platform icons (AllIcons.Nodes.*), not custom BBj brand icons — consistent with other language plugins
- Map CompletionItemKind from LS to platform icons: Function, Class, Array, Event, Package, Field, plus a distinct Keyword icon for BBj keywords
- Java class/method completions from java-interop should show Java-specific icons to distinguish them from BBj completions
- Remove orphaned BbjCompletionFeature icon code entirely and replace with clean platform icon mapping

### Linux code path review (FIX-07)
- Target: desktop Linux distros (Ubuntu, Fedora, Arch) and CI/Docker headless environments
- Code review + fix pass only — no Linux runtime testing available
- BBj installation path: typically `/opt/bbx`, but fully determined by user's BBj home setting — executable at `{bbj_home}/bin/bbj`, same name as macOS
- Main concerns: Node.js detection paths, process spawning (shell quoting, path separators in classpath `:` vs `;`), downloaded Node.js binary permissions

### Claude's Discretion
- Bracket matching implementation approach (FIX-02) — standard IntelliJ BracePairProvider pattern
- LSP Symbol popup suppression method (FIX-03) — whatever effectively hides or replaces the placeholder text
- Stale META-INF cleanup approach (FIX-06) — delete or consolidate as appropriate
- Exact status bar text/icon for LS grace period indicator

</decisions>

<specifics>
## Specific Ideas

- Comment stacking (`REM REM ...`) is important — lets users comment out blocks that already contain REM comments and get them back intact when uncommenting
- Platform icons for completion items should feel native — a Java developer switching to BBj shouldn't see unfamiliar icons in the completion popup

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-bug-fixes-polish*
*Context gathered: 2026-02-02*
