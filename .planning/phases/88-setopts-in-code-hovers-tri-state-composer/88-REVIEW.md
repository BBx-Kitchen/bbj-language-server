---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-08T13:40:00Z
depth: standard
files_reviewed: 30
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
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 88: Code Review Report

**Reviewed:** 2026-09-08T13:40:00Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

This invocation follows gap-closure plan 88-07, which added a new `SetOptsUnsafeReason` member
(`indexed-target`), a new `indexedAccessRootName` helper, and two new classification sites inside
`matchStatement` in `bbj-vscode/src/language/setopts-code-scanner.ts` — closing the false-safe
hole discovered as G-88-1 (a byte-range accessor like `A$(1,1)=IOR(A$(1,1),...)` was silently
treated as `irrelevant` instead of unsafe). Per the review scope, the remaining files in the list
were already reviewed/fixed in the prior 88-REVIEW.md/88-REVIEW-FIX.md cycle and were only
spot-checked for regressions or drift introduced by 88-07 (none found — the Java/IntelliJ side
treats `reason` as an opaque pass-through string, so the new `indexed-target` value needs no
Java-side change, and `bbj-hover.ts` reuses the scanner's shapes generically).

The two new classification sites themselves are correct in isolation and are backed by thorough,
passing unit tests (`setopts-code-scanner.test.ts`, `setopts-in-code-request.test.ts`) — I traced
through `indexedAccessRootName`'s accessor-unwrap logic against the actual `MethodCall`/
`ArrayElement`/`MemberCall` AST field names in `generated/ast.ts` and confirmed both call sites
(the assignment-target check and the IOR/AND first-argument check) fire exactly as documented for
every single-assignment reproduction in the test suite (`npx vitest run` — 181/181 passing across
the SETOPTS-related suites).

However, scrutinizing the surrounding (older, but directly adjacent) `matchStatement` per-assignment
loop that both new checks live inside surfaced a still-open, empirically-reproduced variant of the
exact G-88-1 false-safe class: a comma-chained `LET` statement with more than one assignment
targeting the tracked variable only ever evaluates the *first* matching assignment — the loop
`return`s as soon as one assignment resolves to `link`/`origin`/`reassigned`/etc., so any *later*
assignment in the same statement that also touches the tracked variable (via a plain name, or via
the very byte-range accessor 88-07 was written to catch) is never even inspected. I reproduced this
against the live scanner (see `Findings`) and confirmed it independently in two forms: a silent
false `safe: true` when a byte-range mutation follows the origin/link assignment in the same
statement, and silently-dropped bits when two `IOR`/`AND` links to the same variable appear in one
comma-chained statement. This directly violates the module's own repeatedly-stated invariant
("any ambiguity resolves toward an unsafe verdict, never toward a false link or origin") and
88-07's own commit message claim that its fix means "nothing that touches the tracked variable can
reach `irrelevant` any more" — that claim is false for this input shape.

## Critical Issues

### CR-01: `matchStatement`'s per-assignment loop only evaluates the first matching assignment in a comma-chained statement, allowing a false "safe" chain verdict (and silently dropped bits) — the exact G-88-1 false-safe class, still open for multi-assignment statements

**File:** `bbj-vscode/src/language/setopts-code-scanner.ts:303-349` (the `for (const assignment of stmt.assignments)` loop in `matchStatement`, which both of 88-07's new classification sites — lines 309-311 and 336-338 — live inside)

**Issue:**

`matchStatement` iterates `stmt.assignments` (BBj's comma-chained `LET a=1,b=2` form — confirmed
real and already relied on elsewhere, e.g. the passing test `'a comma-chained unrelated assignment
on the OPTS origin line does not break detection'`), but every branch of the loop body `return`s
as soon as it produces a verdict for *any one* assignment. That means as soon as one assignment in
the comma list resolves to `origin` or `link` (or any other verdict), the loop exits immediately —
**every subsequent assignment in the same statement is never evaluated at all**, even if it also
targets the tracked variable and would otherwise force an unsafe verdict.

I confirmed this empirically against the live scanner (via `parseHelper`/`traceOptsChain`, the same
harness the test suite uses; reproduction files were created under `bbj-vscode/test/`, run, and
deleted — not left in the tree):

1. **False `safe: true`, byte-range mutation silently lost** (the residual G-88-1 case, exactly the
   accessor pattern 88-07 was written to catch — just one comma-position later):
   ```
   A$=OPTS,A$(1,1)="Z"
   SETOPTS A$
   ```
   `traceOptsChain` returns `{ kind: 'chain', safe: true, links: [], effect: { set: [], clear: [] } }`.
   The first assignment (`A$=OPTS`) matches `trackedName` via a plain `SymbolRef` and returns
   `{ kind: 'origin', ... }` immediately — the loop never reaches the second assignment
   `A$(1,1)="Z"`, which mutates one byte of `A$` on the very same line and would, on its own (as
   88-07's own tests confirm), classify as `indexed-target`. The composer/hover now reports this
   chain as safely decodable to the raw `OPTS` value, when the actual runtime value has an
   unaccounted-for byte-range write applied to it.

2. **Wrong (incomplete) effect data, not just a missed-unsafe classification** — two `IOR` links to
   the same variable in one comma-chained statement:
   ```
   A$=OPTS
   A$=IOR(A$,"$08$"),A$=IOR(A$,"$10$")
   SETOPTS A$
   ```
   `traceOptsChain` returns `safe: true` with `links: [{ fnName: 'IOR', maskHex: '08', ... }]` —
   the second `IOR(A$,"$10$")` in the same statement is silently dropped from `effect.set`
   entirely. This is not merely "should have been unsafe" — it is actively wrong data that a
   correct decode would include.

Both of these compromise the exact safety guarantee DISC-06/the module's own doc comments exist to
protect ("A chain never reports `safe: true` unless the backward walk reached an `OPTS`-sourced
origin through only `IOR`/`AND` reassignments of the same variable, each naming the tracked
variable directly... any other outcome resolves to exactly one of these named reasons, never a
silent false 'safe'"), and they flow directly into `setopts-in-code-request.ts`'s `decodeInCode`
handler, which uses `shape.safe`/`shape.effect` unmodified to decide `editable: true` and to
prefill the tri-state composer (`triStateFromChainEffect(shape.effect)`) — i.e. a client could be
offered an "edit in place" action, or a hover summary, built from data that has silently dropped a
real mutation of the same variable.

**Fix:**

Do not `return` out of the assignment loop on the first match — every assignment in
`stmt.assignments` that targets the tracked variable (by plain name or by
`indexedAccessRootName`) must be accounted for, in source order, within the same statement. A
minimal-risk fix: change `matchStatement` to scan all assignments and short-circuit only on a
statement-wide disqualifying verdict, while accumulating every `link` verdict for the tracked
variable (not just the first), and re-validating that no assignment *after* an `origin` match also
touches the tracked variable:

```typescript
function matchStatement(stmt: AstNode, trackedName: string): StatementVerdict {
    // ...existing control-flow guard unchanged...
    if (!isLetStatement(stmt)) {
        return { kind: 'irrelevant' };
    }
    let originVerdict: Extract<StatementVerdict, { kind: 'origin' }> | undefined;
    const links: SetOptsChainLink[] = [];
    let touchedAny = false;
    for (const assignment of stmt.assignments) {
        const verdict = matchAssignment(assignment, trackedName); // extract the existing per-assignment body into its own function, returning StatementVerdict | { kind: 'irrelevant' }
        if (verdict.kind === 'irrelevant') {
            continue;
        }
        touchedAny = true;
        if (verdict.kind === 'link') {
            links.push(verdict.link);
            continue; // keep scanning — a later assignment in the same statement could still disqualify this one
        }
        if (verdict.kind === 'origin') {
            originVerdict = verdict; // keep scanning — a later same-statement write must still invalidate it
            continue;
        }
        return verdict; // control-flow/reassigned/alias/unparseable-mask/indexed-target: fail closed immediately
    }
    if (!touchedAny) {
        return { kind: 'irrelevant' };
    }
    if (originVerdict) {
        return links.length === 0 ? originVerdict : { kind: 'reassigned' }; // an origin followed by further same-statement links can't be folded into a single 'origin' verdict without changing ChainWalkResult's shape — failing to 'reassigned' is conservative and correct, never a lost mutation
    }
    // Only 'link' verdicts collected: walkChain currently expects one link per statement, so
    // widen ChainWalkResult/walkChain's caller to accept an array here, or fold left-to-right
    // and push in order — either way, every link found must reach the caller, not just the first.
    return links.length === 1 ? { kind: 'link', link: links[0] } : { kind: 'reassigned' }; // >1 same-statement link needs walkChain widened to push multiple; 'reassigned' is a safe interim fail-closed fallback, never a silent drop
}
```

The exact shape of the fix (whether `StatementVerdict`/`walkChain` gets widened to carry an array
of links per statement, or `matchStatement` is restructured differently) is an implementation
choice — the required invariant is simply: **no assignment in `stmt.assignments` that touches the
tracked variable may be skipped just because an earlier assignment in the same statement already
produced a verdict.** Add regression tests mirroring the two reproductions above (comma-chained
origin-then-indexed-mutation, and comma-chained double-link) to `setopts-code-scanner.test.ts`.

---

_Reviewed: 2026-09-08T13:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
