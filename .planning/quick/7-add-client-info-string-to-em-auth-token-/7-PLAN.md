---
phase: quick-7
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
    - "EM auth tokens created from VS Code include client info identifying the OS and IDE"
    - "EM auth tokens created from IntelliJ include client info identifying the OS and IDE"
    - "em-login.bbj accepts an optional 4th parameter for client info without breaking existing callers"
  artifacts:
    - path: "bbj-vscode/tools/em-login.bbj"
      provides: "Client info parameter handling in BBj login stub"
      contains: "payload!.put"
    - path: "bbj-vscode/src/extension.ts"
      provides: "Platform + VS Code info string passed to em-login"
      contains: "VS Code"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      provides: "Platform + IntelliJ IDE info string passed to em-login"
      contains: "IntelliJ IDE"
  key_links:
    - from: "bbj-vscode/src/extension.ts"
      to: "bbj-vscode/tools/em-login.bbj"
      via: "4th CLI argument in emLoginCmd string"
      pattern: "infoString"
    - from: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      to: "bbj-vscode/tools/em-login.bbj"
      via: "cmd.addParameter for client info"
      pattern: "IntelliJ IDE"
---

<objective>
Add a client info string to EM auth tokens that describes the IDE and OS (e.g. "MacOS VS Code", "Windows IntelliJ IDE").

Purpose: Lets the EM server identify which IDE and platform generated a given auth token.
Output: Updated em-login.bbj, extension.ts, and BbjEMLoginAction.java.
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
  <name>Task 1: Add optional client info parameter to em-login.bbj</name>
  <files>bbj-vscode/tools/em-login.bbj</files>
  <action>
    Update em-login.bbj to accept an optional 4th parameter for client info:

    1. Update the header comment to document the new parameter:
       ```
       rem   4) infoString (optional - client info string, e.g. "MacOS VS Code")
       ```

    2. After line 11 (`outputFile! = ARGV(3,err=*next)`), add:
       ```bbj
       infoString! = ARGV(4,err=*next)
       ```

    3. After `payload! = new HashMap()` (line 34), add:
       ```bbj
       if (infoString! <> null()) then payload!.put("client", infoString!)
       ```

    This is backward compatible: if no 4th arg is provided, ARGV(4) errors to *next, infoString! stays null, and the payload remains empty.
  </action>
  <verify>Review the file to confirm: 4th ARGV parameter is read, conditional put into payload HashMap, header comment updated.</verify>
  <done>em-login.bbj accepts optional 4th parameter "infoString" and puts it in payload as "client" key when provided.</done>
</task>

<task type="auto">
  <name>Task 2: Pass client info string from VS Code and IntelliJ callers</name>
  <files>bbj-vscode/src/extension.ts, bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java</files>
  <action>
    **VS Code extension (extension.ts):**

    In the `bbj.loginEM` command handler (around line 525), replace the emLoginCmd construction:

    Before line 525, add platform detection:
    ```typescript
    const platform = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'MacOS' : 'Linux';
    const infoString = `${platform} VS Code`;
    ```

    Then update the emLoginCmd string (line 525) to append the info string as a 4th BBj argument:
    ```typescript
    const emLoginCmd = `"${bbj}" -q "${emLoginPath}" - "${username}" "${password}" "${tmpFile}" "${infoString}"`;
    ```

    **IntelliJ plugin (BbjEMLoginAction.java):**

    In the `performLogin()` method, after `cmd.addParameter(tmpFile.toString());` (line 101), add the client info parameter. Note: the `os` variable already exists on line 79 as a lowercase string. Reuse it for platform detection:

    ```java
    // Client info for EM token payload
    String platform;
    if (os.contains("win")) platform = "Windows";
    else if (os.contains("mac")) platform = "MacOS";
    else platform = "Linux";
    cmd.addParameter(platform + " IntelliJ IDE");
    ```

    Note: the existing `os` variable on line 79 is `System.getProperty("os.name", "").toLowerCase()` which is already lowercase, so `.contains("win")` and `.contains("mac")` will work correctly.
  </action>
  <verify>Review extension.ts around line 525 to confirm infoString is constructed and appended. Review BbjEMLoginAction.java around line 101 to confirm platform detection and addParameter call.</verify>
  <done>VS Code passes "MacOS VS Code" / "Windows VS Code" / "Linux VS Code" as 4th arg. IntelliJ passes "MacOS IntelliJ IDE" / "Windows IntelliJ IDE" / "Linux IntelliJ IDE" as 4th arg.</done>
</task>

</tasks>

<verification>
- em-login.bbj reads 4th ARGV, puts "client" into payload HashMap when present
- extension.ts builds emLoginCmd with platform + "VS Code" as 4th argument
- BbjEMLoginAction.java adds platform + "IntelliJ IDE" as additional cmd parameter
- No existing functionality is broken (4th param is optional in BBj stub)
</verification>

<success_criteria>
All three files updated. Client info string flows from IDE caller through em-login.bbj into the EM auth token payload. Backward compatible (no 4th arg = empty payload as before).
</success_criteria>

<output>
After completion, create `.planning/quick/7-add-client-info-string-to-em-auth-token-/7-SUMMARY.md`
</output>
