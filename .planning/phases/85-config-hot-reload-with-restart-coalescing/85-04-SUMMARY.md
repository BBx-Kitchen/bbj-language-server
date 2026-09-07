---
phase: 85-config-hot-reload-with-restart-coalescing
plan: 04
subsystem: config
tags: [lsp4ij, gson, json-notification, restart-coalescing, intellij]

requires:
  - phase: 85-config-hot-reload-with-restart-coalescing
    provides: "bbj/configReloadRequired notification (CONFIG_RELOAD_METHOD, ConfigReloadReason, ConfigReloadNotification) pushed by the language server once quiescence and relevance both agree a restart is warranted"
  - phase: 84-config-path-resolution-discoverability-foundation
    provides: "ConfigModels, BbjLanguageClient's @JsonNotification handler shape, BbjConfigPathService, and the JSON-boundary/request-contract/source-guard test families this plan's notification joins"
provides:
  - "ConfigModels.ConfigReloadNotification -- the Gson DTO mirroring config-reload-notification.ts's path/reason payload"
  - "BbjLanguageClient.configReloadRequired -- the @JsonNotification(\"bbj/configReloadRequired\") handler that funnels into BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)"
  - "ConfigReloadPresentation -- the platform-free seam (reasonLabel, widgetTooltip, consoleLine, clearsReason) covering every reload-reason presentation decision with plain JUnit"
  - "BbjServerService.setRestartReason/getRestartReason -- the reason field the status widget's tooltip reads, cleared on started or on abandoned auto-restart"
affects: [86, 87]

actuals:
  tokens: 8710
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Platform-free presentation seam (ConfigReloadPresentation) with a private constructor and only static methods, following ConfigPaths.java's convention -- no com.intellij or LSP4IJ import, every branch exercised by plain JUnit"
    - "Cross-language contract test reading both a TypeScript source file and Java sources as plain text (Files.readString), never parsed, following ComposerRequestContractTest's convention"
    - "Whole-file source-guard test with comment-stripping before occurrence counting, so a prose comment can neither satisfy nor break an assertion"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigReloadPresentationTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigReloadNotificationContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientRestartSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java

key-decisions:
  - "BbjServerService.RESTART_DEBOUNCE_MS widened from private to public rather than duplicating the literal 500 at the new call site -- one named constant is the only source of the coalescing delay on either restart trigger"
  - "ConfigReloadPresentation.clearsReason clears only on the started state or on an abandoned auto-restart (crashCount >= 2, hoisted into a local in BbjServerService.updateStatus) -- a plain stopped is deliberately excluded because a restart legitimately passes through it, and clearing there would blank the tooltip mid-reload"
  - "The cross-language contract test checks DTO field names as unquoted TypeScript interface members (word-boundary match) rather than quoted literals -- config-reload-notification.ts declares path/reason as plain interface fields (path: string | null;), not JSON string literals, so the check was adapted to what the actual source contains rather than the plan's literal wording"
  - "The restart-path source guard declares the LSP4IJ server-manager type name (LanguageServerManager) as a private constant in the test itself rather than reading it reflectively from BbjServerService.java -- simpler and equally effective at keeping the prohibited type name out of hard-coded prose"
  - "Removed an initial D-13/D-14 identifier reference from the source-guard test's assertion message before committing -- caught by a register-check grep of the diff per project convention (no plan/decision ids in source or test comments)"

requirements-completed: [CFG-03]

