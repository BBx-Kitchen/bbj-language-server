# Phase 99: Parser Gaps — the Largest Groups - Research

**Researched:** 2026-09-21
**Domain:** Langium 4 grammar/lexer (Chevrotain-generated LL(k) parser) and hand-written validators in a BBj language server — same domain as Phase 98, same files.
**Confidence:** HIGH for all four groups' root cause and fix mechanism — every claim below that describes *current* parser/validator behavior was reproduced this session with a throwaway vitest probe (`bbj-vscode/test/zz-probe-99.test.ts` + `zz-probe-99b.test.ts`, written and deleted this session, not present in the final tree — confirmed via `git status --porcelain` after deletion). Claims about the *recommended fix shape* are grammar-source-read plus reasoning by analogy to an existing, already-shipped precedent in this same grammar file (`'void'` in `FeatureName`) — HIGH confidence on the mechanism's *viability*, but the exact grammar diff is this research's recommendation, not yet executed or probed post-fix (that verification is the executor's Wave 0 job, per the existing Pattern 1 probe technique from 98-RESEARCH.md, reused here).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Scout finding, checked against the recorded failing lines of all 38 files: the parser accepts `READ RECORD(` and stops at `LEN=` inside the channel options with "Expecting token of type '='". The grammar has a fused keyword literal `'LEN='` (used only by the INPUT verifier form `var:(…,LEN=a,b)`); the lexer emits it wherever those four characters appear, and the `Option` rule (`key=ValidName '=' value=…`) then cannot match. The values seen after `LEN=` are a number and a plain numeric variable.
- **D-02:** **Root fix: unfuse `LEN=`.** `LEN` becomes an ordinary word followed by `=`. This must fix the channel-option position for `READ`, `EXTRACT`, `FIND`, `INPUT`, `PRINT` and `WRITE` with `RECORD` (spaced and fused spellings such as `READRECORD`), keep the INPUT verifier's `LEN=a,b` form parsing, and make `LEN` usable as a variable name (`LET LEN=5`, `len=…` in a multi-assignment). This takes the "variable named `LEN`" item that Phase 98 handed to Phase 100 (98 D-18) into this phase. `'IOL='` stays fused — no corpus file needs it changed; do not touch it unless the `IOLIST` work forces it.
  — **Reversibility:** costly — removing a token changes generated lexer/AST artifacts that Phase 100's item-form work builds on.
