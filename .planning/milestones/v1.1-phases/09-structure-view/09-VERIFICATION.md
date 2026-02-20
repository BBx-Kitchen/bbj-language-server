---
phase: 09-structure-view
verified: 2026-02-02T08:05:00Z
status: passed
score: 3/3 must-haves verified
---

# Phase 9: Structure View Verification Report

**Phase Goal:** Users can see and navigate the document outline of BBj files via the Structure tool window

**Verified:** 2026-02-02T08:05:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening the Structure tool window (Alt+7 / Cmd+7) for a BBj file shows a tree of symbols (variables, classes, labels, methods) | ✓ VERIFIED | Human verified: Structure view renders symbol tree with correct hierarchy. plugin.xml contains `lang.psiStructureViewFactory` extension point (lines 91-94) binding BBj language to `LSPDocumentSymbolStructureViewFactory` |
| 2 | Editing the BBj file updates the Structure view to reflect new/removed/renamed symbols | ✓ VERIFIED | Human verified: Adding new variable declaration updates Structure view in real-time. Language server DocumentSymbol provider confirmed working (test passes) |
| 3 | Clicking any symbol in the Structure view moves the cursor to that symbol's location in the editor | ✓ VERIFIED | Human verified: Click-to-navigate works correctly. LSP4IJ automatically handles navigation from documentSymbol ranges |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/resources/META-INF/plugin.xml` | LSP4IJ DocumentSymbol -> Structure View binding | ✓ VERIFIED | EXISTS (177 lines), SUBSTANTIVE (single focused extension point), WIRED (extension point correctly references LSP4IJ class) |
| `bbj-vscode/test/document-symbol.test.ts` | Language server DocumentSymbol test | ✓ VERIFIED | EXISTS (52 lines), test passes (1/1 passed, 365ms) |
| `bbj-vscode/src/language/bbj-node-kind.ts` | BBjNodeKindProvider maps AST to SymbolKind | ✓ VERIFIED | EXISTS (44 lines), SUBSTANTIVE (implements NodeKindProvider interface), WIRED (used by language server) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| plugin.xml | LSPDocumentSymbolStructureViewFactory | lang.psiStructureViewFactory extension point | ✓ WIRED | Lines 91-94: `<lang.psiStructureViewFactory language="BBj" implementationClass="com.redhat.devtools.lsp4ij.features.documentSymbol.LSPDocumentSymbolStructureViewFactory"/>` |
| Language server (main.cjs) | LSP4IJ DocumentSymbol handler | textDocument/documentSymbol LSP method | ✓ WIRED | `documentSymbolProvider: hasDocumentSymbolProvider` present in main.cjs (line 32867) |
| BBjNodeKindProvider | DocumentSymbolProvider | Langium service injection | ✓ WIRED | Test confirms: `documentSymbolProvider.getSymbols()` returns correct symbols with kinds (testVar!, TestClass, some_label) |

### Requirements Coverage

| Requirement | Status | Supporting Truths |
|-------------|--------|-------------------|
| STRUC-01: Document outline / Structure tool window shows symbols from the language server (classes, methods, variables, labels) | ✓ SATISFIED | Truth #1 verified via human testing and artifact analysis |
| STRUC-02: Structure view updates when document changes | ✓ SATISFIED | Truth #2 verified via human testing and language server test |
| STRUC-03: Clicking a symbol in Structure view navigates to its location in the editor | ✓ SATISFIED | Truth #3 verified via human testing (LSP4IJ handles automatically) |

### Anti-Patterns Found

None. Clean implementation:
- No TODO/FIXME comments
- No placeholder content
- No stub patterns
- Single-purpose extension point addition
- Existing language server functionality reused

### Human Verification Completed

All three success criteria were manually verified by the human according to SUMMARY.md (09-01-SUMMARY.md):

1. ✓ **STRUC-01**: Structure View shows symbol tree
   - Tested: Opened Structure tool window for BBj file
   - Result: Tree displays variables, classes, methods, labels with correct hierarchy
   - Verified: Both .bbj and .bbx files work

2. ✓ **STRUC-02**: Editing updates Structure view
   - Tested: Added new variable declaration `newVar$ = "hello"`
   - Result: Structure view updated in real-time to show new symbol
   - Verified: Real-time synchronization works

3. ✓ **STRUC-03**: Click-to-navigate works
   - Tested: Clicked various symbols in Structure view
   - Result: Editor cursor jumped to correct symbol locations
   - Verified: Navigation works for all symbol types

### Implementation Analysis

**What was built:**
- Single XML extension point addition (5 lines)
- Registers LSP4IJ's `LSPDocumentSymbolStructureViewFactory` for BBj language
- No custom Java classes needed (LSP4IJ provides implementation)

**Why it works:**
1. Language server already provides DocumentSymbol responses (Langium default)
2. BBjNodeKindProvider maps AST nodes to LSP SymbolKind (Function, Class, Array, Event, Package, Field)
3. LSP4IJ provides `LSPDocumentSymbolStructureViewFactory` which automatically:
   - Converts LSP DocumentSymbol to IntelliJ PsiStructureViewElement
   - Handles tree rendering with icons
   - Implements click-to-navigate from symbol ranges
4. Extension point binding is the only missing piece (LSP4IJ auto-registers for TEXT/TextMate but requires explicit registration for custom languages)

**Verification evidence:**
- Commit 7136f98: 5-line addition to plugin.xml
- Gradle JAR task: BUILD SUCCESSFUL (XML validated, dependencies resolved)
- Document-symbol test: PASSED (1/1 tests in 365ms)
- Human testing: All 3 success criteria verified

### Known Issues (Non-blocking)

From SUMMARY.md:
- Symbol kind differentiation: LabelDecl, VariableDecl, and FieldDecl all map to SymbolKind.Field in BBjNodeKindProvider, resulting in identical icons in Structure View
- This is a language server issue (bbj-node-kind.ts), not a plugin issue
- Does not block phase goal achievement (symbols still appear and navigate correctly)
- Filed as follow-up for icon refinement

## Verification Conclusion

**Status: PASSED**

All three observable truths verified. All required artifacts exist, are substantive, and are correctly wired. All requirements satisfied. Human verification completed and documented.

Phase 9 goal achieved: Users can see and navigate the document outline of BBj files via the Structure tool window.

---

_Verified: 2026-02-02T08:05:00Z_  
_Verifier: Claude (gsd-verifier)_  
_Method: Goal-backward verification (artifact analysis + human verification results)_
