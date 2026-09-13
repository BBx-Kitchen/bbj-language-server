---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/tools/em-login.bbj
  - bbj-vscode/tools/em-validate-token.bbj
  - bbj-vscode/src/extension.ts
  - bbj-intellij/build.gradle.kts
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
autonomous: true
must_haves:
  truths:
    - "Expired JWT tokens are detected client-side before usage in both IDEs"
    - "Invalid/revoked tokens are detected server-side before BUI/DWC launch"
    - "Expired or invalid tokens automatically trigger re-login flow"
    - "em-login.bbj uses 525000 minute duration for token requests"
  artifacts:
    - path: "bbj-vscode/tools/em-validate-token.bbj"
      provides: "Server-side token validation script"
      contains: "BBjAdminFactory.getBBjAdmin"
    - path: "bbj-vscode/src/extension.ts"
      provides: "JWT expiry check + server-side validation in VS Code"
      contains: "isTokenExpired"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java"
      provides: "JWT expiry check utility for IntelliJ"
      contains: "isTokenExpired"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java"
      provides: "Token validation before BUI launch"
      contains: "isTokenExpired"
  key_links:
    - from: "bbj-vscode/src/extension.ts"
      to: "bbj-vscode/tools/em-validate-token.bbj"
      via: "child_process exec before BUI/DWC run"
      pattern: "em-validate-token"
    - from: "BbjRunBuiAction.java"
      to: "BbjEMTokenStore.isTokenExpired"
      via: "static method call"
      pattern: "isTokenExpired"
    - from: "BbjRunActionBase.java"
      to: "em-validate-token.bbj"
      via: "CapturingProcessHandler execution"
      pattern: "em-validate-token"
---

<objective>
Fix EM token expiration handling by adding client-side JWT expiry checking and server-side token validation before BUI/DWC launches in both VS Code and IntelliJ.

Purpose: Currently expired/revoked EM tokens fail at web.bbj launch time with an unhelpful "Login Failed!" MSGBOX. Users need clear feedback and automatic re-login when tokens expire.

Output: Both IDEs detect expired tokens early (client-side JWT decode) and validate tokens against EM server before launching BUI/DWC programs. Invalid tokens trigger automatic re-login flow.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-vscode/src/extension.ts
@bbj-vscode/src/Commands/Commands.cjs
@bbj-vscode/tools/em-login.bbj
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
@bbj-intellij/build.gradle.kts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create em-validate-token.bbj + commit em-login.bbj duration change + update Gradle</name>
  <files>
    bbj-vscode/tools/em-validate-token.bbj
    bbj-vscode/tools/em-login.bbj
    bbj-intellij/build.gradle.kts
  </files>
  <action>
1. Create `bbj-vscode/tools/em-validate-token.bbj` -- a BBj script that validates a token against EM:
```bbj
rem BBj EM Token Validation - Tests token against EM before usage
rem Parameters:
rem   1) token

token! = ARGV(1,err=*next)

if (token! = null()) then
    print "INVALID"
    release
fi

rem Validate token by attempting admin connection
use com.basis.api.admin.BBjAdminFactory

admin! = BBjAdminFactory.getBBjAdmin(token!, err=token_invalid)
print "VALID"
release

token_invalid:
print "INVALID"
release
```

2. Commit `bbj-vscode/tools/em-login.bbj` which already has the duration changed from `0` to `525000` (uncommitted change currently on disk).

3. Update `bbj-intellij/build.gradle.kts` to include `em-validate-token.bbj` in both copy tasks:
   - In `copyWebRunner` task (line ~93): add `include("em-validate-token.bbj")` alongside `include("em-login.bbj")`
   - In `prepareSandbox` task (line ~114): add `include("em-validate-token.bbj")` alongside `include("em-login.bbj")`
  </action>
  <verify>
    - File `bbj-vscode/tools/em-validate-token.bbj` exists and contains `BBjAdminFactory.getBBjAdmin`
    - `git diff bbj-vscode/tools/em-login.bbj` shows no diff (committed)
    - `grep "em-validate-token" bbj-intellij/build.gradle.kts` returns matches in both copy tasks
  </verify>
  <done>em-validate-token.bbj exists, em-login.bbj duration change committed, Gradle copies new script into IntelliJ bundle</done>
