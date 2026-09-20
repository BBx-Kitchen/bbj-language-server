# Phase 95: java-interop Status Accuracy & Widget Consolidation - Research

**Researched:** 2026-09-19
**Domain:** IntelliJ plugin (Kotlin/Java, `bbj-intellij/`) — status-bar UI, project-level services, LSP4J JSON-RPC client, plain-Java decision seams
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Peer confirmation (IOP-03, #587)**
- D-01: `checkConnection()`'s bare TCP connect is replaced by a real LSP4J JSON-RPC request from the IntelliJ side. LS-side `bbj/javaInteropStatus` request rejected (LS connects lazily; breaker state != reachability). LSP4J already on the plugin classpath and used in main code; `Lsp4ijImportAllowlistTest` guards only `com.redhat.devtools.lsp4ij`, so `org.eclipse.lsp4j` adds no allowlist churn. Reversibility: costly.
- D-02: The probe sends `getTopLevelPackages` and requires a valid result — exists in both backends, cheap (`Package.getPackages()`, never touches `getClassPath()`), no prior `loadClasspath` needed. Rejected: an unknown-method/`MethodNotFound` probe or "any well-formed reply" (both only prove "speaks JSON-RPC"). Per-connection backend cost confirmed negligible for `java-interop/`; probe may reconnect per tick.
- D-03: Split timeout budget — existing 1s connect ceiling kept; JSON-RPC reply gets its own ~2s timeout (exact number is Claude's discretion, within: one tick's worst case stays well inside the 5s interval). Existing 2s `GRACE_PERIOD_MS` unchanged.
- D-04: A peer that accepts the connection but fails confirmation is a distinct user-visible state — its own text/tooltip, reusing the existing `INTEROP_DISCONNECTED` icon (no new SVG assets). Text/tooltip via a platform-free presentation seam modelled on `ConfigReloadPresentation`.
- D-05: The editor banner's sentence varies by reason through that same seam (today one fixed string for every non-Connected, non-Checking status). Reversibility: reversible.

**Poll gating and paused status (IOP-02, #593)**
- D-06: The 5s re-arm is gated on whether a BBj file is currently selected, via `BbjFileVisibility.showsForSelection`. Window focus deliberately NOT used (no focus/activation API anywhere in `src/main/java` today). Accepted cost: an IDE left open on a BBj file overnight still polls.
- D-07: While paused, the service freezes the last known status and broadcasts nothing — no state change, no listener fire. Rejected: reporting DISCONNECTED (untrue, triggers the banner) or CHECKING (overloads the meaning) while paused. Safe only combined with D-08.
- D-08: Gate-open (BBj file selected, or server reaches `started`) fires an immediate check, then resumes the 5s cadence — also closes today's blind window where even the first check is scheduled 5s out. **Research item:** confirm whether the poll gate is safe to read from a `POOLED_THREAD` `Alarm` callback, or must read a volatile flag updated from the EDT selection event.
- D-09: `InteropStatus.CHECKING` is put to use for the in-flight probe rather than deleted. UAT must confirm the extra visible transition per tick does not read as flicker.
- D-10: Verification shape — plain-Java decision seam under JUnit, plus source guards and hand UAT, following the `RestartGate`/`ExpectedStopGuard`/`NodeAvailability`/`BackendNoticePolicy`/`SetoptsInCodeActionAvailability` convention. `BbjJavaInteropService` has zero test coverage today (only two source guards reference it) — this is its first.

**Port constant (IOP-04, #594)**
- D-11: `BbjInteropPortDetector.DEFAULT_PORT` is the canonical constant. No `BbjSettings.DEFAULT_JAVA_INTEROP_PORT` introduced. Already de facto shared with three consumers; deliberately `com.intellij`-free. The value 5008 must not change (`InteropPortSettings.migratedAutoDetect` keys its upgrade inference on `savedPort == DEFAULT_PORT`; IntelliJ's serializer omits a field equal to its Java default). Surviving literals at `BbjSettings.java:30` and `BbjSettingsComponent.java:189,461,466` are re-pointed. Close #594 as done with this reasoning, not partially implemented.
- D-12: A source-guard assertion pins the single occurrence of literal `5008` in `src/main/java` after comment-stripping. Comment-stripping is required — `BbjInteropPortDetector:28` and `InteropPortSettings:32,49,53` mention 5008 in prose. `EffectiveInteropPortSourceGuardTest`'s `stripComments()` helper is the one to copy (each guard keeps its own private copy, per Phase 93 D-12).

**Widget base (IOP-05, #620)**
- D-13: Ships as an abstract generic base `BbjStatusBarWidgetBase<S>` (panel, both labels, `MouseAdapter`, `messageBusConnection` lifecycle, `FILE_EDITOR_MANAGER` subscription, `updateVisibility()`, `dispose()`) plus two thin subclasses supplying `Topic`, status→icon/text mapping, and popup items as abstract hooks. Rejected: one concrete class parameterized at construction (turns a wiring mistake into a runtime no-op, not a compile error). `plugin.xml:277-284` registrations unchanged. Reversibility: costly.
- D-14: Tooltip rendering becomes a base responsibility via an abstract hook, ending today's asymmetry (only `BbjStatusBarWidget:108-110` sets one). **Observable change — call out at UAT as intended:** the Java widget gains a tooltip it never had.
- D-15: The shared "Open Settings" popup item unifies on `showSettingsDialog(project, BbjSettingsConfigurable.class)` (the exact-class form, not the `"BBj"` display-name string). No observable behaviour change.
- D-16: Broken guards are re-pointed under Phase 93's D-11/D-12 pattern, not rewritten. `BbjStatusBarWidgetSourceGuardTest`'s per-file counts move to per-extracted-method-body-in-the-base counts, plus a delegation pin per subclass, keeping negative assertions sweeping both subclass files at full breadth. `Lsp4ijImportAllowlistTest`'s hand-written map needs editing if `ServerStatus` moves to the base.

**Disposal guard (IOP-01, #592)**
- D-17: `checkConnection()` and `broadcastStatus()`'s `invokeLater` lambda both gain `if (project.isDisposed()) return;`, mirroring `BbjServerService`'s pattern verbatim. D-01 and D-03 widen the in-flight window from a ~1s connect to a ~3s connect-plus-request, making this guard more necessary, not less — sequence IOP-01 accordingly (first).

### Claude's Discretion
- Names and packages of every new class: the widget base, the factory base, the probe client, the presentation seam, and the poll-gate/status-classification seam — including whether the gate decision and the status classification are one plain-Java class or two.
- Exact wording of the wrong-peer status text, its tooltip, and the reason-varying banner sentences, within D-04's and D-05's meaning.
- The exact response-timeout number, within D-03's constraint that one tick's worst case stays comfortably inside the 5s poll interval and the 2s grace period keeps working unchanged.
- Names of the new and re-pointed guard tests, and whether D-12's single-occurrence assertion lives in a new guard or extends `EffectiveInteropPortSourceGuardTest`.
- Javadoc wording throughout.

### Deferred Ideas (OUT OF SCOPE)
- Window-focus / idle gating for the poll (would compose with D-06 if ever needed via `ApplicationActivationListener`).
- `bbj/javaInteropStatus` as a shared language-server request (revisit if VS Code ever grows its own interop indicator).
- The plugin probing java-interop at all is architecturally duplicative — D-01 improves accuracy of the workaround without removing it.
- Unifying `BbjJavaInteropService`'s `Alarm` onto the `Scheduler` seam — may happen naturally via D-10, otherwise stays separate.
- Phase 96 PLAT-03 must absorb whatever D-05 leaves in `BbjJavaInteropNotificationProvider` (confirm at Phase 96 discussion — the ROADMAP's "file-disjoint" claim for Phase 96 is now false).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOP-01 (#592) | In-flight health check never touches `project.getMessageBus()`/`EditorNotifications` on a disposed project | Confirmed exact guard pattern and line numbers in `BbjServerService.updateStatus()`; confirmed the two unguarded sites in `BbjJavaInteropService` |
| IOP-02 (#593) | Poll stops re-arming with no BBj file open; resumes on refocus | Confirmed `BbjFileVisibility.showsForSelection`, confirmed `checkAlarm` is a `POOLED_THREAD` `Alarm`, confirmed the `Scheduler`/`ManualScheduler` plain-Java test seam already exists and is reusable |
| IOP-03 (#587) | "Connected" requires a confirmed java-interop peer, not a bare TCP handshake | Verified the LSP4J `Launcher`/`Launcher.Builder` client-construction pattern against both backends' own server-side use of the identical API; verified `getTopLevelPackages()` is cheap and exists in both `java-interop/` and `bbj-ls`; verified concurrent-connection handling in both backends |
| IOP-04 (#594) | One named constant for the java-interop port default | Verified `BbjInteropPortDetector.DEFAULT_PORT` is already the sole canonical constant with three consumers; verified the exact surviving literal sites (found a 4th, prose-only, site CONTEXT.md did not enumerate) |
| IOP-05 (#620) | Two status-bar widgets and factories share one base | Read both widgets, both factories, and `BbjStatusBarWidgetSourceGuardTest` in full; confirmed every structural difference D-13-D-15 name |
</phase_requirements>

## Summary

This phase touches a small, already well-instrumented corner of the IntelliJ plugin: one project
service (`BbjJavaInteropService`), two status-bar widgets + factories, one editor notification
provider, and the java-interop port constant trio (`BbjInteropPortDetector` /
`InteropPortSettings` / `InteropPortPresentation`). Every one of CONTEXT.md's 17 decisions was
checked directly against the current source during this research pass, and every checked claim
held — including exact line numbers — with one exception detailed below (a 4th, previously
unlisted, prose-only `5008` literal in `BbjSettingsComponent.java:195`).

The centerpiece and only genuinely new pattern in this phase is IOP-03's peer confirmation: a
short-lived `org.eclipse.lsp4j.jsonrpc.Launcher` client connection from the plugin to the
java-interop TCP port, issuing `getTopLevelPackages()` and requiring a valid reply. No code in
`bbj-intellij` constructs a raw LSP4J `Launcher` today (the plugin's only two LSP4J touchpoints —
`BbjComposerServer` and `BbjLanguageClient` — ride LSP4IJ's own managed connection to the language
server, not a plugin-built one). This research locates the exact analog to copy: the production
`bbj-ls` backend's own client-construction code (`LanguageService.run()`, lines 88-92) builds a
`Launcher` with `Launcher.Builder<>().setLocalService(...).setRemoteInterface(...).setInput(...)
.setOutput(...).setExecutorService(...).create()` — the identical API the plugin-side probe needs,
just with the client/server roles reversed. The classes (`Launcher`, `Launcher.Builder`,
`StandardLauncher`) are confirmed present in the exact jar (`org.eclipse.lsp4j.jsonrpc-1.0.0.jar`)
that already resolves onto `bbj-intellij`'s compile classpath transitively through
`plugin("com.redhat.devtools.lsp4ij:0.21.0")` — no new Gradle dependency line is needed.

The single biggest finding beyond what CONTEXT.md already established: the "open risk" CONTEXT.md
flagged — whether `bbj-ls`'s production `LanguageService` accept loop serves connections
independently the way the dev-copy `SocketServiceApp` demonstrably does — is now **resolved, not
open**. Reading `bbj-ls/src/main/java/bbj/interop/LanguageService.java` directly shows it accepts
one connection at a time but constructs a fresh `InteropService` + `Launcher` per connection and
dispatches both accept-loop continuation and per-connection JSON-RPC handling through a shared
`Executors.newCachedThreadPool()`, so the probe's reconnect-per-tick design is safe against the
real production backend, not just the dev one. One new caveat did surface, however: the production
`InteropService`'s constructor calls into BBjServices' own internal classloader machinery
(`getSSCP(DEFAULT_SSCP)` → `InternalClassLoader.getExternalClassLoader(...)`) rather than the
trivial field initializer the dev backend uses — this construction cost was not measured in this
research pass and should be treated as `[ASSUMED]` cheap, not `[VERIFIED]` cheap, for the
production backend specifically.

**Primary recommendation:** Build the peer-confirmation probe as a small, `com.intellij`-free
class constructed exactly like `bbj-ls`'s own `Launcher.Builder` usage, reachable by a plain
`java.net.Socket`, driven off the existing `POOLED_THREAD` `Alarm`/`Scheduler` seam so it never
blocks the EDT, and give it a real automated test: a throwaway local `ServerSocket` in a plain
JUnit test can stand in for both the "real java-interop peer" case (serve the same
`getTopLevelPackages` JSON-RPC handshake via a throwaway `Launcher.Builder` server, mirroring
`SocketServiceApp`) and the "squatter" case (accept the connection and either stay silent or reply
with garbage) — this closes the largest testability gap in the phase without any IntelliJ platform
dependency.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| java-interop peer confirmation (IOP-03) | IntelliJ plugin (client, `ui`/new package) | — | D-01 deliberately keeps this IntelliJ-local; the shared language server's lazy-connect breaker state is not a reachability signal (rejected LS-side alternative) |
| Poll gating / cadence (IOP-02) | IntelliJ plugin (project service) | Editor tier (`FileEditorManagerListener`) | Decision is local UI-polling policy; the editor-selection event is the trigger, read via the existing `BbjFileVisibility` predicate |
| Status-bar rendering (IOP-05) | IntelliJ plugin (status-bar widget) | — | `CustomStatusBarWidget`/`StatusBarWidgetFactory` are IDE-tier extension points; `plugin.xml` registrations are unchanged |
| Port default constant (IOP-04) | IntelliJ plugin (`com.intellij`-free settings layer) | — | `BbjInteropPortDetector` is deliberately platform-free so `InteropPortSettings`/`InteropPortPresentation` can reference it without pulling in `PersistentStateComponent` |
| Disposal safety (IOP-01) | IntelliJ plugin (project service lifecycle) | — | Mirrors `BbjServerService`'s existing `project.isDisposed()` convention; no cross-tier concern |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `org.eclipse.lsp4j.jsonrpc` | 1.0.0 `[VERIFIED: org.eclipse.lsp4j.jsonrpc-1.0.0.jar, resolved transitively via com.redhat.devtools.lsp4ij:0.21.0 plugin dependency in bbj-intellij/build.gradle.kts:34; confirmed present in /home/coder/.gradle/caches/9.7.1/transforms/810689ad0380ec07b3b66a6b60a6f6e3/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/org.eclipse.lsp4j.jsonrpc-1.0.0.jar]` | JSON-RPC `Launcher`/`Launcher.Builder` for the client-side probe | Already the wire protocol both java-interop backends speak; the plugin already depends on it transitively for `BbjComposerServer`/`BbjLanguageClient` |
| `org.eclipse.lsp4j` | 1.0.0 `[VERIFIED: org.eclipse.lsp4j-1.0.0.jar, same transitive resolution]` | `@JsonRequest` / `services.LanguageServer` annotations already used by `BbjComposerServer` | Same wire protocol family; no new artifact |

No new Gradle dependency line is needed — `org.eclipse.lsp4j.jsonrpc.Launcher`,
`Launcher.Builder`, and `StandardLauncher` all live in the same jar
(`org.eclipse.lsp4j.jsonrpc-1.0.0.jar`) that already resolves onto the compile+test classpath via
the existing `plugin("com.redhat.devtools.lsp4ij:0.21.0")` declaration
`[VERIFIED: bbj-intellij/build.gradle.kts:34]`. This is proven, not inferred: main code already
successfully imports `org.eclipse.lsp4j.jsonrpc.services.JsonRequest` and
`org.eclipse.lsp4j.services.LanguageServer` from the same jar with no extra dependency line
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java:28-29]`.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `com.basis.bbj.intellij.concurrency.Scheduler` (in-repo) | — | Test-doubleable timer seam already used by `RestartGate`/`AlarmScheduler` | Route the poll gate's "schedule next check" through this interface if `BbjJavaInteropService` is moved off the raw `Alarm` (currently deferred, see CONTEXT.md Deferred Ideas) |
| `com.basis.bbj.intellij.concurrency.ManualScheduler` (in-repo, test-only) | — | Deterministic clock-advance test double for `Scheduler` | Already exists at `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java`, package-private — reusable only from tests co-located in the `concurrency` package `[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java:14]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A new plugin-built LSP4J `Launcher` client (D-01, chosen) | A `bbj/javaInteropStatus` request added to the shared language server | Rejected in CONTEXT.md: LS connects lazily, so its three-state breaker reads `closed` before any lookup — not the same question as "is the port reachable now" `[VERIFIED: bbj-vscode/src/language/java-interop.ts:168-177 — breakerState field and comment confirm the three-state breaker exists at this location]` |
| `getTopLevelPackages` (D-02, chosen) | `getAllClassNames` | Rejected: exists only in `bbj-ls` (production), not `java-interop/` (dev) `[VERIFIED: grep for "getAllClassNames" in both trees — present at bbj-ls/src/main/java/bbj/interop/InteropService.java:139, absent from java-interop/src/main/java/bbj/interop/InteropService.java]` |

**Installation:** None — no new Gradle dependency to add.

**Version verification:** `org.eclipse.lsp4j.jsonrpc` 1.0.0 confirmed present in the resolved
LSP4IJ 0.21.0 plugin bundle at
`/home/coder/.gradle/caches/9.7.1/transforms/810689ad0380ec07b3b66a6b60a6f6e3/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/`
and mirrored in the built IDE sandbox at
`bbj-intellij/build/idea-sandbox/IC-2024.2/plugins/lsp4ij/lib/`. This is the version the compiler
and the running IDE both actually use — no separate npm/pip/cargo registry check applies (this is
an IntelliJ-platform-plugin dependency, not a standalone Maven artifact the project declares).

## Package Legitimacy Audit

**Not applicable.** This phase adds no new external package/library dependency of any kind. The
one library the new code depends on (`org.eclipse.lsp4j.jsonrpc`) already ships as a transitive
consequence of the existing, already-approved `com.redhat.devtools.lsp4ij:0.21.0` platform-plugin
dependency (`bbj-intellij/build.gradle.kts:34`) and is already imported by production code
(`BbjComposerServer.java`, `BbjLanguageClient.java`). No `npm view` / `pip index` / `cargo search`
equivalent applies to an IntelliJ platform-plugin dependency resolved through the
`org.jetbrains.intellij.platform` Gradle plugin's own repository — the artifact identity was
instead confirmed by direct file inspection of the resolved jar (see Standard Stack above).

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 IntelliJ plugin (project-level, per Project)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │  FileEditorManagerListener.selectionChanged ──▶ [poll gate: BBj file    │
 │  (EDT)                                            selected? D-06/D-08]  │
 │                                                        │                │
 │                                                 gate-open: immediate    │
 │                                                 check + resume cadence  │
 │                                                        ▼                │
 │  BbjServerService.BbjServerStatusListener ──▶  BbjJavaInteropService    │
 │  (server started/stopped)                      (POOLED_THREAD Alarm,   │
 │                                                  checkAlarm)            │
 │                                                        │                │
 │                                            checkConnection() [D-17:     │
 │                                            project.isDisposed() guard]  │
 │                                                        │                │
 │                                    ┌───────────────────┴──────────┐     │
 │                                    │                               │     │
 │                             TCP connect (1s,             new: LSP4J    │
 │                             existing TCP_TIMEOUT_MS)      JSON-RPC     │
 │                                    │                    getTopLevelPackages│
 │                                    │                    (~2s timeout, D-03)│
 │                                    ▼                               ▼     │
 │                         [connect fails: DISCONNECTED    [valid reply:   │
 │                          after 2s GRACE_PERIOD_MS,        CONNECTED     │
 │                          unchanged]                     invalid/absent: │
 │                                                          WRONG_PEER, D-04]│
 │                                    └───────────────────┬──────────┘     │
 │                                                        ▼                │
 │                                       updateStatus() → broadcastStatus()│
 │                                       [D-17: isDisposed() guard on the  │
 │                                        invokeLater lambda]              │
 │                                                        │                │
 │                          ┌─────────────────────────────┼───────────┐   │
 │                          ▼                              ▼           ▼   │
 │              BbjJavaInteropStatusListener   EditorNotifications   (base │
 │              .TOPIC (message bus)           .updateAllNotifications()  │
 │                          │                              │        class,│
 │                          ▼                              ▼        D-13) │
 │              BbjJavaInteropStatusBarWidget    BbjJavaInteropNotification│
 │              (extends new BbjStatusBarWidgetBase<S>)   Provider (D-05: │
 │              [D-14: tooltip via base hook]    reason-varying sentence  │
 │                                                via ConfigReloadPresentation-│
 │                                                style seam)              │
 └──────────────────────────────────────────────────────────────────────────┘

 Outside the plugin process (existing, unchanged by this phase):
   java-interop / bbj-ls SocketServiceApp/LanguageService
   AsynchronousServerSocketChannel.accept() loop ──▶ new InteropService()
   per connection ──▶ Launcher.startListening() (own thread via cached
   executor) ──▶ @JsonRequest getTopLevelPackages() (cheap: Package.getPackages())
```

### Recommended Project Structure

No new top-level directory is warranted — this phase edits existing files plus a small number of
new plain-Java classes that fit naturally beside their existing siblings:

```
bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── ui/
│   ├── BbjJavaInteropService.java        # D-01/D-02/D-03/D-06..D-09/D-17 edits
│   ├── BbjStatusBarWidgetBase.java       # NEW (D-13) — generic abstract base
│   ├── BbjStatusBarWidget.java           # thinned to subclass (D-13/D-14/D-15)
│   ├── BbjJavaInteropStatusBarWidget.java# thinned to subclass (D-13/D-14/D-15)
│   ├── BbjStatusBarWidgetFactory.java    # factory base extraction (D-13)
│   ├── BbjJavaInteropStatusBarWidgetFactory.java
│   └── BbjFileVisibility.java            # reused unchanged (D-06)
├── (new probe/presentation classes — naming is Claude's Discretion; a
│    com.intellij-free package such as `interop/` mirroring the existing
│    `config/` and `concurrency/` subpackage convention is one reasonable
│    option, not mandated by CONTEXT.md)
├── BbjInteropPortDetector.java           # DEFAULT_PORT stays canonical (D-11)
├── InteropPortSettings.java              # unchanged (D-11 extends, not replaces)
├── BbjSettings.java                      # :30 re-pointed at DEFAULT_PORT (D-11)
├── BbjSettingsComponent.java              # :189,195,461,466 re-pointed/stripped (D-11/D-12)
└── BbjJavaInteropNotificationProvider.java # reason-varying sentence (D-05)
```

### Pattern 1: LSP4J client `Launcher` construction (the probe, D-01/D-02/D-03)

**What:** A short-lived JSON-RPC client connection built with `Launcher.Builder`, symmetric to how
`bbj-ls`'s own server constructs its side of the same connection.

**When to use:** Once per poll tick, from the `POOLED_THREAD` `Alarm` callback (never the EDT, per
the standing Phase 79 EDT-01 convention the ROADMAP ordering note calls out explicitly for IOP-03).

**Verified reference implementation (the exact API to mirror), read directly from the production backend:**
```java
// Source: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:87-92
// (server side — the plugin's probe is the client side of the identical API)
var interopService = new InteropService();
var launcher = new Launcher.Builder<>().setLocalService(interopService)
    .setRemoteInterface(LanguageServer.class)
    .setInput(Channels.newInputStream(connection))
    .setOutput(Channels.newOutputStream(connection)).setExecutorService(EXECUTOR).create();
launcher.startListening();
```

The plugin-side probe is the mirror image: it is the *client*, so its local service is a
placeholder with nothing to expose (mirroring how `bbj.interop.LanguageServer` is used server-side
as an empty zero-method marker interface — `LanguageServer.class` — for the direction that has
nothing to call), and its remote interface is a new, plugin-owned interface declaring the one
method being probed:

```java
// New interface, plugin-owned (no shared DTO module exists between bbj-intellij and
// java-interop/bbj-ls — confirmed by directory inspection; a plugin-local response shape is
// required regardless of exact naming, which is Claude's Discretion)
public interface InteropProbeServer {
    @JsonRequest
    CompletableFuture<List<?>> getTopLevelPackages(); // response shape: Claude's Discretion —
        // Object/List<Object>/Gson LinkedTreeMap all deserialize a well-formed reply without a
        // shared DTO; the D-02 "valid result" check needs only a non-null, non-error response
}

// Construction, client side, off the EDT:
Socket socket = new Socket();
socket.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS); // existing 1s ceiling, D-03
Launcher<InteropProbeServer> launcher = new Launcher.Builder<InteropProbeServer>()
    .setLocalService(new Object())
    .setRemoteInterface(InteropProbeServer.class)
    .setInput(socket.getInputStream())
    .setOutput(socket.getOutputStream())
    .create();
Future<?> listening = launcher.startListening();
InteropProbeServer remote = launcher.getRemoteProxy();
try {
    remote.getTopLevelPackages().get(RESPONSE_TIMEOUT_MS, TimeUnit.MILLISECONDS); // ~2s, D-03
    // valid, non-throwing result => CONNECTED
} catch (TimeoutException | ExecutionException e) {
    // no valid reply in time => WRONG_PEER / DISCONNECTED per D-04's classification
} finally {
    listening.cancel(true);
    socket.close();
}
```

`[ASSUMED: exact Launcher.Builder method chain signatures for a client role — verified only that
this class and method set exist in the resolved jar and that the identical chain compiles and
runs on the server side of the same API in bbj-ls; the client-role construction (setLocalService
with a bare placeholder object, no @JsonRequest methods of its own) was not compiled or executed
in this research session and should be spiked/verified in the first implementation task before
the rest of the probe is built on top of it.]`

**Why `getTopLevelPackages` and not a raw handshake:** confirmed present, with the exact cheap
body, in both backends:
```java
// Source: java-interop/src/main/java/bbj/interop/InteropService.java:64-75 (dev)
// and (near-identically) bbj-ls/src/main/java/bbj/interop/InteropService.java:114-125 (production)
@JsonRequest
public CompletableFuture<List<PackageInfoParams>> getTopLevelPackages() {
    var topLevelPackages = new HashSet<String>();
    Arrays.stream(Package.getPackages()).forEach((info) -> {
        topLevelPackages.add(info.getName());
    });
    return CompletableFuture.completedFuture(topLevelPackages.stream().map(packageName -> {
        var packInfo = new PackageInfoParams();
        packInfo.packageName = packageName;
        return packInfo;
    }).toList());
}
```
Neither implementation touches `getClassPath()` (confirmed by reading both method bodies in
full) — `[VERIFIED: java-interop/src/main/java/bbj/interop/InteropService.java:64-75,
bbj-ls/src/main/java/bbj/interop/InteropService.java:114-125]`.

### Pattern 2: Plain-Java decision seam (D-10's gate/classification classes)

**What:** A `com.intellij`-free static-method class with an injectable-function API, following the
project's own established convention.

**Verified reference implementation, read in full:**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java (whole file)
public final class NodeAvailability {
    private NodeAvailability() {}
    public enum Decision { CONFIGURED_PATH_USABLE, CONFIGURED_PATH_UNUSABLE,
        DETECTED_PATH_USABLE, CACHED_DOWNLOAD_USABLE, NO_RUNTIME_FOUND }
    public interface FileProbe { boolean exists(String path); }
    public static final FileProbe REAL_FILES = path -> new java.io.File(path).exists();
    public static Decision decide(String configuredPath, FileProbe files,
            Function<String, String> versionOf, Predicate<String> meetsMinimum,
            Supplier<String> detectedPath, Supplier<Path> cachedNodePath) { /* ... */ }
    public static boolean bannerNeeded(Decision decision) {
        return switch (decision) { /* exhaustive, no default */ };
    }
}
```
The poll-gate and status-classification classes D-10 calls for should follow this exact shape:
private constructor, an exhaustive enum of outcomes, static pure-function decision methods taking
every dependency as a parameter (so a test drives it with fakes/manual values, never a mock of
`FileEditorManager` or `Alarm`), and — where relevant — an exhaustive `switch` with no `default`
branch so a future new enum constant fails to compile rather than silently falling through.
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java:1-81]`

### Pattern 3: Widget base extraction (D-13/D-14/D-15/D-16)

Both widgets today are structurally identical except for: their `Topic` type
(`BbjServerStatusListener.TOPIC` vs. `BbjJavaInteropStatusListener.TOPIC`), their status enum
(`ServerStatus` vs. `InteropStatus`), the status→icon/text switch body, whether a tooltip is set
(only `BbjStatusBarWidget` does, today), and the popup-menu items
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:1-172,
bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java:1-153]`.
Both already construct their `panel`/`iconLabel`/`textLabel` identically, subscribe
`messageBusConnection` to two topics (their own status topic plus
`FileEditorManagerListener.FILE_EDITOR_MANAGER`), and implement `updateVisibility()` identically
via `BbjFileVisibility.showsForSelection(...)` — these are the members `BbjStatusBarWidgetBase<S>`
should hold per D-13.

**Settings-dialog call difference confirmed exactly as CONTEXT.md states:**
```java
// BbjStatusBarWidget.java:134 (today)
ShowSettingsUtil.getInstance().showSettingsDialog(project, "BBj");
// BbjJavaInteropStatusBarWidget.java:124 (today)
ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
```
D-15 unifies on the class form (`BbjJavaInteropStatusBarWidget`'s existing call) — no observable
change since `plugin.xml` declares `displayName="BBj"` on that configurable, so both routes reach
the same page today `[VERIFIED: bbj-intellij/src/main/resources/META-INF/plugin.xml:246-251]`.

### Anti-Patterns to Avoid
- **Blocking the EDT with the JSON-RPC probe:** the whole point of D-03's timeout budget and the
  existing `POOLED_THREAD` `Alarm` is that neither the TCP connect nor the RPC round-trip ever
  runs synchronously on the EDT. `updateStatus()`'s `invokeLater` wrapping (existing pattern,
  unchanged) is only for the UI-thread-affine parts (label/icon updates, message-bus publish).
- **Trusting a well-formed-but-generic JSON-RPC reply as confirmation:** D-02 explicitly rejected
  this — any LSP4J service on the port (not just java-interop) would produce a well-formed
  `MethodNotFound` error or accept any request. The check must require the *specific*
  `getTopLevelPackages` response shape/success, not merely "the socket spoke JSON-RPC."
- **Re-deriving widget visibility from a file extension:** `BbjStatusBarWidgetSourceGuardTest`
  already asserts zero occurrences of `getExtension(` and `"bbl"` in both widgets — this must hold
  through the base extraction too (D-16).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC framing/dispatch for the probe | A hand-rolled length-prefixed message reader/writer over the raw socket | `org.eclipse.lsp4j.jsonrpc.Launcher`/`Launcher.Builder` | Already the exact protocol both backends speak; hand-rolling risks a framing bug that silently misclassifies every "wrong peer" case as "connected" (a worse outcome than today's bare-TCP status) |
| Timed decision seams (poll gate, status classification) | Ad-hoc boolean flags scattered through `BbjJavaInteropService` | The `NodeAvailability`/`RestartGate`/`ExpectedStopGuard` plain-Java seam pattern | Seven existing seams already establish this convention with plain-JUnit coverage; a scattered-flag implementation would be `BbjJavaInteropService`'s first test coverage and its hardest-to-test shape at once |
| Widget tooltip formatting | A second bespoke tooltip formatter for the interop widget | `ConfigReloadPresentation.widgetTooltip(text, reasonLabel)` (existing, D-14 reuses it as the base's hook implementation) | Already exists, already platform-free, already used by `BbjStatusBarWidget` |

**Key insight:** every piece of this phase already has a same-shaped precedent somewhere in the
tree (`BbjServerService`'s disposal guard, `NodeAvailability`'s decision seam, `ConfigReloadPresentation`'s
presentation seam, `RestartGate`'s `Scheduler` test-double pattern, Phase 93's base+thin-subclass
widget consolidation). The only genuinely new construction is the LSP4J client `Launcher`, and
even that has a byte-identical API precedent to copy in `bbj-ls`'s own server-side construction.

## Common Pitfalls

### Pitfall 1: Treating the production backend's per-connection cost as identical to the dev backend's
**What goes wrong:** D-02's "negligible per-connection cost, safe to reconnect per tick" claim was
verified for `java-interop/`'s `InteropService()` constructor (a trivial field initializer) but
**not** for `bbj-ls`'s production `InteropService()` constructor, which calls
`getSSCP(DEFAULT_SSCP)` → `InternalClassLoader.getExternalClassLoader(...)` — a call into
BBjServices' own internal classloader machinery.
**Why it happens:** the two backends' `InteropService` classes look similar at a glance (same
package, same method set, same `@JsonRequest` surface) but their constructors do genuinely
different work.
**How to avoid:** don't assume the production reconnect-per-tick cost is zero; if a real
BBjServices instance is available during implementation or UAT, time a few consecutive probe
ticks against it rather than trusting the dev-backend timing.
**Warning signs:** a "Java: Checking..." transition that visibly lingers past ~1-2s against a real
BBjServices instance (vs. the dev java-interop, where it should be near-instant).

### Pitfall 2: The poll gate reading `FileEditorManager` off the pooled thread
**What goes wrong:** `BbjJavaInteropService.checkAlarm` is `Alarm(ThreadToUse.POOLED_THREAD, this)`
— its callbacks do not run on the EDT. `FileEditorManager.getSelectedFiles()` and
`BbjFileVisibility.showsForSelection(...)` are called today only from EDT contexts (`updateStatus`'s
`invokeLater`, and the widgets' own `selectionChanged`/`updateVisibility`) — CONTEXT.md flags this
exact question as unresolved research (D-08).
**Why it happens:** it's tempting to just call the same `showsForSelection` check directly from
`scheduleNextCheck`'s pooled-thread callback, copying the widgets' code without noticing the
widgets only ever call it from the EDT.
**How to avoid:** the safer, EDT-thread-model-agnostic design is a `volatile boolean` (or
richer state) updated from the `FileEditorManagerListener.selectionChanged` EDT callback, read
(never written) from the pooled-thread poll callback — the same publish pattern
`BbjServerService.pendingRestartReason` already uses for a similar EDT-write /
pooled-thread(-adjacent)-read split `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:63]`.
**Warning signs:** an IntelliJ platform assertion/exception about wrong-thread access to
`FileEditorManager`, or (more insidiously) a data race that only manifests as an occasionally-stale
gate state in manual testing.

### Pitfall 3: Missing the 4th `5008` literal site when writing D-12's single-occurrence guard
**What goes wrong:** CONTEXT.md's domain correction #2 lists exactly two files with a
surviving raw `5008` literal — `BbjSettings.java:30` and `BbjSettingsComponent.java:189,461,466` —
and D-12 lists the *prose* comment-mention sites that must be comment-stripped as
`BbjInteropPortDetector:28` and `InteropPortSettings:32,49,53`. Direct verification in this
research pass found **a fourth prose-only mention CONTEXT.md did not enumerate**:
`BbjSettingsComponent.java:195` — `return null; // Empty is valid, will use default 5008` — a
trailing comment on a line whose actual code (`return null;`) carries no literal.
**Why it happens:** CONTEXT.md's grep-derived count focused on `BbjInteropPortDetector` and
`InteropPortSettings` (the platform-free trio) for prose mentions, and did not re-check
`BbjSettingsComponent` (a `com.intellij`-heavy file) for the same pattern.
**How to avoid:** before writing D-12's single-occurrence assertion, re-run
`grep -n "5008" bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` (four
hits: 189, 195, 461, 466) and confirm the comment-stripping helper removes all four to a *count of
zero* for that file after the three code-literal sites are re-pointed at `DEFAULT_PORT` — the
guard's single surviving occurrence must land in `BbjInteropPortDetector.java:36`
(`public static final int DEFAULT_PORT = 5008;`) and nowhere else.
**Warning signs:** the new single-occurrence source guard passing locally with a stale/incomplete
comment-stripping regex that happens to also swallow the functional `5008` literal at
`BbjInteropPortDetector.java:36` (making the guard vacuously pass at zero, not one).

### Pitfall 4: Overloading `CHECKING` to also mean "poll is paused" (D-07's own warning, confirmed against the real banner code)
**What goes wrong:** `BbjJavaInteropNotificationProvider`'s existing suppression condition already
special-cases both `CONNECTED` and `CHECKING`:
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java:41-45
if (currentStatus == BbjJavaInteropService.InteropStatus.CONNECTED ||
    currentStatus == BbjJavaInteropService.InteropStatus.CHECKING) {
    return null;
}
```
Reporting `CHECKING` while the poll is merely *paused* (not actually mid-probe) would suppress the
banner for the wrong reason and make D-09's newly-live `CHECKING` state ambiguous between "a probe
is in flight" and "no probe is running at all."
**Why it happens:** `CHECKING` already suppresses the banner today (for reasons unrelated to
pausing — it was dead code prior to D-09), so it looks like a convenient reuse.
**How to avoid:** D-07 is explicit — while paused, freeze the last known status and broadcast
nothing at all. No new status value crosses the message bus during the paused window.
**Warning signs:** the banner silently disappearing when a user switches away from a BBj tab while
disconnected (D-07 forbids this outcome exactly).

## Code Examples

### Verified: the existing disposal-guard pattern to mirror verbatim (D-17)
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:131-134
public void updateStatus(@NotNull ServerStatus status) {
    if (project.isDisposed()) {
        return;
    }
    // ...
```
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:197-206
ApplicationManager.getApplication().invokeLater(() -> {
    if (project.isDisposed()) {
        return;
    }
    project.getMessageBus()
        .syncPublisher(BbjServerStatusListener.TOPIC)
        .statusChanged(status);
});
```
`BbjJavaInteropService`'s `checkConnection()` (no guard today) and `broadcastStatus()`'s
`invokeLater` lambda (no guard today) need the identical two guards:
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117,177-186
// (current, unguarded — D-17 adds `if (project.isDisposed()) return;` at the top of each)
private void checkConnection() { /* ... */ }
private void broadcastStatus(@NotNull InteropStatus status) {
    ApplicationManager.getApplication().invokeLater(() -> {
        project.getMessageBus()
            .syncPublisher(BbjJavaInteropStatusListener.TOPIC)
            .statusChanged(status);
        EditorNotifications.getInstance(project).updateAllNotifications();
    });
}
```

### Verified: `BbjFileVisibility`, the shared gate predicate (D-06)
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java:37-44
static boolean showsForSelection(@NotNull VirtualFile[] selectedFiles) {
    for (VirtualFile file : selectedFiles) {
        if (isBbjProgramFileTypeName(file.getFileType().getName())) {
            return true;
        }
    }
    return false;
}
```
Package-private in `ui` — `BbjJavaInteropService` lives in the same package
(`com.basis.bbj.intellij.ui`), so it can call this directly with no visibility change
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:1,
bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java:1,17]`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Bare TCP `Socket.connect()` as the sole peer check | LSP4J JSON-RPC `getTopLevelPackages()` round-trip | This phase (D-01/D-02) | A squatting process on port 5008 no longer reports "Connected"; the widget/banner gain a distinct wrong-peer state |
| `checkAlarm.addRequest(this::checkConnection, 5000)` scheduled unconditionally forever | Gated on `BbjFileVisibility.showsForSelection`, immediate-check-on-gate-open | This phase (D-06/D-08) | Closes both the "polls forever with no BBj file open" issue and the existing 5s-blind-window-on-every-restart bug |
| `InteropStatus.CHECKING` declared but never assigned | Assigned for the probe's real in-flight duration | This phase (D-09) | The existing banner-suppression branch for `CHECKING` finally does something; UAT must confirm no flicker |

**Deprecated/outdated:**
- The bare-TCP-handshake definition of "connected" is being retired specifically because it cannot
  distinguish java-interop from any other process bound to the same port — this was true the whole
  time but only becomes user-visible now that a concrete reproduction (BBjServices itself squatting
  on 5008 without speaking interop) exists per project memory.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `Launcher.Builder`'s client-role construction (`setLocalService(new Object())`, `setRemoteInterface(InteropProbeServer.class)`, plain `Socket` streams, no explicit executor) compiles and behaves as expected — verified only that the classes/methods exist and that the *server*-role use of the identical builder API works in `bbj-ls` | Architecture Patterns, Pattern 1 | If the client-role construction needs a different local-service shape (e.g. a non-null object with at least one method) or an explicit executor to avoid deadlocking on `startListening()`, the first probe implementation task will need a short spike before the rest of D-01/D-02/D-03 can be built on top of it |
| A2 | The production `bbj-ls` `InteropService()` constructor's `getSSCP(DEFAULT_SSCP)` call is cheap enough to run once per 5s poll tick, the way the dev `java-interop/` backend's trivial constructor demonstrably is | Common Pitfalls, Pitfall 1 | If it is not cheap (e.g. it involves a real classloader/JNI round-trip into BBjServices), reconnecting per tick against a real BBjServices instance could make the "Checking..." state visibly linger, which D-09 already asks UAT to watch for — the existing manual reproduction machine (BBjServices squatting on port 5008) is the natural place to observe this |
| A3 | A plugin-owned `InteropProbeServer` interface with a locally-defined response type (no shared DTO with `java-interop`/`bbj-ls`) is an acceptable way to declare the probed method, since no DTO module is shared between `bbj-intellij` and either backend module | Architecture Patterns, Pattern 1 | If a stricter typed response is required for the "valid result" check (D-02), the response type may need hand-written fields matching `PackageInfoParams` (`packageName: String`) rather than an untyped `List<?>`/`Object` |

## Open Questions

1. ~~**Does `Launcher.Builder`'s client role need an explicit `ExecutorService`?**~~ —
   **RESOLVED 2026-09-19 by an orchestrator spike. Do not re-spike this.** See
   "Spike Results" below for the evidence.
   - **Answer:** the client-role construction works with an explicit `ExecutorService`, and that
     is the form to use. `Launcher.createLauncher(new Object(), InteropRemote.class,
     socket.getInputStream(), socket.getOutputStream(), pool, c -> c)` compiled and ran green
     against `bbj-intellij`'s real test classpath, with `pool` a `newCachedThreadPool()` the probe
     `shutdownNow()`s in a `finally`.
   - **Why explicit rather than the simpler form:** a per-tick probe must be able to tear its own
     threads down deterministically, or it leaks a pool every 5 seconds. The explicit executor is
     what makes that possible, so the original "start simple, add an executor only if a leak
     shows" recommendation is inverted — start explicit.
   - **Residual (small, untested):** the 4-arg `createLauncher(localService, remoteInterface, in,
     out)` form was *not* exercised, so "the simple form also works" is unproven. This does not
     block anything, because the explicit form is the one the implementation should use anyway.

2. **Is a `volatile` flag sufficient for the poll gate, or does it need more (e.g. debounce against
   rapid tab-switching)?**
   - What we know: D-08 asks for "gate-open fires an immediate check, then resumes 5s cadence" — a
     rapid sequence of tab switches (BBj file → non-BBj → BBj) could, in the worst case, fire more
     immediate checks than intended if not debounced.
   - What's unclear: whether CONTEXT.md's acceptance of "an IDE left open on a BBj file overnight
     still polls" (D-06's accepted cost) extends to accepting "rapid tab-switching causes extra
     immediate checks" as an acceptable cost too, or whether the gate needs its own coalescing
     (mirroring `RestartGate`'s cancel-and-reschedule pattern).
   - Recommendation: reuse `RestartGate`'s coalescing pattern (cancel-pending, schedule fresh) for
     the gate-open immediate-check trigger, since it is already a proven, tested pattern for
     exactly this "many rapid triggers should still produce close to one action" shape.

## Spike Results (2026-09-19, pre-execution)

A throwaway JUnit spike was run against `bbj-intellij`'s real compile and test classpath before
Wave 1 was authorised, to retire the MEDIUM-confidence client-role construction risk. The spike
file was deleted afterwards and the source tree left byte-identical — it is **not** part of the
phase deliverable, and `95-01` should not re-spike it.

Result: `tests="5" skipped="0" failures="0" errors="0"`, `BUILD SUCCESSFUL`.

| Case | Peer | Outcome | Elapsed |
|------|------|---------|---------|
| Q1 | — (construction only) | client-role `Launcher` compiles and runs | — |
| Q2 | real java-interop-shaped peer (`getTopLevelPackages` → typed list) | `CONNECTED` | — |
| Q3 | squatter: accepts the connection, never replies | `WRONG_PEER` | **2002 ms** |
| Q4 | JSON-RPC speaker without `getTopLevelPackages` | `WRONG_PEER` | **47 ms** |
| Q5 | nothing listening | `DISCONNECTED` | — |

What this establishes for planning and execution:

- **D-03's split timeout budget behaves exactly as specified.** The silent squatter bounded at
  2002 ms against a 2000 ms response timeout — no hang, and comfortably inside the 5 s poll
  interval. This was the assumption the entire wrong-peer state rests on.
- **A wrong-shaped peer fails fast (47 ms), not at the timeout.** LSP4J returns
  `ResponseErrorException: Unsupported request method: getTopLevelPackages`, so the common
  misconfiguration case costs ~50 ms per tick rather than the full 2 s. Better than designed.
- **Assumption A1 is substantially retired.** A plain `new Object()` local service was accepted —
  the feared "needs a non-null object with at least one method" shape is not required — and
  `startListening()` did not deadlock.
- **Assumption A3 is confirmed, including its stricter variant.** A plugin-owned interface with a
  hand-written response type (`packageName: String`, mirroring `PackageInfoParams`) deserialized a
  real typed result correctly. No shared DTO module is needed.
- **`org.eclipse.lsp4j.jsonrpc` is reachable from the test source set** with no new Gradle
  dependency, confirming the Standard Stack finding from the test side as well as the main side.

Two limits worth stating plainly rather than glossing:

- **Assumption A2 is untouched.** The spike used local stub servers, so the production `bbj-ls`
  `InteropService()` / `getSSCP` per-tick cost remains unverified and still needs the live-BBjServices
  UAT that D-09 already calls for.
- **The jar that supplied `Launcher` could not be identified.** `getCodeSource().getLocation()`
  returned `null` — a classloader-introspection limit, not absence, since the class demonstrably
  loaded and functioned. The functional evidence stands; the jar-identity claim does not rest on it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Java 17 toolchain | Plugin compile/test | ✓ `[VERIFIED: bbj-intellij/build.gradle.kts:12-16]` | 17 | — |
| Gradle | Build/test | ✓ `[VERIFIED: gradle-wrapper present, prior phase confirmed 9.7.1]` | 9.7.1 | — |
| `org.eclipse.lsp4j.jsonrpc` 1.0.0 jar | The new probe | ✓ `[VERIFIED: resolved transitively, see Standard Stack]` | 1.0.0 | — |
| A live BBjServices instance with java-interop on port 5008 | Full UAT of IOP-03's squatter case | Not verifiable from this research session (requires a running local BBj install) | — | The maintainer's own machine has a live reproduction per project memory (BBjServices squats on 5008 without speaking interop) — the natural UAT fixture; automated tests can substitute a throwaway `ServerSocket`/`Launcher` in plain JUnit (see Validation Architecture) |

**Missing dependencies with no fallback:** none — the only environment dependency without a
programmatic fallback (a live BBjServices squatter) already has a documented manual UAT fixture.

**Missing dependencies with fallback:** the live-squatter case has an automated-test fallback (a
throwaway local socket server in JUnit), described in Validation Architecture below.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 (`org.junit.jupiter`), via `junit-bom:6.1.3` `[VERIFIED: bbj-intellij/build.gradle.kts:39-41]` |
| Config file | `bbj-intellij/build.gradle.kts` (`tasks.withType<Test>().configureEach { useJUnitPlatform() }`) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.ui.*" ` (or a specific class) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` (per Phase 94's standing decision: `--rerun-tasks` avoids a stale green from Gradle's UP-TO-DATE cache) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| IOP-01 | In-flight check never touches a disposed project's message bus/notifications | source guard (structural — no live IDE disposal can be simulated in plain JUnit) | `./gradlew test --tests "*BbjJavaInteropService*SourceGuard*"` | ❌ Wave 0 — new guard needed, modeled on `BbjServerService`'s equivalent (none currently exists per CONTEXT.md: "only two source guards reference it") |
| IOP-02 | Poll re-arms only while a BBj file is selected; immediate check on gate-open | plain-Java unit test (the new gate/classification seam) | `./gradlew test --tests "*PollGate*"` / `*InteropStatusClassification*` (exact name is Claude's Discretion) | ❌ Wave 0 |
| IOP-03 | "Connected" requires a confirmed peer, not a bare handshake | **integration-style plain-JUnit test against a real local socket** — no IntelliJ platform dependency needed, since the probe itself is `com.intellij`-free | `./gradlew test --tests "*InteropProbe*"` | ❌ Wave 0 — this is the highest-value new test in the phase; see below |
| IOP-04 | Single named port constant | source guard (existing pattern, extend `EffectiveInteropPortSourceGuardTest` or a sibling) | `./gradlew test --tests "*EffectiveInteropPortSourceGuardTest*"` (or new sibling) | ✅ existing file, extend |
| IOP-05 | Widgets/factories share a base | source guard (re-point `BbjStatusBarWidgetSourceGuardTest`), hand UAT for visual behavior | `./gradlew test --tests "*BbjStatusBarWidgetSourceGuardTest*"` | ✅ existing file, re-point per D-16 |

**The IOP-03 probe is genuinely testable without a live IDE**, closing what would otherwise be the
phase's biggest source-guard-only gap. A plain JUnit test can:
1. Stand up a throwaway `ServerSocket`/`AsynchronousServerSocketChannel` on an ephemeral port,
   speak the exact `Launcher`/`@JsonRequest getTopLevelPackages` protocol (mirroring
   `SocketServiceApp.startJsonRpc` almost verbatim, using a minimal local `InteropStub` with just
   that one method) — this represents "a real java-interop peer" and the probe must classify it as
   confirmed/connected.
2. Stand up a second throwaway server on a different ephemeral port that either accepts the
   connection and stays silent, or accepts it and replies with a well-formed-but-wrong JSON-RPC
   response (e.g. an unrelated method's shape) — this represents "the squatter case" and the probe
   must classify it as the new wrong-peer state, not connected.
3. Optionally, a third case with nothing listening at all — the probe must classify it as
   disconnected (today's existing TCP-failure path, unchanged).

This gives IOP-03 real, deterministic, fast automated coverage rather than hand-UAT-only, matching
the project's "no live IntelliJ UI test coverage" constraint while still exercising the actual
network/protocol code path end-to-end.

### Sampling Rate
- **Per task commit:** targeted test class run (quick run command above)
- **Per wave merge:** `./gradlew test --rerun-tasks`
- **Phase gate:** full suite green before `/gsd-verify-work`, plus hand UAT against the
  maintainer's live-squatter machine for IOP-03's criterion 3 and both widgets' full visual/tooltip
  surface for IOP-05

### Wave 0 Gaps
- [ ] A new source guard for `BbjJavaInteropService`'s disposal checks (IOP-01) — no existing guard
      covers `project.isDisposed()` usage in this file today.
- [ ] The new poll-gate / status-classification plain-Java class(es) and their JUnit test(s) (IOP-02).
- [ ] The new LSP4J probe class and its socket-based JUnit test(s), including the two throwaway
      local-server test fixtures described above (IOP-03).
- [ ] Extension of `EffectiveInteropPortSourceGuardTest` (or a new sibling) asserting the
      single-occurrence `5008` count across `src/main/java` — must account for **all four**
      `BbjSettingsComponent.java` sites (189, 195, 461, 466), not the three CONTEXT.md names
      (see Common Pitfalls, Pitfall 3).
- [ ] Re-pointed `BbjStatusBarWidgetSourceGuardTest` assertions for the base-extraction shape
      (IOP-05, D-16), plus an edited `Lsp4ijImportAllowlistTest` map if `ServerStatus` moves onto
      the new base.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V5 Input Validation | yes | The JSON-RPC probe response must be validated as a genuine, well-typed `getTopLevelPackages` result before being trusted as "connected" — this is the entire point of D-02, already the strictest option considered (rejected accepting any well-formed reply or a `MethodNotFound` error) |
| V4 Access Control | no | No auth/authorization surface — this is a local-loopback-by-default TCP status probe, unchanged trust model from today's bare TCP check |
| V6 Cryptography | no | No crypto — plain TCP, matching the existing unencrypted java-interop wire protocol (out of scope for this phase to change) |
| V2/V3 Authentication/Session | no | No session or credential handling in this phase's files |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| A process squatting on the configured port impersonating java-interop | Spoofing | D-01/D-02's protocol-level confirmation (this phase's entire purpose) — replaces a bare TCP handshake, which any process satisfies, with a real JSON-RPC round-trip specific to the interop service |
| A squatter that accepts the connection but never responds, tying up the poll indefinitely | Denial of Service | D-03's split timeout budget (1s connect + ~2s response) bounds every tick's worst case; the existing `GRACE_PERIOD_MS` logic still smooths transient failures |
| `javaInteropHost` is a user-configurable field (defaults to `localhost`, not hardcoded) | Tampering / minor SSRF-adjacent | Pre-existing behavior, unchanged by this phase — the probe reads `state.javaInteropHost` exactly as `checkConnection()` already does today; out of scope to add host restrictions in this phase |

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java` and `BbjJavaInteropStatusBarWidgetFactory.java` (whole files)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortDetector.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortSettings.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` (targeted reads around all four `5008` sites)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` (grep-confirmed no raw literal)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` (imports)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/AlarmScheduler.java`, `RestartGate.java`, `Scheduler.java` (whole files)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` (whole file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` (targeted grep, lines 49-52)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` (whole file)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java` (whole file)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` (whole file)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java` (whole file)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (lines 245-289)
- `bbj-intellij/build.gradle.kts` (whole file, dependency block)
- `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` (whole file)
- `java-interop/src/main/java/bbj/interop/InteropService.java` (whole file)
- `java-interop/src/main/java/bbj/interop/LanguageServer.java` (whole file)
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/SocketServiceApp.java` (whole file)
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java` (whole file)
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java` (lines 1-183, `getSSCP` at 403-415)
- `bbj-vscode/src/language/java-interop.ts` (lines 150-189)
- Direct jar inspection: `org.eclipse.lsp4j.jsonrpc-1.0.0.jar` contents (`unzip -l`) confirming `Launcher`, `Launcher$Builder`, `StandardLauncher` classes present
- `.planning/phases/95-java-interop-status-accuracy-widget-consolidation/95-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json`

### Secondary (MEDIUM confidence)
- General `org.eclipse.lsp4j.jsonrpc.Launcher.Builder` client-role API behavior (exact effect of
  omitting `setExecutorService`, exact requirements of `setLocalService` for a role with no
  exposed methods) — inferred from training knowledge of the LSP4J API plus the one concrete
  server-role usage read in `bbj-ls`, not independently compiled/executed this session.

### Tertiary (LOW confidence)
- None — no findings in this research rely solely on an unverified web search.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — the one library involved (`org.eclipse.lsp4j.jsonrpc` 1.0.0) was
  confirmed present in the exact resolved jar on both the build cache and the IDE sandbox, with no
  new dependency line required (proven by existing successful imports of the same jar).
- Architecture: HIGH for the widget-base and disposal-guard patterns (byte-identical precedents
  read in full); MEDIUM for the LSP4J client `Launcher` construction specifically (verified the
  identical API's server-role use; the client-role use is a same-API mirror, not independently
  compiled this session — flagged as A1 in the Assumptions Log).
- Pitfalls: HIGH — all four pitfalls are grounded in specific, cited line numbers read this
  session, including one genuine drift from CONTEXT.md's own claims (the 4th `5008` site).

**Research date:** 2026-09-19
**Valid until:** 30 days (stable, internal-codebase-driven research; the only external dependency,
`com.redhat.devtools.lsp4ij:0.21.0`, is pinned in `build.gradle.kts` and would only drift on a
deliberate version bump, which Phase 96/97 planning would surface separately)
