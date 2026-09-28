---
phase: 115-honest-interop-test-harness
plan: "05"
subsystem: testing
tags: [interop-harness, report-builder, html-report, json-highlighter, vitest, typescript]

# Dependency graph
requires:
  - phase: 115-04
    provides: "types.ts/scaffold.ts/cases.ts/gate.ts as side-effect-free library modules, the fake-peer server (test/interop-harness-fake-peer.ts) with healthy fixtures and per-test overrides, and run-tests.ts still holding the report functions and the CLI"
provides:
  - "report-template.ts — REPORT_STYLES (the CSS, moved verbatim) and renderPage(parts), a single interpolating function with no logic and no runtime file lookup"
  - "report.ts — escapeHtml, syntaxHighlightJson, toJsonText, truncateJson, statusBadge, and the small section builders (summary bar, matrix, field-check table, assertion table, per-case section); generateReport(results, matrixRows, verdict, host, port, generatedAt?) assembles them"
  - "run-tests.ts thinned to the CLI only: argument parsing, main() and the fatal handler (126 lines, down from 1,078 at the phase base)"
  - "test/interop-harness-report.test.ts — 14 tests: the real CLI run through the pinned local tsx against the fake peer (healthy and the #514 stub), pure syntaxHighlightJson/toJsonText tests, and report-colouring/escaping tests against generateReport's real output"
affects: [115-06]

# Actuals (#2632)
actuals:
  tokens: 11948
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "report-template.ts holds only static CSS text and one interpolating function (renderPage); report.ts holds every escaping/highlighting/section-building function; run-tests.ts holds only CLI concerns — a third split layer under the same side-effect-free-library-plus-thin-CLI shape 115-04 established for the scaffold/cases/gate"
    - "Every report.ts/report-template.ts/cases.ts function stays under ESLint's max-lines-per-function (60, skipping blank lines and comments), checked ad hoc in this plan's own verification rather than added to the project's permanent eslint.config.js rule set"
    - "generatedAt is an optional Date parameter on generateReport, defaulting to `new Date()`, so a test can pass a fixed date and assert on the report's exact generated-timestamp text"

key-files:
  created:
    - bbj-vscode/tools/interop-test-harness/report.ts
    - bbj-vscode/tools/interop-test-harness/report-template.ts
    - bbj-vscode/test/interop-harness-report.test.ts
  modified:
    - bbj-vscode/tools/interop-test-harness/run-tests.ts

key-decisions:
  - "generateReport's argument order is (results, matrixRows, verdict, host, port, generatedAt?) — verdict moved third (it was last in the pre-split run-tests.ts), matching the plan's stated signature; the one call site in run-tests.ts's main() was updated to match"
  - "toJsonText is exported from report.ts (not listed in the plan's own 'exports' interface note, which named only generateReport/syntaxHighlightJson/escapeHtml) so the must-have truth about the value-to-JSON-text helper turning undefined into the text null could be tested directly rather than only indirectly through generateReport's output"
  - "The CLI test resolves bbj-vscode's own directory from this test file's own module URL (fileURLToPath(new URL('..', import.meta.url))) rather than process.cwd(), so the child process spawns with a correct cwd regardless of which directory vitest itself was invoked from"

requirements-completed: []  # HARN-02, HARN-03 and HARN-06 are also declared by sibling plan 115-06, still in progress; requirements.ready-ids reports 0/3 ready — none marked here, per the shared-ID gate

