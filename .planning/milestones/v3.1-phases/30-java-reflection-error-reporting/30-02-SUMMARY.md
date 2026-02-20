---
phase: 30-java-reflection-error-reporting
plan: 02
subsystem: language-server
tags: [langium, diagnostics, lsp, error-reporting, cyclic-references]

# Dependency graph
requires:
  - phase: 30-java-reflection-error-reporting
    provides: Research into Langium linking error handling and diagnostic pipeline
provides:
  - Enhanced cyclic reference error messages with file and line number context
  - LSP diagnostics with Error severity for cyclic references (vs Warning for unresolved refs)
  - DiagnosticRelatedInformation with clickable links for cycle navigation
affects: [error-reporting, diagnostics, developer-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Override throwCyclicReferenceError to enhance error messages before they flow through Langium pipeline"
    - "Override processLinkingErrors to populate LSP relatedInformation from enhanced error messages"
    - "Severity discrimination in toDiagnostic based on error message content"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/src/language/bbj-document-validator.ts

key-decisions:
  - "Enhance error messages at throw-time (throwCyclicReferenceError) since method must throw (return type never)"
  - "Extract relatedInformation from enhanced messages in processLinkingErrors override"
  - "Use message content matching ('Cyclic reference') to distinguish error severity since LinkingErrorData doesn't include error type"

patterns-established:
  - "Error message enhancement pattern: Include contextual info early in pipeline, parse it later for LSP features"
  - "Severity discrimination pattern: Message content matching when error type not available in diagnostic data"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 30 Plan 02: Cyclic Reference Error Reporting Summary

**Cyclic reference errors now display with file+line context, Error severity (red), and clickable LSP relatedInformation links for navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T08:20:32Z
- **Completed:** 2026-02-07T08:24:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Cyclic reference errors include source filename and line number in error messages
- Cyclic reference diagnostics appear with Error severity (red squiggles) in Problems panel
- LSP relatedInformation populated with clickable location links for cycle navigation
- Regular linking errors (unresolved references) preserve Warning severity behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Override throwCyclicReferenceError in BbjLinker** - `681b6a1` (feat)
2. **Task 2: Keep cyclic reference errors as Error severity and populate relatedInformation** - `c913d83` (feat)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-linker.ts` - Override throwCyclicReferenceError to enhance error messages with file+line context; add getSourceLocationForNode helper
- `bbj-vscode/src/language/bbj-document-validator.ts` - Override processLinkingErrors to populate relatedInformation; update toDiagnostic to distinguish cyclic errors (Error) from regular linking errors (Warning)

## Decisions Made

**1. Error message enhancement at throw-time**
- Since throwCyclicReferenceError has return type `never` (must throw), we can't convert to diagnostic at throw-time
- Solution: Enhance error message with file+line info using format `[in relative/path.bbj:42]`
- This flows through Langium's LinkingError pipeline to become an LSP diagnostic

**2. Extract relatedInformation from enhanced messages**
- Can't set relatedInformation at throw-time, so extract it in processLinkingErrors override
- Parse the `[in path:line]` pattern from enhanced message
- Build DiagnosticRelatedInformation with extracted location

**3. Severity discrimination via message content**
- LinkingErrorData doesn't include error type (cyclic vs unresolved)
- Solution: Check message content for 'Cyclic reference' string
- Cyclic errors → Error severity (red)
- Other linking errors → Warning severity (yellow) - preserves existing behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Edit tool persistence issue:**
- Initial Edit operations on bbj-document-validator.ts didn't persist to disk
- Switched to Write tool which successfully wrote the file
- All tests passed after Write operation
- No functional impact on implementation

## Next Phase Readiness

- Cyclic reference error reporting complete with file+line context and LSP navigation
- Ready for end-to-end testing with real cyclic reference scenarios
- Foundation established for enhanced error reporting in other linker scenarios

## Self-Check: PASSED

All modified files exist:
- /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-linker.ts
- /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-validator.ts

All commits exist:
- 681b6a1: Task 1 commit
- c913d83: Task 2 commit

---
*Phase: 30-java-reflection-error-reporting*
*Completed: 2026-02-07*
