# Phase 8: Run Commands - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can run BBj programs directly from IntelliJ as GUI, BUI, or DWC with one click or keyboard shortcut. The plugin spawns the bbj executable (GUI) or web.bbj (BUI/DWC) and the program runs externally. The plugin does not manage the running process lifecycle beyond launch.

</domain>

<decisions>
## Implementation Decisions

### Run output handling
- None of the three run modes (GUI/BUI/DWC) produce a running process with console output to stream — they launch external GUI windows or browser sessions
- Any output from the bbj process (startup errors, warnings) should be logged to IntelliJ's Event Log for debugging, not shown in a Run tool window
- Successful launch feedback: subtle status bar message (e.g., "Launched MyProgram.bbj (GUI)")
- Multiple simultaneous runs are allowed — each launch is independent, new runs do not kill previous ones

### BUI/DWC browser launch
- Straight port of VSCode behavior — execute web.bbj with the same parameters VSCode uses
- web.bbj handles opening the browser itself; the plugin does not need to detect URLs or launch a browser
- BUI vs DWC distinction (flags, parameters) should match whatever the VSCode extension passes — Claude to discover from VSCode source

### Settings & configuration
- All run-related settings go on the existing single plugin settings page (from v1.0)
- BBj home path already exists with validation — no changes needed there
- Classpath is a known required parameter — add to settings if not already present
- Any additional command-line toggles discovered from the VSCode source should be added to the settings page
- New run-related settings do not need special validation (only BBj home has validation)
- Working directory for all run commands: IntelliJ project root

### Error feedback & states
- BBj home missing/invalid: already handled by existing error banner from v1.0
- Plugin cannot detect BBj runtime errors — errors appear in the BBj GUI/browser, not back to the plugin
- Only detectable error: process-start failures (executable not found, permissions issues) — show as notification balloon
- Run actions (GUI/BUI/DWC) should be disabled or hidden when the active file is not a BBj file type

</decisions>

<specifics>
## Specific Ideas

- "Just do what VSCode does" — the VSCode extension is the reference implementation for all run command behavior
- Parameter discovery: Claude should read the VSCode extension source to determine exact command-line arguments for GUI, BUI, and DWC modes
- Auto-save active file before run (from success criteria)
- Keyboard shortcuts: Alt+G (GUI), Alt+B (BUI), Alt+D (DWC) per success criteria

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-run-commands*
*Context gathered: 2026-02-01*
