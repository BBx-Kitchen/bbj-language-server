---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/src/extension.ts
autonomous: true

must_haves:
  truths:
    - "Only one 'BBj' output channel appears in VS Code's output panel"
  artifacts:
    - path: "bbj-vscode/src/extension.ts"
      provides: "Shared output channel passed to LanguageClient"
      contains: "outputChannel"
  key_links:
    - from: "bbj-vscode/src/extension.ts"
      to: "LanguageClient clientOptions"
      via: "outputChannel property in LanguageClientOptions"
      pattern: "outputChannel.*outputChannel"
---

<objective>
Fix the remaining duplicate "BBj" output channel in VS Code.

Purpose: Quick Task 1 (commit e0e3306) fixed duplicate channels created by Commands.cjs, but a second "BBj" output channel still appears. The root cause is that `new LanguageClient('bbj', 'BBj', serverOptions, clientOptions)` on line 570-574 of extension.ts auto-creates its own output channel named "BBj" when no `outputChannel` is provided in `clientOptions`. Combined with the explicit `createOutputChannel('BBj')` on line 347, this produces TWO channels with the same name.

Output: Single "BBj" output channel shared between extension debug logging, Commands.cjs, and the LanguageClient.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-vscode/src/extension.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pass shared output channel to LanguageClient via clientOptions</name>
  <files>bbj-vscode/src/extension.ts</files>
  <action>
In `startLanguageClient()`, the `clientOptions` object (line 550-567) does not include an `outputChannel` property. The `LanguageClient` constructor therefore internally calls `vscode.window.createOutputChannel('BBj')` to create its own channel — resulting in a second "BBj" channel.

Fix: Modify `startLanguageClient()` to accept the `outputChannel` parameter and pass it through to `clientOptions`.

1. Change the function signature on line 529 from:
   `function startLanguageClient(context: vscode.ExtensionContext): LanguageClient`
   to:
   `function startLanguageClient(context: vscode.ExtensionContext, channel: vscode.OutputChannel): LanguageClient`

2. Add `outputChannel: channel` to the `clientOptions` object (after the `initializationOptions` block, around line 566):
   ```
   outputChannel: channel
   ```

3. Update the call site on line 349 from:
   `client = startLanguageClient(context);`
   to:
   `client = startLanguageClient(context, outputChannel);`

This ensures the LanguageClient reuses the already-created channel instead of creating a new one. The LanguageClientOptions type definition at `vscode-languageclient/lib/common/client.d.ts:235` confirms `outputChannel?: OutputChannel` is a supported property.

IMPORTANT: Do NOT rename the parameter to `outputChannel` inside startLanguageClient since that would shadow the module-level variable. Use `channel` as the parameter name.
  </action>
  <verify>
1. Run `npm run build` from bbj-vscode/ to confirm no TypeScript compilation errors
2. Grep to confirm only ONE call to `createOutputChannel` exists in the entire bbj-vscode/src/ directory:
   `grep -r "createOutputChannel" bbj-vscode/src/` should return exactly 1 result (line 347 of extension.ts)
3. Grep to confirm `outputChannel` is now in clientOptions:
   `grep "outputChannel.*channel" bbj-vscode/src/extension.ts` should return at least 1 result
  </verify>
  <done>
- `startLanguageClient()` accepts and passes through the shared output channel
- `clientOptions` includes `outputChannel: channel`
- Only ONE `createOutputChannel('BBj')` call exists in the entire codebase
- `npm run build` succeeds with no errors
- LanguageClient, Commands.cjs, and extension.ts debug logging all share the same single output channel
  </done>
</task>

</tasks>

<verification>
1. `grep -rc "createOutputChannel" bbj-vscode/src/` shows exactly 1 occurrence total (in extension.ts line 347)
2. `npm run build` in bbj-vscode/ completes successfully
3. The LanguageClient clientOptions object contains `outputChannel: channel`
</verification>

<success_criteria>
- Only one `createOutputChannel('BBj')` call in the codebase (extension.ts:347)
- LanguageClient receives the shared channel via clientOptions.outputChannel
- Build succeeds with no errors
- When loaded in VS Code, only ONE "BBj" output channel will appear
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-duplicate-bbj-output-channel-ensure-/3-SUMMARY.md`
</output>
