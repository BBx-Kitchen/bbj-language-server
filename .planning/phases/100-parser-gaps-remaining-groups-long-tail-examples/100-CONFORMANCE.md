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
| 1 | This statement needs to end with a line break: gravitational_constant = 6.674 |
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

| File | Move | What the file shows |
|------|------|---------------------|
| `samples/dup-75c6bfa9.bbj` | A → A2 | Was on list A for `dread x![]` (line 5). That now parses; the next disagreement in the same file is `clear x![]` (line 14), reported as "This statement needs to end with a line break: clear". `bbjcpl` accepts `clear x![]`. `CLEAR` followed by a variable list is a long-tail shape for plan 04, not a fault of the bracket rule. |
| `samples/asprsa-9a447b16.bbj` | caught → B | Compiler's complaint is an undefined label (line 895). The only thing this tree ever flagged was the parse error on `A![]=SN!.split("R")` (line 2527), which the compiler accepts. The earlier "catch" was accidental. |
| `bbjllm-dataset/row1733-0-79df14d1.bbj` | caught → B | Compiler rejects `LET parts$[] = SPLIT(dateStr$, "/")` (line 4). Probes: `parts$[] = "a"` and `parts$[all] = "a"` are both rejected, `parts$[] = q$[]` is accepted. The compiler requires a whole-array right-hand side for a whole-array target; that rule applied to `[all]` before this phase and was never checked here. It is a typed validation rule, not a parser shape; out of scope for the parser plans. |
| `bbjllm-dataset/row1772-0-b1c55c9f.bbj` | caught → B | Compiler rejects `FILEOPEN(...)` on line 1 (see the pending file-dialog todo handled in plan 05). Previously flagged only through the `[]` parse error on line 6. Accidental catch. |

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
| 1 | This statement needs to end with a line break: gravitational_constant = 6.674 |
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
5 files and gained none; B is the same set; A2 gained exactly `samples/16526-175f36d1.bbj` (line 20),
`samples/17065-6c66c142.bbj` (line 19), `samples/28950-024d2643.bbj` (line 33) and
`samples/thismethod-36d8a603.bbj` (line 36). All four were on list A before, all four flagged lines are
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
statement whose Java package path ends in the word `print` (`use javax.print`) — fixed by the
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
| 1 | This statement needs to end with a line break: gravitational_constant = 6.674 |
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
| `library` | variable, label | lowercase-declared — added to `FeatureName`/`LabelName` | fixed |
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
