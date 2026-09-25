# Phase 108 — UAT Artifacts

**Redaction rule:** before pasting any line from a real `idea.log` into this file, replace the
macOS home directory with `<home>` and the project directory with `<project>`. Never paste BBj
source text.

## Probe build

### Build identity

- Commit: `fc6d711bbcae26880bacaf3b18966cca833b029b`
- `/tmp/phase-108-probe/bbj-lang.vsix` — sha256
  `9dfec55c8b968c7d68fa38432dc904256476bd4e9136fc3acd0fa0bbb46c6099`, 2726452 bytes
- `/tmp/phase-108-probe/bbj-intellij-0.1.0.zip` — sha256
  `828d6815071d8a0c4ee563ac210f45f37d60987cfa588d51a894b8df20280913`, 1201068 bytes

### Runbook (macOS)

1. In IntelliJ on macOS: Settings, Plugins, gear icon, Install Plugin from Disk, choose
   `bbj-intellij-0.1.0.zip`, restart the IDE. Help, Show Log in Finder gives the `idea.log` path
   (for example `~/Library/Logs/JetBrains/IntelliJIdea2026.2/idea.log`).
2. Open a BBj project and one `.bbj` file. Wait for the status bar to show `BBj: Ready`. Note the
   time and write `--- step 2 (HH:MM:SS) ---` in the excerpt block.
3. Kill the server: `kill -9 $(pgrep -f 'bbj-intellij/lib/language-server/main.cjs')`. If more than
   one pid matches, use the newest. Wait 10 s without touching IntelliJ and note which
   notifications appear (LSP4IJ shows its own "stopped unexpectedly" error). Then click into the
   editor and move the cursor until the widget shows `BBj: Ready` again.
4. Close every BBj editor tab and wait 15 s. Reopen a `.bbj` file and wait for `BBj: Ready`. Do
   this three times, noting the time for each.
5. Settings, Languages & Frameworks, BBj: change one setting (for example Log level) and press
   Apply. Wait for `BBj: Ready`. Change it back and Apply, then Apply one more change. That is
   three Applies in total, with a time noted for each.
6. Run `grep "BBj language server" <path to idea.log>`. Paste the lines from this IDE session into
   this file under `### Probe excerpt (observed)`, with the step markers. Replace your home
   directory with `<home>` and the project directory with `<project>`.

### Expected signals (derived)

| # | After | Expected line (substring) | Derived from | Observed? |
|---|-------|---------------------------|--------------|-----------|
| P1 | every server start | `unexpected-stop handler registered` | LanguageServerWrapper.start line 424 → our override | Yes — logged on every launch (14:31:13, both 14:32:31 launches, 14:33:03, 14:33:36, both 14:34:14 launches, and every Apply restart). |
| P2 | after kill -9 | `process ended without a stop request (pid <pid>, exit code 137, thread <name>)` | LSPProcessListener.processTerminated with isStopped false. On macOS a SIGKILL exit reads 128+9. | Yes — after all 4 kills (14:31:41, 14:32:45, 14:33:14, 14:33:45), `exit code 137, thread node`. |
| P3 | after P2 | `connection stop requested (pid <pid>, process alive: false)` | LSP4IJ's own handler → stop(ctx) → shutdownAll → provider.stop() | Contradicted on order: in all 4 kills, `connection stop requested (…, process alive: false)` is logged before the hook line, in the same millisecond — stop() reaches an already-dead process, so "did stop() precede the exit" cannot tell a crash apart. What does: the hook line appears only after kills, and `process alive: false` at stop() appears only after kills. |
| P4 | after the kill | `status: started -> stopping (classified as NOT_A_STOP)` then `status: stopping -> stopped (classified as NOT_A_STOP)` | BbjServerService.updateStatus, real from-state classification | Yes, in all 4 kills. |
| P5 | after the kill | no `Scheduled a BBj language server restart` line and no `Restarting the BBj language server` line | the restart comes from LSP4IJ on editor activity, as `stopped -> starting` with no Scheduled line | Yes, no Scheduled/Restarting line after any kill — but the recovery shows `stopped -> stopping -> starting`, not `stopped -> starting`. At 14:32:31 and 14:34:14 LSP4IJ launched twice, stopping the first process while it was alive (pids 88831 and 89481, alive: true), with no hook line. |
| P6 | after each of three closes of the last BBj file | `status: started -> stopping`, then `connection stop requested (pid <pid>, process alive: true)`, then `status: stopping -> stopped`, and no `process ended without a stop request` | idle/deliberate stop path always reaches provider.stop() first | Yes, with a new finding: closing the last file gives `started -> stopping`; a reopen inside the grace period gives `stopping -> started` on the same process (3 times). The last (unreopened) close was followed exactly 30.0 s later by `stop requested (pid 89931, alive: true)` then `stopping -> stopped`, with no hook line — `stopping` is not final and can return to `started`. |
| P7 | after each of three Settings Apply runs | `Scheduled a BBj language server restart in 500 ms`, `Restarting the BBj language server; status before the stop: started`, `connection stop requested (…, process alive: true)`, and the status lines. No `process ended without a stop request` | BbjServerService.doRestart → manager.stop/start, deliberate stop path | Yes — all 3 Applies (14:34:49, 14:35:06, 14:35:27), `process alive: true`, no hook line. |
| P8 | on every status line | the from-state equals the to-state of the previous status line | BbjServerService.updateStatus now logs currentStatus, the real previous status | Yes — the from-state chain is unbroken across every status line in both excerpts. |

