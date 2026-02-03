# Phase 5: Java Interop - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Java class and method completions work via the java-interop service running inside BBjServices. The language server manages the java-interop connection autonomously — the plugin passes configuration (host/port) and surfaces connection status to the user. Localhost-only for now.

</domain>

<decisions>
## Implementation Decisions

### Connection lifecycle
- Plugin passes java-interop host/port to the language server via initialization options — server connects on its own
- Localhost-only constraint for this phase (no remote BBjServices support)
- Default port is 5008; auto-detect from BBjServices config first, fall back to 5008, user can override
- Need to empirically determine what happens when BBjServices isn't running — researcher should investigate language server behavior on java-interop unavailability
- If java-interop becomes available after server start, a language server restart (with user interaction) is the expected path to reconnect
- Researcher should investigate how VS Code extension currently configures java-interop host/port

### Status & feedback
- Separate status bar indicator for java-interop (not combined with the existing LSP widget)
- Only visible when a BBj file is open (same visibility rule as existing LSP widget)
- Clicking the indicator shows a details popup with host, port, connection duration, and a "Reconnect" action

### Degraded mode behavior
- Persistent editor banner when java-interop is unavailable (non-dismissible, like missing BBj home banner)
- Simple banner message: "Start BBjServices for Java completions" with action link to open settings
- When java-interop is down: BBj-native completions (keywords, built-in functions, local variables) still work; Java class/method completions and BBj class resolution via PREFIX search path are unavailable
- Brief grace period before showing banner on mid-session disconnect (avoid flashing on transient disconnects)

### Settings & configuration
- Java-interop settings live on the existing BBj settings page (no separate page/section)
- Host displayed as static "localhost" text (not editable) — clearly indicates localhost-only for now
- Port field next to the static host text, defaulting to auto-detected or 5008
- Auto-detection priority: BBjServices config > 5008 default > user override
- Changing port triggers a debounced language server restart (consistent with existing settings behavior)

### Claude's Discretion
- Exact states for the java-interop status indicator (connected/connecting/disconnected or simpler)
- Grace period duration for transient disconnect tolerance
- Details popup layout and actions beyond "Reconnect"
- Auto-detection mechanism for reading BBjServices config (file path, parsing)

</decisions>

<specifics>
## Specific Ideas

- Banner should feel consistent with existing "missing BBj home" banner — same visual pattern, just different message
- Status indicator should be visually distinct from the LSP widget but feel like it belongs in the same family
- The port auto-detection from BBjServices config is a "nice to have" — if it's complex, defaulting to 5008 is acceptable

</specifics>

<deferred>
## Deferred Ideas

- Remote BBjServices support (non-localhost) — future phase or backlog
- Editable host field for remote connections — blocked until remote support is scoped

</deferred>

---

*Phase: 05-java-interop*
*Context gathered: 2026-02-01*
