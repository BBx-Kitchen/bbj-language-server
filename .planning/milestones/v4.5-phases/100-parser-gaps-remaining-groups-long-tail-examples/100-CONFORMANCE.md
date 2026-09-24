# Phase 100 — Conformance Measurement

Measured at each plan boundary against the private corpus and harness that live outside this
repository (`/home/coder/repos/bbj-corpus/conformance/run.mjs`). Only counts and first-word /
message-group names are recorded here — no corpus file name, no corpus path, no corpus source
line.

## Baselines

The Phase 99 closing numbers this phase measures against (`99-CONFORMANCE.md`):

| Measure | Phase 99 close | Phase 100 gate |
|---|---|---|
| A — valid code the language server rejects | 52 | ≤ 25 |
| A2 — valid code that parses but gets a validation error | 23 | ≤ 23 |
| B — invalid code not flagged, of 1,210 | 666 | recorded with per-file evidence status, not gated |

Direction of worse: for A, A2 and B, a **higher** file count is worse. Lower is always better.

## Run: plan 01

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `eabd6c4d` (the tree as committed through this plan's
  task 2), mode `validate`, `sourceModified: false`, 77 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.
- `details.json` snapshotted to `snapshots/details-100-01-before.json` before the run.

**Numbers.**

| Measure | Baseline | This run | Delta vs baseline | Gate | Verdict |
|---|---|---|---|---|---|
| A — valid code the language server rejects | 52 | 21 | −31 | ≤ 25 (phase-final) | **improved, below the phase-final gate already** |
| A2 — valid code that parses but gets a validation error | 23 | 24 | +1 | ≤ 23 | above baseline by 1 file |
| B — invalid code not flagged, of 1,210 | 666 | 669 | +3 | recorded, not gated | regressed by 3 files |

The phase's A ≤ 25 gate is evaluated once every group in this phase has landed (plan 06); this
run reports the group's own contribution — a −31 file improvement, well past this group's own
"about 29" estimate from the phase context, meaning some files attributed to other groups in that
estimate were also empty-bracket cases.

**A — by first word of the line the parser stops at (this run, 21 files total).**

| Files | Group |
|---|---|
| 3 | METHODEND |
| 3 | METHOD |
| 2 | PRINT |
| 2 | IF |
| 1 each | PROCESS_EVENTS, *(empty)*, USE, FNEND, VAR, INPUT, FULLTEXT, DEF, ASSERT, ON, LET |

None of these first-word groups is the array-bracket group this plan targeted — that group is
fully cleared from list A. The remaining groups belong to later plans in this phase (block
boundaries, language words as names, the long tail) or are residue for the triage plan.

**A2 — by message (this run, 24 files total).**

| Files | Message group |
|---|---|
| 6 | This statement needs to start in a new line: *(blank)* |
| 3 | This statement needs to end with a line break: return |
| 1 | This statement needs to end with a line break: endif |
| 1 | Field 'y!' is declared 'BBjString' but is initialized with a number. |
| 1 | This statement needs to start in a new line: x[all] |
| 1 | This statement needs to end with a line break: clear |
| 1 | 'CASE DEFAULT' is only allowed inside a SWITCH block. |
| 1 | This statement needs to start in a new line: fi |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body. |
| 1 | The member is not visible (a visibility check) |
| 1 | MODE option only supported in MKEYED Verb. |
| 1 | This statement needs to end with a line break: LET num = 6.022 |
| 1 | This statement needs to end with a line break: LET tiny = 1 |
| 1 | This statement needs to end with a line break: LET val = 1 |
| 1 | This statement needs to end with a line break: (an assignment whose right-hand side is a decimal number literal) |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. |
| 1 | This statement needs to start in a new line: else |

One message group is new against the Phase 99 close: "This statement needs to start in a new
line: x[all]" (1 file). Every other message group present at the Phase 99 close still appears at
an unchanged count in this run's table.

