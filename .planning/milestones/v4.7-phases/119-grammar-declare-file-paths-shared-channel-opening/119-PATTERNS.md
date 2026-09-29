# Phase 119: Grammar — DECLARE File Paths & Shared Channel Opening - Pattern Map

**Mapped:** 2026-09-28
**Files analyzed:** 4 (2 modified, 2 new)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj.langium` (terminal edit, FIX-01) | grammar/config | transform (lexer regex) | itself — existing `BBjFilePath` terminal at line ~1038 | exact (in-place edit, same file) |
| `bbj-vscode/src/language/bbj.langium` (fragment extraction, REF-13) | grammar/config | transform (parser rule) | itself — existing `WithChannelAndOptionsAndOutputItems`/`WithChannelAndOptionsAndInputItems` fragments (~574/675) | exact (in-place edit, same file) |
| `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` (new, D-06) | test (fixture/regression) | file-I/O (parsed by `example-files.test.ts`) | `bbj-vscode/test/test-data/issue667-input-verify-expression.bbj`-style fixtures (naming convention only; content is phase-specific) | role-match |
| targeted vitest assertions (D-07/D-08), new `test()` blocks | test (unit) | request-response (parse → assert AST shape) | `bbj-vscode/test/imports.test.ts` | exact |

Both grammar edits land in the **same file** (`bbj.langium`) at two independent, non-overlapping
locations, so there is one analog target, not two external ones: the surrounding grammar itself
is the pattern to preserve (comment style, fragment naming, terminal ordering).

## Pattern Assignments

### `bbj-vscode/src/language/bbj.langium` — FIX-01 terminal edit

**Analog:** the terminal's own current definition, in place.

**Current terminal** (verified location — search `terminal BBjFilePath`):
```langium
terminal BBjFilePath: /::.*::/;
```
It sits among a block of custom single-purpose terminals (`ASTERISK_STANDALONE`,
`ASTERISK_EXPRESSION`, then `BBjFilePath`, then `ID_WITH_SUFFIX`/`ID`) — no blank-line or comment
convention to break there; keep it a one-line terminal like its neighbors.

**Target replacement (D-04):**
```langium
terminal BBjFilePath: /::.*?::/;
```

**Comment convention to follow:** other terminals in this file that need explanation carry an
inline `//` comment on the same line (see `terminal COMMENT: /.../ // (rEm)(not an identifier...`).
If the plan wants to record *why* it's non-greedy, follow that same inline-comment style rather
than a block comment above the terminal, e.g.:
```langium
terminal BBjFilePath: /::.*?::/; // non-greedy: stops at nearest '::' so two ::path:: refs on one line don't merge (#527)
```

**Downstream consumer, unaffected (read-only reference for the plan, not to be edited):**
`QualifiedBBjClassName returns string: BBjFilePath ID;` (feeds `BBjTypeRef`/`QualifiedClass`),
and `Use: 'use' (bbjFilePath=BBjFilePath bbjClass=[BbjClass:ValidName]) | ...`.

---

### `bbj-vscode/src/language/bbj.langium` — REF-13 fragment extraction

**Analog:** the two existing fragments, verbatim, to be refactored in place.

**Current state (both fragments, full text as found):**
```langium
//actual intent: ('('channelno?options?')')? (items(',' items)*)? ','?
fragment WithChannelAndOptionsAndOutputItems:
    '(' channelno=Expression? Options? (
        RPAREN_NL
        | RPAREN_NO_NL items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
        | RPAREN_NO_NL ENDLINE_PRINT_COMMA
    )
    | items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
    | ENDLINE_PRINT_COMMA
;
```
```langium
//actual intent: ('('channelno?options?')')? (items(','items)*)?
fragment WithChannelAndOptionsAndInputItems:
    '(' channelno=Expression? Options? (RPAREN_NL | RPAREN_NO_NL items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?)
    | items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?
;
```
Note both fragments currently keep their `//actual intent: ...` comment directly above the
`fragment` keyword — that is the file's established doc-comment convention for these two rules
and should be preserved/adapted, not dropped.

