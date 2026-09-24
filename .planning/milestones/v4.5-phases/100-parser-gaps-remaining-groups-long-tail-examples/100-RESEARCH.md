# Phase 100: Parser Gaps — Remaining Groups, Long Tail & Examples - Research

**Researched:** 2026-09-21
**Domain:** Langium 4 grammar/lexer (Chevrotain-generated LL(k) parser) and hand-written validators in a BBj language server — same domain and same files as Phases 98/99.
**Confidence:** HIGH for every root-cause claim below — each was reproduced this session with a throwaway vitest probe (`bbj-vscode/test/zz-probe-100*.test.ts`, five files, written and deleted this session; `git status --porcelain` confirmed clean afterward) and, for every example/compiler-acceptance claim, independently cross-checked against the real `bbjcpl` compiler via one-off scratch files under the session scratchpad. The oracle word-sweep (D-06) was actually run this session against all 172 grammar keywords in both a variable-read and a label/branch-target position, via a small Node script driving `bbjcpl -N`, cross-referenced against an equivalent Langium `parseHelper` sweep — HIGH confidence on the resulting mismatch list. Recommended *fix shapes* (the exact grammar diffs) are reasoned from the grammar source read in full this session plus the already-shipped Phase 98/99 precedents (`'void'` in `FeatureName`, `CAST`'s `arrayDims+='[' ']'`) — HIGH confidence on viability, not independently re-probed post-edit (grammar edits are out of scope for research; the executor's own Wave 0 probe is the verification step, per 98/99 convention).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `ROADMAP.md` and `REQUIREMENTS.md` amended by the context commit so the verifier checks the real shapes (PARSE-04, -05, -06, -08, -09, EXMP-01).
- **D-02:** Root fix — empty array brackets `name[]` may stand wherever an array element can, via **one** change at the array-element rule. Must cover: `PRINT` item, `DREAD` target, assignment target, `CALL`/`XCALL` argument, method-call argument, function-call argument (with a trailing `err=` option), `bbjapi().copy(v!,a[])`. All suffixes, both cases. Reversibility: costly (feeds generated AST types read by linking/type-inference/scoping).
- **D-03:** The empty form produces the **same node as `[all]`** (existing array-element node, `all=true`) — no new node type, no provider change unless the node would otherwise misbehave.
- **D-04:** Type-side bracket shapes are the same group/regression file: `declare int[][] two!` (more than one bracket pair — check `FIELD`, `METHOD` return type, parameter the same way, since they share the single-pair pattern) and a parameter written `BBjArray dat[all]`.
- **D-05:** Accepting empty brackets everywhere may accept an invalid form; B is recorded per-file, not gated (per-file evidence classified as *lost an accidental catch* or *a new rule accepts an invalid form*).
- **D-06:** Oracle sweep instead of a guessed word list — compile every grammar keyword with `bbjcpl` as a variable (`w=1` + read, plus suffixed forms), a label declaration, and a `GOTO`/`GOSUB` target; parse the same text with the language server. Every word the compiler accepts and the parser rejects is fixed; the accepted set becomes the regression file's word list. Known mismatches at the outset: `var` (variable and label), `use` (variable and label), `start` (right-hand side of an assignment).
- **D-07:** Fixes are **per word**, the Phase 99 `label` way — no generic keyword-falls-back-to-identifier mechanism.
- **D-08:** Positions claimed: **variable, label, branch target** only. Class/method/field/parameter names stay out.
- **D-09:** Words the compiler rejects as names but the parser accepts are recorded (count + word list), not flagged.
- **D-10:** Fix the cheap long-tail ones, record the rest. Expected cheap: trailing `,err=`/`,tim=`/`,mode=` option tail on `SETDRIVE`, `PROCESS_EVENTS`, `FULLTEXT`; `input@(r,c),v$`; `ON ERR(...) GOTO a,b,c`; `; rem` after single-line `DEF FN`. A statement beginning `::file::Class.method()` is recorded unless cheap. Rough target A ≤ 10; gate stays A ≤ 25.
- **D-11:** Tracked list is shape-level (own-words description, file count, reason category, fixed-or-stays); file→shape mapping stays in the private corpus repo.
- **D-12:** Reason categories: *not a program* · *compiler quirk* · *deliberately out of scope* · *valid but disproportionate to fix now*.
- **D-13:** List lives in `100-CONFORMANCE.md`.
- **D-14:** Triage runs after array/block-boundary/word-sweep fixes land and A is re-measured.
- **D-15:** Default repair for a failing example whose error isn't its point: smallest edit that makes `bbjcpl` accept it while the construct stays.
- **D-16:** Files whose purpose is the error move to `examples/invalid/` (flat, with a README), issue-numbered names kept.
- **D-17:** Mixed files are split — valid body stays, erroneous lines move to a sibling `examples/invalid/` file.
- **D-18:** Examples added as "supported syntax" the compiler rejects (seen: `MODE=` on `msgbox`/`fileopen`/`filesave`): establish the accepted spelling with `bbjcpl` + docs; repair if a valid spelling exists; move to `examples/invalid/` with a todo if the grammar rule was added on a false premise (not tightened this phase).
- **D-19:** Two-layer assertion — always-on CI (every valid example parses/validates clean; every invalid one has a sidecar with line/message/severity, or an explicit "none today — compiler-only"); BBj-gated (`RUN_BBJ_TESTS`) compiles/fails-to-compile with `bbjcpl`.
- **D-20:** `config.bbx`/`functions.bbl` excluded by extension, stay where they are.
- **D-21:** Moving/splitting a file must not break `textmate-bbx-highlighting.test.ts`, `utils.test.ts`, `functional/installed-extension-e2e.test.ts` — check references before each move.
- **D-22..D-27:** Carried forward from 98/99 (root fix in grammar/lexer, `npm run langium:generate` on Node 22, never edit `generated/`; regression files in `test-data/conformance/`; "still flagged" case per touched rule; new keyword tokens anchored at statement start with an identifier-probe re-run; harness run after each group + once at the end, snapshot before every run, diff file sets; only numbers/word-lists/own-words shapes in tracked files).

### Claude's Discretion
- Grammar mechanics of the empty-bracket form and multi-bracket type-side pairs; their "still flagged" cases (unclosed bracket, `x[,]`).
- Whether `; rem` after block boundaries is grammar, lexer, or both; how line-numbered class code is made to parse.
- How the oracle sweep is scripted and whether the script is kept; the `examples/invalid/` sidecar format; the examples test's name/location.
- Which long-tail shapes count as "cheap"; a fix that turns out to need lexer work flips to "recorded."
- Plan split and order.

