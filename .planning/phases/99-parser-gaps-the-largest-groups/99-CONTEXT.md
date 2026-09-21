# Phase 99: Parser Gaps — the Largest Groups - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The four largest groups of compiler-accepted programs the parser rejects today start to parse:

1. `FIELD` used as a verb (`field rec$,<name>=<value>`) — 45 files.
2. `LEN=` written as a channel option after `READ RECORD` and its sibling verbs — 38 files.
   `READ RECORD(` itself already parses; every file of the group stops at `LEN=` (see D-01).
3. The word `label` used as a name — about 25 files: as a label declaration alone on a line or
   in front of a statement, as a `GOTO`/`GOSUB` target, and as a variable (see D-04).
4. The `IOLIST` statement — 3 files, all behind a label.

Gate: the conformance run reports **A ≤ 80** (from 167 at the Phase 98 close), no list-A file
whose first failing line starts with `FIELD`, `READ`, `IOLIST` or the word `label`, A2 at or
below its Phase 98 number (27), and one synthetic regression file per group (CONF-01).

Requirements: PARSE-01, PARSE-02, PARSE-03, PARSE-07 (wording of PARSE-02 and PARSE-03 amended
by this context commit, D-06).

Not in this phase: every other language word as a name (PARSE-08, Phase 100), PRINT/INPUT item
forms and `DREAD` into arrays (Phase 100), `;rem` after block closers (Phase 100), the
single-line `IF` balance-rule residue (pending todo, not folded), any new editor feature or new
validation for `FIELD`/`IOLIST`, anything in `bbj-ls` or the IntelliJ plugin.

</domain>

<decisions>
## Implementation Decisions

### The `READ RECORD` group is a `LEN=` defect
- **D-01:** Scout finding, checked against the recorded failing lines of all 38 files: the parser
  accepts `READ RECORD(` and stops at `LEN=` inside the channel options with "Expecting token of
  type '='". The grammar has a fused keyword literal `'LEN='` (used only by the INPUT verifier
  form `var:(…,LEN=a,b)`); the lexer emits it wherever those four characters appear, and the
  `Option` rule (`key=ValidName '=' value=…`) then cannot match. The values seen after `LEN=` are
  a number and a plain numeric variable.
- **D-02:** **Root fix: unfuse `LEN=`.** `LEN` becomes an ordinary word followed by `=`. This
  must fix the channel-option position for `READ`, `EXTRACT`, `FIND`, `INPUT`, `PRINT` and
  `WRITE` with `RECORD` (spaced and fused spellings such as `READRECORD`), keep the INPUT
  verifier's `LEN=a,b` form parsing, and make `LEN` usable as a variable name (`LET LEN=5`,
  `len=…` in a multi-assignment). This takes the "variable named `LEN`" item that Phase 98
  handed to Phase 100 (98 D-18) into this phase. `'IOL='` stays fused — no corpus file needs it
  changed; do not touch it unless the `IOLIST` work forces it.
  — **Reversibility:** costly — removing a token changes generated lexer/AST artifacts that
  Phase 100's item-form work builds on.
- **D-03:** The A2 side effect is **recorded, not gated**. The five Phase 98 residue files with
  `LEN`-related line-break messages are expected to clear (A2 about 27 → 22). Criterion 5 keeps
  "A2 at or below the Phase 98 number"; the boundary run names which A2 message groups
  disappeared, verified by file-set diff.

### The label group is the word `label`
- **D-04:** Scout finding: every file of the roadmap's "label alone / label in front of a
  statement" group uses the literal word `label` as the name. A label with any other name
  already parses, alone or in front of a statement. `label` is a keyword through the library
  grammar (`'label' name=SymbolicLabelName`, used by the `.bbl` symbolic-label declarations) and
  does not fall back to an identifier the way most keywords do. Fix **only the word `label`, in
  all positions**: label declaration (alone, and directly followed by a statement with or without
  a space, including `;`-chained statements), `GOTO`/`GOSUB`/`ON … GOTO/GOSUB` target, and
  variable on the left of an assignment. Upper, lower and mixed case. The library grammar's
  symbolic-label declarations must keep working.
