---
phase: 115-honest-interop-test-harness
fixed_at: 2026-09-28T09:33:00Z
review_path: .planning/phases/115-honest-interop-test-harness/115-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 115: Code Review Fix Report

**Fixed at:** 2026-09-28T09:33:00Z
**Source review:** .planning/phases/115-honest-interop-test-harness/115-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

**Verification environment:** All fixes were applied and verified inside an isolated git
worktree (`workflow.use_worktrees=true`), with `node_modules` symlinked from the main
checkout and `src/language/generated/*.ts` copied in (both gitignored, neither tracked
by the worktree). `npx vitest run test/interop-harness.test.ts
test/interop-harness-report.test.ts test/eslint-disable-directives.test.ts` (47 tests,
all passing), `npx eslint tools/interop-test-harness test/interop-harness-report.test.ts
test/interop-harness.test.ts test/eslint-disable-directives.test.ts` (clean), and
`npm run typecheck:test` (scoped to the touched files; the whole-project run reports
pre-existing `Cannot find module '../src/language/generated/ast.js'` errors across
unrelated test files because the worktree's copy of the generated AST predates the
Langium codegen step, not because of these fixes) all ran from that worktree. The
commits below were fast-forward merged into `gsd/v4.7-audit-hygiene-burndown` in the
main checkout, so they are reproducible there as well; a fresh `npm install` +
`npm run langium:generate` in the main checkout would resolve the same pre-existing
typecheck noise if a full-project check is needed.

## Fixed Issues

### WR-01: `hasErrorField` does not actually match the production truthiness check it claims to mirror

**Files modified:** `bbj-vscode/tools/interop-test-harness/cases.ts`
**Commit:** 948ddfab
**Applied fix:** Changed `hasErrorField` from an explicit `!== undefined && !== null &&
!== false && !== ''` chain to `Boolean((value as { error?: unknown }).error)`, matching
`java-interop.ts`'s plain `javaClass.error` truthiness check exactly (so `0`/`NaN` are
now treated as "no error" just like production). Updated the docstring to describe the
check as a plain truthiness mirror rather than the previous, subtly different,
value-exclusion description.

### WR-02: Lint-suppression guard's directive match is not boundary-anchored

**Files modified:** `bbj-vscode/test/eslint-disable-directives.test.ts`
**Commit:** aaee9d22
**Applied fix:** Added a `COMMENT_OPENER_BEFORE_DIRECTIVE` regex anchor
(`/(\/\/|\/\*)\s*$/`) and required it to match the text immediately before the
directive substring before treating a line as containing a genuine directive. Lines
where "eslint-disable" appears only inside prose (a string literal or comment text not
directly following a comment opener) are now skipped instead of being misclassified as
a bare/unscoped suppression violation. Added a regression test
(`'prose that merely contains the directive substring, not preceded by a comment
opener, is not flagged'`) covering a string literal and an object-property-name case.

### WR-03: `buildSummaryBar` divides by `total` with no zero guard

**Files modified:** `bbj-vscode/tools/interop-test-harness/report.ts`,
`bbj-vscode/test/interop-harness-report.test.ts`
**Commit:** d2a59130
**Applied fix:** Introduced a `pct(count)` helper inside `buildSummaryBar` that returns
`0` when `total === 0`, and used it for all three progress-bar width calculations
instead of the raw `(count / total) * 100` division. Added a regression test
(`'renders a zero-width summary bar instead of NaN% when there are no results'`) that
calls `generateReport` with an empty `results` array and asserts the output contains
`width:0%` and never `NaN%`.

### IN-01: Inconsistent field-check path naming for constructors between cases

**Files modified:** `bbj-vscode/tools/interop-test-harness/cases.ts`
**Commit:** 47626d2d
**Applied fix:** Changed `validateJavaUtilHashMap`'s constructor loop from
`` `constructor(${ctor.parameters?.length ?? '?'})` `` (arity-based naming) to
`` `constructors[${index}]` `` via `cls.constructors.forEach((ctor, index) => ...)`,
matching the `constructors[0]` convention already used in `validateJavaLangString`.
Both conventions resolved to the same gate verdict before this fix (no behavior
change), but the field-check table in the generated report is now consistent.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-09-28T09:33:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