- **D-03:** The A2 side effect is **recorded, not gated**. The five Phase 98 residue files with `LEN`-related line-break messages are expected to clear (A2 about 27 → 22). Criterion 5 keeps "A2 at or below the Phase 98 number"; the boundary run names which A2 message groups disappeared, verified by file-set diff.
- **D-04:** Scout finding: every file of the roadmap's "label alone / label in front of a statement" group uses the literal word `label` as the name. A label with any other name already parses, alone or in front of a statement. `label` is a keyword through the library grammar (`'label' name=SymbolicLabelName`, used by the `.bbl` symbolic-label declarations) and does not fall back to an identifier the way most keywords do. Fix **only the word `label`, in all positions**: label declaration (alone, and directly followed by a statement with or without a space, including `;`-chained statements), `GOTO`/`GOSUB`/`ON … GOTO/GOSUB` target, and variable on the left of an assignment. Upper, lower and mixed case. The library grammar's symbolic-label declarations must keep working.
- **D-05:** If the natural root fix is a generic mechanism that also makes other library-grammar words usable as names, take it — but Phase 99 **tests and claims only `label`**. Any other word that starts working is recorded at the boundary run; Phase 100 still verifies its own list. No blanket reserved-word rule anywhere (REQUIREMENTS.md, Out of Scope).
- **D-06:** `ROADMAP.md` and `REQUIREMENTS.md` are amended as part of this context commit so the verifier checks the real shapes: Phase 99's goal line, success criteria 2, 3 and 5, the ordering note's file counts, PARSE-02 and PARSE-03. The generic shapes of the old wording (a label alone, a label in front of `ESCAPE`/`ENTER`/`IOLIST`, `READ RECORD` with options) stay in as cases that must parse. Phase 100's criterion 3 keeps `label` in its word list as a regression check; its "continued `LEN=`" hand-over is marked as taken by Phase 99.
- **D-07:** **Correct AST, no new editor features.** Both statements parse into a proper AST so the variables inside them link, highlight and complete like anywhere else. No new hover text, outline entry or validation. Providers (document symbols, semantic tokens, hover) are touched only if the new nodes would otherwise misbehave.
- **D-08:** The `FIELD` verb's three parts — record, name, value — are **plain expressions**. The name part occurs as a string variable, a string literal and a concatenated string expression; the value as any expression. No check of the name against the record's template: the compiler does not check it either.
- **D-09:** `FIELD` as the class-member declaration must be untouched, and the verb must work inside a method body as well as at program level. Required cases: **still flagged:** a class `FIELD` declaration without a type; a `FIELD` verb without `=value`; **still clean (keyword-as-identifier probes):** `field`/`fields` style variable names, identifiers ending or starting with the word (`myfield`, `fieldname$`, `nfield(...)`), and those followed by `to`/`step`/`then` (`for i=1 to nfield`). The same probe set applies to `iolist`, `len` and `label`.
- **D-10:** `IOLIST` items are **ordinary variable references** (scalars, strings, arrays with `[all]`, long lists over continuation lines). A program whose variables appear first or only in an `IOLIST` must get no new error-severity diagnostic from the scoping or use-before-assignment checks. `IOL=<label>` keeps linking to the label in front of the `IOLIST`. A standalone `IOLIST` without a label parses too.
- **D-11:** **B is not a gate, but every moved file needs evidence.** B may rise. Each newly-uncaught file is found by file-set diff against a snapshot of `details.json` taken before the run, and classified: *lost an accidental catch* (accepted; belongs to the compiler endpoint, Phases 101-103) or *a new grammar rule accepts an invalid form* (fix it or justify it). No cause is written down without the per-file look. Goes into `99-CONFORMANCE.md` as counts and own-words shapes only.
- **D-12:** The harness runs **after each group lands and once more after the last source change** (including code-review fixes), before any acceptance is asked for. Copy `details.json` to a phase-named snapshot before every full run — the harness overwrites it. Diff file sets, not totals. Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` (about one minute, no Java-interop contact).
- **D-13:** If A is still above 80 after the four groups (expected is roughly 167 → 56; a file can hide a second cause behind the first): list what the still-rejected files of these groups now stop at, fix what is trivially related to a change already made, hand the rest to Phase 100's long tail by message group. If A is still > 80 after that, stop for the user's decision — no Phase 100 group is pulled forward to reach the number.
- **D-14:** Only numbers, first-word/message groups with counts and own-words shape descriptions go into tracked files — no corpus file name, path or source line (as 98 D-17).
- **D-15:** Fix at the root in grammar and lexer; `npm run langium:generate` (Node 22) is part of the phase; never edit `src/language/generated/`.
- **D-16:** Regression files live in `bbj-vscode/test/test-data/conformance/`, one per construct group, named for the construct — `field-verb.bbj`, `record-verbs-len-option.bbj`, `label-word-as-name.bbj`, `iolist-statement.bbj` — hand-written minimal shapes with invented names, a leading `REM` stating in behaviour terms what the file protects, upper- and lower-case variants, no requirement/plan/decision ids in names or content. `conformance-regressions.test.ts` already asserts zero parse errors and zero error-severity diagnostics (linking excluded) for that folder.
- **D-17:** Each grammar rule or token touched gets at least one new "still flagged" case; the criterion is "no error on code the compiler accepts", never "no error".
- **D-18:** Any new keyword-triggered lexer token is anchored to statement start with a word boundary (start of line or `;`, optional line number and label). After each executor returns, the orchestrator runs a throwaway before/after `parseHelper` probe of the D-09 identifier cases and deletes it.

### Claude's Discretion
- How `LEN` is unfused — grammar literal split, token-builder change, or both — as long as D-02's three positions work and nothing on list A or A2 regresses.
- Whether the `FIELD` verb is a new statement rule with lexer help or a grammar-only disambiguation against `FieldDecl`; AST node and property names for both new statements.
- The mechanism that lets `label` be a name while the library grammar keeps its keyword.
- Plan split and order. By file count is the obvious default: `FIELD`, `LEN=`, `label`, `IOLIST` — with `IOLIST` after `label`, since all three corpus shapes sit behind a label.
- Whether `READ RECORD` sibling verbs need anything beyond the `LEN=` fix (the scout saw no other failure in the group; the researcher confirms with probes, including a variable such as `record_2` not being mistaken for the combined form).

### Deferred Ideas (OUT OF SCOPE)
- Unfusing `'IOL='` so a variable named `iol` works — same defect class as `LEN=`, no corpus file needs it; candidate for Phase 100's long tail if the triage finds one.
- Other library-grammar and language words as names (`text`, `vector`, `state`, `val`, …) — Phase 100 (PARSE-08), even if D-05's mechanism happens to cover some of them.
- A statement beginning with a `::file::Class.method()` static call — Phase 100 long-tail triage.
- `IOLIST` in the document outline / hover on `IOL=label`; a warning for a literal `FIELD` name missing from a known template — new capabilities, not planned in v4.5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PARSE-01 | `FIELD` used as a verb parses without lexer/parser errors | Root cause fully reproduced (probe): no `SingleStatement` alternative exists for the verb form at all — today `FIELD rec$,name$=value` parses as two stray `ExpressionStatement`s plus a genuine parser error at the first comma. Fix: a new `FieldStatement` alternative added to `SingleStatement`. See "FIELD verb" below. |
| PARSE-02 | Combined `RECORD` verbs' `LEN=` channel option parses, `LEN` usable as a variable name | Root cause fully reproduced (probe) and matches D-01 exactly: a fused keyword token `'LEN='` (global to the lexer, not scoped to its own grammar rule) consumes `LEN=` as one token, stranding the grammar's own required `'='`. Fix: unfuse the literal into `'LEN' '='` inside `LastVerifyOption` — a grammar-only, one-rule change that also makes `LEN` an ordinary uppercase keyword, so it gets the existing generic keyword-to-identifier fallback for free. See "LEN= channel option" below. |
| PARSE-03 | The word `label` works as a name in every listed position | Root cause fully reproduced (probe) and explained precisely: `bbj-token-builder.ts`'s generic keyword-to-`ID`-category loop only fires when the grammar-declared keyword text contains an uppercase letter (`/[A-Z]+(?!_)/`); `label` is written lowercase in `bbj.langium` (`LibSymbolicLabel: 'label' name=SymbolicLabelName`), so it is silently excluded — unlike `FIELD`/`IOLIST`/`LEN`, which are all uppercase and get the fallback automatically. This exact lowercase-exclusion mechanism already has one *fixed* precedent in this grammar: `'void'` (also lowercase) is explicitly listed as a `FeatureName` alternative. See "The word `label`" below for the recommended extension of that same pattern. |
| PARSE-07 | The `IOLIST` statement parses without errors | Root cause fully reproduced (probe): no grammar rule exists at all — `IOLIST a,b,c` today parses `IOLIST` as a bare `ExpressionStatement` (via the generic `ID` terminal, since `IOLIST` is not yet a keyword at all) and fails at the first comma. Fix: a new `IolistStatement` alternative, structurally identical in shape to the `FieldStatement` fix. See "IOLIST" below. |
</phase_requirements>

## Summary

All four groups are one-time, root-cause grammar edits to `bbj-vscode/src/language/bbj.langium`, in three distinct defect shapes already catalogued by Phase 98's research as the three ways this grammar silently mis-parses valid BBj:

1. **No grammar rule exists at all** (`FIELD` verb, `IOLIST`) — the keyword is either already an ordinary `ID`-category token (`FIELD`, because it's uppercase and reachable elsewhere in the grammar) or not a keyword at all yet (`IOLIST`, brand new); either way the parser falls back to `ExpressionStatement`, consumes just the bare word, and then reports a genuine parser error at the following comma. **Fix: add a new `SingleStatement` alternative** for each (`FieldStatement`, `IolistStatement`) — a plain `'KEYWORD' Expression (',' Expression)*`-shaped rule, no custom lexer token needed.

2. **A fused multi-character keyword literal eats a token that a sibling rule still needs** (`LEN=`). `'LEN='` is declared as one literal inside `LastVerifyOption` only, but Langium's token vocabulary is **global** — the lexer matches "LEN=" as one token wherever those four characters occur in the source, including inside the unrelated `Option` rule's own `key=ValidName '=' value=…` pattern used for `READ RECORD`'s channel options. The literal even contains an uppercase run, so it *also* picks up `CATEGORIES:[ID]` from the generic keyword-fallback loop — which is what lets it satisfy `Option`'s `key=ValidName` at all, before stranding the required `'='`. **Fix: delete the fused literal, split it into two ordinary grammar elements (`'LEN' '='`) inside the one rule that needs it.** Once split, `'LEN'` is an ordinary uppercase keyword and gets the *existing* generic fallback for free — no `bbj-token-builder.ts` change, no new custom token.

3. **A keyword's grammar-declared text is lowercase, silently opting it out of the codebase's own generic keyword-to-identifier fallback** (`label`). This is a *different* root cause from categories 1 and 2, and from every defect Phase 98 fixed — Phase 98's keyword-label-target defect was about *custom NL-sensitive tokens* winning a lexer priority race; this one is about a **case-sensitivity check inside `BBjTokenBuilder.buildTokens()`'s generic loop** (`/[A-Z]+(?!_)/.test(keywordToken.name)`), which tests the grammar's *declared* keyword text, not the case-insensitive runtime match. Every other keyword touched by this phase (`FIELD`, `LEN`, `IOLIST`) is written uppercase in `bbj.langium` and passes this test automatically; `label` (and `library`, `use`, `declare`, `auto`, `var`, `eventType`, `new`, `void`) are the only lowercase-declared keywords in the grammar, and all of them are excluded from the generic fallback for the same reason. This codebase has **already shipped the fix once**, for `void` (`FeatureName returns string: ID | ID_WITH_SUFFIX | 'void'`, with a comment explaining exactly this problem) — Phase 99's job is to apply the identical pattern to `label`, in the positions D-04 lists. **Fix: add `'label'` as an explicit literal alternative inside the grammar rules that need it** (`FeatureName` for the variable-assignment position; a new small `LabelName` rule shared by `LabelDecl.name` and `UserLabelRef`'s cross-reference for the declaration/branch-target positions) — no token-builder change, no `CATEGORIES` manipulation.

None of the four fixes needs a new *custom* lexer token (the `TABLE_DATA`/`RESTORE_NO_NL`-style opaque or NL-sensitive tokens Phase 98 introduced). D-18's "new keyword-triggered lexer token is anchored to statement start" therefore does not apply to any of this phase's four groups — it's a vacuous constraint here, not one to manufacture a lookbehind for. All four fixes are ordinary Chevrotain keyword/grammar-rule additions, resolved by the parser's normal LL(k) adaptive lookahead, the same mechanism that already disambiguates dozens of other keyword-vs-identifier cases in this grammar (confirmed empirically: `record_2` is never mistaken for `RECORD` today, `FIELD`/`field` already work fine as a bare identifier today).

**Primary recommendation:** implement in the file-count order CONTEXT.md suggests — `FIELD` (new `SingleStatement` alternative), `LEN=` (one-rule grammar split), `label` (two small grammar additions, reusing the `void` pattern), `IOLIST` (new `SingleStatement` alternative, structurally identical to `FIELD`'s) — reusing Phase 98's exact probe technique (`parseHelper`/`validationHelper` on synthetic snippets, printing `$type`s and diagnostics) before *and after* each grammar edit to confirm the fix, exactly as this research did to establish the baseline below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `FIELD`/`IOLIST` new statement grammar | Langium grammar (`bbj.langium`) | — | Pure new `SingleStatement` alternatives; no lexer/token-builder involvement needed (neither keyword needs a custom NL-sensitive or opaque token) |
| `LEN=` unfuse | Langium grammar (`bbj.langium`) | Lexer (automatic, via the existing generic keyword-to-`ID` loop) | The fix is deleting one fused literal and writing two ordinary grammar elements in its place; the resulting `LEN` keyword automatically inherits `CATEGORIES:[ID]` from code that already exists and needs no edit |
| `label` as a name | Langium grammar (`bbj.langium`) | — | Same fix *shape* as the already-shipped `'void'` precedent in `FeatureName` — a grammar-only addition, not a token-builder change; the lowercase-exclusion this works around lives in `bbj-token-builder.ts` but is not itself touched |
| Line-break "no error on the new statements" | Validator (`line-break-validation.ts`) | — | Verified this session: the existing generic `isStandaloneStatement` catch-all and its `isLabelDecl(previous)` exemption already cover both new statement shapes with **zero code change** — see "Line-break validation: no change needed" below |
| "No error-severity diagnostic for IOLIST-only variables" (D-10) | Validator (`check-variable-scoping.ts`) | — | Verified this session by reading `checkUseBeforeAssignment`: it only ever emits `'hint'` severity, never `'error'` — D-10 is satisfied with **zero code change**; see "check-variable-scoping.ts: no change needed" below |
| Conformance regression test harness | Test infra (`bbj-vscode/test/`) | — | Reuses the existing `test-data/conformance/` folder and `conformance-regressions.test.ts` shape from Phase 98 — no new test infrastructure needed, only new `.bbj` fixture files |

## Standard Stack

No new external packages. This phase touches only in-repo TypeScript/Langium source (`bbj-vscode/src/language/`) and test files (`bbj-vscode/test/`). `npm run langium:generate` (Node 22 — Node 24 is known to break this command, per prior-phase memory) regenerates `src/language/generated/{ast,grammar,module}.ts` from `bbj.langium` — a build step, not a dependency change.

**Version verification:** N/A — no packages added or bumped. Confirmed by reading `bbj-vscode/package.json`'s scripts section (`vitest: ^4.1.10`, matching the version actually observed running this session's probes) and the grammar/lexer source directly.

## Package Legitimacy Audit

Not applicable — this phase installs no packages.

## Architecture Patterns

### System Architecture Diagram

```
source text (.bbj)
      │
      ▼
