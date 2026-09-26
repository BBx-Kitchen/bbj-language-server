---
phase: 109-completion-java-class-resolution
plan: 08
subsystem: completion
tags: [langium, scope-provider, vitest, completion, linking, gap-closure]

requires:
  - phase: 109-completion-java-class-resolution
    provides: "the 109-01 position matrix and 109-COMP03-MEASUREMENT.md this plan corrects and
      extends; the debug session (method-body-completion-program-scope-leak.md) and its
      scratch-worktree experiment diff, which this plan finalises"
provides:
  - "A METHOD boundary in BbjScopeProvider's plain-name lookup (bbj-scope.ts): inside a
    MethodDecl, Program-keyed VariableDecl-subtype descriptions (implicit assignments,
    READ/DREAD/ENTER targets, FOR variables, DIM arrays, program-level DECLAREs) are excluded
    from the ancestor walk, so completion, linking, go-to-definition and type inference all
    agree that a class METHOD body cannot see the program's own variables"
  - "test/method-body-scope.test.ts: the user's own reported program as a regression test, one
    absence/presence test per program-variable kind, a go-to-definition agreement test and a
    presence test for everything a method must keep seeing"
  - "test/completion-method-body.test.ts: PROGRAM_SCOPE_VARIABLES planted beside the class in
    every inMethod() fixture, and verdict() extended with extraInMethod so a program-scope
    leak into the in-method candidate set fails the row"
  - "109-COMP03-MEASUREMENT.md Gap closure addendum recording the corrected notion of
    correctness and the before/after matrix"
affects: []

actuals:
  tokens: 6915
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "lexicalScope(context): a private method in BbjScopeProvider that mirrors Langium's
      DefaultScopeProvider.getScope ancestor walk exactly, except that at the Program node it
      additionally drops descriptions whose type is a VariableDecl subtype, and only when the
      reference sits inside a MethodDecl (AstUtils.getContainerOfType(context.container,
      isMethodDecl)). Everywhere else it delegates straight to superGetScope, so non-method
      references keep today's exact path"
    - "completion-method-body.test.ts's verdict() now compares label sets in both directions:
      missingInMethod (a control label the method must offer but doesn't) and extraInMethod (an
      in-method label the control doesn't have and that isn't a legitimately method-only label
      either, per METHOD_SCOPE_ONLY_LABELS / row.allowExtra)"

key-files:
  created:
    - bbj-vscode/test/method-body-scope.test.ts
  modified:
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/test/completion-method-body.test.ts
    - .planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md