A closing line: D-01 is contradicted if P2 is missing after the kill, or if a
`process ended without a stop request` line appears in a P6 or P7 window.

### Probe excerpt (observed)

Paste one `--- step N (HH:MM:SS) ---` marker before each step's lines below.

```text
--- step 2 (14:31:13) --- server start, BBj file open
2026-09-25 14:31:13,089 [  48745]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:31:13,089 [  48745]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:31:13,090 [  48746]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:31:13,512 [  49168]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> starting (classified as NOT_A_STOP)
2026-09-25 14:31:13,529 [  49185]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 3, kill 1 (about 14:31:41, no terminal timestamp) ---
2026-09-25 14:31:41,534 [  77190]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:31:41,535 [  77191]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 88356, process alive: false)
2026-09-25 14:31:41,535 [  77191]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server process ended without a stop request (pid 88356, exit code 137, thread node)
2026-09-25 14:31:41,541 [  77197]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
--- step 3, recovery after kill 1 (14:32:31, on editor activity; two launches, the first stopped while alive) ---
2026-09-25 14:32:31,327 [ 126983]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:32:31,327 [ 126983]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:32:31,327 [ 126983]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:32:31,328 [ 126984]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:32:31,328 [ 126984]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:32:31,633 [ 127289]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> stopping (classified as NOT_A_STOP)
2026-09-25 14:32:31,633 [ 127289]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:32:31,633 [ 127289]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:32:31,633 [ 127289]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:32:31,633 [ 127289]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:32:31,664 [ 127320]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 88831, process alive: true)
2026-09-25 14:32:31,665 [ 127321]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 3, kill 2 (about 14:32:45, no terminal timestamp) ---
2026-09-25 14:32:45,727 [ 141383]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 88832, process alive: false)
2026-09-25 14:32:45,727 [ 141383]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:32:45,727 [ 141383]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
2026-09-25 14:32:45,727 [ 141383]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server process ended without a stop request (pid 88832, exit code 137, thread node)
--- step 3, recovery after kill 2 (14:33:03) ---
2026-09-25 14:33:03,309 [ 158965]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:33:03,309 [ 158965]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:33:03,309 [ 158965]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:33:03,310 [ 158966]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:33:03,310 [ 158966]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:33:03,637 [ 159293]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 3, kill 3 (14:33:14) ---
2026-09-25 14:33:14,723 [ 170379]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89019, process alive: false)
2026-09-25 14:33:14,723 [ 170379]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:33:14,723 [ 170379]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
2026-09-25 14:33:14,723 [ 170379]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server process ended without a stop request (pid 89019, exit code 137, thread node)
--- step 3, recovery after kill 3 (14:33:36) ---
2026-09-25 14:33:36,426 [ 192082]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:33:36,426 [ 192082]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:33:36,426 [ 192082]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:33:36,426 [ 192082]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:33:36,427 [ 192083]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:33:36,757 [ 192413]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 3, kill 4 (14:33:45) ---
2026-09-25 14:33:45,977 [ 201633]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89246, process alive: false)
2026-09-25 14:33:45,977 [ 201633]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:33:45,977 [ 201633]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
2026-09-25 14:33:45,977 [ 201633]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server process ended without a stop request (pid 89246, exit code 137, thread node)
--- step 3, recovery after kill 4 (14:34:14; two launches, the first stopped while alive) ---
2026-09-25 14:34:14,524 [ 230180]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:34:14,524 [ 230180]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:34:14,524 [ 230180]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:34:14,533 [ 230189]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:34:14,533 [ 230189]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:34:14,826 [ 230482]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> stopping (classified as NOT_A_STOP)
2026-09-25 14:34:14,826 [ 230482]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:34:14,826 [ 230482]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:34:14,827 [ 230483]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:34:14,827 [ 230483]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:34:14,856 [ 230512]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89481, process alive: true)
2026-09-25 14:34:14,857 [ 230513]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 4 (close the last BBj file): not run in the first pass; run afterwards, see the second excerpt below ---
--- step 5, Apply 1 (14:34:49; terminal stamp 14:34:59) ---
2026-09-25 14:34:49,530 [ 265186]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Scheduled a BBj language server restart in 500 ms
2026-09-25 14:34:50,035 [ 265691]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Restarting the BBj language server; status before the stop: started
2026-09-25 14:34:50,035 [ 265691]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:34:50,036 [ 265692]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89482, process alive: true)
2026-09-25 14:34:50,036 [ 265692]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
2026-09-25 14:34:50,041 [ 265697]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Starting the BBj language server; status before the start: stopped
2026-09-25 14:34:50,041 [ 265697]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:34:50,041 [ 265697]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:34:50,041 [ 265697]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:34:50,041 [ 265697]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:34:50,041 [ 265697]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:34:50,382 [ 266038]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 5, Apply 2 (14:35:06; terminal stamp 14:35:10) ---
2026-09-25 14:35:06,440 [ 282096]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Scheduled a BBj language server restart in 500 ms
2026-09-25 14:35:06,945 [ 282601]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Restarting the BBj language server; status before the stop: started
2026-09-25 14:35:06,945 [ 282601]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:35:06,946 [ 282602]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89700, process alive: true)
2026-09-25 14:35:06,948 [ 282604]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
2026-09-25 14:35:07,001 [ 282657]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Starting the BBj language server; status before the start: stopped
2026-09-25 14:35:07,001 [ 282657]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:35:07,001 [ 282657]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:35:07,001 [ 282657]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:35:07,001 [ 282657]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:35:07,001 [ 282657]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:35:07,331 [ 282987]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
--- step 5, Apply 3 (14:35:27; terminal stamp 14:35:31) ---
2026-09-25 14:35:27,728 [ 303384]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Scheduled a BBj language server restart in 500 ms
2026-09-25 14:35:28,233 [ 303889]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Restarting the BBj language server; status before the stop: started
2026-09-25 14:35:28,233 [ 303889]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:35:28,234 [ 303890]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89806, process alive: true)
2026-09-25 14:35:28,236 [ 303892]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
2026-09-25 14:35:28,288 [ 303944]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - Starting the BBj language server; status before the start: stopped
2026-09-25 14:35:28,288 [ 303944]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopped -> stopping (classified as NOT_A_STOP)
2026-09-25 14:35:28,288 [ 303944]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> starting (classified as NOT_A_STOP)
2026-09-25 14:35:28,288 [ 303944]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Resolving a Node.js executable for the BBj language server. Configured: "/opt/homebrew/opt/node@22/bin/node"; detected on PATH: "/opt/homebrew/opt/node@22/bin/node"; downloaded: <none>; download directory accessible: true
2026-09-25 14:35:28,289 [ 303945]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - Launching the BBj language server: /opt/homebrew/opt/node@22/bin/node "<home>Library/Application Support/JetBrains/IntelliJIdea2026.2/plugins/bbj-intellij/lib/language-server/main.cjs" --stdio (working directory: <home><project>)
2026-09-25 14:35:28,289 [ 303945]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server unexpected-stop handler registered beside LSP4IJ's own
2026-09-25 14:35:28,622 [ 304278]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: starting -> started (classified as NOT_A_STOP)
```

