# Phase 99: Parser Gaps — the Largest Groups - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 6 (1 grammar file touched 4x for the four groups, 4 new test fixtures, 1 existing test file that needs zero change but supplies the harness)
**Analogs found:** 6 / 6 (all in-repo — this phase edits one existing grammar file plus adds fixtures into an already-existing folder/harness, same convention as Phase 98)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-vscode/src/language/bbj.langium` — new `FieldStatement` rule + `SingleStatement` registration | grammar (modified, self-analog) | transform (source text → AST) | itself — `TableStatement` (new-rule-with-no-prior-fallback precedent), `SaveStatement`/`LoadStatement` (keyword + comma-list-of-Expression shape) | exact |
| `bbj-vscode/src/language/bbj.langium` — `LastVerifyOption` unfuse (`'LEN='` → `'LEN' '='`) | grammar (modified, self-analog) | transform | itself — `RestoreStatement`'s `RESTORE_NO_NL lineref=(LabelRef \| NUMBER)` (widened-alternative precedent), `Option` rule (the sibling rule the fused literal currently breaks) | exact |
| `bbj-vscode/src/language/bbj.langium` — `label` as a name (`FeatureName` extension + new `LabelName` rule for `LabelDecl`/`UserLabelRef`) | grammar (modified, self-analog) | transform | itself — `FeatureName`'s existing `'void'` alternative (already-shipped identical defect fix) | exact |
| `bbj-vscode/src/language/bbj.langium` — new `IolistStatement` rule + `SingleStatement` registration | grammar (modified, self-analog) | transform | itself — `RedimStatement` (`'REDIM' arrays+=Expression (',' arrays+=Expression)* Err?`, closest existing `KEYWORD items+=Expression (',' items+=Expression)*` shape in the file) | exact |
| `bbj-vscode/test/test-data/conformance/field-verb.bbj`, `record-verbs-len-option.bbj`, `label-word-as-name.bbj`, `iolist-statement.bbj` (NEW) | test fixture / file-I/O | batch | `bbj-vscode/test/test-data/conformance/table-statement.bbj`, `restore-numeric.bbj`, `keyword-branch-targets.bbj` (Phase 98 fixtures, same folder/convention) | exact |
| `bbj-vscode/test/conformance-regressions.test.ts` | test (unmodified — consumes the new fixtures automatically) | batch (read folder, parse+validate each file) | itself (already exists from Phase 98, no code change needed) | exact (zero-edit reuse) |

## Pattern Assignments

### `bbj-vscode/src/language/bbj.langium` — `FieldStatement` (grammar, transform)

**Analog:** `TableStatement` (`bbj-vscode/src/language/bbj.langium:236-238`) for "new rule, no prior grammar alternative claims this keyword's verb form, add to `SingleStatement`"; `SaveStatement`/`LoadStatement` (lines 228-230, 510-512) for "keyword + `Expression` args" shape; `Expression`'s level split (lines 772-786) for why the name part must NOT be a bare `Expression`.

**`SingleStatement` alternation — registration point** (lines 26-122, alphabetical):
```langium
    EnterStatement |
    EraseStatement |
    ExecuteStatement |
    ExitToStatement |
    ExitWithNumberStatement |
    FileOptStatement |
```
`FieldStatement` goes between `ExitWithNumberStatement` and `FileOptStatement` (alphabetical convention this list already follows strictly — confirm placement against the *current* list at implementation time, since earlier groups in this same phase change nearby line numbers).

**`TableStatement` — the "no existing alternative claims this keyword" precedent** (lines 236-238):
```langium
TableStatement:
    'TABLE' data=TABLE_DATA
    ;
```
Same defect shape as `FIELD`: before this rule existed, `TABLE` fell back to a bare identifier `ExpressionStatement` exactly like `FIELD` does today (per RESEARCH.md's Summary). The fix pattern is identical: add one new `SingleStatement` alternative naming the keyword explicitly.

**`FeatureName`'s expression-level split — the load-bearing detail for the name part (Orchestrator Addendum #1):** `Expression` (line 772) delegates through `BinaryExpression` → `RelationalExpr` (line 781-782) which consumes `=` as a comparison operator:
```langium
RelationalExpr infers Expression:
    AdditiveExpr ({infer BinaryExpression.left=current} operator=('<' | '>' | '=' | '<=' | '>=' | '<>' ) right=AdditiveExpr)*

