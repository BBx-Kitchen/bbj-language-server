---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
autonomous: true
must_haves:
  truths:
    - "BbjCompileAction no longer references MainToolbar group"
    - "BbjCompileAction is accessible from the editor context menu"
    - "Plugin builds without warnings about unregistered group IDs"
  artifacts:
    - path: "bbj-intellij/src/main/resources/META-INF/plugin.xml"
      provides: "Corrected action group registration for bbj.compile"
      contains: "add-to-group group-id=\"EditorPopupMenu\""
  key_links:
    - from: "plugin.xml bbj.compile action"
      to: "EditorPopupMenu group"
      via: "add-to-group element"
      pattern: "add-to-group group-id=\"EditorPopupMenu\""
---

<objective>
Fix the IntelliJ plugin error where BbjCompileAction references the non-existent "MainToolbar" group ID, causing a PluginException at startup.

Purpose: Eliminate the startup error `group with id "MainToolbar" isn't registered` by moving the compile action to the EditorPopupMenu, which is universally available across all IntelliJ Platform versions and configurations. This places the compile action alongside the existing run actions (GUI, BUI, DWC) in the editor right-click menu, providing a consistent and discoverable location.

Output: Updated plugin.xml with correct group registration.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bbj-intellij/src/main/resources/META-INF/plugin.xml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move BbjCompileAction from MainToolbar to EditorPopupMenu</name>
  <files>bbj-intellij/src/main/resources/META-INF/plugin.xml</files>
  <action>
In `bbj-intellij/src/main/resources/META-INF/plugin.xml`, modify the `bbj.compile` action registration (lines 61-68):

1. Change the comment from `<!-- BBj Compile Action (toolbar only) -->` to `<!-- BBj Compile Action -->`.

2. Replace the `add-to-group` element inside the `bbj.compile` action:
   - OLD: `<add-to-group group-id="MainToolbar" anchor="before" relative-to-action="RunConfiguration"/>`
   - NEW: `<add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runDwc"/>`

   This places the compile action in the editor context menu directly after the "Run As DWC Program" action, keeping all BBj actions grouped together. The `EditorPopupMenu` group is universally available across all IntelliJ Platform versions.

3. Also add the compile action to the ToolsMenu for discoverability (add a second `add-to-group` line):
   `<add-to-group group-id="ToolsMenu" anchor="last"/>`

   This mirrors the pattern used by the other BBj tool actions (restart server, refresh java classes, login to EM) which all register in ToolsMenu.

4. Add a keyboard shortcut for the compile action:
   `<keyboard-shortcut keymap="$default" first-keystroke="alt C"/>`

   This follows the pattern of the run actions (alt G, alt B, alt D).

The final bbj.compile action block should look like:

```xml
<!-- BBj Compile Action -->
<action id="bbj.compile"
        class="com.basis.bbj.intellij.actions.BbjCompileAction"
        text="Compile BBj File"
        description="Compile the current BBj file"
        icon="com.basis.bbj.intellij.BbjIcons.COMPILE">
    <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runDwc"/>
    <add-to-group group-id="ToolsMenu" anchor="last"/>
    <keyboard-shortcut keymap="$default" first-keystroke="alt C"/>
</action>
```

Do NOT change any other action registrations. Only modify the bbj.compile action block.
  </action>
  <verify>
1. Run: `grep -n "MainToolbar" bbj-intellij/src/main/resources/META-INF/plugin.xml` -- should return NO matches.
2. Run: `grep -n "bbj.compile" bbj-intellij/src/main/resources/META-INF/plugin.xml` -- should show the action with EditorPopupMenu and ToolsMenu group registrations.
3. Run: `cd bbj-intellij && ./gradlew buildPlugin --warning-mode all 2>&1 | tail -20` -- should build successfully without MainToolbar errors.
  </verify>
  <done>
The bbj.compile action no longer references MainToolbar. It is registered in EditorPopupMenu (after bbj.runDwc) and ToolsMenu (at the end), with an alt+C keyboard shortcut. The plugin builds cleanly without the "group with id MainToolbar isn't registered" error.
  </done>
</task>

</tasks>

<verification>
- `grep "MainToolbar" bbj-intellij/src/main/resources/META-INF/plugin.xml` returns empty (no MainToolbar references remain)
- `grep -c "add-to-group" bbj-intellij/src/main/resources/META-INF/plugin.xml` returns correct count (all groups are universally available: EditorPopupMenu, ToolsMenu, ProjectViewPopupMenu)
- Plugin builds successfully: `cd bbj-intellij && ./gradlew buildPlugin`
</verification>

<success_criteria>
- The PluginException about "MainToolbar" group not being registered is eliminated
- BbjCompileAction is accessible from the editor right-click context menu (after the DWC run action)
- BbjCompileAction is accessible from the Tools menu
- BbjCompileAction has a keyboard shortcut (alt+C)
- Plugin builds without errors or warnings related to group registration
</success_criteria>

<output>
After completion, create `.planning/quick/10-fix-intellij-maintoolbar-group-registrat/10-SUMMARY.md`
</output>
