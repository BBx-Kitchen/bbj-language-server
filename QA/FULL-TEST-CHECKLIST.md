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
| 10 | Custom-named config file survives reopen and revert | 1. Configure `bbj.configPath` to a file with a non-default name at a non-default location (e.g. `myproject-config.bbx`)<br>2. Open that file<br>3. Confirm it shows config-file syntax highlighting and the SETOPTS CodeLens<br>4. Close the tab, then reopen the file<br>5. Confirm the treatment survives<br>6. Edit the file, then run File > Revert File<br>7. Confirm the treatment still survives | The configured file shows config-file highlighting and the SETOPTS lens on first open, after close/reopen, and after Revert File | [ ] |
| 11 | Inactive-config hint in the SETOPTS composer | 1. With a custom config file configured (as above), open the home default `config.bbx` instead<br>2. Run the SETOPTS composer command on that file | A non-blocking message names the active config file's full path before the composer opens on the file that is actually open | [ ] |
| 12 | Config PREFIX change reloads the server automatically | 1. Note the resolved config file's path from the BBj output channel or the Show Config command<br>2. Open that file in an editor outside VS Code<br>3. Change the PREFIX line to add a directory, save<br>4. Return to VS Code without touching anything<br>5. Watch the status bar and the BBj output channel<br>6. Open a `.bbj` file that uses a class from the newly added prefix directory | Within a few seconds a status-bar item shows a reloading state, then a brief "config reloaded" confirmation that disappears on its own; the output channel carries one line naming the config file and the reason; no prompt, modal or notification toast appears at any point; the class from the new prefix directory now resolves | [ ] |
| 13 | Atomic-save editor produces exactly one reload | 1. Note the resolved config file's path<br>2. Edit its PREFIX line using an editor that saves by writing a temporary file and renaming it over the target (e.g. Vim with `backupcopy=no`, or any editor's "safe write"/atomic-save setting), save<br>3. Return to VS Code without further edits<br>4. Watch the status bar for the next several seconds | Exactly one reload happens — the status-bar reload signal appears once, not twice, and the server does not restart a second time a few seconds later | [ ] |
| 14 | SETOPTS composer apply does not restart the server | 1. Open the resolved config file<br>2. Run the SETOPTS composer, change one option, apply<br>3. Save the file<br>4. Watch the status bar and the BBj output channel for a reload signal<br>5. Separately, edit only a SETOPTS line in an editor outside VS Code and save; watch again | The file's SETOPTS line is updated and no reload occurs in either case — no status-bar reload signal, no restart, no reconnection message. A reload here is the restart-loop regression this row exists to catch | [ ] |

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
| 10 | Custom-named config file highlighting | 1. In BBj settings, point the config path setting at a file with a custom name (not `config.bbx`)<br>2. Open that file<br>3. Check the file icon, syntax highlighting and the Problems view | The file gets the config file icon and bbx highlighting like `config.bbx` would, and no BBj diagnostics appear on it | [ ] |
| 11 | config.bbx no longer treated as BBj source | 1. Leave the config path setting unchanged (default)<br>2. Open `config.bbx` from the BBj home `cfg` directory<br>3. Check the file icon and whether it is sent to the language server as BBj source | The file opens as a config file (config icon, bbx highlighting), not as BBj source | [ ] |
| 12 | Live config-path change flips file type on both files | 1. Open both the old and the new config file with the setting pointed at the old one<br>2. Change the config path setting to the new file<br>3. Without restarting the IDE, check both open files' icons and highlighting | Both files' file types flip immediately: the old file reverts to its extension-based type and the new file becomes the config file type | [ ] |
| 13 | Config PREFIX change reloads the server automatically | 1. Note the resolved config file's path from the BBj status bar widget or Settings<br>2. Open that file in an editor outside IntelliJ<br>3. Change the PREFIX line to add a directory, save<br>4. Return to IntelliJ without touching anything<br>5. Watch the BBj status-bar widget and the BBj Language Server tool window<br>6. Open a `.bbj` file that uses a class from the newly added prefix directory | The widget passes through its starting/started transitions and its tooltip names the config-file-changed reason during the restart; the tool window console carries one line naming the config file and the reason; no balloon appears; the class from the new prefix directory resolves afterwards | [ ] |
| 14 | Config file outside the project's content root reloads identically | 1. Point the config-path setting at a file that is not inside any open project's content root<br>2. Restart IntelliJ so the setting takes effect<br>3. Change that file's PREFIX line from an editor outside IntelliJ and save<br>4. Watch the BBj status-bar widget and the BBj Language Server tool window | The reload fires exactly as it does for a file inside the content root — the out-of-tree location makes no difference | [ ] |
| 15 | Save burst: a `.bbj` file and the config file together yields one clean restart | 1. Open a `.bbj` file, make an edit that produces a diagnostic, save it<br>2. Within a second, save a PREFIX change to the config file too<br>3. Watch both the Problems view diagnostics and the BBj status-bar widget | Exactly one restart, landing after the `.bbj` file's diagnostics have finished updating — no "connection to the server got closed" message, no diagnostics that vanish mid-update, and no second restart | [ ] |
| 16 | Refresh Java Classes keeps language features online | 1. Open a project whose BBj Home has a large Java classpath and open a `.bbj` file that uses Java classes<br>2. Wait for the BBj status-bar widget to read started<br>3. Run Refresh Java Classes from the Tools menu<br>4. While the "Refreshing Java classes…" progress task is still visible, invoke code completion, hover a variable and open the Structure view<br>5. Watch the status-bar widget throughout<br>6. After the progress task disappears, check the BBj Language Server tool window | Completion answers, hover answers and the Structure view populates while the refresh is running; the status widget never leaves started and no message about the connection to the server being closed appears; exactly one console line reports the refresh finished and no balloon is raised | [ ] |
| 17 | Java-interop port auto-detects, and an explicitly confirmed 5008 is kept | 1. In BBj settings, open the Java Interop section and confirm Auto-detect is checked, the Port field is greyed out, and it shows the port from the `com.basis.languageServer.addr` line of the BBj Home's `cfg/BBj.properties`, with a hint line under the field naming where the value came from<br>2. Edit that properties line to a different port, close and reopen the settings dialog, and confirm the greyed field now shows the new port<br>3. Uncheck Auto-detect, confirm the field is editable and pre-filled with the value that was showing, type 5008, and apply<br>4. Reopen the dialog and confirm Auto-detect is still unchecked and the field still reads 5008 even though the properties file names a different port<br>5. Re-check Auto-detect and confirm the field returns to the detected value | The greyed field and the hint track the properties file while Auto-detect is on; an explicitly applied 5008 survives a reopen unchanged with the checkbox still off; re-checking restores the detected value; no dialog, warning or balloon appears at any point | [ ] |

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