- **D-05:** If the natural root fix is a generic mechanism that also makes other library-grammar
  words usable as names, take it — but Phase 99 **tests and claims only `label`**. Any other word
  that starts working is recorded at the boundary run; Phase 100 still verifies its own list.
  No blanket reserved-word rule anywhere (REQUIREMENTS.md, Out of Scope).
- **D-06:** `ROADMAP.md` and `REQUIREMENTS.md` are amended as part of this context commit so the
  verifier checks the real shapes: Phase 99's goal line, success criteria 2, 3 and 5, the ordering
  note's file counts, PARSE-02 and PARSE-03. The generic shapes of the old wording (a label alone,
  a label in front of `ESCAPE`/`ENTER`/`IOLIST`, `READ RECORD` with options) stay in as cases
  that must parse. Phase 100's criterion 3 keeps `label` in its word list as a regression check;
  its "continued `LEN=`" hand-over is marked as taken by Phase 99.

### FIELD and IOLIST depth
- **D-07:** **Correct AST, no new editor features.** Both statements parse into a proper AST so
  the variables inside them link, highlight and complete like anywhere else. No new hover text,
  outline entry or validation. Providers (document symbols, semantic tokens, hover) are touched
  only if the new nodes would otherwise misbehave.
- **D-08:** The `FIELD` verb's three parts — record, name, value — are **plain expressions**. The
  name part occurs as a string variable, a string literal and a concatenated string expression;
  the value as any expression. No check of the name against the record's template: the compiler
  does not check it either.
- **D-09:** `FIELD` as the class-member declaration must be untouched, and the verb must work
  inside a method body as well as at program level. Required cases, stated in the executor
  prompt up front:
  - **still flagged:** a class `FIELD` declaration without a type; a `FIELD` verb without
    `=value`;
  - **still clean (keyword-as-identifier probes):** `field`/`fields` style variable names,
    identifiers ending or starting with the word (`myfield`, `fieldname$`, `nfield(...)`), and
    those followed by `to`/`step`/`then` (`for i=1 to nfield`). The same probe set applies to
    `iolist`, `len` and `label`.
- **D-10:** `IOLIST` items are **ordinary variable references** (scalars, strings, arrays with
  `[all]`, long lists over continuation lines). A program whose variables appear first or only
  in an `IOLIST` must get no new error-severity diagnostic from the scoping or
  use-before-assignment checks. `IOL=<label>` keeps linking to the label in front of the
  `IOLIST`. A standalone `IOLIST` without a label parses too (roadmap criterion 4).

### Measurement and gates
- **D-11:** **B is not a gate, but every moved file needs evidence.** B may rise. Each
  newly-uncaught file is found by file-set diff against a snapshot of `details.json` taken before
  the run, and classified: *lost an accidental catch* (accepted; belongs to the compiler
  endpoint, Phases 101-103) or *a new grammar rule accepts an invalid form* (fix it or justify
  it). No cause is written down without the per-file look. Goes into `99-CONFORMANCE.md` as
  counts and own-words shapes only.
