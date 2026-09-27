---
phase: 114-lint-type-check-test-suite-gates
plan: "12"
subsystem: testing
tags: [typescript, tsconfig, vscode-languageserver, vitest, composer]

# Dependency graph
requires:
  - phase: 114-02
    provides: "the hermetic createBBjTestServices double several of this plan's files already build on"
  - phase: 114-07
    provides: "the working tsconfig.test.json / typecheck:test gate this plan's 24 (+1 orchestrator-assigned) files are checked against, plus baseline/typecheck-before.txt's per-plan digest"
provides:
  - "TEST-02 fix group 'imports and singles' (D-05) at zero type errors: the 13 default-import files use the namespace form, the 9 suffix-only files carry .js, and the two composer UI fakes' FakeRange constructor honestly models both vscode.Range forms"
  - "test/eslint-disable-directives.test.ts (orchestrator-assigned addition, created after this plan was written) at zero type errors via the same namespace-import fix"
  - "npm run typecheck:test exits 0 for the whole test tree -- the last of the seven TEST-02 fix-group plans to land"
affects: [114-13]

actuals:
  tokens: 6100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "import * as x from '...' for Node built-ins in test files, matching src/decompile-io.ts and src/formatter-java-resolver.ts's convention under esModuleInterop false"
    - "Diagnostic.getMessageString(d) at the one remaining bare .message read (examples-compile.test.ts), matching the pattern 114-04/114-05/114-08/114-09/114-10/114-11 already established"
    - "A hoisted vitest fake constructor overloaded to accept both real-class constructor forms (vscode.Range's 4-number and 2-Position forms) via an instanceof branch, storing the same fields either way so every existing toEqual stays byte-identical"

key-files:
  modified:
    - bbj-vscode/test/workflow-secret-hygiene.test.ts
    - bbj-vscode/test/gradle-wrapper-hygiene.test.ts
    - bbj-vscode/test/formatter-verifier-tamper.test.ts
    - bbj-vscode/test/formatter-pins-drift.test.ts
    - bbj-vscode/test/examples-compile.test.ts
    - bbj-vscode/test/config-path-resolution.test.ts
    - bbj-vscode/test/compile-request.test.ts
    - bbj-vscode/test/lsp-protocol-single-copy.test.ts
    - bbj-vscode/test/example-files.test.ts
    - bbj-vscode/test/conformance-regressions.test.ts
    - bbj-vscode/test/builtin-library-members.test.ts
    - bbj-vscode/test/process-runner.test.ts
    - bbj-vscode/test/cpl-service.test.ts
    - bbj-vscode/test/eslint-disable-directives.test.ts
    - bbj-vscode/test/composer-commands.test.ts
    - bbj-vscode/test/addchildwindow-composer.test.ts
    - bbj-vscode/test/addwindow-composer.test.ts
    - bbj-vscode/test/composer-call-scanner.test.ts
    - bbj-vscode/test/parser-ambiguity-logging.test.ts
    - bbj-vscode/test/msgbox-composer.test.ts
    - bbj-vscode/test/code-action.test.ts
    - bbj-vscode/test/file-path-completion.test.ts
    - bbj-vscode/test/completion-test.test.ts
    - bbj-vscode/test/addwindow-composer-ui.test.ts
    - bbj-vscode/test/addchildwindow-composer-ui.test.ts

key-decisions:
  - "test/eslint-disable-directives.test.ts (created by 114-05 after this plan was authored, flagged UNOWNED in baseline/typecheck-before.txt) is fixed in Task 1 alongside the 13 default-import files, per the orchestrator's explicit scope-addition instruction: it has the identical `import fs from 'node:fs'` / `import path from 'node:path'` default-import pattern (TS1192/TS1259), so the same namespace-import fix applies verbatim with no new pattern needed."
  - "Both composer UI tests' hoisted FakeRange constructor is overloaded (not replaced) to accept `(number, number, number, number)` or `(FakePosition, FakePosition, undefined, undefined)`, computing the same four stored startLine/startCharacter/endLine/endCharacter fields from either input shape. This matches how production code actually calls `new vscode.Range(pos, pos)` (confirmed by grep across src/addwindow-composer-webview.ts and src/addchildwindow-composer-webview.ts) -- the fake needed to accept that call shape it was already being exercised with, not the test's own `expect()` value change."
  - "No test assertion, expected value, or matcher line was touched anywhere in this plan's 25 files; every fix is an import-form change, an import-suffix addition, a widened fake constructor, or (examples-compile.test.ts only) a message-read substitution that reads the identical string as before."

requirements-completed: []
# TEST-02 was declared by seven plans (114-04, 114-07 through 114-13); this is the sixth to land.
# Plan 114-13 marks it complete once its own work (and every declaring plan) is done, per the
# shared-ID gate (requirements.ready-ids) and the orchestrator's explicit instruction for this plan.

