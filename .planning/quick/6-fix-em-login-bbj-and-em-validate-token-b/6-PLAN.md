---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/tools/em-login.bbj
  - bbj-vscode/tools/em-validate-token.bbj
  - bbj-vscode/src/extension.ts
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
autonomous: true

must_haves:
  truths:
    - "em-login.bbj and em-validate-token.bbj no longer require -tIO flag"
    - "BBj scripts write results to a temp file instead of stdout"
    - "GUI window is hidden via PRINT HIDE mnemonic"
    - "VS Code extension reads results from temp file, not stdout"
    - "IntelliJ plugin reads results from temp file, not stdout"
    - "Temp files are cleaned up after reading"
  artifacts:
    - path: "bbj-vscode/tools/em-login.bbj"
      provides: "EM login with HIDE and temp file output"
      contains: "? 'HIDE'"
    - path: "bbj-vscode/tools/em-validate-token.bbj"
      provides: "EM token validation with HIDE and temp file output"
      contains: "? 'HIDE'"
    - path: "bbj-vscode/src/extension.ts"
      provides: "Temp file based result reading for both login and validate"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      provides: "Temp file based result reading for login"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java"
      provides: "Temp file based result reading for validate"
  key_links:
    - from: "bbj-vscode/src/extension.ts"
      to: "bbj-vscode/tools/em-login.bbj"
      via: "passes temp file path as last ARGV, reads file after process exits"
    - from: "bbj-vscode/src/extension.ts"
      to: "bbj-vscode/tools/em-validate-token.bbj"
      via: "passes temp file path as last ARGV, reads file after process exits"
    - from: "BbjEMLoginAction.java"
      to: "em-login.bbj"
      via: "passes temp file path as last cmd parameter, reads file after process exits"
    - from: "BbjRunActionBase.java"
      to: "em-validate-token.bbj"
      via: "passes temp file path as last cmd parameter, reads file after process exits"
---

<objective>
Fix em-login.bbj and em-validate-token.bbj Windows compatibility by replacing the POSIX-only `-tIO` flag with GUI client + `PRINT 'HIDE'` and temp file output.

Purpose: The `-tIO` flag creates a text-only IO session that only works on POSIX systems. By switching to a hidden GUI client and writing results to a temp file, these scripts work on Windows too.

Output: All 5 files updated, EM login and token validation work cross-platform.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-vscode/tools/em-login.bbj
@bbj-vscode/tools/em-validate-token.bbj
@bbj-vscode/tools/web.bbj (reference for ? 'HIDE' pattern on line 13)
@bbj-vscode/src/extension.ts
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update BBj scripts to use HIDE and temp file output</name>
  <files>bbj-vscode/tools/em-login.bbj, bbj-vscode/tools/em-validate-token.bbj</files>
  <action>
**em-login.bbj** — The script currently takes ARGV(1)=username, ARGV(2)=password. Change to accept ARGV(3)=outputFile (temp file path passed by caller).

1. Add `? 'HIDE'` as the very first executable line (after the rem comments), exactly like web.bbj line 13.
2. Add a new parameter: `outputFile! = ARGV(3,err=*next)` after the existing username/password ARGV reads.
3. Replace all `print` output with writing to the temp file:
   - Where it currently does `print "ERROR:Username required"`, instead do:
     ```bbj
     ch=unt
     open(ch)"${outputFile!}"
     write(ch)"ERROR:Username required"
     close(ch)
     ```
   - Same pattern for `print "ERROR:Password required"`, `print token!`, and `print "ERROR:Authentication failed..."`.
4. Use a helper approach to reduce duplication: define a label `writeResult:` that writes a variable `result!` to the output file, then release. Set `result!` before GOSUBing or GOTOing there. Alternatively, just inline the file-write at each print site (4 sites total) — whichever is cleaner. Inline is fine for only 4 sites.

**em-validate-token.bbj** — Currently takes ARGV(1)=token. Change to accept ARGV(2)=outputFile.

1. Add `? 'HIDE'` as the very first executable line (after the rem comment).
2. Add a new parameter: `outputFile! = ARGV(2,err=*next)` after the token ARGV read.
3. Replace all `print` output (3 sites: two `print "INVALID"` and one `print "VALID"`) with writing to the temp file using the same open/write/close pattern.

