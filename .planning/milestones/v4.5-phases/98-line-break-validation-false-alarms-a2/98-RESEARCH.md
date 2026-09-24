# Phase 98: Line-Break & Validation False Alarms (A2) - Research

**Researched:** 2026-09-20
**Domain:** Langium 4 grammar/lexer (Chevrotain-generated parser) and hand-written validation checks in a BBj language server
**Confidence:** HIGH for the constructs actually reproduced below (TABLE, RESTORE, GOSUB/GOTO-to-keyword-label, EXIT expr, LOAD, single-line IF/FI forms, DECLARE/METHODRET plumbing, CONF-01 test shape); LOW/open for three residue groups (multi-line `DEF FN` header, continued `LEN=`, trailing-comma `PRINT`) where a direct reproduction attempt did not trigger the reported symptom — see Open Questions.

All findings below come from three sources, each tagged inline: (1) reading the grammar/lexer/validator source in this repository this session, (2) a throwaway vitest probe (`bbj-vscode/test/zz-probe-98.test.ts`, written and deleted this session — not present in the final tree) that parsed and validated small synthetic snippets with `parseHelper`/`validationHelper` and printed statement `$type`s and diagnostics, and (3) `bbj-corpus/conformance/REPORT.md` / `worker.mts`, read for shape understanding only — no corpus file names, paths or verbatim corpus source lines appear below, per the hard rule in scope.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fix the root cause in the grammar (and lexer where needed), not by teaching `line-break-validation.ts` to tolerate mis-parsed shapes. `TABLE` does not exist in `bbj.langium` at all; `RestoreStatement` accepts only a `LabelRef`, so `RESTORE 0` ends at `RESTORE` and the rest of the line becomes a second statement; `gosub print`, `exit err`, `load "..."` are reported the same way. `npm run langium:generate` is therefore part of this phase. This overrides the roadmap's "leaves the grammar alone" note.
- **D-02:** Where the grammar is already right and only the line-break mask is wrong, the fix goes in `line-break-validation.ts`. Rule: "fix where the defect is", D-01 as default when the AST is wrong.
- **D-03:** `TABLE` is modelled as an opaque rest-of-line: the lexer captures everything after `TABLE` up to end of line (or a trailing `;rem`) as one data token, like raw-text statements. No hex validation. Must cover: with/without leading label, mask+bytes unspaced/spaced/mixed, long/short, upper/lower case.
- **D-04:** Language words as label names are accepted in branch-target position only — `GOTO`, `GOSUB`, `ON...GOTO/GOSUB` targets, plus whatever the label-declaration side needs so those same targets link. Variables and every other name position stay with Phase 100 (PARSE-08). No blanket reserved-word rule.
- **D-05:** ROADMAP.md amended (Depends-on/Repository lines, Phase 99's "no file conflict" remark, success criterion 4).
- **D-06:** Conflicting `DECLARE` narrowed, not removed: inside a method body, two declarations whose types both resolve and are unrelated (neither sub/supertype) → error; at program level → warning; related types, or at least one type unresolvable → silent.
- **D-07:** "declares a return type but has no METHODRET returning a value" and "is declared void and must not return a value" both become warnings.
- **D-08:** No special case for stub-looking methods — one plain warning whenever a non-void, non-interface method never returns a value.
- **D-09:** Success criterion 4 reworded: no error-severity diagnostic on compiler-accepted code, with one named exception — unrelated resolved `DECLARE`s of one name inside a single method body.
- **D-10:** Convention: zero parse errors AND zero error-severity validation diagnostics for conformance regression files. Linking diagnostics excluded (`EmptyFileSystem` has no Java classpath). Must not go through `DocumentBuilder.build` in a way that contacts CPL or java-interop.
- **D-11:** Conformance regression files live in `bbj-vscode/test/test-data/conformance/`. Only that folder gets the stricter assertion; the existing flat `test-data/*.bbj` files keep the parse-only rule.
- **D-12:** One file per construct group, named for the construct (e.g. `table-statement.bbj`, `restore-numeric.bbj`, `keyword-branch-targets.bbj`, `exit-load-save.bbj`, `def-fn-multiline-header.bbj`, `single-line-if-forms.bbj`, `declare-methodret.bbj`). No requirement/plan/decision ids in file names or content.
- **D-13:** Files are hand-written minimal shapes with invented names/data. A leading `REM` states in behaviour terms what the file protects. No corpus text, no corpus file names.
- **D-14:** Every negative case currently in `line-break-validation.test.ts` must still be flagged, and each mask or grammar rule touched gets at least one new "still flagged" case.
- **D-15:** The continued `LEN=` item (3 files) and trailing-comma `PRINT` (2 files) are in scope. For PRINT, fix only the cause of the line-break symptom; the item forms as such are PARSE-04's territory (Phase 100 overlap).
- **D-16:** Remaining A2 files at the phase-boundary run are triaged and recorded (message group, file count, one-line cause) — trivially related ones fixed, the rest recorded as accepted residue or handed to Phase 100. Gate stays A2 ≤ 25, no drive to zero.
- **D-17:** Claude runs the private harness at the phase boundary; only numbers and message-group names with counts are written into tracked files.

### Claude's Discretion
- Exact lexer mechanism for the opaque `TABLE` data token, and AST node/property naming.
- How `RESTORE n`, `EXIT expr`, `LOAD`, `SAVE` are expressed in the grammar, as long as the AST is correct and no list-A/list-B regression appears.
- Whether the stricter conformance assertion extends `example-files.test.ts` or sits in a sibling test file.
- Warning message wording for D-06/D-07; existing tests asserting `error` for these checks are simply updated.
- Plan split and ordering (by file count is the obvious default: TABLE first).

### Deferred Ideas (OUT OF SCOPE)
- Language words as variable names and in other non-branch positions — Phase 100 (PARSE-08).
- PRINT/INPUT item forms beyond the trailing-comma line-break symptom — Phase 100 (PARSE-04).
- Hex validation of `TABLE` data — not planned; the compiler endpoint (Phases 101-103) reports malformed tables.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VALID-01 | A `TABLE` statement gets no line-break error | Root cause fully reproduced (probe): no grammar rule exists; fix is a new opaque-rest-of-line statement rule (D-01/D-03), see "TABLE" below |
| VALID-02 | `RESTORE n`, `GOSUB`/`GOTO` to a keyword-named label, `EXIT expr`, `LOAD`, `SAVE` get no line-break error | Each root cause reproduced individually (probe); `RESTORE`/`LOAD` need new/widened grammar rules, keyword-label targets need a lexer-level token fix, `EXIT expr` needs the `EXIT_NO_NL` regex widened, bare `SAVE` already works today |
| VALID-03 | Multi-line `DEF FN...(params)` header gets no line-break error | Partially open — see Open Questions; colon-continued headers already parse clean in the probe, so the exact failing shape needs re-confirmation at plan/build time |
| VALID-04 | Single-line `IF` forms and `FI` get no false "needs to start in a new line" | Two sub-cases fully reproduced and root-caused in `line-break-validation.ts` (mask-only, D-02); a third sub-case (`IF...THEN RETURN...FI`) already works today |
| VALID-05 | Conflicting-`DECLARE` and `METHODRET` checks report no error on compiler-accepted code | Exact functions, line ranges, and existing test assertions to update are identified below |
| CONF-01 | Each fixed construct has a synthetic regression file the example-files test parses/validates at zero error-severity | Exact test shape, diagnostic filter, and file layout given below (D-10/D-11) |
</phase_requirements>

## Summary

Every A2 false alarm in this phase falls into exactly one of three mechanical categories, and which
category a given construct falls into determines whether the fix belongs in `bbj.langium`
(+ `bbj-lexer.ts`/`bbj-token-builder.ts`) or in `line-break-validation.ts` alone:

1. **No grammar rule exists at all** (`TABLE`, `LOAD`) — the keyword parses as a bare identifier
   `ExpressionStatement`, and whatever follows on the same line becomes a second (or several more)
   sibling statements. `line-break-validation.ts`'s generic "standalone statement" rule then
   correctly (by its own logic) flags the second statement for not starting on a new line, or the
   first for not ending with one. The AST is wrong; D-01 applies.

2. **A grammar rule exists but its single argument can't match the actual continuation**
   (`RESTORE n`, `EXIT expr`, keyword-named `GOSUB`/`GOTO` targets) — Chevrotain's statically
   computed lookahead for the top-level `SingleStatement` alternation discovers, at grammar
   build time, that after the fixed keyword the grammar's own mandatory continuation (a
   `LabelRef` cross-reference, or an `EXIT_NO_NL`-gated numeric expression) cannot be satisfied by
   the actual next token, and **silently prefers the fallback `ExpressionStatement` alternative**
   instead of committing to the specific statement rule and failing hard. This works because every
   ordinary keyword token in this grammar is also tagged with `CATEGORIES: [ID]`
   (`bbj-token-builder.ts`), making it a legal identifier wherever an expression is expected. No
   parser error is ever raised — the file silently gets a *different*, wrong AST, and
   `line-break-validation.ts` reports the symptom. D-01 applies (new/widened grammar rule, or in
   the keyword-label case, a lexer token fix so the *label reference* stops losing the ID category
   to a specialized token).

