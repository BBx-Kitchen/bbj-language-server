---
phase: 12-use-actual-jetbrains-ide-product-name
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
autonomous: true
must_haves:
  truths:
    - "EM auth info-string contains actual JetBrains product name (e.g. IntelliJ IDEA, PyCharm, WebStorm) instead of hardcoded IntelliJ"
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      provides: "EM login action with dynamic product name"
      contains: "ApplicationNamesInfo.getInstance().getFullProductName()"
  key_links:
    - from: "BbjEMLoginAction.java"
      to: "ApplicationNamesInfo API"
      via: "getFullProductName() call in info-string construction"
      pattern: "ApplicationNamesInfo\\.getInstance\\(\\)\\.getFullProductName\\(\\)"
---

<objective>
Replace the hardcoded "IntelliJ" string in the EM authentication info-string with the actual JetBrains IDE product name using the platform API.

Purpose: When the plugin runs in PyCharm, WebStorm, or other JetBrains IDEs, the EM token payload should reflect the actual product name, not always say "IntelliJ".
Output: Updated BbjEMLoginAction.java with dynamic product name.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
</context>

<tasks>

<task type="auto">
  <name>Task 1: Use ApplicationNamesInfo for dynamic product name in EM info-string</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java</files>
  <action>
1. Add import at the top of the file (after the existing IntelliJ imports, around line 7-12):
   ```java
   import com.intellij.openapi.application.ApplicationNamesInfo;
   ```

2. On line 110, replace the hardcoded "IntelliJ" with a call to get the actual product name. Change:
   ```java
   cmd.addParameter("IntelliJ on " + platform + " as " + System.getProperty("user.name"));
   ```
   to:
   ```java
   String productName = ApplicationNamesInfo.getInstance().getFullProductName();
   cmd.addParameter(productName + " on " + platform + " as " + System.getProperty("user.name"));
   ```

This uses the IntelliJ Platform API `ApplicationNamesInfo.getInstance().getFullProductName()` which returns the full product name like "IntelliJ IDEA", "PyCharm", "WebStorm", "Android Studio", etc. depending on the host IDE.

Do NOT use `getProductName()` (returns short name like "IDEA") or `getFullProductNameWithoutEdition()`. Use `getFullProductName()` which includes the edition when applicable.
  </action>
  <verify>
Run `cd /Users/beff/_workspace/bbj-language-server && ./gradlew :bbj-intellij:compileJava` to confirm the file compiles without errors. Grep the modified file to confirm:
- `ApplicationNamesInfo` import is present
- `getFullProductName()` is used in the info-string
- No remaining hardcoded `"IntelliJ on "` string literal
  </verify>
  <done>
The EM auth info-string dynamically uses the actual JetBrains IDE product name. The hardcoded "IntelliJ" is removed. The file compiles successfully.
  </done>
</task>

</tasks>

<verification>
- `./gradlew :bbj-intellij:compileJava` passes
- Line 110 area contains `ApplicationNamesInfo.getInstance().getFullProductName()` instead of hardcoded `"IntelliJ"`
- Import for `ApplicationNamesInfo` is present
</verification>

<success_criteria>
- Hardcoded "IntelliJ" replaced with dynamic product name via `ApplicationNamesInfo.getInstance().getFullProductName()`
- File compiles without errors
- Info-string format is now "{ProductName} on {Platform} as {Username}" (e.g. "IntelliJ IDEA on MacOS as beff", "PyCharm on Windows as john")
</success_criteria>

<output>
After completion, create `.planning/quick/12-use-actual-jetbrains-ide-product-name-in/12-SUMMARY.md`
</output>
