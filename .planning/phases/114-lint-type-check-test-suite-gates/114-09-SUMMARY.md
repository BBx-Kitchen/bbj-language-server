---
phase: 114-lint-type-check-test-suite-gates
plan: "09"
subsystem: testing
tags: [typescript, tsconfig, langium, filesystemprovider, vscode-languageserver, vitest]

# Dependency graph
requires:
  - phase: 114-02
    provides: "the hermetic createBBjTestServices double these files build on"
  - phase: 114-07
    provides: "the working tsconfig.test.json / typecheck:test gate this plan's 16 files are checked against, plus baseline/typecheck-before.txt's per-plan digest"
provides:
  - "The 'typed fakes' TEST-02 fix group (D-05) at zero type errors: NormalizedTextDocuments<TextDocument> given its type argument, in-memory/spy FileSystemProvider fakes rounded out with existsSync/readBinary/readBinarySync, fake WorkspaceConfiguration and RestartTarget-shaped mocks typed against their real generic signatures, java-interop-peer-guard.test.ts's javadoc fixtures typed as ClassDoc, and the module-resolution/regex-flag/read-only-property fixes the interfaces block named"
affects: [114-13]

actuals:
  tokens: 7560
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Fake FileSystemProvider round-out (scope-cost-regression, use-path-containment, extensionless-use-target): existsSync mirrors the class's own async exists() check; readBinary/readBinarySync UTF-8-encode the same content readFile/readFileSync already return, rather than casting past the interface"
    - "Diagnostic.getMessageString(d) at every remaining .message read in this plan's files (use-path-containment, extensionless-use-target, line-break-walk-termination), matching the pattern 114-04/114-05/114-08 established for the string | MarkupContent cascade"
    - "Mock-shaped fake target types declared standalone rather than intersected with the plain-function interface they stand in for (config-reload-host.test.ts): intersecting RestartTarget's own method signatures with Mock<...> property types produces an unsatisfiable combined type; Mock<T>'s own call signature already makes the fake structurally compatible with the interface at every call site"

key-files:
  modified:
    - bbj-vscode/test/fake-text-document-connection.ts
    - bbj-vscode/test/live-parse-scheduling.test.ts
    - bbj-vscode/test/on-save-trigger.test.ts
    - bbj-vscode/test/scope-cost-regression.test.ts
    - bbj-vscode/test/use-path-containment.test.ts
    - bbj-vscode/test/extensionless-use-target.test.ts
    - bbj-vscode/test/config-reload-host.test.ts
    - bbj-vscode/test/extension-config-trust.test.ts
    - bbj-vscode/test/java-interop-peer-guard.test.ts
    - bbj-vscode/test/composer-codelens.test.ts
    - bbj-vscode/test/bbj-parser-service.test.ts
    - bbj-vscode/test/logger.test.ts
    - bbj-vscode/test/line-break-walk-termination.test.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/composer-cue-single-source.test.ts
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts

key-decisions:
  - "use-path-containment.test.ts's possibly-undefined useStmt!.bbjClass (Use.bbjClass is an optional cross-reference in the grammar) is narrowed with an explicit if-throw rather than a second non-null assertion, so the test fails loudly (not silently passes with a wrong result) if a future change ever leaves the reference unset."
  - "logger.test.ts's debug=false case wraps the literal in Boolean(false) rather than adding a `: boolean` type annotation alone: TypeScript's control-flow analysis narrows a never-reassigned const to its own literal type for use-site comparisons regardless of an explicit widening annotation, so `debugEnabled === true` still reads as a same-value comparison unless the initializer itself is a non-literal-returning expression."
  - "config-reload-host.test.ts's createFakeTarget return type is declared as a standalone Mock-shaped object type, not `RestartTarget & {...}`: TypeScript resolves a shared property name across an intersected interface and object-literal type as the intersection of both declared types for that property, producing an unsatisfiable `(() => boolean) & Mock<() => boolean>` target that no vi.fn() value can satisfy. Its `overrides` parameter is retyped from `Partial<RestartTarget>` to `Partial<FakeRestartTarget>` for the same reason — every call site already passes Mock-typed overrides, never plain functions."
  - "java-interop-peer-guard.test.ts's five mocked javadoc fixtures are cast `as ClassDoc` (not left inferred against JavadocProvider.getDocumentation's own `NamedDoc | undefined` return type): NamedDoc has no fields/methods properties, and ClassDoc is the specific javadoc type these fixtures already structurally match verbatim."
  - "composer-cue-single-source.test.ts's ES2018-only dot-all regex flag is dropped outright rather than rewritten with a character-class substitute: the pattern contains no `.` at all, so the flag was a no-op inherited from an earlier draft — removing it changes nothing about what the pattern matches."

