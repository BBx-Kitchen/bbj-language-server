---
phase: 114-lint-type-check-test-suite-gates
plan: "08"
subsystem: testing
tags: [eslint, typescript, tsconfig, vitest, diagnostic-message, node-builtin-imports]

# Dependency graph
requires:
  - phase: 114-02
    provides: "the hermetic createBBjTestServices double these ten test files already build on"
  - phase: 114-05
    provides: "eslint.config.js's recommended preset + D-01/D-02 overrides and the 51-finding hand-fix list this plan's 19-test share comes from"
  - phase: 114-06
    provides: "the src half of the same lint pass, landing before this test half so npm run lint at zero requires both"
  - phase: 114-07
    provides: "the working tsconfig.test.json / typecheck:test gate this plan's ten files are checked against, plus baseline/typecheck-before.txt's per-plan digest"
provides:
  - "The last ten test-tree files needed for npx eslint src test --max-warnings 0 to exit 0 across the whole tree (lint plan C of three, D-14)"
  - "bbj-vscode/test/em-properties-reader-guard.test.ts: loads properties-reader through a createRequire(import.meta.url) loader (requireCjs) instead of a bare require call"
  - "NormalizedTextDocuments<TextDocument> given its type argument at every remaining test call site in this plan's files (bbj-cpl-fallback-dedup, live-parse-interleaving, on-save-kept-errors)"
affects: [114-13]

actuals:
  tokens: 5600
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Diagnostic.getMessageString(d) at every remaining .message read across this plan's files, matching the pattern 114-04's issue447 rewrite and 114-05's D-05 research established for the string | MarkupContent cascade"
    - "Test-fake FileSystemProvider round-out: implementing the two sync/async member pairs a class was still missing (existsSync mirroring exists, readBinary/readBinarySync mirroring readFile/readFileSync) rather than widening the interface or adding a cast"

key-files:
  modified:
    - bbj-vscode/test/validation.test.ts
    - bbj-vscode/test/em-properties-reader-guard.test.ts
    - bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts
    - bbj-vscode/test/javadoc.test.ts
    - bbj-vscode/test/lazy-prefix-loading.test.ts
    - bbj-vscode/test/linking.test.ts
    - bbj-vscode/test/live-parse-interleaving.test.ts
    - bbj-vscode/test/on-save-kept-errors.test.ts
    - bbj-vscode/test/setopts-catalog.test.ts
    - bbj-vscode/test/utils.test.ts

key-decisions:
  - "em-properties-reader-guard.test.ts's require() calls became requireCjs('properties-reader') via a module-level createRequire(import.meta.url), matching commands-cjs-harness.ts's existing pattern in this codebase; the file's own doc comment (a historical illustration of the old broken shape) was reworded so it no longer contains the literal require('properties-reader') substring the plan's own acceptance grep checks for, without changing what it documents"
  - "JavadocProviderUnderTest's test-only constructor gained a real lazyLoad parameter forwarded to the base JavadocProvider constructor (previously it silently dropped the argument its own subclasses passed as super(false), since its constructor took no parameters at all) — verified behaviour-neutral: both call sites' fake readDirectory throws/returns-empty before the code path that reads this.lazyLoad is ever reached, so the fix has no observable effect on either test's assertions"
  - "The two lazy-prefix-loading.test.ts in-memory FileSystemProvider fakes gained existsSync/readBinary/readBinarySync by mirroring their own existing exists/readFile sync-async pairing (existsSync delegates the same has()-or-LIB_DIR check; readBinary/readBinarySync UTF-8-encode the same content readFile already returns), rather than widening the FileSystemProvider interface or casting past it"
  - "NormalizedTextDocuments<T> call sites across bbj-cpl-fallback-dedup.test.ts, live-parse-interleaving.test.ts and on-save-kept-errors.test.ts all use langium's own re-exported TextDocument type (from 'vscode-languageserver-textdocument', confirmed the same object LangiumSharedServices' own TextDocuments: TextDocuments<TextDocument> service type uses), imported from 'langium' where the file did not already import it directly"

requirements-completed: []
# TEST-01/TEST-02 are also declared by 114-09 through 114-13 (all still open); requirements.ready-ids
# reported 0/2 ready, so neither is marked complete here per the shared-ID gate and the coordinator's
# explicit instruction — plan 114-13 closes both once every declaring plan is done.

