---
phase: quick-1
plan: 01
subsystem: vscode-extension
tags: [bugfix, output-channel, debug-logging]
dependency_graph:
  requires: []
  provides:
    - shared-output-channel-pattern
  affects:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/src/extension.ts
tech_stack:
  added: []
  patterns:
    - singleton-output-channel
key_files:
  created: []
  modified:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/src/extension.ts
decisions: []
metrics:
  duration_minutes: 1
  completed_date: 2026-02-08
---

# Quick Task 1: Fix Duplicate BBj Output Channels

**One-liner:** Eliminated duplicate output channel creation by sharing single BBj channel from extension.ts with Commands.cjs module

## Summary

Fixed a bug where each BBj run command (GUI, BUI, DWC) created a new "BBj" output channel when debug mode was enabled, resulting in multiple duplicate channels in the VS Code output panel. The extension already created a single output channel during activation but Commands.cjs was ignoring it and creating its own on each invocation.

## Changes Made

### Task 1: Share output channel from extension.ts to Commands.cjs

**Modified `bbj-vscode/src/Commands/Commands.cjs`:**
- Added module-level `outputChannel` variable to store shared channel reference
- Added `setOutputChannel(channel)` function to receive channel from extension
- Replaced `vscode.window.createOutputChannel('BBj')` in `runWeb()` function (line 95) with `outputChannel.appendLine()`
- Replaced `vscode.window.createOutputChannel('BBj')` in `Commands.run()` function (line 230) with `outputChannel.appendLine()`
- Exported `setOutputChannel` alongside the Commands object
- Added null check: `if (isDebug && outputChannel)` to safely handle cases where channel isn't set

**Modified `bbj-vscode/src/extension.ts`:**
- Called `(Commands as any).setOutputChannel(outputChannel)` immediately after creating the output channel on line 348
- Reused existing TypeScript import pattern with type assertion to access CommonJS mixed exports

**Commits:**
- `0d2aa25`: fix(quick-1): eliminate duplicate BBj output channels

## Verification Results

1. `grep -c "createOutputChannel" bbj-vscode/src/Commands/Commands.cjs` → 0 (all removed)
2. `grep -c "setOutputChannel" bbj-vscode/src/Commands/Commands.cjs` → 2 (definition + export)
3. `grep -c "setOutputChannel" bbj-vscode/src/extension.ts` → 1 (calling it)
4. `npm run build` → Success, no compilation errors

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

**Pattern:** Singleton output channel shared via setter injection

**Before:** Each debug-enabled run created new channel:
```js
const out = vscode.window.createOutputChannel('BBj');
out.appendLine(`${client} run: ${debugCmd}`);
```

**After:** Uses shared channel passed from extension:
```js
if (isDebug && outputChannel) {
  outputChannel.appendLine(`${client} run: ${debugCmd}`);
}
```

**Impact:**
- No more duplicate "BBj" channels in output panel
- All debug output consolidated in single channel
- Consistent with existing EM login debug pattern (which already used the shared channel)

## Files Modified

- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/Commands/Commands.cjs` (+7 / -4 lines)
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/extension.ts` (+1 line)

## Self-Check: PASSED

**Created files:** None required for this task

**Modified files exist:**
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/Commands/Commands.cjs
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/extension.ts

**Commits exist:**
- FOUND: 0d2aa25 (fix(quick-1): eliminate duplicate BBj output channels)
