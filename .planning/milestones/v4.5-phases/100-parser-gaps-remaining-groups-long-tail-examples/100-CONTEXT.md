# Phase 100: Parser Gaps — Remaining Groups, Long Tail & Examples - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The rest of list A (52 files at the Phase 99 close) either parses or is recorded with the reason
it stays, and the repository's own `examples/` stops disagreeing with the compiler:

1. The empty-bracket whole-array form `name[]` parses wherever an array element can stand —
   about 29 of the 52 files, one root cause (D-01..D-05).
2. `; rem` after block boundaries (`METHOD` header, `METHODEND`, `CLASSEND`, `FNEND`, single-line
   `DEF FN`) and class code carrying user line numbers — about 8 files.
3. Language words as names, established by an oracle sweep against `bbjcpl` rather than by a
   guessed list (D-06..D-09).
4. Long-tail triage: cheap one-off shapes fixed, the rest recorded by shape with a reason
   (D-10..D-14).
5. `examples/`: every `.bbj` program compiles with `bbjcpl` or lives in `examples/invalid/` with
   its expected diagnostics asserted (D-15..D-21).

Gate: the conformance run reports **A ≤ 25**, A2 at or below the Phase 99 close (23), one
synthetic regression file per fixed construct (CONF-01), a complete shape-level residue list.

Requirements: PARSE-04, PARSE-05, PARSE-06, PARSE-08, PARSE-09, EXMP-01 (wording amended by this
context commit, D-01).

Not in this phase: any new strict check (no flagging of words or forms the compiler rejects —
deferred STRICT-01/02), tightening a grammar rule that turns out to accept an invalid form
(todo only, D-18), the single-line `IF` balance-rule residue (pending todo, not folded), new
editor features for any construct, anything in `bbj-ls` or the IntelliJ plugin.

</domain>

<decisions>
## Implementation Decisions

### Re-scope to the real shapes
- **D-01:** `ROADMAP.md` (Phase 100 list line, success criteria 1-5) and `REQUIREMENTS.md`
  (PARSE-04, -05, -06, -08, -09, EXMP-01) are amended as part of this context commit so the
  verifier checks the real shapes. Scout finding behind it, from a per-file look at the harness
  details and a throwaway parse probe: `print (0,err=label) "x"`, the trailing-comma item list
  and the `ctrl(...)`-in-single-line-`IF` form **already parse**; all fourteen named words
  **already work** as variable, string variable, label and `GOSUB` target. The files behind the
  roadmap's `PRINT`, `DREAD`, `TEXT`, `VECTOR`, `STATE` groups fail on one thing: empty array
  brackets. The already-parsing shapes stay in the criteria as cases that must keep parsing.
- **D-02:** **Root fix: brackets may be empty wherever an array element can stand.** One change
  at the array-element rule, not one alternative per position. Must cover: `PRINT` item
  (`print z![]`, `print "a",x$[]`, mixed with indexed elements in one list), `DREAD` target
  (`dread x![]`, `dread a$[],b[]`), assignment target (`x![] = expr`), argument of `CALL` /
  `XCALL`, of a method call (`o!.put("k",a$[])`), of a function call (`vector(a$[])`, with a
  trailing `err=` option), and `bbjapi().copy(v!,a[])`. All suffixes (`!`, `$`, `%`, none), upper
  and lower case. — **Reversibility:** costly — the array-element rule feeds generated AST types
  that linking, type inference and the scoping checks read.
- **D-03:** The empty form produces the **same node as `[all]`** — the existing array-element
  node marked as whole-array — so linking, type inference and hover behave exactly as for
  `x[all]` today. No new node type, no provider change unless the node would otherwise misbehave
  (99 D-07 carried forward).
- **D-04:** The type-side bracket shapes belong to the same group and the same regression file:
  `declare int[][] two!` (more than one bracket pair on `DECLARE`; check `FIELD`, `METHOD` return
  type and parameter the same way — they share the single-pair pattern) and a parameter written
  `BBjArray dat[all]`.