AdditiveExpr infers Expression:
```
A `name=Expression '=' value=Expression` rule shape is NOT usable as written — LL(k) with no backtracking will consume `name$=dec(x$)` as one `RelationalExpr` comparison and then fail on the statement's own `=`. The `name` part must be written at the `AdditiveExpr` level (below the relational `=`), e.g. `name=AdditiveExpr`, mirroring how `Assignment` avoids this exact problem by typing its left side `MemberCall` rather than full `Expression` (see the `Assignment`/`MemberCall` grammar near line 805 for the sibling precedent of "left side typed one level down to dodge `=`").

**Recommended shape (Orchestrator-corrected), modeled on `RedimStatement`'s and `SaveStatement`'s comma-arg style:**
```langium
FieldStatement:
    'FIELD' record=Expression ',' name=AdditiveExpr '=' value=Expression
;
```
`value=Expression` stays mandatory (no `?`) so `FIELD rec$,name$` (no `=value`) keeps producing a parser error — satisfies D-09's "still flagged: a FIELD verb without `=value`" with no extra rule.

**`FieldDecl` — must stay untouched, different call-site, confirm no interaction** (lines 361-367):
```langium
ClassMember returns ClassMember:
    FieldDecl | MethodDecl | VariableDecl
;

FieldDecl returns FieldDecl:
    'FIELD' Visibility Static type=QualifiedClass (array?='[' ']')? name=FeatureName ('=' init=Expression)?  (';' comments+=CommentStatement)?
;
```
`FieldDecl` is reachable only through `ClassMember` (used inside `ClassDecl`), never through `SingleStatement` — the two `'FIELD'`-led rules are never alternatives at the same decision point, so no grammar collision. Do not touch this rule.

---

### `bbj-vscode/src/language/bbj.langium` — `LastVerifyOption` unfuse (grammar, transform)

**Analog:** itself — the one rule being edited; `Option` (the sibling rule the fused literal currently breaks); `RestoreStatement`'s widened-alternative shape as the nearest "split one rule's literal into ordinary elements" precedent in this file.

**Current fused literal — the rule to edit** (lines 656-659):
```langium
LastVerifyOption:
    ('LEN=' min=Expression ',' max=Expression) // LEN=intA,intB
    | min=Expression // numvar:(4) num A numeric expression can impose range and precision on the numeric input
;
```

**`Option` — the sibling rule this fused literal currently breaks for `READ RECORD`'s channel options** (lines 545-547):
```langium
Option:
    key=ValidName '=' value=(Expression | LabelRef)
;
```
Where `Options` (line 541-543, `fragment Options: (',' options+=Option)+`) is used by `WithChannelAndOptionsAndInputItems`/`WithChannelAndOptionsAndOutputItems`, shared by `ReadStatement` (line 611-613), `ReadRecordStatement` (line 623-625), and `PrintStatement` (line 514-524) — one fix in `LastVerifyOption` covers all six sibling verbs since they all funnel through this one `Options`/`Option` fragment.

**Recommended fix** (delete the fused literal, replace with ordinary keyword + punctuation):
```langium
LastVerifyOption:
    ('LEN' '=' min=Expression ',' max=Expression)
    | min=Expression
;
```
`'LEN'` (all-uppercase declared text) automatically gets `CATEGORIES:[ID]` from `bbj-token-builder.ts`'s existing generic loop (no token-builder edit needed) — this is what makes `LEN` usable as a plain variable (`LET LEN=5`) as a side effect of this one-line change.

---

### `bbj-vscode/src/language/bbj.langium` — `label` as a name (grammar, transform)

**Analog:** `FeatureName`'s already-shipped `'void'` alternative — the identical defect (lowercase-declared keyword excluded from the generic ID-category fallback) already fixed once in this exact file.

**`FeatureName` — the precedent to extend, verbatim style** (lines 886-890):
```langium
FeatureName returns string:
    // 'void' is a keyword only for a method's void-return marker (MethodDeclStart), which uses
    // ValidName for the method name — so it never conflicts here. Allowing it as a FeatureName
    // lets `void` be used as an ordinary (numeric) variable/field/member name (#439).
    ID | ID_WITH_SUFFIX | 'void';
```
Extend to `ID | ID_WITH_SUFFIX | 'void' | 'label';` (with a comment in the same style, explaining why `label` is safe here) — covers the variable-assignment position (`label = x + 1`) since `Assignment.variable=MemberCall` resolves through `SymbolRef.symbol=[NamedElement:FeatureName]`.

**`LabelDecl` and `UserLabelRef` — currently typed by `ValidName`, need a narrower new rule** (lines 416-418, 475-477, 892-894):
```langium
LabelDecl returns LabelDecl:
    name=ValidName':'