coverage:
  - id: D1
    description: "The report is built by a side-effect-free report.ts, and the CSS and page shell live in report-template.ts as exported TypeScript strings (REPORT_STYLES) and a single interpolating function (renderPage) — no runtime file lookup, and run-tests.ts is now only the header, argument parsing and main()"
    requirement: HARN-06
    verification:
      - kind: other
        ref: "grep -cE 'readFileSync|readFile\\(|from .node:fs.|from .fs.' report-template.ts report.ts — 0 for both; grep -cE 'function (escapeHtml|syntaxHighlightJson|truncateJson|statusBadge|generateReport)\\b' run-tests.ts — 0; grep -c \"from './report.js'\" run-tests.ts — 1; wc -l run-tests.ts — 126 (< 150)"
        status: pass
    human_judgment: false
  - id: D2
    description: "generateReport is assembled from small functions (summary bar, matrix, field-check table, assertion table, per-case section, JSON block). No function in report.ts, report-template.ts or cases.ts exceeds 60 lines"
    requirement: HARN-06
    verification:
      - kind: other
        ref: "npx eslint tools/interop-test-harness/report.ts tools/interop-test-harness/report-template.ts tools/interop-test-harness/cases.ts --rule max-lines-per-function:60 (skipBlankLines, skipComments) --max-warnings 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Running the CLI (node --import tsx, the pinned local tsx) against the healthy fake peer exits 0, prints 17 ✓ case lines and 'Results: 17 passed, 0 failed, 0 errors', and writes a report with 17 PASS badges. Against the #514 stub it exits 1, prints ✗ for cases 12, 13, 14, 16 and 17, and the report shows 12 passed, 5 failed, 0 errors with 5 FAIL badges"
    requirement: HARN-02
    verification:
      - kind: integration
        ref: "test/interop-harness-report.test.ts#CLI against a fake peer (2 tests, both pass)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The report of a healthy fake-peer run wraps the key error in a json-key span and the escaped-quote value Class \\\"com.nonexistent.Fake\\\" not found in a json-string span, quotes and backslashes rendered as &quot; and \\ (#596)"
    requirement: HARN-03
    verification:
      - kind: integration
        ref: "test/interop-harness-report.test.ts#report colouring and escaping (#596) > colours the escaped key and string value of the nonexistent-class error, and shows the Critical column"
        status: pass
    human_judgment: false
  - id: D5
    description: "A JSON string value containing an escaped quote, <, & or non-ASCII characters (é, —, ✓) sits in exactly one json-string span, with <, > and & rendered only as &lt;/&gt;/&amp; and quotes only as &quot;; a peer class name holding markup (<img src=x>) reaches the report only escaped"
    requirement: HARN-03
    verification:
      - kind: unit
        ref: "test/interop-harness-report.test.ts#syntaxHighlightJson (escaped-quote, markup/ampersand and non-ASCII tests)"
        status: pass
      - kind: integration
        ref: "test/interop-harness-report.test.ts#report colouring and escaping (#596) > escapes markup in a peer class name so it never reaches the report raw"
        status: pass
    human_judgment: false
  - id: D6
    description: "The JSON text of null gives a json-null span; an absent value (JSON.stringify returning undefined) renders as the text null through the report's value-to-JSON-text helper without throwing; empty objects and arrays render with no spans and no error"
    requirement: HARN-03
    verification:
      - kind: unit
        ref: "test/interop-harness-report.test.ts#syntaxHighlightJson (top-level null, empty object/array and toJsonText tests)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The whole harness directory is lint-clean under the src rule set (no explicit any), leaving only the lint/type-check scope widening for the next plan"
    requirement: HARN-06
    verification:
      - kind: other
        ref: "npx eslint tools/interop-test-harness --max-warnings 0 (whole directory, default src rules including no-explicit-any)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-28
status: complete
---

# Phase 115 Plan 05: Report Module Split, Type-Checked Template and the #596 Highlighter Pin Summary

**generateReport split into small section builders behind a type-checked report-template.ts page shell, run-tests.ts thinned from 1,078 to 126 lines, and 14 new CI tests prove the real CLI, the console output, the report badges and #596's escaped-quote JSON highlighting all agree — with zero `any` anywhere in the harness.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-28T08:15:00Z
- **Completed:** 2026-09-28T08:27:20Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 rewritten)

## Accomplishments
- `report-template.ts` holds `REPORT_STYLES` (the CSS text, moved verbatim from the old inline `<style>` block) and `renderPage(parts)`, one template literal that interpolates already-built, already-escaped fragments into the full HTML document — no logic, no runtime file lookup
- `report.ts` holds `escapeHtml`, `syntaxHighlightJson`, `toJsonText`, `truncateJson`, `statusBadge`, and the small section builders `buildSummaryBar`, `buildMatrixSection`/`buildMatrixRowHtml`, `buildFieldCheckTable`, `buildAssertionTable` and `buildCaseSection`; `generateReport(results, matrixRows, verdict, host, port, generatedAt?)` assembles them and calls `renderPage`. Every function in `report.ts`, `report-template.ts` and `cases.ts` stays under ESLint's 60-line-per-function limit
- `run-tests.ts` is now the thin CLI only — argument parsing, `main()` and the fatal handler — down from 1,078 lines at the phase base to 126, importing `generateReport` from `./report.js` and nothing report-related
- `test/interop-harness-report.test.ts` grew from 0 to 14 tests across 3 describe blocks: `CLI against a fake peer` spawns the real harness through `node --import tsx` and proves the console lines, the exit code and the report's PASS/FAIL badges and summary-stat counts all agree for both a healthy peer (17 passed) and the `#514` stub (12 passed, 5 failed); `syntaxHighlightJson` pins #596 with pure tests over keys, an escaped-quote string, HTML markup/ampersands, non-ASCII characters, a colon-bearing key, array elements, numbers/booleans/null, a top-level null, empty containers, and the value-to-JSON-text helper; `report colouring and escaping (#596)` runs the real suite against the fake peer and asserts on `generateReport`'s actual output — the nonexistent-class error's key and escaped-quote value each get their own span, summary-stat counts match the verdict, the Critical column renders, and a peer class name carrying markup (`<img src=x>`) reaches the report only escaped
- `npx eslint tools/interop-test-harness --max-warnings 0` is clean across the whole directory under the default src rule set (`no-explicit-any` included) — the next plan only has to widen `eslint.config.js`'s scanned directories and `tsconfig.test.json`'s include to cover it permanently

