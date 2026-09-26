# COMP-03 Measurement Record — Completion Inside Class Method Bodies (issue #561)

## Before-fix measurement

- **Date:** 2026-09-25
- **Measured commit:** `0379065c25849d80b4306ba43e30f5938f5c5350`
- **Pre-measurement statement:** confirmed before running the matrix — `git status --porcelain` for
  `bbj-vscode/src/language/bbj-completion-provider.ts` and `bbj-vscode/src/language/bbj.langium`
  printed nothing (no uncommitted change to either file), and `git log --format=%H --grep='(109-01)'
  -- bbj-vscode/src` printed nothing (no commit of this plan had touched source yet). The completion
  engine was unmodified at measurement time.
- **Re-run command:**
  ```
  rm -f /tmp/phase-109-method-body-before.jsonl
  cd bbj-vscode && MEASURE_COMPLETION_OUT=/tmp/phase-109-method-body-before.jsonl \
    npx vitest run test/completion-method-body.test.ts
  ```

| Row | In method | Control | Control labels missing in method | Verdict |
| --- | --- | --- | --- | --- |
| statement start | 147 | 145 | (none) | works |
| after = | 9 | 6 | (none) | works |
| PRINT argument | 145 | 143 | (none) | works |
| function argument | 10 | 7 | (none) | works |
| member after . | 4 | 4 | (none) | works |
| inside IF | 145 | 143 | (none) | works |
| inside FOR | 148 | 146 | (none) | works |
| DEF FN in a method | 147 | 144 | (none) | works |
| first line after METHOD | 146 | 139 | (none) | works |
| last line before METHODEND | 146 | 145 | (none) | works |
| empty method body | 145 | 139 | (none) | works |

**Every measured position works.** The `after =`, `function argument`, and `member after .` rows
have low in-method/control counts because the marker sits in a narrow grammar position (an
expression operand or a `.`-triggered member list), not a statement start — expected, and matched
between the in-method and control sides.

### Allow-list entries (legitimately scope-specific control labels)

- `class`, `interface` — program-scope-only statement keywords. BBj has no syntax for declaring a
  class or interface inside a method body, so their absence from an in-method candidate set at a
  statement-start-shaped position (`statement start`, `PRINT argument`, `inside IF`, `inside FOR`,
  `first line after METHOD`, `empty method body`) is correct language behaviour, not a measured
  gap. Confirmed live: the program-scope control for a bare statement position offers both labels;
  neither is valid syntax nested inside a `METHOD`/`METHODEND` block. Applied to every row whose
  control fixture is a bare statement-start position.
- `probeTail` — fixture-shape artifact on the `last line before METHODEND` row only. That row's
  control fixture adds a trailing `probeTail = 2` statement after the marker (the mandatory
  statement-after-marker rule, see the methodological pitfall below); the row's body fixture
  deliberately has no line after the marker, since the row exists to test the marker as the
  method's own last line. `probeTail` therefore never exists in the body's own scope by design —
  not a completion gap.

None of the above reflect a broken completion position; each is a named, justified fixture
difference between the in-method and program-scope shapes.

### Verbatim skipped-test result

`test/completion-test.test.ts:186`, `'DEF FN parameters with $ suffix inside class method'`, was
changed from `test.skip(` to `test(` with no other change (text, name and assertions untouched),
then the whole file was run: `npx vitest run test/completion-test.test.ts`.

**Result: all 44 tests passed, including the previously skipped test, unmodified.** The file was
then reverted with `git checkout -- bbj-vscode/test/completion-test.test.ts` before anything was
committed.

### Methodological note (carried from research, reconfirmed this session)

Every control fixture in the D-03 matrix keeps a statement after the `<|>` marker line (a mandatory
rule for every row's control, `probeTail = 2` or, for the `member after .`/`DEF FN` rows, the
fixture's own natural trailing content). A marker positioned as the very last content before EOF
returns 0 completions regardless of in-method vs. program-scope — an artifact of end-of-file
recovery, not a real scope difference. This matches the pitfall research already found and
recorded; the corrected matrix in `test/completion-method-body.test.ts` follows it throughout.

## Broken positions

None. Every row in the position matrix (and the verbatim skipped DEF FN test) measured `works` on
the unmodified tree, and none needed a fix.

## After this plan

The recorder was re-run (`MEASURE_COMPLETION_OUT=/tmp/phase-109-method-body-after-01.jsonl`) after
this plan's own change (un-skipping the DEF FN test and pinning every position matrix row — no
completion-provider or grammar change was made, since every row already measured `works`). The
re-run produced byte-identical output to the before-fix table above: every row still measures
`works`, with the same in-method/control counts. `test/completion-test.test.ts:186`'s DEF FN test
now runs un-skipped with its original assertions, unmodified, and passes; only its stale
0-items-in-method comment block was removed.

