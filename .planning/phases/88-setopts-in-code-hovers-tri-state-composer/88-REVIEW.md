---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/after.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/before.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/description.html
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java
  - bbj-vscode/package.json
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-hover.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/language/setopts-code-scanner.ts
  - bbj-vscode/src/language/setopts-in-code-request.ts
  - bbj-vscode/src/language/validations/check-function-calls.ts
  - bbj-vscode/src/setopts-catalog.ts
  - bbj-vscode/src/setopts-in-code-ui.ts
  - bbj-vscode/src/setopts-tristate-webview.ts
  - bbj-vscode/test/hover.test.ts
  - bbj-vscode/test/setopts-catalog.test.ts
  - bbj-vscode/test/setopts-code-scanner.test.ts
  - bbj-vscode/test/setopts-in-code-request.test.ts
  - bbj-vscode/test/setopts-in-code-ui.test.ts
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 88: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 31 (listed above; `StaleEditGuard.java`, `ComposerFlow.java` and other pre-existing collaborators referenced by `ComposerLauncher.java` were not in scope and were treated as unmodified)
**Status:** issues_found

## Summary

This phase adds SETOPTS-in-code hovers plus a tri-state (Set/Clear/Leave) composer for the
`var$=OPTS … IOR/AND … SETOPTS var$` chain pattern, spanning a new AST-based scanner
(`setopts-code-scanner.ts`), a document-aware LSP request pair (`setopts-in-code-request.ts`),
VS Code and IntelliJ UI wiring, and a large, well-organized test suite (source guards, DTO
boundary tests, field-wise equality tests).

The implementation is generally careful — DISC-06's "fail closed, never fabricate a false safe"
principle is explicitly documented and mostly honored (control flow, reassignment, aliasing, and
unparseable masks are all handled), and the round-trip/codegen arithmetic in `setopts-catalog.ts`
is internally consistent and well covered by tests.