**BBj file I/O pattern** (use this exact syntax):
```bbj
ch=unt
open(ch,mode="O_CREATE,O_TRUNC")outputFile!
write(ch)result!
close(ch)
```
Note: `unt` returns the next available channel number. `mode="O_CREATE,O_TRUNC"` creates the file if it doesn't exist and truncates if it does.

**Update the rem comments** at the top of each file to document the new parameter (outputFile path).
  </action>
  <verify>
Visually inspect both files:
- `? 'HIDE'` is present as first executable line
- No `print` statements remain for output (only file writes)
- New ARGV parameter documented in header comments
- File open/write/close pattern used at every output site
  </verify>
  <done>
Both BBj scripts use `? 'HIDE'` to suppress GUI window, accept an output file path as their last argument, and write all results to that file instead of stdout.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update VS Code extension to use temp file instead of stdout</name>
  <files>bbj-vscode/src/extension.ts</files>
  <action>
Two functions need updating: `validateTokenServerSide()` (around line 388) and the `bbj.loginEM` command handler (around line 511).

**Add imports** at the top of the file (line 9 already has `import * as fs from 'fs'`, and `import * as path from 'path'` on line 8 — also add):
```typescript
import * as os from 'os';
```

**For `validateTokenServerSide()` (~line 404-405):**

1. Before building the command, create a temp file path:
   ```typescript
   const tmpFile = path.join(os.tmpdir(), `bbj-em-validate-${Date.now()}.tmp`);
   ```
2. Change command from:
   ```typescript
   const emValidateCmd = `"${bbj}" -q -tIO "${emValidatePath}" - "${token}"`;
   ```
   to (remove `-tIO`, add tmpFile as last arg):
   ```typescript
   const emValidateCmd = `"${bbj}" -q "${emValidatePath}" - "${token}" "${tmpFile}"`;
   ```
3. In the exec callback, instead of parsing `stdout`, read the temp file after process exits:
   ```typescript
   (err: any, stdout: string, stderr: string) => {
       try {
           if (err) {
               reject(new Error(stderr || err.message));
               return;
           }
           const output = fs.readFileSync(tmpFile, 'utf-8').trim();
           resolve(output);
       } finally {
           // Clean up temp file
           try { fs.unlinkSync(tmpFile); } catch {}
       }
   }
   ```
4. Remove the stdout line-parsing logic (the `const lines = ...` and `const output = lines[...]` lines) — replaced by readFileSync above.

**For `bbj.loginEM` handler (~line 514):**

1. Before building the command, create a temp file path:
   ```typescript
   const tmpFile = path.join(os.tmpdir(), `bbj-em-login-${Date.now()}.tmp`);
   ```
2. Change command from:
   ```typescript
   const emLoginCmd = `"${bbj}" -q -tIO "${emLoginPath}" - "${username}" "${password}"`;
   ```
   to:
   ```typescript
   const emLoginCmd = `"${bbj}" -q "${emLoginPath}" - "${username}" "${password}" "${tmpFile}"`;
   ```
3. In the exec callback, read the temp file instead of parsing stdout:
   ```typescript
   (err: any, stdout: string, stderr: string) => {
       try {
           if (err) {
               reject(new Error(stderr || err.message));
               return;
           }
           const output = fs.readFileSync(tmpFile, 'utf-8').trim();
           if (output.startsWith('ERROR:')) {
               reject(new Error(output.substring(6)));
               return;
           }
           resolve(output);
       } finally {
           try { fs.unlinkSync(tmpFile); } catch {}
       }
   }
   ```
4. Remove the stdout line-parsing logic (the `const lines = ...`, `const output = lines[...]` lines).

**Debug logging:** Update the masked command logging to reflect the new command format (no `-tIO`). The existing masking of password/token still applies.
  </action>
  <verify>
1. `grep -n "tIO" bbj-vscode/src/extension.ts` returns no matches
2. `grep -n "tmpFile" bbj-vscode/src/extension.ts` shows temp file usage in both functions
3. `grep -n "readFileSync" bbj-vscode/src/extension.ts` shows file reads in both functions
4. `grep -n "unlinkSync" bbj-vscode/src/extension.ts` shows cleanup in both functions
5. TypeScript compiles: `cd bbj-vscode && npx tsc --noEmit` (or equivalent)
  </verify>
  <done>
VS Code extension no longer uses `-tIO`, creates temp files for BBj script output, reads results from temp files, and cleans up temp files. Both `validateTokenServerSide()` and `bbj.loginEM` handler updated.
  </done>
</task>

