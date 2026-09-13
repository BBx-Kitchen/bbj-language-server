---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/build.gradle.kts
  - .github/workflows/manual-release.yml
autonomous: true
---

<objective>
Automate JetBrains Marketplace publishing in the manual release workflow (x.y.0 releases).
</objective>

<tasks>
<task type="auto">
  <name>Add publishing config and workflow step</name>
  <files>bbj-intellij/build.gradle.kts, .github/workflows/manual-release.yml</files>
  <action>
  1. Add `publishing { token = ... }` block to build.gradle.kts
  2. Add `publishPlugin` step to manual-release.yml after verifyPlugin
  3. Update release notes to mention JetBrains Marketplace
  </action>
</task>
</tasks>