- **D-05:** Accepting empty brackets everywhere may accept a form the compiler rejects. B is
  recorded with per-file evidence, not gated (99 D-11 carried forward): each newly-uncaught file
  is found by file-set diff and classified as *lost an accidental catch* or *a new rule accepts
  an invalid form* (then fix or justify).

### Language words as names
- **D-06:** **Oracle sweep instead of a guessed `possibleName` list.** The researcher compiles
  every keyword of our grammar with `bbjcpl` in three positions — variable (`w = 1` and a read,
  plus the `$`, `!`, `%` suffixed forms), label declaration, `GOTO`/`GOSUB` target — and parses
  the same text with the language server. Every word the compiler accepts and the parser rejects
  is fixed; the accepted set becomes the word list of the regression file (word lists are
  allowed in tracked files). Known mismatches at the outset: `var` (variable and label), `use`
  (variable and label), `start` on the right-hand side of an assignment.
- **D-07:** Fixes are **per word**, the way `label` was done in Phase 99 — each word added where
  names are accepted, no generic keyword-falls-back-to-identifier mechanism, however long the
  list. No blanket reserved-word rule anywhere.
- **D-08:** Positions claimed: **variable, label, branch target** — exactly criterion 3. Class,
  method, field and parameter names stay out.
- **D-09:** Words the compiler **rejects** as names but the parser accepts are recorded by the
  sweep (count and word list) and not flagged — strict checks stay deferred.

### Long-tail triage and the residue list
- **D-10:** **Fix the cheap ones, record the rest.** A remaining shape is fixed when it is a
  small, local grammar change with a clear compiler-accepted form. Expected in that class: a
  trailing `,err=` / `,tim=` / `,mode=` option tail on `SETDRIVE`, `PROCESS_EVENTS` and
  `FULLTEXT`; `input@(r,c),v$`; `ON ERR(...) GOTO a,b,c`; `; rem` after a single-line `DEF FN`.
  Anything needing lexer work or a new mechanism (for example a statement that begins with a
  `::file::Class.method()` static call) is recorded with its reason. Rough target A ≤ 10; the
  gate stays A ≤ 25. No drive to zero.
- **D-11:** The tracked list is **shape-level**: one row per residual shape — own-words
  description, file count, reason category, fixed-or-stays. The file-by-file mapping (harness id
  → shape) is written next to the harness in the private `bbj-corpus` repository, never here.
  Criterion 4 and PARSE-09 are reworded accordingly (D-01).
- **D-12:** Reason categories: *not a program* · *compiler quirk* (accepted by `bbjcpl` but
  meaningless or undocumented) · *deliberately out of scope* · *valid but disproportionate to fix
  now* — the last one names the shape as a candidate for a later milestone.
- **D-13:** The list lives in `100-CONFORMANCE.md`, alongside the runs and the gate table, as in
  Phases 98 and 99; Phase 104's closing measurement reads it from there.
- **D-14:** The triage runs after the array, block-boundary and word-sweep fixes have landed and
  list A has been re-measured — a file can hide a second cause behind the first. Classify every
  remaining first-failing line by a per-file look (orchestrator's job; executors get counts and
  own-words shapes only).

### examples/ clean-up
- **D-15:** Default for a failing example whose error is **not its point**: **repair it so it
  compiles, keeping its point** — the smallest edit that makes `bbjcpl` accept the file while
  the construct the issue was about stays in it (seen: object-typed fields and variables without
  the `!` suffix, `def identity(value)`, a `::./importMe.bbj::` path, `direct` with one argument
  too many, two assignments joined by `:` on one line).
- **D-16:** Files whose **purpose is the error** move to **`examples/invalid/`**, a flat folder
  with a short README saying these files fail to compile on purpose and what each demonstrates.
  Issue-numbered file names are kept.
- **D-17:** **Mixed files are split**: the valid body stays under its name and compiles; the
  erroneous lines move into a sibling file in `examples/invalid/` (seen: bare substring
  expressions at the end of the `DIM` demo; a type error next to valid `RELEASE` forms).
