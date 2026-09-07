---
phase: 88-setopts-in-code-hovers-tri-state-composer
fixed_at: 2026-09-07T23:18:45Z
review_path: .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 88: Code Review Fix Report (iteration 2)

**Fixed at:** 2026-09-07T23:18:45Z
**Source review:** .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 4 (WR-A, WR-B, WR-C, IN-01 — this iteration's re-review findings; CR-01/WR-01/WR-02 from iteration 1 were already fixed and committed)
- Fixed: 4
- Skipped: 0

All fixes were applied and verified inside an isolated git worktree
(`gsd-reviewfix/88-2933479`, based on `main`), then fast-forwarded onto `main` on
cleanup. Verification (tsc --noEmit, vitest, `./gradlew test`) all ran inside that
same worktree — a symlinked `node_modules` and `src/language/generated` (both
gitignored, unaffected by this) were used to reuse the main checkout's installed
dependencies and generated AST for the VS Code side; these symlinks were removed
before the worktree was fast-forwarded and torn down, so they leave no trace on
`main`.

## Fixed Issues

### WR-A: WR-02's word-boundary fix has no trailing boundary for the bare `SETOPTS` keyword

**Files modified:** `bbj-vscode/src/setopts-in-code-ui.ts`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`
**Commit:** `17505b74`
**Applied fix:**
- TS: changed the candidate-line regex from `/\b(?:SETOPTS|IOR\(|AND\()/gi` to
  `/\bSETOPTS\b|\bIOR\(|\bAND\(/gi` — the bare `SETOPTS` alternative now requires a
  trailing word boundary, so `SETOPTSFOO`/`SETOPTSHELPER(` no longer match. `IOR(`/`AND(`
  keep their existing (already-anchored-by-`(`) behavior.
- Java: added a `hasIdentifierCharAfter` check (same char set as the pre-existing
  `hasIdentifierCharBefore` at the time of this fix — sigils included) and gated it to
  the `"setopts"` keyword specifically in `isCaretOnCall`'s loop condition, matching the
  review's suggested code exactly. `ior(`/`and(` are unaffected (their literal `(`
  already anchors the trailing edge).
- Updated both functions' doc comments to describe the new trailing-boundary behavior.

### WR-C: Divergent identifier-boundary definitions between the TS and Java word-boundary checks

**Files modified:** `bbj-vscode/src/setopts-in-code-ui.ts`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`
**Commit:** `bc238b2d`
**Applied fix:** Applied as a follow-up commit on top of WR-A (same two files, same
region of code) to keep each finding's diff reviewable in isolation. Reconciled the two
IDEs' identifier-boundary definition onto the canonical `\w`-based (`[A-Za-z0-9_]`) one
that the TS regex already used — per the review's own assessment that "the TS behavior
more closely matches how the lexer would actually split those tokens." Concretely:
- Java: extracted a new `isIdentifierChar(char)` helper (letter/digit/underscore only,
  no `$!%@` sigils) and rewrote `hasIdentifierCharBefore`/`hasIdentifierCharAfter` to
  delegate to it, removing the sigil characters that previously made the Java heuristic
  diverge from the TS `\b`.
- TS: added a doc-comment paragraph on `setoptsInCodeCandidateLine` making the `\w`-based
  definition and the sigil exclusion explicit, cross-referencing
  `ComposerLauncher.isIdentifierChar` as the mirrored canonical definition on the Java
  side (no behavior change on the TS side — it already used `\b`).

### WR-B: `findAnchor` mis-scopes the backward walk when the target `SetOptsStatement` is itself inside a semicolon-joined `CompoundStatement`

**Files modified:** `bbj-vscode/src/language/setopts-code-scanner.ts`, `bbj-vscode/test/setopts-code-scanner.test.ts`
**Commit:** `3aea0872`
**Applied fix:** Applied exactly as the review's suggested fix:
- `findAnchor` no longer treats a `CompoundStatement` as a terminal container — the loop
  condition became `if (statements && !isCompoundStatement(node))`, so climbing continues
  through a `CompoundStatement` to the real top-level statement-list owner
  (`Program`/`MethodDecl`/`DefFunction`).
- `traceOptsChain` now passes `target` itself (not
  `anchor.statements[anchor.anchorIndex]`) as the anchor statement to `walkChain`, since
  `flattenStatements` already inlines a `CompoundStatement`'s children and `target` is
  guaranteed to be present in the flattened array once `findAnchor` correctly climbs past
  any enclosing `CompoundStatement`.
- Updated `findAnchor`'s doc comment to explain why `CompoundStatement` must not be
  terminal.
- Added a regression test (`WR-B regression: the traced SetOptsStatement itself sitting
  inside a semicolon-joined CompoundStatement still finds an OPTS origin on a preceding
  line`) reproducing the review's exact repro case
  (`'A$=OPTS\nA$=IOR(A$,"$08$") ; SETOPTS A$'`) and asserting `safe: true` with one `IOR`
  link — this is a logic-bearing fix (a backward chain-walk scoping bug), so beyond the
  standard tsc/re-read verification, its correctness is additionally pinned by this new
  test, which was confirmed to fail against the pre-fix code before the fix landed (via
  local `git stash`) and pass after. All 54 tests in
  `test/setopts-code-scanner.test.ts` pass (up from 53 pre-fix).

### IN-01: `setopts-in-code-ui.test.ts`'s substring-negative cases don't exercise the trailing-boundary gap (WR-A)

**Files modified:** `bbj-vscode/test/setopts-in-code-ui.test.ts`
**Commit:** `35301592`
**Applied fix:** Added two cases to the negative `test.each` table:
`['SETOPTSFOO', 'x = SETOPTSFOO(1)']` and `['SETOPTSHELPER(', 'x = SETOPTSHELPER(1)']`
(the second matching the exact example from WR-A's reproduction). Both pass against the
WR-A fix (committed first, in `17505b74`) and would have failed against the pre-fix
regex, confirming the gap is now closed and regression-guarded.

## Verification

- `cd bbj-vscode && npx vitest run test/setopts-code-scanner.test.ts test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-request.test.ts test/setopts-in-code-ui.test.ts` — **5 files passed, 172 tests passed, 0 failed** (ran inside the isolated worktree).
- `cd bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*'` — **BUILD SUCCESSFUL**, all 12 composer test suites (119 tests) passed with 0 failures/errors (ran inside the isolated worktree).
- `npx tsc --noEmit -p tsconfig.json` — no errors attributable to any of the 4 modified/added TS files, checked individually after each edit.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-09-07T23:18:45Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
