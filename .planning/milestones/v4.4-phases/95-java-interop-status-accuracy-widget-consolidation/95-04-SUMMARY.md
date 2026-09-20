---
phase: 95-java-interop-status-accuracy-widget-consolidation
plan: 04
subsystem: intellij-plugin
tags: [intellij, status-bar, generics, source-guard, java-interop]

# Dependency graph
requires:
  - phase: 95-01
    provides: "BbjJavaInteropService.InteropStatus.WRONG_PEER and InteropStatusPresentation, consumed by this plan's tooltipFor hook"
  - phase: 95-02
    provides: "BbjJavaInteropService's finalized polling/gating shape, settled before the base extraction"
  - phase: 95-03
    provides: "the port-constant consolidation this plan's files were disjoint from"
provides:
  - "BbjStatusBarWidgetBase<S> -- the single generic abstract base for both status-bar widgets, holding every shared member"
  - "BbjStatusBarWidgetFactoryBase -- the single abstract base for both widget factories"
  - "A re-pointed BbjStatusBarWidgetSourceGuardTest asserting each moved invariant inside its new extracted-method home"
  - "The java-interop status-bar widget's first-ever tooltip, routed through InteropStatusPresentation"
affects: [96-plat-03-editor-notification-provider-base]

# Actuals (#2632)
actuals:
  tokens: 9447
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generic abstract base (BbjStatusBarWidgetBase<S>) plus two thin no-arg-constructible subclasses, parameterised on an unrelated per-subclass status type rather than one class taking a mapping function -- the Phase 93 base+thin-subclass precedent extended to an IDE extension point registered by implementation="
    - "Index-slice source guards: a moved invariant is pinned inside the substring bounded by its extracted method's declaration and the next method declaration, not merely counted file-wide"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactoryBase.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java

key-decisions:
  - "The abstract hook subscribeToStatusTopic(MessageBusConnection) takes the parameter named messageBusConnection, not connection -- so each subclass's own topic subscription still reads as the literal messageBusConnection.subscribe(...) the source guard (and the pre-existing file convention) expects. Discovered as a test failure during Task 3, not anticipated at Task 1: the guard's delegation-pin literal is a real constraint on hook-parameter naming, not just documentation."
  - "Lsp4ijImportAllowlistTest needed no edit, confirmed by running it rather than assumed -- the generic base names neither vendor status type, so LSP4IJ's ServerStatus symbol stays confined to BbjStatusBarWidget.java alone, exactly as CONTEXT.md D-16 predicted."
  - "The falsification target for Task 3's guard-has-teeth requirement was the dispose() pin (messageBusConnection.disconnect()) -- removed to an empty if-block (still valid Java, still compiles), observed the guard's dedicated dispose test go red, then restored and verified byte-identical via SHA-256 before re-running green."

requirements-completed: [IOP-05]

