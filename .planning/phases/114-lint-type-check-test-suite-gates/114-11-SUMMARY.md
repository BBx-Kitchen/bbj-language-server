---
phase: 114-lint-type-check-test-suite-gates
plan: "11"
subsystem: testing
tags: [typescript, vscode-languageserver, diagnostics, tsconfig, vitest, java-interop]

# Dependency graph
requires:
  - phase: 114-02
    provides: "the hermetic createBBjTestServices double these files already build on"
  - phase: 114-07
    provides: "the working tsconfig.test.json / typecheck:test gate this plan's 17 files are checked against, plus baseline/typecheck-before.txt's per-plan digest"
provides:
  - "TEST-02 fix group 'diagnostic messages, part B' (D-05) at zero type errors: 17 test files (56 errors) with message reads, missing .js import suffixes, and one test.each tuple-shape mismatch, all fixed with unchanged behaviour"
affects: [114-13]

actuals:
  tokens: 10160
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Diagnostic.getMessageString(d) at every diagnostic-message read across this plan's 17 files, matching the pattern already established by 114-04/114-05/114-08/114-09/114-10 for the LSP 3.18 string | MarkupContent cascade"
    - "Missing relative-import .js suffixes restore real type resolution under node16/nodenext module resolution -- in two files (parser.test.ts, imports.test.ts) this alone resolved a cluster of downstream TS2339 errors (isXxx guard narrowing, cachedUseStatements on BbjDocument) that looked like missing narrowing but were actually the import falling back to an untyped module"

key-files:
  modified:
    - bbj-vscode/test/unknown-java-member.test.ts
    - bbj-vscode/test/imports.test.ts
    - bbj-vscode/test/parser.test.ts
    - bbj-vscode/test/method-body-scope.test.ts
    - bbj-vscode/test/run-call-file-resolution.test.ts
    - bbj-vscode/test/use-project-root.test.ts
    - bbj-vscode/test/method-return-java-type.test.ts
    - bbj-vscode/test/class-validations-issues.test.ts
    - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
    - bbj-vscode/test/overload-return-type.test.ts
    - bbj-vscode/test/validation-function-calls.test.ts
    - bbj-vscode/test/run-call-navigation.test.ts
    - bbj-vscode/test/declare-in-class.test.ts
    - bbj-vscode/test/functional/lsp-features.test.ts
    - bbj-vscode/test/java-package-name-collision.test.ts
    - bbj-vscode/test/inheritance-cycle-validation.test.ts
    - bbj-vscode/test/java-qualified-name.test.ts

key-decisions:
  - "parser.test.ts's four 'elements does not exist on AstNode' errors and imports.test.ts's four 'cachedUseStatements does not exist on LangiumDocument<AstNode>' errors both disappeared purely from adding the missing .js suffix to the relative import that supplied the isVerifyOptions/isBbjDocument type guards -- under node16/nodenext module resolution, an extensionless relative import still error-reports with a 'did you mean .js' hint but does not actually resolve for type-checking, so the imported guard functions typed as implicit any and lost all narrowing power. No explicit new narrowing guard was needed once the import itself resolved correctly; parser.test.ts's existing '.filter(isVerifyOptions)' stream filter already satisfies the plan's fail-if-false narrowing requirement (a filter, not a skip-guard, so no assertion can silently pass on the wrong node type)."
  - "java-qualified-name.test.ts's second test.each block (2-tuple '[value, description]' cases with a '%s (%s)' format string) needed its callback to accept both tuple elements, not just the first: vitest's test.each overload resolution infers a variadic callback type from the tuple union across all cases, and a callback declaring only one parameter does not satisfy that spread signature even though isJavaQualifiedName itself accepts unknown. Fixed by adding the second '_description' parameter (unused, hence the underscore per the project's no-unused-vars convention) rather than by touching isJavaQualifiedName or java-peer-guard.ts, which needed no change."
  - "Diagnostic.getMessageString(d) was applied to every diagnostic-message read across all 17 files, not only the specific lines the type checker flagged (e.g. plain '.toBe(...)'/'.toContain(...)' comparisons on '.message' that vitest's generic matchers accept without a type error) -- for consistency with the pattern 114-10 already established file-wide in classes.test.ts/variable-scoping.test.ts, and because a raw '.message' read is a latent bug once LSP 3.18 MarkupContent messages exist even where TypeScript does not yet flag it. Every value compared is unchanged: getMessageString(d) returns the same string these diagnostics always set."

requirements-completed: []
# TEST-02 is also declared by 114-12 and 114-13 (still open); requirements.ready-ids would report
# not ready, so it is intentionally NOT marked complete here per the shared-ID gate and the
# orchestrator's explicit instruction for this plan. 114-13 closes it once every declaring plan is done.

