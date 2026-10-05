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
| 7 | Run Program (VS Code) | 1. Open `examples/msgbox.bbj`<br>2. Right-click in the editor and choose "Run As BBj Program" directly from the context menu (Alt+G or the editor title run button do the same) | The program starts in a BBj window; failures appear as an error notification | [ ] |
| 8 | Run Program (IntelliJ) | 1. Open `examples/msgbox.bbj` in IntelliJ<br>2. Right-click in the editor and choose "Run As BBj Program" directly from the context menu; separately, right-click the file in the Project View and choose "BBj Run" > "Run As BBj Program" | The program starts in a BBj window; IntelliJ logs "[GUI] Launched msgbox.bbj" in the "BBj Language Server" tool window; failures appear in that tool window | [ ] |
| 9 | Language Server Exits (#232) | 1. With a `.bbj` file open, quit VS Code completely (not just close the window)<br>2. macOS/Linux: `ps aux \| grep 'bbj-lang'`<br>3. Windows (PowerShell): `Get-CimInstance Win32_Process \| Where-Object CommandLine -like '*bbj-lang*'` | No `out/language/main.cjs` process remains within ~10s of quitting. A surviving process means the server is not shutting down — see #232 | [ ] |
| 10 | No Runaway CPU (#232) | 1. Open a `.bbj` file and leave the editor idle for ~1 minute<br>2. Check CPU of the extension host / `main.cjs` process in Activity Monitor or `top` | CPU settles to near-idle after initial indexing. Sustained ~100% on one core indicates a spinning validation or rebuild loop | [ ] |
| 11 | Format Document (VS Code) | 1. With BBjServices (BBj 26.03 or later) running, open `examples/bbj-classes.bbj` in VS Code<br>2. Run Format Document from the Command Palette or the editor context menu<br>3. Press Undo once | The file is re-indented (two spaces per block level) with no message; one Undo restores the original text | [ ] |
| 12 | Denumber (VS Code) | 1. Create and save `denum-smoke.bbj` with three lines: `0010 PRINT "Hello"`, `0020 PRINT "World"`, `0030 END`<br>2. Run Denumber BBj Program (`Alt+N`) | The text becomes `PRINT "Hello"`, `PRINT "World"`, `END`; `Denumbered.` appears and the tab shows unsaved changes; the file on disk keeps its numbers until you save. The prompt `"denum-smoke.bbj" is a line-numbered BBj program. Denumber it for editing, or open it read-only?` may also appear; ignore it (or set `bbj.denumber.promptOnOpen` to false first) | [ ] |
| 13 | Reformat Code (IntelliJ) | 1. With BBjServices (BBj 26.03 or later) running, open `examples/bbj-classes.bbj` in IntelliJ IDEA<br>2. Run Code > Reformat Code<br>3. Press Undo once | The file is re-indented (two spaces per block level) with no balloon; one Undo restores the original text | [ ] |
| 14 | Denumber (IntelliJ) | 1. Create `denum-smoke.bbj` with three lines: `0010 PRINT "Hello"`, `0020 PRINT "World"`, `0030 END`<br>2. Run Tools > Denumber BBj Program<br>3. Press Undo once | The editor text becomes `PRINT "Hello"`, `PRINT "World"`, `END` and a `Denumbered.` balloon appears (Denumber edits the editor text and does not write the file itself); Undo brings the numbers back | [ ] |

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