key-decisions:
  - "Combined Task 1's and Task 2's method-body-scope.test.ts pins into a single Task 1 commit
    (all six tests authored and verified together against the same fixtures), so Task 2
    contributed only the completion-method-body.test.ts matrix extension and the
    measurement-file addendum. No functional gap against the plan's must_haves -- every
    behavior the plan lists across both tasks is pinned and passing -- just a different commit
    split than the plan's task-by-task sequencing."
  - "The presence fixture's structural SymbolRef check must parse the marker-stripped source
    (PRESENCE_FIXTURE.replace('<|>', '')), not the raw fixture with the '<|>' placeholder still
    embedded -- parsing the marker literal produces parser errors that silently prune the tree,
    which first surfaced as an inexplicable 0-SymbolRefs-found result during red/green proof,
    not as a parser-error assertion failure."
  - "Diagnostic-count totals from this executor's own probe run (417 in-repo / 28,483-28,491
    corpus) differ from the planner's stated 669 in-repo (no prefilter) / 9,231 corpus figures
    in the plan's objective -- the added/removed counts (0 in-repo, 8 corpus, all classified as
    the expected linking-error side effect) are what the acceptance criteria require and are
    reproduced exactly; the absolute totals are not load-bearing and the discrepancy is not
    investigated further."
  - "Gate B's one head-only failing name (a parser-keyword-statements.test.ts test unrelated to
    scoping) was isolated by re-running the identical two files (linking.test.ts +
    parser-keyword-statements.test.ts) on HEAD with the same --maxWorkers=1 the base-worktree
    comparison used: HEAD then reproduced base's exact 11 names with zero head-only entries,
    confirming the 12th failure in the full --maxWorkers=2 whole-suite run was beforeAll-hook
    contention (initializeWorkspace timing out under load), not a regression from this plan's
    change."

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "The user's own reported program (a$/X! at program scope, class Test with
      method t() assigning b$) is a regression test: completion inside t() offers b$ and
      this! and no label whose lowercase form is a$ or x!; program scope still offers a$ and
      X! and still does not offer b$"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/method-body-scope.test.ts#program variables stay out of class method bodies > program variables beside the class are not offered inside a method"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/method-body-scope.test.ts#program variables stay out of class method bodies > program variables are still offered at program scope"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every program-variable kind (implicit assignment, DIM array, program
      DECLARE, READ target, FOR variable) stays unresolved inside a method with the standard
      Warning-severity linking-error, and go-to-definition on such a name inside a method finds
      nothing while the same names still resolve at program scope"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/method-body-scope.test.ts#program variables stay out of class method bodies > a program variable read inside a method does not link"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/method-body-scope.test.ts#program variables stay out of class method bodies > no program-level variable kind is visible inside a method"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/method-body-scope.test.ts#program variables stay out of class method bodies > go-to-definition inside a method does not jump to a program variable"
        status: pass
    human_judgment: false
  - id: D3
    description: "Parameters, method locals, #-fields, this!, a USE'd Java class, a
      fully-qualified java.lang path and a program-level DEF FN still resolve and are still
      offered inside a method, unchanged by the fix"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/method-body-scope.test.ts#program variables stay out of class method bodies > parameters, locals, fields, this!, USE imports and DEF FN stay visible inside a method"
        status: pass
    human_judgment: false
  - id: D4
    description: "The method-body completion matrix detects extra labels: a fixture with two
      program-level variables beside the class fails any row with a leaked label; ten of eleven
      rows fail on the pre-fix tree and all eleven pass on the fixed tree, with only
      already-justified fixture-shape allowances"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-method-body.test.ts#completion inside class method bodies (issue #561)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Newly surfaced diagnostics are measured before/after on examples/,
      bbj-vscode/test/test-data/ and every private-corpus file that declares a METHOD; each new
      one is classified"
    verification:
      - kind: other
        ref: "temporary probe test/zz-method-scope-probe.test.ts (deleted before task end): in-repo 0 added / 0 removed across 24 method files; corpus 8 added (all Warning-severity linking-error, scope M, the expected side effect) / 0 removed across 834 method files"
        status: pass
    human_judgment: false
  - id: D6
    description: "The whole suite reports numFailedTests 0 with RUN_BBJ_TESTS=0 and
      --maxWorkers=2, the failing-test-name set with live interop has no name that does not
      also fail on the base commit, and tsc is clean"
    verification:
      - kind: other
        ref: "RUN_BBJ_TESTS=0 --maxWorkers=2 whole suite: numFailedTests=0 numTotalTests=2854; live-interop isolated re-run (linking.test.ts + parser-keyword-statements.test.ts, --maxWorkers=1) on HEAD reproduces base's exact 11 failing names with 0 head-only; npx tsc -p tsconfig.json exits clean"
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-09-26
status: complete
---

# Phase 109 Plan 08: Program Variables Stay Out of Class Method Scope Summary

**A METHOD boundary in `BbjScopeProvider`'s plain-name lookup (`bbj-scope.ts`) now excludes Program-level variables from a class method's scope, closing UAT gap G-109-1 for completion, linking, and go-to-definition alike, with zero new failures across a 2,854-test whole suite and only the expected linking-error side effect on 8 of 28,483 corpus diagnostics.**

