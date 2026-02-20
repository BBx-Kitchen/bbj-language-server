---
phase: 09-structure-view
plan: 01
status: complete
started: 2026-02-02
completed: 2026-02-02
---

## Summary

Registered the LSP4IJ `lang.psiStructureViewFactory` extension point for the BBj language in plugin.xml. This single XML addition connects the language server's DocumentSymbol responses to IntelliJ's Structure tool window.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add psiStructureViewFactory extension point to plugin.xml | 7136f98 | bbj-intellij/src/main/resources/META-INF/plugin.xml |
| 2 | Human verification of Structure View | - | - |

## Deliverables

- Structure tool window (Alt+7 / Cmd+7) displays symbol tree for BBj files
- Symbols include variables, classes, methods, labels in correct hierarchy
- Editing updates the Structure view in real-time
- Clicking a symbol navigates to its location in the editor
- Works for both .bbj and .bbx file types

## Decisions

| Decision | Rationale |
|----------|-----------|
| Single XML extension point, no custom Java class | LSP4IJ's LSPDocumentSymbolStructureViewFactory handles all mapping |

## Deviations

None.

## Issues Found

- Symbol kind differentiation: LabelDecl, VariableDecl, and FieldDecl all map to SymbolKind.Field in BBjNodeKindProvider, resulting in identical icons in Structure View. This is a language server issue (bbj-node-kind.ts), not a plugin issue. Filed as follow-up.

## Verification

- [x] plugin.xml contains `lang.psiStructureViewFactory` for language="BBj"
- [x] Implementation class: `com.redhat.devtools.lsp4ij.features.documentSymbol.LSPDocumentSymbolStructureViewFactory`
- [x] Document-symbol test passes (server-side confirmed working)
- [x] Gradle buildPlugin succeeds (XML valid, class resolves)
- [x] STRUC-01: Structure View shows symbol tree (human verified)
- [x] STRUC-02: Editing updates Structure View (human verified)
- [x] STRUC-03: Click-to-navigate works (human verified)