requirements-completed: []
# TEST-02 is also declared by 114-10 through 114-13 (all still open); requirements.ready-ids
# would report not-ready, so it is intentionally NOT marked complete here per the shared-ID gate.
# The last of those plans' SUMMARY triggers the mark once all declaring plans are done. Per this
# plan's explicit instruction, TEST-02 stays open here regardless — 114-13 closes it.

coverage:
  - id: D1
    description: "The shared fake text-document connection and the three fake FileSystemProvider classes (scope-cost-regression, use-path-containment, extensionless-use-target) type-check at zero errors, with every suite that uses them unchanged"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "cd bbj-vscode && npx tsc -p tsconfig.test.json --noEmit | grep -c '^test/(fake-text-document-connection|live-parse-scheduling|on-save-trigger|scope-cost-regression|use-path-containment|extensionless-use-target)' = 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/live-parse-scheduling.test.ts test/on-save-trigger.test.ts test/scope-cost-regression.test.ts test/use-path-containment.test.ts test/extensionless-use-target.test.ts test/live-parse-interleaving.test.ts test/on-save-kept-errors.test.ts (82/82 passed)"
        status: pass
      - kind: unit
        ref: "npx eslint test/fake-text-document-connection.ts test/live-parse-scheduling.test.ts test/on-save-trigger.test.ts test/scope-cost-regression.test.ts test/use-path-containment.test.ts test/extensionless-use-target.test.ts --max-warnings 0 exits 0; grep -cE '@ts-(nocheck|expect-error|ignore)|as any' on all four fixed files = 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The remaining ten fake- and fixture-typed files (config-reload-host, extension-config-trust, java-interop-peer-guard, composer-codelens, bbj-parser-service, logger, line-break-walk-termination, extension-activation, composer-cue-single-source, functional/installed-extension-e2e) reach zero type errors through real fixes, and the whole suite matches the baseline"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "npx tsc -p tsconfig.test.json --noEmit reports zero errors across all 16 of this plan's files; zero errors in src/; npm run build exits 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/config-reload-host.test.ts test/extension-config-trust.test.ts test/java-interop-peer-guard.test.ts test/composer-codelens.test.ts test/bbj-parser-service.test.ts test/logger.test.ts test/line-break-walk-termination.test.ts test/extension-activation.test.ts test/composer-cue-single-source.test.ts (194/194 passed)"
        status: pass
      - kind: other
        ref: "npx eslint on all 16 files --max-warnings 0 exits 0; git diff 1bb964a1 HEAD -- bbj-vscode/test | grep '^+[^+]' | grep -cE '@ts-(nocheck|expect-error|ignore)|as any|eslint-disable' = 0; same diff grepped for planning identifiers (D-NN/C-NN/CR-NN/WR-NN/TEST-NN/FIX-NN/phase-11N/T-11N-NN/11N-NN) = 0"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-09-run1.json, run2.json; digests baseline/suite-114-09-run1.txt, run2.txt): both interop5008=open, hookTimeoutSuites=0, numFailedTests=11, and FAILED_TEST lines byte-identical to baseline/suite-before.txt in both runs (diff exits clean both times, no re-run needed)"
        status: pass
    human_judgment: false

duration: 16min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 09: Test-Tree Type-Check Gate — Typed Fakes (Lint Group D) Summary