However, the backward chain walk that decides whether a chain is safe to hover/edit
(`setopts-code-scanner.ts`'s `matchStatement`) does not recognize every BBj control-flow
statement type. Two of the statically-relevant branching constructs — `ON expr GOTO/GOSUB
label,...` (`OnGotoStatement`) and `SWITCH/CASE/SWEND` (`SwitchStatement`/`SwitchCase`) — are flat
siblings in the same statement array as everything else (confirmed against the grammar and
generated AST), yet `matchStatement` silently classifies them as `'irrelevant'` and keeps walking
through them. This produces a false "safe: true" verdict — and a real, in-place code edit — for a
chain that a runtime branch can actually skip, which is exactly the defect class DISC-06 was
designed to prevent. See CR-01 below.

Two lower-severity issues are also flagged: an unreachable `MethodCall` code path in the chain
tracer that carries no test coverage, and a substring-only (no word-boundary) keyword match used
by both IDEs' cheap "is this intention/action available" gates, which produces false-positive
intention offers on ordinary identifiers.

## Critical Issues

### CR-01: SETOPTS chain-safety walk misses `ON...GOTO/GOSUB` and `SWITCH/CASE/SWEND`, producing a false "safe" verdict

**File:** `bbj-vscode/src/language/setopts-code-scanner.ts:244-249`

**Issue:**

`matchStatement` is the function that decides, for each statement walked backward from a
`SETOPTS var$` statement toward its `var$=OPTS` origin, whether that statement is safe to skip
over. Its control-flow gate is:

```ts
function matchStatement(stmt: AstNode, trackedName: string): StatementVerdict {
    if (isIfStatement(stmt) || isElseStatement(stmt) || isIfEndStatement(stmt)
        || isWhileStatement(stmt) || isWhileEndStatement(stmt) || isForStatement(stmt)
        || isGotoStatement(stmt)) {
        return { kind: 'control-flow' };
    }
    if (!isLetStatement(stmt)) {
        return { kind: 'irrelevant' };
    }
    ...
```

This list is missing two statement types that the BBj grammar defines as their own flat
`SingleStatement` alternatives (verified in `bbj-vscode/src/language/bbj.langium` lines 26-112 and
in the generated `ast.ts`, e.g. `OnGotoStatement` at `ast.ts:1909-1915`, which — like
`IfStatement`/`GotoStatement` — has no nested statement array and appears as a flat sibling in the
same `Program.statements`/`MethodDecl.body`/etc. array that `walkChain` iterates):

- `OnGotoStatement` — `ON expr GOTO label1,label2,...` / `ON expr GOSUB label1,label2,...`, a
  computed multi-way branch.
- `SwitchStatement` / `SwitchCase` — `SWITCH expr` / `CASE value` / `SWEND`, BBj's flat
  (non-nested) multi-way branch construct.

Because neither type matches any branch in `matchStatement`, both statements fall through to
`if (!isLetStatement(stmt)) return { kind: 'irrelevant' };` and the backward walk simply steps
past them as if they were inert, exactly like a `PRINT` statement.

Concretely, for:

```bbj
A$=OPTS
SWITCH X
CASE 1
A$=IOR(A$,"$08$")
CASE 2
SWEND
SETOPTS A$
```

or

```bbj
A$=OPTS
ON X GOTO L1,L2
A$=IOR(A$,"$08$")
L1:
L2:
SETOPTS A$
```

`traceOptsChain` reports `safe: true` with the `IOR` link folded into `effect.set`, and the hover
(`setoptsHoverMarkdown`) states "Sets: …" as if this were unconditionally true. Worse,
`decodeInCode` (`setopts-in-code-request.ts`) treats this as `editable: true`, `mode: 'chain'`,
handing both IDEs' composers a `chain` edit target — so opening the tri-state composer and
pressing Apply/Insert will rewrite the reassignment region as if the `IOR` always executes, even
though at runtime the `SWITCH`/`ON...GOTO` may skip it entirely for some values of `X`. This is
precisely the "ambiguity silently resolves to a false safe" failure mode that
`UNSAFE_REASON_TEXT`'s design comment ("Any ambiguity resolves toward an unsafe verdict, never
toward a false 'link' or 'origin'" — line 241-243) explicitly says must never happen, and it is a
real, common BBj construct, not an exotic corner case.

The existing test matrix (`test/setopts-code-scanner.test.ts`'s `controlFlowMarkers` table, lines
224-239) only exercises `IfStatement`/`ElseStatement`/`IfEndStatement`/`WhileStatement`/
`WhileEndStatement`/`ForStatement`/`GotoStatement` — it never includes `ON...GOTO` or
`SWITCH`/`CASE`/`SWEND`, so this gap has no regression coverage.

(Note: `UntilStatement`/the `REPEAT` `KeywordStatement` are also absent from the same gate. They
are lower-risk since a `REPEAT` body always executes at least once, but they belong to the same
"statement type list is incomplete" defect and should be reviewed alongside the fix.)

**Fix:**

Add the missing statement-type guards (importing the corresponding type guards from
`./generated/ast.js`):

```ts
import {
    // ...existing imports...
    isOnGotoStatement,
    isSwitchStatement,
    isSwitchCase,
    isUntilStatement,
    isKeywordStatement, // to catch REPEAT specifically, or gate on isKeywordStatement(stmt) && stmt.kind === 'REPEAT'
} from './generated/ast.js';

function matchStatement(stmt: AstNode, trackedName: string): StatementVerdict {
    if (isIfStatement(stmt) || isElseStatement(stmt) || isIfEndStatement(stmt)
        || isWhileStatement(stmt) || isWhileEndStatement(stmt) || isForStatement(stmt)
        || isGotoStatement(stmt) || isOnGotoStatement(stmt)
        || isSwitchStatement(stmt) || isSwitchCase(stmt)
        || isUntilStatement(stmt) || (isKeywordStatement(stmt) && stmt.kind === 'REPEAT')) {
        return { kind: 'control-flow' };
    }
    ...
```

and add matching `test.each` rows to the `controlFlowMarkers` table in
`test/setopts-code-scanner.test.ts` for `ON X GOTO L1` / `ON X GOSUB L1` / `SWITCH X` / `CASE 1` /
`SWEND`, mirroring the existing entries.

## Warnings

### WR-01: `traceOptsChain`'s `MethodCall` overload is dead, untested code

**File:** `bbj-vscode/src/language/setopts-code-scanner.ts:448` (and `trackedVariableName` at
line 165)

**Issue:** `traceOptsChain(target: SetOptsStatement | MethodCall)` and its helper
`trackedVariableName` are typed to accept a `MethodCall`, and the doc comment on `traceOptsChain`
says it is "used internally when a chain link itself needs re-tracing" — but nothing in the
codebase ever calls `traceOptsChain` (or reaches `trackedVariableName`) with a `MethodCall`.
`detectSetOptsShape` only routes to `traceOptsChain` when `isSetOptsStatement(node)` and
`isSymbolRef(opts)` (line 354-356); every one of the ~20 call sites in
`test/setopts-code-scanner.test.ts` passes a `SetOptsStatement`. `walkChain` builds chain links
directly via `matchStatement`, it never recurses into `traceOptsChain` for a link. This makes the
`MethodCall` branch of `trackedVariableName` (and the corresponding half of `traceOptsChain`'s
union type) unreachable in practice and therefore unverified by any test — if it is ever wired up
later, its correctness (e.g., what `findAnchor`/`walkChain` should do when the "target" is itself
an `IOR`/`AND` call rather than the final `SETOPTS`) has never been exercised.

**Fix:** Either narrow the public signature to `SetOptsStatement` only (removing the unused
`MethodCall` branch from `trackedVariableName` and updating the doc comment to remove the
"chain link itself needs re-tracing" claim), or add an explicit test exercising the `MethodCall`
path if it is intended to be reachable from somewhere. Leaving typed-but-unreachable branches in a
safety-critical scanner makes it harder to reason about what is actually covered by the "never a
false safe" test matrix.

### WR-02: Cheap "is this line a SETOPTS-in-code candidate" gates match substrings, not tokens, causing false-positive intention/action offers

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:77-79`
(`isCaretOnSetoptsInCode` / `isCaretOnCall`) and
`bbj-vscode/src/setopts-in-code-ui.ts:41-47` (`setoptsInCodeCandidateLine`)

**Issue:** Both the IntelliJ lightbulb's `isAvailable` gate and the VS Code Code Action provider's
gate look for the keywords `SETOPTS`, `IOR(`, `AND(` via plain case-insensitive `indexOf`/substring
search, with no word-boundary check:

```java
static boolean isCaretOnSetoptsInCode(@NotNull Editor editor) {
    return isCaretOnCall(editor, "setopts") || isCaretOnCall(editor, "ior(") || isCaretOnCall(editor, "and(");
}
```

```ts
export function setoptsInCodeCandidateLine(lineText: string, character: number): boolean {
    const upper = lineText.toUpperCase();
    return SETOPTS_IN_CODE_KEYWORDS.some(keyword => {
        const idx = upper.indexOf(keyword);
        return idx >= 0 && idx <= character;
    });
}
```

`"AND("` is a substring of many ordinary identifiers followed by a call — e.g. `expand(`,
`command(`, `demand(`, `brand(`, `island(` — and `"IOR("` is a substring of e.g. `prior(`,
`senior(`, `junior(`. A line like `x$ = EXPAND("foo")` or `y = PRIOR(1)` trips both gates and
offers the "Configure SETOPTS options in code…" lightbulb (IntelliJ) or the "Compose SETOPTS
block…" Code Action (VS Code) on code that has nothing to do with SETOPTS. Because the actual
edit is gated behind the authoritative server-side `decodeInCode` response, this cannot corrupt
code on its own — but if the user invokes the offered action without realizing it is a false
positive, `decodeInCode` will report `found: false` and both clients fall through to
"compose a new block" (`openSetoptsInCodeComposeNew` / `openSetOptsTriStateComposerPanel(..., {})`),
which inserts a brand-new `opts$=OPTS` / `SETOPTS opts$` block at the cursor line if the user then
clicks OK/Insert without noticing the mismatch. Neither `test/setopts-in-code-ui.test.ts`'s
`setoptsInCodeCandidateLine` table nor any IntelliJ test exercises this substring false-positive
case.

**Fix:** Require a non-identifier boundary before the keyword (e.g. start-of-line, whitespace, or
a non-word character), for example in TypeScript:

```ts
const KEYWORD_PATTERN = /\b(SETOPTS|IOR\(|AND\()/i;
```
and search with a regex that anchors on `\b` before the keyword, rather than a bare `indexOf`; mirror
the same word-boundary check in `ComposerLauncher.isCaretOnCall`/`isCaretOnSetoptsInCode` (e.g. via
a small regex or by checking that the character immediately preceding the match index, if any, is
not a letter/digit/`$`/`!`).

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
