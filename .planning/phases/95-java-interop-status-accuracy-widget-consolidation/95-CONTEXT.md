# Phase 95: java-interop Status Accuracy & Widget Consolidation - Context

**Gathered:** 2026-09-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The java-interop status the IDE reports is true and cheap — no disposed-project crash, no
perpetual background poll, no "Connected" earned by a bare TCP handshake — and the port default
and status-bar widget shape each have exactly one definition.

Covers IOP-01 (#592), IOP-02 (#593), IOP-03 (#587), IOP-04 (#594), IOP-05 (#620). Files:
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/` — `BbjJavaInteropService.java` (208 lines),
`BbjStatusBarWidget.java` (172), `BbjJavaInteropStatusBarWidget.java` (152), both factories (43
each), `BbjFileVisibility.java` — plus `BbjSettings.java`, `BbjSettingsComponent.java` and
`BbjJavaInteropNotificationProvider.java`, and the source guards that pin them.

**Four corrections to the issue and roadmap text that planning MUST carry:**

1. **#587 and ROADMAP criterion 3 contradict each other, and the ROADMAP wins.** #587's own
   *Proposed approach* and *Acceptance criteria* ask only that the class doc **document** the
   limitation ("a protocol-level identity check would require a java-interop change out of this
   unit's scope"). ROADMAP criterion 3 requires that "a foreign process squatting on the configured
   port does not produce a Connected status." D-01 resolves this in favour of the ROADMAP: a real
   probe is built. **#587's acceptance criteria are recorded as too narrow, not met as written.**
   The premise behind the issue's caution is also false — the backend is an LSP4J `Launcher` whose
   accept loop (`java-interop/src/main/java/bbj/interop/SocketServiceApp.java:35-42`) serves each
   connection independently, so no java-interop change is needed to probe it.

2. **#594's evidence is stale and its constant already half-exists.**
   `BbjInteropPortDetector.DEFAULT_PORT = 5008` (`:36`) is already the shared constant and is
   already consumed by `InteropPortSettings`, `InteropPortPresentation.hint()` and
   `BbjSettingsComponent:52`. The issue's cited lines (`BbjSettings.java:30,107,111,116,150`) no
   longer correspond to the file, and its claim of **three** files carrying the literal is wrong:
   `BbjSettingsConfigurable` carries none — it routes entirely through `InteropPortSettings`. Only
   **two** files still hold a raw literal: `BbjSettings.java:30` and
   `BbjSettingsComponent.java:189,461,466`.

3. **#620's "no `src/test/` source set exists" caveat is obsolete** — the same correction Phase 93
   carried. The suite is at 865 tests, and `BbjStatusBarWidgetSourceGuardTest` already pins both
   widgets by per-file literal counts. Real regression coverage is available; the
   manual-verification fallback in #620's acceptance criteria is moot.

4. **`InteropStatus.CHECKING` is dead code today.** It is never assigned anywhere in
   `BbjJavaInteropService` — the initial value is `DISCONNECTED` and `checkConnection()` produces
   only `CONNECTED`, `DISCONNECTED`, or the previous value. Yet
   `BbjJavaInteropNotificationProvider:42-45` special-cases it and the widget renders it. D-09
   makes it live rather than leaving an unreachable branch for the new widget base to map.

**Cross-phase consequence:** D-05 edits `BbjJavaInteropNotificationProvider`, one of the **three**
editor notification providers Phase 96's PLAT-03 (#622) consolidates onto a shared base. ROADMAP's
claim that Phase 96 is "file-disjoint from Phases 93-95" **becomes false**, and PLAT-03's base must
carry whatever shape this phase leaves behind. Flag this at Phase 96 discussion.

</domain>

<decisions>
## Implementation Decisions

### Peer confirmation (IOP-03, #587)

- **D-01:** The bare TCP connect in `checkConnection()` is replaced by a **real LSP4J JSON-RPC
  request from the IntelliJ side**, making ROADMAP criterion 3 literally true. Chosen over the
  document-only reading of #587, and over adding a `bbj/javaInteropStatus` request to the shared
  language server. The language-server option was rejected on a concrete wrinkle, not on cost: the
  LS connects **lazily** on the first Java lookup, so its three-state breaker
  (`java-interop.ts:171-177`) reads `closed` before any lookup has happened — breaker state is not
  the same question as "is the port reachable now", so that route would need a new reachability
  signal designed on the server side anyway. Feasibility confirmed: LSP4J is already on the plugin
  classpath and already used in main code (`BbjComposerServer.java:28`,
  `BbjLanguageClient.java:16`), and `Lsp4ijImportAllowlistTest` guards only
  `com.redhat.devtools.lsp4ij`, so `org.eclipse.lsp4j` adds no allowlist churn.
  — **Reversibility:** costly — the plugin gains a second, small interop client plus its guards;
  undoing it means restoring the TCP-only probe and re-pointing whatever pins the new one.

- **D-02:** The probe sends **`getTopLevelPackages` and requires a valid result** as confirmation.
  Chosen because it exists in **both** backends — `java-interop/` and the production `bbj-ls` — and
  is genuinely cheap: it calls `Package.getPackages()` and never touches `getClassPath()`, so it
  needs no prior `loadClasspath` and triggers no classpath scan. Rejected alternatives: an unknown
  method accepting a well-formed `MethodNotFound` error (proves only "speaks JSON-RPC", so any
  LSP4J service on the port would pass), and accepting any well-formed reply (same weakness).
  Per-connection cost on the backend is confirmed negligible — `startJsonRpc` constructs a fresh
  `InteropService` whose only field initializer is `new BbjClassLoader(new URL[]{}, …)` with a lazy
  null `classPath` — so the probe may reconnect per tick rather than holding a connection open.

- **D-03:** **Split timeout budget:** the existing 1s connect ceiling is kept, and the JSON-RPC
  reply gets its own **~2s** timeout, so one tick's worst case stays well inside the 5s interval.
  This is what distinguishes "port refused the connection" from "port accepted but never answered"
  — the squatter case IOP-03 exists for. The existing 2s `GRACE_PERIOD_MS` logic is **unchanged**.

- **D-04:** A peer that accepts the connection but fails confirmation is a **distinct user-visible
  state**: its own status text and tooltip, **reusing the existing `INTEROP_DISCONNECTED` icon**.
  No new SVG assets — only `INTEROP_CONNECTED` and `INTEROP_DISCONNECTED` exist (`BbjIcons:12-13`)
  and a third state would need both light and dark variants. The text and tooltip are produced by a
  **platform-free presentation seam modelled on `ConfigReloadPresentation`** (plain statics, plain
  arguments, no `com.intellij` import, driven by plain JUnit).

- **D-05:** The editor banner's sentence **varies by reason through that same seam**. Today
  `BbjJavaInteropNotificationProvider:41-50` shows one fixed string — *"Start BBjServices for Java
  completions"* — for every non-Connected, non-Checking status, which is actively wrong for a
  squatter: BBjServices **is** running; it is the thing holding the port. See the cross-phase
  consequence in `<domain>`.
  — **Reversibility:** reversible — one provider and one seam method.

### Poll gating and paused status (IOP-02, #593)

- **D-06:** The 5-second re-arm is gated on **whether a BBj file is currently selected**, via the
  existing `BbjFileVisibility.showsForSelection` predicate — package-private in the same `ui`
  package, so `BbjJavaInteropService` can call it directly, and the same decision the widgets
  already use (v4.3 RESP-09). **Window focus is deliberately NOT used**, though #593 offers it: the
  plugin uses no focus or activation API anywhere in `src/main/java` today — no
  `ApplicationActivationListener`, `IdeFrame`, `WindowManager`, `PowerSaveMode` or `IdeEventQueue`
  — so focus gating would introduce a brand-new platform coupling and a second event source that
  can race with editor selection. **Accepted cost:** an IDE left open on a BBj file overnight still
  polls.

- **D-07:** While the poll is paused, the service **freezes the last known status and broadcasts
  nothing** — pausing changes no state and fires no listener. Rejected: reporting `DISCONNECTED`
  while paused (untrue, and because the banner shows for any non-Connected, non-Checking status it
  would raise "Start BBjServices" purely because the user switched to a non-BBj tab), and reporting
  `CHECKING` while paused (overloads a state that means "a check is in flight" with "no check is
  running"). This is safe **only** in combination with D-08.

- **D-08:** Gate-open — a BBj file becoming selected, or the server reaching `started` — fires an
  **immediate check**, then resumes the 5s cadence. This also closes a blind window that exists
  today: `startChecking()` → `scheduleNextCheck()` → `addRequest(…, 5000)` schedules even the
  **first** check 5s out, so the status bar shows an initial or stale value for five seconds every
  time.
  — **Research item for planning:** the poll runs on a `POOLED_THREAD` `Alarm`, so the gate should
  most likely read a volatile flag updated from the editor-selection event rather than calling
  `FileEditorManager.getSelectedFiles()` off the EDT. Confirm the threading contract before
  choosing.

- **D-09:** **`InteropStatus.CHECKING` is put to use** for the in-flight probe, rather than deleted
  or left dead. It now means something real — the JSON-RPC probe has a measurable 1s+2s duration
  where the old TCP connect was near-instantaneous — and the banner's existing CHECKING suppression
  (`BbjJavaInteropNotificationProvider:42-45`) finally does what it was written for. **UAT must
  confirm the extra visible transition per tick does not read as flicker.**

- **D-10:** **Verification shape: a plain-Java decision seam under JUnit, plus source guards and
  hand UAT.** The "should the poll re-arm?" and "which status does this probe outcome mean?"
  decisions are extracted into `com.intellij`-free classes driven directly by plain JUnit — the
  `RestartGate` / `ExpectedStopGuard` / `NodeAvailability` / `BackendNoticePolicy` /
  `SetoptsInCodeActionAvailability` convention already established in this tree, whose own docs
  cite keeping the LSP4IJ import allowlist untouched as the reason. **`BbjJavaInteropService` has
  zero test coverage today** — only two source guards reference it — so this is its first.

### Port constant (IOP-04, #594)

- **D-11:** **`BbjInteropPortDetector.DEFAULT_PORT` is the canonical constant.** No
  `BbjSettings.DEFAULT_JAVA_INTEROP_PORT` is introduced, despite #594's literal wording. Reasons:
  it is already the de facto shared constant with three consumers, and it is deliberately
  `com.intellij`-free so the platform-free classes (`InteropPortSettings`,
  `InteropPortPresentation`) can reference it — moving the canonical constant onto `BbjSettings`
  would point those plain-JUnit-tested classes at a `PersistentStateComponent`, and adding a second
  constant would recreate the exact drift #594 complains about. The surviving literals at
  `BbjSettings.java:30` and `BbjSettingsComponent.java:189,461,466` are re-pointed at it.
  **The value 5008 must not change** — `InteropPortSettings.migratedAutoDetect` keys its one-time
  upgrade inference on `savedPort == DEFAULT_PORT`, and IntelliJ's serializer omits a field equal to
  its Java default. **Close #594 as done with this reasoning**, per the Phase 93 D-05 and Phase 94
  D-05 precedent, not as partially implemented.

- **D-12:** A **source-guard assertion pins the single occurrence** — the literal `5008` appears
  exactly once in `src/main/java` after comment-stripping — so a later hand-edit cannot silently
  reintroduce the drift. Comment-stripping is **required**, not optional: `BbjInteropPortDetector:28`
  and `InteropPortSettings:32,49,53` all mention 5008 in prose and would otherwise trip the count.
  `EffectiveInteropPortSourceGuardTest` already carries a `stripComments()` helper to copy (per
  Phase 93 D-12, each guard keeps its own private copy).

### Widget base (IOP-05, #620)

- **D-13:** The consolidation ships as an **abstract generic base plus two thin subclasses** —
  `BbjStatusBarWidgetBase<S>` holding the panel, both labels, the `MouseAdapter` wiring, the
  `messageBusConnection` lifecycle, the `FILE_EDITOR_MANAGER` subscription, `updateVisibility()`
  and `dispose()`; subclasses supply the `Topic`, the status→icon/text mapping and their popup
  items as abstract hooks. This follows the Phase 93 D-05/D-06 precedent and keeps every difference
  compile-time checked. Rejected: one concrete class parameterized at construction (#620's literal
  "parameterized by Topic type and icon/text mapping function") — Phase 93 rejected that
  data-driven shape twice because it turns a wiring mistake into a runtime no-op instead of a
  compile error, and here the two status enums are unrelated types. `plugin.xml:277-284` registers
  both factories by `implementation=` at concrete classes, so **the registrations are unchanged**.
  — **Reversibility:** costly — undo touches both widgets, both factories and the re-pointed guard.

- **D-14:** **Tooltip rendering is a base responsibility** via an abstract hook, ending the current
  asymmetry where only `BbjStatusBarWidget:108-110` sets one. D-04 already commits the interop
  widget to carrying a wrong-peer tooltip, so the asymmetry has to end regardless.
  `BbjStatusBarWidget`'s existing `ConfigReloadPresentation.widgetTooltip(text, reasonLabel)` call
  becomes its hook implementation. **Observable change — call out at UAT as intended:** the Java
  widget gains a tooltip it has never had. Do not report this phase as no-observable-delta.

- **D-15:** The shared "Open Settings" popup item **unifies on
  `showSettingsDialog(project, BbjSettingsConfigurable.class)`**. The two widgets differ today —
  `BbjStatusBarWidget:134` passes the display-name string `"BBj"`, `BbjJavaInteropStatusBarWidget:124`
  passes the class. Both reach the same page (`plugin.xml` declares `displayName="BBj"` on that
  configurable), but the class form is exact and cannot break if the display name changes.
  No observable behaviour change.

- **D-16:** The broken guards are re-pointed under **Phase 93's D-11/D-12**, not rewritten.
  `BbjStatusBarWidgetSourceGuardTest` asserts per-**file** counts in each widget (exactly 1
  `FileEditorManagerListener.FILE_EDITOR_MANAGER`, 2 `messageBusConnection.subscribe(`, 1
  `selectionChanged(`, 1 `BbjFileVisibility.showsForSelection(`, 1
  `messageBusConnection.disconnect()`); all of these move to the base. Re-point by asserting each
  pin **exactly once inside the base's extracted method body**, keeping a **delegation pin per
  subclass**, and keeping the negative assertions (`getExtension(`, `"bbl"`) **sweeping both
  subclass files at full breadth**. Separately, `Lsp4ijImportAllowlistTest`'s hand-written map
  needs editing if `ServerStatus` moves to the base — it currently lists
  `ui/BbjStatusBarWidget.java → {ServerStatus}` and has no entry for
  `BbjJavaInteropStatusBarWidget` (which imports no vendor symbol).

### Disposal guard (IOP-01, #592)

- **D-17:** `checkConnection()` and `broadcastStatus()`'s `invokeLater` lambda both gain
  `if (project.isDisposed()) return;`, mirroring `BbjServerService`'s established pattern
  (`:132`, `:166`, `:184`, `:199`) verbatim. The issue's analysis is correct and confirmed:
  `dispose()` (`:204-207`) only calls `checkAlarm.cancelAllRequests()`, which cancels
  queued-but-not-yet-running requests, **not one already executing**. **D-01 and D-03 widen the
  in-flight window from a ~1s connect to a ~3s connect-plus-request**, making this guard more
  necessary than when the issue was filed, not less — sequence IOP-01 accordingly.

### Claude's Discretion

- Names and packages of every new class: the widget base, the factory base, the probe client, the
  presentation seam, and the poll-gate / status-classification seam — including whether the gate
  decision and the status classification are one plain-Java class or two.
- Exact wording of the wrong-peer status text, its tooltip, and the reason-varying banner sentences,
  within D-04's and D-05's meaning.
- The exact response-timeout number, within D-03's constraint that one tick's worst case stays
  comfortably inside the 5s poll interval and the 2s grace period keeps working unchanged.
- Names of the new and re-pointed guard tests, and whether D-12's single-occurrence assertion lives
  in a new guard or extends `EffectiveInteropPortSourceGuardTest`.
- Javadoc wording throughout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and requirement definition
- `.planning/ROADMAP.md` — Phase 95 goal, the five success criteria, and the ordering note. Read
  with the `<domain>` corrections in mind: criterion 3 **overrides** #587's own acceptance criteria
  (D-01), and Phase 96's "file-disjoint" claim is invalidated by D-05.
- `.planning/REQUIREMENTS.md` — IOP-01..IOP-05 statements (`:37-41`) and the v4.4 subsystem grouping
- `.planning/STATE.md` — Active Constraints, and the standing Phase 79/80 and 92 decisions this
  phase must preserve
- `.planning/phases/93-composer-robustness-consolidation/93-CONTEXT.md` — D-05/D-06 (base + thin
  subclasses over data-driven registration), D-11 (base-aware guard re-pointing), D-12 (per-guard
  private helpers) — the precedents D-13 and D-16 adopt
- `.planning/phases/94-em-login-run-action-consolidation/94-CONTEXT.md` — D-05, the precedent for
  closing a requirement on cited reasoning rather than as written (D-11 follows it)

### Code the decisions bind to
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` — the whole
  file; `checkConnection():117-162`, `broadcastStatus():177-186`, `scheduleNextCheck():109-111`,
  `startChecking():93-96`, `dispose():204-207`, the `InteropStatus` enum `:34-38`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — `updateStatus()`'s
  disposal-guard pattern at `:132,166,184,199`, the model D-17 mirrors
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` and
  `.../BbjJavaInteropStatusBarWidget.java` — the pair D-13 consolidates; note `:108-110` (tooltip,
  D-14) and `:134` vs `:124` (settings call, D-15)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java` and
  `.../BbjJavaInteropStatusBarWidgetFactory.java` — 43 lines each, differing in 5
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` — the
  package-private predicate D-06 reuses for gating and D-13's base keeps for visibility
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java` —
  `:41-50`, the fixed banner text D-05 replaces; also a Phase 96 PLAT-03 file
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortDetector.java` — `DEFAULT_PORT`
  at `:36`, the canonical constant (D-11); prose mention of 5008 at `:28` (D-12)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortSettings.java` — the pure decision
  functions; prose mentions of 5008 at `:32,49,53` (D-12)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:30` and
  `.../BbjSettingsComponent.java:189,461,466` — the only two files still holding a raw literal
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` — the
  platform-free presentation-seam convention D-04/D-05 follow, and `widgetTooltip()` which D-14
  keeps
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/` — `Scheduler.java`,
  `AlarmScheduler.java`, `RestartGate.java`, `ExpectedStopGuard.java`: the seam and gate
  conventions D-10 follows
- `bbj-intellij/src/main/resources/META-INF/plugin.xml:253-284` — the four
  `<editorNotificationProvider>` entries, the `<projectService>` for `BbjJavaInteropService`, and
  the two `<statusBarWidgetFactory>` registrations (unchanged by D-13)

### The interop wire protocol (for D-01/D-02)
- `java-interop/src/main/java/bbj/interop/SocketServiceApp.java:31-49` — the LSP4J `Launcher` over
  an `AsynchronousServerSocketChannel`; the `while(true) { accept(); startJsonRpc(); }` loop that
  makes a probe connection safe
- `java-interop/src/main/java/bbj/interop/InteropService.java:49-51,64-74` — the cheap
  per-connection construction, and `getTopLevelPackages()`'s body
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java` — **the production
  backend** (per project memory: protocol/DTO changes go there). Confirms `getTopLevelPackages`,
  `getClassInfos`, `getClassInfo` and `loadClasspath` exist in both, while `getAllClassNames`
  exists only here — the drift that steered D-02
- `bbj-vscode/src/language/java-interop.ts:360-400,1256-1278` — how the language server frames the
  same connection, and the `RequestType` names

### Test contracts that constrain the work
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` —
  the per-file assertions D-16 re-points; `:64-81` and `:85-94`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java`
  — `:95-106` pins exactly one `getEffectiveJavaInteropPort()` and one `state.javaInteropHost` in
  `BbjJavaInteropService`; **rewriting `checkConnection()` must preserve both counts**. Its
  `stripComments()` at `:69-72` is the helper D-12 copies.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java:43-62` —
  the hand-written 12-file map D-16 may need to edit
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java`,
  `.../InteropPortSettingsTest.java`, `.../BbjInteropPortDetectorTest.java`,
  `.../InteropPortPresentationTest.java` — the existing plain-JUnit coverage that must keep passing

### GitHub issues
- #592 (IOP-01), #593 (IOP-02), #587 (IOP-03), #594 (IOP-04), #620 (IOP-05) — all on milestone #7,
  all labelled PRIO 3. Read them against the four corrections in `<domain>`: #587's acceptance
  criteria are deliberately exceeded, #594's evidence and file count are stale, and #620's
  no-test-source-set caveat is obsolete.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BbjFileVisibility.showsForSelection(VirtualFile[])` — package-private in `ui`, already the
  widgets' visibility decision. D-06 reuses it as the poll gate; D-13's base keeps it as the
  visibility decision. Reads `getFileType().getName()`, never the extension (v4.3 RESP-09).
- `ConfigReloadPresentation` — the platform-free presentation seam (plain statics, plain args, no
  `com.intellij`), including `widgetTooltip(statusText, reasonLabel)`. The model for D-04/D-05's
  new seam and the implementation behind D-14's hook for the BBj widget.
- `Scheduler` / `AlarmScheduler` — the existing time-scheduling seam whose doc already names
  `BbjJavaInteropService.checkAlarm` as one of the two `Alarm(POOLED_THREAD, parent)` idioms it
  abstracts. The natural route to making D-08's immediate-check-then-cadence testable.
- `RestartGate`, `ExpectedStopGuard`, `RefreshInFlightGuard`, `DownloadGuard`, `NodeAvailability`,
  `BackendNoticePolicy`, `SetoptsInCodeActionAvailability` — seven existing plain-Java decision
  seams. D-10's gate and status-classification classes follow them.
- `BbjInteropPortDetector` / `InteropPortSettings` / `InteropPortPresentation` — an already-clean,
  already-tested, `com.intellij`-free port trio. D-11 extends rather than replaces it.
- `BbjRunActionBase` + thin subclasses, and Phase 93's four new bases — the structural model for
  D-13.

### Established Patterns
- **Blocking work stays off the EDT** behind the pooled-thread `Alarm`/`Scheduler` seam (Phase 79
  EDT-01). The ROADMAP's ordering note calls this out explicitly for IOP-03: the peer confirmation
  must not reintroduce a blocking probe on the EDT. The probe already runs on `POOLED_THREAD`.
- **Plain-Java seams carry no `com.intellij` import** so plain JUnit can reach them — and
  `ExpectedStopGuard`'s own javadoc adds the second reason: it keeps the LSP4IJ import allowlist
  untouched. D-04, D-10 and D-12 all apply this.
- **Source guards pin IDE-only wiring by literal counts**, with comments stripped before every
  count-based assertion, each guard owning private copies of its helpers (Phase 93 D-12).
- **The server owns validation; the host renders its verdict** — note this phase is the deliberate
  exception: D-01 puts a protocol probe on the IntelliJ side rather than in the language server,
  with the lazy-connection wrinkle recorded as the reason.

### Integration Points
- `BbjJavaInteropService` is a `<projectService>` (`plugin.xml:271`) implementing `Disposable`,
  constructed with a `MessageBusConnection` to `BbjServerStatusListener.TOPIC` and an
  `Alarm(POOLED_THREAD, this)`. It is the single producer of `BbjJavaInteropStatusListener.TOPIC`.
- Three consumers read interop status: the interop status-bar widget (via the topic),
  `BbjJavaInteropNotificationProvider` (via `getCurrentStatus()` **and**
  `isFirstCheckCompleted()`), and — after D-04 — the widget's tooltip. Any new state must be
  correct for all three.
- `FileEditorManagerListener.FILE_EDITOR_MANAGER` is subscribed in exactly two files today, both
  widgets. D-06 adds the service as a third consumer of selection changes (or D-13's base
  centralises it).
- The two `<statusBarWidgetFactory>` entries register concrete factory classes by
  `implementation=`, so D-13's subclassing needs no `plugin.xml` change.

</code_context>

<specifics>
## Specific Ideas

- **The user chose the more rigorous option at every branch** — a real protocol probe over
  documenting the limitation, a strict valid-result check over accepting any well-formed reply, a
  durable source guard over a one-time cleanup, and a live `CHECKING` state over deleting dead
  code. Planning should not quietly soften any of these back toward the issues' literal wording.
- **IOP-03 has a live reproduction on the maintainer's own machine.** Per project memory,
  BBjServices squats on port 5008 without speaking the interop protocol — which is exactly the
  squatter case D-01/D-04 address. That machine is the natural UAT fixture for criterion 3: today
  it shows "Java: Connected"; after this phase it must show the wrong-peer state, and the banner
  must stop telling the user to start a service that is already running.
- **UAT must cover both widgets and all the status transitions**, because D-13/D-14 touch every
  rendering path: BBj widget and Java widget shown together on a `.bbj` file; both hidden on a
  `BBx Config` file and on a non-BBj tab (the v4.3 RESP-09 behaviour, hidden on the click itself);
  both popup menus and every item in them; the new Java-widget tooltip; the `CHECKING` transition
  not reading as flicker; and the interop banner in all three of its cases — service down, wrong
  peer, connected.
- **Two intended observable changes to declare at UAT, never as no-observable-delta:** the Java
  status-bar widget gains a tooltip (D-14), and a squatting peer now reports the wrong-peer state
  with a different banner sentence instead of "Connected" (D-01/D-04/D-05).

</specifics>

<deferred>
## Deferred Ideas

- **Window-focus / idle gating for the poll** — rejected in D-06 only because the plugin has no
  focus-API coupling today and editor selection already covers the common case. If the overnight
  poll on an open BBj file ever proves to matter, `ApplicationActivationListener` is the route, and
  it would compose with D-06 rather than replace it.
- **`bbj/javaInteropStatus` as a shared language-server request** — rejected in D-01 because the
  LS's connection is lazy, so its breaker state is not a reachability signal without new server-side
  work. Worth revisiting if VS Code ever grows an interop status indicator, at which point the
  duplicate-probe architecture becomes the real problem to solve rather than an IntelliJ-local one.
- **The plugin probing java-interop at all is architecturally duplicative** — the class doc at
  `BbjJavaInteropService.java:19-27` explains it as a workaround for the LS exposing no status.
  D-01 improves the accuracy of the workaround without removing it.
- **Unifying `BbjJavaInteropService`'s `Alarm` onto the `Scheduler` seam** — `AlarmScheduler`'s own
  javadoc names `BbjJavaInteropService.checkAlarm` as one of the two idioms it was built to
  abstract, but the service still uses a raw `Alarm`. D-10 may pull this in naturally; if it does
  not, it stays a small, separate cleanup.
- **Phase 96 PLAT-03 must absorb whatever D-05 leaves in
  `BbjJavaInteropNotificationProvider`** — recorded in `<domain>`; confirm at Phase 96 discussion
  that its "file-disjoint" premise is corrected.

### Reviewed Todos (not folded)

`todo.match-phase 95` returned four keyword matches — the same four Phases 93 and 94 each reviewed
and rejected. None belong to this phase:
- `2026-09-06-configured-node-path-suppresses-cached-download-fallback` — is **PLAT-05, Phase 96**
- `2026-09-06-live-windows-check-for-node-auto-install-failure` — is **PLAT-06, Phase 96**
- `2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version` — fixed 2026-09-06;
  needs close-out, not work
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend` — environment drift in the
  local vitest baseline, not IntelliJ work. **Newly adjacent though:** the backend method-set drift
  it describes (`getAllClassNames` in `bbj-ls` but not in `java-interop/`) is precisely why D-02
  selects `getTopLevelPackages`. Related evidence, not folded scope.

</deferred>

---

*Phase: 95-java-interop Status Accuracy & Widget Consolidation*
*Context gathered: 2026-09-19*
