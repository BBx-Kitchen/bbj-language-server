---
phase: 114-lint-type-check-test-suite-gates
plan: "05"
subsystem: testing
tags: [eslint, typescript-eslint, flat-config, lint-gate]

# Dependency graph
requires:
  - phase: 114-01
    provides: "baseline/suite-digest.mjs, baseline/suite-before.txt, explicit vitest test.include/exclude"
provides:
  - "eslint.config.js spreading tseslint.configs.recommended plus the D-01/D-02 overrides (test/** any/unused-expressions off, **/*.cjs no-require-imports off, prefer-const with ignoreReadBeforeAssign, no-unused-vars underscore patterns, reportUnusedDisableDirectives error, test/.tmp/** ignored)"
  - "package.json lint script as a zero-warning gate (eslint src test --max-warnings 0); vscode:prepublish inherits it unchanged"
  - "The prefer-const autofix landed across the 7 flagged files, leaving exactly the named hand-fix lists for 114-06 (src, 32 findings) and 114-08 (test, 19 findings)"
  - "test/eslint-disable-directives.test.ts: a repository-wide guard that fails on any file-wide or reason-less lint suppression comment in src/ or test/"
affects: [114-06, 114-08, 114-13]

actuals:
  tokens: 3650
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Directive-keyword self-avoidance: a source-guard test that scans for a specific comment keyword builds that keyword from separately-quoted string pieces joined at runtime, so the guard file's own source text never contains the keyword and cannot flag itself"

key-files:
  created:
    - bbj-vscode/test/eslint-disable-directives.test.ts
  modified:
    - bbj-vscode/eslint.config.js
    - bbj-vscode/package.json
    - bbj-vscode/src/document-formatter.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/test/config-hot-reload-wiring.test.ts
    - bbj-vscode/test/linking.test.ts
    - bbj-vscode/test/webview-panel-lifecycle.test.ts

key-decisions:
  - "tseslint.configs.recommended is spread with no files:['**/*.ts'] wrapper, matching the plan's <interfaces> measurement that the preset's rules also apply to src/Commands/Commands.cjs (its no-require-imports override is what turns that finding off, not an accidental exclusion)"
  - "The prefer-const autofix landed exactly 9 fixes across the 7 files the plan named; the 10th prefer-const finding (bbj-ws-manager.ts, declaration and assignment on separate statements) is confirmed not auto-fixable and stays for a later hand-fix plan"
  - "The disable-directive guard classifies a next-line/same-line suppression as valid only when a ' -- ' separator has non-empty text on both sides (a named rule, and a reason); a bare file-wide or range-form suppression is always a violation regardless of any text after it"

requirements-completed: []
# TEST-01 is also declared by 114-06, 114-08 and 114-13 (all still open); requirements.ready-ids
# reported 0/1 ready, so it is intentionally NOT marked complete here per the shared-ID gate.
# The last of those plans' SUMMARY triggers the mark once all four are done.

coverage:
  - id: D1
    description: "npm run lint applies the typescript-eslint recommended preset with exactly the D-01/D-02 overrides, proven by eslint --print-config on three representative files, and package.json's lint script is the zero-warning gate (eslint src test --max-warnings 0)"
    requirement: TEST-01
    verification:
      - kind: other
        ref: "eslint --print-config test/linking.test.ts / src/extension.ts / src/Commands/Commands.cjs, piped through a node assertion script checking the three overridden rules' severities"
        status: pass
      - kind: other
        ref: "A temporary untracked probe file with a reason-less next-line directive made `eslint --max-warnings 0` exit non-zero (Unused eslint-disable directive), then was deleted"
        status: pass
    human_judgment: false
  - id: D2
    description: "The prefer-const autofix lands in exactly the 7 named files (9 fixes), the build stays green, and the remaining lint findings after the fix are exactly the expected hand-fix lists (32 src for 114-06, 19 test for 114-08)"
    requirement: TEST-01
    verification:
      - kind: other
        ref: "npx eslint src test -f json | node <fixable-prefer-const-count script> prints 0; npm run build exits 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/linking.test.ts test/webview-panel-lifecycle.test.ts test/config-hot-reload-wiring.test.ts test/document-formatter.test.ts test/line-break-validation.test.ts test/document-builder.test.ts (184/184 non-skipped tests pass)"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs after this task: FAILED_TEST set is the 11-test linking.ts baseline plus 1-3 tests from a rotating set of three files, none touched by this plan, each reproduced standalone as pre-existing timing-sensitive flakiness under sustained external host CPU contention (see Deviations)"
        status: fail
    human_judgment: true
    rationale: "Neither whole-suite run reproduced baseline/suite-before.txt's FAILED_TEST set byte-for-byte. Every extra failure traces to one of three files this plan never touched (installed-extension-e2e.test.ts and parser-keyword-statements.test.ts, both already diagnosed as pre-existing flaky sources in 114-02's SUMMARY; document-symbol.test.ts, newly observed here at 5348ms against a 5000ms default timeout, absent on a second run of the same tree) under a continuously running unrelated host process (pipeline.knowledge_build, PID 3046266, 600-680% CPU throughout this plan's execution). A human should confirm this classification given the coordinator's request for extra rigor on whole-suite comparisons in this phase."
  - id: D3
    description: "A repository-wide guard test fails on a file-wide or reason-less lint suppression comment anywhere under src/ or test/, proven against both violation shapes and the one accepted shape, with no new eslint plugin installed"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npx vitest run test/eslint-disable-directives.test.ts (5/5 passed: 1 repository scan + 4 self-test cases)"
        status: pass
      - kind: other
        ref: "npx eslint test/eslint-disable-directives.test.ts --max-warnings 0 exits 0; grep -c 'eslint-disable' on the file prints 0 (the guard cannot flag itself)"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 05: Lint Gate — Recommended Preset, Autofix, Disable-Reason Guard (Lint Plan A) Summary

