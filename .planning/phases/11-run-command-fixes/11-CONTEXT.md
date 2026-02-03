# Phase 11: Run Command Fixes - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix broken run commands (GUI/BUI/DWC) so they work reliably across platforms. Fix executable resolution bug, fix toolbar visibility in new UI, add context menu invocation, and route process stderr to existing LS log window. Cross-platform verification on macOS and Windows.

</domain>

<decisions>
## Implementation Decisions

### Console output behavior
- BBj handles its own UI output — no dedicated console tool window needed
- Process stderr and startup errors go to the existing language server log window
- Log window auto-opens only on error (not on every run)
- RUN-03 is redefined: process stderr/startup logging to LS log window, not a separate console

### Error handling
- Validate BBj Home is set and executable exists BEFORE attempting to launch the process
- If validation fails, log error to LS log window (no notification balloon, no auto-open settings)
- All run modes (GUI/BUI/DWC) use the same error handling — no mode-specific differences
- The executable resolution bug ("not found" despite valid BBj Home) needs code investigation — cause is unknown

### Toolbar & invocation
- Toolbar buttons must work in IntelliJ new UI — investigate how new UI handles custom toolbar actions and pick compatible approach
- Add right-click context menu: right-click .bbj file → Run as GUI/BUI/DWC submenu
- Run actions available from both editor (focused file) AND project tree (right-click file)
- Keep existing keyboard shortcuts: Alt+G (GUI), Alt+B (BUI), Alt+D (DWC)

### Run lifecycle
- Fire and forget — no status bar tracking of running BBj programs
- No stop button — user closes BBj application window directly
- Keep auto-save before run (existing behavior)
- No browser auto-open for BUI/DWC — BBj handles that itself

### Claude's Discretion
- Exact error message wording for validation failures
- How to structure the context menu (flat vs submenu)
- Which new UI toolbar API to use (research should determine this)

</decisions>

<specifics>
## Specific Ideas

- BBj programs are "fire and forget" from IntelliJ's perspective — BBj manages its own windows, web server, and browser
- The IntelliJ plugin's job is just to launch the process correctly and report if it fails to start
- Process stderr is the only meaningful output to capture — stdout is not expected

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-run-command-fixes*
*Context gathered: 2026-02-02*
