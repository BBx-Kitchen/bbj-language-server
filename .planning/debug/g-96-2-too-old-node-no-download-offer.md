---
status: diagnosed
trigger: "g-96-2-too-old-node-no-download-offer — In the IntelliJ plugin, when the BBj Node.js path in Settings points at a Node.js older than the minimum (22), the user is not led to a working runtime. The popup only offers \"Configure Node.js\" — no \"Download Node.js\" action — and the settings dialog, which shows a \"Version too old: ...\" statement next to the path field, does not say that the user can simply clear the path and restart to let the plugin's automatic detection/download do its job."
created: 2026-09-20T00:00:00Z
updated: 2026-09-20T00:00:00Z
audit_acknowledged:
  milestone: v4.4
  at: 2026-09-20
  status: diagnosed
---

## Current Focus

<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED (two independent, both-required causes — see Resolution)
test: read the startup notification path, the presentation seam, the editor-banner consumer and the settings label site; compare action sets
expecting: (done) the startup popup bypasses NodePresentation entirely; the settings label has no recovery hint
next_action: none — diagnosis complete, goal was find_root_cause_only. Fix directions are in Resolution.

reasoning_checkpoint:
  hypothesis: "Two independent guidance defects, both required for G-96-2 to fail. (a) BbjLanguageServer.notifyUnresolvedNodePath builds its own Notification with exactly one hardcoded NotificationAction(\"Configure Node.js Path\") and never consults NodePresentation.bannerActions(resolution) — so the popup can never offer Download/Install-manually regardless of rejection reason. (b) BbjSettingsComponent.applyNodeLookup's below-minimum branch sets only the version statement, and nodeJsField is the one path field in the dialog with no getEmptyText() hint — so nothing anywhere tells the user that clearing the field enables auto-detect/download."
  confirming_evidence:
    - "BbjLanguageServer.java:107-123 — notifyUnresolvedNodePath takes only (project, message); the single addAction at :114 is the literal \"Configure Node.js Path\". No NodePresentation reference exists anywhere in the file (grep for NodePresentation under bbj-intellij/src/main/java returns only NodePresentation.java and BbjMissingNodeNotificationProvider.java)."
    - "BbjLanguageServer.java:92-95 — the call site passes resolution.failureMessage(), discarding the Resolution object, so the reason-specific action set is not even reachable at the notification site."
    - "NodeExecutableResolver.java:157-158 — failureMessage() itself appends the hardcoded 'Configure a Node.js executable at Settings | Languages & Frameworks | BBj.' line, reinforcing the configure-only framing in the popup body."
    - "NodePresentation.java:72-80 — bannerActions returns ALL_ACTIONS (download, configure, install-manually) for every unresolved case except CACHE_UNAVAILABLE; BELOW_MINIMUM_VERSION therefore already yields all three ids. NodePresentationTest.java:114-116 pins that Download is present for the below-minimum case."
    - "BbjMissingNodeNotificationProvider.java:55-68 — the editor banner DOES iterate NodePresentation.bannerActions and creates all three action labels. The presentation seam and its banner consumer are correct; only the startup popup is deficient."
    - "BbjSettingsComponent.java:365-366 — the below-minimum branch sets exactly 'Version too old (minimum: 22), detected: ' + version. No recovery hint."
    - "BbjSettingsComponent.java:113-117 vs :109-110, :158, :217 — nodeJsField sets no getEmptyText(); compilerOutputDirectoryField, configPathField and emUrlField all do. The hint convention exists in the same file and the Node field is the sole omission."
  falsification_test: "If BbjLanguageServer.java contained a NodePresentation.bannerActions(...) call or more than one addAction, cause (a) would be wrong. If applyNodeLookup's below-minimum branch or nodeJsField's empty text mentioned clearing the field / auto-detection, cause (b) would be wrong. Neither is present."
  fix_rationale: "Cause (a) is addressed at the root — the popup's action set becomes a function of the resolver's rejection reason, the same single source of truth the banner already uses — not by bolting one extra hardcoded button on. Cause (b) is addressed at the exact surface the tester pointed at (the 'Version too old' statement), plus the field's own empty-text hint so the affordance is visible before the user ever hits the error."
  blind_spots:
    - "Not observed on the reporter's machine: whether the editor banner (which WOULD offer Download here) rendered at all in this state. Reasoned to render — the settings dialog showed a real version string, so the node --version probe succeeds and BbjNodeVersionCache memoizes it, and UAT Tests 4/28 both confirm the banner renders and its Download action works. But the banner's buildPanel spawns node --version via BbjNodeVersionCache.SESSION::getVersion, a path Test 28 never exercised (all candidates were blank there). Worth one confirmation during re-UAT: does the too-old state show the editor banner with three actions?"
    - "The tester's word 'popup' is matched to the startup ERROR balloon by its exact single-action label. Not independently confirmed that no other surface contributed."
    - "No Windows IDE available here; every finding is source-level, not runtime-observed."
  candidate_causes:
    - "code: the startup notification path hardcodes its action set and bypasses the NodePresentation seam (BbjLanguageServer.java:107-123) — CONFIRMED"
    - "code/UX copy: the settings below-minimum label and the Node field's empty text carry no recovery hint (BbjSettingsComponent.java:365-366, :113-117) — CONFIRMED"
    - "config/environment: cache directory inaccessible, which would legitimately strip Download via Reason.CACHE_UNAVAILABLE — ELIMINATED (see Eliminated)"
    - "code: resolver fall-through failing to reach the cached download — ELIMINATED (UAT Test 3 + Test 17)"
  and_gate: "yes. G-96-2's truth statement is a conjunction: the notification must offer the download AND the settings dialog must name the clear-the-path recovery. The two causes sit in different files with no shared code path, so fixing either alone leaves the gap failed. root_cause is therefore a set of two."

