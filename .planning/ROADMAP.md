# Roadmap: BBj Language Server - IntelliJ Integration

## Milestones

- v1.0 Internal Alpha - Phases 1-6 (shipped 2026-02-01)
- v1.1 Polish & Run Commands - Phases 7-10 (in progress)

## Phases

<details>
<summary>v1.0 Internal Alpha (Phases 1-6) - SHIPPED 2026-02-01</summary>

See .planning/MILESTONES.md for details. 6 phases, 19 plans completed.

</details>

### v1.1 Polish & Run Commands (In Progress)

**Milestone Goal:** Bring IntelliJ plugin to feature parity with VSCode for icons and run commands, fix all known v1.0 issues, and restore structure view.

- [x] **Phase 7: Brand Icons** - Harvest VSCode brand icons and wire them into file types, plugin listing, and run actions
- [x] **Phase 8: Run Commands** - Run BBj programs as GUI/BUI/DWC with toolbar buttons, shortcuts, and error handling
- [ ] **Phase 9: Structure View** - Document outline via LSP DocumentSymbol with navigation
- [ ] **Phase 10: Bug Fixes & Polish** - Resolve all 7 carried-forward v1.0 issues

## Phase Details

### Phase 7: Brand Icons
**Goal**: BBj files, config files, and run actions display correct brand icons in both light and dark themes
**Depends on**: Nothing (first phase of v1.1; builds on v1.0 file type registration)
**Requirements**: ICON-01, ICON-02, ICON-03, ICON-04, ICON-05, ICON-06
**Success Criteria** (what must be TRUE):
  1. Opening a .bbj/.bbl/.bbjt/.src file shows the BBj file icon in the editor tab and project tree (both light and dark themes)
  2. Opening a .bbx file shows the BBj config icon in the editor tab and project tree (both light and dark themes)
  3. The plugin listing in Settings > Plugins shows the BBj brand icon
  4. Run GUI, Run BUI, and Run DWC toolbar buttons each display their distinct brand icons (light and dark)
**Plans:** 1 plan

Plans:
- [x] 07-01-PLAN.md — Convert VSCode SVGs to IntelliJ format, register .bbx file type, wire all icon constants

### Phase 8: Run Commands
**Goal**: Users can run BBj programs directly from IntelliJ as GUI, BUI, or DWC with one click or keyboard shortcut
**Depends on**: Phase 7 (run action icons needed for toolbar buttons)
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06, RUN-07, RUN-08, RUN-09, RUN-10, RUN-11, RUN-12
**Success Criteria** (what must be TRUE):
  1. User can run the current BBj file as GUI via menu action or toolbar button, and the bbj executable launches with the file
  2. User can run the current BBj file as BUI or DWC via menu action or toolbar button, and a browser-based session starts
  3. Pressing Alt+G / Alt+B / Alt+D triggers the corresponding run action from any BBj file
  4. Run commands respect BBj home and classpath from plugin settings; missing BBj home shows a clear error notification
  5. Active file is auto-saved before run execution
**Plans:** 2 plans

Plans:
- [x] 08-01-PLAN.md — GUI run action with base class, settings integration, and error handling
- [x] 08-02-PLAN.md — BUI/DWC run actions, web.bbj bundling, toolbar buttons, and keyboard shortcuts

### Phase 9: Structure View
**Goal**: Users can see and navigate the document outline of BBj files via the Structure tool window
**Depends on**: Nothing (independent LSP4IJ feature; can follow any phase)
**Requirements**: STRUC-01, STRUC-02, STRUC-03
**Success Criteria** (what must be TRUE):
  1. Opening the Structure tool window for a BBj file shows a tree of symbols (classes, methods, variables, labels) from the language server
  2. Editing the BBj file updates the Structure view to reflect new/removed/renamed symbols
  3. Clicking any symbol in the Structure view moves the cursor to that symbol's location in the editor
**Plans:** 1 plan

Plans:
- [ ] 09-01-PLAN.md — Register LSP4IJ psiStructureViewFactory extension point and verify Structure View rendering and navigation

### Phase 10: Bug Fixes & Polish
**Goal**: All 7 carried-forward v1.0 issues are resolved, completing the polish pass
**Depends on**: Phase 7 (FIX-05 needs icon pipeline established), Phase 8 (fixes should not regress run commands)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07
**Success Criteria** (what must be TRUE):
  1. Pressing Cmd+/ (or Ctrl+/) on selected lines toggles REM comment prefix correctly
  2. Bracket matching highlights matching parentheses, square brackets, and curly braces when cursor is adjacent
  3. Cmd+hover no longer shows "LSP Symbol ..." placeholder text (either suppressed or replaced with meaningful content)
  4. Closing the last BBj file does not immediately kill the language server; reopening a BBj file within a few seconds reuses the running server
  5. Completion popup shows distinct icons for functions, variables, and keywords instead of generic icons
**Plans**: TBD

Plans:
- [ ] 10-01: Fix comment toggling (REM), bracket matching, and LSP Symbol popup
- [ ] 10-02: Fix LS shutdown grace period, wire completion icons, remove stale META-INF, review Linux paths

## Progress

**Execution Order:** 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 7. Brand Icons | v1.1 | 1/1 | Complete | 2026-02-01 |
| 8. Run Commands | v1.1 | 2/2 | Complete | 2026-02-01 |
| 9. Structure View | v1.1 | 0/1 | Not started | - |
| 10. Bug Fixes & Polish | v1.1 | 0/2 | Not started | - |
