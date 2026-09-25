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
