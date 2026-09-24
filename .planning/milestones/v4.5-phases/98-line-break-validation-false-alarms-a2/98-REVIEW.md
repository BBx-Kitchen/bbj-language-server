---
phase: 98-line-break-validation-false-alarms-a2
reviewed: 2026-09-21T06:50:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - bbj-vscode/src/language/bbj-token-builder.ts
  - bbj-vscode/src/language/bbj-validator.ts
  - bbj-vscode/src/language/bbj.langium
  - bbj-vscode/src/language/validations/check-classes.ts
  - bbj-vscode/src/language/validations/check-variable-scoping.ts
  - bbj-vscode/src/language/validations/line-break-validation.ts
  - bbj-vscode/test/classes.test.ts
  - bbj-vscode/test/conformance-regressions.test.ts
  - bbj-vscode/test/line-break-single-line-if.test.ts
  - bbj-vscode/test/line-break-validation.test.ts
  - bbj-vscode/test/line-break-walk-termination.test.ts
  - bbj-vscode/test/parser.test.ts
  - bbj-vscode/test/test-data/conformance/declare-methodret.bbj
  - bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj
  - bbj-vscode/test/test-data/conformance/def-fn-unclosed-body.bbj
  - bbj-vscode/test/test-data/conformance/exit-load-save.bbj
  - bbj-vscode/test/test-data/conformance/keyword-branch-targets.bbj
  - bbj-vscode/test/test-data/conformance/print-trailing-comma.bbj
  - bbj-vscode/test/test-data/conformance/restore-numeric.bbj
  - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj
  - bbj-vscode/test/test-data/conformance/table-statement.bbj
  - bbj-vscode/test/validation.test.ts
  - bbj-vscode/test/variable-scoping.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 98: Code Review Report

**Reviewed:** 2026-09-21T06:50:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This review replaces the prior `98-REVIEW.md`, which was written before this phase's gap-closure
commits (`ed5cd836..HEAD`, specifically `1ad87ada`, `8ba30038`, `5bfa5ddf`). Its three Critical/Warning
findings are re-verified below against the current tree rather than re-reported:

- **CR-01** (ELSE/FI backward walk silently accepted a non-nested, already-closed IF) — **fixed**,
  verified.
