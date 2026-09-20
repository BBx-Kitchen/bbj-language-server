# Phase 98: Line-Break & Validation False Alarms (A2) - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 11 (5 source modified, 1 source possibly new-token, 3 test files modified, 2 new test artifacts)
**Analogs found:** 11 / 11 (all in-repo — this phase edits existing files rather than creating new modules, except the conformance test file/folder)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-vscode/src/language/bbj.langium` (new `TableStatement`, widened `RestoreStatement`/`ExitWithNumberStatement`/new `LoadStatement`, `DefFunction` FNEND-optional) | grammar (modified, self-analog) | transform (source text → AST) | itself — `RestoreStatement`/`SaveStatement`/`GotoStatement`/`DefFunction` rules already in file | exact (edit in place) |
| `bbj-vscode/src/language/bbj-token-builder.ts` (opaque TABLE data token, keyword-label lookbehind fix) | lexer/utility (modified, self-analog) | transform (char stream → token stream) | itself — `EXIT_NO_NL` custom regex + `NEXT_BREAK` lookbehind precedent, `reorderTokenPriorities` | exact (edit in place) |
| `bbj-vscode/src/language/validations/line-break-validation.ts` (`ifStatementLineBreaks`/`ifEndStatementLineBreaks` mask fixes) | middleware/validator (modified, self-analog) | event-driven (AST-node-keyed diagnostic checks) | itself — `lineBreakMap`, `isStandaloneStatement`, `previousStatement`/`getSiblings` | exact (edit in place) |
| `bbj-vscode/src/language/validations/check-variable-scoping.ts` (`checkConflictingDeclares` severity narrowing) | validator (modified, self-analog) | transform (AST → Diagnostic[]) | itself — function at line 308; `check-classes.ts`'s `isAssignable`/`bbjSupertypesReach` for the "related types" test | exact (edit in place) + role-match for reused subtype helper |
| `bbj-vscode/src/language/validations/check-classes.ts` (`checkMethodReturn` severity flips, D-07) | validator (modified, self-analog) | transform (AST → Diagnostic[]) | itself — lines 204-256 | exact (edit in place) |
| `bbj-vscode/src/language/bbj-validator.ts` (possible `registerVariableScopingChecks` signature widen to accept `services`) | config/DI wiring (modified, self-analog) | request-response (registration call) | itself — `registerClassChecks(registry, services)` at line 64 vs. `registerVariableScopingChecks(registry)` at line 65 | exact (edit in place) |
| `bbj-vscode/test/conformance-regressions.test.ts` (NEW) | test | batch (read folder, parse+validate each file) | `bbj-vscode/test/example-files.test.ts` | exact |
| `bbj-vscode/test/test-data/conformance/*.bbj` (NEW, one per construct group) | test fixture / file-I/O | batch | `bbj-vscode/test/test-data/*.bbj` (flat existing fixtures) | exact (same fixture convention, stricter folder) |
| `bbj-vscode/test/line-break-validation.test.ts` (extended, D-14) | test | request-response (parse+validate assertions) | itself — existing positive/negative cases | exact (edit in place) |
| `bbj-vscode/test/variable-scoping.test.ts` (severity assertion flip, ~line 353-361) | test | request-response | itself — method-scope Error case at line 281-293 stays the template for the Error path; program-scope case flips to Warning | exact (edit in place) |
| `bbj-vscode/test/classes.test.ts` (severity assertion flips, ~line 479-493, 603-613) | test | request-response | itself | exact (edit in place) |

## Pattern Assignments

### `bbj-vscode/src/language/bbj.langium` (grammar, transform)

**Analog:** itself — sibling statement rules in the same file.

**RestoreStatement today** (lines 214-216), the shape to widen for `RESTORE n` (VALID-02):
```langium
RestoreStatement:
    'RESTORE' lineref=LabelRef
    ;
```
`lineref` only accepts a `LabelRef` cross-reference; widen its type (e.g. `lineref=(LabelRef | Expression)`) so a numeric/expression restore target no longer falls back to a bare `ExpressionStatement`. Follow the same shape used by `SaveStatement` below for "keyword + Expression" statements.

**SaveStatement pattern to reuse for `LOAD` (VALID-02, Assumption A2 in RESEARCH.md)** (lines 226-228):
```langium
SaveStatement:
     'SAVE' fileid=Expression (',' int=Expression)?
    ;
```
Model `LoadStatement` on this exact shape (`'LOAD' fileid=Expression ...`), and add it to the `SingleStatement` alternation (insert alphabetically near `LCheckInStatement`/`LetStatement`, mirroring how `SaveStatement` sits near `RunStatement`/`SavePStatement` in the alternation list at lines 89-91).

**ExitWithNumberStatement today** (line 478-480), the shape to widen for `EXIT expr` (VALID-02):
```langium
ExitWithNumberStatement:
    EXIT_NO_NL exitVal=Expression | kind='EXIT' | RELEASE_NL | RELEASE_NO_NL exitVal=Expression
;
```
This is grammar-correct already for numeric literals; the actual defect for `EXIT expr` (an identifier expression like `EXIT ERR`) is in the lexer's `EXIT_NO_NL` regex (see token-builder section below) — **do not touch this grammar rule** per the Anti-Pattern warning in RESEARCH.md (widening the regex without excluding flow-control keywords breaks `IF x THEN EXIT ELSE ...`).

**GotoStatement / OnGotoStatement — target of the keyword-label-lookbehind fix (D-04)** (lines 452-458):
```langium
GotoStatement:
    kind=('GOTO' | 'GOSUB') target=LabelRef
;

OnGotoStatement:
    'ON' int=Expression kind=('GOTO' | 'GOSUB') targets+=LabelRef (',' targets+=LabelRef)*
    ;
```
No grammar edit needed here — `LabelRef`/`UserLabelRef` (lines 461-467) already resolve to any `CATEGORIES:[ID]` token; the fix is purely in the lexer (see token-builder below), per D-04's "Claude's Discretion" recommendation (negative lookbehind on the 14 custom NL-sensitive tokens).

**DefFunction — needs FNEND made optional at end-of-input for VALID-03** (lines 288-292):
```langium
DefFunction returns DefFunction:
    'DEF' name=FeatureName '(' (parameters+=FunctionParameter (',' parameters+=FunctionParameter)*)? (
        RPAREN_NO_NL '=' value=Expression
        | RPAREN_NL (body += (DefReturn | Statement))* FNEND
    );
```
Per the Orchestrator Addendum, the defect is an **unclosed** multi-line `DEF FN` body (no `FNEND` before EOF) — widen the second alternative so `FNEND` is optional (`FNEND?`) or add a sibling alternative without it. Confirm via the probe technique before finalizing the exact rule shape (RESEARCH.md Pattern 1).

**TABLE — opaque rest-of-line, no existing analog rule in this grammar (VALID-01, D-03).** No `TableStatement` exists at all today. Nearest structural precedent for "capture everything to end of line as one token" is the custom-token mechanism used by `EXIT_NO_NL`/`PRINT_STANDALONE_NL` (see token-builder below) — the grammar rule itself will be new (e.g. `TableStatement: LabelDecl? 'TABLE' data=TABLE_DATA;` with `TABLE_DATA` a new lexer terminal), added to the `SingleStatement` alternation near `SwitchStatement`/`SetDayStatement` alphabetically.

**Statement alternation registration point** (lines 26-100+): every new statement rule (`TableStatement`, `LoadStatement`) must be added to this `SingleStatement:` alternation list, in the same one-rule-per-line style already used throughout (e.g. `RestoreStatement |` at line 89, `SaveStatement |` at line 91).

---

### `bbj-vscode/src/language/bbj-token-builder.ts` (lexer, transform)

**Analog:** itself.

**Generic CATEGORIES:[ID] loop** (around lines 27-33) — why every keyword doubles as an identifier and why new keywords (TABLE, LOAD) will too unless excluded:
```typescript
static EXCLUDED = new Set(['METHODEND', 'CLASSEND', 'INTERFACEEND'])
...
&& !('LINE_BREAKS' in keywordToken)
&& !BBjTokenBuilder.EXCLUDED.has(keywordToken.name)) {
    ...
    keywordToken.CATEGORIES = [id];
```
The TABLE opaque data token must have a `LINE_BREAKS` property (like the other 14 custom tokens) so this loop skips it and it does NOT get `CATEGORIES:[ID]` — per the explicit Anti-Pattern warning ("Giving the new opaque TABLE data token CATEGORIES:[ID]").

**EXIT_NO_NL — narrow regex to widen for `EXIT expr` (identifier form)** (lines 117-127, referenced in RESEARCH.md Anti-Patterns):
```typescript
} else if (terminal.name === 'EXIT_NO_NL') {
    // Restricting to [0-9(+\-] ensures EXIT_NO_NL does not fire before keywords (like
    ...
        LINE_BREAKS: false
```
Read the full comment block before touching — the fix must add an excluded-keyword list or lookahead, not a blanket `[a-zA-Z]` admission (Anti-Pattern 1 in RESEARCH.md).

**NEXT_BREAK lookbehind — the precedent pattern to copy for D-04's keyword-label-target fix** (around line 149-178):
```typescript
} else if (terminal.name === 'NEXT_BREAK') {
```
`NEXT_BREAK`'s pattern already uses `(?<=\r?\n?[^\*][ \t]*)` to distinguish a bare `next` from `*next`. Recommended shape (Claude's Discretion, per RESEARCH.md Pattern 3 and Assumption A1): add a similar negative lookbehind excluding `GOTO`/`GOSUB` immediately before, to each of the 14 custom NL-sensitive tokens whose trigger condition can be reached right after a keyword-named branch target (`PRINT_STANDALONE_NL`, `KEYWORD_STANDALONE`, etc.).

**reorderTokenPriorities — where a new opaque TABLE token would need splicing to the front** (lines 61-75+):
```typescript
private reorderTokenPriorities(tokens: TokenType[]): void {
    ...
    this.spliceToken(tokens, 'NEXT_BREAK');
    ...
    this.spliceToken(tokens, 'KEYWORD_STANDALONE');
    this.spliceToken(tokens, 'PRINT_STANDALONE_NL');
    ...
    this.spliceToken(tokens, 'EXIT_NO_NL');
```
Follow this exact `spliceToken(tokens, '<NAME>')` call pattern for any new custom TABLE-data token that needs priority over the generic `ID`/keyword matching.

**KEYWORD_STANDALONE literal alternation** (line 201):
```typescript
const KEYWORD_STANDALONE = 'DELETE|SAVE|ENTER|READ|INPUT|EXTRACT|FIND'
```
Reference for which keyword names are already NL-sensitive and therefore already excluded from `CATEGORIES:[ID]` — relevant to reasoning about which existing keyword-label-target combinations are already broken today (e.g. `GOSUB SAVE`).

---

### `bbj-vscode/src/language/validations/line-break-validation.ts` (validator, event-driven)

**Analog:** itself.

**Entry point / bail-out guard** (line 58):
```typescript
if (document.parseResult.parserErrors.length > 0) {
```
Confirms the validator only ever sees "parses but possibly wrong AST" input — reinforces why grammar fixes (D-01) are needed for TABLE/RESTORE/EXIT/LOAD/keyword-labels rather than validator-side tolerance.

**lineBreakMap registration shape** (lines 24-49) — pattern for how each construct's check is wired:
```typescript
const lineBreakMap: LineBreakConfig<any>[] = [
    [isMethodDecl, {
        ...
    ...
    ifStatementLineBreaks(),
    ...
    ifEndStatementLineBreaks(),
    [isStandaloneStatement, {
        ...
```
No new entries expected for TABLE/RESTORE/LOAD/EXIT (their fix is grammar-side, they'll fall under the generic `isStandaloneStatement` entry once the AST is correct) — only `ifStatementLineBreaks()`/`ifEndStatementLineBreaks()` (D-02, VALID-04) get internal logic changes.

**ifStatementLineBreaks / ifEndStatementLineBreaks — the two functions to fix for single-line IF/FI (D-02, VALID-04)** (lines 140-193, 193-...):
```typescript
function ifStatementLineBreaks(): LineBreakConfig<IfStatement> {
    ...
                const siblings = getSiblings(compoundContainer);
    ...
            let prev = previousStatement(node);
    ...
                prev = previousStatement(prev);
    ...
        let prev = previousStatement(node);
    ...
            prev = previousStatement(prev);
```
Per RESEARCH.md, these only walk back through *one* same-line special case (leading label, or one chained `FI`) before defaulting to "needs surrounding line breaks" — the fix is to extend that walk-back loop to cover the additional shapes named in CONTEXT.md's "Specific Ideas" (a label in front of `IF...THEN LET...; GOTO label`, nested `IF...THEN IF...THEN...FI`).

**previousStatement / getSiblings — shared walker helpers already used by both IF functions** (lines 235-253):
```typescript
function previousStatement(statement: Statement): Statement | undefined {
    ...
        return previousStatement(container);
    ...
            const prevSibling = getSiblings(container)[statement.$containerIndex - 1];
```
Reuse these as-is; do not duplicate sibling-walking logic inline in the IF fix.

**isStandaloneStatement — the generic fallback all fixed-grammar constructs (TABLE/RESTORE/LOAD/EXIT) will land under once their AST is correct** (line 119):
```typescript
function isStandaloneStatement(node: AstNode): node is Statement {
```

---

### `bbj-vscode/src/language/validations/check-variable-scoping.ts` (validator, transform)

**Analog:** itself, function at line 308; reuse `check-classes.ts`'s subtype helpers rather than duplicating (Don't-Hand-Roll table in RESEARCH.md).

**Registration — current signature lacks `services`, needs widening for D-06's resolved-type/subtype test**:
```typescript
export function registerVariableScopingChecks(registry: ValidationRegistry): void {
```
Compare to `check-classes.ts`'s `registerClassChecks(registry, services)` (below) — widen this signature to `registerVariableScopingChecks(registry: ValidationRegistry, services: BBjServices): void` and thread `services` down to `checkConflictingDeclares`, OR export `isAssignable`/`bbjSupertypesReach` as standalone functions callable without a `ClassValidator` instance (RESEARCH.md flags this explicitly as a signature-change risk to call out in the plan).

**checkConflictingDeclares — the function to narrow by scope + resolved-type relation (D-06)** (lines 308-344):
```typescript
function checkConflictingDeclares(
    node: Program | MethodDecl,
    accept: ValidationAcceptor
): void {
    const declares = new Map<string, VariableDecl[]>();
    const statements = getStatements(node);

    walkStatements(statements, (stmt) => {
        if (isVariableDecl(stmt)) {
            const key = stmt.name?.toLowerCase();
            ...
        }
    });

    for (const [, decls] of declares) {
        if (decls.length > 1) {
            const firstType = getFQNFullname(decls[0].type);
            const firstLine = decls[0].$cstNode?.range.start.line;
            for (let i = 1; i < decls.length; i++) {
                const thisType = getFQNFullname(decls[i].type);
                if (thisType.toLowerCase() !== firstType.toLowerCase()) {
                    const lineInfo = firstLine !== undefined ? ` (declared at line ${firstLine + 1})` : '';
                    accept('error', `Conflicting DECLARE for '${decls[i].name}': type '${thisType}' conflicts with '${firstType}'${lineInfo}`, {
                        node: decls[i],
                    });
                }
            }
        }
    }
}
```
`getFQNFullname()` returns raw `$refText`, defined even when unresolved — per RESEARCH.md's Don't-Hand-Roll table, this alone cannot detect "unresolvable" (needed for D-06's silent case). Must add a resolved-type check via `getClass()` (from `bbj-nodedescription-provider.ts`, already imported at line 25) plus a subtype/relatedness test reusing `isAssignable`/`bbjSupertypesReach` from `check-classes.ts`. Branch the `accept('error', ...)` call on `node`'s type (`isProgram(node)` → `'warning'`, method body → keep `'error'` only when types are both resolved AND unrelated).

---

### `bbj-vscode/src/language/validations/check-classes.ts` (validator, transform)

**Analog:** itself, `checkMethodReturn` at lines 204-256, subtype helpers below it.

**checkMethodReturn — the two accept('error', ...) calls to flip to 'warning' (D-07)**:
```typescript
public checkMethodReturn(meth: MethodDecl, accept: ValidationAcceptor): void {
    if (!meth.endTag) {
        return;
    }
    ...
    if (meth.voidReturn) {
        for (const ret of valueReturns) {
            accept('error', `Method '${meth.name}' is declared void and must not return a value.`, {
                node: ret,
                property: 'return'
            });
        }
        return;
    }
    ...
    if (valueReturns.length === 0) {
        accept('error', `Method '${meth.name}' declares a return type but has no METHODRET returning a value.`, {
            node: meth,
            property: 'name'
        });
        return;
    }
```
Both `accept('error', ...)` calls here become `accept('warning', ...)` per D-07/D-08 — the literal-type-mismatch and `checkReturnTypeAssignable` errors further down (lines 244, 317) are untouched (not in scope for this phase).

**isAssignable / bbjSupertypesReach — the three-valued subtype/resolution logic D-06 should reuse, not reimplement** (lines 327-360+):
```typescript
private isAssignable(declared: Class, returned: Class): boolean | undefined {
    ...
            return this.bbjSupertypesReach(returned, declared) ? true : undefined;
    ...
private bbjSupertypesReach(klass: BbjClass, target: Class): boolean {
```
These are currently `private` instance methods of `ClassValidator`, gated behind `services.types.Inferer`/`services.java.JavaInteropService` — per RESEARCH.md's Don't-Hand-Roll table, D-06's implementation must either widen `registerVariableScopingChecks`'s signature to receive `services` and reuse a `ClassValidator` instance, or promote these two methods to standalone exported functions. Flag this as a cross-cutting signature-change decision, not a routine body edit.

**registerClassChecks — the `services`-receiving registration to mirror** (line 10, referenced from `bbj-validator.ts`):
```typescript
export function registerClassChecks(registry: ValidationRegistry, services: BBjServices) {
```

---

### `bbj-vscode/src/language/bbj-validator.ts` (DI wiring, request-response)

**Analog:** itself.

**Both registration calls, showing the signature asymmetry to resolve**:
```typescript
registerClassChecks(registry, services);
registerVariableScopingChecks(registry);
```
If D-06's fix needs `services` in `checkConflictingDeclares`, this second call's signature must widen to `registerVariableScopingChecks(registry, services)`, matching the first call's shape exactly.

---

### `bbj-vscode/test/conformance-regressions.test.ts` (NEW test, batch)

**Analog:** `bbj-vscode/test/example-files.test.ts` (full file, 29 lines, read in full above).

**Full existing pattern to mirror, extended per D-10/D-11's stricter assertion**:
```typescript
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import path from 'path';
import fs from 'fs';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';

const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Model>(services.BBj);

describe('Example files Tests', () => {
    const testDataFolder = path.join(__dirname, './test-data');

    test('Parse all files in "test-data" folder', async () => {
        const files = fs.readdirSync(testDataFolder).filter(file => file.endsWith('.bbj'));
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            const result = await parse(fs.readFileSync(path.join(testDataFolder, file), 'utf-8'));
            expect(result.parseResult.lexerErrors, `${file}: lexer errors`).empty;
            expect(result.parseResult.parserErrors, `${file}: parser errors`).empty;
        }
    });
});
```
**Pitfall (from RESEARCH.md Pitfall 3):** `fs.readdirSync` here is non-recursive — a new sibling test file reading `test-data/conformance/*.bbj` directly (not nesting inside this existing loop) is the recommended shape (per CONTEXT.md's "Claude's Discretion").

**New test needs `validationHelper`, not just `parseHelper`, plus the CONF-01 diagnostic filter** (RESEARCH.md's own worked example, reproduced here as the concrete pattern to copy):
```typescript
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
Use `validationHelper<Model>(services.BBj)` (mirrors `parse` above) to get `result.diagnostics`.

---

### `bbj-vscode/test/test-data/conformance/*.bbj` (NEW fixtures, batch/file-I/O)

**Analog:** existing flat files under `bbj-vscode/test/test-data/*.bbj` (structure only — do not read/copy corpus-derived content; D-13 requires hand-written minimal shapes).

**Convention (D-12/D-13):** one file per construct group, named for the construct (`table-statement.bbj`, `restore-numeric.bbj`, `keyword-branch-targets.bbj`, `exit-load-save.bbj`, `def-fn-multiline-header.bbj`, `single-line-if-forms.bbj`, `declare-methodret.bbj`), each with a leading `REM` comment stating in behaviour terms what it protects, no requirement/plan/decision IDs anywhere in the file.

---

### `bbj-vscode/test/line-break-validation.test.ts`, `variable-scoping.test.ts`, `classes.test.ts` (modified tests, request-response)

**Analog:** each is its own analog — existing assertions in the same file are the template for new ones.

**Severity-assertion pattern to extend for D-06/D-07 (RESEARCH.md's worked example)**:
```typescript
import { expectError, expectIssue } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
// existing pattern for an Error assertion:
expectError(result, /Conflicting DECLARE/i, { node: someVariableDecl });
// D-06/D-07 need the equivalent Warning-severity form — check langium/test's expectIssue
// signature (expectError is a thin wrapper over it) for the severity parameter shape.
```

**Exact locations to change (from RESEARCH.md's Wave 0 Gaps, verified against source read in this session for `check-classes.ts`/`check-variable-scoping.ts`):**
- `variable-scoping.test.ts` ~lines 353-361 — "Conflicting DECLARE at program scope produces error" → assert Warning; the method-scope case at ~lines 281-293 stays Error (the one deliberate D-09 exception).
- `classes.test.ts` ~lines 479-493 — "Flags non-void method missing METHODRET" (`returnErrors.every(d => d.severity === 1)`) → severity 2 (Warning).
- `classes.test.ts` ~lines 603-613 — "Flags value returned from a void method" — currently checks only diagnostic count; add a severity assertion (Warning) alongside it.

## Shared Patterns

### Grammar-fix-vs-mask-fix decision rule (D-01/D-02)
**Source:** CONTEXT.md D-01/D-02, RESEARCH.md "Summary" three-category breakdown.
**Apply to:** every construct in this phase. Grammar/lexer fix (`bbj.langium` + `bbj-token-builder.ts` + `npm run langium:generate`) when the AST itself is wrong (TABLE, RESTORE, LOAD, EXIT, keyword-label targets, DEF FN unclosed body). Validator-only fix (`line-break-validation.ts` mask logic) only when the AST is already correct and a mask function under-covers a shape (IF/FI cases). Never patch `line-break-validation.ts` to special-case a keyword's raw text — this is flagged as an explicit Anti-Pattern.

### Probe-before-fix technique
**Source:** RESEARCH.md Pattern 1 — this session's own throwaway vitest probe technique.
**Apply to:** every construct, especially the three unreproduced-in-research groups (DEF FN unclosed body, LEN= variable name, trailing-comma PRINT — now resolved per Orchestrator Addendum, but still needing confirmation probes before the fix is written). Write a scratch vitest file using `parseHelper`/`validationHelper`, print `Program.statements` `$type`s and diagnostics, delete before finishing the plan/wave (register-check scans for stray files).

### CONF-01 diagnostic filter (linking-error exclusion)
**Source:** `bbj-document-validator.ts` (`DocumentValidator.LinkingError` tagging, `applyDiagnosticHierarchy`), reproduced as a worked pattern in RESEARCH.md.
**Apply to:** the new `conformance-regressions.test.ts` file only — filter both `severity === DiagnosticSeverity.Error` AND `d.data?.code !== DocumentValidator.LinkingError`, per Pitfall 2 (some linking errors stay Error severity even after downgrade — instance-member and cyclic-reference cases).

### Whole-suite test invocation
**Source:** CLAUDE.md, RESEARCH.md Validation Architecture section.
**Apply to:** every plan in this phase. `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` per-task; `cd bbj-vscode && RUN_BBJ_TESTS=0 npm test` per-wave, judged on `numFailedTests: 0` (whole-suite gate substitution, standing decision — pre-existing local `linking.test.ts`/issue447 failures are environment noise, not regressions).

## No Analog Found

None — every file in scope is either an edit to an existing file (self-analog) or a new test artifact with a direct structural analog (`example-files.test.ts` for the new conformance test; the flat `test-data/*.bbj` convention for the new fixtures).

## Metadata

**Analog search scope:** `bbj-vscode/src/language/` (grammar, lexer, token-builder, validations/, bbj-validator.ts, bbj-document-validator.ts), `bbj-vscode/test/` (example-files.test.ts, line-break-validation.test.ts, variable-scoping.test.ts, classes.test.ts)
**Files scanned:** 11 source/test files read directly this session (plus grep sweeps over `bbj.langium`, `check-classes.ts`, `check-variable-scoping.ts`, `bbj-token-builder.ts`, `line-break-validation.ts`, `bbj-validator.ts`)
**Pattern extraction date:** 2026-09-20