**`eslint.config.js` now spreads the typescript-eslint recommended preset with the D-01/D-02 overrides, `npm run lint` is a zero-warning gate, the prefer-const autofix landed in the 7 flagged files leaving exactly the 51-finding hand-fix list for plans 114-06/114-08, and a new source-guard test rejects any file-wide or reason-less lint suppression comment.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-27T17:52:42Z
- **Completed:** 2026-09-27T18:14:23Z
- **Tasks:** 3
- **Files modified:** 10 (1 created, 9 modified)

## Accomplishments
- `eslint.config.js` spreads `tseslint.configs.recommended` (unwrapped, so it also reaches `.cjs` files) plus five override concerns in the plan's specified block order: `out/**`/`src/language/generated/**`/`test/.tmp/**` ignored, `reportUnusedDisableDirectives: 'error'`, `prefer-const` with `ignoreReadBeforeAssign`, `no-unused-vars` accepting a leading underscore, `test/**` turning off `no-explicit-any`/`no-unused-expressions`, and `**/*.cjs` turning off `no-require-imports`.
- `package.json`'s `lint` script is now `eslint src test --max-warnings 0` (D-04); `vscode:prepublish` is byte-unchanged and still calls it, so packaging inherits the gate.
- The recommended preset with the target overrides reports exactly 60 findings at planning-measured counts (verified again here); `npx eslint src test --fix` removed the 9 auto-fixable `prefer-const` findings across the 7 named files, leaving exactly 51 (32 src, 19 test) matching the plan's `<interfaces>` per-file/per-rule table.
- `test/eslint-disable-directives.test.ts` walks every tracked `.ts`/`.cjs`/`.mjs`/`.js` file under `src/` and `test/` (skipping the Langium-generated AST module, `test/.tmp` and `test/test-data`) and fails on a file-wide/range-form suppression comment, or a next-line/same-line suppression missing a named rule and a non-empty reason after `' -- '`. The directive keyword is built from two joined string pieces at runtime everywhere in the file (including its own self-test fixtures), so it cannot flag itself.

## Task Commits

