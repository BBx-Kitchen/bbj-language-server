# Phase 100: Parser Gaps — Remaining Groups, Long Tail & Examples - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 9 (1 grammar file touched ~6x for the named groups, 1 lexer/token-builder file touched 2x for the oracle-sweep words, 1 validator file touched 3x for the type-side bracket rename, ~6 new test fixtures, 1 new examples-compliance test, `examples/invalid/` new directory, 3 existing tests that must not break)
**Analogs found:** 9 / 9 (all in-repo, all self-analog against sibling rules in the same files Phase 98/99 already touched — no external pattern needed)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-vscode/src/language/bbj.langium` — `ArrayElement` empty-bracket alternative | grammar (modified, self-analog) | transform (source text → AST) | itself — the rule's own existing `all?="ALL"` alternative | exact |
| `bbj-vscode/src/language/bbj.langium` — `VariableDecl`/`FieldDecl`/`MethodDecl`/`ParameterDecl` bracket shapes | grammar (modified, self-analog) | transform | `CastExpression`'s already-shipped `arrayDims+='[' ']'*` pattern | exact |
| `bbj-vscode/src/language/bbj.langium` — `MethodDecl`/`ClassDecl`/`InterfaceDecl`/`DefFunction` end-marker comment tails | grammar (modified, self-analog) | transform | `MethodDeclStart`'s/`ClassDecl`'s own header `(';' comments+=CommentStatement)?` (already shipped, same file) | exact |
| `bbj-vscode/src/language/bbj.langium` — `ClassDecl` leading-`NUMBER` tolerance | grammar (modified, self-analog) | transform | `Program`'s / `MethodDecl`'s own permissive `Statement`-based loops (already tolerate a bare line number, same file) | exact |
| `bbj-vscode/src/language/bbj.langium` — `FeatureName`/`LabelName` per-word additions (`auto`,`declare`,`library`,`use`,`var`,`void`) | grammar (modified, self-analog) | transform | `FeatureName`'s/`LabelName`'s already-shipped `'void'`/`'label'` alternatives (Phase 99) | exact |
| `bbj-vscode/src/language/bbj-token-builder.ts` — `EXCLUDED` set edit (`classend`/`methodend`/`interfaceend`) and `START_BREAK` category grant | lexer/token-builder (modified, self-analog) | transform | the file's own `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL` explicit `CATEGORIES=[id]` grants (lines 40-49) | exact |
| `bbj-vscode/src/language/validations/check-classes.ts` — 3 boolean `.array` reads → `.arrayDims.length` reads | validator (modified, self-analog) | transform | itself — the 3 existing truthy-check sites | exact |
| `bbj-vscode/test/test-data/conformance/*.bbj` (NEW: `whole-array-empty-brackets.bbj`, `multi-bracket-array-types.bbj`, `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj`, `language-words-as-names.bbj`, `statement-option-tails.bbj`) | test fixture / file-I/O | batch | Phase 99's fixtures in the same folder (`field-verb.bbj`, `label-word-as-name.bbj`, `iolist-statement.bbj`) | exact |
| `bbj-vscode/test/conformance-regressions.test.ts` | test (unmodified — consumes new fixtures automatically) | batch (read folder, parse+validate each file) | itself (unchanged since Phase 98) | exact (zero-edit reuse) |
| `bbj-vscode/test/examples-compile.test.ts` (NEW, name/location Claude's discretion) | test (new) | batch (read `examples/*.bbj` and `examples/invalid/*.bbj`, parse+validate + sidecar assertions) | `bbj-vscode/test/conformance-regressions.test.ts` (folder-scan-and-assert shape) and `bbj-vscode/test/example-files.test.ts` (the other "parse every fixture in a directory" test) | role-match (new directory, same scan/assert shape) |
| `examples/*.bbj` (repairs) and `examples/invalid/*.bbj` (moves/splits, NEW directory + README) | test fixture / file-I/O | batch | the files' own current content — D-15/D-16/D-17 are content-only edits, no structural analog needed | n/a (content repair, not a new-file pattern) |

## Pattern Assignments

### `bbj-vscode/src/language/bbj.langium` — empty-bracket array form (grammar, transform)

**Analog:** the rule's own existing `all?="ALL"` alternative — no external file needed, this is a same-rule extension.

**Current rule — the one to edit** (`bbj.langium:833`):
```langium
        | {infer ArrayElement.receiver=current} "[" (all?="ALL" | indices+=Expression (',' indices+=Expression)*) "]"
```
Neither branch matches a bare `[]` — `all?="ALL"` requires the literal, `indices+=Expression` requires ≥1 expression. Confirmed (RESEARCH.md, this session) that every call site — `PRINT` item, `DREAD` target, assignment target, `CALL`/`XCALL` argument, method-call argument, function-call argument, `bbjapi().copy()` — bottoms out through this one `MemberCall`/`Expression` path, so one edit here fixes all of them.

**D-03 hard requirement:** the empty form MUST produce `all=true` (the same node shape as `x[all]`), not merely parse. RESEARCH.md flags this as the single highest-uncertainty edit in the phase (three candidate shapes reasoned, none probed post-edit) — **the executor's own Wave-0 probe must check `all === true` on the parsed node for the empty case, not just `parserErrors.length === 0`.** Do not copy a shape from elsewhere in this grammar for this one; RESEARCH.md's own reasoning is the closest thing to an analog here.

**Downstream readers — confirmed uniform, no provider/validator change needed once `all=true` is set:**
- `bbj-vscode/src/language/validations/check-variable-scoping.ts:144,164,183` — `isArrayElement(item)` → `.receiver` (or `.variable.receiver`), regardless of `all` vs `indices`.
- `bbj-vscode/src/language/setopts-code-scanner.ts:230` — same `.receiver` unwrap.
- `bbj-vscode/src/language/bbj-validator.ts:89` — `isArrayElement(e) && e.all` (the `except` check) — already expects `all` as the discriminator; this is the pattern to match, confirming D-03's requirement is load-bearing, not cosmetic.

**Still-flagged cases to add (D-24), already confirmed genuine parser errors today:** `print x[` (unclosed, EOF) and `print x[,]` (leading comma, nothing before it) — both must keep failing.

---

### `bbj-vscode/src/language/bbj.langium` — type-side bracket shapes (grammar, transform)

**Analog:** `CastExpression`'s already-shipped multi-bracket pattern (`bbj.langium:890-892`):
```langium
CastExpression:
    'CAST' '(' castType=QualifiedClass (arrayDims+='[' ']')* ',' value=Expression Err? RPAREN
;
```

**Four sites sharing today's single-pair pattern, all to be changed the same way:**
```langium
// bbj.langium:335-336
VariableDecl returns VariableDecl:
    'declare' auto?='auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName;

// bbj.langium:377-379
FieldDecl returns FieldDecl:
    'FIELD' Visibility Static type=QualifiedClass (array?='[' ']')? name=FeatureName ('=' init=Expression)?  (';' comments+=CommentStatement)?
;

// bbj.langium:391 (fragment MethodDeclStart, the return-type position)
    'METHOD' Visibility Static (voidReturn?='void' | (returnType=QualifiedClass (array?='[' ']')?) )? name=ValidName ...

// bbj.langium:402-404
ParameterDecl returns VariableDecl:
    {infer ParameterDecl} type=QualifiedClass (array?='[' ']')? name=FeatureName
;
```
**Recommended fix:** replace `(array?='[' ']')?` with `(arrayDims+='[' ']')*` at all four sites, mirroring `CastExpression` exactly. This is a **breaking rename** — `array: boolean` → `arrayDims: string[]` — for the 3 existing truthy reads in `check-classes.ts` (analog: itself, same file, same pattern repeated 3x):
```typescript
// bbj-vscode/src/language/validations/check-classes.ts:307
if (meth.array) {
// bbj-vscode/src/language/validations/check-classes.ts:369
if (!isTypeResolutionWarningsEnabled() || meth.array) {
// bbj-vscode/src/language/validations/check-classes.ts:436
if (!field.init || field.array) {
```
Each becomes `if (meth.arrayDims.length > 0)` / `if (field.arrayDims.length > 0)` — mechanical, 3-line follow-up.

**`ParameterDecl`'s post-name `[all]` shape is a *different* defect** (no grammar position exists there at all today, not a multi-pair issue) — needs a genuinely new trailing element, not the `CastExpression` reuse:
```langium
{infer ParameterDecl} type=QualifiedClass (array?='[' ']')? name=FeatureName ('[' all?='ALL' ']')?
```
RESEARCH.md flags this as `[ASSUMED]` (whether bare `dat[]`, not just `dat[all]`, is compiler-accepted on a parameter — not independently probed against `bbjcpl` this session, since a lone parameter isn't a compilable program). Confirm with a Wave-0 probe before locking the shape.

---

### `bbj-vscode/src/language/bbj.langium` — block-boundary comment tails (grammar, transform)

**Analog:** `MethodDeclStart`'s and `ClassDecl`'s own header, both of which already carry the exact tail needed (`bbj.langium:344`, `:392`):
```langium
    ('IMPLEMENTS' implements+=QualifiedClass)? (',' implements+=QualifiedClass)*  (';' comments+=CommentStatement)?
...
    ... RPAREN (';' comments+=CommentStatement)?
```
**Four end-markers currently missing this tail** (`bbj.langium`):
```langium
// MethodDecl (~:381-388)
        endTag='METHODEND'
    )?
;

// ClassDecl (~:341-347)
    (members+=ClassMember | Comments)*
    'CLASSEND'

// InterfaceDecl — analogous 'INTERFACEEND' literal, same shape

// DefFunction — both the single-line (RPAREN_NO_NL '=' value=Expression) and
// multi-line (RPAREN_NL (body+=...)* FNEND?) branches
```
**Recommended fix**, identical shape repeated 4 times — do not invent a new lexer mechanism (see `Don't Hand-Roll` in RESEARCH.md, "a new lexer token that swallows the terminator" is explicitly rejected in favor of this):
```langium
endTag='METHODEND' (';' comments+=CommentStatement)?
'CLASSEND' (';' comments+=CommentStatement)?
'INTERFACEEND' (';' comments+=CommentStatement)?
RPAREN_NO_NL '=' value=Expression (';' comments+=CommentStatement)?
| RPAREN_NL (body += (DefReturn | Statement))* FNEND? (';' comments+=CommentStatement)?
```
Confirmed (probe, this session) that `methodend; rem c` followed by more content corrupts the whole surrounding `ClassDecl` into loose `ExpressionStatement`s (mid-stream recovery), while `classend; rem c` as the last thing in a file produces only an isolated trailing error — both symptoms are fixed by the same tail addition landing at the point of mismatch.

---

### `bbj-vscode/src/language/bbj.langium` — line-numbered class code (grammar, transform)

**Analog:** `Program`'s and `MethodDecl`'s own permissive `Statement`-based loops, which already silently absorb a bare leading line number as its own `ExpressionStatement` — confirmed by probe (0 errors for `0016 print "x"` inside a method body, and for `0010 class public A`... at top level).

**Current strict allow-list — the rule to widen** (`bbj.langium:341-347`):
```langium
ClassDecl returns BbjClass:
    'CLASS' Visibility Static name=ValidName 
        Extends?
        ('IMPLEMENTS' implements+=QualifiedClass)? (',' implements+=QualifiedClass)*  (';' comments+=CommentStatement)?
    (members+=ClassMember | Comments)*
    'CLASSEND'
```
`(members+=ClassMember | Comments)*` has no `NUMBER?` fallback the way `Program`'s/`MethodDecl`'s loops do — a bare line number directly before a member line or before `CLASSEND` breaks the whole class (mid-stream recovery, same corruption pattern as the comment-tail case above).

**Recommended fix** (RESEARCH.md's own reasoned shape, not independently probed post-edit):
```langium
ClassDecl returns BbjClass:
    'CLASS' Visibility Static name=ValidName Extends?
        ('IMPLEMENTS' implements+=QualifiedClass)? (',' implements+=QualifiedClass)* (';' comments+=CommentStatement)?
    (NUMBER? (members+=ClassMember | Comments))*
    NUMBER? 'CLASSEND' (';' comments+=CommentStatement)?
;
```
**Scope note:** CONTEXT names only `ClassDecl` — `InterfaceDecl`'s member loop has the identical gap but is explicitly out of scope unless D-14 triage later finds a corpus file needing it (Open Question 2, RESEARCH.md). Do not extend to `InterfaceDecl` speculatively.

---

### `bbj-vscode/src/language/bbj.langium` — oracle-sweep words as names (grammar, transform)

**Analog:** `FeatureName`'s and `LabelName`'s own already-shipped `'void'`/`'label'` alternatives — the exact Phase 99 mechanism, reused verbatim for a longer word list.

**`FeatureName` — the precedent to extend** (`bbj.langium:913-916`):
```langium
FeatureName returns string:
    // 'void' is a keyword only for a method's void-return marker (MethodDeclStart), which uses
    // ValidName for the method name — so it never conflicts here. Allowing it as a FeatureName
    // lets `void` be used as an ordinary (numeric) variable/field/member name (#439).
    ID | ID_WITH_SUFFIX | 'void';
```
Add `| 'auto' | 'declare' | 'library' | 'use' | 'var'` (variable position), each with its own comment following the existing style.

**`LabelName` — the precedent to extend** (`bbj.langium:440-445`):
```langium
// A label declaration's name may be an ordinary identifier or the word 'label' itself -- narrowly
// scoped (unlike ValidName) so this widening doesn't also let 'label' name a class, method,
// library function or library variable, all of which are typed by ValidName elsewhere.
LabelName returns string:
    ID | 'label';
```
Add `| 'void' | 'auto' | 'declare' | 'library' | 'use' | 'var'` (label/branch-target position).

**`classend`/`methodend`/`interfaceend` — a different mechanism, NOT the `FeatureName`/`LabelName` route.** These are uppercase-declared and already excluded on purpose:
```typescript
// bbj-vscode/src/language/bbj-token-builder.ts:6
static EXCLUDED = new Set(['METHODEND', 'CLASSEND', 'INTERFACEEND'])
```
Fix: delete the three names from this `Set`, granting them the same generic `CATEGORIES=[ID]` fallback every other uppercase keyword already gets automatically (`bbj-token-builder.ts:26-35`). No `FeatureName`/`LabelName` edit for these three. RESEARCH.md flags this as higher-risk than the lowercase-word additions — no test comment explains the original exclusion — so the executor's Wave-0 probe must specifically try `methodend=1` immediately before a real `METHODEND`/`CLASSEND` and diff any new `langium:generate` ambiguity warning against the pre-existing baseline (per standing memory that some Chevrotain warnings are benign).

**`start` — a third, distinct mechanism, NOT `FeatureName`/`LabelName` and NOT the `EXCLUDED` set.** `START_BREAK` is a custom-`PATTERN` terminal with no `CATEGORIES` grant today. Analog: the file's own `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL` explicit grants, immediately below the generic loop (`bbj-token-builder.ts:40-49`):
```typescript
        const releaseNl = terminalTokens.find(e => e.name === 'RELEASE_NL')!;
        const releaseNoNl = terminalTokens.find(e => e.name === 'RELEASE_NO_NL')!;
        releaseNl.CATEGORIES = [id];
        releaseNoNl.CATEGORIES = [id];
        releaseNl.LONGER_ALT = [idWithSuffix, id];
        releaseNoNl.LONGER_ALT = [idWithSuffix, id];

        const exitNoNl = terminalTokens.find(e => e.name === 'EXIT_NO_NL')!;
        exitNoNl.CATEGORIES = [id];
        exitNoNl.LONGER_ALT = [idWithSuffix, id];
```
Recommended fix: add an identical 3-line block for `START_BREAK` (`terminalTokens.find(e => e.name === 'START_BREAK')!`, `CATEGORIES = [id]`, `LONGER_ALT = [idWithSuffix, id]`) right after the `exitNoNl` block. Do not touch `FeatureName`/`LabelName` for `start` — RESEARCH.md explicitly warns against pattern-matching the wrong one of the three mechanisms (its own "Pitfall 3").

**Word-list-in-tracked-file note (D-06/D-27):** the accepted-word list for `language-words-as-names.bbj` is itself allowed as tracked content — this is the one place a word list belongs in a file, per D-06's own instruction ("the accepted set becomes the word list of the regression file").

---

### `bbj-vscode/test/test-data/conformance/*.bbj` (NEW fixtures, batch/file-I/O)

**Analog:** Phase 99's fixtures in the same folder — `field-verb.bbj` (new-statement-rule regression), `label-word-as-name.bbj` (per-word-as-name regression), `iolist-statement.bbj` (new-statement-rule regression) — same folder, same harness, zero test-code change needed.

**Convention (unchanged from Phase 98/99):** one file per construct group — `whole-array-empty-brackets.bbj`, `multi-bracket-array-types.bbj`, `rem-after-block-boundaries.bbj`, `line-numbered-class.bbj`, `language-words-as-names.bbj`, `statement-option-tails.bbj` (or split per long-tail shape, planner's call per RESEARCH.md's Wave-0-gaps note) — leading `REM` stating in behaviour terms what the file protects, upper- and lower-case keyword variants, invented names, no requirement/plan/decision IDs anywhere in filename or content. Drop into `bbj-vscode/test/test-data/conformance/` — `conformance-regressions.test.ts` already scans it (confirmed unmodified this session, identical to the excerpt below).

---

### `bbj-vscode/test/conformance-regressions.test.ts` (existing, zero-edit reuse)

**Analog:** itself. Confirmed current content (unchanged since Phase 98):
```typescript
describe('Conformance regression Tests', () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Model>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Model>(services.BBj);
    });

    const conformanceFolder = path.join(__dirname, './test-data/conformance');

    test('Every fixture in "test-data/conformance" parses and validates clean', async () => {
        const files = fs.readdirSync(conformanceFolder).filter(file => file.endsWith('.bbj')).sort();
        expect(files.length, `conformance folder "${conformanceFolder}" has no fixtures — an empty folder protects nothing`).toBeGreaterThan(0);
        for (const file of files) {
            const result = await validate(fs.readFileSync(path.join(conformanceFolder, file), 'utf-8'));
            expect(result.document.parseResult.lexerErrors, `${file}: lexer errors`).empty;
            expect(result.document.parseResult.parserErrors, `${file}: parser errors`).empty;
            const errorDiagnostics = result.diagnostics.filter(d =>
                d.severity === DiagnosticSeverity.Error &&
                d.data?.code !== DocumentValidator.LinkingError
            );
            expect(errorDiagnostics, `${file}: validation errors`).empty;
        }
    });
```
No code change needed — the six new fixtures are picked up automatically once written to the folder.

---

### `bbj-vscode/test/examples-compile.test.ts` (NEW, D-19)

**Analog:** `conformance-regressions.test.ts`'s own folder-scan-and-assert shape (`beforeAll` → `initializeWorkspace` → `validationHelper` → loop `fs.readdirSync` → assert zero lexer/parser errors + zero error-severity diagnostics), extended with two additions this phase's D-19 requires that the analog does not have:
1. A second folder (`examples/invalid/`) whose files are expected to carry diagnostics, checked against a sidecar (line/message fragment/severity, or an explicit `"none today — compiler-only"` entry) instead of asserted clean.
2. A `RUN_BBJ_TESTS`-gated second layer invoking `bbjcpl` directly — analog for the spawn/parse pattern is `bbj-cpl-service.ts` (how the project already invokes `bbjcpl`) plus RESEARCH.md's own confirmed-safe invocation shape:
```javascript
// RESEARCH.md "Code Examples" — bbjcpl cross-check, spawnSync NOT execFileSync (stderr is dropped otherwise)
import { spawnSync } from 'node:child_process';
const res = spawnSync('/opt/bbx/bin/bbjcpl', ['-N', filePath], { encoding: 'utf8', timeout: 5000 });
const errorText = (res.stdout || '') + (res.stderr || ''); // '' means bbjcpl accepted the file
```
Follow the project's existing `RUN_BBJ_TESTS` gating convention (see any test using it, e.g. `bbj-vscode/test/example-files.test.ts` or `linking.test.ts`) for how the BBj-gated layer is skipped by default.

**`examples/invalid/` directory + README (NEW, D-16):** no in-repo analog (new concept this phase) — flat folder, issue-numbered filenames kept from their `examples/` origin, short README stating these files fail to compile on purpose and what each demonstrates. Content is prose, not code — no pattern to copy, write directly per D-16's own description.

**`config.bbx`/`functions.bbl` exclusion (D-20):** exclude by extension filter in the same `fs.readdirSync(...).filter(file => file.endsWith('.bbj'))` shape `conformance-regressions.test.ts` already uses (see excerpt above) — these two files are non-`.bbj` and are already naturally excluded by that same filter; state the reason in a comment, no special-case code needed.

---

### `examples/*.bbj` repairs and splits (D-15/D-16/D-17/D-18)

**No structural analog — content-only edits.** Each of the 17 currently-failing files needs its own targeted repair per RESEARCH.md's Open Questions 3-5 and its own per-file root cause list (Summary/EXMP-01 row). Three load-bearing cross-file interactions to check before any move/split, all already grepped this session (RESEARCH.md "Sources"):
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` (lines 713, 845) — hardcodes the literal text of `issue650-composer-cues.bbj`'s failing line (`win3! = ... : win4! = ...`); repairing the `:` to a compiler-accepted `;` must update both string literals in the **same task** (Open Question 3).
- `bbj-vscode/test/textmate-bbx-highlighting.test.ts`, `bbj-vscode/test/utils.test.ts` — grepped this session, reference non-`.bbj` files / plain path strings only, no interaction confirmed.
- `issue246.bbj` (`fileopen`/`filesave` with `MODE=`) — RESEARCH.md's own conclusion is this is the D-18 "false premise" case: move to `examples/invalid/` with "no diagnostic today" and file the prescribed todo, do not search further for a valid spelling.

## Shared Patterns

### Grammar-only fix, no new lexer mechanism (default)
**Source:** RESEARCH.md "Don't Hand-Roll"; confirmed against every excerpt above.
**Apply to:** empty-bracket form, type-side brackets, block-boundary comment tails, line-numbered class code, and the 5 lowercase-word `FeatureName`/`LabelName` additions. None of these needs a new custom Chevrotain token — plain uppercase-declared keywords get `CATEGORIES:[ID]` automatically from the existing generic loop (`bbj-token-builder.ts:26-35`) once added to the grammar; the lowercase words reuse the exact `FeatureName`/`LabelName` mechanism already shipped in Phase 99.

### Token-builder-only fix (the two exceptions)
**Source:** RESEARCH.md "Pitfall 3" — three coexisting "keyword excluded from ID fallback" mechanisms, each needing its own fix shape.
**Apply to:** `classend`/`methodend`/`interfaceend` (delete from `BBjTokenBuilder.EXCLUDED`, `bbj-token-builder.ts:6`) and `start` (add explicit `CATEGORIES=[id]`/`LONGER_ALT` grant to `START_BREAK`, mirroring `RELEASE_NL`/`EXIT_NO_NL` at `bbj-token-builder.ts:40-49`). Do NOT add these to `FeatureName`/`LabelName` — that mechanism only fixes lowercase-declared keywords, not these two different defect classes.

### Probe-before-and-after technique (D-25, Phase 98/99 convention, reused)
**Source:** RESEARCH.md "Code Examples"; 98-PATTERNS.md / 99-PATTERNS.md, same technique.
**Apply to:** every grammar/token-builder edit in this phase, and specifically the two highest-uncertainty ones flagged by RESEARCH.md: the empty-bracket `all=true` check, and the `EXCLUDED`-set removal's ambiguity-warning diff. Write a scratch vitest file using `parseHelper`/`validationHelper`, print `$type`s and diagnostics (and, for the bracket fix, the parsed node's `all`/`indices` properties), run before AND after each edit, delete the scratch file before finishing (register-check scans for stray files). `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/<scratch>.test.ts` — never `--reporter=basic` (not supported by vitest 4.1.10, per project memory); use `--disable-console-intercept` if the probe prints, or write results to a file.

### `npm run langium:generate` after every grammar edit
**Source:** D-22, CLAUDE.md.
**Apply to:** every group except the two token-builder-only fixes (`EXCLUDED` set, `START_BREAK` categories) and the `check-classes.ts` rename follow-up. Run with Node 22 (Node 24 breaks this command, per standing memory) after each `bbj.langium` change, before probing; never edit `src/language/generated/` directly.

### CONF-01 diagnostic filter (unchanged from Phase 98/99, reused as-is)
**Source:** `bbj-vscode/test/conformance-regressions.test.ts` (verified current content, excerpt above).
**Apply to:** all six new conformance fixtures — no test-file edit needed, the existing filter already runs against everything in the folder.

### Whole-suite test invocation
**Source:** CLAUDE.md, Phase 98/99 `PATTERNS.md`.
**Apply to:** every plan in this phase. `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` per-task; `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npm test --maxWorkers=2` per-wave, judged on `numFailedTests: 0`.

### Shape-level residue list, not file-by-file
**Source:** D-11, D-13.
**Apply to:** PARSE-09's long-tail triage. `100-CONFORMANCE.md` gets own-words shape descriptions, file counts, and reason categories (*not a program* / *compiler quirk* / *deliberately out of scope* / *valid but disproportionate to fix now*) — no corpus file name, path, or source line in any tracked file (D-27). The file→shape mapping itself stays in the private `bbj-corpus` repo.

## No Analog Found

- `examples/invalid/` directory + README — new concept this phase, no in-repo precedent; write directly per D-16.
- `examples-compile.test.ts`'s BBj-gated (`RUN_BBJ_TESTS`) layer invoking `bbjcpl` per-example — no existing test does folder-scan + `bbjcpl` compile-or-fail per file; closest partial analogs are `bbj-cpl-service.ts` (how the LS itself invokes `bbjcpl`) and RESEARCH.md's own confirmed `spawnSync` snippet (see excerpt above) — role-match, not exact.
- Bare-number `GOTO`/`GOSUB` branch targets — explicitly recorded as needing a new addressing mechanism, not fixed this phase (RESEARCH.md "Don't Hand-Roll"); no file to write a pattern for.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/bbj.langium` (full grammar, `ArrayElement`/`VariableDecl`/`FieldDecl`/`MethodDecl`/`ParameterDecl`/`ClassDecl`/`FeatureName`/`LabelName`/`CastExpression` rules, all read/grepped this session with current line numbers verified), `bbj-vscode/src/language/bbj-token-builder.ts` (full file, `EXCLUDED` set and `CATEGORIES`/`LONGER_ALT` grant blocks verified at current line numbers), `bbj-vscode/src/language/validations/check-classes.ts` (3 `.array` read sites verified), `bbj-vscode/test/test-data/conformance/` (Phase 98/99 fixture naming convention), `bbj-vscode/test/conformance-regressions.test.ts` (full current content read and verified unchanged), `examples/` (directory listing, 81 `.bbj` files confirmed present), `100-RESEARCH.md`/`99-PATTERNS.md` for method and format precedent.
**Files scanned:** 2 source files re-read/re-verified this session with fresh `grep -n` line numbers (`bbj.langium`, `bbj-token-builder.ts`), 1 validator file grepped (`check-classes.ts`), 1 test file read in full (`conformance-regressions.test.ts`), 1 prior-phase pattern file read in full (`99-PATTERNS.md`) for format, `examples/` directory listed (not individually re-read — RESEARCH.md's own per-file probes are the source of truth for the 17 failing files' root causes).
**Pattern extraction date:** 2026-09-21
