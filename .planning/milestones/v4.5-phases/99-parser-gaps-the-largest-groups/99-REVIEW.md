---
phase: 99-parser-gaps-the-largest-groups
reviewed: 2026-09-21T15:48:02Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - bbj-vscode/src/language/bbj-validator.ts
  - bbj-vscode/src/language/bbj.langium
  - bbj-vscode/test/line-break-validation.test.ts
  - bbj-vscode/test/parser-keyword-statements.test.ts
  - bbj-vscode/test/test-data/conformance/comment-after-continuation.bbj
  - bbj-vscode/test/test-data/conformance/field-verb.bbj
  - bbj-vscode/test/test-data/conformance/iolist-statement.bbj
  - bbj-vscode/test/test-data/conformance/label-word-as-name.bbj
  - bbj-vscode/test/test-data/conformance/record-verbs-len-option.bbj
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 99: Code Review Report

**Reviewed:** 2026-09-21T15:48:02Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the diff between `eb1dd68d` and `HEAD` for the grammar additions (`FieldStatement`, `IolistStatement`, `LabelName`/`'label'` widening, the `LastVerifyOption` `LEN=` unfuse) and the `checkCommentNewLines` rework from a raw-text backwards scan to a CST-leaf lookup, plus the accompanying test files and conformance fixtures.

The CST-leaf rework was the highest-risk change in this diff (it changes both algorithm and data source for a validator that runs on every `CommentStatement`). I traced it empirically rather than by inspection alone:

- Verified, via an instrumented probe against the real parser, that Langium's `WS` hidden terminal is declared `isWhitespace` and therefore gets Chevrotain `GROUP: Lexer.SKIPPED` (`node_modules/langium/lib/parser/token-builder.js:56`) — it never becomes a CST node at all (not even a "hidden" one), for any amount of intervening whitespace (tab, multiple spaces, none). This means the concern raised in the review brief — "does `findLeafNodeAtOffset(root, offset-1)` land on whitespace and silently resolve to `undefined`, producing a false negative" — does not reproduce: `previousLeaf` always resolves to the nearest **real** token regardless of the whitespace run's width. Confirmed with a raw CST dump for `x = 1  ;   rem a comment\n` (no hidden nodes appear anywhere in the tree) and for consecutive `rem` lines with and without a blank line between them (no false-positive diagnostic).
- Cross-checked `bbj-token-builder.ts`'s custom terminal patterns (`ASTERISK_STANDALONE`, `RELEASE_NL`, `EXIT_NO_NL`, `RESTORE_NO_NL`, `RPAREN_NL`, `START_BREAK`, `FNEND`, `NEXT_BREAK`, `NEXT_ID`, `METHODRET_END`, `ENDLINE_PRINT_COMMA`, `PRINT_STANDALONE_NL`, `TABLE_DATA`) against `KEYWORD_STANDALONE`: every one of them gates its trailing `;`/line-break with a zero-width `(?=...)` lookahead except `KEYWORD_STANDALONE`, whose pattern `(${KEYWORD_STANDALONE})\s*(\r?\n|;)` has no lookahead and genuinely consumes the terminator into its own matched text. `TERMINATOR_CONSUMING_LEAF_TOKENS = new Set(['KEYWORD_STANDALONE'])` is therefore complete, not just plausible.
- Ran `test/line-break-validation.test.ts` (98/98), `test/parser-keyword-statements.test.ts` (105/105), and `test/example-files.test.ts` (which auto-parses the 5 new conformance fixtures) — all green.
- Checked the THEN/ELSE exemption's blast radius: `'THEN'` and `'ELSE'` each appear exactly once in the grammar (`IfStatement`, `ElseStatement`), so the exemption can only fire when the comment leaf is literally the very next token after one of those two keywords — it cannot mask a missing separator further down a chained statement line.
- Verified the `LastVerifyOption` `LEN=` → `'LEN' '='` unfuse against the `RECORD(...,LEN=...)` channel-option grammar (a generic `Option`-style path, unrelated rule) — the previous single fused `'LEN='` keyword token had lexer-wide priority and would out-race the two-token form needed elsewhere, which is exactly the class of bug the "largest groups" conformance work targets; the split plus the six-verb/fused/case-variant test matrix and the `record-verbs-len-option.bbj` fixture cover it well.
- Checked that `'label'` as a `FeatureName`/`LabelName` alternative doesn't collide with `LibSymbolicLabel`'s own `'label'` keyword — they're reachable through disjoint top-level rule paths, and the extensive `parser-keyword-statements.test.ts` "the word `label` as a name" block (declaration, GOTO/GOSUB/ON...GOTO targets, plain variable read/write, regression checks for unrelated label names, and the deliberately-still-broken `CLASS PUBLIC label`) exercises this thoroughly.
- No hardcoded secrets, `eval`, empty catch blocks, or debug artifacts (`console.log`, `TODO`/`FIXME`/`HACK`, commented-out code) were introduced by this diff. The one `TODO` visible in the grammar diff hunk (`ForStatement`) is pre-existing context, not a new line. No stray planning identifiers (plan numbers, `D-xx`, `PARSE-xx`, "gap closure") were found in the new source or test comments — the new prose comments in both the grammar and the conformance fixtures are self-contained and readable without external plan context.