;
...
UserLabelRef infers LabelRef:
   {infer UserLabelRef} label=[LabelDecl:ValidName]
;
...
ValidName returns string:
    ID
;
```
Widening `ValidName` directly would let `label` be used as a `ClassDecl`/`MethodDecl`/`LibFunction`/`LibVariable` name too (every other `ValidName` call site) — broader than D-04 asks. Recommended: a new narrowly-scoped rule mirroring `FeatureName`'s style:
```langium
LabelName returns string:
    ID | 'label';
;
```
then change exactly:
```langium
LabelDecl returns LabelDecl:
    name=LabelName':'
;

UserLabelRef infers LabelRef:
   {infer UserLabelRef} label=[LabelDecl:LabelName]
;
```

**`LibSymbolicLabel` — must keep working unchanged, confirms non-interaction** (lines 924-927):
```langium
LibSymbolicLabel returns LibSymbolicLabelDecl:
    (docu=DOCU)?
    'label' name=SymbolicLabelName
;
```
Keyword tokens are deduplicated by text, not by declaring rule — `'label'` stays one shared token; this rule's own exact-match consumption is unaffected by `label` also appearing as an alternative inside `FeatureName`/`LabelName`. Do not touch this rule. Regression-checked for free by `bbj-vscode/src/language/lib/labels.bbl` (loaded by every `initializeWorkspace()` call in the whole suite).

**`GotoStatement`/`OnGotoStatement` — no grammar change needed, confirms `label` as branch target follows from the `LabelDecl`/`UserLabelRef` fix alone** (lines 462-468):
```langium
GotoStatement:
    kind=('GOTO' | 'GOSUB') target=LabelRef
;

OnGotoStatement:
    'ON' int=Expression kind=('GOTO' | 'GOSUB') targets+=LabelRef (',' targets+=LabelRef)*
    ;
```
Both already resolve through `LabelRef` → `UserLabelRef` → `[LabelDecl:LabelName]`, so once `LabelDecl`'s name type widens, `GOTO label`/`GOSUB label` work with no edit here.

---

### `bbj-vscode/src/language/bbj.langium` — `IolistStatement` (grammar, transform)

**Analog:** `RedimStatement` — closest existing `'KEYWORD' items+=Expression (',' items+=Expression)*` shape in the file (line 412-414):
```langium
RedimStatement:
    'REDIM' arrays+=Expression (',' arrays+=Expression)* Err?
;
```

**Recommended fix, structurally identical minus the optional `Err?`:**
```langium
IolistStatement:
    'IOLIST' items+=Expression (',' items+=Expression)*
;
```
Add to `SingleStatement` alphabetically between `InitFileStatement` and `KeyedFileStatement` (lines 69-70):
```langium
    InitFileStatement |
    KeyedFileStatement |
```
`items+=Expression (',' items+=Expression)*` requires at least one item (not optional) — a bare `IOLIST` with no items stays a parser error, a natural "still flagged" case per D-17. `Expression`'s existing `MemberCall`/`ArrayElement` postfix already covers `D[ALL]` array items — no separate item-type rule needed (see `Don't Hand-Roll` in RESEARCH.md).

**`OtherItem`'s `IOL=` — unrelated, unchanged, confirms no collision** (lines 603-606):
```langium
OtherItem:
    ASTERISK_STANDALONE //treats an asterisk as a null field
    | ('IOL=' iol=LabelRef) //Refers to the IOLIST statement
;
```
`'IOL='` stays fused per D-02/Deferred Ideas — do not touch. `IOL=<label>` resolves against any `LabelDecl`, including one immediately in front of an `IolistStatement`; no separate fix needed once `IolistStatement` itself parses.

---

### `bbj-vscode/test/test-data/conformance/*.bbj` (NEW fixtures, batch/file-I/O)

**Analog:** the nine existing Phase 98 fixtures in this same folder — `table-statement.bbj`, `restore-numeric.bbj`, `keyword-branch-targets.bbj` are the closest in shape (new-statement-rule and keyword-as-name regression coverage respectively).

**Convention (D-16, unchanged from Phase 98):** one file per construct group, named for the construct — `field-verb.bbj`, `record-verbs-len-option.bbj`, `label-word-as-name.bbj`, `iolist-statement.bbj` — a leading `REM` stating in behaviour terms what the file protects, upper- and lower-case variants of the keyword, invented names, no requirement/plan/decision IDs anywhere in the file or its name. Drop into the same folder — `conformance-regressions.test.ts` already scans it (confirmed unmodified, zero code change needed).