coverage:
  - id: D1
    description: "Both status-bar widgets share one generic abstract base holding the panel, both labels, MouseAdapter wiring, messageBusConnection lifecycle, FILE_EDITOR_MANAGER subscription, updateVisibility() and dispose(); each subclass supplies only its topic, status mapping, tooltip and popup items"
    requirement: "IOP-05"
    verification:
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest#baseConstructorSubscribesFileEditorManagerExactlyOnceAndRoutesSelectionChangedToUpdateVisibility"
        status: pass
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest#baseUpdateVisibilityDelegatesToSharedPredicateExactlyOnce"
        status: pass
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest#baseDisposeDisconnectsTheSharedConnectionExactlyOnce"
        status: pass
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest#subclassCarriesExactlyOneOwnTopicSubscriptionAndExtendsTheBase"
        status: pass
    human_judgment: false
  - id: D2
    description: "The java-interop status-bar widget gains a tooltip it has never had (routed through InteropStatusPresentation) -- an intended, user-visible change, never to be reported as no-observable-delta"
    requirement: "IOP-05"
    verification: []
    human_judgment: true
    rationale: "Rendering correctness of the new tooltip text in a running IDE needs a human to hover the widget; the source-level wiring (tooltipFor's implementation calling InteropStatusPresentation.tooltip) has no automated test of its own beyond compilation, carried in Task 3's <verify><human-check> block for end-of-phase UAT.md consolidation per workflow.human_verify_mode=end-of-phase."
  - id: D3
    description: "The shared Open Settings popup item unifies on the exact-class form showSettingsDialog(project, BbjSettingsConfigurable.class), retiring the BBj widget's prior display-name-string form, with no observable behaviour change"
    requirement: "IOP-05"
    verification:
      - kind: other
        ref: "grep -c 'showSettingsDialog(' across BbjStatusBarWidgetBase.java, BbjStatusBarWidget.java, BbjJavaInteropStatusBarWidget.java == 1, in the base, using the class form"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both widgets still show, hide, update and tooltip exactly as before, including hiding for BBx Config and non-BBj tabs on the click itself -- visibility stays in the base's single updateVisibility(), never re-derived by file extension"
    requirement: "IOP-05"
    verification:
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest#widgetSourceNeverReDerivesVisibilityByExtension"
        status: pass
    human_judgment: true
    rationale: "The source guard proves the code path is structurally unchanged; the actual show/hide behaviour on a BBx Config file and a non-BBj tab needs a human click-through in a running IDE, carried in Task 3's <verify><human-check> block."
  - id: D5
    description: "Both factories share one base differing only in id, display name and constructed widget; both concrete factory classes still exist with no-arg constructors so plugin.xml's two implementation= registrations are unchanged"
    requirement: "IOP-05"
    verification:
      - kind: other
        ref: "git diff --exit-code -- bbj-intellij/src/main/resources/META-INF/plugin.xml"
        status: pass
      - kind: integration
        ref: "./gradlew compileJava --rerun-tasks (both factories instantiate via no-arg constructor)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The re-pointed guards keep every invariant they made before the extraction, now pinned inside the base's extracted method bodies rather than merely file-wide, with a delegation pin per subclass and full-breadth negative assertions extended to the base"
    requirement: "IOP-05"
    verification:
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest (all 9 methods)"
        status: pass
      - kind: other
        ref: "Falsification: dispose() pin removed, baseDisposeDisconnectsTheSharedConnectionExactlyOnce observed red, file restored and SHA-256-verified byte-identical, guard re-run green"
        status: pass
    human_judgment: false
  - id: D7
    description: "Lsp4ijImportAllowlistTest's twelve-entry map needs no edit because the generic base names neither vendor status type"
    requirement: "IOP-05"
    verification:
      - kind: unit
        ref: "Lsp4ijImportAllowlistTest (all 6 methods, including theCouplingSurfaceIsExactlyTheTwelveFilesInTheAllowlist and thisTestDoesNotDeriveTheAllowlistFromTheScan)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The whole IntelliJ JUnit suite is green under a forced re-run, and an installable plugin build exists for UAT"
    requirement: "IOP-05"
    verification:
      - kind: integration
        ref: "./gradlew test --rerun-tasks (1040 tests, 0 failures, 0 errors, 0 skipped, Task :test executed not UP-TO-DATE)"
        status: pass
      - kind: integration
        ref: "./gradlew buildPlugin -> bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-19
status: complete
---

# Phase 95 Plan 04: Widget & Factory Consolidation Summary

