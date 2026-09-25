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

None. Every row in the D-03 matrix (and the verbatim skipped DEF FN test) measured `works` on the
current, unmodified tree.

## #561 decision

(filled by Task 2 with the drafted maintainer comment, and by Task 3 with the chosen option)

## Final state

(filled by plan 109-06 after the phase's regression gate)