coverage:
  - id: D1
    description: "The six message-heavy and narrowing files (unknown-java-member, imports, parser, method-body-scope, run-call-file-resolution, use-project-root) reach zero type errors, with every diagnostic-message read routed through Diagnostic.getMessageString and every AST narrowing done via a fail-if-false guard (never a silent skip), and the six files' test-pass count is unchanged before/after"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "cd bbj-vscode && npx tsc -p tsconfig.test.json --noEmit | grep -cE '^test/(unknown-java-member|imports|parser|method-body-scope|run-call-file-resolution|use-project-root)\\.test\\.ts' = 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/unknown-java-member.test.ts test/imports.test.ts test/parser.test.ts test/method-body-scope.test.ts test/run-call-file-resolution.test.ts test/use-project-root.test.ts (299 passed | 1 skipped, 300 total) -- numPassedTests identical to a JSON run of the same six files taken before the first edit (also 299/300)"
        status: pass
      - kind: other
        ref: "npx eslint on all six files --max-warnings 0 exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The remaining eleven files (method-return-java-type, class-validations-issues, functional/unknown-java-member-real-interop, overload-return-type, validation-function-calls, run-call-navigation, declare-in-class, functional/lsp-features, java-package-name-collision, inheritance-cycle-validation, java-qualified-name) reach zero type errors, the two functional real-interop files keep their shouldRunBBjTests gate and production services unchanged, and the whole suite matches the phase baseline exactly"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "npx tsc -p tsconfig.test.json --noEmit reports zero errors across all 17 of this plan's files; npm run build exits 0"
        status: pass
      - kind: unit
        ref: "RUN_BBJ_TESTS=0 npx vitest run (the plan's ten-file Task 2 verify list) -- 9 passed | 1 skipped (10 files), 151 passed | 5 skipped (156 tests); functional/lsp-features.test.ts run separately -- 19/19 passed"
        status: pass
      - kind: other
        ref: "grep -c 'shouldRunBBjTests' on functional/unknown-java-member-real-interop.test.ts equals the same grep against e8941d48 (2 = 2); npx eslint on all 11 files --max-warnings 0 exits 0"
        status: pass
      - kind: other
        ref: "git diff e8941d48 -- (all 17 files) | grep '^+[^+]' | grep -cE '@ts-(nocheck|expect-error|ignore)|as any|eslint-disable' = 0; same diff grepped for planning identifiers (D-xx/C-xx/CR-xx/WR-xx/IN-xx/TEST-xx/FIX-xx/phase 11x/T-11x-x/11x-xx) = 0"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-11-run1.json, run2.json): both interop5008=open, hookTimeoutSuites=0, numFailedTests=11, and FAILED_TEST lines byte-identical to baseline/suite-before.txt in both runs (matched exactly on the first attempt, no re-run investigation needed)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 11: Test-Tree Type-Check Gate — Diagnostic Messages, Part B Summary

**All 17 files in the TEST-02 "diagnostic messages, part B" fix group (56 errors: message reads, missing `.js` import suffixes, and one `test.each` tuple-shape mismatch) reach zero type errors, with two files' apparent narrowing/document-typing errors turning out to be collateral damage from a missing import extension rather than missing guards, and the whole suite byte-identical to the phase baseline across two runs.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-27T20:43:00Z (approx, immediately after 114-10's SUMMARY commit)
- **Completed:** 2026-09-27T21:03:00Z (approx)
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- `unknown-java-member.test.ts`, `imports.test.ts`, `method-body-scope.test.ts`, `run-call-file-resolution.test.ts`, `use-project-root.test.ts`: every diagnostic-message read (`.includes`/`.startsWith`/`.toLowerCase`/`.toBe`/`.toContain`/`.toMatch`) now goes through `Diagnostic.getMessageString(d)`.
- `imports.test.ts`, `run-call-file-resolution.test.ts`, `use-project-root.test.ts`, `declare-in-class.test.ts`, `parser.test.ts` (already had one fixed by 114-02, one remaining here): missing `.js` suffixes added to relative imports. In `parser.test.ts` and `imports.test.ts` this alone resolved the reported `elements`-on-`AstNode` and `cachedUseStatements`-on-`LangiumDocument<AstNode>` errors — the broken import had silently untyped the `isVerifyOptions`/`isBbjDocument` guard functions, so `.filter(isVerifyOptions)` and `if (isBbjDocument(document))` were not narrowing at all; fixing the import restored their real type-guard signatures with no code changes to the guards themselves.
- `class-validations-issues.test.ts`, `method-return-java-type.test.ts`, `overload-return-type.test.ts`, `validation-function-calls.test.ts`, `run-call-navigation.test.ts`, `functional/lsp-features.test.ts`, `java-package-name-collision.test.ts`, `inheritance-cycle-validation.test.ts`, `functional/unknown-java-member-real-interop.test.ts`: local message-reading helpers (`messagesOf`, `returnTypeDiagnostics`, `callIssues`, `messages`, etc.) and direct `.includes`/`.startsWith`/`.test(...)` reads all route through `Diagnostic.getMessageString(d)`.
- `java-qualified-name.test.ts`: the second `test.each` block's callback gains its second (unused, `_description`) parameter, matching the `[value, description]` tuple shape its cases actually carry — `isJavaQualifiedName` itself (already typed `fqn: unknown`) needed no change.
- `functional/unknown-java-member-real-interop.test.ts`'s `shouldRunBBjTests` gate count and production `createBBjServices`/`NodeFileSystem` setup are untouched (confirmed identical to the phase base commit).
- Zero type errors across all 17 files (56 → 0), zero `src/` errors, `npm run build` green, `npx eslint` clean on all 17 files, and two whole-suite `npm test` runs both reproduce `baseline/suite-before.txt`'s 11-test `FAILED_TEST` set exactly on the first attempt.

