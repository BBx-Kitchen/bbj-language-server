---
phase: 50-diagnostic-noise-reduction
plan: 01
subsystem: diagnostics
tags: [langium, document-validator, diagnostic-hierarchy, typescript]

# Dependency graph
requires: []
provides:
  - "BBjDocumentValidator.validateDocument() override with post-processing diagnostic filter"
  - "applyDiagnosticHierarchy() function implementing 3-rule suppression hierarchy"
  - "DiagnosticTier enum (Warning/Semantic/Parse) extensible for Phase 53 BBjCPL tier"
  - "setSuppressCascading() and setMaxErrors() module-level config exports for wiring in Plan 02"
affects:
  - "50-02 (wires setSuppressCascading/setMaxErrors into module config)"
  - "53 (adds BBjCPL = 3 tier to DiagnosticTier enum and getDiagnosticTier classifier)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Diagnostic hierarchy post-processing: override validateDocument(), call super, then filter result"
    - "Tier-based suppression: classify diagnostics by source code (data.code), not severity, for accurate linking error detection"
    - "Module-level config flags pattern: let enabled = true + export function set*()"

key-files:
  created: []
  modified:
    - "bbj-vscode/src/language/bbj-document-validator.ts"

key-decisions:
  - "Match linking errors by data.code (DocumentValidator.LinkingError), not severity — linking errors are downgraded to Warning by toDiagnostic() override, so severity check would miss them in Rule 1"
  - "getDiagnosticTier() wired into applyDiagnosticHierarchy() for parse error detection and cap logic, making the classifier actively used (avoids TS6133 unused-locals error)"
  - "CancellationToken imported from vscode-languageserver (consistent with bbj-completion-provider.ts, bbj-ws-manager.ts) not vscode-jsonrpc directly"
  - "Per-file suppression only: File B linking errors survive when only File A has parse errors — correct behavior, users should fix File A first"

patterns-established:
  - "Diagnostic hierarchy filter: post-process super.validateDocument() result, don't modify collection-in-progress"
  - "Tier enum extensibility: add enum value + getDiagnosticTier() branch = new tier support (Phase 53 pattern)"

requirements-completed:
  - DIAG-01
  - DIAG-02

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 50 Plan 01: Diagnostic Noise Reduction Summary

**BBjDocumentValidator.validateDocument() override with 3-rule hierarchy filter: suppress linking errors on parse errors, suppress warnings on any error, cap parse errors at 20**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T12:46:25Z
- **Completed:** 2026-02-19T12:49:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Implemented `applyDiagnosticHierarchy()` with three suppression rules: (1) parse errors suppress all linking errors, (2) any Error-severity diagnostic suppresses warnings/hints, (3) parse error cap at configurable maximum (default 20)
- Added extensible `DiagnosticTier` enum with `Warning/Semantic/Parse` tiers and commented `BBjCPL = 3` placeholder for Phase 53 wiring
- Exported `setSuppressCascading()` and `setMaxErrors()` module-level config functions matching the pattern from `bbj-validator.ts` (lines 22-26), ready for Plan 02 wiring
- `getDiagnosticTier()` classifier actively wired into `applyDiagnosticHierarchy()` for both parse-error detection and parse-error cap logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Add module-level config flags and validateDocument override with extensible hierarchy** - `339b9bc` (feat)

**Plan metadata:** _(final docs commit to follow)_

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-validator.ts` - Added config flags, DiagnosticTier enum, getDiagnosticTier(), applyDiagnosticHierarchy(), and validateDocument() override

## Decisions Made
- Matched linking errors by `data.code` (not severity) in Rule 1, because the existing `toDiagnostic()` override already downgrades non-cyclic linking errors to `Warning` severity — severity-based detection would break Rule 1 for those errors
- Wired `getDiagnosticTier()` into `hasParseErrors` detection and the parse-error-cap logic (Rule 3) to ensure the function is actually called, satisfying TypeScript's `noUnusedLocals` strict check
- Chose `vscode-languageserver` as import source for `CancellationToken` (consistent with existing `bbj-completion-provider.ts` pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getDiagnosticTier() wired into applyDiagnosticHierarchy()**
- **Found during:** Task 1 (build verification)
- **Issue:** Plan specified `getDiagnosticTier()` as a classifier and `applyDiagnosticHierarchy()` as inline `data.code` checks. Using `getDiagnosticTier()` only in comments caused TypeScript error TS6133: 'getDiagnosticTier' is declared but its value is never read
- **Fix:** Replaced inline `d.data?.code === DocumentValidator.ParsingError` checks in `hasParseErrors` detection and Rule 3 filter with calls to `getDiagnosticTier() === DiagnosticTier.Parse`, making the classifier actively used
- **Files modified:** `bbj-vscode/src/language/bbj-document-validator.ts`
- **Verification:** Build succeeds with zero errors after fix
- **Committed in:** `339b9bc` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - build error fix)
**Impact on plan:** Fix strengthens the design — getDiagnosticTier() now actively serves as the single classification source, making Phase 53 extension simpler (add enum value + classifier branch = new tier).

## Issues Encountered
- TypeScript `noUnusedLocals` flagged `getDiagnosticTier` — plan included the function but `applyDiagnosticHierarchy` used inline checks. Resolved by routing parse-tier detection through the classifier (correct behavior, not a scope change).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can wire `setSuppressCascading()` and `setMaxErrors()` into module config/test helpers immediately
- Phase 53 extension path confirmed: add `BBjCPL = 3` to `DiagnosticTier` enum and `if (d.source === 'bbj-cpl') return DiagnosticTier.BBjCPL` to `getDiagnosticTier()` — no other changes needed
- All 6 pre-existing test failures remain unchanged (none caused by this implementation)

---
*Phase: 50-diagnostic-noise-reduction*
*Completed: 2026-02-19*
