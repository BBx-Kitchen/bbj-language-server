---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
autonomous: true
must_haves:
  truths:
    - "BUI and DWC run commands do not pass configPath when it is empty/null"
    - "BUI and DWC run commands pass configPath correctly when it IS configured"
    - "web.bbj receives correct ARGV positions for all arguments"
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java"
      provides: "BUI run action with conditional configPath"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java"
      provides: "DWC run action with conditional configPath"
  key_links:
    - from: "BbjRunBuiAction.java"
      to: "web.bbj ARGV(9)"
      via: "configPath positional argument"
      pattern: "addParameter.*configPath"
    - from: "BbjRunDwcAction.java"
      to: "web.bbj ARGV(9)"
      via: "configPath positional argument"
      pattern: "addParameter.*configPath"
---

<objective>
Fix IntelliJ BUI/DWC run actions passing an empty string as the config.bbx argument when no config path is configured, which causes web.bbj to receive incorrect/problematic positional arguments.

Purpose: When config.bbx path is empty/not configured, the BUI and DWC actions unconditionally pass `configPath` (empty string `""`) as the last positional argument via `cmd.addParameter(configPath)`. This can cause issues with how BBj/GeneralCommandLine handles empty string arguments in the process argument array. The fix is to only add the configPath parameter when it has a non-empty value, letting web.bbj's `ARGV(9,err=*next)` gracefully handle the absence (falls through to `configFile! = null()`, which correctly triggers the default config path logic on line 66 of web.bbj).

Output: Two patched Java files with conditional configPath handling.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
@bbj-vscode/src/Commands/Commands.cjs
@bbj-vscode/tools/web.bbj

**Bug:** BbjRunBuiAction.java (line 95) and BbjRunDwcAction.java (line 95) unconditionally call
`cmd.addParameter(configPath)` where `configPath` comes from `getConfigPath()` which returns `""`
when the setting is not configured. This empty string argument causes problems with BBj's ARGV
parsing for web.bbj, resulting in "-" being interpreted as the config file path.

**How VS Code handles it:** In Commands.cjs line 97, the configPath is always passed as a quoted
shell argument `"${configPath}"`. When empty, this becomes `""` in the shell, which web.bbj handles
correctly. However, IntelliJ's GeneralCommandLine.addParameter("") behaves differently from shell
quoting -- empty args in the process arg array may not propagate the same way.

**How the GUI action handles optional args:** BbjRunGuiAction.java uses `getConfigPathArg()` which
returns null when empty, and conditionally adds: `if (configPath != null) cmd.addParameter(configPath)`.
The BUI/DWC actions should follow this same conditional pattern.

**web.bbj defense:** web.bbj line 23 uses `configFile! = ARGV(9,err=*next)` which gracefully handles
a missing argument (configFile! stays null). Line 63-67 then correctly falls through to using the
system default config when configFile is null or empty.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix BUI and DWC actions to conditionally pass configPath</name>
  <files>
    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
  </files>
  <action>
In both BbjRunBuiAction.java and BbjRunDwcAction.java, change the unconditional
`cmd.addParameter(configPath)` to only add it when the config path is non-empty.

Replace (in both files):
```java
// Get config path
String configPath = getConfigPath();
```
and the later:
```java
cmd.addParameter(configPath);
```

With a conditional pattern:
```java
// Get config path - only add if configured (web.bbj handles absent ARGV(9) gracefully)
String configPath = getConfigPath();
```
and:
```java
if (!configPath.isEmpty()) {
    cmd.addParameter(configPath);
}
```

This matches how BbjRunGuiAction handles optional arguments (null-check before addParameter).
When configPath is empty, web.bbj's `ARGV(9,err=*next)` will leave configFile! as null,
and web.bbj line 63-67 correctly falls through to `BBjAPI().getConfig().getConfigFileName()`
(the system default).

Do NOT change any other parameters or argument ordering.
Do NOT change the getConfigPath() method in BbjRunActionBase.
  </action>
  <verify>
1. Verify the Java files compile: `cd /Users/beff/_workspace/bbj-language-server/bbj-intellij && ./gradlew compileJava 2>&1 | tail -5`
2. Visually confirm both files have the conditional check around `cmd.addParameter(configPath)`
3. Confirm the `-` separator parameter on line 86 is unchanged
4. Confirm all other parameters (token, classpath, etc.) are unchanged
  </verify>
  <done>
Both BbjRunBuiAction.java and BbjRunDwcAction.java only pass configPath to web.bbj when it is
non-empty. When config.bbx path is not configured, the argument is omitted entirely, letting
web.bbj use its default config path logic.
  </done>
</task>

</tasks>

<verification>
- Both files compile without errors via `./gradlew compileJava`
- The configPath parameter is conditionally added (only when non-empty)
- No other command line arguments are affected
- The fix is consistent across both BUI and DWC actions
</verification>

<success_criteria>
- BbjRunBuiAction and BbjRunDwcAction skip the configPath argument when the setting is empty
- BbjRunBuiAction and BbjRunDwcAction still pass configPath when it IS configured
- Java compilation succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/4-fix-intellij-bui-dwc-passing-dash-as-con/4-SUMMARY.md`
</output>
