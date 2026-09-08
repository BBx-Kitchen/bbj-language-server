---
phase: 88-setopts-in-code-hovers-tri-state-composer
fixed_at: 2026-09-08T16:03:07Z
review_path: .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 88: Code Review Fix Report

**Fixed at:** 2026-09-08T16:03:07Z
**Source review:** .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

**Verification ran in the isolated worktree** created for this fix run
(`.claude/worktrees/rf-88-*`, `git worktree add -b gsd-reviewfix/88-*`), not the main checkout.
`node_modules` and `src/language/generated` were symlinked in from the main checkout (plain
symlinks, not junctions/reparse points — Linux host) so `npm run build`/`lint`/`vitest` could run
without a fresh `npm install`. The commit itself was fast-forwarded into `main` in the main
checkout by this agent's cleanup tail, so the fixed source is identical in both trees; only the
*build/test run* happened in the worktree.

## Fixed Issues

### CR-01: `matchStatement`'s per-assignment loop only evaluates the first matching assignment in a comma-chained statement, allowing a false "safe" chain verdict (and silently dropped bits)

**Files modified:** `bbj-vscode/src/language/setopts-code-scanner.ts`, `bbj-vscode/test/setopts-code-scanner.test.ts`
**Commit:** 694add52

**Applied fix:** Extracted the existing per-assignment classification body out of `matchStatement`
into a new `matchAssignment(assignment, trackedName)` helper (unchanged logic, just moved).
Rewrote `matchStatement`'s loop over `stmt.assignments` so it no longer returns on the first
verdict it finds:

- Any disqualifying verdict (`control-flow` — pre-loop only, `reassigned`, `alias`,
  `unparseable-mask`, `indexed-target`) from *any* assignment in the statement fails the whole
  statement closed immediately, exactly as before — but now this check runs against *every*
  assignment, not just the first one that happens to match the tracked variable.
- `origin` and `link` verdicts are accumulated (not returned immediately) while the loop keeps
  scanning every remaining assignment in the statement, so a later disqualifying assignment (e.g.
  a byte-range mutation after an `A$=OPTS` origin in the same comma-chained statement) is now seen
  and still wins.
- After the loop: if the statement produced exactly one `origin` and no `link`, or exactly one
  `link` and no `origin`, that single verdict is returned unchanged (matches prior single-
  assignment behavior byte-for-byte — all pre-existing tests pass unmodified).
- Any other combination — two origins in one statement, two links in one statement, or an origin
  together with a link in one statement — cannot be represented by the existing
  one-verdict-per-statement `StatementVerdict`/`ChainWalkResult` shape without inventing a new
  multi-link-per-statement carrier. Per the task's explicit fail-closed instruction, this case now
  returns `{ kind: 'reassigned' }` rather than folding left-to-right or guessing which verdict
  "wins" — this can never produce a false `safe: true` or a silently-dropped mutation, it can only
  ever make a chain *more* conservative than before.

This is a semantically deliberate choice (not just syntax): rather than widening the data model to
carry multiple same-statement links precisely (which would require re-deriving the correct
intra-statement vs. inter-statement link ordering in `walkChain`'s backward-accumulate-then-reverse
scheme — a nontrivial and risk-bearing change), the fix takes the narrower, lower-risk path the
review itself endorsed: fail closed to an unsafe verdict for the ambiguous multi-link/origin+link
case, and only return a single verdict when the statement contains no such ambiguity. **Because
this is a semantic policy decision (how to resolve an inherently unrepresentable case), not a pure
syntax fix, this fix is flagged `fixed: requires human verification`** per the fixer's own logic-bug
verification-tier limitation — a human should confirm that resolving "origin + same-statement
link(s)" and "multiple same-statement links" to `reassigned` (rather than widening the model to
carry them precisely) is the intended long-term shape, even though it is provably safe (never a
false "safe", never a silently dropped mutation) as written.

**Status: fixed: requires human verification**

Added two regression tests to `bbj-vscode/test/setopts-code-scanner.test.ts`, both reproducing the
exact cases from the review's `Findings` section:

1. `A$=OPTS,A$(1,1)="Z"` / `SETOPTS A$` — now asserts `safe: false`, `unsafeReason: 'indexed-target'`,
   `effect: { set: [], clear: [] }` (previously reported `safe: true` with an empty effect).
2. `A$=OPTS` then `A$=IOR(A$,"$08$"),A$=IOR(A$,"$10$")` / `SETOPTS A$` — now asserts `safe: false`,
   `unsafeReason: 'reassigned'` (previously reported `safe: true` with only the first `IOR` link in
   `effect.set`, silently dropping the second).

**Verification performed:**
- `npm run build` (tsc -b + esbuild) — clean, no errors.
- `npm run lint` (eslint src test) — clean, no errors/warnings.
- `npx vitest run test/setopts-code-scanner.test.ts` — 64/64 passing (62 pre-existing + 2 new).
- `npx vitest run test/setopts-code-scanner.test.ts test/setopts-in-code-request.test.ts test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-ui.test.ts` — 183/183 passing.

No other files needed changes: `walkChain`, `ChainWalkResult`, `StatementVerdict`'s `'link'`/`'origin'`
payload shapes, and every downstream consumer (`traceOptsChain`, `foldChainEffect`,
`setopts-in-code-request.ts`, `bbj-hover.ts`) are untouched — the fix is fully contained inside
`matchStatement`'s own control flow plus the new `matchAssignment` extraction.

## Skipped Issues

None — the only in-scope finding was fixed.

---

_Fixed: 2026-09-08T16:03:07Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
