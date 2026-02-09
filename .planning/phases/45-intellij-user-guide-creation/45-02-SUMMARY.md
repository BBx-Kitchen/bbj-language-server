---
phase: 45-intellij-user-guide-creation
plan: 02
subsystem: documentation
tags: [intellij, user-guide, documentation, configuration, commands]

dependency_graph:
  requires: []
  provides:
    - intellij-configuration-docs
    - intellij-commands-docs
  affects:
    - documentation-site

tech_stack:
  added: []
  patterns:
    - markdown-documentation
    - docusaurus-pages
    - cross-referencing

key_files:
  created: []
  modified:
    - documentation/docs/intellij/configuration.md
    - documentation/docs/intellij/commands.md

decisions:
  - decision: "Document Settings UI path as 'Languages & Frameworks > BBj'"
    rationale: "IntelliJ plugin uses native Settings UI, not JSON configuration like VS Code"
    timestamp: "2026-02-09"

  - decision: "Log Level dropdown documented instead of bbj.debug flag"
    rationale: "IntelliJ plugin uses dropdown with Error/Warn/Info/Debug, not boolean flag"
    timestamp: "2026-02-09"

  - decision: "Compile action documented as toolbar-only, no keyboard shortcut"
    rationale: "plugin.xml shows compile in MainToolbar only, no keyboard shortcut assigned"
    timestamp: "2026-02-09"

  - decision: "Exclude VS Code-only commands (Decompile, Denumber, Alt+C/X/N)"
    rationale: "These actions not present in IntelliJ plugin.xml; would create false expectations"
    timestamp: "2026-02-09"

metrics:
  duration_seconds: 146
  completed: "2026-02-09T17:32:05Z"
  tasks_completed: 2
  files_modified: 2
  lines_added: 384
  lines_removed: 36
---

# Phase 45 Plan 02: IntelliJ Configuration and Commands Documentation

**One-liner:** Complete IntelliJ Settings UI reference (Languages & Frameworks > BBj) and command/shortcut documentation (Alt+G/B/D, toolbar compile, Tools menu actions).

## Overview

Replaced "Coming Soon" stubs in IntelliJ configuration.md and commands.md with comprehensive documentation reflecting the actual IntelliJ plugin implementation. Both pages now provide complete references for IntelliJ users to configure and operate the BBj Language Support plugin.

## Objectives

- [x] IJUG-03 (Configuration): Document Settings UI at Languages & Frameworks > BBj with all settings
- [x] IJUG-04 (Commands): Document all keyboard shortcuts, toolbar buttons, context menu actions, and Tools menu commands
- [x] Use IntelliJ-specific terminology and navigation paths (no VS Code concepts)
- [x] Cross-reference between configuration and commands for EM authentication
- [x] Site builds successfully

## Tasks Executed

### Task 1: Write IntelliJ Configuration page

**Status:** ✓ Complete

**Commit:** `6f3ad9f`

**What was done:**
- Replaced "Coming Soon" stub with comprehensive settings documentation
- Preserved frontmatter (sidebar_position: 4, title: Configuration)
- Documented Settings UI path: Settings > Languages & Frameworks > BBj (application-level, not project-level)
- Organized by setting groups matching actual Settings UI layout