coverage:
  - id: D1
    description: "The largest lint-and-type file (validation.test.ts) and the require guard (em-properties-reader-guard.test.ts) are lint-clean, type-clean, and behave identically, with the require guard now loading properties-reader through a createRequire(import.meta.url) loader"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npx eslint test/validation.test.ts test/em-properties-reader-guard.test.ts --max-warnings 0 exits 0; npx tsc -p tsconfig.test.json --noEmit reports 0 errors for both files"
        status: pass
      - kind: unit
        ref: "npx vitest run test/validation.test.ts test/em-properties-reader-guard.test.ts (46/46 passed)"
        status: pass
      - kind: other
        ref: "grep -c \"require('properties-reader')\" on the guard file = 0; grep -c 'createRequire(import.meta.url)' = 1; git diff e8941d48 -- test/em-properties-reader-guard.test.ts | grep '^[-+][^-+]' | grep -c 'expect(' = 0 (no assertion line touched)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The other eight files close their lint and type findings with real fixes (no assertion changes), and npm run lint is at zero for the whole tree (src and test)"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npx eslint src test --max-warnings 0 exits 0; npm run lint exits 0; npx tsc -p tsconfig.test.json --noEmit reports 0 errors across all ten of this plan's files"
        status: pass
      - kind: unit
        ref: "RUN_BBJ_TESTS=0 npx vitest run test/bbj-cpl-fallback-dedup.test.ts test/javadoc.test.ts test/lazy-prefix-loading.test.ts test/linking.test.ts test/live-parse-interleaving.test.ts test/on-save-kept-errors.test.ts test/setopts-catalog.test.ts test/utils.test.ts (134 passed, 19 skipped, 0 failed)"
        status: pass
      - kind: other
        ref: "git diff e8941d48 -- bbj-vscode/test | grep '^+[^+]' | grep -cE 'eslint-disable|@ts-(nocheck|expect-error|ignore)' = 0; git diff --name-only 4fc6b77b HEAD -- bbj-vscode lists exactly this plan's ten files, nothing else"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-08-run1.json, run2.json; digests baseline/suite-114-08-run1.txt, run2.txt): both interop5008=open, hookTimeoutSuites=0, numFailedTests=11, and FAILED_TEST lines byte-identical to baseline/suite-before.txt (diff exits clean both times); each run's one extra FAILED_SUITE (installed-extension-e2e.test.ts, 0 failed assertions) matches the pre-existing contention flakiness already diagnosed and documented in 114-02/114-05/114-06/114-07"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 08: Lint Plan C — Test-Tree Hand Fixes, Ten Files at Zero Lint and Type Errors Summary