---

### `bbj-vscode/test/conformance-regressions.test.ts` (existing, zero-edit reuse)

**Analog:** itself — already reads every `.bbj` file in `test-data/conformance/` and asserts zero lexer/parser errors and zero error-severity diagnostics (linking excluded). No new fixture-discovery code needed; the four new fixtures are picked up automatically once written to the folder.

## Shared Patterns

### Grammar-only fix, no lexer/token-builder change
**Source:** RESEARCH.md Summary + "Don't Hand-Roll" table; confirmed against the actual grammar excerpts above.
**Apply to:** all four groups. None of the four fixes needs a new custom Chevrotain token (`TABLE_DATA`-style opaque/NL-sensitive) — `FIELD`/`IOLIST`/`LEN` are plain uppercase keywords that get `CATEGORIES:[ID]` automatically from the existing generic loop in `bbj-token-builder.ts` once declared in the grammar; `label`'s fix is a grammar-only extension of the already-shipped `'void'` pattern. Do not touch `bbj-token-builder.ts` or `bbj-lexer.ts` for any of these four groups.

### Probe-before-and-after technique (D-18, Phase 98 Pattern 1, reused)
**Source:** RESEARCH.md "Code Examples", Phase 98's `98-PATTERNS.md` "Probe-before-fix technique".
**Apply to:** every grammar rule change in this phase. Write a scratch vitest file using `parseHelper`/`validationHelper`, print `Program.statements` `$type`s and diagnostics, run before AND after each grammar edit (the Orchestrator Addendum flags the FIELD name-part shape as NOT usable as researched — this must be caught by the post-edit probe), delete the scratch file before finishing (register-check scans for stray files). `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/<scratch>.test.ts --reporter=verbose --silent=false` (never `--reporter=basic`).

### `npm run langium:generate` after every grammar edit
**Source:** D-15, CLAUDE.md.
**Apply to:** all four groups. Run with Node 22 (Node 24 breaks this command, per prior-phase memory) after each `bbj.langium` change, before probing; never edit `src/language/generated/` directly.

### Alphabetical `SingleStatement` registration
**Source:** `bbj.langium` lines 26-122, confirmed strictly alphabetical.
**Apply to:** `FieldStatement` (between `ExitWithNumberStatement`/`FileOptStatement`) and `IolistStatement` (between `InitFileStatement`/`KeyedFileStatement`). Re-locate the exact insertion point by name/content at implementation time, not by the line numbers cited here — each earlier group's edit shifts later line numbers (Open Question 1 in RESEARCH.md).

### CONF-01 diagnostic filter (unchanged from Phase 98, reused as-is)
**Source:** `bbj-vscode/test/conformance-regressions.test.ts` (existing, read this session).
```typescript
const errorDiagnostics = result.diagnostics.filter(d =>
    d.severity === DiagnosticSeverity.Error &&
    d.data?.code !== DocumentValidator.LinkingError
);
expect(result.document.parseResult.lexerErrors, `${file}: lexer errors`).empty;
expect(result.document.parseResult.parserErrors, `${file}: parser errors`).empty;
expect(errorDiagnostics, `${file}: validation errors`).empty;
```
**Apply to:** all four new fixtures — no test-file edit needed, this filter already runs against everything in the folder.

### Whole-suite test invocation
**Source:** CLAUDE.md, Phase 98's `98-PATTERNS.md`.
**Apply to:** every plan in this phase. `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` per-task; `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npm test` per-wave, judged on `numFailedTests: 0`.

## No Analog Found

None — every grammar change is an edit to one already-fully-read file (self-analog against sibling rules), and every new test fixture has a direct structural analog already in the same folder from Phase 98. `line-break-validation.ts` and `check-variable-scoping.ts` are confirmed by RESEARCH.md (read in full this session) to need **zero code change** for D-07/D-10 — no analog needed because no file is touched.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/bbj.langium` (full grammar, all `SingleStatement` alternatives, `Expression`/`FeatureName`/`ValidName`/`LabelDecl`/`LastVerifyOption`/`FieldDecl` rules), `bbj-vscode/test/test-data/conformance/` (existing 9 Phase 98 fixtures), `bbj-vscode/test/conformance-regressions.test.ts`
**Files scanned:** 1 grammar file (full grep sweep + 6 targeted non-overlapping reads), 1 test file (existing, unmodified), 9 existing fixture file names (folder listing only), `98-PATTERNS.md` for format precedent
**Pattern extraction date:** 2026-09-21