coverage:
  - id: D1
    description: "The 13 default-import files (plus the orchestrator-assigned eslint-disable-directives.test.ts) use the namespace import form for Node built-ins and type-check at zero errors, with unchanged test results and no compiler relaxation"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "cd bbj-vscode && npx tsc -p tsconfig.test.json --noEmit | grep -cE '^test/(workflow-secret-hygiene|gradle-wrapper-hygiene|formatter-verifier-tamper|formatter-pins-drift|examples-compile|config-path-resolution|compile-request|lsp-protocol-single-copy|example-files|conformance-regressions|builtin-library-members|process-runner|cpl-service|eslint-disable-directives)\\.test\\.ts' = 0 (14 files)"
        status: pass
      - kind: unit
        ref: "RUN_BBJ_TESTS=0 npx vitest run (the 14 files) -- 134 passed | 2 skipped (136 total), 0 failed"
        status: pass
      - kind: other
        ref: "grep -cE \"^import (fs|path|os|crypto) from '(node:)?(fs|path|os|crypto)'\" on all 13 originally-named files = 0 each; git diff e8941d48 -- tsconfig.json exits 0 (untouched); grep -cE 'esModuleInterop|allowSyntheticDefaultImports' tsconfig.test.json = 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The 9 suffix-only files gain .js on their relative imports, both composer UI tests' hoisted FakeRange constructor honestly models both vscode.Range forms with the same stored fields and no expected-value change, and the whole test tree reaches npm run typecheck:test exit 0 with the whole-suite FAILED_TEST set matching the phase baseline"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "npx tsc -p tsconfig.test.json --noEmit | grep -cE '^test/(composer-commands|addchildwindow-composer|addwindow-composer|composer-call-scanner|parser-ambiguity-logging|msgbox-composer|code-action|file-path-completion|completion-test|addwindow-composer-ui|addchildwindow-composer-ui)\\.test\\.ts' = 0 (11 files)"
        status: pass
      - kind: unit
        ref: "npx vitest run (the 11 files) -- 244 passed (244 total), 0 failed"
        status: pass
      - kind: other
        ref: "npm run typecheck:test exits 0 for the whole test tree (confirmed via both direct tsc invocation and the npm script itself); npm run build exits 0"
        status: pass
      - kind: other
        ref: "git diff e8941d48 -- (all 25 files) | grep '^+[^+]' | grep -cE '@ts-(nocheck|expect-error|ignore)|as any|eslint-disable' = 0; same diff for expect( in the two composer-UI files = 0; npx eslint test --max-warnings 0 exits 0; planning-identifier grep on the 24-file diff = 0"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-12-run1.json, run2.json): both interop5008=open, hookTimeoutSuites=0; run2 numFailedTests=11 with FAILED_TEST lines byte-identical to baseline/suite-before.txt; run1's one extra failure (installed-extension-e2e.test.ts composer-cue assertion) is a file untouched by this plan's diff and already a pre-existing FAILED_SUITE entry in the phase baseline itself (a documented stale-installed-bundle 'No document found' error, reproduced standalone), confirmed non-regressive"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 12: Test-Tree Type-Check Gate — Imports and Singles Summary

**The 24-file TEST-02 "imports and singles" group (50 errors: default-import Node built-ins, missing `.js` suffixes, and the composer UI fakes' `Range` constructor shape) plus the orchestrator-assigned `test/eslint-disable-directives.test.ts` all reach zero type errors, and `npm run typecheck:test` now exits 0 for the whole test tree — the last TEST-02 fix group to land.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-27T20:58:43Z (approx, immediately after 114-11's SUMMARY commit)
- **Completed:** 2026-09-27T21:08:08Z
- **Tasks:** 2
- **Files modified:** 25 (24 planned + 1 orchestrator-assigned)