## Task Commits

Each task was committed atomically:

1. **Task 1: The CLI, run through the pinned tsx against the fake peer, writes a report whose badges and counts agree with its console lines and exit code** - `87544b23` (feat)
2. **Task 2: #596 is pinned: keys and string values carry their spans, escaped quotes included, and peer text reaches the report only escaped** - `89dc9c2e` (test)

**Plan metadata:** committed alongside this SUMMARY (see below)

## Files Created/Modified
- `bbj-vscode/tools/interop-test-harness/report.ts` — escaping/highlighting helpers, section builders, `generateReport`
- `bbj-vscode/tools/interop-test-harness/report-template.ts` — `REPORT_STYLES` and `renderPage`
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` — thinned to the CLI (argument parsing, `main()`, fatal handler)
- `bbj-vscode/test/interop-harness-report.test.ts` — CLI end-to-end tests, highlighter unit tests, report colouring/escaping tests

## Decisions Made
- `generateReport`'s argument order became `(results, matrixRows, verdict, host, port, generatedAt?)` per the plan's own stated signature — `verdict` moved from last to third, and the one call site in `run-tests.ts`'s `main()` was updated to match; no other behavioural change.
- `toJsonText` is exported from `report.ts`, one export beyond the plan's own "exports" interface note (`generateReport`, `syntaxHighlightJson`, `escapeHtml`), so the must-have truth about an absent value rendering as the text `null` could be tested directly instead of only indirectly through a full report's text.
- The CLI test resolves the `bbj-vscode` directory from its own module URL (`fileURLToPath(new URL('..', import.meta.url))`) rather than `process.cwd()`, so the spawned child process's `cwd` is correct regardless of the directory vitest itself is invoked from.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Regression Check

Whole-suite run (`npx vitest run --maxWorkers=2`): 3484 passed, 11 failed, 30 skipped, 3525 total; 160/162 test files passed. The 11 failures are the same `test/linking.test.ts` "Interop related tests" cases documented in the 115-04 SUMMARY (a live BBjServices on `:5008` switches on `shouldRunBBjTests()` independent of `RUN_BBJ_TESTS`), plus `test/functional/installed-extension-e2e.test.ts` reporting as a failed suite with 0 failed assertions (pre-existing stale-bundle condition). Neither failing file touches anything this plan changed. `npm run typecheck:test` and `npm run lint` both exit 0 clean, and `npx eslint tools/interop-test-harness --max-warnings 0` is clean across the whole directory.

## Next Phase Readiness
- `report.ts`, `report-template.ts`, the thinned `run-tests.ts`, and `test/interop-harness-report.test.ts` are ready for plan 06, which turns on `eslint.config.js`'s and `tsconfig.test.json`'s permanent coverage of `tools/interop-test-harness` (D-13/D-14) and runs the before/after live `:5008` diff (D-20).
- The harness was not run against the live interop peer on `:5008` in this plan, per its own shell rules; D-20's before/after live diff is owned by a later plan, same as noted in 115-04.
- No blockers.

## Self-Check: PASSED

- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/report.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/report-template.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/test/interop-harness-report.test.ts` — FOUND
- `git log --oneline --all | grep -q 87544b23` — FOUND
- `git log --oneline --all | grep -q 89dc9c2e` — FOUND
- All task `<acceptance_criteria>` re-verified: PASS (see Accomplishments and Coverage)
- Plan-level `<verification>` re-run: `env -u RUN_BBJ_TESTS npx vitest run test/interop-harness-report.test.ts test/interop-harness.test.ts` — 40 passed, 0 failed — PASS; `npx eslint tools/interop-test-harness --max-warnings 0` — clean — PASS; `npm run typecheck:test` — clean — PASS; `npm run lint` — clean — PASS; harness type probe clean — PASS; CLI smoke on a closed port exits 2 with the connection hint — PASS

---
*Phase: 115-honest-interop-test-harness*
*Completed: 2026-09-28*
