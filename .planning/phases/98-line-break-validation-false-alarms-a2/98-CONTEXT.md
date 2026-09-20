# Phase 98: Line-Break & Validation False Alarms (A2) - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Valid BBj that the language server already parses stops collecting errors the compiler would
never report. Covered: the "needs to start in a new line" / "needs to end with a line break"
errors on `TABLE`, `RESTORE n`, `GOSUB`/`GOTO` to a keyword-named label, `EXIT expr`, `LOAD`,
`SAVE`, a continued `LEN=` item, a trailing-comma `PRINT`, multi-line `DEF FN...(params)`
headers and the single-line `IF ... THEN ... ; GOTO label` / `... FI` forms; plus the
conflicting-`DECLARE` check and the two `METHODRET` checks. Gate: the conformance run reports
**A2 ≤ 25** (from 267) with A and B not regressed, and every fixed construct has a synthetic
regression file (CONF-01 — the convention Phases 99 and 100 inherit).

Requirements: VALID-01, VALID-02, VALID-03, VALID-04, VALID-05, CONF-01.

Not in this phase: the list-A parser gaps (Phases 99/100), language words as names outside
branch-target position (PARSE-08, Phase 100), any new strict check (deferred STRICT-01/02),
anything in `bbj-ls` or the IntelliJ plugin.

</domain>

<decisions>
## Implementation Decisions

### Where the fix goes — grammar, not symptom suppression
- **D-01:** Fix the root cause in the grammar (and lexer where needed), not by teaching
  `line-break-validation.ts` to tolerate mis-parsed shapes. Scout finding behind this: `TABLE`
  does not exist in `bbj.langium` at all; `RestoreStatement` accepts only a `LabelRef`, so
  `RESTORE 0` ends at `RESTORE` and the rest of the line becomes a second statement;
  `gosub print`, `exit err`, `load "..."` are reported the same way. The validator only reports
  the symptom of a wrong AST. This **overrides** the roadmap's "leaves the grammar alone /
  file-disjoint from Phases 99 and 100" note — harmless, because Phase 99 is scheduled after
  Phase 98 anyway. `npm run langium:generate` is therefore part of this phase.
  — **Reversibility:** costly — grammar rules feed generated AST types that later phases
  (99, 100) build on.
- **D-02:** Where the grammar is already right and only the line-break mask is wrong (the
  researcher must establish this per construct — likely candidates are the multi-line `DEF FN`
  header and the single-line `IF`/`FI` forms), the fix goes in `line-break-validation.ts`. The
  rule is "fix where the defect is", with D-01 as the default when the AST is wrong.
- **D-03:** `TABLE` is modelled as an **opaque rest-of-line**: the lexer captures everything
  after `TABLE` up to end of line (or a trailing `;rem`) as one data token, the way raw-text
  statements are handled. No hex validation — the compiler owns that. Must cover: with and
  without a leading label, mask and bytes unspaced, spaced, mixed, long and short, upper and
  lower case.
- **D-04:** Language words as label names are accepted **in branch-target position only** —
  `GOTO`, `GOSUB`, `ON ... GOTO/GOSUB` targets, plus whatever the label-declaration side needs
  so those same targets link. Variables and every other name position stay with Phase 100
  (PARSE-08). No blanket reserved-word rule is introduced anywhere.
- **D-05:** `ROADMAP.md` is amended as part of this context commit: Phase 98's Depends-on and
  Repository lines (grammar + lexer + `langium:generate`; the conflicting-`DECLARE` check lives
  in `validations/check-variable-scoping.ts`, not `check-classes.ts`), Phase 99's "no file
  conflict" remark, and success criterion 4 (see D-09).

### Conflicting DECLARE and METHODRET checks
- **D-06:** Conflicting `DECLARE` is **narrowed, not removed**:
  - inside a **method body**: two declarations of one name whose types both resolve and are
    unrelated (neither is a sub/supertype of the other) → stays an **error**;
  - at **program level** (subroutines and event handlers share one namespace, and re-declaring
    a variable per handler is ordinary BBj practice because `DECLARE` takes effect from its
    position onward): unrelated resolved types → **warning**;
  - either scope: related types (sub/supertype), or at least one type unresolvable → **silent**.
  The seven corpus hits fall into: related types (2), unresolvable types (1), same short name
  but different class (1), unrelated types re-declared later at program level (2), one
  deliberately contradictory pair (1). All seven are program-level, so none remains an error.
- **D-07:** "Method declares a return type but has no METHODRET returning a value" and
  "Method is declared void and must not return a value" both become **warnings**. The second
  group (2 files) is not named in the roadmap but is the same kind of disagreement with the
  compiler and is taken in the same stroke.
- **D-08:** No special case for stub-looking methods — one plain warning whenever a non-void,
  non-interface method never returns a value, empty body or not.
- **D-09:** Success criterion 4 is reworded from "report nothing on code `bbjcpl` accepts" to:
  **no error-severity diagnostic** on compiler-accepted code, with one named, deliberate
  exception — unrelated resolved `DECLARE`s of one name inside a single method body. The
  verifier checks against the reworded criterion.

