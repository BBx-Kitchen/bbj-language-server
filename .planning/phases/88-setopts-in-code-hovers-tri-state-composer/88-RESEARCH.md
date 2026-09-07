# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer - Research

**Researched:** 2026-09-07
**Domain:** Langium AST-level data-flow detection (variable-assignment chain tracing) + LSP hover extension + shared cross-IDE composer command layer (extends Phase 87)
**Confidence:** HIGH for grammar/AST shape, token-builder disambiguation, hover extension point, and existing composer/IntelliJ seams (all read directly from source this session). MEDIUM for the exact traversal-boundary algorithm (a genuine design choice, not something "the code already answers" — presented here as a concrete, conservative recommendation). LOW/flagged for one runtime-semantics gap (OPTS's actual byte-length at runtime) that this session could not resolve from any source in the repo.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SETOPTS-in-code decode hovers ship entirely as language-server changes to the
  existing `BBjHoverProvider` (`bbj-hover.ts`). Both VS Code and IntelliJ receive them for
  free through the standard LSP `textDocument/hover` request — LSP4IJ renders generic LSP
  hover content natively, unlike the Phase 84-87 composer *dialogs*, which needed a bespoke
  Swing UI because `bbj/composer/*` is a non-standard, LSP4IJ-custom-request surface. No
  `bbj-intellij` Java file is touched for the hover half of this phase.
  — Reversibility: reversible.

- **D-02:** Hover triggers on three shapes and shows exactly what DISC-05 names: (a) an
  absolute `SETOPTS <literal-or-expr>` statement — decode the value directly; (b) the `opts=`
  expression of a `SetOptsStatement` whose value traces back through zero-or-more `IOR`/`AND`
  reassignments to an `OPTS(...)` call — decode the accumulated effective vector from that
  chain; (c) hovering directly over one `IOR(...)`/`AND(...)` call in such a chain shows what
  that single call sets or clears, with **AND masks shown as the logical cleared bits** (a
  clear bit in the AND mask means that option is cleared) — this exact framing is DISC-05's
  own wording and must not be inverted or left as a raw bitmask.

- **Flag for `gsd-phase-researcher`:** How the language server recognizes that a variable's
  value traces back to `OPTS(...)` through *only* `IOR`/`AND` reassignments (vs. an
  intervening non-IOR/AND statement, a branch, or an alias that makes the chain undecidable)
  is a data-flow question against the existing local-variable tracking in
  `bbj-type-inferer.ts` / `bbj-scope-local.ts`, not a user-facing preference. FEATURES.md's
  own tiering already scopes edit-mode to the two statically-safe shapes; the researcher must
  confirm the exact traversal boundary (same-method/same-block scope, single assignment
  target, no intervening non-IOR/AND statement, no re-entry via a loop) before planning locks
  the detection algorithm. Get this wrong in the unsafe direction and DISC-06's "no edit
  action on any other shape" guarantee breaks silently. **→ Answered below in "Traceability
  Algorithm" — this is the core deliverable of this research.**

- **D-03:** The tri-state composer opens via an `IntentionAction` (lightbulb, Alt+Enter) on
  IntelliJ, following `ConfigureMsgboxIntention`'s exact shape (`isAvailable`/`invoke`/
  `startInWriteAction() = false`/`generatePreview` returning `IntentionPreviewInfo.Html`) —
  unlike Phase 87's `config.bbx` trigger (D-01 there, PSI-free context-menu action), `.bbj`
  source files have a full PSI/AST already. On VS Code, it follows the sibling CodeAction/
  CodeLens pattern already used for those same three composers, not a new command-palette-only
  entry point.
  — Reversibility: reversible.

- **D-04:** Edit-in-place is offered **only** for the two statically-safe shapes DISC-06
  names — an absolute `SETOPTS <literal>` statement, and the canonical
  `var$=OPTS(...)` … `SETOPTS var$` block with only `IOR`/`AND` statements in between. Any
  other shape gets hover decode only — no edit action is presented.

- **D-05:** Compose-new (no existing SETOPTS-in-code block near the cursor) inserts a brand
  new canonical block: `var$=OPTS(...)`, one `var$=IOR(var$, mask)` line per option the user's
  tri-state form sets to **Set**, one `var$=AND(var$, mask)` line per option set to **Clear**
  (options left **Leave** produce no line at all), then `SETOPTS var$`.

- **D-06:** The tri-state widget reuses Phase 87's byte-grouped catalog layout
  (`SetoptsComposerDialog`'s scrollable, byte-group-sectioned panel on IntelliJ; the existing
  webview panel structure on VS Code) but swaps each option's checkbox for a 3-state control
  (Set / Clear / Leave), reusing the catalog-rendering code rather than duplicating it.
  — Reversibility: reversible.