3. **The AST is already correct; a mask function in `line-break-validation.ts` is incomplete**
   (two of the three single-line `IF`/`FI` shapes) — the CompoundStatement/IfStatement/
   IfEndStatement chain is exactly what it should be, but `ifStatementLineBreaks()` and
   `ifEndStatementLineBreaks()` only walk back through *one* same-line special case
   (leading label, or one chained `FI`) before giving up and defaulting to "needs surrounding line
   breaks". D-02 applies — no grammar change, no `langium:generate`.

Three named groups (multi-line `DEF FN...(params)` header, a continued `LEN=` item, trailing-comma
`PRINT`) could **not** be reproduced with straightforward synthetic snippets in this session — see
Open Questions. They remain in scope per CONTEXT.md; the executor must re-probe them with the exact
technique below before writing their regression files.

**Primary recommendation:** implement construct-by-construct in the file-count order CONTEXT.md
already suggests (TABLE, RESTORE, keyword-label targets, single-line IF/FI, DECLARE/METHODRET,
then the smaller EXIT/LOAD/residue groups), reusing the `parseHelper`/`validationHelper` probe
technique from this research to pin down each construct's *current* AST before writing its grammar
or mask fix — this proved far faster and more reliable than reasoning about Chevrotain's lookahead
statically.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Statement grammar (TABLE/RESTORE/LOAD/EXIT shapes) | Langium grammar (`bbj.langium`) | Lexer (`bbj-token-builder.ts`) for custom NL-sensitive tokens | AST correctness is a parser-tier concern; the lexer only supplies the token stream the grammar consumes |
| Keyword-as-branch-target lexing | Lexer (`bbj-token-builder.ts`) | Grammar (`LabelRef`/`LabelDecl`) | The label *declaration* side already works via the generic `CATEGORIES:[ID]` keyword trick; only the *reference* side loses that category to a specialized NL-sensitive token |
| Line-break "shape looks right but flagged wrong" (IF/FI) | Validator (`line-break-validation.ts`) | — | Pure post-parse heuristic over an already-correct AST; no grammar/lexer involvement |
| Conflicting-DECLARE / METHODRET severity | Validator (`check-variable-scoping.ts`, `check-classes.ts`) | Type resolution helpers (`bbj-nodedescription-provider.ts`, `bbj-type-inferer.ts`) | Severity decision needs a resolved-type + subtype test, which already exists (in `check-classes.ts`) but is private to a different validator class |
| Conformance regression test harness | Test infra (`bbj-vscode/test/`) | — | New folder + assertion shape, no runtime/production code |

## Standard Stack

No new external packages. This phase touches only in-repo TypeScript/Langium source
(`bbj-vscode/src/language/`) and test files (`bbj-vscode/test/`). `npm run langium:generate`
regenerates `src/language/generated/{ast,grammar,module}.ts` from `bbj.langium` — this is a
build step, not a dependency change.

