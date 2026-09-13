---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/extension.ts
autonomous: true
must_haves:
  truths:
    - "Only one 'BBj' output channel exists in VS Code regardless of how many times run commands are invoked"
    - "Debug output from GUI run, BUI run, and DWC run all appears in the same output channel"
  artifacts:
    - path: "bbj-vscode/src/Commands/Commands.cjs"
      provides: "Run commands using shared output channel"
      contains: "outputChannel"
    - path: "bbj-vscode/src/extension.ts"
      provides: "Output channel passed to Commands"
  key_links:
    - from: "bbj-vscode/src/extension.ts"
      to: "bbj-vscode/src/Commands/Commands.cjs"
      via: "outputChannel passed to Commands module"
      pattern: "Commands\\.setOutputChannel|Commands\\.outputChannel"
---

<objective>
Fix duplicate BBj output channels created on each launch command invocation.

Purpose: Each BBj run (GUI, BUI, DWC) calls `vscode.window.createOutputChannel('BBj')` when debug is enabled, creating a new duplicate output channel every time. The extension already creates one in `activate()` but Commands.cjs ignores it and creates its own.

Output: Commands.cjs reuses the single output channel created in extension.ts.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-vscode/src/extension.ts
@bbj-vscode/src/Commands/Commands.cjs
</context>

<tasks>

<task type="auto">
  <name>Task 1: Share output channel from extension.ts to Commands.cjs</name>
  <files>bbj-vscode/src/Commands/Commands.cjs, bbj-vscode/src/extension.ts</files>
  <action>
In `bbj-vscode/src/Commands/Commands.cjs`:

1. Add a module-level variable `let outputChannel = null;` near the top (after the require statements).

2. Add a `setOutputChannel` function that stores the reference:
   ```js
   const setOutputChannel = (channel) => {
     outputChannel = channel;
   };
   ```

3. In `runWeb` function (line ~92-97): Replace the block:
   ```js
   if (isDebug) {
     const out = vscode.window.createOutputChannel('BBj');
     out.appendLine(`${client} run: ${debugCmd}`);
   }
   ```
   with:
   ```js
   if (isDebug && outputChannel) {
     outputChannel.appendLine(`${client} run: ${debugCmd}`);
   }
   ```

4. In `Commands.run` function (line ~228-232): Replace the block:
   ```js
   if (isDebug) {
     const out = vscode.window.createOutputChannel('BBj');
     out.appendLine(`GUI run: ${cmd}`);
   }
   ```
   with:
   ```js
   if (isDebug && outputChannel) {
     outputChannel.appendLine(`GUI run: ${cmd}`);
   }
   ```

5. Export `setOutputChannel` alongside the existing Commands object. Change the module.exports at the bottom:
   ```js
   module.exports = Commands;
   module.exports.setOutputChannel = setOutputChannel;
   ```

In `bbj-vscode/src/extension.ts`:

6. After line 347 (`outputChannel = vscode.window.createOutputChannel('BBj');`), add:
   ```ts
   Commands.setOutputChannel(outputChannel);
   ```

7. Update the import at line 22 to destructure setOutputChannel. Since Commands.cjs uses CommonJS `module.exports = Commands` with `.setOutputChannel` as a separate property, the default import already gives the Commands object. The `setOutputChannel` is accessible as a property. Adjust the import if needed:
   ```ts
   import Commands from './Commands/Commands.cjs';
   const { setOutputChannel } = Commands as any;
   ```
   OR more simply, just call `(Commands as any).setOutputChannel(outputChannel);` on line after creation.

   The cleanest approach: keep the import as-is and use `(Commands as any).setOutputChannel(outputChannel);` since this is a .cjs module with mixed exports.
  </action>
  <verify>
    Run `npm run build` (or the equivalent TypeScript compilation) from the bbj-vscode directory to confirm no compilation errors. Then grep for `createOutputChannel` in Commands.cjs to confirm zero occurrences remain.
  </verify>
  <done>
    - Commands.cjs has zero calls to `vscode.window.createOutputChannel`
    - Commands.cjs has a `setOutputChannel` function exported
    - extension.ts calls `setOutputChannel` immediately after creating the output channel
    - Debug logging from GUI run, BUI run, and DWC run all write to the shared output channel
  </done>
</task>

</tasks>

<verification>
1. `grep -c "createOutputChannel" bbj-vscode/src/Commands/Commands.cjs` returns 0
2. `grep -c "setOutputChannel" bbj-vscode/src/Commands/Commands.cjs` returns at least 2 (definition + export)
3. `grep -c "setOutputChannel" bbj-vscode/src/extension.ts` returns at least 1
4. Build succeeds without errors
</verification>

<success_criteria>
- No duplicate BBj output channels created when running BBj programs with debug enabled
- All debug output goes to the single output channel created in activate()
- Build compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-duplicate-bbj-output-channels-create/1-SUMMARY.md`
</output>