- **D-12:** The harness runs **after each group lands and once more after the last source
  change** (including code-review fixes), before any acceptance is asked for. Copy `details.json`
  to a phase-named snapshot before every full run — the harness overwrites it. Diff file sets,
  not totals. Command:
  `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
  (about one minute, no Java-interop contact).
- **D-13:** If A is still above 80 after the four groups (expected is roughly 167 → 56; a file can
  hide a second cause behind the first): list what the still-rejected files of these groups now
  stop at, fix what is trivially related to a change already made, hand the rest to Phase 100's
  long tail by message group. If A is still > 80 after that, stop for the user's decision — no
  Phase 100 group is pulled forward to reach the number.
- **D-14:** Only numbers, first-word/message groups with counts and own-words shape descriptions
  go into tracked files — no corpus file name, path or source line (as 98 D-17).

### Carried forward from Phase 98 (locked, not re-discussed)
- **D-15:** Fix at the root in grammar and lexer; `npm run langium:generate` (Node 22) is part of
  the phase; never edit `src/language/generated/`.
- **D-16:** Regression files live in `bbj-vscode/test/test-data/conformance/`, one per construct
  group, named for the construct — `field-verb.bbj`, `record-verbs-len-option.bbj`,
  `label-word-as-name.bbj`, `iolist-statement.bbj` — hand-written minimal shapes with invented
  names, a leading `REM` stating in behaviour terms what the file protects, upper- and lower-case
  variants, no requirement/plan/decision ids in names or content. `conformance-regressions.test.ts`
  already asserts zero parse errors and zero error-severity diagnostics (linking excluded) for
  that folder.
- **D-17:** Each grammar rule or token touched gets at least one new "still flagged" case; the
  criterion is "no error on code the compiler accepts", never "no error".
- **D-18:** Any new keyword-triggered lexer token is anchored to statement start with a word
  boundary (start of line or `;`, optional line number and label). After each executor returns,
  the orchestrator runs a throwaway before/after `parseHelper` probe of the D-09 identifier cases
  and deletes it.

### Claude's Discretion
- How `LEN` is unfused — grammar literal split, token-builder change, or both — as long as D-02's
  three positions work and nothing on list A or A2 regresses.
- Whether the `FIELD` verb is a new statement rule with lexer help or a grammar-only
  disambiguation against `FieldDecl`; AST node and property names for both new statements.
- The mechanism that lets `label` be a name while the library grammar keeps its keyword.
- Plan split and order. By file count is the obvious default: `FIELD`, `LEN=`, `label`, `IOLIST`
  — with `IOLIST` after `label`, since all three corpus shapes sit behind a label.
- Whether `READ RECORD` sibling verbs need anything beyond the `LEN=` fix (the scout saw no
  other failure in the group; the researcher confirms with probes, including a variable such as
  `record_2` not being mistaken for the combined form).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — "Phase 99" detail block (goal, five success criteria, ordering note),
  amended by this context commit (D-06); "Phase 100" criterion 3 for the boundary with PARSE-08
- `.planning/REQUIREMENTS.md` — PARSE-01, PARSE-02, PARSE-03, PARSE-07, CONF-01, and the
  Out-of-Scope table (no blanket reserved-word rule, no proprietary source text, no
  corpus/harness in this repo)
- `.planning/STATE.md` — "Active Constraints" (v4.5 entries, branch + PR landing, register-check)

### Inherited conventions and lessons
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONTEXT.md` — D-01 (root fix),
  D-04 (keyword names in branch-target position), D-10..D-14 (regression-file convention,
  "still flagged" rule), D-17, D-18
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md` — sections 7, 9
  and 10: the A2 residue (including the five `LEN` files), the per-file B evidence format to
  repeat, and the closing re-run that caught a late A2 movement
- `.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` —
  reviewed, **not** folded; do not fix in this phase

### Measurement (private, outside this repository — read, never copy)
- `/home/coder/repos/bbj-corpus/conformance/REPORT.md` — section "A. Valid code rejected, by first
  word of the line the parser stops at"
- `/home/coder/repos/bbj-corpus/conformance/details.json` — `falseRejects` entries (`id`, `line`,
  `message`, `source`) for per-file triage; overwritten by every full run — snapshot first (D-12)
- `/home/coder/repos/bbj-corpus/conformance/run.mjs`, `worker.mts` — how A, A2 and B are counted

### Project conventions
- `CLAUDE.md` — build/test commands, "Shell and File-Access Rules", the test-data convention

No external specs or ADRs — the compiler (`bbjcpl`) is the oracle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/bbj.langium` — `ReadStatement` (`kind=READ_KINDS record?='RECORD'?
  WithChannelAndOptionsAndInputItems?`), `ReadRecordStatement` (fused `READRECORD` …),
  `PrintStatement` with `record?='RECORD'?`, fragment `Options` / rule `Option`
  (`key=ValidName '=' value=(Expression | LabelRef)`), `LastVerifyOption` — the only user of the
  fused `'LEN='` literal, `OtherItem` with `'IOL=' iol=LabelRef`, `LabelDecl`
  (`name=ValidName ':'`), `FieldDecl` (class member, `'FIELD' Visibility Static type=…`),
  `ValidName returns string: ID`, library rule `LibSymbolicLabel` (`'label' name=…`).
- `bbj-vscode/src/language/bbj-token-builder.ts` — the generic keyword-as-identifier handling,
  `KEYWORD_STANDALONE`, `BRANCH_TARGET_EXCLUSION` (Phase 98's bounded lookbehind that lets
  keyword-named labels be branch targets), the statement-anchored opaque `TABLE` data token as
  the pattern for any new keyword-triggered token.