Second excerpt: step 4, run after step 5 in the same IDE session (terminal stamps 14:44:21, 14:44:35
and 14:44:46 were taken just before closes 2 to 4; close 1 has no stamp). Each reopen came a few
seconds after the close, and the last close was left alone.

```text
--- step 4, close 1 (14:43:53, no terminal timestamp), reopened ---
2026-09-25 14:43:53,092 [ 808748]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:43:57,380 [ 813036]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> started (classified as NOT_A_STOP)
--- step 4, close 2 (14:44:22), reopened ---
2026-09-25 14:44:22,231 [ 837887]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:44:26,539 [ 842195]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> started (classified as NOT_A_STOP)
--- step 4, close 3 (14:44:33), reopened ---
2026-09-25 14:44:33,952 [ 849608]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:44:40,707 [ 856363]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> started (classified as NOT_A_STOP)
--- step 4, close 4 (14:44:45), not reopened ---
2026-09-25 14:44:45,708 [ 861364]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: started -> stopping (classified as NOT_A_STOP)
2026-09-25 14:45:15,710 [ 891366]   INFO - #com.basis.bbj.intellij.lsp.BbjLanguageServer - BBj language server connection stop requested (pid 89931, process alive: true)
2026-09-25 14:45:15,710 [ 891366]   INFO - #com.basis.bbj.intellij.ui.BbjServerService - BBj language server status: stopping -> stopped (classified as NOT_A_STOP)
```

