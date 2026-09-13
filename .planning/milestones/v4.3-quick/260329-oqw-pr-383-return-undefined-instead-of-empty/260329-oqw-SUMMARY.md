---
phase: quick
plan: oqw
subsystem: completion
tags: [completion, bugfix, pr-383]
dependency_graph:
  requires: []
  provides: [getFieldCompletion returns undefined at guard points]
  affects: [bbj-completion-provider.ts]
tech_stack:
  added: []
  patterns: [undefined over empty list for LSP provider chaining]
key_files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-completion-provider.ts

decisions:

  - "Return undefined (not empty CompletionList) from getFieldCompletion guard points so other LSP providers can continue"

metrics:
  duration: "< 5 minutes"
  completed: "2026-03-29T15:51:04Z"
  tasks_completed: 1
  files_modified: 1
audit_acknowledged:
  milestone: v4.3
  at: 2026-09-13
  status: unknown
---

# Phase quick Plan oqw: PR-383 Return Undefined Instead of Empty — Summary

**One-liner:** getFieldCompletion now returns undefined at guard points so LSP can fall through to other providers when field completion has nothing to offer.

## What Was Done

Applied PR #383 changes to `bbj-completion-provider.ts`: updated `getFieldCompletion` so that the three early-return guard points return `undefined` instead of `{ items: [], isIncomplete: false }`.

### Changes Made

**File:** `bbj-vscode/src/language/bbj-completion-provider.ts`

1. Return type on line 38: `Promise<CompletionList>` → `Promise<CompletionList | undefined>`
2. `if (!rootNode.$cstNode)` guard: `return { items: [], isIncomplete: false }` → `return undefined`
3. `if (!leafNode)` guard: `return { items: [], isIncomplete: false }` → `return undefined`
4. `if (!method || !klass)` guard: `return { items: [], isIncomplete: false }` → `return undefined`

The final return on line 78 (`return { items, isIncomplete: false }`) is unchanged — it returns actual field completion items.

### Why This Matters

When `getFieldCompletion` returned an empty `CompletionList`, the LSP framework treated it as a definitive "no completions" response and stopped trying other providers. Returning `undefined` signals that this provider has nothing to contribute, allowing the framework to continue to other completion providers for potentially relevant suggestions.

The caller (`getCompletion`) already had return type `Promise<CompletionList | undefined>`, so this change was already caller-compatible.

## Verification

- TypeScript compilation: no errors (`npx tsc --noEmit`)
- Tests: 511 passed, 4 skipped (all pre-existing skips, no regressions)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| b92083a | fix(quick-oqw): return undefined from getFieldCompletion at early-return points |

## Self-Check: PASSED

- File modified: `bbj-vscode/src/language/bbj-completion-provider.ts` — confirmed
- Commit b92083a — confirmed in git log