- `bbj-vscode/test/conformance-regressions.test.ts` and
  `bbj-vscode/test/test-data/conformance/` (nine files from Phase 98) — the harness the four new
  files drop into.

### Established Patterns
- Chevrotain takes the first matching token at an offset, not the longest — a fused literal or
  an unanchored lookbehind matches inside longer input; suite-green does not prove absence of
  identifier regressions (Phase 98 plan 01).
- Tests parse with `parseHelper` / `validationHelper`, never `DocumentBuilder.build`.
- vitest needs cwd = `bbj-vscode`; judge the whole suite on `numFailedTests` with
  `--maxWorkers=2`; with BBjServices up, the `linking.test.ts` interop tests and one issue-447
  test fail locally (environment, not regression) — green with `RUN_BBJ_TESTS=0`. Do not write
  `--reporter=basic` into plans (not in this vitest).
- BBj is case-insensitive — every group needs upper- and lower-case variants.
- Register-check: no plan, decision, requirement or review ids in source or test comments.

### Integration Points
- The `Statement` alternatives list in `bbj.langium` — where `FIELD`-verb and `IOLIST` rules
  register; `FieldDecl` stays in `BBjClassMember`.
- `validations/line-break-validation.ts` `lineBreakMap` — a new statement type may need a mask
  entry so it does not trip the generic "needs to start in a new line" default, especially
  `label: iolist …` and `label:escape;exit` on one line.
- `validations/check-variable-scoping.ts` — must stay silent at error severity for variables
  first seen in an `IOLIST` (D-10).

</code_context>

<specifics>
## Specific Ideas

- Real group sizes at the Phase 98 close (A = 167): `FIELD` 45; `READ RECORD` + `LEN=` 38; the
  word `label` about 25 (label declaration alone 15, declaration in front of a statement 4,
  `GOTO`/`GOSUB` target 4 incl. one inside a `LET …; GOTO` chain, variable on the left of an
  assignment 3); `IOLIST` behind a label 3. About 111 files, so roughly A 167 → 56 if no file
  hides a second cause.
- `FIELD` verb name-part variety seen: string variable (the large majority), string literal with
  spaces around `=`, and a string concatenation containing a masked `str(…)`. Value-part variety:
  nested function calls, a negative number, `num(…)`, a method-call result.
- `LEN=` option values seen: a number literal and a plain numeric variable; the channel is a
  plain numeric variable.
- The one list-A file whose failing line is empty is **not** a label case: it is a statement that
  starts with a `::file::Class.method()` static call after a blank line. It belongs to Phase 100's
  long-tail triage.
- The user wants lean phases: smallest change that meets the criteria, no folded todos, no new
  editor capability riding along.

</specifics>

<deferred>
## Deferred Ideas

- Unfusing `'IOL='` so a variable named `iol` works — same defect class as `LEN=`, no corpus file
  needs it; candidate for Phase 100's long tail if the triage finds one.
- Other library-grammar and language words as names (`text`, `vector`, `state`, `val`, …) —
  Phase 100 (PARSE-08), even if D-05's mechanism happens to cover some of them.
- A statement beginning with a `::file::Class.method()` static call — Phase 100 long-tail triage.
- `IOLIST` in the document outline / hover on `IOL=label`; a warning for a literal `FIELD` name
  missing from a known template — new capabilities, not planned in v4.5.

### Reviewed Todos (not folded)
- "Loosen single-line IF balance rule for the 5 re-flagged valid files (A2 27 → ≤ 25)" — in this
  milestone's scope but a validator fix, not a parser gap; stays pending for Phase 100's long
  tail or a quick task. D-02's side effect is expected to bring A2 under 25 independently.
- "linking.test.ts Interop related tests fail even after a targeted class warm-up" — test
  harness, keyword match only.
- "A lost language-server connection is invisible to the plugin's crash detection" — IntelliJ
  server lifecycle.
- "Phase 97 code-review follow-ups" — IntelliJ Node download.
- "The server status log line prints a stale previous status" — IntelliJ server lifecycle.

</deferred>

---

*Phase: 99-Parser Gaps — the Largest Groups*
*Context gathered: 2026-09-21*