Observed on screen (maintainer, 2026-09-25, IntelliJ IDEA 2026.2 on macOS): the only notification was
LSP4IJ's own error, "BBJ Language Server: Cannot start server / The server was stopped unexpectedly."
(actions: Show Logs, Disable error reporting, More). The server came back after editor activity.
Two earlier kills ran without a terminal timestamp; their times come from the log.

### Probe verdict

D-01 holds. The unexpected-stop hook line ("process ended without a stop request") appears
after every one of the four `kill -9` runs and never once inside any of the seven deliberate-stop
windows (three file closes that were reopened, the one that was not, and the three Settings
Applies) — the closing falsification condition (a missing P2 after a kill, or a hook line inside a
P6/P7 window) did not occur anywhere in the excerpt. Every kill line reads `exit code 137, thread
node`, matching the SIGKILL/128+9 exit-value assumption this plan's `describeExit` format is built
on. Every status line's from-state equals the previous line's to-state with no gap (P8), across
both excerpts and every recovery in between.

Three surprises, none of which contradict D-01, all binding on this plan's design (carried
forward from 108-01-SUMMARY.md's Key Findings, restated here as the verdict this plan's
precondition and Task 1 depend on): the stop-requested line and the hook line race in the same
millisecond on every kill, with stop-requested always logged first, so log order between those two
lines cannot separate a crash from a deliberate stop — only whether the hook line appears at all,
or equivalently the `process alive: false` reported at the stop-requested line, does. LSP4IJ's own
recovery after a kill twice launched a server a second time on its own, stopping the first live
instance (`process alive: true`) with no hook line for that internal stop — this plan's crash
counting must not read that internal stop as a second crash. And closing the last BBj file returns
`stopping` directly to `started` on a reopen inside roughly a 30 second grace window, with no stop
request and no hook line, so `stopping` is not a guaranteed precursor to `stopped` on that path.
None of this weakens the hook as the crash signal; the hook's presence-or-absence, not the status
sequence, is what this plan builds on.

## Final UAT

### Build identity

- Commit: `d6bc0404f2143e05d3c91c0a0af887589407c220`
- `/tmp/phase-108-uat/bbj-lang.vsix` — sha256
  `854038f7628dc702ceebb2db1adf167763229e192c8c9cc008dcff8ed10f2862`, 2726452 bytes
- `/tmp/phase-108-uat/bbj-intellij-0.1.0.zip` — sha256
  `ade45f94f38952bbe5692d8c12d4b65f3ea760c38eb5c881641f7a314497ed87`, 1201980 bytes
- Zip's bundled `bbj-intellij/lib/language-server/main.cjs` is byte-identical to
  `bbj-vscode/out/language/main.cjs` (`cmp` exit 0, from a fresh `npm run build` on this commit)
- `/tmp/phase-108-uat/plugin.jar` (extracted from the zip) — `javap -p` on
  `com.basis.bbj.intellij.ui.BbjServerService` finds `reportUnexpectedExit` (3 matches: the
  method plus its two parameter-type references in the signature)
