---
phase: 31-extension-settings-file-types
plan: 01
subsystem: ide
tags: [vscode, bbx, interop, settings, configuration, java-interop]

# Dependency graph
requires: []
provides:
  - ".bbx file support in VS Code (treated as BBj language)"
  - "Configurable interop host/port settings (bbj.interop.host, bbj.interop.port)"
  - "Configurable config.bbx path (bbj.configPath)"
  - "Hot reload for interop settings via onDidChangeConfiguration"
affects: ["31-03", "31-04"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["configuration hot-reload via onDidChangeConfiguration"]

key-files:
  created: []
  modified:
    - "bbj-vscode/package.json"
    - "bbj-vscode/src/extension.ts"
    - "bbj-vscode/src/language/java-interop.ts"
    - "bbj-vscode/src/language/main.ts"
    - "bbj-vscode/src/language/bbj-ws-manager.ts"

key-decisions:
  - "Merged .bbx into BBj language instead of keeping separate language entry"
  - "Default interop connection remains localhost:5008 when no settings configured"
  - "configPath setting overrides default {bbj.home}/cfg/config.bbx location"
  - "Hot reload via clearCache() + reconnect ensures settings take effect without restart"

patterns-established:
  - "Settings passed via initializationOptions from extension.ts to language server"
  - "onDidChangeConfiguration extracts BBj settings and applies to services before cache clear"
  - "setConnectionConfig() updates connection params, clearCache() forces reconnect with new settings"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 31 Plan 01: Extension Settings & File Types Summary

**.bbx files treated as BBj language with configurable java-interop host/port and custom config.bbx path support**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T14:07:04Z
- **Completed:** 2026-02-07T14:10:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- .bbx files now use BBj language (same icon, syntax highlighting, completion, run commands)
- Configurable java-interop connection (bbj.interop.host, bbj.interop.port settings)
- Configurable config.bbx location (bbj.configPath setting)
- Hot reload support for all three settings via onDidChangeConfiguration

## Task Commits

Each task was committed atomically:

1. **Task 1: Merge .bbx into BBj language and add interop settings** - `185e9b0` (feat)
2. **Task 2: Make java-interop connection configurable** - `44d998b` (feat)

## Files Created/Modified
- `bbj-vscode/package.json` - Merged .bbx into BBj language extensions, removed separate bbx language/grammar, added bbj.configPath, bbj.interop.host, and bbj.interop.port settings
- `bbj-vscode/src/extension.ts` - Pass interopHost, interopPort, and configPath in initializationOptions
- `bbj-vscode/src/language/java-interop.ts` - Added setConnectionConfig() method, removed DEFAULT_PORT constant, use configurable host/port in createSocket()
- `bbj-vscode/src/language/main.ts` - Extract interop and configPath settings from onDidChangeConfiguration, apply via setConnectionConfig() and setConfigPath()
- `bbj-vscode/src/language/bbj-ws-manager.ts` - Extract settings from initializationOptions, use configPath to locate config.bbx when set (falls back to bbjdir/cfg/config.bbx), added setConfigPath() method

## Decisions Made

**1. Merged .bbx into BBj language**
- Rationale: .bbx files should get full BBj language treatment (same icon, completion, diagnostics, run commands). Separate language ID was unnecessary distinction.

**2. Default interop connection is localhost:5008**
- Rationale: Maintains backward compatibility. Existing installations work without configuration. Settings provide override for remote deployments.

**3. configPath setting overrides default location**
- Rationale: Enables custom config.bbx for non-standard BBj installations or multi-environment setups. Falls back to {bbj.home}/cfg/config.bbx for standard installations.

**4. Hot reload via clearCache() + reconnect**
- Rationale: Settings changes take effect immediately via onDidChangeConfiguration. clearCache() disposes existing connection, next operation creates new connection with updated host/port.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- .bbx file support complete for VS Code
- Configurable interop settings ready for 31-03 (IntelliJ equivalent)
- Config.bbx path setting ready for CONF-01 user stories
- Hot reload pattern established for future settings

---
*Phase: 31-extension-settings-file-types*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified.
