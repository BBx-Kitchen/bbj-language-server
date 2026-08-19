---
phase: 67-apply-easy-fixes
plan: 09
subsystem: textmate-grammar-and-extension-host
tags: [textmate, vscode-textmate, syntax-highlighting, extension-activation, vitest, json, dual-ide]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-01's apparatus (67-APPLY-SET.md ledger, 67-BASELINE.md baseline, the
      red-then-green/test-is-the-fix commit conventions), 67-08's vi.mock('vscode', ...) pattern
      for testing extension-host code outside the extension host
provides:
  - Six closed ledger rows in 67-APPLY-SET.md — P62-D2-007, P62-D2-008, P62-D2-009, P62-D5-004
    (closed no-op by cross-reference), P62-D2-004, P62-D2-006
  - "### Plan 67-09 delta" section in 67-BASELINE.md recording verdict: identical (3 full runs)
  - bbj-vscode/test/extension-activation.test.ts — the first test module that imports and calls
    extension.ts's real activate(), via a full vi.mock('vscode', ...) plus mocks for
    vscode-languageclient/node and every extension-only UI/registration module
  - bbj-vscode/test/language-configuration.test.ts — strict-JSON + entry-count regression for
    bbj-language-configuration.json
  - Three corrected TextMate grammar rules in bbj.tmLanguage.json (string content, bare REM,
    IOL=/LEN=), reaching both VS Code and IntelliJ as a shared bundled resource
affects: [67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 9800
  tasks: 3
  commits: 11

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full extension-host activation test: vi.mock('vscode', ...) with the complete surface
       activate() touches synchronously (window/commands/languages/workspace), plus
       vi.mock('vscode-languageclient/node', ...) supplying a fake LanguageClient whose start()
       is a shared vi.fn, plus vi.mock(...) for every sibling extension-only module
       (fs-provider, the four composer-ui registrars, Commands.cjs) so the real activate() runs
       end-to-end and its .catch()-attached rejection handling is observed directly, not inferred"
    - "TextMate begin-pattern optional-trailing-token via alternation with a zero-width lookahead:
       [rR][eE][mM]([ \\t]|(?=$)) accepts both the with-trailing-whitespace and bare-end-of-line
       forms in one rule, and incidentally activates a previously-inert beginCaptures group"

key-files:
  created:
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/language-configuration.test.ts
  modified:
    - bbj-vscode/syntaxes/bbj.tmLanguage.json
    - bbj-vscode/test/textmate-highlighting.test.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/bbj-language-configuration.json
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P62-D2-009 branch taken: dropped the trailing \\B assertion after the IOL=/LEN= alternation
     entirely rather than replacing it with a (?=\\d) lookahead — live tokenization confirmed the
     pre-existing space/end-of-line-terminated form already worked, and a value-only lookahead
     would have regressed it. Recorded in the ledger row's notes: rather than assumed silently."
  - "P62-D5-004 closed no-op: its test-5 clause names exactly three missing assertions (string-
     content scope purity, bare-REM recognition, IOL=/LEN= with a value attached), and all three
     were landed verbatim as the regression tests for P62-D2-007/008/009 in the same file the
     record names — no fourth assertion was missing, so no delta commit was made. commit: field
     names all three resolving shas per the plan's own required format."
  - "P62-D2-004's reporting path chosen as console.error (logging) + vscode.window.showErrorMessage
     (user-facing surfacing) — showErrorMessage is the file's established pattern for every other
     user-visible failure (EM login, Java class refresh, missing bbj.home), not the output channel,
     which this file uses for lower-level command-output logging instead"
  - "The Index table's six rows for this plan (45-49, 54) were updated to match the Rows section,
     following the precedent set by plans 67-01 through 67-07; rows 50-53/55/56/58 from plan 67-08
     were found already-stale in the Index (still 'pending' despite 'applied' Rows entries) but
     left untouched, since fixing them would edit content this plan's cited finding IDs do not
     name"

requirements-completed: []

coverage:
  - id: FIX-01
    description: "Every applied fix traces to a finding ID by commit message; commit message shape
      <type>(<FINDING-ID>): <what changed> used for all ten code commits in this plan"
    verification:
      - kind: other
        ref: "git log --format=%s -10 shows six test()/fix() commit pairs plus P62-D2-006's pair, each naming exactly one finding ID"
        status: pass
    human_judgment: false
  - id: FIX-02
    description: "Five of six findings landed red-then-green with an observed pre-fix failure
      recorded in fail_before:; P62-D5-004 recorded fail_before: inapplicable per D-13 (D5 test-
      coverage-gap record, no code red state applies)"
    verification:
      - kind: unit
        ref: "test/textmate-highlighting.test.ts, test/extension-activation.test.ts, test/language-configuration.test.ts — each new/extended test observed failing on its own pre-fix commit before the matching fix commit landed"
        status: pass
    human_judgment: false
  - id: FIX-04
    description: "All three grammar rows and P62-D2-004 recorded user_facing: yes in 67-APPLY-SET.md
      with failure_scenario/fix_applied fields Phase 68's DOC-01 can lift verbatim"
    verification:
      - kind: other
        ref: "67-APPLY-SET.md rows 45,47,48,49 — user_facing: yes"
        status: pass
    human_judgment: false

