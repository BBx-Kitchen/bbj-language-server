---
status: resolved
trigger: "IntelliJ on Windows: during language-server restarts the LSP trace shows 'Timeout error while shutdown the language server' and 'Stream Closed' exceptions, the plugin logs 2-3 'Launching the BBj language server' lines within ~300 ms, and the maintainer momentarily saw two node.exe in Task Manager"
created: 2026-09-20T11:00:00Z
updated: 2026-09-20T13:10:00Z
---

## Current Focus

bug_class: Mandelbug — non-deterministic from the user's side (it needs a language-server
  instance that dies while Search Everywhere is driving workspace/symbol traffic), but every
  step after that first death is deterministic and is fully reconstructible from the message
  ids in the trace.

reasoning_checkpoint:
  hypothesis: |
    The two "restarts" at 10:29:30 and 10:29:49 were never restarts. In both cases the running
    BBj language-server PROCESS terminated on its own; LSP4IJ detected that
    (LSPProcessListener.processTerminated -> provider not stopped by LSP4IJ -> unexpected-stop
    handlers -> serverError = ServerWasStoppedException + stop(ctx)), and then lazily relaunched
    the server from ordinary feature calls. Because `serverError` stays set until a start fully
    initialises, EVERY subsequent LanguageServerWrapper.start() first tears down the previous
    in-flight start attempt and then launches another process. Search Everywhere issues one
    workspace/symbol request per keystroke through the file-less
    LanguageServiceAccessor.getLanguageServers(...) path, so each keystroke produced one
    "Launching the BBj language server" line: 3 in 270 ms, then 2 in 300 ms. None of this
    passes through BbjServerService, which is why no restart line was logged and why
    RestartGate could not coalesce anything.
  confirming_evidence:
    - "Message-id level proof of the tear-down loop (incident 2): trace shows shutdown(11) on the
       old connection, then initialize(1) for a new process, then shutdown(2) sent to THAT new
       process ~300 ms later, then initialize(1) for a third process; afterwards two unmatched
       responses arrive, '<unknown> - (2)' at 10:29:49 and '<unknown> - (1)' at 10:29:50 — the
       shutdown and the initialize answers of an instance whose client had already been disposed."
    - "Proof the process died unexpectedly rather than being stopped by LSP4IJ: the 'exit' write at
       10:29:35 throws IOException('Stream Closed') from Process$PipeOutputStream.write, while that
       teardown's own provider.stop() has not run yet (shutdownAll order is shutdown -> exit ->
       cancel -> provider.stop()) and no second teardown of that context exists (exactly one 'exit'
       in the trace for it). LSPProcessListener.processTerminated is what closes that stream, and it
       only runs the unexpected-stop handlers when provider.isStopped() is false."
    - "Proof BbjServerService was not involved: its restart path logs 'Scheduled...', 'Restarting...'
       and 'Starting...' on every cycle (five such cycles at 10:27:55, 10:28:11, 10:28:47, 10:29:32,
       10:29:59). The 10:29:30 and 10:29:49 bursts have none of those lines."
    - "Proof it was not LanguageServerWrapper.restart() either: restart() always follows up with
       LanguageServiceAccessor.sendDidOpenAndRefreshEditorFeatureForOpenedFiles, and the 10:29:32
       BbjServerService restart duly shows 4 textDocument/didOpen. The instance started at 10:29:31
       received NO didOpen at all — its first request after 'initialized' was workspace/symbol - (2),
       i.e. it was started by the workspace-symbol feature waiting on getInitializedServer()."
    - "Proof the shutdown timeouts are a consequence, not a cause: every shutdown NOT preceded by a
       workspace/symbol on its connection was answered in 0 ms (10:27:56 id 13, 10:28:12 id 6,
       10:28:48 id 34, 10:29:33 id 3, 10:30:00 id 13). Both shutdowns that WERE preceded by an
       unanswered workspace/symbol timed out after exactly 5 s (10:29:35,482 and 10:29:54,153 =
       shutdown writes at 10:29:30,482 and 10:29:49,153, LanguageServerWrapper:1767 uses
       shutdown.get(5, SECONDS))."
    - "Vendor semantics read from the lsp4ij-0.21.0 sources at the pinned tag: start() lines 345-395
       (serverError branch -> stop(); languageServer != null && !isActive() -> stop()), the
       launch/initialise chain lines 397-563 (serverError cleared only at line 510, after a
       successful initialise), stop() lines 1656-1728, shutdownAll lines 1730-1761,
       LSPWorkspaceSymbolFeature.isEnabled() (true only while the server is starting/started),
       LanguageServiceAccessor.getLanguageServers(before, after) lines 315-352 and
       collectLanguageServersFromDefinition lines 488-516."
  falsification_test: |
    Any of these would refute it: (a) an '<unknown>' response for ids 7/8/9/10/11 (would mean the
    old server did answer and the client merely lost the correlation — there is none); (b) a
    'Restarting the BBj language server' line at 10:29:30 or 10:29:49 (would put BbjServerService
    back in the picture — there is none); (c) textDocument/didOpen right after the 10:29:31
    initialize (would prove restart() rather than a feature-driven start — there is none);
    (d) a second 'exit' for the old context at 10:29:35 (would mean two overlapping teardowns
    closed the pipe instead of the process dying — there is none).
  blind_spots: |
    WHY the language-server process died is NOT established. It cannot be reproduced on this Linux
    host: probing the built out/language/main.cjs with a cancelled workspace/symbol answers -32800
    in ~1 ms and the following shutdown in ~1-3 ms, both on a 1-file workspace and on the 81-file
    examples/ workspace. The correlate is strong but circumstantial (see "Open sub-question"), and
    the server's own stderr/LSP-console "Logs" tab was not captured on Windows. The Root Cause
    below is therefore split: the client-side chain is proven, the initiating death is named as an
    open sub-question with one batched evidence request.
  candidate_causes:
    - "code (server, UNPROVEN): the BBj language server dies or wedges while serving workspace/symbol
       on a real BBj installation — this is the only request that forces Langium's
       DocumentBuilder.waitUntil(WorkspaceState.IndexedContent), i.e. a full workspace index"
    - "code (vendor, PROVEN as amplifier): LanguageServerWrapper.start() tears down the previous
       in-flight start because a stale serverError is still set, so N feature calls spawn N processes"
    - "code (plugin, PROVEN as blind spot): the crash-detection path in BbjServerService is
       unreachable — LSP4IJ nulls languageClient before it publishes ServerStatus.stopped"
    - "code (plugin, PROVEN, independent): BbjComposerService.resolveServer() and doRestart()'s own
       manager.start(SERVER_ID) both run with StartOptions.DEFAULT, whose forceRestart is true"
    - "environment/data: the maintainer's project (C:\\tinybbj with BBj home C:\\bbx plus the
       java-interop backend) — the same plugin build never shows this on the small probe workspaces"
    - "config: ruled out — no plugin setting changes the workspace-symbol or restart behaviour here"
  and_gate: |
    YES, this failure needs two independent conditions at once, and neither alone reproduces the
    report: (1) the language-server process must die unexpectedly (server/environment leg), and
    (2) LSP4IJ's relaunch-on-feature-call must be driven repeatedly while serverError is still set
    (client leg, supplied by Search Everywhere's per-keystroke workspace/symbol). Condition (1)
    alone gives a single clean relaunch; condition (2) alone gives nothing at all. Both legs are
    addressed separately in the proposed fix.

hypothesis: "CONFIRMED for the client-side chain (message-id level); the initiating process death is
  named but not yet explained — see Open sub-question."
test: "Cross-reading tmp/idea.log 1736-1895 and tmp/intellij_traces.txt 5433-8900 against the
  lsp4ij-0.21.0 sources at the pinned tag, plus a local stdio probe of out/language/main.cjs."
expecting: "n/a — diagnose-only session, no fix applied."
next_action: "NONE on this host. Return the Root Cause Report to the orchestrator; the maintainer
  decides which of the proposed fixes to take, and whether to run the one batched Windows evidence
  request that would close the open sub-question."

## Symptoms

expected: "One restart = one shutdown answered promptly, one exit, exactly one new node process, no exception traces. At no time more than one live language-server process per project (beyond the brief overlap while the old one exits)."
actual: |
  Functionally everything works — after every restart the server comes up with completion, hints, code assistance (maintainer attestation of build 462a4d39…, commit 796a3f6f, Windows 10, IntelliJ IDEA 2026.2.2, LSP4IJ 0.21.0).
  But in the same session:
  - Two stop/start cycles (10:29:30 and 10:29:49) happened with NO BbjServerService line at all — no "Scheduled a BBj language server restart", no "dropped the additional request", no "Restarting the BBj language server". Whatever stopped the server did not go through BbjServerService.requestRestart.
  - At those two moments BbjLanguageServer (constructed by BbjLanguageServerFactory.createConnectionProvider) logged 3 and 2 "Launching the BBj language server" lines within ~300 ms. The LSP trace shows two 'initialize' requests, and a just-initialized instance immediately sent 'shutdown'/'exit'.
  - The old server's 'shutdown' request (ids 9 and 11) was never answered; LSP4IJ logged "Timeout error while shutdown the language server 'bbjLanguageServer'" 5 s later (10:29:35, 10:29:54) and then sent 'exit'.
  - Restarts that DID go through BbjServerService (10:27:55, 10:28:11, 10:28:47, 10:29:32, 10:29:59) show shutdown answered in 0 ms and exactly one launch each.
  - The maintainer momentarily saw two node.exe in Task Manager after Tools > Restart; no lasting orphan was reported. They could not identify the pattern and suspect they may have triggered the menu item while a previous restart was still executing.
errors: |
  java.lang.Exception: Timeout error while shutdown the language server 'bbjLanguageServer'
      at com.redhat.devtools.lsp4ij.LanguageServerWrapper.shutdownLanguageServerInstance(LanguageServerWrapper.java:1773)
      at com.redhat.devtools.lsp4ij.LanguageServerWrapper.shutdownAll(LanguageServerWrapper.java:1739)
      at com.redhat.devtools.lsp4ij.LanguageServerWrapper.lambda$stop$32(LanguageServerWrapper.java:1700)
  Caused by: java.util.concurrent.TimeoutException
  ---
  java.util.concurrent.CompletionException: org.eclipse.lsp4j.jsonrpc.JsonRpcException: java.io.IOException: Stream Closed
      at org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer.consume(StreamMessageConsumer.java:72)
      at com.redhat.devtools.lsp4ij.LanguageServerWrapper.lambda$start$7(LanguageServerWrapper.java:478)
  Caused by: java.io.IOException: Stream Closed
      at java.base/java.lang.Process$PipeOutputStream.write(Process.java:1027)
timeline: "First observable on 2026-09-20 with the instrumented build (796a3f6f); the 'Stream Closed' signature was already seen on 2026-09-07 and diagnosed in .planning/debug/refresh-stream-closed.md (status diagnosed, no fix recorded there — though RestartGate's in-flight guard and ExpectedStopGuard were added since; check what of that diagnosis is still true)."
reproduction: "Maintainer's account: first restarts in the sequence via the status-bar widget's restart item, the last two or three via Tools > Restart BBj Language Server. Both call BbjServerService.requestRestart(0) (BbjStatusBarWidget.java:83, BbjRestartServerAction.java:27). Orchestrator observation from the trace: immediately before each of the two unexplained shutdowns the client sent workspace/symbol requests with queries \"r\" then \"re\" (each cancelled) — i.e. the maintainer was typing in Search Everywhere / Find Action (presumably 'restart…'); the BbjServerService restart then follows 2-10 s later (10:29:32, 10:29:59). So the unexplained stop coincides with Search Everywhere being open, BEFORE the restart action was actually invoked."

## Eliminated

- hypothesis: "One of the plugin's own restart triggers fired without logging — the status-bar widget, Tools > Restart, the crash auto-restart, the config-reload notification or the refresh action's failure fallback."
  evidence: "Every one of those funnels through BbjServerService.requestRestart -> RestartGate -> doRestart, and 796a3f6f made all three steps log ('Scheduled a BBj language server restart in N ms', 'A BBj language server restart is already in flight; dropped the additional request', 'Restarting the BBj language server; status before the stop: X', 'Starting the BBj language server; status before the start: X'). idea.log has those quartets at 10:27:55, 10:28:11, 10:28:47, 10:29:32 and 10:29:59 and NOTHING at 10:29:30 or 10:29:49. Also checked every AnAction update() in the plugin (BbjRunActionBase:120, BbjOpenComposerAtAction:62, BbjCompileAction:157, BbjComposeActionBase:48, BbjRefreshJavaClassesAction:121, BbjRestartServerAction:31, BbjEMLoginAction:54): none touches the server lifecycle, so Search Everywhere's action-matching pass cannot restart anything."
  timestamp: 2026-09-20T12:05:00Z

- hypothesis: "BbjComposerService.resolveServer()'s LanguageServerManager.start(SERVER_ID) (forceRestart=true) force-restarted the running server during the Search Everywhere session."
  evidence: "It is a real, independently reachable bypass (see Evidence 2026-09-20T12:20:00Z) but it was not the trigger here: resolveServer only runs from ComposerHandleCache.server() misses, whose only callers are BbjCompileAction.actionPerformed:89, BbjRefreshJavaClassesAction:60 (inside its background task) and ComposerLauncher.launchAt:177 (from an action's actionPerformed or an intention's invoke — the intentions' isAvailable uses the text-only ComposerLauncher.isCaretOnCall/isCaretOnSetoptsInCode and never resolves the server). No composer, compile or refresh action ran: the trace contains no bbj/composer/* or bbj/refreshJavaClasses request anywhere in the session."
  timestamp: 2026-09-20T12:25:00Z

- hypothesis: "Several LanguageServerWrapper instances accumulated for the same server definition, so each manager.stop()/start() fanned out to N wrappers and N processes."
  evidence: "LanguageServiceAccessor.collectLanguageServersFromDefinition (lines 488-516) only creates a second wrapper when no started wrapper matches: for the file-less path the match test is just the definition plus the before-filter, and for the file path canOperate(file) (line 1202) returns true whenever the file exists. Wrappers are removed from startedServers only on definition removal or project close (lines 83-96, 629-637). One wrapper is therefore the steady state, and the 3+2 launches must be sequential start() calls on that one wrapper — which is exactly what the trace shows (each launch starts a connection whose ids restart at 1)."
  timestamp: 2026-09-20T12:35:00Z

- hypothesis: "LSP4IJ's last-document-disconnected timer stopped the server (maybeShutdown -> startStopTimer -> status 'stopping' then stop())."
  evidence: "plugin.xml declares lastDocumentDisconnectedTimeout=\"30\" (seconds) on the <server id=\"bbjLanguageServer\"> element, so that path would put a 30 s gap between the 'stopping' status and the stop. In both incidents the stop's shutdown write and the following launch are 4-45 ms apart. Four .bbj editors were also open throughout (didOpen x4 at 10:29:33), so keepAlive()'s openedDocuments check never even reached the timer."
  timestamp: 2026-09-20T12:40:00Z

- hypothesis: "A cancelled workspace/symbol request is by itself fatal to the BBj language server (kills or wedges it)."
  evidence: "FALSIFIED locally. Probed the shipped out/language/main.cjs over stdio (scratchpad probe.js): initialize -> initialized -> workspace/symbol query 'r' -> $/cancelRequest 30 ms later -> shutdown. Result on a 1-file workspace: symbol answered {\"code\":-32800} in 2 ms, shutdown answered in 3 ms, clean exit 0. Result on the 81-file examples/ workspace with the query fired 50 ms after 'initialized' (i.e. mid-build): symbol answered -32800 in 1 ms, shutdown answered in 1 ms, clean exit 0. Langium 4.3.1's addWorkspaceSymbolHandler (node_modules/langium/lib/lsp/language-server.js:383-412) wraps waitUntil+getSymbols in try/catch and always answers via responseError. So the cancellation alone is harmless; whatever killed the Windows instance needs that project/installation."
  timestamp: 2026-09-20T12:55:00Z

## Evidence

- timestamp: 2026-09-20T11:00:00Z
  checked: "/home/coder/repos/bbj-language-server/tmp/idea.log (lines 1736-1892) and /home/coder/repos/bbj-language-server/tmp/intellij_traces.txt (lines ~6030-8550). Untracked; contain a Windows user name — never commit."
  found: |
    idea.log: 10:29:30,527 / ,677 / ,796 three Resolving+Launching triples, with 'status: stopping -> stopping' at ,558; 'started' at 10:29:31,431; BbjServerService restart at 10:29:32,818; LSP4IJ shutdown timeout WARN at 10:29:35,482. Again 10:29:49,157 / ,459 two launches; timeout WARN 10:29:54,153; BbjServerService restart 10:29:59,946.
    trace: 10:29:30 codeAction(6), workspace/symbol(7) q="r", cancel, workspace/symbol(8) q="re", cancel, shutdown(9) [never answered], 10:29:31 initialize(1)… ; 10:29:33 shutdown(3) answered 0 ms, exit, initialize — that one is the BbjServerService restart. 10:29:46 workspace/symbol(10), cancel; 10:29:49 shutdown(11), initialize(1), shutdown(2), initialize(1), '<unknown> - (2)' response, exit.
  implication: "A stop/start path exists that bypasses BbjServerService and launches multiple connection providers concurrently. Candidates to check against lsp4ij-0.21.0 source: what LSP4IJ does to a server when a workspace/symbol (Search Everywhere contributor) request is cancelled or when the editor loses focus to the popup; whether LanguageServerManager.start(SERVER_ID) with StartOptions.DEFAULT (measured: forceRestart=true) is being called by plugin code on some path (BbjComposerService.resolveServer calls it — who triggers that during Search Everywhere / action update()?); whether several callers race LanguageServiceAccessor into creating several wrappers/providers."

- timestamp: 2026-09-20T11:00:00Z
  checked: "BbjServerService.updateStatus (bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:139-217)"
  found: "The new status log and ExpectedStopGuard.classify(...) both read `previousStatus` BEFORE line 206 (`previousStatus = currentStatus; currentStatus = status`), so the value they see is two transitions old, not one ('started -> started', 'stopping -> stopping' in the log). The log line is misleading; whether the classifier relies on this two-behind value on purpose (crash = 'stopped' whose predecessor-but-one was 'started') or by accident is unverified."
  implication: "At minimum the diagnostic line should print currentStatus as the 'from' state. Check ExpectedStopGuard and its tests before touching the classifier input."

- timestamp: 2026-09-20T12:10:00Z
  checked: "Whole-session trace census of initialize/shutdown/workspace-symbol traffic (grep over tmp/intellij_traces.txt), correlated with the idea.log timeline."
  found: |
    shutdowns ANSWERED in 0 ms: 10:27:56 id 13, 10:28:12 id 6, 10:28:48 id 34, 10:29:33 id 3, 10:30:00 id 13 — every one of them a BbjServerService restart on a connection that had NOT been asked for workspace symbols.
    shutdowns NEVER answered: 10:29:30 id 9 (preceded on the same connection by workspace/symbol id 7 "r" + cancel and id 8 "re" + cancel, neither answered) and 10:29:49 id 11 (preceded by workspace/symbol id 10 "restart" + cancel, not answered). Both produced the 5 s LanguageServerWrapper timeout WARN.
    The one workspace/symbol that WAS answered: 10:29:58 id 12, query "restart", answered in 0 ms with [] on the instance started at 10:29:49 — and the shutdown that followed it at 10:30:00 was answered in 0 ms too.
    No '<unknown> - (N)' unmatched response exists for ids 7, 8, 9, 10 or 11; the only two unmatched responses in the whole file are '<unknown> - (2)' at 10:29:49 and '<unknown> - (1)' at 10:29:50.
  implication: |
    The old instances went silent completely — they answered neither the (cancelled) symbol requests
    nor the subsequent shutdown, and nothing arrived late either. The 5 s 'Timeout error while
    shutdown' is therefore a CONSEQUENCE of a server that was already gone/unreachable, not a cause,
    and it is not a Windows or a plugin defect. The two unmatched responses belong to the
    short-lived second instance of incident 2 and are the fingerprint of the tear-down loop.

- timestamp: 2026-09-20T12:20:00Z
  checked: "lsp4ij-0.21.0 sources at the pinned tag (curl of raw.githubusercontent.com/redhat-developer/lsp4ij/0.21.0/...): LanguageServerManager 79-183, LanguageServerWrapper 296-565 / 620-686 / 890-924 / 1014-1035 / 1195-1213 / 1647-1761, LanguageServiceAccessor 184-352 / 444-522, LSPWorkspaceSymbolSupport, AbstractLSPWorkspaceFeatureSupport, LSPWorkspaceSymbolFeature, OSProcessStreamConnectionProvider, LSPProcessListener. Cross-checked against the jar actually on the classpath (build/idea-sandbox/IC-2024.2/plugins/lsp4ij/lib/lsp4ij-0.21.0.jar; javap confirms LSPClientFeatures.setWorkspaceSymbolFeature exists)."
  found: |
    1. LanguageServerManager.start(def, options) lines 118-133: for every already-started wrapper it
       calls ls.restart() when `options.isForceRestart() || status != started`. StartOptions.DEFAULT
       has forceRestart=true (measured in the resolved Node session), so the one-argument
       start(SERVER_ID) FORCE-RESTARTS a perfectly healthy server. Both
       BbjComposerService.resolveServer():48 and BbjServerService.doRestart():322 use that overload.
       (This corrects refresh-stream-closed.md's second Eliminated entry, which read
       LanguageServerWrapper.start() and concluded "already active -> documented no-op": true of the
       wrapper method, but LanguageServerManager.start never reaches it when a wrapper is registered.)
    2. LanguageServerWrapper.start() lines 345-395: `serverError != null` -> stop() and
       numberOfRestartAttempts++; `languageServer != null && !isActive()` -> stop(). Both branches
       then fall through to the launch at 397-451. serverError is cleared ONLY at line 510, after a
       successful initialise. So while a server is broken, every start() kills the previous,
       still-initialising attempt and spawns a new process.
    3. stop() lines 1656-1728: updateStatus(stopping), languageClient.dispose(), cancel
       initializeFuture (-> null), async shutdownAll, and in the finally `this.languageServer = null;
       this.languageClient = null`. The async body only publishes ServerStatus.stopped when
       `currentInitializingContext == null || equals(thisContext)`.
    4. LSPProcessListener.processTerminated lines 98-115: closes the output stream (this is what later
       makes Process$PipeOutputStream.write throw 'Stream Closed') and, when provider.isStopped() is
       false, runs the unexpected-stop handlers registered at LanguageServerWrapper:424 — which set
       serverError = ServerWasStoppedException and call stop(ctx).
    5. Search Everywhere path: LSPWorkspaceSymbolSupport -> AbstractLSPWorkspaceFeatureSupport
       .getLanguageServers(project, f -> f.getWorkspaceSymbolFeature().isEnabled() && …, f -> …
       isSupported()) -> LanguageServiceAccessor.getLanguageServers(before, after) ->
       collectLanguageServersFromDefinition(null, …) -> wrapper.getInitializedServer() -> start().
       LSPWorkspaceSymbolFeature.isEnabled() returns true exactly while the server status is
       starting or started, so a relaunch in progress keeps matching and keeps being re-entered.
       supportsGotoClass() defaults to false, so only the Goto-Symbol contributor participates:
       one workspace/symbol per keystroke, which matches the ~120-300 ms launch cadence.
  implication: "All three symptoms (silent restart, N launches, transient duplicate node.exe) are explained by vendor code reacting to a dead server, with no plugin code on the path. Separately, item 1 is a real defect we own."

- timestamp: 2026-09-20T12:45:00Z
  checked: "Whether the 'launch before stopping' ordering in idea.log is real, i.e. whether BbjServerService's view of status is synchronous — BbjLanguageClient.handleServerStatusChanged (bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:41-56)."
  found: |
    It is NOT synchronous: the whole body runs inside ApplicationManager.getApplication().invokeLater,
    so every 'BBj language server status: …' line is EDT-deferred. Measured deferral in this log:
    20-76 ms (e.g. incident 2's stop is pinned to 10:29:49,153 by the 5 s timeout at 10:29:54,153,
    while its 'stopping' line prints at ,175). The apparent 'launch precedes the stop' ordering is a
    logging artefact; in both incidents the stop is first.
    Worse: the same deferral feeds ExpectedStopGuard.classify and the widget. And LSP4IJ nulls
    this.languageClient in stop()'s finally BEFORE the async body publishes ServerStatus.stopped,
    so `stopped` can never be delivered through this callback at all. In the entire session there is
    not one '-> stopped' transition logged, for any of the seven stop/start cycles; every line reads
    'classified as NOT_A_STOP'.
  implication: "BbjServerService's crash-detection branch (status == stopped, previous started/starting -> CRASH -> auto-restart) is effectively dead code with LSP4IJ 0.21.0: the only status it keys on never arrives. That is why a genuine server death produced no crash notification, no auto-restart and no console line."

- timestamp: 2026-09-20T12:55:00Z
  checked: "Local falsification probe of the server leg (scratchpad probe.js / probe-big.js against /home/coder/repos/bbj-language-server/bbj-vscode/out/language/main.cjs, Node 24 on Linux)."
  found: "Cancelled workspace/symbol is answered with -32800 in 1-2 ms and the following shutdown in 1-3 ms, both on a 1-file workspace and on the 81-file examples/ workspace with the query fired mid-build; the process exits 0 on 'exit'. The Windows instances answered neither."
  implication: "The initiating death is specific to the maintainer's project/installation (real BBj home, real classpath, java-interop backend) and is not reproducible from this host. It is the one part of the chain that still needs Windows-side evidence."

## Resolution

CORRECTION (orchestrator, 2026-09-20, after the maintainer confirmed on Windows that EVERY keystroke in
Search Everywhere produces a fresh "BBj Language Server vunknown" banner, including the first one on a
healthy server): the initiating event is NOT a spontaneous process death. The server answered every
CANCELLED request with a malformed reply, `"result": {"code": -32800}` instead of `"error": {...}`.
Cause: three vscode-jsonrpc copies in bbj-vscode's tree — langium 4.3.1 creates the ResponseError from
vscode-languageserver-protocol 3.18.2 / vscode-jsonrpc 9.0.1, while vscode-languageserver 10.0.1 carried
a nested protocol 3.18.1 / jsonrpc 9.0.0 and tests `instanceof ResponseError` against THAT copy, so the
error object was serialised as a result (only its enumerable `code`). lsp4j cannot deserialise an object
as the workspace/symbol result list; the message listener ends (launcherFuture done -> isActive() false /
serverError set), and LanguageServerWrapper.start() — entered by the next getInitializedServer() from the
next keystroke — stops and relaunches. The "open sub-question" and the AND-gate below are superseded; the
client-side amplification analysis stands. VS Code's client tolerates the malformed reply, which is why
only IntelliJ showed it. The exact lsp4j failure line was not captured (it would be in idea.log/Logs tab).

root_cause: |
  TWO INDEPENDENT CAUSES, AND-gated (neither alone reproduces the report).

  CAUSE 1 — the initiating event (server/environment leg; mechanism proven, origin open).
  At 10:29:30,4x and 10:29:49,15 the running BBj language-server PROCESS terminated on its own.
  Proof it terminated unexpectedly rather than being stopped by LSP4IJ: the 'exit' notification
  written 5 s later throws IOException("Stream Closed") from Process$PipeOutputStream.write, and the
  only thing that closes that pipe is LSPProcessListener.processTerminated — which at that moment
  had not been preceded by provider.stop() (shutdownAll's order is shutdown -> exit -> cancel ->
  provider.stop(), and the trace holds exactly one 'exit' for that context). Because
  provider.isStopped() was false, that listener ran LSP4IJ's unexpected-stop handlers, which set
  serverError = ServerWasStoppedException and called stop(ctx) — the stop whose shutdown (ids 9 and
  11) could never be answered and therefore burned the full 5 s shutdown.get() timeout before
  LSP4IJ gave up, sent exit (Stream Closed) and destroyed the process.
  The strongest correlate for WHY the process died is Search Everywhere's workspace/symbol traffic:
  the two deaths are the only two moments in the session where a workspace/symbol was issued to a
  busy instance, both such requests went unanswered, and the only workspace/symbol that WAS answered
  (10:29:58, 0 ms, []) hit an instance that then shut down cleanly. workspace/symbol is also the only
  request in the whole protocol surface that forces Langium's
  DocumentBuilder.waitUntil(WorkspaceState.IndexedContent) — a full-workspace index that ordinary
  editing never triggers. This is a correlation, not a proven mechanism: a local probe of the shipped
  main.cjs answers a cancelled workspace/symbol in ~1 ms and shuts down cleanly on both a 1-file and
  an 81-file workspace, so the death needs the maintainer's project/installation. See "Open
  sub-question" for the one batched request that would settle it.

  CAUSE 2 — the amplifier (vendor leg; fully proven from the sources and the message ids).
  LanguageServerWrapper.serverError is cleared only after a start has fully initialised (line 510).
  Until then, EVERY call to getInitializedServer() re-enters start(), which first calls stop() —
  tearing down the previous, still-initialising attempt: its client is disposed, its initializeFuture
  cancelled, a shutdown is fired at its brand-new process — and then launches yet another process.
  Search Everywhere drives exactly this, once per keystroke, because LSPWorkspaceSymbolSupport goes
  through the file-less LanguageServiceAccessor.getLanguageServers(before, after) path and
  LSPWorkspaceSymbolFeature.isEnabled() keeps matching a wrapper whose status is starting or started.
  Hence 3 "Launching the BBj language server" lines in 270 ms and 2 in 300 ms, and hence the
  momentary two node.exe: each torn-down attempt keeps its process until its own async teardown
  reaches provider.stop(), which for an unanswered shutdown is ~5 s later. Message-id proof in
  incident 2: shutdown(11) on the old connection, initialize(1) on a new process, shutdown(2) sent to
  that same new process, initialize(1) on a third — with the discarded instance's answers arriving
  afterwards as the unmatched '<unknown> - (2)' and '<unknown> - (1)'.

  WHY IT LOOKS LIKE "A RESTART THAT BYPASSES BbjServerService": it is not a restart at all. No plugin
  code runs on this path — not requestRestart, not RestartGate, not doRestart — which is exactly why
  no plugin line is logged and why nothing coalesces the burst. Worse, the plugin cannot even observe
  it: LSP4IJ nulls languageClient in stop()'s finally before the async teardown publishes
  ServerStatus.stopped (and additionally suppresses that publication whenever a newer start has
  already installed a new InitializingContext), so BbjServerService never receives a `stopped`
  transition — the session's seven stop/start cycles produced zero. ExpectedStopGuard.classify only
  returns CRASH for status == "stopped", so the crash-detection and auto-restart branch of
  BbjServerService is unreachable in practice, and a genuine server death is reported to the user as
  nothing at all. On top of that, BbjLanguageClient.handleServerStatusChanged forwards through
  invokeLater, so even the transitions that do arrive are 20-76 ms stale and can arrive out of order —
  which is what makes the log read as if a launch preceded its own stop.

  INDEPENDENT DEFECT FOUND WHILE DIAGNOSING (not this trigger, but the same failure class and a real
  restart-that-bypasses-BbjServerService): both BbjComposerService.resolveServer():48 and
  BbjServerService.doRestart():322 call LanguageServerManager.start(SERVER_ID), i.e.
  StartOptions.DEFAULT, whose forceRestart is true. LanguageServerManager.start(def, options)
  therefore calls ls.restart() on an already-started wrapper — a full stop/start of a healthy server.
  For the composer service that means any composer dialog, the compile action or Refresh Java Classes
  can silently restart the server on a cache miss (and the cache is invalidated on every status
  change); for doRestart it means one requested restart can become two overlapping cycles whenever
  the BoundedWait times out or another thread restarts in between. This also corrects
  refresh-stream-closed.md's second Eliminated entry.

  ORPHANED NODE PROCESS — SEVERITY: LOW / TRANSIENT, no lasting leak.
  Every spawned process is owned by its InitializingContext, and all three teardown paths (the
  unexpected-stop handler, start()'s internal stop, and the start chain's exceptionally) end in
  shutdownAll, which catches exceptions from both shutdown and exit and always reaches
  provider.stop() -> ExecutionManagerImpl.stopProcess(processHandler), i.e. a real process kill.
  The exposure is therefore a bounded overlap, not a leak: an instance whose shutdown goes unanswered
  survives up to the 5 s shutdown timeout plus the exit attempt, so a keystroke burst during a
  relaunch storm can leave 2-3 node.exe alive simultaneously — which is precisely what the maintainer
  saw, and the log shows no accumulation (each incident ends at exactly one 'started' instance).
  Residual cost while it lasts: each extra instance re-parses the workspace and opens its own
  java-interop socket to :5008 (CPU/memory spike, and on Windows transient file locks). The only way
  to strand a process permanently would be an IDE kill inside that window.
fix: |
  Commit 8fe4da25: npm override pins vscode-languageserver's vscode-languageserver-protocol to
  3.18.2 (the copy langium uses), leaving one vscode-jsonrpc 9.0.1 for both; lockfile updated;
  test/lsp-protocol-single-copy.test.ts guards the single copy.
verification: |
  Linux, live java-interop, bundled out/language/main.cjs: cancelled workspace/symbol was answered
  {"id":7,"result":{"code":-32800}} before and {"id":7,"error":{"code":-32800,"message":"The
  request has been cancelled."}} after. Whole vitest suite at the known baseline (12 env failures).
  Windows attestation PASSED (maintainer, 2026-09-20, zip sha256 eae9beb0…7524b051, IDE session
  started 11:45:31): "only banners in the logs that are expected. not anymore per keystroke".
  idea.log for that session: 4 "Launching" lines = 1 initial start + 3 restarts each preceded by
  "Scheduled a BBj language server restart"; zero "Timeout error while shutdown", zero "Stream Closed".
  Still open, recorded as follow-ups only (proposals 2-4 above): StartOptions.DEFAULT forceRestart in
  BbjComposerService.resolveServer / doRestart; connection loss invisible to the plugin's crash
  detection; stale "previous" value in the status log line; upstream lsp4ij reports.
files_changed: [bbj-vscode/package.json, bbj-vscode/package-lock.json, bbj-vscode/test/lsp-protocol-single-copy.test.ts]

## Proposed fix (NOT applied — diagnose-only session)

Four independent changes; 1 and 2 are the ones that address the reported symptoms, 3 is the one that
makes the next occurrence self-reporting, 4 is the independent defect found on the way.

1. Stop feeding Search Everywhere into this server (kills the trigger and the whole file-less
   start-on-demand path in one place). In `createClientFeatures()`, register a workspace-symbol
   feature that is disabled, exactly like the existing `LSPDocumentLinkFeature` override:
   `.setWorkspaceSymbolFeature(new LSPWorkspaceSymbolFeature() { @Override public boolean isEnabled() { return false; } })`
   (API verified present in the pinned jar: `LSPClientFeatures.setWorkspaceSymbolFeature`,
   `LSPWorkspaceSymbolFeature.isEnabled/isSupported`). Cost: BBj symbols stop appearing in Search
   Everywhere — they are currently returning `[]` there anyway on the one query that was answered.
   Keep this until leg 1 of the root cause is understood server-side; it is the smallest change that
   removes the only request class correlated with the deaths.
   - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java

2. Never ask LSP4IJ to force-restart a healthy server. Pass explicit options instead of the
   one-argument convenience in both call sites:
   `new LanguageServerManager.StartOptions().setForceRestart(false)` (leave willEnable as is), and in
   `BbjComposerService` additionally skip the call entirely when
   `manager.getServerStatus(SERVER_ID) == ServerStatus.started`.
   - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerService.java (line 48)
   - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java (doRestart, line 322)
   - guards: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
     (add "the start is requested without forcing a restart", mutation-checked against the current
     source), and bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
     (it already pins StartOptions.DEFAULT.isForceRestart()==true; add
     `new StartOptions().setForceRestart(false)` and `LanguageServerManager.start(String, StartOptions)`).

3. Make an LSP4IJ-initiated stop/relaunch visible to the plugin, and make the status we act on
   truthful. Today the crash path is unreachable and the status is stale:
   - subscribe to LSP4IJ's lifecycle listener
     (`com.redhat.devtools.lsp4ij.lifecycle.LanguageServerLifecycleManager#addLanguageServerLifecycleListener`,
     `statusChanged`/`handleError`) so a wrapper-driven stop/start/crash is logged and classified even
     when no language client exists to forward it;
   - record the status synchronously in `handleServerStatusChanged` and keep only the UI work inside
     `invokeLater`;
   - fix the two-behind `previousStatus` already recorded in Evidence (assign `previousStatus =
     currentStatus` before classifying/logging, or log `currentStatus -> status`).
   - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java (lines 41-56)
   - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java (updateStatus, lines 139-217)
   - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java (only if the
     classifier's `stopped`-only contract is widened; it is correct as written, it is simply never fed)

4. Upstream report to redhat-developer/lsp4ij (no local fix possible): `LanguageServerWrapper.start()`
   tears down an in-flight start attempt whenever a stale `serverError` is still set, so N feature
   calls during a recovery spawn N processes; and `stop()` both nulls `languageClient` before, and
   condition-suppresses, the `ServerStatus.stopped` publication, so clients cannot observe a server
   crash at all.

Not proposed: touching RestartGate or doRestart's stop/wait logic — they behaved correctly in every
cycle in this log (shutdown answered in 0 ms, one launch each). The gate cannot help here because the
path never reaches it.

## Open sub-question (needs Windows; ONE batched request)

Unresolved: why the language-server process died at 10:29:30 and 10:29:49. If the maintainer is
willing, this single pass settles it — everything else in this report is already closed.

  1. Open the project, wait until diagnostics have appeared for an open .bbj file (so the workspace
     is fully indexed), then open the LSP4IJ "Language Servers" window and select the BBj server.
  2. Switch to its **Logs** tab (not Traces) and clear it. That tab carries the server's stderr,
     which is where a Node crash ("FATAL ERROR: … JavaScript heap out of memory", an unhandled
     rejection stack, an EPIPE) would appear — the trace export we have could not show it.
  3. Press Shift-Shift and type `restart` slowly, one character at a time, pausing ~1 s between
     characters, and leave the popup open for 5 s. Do this immediately after an IDE start too
     (i.e. while the first workspace build is still running), since both failures happened on an
     instance that had recently started.
  4. Watch Task Manager during step 3 and note the peak number of node.exe and their peak memory.
  5. Send back: the **Logs** tab content, the fresh idea.log, and the node.exe peak count/memory.

If step 2 shows an out-of-memory or an unhandled-rejection stack, the fix moves to the language
server (bbj-vscode) and proposal 1 above becomes a temporary mitigation rather than the answer.