**Target shape (D-01/D-02/D-03, verified by research this session to regenerate cleanly):**
```langium
fragment ChannelAndOptions:
    '(' channelno=Expression? Options?
;

//actual intent: ('('channelno?options?')')? (items(',' items)*)? ','?
// PRINT/WRITE take a trailing comma that suppresses the line end (RPAREN_NO_NL ENDLINE_PRINT_COMMA
// and the bare ENDLINE_PRINT_COMMA); READ/INPUT/EXTRACT/FIND have no such form, so those two
// alternatives stay Output-only (#602).
fragment WithChannelAndOptionsAndOutputItems:
    ChannelAndOptions (
        RPAREN_NL
        | RPAREN_NO_NL items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
        | RPAREN_NO_NL ENDLINE_PRINT_COMMA
    )
    | items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
    | ENDLINE_PRINT_COMMA
;

//actual intent: ('('channelno?options?')')? (items(','items)*)?
fragment WithChannelAndOptionsAndInputItems:
    ChannelAndOptions (RPAREN_NL | RPAREN_NO_NL items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?)
    | items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?
;
```
The neighboring `fragment Options: (',' options+=Option)+;` immediately follows
`WithChannelAndOptionsAndOutputItems` today and uses a `/** ... */` JSDoc-style block comment —
that is the convention for fragments whose purpose isn't obvious from a one-liner; `ChannelAndOptions`
is simple enough that the shorter `//actual intent` style (already used by its two callers) is the
better fit, at Claude's discretion per CONTEXT.md.

**Do NOT do (D-02, explicit anti-pattern):** do not parameterize with a guard
(`fragment ChannelAndOptions<Output>: ...`) and do not fold the RPAREN/items tail into the shared
fragment — the `items` property is typed `OutputItem[]` vs `InputItem[]` on the two callers and
sharing that alternative risks widening it to a union on both.

---

### `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` (new, D-06)

**Analog:** naming convention only — existing files in the same directory use
`issueNNN-description.bbj` (e.g. `issue667-input-verify-expression.bbj`). No structural analog
needed; content is dictated entirely by D-06's four required shapes (two-declare line, two-use
line, single-colon Windows path, and a CLASS with different EXTENDS/IMPLEMENTS file paths).
Consumption pattern — read via `bbj-vscode/test/example-files.test.ts:20-28`:
```typescript
test('Parse all files in "test-data" folder', async () => {
    const files = fs.readdirSync(testDataFolder).filter(file => file.endsWith('.bbj'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
        const result = await parse(fs.readFileSync(path.join(testDataFolder, file), 'utf-8'));
        expect(result.parseResult.lexerErrors, `${file}: lexer errors`).empty;
        expect(result.parseResult.parserErrors, `${file}: parser errors`).empty;
    }
});
```
No edit needed to this test file — dropping the new `.bbj` file into `test/test-data/` is
automatically picked up (per project convention documented in CLAUDE.md and this loop).

---

### Targeted vitest assertions (D-07/D-08) — new `test()` blocks

**Analog:** `bbj-vscode/test/imports.test.ts` (full file read; copy this shape exactly).

**Imports pattern** (lines 1-9):
```typescript
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { EmptyFileSystem, LangiumDocument, URI } from 'langium';
import { Diagnostic } from 'vscode-languageserver';

import { isBbjDocument } from '../src/language/bbj-scope-local.js';
import { shouldRunBBjTests } from './test-helper.js';
```

**Shared assertion helpers** (lines 11-18, already defined at module scope — reuse if folding into
this file, or copy the two functions if creating a new file):
```typescript
function expectNoParserLexerErrors(document: LangiumDocument) {
    expect(document.parseResult.lexerErrors.join('\n')).toBe('')
    expect(document.parseResult.parserErrors.join('\n')).toBe('')
}

function expectNoValidationErrors(document: LangiumDocument) {
    expect(document.diagnostics?.map(d => Diagnostic.getMessageString(d)).join('\n')).toBe('')
}
```

