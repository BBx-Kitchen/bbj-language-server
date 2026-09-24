# Phase 107 Plan 04 — Conformance Measurement (VAL-01)

Measured against the private corpus and harness that live outside this repository
(`/home/coder/repos/bbj-corpus/conformance/run.mjs`). Only counts and message-group names are
recorded here — no corpus file name, no corpus path, no corpus source line (D-13).

## 1. Baseline

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <worktree> --endpoint 127.0.0.1:5008`.
- Base worktree: a detached checkout of the commit that is the parent of this phase's first
  `(107-01)` commit — the tree as it stood at phase kickoff, before any of this phase's three
  fixes landed. The grammar file was confirmed byte-identical between that commit and the current
  tree before the run, so the base worktree's own generated parser could be reused unchanged.
- Date: 2026-09-24. Mode: `validate` with the live endpoint. 584 seconds.
- Corpus size at this measurement: 16,884 accepted-corpus files, 4,615 rejected-corpus files —
  both roughly 3-4x larger than the prior local run's corpus (11,898 / 1,210), so raw counts are
  not comparable to that prior run without accounting for corpus growth; file-set membership is
  what this plan actually compares.
- Gate numbers at the base: A (valid code the language server rejects) = 26; A2 (valid code that
  parses but draws a validation error) = 33; B reconciled (invalid code the endpoint's own verdict
  says still passes unflagged) = 75; raw B (`missed`, no endpoint reconciliation) = 1,618;
  checkExceptions = 6 (all in the rejects set, a validation check throwing on invalid input, a
  pre-existing behavior unrelated to this plan).
- A2 breakdown at the base, by family: 22 files carry a line-break-coded message (blank, `else`,
  `fi` or an "end with a line break" variant); 0 files carry an unknown-Java-member message (that
  check does not exist yet on this commit); 11 files carry unrelated pre-existing messages (CASE
  outside SWITCH, a DECLARE placement rule, a field-type/initializer mismatch, an MKEYED MODE
  option rule, one member-visibility message) untouched by any of this phase's three fixes.
- Prior-vs-base difference: the last local run before this plan's work (dated 2026-09-23, run
  against the tree exactly as it stood before this phase's first commit) recorded A2 = 22 total,
  of which the line-break-message family was already exactly 6 (blank) + 1 (`else`) files — the
  same file-set-relevant counts the base run above reproduces for that family. The total A2 count
  differs (22 vs 33) because the corpus itself grew between the two runs; the base run above is
  the one this plan compares its own fix against, since it was taken from the exact commit this
  plan's own fixes are layered on.

## 2. VAL-01 target set

Target set T, read from the base run's own `falseAlarms` list: every id whose message is exactly
`This statement needs to start in a new line: ` (blank, nothing captured after the colon-space) or
ends with `: else`. Size: **7 files** (6 blank-message, 1 `: else`-message) — matching the
2026-09-23 local run's own count for the same two groups exactly. Separately recorded but **not**
a criterion-3 item (same message-mask family, a different disposition question the plan does not
ask this task to resolve): 1 file whose message ends with `: fi`.

A purpose-built local probe (`snapshots/phase-107-file-probe.mts`, never committed) validates each
target-set file with the same test-double services the harness itself uses and prints every
Error-severity diagnostic's code, message and line, entirely locally.

- Run against the current tree (with plan 107-01's fix already committed, before this plan's own
  fix): **5 of 7** target files carried zero `bbj-line-break` Errors already (107-01's counter
  repair, and its own colon-continuation finding, already cleared them). **2 of 7** still carried
  a `bbj-line-break` Error each — the same shape in both files.
- The remaining shape, in own words: a chain of several `IF ... THEN` / `ELSE IF ... THEN` /
  `ELSE ...` branches inside a `DEF FN ... FNEND` function body, continued over several
  colon-prefixed physical lines (so the lexer's line-joiner treats the whole chain as one logical
  line for same-line balance purposes) and closed only by the function's own `FNEND` — no `FI`
  appears anywhere in the chain, because each branch is a single `RETURN` statement and the
  compiler accepts an unterminated single-statement `IF`/`ELSE` chain when the enclosing function
  simply ends. Instrumenting the shared backward-walk helper the three balance-rule walkers all
  use (`previousStatement`) showed it returning "no predecessor" for every `ELSE`/`IF` in the
  chain, even though same-line predecessors clearly existed — because a `DEF FN` body's sibling
  list mixes `RETURN` (a distinct AST type from every other statement, used only inside a function
  body) in with the ordinary statement types the walk otherwise recognizes, and the helper's
  sibling lookup treated a `RETURN` sibling as "not a statement" rather than "a statement to walk
  past," stopping the walk one step too early and leaving every `ELSE`/`IF` on that logical line
  without the governing `IF` it needed to be recognized as clean. This is a different mechanism
  from 107-01's own counter fix (which never touches `previousStatement` itself) and from the
  A2-blank-message colon-continuation finding 107-01 already closed (which shares the same
  colon-joined-line machinery but not this specific "a RETURN blocks the walk" defect).

## 3. VAL-01 re-measure

The fix: the shared backward-walk helper now skips transparently past a same-line run of `RETURN`
siblings to find the nearest real statement, instead of stopping at the first one. A synthetic,
invented-name regression test pinned the exact shape (a colon-continued multi-branch chain inside
a `DEF FN` body, closed only by `FNEND`) failing before the fix and passing after; a matching clean
fixture line was added to the conformance regression fixtures. The message text itself is
unchanged (`grep -c "This statement needs to start in a new line"` on the validator source still
prints 2 — the "before" and the "both" call sites, exactly as before this plan).

- Per-file probe re-run on the whole target set (all 7 files) against the current tree: **0 of 7**
  now carry any `bbj-line-break` Error. The target set is fully cleared. The separately-recorded
  `: fi`-message file is also clear on the current tree (not required by this plan's own gate, but
  a welcome side effect of the same fix).
- Full harness re-measure: `node run.mjs --ls <this repository>` (no `--endpoint`, matching this
  measurement's own comparable-mode choice — the base run above used the endpoint, and raw A2 does
  not depend on it per this plan's own instructions). Same corpus checkout as the base run (16,884
  / 4,615 files). 149 seconds.
- **A2 total, before/after:** base 33 → this run 7,413. This large jump is **not** a VAL-01
  regression: of the 7,413, 7,390 carry a "not defined on" (unknown Java member) message — the new
  check plan 107-03 added in this same phase, firing liberally against this harness's own
  intentionally small fake Java classpath double (which lacks most real methods of the classes it
  stands in for). Classifying and disposing of that noise is explicitly 107-06's job, not this
  plan's; it is reported here only so the total isn't mistaken for a VAL-01 result. The 11
  unrelated pre-existing messages (CASE-outside-SWITCH and friends) are unchanged in both count and
  content between the base run and this one.
- **Line-break-message family, before/after (the only slice this plan's own gate is about):** base
  22 files → this run 12 files. **0 files newly entered** this family (checked by id: every
  line-break-message id in this run's A2 was already present in the base run's). **10 files
  cleared**, comfortably covering this plan's own 7-file target set (all 7 gone) plus the
  separately-recorded `: fi` file, plus 2 further files whose *first* reported diagnostic in the
  base run was an "end with a line break: return" message rather than a "start in a new line"
  one — the same shared-helper fix cleared those too, since the same `RETURN`-blocks-the-walk
  defect could surface through either message depending on which check's "first" diagnostic a file
  happened to report. The remaining 12 line-break-family files are unrelated pre-existing shapes
  this plan does not touch ("end with a line break" on a bare `LET`/assignment/`GOSUB`/`RETURN`-
  without-parens/`clear`, and one `start in a new line: x[all]` array-element shape) — none of
  them share this plan's target-set message text.
- **Raw B (`missed`), newly entered: 2 files.** Both traced locally to the identical mechanism:
  each file's *only* Error-severity diagnostic, on the base tree, was a `bbj-line-break` false
  alarm on an `ELSE` inside a `DEF FN` body's inline `IF ... THEN RETURN ... ELSE RETURN ...`
  form — confirmed directly by re-probing both files against a throwaway worktree pinned to the
  commit immediately before this plan's fix, which showed exactly one Error each, at that exact
  message and shape, and zero Errors after the fix (only pre-existing linking-error Warnings
  remain, unrelated to line breaks). Each file separately contains a colon-continued `SELECT ...
  FROM ... WHERE ...`-shaped statement the compiler genuinely rejects; nothing in this language
  server's validators has ever raised an Error-severity diagnostic for that construct — the
  now-removed false alarm on the unrelated `DEF FN` block was coincidentally the only thing keeping
  these two files out of the raw-B count, not a real detection of the rejected construct. Per this
  plan's own instruction, this is reported for 107-06's human check rather than papered over by
  re-flagging the now-correctly-quiet `ELSE`.
- **Whole-suite verification:** `line-break-single-line-if.test.ts` (23 tests), the pre-existing
  `line-break-walk-termination.test.ts` (28 tests), `line-break-validation.test.ts` (98 tests) and
  `conformance-regressions.test.ts` (4 tests) all pass individually. `example-files.test.ts`
  (parses every fixture in `test-data/`, including the new one) passes. The leak guard reports
  every changed tracked file clean, and the source-diff register check for this plan's own
  changes to `bbj-vscode/src`/`bbj-vscode/test` reports no planning-identifier tokens.