## Performance

- **Duration:** ~27 min
- **Started:** 2026-09-26T06:56:00Z
- **Completed:** 2026-09-26T07:23:23Z
- **Tasks:** 3 completed
- **Files modified:** 4

## Accomplishments

- Added a private `lexicalScope(context)` method to `BbjScopeProvider` that mirrors Langium's `DefaultScopeProvider.getScope` ancestor walk exactly, except that at the `Program` node it additionally drops descriptions whose type is a `VariableDecl` subtype (`FieldDecl`, `ArrayDecl`, `VariableDecl` itself) — and only when the reference sits inside a `MethodDecl`. Wired it into the plain-name `SymbolRef` branch's `memberAndImports` in place of the prior unconditional `superGetScope(context)` call. Every reference outside a method keeps today's exact path.
- Reproduced the user's exact reported program (`a$="TEST"` / `X!="BLA"` at program scope, `class Test` / `method t()` assigning `b$="KJK"`) as a regression test in the new `test/method-body-scope.test.ts`: confirmed red on the unmodified tree (completion inside `t()` offered `a$`/`X!`; `PRINT a$, x!` inside the method linked to the program-level assignments), then green after the fix.
- Pinned every program-variable kind the objective's `<interfaces>` block measured — implicit assignment, DIM array, program-level DECLARE, READ target, FOR variable — as unresolved (standard Warning-severity `linking-error`) inside a method while still resolving at program scope; pinned go-to-definition agreement (method: no target; program scope: line 0); pinned that parameters, locals, `#`-fields, `this!`, a USE'd Java class, a fully-qualified `java.lang` path and a program-level `DEF FN` all stay visible and resolved inside a method, on both the pre-fix and fixed tree.
- Extended `test/completion-method-body.test.ts`'s position matrix to plant two program-level variables (`programOnly$`, `ProgramObj!`) beside the class in every `inMethod()` fixture, and extended `verdict()` with an `extraInMethod` check so a leaked label fails the row. Ten of the eleven matrix rows measured `broken` (extra `ProgramObj!`/`programOnly$`) on the pre-fix tree — reproducing the plan's `<interfaces>` counts exactly — and all eleven measure `works` on the fixed tree, with only the pre-existing, already-justified fixture-shape allowances (`classend`, `com`, `java`, `method`, `probeTail` on two rows whose marker sits at the very start of the document).
- Ran a temporary, never-committed diagnostic probe (`test/zz-method-scope-probe.test.ts`) over every `.bbj`/`.bbx` file that declares a `METHOD`: 24 in-repo files (`examples/` + `bbj-vscode/test/test-data/`) showed 0 added/removed diagnostics; 834 private-corpus method files showed 8 newly surfaced diagnostics, all classified as the expected side effect (Warning-severity `linking-error`, scope `M`, naming a program-level variable a method now correctly can't see) and 0 removed. Deleted the probe file and confirmed a clean `git status` under `bbj-vscode/` before the gate.
- Ran the phase regression gate: whole suite `RUN_BBJ_TESTS=0 --maxWorkers=2` → `numFailedTests=0 numTotalTests=2854`; live-interop gate (`RUN_BBJ_TESTS=1`, port :5008 reachable) initially showed 12 failures (the 11 known `linking.test.ts` interop names plus one `parser-keyword-statements.test.ts` name) — isolating the same two files on HEAD with `--maxWorkers=1` (matching the base-worktree comparison's conditions) reproduced the base's exact 11 names with zero head-only entries, confirming the 12th was `--maxWorkers=2` contention (a `beforeAll` hook timeout under load), not a regression. `npx tsc -p tsconfig.json` is clean throughout. Register check (`D-NN`/`COMP-`/`JINT-`/`109-0N`/`CR-`/`WR-`/`IN-`/`T-109-` grep) over the whole phase diff since base `7b2e5d83` is clean.
- Appended a "Gap closure: program variables in method bodies" section to `109-COMP03-MEASUREMENT.md` recording the corrected notion of correctness (a method sees its parameters, locals and class — never the program's variables) and the before/after matrix table.

## Task Commits

1. **Task 1: The user's program: a$ and X! are neither offered nor linked inside method t(), end to end** - `54efa29c` (fix)
2. **Task 2: Every program-variable kind, definition agreement, what stays visible, and a matrix that flags extra labels** - `ab0743e9` (test)
3. **Task 2 (measurement addendum)** - `6441b296` (docs)

_Task 1's commit includes all six `test/method-body-scope.test.ts` tests (both Task 1's and Task 2's), authored and red/green-proven together against the same fixture set — see Deviations below. Task 3 (probe + regression gate) produces no commit: its only file is temporary and explicitly never committed._

**Plan metadata:** committed with this SUMMARY

## Files Created/Modified

- `bbj-vscode/src/language/bbj-scope.ts` - added the private `lexicalScope()` method-boundary walk; wired it into the plain-name `SymbolRef` branch
- `bbj-vscode/test/method-body-scope.test.ts` - new: the user's program as a regression test, per-kind absence/presence tests, go-to-definition agreement, and the presence fixture
- `bbj-vscode/test/completion-method-body.test.ts` - planted `PROGRAM_SCOPE_VARIABLES` beside the class in `inMethod()`; extended `verdict()`/`Verdict` with `extraInMethod`; added `METHOD_SCOPE_ONLY_LABELS` and per-row `allowExtra`
- `.planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md` - Gap closure addendum with the corrected matrix

## Decisions Made

- Combined Task 1's and Task 2's `method-body-scope.test.ts` tests into a single Task 1 commit (see Deviations) — no functional gap against the plan's `must_haves`, just a different commit split.
- Fixed a self-inflicted test bug during the presence-fixture red/green proof: the structural SymbolRef check must parse the marker-stripped source, not the raw fixture with `<|>` still embedded (which produces parser errors and silently prunes the tree).
- This executor's own probe measured different absolute diagnostic totals than the plan's stated figures (417 in-repo / ~28,480 corpus vs. the plan's 669 in-repo-without-prefilter / 9,231 corpus) — the load-bearing property (0 in-repo added/removed, 8 corpus added all classified as the expected side effect, 0 corpus removed) reproduced exactly; the absolute-total discrepancy is not investigated further.
- Gate B's apparent 12th failure was resolved by re-running the same two files on HEAD under the base comparison's exact conditions (`--maxWorkers=1`), which reproduced base's 11 names with zero head-only entries — confirming contention, not a regression, per this repo's standing rule to never call a failure "noise" without that direct comparison.

## Deviations from Plan

### Auto-fixed Issues

**1. [Process deviation - commit sequencing, no functional impact] Task 1's commit carries all six `method-body-scope.test.ts` tests instead of three**
- **Found during:** Task 1 authoring
- **Issue:** The plan splits `test/method-body-scope.test.ts`'s six tests across Task 1 (three: absence x2, linking) and Task 2 (three more: kinds, definition, presence). All six tests share the same fixture-authoring context and were written and red/green-proven together in one pass before the plan's task boundary was reached.
- **Fix:** Committed all six tests in Task 1's `fix(109-08)` commit. Task 2's own commit (`test(109-08)`) then contains only its `completion-method-body.test.ts` matrix extension, since the plan's own file list for Task 2 also includes `completion-method-body.test.ts`.
- **Files affected:** `bbj-vscode/test/method-body-scope.test.ts` (fully present in the Task 1 commit)
- **Verification:** Every behavior listed in the plan's `must_haves.truths` and both tasks' `<behavior>` blocks is pinned and passing; the acceptance-criteria greps for Task 1 (`b$="KJK"` count) and Task 2 (`readVar`, `FNTWICE` counts) both pass against the actual commit contents.
- **Committed in:** `54efa29c` (Task 1 commit carries the full file)

---

**Total deviations:** 1 (process/sequencing only — no code, test coverage, or behavior deviates from the plan).
**Impact on plan:** None on substance. Every `must_haves.truths` entry, every task's `<behavior>` list, and every acceptance criterion is satisfied; only the git commit boundary between Task 1 and Task 2 differs from the plan's literal task-by-task split.

## Issues Encountered

- During the presence-fixture red/green proof, an initial version of the structural SymbolRef assertion parsed the fixture text with its `<|>` completion marker still embedded, which produced parser errors and silently pruned the parse tree (0 SymbolRefs found where 19 were expected). Fixed by parsing `PRESENCE_FIXTURE.replace('<|>', '')` for the structural check, matching the pattern `labelsAt()` already used internally. No production code was affected; this was purely a test-authoring mistake caught before commit.
- The initial `RUN_BBJ_TESTS=1 --maxWorkers=2` whole-suite run reported 12 failures (11 known + 1 new-looking name in `parser-keyword-statements.test.ts`, an unrelated RECORD-verb parser test). Isolating the same file alone reproduced a `beforeAll` hook timeout on the first attempt and passed cleanly on a bare retry — confirming worker contention. A direct, apples-to-apples comparison (same two files, `--maxWorkers=1`, on both HEAD and the base worktree) showed identical 11-name failure sets on both trees, resolving the discrepancy as contention rather than a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-109-1 is closed: completion, linking, go-to-definition and type inference now agree that a class METHOD body cannot see the program's own variables. The user's exact reported program is a permanent regression test.
- `109-COMP03-MEASUREMENT.md`'s "Gap closure" addendum records the corrected notion of correctness for anyone auditing the #561 comment-and-close decision later; issue #561 itself is not reopened or re-commented (per project rule: no further GitHub posting from this plan).
- `bbj-completion-provider.ts`, `bbj-linker.ts`, `bbj-scope-local.ts`, `bbj-type-inferer.ts`, `bbj.langium` and `bbj-test-module.ts` remain untouched since the phase base commit `7b2e5d83`, confirmed via `git diff --stat` — the fix stays entirely within the scope provider's plain-name lookup, per this plan's own prohibitions.
- Remaining, deliberately out-of-scope looseness carried over from the objective's "Settled questions": a bare field name (no `#`) is still offered and linked inside a method today, though BBj requires `#` for direct field access — recorded as a separate looseness, not fixed here.
- REQUIREMENTS.md is untouched per this plan's explicit instruction (COMP-03's status is not re-flipped by a gap-closure plan).
- Ready for milestone-level review (`/gsd-audit-milestone` then `/gsd-complete-milestone` per STATE.md's existing Operator Next Steps, once this gap-closure plan's SUMMARY and STATE/ROADMAP updates are in place).

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/bbj-scope.ts
- FOUND: bbj-vscode/test/method-body-scope.test.ts
- FOUND: bbj-vscode/test/completion-method-body.test.ts
- FOUND: .planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md
- FOUND commit 54efa29c (Task 1) in `git log --oneline --all`
- FOUND commit ab0743e9 (Task 2, tests) in `git log --oneline --all`
- FOUND commit 6441b296 (Task 2, measurement docs) in `git log --oneline --all`
- Re-ran all task-level `<acceptance_criteria>`: all pass (grep counts, register checks, diff --stat on prohibited files all confirmed clean)
- Re-ran plan-level `<verification>`: `method-body-scope.test.ts`, `completion-method-body.test.ts`, `variable-scoping.test.ts`, `completion-test.test.ts`, `definition.test.ts` all pass (contention-only failures reproduced in isolation as passing); whole suite `numFailedTests=0 numTotalTests=2854`; tsc clean; register check clean over the whole phase diff since base `7b2e5d83`
