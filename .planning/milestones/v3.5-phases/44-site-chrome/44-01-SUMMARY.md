---
phase: 44-site-chrome
plan: 01
subsystem: documentation
tags: [restructure, url-migration, ide-guides]
dependency-graph:
  requires: []
  provides: [vscode-guide-url-structure, intellij-guide-url-structure]
  affects: [site-navigation, documentation-urls]
tech-stack:
  added: []
  patterns: [docusaurus-categories, stub-pages]
key-files:
  created:
    - documentation/docs/vscode/_category_.json
    - documentation/docs/vscode/index.md
    - documentation/docs/intellij/_category_.json
    - documentation/docs/intellij/index.md
    - documentation/docs/intellij/getting-started.md
    - documentation/docs/intellij/features.md
    - documentation/docs/intellij/configuration.md
    - documentation/docs/intellij/commands.md
  modified:
    - documentation/docs/vscode/getting-started.md
  deleted:
    - documentation/docs/user-guide/ (entire directory)
    - documentation/docs/developer-guide/ (entire directory with architecture/ subdirectory)
decisions: []
metrics:
  duration: 105s
  completed: 2026-02-09
---

# Phase 44 Plan 01: Documentation Directory Restructure Summary

**One-liner:** Restructured documentation to IDE-specific guides at /docs/vscode/ and /docs/intellij/ URLs, removing generic user-guide and developer-guide directories.

## Execution Report

**Status:** Complete
**Tasks Completed:** 2/2
**Deviations:** None - plan executed exactly as written.

## What Was Built

### Task 1: Move VS Code user guide pages to docs/vscode/
- Created `documentation/docs/vscode/` directory
- Moved all 5 guide pages from user-guide/ to vscode/
- Updated index.md with `/vscode` slug and VS Code-specific branding
- Removed Roadmap link (Phase 47 will remove the roadmap)
- Removed Developer Guide architecture link
- Created `_category_.json` with "VS Code Guide" label and position 1
- Deleted entire `documentation/docs/user-guide/` directory

**Commit:** 0a8b04c

### Task 2: Create IntelliJ guide stubs and delete Developer Guide
- Created `documentation/docs/intellij/` directory
- Created `_category_.json` with "IntelliJ Guide" label and position 2
- Created 5 stub pages with consistent structure:
  - index.md (slug: /intellij)
  - getting-started.md
  - features.md
  - configuration.md
  - commands.md
- Each stub includes "Coming Soon" messaging and brief description
- Deleted entire `documentation/docs/developer-guide/` directory including:
  - 4 root-level pages (index, building, contributing, testing)
  - architecture/ subdirectory with 3 pages (overview, language-server, java-interop)
  - All _category_.json files

**Commit:** 2586653

## Files Changed

**Created:** 8 files
- 6 IntelliJ stub pages
- 2 _category_.json files (vscode + intellij)

**Modified:** 5 files
- vscode/index.md (slug and branding updates)
- vscode/getting-started.md (removed developer guide link)
- 4 other vscode pages (moved from user-guide/)

**Deleted:** 15 files
- 6 user-guide/ files
- 9 developer-guide/ files (including architecture subdirectory)

## Verification Results

**Directory Structure:**
```
documentation/docs/
├── vscode/ (6 files: 5 .md + 1 _category_.json)
├── intellij/ (6 files: 5 .md + 1 _category_.json)
└── roadmap.md
```

**URL Structure:**
- VS Code guide: /docs/vscode/
- IntelliJ guide: /docs/intellij/
- Old paths removed: /docs/user-guide/, /docs/developer-guide/

**Sidebar Configuration:**
- VS Code Guide at position 1, not collapsed
- IntelliJ Guide at position 2, not collapsed

All verification criteria passed.

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies

**Blocks:**
- 44-02 (Site Config Updates) - depends on new URL structure established here

**Unblocks:**
- All Phase 44 plans now have correct base URLs to reference

## Self-Check: PASSED

**Created files verified:**
```bash
✓ documentation/docs/vscode/index.md
✓ documentation/docs/vscode/getting-started.md
✓ documentation/docs/vscode/features.md
✓ documentation/docs/vscode/configuration.md
✓ documentation/docs/vscode/commands.md
✓ documentation/docs/vscode/_category_.json
✓ documentation/docs/intellij/index.md
✓ documentation/docs/intellij/getting-started.md
✓ documentation/docs/intellij/features.md
✓ documentation/docs/intellij/configuration.md
✓ documentation/docs/intellij/commands.md
✓ documentation/docs/intellij/_category_.json
```

**Commits verified:**
```bash
✓ 0a8b04c: feat(44-01): move VS Code guide to docs/vscode/
✓ 2586653: feat(44-01): create IntelliJ guide stubs and remove developer guide
```

**Deleted directories verified:**
```bash
✓ documentation/docs/user-guide/ does not exist
✓ documentation/docs/developer-guide/ does not exist
```