## Accomplishments
- The 13 default-import files (`workflow-secret-hygiene`, `gradle-wrapper-hygiene`, `formatter-verifier-tamper`, `formatter-pins-drift`, `examples-compile`, `config-path-resolution`, `compile-request`, `lsp-protocol-single-copy`, `example-files`, `conformance-regressions`, `builtin-library-members`, `process-runner`, `cpl-service`) switch `fs`/`os`/`path`/`crypto` default imports to the namespace form (`import * as fs from '...'`), matching `src`'s own convention under `esModuleInterop false`. A pre-check confirmed no `vi.spyOn`/`vi.mock` targets any of these built-in module objects.
- `examples-compile.test.ts`'s one message read (`(d.message ?? '').includes(...)`) now goes through `Diagnostic.getMessageString(d)`.
- Orchestrator-assigned addition: `test/eslint-disable-directives.test.ts` (created by 114-05 after this plan was authored, flagged `UNOWNED` in `baseline/typecheck-before.txt`) carries the identical default-import pattern for `node:fs`/`node:path` and got the same fix in Task 1.
- The 9 suffix-only files (`composer-commands`, `addchildwindow-composer`, `addwindow-composer`, `composer-call-scanner`, `parser-ambiguity-logging`, `msgbox-composer`, `code-action`, `file-path-completion`, `completion-test`) gain the missing `.js` on their relative imports.
- `addwindow-composer-ui.test.ts` and `addchildwindow-composer-ui.test.ts`'s hoisted `FakeRange` constructor is widened to accept both `vscode.Range` constructor forms (four numbers, or two `Position`s with trailing `undefined` arguments), storing the same four public fields either way — verified against production's own `new vscode.Range(pos, pos)` call sites in `addwindow-composer-webview.ts`/`addchildwindow-composer-webview.ts`.
- `npm run typecheck:test` exits 0 for the whole test tree (confirmed via both a direct `tsc -p tsconfig.test.json --noEmit` and the npm script itself) — the last of the seven TEST-02 fix-group plans (114-04, 114-07 through 114-13) to close its own error share, and the plan that closes the tree to zero.
- `npm run build` stays green; `npx eslint test --max-warnings 0` is clean; whole-suite run 2 reproduces `baseline/suite-before.txt`'s 11-test `FAILED_TEST` set exactly.

## Task Commits

1. **Task 1: The 13 default-import files use namespace imports and type-check, with unchanged results** (plus the orchestrator-assigned `eslint-disable-directives.test.ts`) - `4409865d` (fix)
2. **Task 2: The suffix-only files and the composer UI fakes close, and the whole test tree type-checks at exit 0** - `b0d472d7` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/workflow-secret-hygiene.test.ts`, `gradle-wrapper-hygiene.test.ts`, `formatter-verifier-tamper.test.ts`, `formatter-pins-drift.test.ts`, `config-path-resolution.test.ts`, `compile-request.test.ts`, `lsp-protocol-single-copy.test.ts`, `example-files.test.ts`, `conformance-regressions.test.ts`, `builtin-library-members.test.ts`, `process-runner.test.ts`, `cpl-service.test.ts` - `fs`/`os`/`path`/`crypto` default imports switched to the namespace form
- `bbj-vscode/test/examples-compile.test.ts` - same namespace-import fix, plus one `Diagnostic.getMessageString` message-read fix
- `bbj-vscode/test/eslint-disable-directives.test.ts` - namespace-import fix (orchestrator-assigned addition)
- `bbj-vscode/test/composer-commands.test.ts`, `addchildwindow-composer.test.ts`, `addwindow-composer.test.ts`, `composer-call-scanner.test.ts`, `parser-ambiguity-logging.test.ts`, `msgbox-composer.test.ts`, `code-action.test.ts`, `file-path-completion.test.ts`, `completion-test.test.ts` - missing `.js` suffixes added to relative imports
- `bbj-vscode/test/addwindow-composer-ui.test.ts`, `addchildwindow-composer-ui.test.ts` - hoisted `FakeRange` constructor widened to accept both `vscode.Range` forms

## Decisions Made
See `key-decisions` in the frontmatter for the two decisions with the most reasoning behind them (the orchestrator-assigned file's inclusion in Task 1, and the `FakeRange` overload design matching production's actual call shape). Every other fix (namespace-import conversion, `.js` suffix addition) was already named or directly implied by the plan's own `<interfaces>` text.

## Deviations from Plan

None beyond the orchestrator's own explicit scope addition (documented above, not a deviation from the plan itself — the plan's objective and success criteria were written with this exact "last plan closes the tree to zero" expectation in mind, and the UNOWNED file was assigned to this plan by the orchestrator before execution began, not discovered mid-task).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All seven TEST-02 fix-group plans (114-04, 114-07 through 114-13's own work) have now landed their file shares; `npm run typecheck:test` exits 0 for the whole test tree.
- TEST-02 is also declared by 114-13 (not yet landed); per the shared-ID gate (`requirements.ready-ids`) and the orchestrator's explicit instruction for this plan, it is intentionally left un-marked in `REQUIREMENTS.md` here — 114-13 closes it once its own work is done.
- `coverage/phase-114/114-12-run1.json` and `run2.json` are the whole-suite evidence for this plan (gitignored raw reports; run2's digest matched `baseline/suite-before.txt`'s `FAILED_TEST` set exactly).

## Self-Check: PASSED

All 25 modified files verified present on disk with their described edits. Both task commits (`4409865d`, `b0d472d7`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npx tsc -p tsconfig.test.json --noEmit` and `npm run typecheck:test` both exit 0 with zero errors anywhere in the test tree; `npm run build` exits 0; whole-suite run 2's `FAILED_TEST` lines are byte-identical to `baseline/suite-before.txt`.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
