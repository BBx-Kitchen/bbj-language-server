---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/build.gradle.kts
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
autonomous: true
must_haves:
  truths:
    - "em-login.bbj is bundled in the IntelliJ plugin at lib/tools/em-login.bbj"
    - "BbjEMLoginAction resolves the correct path to em-login.bbj"
    - "EM Login action can find and execute em-login.bbj from the plugin bundle"
  artifacts:
    - path: "bbj-intellij/build.gradle.kts"
      provides: "Gradle copy tasks include em-login.bbj alongside web.bbj"
      contains: "em-login.bbj"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java"
      provides: "Correct path resolution for em-login.bbj"
      contains: "lib/tools/em-login.bbj"
  key_links:
    - from: "bbj-intellij/build.gradle.kts"
      to: "bbj-vscode/tools/em-login.bbj"
      via: "Gradle copy task"
      pattern: "em-login\\.bbj"
    - from: "BbjEMLoginAction.java"
      to: "lib/tools/em-login.bbj"
      via: "plugin.getPluginPath().resolve()"
      pattern: "lib/tools/em-login\\.bbj"
---

<objective>
Fix em-login.bbj not found in IntelliJ plugin bundle.

Purpose: The IntelliJ plugin's "Login to Enterprise Manager" action fails because em-login.bbj is not
copied into the plugin bundle during build, and the path resolution in BbjEMLoginAction uses the wrong
relative path (missing `lib/` prefix). The VS Code extension works because it bundles the file in its
`tools/` directory. The IntelliJ plugin already bundles `web.bbj` correctly — em-login.bbj needs the
same treatment.

Output: Working EM Login action in IntelliJ plugin with em-login.bbj properly bundled and resolved.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-intellij/build.gradle.kts
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
@bbj-vscode/tools/em-login.bbj
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add em-login.bbj to Gradle build copy tasks</name>
  <files>bbj-intellij/build.gradle.kts</files>
  <action>
  In `bbj-intellij/build.gradle.kts`, the `copyWebRunner` task (line 92-97) copies only `web.bbj`
  from `bbj-vscode/tools/`. The `prepareSandbox` task (line 105-117) also only copies `web.bbj`.
  Both need to include `em-login.bbj` as well.

  Two changes needed:

  1. Rename `copyWebRunner` to `copyToolScripts` (or keep name, but include em-login.bbj).
     Update the `from` block to also `include("em-login.bbj")` alongside `include("web.bbj")`:

     ```kotlin
     val copyToolScripts by tasks.registering(Copy::class) {
         from("${projectDir}/../bbj-vscode/tools/") {
             include("web.bbj")
             include("em-login.bbj")
         }
         into(layout.buildDirectory.dir("resources/main/tools"))
     }
     ```

     Update the `processResources` dependency from `copyWebRunner` to `copyToolScripts`.

  2. In the `prepareSandbox` task, add `em-login.bbj` to the existing `from` block that
     copies `web.bbj` from `bbj-vscode/tools/`:

     ```kotlin
     from("${projectDir}/../bbj-vscode/tools/") {
         include("web.bbj")
         include("em-login.bbj")
         into("${pluginName.get()}/lib/tools")
     }
     ```

  This mirrors how web.bbj is already bundled, ensuring em-login.bbj ends up at
  `lib/tools/em-login.bbj` in the plugin installation directory.
  </action>
  <verify>Run `cd /Users/beff/_workspace/bbj-language-server && ./gradlew :bbj-intellij:processResources` and confirm `bbj-intellij/build/resources/main/tools/em-login.bbj` exists alongside `web.bbj`.</verify>
  <done>em-login.bbj is copied into both the resources and sandbox during IntelliJ plugin build, at the same path as web.bbj (lib/tools/).</done>
</task>

<task type="auto">
  <name>Task 2: Fix em-login.bbj path resolution in BbjEMLoginAction</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java</files>
  <action>
  In `BbjEMLoginAction.getEMLoginBbjPath()` (line 145-157), the path resolution uses:

  ```java
  Path toolsDir = plugin.getPluginPath().resolve("tools");
  Path emLogin = toolsDir.resolve("em-login.bbj");
  ```

  This is WRONG. The plugin sandbox puts files under `lib/tools/`, not `tools/`. Compare with
  `BbjRunActionBase.getWebBbjPath()` (line 236) which correctly uses:

  ```java
  java.nio.file.Path webBbjPath = plugin.getPluginPath().resolve("lib/tools/web.bbj");
  ```

  Fix `getEMLoginBbjPath()` to use the correct path with `lib/` prefix:

  ```java
  private static String getEMLoginBbjPath() {
      try {
          var pluginId = com.intellij.openapi.extensions.PluginId.findId("com.basis.bbj");
          if (pluginId == null) return null;
          var plugin = com.intellij.ide.plugins.PluginManagerCore.getPlugin(pluginId);
          if (plugin == null) return null;
          Path emLogin = plugin.getPluginPath().resolve("lib/tools/em-login.bbj");
          return Files.exists(emLogin) ? emLogin.toString() : null;
      } catch (Exception e) {
          return null;
      }
  }
  ```

  This matches the pattern used by BbjRunActionBase for web.bbj resolution.
  </action>
  <verify>Inspect the file to confirm the path resolves to `lib/tools/em-login.bbj`. Run `./gradlew :bbj-intellij:compileJava` to confirm compilation succeeds.</verify>
  <done>BbjEMLoginAction resolves em-login.bbj at `lib/tools/em-login.bbj` matching the actual plugin bundle structure, consistent with how BbjRunActionBase resolves web.bbj.</done>
</task>

</tasks>

<verification>
1. `./gradlew :bbj-intellij:processResources` succeeds
2. `bbj-intellij/build/resources/main/tools/em-login.bbj` exists
3. `./gradlew :bbj-intellij:compileJava` succeeds
4. `BbjEMLoginAction.getEMLoginBbjPath()` resolves to `lib/tools/em-login.bbj`
5. Both web.bbj and em-login.bbj are included in the prepareSandbox output
</verification>

<success_criteria>
- em-login.bbj is bundled in IntelliJ plugin at lib/tools/em-login.bbj
- BbjEMLoginAction correctly resolves the path using lib/tools/ prefix
- Plugin compiles successfully with both changes
- Path resolution is consistent with how web.bbj is resolved in BbjRunActionBase
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-em-login-bbj-not-found-in-intellij-p/2-SUMMARY.md`
</output>
