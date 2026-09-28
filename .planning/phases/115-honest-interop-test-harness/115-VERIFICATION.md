---
phase: 115-honest-interop-test-harness
verified: 2026-09-28T09:22:45Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 115: Honest Interop Test Harness Verification Report

**Phase Goal:** The interop test harness reports what really happened, gates on exactly the fields
it declares, runs from a pinned dependency, and is type-checked, linted and tested in CI like the
rest of the code.
**Verified:** 2026-09-28T09:22:45Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every case derives status from its assertions; no case hard-codes `status: 'pass'` | ✓ VERIFIED | `grep -n "status: 'pass'" cases.ts scaffold.ts gate.ts run-tests.ts report.ts` → 0 matches. `deriveStatus()` in `scaffold.ts:136-140` is the sole status source, used by every case through `runRequest`. Tautology scan (`assert('...', true)`) → 0 matches. Cases 9/10/13/14/17 each carry one real disjunction assertion (`cases.ts:184-276`), pinned by fake-peer tests that flip each case's outcome (`test/interop-harness.test.ts` — "missing critical field", "mistyped critical field", "nonexistent class rejected by the peer", "loadClasspath rejected by the peer", "a dropped connection during case 17 is error, not pass", "empty getClassInfos arrays" — all present and passing) |
| 2 | Gate checks exactly the declared `criticalFields` list; header names those fields and documents `--timeout` | ✓ VERIFIED | `gate.ts:12-15` exports one `CRITICAL_FIELDS` tuple (8 fields); `isCriticalFieldCheck` matches on `finalSegment` (exact final path segment, no substring match, `gate.ts:21-33`); `evaluateGate` (`gate.ts:42-58`) is the single verdict consumed by `main()`, the console summary and `generateReport`. `run-tests.ts:1-27` header names `CRITICAL_FIELDS`'s 8 fields, the present-and-typed rule, all 3 exit codes, and documents `--host`/`--port`/`--output`/`--timeout` (default 15000ms, connection timeout only) |
| 3 | HTML report colours JSON keys and string values correctly, including escaped quotes | ✓ VERIFIED | `report.ts:39-59` `syntaxHighlightJson` is highlight-then-escape (classify token, then `escapeHtml` each token and each gap exactly once) — fixes #596's root cause (escaping before highlighting broke the quote-anchored regexes). Pinned by unit tests over escaped quotes, markup/`&`, non-ASCII, colon-bearing keys, arrays, numbers/bool/null, empty containers (`test/interop-harness-report.test.ts` "syntaxHighlightJson" describe, 45 total harness tests all pass). Also confirmed by the phase's blocking-human checkpoint: human answered "approved" after inspecting the real rendered `report-end.html` (608 json-key, 609 json-string spans per 115-06-SUMMARY) |
| 4 | All cases share the harness's request scaffold; `defineTests`/`generateReport` split into smaller functions; harness runs through a pinned `tsx` devDependency with no `npx` download | ✓ VERIFIED | `grep -c 'sendRequest('` → 1 (only inside `scaffold.ts`'s `runRequest`). All 17 cases in `cases.ts` are declarative `CaseRecord`s wrapped by `defineCase`. `cases.ts`/`gate.ts`/`report.ts`/`report-template.ts`/`scaffold.ts`/`types.ts` are 7 small side-effect-free modules (`run-tests.ts` itself is 126 lines: header + CLI args + `main()` only). `package.json devDependencies.tsx` = `"4.23.15"` (exact, no range); `package-lock.json` records `node_modules/tsx` at 4.23.15 as dev; `npm ls tsx --depth=0` lists it direct. `grep -c 'npx' run-tests.ts` → 0; no shebang (file starts with `/**`) |
| 5 | CI type-checks, lints and runs the harness's own tests, so a PR that breaks any of them fails | ✓ VERIFIED | `package.json` scripts: `lint` = `"eslint src test tools/interop-test-harness --max-warnings 0"`; `typecheck:test` = `"tsc -p tsconfig.test.json --noEmit && tsc -p tsconfig.harness.json --noEmit"`. Re-ran both locally: `npm run lint` exit 0, `npm run typecheck:test` exit 0. `tsconfig.harness.json` extends `tsconfig.json` (strict, `noImplicitAny` on — confirmed no `"noImplicitAny": false"` in the file). `tsconfig.test.json` include gains `tools/interop-test-harness/**/*.ts`. `.github/workflows/build.yml`'s existing Lint / Type-check test tree / Test steps are unchanged (per D-18) and now transitively cover the harness. Harness tests (`test/interop-harness.test.ts`, `test/interop-harness-report.test.ts`, plus `test/eslint-disable-directives.test.ts` whose `SCAN_ROOTS` now includes `'tools/interop-test-harness'`) re-run: 45 passed, 0 failed, `RUN_BBJ_TESTS` unset, no `:5008` connection (all `connect()` calls target `127.0.0.1` + an in-process fake-peer ephemeral port) |