**The final lint plan closes the remaining 18 test lint findings (plus this plan's own two require-import fixes) across ten files, fixing nine of those same files' type errors in the same pass so `npm run lint` now exits 0 for the whole tree with unchanged whole-suite behaviour.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-27T19:59:00Z (approx)
- **Completed:** 2026-09-27T20:12:07Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- `validation.test.ts` (the largest combined lint-and-type file in the plan) and `em-properties-reader-guard.test.ts` (the require-import guard) are both lint-clean and type-clean: three unused AST-import names dropped, every `.message` read across nine call sites now goes through `Diagnostic.getMessageString(d)`, and the guard's two `require('properties-reader')` calls now go through a module-level `createRequire(import.meta.url)` loader bound to `requireCjs` — its own doc comment reworded so the file's saved text no longer contains the literal old-shape string either.
- The other eight files (`bbj-cpl-fallback-dedup`, `javadoc`, `lazy-prefix-loading`, `linking`, `live-parse-interleaving`, `on-save-kept-errors`, `setopts-catalog`, `utils`) each close their lint findings (unused imports/vars, one underscore-prefixed override parameter set, `os`/`fs`/`path` namespace imports) and their type errors in the same edit per site — `NormalizedTextDocuments<TextDocument>` given its type argument at three call sites, the non-existent `langium` `CancellationToken` import dropped, `.js` suffixes added to two relative imports, `JavadocProviderUnderTest`'s constructor given a real forwarded `lazyLoad` parameter, and the two `lazy-prefix-loading.test.ts` in-memory filesystem fakes rounded out with `existsSync`/`readBinary`/`readBinarySync`.
- `npx eslint src test --max-warnings 0` and `npm run lint` both exit 0 — the whole tree lints clean for the first time this phase. `npx tsc -p tsconfig.test.json --noEmit` reports zero errors across all ten of this plan's files.
- Two whole-suite `npm test` runs after both tasks landed reproduce `baseline/suite-before.txt`'s `FAILED_TEST` set exactly (the 11-test `linking.test.ts` interop baseline, byte-identical both times), with `hookTimeoutSuites=0` and `interop5008=open` matching baseline in both runs.

## Task Commits

1. **Task 1: validation.test.ts and the require guard go lint-clean and type-clean with unchanged results** - `b880e4e2` (fix)
2. **Task 2: The other eight files close, and npm run lint is at zero for the whole tree** - `01f69fcf` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/validation.test.ts` - dropped 3 unused AST-import names; `Diagnostic.getMessageString(d)` at every `.message` read
- `bbj-vscode/test/em-properties-reader-guard.test.ts` - `requireCjs = createRequire(import.meta.url)` loader replacing bare `require`
- `bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts` - `NormalizedTextDocuments<TextDocument>`; removed a genuinely-unused `secondFlaggedLine` from the second describe block
- `bbj-vscode/test/javadoc.test.ts` - namespace imports for `fs/promises`/`path`; dropped unused `beforeEach`; three `_packageDocURI`/two `_uri?` underscore-prefixed override params; `JavadocProviderUnderTest` constructor forwards `lazyLoad`
- `bbj-vscode/test/lazy-prefix-loading.test.ts` - dropped non-existent `CancellationToken` import; `.js` import suffixes; `existsSync`/`readBinary`/`readBinarySync` added to `InMemoryFileSystemProvider`
- `bbj-vscode/test/linking.test.ts` - dropped unused `JavadocProvider` import; `Diagnostic.getMessageString(d)` at three call sites
- `bbj-vscode/test/live-parse-interleaving.test.ts` - dropped unused `LangiumSharedCoreServices`; `NormalizedTextDocuments<TextDocument>` at two call sites
- `bbj-vscode/test/on-save-kept-errors.test.ts` - `NormalizedTextDocuments<TextDocument>`; dropped an unused `builder` from a destructure
- `bbj-vscode/test/setopts-catalog.test.ts` - dropped unused `composeSetOptsLine` import
- `bbj-vscode/test/utils.test.ts` - namespace import for `os`; dropped unused `bbjdir`

## Decisions Made
- `em-properties-reader-guard.test.ts`'s doc comment (which describes the old broken shape as prose) was reworded to remove the literal `require('properties-reader')` substring, since the task's own acceptance criterion greps for that exact string across the whole file — the comment's meaning is unchanged, only its wording.
- `JavadocProviderUnderTest`'s constructor now takes and forwards a `lazyLoad: boolean = true` parameter instead of silently dropping the argument its own two anonymous subclasses already passed as `super(false)`. Verified behaviour-neutral by reading `JavadocProvider.initialize()`: both tests' fake `readDirectory` throws or returns an empty array before the loop that would ever branch on `this.lazyLoad`, so neither test's assertions depend on the value.
- The two `lazy-prefix-loading.test.ts` filesystem fakes' new `existsSync`/`readBinary`/`readBinarySync` members reuse the class's own already-established sync/async pairing (`existsSync` calls the same has()-or-LIB_DIR check as `exists`; `readBinary`/`readBinarySync` UTF-8-encode the same content `readFile`/`readFileSync` already return) rather than inventing new behaviour or casting past the interface.
- `NormalizedTextDocuments<T>`'s type argument is `TextDocument` from `'vscode-languageserver-textdocument'` (imported via `'langium'`'s own re-export where a file did not already import it directly) — confirmed to be the exact type `LangiumSharedServices`' own `TextDocuments: TextDocuments<TextDocument>` service type uses, matching the plan's own guidance to use "the document type the file already uses."

## Deviations from Plan

None - plan executed exactly as written. Every fix (import cleanup, `Diagnostic.getMessageString`, `createRequire` loader, generic type arguments, constructor parameter forwarding, filesystem-fake round-out) was already named or directly implied by the plan's own `<interfaces>` and `<action>` text; no Rule 1-4 deviation was needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm run lint` (`eslint src test --max-warnings 0`) now exits 0 for the whole tree — the last item lint plan C (D-14) needed. Plan 114-13's CI gate step can now assume this holds.
- TEST-01 and TEST-02 are also declared by 114-09 through 114-13 (all still open); per the shared-ID gate (`requirements.ready-ids` reported 0/2 ready), neither is marked complete here, per the coordinator's explicit instruction — plan 114-13 closes both once every declaring plan is done.
- `baseline/suite-114-08-run1.txt` and `baseline/suite-114-08-run2.txt` are committed alongside this SUMMARY as this plan's whole-suite evidence, matching the pattern of 114-02/114-04/114-06.

## Self-Check: PASSED

All 10 modified files verified present on disk with their described edits. Both task commits (`b880e4e2`, `01f69fcf`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npm run lint` exits 0; `npx tsc -p tsconfig.test.json --noEmit` reports zero errors across this plan's ten files; two whole-suite runs' `FAILED_TEST` lines are byte-identical to `baseline/suite-before.txt`.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