**Version verification:** N/A (no packages added or bumped). Confirmed by reading
`bbj-vscode/package.json`'s scripts section and the grammar/lexer/validator source directly —
no new `import` targets outside what's already in `node_modules/langium`.

## Package Legitimacy Audit

Not applicable — this phase installs no packages. `npm view <pkg> version` /
`package-legitimacy check` were not run because there is nothing to check.

## Architecture Patterns

### System Architecture Diagram

```
source text (.bbj)
      │
      ▼
BbjLexer.tokenize()               (bbj-lexer.ts)
  └─ prepareLineSplitter()        splices ':'-prefixed continuation lines into their
      │                            preceding physical line BEFORE tokenizing
      ▼
BBjTokenBuilder.buildTokens()     (bbj-token-builder.ts)
  ├─ keyword tokens get CATEGORIES=[ID] (generic loop, unless custom/NL-sensitive)
  └─ 14 custom NL-/standalone-sensitive tokens spliced to front of priority order
      (KEYWORD_STANDALONE, PRINT_STANDALONE_NL, RPAREN_NL, EXIT_NO_NL, ...)
      │
      ▼
Chevrotain-generated LL(k) parser  (generated/grammar.ts, from bbj.langium)
  ├─ SingleStatement OR-alternation: statically computed lookahead per alternative
  │    if a keyword-led rule's mandatory continuation can't match within the lookahead
  │    window, the OR silently falls back to ExpressionStatement (keyword is ID-category)
  │    → NO parser error, WRONG AST (RESTORE/EXIT/GOSUB-target cases)
  └─ produces Program.statements[] (flat list; ';'-chains become CompoundStatement)
      │
      ▼
BBjDocumentValidator.validateDocument()  (bbj-document-validator.ts)
  ├─ checkLineBreaks()             (line-break-validation.ts) — bails if parserErrors > 0;
  │    otherwise walks lineBreakMap predicates over the (possibly wrong) AST
  ├─ checkConflictingDeclares()    (check-variable-scoping.ts:308)
  ├─ checkMethodReturn()           (check-classes.ts:204, class ClassValidator)
  └─ applyDiagnosticHierarchy()    downgrades non-cyclic/non-instance-access linking
       errors to Warning; Parse/BBjCPL tiers suppress lower tiers
      │
      ▼
Diagnostic[]  (severity + data.code: 'lexing-error'|'parsing-error'|'linking-error'|undefined)
```

### Recommended Project Structure

No new directories beyond the regression-file folder:

```
bbj-vscode/
├── src/language/
│   ├── bbj.langium                       # new/widened statement rules (D-01)
│   ├── bbj-token-builder.ts              # opaque TABLE token, keyword-target lexer fix (D-03/D-04)
│   └── validations/
│       ├── line-break-validation.ts      # mask fixes for IF/FI (D-02)
│       ├── check-variable-scoping.ts     # checkConflictingDeclares narrowing (D-06)
│       └── check-classes.ts              # checkMethodReturn severity (D-07)
└── test/
    ├── test-data/conformance/            # NEW — one .bbj file per construct group (D-11/D-12)
    ├── line-break-validation.test.ts     # extended with new "still flagged" cases (D-14)
    ├── variable-scoping.test.ts          # 1 existing test's severity assertion flips (see below)
    └── classes.test.ts                   # 1 existing test's severity assertion flips (see below)
```

### Pattern 1: Diagnosing "AST is wrong" vs "mask is wrong" with a throwaway probe

**What:** Before writing any grammar or validator fix, write a scratch vitest file (delete before
committing — it must never land in the final tree, per the register-check convention) that calls
`parseHelper`/`validationHelper` on a minimal synthetic snippet and prints `Program.statements`'
`$type`s plus `diagnostics`.

**When to use:** For every construct group in this phase, before touching source. It is far
faster and more reliable than reasoning about Chevrotain's statically-computed lookahead by
reading the grammar alone (this research's own history: theorizing about why `RESTORE 0` doesn't
raise a parser error took much longer than just running it).

