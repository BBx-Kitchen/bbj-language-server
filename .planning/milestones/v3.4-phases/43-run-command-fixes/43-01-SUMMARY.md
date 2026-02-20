---
phase: 43-run-command-fixes
plan: 01
subsystem: run-commands, auth
tags: [run-commands, token-auth, config-bbx, issue-256, issue-359, issue-244]
dependency_graph:
  requires: ["Phase 42 toolbar polish"]
  provides: ["RUN-01 token auth", "RUN-02 no login loop", "RUN-03 config.bbx path"]
  affects: [Commands.cjs, web.bbj, em-login.bbj, BbjRunGuiAction, BbjRunBuiAction, BbjRunDwcAction, BbjRunActionBase]
tech_stack:
  added: []
  patterns: [config-path-passthrough]
key_files:
  created: []
  modified:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/tools/web.bbj
    - bbj-vscode/tools/em-login.bbj
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
decisions:
  - Removed ? 'HIDE' from em-login.bbj (was corrupting token output)
  - Added configFile! as ARGV(9) to web.bbj for custom config.bbx support
  - Added -c flag to GUI run command for config.bbx path
  - Applied config.bbx support to both VS Code and IntelliJ run commands
metrics:
  duration: 45 minutes
  completed: 2026-02-08
---

# Phase 43 Plan 01: Run Command Fixes - Token Auth and Config.bbx

**One-liner:** Fixed token authentication corruption and added config.bbx path support to all run commands in both IDEs

## Summary

Fixed three interconnected issues with BBj run commands: (1) token authentication was broken because `? 'HIDE'` in em-login.bbj printed "HIDE" to stdout before the JWT token, corrupting it; (2) the same issue in web.bbj caused BUI/DWC launch failures; (3) run commands now pass the `bbj.configPath` setting to the bbj executable and web.bbj runner.

### What Was Built

**Token auth fix:**
- Removed `? 'HIDE'` from `em-login.bbj` — was printing "HIDE\n" before the token, corrupting stdout capture
- Removed `? 'HIDE'` from `web.bbj` — same issue

**Config.bbx support (VS Code):**
- `Commands.cjs run()`: Reads `bbj.configPath` setting, passes as `-c"<path>"` flag to bbj executable
- `Commands.cjs runWeb()`: Passes configPath as new argument to web.bbj

**Config.bbx support (IntelliJ):**
- `BbjRunActionBase.java`: Added `getConfigPathArg()` returning `-c<path>` and `getConfigPath()` methods
- `BbjRunGuiAction.java`: Added configPath arg to command line
- `BbjRunBuiAction.java`: Passes configPath as new argument to web.bbj
- `BbjRunDwcAction.java`: Passes configPath as new argument to web.bbj

**web.bbj runner update:**
- Added `configFile!` as ARGV(9) parameter
- Uses custom config when provided, falls back to `BBjAPI().getConfig().getConfigFileName()` when empty

### Key Implementation Details

1. **Root cause of token auth failure:** `? 'HIDE'` is a BBj print statement that outputs "HIDE" to stdout. The extension reads `stdout.trim()` as the token, getting `"HIDE\n<actual-token>"` — a corrupted value that fails `BBjAdminFactory.getBBjAdmin(token!)`.

2. **Config path chain:** VS Code settings → Commands.cjs → bbj `-c` flag (GUI) or web.bbj ARGV(9) (BUI/DWC) → `app!.setString(app!.CONFIG_FILE, ...)` for EM app registration.

3. **Backward compatibility:** Empty configPath falls back to default behavior in all code paths.

## Deviations from Plan

- Plan focused on VS Code credential passing; actual root cause was `? 'HIDE'` in BBj scripts
- Added IntelliJ side changes (not in original plan) for consistent config.bbx support across both IDEs

## Testing

- VS Code build succeeds
- IntelliJ build succeeds
- 468 tests pass, 6 pre-existing failures unchanged

## Commits

- b785697: fix: token auth and config.bbx for run commands (#256, #359, #244)

## Self-Check: PASSED

All claimed artifacts verified:
- FOUND: em-login.bbj (modified - ? 'HIDE' removed)
- FOUND: web.bbj (modified - ? 'HIDE' removed, configFile! added)
- FOUND: Commands.cjs (modified - configPath added to run/runWeb)
- FOUND: BbjRunActionBase.java (modified - getConfigPathArg/getConfigPath added)
- FOUND: BbjRunGuiAction.java, BbjRunBuiAction.java, BbjRunDwcAction.java (modified)
- FOUND: commit b785697