BbjLexer.tokenize()                (bbj-lexer.ts)
  └─ prepareLineSplitter()         splices ':'-prefixed continuation lines into the
      │                             preceding physical line before tokenizing — this already
      │                             makes IOLIST's "long item list over continuation lines"
      │                             (D-10) transparent to the grammar; no new lexer work needed
      ▼
BBjTokenBuilder.buildTokens()      (bbj-token-builder.ts)
  ├─ buildKeywordTokens()          one token per DISTINCT keyword literal text, GLOBAL to the
  │    (langium's DefaultTokenBuilder)  whole grammar (Library + Program) — this is why the
  │                                fused 'LEN=' literal, declared inside LastVerifyOption only,
  │                                still hijacks "LEN=" wherever it appears in a Program file
  ├─ generic uppercase-keyword loop:  CATEGORIES=[ID] + LONGER_ALT=[ID_WITH_SUFFIX,ID] for every
  │    keyword whose DECLARED TEXT contains an uppercase run (/[A-Z]+(?!_)/), unless it's one of
  │    the 14 custom NL-sensitive tokens or {METHODEND,CLASSEND,INTERFACEEND} — FIELD, IOLIST
  │    (once added), and the unfused LEN all qualify automatically; 'label' (declared lowercase)
  │    does NOT qualify — this is the exact, sole root cause of the label defect
  └─ 3 explicit special-cases (RELEASE_NL/RELEASE_NO_NL/EXIT_NO_NL) for tokens that need the
       fallback despite having a custom PATTERN — precedent for "opt a token into the ID
       category by hand", NOT the mechanism this phase's label fix uses (see below)
      │
      ▼
Chevrotain-generated LL(k) parser  (generated/grammar.ts, from bbj.langium)
  ├─ SingleStatement OR-alternation: adaptive lookahead per alternative
  │    FIELD/IOLIST today: no alternative claims these keywords at all -> ID-category fallback
  │    consumes just the bare word as ExpressionStatement, next token (',') has no home -> a
  │    REAL parser error (not a silent wrong-AST, unlike Phase 98's RESTORE/EXIT cases)
  │    label today: keyword has NO ID category at all -> cannot satisfy ANY alternative's
  │    lookahead, including ExpressionStatement's SymbolRef -> Program's `Statements*` matches
  │    ZERO statements, "Expecting end of file but found `label`"
  └─ produces Program.statements[] (flat list; ';'-chains become CompoundStatement)
      │
      ▼
BBjDocumentValidator.validateDocument()  (bbj-document-validator.ts)
  ├─ checkLineBreaks()          bails if parserErrors > 0 (today's case for all 4 groups);
  │    once fixed, the new statements fall through cleanly to the generic
  │    isStandaloneStatement catch-all — verified, no lineBreakMap entry needed
  ├─ checkUseBeforeAssignment() only emits 'hint' severity — D-10 satisfied with no change
  └─ checkConflictingDeclares() unrelated (no DECLARE involved in any of the 4 groups)
      │
      ▼
Diagnostic[]
```

### Recommended Project Structure

```
bbj-vscode/
├── src/language/
│   └── bbj.langium                       # ALL FOUR fixes live here — see grammar diffs below
│       (bbj-token-builder.ts, bbj-lexer.ts: NOT touched — no custom lexer token needed for
│        any of the 4 groups; the generic uppercase-keyword loop and existing '=' terminal do
│        all the work once the grammar is right)
└── test/
    ├── test-data/conformance/            # 4 new fixtures, named per D-16:
    │   ├── field-verb.bbj
    │   ├── record-verbs-len-option.bbj
    │   ├── label-word-as-name.bbj
    │   └── iolist-statement.bbj
    ├── line-break-validation.test.ts     # optional — only if the executor's post-fix probe
    │                                       finds a gap in the generic catch-all (not expected,
    │                                       see "Line-break validation" below)
    └── (no other test file needs a change for D-07's provider question — see below)
```

### FIELD verb

**Current state (verified, probe):**
```
src: "field rec$,name$=dec(x$)\n"
types: [ 'ExpressionStatement', 'ExpressionStatement' ]
parserErrors: [ 'Expecting end of file but found `,`.' ]
```
`FIELD` is already `CATEGORIES:[ID]` today (it's written uppercase, and it's not one of the 14 custom/`EXCLUDED` tokens), so it's consumed as a bare `SymbolRef` `ExpressionStatement`, then the parser has nowhere to put the following `,` and errors. This same shape reproduces identically for every value/name-part variant tried (string literal, concatenation, negative number, `num(...)`), and inside a method body (`field-in-method-body` probe: 9 stray `ExpressionStatement`s, same trailing parser error).

`field=5` (bare identifier assignment) and `x=field+1` (bare identifier read) **already parse clean today** (0 parser errors) — confirming `FIELD` already has the generic fallback and this must be preserved.

**Recommended fix** (grammar-only, `bbj.langium`):
```
FieldStatement:
    'FIELD' record=Expression ',' name=Expression '=' value=Expression
;
```
Add `FieldStatement` to the `SingleStatement` alternation (alphabetically, between `ExitWithNumberStatement` and `FileOptStatement`; ordering is cosmetic, not load-bearing). `value=Expression` is **mandatory** (no `?`), so `FIELD rec$,name$` (no `=value`) continues to be a parser error — satisfying D-09's "still flagged: a `FIELD` verb without `=value`" for free.

**Why this doesn't collide with `FieldDecl` (the class-member declaration, D-09's other "must be untouched" requirement):** `FieldDecl` (`bbj.langium:365-367`) is reachable **only** through `ClassMember` (`FieldDecl | MethodDecl | VariableDecl`, used inside `ClassDecl`'s `(members+=ClassMember | Comments)*`) — a completely separate rule-call context from `SingleStatement`. Chevrotain never has to choose between the two at the same decision point; they are never alternatives in the same OR-group. Verified structurally by reading `bbj.langium` in full this session; the class-member form (`field-class-member` probe) parses with 0 errors both before this change and, by this non-interaction argument, after it. The "class `FIELD` declaration without a type" still-flagged case is **already** enforced today (probe `field-class-member-no-type`: 1 parser error, `type=QualifiedClass` is mandatory) and is untouched by this fix.

**Why the new alternative shouldn't introduce an ambiguity with plain assignment (`field=5`):** the two paths diverge at the very next token after `FIELD`. `FieldStatement`'s next symbol must start an `Expression` (identifier, literal, `(`, …) for the `record` part; the implicit-assignment path (`LetStatement`'s bare `Assignment`, which is what consumes `field=5` today) requires `FIELD` itself to be the `variable` and the *immediately following* token to be `=` (or `.`/`[`/`(` for a `MemberCall` continuation). `FIELD REC$,...` has an identifier — not `=` — right after `FIELD`, so only `FieldStatement` matches; `FIELD=5` has `=` right after `FIELD`, so only the assignment path matches. This is a plain 1-token discriminator, the same category of disambiguation this grammar already performs at dozens of other `SingleStatement` entry points; Chevrotain's default lookahead handles it without a custom lexer token. **Not empirically re-verified post-fix in this session** (grammar edits are out of scope for research) — the executor should re-run the FIELD probes immediately after adding the rule, per Phase 98's Pattern 1, before moving on; also probe `FIELD(1)` and `FIELD.x` (edge cases where `FIELD` participates in a `MemberCall` continuation) since these weren't tried this session.

### `LEN=` channel option

**Current state (verified, probe) — exact match to D-01's description:**
```
src: "READ RECORD(ch,LEN=10)a$\n"
types: [ 'ReadStatement' ]
parserErrors: [ "Expecting token of type '=' but found `10`." ]
```
Identical symptom reproduced for `read record(...)` (lowercase), `READRECORD(...)` (fused spelling), `EXTRACT RECORD`, `FIND RECORD`, `INPUT RECORD`, `PRINT RECORD`, `WRITE RECORD` — all six sibling verbs share the same `Options`/`Option` fragment (`bbj.langium:541-547`), so this is a **single shared defect**, not six separate ones.

`LET LEN=5` does **not** produce a parser error, but produces a **silently wrong AST** — `types: ['ExpressionStatement','ExpressionStatement','ExpressionStatement']` with three cascading line-break false alarms (`'This statement needs to end with a line break: LET'`, `'...needs to start in a new line: LEN='`, `'...needs to start in a new line: 5'`). This is the STATE.md-documented Phase-98 residue, now folded into this phase per D-02.

`a=1,len=2` (multi-assignment) fails identically to the channel-option case: `"Expecting token of type '=' but found `2`."` — same fused-token mechanism, different call site.

`READ(1)a$:(LEN=1,10)` (the INPUT verifier's own legitimate `LEN=a,b` form, `LastVerifyOption`'s intended use) **already parses clean today** (0 errors) — this is the one call site the fused literal was designed for, and must keep working after the unfuse.

**Root cause, precisely (read `bbj-token-builder.ts` and `token-builder.ts` this session):** Langium's `DefaultTokenBuilder.buildKeywordToken()` names every keyword token after its **exact declared literal text** (`tokenType.name = keyword.value`) and builds keyword tokens **once, globally**, deduplicated by text across the *entire* grammar (`buildKeywordTokens()`, `.distinct(e => e.value)`) — not scoped to the rule that declares them. `'LEN='` is declared only inside `LastVerifyOption` (`bbj.langium:657`), but the resulting 5-character keyword token competes for every occurrence of the literal text "LEN=" anywhere in any source file, including inside `Option`'s own `key=ValidName '=' value=…` (`bbj.langium:545-546`) used by the channel-options `Options` fragment. Since `'LEN='` contains an uppercase run, `BBjTokenBuilder`'s generic loop (`bbj-token-builder.ts:27-38`) also gives it `CATEGORIES:[ID]` and `LONGER_ALT:[ID_WITH_SUFFIX,ID]` — the `CATEGORIES:[ID]` is what lets it satisfy `Option`'s `key=ValidName` (a `ValidName`/`ID` consumption succeeds for any `ID`-category token), and `LONGER_ALT` doesn't rescue it because at the position of `LEN=10`, the plain `ID` terminal only matches `LEN` (3 chars) — **shorter** than the keyword's own 4-char match — so the keyword wins. The result: `key` becomes the token image `"LEN="` (with the `=` embedded), and `Option`'s own literal `'='` requirement is then stranded against the next real character, producing exactly D-01's "Expecting token of type '='" message.

**Recommended fix** (grammar-only, one rule, `bbj.langium:656-659`):
```
LastVerifyOption:
    ('LEN' '=' min=Expression ',' max=Expression)
    | min=Expression
;
```
Deleting the fused literal `'LEN='` and replacing it with the ordinary keyword `'LEN'` followed by the plain `'='` punctuation token (already used pervasively elsewhere in the grammar) removes the global 4-character keyword entirely; Langium will instead generate a plain 3-character `'LEN'` keyword token. Since `"LEN"` (all uppercase) satisfies the generic uppercase loop's regex test and is not one of the 14 custom/`EXCLUDED` tokens, it **automatically** gets `CATEGORIES:[ID]` + correct `LONGER_ALT` — no `bbj-token-builder.ts` change needed at all. This:
- fixes `Option`'s `key=ValidName '=' value=…` for all six sibling verbs (shared fragment, one fix covers all) — `LEN` now lexes as `ID`-category `LEN`, then a separate `'='` token, exactly matching `Option`'s expected shape;
- keeps `LastVerifyOption`'s own `LEN=a,b` form working, since the rule still requires the literal `'LEN'` then `'='` then two comma-separated expressions in sequence (**not independently re-verified post-fix this session** — flag as the one thing to re-probe first once the grammar edit lands, since it's the rule actually being edited);
- makes `LEN` usable as an ordinary variable everywhere `ID` is accepted (`LET LEN=5`, `a=1,len=2`) as a **side effect of the same one-line change**, satisfying the rest of D-02 with no extra grammar work.

**Still-flagged case to add (D-17):** a malformed verifier option that's missing the second expression (`:(LEN=1)`, only one value where the rule requires `min=Expression ',' max=Expression`) should continue to be a parser error after the fix — worth one explicit negative-case probe/test, since this rule is the one being edited.

**"a name such as `RECORD_2` not being mistaken for the combined form" (ROADMAP criterion 2, Claude's Discretion note):** verified this session — `record_2=5`, `x=record_2+1`, and `READ(1)record_2` all parse with 0 errors today. `RECORD` is an ordinary keyword (not a custom NL-sensitive token); Chevrotain's standard `LONGER_ALT` mechanism already prefers the 8-character `ID` match (`record_2`) over the keyword's 6-character match (`RECORD`) at that lexer position — this is the *normal*, already-correct behavior for every ordinary keyword in this grammar, not something the `LEN=` fix needs to additionally guard. No change required for this sub-case; it is not actually at risk.

### The word `label`

**Current state (verified, probe) — every position in D-04's list fails identically, total parse failure, not a fallback misparse:**
```
src: "label:\nPRINT \"x\"\n"
types: []
parserErrors: [ 'Expecting end of file but found `label`.' ]
```
Same `Expecting end of file but found` `[label|LABEL|Label]`, **zero statements parsed**, for: `label:` alone (any case), `label:escape` (same line, no space), `label: escape;exit` (chained), `LABEL: ENTER A$,B$`, `gosub label` / `goto label` (branch target), `LET X=0; GOTO LABEL` (chained), `on x goto label,other` (multi-target list), and `label=x+1` (plain assignment). This is qualitatively different from `FIELD`'s and `IOLIST`'s failure mode (those get a *partial* fallback parse plus a later error) — `label` cannot be consumed by **any** `SingleStatement` alternative, not even `ExpressionStatement`'s `SymbolRef`, so `Program`'s `Statements*` matches zero statements and the whole file is one giant leftover-token error.

By contrast, every other name **already parses today**, confirming D-04's "a label with any other name already parses" claim: `foo:` (`LabelDecl`, 0 errors), `foo:escape` (`LabelDecl` + `KeywordStatement`, 0 errors), `L30: enter a$` (`LabelDecl` + `EnterStatement`, 0 errors).

**Root cause, precisely (read `bbj.langium`, `bbj-token-builder.ts`, `node_modules/langium/src/parser/token-builder.ts` this session):** `DefaultTokenBuilder.buildKeywordToken()` sets `tokenType.name = keyword.value` — the token's name is the **literal text exactly as declared in the grammar**, case preserved (the `caseInsensitive: true` project setting, from `langium-config.json:12`, only affects the *matching regex*, not the declared name used for categorization). `BBjTokenBuilder`'s generic ID-category loop (`bbj-token-builder.ts:27-38`) tests `/[A-Z]+(?!_)/.test(keywordToken.name)` — this passes for `FIELD`, `LEN`, `IOLIST`, `READ`, `RESTORE`, etc. (all declared uppercase in the main grammar) but **fails** for every keyword declared lowercase: `library`, `use`, `declare`, `auto`, `var`, `eventType`, `new`, `void`, and **`label`** (`LibSymbolicLabel: 'label' name=SymbolicLabelName`, `bbj.langium:924-927`). A keyword token without `CATEGORIES:[ID]` cannot satisfy any grammar position that consumes an `ID`-category token — every reference/declaration position in this grammar (`ValidName`, `FeatureName`, cross-references typed by either) — so `label` cannot be a `SymbolRef`, a `LabelDecl` name, or a `LabelRef` target, anywhere, in any case.

**This is a *different* defect class from every keyword-label-target fix in Phase 98.** Phase 98's D-04 fix was about *custom, NL-sensitive lexer tokens* (`PRINT_STANDALONE_NL`, `KEYWORD_STANDALONE`, etc.) winning the lexer's *priority race* over an already-`CATEGORIES:[ID]`-tagged plain keyword at a specific trigger position (end-of-line, `;`) — those keywords (`PRINT`, `SAVE`, `RESTORE`, …) are all uppercase and *do* have the generic fallback; the problem was a second, higher-priority token intercepting them. `label` has no such competing custom token at all — it simply never enters the fallback loop in the first place, because of the case check, not a priority race. The `BRANCH_TARGET_EXCLUSION` lookbehind mechanism Phase 98 built is therefore **not applicable** to this defect and should not be reused for it.

**This exact defect (lowercase-declared keyword excluded from the generic fallback) has already been fixed once, for `void`.** `FeatureName` (`bbj.langium:886-891`) reads:
```
FeatureName returns string:
    // 'void' is a keyword only for a method's void-return marker (MethodDeclStart), which uses
    // ValidName for the method name — so it never conflicts here. Allowing it as a FeatureName
    // lets `void` be used as an ordinary (numeric) variable/field/member name (#439).
    ID | ID_WITH_SUFFIX | 'void';
```
This establishes the exact, already-shipped, in-repo precedent for how to fix a lowercase-declared keyword's usability as a name in this codebase: **list the keyword literal as an explicit alternative inside the specific grammar rule(s) that need it to be usable there** — not a `bbj-token-builder.ts` `CATEGORIES` special-case (the mechanism used for `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL`, which is for tokens that *do* have a custom `PATTERN` function but still need the fallback — a different situation from a plain keyword that's merely lowercase).

**Recommended fix** (grammar-only, two small additions to `bbj.langium`):

1. **Variable-assignment position** (`label = x + 1`, and any other `FeatureName`-typed position, e.g. reading `label` in an expression) — extend `FeatureName` exactly as `'void'` was added:
```
FeatureName returns string:
    ID | ID_WITH_SUFFIX | 'void' | 'label';
```
   `Assignment.variable=MemberCall` resolves through `SymbolRef.symbol=[NamedElement:FeatureName]`, so this one addition covers reading and writing `label` as a plain variable everywhere `SymbolRef` is used.

2. **Label-declaration and branch-target positions** (`label:`, `label:escape`, `gosub label`, `on x goto label,other`) — `LabelDecl.name` and `UserLabelRef`'s cross-reference are currently typed by `ValidName` (`returns string: ID`), not `FeatureName`; widening the shared `ValidName` directly would also let `label` be used as a `ClassDecl`/`MethodDecl`/`LibFunction`/`LibVariable` name (every other `ValidName` call site) — a broader blast radius than D-04 asks for. **Recommended: a new, narrowly-scoped datatype rule**, mirroring `FeatureName`'s own style:
```
LabelName returns string:
    ID | 'label';
;
```
   and change exactly two lines:
```
LabelDecl returns LabelDecl:
    name=LabelName':'
;
```
```
UserLabelRef infers LabelRef:
   {infer UserLabelRef} label=[LabelDecl:LabelName]
;
```
   This is structurally the same technique Langium already uses for `READ_KINDS`/`READ_RECORD_KINDS` (`returns string: 'READ' | 'INPUT' | ...`) — a plain OR of terminal/keyword alternatives usable both as a plain rule and as a cross-reference type. **Not independently re-verified this session** that a cross-reference typed by a rule containing a keyword-literal alternative compiles and resolves correctly (only `FeatureName`'s existing use as a cross-reference type for `SymbolRef` was confirmed by probe, and that rule doesn't currently include a *pure-keyword* alternative in a position analyzed here) — flag as the first thing to probe once this grammar edit lands. If it does not work as expected, the fallback is widening `ValidName` directly (simpler, larger blast radius, still permitted by D-05's "generic mechanism" allowance) — Claude's Discretion, not locked by CONTEXT.md.

**Why the library grammar's `label` keyword (`LibSymbolicLabel`) keeps working:** neither change above touches `LibSymbolicLabel` (`bbj.langium:924-927`) or its own consumption of the literal `'label'` token. Since keyword tokens are deduplicated by *text* (not by rule), `'label'` remains a single shared token type; `LibSymbolicLabel`'s own grammar position still requires an exact-type match against that same token (unaffected by which *other* rules also list it as an alternative). Verified this session: `bbj-vscode/src/language/lib/labels.bbl` uses the lowercase `label *NAME` form 12 times (`*PROCEED`, `*NEXT`, `*SAME`, `*RETRY`, `*BREAK`, `*CONTINUE`, `*ESCAPE`, `*RETURN`, `*STOP`, `*END`, `*EXIT`, `*ENDIF`) and is loaded by every probe in this session via `initializeWorkspace()` (all probes passed, meaning this file parses clean at the *current* baseline) — the executor should re-run the full suite (which parses this file on every workspace init) as the regression check for this specific D-04 requirement, not a bespoke new test.

**Why this doesn't create a new LL(k) ambiguity for `label:` vs. `label:x$` (a `StringMask` expression, `Expression: BinaryExpression ({infer StringMask.left=current} ':' right=Expression)?`):** this ambiguity already exists generically for *every* name in this grammar (any `foo:x$` is structurally ambiguous between `LabelDecl` "foo:" + a following statement "x$", and a `StringMask` expression "foo : x$") and is already resolved today by `LabelDecl` appearing earlier than `ExpressionStatement` in the `SingleStatement` alternation, confirmed by Phase 98's own research ("`PRINT:\n` and `SAVE:\n` both parse as `LabelDecl` today") and re-confirmed this session (`other-name-label-decl` probe: `foo:\nprint "x"\n` → `['LabelDecl','PrintStatement']`, 0 errors). Extending `label` to participate in the same `LabelDecl`/`FeatureName` machinery inherits this exact same, already-working resolution — no new risk category.

### IOLIST

**Current state (verified, probe):**
```
src: "iolist a$,b$\n"
types: [ 'ExpressionStatement', 'ExpressionStatement' ]
parserErrors: [ 'Expecting end of file but found `,`.' ]
```
Same shape as `FIELD`'s failure — `iolist` is not yet a keyword at all (it lexes via the plain `ID` terminal, since no grammar rule mentions it), so it parses as a bare `SymbolRef` `ExpressionStatement`, and the parser has nowhere to put the following `,`. Identical result for `recio: IOLIST A$,B$,C,D[ALL]` (behind a named label — `['LabelDecl','ExpressionStatement','ExpressionStatement']`) and `L30: iolist a,b,c` (behind a numeric label).

`iolist=5` and `x=iolist+1` **already parse clean today** (0 errors, since "iolist" is currently just a plain identifier, no keyword collision yet) — this must be preserved once `IOLIST` becomes a real keyword.

**Recommended fix** (grammar-only, structurally identical to `FieldStatement`):
```
IolistStatement:
    'IOLIST' items+=Expression (',' items+=Expression)*
;
```
Add to `SingleStatement` (alphabetically, between `InitFileStatement` and `KeyedFileStatement`). `Expression` already covers every item shape D-10 asks for — a plain scalar/string `SymbolRef`, and an array-with-`[ALL]` via `MemberCall`'s `ArrayElement` postfix (`"[" (all?="ALL" | indices+=Expression ...) "]"`, `bbj.langium:806`) — no separate item-type rule is needed; `D[ALL]` parses through the exact same `MemberCall` path every other `[ALL]` usage in this grammar already uses. `items+=Expression (',' items+=Expression)*` requires **at least one** item (not optional), so a bare `IOLIST` with no items continues to be a parser error — a natural D-17 "still flagged" case.

Since `IOLIST` will be declared uppercase, it automatically qualifies for the generic `CATEGORIES:[ID]` fallback loop the same way `FIELD` already does — `iolist=5`/`x=iolist+1` should keep working post-fix by the same mechanism already confirmed for `FIELD`. **Not independently re-verified post-fix this session** — first thing to re-probe once the grammar edit lands.

`IOL=<label>` linking (D-10's other requirement) is **unrelated machinery** — `OtherItem`'s existing `'IOL=' iol=LabelRef` (`bbj.langium:605`, deliberately kept fused per D-02/Deferred Ideas) resolves against any `LabelDecl`, and a label in front of an `IOLIST` is an ordinary `LabelDecl` like any other (confirmed working today, independent of whether `IOLIST` itself parses) — once `IolistStatement` parses without a parser error, `read-iol-link`'s only remaining failure mode was the same trailing-comma parser error as the bare-`IOLIST` case (probe: `recio: IOLIST A$,B$\nREAD(1)IOL=RECIO\n` → same `Expecting end of file but found `,`.`), so no separate fix is needed for this sub-case.

### Line-break validation: no change needed (verified by reading `line-break-validation.ts` in full this session)

`lineBreakMap`'s catch-all entry, `[isStandaloneStatement, {before:false, after:false, both:true}]` (`line-break-validation.ts:49-53`), applies by default to any `Statement` not matched by an earlier, more specific entry — `FieldStatement` and `IolistStatement` will not match any of the earlier entries (`isFieldDecl`, `isMethodDecl`, `isBbjClass`, `isLibMember`, `ifStatementLineBreaks`, `elseStatementLineBreaks`, `ifEndStatementLineBreaks`, `compoundStatementLineBreaks` — none of these predicates apply to either new node type), so they fall straight through to the generic catch-all, which is exactly the ordinary "needs a line break before and after unless it's chained by `;` or immediately preceded by a label" rule every other plain statement already gets. Two specific D-04/D-10 shapes are covered by mechanisms **already present**, verified by reading the code:
- **`label:iolist ...` / `label:escape;exit` (label immediately followed by a statement, same line, D-04's requirement):** `isStandaloneStatement()`'s own first check, `if (isLabelDecl(node) || isLabelDecl(previous)) return false;` (`line-break-validation.ts:121-123`), exempts *any* statement immediately preceded by a `LabelDecl` from the "both" requirement — this is a generic, name-independent mechanism already exercised by Phase 98's `TABLE`/`RESTORE` regression files behind a label; it needs no new code for `label` specifically (the fix is entirely in the grammar layer that lets `label:` parse as a `LabelDecl` at all) and none for `IolistStatement`/`FieldStatement` either.
- **A `FieldStatement`/`IolistStatement` chained via `;` inside a `CompoundStatement`:** `isStandaloneStatement`'s `isCompoundStatement(node.$container)` check (`line-break-validation.ts:125`) already exempts any statement inside a `CompoundStatement` from the generic requirement, independent of statement type.

**No `lineBreakMap` entry, no new mask function, no `line-break-validation.ts` edit is expected for this phase.** The executor should still add one or two "still clean" cases to `line-break-validation.test.ts` covering `label:iolist a,b,c` and a chained `field ...;field ...` line, per D-17's spirit, but as new test *cases*, not new validator *logic* — confirm with a post-fix probe before assuming this holds (the reasoning above is grounded in reading the current code, but was not re-run against the new grammar rules in this session, since grammar edits are out of scope for research).

### `check-variable-scoping.ts`: no change needed for D-10 (verified by reading the file in full this session)

`checkUseBeforeAssignment()` (`check-variable-scoping.ts:97-286`) is the only check that could plausibly flag a variable "first seen" in an `IOLIST`. Its `accept()` call (line 279) is hard-coded to `'hint'` severity — never `'error'`, never `'warning'`. D-10's requirement is "no new **error-severity** diagnostic" — a `'hint'` categorically satisfies this without any code change, and Phase 98's own `CONF-01` diagnostic filter (`severity === DiagnosticSeverity.Error && d.data?.code !== DocumentValidator.LinkingError`, reused unchanged by `conformance-regressions.test.ts`) does not even look at hints, so a regression file containing an `IOLIST`-only variable cannot fail `CONF-01` on this account either way. Separately, and independently: `checkUseBeforeAssignment`'s Pass 1 (which *records* first-assignment positions) has no special case for `IolistStatement` or `FieldStatement` at all — a variable that appears *only* inside an `IOLIST` (never `LET`/`DIM`/`DREAD`/`READ`/`ENTER`/`FOR`-assigned) is never added to `declPositions`, so Pass 2's "skip if the variable is not in our declaration map" (line 268) silently skips it — **zero diagnostic of any severity**, not even a hint, for the common IOLIST-only-variable case. `checkConflictingDeclares` is unrelated (no `DECLARE`/`VariableDecl` involvement in either new statement).

**Recommendation: do not add any special-casing to `check-variable-scoping.ts` for this phase.** If the executor's post-fix probe finds an actual `'error'`-severity diagnostic on an `IOLIST`/`FIELD` fixture (not expected, per the above), re-open this file — but expect none.

### Providers (document symbols, semantic tokens, hover, completion) — no change needed (D-07)

Read this session: `bbj-document-symbol-provider.ts` is fully generic (`AstUtils.streamContents`/`streamAllContents`, guarded by `'name' in astNode` checks, try/catch per node) — since neither `FieldStatement` nor `IolistStatement` declares a `name` property, neither produces an outline entry, matching D-07's "no new outline entry" *for free*, not as something to suppress. `bbj-semantic-token-provider.ts`'s `highlightElement()` is a `switch (node.$type)` with **no default case** (safe fall-through for unmatched types) over exactly four types (`ParameterDecl`, `SymbolRef`, `MethodCall`, `Assignment`) — the `SymbolRef` nodes *inside* `FieldStatement`'s/`IolistStatement`'s expression trees are still individually visited and highlighted normally (semantic tokens are computed per-node via a generic tree walk, not gated on the parent statement's type), so variable references inside the new statements get ordinary highlighting automatically. `bbj-type-inferer.ts` has no `switch`/exhaustive dispatch over statement types (confirmed via grep) — safe. No grep hit for `FieldDecl`/`FieldStatement`/`IolistStatement` in `bbj-hover.ts`, `bbj-completion-provider.ts`, or `bbj-inlay-hint-provider.ts` beyond the pre-existing `FieldDecl` (class member) handling, which is untouched by this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Letting a lowercase-declared keyword act as a name | A `bbj-token-builder.ts` `CATEGORIES`/lookbehind special-case (the `RELEASE_NL`/`EXIT_NO_NL` pattern, or the Phase 98 `BRANCH_TARGET_EXCLUSION` lookbehind) | List the keyword literal as an explicit alternative inside the grammar rule(s) that need it (`FeatureName`, a new `LabelName`) — the exact pattern already shipped for `'void'` | This is a *different* defect (a case-check in the generic keyword-fallback loop, not a lexer priority race against a custom NL-sensitive token) with its own already-working, in-repo fix shape; reusing the Phase 98 mechanism for a defect it wasn't built for adds complexity without need |
| Recognizing `[ALL]` array items inside `IOLIST` | A dedicated `IolistItem` rule mirroring `InputItem`/`OutputItem` | Plain `Expression` — `MemberCall`'s existing `ArrayElement` postfix already parses `D[ALL]` | D-10 asks only for "ordinary variable references"; `Expression` already covers scalars, strings, and `[ALL]` arrays via machinery every other statement in this grammar already shares — a dedicated item rule would duplicate it for no behavioral gain |
| Filtering a `CONF-01` regression file's diagnostics | A new ad hoc diagnostic filter | The exact filter `conformance-regressions.test.ts` already has (`severity === DiagnosticSeverity.Error && d.data?.code !== DocumentValidator.LinkingError`) | Unchanged from Phase 98 — this phase adds fixture files to the same folder, not new test infrastructure |

**Key insight:** every one of this phase's four defects has a mechanism-level twin already present and working somewhere else in this exact grammar (`FIELD`'s bare-identifier fallback mirrors `RESTORE`'s from Phase 98; `LEN=`'s fused-literal defect is a smaller instance of the same "global token vocabulary" fact that made Phase 98's `TABLE_DATA` design deliberately avoid `CATEGORIES:[ID]`; `label`'s lowercase-exclusion has a shipped fix in `'void'`; `IOLIST`'s missing-rule shape mirrors `TABLE`'s pre-Phase-98 state exactly). The research effort for this phase was almost entirely about locating each twin, not inventing new mechanism.

## Runtime State Inventory

Not applicable — this is a grammar/lexer/validator + regression-test phase, not a rename, refactor or migration. No stored data, live service config, OS-registered state, secrets, or build artifacts carry any of the affected keywords (`FIELD`, `LEN`, `label`, `IOLIST`) in a way a source-code change would leave stale.

## Common Pitfalls

### Pitfall 1: A fused multi-character keyword literal is global to the lexer, not scoped to the rule that declares it
**What goes wrong:** Assuming a keyword literal like `'LEN='`, written inside one specific rule (`LastVerifyOption`), only affects parsing *at that rule's call sites*.
**Why it happens:** `DefaultTokenBuilder.buildKeywordTokens()` collects every keyword literal from the *entire reachable grammar*, deduplicated by text, into one flat, global token vocabulary (`node_modules/langium/src/parser/token-builder.ts:116-125`) — the lexer has no concept of "which rule is currently being parsed" when it tokenizes; tokenization happens once, up front, for the whole document.
**How to avoid:** before declaring any new multi-character fused literal (or leaving an existing one in place), search the *whole* grammar for other places the same character sequence could legitimately occur as two or more separate tokens (an identifier followed by punctuation) — if any exist, the fused literal will silently hijack them.
**Warning signs:** a parser error whose message names a token type that "shouldn't be relevant" to the statement being parsed (e.g. `LastVerifyOption`'s `LEN=` token surfacing inside `READ RECORD`'s unrelated `Option` rule) — that mismatch is the signature of this failure mode.

### Pitfall 2: A keyword's case in the `.langium` source, not its case-insensitive runtime match, decides whether it gets the generic identifier fallback
**What goes wrong:** Assuming `caseInsensitive: true` (`langium-config.json`) makes every keyword behave identically regardless of how it happens to be spelled in the grammar file.
**Why it happens:** `caseInsensitive` only changes the *matching regex* Langium builds for each keyword (`DefaultTokenBuilder.buildKeywordPattern`); it does not change `tokenType.name`, which stays the literal grammar-declared text (`token-builder.ts:130`: `name: keyword.value`). `BBjTokenBuilder`'s own generic ID-category loop (`bbj-token-builder.ts:28`) tests that declared-text `name`, so a keyword's *source-file casing* — not its match-time casing — silently gates whether it can ever be used as an identifier anywhere in the grammar.
**How to avoid:** when a keyword needs to double as an identifier/name and the fix isn't working, check how the keyword literal is *spelled inside `bbj.langium`* before assuming a lexer-priority problem (Phase 98's category) — `grep -noE "'[a-z][a-zA-Z]*'" bbj.langium` finds every keyword at risk of this specific exclusion (this session: `use`, `auto`, `declare`, `void`, `new`, `library`, `var`, `label`, `eventType` — `void` is the only one already fixed).
**Warning signs:** a keyword-as-identifier probe reports **total parse failure** (`Program` matches zero statements, "Expecting end of file but found `<keyword>`") rather than a partial fallback misparse — that specific shape (empty `statements` array) is the signature of "this token has no `ID` category at all," distinct from Phase 98's "wrong but non-empty AST" signature for tokens that *do* have the category but lose a lexer priority race.

### Pitfall 3: Declaring a plain identifier-and-comma-list statement doesn't need a custom lexer token
**What goes wrong:** Reflexively reaching for a `TABLE_DATA`-style opaque/NL-sensitive custom token (Phase 98's Pattern 3, D-18's anchoring requirement) for every new statement keyword.
**Why it happens:** Phase 98's most memorable fixes (`TABLE`, `RESTORE`) needed custom tokens because their content was either genuinely unstructured (opaque hex data) or needed an NL-sensitive optional trailing argument. `FIELD` and `IOLIST` have neither property — their arguments are ordinary, already-well-formed `Expression`s, and Chevrotain's standard LL(k) alternation already disambiguates the keyword-vs-identifier question from the very next token, the same way it does for the dozens of existing plain-keyword statements in this grammar.
**How to avoid:** only add a custom token when (a) the statement's content can't be expressed as ordinary grammar rules (opaque data), or (b) an optional trailing/leading element creates a genuine grammar ambiguity a fixed-lookahead LL(k) parser can't resolve on its own (an NL-sensitive "is there more, or does the statement end here" choice). Neither applies to `FieldStatement` or `IolistStatement`.
**Warning signs:** reaching for `bbj-token-builder.ts` before writing the grammar rule and running a probe against it.

### Pitfall 4: A validator whose only output is `'hint'` severity cannot violate an "error-severity" constraint, however it's wired
**What goes wrong:** Pre-emptively adding IOLIST/FIELD special-casing to `check-variable-scoping.ts` to satisfy D-10, before checking what severity the existing check actually emits.
**Why it happens:** D-10's wording ("no new error-severity diagnostic") reads like it demands validator logic; reading `checkUseBeforeAssignment`'s single `accept('hint', ...)` call site (line 279) shows the constraint is already structurally impossible to violate through this check, regardless of which statements introduce a variable's first appearance.
**How to avoid:** read the actual severity argument passed to `accept()` in the specific check named by a requirement before assuming code needs to change — grep `accept('error'` / `accept('warning'` / `accept('hint'` in the file first.
**Warning signs:** a plan task that adds `isIolistStatement`/`isFieldStatement` branches to `check-variable-scoping.ts` with no corresponding probe showing an actual error-severity diagnostic being produced today.

## Code Examples

### Probing a construct's current AST and diagnostics (Phase 98's technique, reused verbatim this session)
```typescript
// Source: this session, ad hoc — not from official docs. Delete before finishing the plan/wave.
import { EmptyFileSystem } from 'langium';
import { describe, test } from 'vitest';
import { parseHelper, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);
await initializeWorkspace(services.shared);
const parse = parseHelper<Program>(services.BBj);
const validate = validationHelper<Program>(services.BBj);

describe('probe', async () => {
    test('field-basic', async () => {
        const src = 'field rec$,name$=dec(x$)\n';
        const parsed = await parse(src);
        const validated = await validate(src);
        console.log((parsed.parseResult.value as any).statements.map((s: any) => s.$type));
        console.log(parsed.parseResult.parserErrors.map(e => e.message));
        console.log(validated.diagnostics.map(d => `[${d.severity}] ${d.message}`));
    });
});
```
Run: `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/<scratch>.test.ts --reporter=verbose --silent=false` (the `--reporter=verbose --silent=false` flags are required — vitest suppresses `console.log` on a passing test otherwise). **Never use `--reporter=basic`** — not present in this project's vitest 4.1.10. **Delete the scratch file before finishing** — register-check scans for stray files, and it must not appear in the final diff.

### The already-shipped precedent this phase's `label` fix follows exactly
```langium
// Source: bbj-vscode/src/language/bbj.langium:886-891, read this session (existing code, not new)
FeatureName returns string:
    // 'void' is a keyword only for a method's void-return marker (MethodDeclStart), which uses
    // ValidName for the method name — so it never conflicts here. Allowing it as a FeatureName
    // lets `void` be used as an ordinary (numeric) variable/field/member name (#439).
    ID | ID_WITH_SUFFIX | 'void';
```

### CONF-01 diagnostic filter (unchanged from Phase 98, reused as-is)
```typescript
// Source: bbj-vscode/test/conformance-regressions.test.ts, read this session (existing code)
import { DocumentValidator } from 'langium';
import { DiagnosticSeverity } from 'vscode-languageserver';

const errorDiagnostics = result.diagnostics.filter(d =>
    d.severity === DiagnosticSeverity.Error &&
    d.data?.code !== DocumentValidator.LinkingError
);
expect(result.document.parseResult.lexerErrors, `${file}: lexer errors`).empty;
expect(result.document.parseResult.parserErrors, `${file}: parser errors`).empty;
expect(errorDiagnostics, `${file}: validation errors`).empty;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `LEN=` a fused 5-character keyword literal inside `LastVerifyOption` only | `'LEN'` an ordinary keyword + plain `'='` punctuation, shared by every rule that needs it | This phase | Fixes `READ RECORD`/`EXTRACT RECORD`/`FIND RECORD`/`INPUT RECORD`/`PRINT RECORD`/`WRITE RECORD`'s `LEN=` channel option (all six, one fix) and makes `LEN` a usable variable name, as a side effect of the same change |
| `label` unusable as any kind of name anywhere (lowercase-declared keyword, excluded from generic ID-category fallback) | `label` usable as a variable, a label declaration and a `GOTO`/`GOSUB` target, via two grammar additions mirroring the existing `'void'` fix | This phase | `FeatureName` gains its second lowercase-keyword alternative (`'void'`, now `'void' \| 'label'`); a new `LabelName` rule is introduced, used only by `LabelDecl`/`UserLabelRef` |
| No `FIELD`-verb / `IOLIST` statement rule exists | Two new `SingleStatement` alternatives, `FieldStatement` and `IolistStatement` | This phase | Both constructs parse into a proper AST whose variable references link/highlight/complete normally, per D-07 |

**Deprecated/outdated:** none — this phase is additive/corrective, not a migration away from a prior approach.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `FieldStatement`'s and `IolistStatement`'s 1-token discriminator (identifier-start vs. `=`) resolves cleanly under Chevrotain's default adaptive lookahead with no grammar ambiguity warning and no custom lookahead gate needed | "FIELD verb", "IOLIST" | If Chevrotain reports an ambiguity (unlikely, given the discriminator is a single very distinct token class), the executor needs an explicit `GATE`/reordering, adding a small amount of unplanned work — not a design failure, just unbudgeted effort |
| A2 | A Langium cross-reference (`[LabelDecl:LabelName]`) typed by a datatype rule that mixes a terminal reference (`ID`) with a pure keyword-literal alternative (`'label'`) compiles and resolves the same way `[NamedElement:FeatureName]` already does (`FeatureName` mixes `ID`/`ID_WITH_SUFFIX` terminal refs with `'void'`) | "The word `label`" | If it doesn't work identically for a *keyword-only-or-ID* rule vs. `FeatureName`'s *two-terminal-plus-one-keyword* rule, the fallback (widen `ValidName` directly, broader blast radius but same generic mechanism, permitted by D-05) is a same-session pivot, not a new investigation |
| A3 | The `LEN` unfuse's grammar-only fix (no `bbj-token-builder.ts` change) fully resolves D-02's three positions with no residual edge case (e.g. a `LEN=` immediately adjacent to a suffix character, `LEN$=`, which is not a real BBj shape but worth one negative probe) | "`LEN=` channel option" | If an edge case surfaces, it is a `bbj-token-builder.ts` special-case addition (like the existing `RELEASE_NL`/`EXIT_NO_NL` ones) — a larger, second-tier fix, not a redesign |
| A4 | No `line-break-validation.ts` or `check-variable-scoping.ts` code change is needed for D-07/D-10 (both sections above conclude "no change needed" from reading the current code, not from probing the *new* grammar rules, which don't exist yet) | "Line-break validation: no change needed", "`check-variable-scoping.ts`: no change needed" | If a post-fix probe finds a gap, it is a small, well-understood fix in a file this research has already fully read and mapped — low risk, but flagged since it's not empirically closed |

## Open Questions

1. **Exact grammar-diff line numbers will shift once earlier fixes in the same file land.**
   - What we know: all four fixes touch `bbj.langium`, and the file-count plan order (`FIELD`, `LEN=`, `label`, `IOLIST`) means each subsequent fix's line numbers cited above will have moved by the time it's implemented.
   - What's unclear: nothing structurally — this is a sequencing note, not a defect.
   - Recommendation: the planner should treat every line number cited in this research as "as of this session's baseline," not literal; each plan should re-locate its target rule by name/content, not by line number.

2. **Whether Chevrotain reports a grammar-build-time ambiguity warning for `FieldStatement`/`IolistStatement` (chevrotain-ambiguity-warnings are documented elsewhere in this project as often benign/pre-existing).**
   - What we know: per prior-session memory, this project already has pre-existing Chevrotain ambiguity warnings considered benign; `npm run langium:generate`'s output should be diffed before/after each grammar change to confirm no *new* warning appears (as opposed to the pre-existing ones).
   - What's unclear: whether adding these two new alternatives introduces a genuinely new one.
   - Recommendation: capture `langium:generate`'s full output before the FIELD/IOLIST plans and diff it after, not just check for "any warning present."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm run langium:generate`, `npm test` | Project convention: Node 22 (Node 24 breaks `langium:generate`, per prior-phase memory) | Not re-verified this session (no grammar edits made; this session used the pre-generated `generated/ast.js` as-is) | Pin Node 22 before running `langium:generate` |
| vitest | All test runs this phase | Yes — used directly and repeatedly this session | v4.1.10 (confirmed by this session's own test-run banner and `package.json`) | — |
| java-interop (`:5008`) | NOT required for this phase's tests | N/A | — | All probes this session used `EmptyFileSystem` + `parseHelper`/`validationHelper` with `RUN_BBJ_TESTS=0`; the private conformance harness run (D-12) happens separately, outside `npm test` |
| BBjServices (`:8888`) / `bbjcpl` | NOT required for this phase's own in-repo tests; only for the phase-boundary conformance harness run (D-12, outside this repo) | N/A to in-repo tests | — | The private harness run is a separate command per D-12, not part of `npm test` |

**Missing dependencies with no fallback:** none identified for the in-repo test/build work.

**Missing dependencies with fallback:** none beyond the standard `RUN_BBJ_TESTS=0` / `EmptyFileSystem` pattern already used throughout the existing test suite.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.1.10 |
| Config file | `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` (e.g. `test/conformance-regressions.test.ts`) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npm test` (judge on `numFailedTests: 0` per the standing whole-suite gate substitution; expect the pre-existing local `linking.test.ts`/issue447 environment failures if BBjServices happens to be reachable — not this phase's regression, per prior-session memory) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PARSE-01 | `FIELD` verb (all value/name-part shapes, program level and inside a method body) parses with zero lexer/parser errors; class-member `FIELD` declaration and its no-type-still-flagged case are untouched | unit (parse+validate) | `npx vitest run test/conformance-regressions.test.ts` plus new `test-data/conformance/field-verb.bbj` | ❌ Wave 0 — fixture file new; grammar rule new |
| PARSE-02 | `READ RECORD`/`EXTRACT RECORD`/`FIND RECORD`/`INPUT RECORD`/`PRINT RECORD`/`WRITE RECORD` with `LEN=` channel option parse; `LEN` usable as a variable; INPUT verifier `LEN=a,b` form keeps parsing | unit (parse+validate) | `npx vitest run test/conformance-regressions.test.ts` plus new `test-data/conformance/record-verbs-len-option.bbj` | ❌ Wave 0 — fixture file new; one grammar rule edited |
| PARSE-03 | The word `label` works as a name in every listed position, any case; other names unaffected; `.bbl` library symbolic labels keep parsing | unit (parse+validate) | `npx vitest run test/conformance-regressions.test.ts` plus new `test-data/conformance/label-word-as-name.bbj`; full suite covers `.bbl` loading via `initializeWorkspace()` | ❌ Wave 0 — fixture file new; two grammar additions |
| PARSE-07 | `IOLIST` parses standalone and behind a label, with a long item list including `[ALL]` arrays | unit (parse+validate) | `npx vitest run test/conformance-regressions.test.ts` plus new `test-data/conformance/iolist-statement.bbj` | ❌ Wave 0 — fixture file new; grammar rule new |
| CONF-01 (cross-cutting, mapped to Phase 98 but restated in this phase's own success criteria) | Every construct fixed here has a synthetic regression file the example-files/conformance test parses at zero error-severity | unit (parse+validate) | `npx vitest run test/conformance-regressions.test.ts` | ✅ test file exists (Phase 98); ❌ the 4 new fixtures don't exist yet |

### Sampling Rate
- **Per task commit:** the specific construct's probe/test (`conformance-regressions.test.ts`, plus a throwaway pre/post probe per D-18's instruction)
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npm test`
- **Phase gate:** full suite green, THEN the private conformance harness run at the phase boundary and after each group lands (D-12): `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`, snapshotting `details.json` before each run and diffing file sets (D-11/D-12), reporting A ≤ 80 and A2 at or below the Phase 98 number

### Wave 0 Gaps
- [ ] `bbj-vscode/test/test-data/conformance/field-verb.bbj` — new fixture, does not exist yet
- [ ] `bbj-vscode/test/test-data/conformance/record-verbs-len-option.bbj` — new fixture, does not exist yet
- [ ] `bbj-vscode/test/test-data/conformance/label-word-as-name.bbj` — new fixture, does not exist yet
- [ ] `bbj-vscode/test/test-data/conformance/iolist-statement.bbj` — new fixture, does not exist yet
- [ ] No new test *infrastructure* file is needed — `conformance-regressions.test.ts` already picks up any `.bbj` file dropped into the folder (confirmed by reading the file this session, unchanged from Phase 98)

## Security Domain

`security_enforcement` is not present in `.planning/config.json`; per the default, treated as enabled. This phase touches no authentication, session, access-control, cryptography, or network surface — it is a parser/grammar correctness change against an already-trusted local source file, identical in kind to Phase 98's security posture. No ASVS category applies beyond general input handling, which is unaffected (the grammar changes add recognition of existing valid BBj syntax; they do not relax any existing rejection or widen what untrusted input the parser accepts beyond what BBj's own compiler already accepts).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (indirectly relevant, no change in trust boundary — the language server already parses arbitrary local `.bbj` files) | N/A |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

None applicable — no new external input source, no new parsing of untrusted network data.

## Sources

### Primary (HIGH confidence — read in full this session)
- `bbj-vscode/src/language/bbj.langium` — full grammar, read this session (1052 lines)
- `bbj-vscode/src/language/bbj-token-builder.ts`, `bbj-lexer.ts` — full source, read this session
- `bbj-vscode/node_modules/langium/src/parser/token-builder.ts` — `DefaultTokenBuilder`'s keyword-naming and category logic, read this session (this is what established the `tokenType.name = keyword.value` fact underlying the `label` root cause)
- `bbj-vscode/src/language/validations/line-break-validation.ts` — full source, read this session
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — full source, read this session
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` — full source, read this session
- `bbj-vscode/src/language/bbj-semantic-token-provider.ts` — full source, read this session
- `bbj-vscode/src/language/bbj-type-inferer.ts` — grepped for exhaustive dispatch, read this session
- `bbj-vscode/src/language/lib/labels.bbl` — read this session, confirms the 12-entry `label *NAME` symbolic-label content this phase's fix must not break
- `bbj-vscode/langium-config.json` — `caseInsensitive: true`, read this session (established that keyword-token naming is unaffected by this flag)
- `bbj-vscode/test/conformance-regressions.test.ts`, `test/test-data/conformance/` directory listing — read this session
- This session's own throwaway vitest probes (`bbj-vscode/test/zz-probe-99.test.ts`, `zz-probe-99b.test.ts`, written and deleted this session, confirmed absent via `git status --porcelain`) — direct empirical evidence for every "current state (verified, probe)" claim above
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (Phase 99/100 blocks), `.planning/STATE.md` (Active Constraints) — read this session
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-RESEARCH.md` — read in full this session for method and for the exact lexer/token-builder mechanism vocabulary reused above (Patterns 1-3, the three-category defect taxonomy)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md`'s "Phase 98" decision-log entry naming the `LEN=<number>` residue and `bbj-corpus/conformance/REPORT.md`/CONTEXT.md's own file-count citations (45/38/25/3) — read for context, not independently re-counted against the corpus in this session (the hard rule in scope forbids reading corpus file contents; counts are taken as given from `99-CONTEXT.md`, itself sourced from a scout pass this research did not repeat)

### Tertiary (LOW confidence)
- The exact viability of a cross-reference typed by a mixed terminal/keyword datatype rule containing *only* `ID | 'label'` (Assumption A2) — reasoned by close analogy to `FeatureName`'s already-working, but structurally slightly different, precedent; not independently compiled/probed since it requires a grammar edit and `langium:generate` run, out of scope for research

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no packages involved
- Root cause identification (all 4 groups): HIGH — every claim about *current* behavior reproduced directly via probe this session; the underlying lexer/token-builder mechanism for each was traced to specific, cited source lines
- Recommended fix mechanism (FIELD, IOLIST): HIGH — same defect shape and same fix shape as Phase 98's already-fixed `TABLE`/`RESTORE` (new `SingleStatement` alternative, no custom token needed), differing only in not needing opaque/NL-sensitive lexer help
- Recommended fix mechanism (LEN=): HIGH — traced to the exact global-token-vocabulary mechanism and confirmed the resulting `LEN` keyword's uppercase text satisfies the existing generic fallback loop by inspection of that loop's source
- Recommended fix mechanism (label): HIGH on root cause, MEDIUM-HIGH on exact grammar-diff shape — the mechanism (lowercase-keyword exclusion from the generic fallback loop) is fully traced and has a working in-repo precedent (`void`); the specific `LabelName` rule shape for the declaration/branch-target side is reasoned by analogy, not itself probed post-implementation (flagged as Assumption A2)
- Providers/validators requiring no change (D-07, D-10): HIGH — each conclusion is grounded in reading the specific, cited function/severity-argument, not inference
- Pitfalls: HIGH — each demonstrated empirically this session or traced to specific source lines, not inferred

**Research date:** 2026-09-21
**Valid until:** next `bbj.langium`/`bbj-token-builder.ts` change in this phase, or ~14 days (fast-moving in-repo grammar work, not a third-party dependency)

## Orchestrator Addendum (2026-09-21)

Added after reading the research against the grammar; the planner must treat these as findings.

1. **`FieldStatement`'s name part cannot be a full `Expression`.** The relational level of the
   expression grammar takes `=` as a comparison operator (`… operator=('<' | '>' | '=' | '<=' |
   '>=' | '<>') right=AdditiveExpr`). With `name=Expression '=' value=Expression`, the parser is
   LL(k) without backtracking: it would consume `name$=dec(x$)` as one comparison and then fail
   looking for the statement's own `=`. The name part has to be parsed at a level **below** the
   relational one (the additive level covers a variable, a string literal and a `"PRE_"+str(…)`
   concatenation — all three shapes seen), the way `Assignment` avoids the problem by using
   `MemberCall` for its left side. This is the first thing the FIELD task must probe after the
   grammar edit; the recommended rule in "FIELD verb" above is not usable as written. The `record`
   part is followed by `,`, so it is not affected.
2. **The spaced literal shape matters:** `FIELD REC$, "NAME" = "MARY"` (string-literal name, spaces
   around `=`) and the concatenated name with a masked `str(n:"00")` (a `:` inside the name part —
   check it does not collide with the string-mask level or a label parse) must both be in the
   FIELD probe set and the fixture.
3. **Measurement duties are orchestrator-side** (CONTEXT D-11, D-12): plans must not ask an
   executor to read corpus sources. A plan may run the harness and record counts and message
   groups; any per-file look at a moved file is done by the orchestrator between plans.