### Deferred Ideas (OUT OF SCOPE)
- Flagging names/forms the compiler rejects but the parser accepts (STRICT-01/02, deferred).
- Language words as class/method/field/parameter names.
- `::file::Class.method()` recorded under D-10 unless cheap (**this research found it already parses — see below**).
- Unfusing `'IOL='`.
- A standing residue file outside the phase folder.
- "Loosen single-line IF balance rule" todo — reviewed, not folded.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PARSE-04 | Empty-bracket whole-array form `name[]` parses wherever an array element can stand, meaning `[all]` | Root cause fully reproduced: `ArrayElement`'s `"[" (all?="ALL" \| indices+=Expression...) "]"` alternative (`bbj.langium:833`) requires `ALL` or ≥1 index; empty brackets satisfy neither, producing an identical "expecting an expression, found `]`" error at **every** call site (11 shapes probed, byte-identical error). One-rule fix, see "Empty-bracket array form" below. |
| PARSE-05 | `DREAD` into arrays, `declare int[][] name!`, parameter `BBjArray name[all]` | `DREAD` already routes through the same `ArrayElement`/`Expression` machinery (fixed by PARSE-04's root fix, confirmed by probe). The two type-side shapes are **separate, confirmed-broken** grammar positions: multi-pair brackets on `DECLARE`/`FIELD`/`METHOD` return type (single-pair `(array?='[' ']')?` only) and a bracket **after the parameter name** on `ParameterDecl` (not supported in any position today — confirmed by probe, different failure mode than the multi-pair case). See "Type-side bracket shapes" below. |
| PARSE-06 | `; rem` after `METHOD` header/`METHODEND`/`CLASSEND`/`FNEND`/single-line `DEF FN`, and line-numbered class code | Root cause fully reproduced and is **one unifying mechanism** for the comment cases: these four end-markers are literal tokens embedded directly in their *own* container rule (`MethodDecl`, `ClassDecl`, `InterfaceDecl`, `DefFunction`), bypassing `Statement`'s generic `(';' statements+=SingleStatement)+` chaining that lets `; rem` work after every *ordinary* statement already. Line-numbered class code is a **second, independent** root cause: `ClassDecl`'s own member loop (`(members+=ClassMember \| Comments)*`) has no tolerance for a bare leading `NUMBER` the way `Program`'s and `MethodDecl`'s permissive `Statement`-based loops already do. See "Block-boundary comments" and "Line-numbered class code" below. |
| PARSE-08 | Compiler-accepted-but-parser-rejected words usable as variable/label/branch-target | Oracle sweep run this session against all 172 grammar keywords: 9 words mismatch as a variable, 10 as a label/branch-target (`auto`, `classend`, `declare`, `interfaceend`, `library`, `methodend`, `use`, `var`, plus `void` label-only). A 10th word, `start`, is a **sweep-methodology blind spot** — the basic `w=1`/`print w` sweep format missed it; a deeper probe (`b - start`) reproduces D-06's own named example. See "Oracle sweep results" below. |
| PARSE-09 | Every remaining list-A shape fixed or recorded with reason | Long-tail probes below establish, for each shape in D-10's list, whether it is cheap (confirmed fixable: `SETDRIVE` — no rule exists at all; `PROCESS_EVENTS`/`FULLTEXT` — option order is compiler-order-independent but grammar-order-fixed; single-line `DEF FN` — same comment-tail mechanism as PARSE-06) or needs a new mechanism (confirmed needs one: `ON ERR(...) GOTO 1000,2000,3000` — bare-number branch targets are a wholly separate addressing mode from named `LabelDecl`/`LabelRef`, not implemented at all). `input@(10,3),p$` and `::file::Class.method()` are **already-parsing** shapes this research reclassifies (see below), following the exact D-01 precedent from Phase 99. |
| EXMP-01 | Every `examples/*.bbj` file compiles with `bbjcpl` or lives in `examples/invalid/` with asserted diagnostics | All 17 currently-failing files (of 92 total) were compiled against `bbjcpl` this session, and a specific root cause + concrete repair was established for every one via targeted probes. See "examples/ clean-up" below, including one file (`issue650-composer-cues.bbj`) whose repair collides with a hardcoded string in an existing e2e test — flagged as a load-bearing cross-file edit. |
</phase_requirements>

## Summary

Every group in this phase reduces to a small number of well-understood Langium/Chevrotain defect shapes, all with an already-shipped precedent somewhere in this same grammar (Phase 98's "no rule exists" and "custom token wins a priority race" categories; Phase 99's "lowercase-declared keyword excluded from the generic ID-category fallback" category; Phase 99's `CAST`-style multi-bracket pattern). Nothing found this session requires a genuinely new parsing mechanism *except* two items that this research recommends recording rather than fixing: bare-number `GOTO`/`GOSUB` targets (a classic-BASIC line-number addressing mode with zero grammar support today, confirmed independently of the `ON ERR(...)` wrapper it was originally attributed to), and the `EXCLUDED`-set risk on `CLASSEND`/`METHODEND`/`INTERFACEEND` (a deliberate Phase-era safety exclusion whose removal needs a same-session ambiguity probe the research phase cannot itself run).

Three shapes CONTEXT flagged as open turned out to be **already-parsing** — the same D-01 pattern Phase 99 found for `PRINT (0,err=label)`: `input @(10,3),p$` (with a space) already parses; `::file.bbj::Cls.run()` already parses in every form tried; and `MODE=` as a call argument to `msgbox`/`fileopen`/`filesave` already parses (it round-trips through the ordinary relational-`=` expression grammar, not a dedicated named-argument mechanism — so there is nothing to tighten or move for D-18's grammar-side concern). The corresponding **examples** still fail `bbjcpl` for unrelated reasons established by direct probe (see "examples/ clean-up").

**Primary recommendation:** land the empty-bracket array fix first (largest group, one grammar rule), then the type-side bracket shapes (reusing the `CAST` pattern, one small `check-classes.ts` follow-up), then block-boundary comments (one mechanical grammar addition repeated at four sites) and line-numbered class code (a second, independent `ClassDecl` change), then the oracle-sweep word fixes (per-word, Phase-99 style), then the cheap long-tail items, then `examples/`. Record bare-number branch targets and the `EXCLUDED`-set risk explicitly rather than attempting them.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Empty-bracket array form | Langium grammar (`bbj.langium`) | — | One `ArrayElement` alternative change; every reader (`check-variable-scoping.ts`, `setopts-code-scanner.ts`, `bbj-validator.ts`'s `except` check) already dispatches uniformly on `isArrayElement(node)` + `.receiver`, confirmed by reading all three this session — no provider/validator change needed once `all=true` is produced for the empty form |
| Type-side multi-bracket / post-name `[all]` | Langium grammar (`bbj.langium`) | Validator (`check-classes.ts`) | Reusing `CAST`'s `arrayDims+='[' ']'` pattern changes the AST shape from a boolean `array` flag to a count; the 3 existing `meth.array`/`field.array` truthy reads need a matching one-line update |
| `; rem` after block boundaries | Langium grammar (`bbj.langium`) | — | Same mechanical addition (`(';' comments+=CommentStatement)?`) already present on `MethodDeclStart`/`ClassDecl`'s header, applied to the four end-markers |
| Line-numbered class code | Langium grammar (`bbj.langium`) | — | `ClassDecl`'s member loop needs the same permissiveness `Program`/`MethodDecl` already have for a bare leading line number |
| Oracle-sweep words as names | Langium grammar (`bbj.langium`) | — | Per-word `FeatureName`/`LabelName` additions, the exact Phase 99 `label`/`void` mechanism |
| `SETDRIVE` / order-independent `PROCESS_EVENTS`/`FULLTEXT` options | Langium grammar (`bbj.langium`) | — | New statement rule / small alternation widening |
| Bare-number `GOTO`/`GOSUB` targets | — (recorded, not fixed) | — | Confirmed to need a wholly new addressing mechanism (see "Long tail" below); no tier owns a partial fix |
| `examples/` repairs | Test fixtures (`examples/*.bbj`) | Test infra (`bbj-vscode/test/`) | Content-only edits plus one new examples-compliance test; one repair (`issue650-composer-cues.bbj`) also touches an existing e2e test's hardcoded assertions |

## Standard Stack

No new external packages — this phase touches only `bbj-vscode/src/language/bbj.langium`, `check-classes.ts`, and `examples/*.bbj` plus test fixtures. `npm run langium:generate` (Node 22 — Node 24 breaks it, per standing project memory) regenerates `src/language/generated/{ast,grammar,module}.ts`. `vitest` is `^4.1.10` per `bbj-vscode/package.json` (confirmed, matches the version banner every probe run this session printed) [VERIFIED: bbj-vscode/package.json].

## Package Legitimacy Audit

Not applicable — no packages installed by this phase.

## Architecture Patterns

### System Architecture Diagram

```
source text (.bbj)
      │
      ▼
BbjLexer.tokenize()                         (bbj-lexer.ts, unchanged)
      │
      ▼
BBjTokenBuilder.buildTokens()               (bbj-token-builder.ts)
  ├─ generic uppercase-keyword loop:  CATEGORIES=[ID] for every keyword whose DECLARED text
  │    contains an uppercase run, unless it is one of the 14 custom NL-sensitive tokens or the
  │    hand-picked EXCLUDED set {METHODEND, CLASSEND, INTERFACEEND} -- the EXCLUDED set is a
  │    THIRD distinct defect class from Phase 99's lowercase-keyword exclusion: these three ARE
  │    uppercase-declared but are still deliberately opted OUT. The oracle sweep shows the real
  │    compiler disagrees with that exclusion for plain variable/label use.
  └─ per-word FeatureName/LabelName literals (the Phase 99 mechanism) -- this phase repeats it
      for auto, declare, library, use, var (variable position) and adds void to LabelName
      │
      ▼
Chevrotain-generated LL(k) parser           (generated/grammar.ts, from bbj.langium)
  ├─ MemberCall's ArrayElement postfix: "[" (all?="ALL" | indices+=Expression...) "]" -- the
  │    SAME rule instance is reached from every one of PRINT/DREAD/assignment/CALL/method-call/
  │    function-call/bbjapi().copy() because they all bottom out in the shared Expression grammar;
  │    ONE fix at this rule fixes all of them simultaneously (confirmed: all 11 probed positions
  │    fail with the byte-identical error message and offset shape)
  ├─ ClassDecl's own (members+=ClassMember | Comments)* loop -- unlike Program's and MethodDecl's
  │    permissive Statement-based loops, this is a STRICT allow-list with no tolerance for a bare
  │    NUMBER token (the classic-BASIC line-number prefix); breaks ONLY when the number appears
  │    directly before a class-member line or CLASSEND itself, not when it appears inside a
  │    method body (MethodDecl's body already tolerates it, confirmed by probe)
  ├─ MethodDecl/ClassDecl/InterfaceDecl/DefFunction's own end-markers (endTag='METHODEND',
  │    'CLASSEND', 'INTERFACEEND', FNEND?) sit OUTSIDE the generic Statement/CompoundStatement
  │    ';'-chaining mechanism that already lets '; rem' work after any ORDINARY statement -- this
  │    is why METHODRET's own '; rem' already works today (it IS an ordinary SingleStatement
  │    inside MethodDecl's body) while METHODEND's does not
  └─ produces Program.statements[] / BbjClass.members[]
      │
      ▼
BBjDocumentValidator.validateDocument()     (unchanged by this phase -- confirmed by reading
                                              check-variable-scoping.ts, setopts-code-scanner.ts,
                                              bbj-validator.ts: every ArrayElement reader already
                                              dispatches on isArrayElement(node) + .receiver,
                                              uniform across all/indices)
      │
      ▼
Diagnostic[]
```

### Recommended Project Structure

```
bbj-vscode/
├── src/language/
│   ├── bbj.langium                       # every grammar fix in this phase lives here
│   └── validations/check-classes.ts      # 3-line follow-up if `array` boolean -> `arrayDims` count
└── test/
    ├── test-data/conformance/            # new fixtures, one per construct group:
    │   ├── whole-array-empty-brackets.bbj
    │   ├── multi-bracket-array-types.bbj
    │   ├── rem-after-block-boundaries.bbj
    │   ├── line-numbered-class.bbj
    │   ├── language-words-as-names.bbj
    │   └── statement-option-tails.bbj    # SETDRIVE / PROCESS_EVENTS / FULLTEXT order, single-line DEF FN ; rem
    └── examples-compile.test.ts          # NEW (D-19): asserts every examples/*.bbj parses/validates
                                            #   clean, and every examples/invalid/*.bbj has an
                                            #   asserted sidecar (see "examples/ clean-up" below)

examples/
└── invalid/                              # NEW (D-16), flat, one README
```

### Empty-bracket array form

**Current state (verified, probe) — byte-identical error at every one of 11 call sites:**
```
src: "dread x![]\n" / "print z![]\n" / "x![] = expr\n" / "call \"p\",a[]\n" /
     "o!.put(\"k\",a$[])\n" / "x = vector(a$[])\n" / "x = vector(a$[],err=L100)\n" /
     "call bbjapi().copy(v!,a[])\n" / "xcall \"p\",a[]\n" / "print \"a\",x$[]\n" /
     "print x[1],z![]\n"
parseErrors: ["Expecting: one of these possible Token sequences:\n  1. [ALL]\n  2. [!]\n  3. [-]
  ...(35 more Expression-starting alternatives)...\nbut found: ']'"]
```
Every call site bottoms out in `MemberCall`'s `ArrayElement` postfix, read this session at `bbj.langium:833`:
```langium
{infer ArrayElement.receiver=current} "[" (all?="ALL" | indices+=Expression (',' indices+=Expression)*) "]"
```
Neither alternative matches an immediately-closing `]` — `all?="ALL"` requires the literal, `indices+=Expression` requires at least one expression. `DreadStatement`, `PrintStatement`'s items, `Assignment`'s `variable=MemberCall`, `CallStatement`, `XCallStatement`, method-call args (`ParameterCall`), and function-call args all resolve through the *same* `MemberCall`/`Expression` grammar path, so this single rule is the actual root of every symptom.

**Recommended fix** (grammar-only, one rule):
```langium
{infer ArrayElement.receiver=current} "[" (all?="ALL"? | indices+=Expression (',' indices+=Expression)*) "]"
```
Making `"ALL"` itself optional (so the alternative matches on a bare `[]` with `all` simply unset-but-still-taking-that-branch) is the minimal-AST-impact shape, but produces `all: false` for `x[]` rather than `all: true` — **this does not satisfy D-03's "same node as `[all]`" requirement**. The shape that does:
```langium
{infer ArrayElement.receiver=current} "[" (all?=("ALL")? | indices+=Expression (',' indices+=Expression)*) "]"
```
is still ambiguous about which alternative Chevrotain picks for a bare `[]` (both are technically satisfiable at zero tokens). The safer, unambiguous shape — verified against no runtime probe (grammar edits are out of scope for research) but structurally sound by inspection — separates "empty" as its own explicit third alternative that also sets `all`:
```langium
{infer ArrayElement.receiver=current} "[" (all?="ALL" | indices+=Expression (',' indices+=Expression)* | {infer ArrayElement}) "]"
```
This third alternative is unusual Langium syntax (an empty action inside an OR); the more idiomatic and lower-risk shape is to keep `all` as a boolean set by *either* the literal or the empty case via a nested optional-group trick:
```langium
{infer ArrayElement.receiver=current} "[" ((all?="ALL")? indices+=Expression (',' indices+=Expression)* | all?="ALL")  "]"
```
None of these is proven by a probe this session (out of scope). **Recommend the executor's Wave 0 task open with 3-4 tiny probe variants of the bracket alternative** (bare `[]`, `[all]`, `[1]`, `[1,2]`) checking specifically that `all === true` for the empty case (not just "0 parser errors") before committing to one shape — this is the single highest-uncertainty grammar edit in the phase.

**Every existing reader already treats `all`/`indices` uniformly via `.receiver`, confirmed by reading all three files in full this session:**
- `check-variable-scoping.ts:144,164,183` — `isArrayElement(item)` → `item.receiver` (or `.variable.receiver`) → symbol name, regardless of `all` vs `indices`.
- `setopts-code-scanner.ts:230` (`indexedAccessRootName`) — same `.receiver` unwrap, bounded by `MAX_ACCESSOR_HOPS`.
- `bbj-validator.ts:89` (`except` statement check) — `isArrayElement(e) && e.all` — this ALREADY expects `all` to be the discriminator; a correct empty-form fix (all=true) makes an *empty-bracket except item* validate identically to `[all]`, which is very likely the compiler's own semantics (not independently verified against `bbjcpl` this session; low-risk since `except` items are rare).
- No hover/semantic-token/completion provider references `ArrayElement` at all (grepped this session) — D-07's "no provider change" is free.

**Still-flagged cases to add (D-24):** `print x[\n` (unclosed bracket, EOF) and `print x[,]\n` (leading comma with nothing before it) both already produce a genuine parser error today (probed, confirmed) and must continue to after the fix.

### Type-side bracket shapes

**`declare int[][] two!` — multi-pair brackets (verified, probe):**
```
src: "declare int[][] two!\n"
parseErrors: ["Expecting: one of these possible Token sequences:\n  1. [ID]\n  2. [ID_WITH_SUFFIX]\n
  3. [void]\n  4. [label]\nbut found: '['"]
```
`VariableDecl` (`bbj.langium:336`), `FieldDecl` (`:378`), `MethodDecl`'s return type (`:391`), and `ParameterDecl` (`:403`) all share the exact same single-pair pattern:
```langium
type=QualifiedClass (array?='[' ']')? name=FeatureName
```
`CAST` (`:891`) already has the multi-pair precedent:
```langium
'CAST' '(' castType=QualifiedClass (arrayDims+='[' ']')* ',' value=Expression Err? RPAREN
```
**Recommended fix:** replace `(array?='[' ']')?` with `(arrayDims+='[' ']')*` at all four sites, mirroring `CAST` exactly. This changes the AST from a boolean `array` flag to a `string[]` count array — **a breaking rename for 3 existing read sites**, all `if (meth.array)` / `if (field.array)` truthy checks:
- `check-classes.ts:307` — `if (meth.array) { return; }` (skip return-type literal check for array-typed methods) [VERIFIED: bbj-vscode/src/language/validations/check-classes.ts:307] `if (meth.array) {`
- `check-classes.ts:369` — `if (!isTypeResolutionWarningsEnabled() || meth.array)`
- `check-classes.ts:436` — `if (!field.init || field.array)`

Each becomes `if (meth.arrayDims.length > 0)` / `if (field.arrayDims.length > 0)` — a 3-line follow-up, not a redesign. **Field-decl and method-return-type total-misparse note:** probing `class public A\nfield public int[][] f!\nclassend\n` and `class public A\nmethod public int[][] m()\nmethodend\nclassend\n` today shows the **entire surrounding `ClassDecl` disintegrates** into loose `ExpressionStatement`s (not a localized error at the second bracket) — Chevrotain's error-recovery re-syncs across the whole class once the mid-stream mismatch occurs (the same "mid-stream error corrupts a wider swath than an end-of-stream leftover" pattern documented in Phase 98/99 research). This is *why* the multi-bracket fix is worth doing at all four sites together in one plan, not the array-element fix alone — otherwise these two shapes stay in list A even after the array-element root fix lands.

**`BBjArray dat[all]` / `BBjArray dat[]` — bracket AFTER the parameter name (verified, probe, genuinely different defect):**
```
src: "method public void m(BBjArray dat[all])\nmethodend\n"
parseErrors: ["Expecting: one of these possible Token sequences:\n  1. [RPAREN_NL]\n  2. [)]\n
  but found: 'dat'", "Expecting end of file but found `)`."]
```
`ParameterDecl` (`:403`, `type=QualifiedClass (array?='[' ']')? name=FeatureName`) only supports a bracket pair **before** the name (matching `declare`/`field`/method-return-type convention) — it has **no grammar position at all** for a bracket **after** the name. This is not the same defect as the multi-pair case above; it needs a *new* optional trailing element:
```langium
{infer ParameterDecl} type=QualifiedClass (array?='[' ']')? name=FeatureName ('[' all?='ALL' ']')?
```
**Not independently probed post-edit this session** (grammar edits out of scope) — flag as the parameter-position fix's own first Wave-0 probe. Confirm `BBjArray dat[]` (no `ALL`) is either also accepted by the real compiler or is a genuine still-flagged case — this session did not probe `bbjcpl` on the parameter form specifically (only the language-server side), since a standalone parameter declaration isn't a full compilable program; treat as `[ASSUMED]` that the compiler's acceptance of `dat[all]` on a parameter extends to bare `dat[]` too, pending confirmation.

### Block-boundary comments (`; rem`)

**Root cause, precisely (verified, multiple probes):** `Statement`'s generic chaining (`bbj.langium:23`, `SingleStatement ({infer CompoundStatement.statements+=current} (';' statements+=SingleStatement)+)?`) already lets `; rem` work after **any ordinary statement** — `CommentStatement` is itself a valid `SingleStatement`, so `methodret 1; rem c` parses cleanly today (probed: 0 errors) purely *because* `METHODRET` is an ordinary statement inside `MethodDecl`'s permissive body list. The four block-boundary end-markers are **not** ordinary statements — they are literal tokens embedded directly inside their *own* container rule, bypassing this mechanism entirely:
- `MethodDecl` (`:381-388`): `endTag='METHODEND'` — no comment tail.
- `ClassDecl` (`:341-347`): `'CLASSEND'` — no comment tail (the class **header** already has one: `(';' comments+=CommentStatement)?` at `:344`).
- `InterfaceDecl` (`:348-352`): `'INTERFACEEND'` — no comment tail.
- `DefFunction` (`:306-314`): both branches lack one — `RPAREN_NO_NL '=' value=Expression` (single-line) and `RPAREN_NL (body+=...)* FNEND?` (multi-line).

**Confirmed by probe, qualitatively different failure severity depending on position:**
- `classend; rem c` as the **last thing in the file** → an isolated, single top-level error (`Expecting end of file but found `;`.`) — the `ClassDecl` itself parses intact (`types: ["BbjClass"]`). Low-risk, cosmetic leftover.
- `methodend; rem c` **followed by more content** (e.g. `classend` on the next line) → the entire surrounding `ClassDecl` disintegrates into loose `ExpressionStatement`s, same mid-stream-recovery pattern as the multi-bracket case above.
- `fnend; rem c` (single- or multi-line `DEF FN`) → `Expecting end of file but found `;`.` (isolated, since `DefFunction` is typically the last thing before EOF in the probed shape, but would misparse mid-stream too if followed by more content — not independently probed).

**Recommended fix** (grammar-only, four mechanical additions, all reusing the exact `(';' comments+=CommentStatement)?` shape already on `MethodDeclStart` and `ClassDecl`'s header):
```langium
// MethodDecl
endTag='METHODEND' (';' comments+=CommentStatement)?

// ClassDecl
'CLASSEND' (';' comments+=CommentStatement)?

// InterfaceDecl
'INTERFACEEND' (';' comments+=CommentStatement)?

// DefFunction, single-line branch
RPAREN_NO_NL '=' value=Expression (';' comments+=CommentStatement)?

// DefFunction, multi-line branch
| RPAREN_NL (body += (DefReturn | Statement))* FNEND? (';' comments+=CommentStatement)?
```
Not independently re-probed post-edit this session (all four are the identical, already-proven shape used twice elsewhere in this same grammar file — HIGH confidence, but still flag for the executor's routine post-edit probe per convention).

### Line-numbered class code

**A second, independent root cause from the comment-tail issue above** (verified by isolating each variable across 8 probes): `Program`'s top-level `Statements*` and `MethodDecl`'s own body (`body+=(DefFunction|Statement))*`) are both *permissive* — they accept **any** `Statement`, so a bare leading line number (`0010`) is silently absorbed as its own throwaway `ExpressionStatement` (a lone `NumberLiteral`), and parsing continues cleanly right after it. Confirmed:
- `class public A\nmethod public void m()\n0016 print "x"\nmethodend\nclassend\n` → **0 errors** (number tolerated inside a method body).
- `class public A\nmethod public void m()\n0017 methodend\nclassend\n` → **0 errors** (number tolerated even directly before `METHODEND`, because it's still *inside* `MethodDecl`'s own permissive body list, which runs right up to the mandatory `endTag`).
- `0010 class public A\nclassend\n` → **0 errors** (number tolerated as its own top-level `Program` statement, immediately before `ClassDecl` starts fresh).
- `class public A\n0020 classend\n` (number directly before `CLASSEND`, **no method in between**) → **fails**: `Expecting end of file but found `classend`.`
- `class public A\n0015 method public void m()\nmethodend\nclassend\n` (number directly before a `METHOD` header) → **fails**, same shape.

`ClassDecl`'s own member loop (`bbj.langium:345`, `(members+=ClassMember | Comments)*`) is a **strict allow-list** of `FieldDecl | MethodDecl | VariableDecl | Comments` — unlike `Program`/`MethodDecl`'s loops, it has no fallback for an arbitrary `Statement`, so a bare leading `NUMBER` on a class-member line or right before `CLASSEND` breaks it outright (and, per the pattern above, breaks it with a wide mid-stream misparse of the whole class).

**Recommended fix** (grammar-only, `ClassDecl`): tolerate an optional leading `NUMBER` before each member and before `CLASSEND`:
```langium
ClassDecl returns BbjClass:
    'CLASS' Visibility Static name=ValidName Extends?
        ('IMPLEMENTS' implements+=QualifiedClass)? (',' implements+=QualifiedClass)* (';' comments+=CommentStatement)?
    (NUMBER? (members+=ClassMember | Comments))*
    NUMBER? 'CLASSEND' (';' comments+=CommentStatement)?
;
```
Not independently probed post-edit this session (grammar edits out of scope) — the executor's Wave 0 probe should specifically re-run the 5 isolating cases above (numonly-before-classend, numonly-before-method-header, and the 3 already-passing baselines) to confirm no regression. CONTEXT scoped this fix to `ClassDecl` only ("line-numbered **class** code") — `InterfaceDecl`'s member loop has the identical structural gap but was not named in the roadmap; **not fixed here, not separately recorded** (no corpus evidence either way this session) — flag as an open question below.

### Oracle sweep results

**Method (this session):** every literal keyword string in `bbj.langium` was extracted (`grep -oE "'[A-Za-z_@]+'" bbj.langium | sort -u`, 172 distinct words after lower-casing), then compiled with `bbjcpl -N` in two forms — `{w}=1\nprint {w}\n` (variable) and `{w}:\nprint "hi"\ngoto {w}\n` (label declaration + `GOTO` target, combined) — via a small Node script (`spawnSync`, capturing both stdout+stderr; an earlier `execFileSync`-based version silently dropped stderr and produced a **false all-172-accepted result**, caught and corrected by manually re-verifying a known-bad word before trusting the output — this is a real pitfall, documented below). The identical two source shapes were run through `parseHelper` in-process. Results cross-referenced by word.

**Compiler-accepts, parser-rejects — MUST FIX (D-06):**

| Word | As variable | As label/`GOTO` target | Why (grammar mechanism) |
|------|:-:|:-:|---|
| `auto` | ✗→fix | ✗→fix | Lowercase-declared keyword (`VariableDecl`'s `auto?='auto'?`), same exclusion class as Phase 99's `label`/`void` |
| `declare` | ✗→fix | ✗→fix | Lowercase-declared, starts `VariableDecl` |
| `library` | ✗→fix | ✗→fix | Lowercase-declared, starts the separate `Library` top-level rule (not reachable from `Program`, so no ambiguity risk when added to `FeatureName`/`LabelName` for program-level use) |
| `use` | ✗→fix | ✗→fix | Lowercase-declared, starts `Use` |
| `var` | ✗→fix | ✗→fix | Lowercase-declared; no existing grammar rule uses the literal `'var'` at all (dead weight keyword or forward-looking) |
| `classend` | ✗→fix | ✗→fix | **Different defect class**: uppercase-declared but explicitly placed in `BBjTokenBuilder.EXCLUDED = new Set(['METHODEND','CLASSEND','INTERFACEEND'])` (`bbj-token-builder.ts:6`), opting it OUT of the generic ID-category fallback that every other uppercase keyword gets automatically |
| `methodend` | ✗→fix | ✗→fix | Same `EXCLUDED`-set defect |
| `interfaceend` | ✗→fix | ✗→fix | Same `EXCLUDED`-set defect |
| `void` | (already OK — Phase 99) | ✗→fix | `FeatureName` already includes `'void'` (Phase 99); `LabelName` (`ID \| 'label'`) does not — needs `'void'` added there too |
| `start` | ✗→fix (see below) | (already OK) | **Sweep-methodology blind spot** — see next section |

**Recommended fix, per word (Phase 99 pattern, D-07):**
- `auto`, `declare`, `library`, `use`, `var` → add each literal to `FeatureName` (variable position) and to `LabelName` (label/branch-target position), exactly as `'void'`/`'label'` were added in Phase 99. Each of these five keywords starts its OWN dedicated rule (`VariableDecl`, `Use`, the separate `Library` entry) — the 1-token discriminator that already disambiguates `field=5` vs the `FIELD` verb (99-CONTEXT D-07/99-RESEARCH "FIELD verb") applies identically here: `use=1` has `=` immediately after `use`, which `Use`'s own grammar (`bbjFilePath=... | javaClass=...`) cannot start with, so only the `FeatureName`/assignment path can match. **Not independently re-probed post-edit** for all five — Phase 99's identical mechanism for `label` was proven safe; still worth one post-edit ambiguity-warning diff per D-25's convention.
- `classend`, `methodend`, `interfaceend` → **higher-risk mechanism**: removing these three from `BBjTokenBuilder.EXCLUDED` grants them the generic `CATEGORIES=[ID]` fallback the same way every other uppercase keyword gets it automatically — no `FeatureName`/`LabelName` addition needed, no `bbj-token-builder.ts` structural change beyond deleting three names from one `Set` literal. **This research could not verify the risk the `EXCLUDED` set exists to guard against** (its own comment gives no reason) — the plausible risk is an LL(k) ambiguity between "`classend` used as an ordinary variable inside a class member/method body, immediately before the real terminator" and "the terminator itself." **Recommend the executor's Wave 0 task specifically probe** `class public A\nmethodend=1\nclassend\n` (using the word AS A VARIABLE on the line immediately before the real terminator of the same kind) both before and after removing the exclusion, and capture whether `npm run langium:generate` reports any *new* Chevrotain ambiguity warning (diff against the pre-existing baseline, per standing project memory that some warnings are benign/pre-existing).
- `void` → add `'void'` as a second alternative to `LabelName` (`ID | 'label' | 'void'`), mirroring the exact Phase 99 shape already used for `label`.

**`start` — sweep-methodology blind spot (verified, deeper probe):** the sweep's basic variable-read format (`start=1\nprint start\n`) reports **zero parser errors**, but produces the **wrong AST**: `types: ["LetStatement","PrintStatement","StartStatement"]` — `print start` silently parses as a **bare `PrintStatement` with no items** (its item list is entirely optional, and `START_BREAK`'s custom NL-sensitive token pattern intercepts `start` right before the newline, producing an opaque token with no `ID` category, so it can't be consumed as a `PrintStatement` item) followed by a **separate, spurious `StartStatement`**. This is a silently-wrong-AST defect, not a hard parser error — the basic sweep's `parserErrors.length === 0` check cannot see it. The deeper probe CONTEXT itself names (`let a = b - start`) DOES surface it as a hard parser error, because inside a binary-expression continuation there's no fallback statement boundary to silently swallow the misplaced token:
```
src: "let a = b - start\n"
parseErrors: ["Expecting: one of these possible Token sequences:\n  1. [!]\n  2. [-]\n  ...\nbut found: 'start'"]
```
**Recommended fix:** extend `START_BREAK`'s existing `CATEGORIES=[id]`/`LONGER_ALT` treatment the exact way `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL` already get it (`bbj-token-builder.ts:40-49`) — three explicit lines granting the category to the `START_BREAK` terminal token directly, since it (like those three) has a custom `PATTERN` function and is therefore excluded from the *generic* uppercase loop by construction, not by the `EXCLUDED` set. **This is a fourth distinct defect class** from the three above (lowercase-exclusion, `EXCLUDED`-set, and this one: "custom-PATTERN terminal never entered into the generic loop at all, and no explicit category was ever added for it the way three siblings already got"). **Methodological finding for the plan:** the oracle sweep as designed (`w=1` / `print w`) systematically **cannot** detect this class of defect for *any* of the other custom-NL-sensitive tokens either (`FNEND`, `NEXT_BREAK`/`NEXT_ID`, `METHODRET_END`, `PRINT_STANDALONE_NL`, `RESTORE_NO_NL`, `TABLE_DATA`, `KEYWORD_STANDALONE`'s six words) — a word whose custom token silently degrades a `PRINT`/statement into "zero items" rather than throwing will pass the basic sweep's naive check. **Recommend the executor add a second sweep form** (`x = 1 - {w}` or equivalent — an operand position with no trailing statement boundary to hide behind) for every keyword that has a corresponding custom-PATTERN token in `bbj-token-builder.ts`, not just `start`. This session did not exhaustively re-run all ~16 such words through the deeper form (time-boxed); `start` is the one CONTEXT already named and this research confirmed by direct probe.

**Compiler-rejects, parser-accepts (D-09, recorded only, not flagged) — 32 words**, identical set for both variable and label position: `begin`, `callback`, `case`, `dread`, `else`, `endif`, `err`, `exitto`, `fi`, `fnerr`, `for`, `from`, `gosub`, `goto`, `if`, `iolist`, `let`, `load`, `new`, `on`, `process_events`, `remove_callback`, `restore`, `seterr`, `setesc`, `swend`, `switch`, `then`, `tim`, `until`, `wend`, `where`, `while`. (These are exactly the words with no `CATEGORIES=[ID]` at all today, by either mechanism, and the real compiler genuinely rejects them as names too — no gap, no risk, per D-09.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Letting a lowercase-declared keyword act as a name | A `bbj-token-builder.ts` `CATEGORIES`/lookbehind special-case | List the literal as a `FeatureName`/`LabelName` alternative (Phase 99's shipped `void`/`label` pattern) | Different defect from a lexer priority race; the in-repo fix shape already exists and is proven |
| Multi-pair array-type brackets | A second, parallel boolean-or-count property alongside the existing `array` flag | `CAST`'s already-shipped `arrayDims+='[' ']'*` pattern, applied uniformly, with the 3 downstream boolean reads updated to a length check | One pattern, one small mechanical follow-up, instead of two divergent array-type representations in the same grammar |
| `; rem` after a block terminator | A new lexer token that swallows the terminator (`KEYWORD_STANDALONE`-style) | The exact `(';' comments+=CommentStatement)?` tail already used on `MethodDeclStart` and `ClassDecl`'s header | The generic `Statement` chaining mechanism already handles `; rem` for every ordinary statement; these four end-markers just need the same small, proven tail, not a new lexer mechanism |
| Numeric line-number branch targets | A local grammar tweak treating `GOTO 1000` as if it were a `LabelRef` | Record as needing a new mechanism (a genuine addressable-line-number model, separate from named `LabelDecl`) | Confirmed this session that bare-number labels (`9500:`) are rejected by the real compiler too — the addressing scheme is NOT "declare a numeric label," it is the file's own physical/declared line numbering, which nothing in this grammar tracks today |

**Key insight:** every defect in this phase traces to one of four narrow, already-cataloged mechanisms (no grammar rule exists; a strict allow-list loop lacks a permissive fallback a sibling loop already has; a lowercase-declared keyword misses the generic ID-category loop; a keyword is explicitly opted out of that loop by name or by having a custom `PATTERN` with no matching `CATEGORIES` line) — the research effort here was almost entirely locating which of the four applies to each symptom, the same finding Phase 99 made for its own four groups.

## Runtime State Inventory

Not applicable — grammar/lexer/validator + regression-test + example-fixture phase, not a rename/refactor/migration. No stored data, live service config, OS-registered state, secrets, or build artifact carries any of this phase's keywords or file paths in a way a source change would leave stale.

## Common Pitfalls

### Pitfall 1: `execFileSync`'s non-throwing return value silently drops `stderr`
**What goes wrong:** A sweep/oracle script using `execFileSync(bin, args, { encoding: 'utf8' })` and treating the returned string as "the full output" produces a **false all-accepted result** whenever the target process (here, `bbjcpl`, which always exits 0 per its own documented behavior) writes its errors to stderr instead of stdout.
**Why it happens:** Node's `child_process.execFileSync` only returns `stdout` on the non-throwing path; `stderr` is discarded unless the call throws (nonzero exit) or `stdio` is captured via `spawnSync` and read from `res.stderr` explicitly.
**How to avoid:** use `spawnSync` and concatenate `res.stdout + res.stderr` regardless of `res.status`, or explicitly redirect stderr to stdout at the shell level. Verify the harness against at least one **known-bad** input before trusting a bulk "all accepted" result.
**Warning signs:** a sweep across many inputs reporting 100% acceptance, especially for inputs (like `then`, `and`, core operator keywords) that are implausible as accepted identifiers.

### Pitfall 2: A mid-stream parser error corrupts a much wider AST region than an end-of-stream leftover error
**What goes wrong:** Assuming a missing bracket pair or a missing comment-tail only breaks the one statement/line it appears on.
**Why it happens:** Chevrotain's default error recovery re-syncs broadly once a mismatch occurs *inside* an in-progress rule (here, `ClassDecl`'s member loop or `MethodDecl`'s body) — the entire surrounding container degrades into loose `ExpressionStatement`s. A mismatch that occurs only *after* a rule has already fully and successfully closed (e.g., unconsumed trailing text after a complete `ClassDecl`) stays an isolated, single top-level error instead.
**How to avoid:** when probing a "still fails" case, check whether the reported error is the *only* symptom or whether the `types` array shows the whole surrounding construct disintegrated — the second shape means the fix must land at the point where the *mismatch itself* occurs (inside the rule), not just appended at the end.
**Warning signs:** a probe's `types` array full of generic `ExpressionStatement` entries where a structured node (`BbjClass`, `MethodDecl`) was expected.

### Pitfall 3: Three distinct "keyword excluded from the ID-category fallback" mechanisms coexist in this grammar, and each needs its own fix shape
**What goes wrong:** Applying the Phase 99 `label`/`void` fix (add the literal to `FeatureName`/`LabelName`) to a word that is actually excluded by the `BBjTokenBuilder.EXCLUDED` `Set`, or to a word whose token has a custom `PATTERN` function and was never routed through the generic loop at all.
**Why it happens:** all three produce the *identical symptom* (word unusable as a name) but need entirely different fixes: (1) lowercase-declared keyword → add to `FeatureName`/`LabelName`; (2) named in `EXCLUDED` → delete the name from that `Set`; (3) custom-`PATTERN` terminal with no explicit `CATEGORIES` line → add three lines mirroring `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL`.
**How to avoid:** for every oracle-sweep mismatch, read which of the three buckets the word's own grammar declaration falls into *before* picking a fix (uppercase+lowercase text, `EXCLUDED` membership, and whether `buildTerminalToken` has a bespoke branch for it) rather than pattern-matching the previous phase's fix shape.
**Warning signs:** adding a literal to `FeatureName` with no effect (word is `EXCLUDED`, not lowercase) or deleting a name from `EXCLUDED` with no effect (word was never in it to begin with, e.g. `start`).

### Pitfall 4: A word's "already accepted as a variable" status does not carry across every syntactic position — check both a positional-read AND an operand-inside-an-expression form
**What goes wrong:** Concluding a keyword is fully fixed once `w=1` / `print w` both pass with zero parser errors.
**Why it happens:** custom NL-sensitive tokens only intercept a word *immediately before a statement/line boundary* — a trailing bare read (`print w`) can silently degrade into "zero items consumed, word becomes its own spurious statement" with **no parser error at all**, hiding the defect from a naive zero-errors check; the same word fails loudly the moment it sits mid-expression (`x = 1 - w`) with nothing to silently swallow the mismatch into.
**How to avoid:** probe every custom-NL-token word (see the `bbj-token-builder.ts` custom-`PATTERN` branches) with BOTH a bare positional read and a binary-operand form before declaring it fixed; check the resulting AST shape, not only `parserErrors.length`.
**Warning signs:** a word's `types` array containing more top-level statements than there are actual statements in the source (a spurious extra node is the tell).

## Code Examples

### The Phase 99 per-word pattern this phase repeats five times (unaudited literal additions)
```langium
// Source: bbj-vscode/src/language/bbj.langium:913-920, read this session (existing code, Phase 99)
FeatureName returns string:
    ID | ID_WITH_SUFFIX | 'void' | 'label';
// this phase adds: | 'auto' | 'declare' | 'library' | 'use' | 'var'

LabelName returns string:
    ID | 'label';
// this phase adds: | 'void' | 'auto' | 'declare' | 'library' | 'use' | 'var'
```

### The already-shipped multi-bracket precedent this phase's type-side fix follows
```langium
// Source: bbj-vscode/src/language/bbj.langium:891, read this session (existing code)
CastExpression:
    'CAST' '(' castType=QualifiedClass (arrayDims+='[' ']')* ',' value=Expression Err? RPAREN
;
```

### Probing a construct's current AST and diagnostics, and a compiler-vs-parser cross-check, this session's technique
```typescript
// Source: this session, ad hoc — not from official docs. Delete before finishing the plan/wave.
import { EmptyFileSystem } from 'langium';
import { describe, test } from 'vitest';
import { parseHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);
await initializeWorkspace(services.shared);
const parse = parseHelper<Program>(services.BBj);

const src = 'dread x![]\n';
const parsed = await parse(src);
console.log((parsed.parseResult.value as any).statements.map((s: any) => s.$type));
console.log(parsed.parseResult.parserErrors.map(e => e.message));
```
```javascript
// bbjcpl cross-check — spawnSync, NOT execFileSync (see Pitfall 1)
import { spawnSync } from 'node:child_process';
const res = spawnSync('/opt/bbx/bin/bbjcpl', ['-N', filePath], { encoding: 'utf8', timeout: 5000 });
const errorText = (res.stdout || '') + (res.stderr || ''); // '' means bbjcpl accepted the file
```
Run: `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/<scratch>.test.ts` — write results to a file (`fs.writeFileSync`) rather than relying on console interception; delete the scratch file before finishing (register-check scans for stray files).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `ArrayElement`'s brackets require `ALL` or ≥1 index | Empty brackets accepted, producing the same `all=true` node as `[all]` | This phase | Fixes ~29 of the Phase 99-close list-A files in one grammar rule (`PRINT`, `DREAD`, assignment target, `CALL`/method/function argument, all suffixes/cases) |
| Single bracket pair on `DECLARE`/`FIELD`/method-return-type; no bracket support after a parameter name | `CAST`-style `arrayDims+='[' ']'*` on all four sites; a new post-name `[all]` marker on `ParameterDecl` | This phase | `declare int[][] name!` and `BBjArray name[all]` parse; `check-classes.ts`'s 3 boolean-array reads become length checks |
| `METHODEND`/`CLASSEND`/`INTERFACEEND`/`FNEND` have no comment tail; block terminators bypass `Statement`'s generic `;`-chaining | Each gets the same `(';' comments+=CommentStatement)?` tail `MethodDeclStart`/`ClassDecl`'s header already has | This phase | `; rem` after any block boundary parses; matches the already-working behavior of every ordinary statement inside a block body |
| `ClassDecl`'s member loop has no tolerance for a leading line number | An optional `NUMBER?` before each member and before `CLASSEND`, matching `Program`'s/`MethodDecl`'s existing permissiveness | This phase | Line-numbered class code (`0010 class public A` ... `0040 classend`) parses |
| 9-10 keywords (lowercase-declared, `EXCLUDED`-set, or missing-`CATEGORIES` custom token) unusable as names | Per-word fixes matching whichever of the three mechanisms applies | This phase | Closes the oracle-sweep mismatch list; `start` specifically needs the `RELEASE_NL`-style explicit `CATEGORIES` grant, not a `FeatureName` addition |

**Deprecated/outdated:** none — purely additive/corrective, consistent with Phases 98-99.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact empty-bracket grammar shape that both (a) parses `x[]` with zero errors and (b) sets `all=true` (not merely "matches") has not been probed post-edit; three candidate shapes are offered, none independently verified | "Empty-bracket array form" | If the naive shape (`all?="ALL"?`) is chosen, `all` stays `false`/unset for the empty form and D-03 ("same node as `[all]`") is silently violated even though parsing succeeds — a semantic gap masked by a green parse |
| A2 | `BBjArray dat[]` (no `ALL`) on a parameter is accepted by the real compiler the same way `dat[all]` is — not independently probed against `bbjcpl` this session (a bare parameter declaration isn't a compilable program on its own) | "Type-side bracket shapes" | If the compiler actually requires `[all]` specifically (not a bare `[]`), the still-flagged case list needs an extra entry; low risk, easy to add |
| A3 | Removing `classend`/`methodend`/`interfaceend` from `BBjTokenBuilder.EXCLUDED` introduces no new Chevrotain ambiguity — reasoned from the fact that `ClassMember`'s and `MethodDecl`'s own loops are structurally bounded (a member/body statement vs. the literal terminator token), not independently probed since it requires a grammar edit + `langium:generate` | "Oracle sweep results" | If an ambiguity does surface (e.g., `methodend=1` as the last body statement before the real `METHODEND`), the fix needs a bounded lookahead/GATE, not a one-line `Set` edit — extra, unbudgeted work, not a design failure |
| A4 | `InterfaceDecl`'s member loop has the identical line-numbered-code gap as `ClassDecl`'s but is out of this phase's named scope ("line-numbered **class** code") — no corpus evidence probed either way | "Line-numbered class code" | If a corpus file needs it, it's cheap to add symmetrically once `ClassDecl`'s fix is proven; if not, no harm in leaving it |
| A5 | Only `start` was deep-probed for the "custom-NL-token silently swallows into a spurious statement" blind spot; the other ~15 custom-PATTERN words in `bbj-token-builder.ts` were not exhaustively re-tested with the deeper (`x = 1 - w`) form this session (time-boxed) | "Oracle sweep results" | The oracle sweep's word list may be incomplete for this specific defect class; the executor's own deeper pass (recommended above) is the closing step, not a redo of this research |

## Open Questions

1. **Exact bracket-alternative grammar shape for the empty-array fix.**
   - What we know: three candidate shapes were reasoned from the existing `ArrayElement` rule; none probed post-edit (out of scope for research).
   - What's unclear: which one Chevrotain accepts without a new ambiguity warning, and which actually sets `all=true` for the empty case.
   - Recommendation: the executor's very first Wave-0 task should be a tight probe loop over 2-3 candidate shapes before committing, checking both `parserErrors.length === 0` AND the resulting node's `all` property.

2. **Should `InterfaceDecl` get the same line-numbered-code tolerance as `ClassDecl`?**
   - What we know: the roadmap and CONTEXT name only "line-numbered class code."
   - What's unclear: whether any corpus file needs it for interfaces.
   - Recommendation: leave it out unless the D-14 triage (after the named-group fixes land) finds a corpus file whose first-failing line is an interface with a leading line number.

3. **`issue650-composer-cues.bbj`'s repair collides with a hardcoded e2e test string.**
   - What we know: this file's failing line (`win3! = ... : win4! = ...`, colon-joined) is read verbatim, twice, by `bbj-vscode/test/functional/installed-extension-e2e.test.ts` (lines 713, 845) as a literal string match against the fixture's own text — confirmed by grep this session. The compiler rejects the colon join; a semicolon join (`win3! = ...; win4! = ...`) was confirmed accepted by `bbjcpl` this session and preserves the exact property the fixture is testing (two window-creation calls on one physical line).
   - What's unclear: whether the plan should also edit `installed-extension-e2e.test.ts`'s two hardcoded strings, or find an alternative repair that doesn't touch the colon.
   - Recommendation: repair `examples/issue650-composer-cues.bbj`'s colon to a semicolon AND update the two matching string literals in `installed-extension-e2e.test.ts` in the *same* task — this is a load-bearing cross-file edit, not a simple example-file-only fix; call it out explicitly in the plan so it isn't discovered mid-execution.

4. **`issue_378_class_bbjstring_bbjnumber.bbj`'s demonstrative intent vs. a clean single repair.**
   - What we know: the file deliberately mixes suffix conventions across 4 field declarations to demonstrate them; 3 of the 4 lines fail `bbjcpl` for 3 different reasons (missing `!` on an object-typed field with no suffix at all; a `$`-suffixed name on an object-typed field; two fields both named `someString!` with different types, a genuine duplicate-name conflict).
   - What's unclear: whether the file's *purpose* is "valid suffix conventions" (repair all 3) or intentionally includes an invalid-by-design line that belongs in `examples/invalid/` (split, D-17).
   - Recommendation: default to D-15 (repair to compile, smallest edit) for the missing-`!` and duplicate-name lines; the `$`-suffixed object-typed field line's own point may be "this is the wrong suffix" — the planner should read the file's own intent once more before choosing repair-in-place vs. split.

5. **`fileopen`/`filesave` (issue246.bbj) may not be real top-level callable BBj functions at all.**
   - What we know: both are rejected by `bbjcpl` even with a single trivial string argument and no `MODE=` at all — the `MODE=` named-argument syntax itself is not the problem (confirmed: `msgbox` with the identical `MODE=` syntax compiles cleanly once its own unrelated argument-type issue is fixed).
   - What's unclear: whether `fileopen`/`filesave` need a different calling convention (an object method, a different name) or are simply not real BBj built-ins.
   - Recommendation: this is very likely the D-18 "grammar rule added on a false premise" case for these two specific functions — move `issue246.bbj` to `examples/invalid/` with "no diagnostic today" and file the todo per D-18's own prescribed disposition, rather than searching further for a valid spelling.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm run langium:generate`, `npm test` | Project convention: Node 22 (Node 24 breaks `langium:generate`, per standing memory) | Not re-verified this session (no grammar edits made) | Pin Node 22 before running `langium:generate` |
| vitest | All test runs this phase | Yes — used repeatedly this session | v4.1.10 [VERIFIED: bbj-vscode/package.json] | — |
| `/opt/bbx/bin/bbjcpl` | The oracle for the word sweep (D-06) and every example (D-15..D-19) | Yes — confirmed present and invoked dozens of times this session | Binary, no version string surfaced by `-N` | None needed — this session's own oracle work depended on it directly |
| java-interop (`:5008`) / BBjServices (`:8888`) | Not required for this phase's in-repo tests | N/A | — | All probes this session used `EmptyFileSystem` + `parseHelper` with `RUN_BBJ_TESTS=0` |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none beyond the standard `RUN_BBJ_TESTS=0`/`EmptyFileSystem` pattern already used throughout the suite.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.1.10 |
| Config file | `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run <file>` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npm test` (judge on `numFailedTests: 0`, `--maxWorkers=2` per standing memory) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PARSE-04 | Empty-bracket array form parses in every named position | unit (parse+validate) | `npx vitest run test/conformance-regressions.test.ts` + new `test-data/conformance/whole-array-empty-brackets.bbj` | ❌ Wave 0 |
| PARSE-05 | `DREAD` into arrays; multi-pair `declare`; post-name `[all]` parameter | unit | same + new `test-data/conformance/multi-bracket-array-types.bbj` | ❌ Wave 0 |
| PARSE-06 | `; rem` after 4 block boundaries; line-numbered class code | unit | same + new `test-data/conformance/rem-after-block-boundaries.bbj`, `line-numbered-class.bbj` | ❌ Wave 0 |
| PARSE-08 | 9-10 oracle-sweep words usable as variable/label/target | unit | same + new `test-data/conformance/language-words-as-names.bbj` | ❌ Wave 0 |
| PARSE-09 | Cheap long-tail fixes + shape-level residue list | unit + manual triage | same + new `test-data/conformance/statement-option-tails.bbj`; residue list is hand-written prose in `100-CONFORMANCE.md`, not a test | ❌ Wave 0 (fixture); N/A (residue list) |
| EXMP-01 | Every `examples/*.bbj` compiles with `bbjcpl` or lives in `examples/invalid/` with an asserted sidecar | unit (parse+validate) + BBj-gated (`bbjcpl`) | new `examples-compile.test.ts` (name/location is Claude's discretion) | ❌ Wave 0 — new test file |

### Sampling Rate
- **Per task commit:** the specific construct's probe/regression test, plus a throwaway pre/post `parseHelper` probe per D-25's identifier-safety convention.
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npm test`.
- **Phase gate:** full suite green, then the private conformance harness (orchestrator-run, per D-26): `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`, snapshotting `details.json` before every run and diffing file sets, targeting **A ≤ 25**, **A2 at or below 23** (the Phase 99 close).

### Wave 0 Gaps
- [ ] `bbj-vscode/test/test-data/conformance/whole-array-empty-brackets.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/multi-bracket-array-types.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/rem-after-block-boundaries.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/line-numbered-class.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/language-words-as-names.bbj` — new fixture
- [ ] `bbj-vscode/test/test-data/conformance/statement-option-tails.bbj` — new fixture (or split per-shape; planner's call)
- [ ] `bbj-vscode/test/examples-compile.test.ts` (or equivalent name) — new test file for EXMP-01, does not exist yet
- [ ] `examples/invalid/` directory + README — does not exist yet
- [ ] No existing test *infrastructure* needs a change for the conformance fixtures — `conformance-regressions.test.ts` already picks up any `.bbj` dropped into its folder (confirmed by reading the file this session, unchanged since Phase 98)

## Security Domain

`security_enforcement` is not present in `.planning/config.json`; per the default, treated as enabled. This phase touches no authentication, session, access-control, cryptography, or network surface — a parser/grammar correctness change and example-fixture cleanup against already-trusted local source files, identical in kind to Phases 98-99's security posture.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (no new trust boundary — the language server already parses arbitrary local `.bbj` files; this phase only recognizes more of what BBj's own compiler already accepts) | N/A |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

None applicable — no new external input source, no new parsing of untrusted network data.

## Project Constraints (from CLAUDE.md)

- All commands run from `bbj-vscode/`; `npm run langium:generate` after any grammar change; never edit `src/language/generated/` directly.
- Grammar changes require `npm run langium:generate` before `npm run build`/`npm test`.
- Tests use vitest + Langium's `EmptyFileSystem` + `parseHelper`/`validationHelper`; `initializeWorkspace()` loads the library grammar (`.bbl` files) — any grammar change must not break `lib/labels.bbl`'s 12-entry `label *NAME` usage (parsed by every probe's `initializeWorkspace()` call).
- Every `.bbj` file under `bbj-vscode/test/test-data/` is auto-parsed by `example-files.test.ts` and must produce zero lexer/parser errors.
- Shell rules: absolute paths only; never chain `cd` with `grep`/`find`/`cat`/`sed`/`head`/`tail`; no blind recursive scans; `git add <exact path>` only.
- BBj is case-insensitive — every new fixture/regression file needs upper- and lower-case variants.

## Sources

### Primary (HIGH confidence — read in full or exhaustively probed this session)
- `bbj-vscode/src/language/bbj.langium` — full grammar, re-read this session (1052 lines, current baseline post-Phase-99)
- `bbj-vscode/src/language/bbj-token-builder.ts` — full source, re-read this session (custom token patterns, `EXCLUDED` set, generic uppercase loop, `RELEASE_NL`/`RELEASE_NO_NL`/`EXIT_NO_NL` special-cases)
- `bbj-vscode/src/language/validations/check-classes.ts` — grepped and read the 3 `.array` boolean read sites (lines 307, 369, 436) this session
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — read the 3 `isArrayElement` dispatch sites (lines 144, 164, 183) this session
- `bbj-vscode/src/language/setopts-code-scanner.ts` — read the `isArrayElement` dispatch (line 230) this session
- `bbj-vscode/src/language/bbj-validator.ts` — read the `isArrayElement(e) && e.all` `except`-statement check (line 89) this session
- `bbj-vscode/src/language/validations/line-break-validation.ts`, `bbj-validator.ts`'s `checkCommentNewLines` — read this session (unchanged by this phase, confirmed no interaction beyond what's already documented)
- This session's own throwaway vitest probes (`zz-probe-100.test.ts` through `zz-probe-100g.test.ts`, 7 files, written and deleted this session, confirmed absent via `git status --porcelain`) — direct empirical evidence for every "current state (verified, probe)" claim above
- This session's own `bbjcpl -N` scratch-file compiles (dozens, under the session scratchpad) and the oracle-sweep Node scripts — direct empirical evidence for every compiler-acceptance claim, including the corrected (`spawnSync`) sweep of all 172 grammar keywords
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (Phase 99/100 blocks), `.planning/STATE.md` — read this session
- `.planning/phases/99-parser-gaps-the-largest-groups/99-RESEARCH.md`, `99-CONFORMANCE.md` — read in full this session for method, the closing gate numbers (A=52, A2=23, B=666), and the exact per-word fix mechanism vocabulary reused above
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` — grepped for `examples/` references and the two hardcoded `issue650-composer-cues.bbj` line-text assertions (lines 713, 845), this session
- `bbj-vscode/test/textmate-bbx-highlighting.test.ts`, `bbj-vscode/test/utils.test.ts` — grepped for `examples/` references this session (both reference non-`.bbj` files or plain path strings, no interaction with this phase's `.bbj` repairs)

### Secondary (MEDIUM confidence)
- BBj documentation for `MSGBOX`/`FILEOPEN`/`FILESAVE`, `DIRECT`, `SETDRIVE` argument shapes — not consulted this session (offline); all claims about these verbs are grounded in direct `bbjcpl` probes instead, which is the stronger evidence source per this phase's own "compiler is the oracle" convention

### Tertiary (LOW confidence)
- The exact viability of the three candidate empty-bracket grammar shapes (Assumption A1) and the `ParameterDecl` post-name bracket shape (Assumption A2) — reasoned by grammar-source inspection and analogy to shipped precedents, not compiled/probed this session since both require a grammar edit + `langium:generate`, out of scope for research
- Whether `InterfaceDecl` needs the same line-numbered-code fix as `ClassDecl` (Assumption A4) — no corpus evidence probed either way

## Metadata

**Confidence breakdown:**
- Root cause identification (all groups): HIGH — every "current state" claim reproduced directly via probe this session, traced to specific cited grammar lines
- Recommended fix mechanism (empty brackets, type-side brackets, block-boundary comments, line-numbered class): HIGH on mechanism, MEDIUM on exact grammar diff (none independently re-probed post-edit, per the "grammar edits out of scope for research" convention)
- Oracle sweep (PARSE-08): HIGH — actually run this session against all 172 grammar keywords via a corrected (`spawnSync`) script, cross-referenced against an equivalent in-process parser sweep; the `start` blind spot was itself caught by a second, deeper probe this session
- Long tail (PARSE-09): HIGH on the specific shapes probed (`SETDRIVE`, `PROCESS_EVENTS`/`FULLTEXT` order, `ON ERR(...) GOTO` numeric targets, `input@()`, `::file::Class.method()`); the numeric-branch-target "needs a new mechanism" conclusion is HIGH confidence (directly falsified the alternative by testing a bare numeric label declaration against `bbjcpl` and watching it fail)
- Examples (EXMP-01): HIGH — all 17 currently-failing files compiled against `bbjcpl` this session; a specific, probed root cause exists for every one; one cross-file interaction (`issue650-composer-cues.bbj` vs. the e2e test) was found and is flagged as an Open Question, not silently left for the planner to discover

**Research date:** 2026-09-21
**Valid until:** next `bbj.langium`/`bbj-token-builder.ts` change in this phase, or ~14 days (fast-moving in-repo grammar work)