</task>

<task type="auto">
  <name>Task 2: Add JWT expiry check + server-side validation to VS Code extension</name>
  <files>bbj-vscode/src/extension.ts</files>
  <action>
1. Add a helper function `isTokenExpired(token: string): boolean` near the top of extension.ts (after imports, before `getEMCredentials`):
   - JWTs have 3 dot-separated parts: header.payload.signature
   - Split token by `.` -- if not exactly 3 parts, return false (not a JWT, let server decide)
   - Base64url-decode the payload (index 1): replace `-` with `+`, `_` with `/`, then use `Buffer.from(payload, 'base64').toString()`
   - Parse the JSON payload, read the `exp` field (Unix timestamp in seconds)
   - If `exp` is missing, return false (not expired / can't determine)
   - Compare `exp` against `Math.floor(Date.now() / 1000)`. If `exp <= now`, return true (expired)
   - Wrap everything in try/catch -- if any parsing fails, return false (let server validate)

2. Modify `getEMCredentials()` to check JWT expiry:
   - After retrieving token from SecretStorage (`const token = await secretStorage?.get('bbj.em.token')`)
   - If token exists AND `isTokenExpired(token)` is true:
     - Delete the expired token: `await secretStorage?.delete('bbj.em.token')`
     - Fall through (return undefined triggers re-login in callers)
   - If token exists and NOT expired, return `{ username: '__token__', password: token }` as before

3. Add a helper function `validateTokenServerSide(context: vscode.ExtensionContext, token: string): Promise<boolean>`:
   - Get bbjHome from config, build bbj executable path (same pattern as loginEM command)
   - Build path to em-validate-token.bbj: `context.asAbsolutePath(path.join('tools', 'em-validate-token.bbj'))`
   - Execute: `"${bbj}" -q -tIO "${emValidatePath}" - "${token}"` with 10s timeout
   - Parse stdout: take last non-empty line, return true only if it equals "VALID"
   - On any error or timeout, return false
   - Log the validation command (masked token) if debug mode is on

4. Modify the `bbj.runBUI` command handler (around line 426) to add server-side validation:
   - After getting `creds` (and after the login-if-missing flow), before calling `Commands.runBUI`:
   - If `creds.username === '__token__'`, call `validateTokenServerSide(context, creds.password)`
   - If validation returns false:
     - Delete stored token: `await context.secrets.delete('bbj.em.token')`
     - Show info message: "EM token expired or invalid. Please log in again."
     - Execute `bbj.loginEM` command
     - Re-fetch creds: `creds = await getEMCredentials()`
     - If still no creds, return (user cancelled re-login)
   - Then proceed to `Commands.runBUI(params, creds)`

5. Apply the SAME server-side validation pattern to `bbj.runDWC` command handler (around line 442). Extract the validation + re-login logic into a shared async helper if it reduces duplication, e.g.:
   ```typescript
   async function ensureValidToken(context: vscode.ExtensionContext): Promise<{username: string, password: string} | undefined> {
       let creds = await getEMCredentials();
       if (!creds) {
           const login = await vscode.window.showInformationMessage(
               'EM login required. Login now?', 'Login', 'Cancel'
           );
           if (login === 'Login') {
               await vscode.commands.executeCommand('bbj.loginEM');
               creds = await getEMCredentials();
           }
           if (!creds) return undefined;
       }
       // Server-side validation for token auth
       if (creds.username === '__token__') {
           const valid = await validateTokenServerSide(context, creds.password);
           if (!valid) {
               await context.secrets.delete('bbj.em.token');
               vscode.window.showInformationMessage('EM token expired or invalid. Please log in again.');
               await vscode.commands.executeCommand('bbj.loginEM');
               creds = await getEMCredentials();
               if (!creds) return undefined;
           }
       }
       return creds;
   }
   ```
   Then use `ensureValidToken(context)` in both BUI and DWC handlers, replacing the existing creds-fetching logic.

IMPORTANT: The `context` variable must be captured from the `activate(context)` parameter -- it is already available in scope for the command handlers since they are registered inside `activate()`.
  </action>
  <verify>
    - `npm run build` (or equivalent TypeScript compilation) succeeds with no errors in bbj-vscode
    - Grep for `isTokenExpired` in extension.ts shows the function definition and usage in getEMCredentials
    - Grep for `validateTokenServerSide` in extension.ts shows the function definition and usage in BUI/DWC commands
    - Grep for `ensureValidToken` in extension.ts shows shared helper used by both BUI and DWC
  </verify>
  <done>
    - getEMCredentials() decodes JWT payload and returns undefined (triggering re-login) if token exp claim has passed
    - BUI and DWC commands validate token server-side via em-validate-token.bbj before launching
    - Invalid tokens are cleared from SecretStorage and automatic re-login is triggered
  </done>
</task>

<task type="auto">
  <name>Task 3: Add JWT expiry check + server-side validation to IntelliJ plugin</name>
  <files>
    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
  </files>
  <action>
1. Add `isTokenExpired(String token)` static method to `BbjEMTokenStore.java`:
   - Split token by `"."` -- if not exactly 3 parts, return false (not a JWT)
   - Base64url-decode the payload (index 1): use `java.util.Base64.getUrlDecoder().decode(parts[1])` to get bytes, then `new String(bytes, java.nio.charset.StandardCharsets.UTF_8)`
   - Parse JSON manually (no external dependency): find `"exp":` in the string, extract the numeric value after it. Use a simple regex or string search: `Pattern.compile("\"exp\"\\s*:\\s*(\\d+)")` and extract group 1 as long
   - If `exp` not found, return false
   - Compare: `exp <= System.currentTimeMillis() / 1000` -- if true, token is expired
   - Wrap in try/catch -- on any exception return false (let server validate)
   - Add import for `java.util.Base64`, `java.nio.charset.StandardCharsets`, `java.util.regex.Pattern`, `java.util.regex.Matcher`

2. Add `validateTokenServerSide(Project project)` method to `BbjRunActionBase.java`:
   - Returns boolean. Gets bbjHome from `BbjSettings.getInstance().getState().bbjHomePath`
   - Resolves bbj executable path using `getBbjExecutablePath()` (already exists in base class)
   - Resolves em-validate-token.bbj path using same plugin bundle pattern as `getWebBbjPath()`:
     ```java
     private String getEmValidateBbjPath() {
         try {
             var pluginId = com.intellij.openapi.extensions.PluginId.findId("com.basis.bbj");
             if (pluginId == null) return null;
             var plugin = com.intellij.ide.plugins.PluginManagerCore.getPlugin(pluginId);
             if (plugin == null) return null;
             java.nio.file.Path emValidate = plugin.getPluginPath().resolve("lib/tools/em-validate-token.bbj");
             return java.nio.file.Files.exists(emValidate) ? emValidate.toString() : null;
         } catch (Exception e) {
             return null;
         }
     }
     ```
   - Builds and executes: `bbj -q -tIO em-validate-token.bbj - <token>` using `GeneralCommandLine` + `CapturingProcessHandler` with 10s timeout (same pattern as `BbjEMLoginAction.performLogin`)
   - Parse stdout: take last non-empty line, return true only if equals "VALID"
   - On any error, return false
   - Method signature: `protected boolean validateTokenServerSide(@NotNull Project project, @NotNull String token)`

3. Modify `BbjRunBuiAction.buildCommandLine()` -- after getting token from `BbjEMTokenStore.getToken()` and the existing null/empty check with login prompt:
   - Add a new check AFTER the token is obtained (between the login-prompt block and the command building):
   ```java
   // Client-side JWT expiry check (fast path)
   if (BbjEMTokenStore.isTokenExpired(token)) {
       BbjEMTokenStore.deleteToken();
       token = null;
   }

   // Server-side validation (catches revoked tokens too)
   if (token != null && !validateTokenServerSide(project, token)) {
       BbjEMTokenStore.deleteToken();
       token = null;
   }

   // If token was invalidated, re-prompt login
   if (token == null || token.isEmpty()) {
       int result = Messages.showYesNoDialog(
           project,
           "EM token expired or invalid. Login again?",
           "Enterprise Manager Token Invalid",
           Messages.getQuestionIcon()
       );
       if (result == Messages.YES) {
           boolean loginOk = BbjEMLoginAction.performLogin(project);
           if (loginOk) {
               token = BbjEMTokenStore.getToken();
           }
       }
       if (token == null || token.isEmpty()) {
           logError(project, "EM login required for BUI run.");
           return null;
       }
   }
   ```

   IMPORTANT: Keep the existing null/empty login prompt as-is for the case where no token exists at all. The new validation block goes AFTER it, to handle the case where a stored token exists but is expired/invalid. Restructure the flow to:
   a. Get token
   b. If null/empty -> prompt login (existing code)
   c. If token exists -> check expiry (client-side) -> check validity (server-side) -> if invalid, clear + re-prompt

4. Apply the EXACT same validation pattern to `BbjRunDwcAction.buildCommandLine()`. The code is nearly identical to BUI -- add the same client-side + server-side validation block after the initial login prompt.

NOTE: The `validateTokenServerSide` and `getEmValidateBbjPath` methods live in `BbjRunActionBase` so both BUI and DWC actions inherit them.
  </action>
  <verify>
    - `cd bbj-intellij && ./gradlew compileJava` compiles without errors
    - Grep for `isTokenExpired` in BbjEMTokenStore.java shows the method
    - Grep for `validateTokenServerSide` in BbjRunActionBase.java shows the method
    - Grep for `isTokenExpired` in BbjRunBuiAction.java and BbjRunDwcAction.java shows usage
    - Grep for `em-validate-token` in BbjRunActionBase.java shows path resolution
  </verify>
  <done>
    - BbjEMTokenStore has isTokenExpired() that decodes JWT base64url payload and checks exp claim
    - BbjRunActionBase has validateTokenServerSide() that runs em-validate-token.bbj against EM
    - Both BUI and DWC actions check expiry client-side then validate server-side before launch
    - Invalid tokens are cleared from PasswordSafe and automatic re-login is triggered
  </done>
</task>

</tasks>

<verification>
1. VS Code: Open extension, check that `isTokenExpired`, `validateTokenServerSide`, and `ensureValidToken` functions exist in compiled output
2. IntelliJ: `./gradlew compileJava` passes, `./gradlew buildPlugin` succeeds
3. Both IDEs: em-validate-token.bbj is present in their respective tool bundles
4. Manual test: With a valid token stored, BUI/DWC runs should still work (validation passes). With an expired/invalid token, re-login should be triggered automatically.
</verification>

<success_criteria>
- em-validate-token.bbj exists in bbj-vscode/tools/ and is included in IntelliJ Gradle copy tasks
- em-login.bbj duration change (525000) is committed
- VS Code getEMCredentials() rejects expired JWTs client-side
- VS Code BUI/DWC commands validate tokens server-side before launch
- IntelliJ BbjEMTokenStore.isTokenExpired() decodes JWT and checks exp claim
- IntelliJ BUI/DWC actions validate tokens both client-side and server-side before launch
- All invalid/expired tokens trigger automatic re-login flow in both IDEs
- TypeScript and Java both compile cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/5-fix-em-token-expiration-jwt-expiry-check/5-SUMMARY.md`
</output>
