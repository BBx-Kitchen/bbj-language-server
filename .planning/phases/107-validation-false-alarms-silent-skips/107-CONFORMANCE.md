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

## 4. Final measurement

- Date: 2026-09-25. Commit: `674e4096` (phase HEAD, all six plans' fixes present). Mode: `validate`
  with `--endpoint 127.0.0.1:5008` — the same mode the base run (§1, commit `77c967ce`) used, so the
  two are directly comparable. Same corpus checkout as the base run (16,884 accepted-corpus files,
  4,615 rejected-corpus files). 582 seconds (base: 584 seconds).
- No other harness run or probe was active before this run started; the local `details.json`/
  `summary.json` sitting next to the harness at the time (a stale non-endpoint re-measure from an
  earlier plan) already matched an existing `phase-107-*` snapshot, so nothing further needed
  snapshotting before this run. Outputs copied to `phase-107-final-details.json`,
  `phase-107-final-summary.json` and `phase-107-final-run.log`.

### Gate table (base → final)

| Measure | Base (`77c967ce`) | Final (`674e4096`) | Delta |
|---|---|---|---|
| A (valid code rejected) | 26 | 26 | 0 |
| A2 raw (`falseAlarms`) | 33 | 7,411 | +7,378 |
| A2 without harness-artifact files | 33 | 36 | +3 |
| A2 comparable (harness artifacts *and* accepted genuinely-unknown members removed) | 33 | 25 | -8 |
| B raw (`missed`) | 1,618 | 1,473 | -145 |
| B reconciled (`missedReconciled`, endpoint verdict applied) | 75 | 53 | -22 |
| `checkExceptions` (rejects) | 6 | 0 | -6 |
| `checkExceptions` (corpus) | 0 | 0 | 0 |

The A2 raw jump is entirely the new unknown-Java-member check (VAL-03, added by 107-03/107-05 in
this same phase) firing against the harness's own small fake Java classpath, which lacks most real
members of the classes it stands in for — the classification below accounts for every one of the
7,411 files by file set, not by this raw total.

### VAL-01 target set (D-03)

The 7-file target set from §2 (6 blank-message + 1 `: else`-message, the files re-flagged at the
Phase 98 close) was re-probed against the current tree with the same per-file harness services:
**0 of 7 carry any `bbj-line-break` Error.** The target set stays fully cleared (matches §3's own
re-measure, which used a different tree snapshot mid-phase before VAL-03 existed).

Two of the seven now separately carry an unrelated `bbj-unknown-java-member` Error (a harness
artifact — the fake classpath's `BBjAPI` class lacks a real method the live backend has; see the
classification below) — this is VAL-03 harness noise, not a VAL-01 line-break regression. Verdict:
**re-flagged files clean — PASS.**

### File-set comparison: A2

- **Newly entered A2 (`falseAlarms`), by id: 7,383.** Every one of the 7,383 was re-probed with the
  harness's own per-file test-double services (all Error-severity diagnostics, not just the first),
  after first confirming and correcting a cold-start artifact in the probe's own document-build
  order (the very first document built in a fresh probe process links differently than every
  document after it — reproduced, understood, and fixed by warming the probe with one throwaway
  build first, mirroring the harness's own `--endpoint`-mode sanity check; unrelated to any of this
  phase's fixes). Classified by comparing each Error's id+line against
  `phase-107-live-member-probe.jsonl` (the full-corpus live-backend findings left after 107-05's
  five guards):
  - **Harness artifact** (every Error is `bbj-unknown-java-member` and none of its lines are in the
    live-backend findings — i.e. the real backend resolves that member, only the fake classpath is
    missing it): **7,372 files.**
  - **Accepted genuinely-unknown member** (every Error is `bbj-unknown-java-member` and every one of
    its lines IS in the live-backend findings — class (a) from 107-05's own review): **8 files.**
  - **Both, in the same file** (every Error is still `bbj-unknown-java-member`, but the file has at
    least one harness-artifact line and at least one already-accepted genuinely-unknown line): **3
    files.** Every diagnostic in these 3 files individually falls into one of the two accepted
    dispositions above (none is unclassified), so they are excluded from the comparable-A2 count on
    the same basis as the two pure buckets.
  - **Regression (would stop the plan):** **0 files.** No newly entered A2 file carries an Error
    that is neither `bbj-unknown-java-member` nor accounted for by the classification above.
- **Left A2, by id: 5.** All 5 are members of the VAL-01 target set (§2) — the same 5 files the
  balance-rule fix (107-01/107-04) was expected to clear once the 2 remaining unclearable-in-§3
  files (see above) picked up their own unrelated harness-artifact reason instead. No file left A2
  for any other reason.
- **Still present in A2 (in both base and final), by id: 28.** Re-probed the same way:
  - **22 files** carry no `bbj-unknown-java-member` Error at all — their A2 membership is entirely
    for the same unrelated pre-existing reason as at the base (12 are the line-break-message family
    §3 already described as out of this phase's scope — "end with a line break" on a bare
    assignment/`GOSUB`/`RETURN`-without-parens/`clear`, and one array-element shape; the other 10
    split across the CASE-outside-SWITCH, DECLARE-placement, field-type/initializer,
    member-visibility and MKEYED-MODE families §1 already named).
  - **3 files** are now purely `bbj-unknown-java-member` harness-artifact noise (their own line-break
    reason cleared by 107-01/107-04, replaced by an unrelated fake-classpath gap) — excluded from
    comparable A2 on the same basis as the "harness artifact" bucket above.
  - **3 files** carry *both* an unrelated pre-existing Error (2 are line-break-family residue, 1 is
    the DECLARE-placement message) *and* one or more harness-artifact `bbj-unknown-java-member`
    Errors — since not every Error in these 3 is accounted for by the VAL-03 classification, they
    stay counted in comparable A2 exactly as they already were at the base (their own pre-existing,
    unrelated reason, unchanged by this phase).
- **Comparable A2 = 25** (22 + 3, both from the "still present" set above). **Every one of these 25
  files was already present in this phase's own same-corpus base measurement (33)** — zero new files
  enter comparable A2. Net change vs. base: 33 → 25 (8 fewer), from 5 VAL-01 target-set clearances
  plus 3 base files whose only current reason is now-excluded harness noise.
- **Message-group shape (diagnostic level, public Java/BBj API names only — no corpus text):** the
  harness-artifact bucket's 13,353 `bbj-unknown-java-member` diagnostics span 242 distinct messages;
  the ten largest are all on the fake `BBjAPI`/`HashMap` classes (`getSysGui`, `openSysGui`,
  `makeVector`, `getAdmin`, the `TRUE`/`FALSE` fields, `getMDI`, `ON_BUTTON_PUSH`, `getLastEvent`,
  `makeColor`, `getBBjPrinter`, `HashMap.get` — real members the live backend has, absent only from
  the harness's own small fake classpath). Of the 76 genuinely-unknown findings 107-05 accepted
  corpus-wide, 13 distinct ones also surface in this harness run (the rest never reach an Error here
  because the fake classpath does not resolve their receiver as a fully-resolved Java class at all).

### File-set comparison: B

- **Raw `missed`, newly entered: 2 files.** The same 2 files §3 already reported (a compiler-rejected
  `SELECT ... FROM ... WHERE ...`-shaped construct with no Error-severity diagnostic anywhere in this
  language server) — re-confirmed identical by id, not a new discovery. Left exactly as §3 left them,
  for this same human check, per the plan's own instruction not to re-flag valid code to protect this
  gate.
- **Reconciled `missedReconciled` (the endpoint-verdict gate this phase's criterion actually reads),
  newly entered: 0 files.** **PASS.**

### `checkExceptions` (VAL-02 corroboration)

Base: 6 reject-set files, all the same `getSymbolRefName`/`checkUseBeforeAssignment` crash message
(the exact mechanism 107-02 fixed). Final: 0 corpus, 0 rejects. **Falls to 0 — PASS.**

### Suites (D-12)

- Whole suite, `RUN_BBJ_TESTS=0 --maxWorkers=2`: `numFailedTests=0`, `numTotalTests=2728` (4 failed
  test *suites* out of 554 — the known `beforeAll` contention pattern, judged on `numFailedTests`
  per the standing decision).
- `test/linking.test.ts`, `RUN_BBJ_TESTS=1`: 11 failed, 30 passed, 1 skipped on both HEAD and a
  scratch worktree pinned to the base commit (`77c967ce`, symlinked `node_modules`, the generated
  parser copied unchanged since `bbj.langium` is byte-identical between the two commits). The 11
  failing names are identical on both trees — the known "Interop related tests" backend-drift
  baseline, unrelated to this phase.
- `test/functional/issue440-real-interop.test.ts`, `RUN_BBJ_TESTS=1`: 1 passed (1) on HEAD.
- `test/functional/unknown-java-member-real-interop.test.ts`, `RUN_BBJ_TESTS=1`: 5 passed (5) on
  HEAD (did not exist at the base commit).

### Register check and leak guard (D-13, T-107-15/T-107-17)

- Register check over the whole phase source/test diff (`bbj-vscode/src`, `bbj-vscode/test`,
  base `77c967ce` → HEAD): `register-clean`.
- Leak guard over every line the phase added to a tracked file: found and resolved 4 hits, all
  investigated and traced to their root cause before this section was written (none is genuine
  corpus-derived content):
  - One test fixture line coincidentally overlapped (≥15 contiguous characters) with a real corpus
    source line surfaced by this same task's own fresh `details.json` (a common, independently-named
    BBj idiom — calling a real `BBjAPI()` method already named in this phase's own planning
    discussion months before this measurement ever ran). Confirmed the hit disappears once
    `details.json` is set aside (i.e. it is not present in the stable manifest/rejects ground
    truth). Resolved by renaming the fixture's two local variables to less generic names, with no
    change to test behavior — all 5 tests in the file still pass.
  - A pre-existing decorative comment divider (added by an earlier plan in this phase, a run of `=`
    characters used file-wide as a section marker) coincidentally matched a generic-shape corpus
    line the same way this plan's own instructions already flagged for `ROADMAP.md`'s table
    separator row. Resolved by shortening the divider at its one phase-added occurrence; the file's
    other pre-existing occurrences of the same convention are outside this phase's diff and
    untouched. All 49 tests in the file still pass.
  - Three lines (in an earlier plan's SUMMARY and in `STATE.md`) quoted the literal path of a real,
    already-public example file that lives in this same repository's own `examples/` tree —
    verified directly against this checkout. The private corpus's own bookkeeping happens to record
    that same public path as one of its "origin" metadata values, which is what the guard matched;
    quoting a file this repository already ships is not a confidentiality leak, but the wording was
    still changed to describe the file without repeating its literal path, removing the ambiguity.
  - Final guard run over every added line (including the four fixes above): **exit 0, all files
    clean.**

### Verdicts (ROADMAP criterion 3, plus criterion 4 and 5's corpus clause)

- **Re-flagged files carry no line-break error:** PASS (0 of 7, confirmed by direct per-file probe).
- **Comparable A2 at or below 22:** comparable A2 measures 25 on this phase's own same-corpus base —
  3 above the ≤22 number from the v4.5 exit gate, which was measured on an older, roughly 3-4x
  smaller corpus checkout (§1) and is not directly comparable in raw magnitude. By file-set
  comparison (the method this phase and 107-04 have used throughout): **zero new files enter
  comparable A2** — every one of the 25 was already present in this phase's own base (33), and the
  number fell by 8, not rose. **Human check: approve the file-set reading, or hold to the raw ≤22
  number and treat the 3 residual files (2 line-break-family, 1 DECLARE-placement — all pre-existing
  and unrelated to this phase's three fixes) as carried-forward residue, matching the precedent
  already set for the Phase 98 close.**
- **No file newly enters B:** PASS on the criterion's own measure (reconciled `missedReconciled`, 0
  newcomers). The 2 raw-`missed` newcomers are pre-existing, already-reported findings from §3, not
  a new regression.
- **`checkExceptions` falls to 0 (VAL-02 corroboration):** PASS.
