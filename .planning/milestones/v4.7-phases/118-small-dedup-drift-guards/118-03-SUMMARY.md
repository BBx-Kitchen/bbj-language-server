---
phase: 118-small-dedup-drift-guards
plan: "03"
subsystem: language-server
tags: [langium, signature-help, inlay-hints, refactor, dedup]

# Dependency graph
requires:
  - phase: 114-lint-typecheck-test-suite-gates
    provides: whole-suite numFailedTests:0 gate, lint --max-warnings 0, typecheck:test
provides:
  - One shared getFunctionReference(callNode) free function in utils.ts, replacing two
    byte-identical protected methods on the signature-help and inlay-hint providers
affects: []

actuals:
  tokens: 950
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Byte-identical protected-method-on-two-classes duplication collapsed to one exported
       free function in utils.ts, called directly by both callers (matches the existing
       readSimpleName precedent in the same file)"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/utils.ts
    - bbj-vscode/src/language/bbj-signature-help-provider.ts
    - bbj-vscode/src/language/bbj-inlay-hint-provider.ts

key-decisions:
  - "getFunctionReference lands in utils.ts next to readSimpleName, not in
     bbj-nodedescription-provider.ts as the issue's own suggested home, because that file is
     a Langium service class (per the phase's own D-09 decision)"
  - "Both protected methods were deleted outright rather than kept as thin delegates — no
     src or test file overrode or called either one, confirmed before deletion"

patterns-established: []

requirements-completed: [REF-01]

coverage:
  - id: D1
    description: "getFunctionReference is defined exactly once in utils.ts and both the signature-help and inlay-hint providers call it directly instead of a protected method; callee resolution (symbol vs. member vs. undefined) is unchanged"
    requirement: "REF-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/functional/lsp-features.test.ts (Signature help describe block, 19 tests)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/inlay-hints.test.ts, bbj-vscode/test/inlay-hints-javadoc.test.ts (43 tests total across the three targeted files)"
        status: pass
      - kind: other
        ref: "single-definition grep check (grep -l across src/language/*.ts resolves to utils.ts only; each provider has exactly the import line plus one call) and the numstat check (both provider files show more deleted than added lines)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The src type check (noUnusedLocals), lint, typecheck:test and the build stay clean after the imports were trimmed in both providers, and the whole suite reports numFailedTests 0"
    verification:
      - kind: unit
        ref: "npx tsc -p tsconfig.json --noEmit / npx eslint --max-warnings 0 / npm run lint / npm run typecheck:test / npm run build"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 --reporter=json (whole suite)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-09-28
status: complete
---

# Phase 118 Plan 03: Shared getFunctionReference Dedup Summary

**The two byte-identical `getFunctionReference` protected methods on the signature-help and inlay-hint providers are now one exported free function in `utils.ts`, called directly by both, with unchanged callee resolution and unchanged suites.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-28T21:04:00Z
- **Completed:** 2026-09-28T21:12:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `utils.ts` gained one new export, `getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined`, placed directly after `readSimpleName` with its own short JSDoc explaining the symbol/member/undefined resolution and noting both providers now share it
- `bbj-signature-help-provider.ts`'s protected method was deleted; `getSignatureFromElement` now calls the imported free function directly; the now-unused `Reference`, `NamedElement`, `isMemberCall` and `isSymbolRef` imports were dropped
- `bbj-inlay-hint-provider.ts`'s protected method was deleted; `computeInlayHint` now calls the imported free function directly; the now-unused `Reference`, `MethodCall`, `NamedElement`, `isMemberCall` and `isSymbolRef` imports were dropped
- Exactly one definition of `getFunctionReference` exists under `src/language` (confirmed by grep across `src/language/*.ts`), and both suites (signature help: 19 tests; inlay hints + javadoc: 43 tests across the three targeted files) pass with no test file changed

## Task Commits

Each task was committed atomically:

1. **Task 1: Signature help resolves the callee through the one shared getFunctionReference in utils.ts** - `c0e9f110` (refactor)
2. **Task 2: Inlay hints use the same shared function, and getFunctionReference is defined exactly once** - `bedc01e5` (refactor)

**Plan metadata:** committed separately after this SUMMARY.

## Files Created/Modified
- `bbj-vscode/src/language/utils.ts` - new exported `getFunctionReference` next to `readSimpleName`
- `bbj-vscode/src/language/bbj-signature-help-provider.ts` - protected method deleted, calls the shared function, imports trimmed
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` - protected method deleted, calls the shared function, imports trimmed

## Decisions Made
- `getFunctionReference` lands in `utils.ts` beside `readSimpleName` rather than in `bbj-nodedescription-provider.ts` (the issue's own suggested home), because that file is a Langium service class, not a plain helper module
- Both protected methods were deleted outright (not kept as thin delegates to the free function) — a file-wide grep before each deletion confirmed nothing in `src` or `test` called or overrode either one

## Deviations from Plan

None - plan executed exactly as written.

### Note on the `diff --stat bb9eccf5 -- bbj-vscode/test` acceptance check

Both tasks' acceptance criteria include `git diff --stat bb9eccf5 -- bbj-vscode/test` "prints nothing." Run literally against the phase base commit `bb9eccf5`, this is non-empty because plans 118-01 and 118-02 (earlier in this same phase) already committed test-file changes (`bbl-catalog-drift.test.ts`, `compiler-options-package-json-drift.test.ts`, and a comment reword in `builtin-library-members.test.ts`) before this plan started. Neither of this plan's own two commits (`c0e9f110`, `bedc01e5`) touched any file under `bbj-vscode/test` — confirmed directly via `git status --short` immediately before each commit, and via `git diff --stat` scoped to each individual commit. The intent of the check (no test file edited by this plan) holds; the literal command's base reference is stale once a phase has more than one plan.

### Note on the whole-suite JSON reporter run

`npx vitest run --maxWorkers=2 --reporter=json` exited 1, but the JSON report's `numFailedTests` was `0` (`numTotalTests=3635`), which is what Task 2's acceptance criteria and `<fails_when>` clause actually gate on — the node check that reads the report exits 0 whenever `numFailedTests===0 && numTotalTests>0`, which it did. The non-zero vitest process exit came from `numFailedTestSuites=2`, one of which is the already-documented pre-existing `installed-extension-e2e.test.ts` stale-bundle failure (STATE.md Tech Debt, and independently confirmed pre-existing in 118-02-SUMMARY); it reported 0 failing assertions of its own in this run, matching the "failed suite with 0 failed assertions" pattern already on record for this environment. No further per-test base comparison was needed since `numFailedTests` was 0.

### Closing-note draft (not posted from here)

**#580:** `getFunctionReference` now exists once, in `bbj-vscode/src/language/utils.ts` next to the other small shared AST helpers, rather than in `bbj-nodedescription-provider.ts` as the issue proposed, because that file is a Langium service class. Both the signature-help and inlay-hint providers import it and call it directly; their protected methods are gone. What signature help and inlay hints resolve as a callee (a plain call's symbol, a member call's member, or `undefined` otherwise) is unchanged — both suites pass with no assertion edits.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None. Plan executed exactly as written; the two notes above are interpretation clarifications on pre-existing/multi-plan-phase artifacts, not fixes to this plan's own work.

## Issues Encountered
None beyond the two notes documented above under Deviations, which are clarifications rather than problems requiring resolution.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REF-01 marked complete in `REQUIREMENTS.md`
- Phase 118 (Small Dedup & Drift Guards) is now complete: all three plans (118-01 catalog wrapper shape + `.bbl` drift guard, 118-02 compiler-option `package.json` drift guard, 118-03 this plan) have landed
- Ready for `/gsd-discuss-phase 119` or equivalent phase-119 planning (Grammar — DECLARE File Paths & Shared Channel Opening)

## Self-Check: PASSED

- `bbj-vscode/src/language/utils.ts` contains `export function getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined`: FOUND
- Commit `c0e9f110` found in `git log --oneline --all`: FOUND
- Commit `bedc01e5` found in `git log --oneline --all`: FOUND
- All plan-level `<verification>` items re-confirmed above (signature-help and inlay-hint suites pass, single definition confirmed, src type check/lint/typecheck:test/build clean, whole suite numFailedTests=0)

---
*Phase: 118-small-dedup-drift-guards*
*Completed: 2026-09-28*
