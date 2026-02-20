# Phase 53: BBjCPL Diagnostic Integration - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the BBjCPL compiler service (Phase 52) into the document lifecycle so compiler errors appear in the Problems panel on save or debounced, labeled "BBjCPL", with diagnostic hierarchy enforced against Langium diagnostics, configurable trigger modes, and graceful degradation when BBj is not installed.

</domain>

<decisions>
## Implementation Decisions

### Diagnostic hierarchy rules
- BBjCPL and Langium diagnostics are **merged**, not replaced — errors on the same line combine into a single diagnostic entry
- When both sources report an error on the same line, **prefer the Langium message** (usually more detailed) but keep "BBjCPL" as the source label since the compiler confirmed the error
- BBjCPL-only errors (lines where Langium has no matching error) **always appear** with source "BBjCPL" — they catch things Langium misses like linking and classpath issues
- When BBjCPL reports clean (no errors), **Langium errors still show** — the compiler being happy doesn't suppress Langium-detected issues

### Trigger & configuration
- Three trigger modes: `"on-save"`, `"debounced"`, and `"off"` via `bbj.compiler.trigger` setting
- **Default: `"debounced"`** — errors appear as you type after a 2-second pause, similar to TypeScript
- When switching trigger mode at runtime (e.g., debounced to off), **existing BBjCPL diagnostics stay visible until the next file event** — they're not cleared immediately

### Degradation & edge cases
- When BBj is not installed: **status bar indicator** shows "BBjCPL: unavailable" (no popup notification)
- BBjCPL availability is **detected lazily on first trigger** — not checked at startup. Status bar reflects availability after first compile attempt
- If trigger setting is "on-save" or "debounced" but BBjCPL isn't available: **leave the setting as-is**. Status bar shows unavailable. If BBj is installed later, it starts working without reconfiguration
- Runtime failures (classpath error, corrupt installation): Claude's discretion on surfacing

### Rapid-save debouncing
- Rapid saves use **trailing edge debounce** — wait for a 500ms quiet period after the last save, then compile
- **Clear-then-show** diagnostic updates — old BBjCPL diagnostics are cleared when compile starts, new ones appear when done (brief empty period is acceptable)
- In-flight compile cancellation strategy: Claude's discretion based on Phase 52 process lifecycle

### Claude's Discretion
- Runtime failure surfacing approach (output channel vs status bar warning)
- In-flight compile cancellation strategy (abort vs let-finish-discard)
- Exact status bar text and icon states
- Debounced mode typing-pause detection implementation

</decisions>

<specifics>
## Specific Ideas

- Merging same-line errors: Langium has the better description, so use Langium's message text with BBjCPL source attribution
- Debounced mode should feel like TypeScript's error checking in VS Code — errors appear naturally after you stop typing
- Status bar should communicate BBjCPL state without being intrusive — similar to how VS Code shows language server status

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 53-bbjcpl-diagnostic-integration*
*Context gathered: 2026-02-20*
