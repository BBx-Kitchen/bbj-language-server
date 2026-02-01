# Phase 4: Language Server Integration - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect IntelliJ plugin to the existing BBj language server (Langium-based, Node.js) via LSP4IJ. Deliver core LSP features: diagnostics, code completion, go-to-definition, hover, parameter hints. Manage server process lifecycle (start, restart, crash recovery, clean shutdown). All language intelligence comes from the existing language server via LSP protocol — the plugin wires it through, it does not add its own logic.

</domain>

<decisions>
## Implementation Decisions

### Status bar widget
- Show icon + state label: "BBj: Ready", "BBj: Starting", "BBj: Error"
- Icon color changes to reflect state (green = ready, yellow = starting, red = error)
- Position on right side of status bar (conventional position)
- Only visible when a BBj file is open in the editor
- Click opens popup menu with three actions: Restart Server, Open Settings, Show Server Log
- Detailed tooltip on hover showing server version, PID, uptime, Node.js path

### Notification & error UX
- Server crash triggers both: balloon notification (immediate attention) + editor banner (persistent until resolved)
- Crash notification shows short message ("BBj Language Server crashed unexpectedly") with "Show Log" action link — no raw error details in the notification
- Auto-restart once after crash; if second crash occurs, stop and notify user (prevents crash loops)
- Dedicated "BBj Language Server" tool window tab (bottom panel, like Run/Debug) for real-time server stdout/stderr log output

### Server lifecycle
- Lazy startup — server starts when first BBj file is opened, not on project open
- Settings changes (BBj home, Node.js path, classpath) trigger debounced restart (short delay to batch multiple setting changes)
- Project close force-kills server process immediately (no graceful shutdown wait)
- "Restart BBj Language Server" Tools menu action only visible when a BBj file is focused in editor

### LSP feature wiring
- All completion, diagnostics, navigation, hover, and parameter hints come from the language server via LSP protocol — plugin uses LSP4IJ defaults for rendering
- Add BBj-specific icons for completion item kinds where LSP completion kind maps to BBj concepts
- No custom completion logic, sorting, or filtering beyond what LSP provides
- Log level configurable in settings (Error, Warn, Info, Debug dropdown) — passed to language server on startup

### Claude's Discretion
- Startup spinner/animation approach for the status bar widget
- Exact debounce timing for settings-change restart
- LSP4IJ configuration details and server definition approach
- How to map LSP completion kinds to BBj-specific icons
- Tool window implementation details

</decisions>

<specifics>
## Specific Ideas

- Status bar widget should feel like standard IntelliJ language tool widgets (right side, conventional)
- Crash notification pattern: balloon for urgency + banner for persistence — both present simultaneously
- "All the intelligence comes from Langium/LSP" — plugin is a thin wiring layer, not adding its own logic
- Future enhancements to completion/navigation beyond LSP can be brainstormed later as separate phases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-language-server-integration*
*Context gathered: 2026-02-01*