- **D-07:** Hover decode — and any per-statement SETOPTS-in-code detection this phase adds —
  hooks into the existing document-build/validation cycle (or a cache invalidated on that
  cycle's completion), never an independent full-AST walk per hover request or per keystroke.

### Claude's Discretion

- Exact new `bbj/composer/setopts/*`-adjacent request name(s) for the in-code decode/compose
  operations (e.g. `bbj/composer/setopts/decodeInCode`, `.../composeTriState`) — follow the
  existing `decodeCall`/`preview` naming convention from Phase 87.
- Whether hover decode reuses `setoptsPreview`/`describeVector` from `setopts-catalog.ts`
  directly, or needs a thin wrapper for the "AND masks as logical cleared bits" phrasing.
- Exact IntentionAction/CodeAction label wording and the new PSI/AST-detection helper's class
  name.
- Where the new `.bbj` AST-detection logic for "SETOPTS-in-code" shapes lives — a new module
  (e.g. `setopts-code-scanner.ts`) vs. extending `bbj-type-inferer.ts`.
- Whether the tri-state form needs Phase 87 D-08's "unknown/reserved bits" callout.
- Whether the tri-state dialog is a genuinely new `SetoptsTriStateComposerDialog.java` or a
  mode flag on the existing `SetoptsComposerDialog`.

### Deferred Ideas (OUT OF SCOPE)

- **Composer discoverability cue** (persistent clickable marker on every SETOPTS-in-code line)
  — DISC-01, Phase 89; this phase's Intention/CodeAction trigger is the interim entry point.
- **CVS() composer, MSGBOX-expression composer** — DISC-02/03, Phase 89.
- **Composer robustness** (malformed free-text rejection, MSGBOX QuickPick edit-window safety,
  listener leaks, IntelliJ debounce/cache for repeated dialog opens) — DISC-07..11, Phase 90.
- Explicitly out of scope by the milestone's own anti-features: decode-and-edit for *any*
  SETOPTS-in-code shape beyond the two statically-safe ones — aliasing, intervening
  non-IOR/AND statements, or computed masks make "current state" undecidable at edit time.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-05 (#475, decode tier) | User hovering a `SETOPTS` literal, or an `IOR`/`AND` line against an OPTS-derived variable in BBj code, sees which options that line sets or clears, with AND masks shown as the logical cleared bits | "Traceability Algorithm", "Grammar & AST Shape", "Hover Extension Point", "AND-mask decode phrasing" sections below give the exact AST shapes, the conservative chain-detection algorithm, and the exact `bbj-hover.ts` hook point + the new `describeClearedBits`-style helper needed for the DISC-05-mandated phrasing |
| DISC-06 (#475, composer tiers) | User can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form, and can edit in place an absolute `SETOPTS` literal or a canonical `var$=OPTS … SETOPTS var$` block; any other shape gets hover decode only, no edit action | "Traceability Algorithm" (the safe/unsafe boundary DISC-06 depends on), "Compose-new codegen: mask width gap" (a concrete correctness risk for the codegen this decision requires), "IntelliJ Composer Seams to Reuse", "Composer Command-Layer Extension Points" |

</phase_requirements>

## Summary

This phase extends Phase 87's shared SETOPTS catalog and `bbj/composer/setopts/*` request
layer from `config.bbx`'s absolute, file-content vector to a fundamentally different domain:
a **per-statement, runtime-relative** vector inside `.bbj` source code. The hard part is not
UI (Phase 87 already built the dialog shape, the debounce seam, and the DTO family this phase
reuses almost unchanged) — it is a **local, backward AST walk** that must correctly answer
"does this variable's value trace back to `OPTS` through *only* `IOR`/`AND` reassignments,
with nothing else in between?" without ever producing a false "yes" (a false "yes" breaks
DISC-06's edit-safety guarantee silently; a false "no" merely denies an edit action the user
otherwise deserved, which is the safe failure direction).

Three things this session confirmed that materially change the plan:

1. **`IOR`/`AND` are ordinary builtin-library `MethodCall`s, not special grammar constructs —
   but `AND` is *also* a grammar keyword** (the logical `AND` operator in `BinaryExpression`).
   This exact ambiguity is already solved in this codebase's token builder
   (`bbj-token-builder.ts`) and already has a dedicated regression fixture
   (`examples/issue208-and-is-also-a-function.bbj`) proving `AND(a$,b$)` parses as a function
   call in the same file that also uses `AND` as a logical operator on another line. The new
   detection code does **not** need to solve this ambiguity — it needs to detect the already-
   correctly-parsed `MethodCall` shape, exactly the way `check-function-calls.ts`'s
   (private, currently unexported) `resolveLibFunction()` helper already does for validation.

2. **The existing scope/type-inference machinery cannot be reused to walk the IOR/AND chain.**
   `bbj-scope-local.ts`'s implicit-assignment scope-building only records **the first**
   assignment to a given variable name per scope (a `findIndex(...) === -1` guard skips every
   subsequent assignment), and `bbj-type-inferer.ts`'s `SymbolRef → Assignment → recurse`
   path therefore only ever reaches that *one* assignment. A multi-statement `A$=OPTS` /
   `A$=IOR(A$,mask)` / `A$=IOR(A$,mask2)` / `SETOPTS A$` chain needs a **direct sibling-
   statement walk** (mirroring `check-variable-scoping.ts`'s existing `walkStatements`/
   `getStatements` pattern), not a reference-resolution chase.

3. **BBj's `IF`/`WHILE`/`FOR` are flat statement markers in this grammar, not nested block
   AST nodes** (`IfStatement`, `WhileStatement`, `IfEndStatement`, `WhileEndStatement` are
   siblings in the same flat `Program.statements`/`MethodDecl.body` array as everything
   else — there is no `IfStatement.thenBranch` array to descend into). This actually
   *simplifies* the "no branch/loop in between" traversal-boundary rule: it becomes "no
   `IfStatement`/`ElseStatement`/`IfEndStatement`/`WhileStatement`/`WhileEndStatement`/
   `ForStatement` token appears between the origin and the target statement in the flat
   containing array" — a linear scan, not a tree-shape analysis.

**Primary recommendation:** build a new, small, pure module (e.g. `setopts-code-scanner.ts`,
no `vscode`/`langium-lsp` dependency, following `setopts-catalog.ts`'s own "pure logic, no
host dependency" convention) that (a) recognizes the three DISC-05 hover shapes via direct
`$type` checks + the `resolveLibFunction`-style pattern, and (b) walks backward through the
*directly enclosing* flat statement array (never crossing into a nested `MethodDecl`/
`DefFunction`/`BbjClass`, mirroring `check-variable-scoping.ts`'s own pruning) collecting
same-name assignments until it either reaches an `OPTS`-sourced assignment (chain complete,
statically safe) or hits anything else (chain broken, hover-only). Hover computation itself
needs no new caching layer beyond what already exists: `textDocument/hover` is a per-request
LSP call, not a per-keystroke one, and the backward walk is bounded by block size, not file
size — Pitfall 11's warning is really about *not* building a whole-document precomputation
pass for this feature (that belongs to Phase 89's discoverability cue), not about hover
itself needing extra debounce machinery.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SETOPTS-in-code shape detection (chain walk) | API/Backend (language server) | — | Pure AST analysis against the Langium document; no client involvement, matches D-01/D-07 |
| Hover content rendering | API/Backend (language server, `bbj-hover.ts`) | Browser/Client (generic LSP hover UI, both IDEs) | D-01: server computes markdown, both IDEs render it via their built-in generic hover UI — zero client code |
| Tri-state composer trigger (lightbulb / CodeAction) | Frontend Server / IDE integration (`ConfigureSetoptsInCodeIntention.java`, VS Code CodeAction) | API/Backend (decode/compose requests) | D-03: per-IDE trigger UI, but all arithmetic and detection stays server-side per the `composer-commands.ts` single-source-of-truth convention |
| Tri-state dialog rendering | Frontend Server / IDE integration (Swing dialog / webview) | API/Backend (`bbj/composer/setopts/*` preview) | D-06: dialog is a thin renderer of server-computed preview payloads, exactly like Phase 87's `SetoptsComposerDialog` |
| Edit-in-place / compose-new document mutation | Frontend Server / IDE integration (`WriteCommandAction` / `editor.edit()`) | API/Backend (supplies the composed text + edit ranges) | Matches Phase 87's `ComposerLauncher.openSetopts` split: server decides *what* text, client applies *where* |

## Standard Stack

No new library, package, or Gradle dependency is introduced by this phase — confirmed by direct
reading of every file this phase touches (`bbj-hover.ts`, `setopts-catalog.ts`,
`composer-commands.ts`, `ComposerLauncher.java`, `SetoptsComposerDialog.java`,
`PreviewDebouncer.java`) and consistent with the milestone-level STACK.md finding ("No new
runtime dependency is required for any of the 23 v4.3 issues" `[CITED: .planning/research/STACK.md]`).
Every capability this phase needs — Langium `AstUtils`/AST-node `$type` guards, the existing
`resolveLibFunction`-style reference-resolution pattern, the existing `AstNodeHoverProvider`
extension point, the existing `bbj/composer/*` JSON-RPC request layer, and IntelliJ's
`IntentionAction`/`ComposerFlow`/`StaleEditGuard`/`PreviewDebouncer` seams — already ships in
this repo today `[VERIFIED: bbj-vscode/src/language/bbj-hover.ts, bbj-vscode/src/language/composer-commands.ts, bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java — all read directly this session]`.

### Installation

```bash
# No new npm packages, no new Gradle dependencies for this phase.
```

## Package Legitimacy Audit

Not applicable — this phase installs no external packages (code-only extension of existing,
already-vetted modules from Phase 87).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────── Editor (VS Code or IntelliJ) ───────────────────────────┐
│  User hovers a SETOPTS/IOR/AND line              User invokes lightbulb/CodeAction  │
│         │ textDocument/hover                            │ isCaretOnCall() (cheap,   │
│         ▼                                                │   line-text heuristic)   │
└─────────┼────────────────────────────────────────────────┼──────────────────────────┘
          │ LSP                                             │ bbj/composer/setopts/*
          ▼                                                  ▼
┌─────────────────────────── Language Server (main.cjs) ─────────────────────────────┐
│  BBjHoverProvider.getHoverContent()          composer-commands.ts new handlers:    │
│    findLeafNodeAtOffset(offset)                'bbj/composer/setopts/decodeInCode' │
│    → getAstNodeHoverContent(node)              'bbj/composer/setopts/composeTriState'│
│         │                                             │                            │
│         ▼                                             ▼                            │
│  NEW: setopts-code-scanner.ts                  NEW: same scanner, reused           │
│    detectSetOptsShape(node) →                    detectSetOptsShape() →            │
│      { kind: 'absolute' | 'chain' | 'ior-and-call' | 'unsafe', ... }               │
│         │                                             │                            │
│         ▼                                             ▼                            │
│  setopts-catalog.ts (existing + new helpers)   setopts-catalog.ts                  │
│    parseVector / describeVector (existing)       setoptsPreview (existing)         │
│    NEW: describeIorMask(mask, kind:'set'|'clear')  NEW: singleBitIorMask/AndMask   │
│         │                                             │                            │
│         ▼                                             ▼                            │
│  Markdown hover string returned                Edit ranges + composed text         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
bbj-vscode/src/
├── setopts-catalog.ts          # EXTEND: add describeIorMask / singleBitIorMask/AndMask helpers
├── setopts-code-scanner.ts     # NEW: pure AST detection module (this phase's core deliverable)
└── language/
    ├── bbj-hover.ts            # EXTEND: new branch in getAstNodeHoverContent for SETOPTS shapes
    ├── composer-commands.ts    # EXTEND: bbj/composer/setopts/decodeInCode + composeTriState handlers
    └── validations/
        └── check-function-calls.ts  # EXPORT resolveLibFunction (currently private) for reuse
```

### Pattern 1: LibFunction call-site resolution (already proven, currently private)

**What:** Resolve a `MethodCall` to the builtin `LibFunction` it invokes (e.g. distinguishing
`AND(a$,b$)` — a call — from `x AND y` — the logical operator).
**When to use:** Any time the new scanner needs to confirm a `MethodCall`'s target is `IOR` or
`AND` specifically (case-insensitively), or that a `SymbolRef` targets the `OPTS` `LibVariable`.
**Example (exact existing code to export/reuse):**
```typescript
// Source: bbj-vscode/src/language/validations/check-function-calls.ts:112-124 (read this session)
/** Resolve a call expression to the builtin {@link LibFunction} it invokes, if any. */
function resolveLibFunction(call: MethodCall): LibFunction | undefined {
    if (!isSymbolRef(call.method)) {
        return undefined;
    }
    let target: AstNode | undefined;
    try {
        target = call.method.symbol.ref;
    } catch {
        return undefined; // cyclic / unresolved reference
    }
    return isLibFunction(target) ? target : undefined;
}
```
This function is **not currently exported** — the planner should add `export` to it (or move
it to a shared location such as `bbj-nodedescription-provider.ts`) rather than reimplementing
the same three lines in `setopts-code-scanner.ts`. Matching by `fn.name.toUpperCase() === 'IOR'`
/ `'AND'` is required because BBj is case-insensitive and library scope resolution is
case-insensitive `[VERIFIED: bbj-vscode/src/language/bbj-scope.ts:376,399,409,414 — "new StreamScopeWithPredicate(elements, outerScope, { caseInsensitive: true });" confirms library/global scopes resolve case-insensitively]`.

### Pattern 2: Sibling-statement backward walk (mirrors existing `check-variable-scoping.ts`)

**What:** Walk the *flat* statement array a target node lives in, in source order, collecting
assignments to one variable name (case-insensitive), pruning into `CompoundStatement` children
but never into a nested `MethodDecl`/`DefFunction`/`BbjClass`.
**When to use:** The core of the traceability algorithm below.
**Example (exact existing pattern to mirror, not call directly — it is private and scope-shaped
differently, but the shape is the template):**
```typescript
// Source: bbj-vscode/src/language/validations/check-variable-scoping.ts:44-55, 348-357
// (read this session)
function walkStatements(statements: ReadonlyArray<AstNode>, callback: (stmt: AstNode) => void): void {
    for (const statement of statements) {
        callback(statement);
        if (isCompoundStatement(statement)) {
            walkStatements(statement.statements, callback);
        }
    }
}
// ...
function getStatements(node: Program | MethodDecl): ReadonlyArray<AstNode> {
    if (isProgram(node)) {
        return node.statements;
    }
    if (isMethodDecl(node)) {
        return node.body;
    }
    return [];
}
```
The new scanner needs a **backward-from-a-target-index** variant of this (the existing function
walks the whole scope forward, unconditionally, for a different purpose — "used before first
assignment" — and does not stop at branches). `DefFunction.body` must also be added to
`getStatements`'s container list for full coverage (`DefFunction` bodies are a valid `SetOptsStatement`
container per the grammar — see the `$container` union quoted in "Grammar & AST Shape" below).

### Pattern 3: Composer request registration (unchanged from Phase 87)

**What:** Add new handlers to the existing `composerHandlers` object; the registration loop
requires no changes.
**Example:**
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:259-263 (read this session)
export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```
New entries such as `'bbj/composer/setopts/decodeInCode'` and
`'bbj/composer/setopts/composeTriState'` (Claude's Discretion naming) are added as new keys on
`composerHandlers` (`composer-commands.ts:76-256`) — no change to `registerComposerRequests`
itself.

### Anti-Patterns to Avoid

- **Using `bbj-type-inferer.ts`'s `SymbolRef → Assignment` recursion to find "the" assignment
  for a variable used in a chain:** it only ever reaches the *first* assignment in scope
  (`bbj-scope-local.ts:186-201`'s `findIndex(...) === -1` guard skips every later one), so it
  cannot walk a multi-step `OPTS → IOR → IOR → AND` chain. Use the direct sibling-array walk
  (Pattern 2) instead.
- **Treating the logical `AND`/`OR` `BinaryExpression` operator the same as the `AND()`/`IOR()`
  library function call.** They are different AST shapes (`isBinaryExpression(x) && x.operator
  === 'AND'` vs. `isMethodCall(x) && resolveLibFunction(x)?.name.toUpperCase() === 'AND'`) that
  happen to share a keyword — confirmed both parse correctly in the same file today
  (`examples/issue208-and-is-also-a-function.bbj`, read this session: line 3 `AND(...)` as a
  call, line 8 `x=1 AND y=2` as the logical operator).
- **Building a whole-document precomputation pass for hover** (e.g., a `DocumentBuilder`
  hook that scans every statement in the file on every build). Pitfall 11 warns against this
  for the *discoverability cue* (Phase 89's CodeLens, which genuinely needs "every applicable
  line in the file"); hover's own backward walk is inherently request-scoped and
  block-bounded, so no new debounce/cache layer is needed for hover itself — do not
  over-engineer this phase by adding one preemptively.
- **Assuming `IOR`/`AND`'s second argument is always a `$hex$` literal.** The grammar allows
  any `Expression` there; the scanner must fall through to "unsafe/undecidable" for anything
  that isn't a `HEX_STRING`-backed `StringLiteral` it can parse with the existing
  `parseVector`, exactly the same "don't touch what you can't round-trip" discipline
  `parseSetOptsLine` already applies (`setopts-catalog.ts:258-260`'s own doc comment: *"Lines
  with trailing junk or a malformed token return undefined — the composer must not touch what
  it cannot round-trip."*).

## Grammar & AST Shape (verified this session — exact rules and types)

### `SetOptsStatement`
```
// Source: bbj-vscode/src/language/bbj.langium:704-706
SetOptsStatement:
    'SETOPTS' opts=Expression
;
```
`[VERIFIED: bbj-vscode/src/language/bbj.langium:704-706]`

Generated AST type:
```typescript
// Source: bbj-vscode/src/language/generated/ast.ts:2461-2465
export interface SetOptsStatement extends langium.AstNode {
    readonly $container: CompoundStatement | DefFunction | MethodDecl | Program;
    readonly $type: 'SetOptsStatement';
    opts: Expression;
}
```
`[VERIFIED: bbj-vscode/src/language/generated/ast.ts:2461-2465]`

### `Assignment` / `LetStatement`
```
// Source: bbj-vscode/src/language/bbj.langium:316-317, 496-498
Assignment:
    instanceAccess?='#'? variable=MemberCall '=' value=Expression;

LetStatement:
    'LET'? assignments+=Assignment (',' assignments+=Assignment)*
;
```
`[VERIFIED: bbj-vscode/src/language/bbj.langium:316-317,496-498]`

```typescript
// Source: bbj-vscode/src/language/generated/ast.ts:313-319, 1595-1604
export interface Assignment extends langium.AstNode {
    readonly $container: ForStatement | LetStatement;
    readonly $type: 'Assignment';
    instanceAccess: boolean;
    value: Expression;
    variable: Expression;
}
export interface LetStatement extends langium.AstNode {
    readonly $container: CompoundStatement | DefFunction | MethodDecl | Program;
    readonly $type: 'LetStatement';
    assignments: Array<Assignment>;
}
```
`[VERIFIED: bbj-vscode/src/language/generated/ast.ts:313-319,1595-1604]`

**Implication:** a bare `A$=IOR(A$,mask)` line (no `LET` keyword) is still an `Assignment`
wrapped in a `LetStatement` — `Assignment.$container` is never `Program`/`MethodDecl` directly.
The scanner's backward walk must therefore look at `LetStatement` siblings and, for each,
iterate its `assignments` array (comma-chained assignments on one line, e.g. `A$=1,B$=2`, are
siblings *within* one `LetStatement`, not separate array entries in `Program.statements`).

### `MethodCall` / `SymbolRef` / `ParameterCall` (how `IOR(...)`, `AND(...)`, `OPTS` parse)
```
// Source: bbj-vscode/src/language/bbj.langium:788-820
MemberCall infers Expression:
    PrimaryExpression
    (
        {infer MemberCall.receiver=current} '.' (member=[NamedElement:FeatureName])?
        | {infer ArrayElement.receiver=current} "[" (all?="ALL" | indices+=Expression (',' indices+=Expression)*) "]"
        | {infer MethodCall.method=current} '(' (args+=ParameterCall (',' args+=ParameterCall)* )? Err? RPAREN
    )*
;
SymbolRef infers Expression:
    {infer SymbolRef} instanceAccess?='#'? symbol=[NamedElement:FeatureName]
;
```
`[VERIFIED: bbj-vscode/src/language/bbj.langium:788-820]`

So `IOR(A$, $FF$)` parses as `MethodCall{ method: SymbolRef{symbol→"IOR"}, args: [ParameterCall{expression: SymbolRef→"A$"}, ParameterCall{expression: StringLiteral{value:"$FF$"}}] }`.
`OPTS` (no parens) parses as a bare `SymbolRef{symbol→"OPTS"}` since it is a `LibVariable`, not
a function — confirmed by its library declaration:
```
// Source: bbj-vscode/src/language/lib/variables.bbl:35,37
The OPTS variable returns a string containing the current PRO/5 options vector. The options vector is set by the SETOPTS verb.
var OPTS: string
```
`[VERIFIED: bbj-vscode/src/language/lib/variables.bbl:35,37]`

`IOR`/`AND` are `LibFunction`s, confirmed:
```
// Source: bbj-vscode/src/language/lib/functions.bbl:5,7,454
AND(left:string, right:string, ERR?!:lineref): string
IOR(string1: string, string2: string, ERR?!:lineref): string
```
`[VERIFIED: bbj-vscode/src/language/lib/functions.bbl:5,7,454]` (doc comment at
`functions.bbl:452` — *"The IOR() function inclusive ORs the bits of the two string arguments
and returns a string. Both string arguments must be the same length."* — this "same length"
constraint is load-bearing for the compose-new mask-width question below.)

Generated types:
```typescript
// Source: bbj-vscode/src/language/generated/ast.ts:1768-1774, 1992-1996, 2828-2834
export interface MethodCall extends langium.AstNode {
    readonly $type: 'MethodCall' | 'RPAREN' | 'RPAREN_NO_NL';
    args: Array<ParameterCall>;
    err?: Expression;
    method: Expression;
}
export interface ParameterCall extends langium.AstNode {
    readonly $container: MethodCall;
    readonly $type: 'ParameterCall';
    expression: Expression;
}
export interface SymbolRef extends langium.AstNode {
    readonly $type: 'SymbolRef';
    instanceAccess: boolean;
    symbol: langium.Reference<NamedElement>;
}
```
`[VERIFIED: bbj-vscode/src/language/generated/ast.ts:1768-1774,1992-1996,2828-2834]`

`LibFunction`/`LibVariable`:
```typescript
// Source: bbj-vscode/src/language/generated/ast.ts:1626-1632, 1706-1712
export interface LibFunction extends NamedElement {
    readonly $type: 'LibFunction';
    docu?: string;
    parameters: Array<LibParameter>;
    returnType: string;
}
export interface LibVariable extends NamedElement {
    readonly $type: 'LibVariable';
    docu?: string;
    type?: string;
}
```
`[VERIFIED: bbj-vscode/src/language/generated/ast.ts:1626-1632,1706-1712]`

### The `AND`-is-also-a-keyword ambiguity (already solved in this codebase)

`AND`/`OR` are also grammar keywords for the logical binary operator:
```
// Source: bbj-vscode/src/language/bbj.langium:763-765
BinaryExpression infers Expression:
    RelationalExpr ({infer BinaryExpression.left=current} operator=('AND'|'OR') right=RelationalExpr)*
    ;
```
`[VERIFIED: bbj-vscode/src/language/bbj.langium:763-765]`

But `FeatureName` (what a `SymbolRef`/function-call-name resolves through) only lists `ID |
ID_WITH_SUFFIX | 'void'`:
```
// Source: bbj-vscode/src/language/bbj.langium:872-876
FeatureName returns string:
    ID | ID_WITH_SUFFIX | 'void';
```
`[VERIFIED: bbj-vscode/src/language/bbj.langium:872-876]`

The disambiguation happens in the custom token builder, which re-categorizes every all-caps
keyword token (including `AND`) as also matching the `ID` token category:
```typescript
// Source: bbj-vscode/src/language/bbj-token-builder.ts:27-38
for (const keywordToken of tokens) {
    if (/[A-Z]+(?!_)/.test(keywordToken.name)
            && !terminalNames.has(keywordToken.name)
            && !('LINE_BREAKS' in keywordToken)
            && !BBjTokenBuilder.EXCLUDED.has(keywordToken.name)) {
        // add all matching keywords to ID category
        keywordToken.CATEGORIES = [id];
        // ID_WITH_SUFFIX first: identifiers with suffix (printTest$, stepXYZ!, indVal%)
        // must match before ID, otherwise ID matches without suffix and $ is orphaned
        keywordToken.LONGER_ALT = [idWithSuffix, id];
    }
}
```
`[VERIFIED: bbj-vscode/src/language/bbj-token-builder.ts:27-38]`

This is why `AND(a$,b$)` parses as a `MethodCall` (the `AND` token satisfies the `ID` category
Chevrotain needs for `FeatureName`) in the same file where `x AND y` parses as the logical
operator (the literal `'AND'` keyword alternative in `BinaryExpression` matches directly). A
dedicated regression fixture already proves this dual behavior works today:
```
// Source: examples/issue208-and-is-also-a-function.bbj (full file, read this session)
requiredPermissionsString$="1"
permissionIDBinString$="1"
permissionResult = DEC(AND(requiredPermissionsString$,permissionIDBinString$))

x=1
y=2

IF x=1 AND y=2 then
    PRINT "hello"
FI
```
`[VERIFIED: examples/issue208-and-is-also-a-function.bbj:1-10]` — this file is auto-parsed and
asserted zero-lexer/parser-error by `example-files.test.ts` per this repo's own testing
convention (CLAUDE.md: *"Every `.bbj` file in `test/test-data/` is automatically parsed by
`example-files.test.ts`..."* — note this specific file lives in `examples/`, the
issue-regression corpus, not `test/test-data/`; confirm during planning which corpus actually
exercises it, or add a copy to `test/test-data/` for this phase's own regression coverage).

### Flat statement containers — no nested block AST for IF/WHILE/FOR

```
// Source: bbj-vscode/src/language/bbj.langium:410-442
ForStatement:
    'FOR' init=Assignment 'TO' to=Expression  ('STEP' step=Expression)?
;
IfStatement:
    'IF' condition=Expression 'THEN'?
;
ElseStatement:
    'ELSE' {infer ElseStatement};
IfEndStatement:
    ('ENDIF' | 'FI') {infer IfEndStatement};
WhileStatement:
    'WHILE' condition=Expression
;
WhileEndStatement:
    'WEND' {infer WhileEndStatement}
;
```
`[VERIFIED: bbj-vscode/src/language/bbj.langium:410-442]`

`IfStatement`/`ElseStatement`/`IfEndStatement`/`WhileStatement`/`WhileEndStatement` are each a
**standalone statement node**, siblings of every other statement in the same flat
`Program.statements`/`MethodDecl.body`/`DefFunction.body` array — there is no
`IfStatement.thenBranch` to recurse into. This means "the OPTS chain never crosses a branch or
loop" is checkable with a **linear scan for these five node types between the origin and
target index in the flat array**, not a tree-shape/control-flow-graph analysis.

Container arrays, confirmed exactly:
```typescript
// Source: bbj-vscode/src/language/generated/ast.ts:659-663, 706-713, 1787-1799, 2130-2134
export interface CompoundStatement extends langium.AstNode {
    readonly $type: 'CompoundStatement';
    statements: Array<SingleStatement>;
}
export interface DefFunction extends NamedElement {
    readonly $type: 'DefFunction';
    body: Array<DefFunctionStatement>;
    parameters: Array<NamedElement>;
    value?: Expression;
}
export interface MethodDecl extends NamedElement {
    readonly $type: 'MethodDecl';
    body: Array<DefFunction | Statement>;
    // ...
}
export interface Program extends langium.AstNode {
    readonly $type: 'Program';
    statements: Array<BbjClass | DefFunction | Statement>;
}
```
`[VERIFIED: bbj-vscode/src/language/generated/ast.ts:659-663,706-713,1787-1799,2130-2134]`

## Traceability Algorithm (the core research deliverable)

**Recommended definition of "statically safe OPTS→IOR/AND→SETOPTS chain":**

Given a target node `T` (a `SetOptsStatement`, or the specific `IOR`/`AND` `MethodCall` under
the cursor):

1. Find `T`'s directly-enclosing statement container: walk up `$container` until reaching a
   `Program`, `MethodDecl`, `DefFunction`, or `CompoundStatement` — call its statement array
   `siblings` (`.statements` or `.body` per the container type quoted above) and `T`'s own
   top-level statement (the `LetStatement`/`SetOptsStatement` that is a direct element of
   `siblings`) its anchor index `i`.
2. Determine the target variable name: for a `SetOptsStatement`, the `SymbolRef.symbol.$refText`
   of `opts` (lowercased, matching `check-variable-scoping.ts`'s own `getSymbolRefName`
   convention `[VERIFIED: bbj-vscode/src/language/validations/check-variable-scoping.ts:61-66]`);
   for an `IOR`/`AND` `MethodCall`, the `SymbolRef` in `args[0]`.
3. Walk `siblings` **backward** from index `i-1` to `0`:
   - If the current element is one of `IfStatement`/`ElseStatement`/`IfEndStatement`/
     `WhileStatement`/`WhileEndStatement`/`ForStatement`/`GotoStatement`/a labeled statement —
     **stop, chain unsafe.** (Control flow may not have executed the assignments found so far
     unconditionally relative to `T`.)
   - If the current element is a `LetStatement`, check each of its `assignments` for one whose
     `variable` is a `SymbolRef` with the same lowercased name:
     - If none match, continue backward (this statement doesn't touch the tracked variable —
       skip it, it's a harmless "intervening" statement).
     - If one matches and its `value` is a `MethodCall` resolving (via the exported
       `resolveLibFunction` pattern) to a `LibFunction` named `IOR` or `AND` (case-insensitive)
       **whose own `args[0]` is a `SymbolRef` to the same variable** — this is a valid chain
       link; record it and continue backward.
     - If one matches and its `value` is a `SymbolRef` resolving to the `LibVariable` named
       `OPTS` — **chain origin found, stop, chain is statically safe.**
     - If one matches and its `value` is anything else (a literal, another variable, a
       different function call, or an `IOR`/`AND` call whose `args[0]` is *not* the same
       variable, i.e. an alias) — **stop, chain unsafe** (this is exactly the "an intervening
       non-IOR/AND statement... makes the chain undecidable" case CONTEXT.md names).
   - Any other statement type (a `PRINT`, another variable's assignment, a comment) that
     doesn't touch the tracked variable: skip, continue backward.
   - Reaching the start of `siblings` (index `0`) with no `OPTS` origin found: **chain unsafe**
     (the variable's value entering this block is unknown — it might be a method parameter, a
     `DECLARE`d default, or set in an enclosing/earlier scope this walk deliberately does not
     cross into).
4. `CompoundStatement` handling: if a sibling element is itself a `CompoundStatement` (a
   semicolon-joined line, e.g. `A$=IOR(A$,mask) ; REM note`), treat its `.statements` as if
   they were flattened into the same position — mirroring `bbj-scope-local.ts`'s own existing
   rule that a `CompoundStatement` is transparent to its parent for scoping purposes
   (`bbj-scope-local.ts:351-354`, *"if scopeHolder is a CompoundStatement, add to parent
   scope"*) `[VERIFIED: bbj-vscode/src/language/bbj-scope-local.ts:347-354]`.

**Why this boundary, not a wider one:** it is the narrowest rule that still accepts every
example DISC-06 and the milestone's own FEATURES.md give (`OPTS`→`IOR`→`IOR`→`SETOPTS`, all as
straight-line sibling statements) while rejecting every named unsafe case (branch, loop,
alias, unrelated statement that *does* reassign the tracked variable). It deliberately does
**not** cross into an enclosing scope (a variable set to `OPTS` in an outer `MethodDecl` and
only IOR/AND'd inside a nested `CompoundStatement` still resolves fine, since `CompoundStatement`
is transparent per step 4 — but a variable whose `OPTS` origin is genuinely in a **different**
top-level statement list, e.g. a class field initialized elsewhere, is out of scope and
correctly reported as unsafe). This is a **design recommendation**, not something read
directly from an authoritative source — confirm it during planning/discuss before locking the
detection algorithm, per CONTEXT.md's own framing of this as "a data-flow question... the
researcher must confirm."

**Confidence:** MEDIUM. The AST shapes and the disambiguation mechanism above are all
`[VERIFIED]`; the specific boundary rule (stop at IF/WHILE/FOR, skip unrelated statements,
require the *same* enclosing flat array) is `[ASSUMED]` — a reasoned design choice grounded in
the verified grammar shape, not itself verified against a BASIS spec or an existing test.

## AND-mask decode phrasing (DISC-05's "logical cleared bits" requirement)

BASIS's own documented AND-mask semantics (already confirmed by the milestone-level research,
re-derived here for the hover-specific wrapper this phase needs):

> `AND()`'s mask is inverted relative to "which bits this line clears" — the *stored* mask
> literal is what remains (i.e., a `1` bit in the mask means "preserve," a `0` bit means
> "clear") `[CITED: .planning/research/PITFALLS.md §"SETOPTS-in-code option model", drawing on https://documentation.basis.cloud/BASISHelp/WebHelp/commands/setopts_verb.htm]`.

`setopts-catalog.ts` today only exposes `describeVector(v)`, which lists **set** bits of an
absolute vector (`SETOPTS_BITS.filter(b => ... && getBit(v, byteNo, b.mask))`,
`setopts-catalog.ts:224-239`). There is no existing helper that, given an `IOR` or `AND`
**mask** (not a full vector), reports "these catalog options are being set" (IOR) or "these
catalog options are being cleared" (AND, bits *absent* from the mask). This phase needs a new,
small function — e.g.:

```typescript
// NEW — proposed addition to setopts-catalog.ts, following describeVector's own shape
// (setopts-catalog.ts:224-239) but operating on a single byte's raw mask instead of a
// full SetOptsVector, and inverting the bit test for the 'clear' kind.
export function describeIorAndMask(byteNo: number, mask: number, kind: 'set' | 'clear'): string[] {
    return SETOPTS_BITS
        .filter(b => b.byte === byteNo)
        .filter(b => kind === 'set' ? (mask & b.mask) !== 0 : (mask & b.mask) === 0)
        .map(b => b.label);
}
```
This directly reuses the existing `SETOPTS_BITS` catalog (`setopts-catalog.ts:58-116`) — no new
bit/byte data, only a new query shape. The planner should confirm the exact byte(s) a given
`IOR`/`AND` call's mask argument covers (see "Compose-new codegen: mask width gap" below) before
finalizing this signature — a mask spanning multiple bytes needs the loop to run per-byte over
the mask's full length, not a single `byteNo`.

## Compose-new codegen: mask width gap (flag for planner — genuine open question)

D-05's canonical codegen line shape is `var$=IOR(var$, mask)` / `var$=AND(var$, mask)` — one
call, one option, matching the BASIS documentation's own stated constraint that *"Both string
arguments must be the same length"* `[VERIFIED: bbj-vscode/src/language/lib/functions.bbl:452]`.
Since `var$`'s value comes from `OPTS` (a runtime value whose actual byte-length is **not**
statically knowable — confirmed by an absent finding, not a present one: neither
`variables.bbl`'s `OPTS` declaration `[VERIFIED: bbj-vscode/src/language/lib/variables.bbl:35,37]`
nor the milestone-level PITFALLS.md/FEATURES.md SETOPTS research session cites any BASIS text
stating `OPTS`'s returned length), the generated mask's byte-length is a genuine design
decision with a correctness consequence: too short and BASIS's own "same length" runtime
constraint may reject or mis-behave; too long and it's merely wasted bytes (assuming BASIS pads
harmlessly, which this session found no confirmation of either way).

**Recommendation (not verified against BASIS docs or a live BBjServices):** since
`setopts-catalog.ts` already treats `MAX_BYTES = 16` as the vector's documented upper bound
(`setopts-catalog.ts:52`, matching the SETOPTS verb's own documented byte range), generate
masks padded to 16 bytes (32 hex digits) by default, built directly from existing primitives:

```typescript
// NEW — proposed addition to setopts-catalog.ts, buildable from existing exports alone
// (emptyVector/growTo/setBit/encodeVector, setopts-catalog.ts:154-176,145-147)
export function singleBitIorMask(byte: number, mask: number): string {
    const v = emptyVector();
    growTo(v, MAX_BYTES);       // all-zero, IOR with 0 leaves other bits untouched
    setBit(v, byte, mask, true);
    return encodeVector(v);
}
export function singleBitAndMask(byte: number, mask: number): string {
    const v: SetOptsVector = { bytes: new Array(MAX_BYTES).fill(0xff), digitCount: MAX_BYTES * 2 };
    setBit(v, byte, mask, false); // AND with 0xff leaves other bits untouched, clears only this one
    return encodeVector(v);
}
```
This is an `[ASSUMED]` default (16-byte padding), not a verified requirement — flag as an
open question for discuss-phase/planning: **does a real BBjServices runtime accept an
`IOR`/`AND` mask shorter or longer than `OPTS`'s actual current length, and if not, what is
`OPTS`'s actual length in the versions this project targets?** A live-IDE UAT check against
real BBjServices (this repo already has one running per `devcontainer-bbj-setup` memory) is
the cheapest way to falsify or confirm the 16-byte-padding assumption before this phase ships.

## Hover Extension Point (exact, verified)

```typescript
// Source: bbj-vscode/src/language/bbj-hover.ts:29-53, 55 (read this session)
override async getHoverContent(document: LangiumDocument, params: HoverParams): Promise<Hover | undefined> {
    const rootNode = document.parseResult?.value?.$cstNode;
    if (!rootNode) {
        return undefined;
    }
    const offset = document.textDocument.offsetAt(params.position);
    const cstNode = findLeafNodeAtOffset(rootNode, offset);

    if (cstNode && cstNode.offset + cstNode.length > offset) {
        this.referenceCstNode = cstNode;
        try {
            return await super.getHoverContent(document, params);
        } catch (e) {
            logger.warn(`Hover failed at offset ${offset}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
            return undefined;
        } finally {
            this.referenceCstNode = undefined;
        }
    }
    return undefined;
}

protected override async getAstNodeHoverContent(node: AstNode): Promise<string | undefined> {
    // ... existing Java/BBj-class-member/documented-node branches (bbj-hover.ts:56-108) ...
}
```
`[VERIFIED: bbj-vscode/src/language/bbj-hover.ts:29-53,55]`

The new SETOPTS branch belongs at the **top** of `getAstNodeHoverContent` (before the existing
`isBbjClass(node) || isBBjClassMember(node)` check at `bbj-hover.ts:75`), guarded by
`isSetOptsStatement(node) || (isMethodCall(node) && resolveLibFunction(node)?.name...)`, and
should `return` its own markdown early rather than falling through — none of the existing
branches (Java class/method/field hovers, BBj class-member docs) can ever match a
`SetOptsStatement`/`IOR`/`AND` `MethodCall`, so there is no conflict risk, only an ordering
choice (put it first since the check is cheap and specific).

**Existing test pattern to extend (not `DocumentBuilder.build()` — a documented project
gotcha):**
```typescript
// Source: bbj-vscode/test/hover.test.ts:1-58 (read this session)
import { parseHelper } from 'langium/test';
// ...
const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);
// positionOf(document, snippet) locates a hover target by source-text search
```
`[VERIFIED: bbj-vscode/test/hover.test.ts:1-58]` — per this project's own recorded memory,
`parseHelper` (not `DocumentBuilder.build`) is required for hover tests since `build()`
triggers CPL/interop `:5008` and is flaky/fails on GitHub CI outside a live BBj environment.

## Composer Command-Layer Extension Points (exact, verified)

Phase 87's existing SETOPTS handlers to extend, not replace:
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:231-256 (read this session)
'bbj/composer/setopts/decodeCall': (p: { line: string }) => {
    const info = parseSetOptsLine(p.line);
    if (!info) {
        return { found: false };
    }
    return {
        found: true,
        edit: { hexRange: info.hexRange, insertOffset: info.insertOffset, hexDigits: info.hexDigits },
        initial: setoptsInitialSelection(info.vector),
    };
},
'bbj/composer/setopts/preview': (p: { original?: string; selection: SetOptsSelection }) =>
    setoptsPreview(p.original ? parseVector(p.original) : undefined, p.selection),
```
`[VERIFIED: bbj-vscode/src/language/composer-commands.ts:238-255]` — note `decodeCall` today
takes only `{ line: string }` (a single-line, config.bbx-style payload). The new in-code
decode request needs **document-wide** context (the backward walk crosses statement
boundaries, potentially spanning many lines) — its params shape must carry either the full
document text + offset, or the caller must pre-resolve the AST node server-side via a
document URI + position, closer to how `getHoverContent` itself receives `(document, params)`.
This is a genuine shape difference from every existing `bbj/composer/*/decodeCall` handler
(all of which are single-line-string based) — flag for the planner: the new in-code
decode/compose requests cannot reuse the `LineQuery` interface
(`composer-commands.ts:42-43`) as-is; they need a `{ uri: string; line: number; character:
number }`-shaped params type resolved against the already-open `LangiumDocument`.

The IntelliJ DTO family and server interface to extend:
```java
// Source: bbj-intellij/.../composer/BbjComposerServer.java:98-105 (read this session)
@JsonRequest("bbj/composer/setopts/decodeCall")
CompletableFuture<SetoptsDecodeResult> setoptsDecodeCall(SetoptsDecodeCallParams params);

@JsonRequest("bbj/composer/setopts/preview")
CompletableFuture<SetoptsPreview> setoptsPreview(SetoptsPreviewParams params);
```
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java:98-105]`
New methods (e.g. `setoptsDecodeInCode`, `setoptsComposeTriState`) are added to this **same**
single interface — confirmed as the established pattern (`getServerInterface()` returns
exactly one class, per Phase 81/83 precedent already recorded in STATE.md).

## IntelliJ Composer Seams to Reuse (exact, verified)

**Trigger pattern (D-03 template):**
```java
// Source: bbj-intellij/.../composer/ConfigureMsgboxIntention.java:16-52 (read this session, full file)
public final class ConfigureMsgboxIntention implements IntentionAction {
    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "msgbox");
    }
    @Override
    public void invoke(...) { ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.MSGBOX); }
    @Override
    public boolean startInWriteAction() { return false; } // opens a modal dialog, then applies its own write command
    @Override
    public @NotNull IntentionPreviewInfo generatePreview(...) {
        return new IntentionPreviewInfo.Html("...");
    }
}
```
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java:16-52]`

`ComposerLauncher.isCaretOnCall(editor, keyword)` (`ComposerLauncher.java:49-61`) is a **cheap
line-text substring heuristic** (`text.indexOf(keyword) >= 0`), not a real parse — used only for
`isAvailable()`'s fast synchronous gate; the precise decode happens server-side on `invoke()`.
For SETOPTS-in-code, an equivalent cheap heuristic (e.g. "line contains `SETOPTS` or `IOR(`/
`AND(` case-insensitively, at or before the caret") is sufficient for `isAvailable()` — the
*correctness* of whether an edit action should actually be offered is entirely the server's
job via `decodeInCode`'s `found`/edit-vs-hover-only response, matching every other composer's
existing split between "cheap client gate" and "authoritative server decode."

**`ComposerLauncher.Kind` enum needs a new SETOPTS-in-code kind** (or a flag distinguishing it
from `SETOPTS` which today means config.bbx only):
```java
// Source: bbj-intellij/.../composer/ComposerLauncher.java:40 (read this session)
public enum Kind { MSGBOX, ADDWINDOW, ADDCHILDWINDOW, SETOPTS }
```
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:40]`
— the planner must decide whether to add a fifth `Kind` value (e.g. `SETOPTS_IN_CODE`) or
reuse `SETOPTS` with a mode flag, since `openSetopts`'s existing switch arm
(`ComposerLauncher.java:88-90,273-324`) is entirely config.bbx-shaped (`setoptsDecodeCall(new
SetoptsDecodeCallParams(lineText))`, a single-line string) and cannot serve the in-code
document-context decode without changes.

**`PreviewDebouncer` (D-06's reused live-preview debounce, unchanged):**
```java
// Source: bbj-intellij/.../concurrency/PreviewDebouncer.java:44-53 (read this session, full file)
public void trigger() {
    Runnable previous = pending;
    if (previous != null) {
        scheduler.cancel(previous);
    }
    Runnable task = () -> uiThread.run(action);
    pending = task;
    scheduler.schedule(task, delayMs);
}
```
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/PreviewDebouncer.java:44-53]`
— directly reusable as-is for the tri-state dialog's live preview, exactly as `SetoptsComposerDialog`
already uses it (`PREVIEW_DEBOUNCE_MS = 300L`, `SetoptsComposerDialog.java:51,93-97`).

**`SetoptsComposerDialog`'s byte-grouped layout (D-06's reuse target):**
```java
// Source: bbj-intellij/.../composer/SetoptsComposerDialog.java:129-152 (read this session)
for (SetoptsByteGroup group : catalogs.byteGroups) {
    JPanel groupPanel = new JPanel();
    groupPanel.setLayout(new BoxLayout(groupPanel, BoxLayout.Y_AXIS));
    groupPanel.setBorder(BorderFactory.createTitledBorder(group.label));
    for (SetoptsBit bit : catalogs.bits) {
        if (bit.byteNo != group.byteNo) continue;
        JBCheckBox cb = new JBCheckBox(bit.label);
        // ... bbj-annotation greying + tooltip (D-08) ...
        cb.addActionListener(e -> scheduleRefresh());
        checkboxRows.add(new CheckboxRow(bit, cb));
        groupPanel.add(cb);
    }
    form.add(groupPanel);
}
```
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java:129-152]`
D-06 requires swapping `JBCheckBox` (2-state) for a 3-state control (Set/Clear/Leave) per row —
IntelliJ's Swing toolkit has no built-in tri-state checkbox; the planner should budget for
either a small custom `ButtonGroup`-backed 3-radio-button row per option, or a
`JComboBox<TriState>`, reusing `catalogs.byteGroups`/`catalogs.bits` iteration exactly as
shown above (only the per-row widget changes, not the grouping/iteration).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting whether a `MethodCall` invokes a builtin `IOR`/`AND` function | A new reference-resolution helper | Export and reuse `resolveLibFunction` from `check-function-calls.ts:112-124` | Already exists, already proven correct by the existing MethodCall validation checks (`checkFunctionCallArguments`) |
| Case-insensitive variable-name comparison across statements | A new normalization helper | Mirror `check-variable-scoping.ts:61-66`'s `getSymbolRefName` (`expr.symbol.$refText?.toLowerCase()`) | Established, tested convention in this exact codebase for the exact same problem shape |
| Byte/bit catalog data, absolute-vector parse/encode/describe | New bit-arithmetic logic | `setopts-catalog.ts`'s existing `SETOPTS_BITS`/`parseVector`/`encodeVector`/`getBit`/`setBit`/`growTo` | Complete, unit-tested engine; this phase only needs new *call sites* and two small new query/build helpers layered on the same primitives (see above) |
| IntelliJ preview debounce | A new `Alarm`/`Timer` in the tri-state dialog | `PreviewDebouncer` (`concurrency/PreviewDebouncer.java`) | Exact same seam Phase 87 already validated for this identical live-preview use case |
| IntelliJ stale-edit protection for edit-in-place | A new re-decode/compare mechanism | `StaleEditGuard` (`composer/StaleEditGuard.java`), exactly as `ComposerLauncher.openSetopts` already uses it for config.bbx | Same shape of problem (re-decode current document state before writing), already solved and tested |

**Key insight:** every *mechanism* this phase needs (debounce, stale-edit guard, request
registration, byte-catalog data, dialog layout, hover extension point) already exists in this
codebase in a directly reusable form. The only genuinely new logic is (a) the backward
sibling-statement walk (no existing helper does this — closest precedent is
`check-variable-scoping.ts`'s forward, whole-scope, branch-blind walk) and (b) the two small
mask-phrasing/mask-generation helpers layered on `setopts-catalog.ts`'s existing primitives.

## Common Pitfalls

### Pitfall 11 (inherited from milestone research) — refined for this phase

**What goes wrong:** A naive implementation recomputes SETOPTS-in-code detection by re-walking
the *entire* document AST on every hover request, or — worse — wires a `DocumentBuilder`/
document-change listener that recomputes proactively on every keystroke.
**Why this phase is actually low-risk here, if built as recommended:** `textDocument/hover` is
already a discrete, client-throttled LSP request (not a per-keystroke event) — Langium's
`AstNodeHoverProvider.getHoverContent` (`bbj-hover.ts:29`) is only invoked when the editor
actually sends a hover request. The backward walk recommended above is bounded by the
*enclosing statement list's* size (typically one method/program body), not the whole file. As
long as no new document-change listener or per-keystroke recomputation is added for hover
itself, D-07/Success-Criterion-4 is satisfied by construction.
**Where the real risk lives:** if the SAME detection code is reused for Phase 89's future
discoverability cue (a CodeLens needing "every applicable line in the file"), *that* consumer
does need the debounced-build-cycle hook Pitfall 11 describes — but that's explicitly deferred
to Phase 89, not this phase's concern. Do not preemptively build that caching layer now; note
it as a natural extension point for Phase 89 to add without needing to touch the detection
module's core algorithm.
**Verification:** a timing/perf regression test that hovers a `SetOptsStatement` inside a
large synthetic method body (many unrelated statements before it) and asserts the walk
terminates in bounded time proportional to the *chain length*, not the file size — mirroring
the spirit of #505's own synthetic-workspace timing test convention already used elsewhere in
this milestone.

### New Pitfall: `resolveLibFunction` is private — a naive duplicate risks drift

**What goes wrong:** `check-function-calls.ts`'s `resolveLibFunction` (lines 112-124) is not
exported. Writing a second, slightly-different copy inline in the new scanner risks the two
implementations drifting (e.g., one handles the try/catch around cyclic references, the other
forgets to).
**How to avoid:** export the existing function (or relocate it to a shared, dependency-free
location such as `bbj-nodedescription-provider.ts`) and import it from both
`check-function-calls.ts` and the new `setopts-code-scanner.ts`.
**Verification:** a source-guard/grep test asserting only one definition of a
`resolveLibFunction`-shaped helper exists in the codebase (mirroring this project's existing
"single source of truth" test conventions used elsewhere, e.g. the `composer-commands.ts`
header's own stated goal).

### New Pitfall: comma-chained assignments on one `LetStatement` line

**What goes wrong:** `A$=OPTS, B$=1` is valid BBj (`LetStatement.assignments` is an array) —
a scanner that assumes "one statement = one assignment" and only checks
`letStatement.assignments[0]` will silently miss (or misattribute) a chain link when the
target variable is the *second* (or later) comma-separated assignment on a line.
**How to avoid:** iterate `LetStatement.assignments` fully when searching for the tracked
variable name, exactly as the existing `checkUseBeforeAssignment`'s Pass 1 does
(`check-variable-scoping.ts:115-123`, `for (const assignment of stmt.assignments)`).
**Verification:** a unit test with `A$=OPTS,B$="unrelated"` followed by `A$=IOR(A$,mask)` and
`SETOPTS A$`, asserting the chain is still recognized as safe (the unrelated `B$=` on the same
line as the origin must not break detection).

## Code Examples

### Detecting the three DISC-05 hover shapes (skeleton, composed from verified primitives)

```typescript
// Skeleton for setopts-code-scanner.ts — composed from verified AST guards/patterns above.
// Every isXxx/field name used here is confirmed in "Grammar & AST Shape" above.
import { AstNode, isMethodCall, isSetOptsStatement, isSymbolRef, isStringLiteral } from './generated/ast.js';

export type SetOptsCodeShape =
    | { kind: 'absolute-literal'; hexDigits: string }
    | { kind: 'chain'; variableName: string; safe: boolean }
    | { kind: 'ior-and-call'; fnName: 'IOR' | 'AND'; byte: number; mask: number };

// Shape (a): isSetOptsStatement(node) && isStringLiteral-or-parseable(node.opts)
// Shape (b): isSetOptsStatement(node) && isSymbolRef(node.opts) -> walk chain (see algorithm above)
// Shape (c): isMethodCall(node) && resolveLibFunction(node)?.name.toUpperCase() in {'IOR','AND'}
```

### Verified `resolveLibFunction` reuse target (see "Pattern 1" above for the full function)

Already quoted verbatim above (`check-function-calls.ts:112-124`) — no further duplication here
per the "single source of truth" pitfall just noted.

## State of the Art

| Old Approach (Phase 87) | New Approach (Phase 88) | When Changed | Impact |
|--------------------------|--------------------------|---------------|--------|
| SETOPTS vector read directly from file content (`parseSetOptsLine` on a raw line string) | SETOPTS vector derived from a **data-flow fact** (a chain of AST-level assignments) | This phase | The `bbj/composer/setopts/decodeCall`-family params shape (single-line string) is insufficient for in-code detection and needs a document+position-based sibling request, not a drop-in reuse |
| `describeVector` describes an absolute vector's set bits | New `describeIorAndMask` describes a **mask's** set-or-cleared bits relative to the catalog, with AND inverted | This phase | New helper, same underlying `SETOPTS_BITS` data — no catalog changes |

**Deprecated/outdated:** none — this phase is additive only; nothing from Phase 87 is removed
or replaced.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The traversal-boundary rule (stop at IF/WHILE/FOR/GOTO, skip unrelated statements, never cross into an enclosing scope) is the correct "statically safe" definition for DISC-06 | Traceability Algorithm | Too narrow: users get hover-only where an edit action would have been safe (annoying, not unsafe). Too wide: a false "safe" chain could let a user edit-in-place a shape that isn't actually decidable, silently corrupting the semantics DISC-06 exists to protect — the higher-severity failure direction, so err narrow if this assumption is wrong |
| A2 | Generated `IOR`/`AND` masks should be padded to `MAX_BYTES` (16 bytes / 32 hex digits) to always be at least as long as `OPTS`'s actual runtime length | Compose-new codegen: mask width gap | If BASIS actually requires an *exact*-length match (not "long enough") or rejects overlength masks, generated compose-new code could throw a runtime BBj error (`!ERROR=nn`) or silently misbehave — needs a live BBjServices UAT check before shipping D-05 |
| A3 | `examples/issue208-and-is-also-a-function.bbj` is exercised by an automated parser regression test (not just present as documentation) | Grammar & AST Shape (AND-is-also-a-keyword) | If it is not actually wired into `example-files.test.ts`'s corpus (the file lives in `examples/`, not `test/test-data/` — CLAUDE.md's own text names `test/test-data/` as the auto-parsed corpus), a future grammar regression in this exact ambiguity would go undetected; confirm and, if needed, copy the fixture into `test/test-data/` as part of this phase's own test additions |
| A4 | IntelliJ's Swing toolkit has no built-in tri-state checkbox, requiring a custom 3-state widget for D-06 | IntelliJ Composer Seams to Reuse | If a suitable IntelliJ Platform UI component already exists (e.g. in `com.intellij.ui.components`) that this session did not find, the planner may over-build a custom widget where a existing one would do — worth a quick spike during planning |

**If this table is empty:** N/A — see above.

## Open Questions (RESOLVED)

1. **What is `OPTS`'s actual runtime byte-length, and does BASIS's `IOR`/`AND` "same length"
   constraint mean *exact* match or *at-least* match?** — **RESOLVED** (recommendation adopted
   as an explicit, flagged assumption; falsification deferred to a live-BBjServices UAT check,
   not left unresolved in code): the phase's compose-new mask generators lock the recommended
   full-width padding behind one named constant, and Plan 88-05 Task 3 adds a dedicated QA
   hand-check row (IntelliJ row 21) to falsify the assumption against real BBjServices rather
   than treating it as settled.
   - What we know: `OPTS` is documented as returning "a string containing the current PRO/5
     options vector" with no stated fixed length; `SETOPTS_BITS`/`MAX_BYTES` model up to 16
     bytes; `IOR`/`AND`'s own doc says "Both string arguments must be the same length."
   - What's unclear: whether a shorter-or-longer mask argument errors, truncates, or is
     silently accepted by real BBjServices.
   - Recommendation: a live-IDE UAT check (this repo already has a working devcontainer BBj
     setup per project memory) generating a compose-new block and running it against real
     BBjServices before finalizing the mask-width policy in code.

2. **Does the new in-code decode/compose request need document-URI-scoped server-side AST
   access, or can it stay line-string-based like every existing `bbj/composer/*` request?** —
   **RESOLVED**: Plan 88-03 Task 2 implements `bbj/composer/setopts/decodeInCode` and
   `bbj/composer/setopts/composeTriState` on the recommended URI+position shape.
   - What we know: every existing `bbj/composer/*/decodeCall` handler takes a single-line
     string (`LineQuery`); this phase's backward walk needs multi-statement, potentially
     multi-line context.
   - What's unclear: the exact params/DTO shape the planner should settle on (document URI +
     position, vs. a client-side pre-serialized snippet of the relevant lines).
   - Recommendation: URI + position, resolved server-side against the already-open
     `LangiumDocument` (the server already has this document in memory for hover/validation;
     no new document-loading machinery needed) — matches how `getHoverContent(document,
     params)` itself receives its context.

3. **Should `ComposerLauncher.Kind` gain a fifth enum value, or should `SETOPTS` be
   overloaded with a mode flag?** — **RESOLVED**: Plan 88-05 Task 2 adds the distinct
   `Kind.SETOPTS_IN_CODE` enum value per the recommendation below.
   - What we know: today's single `SETOPTS` kind is entirely config.bbx-shaped end-to-end
     (`openSetopts`, `SetoptsDecodeCallParams(lineText)`).
   - What's unclear: whether reusing the enum value with an internal branch, or adding
     `SETOPTS_IN_CODE`, better matches this codebase's existing conventions.
   - Recommendation: add a distinct enum value — the two flows have different DTOs
     (`SetoptsDecodeCallParams` vs. a new URI+position shape) and different dialogs
     (2-state vs. 3-state), so conflating them under one `Kind` would require internal
     branching `ComposerLauncher.launch`'s existing `switch` doesn't currently need anywhere
     else.

## Environment Availability

Skip — this phase introduces no new external tool/service/runtime dependency. It extends
existing TypeScript language-server modules and existing IntelliJ Java composer
infrastructure, both already present and already exercised by Phase 87's shipped code.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 (TypeScript side) `[VERIFIED: bbj-vscode/package.json:691]`; JUnit 5 (`junit-bom:5.10.2`, IntelliJ side, per STATE.md/STACK.md) |
| Config file | `bbj-vscode/vitest.config.ts` (existing, unmodified by this phase) |
| Quick run command | `npx vitest run test/hover.test.ts` (or a new `test/setopts-code-scanner.test.ts`) |
| Full suite command | `npm test` (bbj-vscode); `./gradlew test` (bbj-intellij) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-05 | Hover on absolute `SETOPTS <hex>` decodes correctly | unit | `npx vitest run test/hover.test.ts` (extend) | ❌ Wave 0 — new test cases needed |
| DISC-05 | Hover on `SETOPTS var$` where `var$` traces a safe `OPTS→IOR→IOR` chain decodes the accumulated vector | unit | `npx vitest run test/setopts-code-scanner.test.ts` | ❌ Wave 0 — new file |
| DISC-05 | Hover on a single `IOR(...)`/`AND(...)` call shows the AND-mask-as-cleared-bits phrasing | unit | `npx vitest run test/setopts-code-scanner.test.ts` | ❌ Wave 0 |
| DISC-06 | A branch/loop/alias in the chain correctly reports "unsafe" (hover-only, no edit) | unit | `npx vitest run test/setopts-code-scanner.test.ts` (negative cases) | ❌ Wave 0 |
| DISC-06 | Compose-new tri-state form generates a canonical block that round-trips through the scanner as "safe" | unit + JUnit contract | `npx vitest run test/composer-commands.test.ts` (extend) + `ComposerRequestContractTest`/`ComposerModelsJsonBoundaryTest` (extend) | ❌ Wave 0 (TS); ⚠️ existing files to extend (Java) |
| Success Criterion 4 (perf) | No unbounded full-document walk per hover | unit (timing) | new synthetic-large-file test, mirroring #505's convention | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run test/setopts-code-scanner.test.ts test/hover.test.ts`
- **Per wave merge:** `npm test` (bbj-vscode) + `./gradlew test` (bbj-intellij, if IntelliJ dialog/DTO work lands in the same wave)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `test/setopts-code-scanner.test.ts` — covers DISC-05 (all three hover shapes) and DISC-06
  (safe-vs-unsafe chain boundary cases: branch, loop, alias, unrelated-line, comma-chained
  assignment)
- [ ] Extend `test/hover.test.ts` — end-to-end hover-content assertions using `parseHelper`
  (never `DocumentBuilder.build`, per project memory) matching the existing `positionOf`
  helper pattern already in that file
- [ ] Extend `bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java` and
  `ComposerModelsJsonBoundaryTest.java` for the new request family (Pitfall 13's established
  extension pattern)
- [ ] Copy or confirm coverage of `examples/issue208-and-is-also-a-function.bbj`-equivalent
  content in this phase's own scanner tests, since that exact ambiguity (`AND` as keyword vs.
  function) is load-bearing for shape (c) detection

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth surface touched |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | The scanner must never treat an unparseable/ambiguous mask literal as decodable — reuse `parseVector`'s existing "return undefined on anything it can't round-trip" discipline (`setopts-catalog.ts:134-142`) rather than a best-effort partial parse |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A false "safe to edit" chain classification lets a user's edit-in-place action silently corrupt option semantics the user didn't intend (not attacker-controlled, but a real defect class this milestone already treats as a first-class risk per DISC-06's own framing) | Tampering (self-inflicted) | Conservative traversal-boundary algorithm (this document's core recommendation) — always fail toward "hover-only," never toward "edit available," on any ambiguity |
| Composer-generated code silently overwrites unrelated bytes 10-16 or unmodeled bits in the compose-new block | Tampering (self-inflicted, same class PITFALLS.md already flags for the config.bbx composer) | Preserve unknown/reserved bits verbatim, inherited for free from `setoptsPreview`'s existing round-trip guarantee (`setopts-catalog.ts:310-335`) — the new mask-generation helpers (`singleBitIorMask`/`singleBitAndMask`) must be built the same way (start from an explicit all-zero or all-`0xff` base, never a partial/short vector that could leave later bytes at an unintended default) |

## Sources

### Primary (HIGH confidence — all read directly this session)

- `bbj-vscode/src/language/bbj.langium` (SetOptsStatement, Assignment, LetStatement,
  BinaryExpression, MemberCall/MethodCall/SymbolRef, FeatureName, IfStatement/WhileStatement/
  ForStatement, StringLiteral/HEX_STRING terminal) — lines cited throughout
- `bbj-vscode/src/language/generated/ast.ts` (Assignment, LetStatement, LibFunction,
  LibVariable, MemberCall, MethodCall, ParameterCall, SetOptsStatement, SymbolRef,
  StringLiteral, Program, MethodDecl, CompoundStatement, DefFunction interfaces)
- `bbj-vscode/src/language/lib/functions.bbl`, `bbj-vscode/src/language/lib/variables.bbl`
  (IOR, AND, OPTS builtin declarations)
- `bbj-vscode/src/language/bbj-token-builder.ts` (AND/keyword-vs-ID disambiguation)
- `examples/issue208-and-is-also-a-function.bbj` (existing regression fixture proving the
  ambiguity is already handled)
- `bbj-vscode/src/language/validations/check-function-calls.ts` (`resolveLibFunction`)
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` (`walkStatements`,
  `getStatements`, `getSymbolRefName`, case-insensitive name comparison convention)
- `bbj-vscode/src/language/bbj-type-inferer.ts` (SymbolRef→Assignment recursion and its
  first-assignment-only limitation)
- `bbj-vscode/src/language/bbj-scope-local.ts` (implicit-assignment scope dedup,
  `CompoundStatement`-transparent-to-parent rule)
- `bbj-vscode/src/language/bbj-hover.ts` (hover extension point)
- `bbj-vscode/test/hover.test.ts` (existing test pattern, `parseHelper` convention)
- `bbj-vscode/src/setopts-catalog.ts` (full file — catalog, vector primitives, `setoptsPreview`,
  `describeVector`)
- `bbj-vscode/src/language/composer-commands.ts` (full file — existing SETOPTS handlers,
  `LineQuery`, registration loop)
- `bbj-vscode/src/language/bbj-document-builder.ts` (build/debounce cycle — confirms hover is
  request-scoped, not tied to the BBjCPL debounce)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java`,
  `ComposerLauncher.java`, `SetoptsComposerDialog.java`,
  `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/PreviewDebouncer.java`,
  `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` (grep
  for SETOPTS-specific methods), `ComposerModels.java` (grep for `SetOpts*` DTO names)
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-CONTEXT.md`
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`

### Secondary (MEDIUM confidence — milestone-level research, cited not re-verified)

- `.planning/research/FEATURES.md` §"SETOPTS-in-code option model" (BASIS SETOPTS/IOR/AND
  read-modify-write pattern, AND-mask-inversion semantics)
- `.planning/research/PITFALLS.md` §"Pitfall 11" (full-AST-walk-per-keystroke risk)
- `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md` (no-new-dependency
  finding, composer command-layer architecture)

### Tertiary (LOW confidence)

- None new this session — the one genuine unresolved gap (`OPTS`'s runtime byte-length) is
  recorded as an absent finding in the Assumptions Log / Open Questions, not asserted from any
  tertiary source.

## Metadata

**Confidence breakdown:**
- Grammar/AST shape, token-builder disambiguation, hover extension point, composer seams:
  HIGH — every claim read directly from source this session with line numbers and verbatim
  quotes.
- Traceability algorithm (the core new-logic deliverable): MEDIUM — a reasoned design
  recommendation grounded in verified AST shapes, but not itself drawn from an authoritative
  spec; explicitly flagged for confirmation during planning/discuss.
- Compose-new mask-width policy: LOW/flagged — a genuine gap this session could not resolve
  from any available source; recommend a live-BBjServices UAT falsification check before
  finalizing.

**Research date:** 2026-09-07
**Valid until:** Stable — this research is grounded in the current grammar/AST shape and
existing composer infrastructure, which change only on a grammar edit (`npm run
langium:generate`) or a Phase 87 refactor. Re-verify if either occurs before this phase is
planned.
