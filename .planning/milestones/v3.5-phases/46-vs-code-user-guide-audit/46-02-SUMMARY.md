---
phase: 46-vs-code-user-guide-audit
plan: 02
subsystem: documentation
tags: [documentation, vscode, audit, configuration, commands]
dependencies:
  requires: [bbj-vscode/package.json]
  provides: [documentation/docs/vscode/configuration.md, documentation/docs/vscode/commands.md]
  affects: []
tech-stack:
  added: []
  patterns: [token-based-auth, settings-documentation, command-documentation]
key-files:
  created: []
  modified:
    - documentation/docs/vscode/configuration.md
    - documentation/docs/vscode/commands.md
decisions:
  - "Document token-based EM auth via bbj.loginEM command instead of plaintext password settings"
  - "Remove manual gradlew instructions as Java interop service is managed by BBjServices"
  - "Add note that compiler options are configured through UI command, not manually in settings.json"
metrics:
  duration: 171s
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_date: 2026-02-09
---

# Phase 46 Plan 02: VS Code Configuration and Commands Audit Summary

**One-liner:** Removed phantom settings/commands and added all v3.x features (token auth, configPath, typeResolution, interop settings, loginEM, refreshJavaClasses, configureCompileOptions)

## What Was Done

Audited and updated the VS Code Configuration and Commands documentation pages to accurately reflect the actual extension capabilities in v3.x.

### Configuration Page Updates

**Removed phantom settings:**
- `bbj.web.username` setting (does not exist in package.json)
- `bbj.web.password` setting (does not exist in package.json)
- Manual `./gradlew run` instructions for Java interop service

**Added v3.x settings:**
- `bbj.em.url` - Enterprise Manager URL for BUI/DWC commands and authentication
- `bbj.configPath` - Custom config.bbx file path for PREFIX resolution
- `bbj.typeResolution.warnings` - Toggle for type resolution warnings in dynamic codebases
- `bbj.interop.host` - Java interop service hostname (default: localhost)
- `bbj.interop.port` - Java interop service port (default: 5008)

**Authentication documentation:**
- Replaced plaintext username/password settings with token-based Enterprise Manager authentication flow
- Documented `BBj: Login to Enterprise Manager` command for JWT token storage in VS Code's SecretStorage
- Added authentication flow steps (login → enter credentials → token stored → persists across restarts)

### Commands Page Updates

**Removed phantom command:**
- Decompile command (`bbj.decompile`) - does not exist in package.json
- Alt+X keyboard shortcut (was assigned to Decompile)
- All Decompile references from context menu listings

**Added missing v3.x commands:**
- `bbj.loginEM` - Login to Enterprise Manager for BUI/DWC authentication
- `bbj.refreshJavaClasses` - Reload Java classpath and clear cached class info
- `bbj.configureCompileOptions` - Open UI dialog for compiler options

**Documentation improvements:**
- Updated BUI/DWC command notes to mention authentication requirement
- Added "BUI/DWC Commands Fail" troubleshooting section with authentication steps
- Clarified Requirements section to include EM authentication for BUI/DWC
- Updated context menu listings to match actual registered commands in package.json

## Verification Results

All 8 verification checks passed:

1. ✓ No "decompile" references in commands.md
2. ✓ "username"/"password" only appear in EM login dialog context, not as settings
3. ✓ `bbj.em.url` appears 3 times in configuration.md
4. ✓ `bbj.configPath` appears 3 times in configuration.md
5. ✓ `bbj.typeResolution.warnings` appears 3 times in configuration.md
6. ✓ `loginEM` appears in commands.md
7. ✓ `refreshJavaClasses` appears in commands.md
8. ✓ `configureCompileOptions` appears in commands.md

## Requirements Addressed

- **VSCA-02 (Commands audit):** Removed phantom Decompile command, added all missing v3.x commands
- **VSCA-03 (Configuration audit):** Removed phantom username/password settings, added all v3.x settings
- **VSCA-01 (v3.x additions):** Documented token auth, configPath, typeResolution warnings, interop settings

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

### documentation/docs/vscode/configuration.md
- Removed: `bbj.web.username`, `bbj.web.password` sections and references
- Added: `bbj.em.url`, `bbj.configPath`, `bbj.typeResolution.warnings`, `bbj.interop.host`, `bbj.interop.port` sections
- Replaced: Enterprise Manager section with token-based authentication flow
- Updated: Complete settings example with all v3.x settings
- Removed: Manual gradlew instructions
- Added: Note about compiler options being configured via UI

### documentation/docs/vscode/commands.md
- Removed: Decompile command section, Alt+X shortcut, all Decompile references
- Added: Login to Enterprise Manager, Refresh Java Classes, Configure Compile Options sections
- Updated: BUI/DWC command notes to mention authentication requirement
- Added: BUI/DWC troubleshooting section with authentication steps
- Updated: Context menu listings to match package.json

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 411fa1b | docs(46-02): audit and update VS Code Configuration page | configuration.md |
| 8591ee2 | docs(46-02): audit and update VS Code Commands page | commands.md |

## Impact

### User-Facing
- Documentation now accurately reflects actual extension capabilities
- Users will no longer search for non-existent settings or commands
- Clear guidance on token-based Enterprise Manager authentication
- All v3.x features are now documented

### Technical
- Configuration and Commands pages now match package.json truth
- Documentation debt eliminated for VS Code guide
- Foundation for accurate user onboarding in v3.5 release

## Self-Check: PASSED

**Created files:** None (audit task - modified existing files)

**Modified files:**
- ✓ documentation/docs/vscode/configuration.md exists and was modified
- ✓ documentation/docs/vscode/commands.md exists and was modified

**Commits:**
- ✓ 411fa1b exists (Task 1 - configuration page)
- ✓ 8591ee2 exists (Task 2 - commands page)

All expected files and commits verified successfully.