1. **Task 1: npm run lint applies the recommended preset with the targeted overrides, end to end** - `923b0814` (feat)
2. **Task 2: The prefer-const autofix lands and the remaining findings are exactly the hand-fix lists** - `156aeabb` (fix)
3. **Task 3: A guard test rejects file-wide and reason-less disable directives across src and test** - `12864f5f` (test)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/eslint.config.js` - recommended preset spread plus the D-01/D-02 override blocks
- `bbj-vscode/package.json` - `lint` script is now `eslint src test --max-warnings 0`
- `bbj-vscode/src/document-formatter.ts`, `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/src/language/bbj-scope.ts`, `bbj-vscode/src/language/validations/line-break-validation.ts` - prefer-const autofix (let → const, no other change)
- `bbj-vscode/test/config-hot-reload-wiring.test.ts`, `bbj-vscode/test/linking.test.ts`, `bbj-vscode/test/webview-panel-lifecycle.test.ts` - prefer-const autofix (let → const, no other change)
- `bbj-vscode/test/eslint-disable-directives.test.ts` - new repository-wide suppression-reason guard, 5 tests

## Decisions Made
- Spread `tseslint.configs.recommended` without a `files: ['**/*.ts']` wrapper, matching the plan's `<interfaces>` measurement (the preset's rules reach `.cjs` too, which is why the `**/*.cjs` override is needed to turn `no-require-imports` back off there rather than the file simply being out of scope).
- Confirmed the 10th `prefer-const` finding (`bbj-ws-manager.ts`) is genuinely not auto-fixable (declaration and assignment sit in separate statements) before leaving it out of this task's file list, exactly as the plan's `<interfaces>` predicted.
- Built the guard's directive keyword and every self-test fixture from runtime-joined string pieces (`'eslint' + '-' + 'disable'`, suffix constants for the next-line/same-line forms) so the new test file's own saved source text never contains the literal keyword — verified by `grep -c` on the committed file printing 0.

## Deviations from Plan

### Auto-fixed Issues

None — every task's edits were exactly what the plan specified (config rewrite, one script string, the autofix's own output, one new guard test file). No Rule 1/2/3 fixes were needed.

### Investigated, Non-Regressive Environmental Flakiness (whole-suite verification)

Task 2's acceptance criteria and the plan-level `<verification>` both require the whole-suite `FAILED_TEST` lines to equal `baseline/suite-before.txt`. Two whole-suite `npm test` runs were captured after all three tasks landed:

- **Run 1:** 14 failed tests — the 11-test `linking.test.ts` baseline, plus `test/functional/installed-extension-e2e.test.ts` (composer cue assertion), `test/parser-keyword-statements.test.ts` (`a verifier option whose value is absent is still a parser error`), and `test/document-symbol.test.ts` (`completely broken file returns empty or near-empty array`, recorded duration 5348ms against vitest's 5000ms default per-test timeout).
- **Run 2:** 13 failed tests — the same 11-test baseline plus only `installed-extension-e2e.test.ts` and `parser-keyword-statements.test.ts`; `document-symbol.test.ts` was absent this time.

**Classification, with evidence:**
1. The first two files (`installed-extension-e2e.test.ts`, `parser-keyword-statements.test.ts`) are the exact two sources 114-02's SUMMARY already investigated and classified as pre-existing, unrelated, contention-timing flakiness (not caused by any 114-xx plan) — the same test names, same failure shapes.
2. `test/document-symbol.test.ts` was newly observed here. Run alone (`npx vitest run test/document-symbol.test.ts`), it passed 7/7 in 6.13s with no flakiness. Its one whole-suite failure recorded a 5348ms duration — just over vitest's 5000ms default per-test timeout — matching the exact contention-timeout shape already diagnosed for `parser-keyword-statements.test.ts` in 114-02.
3. `git diff --quiet` against the commit immediately before this plan's Task 1 confirms all three files are byte-identical to the phase base — untouched by any of this plan's three tasks.
4. Throughout both whole-suite runs, `ps aux` showed the same unrelated host process already documented in 114-02's investigation (`.venv/bin/python -m pipeline.knowledge_build`, PID 3046266) consuming 600-680% CPU continuously, confirming the same sustained external contention source.
5. Both runs show `hookTimeoutSuites=0` and `interop5008=open`, matching baseline exactly — the actual invariants this phase's test-suite-gate work protects.

**Classification: not a regression.** All three extra failures are (a) pre-existing/untouched by this plan's changes and (b) shaped exactly like the timing-only contention artifacts 114-02 already diagnosed and documented (a rotating single extra test crossing the default 5000ms timeout under sustained unrelated CPU load), not a functional difference introduced by the config rewrite, the prefer-const autofix, or the new guard test. No fix was applied — none of the three files is in this task's scope, per the deviation-rules scope boundary.

---

**Total deviations:** 0 auto-fixed. 1 investigated-and-classified environmental finding (three timing-sensitive tests, two already documented in 114-02 and a third matching the identical pattern), reported with full evidence above per the coordinator's standing instruction for this phase.
**Impact on plan:** All three tasks' own deliverables (config, autofix, guard test) are fully verified and green in isolation and at reduced/targeted scope. The residual whole-suite gap against a byte-identical baseline match is attributable entirely to pre-existing, unrelated flakiness under sustained external host contention, consistent with 114-02's precedent and this project's standing decision that the regression gate is `numFailedTests`-based plus deterministic targeted-file runs, not a failing-suite identity delta.

## Issues Encountered

None beyond the whole-suite flakiness documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `114-06` (src hand fixes) and `114-08` (test hand fixes) can now run against the exact 51-finding remainder this plan produced; `114-13` lands the CI gate once both land.
- TEST-01 is also declared by `114-06`, `114-08` and `114-13` (all still open); per the shared-ID gate (`requirements.ready-ids` reported 0/1 ready), it is intentionally left un-marked in REQUIREMENTS.md here.
- Recommend a human review the "Investigated, Non-Regressive Environmental Flakiness" section above, and, time permitting, re-run the whole-suite verification once the host's external CPU contention has cleared, to obtain a byte-identical match against `baseline/suite-before.txt` for the record.

## Self-Check: PASSED

All 10 created/modified files verified present on disk. All three task commits (`923b0814`, `156aeabb`, `12864f5f`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npm run lint` reports exactly 51 findings (non-zero exit, expected until 114-06/114-08 land); `npx vitest run test/eslint-disable-directives.test.ts` passes 5/5; whole-suite `hookTimeoutSuites=0` and `interop5008=open` match baseline in both runs, with the `FAILED_TEST` gap fully investigated and classified above.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
