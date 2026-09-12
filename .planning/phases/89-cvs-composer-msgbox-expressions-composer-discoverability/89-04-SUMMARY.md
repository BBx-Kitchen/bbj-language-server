---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 04
subsystem: composer-discoverability
tags: [intellij, lsp4ij, codevision, composer, java]

# Dependency graph
requires:
  - phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
    provides: "plan 89-01's bbj.openComposerAt lens command contract (composer-lens-contract.ts) and server-side textDocument/codeLens cue"
provides:
  - ComposerLensKinds — the pure wire-kind to ComposerLauncher.Kind mapping and the OPEN_COMPOSER_AT_COMMAND constant, no IntelliJ import
  - ComposerModels.ComposerLensTarget — the {kind, uri, line, character} DTO a cue's command argument carries
  - ComposerLauncher.launchAt(project, editor, kind, line, column, fromCue) — opens any existing composer at an explicit position, bounds-checked, with a stale-cue guard
  - BbjOpenComposerAtAction — the LSPCommandAction LSP4IJ's CommandExecutor dispatches a composer cue click to, id bbj.openComposerAt, EDT-pinned
  - A twelve-file LSP4IJ import allowlist and four new reflective canaries for LSPCommandAction/LSPCommand/CommandExecutor
  - Cross-language pinning: ComposerLensCommandContractTest ties the command id and every mapped wire kind to composer-lens-contract.ts and plugin.xml
affects: [89-06-intellij-code-vision-render-spike, 89-12-cvs-kind-wiring]

# Actuals (#2632)
actuals:
  tokens: 10144
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LSP4IJ Code Vision click dispatch: a server-computed command argument (ComposerLensTarget) is routed by an IntelliJ action whose id equals the command string, with zero re-implementation of the server's applicability decision"
    - "Explicit-position launch as a superset of caret-driven launch: launchAt(line, column, fromCue) owns the flow/switch body; launch(kind) captures the caret and delegates, keeping every existing caller's behavior byte-identical"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLensKinds.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensKindsTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtActionSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensCommandContractTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java

key-decisions:
  - "launchAt bounds-checks only the line against the live document's current line count (stale -> staleDocument notice, never compose-new); column is clamped to the resolved line's length rather than treated as a second staleness signal, matching how an out-of-range caret column is already tolerated elsewhere in this class."
  - "The fromCue stale-check is a small private predicate (staleForCue) applied at each switch branch's decoded-callback call site, not inside openMsgbox/openAddWindow/etc. -- every existing openX method's signature and body stayed byte-identical, and the guard-retry lambdas inside those methods (a different, narrower stale-write scenario) were left calling the caret-driven launch(...) unchanged."
  - "BbjOpenComposerAtAction uses Optional.ifPresentOrElse over ComposerLensKinds.launcherKindOf(target.kind) rather than an if/else, satisfying the plan's exact literal call ComposerLauncher.launchAt(project, editor, kind, target.line, target.character, true) inside the present branch."

patterns-established:
  - "A composer cue's command argument DTO keeps its discriminator (kind) as a plain wire string, never a Java enum, at both the ComposerModels.ComposerLensTarget and ComposerLensKinds.launcherKindOf boundary -- a kind the server adds later before this plugin routes it (cvs, until plan 89-12) parses without throwing and is reported via a request-failed notice, not a crash."

requirements-completed: [DISC-01]

