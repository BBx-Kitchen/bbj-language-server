---
phase: 42-toolbar-button-polish
plan: 01
subsystem: toolbar, icons
tags: [toolbar, compile, decompile, icons, issue-370, issue-354]
dependency_graph:
  requires: ["Phase 41 file type fix"]
  provides: ["TOOL-01 decompile removed", "TOOL-02 compile icon", "TOOL-03 file-scoped visibility"]
  affects: [plugin.xml, package.json, extension.ts, Commands.cjs, BbjCompileAction, BbjIcons]
tech_stack:
  added: []
  patterns: [file-scoped-action-visibility]
key_files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java
    - bbj-intellij/src/main/resources/icons/compile.svg
    - bbj-intellij/src/main/resources/icons/compile_dark.svg
    - bbj-vscode/images/bbj-compile-light.svg
    - bbj-vscode/images/bbj-compile-dark.svg
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
    - bbj-vscode/package.json
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/Commands/Commands.cjs
decisions:
  - Removed decompile command entirely from both VS Code and IntelliJ
  - Added when clauses to compile and denumber menu entries (resourceExtname =~ BBj pattern)
  - Created compile icons for both light and dark themes in both IDEs
metrics:
  duration: 30 minutes
  completed: 2026-02-08
---

# Phase 42 Plan 01: Toolbar Button Polish

**One-liner:** Removed decompile command, added compile icons and file-scoped visibility to toolbar actions in both IDEs

## Summary

Cleaned up toolbar buttons across both VS Code and IntelliJ: removed the non-functional Decompile command entirely, created proper compile icons, and added `when` clause visibility guards so compile/denumber buttons only appear for BBj source files.

### What Was Built

**IntelliJ:**
- Created `BbjCompileAction.java` with file-scoped visibility (BBj files only)
- Added `COMPILE` icon constant to `BbjIcons.java`
- Created `compile.svg` and `compile_dark.svg` icons
- Registered compile action in plugin.xml with toolbar placement

**VS Code:**
- Removed `bbj.decompile` command registration from extension.ts
- Removed `decompile` export from Commands.cjs (kept internal function for denumber)
- Removed `onCommand:bbj.decompile` from activation events in package.json
- Added `when` clauses to compile and denumber menu entries
- Created `bbj-compile-light.svg` and `bbj-compile-dark.svg` icons

### Key Implementation Details

1. **Decompile removal:** All references removed from both IDEs — command, menu entries, activation events
2. **When clauses:** `resourceExtname =~ /\\.(bbj|bbjt|bbx|src)$/i` ensures toolbar buttons only appear for BBj files
3. **Compile icons:** Document+code SVG icons, stroke #424242 for light theme, #fff for dark theme

## Deviations from Plan

- VS Code side also needed changes (plan was IntelliJ-focused)
- Kept internal `decompile` function in Commands.cjs since `denumber` depends on it

## Testing

- IntelliJ build succeeds
- VS Code build succeeds
- 468 tests pass, 6 pre-existing failures unchanged

## Commits

- 132f946: feat(42-01): add compile action with file-scoped visibility
- d190db6: fix(vscode): remove decompile command, add when clauses and compile icons (#370)

## Self-Check: PASSED

All claimed artifacts verified:
- FOUND: BbjCompileAction.java (created)
- FOUND: compile.svg and compile_dark.svg (created in both IDEs)
- FOUND: bbj.decompile removed from package.json, extension.ts, Commands.cjs
- FOUND: when clauses in package.json menu entries
- FOUND: commits 132f946 and d190db6