- **D-18:** Examples added as "supported syntax" that the compiler rejects (seen: a `MODE=`
  named argument on `msgbox(...)`, `fileopen(...)`, `filesave(...)`): the researcher establishes
  with `bbjcpl` and the BBj documentation what the accepted spelling is. A valid spelling exists
  → repair the example to it. The grammar rule was added on a false premise → the file moves to
  `examples/invalid/` with "no diagnostic today" recorded and a **todo is filed**; the grammar is
  not tightened in this phase.
- **D-19:** The assertion has two layers:
  - **always-on (CI):** every valid example parses with zero parse errors; every file in
    `examples/invalid/` has a sidecar expectation — line, message fragment, severity — checked
    through the parse/validation helpers. A file the language server cannot flag at all carries
    an explicit **"none today — compiler-only"** entry so the gap is visible instead of silent.
  - **BBj-gated (`RUN_BBJ_TESTS`):** every valid example compiles with `bbjcpl`, every invalid
    one fails to compile.
- **D-20:** `config.bbx` and `functions.bbl` are not programs: they **stay where they are** and
  are excluded by extension, with the reason stated in the test. No path changes for the tests
  that reference them.
- **D-21:** Moving or splitting a file must not break the three tests that reference single
  example files (`textmate-bbx-highlighting.test.ts`, `utils.test.ts`,
  `functional/installed-extension-e2e.test.ts`) — check references before each move.

### Carried forward (locked, not re-discussed)
- **D-22:** Fix at the root in grammar and lexer; `npm run langium:generate` (Node 22) is part of
  the phase; never edit `src/language/generated/` (98 D-01, 99 D-15).
- **D-23:** Regression files live in `bbj-vscode/test/test-data/conformance/`, one per construct
  group, named for the construct (for example `whole-array-empty-brackets.bbj`,
  `rem-after-block-boundaries.bbj`, `language-words-as-names.bbj`, one per long-tail fix or one
  shared `statement-option-tails.bbj`) — hand-written minimal shapes with invented names, a
  leading `REM` stating in behaviour terms what the file protects, upper- and lower-case
  variants, no requirement/plan/decision ids. `conformance-regressions.test.ts` already asserts
  zero parse errors and zero error-severity diagnostics for that folder (98 D-10..D-13).
- **D-24:** Each grammar rule or token touched gets at least one new "still flagged" case; the
  criterion is "no error on code the compiler accepts", never "no error" (98 D-14).
- **D-25:** Any new keyword-triggered lexer token is anchored to statement start with a word
  boundary; after each executor returns, the orchestrator runs a throwaway before/after
  `parseHelper` probe of the identifier cases (`myfield`, `fieldname$`, `for i=1 to nfield`
  style, applied to every word touched) and deletes it (99 D-18). Custom tokens that swallow
  their terminator interact with the comment-separation check — re-probe `verb; rem` shapes.
