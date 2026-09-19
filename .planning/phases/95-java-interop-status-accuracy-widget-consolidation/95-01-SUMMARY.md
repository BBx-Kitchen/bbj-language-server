---
phase: 95-java-interop-status-accuracy-widget-consolidation
plan: 01
subsystem: intellij-plugin
tags: [lsp4j, json-rpc, intellij, status-bar, java-interop, disposal-safety]

# Dependency graph
requires: []
provides:
  - "InteropProbeClient -- a plain-Java LSP4J client probe that classifies a java-interop peer as CONFIRMED, WRONG_PEER or UNREACHABLE via a real getTopLevelPackages round trip"
  - "InteropStatusPresentation -- the platform-free status-text/tooltip/banner seam for the new WRONG_PEER state, modelled on ConfigReloadPresentation"
  - "BbjJavaInteropService.InteropStatus.WRONG_PEER -- a fourth, user-visible interop status distinct from CONNECTED/DISCONNECTED/CHECKING"
  - "Two project.isDisposed() guards on checkConnection() and broadcastStatus()'s invokeLater lambda, pinned by a structural source guard"
affects: [95-02, 95-03, 95-04, 96-plat-03-editor-notification-provider-base]

# Actuals (#2632)
actuals:
  tokens: 8135
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Java LSP4J client Launcher.Builder construction (setLocalService(new Object()), setRemoteInterface, setExecutorService, cancel+shutdownNow in finally) -- the first client-role Launcher built anywhere in bbj-intellij"
    - "Platform-free presentation seam taking a plain status-name String rather than the enum, so it stays free of the ui package (ConfigReloadPresentation convention)"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeEndpoint.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropProbeClientTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropStatusPresentationTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropServiceDisposalSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java

key-decisions:
  - "setExecutorService was proven necessary during a pre-execution orchestrator spike (RESEARCH.md, 2026-09-19) before this plan ran -- 95-01 did not need to re-spike it. InteropProbeClient uses the Launcher.Builder chain with an explicit newCachedThreadPool(), shut down via shutdownNow() in the finally block alongside the socket close and listening-future cancel."
  - "Wrong-peer wording: status label 'Java: Wrong peer', tooltip 'A process is listening on the configured java-interop port, but it is not answering the java-interop protocol -- Java completions are unavailable.', banner 'The configured java-interop port is held by a process that is not java-interop -- check the port in Settings.'"
  - "Phase 96 PLAT-03 file-disjointness correction recorded: this plan edited BbjJavaInteropNotificationProvider.java, one of the three editor notification providers PLAT-03 (#622) consolidates onto a shared base. ROADMAP's claim that Phase 96 is file-disjoint from Phases 93-95 is now false; PLAT-03's base must carry the reason-varying bannerText(...) call this plan introduced."

requirements-completed: [IOP-03, IOP-01]

coverage:
  - id: D1
    description: "A squatting peer (accepts the TCP connection, does not answer getTopLevelPackages) classifies as WRONG_PEER, not CONNECTED -- ROADMAP criterion 3"
    requirement: "IOP-03"
    verification:
      - kind: integration
        ref: "InteropProbeClientTest#silentSquatterClassifiesAsWrongPeerWithinResponseBudget"
        status: pass
      - kind: integration
        ref: "InteropProbeClientTest#realPeerClassifiesAsConfirmed"
        status: pass
      - kind: integration
        ref: "InteropProbeClientTest#closedPortClassifiesAsUnreachable"
        status: pass
    human_judgment: true
    rationale: "The socket test proves classification; the live reproduction (BBjServices squats on :5008 on the maintainer's machine) is the only way to confirm the rendered status text, tooltip and banner wording in a running IDE -- carried in the task's <verify><human-check> block for end-of-phase UAT.md consolidation per workflow.human_verify_mode=end-of-phase."
  - id: D2
    description: "The split timeout budget (1s connect + 2s response) bounds a silent squatter's poll tick well inside the 5s CHECK_INTERVAL_MS, and the existing 2s GRACE_PERIOD_MS logic for a genuinely unreachable port is unchanged"
    requirement: "IOP-03"
    verification:
      - kind: unit
        ref: "InteropProbeClientTest#silentSquatterClassifiesAsWrongPeerWithinResponseBudget"
        status: pass
    human_judgment: false
  - id: D3
    description: "The editor banner names the real reason for each status instead of always saying 'Start BBjServices' -- a squatting peer is never told to start a service that is already running"
    requirement: "IOP-03"
    verification:
      - kind: unit
        ref: "InteropStatusPresentationTest#bannerTextDiffersBetweenDisconnectedAndWrongPeer"
        status: pass
    human_judgment: true
    rationale: "String-level distinctness is proven by unit test; whether the wording reads correctly in the live editor banner needs the human-check on the maintainer's squatting-BBjServices machine."
  - id: D4
    description: "An in-flight health check never reaches project.getMessageBus()/EditorNotifications on a disposed project"
    requirement: "IOP-01"
    verification:
      - kind: unit
        ref: "BbjJavaInteropServiceDisposalSourceGuardTest#isDisposedGuardOccursExactlyTwice"
        status: pass
      - kind: unit
        ref: "BbjJavaInteropServiceDisposalSourceGuardTest#checkConnectionGuardsBeforeAnyProbeOrStatusWork"
        status: pass
      - kind: unit
        ref: "BbjJavaInteropServiceDisposalSourceGuardTest#broadcastStatusGuardsInsideTheInvokeLaterLambdaNotOutsideIt"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-19