### Regression-file convention (CONF-01 — inherited by Phases 99 and 100)
- **D-10:** Scout finding: `example-files.test.ts` asserts only lexer and parser errors, and A2
  files already parse — so a plain test-data file would pass today without any fix. The
  convention therefore asserts **zero parse errors AND zero error-severity validation
  diagnostics** for conformance regression files. Linking diagnostics are excluded (as the
  harness does — `EmptyFileSystem` has no Java classpath). The assertion must not go through
  `DocumentBuilder.build` in a way that contacts CPL or java-interop; use the
  parse/validation helpers.
- **D-11:** Conformance regression files live in a dedicated subfolder,
  `bbj-vscode/test/test-data/conformance/`. Only that folder gets the stricter assertion;
  the existing flat `test-data/*.bbj` files keep the parse-only rule.
- **D-12:** One file per **construct group**, named for the construct — e.g.
  `table-statement.bbj`, `restore-numeric.bbj`, `keyword-branch-targets.bbj`,
  `exit-load-save.bbj`, `def-fn-multiline-header.bbj`, `single-line-if-forms.bbj`,
  `declare-methodret.bbj`. Each holds every variant of its group. No requirement ids, plan ids
  or decision ids in file names or content (register-check).
- **D-13:** Files are **hand-written minimal shapes** with invented names and data. A leading
  `REM` states in behaviour terms what the file protects. No corpus text, no corpus file names.

### Keeping the checks useful
- **D-14:** Every negative case currently in `line-break-validation.test.ts` must still be
  flagged, and **each mask or grammar rule touched in this phase gets at least one new
  "still flagged" case** (for example two real statements on one line without `;`, `METHOD`
  not at line start, `CLASSEND` followed by code). The criterion is "no error on code the
  compiler accepts", never "no error".
- **D-15:** The unnamed residue groups are **in scope**: the continued `LEN=` item (3 files,
  already in roadmap criterion 2) and the trailing-comma `PRINT` (2 files). For the PRINT
  case fix only the cause of the line-break symptom; the PRINT/INPUT item forms as such are
  PARSE-04's territory — note the overlap for Phase 100.
- **D-16:** Whatever A2 files remain at the phase-boundary run are **triaged and recorded**:
  each remaining message group with its file count and a one-line cause goes into the phase's
  verification notes; trivially related ones are fixed, the rest are recorded as accepted
  residue or handed to Phase 100's long-tail triage. The gate stays A2 ≤ 25 — no drive to zero.
- **D-17:** Claude runs the private harness at the phase boundary
  (`/home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`,
  about one minute). Only **numbers and message-group names with counts** are written into
  tracked files — no corpus file names, paths or source lines.

### Corrections after research (2026-09-20)
- **D-18:** Research plus a look at the flagged programs corrected two group descriptions. The
  `DEF FN` group is a multi-line function **without a closing `FNEND`** (body runs to end of
  file), not a header spread over continuation lines — fix at the root per D-01. The `LEN=`
  group is an assignment to a **variable named `LEN`**, i.e. a language word as a variable name,
  which D-04 leaves to Phase 100; it is handled under D-16 (fix only if trivial, otherwise
  recorded and handed to Phase 100) and this narrows D-15 accordingly. Details in
  `98-RESEARCH.md`, "Orchestrator Addendum".

### Claude's Discretion
- Exact lexer mechanism for the opaque `TABLE` data token, and AST node/property naming.
- How `RESTORE n`, `EXIT expr`, `LOAD`, `SAVE` are expressed in the grammar, as long as the AST
  is correct and no list-A or list-B regression appears.
- Whether the stricter conformance assertion extends `example-files.test.ts` or sits in a
  sibling test file — the convention (D-10, D-11) is what matters.
- Warning message wording for D-06 and D-07; existing tests that assert `error` for these
  checks are simply updated to the new severities.
- Plan split and ordering (by file count is the obvious default: TABLE first).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — "Phase 98" detail block (goal, five success criteria, ordering note);
  amended by this context commit (D-05, D-09)
- `.planning/REQUIREMENTS.md` — VALID-01..05, CONF-01, the Out-of-Scope table (no blanket
  reserved-word rule, no proprietary source text, no corpus/harness in this repo)
- `.planning/PROJECT.md` — "Current Milestone: v4.5 Compiler Conformance" (baseline, scoping
  decisions, measurement)
- `.planning/STATE.md` — "Active Constraints" (v4.5 entries, branch + PR landing, register-check)

### Measurement (private, outside this repository — read, never copy)
- `/home/coder/repos/bbj-corpus/conformance/REPORT.md` — section "A2. Valid code with a
  validation error, by message": the message groups and file counts this phase works down
- `/home/coder/repos/bbj-corpus/conformance/run.mjs`, `worker.mts` — how A2 is counted:
  error severity only, lexing/parsing/linking diagnostics and environment messages excluded
- `/home/coder/repos/bbj-corpus/conformance/details.json` — per-file first diagnostic, for
  triage (D-16)

