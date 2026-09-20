---
status: resolved
trigger: "BBj language server does not start on Windows after Node auto-install"
created: 2026-09-20T08:00:00Z
updated: 2026-09-20T14:30:00Z
resolved: 2026-09-20T14:30:00Z
---

## Current Focus

bug_class: Bohrbug — deterministic once the precondition "the first start attempt failed" holds. It
  only looks environment-specific because that precondition has only ever held on the Windows box.

reasoning_checkpoint:
  hypothesis: "BbjServerService.doRestart() calls LanguageServerManager.stop(SERVER_ID), whose
    StopOptions.DEFAULT carries willDisable=true. Every restart therefore DISABLES the LSP4IJ server
    definition first, and depends on the following manager.start(SERVER_ID) re-enabling it via
    LanguageServerWrapper.restart()'s setEnabled(true). That undo only happens when a wrapper for the
    definition is already in LanguageServiceAccessor.getStartedServers(). On any path where it is not
    — or where anything throws between the stop and the start — the definition stays disabled for the
    rest of the IDE session, LSP4IJ silently filters it out of every later start attempt
    (.filter(LanguageServerWrapper::isEnabled)), no process is ever spawned, and nothing is logged."
  confirming_evidence:
    - "Measured against the pinned lsp4ij-0.21.0 jar on the test classpath, not read from docs:
       StopOptions.DEFAULT.isWillDisable()==true, StartOptions.DEFAULT.isForceStart()==false,
       StartOptions.DEFAULT.isWillEnable()==true, StartOptions.DEFAULT.isForceRestart()==true."
    - "LanguageServerManager.stop(def, opts): when no wrapper matches it calls
       serverDefinition.setEnabled(false, project) outright; when one matches it calls
       ls.stopAndDisable(), whose first act is setEnabled(false)."
    - "LanguageServerManager.start(def, opts) never calls setEnabled(true) itself — willEnable only
       suppresses an exception. The re-enable lives solely inside LanguageServerWrapper.restart()."
    - "LanguageServerDefinition.isEnabled/setEnabled back a plain in-memory boolean field, so the
       disable lasts exactly one IDE session — matching 'an IDE restart fixes it'."
    - "The maintainer's idea.log proves the server DOES start on that Windows machine once node.exe is
       cached and the IDE has been restarted (bbj/bbjcplAvailability arrives 13 s into the session)."
    - "The maintainer reports NO pid at all under 'BBj Language Server'. LSP4IJ stores currentProcessId
       specifically so the explorer can still show it after the process dies, so 'no pid' means
       provider.start() was never reached — no node process was ever spawned in that session."
  falsification_test: "A Windows session where, after the download, the LSP4IJ console for
    'BBj Language Server' shows a fresh 'Cannot start server' / 'No usable Node.js executable' error
    instead of silence would refute this: that would mean the restart DID reach a start attempt and the
    Node resolution failed instead. The instrumented build reads either answer off idea.log."
  fix_rationale: "Stop the server without disabling its definition — StopOptions().setWillDisable(false).
    The restart then never revokes the capability it is about to exercise, and recovery stops depending
    on a wrapper happening to be in getStartedServers() at that instant."
  blind_spots: "Not yet proven which of the two disable branches the Windows box took, nor that the
    disable is the WHOLE story: a second, independent failure (the freshly downloaded node.exe failing
    its in-session version probe) would look identical from outside. Not reproducible on this host."
  candidate_causes:
    - "code: the restart path disables the server definition it is about to start (mechanism CONFIRMED)"
    - "code: LanguageServerWrapper gives up after MAX_NUMBER_OF_RESTART_ATTEMPTS=20 failed starts and
       calls setEnabled(false) — the same dead end reached from the other direction"
    - "environment/data: the freshly written 68 MB node.exe fails its in-session `node --version` probe
       (antivirus scan / file lock) -> VERSION_UNKNOWN -> rejected"
    - "config: ruled out — the maintainer confirmed BBj home and EM login are correct"
  and_gate: "yes, plausibly. The disable is sufficient on its own, but the probe-failure cause could be
    contributing at the same time; the two are independent, and both are addressed (one fixed, one made
    visible) rather than assuming a single cause."

