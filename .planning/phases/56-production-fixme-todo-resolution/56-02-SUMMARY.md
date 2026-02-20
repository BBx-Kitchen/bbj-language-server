---
phase: 56-production-fixme-todo-resolution
plan: 02
subsystem: language-features
tags: [completion, java-interop, javadoc, notifications, ux]
dependency_graph:
  requires: []
  provides: [TODO-01, TODO-02]
  affects: [bbj-completion-provider, java-interop, bbj-notifications]
tech_stack:
  added: []
  patterns: [isolation-module, pre-populated-docu-field, isDocumented-type-guard]
key_files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/src/language/bbj-notifications.ts
decisions:
  - "Use node.docu pre-populated field (set by java-interop.ts at class resolution time) for synchronous Javadoc access in completion provider — avoids async getDocumentation() call in synchronous createReferenceCompletionItem()"
  - "Show Javadoc signature as java code block + javadoc description as markdown in documentation panel"
  - "Fall back to documentationHeader() when node.docu is not populated"
  - "notifyJavaConnectionError uses window.showErrorMessage (error severity) as it is a user-actionable problem requiring attention"
  - "No deduplication guard on notifyJavaConnectionError — per plan design, error shown per connection attempt"
metrics:
  duration: 2m 15s
  completed_date: 2026-02-20
  tasks_completed: 2
  files_modified: 3
  commits: 2
---

# Phase 56 Plan 02: TODO-01 and TODO-02 Implementation Summary

Javadoc-enriched Java method completions and Error-level IDE notification on Java connection failure, resolving both actionable TODOs.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement TODO-01 — Javadoc integration in completion provider | 9884644 | bbj-completion-provider.ts |
| 2 | Implement TODO-02 — Java connection error notification | 1d1ddca | java-interop.ts, bbj-notifications.ts |

## What Was Built

### Task 1: Javadoc Enrichment in Completion Provider (TODO-01)

**bbj-completion-provider.ts:**
- Added `isDocumented` to imports from `./generated/ast.js`
- Removed TODO comment "load param names for java methods from Javadoc" — param names were already handled via `realName` field in `FunctionNodeDescription` (set by `java-interop.ts` lines 400-409 during class resolution)
- Replaced the static `documentationHeader()` fallback with a Javadoc-aware documentation block:
  - Checks `isDocumented(node) && node.docu` for pre-populated Javadoc data
  - Shows `node.docu.signature` as a java code fence block
  - Shows `node.docu.javadoc` as markdown text below the code block
  - Falls back to `documentationHeader(node)` when `node.docu` is not set
  - The synchronous approach uses the pre-populated `docu` field set at class resolution time (same pattern as `bbj-hover.ts` sync fallback)

### Task 2: Java Connection Error Notification (TODO-02)

**bbj-notifications.ts:**
- Added `notifyJavaConnectionError(errorDetail: string): void` following the existing isolation module pattern
- Uses `_connection?.window.showErrorMessage()` for Error-level prominence
- Message guides users to check BBj Services is running and verify host/port settings
- Appends the specific error detail in parentheses for diagnostics

**java-interop.ts:**
- Added import: `import { notifyJavaConnectionError } from './bbj-notifications.js'`
- Replaced the catch block in `connect()`:
  - Extracts error message with `e instanceof Error ? e.message : String(e)`
  - Calls `notifyJavaConnectionError(detail)` before logging to console
  - Removed TODO comment "send error message to the client"
  - Preserved `return Promise.reject(e)` for upstream error propagation

## Verification Results

```
Test Files  21 passed (21)
Tests  501 passed | 4 skipped (505)
```

- `grep TODO bbj-completion-provider.ts` — zero matches
- `grep "TODO send error" java-interop.ts` — zero matches
- `grep "notifyJavaConnectionError" bbj-notifications.ts` — line 46 (exported function)
- Line 408 FEAT-02 TODO in `java-interop.ts` intentionally left (out of scope per plan)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All files verified present on disk. All commits verified in git log.
