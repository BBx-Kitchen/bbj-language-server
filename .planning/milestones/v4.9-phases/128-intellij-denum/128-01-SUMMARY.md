---
phase: 128-intellij-denum
plan: 01
subsystem: intellij-plugin
tags: [intellij, lsp4j, gson, denum, line-numbering, actions]

requires:
  - phase: 126
    provides: server-side bbj/denum request that applies its own edit through workspace/applyEdit and shows every outcome
provides:
  - "bbj/denum on the single BbjComposerServer proxy interface with DenumParams/DenumResult DTOs"
  - "Denumber BBj Program action (bbj.denumber) in the Tools and editor menus directly after Compile"
  - "public static BbjDenumberAction.denumber(project, file) shared request entry point for the banner"
  - "LineNumbering.isLineNumberedSource, a Java port of the client detection rule, with a drift guard"
affects: [128-02, 128-03, 128-04]

actuals:
  tokens: 8850
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "client words no outcome: the DenumResult is discarded, only a transport failure shows one escaped error balloon"
    - "opaque JsonElement for a server-applied edit so an out-of-int-range position cannot reject the answer"
    - "plain-text drift guard between a Java port and the TypeScript rule it mirrors"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/LineNumbering.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjDenumberAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/LineNumberingTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/LineNumberingContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/DenumModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjDenumberActionSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java

key-decisions:
  - "Transport failure uses one 'Denumber failed' error balloon whose detail is XML-escaped; no success, warning or console wording on the client"
  - "Timeout of 60 s for both the server lookup and the denum answer, above the server's 15 s peer deadline plus 30 s apply wait"
  - "Action update gates on the resolved file type name (never an extension) so config.bbx stays hidden"

patterns-established:
  - "Shared static entry point on the action so the banner runs the same request path"

requirements-completed: [IJF-05]

coverage:
  - id: D1
    description: "bbj/denum is declared on the proxy interface and pinned against denum-command.ts (seventeen request names)"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij ComposerRequestContractTest (whole class)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Denumber BBj Program sits after Compile in the Tools and editor menus, no keystroke, no Project View entry; request is sent once from a background task, never saves, shows only a transport failure"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij BbjDenumberActionSourceGuardTest (whole class)"
        status: pass
    human_judgment: true
    rationale: "Menu placement, greyed-out versus hidden rendering and the real round trip against a live server are only observable in the IDE; the hand check in the closing plan confirms them"
  - id: D3
    description: "The Java line-numbering detector matches the TypeScript rule case for case and fails the suite when either side drifts"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij LineNumberingTest (19 cases) and LineNumberingContractTest"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real bbj/denum answer with the applied edit (position beyond int range) and diagnostics parses through LSP4J's Gson"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij DenumModelsJsonBoundaryTest (whole class)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-10-03
status: complete
---

# Phase 128 Plan 01: Denumber BBj Program action Summary

**IntelliJ "Denumber BBj Program" action sending bbj/denum from a background task, enabled by a Java port of the client line-number rule, with the answer parsed through LSP4J's Gson and the client wording nothing**

## Performance

- **Duration:** about 12 min
- **Started:** 2026-10-03T12:32Z
- **Completed:** 2026-10-03T12:44Z
- **Tasks:** 3
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments
- `bbj/denum` declared on `BbjComposerServer` with `DenumParams(uri)` and a `DenumResult` whose `edits` is an opaque `JsonElement`; the contract test now lists seventeen request names and reads `denum-command.ts`.
- `BbjDenumberAction` registered as `bbj.denumber` directly after `bbj.compile` in the Tools menu and the editor context menu, no default keystroke, no Project View entry; the static `denumber(project, file)` is the single request path the banner will reuse.
- `LineNumbering.isLineNumberedSource` ports the TypeScript rule as a character loop (JavaScript whitespace set, ASCII digits, 20-line cap, 3-line minimum); the item is enabled on a line-numbered BBj program, visible but disabled on an unnumbered one, hidden for no editor, non-BBj files and `config.bbx`.
- Whole IntelliJ suite green under `./gradlew cleanTest test`: 1200 tests, 0 failures, 0 skipped.

## Task Commits

1. **Task 1: action and bbj/denum request (tracer)** - `bfd79c52` (feat)
2. **Task 2: line-numbering gate (TDD)** - RED `cceeaf73` (test), GREEN `9f27b215` (feat)
3. **Task 3: bbj/denum answer parsing** - `bfb56e19` (test)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumModels.java` - Gson DTOs mirroring `denum-command.ts`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/LineNumbering.java` - plain-Java port of `isLineNumberedSource`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjDenumberAction.java` - the action, its BGT update rule and the shared request entry point
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` - `denum` request declaration
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - `bbj.denumber` action element
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - seventeen names, `denum-command.ts`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` - fake server implements the new method
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/LineNumberingTest.java`, `LineNumberingContractTest.java`, `DenumModelsJsonBoundaryTest.java`, `actions/BbjDenumberActionSourceGuardTest.java` - new tests

## Decisions Made
- Transport failure is a single "Denumber failed" error balloon with an XML-escaped detail (no server, timeout, interrupt, or the cause's message / simple class name); the result is discarded and nothing is written to the console, matching the VS Code behaviour.
- `DENUM_TIMEOUT_SECONDS = 60` covers both the server lookup and the denum answer.
- `update` gates on the resolved file type name only, never an extension.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test fake did not implement the new interface method**
- **Found during:** Task 1 (first Gradle verify)
- **Issue:** `FakeComposerServer` in `ComposerFlowTest` implements `BbjComposerServer`, so adding `denum` broke test compilation; the file was not in the plan's file list.
- **Fix:** added a `denum` override throwing `UnsupportedOperationException`, like the other unused methods.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java`
- **Verification:** targeted Task 1 tests and the whole suite compile and pass.
- **Committed in:** `bfd79c52` (Task 1 commit)

**2. [Process note] Task 3 had no RED run**
- Task 3's tests exercise the DTOs written in Task 1, so they passed on first run; `DenumModels` needed no change, as the plan allowed for. The negative behaviours (oversized number would reject a typed model) are already covered by the existing compile boundary test.

---

**Total deviations:** 1 auto-fixed (1 blocking), 1 process note
**Impact on plan:** No scope creep; the fix was required for the interface change to compile.

## Issues Encountered
- `git add` of the tracked `plugin.xml` printed an "ignored path" hint because `bbj-intellij/src/main/resources/META-INF` matches an ignore rule; the file is tracked and was staged, so the first commit attempt (chained with `&&`) was simply re-run.

## Known Stubs
None. The `LineNumbering` stub used for the RED commit was replaced in the following commit.

## Threat Flags
None. No new surface beyond the plan's threat register: the action sends only the editor file's URI, never saves, and escapes the one balloon text.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `BbjDenumberAction.denumber(Project, VirtualFile)` is public and ready for the banner in 128-03; `DenumModels` is ready to receive the notification DTOs in 128-02.
- The runtime round trip (URI with a space and a non-ASCII character, greyed-out versus hidden in the editor context menu) is confirmed by the hand check in the closing plan.

## Self-Check: PASSED

All created files exist on disk, commits `bfd79c52`, `cceeaf73`, `9f27b215` and `bfb56e19` are in the log, every task's acceptance criteria passed, the register grep over the source diff printed nothing, `Lsp4ijImportAllowlistTest` is unchanged, nothing under `bbj-vscode/` changed, and `./gradlew cleanTest test` reported 1200 tests with 0 failures.

---
*Phase: 128-intellij-denum*
*Completed: 2026-10-03*