- Whole IntelliJ suite: `cd bbj-intellij && ./gradlew test --rerun-tasks --console=plain` —
  `BUILD SUCCESSFUL`, 1126 tests aggregated from `build/test-results/test/*.xml`, 0 failures
- Register check: `grep -nE '\b108-[0-9]{2}\b|\bD-[0-9]{2}\b|\bLIFE-0[0-9]\b|\bT-108-[0-9]+\b|\b(CR|WR|IN)-[0-9]{2}\b|Pitfall [0-9]'`
  over all 16 source/test/doc files this phase changed (`ExpectedStopGuard.java`,
  `BbjLanguageClient.java`, `BbjLanguageServerFactory.java`, `BbjLanguageServer.java`,
  `BbjServerCrashNotificationProvider.java`, `BbjServerService.java`, `BbjStatusBarWidget.java`,
  `ExpectedStopGuardTest.java`, `BbjLanguageServerSourceGuardTest.java`,
  `BbjServerServiceRestartSourceGuardTest.java`, `BbjStatusFeedSourceGuardTest.java`,
  `Lsp4ijCouplingCanaryTest.java`, `Lsp4ijImportAllowlistTest.java`,
  `BbjServerCrashNotificationProviderSourceGuardTest.java`, `BbjStatusBarWidgetSourceGuardTest.java`,
  `documentation/docs/intellij/features.md`) — prints nothing

### Run order

Note the time (HH:MM:SS) before each scenario begins.

1. **Scenario 7** — config reload or the Refresh Java Classes fallback
2. **Scenario 5** — Settings Apply
3. **Scenario 3** — close the last BBj file
4. **Scenario 4** — close the project with a BBj file open, then **reopen the project
   afterwards** and wait for `BBj: Ready` before continuing