- **CR-02** (`RESTORE_NO_NL` didn't recognize a symbolic-label operand) — **fixed**, verified.
- **WR-01** (conflicting-DECLARE check lost a resolution-free scalar-vs-scalar mismatch) — **fixed**,
  verified.

All three are confirmed by direct test execution (not just reading the diff) plus, for CR-01, an
additional adversarial probe of a shape none of the shipped tests exercise (see WR-A below).

One new, concrete false-positive was found in the CR-01 fix itself: a fully-formed nested
`IF...THEN...ELSE...FI` immediately followed on the same line by an outer `ELSE...FI` is now
wrongly flagged. This reproduces the same class of regression the phase's own closing conformance
run already caught and the project already accepted as tracked residue (see
`.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`) — this review's
reproduction is additional evidence for that todo, not a new unknown gap, and is filed as a Warning
rather than a Blocker for that reason. The previously-reported WR-02, WR-03 and IN-02 findings from
the superseded review remain unaddressed in the current tree (they were out of this gap-closure's
scope) and are carried forward unchanged below so they are not lost. A new Info finding covers a
second instance of the same "forbidden planning ID left in a diff-touched line" pattern the old
review's IN-01 flagged, this time in `bbj-token-builder.ts`.

All claims below were verified by running the actual test files (`npx vitest run <file>`, targeted
to avoid the environment's known `beforeAll` contention timeout — see project MEMORY.md — rather than
the whole suite at once) and, where noted, by an ad hoc throwaway probe file created, run, and deleted
in the same turn (confirmed absent via `git status --porcelain` afterward; not part of any commit).

## Verified Fixes (previously Critical/Warning, now resolved)

### Verified: CR-01 — ELSE/FI backward-walk now tracks an open-IF balance

**File:** `bbj-vscode/src/language/validations/line-break-validation.ts:188-233`

`elseStatementLineBreaks`/`ifEndStatementLineBreaks` (commit `8ba30038`) now maintain an `openIfs`
counter while walking backward: each same-line `IfEndStatement`/`ElseStatement` stepped over
increments it, and an `IfStatement` found while it is non-zero is treated as already claimed
(decrement, keep walking) rather than as this node's governing IF. Re-ran the two previously-failing
repro inputs from the superseded review via `bbj-vscode/test/line-break-walk-termination.test.ts`
(`'a closer with no open IF left on the line is still flagged'` describe block, lines 96-131), which
now exists and passes:

- `if a=1 then b=1 fi else c=1` → flags `else` (was silently accepted before the fix).
- `if a=1 then b=1 fi fi` → flags the trailing `fi` (was silently accepted before the fix).
- `if a then b=1 else c=1 else d=1` (a second ELSE for one IF) → also now flagged, a case not even
  in the superseded review.
- The legitimate nested forms (`if a then if b then c=1 fi else d=1 fi`, `if a then if b then c=1 fi fi`,
  `if a then b=1 else c=1 fi`) stay clean.

Ran with `npx vitest run test/line-break-walk-termination.test.ts test/line-break-single-line-if.test.ts`
— all pass. See WR-A below for a related false-positive this same fix introduces on a different shape.

### Verified: CR-02 — `RESTORE_NO_NL` now recognizes a symbolic-label operand

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:134-158`

The pattern (commit `1ad87ada`) is now
`/RESTORE(?=[ \t]+(?:[0-9A-Za-z_]|\*[A-Za-z_]))/i` — the alternation's second branch requires an
asterisk immediately followed by a name-start character (`[A-Za-z_]`), matching
`SymbolicLabelName returns string: ASTERISK_EXPRESSION ValidName;` in `bbj.langium:934`. Confirmed:

- The lookahead requires `[ \t]+` (whitespace) directly after the literal `RESTORE` text, so the
  pattern can never match inside a longer identifier — `restorex 5` fails the lookahead at the `x`,
  and `RESTORE_NO_NL` is not given `LONGER_ALT`/`CATEGORIES` the way `RELEASE_NO_NL`/`EXIT_NO_NL` are
  (intentionally: an identifier boundary is already guaranteed by the required whitespace, so no
  longest-match fallback is needed).
- `restore * 2` (spaced multiplication) still fails to match (no `[A-Za-z_]` immediately after `*`),
  correctly falling through to ordinary expression parsing.
- Token-priority ordering (`reorderTokenPriorities`) puts `ASTERISK_STANDALONE` ahead of
  `ASTERISK_EXPRESSION`, so after `RESTORE_NO_NL` consumes only the `RESTORE` text, the following
  `*RETRY` is lexed as `ASTERISK_EXPRESSION` + `ID`, matching the grammar's `SymbolicLabelName` shape.

Ran `npx vitest run test/line-break-validation.test.ts` (`'Line break validation: RESTORE with a
numeric or label reference'` and `'...the RESTORE verb word used as a name'` describe blocks) — all
pass, including the "parses as exactly one RestoreStatement" shape-assertion tests that specifically
guard against the statement-splitting failure mode CR-02 originally caused.

### Verified: WR-01 — conflicting-DECLARE check now short-circuits on two known BBj scalar types

**File:** `bbj-vscode/src/language/validations/check-variable-scoping.ts:340-379`,
`bbj-vscode/src/language/validations/check-classes.ts:128-136`

`KNOWN_BBJ_SCALAR_TYPES` (commit `5bfa5ddf`) is promoted from a private `ClassValidator` field to a
module-level `export const` in `check-classes.ts`, and `checkConflictingDeclares` now compares both
DECLARE types' simple names against it *before* falling through to the resolution-based
(`getClass`/`bbjTypesAreRelated`) path — so `DECLARE BBjNumber q! / DECLARE BBjString q!` is flagged
unconditionally, with no java-interop/classpath dependency, while a mixed scalar/unresolved pair is
left alone (still deferring to resolution, avoiding a false positive when interop is down). Ran
`npx vitest run test/variable-scoping.test.ts -t scalar` — the four new scalar-conflict tests
(program-scope warning, method-scope error, same-scalar-twice silence, scalar-vs-unresolvable-class
silence) all pass.

## Warnings

### WR-A: `elseStatementLineBreaks` over-counts a complete inner `IF...ELSE...FI` group, producing a new false positive (same class as the accepted A2 residue)

**File:** `bbj-vscode/src/language/validations/line-break-validation.ts:188-209`

**Issue:** `elseStatementLineBreaks` increments `openIfs` for *both* an `IfEndStatement` and an
`ElseStatement` encountered while walking backward:

```ts
if (isIfEndStatement(prev) || isElseStatement(prev)) {
    openIfs++;
} else if (isIfStatement(prev)) {
    ...
}
```

But `ifEndStatementLineBreaks` treats the two differently — only `IfEndStatement` increments;
`ElseStatement` is treated like `IfStatement` (decrement/terminate):

```ts
if (isIfEndStatement(prev)) {
    openIfs++;
} else if (isIfStatement(prev) || isElseStatement(prev)) {
    ...
}
```

When a same-line chain contains a *complete* inner `IF...THEN...ELSE...FI` group (both an inner
`ElseStatement` and an inner `IfEndStatement` for the same inner `IfStatement`), the ELSE-side walk
counts that single inner IF as consuming **two** opens (one for the inner FI, one for the inner
ELSE) instead of one, so it runs out of "claimed" IFs one step too early and misses the real
governing IF further back. Verified empirically (throwaway probe, run and deleted in this session,
not part of any commit):

```
input:  'if a then if b then c=1 else d=1 fi else e=1 fi\n'
statements: ['IfStatement','IfStatement','LetStatement','ElseStatement','LetStatement',
             'IfEndStatement','ElseStatement','LetStatement','IfEndStatement']
diagnostics: ['This statement needs to start in a new line: else']
```

The outer `else` is flagged even though this is a fully legal, compiler-accepted nested single-line
`IF`/`ELSE`/`FI` construct — the same input shape as the passing test
`'a nested single-line IF/FI followed by the outer ELSE stays clean'` in
`line-break-walk-termination.test.ts:115-119` (`if a then if b then c = 1 fi else d = 1 fi`), except
with an *inner* `ELSE` added. A three-level version of the same shape
(`if a then if b then if c then d=1 else e=1 fi else f=1 fi else g=1 fi`) reproduces the identical
`else` message. Neither shape is covered by `single-line-if-forms.bbj` or
`line-break-single-line-if.test.ts`, whose nested-IF cases never combine an inner ELSE with an inner
FI on the same chain.

This is the same false-positive class the phase's own closing conformance run measured (A2 = 27
against a ≤25 gate, "This statement needs to start in a new line: else" — 1 of the 5 newly-flagged
files) and that the project has already accepted as tracked debt
(`.planning/phases/98-line-break-validation-false-alarms-a2/98-VERIFICATION.md` overrides block,
accepted by Stephan Wald 2026-09-21; `.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`).
Filed here as a Warning (not a Blocker) for that reason — it is not new information about whether to
ship, but it is a concrete, minimal, synthetic reproduction (the "else" message group) that the
existing todo describes only in the abstract ("likely an edge case in how it counts open IFs versus
stepped-over closers"), so it should materially help whoever picks up that todo.

**Fix:** Make `elseStatementLineBreaks` treat a same-line `ElseStatement` the same way
`ifEndStatementLineBreaks` treats it — as consuming/terminating rather than as an independent opener
requiring its own claim — e.g.:

```ts
function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev)) {
                openIfs++;
            } else if (isIfStatement(prev) || isElseStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isElseStatement, mask]
}
```
This mirrors `ifEndStatementLineBreaks` exactly (both functions would become structurally
identical apart from which `IfEndStatement`/`ElseStatement` combination is excluded from the
increment branch). Re-run the four non-nested "still flagged" regression tests in
`line-break-walk-termination.test.ts` after this change to confirm the original false-negative
(CR-01) does not reopen — a second same-line ELSE for one IF, and an ELSE with no governing IF at
all, must both stay flagged.

---

### WR-B (carried forward, unaddressed): `BRANCH_TARGET_EXCLUSION`'s bounded quantifiers silently reintroduce the branch-target bug past their limits

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:273`

Unchanged since the superseded review — still applies. The lookbehind
`(?<!(?:GOTO|GOSUB)[ \t]{1,8}(?:[_A-Za-z]\w{0,63}@?[ \t]{0,8},[ \t]{0,8}){0,16})` bounds a target
name to 64 characters, indentation to 8 spaces/tabs, and a prior comma-separated target list to 16
items — all reasonable perf/backtracking safeguards, but also silent functional cliffs: a 17th target
in an `ON ... GOSUB` list, or a target name over 64 characters, falls outside the lookbehind and a
keyword-named label there loses branch-target linking again, with no test at or past the boundary.

**Fix:** Add at least one boundary test (e.g. a 17-target `ON ... GOSUB` list with the last target
keyword-named), or document the limit outside a regex comment.

### WR-C (carried forward, unaddressed): `TABLE_DATA`'s optional numeric line-number prefix is untested and its purpose is unclear

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:244`

Unchanged since the superseded review — still applies. The lookbehind
`(?<=(?:^|;)[ \t]*(?:\d+[ \t]+)?(?:[A-Za-z_][A-Za-z0-9_]*:[ \t]*)?TABLE[ \t]+)...` optionally allows a
leading `\d+[ \t]+` before `TABLE`, but no other statement-start token touched in this phase supports
a numeric line-number prefix, nothing in `bbj.langium` otherwise models classic-BASIC line numbers,
and no fixture (`table-statement.bbj` or the "TABLE statement" describe block in
`line-break-validation.test.ts`) exercises a bare-digit prefix.

**Fix:** Either add a fixture/test for `123 TABLE ff00\n` if numeric line-number prefixes are a real,
supported legacy form, or drop the untested `(?:\d+[ \t]+)?` group.

## Info

### IN-A: A second forbidden planning identifier survives in a line this phase's diff directly touched

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:57`

**Issue:** Same pattern as the superseded review's IN-01 (which flagged `line-break-validation.test.ts:36`,
still present and also unaddressed — see below). `reorderTokenPriorities`'s doc comment line
containing `(P61-D4-005)` is directly inside a diff hunk this phase touched (the line immediately
above it was edited, from "the 14 custom tokens" to "the custom tokens"):

```diff
-     * Splices the 14 custom tokens with an explicit priority requirement (line-break markers,
+     * Splices the custom tokens with an explicit priority requirement (line-break markers,
      * standalone-vs-expression disambiguators, etc.) to the front of the token vocabulary
      * (P61-D4-005). Extracted out of buildTokens() so a future edit to this reordering can't
```

Per `CLAUDE.md`/project convention, plan/decision IDs like `P61-D4-005` don't belong in source files
(GitHub issue numbers are the only IDs that are fine). This one predates Phase 98 (introduced in an
earlier phase, `P61`), but the adjacent-line edit was a free opportunity to drop it, and this phase's
own register-check (98-10-SUMMARY.md self-check: `register check over the whole phase source diff
... 0 matches`) evidently does not scan for the pre-existing `P61-D*` pattern, only phase-98-specific
IDs, so it went unnoticed by the phase's own tooling.

**Fix:** Drop the `(P61-D4-005)` parenthetical the next time this comment block is touched.

### IN-B (carried forward, unaddressed): superseded review's IN-01 — `P61-D5-006` still present

**File:** `bbj-vscode/test/line-break-validation.test.ts:31,36`

Unchanged since the superseded review — still applies (`describe('Line break validation: CRLF and
missing trailing newline (P61-D5-006)', ...)` and the doc comment above it). Not addressed by this
phase's gap-closure commits.

### IN-C (carried forward, unaddressed): superseded review's IN-02 — two conformance-suite tests are close to tautological

**File:** `bbj-vscode/test/conformance-regressions.test.ts:37-50`

Unchanged since the superseded review — still applies. `'conformance folder is non-empty'` re-asserts
exactly what the main test above it already checks inline (line 24), so it can never fail
independently. `'conformance file list is order-independent'` asserts the already-collected file list
equals its own sorted copy — a property of `fs.readdirSync`'s return order on this OS/filesystem, not
a property of any code path in this repo (nothing is shuffled and re-fed through the code under test).

**Fix:** Drop the redundant non-empty test, and either repurpose the "order-independent" test to
actually shuffle the file list before running it through the same validation loop the main test uses,
or rename it to describe what it actually asserts (today's directory listing happens to be sorted).

---

_Reviewed: 2026-09-21T06:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
