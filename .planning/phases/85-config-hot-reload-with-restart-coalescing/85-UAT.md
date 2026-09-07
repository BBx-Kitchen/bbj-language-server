---
status: complete
phase: 85-config-hot-reload-with-restart-coalescing
source: [85-01-SUMMARY.md, 85-02-SUMMARY.md, 85-03-SUMMARY.md, 85-04-SUMMARY.md, 85-05-SUMMARY.md]
started: 2026-09-07T07:20:00Z
updated: 2026-09-07T12:10:43Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Install the fresh VSIX and IntelliJ plugin zip. Quit both IDEs fully so no old language-server process survives, then start each IDE on a BBj workspace from scratch. In VS Code the BBj output channel shows the server start and the resolved config path line with no errors or stack traces; in IntelliJ the BBj status-bar widget reaches "started" and the BBj Language Server tool window console shows no errors. Opening a `.bbj` file gives completion/hover as before.
result: pass
note: VS Code output (bbj.debug on) reviewed; pre-existing log-hygiene and interop-efficiency observations captured as GitHub issues #659 (nested classes resolved twice), #660 (primitives/arrays round-trip), #661 (config.bbx wording), #662 (logger format); none are phase-85 gaps

### 2. VS Code QA row 12 — external-editor PREFIX change reloads the server automatically
expected: Note the resolved config file's path (BBj output channel or Show Config command). In an editor outside VS Code, add a directory to the PREFIX line and save. Return to VS Code without touching anything. Within a few seconds a status-bar item shows a reloading (spinning) state, then a brief "config reloaded" confirmation that disappears on its own; the output channel carries exactly one line naming the config file and the reason `prefix-changed`; no prompt, modal or notification toast appears at any point. A `.bbj` file using a class from the newly added prefix directory now resolves.
result: pass

### 3. VS Code QA row 13 — atomic-save editor produces exactly one reload
expected: Edit the PREFIX line with an editor that saves via write-temp-then-rename (Vim with `backupcopy=no`, or any "safe write"/atomic-save setting), save, return to VS Code, watch the status bar for several seconds. Exactly one reload happens — the status-bar reload signal appears once, not twice, and the server does not restart a second time a few seconds later.
result: pass

### 4. VS Code QA row 14 — SETOPTS composer apply and SETOPTS-only external edit do not restart the server
expected: Open the resolved config file, run the SETOPTS composer, change one option, apply, save; watch the status bar and output channel. Then edit only a SETOPTS line in an editor outside VS Code and save; watch again. In both cases the SETOPTS line is updated and no reload occurs — no status-bar reload signal, no restart, no reconnection message, no output-channel reload line.
result: pass

### 5. IntelliJ QA row 13 — external-editor PREFIX change reloads the server automatically
expected: Note the resolved config file's path (BBj status-bar widget or Settings). In an editor outside IntelliJ, add a directory to the PREFIX line and save. Return to IntelliJ without touching anything. The widget passes through its starting/started transitions and its tooltip names the config-file-changed reason during the restart; the BBj Language Server tool window console carries exactly one line naming the config file and the reason; no balloon appears. A `.bbj` file using a class from the new prefix directory resolves afterwards.
result: pass

### 6. IntelliJ QA row 14 — config file outside the project's content root reloads identically
expected: Point the config-path setting at a file that is not inside any open project's content root, restart IntelliJ so the setting takes effect, then change that file's PREFIX line from an external editor and save. The reload fires exactly as it does for a file inside the content root (widget transitions, tooltip reason, one console line, no balloon) — the out-of-tree location makes no difference.
result: pass

### 7. IntelliJ QA row 15 — `.bbj` save plus config save burst yields one clean restart
expected: Open a `.bbj` file, make an edit that produces a diagnostic, save it; within a second also save a PREFIX change to the config file. Watch the Problems view and the BBj status-bar widget. Exactly one restart, landing after the `.bbj` file's diagnostics have finished updating — no "connection to the server got closed" message, no diagnostics vanishing mid-update, no second restart.
result: pass

### 8. A PREFIX edit produces exactly one bbj/configReloadRequired notification (prefix-changed); a SETOPTS-only edit produces zero
expected: A PREFIX edit produces exactly one bbj/configReloadRequired notification with reason prefix-changed; a SETOPTS-only edit produces zero
result: pass
source: automated
coverage_id: 85-01 D1

### 9. Detection is server-side, directory-scoped, basename-filtered, and survives an atomic write-temp-then-rename save
expected: Detection is server-side, directory-scoped, basename-filtered through samePath, and survives an atomic write-temp-then-rename save (delete+create collapses into one evaluation, transient absence never observed)
result: pass
source: automated
coverage_id: 85-01 D2

### 10. The relevance gate and initializeWorkspace read PREFIX through one shared function
expected: The relevance gate and initializeWorkspace read through one shared function; PREFIX resolution behavior for real-world config content is unchanged
result: pass
source: automated
coverage_id: 85-01 D3

### 11. Missing file, re-armed settings path and unreachable watched directory handled without a thrown error
expected: Missing file, re-armed settings path and an unreachable watched directory are all handled without a thrown error
result: pass
source: automated
coverage_id: 85-01 D4