**Settings documented:**
- **BBj Environment:** BBj Home (auto-detection, validation), config.bbx path (optional)
- **Node.js Runtime:** Node.js path (auto-detection from PATH, version 18+, auto-download support)
- **Classpath:** Classpath Entry dropdown (populated from basis.classpath.* in BBj.properties)
- **Language Server:** Log Level dropdown (Error, Warn, Info, Debug) with debug logging explanation
- **Java Interop:** Host (default: localhost), Port (default: 5008, auto-detected from BBj.properties, range 1-65535)
- **Enterprise Manager:** EM URL (default: http://localhost:8888), EM Token Authentication (via Tools > Login to EM, stored in PasswordSafe)
- **Run Settings:** Auto-save before run (checkbox, default: enabled)
- **Troubleshooting:** Verify BBj Home, Check Classpath, Language Server Logs

**Files modified:**
- `documentation/docs/intellij/configuration.md` (174 insertions, 18 deletions)

**Verification:** No "Coming Soon" text, all required content present (Languages & Frameworks path, BBj Home, classpath, Java Interop, config.bbx, Log Level, EM URL, PasswordSafe/token, Auto-save), no VS Code terminology (settings.json, bbj.debug).

### Task 2: Write IntelliJ Commands page

**Status:** ✓ Complete

**Commit:** `5f39f31`

**What was done:**
- Replaced "Coming Soon" stub with comprehensive commands documentation
- Preserved frontmatter (sidebar_position: 5, title: Commands)
- Used title "IntelliJ Commands" (matching VS Code's "VS Code Commands" pattern)
- Documented all actions from plugin.xml source analysis

**Commands documented:**

**Run Commands:**
- Run As BBj Program (Alt+G): GUI desktop application, editor/Project View context menus
- Run As BUI Program (Alt+B): BUI web application, requires EM authentication, opens in browser
- Run As DWC Program (Alt+D): DWC web application, requires EM authentication, opens in browser

**Compile Command:**
- Compile BBj File: Toolbar button (before Run Configuration area), no keyboard shortcut by default

**Tools Menu Commands:**
- Restart BBj Language Server: Use when server unresponsive or after config changes
- Refresh Java Classes: Reloads classpath, use when classpath changes
- Login to Enterprise Manager: Authenticates and stores JWT token in PasswordSafe, required for BUI/DWC

**Additional sections:**
- Keyboard Shortcuts Summary table (Alt+G/B/D, toolbar compile)
- Context Menus: Editor (right-click in BBj file), Project View (right-click file > BBj Run submenu)
- Toolbar Buttons: Compile button placement
- Auto-Save Option: Cross-reference to Configuration page
- Requirements: BBj Home, BBjServices running, language server Ready state, EM authentication for BUI/DWC
- Troubleshooting: Commands not available, run commands fail, BUI/DWC fail, compile issues

**Files modified:**
- `documentation/docs/intellij/commands.md` (210 insertions, 18 deletions)

**Verification:** No "Coming Soon" text, all required content present (Alt+G/B/D, Compile, Restart Language Server, Refresh Java Classes, Login to EM, Context Menu, Toolbar), no VS Code-only content (Decompile, Denumber, Command Palette, Alt+C/X/N).

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**Phase-level checks:**
1. ✓ Both files exist and contain no "Coming Soon" text
2. ✓ configuration.md documents all settings from IJUG-03: BBj Home, classpath, interop host/port, config.bbx, log level (debug flag equivalent), EM token auth
3. ✓ commands.md documents all actions from IJUG-04: Alt+G/B/D shortcuts, compile toolbar button, context menu actions, Tools menu commands
4. ✓ No VS Code-specific terminology (settings.json, Command Palette, Output panel, VSIX, Alt+C, Alt+X, Alt+N)
5. ✓ EM token authentication documented in both files (configuration shows the setting, commands shows the login action)
6. ✓ Docusaurus site builds without errors (warnings about broken links from Phase 44 restructuring are expected)

## Success Criteria Assessment

- [x] IJUG-03 (Configuration) requirements fully satisfied: Settings UI path, all settings documented (BBj Home, classpath, interop host/port, config.bbx, debug/log level, EM token auth)
- [x] IJUG-04 (Commands) requirements fully satisfied: all keyboard shortcuts (Alt+G/B/D), toolbar buttons (Compile), context menu actions, Tools menu commands
- [x] All pages use IntelliJ-specific terminology and navigation paths
- [x] Cross-references between configuration and commands pages for EM authentication
- [x] Site builds successfully

## Key Decisions

1. **Settings UI path:** Documented as "Languages & Frameworks > BBj" to reflect IntelliJ's native Settings UI (not JSON configuration like VS Code).

2. **Log Level dropdown:** Documented as dropdown with Error/Warn/Info/Debug options instead of bbj.debug boolean flag (IntelliJ-specific implementation).

3. **Compile action:** Documented as toolbar-only with no keyboard shortcut by default (matches plugin.xml - no keyboard shortcut assigned).

4. **Excluded VS Code-only commands:** Did not document Decompile, Denumber, Show config.bbx, Show BBj.properties, Open Enterprise Manager, Show Classpath Entries, Alt+C/X/N shortcuts (not present in IntelliJ plugin.xml).

## Self-Check: PASSED

**Created files:** None (modified existing stub files)

**Modified files:**
- FOUND: documentation/docs/intellij/configuration.md
- FOUND: documentation/docs/intellij/commands.md

**Commits:**
- FOUND: 6f3ad9f (Task 1: configuration.md)
- FOUND: 5f39f31 (Task 2: commands.md)

**Build verification:**
- Docusaurus site builds successfully with expected warnings (broken links from Phase 44 restructuring)

All claims verified. Plan execution complete.