**The 16 test files whose type errors came from hand-written fakes and mocks (44 errors per the phase baseline) all type-check through real fixes — generic type arguments, rounded-out FileSystemProvider fakes, corrected Mock/vscode-configuration signatures, a ClassDoc-typed javadoc fixture, and a dropped no-op regex flag — with two whole-suite runs reproducing the phase's 11-test interop baseline exactly.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-27T20:13:42Z (approx, immediately after 114-08's SUMMARY commit)
- **Completed:** 2026-09-27T20:29:36Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- `fake-text-document-connection.ts`, `live-parse-scheduling.test.ts` and `on-save-trigger.test.ts` all give `NormalizedTextDocuments` its `TextDocument` type argument at every call site.
- `scope-cost-regression.test.ts`, `use-path-containment.test.ts` and `extensionless-use-target.test.ts`'s hand-written fake `FileSystemProvider` classes gain `existsSync`/`readBinary`/`readBinarySync`, each mirroring the class's own existing sync/async pairing.
- `use-path-containment.test.ts`'s diagnostics helper reads messages through `Diagnostic.getMessageString`, its `readDirectory` no longer passes an argument `readDirectorySync` doesn't take, and a possibly-undefined `bbjClass` reference is narrowed with a throwing check instead of a second non-null assertion.
- `extensionless-use-target.test.ts` gets `.js` suffixes on its three relative imports and reads its diagnostic message through `Diagnostic.getMessageString`.
- `config-reload-host.test.ts`'s fake restart target is retyped as a standalone `Mock`-shaped type (not intersected with `RestartTarget`'s own plain-function signatures), fixing both the property assignments and the `overrides` parameter.
- `extension-config-trust.test.ts`'s three fake `WorkspaceConfiguration` shapes give `get` an optional default parameter, matching `vscode`'s own generic signature.
- `java-interop-peer-guard.test.ts`'s five mocked javadoc fixtures are typed `as ClassDoc`, the javadoc type that actually declares `fields`/`methods`.
- `composer-codelens.test.ts` calls `provideCodeLens` with only the one argument it declares, at all four call sites.
- `bbj-parser-service.test.ts`'s `fakeDocument` returns a `WritableTextDocumentDocument` (same shape, mutable `textDocument`) instead of the real read-only-typed `LangiumDocument`.
- `logger.test.ts`'s `debugEnabled=false` case uses `Boolean(false)` so TypeScript's control-flow narrowing doesn't turn `=== true` into a same-value comparison.
- `line-break-walk-termination.test.ts` maps diagnostics through `Diagnostic.getMessageString` before filtering/returning them.
- `extension-activation.test.ts`'s `onNotificationMock` is typed with the `(method, handler)` parameters the real code calls it with.
- `composer-cue-single-source.test.ts` drops its ES2018-only dot-all regex flag — a no-op, since the pattern contains no `.`.
- `functional/installed-extension-e2e.test.ts` imports from `vscode-jsonrpc/node.js`, matching Node16 module resolution.
- Zero type errors across all 16 files, zero `src/` errors, `npm run build` green, `npx eslint` clean on all 16 files, and two whole-suite `npm test` runs reproduce `baseline/suite-before.txt`'s 11-test `FAILED_TEST` set exactly.

## Task Commits