## Language Server Process Lifecycle

Regression coverage for #232, where the language server ran at 100% CPU and kept
running after the editor exited. Each leaked process holds a CPU core indefinitely,
so this is worth checking on every release.

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Server exits with the editor (VS Code) | 1. Open a `.bbj` file, wait for completion to work<br>2. Quit VS Code entirely (Cmd+Q / File > Exit — not just closing the window)<br>3. macOS/Linux: `ps aux \| grep 'bbj-lang'`<br>4. Windows (PowerShell): `Get-CimInstance Win32_Process \| Where-Object CommandLine -like '*bbj-lang*'` | No `out/language/main.cjs` process remains within ~10s | [ ] |
| 2 | Server exits with the editor (IntelliJ) | Same as above, quitting IntelliJ instead | No `main.cjs` process remains within ~10s | [ ] |
| 3 | No orphans after repeated sessions | 1. Open and quit the editor three times with a `.bbj` file open<br>2. Re-run the `ps` / `Get-CimInstance` check | Zero `main.cjs` processes. One per closed session means the shutdown path is broken | [ ] |
| 4 | Idle CPU settles | 1. Open a `.bbj` file, leave the editor idle ~1 minute<br>2. Watch `main.cjs` CPU in Activity Monitor / `top` | Near-idle after initial indexing. Sustained ~100% of one core indicates a spinning validation or rebuild loop | [ ] |
| 5 | CPU settles in a multi-project workspace | 1. Open a workspace containing several BBj projects (the original #232 trigger)<br>2. Wait for indexing, then leave idle ~2 minutes | CPU returns to near-idle; the editor stays responsive to completion requests | [ ] |
| 6 | Editor survives an unresponsive Java interop | 1. Stop `java-interop` (port 5008)<br>2. Open a `.bbj` file using Java classes and request completion | Completion degrades with an error or empty result within ~10s; no hang and no runaway CPU | [ ] |

**On failure:** capture `ps aux | grep bbj-lang` output including elapsed CPU time,
note whether the `--clientProcessId` value is a live PID, and attach both to the issue.
A surviving process whose client PID is dead points at a blocked event loop rather
than a missing shutdown handler.

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