coverage:
  - id: D1
    description: "A bbj/configReloadRequired notification deserializes through LSP4IJ's own MessageJsonHandler into ConfigModels.ConfigReloadNotification with field names pinned to the TypeScript payload by a cross-language contract test"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "ConfigModelsJsonBoundaryTest#aConfigReloadRequiredNotificationParsesThroughTheLsp4jGsonWithEveryFieldPopulated"
        status: pass
      - kind: unit
        ref: "ConfigModelsJsonBoundaryTest#aConfigReloadRequiredNotificationWithNullPathParsesWithoutThrowing"
        status: pass
      - kind: unit
        ref: "ConfigModelsJsonBoundaryTest#aConfigReloadRequiredNotificationWithAnUnknownReasonParsesWithoutThrowing"
        status: pass
      - kind: unit
        ref: "ConfigReloadNotificationContractTest (5 tests: name, namespace, reason tokens, field names, composer-proxy absence)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The handler funnels into the existing coalescing restart entry point (BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)) and never touches the LSP4IJ server-manager type directly; a source guard fences both"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "BbjLanguageClientRestartSourceGuardTest#theHandlerRequestsRestartExactlyOnceThroughTheServiceWithTheSharedDebounceConstant"
        status: pass
      - kind: unit
        ref: "BbjLanguageClientRestartSourceGuardTest#theHandlerNeverTouchesTheLsp4ijServerManagerDirectly"
        status: pass
    human_judgment: false
  - id: D3
    description: "The reload reason reaches the existing status widget's tooltip and one console line, with no new balloon, and clears on success and on abandoned auto-restart rather than sticking"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "ConfigReloadPresentationTest (6 tests: reasonLabel, widgetTooltip, consoleLine, clearsReason branches)"
        status: pass
      - kind: unit
        ref: "BbjLanguageClientRestartSourceGuardTest#theConfigReloadHandlerRaisesNoNotificationBalloon"
        status: pass
      - kind: unit
        ref: "BbjLanguageClientRestartSourceGuardTest#theConfigReloadHandlerLogsExactlyOneConsoleLine"
        status: pass
    human_judgment: false
  - id: D4
    description: "ComposerRequestContractTest is untouched and still green -- the new notification was not added to its reflectively-derived DECLARED_REQUESTS set"
    requirement: CFG-03
    verification:
      - kind: unit
        ref: "ComposerRequestContractTest (all 4 tests, re-run after this plan's changes)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-07
status: complete
---

# Phase 85 Plan 04: IntelliJ Config Hot-Reload With Restart Coalescing Summary