**Example (this session's exact technique):**
```typescript
// Source: this session, ad hoc — not from official docs
import { EmptyFileSystem } from 'langium';
import { parseHelper, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);
await initializeWorkspace(services.shared);
const parse = parseHelper<Program>(services.BBj);
const validate = validationHelper<Program>(services.BBj);

const parsed = await parse(src);              // parsed.parseResult.value / .parserErrors
const validated = await validate(src);         // validated.diagnostics
console.log((parsed.parseResult.value as any).statements.map((s: any) => s.$type));
console.log(validated.diagnostics.map(d => `[${d.severity}] ${d.message}`));
```
Run with `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/<scratch>.test.ts --reporter=verbose --silent=false`
(the `--reporter=verbose --silent=false` flags are required — vitest suppresses `console.log` on a
passing test otherwise). **Delete the scratch file before finishing the plan/wave** — it must not
appear in the final diff (register-check scans for stray files too).

### Pattern 2: Every ordinary keyword token doubles as an identifier

**What:** `BBjTokenBuilder.buildTokens()` (`bbj-token-builder.ts:27-38`) gives **every** grammar
keyword token `CATEGORIES: [ID]` unless it (a) is one of the 14 custom NL-/standalone-sensitive
tokens (identified by having a `LINE_BREAKS` property), or (b) is in the small `EXCLUDED` set
(`METHODEND`, `CLASSEND`, `INTERFACEEND`). This is why `RESTORE`, `GOSUB`, `SAVE`, `DEF`, `EXIT`,
`TABLE` (once added) can all be legally referenced as bare identifiers via `ExpressionStatement`'s
`SymbolRef` — and why Chevrotain's parser silently prefers that fallback whenever a keyword-led
statement rule's own mandatory continuation doesn't fit.

**When to use:** Any time a new statement keyword is added to the grammar (TABLE, LOAD), or an
existing keyword's target position needs widening (EXIT, RESTORE) — the fix must make sure the
statement rule's own continuation can actually match the tokens BBj allows there, because if it
can't, Chevrotain won't error — it will silently misparse into an `ExpressionStatement` chain.

### Pattern 3: Custom NL-sensitive tokens win the lexer's priority race over category-ID keywords

**What:** `bbj-token-builder.ts`'s `reorderTokenPriorities()` splices 14 custom tokens
(`KEYWORD_STANDALONE`, `PRINT_STANDALONE_NL`, `RPAREN_NL`, `EXIT_NO_NL`, `RELEASE_NL`/`NO_NL`,
`ASTERISK_EXPRESSION`/`STANDALONE`, `ENDLINE_PRINT_COMMA`, `START_BREAK`, `FNEND`, `NEXT_BREAK`,
`NEXT_ID`, `METHODRET_END`) to the FRONT of the lexer's pattern-matching order. Verified via probe:
`GOSUB PRINT\n` — the label-target reference to a label named `PRINT`, sitting at end-of-line —
lexes `print` as `PRINT_STANDALONE_NL` (its regex `/(\?|PRINT|WRITE)\s*(?=(;|\r?\n))/i` matches
before the plain `PRINT` keyword token is even tried), not as the plain `PRINT` keyword token.
`PRINT_STANDALONE_NL` has a `LINE_BREAKS` property, so it is explicitly excluded from the
`CATEGORIES:[ID]` treatment — the `target=LabelRef` cross-reference (which needs an ID-category
token) can't match it, so the grammar's lookahead falls back to `ExpressionStatement` for `GOSUB`
itself, and the trailing `PRINT` becomes its own bare `PrintStatement` (via that same
`PRINT_STANDALONE_NL` token). Verified identically for `GOSUB SAVE\n` (matches
`KEYWORD_STANDALONE`'s `DELETE|SAVE|ENTER|READ|INPUT|EXTRACT|FIND` alternation instead).

**When to use:** This is the exact mechanism D-04 must defeat. The **label declaration side
already works** without any change — `PRINT:\n` and `SAVE:\n` both parse as a correct `LabelDecl`
today (verified via probe), because `LabelDecl: name=ValidName':'` is a plain token consumption
(not a cross-reference) and the `:` immediately after the keyword breaks the NL-sensitive tokens'
lookahead before they can fire. Only the **reference** side (`GOSUB`/`GOTO`/`ON...GOTO/GOSUB`
targets) is broken, and only when the keyword-named label sits where one of the 14 custom tokens'
own trigger condition (end-of-line, `;`, or a specific character class) would otherwise apply.

**Recommended fix shape (Claude's Discretion, not prescribed by CONTEXT.md):** narrow each
relevant custom token's regex with a negative lookbehind excluding `GOTO`/`GOSUB` immediately
before it — mirroring the existing precedent in `NEXT_BREAK`'s pattern, which already uses a
lookbehind (`(?<=\r?\n?[^\*][ \t]*)`) to distinguish a bare `next` from `*next`. This keeps the
fix lexer-local and narrowly scoped to branch-target position, matching D-04's "branch-target
position only" boundary without touching `LabelDecl`, `FeatureName`, or any other name position.

### Anti-Patterns to Avoid
- **Widening `EXIT_NO_NL`'s character class without excluding flow-control keywords:** the
  existing regex `/EXIT(?=[ \t]+[0-9(+\-])/i` is deliberately narrow — its comment
  (`bbj-token-builder.ts:118-123`) explains it must NOT fire before `ELSE` or other identifiers
  starting a flow-control keyword, or `IF x THEN EXIT ELSE ...` breaks. Widening to admit `EXIT
  ERR` (an ordinary identifier expression) needs an excluded-keyword list or lookahead, not a
  blanket `[a-zA-Z]` admission.
- **Teaching `line-break-validation.ts` to special-case a specific keyword's raw text:** violates
  D-01/D-02's "fix where the defect is" rule — a symptom-suppression patch in the validator for a
  grammar-level defect (TABLE, RESTORE, LOAD, EXIT, keyword-label targets) will be flagged by
  plan review and contradicts CONTEXT.md's explicit reasoning.
- **Giving the new opaque `TABLE` data token `CATEGORIES:[ID]`:** unlike `RELEASE_NO_NL`/
  `EXIT_NO_NL` (which legitimately double as identifiers), the TABLE data token's *value* is
  arbitrary hex-like text, not a valid identifier — doing so would create spurious linking targets
  and likely lexer ambiguity with ordinary hex-looking variable names.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BBj-class sub/supertype test for D-06's "related types" exception | A new supertype walker in `check-variable-scoping.ts` | `bbjSupertypesReach()` / `isAssignable()` (`check-classes.ts:299-354`), or promote them to shared exports | The exact same three-valued (assignable/not-assignable/unknown) logic already exists, gated by `getClass()` resolution — duplicating it risks the two checks disagreeing later |
| "Is this type resolvable" test | Ad hoc `undefined` checks on `$refText` | `getClass(qualifiedClass)` (`bbj-nodedescription-provider.ts`) — returns the resolved `Class` or `undefined` | `getFQNFullname()` (already used by `checkConflictingDeclares`) returns `$refText` — the raw text as written — which is defined **even when the reference does not resolve**, so it cannot be used to detect "unresolvable" on its own |
| Filtering linking diagnostics out of a CONF-01 assertion | String-matching diagnostic messages | `d.data?.code === DocumentValidator.LinkingError` (`langium`'s own exported constant, `'linking-error'`) | This is exactly how `bbj-document-validator.ts` itself tags linking diagnostics (`processLinkingErrors`, line ~124) and how the private harness's `worker.mts` does the same exclusion — it is also severity-independent, which matters because linking errors are downgraded to Warning in most (not all) cases, see Pitfall below |

**Key insight:** the codebase already has three-valued (resolved/unresolved/related) type
reasoning for exactly this problem, sitting inside `ClassValidator` (`check-classes.ts`) as
private instance methods gated behind `services.types.Inferer`/`services.java.JavaInteropService`.
`registerVariableScopingChecks(registry)` (`bbj-validator.ts:65`) currently takes **no** `services`
argument, unlike `registerClassChecks(registry, services)` (line 64) — reusing the existing
subtype logic for D-06 means either widening that call's signature to pass `services` through, or
exporting the relevant helpers as standalone functions callable without a `ClassValidator`
instance. Either is a small, well-scoped change; flag it explicitly in the plan since it's a
signature change to a registration function, not just a body edit.

## Common Pitfalls

### Pitfall 1: A "no parser error" file can still have a completely wrong AST
**What goes wrong:** Assuming `document.parseResult.parserErrors.length === 0` means the AST is
structurally sound for the construct under test.
**Why it happens:** Every ordinary grammar keyword doubles as `CATEGORIES:[ID]` (Pattern 2 above),
so Chevrotain's LL(k) grammar-build-time lookahead silently substitutes `ExpressionStatement` for
a keyword-led rule whenever that rule's own mandatory continuation can't match — with zero runtime
recovery, zero diagnostic, zero exception. `checkLineBreaks()`'s own bail-out (`if
document.parseResult.parserErrors.length > 0: return`, line 58) only guards against genuinely
failed parses; it does nothing for a *successfully* wrong parse.
**How to avoid:** always confirm the actual `$type` of each top-level statement with the probe
technique (Pattern 1), not just "did it parse".
**Warning signs:** a `checkLineBreaks` diagnostic whose flagged text is exactly the keyword itself
(e.g. `needs to end with a line break: RESTORE`) — that shape is the signature of this failure
mode, not a genuine line-break problem.

### Pitfall 2: Linking diagnostics are not uniformly Warning severity
**What goes wrong:** A CONF-01 assertion that filters only by `severity === Error` still needs a
`data.code` check — one instance-member (`#member`) dangling reference or a cyclic reference stays
at Error severity even after `BBjDocumentValidator`'s downgrade (`bbj-document-validator.ts:
250-254`, `applyDiagnosticHierarchy`). Filtering only on severity would make a regression file with
one of those two shapes fail CONF-01 for a reason unrelated to the construct it's meant to protect.
**Why it happens:** `toDiagnostic()`'s override downgrades "non-cyclic linking errors" to Warning,
but explicitly keeps cyclic-reference and instance-member-access linking errors at Error to avoid
masking real bugs.
**How to avoid:** filter on **both** `severity === DiagnosticSeverity.Error` **and**
`d.data?.code !== DocumentValidator.LinkingError` (import `DocumentValidator` from `langium`) —
this is severity-independent and matches both the source's own tagging and the private harness's
`NOT_VALIDATION` set (`lexing-error`/`parsing-error`/`linking-error`).
**Warning signs:** a regression file inexplicably failing CONF-01 only because it references an
undeclared instance member (`#foo`) somewhere incidental to the construct being protected.

### Pitfall 3: `example-files.test.ts`'s existing loop will not pick up the new conformance folder
**What goes wrong:** Assuming dropping `.bbj` files into `test-data/conformance/` automatically
extends the existing "Parse all files in test-data folder" test's coverage.
**Why it happens:** `fs.readdirSync(testDataFolder).filter(file => file.endsWith('.bbj'))`
(`example-files.test.ts:21`) is **not recursive** — a subdirectory named `conformance` is present
in the `readdirSync` result but filtered out (its name doesn't end in `.bbj`), so files inside it
are never read by this loop at all, silently.
**How to avoid:** per D-11 ("only that folder gets the stricter assertion") and CONTEXT.md's
"Claude's Discretion" note, add either a new sibling test file (recommended — keeps the existing
test's semantics/scope untouched) or an explicit second loop reading
`test-data/conformance/*.bbj` with the CONF-01 assertion (parse clean AND validate with zero
error-severity, linking-excluded diagnostics).
**Warning signs:** a regression file with a deliberate mistake left in it never fails any test.

### Pitfall 4: `DEF` in the top-level `Statements` fragment, not `SingleStatement`
**What goes wrong:** Looking for `DefFunction` inside `SingleStatement`'s alternation when
debugging a DEF-related false alarm.
**Why it happens:** `bbj.langium`'s `Statements` fragment (`statements+=(Statement | ClassDecl |
DefFunction | InterfaceDecl)`) treats `DefFunction` as a sibling alternative to `Statement`
itself, not something reachable through `SingleStatement`. It is therefore **not** covered by any
predicate in `line-break-validation.ts`'s `lineBreakMap` (no `isDefFunction` entry exists there at
all — only `isMethodDecl` is special-cased) and **not** a `Statement`/`isStandaloneStatement`
match either. Any DEF-related false alarm currently reported by `checkLineBreaks` must therefore
be occurring on the **fallback `ExpressionStatement`** interpretation of a misparsed `DEF FN...`
header (Pattern 2's mechanism), not on a `DefFunction` node directly.
**How to avoid:** probe the exact failing shape's `$type`s before assuming which code path is
responsible.

## Runtime State Inventory

Not applicable — this is a grammar/lexer/validator + regression-test phase, not a rename, refactor
or migration. No stored data, live service config, OS-registered state, secrets, or build
artifacts carry any of the affected keywords in a way a source-code change would leave stale.

## Code Examples

### Probing a construct's current AST and diagnostics (this session's exact technique)
```typescript
// Source: this session (scratch file, delete before finishing)
import { EmptyFileSystem } from 'langium';
import { describe, test } from 'vitest';
import { parseHelper, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

describe('probe', async () => {
    const services = createBBjServices(EmptyFileSystem);
    await initializeWorkspace(services.shared);
    const parse = parseHelper<Program>(services.BBj);
    const validate = validationHelper<Program>(services.BBj);

    test('construct-name', async () => {
        const src = 'RESTORE 0\n';
        const parsed = await parse(src);
        const validated = await validate(src);
        console.log((parsed.parseResult.value as any).statements.map((s: any) => s.$type));
        console.log(validated.diagnostics.map(d => `[${d.severity}] ${d.message}`));
        console.log('parserErrors:', parsed.parseResult.parserErrors.map(e => e.message));
    });
});
```
Run: `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/<scratch>.test.ts --reporter=verbose --silent=false`

### CONF-01 diagnostic filter (D-10)
```typescript
// Source: this session, derived from bbj-document-validator.ts:124-125,250-254
// and bbj-corpus/conformance/worker.mts's NOT_VALIDATION set (shape only, not quoted)
import { DocumentValidator } from 'langium';
import { DiagnosticSeverity } from 'vscode-languageserver';

const errorDiagnostics = result.diagnostics.filter(d =>
    d.severity === DiagnosticSeverity.Error &&
    d.data?.code !== DocumentValidator.LinkingError
);
expect(result.parseResult.lexerErrors, `${file}: lexer errors`).empty;
expect(result.parseResult.parserErrors, `${file}: parser errors`).empty;
expect(errorDiagnostics, `${file}: validation errors`).empty;
```

### Existing severity-assertion pattern to reuse for D-06/D-07 test updates
```typescript
// Source: bbj-vscode/test/variable-scoping.test.ts:281-293 (existing, verbatim import shape)
import { expectError, expectIssue } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
// existing pattern for an Error assertion:
expectError(result, /Conflicting DECLARE/i, { node: someVariableDecl });
// D-06/D-07 need the equivalent Warning-severity form — check langium/test's expectIssue
// signature (expectError is a thin wrapper over it) for the severity parameter shape before
// writing the new assertions.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Conflicting-DECLARE and METHODRET checks always `error` | Narrowed by scope (method vs program) and by resolved-type relation (D-06/D-07) | This phase | Existing tests asserting Error severity for the program-scope DECLARE case and the two METHODRET messages must flip to Warning — see exact locations below |

**Deprecated/outdated:** none — this phase is additive/corrective to existing checks, not a
migration away from a prior approach.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended lexer fix for D-04 (negative lookbehind on the 14 custom NL-sensitive tokens, excluding `GOTO`/`GOSUB` immediately before) is the right shape — not prescribed by CONTEXT.md (explicitly "Claude's Discretion"), only demonstrated as consistent with the existing `NEXT_BREAK` precedent | Pattern 3 | An alternative mechanism (e.g. giving `LabelRef`'s cross-reference an extra accepted token type) might be simpler or safer; the planner should treat this as a starting hypothesis, not a locked design |
| A2 | `LOAD`'s grammar shape (`'LOAD' fileid=Expression ...`) mirrors `SAVE`'s existing rule closely enough to reuse as a template | "TABLE"/"LOAD" findings below | BBj's real `LOAD` verb may accept options `SaveStatement` doesn't (e.g. a mode argument) — unverified against BBj's own documentation in this session |
| A3 | The three unreproduced residue groups (multi-line `DEF FN` header, continued `LEN=`, trailing-comma `PRINT`) have root causes similar in *kind* to the reproduced groups (AST fallback or mask gap) | Open Questions | The actual root cause could be something entirely different (e.g. a `prepareLineSplitter` edge case) not covered by either category — the executor must re-probe before committing to a fix category |

## Open Questions

1. **Multi-line `DEF FN...(params)` header (VALID-03) — exact failing shape not reproduced**
   - What we know: a `DEF FNFOO(A,B)` header entirely on one physical line, with a multi-statement
     body over several lines (including via `:`-prefixed continuation for the body), already
     parses and validates clean (probe-verified, zero diagnostics). A parameter list split across
     a **real** newline **without** a `:`-continuation prefix genuinely fails to parse (probe:
     `Expecting: RPAREN_NL or ')' but found ','` — a real parser error, not a line-break false
     alarm) — this is presumably invalid BBj syntax the corpus doesn't contain. A parameter list
     split across a real newline **with** a `:`-continuation prefix on the second line parses and
     validates clean too (probe-verified).
   - What's unclear: none of the three shapes tried reproduces the reported "needs to end with a
     line break: DEF" diagnostic. The corpus's actual failing files may use a shape not tried here
     (e.g. a specific parameter type/suffix combination, a particular body content, or something
     about `FNEND` positioning) — REPORT.md's excerpted example line for this group is truncated
     to the header alone and doesn't show the file's continuation lines.
   - Recommendation: at plan/build time, re-run the Pattern-1 probe with variations (try a `$`- or
     `!`-suffixed parameter name split across the continuation, try the header on its own line
     followed immediately by `FNEND` with no body, try a label immediately before `DEF`) before
     writing the grammar/mask fix. Budget this as its own investigation task, not folded into the
     TABLE/RESTORE tasks.

2. **Continued `LEN=` item (D-15, 3 files) — exact failing shape not reproduced**
   - What we know: `LastVerifyOption`'s `'LEN=' min=Expression ',' max=Expression` form, used
     inside an `InputItem`'s `VerifyOptions` (`:( ... )`), is the grammar construct REPORT.md's
     excerpt implicates. Splitting it across a `:`-continuation line (both before and mid-option)
     parses and validates clean in the probe.
   - What's unclear: which physical split actually triggers the false alarm; possibly the
     continuation crosses a different boundary (e.g. right after the `:(` opener, or spans the
     `LEN=` keyword token itself, which is a single fused terminal literal `'LEN='` — splitting a
     multi-character keyword literal across a colon-continuation splice may behave differently
     from splitting between two already-separate tokens).
   - Recommendation: probe a split that lands **inside** the `LEN=` keyword literal itself (e.g.
     `...:(LE\n:N=10,20)`) and a split immediately after the `:(` opener, before writing a fix.

3. **Trailing-comma `PRINT` (D-15, 2 files) — exact failing shape not reproduced**
   - What we know: `WithChannelAndOptionsAndOutputItems`'s bare form
     (`items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?`) is the construct in play;
     `ENDLINE_PRINT_COMMA`'s lexer pattern (`/,(?=(\r?\n|;))/`) requires the comma be *immediately*
     followed by `\r?\n` or `;` — no intervening space. A trailing comma directly followed by a
     genuine newline, as the last statement or followed by another statement on the next line,
     parses and validates clean in the probe (`isStandaloneStatement`'s generic "both" mask
     correctly finds the line break after the comma).
   - What's unclear: whether the actual corpus files have trailing whitespace **between** the
     comma and the newline (which would prevent `ENDLINE_PRINT_COMMA` from lexing at all, falling
     back to a plain `,` token and likely a genuine parser error rather than a validation false
     alarm — inconsistent with A2 classification), or whether the trailing-comma `PRINT` sits
     inside a `CompoundStatement`/single-line `IF` context not tried here.
   - Recommendation: try a trailing-comma `PRINT` as the **first** statement chained via `;` in a
     `CompoundStatement`, and as the **last** statement in a single-line `IF...THEN PRINT x$,`
     with something following on the next line, before writing a fix. D-15 also flags this
     residue overlaps PARSE-04's territory (Phase 100) — keep the Phase 98 fix scoped to only the
     line-break symptom, not the general PRINT item-list grammar.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm run langium:generate`, `npm test` | Project convention: Node 22 (Node 24 breaks `langium:generate` per prior-phase memory) | Not directly re-verified this session (no grammar edits made) | Use `nvm`/equivalent to pin Node 22 before running `langium:generate` |
| vitest | All test runs this phase | Yes — used directly this session (`bbj-vscode/vitest.config.ts` present, `npx vitest run` succeeded repeatedly) | v4.1.10 (observed in this session's test output banner) | — |
| java-interop (`:5008`) | NOT required for this phase's tests | N/A | — | All tests in this phase use `EmptyFileSystem` + `parseHelper`/`validationHelper`; run with `RUN_BBJ_TESTS=0` |
| BBjServices (`:8888`) / `bbjcpl` | NOT required for this phase's own tests; only for the phase-boundary conformance harness run (D-17, outside this repo) | N/A to in-repo tests | — | The private harness run happens separately, per D-17, not via `npm test` |

**Missing dependencies with no fallback:** none identified for the in-repo test/build work.

**Missing dependencies with fallback:** none beyond the standard `RUN_BBJ_TESTS=0` /
`EmptyFileSystem` pattern already used throughout the existing test suite.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.1.10 |
| Config file | `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` (e.g. `test/line-break-validation.test.ts`) |
| Full suite command | `cd bbj-vscode && RUN_BBJ_TESTS=0 npm test` (judge on `numFailedTests: 0`, per the whole-suite gate substitution standing decision; expect the pre-existing local `linking.test.ts`/issue447 environment failures if BBjServices happens to be up — not this phase's regression) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VALID-01 | `TABLE` statement (labelled/unlabelled, spaced/unspaced/mixed, long/short, any case) produces no line-break error | unit (parse+validate) | `npx vitest run test/line-break-validation.test.ts` plus new `test-data/conformance/table-statement.bbj` via the CONF-01 test | ❌ Wave 0 — `table-statement.bbj` and its consuming test both new |
| VALID-02 | `RESTORE n`, keyword-label `GOSUB`/`GOTO`, `EXIT expr`, `LOAD`, `SAVE` produce no line-break error | unit (parse+validate) | `npx vitest run test/line-break-validation.test.ts` plus `test-data/conformance/restore-numeric.bbj`, `keyword-branch-targets.bbj`, `exit-load-save.bbj` | ❌ Wave 0 — three new regression files |
| VALID-03 | Multi-line `DEF FN...(params)` header produces no line-break error | unit (parse+validate) | `npx vitest run test/line-break-validation.test.ts` plus `test-data/conformance/def-fn-multiline-header.bbj` | ❌ Wave 0 — file + underlying repro still open (Open Question 1) |
| VALID-04 | Single-line `IF`/`FI` forms produce no false line-break error | unit (parse+validate) | `npx vitest run test/line-break-validation.test.ts` plus `test-data/conformance/single-line-if-forms.bbj` | ❌ Wave 0 — new regression file; existing `line-break-validation.test.ts` cases stay green (D-14) |
| VALID-05 | Conflicting-DECLARE and METHODRET checks report no error on compiler-accepted code | unit (validate) | `npx vitest run test/variable-scoping.test.ts test/classes.test.ts` plus `test-data/conformance/declare-methodret.bbj` | ❌ Wave 0 — 2 existing test assertions need severity flips (see below), 1 new regression file |
| CONF-01 | Every construct's regression file parses clean and validates at zero error-severity (linking excluded) | unit (parse+validate, sibling test) | new test file, e.g. `npx vitest run test/conformance-regressions.test.ts` | ❌ Wave 0 — the test file itself is the deliverable |

### Sampling Rate
- **Per task commit:** the specific construct's test file (`line-break-validation.test.ts`,
  `variable-scoping.test.ts`, `classes.test.ts`, or the new conformance-regressions test)
- **Per wave merge:** `cd bbj-vscode && RUN_BBJ_TESTS=0 npm test`
- **Phase gate:** full suite green (whole-suite `numFailedTests: 0` substitution, per the standing
  decision), THEN the private harness run at the phase boundary (D-17) reporting A2 ≤ 25, A and B
  not regressed

### Wave 0 Gaps
- [ ] `bbj-vscode/test/test-data/conformance/` — new directory, does not exist yet
- [ ] `bbj-vscode/test/conformance-regressions.test.ts` (or equivalent sibling test name) — the
      CONF-01 stricter-assertion loop over the new folder (D-10/D-11); does not exist yet
- [ ] `bbj-vscode/test/variable-scoping.test.ts:353-361` — "Conflicting DECLARE at program scope
      produces error" currently asserts `expectError`; needs to assert Warning severity instead
      once D-06's narrowing lands (the method-scope test at line 281-293 stays Error — its two
      types are unrelated and resolved, exactly the one case D-06/D-09 keeps as an error)
- [ ] `bbj-vscode/test/classes.test.ts:479-493` — "Flags non-void method missing METHODRET"
      asserts `returnErrors.every(d => d.severity === 1 /* Error */)`; needs to assert severity 2
      (Warning) once D-07 lands
- [ ] `bbj-vscode/test/classes.test.ts:603-613` — "Flags value returned from a void method" checks
      only diagnostic count, not severity; add a severity assertion (Warning) alongside the
      existing count check so the D-07 flip is actually tested, not just left un-broken by
      omission

## Security Domain

`security_enforcement` is not present in `.planning/config.json`; per the default, treated as
enabled. This phase touches no authentication, session, access-control, cryptography, or network
surface — it is a parser/validator correctness change against an already-trusted local source
file. No ASVS category applies beyond general input handling, which is unaffected (the grammar
changes add recognition of existing valid BBj syntax; they do not relax any existing rejection).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (indirectly relevant, but no change in trust boundary — the language server already parses arbitrary local `.bbj` files) | N/A |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

None applicable — no new external input source, no new parsing of untrusted network data (the
`TABLE` opaque-rest-of-line token only changes how already-locally-readable source text is
tokenized, not what data it's fed).

## Sources

### Primary (HIGH confidence — read this session)
- `bbj-vscode/src/language/bbj.langium` — full grammar, read in this session
- `bbj-vscode/src/language/bbj-lexer.ts`, `bbj-token-builder.ts` — full source, read in this session
- `bbj-vscode/src/language/validations/line-break-validation.ts` — full source, read in this session
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` (imports, `checkConflictingDeclares`, `getStatements`) — read in this session
- `bbj-vscode/src/language/validations/check-classes.ts` (`checkMethodReturn`, `isAssignable`, `bbjSupertypesReach`, `FINAL_TYPE_ASSIGNABLE_TO`) — read in this session
- `bbj-vscode/src/language/bbj-nodedescription-provider.ts` (`getFQNFullname`, `getClass`) — read in this session
- `bbj-vscode/src/language/bbj-document-validator.ts` — full source, read in this session (diagnostic tiers, linking-error downgrade, `DocumentValidator.LinkingError`)
- `bbj-vscode/node_modules/langium/lib/validation/document-validator.js` — `DocumentValidator.LexingError`/`ParsingError`/`LinkingError` constants, read in this session
- `bbj-vscode/test/example-files.test.ts`, `line-break-validation.test.ts`, `variable-scoping.test.ts`, `classes.test.ts` — read in this session for existing test shapes and exact assertions to update
- `bbj-vscode/syntaxes/bbj.tmLanguage.json` — `keyword.control.bbj` pattern read in this session (confirms TABLE/RESTORE/LOAD/SAVE are absent from TextMate highlighting today)
- This session's own throwaway vitest probe (`bbj-vscode/test/zz-probe-98.test.ts`, written and deleted this session) — direct empirical evidence for every "verified" claim about current AST shapes and diagnostics above
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` (Phase 98 block) — read in this session

### Secondary (MEDIUM confidence)
- `bbj-corpus/conformance/REPORT.md` (A2 section) and `worker.mts` (`NOT_VALIDATION` set) — read this session for shape/classification understanding only; no verbatim text reproduced above per the phase's hard rule

### Tertiary (LOW confidence)
- The recommended D-04 lexer-fix shape (negative lookbehind, Assumption A1) and the `LOAD` grammar
  shape (Assumption A2) — reasoned by analogy to existing patterns in this session, not verified
  against BBj's own compiler documentation (out of scope for this session's tooling)

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no packages involved
- Architecture (TABLE/RESTORE/LOAD/EXIT/keyword-label-target root causes): HIGH — each reproduced directly via probe this session
- Architecture (single-line IF/FI mask fixes): HIGH — reproduced and traced to exact lines in `line-break-validation.ts`
- Architecture (DEF FN multi-line header, LEN= continuation, PRINT trailing comma): LOW — could not reproduce the reported symptom this session; flagged as Open Questions requiring re-probing before implementation
- DECLARE/METHODRET severity plumbing: HIGH — exact functions, line numbers, and existing test assertions to update identified by reading source
- CONF-01 test shape: HIGH — diagnostic filter mechanism confirmed by reading `bbj-document-validator.ts` and Langium's own `DocumentValidator` constants
- Pitfalls: HIGH — each demonstrated empirically this session, not inferred

**Research date:** 2026-09-20
**Valid until:** next `bbj.langium`/`bbj-token-builder.ts`/`line-break-validation.ts` change, or ~14 days (fast-moving in-repo grammar work, not a third-party dependency)

## Orchestrator Addendum — the three unreproduced groups, resolved (2026-09-20)

Shapes established by reading the flagged programs in the private corpus (described in own
words; no corpus text). These supersede the matching "Open Questions" above.

1. **`DEF FN` — "needs to end with a line break: DEF" (11 files).** NOT a header spread over
   continuation lines. The header is on one line; the function is a **multi-line `DEF FN` whose
   body is never closed by `FNEND`** — it runs to the end of the file (10 of 11 files contain no
   `FNEND` at all; the 11th has earlier, properly closed functions and one unclosed final one).
   Bodies contain ordinary statements and one or more `RETURN expr`. The compiler accepts this.
   Probe to reproduce: `def fnx(a$)` / newline / two statements / `return a$` / end of file, no
   `FNEND`; also with a trailing space after `)` and with a blank line after the header.
   Establish what AST results today (which rule swallows the header when `FNEND` is absent) and
   fix at the root: `FNEND` optional at end of input, per D-01.
2. **`LEN=` — "needs to end with a line break: LEN=" (3 files).** NOT a continued I/O option. It
   is a **plain assignment to a variable named `LEN`** at the start of a line (`LEN=<number>`),
   later used as a value. This is a language word used as a variable name — PARSE-08 territory,
   which D-04 assigns to Phase 100. Treat under D-16: fix here only if it falls out trivially
   from another change; otherwise record it as residue handed to Phase 100. It does not get its
   own plan task beyond a probe.
3. **Trailing-comma `PRINT` (2 files).** `print <string var>,` followed by **trailing
   whitespace** before the newline, and the **next line starts with `IF ... THEN`** (multi-line
   IF block). Probe with exactly that: trailing comma + one space + newline + `if … then` block.
   Likely one of the NL-sensitive PRINT tokens or `lineEndRegex` not tolerating `, ` at end.