## Symptoms

<!-- Written during gathering, then IMMUTABLE -->

expected: A too-old configured Node.js is rejected AND the user is guided to a working runtime: the notification/banner offers the Node.js download (NodePresentation's BELOW_MINIMUM_VERSION case is supposed to keep all three action ids: download-nodejs, configure-nodejs-path, install-nodejs-manually), and the settings dialog says next to its "Version too old" statement that clearing the path lets the plugin pick or download a suitable Node.js.
actual: (verbatim from the tester, Windows 10 / IntelliJ IDEA 2026.2.2) "with an old node.js configured in the path, I don't get offered to download the suitable one. The popup only suggests to \"Configue node.js\" . In our configuration dialog it's not obvious that I can simply remove the path, then restart and let our automatic do its job. The config dialog should somehow offer that next to the statement where it says \"Version too old: ....\""
errors: None reported. Tester says "popup", not "editor banner" — likely the language-server start-failure error notification raised from the startup path (96-07-SUMMARY.md finding 4 noted an error notification "offering only 'Configure Node.js Path'"), not the BbjMissingNodeNotificationProvider editor banner.
reproduction: UAT Test 2. Settings > BBj Node.js path -> a Node < 22 binary, no Node 22+ on PATH and none downloaded in <plugins>/bbj-intellij-data/nodejs; restart the language server / open a BBj file. UAT Test 3 confirmed that when the cached download IS present the fall-through works and the server starts on it — the resolver's fall-through is NOT the defect. The defect is guidance: action set on the popup, and missing hint text in the settings dialog.
started: Discovered during UAT, 2026-09-20, on the phase-final build (last source commit e109c9ee).

## Eliminated

<!-- APPEND only - prevents re-investigating -->

- hypothesis: "NodePresentation drops ACTION_DOWNLOAD for the BELOW_MINIMUM_VERSION case, so every surface loses the Download button."
  evidence: "NodePresentation.java:72-80 — bannerActions returns ACTIONS_WITHOUT_DOWNLOAD only when a CACHE_UNAVAILABLE rejection is present; every other unresolved case returns ALL_ACTIONS. NodePresentationTest.java:114-116 asserts ACTION_DOWNLOAD is present for below-minimum. The seam is correct."
  timestamp: 2026-09-20

- hypothesis: "The editor banner (BbjMissingNodeNotificationProvider) also hardcodes its actions, which is what the tester saw."
  evidence: "BbjMissingNodeNotificationProvider.java:55-68 iterates NodePresentation.bannerActions(resolution) and creates a label for each of the three ids, including 'Download Node.js' wired to BbjNodeDownloader.downloadNodeAsync. The banner is reason-driven and correct. The surface with a single hardcoded action is the startup notification in BbjLanguageServer."
  timestamp: 2026-09-20

- hypothesis: "A Reason.CACHE_UNAVAILABLE rejection legitimately stripped the Download action in the tester's environment (the nodejs cache directory did not exist yet)."
  evidence: "BbjNodeDownloader.getNodeDataDirectory() (BbjNodeDownloader.java:165-169) calls Files.createDirectories(dataDir) and isNodeDataDirectoryAccessible() (:65-72) returns true whenever that succeeds. An absent directory is created, not reported inaccessible, so CACHE_UNAVAILABLE is not reachable from 'nothing downloaded yet'. This also means the banner's action set in the reported state is the full three."
  timestamp: 2026-09-20

- hypothesis: "The resolver failed to fall through from the too-old configured candidate to a usable runtime (the Phase 83 pinned-as-is behaviour)."
  evidence: "Ruled out before this session by UAT Test 3 (a bogus configured path with the cached download present starts the server on the cache) and UAT Test 17 (resolver-level fall-through proven). NodeExecutableResolver.resolve (:187-212) validates SETTINGS, then DETECTED, then CACHED, retaining rejections without stopping. In the reported state there was simply no usable alternative to fall through to."
  timestamp: 2026-09-20

## Evidence

<!-- APPEND only - facts discovered -->

- timestamp: 2026-09-20
  checked: ".planning/debug/knowledge-base.md"
  found: "Does not exist — no prior resolved-session pattern to match against."
  implication: "No known-pattern shortcut; full investigation required. This session should seed the knowledge base at archive time."

- timestamp: 2026-09-20
  checked: "grep for the literal 'Version too old' across bbj-intellij/src"
  found: "Exactly one site: BbjSettingsComponent.java:366."
  implication: "The settings half of the gap has a single, unambiguous fix site."

- timestamp: 2026-09-20
  checked: "BbjLanguageServer.java:66-96 (resolveNodePath) and :107-123 (notifyUnresolvedNodePath)"
  found: "resolveNodePath resolves through the seven-argument NodeExecutableResolver.resolve with the real version collaborators, logs every rejection, then on failure calls notifyUnresolvedNodePath(project, resolution.failureMessage()) and throws. notifyUnresolvedNodePath receives only a String; it constructs a NotificationType.ERROR Notification and adds exactly one NotificationAction, the literal \"Configure Node.js Path\" (:114), which opens BbjSettingsConfigurable."
  implication: "This is the tester's 'popup'. Its action set is a compile-time constant of one, independent of the rejection reason. The Resolution object — the only thing that knows this was BELOW_MINIMUM_VERSION rather than 'Node.js is missing' — is discarded at the call site. Root cause (a)."

- timestamp: 2026-09-20
  checked: "grep -rln for NodePresentation under bbj-intellij/src/main/java"
  found: "Only two files: NodePresentation.java itself and BbjMissingNodeNotificationProvider.java."
  implication: "The startup path has no connection to the presentation seam at all. The seam was built in 96-05/96-06 for the editor banner only; the startup notification predates it and was never rewired."

- timestamp: 2026-09-20
  checked: "NodePresentation.java:46-80 and NodePresentationTest.java:94-161"
  found: "bannerText gives BELOW_MINIMUM_VERSION its own sentence ('The configured Node.js is older than the minimum supported version -- Node.js 22+ is required.'). bannerActions returns ALL_ACTIONS for it; only a CACHE_UNAVAILABLE rejection yields ACTIONS_WITHOUT_DOWNLOAD. Tests pin Download present for below-minimum (:114-116) and absent for cache-unavailable (:104)."
  implication: "The correct sentence AND the correct three-action set for this exact state already exist and are already tested. The popup fix is a rewiring, not new presentation logic."

- timestamp: 2026-09-20
  checked: "NodeExecutableResolver.Resolution.failureMessage() (:149-160)"
  found: "Builds 'No usable Node.js executable was found.' plus one render(...) line per rejection, then unconditionally appends 'Configure a Node.js executable at Settings | Languages & Frameworks | BBj.' The per-rejection line for a SETTINGS source (:276-279) also appends 'Configure a valid path at Settings | Languages & Frameworks | BBj.'"
  implication: "The popup body says 'configure' twice and never mentions downloading, so even the prose reinforces the configure-only dead end the tester hit. Contributes to root cause (a) but is not the primary site — the missing actions are."

- timestamp: 2026-09-20
  checked: "BbjMissingNodeNotificationProvider.java (whole file) and BbjNotificationProviderBase.java (whole file)"
  found: "The provider resolves through the same seven-argument resolver, takes its sentence from NodePresentation.bannerText (returning null => no banner), and builds one action label per id from NodePresentation.bannerActions: Download -> BbjNodeDownloader.downloadNodeAsync, Configure -> BbjSettingsConfigurable, Install Manually -> BrowserUtil.browse(nodejs.org). The base gates only on BbjFileVisibility.isBbjProgramFileTypeName and is DumbAware."
  implication: "The editor banner is NOT part of the defect. In the reported state it should read the below-minimum sentence and offer all three actions."

- timestamp: 2026-09-20
  checked: "plugin.xml:251-262"
  found: "BbjMissingNodeNotificationProvider is registered as an editorNotificationProvider alongside the other three."
  implication: "Registration is not a suppressor; the banner is live."

- timestamp: 2026-09-20
  checked: "BbjSettingsComponent.java:119-142 (validator), :267-276 (document listener), :288-298 (layout), :357-369 (applyNodeLookup)"
  found: "nodeVersionLabel is a single JBLabel whose text is fully overwritten by applyNodeLookup. The below-minimum branch (:365-366) sets only 'Version too old (minimum: 22), detected: ' + version. The ComponentValidator (:134-138) adds 'Node.js version 22 or higher is required' on the field. Neither string mentions clearing the field. The label sits directly under the Node.js path field in the form (:297-298)."
  implication: "Root cause (b), primary site. The label is exactly where the tester asked for the hint, is a plain setText, and is layout-adjacent to the field."

- timestamp: 2026-09-20
  checked: "grep for getEmptyText in BbjSettingsComponent.java"
  found: "Three hits — :109 compilerOutputDirectoryField ('Required for \"Compile BBj File\" to run'), :158 configPathField ('{BBj Home}/cfg/config.bbx (default)'), :217 emUrlField. nodeJsField (:113-117) sets none."
  implication: "An empty-text hint convention already exists in this file and the Node.js field is the only path-like field without one. Adding 'Leave empty to auto-detect or download Node.js 22+' is idiomatic here and makes the affordance visible before the user ever configures a bad path."

- timestamp: 2026-09-20
  checked: "bbj-intellij/src/test — BbjLanguageServerSourceGuardTest.java, BbjSettingsComponentSourceGuardTest.java, BbjSettingsFailureStateSourceGuardTest.java, Lsp4ijImportAllowlistTest.java"
  found: "No test asserts notifyUnresolvedNodePath's action count or the 'Configure Node.js Path' literal. No test pins the 'Version too old' string. BbjSettingsFailureStateSourceGuardTest only constrains applyNodeLookup's failed()-before-exists() ordering and forbids the 'Checking Node.js version…' literal inside it. Lsp4ijImportAllowlistTest scopes to com.redhat.devtools.lsp4ij imports only (:35, :38), so a new com.intellij.ide.BrowserUtil import in BbjLanguageServer does not trip it."
  implication: "Both fixes are guard-free. Adding actions and extending label text breaks no existing assertion; new coverage will have to be written rather than adjusted."

- timestamp: 2026-09-20
  checked: "BbjLanguageServer.java:3-8 imports and BbjNodeDownloader.java:87, :171-184"
  found: "BbjLanguageServer already imports com.basis.bbj.intellij.BbjNodeDownloader (:4). downloadNodeAsync(project, onComplete) is public static. On success the downloader already raises its own notification carrying a 'Restart Language Server' action (:178-184) wired to BbjServerService.requestRestart(0)."
  implication: "Wiring Download into the startup popup needs no new dependency and completes the recovery loop end-to-end (download -> offered restart -> server starts) with no manual instruction. Only BrowserUtil is a new import, and only if the install-manually action is included."

## Resolution

<!-- OVERWRITE as understanding evolves -->

root_cause: "Two independent causes, both required (AND-gate fired). (a) POPUP ACTION SET — BbjLanguageServer.notifyUnresolvedNodePath (bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:107-123) constructs the language-server start-failure notification with a single hardcoded NotificationAction(\"Configure Node.js Path\") at line 114 and never consults NodePresentation.bannerActions(resolution). Its call site (line 94) passes only resolution.failureMessage(), discarding the Resolution, so the reason-specific action set is unreachable. The NodePresentation seam built in 96-05/96-06 was wired into the editor banner only; the startup notification predates it and was never rewired, so the popup offers configure-only for every rejection reason — including BELOW_MINIMUM_VERSION, for which NodePresentation already returns all three action ids and NodePresentationTest already pins Download as present; (b) SETTINGS DIALOG HINT — BbjSettingsComponent.applyNodeLookup's below-minimum branch (bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:365-366) sets nodeVersionLabel to only 'Version too old (minimum: 22), detected: <version>', and nodeJsField (same file, lines 113-117) is the sole path-like field in the dialog with no getEmptyText() hint while three siblings have one (lines 109, 158, 217). Nothing in the dialog states that clearing the field re-enables the plugin's automatic detection/download, so the user has no way to discover the recovery the resolver already supports."

fix: "NOT APPLIED — goal was find_root_cause_only. Minimal fix direction, kept lean per the milestone: (a) give notifyUnresolvedNodePath the Resolution instead of just the message, and build its actions by iterating NodePresentation.bannerActions(resolution) with the same three id->action mapping the banner uses in BbjMissingNodeNotificationProvider.java:55-68 (Download -> BbjNodeDownloader.downloadNodeAsync(project, null), already imported at BbjLanguageServer.java:4; Configure -> BbjSettingsConfigurable; Install Manually -> BrowserUtil.browse(\"https://nodejs.org/\")). Optionally take the body from NodePresentation.bannerText(resolution) too, so the popup stops saying 'configure' twice for a too-old runtime. This makes the popup reason-driven from the same single source of truth as the banner and automatically inherits the #588 cache-inaccessible exclusion. (b) Extend BbjSettingsComponent.java:366's label text with the recovery sentence, e.g. \"Version too old (minimum: 22), detected: \" + lookup.version() + \" — clear this field to let the plugin detect or download a suitable Node.js\", which is exactly where the tester asked for it and is a text-only change inside a method already fenced against filesystem/subprocess work. Optionally also add nodeJsField.getEmptyText() (lines 113-117) following the sibling convention, e.g. 'Leave empty to auto-detect or download Node.js 22+', so the affordance is visible before the user configures a bad path. Both halves are guard-free — no existing test pins the popup's action count or the 'Version too old' literal — so new coverage must be written: a plain-JUnit/source-guard assertion that BbjLanguageServer's notification actions come from NodePresentation.bannerActions rather than a literal, plus a source guard on the label text."

verification: "Not performed (diagnose-only). Re-UAT should re-run 96-UAT Test 2 and additionally confirm the open blind spot: whether the editor banner renders with all three actions in the too-old-configured state (a path UAT Test 28 never exercised, since all candidates were blank there)."

files_changed: []
