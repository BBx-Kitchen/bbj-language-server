---
phase: 128-intellij-denum
plan: 02
subsystem: intellij-plugin
tags: [intellij, lsp4j, denum, console, notifications, source-guards]

requires:
  - phase: 128-intellij-denum
    provides: DenumModels (params/result DTOs) and the Denumber action from plan 01
  - phase: 126
    provides: server notifications bbj/denumDiagnostics and bbj/showDenumDiagnostics
provides:
  - "bbj/denumDiagnostics handler on BbjLanguageClient printing one plain-text block into the BBj Language Server console"
  - "bbj/showDenumDiagnostics handler showing the window at its last line without focus"
  - "DenumDiagnosticsPresenter: plain-Java rendering of the payload, mirroring VS Code's block"
  - "BbjServerService.scrollConsoleToEnd()"
affects: [128-03, 128-04]

actuals:
  tokens: 10300
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "console content is made to exist (getContentManager) before printing, because logToConsole drops text until the window was opened once"
    - "payload text is flattened to one line per entry and never becomes a link, command or path"
    - "literal JSON-RPC messages parsed through the client's own supported-method map in tests"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumDiagnosticsPresenter.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/DenumDiagnosticsPresenterTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/DenumNotificationContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientDenumNotificationTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientDenumSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java

key-decisions:
  - "The diagnostics notification never shows or focuses the window; only the Show reveal does, and it uses show() (no focus) so the editor keeps keyboard focus, matching VS Code"
  - "Header text and entry format match VS Code's block exactly so both IDEs print the same lines"
  - "line is a boxed Long so a missing value differs from 0 (no location) and no JavaScript safe integer rejects the whole notification"

patterns-established:
  - "Notification contract test pins names, fields, severities and header text between TypeScript and Java"

requirements-completed: []

coverage:
  - id: D1
    description: "A Denumber run's diagnostics print as one flattened plain-text block (header, then one line per valid entry in payload order, errors as error output) into the BBj Language Server console"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij DenumDiagnosticsPresenterTest (16 cases) and BbjLanguageClientDenumSourceGuardTest#theDiagnosticsHandlerRendersOnTheCallingThreadThenPrintsOnTheEdtAfterMakingTheConsoleExist"
        status: pass
    human_judgment: true
    rationale: "That getContentManager() really creates the console in a window never opened this session, and the colour of error lines, are only observable in a fresh IDE; the closing plan's hand check confirms them"
  - id: D2
    description: "Show reveals the console scrolled to its last line without taking focus; the reveal never reads its payload; both notifications are registered so LSP4IJ stops reporting them unsupported"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij BbjLanguageClientDenumNotificationTest and BbjLanguageClientDenumSourceGuardTest (whole classes)"
        status: pass
    human_judgment: true
    rationale: "Whether the payload-less notification reaches the handler as null and whether the window ends at its last line without stealing focus are runtime behaviours; confirmed by the hand check and an idea.log with no unsupported-notification line"
  - id: D3
    description: "TypeScript and Java sides of both notifications and the answer cannot drift: names, fields, severities, header text, and absence from the composer server interface"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij DenumNotificationContractTest (whole class)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No payload field can become a hyperlink, command or file to open on the client"
    requirement: IJF-05
    verification:
      - kind: unit
        ref: "bbj-intellij BbjLanguageClientDenumSourceGuardTest#nothingInTheClientCanTurnAPayloadFieldIntoALinkOrAFileToOpen"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-03
status: complete
---

# Phase 128 Plan 02: DENUM diagnostics console Summary

**IntelliJ prints DENUM's diagnostics as one flattened plain-text block in the BBj Language Server console (errors as error output, console created before printing) and reveals it at its last line without stealing focus, with both notifications pinned against the TypeScript contract**

## Performance

- **Duration:** about 6 min
- **Started:** 2026-10-03T12:43Z
- **Completed:** 2026-10-03T12:49Z
- **Tasks:** 2
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- `DenumDiagnosticsPresenter` renders `Denumber diagnostics for <path>:` (or `an unknown file`) then `  line <n>|no location[ (original <orig>)] <SEVERITY>: <message>` per valid entry in payload order; every control character and U+2028/U+2029 becomes a space, invalid entries are skipped, it never throws.
- `BbjLanguageClient.denumDiagnostics` renders on the calling thread, then on the EDT behind two disposal checks makes the console exist (`ensureLogConsole`) and prints each line (`ERROR_OUTPUT` for errors); it never shows or activates the window.
- `BbjLanguageClient.showDenumDiagnostics(Object)` shows the window with `show()` (no activate) and calls the new `BbjServerService.scrollConsoleToEnd()`; the parameter is never read.
- Four new test classes (35 tests) and the whole IntelliJ suite green: 1235 tests, 0 failures, 0 skipped (was 1200).

## Task Commits

1. **Task 1: diagnostics block (tracer, TDD)** - RED `7ddb12a3` (test), GREEN `047b01e3` (feat)
2. **Task 2: reveal and contract pins (TDD)** - RED `3e3c918b` (test), GREEN `0a5709c5` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumDiagnosticsPresenter.java` - plain-Java block rendering, no IntelliJ import
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/DenumModels.java` - `DenumDiagnosticsParams`, `DenumDiagnostic` (boxed `Long line`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` - the two handlers and `ensureLogConsole`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` - `scrollConsoleToEnd()`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/DenumDiagnosticsPresenterTest.java`, `DenumNotificationContractTest.java`, `lsp/BbjLanguageClientDenumNotificationTest.java`, `lsp/BbjLanguageClientDenumSourceGuardTest.java` - new tests

## Decisions Made
- Show uses `ToolWindow.show()` without focus; the activate variants are forbidden by a source guard. This settles the open question in favour of leaving keyboard focus with the editor, as VS Code does.
- A catch of `RuntimeException` (not only the three named types) guards the file-uri to path conversion, so any unparsable uri (for example one with an authority or an embedded NUL) falls back to the uri as given.
- The presenter test for the file-uri header asserts a POSIX path; the suite already runs on Linux/macOS CI.

## Deviations from Plan

None - plan executed exactly as written. The RED run of Task 1 used a placeholder presenter (compiling stub) so the tests failed on behaviour rather than compilation, the same approach as the previous plan; the verify commands, acceptance criteria and register grep all passed.

## Issues Encountered
None.

## Known Stubs
None. The placeholder presenter from the RED commit was replaced in the following commit.

## Threat Flags
None. The only new surface is the two notification handlers already in the plan's threat register; the block is plain text and the reveal's payload is never read.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Two flagged runtime assumptions remain for the closing plan's hand check in a fresh IDE: the console is created by `getContentManager()` without showing the window, and the payload-less `bbj/showDenumDiagnostics` arrives as null (idea.log should show no "Unsupported notification method" line for either method). The parse test proves the message parses; neither is provable without a running IDE.
- IJF-05 is not marked complete in REQUIREMENTS.md: `requirements.ready-ids` reports 0/1 ready because plans 03 and 04 still declare it.

## Self-Check: PASSED

All created files exist on disk; commits `7ddb12a3`, `047b01e3`, `3e3c918b` and `0a5709c5` are in the log; every acceptance criterion of both tasks passed; the register grep over the added source and test lines prints nothing; `Lsp4ijImportAllowlistTest` is unchanged; nothing under `bbj-vscode/` changed; `./gradlew cleanTest test` reported 1235 tests with 0 failures.

---
*Phase: 128-intellij-denum*
*Completed: 2026-10-03*