hypothesis: "CONFIRMED mechanism (vendor defaults measured), pending Windows attestation that it is the
  operative one in the reported failure."
test: "Fix the disabling stop; instrument the Node-resolution decision and the restart lifecycle so the
  next Windows round-trip reads the answer off idea.log either way."
expecting: "The server starts after the in-session restart that follows the Node download, and idea.log
  names the chosen node.exe, its source and the exact spawned command line."
next_action: "NONE — session resolved 2026-09-20 by Windows attestation (see the final Evidence entry).
  Follow-ups that are NOT part of this fix are listed under 'Follow-up observations'; none of them
  reopens this bug."

historical_next_action: |
  DONE on this host: fix + diagnostics committed as 796a3f6f on
  gsd/phase-96-platform-integration-node-js-diagnosis; IntelliJ suite green (1076/0/0, --rerun-tasks);
  plugin rebuilt.

  Artefact awaiting Windows attestation:
    /home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip
    sha256 462a4d39e970a478cb376e8c886874de8d37689431d1c2a1976ab2f0977a071b
    bundled main.cjs sha256 273fe673aaff2831df16a51c453592446c0a314eb3755d58bbde2718dd1f4135
  No VSIX was rebuilt: no bbj-vscode source changed, and VS Code already works on that machine.

  NEXT AGENT: do not re-run the investigation. Wait for the maintainer's answer to the checkpoint.
  If it passes -> archive the session, then (and only then) PLAT-06 / WINDOWS.md entry 3 may change.
  If it still fails -> the new idea.log answers which branch: look for lines from
  com.basis.bbj.intellij.lsp.BbjLanguageServer (which Node was chosen, the exact command line) and
  com.basis.bbj.intellij.ui.BbjServerService (every status transition, every restart request, the
  status either side of the stop). Silence from BbjLanguageServer with BbjServerService showing a
  start request means the start never reached createConnectionProvider — i.e. the definition is
  still being disabled somewhere, and the remaining suspect is LanguageServerWrapper's own
  setEnabled(false) after MAX_NUMBER_OF_RESTART_ATTEMPTS (20).

## Symptoms