**Multi-document fixture setup pattern** (lines 20-47) — pre-parse the lib file(s) in `beforeAll`
BEFORE the test that references them; `parseHelper` indexes into `IndexManager` regardless of the
`validation` option, so a later document's cross-file reference resolves without mocks:
```typescript
describe('Import tests', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let parse: ReturnType<typeof parseHelper>;

    beforeAll(async () => {
        parse = parseHelper(services.BBj);
        const document = await parse(`
            class protected BBjNumber
            classend
            class public ImportMe
                field public static BBjNumber field
                ...
            classend
        `, {
            documentUri: URI.file("importMe.bbj").toString(),
            validation: true,
        });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });
    ...
```
For D-08, this becomes two pre-parsed fixture documents (`lib1.bbj` defining `ClassA`,
`lib2.bbj` defining `ClassB`), matching #527's literal wording — see RESEARCH.md's Open
Question 1 (either two distinct lib files or folding into the existing `importMe.bbj` fixture is
acceptable; two distinct files most directly mirrors the issue text).

**Core assertion pattern for a `use`-style test** (lines 49-59, one representative test):
```typescript
test('Import full-qualified, use afterwards', async () => {
    const document = await parse(`
        use ::importMe.bbj::ImportMe
        let imp = new ImportMe()
    `, { validation: true });
    expectNoParserLexerErrors(document);
    expectNoValidationErrors(document);
});
```
For D-07 the equivalent test parses the exact `declare ::lib1::ClassA a; declare ::lib2::ClassB b`
line, then asserts on AST shape (not just "no errors") per the Pitfall 3 warning in RESEARCH.md:
walk `document.parseResult.value` to the statement(s) (a `CompoundStatement` wrapping two
`VariableDecl`s, per the `;`-join behavior already in `Statement` — this is pre-existing and
unrelated to the fix, see `bbj.langium` `Statement` rule), and assert each `VariableDecl`'s
`type`/`klass` reference text is `::lib1::ClassA` and `::lib2::ClassB` respectively.

**Existing precedent for asserting on `bbjFilePath` text directly** (lines 186-204,
`cachedUseStatements` test) — shows the project's established way to inspect a parsed file-path
value:
```typescript
expect(document.cachedUseStatements![0].bbjFilePath).toBe('::importMe.bbj::');
```

---

## Shared Patterns

### Parse-without-DocumentBuilder.build
**Source:** every test in `bbj-vscode/test/imports.test.ts` and `bbj-vscode/test/example-files.test.ts`
**Apply to:** the new D-06 fixture (via `example-files.test.ts`, already wired) and the D-07/D-08
targeted test (write new code using `parseHelper`)
```typescript
const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper(services.BBj); // NOT DocumentBuilder.build — that triggers CPL/interop on :5008
```

### Assert AST shape, not just absence of errors
**Source:** RESEARCH.md Pitfall 3, `bbj-vscode/test/imports.test.ts` (`cachedUseStatements` checks)
**Apply to:** D-07 targeted test — the pre-fix grammar produces zero lexer/parser errors on the
buggy input, so `expectNoParserLexerErrors` alone is not a sufficient regression guard; assert
statement count and per-statement file-path text.

### Regenerate via Node 22 wrapper, never plain `npm run langium:generate`
**Source:** RESEARCH.md Pitfall 1 (verified this session)
**Apply to:** both grammar edits, one shared regeneration step
```bash
cd bbj-vscode && npx --yes node@22 node_modules/langium-cli/bin/langium.js generate
```

### Verify `generated/ast.ts` unchanged via manual diff, never `git diff`
**Source:** RESEARCH.md Pitfall 2 — `bbj-vscode/.gitignore:2` excludes `/src/language/generated/`
**Apply to:** REF-13's "AST types stay exactly as they are" claim (D-01)
```bash
cp bbj-vscode/src/language/generated/ast.ts /tmp/ast-before.ts   # before the fragment edit
# ...make the edit, regenerate...
diff /tmp/ast-before.ts bbj-vscode/src/language/generated/ast.ts   # expect: only the BBjFilePath regex line differs
```

## No Analog Found

None — every file in scope has a same-repo, same-role analog (the grammar file is its own
analog for an in-place edit; `imports.test.ts` and `example-files.test.ts` cover both new test
artifacts).

## Metadata

**Analog search scope:** `bbj-vscode/src/language/bbj.langium`, `bbj-vscode/test/imports.test.ts`,
`bbj-vscode/test/example-files.test.ts`, `bbj-vscode/test/test-data/`
**Files scanned:** 4 (all read in full or targeted ranges this session)
**Pattern extraction date:** 2026-09-28