**Score:** 5/5 roadmap success criteria verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/tools/interop-test-harness/types.ts` | type-only module, wire DTOs | ✓ VERIFIED | 142 lines, 0 runtime `const`/`let`/`function`/`class` declarations, 0 references to `src/language` |
| `bbj-vscode/tools/interop-test-harness/scaffold.ts` | `connect`, `runRequest`, `deriveStatus`, `isPeerErrorReply`, `defineCase`, field-check helpers | ✓ VERIFIED | 232 lines, all named exports present, 0 explicit `any`, `onClose(() => conn.dispose())` present |
| `bbj-vscode/tools/interop-test-harness/cases.ts` | 17 case records, `runSuite`, `buildMatrixRow` | ✓ VERIFIED | 455 lines, 17 case names byte-identical to phase base (D-01..D-03 honest assertions), `inMatrix: true` × 9, `acceptsPeerError: true` × 2 (cases 10, 17) |
| `bbj-vscode/tools/interop-test-harness/gate.ts` | `CRITICAL_FIELDS`, `finalSegment`, `isCriticalFieldCheck`, `evaluateGate` | ✓ VERIFIED | 58 lines, matches D-05/D-06/D-07 exactly |
| `bbj-vscode/tools/interop-test-harness/report.ts` | escaping/highlighting, section builders, `generateReport` | ✓ VERIFIED | 283 lines, highlight-then-escape confirmed by direct read |
| `bbj-vscode/tools/interop-test-harness/report-template.ts` | `REPORT_STYLES`, `renderPage` | ✓ VERIFIED | 224 lines, no file reads |
| `bbj-vscode/tools/interop-test-harness/run-tests.ts` | thin CLI | ✓ VERIFIED | 126 lines (down from 1,058 at phase base), header + `parseCliArgs` + `main()` + fatal handler only |
| `bbj-vscode/test/interop-harness-fake-peer.ts` | in-process fake JSON-RPC peer | ✓ VERIFIED | listens on `127.0.0.1:0`, healthy fixtures + overrides + `drop()` hook |
| `bbj-vscode/test/interop-harness.test.ts` | fake-peer CI suite | ✓ VERIFIED | present, part of the 45 passing tests |
| `bbj-vscode/test/interop-harness-report.test.ts` | CLI + highlighter + report tests | ✓ VERIFIED | present, part of the 45 passing tests |
| `bbj-vscode/tsconfig.harness.json` | src-strict type-check program for the harness | ✓ VERIFIED | extends `./tsconfig.json`, includes only the harness dir, no `noImplicitAny: false` |
| `bbj-vscode/package.json` | tsx pin + scripts | ✓ VERIFIED | `devDependencies.tsx: "4.23.15"`, `scripts.interop-harness`, widened `lint`/`typecheck:test` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| every case record | `runRequest` | `defineCase` wraps each record | ✓ WIRED | `cases.ts:397` `harnessCases = caseRecords.map(defineCase)` |
| `runRequest`'s catch path | `isPeerErrorReply` | opt-in-only peer-error classification | ✓ WIRED | `scaffold.ts:199` `if (record.acceptsPeerError && isPeerErrorReply(err))` |
| `connect()` | `MessageConnection.dispose` | `onClose` handler | ✓ WIRED | `scaffold.ts:116` `conn.onClose(() => conn.dispose())` |
| `main()` | `evaluateGate` | single verdict drives console/report/exit | ✓ WIRED | `run-tests.ts:102,115,119` |
| `generateReport` | `CRITICAL_FIELDS`/`isCriticalFieldCheck` | matrix subtitle + Critical column | ✓ WIRED | `report.ts:7,160,199` |
| `package.json scripts.interop-harness` | `run-tests.ts` | local pinned `tsx` | ✓ WIRED | verified end-to-end: closed-port smoke test exits 2 with the connection hint |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run lint` covers `tools/interop-test-harness` at src strictness | `npm run lint` | exit 0, clean | ✓ PASS |
| `npm run typecheck:test` covers the harness at src strictness | `npm run typecheck:test` | exit 0, clean (both `tsconfig.test.json` and `tsconfig.harness.json`) | ✓ PASS |
| Harness's own CI tests pass with no live peer | `env -u RUN_BBJ_TESTS npx vitest run test/interop-harness.test.ts test/interop-harness-report.test.ts test/eslint-disable-directives.test.ts` | 3 files, 45 tests, 0 failed | ✓ PASS |
| No hardcoded pass / tautology / multiple sendRequest sites | grep scans across all harness `.ts` files | 0 / 0 / 1 (scaffold only) | ✓ PASS |
| tsx pinned exact, no npx | `node -e` check of `package.json`/`package-lock.json`; `grep -c npx run-tests.ts` | 4.23.15 exact, locked, direct dep; 0 npx occurrences | ✓ PASS |