## #561 decision

**Drafted comment (not posted):**

> Re-measured completion inside class method bodies against the current language server. A matrix
> of nine positions was tested inside a class method body against the same position at program
> scope as a control: the start of a statement, right after `=`, a `PRINT` argument, a function-call
> argument, member access after `.`, inside an `IF` nested in a method, inside a `FOR` nested in a
> method, a `DEF FN` nested in a method (this issue's own reported scenario), the first line right
> after `METHOD`, the last line right before `METHODEND`, and an empty method body. Every position
> now returns the same completion candidates as its program-scope control.
>
> The test this issue originally reported against — completion for a `DEF FN`'s own `$`-suffixed
> parameters inside a method body — now passes unmodified when run. It is pinned, along with the
> full position matrix, in `test/completion-method-body.test.ts` and
> `test/completion-test.test.ts`, so a future regression on any of these positions will be caught.
>
> No position stayed out of reach; nothing needed a completion-provider or grammar change.

- **Positions measured:** all eleven position-matrix rows (see the Before-fix measurement table
  above), plus the issue's own DEF FN scenario (the verbatim skipped test).
- **Positions that work:** all of them — no position stays out of reach.
- **Positions that stay out of reach:** none.
- **Pinning test files:** `bbj-vscode/test/completion-method-body.test.ts` (position matrix),
  `bbj-vscode/test/completion-test.test.ts` (the DEF FN scenario, now un-skipped).

The maintainer's chosen option (recorded at the phase's blocking checkpoint) and the final comment
text (with any edits) are recorded below.

**Chosen option:** `comment-and-close` — post the drafted comment above and close issue #561 as
completed. The drafted comment text is unchanged (no edits). Nothing was posted or closed from this
plan; plan 109-06 carries out this choice after the phase's regression gate.

**Result (2026-09-25, plan 109-06, after the Final state above matched the drafted comment):**
posted comment https://github.com/BBx-Kitchen/bbj-language-server/issues/561#issuecomment-5838244001
(unedited drafted text), then closed the issue as completed. `gh issue view 561` confirms
`state=CLOSED`, `comments=1`.

## Final state