### 12. A reload notification is never emitted while a build is in flight or a BBjCPL debounce is pending; wait bounded at 5000ms
expected: A reload notification is never emitted while a Langium build is in flight or a BBjCPL debounce timer is pending; the wait is bounded at 5000ms and pushes anyway once the bound elapses
result: pass
source: automated
coverage_id: 85-02 D1

### 13. Quiescence is a testable predicate on the document builder, not a sleep
expected: Quiescence is a testable predicate on the document builder (hasPendingWork/hasPendingCompile), not a sleep inside the watcher
result: pass
source: automated
coverage_id: 85-02 D2

### 14. Watcher armed exactly once after the first Validated build and re-armed at exactly two settings sites in main.ts
expected: The watcher is armed exactly once, after the first Validated build phase, and re-armed at exactly the two configuration-change sites in main.ts — fenced by a source guard so a third call site cannot silently appear
result: pass
source: automated
coverage_id: 85-02 D3

### 15. A .bbj save burst overlapping a config save never lands a restart mid-validation and collapses to one notification
expected: A .bbj save burst overlapping a config save (interleaved raw file events plus a settings change, all while the builder is busy) never lands a restart mid-validation and collapses to exactly one notification
result: pass
source: automated
coverage_id: 85-02 D4

### 16. A settings change to an identical-content config produces no restart request but re-arms the watch
expected: A settings change to an identical-content config produces no restart request, while still re-arming the watch on the new directory
result: pass
source: automated
coverage_id: 85-02 D5

### 17. VS Code: one reload payload travels handler -> gate -> exactly one coalesced stop/start pair; two within 500ms still one pair
expected: A single bbj/configReloadRequired payload travels handler -> gate -> exactly one coalesced stop/start pair on the existing client instance; two requests inside one 500ms window still produce exactly one pair
result: pass
source: automated
coverage_id: 85-03 D1

### 18. VS Code restart gate: needsStop()=false skips stop(); cancel() before window produces nothing; rejected stop/start reported once
expected: A target whose needsStop() is false calls start() without calling stop(); cancel() before the window elapses produces no stop and no start; a rejected stop()/start() is caught and reported as the failed phase exactly once, never as an unhandled rejection
result: pass
source: automated
coverage_id: 85-03 D2

### 19. VS Code: reload signalled only by a dedicated status-bar item plus one output-channel line; failure hides the item and reuses the start-failure error
expected: The reload is signalled only by a dedicated status-bar item (spinning while restarting, a brief auto-hiding confirmation once restarted) plus one output-channel log line naming the path and machine-readable reason — no prompt, modal, or toast on any phase; a failed restart hides the item and reuses the existing start-failure error message
result: pass
source: automated
coverage_id: 85-03 D3

### 20. VS Code deactivate() cancels the gate's pending restart before client.stop()
expected: deactivate() cancels the gate's pending restart before calling the existing client.stop(), so a scheduled restart never fires against a client that is being shut down
result: pass
source: automated
coverage_id: 85-03 D4

### 21. VS Code source guard: the gate is the only place extension.ts stops or starts the client
expected: A source-guard regression fence proves the gate is the only place extension.ts stops or starts the client: exactly one client.start()/client.stop( occurrence, the gate-cancel precedes client.stop( in deactivate(), exactly one createRestartGate( call, and the reload handler's body reaches the restart only through the gate's request( call
result: pass
source: automated
coverage_id: 85-03 D5

### 22. IntelliJ: bbj/configReloadRequired deserializes through LSP4IJ's MessageJsonHandler with field names pinned by a cross-language contract test
expected: A bbj/configReloadRequired notification deserializes through LSP4IJ's own MessageJsonHandler into ConfigModels.ConfigReloadNotification with field names pinned to the TypeScript payload by a cross-language contract test
result: pass
source: automated
coverage_id: 85-04 D1

### 23. IntelliJ handler funnels into BbjServerService.requestRestart(RESTART_DEBOUNCE_MS) and never touches the LSP4IJ server manager directly
expected: The handler funnels into the existing coalescing restart entry point (BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)) and never touches the LSP4IJ server-manager type directly; a source guard fences both
result: pass
source: automated
coverage_id: 85-04 D2

### 24. IntelliJ reload reason reaches the status widget tooltip and one console line, no new balloon, and clears rather than sticking
expected: The reload reason reaches the existing status widget's tooltip and one console line, with no new balloon, and clears on success and on abandoned auto-restart rather than sticking
result: pass
source: automated
coverage_id: 85-04 D3

### 25. ComposerRequestContractTest untouched and still green
expected: ComposerRequestContractTest is untouched and still green -- the new notification was not added to its reflectively-derived DECLARED_REQUESTS set
result: pass
source: automated
coverage_id: 85-04 D4

### 26. COVERAGE.md gives the seal-time API-coverage gate a reasoned declaration
expected: The seal-time API-coverage gate has a reasoned declaration to read instead of blocking on a missing or fabricated capability matrix
result: pass
source: automated
coverage_id: 85-05 D1

## Summary

total: 26
passed: 26
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