- **D-26:** The harness runs after each group lands and once more after the last source change
  (including code-review fixes). Snapshot `details.json` into the harness's `snapshots/` folder
  before every full run; diff file sets, not totals; compute group tables from `details.json`,
  not from the capped `REPORT.md` table. A parser fix can unmask validator false alarms in the
  same files (Phase 99, plan 02) — classify any new A2 entry by line shape before the next plan
  (99 D-11, D-12). Command:
  `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- **D-27:** Only numbers, first-word/message groups with counts, word lists and own-words shape
  descriptions go into tracked files — no corpus file name, path or source line (98 D-17).

### Claude's Discretion
- The grammar mechanics of the empty-bracket form and of multiple bracket pairs on the type
  side; the "still flagged" cases for them (an unclosed bracket, `x[,]`).
- Whether `; rem` after block boundaries is a grammar change, a lexer-token change or both; how
  line-numbered class code is made to parse.
- How the oracle sweep is scripted and whether the script is kept (scratch is fine); the sidecar
  format for `examples/invalid/` expectations; the name and location of the examples test.
- Which long-tail shapes count as "cheap" — the planner proposes per shape under D-10; if a
  proposed fix turns out to need lexer work during execution, it flips to "recorded".
- Plan split and order. Obvious default: array form first (largest), block boundaries, word
  sweep, re-measure, long-tail fixes and residue list, `examples/` last (independent of the
  grammar work except that repaired examples must parse with the final grammar).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — "Phase 100" detail block (goal, five success criteria, ordering
  note), amended by this context commit (D-01)
- `.planning/REQUIREMENTS.md` — PARSE-04, -05, -06, -08, -09, EXMP-01, CONF-01, and the
  Out-of-Scope table (no blanket reserved-word rule, no proprietary source text, no
  corpus/harness in this repo)
- `.planning/STATE.md` — "Active Constraints" (v4.5 entries, branch + PR landing, register-check)

### Inherited conventions and lessons
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONTEXT.md` — D-05 (per-word claim),
  D-07 (correct AST, no new features), D-09 (identifier probe set), D-11..D-14 (measurement)
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — the run-record and
  gate-table format to repeat; "Run: plan 02" (parser fix unmasking a validator false alarm) and
  "Task 3 conditional stop" (file-set condition stricter than totals); the closing list-A table
  this phase starts from
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONTEXT.md` — D-10..D-14
  (regression-file convention, "still flagged" rule)
- `.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` —
  reviewed, **not** folded; do not fix in this phase

### Measurement (private, outside this repository — read, never copy)
- `/home/coder/repos/bbj-corpus/conformance/details.json` — `falseRejects` entries (`id`, `line`,
  `message`, `source`) for per-file triage; overwritten by every full run — snapshot first
- `/home/coder/repos/bbj-corpus/conformance/snapshots/` — the folder the harness never clears
- `/home/coder/repos/bbj-corpus/conformance/run.mjs`, `worker.mts` — how A, A2 and B are counted

### Oracle
- `/opt/bbx/bin/bbjcpl` — the compiler; the oracle for the word sweep (D-06) and for every
  example (D-15..D-19). See how `bbj-vscode/src/language/bbj-cpl-service.ts` invokes it.

### Project conventions
- `CLAUDE.md` — build/test commands, "Shell and File-Access Rules", the test-data convention

No external specs or ADRs — the compiler (`bbjcpl`) is the oracle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/bbj.langium` — the array-element alternative
  (`{infer ArrayElement.receiver=current} "[" (all?="ALL" | indices+=Expression (',' …)*) "]"`):
  the brackets demand `ALL` or an index today — the root of D-02. `DreadStatement`
  (`'DREAD' items+=InputItem …`), `VariableDecl`/`FieldDecl`/`MethodDecl`/`ParameterDecl` with
  `(array?='[' ']')?` (one pair only — D-04), `CAST` with `(arrayDims+='[' ']')*` as the
  existing multi-pair pattern. `MethodDecl` and `ClassDecl` headers already take
  `(';' comments+=CommentStatement)?`; `METHODEND`, `CLASSEND`, `FNEND` and the single-line
  `DefFunction` do not.
- `bbj-vscode/src/language/bbj-token-builder.ts` — keyword-as-identifier handling,
  `KEYWORD_STANDALONE` (swallows its terminator), `BRANCH_TARGET_EXCLUSION`.
- Phase 99's per-word pattern: `FeatureName` gained the literal `'label'`; datatype rule
  `LabelName` (`ID | 'label'`) used by `LabelDecl.name` and the label cross-reference — the model
  for D-07.
- `bbj-vscode/test/conformance-regressions.test.ts`, `bbj-vscode/test/test-data/conformance/`
  (14 files from Phases 98-99), `bbj-vscode/test/parser-keyword-statements.test.ts` (positive
  and still-flagged cases per construct).

### Established Patterns
- Chevrotain takes the first matching token at an offset, not the longest; suite-green does not
  prove absence of identifier regressions — hence the probe in D-25.
- Tests parse with `parseHelper` / `validationHelper`, never `DocumentBuilder.build`.
- vitest needs cwd = `bbj-vscode`; judge the whole suite on `numFailedTests` with
  `--maxWorkers=2`; green with `RUN_BBJ_TESTS=0`. Do not write `--reporter=basic` into plans.
  A probe that prints needs `--disable-console-intercept` (or write results to a file).
