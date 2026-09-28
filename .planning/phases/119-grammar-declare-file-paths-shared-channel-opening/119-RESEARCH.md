# Phase 119: Grammar — DECLARE File Paths & Shared Channel Opening - Research

**Researched:** 2026-09-28
**Domain:** Langium grammar (terminal regex + fragment extraction) for the BBj language server
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Shared channel opening (REF-13, #602)**
- **D-01:** Extract **only the opening** into a new fragment, e.g.
  `fragment ChannelAndOptions: '(' channelno=Expression? Options?`, and call it from both
  `WithChannelAndOptionsAndOutputItems` and `WithChannelAndOptionsAndInputItems`. The RPAREN/items
  tails stay in each variant. The generated AST types stay exactly as they are
  (`items: OutputItem[]` on the print side, `InputItem[]` on the read side, same `channelno` and
  `options` properties). The regenerated `generated/ast.ts` shows no type change, and the plan
  checks that.
- **D-02:** Do **not** use one guard-parameterized fragment (`<Output>`/`<!Output>`) for both
  variants, and do not share the bare-items closing alternative. Sharing the item-typed tail
  needs guards and risks widening `items` to `OutputItem | InputItem` on both statement types.
- **D-03:** The Output-only alternatives stay on Output only: `RPAREN_NO_NL ENDLINE_PRINT_COMMA`
  and the bare `ENDLINE_PRINT_COMMA`. A grammar comment next to the fragments explains why: PRINT
  and WRITE take a trailing comma that suppresses the line end, and READ/INPUT/EXTRACT/FIND have no
  such form. This comment is the "documented rationale" half of #602's acceptance criteria. Input
  does not gain these alternatives, because that would change parse outcomes (criterion 3).

**File-path token (FIX-01, #527)**
- **D-04:** Replace the terminal with the non-greedy `/::.*?::/`. It stops at the nearest closing
  `::` and still allows single colons inside the path, such as a Windows drive letter. A path can't
  contain `::`, since `::` ends the token. The negated-class form proposed in #527 is not used.
- **D-05:** **Fix the regex even if the base-commit test already passes.** The roadmap says to
  start with a test on the phase base. If `declare ::lib1::ClassA a; declare ::lib2::ClassB b`
  turns out not to misparse there, keep that test as the regression file, but still make the
  terminal non-greedy, because the greedy `.*` is a latent bug for other one-line shapes. Record
  the base result (pass or fail) in the SUMMARY.
- **D-06:** Regression file under `bbj-vscode/test/test-data/`, which `example-files.test.ts`
  requires to parse with zero lexer/parser errors. It covers:
  - the #527 line: `declare ::lib1::ClassA a; declare ::lib2::ClassB b`
  - two `use` statements on one line: `use ::a.bbj::A; use ::b.bbj::B`
  - single-colon paths that must stay one token, e.g. `declare ::C:\lib\x.bbj::ClassA a`
  - other `QualifiedClass` sites on one line with two different file paths, e.g.
    `declare ::a::A x; x! = new ::b::B()`, and a CLASS whose EXTENDS and IMPLEMENTS use different
    file paths
- **D-07:** A **targeted vitest** also asserts what #527's acceptance criteria ask for. The #527
  line produces two `VariableDecl`s, each `BBjTypeRef` carries its own file-path text
  (`::lib1::ClassA` and `::lib2::ClassB`), and neither has a validation error.
- **D-08:** The targeted test supplies **real lib files**: lib1/lib2 `.bbj` documents that define
  `ClassA`/`ClassB` in the test workspace, so both references resolve and "no validation errors" is
  an honest assertion, with no linking-error filtering. Parsing uses `parseHelper`/the in-memory
  pattern, not `DocumentBuilder.build`, which triggers CPL and interop on :5008 (see memory
  "Test parsing: parseHelper not DocumentBuilder.build"). Follow how existing file-path tests (for
  example `test/file-path-completion.test.ts`, the `bbj-scope.ts` `getBBjClassesFromFile` path
  resolution) set up a multi-document workspace.

**Evidence & closing**
- **D-09:** "No changed parse outcome" (criterion 3) means **per-file error sets**. For every
  `.bbj` file under `examples/` and `bbj-vscode/test/test-data/`, compare the lexer and parser
  error messages and positions on the phase base against the phase head. Any per-file difference
  must be explained. The only expected differences are the files that exercise the #527 shape.
  Run the private conformance corpus the same way, comparing file sets, not totals: snapshot
  `details.json` to `/home/coder/repos/bbj-corpus/conformance/snapshots/` before each full run
  (never under `conformance/work/`, which the run deletes).
- **D-10:** The probe is a throwaway script, either in the scratchpad or as a temporary
  `bbj-vscode/test/` probe that is deleted afterwards. Nothing new is committed for it. The
  file-set comparison and the corpus result go in the plan SUMMARY and the phase VERIFICATION.
- **D-11:** Both issues close through `Closes #527` / `Closes #602` lines in the milestone PR,
  because milestone PR table rows alone don't close issues. The closing note for #602 cites the
  shared opening fragment (D-01) and the documented asymmetry (D-03).

### Claude's Discretion
- The name of the new fragment and where it sits in `bbj.langium`.
- File names for the regression `.bbj` and the targeted test, the exact single-colon path
  examples, and the plan split (FIX-01 and REF-13 can share one `langium:generate` and one probe
  run, as the roadmap grouping intends).
- Whether the probe runs through vitest with `--disable-console-intercept` or through a node/tsx
  script.

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within the phase scope.

Reviewed but not folded in (keyword matches only, unrelated to the grammar):
`2026-09-26-intellij-interop-initoptions-key-mismatch.md`,
`2026-09-26-signature-help-and-snippet-peer-name-escaping.md`,
`2026-09-27-windows-intellij-node-download-progress-check.md`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| FIX-01 | `declare ::lib1::ClassA a; declare ::lib2::ClassB b` on one line parses both declarations, each with its own file-path token and without validation errors (#527) | Reproduced the exact misparse this session (one `VariableDecl` instead of two) and verified the D-04 non-greedy terminal fix resolves it with zero lexer/parser errors, producing two correctly-typed `VariableDecl`s. See Summary, Pattern 1, and the verified before/after AST-shape block under Code Examples. The D-06/D-07/D-08 test plan (regression file + targeted vitest against real lib documents) is fully specified with a copy-ready pattern from `imports.test.ts`. |
| REF-13 | The two grammar fragments with the channel/options/RPAREN opening share one rule, and parsing is unchanged (#602) | Made the exact D-01 extraction this session, regenerated, and diffed `generated/ast.ts` byte-for-byte against the pre-fix baseline — the only diff is the terminal-regex reflection string, no interface/property shape changed. Also ran a 117-file before/after corpus diff (examples/ + test-data/) showing zero behavior change, covering 9 files that actually exercise channel/options syntax. See Pattern 2, Code Examples, and Don't Hand-Roll. |

</phase_requirements>

## Summary

This phase is two small, independent edits to one file, `bbj-vscode/src/language/bbj.langium`,
plus one regeneration and one before/after parse comparison. Both bugs were reproduced and both
fixes were verified working **in this research session** by actually editing the grammar,
regenerating under a real Node 22 (obtained via `npx --yes node@22 ...` — Node 22 is **not**
otherwise present in this dev container), and running throwaway probes — then everything was
reverted so the repo is clean. Concretely:

- **FIX-01 (#527)** is real: `declare ::lib1::ClassA a; declare ::lib2::ClassB b` produces **one**
  `VariableDecl` (not two), with `name="b"`, spanning the whole line, and **zero** lexer/parser
  errors — a silent misparse, `[VERIFIED: this session's probe]`. Two more silent-corruption shapes
  were also reproduced beyond what #527's own text describes: `use ::a.bbj::A; use ::b.bbj::B`
  collapses to one `Use` node whose `bbjFilePath` is `"::a.bbj::A; use ::b.bbj::"`, and
  `class public XXX extends ::a::A implements ::b::B` produces `implements.length === 0`
  because the `IMPLEMENTS` keyword is swallowed **inside** the greedy `extends` file-path text.
  Changing the terminal to `/::.*?::/` (D-04) fixes all three shapes with **zero** lexer/parser
  errors introduced, `[VERIFIED: this session's probe]`.
- **REF-13 (#602)** extraction is mechanical and safe: pulling `'(' channelno=Expression? Options?`
  into a new `fragment ChannelAndOptions` and calling it from both
  `WithChannelAndOptionsAndOutputItems` and `WithChannelAndOptionsAndInputItems` produces a
  regenerated `generated/ast.ts` whose **only** diff against the pre-fix baseline is the terminal
  regex string embedded in the reflection table — no interface/property shape changed anywhere,
  `[VERIFIED: this session's before/after ast.ts diff]`.
- Running both fixes together over all 117 `.bbj` files under `examples/` and
  `bbj-vscode/test/test-data/` produced a **byte-identical** per-file lexer/parser error signature
  set before vs. after — zero behavior change on the existing corpus, `[VERIFIED: this session's
  before/after corpus diff]`.
- **Environment blocker, with a working fallback:** `npm run langium:generate` (i.e. plain
  `npx langium generate`) **crashes** under the container's Node 24.20.0 with
  `TypeError: Invalid URL` inside `langium-cli`'s `jsonschema` config validator — confirming the
  standing team memory. The fallback that works **in this environment, verified this session**:
  `npx --yes node@22 node_modules/langium-cli/bin/langium.js generate` downloads a real Node 22
  binary via the npm `node` wrapper package and runs generation successfully, producing
  byte-identical output to what's already checked in (no diff) when run against the unmodified
  grammar. The plan should use this exact invocation rather than assuming Node 22 is present.
- The `generated/` directory is **gitignored** (`bbj-vscode/.gitignore:2`), so `git diff` against it
  is always empty — D-01's ast.ts-unchanged check must be a **manual before/after file diff**
  (`cp` the file aside, revert grammar, regenerate, diff), not `git diff`. This corrects an
  assumption in the phase CONTEXT.

**Primary recommendation:** make both grammar edits, regenerate via the `node@22` wrapper
invocation above, add the D-06 regression file plus the D-07/D-08 targeted test following the
existing `imports.test.ts` pattern (real pre-parsed lib documents via `parseHelper`, no mocks, no
`DocumentBuilder.build`), then do the before/after corpus comparison exactly as this research did
it (scripted, not by hand) before closing the phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BBj source tokenization (terminal regex) | Language Server (Langium grammar/lexer) | — | `BBjFilePath` is a Chevrotain terminal defined in `bbj.langium`; no client-side (VS Code/IntelliJ) code participates in lexing |
| Statement grammar structure (channel/options opening) | Language Server (Langium grammar) | — | Parser-rule/fragment shape; consumed only by the generated Chevrotain parser embedded in `main.cjs`, shared by both IDE clients unchanged |
| Cross-file class resolution (`::file::Class`) | Language Server (`bbj-scope.ts`, `bbj-index-manager.ts`) | — | Used only to build the D-07/D-08 targeted test's fixture documents; not modified by this phase |

This phase touches exactly one tier (the shared language server's grammar); neither VS Code nor
IntelliJ client code is affected, since both bundle the same compiled `main.cjs`.

## Standard Stack

No new runtime or dev dependencies are introduced by this phase. It is a two-line-family edit to
the existing grammar plus test files, using tooling already in the project:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | 4.3.1 (installed `~4.3.1`) `[VERIFIED: bbj-vscode/package.json:708, and by this session's successful regenerate]` | Grammar/parser framework already in use | Project standard; do not touch (v4.7 standing decision: stay off langium 4.4.x) |
| `langium-cli` | 4.3.0 (installed `~4.3.0`) `[VERIFIED: bbj-vscode/package.json:723]` | `langium generate` codegen | Already the project's generator |
| `vitest` | 4.1.10 `[VERIFIED: bbj-vscode/package.json:728, ran this session]` | Test runner for the regression/targeted tests | Project standard |

### Alternatives Considered

None — this phase explicitly forbids adding new hand-written strict checks or tooling (v4.5
standing decision) and CONTEXT.md's decisions already pin the exact fix shape (D-01, D-04).

**Installation:** none — no `npm install` needed for this phase.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages. No `package.json` change is in scope.

## Architecture Patterns

### System Architecture Diagram

```
 bbj.langium (source grammar)
        │
        │  npx --yes node@22 node_modules/langium-cli/bin/langium.js generate
        │  (plain `npx langium generate` / `npm run langium:generate` CRASHES
        │   under this container's Node 24 -- jsonschema "Invalid URL" in langium-cli)
        ▼
 src/language/generated/{ast.ts, grammar.ts, module.ts}   (gitignored, never hand-edited)
        │
        ▼
 Chevrotain parser + AST types, embedded in bbj-module.ts's DI services
        │
        ├─► used identically by VS Code extension and IntelliJ (LSP4IJ) — same main.cjs
        │
        ▼
 Test entry points that exercise the new grammar:
   - example-files.test.ts          -- zero-error gate over test/test-data/*.bbj (flat, no subdirs)
   - <new> targeted vitest (D-07)   -- asserts 2 VariableDecls, no validation errors
   - <new/reused> before/after probe (D-09) -- per-file lexer/parser error-set diff, examples/ +
     test-data/, run once on phase base and once on phase head
   - private bbj-corpus conformance run.mjs -- broader syntax-only sweep (--mode parser)
```

### Recommended Project Structure

No new directories. Edits land in:
```
bbj-vscode/src/language/bbj.langium   # both grammar edits (terminal + fragment extraction)
bbj-vscode/test/test-data/            # D-06 regression file (flat directory, no subfolder)
bbj-vscode/test/                      # D-07/D-08 targeted test (new file, or folded into an
                                       # existing declare/use-focused test file, planner's choice)
```

### Pattern 1: Non-greedy delimiter-pair terminal

**What:** `terminal BBjFilePath: /::.*?::/;` replaces the greedy `/::.*::/`.
**When to use:** Any Chevrotain terminal meant to capture "everything between a start and end
delimiter" on one line, where the delimiter can repeat later on the same line (a second
occurrence of the same statement shape). Greedy `.*` always walks to the **last** occurrence in
the remaining input, not the nearest one.
**Example (verified this session, before/after regen, zero errors both times):**
```
// bbj-vscode/src/language/bbj.langium
terminal BBjFilePath: /::.*?::/;
```
`[VERIFIED: this session's grammar edit + regen + probe]`

### Pattern 2: Extracting a shared opening-only fragment

**What:** `fragment ChannelAndOptions: '(' channelno=Expression? Options?` factors out only the
common **prefix** of two parser rules whose **tails diverge**. The call sites become
`ChannelAndOptions (<output-tail>)` and `ChannelAndOptions (<input-tail>)`.
**When to use:** Two Langium rules share an opening sequence but must keep independent trailing
alternatives (here: PRINT/WRITE's trailing-comma line-suppression forms, which READ/INPUT/EXTRACT/
FIND do not have). Do **not** try to share the tail via a guarded fragment (`<Output>`/`<!Output>`)
when the two tails assign to differently-typed properties (`items+=OutputItem` vs
`items+=InputItem`) — CONTEXT.md's D-02 explicitly rejects that path because it risks widening
`items` to a union type on both statements.
**Example (verified this session — ast.ts diff below is the complete diff, nothing else changed):**
```
// bbj-vscode/src/language/bbj.langium
fragment ChannelAndOptions:
    '(' channelno=Expression? Options?
;

fragment WithChannelAndOptionsAndOutputItems:
    ChannelAndOptions (
        RPAREN_NL
        | RPAREN_NO_NL items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
        | RPAREN_NO_NL ENDLINE_PRINT_COMMA
    )
    | items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
    | ENDLINE_PRINT_COMMA
;

fragment WithChannelAndOptionsAndInputItems:
    ChannelAndOptions (RPAREN_NL | RPAREN_NO_NL items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?)
    | items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?
;
```
`[VERIFIED: this session's grammar edit + regen + ast.ts diff, shown verbatim below]`

### Anti-Patterns to Avoid

- **Sharing the item-typed tail across output/input:** would need a guard parameter and risks
  `items: OutputItem | InputItem` on both statement kinds (explicitly rejected, D-02).
- **Trusting `git diff` on `generated/`:** the directory is gitignored
  (`bbj-vscode/.gitignore:2:/src/language/generated/`), so `git diff -- .../generated` is **always**
  empty regardless of what changed. Verify by manual snapshot-and-diff instead (see Code Examples).
- **Assuming `npm run langium:generate` works out of the box:** it crashes under this container's
  Node 24; see Common Pitfalls.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-file BBj class resolution for the D-08 fixture | A custom mock filesystem / mocked `IndexManager` | Real `.bbj` documents parsed via `parseHelper(services.BBj)` and left in the document store (the `imports.test.ts` pattern) | Langium's own `DocumentBuilder`/`IndexManager` already index every parsed document; a second parse call against the same services resolves cross-file references for free, with `validation:true` on the referencing document only |
| Per-file lexer/parser error comparison (D-09) | Hand-diffing files one at a time | A small throwaway script driving `parseHelper` over every file and dumping a `{file: {lexerErrors, parserErrors}}` JSON, diffed with plain `diff`/`jq` | Deterministic, scriptable, exactly reproduces what this research session did (117 files, zero diff, in ~6s) |

**Key insight:** everything this phase needs (multi-document class resolution, before/after parse
diffing) already has a working, in-repo precedent — `imports.test.ts` for the former, and this
research's throwaway probe for the latter. No new test infrastructure is needed.

## Common Pitfalls

### Pitfall 1: `langium:generate` silently assumed to "just work"

**What goes wrong:** Running `npm run langium:generate` (or bare `npx langium generate`) under
this container's default Node (`v24.20.0`) crashes before writing any files.
**Why it happens:** `langium-cli`'s config-schema validation (via the `jsonschema` package) calls
`new URL(...)` in a way that Node 24's URL parser rejects; Node 22 doesn't hit this.
**How to avoid:** Use `npx --yes node@22 node_modules/langium-cli/bin/langium.js generate` from
`bbj-vscode/`. This was verified working in this exact container this session (downloads a real
Node 22 binary via the npm `node` wrapper package on first use, then runs and completes in under a
second on a warm cache). CI's `actions/setup-node@v4` step already installs Node 22, so this
pitfall is local-only.
**Warning signs:** the exact crash text is:
```
TypeError: Invalid URL
    at new URL (node:internal/url:840:25)
    at Validator.resolve (node_modules/jsonschema/lib/validator.js:263:16)
  ...
  input: '/undefined#/$defs/languageItem',
  base: 'thismessage::/'
```
`[VERIFIED: this session, ran the exact failing command]`

### Pitfall 2: Checking `generated/ast.ts` via `git diff`

**What goes wrong:** `git diff -- bbj-vscode/src/language/generated` reports nothing, which can be
misread as "confirmed unchanged" when it is actually just gitignored and untracked.
**Why it happens:** `bbj-vscode/.gitignore:2` excludes `/src/language/generated/` entirely — it's
built by `prepare`/`langium:generate`, never committed.
**How to avoid:** Copy `ast.ts` aside before making the grammar edit (or `git stash` just the
`.langium` file), regenerate, diff the two copies with plain `diff`. This is exactly how this
research verified D-01's "no type change" claim (see Code Examples).
**Warning signs:** a plan step that says "run `git diff` on `generated/ast.ts` to confirm no
change" — this will trivially "pass" even if the grammar is badly broken, because there is nothing
to diff against.

### Pitfall 3: Assuming a "no lexer/parser errors" result means "parsed correctly"

**What goes wrong:** All three misparse shapes reproduced in this research (two DECLAREs, two
USEs, EXTENDS+IMPLEMENTS with two paths) produce **zero** lexer errors and **zero** parser errors
on the pre-fix grammar — Chevrotain's greedy terminal match is syntactically valid, just
semantically wrong (wrong statement count, wrong file-path text, a keyword silently swallowed).
**Why it happens:** The greedy regex still produces a token stream the grammar can fully parse;
the corruption is invisible to `lexerErrors`/`parserErrors` and only shows up by inspecting the
resulting AST shape (statement count, `$cstNode.text` spans, `implements.length`).
**How to avoid:** The D-07 targeted test and the D-06 regression file must assert **AST shape**
(two `VariableDecl`s, each with its own file-path text; `implements.length === 1` for the
CEI shape), not just "no errors". `example-files.test.ts`'s zero-error gate alone would have
passed on the buggy grammar and hidden the bug.
**Warning signs:** a test that only checks `lexerErrors`/`parserErrors` are empty for the #527 line
would be green on both the broken and fixed grammar — it proves nothing about the actual fix.

## Code Examples

### Verified: ast.ts diff after the grammar edit (this session, complete diff, nothing elided)

```diff
--- ast.ts (before: base grammar, regenerated fresh)
+++ ast.ts (after: both D-01/D-04 edits applied, regenerated fresh)
@@ -25,7 +25,7 @@
     RESTORE_NO_NL: /_restore_no_nl/,
     ASTERISK_STANDALONE: /_asterisk_standalone/,
     ASTERISK_EXPRESSION: /_asterisk_expression/,
-    BBjFilePath: /::.*::/,
+    BBjFilePath: /::.*?::/,
     ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/,
     ID: /[_a-zA-Z][\w_]*(@)?/,
     NUMBER: /[0-9]+(\.[0-9]*)?|\.[0-9]+/,
```
No `interface`, no property (`items`, `channelno`, `options`, `klass`, `bbjFilePath`) changed.
`[VERIFIED: this session, cp'd ast.ts aside, `git stash` the grammar file, regenerated, diffed]`

### Verified: before/after AST shape for the three reproduced misparse shapes

```
# BEFORE the fix (base grammar, via parseHelper, validation:false):
"declare ::lib1::ClassA a; declare ::lib2::ClassB b"
  -> Program.statements.length === 1
  -> stmt.$type === 'VariableDecl', stmt.name === 'b'   (the FIRST declare is lost entirely)

"use ::a.bbj::A; use ::b.bbj::B"
  -> Program.statements.length === 1
  -> stmt.$type === 'Use', stmt.bbjFilePath === '::a.bbj::A; use ::b.bbj::'

"class public XXX extends ::a::A implements ::b::B\nclassend"
  -> extends.length === 1  (cstText "::a::A implements ::b::B" -- IMPLEMENTS keyword swallowed)
  -> implements.length === 0

# AFTER the fix (both D-01/D-04 edits, via parseHelper, validation:false):
"declare ::lib1::ClassA a; declare ::lib2::ClassB b"
  -> Program.statements.length === 1, stmt.$type === 'CompoundStatement'  (pre-existing `;`-join
     behavior -- Statement rule always wraps ';'-separated statements this way, unrelated to this
     fix; see bbj.langium:23)
  -> stmt.statements[0]: VariableDecl name=a, cstText "declare ::lib1::ClassA a"
  -> stmt.statements[1]: VariableDecl name=b, cstText "declare ::lib2::ClassB b"

"use ::a.bbj::A; use ::b.bbj::B"
  -> stmt.statements[0]: Use bbjFilePath="::a.bbj::", cstText "use ::a.bbj::A"
  -> stmt.statements[1]: Use bbjFilePath="::b.bbj::", cstText "use ::b.bbj::B"

"class public XXX extends ::a::A implements ::b::B\nclassend"
  -> extends.length === 1, extends[0].cstText === "::a::A"
  -> implements.length === 1, implements[0].cstText === "::b::B"
```
All six results have zero lexer errors and zero parser errors in both runs — the bug is a silent
AST-shape corruption, never a reported error. `[VERIFIED: this session's throwaway probe, deleted
after use]`

### Verified: single-colon Windows-style path is unaffected by the non-greedy change

```
"declare ::C:\lib\x.bbj::ClassA a"
  -> BEFORE and AFTER: VariableDecl, zero errors, klass.$refText === "::C:\lib\x.bbj::ClassA"
```
Only one `::...::` pair exists on this line, so greedy vs. non-greedy produce the same match; the
interior single colon (`C:`) is never mistaken for a delimiter, in either version.
`[VERIFIED: this session's probe]`

### Reusable pattern: D-08's multi-document fixture setup (copy this shape)

Source: `bbj-vscode/test/imports.test.ts` (existing, unmodified by this phase) —
`[VERIFIED: bbj-vscode/test/imports.test.ts:20-59, read this session]`
```typescript
import { parseHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { EmptyFileSystem, URI } from 'langium';

describe('...', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let parse: ReturnType<typeof parseHelper>;

    beforeAll(async () => {
        parse = parseHelper(services.BBj);
        // Pre-parse the lib file(s) FIRST -- parseHelper indexes into IndexManager regardless
        // of the `validation` option, so a later document's cross-file reference resolves.
        await parse(`
            class public ClassA
            classend
        `, { documentUri: URI.file("lib1.bbj").toString() });
    });

    test('two declares on one line, each resolving to its own lib class', async () => {
        const document = await parse(`
            declare ::lib1.bbj::ClassA a
        `, { validation: true });
        // assert zero parser errors AND zero validation errors (real resolution, not filtered)
    });
});
```
This is exactly the pattern to copy for D-08: real `.bbj` documents for `lib1`/`lib2`, `parseHelper`
(not `DocumentBuilder.build`, which triggers CPL/interop per team memory), `validation: true` only
on the document under test.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Greedy `BBjFilePath` terminal `/::.*::/` | Non-greedy `/::.*?::/` | This phase (D-04) | Fixes #527 and two additional undocumented silent-corruption shapes found this session (two `use` on one line; `class ... extends ... implements ...` with two paths) |
| Duplicated `'(' channelno=Expression? Options?'` opener in two fragments | Shared `fragment ChannelAndOptions` | This phase (D-01) | No behavior change (verified); removes the duplication #602 flags |

**Deprecated/outdated:** none — no library/API deprecations in scope for this grammar-only phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | — | — | Every claim in this document was either read from the grammar/source this session, or verified by actually running the grammar edit, regeneration, and probes and reverting afterward. No claim rests on training-data recall of BBj syntax or langium-cli behavior without this session's direct confirmation. |

**This table is empty** — all claims in this research were verified this session (grammar reads,
regeneration, and probe runs) or cited from files read this session. No user confirmation needed
before planning.

## Open Questions (RESOLVED)

1. **Exact regression-file name and targeted-test file name/location**
   - What we know: CONTEXT.md leaves this to Claude's discretion (D-06/discretion notes); the
     existing naming convention in `test/test-data/` is `issueNNN-description.bbj` (see
     `issue667-input-verify-expression.bbj`, confirmed this session).
   - What's unclear: whether the targeted D-07/D-08 test should be its own new file (e.g.
     `declare-two-file-paths.test.ts`) or folded into `imports.test.ts`, which already owns this
     exact multi-document-resolution pattern.
   - Recommendation: name the regression file `issue527-declare-file-paths.bbj` (matches
     convention) and fold the D-07/D-08 targeted assertions into `imports.test.ts` as new `test()`
     blocks in the existing `describe('Import tests', ...)` block, reusing its existing
     `beforeAll` pre-parsed `importMe.bbj` fixture pattern rather than inventing new lib1/lib2
     fixture files, unless the planner prefers two distinct lib files to mirror #527's literal
     `lib1`/`lib2` wording — either is fine; D-07's assertions (two `VariableDecl`s, own file-path
     text, no validation errors) don't require distinct file names.

2. **Whether to run the private `bbj-corpus` conformance sweep in `--mode parser` or the fuller
   `--mode validate` (no `--endpoint`)**
   - What we know: `run.mjs --ls <this repo> --mode parser --shards 4` avoids Java interop entirely
     (confirmed by reading `worker.mts`, which only opens a real `:5008` connection when `--endpoint`
     is passed) and should be materially faster than the ~582s `--mode validate --endpoint` run
     recorded in the last `summary.json` (`[CITED: bbj-corpus/conformance/summary.json, read this
     session]` — that run did semantic reconciliation, not applicable here).
   - What's unclear: exact wall-clock time for `--mode parser` was not measured this session (the
     corpus run itself was not executed, per the phase's scope/cost — only the mechanics were
     confirmed by reading `run.mjs`/`worker.mts`).
   - Recommendation: use `--mode parser --shards 4` for this phase's D-09 corpus check; it answers
     exactly the "any new syntax rejects/parse errors introduced" question this phase cares about,
     without the semantic-reconciliation machinery that `--mode validate --endpoint` adds for
     unrelated purposes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js (container default) | everything except `langium:generate` | ✓ | v24.20.0 `[VERIFIED: node --version, this session]` | — |
| Node.js 22.x | `langium generate` (crashes on Node 24) | ✗ as system default | — | `npx --yes node@22 <script>` downloads and runs a real Node 22.23.3 binary; **verified working this session**, network access to registry.npmjs.org confirmed available |
| `nvm`/`volta`/`fnm`/`asdf` | alternate route to Node 22 | ✗ | — | not needed — the `npx node@22` wrapper above is sufficient and already verified |
| Private `bbj-corpus` repo | D-09's broader corpus sweep | ✓ | present at `/home/coder/repos/bbj-corpus/conformance` `[VERIFIED: ls'd this session]` | — |
| Live BBjServices on `:5008` | only if `--endpoint` is used for the corpus run (not recommended, see Open Question 2) | not probed this session | — | use `--mode parser` instead, which needs no live interop connection |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** Node 22 (`langium:generate`) — use the `npx --yes node@22
node_modules/langium-cli/bin/langium.js generate` invocation from `bbj-vscode/`, confirmed to work
and to reproduce byte-identical output against the currently-checked-in-compatible grammar
(no generated-file diff when run against the unmodified grammar).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 `[VERIFIED: bbj-vscode/package.json:728]` |
| Config file | `bbj-vscode/vitest.config.ts` (include `test/**/*.test.ts`, exclude `out/**`, `node_modules/**`) |
| Quick run command | `cd bbj-vscode && npx vitest run test/example-files.test.ts test/imports.test.ts --disable-console-intercept` |
| Full suite command | `cd bbj-vscode && npx vitest run --maxWorkers=2` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| FIX-01 | Two `declare`s with distinct file paths on one line each parse to their own `VariableDecl`, own file-path text, no validation errors | unit | `npx vitest run test/imports.test.ts` (D-07/D-08 assertions added here or a new file) | ❌ Wave 0 — assertions to be added |
| FIX-01 | Regression corpus: `example-files.test.ts` zero-error gate covers the new `test/test-data/issue527-declare-file-paths.bbj` | unit | `npx vitest run test/example-files.test.ts` | ✅ harness exists; ❌ new fixture file, Wave 0 |
| REF-13 | Shared `ChannelAndOptions` fragment: parsing unchanged for PRINT/WRITE/READ/INPUT/EXTRACT/FIND | integration (corpus diff) | throwaway before/after script over `examples/**/*.bbj` + `test/test-data/*.bbj` (pattern verified this session, see Code Examples) | ❌ Wave 0 — one-off script, not committed (per D-10) |
| REF-13 | `generated/ast.ts` type shapes unchanged | manual diff (not git) | `cp` snapshot before/after regen, `diff` (git diff on `generated/` is always empty — gitignored) | ❌ Wave 0 — manual step, documented in SUMMARY per D-10 |

### Sampling Rate

- **Per task commit:** `cd bbj-vscode && npx vitest run test/example-files.test.ts test/imports.test.ts`
- **Per wave merge:** `cd bbj-vscode && npx vitest run --maxWorkers=2` (full suite)
- **Phase gate:** full suite green (module the known pre-existing `installed-extension-e2e`
  failure, see below) before `/gsd-verify-work`, plus the D-09 before/after corpus diff attached to
  the phase SUMMARY/VERIFICATION.

### Wave 0 Gaps

- [ ] `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` — D-06 regression file, covers
      FIX-01 (five shapes: two-declare, two-use, single-colon Windows path, declare+new, class
      extends+implements — all five confirmed reproducible/fixable this session)
- [ ] Targeted assertions for D-07/D-08 — new `test()` blocks (in `imports.test.ts` or a new file,
      see Open Question 1), asserting AST shape (statement count, per-declaration file-path text,
      zero validation errors against real pre-parsed lib documents)
- [ ] Throwaway before/after corpus-diff script (D-09/D-10) — not committed; run once against the
      phase base and once against the phase head, diff, attach the (empty, expected) diff to
      SUMMARY/VERIFICATION
- Framework install: none — vitest and langium-cli are already present

### Whole-suite baseline (measured this session, with both fixes applied and reverted afterward)

`cd bbj-vscode && npx vitest run --maxWorkers=2` (no `RUN_BBJ_TESTS` override):
**1 failed | 3610 passed | 30 skipped (3641 total)**, 241.8s wall time.
`[VERIFIED: this session, full run captured below]`

The one failure is **pre-existing and unrelated to this phase**:
`test/functional/installed-extension-e2e.test.ts > every composer kind carries its cue >
setopts-in-code cue appears only on the absolute literal and the safe chain's SETOPTS line` —
`expected [24] to deeply equal [24, 28]`. This test drives a **separately built, installed VS Code
extension** (`~/.ext-test/extensions/.../out/language/main.cjs`), not the working tree; a SETOPTS
composer-cue behavior change landed in source since that extension was last built/installed, so
the installed bundle now disagrees with the fixture it's compared against. This is the same class
of drift called out in `STATE.md`'s Tech Debt list ("`installed-extension-e2e` still counts as a
failed suite... stale installed bundle, pre-existing") and in the `UAT: build both extensions
first` team memory — rebuilding/reinstalling the extension (as any UAT pass already does) clears
it. It has no relationship to DECLARE/channel grammar and was reproduced with the grammar fix
**applied**; there is no reason to expect it differs on the phase base. The plan should record this
known-unrelated failure rather than trying to fix it, and should not gate the phase on it.

## Security Domain

No `security_enforcement` key is set in `.planning/config.json` (absent = enabled), so this section
is included for completeness, though this phase has essentially no security surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V5 Input Validation | Marginally | The grammar already treats all BBj source text as untrusted input to a parser with `recoveryEnabled: true` (`langium-config.json:20`); this phase only narrows what one terminal matches (making it **less** permissive, from "everything to the last `::`" to "everything to the nearest `::`") and extracts a fragment with no new alternatives — it cannot introduce a new injection surface |

### Known Threat Patterns for this stack

None applicable — no new external input source, no new file-path resolution logic (the existing
`BBjPathPattern`/`getBBjClassesFromFile` resolution in `bbj-scope.ts`, including its PREFIX-root
containment check from issue #526, is untouched by this phase and is exercised only as the D-08
test fixture's resolution path, read-only).

## Sources

### Primary (HIGH confidence — read or run this session)

- `bbj-vscode/src/language/bbj.langium` (lines 330-350, 560-700, 880-1050) — grammar rules and
  terminals in scope, read this session
- `bbj-vscode/src/language/bbj-scope.ts` (lines 240-370) — `BBjPathPattern`,
  `getBBjClassesFromFile`, `resolveClassScopeByName`, read this session
- `bbj-vscode/test/imports.test.ts` — multi-document fixture pattern, read this session
- `bbj-vscode/test/file-path-completion.test.ts` — completion-side file-path handling (unaffected
  by this phase's terminal change; confirmed it text-scans raw lines, not the grammar terminal)
- `bbj-vscode/package.json`, `bbj-vscode/langium-config.json`, `bbj-vscode/.gitignore` — versions,
  generator config, gitignore status of `generated/`
- `/home/coder/repos/bbj-corpus/conformance/run.mjs`, `worker.mts`, `package.json`,
  `summary.json` — private corpus harness usage, read this session
- This session's own throwaway probes (`zz-probe-119.test.ts`, `zz-probe-119-corpus.test.ts`,
  deleted after use) — actual grammar edits, actual regenerations (before and after), actual
  vitest runs, actual whole-suite run

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` Tech Debt / Blockers sections — corroborates the pre-existing
  `installed-extension-e2e` failure pattern and the Node 24 `langium:generate` breakage

### Tertiary (LOW confidence)

None — no unverified web-search claims were needed for this phase; everything was directly
reproducible in the repo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; versions read directly from `package.json`
- Architecture (grammar edits): HIGH — both edits were made, regenerated, and probed in this
  session, then reverted
- Pitfalls: HIGH — the Node-24 crash, the gitignored `generated/` directory, and the
  "no-errors-but-wrong-AST" trap were all directly observed this session, not inferred

**Research date:** 2026-09-28
**Valid until:** 30 days (stable grammar file, no external API dependency; re-verify the Node 22
`npx node@22` fallback still resolves if this phase is replanned much later, since it depends on
npm registry availability of that wrapper package)
