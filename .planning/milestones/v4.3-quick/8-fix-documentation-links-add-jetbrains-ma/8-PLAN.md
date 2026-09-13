---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - documentation/docusaurus.config.ts
  - documentation/src/pages/index.tsx
  - documentation/docs/intellij/index.md
  - documentation/docs/vscode/index.md
autonomous: true
---

<objective>
Fix documentation links: correct JetBrains Marketplace URL and BBj Documentation footer URL across all docs files.
</objective>

<tasks>
<task type="auto">
  <name>Fix JetBrains Marketplace and BBj Documentation URLs</name>
  <files>documentation/docusaurus.config.ts, documentation/src/pages/index.tsx, documentation/docs/intellij/index.md, documentation/docs/vscode/index.md</files>
  <action>
  1. Replace `https://plugins.jetbrains.com/plugin/com.basis.bbj` with `https://plugins.jetbrains.com/plugin/30033-bbj-language-support` (3 occurrences: navbar, footer, homepage)
  2. Replace `https://documentation.basis.cloud/BASISHelp/WebHelp/bbjoverview/bbjoverview.htm` with `https://documentation.basis.cloud/BASISHelp/WebHelp/index.htm` (3 occurrences: footer, VS Code index, IntelliJ index)
  </action>
</task>
</tasks>
