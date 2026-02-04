# Full Test Checklist

## Purpose
Comprehensive test coverage for all BBj Language Server features across both VS Code and IntelliJ IDEA clients.

**Estimated Time:** 30-45 minutes

**Instructions:**
1. Copy this file to `QA/test-runs/YYYY-MM-DD-full-test.md`
2. Execute all tests
3. Mark `[ ]` with `[x]` for PASS or `[FAIL]` for failures
4. Rename file with `-PASS` or `-FAIL` suffix
5. Document failures with evidence (see TESTING-GUIDE.md)

---

## VS Code - LSP Features

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Syntax Highlighting | 1. Open VS Code<br>2. Open `examples/bbj-classes.bbj`<br>3. Verify keywords are colored distinctly | Keywords (e.g., `class`, `method`, `if`) are colored differently from strings, comments, and identifiers | [ ] |
| 2 | Diagnostics | 1. Create new file `test.bbj`<br>2. Type: `MODE "INVALID"`<br>3. Save file<br>4. Check for error indicator | Red squiggle appears under `"INVALID"` with error message | [ ] |
| 3 | Code Completion (BBj) | 1. Create new file `test.bbj`<br>2. Type: `PR`<br>3. Press `Ctrl+Space` (Windows/Linux) or `Cmd+Space` (macOS)<br>4. Check completion list | Completion list shows `PRINT` and other PR* keywords | [ ] |
| 4 | Code Completion (Java) | 1. Create new file `test.bbj`<br>2. Type: `use java.util.Hash`<br>3. Press `Ctrl+Space` / `Cmd+Space`<br>4. Check completion list | Completion list shows `HashMap`, `HashSet`, etc. | [ ] |
| 5 | Hover Information | 1. Open file with variable declarations<br>2. Hover mouse over variable usage<br>3. Check tooltip content | Tooltip shows variable type and/or documentation | [ ] |
| 6 | Signature Help | 1. Create new file `test.bbj`<br>2. Type: `STR(`<br>3. Check for parameter popup | Popup shows parameter information for STR function | [ ] |
| 7 | Go-to-Definition | 1. Open file with method call<br>2. Right-click on method name<br>3. Select "Go to Definition"<br>4. Verify navigation | Editor navigates to method definition location | [ ] |
| 8 | Document Symbols | 1. Open file with classes/methods<br>2. Open Outline view (`Ctrl+Shift+O` / `Cmd+Shift+O`)<br>3. Verify hierarchy | Outline shows class/method/field hierarchy with correct icons | [ ] |
| 9 | Semantic Tokens | 1. Open file with variables and keywords<br>2. Compare coloring of variables vs. keywords | Variables colored differently from keywords; parameters vs. local variables distinguishable | [ ] |

---

## IntelliJ IDEA - LSP Features

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Syntax Highlighting | 1. Open IntelliJ IDEA<br>2. Open `examples/bbj-classes.bbj`<br>3. Verify keywords are colored distinctly | Keywords (e.g., `class`, `method`, `if`) are colored differently from strings, comments, and identifiers | [ ] |
| 2 | Diagnostics | 1. Create new file `test.bbj`<br>2. Type: `MODE "INVALID"`<br>3. Save file<br>4. Check for error indicator | Red squiggle or error highlight appears with error message | [ ] |
| 3 | Code Completion (BBj) | 1. Create new file `test.bbj`<br>2. Type: `PR`<br>3. Press `Ctrl+Space`<br>4. Check completion list | Completion list shows `PRINT` and other PR* keywords | [ ] |
| 4 | Code Completion (Java) | 1. Create new file `test.bbj`<br>2. Type: `use java.util.Hash`<br>3. Press `Ctrl+Space`<br>4. Check completion list | Completion list shows `HashMap`, `HashSet`, etc. | [ ] |
| 5 | Hover Information | 1. Open file with variable declarations<br>2. Hover mouse over variable usage<br>3. Check tooltip content | Tooltip shows variable type and/or documentation | [ ] |
| 6 | Signature Help | 1. Create new file `test.bbj`<br>2. Type: `STR(`<br>3. Check for parameter popup | Popup shows parameter information for STR function | [ ] |
| 7 | Go-to-Definition | 1. Open file with method call<br>2. Right-click on method name<br>3. Select "Go to Declaration" or use `Ctrl+B`<br>4. Verify navigation | Editor navigates to method definition location | [ ] |
| 8 | Document Symbols | 1. Open file with classes/methods<br>2. Open Structure view (usually left sidebar or `Alt+7`)<br>3. Verify hierarchy | Structure view shows class/method/field hierarchy | [ ] |
| 9 | Semantic Tokens | 1. Open file with variables and keywords<br>2. Compare coloring of variables vs. keywords | Variables colored differently from keywords; semantic highlighting active | [ ] |

---

## VS Code - Run Commands

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Run Program | 1. Open VS Code<br>2. Open any `.bbj` file (e.g., `examples/hello.bbj`)<br>3. Right-click in editor<br>4. Select "Run BBj" > "Run Program"<br>5. Check output terminal | Program executes and output appears in terminal | [ ] |
| 2 | Run with Debug | 1. Open any `.bbj` file<br>2. Right-click in editor<br>3. Select "Run BBj" > "Run with Debug"<br>4. Check output terminal | Program executes with debug output/logging enabled | [ ] |
| 3 | Run as BUI/DWC | 1. Open `.bbj` file with GUI components (if applicable)<br>2. Right-click in editor<br>3. Select "Run BBj" > "Run as BUI" or "Run as DWC"<br>4. Check for browser/window launch | Program launches in BUI or DWC mode | [ ] |

---

## IntelliJ IDEA - Run Commands

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Run Program | 1. Open IntelliJ IDEA<br>2. Open any `.bbj` file (e.g., `examples/hello.bbj`)<br>3. Right-click in editor<br>4. Select "Run BBj" > "Run Program"<br>5. Check run tool window | Program executes and output appears in run window | [ ] |
| 2 | Run with Debug | 1. Open any `.bbj` file<br>2. Right-click in editor<br>3. Select "Run BBj" > "Run with Debug"<br>4. Check run tool window | Program executes with debug output/logging enabled | [ ] |
| 3 | Run as BUI/DWC | 1. Open `.bbj` file with GUI components (if applicable)<br>2. Right-click in editor<br>3. Select "Run BBj" > "Run as BUI" or "Run as DWC"<br>4. Check for browser/window launch | Program launches in BUI or DWC mode | [ ] |

---

## Enterprise Manager Integration

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | EM Connection Settings | 1. Open VS Code settings (or IntelliJ preferences)<br>2. Search for "BBj" or "Enterprise Manager"<br>3. Verify EM connection settings are accessible | Settings for EM host, port, username, password are present and editable | [ ] |
| 2 | EM Authentication | 1. Configure EM connection settings<br>2. Trigger any EM-dependent operation (e.g., run command)<br>3. Check for connection success/failure feedback | Extension attempts EM connection; shows success or clear error message if credentials invalid | [ ] |
| 3 | EM-dependent Features | 1. With valid EM credentials configured<br>2. Execute run commands or other EM-dependent features<br>3. Verify operations complete successfully | Features that require EM work correctly when EM is available | [ ] |

---

## Test Run Result

- [ ] **PASS** - All items marked with `[x]`
- [ ] **FAIL** - Any item marked with `[FAIL]`

**If FAIL:** Document failures with evidence (see TESTING-GUIDE.md)

---

## Test Information

**Date:** _______________

**Tester:** _______________

**Environment:**
- OS: _______________
- VS Code Version: _______________
- IntelliJ Version: _______________
- Extension Version: _______________
