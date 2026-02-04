# Smoke Test Checklist

## Purpose
Quick sanity check to verify critical path functionality of the BBj Language Server.

**Estimated Time:** 5-10 minutes

**When to Use:**
- After any build
- Before detailed testing
- After dependency updates
- Quick verification after changes

**Release Gate:** If ANY item fails, run FULL-TEST-CHECKLIST.md and document failures.

**Instructions:**
1. Copy this file to `QA/test-runs/YYYY-MM-DD-smoke-test.md`
2. Execute all tests in order
3. Mark `[ ]` with `[x]` for PASS or `[FAIL]` for failures
4. Rename file with `-PASS` or `-FAIL` suffix

---

## Smoke Test

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Extension Loads (VS Code) | 1. Open VS Code<br>2. Open any `.bbj` file from `examples/` directory | No error notifications; file opens cleanly; status bar shows language mode | [ ] |
| 2 | Syntax Highlighting | 1. Keep file open from test 1<br>2. Verify keywords are colored | Keywords like `class`, `method`, `if`, `print` are colored differently from strings/comments | [ ] |
| 3 | Code Completion (BBj) | 1. Create new file `test.bbj`<br>2. Type: `PR`<br>3. Press `Ctrl+Space` (or `Cmd+Space` on macOS) | Completion popup shows `PRINT` and other keywords | [ ] |
| 4 | Code Completion (Java) | 1. In same file, type: `use java.util.Hash`<br>2. Press `Ctrl+Space` / `Cmd+Space` | Completion shows `HashMap`, `HashSet` | [ ] |
| 5 | Diagnostics | 1. Type: `MODE "INVALID"`<br>2. Save file | Red squiggle appears with error message | [ ] |
| 6 | IntelliJ Basic | 1. Open IntelliJ IDEA<br>2. Open any `.bbj` file from `examples/` directory<br>3. Verify syntax highlighting | File opens; keywords are colored; no error notifications | [ ] |
| 7 | Run Program (VS Code) | 1. Open simple `.bbj` file (e.g., `examples/hello.bbj`)<br>2. Right-click editor<br>3. Run BBj > Run Program | Program executes; output appears in terminal | [ ] |
| 8 | Run Program (IntelliJ) | 1. Open simple `.bbj` file in IntelliJ<br>2. Right-click editor<br>3. Run BBj > Run Program | Program executes; output appears in run window | [ ] |

---

## Test Run Result

- [ ] **PASS** - All items marked with `[x]`
- [ ] **FAIL** - Any item marked with `[FAIL]`

**If FAIL:**
1. Document failure with evidence (see TESTING-GUIDE.md)
2. Run FULL-TEST-CHECKLIST.md for comprehensive verification
3. Create GitHub issues for failures

---

## Test Information

**Date:** _______________

**Tester:** _______________

**Environment:**
- OS: _______________
- VS Code Version: _______________
- IntelliJ Version: _______________
- Extension Version: _______________