coverage:
  - id: D1
    description: "ComposerLensKinds maps the five currently-handled wire kinds (msgbox, addwindow, addchildwindow, setopts-in-code, setopts-config) to their ComposerLauncher.Kind, leaves cvs/unknown/null/empty as empty, and exposes the OPEN_COMPOSER_AT_COMMAND constant and mappedWireKinds() set"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/ComposerLensKindsTest.java (#650)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ComposerLauncher.launchAt opens any existing composer at an explicit line/column: an out-of-range line renders staleDocument and never decodes; a fromCue launch whose decode comes back not-found renders staleDocument instead of falling through to compose-new; launch(kind) is an unchanged-behavior wrapper that captures the caret and delegates"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/ComposerLauncherChainSourceGuardTest.java and test/ComposerApplyGuardSourceGuardTest.java, re-run green after the refactor (#650)"
        status: pass
    human_judgment: false
  - id: D3
    description: "LSP4IJ's bbj.openComposerAt command lands on BbjOpenComposerAtAction, which is EDT-pinned (overriding LSP4IJ's default BGT), visible only when CommandExecutor.LSP_COMMAND is present, and routes the decoded target to launchAt(..., true) with no applicability decision of its own; an unmapped kind renders a request-failed notice instead of routing"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/BbjOpenComposerAtActionSourceGuardTest.java, test/Lsp4ijImportAllowlistTest.java (twelve-file allowlist), test/Lsp4ijCouplingCanaryTest.java (four new pinned members) (#650)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The command id and every mapped wire kind are pinned across the language boundary: ComposerLensCommandContractTest reads composer-lens-contract.ts and plugin.xml as plain text and fails if either side renames the command or a mapped kind alone; ComposerModelsJsonBoundaryTest proves a ComposerLensTarget argument (including an unknown future kind) parses through the real lsp4j Gson"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/ComposerLensCommandContractTest.java, test/ComposerModelsJsonBoundaryTest.java#aComposerLensTargetCommandArgumentParsesThroughTheLsp4jGson and #anUnknownCueKindStillParses (#650)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visible Code Vision rendering and clicking in a running IntelliJ IDE actually opens the right composer at the cue's own line"
    verification: []
    human_judgment: true
    rationale: "This plan proves the click-target wiring (action id, EDT thread, routing, contract) entirely from source/unit/reflective tests. No IntelliJ sandbox render or click was exercised here -- plan 89-06 stages that live IntelliJ Code Vision render/click spike, as this plan's own <output> instructions require stating."

duration: 8min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 04: IntelliJ Composer Cue Click Target Summary

**LSP4IJ's `bbj.openComposerAt` Code Vision click now lands on a new EDT-pinned `BbjOpenComposerAtAction` that opens the exact composer the cue marks — via a new `ComposerLauncher.launchAt(line, column, fromCue)` entry point — never wherever the caret happens to sit, with the vendor coupling and the cross-language command contract pinned by tests.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-12T08:13:05Z
- **Completed:** 2026-09-12T08:21:29Z
- **Tasks:** 3
- **Files modified:** 11 (5 created, 6 modified)

## Accomplishments
- `ComposerLensKinds` — a pure, IntelliJ-import-free mapping from the server's five currently-handled wire kinds (`msgbox`, `addwindow`, `addchildwindow`, `setopts-in-code`, `setopts-config`) to `ComposerLauncher.Kind`, plus the `OPEN_COMPOSER_AT_COMMAND = "bbj.openComposerAt"` constant and `mappedWireKinds()`. `cvs`/unknown/null/empty all map to empty, deferring CVS routing to plan 89-12.
- `ComposerModels.ComposerLensTarget` — the `{kind, uri, line, character}` DTO mirroring the command argument `bbj-vscode/src/composer-lens-contract.ts` defines, with `kind` kept a plain string so a future wire kind parses rather than throws.
- `ComposerLauncher.launchAt(project, editor, kind, line, column, fromCue)` now owns the flow-construction and kind-switch body every caret-driven `launch(kind)` call used to run directly; `launch` is an unchanged-behavior thin wrapper that captures the caret and delegates with `fromCue = false`. An out-of-range `line` renders `staleDocument` before any decode; `column` is clamped to the resolved line's length. When `fromCue` is `true`, a not-found decode also renders `staleDocument` instead of falling through to compose-new — implemented as a small `staleForCue` predicate at each switch branch's call site so every `openX` method's signature and body stayed byte-identical.
- `BbjOpenComposerAtAction extends LSPCommandAction`, registered in `plugin.xml` as `bbj.openComposerAt` with no menu placement and no keyboard shortcut (LSP4IJ's `CommandExecutor` is the only thing that ever invokes it). It overrides `getCommandPerformedThread()` to `ActionUpdateThread.EDT` (LSP4IJ's default is `BGT`, but the launcher reads the document and opens modal dialogs), is visible only when `CommandExecutor.LSP_COMMAND` is present, and routes `command.getArgumentAt(0, ComposerLensTarget.class)` through `ComposerLensKinds.launcherKindOf` to `ComposerLauncher.launchAt(..., true)` — an unmapped kind renders a request-failed notice instead.
- The LSP4IJ import allowlist grew from eleven files to twelve; `Lsp4ijCouplingCanaryTest` gained a new test pinning `LSPCommandAction.commandPerformed` (abstract), `getCommandPerformedThread` (non-final), `LSPCommand.getArgumentAt(int, Class)` and `CommandExecutor.LSP_COMMAND`, and measured (not assumed) that none of the three classes carry LSP4IJ's experimental class-file marker in the pinned 0.21.0 jar.
- Cross-language pinning: `ComposerLensCommandContractTest` reads `composer-lens-contract.ts` and `plugin.xml` as plain text, asserting the command id and every mapped wire kind appear as quoted literals on the server side and the plugin descriptor declares the id exactly once. `ComposerModelsJsonBoundaryTest` gained two cases proving a `ComposerLensTarget` command argument — including an unrecognized `kind` — parses through the real lsp4j `MessageJsonHandler` Gson. `BbjOpenComposerAtActionSourceGuardTest` pins the action's single `launchAt(..., true)` call site, its EDT thread override, that it never falls back to caret-driven `launch(`, and that it performs no text mutation of its own.

## Task Commits

1. **Task 1: Explicit-position launch — cue kinds map to launcher kinds, and a stale cue never composes new**
   - `19b2df91` test(89-04): add failing test for ComposerLensKinds wire-kind mapping
   - `ede08c14` feat(89-04): explicit-position launch — cue kinds map to launcher kinds
2. **Task 2: The cue action — LSP4IJ's command lands on an EDT action that routes to `launchAt`**
   - `d22befee` feat(89-04): the cue action — LSP4IJ's command lands on an EDT action
3. **Task 3: Pin the cue contract — command argument through lsp4j Gson, action source guard, cross-language command id**
   - `afd9399f` feat(89-04): pin the cue contract across the wire boundary

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; its own `<verify>` (the full composer test suite) was re-run end-to-end after the commit per the auto-mode tracer feedback gate before Task 2 began, and passed._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLensKinds.java` - Wire-kind to `ComposerLauncher.Kind` mapping, command id constant
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - `launchAt`, `staleForCue`; `launch` refactored to a thin caret-capturing wrapper
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - `ComposerLensTarget` DTO
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtAction.java` - New file: the LSP4IJ Code Vision click target action
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registers `bbj.openComposerAt`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensKindsTest.java` - Table-style wire-kind mapping tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtActionSourceGuardTest.java` - New file: action wiring source guard
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensCommandContractTest.java` - New file: cross-language command id/kind contract
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` - Allowlist grows to twelve files
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` - New canary for the four command-dispatch members
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - Two new `ComposerLensTarget` round-trip cases

## Decisions Made
- `launchAt` bounds-checks only the line against the document's current line count; column is clamped rather than treated as a second staleness signal (matches existing caret-column tolerance elsewhere in the class).
- The `fromCue` stale-check is a small predicate applied at each switch branch's call site, not inside `openMsgbox`/`openAddWindow`/etc. — every existing `openX` method's signature and body stayed byte-identical, and the `StaleEditGuard` retry lambdas inside those methods (a different, write-time stale scenario) were deliberately left calling the caret-driven `launch(...)` unchanged.
- `BbjOpenComposerAtAction` uses `Optional.ifPresentOrElse` over `ComposerLensKinds.launcherKindOf(target.kind)` to reach the plan's exact literal `ComposerLauncher.launchAt(project, editor, kind, target.line, target.character, true)` call in the present branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] XML comment containing "--" broke `patchPluginXml`**
- **Found during:** Task 2 (registering the action in `plugin.xml`)
- **Issue:** The first attempt at the registration comment used a double-dash (`--`) inside an XML comment, which is illegal XML and failed `./gradlew`'s `patchPluginXml` task with `JDOMParseException: The string "--" is not permitted within comments.`
- **Fix:** Reworded the comment to use a colon instead of a dash-delimited clause.
- **Files modified:** `bbj-intellij/src/main/resources/META-INF/plugin.xml`
- **Verification:** `./gradlew test --offline --tests 'com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest' --tests 'com.basis.bbj.intellij.lsp.Lsp4ijCouplingCanaryTest'` builds and passes.
- **Committed in:** `d22befee` (fixed before the Task 2 commit; never landed broken)

**2. [Rule 1 - Bug] Removed decision/threat-id references from three new comments**
- **Found during:** post-implementation register check (project rule: no plan/decision/threat ids in source or test comments)
- **Issue:** Comments written during Tasks 2-3 cited `D-06`, `D-07` and `T-89-11` directly in `BbjOpenComposerAtAction.java`, `ComposerLauncher.java`, `BbjOpenComposerAtActionSourceGuardTest.java` and `Lsp4ijCouplingCanaryTest.java`.
- **Fix:** Reworded each comment to keep the descriptive prose (and the `#650` issue reference where already present) while dropping the bare decision/threat-id tokens.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtAction.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtActionSourceGuardTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java`
- **Verification:** `git diff` over the full plan range for `bbj-intellij/src` shows zero matches for `D-[0-9]|89-0[0-9]|Pitfall|CR-[0-9][0-9]|T-89-`; the full test suite (`./gradlew test --offline`) still passes after the edit.
- **Committed in:** `afd9399f`

---

**Total deviations:** 2 auto-fixed (1 bug — illegal XML syntax caught before it ever landed broken, 1 comment-discipline cleanup with zero behavior change).
**Impact on plan:** No scope creep. Both fixes are process/syntax corrections; no production behavior changed as a result of either.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The IntelliJ click-target half of DISC-01 is in place: `BbjOpenComposerAtAction` is registered, EDT-pinned, and routes a server-computed cue target through `ComposerLauncher.launchAt` with no applicability decision of its own.
- Plan 89-06's IntelliJ Code Vision render/click spike can now exercise this action against a live LSP4IJ Code Vision entry — no IntelliJ sandbox render or click was performed in this plan.
- Plan 89-12 can wire the `cvs` kind into `ComposerLensKinds` once `ComposerLauncher.Kind.CVS` exists (plan 89-08) — `launcherKindOf("cvs")` is already specified to be empty until then, and this plan's contract test (`ComposerLensCommandContractTest`) will keep passing unchanged when that kind is added, since it asserts against `mappedWireKinds()`, not a hard-coded set.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

All 11 created/modified source and test files verified present on disk (`ComposerLensKinds.java`,
`BbjOpenComposerAtAction.java`, `ComposerLensKindsTest.java`, `BbjOpenComposerAtActionSourceGuardTest.java`,
`ComposerLensCommandContractTest.java`, `ComposerLauncher.java`, `ComposerModels.java`, `plugin.xml`,
`Lsp4ijImportAllowlistTest.java`, `Lsp4ijCouplingCanaryTest.java`, `ComposerModelsJsonBoundaryTest.java`).
All 4 commit hashes (`19b2df91`, `ede08c14`, `d22befee`, `afd9399f`) verified present in `git log`.
Plan-level `<verification>` steps 1-2 re-run and passing (targeted composer/lsp/actions tests, full
`./gradlew test --offline` whole-suite); step 3 (register check) re-run across the full plan diff
range with zero matches for plan/decision/threat ids.