5. **Scenario 6** — the manual Restart Server action
6. **Scenario 1** — kill once, run within 30 s of scenario 6 reaching `started` (this also
   proves the plugin's own restart token is disarmed after a deliberate restart — D-08)
7. **Scenario 2** — a second kill within 30 s of scenario 1's crash

### Scenario 1: Kill once

Steps: with the server `BBj: Ready` (within 30 s of scenario 6 reaching `started`), run
`kill -9 $(pgrep -f 'bbj-intellij/lib/language-server/main.cjs')` once. Watch the status bar,
wait for it to auto-restart to `BBj: Ready`, and note whether any notification or banner appears.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S1.1 | `BBj language server process exited unexpectedly (pid <pid>, exit code <code>); auto-restarting (1 of 1)` | `BbjServerService.applyCrashPolicy` (`crashCount == 1` branch) | |
| S1.2 | `BBj language server connection stop requested (pid <pid>, process alive: false)` | `BbjLanguageServer.stop()`, reached via LSP4IJ's own handler → `LanguageServerWrapper.stop(ctx)` → `shutdownAll` → `provider.stop()` | |
| S1.3 | `BBj language server status: started -> stopping` | `BbjServerService.updateStatus` | |
| S1.4 | `BBj language server status: stopping -> stopped` | `BbjServerService.updateStatus` | |
| S1.5 | `Scheduled a BBj language server restart in 1000 ms` | `BbjServerService.requestGatedRestart`, called from `applyCrashPolicy` with `CRASH_RESTART_DELAY_MS = 1000` | |
| S1.6 | `Restarting the BBj language server; status before the stop: stopped` | `BbjServerService.doRestart` | |
| S1.7 | `Starting the BBj language server; status before the start: stopped` | `BbjServerService.doRestart` (`finally` block, after disarming the guard) | |
| S1.8 | `Launching the BBj language server: …` | `BbjLanguageServer` constructor | |
| S1.9 | a status line ending `-> started` | `BbjServerService.updateStatus` | |
| S1.10 | widget shows `BBj: Crashed`, tooltip `BBj language server stopped unexpectedly and is being restarted.` | `BbjStatusBarWidget.textFor`/`tooltipFor` (`isServerCrashed()` true, `isAutoRestartAbandoned()` false) | |
| S1.11 | widget returns to `BBj: Ready` once restarted | `BbjStatusBarWidget.textFor`; `BbjServerService.updateStatus` clears `serverCrashed` on `started` | |
| S1.12 | must-not: no editor banner appears | `BbjServerCrashNotificationProvider.buildPanel`, gated on `isAutoRestartAbandoned()` (false for a first crash) | |
| S1.13 | must-not: no `BBj Language Server crashed unexpectedly` balloon | `BbjServerService.notifyCrash`, only called from the `crashCount > 1` branch | |
| S1.14 | LSP4IJ's own `The server was stopped unexpectedly.` notification may appear and is expected (D-12) | `LanguageServerWrapper.showNotificationStartServerError` (vendor 0.21.0, lines 430-433) | |
| S1.15 | must-not: `auto-restart stopped until a manual restart` | `BbjServerService.applyCrashPolicy`, only in the `crashCount > 1` branch | |
| S1.16 | must-not: `exited during a plugin restart` | `BbjServerService.reportUnexpectedExit`, `EXPECTED_RESTART_STOP` branch (guard was not armed for this kill) | |
| S1.17 | this kill runs within 30 s of scenario 6 reaching `started`; the crash WARN here (S1.1) proves `ExpectedStopGuard`'s token was disarmed after scenario 6's own restart, not left armed (D-08) | `BbjServerService.doRestart` (`finally`: `expectedStop.disarm()` before starting) | |
| S1.18 | cross-scenario: every status line's from-state equals the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |

### Scenario 2: Second kill within 30 s

Steps: immediately after scenario 1 reaches `BBj: Ready` (within 30 s of scenario 1's crash),
run the same `kill -9` again. Wait 15 s without clicking into an editor and note the banner,
then press **Restart Server** in the banner.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S2.1 | `BBj language server process exited unexpectedly (pid <pid>, exit code <code>); crash 2 within 30 s, not auto-restarting` | `BbjServerService.applyCrashPolicy` (`crashCount > 1` branch, first WARN) | |
| S2.2 | `BBj language server crashed 2 times within 30 s; auto-restart stopped until a manual restart` | `BbjServerService.applyCrashPolicy` (`crashCount > 1` branch, give-up WARN) | |
| S2.3 | must-not: no `Scheduled a BBj language server restart` line after the give-up WARN, until the tester acts | `BbjServerService.applyCrashPolicy` (`requestGatedRestart` not called on this branch) | |
| S2.4 | balloon `BBj Language Server crashed unexpectedly` with actions `Show Log` and `Restart` | `BbjServerService.notifyCrash` | |
| S2.5 | editor banner `BBj Language Server crashed again within 30 seconds and was not restarted. Language features are unavailable.` with actions `Restart Server` and `Show Log` | `BbjServerCrashNotificationProvider.buildPanel` | |
| S2.6 | widget `BBj: Crashed`, give-up tooltip `BBj language server crashed again within 30 seconds and was not restarted. Use Restart Server.` | `BbjStatusBarWidget.tooltipFor` (`isAutoRestartAbandoned()` true branch) | |
| S2.7 | LSP4IJ's own `The server was stopped unexpectedly.` notification may appear and is expected (D-12) | `LanguageServerWrapper.showNotificationStartServerError` | |
| S2.8 | after waiting 15 s with no editor click, the banner is still shown (auto-restart never resumes on its own) | `BbjServerCrashNotificationProvider.buildPanel` (state only changes on a restart) | |
| S2.9 | pressing **Restart Server** in the banner logs `Scheduled a BBj language server restart in 0 ms` | `BbjServerCrashNotificationProvider` → `BbjServerService.requestRestart(0)` → `requestGatedRestart` | |
| S2.10 | the Crashed state clears: widget returns to `BBj: Ready`, banner disappears | `BbjServerService.updateStatus` (`started` clears `serverCrashed`/`autoRestartAbandoned`); `requestRestart` also calls `clearCrashState()` | |
| S2.11 | alternative (Phase 97 observation): clicking into an editor before pressing Restart Server may let LSP4IJ start the server on its own, `stopped -> starting` with no `Scheduled` line first; the banner then clears on `started` | LSP4IJ's own lazy retry on the next `start()`; `BbjServerService.updateStatus` | |
| S2.12 | cross-scenario: every status line's from-state equals the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |

### Scenario 3: Close the last BBj file

Steps: with the server `BBj: Ready` and one `.bbj` file open, close it (the last BBj editor
tab) and wait.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S3.1 | `BBj language server status: started -> stopping` | `BbjServerService.updateStatus` | |
| S3.2 | `BBj language server connection stop requested (pid <pid>, process alive: true)` | `BbjLanguageServer.stop()` | |
| S3.3 | `BBj language server status: stopping -> stopped` | `BbjServerService.updateStatus` | |
| S3.4 | must-not: `exited unexpectedly` | `BbjServerService.applyCrashPolicy` — never reached, since `stop()` runs before the process ends, so the hook's `isStopped()` gate is true | |
| S3.5 | must-not: `Scheduled a BBj language server restart` | `BbjServerService.requestGatedRestart` — not invoked on this path | |
| S3.6 | derived alternative, not required here: if the file is reopened within roughly 30 s, `status: stopping -> started` may appear instead of ever reaching `stopped` (108-01 probe finding P6) | `BbjServerService.updateStatus`; LSP4IJ's own idle-grace recovery | |
| S3.7 | cross-scenario: every status line's from-state equals the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |

### Scenario 4: Close the project with a BBj file open

Steps: with a `.bbj` file still open and the server `BBj: Ready`, close the project (not just
the file). Then reopen the project (per Run order) and wait for `BBj: Ready` before scenario 6.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S4.1 | a `BBj language server connection stop requested (pid <pid>, process alive: true)` line may appear before the project finishes disposing | `BbjLanguageServer.stop()`, reached through LSP4IJ's own project-close cleanup, which calls `stop()` before the process ends | |
| S4.2 | must-not: `exited unexpectedly` | `BbjServerService.applyCrashPolicy` — not reached, since project-close cleanup calls `stop()` first, and further status/crash publishing is also suppressed once `project.isDisposed()` | |
| S4.3 | cross-scenario: every status line logged before disposal has a from-state equal to the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |
| S4.4 | procedural: reopen the project afterward and wait for `BBj: Ready` before continuing to scenario 6 | Run order | |

### Scenario 5: Settings Apply after changing a setting

Steps: Settings, Languages & Frameworks, BBj: change one setting (for example Log level) and
press Apply. Wait for `BBj: Ready`.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S5.1 | `Scheduled a BBj language server restart in 500 ms` | `BbjServerService.scheduleRestart` → `requestRestart(RESTART_DEBOUNCE_MS)` → `requestGatedRestart` | |
| S5.2 | `Restarting the BBj language server; status before the stop: started` | `BbjServerService.doRestart` | |
| S5.3 | `BBj language server connection stop requested (pid <pid>, process alive: true)` | `BbjLanguageServer.stop()` | |
| S5.4 | `BBj language server status: started -> stopping` | `BbjServerService.updateStatus` | |
| S5.5 | `BBj language server status: stopping -> stopped` | `BbjServerService.updateStatus` | |
| S5.6 | `Starting the BBj language server; status before the start: stopped` | `BbjServerService.doRestart` | |
| S5.7 | `BBj language server status: stopped -> stopping` | `BbjServerService.updateStatus` | |
| S5.8 | `BBj language server status: stopping -> starting` | `BbjServerService.updateStatus` | |
| S5.9 | `Launching the BBj language server: …` | `BbjLanguageServer` constructor | |
| S5.10 | `BBj language server status: starting -> started` | `BbjServerService.updateStatus` | |
| S5.11 | must-not: `exited unexpectedly` | `BbjServerService.applyCrashPolicy` — not reached | |
| S5.12 | allowed alternative: `exited during a plugin restart (…); treated as an expected stop, not a crash` — the race `ExpectedStopGuard.arm()` covers (D-08) | `BbjServerService.reportUnexpectedExit`, `EXPECTED_RESTART_STOP` branch | |
| S5.13 | cross-scenario: every status line's from-state equals the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |

### Scenario 6: Manual Restart Server action

Steps: click the BBj status-bar widget and choose Restart Server (or use the BBj Restart
Server action). Wait for `BBj: Ready`.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S6.1 | `Scheduled a BBj language server restart in 0 ms` | `BbjStatusBarWidget`'s popup item / `BbjRestartServerAction` → `BbjServerService.requestRestart(0)` → `requestGatedRestart` | |
| S6.2 | `Restarting the BBj language server; status before the stop: started` | `BbjServerService.doRestart` | |
| S6.3 | `BBj language server connection stop requested (pid <pid>, process alive: true)` | `BbjLanguageServer.stop()` | |
| S6.4 | `BBj language server status: started -> stopping` | `BbjServerService.updateStatus` | |
| S6.5 | `BBj language server status: stopping -> stopped` | `BbjServerService.updateStatus` | |
| S6.6 | `Starting the BBj language server; status before the start: stopped` | `BbjServerService.doRestart` | |
| S6.7 | `BBj language server status: stopped -> stopping` | `BbjServerService.updateStatus` | |
| S6.8 | `BBj language server status: stopping -> starting` | `BbjServerService.updateStatus` | |
| S6.9 | `Launching the BBj language server: …` | `BbjLanguageServer` constructor | |
| S6.10 | `BBj language server status: starting -> started` | `BbjServerService.updateStatus` | |
| S6.11 | must-not: `exited unexpectedly` | `BbjServerService.applyCrashPolicy` — not reached | |
| S6.12 | allowed alternative: `exited during a plugin restart (…); treated as an expected stop, not a crash` | `BbjServerService.reportUnexpectedExit`, `EXPECTED_RESTART_STOP` branch | |
| S6.13 | cross-scenario: every status line's from-state equals the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |
| S6.14 | note: scenario 1's kill (Run order) follows within 30 s of this scenario's `-> started` line, so its crash WARN proves the restart token armed by this scenario's own `doRestart` was disarmed rather than left set (D-08) | `BbjServerService.doRestart` (`finally`: `expectedStop.disarm()`) | |

### Scenario 7: Config reload, or the Refresh Java Classes fallback

Steps: either edit and save the configured config file (config reload path), or trigger the
Refresh Java Classes fallback's `Restart language server` balloon with BBjServices stopped.
Wait for `BBj: Ready`.

| Row | Expected line or UI (substring) | Derived from | Observed? |
|-----|----------------------------------|---------------|-----------|
| S7.1 | `Scheduled a BBj language server restart in 500 ms` (config reload path) — or `Scheduled a BBj language server restart in 0 ms` (Refresh Java Classes fallback path) | `BbjLanguageClient.configReloadRequired` → `requestRestart(RESTART_DEBOUNCE_MS)`; or `BbjRefreshJavaClassesAction` → `requestRestart(0)` | |
| S7.2 | `Restarting the BBj language server; status before the stop: started` | `BbjServerService.doRestart` | |
| S7.3 | `BBj language server connection stop requested (pid <pid>, process alive: true)` | `BbjLanguageServer.stop()` | |
| S7.4 | `BBj language server status: started -> stopping` | `BbjServerService.updateStatus` | |
| S7.5 | `BBj language server status: stopping -> stopped` | `BbjServerService.updateStatus` | |
| S7.6 | `Starting the BBj language server; status before the start: stopped` | `BbjServerService.doRestart` | |
| S7.7 | `BBj language server status: stopped -> stopping` | `BbjServerService.updateStatus` | |
| S7.8 | `BBj language server status: stopping -> starting` | `BbjServerService.updateStatus` | |
| S7.9 | `Launching the BBj language server: …` | `BbjLanguageServer` constructor | |
| S7.10 | `BBj language server status: starting -> started` | `BbjServerService.updateStatus` | |
| S7.11 | must-not: `exited unexpectedly` | `BbjServerService.applyCrashPolicy` — not reached | |
| S7.12 | allowed alternative: `exited during a plugin restart (…); treated as an expected stop, not a crash` | `BbjServerService.reportUnexpectedExit`, `EXPECTED_RESTART_STOP` branch | |
| S7.13 | cross-scenario: every status line's from-state equals the previous status line's to-state (criterion 3) | `BbjServerService.updateStatus` | |

### Scenario excerpts (observed)

**Redaction rule:** before pasting any line from a real `idea.log`, replace the macOS home
directory with `<home>` and the project directory with `<project>`. Never paste BBj source
text.

**Marker format:** one `--- scenario N (HH:MM:SS) ---` line before each scenario's pasted
lines, in run order (7, 5, 3, 4, 6, 1, 2).

```text
```

### Verdict

Pending.