**IntelliJ now receives the server's `bbj/configReloadRequired` push, funnels it through the exact same 500ms `RestartGate`-backed coalescing entry point the settings-apply flow uses, and surfaces the reload reason in the existing status widget tooltip and console — no new balloon, no second restart path.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-07T02:38:00Z (approx.)
- **Completed:** 2026-09-07T02:45:00Z (approx.)
- **Tasks:** 3 completed (Task 1 tracer, Task 2 tdd, Task 3 auto)
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments
- Added `ConfigModels.ConfigReloadNotification` (`path`, `reason`) mirroring `config-reload-notification.ts`'s payload exactly, and widened `BbjServerService.RESTART_DEBOUNCE_MS` to `public` so the new handler reuses the identical debounce constant `scheduleRestart()` already uses — no duplicated literal.
- `BbjLanguageClient.configReloadRequired`, a new `@JsonNotification("bbj/configReloadRequired")` handler, logs one console line and requests a restart through `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` only — verified end-to-end via the `MessageJsonHandler` round trip (Task 1's tracer feedback gate re-ran `ConfigModelsJsonBoundaryTest` and `compileJava` after GREEN and passed, so expansion proceeded without a checkpoint).
- Built `ConfigReloadPresentation`, a platform-free seam (`reasonLabel`, `widgetTooltip`, `consoleLine`, `clearsReason`) covering every reload-reason presentation decision with plain JUnit — no `com.intellij` or LSP4IJ import anywhere in the file.
- Wired the reason through `BbjServerService` (`pendingRestartReason` volatile field, `setRestartReason`/`getRestartReason`, cleared via `ConfigReloadPresentation.clearsReason` on `started` or on an abandoned auto-restart) and into `BbjStatusBarWidget`'s tooltip; the widget's five status text literals are unchanged.
- Fenced the whole surface with a cross-language contract test (`ConfigReloadNotificationContractTest`: notification name, `bbj/` namespace, all three reason tokens, both DTO field names, and the notification's absence from `BbjComposerServer`'s proxy interface) and a comment-stripping source guard (`BbjLanguageClientRestartSourceGuardTest`: exactly one `requestRestart(` call using the shared constant, zero references to `LanguageServerManager`, zero `createNotification(`/exactly one `logToConsole(` inside the handler's own body).

## Task Commits

1. **Task 1: End-to-end "a reload notification becomes one coalesced restart" (tracer)**
   - `cfa5f208` feat(85-04): IntelliJ configReloadRequired DTO, handler and coalesced restart
   - Tracer feedback gate: re-ran `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.ConfigModelsJsonBoundaryTest'` and `./gradlew compileJava --offline` after GREEN — both passed (auto-mode re-verify per the tracer gate). Logged: tracer verified end-to-end — expanding.
2. **Task 2: The reason reaches the status widget and clears instead of sticking (tdd)**
   - `240bc54f` test(85-04): add failing test for config-reload presentation seam
   - `6d164e3b` feat(85-04): reload reason reaches the status widget and clears correctly
3. **Task 3: Cross-language contract and the restart-path source guard**
   - `55c0e712` test(85-04): cross-language contract and restart-path source guard

_Task 2 carried `tdd="true"` and produced a genuine RED (`ConfigReloadPresentation` does not exist, 15 compile errors) before its GREEN commit made all 6 new tests pass. No `refactor(...)` commit was needed in any task._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigModels.java` — new nested DTO `ConfigReloadNotification` (`path`, `reason`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` — new platform-free seam: `reasonLabel`, `widgetTooltip`, `consoleLine`, `clearsReason`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` — new `@JsonNotification("bbj/configReloadRequired")` handler `configReloadRequired`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — `RESTART_DEBOUNCE_MS` widened to public; new `pendingRestartReason` field with `setRestartReason`/`getRestartReason`; cleared via `ConfigReloadPresentation.clearsReason` in `updateStatus`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` — new tooltip assignment in `updateStatus`'s `invokeLater` block
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java` — new `parseNotification` helper plus three notification round-trip cases
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigReloadPresentationTest.java` — new, 6 tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigReloadNotificationContractTest.java` — new, 5 tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientRestartSourceGuardTest.java` — new, 4 tests

## Decisions Made
- `RESTART_DEBOUNCE_MS` widened from `private` to `public` rather than duplicating the literal 500 at the new call site — keeps one named constant as the single source of the coalescing delay.
- `clearsReason` clears only on `started` or on an abandoned auto-restart (the existing `crashCount >= 2` branch, hoisted into a local) — a plain `stopped` deliberately does not clear, since a restart legitimately passes through it and clearing there would blank the tooltip mid-reload.
- The contract test checks the two DTO field names as unquoted TypeScript interface members (word-boundary match) rather than quoted literals: `config-reload-notification.ts` declares `path`/`reason` as plain interface members (`path: string | null;`), not JSON string literals — the check follows the actual source rather than the plan's literal wording, per this plan's own instruction that the code wins over the plan's expectations when they differ.
- The source guard declares the LSP4IJ server-manager type name (`LanguageServerManager`) as a private constant in the test itself, with an explanatory message, rather than reading it reflectively from `BbjServerService.java` — simpler, and the plan explicitly allowed either approach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking-issue self-fix, code-comment hygiene] Removed a stray decision-id reference before committing**
- **Found during:** Task 3, pre-commit register check
- **Issue:** An early draft of `BbjLanguageClientRestartSourceGuardTest`'s no-balloon assertion message included `(D-13/D-14)`, violating the project's code-comment hygiene rule (no `D-xx`/`C-xx`/`COMP`/`CR-xx` identifiers in source or test comments).
- **Fix:** Reworded the assertion message to drop the identifier reference while keeping the same explanation.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientRestartSourceGuardTest.java`
- **Verification:** Re-ran the register-check grep (`D-[0-9]+|C-[0-9]+|COMP|CR-[0-9]+`) across every file this plan touched — zero matches; re-ran the affected test class — still green.
- **Committed in:** `55c0e712` (part of Task 3's commit; caught before the commit was made, so no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (Rule 3 — code-comment hygiene self-fix, caught during the mandatory pre-commit register check rather than after committing). **Impact:** None — a pure wording fix in a test assertion message, no behavior change.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. This plan adds no package-manager dependency and no new Gradle pin; the IntelliJ side consumes a notification the language server already pushes as of `85-01`/`85-02`/`85-03`.

## Next Phase Readiness

This is the last plan of Phase 85. Both IDEs now hot-reload on a consumed-config change:
VS Code via `85-03`'s restart choke point, IntelliJ via this plan's handler — both reusing
their pre-existing coalescing entry points, both fenced by cross-language contract tests and
source guards, both surfacing the reason without a new balloon. CFG-03 (#486) is complete.
Phase 87 (the IntelliJ SETOPTS composer) can now rely on the self-write-suppression guarantee
`85-01`'s relevance gate established — a SETOPTS-only edit produces zero reload notifications,
so no dialog-aware restart deferral is needed for that phase to be safe.

No blockers or concerns.

## Self-Check: PASSED

- All key-files.created verified present on disk: `ConfigReloadPresentation.java`,
  `ConfigReloadPresentationTest.java`, `ConfigReloadNotificationContractTest.java`,
  `BbjLanguageClientRestartSourceGuardTest.java`.
- All 4 task/plan commit hashes (`cfa5f208`, `240bc54f`, `6d164e3b`, `55c0e712`) confirmed
  present via `git log --oneline`.
- Full plan `<verification>` re-run: `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.*' --tests 'com.basis.bbj.intellij.lsp.*' --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'` and `./gradlew build --offline` — both exit 0, `BUILD SUCCESSFUL`.

---
*Phase: 85-config-hot-reload-with-restart-coalescing*
*Completed: 2026-09-07*