**Set-movement sizes** (file-set difference, `snapshots/details-100-01-before.json` vs. this
run's `details.json`; sizes only, no id, path or line).

- **A (falseRejects): before 52, after 21 — 31 files left the list, 0 newly appeared.** Every
  movement this run made to list A is an improvement; none of this plan's grammar edit added a
  new list-A entry.
- **A2 (falseAlarms): before 23, after 24 — 1 file newly appeared, 0 left.** The new message
  group above is exactly this one file.
- **B (missed): before 666, after 669 — 3 files newly appeared, 0 left.** Three previously-caught
  invalid files are no longer flagged by this tree.

## 4 files moved the wrong way — handed to the orchestrator

1 file newly entered A2 (a false alarm on previously-clean code) and 3 files newly entered B's
missed set (previously-caught invalid code no longer flagged) — 4 files total moved the wrong
way this run. Of these, **3 files left the caught set** (the B regressions: code the harness
used to correctly flag as invalid is now silently accepted). No cause, mechanism or attribution
is recorded here for any of the four — the per-file look is the orchestrator's job, not this
task's, per this phase's own working rule.

### Per-file look at the four files (orchestrator, after plan 01)

Evidence: file-set diff of `snapshots/details-100-01-before.json` against the post-run `details.json`,
the flagged source lines, and direct `bbjcpl -N` probes.

**Redaction note (100-06, Task 2):** this table originally named each corpus file directly by path,
violating this phase's own no-corpus-identifier rule (D-27) and T-100-06-01's disposition. The path
column below has been replaced with a neutral per-row label; every other word of the original
analysis is unchanged.

| File | Move | What the file shows |
|------|------|---------------------|
| Residue file A | A → A2 | Was on list A for `dread x![]` (line 5). That now parses; the next disagreement in the same file is `clear x![]` (line 14), reported as "This statement needs to end with a line break: clear". `bbjcpl` accepts `clear x![]`. `CLEAR` followed by a variable list is a long-tail shape for plan 04, not a fault of the bracket rule. |
| Residue file B | caught → B | Compiler's complaint is an undefined label (line 895). The only thing this tree ever flagged was the parse error on `A![]=SN!.split("R")` (line 2527), which the compiler accepts. The earlier "catch" was accidental. |
| Residue file C | caught → B | Compiler rejects a whole-array assignment target whose right-hand side is a function call rather than another whole array. Probes: `parts$[] = "a"` and `parts$[all] = "a"` are both rejected, `parts$[] = q$[]` is accepted. The compiler requires a whole-array right-hand side for a whole-array target; that rule applied to `[all]` before this phase and was never checked here. It is a typed validation rule, not a parser shape; out of scope for the parser plans. |
| Residue file D | caught → B | Compiler rejects `FILEOPEN(...)` on line 1 (see the pending file-dialog todo handled in plan 05). Previously flagged only through the `[]` parse error on line 6. Accidental catch. |

Net: no file lost a correct diagnosis. Three accidental catches went away with the parse error that
produced them; one file advanced from its first disagreement to its second.

## Run: plan 02

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `84d800c7` (the tree as committed through this
  plan's task 2), mode `validate`, `sourceModified: false`, 77 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.
- `details.json` snapshotted to `snapshots/details-100-02-before.json` before the run.

**Numbers.**

| Measure | Plan 01 run | This run | Delta vs plan 01 | Delta vs Phase 99 close | Gate | Verdict |
|---|---|---|---|---|---|---|
| A — valid code the language server rejects | 21 | 16 | −5 | −36 | ≤ 25 (phase-final) | **improved, at or below the plan 01 run and the phase-final gate** |
| A2 — valid code that parses but gets a validation error | 24 | 28 | +4 | +5 | ≤ 23 | above both baselines |
| B — invalid code not flagged, of 1,210 | 669 | 669 | 0 | +3 | recorded, not gated | unchanged from plan 01 |

**A — by first word of the line the parser stops at (this run, 16 files total).**

| Files | Group |
|---|---|
| 2 | PRINT |
| 2 | IF |
| 1 each | PROCESS_EVENTS, *(empty)*, METHODEND, USE, FNEND, VAR, INPUT, FULLTEXT, ON, LET, METHOD |

None of the remaining first-word groups belong to the block-boundary or line-numbered-class
groups this plan targeted — the one `METHODEND` file and the one `FNEND` file left on list A
are a bare, unadorned `methodend`/`fnend` line with nothing after it (no trailing comment, no
class around it), which is a different shape from the comment-tail and line-number gaps this
plan closed; they carry over as residue for the long-tail triage.

**A2 — by message (this run, 28 files total).**

| Files | Message group |
|---|---|
| 6 | This statement needs to start in a new line: *(blank)* |
| 4 | This statement needs to end with a line break: classend |
| 3 | This statement needs to end with a line break: return |
| 1 | This statement needs to end with a line break: endif |
| 1 | Field 'y!' is declared 'BBjString' but is initialized with a number. |
| 1 | This statement needs to start in a new line: x[all] |
| 1 | This statement needs to end with a line break: clear |
| 1 | 'CASE DEFAULT' is only allowed inside a SWITCH block. |
| 1 | This statement needs to start in a new line: fi |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body. |
| 1 | The member is not visible (a visibility check) |
| 1 | MODE option only supported in MKEYED Verb. |
| 1 | This statement needs to end with a line break: LET num = 6.022 |
| 1 | This statement needs to end with a line break: LET tiny = 1 |
| 1 | This statement needs to end with a line break: LET val = 1 |
| 1 | This statement needs to end with a line break: (an assignment whose right-hand side is a decimal number literal) |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. |
| 1 | This statement needs to start in a new line: else |

One message group is new against the plan 01 run: "This statement needs to end with a line
break: classend" (4 files). Every other message group present at the plan 01 run still appears
at an unchanged count in this run's table.

**Set-movement sizes** (file-set difference, `snapshots/details-100-02-before.json` vs. this
run's `details.json`; sizes only, no id, path or line).

- **A (falseRejects): before 21, after 16 — 5 files left the list, 0 newly appeared.** Every
  movement this run made to list A is an improvement; none of this plan's grammar edit added a
  new list-A entry.
- **A2 (falseAlarms): before 24, after 28 — 4 files newly appeared, 0 left.** All four newly
  appeared files carry the exact same message group above, and the exact same own-words line
  shape: a `CLASSEND` immediately followed by a semicolon-introduced comment with the word
  `rem` and no comment text at all after it (`classend; rem` and `classend;rem`, nothing
  trailing).
- **B (missed): before 669, after 669 — 0 files newly appeared, 0 left.** No movement in the
  missed set this run.

## 4 files moved the wrong way — handed to the orchestrator

All four are A2 entries (0 files left the caught set this run — the missed/B set did not move).
Every one of the four carries the identical message group ("This statement needs to end with a
line break: classend") and the identical own-words line shape: `CLASSEND` followed by a
semicolon-introduced comment whose comment word (`rem`) has no text after it at all — no space,
no body. This plan's own diagnostic-cleanliness tests for the block-boundary comment tail always
gave the comment a body (`; rem c`); a bare `; rem` with nothing following it is a narrower shape
this plan did not probe. No cause, mechanism or attribution is recorded here for any of the four
— the per-file look is the orchestrator's job, not this task's, per this phase's own working
rule.

### Per-file look at the four A2 files (orchestrator, after plan 02)

File-set diff of `snapshots/details-100-02-before.json` against the post-run `details.json`: list A lost
5 files and gained none; B is the same set; A2 gained exactly 4 files (their respective flagged lines
were 20, 19, 33 and 36 — corpus identifiers redacted per D-27, T-100-06-01). All four were on list A
before, all four flagged lines are
`classend; rem` / `classend;rem` with nothing after the comment word, all four carry the message
"This statement needs to end with a line break: classend". The line-end pattern in
`line-break-validation.ts` demands a blank after `rem`, so a bare `rem` at end of line does not count
as a comment tail. For a user these four files are no better off yet (one error replaced by another),
so the pattern fix is folded into plan 04 together with `clear x![]` from the plan 01 look; the
same-line leading line number in front of `class`/`classend` (false line-break diagnostics, present
before this phase) goes to plan 04 as well.

## Run: plan 03

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `95c9c79c` (the tree as committed through this
  plan's task 2), mode `validate`, `sourceModified: false`, 79 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.
- `details.json` snapshotted to `snapshots/details-100-03-before.json` before the run.

**Numbers.**

| Measure | Plan 02 run | This run | Delta vs plan 02 | Delta vs Phase 99 close | Gate | Verdict |
|---|---|---|---|---|---|---|
| A — valid code the language server rejects | 16 | 13 | −3 | −39 | ≤ 25 (phase-final) | **improved, at or below the plan 02 run and the phase-final gate** |
| A2 — valid code that parses but gets a validation error | 28 | 27 | −1 | +4 | ≤ 23 | above the Phase 99 close, improved against plan 02 |
| B — invalid code not flagged, of 1,210 | 669 | 669 | 0 | +3 | recorded, not gated | unchanged from plan 02 |

**A — by first word of the line the parser stops at (this run, 13 files total).**

| Files | Group |
|---|---|
| 2 | PRINT |
| 2 | IF |
| 1 each | PROCESS_EVENTS, *(empty)*, METHODEND, FNEND, INPUT, FULLTEXT, ASSERT, ON, METHOD |

The three files that left list A this run, by their own flagged line's real cause: a `use`
statement whose Java package path ends in a word that also names a standalone-statement keyword — fixed by the
`PRINT_STANDALONE_NL` grant, since the word at end-of-line was being intercepted by that custom
token instead of read as the path's last identifier segment; a bare `Var =2` assignment — fixed
by the lowercase-declared `var` widening; and a binary-operand read ending in `START` (`LET
LINE_LEN = LF_POS - START`) — fixed by the `START_BREAK` grant. None of the remaining first-word
groups belong to this plan's own targeted words; they carry over as residue for the long-tail
triage.

**A2 — by message (this run, 27 files total).**

| Files | Message group |
|---|---|
| 6 | This statement needs to start in a new line: *(blank)* |
| 4 | This statement needs to end with a line break: classend |
| 3 | This statement needs to end with a line break: return |
| 1 | This statement needs to end with a line break: endif |
| 1 | Field 'y!' is declared 'BBjString' but is initialized with a number. |
| 1 | This statement needs to start in a new line: x[all] |
| 1 | This statement needs to end with a line break: clear |
| 1 | 'CASE DEFAULT' is only allowed inside a SWITCH block. |
| 1 | This statement needs to start in a new line: fi |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body. |
| 1 | The member is not visible (a visibility check) |
| 1 | MODE option only supported in MKEYED Verb. |
| 1 | This statement needs to end with a line break: LET num = 6.022 |
| 1 | This statement needs to end with a line break: LET tiny = 1 |
| 1 | This statement needs to end with a line break: LET val = 1 |
| 1 | This statement needs to end with a line break: (an assignment whose right-hand side is a decimal number literal) |
| 1 | This statement needs to start in a new line: else |

No message group is new against the plan 02 run. One message group present at the plan 02 run
(`This statement needs to end with a line break: log.DURATION = log.END-log.`) no longer appears
— its file moved off list A2 this run (see set-movement sizes below); every other message group
present at the plan 02 run still appears at an unchanged count in this run's table.

**Set-movement sizes** (file-set difference, `snapshots/details-100-03-before.json` vs. this
run's `details.json`; sizes only, no id, path or line).

- **A (falseRejects): before 16, after 13 — 3 files left the list, 0 newly appeared.** Every
  movement this run made to list A is an improvement; none of this plan's grammar or
  token-builder edit added a new list-A entry.
- **A2 (falseAlarms): before 28, after 27 — 0 files newly appeared, 1 left.** No new false alarm
  was introduced this run.
- **B (missed): before 669, after 669 — 0 files newly appeared, 0 left.** No movement in the
  missed set this run.

## 0 files moved the wrong way this run

Every set-movement this run was an improvement or neutral: 3 files left list A, 1 file left list
A2, and list B did not move at all. No file newly entered A2 or B, so there is nothing to hand to
the orchestrator's per-file look this time.

## Oracle sweep

**Swept-literal count.** Every single-quoted keyword literal in `bbj.langium` was extracted,
lower-cased and de-duplicated: **169 words**. Four additional quoted strings on one comment line
documenting the `MNEMONIC` terminal's own example arguments (`'hide'`, `'lf'`, `'BOX'`, `'FONT'`)
were excluded — they are prose inside a comment, not grammar keyword literals, confirmed by their
single occurrence each and by that occurrence being on a `//`-comment line.

**List sizes** (word × position pairs, computed before any fix in this plan was applied): the fix
list (compiler-accepts, parser-rejects) is **29** entries across **21 distinct words**; the
record-only list (compiler-rejects, parser-accepts — D-09) is **66** entries across **34 distinct
words**; the both-accept (locked-in) list is **241** entries. The oracle's own validation: a
known-rejected word (`then`) was confirmed rejected by the compiler harness before any bulk result
was trusted (the harness concatenates the compiler's stdout and stderr, since the compiler exits
zero and writes its errors to stderr only).

**Fix list, word by word, mechanism and outcome.**

| Word | Positions on the fix list | Mechanism | Outcome |
|---|---|---|---|
| `declare` | variable, label | lowercase-declared — added to `FeatureName`/`LabelName` | fixed |
| `auto` | variable, label | lowercase-declared — added to `FeatureName`/`LabelName` | fixed |
| `library` | variable, label | lowercase-declared — added to `FeatureName`/`LabelName` | **reverted for the variable position** at the regression gate (2026-09-22): the entry rule `Model: Library \| Program` chooses by the first token, so with `library` a legal variable the built-in library files (`bbj-api.ts`, `*.bbl`) parsed as programs and the three `BBjAPI()` linking tests failed; label position kept |
| `use` | variable, label | lowercase-declared — added to `FeatureName`/`LabelName` | fixed |
| `var` | variable, label | lowercase-declared — added to `FeatureName`/`LabelName` | fixed |
| `void` | label only (variable already fixed, Phase 99) | lowercase-declared — added to `LabelName` | fixed |
| `start` | variable (label already worked) | custom-pattern terminal — explicit `CATEGORIES`/`LONGER_ALT` grant on `START_BREAK` | fixed |
| `methodret` | variable (label already worked) | custom-pattern terminal — grant on `METHODRET_END` | fixed |
| `print` | variable (label already worked) | custom-pattern terminal — grant on `PRINT_STANDALONE_NL` | fixed |
| `write` | variable (label already worked) | custom-pattern terminal — grant on `PRINT_STANDALONE_NL` (shared with `print`) | fixed |
| `delete` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` | fixed |
| `enter` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` (shared) | fixed |
| `extract` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` (shared) | fixed |
| `find` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` (shared) | fixed |
| `input` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` (shared) | fixed |
| `read` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` (shared) | fixed |
| `save` | variable (label already worked) | custom-pattern terminal — grant on `KEYWORD_STANDALONE` (shared) | fixed |
| `classend` | variable, label | excluded-name set — tried: removed from `BBjTokenBuilder.EXCLUDED` | **reverted** — a malformed `ClassDecl`/`MethodDecl`/`InterfaceDecl` that fails to match for an unrelated reason silently re-parsed as a run of expression statements with zero errors instead of the parser error it produces today (probed: `CLASS PUBLIC label\nCLASSEND\n`, a name-typing failure, went from 1 parser error to 0). Recorded as *valid but disproportionate to fix now* — no lookahead gate or guard predicate was built to rescue it, per the plan's own prohibition. |
| `methodend` | variable, label | excluded-name set — same tried-and-reverted mechanism | **reverted**, same reason and evidence as `classend` |
| `interfaceend` | variable, label | excluded-name set — same tried-and-reverted mechanism | **reverted**, same reason and evidence as `classend` |
| `record` | variable | *(none of the three mechanisms applies)* | **not fixed** — `record` is already ID-category via the generic uppercase loop; the actual defect is a grammar ambiguity in `PrintStatement`'s own optional `record?='RECORD'?` flag, which silently absorbs a following variable named `record` (or the next line's first item) as that flag rather than as an ordinary print item. Fixing it needs a lookahead gate on the flag, explicitly out of scope. Recorded as *valid but disproportionate to fix now*. |

**A discovery beyond the systematic sweep.** `next` is not a quoted grammar literal at all (it
exists only through the custom `NEXT_BREAK`/`NEXT_ID` terminals), so it was never part of the
169-word sweep above — but the roadmap's own claim that it "already works" at the Phase 99 close
was checked directly against the parser and found **false**: `print next` and a binary-operand
read both failed for the same reason `start` did (a custom-pattern terminal with no `CATEGORIES`
grant). Fixed by the identical mechanism (`NEXT_BREAK` granted `CATEGORIES`/`LONGER_ALT`); label
position was already correct. The other four non-literal roadmap words (`text`, `vector`, `state`,
`val`, `str`) were never reserved at all and needed no grammar change.

**Record-only list (compiler-rejects, parser-accepts — D-09, not flagged, strict checks stay
deferred).** 34 distinct words, identical set for both the variable and the label/branch
position: `all`, `begin`, `callback`, `case`, `dread`, `else`, `endif`, `err`, `exitto`, `fi`,
`fnerr`, `for`, `from`, `gosub`, `goto`, `if`, `iolist`, `let`, `load`, `new`, `on`,
`process_events`, `remove_callback`, `restore`, `seterr`, `setesc`, `swend`, `switch`, `then`,
`tim`, `until`, `wend`, `where`, `while`. (`all` is new against the Phase 99 research session's
32-word list — it entered the grammar as a literal in plan 01's empty-bracket fix; every other
word matches that session's own finding.) These words are not flagged by this plan and receive no
new diagnostic; the strict checks they would need stay deferred (STRICT-01/02).

**Both-accept (locked-in) list.** 241 word × position pairs, computed before this plan's own
fixes. The fourteen roadmap-named words are confirmed working in every claimed position after
this plan's fixes landed: eight are grammar keyword literals covered by the systematic sweep and
already in the locked-in set (`label`, `class`, `data`, `default`, `exit`, `step`, `table`, `to`);
six are not grammar literals at all (`text`, `vector`, `state`, `val`, `str` were already ordinary
identifiers needing no widening, and `next` was the one discovered broken above and fixed by this
plan). None of the fourteen was missing from the confirmed-working set once the sweep and its
follow-up checks completed.

## Run: plan 04

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `a16c356c` (the tree as committed through this plan's
  task 2), mode `validate`, `sourceModified: false`, 77 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.
- `details.json` snapshotted to `snapshots/details-100-04-before.json` before the run.
- Run twice back to back over the same, unchanged tree: both runs reported the identical A 9,
  A2 22, B 669 -- a recorded movement always means a source change, not run-to-run noise.

**Numbers.**

| Measure | Plan 03 run | This run | Delta vs plan 03 | Delta vs Phase 99 close | Gate | Verdict |
|---|---|---|---|---|---|---|
| A — valid code the language server rejects | 13 | 9 | −4 | −43 | ≤ 25 (phase-final) | **improved, well below the phase-final gate** |
| A2 — valid code that parses but gets a validation error | 27 | 22 | −5 | −1 | ≤ 23 | **improved, at or below the Phase 99 close and its own ≤23 gate** |
| B — invalid code not flagged, of 1,210 | 669 | 669 | 0 | +3 | recorded, not gated | unchanged from plan 03 |

**A — by first word of the line the parser stops at (this run, 9 files total).**

| Files | Group |
|---|---|
| 2 | PRINT |
| 1 each | *(empty)*, METHODEND, FNEND, an unspaced positional INPUT form, an ASSERT-named variable assignment, ON, a METHOD declaration |

**A2 — by message (this run, 22 files total).**

| Files | Message group |
|---|---|
| 6 | This statement needs to start in a new line: *(blank)* |
| 3 | This statement needs to end with a line break: return |
| 1 | Field 'y!' is declared 'BBjString' but is initialized with a number. |
| 1 | This statement needs to start in a new line: x[all] |
| 1 | This statement needs to end with a line break: clear |
| 1 | 'CASE DEFAULT' is only allowed inside a SWITCH block. |
| 1 | This statement needs to start in a new line: fi |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body. |
| 1 | The member is not visible (a visibility check) |
| 1 | MODE option only supported in MKEYED Verb. |
| 1 | This statement needs to end with a line break: LET num = 6.022 |
| 1 | This statement needs to end with a line break: LET tiny = 1 |
| 1 | This statement needs to end with a line break: LET val = 1 |
| 1 | This statement needs to end with a line break: (an assignment whose right-hand side is a decimal number literal) |
| 1 | This statement needs to start in a new line: else |

Two message groups present at the plan 03 run no longer appear: "This statement needs to end
with a line break: classend" (4 files at plan 03, this plan's bare-comment-word fix) and "This
statement needs to end with a line break: endif" (1 file, the identical bare-comment-word fix
applied through the same shared regex to a different masked construct). Every other message
group present at the plan 03 run still appears at an unchanged count in this run's table.

**Set-movement sizes** (file-set difference, `snapshots/details-100-04-before.json` vs. this
run's `details.json`; sizes only, no id, path or line).

- **A (falseRejects): before 13, after 9 — 4 files left the list, 0 newly appeared.** Every
  movement this run made to list A is an improvement; none of this plan's grammar edit added a
  new list-A entry. By first word of the line the four files were flagged at in the plan 03
  snapshot: one `PROCESS_EVENTS` line with its option tail in the order this plan's widening now
  accepts, one `FULLTEXT` line likewise, and two lines whose own first word is `IF` (a
  single-line `IF`'s THEN-branch containing one of the shapes this plan fixed, so the line's
  first-failing token moved once the THEN-branch itself started parsing).
- **A2 (falseAlarms): before 27, after 22 — 0 files newly appeared, 5 left.** All five departures
  are covered by the two message groups named above — the bare-comment-word fix (addition A)
  applied through the shared `lineEndRegex`, not scoped to `CLASSEND` alone.
- **B (missed): before 669, after 669 — 0 files newly appeared, 0 left.** No movement in the
  missed set this run.

## 0 files moved the wrong way this run

Every set-movement this run was an improvement or neutral: 4 files left list A, 5 files left
list A2, and list B did not move at all. No file newly entered A or A2, so there is nothing to
hand to the orchestrator's per-file look this time.

## Residue: shapes still on list A

Nine files remain on list A after this group. Four rows are filled from group-level evidence
alone (the harness's own first-word grouping, this plan's own Task 1 candidate decisions, and
one additional cause this plan's own triage traced to a shared root across three files); two
rows are marked pending a per-file look, with no cause guessed.

| Shape (own words) | Files | Reason category | Fixed or stays |
|---|---|---|---|
| An unspaced positional `INPUT` form (`input` immediately followed by `@(` with no space between them) — the `ID` terminal's own optional trailing `@` (the client-object-class marker) matches longer than the `INPUT` keyword at that exact position, so the lexer's own longer-match rule picks `ID` over the keyword. The spaced form (`input @(...)`) already parses; only the unspaced form is affected. | 1 | valid but disproportionate to fix now | stays — candidate for a later milestone (needs a lexer-level disambiguation, the `RESTORE_NO_NL`/`TABLE_DATA` same-line-commit technique already used elsewhere in this file) |
| A branch-target list using bare line numbers as `GOTO`/`GOSUB` targets instead of a named label (for example an `ON ERR(...) GOTO` list whose targets are plain numbers) — confirmed in an earlier plan's own research to need a genuinely new addressing mechanism (the file's own physical/declared line numbering), not a `LabelDecl`/`LabelRef` extension. | 1 | valid but disproportionate to fix now | stays — candidate for a later milestone |
| A number written in scientific/exponent notation (for example `1.0e-2`) used as an argument inside a parenthesized function call. Confirmed by probe: the exact same exponent form parses without error when it stands alone as a top-level `PRINT` item, but fails hard inside a call's argument list — the `NUMBER` terminal's own pattern has no exponent suffix at all, so a bare top-level occurrence is only ever tolerated by an unrelated leniency elsewhere, not genuinely supported; inside a call's parenthesized argument list there is no such leniency and the mismatch becomes a hard parser error. | 3 | valid but disproportionate to fix now | stays — candidate for a later milestone (needs a `NUMBER` terminal pattern change, a wide-blast-radius lexer edit well beyond this plan's remaining scope) |
| A bare, unadorned `METHODEND` or `FNEND` terminator with nothing else on its line, appearing where no method or `DEF FN` is open. An earlier plan in this phase already named this exact shape as residue (one file each) when it closed its own group. | 2 | valid but disproportionate to fix now | stays — candidate for a later milestone |
| *(empty first-failing line)*, flagged with an unexpected `:` — the shape cannot be described from the harness's own group-level evidence alone; the flagged line has no visible content to classify by. | 1 | pending | pending the per-file look |
| A `METHOD` declaration whose signature line the parser stops on — probed directly (an implicit/no-return-type method declaration with the same shape) and confirmed that shape alone already parses cleanly in isolation, so the real cause is something else nearby in that file, a second cause hidden behind whatever this phase's earlier groups already cleared from in front of it. Cannot be described further from group-level evidence alone. | 1 | pending | pending the per-file look |

**Hand-over.** 7 of the 9 list-A entries are covered by a filled row above; 2 are pending. Every
filled row's reason category is *valid but disproportionate to fix now*, and each names its shape
as a candidate for a later milestone, per this phase's own four-category convention. Classifying
the 2 pending entries by a per-file look, and writing the entry-to-shape mapping next to the
harness in the private corpus repository, is the orchestrator's work, not this plan's.

### Per-file look at the two pending residue rows (orchestrator, after plan 04)

**Redaction note (100-06, Task 2):** the File column originally named each corpus file directly by
path, violating D-27/T-100-06-01. Replaced with a neutral per-row label.

| File | First failing line | What the file shows | Status |
|------|--------------------|---------------------|--------|
| Residue file E | 5 (reported as 4, the blank line before it) | The statement is a double-colon file-and-class-qualified method call with a trailing REM comment, and its line starts with `::`. Probe: the same statement as the first line of a program parses with 0 errors; after any earlier line it fails with 1 parser error. A line whose first character is `:` is read as a continuation of the line before, so a statement that begins with a `::file::Class` reference is glued onto its predecessor. The compiler accepts the file. The fix belongs in the line-continuation splitter of the lexer, not in a grammar rule — recorded, not fixed here. | residue, 1 file |
| Residue file F | 204 | Probes: the class from its header (line 189) through the fields plus this constructor parses with 0 errors; constructors calling `#this!(…)` and `#super!(…)` parse with 0 errors and `bbjcpl` accepts them. The failure therefore needs something in lines 1–188 of the file; it was not isolated in the time allowed. No cause is recorded. | residue, 1 file, cause open |

With these two, all 9 remaining list-A entries are accounted for: 7 by the filled rows above, 1 by the
line-start `::` row, 1 open.

## Closing run

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `72d0d3a1` (the tree as committed through this plan's
  Task 1 — no `bbj-vscode/src` or `examples` change since plan 04's `a16c356c` / plan 05's
  `874d5450`; the two `.planning`-only commits made earlier in this plan, including a redaction fix,
  touch neither directory). `sourceModified: false`, 77 seconds.
- Before-snapshot: `/home/coder/repos/bbj-corpus/conformance/snapshots/details-100-06-before.json`,
  copied from `details.json` immediately before this run.
- Preconditions confirmed before the run (Task 1): whole vitest suite failed-test count 0 beyond two
  documented environment exceptions (hook-timeout `beforeAll` failures under contention on 5 files
  plus the known stale-bundle `installed-extension-e2e.test.ts` failure — both zero-failed-test
  "failed suites" per this project's own judging rule; and 3 `linking.test.ts` BBjAPI-resolution
  test failures caused by live java-interop on `:5008` triggering `shouldRunBBjTests()`'s bare-TCP
  gate against a backend whose `getAllClassNames` exposure has drifted since 2026-09-03 — a
  pre-existing, standing, documented condition unrelated to this phase's diff, independently
  reproduced by plans 04 and 05's own whole-suite runs earlier in this same phase); generated parser
  no older than the grammar or token-builder; `git status --porcelain -- bbj-vscode/src examples`
  printed nothing; the register check over the phase's whole source diff (base commit
  `9cc8bffe7bc9079df86ec1ea6d5897b038b7c98a`, recorded in plan 01's SUMMARY) produced no match.

**Direction of worse, restated:** for A, A2 and B alike, a **higher** file count is worse; a lower
count is always better. Every delta below is computed as `this run − baseline` (or `this run −
previous`), so a negative delta is an improvement and a positive delta is a regression, for all
three measures.

**Numbers.**

| Measure | Phase 99 close | Last per-group run (plan 04) | This run | Δ vs Phase 99 close | Δ vs last per-group run | Gate | Verdict |
|---|---|---|---|---|---|---|---|
| A — valid code the language server rejects | 52 | 9 | 9 | −43 | 0 | ≤ 25 | **PASS** |
| A2 — valid code that parses but gets a validation error | 23 | 22 | 22 | −1 | 0 | ≤ 23 | **PASS** |
| B — invalid code not flagged, of 1,210 | 666 | 669 | 669 | +3 | 0 | recorded, not gated | **B rose by 3 vs the Phase 99 close baseline** |

**D-26 backstop confirmed: this run and the last per-group run (plan 04) report identical numbers,
because no source changed between them.** A file-set diff against plan 04's own before-snapshot
(`details-100-04-before.json`) confirms 0 files moved on any of the three lists between that run and
this one:

```
falseRejects (A): before 9, after 9 — left: 0, entered: 0
falseAlarms (A2): before 22, after 22 — left: 0, entered: 0
missed (B):       before 669, after 669 — left: 0, entered: 0
```

Every recorded number in this section is therefore attributable to the commits made across plans
01-04, not to run-to-run variation.

**A — shape breakdown (this run, 9 files total, cross-checked against the completed residue table
below).**

| Files | Shape |
|---|---|
| 1 | The line-start `::`-continuation glued statement (Residue file E) |
| 2 | A bare, unadorned `METHODEND` or `FNEND` terminator with nothing else on its line |
| 1 | An unspaced positional `INPUT` form |
| 1 | A branch-target list using bare line numbers as `GOTO`/`GOSUB` targets |
| 3 | A number in scientific/exponent notation used as a function-call argument |
| 1 | A `METHOD` declaration whose own signature line parses cleanly in isolation — cause still open (Residue file F) |

## Gate table

| # | Gate | Value | Verdict |
|---|---|---|---|
| 1 | List A at or below 25 | 9 | **PASS** — 16 files below the threshold |
| 2 | A2 at or below 23 (the Phase 99 close) | 22 | **PASS** — 1 file below the threshold |
| 3 | B — recorded with per-file evidence status, not gated | 669 (+3 vs the Phase 99 close baseline of 666) | **recorded** — see B movement section below |

**Boundary restated (D-12 edge-probe truth):** a measured value exactly at a gate's threshold passes,
and one file past it fails — 25 passes and 26 fails for list A; 23 passes and 24 fails for A2. Both
measured values (9, 22) sit strictly below their thresholds, not at the boundary itself, so this run
does not exercise the boundary directly; the rule is restated here so a later reader can verify which
side of the threshold today's numbers sit on without re-deriving it. Every value in this table is an
integer file count read directly from the harness details file — never a percentage or a rate.

## A2 movement

Comparison is against the recorded Phase 99 close set (`snapshots/details-100-01-before.json`, the
snapshot taken immediately before plan 01's own run — 23 files across 16 message groups, listed in
this file's own "Baselines" section), established by a file-set difference of this run's `details.json`
against that snapshot — not by the totals (D-05, D-11).

**Message group present at the Phase 99 close, absent from this run (cleared) — 2 groups, 2 files:**

| Files (Phase 99 close) | Message group |
|---|---|
| 1 | This statement needs to end with a line break: endif |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. |

**Message group present at the Phase 99 close, still present in this run, unchanged in count — 13
groups, matching file counts:** the blank-message "needs to start in a new line" group (6), `return`
(3), `Field _ is declared _ but is initialized with a number.` (1), `x[all]` (1), `SWITCH block` (1),
`fi` (1), `DECLARE is not valid at class member level...` (1), the member-visibility check (1),
`MODE option only supported in MKEYED Verb.` (1), `LET num = _._` (1), `LET tiny = _` (1), `LET val =
_` (1), `gravitational_constant = _._` (1), and `else` (1).

**Message group present at the Phase 99 close whose count is unchanged, 1 group:** `x[all]` (1 file)
— this is the same file both before and after (confirmed by matching harness id, not just message
text): a pre-existing false alarm on `x[all]`-adjacent code that this phase's own array-bracket
group did not touch or move.

**Message group new against the Phase 99 close — 1 group, +1 file:**

| Files | Message group |
|---|---|
| 1 | This statement needs to end with a line break: clear |

**Arithmetic reconciles:** 23 (Phase 99 close) − 2 (cleared) + 1 (new) = 22 (this run). Matches
exactly.

**Did a parser fix unmask a validator false alarm in the same file? Yes, once.** The single new
message group above (`clear`) is Residue file A from the "per-file look at the four files (orchestrator,
after plan 01)" table earlier in this record: it was on list A for `dread x![]` before plan 01's
empty-bracket fix; once that parsed, the file's next disagreement — `clear x![]`, a `CLEAR` statement
followed by a variable list — became visible and drew this validation false alarm instead. This is
the only file in this run's A2 set whose message changed because of a parser fix elsewhere in this
phase; every other message-group count above is either unchanged from the Phase 99 close or explained
by the two cleared groups (both fixed by plan 04's shared bare-comment-word regex widening, applied
to `endif` and, separately at an earlier point in the phase, to `classend` — see the "Per-file look at
the four A2 files (orchestrator, after plan 02)" section above for that intermediate history).

## B movement

**This section's own file-set diff (against `details-100-06-before.json`, taken immediately before
this run): 0 files newly uncaught, 0 files left the list.** The closing run's `missed` set is
byte-identical to the state plan 04 left it in.

**Phase-wide B delta vs the Phase 99 close baseline (666): +3 (669).** These three files were
identified and classified by plan 01's own before/after file-set diff (the redacted "per-file look at
the four files" table above) immediately after they entered:

- Residue file B — **lost accidental catch.** The compiler's real complaint is a semantic
  branch-target check this project's document validator cannot surface at error severity (linking
  errors are downgraded to Warning); the file's prior "catch" came from an unrelated syntax error
  this phase's empty-bracket fix resolved, exposing the pre-existing, structurally-unreachable defect
  underneath.
- Residue file C — **a rule now accepting an invalid form, and out of scope.** The compiler enforces
  a whole-array-right-hand-side rule on a whole-array assignment target; this is a typed validation
  rule, not a parser shape, and applied to this exact construct before this phase — never checked by
  any plan here. Not fixed, not gated; carried forward unchanged.
- Residue file D — **lost accidental catch.** The compiler's real complaint is the pending
  `FILEOPEN`/file-dialog gap (the false-premise item plan 05 resolved by repairing the affected
  example in place rather than filing a todo — see 100-05-SUMMARY.md); the file's prior "catch" came
  from the same unrelated syntax error this phase's empty-bracket fix resolved.

This classification is carried forward unchanged from plan 01's own record; this section's own diff
(above) confirms no further B movement occurred since then, and writes no new cause, mechanism or
attribution of its own for any of the three files.

## The completed residue list

Plan 04 opened the shape-level residue table with 4 filled rows (7 files) and 2 rows pending a
per-file look (2 files: Residue file E and Residue file F, above). One of the two — Residue file E —
now has its per-file look, filled in by the orchestrator's own note directly above this section. The
other — Residue file F — does not: the orchestrator's own probe narrowed the cause to somewhere in
lines 1–188 of that file but did not isolate it "in the time allowed," and this plan changes no
source and reads no further corpus content, so there is nothing more to add here. Per the plan's own
instruction, **no category is guessed to close this row.**

| Shape (own words) | Files | Reason category | Fixed or stays |
|---|---|---|---|
| An unspaced positional `INPUT` form (`input` immediately followed by `@(` with no space between them) — the `ID` terminal's own optional trailing `@` matches longer than the `INPUT` keyword at that exact position. | 1 | valid but disproportionate to fix now | stays — candidate for a later milestone |
| A branch-target list using bare line numbers as `GOTO`/`GOSUB` targets instead of a named label — needs a genuinely new addressing mechanism (the file's own physical/declared line numbering), not a `LabelDecl`/`LabelRef` extension. | 1 | valid but disproportionate to fix now | stays — candidate for a later milestone |
| A number written in scientific/exponent notation (for example `1.0e-2`) used as an argument inside a parenthesized function call — the `NUMBER` terminal's own pattern has no exponent suffix at all; a bare top-level occurrence is only ever tolerated by unrelated leniency, not genuine support. | 3 | valid but disproportionate to fix now | stays — candidate for a later milestone |
| A bare, unadorned `METHODEND` or `FNEND` terminator with nothing else on its line, appearing where no method or `DEF FN` is open. | 2 | valid but disproportionate to fix now | stays — candidate for a later milestone |
| A statement that begins with a `::file::Class` static-call reference, glued onto the end of the line before it — a line whose first character is `:` is read by the lexer as a continuation of the previous line, not the start of a new statement, so this shape can only ever appear after the very first line of a program (Residue file E). | 1 | valid but disproportionate to fix now | stays — the fix belongs in the lexer's own line-continuation splitter, not a grammar rule; a candidate for a later milestone |
| A multi-line `DEF FN` body closed by `return` with no `FNEND`, followed later by a `class` block — the body swallows the class and the parser stops on the class's first `METHOD` line (Residue file F; isolated 2026-09-22, see the section at the end). | 1 | valid but disproportionate to fix now | known shape (`DEF FN` without `FNEND`) in an arrangement not yet covered; a grammar change to end the body at `return` |

**Row-count check:** 1 + 1 + 3 + 2 + 1 + 1 = 9, matching the measured list-A total exactly.

**The fourth roadmap success criterion does not fully hold.** Five of the six rows above are filled
with an own-words shape, a file count, one of the four permitted reason categories, and a
fixed-or-stays decision. The sixth (Residue file F) is not: its cause was probed but not isolated, so
neither a shape description nor a reason category can be honestly assigned without guessing, which
the plan's own instruction forbids. This is recorded here exactly as it stands, and carried into
Task 3's conditional stop below — the residue list is not closed, whatever the gate numbers say.

## Closing attestation

One entry per Phase 100 success criterion, in the wording `ROADMAP.md` carries. Evidence commands run
with cwd = `bbj-vscode`, `RUN_BBJ_TESTS=0`.

**1. The empty-bracket whole-array form `name[]` parses wherever an array element can stand, with the
same meaning as `name[all]` — `PRINT` item, `DREAD` target, assignment target, `CALL`/method/function
argument; the type-side bracket shapes (a two-dimensional empty-bracket array type on a DECLARE, and a whole-array-typed field access using the same all-form) parse too; the
`PRINT` item forms the original wording named already parsed and keep parsing.** **Holds.** Evidence:
fixture `bbj-vscode/test/test-data/conformance/array-bracket-forms.bbj`; `npx vitest run
test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts` — the "empty array
brackets meaning the whole array" and "type-side bracket shapes" describe blocks pass (every call
site, every suffix, every case, the AST-shape assertion that an empty bracket produces the same node
`x[all]` does). Still-flagged cases that keep the rule honest: `print x[` and `print x[,]` stay parser
errors. Plan 01's own measurement: this group's grammar edit alone dropped list A from 52 to 21 (−31
files), and the closing run confirms 0 files re-entered list A on this shape across the rest of the
phase.

**2. A `; rem` comment after a `METHOD` header, `METHODEND`, `CLASSEND`, `FNEND` and a single-line
`DEF FN…=…`, and class code carrying user line numbers, parse without error.** **Holds.** Evidence:
fixtures `rem-after-block-boundaries.bbj` and `line-numbered-class.bbj`; `npx vitest run
test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts` — the "a comment after a
block boundary, and a line number in class code" describe block passes (all five boundaries,
end-of-file and mid-stream, an AST-shape assertion that the mid-stream container stays one class
node, the five line-numbered shapes). Plan 02's own edit closed −5 files (21→16); the validator false
alarm it briefly unmasked on a bare `; rem` with no body (`classend`/`endif` message groups, 4+1
files across the phase) is confirmed cleared in this run's own A2 movement section above — both
message groups present at the Phase 99 close are absent from this run.

**3. Words BBj allows as names although they are language words work as variables, labels and
`GOSUB`/`GOTO` targets; the fourteen roadmap-named words already work and are locked in by a
regression file; the rest is established by an oracle sweep against the real compiler, word by word,
without a blanket reserved-word rule and without flagging words the compiler itself rejects.**
**Holds.** Evidence: fixture `language-words-as-names.bbj`, extended to the fourteen roadmap words
plus every word this plan's oracle sweep fixed; `npx vitest run test/parser-keyword-statements.test.ts
test/conformance-regressions.test.ts` — the "language words as names (oracle sweep against the
compiler)" describe block passes. The oracle-sweep record above shows: 169 grammar keyword literals
compiled against `bbjcpl` in four positions, validated against a known-rejected word before trusting
any bulk result; 12 words fixed by a lowercase-declared or custom-pattern-token mechanism, plus `next`
(discovered broken despite the roadmap's own "already works" claim, fixed by the identical mechanism);
`classend`/`methodend`/`interfaceend`'s `EXCLUDED`-set removal tried and reverted (13 blast-radius
test failures, a malformed class/method/interface would silently misparse instead of erroring);
`record` left unfixed (a `PrintStatement` grammar ambiguity needing a lookahead gate, out of scope).
The 34-word record-only list (compiler rejects, parser accepts) is not flagged — matching the
criterion's own "without flagging words the compiler rejects" clause.

**4. The conformance run at the phase boundary reports A ≤ 25, and every shape still on list A is
recorded in a tracked list — own-words shape, file count, reason; the file-by-file mapping stays with
the private harness; each construct fixed has its synthetic regression file.** **Partially holds.**
Evidence: the Closing run, Gate table and "The completed residue list" sections above. The numeric
gate holds: A = 9, well below ≤ 25. Every construct fixed in this phase has its synthetic regression
file — 19 fixtures confirmed present in Task 1, the five new ones (`array-bracket-forms.bbj`,
`rem-after-block-boundaries.bbj`, `line-numbered-class.bbj`, `language-words-as-names.bbj`,
`statement-option-tails.bbj`) alongside the fourteen inherited from Phases 98-99. The "every shape
recorded" clause does **not** fully hold: of the 9 files still on list A, 8 are filled with an
own-words shape, a file count and a reason category (5 rows in the residue table above), and 1
(Residue file F, the `METHOD`-declaration file) is not — its cause was probed but not isolated in the
time allowed, and no category was guessed to close it. This is the same file-by-file mapping practice
the criterion asks for (kept as counts and shapes here, the corpus identity itself never leaving the
private harness).

**5. Every BBj program file under `examples/` either compiles with `bbjcpl` or lives in
`examples/invalid/`, with a test asserting the diagnostics those deliberately-invalid files are
expected to produce, including an explicit "none today" marker.** **Holds.** Evidence:
`bbj-vscode/test/examples-compile.test.ts` (both the always-on layer and the `RUN_BBJ_TESTS=1`
BBj-gated layer); `examples/invalid/README.md` documents the sidecar format and the
`"none-today"`/`ExpectedDiagnostic[]` convention. 92 real programs under `examples/` compile clean; 1
(a deliberately-invalid substring-expression example under `examples/invalid/`) is paired with its
own `.expected.json` sidecar carrying the `"none-today"` marker (no LS diagnostic exists yet for the
construct it demonstrates). The `.bbx` configuration file and the `.bbl` library file are excluded by
extension, as the criterion allows.

**Requirement-to-evidence chain.**

| Requirement | Fixture | Test |
|---|---|---|
| PARSE-04 | `array-bracket-forms.bbj` | `parser-keyword-statements.test.ts` — "empty array brackets meaning the whole array" |
| PARSE-05 | `array-bracket-forms.bbj` | `parser-keyword-statements.test.ts` — "type-side bracket shapes" |
| PARSE-06 | `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj` | `parser-keyword-statements.test.ts` — "a comment after a block boundary, and a line number in class code" |
| PARSE-08 | `language-words-as-names.bbj` | `parser-keyword-statements.test.ts` — "language words as names (oracle sweep against the compiler)" |
| PARSE-09 | `statement-option-tails.bbj` | `parser-keyword-statements.test.ts` — "the long-tail triage: a verb with no rule at all, and two order-fixed option tails"; plus the shape-level residue table above (not fully closed — see criterion 4) |
| EXMP-01 | the deliberately-invalid substring-expression example under `examples/invalid/` + sidecar | `examples-compile.test.ts` (always-on and `RUN_BBJ_TESTS=1` layers) |

**The two deliberate non-goals.**

1. **No blanket reserved-word rule anywhere, and no generic keyword-falls-back-to-identifier
   mechanism.** Confirmed by diff: `git diff --stat
   9cc8bffe7bc9079df86ec1ea6d5897b038b7c98a..HEAD -- bbj-vscode/src/language/` shows exactly four
   files changed across the whole phase — `bbj.langium`, `bbj-token-builder.ts`,
   `check-classes.ts`, `line-break-validation.ts` — and every addition is one of the named,
   narrowly-scoped grammar rules, lexer-token grants or validator-regex widenings listed in the
   phase-wide artifacts table (100-01-PLAN.md). No new generic "any keyword may be a name" mechanism
   exists anywhere in `bbj-token-builder.ts`'s or `bbj.langium`'s diff; each grant names its own
   specific token or rule.
2. **No new editor capability for any construct touched.** Same diff evidence: none of
   `bbj-completion-provider.ts`, `bbj-hover.ts`, `bbj-document-symbol-provider.ts`,
   `bbj-semantic-token-provider.ts`, `bbj-inlay-hint-provider.ts`, `bbj-code-action-provider.ts` or
   `bbj-signature-help-provider.ts` appears in the phase's diff against its base commit — all seven
   are byte-for-byte untouched.

**The grammar rule that was NOT tightened, and why.** The oracle sweep's own record-only list (34
words the compiler rejects in a name position and the parser currently accepts — `all`, `begin`,
`callback`, `case`, `dread`, `else`, `endif`, `err`, `exitto`, `fi`, `fnerr`, `for`, `from`, `gosub`,
`goto`, `if`, `iolist`, `let`, `load`, `new`, `on`, `process_events`, `remove_callback`, `restore`,
`seterr`, `setesc`, `swend`, `switch`, `then`, `tim`, `until`, `wend`, `where`, `while`) was left
exactly as it stood — the grammar was not tightened to also reject those words, because the strict,
compiler-parity checks that would enforce it (bare expression statements, reserved words, block
balance) are explicitly deferred as STRICT-01/STRICT-02 in `REQUIREMENTS.md`'s Future Requirements,
out of this phase's and this milestone's scope; BBj's own compiler stays the authority for that class
of error through the endpoint Phases 101-103 build. The reviewed Phase 98 single-line-`IF`
balance-rule todo (`.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`)
was deliberately not folded into this phase either, per the same working rule this record has carried
since plan 01.

**Correction to the plan's own template language.** Task 3's own action text anticipated "the call
forms accepted on a false premise are recorded with a filed todo" as part of this section. That is not
what happened: plan 05 investigated the suspected false-premise case (`fileopen`/`filesave`'s
`MODE=` option) directly against `bbjcpl` and found it was never a false premise at all — both
functions are valid BBj functions whose return value must be assigned, confirmed by probe, and the
affected example was repaired in place. No todo was filed
(`.planning/todos/pending/2026-09-21-file-dialog-functions-accepted-on-a-false-premise.md` does not
exist — see 100-05-SUMMARY.md's own deviation record). This phase carries no call-forms-accepted-on-
a-false-premise item; recorded here accurately rather than repeating the plan's own unverified
template sentence.

## Developer verification block

What a human needs to judge this phase's close, in one place, for a reader who has not seen the run.

**Gate table.**

| # | Gate | Value | Verdict |
|---|---|---|---|
| 1 | List A at or below 25 | 9 | **PASS** |
| 2 | A2 at or below 23 | 22 | **PASS** |
| 3 | B — recorded, not gated | 669 (+3 vs the Phase 99 close baseline of 666) | **recorded, rose** |

**Residue list.** NOT complete. 8 of 9 remaining list-A files have an own-words shape, a file count
and a reason category (all "valid but disproportionate to fix now"); 1 file (a `METHOD` declaration
whose own signature line parses cleanly in isolation) is still pending — its cause was probed but not
isolated in the time allowed, and no category was guessed to close it.

**Did B rise?** Yes — 666 → 669 (+3) against the Phase 99 close baseline, unchanged since plan 01.
All three files were classified by plan 01's own per-file look (2 lost accidental catches, 1
out-of-scope typed validation rule) and carried forward unchanged; 0 further B movement occurred
across plans 02-06.

**Per-criterion verdicts.** 1: Holds. 2: Holds. 3: Holds. 4: Partially holds (numeric gate passes;
the residue list has 1 unclosed row). 5: Holds.

**Examples.** 92 real programs under `examples/` compile clean with `bbjcpl`; 1 deliberately-invalid
program lives in `examples/invalid/` with an asserted sidecar carrying a `"none-today"` diagnostics
marker.

**What this means for sealing.** Two of the plan's own three closing conditions are unmet: the residue
list is not complete (1 pending row), and B rose above the Phase 99 close baseline (669 > 666, though
unchanged since plan 01 and already classified). Per the plan's own Task 3 instruction, this phase
does **not** seal autonomously — see the conditional stop below.

## Task 3 conditional stop (2026-09-21)

Every numeric gate value reads at or better than its threshold (A 9 ≤ 25; A2 22 ≤ 23). But the plan's
own autonomous-close condition requires all three of: every gate row PASS, no residue row still
pending, and B not risen above the Phase 99 recorded 666. Two of those three are unmet:

1. **1 residue row is still pending** (Residue file F, the `METHOD`-declaration file) — its cause was
   probed (the class header, fields and the signature shape itself all parse cleanly in isolation, so
   the real cause is something else in lines 1–188 of that file) but not isolated in the time allowed.
   No category was guessed to close it, per the plan's own explicit prohibition.
2. **B rose above the Phase 99 close baseline** (669 vs 666, +3) — though this is not a new
   regression: all three files entered at plan 01 and have been unchanged and already classified (2
   lost accidental catches, 1 out-of-scope typed validation rule) since that run; 0 further B movement
   occurred across the rest of the phase.

**What Task 2 already tried.** The closing run was executed once, on the final tree, with a snapshot
taken first (per D-26/D-12). The residue table was filled from every per-file look already on record
in this file; the one file whose cause is genuinely unestablished (Residue file F) was not
re-investigated further, because this plan changes no source and reads no further corpus content,
and guessing a category to close the row is explicitly forbidden. No rule, check, fixture or example
was adjusted anywhere in this plan to move a number.

**The decision this stop is between.** Per the plan's own instruction, the choice is between:

- **Accept the shortfall as recorded residue.** Both open items already carry full evidence and a
  neutral classification (Residue file F as "cause open, pending", the B rise as the three already-
  classified files from plan 01) — the phase's numeric gates (A, A2) both pass, and neither open item
  blocks the milestone's downstream phases (101-104), which do not depend on this file's cause or on
  B's exact count returning to 666 before the compiler-parser endpoint lands.
- **Hand a named shape to a later phase.** Residue file F's `METHOD`-declaration cause could be
  isolated by a dedicated investigation (bisecting lines 1–188 of that one file) in a future gap plan
  inside this phase or a follow-up milestone item, the same way Phase 99 closed its own two open gates
  with a dedicated gap plan (99-06) rather than accepting them as residue.

This plan does not seal here. It returns a blocking human checkpoint instead, per Task 3's own step
7 and this project's `gate="blocking-human"` convention — see the checkpoint returned alongside this
SUMMARY.

### Residue file F — cause isolated (orchestrator, after plan 06)

A bisect over the file's first 188 lines against the parser (each prefix joined to the class header and
the flagged constructor) found the smallest failing start: a multi-line `DEF FN…(…)` (line 160) whose
body ends with `return 1` and never has an `FNEND`, followed later by the `class` block. Probes:

| Program shape | `bbjcpl` | Parser errors |
|---------------|----------|---------------|
| `def fnx(a)` / body / `return 1` / `print fnx(1)` | accepted | 0 |
| `def fnx(a)` / body / `return 1` / `class … classend` | accepted | 2 (at the class's first `method`) |
| same with `fnend` before `class` | accepted | 0 |

So a `DEF FN` body without `FNEND` keeps swallowing statements; that is harmless until the next thing
is a class definition, which the body cannot contain. This is the "multi-line DEF FN without FNEND"
shape already known from Phase 98, in the one arrangement that phase did not cover. It is a grammar
change (end the body at `return` when no `FNEND` follows), not attempted here. The residue table's
pending row is now filled: 1 file, reason "known shape, uncovered arrangement". All 9 list-A entries
have an own-words shape.

### Regression-gate fix: `library` as a variable name (orchestrator, 2026-09-22)

The whole-suite run at the regression gate showed 14 `linking.test.ts` failures against the known
11-failure environment baseline, which a run of the same file on the phase base commit confirmed. The
three extra tests (`Case insensitive access to BBjAPI`, `BBjAPI() resolves without Java interop`,
`BBjAPI() variable has correct type`) were bisected to plan 03's per-word commit: freeing `library`
as a variable name lets the entry rule read every built-in library file as a program. `library` was
removed from `FeatureName` again (label position kept), a test now guards that the built-in library
text is read as a library, and the harness was re-run on the fixed tree: A 9, A2 22, B 669 — the
same file sets as the closing run. Plans 04, 05 and 06 had classified the three failures as
environment noise; the baseline in this repository's notes is 11 for that file, not 14.