**BbjStatusBarWidgetBase\<S\> and BbjStatusBarWidgetFactoryBase collapse the two status-bar widgets and their two factories onto one generic base each, unify Open Settings on the exact-class form, give the java-interop widget its first-ever tooltip, and re-point the structural guards to assert every moved invariant inside its new extracted-method home -- proven with a falsify-then-restore cycle.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-19T17:34:00Z (approx, immediately following 95-03)
- **Completed:** 2026-09-19T17:43:00Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `BbjStatusBarWidgetBase<S>` holds every shared member of the two widgets -- panel/label construction, mouse-click-to-popup wiring, the `messageBusConnection` lifecycle, the `FILE_EDITOR_MANAGER` subscription, `updateVisibility()`, and `dispose()` -- with seven abstract hooks (`widgetId`, `subscribeToStatusTopic`, `currentStatus`, `iconFor`, `textFor`, `tooltipFor`, `addPopupItems`) supplying the per-subclass differences, generic on `S` so it names neither vendor status type
- `BbjStatusBarWidget` and `BbjJavaInteropStatusBarWidget` thin to subclasses of the base, each keeping its own id, status switch, topic subscription and popup items; the BBj widget's status labels and the Java widget's status labels are byte-identical to their pre-consolidation text
- **The java-interop widget gains a tooltip it has never had** -- its `tooltipFor` hook calls `InteropStatusPresentation.tooltip(status.name())`, the same seam plan 95-01 built for the wrong-peer state. This is an intended, user-visible change, declared here for the UAT record, not reported as no-observable-delta
- Open Settings unifies on `showSettingsDialog(project, BbjSettingsConfigurable.class)` -- now the only such call in the tree, living in the base's `addOpenSettingsItem` helper; the BBj widget's prior display-name-string form is retired
- `BbjStatusBarWidgetFactoryBase` carries the three byte-identical factory methods (`isAvailable`, `disposeWidget`, `canBeEnabledOn`); both concrete factories thin to their id, display name and one-line `createWidget`, remaining `public final` with implicit no-arg constructors -- `plugin.xml`'s two `implementation=` registrations are provably unmodified (`git diff --exit-code` on the file)
- `BbjStatusBarWidgetSourceGuardTest` is re-pointed, not rewritten: base pins use an index-slice technique to assert each moved invariant lives inside its specific extracted method body (not merely somewhere in the file); each subclass keeps exactly one delegation pin (`messageBusConnection.subscribe(` for its own topic); the two negative assertions (no file-extension accessor, no hard-coded `"bbl"`) now sweep both subclasses and the base
- The re-pointed guard's teeth were proven, not assumed: the `dispose()` pin was deliberately removed, the guard's dedicated dispose test was observed failing, the file was restored and verified byte-identical by SHA-256, and the guard was re-run green
- `Lsp4ijImportAllowlistTest` passes unedited with its twelve-entry map -- run and confirmed, not assumed, as CONTEXT.md D-16 predicted: the generic base's type parameter keeps the LSP4IJ `ServerStatus` symbol confined to `BbjStatusBarWidget.java` alone
- Whole IntelliJ JUnit suite green under `./gradlew test --rerun-tasks`: 1040 tests, 0 failures, 0 errors, 0 skipped, with `Task :test` actually executed rather than reported `UP-TO-DATE`
- `./gradlew buildPlugin` produced `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, an installable distribution from the final tree for hand UAT

## Task Commits

Each task was committed atomically:

1. **Task 1: One widget base, two thin subclasses -- with the tooltip and settings call unified** - `c9e50ea2` (feat)
2. **Task 2: One factory base, two thin factories, registrations untouched** - `ec38a4cc` (feat)
3. **Task 3: Re-point the guards, run the phase gate, and build the plugin for UAT** - `83557d44` (test)

_No plan-metadata commit yet -- this SUMMARY and STATE/ROADMAP updates are committed together below, following the sequential-executor task_commit_protocol._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java` - the generic abstract widget base; every shared member plus seven abstract hooks and the shared `addOpenSettingsItem`/`updateStatus` helpers
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactoryBase.java` - the shared factory base carrying `isAvailable`/`disposeWidget`/`canBeEnabledOn`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` - thinned to `extends BbjStatusBarWidgetBase<ServerStatus>`; own switch, own topic subscription, three popup items
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` - thinned to `extends BbjStatusBarWidgetBase<BbjJavaInteropService.InteropStatus>`; own switch (including the wrong-peer branch from plan 95-01), own topic subscription, two popup items, new tooltip hook
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java` - thinned to `extends BbjStatusBarWidgetFactoryBase`; id, display name, `createWidget`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java` - thinned the same way
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` - re-pointed: base pins via index-slice, subclass delegation pins, widened negative-assertion sweep, `BbjFileVisibility` test left untouched

## Decisions Made

