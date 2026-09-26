---
phase: 107-validation-false-alarms-silent-skips
fixed_at: 2026-09-25T07:05:48Z
review_path: .planning/phases/107-validation-false-alarms-silent-skips/107-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 107: Code Review Fix Report

**Fixed at:** 2026-09-25T07:05:48Z
**Source review:** .planning/phases/107-validation-false-alarms-silent-skips/107-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 -- IN-01/IN-02 out of scope per fix_scope)
- Fixed: 3
- Skipped: 0

**Isolation:** All edits, test runs, and type checks below ran inside an isolated git worktree
(`workflow.use_worktrees=true`), not the main checkout. `npx tsc --noEmit` and `npx vitest` were
run against symlinked `node_modules`/`src/language/generated` pointing back at the main checkout
(safe on this Linux host: `rm -rf`/`git worktree remove` unlink a symlink entry without recursing
into its target). Commits were made on a temporary branch and fast-forwarded onto
`gsd/v4.6-user-facing-bug-burndown` during cleanup, so the numbers below are reproducible from the
main checkout after this run completes.

## Fixed Issues

### WR-01: The nested-Java-type guard only covered the chained-access shape, not a bare reference

**Files modified:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts`, `bbj-vscode/test/unknown-java-member.test.ts`
**Commit:** 40993a22
**Applied fix:** Broadened the guard in `checkUnknownJavaMember` from requiring the class-ref
member to be chained into a further member access (`Outer.Inner.CLASS`) to any class-ref member
whose text starts with an uppercase letter (the same PascalCase-name heuristic
`bbj-scope-local.ts`'s `isPotentiallyJavaFqn` already uses for this class of ambiguity). This now
also suppresses a false-positive Error on a bare nested-type reference used as a value on its own
(e.g. `x! = String.SomeNestedThing`). Removed the now-unused `isMemberCall` import. Added a
regression test (`a bare nested-type-shaped reference on a class ref does not become a
false-positive Error`) proving the previously-reportable bare-reference shape is now silent.

### WR-02: `hasCertainReceiverType`'s BBjAPI detection trusted raw reference text, not what it resolves to

**Files modified:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts`, `bbj-vscode/test/unknown-java-member.test.ts`
**Commit:** 0351bcf5
**Applied fix:** The `bbjapi(...)` method-call guard now additionally checks what the callee's
symbol actually resolves to, not just its `$refText`: either the interop-backed `JavaClass` named
`BBjAPI`, or the synthetic stub from `lib/bbj-api.ts` (identified by its fixed virtual document
URI `bbjlib:///bbj-api.bbl`). A `try`/`catch` around `AstUtils.getDocument` keeps this
never-throw/never-crash on a detached or synthetic node, matching the file's existing
`resolveSymbol` idiom. Added a unit-level regression test at the `hasCertainReceiverType` level
(`hasCertainReceiverType does not trust a resolved symbol named "bbjapi" that is not the real
built-in`) constructing a fake resolved symbol to prove the check now inspects the resolved element.
Note: in the live codebase this scenario is not independently reachable through the parser today
-- `bbj-linker.ts`'s own `getCandidate` already special-cases any `bbjapi(...)` method-call name to
always resolve to one of the two built-ins, regardless of scope, so a user-declared `bbjapi`
function can never actually be linked to for this call shape. The fix and its test still stand as
defense-in-depth against that linker behavior ever changing, consistent with the file's own design
philosophy of checking resolved type/shape rather than text everywhere else.

### WR-03: An unguarded `symbol.$refText` remained in `bbj-scope-local.ts`

**Files modified:** `bbj-vscode/src/language/bbj-scope-local.ts`
**Commit:** 11e98c6f
**Applied fix:** Added the same `node.variable.symbol` truthiness guard to the `isAssignment`
branch's `isSymbolRef(node.variable)` check that this phase already added to the adjacent
`isInputVariable` branch, removing the branch's reliance on an unstated interaction between two
different `instanceAccess` flags in the grammar.
No regression test was added for this one: per the review's own analysis (confirmed independently
here), no malformed input reaches this branch with `node.variable.symbol` undefined and
`!node.instanceAccess` true under the current grammar -- the same 14 malformed-LHS shapes the
reviewer tried, plus the existing `## = 1` / `ENTER ##` / `DREAD ##` / etc. regression tests in
`test/variable-scoping.test.ts`, all still pass unchanged after this fix (re-run: 49/49 passed).
This is a defensive consistency fix guarding an implicit grammar invariant, not a fix for a
currently-provable crash, so no failing-test-first case could be constructed; the existing malformed-
input regression suite serves as the no-regression check instead.

## Skipped Issues

None -- all three in-scope findings were fixed.

## Verification

- `npx tsc --noEmit -p tsconfig.json` (worktree, symlinked `node_modules`/`generated`): clean, no
  errors, after each of the three commits.
- `npx vitest run test/unknown-java-member.test.ts`: 31/31 passed (28 pre-existing + 3 new).
- `npx vitest run test/variable-scoping.test.ts`: 49/49 passed (including the existing malformed-
  input regression tests this phase's own sibling fix added).
- `npx vitest run test/functional/unknown-java-member-real-interop.test.ts`: 5/5 passed (live
  `:5008` backend).
- `npx vitest run test/example-files.test.ts`: 1/1 passed.
- `npx vitest run test/linking.test.ts`: 11 failed / 30 passed / 1 skipped -- confirmed identical
  failure set and count on the unmodified base commit `db944440` in the main checkout (env drift:
  `getAllClassNames` against the live interop backend, documented pre-existing, not touched by
  this diff).
- Planning-ID grep (`git diff db944440 -- bbj-vscode | grep -nE '(WR|CR|IN|D)-[0-9]+|107-0|[Pp]hase 10|[Pp]lan 0'`):
  no hits.

---

_Fixed: 2026-09-25T07:05:48Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
