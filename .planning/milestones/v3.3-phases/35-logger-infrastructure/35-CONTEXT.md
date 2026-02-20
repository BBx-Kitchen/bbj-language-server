# Phase 35: Logger Infrastructure - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a lightweight logger singleton for level-based logging with zero overhead when disabled. This is the foundation layer that all subsequent phases (settings plumbing, console migration) build on. Scope is the logger module itself — wiring it to settings and migrating call sites are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Output format
- No level prefix on log lines (no `[INFO]`, `[WARN]` etc.)
- Timestamps included in debug mode only (when level is DEBUG)
- Component tag on debug messages via scoped loggers (e.g. `[java-interop] Loading classes...`)
- Non-debug messages (info, warn, error) are plain text without tags

### Log level defaults
- Default level before settings load: ERROR only (quietest possible startup)
- After settings load with debug OFF: WARN (warnings and errors visible)
- After settings load with debug ON: DEBUG (everything visible)
- Simple toggle: `bbj.debug` boolean maps to WARN (off) or DEBUG (on) — no intermediate level setting
- Logger announces level changes (e.g. "Log level changed to DEBUG") when level is updated

### API surface
- Singleton logger with `info()`, `warn()`, `error()`, `debug()` methods
- Lazy message evaluation via callback form: `logger.debug(() => \`Found ${classes.length} classes\`)` — lambda only runs if DEBUG is on
- Scoped logger factory: `logger.scoped('java-interop')` returns a child logger that prepends component tag to debug messages
- Scoped loggers expose debug-level methods only (debug output is where component tags matter)
- Level check methods: `logger.isDebug()` for conditional blocks with multiple debug statements
- `setLevel()` method for runtime level changes

### Error handling
- `console.error()` calls stay raw — not migrated to the logger (guaranteed visible, no abstraction)
- `logger.error()` exists for API completeness — always emits regardless of level
- `logger.warn()` is filtered by level (suppressed during quiet startup when level is ERROR)
- Logger uses `console.error()` under the hood for error output (direct to stderr, works before LSP connection)

### Claude's Discretion
- Exact scoped logger implementation (thin wrapper vs class)
- How timestamps are formatted in debug mode
- File organization (single file vs split types/implementation)
- Whether `logger.info()` uses `console.log()` or `console.info()` under the hood

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint is the ~60-line singleton pattern decided in STATE.md research.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-logger-infrastructure*
*Context gathered: 2026-02-08*
