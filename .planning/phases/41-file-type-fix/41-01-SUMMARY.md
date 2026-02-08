---
phase: 41-file-type-fix
plan: 01
subsystem: file-types
tags: [file-types, bbl, issue-369]
dependency_graph:
  requires: []
  provides: ["FTYP-01 .bbl exclusion"]
  affects: [package.json, langium-config, plugin.xml, bbj-ws-manager]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-vscode/src/language/bbj-ws-manager.ts
decisions:
  - Removed .bbl from all file type registrations (VS Code, IntelliJ, workspace manager)
  - Added .bbx and .src to shouldIncludeEntry for workspace indexing
metrics:
  duration: 15 minutes
  completed: 2026-02-08
---

# Phase 41 Plan 01: File Type Fix - Remove .bbl from BBj Source Registration

**One-liner:** Excluded .bbl library files from BBj source file registration in VS Code, IntelliJ, and workspace manager

## Summary

Removed `.bbl` from all BBj source file type registrations across both IDEs and the language server's workspace manager. Library files (.bbl) are binary/compiled artifacts that should not trigger language server features.

### What Was Built

- **VS Code:** Removed `.bbl` from `contributes.languages[].extensions` in package.json
- **IntelliJ:** Removed `bbl` from `fileType extensions` attribute in plugin.xml
- **Workspace Manager:** Updated `shouldIncludeEntry` to exclude `.bbl` and include `.bbx`/`.src`

### Key Implementation Details

1. **package.json:** Extensions array changed from `[".bbj", ".bbl", ".bbjt", ".src", ".bbx"]` to `[".bbj", ".bbjt", ".src", ".bbx"]`
2. **plugin.xml:** Extensions attribute changed from `bbj;bbl;bbjt;src;bbx` to `bbj;bbjt;src;bbx`
3. **bbj-ws-manager.ts:** `shouldIncludeEntry` filter updated to check `.bbj`, `.bbjt`, `.bbx`, `.src` (not `.bbl`)

## Deviations from Plan

- Also updated `shouldIncludeEntry` in bbj-ws-manager.ts (not in original plan but necessary for consistent .bbl exclusion during workspace indexing)
- langium-config.json was not modified as it didn't contain .bbl

## Testing

- Build succeeds with no compilation errors
- 468 tests pass, 6 pre-existing failures unchanged

## Commits

- d84f386: fix: exclude .bbl from BBj source file registration (#369)

## Self-Check: PASSED

All claimed artifacts verified:
- FOUND: bbj-vscode/package.json (modified - .bbl removed)
- FOUND: plugin.xml (modified - bbl removed)
- FOUND: bbj-ws-manager.ts (modified - shouldIncludeEntry updated)
- FOUND: commit d84f386
