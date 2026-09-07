---
phase: 88-setopts-in-code-hovers-tri-state-composer
fixed_at: 2026-09-07T22:56:00Z
review_path: .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 88: Code Review Fix Report

**Fixed at:** 2026-09-07T22:56:00Z
**Source review:** .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (1 critical, 2 warning)
- Fixed: 3
- Skipped: 0

## Verification environment

All edits, `npx tsc --noEmit`, `npx vitest run`, and `./gradlew test --offline` invocations ran
inside an isolated git worktree (`.claude/worktrees/rf-88-*`, branch `gsd-reviewfix/88-*`), not the
main checkout, per this agent's isolation protocol. `bbj-vscode/node_modules` and
`bbj-vscode/src/language/generated` were symlinked into the worktree from the main checkout to
avoid a redundant `npm install` / `npm run langium:generate`, then removed before handoff. The
fast-forward in the cleanup tail brings these same commits onto `main` in the main checkout, so the
verification results below are reproducible there once the branch is at these commits.

## Fixed Issues

### CR-01: SETOPTS chain-safety walk misses `ON...GOTO/GOSUB` and `SWITCH/CASE/SWEND`, producing a false "safe" verdict

**Files modified:** `bbj-vscode/src/language/setopts-code-scanner.ts`, `bbj-vscode/test/setopts-code-scanner.test.ts`
**Commit:** `b354a4a1`
**Applied fix:** Added `isOnGotoStatement`, `isSwitchStatement`, `isSwitchCase`, `isUntilStatement`,
and `isKeywordStatement(stmt) && stmt.kind === 'REPEAT'` guards to `matchStatement`'s control-flow
branch (verified each type guard exists in `generated/ast.ts` and that each statement type is a
flat sibling in the same `Program.statements`/`MethodDecl.body`/etc. array `walkChain` iterates,
matching the review's analysis). Added six new `test.each` rows to the `controlFlowMarkers` table
covering `OnGotoStatement`, `SwitchStatement` (both the `SWITCH` and `SWEND` forms), `SwitchCase`,
`UntilStatement`, and the `REPEAT` `KeywordStatement`. Also included `UntilStatement`/`REPEAT` per
the review's own note that they belong to the same "statement type list is incomplete" defect.

Verification: `npx tsc --noEmit` clean; `npx vitest run test/setopts-code-scanner.test.ts
test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-request.test.ts
test/setopts-in-code-ui.test.ts` — 161/161 tests passed (5 test files).

### WR-01: `traceOptsChain`'s `MethodCall` overload is dead, untested code

**Files modified:** `bbj-vscode/src/language/setopts-code-scanner.ts`
**Commit:** `0b3ee88d`
**Applied fix:** Confirmed (by grepping every call site) that `traceOptsChain`/`trackedVariableName`
are never invoked with a `MethodCall` — `detectSetOptsShape` only calls `traceOptsChain(node)`
inside its `isSetOptsStatement(node)` branch, and the `MethodCall` shape (c) is decoded directly
without routing through `traceOptsChain`. Chose the "narrow the signature" option from the review's
either/or fix: `trackedVariableName` and `traceOptsChain` are now typed to accept only
`SetOptsStatement`, the unreachable `MethodCall`-args branch was removed from
`trackedVariableName`, and the doc comment's "chain link itself needs re-tracing" claim was
removed. The `MethodCall` type import remains in use elsewhere in the file (`iorOrAndName`,
`setoptsHoverTarget`), so no import changes were needed.

Verification: `npx tsc --noEmit` clean (confirms `detectSetOptsShape`'s narrowed call site at
`traceOptsChain(node)` still type-checks under the narrower signature); same 161/161 test run as
above passed unchanged.

### WR-02: Cheap "is this line a SETOPTS-in-code candidate" gates match substrings, not tokens, causing false-positive intention/action offers

**Files modified:** `bbj-vscode/src/setopts-in-code-ui.ts`, `bbj-vscode/test/setopts-in-code-ui.test.ts`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`
**Commit:** `9f32ce93` (amended to `b30f28dc` for commit-trailer attribution)
**Applied fix:**
- VS Code (`setopts-in-code-ui.ts`): replaced the substring `indexOf` scan over
  `SETOPTS_IN_CODE_KEYWORDS` with a `/\b(?:SETOPTS|IOR\(|AND\()/gi` regex scan, requiring a JS word
  boundary immediately before the keyword. Added 8 new `test.each` negative regression rows
  (`expand(`, `command(`, `demand(`, `brand(`, `island(`, `prior(`, `senior(`, `junior(`) to
  `setopts-in-code-ui.test.ts` confirming none of these trip the gate.
- IntelliJ (`ComposerLauncher.java`): widened the shared `isCaretOnCall` heuristic (used by all
  four composer intentions, not just SETOPTS-in-code) to loop over every occurrence of `keyword` on
  the line and reject any occurrence preceded by a BBj identifier character — letter, digit,
  underscore, or one of the `$!%@` suffix sigils (cross-checked against the `ID_WITH_SUFFIX`/`ID`
  terminals in `bbj.langium`) — via a new private `hasIdentifierCharBefore` helper, rather than
  JS's narrower `\b` semantics (which would not treat `$`/`!`/`%`/`@` as non-word characters). This
  fix is shared by `isCaretOnSetoptsInCode` and the `msgbox`/`addwindow`/`addchildwindow`
  intentions' own `isCaretOnCall` calls, since all route through the same method.

Verification: `npx tsc --noEmit` clean; `npx vitest run test/setopts-in-code-ui.test.ts` — 36/36
tests passed (28 pre-existing + 8 new negative regression rows); full referenced VS Code suite
(`setopts-code-scanner`, `hover`, `setopts-catalog`, `setopts-in-code-request`,
`setopts-in-code-ui`) — 169/169 tests passed. `cd bbj-intellij && ./gradlew test --offline --tests
'com.basis.bbj.intellij.composer.*'` — BUILD SUCCESSFUL, 119/119 tests passed across 12 test files
(0 failures, 0 errors, 0 skipped), confirming the shared `isCaretOnCall` widening did not regress
the `msgbox`/`addwindow`/`addchildwindow` intentions' existing source-guard and flow tests.

## Skipped Issues

None — all findings in scope were fixed.

---

_Fixed: 2026-09-07T22:56:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