duration: ~9min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 09: TextMate Grammar, Extension Activation and Language-Config JSON Summary

**Fixed three shared-grammar TextMate defects (string content over-scoped as character escapes,
bare `REM` unrecognized as a comment, `IOL=`/`LEN=` losing keyword highlighting when a value is
attached), closed the D5 coverage-gap row that named the same three behaviours as a no-op, surfaced
a previously-unobserved `client.start()` rejection in the VS Code extension host, and fixed two
trailing commas that made `bbj-language-configuration.json` invalid strict JSON — all six landed
with red-proven regression tests and closed against `67-APPLY-SET.md`.**

## Performance

- **Duration:** ~9 min (commit span 2026-08-19T14:14:30Z -> 14:22:58Z)
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments

- **P62-D2-007** — removed the unconditional `#string-character-escape` include from both
  `string.quoted.double.bbj` and `string.quoted.single.bbj` patterns arrays (each drops from 1
  entry to 0) and deleted the now-unused repository rule. Every character of BBj string content
  (e.g. the `hello` in `"hello"`) previously carried `constant.character.escape.bbj` on top of the
  string scope for no reason — BBj has no character-escape syntax inside strings.
- **P62-D2-008** — changed the comment `begin` pattern from `[rR][eE][mM][ \t]` (trailing
  space/tab mandatory) to `[rR][eE][mM]([ \t]|(?=$))`, so a bare `REM` at end of line — a valid,
  complete no-op comment per the language server's own lexer — is now recognized. Confirmed via
  live tokenization that `REM`, `REM this is a comment`, and `REMARK = 1` all scope exactly as
  intended, and that `beginCaptures.1` (previously inert, since the pre-fix pattern had no
  capturing group at all) now correctly scopes the space/tab branch.
- **P62-D2-009** — dropped the trailing `\B` word-boundary assertion after the `IOL=`/`LEN=`
  alternation. `IOL=5` and `LEN=10` (the realistic, value-attached form used in real code) now
  scope as `keyword.control.bbj`; the previously-working space/end-of-line-terminated form
  continues to work since no lookahead was substituted in its place.
- **P62-D5-004** — closed no-op: its named three assertions (string-content purity, bare-REM
  recognition, IOL=/LEN= value-attached) are exactly the three regression tests just committed for
  P62-D2-007/008/009, in the exact file (`test/textmate-highlighting.test.ts`) the record names.
- **P62-D2-004** — attached a `.catch()` to `client.start()` in `startLanguageClient()`
  (`extension.ts:892`), logging via `console.error` and surfacing via
  `vscode.window.showErrorMessage('BBj language server did not start: ...')` — the file's
  established user-facing reporting path. Verified via a new `test/extension-activation.test.ts`
  that mocks `vscode`, `vscode-languageclient/node` (with a fake `LanguageClient` whose `start()`
  is a shared `vi.fn`), and every extension-only UI/registration module, then calls the real
  `activate()` and asserts the rejection is observed.