status: complete
---

# Phase 95 Plan 01: java-interop Peer Confirmation & Disposal Guards Summary

**A real LSP4J `getTopLevelPackages` round trip replaces the bare TCP handshake in `checkConnection()`, giving a squatting peer its own WRONG_PEER status, tooltip and banner sentence, and both disposal-unsafe sites in `BbjJavaInteropService` are now guarded and pinned by a structural test.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-19T17:04:05Z
- **Completed:** 2026-09-19T17:09:35Z
- **Tasks:** 3
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- `InteropProbeClient.probe(host, port, connectTimeoutMs, responseTimeoutMs)` opens a plain socket, then issues a real `getTopLevelPackages` JSON-RPC request over an LSP4J `Launcher.Builder` chain with an explicit `ExecutorService`, returning `CONFIRMED`, `WRONG_PEER`, or `UNREACHABLE`
- `BbjJavaInteropService.checkConnection()` routes through the probe instead of a bare `Socket` connect; `CONFIRMED` earns `CONNECTED`, `WRONG_PEER` earns the new distinct status immediately (no grace period), and `UNREACHABLE` runs the **unchanged** `disconnectedSince`/`GRACE_PERIOD_MS` ladder
- `InteropStatusPresentation` produces the status-bar label, tooltip, and editor-banner sentence for all four statuses from a plain status-name String -- no `com.intellij` import, so plain JUnit drives every branch
- `BbjJavaInteropStatusBarWidget` gains a `WRONG_PEER` branch reusing the existing `INTEROP_DISCONNECTED` icon (no new SVG asset); the other three branches are untouched
- `BbjJavaInteropNotificationProvider`'s banner text now varies by reason via `InteropStatusPresentation.bannerText(...)`, replacing the single fixed "Start BBjServices" string that was actively wrong for a squatter
- Both `project.isDisposed()` guards (`checkConnection()` entry, `broadcastStatus()`'s `invokeLater` lambda) are in place and pinned by `BbjJavaInteropServiceDisposalSourceGuardTest`, mirroring `BbjServerService`'s established pattern verbatim
- Whole IntelliJ JUnit suite green under `./gradlew test --rerun-tasks`: 1017 tests, 0 failures, 0 errors, 0 skipped -- no `UP-TO-DATE` shortcut

## Task Commits

Each task was committed atomically:

1. **Task 1: One probe, one path -- a squatter is told apart from java-interop, end to end** - `ae27bf39` (feat)
2. **Task 2: The wrong-peer state becomes visible -- widget label, tooltip, and a banner that names the real reason** - `830ae173` (feat)
3. **Task 3: Pin the disposal guards structurally and run the phase regression gate** - `6039f021` (test)

_No plan-metadata commit yet -- this SUMMARY and STATE/ROADMAP updates are committed together below, per the sequential-executor task_commit_protocol._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeEndpoint.java` - plugin-owned `@JsonRequest getTopLevelPackages` remote interface, no shared DTO with either backend
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropProbeClient.java` - the client-side LSP4J probe and its `Verdict` classification
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java` - platform-free status text/tooltip/banner seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` - `checkConnection()` rewritten to route through the probe; `WRONG_PEER` enum constant; `RESPONSE_TIMEOUT_MS`; two disposal guards
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` - `case WRONG_PEER:` branch reusing `INTEROP_DISCONNECTED`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java` - banner text now reason-varying via the presentation seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropProbeClientTest.java` - socket-backed coverage of all three verdicts
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropStatusPresentationTest.java` - all three presentation methods across all four statuses plus an unrecognized name
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropServiceDisposalSourceGuardTest.java` - structural pin for both disposal guards

## Decisions Made

- **`setExecutorService` proved necessary (RESEARCH.md assumption A1).** This was resolved by a pre-execution orchestrator spike recorded in 95-RESEARCH.md (2026-09-19, before this plan ran), which found the client-role `Launcher.Builder` chain needs an explicit `ExecutorService` to tear its own threads down deterministically on each tick -- a per-tick probe without one leaks a thread pool every 5 seconds. `InteropProbeClient` uses `Executors.newCachedThreadPool()`, `shutdownNow()`'d in the `finally` block alongside the socket close and `listening.cancel(true)`. No re-spike was needed or performed in this plan.
- **Exact wrong-peer wording** (Claude's Discretion per CONTEXT.md, within D-04/D-05's meaning):
  - Status label: `"Java: Wrong peer"`
  - Tooltip: `"A process is listening on the configured java-interop port, but it is not answering the java-interop protocol -- Java completions are unavailable."`
  - Banner: `"The configured java-interop port is held by a process that is not java-interop -- check the port in Settings"`
- **Phase 96 PLAT-03 file-disjointness correction.** This plan edited `BbjJavaInteropNotificationProvider.java`, one of the three editor notification providers Phase 96's PLAT-03 (#622) consolidates onto a shared base. ROADMAP's claim that Phase 96 is "file-disjoint from Phases 93-95" is now false; PLAT-03's base must carry the reason-varying `bannerText(currentStatus.name())` call this plan introduced, and confirm at Phase 96 discussion that the "file-disjoint" premise is corrected (already flagged in 95-CONTEXT.md's `<domain>` section).
- Exhaustive `switch` expression (no `default`) used for `Verdict` dispatch in `checkConnection()`, following the `NodeAvailability`/seam convention so a future fourth `Verdict` constant fails to compile here rather than silently falling through.

## Deviations from Plan

None - plan executed exactly as written. The one adjustment made during Task 1 was removing a literal `com.intellij` substring from `InteropProbeClient.java`'s own javadoc prose (it was describing the file's own lack of an IntelliJ import, and the literal string tripped the acceptance criterion's substring check) -- rewording to "IntelliJ platform import" instead of the literal package name. This is a wording fix within Task 1's own acceptance-criteria loop, not a deviation from the plan's intent.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `95-02`, `95-03`, `95-04` can proceed; none of their `depends_on` lists this plan explicitly, but any plan touching `BbjJavaInteropStatusBarWidget.java`, `BbjJavaInteropNotificationProvider.java`, or `BbjJavaInteropService.java` must account for the `WRONG_PEER` status this plan introduced.
- **Human-check outstanding for end-of-phase UAT** (per `workflow.human_verify_mode=end-of-phase`): on the maintainer's machine where BBjServices squats on port 5008 without speaking the interop protocol, confirm (1) the Java status-bar widget reads the wrong-peer label, not "Java: Connected"; (2) hovering it shows the wrong-peer tooltip; (3) the editor banner names the port collision and no longer says to start BBjServices. This is an intended observable change, not a no-observable-delta report.
- Phase 96 discussion must confirm the PLAT-03 file-disjointness correction recorded above before that phase is planned.
- `#587` and `#592` are closable per this plan's stated intent (#587 with its acceptance criteria recorded as too narrow, not met as written) -- actual GitHub issue closure is a maintainer action, not automated here.

## Self-Check: PASSED

All 6 created source/test files and the SUMMARY.md itself verified present on disk via `[ -f ]`; all
4 commit hashes (`ae27bf39`, `830ae173`, `6039f021`, `a1037a96`) verified present via `git log
--oneline --all`.

---
*Phase: 95-java-interop-status-accuracy-widget-consolidation*
*Completed: 2026-09-19*
