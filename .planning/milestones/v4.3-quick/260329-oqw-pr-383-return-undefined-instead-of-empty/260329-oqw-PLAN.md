---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/src/language/bbj-completion-provider.ts
autonomous: true
requirements: [PR-383]
must_haves:
  truths:
    - "getFieldCompletion returns undefined (not empty list) when it has nothing to offer"
    - "Other completion providers can continue when field completion yields no results"
  artifacts:
    - path: "bbj-vscode/src/language/bbj-completion-provider.ts"
      provides: "Updated getFieldCompletion with undefined returns"
      contains: "Promise<CompletionList | undefined>"
  key_links:
    - from: "getFieldCompletion"
      to: "getCompletion"
      via: "return type flows through to caller"
      pattern: "undefined"
---

<objective>
Apply PR #383: Change getFieldCompletion to return undefined instead of empty CompletionList at early-return points, allowing other completion providers to continue when field completion has nothing to offer.

Purpose: When getFieldCompletion cannot provide results (no CST node, no leaf node, or not inside a class method), returning undefined lets the LSP framework try other providers instead of short-circuiting with an empty list.
Output: Updated bbj-completion-provider.ts
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-vscode/src/language/bbj-completion-provider.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update getFieldCompletion return type and early returns</name>
  <files>bbj-vscode/src/language/bbj-completion-provider.ts</files>
  <action>
In bbj-vscode/src/language/bbj-completion-provider.ts, make these changes to the getFieldCompletion method:

1. Change the return type on line 38 from `Promise<CompletionList>` to `Promise<CompletionList | undefined>`

2. Replace three early-return statements that return `{ items: [], isIncomplete: false }` with `return undefined`:
   - Line 45: the `if (!rootNode.$cstNode)` guard
   - Line 50: the `if (!leafNode)` guard
   - Line 59: the `if (!method || !klass)` guard

Do NOT change the final return on line 78 (`return { items, isIncomplete: false }`) — that one has actual items.

Note: The getCompletion method on line 21 already returns `Promise<CompletionList | undefined>`, so the caller is already compatible with undefined returns from getFieldCompletion.
  </action>
  <verify>
    <automated>cd /Users/beff/_workspace/bbj-language-server/bbj-vscode && npx tsc --noEmit --pretty 2>&1 | head -20 && npm test 2>&1 | tail -20</automated>
  </verify>
  <done>
- getFieldCompletion return type is `Promise<CompletionList | undefined>`
- All three early-return points return undefined instead of empty list
- TypeScript compiles without errors
- All existing tests pass
  </done>
</task>

</tasks>

<verification>
- TypeScript compilation succeeds (no type errors from the return type change)
- All vitest tests pass
- The three early returns in getFieldCompletion return undefined
- The final return with actual items still returns a CompletionList
</verification>

<success_criteria>
- getFieldCompletion returns undefined at all three guard points
- No regressions in existing tests
</success_criteria>

<output>
After completion, create `.planning/quick/260329-oqw-pr-383-return-undefined-instead-of-empty/260329-oqw-SUMMARY.md`
</output>