### Project conventions
- `CLAUDE.md` — build/test commands, "Shell and File-Access Rules", the test-data convention

No external specs or ADRs — the compiler (`bbjcpl`) is the oracle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/validations/line-break-validation.ts` — `lineBreakMap` of
  `[predicate, mask]` entries (`before` / `after` / `both`), `isStandaloneStatement`,
  `previousStatement`/`getSiblings` walkers, `hasLinebreakBefore/After` regexes. It bails out
  when the document has parser errors, so it only ever sees "parses but wrong AST" input.
- `bbj-vscode/src/language/validations/check-variable-scoping.ts:308` —
  `checkConflictingDeclares(node: Program | MethodDecl, …)`: already receives the scope kind
  D-06 branches on; compares `getFQNFullname` strings case-insensitively, no resolution or
  subtype check today.
- `bbj-vscode/src/language/validations/check-classes.ts:204` — `checkMethodReturn`: the void
  and missing-`METHODRET` errors (D-07) and, separately, literal/type-mismatch checks that stay
  untouched. It already contains a supertype-closure helper that may serve D-06's "related
  types" test.
- `bbj-vscode/test/line-break-validation.test.ts`, `class-validations-issues.test.ts`,
  `validation.test.ts` — existing positive and negative cases (D-14).
- `bbj-vscode/test/example-files.test.ts` — the sequential, awaited parse loop to extend or
  mirror for the conformance folder (D-10, D-11).

### Established Patterns
- Grammar edits require `npm run langium:generate` (Node 22, not 24); never edit
  `src/language/generated/`. Chevrotain ambiguity warnings during generate are pre-existing.
- Grammar today: `RestoreStatement: 'RESTORE' lineref=LabelRef`; `GOTO`/`GOSUB`
  `target=LabelRef`; the exit rule uses `EXIT_NO_NL exitVal=Expression | kind='EXIT'`
  newline-sensitive tokens; `'SAVE' fileid=Expression (',' int=Expression)?`; `DefFunction`
  uses `RPAREN_NO_NL` / `RPAREN_NL` to tell single-line from multi-line — the multi-line
  header false alarm likely sits in that token pair or in the `isDefFunction` container test.
- Tests parse with `parseHelper` / `validationHelper`, not `DocumentBuilder.build` (CPL and
  interop contact, flaky locally, fails on GitHub).
- vitest needs cwd = `bbj-vscode`; judge the whole suite on `numFailedTests`; with
  BBjServices up, 11 `linking.test.ts` interop tests fail locally (environment, not
  regression) — green with `RUN_BBJ_TESTS=0`.
- BBj is case-insensitive — every regression group needs upper- and lower-case variants.

### Integration Points
- `bbj-vscode/src/language/bbj.langium` statement alternatives list (where `RestoreStatement`
  is registered) and `bbj-lexer.ts` / token builder for the opaque `TABLE` token.
- New AST node(s) may need entries in the document-symbol, semantic-token and hover providers
  only if they would otherwise misbehave — not a goal of this phase.
- `bbj-vscode/src/language/bbj-validator.ts` registers the checks; severities change there or
  in the check functions.

</code_context>

<specifics>
## Specific Ideas

- The A2 groups by size, for ordering: `TABLE` in its message variants (about 110 files),
  `RESTORE 0` (about 45), keyword-named `GOSUB` targets (12), multi-line `DEF FN` headers (11),
  single-line `IF`/`FI` forms (about 14), conflicting `DECLARE` (7), missing `METHODRET` (7),
  `EXIT expr` (4), `LOAD` (3), continued `LEN=` (3), void method returning a value (2),
  trailing-comma `PRINT` (2).
- Single-line IF shapes seen: a label in front of `IF ... THEN LET ...; GOTO label`; nested
  `IF ... THEN IF ... THEN ... FI`; `IF ... THEN RETURN ... FI` on one line.
- The user wants the in-method conflicting-`DECLARE` error kept on purpose: it is the one place
  where the language server knowingly says more than the compiler.

</specifics>

<deferred>
## Deferred Ideas

- Language words as variable names and in other non-branch positions — Phase 100 (PARSE-08).
- PRINT/INPUT item forms beyond the trailing-comma line-break symptom — Phase 100 (PARSE-04).
- Hex validation of `TABLE` data — not planned; the compiler endpoint (Phases 101-103) will
  report malformed tables.

### Reviewed Todos (not folded)
All four matched on generic keywords only and concern other subsystems:
- "linking.test.ts Interop related tests fail even after a targeted class warm-up" — test
  harness, tracked in `.planning/DEBT.md`.
- "A lost language-server connection is invisible to the plugin's crash detection" — IntelliJ
  server lifecycle, next-milestone candidate.
- "Phase 97 code-review follow-ups" — IntelliJ Node download.
- "The server status log line prints a stale previous status" — IntelliJ server lifecycle.

</deferred>

---

*Phase: 98-Line-Break & Validation False Alarms (A2)*
*Context gathered: 2026-09-20*