(Live before/after run against real BBjServices on `:5008`, whole-suite `numFailedTests: 0`, and the human checkpoint approval were already established by the orchestrator's evidence and 115-06-SUMMARY.md, and are consistent with the code re-verified above.)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEP-03 | 115-01 | Harness runs from pinned `tsx` devDependency, no `npx` download | ✓ SATISFIED | `package.json`/`package-lock.json`, no shebang, no npx |
| HARN-01 | 115-02, 115-03 | No case hard-codes `status: 'pass'`; real assertion result | ✓ SATISFIED | `deriveStatus`, 0 tautologies, cases 9/10/13/14/17 rewritten |
| HARN-02 | 115-04, 115-06 | Harness type-checked, linted, tested in CI | ✓ SATISFIED | lint/typecheck:test scope, 45 passing CI tests, no `:5008` dependency |
| HARN-03 | 115-03, 115-05 | JSON highlighter handles escaped quotes | ✓ SATISFIED | highlight-then-escape, pinned by tests + human sign-off |
| HARN-04 | 115-03 | Gate checks exactly the declared `criticalFields` list | ✓ SATISFIED | `CRITICAL_FIELDS`, exact-final-segment match, `evaluateGate` |
| HARN-05 | 115-03 | Header describes gate fields and documents `--timeout` | ✓ SATISFIED | `run-tests.ts:1-27` header |
| HARN-06 | 115-02, 115-04, 115-05 | Duplicated scaffolds unified; oversized functions split | ✓ SATISFIED | one `runRequest`, 7 small modules, all functions under 60 lines (eslint-checked in 115-05) |

No orphaned requirements: `.planning/REQUIREMENTS.md` maps exactly these 7 IDs to Phase 115, and all 7 are declared across the six plans' `requirements:` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-vscode/tools/interop-test-harness/report.ts` | 119-121 | `buildSummaryBar` divides by `total` with no zero guard (WR-03 in 115-REVIEW.md) | ℹ️ Info/Warning | Cannot be hit through the current 17-case CLI or tests (`total` is always 17); a future 0-case caller would render `NaN%` in the progress bar. Not a phase-goal blocker |
| `bbj-vscode/tools/interop-test-harness/cases.ts` | 174 | `hasErrorField`'s doc comment claims exact parity with `java-interop.ts`'s truthiness check, which is not strictly true for `error: 0`/`NaN` (WR-01 in 115-REVIEW.md) | ℹ️ Info/Warning | Behaviorally equivalent for every value shape the real peer sends; a documentation-precision gap, not a functional defect |
| `bbj-vscode/test/eslint-disable-directives.test.ts` | 43-62 | Directive match not boundary-anchored — could misclassify prose containing the substring `eslint-disable` (WR-02 in 115-REVIEW.md) | ℹ️ Info/Warning | No such text exists in the scanned roots today (verified); would only misfire on future text, and only as a false positive (blocks a merge, not silently permits one) |

These three items are carried in `115-REVIEW.md` (0 critical, 3 warnings, 1 info) as advisory code-review findings. None of them causes a hardcoded pass, an unwired gate, an uncoloured report, an unpinned dependency, or an untested/unlinted harness — the five things the phase goal requires. They do not block phase completion; they are pre-existing, low-severity robustness/documentation gaps outside the phase's must-have truths.

### Debt Markers

`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` scan across all phase-modified harness and test files: none found.

### Human Verification Required

None. The phase's one blocking-human checkpoint (115-06 Task 3: coloured report, header, before/after table) was already answered "approved" during plan execution, with the concrete evidence (608 `json-key` / 609 `json-string` spans, header lines 1-27, 17-row identical before/after table) recorded in `115-06-SUMMARY.md`. Re-inspection of the same code paths above is consistent with that sign-off.

### Gaps Summary

None. All 5 roadmap success criteria, all 12 plan-level must-have truths (across the six plans' frontmatter), and all 7 requirement IDs (DEP-03, HARN-01..06) are verified against the actual codebase, not just SUMMARY claims. `npm run lint`, `npm run typecheck:test`, and the harness's own 45 CI tests were independently re-run during this verification and all passed clean. The three code-review warnings in `115-REVIEW.md` are real but low-severity and orthogonal to the phase's must-have truths — they do not represent gaps in goal achievement.

---

_Verified: 2026-09-28T09:22:45Z_
_Verifier: Claude (gsd-verifier)_