expected: "On a real Windows machine with no Node.js configured, the IntelliJ plugin's 'Download Node.js' action installs node.exe into the plugin data dir (bbj-intellij-data\\nodejs) and the BBj language server starts afterward (PLAT-06, Phase 96). Status widget shows the server started, with a running pid under 'BBj Language Server' in the LSP4IJ Language Servers window — as it does on the maintainer's Mac with the same plugin build."
actual: |
  Windows 10, IntelliJ IDEA 2026.2.2 (Build #IU-262.10315.125), LSP4IJ 0.21.0, BBj Language Support 0.1.0 (bbj-intellij-0.1.0.zip sha256 c40bf16f... built from commit ae86384e), project C:\tinybbj.
  Download half works: node.exe (68 MB) plus .sha256 sidecar land in bbj-intellij-data\nodejs; running that node.exe --version from a Windows prompt prints v22.23.2.
  Startup half fails. Maintainer's words (96-07-SUMMARY.md):
  - "node installs, then the 'Restart Language Server' popup, but after clicking nothin."
  - "node download succees, no mor error, but the BBj Language Server says 'BBj Stopped'. Trying to restart does not change anything, it does not come up"
  - "There is that server. When I compare to my Mac with the same plugin, on that Windows machine it just says 'BBj Language Server', but no running pid underneath."
  - "The home is set correctly and login to EM works. Tools - Restart.. makes no difference."
errors: |
  No error reported to the user after the two already-fixed defects (Node floor pin v20->v22.23.2; BbjNodeVersionCache null poisoning, commit ae86384e). Silent failure.
  Known diagnostic blind spot (96-07 finding 7): BbjLanguageServer logs via java.util.logging.Logger, which IntelliJ does not route to idea.log, so every LOG.warning(rejected.toString()) in resolveNodePath is invisible. 96-07 names fixing this as the first step of this debug session.
  Related unfixed findings from 96-07: (3) 'Show logs' link on the LSP4IJ start-failure notification is dead; (4) deleted configured Node path yields a raw stack trace; (5) status bar reads 'BBj: Stopped' during indexing; (8) BbjNodeDownloader.java:101 setFraction without setIndeterminate(false) -> IllegalStateException trace per download (cosmetic).
timeline: "Never worked on Windows. First exercised during the Phase 96 plan 07 hand attestation on 2026-09-20. Same plugin build works on macOS. Two earlier blockers on the same path were found and fixed during that attestation session (commits 1b6b83d3, a6b27b44, c41859dd, cb370e48, ae86384e)."
reproduction: "Windows machine with no Node.js configured -> open a BBj project in IntelliJ with the plugin -> missing-Node banner -> 'Download Node.js' -> download succeeds -> 'Restart Language Server' popup -> click it -> nothing; status stays 'BBj Stopped'; Tools > Restart BBj Language Server makes no difference."

## Differential data (from the maintainer, 2026-09-20)

- VS Code on the SAME Windows machine: the BBj language server starts and works. Points at the IntelliJ plugin's launch path rather than the server bundle or the machine.
- Manually configured (non-auto-installed) Node 22+ in IntelliJ on that machine: NOT tested.
- The Windows machine is up and the maintainer can gather more evidence on request (checkpoint with exact steps to run).

## Eliminated

- hypothesis: "The Node-path diagnostics never reached idea.log because BbjLanguageServer logs through java.util.logging, which IntelliJ does not route (phase 96 finding 7, named there as the first thing to fix)."
  evidence: "The maintainer's own idea.log contains a WARN record from org.eclipse.lsp4j.jsonrpc.services.GenericEndpoint, which is a java.util.logging logger, rendered in IntelliJ's own format. IntelliJ configures the JUL root logger, so third-party JUL records at INFO and above do reach idea.log. The real cause of the silence is that resolveNodePath only logged rejections and an absent candidate records none — so the total-failure case, and the success case, both logged nothing at all."
  timestamp: 2026-09-20T11:20:00Z

- hypothesis: "The failure is specific to something the Windows platform does to the launch — path quoting, spaces, .exe resolution, the working directory, or GeneralCommandLine on Windows."
  evidence: "The maintainer's idea.log from the failing session shows the server delivering a bbj/bbjcplAvailability notification 13 s into the session. That notification is only sent once the server has initialized, received its BBj home through initializationOptions, and begun building documents — so on that same machine, in that same session, the command line spawned a working node process and completed the LSP handshake. The launch mechanics are sound; the failure is in what happens to the server afterwards."
  timestamp: 2026-09-20T11:45:00Z

## Evidence

- timestamp: 2026-09-20T08:00:00Z
  checked: "Maintainer-supplied IntelliJ log from the Windows machine. They named /tmp/idea.log, which does not exist; the file actually present is /tmp/ideal.log (82 KB, 505 lines, IDE STARTED 2026-09-20 06:56:32, user profile C:\\Users\\beff). Copied to /home/coder/repos/bbj-language-server/tmp/windows-idea-2026-09-20.log (untracked; contains a Windows user name and local paths — do NOT commit it)."
  found: |
    The log covers a single IDE start, 06:56:32 -> 06:56:51 (19 s), project tinybbj, files test1223.bbj and test.bbj opened at 06:56:38. 'exit dumb mode' at 06:56:37.
    Only BBj/LSP-related line in the whole log:
      2026-09-20 06:56:46,085 WARN - org.eclipse.lsp4j.jsonrpc.services.GenericEndpoint - Unsupported notification method: bbj/bbjcplAvailability
    No ERROR/SEVERE lines, no stack traces, no LSP4IJ start-failure lines, no lines from the plugin's own classes (consistent with the java.util.logging blind spot).
  implication: "MAINTAINER-CONFIRMED (see next entry, 2026-09-20T09:10:00Z): this log IS from a failing session. bbj/bbjcplAvailability is a notification SENT BY the language server; its arrival at 06:56:46 means a node process was spawned and the server was talking JSON-RPC to LSP4IJ in the very session that showed 'BBj Stopped'. Also worth checking independently: the client has no handler for bbj/bbjcplAvailability (grep the notification name in bbj-vscode/src and bbj-intellij/src)."

- timestamp: 2026-09-20T09:10:00Z
  checked: "Asked the maintainer which IDE session the supplied idea.log came from. ANSWERED — do not ask again."
  found: |
    The log at tmp/windows-idea-2026-09-20.log IS from a session that showed "BBj Stopped".
    It is the log of the final attestation test that made phase 96 record the PLAT-06 failure.
  implication: |
    Decisive. In the very session where the status widget read "BBj Stopped" and no pid showed
    under "BBj Language Server" in the LSP4IJ Language Servers window, the language server
    nevertheless delivered a bbj/bbjcplAvailability notification to LSP4IJ at 06:56:46, 13 s
    after IDE start. A node process WAS spawned and JSON-RPC WAS flowing in the FAILING session.

    Therefore "the server never starts / node is never spawned" is largely ELIMINATED as the
    whole story, and the live hypotheses are:
      (a) the server starts, then dies or is stopped shortly after the notification;
      (b) status/pid reporting is wrong while the server is actually running;
      (c) the `initialize` handshake never completes on the client side — the server sends
          notifications but the client never reaches STARTED;
      (d) a second wrapper/instance exists, and the one shown as stopped is not the one that
          spawned node.

    Still unknown; MUST be in the first Windows checkpoint batch (one round-trip is expensive):
      1. whether language features actually worked in that session — hover, completion and
         diagnostics on an open .bbj file;
      2. whether node.exe was visible in Task Manager, and how many instances, while the
         widget read "BBj Stopped";
      3. the LSP4IJ "Language Servers" window console/trace output for the BBj server, with
         trace set to verbose first.

- timestamp: 2026-09-20T11:20:00Z
  checked: "Whether phase 96 finding 7 ('BbjLanguageServer logs via java.util.logging, which IntelliJ does not route to idea.log') actually holds. Tested against the maintainer's own log rather than assumed."
  found: |
    REFUTED. The one BBj-related line in that log —
      WARN - org.eclipse.lsp4j.jsonrpc.services.GenericEndpoint - Unsupported notification method: ...
    is emitted by LSP4J's `java.util.logging.Logger`, rendered in IntelliJ's own
    `LEVEL - category - message` format. IntelliJ configures the JUL *root* logger
    (JulLogger.configureLogFileAndConsole), so any third-party JUL record at INFO or above does
    reach idea.log. The plugin's `LOG.warning(...)` calls were never being swallowed by JUL.
  implication: |
    The diagnostics were invisible for a different and worse reason: resolveNodePath only ever
    logged *rejections*, and NodeExecutableResolver.validate() skips a blank/absent candidate
    without recording one. With nothing configured, nothing on PATH and nothing downloaded, the
    resolver produces an empty rejection list — so the total-failure case logged literally nothing,
    and the success case logged nothing either (no "which Node did we pick", no command line).
    Switching to com.intellij.openapi.diagnostic.Logger is still the right move (platform-correct,
    category-controllable), but the fix that matters is logging the whole decision, not the logger.

- timestamp: 2026-09-20T11:40:00Z
  checked: "LSP4IJ 0.21.0 sources fetched at the pinned tag: LanguageServerManager, LanguageServerWrapper, LanguageServiceAccessor, LanguageServerDefinition, OSProcessStreamConnectionProvider."
  found: |
    - LanguageServerManager.stop(String) delegates to stop(def, StopOptions.DEFAULT). That path
      calls ls.stopAndDisable() on every matching registered wrapper, and, when NO wrapper matches,
      calls serverDefinition.setEnabled(false, project) outright.
    - stopAndDisable() -> stopAndRefreshEditorFeature(true, true), whose FIRST act is setEnabled(false),
      before the stop and before a refreshEditorFeature loop over every open file.
    - LanguageServerManager.start(def, opts) never calls setEnabled(true). willEnable only decides
      whether a disabled definition throws. The re-enable lives solely in LanguageServerWrapper.restart().
    - LanguageServiceAccessor.getLanguageServers(...) filters every candidate through
      .filter(LanguageServerWrapper::isEnabled), and isEnabled() delegates to the definition.
    - LanguageServerDefinition.isEnabled/setEnabled back a plain non-persistent boolean field.
    - LanguageServerWrapper.start() also calls setEnabled(false) itself once a failing server has
      burned MAX_NUMBER_OF_RESTART_ATTEMPTS (20) — the same dead end from the other direction.
    - LanguageServerWrapper resets currentProcessId/currentProcessCommandLines to null at the top of
      every start attempt, before createConnectionProvider(); it keeps them after a process dies
      precisely so the Language Servers window can still show them. So "no pid underneath" means the
      most recent attempt never reached provider.start().
  implication: "Every restart this plugin performs disables the server definition first and depends on
    a re-enable that only happens on one of the two possible paths. That is a silent, session-scoped,
    permanent dead end, and it is reached from the restart trigger the maintainer actually used."

- timestamp: 2026-09-20T11:55:00Z
  checked: "The vendor option defaults, measured by a JUnit probe run against the lsp4ij-0.21.0 jar that is actually on this project's test classpath — not read from documentation."
  found: |
    StopOptions.DEFAULT.isWillDisable()  = true
    StartOptions.DEFAULT.isWillEnable()  = true
    StartOptions.DEFAULT.isForceStart()  = false
    StartOptions.DEFAULT.isForceRestart()= true
    new StopOptions().setWillDisable(false).isWillDisable() = false
  implication: |
    Confirms the mechanism end to end against the shipped binary:
      willDisable=true  -> BbjServerService.doRestart()'s manager.stop(SERVER_ID) disables the definition
      willEnable=true   -> the following start throws nothing, so the failure is completely silent
      forceStart=false  -> that start will not create a wrapper, so it falls back to the open-files path
                           which filters disabled definitions out -> nothing starts, no process, no log
    The opt-out exists and works. This is now pinned by a canary test so a vendor change re-audits it.

- timestamp: 2026-09-20T12:30:00Z
  checked: "Mutation check on the new source guard: reverted doRestart()'s stop back to the one-argument manager.stop(SERVER_ID) and re-ran BbjServerServiceRestartSourceGuardTest."
  found: "3 of 16 tests failed, including the new theStopIsRequestedWithoutDisablingTheServerDefinition. Restored the fix; the whole IntelliJ suite is 1076 tests, 0 failures, 0 errors under --rerun-tasks."
  implication: "The recurrence guard actually bites on the pre-fix code rather than passing vacuously."

- timestamp: 2026-09-20T14:30:00Z
  checked: |
    WINDOWS ATTESTATION — the maintainer installed the instrumented build on the Windows 10 machine
    and ran the full checkpoint pass from a clean IntelliJ 2026.2.2, with no Node.js configured and
    none on PATH.
      artefact: bbj-intellij-0.1.0.zip
      sha256:   462a4d39e970a478cb376e8c886874de8d37689431d1c2a1976ab2f0977a071b
      commit:   796a3f6f
    Evidence files are untracked and contain a Windows user name and local paths — NEVER commit them:
      /home/coder/repos/bbj-language-server/tmp/idea.log
      /home/coder/repos/bbj-language-server/tmp/intellij_traces.txt
  found: |
    PASS. Maintainer's words: "It's working fine now, all tests worked from a clean intellj. ...
    after every forced restart it came up correctly with completion, hints, code assistance etc.
    But the traces showed exceptions during restart worth a check".

    idea.log lines 1736-1892 carry the decisive sequence, all in the SAME IDE session as the download
    — the exact scenario that used to dead-end:
      10:27:34  Node.js download completes
                "Using the CACHED Node.js executable ...\bbj-intellij-data\nodejs\node.exe"
      10:27:43  launch -> "status: stopped -> started"
      then four BbjServerService restarts at 10:27:55, 10:28:11, 10:28:47, 10:29:32 and 10:29:59,
      each followed by a launch and "started" within ~0.6 s.
  implication: |
    The confirmed mechanism was the operative one, and the fix resolves it. The in-session
    download -> restart -> start path now completes, which is precisely what previously produced
    "BBj Stopped" with no pid; and repeated forced restarts no longer dead-end, which is what the
    permanent in-memory disable used to guarantee. Language features (completion, hints, code
    assistance) work after every restart, closing the open question about whether the editor was
    live. The new diagnostics also proved their own worth: the cached-node line and the status
    transitions are what make this log readable at all.

    The AND-gate contributing cause (a freshly written node.exe failing its in-session version probe)
    did NOT occur here — the cached executable was accepted and launched. It stays unproven rather
    than eliminated, but it is not required to explain the reported failure and is now self-reporting
    if it ever bites.

    The restart-time exceptions the maintainer flagged are real but separate; see
    "Follow-up observations (not part of this fix)". None of them prevented a successful start.

## Resolution

root_cause: |
  CONFIRMED AND ATTESTED ON WINDOWS (2026-09-20).

  BbjServerService.doRestart() stopped the language server through LSP4IJ's one-argument
  LanguageServerManager.stop(String) convenience. That overload passes StopOptions.DEFAULT, and
  StopOptions.DEFAULT.willDisable is true (measured against the pinned lsp4ij-0.21.0 jar). It does
  not merely stop the server — it DISABLES the server definition, either by calling stopAndDisable()
  on a registered wrapper or, when none is registered, by calling setEnabled(false) on the definition
  outright. Nothing in LanguageServerManager.start(...) re-enables a definition; the re-enable
  happens only as a side effect of LanguageServerWrapper.restart(), i.e. only when a wrapper is
  already in LanguageServiceAccessor.getStartedServers() at that instant, and StartOptions.DEFAULT
  has forceStart=false so the start will not create one. On every path where that does not hold — no
  registered wrapper, or anything throwing between the stop and the start — the definition stays
  disabled. LSP4IJ then filters it out of every subsequent start attempt
  (.filter(LanguageServerWrapper::isEnabled)), so no node process is ever spawned again, no pid ever
  appears in the Language Servers window, every further restart request repeats the same
  self-defeating cycle, and nothing is logged at any point. The enabled flag is a plain in-memory
  field on an application-level definition, so restarting the IDE is the only cure — which matches
  the maintainer's own evidence that the server starts normally in a fresh IDE session on that same
  Windows machine.

  Why Windows and not the Mac: this is not a Windows-specific mechanism. It needs one precondition —
  that the restart path is exercised while the server is not in a state that re-enables it. The
  Windows machine is the only one where Node.js was absent, so it is the only machine where the
  missing-Node banner, the download, and the "Restart Language Server" action were ever used. The Mac
  has Node on PATH, its server always started, and its restarts always found a registered wrapper, so
  the disable was always immediately undone and invisible.

  Contributing cause, AND-gate now closed by the attestation: the freshly written 68 MB node.exe
  failing its in-session `node --version` probe would have looked identical from outside. On the
  attested run it did not occur — idea.log shows the cached node.exe accepted and launched at
  10:27:43, in the same session as the download. It remains unproven rather than disproven as a
  latent possibility, but it is not needed to explain the reported failure, and the instrumented
  build now makes that case name itself in idea.log instead of failing silently.
fix: |
  1. bbj-intellij/.../ui/BbjServerService.java — doRestart() now stops with
     LanguageServerManager.StopOptions().setWillDisable(false), so a restart never revokes the
     capability it is about to exercise; and the start now runs from a finally block, so a stop that
     throws can no longer end a restart with the server down and no further trigger.
  2. Diagnostics, on com.intellij.openapi.diagnostic.Logger rather than java.util.logging:
     - BbjLanguageServer now logs every Node.js candidate it considered (naming absent ones
       explicitly), the winner and its source, every rejection, and the exact command line and
       working directory it launches — the success path and the no-candidate path used to log nothing.
     - BbjServerService now logs every status transition with its crash/expected-stop classification,
       every restart request (including one dropped by the gate), the status before the stop, a stop
       that timed out, and the status before the start.
  3. Guards: a new source guard fails if the disabling one-argument stop ever comes back or the start
     leaves the finally; the LSP4IJ coupling canary now pins stop(String, StopOptions),
     StopOptions.setWillDisable, and the four option defaults this reasoning rests on.
verification: |
  signal_regression_test: PASS — new guard theStopIsRequestedWithoutDisablingTheServerDefinition plus
    the retargeted ordering guards; mutation-checked (3/16 fail on the pre-fix source).
  signal_vendor_semantics: PASS — canary measures StopOptions/StartOptions defaults against the pinned
    lsp4ij-0.21.0 jar; oracle_type: derived (vendor contract), not implicit.
  signal_full_suite: PASS — 1076 tests, 0 failures, 0 errors (./gradlew test --rerun-tasks).
  signal_not_deletion_only: PASS — behaviour change plus new diagnostics, no capability removed.
  signal_revert_reproduces: NOT APPLICABLE ON THIS HOST — the failure only reproduces on the
    maintainer's Windows machine; covered instead by the attestation below.
  windows_attestation: PASS — 2026-09-20, maintainer, clean IntelliJ IDEA 2026.2.2 on Windows 10 with
    no Node.js configured and none on PATH, running bbj-intellij-0.1.0.zip
    sha256 462a4d39e970a478cb376e8c886874de8d37689431d1c2a1976ab2f0977a071b (commit 796a3f6f).
    "It's working fine now, all tests worked from a clean intellj. ... after every forced restart it
    came up correctly with completion, hints, code assistance etc." idea.log 1736-1892 shows the
    download at 10:27:34, the cached node.exe being used, "stopped -> started" at 10:27:43 in the
    SAME session as the download, and five further BbjServerService restarts each reaching "started"
    within ~0.6 s. This is the signal that could not be run from Linux, and it passed.
files_changed:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java

## Follow-up observations (not part of this fix)

Found in the attestation logs (`tmp/idea.log`, `tmp/intellij_traces.txt` — untracked, contain a
Windows user name; never commit). Recorded as observed and **not analysed beyond what is written
here**. None of them blocked a successful start, and none reopens this session. The maintainer
flagged (a) themselves: "the traces showed exceptions during restart worth a check".

a. **"Stream Closed" traces during restart.** `JsonRpcException` / `IOException` raised from
   `LanguageServerWrapper.lambda$start$7` while restarting. Same signature as the already-diagnosed
   `.planning/debug/refresh-stream-closed.md` (status: diagnosed, no fix applied). Likely the same
   underlying issue rather than a new one, but that was not verified here.

b. **Duplicate node processes plus an unanswered `shutdown`, on restarts issued outside
   `BbjServerService`.** Two `Timeout error while shutdown the language server 'bbjLanguageServer'`
   WARNs at 10:29:35 and 10:29:54, each exactly 5 s after a stop at 10:29:30 / 10:29:49 that did NOT
   come through `BbjServerService` (no "Restarting the BBj language server" line precedes either).
   At those two moments `BbjLanguageServer` logged 3 and 2 "Launching" lines within ~300 ms, and the
   trace shows a just-initialized instance immediately being sent `shutdown`/`exit`. So a restart
   issued outside `BbjServerService` spawns duplicate node processes and leaves the old server's
   `shutdown` request unanswered until it times out. Through `BbjServerService` the contrast is
   sharp: the shutdown is answered in 0 ms and exactly one process launches. Worth a look — it
   suggests the non-`BbjServerService` restart trigger should be routed through the same gate.

c. **Stale "previous" value in the new status-transition log line** — it prints
   "stopped -> stopping", "started -> started", "stopping -> stopping". Cosmetic bug in the
   diagnostics added by 796a3f6f; the transitions themselves are correct, only the rendered
   "previous" is stale.

d. **`BbjNodeDownloader.java:101`** still logs an `IllegalStateException` per download —
   `setFraction` without a preceding `setIndeterminate(false)`. Already known (phase 96 finding 8),
   cosmetic.

e. **No client handler for `bbj/bbjcplAvailability`.** The server sends it; the client has no
   handler, so `GenericEndpoint` logs an "Unsupported notification method" WARN on every start.
   Harmless, but it is noise in every log and it misled the early part of this investigation.