- **Date:** 2026-09-25
- **Measured commit (HEAD of this phase):** `0595f7471dc5d0dbc4f10ba627233ad2a98e1a33` (this
  plan's Task 1 commit; no completion-provider or `bbj.langium` change exists anywhere in this
  phase's diff)
- **Re-run command:**
  ```
  rm -f /tmp/phase-109-method-body-final.jsonl
  cd bbj-vscode && MEASURE_COMPLETION_OUT=/tmp/phase-109-method-body-final.jsonl \
    npx vitest run test/completion-method-body.test.ts
  ```

| Row | In method | Control | Control labels missing in method | Verdict |
| --- | --- | --- | --- | --- |
| statement start | 147 | 145 | (none) | works |
| after = | 9 | 6 | (none) | works |
| PRINT argument | 145 | 143 | (none) | works |
| function argument | 10 | 7 | (none) | works |
| member after . | 4 | 4 | (none) | works |
| inside IF | 145 | 143 | (none) | works |
| inside FOR | 148 | 146 | (none) | works |
| DEF FN in a method | 147 | 144 | (none) | works |
| first line after METHOD | 146 | 139 | (none) | works |
| last line before METHODEND | 146 | 145 | (none) | works |
| empty method body | 145 | 139 | (none) | works |

### Before → final comparison

| Row | Before verdict | Final verdict |
| --- | --- | --- |
| statement start | works | works (unchanged) |
| after = | works | works (unchanged) |
| PRINT argument | works | works (unchanged) |
| function argument | works | works (unchanged) |
| member after . | works | works (unchanged) |
| inside IF | works | works (unchanged) |
| inside FOR | works | works (unchanged) |
| DEF FN in a method | works | works (unchanged) |
| first line after METHOD | works | works (unchanged) |
| last line before METHODEND | works | works (unchanged) |
| empty method body | works | works (unchanged) |

Every row's counts are byte-identical to the before-fix table above and to the after-plan-01
re-run already recorded. No position's verdict changed across the whole phase.

### Positions still out of reach

None. Every position matrix row, and the issue's own verbatim DEF FN scenario, measures `works`
both before and after the phase.

### Regression gate (against the phase base)

- **Phase base commit:** `0379065c25849d80b4306ba43e30f5938f5c5350` (parent of the first commit
  whose message contains `(109-01)`)
- **Whole suite on HEAD** (`RUN_BBJ_TESTS=0 --maxWorkers=2`): `numFailedTests=0`,
  `numTotalTests=2842`
- **Live-gated files** (`test/linking.test.ts`, `test/functional/issue440-real-interop.test.ts`,
  `test/functional/issue447-real-interop.test.ts`,
  `test/functional/unknown-java-member-real-interop.test.ts`) with `RUN_BBJ_TESTS=1
  --maxWorkers=1` on both trees: base-failing=11, head-failing=11, head-only=0 — the 11 failing
  names on HEAD are exactly the pre-existing `linking.test.ts` interop test-double-drift set (the
  documented local baseline), the same 11 names fail on the base, and no new name fails on HEAD
- **Register check** (`D-NN`/`COMP-`/`JINT-`/`109-0N`/`CR-`/`WR-`/`IN-`/`T-109-` grep) over the
  whole phase diff (`base..HEAD`, `bbj-vscode/src` + `bbj-vscode/test`): `register-clean`, no
  match
- **Live cold-start evidence (criteria 4 and 5), against the real backend on :5008:** all three
  `test/functional/java-class-lookups-real-interop.test.ts` tests passed (not skipped) — a real
  cold start (workspace init + implicit imports) sent 635 `getRawClass` requests and logged 1106
  `Resolving class` debug lines, none of them for a primitive/void/array/blank name; no canonical
  class was requested under two spellings; `java.util.AbstractMap.SimpleEntry` resolved once for
  both its dotted and `$` spellings, sharing one object with a `getKey` method

## Gap closure: program variables in method bodies

A UAT pass against this phase's own shipped tree found completion inside a class method body
offering program-scope variables (a UAT gap, not covered by the position matrix above). "Same
candidates as the program-scope control" — the notion of correctness the matrix above and the
maintainer's posted #561 comment both used — was therefore the wrong measurement: a class METHOD
body is its own BBj variable scope, and a method sees its parameters, its locals and the class,
never the program's own variables. The matrix's `verdict()` only ever checked for labels *missing*
from the method; it never checked for labels the method must not see, so a program-scope leak
right beside the class was undetectable by construction.

The fix is a METHOD boundary in `BbjScopeProvider`'s plain-name lookup (`bbj-scope.ts`): when a
plain-name reference sits inside a `MethodDecl`, Program-keyed `VariableDecl`-subtype descriptions
(implicit assignments, READ/DREAD/ENTER targets, FOR variables, DIM arrays, program-level
DECLAREs) are dropped from the walk. Completion, linking, go-to-definition and type inference all
read the same scope, so all four agree by construction. No completion-provider or grammar change
was needed.

The matrix now plants two program variables (`programOnly$`, `ProgramObj!`) beside the class in
every `inMethod()` fixture, and `verdict()` flags any in-method label that is neither in the
control nor on a measured method-only allow-list (`extraInMethod`).

| Row | In-method (pre-fix) | In-method (fixed) | Control | Extra labels (fixed) | Verdict (fixed) |
| --- | --- | --- | --- | --- | --- |
| statement start | 149 | 147 | 145 | (none) | works |
| after = | 11 | 9 | 6 | (none) | works |
| PRINT argument | 147 | 145 | 143 | (none) | works |
| function argument | 12 | 10 | 7 | (none) | works |
| member after . | 4 | 4 | 4 | (none) | works |
| inside IF | 147 | 145 | 143 | (none) | works |
| inside FOR | 150 | 148 | 146 | (none) | works |
| DEF FN in a method | 149 | 147 | 144 | (none) | works |
| first line after METHOD | 148 | 146 | 139 | (none, allowed: `classend`, `com`, `java`, `method`, `probeTail`) | works |
| last line before METHODEND | 148 | 146 | 145 | (none) | works |
| empty method body | 147 | 145 | 139 | (none, allowed: `classend`, `com`, `java`, `method`) | works |

Ten of the eleven rows measured `broken` (extra `ProgramObj!`/`programOnly$` in the in-method
candidate set) on the pre-fix tree; only `member after .` measured `works` on both trees, since a
`.`-triggered member list never falls through to the plain-name lookup this fix changes. All
eleven rows measure `works` on the fixed tree, with zero extra labels beyond the pre-existing,
already-justified fixture-shape allowances documented earlier in this file.

The #561 comment posted at the close of plan 109-06 said "no position stayed out of reach" using
the program-scope-control notion of correctness above; that wording predates this correction. This
plan posts nothing further to GitHub — issue #561 stays closed under the maintainer's original
comment-and-close decision, and this addendum is the record of the correction for anyone auditing
that decision later.