<task type="auto">
  <name>Task 3: Update IntelliJ plugin to use temp file instead of stdout</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java, bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java</files>
  <action>
**BbjEMLoginAction.java — `performLogin()` method (~line 91-131):**

1. Before building the command (before line 92), create a temp file:
   ```java
   Path tmpFile = Files.createTempFile("bbj-em-login-", ".tmp");
   ```
   (`java.nio.file.Files` is already imported on line 15.)

2. Remove the `-tIO` parameter (line 94: `cmd.addParameter("-tIO");` — delete this line).

3. Add the temp file path as the last parameter (after the password parameter):
   ```java
   cmd.addParameter(tmpFile.toString());
   ```

4. After `handler.runProcess(15000)` completes, instead of parsing `output.getStdout()`, read the temp file:
   ```java
   String stdout = "";
   try {
       stdout = Files.readString(tmpFile).trim();
   } finally {
       Files.deleteIfExists(tmpFile);
   }
   ```

5. Remove the stdout line-parsing loop (lines 104-111 that iterate over stdout lines). The temp file will contain exactly one line of output, so `Files.readString(tmpFile).trim()` is sufficient.

6. Keep the existing error checking logic (`stdout.startsWith("ERROR:")`, `stdout.isEmpty()`) — it works the same on the file content.

**BbjRunActionBase.java — `validateTokenServerSide()` method (~line 290-316):**

1. Before building the command, create a temp file:
   ```java
   java.nio.file.Path tmpFile = java.nio.file.Files.createTempFile("bbj-em-validate-", ".tmp");
   ```
   (Use fully qualified names since `Files` and `Path` may not be imported in this file — check imports. `java.nio.file.Files` IS imported on line 28, `java.nio.file.Path` IS imported on line 29. So use short names: `Path tmpFile = Files.createTempFile(...)`)

2. Remove the `-tIO` parameter (line 293: `cmd.addParameter("-tIO");`).

3. Add the temp file path as the last parameter (after the token parameter):
   ```java
   cmd.addParameter(tmpFile.toString());
   ```

4. After `handler.runProcess(10000)`, read temp file instead of stdout:
   ```java
   String result = "";
   try {
       result = Files.readString(tmpFile).trim();
   } finally {
       Files.deleteIfExists(tmpFile);
   }
   ```

5. Remove the stdout line-parsing loop (lines 304-313). Keep the final `return "VALID".equals(result);`.

6. Wrap the entire method body's temp file creation in a try block so the file is cleaned up even on exceptions. The existing outer `try/catch` at the method level handles exceptions already — just ensure `Files.deleteIfExists(tmpFile)` runs in a finally. Structure:
   ```java
   Path tmpFile = Files.createTempFile("bbj-em-validate-", ".tmp");
   try {
       // build cmd, run, read tmpFile
       ...
       return "VALID".equals(result);
   } catch (Exception e) {
       return false;
   } finally {
       try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
   }
   ```
  </action>
  <verify>
1. `grep -rn "tIO" bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` returns no matches
2. `grep -rn "tIO" bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` returns no matches
3. `grep -rn "createTempFile" bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` shows temp file creation in both files
4. `grep -rn "deleteIfExists" bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` shows cleanup in both files
5. Java compilation check: `cd bbj-intellij && ./gradlew compileJava` (if Gradle is set up)
  </verify>
  <done>
IntelliJ plugin no longer uses `-tIO`, creates temp files for BBj script output, reads results from temp files, and cleans up temp files. Both `BbjEMLoginAction.performLogin()` and `BbjRunActionBase.validateTokenServerSide()` updated.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
1. No remaining `-tIO` references in the codebase (outside of git history/docs):
   `grep -rn "\-tIO" bbj-vscode/tools/ bbj-vscode/src/ bbj-intellij/src/` returns zero matches
2. All BBj scripts have `? 'HIDE'` as first executable line
3. All callers create temp files, pass paths to BBj, read results from files, clean up
4. TypeScript compiles without errors
5. Java compiles without errors (if build tooling available)
</verification>

<success_criteria>
- Zero `-tIO` flags remain in any source file
- Both BBj scripts use `? 'HIDE'` and write to temp file via last ARGV parameter
- VS Code extension (2 call sites) and IntelliJ plugin (2 call sites) pass temp file paths, read results from files, clean up
- Both TypeScript and Java code compiles
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-em-login-bbj-and-em-validate-token-b/6-SUMMARY.md`
</output>