- **P62-D2-006** — removed the two trailing commas in `bbj-language-configuration.json` (after
  the last `autoClosingPairs` element, and after `onEnterRules`' closing bracket). Verified with a
  new `test/language-configuration.test.ts` that strict-`JSON.parse`s the file and checks every
  collection keeps its pre-fix entry count (comments=1, brackets=3, autoClosingPairs=7,
  surroundingPairs=5, onEnterRules=3).
- Closed all six ledger rows in `67-APPLY-SET.md` (both the detailed Rows section and the summary
  Index table) with `user_facing: yes` on the three grammar rows and `P62-D2-004`, and recorded the
  `### Plan 67-09 delta` in `67-BASELINE.md`: `npm run lint` exit 0 zero warnings, `npm test`'s
  11-name interop gate set identical across three full runs, `./gradlew build` not re-run (the
  grammar and language-config reach IntelliJ as a bundled resource with no `bbj-intellij/` file
  changed).

## Task Commits

Each task was committed atomically:

1. **Task 1: The three TextMate grammar defects and the coverage row that names them**
   - `3a32cef` — `test(P62-D2-007): add failing test for escape scope leaking into string content` (RED)
   - `4c7b973` — `fix(P62-D2-007): drop the character-escape include from both string rules` (GREEN)
   - `5026129` — `test(P62-D2-008): add failing test for a bare REM at end of line` (RED)
   - `b30fc6c` — `fix(P62-D2-008): accept a bare REM with no trailing whitespace` (GREEN)
   - `eb81320` — `test(P62-D2-009): add failing test for IOL= and LEN= with a value attached` (RED)
   - `283cdd3` — `fix(P62-D2-009): stop requiring a word boundary after IOL= and LEN=` (GREEN)
   - P62-D5-004 closed no-op — no commit; see 67-APPLY-SET.md row 54 for the cross-reference
2. **Task 2: Extension activation rejection and the non-strict language-configuration JSON**
   - `7729e06` — `test(P62-D2-004): add failing test for an unobserved client.start rejection` (RED)
   - `36de32d` — `fix(P62-D2-004): surface a language-server start failure` (GREEN)
   - `295c7a6` — `test(P62-D2-006): add failing test for non-strict language-configuration JSON` (RED)
   - `8c49e2f` — `fix(P62-D2-006): remove the two trailing commas from the language configuration` (GREEN)
3. **Task 3: Close the six ledger rows and run the plan baseline delta**
   - `708cb71` — `docs(67-09): close TextMate, extension and language-config rows and record baseline delta`

## Files Created/Modified

- `bbj-vscode/syntaxes/bbj.tmLanguage.json` — 3 pattern edits (string escape include removed x2,
  repository rule dropped; comment begin pattern relaxed; keyword \B dropped)
- `bbj-vscode/test/textmate-highlighting.test.ts` — 4 new regression tests
- `bbj-vscode/src/extension.ts` — `.catch()` attached to `client.start()`
- `bbj-vscode/test/extension-activation.test.ts` — new, 2 test cases
- `bbj-vscode/bbj-language-configuration.json` — 2 trailing commas removed
- `bbj-vscode/test/language-configuration.test.ts` — new, 2 test cases
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — 6 ledger rows + Index entries closed
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-09 delta` added

## Decisions Made

- **P62-D2-009 branch:** dropped `\B` entirely instead of substituting `(?=\d)`, because live
  tokenization showed the pre-existing space/end-of-line-terminated form of `IOL=`/`LEN=` already
  worked and a digit-only lookahead would have silently regressed it. Recorded in the ledger row.
- **P62-D5-004:** closed `no-op` per the record's own escape clause rather than adding a fourth
  redundant assertion — its three named gaps are exactly what P62-D2-007/008/009's tests now cover.
- **P62-D2-004's reporting path:** `vscode.window.showErrorMessage`, matching the file's own
  dominant convention for user-facing failures (EM login, Java-class refresh, missing `bbj.home`),
  not the output channel — which this file reserves for lower-level command-output logging.
- **Index table:** updated only this plan's six rows (45-49, 54); left plan 67-08's already-stale
  Index entries (rows 50-53, 55, 56, 58 still show `pending` despite `applied` Rows content)
  untouched, since editing them would be an edit this plan's cited finding IDs do not name (FIX-01
  transparency prohibition).

## Deviations from Plan

None — plan executed exactly as written. The two implementation-detail choices above (P62-D2-009's
branch, P62-D2-004's reporting path) were explicitly left to executor discretion by the plan's own
`<action>` text ("Read the file first and use whichever reporting path already exists"; "State
which branch you took in the ledger row's `notes:`"), not deviations from it.

## Issues Encountered

- The Index table in `67-APPLY-SET.md` was found already out of sync with the Rows section for
  plan 67-08's six rows (50-53, 55, 56 still read `pending | pending` despite `applied` verdicts
  and commit hashes in their Rows entries). Not fixed here — out of this plan's scope per FIX-01
  (no edit to content a cited finding ID does not name) — flagged for plan 67-12's phase close to
  reconcile.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Six more of the phase's 77 ledger rows closed (bringing the running total to `3 + 1 + 5 + 6 + 8
  + 10 + 10 + 6 + 6` closed across plans 67-01 through 67-09 — see `67-APPLY-SET.md`'s `## Index`
  for the authoritative count, noting rows 50-53/55/56/58's known staleness above).
- The full-`activate()` extension-host testing pattern in `test/extension-activation.test.ts` is
  reusable for any future test needing to exercise `extension.ts` end-to-end without a real VS
  Code host.
- No blockers for plan 67-10.

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk; all 11 commit hashes (the 10 task commits
plus this Summary's own docs commit) confirmed present in `git log --oneline --all`.
