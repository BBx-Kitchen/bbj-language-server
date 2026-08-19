---
phase: 67-apply-easy-fixes
plan: 06
subsystem: language-server
tags: [langium, dead-code-removal, refactoring, documentation-accuracy, claude-md, vitest]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-05's closed D2 correctness rows and the P61-D2-005 fix (STRING_LITERAL
      doubled-quote un-escaping), which P61-D8-002 resolves against as a no-op in this plan
provides:
  - Nine closed D4/D8 ledger rows in 67-APPLY-SET.md — P61-D4-006, P61-D4-008, P61-D4-009,
    P61-D4-012, P61-D8-002 (no-op), P61-D8-003, P61-D8-004, P61-D8-005, P62-D8-001
  - "### Plan 67-06 delta" section in 67-BASELINE.md recording verdict: identical
  - The first plan in the phase to touch files outside bbj-vscode/src/ — the repo-root CLAUDE.md
affects: [67-07, 67-08, 67-09, 67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 12060
  tasks: 3
  commits: 9

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D4 dead-code disposition: before deleting a method that looks like a duplicate, confirm
       which copy is actually DI-registered/called (registerValidationChecks() vs.
       registerClassChecks()'s own separately-instantiated ClassValidator) rather than assuming
       either copy is equivalent by name alone"
    - "D4 extraction shape: a shared private helper (formatSourceLocation, reloadJavaClassesAndRevalidate)
       called from both original call sites, each site's own surrounding control flow (try/catch
       shape, return value) left untouched — only the duplicated middle sequence moves"
    - "D8 no-op disposition: when a finding record's own escape clause names an alternative
       resolution already landed by an earlier plan in the same phase, re-read the comment against
       the fixed code and close the row commit: none rather than editing an already-accurate comment"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/language/bbj-cpl-service.ts
    - CLAUDE.md
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md
  deleted:
    - bbj-vscode/src/language/assertions.ts

key-decisions:
  - "P61-D4-006 branch taken: delete BBjValidator.checkClassReference/isSubFolderOf (dead —
     never registered) rather than wire them up, because check-classes.ts's own ClassValidator
     carries a strictly more complete equivalent (adds warnUnresolvableType for #438) already
     wired into registerClassChecks() and called at every real site"
  - "P61-D8-002 closed no-op: bbj.langium:948's comment ('\"\" escapse \" inside a string. Also \\
     as a plain non escape char. Handled in BBjValueConverter') is now accurate after P61-D2-005's
     fix (plan 67-05, commit 4db8169) — re-read against the post-fix converter and confirmed both
     clauses hold, so no edit was made, per the record's own 'or fix the code' escape clause"
  - "P61-D8-005's Completion bullet names 7 other LSP feature providers (read live from
     bbj-module.ts's BBjModule lsp service group), not the 'ten' the original finding record
     estimated — the record's count also included the documentation-group CommentProvider, the
     bbj-use-insert.ts helper (not a registered service), and BBjSharedModule's separately-scoped
     NodeKindProvider; recorded as found rather than re-asserting the wrong number"
  - "P62-D8-001's TextMate file list independently re-derived from bbj-intellij/build.gradle.kts's
     copyTextMateBundle task rather than trusted from the finding record's prose, confirming the
     same four-file set (bbj.tmLanguage.json, bbx.tmLanguage.json, bbj-language-configuration.json,
     bbx-language-configuration.json)"
  - "FIX-01/FIX-03/FIX-04 left Pending in REQUIREMENTS.md, following 67-01/67-05's established
     precedent — this plan closes 9 more of the 77 apply-set rows but does not complete the phase;
     marking the phase-level requirements complete is deferred to 67-12 (phase close)"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "BBjValidator's dead checkClassReference/isSubFolderOf methods (never DI-registered, shadowed by check-classes.ts's own ClassValidator copy) removed"
    requirement: "FIX-01"
    verification:
      - kind: other
        ref: "cd bbj-vscode && npm run build && npm run lint && npx vitest run test/linking.test.ts test/imports.test.ts test/unresolvable-type.test.ts test/validation.test.ts test/classes.test.ts — build/lint exit 0, same 11 pre-existing linking.test.ts failures (137 passed, 1 skipped, unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "bbj-linker.ts's getSourceLocation/getSourceLocationForNode duplication extracted into shared resolveWorkspaceRoot/formatSourceLocation helpers, byte-identical output"
    requirement: "FIX-01"
    verification:
      - kind: other
        ref: "cd bbj-vscode && npx vitest run test/linking.test.ts test/imports.test.ts test/unresolvable-type.test.ts — same 11 named failures, whose embedded [in <file>.bbj:<line>] strings are unchanged"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unused assertions.ts module (zero consumers, re-confirmed via grep at HEAD) deleted"
    requirement: "FIX-01"
    verification:
      - kind: other
        ref: "grep -rn 'assertions.js|assertTrue' bbj-vscode/src bbj-vscode/test — no hits post-deletion; cd bbj-vscode && npm run build && npm run lint both exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "main.ts's two Java-classpath-reload handlers extracted into a shared private reloadJavaClassesAndRevalidate(), main.cjs build gated"
    requirement: "FIX-01"
    verification:
      - kind: other
        ref: "cd bbj-vscode && npm run build — exit 0, produces out/language/main.cjs; grep -c 'reloadJavaClassesAndRevalidate' src/language/main.ts = 3"
        status: pass
    human_judgment: false
  - id: D5
    description: "bbj.langium:948's escape-behavior comment re-verified against the post-P61-D2-005 BBjValueConverter — already accurate, closed no-op with zero commits"
    requirement: "FIX-04"
    verification:
      - kind: other
        ref: "review-only: bbj-value-converter.ts's STRING_LITERAL case (input.slice(1,-1).replace(/\"\"/g,'\"')) confirmed to un-escape doubled quotes with no backslash handling; npm run langium:generate leaves src/language/generated/ unchanged (0 diff)"
        status: pass
    human_judgment: false
  - id: D6
    description: "CLAUDE.md's Validation bullet now lists validations/check-function-calls.ts"
    requirement: "FIX-04"
    verification:
      - kind: other
        ref: "grep -c 'validations/check-function-calls.ts' CLAUDE.md = 1; ls bbj-vscode/src/language/validations/check-function-calls.ts succeeds"
        status: pass
    human_judgment: false
  - id: D7
    description: "bbj-cpl-service.ts's class comment and setTimeout() doc comment corrected to match actual wiring state (integration complete; setTimeout unused)"
    requirement: "FIX-04"
    verification:
      - kind: other
        ref: "review-only: bbj-document-builder.ts:173 confirmed to call compile(); grep -rn '.setTimeout(' bbj-vscode/src finds zero call sites"
        status: pass
    human_judgment: false
  - id: D8
    description: "CLAUDE.md's Completion bullet names the 7 other LSP feature providers actually registered in bbj-module.ts's lsp service group"
    requirement: "FIX-04"
    verification:
      - kind: other
        ref: "grep -c '<provider>' bbj-vscode/src/language/bbj-module.ts = 2 each for DocumentSymbolProvider, DefinitionProvider, HoverProvider, SemanticTokenProvider, SignatureHelp, InlayHintProvider, CodeActionProvider"
        status: pass
    human_judgment: false
  - id: D9
    description: "CLAUDE.md's TextMate bullet lists all four shared files (bbj.tmLanguage.json, bbx.tmLanguage.json, bbj-language-configuration.json, bbx-language-configuration.json)"
    requirement: "FIX-04"
    verification:
      - kind: other
        ref: "cross-checked against bbj-intellij/build.gradle.kts's copyTextMateBundle task; all four files confirmed present on disk"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 06: Maintainability and Documentation Easy-Fixes Summary

