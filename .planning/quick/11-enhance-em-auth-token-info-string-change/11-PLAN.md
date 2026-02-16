---
phase: 11-enhance-em-auth-token-info-string-change
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/tools/em-login.bbj
  - bbj-vscode/src/extension.ts
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
autonomous: true
must_haves:
  truths:
    - "EM auth token payload uses 'info-string' key instead of 'client'"
    - "VS Code info string follows format 'VS Code on {platform} as {username}'"
    - "IntelliJ info string follows format 'IntelliJ on {platform} as {username}'"
  artifacts:
    - path: "bbj-vscode/tools/em-login.bbj"
      provides: "BBj EM login stub with updated payload key"
      contains: 'payload!.put("info-string"'
    - path: "bbj-vscode/src/extension.ts"
      provides: "VS Code extension with enriched info string"
      contains: "VS Code on"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      provides: "IntelliJ action with enriched info string"
      contains: "IntelliJ on"
  key_links:
    - from: "bbj-vscode/src/extension.ts"
      to: "bbj-vscode/tools/em-login.bbj"
      via: "infoString passed as CLI argument to em-login.bbj"
      pattern: "infoString"
    - from: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      to: "bbj-vscode/tools/em-login.bbj"
      via: "info string passed as CLI argument to em-login.bbj"
      pattern: "addParameter"
---

<objective>
Enhance the EM auth token info-string in three places: rename the payload key from "client" to "info-string" in the BBj login stub, and enrich the info string format from "{platform} {IDE}" to "{IDE} on {platform} as {username}" in both the VS Code extension and IntelliJ plugin.

Purpose: Better identification of authenticated sessions in Enterprise Manager by including the OS username alongside IDE and platform info, and using the correct payload key name.
Output: Three modified files with consistent info-string formatting across both IDE plugins.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-vscode/tools/em-login.bbj
@bbj-vscode/src/extension.ts
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update payload key and VS Code info string</name>
  <files>bbj-vscode/tools/em-login.bbj, bbj-vscode/src/extension.ts</files>
  <action>
In `bbj-vscode/tools/em-login.bbj`:
- Line 37: Change `payload!.put("client", infoString!)` to `payload!.put("info-string", infoString!)`
- Line 6 comment: Update from `"MacOS VS Code"` to `"VS Code on MacOS as beff"` to reflect the new format

In `bbj-vscode/src/extension.ts`:
- Line 526: Change the info string construction from:
  `const infoString = \`\${platform} VS Code\`;`
  to:
  `const infoString = \`VS Code on \${platform} as \${os.userInfo().username}\`;`
- Note: `os` is already imported at line 10 (`import * as os from 'os'`), so no new import needed.
  </action>
  <verify>
Run `grep -n "info-string" bbj-vscode/tools/em-login.bbj` to confirm the key change.
Run `grep -n "VS Code on" bbj-vscode/src/extension.ts` to confirm the new format.
Confirm no remaining references to the old `"client"` key in em-login.bbj or old `${platform} VS Code` format in extension.ts.
  </verify>
  <done>
em-login.bbj uses `payload!.put("info-string", infoString!)` and extension.ts constructs info string as `VS Code on {platform} as {username}`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update IntelliJ info string format</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java</files>
  <action>
In `BbjEMLoginAction.java`:
- Line 110: Change the info string construction from:
  `cmd.addParameter(platform + " IntelliJ IDE");`
  to:
  `cmd.addParameter("IntelliJ on " + platform + " as " + System.getProperty("user.name"));`
- `System.getProperty("user.name")` is a standard Java API, no new imports needed.
  </action>
  <verify>
Run `grep -n "IntelliJ on" bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` to confirm the new format.
Confirm no remaining references to the old `platform + " IntelliJ IDE"` format.
  </verify>
  <done>
BbjEMLoginAction.java constructs info string as `IntelliJ on {platform} as {username}`.
  </done>
</task>

</tasks>

<verification>
1. `grep -rn '"client"' bbj-vscode/tools/em-login.bbj` returns no matches (old key removed)
2. `grep -rn '"info-string"' bbj-vscode/tools/em-login.bbj` returns 1 match (new key present)
3. `grep -n 'VS Code on' bbj-vscode/src/extension.ts` returns 1 match with `as ${os.userInfo().username}`
4. `grep -n 'IntelliJ on' bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` returns 1 match with `System.getProperty("user.name")`
5. All three files compile/parse without errors (no syntax issues introduced)
</verification>

<success_criteria>
- The BBj EM login payload key is "info-string" (not "client")
- VS Code sends info strings like "VS Code on MacOS as beff"
- IntelliJ sends info strings like "IntelliJ on MacOS as beff"
- Both IDEs include the OS username in the info string
- No regressions in existing EM login functionality
</success_criteria>

<output>
After completion, create `.planning/quick/11-enhance-em-auth-token-info-string-change/11-SUMMARY.md`
</output>
