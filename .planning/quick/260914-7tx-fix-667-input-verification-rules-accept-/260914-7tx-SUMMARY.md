---
phase: 260914-7tx-fix-667-input-verification-rules-accept-
plan: 01
subsystem: language-server-grammar
tags: [langium, chevrotain, grammar, parser, bbj]

requires: []
provides:
  - "VerifyOptions grammar rule accepts a lone numeric literal/expression or LEN=min,max as the entire verify list, not only string/hex-keyed options"
  - "A verify list (':(' ... ')') closes with RPAREN instead of RPAREN_NL, so it can be followed by more input items or a semicolon on the same line"
affects: [parser, input-statement-validation]

actuals:
  tokens: 2504
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Chevrotain ALL(*) alternative ordering: keeping the existing keyed VerifyOption sequence first in the VerifyOptions alternation preserves its priority over the newly added lone-expression alternative for ambiguous inputs like \"Y\"=lbl"

key-files:
  created:
    - bbj-vscode/test/test-data/issue667-input-verify-expression.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser.test.ts

key-decisions:
  - "Kept the keyed VerifyOption alternative first in the VerifyOptions alternation body so ALL(*) lowest-alternative-index resolution keeps string/hex-keyed options classified as VerifyOption, never as an expression"
  - "Replaced the RPAREN_NL terminal with the existing RPAREN data-type rule (RPAREN_NL | RPAREN_NO_NL) rather than inventing a new terminal, since RPAREN already existed and is used by SqlCloseStatement"
  - "Used the langium-cli runGenerator fallback (process.chdir + dynamic import of loadConfig/runGenerator) instead of `npm run langium:generate`, which fails on this host's Node v24.20.0 with jsonschema 1.5.0's TypeError: Invalid URL before writing any file; CI runs Node 22 and is unaffected"

patterns-established: []

requirements-completed: ["GH-667"]

coverage:
  - id: D1
    description: "The exact #667 INPUT line (c=7 then INPUT (0,err=*same)\"...\",pick:(c)) parses with zero lexer/parser errors and zero validation diagnostics, with pick:(c) captured as a single LastVerifyOption whose min is the SymbolRef to c"
    requirement: "GH-667"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser.test.ts#INPUT verify list with numeric literal or expression #667"
        status: pass
    human_judgment: false
  - id: D2
    description: "Bare numeric/expression/LEN verify lists (n:(4), n:(a+1), x$:(LEN=1,5)) parse as a single LastVerifyOption, ENTER/READ statements with a bare verify option parse cleanly, and a verify list followed by more input items or a semicolon (x$:(\"end\"=3000),y$ / n:(4),m / x$:(LEN=1,5),n:(-10.5),z$ / n:(4);print n) parses without requiring the closing paren to end the line"
    requirement: "GH-667"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser.test.ts#INPUT verify list: bare final option and list followed by items #667"
        status: pass
    human_judgment: false
  - id: D3
    description: "String- and hex-keyed verify options (\"Y\"=lbl, $AAFF00$=lbl, \"FRED\"=2100,\"MARY\"=3000, \"Q\"=3000,99.99) still produce VerifyOption elements with a StringLiteral key and a UserLabelRef/number lineref, never a LastVerifyOption expression, so the alternative-ordering fix does not silently reclassify existing keyed forms"
    requirement: "GH-667"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser.test.ts#INPUT verify list: string and hex keyed options still parse as keyed #667"
        status: pass
    human_judgment: false
  - id: D4
    description: "parser.test.ts (218 passed, 1 skipped) and example-files.test.ts (issue667-input-verify-expression.bbj parses with zero lexer/parser errors) pass, npm run build compiles cleanly against the regenerated AST, npm run lint reports no new errors, and the whole suite shows no failures beyond the known 12-test local interop baseline"
    requirement: "GH-667"
    verification:
      - kind: unit
        ref: "npm --prefix bbj-vscode test -- test/parser.test.ts test/example-files.test.ts (218 passed, 1 skipped)"
        status: pass
      - kind: other
        ref: "npm --prefix bbj-vscode run build"
        status: pass
      - kind: other
        ref: "npm --prefix bbj-vscode run lint"
        status: pass
      - kind: integration
        ref: "npm --prefix bbj-vscode test -- --maxWorkers=2 (12 failed / 1885 passed / 8 skipped, matching known baseline exactly)"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-14