- **`subscribeToStatusTopic`'s parameter is named `messageBusConnection`, not `connection`.** Discovered as a Task 3 test failure: the guard's delegation-pin literal (`messageBusConnection.subscribe(`) is a real constraint on hook-parameter naming in the calling subclass, not just documentation -- with the parameter named `connection`, each subclass's own subscribe call read as `connection.subscribe(...)`, which the guard (and the file's pre-existing convention) does not match. Renamed in the base's abstract declaration and both subclass overrides; re-verified compile and guard green.
- **`Lsp4ijImportAllowlistTest` needed no edit, confirmed by running it.** CONTEXT.md D-16 flagged an edit as conditional on `ServerStatus` moving to the base; the generic-on-`S` design keeps it out, and the test run confirms the twelve-entry map is unchanged.
- **The falsification target was the `dispose()` pin.** Removed `messageBusConnection.disconnect();` to an empty `if` block (still valid Java, still compiles), ran the guard and observed exactly `baseDisposeDisconnectsTheSharedConnectionExactlyOnce` fail, restored the file, verified the restore was byte-identical via SHA-256 (`28010f8448dd8d3e675b1771b72ad97a565247365e24dbef4ba1462c010bb9ae` before and after), and re-ran the guard green.
- **#620 closes as implemented with the base-plus-thin-subclasses deviation recorded**, following the Phase 93 D-05/D-06 and Phase 94 D-11 precedent of closing on cited reasoning rather than the issue's literal wording: #620's own text asks for "one concrete class parameterized at construction," rejected because the two status enums are unrelated types and a data-driven shape turns a wiring mistake into a runtime no-op instead of a compile error. Actual GitHub issue closure is a maintainer action, not automated here.

## Deviations from Plan

None - plan executed exactly as written. The `subscribeToStatusTopic` parameter rename (above) was a same-task correction inside Task 1/3's own acceptance-criteria loop (the guard failure surfaced it during Task 3's verification, before any commit), not a deviation from the plan's stated shape -- the plan's own `<interfaces>` block already named the parameter `connection` in prose, and the fix aligns the implementation with the guard's literal expectation from that same plan.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 95 is complete** -- all four plans (95-01 peer confirmation & disposal guards, 95-02 poll gating, 95-03 port constant consolidation, 95-04 widget consolidation) are committed.
- **Two intended observable changes to declare at end-of-phase UAT, never as no-observable-delta:**
  1. The java-interop status-bar widget now shows a tooltip on hover (this plan, D-14) -- confirm it renders the wrong-peer/connected/disconnected/checking text correctly and does not collide visually with the BBj widget's existing tooltip.
  2. A squatting peer on the configured port now reports the wrong-peer state with a reason-varying banner instead of "Java: Connected" (plan 95-01, D-01/D-04/D-05).
- **Human-check outstanding for end-of-phase UAT** (per `workflow.human_verify_mode=end-of-phase`), per Task 3's `<verify><human-check>` block: with a `.bbj` file selected both widgets are visible; on a `BBx Config` file and a non-BBj tab both are hidden on the click itself; both popup menus and every item work (Restart Server/Open Settings/Show Server Log on the BBj widget, Reconnect/Open Settings on the Java widget, both Open Settings items landing on the same BBj settings page); the Java widget's new tooltip renders; both widgets transition correctly through their full status ranges including the wrong-peer state against a squatting backend.
- **#620 is closable** with the base-plus-thin-subclasses deviation from its literal "single data-driven registration" wording recorded above; actual GitHub issue closure is a maintainer action.
- The installable plugin at `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` was built from the tree carrying all four of this phase's plans (no code-review fixes exist yet -- rebuild after any land).
- Phase 96 discussion must still confirm the PLAT-03 file-disjointness correction plan 95-01 recorded (its edit to `BbjJavaInteropNotificationProvider.java` invalidates ROADMAP's "file-disjoint from Phases 93-95" claim for Phase 96).

## Self-Check: PASSED

All 7 created/modified source files verified present on disk via `[ -f ]`. All 3 task commit hashes
(`c9e50ea2`, `ec38a4cc`, `83557d44`) verified present via `git log --oneline --all`. `plugin.xml`
confirmed unmodified via `git diff --exit-code`. `BbjStatusBarWidgetSourceGuardTest`,
`Lsp4ijImportAllowlistTest`, and `BbjFileVisibilityTest` all pass. Whole IntelliJ JUnit suite green
under `./gradlew test --rerun-tasks` (1040 tests, 0 failures, 0 errors, 0 skipped, task executed not
UP-TO-DATE). `./gradlew buildPlugin` produced `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`.
No `D-NN`, plan-number, `C-`/`CR-`/`COMP-` planning identifier survives in any `.java` file across
this plan's diff or the whole phase's diff (`git diff ddbda609 HEAD -- '*.java'`); GitHub issue
numbers (`#610`, `#620`) are unaffected by that sweep, as intended.

---
*Phase: 95-java-interop-status-accuracy-widget-consolidation*
*Completed: 2026-09-19*
