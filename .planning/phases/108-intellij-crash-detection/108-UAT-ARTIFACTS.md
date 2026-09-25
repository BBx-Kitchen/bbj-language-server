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
| P1 | every server start | `unexpected-stop handler registered` | LanguageServerWrapper.start line 424 → our override |  |
| P2 | after kill -9 | `process ended without a stop request (pid <pid>, exit code 137, thread <name>)` | LSPProcessListener.processTerminated with isStopped false. On macOS a SIGKILL exit reads 128+9. |  |
| P3 | after P2 | `connection stop requested (pid <pid>, process alive: false)` | LSP4IJ's own handler → stop(ctx) → shutdownAll → provider.stop() |  |
| P4 | after the kill | `status: started -> stopping (classified as NOT_A_STOP)` then `status: stopping -> stopped (classified as NOT_A_STOP)` | BbjServerService.updateStatus, real from-state classification |  |
| P5 | after the kill | no `Scheduled a BBj language server restart` line and no `Restarting the BBj language server` line | the restart comes from LSP4IJ on editor activity, as `stopped -> starting` with no Scheduled line |  |
| P6 | after each of three closes of the last BBj file | `status: started -> stopping`, then `connection stop requested (pid <pid>, process alive: true)`, then `status: stopping -> stopped`, and no `process ended without a stop request` | idle/deliberate stop path always reaches provider.stop() first |  |
| P7 | after each of three Settings Apply runs | `Scheduled a BBj language server restart in 500 ms`, `Restarting the BBj language server; status before the stop: started`, `connection stop requested (…, process alive: true)`, and the status lines. No `process ended without a stop request` | BbjServerService.doRestart → manager.stop/start, deliberate stop path |  |
| P8 | on every status line | the from-state equals the to-state of the previous status line | BbjServerService.updateStatus now logs currentStatus, the real previous status |  |

A closing line: D-01 is contradicted if P2 is missing after the kill, or if a
`process ended without a stop request` line appears in a P6 or P7 window.

### Probe excerpt (observed)

Paste one `--- step N (HH:MM:SS) ---` marker before each step's lines below.

```text
```

### Probe verdict

Pending: recorded by the next plan before any behaviour change