**Removed dead validator code and an unused module, extracted two shared helpers (linker location formatting, main.ts's Java-classpath reload sequence), corrected two stale source comments, and fixed three inaccurate CLAUDE.md claims — the phase's first plan to touch a file outside `bbj-vscode/src/`.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-19T12:58:00Z (approx, session start)
- **Completed:** 2026-08-19T13:33:00Z (approx)
- **Tasks:** 3
- **Files modified:** 8 (1 deleted, 7 modified: 5 source files, CLAUDE.md, 2 ledger files)

## Accomplishments

- **Task 1 — four D4 maintainability findings, no behaviour change, evidenced by an unchanged suite:**
  - `P61-D4-006`: deleted `BBjValidator.checkClassReference`/`isSubFolderOf` (`bbj-validator.ts:266-311`) after confirming they were never DI-registered and are shadowed by `check-classes.ts`'s own, strictly more complete `ClassValidator.checkClassReference`.
  - `P61-D4-008`: extracted `resolveWorkspaceRoot()`/`formatSourceLocation(uri, line)` in `bbj-linker.ts`, replacing the near-duplicate `getSourceLocation`/`getSourceLocationForNode` bodies. Verified byte-identical formatted output via the 11 pre-existing `linking.test.ts` failures, whose messages embed these exact strings.
  - `P61-D4-009`: deleted `assertions.ts` (zero consumers, re-confirmed via grep at HEAD).
  - `P61-D4-012`: extracted a private `reloadJavaClassesAndRevalidate()` in `main.ts`, called by both the `bbj/refreshJavaClasses` request handler and the `onDidChangeConfiguration` handler; `npm run build` gated (produces `out/language/main.cjs`, the single binary both IDEs consume).
- **Task 2 — two source comment fixes and three CLAUDE.md corrections:**
  - `P61-D8-004`: corrected `bbj-cpl-service.ts`'s class comment (integration is complete, not future work) and `setTimeout()`'s doc comment (currently unused — zero call sites found).
  - `P61-D8-002`: closed **no-op** — `bbj.langium:948`'s comment is already accurate after `P61-D2-005`'s fix (plan 67-05); `npm run langium:generate` confirmed zero diff in `src/language/generated/`.
  - `P61-D8-003`: added `validations/check-function-calls.ts` to CLAUDE.md's Validation bullet.
  - `P61-D8-005`: extended CLAUDE.md's Completion bullet to name the 7 other LSP feature providers actually registered in `bbj-module.ts`'s `lsp` service group (not the "ten" the finding record estimated — corrected the count against the live code).
  - `P62-D8-001`: listed all four shared TextMate/language-configuration files in CLAUDE.md, cross-checked against `bbj-intellij/build.gradle.kts`'s `copyTextMateBundle` task.
- **Task 3**: closed all nine ledger rows in `67-APPLY-SET.md` and recorded the plan's baseline delta in `67-BASELINE.md`: three full `npm test` runs plus `npm run lint`, verdict **identical** — the same 11-name deterministic `linking.test.ts` gate set on every run, lint still exit 0 with zero warnings.

## Task Commits

Each task was committed atomically:

1. **Task 1: Four maintainability findings**
   - `906ca51` — `fix(P61-D4-006): remove the unreachable validator methods`
   - `7d03fc0` — `fix(P61-D4-008): extract shared source-location formatting helpers`
   - `8d166cc` — `fix(P61-D4-009): delete the unused assertions module`
   - `76ccb8b` — `fix(P61-D4-012): extract reloadJavaClassesAndRevalidate for both handlers`
2. **Task 2: Two comment fixes and three CLAUDE.md corrections**
   - `2c497ec` — `docs(P61-D8-004): correct the CPL service class and setTimeout comments`
   - (`P61-D8-002` closed no-op — no commit, per the record's own "or fix the code" escape clause, already discharged by `P61-D2-005`)
   - `69435df` — `docs(P61-D8-003): list check-function-calls.ts among the validation services`
   - `fe4d8a0` — `docs(P61-D8-005): note the remaining LSP feature providers`
   - `2fa0264` — `docs(P62-D8-001): list all four shared TextMate grammar files`
3. **Task 3: Close ledger rows and record baseline delta**
   - `ebc0ccb` — `docs(67-06): close maintainability and doc rows and record baseline delta`

## Files Created/Modified

- `bbj-vscode/src/language/bbj-validator.ts` — removed 46 dead lines (`checkClassReference`/`isSubFolderOf`) and their now-unused imports
- `bbj-vscode/src/language/bbj-linker.ts` — extracted `resolveWorkspaceRoot`/`formatSourceLocation`, replacing duplicated logic in two methods
- `bbj-vscode/src/language/assertions.ts` — **deleted** (unused module)
- `bbj-vscode/src/language/main.ts` — extracted `reloadJavaClassesAndRevalidate()`, called from both handlers
- `bbj-vscode/src/language/bbj-cpl-service.ts` — corrected class comment and `setTimeout()` doc comment
- `CLAUDE.md` — Validation bullet, Completion bullet, TextMate bullet corrected/extended (three separate commits)
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — nine rows closed (8 applied, 1 no-op)
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-06 delta` appended

## Decisions Made

- **P61-D4-006 branch taken: delete, not wire-up.** `check-classes.ts`'s own `ClassValidator.checkClassReference` is a strictly more complete equivalent (adds `warnUnresolvableType` for #438) and is the copy actually wired into `registerClassChecks()` — confirmed the dead copy in `bbj-validator.ts` was never registered as a check before deleting.
- **P61-D8-002 closed no-op.** Re-read `bbj.langium:948`'s comment against `bbj-value-converter.ts`'s post-`P61-D2-005` `STRING_LITERAL` case: both clauses ("" un-escapes, `\` stays plain) are now true. Per the record's own escape clause naming "fix the code per P61-D2-005" as a valid resolution, no comment edit was needed.
- **P61-D8-005's provider count corrected from the record's estimated "ten" to the actual 7** — read live from `bbj-module.ts`'s `BBjModule.lsp` service group rather than reused from the finding record's prose, which had also counted the `documentation`-group `CommentProvider`, the non-service `bbj-use-insert.ts` helper, and `BBjSharedModule`'s separately-scoped `NodeKindProvider`.
- **P62-D8-001's four-file TextMate list independently re-derived** from `bbj-intellij/build.gradle.kts`'s `copyTextMateBundle` task rather than trusted from the finding record's prose — confirmed the same set the original review found.
- **FIX-01/FIX-03/FIX-04 left Pending in REQUIREMENTS.md**, following 67-01/67-05's established precedent — this plan closes 9 more of the 77 apply-set rows (12 of 77 total now applied/no-op) but does not complete the phase; marking the phase-level requirements complete is deferred to 67-12 (phase close).

## Deviations from Plan

None — plan executed exactly as written. Two CLAUDE.md edits originally planned as a single combined `Edit` call were re-applied as two separate edits with two separate commits (`P61-D8-003`, `P61-D8-005`) to keep each commit scoped to exactly the finding it names, per this plan's own `git show --stat` acceptance criterion and FIX-01's transparency prohibition against scope-widening under a shared commit.

## Issues Encountered

None. All build/lint/test gates passed on the first attempt for every task; no auto-fix (Rule 1-3) was needed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 39 of 77 apply-set rows now dispositioned (33 applied, 3 no-op, 1 deferred, 2 excluded; 38 still pending) — see `67-APPLY-SET.md`'s Index for the authoritative running count.
- This plan established the pattern for touching files outside `bbj-vscode/src/` (the repo-root `CLAUDE.md`) on the same finding-keyed commit terms as any source fix — later plans with `CLAUDE.md`/root-level findings can follow the same split-per-finding-commit approach.
- No blockers. The 11-name deterministic gate set and zero-lint-warnings state remain unchanged; future plans should continue the same `npm test`/`npm run lint` per-plan delta comparison (D-09).

## Self-Check: PASSED