- BBj is case-insensitive — every group needs upper- and lower-case variants.
- Register-check: no plan, decision, requirement or review ids in source or test comments.

### Integration Points
- `bbj-vscode/test/example-files.test.ts` reads only `test/test-data/`; **no test reads
  `examples/` as a whole today** — the examples test (D-19) is new. `RUN_BBJ_TESTS` is the
  existing switch for BBj-dependent tests.
- `bbj-type-inferer.ts` and `validations/check-variable-scoping.ts` read the array-element node;
  the empty form must behave as `[all]` does there (D-03).
- `validations/line-break-validation.ts` — `; rem` after a block closer must not trip the
  "needs to end with a line break" rules once it parses.

</code_context>

<specifics>
## Specific Ideas

- List A at the Phase 99 close, by real cause (52 files): empty array brackets about 29 (`DREAD`
  target 8, `PRINT` item 5, assignment target 5, call/method/function argument 9, `DIM…; print
  a[]` 1, two-pair `DECLARE` 1); `; rem` after `METHOD` header / `METHODEND` 4, bare `METHODEND`
  and `FNEND` stops 2, `; rem` after a single-line `DEF FN` 1, array-typed parameter `[all]` 1;
  option tails on three verbs 4 (one shape appears twice inside a single-line `IF`);
  `input@(…),v$` 1; `ON ERR(…) GOTO` list 1; words as names 3 (`var`, right-hand `start`,
  `assert` as a variable next to a number in exponent form); a `USE` of a package whose last
  segment is a language word 1; a statement starting with a `::file::Class.method()` call 1; two
  `PRINT` lines with a number in exponent form inside a function call 2 — `print 1.0e-2` alone
  parses, so the cause is elsewhere on those lines (researcher to establish).
- Arithmetic: 52 − 29 − 8 ≈ 15, so the gate is reachable from the first two groups; the long-tail
  fixes are about quality of the residue, not about reaching the number.
- `examples/` today: 92 `.bbj` programs, 17 fail `bbjcpl`; plus `config.bbx` and `functions.bbl`
  (not programs). Failure kinds: deliberate error demos; object-typed names without `!`; a
  `DEF` without `FN`; relative `::./…::` paths; a `MODE=` named argument on three functions; one
  verb with too many arguments; bare expression statements at the end of a demo.
- The user wants lean phases: smallest change that meets the criteria, no folded todos, no new
  editor capability riding along.

</specifics>

<deferred>
## Deferred Ideas

- Flagging names or forms the compiler rejects but the parser accepts (sweep by-product D-09,
  false-premise examples D-18) — strict-check territory, deferred STRICT-01/02; D-18 files a todo.
- Language words as class, method, field or parameter names — not claimed here; candidate for a
  later milestone if the corpus shows them.
- A statement beginning with a `::file::Class.method()` static call — recorded under D-10 unless
  it turns out cheap.
- Unfusing `'IOL='` so a variable named `iol` works — still no corpus file needs it (from 99).
- A standing, milestone-surviving residue file outside the phase folder — declined for now; the
  list lives in `100-CONFORMANCE.md` (D-13).

### Reviewed Todos (not folded)
- "Loosen single-line IF balance rule for the 5 re-flagged valid files" — validator fix, not a
  parser gap; A2 is already 23 against a gate of 25. Stays pending for a quick task.
- "linking.test.ts Interop related tests fail even after a targeted class warm-up" — test
  harness, keyword match only.
- "A lost language-server connection is invisible to the plugin's crash detection" — IntelliJ
  server lifecycle.
- "Phase 97 code-review follow-ups" — IntelliJ Node download.
- "The server status log line prints a stale previous status" — IntelliJ server lifecycle.

</deferred>

---

*Phase: 100-Parser Gaps — Remaining Groups, Long Tail & Examples*
*Context gathered: 2026-09-21*