status: complete
---

# Quick Task 260914-7tx: Fix #667 INPUT verification rules accept numeric literals/expressions Summary

**VerifyOptions grammar rule widened to accept a lone numeric/expression or LEN=min,max verify option and to allow a verify list to be followed by more input items, via a two-line bbj.langium change plus regenerated parser sources**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 3 (1 grammar file, 1 test file, 1 new fixture)

## Accomplishments
- Fixed GitHub issue #667: `pick:(c)`, `n:(4)`, `n:(a+1)`, `x$:(LEN=1,5)` and similar bare numeric/expression/LEN verify options now parse instead of raising a `STRING_LITERAL`/`HEX_STRING` parser error
- A verify list is no longer required to end the line — `INPUT x$:("end"=3000),y$`, `INPUT n:(4),m` and `INPUT n:(4);print n` all parse cleanly
- Existing string- and hex-keyed verify options (`"Y"=lbl`, `$AAFF00$=lbl`, `"FRED"=2100,"MARY"=3000`) are proven to keep their `VerifyOption` AST shape, guarding against a future alternative-reordering regression
- Added a parse-only regression fixture (`issue667-input-verify-expression.bbj`) auto-checked by `example-files.test.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — the issue #667 INPUT line parses (failing test → grammar → regenerated parser → green)** - `082d02f8` (fix)
2. **Task 2: Expand #667 coverage — bare numeric/LEN lists, lists followed by items, keyed forms unchanged, parse-only fixture** - `42fa24bb` (test)

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - `VerifyOptions` rule body widened to `':(' (keyed sequence | elements+=LastVerifyOption) RPAREN`, replacing the old string-keyed-only-then-`RPAREN_NL` shape
- `bbj-vscode/test/parser.test.ts` - Three new `#667` tests (issue-line regression, bare/follow-on-item coverage, keyed-form guards) plus extended `isXxx` guard imports from generated AST
- `bbj-vscode/test/test-data/issue667-input-verify-expression.bbj` - New parse-only fixture exercising the issue line, bare verify options, follow-on items, `ENTER`/`READ` forms

## Decisions Made
- Kept the keyed `VerifyOption` alternative first in the alternation so Chevrotain's ALL(*) lowest-alternative-index resolution keeps `"Y"=lbl`-style keyed options classified as `VerifyOption` rather than as an ambiguous relational expression
- Replaced `RPAREN_NL` with the existing `RPAREN` data-type rule (`RPAREN_NL | RPAREN_NO_NL`) instead of adding a new terminal, matching the pattern already used by `SqlCloseStatement`
- Regenerated parser sources via the langium-cli `runGenerator` fallback (documented in the plan) because `npm run langium:generate` fails on this host's Node v24.20.0/jsonschema 1.5.0 combination with `TypeError: Invalid URL` before writing any file; confirmed the fallback reproduces byte-identical output to the normal CLI path and that CI (Node 22) is unaffected

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` and `<verify>` steps; no Rule 1-4 auto-fixes were needed and no architectural questions arose.

## Issues Encountered
- `npm run langium:generate` failed with the pre-documented Node 24 `TypeError: Invalid URL` from `jsonschema`'s config-schema validation. Used the plan's pre-verified `runGenerator` fallback (`node --input-type=module -e` script calling `loadConfig`/`runGenerator` directly), which succeeded and produced the expected widened `VerifyOptions.$type` in `ast.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Fix is complete, tested, and isolated to the `VerifyOptions` rule; no follow-up work identified by this task
- Not addressed (out of scope per plan): a space between the colon and the paren (`n: (4)`), dependency upgrades, and the Node 24 `langium:generate` breakage beyond using the documented fallback

---
*Quick task: 260914-7tx-fix-667-input-verification-rules-accept-*
*Completed: 2026-09-14*

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (082d02f8, 42fa24bb) confirmed present in git log.
