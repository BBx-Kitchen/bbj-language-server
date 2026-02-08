---
phase: quick-3
plan: 01
subsystem: vscode-extension
tags: [bugfix, output-channel, LanguageClient]

dependency-graph:
  requires: [quick-1]
  provides: [single-output-channel]
  affects: [extension.ts, LanguageClient]

tech-stack:
  added: []
  patterns: [shared-output-channel]

key-files:
  created: []
  modified:
    - bbj-vscode/src/extension.ts

decisions:
  - "Use 'channel' as parameter name to avoid shadowing module-level 'outputChannel' variable"

metrics:
  duration: 49s
  tasks: 1
  files-modified: 1
  completed: 2026-02-08
---

# Quick Task 3: Fix Duplicate BBj Output Channel (LanguageClient)

**One-liner:** Pass shared output channel to LanguageClient via clientOptions to prevent automatic channel creation

## Context

Quick Task 1 (commit e0e3306) fixed duplicate channels created by Commands.cjs, but a second "BBj" output channel still appeared in VS Code. Root cause: `new LanguageClient('bbj', 'BBj', serverOptions, clientOptions)` automatically creates its own output channel named "BBj" when no `outputChannel` property is provided in `clientOptions`. Combined with the explicit `createOutputChannel('BBj')` on line 347, this produced TWO "BBj" channels.

## What Was Done

### Task 1: Pass shared output channel to LanguageClient via clientOptions

**Changes to bbj-vscode/src/extension.ts:**

1. **Modified function signature (line 529):**
   - Changed `startLanguageClient(context: vscode.ExtensionContext): LanguageClient`
   - To `startLanguageClient(context: vscode.ExtensionContext, channel: vscode.OutputChannel): LanguageClient`
   - Used `channel` as parameter name to avoid shadowing module-level `outputChannel` variable

2. **Added output channel to clientOptions (line 566):**
   - Added `outputChannel: channel` property to `clientOptions` object
   - Placed after `initializationOptions` block

3. **Updated call site (line 349):**
   - Changed `client = startLanguageClient(context);`
   - To `client = startLanguageClient(context, outputChannel);`

**Result:** LanguageClient now reuses the shared channel instead of creating a new one. Only ONE `createOutputChannel('BBj')` call exists in the entire codebase (line 347).

**Commit:** 937abf7

## Verification

1. ✅ `npm run build` completed successfully with no TypeScript errors
2. ✅ Only ONE call to `createOutputChannel` exists in bbj-vscode/src/ (line 347 of extension.ts)
3. ✅ `outputChannel: channel` property confirmed in clientOptions (line 566)

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**Before:** Two "BBj" output channels appeared in VS Code's output panel (one from extension.ts:347, one auto-created by LanguageClient)

**After:** Only one "BBj" output channel appears, shared between:
- Extension debug logging
- Commands.cjs output (from Quick Task 1)
- LanguageClient output

## Technical Details

**LanguageClientOptions type definition** (from vscode-languageclient/lib/common/client.d.ts:235):
```typescript
export interface LanguageClientOptions {
    outputChannel?: OutputChannel;
    // ... other properties
}
```

When `outputChannel` is undefined, the LanguageClient constructor internally calls `vscode.window.createOutputChannel(name)` using the client name ("BBj") to create its own channel. By explicitly providing the shared channel, we prevent this automatic creation.

## Self-Check: PASSED

**Created files:** None

**Modified files:**
- ✅ FOUND: bbj-vscode/src/extension.ts

**Commits:**
- ✅ FOUND: 937abf7

## Next Steps

None - quick task complete. When loaded in VS Code, only ONE "BBj" output channel will appear.