One real, if minor, quality gap was found (test coverage asymmetry on cross-reference resolution — see WR-01), plus two INFO-level test-coverage observations.

## Warnings

### WR-01: `FieldStatement.err` cross-reference resolution is asserted as "present" but never as "resolved"

**File:** `bbj-vscode/test/parser-keyword-statements.test.ts:139-149`
**Issue:** The `IOLIST`/`label` sections of this same file both go the extra step of asserting that a cross-reference actually *resolves* to its declaration (`userLabelRef.label.ref` is defined, and its `.name` matches — e.g. lines 246-256 and 305-316). The `FIELD verb` section's equivalent test only checks `fieldStatement.err).toBeDefined()` (the AST node exists), never that `fieldStatement.err.err.ref` (or whatever the resolved `LabelRef` shape is) actually points at a real `LabelDecl`. Since `Err`'s `err=err LabelRef` is reused unmodified by this phase, the parsing side is almost certainly fine, but the test suite for the one genuinely new production (`FieldStatement`) is weaker on this axis than the sibling `IolistStatement`/`label` suites added in the same file, so a future linking regression specific to `FieldStatement`'s error branch would not be caught here.
**Fix:** Mirror the pattern already used for the label/IOLIST tests, e.g.:
```typescript
test('the trailing error branch to a user label resolves the cross-reference to that declaration', async () => {
    const parsed = await parse('field rec$,name$=1,err=mylabel\nmylabel:\nx=1\n');
    expect(parsed.parseResult.parserErrors).toHaveLength(0);
    const fieldStatement = (parsed.parseResult.value as Program).statements[0] as FieldStatement;
    const labelRef = fieldStatement.err as unknown as { label: { ref?: LabelDecl } };
    expect(labelRef.label.ref).toBeDefined();
    expect(labelRef.label.ref!.name.toLowerCase()).toBe('mylabel');
});
```

## Info

### IN-01: Bare `LEN` (no prefix/suffix) as a plain identifier is not covered by the keyword-as-identifier matrix

**File:** `bbj-vscode/test/parser-keyword-statements.test.ts:47-54`
**Issue:** The `RECORD verbs LEN= channel option` describe block's "keyword-as-identifier" cases test `mylen`, `lenx$`, `nlen(1)`, `for ... to mylen`, `if mylen then` — all variants where `LEN` is a substring of a longer identifier — but never the exact bare word `len` used as a variable (`len=1`, `x=len+1`). Given `'LEN'` is now a real keyword literal in the grammar (previously fused into `'LEN='`), and this project's `BBjTokenBuilder` widens all-caps single-word keywords into the `ID` category so they remain usable as plain identifiers elsewhere (the same mechanism the `'void'`/`'label'` precedent relies on), this almost certainly already works — but it is the one case in this test file's "keyword-as-identifier" pattern that isn't actually exercised for this specific keyword, unlike the analogous `field`/`err`/`iolist`/`label` bare-word cases which are all explicitly tested elsewhere in the same file.
**Fix:** Add `['len', 'len=1\n']` (and optionally `x=len+1\n`) to the existing `test.each` table for symmetry with the other three new keyword groups.

### IN-02: `checkCommentNewLines`'s CST-leaf rationale comment is dense and would benefit from one added empirical note

**File:** `bbj-vscode/src/language/bbj-validator.ts:283-292`
**Issue:** The comment block correctly explains why `findLeafNodeAtOffset` beats the old raw-text scan across a `':'`-continuation join, but doesn't mention the (verified) fact that whitespace runs of any width never produce an intervening CST node in this codebase's parser configuration (Chevrotain `GROUP: Lexer.SKIPPED` for the `WS` hidden terminal) — which is the actual invariant that makes `previousLeaf` a reliable "closest real token" lookup regardless of how much space/tab separates the comment from what precedes it. A future reader auditing this function for the same "does it handle whitespace runs" question would have to re-derive this from Langium internals, as this review did.
**Fix:** Optional one-line addition, e.g.: "`WS` is a pure-whitespace hidden terminal, so Chevrotain drops it entirely (Lexer.SKIPPED) rather than emitting a hidden CST node for it — no amount of intervening whitespace can make this lookup land on anything but a real token or `undefined`."

---

_Reviewed: 2026-09-21T15:48:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