## Task Commits

1. **Task 1: The message-heavy and narrowing files reach zero errors with unchanged results** - `f3341403` (fix)
2. **Task 2: The remaining eleven files reach zero errors, and the whole suite matches the baseline** - `a66ac668` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/unknown-java-member.test.ts` - all `.message` reads routed through `Diagnostic.getMessageString`
- `bbj-vscode/test/imports.test.ts` - `.js` import suffixes added (restoring `isBbjDocument` narrowing); message reads fixed
- `bbj-vscode/test/parser.test.ts` - `.js` import suffix added (restoring `isVerifyOptions` narrowing); one message read fixed
- `bbj-vscode/test/method-body-scope.test.ts` - message reads routed through `Diagnostic.getMessageString`
- `bbj-vscode/test/run-call-file-resolution.test.ts` - `.js` import suffixes added; message reads fixed
- `bbj-vscode/test/use-project-root.test.ts` - `.js` import suffixes added; message reads fixed
- `bbj-vscode/test/method-return-java-type.test.ts` - `returnTypeDiagnostics` helper's message reads fixed
- `bbj-vscode/test/class-validations-issues.test.ts` - `messagesOf` helper and two direct `.test(d.message)` reads fixed
- `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` - three message reads fixed; gate/services unchanged
- `bbj-vscode/test/overload-return-type.test.ts` - `incompatibleReturnDiagnostics` helper's message reads fixed
- `bbj-vscode/test/validation-function-calls.test.ts` - `callIssues` helper's message read/`RegExp.test` fixed
- `bbj-vscode/test/run-call-navigation.test.ts` - two direct message reads fixed
- `bbj-vscode/test/declare-in-class.test.ts` - `.js` import suffix added
- `bbj-vscode/test/functional/lsp-features.test.ts` - one direct message read fixed
- `bbj-vscode/test/java-package-name-collision.test.ts` - one direct message read fixed
- `bbj-vscode/test/inheritance-cycle-validation.test.ts` - `messages` helper's message read fixed
- `bbj-vscode/test/java-qualified-name.test.ts` - `test.each` callback given its second tuple parameter

## Decisions Made
See `key-decisions` in the frontmatter for the two decisions with the most reasoning behind them (the import-suffix-as-narrowing-fix discovery in `parser.test.ts`/`imports.test.ts`, and the `test.each` tuple-shape fix in `java-qualified-name.test.ts`), plus the file-wide `Diagnostic.getMessageString` consistency decision. Every other fix (direct message-read substitution) was already named or directly implied by the plan's own `<interfaces>` text.

## Deviations from Plan

None - plan executed exactly as written. The `parser.test.ts`/`imports.test.ts` narrowing errors resolving via the import-suffix fix rather than requiring a hand-written `isXxx()` guard was a discovery made while implementing the plan's own prescribed action (add `.js` suffixes, narrow with guards), not a deviation from it — the guards the plan asked for (`.filter(isVerifyOptions)`, `if (isBbjDocument(document))`) were already present in the source; they simply needed their import to resolve to type-check correctly.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 17 files in this plan's TEST-02 "diagnostic messages, part B" group are at zero type errors; combined with 114-07's, 114-08's, 114-09's and 114-10's earlier groups, only 114-12's group (50 errors, 24 files) remains before the test-tree total reaches zero.
- TEST-02 is also declared by 114-12 and 114-13 (still open); per the orchestrator's explicit instruction for this plan it is intentionally left un-marked in `REQUIREMENTS.md` here — plan 114-13 closes it once every declaring plan is done.
- `coverage/phase-114/114-11-run1.json` and `run2.json` are the whole-suite evidence for this plan (gitignored raw reports; both runs' digests matched `baseline/suite-before.txt`'s `FAILED_TEST` set exactly on the first attempt, no re-run investigation needed).

## Self-Check: PASSED

All 17 modified files verified present on disk with their described edits. Both task commits (`f3341403`, `a66ac668`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npx tsc -p tsconfig.test.json --noEmit` reports zero errors across this plan's 17 files; `npm run build` exits 0; two whole-suite runs' `FAILED_TEST` lines are byte-identical to `baseline/suite-before.txt`.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