1. **Task 1: The shared fake connection and the fake file-system providers type-check, with their suites unchanged** - `5a1e18c8` (fix)
2. **Task 2: The remaining ten fake- and fixture-typed files reach zero errors, and the whole suite matches the baseline** - `87cb9fcc` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/fake-text-document-connection.ts` - `NormalizedTextDocuments<TextDocument>`
- `bbj-vscode/test/live-parse-scheduling.test.ts` - `NormalizedTextDocuments<TextDocument>` at two call sites
- `bbj-vscode/test/on-save-trigger.test.ts` - `NormalizedTextDocuments<TextDocument>`, new `TextDocument` import
- `bbj-vscode/test/scope-cost-regression.test.ts` - `InMemoryFileSystemProvider` gains `existsSync`/`readBinary`/`readBinarySync`
- `bbj-vscode/test/use-path-containment.test.ts` - `SpyFileSystemProvider` rounded out; `fileNotResolvedErrors` typed against `Diagnostic[]`; extra `readDirectorySync` argument dropped; possibly-undefined `bbjClass` narrowed
- `bbj-vscode/test/extensionless-use-target.test.ts` - `.js` import suffixes; `InMemoryFileSystemProvider` rounded out; `Diagnostic.getMessageString`
- `bbj-vscode/test/config-reload-host.test.ts` - `createFakeTarget`/`FakeRestartTarget` retyped, standalone from `RestartTarget`
- `bbj-vscode/test/extension-config-trust.test.ts` - three fake `get` signatures given an optional default parameter
- `bbj-vscode/test/java-interop-peer-guard.test.ts` - five mocked javadoc fixtures cast `as ClassDoc`
- `bbj-vscode/test/composer-codelens.test.ts` - `provideCodeLens` called with one argument at four sites; unused `params` const dropped
- `bbj-vscode/test/bbj-parser-service.test.ts` - `fakeDocument` returns `WritableTextDocumentDocument`
- `bbj-vscode/test/logger.test.ts` - `Boolean(false)` instead of the `false` literal
- `bbj-vscode/test/line-break-walk-termination.test.ts` - `Diagnostic.getMessageString` at the diagnostics helper
- `bbj-vscode/test/extension-activation.test.ts` - `onNotificationMock` typed with its real call parameters
- `bbj-vscode/test/composer-cue-single-source.test.ts` - dot-all regex flag dropped
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - `vscode-jsonrpc/node.js` import specifier

## Decisions Made
See `key-decisions` in the frontmatter for the four decisions with the most reasoning behind them (the `bbjClass` narrowing choice, `logger.test.ts`'s `Boolean(false)` fix, `config-reload-host.test.ts`'s standalone Mock type, and the `ClassDoc` cast). Every other fix (generic type arguments, `.js` suffixes, `Diagnostic.getMessageString`, argument-count corrections) was already named or directly implied by the plan's own `<interfaces>` text.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `config-reload-host.test.ts`'s Mock-typed fake needed a second fix beyond the plan's own recipe**
- **Found during:** Task 2
- **Issue:** Typing `createFakeTarget`'s return properties as `Mock<() => boolean>` etc. (the plan's literal suggestion) still failed, because the return type was declared as `RestartTarget & {needsStop: Mock<...>, ...}` — TypeScript resolves a property name shared between an intersected interface and an object-literal type as the *intersection* of both declared types for that property, producing an unsatisfiable `(() => boolean) & Mock<() => boolean>` target no `vi.fn()` value can satisfy (this was the original error even before any fix, `(() => boolean) & Mock<Procedure | Constructable>`, so the intersection pattern itself was always the root cause, not the specific Mock type argument).
- **Fix:** Declared `FakeRestartTarget` as a standalone type (not intersected with `RestartTarget`), retyped `createFakeTarget`'s `overrides` parameter to `Partial<FakeRestartTarget>` (every call site already passes `vi.fn(...)` values, never plain functions), and removed the now-unused `RestartTarget` type import.
- **Files modified:** `bbj-vscode/test/config-reload-host.test.ts`
- **Verification:** `npx tsc -p tsconfig.test.json --noEmit` reports zero errors for this file; `npx vitest run test/config-reload-host.test.ts` passes; `npx eslint` clean.
- **Committed in:** `87cb9fcc` (Task 2 commit)

**2. [Rule 1 - Bug] `logger.test.ts`'s `: boolean` annotation alone did not fix the comparison**
- **Found during:** Task 2
- **Issue:** The plan's suggested fix ("declare the literal local with a boolean type") did not clear the error: TypeScript's control-flow analysis narrows a never-reassigned `const` to its own literal type at every read, even under an explicit widening type annotation, so `const debugEnabled: boolean = false; ... debugEnabled === true` still reported the same "no overlap" error.
- **Fix:** Wrapped the literal in `Boolean(false)` — a call expression with declared return type `boolean` (not a literal type), which TypeScript's narrowing does not collapse back to a literal. Same runtime value, same comparison result.
- **Files modified:** `bbj-vscode/test/logger.test.ts`
- **Verification:** `npx tsc -p tsconfig.test.json --noEmit` reports zero errors for this file; `npx vitest run test/logger.test.ts` passes.
- **Committed in:** `87cb9fcc` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — both cases where the plan's literal suggested fix needed a small correction to actually clear the TypeScript error; neither changed test behavior or scope). **Impact on plan:** Both auto-fixes were necessary to reach zero type errors as the plan required; no scope creep — the underlying intent (a Mock-shaped fake, a widened boolean comparison) is exactly what the plan asked for, just implemented with a mechanism TypeScript actually accepts.

## Issues Encountered

None beyond the two deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 16 files in this plan's TEST-02 "typed fakes" group are at zero type errors; combined with 114-07's and 114-08's earlier groups, the test-tree total continues to shrink toward zero for the remaining 114-10 through 114-12 plans.
- TEST-02 is also declared by 114-10 through 114-13 (all still open); per the shared-ID gate and this plan's explicit instruction, it is intentionally left un-marked in `REQUIREMENTS.md` here — plan 114-13 closes it once every declaring plan is done.
- `baseline/suite-114-09-run1.txt` and `baseline/suite-114-09-run2.txt` are committed alongside this SUMMARY as this plan's whole-suite evidence, matching the pattern of 114-02/114-04/114-06/114-08. Both runs matched the baseline exactly on the first attempt — no re-run investigation was needed this time.

## Self-Check: PASSED

All 16 modified files verified present on disk with their described edits. Both task commits (`5a1e18c8`, `87cb9fcc`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npx tsc -p tsconfig.test.json --noEmit` reports zero errors across this plan's 16 files and zero `src/` errors; `npm run build` exits 0; two whole-suite runs' `FAILED_TEST` lines are byte-identical to `baseline/suite-before.txt`.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
